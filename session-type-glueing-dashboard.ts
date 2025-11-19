import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { RunnableExampleFlag } from "./examples/runnable/types";
import type {
  LambdaCoopAlignmentCoverageReport,
  LambdaCoopKernelClauseSkip,
} from "./lambda-coop.alignment-coverage";
import type { LambdaCoopResidualCoverageDigest } from "./supervised-stack-lambda-coop";
import { describeSessionTypeGlueingAssignments, type SessionTypeGlueingSweepConfig } from "./session-type-glueing-sweep";

export interface SessionTypeGlueingSweepRunSnapshot {
  readonly config: SessionTypeGlueingSweepConfig;
  readonly runnerHolds?: boolean;
  readonly runnerMismatches?: number;
  readonly sessionMetadata: ReadonlyArray<string>;
  readonly glueingMetadata: ReadonlyArray<string>;
  readonly alignmentMetadata: ReadonlyArray<string>;
  readonly alignmentNotes: ReadonlyArray<string>;
  readonly alignmentCoverage?: SessionTypeGlueingAlignmentCoverageSnapshot;
  readonly runnerCoverage?: SessionTypeGlueingAlignmentCoverageSnapshot;
  readonly exampleArgs?: ReadonlyArray<RunnableExampleFlag>;
}

export interface SessionTypeGlueingGeneratedManifestMetadata {
  readonly path: string;
  readonly entryCount: number;
  readonly mode: "explicit" | "suggested" | "plan";
  readonly sourcePath?: string;
  readonly planRecordPath?: string;
  readonly planIndex?: number;
  readonly planMismatchedRuns?: number;
  readonly planTotalRuns?: number;
}

export interface SessionTypeGlueingSuggestedManifestWriteMetadata {
  readonly path: string;
  readonly entryCount: number;
  readonly sourcePath: string;
}

export interface SessionTypeGlueingBlockedSuggestedManifestWriteMetadata {
  readonly path: string;
  readonly sourcePath: string;
  readonly mismatchedRuns: number;
  readonly totalRuns: number;
  readonly entryCount?: number;
}

export interface SessionTypeGlueingManifestQueueReplayError {
  readonly path: string;
  readonly error: string;
}

export interface SessionTypeGlueingManifestQueueSummary {
  readonly inputs?: ReadonlyArray<string>;
  readonly replays?: ReadonlyArray<string>;
  readonly outputs?: ReadonlyArray<string>;
  readonly blockedInputs?: ReadonlyArray<string>;
  readonly blockedManifestInputs?: ReadonlyArray<string>;
  readonly blockedManifestPlanInputs?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanInputMetadata>;
  readonly replayErrors?: ReadonlyArray<SessionTypeGlueingManifestQueueReplayError>;
  readonly coverageIssues?: ReadonlyArray<string>;
  readonly coverageDriftIssues?: ReadonlyArray<string>;
  readonly tested?: boolean;
  readonly testedAt?: string;
  readonly testRevision?: number;
  readonly testAgeMs?: number;
  readonly testThresholdMs?: number;
  readonly testStale?: boolean;
  readonly testIssues?: ReadonlyArray<string>;
  readonly testWarnings?: ReadonlyArray<string>;
  readonly testCoverageGate?: SessionTypeGlueingManifestQueueCoverageGateSummary | undefined;
  readonly testOverride?: {
    readonly flag: string;
    readonly issues: ReadonlyArray<string>;
    readonly reasons?: ReadonlyArray<string>;
  };
}

export interface SessionTypeGlueingManifestQueueCoverageGateSummary {
  readonly checkedAt: string;
  readonly issues?: ReadonlyArray<string>;
  readonly warnings?: ReadonlyArray<string>;
}

export interface SessionTypeGlueingSweepSourceCoverage {
  readonly manifestInputs?: number;
  readonly blockedPlans?: number;
}

export interface SessionTypeGlueingAlignmentCoverageSnapshot {
  readonly interpreterExpectedOperations?: number;
  readonly interpreterCoveredOperations?: number;
  readonly interpreterMissingOperations: ReadonlyArray<string>;
  readonly kernelTotalClauses?: number;
  readonly kernelEvaluatedClauses?: number;
  readonly kernelSkippedClauses: ReadonlyArray<LambdaCoopKernelClauseSkip>;
  readonly operationSummary?: SessionTypeGlueingAlignmentCoverageOperationSummary;
  readonly operations?: ReadonlyArray<SessionTypeGlueingAlignmentCoverageOperationLink>;
}

export interface SessionTypeGlueingAlignmentCoverageOperationSummary {
  readonly total: number;
  readonly missingInterpreter: number;
  readonly missingKernelClause: number;
  readonly skippedKernelClauses: number;
  readonly residualDefaulted: number;
  readonly residualHandlers: number;
}

export interface SessionTypeGlueingAlignmentCoverageResidualSnapshot {
  readonly defaulted?: boolean;
  readonly handlerDescription?: string;
  readonly coverage?: LambdaCoopResidualCoverageDigest;
  readonly notes: ReadonlyArray<string>;
}

export interface SessionTypeGlueingAlignmentCoverageOperationLink {
  readonly operation: string;
  readonly interpreterCovered: boolean;
  readonly kernelClauseKind?: string;
  readonly kernelClauseDescription?: string;
  readonly kernelClauseSkipped?: LambdaCoopKernelClauseSkip;
  readonly residual?: SessionTypeGlueingAlignmentCoverageResidualSnapshot;
  readonly notes: ReadonlyArray<string>;
}

export interface SessionTypeGlueingBlockedManifestPlanEntryConfig {
  readonly label: string;
  readonly sessionTypeLiteral: string;
  readonly assignments: Readonly<Record<string, string>>;
  readonly glueingSpan: string;
}

export interface SessionTypeGlueingBlockedManifestPlanEntry {
  readonly path: string;
  readonly sourcePath: string;
  readonly mismatchedRuns: number;
  readonly totalRuns: number;
  readonly entryCount: number;
  readonly entries: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntryConfig>;
}

export interface SessionTypeGlueingBlockedManifestPlanInputMetadata
  extends SessionTypeGlueingBlockedManifestPlanEntry {
  readonly planRecordPath: string;
  readonly recordedAt?: string;
  readonly planIndex: number;
  readonly reason: string;
  readonly issues: ReadonlyArray<string>;
  readonly warnings?: ReadonlyArray<string>;
}

export const SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION = 1 as const;

export interface SessionTypeGlueingSweepRecord {
  readonly schemaVersion: typeof SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION;
  readonly recordedAt: string;
  readonly recordedSweepFile?: string;
  readonly runs: ReadonlyArray<SessionTypeGlueingSweepRunSnapshot>;
  readonly generatedManifests?: ReadonlyArray<SessionTypeGlueingGeneratedManifestMetadata>;
  readonly suggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingSuggestedManifestWriteMetadata>;
  readonly blockedSuggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingBlockedSuggestedManifestWriteMetadata>;
  readonly blockedQueuedManifestInputs?: ReadonlyArray<string>;
  readonly blockedManifestInputs?: ReadonlyArray<string>;
  readonly blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
  readonly blockedManifestPlanInputs?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanInputMetadata>;
  readonly manifestQueue?: SessionTypeGlueingManifestQueueSummary;
  readonly sourceCoverage?: SessionTypeGlueingSweepSourceCoverage;
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const extractMetadataValue = (entries: ReadonlyArray<string>, prefix: string): string | undefined =>
  entries.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);

const asGeneratedManifestMetadataArray = (
  value: unknown,
): SessionTypeGlueingGeneratedManifestMetadata[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return undefined;
      }
      const record = entry as Partial<SessionTypeGlueingGeneratedManifestMetadata>;
      if (typeof record.path !== "string" || typeof record.entryCount !== "number") {
        return undefined;
      }
      if (record.mode !== "explicit" && record.mode !== "suggested" && record.mode !== "plan") {
        return undefined;
      }
      return {
        path: record.path,
        entryCount: record.entryCount,
        mode: record.mode,
        ...(typeof record.sourcePath === "string" ? { sourcePath: record.sourcePath } : {}),
        ...(typeof record.planRecordPath === "string" ? { planRecordPath: record.planRecordPath } : {}),
        ...(typeof record.planIndex === "number" ? { planIndex: record.planIndex } : {}),
        ...(typeof record.planMismatchedRuns === "number"
          ? { planMismatchedRuns: record.planMismatchedRuns }
          : {}),
        ...(typeof record.planTotalRuns === "number"
          ? { planTotalRuns: record.planTotalRuns }
          : {}),
      } satisfies SessionTypeGlueingGeneratedManifestMetadata;
    })
    .filter((entry): entry is SessionTypeGlueingGeneratedManifestMetadata => entry !== undefined);
};

