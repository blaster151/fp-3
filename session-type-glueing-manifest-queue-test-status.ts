import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH = resolve(
  "session-type-glueing-manifest-queue-test-status.json",
);

export const SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION = 1 as const;

export interface SessionTypeGlueingManifestQueueCoverageGateStatus {
  readonly checkedAt: string;
  readonly issues: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
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
  return { checkedAt: record.checkedAt, issues, warnings } satisfies SessionTypeGlueingManifestQueueCoverageGateStatus;
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

export const markSessionTypeGlueingManifestQueueTested = (options?: {
  readonly testedAt?: string;
  readonly revision?: number;
  readonly coverageGate?: Partial<SessionTypeGlueingManifestQueueCoverageGateStatus>;
}): SessionTypeGlueingManifestQueueTestStatusRecord => {
  const testedAt = options?.testedAt ?? new Date().toISOString();
  const revision =
    options?.revision ?? SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION;
  const coverageGate = options?.coverageGate
    ? {
        checkedAt: options.coverageGate.checkedAt ?? testedAt,
        issues: Array.from(options.coverageGate.issues ?? []),
        warnings: Array.from(options.coverageGate.warnings ?? []),
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
  return entries;
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
