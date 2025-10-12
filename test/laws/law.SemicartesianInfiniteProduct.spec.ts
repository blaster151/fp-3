import { describe, expect, it } from "vitest";
import {
  type FiniteSubset,
  type SemicartesianCone,
  type SemicartesianProductWitness,
  type SemicartesianTensorDiagram,
  checkSemicartesianProductCone,
  checkSemicartesianUniversalProperty,
} from "../../semicartesian-infinite-product";

type Index = "A" | "B" | "C";

type Assignment = Map<Index, string>;

type FiniteSet = {
  readonly label: string;
  readonly elements: ReadonlyArray<Assignment>;
};

type SetMorphism = {
  readonly source: FiniteSet;
  readonly target: FiniteSet;
  readonly map: (value: Assignment) => Assignment;
};

const baseValues: Record<Index, readonly string[]> = {
  A: ["a0", "a1"],
  B: ["b0", "b1"],
  C: ["c0", "c1"],
};

const mapEquals = (left: Assignment, right: Assignment): boolean => {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    if (!right.has(key)) return false;
    if (right.get(key) !== value) return false;
  }
  return true;
};

const copyMap = (assignment: Assignment): Assignment => new Map(assignment);

const enumerateAssignments = (subset: FiniteSubset<Index>): Assignment[] => {
  const result: Assignment[] = [];
  const keys = [...subset];
  const explore = (offset: number, current: Assignment) => {
    if (offset >= keys.length) {
      result.push(copyMap(current));
      return;
    }
    const key = keys[offset];
    if (key === undefined) {
      return;
    }
    const values = baseValues[key];
    for (const value of values) {
      current.set(key, value);
      explore(offset + 1, current);
      current.delete(key);
    }
  };
  explore(0, new Map());
  return result;
};

const restrictAssignment = (assignment: Assignment, subset: FiniteSubset<Index>): Assignment => {
  const next: Assignment = new Map();
  for (const key of subset) {
    const value = assignment.get(key);
    if (value !== undefined) next.set(key, value);
  }
  return next;
};

const subsetKey = (subset: FiniteSubset<Index>): string => subset.join(",");

const makeSet = (subset: FiniteSubset<Index>): FiniteSet => ({
  label: subsetKey(subset) || "∅",
  elements: enumerateAssignments(subset),
});

const createMorphism = (
  source: FiniteSet,
  target: FiniteSet,
  map: (value: Assignment) => Assignment,
): SetMorphism => ({ source, target, map });

const compose = (first: SetMorphism, second: SetMorphism): SetMorphism => ({
  source: first.source,
  target: second.target,
  map: (value) => second.map(first.map(value)),
});

const equal = (a: SetMorphism, b: SetMorphism): boolean => {
  if (a.source.label !== b.source.label || a.target.label !== b.target.label) return false;
  for (const value of a.source.elements) {
    const left = a.map(value);
    const right = b.map(value);
    if (!mapEquals(left, right)) return false;
  }
  return true;
};

const indices: Index[] = ["A", "B", "C"];
const tensorCache = new Map<string, FiniteSet>();

const getSet = (subset: FiniteSubset<Index>): FiniteSet => {
  const key = subsetKey(subset);
  const cached = tensorCache.get(key);
  if (cached) return cached;
  const created = makeSet(subset);
  tensorCache.set(key, created);
  return created;
};

const diagram: SemicartesianTensorDiagram<Index, FiniteSet, SetMorphism> = {
  index: indices,
  tensor: getSet,
  restriction: (larger, smaller) => createMorphism(
    getSet(larger),
    getSet(smaller),
    (value) => restrictAssignment(value, smaller),
  ),
  compose,
  equal,
  describeSubset: subsetKey,
  describeMorphism: (morphism) => `${morphism.source.label}→${morphism.target.label}`,
};

const productSet = getSet(indices);

const productWitness: SemicartesianProductWitness<Index, FiniteSet, SetMorphism> = {
  object: productSet,
  diagram,
  projection: (subset) => createMorphism(
    productSet,
    getSet(subset),
    (value) => restrictAssignment(value, subset),
  ),
  factor: (cone) => ({
    mediator: createMorphism(
      cone.apex,
      productSet,
      (value) => {
        const result: Assignment = new Map();
        for (const index of indices) {
          const singleton = [index] as const;
          const image = cone.leg(singleton).map(value);
          const valueAtIndex = image.get(index);
          if (valueAtIndex === undefined) {
            throw new Error(`Cone leg for ${index} omitted value.`);
          }
          result.set(index, valueAtIndex);
        }
        return result;
      },
    ),
  }),
  label: "Product of A,B,C",
};