const asSuggestedManifestWriteArray = (
  value: unknown,
): SessionTypeGlueingSuggestedManifestWriteMetadata[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return undefined;
      }
      const record = entry as Partial<SessionTypeGlueingSuggestedManifestWriteMetadata>;
      if (typeof record.path !== "string" || typeof record.entryCount !== "number" || typeof record.sourcePath !== "string") {
        return undefined;
      }
      return {
        path: record.path,
        entryCount: record.entryCount,
        sourcePath: record.sourcePath,
      } satisfies SessionTypeGlueingSuggestedManifestWriteMetadata;
    })
    .filter((entry): entry is SessionTypeGlueingSuggestedManifestWriteMetadata => entry !== undefined);
};

const asBlockedSuggestedManifestWriteArray = (
  value: unknown,
): SessionTypeGlueingBlockedSuggestedManifestWriteMetadata[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return undefined;
      }
      const record = entry as Partial<SessionTypeGlueingBlockedSuggestedManifestWriteMetadata>;
      if (
        typeof record.path !== "string" ||
        typeof record.sourcePath !== "string" ||
        typeof record.mismatchedRuns !== "number" ||
        typeof record.totalRuns !== "number"
      ) {
        return undefined;
      }
      return {
        path: record.path,
        sourcePath: record.sourcePath,
        mismatchedRuns: record.mismatchedRuns,
        totalRuns: record.totalRuns,
        ...(typeof record.entryCount === "number" ? { entryCount: record.entryCount } : {}),
      } satisfies SessionTypeGlueingBlockedSuggestedManifestWriteMetadata;
    })
    .filter((entry): entry is SessionTypeGlueingBlockedSuggestedManifestWriteMetadata => entry !== undefined);
};

const normalizeBlockedManifestPlanEntry = (
  record: Partial<SessionTypeGlueingBlockedManifestPlanEntry>,
): SessionTypeGlueingBlockedManifestPlanEntry | undefined => {
  if (
    typeof record.path !== "string" ||
    typeof record.sourcePath !== "string" ||
    typeof record.mismatchedRuns !== "number" ||
    typeof record.totalRuns !== "number" ||
    typeof record.entryCount !== "number" ||
    !Array.isArray(record.entries)
  ) {
    return undefined;
  }
  const entries: SessionTypeGlueingBlockedManifestPlanEntryConfig[] = [];
  let valid = true;
  for (const config of record.entries) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      valid = false;
      break;
    }
    const normalized = config as Partial<SessionTypeGlueingBlockedManifestPlanEntryConfig>;
    if (
      typeof normalized.label !== "string" ||
      typeof normalized.sessionTypeLiteral !== "string" ||
      typeof normalized.glueingSpan !== "string" ||
      !normalized.assignments ||
      typeof normalized.assignments !== "object" ||
      Array.isArray(normalized.assignments)
    ) {
      valid = false;
      break;
    }
    const assignments: Record<string, string> = {};
    for (const [channel, object] of Object.entries(normalized.assignments)) {
      if (typeof channel !== "string" || typeof object !== "string") {
        valid = false;
        break;
      }
      assignments[channel] = object;
    }
    if (!valid) {
      break;
    }
    entries.push({
      label: normalized.label,
      sessionTypeLiteral: normalized.sessionTypeLiteral,
      glueingSpan: normalized.glueingSpan,
      assignments,
    });
  }
  if (!valid) {
    return undefined;
  }
  return {
    path: record.path,
    sourcePath: record.sourcePath,
    mismatchedRuns: record.mismatchedRuns,
    totalRuns: record.totalRuns,
    entryCount: record.entryCount,
    entries,
  } satisfies SessionTypeGlueingBlockedManifestPlanEntry;
};

const asBlockedManifestPlanArray = (
  value: unknown,
): SessionTypeGlueingBlockedManifestPlanEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const plans: SessionTypeGlueingBlockedManifestPlanEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const normalized = normalizeBlockedManifestPlanEntry(entry as Partial<SessionTypeGlueingBlockedManifestPlanEntry>);
    if (normalized) {
      plans.push(normalized);
    }
  }
  return plans;
};

const asBlockedManifestPlanInputArray = (
  value: unknown,
): SessionTypeGlueingBlockedManifestPlanInputMetadata[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const inputs: SessionTypeGlueingBlockedManifestPlanInputMetadata[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Partial<SessionTypeGlueingBlockedManifestPlanInputMetadata>;
    if (
      typeof record.planRecordPath !== "string" ||
      typeof record.planIndex !== "number" ||
      typeof record.reason !== "string"
    ) {
      continue;
    }
    const plan = normalizeBlockedManifestPlanEntry(record);
    if (!plan) {
      continue;
    }
    const issues = asStringArray(record.issues);
    const warnings = asStringArray(record.warnings);
    inputs.push({
      ...plan,
      planRecordPath: record.planRecordPath,
      ...(typeof record.recordedAt === "string" ? { recordedAt: record.recordedAt } : {}),
      planIndex: record.planIndex,
      reason: record.reason,
      issues,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  }
  return inputs;
};

const asManifestQueueReplayErrorArray = (
  value: unknown,
): SessionTypeGlueingManifestQueueReplayError[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return undefined;
      }
      const record = entry as Partial<SessionTypeGlueingManifestQueueReplayError>;
      if (typeof record.path !== "string" || typeof record.error !== "string") {
        return undefined;
      }
      return { path: record.path, error: record.error } satisfies SessionTypeGlueingManifestQueueReplayError;
    })
    .filter((entry): entry is SessionTypeGlueingManifestQueueReplayError => entry !== undefined);
};

const normalizeManifestQueueCoverageGateSummary = (
  coverageGate?: SessionTypeGlueingManifestQueueCoverageGateSummary,
): SessionTypeGlueingManifestQueueCoverageGateSummary | undefined => {
  if (!coverageGate || typeof coverageGate.checkedAt !== "string") {
    return undefined;
  }
  const normalized: SessionTypeGlueingManifestQueueCoverageGateSummary = {
    checkedAt: coverageGate.checkedAt,
    ...(coverageGate.issues && coverageGate.issues.length > 0
      ? { issues: Array.from(coverageGate.issues) }
      : {}),
    ...(coverageGate.warnings && coverageGate.warnings.length > 0
      ? { warnings: Array.from(coverageGate.warnings) }
      : {}),
  };
  return normalized;
};

const asManifestQueueCoverageGateSummary = (
  value: unknown,
): SessionTypeGlueingManifestQueueCoverageGateSummary | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Partial<SessionTypeGlueingManifestQueueCoverageGateSummary> & Record<string, unknown>;
  if (typeof record.checkedAt !== "string") {
    return undefined;
  }
  const issues = record.issues ? asStringArray(record.issues) : [];
  const warnings = record.warnings ? asStringArray(record.warnings) : [];
  return normalizeManifestQueueCoverageGateSummary({
    checkedAt: record.checkedAt,
    ...(issues.length > 0 ? { issues } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
  });
};

