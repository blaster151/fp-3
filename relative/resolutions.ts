import type {
  Equipment2Cell,
  EquipmentProarrow,
  EquipmentVerticalBoundary,
  VirtualEquipment,
} from "../virtual-equipment";
import {
  defaultObjectEquality,
  frameFromProarrow,
  verticalBoundariesEqual,
} from "../virtual-equipment";
import type {
  LooseAdjunctionAnalysis,
  LooseAdjunctionData,
} from "../virtual-equipment/maps";
import { analyzeLooseAdjunction } from "../virtual-equipment/maps";
import type { Category } from "../allTS";
import type {
  RelativeMonadData,
  RelativeMonadResolutionLooseMonadReport,
} from "./relative-monads";

export interface ResolutionComparisonIsomorphism<Obj, Arr, Payload, Evidence> {
  readonly forward: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly backward: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details: string;
}

export interface ResolutionPrecompositionWitness<Obj, Arr, Payload, Evidence> {
  readonly tightCell: EquipmentVerticalBoundary<Obj, Arr>;
  readonly comparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details: string;
}

export interface ResolutionPastingWitness<Obj, Arr, Payload, Evidence> {
  readonly inner: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly outer: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details: string;
}

export interface ResolutionFullyFaithfulPostcompositionWitness<Obj, Arr> {
  readonly rightLeg: EquipmentVerticalBoundary<Obj, Arr>;
  readonly inducedAdjunctionSummary: string;
  readonly identityCollapseSummary?: string;
}

export interface ResolutionResoluteCompositeWitness<Obj, Arr> {
  readonly leftLeg: EquipmentVerticalBoundary<Obj, Arr>;
  readonly rightAdjoint: EquipmentVerticalBoundary<Obj, Arr>;
  readonly details: string;
}

export interface ResolutionLeftAdjointTransportWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly leftAdjoint: EquipmentVerticalBoundary<Obj, Arr>;
  readonly transportedMonad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly monadMorphism: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details: string;
}

export interface ResolutionLooseMonadTransportComparison<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly witness: ResolutionLeftAdjointTransportWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly summary: string;
}

export interface ResolutionMetadata<Obj, Arr, Payload, Evidence> {
  readonly precompositions?: ReadonlyArray<
    ResolutionPrecompositionWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly pastings?: ReadonlyArray<
    ResolutionPastingWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly fullyFaithfulPostcompositions?: ReadonlyArray<
    ResolutionFullyFaithfulPostcompositionWitness<Obj, Arr>
  >;
  readonly resoluteComposites?: ReadonlyArray<
    ResolutionResoluteCompositeWitness<Obj, Arr>
  >;
  readonly leftAdjointTransports?: ReadonlyArray<
    ResolutionLeftAdjointTransportWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly details?: string;
}

interface NormalizedResolutionMetadata<Obj, Arr, Payload, Evidence> {
  readonly precompositions: ReadonlyArray<
    ResolutionPrecompositionWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly pastings: ReadonlyArray<
    ResolutionPastingWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly fullyFaithfulPostcompositions: ReadonlyArray<
    ResolutionFullyFaithfulPostcompositionWitness<Obj, Arr>
  >;
  readonly resoluteComposites: ReadonlyArray<
    ResolutionResoluteCompositeWitness<Obj, Arr>
  >;
  readonly leftAdjointTransports: ReadonlyArray<
    ResolutionLeftAdjointTransportWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly details?: string;
}

const normalizeResolutionMetadata = <Obj, Arr, Payload, Evidence>(
  metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence> | undefined,
): NormalizedResolutionMetadata<Obj, Arr, Payload, Evidence> => ({
  precompositions: [...(metadata?.precompositions ?? [])],
  pastings: [...(metadata?.pastings ?? [])],
  fullyFaithfulPostcompositions: [
    ...(metadata?.fullyFaithfulPostcompositions ?? []),
  ],
  resoluteComposites: [...(metadata?.resoluteComposites ?? [])],
  leftAdjointTransports: [...(metadata?.leftAdjointTransports ?? [])],
  ...(metadata?.details !== undefined ? { details: metadata.details } : {}),
});

const mergeResolutionMetadata = <Obj, Arr, Payload, Evidence>(
  base: ResolutionMetadata<Obj, Arr, Payload, Evidence> | undefined,
  additions: Partial<ResolutionMetadata<Obj, Arr, Payload, Evidence>> = {},
): NormalizedResolutionMetadata<Obj, Arr, Payload, Evidence> => {
  const normalized = normalizeResolutionMetadata(base);
  return {
    precompositions: [
      ...normalized.precompositions,
      ...(additions.precompositions ?? []),
    ],
    pastings: [...normalized.pastings, ...(additions.pastings ?? [])],
    fullyFaithfulPostcompositions: [
      ...normalized.fullyFaithfulPostcompositions,
      ...(additions.fullyFaithfulPostcompositions ?? []),
    ],
    resoluteComposites: [
      ...normalized.resoluteComposites,
      ...(additions.resoluteComposites ?? []),
    ],
    leftAdjointTransports: [
      ...normalized.leftAdjointTransports,
      ...(additions.leftAdjointTransports ?? []),
    ],
    ...(normalized.details !== undefined || additions.details !== undefined
      ? { details: additions.details ?? normalized.details }
      : {}),
  };
};

const describeResolutionMetadataSummary = <Obj, Arr, Payload, Evidence>(
  metadata: NormalizedResolutionMetadata<Obj, Arr, Payload, Evidence>,
): string => {
  const summary = `Resolution metadata threads ${
    metadata.precompositions?.length ?? 0
  } Proposition 5.29 witness(es), ${metadata.pastings?.length ?? 0} Proposition 5.30 pasting witness(es), ${
    metadata.fullyFaithfulPostcompositions?.length ?? 0
  } Example 5.31 fully faithful witness(es), ${
    metadata.resoluteComposites?.length ?? 0
  } Remark 5.33 resolute composite witness(es), and ${
    metadata.leftAdjointTransports?.length ?? 0
  } Proposition 5.37 transport witness(es) exposing the (ℓ'!, r') monad morphism.`;
  return metadata.details ? `${summary} ${metadata.details}` : summary;
};

