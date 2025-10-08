import type {
  Equipment2Cell,
  EquipmentVerticalBoundary,
} from "../virtual-equipment";
import {
  defaultObjectEquality,
  identityVerticalBoundary,
  verticalBoundariesEqual,
} from "../virtual-equipment";
import type {
  LooseMonoidData,
  LooseMonoidShapeReport,
} from "../virtual-equipment/loose-structures";
import { analyzeLooseMonoidShape } from "../virtual-equipment/loose-structures";
import type { RelativeAdjunctionData } from "./relative-adjunctions";
import type { RelativeMonadData } from "./relative-monads";

export interface RelativeOpalgebraData<Obj, Arr, Payload, Evidence> {
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly action: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraData<Obj, Arr, Payload, Evidence> {
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly action: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly opalgebra: RelativeOpalgebraData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeOpalgebraCarrierTriangleWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly codomain: EquipmentVerticalBoundary<Obj, Arr>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly action: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeOpalgebraExtensionRectangleWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly codomain: EquipmentVerticalBoundary<Obj, Arr>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly extension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly action: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly algebra: RelativeAlgebraData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeOpalgebraExtraordinaryTransformationWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly looseMonad: LooseMonoidData<Obj, Arr, Payload, Evidence>;
  readonly action: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeStreetActionWitness<Obj, Arr, Payload, Evidence> {
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly action: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly identity: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly leftUnitor: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly rightUnitor: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly associator: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly rightAction: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeStreetActionReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
}

export interface RelativeStreetActionHomomorphismWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly source: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly target: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly morphism: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly redComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly greenComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeStreetActionHomomorphismReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeStreetActionHomomorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeStreetActionCategoryWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly action: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly identity: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly composition: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeStreetActionCategoryReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeStreetActionCategoryWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeStreetLooseAdjunctionWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly streetAction: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly counit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeStreetLooseAdjunctionReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeStreetLooseAdjunctionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeStreetRepresentableRestrictionWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly streetAction: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly representableCarriers: ReadonlyArray<
    EquipmentVerticalBoundary<Obj, Arr>
  >;
  readonly details?: string;
}

export interface RelativeStreetRepresentableRestrictionReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeStreetRepresentableSubmulticategoryWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly restriction: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly representableCells: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>;
  readonly details?: string;
}

export interface RelativeStreetRepresentableSubmulticategoryReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly restrictionReport: RelativeStreetRepresentableRestrictionReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly witness: RelativeStreetRepresentableSubmulticategoryWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeStreetRepresentableActionDiagramsWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly streetAction: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly opalgebra: RelativeOpalgebraData<Obj, Arr, Payload, Evidence>;
  readonly rhoComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly lambdaComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly muComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeStreetRepresentableActionDiagramsReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeStreetRepresentableActionDiagramsWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeStreetRepresentableActionHomomorphismWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly homomorphism: RelativeStreetActionHomomorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly restriction: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeStreetRepresentableActionHomomorphismReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly homomorphismReport: RelativeStreetActionHomomorphismReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly restrictionReport: RelativeStreetRepresentableRestrictionReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly witness: RelativeStreetRepresentableActionHomomorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeOpalgebraRepresentableActionBridgeReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly actionReport: RelativeStreetActionReport<Obj, Arr, Payload, Evidence>;
  readonly restrictionReport: RelativeStreetRepresentableRestrictionReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly witness: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeOpalgebraStreetActionEquivalenceWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly streetAction: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly recoveredOpalgebra: RelativeOpalgebraData<Obj, Arr, Payload, Evidence>;
  readonly streetComparison?: RelativeStreetActionHomomorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly opalgebraComparison?: RelativeOpalgebraMorphismPresentation<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeOpalgebraStreetActionEquivalenceReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly bridge: RelativeOpalgebraRepresentableActionBridgeReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly recovery: RelativeStreetRepresentableActionHomomorphismReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly witness: RelativeOpalgebraStreetActionEquivalenceWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeStreetRepresentabilityGeneralisationWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly streetAction: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly representabilityWitness: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly comparisonDetails?: string;
}

export interface RelativeStreetRepresentabilityGeneralisationReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeStreetRepresentabilityGeneralisationWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraRestrictionFunctorMorphismWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly algebra: RelativeAlgebraMorphismPresentation<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly image: RelativeStreetActionHomomorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraRestrictionFunctorWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly streetAction: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly morphism?: RelativeAlgebraRestrictionFunctorMorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly faithfulnessWitness?: unknown;
  readonly details?: string;
}

export interface RelativeAlgebraRestrictionFunctorReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly actionReport: RelativeStreetActionReport<Obj, Arr, Payload, Evidence>;
  readonly morphismReport?: RelativeMorphismCompatibilityReport;
  readonly homomorphismReport?: RelativeStreetActionHomomorphismReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly witness: RelativeAlgebraRestrictionFunctorWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraIndexedFamilyWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly fibres: ReadonlyArray<RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>>;
  readonly restrictionMorphisms: ReadonlyArray<
    RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>
  >;
  readonly details?: string;
}

export interface RelativeAlgebraIndexedFamilyReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeAlgebraIndexedFamilyWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraGlobalCategoryWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly objects: ReadonlyArray<RelativeAlgebraData<Obj, Arr, Payload, Evidence>>;
  readonly morphisms: ReadonlyArray<RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>>;
  readonly details?: string;
}

export interface RelativeAlgebraGlobalCategoryReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeAlgebraGlobalCategoryWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraMediatingTightCellWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly target: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly tightCell: EquipmentVerticalBoundary<Obj, Arr>;
  readonly unitComparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly extensionComparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraMediatingTightCellReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeAlgebraMediatingTightCellWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraResolutionWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly algebra: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly resolutionAdjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly comparisonMonad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraResolutionReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeAlgebraResolutionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraTwoDimensionalModuleWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly moduleWitness?: unknown;
  readonly reductionWitness?: unknown;
  readonly details?: string;
}

export interface RelativeAlgebraTwoDimensionalModuleReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeAlgebraTwoDimensionalModuleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraStreetActionEquivalenceWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly streetAction: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly recoveredAlgebra: RelativeAlgebraData<Obj, Arr, Payload, Evidence>;
  readonly streetComparison?: RelativeStreetActionHomomorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly algebraComparison?: RelativeAlgebraMorphismPresentation<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeAlgebraStreetActionBridgeReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
}

export interface RelativeStreetActionAlgebraBridgeReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly algebra: RelativeAlgebraData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAlgebraStreetActionEquivalenceReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly bridge: RelativeAlgebraStreetActionBridgeReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly recovery: RelativeStreetActionAlgebraBridgeReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly streetComparison?: RelativeStreetActionHomomorphismReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly algebraComparison?: RelativeMorphismCompatibilityReport;
}

export interface RelativeStreetRepresentabilityUpgradeWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly action: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly representability: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly companions?: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>;
  readonly details?: string;
}

export interface RelativeStreetRepresentabilityUpgradeReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly actionReport: RelativeStreetActionReport<Obj, Arr, Payload, Evidence>;
  readonly representabilityReport: RelativeStreetRepresentableRestrictionReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraIdentityRootWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly object: Obj;
  readonly ordinaryCarrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly ordinaryAction: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraIdentityRootReport {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeOpalgebraLiteratureWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly moduleWitness?: unknown;
  readonly kleisliWitness?: unknown;
  readonly relativeModuleWitness?: unknown;
  readonly details?: string;
}

export interface RelativeOpalgebraLiteratureReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeOpalgebraLiteratureWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeOpalgebraIdentityRootWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly streetAction: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>;
  readonly comparison?: RelativeStreetActionHomomorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeOpalgebraIdentityRootReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeOpalgebraIdentityRootWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraFramingReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeOpalgebraFramingReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeOpalgebraMorphismPresentation<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly source: RelativeOpalgebraData<Obj, Arr, Payload, Evidence>;
  readonly target: RelativeOpalgebraData<Obj, Arr, Payload, Evidence>;
  readonly morphism: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly source: RelativeAlgebraData<Obj, Arr, Payload, Evidence>;
  readonly target: RelativeAlgebraData<Obj, Arr, Payload, Evidence>;
  readonly morphism: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraGradedMorphismWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly presentation: RelativeAlgebraMorphismPresentation<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly grading: ReadonlyArray<EquipmentVerticalBoundary<Obj, Arr>>;
  readonly redComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly greenComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraGradedMorphismReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeAlgebraGradedMorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraGradedAlternateWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly graded: RelativeAlgebraGradedMorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly pastedComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraGradedAlternateReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeAlgebraGradedAlternateWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAlgebraGradedExtensionWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly grading: ReadonlyArray<EquipmentVerticalBoundary<Obj, Arr>>;
  readonly extension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraGradedExtensionReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeAlgebraGradedExtensionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeKleisliPresentation<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly opalgebra: RelativeOpalgebraData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeEilenbergMoorePresentation<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly algebra: RelativeAlgebraData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeUniversalPropertyReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeMorphismCompatibilityReport {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeOpalgebraDiagramReport<
  Obj,
  Arr,
  Payload,
  Evidence,
  Witness,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: Witness;
}

export interface RelativeCanonicalActionReport {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeOpalgebraExtraordinaryTransformationReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly looseMonoidReport: LooseMonoidShapeReport;
  readonly witness: RelativeOpalgebraExtraordinaryTransformationWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

const ensureBoundary = <Obj, Arr>(
  equality: (left: Obj, right: Obj) => boolean,
  actual: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
  issues: string[],
): void => {
  if (!verticalBoundariesEqual(equality, actual, expected)) {
    issues.push(`${label} must reuse the specified tight boundary.`);
  }
};

const framingDetails = (prefix: string, issues: string[]): string =>
  issues.length === 0
    ? prefix
    : `${prefix.replace(/\.$/, "")} issues: ${issues.join("; ")}`;

const morphismDetails = (
  successDetails: string,
  issues: string[],
  pendingReason: string,
): RelativeMorphismCompatibilityReport => {
  if (issues.length > 0) {
    return {
      holds: false,
      pending: false,
      issues,
      details: `Relative morphism structural issues: ${issues.join("; ")}`,
    };
  }
  return {
    holds: false,
    pending: true,
    issues,
    details: `${successDetails} ${pendingReason}`.trim(),
  };
};

export const analyzeRelativeAlgebraFraming = <Obj, Arr, Payload, Evidence>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraFramingReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    presentation.algebra.action.boundaries.left,
    presentation.monad.root,
    "Relative algebra action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.algebra.action.boundaries.right,
    presentation.algebra.carrier,
    "Relative algebra action right boundary",
    issues,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: framingDetails(
      "Relative algebra action reuses the j-root and algebra carrier boundaries.",
      issues,
    ),
  };
};

export const analyzeRelativeOpalgebraFraming = <Obj, Arr, Payload, Evidence>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraFramingReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    presentation.opalgebra.action.boundaries.left,
    presentation.opalgebra.carrier,
    "Relative opalgebra action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.opalgebra.action.boundaries.right,
    presentation.monad.carrier,
    "Relative opalgebra action right boundary",
    issues,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: framingDetails(
      "Relative opalgebra action reuses the carrier and monad tight boundaries.",
      issues,
    ),
  };
};

export const analyzeRelativeAlgebraMorphismCompatibility = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>,
): RelativeMorphismCompatibilityReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    presentation.morphism.boundaries.left,
    presentation.source.carrier,
    "Relative algebra morphism left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.morphism.boundaries.right,
    presentation.target.carrier,
    "Relative algebra morphism right boundary",
    issues,
  );

  return morphismDetails(
    "Relative algebra morphism boundaries align with the source and target carriers.",
    issues,
    "Street pasting comparison pending until E(j,α)/E(t,α) witnesses are available.",
  );
};

export const analyzeRelativeOpalgebraMorphismCompatibility = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraMorphismPresentation<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeMorphismCompatibilityReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    presentation.morphism.boundaries.left,
    presentation.source.carrier,
    "Relative opalgebra morphism left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.morphism.boundaries.right,
    presentation.target.carrier,
    "Relative opalgebra morphism right boundary",
    issues,
  );

  return morphismDetails(
    "Relative opalgebra morphism boundaries align with the source and target carriers.",
    issues,
    "Street pasting comparison pending until E(j,α)/E(t,α) witnesses are available.",
  );
};

