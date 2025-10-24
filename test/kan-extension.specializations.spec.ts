import { describe, expect, it } from "vitest";

import {
  buildDiscreteLeftKanExtensionAlongInclusion,
  buildDiscreteLeftKanExtensionToTerminal,
  buildDiscreteRightKanExtensionToTerminal,
  collectDiscreteLeftKanColimit,
  collectDiscreteRightKanLimit,
  induceNaturalTransformationFromLeftKan,
} from "../kan-extension";
import {
  constructNaturalTransformationWithWitness,
  identityNaturalTransformation,
} from "../natural-transformation";
import { SetCat, type SetHom } from "../set-cat";

const equalsSetHom = (left: SetHom<unknown, unknown>, right: SetHom<unknown, unknown>): boolean => {
  if (!Object.is(left.dom, right.dom) || !Object.is(left.cod, right.cod)) {
    return false;
  }
  for (const value of left.dom) {
    if (!Object.is(left.map(value), right.map(value))) {
      return false;
    }
  }
  return true;
};

const renderRightLimit = <J, X>(
  limit: ReadonlyArray<ReadonlyMap<J, X>>,
): ReadonlyArray<ReadonlyArray<readonly [J, X]>> =>
  limit.map((entry) => Array.from(entry.entries()).map(([source, value]) => [source, value] as const));

describe("Discrete Kan extension specializations", () => {
  it("extends a discrete diagram along an inclusion and preserves diagnostics", () => {
    const inclusion = buildDiscreteLeftKanExtensionAlongInclusion({
      ambientObjects: ["A", "B", "C"] as const,
      subcategoryObjects: ["A", "C"] as const,
      inclusion: (object: "A" | "C") => (object === "A" ? "A" : "C"),
      family: (object: "A" | "C") =>
        object === "A"
          ? ["α", "β"]
          : ["γ"],
    });

    const lanA = Array.from(inclusion.extension.functor.F0("A")).map((element) => [
      element.source,
      element.value,
    ] as const);
    const lanB = Array.from(inclusion.extension.functor.F0("B"));
    const lanC = Array.from(inclusion.extension.functor.F0("C")).map((element) => [
      element.source,
      element.value,
    ] as const);

    expect(lanA).toEqual([
      ["A", "α"],
      ["A", "β"],
    ]);
    expect(lanB).toEqual([]);
    expect(lanC).toEqual([["C", "γ"]]);

    expect(inclusion.analysis.holds).toBe(true);
    expect(inclusion.analysis.fibers.map((fiber) => fiber.bijectionVerified)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it("recovers coproducts and products via terminal Kan extensions", () => {
    const family = {
      left: ["x", "y"] as const,
      right: [0, 1] as const,
    };

    const left = buildDiscreteLeftKanExtensionToTerminal<{ readonly tag: "L" | "R" }, string | number>({
      sourceObjects: [
        { tag: "L" } as const,
        { tag: "R" } as const,
      ],
      family: (object) => (object.tag === "L" ? Array.from(family.left) : Array.from(family.right)),
    });
    const coproduct = collectDiscreteLeftKanColimit(left);

    expect(coproduct).toEqual([
      [{ tag: "L" }, "x"],
      [{ tag: "L" }, "y"],
      [{ tag: "R" }, 0],
      [{ tag: "R" }, 1],
    ]);

    const right = buildDiscreteRightKanExtensionToTerminal<{ readonly tag: "L" | "R" }, string | number>({
      sourceObjects: [
        { tag: "L" } as const,
        { tag: "R" } as const,
      ],
      family: (object) => (object.tag === "L" ? Array.from(family.left) : Array.from(family.right)),
    });
    const product = renderRightLimit(collectDiscreteRightKanLimit(right));

    expect(product).toEqual([
      [
        [{ tag: "L" }, "x"],
        [{ tag: "R" }, 0],
      ],
      [
        [{ tag: "L" }, "x"],
        [{ tag: "R" }, 1],
      ],
      [
        [{ tag: "L" }, "y"],
        [{ tag: "R" }, 0],
      ],
      [
        [{ tag: "L" }, "y"],
        [{ tag: "R" }, 1],
      ],
    ]);

    expect(left.analysis.holds).toBe(true);
    expect(right.analysis.holds).toBe(true);
  });

  it("flags incorrect mediating arrows when the left Kan universal arrow is sabotaged", () => {
    const left = buildDiscreteLeftKanExtensionAlongInclusion({
      ambientObjects: [0, 1] as const,
      subcategoryObjects: [0] as const,
      inclusion: () => 0,
      family: () => ["only"],
    });

    const wrong = constructNaturalTransformationWithWitness(
      left.diagram,
      left.pullback,
      (object) => {
        const domain = left.diagram.functor.F0(object);
        const codomain = left.pullback.functor.F0(object);
        const representative = Array.from(codomain)[0];
        if (!representative) {
          return SetCat.hom(domain, codomain, (value: unknown) => value);
        }
        return SetCat.hom(domain, codomain, () => representative);
      },
      {
        samples: {
          objects: left.diagram.witness.objectGenerators,
          arrows: left.diagram.witness.arrowGenerators,
        },
        equalMor: equalsSetHom,
        metadata: ["Sabotaged Kan unit for diagnostic testing."],
      },
    );

    const induction = induceNaturalTransformationFromLeftKan(left, left.extension, wrong);

    expect(induction.holds).toBe(false);
    expect(induction.details).toContain("Left Kan induction comparison failed at 0.");

    const identity = identityNaturalTransformation(left.pullback);
    const restored = induceNaturalTransformationFromLeftKan(left, left.extension, identity);
    expect(restored.holds).toBe(true);
  });
});