export interface ResolutionData<Obj, Arr, Payload, Evidence> {
  readonly equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>;
  readonly relativeMonad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly inclusion: EquipmentVerticalBoundary<Obj, Arr>;
  readonly apexLoose: EquipmentProarrow<Obj, Payload>;
  readonly comparison: ResolutionComparisonIsomorphism<Obj, Arr, Payload, Evidence>;
  readonly metadata?: ResolutionMetadata<Obj, Arr, Payload, Evidence>;
}

export interface ResolutionMorphismMetadata<Obj, Arr, Payload, Evidence>
  extends ResolutionMetadata<Obj, Arr, Payload, Evidence> {
  readonly details?: string;
}

export interface ResolutionMorphism<Obj, Arr, Payload, Evidence> {
  readonly source: ResolutionData<Obj, Arr, Payload, Evidence>;
  readonly target: ResolutionData<Obj, Arr, Payload, Evidence>;
  readonly tight: EquipmentVerticalBoundary<Obj, Arr>;
  readonly loose: EquipmentProarrow<Obj, Payload>;
  readonly comparison: ResolutionComparisonIsomorphism<Obj, Arr, Payload, Evidence>;
  readonly metadata?: ResolutionMorphismMetadata<Obj, Arr, Payload, Evidence>;
}

interface ResolutionMorphismWitnessPropagationResult<Obj, Arr, Payload, Evidence> {
  readonly morphism: ResolutionMorphism<Obj, Arr, Payload, Evidence>;
  readonly metadata: ResolutionMorphismMetadata<Obj, Arr, Payload, Evidence>;
  readonly details: string;
}

const propagateMorphismMetadata = <Obj, Arr, Payload, Evidence>(
  morphism: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
  additions: Partial<ResolutionMetadata<Obj, Arr, Payload, Evidence>>,
  narrative: string,
): ResolutionMorphismWitnessPropagationResult<Obj, Arr, Payload, Evidence> => {
  const detailParts = [morphism.metadata?.details, narrative].filter(
    (part): part is string => part !== undefined && part.trim().length > 0,
  );
  const metadata = mergeResolutionMetadata(morphism.metadata, {
    ...additions,
    ...(detailParts.length > 0
      ? { details: detailParts.join(" ").trim() }
      : {}),
  }) as ResolutionMorphismMetadata<Obj, Arr, Payload, Evidence>;
  const summary = describeResolutionMetadataSummary(
    normalizeResolutionMetadata(metadata),
  );
  const details = `${narrative} ${summary}`.trim();
  return {
    morphism: { ...morphism, metadata },
    metadata,
    details,
  };
};

export interface ResolutionMorphismFullyFaithfulPropagationInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly morphism: ResolutionMorphism<Obj, Arr, Payload, Evidence>;
  readonly witness: ResolutionFullyFaithfulPostcompositionWitness<Obj, Arr>;
  readonly details?: string;
}

export interface ResolutionMorphismFullyFaithfulPropagationResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> extends ResolutionMorphismWitnessPropagationResult<Obj, Arr, Payload, Evidence> {
  readonly witness: ResolutionFullyFaithfulPostcompositionWitness<Obj, Arr>;
}

export const propagateFullyFaithfulPostcompositionAcrossResolutionMorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: ResolutionMorphismFullyFaithfulPropagationInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): ResolutionMorphismFullyFaithfulPropagationResult<Obj, Arr, Payload, Evidence> => {
  const narrative =
    input.details ??
    "Resolution morphism transports Example 5.31/Corollary 5.32 fully faithful postcomposition witness.";
  const result = propagateMorphismMetadata(
    input.morphism,
    { fullyFaithfulPostcompositions: [input.witness] },
    narrative,
  );
  return { ...result, witness: input.witness };
};

export interface ResolutionMorphismResolutePropagationInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly morphism: ResolutionMorphism<Obj, Arr, Payload, Evidence>;
  readonly witness: ResolutionResoluteCompositeWitness<Obj, Arr>;
  readonly details?: string;
}

export interface ResolutionMorphismResolutePropagationResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> extends ResolutionMorphismWitnessPropagationResult<Obj, Arr, Payload, Evidence> {
  readonly witness: ResolutionResoluteCompositeWitness<Obj, Arr>;
}

export const propagateResoluteCompositeAcrossResolutionMorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: ResolutionMorphismResolutePropagationInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): ResolutionMorphismResolutePropagationResult<Obj, Arr, Payload, Evidence> => {
  const narrative =
    input.details ??
    "Resolution morphism transports Remark 5.33/Corollary 5.34 resolute composite witness.";
  const result = propagateMorphismMetadata(
    input.morphism,
    { resoluteComposites: [input.witness] },
    narrative,
  );
  return { ...result, witness: input.witness };
};

export interface ResolutionMorphismTransportPropagationInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly morphism: ResolutionMorphism<Obj, Arr, Payload, Evidence>;
  readonly witness: ResolutionLeftAdjointTransportWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface ResolutionMorphismTransportPropagationResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> extends ResolutionMorphismWitnessPropagationResult<Obj, Arr, Payload, Evidence> {
  readonly witness: ResolutionLeftAdjointTransportWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export const propagateLeftAdjointTransportAcrossResolutionMorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: ResolutionMorphismTransportPropagationInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): ResolutionMorphismTransportPropagationResult<Obj, Arr, Payload, Evidence> => {
  const narrative =
    input.details ??
    "Resolution morphism transports Proposition 5.37 left-adjoint witness, exposing the (ℓ'!, r') monad morphism functorially.";
  const result = propagateMorphismMetadata(
    input.morphism,
    { leftAdjointTransports: [input.witness] },
    narrative,
  );
  return { ...result, witness: input.witness };
};

export interface ResolutionOracleReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence>;
  readonly comparison: ResolutionComparisonIsomorphism<Obj, Arr, Payload, Evidence>;
}

export interface ResolutionLooseMonadIsomorphismReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly comparison: ResolutionComparisonIsomorphism<Obj, Arr, Payload, Evidence>;
  readonly looseMonad: RelativeMonadResolutionLooseMonadReport<Obj, Payload>;
  readonly adjunction: ResolutionLooseAdjunctionResult<Obj, Arr, Payload, Evidence>;
  readonly metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence>;
  readonly coherence: {
    readonly precompositions: number;
    readonly pastings: number;
    readonly fullyFaithfulPostcompositions: number;
    readonly resoluteComposites: number;
    readonly leftAdjointTransports: number;
  };
  readonly transportComparisons: ReadonlyArray<
    ResolutionLooseMonadTransportComparison<Obj, Arr, Payload, Evidence>
  >;
}

