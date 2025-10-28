// Registry for algebra-specific oracles following the semicartesian development

import type { CRingPlusObj, CRingPlusMor } from "./cring-plus";
import type { ADTConstructor, ADTField } from "./src/algebra/adt/adt";
import {
  analyzeADTCoalgebra,
  analyzeADTIndexes,
  analyzeADTFoldUnfold,
  analyzeADTPolynomialMap,
  analyzeADTPolynomialRecursion,
  analyzeADTPolynomialRoundtrip,
  analyzeADTPolynomialContainerComposition,
  analyzeADTPolynomialContainerIdentity,
  analyzeADTTraversal,
} from "./src/algebra/adt/adt";
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
import {
  analyzeADTPolynomialRelativeMonad,
  analyzeADTPolynomialRelativeStreet,
  type ADTPolynomialRelativeMonadInput,
  type ADTPolynomialRelativeStreetInput,
} from "./relative/adt-polynomial-relative";
import { checkPrimeIdeal, checkLocalRingAtPrime } from "./src/algebra/ring/prime-ideals";
import { checkMultiplicativeSet } from "./src/algebra/ring/multiplicative-sets";
import { checkLocalizationRing } from "./src/algebra/ring/localizations";
import {
  checkFinitelyGeneratedModule,
  checkNoetherianModule,
} from "./src/algebra/ring/finitely-generated-modules";
import {
  checkBilinearMap,
  checkTensorProduct,
  checkFlatModuleOnSamples,
} from "./src/algebra/ring/tensor-products";
import { checkCoveringFamily } from "./src/sheaves/sites";
import { checkPresheaf } from "./src/sheaves/presheaves";
import { checkPresheafMorphism, checkSheafMorphism } from "./src/sheaves/morphisms";
import { buildMatchingFamily, checkSheafGluing } from "./src/sheaves/sheaves";
import {
  buildEtaleDescentSample,
  buildZariskiSiteTopology,
  checkEtaleCover,
  checkGrothendieckTopology,
  checkZariskiPrincipalOpenCover,
} from "./src/sheaves/grothendieck-topologies";
import {
  analyzeCohomology,
  checkChainComplex,
  checkTwoOpenCechCohomology,
} from "./src/sheaves/cech-cohomology";
import {
  buildAffineFiberProduct,
  checkAffineSchemeMorphism,
  checkAffineSchemePullbackSquare,
} from "./src/schemes/affine-morphisms";
import { checkPrimeSpectrum, checkPrimeStalks } from "./src/schemes/prime-spectrum";
import { checkStructureSheaf } from "./src/schemes/structure-sheaf";
import { checkSchemeGluing, checkSchemeFiberProduct } from "./src/schemes/global-schemes";
import { checkFiberedCategory, checkStackDescent } from "./src/schemes/stacks";
import { AffineSchemeExamples } from "./examples/runnable/093-affine-scheme-example-catalogue";
import {
  analyzeFinGrpRepresentationSemisimplicity,
  certifyFinGrpRepresentationSemisimplicity,
  checkFinGrpRepresentationIrreducible,
  collectFinGrpRepresentationSemisimplicitySummands,
  collectFinGrpRepresentationIrreducibleSummands,
} from "./models/fingroup-representation";
import {
  FinGrpRepresentationOracles,
  FinGrpRepresentationLawRegistry,
  enumerateFinGrpRepresentationOracles,
  runFinGrpRepresentationSemisimplicityWorkflow,
  formatFinGrpRepresentationSemisimplicityWorkflow,
  formatFinGrpRepresentationSemisimplicityWorkflowProfile,
  summarizeFinGrpRepresentationSemisimplicityWorkflow,
  profileFinGrpRepresentationSemisimplicityWorkflow,
  reportFinGrpRepresentationSemisimplicityWorkflow,
  surveyFinGrpRepresentationSemisimplicityWorkflows,
  formatFinGrpRepresentationSemisimplicitySurvey,
} from "./oracles/fingroup-representation";

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
  ring: {
    primeIdeal: checkPrimeIdeal,
    multiplicativeSet: checkMultiplicativeSet,
    localization: checkLocalizationRing,
    localRing: checkLocalRingAtPrime,
    finitelyGeneratedModule: checkFinitelyGeneratedModule,
    // Ascending-chain harness layered on finitely generated module checks
    noetherianModule: checkNoetherianModule,
    bilinearMap: checkBilinearMap,
    tensorProduct: checkTensorProduct,
    flatness: checkFlatModuleOnSamples,
  },
  sheaf: {
    coveringFamily: checkCoveringFamily,
    presheaf: checkPresheaf,
    // Morphism validators compose the presheaf/sheaf harnesses for reuse by downstream callers.
    presheafMorphism: checkPresheafMorphism,
    sheafGluing: checkSheafGluing,
    sheafMorphism: checkSheafMorphism,
    buildMatchingFamily,
    zariskiSite: buildZariskiSiteTopology,
    grothendieckTopology: checkGrothendieckTopology,
    zariskiPrincipalOpen: checkZariskiPrincipalOpenCover,
    etaleCover: checkEtaleCover,
    etaleDescentSamples: buildEtaleDescentSample,
  },
  derived: {
    chainComplex: checkChainComplex,
    cechTwoOpen: checkTwoOpenCechCohomology,
    cohomologyAnalysis: analyzeCohomology,
  },
  scheme: {
    affineMorphism: checkAffineSchemeMorphism,
    affinePullback: checkAffineSchemePullbackSquare,
    affineFiberProduct: buildAffineFiberProduct,
    primeSpectrum: checkPrimeSpectrum,
    primeStalks: checkPrimeStalks,
    structureSheaf: checkStructureSheaf,
    schemeGluing: checkSchemeGluing,
    schemeFiberProduct: checkSchemeFiberProduct,
    examples: AffineSchemeExamples,
  },
  moduli: {
    fiberedCategory: checkFiberedCategory,
    descentDatum: checkStackDescent,
  },
  representation: {
    checkFinGrpRepresentationIrreducible,
    analyzeFinGrpRepresentationSemisimplicity,
    collectFinGrpRepresentationSemisimplicitySummands,
    collectFinGrpRepresentationIrreducibleSummands,
    certifyFinGrpRepresentationSemisimplicity,
    enumerate: enumerateFinGrpRepresentationOracles,
    oracles: FinGrpRepresentationOracles,
    lawRegistry: FinGrpRepresentationLawRegistry,
    runSemisimplicityWorkflow: runFinGrpRepresentationSemisimplicityWorkflow,
    formatSemisimplicityWorkflow: formatFinGrpRepresentationSemisimplicityWorkflow,
    formatSemisimplicityProfile:
      formatFinGrpRepresentationSemisimplicityWorkflowProfile,
    summarizeSemisimplicityWorkflow: summarizeFinGrpRepresentationSemisimplicityWorkflow,
    profileSemisimplicityWorkflow: profileFinGrpRepresentationSemisimplicityWorkflow,
    reportSemisimplicityWorkflow: reportFinGrpRepresentationSemisimplicityWorkflow,
    surveySemisimplicityWorkflows: surveyFinGrpRepresentationSemisimplicityWorkflows,
    formatSemisimplicitySurvey: formatFinGrpRepresentationSemisimplicitySurvey,
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
    analyzePolynomialContainerBridge: <
      TypeName extends string,
      Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
      FoldResult,
      Seed,
    >(
      input: ADTPolynomialRelativeMonadInput<
        TypeName,
        Constructors,
        FoldResult,
        Seed
      >,
    ) => analyzeADTPolynomialRelativeMonad(input),
    analyzePolynomialStreetHarness: <
      TypeName extends string,
      Constructors extends ReadonlyArray<ADTConstructor<string, readonly ADTField<string, any>[]>>,
    >(
      input: ADTPolynomialRelativeStreetInput<TypeName, Constructors>,
    ) => analyzeADTPolynomialRelativeStreet(input),
  },
  adt: {
    analyzeCoalgebra: analyzeADTCoalgebra,
    analyzeFoldUnfold: analyzeADTFoldUnfold,
    analyzeTraversal: analyzeADTTraversal,
    analyzeIndexes: analyzeADTIndexes,
    analyzePolynomialRoundtrip: analyzeADTPolynomialRoundtrip,
    analyzePolynomialMap: analyzeADTPolynomialMap,
    analyzePolynomialRecursion: analyzeADTPolynomialRecursion,
    analyzePolynomialContainerIdentity: analyzeADTPolynomialContainerIdentity,
    analyzePolynomialContainerComposition: analyzeADTPolynomialContainerComposition,
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
