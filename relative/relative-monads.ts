import type {
  AbsoluteColimitAnalysis,
  DensityAnalysis,
  Equipment2Cell,
  EquipmentFrame,
  EquipmentRestrictionResult,
  EquipmentProarrow,
  EquipmentVerticalBoundary,
  FullyFaithfulLeftExtensionAnalysis,
  LooseMonoidData,
  LooseMonoidShapeReport,
  ObjectEquality,
  RepresentabilityWitness,
  TightCategory,
  TightCellEvidence,
  VirtualEquipment,
} from "../virtual-equipment";
import {
  defaultObjectEquality,
  frameFromProarrow,
  identityProarrow,
  identityVerticalBoundary,
  isIdentityVerticalBoundary,
  verticalBoundariesEqual,
  virtualizeCategory,
} from "../virtual-equipment";
import type {
  RelativeAdjunctionData,
  RelativeAdjunctionFramingReport,
} from "./relative-adjunctions";
import { analyzeRelativeAdjunctionHomIsomorphism } from "./relative-adjunctions";
import type { RelativeMonad } from "./relative-monad";
import type { CatMonad } from "../allTS";
import { analyzeLooseMonoidShape } from "../virtual-equipment/loose-structures";
import {
  analyzeLooseSkewComposition,
  type LooseSkewCompositionAnalysis,
  type LooseSkewMultimorphism,
} from "../virtual-equipment/skew-multicategory";
import {
  analyzeRightExtension,
  analyzeRightLift,
  type RightExtensionAnalysis,
  type RightExtensionData,
  type RightLiftAnalysis,
  type RightLiftData,
} from "../virtual-equipment/extensions";
import {
  analyzeLeftExtensionFromWeightedColimit,
  analyzeWeightedCocone,
  analyzeWeightedColimitRestriction,
  analyzeWeightedCone,
  analyzeWeightedLimitRestriction,
  type LeftExtensionFromColimitAnalysis,
  type LeftExtensionFromColimitData,
  type WeightedCoconeAnalysis,
  type WeightedCoconeData,
  type WeightedColimitRestrictionAnalysis,
  type WeightedColimitRestrictionData,
  type WeightedConeAnalysis,
  type WeightedConeData,
  type WeightedLimitRestrictionAnalysis,
  type WeightedLimitRestrictionData,
} from "../virtual-equipment/limits";
import {
  analyzeDensityViaIdentityRestrictions,
  type DensityViaIdentityRestrictionsData,
} from "../virtual-equipment/absoluteness";
import {
  analyzeFullyFaithfulTight1Cell,
  analyzePointwiseLeftExtensionLiftCorrespondence,
  type FullyFaithfulAnalysis,
  type FullyFaithfulInput,
  type PointwiseLeftExtensionLiftAnalysis,
  type PointwiseLeftExtensionLiftInput,
} from "../virtual-equipment/faithfulness";

export type RelativeMonadData<
  Obj,
  Arr,
  Payload,
  Evidence,
> = RelativeMonad<Obj, Arr, Payload, Evidence>;

export interface RelativeMonadConstructionResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly monad?: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly framing: RelativeMonadFramingReport;
  readonly leftRestriction?: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>;
  readonly rightRestriction?: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>;
  readonly representability?: RepresentabilityWitness<Obj, Arr>;
  readonly looseMonoid: LooseMonoidData<Obj, Arr, Payload, Evidence>;
  readonly looseMonoidReport: LooseMonoidShapeReport;
  readonly skewComposition?: LooseSkewCompositionAnalysis;
  readonly rightExtension?: RightExtensionAnalysis;
  readonly rightLift?: RightLiftAnalysis;
  readonly weightedCone?: WeightedConeAnalysis;
  readonly weightedCocone?: WeightedCoconeAnalysis;
  readonly weightedColimitRestriction?: WeightedColimitRestrictionAnalysis;
  readonly weightedLimitRestriction?: WeightedLimitRestrictionAnalysis;
  readonly leftExtensionFromColimit?: LeftExtensionFromColimitAnalysis;
  readonly density?: DensityAnalysis;
  readonly pointwiseLift?: PointwiseLeftExtensionLiftAnalysis;
  readonly fullyFaithful?: FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence>;
  readonly adjunctionHomIsomorphism?: RelativeAdjunctionFramingReport;
  readonly resolution?: RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence>;
}

export interface RelativeMonadEquipmentWitnesses<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly looseMonoid?: LooseMonoidData<Obj, Arr, Payload, Evidence>;
  readonly skewSubstitutions?: ReadonlyArray<
    LooseSkewMultimorphism<Obj, Arr, Payload, Evidence>
  >;
  readonly rightExtension?: RightExtensionData<Obj, Arr, Payload, Evidence>;
  readonly rightLift?: RightLiftData<Obj, Arr, Payload, Evidence>;
  readonly weightedCone?: WeightedConeData<Obj, Arr, Payload, Evidence>;
  readonly weightedCocone?: WeightedCoconeData<Obj, Arr, Payload, Evidence>;
  readonly leftExtensionFromColimit?: LeftExtensionFromColimitData<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly density?: DensityViaIdentityRestrictionsData<Obj, Arr>;
  readonly fullyFaithful?: FullyFaithfulInput<Obj, Arr>;
  readonly pointwiseLift?: PointwiseLeftExtensionLiftInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeMonadFromAdjunctionOptions<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly overrides?: Partial<
    Pick<RelativeMonadData<Obj, Arr, Payload, Evidence>, "looseCell" | "unit" | "extension">
  >;
  readonly witnesses?: RelativeMonadEquipmentWitnesses<Obj, Arr, Payload, Evidence>;
}

export interface RelativeMonadFramingReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeMonadRepresentabilityReport<Obj, Arr> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly framing: RelativeMonadFramingReport;
  readonly representability: RepresentabilityWitness<Obj, Arr>;
}

export interface RelativeMonadFiberMonad<Obj, Arr, Payload, Evidence> {
  readonly baseObject: Obj;
  readonly looseArrow: EquipmentProarrow<Obj, Payload>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly extension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly root: EquipmentVerticalBoundary<Obj, Arr>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
}

export interface RelativeMonadFiberEmbeddingReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly representability: RelativeMonadRepresentabilityReport<Obj, Arr>;
  readonly fiberMonad?: RelativeMonadFiberMonad<Obj, Arr, Payload, Evidence>;
}

export interface RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly homObject: EquipmentVerticalBoundary<Obj, Arr>;
  readonly tensorComparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly unitComparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly extensionComparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeEnrichedMonadReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>;
}

export const embedRelativeMonadIntoFiber = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RepresentabilityWitness<Obj, Arr>,
): RelativeMonadFiberEmbeddingReport<Obj, Arr, Payload, Evidence> => {
  const representability = analyzeRelativeMonadRepresentability(data, witness);
  const issues = [...representability.issues];

  const holds = representability.holds;
  const pending = true;
  const details = holds
    ? "Relative monad embeds into the Street fiber X[j] via E(j,-); fully faithful comparison witnesses remain pending."
    : `Relative monad cannot embed into X[j]: ${issues.join("; ")}`;

  const fiberMonad: RelativeMonadFiberMonad<Obj, Arr, Payload, Evidence> | undefined = holds
    ? {
        baseObject: data.root.from,
        looseArrow: data.looseCell,
        unit: data.unit,
        extension: data.extension,
        root: data.root,
        carrier: data.carrier,
      }
    : undefined;

  return {
    holds,
    pending,
    issues,
    details,
    representability,
    ...(fiberMonad && { fiberMonad }),
  };
};

export const analyzeRelativeEnrichedMonad = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedMonadReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    witness.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(witness.homObject.from, witness.monad.root.from)) {
    issues.push(
      "Enrichment hom object must originate at the relative monad root object.",
    );
  }
  if (!equality(witness.homObject.to, witness.monad.carrier.to)) {
    issues.push(
      "Enrichment hom object must land at the relative monad carrier object.",
    );
  }

  if (!verticalBoundariesEqual(equality, witness.tensorComparison.boundaries.left, witness.homObject)) {
    issues.push(
      "Tensor comparison left boundary must reuse the recorded enriched hom object.",
    );
  }
  if (!verticalBoundariesEqual(equality, witness.tensorComparison.boundaries.right, witness.monad.carrier)) {
    issues.push(
      "Tensor comparison right boundary must reuse the relative monad carrier boundary.",
    );
  }

  if (witness.unitComparison !== witness.monad.unit) {
    issues.push(
      "Enriched unit comparison must reuse the relative monad unit witness.",
    );
  }
  if (witness.extensionComparison !== witness.monad.extension) {
    issues.push(
      "Enriched extension comparison must reuse the relative monad extension witness.",
    );
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? witness.details ??
        "Relative monad enrichment reuses the unit/extension witnesses promised in Section 8."
      : `Relative enriched monad issues: ${issues.join("; ")}`,
    witness,
  };
};

export const describeRelativeEnrichedMonadWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence> => ({
  monad,
  homObject: monad.carrier,
  tensorComparison: monad.extension,
  unitComparison: monad.unit,
  extensionComparison: monad.extension,
  details:
    "Enriched relative monad witness defaults to the carrier, unit, and extension comparisons from Section 8.",
});

const ensureBoundary = <Obj, Arr>(
  equality: ObjectEquality<Obj>,
  actual: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
  issues: string[],
): void => {
  if (!verticalBoundariesEqual(equality, actual, expected)) {
    issues.push(`${label} must reuse the expected tight boundary.`);
  }
};

export interface RelativeEnrichedYonedaActionWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly functorAction: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly composition: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RelativeEnrichedYonedaRepresentableWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly object: EquipmentVerticalBoundary<Obj, Arr>;
  readonly presheaf: EquipmentVerticalBoundary<Obj, Arr>;
  readonly distributor: EquipmentProarrow<Obj, Payload>;
  readonly evaluation: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RelativeEnrichedYonedaWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>;
  readonly presheafCategory: EquipmentVerticalBoundary<Obj, Arr>;
  readonly yoneda: EquipmentVerticalBoundary<Obj, Arr>;
  readonly representable: RelativeEnrichedYonedaRepresentableWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly action: RelativeEnrichedYonedaActionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeEnrichedYonedaReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeEnrichedYonedaWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export const analyzeRelativeEnrichedYoneda = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeEnrichedYonedaWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedYonedaReport<Obj, Arr, Payload, Evidence> => {
  const { enriched, presheafCategory, yoneda, representable, action } = witness;
  const equality =
    enriched.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    representable.object,
    enriched.monad.root,
    "Yoneda representing object",
    issues,
  );
  ensureBoundary(
    equality,
    representable.presheaf,
    presheafCategory,
    "Yoneda presheaf boundary",
    issues,
  );

  if (representable.distributor !== enriched.monad.looseCell) {
    issues.push(
      "Yoneda representable distributor must reuse the relative monad's loose arrow.",
    );
  }
  if (!equality(representable.distributor.from, presheafCategory.from)) {
    issues.push(
      "Yoneda representable distributor must originate at the presheaf category object.",
    );
  }
  if (!equality(representable.distributor.to, enriched.monad.carrier.to)) {
    issues.push(
      "Yoneda representable distributor must land at the relative monad carrier object.",
    );
  }

  ensureBoundary(
    equality,
    representable.evaluation.boundaries.left,
    presheafCategory,
    "Yoneda evaluation left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    representable.evaluation.boundaries.right,
    enriched.homObject,
    "Yoneda evaluation right boundary",
    issues,
  );

  if (representable.evaluation !== enriched.tensorComparison) {
    issues.push(
      "Yoneda evaluation must reuse the enriched tensor comparison witness.",
    );
  }

  if (!equality(yoneda.from, enriched.monad.root.from)) {
    issues.push(
      "Yoneda embedding must start at the relative monad root object.",
    );
  }
  if (!equality(yoneda.to, presheafCategory.to)) {
    issues.push(
      "Yoneda embedding must land in the recorded presheaf category object.",
    );
  }

  ensureBoundary(
    equality,
    action.functorAction.boundaries.left,
    enriched.monad.root,
    "Yoneda action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    action.functorAction.boundaries.right,
    presheafCategory,
    "Yoneda action right boundary",
    issues,
  );

  if (action.functorAction !== enriched.extensionComparison) {
    issues.push(
      "Yoneda action must reuse the enriched extension comparison witness.",
    );
  }
  if (action.composition !== action.functorAction) {
    issues.push(
      "Yoneda composition witness must coincide with the recorded functor action.",
    );
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? witness.details ??
        "Yoneda embedding witness reuses the enriched hom object, tensor comparison, and extension data from Example 8.6."
      : `Relative enriched Yoneda issues: ${issues.join("; ")}`,
    witness,
  };
};

export const describeRelativeEnrichedYonedaWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedYonedaWitness<Obj, Arr, Payload, Evidence> => ({
  enriched,
  presheafCategory: enriched.monad.carrier,
  yoneda: enriched.monad.carrier,
  representable: {
    object: enriched.monad.root,
    presheaf: enriched.monad.carrier,
    distributor: enriched.monad.looseCell,
    evaluation: enriched.tensorComparison,
  },
  action: {
    functorAction: enriched.extensionComparison,
    composition: enriched.extensionComparison,
  },
  details:
    "Yoneda witness defaults to the relative monad carrier/unit/extension data highlighted in Example 8.6.",
});

export interface RelativeEnrichedYonedaDistributorWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly yoneda: RelativeEnrichedYonedaWitness<Obj, Arr, Payload, Evidence>;
  readonly redComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly greenComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly factorisation: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly rightLift: RightLiftData<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeEnrichedYonedaDistributorReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeEnrichedYonedaDistributorWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly rightLift: RightLiftAnalysis;
}

export interface RelativeEnrichedEilenbergMooreDiagrams<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly associativity: {
    readonly viaExtension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
    readonly viaMonad: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  };
  readonly unit: {
    readonly viaExtension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
    readonly viaUnit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  };
}

export interface RelativeEnrichedEilenbergMooreAlgebraWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly extension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly diagrams: RelativeEnrichedEilenbergMooreDiagrams<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeEnrichedEilenbergMooreAlgebraReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeEnrichedEilenbergMooreAlgebraWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export const analyzeRelativeEnrichedYonedaDistributor = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeEnrichedYonedaDistributorWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeEnrichedYonedaDistributorReport<Obj, Arr, Payload, Evidence> => {
  const { yoneda, redComposite, greenComposite, factorisation, rightLift } = witness;
  const equality =
    yoneda.enriched.monad.equipment.equalsObjects ??
    defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    redComposite.boundaries.left,
    yoneda.presheafCategory,
    "Yoneda distributor red composite left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    redComposite.boundaries.right,
    yoneda.enriched.homObject,
    "Yoneda distributor red composite right boundary",
    issues,
  );

  ensureBoundary(
    equality,
    greenComposite.boundaries.left,
    yoneda.presheafCategory,
    "Yoneda distributor green composite left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    greenComposite.boundaries.right,
    yoneda.enriched.homObject,
    "Yoneda distributor green composite right boundary",
    issues,
  );

  ensureBoundary(
    equality,
    factorisation.boundaries.left,
    yoneda.presheafCategory,
    "Yoneda distributor factorisation left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    factorisation.boundaries.right,
    yoneda.enriched.homObject,
    "Yoneda distributor factorisation right boundary",
    issues,
  );

  if (rightLift.loose !== yoneda.representable.distributor) {
    issues.push(
      "Yoneda distributor right lift must reuse the representable loose arrow p : Z ⇸ X.",
    );
  }

  if (rightLift.lift !== yoneda.enriched.monad.looseCell) {
    issues.push(
      "Yoneda distributor right lift must land in the relative monad loose arrow witnessing Y : Z → PZ.",
    );
  }

  if (redComposite !== factorisation) {
    issues.push(
      "Yoneda distributor red composite must coincide with the supplied PZ(p,q) factorisation.",
    );
  }
  if (greenComposite !== factorisation) {
    issues.push(
      "Yoneda distributor green composite must coincide with the supplied PZ(p,q) factorisation.",
    );
  }

  if (factorisation !== rightLift.unit) {
    issues.push(
      "Yoneda distributor factorisation must match the right lift unit witnessing the universal property of q ▷ p.",
    );
  }

  const rightLiftReport = analyzeRightLift(
    yoneda.enriched.monad.equipment,
    rightLift,
  );

  if (!rightLiftReport.holds) {
    issues.push(`Right lift framing failed: ${rightLiftReport.details}`);
    rightLiftReport.issues.forEach((issue) =>
      issues.push(`Right lift: ${issue}`),
    );
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues: holds ? [] : issues,
    details: holds
      ? witness.details ??
        `Lemma 8.7 distributor witness confirms both composites reuse the Yoneda factorisation through PZ(p,q) and the right lift unit: ${rightLiftReport.details}`
      : `Relative enriched distributor issues: ${issues.join("; ")}`,
    witness,
    rightLift: rightLiftReport,
  };
};

export const analyzeRelativeEnrichedEilenbergMooreAlgebra = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeEnrichedEilenbergMooreAlgebraWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeEnrichedEilenbergMooreAlgebraReport<Obj, Arr, Payload, Evidence> => {
  const { enriched, carrier, extension, diagrams } = witness;
  const equality =
    enriched.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    carrier,
    enriched.monad.carrier,
    "Eilenberg–Moore carrier boundary",
    issues,
  );

  ensureBoundary(
    equality,
    extension.boundaries.left,
    enriched.monad.root,
    "Eilenberg–Moore extension left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    extension.boundaries.right,
    carrier,
    "Eilenberg–Moore extension right boundary",
    issues,
  );

  if (extension !== enriched.extensionComparison) {
    issues.push(
      "Eilenberg–Moore extension operator must reuse the enriched extension comparison witness.",
    );
  }

  const { associativity, unit } = diagrams;

  ensureBoundary(
    equality,
    associativity.viaExtension.boundaries.left,
    enriched.monad.root,
    "Eilenberg–Moore associativity left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    associativity.viaExtension.boundaries.right,
    carrier,
    "Eilenberg–Moore associativity right boundary",
    issues,
  );

  if (associativity.viaMonad !== enriched.extensionComparison) {
    issues.push(
      "Eilenberg–Moore associativity comparison must reuse the enriched extension comparison witness.",
    );
  }
  if (associativity.viaExtension !== associativity.viaMonad) {
    issues.push(
      "Eilenberg–Moore associativity diagram must commute.",
    );
  }

  ensureBoundary(
    equality,
    unit.viaExtension.boundaries.left,
    enriched.monad.root,
    "Eilenberg–Moore unit left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    unit.viaExtension.boundaries.right,
    carrier,
    "Eilenberg–Moore unit right boundary",
    issues,
  );

  if (unit.viaUnit !== enriched.unitComparison) {
    issues.push(
      "Eilenberg–Moore unit comparison must reuse the enriched unit witness.",
    );
  }
  if (unit.viaExtension !== unit.viaUnit) {
    issues.push("Eilenberg–Moore unit diagram must commute.");
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? witness.details ??
        "Enriched Eilenberg–Moore algebra reuses the enriched extension/unit witnesses and the Lemma 8.16 diagrams."
      : `Relative enriched Eilenberg–Moore issues: ${issues.join("; ")}`,
    witness,
  };
};