export const analyzeRelativeAlgebraGradedMorphisms = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeAlgebraGradedMorphismWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraGradedMorphismReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (witness.presentation !== presentation) {
    issues.push(
      "Graded morphism witness must reuse the supplied algebra morphism presentation.",
    );
  }

  if (witness.grading.length === 0) {
    issues.push("Graded morphism witness must record at least one grading boundary.");
  }

  const checkComposite = (
    cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
    label: string,
  ) => {
    ensureBoundary(
      equality,
      cell.boundaries.left,
      presentation.source.carrier,
      `${label} left boundary`,
      issues,
    );
    ensureBoundary(
      equality,
      cell.boundaries.right,
      presentation.target.carrier,
      `${label} right boundary`,
      issues,
    );
  };

  checkComposite(witness.redComposite, "Graded morphism red composite");
  checkComposite(witness.greenComposite, "Graded morphism green composite");

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Graded relative algebra morphism recorded; Definition 6.29 witnesses pending."
      : `Graded relative algebra morphism issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeAlgebraGradedMorphismsAlternate = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeAlgebraGradedAlternateWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraGradedAlternateReport<Obj, Arr, Payload, Evidence> => {
  const baseReport = analyzeRelativeAlgebraGradedMorphisms(
    presentation,
    witness.graded,
  );
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues = [...baseReport.issues];

  ensureBoundary(
    equality,
    witness.pastedComposite.boundaries.left,
    witness.graded.redComposite.boundaries.left,
    "Graded morphism pasted composite left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.pastedComposite.boundaries.right,
    witness.graded.redComposite.boundaries.right,
    "Graded morphism pasted composite right boundary",
    issues,
  );

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Graded morphism pasted composite recorded; Remark 6.30 witnesses pending."
      : `Graded morphism pasted composite issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeAlgebraGradedExtensionMorphisms = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeAlgebraGradedExtensionWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraGradedExtensionReport<Obj, Arr, Payload, Evidence> => {
  const issues: string[] = [];

  if (witness.presentation !== presentation) {
    issues.push(
      "Graded extension witness must reuse the supplied relative algebra presentation.",
    );
  }

  if (witness.grading.length === 0) {
    issues.push(
      "Graded extension witness must list the grading boundaries supplied by the extension operator.",
    );
  }

  if (witness.extension !== presentation.monad.extension) {
    issues.push(
      "Graded extension witness must reuse the relative monad extension 2-cell.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Extension-induced graded morphism recorded; Example 6.31 witnesses pending."
      : `Extension-induced graded morphism issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeOpalgebraCarrierTriangle = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeOpalgebraCarrierTriangleWitness<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraDiagramReport<
  Obj,
  Arr,
  Payload,
  Evidence,
  RelativeOpalgebraCarrierTriangleWitness<Obj, Arr, Payload, Evidence>
> => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    witness.carrier,
    presentation.opalgebra.carrier,
    "Relative opalgebra carrier triangle must reuse the opalgebra carrier boundary.",
    issues,
  );
  ensureBoundary(
    equality,
    witness.codomain,
    presentation.opalgebra.action.boundaries.right,
    "Relative opalgebra carrier triangle codomain must match the opalgebra action target boundary.",
    issues,
  );
  if (witness.unit !== presentation.monad.unit) {
    issues.push(
      "Relative opalgebra carrier triangle must reuse the relative monad unit 2-cell.",
    );
  }
  if (witness.action !== presentation.opalgebra.action) {
    issues.push(
      "Relative opalgebra carrier triangle must reuse the opalgebra action 2-cell.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Relative opalgebra carrier triangle witnesses recorded; Street comparison pending."
      : `Relative opalgebra carrier triangle structural issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeOpalgebraExtensionRectangle = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeOpalgebraExtensionRectangleWitness<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraDiagramReport<
  Obj,
  Arr,
  Payload,
  Evidence,
  RelativeOpalgebraExtensionRectangleWitness<Obj, Arr, Payload, Evidence>
> => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    witness.carrier,
    presentation.opalgebra.carrier,
    "Relative opalgebra extension rectangle must reuse the opalgebra carrier boundary.",
    issues,
  );
  ensureBoundary(
    equality,
    witness.codomain,
    presentation.opalgebra.action.boundaries.right,
    "Relative opalgebra extension rectangle codomain must match the opalgebra action target boundary.",
    issues,
  );
  if (witness.extension !== presentation.monad.extension) {
    issues.push(
      "Relative opalgebra extension rectangle must reuse the relative monad extension 2-cell.",
    );
  }
  if (witness.action !== presentation.opalgebra.action) {
    issues.push(
      "Relative opalgebra extension rectangle must reuse the opalgebra action 2-cell.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Relative opalgebra extension rectangle witnesses recorded; Street comparison pending."
      : `Relative opalgebra extension rectangle structural issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeAlgebraCanonicalAction = <Obj, Arr, Payload, Evidence>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeCanonicalActionReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (
    !verticalBoundariesEqual(
      equality,
      presentation.algebra.carrier,
      presentation.monad.carrier,
    )
  ) {
    issues.push("Relative canonical algebra carrier must reuse the monad tight leg.");
  }

  if (presentation.algebra.action !== presentation.monad.extension) {
    issues.push("Relative canonical algebra action must reuse the monad extension 2-cell.");
  }

  if (presentation.algebra.action.boundaries.left !== presentation.monad.root) {
    issues.push(
      "Relative canonical algebra action must keep the root boundary on the left.",
    );
  }

  if (
    !verticalBoundariesEqual(
      equality,
      presentation.algebra.action.boundaries.right,
      presentation.algebra.carrier,
    )
  ) {
    issues.push(
      "Relative canonical algebra action must target the canonical algebra carrier.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Relative canonical algebra recorded; Proposition 6.12 comparison witnesses pending."
      : `Relative canonical algebra issues: ${issues.join("; ")}`,
  };
};

export const analyzeRelativeOpalgebraCanonicalAction = <Obj, Arr, Payload, Evidence>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeCanonicalActionReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (
    !verticalBoundariesEqual(
      equality,
      presentation.opalgebra.carrier,
      presentation.monad.carrier,
    )
  ) {
    issues.push("Relative canonical opalgebra carrier must reuse the monad tight leg.");
  }

  if (presentation.opalgebra.action !== presentation.monad.unit) {
    issues.push("Relative canonical opalgebra action must reuse the monad unit 2-cell.");
  }

  if (presentation.opalgebra.action.boundaries.left !== presentation.monad.root) {
    issues.push(
      "Relative canonical opalgebra action must keep the root boundary on the left.",
    );
  }

  if (
    !verticalBoundariesEqual(
      equality,
      presentation.opalgebra.action.boundaries.right,
      presentation.opalgebra.carrier,
    )
  ) {
    issues.push(
      "Relative canonical opalgebra action must target the canonical opalgebra carrier.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Relative canonical opalgebra recorded; Proposition 6.19 comparison witnesses pending."
      : `Relative canonical opalgebra issues: ${issues.join("; ")}`,
  };
};

export const analyzeRelativeOpalgebraExtraordinaryTransformation = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeOpalgebraExtraordinaryTransformationWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeOpalgebraExtraordinaryTransformationReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const structuralIssues: string[] = [];

  const looseMonoidReport = analyzeLooseMonoidShape(
    presentation.monad.equipment,
    witness.looseMonad,
  );

  const monadLoose = presentation.monad.looseCell;
  const witnessLoose = witness.looseMonad.looseCell;

  if (!equality(witness.looseMonad.object, monadLoose.from)) {
    structuralIssues.push(
      "Extraordinary transformation loose monad object must match the relative monad loose arrow domain.",
    );
  }

  if (!equality(witnessLoose.from, monadLoose.from)) {
    structuralIssues.push(
      "Extraordinary transformation loose arrow must start at the relative monad loose arrow domain.",
    );
  }

  if (!equality(witnessLoose.to, monadLoose.to)) {
    structuralIssues.push(
      "Extraordinary transformation loose arrow must end at the relative monad loose arrow codomain.",
    );
  }

  if (witnessLoose !== monadLoose) {
    structuralIssues.push(
      "Extraordinary transformation loose arrow should reuse the relative monad loose arrow witness.",
    );
  }

  ensureBoundary(
    equality,
    witness.action.boundaries.left,
    presentation.monad.root,
    "Extraordinary transformation action left boundary",
    structuralIssues,
  );

  ensureBoundary(
    equality,
    witness.action.boundaries.right,
    presentation.opalgebra.carrier,
    "Extraordinary transformation action right boundary",
    structuralIssues,
  );

  if (witness.action !== presentation.opalgebra.action) {
    structuralIssues.push(
      "Extraordinary transformation action must coincide with the recorded relative opalgebra action.",
    );
  }

  const issues = [...structuralIssues];
  if (!looseMonoidReport.holds) {
    issues.push(
      `Loose monad shape issues: ${looseMonoidReport.issues.join("; ")}`,
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Relative opalgebra extraordinary transformation recorded; comparison with Lemma 6.7 witnesses pending."
      : `Relative opalgebra extraordinary transformation issues: ${issues.join("; ")}`,
    looseMonoidReport,
    witness,
  };
};

export const analyzeRelativeStreetActionData = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    witness.carrier,
    monad.carrier,
    "Street action carrier boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.action.boundaries.left,
    monad.root,
    "Street action 2-cell left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.action.boundaries.right,
    witness.carrier,
    "Street action 2-cell right boundary",
    issues,
  );

  if (witness.action.source !== monad.extension.source) {
    issues.push(
      "Street action 2-cell must share the relative monad loose source frame.",
    );
  }
  if (witness.action.target !== monad.extension.target) {
    issues.push(
      "Street action 2-cell must share the relative monad loose target frame.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Street action data recorded; Street comparison witnesses pending."
      : `Street action data issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetActionCoherence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const checkCoherence = (
    cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
    label: string,
  ) => {
    ensureBoundary(
      equality,
      cell.boundaries.left,
      witness.action.boundaries.left,
      `${label} left boundary`,
      issues,
    );
    ensureBoundary(
      equality,
      cell.boundaries.right,
      witness.action.boundaries.right,
      `${label} right boundary`,
      issues,
    );
  };

  checkCoherence(witness.identity, "Street action identity");
  checkCoherence(witness.leftUnitor, "Street action left unitor");
  checkCoherence(witness.rightUnitor, "Street action right unitor");
  checkCoherence(witness.associator, "Street action associator");
  checkCoherence(witness.rightAction, "Street action right-action composite");

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Street action coherence recorded; Street comparison witnesses pending."
      : `Street action coherence issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetActionHomomorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetActionHomomorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetActionHomomorphismReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    witness.morphism.boundaries.left,
    witness.source.action.boundaries.left,
    "Street action homomorphism left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.morphism.boundaries.right,
    witness.target.action.boundaries.right,
    "Street action homomorphism right boundary",
    issues,
  );

  const checkComposite = (
    cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
    label: string,
  ) => {
    ensureBoundary(
      equality,
      cell.boundaries.left,
      witness.source.action.boundaries.left,
      `${label} left boundary`,
      issues,
    );
    ensureBoundary(
      equality,
      cell.boundaries.right,
      witness.target.action.boundaries.right,
      `${label} right boundary`,
      issues,
    );
  };

  checkComposite(witness.redComposite, "Street action homomorphism red composite");
  checkComposite(
    witness.greenComposite,
    "Street action homomorphism green composite",
  );

  if (witness.redComposite !== witness.greenComposite) {
    issues.push(
      "Street action homomorphism composites should coincide until Street calculus witnesses land.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Street action homomorphism recorded; Street comparison witnesses pending."
      : `Street action homomorphism issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetActionHomCategory = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetActionCategoryWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionCategoryReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const actionReport = analyzeRelativeStreetActionCoherence(
    monad,
    witness.action,
  );
  issues.push(...actionReport.issues);

  const expectedLeft = witness.action.action.boundaries.left;
  const expectedRight = witness.action.action.boundaries.right;

  ensureBoundary(
    equality,
    witness.identity.boundaries.left,
    expectedLeft,
    "Street action hom-category identity left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.identity.boundaries.right,
    expectedRight,
    "Street action hom-category identity right boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.composition.boundaries.left,
    expectedLeft,
    "Street action hom-category composition left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.composition.boundaries.right,
    expectedRight,
    "Street action hom-category composition right boundary",
    issues,
  );

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Street action hom-category recorded; Street comparison witnesses pending."
      : `Street action hom-category issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeOpalgebraRightAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    witness.carrier,
    presentation.opalgebra.carrier,
    "Street action carrier boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.action.boundaries.left,
    presentation.monad.root,
    "Street action 2-cell left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.action.boundaries.right,
    presentation.opalgebra.carrier,
    "Street action 2-cell right boundary",
    issues,
  );

  if (witness.action !== presentation.opalgebra.action) {
    issues.push(
      "Street action 2-cell must reuse the recorded relative opalgebra action.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Relative opalgebra recorded as Street action; Street witnesses pending."
      : `Relative opalgebra Street action issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeOpalgebraRightActionFromMonoid = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionReport<Obj, Arr, Payload, Evidence> => {
  const actionReport = analyzeRelativeStreetActionCoherence(monad, witness);
  const issues = [...actionReport.issues];

  ensureBoundary(
    monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>,
    witness.carrier,
    monad.carrier,
    "Street action carrier boundary",
    issues,
  );

  if (witness.action !== monad.extension) {
    issues.push(
      "Monoid-induced Street action must reuse the relative monad extension 2-cell.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Monoid-induced Street action recorded; Street comparison witnesses pending."
      : `Monoid-induced Street action issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetCanonicalAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionReport<Obj, Arr, Payload, Evidence> => {
  const actionReport = analyzeRelativeStreetActionCoherence(monad, witness);
  const issues = [...actionReport.issues];

  if (witness.action !== monad.extension) {
    issues.push(
      "Canonical Street action must reuse the relative monad extension 2-cell.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Canonical Street action recorded; Proposition 6.12 witnesses pending."
      : `Canonical Street action issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetLooseAdjunctionAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetLooseAdjunctionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetLooseAdjunctionReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const actionReport = analyzeRelativeStreetActionCoherence(
    monad,
    witness.streetAction,
  );
  issues.push(...actionReport.issues);

  ensureBoundary(
    equality,
    witness.unit.boundaries.left,
    monad.root,
    "Loose adjunction unit left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.unit.boundaries.right,
    witness.streetAction.carrier,
    "Loose adjunction unit right boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.counit.boundaries.left,
    monad.root,
    "Loose adjunction counit left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.counit.boundaries.right,
    witness.streetAction.carrier,
    "Loose adjunction counit right boundary",
    issues,
  );

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Loose adjunction Street action recorded; Proposition 6.13 witnesses pending."
      : `Loose adjunction Street action issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetLooseAdjunctionRightAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetLooseAdjunctionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetLooseAdjunctionReport<Obj, Arr, Payload, Evidence> => {
  const baseReport = analyzeRelativeStreetLooseAdjunctionAction(monad, witness);
  const issues = [...baseReport.issues];

  if (witness.streetAction.action !== monad.extension) {
    issues.push(
      "Loose adjunction Street right action must reuse the relative monad extension 2-cell.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Loose adjunction Street right action recorded; Proposition 6.20 witnesses pending."
      : `Loose adjunction Street right action issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetRepresentableRestriction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetRepresentableRestrictionReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const equality =
    monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const actionReport = analyzeRelativeStreetActionCoherence(
    monad,
    witness.streetAction,
  );
  issues.push(...actionReport.issues);

  const representsCarrier = witness.representableCarriers.some((candidate) =>
    verticalBoundariesEqual(equality, candidate, witness.streetAction.carrier),
  );

  if (!representsCarrier) {
    issues.push(
      "Representable Street restriction must mark the Street action carrier as representable.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Representable Street restriction recorded; Definition 6.14 witnesses pending."
      : `Representable Street restriction issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetRepresentableSubmulticategory = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetRepresentableSubmulticategoryWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetRepresentableSubmulticategoryReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const restrictionReport = analyzeRelativeStreetRepresentableRestriction(
    monad,
    witness.restriction,
  );
  const equality =
    monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues = [...restrictionReport.issues];

  witness.representableCells.forEach((cell, index) => {
    const label = `Representable Street cell #${index + 1}`;
    ensureBoundary(
      equality,
      cell.boundaries.left,
      witness.restriction.streetAction.carrier,
      `${label} left boundary`,
      issues,
    );
    ensureBoundary(
      equality,
      cell.boundaries.right,
      witness.restriction.streetAction.carrier,
      `${label} right boundary`,
      issues,
    );
  });

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Representable Street sub-multicategory recorded; Definition 6.21 witnesses pending."
      : `Representable Street sub-multicategory issues: ${issues.join("; ")}`,
    restrictionReport,
    witness,
  };
};

export const analyzeRelativeStreetRepresentableActionDiagrams = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetRepresentableActionDiagramsWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetRepresentableActionDiagramsReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const actionReport = analyzeRelativeStreetActionCoherence(
    presentation.monad,
    witness.streetAction,
  );
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues = [...actionReport.issues];

  ensureBoundary(
    equality,
    witness.streetAction.carrier,
    presentation.opalgebra.carrier,
    "Representable Street action carrier",
    issues,
  );

  if (witness.streetAction.action !== presentation.opalgebra.action) {
    issues.push(
      "Representable Street action must reuse the opalgebra action 2-cell.",
    );
  }

  const checkDiagram = (
    cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
    label: string,
  ) => {
    ensureBoundary(
      equality,
      cell.boundaries.left,
      witness.streetAction.action.boundaries.left,
      `${label} left boundary`,
      issues,
    );
    ensureBoundary(
      equality,
      cell.boundaries.right,
      witness.streetAction.action.boundaries.right,
      `${label} right boundary`,
      issues,
    );
  };

  checkDiagram(witness.rhoComposite, "Representable Street diagram ρ");
  checkDiagram(witness.lambdaComposite, "Representable Street diagram λ");
  checkDiagram(witness.muComposite, "Representable Street diagram μ");

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Representable Street action diagrams recorded; Definition 6.21 witnesses pending."
      : `Representable Street action diagram issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetRepresentableActionHomomorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetRepresentableActionHomomorphismWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetRepresentableActionHomomorphismReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const restrictionReport = analyzeRelativeStreetRepresentableRestriction(
    monad,
    witness.restriction,
  );
  const homomorphismReport = analyzeRelativeStreetActionHomomorphism(
    monad,
    witness.homomorphism,
  );
  const equality =
    monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues = [
    ...restrictionReport.issues,
    ...homomorphismReport.issues,
  ];

  ensureBoundary(
    equality,
    witness.homomorphism.target.carrier,
    witness.restriction.streetAction.carrier,
    "Representable Street homomorphism target",
    issues,
  );

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Representable Street homomorphism recorded; Definition 6.21 witnesses pending."
      : `Representable Street homomorphism issues: ${issues.join("; ")}`,
    homomorphismReport,
    restrictionReport,
    witness,
  };
};

export const analyzeRelativeOpalgebraRepresentableActionBridge = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeOpalgebraRepresentableActionBridgeReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const actionReport = analyzeRelativeStreetActionCoherence(
    presentation.monad,
    witness.streetAction,
  );
  const restrictionReport = analyzeRelativeStreetRepresentableRestriction(
    presentation.monad,
    witness,
  );
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues = [
    ...actionReport.issues,
    ...restrictionReport.issues,
  ];

  ensureBoundary(
    equality,
    witness.streetAction.carrier,
    presentation.opalgebra.carrier,
    "Representable Street action carrier",
    issues,
  );

  if (witness.streetAction.action !== presentation.opalgebra.action) {
    issues.push(
      "Representable Street action bridge must reuse the opalgebra action 2-cell.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Representable Street bridge recorded; Theorem 6.22 witnesses pending."
      : `Representable Street bridge issues: ${issues.join("; ")}`,
    actionReport,
    restrictionReport,
    witness,
  };
};

export const analyzeRelativeOpalgebraStreetActionEquivalence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeOpalgebraStreetActionEquivalenceWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeOpalgebraStreetActionEquivalenceReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const bridge = analyzeRelativeOpalgebraRepresentableActionBridge(
    presentation,
    witness.streetAction,
  );
  const homomorphismWitness = witness.streetComparison ??
    describeRelativeStreetActionHomomorphism(
      presentation.monad,
      witness.streetAction.streetAction,
    );
  const recovery = analyzeRelativeStreetRepresentableActionHomomorphism(
    presentation.monad,
    {
      homomorphism: homomorphismWitness,
      restriction: witness.streetAction,
    },
  );
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues = [
    ...bridge.issues,
    ...recovery.issues,
  ];

  ensureBoundary(
    equality,
    witness.recoveredOpalgebra.carrier,
    presentation.opalgebra.carrier,
    "Recovered opalgebra carrier",
    issues,
  );

  const opalgebraComparison =
    witness.opalgebraComparison ??
    describeIdentityRelativeOpalgebraMorphism({
      monad: presentation.monad,
      opalgebra: witness.recoveredOpalgebra,
    });
  const opalgebraReport = analyzeRelativeOpalgebraMorphismCompatibility(
    opalgebraComparison,
  );
  issues.push(...opalgebraReport.issues);

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Representable Street/opalgebra equivalence recorded; Theorem 6.22 witnesses pending."
      : `Representable Street/opalgebra equivalence issues: ${issues.join("; ")}`,
    bridge,
    recovery,
    witness,
  };
};

export const analyzeRelativeStreetRepresentabilityGeneralisation = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeStreetRepresentabilityGeneralisationWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetRepresentabilityGeneralisationReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const actionReport = analyzeRelativeStreetActionCoherence(
    witness.monad,
    witness.streetAction,
  );
  const restrictionReport = analyzeRelativeStreetRepresentableRestriction(
    witness.monad,
    witness.representabilityWitness,
  );
  const issues = [
    ...actionReport.issues,
    ...restrictionReport.issues,
  ];

  if (witness.representabilityWitness.streetAction !== witness.streetAction) {
    issues.push(
      "Representability generalisation must compare the supplied Street action against the recorded restriction witness.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Street representability generalisation recorded; Remark 6.23 witnesses pending."
      : `Street representability generalisation issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeAlgebraRestrictionFunctor = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeAlgebraRestrictionFunctorWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeAlgebraRestrictionFunctorReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (witness.presentation !== presentation) {
    issues.push(
      "Restriction functor witness must reuse the supplied relative algebra presentation.",
    );
  }

  const actionReport = analyzeRelativeStreetActionCoherence(
    presentation.monad,
    witness.streetAction,
  );
  issues.push(...actionReport.issues);

  ensureBoundary(
    equality,
    witness.streetAction.action.boundaries.left,
    presentation.monad.root,
    "Restriction functor Street action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.streetAction.action.boundaries.right,
    presentation.algebra.carrier,
    "Restriction functor Street action right boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.streetAction.carrier,
    presentation.algebra.carrier,
    "Restriction functor Street action carrier",
    issues,
  );

  let morphismReport: RelativeMorphismCompatibilityReport | undefined;
  let homomorphismReport:
    | RelativeStreetActionHomomorphismReport<Obj, Arr, Payload, Evidence>
    | undefined;

  if (witness.morphism) {
    morphismReport = analyzeRelativeAlgebraMorphismCompatibility(
      witness.morphism.algebra,
    );
    issues.push(...morphismReport.issues);

    if (witness.morphism.algebra.monad !== presentation.monad) {
      issues.push(
        "Restriction functor morphism must be formed in the supplied relative monad.",
      );
    }
    if (witness.morphism.algebra.source !== presentation.algebra) {
      issues.push(
        "Restriction functor morphism source must reuse the recorded relative algebra.",
      );
    }
    if (witness.morphism.algebra.target !== presentation.algebra) {
      issues.push(
        "Restriction functor morphism target must reuse the recorded relative algebra.",
      );
    }

    homomorphismReport = analyzeRelativeStreetActionHomomorphism(
      presentation.monad,
      witness.morphism.image,
    );
    issues.push(...homomorphismReport.issues);

    if (witness.morphism.image.source !== witness.streetAction) {
      issues.push(
        "Restriction functor Street homomorphism must start at the recorded Street action.",
      );
    }
    if (witness.morphism.image.target !== witness.streetAction) {
      issues.push(
        "Restriction functor Street homomorphism must end at the recorded Street action.",
      );
    }
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Restriction functor recorded; Remark 6.2 faithfulness and functoriality witnesses pending."
      : `Restriction functor issues: ${issues.join("; ")}`,
    actionReport,
    ...(morphismReport && { morphismReport }),
    ...(homomorphismReport && { homomorphismReport }),
    witness,
  };
};

export const analyzeRelativeOpalgebraLiteratureRecoveries = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeOpalgebraLiteratureWitness<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraLiteratureReport<Obj, Arr, Payload, Evidence> => ({
  holds: false,
  pending: true,
  issues: [],
  details:
    witness.details ??
    "Relative opalgebra literature comparisons recorded; witnesses relating to modules, Kleisli algebras, and relative right modules remain pending.",
  witness,
});

export const analyzeRelativeOpalgebraIdentityRootEquivalence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeOpalgebraIdentityRootWitness<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraIdentityRootReport<Obj, Arr, Payload, Evidence> => {
  const actionReport = analyzeRelativeStreetActionCoherence(
    witness.presentation.monad,
    witness.streetAction,
  );
  const homomorphismReport = analyzeRelativeStreetActionHomomorphism(
    witness.presentation.monad,
    witness.comparison ??
      describeRelativeStreetActionHomomorphism(
        witness.presentation.monad,
        witness.streetAction,
      ),
  );
  const equality =
    witness.presentation.monad.equipment.equalsObjects ??
    defaultObjectEquality<Obj>;
  const issues = [
    ...actionReport.issues,
    ...homomorphismReport.issues,
  ];

  ensureBoundary(
    equality,
    witness.streetAction.carrier,
    witness.presentation.opalgebra.carrier,
    "Identity-root Street action carrier",
    issues,
  );

  if (witness.streetAction.action !== witness.presentation.opalgebra.action) {
    issues.push(
      "Identity-root Street action must reuse the opalgebra action 2-cell.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Identity-root opalgebra equivalence recorded; Corollary 6.24 witnesses pending."
      : `Identity-root opalgebra equivalence issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeAlgebraIndexedFamily = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeAlgebraIndexedFamilyWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraIndexedFamilyReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    witness.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (witness.fibres.length === 0) {
    issues.push("Indexed family witness must include at least one fibre presentation.");
  }

  witness.fibres.forEach((fibre, index) => {
    if (fibre.monad !== witness.monad) {
      issues.push(
        `Indexed family fibre #${index + 1} must reuse the supplied relative monad.`,
      );
    }
  });

  witness.restrictionMorphisms.forEach((morphism, index) => {
    if (morphism.monad !== witness.monad) {
      issues.push(
        `Restriction morphism #${index + 1} must be formed in the supplied relative monad.`,
      );
    }
    const morphismReport = analyzeRelativeAlgebraMorphismCompatibility(morphism);
    issues.push(...morphismReport.issues);
  });

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Indexed family of T-algebras recorded; Remark 6.32 witnesses pending."
      : `Indexed family of T-algebras issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeAlgebraGlobalCategory = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeAlgebraGlobalCategoryWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraGlobalCategoryReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    witness.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (witness.objects.length === 0) {
    issues.push("Global category witness must record at least one algebra object.");
  }

  witness.objects.forEach((object, index) => {
    ensureBoundary(
      equality,
      object.carrier,
      witness.monad.carrier,
      `Global algebra object #${index + 1} carrier`,
      issues,
    );
  });

  witness.morphisms.forEach((morphism, index) => {
    if (morphism.monad !== witness.monad) {
      issues.push(
        `Global algebra morphism #${index + 1} must live in the supplied relative monad.`,
      );
    }
    const morphismReport = analyzeRelativeAlgebraMorphismCompatibility(morphism);
    issues.push(...morphismReport.issues);
  });

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Global category Alg(T) recorded; Definition 6.33 witnesses pending."
      : `Global category Alg(T) issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeAlgebraMediatingTightCell = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeAlgebraMediatingTightCellWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraMediatingTightCellReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    witness.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    witness.tightCell,
    witness.monad.root,
    "Mediating tight cell boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.target.algebra.carrier,
    witness.monad.carrier,
    "Mediating tight cell carrier",
    issues,
  );

  if (witness.unitComparison !== witness.monad.unit) {
    issues.push("Mediating tight cell must reuse the relative monad unit witness.");
  }

  if (witness.extensionComparison !== witness.monad.extension) {
    issues.push(
      "Mediating tight cell must reuse the relative monad extension witness.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Mediating tight cell recorded; Definition 6.34 witnesses pending."
      : `Mediating tight cell issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeAlgebraResolutionFromAlgebraObject = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeAlgebraResolutionWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraResolutionReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    witness.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (
    !verticalBoundariesEqual(
      equality,
      witness.resolutionAdjunction.root,
      witness.monad.root,
    )
  ) {
    issues.push("Resolution adjunction must share the relative monad root boundary.");
  }

  if (
    !verticalBoundariesEqual(
      equality,
      witness.resolutionAdjunction.right,
      witness.algebra.algebra.carrier,
    )
  ) {
    issues.push(
      "Resolution adjunction right leg must reuse the recorded algebra carrier.",
    );
  }

  if (
    !verticalBoundariesEqual(
      equality,
      witness.comparisonMonad.root,
      witness.monad.root,
    )
  ) {
    issues.push("Comparison monad must preserve the relative monad root boundary.");
  }

  if (
    !verticalBoundariesEqual(
      equality,
      witness.comparisonMonad.carrier,
      witness.monad.carrier,
    )
  ) {
    issues.push(
      "Comparison monad must preserve the relative monad carrier boundary.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Resolution from algebra object recorded; Lemma 6.35 witnesses pending."
      : `Resolution from algebra object issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeAlgebraTwoDimensionalModules = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeAlgebraTwoDimensionalModuleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeAlgebraTwoDimensionalModuleReport<Obj, Arr, Payload, Evidence> => ({
  holds: false,
  pending: true,
  issues: [],
  details:
    witness.details ??
    "Two-dimensional module witnesses recorded; Remark 6.8 comparisons pending.",
  witness,
});

export const analyzeRelativeAlgebraStreetActionBridge = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraStreetActionBridgeReport<Obj, Arr, Payload, Evidence> => {
  const actionReport = analyzeRelativeStreetActionCoherence(
    presentation.monad,
    witness,
  );
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues = [...actionReport.issues];

  ensureBoundary(
    equality,
    witness.carrier,
    presentation.algebra.carrier,
    "Relative algebra Street action carrier",
    issues,
  );

  if (witness.action !== presentation.algebra.action) {
    issues.push(
      "Relative algebra Street action must reuse the algebra multiplication 2-cell.",
    );
  }

  ensureBoundary(
    equality,
    presentation.algebra.action.boundaries.left,
    presentation.monad.root,
    "Relative algebra action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.algebra.action.boundaries.right,
    presentation.algebra.carrier,
    "Relative algebra action right boundary",
    issues,
  );

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Relative algebra Street action recorded; Theorem 6.15 witnesses pending."
      : `Relative algebra Street action bridge issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeStreetActionAlgebraBridge = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
  algebra: RelativeAlgebraData<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionAlgebraBridgeReport<Obj, Arr, Payload, Evidence> => {
  const equality = monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    algebra.carrier,
    witness.carrier,
    "Street action recovered algebra carrier",
    issues,
  );
  ensureBoundary(
    equality,
    algebra.action.boundaries.left,
    monad.root,
    "Recovered algebra action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    algebra.action.boundaries.right,
    algebra.carrier,
    "Recovered algebra action right boundary",
    issues,
  );

  if (algebra.action !== witness.action) {
    issues.push(
      "Recovered algebra action must coincide with the Street action 2-cell.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Street action recovered algebra recorded; Theorem 6.15 comparisons pending."
      : `Street action recovered algebra issues: ${issues.join("; ")}`,
    algebra,
  };
};

export const analyzeRelativeAlgebraStreetActionEquivalence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeAlgebraStreetActionEquivalenceWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeAlgebraStreetActionEquivalenceReport<Obj, Arr, Payload, Evidence> => {
  const bridge = analyzeRelativeAlgebraStreetActionBridge(
    presentation,
    witness.streetAction,
  );
  const recovery = analyzeRelativeStreetActionAlgebraBridge(
    presentation.monad,
    witness.streetAction,
    witness.recoveredAlgebra,
  );
  const issues = [...bridge.issues, ...recovery.issues];

  let streetComparison: RelativeStreetActionHomomorphismReport<
    Obj,
    Arr,
    Payload,
    Evidence
  > | undefined;
  if (witness.streetComparison) {
    streetComparison = analyzeRelativeStreetActionHomomorphism(
      presentation.monad,
      witness.streetComparison,
    );
    issues.push(...streetComparison.issues);
  }

  let algebraComparison: RelativeMorphismCompatibilityReport | undefined;
  if (witness.algebraComparison) {
    algebraComparison = analyzeRelativeAlgebraMorphismCompatibility(
      witness.algebraComparison,
    );
    issues.push(...algebraComparison.issues);
  }

  const pending =
    issues.length === 0 &&
    bridge.pending &&
    recovery.pending &&
    (streetComparison ? streetComparison.pending : true) &&
    (algebraComparison ? algebraComparison.pending : true);

  return {
    holds: false,
    pending,
    issues,
    details:
      witness.details ??
      (pending
        ? "Relative algebra and Street action recorded as mutually inverse up to pending Street comparisons."
        : `Relative algebra/Street action equivalence issues: ${issues.join("; ")}`),
    bridge,
    recovery,
    ...(streetComparison && { streetComparison }),
    ...(algebraComparison && { algebraComparison }),
  };
};

export const analyzeRelativeStreetRepresentabilityUpgrade = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeStreetRepresentabilityUpgradeWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetRepresentabilityUpgradeReport<Obj, Arr, Payload, Evidence> => {
  const actionReport = analyzeRelativeStreetActionCoherence(
    monad,
    witness.action,
  );
  const representabilityReport = analyzeRelativeStreetRepresentableRestriction(
    monad,
    witness.representability,
  );
  const issues = [...actionReport.issues, ...representabilityReport.issues];

  if (witness.representability.streetAction !== witness.action) {
    issues.push(
      "Street representability upgrade must reuse the recorded Street action witness.",
    );
  }

  const pending =
    issues.length === 0 &&
    actionReport.pending &&
    representabilityReport.pending;

  return {
    holds: false,
    pending,
    issues,
    details:
      witness.details ??
      (pending
        ? "Street action representability witnesses recorded; Remark 6.16 comparisons pending."
        : `Street action representability upgrade issues: ${issues.join("; ")}`),
    actionReport,
    representabilityReport,
  };
};

export const analyzeRelativeAlgebraIdentityRootEquivalence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  witness: RelativeAlgebraIdentityRootWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraIdentityRootReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const identityBoundary = identityVerticalBoundary(
    presentation.monad.equipment,
    witness.object,
    "Identity boundary supplied for the Corollary 6.17 specialisation.",
  );

  if (!verticalBoundariesEqual(equality, presentation.monad.root, identityBoundary)) {
    issues.push(
      "Relative monad root must specialise to the identity boundary in the identity-root case.",
    );
  }

  ensureBoundary(
    equality,
    witness.ordinaryCarrier,
    identityBoundary,
    "Ordinary algebra carrier boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.algebra.carrier,
    witness.ordinaryCarrier,
    "Relative algebra carrier must coincide with the ordinary algebra carrier.",
    issues,
  );

  ensureBoundary(
    equality,
    witness.ordinaryAction.boundaries.left,
    witness.ordinaryCarrier,
    "Ordinary algebra action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.ordinaryAction.boundaries.right,
    witness.ordinaryCarrier,
    "Ordinary algebra action right boundary",
    issues,
  );

  if (witness.ordinaryAction !== presentation.algebra.action) {
    issues.push(
      "Identity-root equivalence expects the ordinary and relative algebra actions to agree.",
    );
  }

  const pending = issues.length === 0;
  return {
    holds: false,
    pending,
    issues,
    details: pending
      ? "Identity-root algebra comparison recorded; Corollary 6.17 witnesses pending."
      : `Identity-root algebra comparison issues: ${issues.join("; ")}`,
  };
};

export const analyzeRelativeKleisliUniversalProperty = <Obj, Arr, Payload, Evidence>(
  presentation: RelativeKleisliPresentation<Obj, Arr, Payload, Evidence>,
): RelativeUniversalPropertyReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    presentation.opalgebra.action.boundaries.left,
    presentation.monad.root,
    "Relative opalgebra action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.opalgebra.action.boundaries.right,
    presentation.opalgebra.carrier,
    "Relative opalgebra action right boundary",
    issues,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Relative Kleisli presentation reuses the root and opalgebra carrier boundaries."
      : `Relative Kleisli presentation issues: ${issues.join("; ")}`,
  };
};

