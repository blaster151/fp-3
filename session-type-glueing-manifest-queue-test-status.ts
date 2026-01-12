import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  collectSessionTypeGlueingBlockedManifestPlanQueueIssuesFromPaths,
  collectSessionTypeGlueingBlockedManifestPlanQueueIssuesFromQueue,
  SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
} from "./session-type-glueing-blocked-manifest-plan-queue";
import { SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH } from "./session-type-glueing-manifest-queue";

export const SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH = resolve(
  "session-type-glueing-manifest-queue-test-status.json",
);

export const SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION = 1 as const;

export interface SessionTypeGlueingManifestQueueCoverageGateStatus {
  readonly checkedAt: string;
  readonly issues: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly blockedManifestPlanQueueIssues?: ReadonlyArray<string>;
  readonly queueSnapshotPaths?: SessionTypeGlueingManifestQueueQueueSnapshotPaths;
  readonly queueSnapshotPathsInferred?: boolean;
}

export interface SessionTypeGlueingManifestQueueQueueSnapshotPaths {
  readonly manifestQueuePath: string;
  readonly blockedManifestPlanQueuePath: string;
}

export interface SessionTypeGlueingManifestQueueTestStatusRecord {
  readonly testedAt: string;
  readonly revision: number;
  readonly coverageGate?: SessionTypeGlueingManifestQueueCoverageGateStatus | undefined;
}

export interface SessionTypeGlueingManifestQueueTestStatus {
  readonly tested: boolean;
  readonly testedAt?: string;
  readonly revision?: number;
  readonly coverageGate?: SessionTypeGlueingManifestQueueCoverageGateStatus | undefined;
}

export interface SessionTypeManifestQueueTestCoverageGateCollection {
  readonly issues: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

export const SESSION_TYPE_MANIFEST_QUEUE_TEST_MAX_AGE_DAYS = 14 as const;
export const SESSION_TYPE_MANIFEST_QUEUE_TEST_MAX_AGE_MS =
  SESSION_TYPE_MANIFEST_QUEUE_TEST_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export type SessionTypeManifestQueueTestIssue =
  | "missing"
  | "testedAtMissing"
  | "invalidTimestamp"
  | "futureTimestamp"
  | "stale"
  | "revisionMismatch";

export interface SessionTypeGlueingManifestQueueTestEvaluation {
  readonly stale: boolean;
  readonly issues: ReadonlyArray<SessionTypeManifestQueueTestIssue>;
  readonly warnings: ReadonlyArray<string>;
  readonly thresholdMs: number;
  readonly ageMs?: number;
}

const asCoverageGateStatus = (
  value: unknown,
): SessionTypeGlueingManifestQueueCoverageGateStatus | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Partial<SessionTypeGlueingManifestQueueCoverageGateStatus> & Record<string, unknown>;
  if (typeof record.checkedAt !== "string") {
    return undefined;
  }
  const issues = Array.isArray(record.issues)
    ? record.issues.filter((entry): entry is string => typeof entry === "string")
    : [];
  const warnings = Array.isArray(record.warnings)
    ? record.warnings.filter((entry): entry is string => typeof entry === "string")
    : [];
  const blockedManifestPlanQueueIssues = Array.isArray(record.blockedManifestPlanQueueIssues)
    ? record.blockedManifestPlanQueueIssues.filter((entry): entry is string => typeof entry === "string")
    : [];
  const rawQueueSnapshotPaths = record.queueSnapshotPaths;
  const manifestQueuePath =
    rawQueueSnapshotPaths && typeof rawQueueSnapshotPaths === "object"
      ? (rawQueueSnapshotPaths as { manifestQueuePath?: unknown }).manifestQueuePath
      : undefined;
  const blockedManifestPlanQueuePath =
    rawQueueSnapshotPaths && typeof rawQueueSnapshotPaths === "object"
      ? (rawQueueSnapshotPaths as { blockedManifestPlanQueuePath?: unknown }).blockedManifestPlanQueuePath
      : undefined;
  const hasManifestQueuePath = typeof manifestQueuePath === "string";
  const hasBlockedManifestPlanQueuePath = typeof blockedManifestPlanQueuePath === "string";
  const queueSnapshotPaths: SessionTypeGlueingManifestQueueQueueSnapshotPaths = {
    manifestQueuePath: hasManifestQueuePath
      ? manifestQueuePath
      : SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
    blockedManifestPlanQueuePath: hasBlockedManifestPlanQueuePath
      ? blockedManifestPlanQueuePath
      : SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
  } satisfies SessionTypeGlueingManifestQueueQueueSnapshotPaths;
  const queueSnapshotPathsInferred = !(hasManifestQueuePath && hasBlockedManifestPlanQueuePath);
  const queueSnapshotWarnings = queueSnapshotPathsInferred
    ? [
        "Manifest-queue sentinel omitted queue snapshot paths; defaulted to live manifest/blocked-plan queue files. Refresh session-type manifest-queue tests to capture the preserved snapshots.",
      ]
    : [];
  return {
    checkedAt: record.checkedAt,
    issues,
    warnings: [...warnings, ...queueSnapshotWarnings],
    ...(blockedManifestPlanQueueIssues.length > 0 ? { blockedManifestPlanQueueIssues } : {}),
    queueSnapshotPaths,
    ...(queueSnapshotPathsInferred ? { queueSnapshotPathsInferred: true } : {}),
  } satisfies SessionTypeGlueingManifestQueueCoverageGateStatus;
};

