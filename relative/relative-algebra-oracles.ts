import type {
  RelativeAlgebraMorphismPresentation,
  RelativeAlgebraPresentation,
  RelativeEilenbergMoorePresentation,
  RelativeKleisliPresentation,
  RelativeOpalgebraMorphismPresentation,
  RelativeOpalgebraPresentation,
  RelativeOpalgebraCarrierTriangleWitness,
  RelativeOpalgebraExtensionRectangleWitness,
  RelativeOpalgebraExtraordinaryTransformationWitness,
  RelativeStreetActionWitness,
  RelativeStreetActionHomomorphismWitness,
  RelativeStreetActionCategoryWitness,
  RelativeStreetLooseAdjunctionWitness,
  RelativeStreetRepresentableRestrictionWitness,
  RelativeAlgebraStreetActionEquivalenceWitness,
  RelativeStreetRepresentabilityUpgradeWitness,
  RelativeAlgebraIdentityRootWitness,
  RelativeAlgebraGradedMorphismWitness,
  RelativeAlgebraGradedAlternateWitness,
  RelativeAlgebraGradedExtensionWitness,
  RelativeStreetRepresentableSubmulticategoryWitness,
  RelativeStreetRepresentableActionDiagramsWitness,
  RelativeStreetRepresentableActionHomomorphismWitness,
  RelativeOpalgebraStreetActionEquivalenceWitness,
  RelativeStreetRepresentabilityGeneralisationWitness,
  RelativeOpalgebraLiteratureWitness,
  RelativeOpalgebraIdentityRootWitness,
  RelativeAlgebraIndexedFamilyWitness,
  RelativeAlgebraGlobalCategoryWitness,
  RelativeAlgebraMediatingTightCellWitness,
  RelativeAlgebraResolutionWitness,
  RelativeAlgebraTwoDimensionalModuleWitness,
  RelativeAlgebraRestrictionFunctorWitness,
  RelativePartialRightAdjointWitness,
  RelativeOpalgebraResolutionWitness,
  RelativePartialLeftAdjointWitness,
} from "./relative-algebras";
import {
  analyzeRelativeAlgebraFraming,
  analyzeRelativeAlgebraMorphismCompatibility,
  analyzeRelativeAlgebraCanonicalAction,
  analyzeRelativeEilenbergMooreUniversalProperty,
  analyzeRelativeKleisliUniversalProperty,
  analyzeRelativeOpalgebraFraming,
  analyzeRelativeOpalgebraMorphismCompatibility,
  analyzeRelativeOpalgebraCarrierTriangle,
  analyzeRelativeOpalgebraExtensionRectangle,
  analyzeRelativeOpalgebraCanonicalAction,
  analyzeRelativeOpalgebraExtraordinaryTransformation,
  analyzeRelativeOpalgebraRightAction,
  analyzeRelativeOpalgebraRightActionFromMonoid,
  analyzeRelativeStreetActionCoherence,
  analyzeRelativeStreetActionData,
  analyzeRelativeStreetActionHomomorphism,
  analyzeRelativeStreetActionHomCategory,
  analyzeRelativeStreetCanonicalAction,
  analyzeRelativeStreetLooseAdjunctionAction,
  analyzeRelativeStreetLooseAdjunctionRightAction,
  analyzeRelativeStreetRepresentableRestriction,
  analyzeRelativeAlgebraStreetActionBridge,
  analyzeRelativeAlgebraStreetActionEquivalence,
  analyzeRelativeStreetRepresentabilityUpgrade,
  analyzeRelativeAlgebraIdentityRootEquivalence,
  analyzeRelativeAlgebraGradedMorphisms,
  analyzeRelativeAlgebraGradedMorphismsAlternate,
  analyzeRelativeAlgebraGradedExtensionMorphisms,
  analyzeRelativeStreetRepresentableSubmulticategory,
  analyzeRelativeStreetRepresentableActionDiagrams,
  analyzeRelativeStreetRepresentableActionHomomorphism,
  analyzeRelativeOpalgebraRepresentableActionBridge,
  analyzeRelativeOpalgebraStreetActionEquivalence,
  analyzeRelativeStreetRepresentabilityGeneralisation,
  analyzeRelativeOpalgebraLiteratureRecoveries,
  analyzeRelativeOpalgebraIdentityRootEquivalence,
  analyzeRelativeAlgebraIndexedFamily,
  analyzeRelativeAlgebraGlobalCategory,
  analyzeRelativeAlgebraMediatingTightCell,
  analyzeRelativeAlgebraResolutionFromAlgebraObject,
  analyzeRelativeAlgebraTwoDimensionalModules,
  describeIdentityRelativeAlgebraMorphism,
  describeIdentityRelativeOpalgebraMorphism,
  describeRelativeOpalgebraDiagrams,
  describeRelativeAlgebraCanonicalAction,
  describeRelativeOpalgebraCanonicalAction,
  describeRelativeOpalgebraExtraordinaryTransformation,
  describeRelativeStreetAction,
  describeRelativeOpalgebraRightAction,
  describeRelativeStreetActionHomomorphism,
  describeRelativeStreetActionCategory,
  describeRelativeStreetCanonicalAction,
  describeRelativeStreetLooseAdjunctionAction,
  describeRelativeStreetLooseAdjunctionRightAction,
  describeRelativeStreetRepresentableRestriction,
  describeRelativeAlgebraStreetActionEquivalence,
  describeRelativeStreetRepresentabilityUpgrade,
  describeRelativeAlgebraIdentityRootWitness,
  describeRelativeAlgebraGradedMorphism,
  describeRelativeAlgebraGradedAlternate,
  describeRelativeAlgebraGradedExtension,
  describeRelativeStreetRepresentableSubmulticategory,
  describeRelativeStreetRepresentableActionDiagrams,
  describeRelativeStreetRepresentableActionHomomorphism,
  describeRelativeOpalgebraStreetActionEquivalence,
  describeRelativeStreetRepresentabilityGeneralisationWitness,
  describeRelativeOpalgebraLiteratureWitness,
  describeRelativeOpalgebraIdentityRootWitness,
  describeRelativeAlgebraIndexedFamilyWitness,
  describeRelativeAlgebraGlobalCategoryWitness,
  describeRelativeAlgebraMediatingTightCellWitness,
  describeRelativeAlgebraResolutionWitness,
  describeRelativeAlgebraTwoDimensionalModuleWitness,
  analyzeRelativeAlgebraRestrictionFunctor,
  describeRelativeAlgebraRestrictionFunctorWitness,
  analyzeRelativePartialRightAdjointFunctor,
  analyzeRelativeOpalgebraResolution,
  analyzeRelativePartialLeftAdjointSection,
  describeRelativeOpalgebraResolutionWitness,
  describeRelativePartialLeftAdjointWitness,
  type RelativeAlgebraResolutionWitness,
} from "./relative-algebras";
import {
  RelativeAlgebraLawRegistry,
  type RelativeAlgebraLawKey,
} from "./relative-laws";
import type { RelativeMonadData } from "./relative-monads";