const frameMatches = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  frame: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>; readonly leftBoundary: Obj; readonly rightBoundary: Obj },
  expected: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>; readonly leftBoundary: Obj; readonly rightBoundary: Obj },
  label: string,
  issues: string[],
): void => {
  if (!equality(frame.leftBoundary, expected.leftBoundary)) {
    issues.push(`${label} left boundary must equal the expected composite domain.`);
  }
  if (!equality(frame.rightBoundary, expected.rightBoundary)) {
    issues.push(`${label} right boundary must equal the expected composite codomain.`);
  }
  if (frame.arrows.length !== expected.arrows.length) {
    issues.push(`${label} should expose ${expected.arrows.length} arrow(s).`);
    return;
  }
  for (let index = 0; index < frame.arrows.length; index += 1) {
    const actual = frame.arrows[index];
    const anticipated = expected.arrows[index];
    if (actual === undefined || anticipated === undefined) {
      issues.push(`${label} arrow ${index} must match the anticipated frame shape.`);
      continue;
    }
    if (!equality(actual.from, anticipated.from) || !equality(actual.to, anticipated.to)) {
      issues.push(`${label} arrow ${index} must reuse the anticipated endpoints.`);
    }
  }
};

const checkPrecompositionWitnesses = <Obj, Arr, Payload, Evidence>(
  equality: (left: Obj, right: Obj) => boolean,
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence> | undefined,
  issues: string[],
): number => {
  const witnesses = metadata?.precompositions ?? [];
  witnesses.forEach((witness, index) => {
    if (!equality(witness.tightCell.from, resolution.inclusion.from)) {
      issues.push(
        `Precomposition witness ${index} expects a tight cell starting at the resolution domain.`,
      );
    }
    if (!equality(witness.tightCell.to, resolution.inclusion.to)) {
      issues.push(
        `Precomposition witness ${index} tight cell must land in the same codomain as the resolution inclusion.`,
      );
    }
    if (!verticalBoundariesEqual(equality, witness.tightCell, resolution.inclusion)) {
      issues.push(
        `Precomposition witness ${index} should reuse the resolution inclusion as its boundary to satisfy Proposition 5.29's prerequisites.`,
      );
    }
  });
  return witnesses.length;
};

const checkPastingWitnesses = <Obj, Arr, Payload, Evidence>(
  equality: (left: Obj, right: Obj) => boolean,
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence> | undefined,
  issues: string[],
): number => {
  const witnesses = metadata?.pastings ?? [];
  witnesses.forEach((witness, index) => {
    if (!verticalBoundariesEqual(equality, witness.inner.boundaries.left, resolution.inclusion)) {
      issues.push(
        `Pasting witness ${index} should use the resolution inclusion as the left boundary of the inner triangle.`,
      );
    }
    if (!verticalBoundariesEqual(equality, witness.outer.boundaries.left, resolution.inclusion)) {
      issues.push(
        `Pasting witness ${index} must paste along the resolution inclusion on the outer boundary as mandated by Proposition 5.30.`,
      );
    }
  });
  return witnesses.length;
};

const checkFullyFaithfulWitnesses = <Obj, Arr, Payload, Evidence>(
  equality: (left: Obj, right: Obj) => boolean,
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence> | undefined,
  issues: string[],
): number => {
  const witnesses = metadata?.fullyFaithfulPostcompositions ?? [];
  witnesses.forEach((witness, index) => {
    if (!equality(witness.rightLeg.from, resolution.apexLoose.to)) {
      issues.push(
        `Fully faithful postcomposition witness ${index} should begin at the resolution apex.`,
      );
    }
  });
  return witnesses.length;
};

const checkResoluteWitnesses = <Obj, Arr, Payload, Evidence>(
  equality: (left: Obj, right: Obj) => boolean,
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence> | undefined,
  issues: string[],
): number => {
  const witnesses = metadata?.resoluteComposites ?? [];
  witnesses.forEach((witness, index) => {
    if (!equality(witness.leftLeg.from, resolution.apexLoose.to)) {
      issues.push(
        `Resolute-composite witness ${index} should start from the resolution apex to track Remark 5.33's setup.`,
      );
    }
  });
  return witnesses.length;
};

const checkTransportWitnesses = <Obj, Arr, Payload, Evidence>(
  equality: (left: Obj, right: Obj) => boolean,
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence> | undefined,
  issues: string[],
): number => {
  const witnesses = metadata?.leftAdjointTransports ?? [];
  witnesses.forEach((witness, index) => {
    if (witness.transportedMonad.equipment !== resolution.equipment) {
      issues.push(
        `Left-adjoint transport witness ${index} should stay inside the ambient equipment when instantiating Proposition 5.37.`,
      );
    }
    if (!verticalBoundariesEqual(equality, witness.transportedMonad.root, resolution.inclusion)) {
      issues.push(
        `Left-adjoint transport witness ${index} must reuse the resolution inclusion as the transported monad's root.`,
      );
    }
  });
  return witnesses.length;
};

