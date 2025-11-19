import { existsSync, readFileSync } from "node:fs";
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
  evaluateSessionTypeGlueingManifestQueueTestStatus,
  SESSION_TYPE_MANIFEST_QUEUE_TEST_MAX_AGE_MS,
  formatSessionTypeManifestQueueCoverageGateMetadataEntries,
} from "../session-type-glueing-manifest-queue-test-status";

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
      },
    });
    expect(record.coverageGate?.issues).toEqual(["alignment.coverage:missing"]);
  });

  it("formats coverage gate metadata entries", () => {
    const entries = formatSessionTypeManifestQueueCoverageGateMetadataEntries({
      checkedAt: "2024-03-04T00:00:00.000Z",
      issues: ["alignment.coverage:alpha"],
      warnings: ["Resolve λ₍coop₎ coverage drift"],
    });
    expect(entries).toEqual([
      "sessionType.manifestQueue.coverageGate.checkedAt=2024-03-04T00:00:00.000Z",
      "sessionType.manifestQueue.coverageGate.issue=alignment.coverage:alpha",
      "sessionType.manifestQueue.coverageGate.warning=Resolve λ₍coop₎ coverage drift",
    ]);
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
