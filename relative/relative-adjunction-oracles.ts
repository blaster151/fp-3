import type {
  RelativeAdjunctionColimitPreservationInput,
  RelativeAdjunctionData,
  RelativeAdjunctionLeftLiftInput,
  RelativeAdjunctionLeftMorphismData,
  RelativeAdjunctionPrecompositionInput,
  RelativeAdjunctionRightExtensionInput,
  RelativeAdjunctionRightMorphismData,
  RelativeAdjunctionStrictMorphismData,
  RelativeAdjunctionUnitCounitPresentation,
} from "./relative-adjunctions";
import {
  analyzeRelativeAdjunctionFraming,
  analyzeRelativeAdjunctionHomIsomorphism,
  analyzeRelativeAdjunctionUnitCounit,
  analyzeRelativeAdjunctionPointwiseLeftLift,
  analyzeRelativeAdjunctionRightExtension,
  analyzeRelativeAdjunctionColimitPreservation,
  analyzeRelativeAdjunctionLeftMorphism,
  analyzeRelativeAdjunctionRightMorphism,
  analyzeRelativeAdjunctionStrictMorphism,
  analyzeRelativeAdjunctionPrecomposition,
} from "./relative-adjunctions";
import type { RelativeMonadData } from "./relative-monads";
import { analyzeRelativeMonadResolution } from "./relative-monads";
import {
  RelativeAdjunctionLawRegistry,
  type RelativeAdjunctionLawKey,
} from "./relative-laws";

export interface RelativeAdjunctionOracleResult {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
}

const pendingOracle = (
  law: RelativeAdjunctionLawKey,
  details?: string,
): RelativeAdjunctionOracleResult => {
  const descriptor = RelativeAdjunctionLawRegistry[law];
  return {
    holds: false,
    pending: true,
    registryPath: descriptor.registryPath,
    details: details ?? `${descriptor.name} oracle is pending. Summary: ${descriptor.summary}`,
  };
};

export const RelativeAdjunctionOracles = {
  framing: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.framing;
    const report = analyzeRelativeAdjunctionFraming(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  homIsomorphism: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.homIsomorphism;
    const report = analyzeRelativeAdjunctionHomIsomorphism(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  precomposition: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionPrecompositionInput<Obj, Arr, Payload, Evidence>["precomposition"],
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.precomposition;
    if (!input) {
      return pendingOracle(
        "precomposition",
        `${descriptor.name} oracle requires a tight cell u : A' → A to precompose; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionPrecomposition({ adjunction: data, precomposition: input });
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  unitCounitPresentation: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    presentation?: RelativeAdjunctionUnitCounitPresentation<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.unitCounit;
    if (!presentation) {
      return pendingOracle(
        "unitCounit",
        `${descriptor.name} oracle requires a unit/counit presentation; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionUnitCounit(data, presentation);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  pointwiseLeftLift: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionLeftLiftInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.pointwiseLeftLift;
    if (!input) {
      return pendingOracle(
        "pointwiseLeftLift",
        `${descriptor.name} oracle requires pointwise left lift data; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionPointwiseLeftLift(data, input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  rightExtension: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionRightExtensionInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.rightExtension;
    if (!input) {
      return pendingOracle(
        "rightExtension",
        `${descriptor.name} oracle requires left-extension data and (optionally) fully faithful witnesses. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionRightExtension(data, input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  colimitPreservation: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    input?: RelativeAdjunctionColimitPreservationInput<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.colimitPreservation;
    if (!input) {
      return pendingOracle(
        "colimitPreservation",
        `${descriptor.name} oracle requires paired j/ℓ preservation data. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeAdjunctionColimitPreservation(data, input);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  leftMorphism: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionLeftMorphismData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.leftMorphism;
    const report = analyzeRelativeAdjunctionLeftMorphism(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  rightMorphism: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionRightMorphismData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.rightMorphism;
    const report = analyzeRelativeAdjunctionRightMorphism(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  strictMorphism: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionStrictMorphismData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.strictMorphism;
    const report = analyzeRelativeAdjunctionStrictMorphism(data);
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  resolution: <Obj, Arr, Payload, Evidence>(
    data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
    monad?: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  ): RelativeAdjunctionOracleResult => {
    const descriptor = RelativeAdjunctionLawRegistry.resolution;
    if (!monad) {
      return pendingOracle(
        "resolution",
        `${descriptor.name} oracle requires a relative monad to compare against; none was supplied. Summary: ${descriptor.summary}`,
      );
    }
    const report = analyzeRelativeMonadResolution({ monad, adjunction: data });
    return {
      holds: report.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
} as const;

export interface RelativeAdjunctionOracleInputs<Obj, Arr, Payload, Evidence> {
  readonly unitCounit?: RelativeAdjunctionUnitCounitPresentation<Obj, Arr, Payload, Evidence>;
  readonly leftLift?: RelativeAdjunctionLeftLiftInput<Obj, Arr, Payload, Evidence>;
  readonly rightExtension?: RelativeAdjunctionRightExtensionInput<Obj, Arr, Payload, Evidence>;
  readonly colimitPreservation?: RelativeAdjunctionColimitPreservationInput<Obj, Arr, Payload, Evidence>;
  readonly leftMorphism?: RelativeAdjunctionLeftMorphismData<Obj, Arr, Payload, Evidence>;
  readonly rightMorphism?: RelativeAdjunctionRightMorphismData<Obj, Arr, Payload, Evidence>;
  readonly strictMorphism?: RelativeAdjunctionStrictMorphismData<Obj, Arr, Payload, Evidence>;
  readonly resolution?: { readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence> };
  readonly precomposition?: RelativeAdjunctionPrecompositionInput<Obj, Arr, Payload, Evidence>["precomposition"];
}

export const enumerateRelativeAdjunctionOracles = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  inputs?: RelativeAdjunctionOracleInputs<Obj, Arr, Payload, Evidence>,
): ReadonlyArray<RelativeAdjunctionOracleResult> => {
  const base: RelativeAdjunctionOracleResult[] = [
    RelativeAdjunctionOracles.framing(data),
    RelativeAdjunctionOracles.homIsomorphism(data),
    RelativeAdjunctionOracles.precomposition(data, inputs?.precomposition),
    RelativeAdjunctionOracles.unitCounitPresentation(data, inputs?.unitCounit),
    RelativeAdjunctionOracles.pointwiseLeftLift(data, inputs?.leftLift),
    RelativeAdjunctionOracles.rightExtension(data, inputs?.rightExtension),
    RelativeAdjunctionOracles.colimitPreservation(data, inputs?.colimitPreservation),
    RelativeAdjunctionOracles.resolution(data, inputs?.resolution?.monad),
  ];

  if (inputs?.leftMorphism) {
    base.push(RelativeAdjunctionOracles.leftMorphism(inputs.leftMorphism));
  }
  if (inputs?.rightMorphism) {
    base.push(RelativeAdjunctionOracles.rightMorphism(inputs.rightMorphism));
  }
  if (inputs?.strictMorphism) {
    base.push(RelativeAdjunctionOracles.strictMorphism(inputs.strictMorphism));
  }

  return base;
};