const readStatusRecord = (): SessionTypeGlueingManifestQueueTestStatusRecord | undefined => {
  try {
    const raw = readFileSync(SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { testedAt?: unknown }).testedAt === "string" &&
      typeof (parsed as { revision?: unknown }).revision === "number"
    ) {
      const record = parsed as {
        testedAt: string;
        revision: number;
        coverageGate?: unknown;
      };
      return {
        testedAt: record.testedAt,
        revision: record.revision,
        ...(record.coverageGate ? { coverageGate: asCoverageGateStatus(record.coverageGate) } : {}),
      } satisfies SessionTypeGlueingManifestQueueTestStatusRecord;
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
};

export const readSessionTypeGlueingManifestQueueTestStatus = (): SessionTypeGlueingManifestQueueTestStatus => {
  const record = readStatusRecord();
  if (!record) {
    return { tested: false };
  }
  return {
    tested: true,
    testedAt: record.testedAt,
    revision: record.revision,
    ...(record.coverageGate ? { coverageGate: record.coverageGate } : {}),
  };
};

const toManifestQueueTestStatus = (
  status:
    | SessionTypeGlueingManifestQueueTestStatus
    | SessionTypeGlueingManifestQueueTestStatusRecord,
): SessionTypeGlueingManifestQueueTestStatus =>
  "tested" in status
    ? status
    : {
        tested: true,
        testedAt: status.testedAt,
        revision: status.revision,
        coverageGate: status.coverageGate,
      } satisfies SessionTypeGlueingManifestQueueTestStatus;

export const markSessionTypeGlueingManifestQueueTested = (options?: {
  readonly testedAt?: string;
  readonly revision?: number;
  readonly coverageGate?: Partial<SessionTypeGlueingManifestQueueCoverageGateStatus>;
}): SessionTypeGlueingManifestQueueTestStatusRecord => {
  const testedAt = options?.testedAt ?? new Date().toISOString();
  const revision =
    options?.revision ?? SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION;
  const queueSnapshotPaths =
    options?.coverageGate?.queueSnapshotPaths ??
    ({
      manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
      blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
    } satisfies SessionTypeGlueingManifestQueueQueueSnapshotPaths);
  const queueSnapshotPathsInferred =
    options?.coverageGate?.queueSnapshotPathsInferred ?? !options?.coverageGate?.queueSnapshotPaths;
  const coverageGate = options?.coverageGate
    ? {
        checkedAt: options.coverageGate.checkedAt ?? testedAt,
        issues: Array.from(options.coverageGate.issues ?? []),
        warnings: Array.from(options.coverageGate.warnings ?? []),
        ...(options.coverageGate.blockedManifestPlanQueueIssues &&
        options.coverageGate.blockedManifestPlanQueueIssues.length > 0
          ? { blockedManifestPlanQueueIssues: Array.from(options.coverageGate.blockedManifestPlanQueueIssues) }
          : {}),
        queueSnapshotPaths,
        ...(queueSnapshotPathsInferred ? { queueSnapshotPathsInferred: true } : {}),
      }
    : undefined;
  const record: SessionTypeGlueingManifestQueueTestStatusRecord = {
    testedAt,
    revision,
    ...(coverageGate ? { coverageGate } : {}),
  };
  const resolved = SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH;
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
};

export const SESSION_TYPE_MANIFEST_QUEUE_TESTED_PREFIX =
  "sessionType.manifestQueue.tested=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_TESTED_AT_PREFIX =
  "sessionType.manifestQueue.testedAt=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_TEST_REVISION_PREFIX =
  "sessionType.manifestQueue.testRevision=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_TEST_ISSUE_PREFIX =
  "sessionType.manifestQueue.issue=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_CHECKED_AT_PREFIX =
  "sessionType.manifestQueue.coverageGate.checkedAt=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_ISSUE_PREFIX =
  "sessionType.manifestQueue.coverageGate.issue=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_WARNING_PREFIX =
  "sessionType.manifestQueue.coverageGate.warning=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX =
  "sessionType.manifestQueue.coverageGate.blockedManifestPlanQueueIssue=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_INFERRED_ENTRY =
  "sessionType.manifestQueue.coverageGate.queue.inferred=true" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX =
  "sessionType.manifestQueue.coverageGate.consolidatedIssue=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX =
  "sessionType.manifestQueue.coverageGate.consolidatedWarning=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_MANIFEST_PREFIX =
  "sessionType.manifestQueue.coverageGate.queue.manifest=" as const;
export const SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_BLOCKED_PLAN_PREFIX =
  "sessionType.manifestQueue.coverageGate.queue.blockedPlan=" as const;

export const collectSessionTypeManifestQueueCoverageGateMetadataEntriesFromSessionMetadata = (
  sessionMetadata: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> =>
  (sessionMetadata ?? []).filter(
    (entry) =>
      typeof entry === "string" &&
      (entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX) ||
        entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX) ||
        entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_CHECKED_AT_PREFIX) ||
        entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_ISSUE_PREFIX) ||
        entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_WARNING_PREFIX) ||
        entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX) ||
        entry === SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_INFERRED_ENTRY ||
        entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_MANIFEST_PREFIX) ||
        entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_BLOCKED_PLAN_PREFIX)),
  );