export const describeRelativeEnrichedEilenbergMooreAlgebraWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedEilenbergMooreAlgebraWitness<
  Obj,
  Arr,
  Payload,
  Evidence
> => ({
  enriched,
  carrier: enriched.monad.carrier,
  extension: enriched.extensionComparison,
  diagrams: {
    associativity: {
      viaExtension: enriched.extensionComparison,
      viaMonad: enriched.extensionComparison,
    },
    unit: {
      viaExtension: enriched.extensionComparison,
      viaUnit: enriched.unitComparison,
    },
  },
  details:
    "Enriched Eilenberg–Moore algebra witness defaults to the carrier, extension, and unit comparisons highlighted in Definition 8.16.",
});

export interface RelativeSetEnrichedMonadCorrespondenceWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly name: string;
  readonly looseArrow: EquipmentProarrow<Obj, Payload>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly extension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeSetEnrichedMonadCorrespondenceReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeSetEnrichedMonadCorrespondenceWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeSetEnrichedMonadWitness<Obj, Arr, Payload, Evidence> {
  readonly enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>;
  readonly fullyFaithful: FullyFaithfulInput<Obj, Arr>;
  readonly correspondences: ReadonlyArray<
    RelativeSetEnrichedMonadCorrespondenceWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly objectEquality?: ObjectEquality<Obj>;
}

export interface RelativeSetEnrichedMonadReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly enriched: RelativeEnrichedMonadReport<Obj, Arr, Payload, Evidence>;
  readonly fullyFaithful: FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence>;
  readonly correspondences: ReadonlyArray<
    RelativeSetEnrichedMonadCorrespondenceReport<Obj, Arr, Payload, Evidence>
  >;
}

const analyzeRelativeSetEnrichedCorrespondence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RelativeSetEnrichedMonadCorrespondenceWitness<Obj, Arr, Payload, Evidence>,
): RelativeSetEnrichedMonadCorrespondenceReport<Obj, Arr, Payload, Evidence> => {
  const issues: string[] = [];

  if (witness.looseArrow !== monad.looseCell) {
    issues.push(
      `${witness.name} should reuse the relative monad loose arrow E(j,t) as highlighted in Example 8.14.`,
    );
  }

  if (witness.unit !== monad.unit) {
    issues.push(
      `${witness.name} should reuse the relative monad unit η : j ⇒ t to match Example 8.14.`,
    );
  }

  if (witness.extension !== monad.extension) {
    issues.push(
      `${witness.name} should reuse the relative monad extension μ : t▷t ⇒ t recorded in Example 8.14.`,
    );
  }

  const holds = issues.length === 0;

  return {
    holds,
    issues,
    details: holds
      ? `${witness.name} witnesses the Set-enriched presentation reusing the loose arrow, unit, and extension.`
      : `${witness.name} Set-enriched correspondence issues: ${issues.join("; ")}`,
    witness,
  };
};

export const analyzeRelativeSetEnrichedMonad = <Obj, Arr, Payload, Evidence>(
  witness: RelativeSetEnrichedMonadWitness<Obj, Arr, Payload, Evidence>,
): RelativeSetEnrichedMonadReport<Obj, Arr, Payload, Evidence> => {
  const enriched = analyzeRelativeEnrichedMonad(witness.enriched);
  const equipment = witness.enriched.monad.equipment;
  const fullyFaithfulReport = analyzeFullyFaithfulTight1Cell(
    equipment,
    witness.fullyFaithful,
  );
  const correspondences = witness.correspondences.map((correspondence) =>
    analyzeRelativeSetEnrichedCorrespondence(witness.enriched.monad, correspondence),
  );

  const issues: string[] = [];

  if (!enriched.holds) {
    issues.push(...enriched.issues);
  }

  if (!fullyFaithfulReport.holds) {
    issues.push(...fullyFaithfulReport.issues);
  }

  for (const correspondence of correspondences) {
    if (!correspondence.holds) {
      issues.push(...correspondence.issues);
    }
  }

  const holds =
    enriched.holds &&
    fullyFaithfulReport.holds &&
    correspondences.every((correspondence) => correspondence.holds);

  return {
    holds,
    issues: holds ? [] : issues,
    details: holds
      ? `Example 8.14 Set-enriched witness confirms ${correspondences.length} recorded correspondences reuse the relative monad data.`
      : `Set-enriched relative monad issues: ${issues.join("; ")}`,
    enriched,
    fullyFaithful: fullyFaithfulReport,
    correspondences,
  };
};

export interface RelativeSetEnrichedMonadWitnessOptions<Obj, Arr, Payload, Evidence> {
  readonly correspondences?: ReadonlyArray<
    RelativeSetEnrichedMonadCorrespondenceWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly fullyFaithful?: FullyFaithfulInput<Obj, Arr>;
}

const example814Correspondence = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  name: string,
  details: string,
): RelativeSetEnrichedMonadCorrespondenceWitness<Obj, Arr, Payload, Evidence> => ({
  name,
  looseArrow: monad.looseCell,
  unit: monad.unit,
  extension: monad.extension,
  details,
});

export const describeRelativeSetEnrichedMonadWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>,
  options: RelativeSetEnrichedMonadWitnessOptions<Obj, Arr, Payload, Evidence> = {},
): RelativeSetEnrichedMonadWitness<Obj, Arr, Payload, Evidence> => ({
  enriched,
  fullyFaithful:
    options.fullyFaithful ?? {
      tight: enriched.monad.root.tight,
      domain: enriched.monad.root.from,
      codomain: enriched.monad.root.to,
    },
  correspondences:
    options.correspondences ?? [
      example814Correspondence(
        enriched.monad,
        "Walters device (Example 8.14.1)",
        "Devices in the sense of Walters reuse the same loose arrow, unit, and extension when V = Set.",
      ),
      example814Correspondence(
        enriched.monad,
        "Algebraic operations (Example 8.14.2)",
        "Street’s algebraic theories provide the same Set-enriched relative monad data.",
      ),
      example814Correspondence(
        enriched.monad,
        "Span equipment (Example 8.14.4)",
        "The span double category with fully faithful root shares the loose arrow and 2-cells.",
      ),
      example814Correspondence(
        enriched.monad,
        "Partial map classifiers (Example 8.14.9)",
        "Partial map classifiers again give the Set-enriched structure with identical Street data.",
      ),
      example814Correspondence(
        enriched.monad,
        "j-monads (Example 8.14.11)",
        "Diers j-monads coincide with the Set-enriched relative monad witnesses.",
      ),
      example814Correspondence(
        enriched.monad,
        "Presheaf cores (Example 8.14.13)",
        "Copresheaf-representable monads use the same extension and unit cells.",
      ),
    ],
});

export const describeRelativeEnrichedYonedaDistributorWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  yoneda: RelativeEnrichedYonedaWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedYonedaDistributorWitness<Obj, Arr, Payload, Evidence> => ({
  yoneda,
  redComposite: yoneda.action.functorAction,
  greenComposite: yoneda.action.functorAction,
  factorisation: yoneda.action.functorAction,
  rightLift: {
    loose: yoneda.representable.distributor,
    along: yoneda.enriched.monad.root.tight,
    lift: yoneda.enriched.monad.looseCell,
    unit: yoneda.action.functorAction,
  },
  details:
    "Yoneda distributor witness defaults to the extension/right-lift comparison reused by both composites in Lemma 8.7.",
});

const ensureFrameMatches = <Obj, Payload>(
  equality: ObjectEquality<Obj>,
  frame: EquipmentFrame<Obj, Payload>,
  reference: EquipmentFrame<Obj, Payload>,
  label: string,
  issues: string[],
) => {
  if (!equality(frame.leftBoundary, reference.leftBoundary)) {
    issues.push(`${label} must reuse the reference left boundary.`);
  }
  if (!equality(frame.rightBoundary, reference.rightBoundary)) {
    issues.push(`${label} must reuse the reference right boundary.`);
  }
};

const ensureCellMatchesReference = <Obj, Arr, Payload, Evidence>(
  equality: ObjectEquality<Obj>,
  cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  reference: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  label: string,
  issues: string[],
) => {
  ensureFrameMatches(equality, cell.source, reference.source, `${label} source frame`, issues);
  ensureFrameMatches(equality, cell.target, reference.target, `${label} target frame`, issues);
  ensureBoundary(
    equality,
    cell.boundaries.left,
    reference.boundaries.left,
    `${label} left boundary`,
    issues,
  );
  ensureBoundary(
    equality,
    cell.boundaries.right,
    reference.boundaries.right,
    `${label} right boundary`,
    issues,
  );
};

export interface RelativeVCatRelativeMonadTriangleWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly redComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly greenComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly comparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RelativeVCatFunctorialityWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly identity: RelativeVCatRelativeMonadTriangleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly composition: RelativeVCatRelativeMonadTriangleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeEnrichedVCatMonadWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>;
  readonly unitTriangle: RelativeVCatRelativeMonadTriangleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly multiplication: RelativeVCatRelativeMonadTriangleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly functoriality: RelativeVCatFunctorialityWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly tauNaturality: RelativeVCatRelativeMonadTriangleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeEnrichedVCatMonadReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeEnrichedVCatMonadWitness<Obj, Arr, Payload, Evidence>;
}

