import { EquipmentLawRegistry, type EquipmentLawKey } from "./equipment-laws";
import type {
  Equipment2Cell,
  EquipmentCartesian2Cell,
  VirtualEquipment,
} from "./virtual-equipment";
import {
  frameFromProarrow,
  frameFromSequence,
  identityProarrow,
  identityVerticalBoundary,
  virtualizeCategory,
} from "./virtual-equipment";
import {
  companionViaIdentityRestrictions,
  type CompanionAttempt,
} from "./companions";
import {
  conjointViaIdentityRestrictions,
  type ConjointAttempt,
} from "./conjoints";
import {
  analyzeLooseMonadShape,
  type LooseMonadData,
  type LooseMonoidShapeReport,
} from "./loose-structures";
import {
  analyzeLooseSkewComposition,
  describeIdentityLooseMultimorphism,
  type LooseSkewCompositionAnalysis,
  type LooseSkewMultimorphism,
} from "./skew-multicategory";
import {
  analyzeLooseAdjunction,
  type LooseAdjunctionAnalysis,
  type LooseAdjunctionData,
} from "./maps";
import {
  analyzeRightExtension,
  analyzeRightExtensionLiftCompatibility,
  analyzeRightLift,
  type RightExtensionAnalysis,
  type RightExtensionData,
  type RightExtensionLiftCompatibilityAnalysis,
  type RightExtensionLiftCompatibilityInput,
  type RightLiftAnalysis,
  type RightLiftData,
} from "./extensions";
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
} from "./limits";
import {
  analyzeAbsoluteColimitWitness,
  analyzeDensityViaIdentityRestrictions,
  analyzeLeftExtensionPreservesAbsolute,
  analyzePointwiseLeftLift,
  type AbsoluteColimitAnalysis,
  type AbsoluteColimitPreservationData,
  type AbsoluteColimitWitnessData,
  type DensityAnalysis,
  type DensityViaIdentityRestrictionsData,
  type PointwiseLeftLiftAnalysis,
  type PointwiseLeftLiftData,
} from "./absoluteness";
import {
  analyzeFullyFaithfulLeftExtension,
  analyzeFullyFaithfulTight1Cell,
  analyzePointwiseLeftExtensionLiftCorrespondence,
  type FullyFaithfulAnalysis,
  type FullyFaithfulInput,
  type FullyFaithfulLeftExtensionAnalysis,
  type FullyFaithfulLeftExtensionInput,
  type PointwiseLeftExtensionLiftAnalysis,
  type PointwiseLeftExtensionLiftInput,
} from "./faithfulness";
import {
  analyzeBicategoryPentagon,
  analyzeBicategoryTriangle,
  type Bicategory,
  type BicategoryPentagonData,
  type BicategoryTriangleData,
} from "./bicategory";
import type { StreetComparisonEvaluation } from "./street-calculus";
import type { Tight1Cell, TightCategory } from "./tight-primitives";
import { TwoObjectCategory } from "../two-object-cat";

export interface OracleResult<Analysis = unknown> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly analysis?: Analysis;
}

const createOracleResult = <Analysis>(
  law: EquipmentLawKey,
  result: { readonly holds: boolean; readonly details: string },
  analysis?: Analysis,
): OracleResult<Analysis> => {
  const descriptor = EquipmentLawRegistry[law];
  return {
    holds: result.holds,
    pending: false,
    registryPath: descriptor.registryPath,
    details: result.details,
    ...(analysis !== undefined ? { analysis } : {}),
  };
};

const createPendingResult = (
  law: EquipmentLawKey,
  reason: string,
): OracleResult => {
  const descriptor = EquipmentLawRegistry[law];
  return {
    holds: false,
    pending: true,
    registryPath: descriptor.registryPath,
    details: `${descriptor.name} oracle is pending: ${reason}`,
  };
};

export interface CompanionOracleData<Obj, Arr, Payload, Evidence> {
  readonly tight: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly attempt: CompanionAttempt<Obj, Arr, Payload, Evidence>;
}

export interface ConjointOracleData<Obj, Arr, Payload, Evidence> {
  readonly tight: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly attempt: ConjointAttempt<Obj, Arr, Payload, Evidence>;
}

