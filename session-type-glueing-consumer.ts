import { parseSessionType } from "./session-type";
import {
  DEFAULT_SESSION_TYPE_CHANNEL,
  DEFAULT_SESSION_TYPE_OBJECT,
} from "./session-type-glueing-cli";
import {
  makeExample8GlueingBridge,
  normalizeExample8GlueingSpanVariant,
  type Example8GlueingBridgeOptions,
} from "./session-type-glueing.examples";
import { buildGlueingExampleKernelSpec, buildGlueingExampleUserSpec } from "./glueing-supervised-stack.examples";
import {
  makeSessionTypeGlueingSupervisedStack,
  type SessionTypeGlueingSupervisedStackOptions,
} from "./session-type-supervised-stack";
import type { LambdaCoopSupervisedStackRunOptions } from "./lambda-coop-supervised-stack";
import type { SessionTypeRunnerEvaluationReport } from "./session-type-runner";
import {
  readSessionTypeGlueingSweepRecord,
  SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION,
  getManifestSourceFromMetadata,
  getSessionTypeGlueingCoverageForRun,
  getSessionTypeGlueingCoverageSnapshots,
  collectSessionTypeGlueingAlignmentCoverageIssues,
  compareSessionTypeGlueingCoverageSnapshots,
  type SessionTypeGlueingSweepRecord,
  type SessionTypeGlueingSweepRunSnapshot,
  type SessionTypeGlueingDashboardManifestSource,
  type SessionTypeGlueingSuggestedManifestWriteMetadata,
  type SessionTypeGlueingBlockedSuggestedManifestWriteMetadata,
  type SessionTypeGlueingBlockedManifestPlanEntry,
  type SessionTypeGlueingBlockedManifestPlanInputMetadata,
  type SessionTypeGlueingBlockedManifestPlanQueueSummary,
  type SessionTypeGlueingManifestQueueSummary,
  type SessionTypeGlueingManifestQueueCoverageGateSummary,
  type SessionTypeGlueingSweepSourceCoverage,
  summarizeSessionTypeGlueingSourceCoverage,
  summarizeSessionTypeGlueingBlockedManifestPlanQueue,
  collectSessionTypeGlueingSourceCoverageIssues,
  type SessionTypeGlueingSourceCoverageTotals,
} from "./session-type-glueing-dashboard";
import {
  collectSessionTypeManifestQueueCoverageGateMetadataEntriesFromSessionMetadata,
  extractSessionTypeManifestQueueCoverageGateQueueSnapshotPathsFromMetadataEntries,
  collectSessionTypeManifestQueueTestCoverageGateIssues,
  collectSessionTypeManifestQueueTestCoverageGateIssuesFromSessionMetadata,
  SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX,
  type SessionTypeGlueingManifestQueueTestStatus,
  type SessionTypeGlueingManifestQueueQueueSnapshotPaths,
} from "./session-type-glueing-manifest-queue-test-status";
import type { SessionTypeGlueingSweepConfig } from "./session-type-glueing-sweep";
import type { TwoObject } from "./two-object-cat";
import { collectSessionTypeGlueingBlockedManifestPlanQueueIssues } from "./session-type-glueing-blocked-manifest-plan-queue";

const DEFAULT_RUNNER_SAMPLE_LIMIT = 4;
const DEFAULT_STACK_SAMPLE_LIMIT = 6;
const DEFAULT_ALIGNMENT_SAMPLE_LIMIT = 4;
const DEFAULT_STACK_RUN: LambdaCoopSupervisedStackRunOptions = {
  operations: ["getenv"],
  stepLimit: 24,
};

const summarizeRunnerEvaluation = (report: SessionTypeRunnerEvaluationReport<unknown>): number => {
  let mismatches = 0;
  for (const entry of report.entries) {
    mismatches += entry.mismatches;
  }
  return mismatches;
};