const analyzeTriangleAgainst = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equality: ObjectEquality<Obj>,
  triangle: RelativeVCatRelativeMonadTriangleWitness<Obj, Arr, Payload, Evidence>,
  reference: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  label: string,
  issues: string[],
) => {
  ensureCellMatchesReference(
    equality,
    triangle.redComposite,
    reference,
    `${label} red composite`,
    issues,
  );
  ensureCellMatchesReference(
    equality,
    triangle.greenComposite,
    reference,
    `${label} green composite`,
    issues,
  );
  ensureCellMatchesReference(
    equality,
    triangle.comparison,
    reference,
    `${label} comparison`,
    issues,
  );

  if (triangle.comparison !== reference) {
    issues.push(`${label} comparison must reuse the recorded reference 2-cell.`);
  }
  if (triangle.redComposite.evidence !== triangle.comparison.evidence) {
    issues.push(`${label} red composite must match the recorded comparison evidence.`);
  }
  if (triangle.greenComposite.evidence !== triangle.comparison.evidence) {
    issues.push(`${label} green composite must match the recorded comparison evidence.`);
  }
};

export const analyzeRelativeEnrichedVCatMonad = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeEnrichedVCatMonadWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedVCatMonadReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    witness.enriched.monad.equipment.equalsObjects ??
    defaultObjectEquality<Obj>;
  const issues: string[] = [];

  analyzeTriangleAgainst(
    equality,
    witness.unitTriangle,
    witness.enriched.unitComparison,
    "Theorem 8.12 unit triangle",
    issues,
  );
  analyzeTriangleAgainst(
    equality,
    witness.multiplication,
    witness.enriched.extensionComparison,
    "Theorem 8.12 multiplication diagram",
    issues,
  );

  analyzeTriangleAgainst(
    equality,
    witness.functoriality.identity,
    witness.enriched.unitComparison,
    "Theorem 8.12 identity preservation",
    issues,
  );
  analyzeTriangleAgainst(
    equality,
    witness.functoriality.composition,
    witness.enriched.extensionComparison,
    "Theorem 8.12 composition preservation",
    issues,
  );
  analyzeTriangleAgainst(
    equality,
    witness.tauNaturality,
    witness.enriched.unitComparison,
    "Theorem 8.12 τ V-naturality",
    issues,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? witness.details ??
        "Theorem 8.12 witness confirms the enriched unit/multiplication triangles, functoriality identities/composites, and τ-naturality all reuse the recorded comparisons."
      : `Relative enriched V-Cat monad issues: ${issues.join("; ")}`,
    witness,
  };
};

export const describeRelativeEnrichedVCatMonadWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedVCatMonadWitness<Obj, Arr, Payload, Evidence> => ({
  enriched,
  unitTriangle: {
    redComposite: enriched.unitComparison,
    greenComposite: enriched.unitComparison,
    comparison: enriched.unitComparison,
  },
  multiplication: {
    redComposite: enriched.extensionComparison,
    greenComposite: enriched.extensionComparison,
    comparison: enriched.extensionComparison,
  },
  functoriality: {
    identity: {
      redComposite: enriched.unitComparison,
      greenComposite: enriched.unitComparison,
      comparison: enriched.unitComparison,
    },
    composition: {
      redComposite: enriched.extensionComparison,
      greenComposite: enriched.extensionComparison,
      comparison: enriched.extensionComparison,
    },
  },
  tauNaturality: {
    redComposite: enriched.unitComparison,
    greenComposite: enriched.unitComparison,
    comparison: enriched.unitComparison,
  },
  details:
    "Theorem 8.12 witness defaults to reusing the unit and extension 2-cells across the triangles, functoriality, and τ-naturality diagrams recorded with the enriched relative monad.",
});

export interface RelativeEnrichedKleisliInclusionOpalgebraWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly identityTransformation: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly actionTriangle: RelativeVCatRelativeMonadTriangleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeEnrichedKleisliInclusionWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>;
  readonly kleisliCategory: EquipmentVerticalBoundary<Obj, Arr>;
  readonly inclusion: EquipmentVerticalBoundary<Obj, Arr>;
  readonly homDistributor: EquipmentProarrow<Obj, Payload>;
  readonly identityPreservation: RelativeVCatRelativeMonadTriangleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly compositionPreservation: RelativeVCatRelativeMonadTriangleWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly opalgebra: RelativeEnrichedKleisliInclusionOpalgebraWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeEnrichedKleisliInclusionReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeEnrichedKleisliInclusionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export const analyzeRelativeEnrichedKleisliInclusion = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeEnrichedKleisliInclusionWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedKleisliInclusionReport<Obj, Arr, Payload, Evidence> => {
  const equality =
    witness.enriched.monad.equipment.equalsObjects ??
    defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    witness.kleisliCategory,
    witness.enriched.monad.carrier,
    "Kleisli inclusion category boundary",
    issues,
  );
  ensureBoundary(
    equality,
    witness.inclusion,
    witness.enriched.monad.root,
    "Kleisli inclusion functor boundary",
    issues,
  );

  if (witness.homDistributor !== witness.enriched.monad.looseCell) {
    issues.push(
      "Kleisli inclusion hom distributor must reuse the relative monad's loose arrow.",
    );
  }

  analyzeTriangleAgainst(
    equality,
    witness.identityPreservation,
    witness.enriched.unitComparison,
    "Kleisli inclusion identity preservation",
    issues,
  );
  analyzeTriangleAgainst(
    equality,
    witness.compositionPreservation,
    witness.enriched.extensionComparison,
    "Kleisli inclusion composition preservation",
    issues,
  );
  analyzeTriangleAgainst(
    equality,
    witness.opalgebra.actionTriangle,
    witness.enriched.extensionComparison,
    "Kleisli inclusion opalgebra comparison",
    issues,
  );
  ensureCellMatchesReference(
    equality,
    witness.opalgebra.identityTransformation,
    witness.enriched.unitComparison,
    "Kleisli inclusion identity-on-objects transformation",
    issues,
  );
  if (witness.opalgebra.identityTransformation !== witness.enriched.unitComparison) {
    issues.push(
      "Kleisli inclusion identity transformation must reuse the enriched unit comparison witness.",
    );
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? witness.details ??
        "Kleisli inclusion witness confirms the identity-on-objects functor, opalgebra morphism, and hom distributor all reuse the enriched unit and extension data."
      : `Relative enriched Kleisli inclusion issues: ${issues.join("; ")}`,
    witness,
  };
};

export const describeRelativeEnrichedKleisliInclusionWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  enriched: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedKleisliInclusionWitness<Obj, Arr, Payload, Evidence> => ({
  enriched,
  kleisliCategory: enriched.monad.carrier,
  inclusion: enriched.monad.root,
  homDistributor: enriched.monad.looseCell,
  identityPreservation: {
    redComposite: enriched.unitComparison,
    greenComposite: enriched.unitComparison,
    comparison: enriched.unitComparison,
  },
  compositionPreservation: {
    redComposite: enriched.extensionComparison,
    greenComposite: enriched.extensionComparison,
    comparison: enriched.extensionComparison,
  },
  opalgebra: {
    identityTransformation: enriched.unitComparison,
    actionTriangle: {
      redComposite: enriched.extensionComparison,
      greenComposite: enriched.extensionComparison,
      comparison: enriched.extensionComparison,
    },
  },
  details:
    "Kleisli inclusion witness defaults to reusing the enriched unit, extension, and loose arrow highlighted in the Lemma 8.7 discussion of the Kleisli identity-on-objects functor.",
});

export interface RelativeMonadIdentityReductionReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeMonadResolutionLooseMonadReport<Obj, Payload> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly induced?: EquipmentProarrow<Obj, Payload>;
}

export interface RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly monadFraming: RelativeMonadFramingReport;
  readonly homIsomorphism: RelativeAdjunctionFramingReport;
  readonly looseMonad: RelativeMonadResolutionLooseMonadReport<Obj, Payload>;
}

export interface RelativeMonadResolutionData<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeMonadUnitCompatibilityWitness<Obj, Arr, Payload, Evidence> {
  readonly unitArrow?: EquipmentProarrow<Obj, Payload>;
  readonly extensionComposite?: EquipmentProarrow<Obj, Payload>;
  readonly extensionSourceArrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>;
}

export interface RelativeMonadExtensionAssociativityWitness<Obj, Arr, Payload, Evidence> {
  readonly extensionComposite?: EquipmentProarrow<Obj, Payload>;
  readonly extensionSourceArrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>;
}

export interface RelativeMonadRootIdentityWitness<Obj, Arr, Payload, Evidence> {
  readonly restriction?: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>;
  readonly unitSourceArrow?: EquipmentProarrow<Obj, Payload>;
}

export interface RelativeMonadLawComponentReport<Witness> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: Witness;
}

export interface RelativeMonadLawAnalysis<Obj, Arr, Payload, Evidence> {
  readonly framing: RelativeMonadFramingReport;
  readonly unitCompatibility: RelativeMonadLawComponentReport<
    RelativeMonadUnitCompatibilityWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly extensionAssociativity: RelativeMonadLawComponentReport<
    RelativeMonadExtensionAssociativityWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly rootIdentity: RelativeMonadLawComponentReport<
    RelativeMonadRootIdentityWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
}

