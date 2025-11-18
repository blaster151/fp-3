import { describe, expect, it } from "vitest";

import {
  checkAssociativeBinaryDegeneracy,
  analyzeExample9FreeSemigroupDegeneracy,
  makeExample6MonadComonadInteractionLaw,
  makeExample7MonadComonadInteractionLaw,
  makeExample8MonadComonadInteractionLaw,
  makeMonadComonadInteractionLaw,
  deriveGreatestInteractingComonadForMonadComonadLaw,
  deriveGreatestInteractingFunctorForMonadComonadLaw,
  interactionLawFromDualMap,
  interactionLawMonoidToMonadComonadLaw,
  interactionLawToMonoidObject,
  interactionLawMonoidToSweedlerDual,
  sweedlerDualOfFreeMonoid,
  interactionLawToDualMap,
  verifySweedlerDualFactorization,
  nonemptyListFreeMonad,
  nonemptyListQuotient,
  type Example14CofreeElement,
  sweedlerDualNonemptyList,
  nonemptyListSweedlerQuotientEqualizer,
  type Example14FreeTerm,
  type Example14ListOfLists,
  type Example14NestedTerm,
  type Example14NonemptyList,
  type Example14Symbol,
  type ComonadStructure,
  type MonadComonadInteractionLaw,
  type MonadStructure,
  stretchMonadComonadInteractionLaw,
  tensorMonadComonadInteractionLaws,
  composeMonadComonadInteractionLaws,
  monadComonadInteractionLawToMonoid,
  makeFreeMonadComonadInteractionLaw,
  deriveInitialMonadSliceObject,
  deriveFinalComonadSliceObject,
  type FreeMonadComonadCoproductWitness,
  type FreeMonadComonadInteractionLawResult,
  type FreeMonadComonadUniversalComparison,
  type FreeMonadComonadUniversalComparisons,
  deriveNonemptyListCoequation,
  checkRectangularityFromCoequation,
  deriveMonadComonadRunnerTranslation,
} from "../monad-comonad-interaction-law";
import {
  makeFunctorInteractionLaw,
  makeFunctorInteractionLawOperations,
  type FunctorInteractionLawContribution,
  checkInteractionLawDayMonoidal,
  checkInteractionLawDaySymmetry,
  checkInteractionLawDayInterchange,
  summarizeInteractionLawDayUnit,
  summarizeInteractionLawDayUnitTensor,
  summarizeInteractionLawDayUnitOpmonoidal,
  summarizeInteractionLawDayUnitOpmonoidalTriangles,
  checkInteractionLawDayUnitOpmonoidalTriangles,
  summarizeInteractionLawDayInterchange,
  instantiateInteractionLawDayInterchangeFromReport,
  verifyInteractionLawDayInterchangeInstantiationFromReport,
  deriveInteractionLawCurrying,
  deriveInteractionLawLeftCommaPresentation,
  deriveInteractionLawSweedlerSummary,
  deriveInteractionLawLeftCommaEquivalence,
  dualInteractionLaw,
} from "../functor-interaction-law";
import { analyzeFunctorOperationDegeneracy } from "../functor-interaction-law-degeneracy";
import { dayTensor } from "../day-convolution";
import {
  contravariantRepresentableFunctorWithWitness,
  covariantRepresentableFunctorWithWitness,
} from "../functor-representable";
import { constructFunctorWithWitness, type FunctorWithWitness } from "../functor";
import {
  constructNaturalTransformationWithWitness,
  identityNaturalTransformation,
} from "../natural-transformation";
import { SetCat, getCarrierSemantics, type SetHom, type SetObj } from "../set-cat";
import { setSimpleCategory } from "../set-simple-category";
import { makeTwoObjectPromonoidalKernel } from "../promonoidal-structure";
import { TwoObjectCategory, type TwoArrow, type TwoObject } from "../two-object-cat";
import {
  checkFreeInteractionLaw,
  checkMonadComonadInteractionLaw,
  checkNonemptyListQuotient,
  checkNonemptyListSweedler,
} from "../oracles";
import {
  makeExample13ResidualInteractionLaw,
  makeResidualMonadComonadInteractionLaw,
} from "../residual-interaction-law";

const toUnknownSetHom = <Dom, Cod>(hom: SetHom<Dom, Cod>): SetHom<unknown, unknown> =>
  hom as unknown as SetHom<unknown, unknown>;

type BooleanContribution = FunctorInteractionLawContribution<
  TwoObject,
  TwoArrow,
  unknown,
  unknown,
  boolean
>;

const enumerate = <T>(carrier: SetObj<T>): ReadonlyArray<T> => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.iterate) {
    return Array.from(semantics.iterate());
  }
  return Array.from(carrier as Iterable<T>);
};

const buildBooleanLaw = () => {
  const kernel = makeTwoObjectPromonoidalKernel();
  const leftToolkit = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const rightToolkit = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const left = leftToolkit.functor;
  const right = rightToolkit.functor;
  const convolution = dayTensor(kernel, left, right);
  const dualizing = SetCat.obj([false, true], { tag: "Bool" });
  const operations = makeFunctorInteractionLawOperations<TwoObject, TwoArrow>({
    metadata: ["MonadComonadSpec"],
    monadOperations: [],
  });

  const pairing = (
    _object: TwoObject,
    carrier: ReturnType<typeof convolution.functor.functor.F0>,
  ) =>
    SetCat.hom(carrier, dualizing, (cls) => cls.witness.kernelLeft === cls.witness.kernelRight);

  return makeFunctorInteractionLaw({
    kernel,
    left,
    right,
    convolution,
    dualizing,
    pairing,
    aggregate: (contributions: ReadonlyArray<BooleanContribution>) =>
      contributions.some((entry) => entry.evaluation),
    operations,
  });
};