export const checkResolutionOfRelativeMonad = <Obj, Arr, Payload, Evidence>(
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence> = resolution.relativeMonad,
): ResolutionOracleReport<Obj, Arr, Payload, Evidence> => {
  const issues: string[] = [];
  if (resolution.equipment !== monad.equipment) {
    issues.push("Resolution and relative monad must inhabit the same virtual equipment.");
  }
  const equality = resolution.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (!verticalBoundariesEqual(equality, resolution.inclusion, monad.root)) {
    issues.push("Resolution inclusion must coincide with the relative monad root j.");
  }

  if (!equality(resolution.apexLoose.from, resolution.inclusion.from)) {
    issues.push("Resolution apex loose morphism must originate at the root domain A.");
  }

  const apexFrame = frameFromProarrow(resolution.apexLoose);
  const monadFrame = frameFromProarrow(monad.looseCell);

  frameMatches(
    equality,
    resolution.comparison.forward.source,
    apexFrame,
    "Forward comparison source",
    issues,
  );
  frameMatches(
    equality,
    resolution.comparison.forward.target,
    monadFrame,
    "Forward comparison target",
    issues,
  );
  frameMatches(
    equality,
    resolution.comparison.backward.source,
    monadFrame,
    "Backward comparison source",
    issues,
  );
  frameMatches(
    equality,
    resolution.comparison.backward.target,
    apexFrame,
    "Backward comparison target",
    issues,
  );

  if (!verticalBoundariesEqual(equality, resolution.comparison.forward.boundaries.left, resolution.inclusion)) {
    issues.push("Forward comparison must use the resolution inclusion as its left boundary.");
  }
  if (!verticalBoundariesEqual(equality, resolution.comparison.forward.boundaries.right, monad.carrier)) {
    issues.push("Forward comparison must land in the relative monad carrier boundary.");
  }
  if (!verticalBoundariesEqual(equality, resolution.comparison.backward.boundaries.left, monad.root)) {
    issues.push("Backward comparison must start at the relative monad root boundary.");
  }
  if (!verticalBoundariesEqual(equality, resolution.comparison.backward.boundaries.right, resolution.inclusion)) {
    issues.push("Backward comparison must return to the resolution inclusion boundary.");
  }

  const precompositions = checkPrecompositionWitnesses(
    equality,
    resolution,
    resolution.metadata,
    issues,
  );
  const pastings = checkPastingWitnesses(
    equality,
    resolution,
    resolution.metadata,
    issues,
  );
  const fullyFaithful = checkFullyFaithfulWitnesses(
    equality,
    resolution,
    resolution.metadata,
    issues,
  );
  const resolute = checkResoluteWitnesses(
    equality,
    resolution,
    resolution.metadata,
    issues,
  );
  const transports = checkTransportWitnesses(
    equality,
    resolution,
    resolution.metadata,
    issues,
  );

  const holds = issues.length === 0;
  const details = holds
    ? `Resolution realises Definition 5.25 with ${precompositions} Proposition 5.29 witness(es), ${pastings} Proposition 5.30 pasting witness(es), ${fullyFaithful} Example 5.31 fully faithful postcomposition witness(es), ${resolute} Remark 5.33 composite witness(es), and ${transports} Proposition 5.37 transport witness(es).`
    : `Resolution failed validation: ${issues.join("; ")}`;

  return {
    holds,
    issues,
    details,
    metadata: resolution.metadata ?? {},
    comparison: resolution.comparison,
  };
};

export interface ResolutionLooseAdjunctionResult<Obj, Arr, Payload, Evidence> {
  readonly adjunction: LooseAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly analysis: LooseAdjunctionAnalysis<Obj, Arr>;
  readonly metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence>;
  readonly details: string;
}

export interface ResolutionLooseAdjunctionFullyFaithfulInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly resolution: ResolutionData<Obj, Arr, Payload, Evidence>;
  readonly rightLeg: EquipmentVerticalBoundary<Obj, Arr>;
  readonly inducedAdjunctionSummary?: string;
  readonly identityCollapseSummary?: string;
}

export interface ResolutionLooseAdjunctionFullyFaithfulResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> extends ResolutionLooseAdjunctionResult<Obj, Arr, Payload, Evidence> {
  readonly fullyFaithfulWitness: ResolutionFullyFaithfulPostcompositionWitness<
    Obj,
    Arr
  >;
}

export interface ResolutionLooseAdjunctionResoluteInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly resolution: ResolutionData<Obj, Arr, Payload, Evidence>;
  readonly leftLeg: EquipmentVerticalBoundary<Obj, Arr>;
  readonly rightAdjoint: EquipmentVerticalBoundary<Obj, Arr>;
  readonly details?: string;
}

export interface ResolutionLooseAdjunctionResoluteResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> extends ResolutionLooseAdjunctionResult<Obj, Arr, Payload, Evidence> {
  readonly resoluteWitness: ResolutionResoluteCompositeWitness<Obj, Arr>;
}

export const looseAdjunctionFromResolution = <Obj, Arr, Payload, Evidence>(
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
): ResolutionLooseAdjunctionResult<Obj, Arr, Payload, Evidence> => {
  const adjunction: LooseAdjunctionData<Obj, Arr, Payload, Evidence> = {
    left: resolution.apexLoose,
    right: resolution.relativeMonad.looseCell,
    unit: resolution.relativeMonad.unit,
    counit: resolution.relativeMonad.extension,
  };
  const analysis = analyzeLooseAdjunction(resolution.equipment, adjunction);
  const metadata = normalizeResolutionMetadata(resolution.metadata);
  const summary = describeResolutionMetadataSummary(metadata);
  const details = `${analysis.details} ${summary}`.trim();
  return { adjunction, analysis, metadata, details };
};

export interface ResolutionLooseAdjunctionPrecompositionInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly resolution: ResolutionData<Obj, Arr, Payload, Evidence>;
  readonly tightCell: EquipmentVerticalBoundary<Obj, Arr>;
  readonly comparison?: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface ResolutionLooseAdjunctionPrecompositionResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> extends ResolutionLooseAdjunctionResult<Obj, Arr, Payload, Evidence> {
  readonly precompositionWitness: ResolutionPrecompositionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export const precomposeLooseAdjunction = <Obj, Arr, Payload, Evidence>(
  input: ResolutionLooseAdjunctionPrecompositionInput<Obj, Arr, Payload, Evidence>,
): ResolutionLooseAdjunctionPrecompositionResult<Obj, Arr, Payload, Evidence> => {
  const base = looseAdjunctionFromResolution(input.resolution);
  const comparison = input.comparison ?? input.resolution.comparison.forward;
  const precompositionWitness: ResolutionPrecompositionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    tightCell: input.tightCell,
    comparison,
    details:
      input.details ??
      "Precomposition along the supplied tight cell is recorded as a Proposition 5.29 witness.",
  };
  const metadata = mergeResolutionMetadata(base.metadata, {
    precompositions: [precompositionWitness],
  });
  const summary = describeResolutionMetadataSummary(metadata);
  const details = `${base.analysis.details} ${summary}`.trim();
  return { ...base, metadata, details, precompositionWitness };
};

export interface ResolutionLooseAdjunctionPastingInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly resolution: ResolutionData<Obj, Arr, Payload, Evidence>;
  readonly inner: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly outer: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface ResolutionLooseAdjunctionPastingResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> extends ResolutionLooseAdjunctionResult<Obj, Arr, Payload, Evidence> {
  readonly pastingWitness: ResolutionPastingWitness<Obj, Arr, Payload, Evidence>;
}

