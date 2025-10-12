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
import type { Category } from "../allTS";
import type { RelativeMonadData } from "./relative-monads";

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

export interface ResolutionOracleReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly metadata: ResolutionMetadata<Obj, Arr, Payload, Evidence>;
  readonly comparison: ResolutionComparisonIsomorphism<Obj, Arr, Payload, Evidence>;
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