const buildIdentityMonad = (): MonadStructure<TwoObject, TwoArrow> => {
  const carriers = new Map<TwoObject, SetObj<TwoObject>>();
  const carrierFor = (object: TwoObject): SetObj<TwoObject> => {
    const existing = carriers.get(object);
    if (existing) return existing;
    const carrier = SetCat.obj([object], { tag: `IdentityCarrier(${object})` });
    carriers.set(object, carrier);
    return carrier;
  };

  const functor = constructFunctorWithWitness<
    TwoObject,
    TwoArrow,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >(
    TwoObjectCategory,
    setSimpleCategory,
    {
      F0: (object) => carrierFor(object) as unknown as SetObj<unknown>,
      F1: (arrow: TwoArrow) =>
        toUnknownSetHom(
          SetCat.hom(
            carrierFor(TwoObjectCategory.src(arrow)),
            carrierFor(TwoObjectCategory.dst(arrow)),
            () => TwoObjectCategory.dst(arrow),
          ),
        ),
    },
    { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
  );
  const unit = identityNaturalTransformation(functor, {
    metadata: ["Identity monad unit"],
    samples: { objects: TwoObjectCategory.objects },
  });
  const multiplication = identityNaturalTransformation(functor, {
    metadata: ["Identity monad multiplication"],
    samples: { objects: TwoObjectCategory.objects },
  });
  return {
    functor,
    unit,
    multiplication,
    metadata: ["Identity monad"],
  };
};

const buildIdentityComonad = (): ComonadStructure<TwoObject, TwoArrow> => {
  const carriers = new Map<TwoObject, SetObj<TwoObject>>();
  const carrierFor = (object: TwoObject): SetObj<TwoObject> => {
    const existing = carriers.get(object);
    if (existing) return existing;
    const carrier = SetCat.obj([object], { tag: `IdentityCarrier(${object})` });
    carriers.set(object, carrier);
    return carrier;
  };

  const functor = constructFunctorWithWitness<
    TwoObject,
    TwoArrow,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >(
    TwoObjectCategory,
    setSimpleCategory,
    {
      F0: (object) => carrierFor(object) as unknown as SetObj<unknown>,
      F1: (arrow: TwoArrow) =>
        toUnknownSetHom(
          SetCat.hom(
            carrierFor(TwoObjectCategory.src(arrow)),
            carrierFor(TwoObjectCategory.dst(arrow)),
            () => TwoObjectCategory.dst(arrow),
          ),
        ),
    },
    { objects: TwoObjectCategory.objects, arrows: TwoObjectCategory.arrows },
  );
  const counit = identityNaturalTransformation(functor, {
    metadata: ["Identity comonad counit"],
    samples: { objects: TwoObjectCategory.objects },
  });
  const comultiplication = identityNaturalTransformation(functor, {
    metadata: ["Identity comonad comultiplication"],
    samples: { objects: TwoObjectCategory.objects },
  });
  return {
    functor,
    counit,
    comultiplication,
    metadata: ["Identity comonad"],
  };
};

describe("makeMonadComonadInteractionLaw", () => {
  it("packages monad/comonad data with cached ψ diagnostics", () => {
    const law = buildBooleanLaw();
    const monad = buildIdentityMonad();
    const comonad = buildIdentityComonad();

    const currying = deriveInteractionLawCurrying(law);
    const commaPresentation = deriveInteractionLawLeftCommaPresentation(law);
    const commaEquivalence = deriveInteractionLawLeftCommaEquivalence(law);
    const sweedler = deriveInteractionLawSweedlerSummary(law, {
      currying,
      comma: commaEquivalence,
    });
    const degeneracy = analyzeFunctorOperationDegeneracy(law);
    const dayMonoidal = checkInteractionLawDayMonoidal(law);
    const dual = dualInteractionLaw(law);
    const daySymmetry = checkInteractionLawDaySymmetry(dual.law, law);
    const dayUnit = summarizeInteractionLawDayUnit(law);
    const dayUnitTensor = summarizeInteractionLawDayUnitTensor(law, { unit: dayUnit });
    const dayUnitOpmonoidal = summarizeInteractionLawDayUnitOpmonoidal(law, {
      unit: dayUnit,
      tensor: dayUnitTensor,
    });
    const dayUnitOpmonoidalTriangles =
      summarizeInteractionLawDayUnitOpmonoidalTriangles(law, {
        unit: dayUnit,
        tensor: dayUnitTensor,
        opmonoidal: dayUnitOpmonoidal,
      });
    const dayUnitOpmonoidalTrianglesCheck =
      checkInteractionLawDayUnitOpmonoidalTriangles(law, {
        summary: dayUnitOpmonoidalTriangles,
        metadata: ["Example6DayUnitOpmonoidalTrianglesCheck"],
      });
    const dayInterchange = summarizeInteractionLawDayInterchange(law);
    const dayInterchangeInstantiation =
      instantiateInteractionLawDayInterchangeFromReport(law, dayInterchange);
    const dayInterchangeInstantiationCheck =
      verifyInteractionLawDayInterchangeInstantiationFromReport(
        law,
        dayInterchangeInstantiation,
      );
    const dayInterchangeCheck = checkInteractionLawDayInterchange(law, {
      report: dayInterchange,
      instantiation: dayInterchangeInstantiation,
      verification: dayInterchangeInstantiationCheck,
    });

    expect(dayInterchange.holds).toBe(true);
    expect(dayInterchange.summary.details.length).toBeGreaterThan(0);
    expect(dayInterchangeInstantiation.holds).toBe(true);
    expect(dayInterchangeInstantiation.details.length).toBe(
      dayInterchange.summary.details.length,
    );
    expect(dayInterchangeInstantiationCheck.holds).toBe(true);
    expect(dayInterchangeInstantiationCheck.details.length).toBe(
      dayInterchangeInstantiation.details.length,
    );
    expect(dayInterchangeCheck.holds).toBe(true);
    expect(dayInterchangeCheck.report).toBe(dayInterchange);
    expect(dayInterchangeCheck.instantiation).toBe(
      dayInterchangeInstantiation,
    );
    expect(dayInterchangeCheck.verification).toBe(
      dayInterchangeInstantiationCheck,
    );
    for (const detail of dayInterchangeInstantiation.details) {
      expect(detail.holds).toBe(true);
      expect(detail.operation).toBeDefined();
    }
    for (const detail of dayInterchange.summary.details) {
      expect(detail.fiberAvailable).toBe(true);
      expect(detail.pairingAvailable).toBe(true);
      expect(detail.sampleEmpty).toBe(false);
      expect(detail.checkedPairs).toBeGreaterThan(0);
      expect(detail.missingPairs).toBe(0);
      expect(detail.contributionCount).toBeGreaterThan(0);
      expect(detail.canonicalContributionCount).toBeGreaterThan(0);
      expect(detail.canonicalSatisfied).toBe(true);
      expect(detail.canonicalSample).toBeDefined();
      expect(detail.canonicalSample?.contributions.length).toBeGreaterThan(0);
      expect(detail.canonicalSample?.diagnostics.length).toBeGreaterThan(0);
      expect(detail.samples.length).toBeGreaterThan(0);
      expect(
        detail.samples.some((sample) => sample.contributions.length > 0),
      ).toBe(true);
      for (const sample of detail.samples) {
        expect(sample.diagnostics.length).toBeGreaterThan(0);
      }
    }
    expect(dayInterchange.diagnostics[0]).toContain("DayInterchange.overall");

    const packaged = makeMonadComonadInteractionLaw({
      monad,
      comonad,
      law,
      metadata: ["Packaged"],
      options: {
        currying,
        comma: commaPresentation,
        commaEquivalence,
        sweedler,
        degeneracy,
        dayMonoidal,
        daySymmetry,
        dayUnit,
        dayInterchange,
        dayInterchangeInstantiation,
        dayInterchangeCheck,
        dual,
        dayUnitOpmonoidal,
        dayUnitOpmonoidalTriangles,
        dayUnitOpmonoidalTrianglesCheck,
        metadata: ["Options"],
      },
    });

    expect(packaged.currying).toBe(currying);
    expect(packaged.comma).toBe(commaPresentation);
    expect(packaged.commaEquivalence).toBe(commaEquivalence);
    expect(packaged.sweedler).toBe(sweedler);
    expect(packaged.degeneracy).toBe(degeneracy);
    expect(packaged.psiComponents).toBe(currying.fibers);
    expect(packaged.monad).toBe(monad);
    expect(packaged.comonad).toBe(comonad);
    expect(packaged.dayMonoidal).toBe(dayMonoidal);
    expect(packaged.daySymmetry).toBe(daySymmetry);
    expect(packaged.dayUnit).toBe(dayUnit);
    expect(packaged.dayUnitTensor).toBe(dayUnitTensor);
    expect(packaged.dayUnitOpmonoidal).toBe(dayUnitOpmonoidal);
    expect(packaged.dayUnitOpmonoidalTriangles).toBe(
      dayUnitOpmonoidalTriangles,
    );
    expect(packaged.dayUnitOpmonoidalTrianglesCheck).toBe(
      dayUnitOpmonoidalTrianglesCheck,
    );
    expect(packaged.dayInterchange).toBe(dayInterchange);
    expect(packaged.dayInterchangeInstantiation).toBe(
      dayInterchangeInstantiation,
    );
    expect(packaged.dayInterchangeInstantiationCheck).toBe(
      dayInterchangeInstantiationCheck,
    );
    expect(packaged.dayInterchangeCheck).toBe(dayInterchangeCheck);
    expect(packaged.dual).toBe(dual);

    expect(packaged.metadata).toEqual([
      "Identity monad",
      "Identity comonad",
      "Packaged",
      "Options",
    ]);

    expect(packaged.diagnostics).toEqual([
      "makeMonadComonadInteractionLaw: reused supplied currying summary.",
      "makeMonadComonadInteractionLaw: reused supplied comma presentation.",
      "makeMonadComonadInteractionLaw: reused supplied Sweedler summary.",
      "makeMonadComonadInteractionLaw: reused supplied degeneracy analysis.",
      "makeMonadComonadInteractionLaw: reused supplied Day monoidal summary.",
      "makeMonadComonadInteractionLaw: reused supplied Day symmetry summary.",
      "makeMonadComonadInteractionLaw: reused supplied Day unit summary.",
      "makeMonadComonadInteractionLaw: reused supplied Day unit tensor summary.",
      "makeMonadComonadInteractionLaw: reused supplied Day unit opmonoidal summary.",
      "makeMonadComonadInteractionLaw: reused supplied Day unit opmonoidal triangle summary.",
      "makeMonadComonadInteractionLaw: reused supplied Day unit opmonoidal triangle check.",
      "makeMonadComonadInteractionLaw: reused supplied Day interchange coverage summary.",
      "makeMonadComonadInteractionLaw: reused supplied Day interchange instantiation summary.",
      "makeMonadComonadInteractionLaw: reused supplied Day interchange instantiation check.",
      "makeMonadComonadInteractionLaw: reused supplied Day interchange check report.",
      "makeMonadComonadInteractionLaw: reused supplied dual interaction law summary.",
      "makeMonadComonadInteractionLaw: reused supplied comma equivalence diagnostics.",
    ]);
  });

  it("derives caches when none are supplied", () => {
    const law = buildBooleanLaw();
    const monad = buildIdentityMonad();
    const comonad = buildIdentityComonad();

    const packaged = makeMonadComonadInteractionLaw({
      monad,
      comonad,
      law,
    });

    expect(packaged.currying.law).toBe(law);
    expect(packaged.psiComponents.size).toBeGreaterThan(0);
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived currying summary from interaction law.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived Day monoidal summary from interaction law.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived Day symmetry summary from interaction law.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived Day unit summary from promonoidal kernel.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived Day unit tensor summary for opmonoidal diagnostics.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived Day unit opmonoidal summary from Day unit tensor coverage.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived Day unit opmonoidal triangle summary from cached coverage.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived Day unit opmonoidal triangle check from cached coverage.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived Day interchange coverage summary from interaction law.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived Day interchange instantiation summary from interaction law.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: verified Day interchange instantiations against aggregated evaluations.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: assembled Day interchange summary, instantiation, and verification into a consolidated check.",
    );
    expect(packaged.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: derived dual interaction law summary from interaction law.",
    );
    expect(packaged.dayMonoidal.holds).toBe(true);
    expect(packaged.daySymmetry.holds).toBe(true);
    expect(packaged.dayInterchange.holds).toBe(true);
    expect(packaged.dayInterchangeInstantiation.holds).toBe(true);
    expect(packaged.dayInterchangeInstantiationCheck.holds).toBe(true);
    expect(packaged.dayInterchangeCheck.holds).toBe(true);
    expect(packaged.dual.law.kernel).toBe(law.kernel);
    expect(packaged.metadata).toEqual([
      "Identity monad",
      "Identity comonad",
    ]);
  });

  it("checks Day symmetry witnesses for the boolean law", () => {
    const law = buildBooleanLaw();
    const dual = dualInteractionLaw(law);

    const symmetry = checkInteractionLawDaySymmetry(dual.law, law);

    expect(symmetry.holds).toBe(true);
    expect(symmetry.diagnostics[0]).toContain("DayMonoidal.symmetry");
    expect(symmetry.pairingTraces.length).toBeGreaterThan(0);
  });
});

