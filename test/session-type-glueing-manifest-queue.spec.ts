import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clearSessionTypeGlueingManifestQueue,
  consumeSessionTypeGlueingManifestQueue,
  enqueueSessionTypeGlueingManifestQueue,
  peekSessionTypeGlueingManifestQueue,
  SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
} from "../session-type-glueing-manifest-queue";
import {
  markSessionTypeGlueingManifestQueueTested,
  markSessionTypeGlueingManifestQueueTestedFromQueues,
  evaluateSessionTypeGlueingManifestQueueTestStatus,
  collectSessionTypeManifestQueueTestCoverageGateIssues,
  SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION,
  SESSION_TYPE_MANIFEST_QUEUE_TEST_MAX_AGE_MS,
  SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH,
  formatSessionTypeManifestQueueCoverageGateMetadataEntries,
  formatSessionTypeManifestQueueTestCoverageGateMetadataEntries,
  collectSessionTypeManifestQueueCoverageGateIssues,
  collectSessionTypeGlueingManifestQueueCoverageGateBlockedManifestPlanQueueIssues,
  collectSessionTypeManifestQueueTestCoverageGateIssuesFromMetadataEntries,
  readSessionTypeGlueingManifestQueueTestStatus,
  SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX,
  SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_ISSUE_PREFIX,
  SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_WARNING_PREFIX,
  SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX,
  SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX,
  SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_INFERRED_ENTRY,
} from "../session-type-glueing-manifest-queue-test-status";
import {
  clearSessionTypeGlueingBlockedManifestPlanQueue,
  SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
  enqueueSessionTypeGlueingBlockedManifestPlanQueue,
  peekSessionTypeGlueingBlockedManifestPlanQueue,
} from "../session-type-glueing-blocked-manifest-plan-queue";
import { installSessionTypeGlueingManifestQueueSentinelSnapshotHooks } from "../session-type-glueing-manifest-queue-test-hooks";

installSessionTypeGlueingManifestQueueSentinelSnapshotHooks();

const readPersistedQueue = (): ReadonlyArray<string> => {
  if (!existsSync(SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH)) {
    return [];
  }
  const raw = readFileSync(SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed)
    ? parsed.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
};