export const relativeMonadFromEquipment = <Obj, Arr, Payload, Evidence>(
  scaffold: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witnesses: RelativeMonadEquipmentWitnesses<Obj, Arr, Payload, Evidence> = {},
): RelativeMonadConstructionResult<Obj, Arr, Payload, Evidence> => {
  const framing = analyzeRelativeMonadFraming(scaffold);
  const issues = [...framing.issues];
  const equality = scaffold.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  const looseMonoid: LooseMonoidData<Obj, Arr, Payload, Evidence> =
    witnesses.looseMonoid ?? {
      object: scaffold.root.from,
      looseCell: scaffold.looseCell,
      multiplication: scaffold.extension,
      unit: scaffold.unit,
    };
  const looseMonoidReport = analyzeLooseMonoidShape(scaffold.equipment, looseMonoid);

  const skewInners =
    witnesses.skewSubstitutions ??
    scaffold.extension.source.arrows.map((arrow, index) => {
      const frame = frameFromProarrow(arrow);
      const left = identityVerticalBoundary(
        scaffold.equipment,
        arrow.from,
        `Identity left boundary for extension source arrow ${index}.`,
      );
      const right = identityVerticalBoundary(
        scaffold.equipment,
        arrow.to,
        `Identity right boundary for extension source arrow ${index}.`,
      );
      return {
        label: `extension.source[${index}]`,
        cell: {
          source: frame,
          target: frame,
          boundaries: { left, right },
          evidence: scaffold.equipment.cells.identity(frame, { left, right }),
        },
      } as LooseSkewMultimorphism<Obj, Arr, Payload, Evidence>;
    });

  const skewComposition = analyzeLooseSkewComposition(
    scaffold.equipment,
    {
      cell: scaffold.extension,
      label: "relative monad extension",
    },
    skewInners,
  );

  const collectReportIssues = (
    label: string,
    report: { holds: boolean; details: string; issues: ReadonlyArray<string> } | undefined,
  ) => {
    if (!report || report.holds) {
      return;
    }
    issues.push(`${label} failed: ${report.details}`);
    report.issues.forEach((issue) => issues.push(`${label}: ${issue}`));
  };

  collectReportIssues("Loose monoid framing", looseMonoidReport);
  collectReportIssues("Skew multicategory substitution", skewComposition);

  const leftRestriction = scaffold.equipment.restrictions.left(
    scaffold.root.tight,
    scaffold.looseCell,
  );

  let representability: RepresentabilityWitness<Obj, Arr> | undefined;

  if (leftRestriction === undefined) {
    issues.push(
      "Left restriction B(j,1) failed: equipment could not restrict the loose arrow along the root.",
    );
  } else {
    const { restricted, representability: witness, details } = leftRestriction;
    if (
      !equality(restricted.from, scaffold.looseCell.from) ||
      !equality(restricted.to, scaffold.looseCell.to)
    ) {
      issues.push("Left restriction B(j,1) must return a loose arrow matching E(j,t).");
    }
    if (restricted !== scaffold.looseCell) {
      issues.push(
        "Left restriction B(j,1) should recover the supplied loose arrow; use the restricted arrow when wiring future analyzers.",
      );
    }
    if (witness === undefined) {
      issues.push(
        `Left restriction along j currently lacks representability; loose adjunction analyzers will only certify a map. Details: ${details}`,
      );
    } else {
      representability = witness;
      if (witness.orientation !== "left") {
        issues.push("Representability witness must arise from a left restriction B(j,1).");
      }
      if (!equality(witness.object, scaffold.root.from)) {
        issues.push("Representability witness object must match dom(j).");
      }
      if (witness.tight !== scaffold.root.tight) {
        issues.push("Representability witness must reuse the root tight 1-cell.");
      }
    }
  }

  const rightRestriction = scaffold.equipment.restrictions.right(
    scaffold.looseCell,
    scaffold.carrier.tight,
  );

  if (rightRestriction === undefined) {
    issues.push(
      "Right restriction B(1,t) failed: equipment could not align the loose arrow with the carrier boundary.",
    );
  } else {
    const { restricted, representability: witness, details } = rightRestriction;
    if (
      !equality(restricted.from, scaffold.looseCell.from) ||
      !equality(restricted.to, scaffold.looseCell.to)
    ) {
      issues.push("Right restriction B(1,t) must return a loose arrow matching E(j,t).");
    }
    if (restricted !== scaffold.looseCell) {
      issues.push(
        "Right restriction B(1,t) should coincide with the supplied loose arrow so future Street actions reuse the same data.",
      );
    }
    if (witness === undefined) {
      issues.push(
        `Right restriction along t currently lacks representability; record companion/conjoint witnesses so adjunction scaffolding can proceed. Details: ${details}`,
      );
    } else if (witness.orientation !== "right") {
      issues.push("Right restriction representability must be oriented as B(1,t).");
    }
  }

  const rightExtensionReport = witnesses.rightExtension
    ? analyzeRightExtension(scaffold.equipment, witnesses.rightExtension)
    : undefined;
  const rightLiftReport = witnesses.rightLift
    ? analyzeRightLift(scaffold.equipment, witnesses.rightLift)
    : undefined;
  const weightedConeReport = witnesses.weightedCone
    ? analyzeWeightedCone(scaffold.equipment, witnesses.weightedCone)
    : undefined;
  const weightedCoconeReport = witnesses.weightedCocone
    ? analyzeWeightedCocone(scaffold.equipment, witnesses.weightedCocone)
    : undefined;
  const leftExtensionFromColimitReport = witnesses.leftExtensionFromColimit
    ? analyzeLeftExtensionFromWeightedColimit(
        scaffold.equipment,
        witnesses.leftExtensionFromColimit,
      )
    : undefined;
  const densityReport = witnesses.density
    ? analyzeDensityViaIdentityRestrictions(scaffold.equipment, witnesses.density)
    : undefined;
  const fullyFaithfulReport = witnesses.fullyFaithful
    ? analyzeFullyFaithfulTight1Cell(scaffold.equipment, witnesses.fullyFaithful)
    : undefined;
  const pointwiseLiftReport = witnesses.pointwiseLift
    ? analyzePointwiseLeftExtensionLiftCorrespondence(
        scaffold.equipment,
        witnesses.pointwiseLift,
      )
    : undefined;

  collectReportIssues("Right extension", rightExtensionReport);
  collectReportIssues("Right lift", rightLiftReport);
  collectReportIssues("Weighted cone", weightedConeReport);
  collectReportIssues("Weighted cocone", weightedCoconeReport);
  collectReportIssues(
    "Left extension from weighted colimit",
    leftExtensionFromColimitReport,
  );
  collectReportIssues("Density via identity restrictions", densityReport);
  collectReportIssues("Fully faithful tight 1-cell", fullyFaithfulReport);
  collectReportIssues("Pointwise left extension lift", pointwiseLiftReport);

  const weightedColimitRestrictionReport =
    weightedCoconeReport && leftRestriction
      ? analyzeWeightedColimitRestriction(scaffold.equipment, {
          cocone: witnesses.weightedCocone!,
          restriction: leftRestriction,
        })
      : undefined;
  collectReportIssues("Weighted colimit restriction", weightedColimitRestrictionReport);

  const weightedLimitRestrictionReport =
    weightedConeReport && rightRestriction
      ? analyzeWeightedLimitRestriction(scaffold.equipment, {
          cone: witnesses.weightedCone!,
          restriction: rightRestriction,
        })
      : undefined;
  collectReportIssues("Weighted limit restriction", weightedLimitRestrictionReport);

  const holds = issues.length === 0;

  return {
    holds,
    issues,
    details: holds
      ? "Constructed relative monad from equipment: framing and restriction checks succeeded."
      : `Relative monad construction issues: ${issues.join("; ")}`,
    ...(holds && scaffold && { monad: scaffold }),
    ...(representability && { representability }),
    framing,
    ...(leftRestriction && { leftRestriction }),
    ...(rightRestriction && { rightRestriction }),
    looseMonoid,
    looseMonoidReport,
    ...(skewComposition && { skewComposition }),
    ...(rightExtensionReport && { rightExtension: rightExtensionReport }),
    ...(rightLiftReport && { rightLift: rightLiftReport }),
    ...(weightedConeReport && { weightedCone: weightedConeReport }),
    ...(weightedCoconeReport && { weightedCocone: weightedCoconeReport }),
    ...(weightedColimitRestrictionReport && { weightedColimitRestriction: weightedColimitRestrictionReport }),
    ...(weightedLimitRestrictionReport && { weightedLimitRestriction: weightedLimitRestrictionReport }),
    ...(leftExtensionFromColimitReport && { leftExtensionFromColimit: leftExtensionFromColimitReport }),
    ...(densityReport && { density: densityReport }),
    ...(pointwiseLiftReport && { pointwiseLift: pointwiseLiftReport }),
    ...(fullyFaithfulReport && { fullyFaithful: fullyFaithfulReport }),
  };
};