export interface EquipmentOracleContext<Obj, Arr, Payload, Evidence> {
  readonly equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>;
  readonly companion: CompanionOracleData<Obj, Arr, Payload, Evidence>;
  readonly conjoint: ConjointOracleData<Obj, Arr, Payload, Evidence>;
  readonly looseMonad: {
    readonly data: LooseMonadData<Obj, Arr, Payload, Evidence>;
  };
  readonly skew: {
    readonly outer: LooseSkewMultimorphism<Obj, Arr, Payload, Evidence>;
    readonly inners: ReadonlyArray<
      LooseSkewMultimorphism<Obj, Arr, Payload, Evidence>
    >;
  };
  readonly maps: {
    readonly adjunction: LooseAdjunctionData<Obj, Arr, Payload, Evidence>;
  };
  readonly extensions: {
    readonly rightExtension: RightExtensionData<Obj, Arr, Payload, Evidence>;
    readonly rightLift: RightLiftData<Obj, Arr, Payload, Evidence>;
    readonly compatibility: RightExtensionLiftCompatibilityInput<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
  };
  readonly weighted: {
    readonly cone: WeightedConeData<Obj, Arr, Payload, Evidence>;
    readonly cocone: WeightedCoconeData<Obj, Arr, Payload, Evidence>;
    readonly colimitRestriction: WeightedColimitRestrictionData<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
    readonly limitRestriction: WeightedLimitRestrictionData<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
    readonly leftExtension: LeftExtensionFromColimitData<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
  };
  readonly density: {
    readonly identity: DensityViaIdentityRestrictionsData<Obj, Arr>;
  };
  readonly faithfulness: {
    readonly restrictions: FullyFaithfulInput<Obj, Arr>;
    readonly pointwise: PointwiseLeftExtensionLiftInput<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
    readonly leftExtension: FullyFaithfulLeftExtensionInput<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
  };
  readonly absolute: {
    readonly colimit: AbsoluteColimitWitnessData<Obj, Arr, Payload, Evidence>;
    readonly leftExtension: AbsoluteColimitPreservationData<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
    readonly pointwiseLeftLift: PointwiseLeftLiftData<
      Obj,
      Arr,
      Payload,
      Evidence
    >;
  };
  readonly bicategory?: {
    readonly instance: Bicategory<Obj, Arr, Payload, Evidence>;
    readonly pentagon: BicategoryPentagonData<Obj, Payload>;
    readonly triangle: BicategoryTriangleData<Obj, Payload>;
  };
}

const buildLooseMonadData = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
): LooseMonadData<Obj, Arr, Payload, Evidence> => {
  const loose = identityProarrow(equipment, object);
  const identityFrame = frameFromProarrow(loose);
  const boundaries = {
    left: identityVerticalBoundary(equipment, object),
    right: identityVerticalBoundary(equipment, object),
  } as const;
  const evidence = equipment.cells.identity(identityFrame, boundaries);

  const multiplication: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: frameFromSequence([loose, loose], loose.from, loose.to),
    target: identityFrame,
    boundaries,
    evidence,
  };

  const unitSource = identityProarrow(equipment, object);
  const unit: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: frameFromProarrow(unitSource),
    target: identityFrame,
    boundaries,
    evidence,
  };

  return {
    object,
    looseCell: loose,
    multiplication,
    unit,
  };
};

const buildAdjunctionData = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
): LooseAdjunctionData<Obj, Arr, Payload, Evidence> => {
  const left = identityProarrow(equipment, object);
  const right = identityProarrow(equipment, object);
  const boundaries = {
    left: identityVerticalBoundary(equipment, object),
    right: identityVerticalBoundary(equipment, object),
  } as const;
  const identityFrame = frameFromProarrow(left);
  const evidence = equipment.cells.identity(identityFrame, boundaries);

  const unit: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: frameFromProarrow(identityProarrow(equipment, object)),
    target: frameFromSequence([right, left], left.from, right.to),
    boundaries,
    evidence,
  };

  const counit: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: frameFromSequence([left, right], left.from, right.to),
    target: identityFrame,
    boundaries,
    evidence,
  };

  const rightRestriction = equipment.restrictions.right(
    identityProarrow(equipment, object),
    equipment.tight.identity,
  );

  return {
    left,
    right,
    unit,
    counit,
    ...(rightRestriction?.representability !== undefined
      ? { rightRepresentability: rightRestriction.representability }
      : {}),
  };
};

