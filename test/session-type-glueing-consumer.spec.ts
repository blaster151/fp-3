import { describe, expect, it } from "vitest";

import { buildGlueingExampleKernelSpec, buildGlueingExampleUserSpec } from "../glueing-supervised-stack.examples";
import {
  buildSessionTypeGlueingSweepRecord,
  collectSessionTypeGlueingSweepRunSnapshot,
  type SessionTypeGlueingSweepRunSnapshot,
} from "../session-type-glueing-dashboard";
import { DEFAULT_SESSION_TYPE_CHANNEL, DEFAULT_SESSION_TYPE_OBJECT } from "../session-type-glueing-cli";
import { diffSessionTypeGlueingSweepRecord, diffSessionTypeGlueingSweepRunSnapshot } from "../session-type-glueing-consumer";
import { makeSessionTypeGlueingSupervisedStack } from "../session-type-supervised-stack";
import { makeExample8GlueingBridge } from "../session-type-glueing.examples";
import type { SessionTypeGlueingSweepConfig } from "../session-type-glueing-sweep";
import { parseSessionType } from "../session-type";
import type { TwoObject } from "../two-object-cat";

const DEFAULT_CONFIG: SessionTypeGlueingSweepConfig = {
  label: "Example8-default",
  sessionTypeLiteral: "Y",
  assignments: { [DEFAULT_SESSION_TYPE_CHANNEL]: DEFAULT_SESSION_TYPE_OBJECT },
  glueingSpan: "identity",
  source: "spec",
};

const buildSnapshot = (): SessionTypeGlueingSweepRunSnapshot => {
  const { interaction, bridge } = makeExample8GlueingBridge({
    metadata: ["Example8.glueingBridge=Runnable"],
    notes: ["Runnable Example 8 glueing bridge"],
    runnerOptions: { sampleLimit: 4 },
    spanVariant: "identity",
  });
  const kernelObjects = interaction.law.kernel.base.objects as readonly TwoObject[];
  const kernelSpec = buildGlueingExampleKernelSpec(kernelObjects);
  const userSpec = buildGlueingExampleUserSpec<TwoObject>();
  const assignments = new Map<string, TwoObject>([
    [DEFAULT_SESSION_TYPE_CHANNEL, DEFAULT_SESSION_TYPE_OBJECT as TwoObject],
  ]);
  const sessionStack = makeSessionTypeGlueingSupervisedStack(
    bridge,
    interaction,
    parseSessionType(DEFAULT_CONFIG.sessionTypeLiteral),
    assignments,
    kernelSpec,
    userSpec,
    {
      session: {
        runnerEvaluation: { sampleLimit: 4 },
        stack: { sampleLimit: 6 },
        stackRun: { operations: ["getenv"], stepLimit: 24 },
      },
      alignment: { sampleLimit: 4 },
      metadata: ["SessionTypeGlueingRunnable=Example8"],
      notes: ["Session-type glueing runnable"],
    },
  );
  const metadata = {
    sessionMetadata: sessionStack.metadata,
    glueingMetadata: sessionStack.glueingBridge.metadata,
    alignmentMetadata: sessionStack.alignment.alignmentSummary.metadata,
    alignmentNotes: sessionStack.alignment.alignmentSummary.notes,
  };
  return collectSessionTypeGlueingSweepRunSnapshot(DEFAULT_CONFIG, metadata);
};