export const relativeMonadFromAdjunction = <Obj, Arr, Payload, Evidence>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  options: RelativeMonadFromAdjunctionOptions<Obj, Arr, Payload, Evidence> = {},
): RelativeMonadConstructionResult<Obj, Arr, Payload, Evidence> => {
  const { overrides = {}, witnesses } = options;
  const { equipment, root, right } = adjunction;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const homIsomorphism = analyzeRelativeAdjunctionHomIsomorphism(adjunction);

  const extractionIssues: string[] = [];
  const targetFrame = adjunction.homIsomorphism.forward.target;

  let looseCell: EquipmentProarrow<Obj, Payload>;
  if (overrides.looseCell) {
    looseCell = overrides.looseCell;
  } else {
    const matchingArrows = targetFrame.arrows.filter(
      (arrow) => equality(arrow.from, root.from) && equality(arrow.to, right.to),
    );
    if (matchingArrows.length === 1) {
      const [uniqueMatch] = matchingArrows;
      if (uniqueMatch) {
        looseCell = uniqueMatch;
      } else {
        looseCell = identityProarrow(equipment, root.from);
      }
    } else if (matchingArrows.length > 1) {
      const [firstMatch] = matchingArrows;
      if (firstMatch) {
        looseCell = firstMatch;
      } else {
        looseCell = identityProarrow(equipment, root.from);
      }
      extractionIssues.push(
        "Hom-isomorphism target contains multiple arrows matching dom(j) and cod(r); defaulted to the first.",
      );
    } else if (targetFrame.arrows.length > 0) {
      const [firstArrow] = targetFrame.arrows;
      if (firstArrow) {
        looseCell = firstArrow;
      } else {
        looseCell = identityProarrow(equipment, root.from);
      }
      extractionIssues.push(
        "Hom-isomorphism target lacks an arrow with dom(j) and cod(r); defaulted to its first arrow.",
      );
    } else {
      looseCell = identityProarrow(equipment, root.from);
      extractionIssues.push(
        "Hom-isomorphism target does not expose any loose arrows; defaulted to the identity on dom(j).",
      );
    }
  }

  const looseFrame = frameFromProarrow(looseCell);
  const boundaries = { left: root, right } as const;
  const identityEvidence = equipment.cells.identity(looseFrame, boundaries);

  const unit = overrides.unit ?? {
    source: looseFrame,
    target: looseFrame,
    boundaries,
    evidence: identityEvidence,
  };

  const extension = overrides.extension ?? {
    source: looseFrame,
    target: looseFrame,
    boundaries,
    evidence: identityEvidence,
  };

  const monad: RelativeMonadData<Obj, Arr, Payload, Evidence> = {
    equipment,
    root,
    carrier: right,
    looseCell,
    extension,
    unit,
  };

  const baseResult = relativeMonadFromEquipment(monad, witnesses ?? {});
  const resolution = analyzeRelativeMonadResolution({ monad, adjunction });

  const combinedIssues = [
    ...baseResult.issues,
    ...extractionIssues,
    ...(homIsomorphism.holds
      ? []
      : homIsomorphism.issues.map((issue) => `Hom-isomorphism: ${issue}`)),
    ...(resolution.holds ? [] : resolution.issues),
  ];

  const holds =
    baseResult.holds && extractionIssues.length === 0 && homIsomorphism.holds && resolution.holds;

  const successDetails = `Relative adjunction induced monad: ${baseResult.details} ${resolution.details}`;
  const failureFragments = [
    extractionIssues.length > 0
      ? `Loose arrow extraction issues: ${extractionIssues.join("; ")}`
      : undefined,
    baseResult.holds ? undefined : baseResult.details,
    homIsomorphism.holds ? undefined : homIsomorphism.details,
    resolution.holds ? undefined : resolution.details,
  ].filter((fragment): fragment is string => fragment !== undefined);

  const failureDetails =
    failureFragments.length > 0
      ? failureFragments.join(" ")
      : `Relative adjunction-derived monad issues: ${combinedIssues.join("; ")}`;

  return {
    ...baseResult,
    holds,
    issues: holds ? [] : combinedIssues,
    details: holds ? successDetails : failureDetails,
    monad,
    adjunctionHomIsomorphism: homIsomorphism,
    resolution,
  };
};

const frameMatchesLooseCell = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  frame: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>> },
  looseCell: EquipmentProarrow<Obj, Payload>,
  label: string,
  issues: string[],
): void => {
  if (frame.arrows.length !== 1) {
    issues.push(`${label} should consist of exactly one loose arrow matching E(j,t).`);
    return;
  }
  const [arrow] = frame.arrows;
  if (!arrow) {
    issues.push(`${label} arrow is missing after length check.`);
    return;
  }
  if (!equality(arrow.from, looseCell.from) || !equality(arrow.to, looseCell.to)) {
    issues.push(`${label} arrow must share the loose cell's endpoints.`);
  }
};

const singleArrowFromFrame = <Obj, Payload>(
  frame: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>> },
): EquipmentProarrow<Obj, Payload> | undefined =>
  frame.arrows.length === 1 ? frame.arrows[0] : undefined;

const boundariesMatch = <Obj, Arr>(
  equality: (left: Obj, right: Obj) => boolean,
  actual: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
  issues: string[],
): void => {
  if (!verticalBoundariesEqual(equality, actual, expected)) {
    issues.push(`${label} must equal the designated tight boundary.`);
  }
};

export const analyzeRelativeMonadFraming = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadFramingReport => {
  const { equipment, root, carrier, looseCell, extension, unit } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(root.from, carrier.from) || !equality(root.to, carrier.to)) {
    issues.push("Root j and carrier t must share domain and codomain.");
  }
  if (!equality(looseCell.from, root.from) || !equality(looseCell.to, carrier.to)) {
    issues.push("Underlying loose cell E(j,t) must run from dom(j) to cod(t).");
  }

  frameMatchesLooseCell(
    equality,
    extension.target,
    looseCell,
    "Extension target",
    issues,
  );
  frameMatchesLooseCell(equality, unit.target, looseCell, "Unit target", issues);

  if (!equality(extension.source.leftBoundary, root.from)) {
    issues.push("Extension source left boundary must equal dom(j).");
  }
  if (!equality(extension.source.rightBoundary, carrier.to)) {
    issues.push("Extension source right boundary must equal cod(t).");
  }
  if (!equality(unit.source.leftBoundary, root.from)) {
    issues.push("Unit source left boundary must equal dom(j).");
  }
  if (!equality(unit.source.rightBoundary, root.to)) {
    issues.push("Unit source right boundary must equal cod(j) = cod(t).");
  }

  boundariesMatch(equality, extension.boundaries.left, root, "Extension left boundary", issues);
  boundariesMatch(equality, extension.boundaries.right, carrier, "Extension right boundary", issues);
  boundariesMatch(equality, unit.boundaries.left, root, "Unit left boundary", issues);
  boundariesMatch(equality, unit.boundaries.right, carrier, "Unit right boundary", issues);

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details:
      holds
        ? "Relative monad unit and extension 2-cells have compatible framing with the chosen root and carrier."
        : `Relative monad framing issues: ${issues.join("; ")}`,
  };
};

const composeExtensionSource = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  frame: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>> },
  issues: string[],
) => {
  if (frame.arrows.length === 0) {
    issues.push("Extension source must contain at least one loose arrow to compose with the unit action.");
    return undefined;
  }
  const composite = equipment.proarrows.horizontalComposeMany(frame.arrows);
  if (composite === undefined) {
    issues.push("Extension source arrows must be horizontally composable inside the equipment.");
  }
  return composite;
};

export const analyzeRelativeMonadUnitCompatibility = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLawComponentReport<
  RelativeMonadUnitCompatibilityWitness<Obj, Arr, Payload, Evidence>
> => {
  const { equipment, looseCell, extension, unit, root } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const unitArrow = singleArrowFromFrame(unit.target);
  if (!unitArrow) {
    issues.push("Unit target should provide the loose arrow used for Kleisli identities.");
  } else {
    if (!equality(unitArrow.from, looseCell.from)) {
      issues.push("Unit target arrow should start at dom(j) so extend(unit) composes.");
    }
    if (!equality(unitArrow.to, looseCell.to)) {
      issues.push("Unit target arrow should land at cod(t) for the extension composite.");
    }
  }

  const composite = composeExtensionSource(equipment, extension.source, issues);
  const firstArrow = extension.source.arrows[0];
  const lastArrow = extension.source.arrows[extension.source.arrows.length - 1];

  if (firstArrow && !equality(firstArrow.from, looseCell.from)) {
    issues.push("Extension source should begin at dom(j) so the unit comparison is defined.");
  }
  if (lastArrow && !equality(lastArrow.to, looseCell.to)) {
    issues.push("Extension source should end at cod(t) to reuse the loose arrow boundaries.");
  }

  if (composite && !equality(composite.from, root.from)) {
    issues.push("Composite of extension source arrows should start at dom(j).");
  }
  if (composite && !equality(composite.to, looseCell.to)) {
    issues.push("Composite of extension source arrows should land at cod(t).");
  }

  const holds = issues.length === 0;
  const details = holds
    ? "Structural prerequisites for extend(unit) hold; Street-level equality remains pending."
    : `Relative monad unit compatibility issues: ${issues.join("; ")}`;

  const witness: RelativeMonadUnitCompatibilityWitness<Obj, Arr, Payload, Evidence> = {
    extensionSourceArrows: [...extension.source.arrows],
    ...(unitArrow && { unitArrow }),
    ...(composite && { extensionComposite: composite }),
  };

  return {
    holds,
    pending: true,
    issues,
    details,
    witness,
  };
};

export const analyzeRelativeMonadExtensionAssociativity = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLawComponentReport<
  RelativeMonadExtensionAssociativityWitness<Obj, Arr, Payload, Evidence>
> => {
  const { equipment, extension, looseCell } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (extension.source.arrows.length < 2) {
    issues.push("Extension source should exhibit at least two composable loose arrows to witness associativity.");
  }

  const composite = composeExtensionSource(equipment, extension.source, issues);

  if (composite && !equality(composite.from, looseCell.from)) {
    issues.push("Composite of extension source arrows should start at dom(j) for associativity pastings.");
  }
  if (composite && !equality(composite.to, looseCell.to)) {
    issues.push("Composite of extension source arrows should end at cod(t) to compare both pastings.");
  }

  const holds = issues.length === 0;
  const details = holds
    ? "Extension source arrows compose; associativity equality awaits Street pasting witnesses."
    : `Relative monad associativity prerequisites failed: ${issues.join("; ")}`;

  const witness: RelativeMonadExtensionAssociativityWitness<Obj, Arr, Payload, Evidence> = {
    extensionSourceArrows: [...extension.source.arrows],
    ...(composite && { extensionComposite: composite }),
  };

  return {
    holds,
    pending: true,
    issues,
    details,
    witness,
  };
};

export const analyzeRelativeMonadRootIdentity = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLawComponentReport<
  RelativeMonadRootIdentityWitness<Obj, Arr, Payload, Evidence>