const buildExtensionData = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
) => {
  const loose = identityProarrow(equipment, object);
  const tightIdentity = equipment.tight.identity;
  const identityBoundaries = {
    left: identityVerticalBoundary(equipment, object),
    right: identityVerticalBoundary(equipment, object),
  } as const;
  const compositeFrame = frameFromSequence(
    [identityProarrow(equipment, object), loose],
    loose.from,
    loose.to,
  );
  const evidence = equipment.cells.identity(
    frameFromProarrow(loose),
    identityBoundaries,
  );

  const counit: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: frameFromProarrow(loose),
    target: compositeFrame,
    boundaries: identityBoundaries,
    evidence,
  };

  const unit: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: compositeFrame,
    target: frameFromProarrow(loose),
    boundaries: identityBoundaries,
    evidence,
  };

  const rightExtension: RightExtensionData<Obj, Arr, Payload, Evidence> = {
    loose,
    along: tightIdentity,
    extension: loose,
    counit,
  };

  const rightLift: RightLiftData<Obj, Arr, Payload, Evidence> = {
    loose,
    along: tightIdentity,
    lift: loose,
    unit,
  };

  const compatibility: RightExtensionLiftCompatibilityInput<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    extension: rightExtension,
    lift: rightLift,
  };

  return { rightExtension, rightLift, compatibility };
};

const buildWeightedData = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
) => {
  const loose = identityProarrow(equipment, object);
  const weight = frameFromProarrow(loose);
  const diagram = equipment.tight.identity;
  const boundaries = {
    left: identityVerticalBoundary(equipment, object),
    right: identityVerticalBoundary(equipment, object),
  } as const;
  const evidence = equipment.cells.identity(weight, boundaries);

  const cone: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: weight,
    target: frameFromProarrow(loose),
    boundaries,
    evidence,
  };

  const cocone: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: weight,
    target: frameFromProarrow(loose),
    boundaries,
    evidence,
  };

  const weightedCone: WeightedConeData<Obj, Arr, Payload, Evidence> = {
    weight,
    diagram,
    apex: loose,
    cone,
  };

  const weightedCocone: WeightedCoconeData<Obj, Arr, Payload, Evidence> = {
    weight,
    diagram,
    apex: loose,
    cocone,
  };

  const leftRestriction = equipment.restrictions.left(diagram, loose);
  const rightRestriction = equipment.restrictions.right(loose, diagram);

  if (!leftRestriction || !rightRestriction) {
    throw new Error(
      "Identity equipment should admit both B(f,1) and B(1,f) restrictions.",
    );
  }

  const colimitRestriction: WeightedColimitRestrictionData<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    cocone: weightedCocone,
    restriction: leftRestriction,
  };

  const limitRestriction: WeightedLimitRestrictionData<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    cone: weightedCone,
    restriction: rightRestriction,
  };

  const leftExtension: LeftExtensionFromColimitData<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    colimit: weightedCocone,
    extension: {
      loose,
      along: diagram,
      extension: loose,
      counit: cocone,
    },
  };

  return {
    cone: weightedCone,
    cocone: weightedCocone,
    colimitRestriction,
    limitRestriction,
    leftExtension,
  };
};

const buildAbsoluteData = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
) => {
  const loose = identityProarrow(equipment, object);
  const weight = frameFromProarrow(loose);
  const diagram = equipment.tight.identity;
  const boundaries = {
    left: identityVerticalBoundary(equipment, object),
    right: identityVerticalBoundary(equipment, object),
  } as const;
  const evidence = equipment.cells.identity(weight, boundaries);

  const cocone: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: weight,
    target: frameFromProarrow(loose),
    boundaries,
    evidence,
  };

  const weightedCocone: WeightedCoconeData<Obj, Arr, Payload, Evidence> = {
    weight,
    diagram,
    apex: loose,
    cocone,
  };

  const comparison: EquipmentCartesian2Cell<Obj, Arr, Payload, Evidence> = {
    ...cocone,
    cartesian: true,
    boundary: {
      direction: "left",
      vertical: cocone.boundaries.left,
      details: "Identity comparison witness for the j-absolute colimit.",
    },
  };

  const leftExtension: LeftExtensionFromColimitData<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    colimit: weightedCocone,
    extension: {
      loose,
      along: diagram,
      extension: loose,
      counit: cocone,
    },
  };

  const colimitWitness: AbsoluteColimitWitnessData<Obj, Arr, Payload, Evidence> = {
    j: diagram,
    f: diagram,
    colimit: weightedCocone,
    comparison,
  };

  const absolutePreservation: AbsoluteColimitPreservationData<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    absolute: colimitWitness,
    extension: leftExtension,
  };

  const liftBoundaries = {
    left: identityVerticalBoundary(equipment, object),
    right: identityVerticalBoundary(equipment, object),
  } as const;
  const liftEvidence = equipment.cells.identity(
    frameFromProarrow(loose),
    liftBoundaries,
  );

  const liftUnit: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: frameFromProarrow(loose),
    target: frameFromProarrow(loose),
    boundaries: liftBoundaries,
    evidence: liftEvidence,
  };

  const rightLift: RightLiftData<Obj, Arr, Payload, Evidence> = {
    loose,
    along: diagram,
    lift: loose,
    unit: liftUnit,
  };

  const weightedCone: WeightedConeData<Obj, Arr, Payload, Evidence> = {
    weight,
    diagram,
    apex: loose,
    cone: {
      source: weight,
      target: frameFromProarrow(loose),
      boundaries,
      evidence,
    },
  };

  const pointwiseLeftLift: PointwiseLeftLiftData<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    lift: rightLift,
    along: diagram,
    cone: weightedCone,
  };

  return {
    colimit: colimitWitness,
    leftExtension: absolutePreservation,
    pointwiseLeftLift,
  };
};

