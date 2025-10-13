import type { RepresentabilityWitness, VirtualEquipment } from "../virtual-equipment";
import type { LooseMonoidData, LooseMonoidShapeReport } from "../virtual-equipment/loose-structures";
import type {
  RelativeEnrichedEilenbergMooreAlgebraWitness,
  RelativeEnrichedKleisliInclusionWitness,
  RelativeEnrichedMonadWitness,
  RelativeEnrichedVCatMonadWitness,
  RelativeEnrichedYonedaDistributorWitness,
  RelativeEnrichedYonedaWitness,
  RelativeSetEnrichedMonadWitness,
  RelativeMonadData,
  RelativeMonadSkewMonoidBridgeInput,
} from "./relative-monads";
import {
  analyzeRelativeMonadFraming,
  analyzeRelativeMonadIdentityReduction,
  analyzeRelativeMonadRepresentability,
  analyzeRelativeMonadSkewMonoidBridge,
  analyzeRelativeMonadRepresentableRecovery,
  embedRelativeMonadIntoFiber,
  analyzeRelativeEnrichedEilenbergMooreAlgebra,
  analyzeRelativeEnrichedKleisliInclusion,
  analyzeRelativeEnrichedMonad,
  analyzeRelativeEnrichedVCatMonad,
  analyzeRelativeEnrichedYoneda,
  analyzeRelativeEnrichedYonedaDistributor,
  analyzeRelativeSetEnrichedMonad,
  describeRelativeEnrichedMonadWitness,
  describeRelativeEnrichedEilenbergMooreAlgebraWitness,
  describeRelativeEnrichedKleisliInclusionWitness,
  describeRelativeEnrichedVCatMonadWitness,
  describeRelativeEnrichedYonedaDistributorWitness,
  describeRelativeEnrichedYonedaWitness,
  describeRelativeSetEnrichedMonadWitness,
  type RelativeMonadRepresentableRecoveryOptions,
} from "./relative-monads";
import {
  analyzeIndexedContainerRelativeMonad,
  describeIndexedContainerExample4Witness,
  type IndexedContainerRelativeMonadWitness,
} from "./mnne-indexed-container-monads";
import {
  analyzeFiniteVectorArrowCorrespondence,
  analyzeFiniteVectorKleisliSplitting,
  describeBooleanVectorArrowCorrespondenceWitness,
  type FiniteVectorArrowCorrespondenceWitness,
  type FiniteVectorRelativeMonadWitness,
} from "./mnne-vector-monads";
import {
  analyzeLambdaKleisliSplitting,
  type LambdaRelativeMonadWitness,
} from "./mnne-lambda-monads";
import {
  analyzeMnneLaxMonoidalStructure,
  describeTwoObjectLaxMonoidalWitness,
  analyzeMnneLaxMonoid,
  describeTwoObjectLaxMonoidWitness,
  type MnneLaxMonoidalWitness,
  type MnneLaxMonoidWitness,
} from "./mnne-lax-monoidal";
import {
  analyzeMnneWellBehavedInclusion,
  describeIdentityWellBehavedWitness,
  type MnneWellBehavedWitness,
} from "./mnne-well-behaved";
import {
  analyzeMnneRelativeMonadLanExtension,
  describeIdentityLanExtensionWitness,
  type MnneRelativeMonadLanWitness,
} from "./mnne-monad-extensions";
import {
  RelativeCompositionLawRegistry,
  type RelativeCompositionLawKey,
  RelativeMonadLawRegistry,
  type RelativeMonadLawKey,
} from "./relative-laws";
import type {
  RelativeAdjunctionCompositionInput,
  RelativeMonadCompositionInput,
} from "./relative-composition";
import {
  analyzeRelativeAdjunctionComposition,
  analyzeRelativeMonadComposition,
  relativeMonadFromLooseMonoid,
} from "./relative-composition";

export interface RelativeMonadOracleResult {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
}

const pendingOracle = (law: RelativeMonadLawKey): RelativeMonadOracleResult => {
  const descriptor = RelativeMonadLawRegistry[law];
  return {
    holds: false,
    pending: true,
    registryPath: descriptor.registryPath,
    details: `${descriptor.name} oracle is pending. Summary: ${descriptor.summary}`,
  };
};