> => {
  const { equipment, root, looseCell, unit } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const restriction = equipment.restrictions.left(root.tight, looseCell);
  if (restriction === undefined) {
    issues.push("Left restriction B(j,1) should exist so the unit preserves identities along the root.");
  }

  const unitSourceArrow = singleArrowFromFrame(unit.source);
  if (!unitSourceArrow) {
    issues.push("Unit source should consist of the identity loose arrow on dom(j).");
  } else {
    if (!equality(unitSourceArrow.from, root.from)) {
      issues.push("Unit source arrow should start at dom(j).");
    }
    if (!equality(unitSourceArrow.to, root.from)) {
      issues.push("Unit source arrow should end at dom(j) to represent the identity along the root.");
    }
  }

  const holds = issues.length === 0;
  const details = holds
    ? "Restriction and unit framing preserve the root identity; comparison with Street calculus remains pending."
    : `Relative monad root-identity issues: ${issues.join("; ")}`;

  const witness: RelativeMonadRootIdentityWitness<Obj, Arr, Payload, Evidence> = {
    ...(restriction && { restriction }),
    ...(unitSourceArrow && { unitSourceArrow }),
  };

  return {
    holds,
    pending: true,
    issues,
    details,
    witness,
  };
};

export const analyzeRelativeMonadLaws = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLawAnalysis<Obj, Arr, Payload, Evidence> => ({
  monad: data,
  framing: analyzeRelativeMonadFraming(data),
  unitCompatibility: analyzeRelativeMonadUnitCompatibility(data),
  extensionAssociativity: analyzeRelativeMonadExtensionAssociativity(data),
  rootIdentity: analyzeRelativeMonadRootIdentity(data),
});

export const describeTrivialRelativeMonad = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
): RelativeMonadData<Obj, Arr, Payload, Evidence> => {
  const root = identityVerticalBoundary(
    equipment,
    object,
    "Trivial relative monad root chosen as the identity tight 1-cell.",
  );
  const carrier = identityVerticalBoundary(
    equipment,
    object,
    "Trivial relative monad carrier equals the identity tight 1-cell.",
  );
  const looseCell = identityProarrow(equipment, object);
  const framed = frameFromProarrow(looseCell);
  const boundaries = {
    left: root,
    right: carrier,
  };
  const identityEvidence = equipment.cells.identity(framed, boundaries);
  const extension: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: framed,
    target: framed,
    boundaries,
    evidence: identityEvidence,
  };
  return {
    equipment,
    root,
    carrier,
    looseCell,
    extension,
    unit: extension,
  };
};

export interface RelativeMonadIdentityRootOptions<Obj> {
  readonly rootObject: Obj;
  readonly objects?: ReadonlyArray<Obj>;
  readonly equalsObjects?: ObjectEquality<Obj>;
  readonly details?: {
    readonly root?: string;
    readonly carrier?: string;
  };
}

export const fromMonad = <Obj, Arr>(
  monad: CatMonad<TightCategory<Obj, Arr>>,
  options: RelativeMonadIdentityRootOptions<Obj>,
): RelativeMonadData<
  Obj,
  Arr,
  CatMonad<TightCategory<Obj, Arr>>["endofunctor"],
  TightCellEvidence<Obj, Arr>
> => {
  type Endofunctor = CatMonad<TightCategory<Obj, Arr>>["endofunctor"];

  const equality = options.equalsObjects ?? defaultObjectEquality<Obj>;
  const knownObjects = options.objects ?? [];
  const rootObject = options.rootObject;
  const ensuredRoot = knownObjects.some((object) => equality(object, rootObject))
    ? knownObjects
    : [rootObject, ...knownObjects];
  const carrierTarget = monad.endofunctor.onObj(rootObject);
  const objects = ensuredRoot.some((object) => equality(object, carrierTarget))
    ? ensuredRoot
    : [...ensuredRoot, carrierTarget];

  const equipment: VirtualEquipment<Obj, Arr, Endofunctor, TightCellEvidence<Obj, Arr>> =
    virtualizeCategory(monad.category, {
      objects,
      ...(options.equalsObjects !== undefined && { equalsObjects: options.equalsObjects }),
    });

  const root = identityVerticalBoundary(
    equipment,
    rootObject,
    options.details?.root ??
      "Identity root induced by embedding a classical monad into the relative layer.",
  );

  const carrier: EquipmentVerticalBoundary<Obj, Arr> = {
    from: rootObject,
    to: carrierTarget,
    tight: monad.endofunctor,
    details:
      options.details?.carrier ??
      "Carrier boundary arises from the monad endofunctor applied to the chosen root object.",
  };

  const looseCell: EquipmentProarrow<Obj, Endofunctor> = {
    from: rootObject,
    to: carrierTarget,
    payload: monad.endofunctor,
  };

  const framed = frameFromProarrow(looseCell);
  const boundaries = { left: root, right: carrier };

  const unit: Equipment2Cell<Obj, Arr, Endofunctor, TightCellEvidence<Obj, Arr>> = {
    source: framed,
    target: framed,
    boundaries,
    evidence: { kind: "tight", cell: monad.unit },
  };

  const extension: Equipment2Cell<Obj, Arr, Endofunctor, TightCellEvidence<Obj, Arr>> = {
    source: framed,
    target: framed,
    boundaries,
    evidence: { kind: "tight", cell: monad.mult },
  };

  return {
    equipment,
    root,
    carrier,
    looseCell,
    extension,
    unit,
  };
};

export interface RelativeMonadIdentityCollapseResult<C> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly monad?: CatMonad<C>;
}

type TightCellWitness<Obj, Arr> = Extract<
  TightCellEvidence<Obj, Arr>,
  { readonly kind: "tight" }
>;

const isTightCellEvidence = <Obj, Arr>(
  evidence: unknown,
): evidence is TightCellWitness<Obj, Arr> =>
  typeof evidence === "object" &&
  evidence !== null &&
  (evidence as { readonly kind?: unknown }).kind === "tight";

export const toMonadIfIdentity = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadIdentityCollapseResult<typeof data.equipment.tight.category> => {
  const reduction = analyzeRelativeMonadIdentityReduction(data);
  if (!reduction.holds) {
    return {
      holds: false,
      issues: reduction.issues,
      details: reduction.details,
    };
  }

  const issues: string[] = [];
  const unitEvidence = isTightCellEvidence<Obj, Arr>(data.unit.evidence)
    ? data.unit.evidence
    : undefined;
  if (!unitEvidence) {
    issues.push(
      "Relative monad unit evidence must be a tight 2-cell to recover the classical monad unit.",
    );
  }
  const extensionEvidence = isTightCellEvidence<Obj, Arr>(data.extension.evidence)
    ? data.extension.evidence
    : undefined;
  if (!extensionEvidence) {
    issues.push(
      "Relative monad extension evidence must be a tight 2-cell to recover the classical monad multiplication.",
    );
  }

  if (issues.length > 0 || unitEvidence === undefined || extensionEvidence === undefined) {
    return {
      holds: false,
      issues,
      details: `Relative monad cannot collapse to an ordinary monad: ${issues.join("; ")}`,
    };
  }

  const monad: CatMonad<typeof data.equipment.tight.category> = {
    category: data.equipment.tight.category,
    endofunctor: data.carrier.tight,
    unit: unitEvidence.cell,
    mult: extensionEvidence.cell,
  };

  return {
    holds: true,
    issues: [],
    details: `${reduction.details} Recovered the classical monad data from the identity-root presentation.`,
    monad,
  };
};

export const analyzeRelativeMonadRepresentability = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RepresentabilityWitness<Obj, Arr>,
): RelativeMonadRepresentabilityReport<Obj, Arr> => {
  const framing = analyzeRelativeMonadFraming(data);
  const issues = [...framing.issues];

  const equality = data.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (witness.orientation !== "left") {
    issues.push(
      "Representability witness must arise from a left restriction B(j,1) to align with Theorem 4.16.",
    );
  }

  if (!equality(witness.object, data.root.from)) {
    issues.push("Representability witness object must match the domain of the root j.");
  }

  if (witness.tight !== data.root.tight) {
    issues.push("Representability witness must reuse the root tight 1-cell when restricting the identity.");
  }

  if (!equality(data.looseCell.from, data.root.from)) {
    issues.push("Relative monad loose arrow should start at the domain certified by the representability witness.");
  }

  const holds = issues.length === 0;
  const details = holds
    ? "Relative monad admits a representable loose presentation via the left restriction of the identity along j."
    : `Relative monad representability issues: ${issues.join("; ")}. Framing details: ${framing.details}`;

  return {
    holds,
    issues,
    details,
    framing,
    representability: witness,
  };
};

export const analyzeRelativeMonadIdentityReduction = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadIdentityReductionReport => {
  const { equipment, root, carrier, looseCell, extension, unit } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!verticalBoundariesEqual(equality, root, carrier)) {
    issues.push("Root j and carrier t must coincide to model an ordinary monad.");
  }

  if (!isIdentityVerticalBoundary(equipment, root.from, root)) {
    issues.push("Root j should be the identity tight 1-cell to recover a classical monad.");
  }

  if (!isIdentityVerticalBoundary(equipment, carrier.from, carrier)) {
    issues.push("Carrier t should equal the identity tight 1-cell when j = id.");
  }

  if (!equality(looseCell.from, root.from) || !equality(looseCell.to, root.to)) {
    issues.push("Underlying loose cell must be an endoarrow on the shared object.");
  }

  boundariesMatch(
    equality,
    extension.boundaries.left,
    root,
    "Extension left boundary",
    issues,
  );
  boundariesMatch(
    equality,
    extension.boundaries.right,
    carrier,
    "Extension right boundary",
    issues,
  );
  boundariesMatch(equality, unit.boundaries.left, root, "Unit left boundary", issues);
  boundariesMatch(equality, unit.boundaries.right, carrier, "Unit right boundary", issues);

  frameMatchesLooseCell(
    equality,
    extension.target,
    looseCell,
    "Extension target",
    issues,
  );
  frameMatchesLooseCell(equality, unit.target, looseCell, "Unit target", issues);

  const holds = issues.length === 0;
  const details = holds
    ? "Relative monad data over the identity root collapses to an ordinary monad as in Corollary 4.20."
    : `Identity-root reduction issues: ${issues.join("; ")}`;

  return { holds, issues, details };
};