const buildAssignments = (
  config: SessionTypeGlueingSweepConfig,
  kernelObjects: readonly TwoObject[],
): Map<string, TwoObject> => {
  const availableObjects = new Set(kernelObjects);
  const result = new Map<string, TwoObject>();
  const entries = Object.entries(config.assignments);
  if (entries.length === 0) {
    const fallback = DEFAULT_SESSION_TYPE_OBJECT as TwoObject;
    if (!availableObjects.has(fallback)) {
      throw new Error(`Default kernel object '${fallback}' is not available in the Example 8 kernel.`);
    }
    result.set(DEFAULT_SESSION_TYPE_CHANNEL, fallback);
    return result;
  }
  for (const [channel, object] of entries) {
    const trimmedChannel = channel.trim();
    if (!trimmedChannel) {
      throw new Error(`Sweep config '${config.label}' has an empty channel name.`);
    }
    const trimmedObject = object.trim() as TwoObject;
    if (!availableObjects.has(trimmedObject)) {
      throw new Error(
        `Sweep config '${config.label}' assigns unknown kernel object '${trimmedObject}' to channel '${trimmedChannel}'.`,
      );
    }
    result.set(trimmedChannel, trimmedObject);
  }
  return result;
};

const buildSessionOptions = (
  options?: SessionTypeGlueingConsumerOptions,
): SessionTypeGlueingSupervisedStackOptions<TwoObject> => ({
  session: {
    runnerEvaluation: { sampleLimit: options?.runnerSampleLimit ?? DEFAULT_RUNNER_SAMPLE_LIMIT },
    stack: { sampleLimit: options?.stackSampleLimit ?? DEFAULT_STACK_SAMPLE_LIMIT },
    stackRun: options?.stackRun ?? DEFAULT_STACK_RUN,
  },
  alignment: {
    sampleLimit: options?.alignmentSampleLimit ?? DEFAULT_ALIGNMENT_SAMPLE_LIMIT,
  },
});

const replaySessionTypeGlueingConfig = (
  config: SessionTypeGlueingSweepConfig,
  options?: SessionTypeGlueingConsumerOptions,
): SessionTypeGlueingConsumerRunResult => {
  const spanVariant = normalizeExample8GlueingSpanVariant(config.glueingSpan);
  const { interaction, bridge } = makeExample8GlueingBridge({
    spanVariant,
    ...(options?.glueing ?? {}),
  });
  const kernelObjects = interaction.law.kernel.base.objects as readonly TwoObject[];
  const assignments = buildAssignments(config, kernelObjects);
  const sessionType = parseSessionType(config.sessionTypeLiteral);
  const kernelSpec = buildGlueingExampleKernelSpec(kernelObjects);
  const userSpec = buildGlueingExampleUserSpec<TwoObject>();
  const sessionStack = makeSessionTypeGlueingSupervisedStack(
    bridge,
    interaction,
    sessionType,
    assignments,
    kernelSpec,
    userSpec,
    buildSessionOptions(options),
  );
  const runnerMismatches = summarizeRunnerEvaluation(sessionStack.session.runnerEvaluation);
  return {
    config,
    sessionMetadata: sessionStack.session.metadata ?? sessionStack.metadata,
    glueingMetadata: sessionStack.glueingBridge.metadata,
    alignmentMetadata: sessionStack.alignment.alignmentSummary.metadata,
    alignmentNotes: sessionStack.alignment.alignmentSummary.notes,
    runnerHolds: sessionStack.session.runnerEvaluation.holds,
    runnerMismatches,
  };
};

const diffStringArrays = (
  recorded: ReadonlyArray<string>,
  recomputed: ReadonlyArray<string>,
): MetadataDiff => {
  const missing: string[] = [];
  const unexpected: string[] = [];
  const recordedCounts = new Map<string, number>();
  const recomputedCounts = new Map<string, number>();
  for (const value of recorded) {
    recordedCounts.set(value, (recordedCounts.get(value) ?? 0) + 1);
  }
  for (const value of recomputed) {
    recomputedCounts.set(value, (recomputedCounts.get(value) ?? 0) + 1);
  }
  for (const [value, count] of recordedCounts.entries()) {
    const current = recomputedCounts.get(value) ?? 0;
    for (let index = current; index < count; index += 1) {
      missing.push(value);
    }
  }
  for (const [value, count] of recomputedCounts.entries()) {
    const recordedCount = recordedCounts.get(value) ?? 0;
    for (let index = recordedCount; index < count; index += 1) {
      unexpected.push(value);
    }
  }
  return { missing, unexpected };
};

const hasMetadataDiff = (diff: MetadataDiff): boolean => diff.missing.length > 0 || diff.unexpected.length > 0;