export const buildEquipmentOracleContext = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  options: { object?: Obj } = {},
): EquipmentOracleContext<Obj, Arr, Payload, Evidence> => {
  const [defaultObject] = equipment.objects;
  const object = options.object ?? defaultObject;
  if (object === undefined) {
    throw new Error(
      "Equipment oracle context requires at least one object in the equipment.",
    );
  }

  const companionAttempt = companionViaIdentityRestrictions(
    equipment,
    equipment.tight.identity,
  );
  const conjointAttempt = conjointViaIdentityRestrictions(
    equipment,
    equipment.tight.identity,
  );

  const looseMonadData = buildLooseMonadData(equipment, object);
  const skewIdentity = describeIdentityLooseMultimorphism(equipment, object);
  const extensions = buildExtensionData(equipment, object);
  const weighted = buildWeightedData(equipment, object);
  const absolute = buildAbsoluteData(equipment, object);

  const densityIdentity: DensityViaIdentityRestrictionsData<Obj, Arr> = {
    object,
    tight: equipment.tight.identity,
  };

  const faithfulnessRestrictions: FullyFaithfulInput<Obj, Arr> = {
    tight: equipment.tight.identity,
    domain: object,
    codomain: object,
  };

  const faithfulnessPointwise: PointwiseLeftExtensionLiftInput<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    extension: weighted.leftExtension,
    lift: extensions.rightLift,
  };

  const faithfulnessLeftExtension: FullyFaithfulLeftExtensionInput<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    fullyFaithful: faithfulnessRestrictions,
    extension: extensions.rightExtension,
    inverse: extensions.rightExtension.counit,
  };

  return {
    equipment,
    companion: {
      tight: equipment.tight.identity,
      attempt: companionAttempt,
    },
    conjoint: {
      tight: equipment.tight.identity,
      attempt: conjointAttempt,
    },
    looseMonad: { data: looseMonadData },
    skew: {
      outer: skewIdentity,
      inners: [skewIdentity],
    },
    maps: {
      adjunction: buildAdjunctionData(equipment, object),
    },
    extensions,
    weighted,
    density: { identity: densityIdentity },
    faithfulness: {
      restrictions: faithfulnessRestrictions,
      pointwise: faithfulnessPointwise,
      leftExtension: faithfulnessLeftExtension,
    },
    absolute,
  };
};

const defaultContext = buildEquipmentOracleContext(
  virtualizeCategory(TwoObjectCategory, {
    objects: TwoObjectCategory.objects,
  }),
);

export const getDefaultEquipmentOracleContext = () => defaultContext;

const resolveContext = <Obj, Arr, Payload, Evidence>(
  context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
): EquipmentOracleContext<Obj, Arr, Payload, Evidence> =>
  context ??
  ((defaultContext as unknown) as EquipmentOracleContext<
    Obj,
    Arr,
    Payload,
    Evidence
  >);