export const extractSessionTypeManifestQueueCoverageGateQueueSnapshotPathsFromMetadataEntries = (
  entries: ReadonlyArray<string> | undefined,
): {
  readonly queueSnapshotPaths?: SessionTypeGlueingManifestQueueQueueSnapshotPaths;
  readonly queueSnapshotPathsInferred?: boolean;
} => {
  let manifestQueuePath: string | undefined;
  let blockedManifestPlanQueuePath: string | undefined;
  let inferred = false;
  (entries ?? []).forEach((entry) => {
    if (entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_MANIFEST_PREFIX)) {
      manifestQueuePath = entry.slice(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_MANIFEST_PREFIX.length);
      return;
    }
    if (entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_BLOCKED_PLAN_PREFIX)) {
      blockedManifestPlanQueuePath = entry.slice(
        SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_BLOCKED_PLAN_PREFIX.length,
      );
      return;
    }
    if (entry === SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_INFERRED_ENTRY) {
      inferred = true;
    }
  });
  const queueSnapshotPaths =
    manifestQueuePath && blockedManifestPlanQueuePath
      ? {
          manifestQueuePath,
          blockedManifestPlanQueuePath,
        }
      : undefined;
  return {
    ...(queueSnapshotPaths ? { queueSnapshotPaths } : {}),
    ...(inferred ? { queueSnapshotPathsInferred: true } : {}),
  } satisfies {
    readonly queueSnapshotPaths?: SessionTypeGlueingManifestQueueQueueSnapshotPaths;
    readonly queueSnapshotPathsInferred?: boolean;
  };
};

export const formatSessionTypeManifestQueueTestMetadataEntries = (
  status: SessionTypeGlueingManifestQueueTestStatus,
): ReadonlyArray<string> => {
  const entries: string[] = [
    `${SESSION_TYPE_MANIFEST_QUEUE_TESTED_PREFIX}${status.tested ? "true" : "false"}`,
  ];
  if (status.testedAt) {
    entries.push(`${SESSION_TYPE_MANIFEST_QUEUE_TESTED_AT_PREFIX}${status.testedAt}`);
  }
  if (status.revision !== undefined) {
    entries.push(`${SESSION_TYPE_MANIFEST_QUEUE_TEST_REVISION_PREFIX}${status.revision}`);
  }
  return entries;
};