export const analyzeRelativeEilenbergMooreUniversalProperty = <Obj, Arr, Payload, Evidence>(
  presentation: RelativeEilenbergMoorePresentation<Obj, Arr, Payload, Evidence>,
): RelativeUniversalPropertyReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    presentation.algebra.action.boundaries.left,
    presentation.algebra.carrier,
    "Relative algebra action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.algebra.action.boundaries.right,
    presentation.monad.carrier,
    "Relative algebra action right boundary",
    issues,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Relative Eilenberg–Moore presentation reuses the algebra carrier and monad carrier boundaries."
      : `Relative Eilenberg–Moore presentation issues: ${issues.join("; ")}`,
  };
};

const duplicateStreetActionWitness = <Obj, Arr, Payload, Evidence>(
  carrier: EquipmentVerticalBoundary<Obj, Arr>,
  action: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  details: string,
): RelativeStreetActionWitness<Obj, Arr, Payload, Evidence> => ({
  carrier,
  action,
  identity: action,
  leftUnitor: action,
  rightUnitor: action,
  associator: action,
  rightAction: action,
  details,
});

export const describeRelativeStreetAction = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionWitness<Obj, Arr, Payload, Evidence> =>
  duplicateStreetActionWitness(
    monad.carrier,
    monad.extension,
    "Trivial Street action reuses the relative monad extension as its coherence witnesses.",
  );

export const describeRelativeOpalgebraRightAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionWitness<Obj, Arr, Payload, Evidence> =>
  duplicateStreetActionWitness(
    presentation.opalgebra.carrier,
    presentation.opalgebra.action,
    "Opalgebra Street action witness reuses the recorded opalgebra action for all coherence cells.",
  );

export const describeRelativeStreetActionHomomorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  action?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionHomomorphismWitness<Obj, Arr, Payload, Evidence> => {
  const baseAction = action ?? describeRelativeStreetAction(monad);
  return {
    source: baseAction,
    target: baseAction,
    morphism: baseAction.action,
    redComposite: baseAction.action,
    greenComposite: baseAction.action,
    details:
      "Identity Street action homomorphism reuses the action 2-cell for both comparison pastings.",
  };
};

export const describeRelativeStreetActionCategory = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  action?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionCategoryWitness<Obj, Arr, Payload, Evidence> => {
  const baseAction = action ?? describeRelativeStreetAction(monad);
  return {
    action: baseAction,
    identity: baseAction.action,
    composition: baseAction.action,
    details:
      "Street action hom-category witnesses default to the action 2-cell for identity and composition.",
  };
};

export const describeRelativeStreetCanonicalAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeStreetActionWitness<Obj, Arr, Payload, Evidence> =>
  describeRelativeStreetAction(monad);

export const describeRelativeStreetLooseAdjunctionAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  action?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetLooseAdjunctionWitness<Obj, Arr, Payload, Evidence> => {
  const streetAction = action ?? describeRelativeStreetAction(monad);
  return {
    streetAction,
    unit: monad.unit,
    counit: monad.extension,
    details:
      "Loose adjunction Street action defaults to the relative monad unit and extension witnesses.",
  };
};

export const describeRelativeStreetLooseAdjunctionRightAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  action?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetLooseAdjunctionWitness<Obj, Arr, Payload, Evidence> => {
  const streetAction = action ?? describeRelativeStreetAction(monad);
  return {
    streetAction,
    unit: monad.unit,
    counit: monad.extension,
    details:
      "Loose adjunction Street right action reuses the relative monad unit and extension data.",
  };
};

export const describeRelativeStreetRepresentableRestriction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  action?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetRepresentableRestrictionWitness<Obj, Arr, Payload, Evidence> => {
  const streetAction = action ?? describeRelativeStreetAction(monad);
  return {
    streetAction,
    representableCarriers: [streetAction.carrier],
    details:
      "Representable Street restriction marks the Street action carrier as representable by default.",
  };
};

export const describeRelativeAlgebraStreetActionEquivalence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  action?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraStreetActionEquivalenceWitness<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const streetAction = action ?? describeRelativeStreetAction(presentation.monad);
  return {
    streetAction,
    recoveredAlgebra: presentation.algebra,
    streetComparison: describeRelativeStreetActionHomomorphism(
      presentation.monad,
      streetAction,
    ),
    algebraComparison: describeIdentityRelativeAlgebraMorphism(presentation),
    details:
      "Relative algebra/Street action equivalence defaults to the identity witnesses in both directions.",
  };
};

