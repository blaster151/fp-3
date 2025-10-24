import { describe, expect, it } from "vitest";

import {
  analyzeFunctorImage,
  imageSubcategoryFactorization,
} from "../functor-image";
import {
  attachFunctorProperties,
  evaluateFunctorProperty,
  makeArrowPropertyOracle,
  makeTerminalObjectOracle,
} from "../functor-property";
import type {
  CategoryPropertyCheck,
  FunctorPropertyAnalysis,
} from "../functor-property-types";
import {
  constructFunctorWithWitness,
  type FunctorWithWitness,
} from "../functor";
import type { SmallCategory } from "../subcategory";

interface Arrow {
  readonly name: string;
  readonly src: Obj;
  readonly dst: Obj;
}

type Obj = "A" | "B" | "C";

type ExampleFunctor = FunctorWithWitness<Obj, Arrow, Obj, Arrow>;

const makeArrow = (name: string, src: Obj, dst: Obj): Arrow => ({
  name,
  src,
  dst,
});

const idA = makeArrow("idA", "A", "A");
const idB = makeArrow("idB", "B", "B");
const idC = makeArrow("idC", "C", "C");
const f = makeArrow("f", "A", "B");
const g = makeArrow("g", "B", "C");
const h = makeArrow("h", "A", "C");
const alt = makeArrow("alt", "A", "C");

const identities: Record<Obj, Arrow> = {
  A: idA,
  B: idB,
  C: idC,
};

const compose = (gArr: Arrow, fArr: Arrow): Arrow => {
  if (!Object.is(fArr.dst, gArr.src)) {
    throw new Error("composable arrows must align endpoints");
  }
  if (Object.is(fArr, identities[fArr.src])) {
    return gArr;
  }
  if (Object.is(gArr, identities[gArr.dst])) {
    return fArr;
  }
  if (Object.is(fArr, f) && Object.is(gArr, g)) {
    return h;
  }
  if (Object.is(fArr, h) && Object.is(gArr, identities.C)) {
    return h;
  }
  if (Object.is(fArr, alt) && Object.is(gArr, identities.C)) {
    return alt;
  }
  throw new Error(
    `composition not implemented for ${fArr.name} then ${gArr.name}`,
  );
};

const exampleCategory: SmallCategory<Obj, Arrow> = {
  objects: new Set<Obj>(["A", "B", "C"]),
  arrows: new Set<Arrow>([idA, idB, idC, f, g, h, alt]),
  id: (object) => identities[object],
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
};

const defaultSamples = {
  objects: ["A", "B", "C"] as const,
  arrows: [f, g, h],
  composablePairs: [{ f, g }],
};

const makeIdentityFunctor = (): ExampleFunctor =>
  constructFunctorWithWitness(
    exampleCategory,
    exampleCategory,
    {
      F0: (object: Obj) => object,
      F1: (arrow: Arrow) => arrow,
    },
    defaultSamples,
  );

const makeIdentityFailureFunctor = (): ExampleFunctor =>
  constructFunctorWithWitness(
    exampleCategory,
    exampleCategory,
    {
      F0: (object: Obj) => object,
      F1: (arrow: Arrow) => {
        if (Object.is(arrow, idA)) {
          return idB;
        }
        return arrow;
      },
    },
    defaultSamples,
  );

const makeCompositionFailureFunctor = (): ExampleFunctor =>
  constructFunctorWithWitness(
    exampleCategory,
    exampleCategory,
    {
      F0: (object: Obj) => object,
      F1: (arrow: Arrow) => {
        if (Object.is(arrow, h)) {
          return alt;
        }
        return arrow;
      },
    },
    defaultSamples,
  );

const makeCollapsingFunctor = (): ExampleFunctor =>
  constructFunctorWithWitness(
    exampleCategory,
    exampleCategory,
    {
      F0: (object: Obj) => object,
      F1: (arrow: Arrow) => identities[arrow.dst],
    },
    defaultSamples,
  );

const identityArrowCheck = <O, A extends { src: O }>(
  category: SmallCategory<O, A>,
  arrow: A,
): CategoryPropertyCheck<undefined> => {
  const id = category.id(category.src(arrow));
  const holds = Object.is(arrow, id);
  return {
    holds,
    details: holds
      ? `${String((arrow as unknown as Arrow).name)} is identity`
      : `${String((arrow as unknown as Arrow).name)} is not identity`,
  };
};

const terminalObjectCheck = <O, A>(
  _category: SmallCategory<O, A>,
  object: O,
): CategoryPropertyCheck<undefined> => ({
  holds: Object.is(object, "C" as O),
  details: Object.is(object, "C" as O)
    ? "object is terminal"
    : "object fails terminal property",
});