describe("monadComonadInteractionLawToMonoid", () => {
  it("packages an interaction law as a monoid object and rebuilds it", () => {
    const law = buildBooleanLaw();
    const monad = buildIdentityMonad();
    const comonad = buildIdentityComonad();
    const packaged = makeMonadComonadInteractionLaw({ monad, comonad, law });

    const monoid = monadComonadInteractionLawToMonoid(packaged, {
      sampleLimit: 4,
      metadata: ["Monoid packaging"],
    });

    expect(monoid.law).toBe(law);
    expect(monoid.currying).toBe(packaged.currying);
    expect(monoid.comma).toBe(packaged.comma);
    expect(monoid.multiplication.components.size).toBeGreaterThan(0);
    expect(monoid.unit.components.size).toBeGreaterThan(0);
    expect(monoid.monoidPreparation).toBeDefined();
    expect(monoid.monoidMultiplicationTranslator).toBeDefined();
    expect(monoid.monoidMultiplicationRealization).toBeDefined();
    expect(monoid.monoidMultiplicationTranslator?.preparation).toBe(
      monoid.monoidPreparation,
    );
    expect(
      monoid.monoidMultiplicationRealization?.translator,
    ).toBe(monoid.monoidMultiplicationTranslator);
    expect(monoid.monoidPsi).toBeDefined();
    expect(monoid.monoidPsi?.translator).toBe(monoid.monoidMultiplicationTranslator);
    expect(monoid.monoidPsi?.realization).toBe(monoid.monoidMultiplicationRealization);
    expect(monoid.monoidPsi?.checked).toBeGreaterThan(0);
    expect(monoid.monoidPsi?.translatorMismatches).toBe(0);
    expect(monoid.monoidPsi?.realizationMismatches).toBe(0);
    expect(monoid.monoidPsi?.lawMismatches).toBe(0);
    for (const component of monoid.multiplication.components.values()) {
      expect(component.checked).toBeGreaterThan(0);
      expect(component.mismatches).toBe(0);
      expect(component.failures).toHaveLength(0);
    }
    for (const component of monoid.unit.components.values()) {
      expect(component.checked).toBeGreaterThan(0);
      expect(component.mismatches).toBe(0);
      expect(component.failures).toHaveLength(0);
    }
    expect(monoid.diagnostics[0]).toContain(
      "monadComonadLawToInteractionLawMonoid: constructed interaction-law monoid",
    );
    expect(monoid.diagnostics).toEqual(
      expect.arrayContaining([
        "monadComonadLawToInteractionLawMonoid: derived monoid preparation summary for canonical Day witnesses.",
        "monadComonadLawToInteractionLawMonoid: derived canonical monoid multiplication translator from interaction law.",
        "monadComonadLawToInteractionLawMonoid: realized canonical monoid multiplication evaluations from translator components.",
        "monadComonadLawToInteractionLawMonoid: reconstructed ψ from canonical monoid translator and realization.",
      ]),
    );

    const rebuilt = interactionLawMonoidToMonadComonadLaw({
      monoid,
      monad,
      comonad,
      metadata: ["Round-trip"],
    });

    expect(rebuilt.law).toBe(law);
    expect(rebuilt.currying).toBe(packaged.currying);
    expect(rebuilt.comma).toBe(packaged.comma);
    expect(rebuilt.metadata).toEqual(
      expect.arrayContaining([
        "Identity monad",
        "Identity comonad",
        "Monoid packaging",
        "Round-trip",
      ]),
    );
    expect(rebuilt.diagnostics).toContain(
      "makeMonadComonadInteractionLaw: reused supplied currying summary.",
    );
  });
});

