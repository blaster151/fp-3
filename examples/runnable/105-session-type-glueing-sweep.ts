import { basename, dirname, extname, join, resolve } from "node:path";

import type { RunnableExample, RunnableExampleContext, RunnableExampleFlag } from "./types";
import {
  createRunnableExampleContext,
  getRunnableFlag,
  getRunnableFlagValues,
} from "./types";
import { sessionTypeGlueingStackRunnable } from "./104-session-type-glueing-stack";
import {
  ASSIGNMENT_FLAG,
  GLUEING_SPAN_FLAG,
  SESSION_TYPE_FLAG,
  SWEEP_FLAG,
  SWEEP_FILE_FLAG,
  SWEEP_RECORD_FLAG,
  SWEEP_DIFF_FLAG,
  SWEEP_FOCUS_FLAG,
  SWEEP_MANIFEST_FLAG,
  SWEEP_MANIFEST_INPUT_FLAG,
  SWEEP_BLOCKED_PLAN_INPUT_FLAG,
  SWEEP_MANIFEST_OVERRIDE_FLAG,
  SWEEP_HELP_FLAG,
} from "../../session-type-glueing-cli";
import {
  describeSessionTypeGlueingAssignments,
  readSessionTypeGlueingSweepEntriesFromFile,
  normalizeSessionTypeGlueingSweepEntry,
  parseSessionTypeGlueingSweepValue,
  type SessionTypeGlueingSweepConfig,
  type SessionTypeGlueingSweepEntry,
} from "../../session-type-glueing-sweep";
import {
  buildSessionTypeGlueingSweepRecord,
  collectSessionTypeGlueingSweepRunSnapshot,
  filterSessionTypeGlueingDashboardEntries,
  readSessionTypeGlueingSweepRecord,
  summarizeSessionTypeGlueingSweepRecord,
  formatSessionTypeGlueingSourceCoverageLines,
  writeSessionTypeGlueingSweepRecord,
  type SessionTypeGlueingBlockedManifestPlanEntry,
  type SessionTypeGlueingDashboardEntry,
  type SessionTypeGlueingDashboardManifestSource,
  type SessionTypeGlueingManifestQueueSummary,
  type SessionTypeGlueingSweepRunSnapshot,
  type SessionTypeGlueingSweepSourceCoverage,
} from "../../session-type-glueing-dashboard";
import {
  diffSessionTypeGlueingSweepRecordFromPath,
  type SessionTypeGlueingConsumerDiffSummary,
} from "../../session-type-glueing-consumer";
import {
  buildSessionTypeGlueingManifestEntriesFromBlockedManifestPlan,
  buildSessionTypeGlueingManifestEntriesFromDiffSummary,
  buildSessionTypeGlueingManifestEntriesFromSnapshots,
  mergeSessionTypeGlueingManifestEntries,
  readSessionTypeGlueingSweepEntriesFromManifest,
  writeSessionTypeGlueingManifest,
  type SessionTypeGlueingManifestEntry,
} from "../../session-type-glueing-manifest";
import {
  consumeSessionTypeGlueingManifestQueue,
  enqueueSessionTypeGlueingManifestQueue,
} from "../../session-type-glueing-manifest-queue";
import {
  formatSessionTypeManifestQueueTestMetadataEntries,
  formatSessionTypeManifestQueueTestIssueEntries,
  evaluateSessionTypeGlueingManifestQueueTestStatus,
  readSessionTypeGlueingManifestQueueTestStatus,
  type SessionTypeGlueingManifestQueueTestStatus,
} from "../../session-type-glueing-manifest-queue-test-status";

const buildFlagsForConfig = (config: SessionTypeGlueingSweepConfig): ReadonlyArray<RunnableExampleFlag> => {
  const flags: RunnableExampleFlag[] = [
    { key: SESSION_TYPE_FLAG, value: config.sessionTypeLiteral },
    { key: GLUEING_SPAN_FLAG, value: config.glueingSpan },
  ];
  for (const [channel, object] of Object.entries(config.assignments)) {
    flags.push({ key: ASSIGNMENT_FLAG, value: `${channel}=${object}` });
  }
  return flags;
};

const flagValueIsTruthy = (value: string | undefined): boolean => {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  return !["false", "0", "no", "off"].includes(normalized);
};

const formatRunLog = (
  snapshot: SessionTypeGlueingSweepRunSnapshot,
  index: number,
  total: number,
): ReadonlyArray<string> => {
  const lines: string[] = [];
  lines.push(
    `Run ${index + 1}/${total} label=${snapshot.config.label} type=${snapshot.config.sessionTypeLiteral} span=${snapshot.config.glueingSpan}`,
  );
  lines.push(`  assignments=${describeSessionTypeGlueingAssignments(snapshot.config.assignments)}`);
  lines.push(
    `  runner.holds=${snapshot.runnerHolds ?? "unknown"} mismatches=${snapshot.runnerMismatches ?? "unknown"}`,
  );
  lines.push(
    `  metadataCounts session=${snapshot.sessionMetadata.length} glueing=${snapshot.glueingMetadata.length} alignment=${snapshot.alignmentMetadata.length}`,
  );
  return lines;
};

const formatManifestSource = (
  manifestSource: SessionTypeGlueingDashboardManifestSource | undefined,
): string | undefined => {
  if (!manifestSource) {
    return undefined;
  }
  const parts: string[] = [];
  if (manifestSource.path) {
    parts.push(`path=${manifestSource.path}`);
  }
  if (manifestSource.entryCount !== undefined) {
    parts.push(`entries=${manifestSource.entryCount}`);
  }
  if (manifestSource.replayedAt) {
    parts.push(`replayedAt=${manifestSource.replayedAt}`);
  }
  return parts.length > 0 ? `manifest{${parts.join(" ")}}` : undefined;
};

const buildSuggestedManifestTargetPath = (path: string): string => {
  const directory = dirname(path);
  const extension = extname(path);
  const base = basename(path, extension);
  const suffix = `${base}.issues${extension || ".json"}`;
  return join(directory, suffix);
};

interface ManifestTargetSuggestion {
  readonly sourcePath: string;
  readonly suggestedPath: string;
  readonly mismatchedRuns: number;
  readonly totalRuns: number;
  readonly entryCount?: number;
}

interface BlockedManifestPlanInputEntry {
  readonly planRecordPath: string;
  readonly recordedAt?: string;
  readonly planIndex: number;
  readonly plan: SessionTypeGlueingBlockedManifestPlanEntry;
}

interface ManifestWriteMetadataEntry {
  readonly path: string;
  readonly entryCount: number;
  readonly mode: "explicit" | "suggested" | "plan";
  readonly sourcePath?: string;
  readonly planRecordPath?: string;
  readonly planIndex?: number;
  readonly planMismatchedRuns?: number;
  readonly planTotalRuns?: number;
}

