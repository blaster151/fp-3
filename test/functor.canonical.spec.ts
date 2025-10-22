import { describe, expect, test } from "vitest";
import {
  identityFunctorWithWitness,
  type FunctorCheckSamples,
} from "../functor";
import {
  type ArrPair,
  type ObjPair,
  diagonalFunctorWithWitness,
  pi1WithWitness,
  pi2WithWitness,
} from "../product-cat";
import {
  constantCosliceFunctorWithWitness,
  constantSliceFunctorWithWitness,
  cosliceForgetfulFunctorWithWitness,
  makeCoslice,
  makeSlice,
  sliceForgetfulFunctorWithWitness,
  type CosliceArrow,
  type CosliceCategory,
  type CosliceObject,
  type SliceArrow,
  type SliceCategory,
  type SliceObject,
} from "../slice-cat";
import {
  FinSetCat,
  type FinSetCategory,
  type FinSetName,
  type FuncArr,
} from "../models/finset-cat";

const buildFinSetCategory = (): FinSetCategory =>
  FinSetCat({
    A: ["0", "1"],
    B: ["x", "y"],
  });

const buildFinSetSamples = (
  category: FinSetCategory,
  arrowAB: FuncArr,
): FunctorCheckSamples<FinSetName, FuncArr> => {
  const idA = category.id("A");
  const idB = category.id("B");
  return {
    objects: ["A", "B"],
    arrows: [idA, idB, arrowAB],
    composablePairs: [
      { f: arrowAB, g: idB },
      { f: idA, g: arrowAB },
    ],
  };
};

const buildProductSamples = (
  category: FinSetCategory,
  arrowAB: FuncArr,
): FunctorCheckSamples<
  ObjPair<FinSetName, FinSetName>,
  ArrPair<FinSetName, FinSetName, FuncArr, FuncArr>
> => {
  const idA = category.id("A");
  const idB = category.id("B");
  const pairIdA: ArrPair<FinSetName, FinSetName, FuncArr, FuncArr> = {
    src: ["A", "A"],
    dst: ["A", "A"],
    cf: idA,
    dg: idA,
  };
  const pairIdB: ArrPair<FinSetName, FinSetName, FuncArr, FuncArr> = {
    src: ["B", "B"],
    dst: ["B", "B"],
    cf: idB,
    dg: idB,
  };
  const pairAB: ArrPair<FinSetName, FinSetName, FuncArr, FuncArr> = {
    src: ["A", "A"],
    dst: ["B", "B"],
    cf: arrowAB,
    dg: arrowAB,
  };
  return {
    objects: [
      ["A", "A"],
      ["A", "B"],
      ["B", "B"],
    ],
    arrows: [pairIdA, pairIdB, pairAB],
    composablePairs: [
      { f: pairAB, g: pairIdB },
      { f: pairIdA, g: pairAB },
    ],
  };
};

const buildSliceSamples = (
  slice: SliceCategory<FinSetName, FuncArr>,
): FunctorCheckSamples<SliceObject<FinSetName, FuncArr>, SliceArrow<FinSetName, FuncArr>> => {
  const [firstObject] = slice.objects;
  const idFirst = firstObject ? slice.id(firstObject) : undefined;
  const nonIdentity = slice.arrows.find(
    (arrow) => arrow !== idFirst && !Object.is(arrow.mediating, slice.id(arrow.src).mediating),
  );
  const arrows = [idFirst, nonIdentity].filter(
    (arrow): arrow is SliceArrow<FinSetName, FuncArr> => arrow !== undefined,
  );
  const composablePairs =
    nonIdentity && firstObject
      ? [
          {
            f: nonIdentity,
            g: slice.id(nonIdentity.dst),
          },
        ]
      : [];
  return {
    objects: slice.objects.slice(0, 2),
    arrows,
    composablePairs,
  };
};

const buildCosliceSamples = (
  coslice: CosliceCategory<FinSetName, FuncArr>,
): FunctorCheckSamples<
  CosliceObject<FinSetName, FuncArr>,
  CosliceArrow<FinSetName, FuncArr>
> => {
  const [firstObject] = coslice.objects;
  const idFirst = firstObject ? coslice.id(firstObject) : undefined;
  const nonIdentity = coslice.arrows.find(
    (arrow) => arrow !== idFirst && !Object.is(arrow.mediating, coslice.id(arrow.src).mediating),
  );
  const arrows = [idFirst, nonIdentity].filter(
    (arrow): arrow is CosliceArrow<FinSetName, FuncArr> => arrow !== undefined,
  );
  const composablePairs =
    nonIdentity && firstObject
      ? [
          {
            f: coslice.id(nonIdentity.dst),
            g: nonIdentity,
          },
        ]
      : [];
  return {
    objects: coslice.objects.slice(0, 2),
    arrows,
    composablePairs,
  };
};