describe("interactionLawToMonoidObject", () => {
  it("wraps the monoid translator with canonical Day diagnostics", () => {
    const law = buildBooleanLaw();
    const monad = buildIdentityMonad();
    const comonad = buildIdentityComonad();
    const packaged = makeMonadComonadInteractionLaw({ monad, comonad, law });

    const monoid = interactionLawToMonoidObject(packaged, {
      sampleLimit: 5,
      metadata: ["Translator wrapper"],
    });

    expect(monoid.law).toBe(law);
    expect(monoid.currying).toBe(packaged.currying);
    expect(monoid.comma).toBe(packaged.comma);
    expect(monoid.diagnostics[0]).toContain("interactionLawToMonoidObject");
    expect(monoid.diagnostics.slice(1)).toEqual(
      expect.arrayContaining([
        "monadComonadLawToInteractionLawMonoid: constructed interaction-law monoid with sample limit 5.",
      ]),
    );
    expect(monoid.metadata).toEqual(
      expect.arrayContaining([
        "Identity monad",
        "Identity comonad",
        "Translator wrapper",
      ]),
    );
    expect(monoid.multiplication.components.size).toBeGreaterThan(0);
    expect(monoid.unit.components.size).toBeGreaterThan(0);
  });
});

describe("interactionLawMonoidToSweedlerDual", () => {
  it("derives the Sweedler dual functor metadata and opmonoidal summaries", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const monoid = interactionLawToMonoidObject(packaged);

    const sweedlerDual = interactionLawMonoidToSweedlerDual(monoid);

    expect(sweedlerDual.monoid).toBe(monoid);
    expect(sweedlerDual.sweedler.law).toBe(monoid.law);
    expect(sweedlerDual.triangles.law).toBe(monoid.law);
    expect(sweedlerDual.trianglesCheck.summary).toBe(sweedlerDual.triangles);
    expect(sweedlerDual.triangles.laxComparisonAvailable).toBe(false);
    expect(sweedlerDual.greatest.sweedler).toBe(sweedlerDual.sweedler);
    expect(sweedlerDual.metadata).toEqual(
      expect.arrayContaining(["Interaction-law monoid Sweedler dual functor"]),
    );
    expect(sweedlerDual.diagnostics).toEqual(
      expect.arrayContaining([
        "Sweedler dual functor: derived Sweedler summary from interaction law for (-)^°.",
        "Sweedler dual functor: derived opmonoidal triangle summary from ψ to expose diagram (8) witnesses.",
        "Sweedler dual functor: triangles confirm J lacks a lax comparison, so (-)^° is logged as only lax monoidal.",
      ]),
    );
  });

  it("reuses supplied Sweedler summaries and triangle checks", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const monoid = interactionLawToMonoidObject(packaged);
    const sweedler = monoid.sweedler ?? deriveInteractionLawSweedlerSummary(monoid.law);
    const triangles = summarizeInteractionLawDayUnitOpmonoidalTriangles(monoid.law);
    const trianglesCheck = checkInteractionLawDayUnitOpmonoidalTriangles(monoid.law, {
      summary: triangles,
      metadata: ["Precomputed triangle check"],
    });
    const greatest = deriveGreatestInteractingComonadForMonadComonadLaw(packaged).greatest;

    const sweedlerDual = interactionLawMonoidToSweedlerDual(monoid, {
      sweedler,
      dayUnitOpmonoidalTriangles: triangles,
      dayUnitOpmonoidalTrianglesCheck: trianglesCheck,
      greatest,
      metadata: ["Reused Sweedler dual"],
    });

    expect(sweedlerDual.sweedler).toBe(sweedler);
    expect(sweedlerDual.triangles).toBe(triangles);
    expect(sweedlerDual.trianglesCheck).toBe(trianglesCheck);
    expect(sweedlerDual.greatest).toBe(greatest);
    expect(sweedlerDual.diagnostics).toEqual(
      expect.arrayContaining([
        "Sweedler dual functor: reused Sweedler summary supplied via options.",
        "Sweedler dual functor: reused opmonoidal triangle summary supplied via options.",
        "Sweedler dual functor: reused cached opmonoidal triangle check supplied via options.",
        "Sweedler dual functor: reused greatest interacting comonad witness supplied via options.",
      ]),
    );
    expect(sweedlerDual.metadata).toEqual(
      expect.arrayContaining(["Reused Sweedler dual", "Interaction-law monoid Sweedler dual functor"]),
    );
  });
});

