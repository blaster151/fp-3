import { describe, expect, it } from "vitest";

import {
  buildEquivalenceWitness,
  checkEssentialInjectivityOnObjects,
  checkFaithfulFunctor,
  checkFullFunctor,
  essentialInjectiveFromFullyFaithful,
  isEssentiallySurjective,
  type EquivalencePrerequisites,
} from "../functor-equivalence";
import { constructFunctorWithWitness } from "../functor";

type Obj = "A" | "B" | "C";

type Arrow =
  | { readonly name: "idA"; readonly src: "A"; readonly dst: "A" }
  | { readonly name: "idB"; readonly src: "B"; readonly dst: "B" }
  | { readonly name: "idC"; readonly src: "C"; readonly dst: "C" }
  | { readonly name: "f"; readonly src: "A"; readonly dst: "B" }
  | { readonly name: "g"; readonly src: "B"; readonly dst: "C" }
  | { readonly name: "h"; readonly src: "A"; readonly dst: "C" }
  | { readonly name: "alt"; readonly src: "A"; readonly dst: "C" };

const idA: Arrow = { name: "idA", src: "A", dst: "A" };
const idB: Arrow = { name: "idB", src: "B", dst: "B" };
const idC: Arrow = { name: "idC", src: "C", dst: "C" };
const f: Arrow = { name: "f", src: "A", dst: "B" };
const g: Arrow = { name: "g", src: "B", dst: "C" };
const h: Arrow = { name: "h", src: "A", dst: "C" };
const alt: Arrow = { name: "alt", src: "A", dst: "C" };

const arrows: readonly Arrow[] = [idA, idB, idC, f, g, h, alt];

const compose = (right: Arrow, left: Arrow): Arrow => {
  if (left.dst !== right.src) {
    throw new Error("Arrows must be composable");
  }
  if (left === idA) return right;
  if (left === idB) return right;
  if (left === idC) return right;
  if (right === idA) return left;
  if (right === idB) return left;
  if (right === idC) return left;
  if (left === f && right === g) return h;
  if (left === h && right === idC) return h;
  if (left === alt && right === idC) return alt;
  throw new Error(`Unhandled composite ${left.name} ∘ ${right.name}`);
};

const exampleCategory = {
  objects: ["A", "B", "C"] as const,
  arrows,
  id: (object: Obj): Arrow => {
    switch (object) {
      case "A":
        return idA;
      case "B":
        return idB;
      case "C":
        return idC;
    }
  },
  compose,
  src: (arrow: Arrow) => arrow.src,
  dst: (arrow: Arrow) => arrow.dst,
  eq: (left: Arrow, right: Arrow) => left.name === right.name,
} as const;

type IsoObj = "x" | "y";

type IsoArrow =
  | { readonly name: "idx"; readonly src: "x"; readonly dst: "x" }
  | { readonly name: "idy"; readonly src: "y"; readonly dst: "y" }
  | { readonly name: "f"; readonly src: "x"; readonly dst: "y" }
  | { readonly name: "g"; readonly src: "y"; readonly dst: "x" };

const idx: IsoArrow = { name: "idx", src: "x", dst: "x" };
const idy: IsoArrow = { name: "idy", src: "y", dst: "y" };
const fx: IsoArrow = { name: "f", src: "x", dst: "y" };
const gx: IsoArrow = { name: "g", src: "y", dst: "x" };

const composeIso = (right: IsoArrow, left: IsoArrow): IsoArrow => {
  if (left.dst !== right.src) {
    throw new Error("Non-composable arrows");
  }
  if (left === idx) return right;
  if (left === idy) return right;
  if (right === idx) return left;
  if (right === idy) return left;
  if (left === fx && right === gx) return idy;
  if (left === gx && right === fx) return idx;
  throw new Error("Only identities compose beyond the equivalence witnesses");
};

const isoCategory = {
  objects: ["x", "y"] as const,
  arrows: [idx, idy, fx, gx] as const,
  id: (object: IsoObj): IsoArrow => (object === "x" ? idx : idy),
  compose: composeIso,
  src: (arrow: IsoArrow) => arrow.src,
  dst: (arrow: IsoArrow) => arrow.dst,
  eq: (left: IsoArrow, right: IsoArrow) => left.name === right.name,
} as const;