const formatManifestTargetSuggestionLog = (suggestion: ManifestTargetSuggestion): string => {
  const parts = [`${suggestion.sourcePath} → ${suggestion.suggestedPath}`];
  parts.push(`mismatched=${suggestion.mismatchedRuns}/${suggestion.totalRuns}`);
  if (suggestion.entryCount !== undefined) {
    parts.push(`entries=${suggestion.entryCount}`);
  }
  return parts.join(" ");
};

const toBlockedManifestPlanEntry = (
  suggestion: ManifestTargetSuggestion,
  entries: ReadonlyArray<SessionTypeGlueingManifestEntry>,
): SessionTypeGlueingBlockedManifestPlanEntry => ({
  path: suggestion.suggestedPath,
  sourcePath: suggestion.sourcePath,
  mismatchedRuns: suggestion.mismatchedRuns,
  totalRuns: suggestion.totalRuns,
  entryCount: entries.length,
  entries: entries.map((entry) => ({
    label: entry.label,
    sessionTypeLiteral: entry.sessionTypeLiteral,
    glueingSpan: entry.glueingSpan,
    assignments: entry.assignments,
  })),
});

type SweepFocusMode = "issues" | "diff";

const normalizeSweepFocusValue = (value: string): SweepFocusMode | undefined => {
  const normalized = value.trim().toLowerCase();
  if (["issue", "issues", "mismatch", "mismatches"].includes(normalized)) {
    return "issues";
  }
  if (["diff", "diffs", "diffed", "mismatched"].includes(normalized)) {
    return "diff";
  }
  return undefined;
};

const buildSnapshotKey = (config: SessionTypeGlueingSweepConfig): string =>
  `${config.label}|${config.sessionTypeLiteral}|${config.glueingSpan}|${describeSessionTypeGlueingAssignments(config.assignments)}`;

const buildSummaryEntryKey = (entry: SessionTypeGlueingDashboardEntry): string =>
  `${entry.label}|${entry.sessionTypeLiteral}|${entry.glueingSpan}|${entry.assignments}`;

interface ManifestReplaySourceMetadata {
  readonly path: string;
  readonly entryCount: number;
  readonly replayedAt: string;
}

const appendSessionMetadataEntries = (
  metadata: Record<string, unknown> | undefined,
  entries: ReadonlyArray<string>,
): Record<string, unknown> => {
  if (entries.length === 0) {
    return metadata ?? {};
  }
  const sessionEntries = metadata?.["sessionMetadata"];
  const existing = Array.isArray(sessionEntries)
    ? sessionEntries.filter((entry): entry is string => typeof entry === "string")
    : [];
  return {
    ...(metadata ?? {}),
    sessionMetadata: [...existing, ...entries],
  };
};

const appendManifestMetadata = (
  metadata: Record<string, unknown> | undefined,
  manifest: ManifestReplaySourceMetadata,
): Record<string, unknown> =>
  appendSessionMetadataEntries(metadata, [
    `sessionType.manifest.path=${manifest.path}`,
    `sessionType.manifest.entryCount=${manifest.entryCount}`,
    `sessionType.manifest.replayedAt=${manifest.replayedAt}`,
  ]);

const appendManifestQueueTestMetadata = (
  metadata: Record<string, unknown> | undefined,
  status: SessionTypeGlueingManifestQueueTestStatus,
): Record<string, unknown> =>
  appendSessionMetadataEntries(metadata, formatSessionTypeManifestQueueTestMetadataEntries(status));

const buildSnapshotMetadata = (snapshot: SessionTypeGlueingSweepRunSnapshot) => ({
  label: snapshot.config.label,
  source: snapshot.config.source,
  sessionType: snapshot.config.sessionTypeLiteral,
  glueingSpan: snapshot.config.glueingSpan,
  assignments: snapshot.config.assignments,
  runner: {
    holds: snapshot.runnerHolds,
    mismatches: snapshot.runnerMismatches,
  },
  metadataCounts: {
    session: snapshot.sessionMetadata.length,
    glueing: snapshot.glueingMetadata.length,
    alignment: snapshot.alignmentMetadata.length,
  },
  sessionMetadata: snapshot.sessionMetadata,
  glueingMetadata: snapshot.glueingMetadata,
  alignmentMetadata: snapshot.alignmentMetadata,
  alignmentNotes: snapshot.alignmentNotes,
  exampleArgs: snapshot.exampleArgs ?? [],
});

const filterDiffSummaryForIssues = (
  summary: SessionTypeGlueingConsumerDiffSummary,
): SessionTypeGlueingConsumerDiffSummary => {
  const entries = summary.entries.filter((entry) => entry.issues.length > 0);
  return {
    ...summary,
    mismatchedRuns: entries.length,
    entries,
  };
};