export const formatSessionTypeManifestQueueTestCoverageGateMetadataEntries = (
  status:
    | SessionTypeGlueingManifestQueueTestStatus
    | SessionTypeGlueingManifestQueueTestStatusRecord,
  options?: {
    readonly now?: Date;
    readonly maxAgeMs?: number;
    readonly expectedRevision?: number;
    readonly coverageGateMetadataEntries?: ReadonlyArray<string>;
    readonly sessionMetadata?: ReadonlyArray<string>;
  },
): ReadonlyArray<string> => {
  const coverageGateMetadataEntries = [
    ...(options?.coverageGateMetadataEntries ?? []),
    ...collectSessionTypeManifestQueueCoverageGateMetadataEntriesFromSessionMetadata(options?.sessionMetadata),
  ];
  const consolidated = collectSessionTypeManifestQueueTestCoverageGateIssues(
    status,
    coverageGateMetadataEntries.length > 0
      ? { ...options, coverageGateMetadataEntries }
      : options,
  );
  const entries: string[] = [];
  consolidated.issues.forEach((issue) =>
    entries.push(`${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX}${issue}`),
  );
  consolidated.warnings.forEach((warning) =>
    entries.push(`${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX}${warning}`),
  );
  return entries;
};

export const formatSessionTypeManifestQueueTestIssueEntries = (
  issues: ReadonlyArray<SessionTypeManifestQueueTestIssue>,
): ReadonlyArray<string> =>
  issues.map((issue) => `${SESSION_TYPE_MANIFEST_QUEUE_TEST_ISSUE_PREFIX}${issue}`);