describe("Semicartesian infinite tensor products", () => {
  it("confirms projection compatibility across finite subsets", () => {
    const restrictions = [
      { larger: ["A", "B"], smaller: ["A"] },
      { larger: ["A", "B"], smaller: ["B"] },
      { larger: ["A", "B", "C"], smaller: ["A", "B"] },
      { larger: ["A", "B", "C"], smaller: ["A"] },
      { larger: ["A", "B", "C"], smaller: ["C"] },
    ] satisfies ReadonlyArray<{ larger: FiniteSubset<Index>; smaller: FiniteSubset<Index> }>;

    const result = checkSemicartesianProductCone(productWitness, restrictions);
    expect(result.holds).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("produces unique mediators for compatible cones", () => {
    const canonicalCone: SemicartesianCone<Index, FiniteSet, SetMorphism> = {
      apex: productSet,
      leg: productWitness.projection,
      label: "Identity cone",
    };

    const abSet = getSet(["A", "B"]);
    const abCone: SemicartesianCone<Index, FiniteSet, SetMorphism> = {
      apex: abSet,
      label: "AB with constant C",
      leg: (subset) => {
        const key = subsetKey(subset);
        if (key === "A,B") return createMorphism(abSet, getSet(["A", "B"]), (value) => value);
        if (key === "A") return createMorphism(abSet, getSet(["A"]), (value) => restrictAssignment(value, ["A"]));
        if (key === "B") return createMorphism(abSet, getSet(["B"]), (value) => restrictAssignment(value, ["B"]));
        if (key === "C") {
          return createMorphism(abSet, getSet(["C"]), () => {
            const assignment: Assignment = new Map();
            assignment.set("C", "c0");
            return assignment;
          });
        }
        throw new Error(`Unsupported subset ${key}`);
      },
      mediatorCandidates: [
        {
          label: "default extension",
          morphism: createMorphism(abSet, productSet, (value) => {
            const assignment = copyMap(value);
            assignment.set("C", "c0");
            return assignment;
          }),
        },
      ],
    };

    const subsets: ReadonlyArray<FiniteSubset<Index>> = [["A"], ["B"], ["C"], ["A", "B"]];
    const result = checkSemicartesianUniversalProperty(productWitness, [canonicalCone, abCone], subsets);
    expect(result.holds).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("flags non-unique mediators when candidate extensions disagree", () => {
    const abSet = getSet(["A", "B"]);
    const ambiguousCone: SemicartesianCone<Index, FiniteSet, SetMorphism> = {
      apex: abSet,
      label: "AB with ambiguous C",
      leg: (subset) => {
        const key = subsetKey(subset);
        if (key === "A,B") return createMorphism(abSet, getSet(["A", "B"]), (value) => value);
        if (key === "A") return createMorphism(abSet, getSet(["A"]), (value) => restrictAssignment(value, ["A"]));
        if (key === "B") return createMorphism(abSet, getSet(["B"]), (value) => restrictAssignment(value, ["B"]));
        return createMorphism(abSet, getSet(subset), () => {
          const assignment: Assignment = new Map();
          for (const index of subset) {
            if (index === "A" || index === "B") assignment.set(index, "a0");
            if (index === "C") assignment.set(index, "c0");
          }
          return assignment;
        });
      },
      mediatorCandidates: [
        {
          label: "shift C",
          morphism: createMorphism(abSet, productSet, (value) => {
            const assignment = copyMap(value);
            assignment.set("C", "c1");
            return assignment;
          }),
        },
      ],
    };

    const result = checkSemicartesianUniversalProperty(productWitness, [ambiguousCone], [["A"], ["B"]]);
    expect(result.holds).toBe(false);
    expect(result.failures).toHaveLength(1);
    const failure = result.failures[0];
    if (!failure) {
      throw new Error("Expected at least one failure witness");
    }
    expect(failure.reason).toContain("violates uniqueness");
  });
});
