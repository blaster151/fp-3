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
  interactionLawToDualMap,
  verifySweedlerDualFactorization,
  nonemptyListFreeMonad,
  nonemptyListQuotient,
  type Example14CofreeElement,
  sweedlerDualNonemptyList,
  type Example14FreeTerm,
  type Example14ListOfLists,
  type Example14NestedTerm,
  type Example14NonemptyList,
  type Example14Symbol,
  type ComonadStructure,
  type MonadStructure,
  stretchMonadComonadInteractionLaw,
  tensorMonadComonadInteractionLaws,
  composeMonadComonadInteractionLaws,
  monadComonadInteractionLawToMonoid,
  makeFreeMonadComonadInteractionLaw,
  deriveInitialMonadSliceObject,
  deriveFinalComonadSliceObject,
  type FreeMonadComonadCoproductWitness,
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
  deriveInteractionLawCurrying,
  deriveInteractionLawLeftCommaPresentation,
  deriveInteractionLawSweedlerSummary,
} from "../functor-interaction-law";
import { analyzeFunctorOperationDegeneracy } from "../functor-interaction-law-degeneracy";
import { dayTensor } from "../day-convolution";
import {
  contravariantRepresentableFunctorWithWitness,
  covariantRepresentableFunctorWithWitness,
} from "../functor-representable";
import {
  composeFunctors,
  identityFunctorWithWitness,
  type FunctorWithWitness,
} from "../functor";
import {
  constructNaturalTransformationWithWitness,
  identityNaturalTransformation,
} from "../natural-transformation";
import { SetCat, getCarrierSemantics, type SetHom, type SetObj } from "../set-cat";
import { makeTwoObjectPromonoidalKernel } from "../promonoidal-structure";
import { TwoObjectCategory, type TwoArrow, type TwoObject } from "../two-object-cat";
import {
  checkFreeInteractionLaw,
  checkMonadComonadInteractionLaw,
  checkNonemptyListQuotient,
  checkNonemptyListSweedler,
} from "../oracles";

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
  const functor = identityFunctorWithWitness(TwoObjectCategory);
  const unit = identityNaturalTransformation(functor, {
    metadata: ["Identity monad unit"],
  });
  const composite: FunctorWithWitness<TwoObject, TwoArrow, TwoObject, TwoArrow> = composeFunctors(
    functor,
    functor,
  );
  const multiplication = constructNaturalTransformationWithWitness(
    composite,
    functor,
    (object) => TwoObjectCategory.id(object),
    { metadata: ["Identity monad multiplication"] },
  );
  return {
    functor,
    unit,
    multiplication,
    metadata: ["Identity monad"],
  };
};

const buildIdentityComonad = (): ComonadStructure<TwoObject, TwoArrow> => {
  const functor = identityFunctorWithWitness(TwoObjectCategory);
  const counit = identityNaturalTransformation(functor, {
    metadata: ["Identity comonad counit"],
  });
  const composite: FunctorWithWitness<TwoObject, TwoArrow, TwoObject, TwoArrow> = composeFunctors(
    functor,
    functor,
  );
  const comultiplication = constructNaturalTransformationWithWitness(
    functor,
    composite,
    (object) => TwoObjectCategory.id(object),
    { metadata: ["Identity comonad comultiplication"] },
  );
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
    const comma = deriveInteractionLawLeftCommaPresentation(law);
    const sweedler = deriveInteractionLawSweedlerSummary(law, { currying, comma });
    const degeneracy = analyzeFunctorOperationDegeneracy(law);

    const packaged = makeMonadComonadInteractionLaw({
      monad,
      comonad,
      law,
      metadata: ["Packaged"],
      options: {
        currying,
        comma,
        sweedler,
        degeneracy,
        metadata: ["Options"],
      },
    });

    expect(packaged.currying).toBe(currying);
    expect(packaged.comma).toBe(comma);
    expect(packaged.sweedler).toBe(sweedler);
    expect(packaged.degeneracy).toBe(degeneracy);
    expect(packaged.psiComponents).toBe(currying.fibers);
    expect(packaged.monad).toBe(monad);
    expect(packaged.comonad).toBe(comonad);

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
    expect(packaged.metadata).toEqual([
      "Identity monad",
      "Identity comonad",
    ]);
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

describe("checkMonadComonadInteractionLaw", () => {
  it("confirms Example 6 satisfies the ψ coherence diagrams", () => {
    const packaged = makeExample6MonadComonadInteractionLaw();
    const report = checkMonadComonadInteractionLaw(packaged);
    expect(report.holds).toBe(true);
    expect(report.unit.holds).toBe(true);
    expect(report.counit.holds).toBe(true);
    expect(report.multiplication.holds).toBe(true);
    expect(report.mixedAssociativity.holds).toBe(true);
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
          const baseAssignment = component.map(element);
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
