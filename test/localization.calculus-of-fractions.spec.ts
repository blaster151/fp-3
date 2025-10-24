import { describe, expect, it } from "vitest";

import {
  localizeCategory,
  localizationUniversalProperty,
  type CalculusOfFractionsData,
} from "../localization";
import { constructFunctorWithWitness } from "../functor";

type Obj = "A" | "B";

type BaseArrow =
  | { readonly name: "idA"; readonly src: "A"; readonly dst: "A" }
  | { readonly name: "idB"; readonly src: "B"; readonly dst: "B" }
  | { readonly name: "u"; readonly src: "A"; readonly dst: "B" }
  | { readonly name: "v"; readonly src: "B"; readonly dst: "A" }
  | { readonly name: "p"; readonly src: "B"; readonly dst: "B" };

const idA: BaseArrow = { name: "idA", src: "A", dst: "A" };
const idB: BaseArrow = { name: "idB", src: "B", dst: "B" };
const u: BaseArrow = { name: "u", src: "A", dst: "B" };
const v: BaseArrow = { name: "v", src: "B", dst: "A" };
const p: BaseArrow = { name: "p", src: "B", dst: "B" };

const baseArrows: readonly BaseArrow[] = [idA, idB, u, v, p];

const composeBase = (right: BaseArrow, left: BaseArrow): BaseArrow => {
  if (left.dst !== right.src) {
    throw new Error("Non-composable arrows in base category");
  }
  if (left === idA) return right;
  if (left === idB) return right;
  if (right === idA) return left;
  if (right === idB) return left;
  if (left === u && right === v) return p;
  if (left === v && right === u) return idA;
  if (left === p && right === v) return v;
  if (left === v && right === p) return v;
  if (left === p && right === idB) return p;
  if (left === idB && right === p) return p;
  if (left === p && right === p) return p;
  if (left === p && right === u) return u;
  if (left === u && right === p) return u;
  throw new Error(`Unhandled composite ${left.name} ∘ ${right.name}`);
};

const baseCategory = {
  objects: ["A", "B"] as const,
  arrows: baseArrows,
  id: (object: Obj): BaseArrow => (object === "A" ? idA : idB),
  compose: composeBase,
  src: (arrow: BaseArrow) => arrow.src,
  dst: (arrow: BaseArrow) => arrow.dst,
  eq: (left: BaseArrow, right: BaseArrow) => left.name === right.name,
} as const;

const denominators: readonly BaseArrow[] = [idA, idB, u];

const allComposablePairs = (): ReadonlyArray<{ readonly f: BaseArrow; readonly g: BaseArrow }> => {
  const pairs: Array<{ readonly f: BaseArrow; readonly g: BaseArrow }> = [];
  for (const left of baseArrows) {
    for (const right of baseArrows) {
      if (left.dst === right.src) {
        pairs.push({ f: left, g: right });
      }
    }
  }
  return pairs;
};

const baseSamples = {
  objects: baseCategory.objects,
  arrows: baseCategory.arrows,
  composablePairs: allComposablePairs(),
} as const;

type GroupoidArrow =
  | { readonly name: "idA"; readonly src: "A"; readonly dst: "A" }
  | { readonly name: "idB"; readonly src: "B"; readonly dst: "B" }
  | { readonly name: "iso"; readonly src: "A"; readonly dst: "B" }
  | { readonly name: "isoInv"; readonly src: "B"; readonly dst: "A" };

const gidA: GroupoidArrow = { name: "idA", src: "A", dst: "A" };
const gidB: GroupoidArrow = { name: "idB", src: "B", dst: "B" };
const iso: GroupoidArrow = { name: "iso", src: "A", dst: "B" };
const isoInv: GroupoidArrow = { name: "isoInv", src: "B", dst: "A" };

const composeGroupoid = (right: GroupoidArrow, left: GroupoidArrow): GroupoidArrow => {
  if (left.dst !== right.src) {
    throw new Error("Non-composable arrows in groupoid");
  }
  if (left === gidA) return right;
  if (left === gidB) return right;
  if (right === gidA) return left;
  if (right === gidB) return left;
  if (left === iso && right === isoInv) return gidB;
  if (left === isoInv && right === iso) return gidA;
  throw new Error(`Unhandled composite ${left.name} ∘ ${right.name}`);
};

