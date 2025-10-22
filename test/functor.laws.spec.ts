import { describe, expect, test } from "vitest";
import {
  isFunctor,
  type Functor,
  type FunctorWitness,
} from "../functor";
import {
  FinSetCat,
  type FinSetCategory,
  type FinSetName,
  type FuncArr,
} from "../models/finset-cat";
import type { SimpleCat } from "../simple-cat";

describe("isFunctor oracle", () => {
  const buildFinSetCategory = (): FinSetCategory =>
    FinSetCat({
      A: ["0", "1"],
      B: ["x", "y"],
    });

  const buildFinSetWitness = (
    category: FinSetCategory,
    functor: Functor<FinSetName, FuncArr, FinSetName, FuncArr>,
  ): FunctorWitness<FinSetName, FuncArr, FinSetName, FuncArr> => {
    const idA = category.id("A");
    const idB = category.id("B");
    const arrowAB: FuncArr = {
      name: "f",
      dom: "A",
      cod: "B",
      map: (value: string) => (value === "0" ? "x" : "y"),
    };

    return {
      source: category,
      target: category,
      functor,
      objectGenerators: ["A", "B"],
      arrowGenerators: [idA, idB, arrowAB],
      composablePairs: [
        { f: arrowAB, g: idB },
        { f: idA, g: arrowAB },
      ],
    };
  };

  test("accepts the identity functor on FinSet", () => {
    const category = buildFinSetCategory();
    const identityFunctor: Functor<FinSetName, FuncArr, FinSetName, FuncArr> = {
      F0: (object) => object,
      F1: (arrow) => arrow,
    };

    const report = isFunctor(buildFinSetWitness(category, identityFunctor));

    expect(report.holds).toBe(true);
    expect(report.details).toHaveLength(0);
    expect(report.preservesComposition).toBe(true);
    expect(report.preservesIdentities).toBe(true);
    expect(report.respectsSourcesAndTargets).toBe(true);
  });

  test("detects endpoint mismatches in FinSet", () => {
    const category = buildFinSetCategory();
    const mismatched: Functor<FinSetName, FuncArr, FinSetName, FuncArr> = {
      F0: (object) => object,
      F1: (_arrow) => category.id("B"),
    };

    const report = isFunctor(buildFinSetWitness(category, mismatched));

    expect(report.holds).toBe(false);
    expect(report.respectsSourcesAndTargets).toBe(false);
    expect(report.endpointFailures.length).toBeGreaterThan(0);
    expect(report.details.some((detail) => detail.includes("mismatched endpoints"))).toBe(true);
  });

  test("flags composition failures for monoid categories", () => {
    type Star = { readonly tag: "★" };
    const STAR: Star = { tag: "★" };

    interface MonoidArrow {
      readonly from: Star;
      readonly to: Star;
      readonly element: number;
    }

    const makeArrow = (element: number): MonoidArrow => ({
      from: STAR,
      to: STAR,
      element,
    });

    const mod3Category: SimpleCat<Star, MonoidArrow> = {
      id: () => makeArrow(0),
      compose: (g, f) => makeArrow((g.element + f.element) % 3),
      src: (arrow) => arrow.from,
      dst: (arrow) => arrow.to,
    };

    const one = makeArrow(1);
    const two = makeArrow(2);
    const idStar = mod3Category.id(STAR);

    const squaring: Functor<Star, MonoidArrow, Star, MonoidArrow> = {
      F0: () => STAR,
      F1: (arrow) => makeArrow((arrow.element * arrow.element) % 3),
    };

    const witness: FunctorWitness<Star, MonoidArrow, Star, MonoidArrow> = {
      source: mod3Category,
      target: mod3Category,
      functor: squaring,
      objectGenerators: [STAR],
      arrowGenerators: [idStar, one, two],
      composablePairs: [
        { f: one, g: one },
        { f: one, g: two },
      ],
    };

    const report = isFunctor(witness);

    expect(report.holds).toBe(false);
    expect(report.preservesComposition).toBe(false);
    expect(report.compositionFailures.length).toBeGreaterThan(0);
    expect(report.details.some((detail) => detail.includes("composition"))).toBe(true);
    expect(report.preservesIdentities).toBe(true);
  });
});
