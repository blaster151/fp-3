import { describe, expect, it } from "vitest";

import { buildGlueingExampleKernelSpec, buildGlueingExampleUserSpec } from "../glueing-supervised-stack.examples";
import {
  buildSessionTypeGlueingSweepRecord,
  collectSessionTypeGlueingSweepRunSnapshot,
  type SessionTypeGlueingBlockedManifestPlanEntry,
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

const RUNNER_COVERAGE_METADATA_ENTRY =
  'supervised-stack.lambdaCoop.coverage={"interpreterExpectedOperations":1,"interpreterCoveredOperations":0,"interpreterMissingOperations":["runnerOnly"],"kernelTotalClauses":1,"kernelEvaluatedClauses":0,"kernelSkippedClauses":[{"operation":"runnerOnly","reason":"missing-argument-witness"}],"operations":[{"operation":"runnerOnly","interpreterCovered":false,"notes":[]}],"operationSummary":{"total":1,"missingInterpreter":1,"missingKernelClause":1,"skippedKernelClauses":1,"residualDefaulted":0,"residualHandlers":0}}';

const ALIGNMENT_COVERAGE_METADATA_ENTRIES: ReadonlyArray<string> = [
  "λ₍coop₎.alignment.status=aligned",
  "λ₍coop₎.alignment.coverage.interpreter.expected=2",
  "λ₍coop₎.alignment.coverage.interpreter.covered=0",
  'λ₍coop₎.alignment.coverage.interpreter.missing=["runnerOnly"]',
  "λ₍coop₎.alignment.coverage.kernel.total=1",
  "λ₍coop₎.alignment.coverage.kernel.evaluated=0",
  'λ₍coop₎.alignment.coverage.kernel.skipped=[{"operation":"runnerOnly","reason":"missing-argument-witness"}]',
  'λ₍coop₎.alignment.coverage.operations.summary={"total":1,"missingInterpreter":1,"missingKernelClause":1,"skippedKernelClauses":1,"residualDefaulted":0,"residualHandlers":0}',
  'λ₍coop₎.alignment.coverage.operations.links=[{"operation":"runnerOnly","interpreterCovered":false,"notes":[]}]',
];

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

  it("surfaces λ₍coop₎ coverage drift in diff summaries", () => {
    const snapshot = buildSnapshot();
    const coverageSnapshot: SessionTypeGlueingSweepRunSnapshot = {
      ...snapshot,
      sessionMetadata: [...snapshot.sessionMetadata, RUNNER_COVERAGE_METADATA_ENTRY],
      alignmentMetadata: ALIGNMENT_COVERAGE_METADATA_ENTRIES,
    };
    const entry = diffSessionTypeGlueingSweepRunSnapshot(coverageSnapshot);
    expect(entry.alignmentCoverageIssues).toEqual([
      "Interpreter missing operations: runnerOnly",
      "Kernel skipped clauses: runnerOnly (missing-argument-witness)",
      "Kernel missing clauses: runnerOnly",
    ]);
    expect(entry.coverageComparisonIssues).toContain(
      "Interpreter expected operations mismatch between recorded and reconstructed coverage.",
    );
    expect(entry.issues).toContain("alignment.coverage:Interpreter missing operations: runnerOnly");
    expect(entry.issues).toContain(
      "coverage.drift:Interpreter expected operations mismatch between recorded and reconstructed coverage.",
    );
    const summary = diffSessionTypeGlueingSweepRecord(buildSessionTypeGlueingSweepRecord([coverageSnapshot]));
    expect(summary.alignmentCoverageIssues).toContain(
      "Example8-default: Interpreter missing operations: runnerOnly",
    );
    expect(summary.alignmentCoverageIssues).toContain(
      "Example8-default: Coverage drift: Interpreter expected operations mismatch between recorded and reconstructed coverage.",
    );
    expect(summary.mismatchedRuns).toBe(1);
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
        testCoverageGate: {
          checkedAt: "2024-05-01T00:00:00.000Z",
          issues: ["alignment.coverage:alpha"],
          warnings: ["Refresh manifest queue coverage gate"],
        },
      },
    });
    const summary = diffSessionTypeGlueingSweepRecord(record);
    expect(summary.manifestQueue?.inputs).toEqual(["/tmp/queued.json"]);
    expect(summary.manifestQueue?.outputs).toEqual(["/tmp/generated.json"]);
    expect(summary.manifestQueue?.tested).toBe(false);
    expect(summary.manifestQueue?.testRevision).toBe(1);
    expect(summary.manifestQueue?.testCoverageGate).toEqual({
      checkedAt: "2024-05-01T00:00:00.000Z",
      issues: ["alignment.coverage:alpha"],
      warnings: ["Refresh manifest queue coverage gate"],
    });
    expect(summary.manifestQueueIssues).toEqual(["missing"]);
    expect(summary.manifestQueueWarnings).toEqual([
      "Manifest queue coverage sentinel missing; rerun the manifest queue tests.",
    ]);
    expect(summary.manifestQueueCoverageGateIssues).toEqual(["alignment.coverage:alpha"]);
    expect(summary.manifestQueueCoverageGateWarnings).toEqual([
      "Refresh manifest queue coverage gate",
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
    expect(summary.sourceCoverageIssues).toBeUndefined();
  });

  it("records source coverage issues in diff summaries", () => {
    const snapshot = buildSnapshot();
    const record = buildSessionTypeGlueingSweepRecord([snapshot], {
      sourceCoverage: { blockedPlans: 2 },
    });
    const summary = diffSessionTypeGlueingSweepRecord(record);
    expect(summary.sourceCoverageTotals).toEqual({ manifestInputs: 0, blockedPlans: 2, total: 2 });
    expect(summary.sourceCoverageIssues).toEqual([
      "No manifest-input coverage was recorded in this sweep.",
    ]);
  });

  it("surfaces blocked manifest telemetry in diff summaries", () => {
    const snapshot = buildSnapshot();
    const planEntry = {
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
    } satisfies SessionTypeGlueingBlockedManifestPlanEntry;
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
      blockedManifestInputs: ["/tmp/direct.json"],
      blockedManifestPlans: [planEntry],
      blockedManifestPlanInputs: [
        {
          ...planEntry,
          planRecordPath: "/tmp/plan-record.json",
          planIndex: 0,
          reason: "manifest-queue-sentinel",
          issues: ["coverageGate:missingCoverage"],
          warnings: ["refresh sentinel"],
        },
      ],
      manifestQueue: {
        blockedManifestPlanInputs: [
          {
            ...planEntry,
            planRecordPath: "/tmp/plan-record.json",
            planIndex: 0,
            reason: "manifest-queue-sentinel",
            issues: ["coverageGate:missingCoverage"],
            warnings: ["refresh sentinel"],
          },
        ],
      },
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
    expect(summary.blockedManifestInputs).toEqual(["/tmp/direct.json"]);
    expect(summary.blockedManifestPlans).toEqual([
      planEntry,
    ]);
    expect(summary.blockedManifestPlanInputs).toEqual([
      {
        ...planEntry,
        planRecordPath: "/tmp/plan-record.json",
        planIndex: 0,
        reason: "manifest-queue-sentinel",
        issues: ["coverageGate:missingCoverage"],
        warnings: ["refresh sentinel"],
      },
    ]);
    expect(summary.manifestQueue?.blockedManifestPlanInputs).toEqual([
      {
        ...planEntry,
        planRecordPath: "/tmp/plan-record.json",
        planIndex: 0,
        reason: "manifest-queue-sentinel",
        issues: ["coverageGate:missingCoverage"],
        warnings: ["refresh sentinel"],
      },
    ]);
  });
});