export const describeRelativeStreetRepresentabilityUpgrade = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  action?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetRepresentabilityUpgradeWitness<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const baseAction = action ?? describeRelativeStreetAction(monad);
  return {
    action: baseAction,
    representability: describeRelativeStreetRepresentableRestriction(
      monad,
      baseAction,
    ),
    details:
      "Street representability upgrade defaults to the canonical restriction witness.",
  };
};

export const describeRelativeAlgebraIdentityRootWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraIdentityRootWitness<Obj, Arr, Payload, Evidence> => {
  const object = presentation.monad.root.from;
  const carrier = identityVerticalBoundary(
    presentation.monad.equipment,
    object,
    "Identity carrier boundary induced by the relative monad root.",
  );
  return {
    object,
    ordinaryCarrier: carrier,
    ordinaryAction: presentation.algebra.action,
    details:
      "Identity-root algebra witness reuses the algebra multiplication as the ordinary action.",
  };
};

export const describeRelativeAlgebraGradedMorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraGradedMorphismWitness<Obj, Arr, Payload, Evidence> => ({
  presentation,
  grading: [presentation.source.carrier],
  redComposite: presentation.morphism,
  greenComposite: presentation.morphism,
  details:
    "Identity graded morphism witnesses reuse the underlying algebra morphism composites.",
});

export const describeRelativeAlgebraGradedAlternate = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraGradedAlternateWitness<Obj, Arr, Payload, Evidence> => ({
  graded: describeRelativeAlgebraGradedMorphism(presentation),
  pastedComposite: presentation.morphism,
  details:
    "Graded morphism alternate presentation defaults to the underlying morphism composite.",
});

export const describeRelativeAlgebraGradedExtension = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraGradedExtensionWitness<Obj, Arr, Payload, Evidence> => ({
  presentation,
  grading: [presentation.monad.root],
  extension: presentation.monad.extension,
  details:
    "Extension-induced graded morphism reuses the relative monad extension witness.",
});

export const describeRelativeStreetRepresentableSubmulticategory = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  restriction?: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetRepresentableSubmulticategoryWitness<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const baseRestriction =
    restriction ?? describeRelativeStreetRepresentableRestriction(monad);
  return {
    restriction: baseRestriction,
    representableCells: [baseRestriction.streetAction.action],
    details:
      "Representable Street sub-multicategory witness reuses the action 2-cell as its canonical representable loose cell.",
  };
};

export const describeRelativeStreetRepresentableActionDiagrams = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  streetAction?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetRepresentableActionDiagramsWitness<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const action = streetAction ?? describeRelativeStreetAction(presentation.monad);
  return {
    streetAction: action,
    opalgebra: presentation.opalgebra,
    rhoComposite: action.action,
    lambdaComposite: action.action,
    muComposite: action.action,
    details:
      "Representable Street diagrams reuse the action 2-cell for each comparison composite by default.",
  };
};

export const describeRelativeStreetRepresentableActionHomomorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  restriction?: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeStreetRepresentableActionHomomorphismWitness<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const baseRestriction =
    restriction ?? describeRelativeStreetRepresentableRestriction(monad);
  return {
    restriction: baseRestriction,
    homomorphism: describeRelativeStreetActionHomomorphism(
      monad,
      baseRestriction.streetAction,
    ),
    details:
      "Representable Street homomorphism defaults to the identity comparison within the sub-multicategory.",
  };
};

