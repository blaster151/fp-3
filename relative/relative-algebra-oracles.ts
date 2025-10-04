import type {
  RelativeEilenbergMoorePresentation,
  RelativeKleisliPresentation,
} from "./relative-algebras";
import {
  analyzeRelativeEilenbergMooreUniversalProperty,
  analyzeRelativeKleisliUniversalProperty,
} from "./relative-algebras";
import {
  RelativeAlgebraLawRegistry,
  type RelativeAlgebraLawKey,
} from "./relative-laws";

export interface RelativeAlgebraOracleResult {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
}

const pendingOracle = (
  law: RelativeAlgebraLawKey,
): RelativeAlgebraOracleResult => {
  const descriptor = RelativeAlgebraLawRegistry[law];
  return {
    holds: false,
    pending: true,
    registryPath: descriptor.registryPath,
    details: `${descriptor.name} oracle is pending. Summary: ${descriptor.summary}`,
  };
};

export const RelativeAlgebraOracles = {
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
      pending: false,
      registryPath: descriptor.registryPath,
      details: report.details,
      issues: report.issues,
    };
  },
  strongerUniversalProperties: () =>
    pendingOracle("strongerUniversalProperties"),
} as const;

export const enumerateRelativeAlgebraOracles = <Obj, Arr, Payload, Evidence>(
  presentation: RelativeKleisliPresentation<Obj, Arr, Payload, Evidence>,
  emPresentation: RelativeEilenbergMoorePresentation<Obj, Arr, Payload, Evidence>,
): ReadonlyArray<RelativeAlgebraOracleResult> => [
  RelativeAlgebraOracles.kleisliUniversalProperty(presentation),
  RelativeAlgebraOracles.eilenbergMooreUniversalProperty(emPresentation),
  RelativeAlgebraOracles.strongerUniversalProperties(),
];