const normalizeManifestQueueSummary = (
  summary?: SessionTypeGlueingManifestQueueSummary,
): SessionTypeGlueingManifestQueueSummary | undefined => {
  if (!summary) {
    return undefined;
  }
  const normalized: SessionTypeGlueingManifestQueueSummary = {
    ...(summary.inputs && summary.inputs.length > 0 ? { inputs: Array.from(summary.inputs) } : {}),
    ...(summary.replays && summary.replays.length > 0 ? { replays: Array.from(summary.replays) } : {}),
    ...(summary.outputs && summary.outputs.length > 0 ? { outputs: Array.from(summary.outputs) } : {}),
    ...(summary.blockedInputs && summary.blockedInputs.length > 0
      ? { blockedInputs: Array.from(summary.blockedInputs) }
      : {}),
    ...(summary.blockedManifestInputs && summary.blockedManifestInputs.length > 0
      ? { blockedManifestInputs: Array.from(summary.blockedManifestInputs) }
      : {}),
    ...(summary.blockedManifestPlanInputs && summary.blockedManifestPlanInputs.length > 0
      ? { blockedManifestPlanInputs: Array.from(summary.blockedManifestPlanInputs) }
      : {}),
    ...(summary.replayErrors && summary.replayErrors.length > 0
      ? { replayErrors: Array.from(summary.replayErrors) }
      : {}),
    ...(summary.coverageIssues && summary.coverageIssues.length > 0
      ? { coverageIssues: Array.from(summary.coverageIssues) }
      : {}),
    ...(summary.coverageDriftIssues && summary.coverageDriftIssues.length > 0
      ? { coverageDriftIssues: Array.from(summary.coverageDriftIssues) }
      : {}),
    ...(summary.tested !== undefined ? { tested: summary.tested } : {}),
    ...(summary.testedAt ? { testedAt: summary.testedAt } : {}),
    ...(summary.testRevision !== undefined ? { testRevision: summary.testRevision } : {}),
    ...(summary.testAgeMs !== undefined ? { testAgeMs: summary.testAgeMs } : {}),
    ...(summary.testThresholdMs !== undefined ? { testThresholdMs: summary.testThresholdMs } : {}),
    ...(summary.testStale !== undefined ? { testStale: summary.testStale } : {}),
    ...(summary.testIssues && summary.testIssues.length > 0
      ? { testIssues: Array.from(summary.testIssues) }
      : {}),
    ...(summary.testWarnings && summary.testWarnings.length > 0
      ? { testWarnings: Array.from(summary.testWarnings) }
      : {}),
    ...(summary.testCoverageGate
      ? { testCoverageGate: normalizeManifestQueueCoverageGateSummary(summary.testCoverageGate) }
      : {}),
    ...(summary.testOverride ? { testOverride: summary.testOverride } : {}),
  };
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeSourceCoverage = (
  coverage?: SessionTypeGlueingSweepSourceCoverage | Partial<SessionTypeGlueingSweepSourceCoverage>,
): SessionTypeGlueingSweepSourceCoverage | undefined => {
  if (!coverage) {
    return undefined;
  }
  const normalized: { manifestInputs?: number; blockedPlans?: number } = {};
  if (
    typeof coverage.manifestInputs === "number" &&
    Number.isFinite(coverage.manifestInputs) &&
    coverage.manifestInputs > 0
  ) {
    normalized.manifestInputs = coverage.manifestInputs;
  }
  if (
    typeof coverage.blockedPlans === "number" &&
    Number.isFinite(coverage.blockedPlans) &&
    coverage.blockedPlans > 0
  ) {
    normalized.blockedPlans = coverage.blockedPlans;
  }
  return Object.keys(normalized).length > 0
    ? (normalized as SessionTypeGlueingSweepSourceCoverage)
    : undefined;
};

const asManifestQueueSummary = (value: unknown): SessionTypeGlueingManifestQueueSummary | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Partial<SessionTypeGlueingManifestQueueSummary> & Record<string, unknown>;
  const tested = asBoolean(record.tested);
  const testedAt = typeof record.testedAt === "string" ? record.testedAt : undefined;
  const testRevision = asFiniteNumber(record.testRevision);
  const testAgeMs = asFiniteNumber(record.testAgeMs);
  const testThresholdMs = asFiniteNumber(record.testThresholdMs);
  const testStale = asBoolean(record.testStale);
  const testCoverageGate = asManifestQueueCoverageGateSummary(record.testCoverageGate);
  return normalizeManifestQueueSummary({
    inputs: asStringArray(record.inputs),
    replays: asStringArray(record.replays),
    outputs: asStringArray(record.outputs),
    blockedInputs: asStringArray(record.blockedInputs),
    blockedManifestInputs: asStringArray(record.blockedManifestInputs),
    ...(record.blockedManifestPlanInputs
      ? { blockedManifestPlanInputs: asBlockedManifestPlanInputArray(record.blockedManifestPlanInputs) }
      : {}),
    replayErrors: asManifestQueueReplayErrorArray(record.replayErrors),
    coverageIssues: asStringArray(record.coverageIssues),
    coverageDriftIssues: asStringArray(record.coverageDriftIssues),
    ...(tested !== undefined ? { tested } : {}),
    ...(testedAt ? { testedAt } : {}),
    ...(testRevision !== undefined ? { testRevision } : {}),
    ...(testAgeMs !== undefined ? { testAgeMs } : {}),
    ...(testThresholdMs !== undefined ? { testThresholdMs } : {}),
    ...(testStale !== undefined ? { testStale } : {}),
    ...(record.testIssues ? { testIssues: asStringArray(record.testIssues) } : {}),
    ...(record.testWarnings ? { testWarnings: asStringArray(record.testWarnings) } : {}),
    ...(testCoverageGate ? { testCoverageGate } : {}),
  });
};

const asSourceCoverage = (value: unknown): SessionTypeGlueingSweepSourceCoverage | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Partial<SessionTypeGlueingSweepSourceCoverage> & Record<string, unknown>;
  const candidate: { manifestInputs?: number; blockedPlans?: number } = {};
  const manifestInputs = asFiniteNumber(record.manifestInputs);
  if (manifestInputs !== undefined) {
    candidate.manifestInputs = manifestInputs;
  }
  const blockedPlans = asFiniteNumber(record.blockedPlans);
  if (blockedPlans !== undefined) {
    candidate.blockedPlans = blockedPlans;
  }
  return normalizeSourceCoverage(candidate);
};

export const SESSION_TYPE_GLUEING_ALIGNMENT_STATUS_PREFIX = "λ₍coop₎.alignment.status=" as const;

export const getSessionTypeGlueingAlignmentStatus = (
  alignmentMetadata: ReadonlyArray<string>,
): string | undefined => extractMetadataValue(alignmentMetadata, SESSION_TYPE_GLUEING_ALIGNMENT_STATUS_PREFIX);

const SESSION_TYPE_MANIFEST_PATH_PREFIX = "sessionType.manifest.path=" as const;
const SESSION_TYPE_MANIFEST_ENTRY_COUNT_PREFIX = "sessionType.manifest.entryCount=" as const;
const SESSION_TYPE_MANIFEST_REPLAYED_AT_PREFIX = "sessionType.manifest.replayedAt=" as const;

const parseBooleanMetadata = (
  entries: ReadonlyArray<string>,
  prefix: string,
): boolean | undefined => {
  const raw = extractMetadataValue(entries, prefix);
  if (raw === undefined) {
    return undefined;
  }
  return raw.trim().toLowerCase() === "true";
};

const parseNumberMetadata = (
  entries: ReadonlyArray<string>,
  prefix: string,
): number | undefined => {
  const raw = extractMetadataValue(entries, prefix);
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseJsonMetadataValue = (entries: ReadonlyArray<string>, prefix: string): unknown => {
  const raw = extractMetadataValue(entries, prefix);
  if (raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const parseStringArrayMetadata = (entries: ReadonlyArray<string>, prefix: string): string[] | undefined => {
  const value = parseJsonMetadataValue(entries, prefix);
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((entry): entry is string => typeof entry === "string");
};

const isLambdaCoopKernelClauseSkipReason = (
  reason: string,
): reason is LambdaCoopKernelClauseSkip["reason"] => reason === "missing-argument-witness";

const parseKernelClauseSkipArrayMetadata = (
  entries: ReadonlyArray<string>,
  prefix: string,
): LambdaCoopKernelClauseSkip[] | undefined => {
  const value = parseJsonMetadataValue(entries, prefix);
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return undefined;
      }
      const record = entry as Partial<LambdaCoopKernelClauseSkip>;
      if (typeof record.operation !== "string" || typeof record.reason !== "string") {
        return undefined;
      }
      if (!isLambdaCoopKernelClauseSkipReason(record.reason)) {
        return undefined;
      }
      return {
        operation: record.operation,
        reason: record.reason,
      } satisfies LambdaCoopKernelClauseSkip;
    })
    .filter((entry): entry is LambdaCoopKernelClauseSkip => entry !== undefined);
};

const SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_OPERATION_SUMMARY_PREFIX =
  "λ₍coop₎.alignment.coverage.operations.summary=" as const;
const SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_OPERATION_LINKS_PREFIX =
  "λ₍coop₎.alignment.coverage.operations.links=" as const;

const parseCoverageOperationSummaryMetadata = (
  entries: ReadonlyArray<string>,
  prefix: string,
): SessionTypeGlueingAlignmentCoverageOperationSummary | undefined => {
  const value = parseJsonMetadataValue(entries, prefix);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Partial<SessionTypeGlueingAlignmentCoverageOperationSummary>;
  const total = typeof record.total === "number" ? record.total : undefined;
  const missingInterpreter =
    typeof record.missingInterpreter === "number" ? record.missingInterpreter : undefined;
  const missingKernelClause =
    typeof record.missingKernelClause === "number" ? record.missingKernelClause : undefined;
  const skippedKernelClauses =
    typeof record.skippedKernelClauses === "number" ? record.skippedKernelClauses : undefined;
  const residualDefaulted =
    typeof record.residualDefaulted === "number" ? record.residualDefaulted : undefined;
  const residualHandlers =
    typeof record.residualHandlers === "number" ? record.residualHandlers : undefined;
  if (
    total === undefined &&
    missingInterpreter === undefined &&
    missingKernelClause === undefined &&
    skippedKernelClauses === undefined &&
    residualDefaulted === undefined &&
    residualHandlers === undefined
  ) {
    return undefined;
  }
  return {
    total: total ?? 0,
    missingInterpreter: missingInterpreter ?? 0,
    missingKernelClause: missingKernelClause ?? 0,
    skippedKernelClauses: skippedKernelClauses ?? 0,
    residualDefaulted: residualDefaulted ?? 0,
    residualHandlers: residualHandlers ?? 0,
  } satisfies SessionTypeGlueingAlignmentCoverageOperationSummary;
};

const parseResidualCoverageDigestValue = (
  value: unknown,
): LambdaCoopResidualCoverageDigest | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Partial<LambdaCoopResidualCoverageDigest>;
  if (
    typeof record.handled !== "number" ||
    typeof record.unhandled !== "number" ||
    typeof record.sampleLimit !== "number"
  ) {
    return undefined;
  }
  return {
    handled: record.handled,
    unhandled: record.unhandled,
    sampleLimit: record.sampleLimit,
  } satisfies LambdaCoopResidualCoverageDigest;
};

