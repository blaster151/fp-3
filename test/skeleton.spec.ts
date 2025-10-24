import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { constructFunctorWithWitness, identityFunctorWithWitness } from "../functor";
import type { FunctorWithWitness } from "../functor";
import {
  analyzeEssentialInjectivityModuloTargetSkeleton,
  compareFunctorsModuloSkeleton,
  computeSkeleton,
  skeletonEquivalenceWitness,
} from "../skeleton";

interface Arrow<Obj extends string> {
  readonly name: string;
  readonly src: Obj;
  readonly dst: Obj;
}

type DomainObject = "A" | "B" | "C";
type DomainArrow = Arrow<DomainObject>;

type TargetObject = "X1" | "X2" | "Y";
type TargetArrow = Arrow<TargetObject>;

const identity = <Obj extends string>(object: Obj): Arrow<Obj> => ({
  name: `id_${object}`,
  src: object,
  dst: object,
});

const makeDomainCategory = (): FiniteCategory<DomainObject, DomainArrow> => {
  const idA = identity("A");
  const idB = identity("B");
  const idC = identity("C");
  const ab: DomainArrow = { name: "ab", src: "A", dst: "B" };
  const ba: DomainArrow = { name: "ba", src: "B", dst: "A" };
  const arrows: readonly DomainArrow[] = [idA, idB, idC, ab, ba];
  return {
    objects: ["A", "B", "C"],
    arrows,
    id: identity,
    compose: (g, f) => {
      if (f.dst !== g.src) {
        throw new Error("Non-composable domain arrows");
      }
      if (f.name.startsWith("id_")) return g;
      if (g.name.startsWith("id_")) return f;
      if (f === ab && g === ba) return idA;
      if (f === ba && g === ab) return idB;
      throw new Error("No additional composites in domain category");
    },
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (left, right) => left.name === right.name && left.src === right.src && left.dst === right.dst,
  };
};

const makeTargetCategory = (): FiniteCategory<TargetObject, TargetArrow> => {
  const idX1 = identity("X1");
  const idX2 = identity("X2");
  const idY = identity("Y");
  const x12: TargetArrow = { name: "x12", src: "X1", dst: "X2" };
  const x21: TargetArrow = { name: "x21", src: "X2", dst: "X1" };
  const a: TargetArrow = { name: "a", src: "X1", dst: "Y" };
  const b: TargetArrow = { name: "b", src: "Y", dst: "X1" };
  const arrows: readonly TargetArrow[] = [idX1, idX2, idY, x12, x21, a, b];
  return {
    objects: ["X1", "X2", "Y"],
    arrows,
    id: identity,
    compose: (g, f) => {
      if (f.dst !== g.src) {
        throw new Error("Non-composable target arrows");
      }
      if (f.name.startsWith("id_")) return g;
      if (g.name.startsWith("id_")) return f;
      if (f === x12 && g === x21) return idX2;
      if (f === x21 && g === x12) return idX1;
      if (f === a && g === b) return idY;
      if (f === b && g === a) return idX1;
      throw new Error("No additional composites in target category");
    },
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (left, right) => left.name === right.name && left.src === right.src && left.dst === right.dst,
  };
};

const makeSwapFunctor = (
  category: FiniteCategory<DomainObject, DomainArrow>,
): FunctorWithWitness<DomainObject, DomainArrow, DomainObject, DomainArrow> =>
  constructFunctorWithWitness(
    category,
    category,
    {
      F0: (object) => {
        switch (object) {
          case "A":
            return "B";
          case "B":
            return "A";
          default:
            return object;
        }
      },
      F1: (arrow) => {
        const byName = (name: string): DomainArrow =>
          category.arrows.find((candidate) => candidate.name === name)!;
        switch (arrow.name) {
          case "id_A":
            return category.id("B");
          case "id_B":
            return category.id("A");
          case "ab":
            return byName("ba");
          case "ba":
            return byName("ab");
          default:
            return arrow;
        }
      },
    },
    { objects: category.objects, arrows: category.arrows },
  );

const makeEssentialInjectivityCounterexample = (
  domain: FiniteCategory<DomainObject, DomainArrow>,
  target: FiniteCategory<TargetObject, TargetArrow>,
): FunctorWithWitness<DomainObject, DomainArrow, TargetObject, TargetArrow> =>
  constructFunctorWithWitness(
    domain,
    target,
    {
      F0: (object) => {
        switch (object) {
          case "A":
            return "X1";
          case "B":
            return "Y";
          case "C":
            return "X2";
        }
      },
      F1: (arrow) => {
        const byName = (name: string): TargetArrow =>
          target.arrows.find((candidate) => candidate.name === name)!;
        switch (arrow.name) {
          case "id_A":
            return target.id("X1");
          case "id_B":
            return target.id("Y");
          case "id_C":
            return target.id("X2");
          case "ab":
            return byName("a");
          case "ba":
            return byName("b");
          default:
            throw new Error(`Unhandled arrow ${arrow.name}`);
        }
      },
    },
    { objects: domain.objects, arrows: domain.arrows },
  );

describe("computeSkeleton", () => {
  it("selects canonical representatives and certifies essential surjectivity", () => {
    const domain = makeDomainCategory();
    const skeleton = computeSkeleton(domain);

    expect(skeleton.skeleton.objects).toEqual(["A", "C"]);
    const assignmentForB = skeleton.representativeMap.get("B");
    expect(assignmentForB?.representative).toBe("A");
    expect(assignmentForB?.witness.forward.name).toBe("ab");
    expect(skeleton.essentialSurjectivity.holds).toBe(true);
    expect(skeleton.faithfulness.holds).toBe(true);
    expect(skeleton.fullness.holds).toBe(true);
  });
});

describe("skeletonEquivalenceWitness", () => {
  it("constructs an equivalence between a category and its skeleton", () => {
    const domain = makeDomainCategory();
    const { equivalence, computation } = skeletonEquivalenceWitness(domain);
    expect(computation.skeleton.objects).toEqual(["A", "C"]);
    expect(equivalence.quasiInverse.functor.F0("B")).toBe("A");
    expect(computation.essentialSurjectivity.holds).toBe(true);
  });
});

describe("compareFunctorsModuloSkeleton", () => {
  it("detects natural isomorphism between functors after restricting to the skeleton", () => {
    const domain = makeDomainCategory();
    const skeleton = computeSkeleton(domain);
    const identity = identityFunctorWithWitness(domain);
    const swapped = makeSwapFunctor(domain);

    const comparison = compareFunctorsModuloSkeleton(skeleton, identity, swapped);

    expect(comparison.holds).toBe(true);
    expect(comparison.assignments).toHaveLength(2);
    const isoForA = comparison.assignments.find((entry) => entry.object === "A");
    expect(isoForA?.firstImage).toBe("A");
    expect(isoForA?.secondImage).toBe("B");
  });
});

describe("analyzeEssentialInjectivityModuloTargetSkeleton", () => {
  it("classifies failures that stem from redundant target iso-classes", () => {
    const domain = makeDomainCategory();
    const target = makeTargetCategory();
    const functor = makeEssentialInjectivityCounterexample(domain, target);
    const targetSkeleton = skeletonEquivalenceWitness(target);

    const analysis = analyzeEssentialInjectivityModuloTargetSkeleton(functor, targetSkeleton);

    expect(analysis.original.holds).toBe(false);
    expect(analysis.classifications).not.toHaveLength(0);
    const classification = analysis.classifications[0]!;
    expect(classification.sharesSkeletonRepresentative).toBe(true);
    expect(classification.representative).toBe("X1");
  });
});