describe("canonical functor constructors", () => {
  test("identity functor witness packages supplied samples", () => {
    const category = buildFinSetCategory();
    const arrowAB: FuncArr = {
      name: "f",
      dom: "A",
      cod: "B",
      map: (value: string) => (value === "0" ? "x" : "y"),
    };
    const samples = buildFinSetSamples(category, arrowAB);

    const identity = identityFunctorWithWitness(category, samples);

    expect(identity.report.holds).toBe(true);
    expect(identity.witness.objectGenerators).toContain("A");
    expect(identity.witness.arrowGenerators.some((arrow) => arrow.name === "f")).toBe(true);
  });

  test("diagonal and projections compose to identities on sampled data", () => {
    const category = buildFinSetCategory();
    const arrowAB: FuncArr = {
      name: "f",
      dom: "A",
      cod: "B",
      map: (value: string) => (value === "0" ? "x" : "y"),
    };
    const samples = buildFinSetSamples(category, arrowAB);
    const productSamples = buildProductSamples(category, arrowAB);

    const diagonal = diagonalFunctorWithWitness(category, samples);
    const pi1 = pi1WithWitness(category, category, productSamples);
    const pi2 = pi2WithWitness(category, category, productSamples);

    expect(diagonal.report.holds).toBe(true);
    expect(pi1.report.holds).toBe(true);
    expect(pi2.report.holds).toBe(true);

    const objectImage = diagonal.functor.F0("A");
    expect(pi1.functor.F0(objectImage)).toBe("A");
    expect(pi2.functor.F0(objectImage)).toBe("A");

    const arrowImage = diagonal.functor.F1(arrowAB);
    expect(pi1.functor.F1(arrowImage)).toBe(arrowAB);
    expect(pi2.functor.F1(arrowImage)).toBe(arrowAB);
  });

  test("constant slice and coslice functors collapse to identity arrows", () => {
    const category = buildFinSetCategory();
    const arrowAB: FuncArr = {
      name: "f",
      dom: "A",
      cod: "B",
      map: (value: string) => (value === "0" ? "x" : "y"),
    };
    const samples = buildFinSetSamples(category, arrowAB);

    const slice = makeSlice(category, "B");
    const coslice = makeCoslice(category, "A");

    const constantSlice = constantSliceFunctorWithWitness(category, "B", slice, samples);
    const constantCoslice = constantCosliceFunctorWithWitness(category, "A", coslice, samples);

    expect(constantSlice.report.holds).toBe(true);
    expect(constantCoslice.report.holds).toBe(true);
    expect(constantSlice.metadata?.[0]).toContain("Δ_");
    expect(constantCoslice.metadata?.[0]).toContain("Δ^");

    const collapsedSlice = constantSlice.functor.F1(arrowAB);
    const collapsedCoslice = constantCoslice.functor.F1(arrowAB);

    expect(category.eq(collapsedSlice.mediating, category.id("B"))).toBe(true);
    expect(category.eq(collapsedCoslice.mediating, category.id("A"))).toBe(true);
  });

  test("slice and coslice forgetful functors expose underlying mediating arrows", () => {
    const category = buildFinSetCategory();
    const arrowAB: FuncArr = {
      name: "f",
      dom: "A",
      cod: "B",
      map: (value: string) => (value === "0" ? "x" : "y"),
    };

    const slice = makeSlice(category, "B");
    const coslice = makeCoslice(category, "A");

    const sliceSamples = buildSliceSamples(slice);
    const cosliceSamples = buildCosliceSamples(coslice);

    const sliceForgetful = sliceForgetfulFunctorWithWitness(category, slice, "B", sliceSamples);
    const cosliceForgetful = cosliceForgetfulFunctorWithWitness(category, coslice, "A", cosliceSamples);

    expect(sliceForgetful.report.holds).toBe(true);
    expect(cosliceForgetful.report.holds).toBe(true);
    expect(sliceForgetful.metadata?.[0]).toContain("C/B");
    expect(cosliceForgetful.metadata?.[0]).toContain("\\C");

    const sliceObject = sliceSamples.objects?.[0] ?? slice.objects[0]!;
    const cosliceObject = cosliceSamples.objects?.[0] ?? coslice.objects[0]!;

    expect(sliceForgetful.functor.F0(sliceObject)).toBe(sliceObject.domain);
    expect(cosliceForgetful.functor.F0(cosliceObject)).toBe(cosliceObject.codomain);

    const sliceArrow = sliceSamples.arrows?.[0];
    const cosliceArrow = cosliceSamples.arrows?.[0];

    if (sliceArrow) {
      expect(sliceForgetful.functor.F1(sliceArrow)).toBe(sliceArrow.mediating);
    }
    if (cosliceArrow) {
      expect(cosliceForgetful.functor.F1(cosliceArrow)).toBe(cosliceArrow.mediating);
    }
  });
});