export interface SessionTypeGlueingConsumerOptions {
  readonly runnerSampleLimit?: number;
  readonly stackSampleLimit?: number;
  readonly alignmentSampleLimit?: number;
  readonly stackRun?: LambdaCoopSupervisedStackRunOptions;
  readonly glueing?: Example8GlueingBridgeOptions;
}

export interface SessionTypeGlueingConsumerRunResult {
  readonly config: SessionTypeGlueingSweepConfig;
  readonly sessionMetadata: ReadonlyArray<string>;
  readonly glueingMetadata: ReadonlyArray<string>;
  readonly alignmentMetadata: ReadonlyArray<string>;
  readonly alignmentNotes: ReadonlyArray<string>;
  readonly runnerHolds: boolean;
  readonly runnerMismatches: number;
}

export interface MetadataDiff {
  readonly missing: ReadonlyArray<string>;
  readonly unexpected: ReadonlyArray<string>;
}

export interface SessionTypeGlueingConsumerDiffEntry {
  readonly config: SessionTypeGlueingSweepConfig;
  readonly recorded: SessionTypeGlueingSweepRunSnapshot;
  readonly recomputed: SessionTypeGlueingConsumerRunResult;
  readonly alignmentMetadataDiff: MetadataDiff;
  readonly alignmentNotesDiff: MetadataDiff;
  readonly manifestSource?: SessionTypeGlueingDashboardManifestSource;
  readonly alignmentCoverageIssues?: ReadonlyArray<string>;
  readonly coverageComparisonIssues?: ReadonlyArray<string>;
  readonly runnerDiff?: {
    readonly recordedHolds?: boolean;
    readonly recordedMismatches?: number;
    readonly recomputedHolds: boolean;
    readonly recomputedMismatches: number;
  };
  readonly issues: ReadonlyArray<string>;
}

export interface SessionTypeGlueingConsumerManifestSourceTotalsEntry {
  readonly source: SessionTypeGlueingDashboardManifestSource;
  readonly totalRuns: number;
  readonly mismatchedRuns: number;
}

export interface SessionTypeGlueingConsumerDiffSummary {
  readonly schemaVersion: typeof SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION;
  readonly recordedAt?: string;
  readonly recordedSweepFile?: string;
  readonly totalRuns: number;
  readonly mismatchedRuns: number;
  readonly entries: ReadonlyArray<SessionTypeGlueingConsumerDiffEntry>;
  readonly alignmentCoverageIssues?: ReadonlyArray<string>;
  readonly manifestSourceTotals?: ReadonlyArray<SessionTypeGlueingConsumerManifestSourceTotalsEntry>;
  readonly suggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingSuggestedManifestWriteMetadata>;
  readonly blockedSuggestedManifestWrites?: ReadonlyArray<SessionTypeGlueingBlockedSuggestedManifestWriteMetadata>;
  readonly blockedQueuedManifestInputs?: ReadonlyArray<string>;
  readonly blockedManifestInputs?: ReadonlyArray<string>;
  readonly blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
  readonly blockedManifestPlanInputs?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanInputMetadata>;
  readonly blockedManifestPlanQueue?: SessionTypeGlueingBlockedManifestPlanQueueSummary;
  readonly blockedManifestPlanQueueIssues?: ReadonlyArray<string>;
  readonly manifestQueue?: SessionTypeGlueingManifestQueueSummary;
  readonly manifestQueueIssues?: ReadonlyArray<string>;
  readonly manifestQueueWarnings?: ReadonlyArray<string>;
  readonly manifestQueueCoverageGate?: SessionTypeGlueingManifestQueueCoverageGateSummary;
  readonly manifestQueueCoverageGateQueueSnapshotPaths?: SessionTypeGlueingManifestQueueQueueSnapshotPaths;
  readonly manifestQueueCoverageGateQueueSnapshotPathsInferred?: boolean;
  readonly manifestQueueCoverageGateIssues?: ReadonlyArray<string>;
  readonly manifestQueueCoverageGateWarnings?: ReadonlyArray<string>;
  readonly manifestQueueCoverageGateBlockedManifestPlanQueueIssues?: ReadonlyArray<string>;
  readonly manifestQueueCoverageGateRollup?: SessionTypeGlueingManifestQueueCoverageGateSummary;
  readonly sourceCoverage?: SessionTypeGlueingSweepSourceCoverage;
  readonly sourceCoverageTotals: SessionTypeGlueingSourceCoverageTotals;
  readonly sourceCoverageIssues?: ReadonlyArray<string>;
}