export const describeRelativeOpalgebraStreetActionEquivalence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  restriction?: RelativeStreetRepresentableRestrictionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeOpalgebraStreetActionEquivalenceWitness<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const baseRestriction =
    restriction ?? describeRelativeStreetRepresentableRestriction(presentation.monad);
  return {
    streetAction: baseRestriction,
    recoveredOpalgebra: presentation.opalgebra,
    streetComparison: describeRelativeStreetActionHomomorphism(
      presentation.monad,
      baseRestriction.streetAction,
    ),
    opalgebraComparison: describeIdentityRelativeOpalgebraMorphism(presentation),
    details:
      "Representable Street/opalgebra equivalence defaults to the identity witnesses on both sides.",
  };
};

export const describeRelativeStreetRepresentabilityGeneralisationWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  streetAction?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeStreetRepresentabilityGeneralisationWitness<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const action = streetAction ?? describeRelativeStreetAction(monad);
  return {
    monad,
    streetAction: action,
    representabilityWitness: describeRelativeStreetRepresentableRestriction(
      monad,
      action,
    ),
    comparisonDetails:
      "Street representability generalisation defaults to the canonical restriction witness.",
  };
};

export const describeRelativeAlgebraRestrictionFunctorWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  streetAction?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraRestrictionFunctorWitness<Obj, Arr, Payload, Evidence> => {
  const action = streetAction ?? describeRelativeStreetAction(presentation.monad);
  return {
    presentation,
    streetAction: action,
    morphism: {
      algebra: describeIdentityRelativeAlgebraMorphism(presentation),
      image: describeRelativeStreetActionHomomorphism(
        presentation.monad,
        action,
      ),
    },
    details:
      "Restriction functor witness defaults to the carrier inclusion and identity Street homomorphism.",
  };
};

export const describeRelativeOpalgebraLiteratureWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraLiteratureWitness<Obj, Arr, Payload, Evidence> => ({
  presentation,
  moduleWitness: undefined,
  kleisliWitness: undefined,
  relativeModuleWitness: undefined,
  details:
    "Relative opalgebra literature witness marks the comparison data as pending by default.",
});

export const describeRelativeOpalgebraIdentityRootWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
  streetAction?: RelativeStreetActionWitness<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraIdentityRootWitness<Obj, Arr, Payload, Evidence> => ({
  presentation,
  streetAction: streetAction ?? describeRelativeStreetAction(presentation.monad),
  details:
    "Identity-root opalgebra witness reuses the canonical Street action comparison.",
});

export const describeRelativeAlgebraIndexedFamilyWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  fibre?: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraIndexedFamilyWitness<Obj, Arr, Payload, Evidence> => {
  const baseFibre = fibre ?? describeTrivialRelativeEilenbergMoore(monad);
  return {
    monad,
    fibres: [baseFibre],
    restrictionMorphisms: [
      describeIdentityRelativeAlgebraMorphism(baseFibre),
    ],
    details:
      "Indexed family witness reuses the identity algebra morphism as its canonical restriction.",
  };
};

export const describeRelativeAlgebraGlobalCategoryWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  algebra?: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraGlobalCategoryWitness<Obj, Arr, Payload, Evidence> => {
  const baseAlgebra = algebra ?? describeTrivialRelativeEilenbergMoore(monad);
  return {
    monad,
    objects: [baseAlgebra.algebra],
    morphisms: [describeIdentityRelativeAlgebraMorphism(baseAlgebra)],
    details:
      "Global category witness records the trivial algebra and its identity morphism.",
  };
};

export const describeRelativeAlgebraMediatingTightCellWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  target?: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraMediatingTightCellWitness<Obj, Arr, Payload, Evidence> => {
  const baseTarget = target ?? describeTrivialRelativeEilenbergMoore(monad);
  return {
    monad,
    target: baseTarget,
    tightCell: monad.root,
    unitComparison: monad.unit,
    extensionComparison: monad.extension,
    details:
      "Mediating tight cell witness defaults to the relative monad unit and extension.",
  };
};

export const describeRelativeAlgebraResolutionWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  algebra?: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
  adjunction?: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraResolutionWitness<Obj, Arr, Payload, Evidence> => ({
  monad,
  algebra: algebra ?? describeTrivialRelativeEilenbergMoore(monad),
  resolutionAdjunction:
    adjunction ?? {
      equipment: monad.equipment,
      root: monad.root,
      left: monad.root,
      right: monad.carrier,
      homIsomorphism: {
        forward: monad.unit,
        backward: monad.extension,
      },
    },
  comparisonMonad: monad,
  details:
    "Resolution witness defaults to the trivial adjunction induced by the relative monad.",
});

export const describeRelativeAlgebraTwoDimensionalModuleWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraTwoDimensionalModuleWitness<Obj, Arr, Payload, Evidence> => ({
  monad,
  moduleWitness: undefined,
  reductionWitness: undefined,
  details:
    "Two-dimensional module witness records the monad while leaving module data pending.",
});

export const describeTrivialRelativeKleisli = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeKleisliPresentation<Obj, Arr, Payload, Evidence> => {
  const carrier = identityVerticalBoundary(
    monad.equipment,
    monad.carrier.to,
    "Trivial relative Kleisli carrier chosen as the identity boundary on cod(t).",
  );
  return {
    monad,
    opalgebra: {
      carrier,
      action: monad.unit,
      details: "Trivial relative opalgebra uses the monad unit as its action.",
    },
  };
};

export const describeTrivialRelativeEilenbergMoore = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeEilenbergMoorePresentation<Obj, Arr, Payload, Evidence> => ({
  monad,
  algebra: {
    carrier: monad.carrier,
    action: monad.extension,
    details:
      "Trivial relative algebra uses the monad extension as its multiplication.",
  },
});

export const describeIdentityRelativeAlgebraMorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraMorphismPresentation<Obj, Arr, Payload, Evidence> => ({
  monad: presentation.monad,
  source: presentation.algebra,
  target: presentation.algebra,
  morphism: {
    source: presentation.algebra.action.source,
    target: presentation.algebra.action.target,
    boundaries: {
      left: presentation.algebra.carrier,
      right: presentation.algebra.carrier,
    },
    evidence: presentation.algebra.action.evidence,
  },
  details: "Identity relative algebra morphism inherits the algebra action boundaries.",
});

export const describeIdentityRelativeOpalgebraMorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraMorphismPresentation<Obj, Arr, Payload, Evidence> => ({
  monad: presentation.monad,
  source: presentation.opalgebra,
  target: presentation.opalgebra,
  morphism: {
    source: presentation.opalgebra.action.source,
    target: presentation.opalgebra.action.target,
    boundaries: {
      left: presentation.opalgebra.carrier,
      right: presentation.opalgebra.carrier,
    },
    evidence: presentation.opalgebra.action.evidence,
  },
  details:
    "Identity relative opalgebra morphism inherits the opalgebra action boundaries.",
});

export const describeRelativeOpalgebraDiagrams = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
): {
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
} => ({
  carrierTriangle: {
    codomain: presentation.opalgebra.action.boundaries.right,
    carrier: presentation.opalgebra.carrier,
    unit: presentation.monad.unit,
    action: presentation.opalgebra.action,
    details:
      "Carrier triangle witnesses reuse the relative monad unit and the opalgebra action.",
  },
  extensionRectangle: {
    codomain: presentation.opalgebra.action.boundaries.right,
    carrier: presentation.opalgebra.carrier,
    extension: presentation.monad.extension,
    action: presentation.opalgebra.action,
    details:
      "Extension rectangle witnesses reuse the relative monad extension and the opalgebra action.",
  },
});

export const describeRelativeAlgebraCanonicalAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence> => ({
  monad,
  algebra: {
    carrier: monad.carrier,
    action: monad.extension,
    details: "Canonical relative algebra uses the monad tight leg with its extension multiplication.",
  },
});

export const describeRelativeOpalgebraCanonicalAction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence> => ({
  monad,
  opalgebra: {
    carrier: monad.carrier,
    action: monad.unit,
    details: "Canonical relative opalgebra reuses the monad tight leg with its unit as the action.",
  },
});

export const describeRelativeOpalgebraExtraordinaryTransformation = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>,
): RelativeOpalgebraExtraordinaryTransformationWitness<
  Obj,
  Arr,
  Payload,
  Evidence
> => ({
  looseMonad: {
    object: presentation.monad.looseCell.from,
    looseCell: presentation.monad.looseCell,
    multiplication: presentation.monad.extension,
    unit: presentation.monad.unit,
  },
  action: presentation.opalgebra.action,
  details:
    "Extraordinary transformation witness reuses the relative monad loose monad presentation and the opalgebra action.",
});