describe("checkMonadComonadInteractionLaw", () => {
  it("confirms Example 6 satisfies the ψ coherence diagrams", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const report = checkMonadComonadInteractionLaw(packaged);
    expect(report.holds).toBe(true);
    expect(report.unit.holds).toBe(true);
    expect(report.counit.holds).toBe(true);
    expect(report.multiplication.holds).toBe(true);
    expect(report.mixedAssociativity.holds).toBe(true);
    expect(report.dayMonoidal).toBe(packaged.dayMonoidal);
    expect(report.daySymmetry).toBe(packaged.daySymmetry);
    expect(report.daySymmetry.holds).toBe(true);
    expect(report.dayInterchange).toBe(packaged.dayInterchange);
    expect(report.dayInterchange.holds).toBe(true);
    expect(report.dayInterchangeInstantiation).toBe(
      packaged.dayInterchangeInstantiation,
    );
    expect(report.dayInterchangeInstantiation.holds).toBe(true);
    expect(report.dayInterchangeInstantiationCheck).toBe(
      packaged.dayInterchangeInstantiationCheck,
    );
    expect(report.dayInterchangeInstantiationCheck.holds).toBe(true);
    expect(report.dayInterchangeCheck).toBe(packaged.dayInterchangeCheck);
    expect(report.dayInterchangeCheck.holds).toBe(true);
    expect(report.dayUnitOpmonoidal).toBe(packaged.dayUnitOpmonoidal);
    expect(report.dayUnitOpmonoidal.satisfied).toBeGreaterThan(0);
    expect(report.dayUnitOpmonoidalTriangles).toBe(
      packaged.dayUnitOpmonoidalTriangles,
    );
    expect(report.dayUnitOpmonoidalTriangles.satisfied).toBeGreaterThan(0);
    expect(report.dayUnitOpmonoidalTrianglesCheck).toBe(
      packaged.dayUnitOpmonoidalTrianglesCheck,
    );
    expect(report.dayUnitOpmonoidalTrianglesCheck.holds).toBe(false);
  });

  it("verifies the Example 6 Day tensor satisfies unit and associativity", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const summary = checkInteractionLawDayMonoidal(packaged.law);

    expect(summary.holds).toBe(true);
    expect(summary.unitComparisons.left.matches).toBe(true);
    expect(summary.unitComparisons.right.matches).toBe(true);
    expect(summary.associativity.matches).toBe(true);
    expect(summary.pairingTraces.leftUnit.length).toBeGreaterThan(0);
    expect(summary.pairingTraces.rightUnit.length).toBeGreaterThan(0);
    expect(summary.pairingTraces.associativity.length).toBeGreaterThan(0);
    expect(summary.diagnostics).toEqual(
      expect.arrayContaining([
        expect.stringContaining("DayMonoidal.leftUnit: holds"),
        expect.stringContaining("DayMonoidal.rightUnit: holds"),
        expect.stringContaining("DayMonoidal.associativity: holds"),
        expect.stringContaining("DayMonoidal.leftUnit: pair"),
      ]),
    );
  });

  it("confirms Example 7 writer/comonad interaction obeys ψ coherence", () => {
    const packaged = makeExample7MonadComonadInteractionLaw();
    const report = checkMonadComonadInteractionLaw(packaged);
    expect(report.holds).toBe(true);
    expect(report.unit.holds).toBe(true);
    expect(report.counit.holds).toBe(true);
    expect(report.multiplication.holds).toBe(true);
    expect(report.mixedAssociativity.holds).toBe(true);
  });

  it("confirms Example 8 update interaction obeys ψ coherence", () => {
    const packaged = makeExample8MonadComonadInteractionLaw();
    const report = checkMonadComonadInteractionLaw(packaged);
    expect(report.holds).toBe(true);
    expect(report.unit.holds).toBe(true);
    expect(report.counit.holds).toBe(true);
    expect(report.multiplication.holds).toBe(true);
    expect(report.mixedAssociativity.holds).toBe(true);
  });

  it("detects Example 9 free semigroup degeneracy", () => {
    const { law, report } = analyzeExample9FreeSemigroupDegeneracy();
    expect(report.commutativeBinary.holds).toBe(true);
    expect(report.commutativeBinary.witnesses).toHaveLength(1);
    const trace = report.commutativeBinary.traces[0];
    expect(trace?.steps.some((step) => step.label === "construct-hY")).toBe(true);
    expect(report.commutativeBinary.zeroComparisons.length).toBeGreaterThan(0);
    expect(report.finalLaw).toBeDefined();
    expect(report.metadata).toContain("Example9 free semigroup operations");
    const firstZero = report.commutativeBinary.zeroComparisons[0];
    expect(firstZero?.zero).toBe(SetCat.initial().object);
    const samplePrimal = Array.from(law.primalCarrier)[0]!;
    const sampleDual = Array.from(law.dualCarrier)[0]!;
    expect(typeof law.evaluate(samplePrimal, sampleDual)).toBe("boolean");
  });

  it("records associative degeneracy witnesses for Example 7", () => {
    const packaged = makeExample7MonadComonadInteractionLaw();
    const report = checkAssociativeBinaryDegeneracy(packaged);
    expect(report.witnesses.length).toBeGreaterThan(0);
    const witness = report.witnesses[0]!;
    expect(witness.operationLabel).toBe("example7-multiply");
    expect(witness.injections).toBeDefined();
    expect(witness.theta).toBeDefined();
    expect(witness.details.length).toBeGreaterThan(0);
    expect(report.details.some((detail) => detail.includes("Theorem 3"))).toBe(true);
  });

  it("summarizes residual interaction laws when provided", () => {
    const interaction = makeExample6MonadComonadInteractionLaw();
    const residual = makeExample13ResidualInteractionLaw();
    const report = checkMonadComonadInteractionLaw(interaction, {
      residual,
      residualCheck: true,
    });
    const residualReport = report.residual;
    expect(residualReport).toBeDefined();
    expect(residualReport?.aggregate.residualMonadName).toBe("ExceptionsResidual");
    expect(
      residualReport?.diagnostics.some((line) =>
        line.includes("residual summary supplied via options"),
      ),
    ).toBe(true);
    expect(residualReport?.check?.holds).toBe(true);
  });

  it("reuses packaged residual aggregates and checks", () => {
    const interaction = makeExample6MonadComonadInteractionLaw();
    const residual = makeExample13ResidualInteractionLaw();
    const packagedResidual = makeResidualMonadComonadInteractionLaw(interaction, residual, {
      check: true,
    });
    const report = checkMonadComonadInteractionLaw(interaction, {
      residual: packagedResidual,
    });
    const residualReport = report.residual;
    expect(residualReport).toBeDefined();
    expect(residualReport?.aggregate).toBe(packagedResidual.aggregate);
    expect(residualReport?.check).toBe(packagedResidual.residualCheck);
    expect(
      residualReport?.diagnostics.some((line) =>
        line.includes("reusing packaged residual monad/comonad interaction aggregate"),
      ),
    ).toBe(true);
    expect(
      residualReport?.diagnostics.some((line) =>
        line.includes("retained packaged residual law check"),
      ),
    ).toBe(true);
  });
});

describe("nonemptyListFreeMonad", () => {
  it("provides the free monad with substitution flattening", () => {
    const data = nonemptyListFreeMonad();
    const unit = data.monad.unit.transformation.component("•") as SetHom<
      Example14Symbol,
      Example14FreeTerm
    >;
    expect(unit.map("x0")).toEqual({ tag: "var", value: "x0" });

    const nested: Example14NestedTerm = {
      tag: "node",
      left: { tag: "var", value: { tag: "var", value: "x0" } },
      right: { tag: "var", value: { tag: "var", value: "x1" } },
    };

    const multiplication = data.monad.multiplication.transformation.component("•") as SetHom<
      Example14NestedTerm,
      Example14FreeTerm
    >;
    expect(multiplication.map(nested)).toEqual({
      tag: "node",
      left: { tag: "var", value: "x0" },
      right: { tag: "var", value: "x1" },
    });
  });
});

