// Registry for algebra-specific oracles following the semicartesian development

import type { CRingPlusObj, CRingPlusMor } from "./cring-plus";
import {
  checkCRingPlusInitialSemicartesian,
  buildCRingPlusCausalityScenario,
  checkCRingPlusCausalityCounterexample,
} from "./cring-plus";
import {
  checkComplexCStarAxioms,
  checkComplexIdentityHomomorphism,
  checkComplexSpectralTheory,
} from "./cstar-algebra";
import type { InitialArrowSample } from "./semicartesian-structure";
import type {
  RelativeMonadData,
  RelativeMonadLawAnalysis,
} from "./relative/relative-monads";
import { analyzeRelativeMonadLaws } from "./relative/relative-monads";

export interface RelativeMonadLawCheckResult<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly details: string;
  readonly analysis: RelativeMonadLawAnalysis<Obj, Arr, Payload, Evidence>;
}

export const AlgebraOracles = {
  semicartesian: {
    cringPlusInitialUnit: checkCRingPlusInitialSemicartesian,
  },
  causality: {
    counterexampleScenario: buildCRingPlusCausalityScenario,
    counterexampleOracle: checkCRingPlusCausalityCounterexample,
  },
  cstar: {
    complexAxioms: checkComplexCStarAxioms,
    identityHom: checkComplexIdentityHomomorphism,
    spectral: checkComplexSpectralTheory,
  },
  relative: {
    checkRelativeMonadLaws: <Obj, Arr, Payload, Evidence>(
      monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    ) => checkRelativeMonadLaws(monad),
  },
} as const;

export const checkRelativeMonadLaws = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLawCheckResult<Obj, Arr, Payload, Evidence> => {
  const analysis = analyzeRelativeMonadLaws(monad);
  const componentIssues: string[] = [];

  if (!analysis.framing.holds) {
    componentIssues.push(...analysis.framing.issues);
  }
  if (!analysis.unitCompatibility.holds) {
    componentIssues.push(...analysis.unitCompatibility.issues);
  }
  if (!analysis.extensionAssociativity.holds) {
    componentIssues.push(...analysis.extensionAssociativity.issues);
  }
  if (!analysis.rootIdentity.holds) {
    componentIssues.push(...analysis.rootIdentity.issues);
  }

  const pending =
    analysis.unitCompatibility.pending ||
    analysis.extensionAssociativity.pending ||
    analysis.rootIdentity.pending;

  const holds = !pending && componentIssues.length === 0;
  const details = componentIssues.length > 0
    ? `Relative monad law issues: ${componentIssues.join("; ")}`
    : pending
      ? "Relative monad law verification pending Street composites for the unit or extension witnesses."
      : "Relative monad laws verified: framing, Street unit compatibility, associativity, and root identity preservation all hold.";

  return { holds, pending, details, analysis };
};

export const checkAllAlgebraLaws = (
  targets: ReadonlyArray<CRingPlusObj>,
  samples: ReadonlyArray<InitialArrowSample<CRingPlusObj, CRingPlusMor>> = []
): {
  semicartesian: boolean;
  details: string;
  causality: ReturnType<typeof checkCRingPlusCausalityCounterexample>;
  cstar: {
    axioms: ReturnType<typeof checkComplexCStarAxioms>;
    identityHom: ReturnType<typeof checkComplexIdentityHomomorphism>;
    spectral: ReturnType<typeof checkComplexSpectralTheory>;
  };
} => {
  const result = checkCRingPlusInitialSemicartesian(targets, samples);
  const causality = checkCRingPlusCausalityCounterexample();
  const axioms = checkComplexCStarAxioms();
  const identityHom = checkComplexIdentityHomomorphism();
  const spectral = checkComplexSpectralTheory();
  return {
    semicartesian: result.holds,
    details: result.details,
    causality,
    cstar: { axioms, identityHom, spectral },
  };
};