const parseCoverageResidualMetadata = (
  value: unknown,
): SessionTypeGlueingAlignmentCoverageResidualSnapshot | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as {
    readonly defaulted?: unknown;
    readonly handlerDescription?: unknown;
    readonly coverage?: unknown;
    readonly notes?: unknown;
  };
  const coverage = record.coverage ? parseResidualCoverageDigestValue(record.coverage) : undefined;
  const notes = asStringArray(record.notes ?? []);
  if (
    typeof record.defaulted !== "boolean" &&
    typeof record.handlerDescription !== "string" &&
    !coverage &&
    notes.length === 0
  ) {
    return undefined;
  }
  return {
    ...(typeof record.defaulted === "boolean" ? { defaulted: record.defaulted } : {}),
    ...(typeof record.handlerDescription === "string"
      ? { handlerDescription: record.handlerDescription }
      : {}),
    ...(coverage ? { coverage } : {}),
    notes,
  } satisfies SessionTypeGlueingAlignmentCoverageResidualSnapshot;
};

const parseCoverageOperationLinksMetadata = (
  entries: ReadonlyArray<string>,
  prefix: string,
): SessionTypeGlueingAlignmentCoverageOperationLink[] | undefined => {
  const value = parseJsonMetadataValue(entries, prefix);
  if (!Array.isArray(value)) {
    return undefined;
  }
  const links: SessionTypeGlueingAlignmentCoverageOperationLink[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as { [key: string]: unknown };
    const operationRaw = record["operation"];
    const operation = typeof operationRaw === "string" ? operationRaw : undefined;
    if (!operation) {
      continue;
    }
    const interpreterCoveredRaw = record["interpreterCovered"];
    const interpreterCovered =
      interpreterCoveredRaw === undefined ? true : Boolean(interpreterCoveredRaw);
    let kernelClauseKind: string | undefined;
    let kernelClauseDescription: string | undefined;
    const kernelClauseRaw = record["kernelClause"];
    if (kernelClauseRaw && typeof kernelClauseRaw === "object" && !Array.isArray(kernelClauseRaw)) {
      const clause = kernelClauseRaw as { [key: string]: unknown };
      const kindRaw = clause["kind"];
      if (typeof kindRaw === "string") {
        kernelClauseKind = kindRaw;
      }
      const descriptionRaw = clause["description"];
      if (typeof descriptionRaw === "string") {
        kernelClauseDescription = descriptionRaw;
      }
    }
    let kernelClauseSkipped: LambdaCoopKernelClauseSkip | undefined;
    const kernelClauseSkippedRaw = record["kernelClauseSkipped"];
    if (
      kernelClauseSkippedRaw &&
      typeof kernelClauseSkippedRaw === "object" &&
      !Array.isArray(kernelClauseSkippedRaw)
    ) {
      const skip = kernelClauseSkippedRaw as { [key: string]: unknown };
      const skipOperation = skip["operation"];
      const skipReason = skip["reason"];
      if (
        typeof skipOperation === "string" &&
        typeof skipReason === "string" &&
        isLambdaCoopKernelClauseSkipReason(skipReason)
      ) {
        kernelClauseSkipped = { operation: skipOperation, reason: skipReason };
      }
    }
    const residual = record["residual"]
      ? parseCoverageResidualMetadata(record["residual"])
      : undefined;
    const notes = asStringArray(record["notes"] ?? []);
    links.push({
      operation,
      interpreterCovered,
      ...(kernelClauseKind ? { kernelClauseKind } : {}),
      ...(kernelClauseDescription ? { kernelClauseDescription } : {}),
      ...(kernelClauseSkipped ? { kernelClauseSkipped } : {}),
      ...(residual ? { residual } : {}),
      notes,
    });
  }
  return links.length > 0 ? links : undefined;
};

export const getManifestSourceFromMetadata = (
  entries: ReadonlyArray<string>,
): SessionTypeGlueingDashboardManifestSource | undefined => {
  const path = extractMetadataValue(entries, SESSION_TYPE_MANIFEST_PATH_PREFIX);
  const entryCount = parseNumberMetadata(entries, SESSION_TYPE_MANIFEST_ENTRY_COUNT_PREFIX);
  const replayedAt = extractMetadataValue(entries, SESSION_TYPE_MANIFEST_REPLAYED_AT_PREFIX);
  if (path === undefined && entryCount === undefined && replayedAt === undefined) {
    return undefined;
  }
  return {
    ...(path ? { path } : {}),
    ...(entryCount !== undefined ? { entryCount } : {}),
    ...(replayedAt ? { replayedAt } : {}),
  } satisfies SessionTypeGlueingDashboardManifestSource;
};

const SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_INTERPRETER_EXPECTED_PREFIX =
  "λ₍coop₎.alignment.coverage.interpreter.expected=" as const;
const SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_INTERPRETER_COVERED_PREFIX =
  "λ₍coop₎.alignment.coverage.interpreter.covered=" as const;
const SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_INTERPRETER_MISSING_PREFIX =
  "λ₍coop₎.alignment.coverage.interpreter.missing=" as const;
const SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_KERNEL_TOTAL_PREFIX =
  "λ₍coop₎.alignment.coverage.kernel.total=" as const;
const SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_KERNEL_EVALUATED_PREFIX =
  "λ₍coop₎.alignment.coverage.kernel.evaluated=" as const;
const SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_KERNEL_SKIPPED_PREFIX =
  "λ₍coop₎.alignment.coverage.kernel.skipped=" as const;
const SESSION_TYPE_GLUEING_RUNNER_COVERAGE_PREFIX =
  "supervised-stack.lambdaCoop.coverage=" as const;

const coverageReportToSnapshot = (
  report: LambdaCoopAlignmentCoverageReport | undefined,
): SessionTypeGlueingAlignmentCoverageSnapshot | undefined => {
  if (!report) {
    return undefined;
  }
  return {
    interpreterExpectedOperations: report.interpreterExpectedOperations,
    interpreterCoveredOperations: report.interpreterCoveredOperations,
    interpreterMissingOperations: [...report.interpreterMissingOperations],
    kernelTotalClauses: report.kernelTotalClauses,
    kernelEvaluatedClauses: report.kernelEvaluatedClauses,
    kernelSkippedClauses: [...report.kernelSkippedClauses],
    operationSummary: report.operationSummary,
    operations: report.operations,
  } satisfies SessionTypeGlueingAlignmentCoverageSnapshot;
};

export const getSessionTypeGlueingAlignmentCoverageFromMetadata = (
  alignmentMetadata: ReadonlyArray<string>,
): SessionTypeGlueingAlignmentCoverageSnapshot | undefined => {
  const interpreterExpected = parseNumberMetadata(
    alignmentMetadata,
    SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_INTERPRETER_EXPECTED_PREFIX,
  );
  const interpreterCovered = parseNumberMetadata(
    alignmentMetadata,
    SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_INTERPRETER_COVERED_PREFIX,
  );
  const interpreterMissingOperations =
    parseStringArrayMetadata(alignmentMetadata, SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_INTERPRETER_MISSING_PREFIX) ?? [];
  const kernelTotal = parseNumberMetadata(
    alignmentMetadata,
    SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_KERNEL_TOTAL_PREFIX,
  );
  const kernelEvaluated = parseNumberMetadata(
    alignmentMetadata,
    SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_KERNEL_EVALUATED_PREFIX,
  );
  const kernelSkippedClauses =
    parseKernelClauseSkipArrayMetadata(alignmentMetadata, SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_KERNEL_SKIPPED_PREFIX) ?? [];
  const operationSummary = parseCoverageOperationSummaryMetadata(
    alignmentMetadata,
    SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_OPERATION_SUMMARY_PREFIX,
  );
  const operationLinks = parseCoverageOperationLinksMetadata(
    alignmentMetadata,
    SESSION_TYPE_GLUEING_ALIGNMENT_COVERAGE_OPERATION_LINKS_PREFIX,
  );
  if (
    interpreterExpected === undefined &&
    interpreterCovered === undefined &&
    interpreterMissingOperations.length === 0 &&
    kernelTotal === undefined &&
    kernelEvaluated === undefined &&
    kernelSkippedClauses.length === 0 &&
    !operationSummary &&
    (!operationLinks || operationLinks.length === 0)
  ) {
    return undefined;
  }
  return {
    ...(interpreterExpected !== undefined ? { interpreterExpectedOperations: interpreterExpected } : {}),
    ...(interpreterCovered !== undefined ? { interpreterCoveredOperations: interpreterCovered } : {}),
    interpreterMissingOperations,
    ...(kernelTotal !== undefined ? { kernelTotalClauses: kernelTotal } : {}),
    ...(kernelEvaluated !== undefined ? { kernelEvaluatedClauses: kernelEvaluated } : {}),
    kernelSkippedClauses,
    ...(operationSummary ? { operationSummary } : {}),
    ...(operationLinks ? { operations: operationLinks } : {}),
  } satisfies SessionTypeGlueingAlignmentCoverageSnapshot;
};