export const pasteLooseAdjunctionAlongResolution = <Obj, Arr, Payload, Evidence>(
  input: ResolutionLooseAdjunctionPastingInput<Obj, Arr, Payload, Evidence>,
): ResolutionLooseAdjunctionPastingResult<Obj, Arr, Payload, Evidence> => {
  const base = looseAdjunctionFromResolution(input.resolution);
  const pastingWitness: ResolutionPastingWitness<Obj, Arr, Payload, Evidence> = {
    inner: input.inner,
    outer: input.outer,
    details:
      input.details ??
      "Pasting the supplied inner and outer triangles registers Proposition 5.30's witness.",
  };
  const metadata = mergeResolutionMetadata(base.metadata, {
    pastings: [pastingWitness],
  });
  const summary = describeResolutionMetadataSummary(metadata);
  const details = `${base.analysis.details} ${summary}`.trim();
  return { ...base, metadata, details, pastingWitness };
};

export const postcomposeLooseAdjunctionAlongFullyFaithful = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: ResolutionLooseAdjunctionFullyFaithfulInput<Obj, Arr, Payload, Evidence>,
): ResolutionLooseAdjunctionFullyFaithfulResult<Obj, Arr, Payload, Evidence> => {
  const base = looseAdjunctionFromResolution(input.resolution);
  const fullyFaithfulWitness: ResolutionFullyFaithfulPostcompositionWitness<
    Obj,
    Arr
  > = {
    rightLeg: input.rightLeg,
    inducedAdjunctionSummary:
      input.inducedAdjunctionSummary ??
      "Fully faithful right leg postcomposition realises Example 5.31.",
    ...(input.identityCollapseSummary !== undefined
      ? { identityCollapseSummary: input.identityCollapseSummary }
      : {}),
  };
  const metadata = mergeResolutionMetadata(base.metadata, {
    fullyFaithfulPostcompositions: [fullyFaithfulWitness],
  });
  const summary = describeResolutionMetadataSummary(metadata);
  const details = `${base.analysis.details} ${summary}`.trim();
  return { ...base, metadata, details, fullyFaithfulWitness };
};

export const composeLooseAdjunctionResolutely = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: ResolutionLooseAdjunctionResoluteInput<Obj, Arr, Payload, Evidence>,
): ResolutionLooseAdjunctionResoluteResult<Obj, Arr, Payload, Evidence> => {
  const base = looseAdjunctionFromResolution(input.resolution);
  const resoluteWitness: ResolutionResoluteCompositeWitness<Obj, Arr> = {
    leftLeg: input.leftLeg,
    rightAdjoint: input.rightAdjoint,
    details:
      input.details ??
      "Resolute pair records Remark 5.33/Corollary 5.34 compatibility data.",
  };
  const metadata = mergeResolutionMetadata(base.metadata, {
    resoluteComposites: [resoluteWitness],
  });
  const summary = describeResolutionMetadataSummary(metadata);
  const details = `${base.analysis.details} ${summary}`.trim();
  return { ...base, metadata, details, resoluteWitness };
};

export interface ResolutionLooseAdjunctionTransportInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly resolution: ResolutionData<Obj, Arr, Payload, Evidence>;
  readonly leftAdjoint: EquipmentVerticalBoundary<Obj, Arr>;
  readonly transportedMonad?: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly monadMorphism?: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface ResolutionLooseAdjunctionTransportResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> extends ResolutionLooseAdjunctionResult<Obj, Arr, Payload, Evidence> {
  readonly transportWitness: ResolutionLeftAdjointTransportWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export const transportLooseAdjunctionAlongLeftAdjoint = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: ResolutionLooseAdjunctionTransportInput<Obj, Arr, Payload, Evidence>,
): ResolutionLooseAdjunctionTransportResult<Obj, Arr, Payload, Evidence> => {
  const base = looseAdjunctionFromResolution(input.resolution);
  const transportWitness: ResolutionLeftAdjointTransportWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    leftAdjoint: input.leftAdjoint,
    transportedMonad: input.transportedMonad ?? input.resolution.relativeMonad,
    monadMorphism: input.monadMorphism ?? input.resolution.comparison.forward,
    details:
      input.details ??
      "Left relative adjoint transport registers the Proposition 5.37 witness for the loose adjunction.",
  };
  const metadata = mergeResolutionMetadata(base.metadata, {
    leftAdjointTransports: [transportWitness],
  });
  const summary = describeResolutionMetadataSummary(metadata);
  const details = `${base.analysis.details} ${summary}`.trim();
  return { ...base, metadata, details, transportWitness };
};

export const looseMonadFromResolution = <Obj, Arr, Payload, Evidence>(
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
): RelativeMonadResolutionLooseMonadReport<Obj, Payload> => {
  const equality = resolution.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(resolution.apexLoose.from, resolution.inclusion.from)) {
    issues.push("Loose monad arrow should start at the resolution domain.");
  }
  if (!equality(resolution.relativeMonad.looseCell.from, resolution.apexLoose.from)) {
    issues.push("Relative monad loose arrow should originate where the resolution apex does.");
  }
  if (!equality(resolution.relativeMonad.looseCell.to, resolution.apexLoose.to)) {
    issues.push("Relative monad loose arrow should land where the resolution apex does.");
  }

  const holds = issues.length === 0;
  if (!holds) {
    return {
      holds,
      issues,
      details: `Loose monad extraction issues: ${issues.join("; ")}`,
    };
  }

  const metadata = normalizeResolutionMetadata(resolution.metadata);
  const summary = describeResolutionMetadataSummary(metadata);

  return {
    holds,
    issues: [],
    details: `Loose monad induced from the resolution coincides with the relative monad data. ${summary}`.trim(),
    induced: resolution.relativeMonad.looseCell,
  };
};