export const RelativeMonadOracles = {
  framing: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.unitFraming;
    const report = analyzeRelativeMonadFraming(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  identityReduction: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.identityReduction;
    const report = analyzeRelativeMonadIdentityReduction(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  extensionFraming: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.extensionFraming;
    const report = analyzeRelativeMonadFraming(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  representableLooseMonoid: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness: RepresentabilityWitness<Obj, Arr>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.representableLooseMonoid;
    const report = analyzeRelativeMonadRepresentability(data, witness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  fiberEmbedding: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness: RepresentabilityWitness<Obj, Arr>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.fiberEmbedding;
    const report = embedRelativeMonadIntoFiber(data, witness);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  representableRecovery: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness: RepresentabilityWitness<Obj, Arr>,
    options: RelativeMonadRepresentableRecoveryOptions<Obj, Arr, Payload, Evidence> = {},
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.representableRecovery;
    const report = analyzeRelativeMonadRepresentableRecovery(data, witness, options);
    return {
      holds: report.holds,
      pending: report.pending,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  skewMonoidBridge: <Obj, Arr, Payload, Evidence>(
    input: RelativeMonadSkewMonoidBridgeInput<Obj, Arr, Payload, Evidence>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.skewMonoidBridge;
    const report = analyzeRelativeMonadSkewMonoidBridge(input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  indexedContainerCompatibility: (
    witness: IndexedContainerRelativeMonadWitness =
      describeIndexedContainerExample4Witness(),
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.indexedContainerCompatibility;
    const report = analyzeIndexedContainerRelativeMonad(witness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  vectorKleisliSplitting: <R>(
    witness: FiniteVectorRelativeMonadWitness<R>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.vectorKleisliSplitting;
    const report = analyzeFiniteVectorKleisliSplitting(witness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  vectorArrowCorrespondence: <R>(
      witness: FiniteVectorArrowCorrespondenceWitness<R> =
        describeBooleanVectorArrowCorrespondenceWitness() as unknown as FiniteVectorArrowCorrespondenceWitness<R>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.vectorArrowCorrespondence;
    const report = analyzeFiniteVectorArrowCorrespondence(witness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  lambdaKleisliSplitting: (
    witness: LambdaRelativeMonadWitness,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.lambdaKleisliSplitting;
    const report = analyzeLambdaKleisliSplitting(witness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  functorCategoryLaxMonoidal: <Obj, Arr>(
    witness?: MnneLaxMonoidalWitness<Obj, Arr>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.functorCategoryLaxMonoidal;
    const effectiveWitness =
      witness ??
      (describeTwoObjectLaxMonoidalWitness() as unknown as MnneLaxMonoidalWitness<Obj, Arr>);
    const report = analyzeMnneLaxMonoidalStructure(effectiveWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  functorCategoryLaxMonoid: <Obj, Arr>(
    witness?: MnneLaxMonoidWitness<Obj, Arr>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.functorCategoryLaxMonoid;
    const effectiveWitness =
      witness ??
      (describeTwoObjectLaxMonoidWitness() as unknown as MnneLaxMonoidWitness<Obj, Arr>);
    const report = analyzeMnneLaxMonoid(effectiveWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  wellBehavedInclusion: <DomObj, DomArr, CodObj, CodArr>(
    witness?: MnneWellBehavedWitness<DomObj, DomArr, CodObj, CodArr>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.wellBehavedInclusion;
    const effectiveWitness =
      witness ??
      (describeIdentityWellBehavedWitness() as unknown as MnneWellBehavedWitness<
        DomObj,
        DomArr,
        CodObj,
        CodArr
      >);
    const report = analyzeMnneWellBehavedInclusion(effectiveWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  lanExtension: <DomObj, DomArr, CodObj, CodArr>(
    witness?: MnneRelativeMonadLanWitness<DomObj, DomArr, CodObj, CodArr>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.relativeMonadLanExtension;
    const effectiveWitness =
      witness ??
      (describeIdentityLanExtensionWitness() as unknown as MnneRelativeMonadLanWitness<
        DomObj,
        DomArr,
        CodObj,
        CodArr
      >);
    const report = analyzeMnneRelativeMonadLanExtension(effectiveWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  enrichedCompatibility: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    witness?: RelativeEnrichedMonadWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.enrichedCompatibility;
    const effectiveWitness = witness ?? describeRelativeEnrichedMonadWitness(data);
    const report = analyzeRelativeEnrichedMonad(effectiveWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  setEnrichedCompatibility: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    options: RelativeMonadOracleOptions<Obj, Arr, Payload, Evidence> = {},
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.setEnrichedCompatibility;
    const enrichedWitness =
      options.enrichedWitness ?? describeRelativeEnrichedMonadWitness(data);
    const setWitness =
      options.setEnrichedWitness ??
      describeRelativeSetEnrichedMonadWitness(enrichedWitness);
    const report = analyzeRelativeSetEnrichedMonad(setWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  enrichedEilenbergMooreAlgebra: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    options: RelativeMonadOracleOptions<Obj, Arr, Payload, Evidence> = {},
  ): RelativeMonadOracleResult => {
    const descriptor =
      RelativeMonadLawRegistry.enrichedEilenbergMooreAlgebra;
    const enrichedWitness =
      options.enrichedWitness ?? describeRelativeEnrichedMonadWitness(data);
    const algebraWitness =
      options.enrichedEilenbergMooreWitness ??
      describeRelativeEnrichedEilenbergMooreAlgebraWitness(enrichedWitness);
    const report = analyzeRelativeEnrichedEilenbergMooreAlgebra(algebraWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  enrichedKleisliInclusion: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    options: RelativeMonadOracleOptions<Obj, Arr, Payload, Evidence> = {},
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.enrichedKleisliInclusion;
    const enrichedWitness =
      options.enrichedWitness ?? describeRelativeEnrichedMonadWitness(data);
    const inclusionWitness =
      options.enrichedKleisliWitness ??
      describeRelativeEnrichedKleisliInclusionWitness(enrichedWitness);
    const report = analyzeRelativeEnrichedKleisliInclusion(inclusionWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  enrichedVCatSpecification: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    options: RelativeMonadOracleOptions<Obj, Arr, Payload, Evidence> = {},
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.enrichedVCatSpecification;
    const enrichedWitness =
      options.enrichedWitness ?? describeRelativeEnrichedMonadWitness(data);
    const specificationWitness =
      options.enrichedVCatWitness ??
      describeRelativeEnrichedVCatMonadWitness(enrichedWitness);
    const report = analyzeRelativeEnrichedVCatMonad(specificationWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  enrichedYoneda: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    options: RelativeMonadOracleOptions<Obj, Arr, Payload, Evidence> = {},
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.enrichedYoneda;
    const enrichedWitness =
      options.enrichedWitness ?? describeRelativeEnrichedMonadWitness(data);
    const yonedaWitness =
      options.yonedaWitness ??
      describeRelativeEnrichedYonedaWitness(enrichedWitness);
    const report = analyzeRelativeEnrichedYoneda(yonedaWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  enrichedYonedaDistributor: <Obj, Arr, Payload, Evidence>(
    data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
    options: RelativeMonadOracleOptions<Obj, Arr, Payload, Evidence> = {},
  ): RelativeMonadOracleResult => {
    const descriptor = RelativeMonadLawRegistry.enrichedYonedaDistributor;
    const enrichedWitness =
      options.enrichedWitness ?? describeRelativeEnrichedMonadWitness(data);
    const yonedaWitness =
      options.yonedaWitness ??
      describeRelativeEnrichedYonedaWitness(enrichedWitness);
    const distributorWitness =
      options.yonedaDistributorWitness ??
      describeRelativeEnrichedYonedaDistributorWitness(yonedaWitness);
    const report = analyzeRelativeEnrichedYonedaDistributor(distributorWitness);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  associativityPasting: () => pendingOracle("associativityPasting"),
} as const;

export interface RelativeMonadOracleOptions<Obj, Arr, Payload, Evidence> {
  readonly representabilityWitness?: RepresentabilityWitness<Obj, Arr>;
  readonly skewMonoidBridgeInput?: RelativeMonadSkewMonoidBridgeInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly enrichedWitness?: RelativeEnrichedMonadWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly enrichedEilenbergMooreWitness?:
    RelativeEnrichedEilenbergMooreAlgebraWitness<Obj, Arr, Payload, Evidence>;
  readonly enrichedKleisliWitness?: RelativeEnrichedKleisliInclusionWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly setEnrichedWitness?: RelativeSetEnrichedMonadWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly enrichedVCatWitness?: RelativeEnrichedVCatMonadWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly yonedaWitness?: RelativeEnrichedYonedaWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly yonedaDistributorWitness?: RelativeEnrichedYonedaDistributorWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export const enumerateRelativeMonadOracles = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  options: RelativeMonadOracleOptions<Obj, Arr, Payload, Evidence> = {},
): ReadonlyArray<RelativeMonadOracleResult> => {
  const results: RelativeMonadOracleResult[] = [
    RelativeMonadOracles.framing(data),
    RelativeMonadOracles.identityReduction(data),
    RelativeMonadOracles.extensionFraming(data),
    RelativeMonadOracles.enrichedCompatibility(data),
    RelativeMonadOracles.setEnrichedCompatibility(data, options),
    RelativeMonadOracles.enrichedEilenbergMooreAlgebra(data, options),
    RelativeMonadOracles.enrichedKleisliInclusion(data, options),
    RelativeMonadOracles.enrichedVCatSpecification(data, options),
    RelativeMonadOracles.enrichedYoneda(data, options),
    RelativeMonadOracles.enrichedYonedaDistributor(data, options),
    RelativeMonadOracles.associativityPasting(),
  ];

  if (options.representabilityWitness) {
    results.push(
      RelativeMonadOracles.representableLooseMonoid(
        data,
        options.representabilityWitness,
      ),
    );
    results.push(
      RelativeMonadOracles.fiberEmbedding(
        data,
        options.representabilityWitness,
      ),
    );
    results.push(
      RelativeMonadOracles.representableRecovery(
        data,
        options.representabilityWitness,
        options.skewMonoidBridgeInput
          ? { skewMonoidBridgeInput: options.skewMonoidBridgeInput }
          : {},
      ),
    );
  }

  if (options.skewMonoidBridgeInput) {
    results.push(RelativeMonadOracles.skewMonoidBridge(options.skewMonoidBridgeInput));
  }

  results.push(RelativeMonadOracles.lanExtension());

  return results;
};

export interface RelativeCompositionOracleResult {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
}

export interface RelativeMonadLooseMonoidOracleResult<Obj, Arr, Payload, Evidence>
  extends RelativeCompositionOracleResult {
  readonly data: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly looseMonoidReport: LooseMonoidShapeReport;
}

const buildCompositionResult = (
  law: RelativeCompositionLawKey,
  report: { holds: boolean; details: string; issues: ReadonlyArray<string> },
): RelativeCompositionOracleResult => {
  const descriptor = RelativeCompositionLawRegistry[law];
  return {
    holds: report.holds,
    pending: false,
    registryPath: descriptor.registryPath,
    details: report.details,
    issues: report.issues,
  };
};

export const RelativeCompositionOracles = {
  adjunctionComposition: <Obj, Arr, Payload, Evidence>(
    input: RelativeAdjunctionCompositionInput<Obj, Arr, Payload, Evidence>,
  ): RelativeCompositionOracleResult =>
    buildCompositionResult(
      "adjunctionComposition",
      analyzeRelativeAdjunctionComposition(input),
    ),
  monadComposition: <Obj, Arr, Payload, Evidence>(
    input: RelativeMonadCompositionInput<Obj, Arr, Payload, Evidence>,
  ): RelativeCompositionOracleResult =>
    buildCompositionResult("monadComposition", analyzeRelativeMonadComposition(input)),
  looseMonoidBridge: <Obj, Arr, Payload, Evidence>(
    equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
    root: RelativeMonadData<Obj, Arr, Payload, Evidence>["root"],
    carrier: RelativeMonadData<Obj, Arr, Payload, Evidence>["carrier"],
    looseMonoid: LooseMonoidData<Obj, Arr, Payload, Evidence>,
  ): RelativeMonadLooseMonoidOracleResult<Obj, Arr, Payload, Evidence> => {
    const descriptor = RelativeCompositionLawRegistry.looseMonoidBridge;
    const bridge = relativeMonadFromLooseMonoid(equipment, root, carrier, looseMonoid);
    return {
      holds: bridge.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: bridge.details,
      issues: bridge.issues,
      data: bridge.data,
      looseMonoidReport: bridge.looseMonoidReport,
    };
  },
} as const;

export interface RelativeCompositionOracleInputs<Obj, Arr, Payload, Evidence> {
  readonly adjunctions?: RelativeAdjunctionCompositionInput<Obj, Arr, Payload, Evidence>;
  readonly monads?: RelativeMonadCompositionInput<Obj, Arr, Payload, Evidence>;
  readonly looseMonoid?: {
    readonly equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>;
    readonly root: RelativeMonadData<Obj, Arr, Payload, Evidence>["root"];
    readonly carrier: RelativeMonadData<Obj, Arr, Payload, Evidence>["carrier"];
    readonly data: LooseMonoidData<Obj, Arr, Payload, Evidence>;
  };
}

export const enumerateRelativeCompositionOracles = <Obj, Arr, Payload, Evidence>(
  inputs: RelativeCompositionOracleInputs<Obj, Arr, Payload, Evidence>,
): ReadonlyArray<
  RelativeCompositionOracleResult | RelativeMonadLooseMonoidOracleResult<Obj, Arr, Payload, Evidence>
> => {
  const results: Array<
    RelativeCompositionOracleResult | RelativeMonadLooseMonoidOracleResult<Obj, Arr, Payload, Evidence>
  > = [];
  if (inputs.adjunctions) {
    results.push(RelativeCompositionOracles.adjunctionComposition(inputs.adjunctions));
  }
  if (inputs.monads) {
    results.push(RelativeCompositionOracles.monadComposition(inputs.monads));
  }
  if (inputs.looseMonoid) {
    results.push(
      RelativeCompositionOracles.looseMonoidBridge(
        inputs.looseMonoid.equipment,
        inputs.looseMonoid.root,
        inputs.looseMonoid.carrier,
        inputs.looseMonoid.data,
      ),
    );
  }
  return results;
};