export const getSessionTypeGlueingRunnerCoverageFromMetadata = (
  sessionMetadata: ReadonlyArray<string>,
): SessionTypeGlueingAlignmentCoverageSnapshot | undefined => {
  const entry = sessionMetadata.find((value) =>
    value.startsWith(SESSION_TYPE_GLUEING_RUNNER_COVERAGE_PREFIX),
  );
  if (!entry) {
    return undefined;
  }
  const raw = entry.slice(SESSION_TYPE_GLUEING_RUNNER_COVERAGE_PREFIX.length);
  try {
    const parsed = JSON.parse(raw) as LambdaCoopAlignmentCoverageReport;
    return coverageReportToSnapshot(parsed);
  } catch {
    return undefined;
  }
};

const getAlignmentCoverageSnapshot = (
  run: SessionTypeGlueingSweepRunSnapshot,
): SessionTypeGlueingAlignmentCoverageSnapshot | undefined =>
  run.alignmentCoverage ?? getSessionTypeGlueingAlignmentCoverageFromMetadata(run.alignmentMetadata);

const getRunnerCoverageSnapshot = (
  run: SessionTypeGlueingSweepRunSnapshot,
): SessionTypeGlueingAlignmentCoverageSnapshot | undefined =>
  run.runnerCoverage ?? getSessionTypeGlueingRunnerCoverageFromMetadata(run.sessionMetadata);

export const getSessionTypeGlueingCoverageSnapshots = (
  run: SessionTypeGlueingSweepRunSnapshot,
): {
  readonly alignment?: SessionTypeGlueingAlignmentCoverageSnapshot;
  readonly runner?: SessionTypeGlueingAlignmentCoverageSnapshot;
} => {
  const alignment = getAlignmentCoverageSnapshot(run);
  const runner = getRunnerCoverageSnapshot(run);
  return {
    ...(alignment ? { alignment } : {}),
    ...(runner ? { runner } : {}),
  };
};

export type SessionTypeGlueingCoverageSource = "alignment" | "runner";

export const getSessionTypeGlueingCoverageForRun = (
  run: SessionTypeGlueingSweepRunSnapshot,
): {
  readonly coverage?: SessionTypeGlueingAlignmentCoverageSnapshot;
  readonly source?: SessionTypeGlueingCoverageSource;
} => {
  const { alignment: alignmentCoverage, runner: runnerCoverage } =
    getSessionTypeGlueingCoverageSnapshots(run);
  if (alignmentCoverage) {
    return { coverage: alignmentCoverage, source: "alignment" };
  }
  if (runnerCoverage) {
    return { coverage: runnerCoverage, source: "runner" };
  }
  return {};
};

const normalizeStringSet = (values: ReadonlyArray<string>): ReadonlyArray<string> => [...values].sort();

const normalizeKernelSkippedClauses = (
  values: ReadonlyArray<LambdaCoopKernelClauseSkip>,
): ReadonlyArray<string> => values.map((skip) => `${skip.operation}|${skip.reason}`).sort();

const normalizeCoverageOperationLink = (
  link: SessionTypeGlueingAlignmentCoverageOperationLink,
): string => {
  const residual = link.residual
    ? {
        defaulted: link.residual.defaulted ?? false,
        handler: link.residual.handlerDescription ?? null,
        coverage: link.residual.coverage ?? null,
      }
    : undefined;
  return JSON.stringify({
    operation: link.operation,
    interpreterCovered: link.interpreterCovered,
    kernelClauseKind: link.kernelClauseKind ?? null,
    kernelClauseDescription: link.kernelClauseDescription ?? null,
    kernelClauseSkipped: link.kernelClauseSkipped?.reason ?? null,
    residual,
    notes: link.notes,
  });
};

const normalizeCoverageOperationLinks = (
  links: ReadonlyArray<SessionTypeGlueingAlignmentCoverageOperationLink> | undefined,
): ReadonlyArray<string> => (!links || links.length === 0 ? [] : links.map(normalizeCoverageOperationLink).sort());

const compareOptionalNumberField = (
  label: string,
  recorded: number | undefined,
  reconstructed: number | undefined,
  issues: string[],
): void => {
  if (recorded === undefined || reconstructed === undefined) {
    return;
  }
  if (recorded !== reconstructed) {
    issues.push(`${label} mismatch between recorded (${recorded}) and reconstructed (${reconstructed}).`);
  }
};

const compareOptionalOperationSummaries = (
  recorded: SessionTypeGlueingAlignmentCoverageOperationSummary | undefined,
  reconstructed: SessionTypeGlueingAlignmentCoverageOperationSummary | undefined,
  issues: string[],
): void => {
  if (!recorded || !reconstructed) {
    return;
  }
  compareOptionalNumberField("Operation summary total", recorded.total, reconstructed.total, issues);
  compareOptionalNumberField(
    "Operation summary missing interpreter",
    recorded.missingInterpreter,
    reconstructed.missingInterpreter,
    issues,
  );
  compareOptionalNumberField(
    "Operation summary missing kernel clauses",
    recorded.missingKernelClause,
    reconstructed.missingKernelClause,
    issues,
  );
  compareOptionalNumberField(
    "Operation summary skipped kernel clauses",
    recorded.skippedKernelClauses,
    reconstructed.skippedKernelClauses,
    issues,
  );
  compareOptionalNumberField(
    "Operation summary residual defaults",
    recorded.residualDefaulted,
    reconstructed.residualDefaulted,
    issues,
  );
  compareOptionalNumberField(
    "Operation summary residual handlers",
    recorded.residualHandlers,
    reconstructed.residualHandlers,
    issues,
  );
};

export const compareSessionTypeGlueingCoverageSnapshots = (
  runnerCoverage: SessionTypeGlueingAlignmentCoverageSnapshot | undefined,
  alignmentCoverage: SessionTypeGlueingAlignmentCoverageSnapshot | undefined,
): ReadonlyArray<string> => {
  if (!runnerCoverage || !alignmentCoverage) {
    return [];
  }
  const issues: string[] = [];
  compareOptionalNumberField(
    "Interpreter expected operations",
    runnerCoverage.interpreterExpectedOperations,
    alignmentCoverage.interpreterExpectedOperations,
    issues,
  );
  compareOptionalNumberField(
    "Interpreter covered operations",
    runnerCoverage.interpreterCoveredOperations,
    alignmentCoverage.interpreterCoveredOperations,
    issues,
  );
  if (
    normalizeStringSet(runnerCoverage.interpreterMissingOperations).join("|") !==
    normalizeStringSet(alignmentCoverage.interpreterMissingOperations).join("|")
  ) {
    issues.push(
      "Interpreter missing-operation set mismatch between recorded and reconstructed coverage.",
    );
  }
  compareOptionalNumberField(
    "Kernel total clauses",
    runnerCoverage.kernelTotalClauses,
    alignmentCoverage.kernelTotalClauses,
    issues,
  );
  compareOptionalNumberField(
    "Kernel evaluated clauses",
    runnerCoverage.kernelEvaluatedClauses,
    alignmentCoverage.kernelEvaluatedClauses,
    issues,
  );
  if (
    normalizeKernelSkippedClauses(runnerCoverage.kernelSkippedClauses).join("|") !==
    normalizeKernelSkippedClauses(alignmentCoverage.kernelSkippedClauses).join("|")
  ) {
    issues.push(
      "Kernel skipped-clause set mismatch between recorded and reconstructed coverage.",
    );
  }
  const runnerOperationLinks = normalizeCoverageOperationLinks(runnerCoverage.operations);
  const alignmentOperationLinks = normalizeCoverageOperationLinks(alignmentCoverage.operations);
  if (runnerOperationLinks.join("|") !== alignmentOperationLinks.join("|")) {
    issues.push("λ₍coop₎ operation link metadata diverges between recorded and reconstructed coverage.");
  }
  compareOptionalOperationSummaries(
    runnerCoverage.operationSummary,
    alignmentCoverage.operationSummary,
    issues,
  );
  return issues;
};

export const collectSessionTypeGlueingAlignmentCoverageIssues = (
  coverage: SessionTypeGlueingAlignmentCoverageSnapshot | undefined,
): string[] => {
  if (!coverage) {
    return [];
  }
  const issues: string[] = [];
  if (coverage.interpreterMissingOperations.length > 0) {
    issues.push(`Interpreter missing operations: ${coverage.interpreterMissingOperations.join(", ")}`);
  }
  if (coverage.kernelSkippedClauses.length > 0) {
    const clauseDescriptions = coverage.kernelSkippedClauses
      .map((skip) => (skip.reason ? `${skip.operation} (${skip.reason})` : skip.operation))
      .join(", ");
    issues.push(`Kernel skipped clauses: ${clauseDescriptions}`);
  }
  const kernelMissingOperations = coverage.operations
    ?.filter((link) => !link.kernelClauseKind)
    .map((link) => link.operation);
  if (kernelMissingOperations && kernelMissingOperations.length > 0) {
    issues.push(`Kernel missing clauses: ${kernelMissingOperations.join(", ")}`);
  }
  const residualDefaultedOperations = coverage.operations
    ?.filter((link) => link.residual?.defaulted)
    .map((link) => link.operation);
  if (residualDefaultedOperations && residualDefaultedOperations.length > 0) {
    issues.push(`Residual defaulted operations: ${residualDefaultedOperations.join(", ")}`);
  }
  return issues;
};