export const sessionTypeGlueingSweepRunnable: RunnableExample = {
  id: "105",
  outlineReference: 105,
  title: "Session-type glueing sweep harness",
  summary:
    "Runs the Example 8 session-type glueing sweep. Combine --sweep/--sweep-file/--sweep-record, --sweep-diff, --sweep-manifest /"
    + " --sweep-manifest-input, and --sweep-blocked-plan-input flags to replay recorded manifests, regenerate issues files, and"
    + " refresh blocked plans in a single run. Always run 'npm run session-type:manifest-queue:test' before writing or replaying"
    + " manifests so the CLI can enforce the manifest-queue gate, log overrides, and surface the coverage metadata inside every"
    + " sweep/diff record for FW-4 reviews. Use --help when listing runnables to print the manifest-queue workflow, supported"
    + " flags, and sentinel reminder before launching the sweep.",
  tags: ["phase-vii", "lambda-coop", "session-type", "glueing", "future-work", "sweep"],
  async run(context?: RunnableExampleContext) {
    const helpRequested = flagValueIsTruthy(getRunnableFlag(context, SWEEP_HELP_FLAG));
    if (helpRequested) {
      const logs = [
        "=== Session-type glueing sweep usage ===",
        "",
        "Workflow:",
        "1. Run 'npm run session-type:manifest-queue:test' before invoking --sweep-manifest, --sweep-manifest-input,",
        "   or --sweep-blocked-plan-input so the CLI can gate manifest writes and log overrides.",
        "2. Combine --sweep/--sweep-file/--sweep-record to replay saved configurations and capture new entries.",
        "3. Use --sweep-diff=<record.json> to compare recorded sweeps against the current λ₍coop₎ diagnostics.",
        "4. Provide --sweep-manifest-input=<manifest.json> to replay recorded manifests. These runs are counted in",
        "   sweepSummary.sourceCoverage.manifestInputs.",
        "5. Supply --sweep-blocked-plan-input=<record.json> to regenerate blocked manifests alongside the replay runs;",
        "   these runs are counted in sweepSummary.sourceCoverage.blockedPlans.",
        "",
        "Key flags:",
        "  --help                           Show this guide without running the sweep.",
        "  --sweep=<tokens>                 Inline sweep definition (repeatable).",
        "  --sweep-file=<path>              Load sweep entries from JSON.",
        "  --sweep-record=<path>            Record the executed sweep to disk.",
        "  --sweep-diff=<record.json>       Compare recorded sweeps to the latest diagnostics.",
        "  --sweep-manifest=<path>          Write manifests for mismatched runs.",
        "  --sweep-manifest-input=<path>    Replay recorded manifest entries (counts in sourceCoverage).",
        "  --sweep-blocked-plan-input=<path> Replay blocked manifests generated from diff suggestions (counts in sourceCoverage).",
        "  --sweep-focus=issues|diff        Filter sweep/diff output for review.",
        "  --allow-manifest-queue-issues    Override manifest-queue gating (logs reasons in metadata).",
        "",
        "The sweep metadata now records manifest-input vs blocked-plan run totals inside",
        "sweepSummary.sourceCoverage and the top-level sourceCoverage block so FW-4 reviewers",
        "can confirm that both data sources ran together without re-reading the CLI logs.",
      ];
      return {
        logs,
        metadata: {
          help: "session-type-glueing-sweep",
          reminder: "Always run npm run session-type:manifest-queue:test before writing or replaying manifests.",
        },
      };
    }

    const inlineSweeps = getRunnableFlagValues(context, SWEEP_FLAG);
    const fileSweeps = getRunnableFlagValues(context, SWEEP_FILE_FLAG);
    const manifestSweepsFromFlags = getRunnableFlagValues(context, SWEEP_MANIFEST_INPUT_FLAG);
    const manifestTargets = getRunnableFlagValues(context, SWEEP_MANIFEST_FLAG);
    const blockedManifestPlanInputs = getRunnableFlagValues(context, SWEEP_BLOCKED_PLAN_INPUT_FLAG);
    const allowManifestQueueIssues = flagValueIsTruthy(
      getRunnableFlag(context, SWEEP_MANIFEST_OVERRIDE_FLAG),
    );
    const manifestQueueTestStatus = readSessionTypeGlueingManifestQueueTestStatus();
    const manifestQueueTestEvaluation =
      evaluateSessionTypeGlueingManifestQueueTestStatus(manifestQueueTestStatus);
    const manifestQueueGateIssues = manifestQueueTestEvaluation.issues;
    const manifestQueueGateIssueList = manifestQueueGateIssues.join(", ") || "unspecified";
    const manifestQueueGateActive = manifestQueueGateIssues.length > 0;
    const manifestQueueGateBlocked = manifestQueueGateActive && !allowManifestQueueIssues;
    const manifestQueueGateBypassed = manifestQueueGateActive && allowManifestQueueIssues;
    const manifestQueueOverrideReasons: string[] = [];
    const queuedManifestInputsRaw = consumeSessionTypeGlueingManifestQueue();
    const blockedQueuedManifestInputs: string[] = [];
    let queuedManifestInputs = queuedManifestInputsRaw;
    const manifestInputPathSet = new Set(manifestSweepsFromFlags.map((path) => resolve(path)));
    const manifestInputSourceKeys = new Set<string>();
    const blockedPlanSourceKeys = new Set<string>();
    if (manifestQueueGateBlocked && queuedManifestInputsRaw.length > 0) {
      blockedQueuedManifestInputs.push(...queuedManifestInputsRaw);
      enqueueSessionTypeGlueingManifestQueue(queuedManifestInputsRaw);
      queuedManifestInputs = [];
    } else if (manifestQueueGateBypassed && queuedManifestInputsRaw.length > 0) {
      manifestQueueOverrideReasons.push(
        `replaying ${queuedManifestInputsRaw.length} queued manifest${
          queuedManifestInputsRaw.length === 1 ? "" : "s"
        } despite issues (${manifestQueueGateIssueList})`,
      );
    }
    const resolvedQueuedManifestInputs = queuedManifestInputs.map((path) => resolve(path));
    const queuedManifestInputSet = new Set(resolvedQueuedManifestInputs);
    const manifestSweeps = [...manifestSweepsFromFlags, ...queuedManifestInputs];
    const diffSweeps = getRunnableFlagValues(context, SWEEP_DIFF_FLAG);
    const sweepFocusModes = new Set(
      getRunnableFlagValues(context, SWEEP_FOCUS_FLAG)
        .map(normalizeSweepFocusValue)
        .filter((value): value is SweepFocusMode => value !== undefined),
    );
    const focusIssues = sweepFocusModes.has("issues");
    const focusDiffs = sweepFocusModes.has("diff");
    const entries: SessionTypeGlueingSweepEntry[] = [];
    const manifestReplaySources = new Map<string, ManifestReplaySourceMetadata>();
    const queuedManifestReplayPaths: string[] = [];
    inlineSweeps.forEach((value, index) => {
      entries.push(parseSessionTypeGlueingSweepValue(value, `cli[${index + 1}]`));
    });
    fileSweeps.forEach((path) => {
      entries.push(...readSessionTypeGlueingSweepEntriesFromFile(path));
    });
    const manifestReplayErrors: Array<{ path: string; error: string }> = [];
    for (const path of manifestSweeps) {
      const resolved = resolve(path);
      const source = `manifest:${resolved}`;
      const replayedAt = new Date().toISOString();
      let manifestEntries: SessionTypeGlueingSweepEntry[];
      try {
        manifestEntries = readSessionTypeGlueingSweepEntriesFromManifest(path, { source });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (queuedManifestInputSet.has(resolved)) {
          manifestReplayErrors.push({ path: resolved, error: message });
          continue;
        }
        throw error;
      }
      manifestReplaySources.set(source, {
        path: resolved,
        entryCount: manifestEntries.length,
        replayedAt,
      });
      if (manifestInputPathSet.has(resolved)) {
        manifestInputSourceKeys.add(source);
      }
      if (queuedManifestInputSet.has(resolved)) {
        queuedManifestReplayPaths.push(resolved);
      }
      entries.push(...manifestEntries);
    }
    if (entries.length === 0 && diffSweeps.length === 0 && manifestReplayErrors.length === 0) {
      throw new Error("Provide at least one --sweep/--sweep-file entry or a --sweep-diff path.");
    }
    const configs = entries.map((entry, index) => {
      const normalizeOptions = entry.source ? { index, source: entry.source } : { index };
      return normalizeSessionTypeGlueingSweepEntry(entry, normalizeOptions);
    });

    const blockedManifestPlanSummaries: BlockedManifestPlanInputEntry[] = [];
    const blockedManifestPlanInputWarnings: string[] = [];
    for (const inputPath of blockedManifestPlanInputs) {
      const resolved = resolve(inputPath);
      let record;
      try {
        record = readSessionTypeGlueingSweepRecord(resolved);
      } catch (error) {
        throw new Error(`Failed to read blocked-manifest plan '${resolved}': ${String(error)}`);
      }
      const plans = record.blockedManifestPlans ?? [];
      if (plans.length === 0) {
        blockedManifestPlanInputWarnings.push(
          `Blocked manifest plan '${resolved}' does not contain any recorded entries.`,
        );
      }
      plans.forEach((plan, planIndex) =>
        blockedManifestPlanSummaries.push({
          planRecordPath: resolved,
          recordedAt: record.recordedAt,
          planIndex,
          plan,
        }),
      );
    }

    const preparedBlockedManifestPlanEntries: Array<{
      readonly summary: BlockedManifestPlanInputEntry;
      readonly entries: ReadonlyArray<SessionTypeGlueingManifestEntry>;
    }> = [];
    const appliedBlockedManifestPlanSweeps: Array<{
      readonly planRecordPath: string;
      readonly recordedAt?: string;
      readonly planIndex: number;
      readonly path: string;
      readonly entryCount: number;
      readonly sourcePath: string;
      readonly planMismatchedRuns?: number;
      readonly planTotalRuns?: number;
    }> = [];
    if (blockedManifestPlanSummaries.length > 0) {
      if (manifestQueueGateBlocked) {
        throw new Error(
          `Cannot apply --${SWEEP_BLOCKED_PLAN_INPUT_FLAG} entries while the manifest queue coverage is invalid (issues: ${manifestQueueGateIssueList}). ` +
            `Rerun the manifest-queue tests or pass --${SWEEP_MANIFEST_OVERRIDE_FLAG}=true to override.`,
        );
      }
      if (manifestQueueGateBypassed) {
        manifestQueueOverrideReasons.push(
          `applying ${blockedManifestPlanSummaries.length} blocked manifest plan${
            blockedManifestPlanSummaries.length === 1 ? "" : "s"
          } despite issues (${manifestQueueGateIssueList})`,
        );
      }
      blockedManifestPlanSummaries.forEach((summary) => {
        const planEntries = buildSessionTypeGlueingManifestEntriesFromBlockedManifestPlan(summary.plan);
        if (planEntries.length === 0) {
          return;
        }
        preparedBlockedManifestPlanEntries.push({ summary, entries: planEntries });
        appliedBlockedManifestPlanSweeps.push({
          planRecordPath: summary.planRecordPath,
          ...(summary.recordedAt ? { recordedAt: summary.recordedAt } : {}),
          planIndex: summary.planIndex,
          path: summary.plan.path,
          entryCount: planEntries.length,
          sourcePath: summary.plan.sourcePath,
          planMismatchedRuns: summary.plan.mismatchedRuns,
          planTotalRuns: summary.plan.totalRuns,
        });
        planEntries.forEach((entry, entryIndex) => {
          const planSource = `${summary.plan.path}#plan-entry-${entryIndex + 1}`;
          blockedPlanSourceKeys.add(planSource);
          entries.push({
            label: entry.label,
            sessionTypeLiteral: entry.sessionTypeLiteral,
            assignments: entry.assignments,
            glueingSpan: entry.glueingSpan,
            source: planSource,
          });
        });
      });
    }

    const recordPath = getRunnableFlag(context, SWEEP_RECORD_FLAG);

    const manifestWriteMetadata: ManifestWriteMetadataEntry[] = [];
    let manifestEntries: SessionTypeGlueingManifestEntry[] = [];
    const manifestWrites: Array<{ path: string; entryCount: number }> = [];
    const suggestedManifestWrites: Array<{ path: string; entryCount: number; sourcePath: string }> = [];
    const appliedBlockedManifestPlanWrites: Array<{
      readonly planRecordPath: string;
      readonly recordedAt?: string;
      readonly planIndex: number;
      readonly path: string;
      readonly entryCount: number;
      readonly sourcePath: string;
    }> = [];
    let enqueuedSuggestedManifestPaths: string[] = [];
    const blockedQueuedManifestInputPaths = blockedQueuedManifestInputs.map((path) => resolve(path));
    let queueReplayGatingLog: string | undefined;
    if (blockedQueuedManifestInputs.length > 0) {
      queueReplayGatingLog =
        `Manifest queue coverage gating active — skipped ${blockedQueuedManifestInputs.length} queued manifest replay${
          blockedQueuedManifestInputs.length === 1 ? "" : "s"
        }. ` +
        `Rerun the manifest-queue tests or pass --${SWEEP_MANIFEST_OVERRIDE_FLAG}=true to override.`;
    }
    let manifestQueueOverrideLog: string | undefined;

    const snapshots: SessionTypeGlueingSweepRunSnapshot[] = [];
    for (const config of configs) {
      const sweepContext = createRunnableExampleContext(buildFlagsForConfig(config));
      const outcome = await sessionTypeGlueingStackRunnable.run(sweepContext);
      const manifestReplay = manifestReplaySources.get(config.source);
      let metadata = manifestReplay ? appendManifestMetadata(outcome.metadata, manifestReplay) : outcome.metadata;
      metadata = appendManifestQueueTestMetadata(metadata, manifestQueueTestStatus);
      if (manifestQueueTestEvaluation.issues.length > 0) {
        metadata = appendSessionMetadataEntries(
          metadata,
          formatSessionTypeManifestQueueTestIssueEntries(manifestQueueTestEvaluation.issues),
        );
      }
      snapshots.push(
        collectSessionTypeGlueingSweepRunSnapshot(config, metadata, sweepContext?.rawFlags),
      );
    }

    const manifestInputRunCount = snapshots.filter((snapshot) =>
      manifestInputSourceKeys.has(snapshot.config.source),
    ).length;
    const blockedPlanRunCount = snapshots.filter((snapshot) =>
      blockedPlanSourceKeys.has(snapshot.config.source),
    ).length;
    const sourceCoverage: SessionTypeGlueingSweepSourceCoverage | undefined =
      manifestInputRunCount > 0 || blockedPlanRunCount > 0
        ? {
            ...(manifestInputRunCount > 0 ? { manifestInputs: manifestInputRunCount } : {}),
            ...(blockedPlanRunCount > 0 ? { blockedPlans: blockedPlanRunCount } : {}),
          }
        : undefined;

    const manifestQueueSummary: SessionTypeGlueingManifestQueueSummary = {
      tested: manifestQueueTestStatus.tested,
      ...(manifestQueueTestStatus.testedAt ? { testedAt: manifestQueueTestStatus.testedAt } : {}),
      ...(manifestQueueTestStatus.revision !== undefined
        ? { testRevision: manifestQueueTestStatus.revision }
        : {}),
      ...(manifestQueueTestEvaluation.stale ? { testStale: true } : {}),
      ...(manifestQueueTestEvaluation.ageMs !== undefined
        ? { testAgeMs: manifestQueueTestEvaluation.ageMs }
        : {}),
      testThresholdMs: manifestQueueTestEvaluation.thresholdMs,
      ...(manifestQueueTestEvaluation.issues.length > 0
        ? { testIssues: manifestQueueTestEvaluation.issues }
        : {}),
      ...(manifestQueueTestEvaluation.warnings.length > 0
        ? { testWarnings: manifestQueueTestEvaluation.warnings }
        : {}),
      ...(resolvedQueuedManifestInputs.length > 0 ? { inputs: resolvedQueuedManifestInputs } : {}),
      ...(queuedManifestReplayPaths.length > 0 ? { replays: queuedManifestReplayPaths } : {}),
      ...(blockedQueuedManifestInputPaths.length > 0
        ? { blockedInputs: blockedQueuedManifestInputPaths }
        : {}),
      ...(enqueuedSuggestedManifestPaths.length > 0 ? { outputs: enqueuedSuggestedManifestPaths } : {}),
      ...(manifestReplayErrors.length > 0 ? { replayErrors: manifestReplayErrors } : {}),
      ...(manifestQueueOverrideReasons.length > 0
        ? {
            testOverride: {
              flag: SWEEP_MANIFEST_OVERRIDE_FLAG,
              issues: manifestQueueGateIssues,
              reasons: manifestQueueOverrideReasons,
            },
          }
        : {}),
    };

    const sweepRecordOptions: {
      generatedManifests: typeof manifestWriteMetadata;
      suggestedManifestWrites: typeof suggestedManifestWrites;
      blockedSuggestedManifestWrites?: ReadonlyArray<{
        readonly path: string;
        readonly sourcePath: string;
        readonly mismatchedRuns: number;
        readonly totalRuns: number;
        readonly entryCount?: number;
      }>;
      blockedQueuedManifestInputs?: ReadonlyArray<string>;
      blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
      manifestQueue: SessionTypeGlueingManifestQueueSummary;
      sourceCoverage?: SessionTypeGlueingSweepSourceCoverage;
    } = {
      generatedManifests: manifestWriteMetadata,
      suggestedManifestWrites: suggestedManifestWrites,
      manifestQueue: manifestQueueSummary,
      ...(sourceCoverage ? { sourceCoverage } : {}),
    };

    let recordedLocation: string | undefined;
    let sweepSummary: ReturnType<typeof summarizeSessionTypeGlueingSweepRecord> | undefined;
    if (snapshots.length > 0) {
      let sweepRecord = buildSessionTypeGlueingSweepRecord(snapshots, sweepRecordOptions);
      if (recordPath) {
        const writeResult = writeSessionTypeGlueingSweepRecord(recordPath, snapshots, sweepRecordOptions);
        recordedLocation = writeResult.path;
        sweepRecord = writeResult.record;
      }
      sweepSummary = summarizeSessionTypeGlueingSweepRecord(sweepRecord);
    }

    const snapshotFocusKeySet =
      focusIssues && sweepSummary
        ? new Set(
            filterSessionTypeGlueingDashboardEntries(sweepSummary.entries, { requireIssues: true }).map((entry) =>
              buildSummaryEntryKey(entry),
            ),
          )
        : undefined;
    const snapshotsForLog = snapshotFocusKeySet
      ? snapshots.filter((snapshot) => snapshotFocusKeySet.has(buildSnapshotKey(snapshot.config)))
      : snapshots;

    const diffSummaries: ReadonlyArray<{
      readonly path: string;
      readonly summary: SessionTypeGlueingConsumerDiffSummary;
    }> = diffSweeps.map((path) => ({
      path,
      summary: diffSessionTypeGlueingSweepRecordFromPath(path),
    }));
    const diffSummariesForLog = focusDiffs
      ? diffSummaries.map(({ path, summary }) => ({ path, summary: filterDiffSummaryForIssues(summary) }))
      : diffSummaries;
    const diffSummariesForDisplay = focusDiffs ? diffSummariesForLog : diffSummaries;

    const manifestTargetSuggestionMap = new Map<string, ManifestTargetSuggestion>();
    for (const { summary } of diffSummaries) {
      const manifestTotals = summary.manifestSourceTotals ?? [];
      for (const manifestSummary of manifestTotals) {
        const sourcePath = manifestSummary.source.path;
        if (!sourcePath || manifestSummary.mismatchedRuns === 0) {
          continue;
        }
        const existing = manifestTargetSuggestionMap.get(sourcePath);
        if (existing) {
          manifestTargetSuggestionMap.set(sourcePath, {
            ...existing,
            mismatchedRuns: existing.mismatchedRuns + manifestSummary.mismatchedRuns,
            totalRuns: existing.totalRuns + manifestSummary.totalRuns,
          });
        } else {
          manifestTargetSuggestionMap.set(sourcePath, {
            sourcePath,
            suggestedPath: buildSuggestedManifestTargetPath(sourcePath),
            mismatchedRuns: manifestSummary.mismatchedRuns,
            totalRuns: manifestSummary.totalRuns,
            ...(manifestSummary.source.entryCount !== undefined
              ? { entryCount: manifestSummary.source.entryCount }
              : {}),
          });
        }
      }
    }
  const manifestTargetSuggestions = Array.from(manifestTargetSuggestionMap.values());
  const manifestSourceFilterPaths =
    manifestTargets.length > 0 && manifestTargetSuggestions.length > 0
      ? new Set(manifestTargetSuggestions.map((suggestion) => suggestion.sourcePath))
      : undefined;
    const manifestFilterLogNote =
      manifestTargets.length > 0 && manifestSourceFilterPaths && manifestSourceFilterPaths.size > 0
        ? `Applying manifest-source filter (${manifestSourceFilterPaths.size} mismatched manifest source${
            manifestSourceFilterPaths.size === 1 ? "" : "s"
          }) before writing manifests.`
        : undefined;

    if (manifestTargets.length > 0 && manifestQueueGateBlocked) {
      throw new Error(
        `Cannot write --${SWEEP_MANIFEST_FLAG} outputs while the manifest queue coverage is invalid (issues: ${manifestQueueGateIssueList}). ` +
          `Rerun the manifest-queue tests or pass --${SWEEP_MANIFEST_OVERRIDE_FLAG}=true to override.`,
      );
    }

    if (manifestTargets.length > 0 && manifestQueueGateBypassed) {
      manifestQueueOverrideReasons.push(
        `proceeding with --${SWEEP_MANIFEST_FLAG} writes despite issues (${manifestQueueGateIssueList})`,
      );
    }

    manifestEntries = [];
    manifestWrites.length = 0;
    if (manifestTargets.length > 0) {
      const sweepManifestEntries = buildSessionTypeGlueingManifestEntriesFromSnapshots(snapshotsForLog);
      const diffManifestEntries = diffSummariesForDisplay.flatMap(({ summary }) =>
        buildSessionTypeGlueingManifestEntriesFromDiffSummary(summary, {
          ...(manifestSourceFilterPaths
            ? { allowedManifestSourcePaths: manifestSourceFilterPaths as ReadonlySet<string> }
            : {}),
        }),
      );
      manifestEntries = mergeSessionTypeGlueingManifestEntries(sweepManifestEntries, diffManifestEntries);
      manifestWrites.push(...manifestTargets.map((target) => writeSessionTypeGlueingManifest(target, manifestEntries)));
      manifestWriteMetadata.push(
        ...manifestWrites.map((write) => ({ ...write, mode: "explicit" as const } satisfies ManifestWriteMetadataEntry)),
      );
    }

    const blockedSuggestedManifestWrites: ManifestTargetSuggestion[] = [];
    const blockedManifestPlans: SessionTypeGlueingBlockedManifestPlanEntry[] = [];
    enqueuedSuggestedManifestPaths = [];
    if (manifestTargets.length === 0 && manifestTargetSuggestions.length > 0 && diffSummaries.length > 0) {
      if (manifestQueueGateBlocked) {
        blockedSuggestedManifestWrites.push(...manifestTargetSuggestions);
        for (const suggestion of manifestTargetSuggestions) {
          const allowedPaths = new Set<string>([suggestion.sourcePath]);
          const entries = mergeSessionTypeGlueingManifestEntries(
            ...diffSummaries.map(({ summary }) =>
              buildSessionTypeGlueingManifestEntriesFromDiffSummary(summary, { allowedManifestSourcePaths: allowedPaths }),
            ),
          );
          if (entries.length === 0) {
            continue;
          }
          blockedManifestPlans.push(toBlockedManifestPlanEntry(suggestion, entries));
        }
      } else {
        if (manifestQueueGateBypassed) {
          manifestQueueOverrideReasons.push(
            `generating ${manifestTargetSuggestions.length} suggested manifest${
              manifestTargetSuggestions.length === 1 ? "" : "s"
            } despite issues (${manifestQueueGateIssueList})`,
          );
        }
        for (const suggestion of manifestTargetSuggestions) {
          const allowedPaths = new Set<string>([suggestion.sourcePath]);
          const entries = mergeSessionTypeGlueingManifestEntries(
            ...diffSummaries.map(({ summary }) =>
              buildSessionTypeGlueingManifestEntriesFromDiffSummary(summary, {
                allowedManifestSourcePaths: allowedPaths,
              }),
            ),
          );
          if (entries.length === 0) {
            continue;
          }
          const writeResult = writeSessionTypeGlueingManifest(suggestion.suggestedPath, entries);
          suggestedManifestWrites.push({ ...writeResult, sourcePath: suggestion.sourcePath });
          manifestWriteMetadata.push({
            ...writeResult,
            mode: "suggested",
            sourcePath: suggestion.sourcePath,
          } satisfies ManifestWriteMetadataEntry);
        }
        enqueuedSuggestedManifestPaths = enqueueSessionTypeGlueingManifestQueue(
          suggestedManifestWrites.map((write) => write.path),
        ).slice();
      }
    }

    if (blockedSuggestedManifestWrites.length > 0) {
      sweepRecordOptions.blockedSuggestedManifestWrites = blockedSuggestedManifestWrites.map((suggestion) => ({
        path: suggestion.suggestedPath,
        sourcePath: suggestion.sourcePath,
        mismatchedRuns: suggestion.mismatchedRuns,
        totalRuns: suggestion.totalRuns,
        ...(suggestion.entryCount !== undefined ? { entryCount: suggestion.entryCount } : {}),
      }));
    }
    if (blockedManifestPlans.length > 0) {
      sweepRecordOptions.blockedManifestPlans = blockedManifestPlans;
    }
    if (preparedBlockedManifestPlanEntries.length > 0) {
      preparedBlockedManifestPlanEntries.forEach(({ summary, entries: planEntries }) => {
        const writeResult = writeSessionTypeGlueingManifest(summary.plan.path, planEntries);
        manifestWriteMetadata.push({
          ...writeResult,
          mode: "plan",
          sourcePath: summary.plan.sourcePath,
          planRecordPath: summary.planRecordPath,
          planIndex: summary.planIndex,
          planMismatchedRuns: summary.plan.mismatchedRuns,
          planTotalRuns: summary.plan.totalRuns,
        });
        appliedBlockedManifestPlanWrites.push({
          planRecordPath: summary.planRecordPath,
          ...(summary.recordedAt ? { recordedAt: summary.recordedAt } : {}),
          planIndex: summary.planIndex,
          path: writeResult.path,
          entryCount: writeResult.entryCount,
          sourcePath: summary.plan.sourcePath,
        });
      });
    }
    if (blockedQueuedManifestInputPaths.length > 0) {
      sweepRecordOptions.blockedQueuedManifestInputs = blockedQueuedManifestInputPaths;
    }

    if (manifestQueueOverrideReasons.length > 0) {
      manifestQueueOverrideLog =
        `Manifest queue gating override active — ${manifestQueueOverrideReasons.join("; ")}`;
    }

    const logs: string[] = [];
    if (resolvedQueuedManifestInputs.length > 0) {
      logs.push("=== Queued manifest inputs ===");
      resolvedQueuedManifestInputs.forEach((path) => {
        logs.push(`  ${path}`);
      });
    }
    if (manifestReplayErrors.length > 0) {
      logs.push("=== Queued manifest replay errors ===");
      manifestReplayErrors.forEach(({ path, error }) => {
        logs.push(`  ${path}: ${error}`);
      });
    }
    if (snapshots.length > 0) {
      logs.push(
        `=== Session-type glueing sweep (${snapshots.length} configuration${snapshots.length === 1 ? "" : "s"}) ===`,
      );
      if (focusIssues) {
        logs.push(
          `Applying sweep focus 'issues': showing ${snapshotsForLog.length}/${snapshots.length} configuration${snapshotsForLog.length === 1 ? "" : "s"}.`,
        );
        if (snapshotsForLog.length === 0) {
          logs.push("  No sweep entries matched the requested filter.");
        }
      }
      snapshotsForLog.forEach((snapshot, index) => {
        for (const line of formatRunLog(snapshot, index, snapshotsForLog.length || 1)) {
          logs.push(line);
        }
      });
      if (sweepSummary) {
        logs.push(
          `Runner summary successes=${sweepSummary.runner.successes} failures=${sweepSummary.runner.failures} mismatches=${sweepSummary.runner.mismatches} unknown=${sweepSummary.runner.unknown}`,
        );
        logs.push(
          `Alignment summary aligned=${sweepSummary.alignment.aligned} issues=${sweepSummary.alignment.issues} unknown=${sweepSummary.alignment.unknown}`,
        );
        logs.push(
          ...formatSessionTypeGlueingSourceCoverageLines(sweepSummary.sourceCoverage, {
            label: "Sweep summary source coverage",
          }),
        );
      }
      if (recordedLocation) {
        logs.push(`Sweep configurations recorded to ${recordedLocation}`);
      }
    } else {
      logs.push("=== Session-type glueing sweep (no configurations executed) ===");
    }

    if (diffSummaries.length > 0) {
      logs.push(
        `=== Session-type glueing sweep diff (${diffSummaries.length} record${diffSummaries.length === 1 ? "" : "s"}) ===`,
      );
      if (focusDiffs) {
        logs.push(
          `Applying sweep focus 'diff': showing mismatched entries only across ${diffSummariesForDisplay.length}/${diffSummaries.length} record${diffSummariesForDisplay.length === 1 ? "" : "s"}.`,
        );
      }
      diffSummariesForDisplay.forEach(({ path, summary }, index) => {
        logs.push(
          `Diff ${index + 1}/${diffSummaries.length} path=${path} mismatched=${summary.mismatchedRuns}/${summary.totalRuns}`,
        );
        if (summary.manifestSourceTotals && summary.manifestSourceTotals.length > 0) {
          logs.push("  Manifest totals:");
          summary.manifestSourceTotals.forEach((manifestSummary) => {
            const manifestNote = formatManifestSource(manifestSummary.source);
            const label = manifestNote ?? "manifest{unknown}";
            logs.push(
              `    ${label} mismatched=${manifestSummary.mismatchedRuns}/${manifestSummary.totalRuns}`,
            );
          });
        }
        logs.push(
          ...formatSessionTypeGlueingSourceCoverageLines(summary.sourceCoverage, {
            label: "  Source coverage",
            indent: "  ",
          }),
        );
        let loggedIssue = false;
        summary.entries.forEach((entry) => {
          if (entry.issues.length > 0) {
            loggedIssue = true;
            const manifestNote = formatManifestSource(entry.manifestSource);
            const suffix = manifestNote ? ` (${manifestNote})` : "";
            logs.push(`  ${entry.config.label}: ${entry.issues.join(", ")}${suffix}`);
          }
        });
        if (!loggedIssue) {
          logs.push("  No mismatched runs detected.");
        }
      });
    }

    if (manifestTargetSuggestions.length > 0) {
      logs.push("=== Suggested manifest targets ===");
      manifestTargetSuggestions.forEach((suggestion) => {
        logs.push(`  ${formatManifestTargetSuggestionLog(suggestion)}`);
      });
    }

    if (manifestWrites.length > 0) {
      if (manifestFilterLogNote) {
        logs.push(manifestFilterLogNote);
      }
      logs.push(`Generated ${manifestEntries.length} manifest entr${manifestEntries.length === 1 ? "y" : "ies"}.`);
      manifestWrites.forEach(({ path, entryCount }) =>
        logs.push(`  Wrote ${entryCount} entr${entryCount === 1 ? "y" : "ies"} to ${path}`),
      );
    }

    if (suggestedManifestWrites.length > 0) {
      logs.push("=== Automatically generated suggested manifests ===");
      suggestedManifestWrites.forEach(({ path, entryCount, sourcePath }) => {
        logs.push(`  ${sourcePath} → ${path} entries=${entryCount}`);
      });
    }

    if (blockedSuggestedManifestWrites.length > 0) {
      logs.push(
        `Manifest queue coverage gating active — skipped ${blockedSuggestedManifestWrites.length} automatically generated manifest${
          blockedSuggestedManifestWrites.length === 1 ? "" : "s"
        }. ` +
          `Rerun the manifest-queue tests or pass --${SWEEP_MANIFEST_OVERRIDE_FLAG}=true to override.`,
      );
      blockedSuggestedManifestWrites.forEach((suggestion) => {
        logs.push(`  ${formatManifestTargetSuggestionLog(suggestion)}`);
      });
      if (blockedManifestPlans.length > 0) {
        logs.push("Blocked manifest refresh plan:");
        blockedManifestPlans.forEach((plan) => {
          logs.push(
            `  ${plan.sourcePath} → ${plan.path} entries=${plan.entryCount} mismatched=${plan.mismatchedRuns}/${plan.totalRuns}`,
          );
        });
        logs.push(
          "  Rerun the manifest-queue unit tests to refresh the sentinel, then invoke --sweep-manifest to write these outputs.",
        );
      }
    }

    if (appliedBlockedManifestPlanSweeps.length > 0) {
      logs.push("=== Blocked manifest plan sweep entries ===");
      appliedBlockedManifestPlanSweeps.forEach((entry) => {
        const recordedAtNote = entry.recordedAt ? ` recordedAt=${entry.recordedAt}` : "";
        logs.push(
          `  ${entry.sourcePath} → ${entry.path} entries=${entry.entryCount} planIndex=${entry.planIndex} plan=${entry.planRecordPath}${recordedAtNote}`,
        );
      });
    }

    if (appliedBlockedManifestPlanWrites.length > 0) {
      logs.push("=== Blocked manifest refresh writes ===");
      appliedBlockedManifestPlanWrites.forEach((write) => {
        const recordedAtNote = write.recordedAt ? ` recordedAt=${write.recordedAt}` : "";
        logs.push(
          `  ${write.sourcePath} → ${write.path} entries=${write.entryCount} planIndex=${write.planIndex} plan=${write.planRecordPath}${recordedAtNote}`,
        );
      });
    }

    if (blockedManifestPlanInputWarnings.length > 0) {
      logs.push("Blocked manifest plan inputs without entries:");
      blockedManifestPlanInputWarnings.forEach((warning) => logs.push(`  ${warning}`));
    }

    if (enqueuedSuggestedManifestPaths.length > 0) {
      logs.push("=== Queued suggested manifests for next run ===");
      enqueuedSuggestedManifestPaths.forEach((path) => {
        logs.push(`  ${path}`);
      });
    }

    if (queueReplayGatingLog) {
      logs.push(queueReplayGatingLog);
      blockedQueuedManifestInputPaths.forEach((path) => {
        logs.push(`  ${path}`);
      });
    }

    const manifestQueueStatusLog: string[] = [
      `tested=${manifestQueueTestStatus.tested ? "true" : "false"}`,
    ];
    if (manifestQueueTestStatus.testedAt) {
      manifestQueueStatusLog.push(`testedAt=${manifestQueueTestStatus.testedAt}`);
    }
    if (manifestQueueTestStatus.revision !== undefined) {
      manifestQueueStatusLog.push(`revision=${manifestQueueTestStatus.revision}`);
    }
    logs.push(`Manifest queue coverage ${manifestQueueStatusLog.join(" ")}`);
    if (manifestQueueTestEvaluation.warnings.length > 0) {
      logs.push("Manifest queue coverage warnings:");
      manifestQueueTestEvaluation.warnings.forEach((warning) => {
        logs.push(`  - ${warning}`);
      });
      logs.push(
        "Manifest queue coverage gating active — rerun the manifest-queue unit tests before trusting new sweep manifests.",
      );
    }
    if (manifestQueueOverrideLog) {
      logs.push(manifestQueueOverrideLog);
    }

    const manifestReplaySummaries =
      manifestReplaySources.size > 0 ? Array.from(manifestReplaySources.values()) : undefined;

    const metadata = {
      sweep: snapshots.map(buildSnapshotMetadata),
      ...(recordedLocation ? { recordedSweepFile: recordedLocation } : {}),
      ...(sweepSummary ? { sweepSummary } : {}),
      ...(sweepFocusModes.size > 0 ? { sweepFocus: Array.from(sweepFocusModes) } : {}),
      ...(focusIssues ? { filteredSweep: snapshotsForLog.map(buildSnapshotMetadata) } : {}),
      ...(diffSummaries.length > 0
        ? {
            consumerDiffs: diffSummaries.map(({ path, summary }) => ({
              path,
              summary,
            })),
          }
        : {}),
      ...(focusDiffs
        ? {
            filteredConsumerDiffs: diffSummariesForLog.map(({ path, summary }) => ({
              path,
              summary,
            })),
          }
        : {}),
      ...(manifestWriteMetadata.length > 0
        ? {
            generatedManifests: manifestWriteMetadata,
            ...(manifestEntries.length > 0 ? { manifestEntryCount: manifestEntries.length } : {}),
          }
        : {}),
      ...(suggestedManifestWrites.length > 0
        ? {
            suggestedManifestWrites: suggestedManifestWrites.map((write) => ({
              path: write.path,
              entryCount: write.entryCount,
              sourcePath: write.sourcePath,
            })),
          }
        : {}),
      ...(resolvedQueuedManifestInputs.length > 0
        ? { queuedManifestInputs: resolvedQueuedManifestInputs }
        : {}),
      ...(queuedManifestReplayPaths.length > 0
        ? { queuedManifestReplays: queuedManifestReplayPaths }
        : {}),
      ...(enqueuedSuggestedManifestPaths.length > 0
        ? { queuedManifestOutputs: enqueuedSuggestedManifestPaths }
        : {}),
      ...(manifestReplayErrors.length > 0
        ? { queuedManifestReplayErrors: manifestReplayErrors }
        : {}),
      ...(manifestReplaySummaries ? { manifestReplays: manifestReplaySummaries } : {}),
      ...(sourceCoverage ? { sourceCoverage } : {}),
      ...(manifestTargetSuggestions.length > 0 ? { manifestTargetSuggestions } : {}),
      ...(appliedBlockedManifestPlanWrites.length > 0
        ? { appliedBlockedManifestPlans: appliedBlockedManifestPlanWrites }
        : {}),
      ...(appliedBlockedManifestPlanSweeps.length > 0
        ? { appliedBlockedManifestPlanSweeps }
        : {}),
      ...(blockedManifestPlanInputWarnings.length > 0
        ? { blockedManifestPlanInputWarnings }
        : {}),
      ...(blockedSuggestedManifestWrites.length > 0
        ? {
            blockedSuggestedManifestWrites: blockedSuggestedManifestWrites.map((suggestion) => ({
              path: suggestion.suggestedPath,
              sourcePath: suggestion.sourcePath,
              mismatchedRuns: suggestion.mismatchedRuns,
              totalRuns: suggestion.totalRuns,
              ...(suggestion.entryCount !== undefined ? { entryCount: suggestion.entryCount } : {}),
            })),
          }
        : {}),
      ...(blockedQueuedManifestInputPaths.length > 0
        ? { blockedQueuedManifestInputs: blockedQueuedManifestInputPaths }
        : {}),
      ...(blockedManifestPlans.length > 0 ? { blockedManifestPlans } : {}),
      manifestQueue: manifestQueueSummary,
      manifestQueueTestStatus: {
        ...manifestQueueTestStatus,
        stale: manifestQueueTestEvaluation.stale,
        thresholdMs: manifestQueueTestEvaluation.thresholdMs,
        ...(manifestQueueTestEvaluation.ageMs !== undefined
          ? { ageMs: manifestQueueTestEvaluation.ageMs }
          : {}),
        ...(manifestQueueTestEvaluation.issues.length > 0
          ? { issues: manifestQueueTestEvaluation.issues }
          : {}),
        ...(manifestQueueTestEvaluation.warnings.length > 0
          ? { warnings: manifestQueueTestEvaluation.warnings }
          : {}),
      },
      ...(manifestQueueTestEvaluation.issues.length > 0
        ? { manifestQueueTestIssues: manifestQueueTestEvaluation.issues }
        : {}),
      ...(manifestQueueTestEvaluation.warnings.length > 0
        ? { manifestQueueTestWarnings: manifestQueueTestEvaluation.warnings }
        : {}),
      ...(manifestQueueTestEvaluation.ageMs !== undefined
        ? { manifestQueueTestAgeMs: manifestQueueTestEvaluation.ageMs }
        : {}),
      manifestQueueTestThresholdMs: manifestQueueTestEvaluation.thresholdMs,
      ...(manifestQueueTestEvaluation.stale ? { manifestQueueTestStale: true } : {}),
      ...(manifestQueueOverrideReasons.length > 0
        ? {
            manifestQueueTestOverride: {
              flag: SWEEP_MANIFEST_OVERRIDE_FLAG,
              issues: manifestQueueGateIssues,
              reasons: manifestQueueOverrideReasons,
            },
          }
        : {}),
    };

    return { logs, metadata };
  },
};