describe("nonemptyListQuotient", () => {
  it("flattens free terms into nonempty lists", () => {
    const data = nonemptyListQuotient();
    const quotient = data.quotient.transformation.component("•") as SetHom<
      Example14FreeTerm,
      Example14NonemptyList
    >;

    const term: Example14FreeTerm = {
      tag: "node",
      left: { tag: "var", value: "x0" },
      right: {
        tag: "node",
        left: { tag: "var", value: "x1" },
        right: { tag: "var", value: "x0" },
      },
    };

    expect(quotient.map(term)).toEqual(["x0", "x1", "x0"]);
  });

  it("concatenates list-of-lists via monad multiplication", () => {
    const data = nonemptyListQuotient();
    const multiplication = data.monad.multiplication.transformation.component("•") as SetHom<
      Example14ListOfLists,
      Example14NonemptyList
    >;
    const lists: Example14ListOfLists = [
      ["x0"],
      ["x1", "x0"],
    ];

    expect(multiplication.map(lists)).toEqual(["x0", "x1", "x0"]);
  });
});

describe("sweedlerDualNonemptyList", () => {
  it("packages the Sweedler subcomonad and inclusion metadata", () => {
    const data = sweedlerDualNonemptyList();
    expect(data.metadata).toContain("Example14 Sweedler dual data");
    expect(data.cofree.comonad.metadata).toContain("Example14 cofree comonad");
    expect(data.sweedler.comonad.metadata).toContain("Example14 Sweedler dual");
    const inclusion = data.sweedler.inclusion.transformation.component("•") as SetHom<
      Example14CofreeElement,
      Example14CofreeElement
    >;
    const samples = Array.from(data.sweedler.carrier).slice(0, 3);
    for (const sample of samples) {
      expect(data.cofree.carrier.has(inclusion.map(sample))).toBe(true);
    }
  });
});

describe("sweedlerDualOfMonoidQuotient", () => {
  it("records the Example 14 f_*°/g_*° equalizer summary", () => {
    const result = nonemptyListSweedlerQuotientEqualizer();
    expect(result.equalizer.checked).toBeGreaterThan(0);
    expect(result.equalizer.mismatches).toBe(0);
    expect(result.equalizer.diagnostics).toContain(
      "Monoid quotient Sweedler equalizer: all sampled elements satisfied f_*° = g_*°.",
    );
    expect(result.diagnostics).toContain(
      "Monoid quotient Sweedler equalizer: derived f_*°/g_*° equalizer summary from Sweedler data.",
    );
    expect(result.metadata).toContain("Example14 Sweedler quotient equalizer");
  });
});

describe("Example14 oracles", () => {
  it("confirms the Example 14 quotient behaviour", () => {
    const report = checkNonemptyListQuotient();
    expect(report.holds).toBe(true);
    expect(report.termCounterexamples).toHaveLength(0);
    expect(report.multiplicationCounterexamples).toHaveLength(0);
  });

  it("verifies the Sweedler inclusion against the cofree comonad", () => {
    const report = checkNonemptyListSweedler();
    expect(report.holds).toBe(true);
    expect(report.counitCounterexamples).toHaveLength(0);
    expect(report.comultiplicationCounterexamples).toHaveLength(0);
  });
});

describe("greatest-interaction Sweedler utilities", () => {
  it("reuses packaged caches when deriving the greatest interacting functor", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const result = deriveGreatestInteractingFunctorForMonadComonadLaw(packaged);

    expect(result.metadata).toEqual([
      "Example6 interaction law",
      "Example6 writer monad",
      "Example6 reader comonad",
    ]);
    expect(result.diagnostics).toContain(
      "Monad/comonad greatest functor: reused packaged Sweedler summary from interaction law.",
    );
    expect(result.diagnostics).toContain(
      "Monad/comonad greatest functor: reused packaged comma presentation from interaction law.",
    );
    expect(result.greatest.diagnostics).toContain(
      "Greatest functor: reused provided Sweedler summary.",
    );
    expect(result.greatest.transformation).toBeDefined();
  });

  it("reuses packaged caches when deriving the greatest interacting comonad", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const result = deriveGreatestInteractingComonadForMonadComonadLaw(packaged);

    expect(result.metadata).toEqual([
      "Example6 interaction law",
      "Example6 writer monad",
      "Example6 reader comonad",
    ]);
    expect(result.diagnostics).toContain(
      "Monad/comonad greatest comonad: reused packaged Sweedler summary from interaction law.",
    );
    expect(result.greatest.diagnostics).toContain(
      "Greatest comonad: reused provided Sweedler summary.",
    );
    expect(result.greatest.transformation).toBeDefined();
  });
});

describe("dual map translators", () => {
  it("extracts dual maps consistent with ψ for Example 6", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const summary = interactionLawToDualMap(packaged, { sampleLimit: 6 });

    expect(summary.monadDiagram.holds).toBe(true);
    expect(summary.comonadDiagram.holds).toBe(true);
    expect(summary.diagnostics).toContain(
      "interactionLawToDualMap: T → D° naturality verified.",
    );
    expect(summary.diagnostics).toContain(
      "interactionLawToDualMap: D → T° naturality verified.",
    );
    expect(summary.diagnostics).toContain(
      "interactionLawToDualMap: dual maps agree with ψ on sampled entries.",
    );

    const greatest = deriveGreatestInteractingComonadForMonadComonadLaw(packaged);
    const factorization = verifySweedlerDualFactorization(packaged, {
      sampleLimit: 6,
      dual: summary,
      greatest,
    });

    expect(factorization.report.holds).toBe(true);
    expect(factorization.report.details).toContain(
      "verifySweedlerDualFactorization: Sweedler factoring verified on sampled data.",
    );

    const reconstruction = interactionLawFromDualMap({
      interaction: packaged,
      monadToDual: summary.monadToDual,
      comonadToDual: summary.comonadToDual,
      sampleLimit: 6,
    });

    expect(reconstruction.reconstructsPsi).toBe(true);
    expect(reconstruction.monadDiagram.holds).toBe(true);
    expect(reconstruction.comonadDiagram.holds).toBe(true);
  });

  it("surfaces diagnostics when Sweedler factorization is tampered", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const summary = interactionLawToDualMap(packaged, { sampleLimit: 4 });
    const greatest = deriveGreatestInteractingComonadForMonadComonadLaw(packaged);

    const originalTransformation = greatest.greatest.transformation;
    const tamperedTransformation = constructNaturalTransformationWithWitness(
      originalTransformation.witness.source,
      originalTransformation.witness.target,
      (object) => {
        const component = originalTransformation.transformation.component(object);
        const codomain = component.cod as SetObj<unknown>;
        const fallback = enumerate(codomain)[0];
        if (fallback === undefined) {
          return component;
        }
        return SetCat.hom(
          component.dom as SetObj<unknown>,
          component.cod as SetObj<unknown>,
          () => fallback,
        );
      },
      {
        metadata: [
          ...(originalTransformation.metadata ?? []),
          "Tampered Sweedler transformation",
        ],
      },
    );

    const tamperedGreatest: typeof greatest = {
      ...greatest,
      greatest: {
        ...greatest.greatest,
        transformation: tamperedTransformation,
      },
      diagnostics: [
        ...greatest.diagnostics,
        "Tampered Sweedler comonad transformation.",
      ],
    };

    const failure = verifySweedlerDualFactorization(packaged, {
      sampleLimit: 4,
      dual: summary,
      greatest: tamperedGreatest,
    });

    expect(failure.report.holds).toBe(false);
    expect(failure.report.counterexamples.length).toBeGreaterThan(0);
    expect(
      failure.report.details.some((detail) => detail.includes("first mismatch")),
    ).toBe(true);
  });

  it("flags mismatches when the monad dual map is altered", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const summary = interactionLawToDualMap(packaged, { sampleLimit: 5 });

    const wrongMonadToDual = constructNaturalTransformationWithWitness(
      summary.monadToDual.witness.source,
      summary.monadToDual.witness.target,
      (object) => {
        const component = summary.monadToDual.transformation.component(object);
        const domain = component.dom as SetObj<unknown>;
        const codomain = component.cod as SetObj<unknown>;
        const rightCarrier = packaged.law.right.functor.F0(object) as SetObj<unknown>;
        const fallbackRight = enumerate(rightCarrier)[0];
        if (fallbackRight === undefined) {
          return component as unknown as SetHom<unknown, unknown>;
        }
        return SetCat.hom(domain, codomain, (element) => {
          const baseAssignment = component.map(element) as (input: unknown) => unknown;
          const constantValue = baseAssignment(fallbackRight);
          return ((_: unknown) => constantValue) as (input: unknown) => unknown;
        });
      },
    );

    const reconstruction = interactionLawFromDualMap({
      interaction: packaged,
      monadToDual: wrongMonadToDual,
      comonadToDual: summary.comonadToDual,
      sampleLimit: 5,
    });

    expect(reconstruction.reconstructsPsi).toBe(false);
    expect(reconstruction.monadDiagram.holds).toBe(false);
    expect(reconstruction.monadDiagram.mismatches).toBeGreaterThan(0);
  });
});