export interface RelativeAlgebraOracleResult {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
  readonly witness?: unknown;
  readonly analysis?: unknown;
  readonly resolutionReport?: unknown;
  readonly mediatingTightCellReport?: unknown;
  readonly restrictionReport?: unknown;
  readonly sectionReport?: unknown;
  readonly gradedExtensionReport?: unknown;
  readonly kappaReport?: unknown;
}

const pendingOracle = (
  law: RelativeAlgebraLawKey,
  details?: string,
): RelativeAlgebraOracleResult => {
  const descriptor = RelativeAlgebraLawRegistry[law];
  return {
    holds: false,
    pending: true,
    registryPath: descriptor.registryPath,
    details:
      details ?? `${descriptor.name} oracle is pending. Summary: ${descriptor.summary}`,
  };
};

export const RelativeAlgebraOracles = {
  algebraFraming: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.algebraFraming;
    const report = analyzeRelativeAlgebraFraming(presentation);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  algebraMorphismCompatibility: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.algebraMorphismCompatibility;
    const report = analyzeRelativeAlgebraMorphismCompatibility(presentation);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  algebraGradedMorphisms: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraGradedMorphismWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.algebraGradedMorphisms;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraGradedMorphism(presentation);
    const report = analyzeRelativeAlgebraGradedMorphisms(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  algebraGradedMorphismsAlternate: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraGradedAlternateWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.algebraGradedMorphismsAlternate;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraGradedAlternate(presentation);
    const report = analyzeRelativeAlgebraGradedMorphismsAlternate(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  algebraGradedExtensionMorphisms: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraGradedExtensionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.algebraGradedExtensionMorphisms;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraGradedExtension(presentation);
    const report = analyzeRelativeAlgebraGradedExtensionMorphisms(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  opalgebraFraming: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraFraming;
    const report = analyzeRelativeOpalgebraFraming(presentation);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  opalgebraMorphismCompatibility: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraMorphismPresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraMorphismCompatibility;
    const report = analyzeRelativeOpalgebraMorphismCompatibility(presentation);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  opalgebraCarrierTriangle: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeOpalgebraCarrierTriangleWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraCarrierTriangle;
    const effectiveWitness =
      witness ?? describeRelativeOpalgebraDiagrams(presentation).carrierTriangle;
    const report = analyzeRelativeOpalgebraCarrierTriangle(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  opalgebraExtensionRectangle: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeOpalgebraExtensionRectangleWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraExtensionRectangle;
    const effectiveWitness =
      witness ?? describeRelativeOpalgebraDiagrams(presentation).extensionRectangle;
    const report = analyzeRelativeOpalgebraExtensionRectangle(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  opalgebraLiteratureRecoveries: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeOpalgebraLiteratureWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraLiteratureRecoveries;
    const effectiveWitness =
      witness ?? describeRelativeOpalgebraLiteratureWitness(presentation);
    const report = analyzeRelativeOpalgebraLiteratureRecoveries(effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      witness: report.witness,
    };
  },
  opalgebraIdentityRootEquivalence: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeOpalgebraIdentityRootWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraIdentityRootEquivalence;
    const effectiveWitness =
      witness ?? describeRelativeOpalgebraIdentityRootWitness(presentation);
    const report = analyzeRelativeOpalgebraIdentityRootEquivalence(effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  opalgebraCanonicalAction: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraCanonicalAction;
    const report = analyzeRelativeOpalgebraCanonicalAction(presentation);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  opalgebraExtraordinaryTransformations: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeOpalgebraExtraordinaryTransformationWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.opalgebraExtraordinaryTransformations;
    const effectiveWitness =
      witness ?? describeRelativeOpalgebraExtraordinaryTransformation(presentation);
    const report = analyzeRelativeOpalgebraExtraordinaryTransformation(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
      analysis: report.looseMonoidReport,
    };
  },
  opalgebraRightActionPresentation: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraRightActionPresentation;
    const effectiveWitness =
      witness ?? describeRelativeOpalgebraRightAction(presentation);
    const report = analyzeRelativeOpalgebraRightAction(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  opalgebraRightActionFromMonoid: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraRightActionFromMonoid;
    const effectiveWitness =
      witness ?? describeRelativeStreetAction(monad);
    const report = analyzeRelativeOpalgebraRightActionFromMonoid(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  opalgebraRepresentableActionBridge: (): RelativeAlgebraOracleResult =>
    pendingOracle(
      "opalgebraRepresentableActionBridge",
      "Representable Street bridge oracle awaits the data converting Definition 6.4 opalgebras into actions in X[j,B]_\iota^B together with the representability witnesses that compare the two presentations; implementation pending.",
    ),
  actionsRightLeftCoherence: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.actionsRightLeftCoherence;
    const effectiveWitness =
      witness ?? describeRelativeStreetAction(monad);
    const report = analyzeRelativeStreetActionCoherence(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsStreetActionData: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.actionsStreetActionData;
    const effectiveWitness =
      witness ?? describeRelativeStreetAction(monad);
    const report = analyzeRelativeStreetActionData(monad, effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsStreetActionHomomorphism: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetActionHomomorphismWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.actionsStreetActionHomomorphism;
    const effectiveWitness =
      witness ?? describeRelativeStreetActionHomomorphism(monad);
    const report = analyzeRelativeStreetActionHomomorphism(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsHomomorphismCategory: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetActionCategoryWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.actionsHomomorphismCategory;
    const effectiveWitness =
      witness ?? describeRelativeStreetActionCategory(monad);
    const report = analyzeRelativeStreetActionHomCategory(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsCanonicalSelfAction: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.actionsCanonicalSelfAction;
    const effectiveWitness =
      witness ?? describeRelativeStreetCanonicalAction(monad);
    const report = analyzeRelativeStreetCanonicalAction(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsLooseAdjunctionAction: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetLooseAdjunctionWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.actionsLooseAdjunctionAction;
    const effectiveWitness =
      witness ?? describeRelativeStreetLooseAdjunctionAction(monad);
    const report = analyzeRelativeStreetLooseAdjunctionAction(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsLooseAdjunctionRightAction: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetLooseAdjunctionWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsLooseAdjunctionRightAction;
    const effectiveWitness =
      witness ?? describeRelativeStreetLooseAdjunctionRightAction(monad);
    const report = analyzeRelativeStreetLooseAdjunctionRightAction(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsRepresentableRestriction: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetRepresentableRestrictionWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsRepresentableRestriction;
    const effectiveWitness =
      witness ?? describeRelativeStreetRepresentableRestriction(monad);
    const report = analyzeRelativeStreetRepresentableRestriction(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsRepresentableStreetSubmulticategory: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetRepresentableSubmulticategoryWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsRepresentableStreetSubmulticategory;
    const effectiveWitness =
      witness ?? describeRelativeStreetRepresentableSubmulticategory(monad);
    const report = analyzeRelativeStreetRepresentableSubmulticategory(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsRepresentableStreetActionDiagrams: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetRepresentableActionDiagramsWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsRepresentableStreetActionDiagrams;
    const effectiveWitness =
      witness ?? describeRelativeStreetRepresentableActionDiagrams(presentation);
    const report = analyzeRelativeStreetRepresentableActionDiagrams(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsRepresentableStreetActionHomomorphism: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetRepresentableActionHomomorphismWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsRepresentableStreetActionHomomorphism;
    const effectiveWitness =
      witness ?? describeRelativeStreetRepresentableActionHomomorphism(monad);
    const report = analyzeRelativeStreetRepresentableActionHomomorphism(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsRelativeAlgebraBridge: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.actionsRelativeAlgebraBridge;
    const effectiveWitness =
      witness ?? describeRelativeStreetAction(presentation.monad);
    const report = analyzeRelativeAlgebraStreetActionBridge(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  actionsAlgebraActionIsomorphism: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraStreetActionEquivalenceWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsAlgebraActionIsomorphism;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraStreetActionEquivalence(presentation);
    const report = analyzeRelativeAlgebraStreetActionEquivalence(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      analysis: report,
    };
  },
  actionsRepresentableActionIsomorphism: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeOpalgebraStreetActionEquivalenceWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsRepresentableActionIsomorphism;
    const effectiveWitness =
      witness ?? describeRelativeOpalgebraStreetActionEquivalence(presentation);
    const report = analyzeRelativeOpalgebraStreetActionEquivalence(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      analysis: report,
    };
  },
  actionsRepresentabilityUpgrade: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetRepresentabilityUpgradeWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsRepresentabilityUpgrade;
    const effectiveWitness =
      witness ?? describeRelativeStreetRepresentabilityUpgrade(monad);
    const report = analyzeRelativeStreetRepresentabilityUpgrade(
      monad,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      analysis: report,
    };
  },
  actionsRepresentabilityGeneralisation: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeStreetRepresentabilityGeneralisationWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsRepresentabilityGeneralisation;
    const effectiveWitness =
      witness ?? describeRelativeStreetRepresentabilityGeneralisationWitness(monad);
    const report = analyzeRelativeStreetRepresentabilityGeneralisation(
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  algebraRestrictionFunctor: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraRestrictionFunctorWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.algebraRestrictionFunctor;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraRestrictionFunctorWitness(presentation);
    const report = analyzeRelativeAlgebraRestrictionFunctor(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
      resolutionReport: report.resolutionReport,
      mediatingTightCellReport: report.mediatingTightCellReport,
      analysis: report,
    };
  },
  algebraIndexedFamily: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraIndexedFamilyWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.algebraIndexedFamily;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraIndexedFamilyWitness(monad);
    const report = analyzeRelativeAlgebraIndexedFamily(effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  algebraGlobalCategory: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraGlobalCategoryWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.algebraGlobalCategory;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraGlobalCategoryWitness(monad);
    const report = analyzeRelativeAlgebraGlobalCategory(effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  algebraMediatingTightCell: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraMediatingTightCellWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.algebraMediatingTightCell;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraMediatingTightCellWitness(monad);
    const report = analyzeRelativeAlgebraMediatingTightCell(effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
    };
  },
  algebraResolutionFromAlgebraObject: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraResolutionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.algebraResolutionFromAlgebraObject;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraResolutionWitness(monad);
    const report = analyzeRelativeAlgebraResolutionFromAlgebraObject(
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
      resolutionReport: report.resolutionReport,
      mediatingTightCellReport: report.mediatingTightCellReport,
      analysis: report,
    };
  },
  algebraCanonicalAction: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.algebraCanonicalAction;
    const report = analyzeRelativeAlgebraCanonicalAction(presentation);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  algebraIdentityRootEquivalence: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraIdentityRootWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.algebraIdentityRootEquivalence;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraIdentityRootWitness(presentation);
    const report = analyzeRelativeAlgebraIdentityRootEquivalence(
      presentation,
      effectiveWitness,
    );
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  kleisliUniversalProperty: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeKleisliPresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.kleisliUniversalProperty;
    const report = analyzeRelativeKleisliUniversalProperty(presentation);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  eilenbergMooreUniversalProperty: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeEilenbergMoorePresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.eilenbergMooreUniversalProperty;
    const report = analyzeRelativeEilenbergMooreUniversalProperty(presentation);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: report.witness,
      restrictionReport: report.restrictionReport,
      mediatingTightCellReport: report.mediatingTightCellReport,
      sectionReport: report.sectionReport,
      gradedExtensionReport: report.gradedExtensionReport,
      analysis: report,
    };
  },
  partialRightAdjointFunctor: <Obj, Arr, Payload, Evidence>(
    witness: RelativePartialRightAdjointWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.partialRightAdjointFunctor;
    const report = analyzeRelativePartialRightAdjointFunctor(witness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness,
      sectionReport: report.sectionReport,
      analysis: report.fullyFaithfulReport,
    };
  },
  opalgebraResolution: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativeOpalgebraResolutionWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.opalgebraResolution;
    const effectiveWitness =
      witness ?? describeRelativeOpalgebraResolutionWitness(presentation);
    const report = analyzeRelativeOpalgebraResolution(effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: effectiveWitness,
      resolutionReport: report.resolutionReport,
      kappaReport: report.kappaReport,
    };
  },
  partialLeftAdjointSection: <Obj, Arr, Payload, Evidence>(
    presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
    witness?: RelativePartialLeftAdjointWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeAlgebraOracleResult => {
    const descriptor = RelativeAlgebraLawRegistry.partialLeftAdjointSection;
    const effectiveWitness =
      witness ?? describeRelativePartialLeftAdjointWitness(presentation);
    const report = analyzeRelativePartialLeftAdjointSection(effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
      witness: effectiveWitness,
      resolutionReport: report.resolutionReport,
    };
  },
  strongerUniversalProperties: () =>
    pendingOracle("strongerUniversalProperties"),
  actionsTwoDimensionalModules: <Obj, Arr, Payload, Evidence>(
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeAlgebraTwoDimensionalModuleWitness<
      Obj,
      Arr,
      Payload,
      Evidence
    >,
  ): RelativeAlgebraOracleResult => {
    const descriptor =
      RelativeAlgebraLawRegistry.actionsTwoDimensionalModules;
    const effectiveWitness =
      witness ?? describeRelativeAlgebraTwoDimensionalModuleWitness(monad);
    const report = analyzeRelativeAlgebraTwoDimensionalModules(effectiveWitness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      witness: report.witness,
    };
  },
} as const;

export const enumerateRelativeAlgebraOracles = <Obj, Arr, Payload, Evidence>(
  kleisliPresentation: RelativeKleisliPresentation<Obj, Arr, Payload, Evidence>,
  emPresentation: RelativeEilenbergMoorePresentation<Obj, Arr, Payload, Evidence>,
  options?: {
    readonly algebraMorphism?: RelativeAlgebraMorphismPresentation<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
    readonly opalgebraMorphism?: RelativeOpalgebraMorphismPresentation<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
    readonly opalgebraDiagrams?: {
      readonly carrierTriangle: RelativeOpalgebraCarrierTriangleWitness<
        Obj,
        Arr,
        Payload,
        Evidence
      >;
      readonly extensionRectangle: RelativeOpalgebraExtensionRectangleWitness<
        Obj,
        Arr,
        Payload,
        Evidence
      >;
    };
    readonly extraordinaryTransformation?:
      RelativeOpalgebraExtraordinaryTransformationWitness<
        Obj,
        Arr,
        Payload,
        Evidence
      >;
  },
): ReadonlyArray<RelativeAlgebraOracleResult> => {
  const algebraMorphism =
    options?.algebraMorphism ??
    describeIdentityRelativeAlgebraMorphism({
      monad: emPresentation.monad,
      algebra: emPresentation.algebra,
    });
  const opalgebraMorphism =
    options?.opalgebraMorphism ??
    describeIdentityRelativeOpalgebraMorphism({
      monad: kleisliPresentation.monad,
      opalgebra: kleisliPresentation.opalgebra,
    });
  const diagrams =
    options?.opalgebraDiagrams ??
    describeRelativeOpalgebraDiagrams({
      monad: kleisliPresentation.monad,
      opalgebra: kleisliPresentation.opalgebra,
    });
  const extraordinaryTransformation =
    options?.extraordinaryTransformation ??
    describeRelativeOpalgebraExtraordinaryTransformation(kleisliPresentation);
  const canonicalAlgebraPresentation = describeRelativeAlgebraCanonicalAction(
    emPresentation.monad,
  );
  const canonicalOpalgebraPresentation = describeRelativeOpalgebraCanonicalAction(
    kleisliPresentation.monad,
  );
  const streetAction = describeRelativeStreetAction(kleisliPresentation.monad);
  const opalgebraStreetAction = describeRelativeOpalgebraRightAction(
    kleisliPresentation,
  );
  const streetHomomorphism = describeRelativeStreetActionHomomorphism(
    kleisliPresentation.monad,
    streetAction,
  );
  const streetHomCategory = describeRelativeStreetActionCategory(
    kleisliPresentation.monad,
    streetAction,
  );
  const canonicalStreetAction = describeRelativeStreetCanonicalAction(
    kleisliPresentation.monad,
  );
  const looseAdjunctionAction = describeRelativeStreetLooseAdjunctionAction(
    kleisliPresentation.monad,
    streetAction,
  );
  const looseAdjunctionRightAction =
    describeRelativeStreetLooseAdjunctionRightAction(
      kleisliPresentation.monad,
      streetAction,
    );
  const representableRestriction = describeRelativeStreetRepresentableRestriction(
    kleisliPresentation.monad,
    streetAction,
  );
  const algebraEquivalence = describeRelativeAlgebraStreetActionEquivalence(
    emPresentation,
    streetAction,
  );
  const representabilityUpgrade = describeRelativeStreetRepresentabilityUpgrade(
    kleisliPresentation.monad,
    streetAction,
  );
  const identityRootWitness = describeRelativeAlgebraIdentityRootWitness(
    emPresentation,
  );
  const gradedMorphismWitness =
    describeRelativeAlgebraGradedMorphism(algebraMorphism);
  const gradedAlternateWitness =
    describeRelativeAlgebraGradedAlternate(algebraMorphism);
  const gradedExtensionWitness =
    describeRelativeAlgebraGradedExtension(emPresentation);
  const representableSubmulticategoryWitness =
    describeRelativeStreetRepresentableSubmulticategory(
      kleisliPresentation.monad,
      representableRestriction,
    );
  const representableDiagramWitness =
    describeRelativeStreetRepresentableActionDiagrams(
      kleisliPresentation,
      streetAction,
    );
  const representableHomomorphismWitness =
    describeRelativeStreetRepresentableActionHomomorphism(
      kleisliPresentation.monad,
      representableRestriction,
    );
  const representableEquivalenceWitness =
    describeRelativeOpalgebraStreetActionEquivalence(
      kleisliPresentation,
      representableRestriction,
    );
  const representabilityGeneralisationWitness =
    describeRelativeStreetRepresentabilityGeneralisationWitness(
      kleisliPresentation.monad,
      streetAction,
    );
  const restrictionFunctorWitness =
    describeRelativeAlgebraRestrictionFunctorWitness(
      emPresentation,
      streetAction,
    );
  const opalgebraLiteratureWitness = describeRelativeOpalgebraLiteratureWitness(
    kleisliPresentation,
  );
  const opalgebraIdentityWitness = describeRelativeOpalgebraIdentityRootWitness(
    kleisliPresentation,
    streetAction,
  );
  const indexedFamilyWitness = describeRelativeAlgebraIndexedFamilyWitness(
    emPresentation.monad,
    emPresentation,
  );
  const globalCategoryWitness = describeRelativeAlgebraGlobalCategoryWitness(
    emPresentation.monad,
    emPresentation,
  );
  const mediatingTightCellWitness =
    describeRelativeAlgebraMediatingTightCellWitness(
      emPresentation.monad,
      emPresentation,
    );
  const resolutionWitness = describeRelativeAlgebraResolutionWitness(
    emPresentation.monad,
    emPresentation,
    undefined,
    mediatingTightCellWitness,
  );
  const twoDimensionalModuleWitness =
    describeRelativeAlgebraTwoDimensionalModuleWitness(
      emPresentation.monad,
    );

  return [
    RelativeAlgebraOracles.algebraFraming(emPresentation),
    RelativeAlgebraOracles.algebraMorphismCompatibility(algebraMorphism),
    RelativeAlgebraOracles.algebraGradedMorphisms(
      algebraMorphism,
      gradedMorphismWitness,
    ),
    RelativeAlgebraOracles.algebraGradedMorphismsAlternate(
      algebraMorphism,
      gradedAlternateWitness,
    ),
    RelativeAlgebraOracles.algebraGradedExtensionMorphisms(
      emPresentation,
      gradedExtensionWitness,
    ),
    RelativeAlgebraOracles.opalgebraFraming(kleisliPresentation),
    RelativeAlgebraOracles.opalgebraMorphismCompatibility(opalgebraMorphism),
    RelativeAlgebraOracles.opalgebraCarrierTriangle(
      kleisliPresentation,
      diagrams.carrierTriangle,
    ),
    RelativeAlgebraOracles.opalgebraExtensionRectangle(
      kleisliPresentation,
      diagrams.extensionRectangle,
    ),
    RelativeAlgebraOracles.opalgebraLiteratureRecoveries(
      kleisliPresentation,
      opalgebraLiteratureWitness,
    ),
    RelativeAlgebraOracles.opalgebraIdentityRootEquivalence(
      kleisliPresentation,
      opalgebraIdentityWitness,
    ),
    RelativeAlgebraOracles.opalgebraCanonicalAction(
      canonicalOpalgebraPresentation,
    ),
    RelativeAlgebraOracles.opalgebraExtraordinaryTransformations(
      kleisliPresentation,
      extraordinaryTransformation,
    ),
    RelativeAlgebraOracles.opalgebraRightActionPresentation(
      kleisliPresentation,
      opalgebraStreetAction,
    ),
    RelativeAlgebraOracles.opalgebraRightActionFromMonoid(
      kleisliPresentation.monad,
      streetAction,
    ),
    RelativeAlgebraOracles.opalgebraRepresentableActionBridge(),
    RelativeAlgebraOracles.actionsRightLeftCoherence(
      kleisliPresentation.monad,
      streetAction,
    ),
    RelativeAlgebraOracles.actionsStreetActionData(
      kleisliPresentation.monad,
      streetAction,
    ),
    RelativeAlgebraOracles.actionsStreetActionHomomorphism(
      kleisliPresentation.monad,
      streetHomomorphism,
    ),
    RelativeAlgebraOracles.actionsHomomorphismCategory(
      kleisliPresentation.monad,
      streetHomCategory,
    ),
    RelativeAlgebraOracles.actionsCanonicalSelfAction(
      kleisliPresentation.monad,
      canonicalStreetAction,
    ),
    RelativeAlgebraOracles.actionsLooseAdjunctionAction(
      kleisliPresentation.monad,
      looseAdjunctionAction,
    ),
    RelativeAlgebraOracles.actionsLooseAdjunctionRightAction(
      kleisliPresentation.monad,
      looseAdjunctionRightAction,
    ),
    RelativeAlgebraOracles.actionsRepresentableRestriction(
      kleisliPresentation.monad,
      representableRestriction,
    ),
    RelativeAlgebraOracles.actionsRepresentableStreetSubmulticategory(
      kleisliPresentation.monad,
      representableSubmulticategoryWitness,
    ),
    RelativeAlgebraOracles.actionsRepresentableStreetActionDiagrams(
      kleisliPresentation,
      representableDiagramWitness,
    ),
    RelativeAlgebraOracles.actionsRepresentableStreetActionHomomorphism(
      kleisliPresentation.monad,
      representableHomomorphismWitness,
    ),
    RelativeAlgebraOracles.actionsRelativeAlgebraBridge(
      emPresentation,
      streetAction,
    ),
    RelativeAlgebraOracles.actionsAlgebraActionIsomorphism(
      emPresentation,
      algebraEquivalence,
    ),
    RelativeAlgebraOracles.actionsRepresentableActionIsomorphism(
      kleisliPresentation,
      representableEquivalenceWitness,
    ),
    RelativeAlgebraOracles.actionsRepresentabilityUpgrade(
      kleisliPresentation.monad,
      representabilityUpgrade,
    ),
    RelativeAlgebraOracles.actionsRepresentabilityGeneralisation(
      kleisliPresentation.monad,
      representabilityGeneralisationWitness,
    ),
    RelativeAlgebraOracles.algebraRestrictionFunctor(
      emPresentation,
      restrictionFunctorWitness,
    ),
    RelativeAlgebraOracles.algebraIndexedFamily(
      emPresentation.monad,
      indexedFamilyWitness,
    ),
    RelativeAlgebraOracles.algebraGlobalCategory(
      emPresentation.monad,
      globalCategoryWitness,
    ),
    RelativeAlgebraOracles.algebraMediatingTightCell(
      emPresentation.monad,
      mediatingTightCellWitness,
    ),
    RelativeAlgebraOracles.algebraResolutionFromAlgebraObject(
      emPresentation.monad,
      resolutionWitness,
    ),
    RelativeAlgebraOracles.opalgebraResolution(kleisliPresentation),
    RelativeAlgebraOracles.partialLeftAdjointSection(kleisliPresentation),
    RelativeAlgebraOracles.algebraCanonicalAction(canonicalAlgebraPresentation),
    RelativeAlgebraOracles.algebraIdentityRootEquivalence(
      emPresentation,
      identityRootWitness,
    ),
    RelativeAlgebraOracles.kleisliUniversalProperty(kleisliPresentation),
    RelativeAlgebraOracles.eilenbergMooreUniversalProperty(emPresentation),
    RelativeAlgebraOracles.strongerUniversalProperties(),
    RelativeAlgebraOracles.actionsTwoDimensionalModules(
      emPresentation.monad,
      twoDimensionalModuleWitness,
    ),
  ];
};