export const formatSessionTypeManifestQueueCoverageGateMetadataEntries = (
  coverageGate?: SessionTypeGlueingManifestQueueCoverageGateStatus,
): ReadonlyArray<string> => {
  if (!coverageGate) {
    return [];
  }
  const entries: string[] = [
    `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_CHECKED_AT_PREFIX}${coverageGate.checkedAt}`,
  ];
  coverageGate.issues.forEach((issue) =>
    entries.push(`${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_ISSUE_PREFIX}${issue}`),
  );
  coverageGate.warnings.forEach((warning) =>
    entries.push(`${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_WARNING_PREFIX}${warning}`),
  );
  coverageGate.blockedManifestPlanQueueIssues?.forEach((issue) =>
    entries.push(
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX}${issue}`,
    ),
  );
  if (coverageGate.queueSnapshotPathsInferred) {
    entries.push("sessionType.manifestQueue.coverageGate.queue.inferred=true");
  }
  if (coverageGate.queueSnapshotPaths) {
    entries.push(
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_MANIFEST_PREFIX}${coverageGate.queueSnapshotPaths.manifestQueuePath}`,
    );
    entries.push(
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_BLOCKED_PLAN_PREFIX}${coverageGate.queueSnapshotPaths.blockedManifestPlanQueuePath}`,
    );
  }
  return entries;
};

export const collectSessionTypeManifestQueueCoverageGateIssues = (
  coverageGate?: SessionTypeGlueingManifestQueueCoverageGateStatus,
): ReadonlyArray<string> => {
  if (!coverageGate) {
    return [];
  }
  const combinedIssues = new Set<string>(coverageGate.issues ?? []);
  (coverageGate.blockedManifestPlanQueueIssues ?? []).forEach((issue) =>
    combinedIssues.add(issue),
  );
  if (coverageGate.queueSnapshotPathsInferred) {
    combinedIssues.add("queueSnapshotPathsInferred");
  }
  return Array.from(combinedIssues);
};

export const collectSessionTypeManifestQueueTestCoverageGateIssuesFromMetadataEntries = (
  entries: ReadonlyArray<string> | undefined,
): SessionTypeManifestQueueTestCoverageGateCollection => {
  if (!entries || entries.length === 0) {
    return { issues: [], warnings: [] } satisfies SessionTypeManifestQueueTestCoverageGateCollection;
  }
  const issues = new Set<string>();
  const warnings = new Set<string>();
  entries.forEach((entry) => {
    if (entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX)) {
      issues.add(entry.slice(SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX.length));
      return;
    }
    if (entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX)) {
      warnings.add(
        entry.slice(SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX.length),
      );
      return;
    }
    if (entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_ISSUE_PREFIX)) {
      issues.add(entry.slice(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_ISSUE_PREFIX.length));
      return;
    }
    if (entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_WARNING_PREFIX)) {
      warnings.add(entry.slice(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_WARNING_PREFIX.length));
      return;
    }
    if (entry.startsWith(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX)) {
      issues.add(
        entry.slice(SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX.length),
      );
      return;
    }
    if (entry === SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_INFERRED_ENTRY) {
      issues.add("queueSnapshotPathsInferred");
      return;
    }
  });
  return {
    issues: Array.from(issues),
    warnings: Array.from(warnings),
  } satisfies SessionTypeManifestQueueTestCoverageGateCollection;
};

const ISSUE_MESSAGES: Record<SessionTypeManifestQueueTestIssue, string> = {
  missing: "Manifest queue coverage sentinel missing; rerun the manifest queue tests.",
  testedAtMissing: "Manifest queue coverage timestamp missing; rerun the queue tests.",
  invalidTimestamp: "Manifest queue coverage timestamp invalid; rerun the queue tests.",
  futureTimestamp:
    "Manifest queue coverage timestamp is in the future; ensure the sentinel reflects the latest successful test run.",
  stale: "Manifest queue coverage is older than the allowed threshold; rerun the queue tests.",
  revisionMismatch:
    "Manifest queue coverage revision mismatch; rerun the queue tests with the current helpers.",
};

const formatStaleWarning = (ageMs: number, thresholdMs: number): string => {
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const thresholdDays = Math.floor(thresholdMs / (24 * 60 * 60 * 1000));
  return `Manifest queue coverage is ${ageDays} day${ageDays === 1 ? "" : "s"} old (threshold ${thresholdDays} day${
    thresholdDays === 1 ? "" : "s"
  }).`;
};

export const evaluateSessionTypeGlueingManifestQueueTestStatus = (
  status: SessionTypeGlueingManifestQueueTestStatus,
  options?: {
    readonly now?: Date;
    readonly maxAgeMs?: number;
    readonly expectedRevision?: number;
  },
): SessionTypeGlueingManifestQueueTestEvaluation => {
  const issues = new Set<SessionTypeManifestQueueTestIssue>();
  const warnings: string[] = [];
  const nowMs = options?.now?.getTime() ?? Date.now();
  const thresholdMs = options?.maxAgeMs ?? SESSION_TYPE_MANIFEST_QUEUE_TEST_MAX_AGE_MS;
  const expectedRevision =
    options?.expectedRevision ?? SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION;

  let stale = false;
  let ageMs: number | undefined;

  const pushIssue = (
    issue: SessionTypeManifestQueueTestIssue,
    message: string = ISSUE_MESSAGES[issue],
  ): void => {
    issues.add(issue);
    warnings.push(message);
    stale = true;
  };

  if (!status.tested) {
    pushIssue("missing");
    return {
      stale,
      issues: Array.from(issues),
      warnings,
      thresholdMs,
    };
  }

  if (status.revision !== undefined && status.revision !== expectedRevision) {
    pushIssue("revisionMismatch");
  }

  if (!status.testedAt) {
    pushIssue("testedAtMissing");
  } else {
    const parsed = Date.parse(status.testedAt);
    if (!Number.isFinite(parsed)) {
      pushIssue("invalidTimestamp");
    } else {
      ageMs = nowMs - parsed;
      if (ageMs < 0) {
        pushIssue("futureTimestamp");
      } else if (ageMs > thresholdMs) {
        pushIssue("stale", formatStaleWarning(ageMs, thresholdMs));
      }
    }
  }

  return {
    stale,
    issues: Array.from(issues),
    warnings,
    thresholdMs,
    ...(ageMs !== undefined ? { ageMs } : {}),
  } satisfies SessionTypeGlueingManifestQueueTestEvaluation;
};

export const collectSessionTypeManifestQueueTestCoverageGateIssues = (
  status:
    | SessionTypeGlueingManifestQueueTestStatus
    | SessionTypeGlueingManifestQueueTestStatusRecord,
  options?: {
    readonly now?: Date;
    readonly maxAgeMs?: number;
    readonly expectedRevision?: number;
    readonly coverageGateMetadataEntries?: ReadonlyArray<string>;
    readonly sessionMetadata?: ReadonlyArray<string>;
  },
): SessionTypeManifestQueueTestCoverageGateCollection => {
  const normalizedStatus = toManifestQueueTestStatus(status);
  const evaluation = evaluateSessionTypeGlueingManifestQueueTestStatus(normalizedStatus, options);
  const coverageGateIssues = collectSessionTypeManifestQueueCoverageGateIssues(normalizedStatus.coverageGate);
  const coverageGateWarnings = normalizedStatus.coverageGate?.warnings ?? [];
  const issues = new Set<string>([...evaluation.issues, ...coverageGateIssues]);
  const warnings = new Set<string>([...evaluation.warnings, ...coverageGateWarnings]);
  const coverageGateMetadataEntries = [
    ...(options?.coverageGateMetadataEntries ?? []),
    ...collectSessionTypeManifestQueueCoverageGateMetadataEntriesFromSessionMetadata(options?.sessionMetadata),
  ];
  if (coverageGateMetadataEntries.length > 0) {
    const consolidated = collectSessionTypeManifestQueueTestCoverageGateIssuesFromMetadataEntries(
      coverageGateMetadataEntries,
    );
    consolidated.issues.forEach((issue) => issues.add(issue));
    consolidated.warnings.forEach((warning) => warnings.add(warning));
  }
  return { issues: Array.from(issues), warnings: Array.from(warnings) } satisfies SessionTypeManifestQueueTestCoverageGateCollection;
};

export const collectSessionTypeManifestQueueTestCoverageGateIssuesFromSessionMetadata = (
  sessionMetadata: ReadonlyArray<string> | undefined,
): SessionTypeManifestQueueTestCoverageGateCollection =>
  collectSessionTypeManifestQueueTestCoverageGateIssuesFromMetadataEntries(
    collectSessionTypeManifestQueueCoverageGateMetadataEntriesFromSessionMetadata(sessionMetadata),
  );

export const collectSessionTypeGlueingManifestQueueCoverageGateBlockedManifestPlanQueueIssues = (options?: {
  readonly blockedManifestPlanQueuePaths?: ReadonlyArray<string>;
}): string[] => {
  const paths = options?.blockedManifestPlanQueuePaths;
  return paths
    ? collectSessionTypeGlueingBlockedManifestPlanQueueIssuesFromPaths(paths)
    : collectSessionTypeGlueingBlockedManifestPlanQueueIssuesFromQueue();
};

export const markSessionTypeGlueingManifestQueueTestedFromQueues = (options?: {
  readonly testedAt?: string;
  readonly revision?: number;
  readonly coverageGate?: Partial<SessionTypeGlueingManifestQueueCoverageGateStatus>;
  readonly blockedManifestPlanQueuePaths?: ReadonlyArray<string>;
  readonly queueSnapshotPaths?: SessionTypeGlueingManifestQueueQueueSnapshotPaths;
}): SessionTypeGlueingManifestQueueTestStatusRecord => {
  const blockedManifestPlanQueueIssues = collectSessionTypeGlueingManifestQueueCoverageGateBlockedManifestPlanQueueIssues(
    options?.blockedManifestPlanQueuePaths
      ? { blockedManifestPlanQueuePaths: options.blockedManifestPlanQueuePaths }
      : undefined,
  );
  const coverageGate = options?.coverageGate ?? {};
  const coverageGateBlockedIssues = Array.from(
    new Set([...(coverageGate.blockedManifestPlanQueueIssues ?? []), ...blockedManifestPlanQueueIssues]),
  );
  const queueSnapshotPaths =
    options?.queueSnapshotPaths ??
    ({
      manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
      blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
    } satisfies SessionTypeGlueingManifestQueueQueueSnapshotPaths);
  const queueSnapshotPathsInferred = options?.coverageGate?.queueSnapshotPathsInferred ?? false;
  const nextCoverageGate: Partial<SessionTypeGlueingManifestQueueCoverageGateStatus> | undefined =
    coverageGateBlockedIssues.length > 0 || coverageGate.issues || coverageGate.warnings
      ? {
          ...(coverageGate.checkedAt ? { checkedAt: coverageGate.checkedAt } : {}),
          issues: Array.from(coverageGate.issues ?? []),
          warnings: Array.from(coverageGate.warnings ?? []),
          ...(coverageGateBlockedIssues.length > 0
            ? { blockedManifestPlanQueueIssues: coverageGateBlockedIssues }
            : {}),
          queueSnapshotPaths,
          ...(queueSnapshotPathsInferred ? { queueSnapshotPathsInferred: true } : {}),
        }
      : undefined;
  return markSessionTypeGlueingManifestQueueTested({
    ...options,
    ...(nextCoverageGate ? { coverageGate: nextCoverageGate } : {}),
  });
};