describe("deriveMonadComonadRunnerTranslation", () => {
  it("aligns θ, costate, and coalgebra data for Example 6", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const translation = deriveMonadComonadRunnerTranslation(packaged);

    expect(translation.thetaComponents.every((component) => component.consistentWithDelta)).toBe(
      true,
    );
    expect(
      translation.costateComponents.every((component) => component.evaluationConsistent),
    ).toBe(true);
    expect(
      translation.coalgebraComponents.every((component) => component.evaluationConsistent),
    ).toBe(true);
    expect(translation.diagnostics).toContain(
      "Runner translation sampled up to 64 element(s) per carrier to align θ, γ, and coalgebra data with recorded δ tables.",
    );
  });

  it("records the chosen sampling bound in the θ diagnostics", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const translation = deriveMonadComonadRunnerTranslation(packaged, { sampleLimit: 1 });

    expect(
      translation.thetaComponents.every((component) =>
        component.diagnostics.some((detail) => detail.includes("limit 1")),
      ),
    ).toBe(true);
  });
});

describe("structural operations on monad–comonad interaction laws", () => {
  it("stretches a law using the identity mappings", () => {
    const baseLaw = buildBooleanLaw();
    const monad = buildIdentityMonad();
    const comonad = buildIdentityComonad();
    const packaged = makeMonadComonadInteractionLaw({ monad, comonad, law: baseLaw });

    const result = stretchMonadComonadInteractionLaw({
      base: packaged,
      monad,
      comonad,
      stretch: {
        left: packaged.law.left,
        right: packaged.law.right,
        mapLeft: (_object, element) => element,
        mapRight: (_object, element) => element,
        tags: { primal: "StretchedPrimal", dual: "StretchedDual" },
      },
      metadata: ["Stretch test"],
    });

    expect(result.interaction.monad).toBe(monad);
    expect(result.interaction.comonad).toBe(comonad);
    expect(result.interaction.metadata).toContain("Stretch test");
    expect(result.diagnostics[0]).toBe(
      "stretchMonadComonadInteractionLaw: derived stretched functor interaction law via supplied mappings.",
    );

    const basePrimal = Array.from(packaged.law.primalCarrier)[0]!;
    const baseDual = Array.from(packaged.law.dualCarrier)[0]!;
    const stretchedPrimal = Array.from(result.stretchedLaw.primalCarrier)[0]!;
    const stretchedDual = Array.from(result.stretchedLaw.dualCarrier)[0]!;

    expect(result.stretchedLaw.evaluate(stretchedPrimal, stretchedDual)).toBe(
      packaged.law.evaluate(basePrimal, baseDual),
    );
  });

  it("forms a Day-style tensor product of interaction laws", () => {
    const baseLaw = buildBooleanLaw();
    const monad = buildIdentityMonad();
    const comonad = buildIdentityComonad();
    const packaged = makeMonadComonadInteractionLaw({ monad, comonad, law: baseLaw });

    const tensor = tensorMonadComonadInteractionLaws({
      left: packaged,
      right: packaged,
      monad,
      comonad,
      metadata: ["Tensor test"],
    });

    expect(tensor.interaction.monad).toBe(monad);
    expect(tensor.interaction.comonad).toBe(comonad);
    expect(tensor.interaction.metadata).toContain("TensorMonadComonadInteractionLaws");
    expect(tensor.interaction.metadata).toContain("Tensor test");
    expect(tensor.diagnostics[0]).toBe(
      "tensorMonadComonadInteractionLaws: combined interaction laws via Day product of functor pairings.",
    );

    const samplePrimal = Array.from(tensor.interaction.law.primalCarrier)[0]!;
    const sampleDual = Array.from(tensor.interaction.law.dualCarrier)[0]!;
    const value = tensor.interaction.law.evaluate(samplePrimal, sampleDual);

    expect(Array.isArray(value)).toBe(true);
    expect(value).toHaveLength(2);
    expect(typeof value[0]).toBe("boolean");
    expect(typeof value[1]).toBe("boolean");
  });

  it("packages a supplied composite interaction law", () => {
    const baseLaw = buildBooleanLaw();
    const monad = buildIdentityMonad();
    const comonad = buildIdentityComonad();
    const packaged = makeMonadComonadInteractionLaw({ monad, comonad, law: baseLaw });

    const composite = composeMonadComonadInteractionLaws({
      inner: packaged,
      outer: packaged,
      monad,
      comonad,
      law: packaged.law,
      metadata: ["Composite test"],
      compatibilityDiagnostics: ["compatibility verified"],
    });

    expect(composite.interaction.law).toBe(packaged.law);
    expect(composite.interaction.metadata).toContain("ComposeMonadComonadInteractionLaws");
    expect(composite.interaction.metadata).toContain("Composite test");
    expect(composite.diagnostics).toContain(
      "composeMonadComonadInteractionLaws: packaged composite interaction law using supplied data.",
    );
    expect(composite.diagnostics).toContain("compatibility verified");
  });
});

