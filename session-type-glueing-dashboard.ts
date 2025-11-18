import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { RunnableExampleFlag } from "./examples/runnable/types";
import { describeSessionTypeGlueingAssignments, type SessionTypeGlueingSweepConfig } from "./session-type-glueing-sweep";

export interface SessionTypeGlueingSweepRunSnapshot {
  readonly config: SessionTypeGlueingSweepConfig;
  readonly runnerHolds?: boolean;
  readonly runnerMismatches?: number;
  readonly sessionMetadata: ReadonlyArray<string>;
  readonly glueingMetadata: ReadonlyArray<string>;
  readonly alignmentMetadata: ReadonlyArray<string>;
  readonly alignmentNotes: ReadonlyArray<string>;
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
  readonly replayErrors?: ReadonlyArray<SessionTypeGlueingManifestQueueReplayError>;
  readonly tested?: boolean;
  readonly testedAt?: string;
  readonly testRevision?: number;
  readonly testAgeMs?: number;
  readonly testThresholdMs?: number;
  readonly testStale?: boolean;
  readonly testIssues?: ReadonlyArray<string>;
  readonly testWarnings?: ReadonlyArray<string>;
  readonly testOverride?: {
    readonly flag: string;
    readonly issues: ReadonlyArray<string>;
    readonly reasons?: ReadonlyArray<string>;
  };
}

export interface SessionTypeGlueingSweepSourceCoverage {
  readonly manifestInputs?: number;
  readonly blockedPlans?: number;
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
  readonly blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
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
    const record = entry as Partial<SessionTypeGlueingBlockedManifestPlanEntry>;
    if (
      typeof record.path !== "string" ||
      typeof record.sourcePath !== "string" ||
      typeof record.mismatchedRuns !== "number" ||
      typeof record.totalRuns !== "number" ||
      typeof record.entryCount !== "number" ||
      !Array.isArray(record.entries)
    ) {
      continue;
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
      continue;
    }
    plans.push({
      path: record.path,
      sourcePath: record.sourcePath,
      mismatchedRuns: record.mismatchedRuns,
      totalRuns: record.totalRuns,
      entryCount: record.entryCount,
      entries,
    });
  }
  return plans;
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
    ...(summary.replayErrors && summary.replayErrors.length > 0
      ? { replayErrors: Array.from(summary.replayErrors) }
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
  return normalizeManifestQueueSummary({
    inputs: asStringArray(record.inputs),
    replays: asStringArray(record.replays),
    outputs: asStringArray(record.outputs),
    blockedInputs: asStringArray(record.blockedInputs),
    replayErrors: asManifestQueueReplayErrorArray(record.replayErrors),
    ...(tested !== undefined ? { tested } : {}),
    ...(testedAt ? { testedAt } : {}),
    ...(testRevision !== undefined ? { testRevision } : {}),
    ...(testAgeMs !== undefined ? { testAgeMs } : {}),
    ...(testThresholdMs !== undefined ? { testThresholdMs } : {}),
    ...(testStale !== undefined ? { testStale } : {}),
    ...(record.testIssues ? { testIssues: asStringArray(record.testIssues) } : {}),
    ...(record.testWarnings ? { testWarnings: asStringArray(record.testWarnings) } : {}),
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
  return {
    config,
    ...(runnerHolds !== undefined ? { runnerHolds } : {}),
    ...(runnerMismatches !== undefined ? { runnerMismatches } : {}),
    sessionMetadata,
    glueingMetadata,
    alignmentMetadata,
    alignmentNotes,
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
    blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
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
    ...(options.blockedManifestPlans && options.blockedManifestPlans.length > 0
      ? { blockedManifestPlans: options.blockedManifestPlans }
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
    blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
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
      return {
        config: snapshot.config,
        sessionMetadata: asStringArray(snapshot.sessionMetadata),
        glueingMetadata: asStringArray(snapshot.glueingMetadata),
        alignmentMetadata: asStringArray(snapshot.alignmentMetadata),
        alignmentNotes: asStringArray(snapshot.alignmentNotes),
        ...(snapshot.runnerHolds !== undefined ? { runnerHolds: snapshot.runnerHolds } : {}),
        ...(snapshot.runnerMismatches !== undefined ? { runnerMismatches: snapshot.runnerMismatches } : {}),
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
    ...(record.blockedManifestPlans && record.blockedManifestPlans.length > 0
      ? { blockedManifestPlans: asBlockedManifestPlanArray(record.blockedManifestPlans) }
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
  readonly blockedManifestPlans?: ReadonlyArray<SessionTypeGlueingBlockedManifestPlanEntry>;
  readonly manifestQueue?: SessionTypeGlueingManifestQueueSummary;
  readonly manifestQueueIssues?: ReadonlyArray<string>;
  readonly manifestQueueWarnings?: ReadonlyArray<string>;
  readonly sourceCoverage?: SessionTypeGlueingSweepSourceCoverage;
  readonly sourceCoverageTotals: SessionTypeGlueingSourceCoverageTotals;
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
    ...(record.blockedManifestPlans ? { blockedManifestPlans: record.blockedManifestPlans } : {}),
    ...(record.manifestQueue ? { manifestQueue: record.manifestQueue } : {}),
    ...(record.manifestQueue?.testIssues && record.manifestQueue.testIssues.length > 0
      ? { manifestQueueIssues: record.manifestQueue.testIssues }
      : {}),
    ...(record.manifestQueue?.testWarnings && record.manifestQueue.testWarnings.length > 0
      ? { manifestQueueWarnings: record.manifestQueue.testWarnings }
      : {}),
    ...(record.sourceCoverage ? { sourceCoverage: record.sourceCoverage } : {}),
    sourceCoverageTotals,
  };
};