type PointObj = "*" | "◇";

type PointArrow =
  | { readonly name: "id*"; readonly src: "*"; readonly dst: "*" }
  | { readonly name: "id◇"; readonly src: "◇"; readonly dst: "◇" };

const idStar: PointArrow = { name: "id*", src: "*", dst: "*" };
const idDiamond: PointArrow = { name: "id◇", src: "◇", dst: "◇" };

const twoPointCategory = {
  objects: ["*", "◇"] as const,
  arrows: [idStar, idDiamond] as const,
  id: (object: PointObj): PointArrow => (object === "*" ? idStar : idDiamond),
  compose: (right: PointArrow, left: PointArrow) => {
    if (left.dst !== right.src) {
      throw new Error("Non-composable arrows in two-point category");
    }
    return right;
  },
  src: (arrow: PointArrow) => arrow.src,
  dst: (arrow: PointArrow) => arrow.dst,
  eq: (left: PointArrow, right: PointArrow) => left.name === right.name,
} as const;

const singleObjectCategory = {
  objects: ["*"] as const,
  arrows: [idStar] as const,
  id: () => idStar,
  compose: (right: PointArrow, _left: PointArrow) => right,
  src: (arrow: PointArrow) => arrow.src,
  dst: (arrow: PointArrow) => arrow.dst,
  eq: (left: PointArrow, right: PointArrow) => left.name === right.name,
} as const;

const exampleSamples = {
  objects: ["A", "B", "C"] as const,
  arrows: [f, g, h, alt],
  composablePairs: [{ f, g }],
} as const;

const makeIdentityFunctor = () =>
  constructFunctorWithWitness(exampleCategory, exampleCategory, {
    F0: (object: Obj) => object,
    F1: (arrow: Arrow) => arrow,
  }, exampleSamples);

const makeCollapsingFunctor = () =>
  constructFunctorWithWitness(exampleCategory, exampleCategory, {
    F0: (object: Obj) => object,
    F1: (arrow: Arrow) => {
      if (arrow === alt) {
        return h;
      }
      return arrow;
    },
  }, exampleSamples);

const makeEquivalenceFunctor = () =>
  constructFunctorWithWitness(isoCategory, singleObjectCategory, {
    F0: (_object: IsoObj) => "*" as const,
    F1: (_arrow: IsoArrow) => idStar,
  }, {
    objects: ["x", "y"] as const,
    arrows: [fx, gx],
    composablePairs: [
      { f: fx, g: gx },
      { f: gx, g: fx },
    ],
  });

const makeDiscreteFunctor = () =>
  constructFunctorWithWitness(isoCategory, twoPointCategory, {
    F0: (object: IsoObj): PointObj => (object === "x" ? "*" : "*"),
    F1: (_arrow: IsoArrow) => idStar,
  }, {
    objects: ["x", "y"] as const,
    arrows: [idx, idy],
  });

describe("checkFaithfulFunctor", () => {
  it("confirms the identity functor is faithful", () => {
    const functor = makeIdentityFunctor();
    const report = checkFaithfulFunctor(functor);
    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
  });

    it("detects when distinct arrows collapse", () => {
      const functor = makeCollapsingFunctor();
      const report = checkFaithfulFunctor(functor);
      expect(report.holds).toBe(false);
      expect(report.failures).not.toHaveLength(0);
      const failure = report.failures[0];
      if (!failure) {
        throw new Error("expected faithfulness failure for collapsing functor");
      }
      const { first, second } = failure;
      expect(first).toBe(alt);
      expect(second).toBe(h);
    });
  });

describe("checkFullFunctor", () => {
  it("confirms the identity functor is full", () => {
    const functor = makeIdentityFunctor();
    const report = checkFullFunctor(functor);
    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
    const lifted = report.lift("A", "C", h);
    expect(lifted).toBe(h);
  });

  it("reports missing lifts when the image skips arrows", () => {
    const functor = makeCollapsingFunctor();
    const report = checkFullFunctor(functor);
    expect(report.holds).toBe(false);
    expect(report.failures).not.toHaveLength(0);
    const failure = report.failures.find((entry) => entry.arrow === alt);
    expect(failure).toBeDefined();
  });
});

