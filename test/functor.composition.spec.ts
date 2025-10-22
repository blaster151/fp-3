import { describe, expect, test } from "vitest";
import {
  checkFunctorAssociativity,
  checkFunctorLeftIdentity,
  checkFunctorRightIdentity,
  compareFunctors,
  composeFunctors,
  identityFunctorWithWitness,
  type FunctorCheckSamples,
  type FunctorComposablePair,
} from "../functor";
import {
  composeContravariantContravariant,
  composeCovariantContravariant,
  contravariantToOppositeFunctor,
  homSetContravariantFunctorWithWitness,
} from "../contravariant";
import {
  diagonalFunctorWithWitness,
  pi1WithWitness,
  type ArrPair,
  type ObjPair,
} from "../product-cat";
import {
  FinSetCat,
  type FinSetCategory,
  type FinSetName,
  type FuncArr,
} from "../models/finset-cat";
import {
  SetCat,
  type SetHom,
  type SetObj,
} from "../set-cat";
import { setSimpleCategory } from "../set-simple-category";

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

const buildSetSamples = (): FunctorCheckSamples<
  SetObj<unknown>,
  SetHom<unknown, unknown>
> => {
  const numbers = SetCat.obj<number>([0, 1]);
  const booleans = SetCat.obj<boolean>([false, true]);
  const strings = SetCat.obj<string>(["a", "b"]);

  const rotate = SetCat.hom(numbers, numbers, (value: number) => (value + 1) % 2);
  const negate = SetCat.hom(booleans, booleans, (flag: boolean) => !flag);
  const isZero = SetCat.hom(numbers, booleans, (value: number) => value === 0);
  const classify = SetCat.hom(strings, numbers, (value: string) => (value === "a" ? 0 : 1));

  const arrows: SetHom<unknown, unknown>[] = [
    rotate as SetHom<unknown, unknown>,
    negate as SetHom<unknown, unknown>,
    isZero as SetHom<unknown, unknown>,
    classify as SetHom<unknown, unknown>,
  ];

  const objects = [
    numbers as SetObj<unknown>,
    booleans as SetObj<unknown>,
    strings as SetObj<unknown>,
  ] as ReadonlyArray<SetObj<unknown>>;

  const composablePairs: FunctorComposablePair<SetHom<unknown, unknown>>[] = [];
  for (const f of arrows) {
    for (const g of arrows) {
      if (Object.is(f.cod, g.dom)) {
        composablePairs.push({ f, g });
      }
    }
  }

  return { objects, arrows, composablePairs };
};

describe("functor composition constructors", () => {
  test("composeFunctors packages outer ∘ inner with witness metadata", () => {
    const category = buildFinSetCategory();
    const arrowAB: FuncArr = {
      name: "f",
      dom: "A",
      cod: "B",
      map: (value: string) => (value === "0" ? "x" : "y"),
    };
    const finsetSamples = buildFinSetSamples(category, arrowAB);
    const diagonal = diagonalFunctorWithWitness(category, finsetSamples);
    const productSamples = buildProductSamples(category, arrowAB);
    const projection = pi1WithWitness(category, category, productSamples);

    const composite = composeFunctors(projection, diagonal);
    expect(composite.report.holds).toBe(true);
    expect(
      composite.metadata?.some((line) =>
        line.includes("Theorem") && line.includes("129"),
      ),
    ).toBe(true);

    const identity = identityFunctorWithWitness(category, finsetSamples);
    const comparison = compareFunctors(composite, identity, { samples: finsetSamples });
    expect(comparison.holds).toBe(true);
    expect(comparison.details).toEqual([]);
  });

  test("associativity and identity diagnostics agree on FinSet samples", () => {
    const category = buildFinSetCategory();
    const arrowAB: FuncArr = {
      name: "f",
      dom: "A",
      cod: "B",
      map: (value: string) => (value === "0" ? "x" : "y"),
    };
    const finsetSamples = buildFinSetSamples(category, arrowAB);
    const diagonal = diagonalFunctorWithWitness(category, finsetSamples);
    const productSamples = buildProductSamples(category, arrowAB);
    const projection = pi1WithWitness(category, category, productSamples);
    const identity = identityFunctorWithWitness(category, finsetSamples);

    const associativity = checkFunctorAssociativity(identity, projection, diagonal, {
      samples: finsetSamples,
    });
    expect(associativity.holds).toBe(true);
    expect(associativity.details).toEqual([]);

    const leftIdentity = checkFunctorLeftIdentity(diagonal, { samples: finsetSamples });
    expect(leftIdentity.holds).toBe(true);
    expect(leftIdentity.details).toEqual([]);

    const rightIdentity = checkFunctorRightIdentity(diagonal, { samples: finsetSamples });
    expect(rightIdentity.holds).toBe(true);
    expect(rightIdentity.details).toEqual([]);
  });

  test("covariant ∘ contravariant composition preserves the contravariant witness", () => {
    const booleans = SetCat.obj([false, true]) as SetObj<unknown>;
    const toolkit = homSetContravariantFunctorWithWitness(booleans);
    const setSamples = buildSetSamples();
    const identitySet = identityFunctorWithWitness(setSimpleCategory, setSamples);

    const composite = composeCovariantContravariant(identitySet, toolkit.functor);
    expect(composite.report.holds).toBe(true);
    expect(
      composite.metadata?.some((line) =>
        line.includes("variance") && line.includes("contravariant"),
      ),
    ).toBe(true);

    const originalOpposite = contravariantToOppositeFunctor(toolkit.functor);
    const compositeOpposite = contravariantToOppositeFunctor(composite);
    const comparison = compareFunctors(compositeOpposite, originalOpposite, {
      samples: setSamples,
    });
    expect(comparison.holds).toBe(true);
  });

  test("contravariant ∘ contravariant yields a covariant composite", () => {
    const booleans = SetCat.obj([false, true]) as SetObj<unknown>;
    const toolkit = homSetContravariantFunctorWithWitness(booleans);
    const setSamples = buildSetSamples();

    const composite = composeContravariantContravariant(toolkit.functor, toolkit.functor, {
      samples: setSamples,
    });
    expect(composite.report.holds).toBe(true);

    const [sampleArrow] = setSamples.arrows ?? [];
    if (sampleArrow) {
      const expected = toolkit.functor.functor.F1(toolkit.functor.functor.F1(sampleArrow));
      const actual = composite.functor.F1(sampleArrow);
      const eq = setSimpleCategory.eq(actual, expected);
      expect(eq).toBe(true);
    }
  });
});