export const collectSessionTypeGlueingManifestQueueCoverageGateRollup = (
  input: {
    readonly issues: ReadonlyArray<string>;
    readonly warnings: ReadonlyArray<string>;
    readonly blockedManifestPlanQueueIssues: ReadonlyArray<string>;
    readonly queueSnapshotPaths?: SessionTypeGlueingManifestQueueQueueSnapshotPaths;
    readonly queueSnapshotPathsInferred?: boolean;
    readonly checkedAt?: string;
  },
): SessionTypeGlueingManifestQueueCoverageGateSummary | undefined => {
  const hasSignals =
    input.issues.length > 0 ||
    input.warnings.length > 0 ||
    input.blockedManifestPlanQueueIssues.length > 0 ||
    Boolean(input.queueSnapshotPaths) ||
    Boolean(input.queueSnapshotPathsInferred);
  if (!hasSignals) {
    return undefined;
  }
  return {
    checkedAt: input.checkedAt ?? "unspecified",
    ...(input.issues.length > 0 ? { issues: input.issues } : {}),
    ...(input.warnings.length > 0 ? { warnings: input.warnings } : {}),
    ...(input.blockedManifestPlanQueueIssues.length > 0
      ? { blockedManifestPlanQueueIssues: input.blockedManifestPlanQueueIssues }
      : {}),
    ...(input.queueSnapshotPaths ? { queueSnapshotPaths: input.queueSnapshotPaths } : {}),
    ...(input.queueSnapshotPathsInferred ? { queueSnapshotPathsInferred: true } : {}),
  } satisfies SessionTypeGlueingManifestQueueCoverageGateSummary;
};

const buildManifestSourceKey = (source: SessionTypeGlueingDashboardManifestSource): string =>
  [source.path ?? "", source.entryCount ?? "", source.replayedAt ?? ""].join("|");

const summarizeManifestSourceTotals = (
  entries: ReadonlyArray<SessionTypeGlueingConsumerDiffEntry>,
): ReadonlyArray<SessionTypeGlueingConsumerManifestSourceTotalsEntry> => {
  const totals = new Map<string, SessionTypeGlueingConsumerManifestSourceTotalsEntry>();
  for (const entry of entries) {
    const source = entry.manifestSource;
    if (!source) {
      continue;
    }
    const key = buildManifestSourceKey(source);
    const current = totals.get(key);
    const totalRuns = (current?.totalRuns ?? 0) + 1;
    const mismatchedRuns = (current?.mismatchedRuns ?? 0) + (entry.issues.length > 0 ? 1 : 0);
    totals.set(key, {
      source,
      totalRuns,
      mismatchedRuns,
    });
  }
  return Array.from(totals.values()).sort((left, right) => {
    if (right.mismatchedRuns !== left.mismatchedRuns) {
      return right.mismatchedRuns - left.mismatchedRuns;
    }
    return (right.totalRuns - left.totalRuns) || left.source.path?.localeCompare(right.source.path ?? "") || 0;
  });
};