describe("checkEssentialInjectivityOnObjects", () => {
  it("witnesses essential injectivity for the equivalence example", () => {
    const functor = makeEquivalenceFunctor();
    const report = checkEssentialInjectivityOnObjects(functor);
    expect(report.holds).toBe(true);
  });

  it("detects missing source isomorphisms", () => {
    const functor = makeDiscreteFunctor();
    const report = checkEssentialInjectivityOnObjects(functor);
    expect(report.holds).toBe(false);
    expect(report.failures).not.toHaveLength(0);
  });
});

describe("isEssentiallySurjective", () => {
  it("assigns preimages for the single-object category", () => {
    const functor = makeEquivalenceFunctor();
    const report = isEssentiallySurjective(functor);
    expect(report.holds).toBe(true);
    expect(report.assignments).toHaveLength(1);
    expect(report.assignments[0]?.targetObject).toBe("*");
  });

  it("records target objects without preimages", () => {
    const functor = makeDiscreteFunctor();
    const report = isEssentiallySurjective(functor);
    expect(report.holds).toBe(false);
    expect(report.failures).not.toHaveLength(0);
    const missing = report.failures.find((failure) => failure.targetObject === "◇");
    expect(missing).toBeDefined();
  });
});

describe("essentialInjectiveFromFullyFaithful", () => {
  it("lifts target isomorphisms to source witnesses when full and faithful", () => {
    const functor = constructFunctorWithWitness(
      isoCategory,
      isoCategory,
      {
        F0: (object: IsoObj) => object,
        F1: (arrow: IsoArrow) => arrow,
      },
      {
        objects: ["x", "y"] as const,
        arrows: [idx, idy, fx, gx] as const,
        composablePairs: [
          { f: fx, g: gx },
          { f: gx, g: fx },
        ],
      },
    );
    const faithfulness = checkFaithfulFunctor(functor);
    const fullness = checkFullFunctor(functor);

    const report = essentialInjectiveFromFullyFaithful(functor, { faithfulness, fullness });

    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.inspectedPairs).toBeGreaterThan(0);
  });

  it("records when prerequisites for Theorem 138 are missing", () => {
    const functor = makeCollapsingFunctor();
    const faithfulness = checkFaithfulFunctor(functor);
    const fullness = checkFullFunctor(functor);

    const report = essentialInjectiveFromFullyFaithful(functor, { faithfulness, fullness });

    expect(report.holds).toBe(false);
    expect(report.inspectedPairs).toBe(0);
    expect(report.details.join(" ")).toContain("Theorem 138");
  });
});

describe("buildEquivalenceWitness", () => {
  it("packages the quasi-inverse, unit, and counit", () => {
    const functor = makeEquivalenceFunctor();
    const faithfulness = checkFaithfulFunctor(functor);
    const fullness = checkFullFunctor(functor);
    const essentialSurjectivity = isEssentiallySurjective(functor);
    const essentialInjectivity = checkEssentialInjectivityOnObjects(functor);

    const prerequisites: EquivalencePrerequisites<IsoObj, IsoArrow, PointObj, PointArrow> = {
      faithfulness,
      fullness,
      essentialSurjectivity,
      essentialInjectivity,
    };

    const equivalence = buildEquivalenceWitness(functor, prerequisites);
    expect(equivalence.quasiInverse.report.holds).toBe(true);
    expect(equivalence.unit.report.holds).toBe(true);
    expect(equivalence.counit.report.holds).toBe(true);
    expect(equivalence.adjunction.report.holds).toBe(true);
    expect(equivalence.essentialInjectivity?.holds).toBe(true);
  });

  it("derives essential injectivity from full faithfulness when omitted", () => {
    const functor = makeEquivalenceFunctor();
    const faithfulness = checkFaithfulFunctor(functor);
    const fullness = checkFullFunctor(functor);
    const essentialSurjectivity = isEssentiallySurjective(functor);

    const prerequisites: EquivalencePrerequisites<IsoObj, IsoArrow, PointObj, PointArrow> = {
      faithfulness,
      fullness,
      essentialSurjectivity,
    };

    const equivalence = buildEquivalenceWitness(functor, prerequisites);

    expect(equivalence.essentialInjectivity).toBeDefined();
    expect(equivalence.essentialInjectivity?.holds).toBe(true);
  });
});