const groupoidCategory = {
  objects: ["A", "B"] as const,
  arrows: [gidA, gidB, iso, isoInv] as const,
  id: (object: Obj): GroupoidArrow => (object === "A" ? gidA : gidB),
  compose: composeGroupoid,
  src: (arrow: GroupoidArrow) => arrow.src,
  dst: (arrow: GroupoidArrow) => arrow.dst,
  eq: (left: GroupoidArrow, right: GroupoidArrow) => left.name === right.name,
} as const;

describe("localization calculus of fractions", () => {
  const data: CalculusOfFractionsData<Obj, BaseArrow> = {
    category: baseCategory,
    denominators,
  };

  it("builds canonical roofs and inverses", () => {
    const localization = localizeCategory(data);

    expect(localization.diagnostics.identityClosure).toBe(true);
    expect(localization.diagnostics.compositionClosure).toBe(true);
    expect(localization.diagnostics.oreCondition).toBe(true);

    const localizedU = localization.localizationFunctor.functor.F1(u);
    const inverse = localization.localizedCategory.arrows.find(
      (arrow) => arrow.source === "B" && arrow.target === "A" && arrow.denominator.name === "u",
    );
    expect(inverse).toBeDefined();

    const leftComposite = localization.localizedCategory.compose(inverse!, localizedU);
    const rightComposite = localization.localizedCategory.compose(localizedU, inverse!);

    expect(leftComposite.key).toBe(localization.localizedCategory.id("A").key);
    expect(rightComposite.key).toBe(localization.localizedCategory.id("B").key);
  });

  it("verifies the universal property when denominators become isomorphisms", () => {
    const localization = localizeCategory(data);

    const baseFunctor = constructFunctorWithWitness(baseCategory, groupoidCategory, {
      F0: (object: Obj) => object,
      F1: (arrow: BaseArrow): GroupoidArrow => {
        switch (arrow.name) {
          case "idA":
            return gidA;
          case "idB":
            return gidB;
          case "u":
            return iso;
          case "v":
            return isoInv;
          case "p":
            return gidB;
        }
      },
    }, baseSamples);

    const lifted = constructFunctorWithWitness(
      localization.localizedCategory,
      groupoidCategory,
      {
        F0: (object: Obj) => object,
        F1: (arrow) => {
          const denominatorImage = baseFunctor.functor.F1(arrow.denominator);
          const inverse = denominatorImage === iso ? isoInv : denominatorImage;
          const numeratorImage = baseFunctor.functor.F1(arrow.numerator);
          return groupoidCategory.compose(numeratorImage, inverse);
        },
      },
      {
        objects: localization.localizedCategory.objects,
        arrows: localization.localizedCategory.arrows,
      },
    );

    const report = localizationUniversalProperty(localization, baseFunctor, lifted);
    expect(report.denominatorsInverted).toBe(true);
    expect(report.factorization.holds).toBe(true);
    expect(report.liftRespectsFractions).toBe(true);
    expect(report.holds).toBe(true);
  });

  it("detects when a functor fails to invert the chosen denominators", () => {
    const localization = localizeCategory(data);

    const badFunctor = constructFunctorWithWitness(baseCategory, baseCategory, {
      F0: (object: Obj) => object,
      F1: (arrow: BaseArrow) => arrow,
    }, baseSamples);

    const naiveLift = constructFunctorWithWitness(
      localization.localizedCategory,
      baseCategory,
      {
        F0: (object: Obj) => object,
        F1: (arrow) => arrow.numerator,
      },
      {
        objects: localization.localizedCategory.objects,
        arrows: localization.localizedCategory.arrows,
      },
    );

    const report = localizationUniversalProperty(localization, badFunctor, naiveLift);
    expect(report.denominatorsInverted).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.denominatorFailures.length).toBeGreaterThan(0);
  });
});