export const checkLooseMonadIsomorphism = <Obj, Arr, Payload, Evidence>(
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence> = resolution.relativeMonad,
): ResolutionLooseMonadIsomorphismReport<Obj, Arr, Payload, Evidence> => {
  const baseReport = checkResolutionOfRelativeMonad(resolution, monad);
  const adjunction = looseAdjunctionFromResolution(resolution);
  const looseMonad = looseMonadFromResolution(resolution);
  const metadata = normalizeResolutionMetadata(adjunction.metadata);

  const equality = resolution.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues = [...baseReport.issues, ...looseMonad.issues];

  if (!adjunction.analysis.holds) {
    issues.push("Loose adjunction derived from the resolution must satisfy its triangle identities.");
  }

  const apexFrame = frameFromProarrow(resolution.apexLoose);
  const monadFrame = frameFromProarrow(monad.looseCell);

  const precompositions = metadata.precompositions ?? [];
  precompositions.forEach((witness, index) => {
    frameMatches(
      equality,
      witness.comparison.source,
      apexFrame,
      `Precomposition comparison ${index} source`,
      issues,
    );
    frameMatches(
      equality,
      witness.comparison.target,
      monadFrame,
      `Precomposition comparison ${index} target`,
      issues,
    );
    if (!verticalBoundariesEqual(equality, witness.comparison.boundaries.left, resolution.inclusion)) {
      issues.push(
        `Precomposition comparison ${index} must start along the resolution inclusion boundary.`,
      );
    }
    if (!verticalBoundariesEqual(equality, witness.comparison.boundaries.right, monad.carrier)) {
      issues.push(
        `Precomposition comparison ${index} must land in the relative monad carrier boundary.`,
      );
    }
  });

  const pastings = metadata.pastings ?? [];
  pastings.forEach((witness, index) => {
    frameMatches(
      equality,
      witness.inner.source,
      apexFrame,
      `Pasting witness ${index} inner source`,
      issues,
    );
    frameMatches(
      equality,
      witness.outer.target,
      monadFrame,
      `Pasting witness ${index} outer target`,
      issues,
    );
    if (!verticalBoundariesEqual(equality, witness.inner.boundaries.right, monad.carrier)) {
      issues.push(
        `Pasting witness ${index} inner triangle must land in the relative monad carrier boundary.`,
      );
    }
    if (!verticalBoundariesEqual(equality, witness.outer.boundaries.right, monad.carrier)) {
      issues.push(
        `Pasting witness ${index} outer triangle must land in the relative monad carrier boundary.`,
      );
    }
    if (
      !verticalBoundariesEqual(
        equality,
        witness.inner.boundaries.right,
        witness.outer.boundaries.left,
      )
    ) {
      issues.push(
        `Pasting witness ${index} requires the inner right boundary to match the outer left boundary for Proposition 5.30.`,
      );
    }
  });

  const fullyFaithful = metadata.fullyFaithfulPostcompositions ?? [];
  fullyFaithful.forEach((witness, index) => {
    if (!equality(witness.rightLeg.to, monad.carrier.to)) {
      issues.push(
        `Fully faithful postcomposition witness ${index} should land where the relative monad carrier does.`,
      );
    }
  });

  const resolute = metadata.resoluteComposites ?? [];
  resolute.forEach((witness, index) => {
    if (!equality(witness.leftLeg.to, witness.rightAdjoint.from)) {
      issues.push(
        `Resolute-composite witness ${index} must feed the left leg into the recorded right adjoint boundary.`,
      );
    }
  });

  const transports = metadata.leftAdjointTransports ?? [];
  transports.forEach((witness, index) => {
    const transportedFrame = frameFromProarrow(witness.transportedMonad.looseCell);
    frameMatches(
      equality,
      witness.monadMorphism.source,
      transportedFrame,
      `Left-adjoint transport witness ${index} monad morphism source`,
      issues,
    );
    frameMatches(
      equality,
      witness.monadMorphism.target,
      monadFrame,
      `Left-adjoint transport witness ${index} monad morphism target`,
      issues,
    );
    if (!verticalBoundariesEqual(equality, witness.monadMorphism.boundaries.left, witness.transportedMonad.root)) {
      issues.push(
        `Left-adjoint transport witness ${index} monad morphism must begin at the transported monad root.`,
      );
    }
    if (!verticalBoundariesEqual(equality, witness.monadMorphism.boundaries.right, monad.carrier)) {
      issues.push(
        `Left-adjoint transport witness ${index} monad morphism must land in the relative monad carrier boundary.`,
      );
    }
    if (!equality(witness.transportedMonad.looseCell.to, resolution.apexLoose.to)) {
      issues.push(
        `Left-adjoint transport witness ${index} transported loose arrow must target the resolution apex codomain.`,
      );
    }
  });

  const holds =
    issues.length === 0 &&
    baseReport.holds &&
    adjunction.analysis.holds &&
    looseMonad.holds;

  const coherence = {
    precompositions: precompositions.length,
    pastings: pastings.length,
    fullyFaithfulPostcompositions: fullyFaithful.length,
    resoluteComposites: resolute.length,
    leftAdjointTransports: transports.length,
  } as const;

  const transportComparisons = transports.map((witness, index) => ({
    witness,
    summary: `Transport witness ${index} exhibits Proposition 5.37's (ℓ'!, r') monad morphism compatibility. ${witness.details}`.trim(),
  }));

  const detailParts: string[] = [];
  if (holds) {
    detailParts.push(
      "Loose monad induced by the resolution is naturally isomorphic to E(j,-)T via the recorded comparison witnesses.",
    );
  } else {
    detailParts.push(
      `Loose monad comparison uncovered issues: ${issues.join("; ")}`,
    );
  }
  detailParts.push(baseReport.details);
  detailParts.push(adjunction.details);
  detailParts.push(looseMonad.details);
  detailParts.push(describeResolutionMetadataSummary(metadata));

  if (coherence.precompositions > 0) {
    detailParts.push(`Validated ${coherence.precompositions} Proposition 5.29 precomposition witness(es).`);
  }
  if (coherence.pastings > 0) {
    detailParts.push(`Validated ${coherence.pastings} Proposition 5.30 pasting witness(es).`);
  }
  if (coherence.resoluteComposites > 0) {
    detailParts.push(`Validated ${coherence.resoluteComposites} Remark 5.33/Corollary 5.34 resolute composite witness(es).`);
  }
  if (coherence.fullyFaithfulPostcompositions > 0) {
    detailParts.push(`Validated ${coherence.fullyFaithfulPostcompositions} Example 5.31/Corollary 5.32 fully faithful postcomposition witness(es).`);
  }
  if (coherence.leftAdjointTransports > 0) {
    detailParts.push(`Validated ${coherence.leftAdjointTransports} Proposition 5.37 transport witness(es).`);
  }

  transportComparisons.forEach(({ summary }) => {
    detailParts.push(summary);
  });

  const details = detailParts.join(" ").trim();

  return {
    holds,
    issues: holds ? [] : issues,
    details,
    comparison: resolution.comparison,
    looseMonad,
    adjunction,
    metadata,
    coherence,
    transportComparisons,
  };
};

