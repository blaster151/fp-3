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
} as const;

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
