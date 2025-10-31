import type {
  ResolutionAdjunctionPrecompositionReport,
  ResolutionCategory,
  ResolutionCategoryMetadata,
  ResolutionData,
  ResolutionLooseMonadIsomorphismReport,
  ResolutionOracleReport,
  RelativeAdjunctionIdentityUnitReport,
} from "./resolutions";
import {
  checkIdentityUnitForRelativeAdjunction,
  checkRelativeAdjunctionPrecomposition,
  checkResolutionCategoryLaws,
  checkResolutionOfRelativeMonad,
  identifyLooseMonadFromResolution,
} from "./resolutions";
import type {
  Equipment2Cell,
  EquipmentVerticalBoundary,
} from "../virtual-equipment";
import type { RelativeMonadData } from "./relative-monads";
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

export interface RelativeResolutionLooseMonadOracleResult<Obj, Arr, Payload, Evidence>
  extends RelativeResolutionOracleResult {
  readonly report: ResolutionLooseMonadIsomorphismReport<Obj, Arr, Payload, Evidence>;
}

export interface RelativeResolutionIdentityUnitOracleResult
  extends RelativeResolutionOracleResult {
  readonly report: RelativeAdjunctionIdentityUnitReport;
}

export interface ResolutionIdentityUnitOverrides<Obj, Arr, Payload, Evidence> {
  readonly left?: EquipmentVerticalBoundary<Obj, Arr>;
  readonly right?: EquipmentVerticalBoundary<Obj, Arr>;
  readonly unit?: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
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
  looseMonadIdentification: <Obj, Arr, Payload, Evidence>(
    resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
    monad: RelativeMonadData<Obj, Arr, Payload, Evidence> = resolution.relativeMonad,
  ): RelativeResolutionLooseMonadOracleResult<Obj, Arr, Payload, Evidence> => {
    const report = identifyLooseMonadFromResolution(resolution, monad);
    return {
      ...buildResult("looseMonadIdentification", report.holds, report.details, report.issues),
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
  identityUnitCriterion: <Obj, Arr, Payload, Evidence>(
    resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
    overrides?: ResolutionIdentityUnitOverrides<Obj, Arr, Payload, Evidence>,
  ): RelativeResolutionIdentityUnitOracleResult => {
    const report = checkIdentityUnitForRelativeAdjunction({
      equipment: resolution.equipment,
      left: overrides?.left ?? resolution.inclusion,
      right: overrides?.right ?? resolution.relativeMonad.carrier,
      unit: overrides?.unit ?? resolution.relativeMonad.unit,
      details: overrides?.details,
    });
    return {
      ...buildResult("identityUnitCriterion", report.holds, report.details, report.issues),
      report,
    };
  },
} as const;

export const enumerateResolutionOracles = <Obj, Arr, Payload, Evidence>(
  resolution: ResolutionData<Obj, Arr, Payload, Evidence>,
  category: ResolutionCategory<Obj, Arr, Payload, Evidence>,
): ReadonlyArray<RelativeResolutionOracleResult> => [
  RelativeResolutionOracles.resolution(resolution),
  RelativeResolutionOracles.looseMonadIdentification(resolution),
  RelativeResolutionOracles.categoryIdentities(category),
  RelativeResolutionOracles.precompositionSuite(category.metadata),
  RelativeResolutionOracles.identityUnitCriterion(resolution),
];
