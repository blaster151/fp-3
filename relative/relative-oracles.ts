import type { RepresentabilityWitness, VirtualEquipment } from "../virtual-equipment";
import type { LooseMonoidData, LooseMonoidShapeReport } from "../virtual-equipment/loose-structures";
import type {
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
  type RelativeMonadRepresentableRecoveryOptions,
} from "./relative-monads";
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
}

export const enumerateRelativeMonadOracles = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  options: RelativeMonadOracleOptions<Obj, Arr, Payload, Evidence> = {},
): ReadonlyArray<RelativeMonadOracleResult> => {
  const results: RelativeMonadOracleResult[] = [
    RelativeMonadOracles.framing(data),
    RelativeMonadOracles.identityReduction(data),
    RelativeMonadOracles.extensionFraming(data),
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