export const diffSessionTypeGlueingSweepRunSnapshot = (
  snapshot: SessionTypeGlueingSweepRunSnapshot,
  options?: SessionTypeGlueingConsumerOptions,
): SessionTypeGlueingConsumerDiffEntry => {
  const recomputed = replaySessionTypeGlueingConfig(snapshot.config, options);
  const alignmentMetadataDiff = diffStringArrays(snapshot.alignmentMetadata, recomputed.alignmentMetadata);
  const alignmentNotesDiff = diffStringArrays(snapshot.alignmentNotes, recomputed.alignmentNotes);
  const manifestSource = getManifestSourceFromMetadata(snapshot.sessionMetadata);
  const issues: string[] = [];
  if (hasMetadataDiff(alignmentMetadataDiff)) {
    issues.push(
      `alignmentMetadata missing=${alignmentMetadataDiff.missing.length} unexpected=${alignmentMetadataDiff.unexpected.length}`,
    );
  }
  if (hasMetadataDiff(alignmentNotesDiff)) {
    issues.push(
      `alignmentNotes missing=${alignmentNotesDiff.missing.length} unexpected=${alignmentNotesDiff.unexpected.length}`,
    );
  }
  let runnerDiff: SessionTypeGlueingConsumerDiffEntry["runnerDiff"];
  const recordedHolds = snapshot.runnerHolds;
  const recordedMismatches = snapshot.runnerMismatches;
  if (
    recordedHolds !== undefined &&
    (recordedHolds !== recomputed.runnerHolds || recordedMismatches !== recomputed.runnerMismatches)
  ) {
    runnerDiff = {
      recordedHolds,
      ...(recordedMismatches !== undefined ? { recordedMismatches } : {}),
      recomputedHolds: recomputed.runnerHolds,
      recomputedMismatches: recomputed.runnerMismatches,
    };
    issues.push(
      `runner changed holds=${String(recordedHolds)}→${String(recomputed.runnerHolds)} mismatches=${String(
        recordedMismatches,
      )}→${recomputed.runnerMismatches}`,
    );
  }
  const coverageSnapshots = getSessionTypeGlueingCoverageSnapshots(snapshot);
  const { coverage, source: coverageSource } = getSessionTypeGlueingCoverageForRun(snapshot);
  const coverageIssues = collectSessionTypeGlueingAlignmentCoverageIssues(coverage);
  if (coverageIssues.length > 0) {
    coverageIssues.forEach((issue) => {
      issues.push(`${coverageSource === "runner" ? "runner" : "alignment"}.coverage:${issue}`);
    });
  }
  const coverageComparisonIssues = compareSessionTypeGlueingCoverageSnapshots(
    coverageSnapshots.runner,
    coverageSnapshots.alignment,
  );
  if (coverageComparisonIssues.length > 0) {
    coverageComparisonIssues.forEach((issue) => {
      issues.push(`coverage.drift:${issue}`);
    });
  }
  return {
    config: snapshot.config,
    recorded: snapshot,
    recomputed,
    alignmentMetadataDiff,
    alignmentNotesDiff,
    ...(manifestSource ? { manifestSource } : {}),
    ...(runnerDiff ? { runnerDiff } : {}),
    ...(coverageIssues.length > 0 ? { alignmentCoverageIssues: coverageIssues } : {}),
    ...(coverageComparisonIssues.length > 0 ? { coverageComparisonIssues } : {}),
    issues,
  };
};