export const identifyLooseMonadFromResolution = <Obj, Arr, Payload, Evidence>(
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence> = resolution.relativeMonad,
): ResolutionLooseMonadIsomorphismReport<Obj, Arr, Payload, Evidence> => {
  const report = checkLooseMonadIsomorphism(resolution, monad);
  const prefix =
    "Corollary 5.28 identifies the loose monad induced by the resolution with E(j,-)T using the recorded comparison witnesses.";
  return {
    ...report,
    details: `${prefix} ${report.details}`.trim(),
  };
};

export interface RelativeAdjunctionIdentityUnitInput<Obj, Arr, Payload, Evidence> {
  readonly equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>;
  readonly left: EquipmentVerticalBoundary<Obj, Arr>;
  readonly right: EquipmentVerticalBoundary<Obj, Arr>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAdjunctionIdentityUnitReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly monadsCoincide: boolean;
}

export const checkIdentityUnitForRelativeAdjunction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionIdentityUnitInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionIdentityUnitReport => {
  const equality = input.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];
  const { left, right, unit } = input;

  if (!verticalBoundariesEqual(equality, unit.boundaries.left, left)) {
    issues.push(
      "Unit 2-cell must use the supplied left leg as its left boundary for Corollary 5.32.",
    );
  }
  if (!verticalBoundariesEqual(equality, unit.boundaries.right, right)) {
    issues.push(
      "Unit 2-cell must use the supplied right leg as its right boundary for Corollary 5.32.",
    );
  }

  const sourceFrame = unit.source;
  if (!equality(sourceFrame.leftBoundary, left.from)) {
    issues.push("Unit source frame must originate at the left leg domain.");
  }
  if (!equality(sourceFrame.rightBoundary, left.to)) {
    issues.push("Unit source frame must land at the left leg codomain.");
  }

  const targetFrame = unit.target;
  if (!equality(targetFrame.leftBoundary, right.from)) {
    issues.push("Unit target frame must originate at the right leg domain.");
  }
  if (!equality(targetFrame.rightBoundary, right.to)) {
    issues.push("Unit target frame must land at the right leg codomain.");
  }

  const holds = issues.length === 0;
  const monadsCoincide =
    holds && verticalBoundariesEqual(equality, left, right);

  const detailParts: string[] = [];
  detailParts.push(
    holds
      ? monadsCoincide
        ? "Corollary 5.32 identity-unit criterion holds; the induced j-monads coincide."
        :
          "Corollary 5.32 identity-unit criterion holds; the induced j-monads need additional comparison data to coincide explicitly."
      : `Corollary 5.32 identity-unit check uncovered issues: ${issues.join("; ")}`,
  );
  if (input.details) {
    detailParts.push(input.details);
  }

  return {
    holds,
    issues,
    details: detailParts.join(" ").trim(),
    monadsCoincide,
  };
};

export interface ResolutionCategoryMetadata<Obj, Arr, Payload, Evidence> {
  readonly morphisms: ReadonlyArray<ResolutionMorphism<Obj, Arr, Payload, Evidence>>;
  readonly precompositions: ReadonlyArray<
    ResolutionPrecompositionWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly pastings: ReadonlyArray<ResolutionPastingWitness<Obj, Arr, Payload, Evidence>>;
  readonly fullyFaithfulPostcompositions: ReadonlyArray<
    ResolutionFullyFaithfulPostcompositionWitness<Obj, Arr>
  >;
  readonly resoluteComposites: ReadonlyArray<
    ResolutionResoluteCompositeWitness<Obj, Arr>
  >;
  readonly leftAdjointTransports: ReadonlyArray<
    ResolutionLeftAdjointTransportWitness<Obj, Arr, Payload, Evidence>
  >;
}

export interface ResolutionCategory<Obj, Arr, Payload, Evidence>
  extends Category<
      ResolutionData<Obj, Arr, Payload, Evidence>,
      ResolutionMorphism<Obj, Arr, Payload, Evidence>
    > {
  readonly objects: ReadonlyArray<ResolutionData<Obj, Arr, Payload, Evidence>>;
  readonly hom: (
    source: ResolutionData<Obj, Arr, Payload, Evidence>,
    target: ResolutionData<Obj, Arr, Payload, Evidence>,
  ) => ReadonlyArray<ResolutionMorphism<Obj, Arr, Payload, Evidence>>;
  readonly metadata: ResolutionCategoryMetadata<Obj, Arr, Payload, Evidence>;
  readonly equalMor?: (
    left: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
    right: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
  ) => boolean;
}

export interface ResolutionCategoryOptions<Obj, Arr, Payload, Evidence> {
  readonly objects: ReadonlyArray<ResolutionData<Obj, Arr, Payload, Evidence>>;
  readonly morphisms?: ReadonlyArray<ResolutionMorphism<Obj, Arr, Payload, Evidence>>;
  readonly identity: (
    object: ResolutionData<Obj, Arr, Payload, Evidence>,
  ) => ResolutionMorphism<Obj, Arr, Payload, Evidence>;
  readonly compose: (
    g: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
    f: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
  ) => ResolutionMorphism<Obj, Arr, Payload, Evidence>;
  readonly equalMor?: (
    left: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
    right: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
  ) => boolean;
}