describe("session-type glueing consumer diffs", () => {
  it("reports no issues when recorded metadata matches the replay", () => {
    const snapshot = buildSnapshot();
    const entry = diffSessionTypeGlueingSweepRunSnapshot(snapshot);
    expect(entry.issues).toHaveLength(0);
    const summary = diffSessionTypeGlueingSweepRecord(
      buildSessionTypeGlueingSweepRecord([snapshot], { recordedAt: "2024-01-01T00:00:00.000Z" }),
    );
    expect(summary.mismatchedRuns).toBe(0);
  });

  it("flags alignment metadata differences", () => {
    const snapshot = buildSnapshot();
    const mutated: SessionTypeGlueingSweepRunSnapshot = {
      ...snapshot,
      alignmentMetadata: snapshot.alignmentMetadata.slice(1),
    };
    const entry = diffSessionTypeGlueingSweepRunSnapshot(mutated);
    expect(entry.issues).not.toHaveLength(0);
    expect(entry.alignmentMetadataDiff.missing.length).toBeGreaterThan(0);
    const summary = diffSessionTypeGlueingSweepRecord(
      buildSessionTypeGlueingSweepRecord([mutated]),
    );
    expect(summary.mismatchedRuns).toBe(1);
  });

  it("records manifest-source metadata in diff entries", () => {
    const snapshot = buildSnapshot();
    const manifestSnapshot: SessionTypeGlueingSweepRunSnapshot = {
      ...snapshot,
      sessionMetadata: [
        ...snapshot.sessionMetadata,
        "sessionType.manifest.path=/tmp/example.json",
        "sessionType.manifest.entryCount=3",
        "sessionType.manifest.replayedAt=2024-03-01T00:00:00.000Z",
      ],
    };
    const entry = diffSessionTypeGlueingSweepRunSnapshot(manifestSnapshot);
    expect(entry.manifestSource).toEqual({
      path: "/tmp/example.json",
      entryCount: 3,
      replayedAt: "2024-03-01T00:00:00.000Z",
    });
  });

  it("aggregates manifest sources in diff summaries", () => {
    const snapshot = buildSnapshot();
    const manifestSnapshot: SessionTypeGlueingSweepRunSnapshot = {
      ...snapshot,
      alignmentMetadata: snapshot.alignmentMetadata.slice(1),
      sessionMetadata: [
        ...snapshot.sessionMetadata,
        "sessionType.manifest.path=/tmp/example.json",
        "sessionType.manifest.entryCount=2",
        "sessionType.manifest.replayedAt=2024-04-01T00:00:00.000Z",
      ],
    };
    const manifestSnapshot2: SessionTypeGlueingSweepRunSnapshot = {
      ...snapshot,
      sessionMetadata: [
        ...snapshot.sessionMetadata,
        "sessionType.manifest.path=/tmp/example.json",
        "sessionType.manifest.entryCount=2",
        "sessionType.manifest.replayedAt=2024-04-01T00:00:00.000Z",
      ],
    };
    const record = buildSessionTypeGlueingSweepRecord([manifestSnapshot, manifestSnapshot2]);
    const summary = diffSessionTypeGlueingSweepRecord(record);
    expect(summary.manifestSourceTotals).toEqual([
      {
        source: {
          path: "/tmp/example.json",
          entryCount: 2,
          replayedAt: "2024-04-01T00:00:00.000Z",
        },
        totalRuns: 2,
        mismatchedRuns: 1,
      },
    ]);
  });

  it("surfaces manifest queue metadata in diff summaries", () => {
    const snapshot = buildSnapshot();
    const record = buildSessionTypeGlueingSweepRecord([snapshot], {
      manifestQueue: {
        inputs: ["/tmp/queued.json"],
        outputs: ["/tmp/generated.json"],
        tested: false,
        testRevision: 1,
        testIssues: ["missing"],
        testWarnings: ["Manifest queue coverage sentinel missing; rerun the manifest queue tests."],
      },
    });
    const summary = diffSessionTypeGlueingSweepRecord(record);
    expect(summary.manifestQueue?.inputs).toEqual(["/tmp/queued.json"]);
    expect(summary.manifestQueue?.outputs).toEqual(["/tmp/generated.json"]);
    expect(summary.manifestQueue?.tested).toBe(false);
    expect(summary.manifestQueue?.testRevision).toBe(1);
    expect(summary.manifestQueueIssues).toEqual(["missing"]);
    expect(summary.manifestQueueWarnings).toEqual([
      "Manifest queue coverage sentinel missing; rerun the manifest queue tests.",
    ]);
  });

  it("surfaces source coverage totals in diff summaries", () => {
    const snapshot = buildSnapshot();
    const record = buildSessionTypeGlueingSweepRecord([snapshot], {
      sourceCoverage: { manifestInputs: 2, blockedPlans: 1 },
    });
    const summary = diffSessionTypeGlueingSweepRecord(record);
    expect(summary.sourceCoverage).toEqual({ manifestInputs: 2, blockedPlans: 1 });
    expect(summary.sourceCoverageTotals).toEqual({ manifestInputs: 2, blockedPlans: 1, total: 3 });
  });

  it("surfaces blocked manifest telemetry in diff summaries", () => {
    const snapshot = buildSnapshot();
    const record = buildSessionTypeGlueingSweepRecord([snapshot], {
      blockedSuggestedManifestWrites: [
        {
          path: "/tmp/example.issues.json",
          sourcePath: "/tmp/example.json",
          mismatchedRuns: 1,
          totalRuns: 1,
        },
      ],
      blockedQueuedManifestInputs: ["/tmp/queued.json"],
      blockedManifestPlans: [
        {
          path: "/tmp/example.issues.json",
          sourcePath: "/tmp/example.json",
          mismatchedRuns: 1,
          totalRuns: 1,
          entryCount: 1,
          entries: [
            {
              label: "manifest#1",
              sessionTypeLiteral: "G₀",
              glueingSpan: "identity",
              assignments: { Y: "★" },
            },
          ],
        },
      ],
    });
    const summary = diffSessionTypeGlueingSweepRecord(record);
    expect(summary.blockedSuggestedManifestWrites).toEqual([
      {
        path: "/tmp/example.issues.json",
        sourcePath: "/tmp/example.json",
        mismatchedRuns: 1,
        totalRuns: 1,
      },
    ]);
    expect(summary.blockedQueuedManifestInputs).toEqual(["/tmp/queued.json"]);
    expect(summary.blockedManifestPlans).toEqual([
      {
        path: "/tmp/example.issues.json",
        sourcePath: "/tmp/example.json",
        mismatchedRuns: 1,
        totalRuns: 1,
        entryCount: 1,
        entries: [
          {
            label: "manifest#1",
            sessionTypeLiteral: "G₀",
            glueingSpan: "identity",
            assignments: { Y: "★" },
          },
        ],
      },
    ]);
  });
});