export const diffSessionTypeGlueingSweepRecord = (
  record: SessionTypeGlueingSweepRecord,
  options?: SessionTypeGlueingConsumerOptions,
): SessionTypeGlueingConsumerDiffSummary => {
  const entries = record.runs.map((run) => diffSessionTypeGlueingSweepRunSnapshot(run, options));
  const mismatchedRuns = entries.filter((entry) => entry.issues.length > 0).length;
  const manifestSourceTotals = summarizeManifestSourceTotals(entries);
  const alignmentCoverageIssues: string[] = [];
  for (const entry of entries) {
    entry.alignmentCoverageIssues?.forEach((issue) => {
      alignmentCoverageIssues.push(`${entry.config.label}: ${issue}`);
    });
    entry.coverageComparisonIssues?.forEach((issue) => {
      alignmentCoverageIssues.push(`${entry.config.label}: Coverage drift: ${issue}`);
    });
  }
  const sourceCoverageTotals = summarizeSessionTypeGlueingSourceCoverage(record.sourceCoverage);
  const sourceCoverageIssues = collectSessionTypeGlueingSourceCoverageIssues(record.sourceCoverage, {
    requireManifestInputs: true,
    requireBlockedPlans: true,
  });
  const blockedManifestPlanQueueSummary = record.blockedManifestPlanQueue
    ? summarizeSessionTypeGlueingBlockedManifestPlanQueue(record.blockedManifestPlanQueue)
    : undefined;
  const blockedManifestPlanQueueIssues = collectSessionTypeGlueingBlockedManifestPlanQueueIssues(
    blockedManifestPlanQueueSummary,
  );
  const sessionMetadata = record.runs.flatMap((run) => run.sessionMetadata ?? []);
  const manifestQueueCoverageGateMetadataEntries =
    collectSessionTypeManifestQueueCoverageGateMetadataEntriesFromSessionMetadata(sessionMetadata);
  const manifestQueueCoverageGateMetadataQueueSnapshotPaths =
    extractSessionTypeManifestQueueCoverageGateQueueSnapshotPathsFromMetadataEntries(
      manifestQueueCoverageGateMetadataEntries,
    );
  const manifestQueueCoverageGateQueueSnapshotPaths =
    record.manifestQueue?.testCoverageGate?.queueSnapshotPaths ??
    manifestQueueCoverageGateMetadataQueueSnapshotPaths.queueSnapshotPaths;
  const manifestQueueCoverageGateQueueSnapshotPathsInferred =
    record.manifestQueue?.testCoverageGate?.queueSnapshotPathsInferred ??
    manifestQueueCoverageGateMetadataQueueSnapshotPaths.queueSnapshotPathsInferred;
  const manifestQueueTestStatus: SessionTypeGlueingManifestQueueTestStatus | undefined =
    record.manifestQueue
      ? {
          tested: record.manifestQueue.tested ?? false,
          ...(record.manifestQueue.testedAt ? { testedAt: record.manifestQueue.testedAt } : {}),
          ...(record.manifestQueue.testRevision !== undefined
            ? { revision: record.manifestQueue.testRevision }
            : {}),
          ...(record.manifestQueue.testCoverageGate
            ? {
                coverageGate: {
                  checkedAt: record.manifestQueue.testCoverageGate.checkedAt,
                  issues: record.manifestQueue.testCoverageGate.issues ?? [],
                  warnings: record.manifestQueue.testCoverageGate.warnings ?? [],
                  ...(record.manifestQueue.testCoverageGate.blockedManifestPlanQueueIssues
                    ? {
                        blockedManifestPlanQueueIssues:
                          record.manifestQueue.testCoverageGate.blockedManifestPlanQueueIssues,
                      }
                    : {}),
                  ...(manifestQueueCoverageGateQueueSnapshotPaths
                    ? { queueSnapshotPaths: manifestQueueCoverageGateQueueSnapshotPaths }
                    : {}),
                  ...(manifestQueueCoverageGateQueueSnapshotPathsInferred
                    ? { queueSnapshotPathsInferred: true }
                    : {}),
                },
              }
            : {}),
        }
      : undefined;
  const manifestQueueCoverageGateCollection = manifestQueueTestStatus
    ? collectSessionTypeManifestQueueTestCoverageGateIssues(manifestQueueTestStatus, {
        sessionMetadata,
      })
    : collectSessionTypeManifestQueueTestCoverageGateIssuesFromSessionMetadata(sessionMetadata);
  const manifestQueueCoverageGateIssues = new Set(manifestQueueCoverageGateCollection.issues);
  const manifestQueueCoverageGateWarnings = new Set(manifestQueueCoverageGateCollection.warnings);
  const manifestQueueCoverageGateBlockedManifestPlanQueueIssues = new Set(
    record.manifestQueue?.testCoverageGate?.blockedManifestPlanQueueIssues ?? [],
  );
  manifestQueueCoverageGateMetadataEntries.forEach((entry) => {
    if (entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX)) {
      manifestQueueCoverageGateBlockedManifestPlanQueueIssues.add(
        entry.slice(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX.length),
      );
    }
  });
  const manifestQueueCoverageGateIssuesArray = Array.from(manifestQueueCoverageGateIssues);
  const manifestQueueCoverageGateWarningsArray = Array.from(manifestQueueCoverageGateWarnings);
  const manifestQueueCoverageGateBlockedManifestPlanQueueIssuesArray = Array.from(
    manifestQueueCoverageGateBlockedManifestPlanQueueIssues,
  );
  const manifestQueueCoverageGateRollup = collectSessionTypeGlueingManifestQueueCoverageGateRollup({
    issues: manifestQueueCoverageGateIssuesArray,
    warnings: manifestQueueCoverageGateWarningsArray,
    blockedManifestPlanQueueIssues: manifestQueueCoverageGateBlockedManifestPlanQueueIssuesArray,
    ...(manifestQueueCoverageGateQueueSnapshotPaths
      ? { queueSnapshotPaths: manifestQueueCoverageGateQueueSnapshotPaths }
      : {}),
    ...(manifestQueueCoverageGateQueueSnapshotPathsInferred
      ? { queueSnapshotPathsInferred: true }
      : {}),
    checkedAt:
      record.manifestQueue?.testCoverageGate?.checkedAt ??
      record.manifestQueue?.testedAt ??
      "unspecified",
  });
  return {
    schemaVersion: SESSION_TYPE_GLUEING_SWEEP_RECORD_SCHEMA_VERSION,
    ...(record.recordedAt ? { recordedAt: record.recordedAt } : {}),
    ...(record.recordedSweepFile ? { recordedSweepFile: record.recordedSweepFile } : {}),
    totalRuns: record.runs.length,
    mismatchedRuns,
    entries,
    ...(alignmentCoverageIssues.length > 0 ? { alignmentCoverageIssues } : {}),
    ...(manifestSourceTotals.length > 0 ? { manifestSourceTotals } : {}),
    ...(record.suggestedManifestWrites ? { suggestedManifestWrites: record.suggestedManifestWrites } : {}),
    ...(record.blockedSuggestedManifestWrites
      ? { blockedSuggestedManifestWrites: record.blockedSuggestedManifestWrites }
      : {}),
    ...(record.blockedQueuedManifestInputs
      ? { blockedQueuedManifestInputs: record.blockedQueuedManifestInputs }
      : {}),
    ...(record.blockedManifestInputs ? { blockedManifestInputs: record.blockedManifestInputs } : {}),
    ...(record.blockedManifestPlans ? { blockedManifestPlans: record.blockedManifestPlans } : {}),
    ...(record.blockedManifestPlanInputs ? { blockedManifestPlanInputs: record.blockedManifestPlanInputs } : {}),
    ...(blockedManifestPlanQueueSummary ? { blockedManifestPlanQueue: blockedManifestPlanQueueSummary } : {}),
    ...(blockedManifestPlanQueueIssues.length > 0
      ? { blockedManifestPlanQueueIssues }
      : {}),
    ...(record.manifestQueue ? { manifestQueue: record.manifestQueue } : {}),
    ...(record.manifestQueue?.testIssues && record.manifestQueue.testIssues.length > 0
      ? { manifestQueueIssues: record.manifestQueue.testIssues }
      : {}),
    ...(record.manifestQueue?.testWarnings && record.manifestQueue.testWarnings.length > 0
      ? { manifestQueueWarnings: record.manifestQueue.testWarnings }
      : {}),
    ...(record.manifestQueue?.testCoverageGate
      ? { manifestQueueCoverageGate: record.manifestQueue.testCoverageGate }
      : {}),
    ...(manifestQueueCoverageGateQueueSnapshotPaths
      ? { manifestQueueCoverageGateQueueSnapshotPaths }
      : {}),
    ...(manifestQueueCoverageGateQueueSnapshotPathsInferred
      ? { manifestQueueCoverageGateQueueSnapshotPathsInferred: true }
      : {}),
    ...(manifestQueueCoverageGateIssuesArray.length > 0
      ? { manifestQueueCoverageGateIssues: manifestQueueCoverageGateIssuesArray }
      : {}),
    ...(manifestQueueCoverageGateWarningsArray.length > 0
      ? { manifestQueueCoverageGateWarnings: manifestQueueCoverageGateWarningsArray }
      : {}),
    ...(manifestQueueCoverageGateBlockedManifestPlanQueueIssuesArray.length > 0
      ? { manifestQueueCoverageGateBlockedManifestPlanQueueIssues: manifestQueueCoverageGateBlockedManifestPlanQueueIssuesArray }
      : {}),
    ...(manifestQueueCoverageGateRollup ? { manifestQueueCoverageGateRollup } : {}),
    ...(record.sourceCoverage ? { sourceCoverage: record.sourceCoverage } : {}),
    sourceCoverageTotals,
    ...(sourceCoverageIssues.length > 0 ? { sourceCoverageIssues } : {}),
  };
};

export const diffSessionTypeGlueingSweepRecordFromPath = (
  path: string,
  options?: SessionTypeGlueingConsumerOptions,
): SessionTypeGlueingConsumerDiffSummary => diffSessionTypeGlueingSweepRecord(readSessionTypeGlueingSweepRecord(path), options);