describe("session-type glueing manifest queue helpers", () => {
  it("peek returns an empty array when no queue file exists", () => {
    clearSessionTypeGlueingManifestQueue();
    expect(peekSessionTypeGlueingManifestQueue()).toEqual([]);
    expect(readPersistedQueue()).toEqual([]);
  });

  it("normalizes, deduplicates, and persists enqueued entries", () => {
    clearSessionTypeGlueingManifestQueue();
    const relative = "./manifests/issues.json";
    const duplicate = resolve(relative);
    const nested = "./manifests/../manifests/secondary.json";

    const added = enqueueSessionTypeGlueingManifestQueue([relative, duplicate, nested, ""]);
    expect(added).toEqual([resolve(relative), resolve("manifests/secondary.json")]);

    const persisted = readPersistedQueue();
    expect(persisted).toEqual(expect.arrayContaining(added));
    expect(persisted.length).toBe(2);
  });

  it("ignores duplicate enqueues once entries are persisted", () => {
    clearSessionTypeGlueingManifestQueue();
    const manifestPath = resolve("./manifests/queue.json");
    enqueueSessionTypeGlueingManifestQueue([manifestPath]);
    const added = enqueueSessionTypeGlueingManifestQueue([manifestPath]);
    expect(added).toEqual([]);
    expect(readPersistedQueue()).toEqual([manifestPath]);
  });

  it("consumes the queue in FIFO order and clears the file", () => {
    clearSessionTypeGlueingManifestQueue();
    const first = resolve("./manifests/first.json");
    const second = resolve("./manifests/second.json");
    enqueueSessionTypeGlueingManifestQueue([first]);
    enqueueSessionTypeGlueingManifestQueue([second]);

    const consumed = consumeSessionTypeGlueingManifestQueue();
    expect(consumed).toEqual([first, second]);
    expect(peekSessionTypeGlueingManifestQueue()).toEqual([]);
    expect(readPersistedQueue()).toEqual([]);
    clearSessionTypeGlueingManifestQueue();
    const record = markSessionTypeGlueingManifestQueueTested({
      coverageGate: {
        checkedAt: "2024-03-03T00:00:00.000Z",
        issues: ["alignment.coverage:missing"],
        warnings: ["Refresh queued manifest coverage"],
        blockedManifestPlanQueueIssues: ["blockedManifestPlanQueue.pending=1 (/tmp/plan.json)"],
      },
    });
    expect(record.coverageGate?.issues).toEqual(["alignment.coverage:missing"]);
    expect(record.coverageGate?.blockedManifestPlanQueueIssues).toEqual([
      "blockedManifestPlanQueue.pending=1 (/tmp/plan.json)",
    ]);
  });

  it("formats coverage gate metadata entries", () => {
    const entries = formatSessionTypeManifestQueueCoverageGateMetadataEntries({
      checkedAt: "2024-03-04T00:00:00.000Z",
      issues: ["alignment.coverage:alpha"],
      warnings: ["Resolve λ₍coop₎ coverage drift"],
      blockedManifestPlanQueueIssues: ["blockedManifestPlanQueue.pending=1 (/tmp/plan.json)",
      ],
      queueSnapshotPaths: {
        manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
        blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
      },
    });
    expect(entries).toEqual([
      "sessionType.manifestQueue.coverageGate.checkedAt=2024-03-04T00:00:00.000Z",
      "sessionType.manifestQueue.coverageGate.issue=alignment.coverage:alpha",
      "sessionType.manifestQueue.coverageGate.warning=Resolve λ₍coop₎ coverage drift",
      "sessionType.manifestQueue.coverageGate.blockedManifestPlanQueueIssue=blockedManifestPlanQueue.pending=1 (/tmp/plan.json)",
      `sessionType.manifestQueue.coverageGate.queue.manifest=${SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH}`,
      `sessionType.manifestQueue.coverageGate.queue.blockedPlan=${SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH}`,
    ]);
  });

  it("formats consolidated manifest-queue test coverage gate metadata entries", () => {
    const entries = formatSessionTypeManifestQueueTestCoverageGateMetadataEntries(
      {
        tested: true,
        testedAt: "2024-03-01T00:00:00.000Z",
        revision: 0,
        coverageGate: {
          checkedAt: "2024-03-01T00:00:00.000Z",
          issues: ["alignment.coverage:missing"],
          warnings: ["Resolve coverage drift"],
          queueSnapshotPaths: {
            manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
            blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
          },
          queueSnapshotPathsInferred: true,
        },
      },
      { now: new Date("2024-03-05T00:00:00.000Z"), expectedRevision: 1 },
    );
    expect(entries).toEqual([
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX}revisionMismatch`,
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX}alignment.coverage:missing`,
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX}queueSnapshotPathsInferred`,
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX}Manifest queue coverage revision mismatch; rerun the queue tests with the current helpers.`,
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX}Resolve coverage drift`,
    ]);
  });

  it("parses consolidated manifest-queue coverage gate metadata entries for backlog tools", () => {
    const entries = [
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX}revisionMismatch`,
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX}alignment.coverage:missing`,
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX}Resolve coverage drift`,
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX}blockedManifestPlanQueue.pending=1 (/tmp/plan.json)`,
      SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_INFERRED_ENTRY,
    ];
    const consolidated = collectSessionTypeManifestQueueTestCoverageGateIssuesFromMetadataEntries(entries);
    expect(consolidated.issues).toEqual([
      "revisionMismatch",
      "alignment.coverage:missing",
      "blockedManifestPlanQueue.pending=1 (/tmp/plan.json)",
      "queueSnapshotPathsInferred",
    ]);
    expect(consolidated.warnings).toEqual(["Resolve coverage drift"]);
  });

  it("collects the combined coverage gate issue set for logging", () => {
    const issues = collectSessionTypeManifestQueueCoverageGateIssues({
      checkedAt: "2024-03-05T00:00:00.000Z",
      issues: ["alignment.coverage:missing"],
      warnings: [],
      blockedManifestPlanQueueIssues: [
        "blockedManifestPlanQueue.pending=1 (/tmp/plan.json)",
        "alignment.coverage:missing",
      ],
      queueSnapshotPaths: {
        manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
        blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
      },
      queueSnapshotPathsInferred: true,
    });
    expect(issues).toEqual([
      "alignment.coverage:missing",
      "blockedManifestPlanQueue.pending=1 (/tmp/plan.json)",
      "queueSnapshotPathsInferred",
    ]);
  });

  it("collapses manifest-queue test and coverage-gate issues for non-sweep tooling", () => {
    const consolidated = collectSessionTypeManifestQueueTestCoverageGateIssues(
      {
        tested: true,
        testedAt: "2024-03-01T00:00:00.000Z",
        revision: 0,
        coverageGate: {
          checkedAt: "2024-03-01T00:00:00.000Z",
          issues: ["alignment.coverage:missing"],
          warnings: ["Resolve coverage drift"],
          blockedManifestPlanQueueIssues: [
            "blockedManifestPlanQueue.pending=1 (/tmp/plan.json)",
            "alignment.coverage:missing",
          ],
          queueSnapshotPaths: {
            manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
            blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
          },
          queueSnapshotPathsInferred: true,
        },
      },
      { now: new Date("2024-03-20T00:00:00.000Z"), expectedRevision: 1 },
    );
    expect(consolidated.issues).toEqual([
      "revisionMismatch",
      "alignment.coverage:missing",
      "blockedManifestPlanQueue.pending=1 (/tmp/plan.json)",
      "queueSnapshotPathsInferred",
    ]);
    expect(consolidated.warnings).toEqual([
      "Manifest queue coverage revision mismatch; rerun the queue tests with the current helpers.",
      "Resolve coverage drift",
    ]);
  });

  it("merges consolidated metadata entries into backlog coverage-gate reports", () => {
    const consolidated = collectSessionTypeManifestQueueTestCoverageGateIssues(
      {
        tested: true,
        testedAt: "2024-03-05T00:00:00.000Z",
        revision: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION,
        coverageGate: {
          checkedAt: "2024-03-05T00:00:00.000Z",
          issues: [],
          warnings: [],
        },
      },
      {
        coverageGateMetadataEntries: [
          `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_ISSUE_PREFIX}alignment.coverage:missing`,
          `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_WARNING_PREFIX}Resolve coverage drift`,
        ],
      },
    );
    expect(consolidated.issues).toEqual(["alignment.coverage:missing"]);
    expect(consolidated.warnings).toEqual(["Resolve coverage drift"]);
  });

  it("merges session-metadata coverage gate entries when collecting test coverage gate issues", () => {
    const sessionMetadata = [
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_ISSUE_PREFIX}alignment.coverage:missing`,
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_WARNING_PREFIX}Resolve coverage drift`,
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX}blockedManifestPlanQueue.pending=1 (/tmp/plan.json)`,
      SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_INFERRED_ENTRY,
    ];
    const consolidated = collectSessionTypeManifestQueueTestCoverageGateIssues(
      {
        tested: true,
        testedAt: "2024-03-02T00:00:00.000Z",
        revision: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION,
        coverageGate: { checkedAt: "2024-03-02T00:00:00.000Z", issues: [], warnings: [] },
      },
      {
        now: new Date("2024-03-03T00:00:00.000Z"),
        sessionMetadata,
      },
    );
    expect(consolidated.issues).toEqual([
      "alignment.coverage:missing",
      "blockedManifestPlanQueue.pending=1 (/tmp/plan.json)",
      "queueSnapshotPathsInferred",
    ]);
    expect(consolidated.warnings).toEqual(["Resolve coverage drift"]);
  });

  it("formats consolidated coverage gate metadata entries from session metadata", () => {
    const sessionMetadata = [
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_ISSUE_PREFIX}alignment.coverage:missing`,
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_WARNING_PREFIX}Resolve coverage drift`,
      `${SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_BLOCKED_PLAN_QUEUE_ISSUE_PREFIX}blockedManifestPlanQueue.pending=1 (/tmp/plan.json)`,
      SESSION_TYPE_MANIFEST_QUEUE_COVERAGE_GATE_QUEUE_INFERRED_ENTRY,
    ];
    const entries = formatSessionTypeManifestQueueTestCoverageGateMetadataEntries(
      {
        tested: true,
        testedAt: "2024-03-02T00:00:00.000Z",
        revision: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION,
        coverageGate: { checkedAt: "2024-03-02T00:00:00.000Z", issues: [], warnings: [] },
      },
      {
        now: new Date("2024-03-03T00:00:00.000Z"),
        expectedRevision: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION,
        sessionMetadata,
      },
    );
    expect(entries).toEqual([
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX}alignment.coverage:missing`,
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX}blockedManifestPlanQueue.pending=1 (/tmp/plan.json)`,
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_ISSUE_PREFIX}queueSnapshotPathsInferred`,
      `${SESSION_TYPE_MANIFEST_QUEUE_TEST_COVERAGE_GATE_WARNING_PREFIX}Resolve coverage drift`,
    ]);
  });

  it("collects rerun queue issues from the blocked-plan queue", () => {
    clearSessionTypeGlueingBlockedManifestPlanQueue();
    const pending: [string, string] = ["./manifests/pending.json", "./manifests/other.json"];
    enqueueSessionTypeGlueingBlockedManifestPlanQueue(pending);
    const [first, second] = pending;
    const issues = collectSessionTypeGlueingManifestQueueCoverageGateBlockedManifestPlanQueueIssues();
    expect(issues).toEqual([
      `blockedManifestPlanQueue.pending=2 (${resolve(first)}, ${resolve(second)})`,
    ]);
    clearSessionTypeGlueingBlockedManifestPlanQueue();
  });

  it("records rerun queue counts when marking the manifest-queue sentinel", () => {
    clearSessionTypeGlueingBlockedManifestPlanQueue();
    const pending: [string, string, string] = [
      "./manifests/pending.json",
      "./manifests/other.json",
      "./manifests/additional.json",
    ];
    enqueueSessionTypeGlueingBlockedManifestPlanQueue(pending);
    const [first, second, third] = pending;
    const record = markSessionTypeGlueingManifestQueueTestedFromQueues({
      testedAt: "2024-08-01T00:00:00.000Z",
      coverageGate: { issues: ["alignment.coverage:missing"], warnings: [] },
    });
    expect(record.coverageGate?.blockedManifestPlanQueueIssues).toEqual([
      `blockedManifestPlanQueue.pending=3 (${resolve(first)}, ${resolve(second)}, ${resolve(third)})`,
    ]);
    clearSessionTypeGlueingBlockedManifestPlanQueue();
  });

  it("defaults coverage gate queue snapshot paths when missing", () => {
    const record = markSessionTypeGlueingManifestQueueTested({
      testedAt: "2024-08-02T00:00:00.000Z",
      coverageGate: { checkedAt: "2024-08-02T00:00:00.000Z", issues: [], warnings: [] },
    });
    expect(record.coverageGate?.queueSnapshotPaths).toEqual({
      manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
      blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
    });
    expect(record.coverageGate?.queueSnapshotPathsInferred).toBe(true);

    const legacyRecord = {
      testedAt: "2024-08-03T00:00:00.000Z",
      revision: 1,
      coverageGate: { checkedAt: "2024-08-03T00:00:00.000Z", issues: [], warnings: [] },
    } satisfies Record<string, unknown>;
    writeFileSync(
      SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH,
      `${JSON.stringify(legacyRecord, null, 2)}\n`,
      "utf8",
    );
    const status = readSessionTypeGlueingManifestQueueTestStatus();
    expect(status.coverageGate?.queueSnapshotPaths).toEqual({
      manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
      blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
    });
    expect(status.coverageGate?.queueSnapshotPathsInferred).toBe(true);
    expect(status.coverageGate?.warnings).toContain(
      "Manifest-queue sentinel omitted queue snapshot paths; defaulted to live manifest/blocked-plan queue files. Refresh session-type manifest-queue tests to capture the preserved snapshots.",
    );
  });
});

describe("session-type glueing manifest queue test status evaluation", () => {
  it("flags missing coverage as stale", () => {
    const evaluation = evaluateSessionTypeGlueingManifestQueueTestStatus({ tested: false });
    expect(evaluation.stale).toBe(true);
    expect(evaluation.issues).toContain("missing");
  });

  it("flags stale coverage when the sentinel is too old", () => {
    const now = new Date("2024-02-01T00:00:00.000Z");
    const testedAt = new Date(now.getTime() - SESSION_TYPE_MANIFEST_QUEUE_TEST_MAX_AGE_MS - 1).toISOString();
    const evaluation = evaluateSessionTypeGlueingManifestQueueTestStatus(
      { tested: true, testedAt, revision: 1 },
      { now },
    );
    expect(evaluation.issues).toContain("stale");
    expect(evaluation.warnings.some((warning) => warning.includes("Manifest queue coverage"))).toBe(true);
  });
});