export const EquipmentOracles = {
  companion: {
    unit: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<CompanionAttempt<Obj, Arr, Payload, Evidence>> => {
      const resolved = resolveContext(context);
      const { attempt } = resolved.companion;
      if (!attempt.available || attempt.cartesian === undefined) {
        return createOracleResult(
          "companionUnit",
          {
            holds: false,
            details: `Companion unit unavailable: ${attempt.details}`,
          },
          attempt,
        );
      }
      return createOracleResult(
        "companionUnit",
        {
          holds: true,
          details: `Companion unit witness recovered via restrictions: ${attempt.details}`,
        },
        attempt,
      );
    },
    counit: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<CompanionAttempt<Obj, Arr, Payload, Evidence>> => {
      const resolved = resolveContext(context);
      const { attempt } = resolved.companion;
      if (!attempt.available) {
        return createOracleResult(
          "companionCounit",
          {
            holds: false,
            details: `Companion unavailable: ${attempt.details}`,
          },
          attempt,
        );
      }
      const witness = attempt.representability;
      const holds = witness !== undefined && witness.orientation === "left";
      return createOracleResult(
        "companionCounit",
        {
          holds,
          details: holds
            ? "Companion counit exposes a left-oriented representability witness."
            : "Companion counit lacks the expected left-oriented representability witness.",
        },
        attempt,
      );
    },
  },
  conjoint: {
    unit: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<ConjointAttempt<Obj, Arr, Payload, Evidence>> => {
      const resolved = resolveContext(context);
      const { attempt } = resolved.conjoint;
      if (!attempt.available || attempt.cartesian === undefined) {
        return createOracleResult(
          "conjointUnit",
          {
            holds: false,
            details: `Conjoint unit unavailable: ${attempt.details}`,
          },
          attempt,
        );
      }
      return createOracleResult(
        "conjointUnit",
        {
          holds: true,
          details: `Conjoint unit witness recovered via restrictions: ${attempt.details}`,
        },
        attempt,
      );
    },
    counit: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<ConjointAttempt<Obj, Arr, Payload, Evidence>> => {
      const resolved = resolveContext(context);
      const { attempt } = resolved.conjoint;
      if (!attempt.available) {
        return createOracleResult(
          "conjointCounit",
          {
            holds: false,
            details: `Conjoint unavailable: ${attempt.details}`,
          },
          attempt,
        );
      }
      const witness = attempt.representability;
      const holds = witness !== undefined && witness.orientation === "right";
      return createOracleResult(
        "conjointCounit",
        {
          holds,
          details: holds
            ? "Conjoint counit exposes a right-oriented representability witness."
            : "Conjoint counit lacks the expected right-oriented representability witness.",
        },
        attempt,
      );
    },
  },
  looseMonad: {
    unit: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<LooseMonoidShapeReport> => {
      const resolved = resolveContext(context);
      const analysis = analyzeLooseMonadShape(
        resolved.equipment,
        resolved.looseMonad.data,
      );
      return createOracleResult(
        "looseMonadUnit",
        {
          holds: analysis.holds,
          details: analysis.holds
            ? "Loose monad unit boundaries align with the identity framing."
            : analysis.details,
        },
        analysis,
      );
    },
    multiplication: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<LooseMonoidShapeReport> => {
      const resolved = resolveContext(context);
      const analysis = analyzeLooseMonadShape(
        resolved.equipment,
        resolved.looseMonad.data,
      );
      return createOracleResult(
        "looseMonadMultiplication",
        {
          holds: analysis.holds,
          details: analysis.holds
            ? "Loose monad multiplication is framed by composable copies of the loose arrow."
            : analysis.details,
        },
        analysis,
      );
    },
  },
  skew: {
    composition: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<LooseSkewCompositionAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeLooseSkewComposition(
        resolved.equipment,
        resolved.skew.outer,
        resolved.skew.inners,
      );
      return createOracleResult(
        "skewSubstitution",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
  },
  maps: {
    representableRight: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<LooseAdjunctionAnalysis<Obj, Arr>> => {
      const resolved = resolveContext(context);
      const analysis = analyzeLooseAdjunction(
        resolved.equipment,
        resolved.maps.adjunction,
      );
      const holds = analysis.holds && analysis.leftIsMap;
      return createOracleResult(
        "mapFromRepresentableRight",
        {
          holds,
          details: holds
            ? analysis.details
            : `${analysis.details} Left leg fails to be classified as a map.`,
        },
        analysis,
      );
    },
  },
  extensions: {
    rightExtension: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<RightExtensionAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeRightExtension(
        resolved.equipment,
        resolved.extensions.rightExtension,
      );
      return createOracleResult(
        "rightExtensionCounit",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    rightLift: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<RightLiftAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeRightLift(
        resolved.equipment,
        resolved.extensions.rightLift,
      );
      return createOracleResult(
        "rightLiftUnit",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    compatibility: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<RightExtensionLiftCompatibilityAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeRightExtensionLiftCompatibility(
        resolved.equipment,
        resolved.extensions.compatibility,
      );
      return createOracleResult(
        "rightExtensionLiftCompatibility",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
  },
  weighted: {
    cone: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<WeightedConeAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeWeightedCone(
        resolved.equipment,
        resolved.weighted.cone,
      );
      return createOracleResult(
        "weightedConeFraming",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    cocone: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<WeightedCoconeAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeWeightedCocone(
        resolved.equipment,
        resolved.weighted.cocone,
      );
      return createOracleResult(
        "weightedCoconeFraming",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    colimitRestriction: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<WeightedColimitRestrictionAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeWeightedColimitRestriction(
        resolved.equipment,
        resolved.weighted.colimitRestriction,
      );
      return createOracleResult(
        "weightedColimitRestriction",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    limitRestriction: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<WeightedLimitRestrictionAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeWeightedLimitRestriction(
        resolved.equipment,
        resolved.weighted.limitRestriction,
      );
      return createOracleResult(
        "weightedLimitRestriction",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    leftExtension: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<LeftExtensionFromColimitAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeLeftExtensionFromWeightedColimit(
        resolved.equipment,
        resolved.weighted.leftExtension,
      );
      return createOracleResult(
        "leftExtensionFromColimit",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
  },
  density: {
    identity: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<DensityAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeDensityViaIdentityRestrictions(
        resolved.equipment,
        resolved.density.identity,
      );
      return createOracleResult(
        "densityIdentity",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
  },
  faithfulness: {
    restrictions: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence>> => {
      const resolved = resolveContext(context);
      const analysis = analyzeFullyFaithfulTight1Cell(
        resolved.equipment,
        resolved.faithfulness.restrictions,
      );
      return createOracleResult(
        "fullyFaithfulRestrictions",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    pointwise: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<PointwiseLeftExtensionLiftAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzePointwiseLeftExtensionLiftCorrespondence(
        resolved.equipment,
        resolved.faithfulness.pointwise,
      );
      return createOracleResult(
        "pointwiseLeftExtensionLift",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    leftExtension: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<FullyFaithfulLeftExtensionAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeFullyFaithfulLeftExtension(
        resolved.equipment,
        resolved.faithfulness.leftExtension,
      );
      return createOracleResult(
        "fullyFaithfulLeftExtension",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
  },
  absolute: {
    colimit: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<AbsoluteColimitAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeAbsoluteColimitWitness(
        resolved.equipment,
        resolved.absolute.colimit,
      );
      return createOracleResult(
        "absoluteColimitComparison",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    leftExtension: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<AbsoluteColimitAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzeLeftExtensionPreservesAbsolute(
        resolved.equipment,
        resolved.absolute.leftExtension,
      );
      return createOracleResult(
        "absoluteLeftExtension",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
    pointwiseLeftLift: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<PointwiseLeftLiftAnalysis> => {
      const resolved = resolveContext(context);
      const analysis = analyzePointwiseLeftLift(
        resolved.equipment,
        resolved.absolute.pointwiseLeftLift,
      );
      return createOracleResult(
        "pointwiseLeftLift",
        { holds: analysis.holds, details: analysis.details },
        analysis,
      );
    },
  },
  bicategory: {
    pentagon: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<StreetComparisonEvaluation<Obj, Arr, Payload, Evidence>> => {
      const resolved = resolveContext(context);
      if (!resolved.bicategory) {
        return createPendingResult(
          "bicategoryPentagon",
          "Bicategory pentagon check requires explicit bicategory data in the oracle context.",
        );
      }
      const evaluation = analyzeBicategoryPentagon(
        resolved.bicategory.instance,
        resolved.bicategory.pentagon,
      );
      return createOracleResult(
        "bicategoryPentagon",
        { holds: evaluation.holds, details: evaluation.details },
        evaluation,
      );
    },
    triangle: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult<StreetComparisonEvaluation<Obj, Arr, Payload, Evidence>> => {
      const resolved = resolveContext(context);
      if (!resolved.bicategory) {
        return createPendingResult(
          "bicategoryTriangle",
          "Bicategory triangle check requires explicit bicategory data in the oracle context.",
        );
      }
      const evaluation = analyzeBicategoryTriangle(
        resolved.bicategory.instance,
        resolved.bicategory.triangle,
      );
      return createOracleResult(
        "bicategoryTriangle",
        { holds: evaluation.holds, details: evaluation.details },
        evaluation,
      );
    },
  },
  pseudofunctor: {
    coherence: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult =>
      createPendingResult(
        "pseudofunctorCoherence",
        "Pseudofunctor coherence data was not supplied to the oracle context.",
      ),
  },
  biadjunction: {
    triangle: <Obj, Arr, Payload, Evidence>(
      context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
    ): OracleResult =>
      createPendingResult(
        "biadjunctionTriangle",
        "Biadjunction data was not supplied to the oracle context.",
      ),
  },
} as const;

export const enumerateEquipmentOracles = <Obj, Arr, Payload, Evidence>(
  context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
): ReadonlyArray<OracleResult> => [
  EquipmentOracles.companion.unit(context),
  EquipmentOracles.companion.counit(context),
  EquipmentOracles.conjoint.unit(context),
  EquipmentOracles.conjoint.counit(context),
  EquipmentOracles.looseMonad.unit(context),
  EquipmentOracles.looseMonad.multiplication(context),
  EquipmentOracles.skew.composition(context),
  EquipmentOracles.maps.representableRight(context),
  EquipmentOracles.extensions.rightExtension(context),
  EquipmentOracles.extensions.rightLift(context),
  EquipmentOracles.extensions.compatibility(context),
  EquipmentOracles.weighted.cone(context),
  EquipmentOracles.weighted.cocone(context),
  EquipmentOracles.weighted.colimitRestriction(context),
  EquipmentOracles.weighted.limitRestriction(context),
  EquipmentOracles.weighted.leftExtension(context),
  EquipmentOracles.density.identity(context),
  EquipmentOracles.faithfulness.restrictions(context),
  EquipmentOracles.faithfulness.pointwise(context),
  EquipmentOracles.faithfulness.leftExtension(context),
  EquipmentOracles.absolute.colimit(context),
  EquipmentOracles.absolute.leftExtension(context),
  EquipmentOracles.absolute.pointwiseLeftLift(context),
  EquipmentOracles.bicategory.pentagon(context),
  EquipmentOracles.bicategory.triangle(context),
  EquipmentOracles.pseudofunctor.coherence(context),
  EquipmentOracles.biadjunction.triangle(context),
];

export { enumerateEquipmentOracles as enumeratePendingEquipmentOracles };

export interface EquipmentOracleSummary<Obj, Arr, Payload, Evidence> {
  readonly companion: {
    readonly unit: OracleResult<CompanionAttempt<Obj, Arr, Payload, Evidence>>;
    readonly counit: OracleResult<CompanionAttempt<Obj, Arr, Payload, Evidence>>;
  };
  readonly conjoint: {
    readonly unit: OracleResult<ConjointAttempt<Obj, Arr, Payload, Evidence>>;
    readonly counit: OracleResult<ConjointAttempt<Obj, Arr, Payload, Evidence>>;
  };
  readonly looseMonad: {
    readonly unit: OracleResult<LooseMonoidShapeReport>;
    readonly multiplication: OracleResult<LooseMonoidShapeReport>;
  };
  readonly skew: {
    readonly composition: OracleResult<LooseSkewCompositionAnalysis>;
  };
  readonly maps: {
    readonly representableRight: OracleResult<LooseAdjunctionAnalysis<Obj, Arr>>;
  };
  readonly extensions: {
    readonly rightExtension: OracleResult<RightExtensionAnalysis>;
    readonly rightLift: OracleResult<RightLiftAnalysis>;
    readonly compatibility: OracleResult<RightExtensionLiftCompatibilityAnalysis>;
  };
  readonly weighted: {
    readonly cone: OracleResult<WeightedConeAnalysis>;
    readonly cocone: OracleResult<WeightedCoconeAnalysis>;
    readonly colimitRestriction: OracleResult<WeightedColimitRestrictionAnalysis>;
    readonly limitRestriction: OracleResult<WeightedLimitRestrictionAnalysis>;
    readonly leftExtension: OracleResult<LeftExtensionFromColimitAnalysis>;
  };
  readonly density: {
    readonly identity: OracleResult<DensityAnalysis>;
  };
  readonly faithfulness: {
    readonly restrictions: OracleResult<FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence>>;
    readonly pointwise: OracleResult<PointwiseLeftExtensionLiftAnalysis>;
    readonly leftExtension: OracleResult<FullyFaithfulLeftExtensionAnalysis>;
  };
  readonly absolute: {
    readonly colimit: OracleResult<AbsoluteColimitAnalysis>;
    readonly leftExtension: OracleResult<AbsoluteColimitAnalysis>;
    readonly pointwiseLeftLift: OracleResult<PointwiseLeftLiftAnalysis>;
  };
  readonly bicategory: {
    readonly pentagon: OracleResult<StreetComparisonEvaluation<Obj, Arr, Payload, Evidence>>;
    readonly triangle: OracleResult<StreetComparisonEvaluation<Obj, Arr, Payload, Evidence>>;
  };
  readonly pseudofunctor: {
    readonly coherence: OracleResult;
  };
  readonly biadjunction: {
    readonly triangle: OracleResult;
  };
  readonly overall: boolean;
}

export const summarizeEquipmentOracles = <Obj, Arr, Payload, Evidence>(
  context?: EquipmentOracleContext<Obj, Arr, Payload, Evidence>,
): EquipmentOracleSummary<Obj, Arr, Payload, Evidence> => {
  const companionUnit = EquipmentOracles.companion.unit(context);
  const companionCounit = EquipmentOracles.companion.counit(context);
  const conjointUnit = EquipmentOracles.conjoint.unit(context);
  const conjointCounit = EquipmentOracles.conjoint.counit(context);
  const looseMonadUnit = EquipmentOracles.looseMonad.unit(context);
  const looseMonadMultiplication = EquipmentOracles.looseMonad.multiplication(context);
  const skewComposition = EquipmentOracles.skew.composition(context);
  const representableRight = EquipmentOracles.maps.representableRight(context);
  const rightExtension = EquipmentOracles.extensions.rightExtension(context);
  const rightLift = EquipmentOracles.extensions.rightLift(context);
  const compatibility = EquipmentOracles.extensions.compatibility(context);
  const weightedCone = EquipmentOracles.weighted.cone(context);
  const weightedCocone = EquipmentOracles.weighted.cocone(context);
  const weightedColimitRestriction = EquipmentOracles.weighted.colimitRestriction(context);
  const weightedLimitRestriction = EquipmentOracles.weighted.limitRestriction(context);
  const weightedLeftExtension = EquipmentOracles.weighted.leftExtension(context);
  const densityIdentity = EquipmentOracles.density.identity(context);
  const faithfulnessRestrictions = EquipmentOracles.faithfulness.restrictions(context);
  const faithfulnessPointwise = EquipmentOracles.faithfulness.pointwise(context);
  const faithfulnessLeftExtension = EquipmentOracles.faithfulness.leftExtension(context);
  const absoluteColimit = EquipmentOracles.absolute.colimit(context);
  const absoluteLeftExtension = EquipmentOracles.absolute.leftExtension(context);
  const absolutePointwiseLeftLift = EquipmentOracles.absolute.pointwiseLeftLift(context);
  const bicategoryPentagon = EquipmentOracles.bicategory.pentagon(context);
  const bicategoryTriangle = EquipmentOracles.bicategory.triangle(context);
  const pseudofunctorCoherence = EquipmentOracles.pseudofunctor.coherence(context);
  const biadjunctionTriangle = EquipmentOracles.biadjunction.triangle(context);

  const all = [
    companionUnit,
    companionCounit,
    conjointUnit,
    conjointCounit,
    looseMonadUnit,
    looseMonadMultiplication,
    skewComposition,
    representableRight,
    rightExtension,
    rightLift,
    compatibility,
    weightedCone,
    weightedCocone,
    weightedColimitRestriction,
    weightedLimitRestriction,
    weightedLeftExtension,
    densityIdentity,
    faithfulnessRestrictions,
    faithfulnessPointwise,
    faithfulnessLeftExtension,
    absoluteColimit,
    absoluteLeftExtension,
    absolutePointwiseLeftLift,
    bicategoryPentagon,
    bicategoryTriangle,
    pseudofunctorCoherence,
    biadjunctionTriangle,
  ];

  return {
    companion: {
      unit: companionUnit,
      counit: companionCounit,
    },
    conjoint: {
      unit: conjointUnit,
      counit: conjointCounit,
    },
    looseMonad: {
      unit: looseMonadUnit,
      multiplication: looseMonadMultiplication,
    },
    skew: {
      composition: skewComposition,
    },
    maps: {
      representableRight,
    },
    extensions: {
      rightExtension,
      rightLift,
      compatibility,
    },
    weighted: {
      cone: weightedCone,
      cocone: weightedCocone,
      colimitRestriction: weightedColimitRestriction,
      limitRestriction: weightedLimitRestriction,
      leftExtension: weightedLeftExtension,
    },
    density: {
      identity: densityIdentity,
    },
    faithfulness: {
      restrictions: faithfulnessRestrictions,
      pointwise: faithfulnessPointwise,
      leftExtension: faithfulnessLeftExtension,
    },
    absolute: {
      colimit: absoluteColimit,
      leftExtension: absoluteLeftExtension,
      pointwiseLeftLift: absolutePointwiseLeftLift,
    },
    bicategory: {
      pentagon: bicategoryPentagon,
      triangle: bicategoryTriangle,
    },
    pseudofunctor: {
      coherence: pseudofunctorCoherence,
    },
    biadjunction: {
      triangle: biadjunctionTriangle,
    },
    overall: all.every((entry) => entry.pending || entry.holds),
  };
};
