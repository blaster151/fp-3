import type {
  RelativeComonadCorepresentabilityReport,
  RelativeComonadData,
  RelativeComonadFramingReport,
  RelativeComonadIdentityReductionReport,
  RelativeComonadCoopAlgebraReport,
  RelativeComonadCoopAlgebraWitness,
  RelativeEnrichedComonadReport,
  RelativeEnrichedComonadWitness,
} from "./relative-comonads";
import {
  analyzeRelativeComonadCorepresentability,
  analyzeRelativeComonadFraming,
  analyzeRelativeComonadIdentityReduction,
  analyzeRelativeComonadCoopAlgebra,
  analyzeRelativeEnrichedComonad,
} from "./relative-comonads";
import {
  RelativeComonadLawRegistry,
  type RelativeComonadLawKey,
} from "./relative-laws";

export interface RelativeComonadOracleResult {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
}

const buildResult = (
  law: RelativeComonadLawKey,
  report:
    | RelativeComonadFramingReport
    | RelativeComonadCorepresentabilityReport<unknown, unknown>
    | RelativeComonadIdentityReductionReport
    | RelativeEnrichedComonadReport<unknown, unknown, unknown, unknown>
    | RelativeComonadCoopAlgebraReport<unknown, unknown, unknown, unknown>,
): RelativeComonadOracleResult => {
  const descriptor = RelativeComonadLawRegistry[law];
  const issues = "issues" in report ? (report.issues as ReadonlyArray<string>) : undefined;
  return {
    holds: report.holds,
    pending: false,
    registryPath: descriptor.registryPath,
    details: report.details,
    ...(issues !== undefined && { issues }),
  };
};

export const RelativeComonadOracles = {
  counitFraming: <Obj, Arr, Payload, Evidence>(
    data: RelativeComonadData<Obj, Arr, Payload, Evidence>,
  ): RelativeComonadOracleResult => buildResult("counitFraming", analyzeRelativeComonadFraming(data)),
  coextensionFraming: <Obj, Arr, Payload, Evidence>(
    data: RelativeComonadData<Obj, Arr, Payload, Evidence>,
  ): RelativeComonadOracleResult => buildResult("coextensionFraming", analyzeRelativeComonadFraming(data)),
  corepresentability: <Obj, Arr, Payload, Evidence>(
    data: RelativeComonadData<Obj, Arr, Payload, Evidence>,
    witnessReport: RelativeComonadCorepresentabilityReport<Obj, Arr>,
  ): RelativeComonadOracleResult => {
    const descriptor = RelativeComonadLawRegistry.corepresentableLooseComonoid;
    return {
      holds: witnessReport.holds,
      pending: false,
      registryPath: descriptor.registryPath,
      details: witnessReport.details,
      issues: witnessReport.issues,
    };
  },
  identityReduction: <Obj, Arr, Payload, Evidence>(
    data: RelativeComonadData<Obj, Arr, Payload, Evidence>,
  ): RelativeComonadOracleResult =>
    buildResult(
      "identityReduction",
      analyzeRelativeComonadIdentityReduction(data.equipment, data),
    ),
  enrichment: <Obj, Arr, Payload, Evidence>(
    witness: RelativeEnrichedComonadWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeComonadOracleResult =>
    buildResult("enrichedStructure", analyzeRelativeEnrichedComonad(witness)),
  coopAlgebra: <Obj, Arr, Payload, Evidence>(
    witness: RelativeComonadCoopAlgebraWitness<Obj, Arr, Payload, Evidence>,
  ): RelativeComonadOracleResult =>
    buildResult("coopAlgebra", analyzeRelativeComonadCoopAlgebra(witness)),
} as const;

export const enumerateRelativeComonadOracles = <Obj, Arr, Payload, Evidence>(
  data: RelativeComonadData<Obj, Arr, Payload, Evidence>,
  corepresentability: RelativeComonadCorepresentabilityReport<Obj, Arr>,
  enrichment: RelativeEnrichedComonadWitness<Obj, Arr, Payload, Evidence>,
  coopAlgebra: RelativeComonadCoopAlgebraWitness<Obj, Arr, Payload, Evidence>,
): ReadonlyArray<RelativeComonadOracleResult> => [
  RelativeComonadOracles.counitFraming(data),
  RelativeComonadOracles.coextensionFraming(data),
  RelativeComonadOracles.corepresentability(data, corepresentability),
  RelativeComonadOracles.identityReduction(data),
  RelativeComonadOracles.enrichment(enrichment),
  RelativeComonadOracles.coopAlgebra(coopAlgebra),
];