export const analyzeRelativeMonadResolution = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadResolutionData<Obj, Arr, Payload, Evidence>,
): RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence> => {
  const { monad, adjunction } = data;
  const issues: string[] = [];

  if (monad.equipment !== adjunction.equipment) {
    issues.push("Relative adjunction and monad must share the same virtual equipment.");
  }

  const equality = adjunction.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (!verticalBoundariesEqual(equality, monad.root, adjunction.root)) {
    issues.push("Relative adjunction root j must match the monad root.");
  }

  if (!verticalBoundariesEqual(equality, monad.carrier, adjunction.right)) {
    issues.push("Relative monad carrier should match the right leg r.");
  }

  if (!equality(monad.looseCell.from, adjunction.root.from)) {
    issues.push("Loose arrow E(j,r) should originate at the domain of j.");
  }

  if (!equality(monad.looseCell.to, adjunction.right.to)) {
    issues.push("Loose arrow E(j,r) should land at the codomain of r.");
  }

  const monadFraming = analyzeRelativeMonadFraming(monad);
  const homIsomorphism = analyzeRelativeAdjunctionHomIsomorphism(adjunction);

  const looseIssues: string[] = [];
  const forwardTarget = adjunction.homIsomorphism.forward.target;

  if (!equality(forwardTarget.leftBoundary, monad.looseCell.from)) {
    looseIssues.push("Hom-isomorphism target should start at dom(j) to expose E(j,r).");
  }

  if (!equality(forwardTarget.rightBoundary, monad.looseCell.to)) {
    looseIssues.push("Hom-isomorphism target should end at cod(r) to expose E(j,r).");
  }

  const matchingArrows = forwardTarget.arrows.filter(
    (arrow) => equality(arrow.from, monad.looseCell.from) && equality(arrow.to, monad.looseCell.to),
  );

  let induced: EquipmentProarrow<Obj, Payload> | undefined;

  if (matchingArrows.length === 0) {
    looseIssues.push("Hom-isomorphism target should contain a loose arrow matching E(j,r).");
  } else {
    if (matchingArrows.length > 1) {
      looseIssues.push("Hom-isomorphism target should identify a unique loose arrow matching E(j,r).");
    }
    [induced] = matchingArrows;
    if (induced && induced !== monad.looseCell) {
      looseIssues.push("Loose monad arrow C(ℓ,r) must coincide with the supplied E(j,r) witness.");
    }
  }

  const looseHolds = looseIssues.length === 0;
  const looseMonad: RelativeMonadResolutionLooseMonadReport<Obj, Payload> = {
    holds: looseHolds,
    issues: looseIssues,
    details: looseHolds
      ? "Hom-isomorphism target realises the loose arrow E(j,r) as promised by Lemma 5.27 and Corollary 5.28."
      : `Loose monad comparison issues: ${looseIssues.join("; ")}`,
    ...(induced !== undefined && { induced }),
  };

  const combinedIssues = [
    ...issues,
    ...monadFraming.issues,
    ...homIsomorphism.issues,
    ...looseMonad.issues,
  ];

  const holds =
    issues.length === 0 && monadFraming.holds && homIsomorphism.holds && looseMonad.holds;

  return {
    holds,
    issues: holds ? [] : combinedIssues,
    details: holds
      ? "Relative adjunction resolves the monad: root, carrier, and loose arrow agree with Theorem 5.24."
      : `Relative adjunction resolution issues: ${combinedIssues.join("; ")}`,
    monadFraming,
    homIsomorphism,
    looseMonad,
  };
};

export interface RelativeMonadSkewMonoidBridgeInput<Obj, Arr, Payload, Evidence> {
  readonly relative: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly monoid: LooseMonoidData<Obj, Arr, Payload, Evidence>;
  readonly monoidShape: LooseMonoidShapeReport;
  readonly representability: RelativeMonadRepresentabilityReport<Obj, Arr>;
  readonly leftExtensions: {
    readonly existence: LeftExtensionFromColimitAnalysis;
    readonly preservation: PointwiseLeftExtensionLiftAnalysis;
    readonly absolute: AbsoluteColimitAnalysis;
    readonly density: DensityAnalysis;
    readonly rightUnit: FullyFaithfulLeftExtensionAnalysis;
  };
}

export interface RelativeMonadSkewMonoidBridgeReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

const collectDependencyIssues = (
  label: string,
  holds: boolean,
  details: string,
  issues: ReadonlyArray<string>,
  accumulator: string[],
): void => {
  if (holds) {
    return;
  }
  accumulator.push(`${label} failed: ${details}`);
  issues.forEach((issue) => accumulator.push(`${label}: ${issue}`));
};

export const analyzeRelativeMonadSkewMonoidBridge = <Obj, Arr, Payload, Evidence>(
  input: RelativeMonadSkewMonoidBridgeInput<Obj, Arr, Payload, Evidence>,
): RelativeMonadSkewMonoidBridgeReport => {
  const { relative, monoid, monoidShape, representability, leftExtensions } = input;
  const { equipment } = relative;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(relative.looseCell.from, monoid.looseCell.from)) {
    issues.push("Loose monoid object should share the relative monad's source endpoint.");
  }
  if (!equality(relative.looseCell.to, monoid.looseCell.to)) {
    issues.push("Loose monoid object should share the relative monad's target endpoint.");
  }

  if (monoid.multiplication !== relative.extension) {
    issues.push("Loose monoid multiplication must reuse the relative monad's extension 2-cell.");
  }
  if (monoid.unit !== relative.unit) {
    issues.push("Loose monoid unit must reuse the relative monad's unit 2-cell.");
  }

  collectDependencyIssues(
    "Representability",
    representability.holds,
    representability.details,
    representability.issues,
    issues,
  );

  collectDependencyIssues(
    "Loose monoid framing",
    monoidShape.holds,
    monoidShape.details,
    monoidShape.issues,
    issues,
  );

  collectDependencyIssues(
    "Left extension existence",
    leftExtensions.existence.holds,
    leftExtensions.existence.details,
    leftExtensions.existence.issues,
    issues,
  );
  collectDependencyIssues(
    "Left extension preservation",
    leftExtensions.preservation.holds,
    leftExtensions.preservation.details,
    leftExtensions.preservation.issues,
    issues,
  );
  collectDependencyIssues(
    "j-absolute comparison",
    leftExtensions.absolute.holds,
    leftExtensions.absolute.details,
    leftExtensions.absolute.issues,
    issues,
  );
  collectDependencyIssues(
    "Density witness",
    leftExtensions.density.holds,
    leftExtensions.density.details,
    leftExtensions.density.issues,
    issues,
  );
  collectDependencyIssues(
    "Right unit invertibility",
    leftExtensions.rightUnit.holds,
    leftExtensions.rightUnit.details,
    leftExtensions.rightUnit.issues,
    issues,
  );

  const holds = issues.length === 0;
  const successNarrative = [
    representability.details,
    monoidShape.details,
    leftExtensions.existence.details,
    leftExtensions.preservation.details,
    leftExtensions.absolute.details,
    leftExtensions.density.details,
    leftExtensions.rightUnit.details,
  ];

  const details = holds
    ? `Relative monad data satisfies Theorem 4.29: ${successNarrative.join(" | ")}`
    : `Relative monad skew-monoid issues: ${issues.join("; ")}`;

  return { holds, issues, details };
};

export interface RelativeMonadRepresentableRecoveryOptions<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly skewMonoidBridgeInput?: RelativeMonadSkewMonoidBridgeInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeMonadRepresentableRecoveryReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly embedding: RelativeMonadFiberEmbeddingReport<Obj, Arr, Payload, Evidence>;
  readonly skewMonoid?: RelativeMonadSkewMonoidBridgeReport;
}

export const analyzeRelativeMonadRepresentableRecovery = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RepresentabilityWitness<Obj, Arr>,
  options: RelativeMonadRepresentableRecoveryOptions<Obj, Arr, Payload, Evidence> = {},
): RelativeMonadRepresentableRecoveryReport<Obj, Arr, Payload, Evidence> => {
  const embedding = embedRelativeMonadIntoFiber(data, witness);
  const issues = [...embedding.issues];

  let skewMonoid: RelativeMonadSkewMonoidBridgeReport | undefined;
  if (options.skewMonoidBridgeInput) {
    skewMonoid = analyzeRelativeMonadSkewMonoidBridge(options.skewMonoidBridgeInput);
    if (!skewMonoid.holds) {
      issues.push(`Skew-monoid comparison failed: ${skewMonoid.details}`);
      issues.push(...skewMonoid.issues);
    }
  }

  const holds = embedding.holds && (!skewMonoid || skewMonoid.holds);
  const pending = true;

  const details = holds
    ? options.skewMonoidBridgeInput
      ? "Representable root aligns with Levy and Altenkirch–Chapman–Uustalu presentations; explicit equivalence witnesses remain pending."
      : "Representable root prerequisites satisfied; provide skew-monoid bridge data to compare with Levy/ACU constructions."
    : `Representable recovery issues: ${issues.join("; ")}`;

  return {
    holds,
    pending,
    issues,
    details,
    embedding,
    ...(skewMonoid && { skewMonoid }),
  };
};