export const formatSessionTypeGlueingAlignmentCoverageLines = (
  coverage: SessionTypeGlueingAlignmentCoverageSnapshot | undefined,
  options: { readonly indent?: string } = {},
): string[] => {
  if (!coverage) {
    return [];
  }
  const indent = options.indent ?? "";
  const lines: string[] = [];
  lines.push(
    `${indent}λ₍coop₎ coverage interpreter expected=${
      coverage.interpreterExpectedOperations ?? "unknown"
    } covered=${coverage.interpreterCoveredOperations ?? "unknown"}`,
  );
  if (coverage.interpreterMissingOperations.length > 0) {
    lines.push(
      `${indent}λ₍coop₎ coverage missing interpreter operations: ${coverage.interpreterMissingOperations.join(", ")}`,
    );
  }
  lines.push(
    `${indent}λ₍coop₎ coverage kernel total=${coverage.kernelTotalClauses ?? "unknown"}` +
      ` evaluated=${coverage.kernelEvaluatedClauses ?? "unknown"}`,
  );
  if (coverage.kernelSkippedClauses.length > 0) {
    const clauseDescriptions = coverage.kernelSkippedClauses
      .map((skip) => (skip.reason ? `${skip.operation} (${skip.reason})` : skip.operation))
      .join(", ");
    lines.push(`${indent}λ₍coop₎ coverage skipped kernel clauses: ${clauseDescriptions}`);
  }
  if (coverage.operationSummary) {
    lines.push(
      `${indent}λ₍coop₎ coverage operations total=${coverage.operationSummary.total}` +
        ` missingInterpreter=${coverage.operationSummary.missingInterpreter}` +
        ` missingKernel=${coverage.operationSummary.missingKernelClause}` +
        ` skipped=${coverage.operationSummary.skippedKernelClauses}`,
    );
    if (coverage.operationSummary.residualDefaulted > 0) {
      lines.push(
        `${indent}λ₍coop₎ coverage residual defaulted operations=${coverage.operationSummary.residualDefaulted}`,
      );
    }
    if (coverage.operationSummary.residualHandlers > 0) {
      lines.push(
        `${indent}λ₍coop₎ coverage residual handlers=${coverage.operationSummary.residualHandlers}`,
      );
    }
  }
  if (coverage.operations && coverage.operations.length > 0) {
    coverage.operations.forEach((link) => {
      const parts = [
        `${indent}λ₍coop₎ coverage op ${link.operation}:`,
        `interpreter=${link.interpreterCovered ? "covered" : "missing"}`,
        `kernel=${link.kernelClauseKind ?? "missing"}`,
      ];
      if (link.kernelClauseSkipped) {
        parts.push(`skipped=${link.kernelClauseSkipped.reason}`);
      }
      if (link.kernelClauseDescription) {
        parts.push(`desc=${link.kernelClauseDescription}`);
      }
      if (link.residual?.handlerDescription) {
        parts.push(`residualHandler=${link.residual.handlerDescription}`);
      }
      if (link.residual?.defaulted) {
        parts.push("residual=defaulted");
      }
      lines.push(parts.join(" "));
      if (link.residual?.coverage) {
        lines.push(
          `${indent}  residual coverage handled=${link.residual.coverage.handled}` +
            ` unhandled=${link.residual.coverage.unhandled}` +
            ` sampleLimit=${link.residual.coverage.sampleLimit}`,
        );
      }
      if (link.notes.length > 0) {
        link.notes.forEach((note) => lines.push(`${indent}  note: ${note}`));
      }
    });
  }
  return lines;
};

export const collectSessionTypeGlueingSweepRunSnapshot = (
  config: SessionTypeGlueingSweepConfig,
  metadata: Record<string, unknown> | undefined,
  exampleArgs?: ReadonlyArray<RunnableExampleFlag>,
): SessionTypeGlueingSweepRunSnapshot => {
  const sessionMetadata = asStringArray(metadata?.["sessionMetadata"]);
  const glueingMetadata = asStringArray(metadata?.["glueingMetadata"]);
  const alignmentMetadata = asStringArray(metadata?.["alignmentMetadata"]);
  const alignmentNotes = asStringArray(metadata?.["alignmentNotes"]);
  const runnerHolds = parseBooleanMetadata(sessionMetadata, "sessionType.runner.holds=");
  const runnerMismatches = parseNumberMetadata(sessionMetadata, "sessionType.runner.mismatches=");
  const alignmentCoverage = getSessionTypeGlueingAlignmentCoverageFromMetadata(alignmentMetadata);
  const runnerCoverage = getSessionTypeGlueingRunnerCoverageFromMetadata(sessionMetadata);
  return {
    config,
    ...(runnerHolds !== undefined ? { runnerHolds } : {}),
    ...(runnerMismatches !== undefined ? { runnerMismatches } : {}),
    sessionMetadata,
    glueingMetadata,
    alignmentMetadata,
    alignmentNotes,
    ...(alignmentCoverage ? { alignmentCoverage } : {}),
    ...(runnerCoverage ? { runnerCoverage } : {}),
    ...(exampleArgs && exampleArgs.length > 0 ? { exampleArgs } : {}),
  };
};

export const buildSessionTypeGlueingSweepRecord = (
  runs: ReadonlyArray<SessionTypeGlueingSweepRunSnapshot>,
  options: {
    recordedSweepFile?: string;
    recordedAt?: string;
    generatedManifests?: ReadonlyArray<SessionTypeGlueingGeneratedManifestMetadata>;
    suggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingSuggestedManifestWriteMetadata>;
    blockedSuggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingBlockedSuggestedManifestWriteMetadata>;
    blockedQueuedManifestInputs?: ReadonlyArray<string>;
    blockedManifestInputs?: ReadonlyArray<string>;
    blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
    blockedManifestPlanInputs?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanInputMetadata>;
    manifestQueue?: SessionTypeGlueingManifestQueueSummary;
    sourceCoverage?: SessionTypeGlueingSweepSourceCoverage;
  } = {},
): SessionTypeGlueingSweepRecord => {
  const manifestQueue = normalizeManifestQueueSummary(options.manifestQueue);
  const sourceCoverage = normalizeSourceCoverage(options.sourceCoverage);
  return {
    schemaVersion: SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION,
    recordedAt: options.recordedAt ?? new Date().toISOString(),
    ...(options.recordedSweepFile ? { recordedSweepFile: options.recordedSweepFile } : {}),
    runs,
    ...(options.generatedManifests && options.generatedManifests.length > 0
      ? { generatedManifests: options.generatedManifests }
      : {}),
    ...(options.suggestedManifestWrites && options.suggestedManifestWrites.length > 0
      ? { suggestedManifestWrites: options.suggestedManifestWrites }
      : {}),
    ...(options.blockedSuggestedManifestWrites && options.blockedSuggestedManifestWrites.length > 0
      ? { blockedSuggestedManifestWrites: options.blockedSuggestedManifestWrites }
      : {}),
    ...(options.blockedQueuedManifestInputs && options.blockedQueuedManifestInputs.length > 0
      ? { blockedQueuedManifestInputs: options.blockedQueuedManifestInputs }
      : {}),
    ...(options.blockedManifestInputs && options.blockedManifestInputs.length > 0
      ? { blockedManifestInputs: options.blockedManifestInputs }
      : {}),
    ...(options.blockedManifestPlans && options.blockedManifestPlans.length > 0
      ? { blockedManifestPlans: options.blockedManifestPlans }
      : {}),
    ...(options.blockedManifestPlanInputs && options.blockedManifestPlanInputs.length > 0
      ? { blockedManifestPlanInputs: options.blockedManifestPlanInputs }
      : {}),
    ...(manifestQueue ? { manifestQueue } : {}),
    ...(sourceCoverage ? { sourceCoverage } : {}),
  };
};