describe("analyzeFunctorImage", () => {
  it("detects closure for a valid functor", () => {
    const functor = makeIdentityFunctor();
    const analysis = analyzeFunctorImage(functor.witness);
    expect(analysis.closureHolds).toBe(true);
    expect(analysis.identityFailures).toHaveLength(0);
    expect(analysis.compositionFailures).toHaveLength(0);
    expect(analysis.endpointFailures).toHaveLength(0);
    expect(analysis.objectImages).toContain(functor.functor.F0("A"));
  });

  it("records identity failures when the image misses identities", () => {
    const functor = makeIdentityFailureFunctor();
    const analysis = analyzeFunctorImage(functor.witness);
    expect(analysis.closureHolds).toBe(false);
    expect(analysis.identityFailures).not.toHaveLength(0);
  });

  it("records composition failures when composites disagree", () => {
    const functor = makeCompositionFailureFunctor();
    const analysis = analyzeFunctorImage(functor.witness);
    expect(analysis.closureHolds).toBe(false);
    expect(analysis.compositionFailures).not.toHaveLength(0);
  });
});

describe("imageSubcategoryFactorization", () => {
  it("produces a wide subcategory and commuting factorization", () => {
    const functor = makeIdentityFunctor();
    const factorization = imageSubcategoryFactorization(functor);
    expect(factorization.analysis.closureHolds).toBe(true);
    expect(factorization.imageSubcategory).toBeDefined();
    expect(factorization.inclusion).toBeDefined();
    expect(factorization.factorization).toBeDefined();
    expect(factorization.comparison?.holds).toBe(true);
    expect(factorization.details).not.toHaveLength(0);
  });

  it("fails early when closure diagnostics detect problems", () => {
    const functor = makeIdentityFailureFunctor();
    const factorization = imageSubcategoryFactorization(functor);
    expect(factorization.imageSubcategory).toBeUndefined();
    expect(factorization.reason).toBe("image closure failed");
  });
});

describe("functor property oracles", () => {
  const identityOracle = makeArrowPropertyOracle({
    property: "identity arrow",
    mode: "both",
    sourceEvaluate: identityArrowCheck,
    targetEvaluate: identityArrowCheck,
    details: ["Identity arrows should be preserved and reflected."],
  });

  const terminalOracle = makeTerminalObjectOracle(
    terminalObjectCheck,
    terminalObjectCheck,
    "both",
    ["Terminal objects should be preserved and reflected."],
  );

  it("confirms preservation and reflection for the identity functor", () => {
    const functor = makeIdentityFunctor();
    const identityAnalysis = evaluateFunctorProperty(functor, identityOracle);
    const terminalAnalysis = evaluateFunctorProperty(functor, terminalOracle);
    expect(identityAnalysis.holds).toBe(true);
    expect(identityAnalysis.preservationFailures).toHaveLength(0);
    expect(identityAnalysis.reflectionFailures).toHaveLength(0);
    expect(terminalAnalysis.holds).toBe(true);
  });

  it("detects reflection failures when the image collapses arrows", () => {
    const functor = makeCollapsingFunctor();
    const identityAnalysis = evaluateFunctorProperty(functor, identityOracle);
    expect(identityAnalysis.holds).toBe(false);
    expect(identityAnalysis.reflectionFailures).not.toHaveLength(0);
    expect(identityAnalysis.preservationFailures).toHaveLength(0);
  });

  it("automatically attaches isomorphism preservation analysis", () => {
    const functor = makeIdentityFunctor();
    expect(functor.properties).toBeDefined();
    const isomorphism = functor.properties?.find(
      (analysis) => analysis.property === "isomorphism",
    );
    expect(isomorphism).toBeDefined();
    expect(isomorphism?.holds).toBe(true);
    expect(isomorphism?.details.join(" ")).toMatch(/isomorphism/i);
  });

  it("merges additional property analyses with the automatic metadata", () => {
    const functor = makeIdentityFunctor();
    const initialCount = functor.properties?.length ?? 0;
    const enriched = attachFunctorProperties(functor, [identityOracle]);
    expect(enriched.properties).toBeDefined();
    expect(enriched.properties?.length).toBe(initialCount + 1);
    const custom = enriched.properties?.find(
      (analysis) => analysis.property === "identity arrow",
    ) as
      | FunctorPropertyAnalysis<Obj, Arrow, Obj, Arrow, "arrow", undefined, undefined>
      | undefined;
    expect(custom).toBeDefined();
    expect(custom?.holds).toBe(true);
  });
});