describe("free monad–comonad interaction law", () => {
  it("records coproduct witnesses and universal comparisons", () => {
    const baseLaw = buildBooleanLaw();
    const monad = buildIdentityMonad();
    const comonad = buildIdentityComonad();

    const baseInteraction = makeMonadComonadInteractionLaw({ monad, comonad, law: baseLaw });

    const coproductWitnesses: ReadonlyArray<FreeMonadComonadCoproductWitness<TwoObject>> = [
      {
        fiber: "★",
        summands: [
          { fiber: "★", label: "id × fst", metadata: ["FZ × GY inclusion"] },
          { fiber: "★", label: "id × snd", metadata: ["F(Y × W) inclusion"] },
        ],
        metadata: ["Free law fiber"],
      },
    ];

    const universalComparisons: ReadonlyArray<
      FreeMonadComonadUniversalComparison<{ source: string }>
    > = [
      { label: "into-free", payload: { source: "Example base" }, metadata: ["Initial comparison"] },
    ];

    const finalComparisons: ReadonlyArray<
      FreeMonadComonadUniversalComparison<{ target: string }>
    > = [
      { label: "out-of-free", payload: { target: "Example slice" }, metadata: ["Final comparison"] },
    ];

    const universals: FreeMonadComonadUniversalComparisons<
      { source: string },
      { target: string }
    > = {
      initial: universalComparisons,
      final: finalComparisons,
      metadata: ["Free law universals"],
    };

    const freeResult = makeFreeMonadComonadInteractionLaw({
      base: baseInteraction,
      freeMonad: monad,
      cofreeComonad: comonad,
      law: baseInteraction.law,
      coproductWitnesses,
      universalComparisons: universals,
      metadata: ["Free law"],
      options: {
        currying: baseInteraction.currying,
        comma: baseInteraction.comma,
        sweedler: baseInteraction.sweedler,
        degeneracy: baseInteraction.degeneracy,
      },
    });

    expect(freeResult.interaction.metadata).toContain("FreeMonadComonadInteractionLaw");
    expect(freeResult.coproductWitnesses).toBe(coproductWitnesses);
    expect(freeResult.universalComparisons).toBe(universals);
    expect(freeResult.diagnostics).toContain(
      "makeFreeMonadComonadInteractionLaw: recorded 1 coproduct witness for ψ'.",
    );

    const initialSlice = deriveInitialMonadSliceObject(freeResult);
    expect(initialSlice.comparisons).toBe(universals.initial);
    expect(initialSlice.diagnostics[0]).toContain("extracted 1 comparison");

    const finalSlice = deriveFinalComonadSliceObject(freeResult);
    expect(finalSlice.comparisons).toBe(universals.final);
    expect(finalSlice.diagnostics[0]).toContain("extracted 1 comparison");

    const report = checkFreeInteractionLaw(freeResult);
    expect(report.holds).toBe(true);
    expect(report.details).toContain("checkFreeInteractionLaw: recorded 1 initial comparison.");
    expect(report.details).toContain("checkFreeInteractionLaw: recorded 1 final comparison.");
  });
});

describe("sweedlerDualOfFreeMonoid", () => {
  const buildFreeLaw = () => {
    const baseLaw = buildBooleanLaw();
    const monad = buildIdentityMonad();
    const comonad = buildIdentityComonad();
    const baseInteraction = makeMonadComonadInteractionLaw({ monad, comonad, law: baseLaw });
    return makeFreeMonadComonadInteractionLaw({
      base: baseInteraction,
      freeMonad: monad,
      cofreeComonad: comonad,
      law: baseInteraction.law,
      coproductWitnesses: [
        {
          fiber: "★",
          summands: [
            { fiber: "★", label: "id × fst", metadata: ["Free coproduct left"] },
            { fiber: "★", label: "id × snd", metadata: ["Free coproduct right"] },
          ],
        },
      ],
      universalComparisons: {
        initial: [{ label: "ι_*", payload: { source: "Mon(F,UD)" }, metadata: ["Initial slice"] }],
        final: [{ label: "e^F_{UD}", payload: { target: "Comon(F°,UD)" }, metadata: ["Final slice"] }],
        metadata: ["Free Sweedler comparisons"],
      },
      metadata: ["Free Sweedler example"],
    });
  };

  it("derives the Sweedler dual using the canonical translator and bijection metadata", () => {
    const free = buildFreeLaw();

    const typedFree = free as FreeMonadComonadInteractionLawResult<
      TwoObject,
      TwoArrow,
      unknown,
      unknown,
      boolean,
      TwoObject,
      TwoArrow,
      { source: string },
      { target: string }
    >;

    const result = sweedlerDualOfFreeMonoid(typedFree);

    expect(result.free).toBe(free);
    expect(result.monoid.law).toBe(free.interaction.law);
    expect(result.sweedler.monoid).toBe(result.monoid);
    expect(result.comparisons.initialCount).toBe(1);
    expect(result.comparisons.finalCount).toBe(1);
    expect(result.bijection.holds).toBe(true);
    expect(result.metadata).toEqual(
      expect.arrayContaining(["Free monoid Sweedler dual comparison"]),
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        "Free monoid Sweedler dual: derived interaction-law monoid from the free law via the canonical ψ → Day translator.",
        "Free monoid Sweedler dual: computed (-)^° using interactionLawMonoidToSweedlerDual, recording the diagram (8) diagnostics.",
      ]),
    );
  });

  it("reuses supplied monoid and Sweedler data", () => {
    const free = buildFreeLaw();
    const interactionForMonoid = free.interaction as unknown as MonadComonadInteractionLaw<
      TwoObject,
      TwoArrow,
      unknown,
      unknown,
      boolean,
      TwoObject,
      TwoArrow
    >;
    const monoid = monadComonadInteractionLawToMonoid(interactionForMonoid, {
      metadata: ["Free monoid wrapper"],
    });
    const sweedler = interactionLawMonoidToSweedlerDual(monoid, {
      metadata: ["Reused Sweedler"],
    });

    const typedFree = free as FreeMonadComonadInteractionLawResult<
      TwoObject,
      TwoArrow,
      unknown,
      unknown,
      boolean,
      TwoObject,
      TwoArrow,
      { source: string },
      { target: string }
    >;

    const result = sweedlerDualOfFreeMonoid(typedFree, {
      monoid,
      sweedler,
      metadata: ["Supplied free Sweedler"],
    });

    expect(result.monoid).toBe(monoid);
    expect(result.sweedler).toBe(sweedler);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        "Free monoid Sweedler dual: reused interaction-law monoid supplied via options.",
        "Free monoid Sweedler dual: reused Sweedler dual functor supplied via options.",
      ]),
    );
    expect(result.metadata).toEqual(
      expect.arrayContaining(["Supplied free Sweedler", "Free monoid Sweedler dual comparison"]),
    );
  });
});

describe("Example14 coassociativity and rectangularity", () => {
  it("derives partition data and confirms rectangularity witnesses", () => {
    const data = deriveNonemptyListCoequation();
    expect(data.metadata).toContain("Example14CoequationData");
    expect(data.leftPartition).toBeDefined();
    expect(data.rightPartition).toBeDefined();

    const report = checkRectangularityFromCoequation(data);
    expect(report.holds).toBe(true);
    expect(report.metadata).toContain("Example14Rectangularity");
    expect(report.witnesses.length).toBeGreaterThan(0);
    expect(report.details[0]).toContain("rectangular");
  });
});