export const writeSessionTypeGlueingSweepRecord = (
  path: string,
  runs: ReadonlyArray<SessionTypeGlueingSweepRunSnapshot>,
  options: {
    recordedSweepFile?: string;
    recordedAt?: string;
    generatedManifests?: ReadonlyArray<SessionTypeGlueingGeneratedManifestMetadata>;
    suggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingSuggestedManifestWriteMetadata>;
    blockedSuggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingBlockedSuggestedManifestWriteMetadata>;
    blockedQueuedManifestInputs?: ReadonlyArray<string>;
    blockedManifestInputs?: ReadonlyArray<string>;
    blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
    blockedManifestPlanInputs?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanInputMetadata>;
    manifestQueue?: SessionTypeGlueingManifestQueueSummary;
    sourceCoverage?: SessionTypeGlueingSweepSourceCoverage;
  } = {},
): { path: string; record: SessionTypeGlueingSweepRecord } => {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  const record = buildSessionTypeGlueingSweepRecord(runs, {
    ...options,
    recordedSweepFile: options.recordedSweepFile ?? resolved,
  });
  writeFileSync(resolved, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return { path: resolved, record };
};

export const readSessionTypeGlueingSweepRecord = (path: string): SessionTypeGlueingSweepRecord => {
  const resolved = resolve(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolved, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse sweep record '${resolved}': ${String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Sweep record '${resolved}' must be an object.`);
  }
  const record = parsed as Partial<SessionTypeGlueingSweepRecord>;
  if (record.schemaVersion !== SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION) {
    throw new Error(
      `Sweep record '${resolved}' has unsupported schema version '${record.schemaVersion}'. Expected '${SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION}'.`,
    );
  }
  if (!Array.isArray(record.runs)) {
    throw new Error(`Sweep record '${resolved}' must include a 'runs' array.`);
  }
  const manifestQueue = asManifestQueueSummary(record.manifestQueue);
  const sourceCoverage = asSourceCoverage(record.sourceCoverage);
  return {
    schemaVersion: SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION,
    recordedAt: record.recordedAt ?? "",
    ...(record.recordedSweepFile ? { recordedSweepFile: record.recordedSweepFile } : {}),
    runs: record.runs.map((run, index) => {
      if (!run || typeof run !== "object" || Array.isArray(run)) {
        throw new Error(`Sweep record '${resolved}' has a non-object run entry at index ${index}.`);
      }
      const snapshot = run as Partial<SessionTypeGlueingSweepRunSnapshot>;
      if (!snapshot.config) {
        throw new Error(`Sweep record '${resolved}' has a run entry without a config at index ${index}.`);
      }
      const sessionMetadata = asStringArray(snapshot.sessionMetadata);
      const glueingMetadata = asStringArray(snapshot.glueingMetadata);
      const alignmentMetadata = asStringArray(snapshot.alignmentMetadata);
      const alignmentNotes = asStringArray(snapshot.alignmentNotes);
      const alignmentCoverage = getSessionTypeGlueingAlignmentCoverageFromMetadata(alignmentMetadata);
      const runnerCoverage = getSessionTypeGlueingRunnerCoverageFromMetadata(sessionMetadata);
      return {
        config: snapshot.config,
        sessionMetadata,
        glueingMetadata,
        alignmentMetadata,
        alignmentNotes,
        ...(snapshot.runnerHolds !== undefined ? { runnerHolds: snapshot.runnerHolds } : {}),
        ...(snapshot.runnerMismatches !== undefined ? { runnerMismatches: snapshot.runnerMismatches } : {}),
        ...(alignmentCoverage ? { alignmentCoverage } : {}),
        ...(runnerCoverage ? { runnerCoverage } : {}),
        ...(snapshot.exampleArgs ? { exampleArgs: snapshot.exampleArgs } : {}),
      } satisfies SessionTypeGlueingSweepRunSnapshot;
    }),
    ...(record.generatedManifests && record.generatedManifests.length > 0
      ? { generatedManifests: asGeneratedManifestMetadataArray(record.generatedManifests) }
      : {}),
    ...(record.suggestedManifestWrites && record.suggestedManifestWrites.length > 0
      ? { suggestedManifestWrites: asSuggestedManifestWriteArray(record.suggestedManifestWrites) }
      : {}),
    ...(record.blockedSuggestedManifestWrites && record.blockedSuggestedManifestWrites.length > 0
      ? { blockedSuggestedManifestWrites: asBlockedSuggestedManifestWriteArray(record.blockedSuggestedManifestWrites) }
      : {}),
    ...(record.blockedQueuedManifestInputs && record.blockedQueuedManifestInputs.length > 0
      ? { blockedQueuedManifestInputs: asStringArray(record.blockedQueuedManifestInputs) }
      : {}),
    ...(record.blockedManifestInputs && record.blockedManifestInputs.length > 0
      ? { blockedManifestInputs: asStringArray(record.blockedManifestInputs) }
      : {}),
    ...(record.blockedManifestPlans && record.blockedManifestPlans.length > 0
      ? { blockedManifestPlans: asBlockedManifestPlanArray(record.blockedManifestPlans) }
      : {}),
    ...(record.blockedManifestPlanInputs && record.blockedManifestPlanInputs.length > 0
      ? { blockedManifestPlanInputs: asBlockedManifestPlanInputArray(record.blockedManifestPlanInputs) }
      : {}),
    ...(manifestQueue ? { manifestQueue } : {}),
    ...(sourceCoverage ? { sourceCoverage } : {}),
  } satisfies SessionTypeGlueingSweepRecord;
};

export interface SessionTypeGlueingDashboardManifestSource {
  readonly path?: string;
  readonly entryCount?: number;
  readonly replayedAt?: string;
}

export interface SessionTypeGlueingDashboardEntry {
  readonly label: string;
  readonly sessionTypeLiteral: string;
  readonly glueingSpan: string;
  readonly assignments: string;
  readonly runnerHolds?: boolean;
  readonly runnerMismatches?: number;
  readonly alignmentStatus?: string;
  readonly manifestSource?: SessionTypeGlueingDashboardManifestSource;
  readonly alignmentCoverage?: SessionTypeGlueingAlignmentCoverageSnapshot;
  readonly alignmentCoverageIssues?: ReadonlyArray<string>;
  readonly coverageComparisonIssues?: ReadonlyArray<string>;
  readonly metadataCounts: {
    readonly session: number;
    readonly glueing: number;
    readonly alignment: number;
    readonly notes: number;
  };
  readonly issues: ReadonlyArray<string>;
}

export interface SessionTypeGlueingDashboardSummary {
  readonly schemaVersion: typeof SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION;
  readonly recordedAt?: string;
  readonly recordedSweepFile?: string;
  readonly totalRuns: number;
  readonly runner: {
    readonly successes: number;
    readonly failures: number;
    readonly unknown: number;
    readonly mismatches: number;
  };
  readonly alignment: {
    readonly aligned: number;
    readonly issues: number;
    readonly unknown: number;
  };
  readonly entries: ReadonlyArray<SessionTypeGlueingDashboardEntry>;
  readonly generatedManifests?: ReadonlyArray<SessionTypeGlueingGeneratedManifestMetadata>;
  readonly suggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingSuggestedManifestWriteMetadata>;
  readonly blockedSuggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingBlockedSuggestedManifestWriteMetadata>;
  readonly blockedQueuedManifestInputs?: ReadonlyArray<string>;
  readonly blockedManifestInputs?: ReadonlyArray<string>;
  readonly blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
  readonly blockedManifestPlanInputs?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanInputMetadata>;
  readonly manifestQueue?: SessionTypeGlueingManifestQueueSummary;
  readonly manifestQueueIssues?: ReadonlyArray<string>;
  readonly manifestQueueWarnings?: ReadonlyArray<string>;
  readonly sourceCoverage?: SessionTypeGlueingSweepSourceCoverage;
  readonly sourceCoverageTotals: SessionTypeGlueingSourceCoverageTotals;
  readonly sourceCoverageIssues?: ReadonlyArray<string>;
  readonly alignmentCoverageIssues?: ReadonlyArray<string>;
}

export interface SessionTypeGlueingDashboardFilterOptions {
  readonly requireIssues?: boolean;
  readonly requireRunnerIssues?: boolean;
  readonly requireAlignmentIssues?: boolean;
}

const entryHasRunnerIssue = (entry: SessionTypeGlueingDashboardEntry): boolean =>
  entry.runnerHolds === false || !!(entry.runnerMismatches && entry.runnerMismatches > 0);

const entryHasAlignmentIssue = (entry: SessionTypeGlueingDashboardEntry): boolean =>
  typeof entry.alignmentStatus === "string" && entry.alignmentStatus !== "aligned";

export const sessionTypeGlueingDashboardEntryMatchesFilter = (
  entry: SessionTypeGlueingDashboardEntry,
  filter?: SessionTypeGlueingDashboardFilterOptions,
): boolean => {
  if (!filter) {
    return true;
  }
  if (filter.requireIssues && entry.issues.length === 0) {
    return false;
  }
  if (filter.requireRunnerIssues && !entryHasRunnerIssue(entry)) {
    return false;
  }
  if (filter.requireAlignmentIssues && !entryHasAlignmentIssue(entry)) {
    return false;
  }
  return true;
};

export const filterSessionTypeGlueingDashboardEntries = (
  entries: ReadonlyArray<SessionTypeGlueingDashboardEntry>,
  filter?: SessionTypeGlueingDashboardFilterOptions,
): SessionTypeGlueingDashboardEntry[] =>
  entries.filter((entry) => sessionTypeGlueingDashboardEntryMatchesFilter(entry, filter));

export interface SessionTypeGlueingSourceCoverageTotals {
  readonly manifestInputs: number;
  readonly blockedPlans: number;
  readonly total: number;
}

export const summarizeSessionTypeGlueingSourceCoverage = (
  coverage?: SessionTypeGlueingSweepSourceCoverage,
): SessionTypeGlueingSourceCoverageTotals => {
  const manifestInputs = coverage?.manifestInputs ?? 0;
  const blockedPlans = coverage?.blockedPlans ?? 0;
  return {
    manifestInputs,
    blockedPlans,
    total: manifestInputs + blockedPlans,
  };
};

export interface SessionTypeGlueingSourceCoverageFormatOptions {
  readonly label?: string;
  readonly indent?: string;
}

export const formatSessionTypeGlueingSourceCoverageLines = (
  coverage?: SessionTypeGlueingSweepSourceCoverage,
  options?: SessionTypeGlueingSourceCoverageFormatOptions,
): ReadonlyArray<string> => {
  const totals = summarizeSessionTypeGlueingSourceCoverage(coverage);
  const indent = options?.indent ?? "";
  const label = options?.label ?? "Source coverage";
  const lines = [
    `${indent}${label} manifest-input=${totals.manifestInputs} blocked-plan=${totals.blockedPlans} total=${totals.total}`,
  ];
  if (totals.total === 0) {
    lines.push(`${indent}  No manifest-input or blocked-plan sweeps were recorded.`);
  }
  return lines;
};

export interface SessionTypeGlueingSourceCoverageFilterOptions {
  readonly requireManifestInputs?: boolean;
  readonly requireBlockedPlans?: boolean;
  readonly requireAny?: boolean;
}

export const sessionTypeGlueingSourceCoverageMatchesFilter = (
  coverage: SessionTypeGlueingSweepSourceCoverage | undefined,
  filter?: SessionTypeGlueingSourceCoverageFilterOptions,
): boolean => {
  if (!filter) {
    return true;
  }
  const totals = summarizeSessionTypeGlueingSourceCoverage(coverage);
  if (filter.requireManifestInputs && totals.manifestInputs === 0) {
    return false;
  }
  if (filter.requireBlockedPlans && totals.blockedPlans === 0) {
    return false;
  }
  if (filter.requireAny && totals.total === 0) {
    return false;
  }
  return true;
};

export const collectSessionTypeGlueingSourceCoverageIssues = (
  coverage: SessionTypeGlueingSweepSourceCoverage | undefined,
  filter?: SessionTypeGlueingSourceCoverageFilterOptions,
): string[] => {
  if (!filter) {
    return [];
  }
  const issues: string[] = [];
  const totals = summarizeSessionTypeGlueingSourceCoverage(coverage);
  if (filter.requireManifestInputs && totals.manifestInputs === 0) {
    issues.push("No manifest-input coverage was recorded in this sweep.");
  }
  if (filter.requireBlockedPlans && totals.blockedPlans === 0) {
    issues.push("No blocked-plan coverage was recorded in this sweep.");
  }
  if (filter.requireAny && totals.total === 0) {
    issues.push("No manifest-input or blocked-plan sources were exercised in this sweep.");
  }
  return issues;
};

export const summarizeSessionTypeGlueingSweepRecord = (
  record: SessionTypeGlueingSweepRecord,
): SessionTypeGlueingDashboardSummary => {
  let runnerSuccesses = 0;
  let runnerFailures = 0;
  let runnerUnknown = 0;
  let runnerMismatches = 0;
  let alignmentAligned = 0;
  let alignmentIssues = 0;
  let alignmentUnknown = 0;

  const sourceCoverageTotals = summarizeSessionTypeGlueingSourceCoverage(record.sourceCoverage);
  const sourceCoverageIssues = collectSessionTypeGlueingSourceCoverageIssues(record.sourceCoverage, {
    requireManifestInputs: true,
    requireBlockedPlans: true,
  });
  const alignmentCoverageIssues: string[] = [];
  const entries = record.runs.map((run) => {
    if (run.runnerHolds === true) {
      runnerSuccesses += 1;
    } else if (run.runnerHolds === false) {
      runnerFailures += 1;
    } else {
      runnerUnknown += 1;
    }
    if (typeof run.runnerMismatches === "number") {
      runnerMismatches += run.runnerMismatches;
    }
    const alignmentStatus = getSessionTypeGlueingAlignmentStatus(run.alignmentMetadata);
    if (alignmentStatus === "aligned") {
      alignmentAligned += 1;
    } else if (alignmentStatus === undefined) {
      alignmentUnknown += 1;
    } else {
      alignmentIssues += 1;
    }
    const coverageSnapshots = getSessionTypeGlueingCoverageSnapshots(run);
    const { coverage, source: coverageSource } = getSessionTypeGlueingCoverageForRun(run);
    const manifestSource = getManifestSourceFromMetadata(run.sessionMetadata);
    const issues: string[] = [];
    if (run.runnerHolds === false) {
      issues.push("runner.holds=false");
    }
    if (run.runnerMismatches && run.runnerMismatches > 0) {
      issues.push(`runner.mismatches=${run.runnerMismatches}`);
    }
    if (alignmentStatus && alignmentStatus !== "aligned") {
      issues.push(`alignment.status=${alignmentStatus}`);
    }
    const coverageIssues = collectSessionTypeGlueingAlignmentCoverageIssues(coverage);
    if (coverageIssues.length > 0) {
      coverageIssues.forEach((issue) => {
        alignmentCoverageIssues.push(`${run.config.label}: ${issue}`);
        issues.push(`${coverageSource === "runner" ? "runner" : "alignment"}.coverage:${issue}`);
      });
    }
    const coverageComparisonIssues = compareSessionTypeGlueingCoverageSnapshots(
      coverageSnapshots.runner,
      coverageSnapshots.alignment,
    );
    if (coverageComparisonIssues.length > 0) {
      coverageComparisonIssues.forEach((issue) => {
        const driftIssue = `Coverage drift: ${issue}`;
        alignmentCoverageIssues.push(`${run.config.label}: ${driftIssue}`);
        issues.push(`coverage.drift:${issue}`);
      });
    }
    return {
      label: run.config.label,
      sessionTypeLiteral: run.config.sessionTypeLiteral,
      glueingSpan: run.config.glueingSpan,
      assignments: describeSessionTypeGlueingAssignments(run.config.assignments),
      ...(run.runnerHolds !== undefined ? { runnerHolds: run.runnerHolds } : {}),
      ...(run.runnerMismatches !== undefined ? { runnerMismatches: run.runnerMismatches } : {}),
      ...(alignmentStatus ? { alignmentStatus } : {}),
      metadataCounts: {
        session: run.sessionMetadata.length,
        glueing: run.glueingMetadata.length,
        alignment: run.alignmentMetadata.length,
        notes: run.alignmentNotes.length,
      },
      ...(coverage ? { alignmentCoverage: coverage } : {}),
      ...(coverageIssues.length > 0 ? { alignmentCoverageIssues: coverageIssues } : {}),
      ...(coverageComparisonIssues.length > 0
        ? { coverageComparisonIssues }
        : {}),
      ...(manifestSource ? { manifestSource } : {}),
      issues,
    } satisfies SessionTypeGlueingDashboardEntry;
  });

  return {
    schemaVersion: SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION,
    ...(record.recordedAt ? { recordedAt: record.recordedAt } : {}),
    ...(record.recordedSweepFile ? { recordedSweepFile: record.recordedSweepFile } : {}),
    totalRuns: record.runs.length,
    runner: {
      successes: runnerSuccesses,
      failures: runnerFailures,
      unknown: runnerUnknown,
      mismatches: runnerMismatches,
    },
    alignment: {
      aligned: alignmentAligned,
      issues: alignmentIssues,
      unknown: alignmentUnknown,
    },
    entries,
    ...(record.generatedManifests ? { generatedManifests: record.generatedManifests } : {}),
    ...(record.suggestedManifestWrites ? { suggestedManifestWrites: record.suggestedManifestWrites } : {}),
    ...(record.blockedSuggestedManifestWrites
      ? { blockedSuggestedManifestWrites: record.blockedSuggestedManifestWrites }
      : {}),
    ...(record.blockedQueuedManifestInputs
      ? { blockedQueuedManifestInputs: record.blockedQueuedManifestInputs }
      : {}),
    ...(record.blockedManifestInputs ? { blockedManifestInputs: record.blockedManifestInputs } : {}),
    ...(record.blockedManifestPlans ? { blockedManifestPlans: record.blockedManifestPlans } : {}),
    ...(record.blockedManifestPlanInputs
      ? { blockedManifestPlanInputs: record.blockedManifestPlanInputs }
      : {}),
    ...(record.manifestQueue ? { manifestQueue: record.manifestQueue } : {}),
    ...(record.manifestQueue?.testIssues && record.manifestQueue.testIssues.length > 0
      ? { manifestQueueIssues: record.manifestQueue.testIssues }
      : {}),
    ...(record.manifestQueue?.testWarnings && record.manifestQueue.testWarnings.length > 0
      ? { manifestQueueWarnings: record.manifestQueue.testWarnings }
      : {}),
    ...(record.sourceCoverage ? { sourceCoverage: record.sourceCoverage } : {}),
    sourceCoverageTotals,
    ...(sourceCoverageIssues.length > 0 ? { sourceCoverageIssues } : {}),
    ...(alignmentCoverageIssues.length > 0 ? { alignmentCoverageIssues } : {}),
  };
};