export const categoryOfResolutions = <Obj, Arr, Payload, Evidence>(
  options: ResolutionCategoryOptions<Obj, Arr, Payload, Evidence>,
): ResolutionCategory<Obj, Arr, Payload, Evidence> => {
  const identityCache = new Map<
    ResolutionData<Obj, Arr, Payload, Evidence>,
    ResolutionMorphism<Obj, Arr, Payload, Evidence>
  >();
  const morphismPool: ResolutionMorphism<Obj, Arr, Payload, Evidence>[] = [];

  const getIdentity = (
    object: ResolutionData<Obj, Arr, Payload, Evidence>,
  ): ResolutionMorphism<Obj, Arr, Payload, Evidence> => {
    const existing = identityCache.get(object);
    if (existing !== undefined) {
      return existing;
    }
    const id = options.identity(object);
    if (id.source !== object || id.target !== object) {
      throw new Error("Identity builder must produce a morphism from and to the supplied object.");
    }
    identityCache.set(object, id);
    morphismPool.push(id);
    return id;
  };

  const explicitMorphisms = options.morphisms ?? [];
  explicitMorphisms.forEach((morphism) => {
    morphismPool.push(morphism);
  });

  options.objects.forEach((object) => {
    getIdentity(object);
  });

  const hom = (
    source: ResolutionData<Obj, Arr, Payload, Evidence>,
    target: ResolutionData<Obj, Arr, Payload, Evidence>,
  ): ReadonlyArray<ResolutionMorphism<Obj, Arr, Payload, Evidence>> =>
    morphismPool.filter((morphism) => morphism.source === source && morphism.target === target);

  const collectMetadata = <Output>(
    extract: (
      metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence> | undefined,
    ) => ReadonlyArray<Output> | undefined,
  ): Output[] => {
    const results: Output[] = [];
    const seen = new Set<Output>();
    const append = (entries: ReadonlyArray<Output> | undefined): void => {
      entries?.forEach((entry) => {
        if (!seen.has(entry)) {
          seen.add(entry);
          results.push(entry);
        }
      });
    };
    options.objects.forEach((object) => {
      append(extract(object.metadata));
    });
    morphismPool.forEach((morphism) => {
      append(extract(morphism.metadata));
    });
    return results;
  };

  const metadata: ResolutionCategoryMetadata<Obj, Arr, Payload, Evidence> = {
    morphisms: morphismPool,
    precompositions: collectMetadata((data) => data?.precompositions),
    pastings: collectMetadata((data) => data?.pastings),
    fullyFaithfulPostcompositions: collectMetadata(
      (data) => data?.fullyFaithfulPostcompositions,
    ),
    resoluteComposites: collectMetadata((data) => data?.resoluteComposites),
    leftAdjointTransports: collectMetadata((data) => data?.leftAdjointTransports),
  };

  const compose = (
    g: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
    f: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
  ): ResolutionMorphism<Obj, Arr, Payload, Evidence> => {
    if (f.target !== g.source) {
      throw new Error("Resolution morphisms compose only when domains/codomains match.");
    }
    const composite = options.compose(g, f);
    if (composite.source !== f.source || composite.target !== g.target) {
      throw new Error("Composite must map from the first domain to the second codomain.");
    }
    morphismPool.push(composite);
    return composite;
  };

  const equalMor = options.equalMor;
  const isId = (
    morphism: ResolutionMorphism<Obj, Arr, Payload, Evidence>,
  ): boolean => {
    const candidate = getIdentity(morphism.source);
    if (equalMor) {
      return equalMor(morphism, candidate);
    }
    return morphism === candidate;
  };

  return {
    objects: options.objects,
    hom,
    id: getIdentity,
    compose,
    isId,
    ...(equalMor !== undefined ? { equalMor } : {}),
    metadata,
  };
};

export interface ResolutionCategoryLawReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const checkResolutionCategoryLaws = <Obj, Arr, Payload, Evidence>(
  category: ResolutionCategory<Obj, Arr, Payload, Evidence>,
): ResolutionCategoryLawReport => {
  const issues: string[] = [];
  const equality = category.equalMor ?? ((left, right) => left === right);

  category.metadata.morphisms.forEach((morphism, index) => {
    const leftIdentity = category.id(morphism.target);
    const rightIdentity = category.id(morphism.source);
    const leftComposite = category.compose(leftIdentity, morphism);
    const rightComposite = category.compose(morphism, rightIdentity);
    if (!equality(leftComposite, morphism)) {
      issues.push(`Left identity law failed for morphism ${index}.`);
    }
    if (!equality(rightComposite, morphism)) {
      issues.push(`Right identity law failed for morphism ${index}.`);
    }
  });

  const holds = issues.length === 0;
  const details = holds
    ? "Resolution category satisfies identity laws for all registered morphisms."
    : `Resolution category identity checks failed: ${issues.join("; ")}`;

  return { holds, issues, details };
};

export interface ResolutionPrecompositionBranchReport {
  readonly holds: boolean;
  readonly count: number;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface ResolutionAdjunctionPrecompositionReport {
  readonly holds: boolean;
  readonly precomposition: ResolutionPrecompositionBranchReport;
  readonly pasting: ResolutionPrecompositionBranchReport;
  readonly resoluteComposition: ResolutionPrecompositionBranchReport;
  readonly fullyFaithfulPostcomposition: ResolutionPrecompositionBranchReport;
  readonly leftAdjointTransport: ResolutionPrecompositionBranchReport;
  readonly details: string;
}

const branchReport = (
  label: string,
  count: number,
  issues: ReadonlyArray<string>,
): ResolutionPrecompositionBranchReport => ({
  holds: issues.length === 0 && count > 0,
  count,
  issues,
  details:
    issues.length === 0 && count > 0
      ? `${label} witnesses available: ${count}.`
      : issues.length === 0
        ? `${label} witnesses were not supplied.`
        : `${label} issues: ${issues.join("; ")}`,
});

export const checkRelativeAdjunctionPrecomposition = <Obj, Arr, Payload, Evidence>(
  metadata: ResolutionCategoryMetadata<Obj, Arr, Payload, Evidence>,
): ResolutionAdjunctionPrecompositionReport => {
  const precompositionIssues: string[] = [];
  const pastingIssues: string[] = [];
  const resoluteIssues: string[] = [];
  const fullyFaithfulIssues: string[] = [];
  const transportIssues: string[] = [];

  const precomposition = branchReport(
    "Proposition 5.29 precomposition",
    metadata.precompositions.length,
    precompositionIssues,
  );
  const pasting = branchReport(
    "Proposition 5.30 pasting",
    metadata.pastings.length,
    pastingIssues,
  );
  const resoluteComposition = branchReport(
    "Remark 5.33/Corollary 5.34 resolute composition",
    metadata.resoluteComposites.length,
    resoluteIssues,
  );
  const fullyFaithfulPostcomposition = branchReport(
    "Example 5.31/Corollary 5.32 fully faithful postcomposition",
    metadata.fullyFaithfulPostcompositions.length,
    fullyFaithfulIssues,
  );
  const leftAdjointTransport = branchReport(
    "Proposition 5.37 left-adjoint transport",
    metadata.leftAdjointTransports.length,
    transportIssues,
  );

  const holds =
    precomposition.holds &&
    pasting.holds &&
    resoluteComposition.holds &&
    fullyFaithfulPostcomposition.holds &&
    leftAdjointTransport.holds;

  const details = holds
    ? "Relative adjunction precomposition witnesses cover Propositions 5.29–5.30, Remark 5.33, Example 5.31/Corollary 5.32, and Proposition 5.37."
    : "Relative adjunction precomposition analysis uncovered missing or invalid witness data.";

  return {
    holds,
    precomposition,
    pasting,
    resoluteComposition,
    fullyFaithfulPostcomposition,
    leftAdjointTransport,
    details,
  };
};
