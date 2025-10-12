import type {
  ResolutionAdjunctionPrecompositionReport,
  ResolutionCategory,
  ResolutionCategoryMetadata,
  ResolutionData,
  ResolutionOracleReport,
} from "./resolutions";
import {
  checkRelativeAdjunctionPrecomposition,
  checkResolutionCategoryLaws,
  checkResolutionOfRelativeMonad,
} from "./resolutions";
import {
  RelativeResolutionLawRegistry,
  type RelativeResolutionLawKey,
} from "./relative-laws";

export interface RelativeResolutionOracleResult {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly registryPath: string;
  readonly details: string;
  readonly issues?: ReadonlyArray<string>;
}

export interface RelativeResolutionWitnessOracleResult<Obj, Arr, Payload, Evidence>
  extends RelativeResolutionOracleResult {
  readonly report: ResolutionOracleReport<Obj, Arr, Payload, Evidence>;
}

export interface RelativeResolutionCategoryOracleResult<Obj, Arr, Payload, Evidence>
  extends RelativeResolutionOracleResult {
  readonly category: ResolutionCategory<Obj, Arr, Payload, Evidence>;
}

export interface RelativeResolutionPrecompositionOracleResult
  extends RelativeResolutionOracleResult {
  readonly report: ResolutionAdjunctionPrecompositionReport;
}

const buildResult = (
  key: RelativeResolutionLawKey,
  holds: boolean,
  details: string,
  issues?: ReadonlyArray<string>,
): RelativeResolutionOracleResult => {
  const descriptor = RelativeResolutionLawRegistry[key];
  return {
    holds,
    pending: false,
    registryPath: descriptor.registryPath,
    details: details || descriptor.summary,
    ...(issues !== undefined ? { issues } : {}),
  };
};

const aggregateIssues = (
  report: ResolutionAdjunctionPrecompositionReport,
): ReadonlyArray<string> | undefined => {
  const issues: string[] = [];
  if (!report.precomposition.holds) {
    issues.push(report.precomposition.details);
  }
  if (!report.pasting.holds) {
    issues.push(report.pasting.details);
  }
  if (!report.resoluteComposition.holds) {
    issues.push(report.resoluteComposition.details);
  }
  if (!report.fullyFaithfulPostcomposition.holds) {
    issues.push(report.fullyFaithfulPostcomposition.details);
  }
  if (!report.leftAdjointTransport.holds) {
    issues.push(report.leftAdjointTransport.details);
  }
  return issues.length > 0 ? issues : undefined;
};

export const RelativeResolutionOracles = {
  resolution: <Obj, Arr, Payload, Evidence>(
    resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  ): RelativeResolutionWitnessOracleResult<Obj, Arr, Payload, Evidence> => {
    const report = checkResolutionOfRelativeMonad(resolution);
    return {
      ...buildResult("resolutionWitness", report.holds, report.details, report.issues),
      report,
    };
  },
  categoryIdentities: <Obj, Arr, Payload, Evidence>(
    category: ResolutionCategory<Obj, Arr, Payload, Evidence>,
  ): RelativeResolutionCategoryOracleResult<Obj, Arr, Payload, Evidence> => {
    const report = checkResolutionCategoryLaws(category);
    return {
      ...buildResult("categoryIdentities", report.holds, report.details, report.issues),
      category,
    };
  },
  precompositionSuite: <Obj, Arr, Payload, Evidence>(
    metadata: ResolutionCategoryMetadata<Obj, Arr, Payload, Evidence>,
  ): RelativeResolutionPrecompositionOracleResult => {
    const report = checkRelativeAdjunctionPrecomposition(metadata);
    return {
      ...buildResult(
        "precompositionSuite",
        report.holds,
        report.details,
        aggregateIssues(report),
      ),
      report,
    };
  },
} as const;

export const enumerateResolutionOracles = <Obj, Arr, Payload, Evidence>(
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  category: ResolutionCategory<Obj, Arr, Payload, Evidence>,
): ReadonlyArray<RelativeResolutionOracleResult> => [
  RelativeResolutionOracles.resolution(resolution),
  RelativeResolutionOracles.categoryIdentities(category),
  RelativeResolutionOracles.precompositionSuite(category.metadata),
];
