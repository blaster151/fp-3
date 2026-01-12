import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createRunnableExampleContext } from "../examples/runnable/types";
import { sessionTypeGlueingSweepRunnable } from "../examples/runnable/105-session-type-glueing-sweep";
import { sessionTypeGlueingStackRunnable } from "../examples/runnable/104-session-type-glueing-stack";
import {
  SWEEP_FILE_FLAG,
  SWEEP_FLAG,
  SWEEP_RECORD_FLAG,
  SWEEP_DIFF_FLAG,
  SWEEP_FOCUS_FLAG,
  SWEEP_MANIFEST_FLAG,
  SWEEP_MANIFEST_INPUT_FLAG,
  SWEEP_BLOCKED_PLAN_INPUT_FLAG,
  SWEEP_MANIFEST_OVERRIDE_FLAG,
  SWEEP_HELP_FLAG,
} from "../session-type-glueing-cli";
import {
  describeSessionTypeGlueingAssignments,
  normalizeSessionTypeGlueingSweepEntry,
  parseSessionTypeGlueingSweepValue,
  readSessionTypeGlueingSweepEntriesFromFile,
} from "../session-type-glueing-sweep";
import { writeSessionTypeGlueingManifest } from "../session-type-glueing-manifest";
import {
  buildSessionTypeGlueingSweepRecord,
  collectSessionTypeGlueingSweepRunSnapshot,
  filterSessionTypeGlueingDashboardEntries,
  summarizeSessionTypeGlueingSweepRecord,
  writeSessionTypeGlueingSweepRecord,
  type SessionTypeGlueingSweepRunSnapshot,
  readSessionTypeGlueingSweepRecord,
  type SessionTypeGlueingBlockedManifestPlanEntry,
  type SessionTypeGlueingBlockedManifestPlanInputMetadata,
} from "../session-type-glueing-dashboard";
import {
  clearSessionTypeGlueingManifestQueue,
  peekSessionTypeGlueingManifestQueue,
  SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
  enqueueSessionTypeGlueingManifestQueue,
} from "../session-type-glueing-manifest-queue";
import {
  clearSessionTypeGlueingBlockedManifestPlanQueue,
  SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
  enqueueSessionTypeGlueingBlockedManifestPlanQueue,
  peekSessionTypeGlueingBlockedManifestPlanQueue,
} from "../session-type-glueing-blocked-manifest-plan-queue";
import {
  markSessionTypeGlueingManifestQueueTested,
  SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH,
  SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION,
} from "../session-type-glueing-manifest-queue-test-status";
import { installSessionTypeGlueingManifestQueueSentinelSnapshotHooks } from "../session-type-glueing-manifest-queue-test-hooks";

installSessionTypeGlueingManifestQueueSentinelSnapshotHooks();

describe("session-type glueing sweep helpers", () => {
  it("parses inline sweep entries with multiple assignments", () => {
    const entry = parseSessionTypeGlueingSweepValue(
      "session-type:G₀;assignment:Y=•;assignment:Z=★;glueing-span:left-nontrivial;label:cli",
      "cli[1]",
    );
    expect(entry.sessionTypeLiteral).toBe("G₀");
    expect(entry.label).toBe("cli");
    expect(entry.assignments).toEqual({ Y: "•", Z: "★" });
    expect(entry.glueingSpan).toBe("left-nontrivial");
    expect(entry.source).toBe("cli[1]");
  });

  it("normalizes entries with defaults when values are omitted", () => {
    const normalized = normalizeSessionTypeGlueingSweepEntry(
      { source: "cli[2]" },
      { index: 0, source: "cli[2]" },
    );
    expect(normalized.label).toBe("sweep-1");
    expect(normalized.sessionTypeLiteral).toBe("Y");
    expect(normalized.glueingSpan).toBe("identity");
    expect(normalized.assignments).toEqual({ Y: "•" });
  });

  it("describes assignments in a deterministic order", () => {
    const description = describeSessionTypeGlueingAssignments({ B: "★", A: "•" });
    expect(description).toBe("[[\"A\",\"•\"],[\"B\",\"★\"]]");
  });
});

const makeSnapshot = (
  overrides: Partial<SessionTypeGlueingSweepRunSnapshot> = {},
): SessionTypeGlueingSweepRunSnapshot => ({
  config: {
    label: "alpha",
    sessionTypeLiteral: "Y",
    assignments: { Y: "•" },
    glueingSpan: "identity",
    source: "cli[1]",
  },
  sessionMetadata: ["sessionType.runner.holds=true", "sessionType.runner.mismatches=0"],
  glueingMetadata: ["Glueing.span=identity"],
  alignmentMetadata: ["λ₍coop₎.alignment.status=aligned"],
  alignmentNotes: [],
  runnerHolds: true,
  runnerMismatches: 0,
  ...overrides,
});

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

const markFreshManifestQueueCoverage = () =>
  markSessionTypeGlueingManifestQueueTested({
    testedAt: "2024-06-01T00:00:00.000Z",
    coverageGate: { checkedAt: "2024-06-01T00:00:00.000Z", issues: [], warnings: [] },
  });

const removeManifestQueueTestStatus = () =>
  rmSync(SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH, { force: true });

const clearManifestQueues = () => {
  clearSessionTypeGlueingManifestQueue();
  clearSessionTypeGlueingBlockedManifestPlanQueue();
};

describe("session-type glueing dashboard helpers", () => {
  it("collects runner coverage metadata from session entries", () => {
    const snapshot = collectSessionTypeGlueingSweepRunSnapshot(makeSnapshot().config, {
      sessionMetadata: [
        "sessionType.runner.holds=true",
        "sessionType.runner.mismatches=0",
        RUNNER_COVERAGE_METADATA_ENTRY,
      ],
    });
    expect(snapshot.runnerCoverage?.interpreterExpectedOperations).toBe(1);
    expect(snapshot.runnerCoverage?.interpreterMissingOperations).toEqual(["runnerOnly"]);
  });

  it("summarizes sweep records", () => {
    const snapshots: SessionTypeGlueingSweepRunSnapshot[] = [
      makeSnapshot(),
      makeSnapshot({
        config: {
          label: "beta",
          sessionTypeLiteral: "G₀",
          assignments: { Y: "★" },
          glueingSpan: "left-nontrivial",
          source: "cli[2]",
        },
        sessionMetadata: ["sessionType.runner.holds=false", "sessionType.runner.mismatches=2"],
        alignmentMetadata: [
          "λ₍coop₎.alignment.status=issues",
          "λ₍coop₎.alignment.coverage.interpreter.expected=2",
          "λ₍coop₎.alignment.coverage.interpreter.covered=1",
          'λ₍coop₎.alignment.coverage.interpreter.missing=["userEval"]',
          "λ₍coop₎.alignment.coverage.kernel.total=1",
          "λ₍coop₎.alignment.coverage.kernel.evaluated=0",
          'λ₍coop₎.alignment.coverage.kernel.skipped=[{"operation":"kernelClause","reason":"missing-argument-witness"}]',
          'λ₍coop₎.alignment.coverage.operations.summary={"total":3,"missingInterpreter":1,"missingKernelClause":1,"skippedKernelClauses":1,"residualDefaulted":1,"residualHandlers":1}',
          'λ₍coop₎.alignment.coverage.operations.links=[{"operation":"userEval","interpreterCovered":false,"kernelClause":{"kind":"state"},"kernelClauseSkipped":{"operation":"userEval","reason":"missing-argument-witness"},"notes":[]},{"operation":"missingKernel","interpreterCovered":true,"notes":["Kernel exposes no clause for missingKernel."]},{"operation":"residualOp","interpreterCovered":true,"kernelClause":{"kind":"state","description":"residual"},"residual":{"defaulted":true,"handlerDescription":"fallback","coverage":{"handled":0,"unhandled":1,"sampleLimit":1},"notes":["Residual coverage handled=0 unhandled=1 sampleLimit=1"]},"notes":[]}]',
        ],
        runnerHolds: false,
        runnerMismatches: 2,
      }),
    ];
    const record = buildSessionTypeGlueingSweepRecord(snapshots, { recordedAt: "2024-01-01T00:00:00.000Z" });
    const summary = summarizeSessionTypeGlueingSweepRecord(record);
    expect(summary.totalRuns).toBe(2);
    expect(summary.runner.successes).toBe(1);
    expect(summary.runner.failures).toBe(1);
    expect(summary.runner.mismatches).toBe(2);
    expect(summary.alignment.aligned).toBe(1);
    expect(summary.alignment.issues).toBe(1);
    expect(summary.entries[1]?.issues).toContain("runner.holds=false");
    expect(summary.entries[1]?.issues).toContain("alignment.status=issues");
    expect(summary.alignmentCoverageIssues).toEqual([
      "beta: Interpreter missing operations: userEval",
      "beta: Kernel skipped clauses: kernelClause (missing-argument-witness)",
      "beta: Kernel missing clauses: missingKernel",
      "beta: Residual defaulted operations: residualOp",
    ]);
    expect(summary.entries[1]?.alignmentCoverage?.interpreterExpectedOperations).toBe(2);
    expect(summary.entries[1]?.alignmentCoverageIssues).toEqual([
      "Interpreter missing operations: userEval",
      "Kernel skipped clauses: kernelClause (missing-argument-witness)",
      "Kernel missing clauses: missingKernel",
      "Residual defaulted operations: residualOp",
    ]);
  });

  it("surfaces manifest metadata in dashboard entries", () => {
    const snapshots = [
      makeSnapshot({
        config: {
          label: "manifest",
          sessionTypeLiteral: "G₀",
          assignments: { Y: "•" },
          glueingSpan: "identity",
          source: "manifest:/tmp/example.json",
        },
        sessionMetadata: [
          "sessionType.manifest.path=/tmp/example.json",
          "sessionType.manifest.entryCount=4",
          "sessionType.manifest.replayedAt=2024-02-02T12:34:56.000Z",
        ],
      }),
    ];
    const summary = summarizeSessionTypeGlueingSweepRecord(
      buildSessionTypeGlueingSweepRecord(snapshots, { recordedAt: "2024-02-02T12:34:56.000Z" }),
    );
    expect(summary.entries[0]?.manifestSource).toEqual({
      path: "/tmp/example.json",
      entryCount: 4,
      replayedAt: "2024-02-02T12:34:56.000Z",
    });
  });

  it("summarizes blocked manifest plan rerun queue actions", () => {
    const snapshots = [makeSnapshot()];
    const record = buildSessionTypeGlueingSweepRecord(snapshots, {
      blockedManifestPlanQueue: [
        { path: "/tmp/blocked-plan-a.json", action: "queued" },
        { path: "/tmp/blocked-plan-a.json", action: "consumed" },
        { path: "/tmp/blocked-plan-b.json", action: "queued" },
      ],
    });
    const summary = summarizeSessionTypeGlueingSweepRecord(record);
    expect(summary.blockedManifestPlanQueue?.queued).toEqual([
      "/tmp/blocked-plan-a.json",
      "/tmp/blocked-plan-b.json",
    ]);
    expect(summary.blockedManifestPlanQueue?.consumed).toEqual(["/tmp/blocked-plan-a.json"]);
    expect(summary.blockedManifestPlanQueue?.remaining).toEqual(["/tmp/blocked-plan-b.json"]);
    expect(summary.blockedManifestPlanQueueIssues).toEqual([
      "blockedManifestPlanQueue.pending=1 (/tmp/blocked-plan-b.json)",
    ]);
  });

  it("falls back to runner coverage metadata when alignment coverage is absent", () => {
    const snapshots = [
      makeSnapshot({
        sessionMetadata: [
          "sessionType.runner.holds=true",
          "sessionType.runner.mismatches=0",
          RUNNER_COVERAGE_METADATA_ENTRY,
        ],
        alignmentMetadata: ["λ₍coop₎.alignment.status=aligned"],
      }),
    ];
    const summary = summarizeSessionTypeGlueingSweepRecord(
      buildSessionTypeGlueingSweepRecord(snapshots, { recordedAt: "2024-03-03T00:00:00.000Z" }),
    );
    expect(summary.alignmentCoverageIssues).toEqual([
      "alpha: Interpreter missing operations: runnerOnly",
      "alpha: Kernel skipped clauses: runnerOnly (missing-argument-witness)",
      "alpha: Kernel missing clauses: runnerOnly",
    ]);
    expect(summary.entries[0]?.alignmentCoverage?.interpreterMissingOperations).toEqual([
      "runnerOnly",
    ]);
  });

  it("detects coverage drift between runner and alignment coverage sources", () => {
    const snapshots = [
      makeSnapshot({
        sessionMetadata: [
          "sessionType.runner.holds=true",
          "sessionType.runner.mismatches=0",
          RUNNER_COVERAGE_METADATA_ENTRY,
        ],
        alignmentMetadata: ALIGNMENT_COVERAGE_METADATA_ENTRIES,
      }),
    ];
    const summary = summarizeSessionTypeGlueingSweepRecord(
      buildSessionTypeGlueingSweepRecord(snapshots, { recordedAt: "2024-04-04T00:00:00.000Z" }),
    );
    expect(summary.alignmentCoverageIssues).toContain(
      "alpha: Coverage drift: Interpreter expected operations mismatch between recorded and reconstructed coverage.",
    );
    expect(summary.entries[0]?.coverageComparisonIssues).toEqual([
      "Interpreter expected operations mismatch between recorded and reconstructed coverage.",
    ]);
    expect(summary.entries[0]?.issues).toContain(
      "coverage.drift:Interpreter expected operations mismatch between recorded and reconstructed coverage.",
    );
  });

  it("records manifest queue metadata when present", () => {
    const snapshots = [makeSnapshot()];
    const blockedPlanEntry = {
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
    const blockedPlanInput = {
      ...blockedPlanEntry,
      planRecordPath: "/tmp/plan-record.json",
      planIndex: 0,
      reason: "manifest-queue-sentinel",
      issues: ["coverageGate:missingCoverage"],
      warnings: ["refresh sentinel"],
    } satisfies SessionTypeGlueingBlockedManifestPlanInputMetadata;
    const record = buildSessionTypeGlueingSweepRecord(snapshots, {
      manifestQueue: {
        inputs: ["/tmp/queued.json"],
        replays: ["/tmp/queued.json"],
        outputs: ["/tmp/generated.json"],
        blockedManifestPlanInputs: [blockedPlanInput],
        replayErrors: [{ path: "/tmp/missing.json", error: "ENOENT" }],
        coverageIssues: ["alpha: Interpreter missing operations: runnerOnly"],
        coverageDriftIssues: [
          "alpha: Coverage drift: Interpreter expected operations mismatch between recorded and reconstructed coverage.",
        ],
        tested: true,
        testedAt: "2024-02-02T12:34:56.000Z",
        testRevision: 1,
        testCoverageGate: {
          checkedAt: "2024-02-02T12:34:57.000Z",
          issues: ["alignment.coverage:alpha"],
          warnings: ["Manifest queue coverage gate stale"],
        },
      },
    });
    const summary = summarizeSessionTypeGlueingSweepRecord(record);
    expect(summary.manifestQueue?.inputs).toEqual(["/tmp/queued.json"]);
    expect(summary.manifestQueue?.replays).toEqual(["/tmp/queued.json"]);
    expect(summary.manifestQueue?.outputs).toEqual(["/tmp/generated.json"]);
    expect(summary.manifestQueue?.blockedManifestPlanInputs).toEqual([blockedPlanInput]);
    expect(summary.manifestQueue?.replayErrors).toEqual([
      { path: "/tmp/missing.json", error: "ENOENT" },
    ]);
    expect(summary.manifestQueue?.coverageIssues).toEqual([
      "alpha: Interpreter missing operations: runnerOnly",
    ]);
    expect(summary.manifestQueue?.coverageDriftIssues).toEqual([
      "alpha: Coverage drift: Interpreter expected operations mismatch between recorded and reconstructed coverage.",
    ]);
    expect(summary.manifestQueue?.tested).toBe(true);
    expect(summary.manifestQueue?.testedAt).toBe("2024-02-02T12:34:56.000Z");
    expect(summary.manifestQueue?.testRevision).toBe(1);
    expect(summary.manifestQueue?.testCoverageGate).toEqual({
      checkedAt: "2024-02-02T12:34:57.000Z",
      issues: ["alignment.coverage:alpha"],
      warnings: ["Manifest queue coverage gate stale"],
    });
    expect(summary.manifestQueueCoverageGateRollup).toEqual({
      checkedAt: "2024-02-02T12:34:57.000Z",
      issues: ["alignment.coverage:alpha"],
      warnings: ["Manifest queue coverage gate stale"],
    });
  });

  it("records source coverage issues when manifest-input or blocked-plan runs are missing", () => {
    const snapshots = [makeSnapshot()];
    const record = buildSessionTypeGlueingSweepRecord(snapshots, {
      sourceCoverage: { manifestInputs: 1 },
    });
    const summary = summarizeSessionTypeGlueingSweepRecord(record);
    expect(summary.sourceCoverageTotals).toEqual({ manifestInputs: 1, blockedPlans: 0, total: 1 });
    expect(summary.sourceCoverageIssues).toEqual([
      "No blocked-plan coverage was recorded in this sweep.",
    ]);
  });

  it("surfaces blocked manifest metadata", () => {
    const snapshots = [makeSnapshot()];
    const record = buildSessionTypeGlueingSweepRecord(snapshots, {
      blockedSuggestedManifestWrites: [
        {
          path: "/tmp/example.issues.json",
          sourcePath: "/tmp/example.json",
          mismatchedRuns: 1,
          totalRuns: 2,
          entryCount: 3,
        },
      ],
      blockedQueuedManifestInputs: ["/tmp/queued.json"],
      blockedManifestPlans: [
        {
          path: "/tmp/example.issues.json",
          sourcePath: "/tmp/example.json",
          mismatchedRuns: 1,
          totalRuns: 2,
          entryCount: 2,
          entries: [
            {
              label: "manifest#1",
              sessionTypeLiteral: "G₀",
              glueingSpan: "identity",
              assignments: { Y: "★" },
            },
            {
              label: "manifest#2",
              sessionTypeLiteral: "G₀^{∘}",
              glueingSpan: "left-nontrivial",
              assignments: { Y: "☆" },
            },
          ],
        },
      ],
    });
    const summary = summarizeSessionTypeGlueingSweepRecord(record);
    expect(summary.blockedSuggestedManifestWrites).toEqual([
      {
        path: "/tmp/example.issues.json",
        sourcePath: "/tmp/example.json",
        mismatchedRuns: 1,
        totalRuns: 2,
        entryCount: 3,
      },
    ]);
    expect(summary.blockedQueuedManifestInputs).toEqual(["/tmp/queued.json"]);
    expect(summary.blockedManifestPlans).toEqual([
      {
        path: "/tmp/example.issues.json",
        sourcePath: "/tmp/example.json",
        mismatchedRuns: 1,
        totalRuns: 2,
        entryCount: 2,
        entries: [
          {
            label: "manifest#1",
            sessionTypeLiteral: "G₀",
            glueingSpan: "identity",
            assignments: { Y: "★" },
          },
          {
            label: "manifest#2",
            sessionTypeLiteral: "G₀^{∘}",
            glueingSpan: "left-nontrivial",
            assignments: { Y: "☆" },
          },
        ],
      },
    ]);
  });

  it("surfaces manifest queue gating issues in dashboard summaries", () => {
    const snapshots = [makeSnapshot()];
    const record = buildSessionTypeGlueingSweepRecord(snapshots, {
      manifestQueue: {
        tested: true,
        testRevision: 1,
        testStale: true,
        testThresholdMs: 1,
        testAgeMs: 10,
        testIssues: ["stale"],
        testWarnings: ["Manifest queue coverage is stale."],
      },
    });
    const summary = summarizeSessionTypeGlueingSweepRecord(record);
    expect(summary.manifestQueueIssues).toEqual(["stale"]);
    expect(summary.manifestQueueWarnings).toEqual(["Manifest queue coverage is stale."]);
    expect(summary.manifestQueue?.testIssues).toEqual(["stale"]);
    expect(summary.manifestQueue?.testWarnings).toEqual(["Manifest queue coverage is stale."]);
  });

  it("filters dashboard entries by issues", () => {
    const snapshots: SessionTypeGlueingSweepRunSnapshot[] = [
      makeSnapshot(),
      makeSnapshot({
        config: {
          label: "beta",
          sessionTypeLiteral: "G₀",
          assignments: { Y: "★" },
          glueingSpan: "left-nontrivial",
          source: "cli[2]",
        },
        sessionMetadata: ["sessionType.runner.holds=false", "sessionType.runner.mismatches=2"],
        alignmentMetadata: ["λ₍coop₎.alignment.status=issues"],
        runnerHolds: false,
        runnerMismatches: 2,
      }),
    ];
    const summary = summarizeSessionTypeGlueingSweepRecord(
      buildSessionTypeGlueingSweepRecord(snapshots, { recordedAt: "2024-01-01T00:00:00.000Z" }),
    );
    const filtered = filterSessionTypeGlueingDashboardEntries(summary.entries, { requireIssues: true });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.label).toBe("beta");
  });

  it("writes sweep records that can be replayed as sweep manifests", () => {
    const dir = mkdtempSync(join(tmpdir(), "sweep-record-"));
    const file = join(dir, "record.json");
    const snapshots = [makeSnapshot()];
    const writeResult = writeSessionTypeGlueingSweepRecord(file, snapshots);
    const entries = readSessionTypeGlueingSweepEntriesFromFile(writeResult.path);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("alpha");
    const loaded = readSessionTypeGlueingSweepRecord(writeResult.path);
    expect(loaded.runs).toHaveLength(1);
    expect(loaded.runs[0]?.config.label).toBe("alpha");
  });
});

describe("session-type glueing sweep runnable", () => {
  it("prints usage guidance when --help is supplied", async () => {
    const outcome = await sessionTypeGlueingSweepRunnable.run(
      createRunnableExampleContext([{ key: SWEEP_HELP_FLAG, value: "true" }]),
    );
    expect(outcome.logs[0]).toContain("usage");
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata?.["help"]).toBe("session-type-glueing-sweep");
    expect(metadata?.["reminder"]).toMatch(/manifest-queue:test/);
    expect(metadata?.["sweep"]).toBeUndefined();
  });

  it("runs CLI sweeps end-to-end and records dashboard summaries", async () => {
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-sweep-run-"));
    const manifestPath = join(dir, "manifest.json");
    const recordPath = join(dir, "record.json");
    writeFileSync(
      manifestPath,
      `${
        JSON.stringify(
          [
            {
              label: "file-entry",
              sessionTypeLiteral: "G₀",
              assignments: { Y: "★" },
              glueingSpan: "left-nontrivial",
            },
          ],
          null,
          2,
        )
      }\n`,
      "utf8",
    );
    const context = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
      { key: SWEEP_FILE_FLAG, value: manifestPath },
      { key: SWEEP_RECORD_FLAG, value: recordPath },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);
    expect(outcome.logs.some((line) => line.includes("Session-type glueing sweep"))).toBe(true);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    if (!metadata) {
      throw new Error("Session-type glueing sweep runnable did not return metadata");
    }
    const sweepEntries = metadata["sweep"];
    expect(Array.isArray(sweepEntries)).toBe(true);
    if (!Array.isArray(sweepEntries)) {
      throw new Error("Sweep metadata was not recorded as an array");
    }
    expect(sweepEntries).toHaveLength(2);
    expect(metadata["recordedSweepFile"]).toBe(recordPath);
    const summary = metadata["sweepSummary"] as
      | { runner: { successes: number; failures: number; unknown: number } }
      | undefined;
    expect(summary).toBeDefined();
    if (!summary) {
      throw new Error("Sweep summary metadata missing");
    }
    expect(summary.runner.successes + summary.runner.failures + summary.runner.unknown).toBe(2);
    const recorded = JSON.parse(readFileSync(recordPath, "utf8")) as { runs?: unknown[] };
    expect(Array.isArray(recorded.runs)).toBe(true);
    if (!Array.isArray(recorded.runs)) {
      throw new Error("Recorded sweep file did not contain run entries");
    }
    expect(recorded.runs).toHaveLength(2);

    const diffContext = createRunnableExampleContext([{ key: SWEEP_DIFF_FLAG, value: recordPath }]);
    const diffOutcome = await sessionTypeGlueingSweepRunnable.run(diffContext);
    expect(diffOutcome.logs.some((line) => line.includes("sweep diff"))).toBe(true);
    const diffMetadata = diffOutcome.metadata as Record<string, unknown> | undefined;
    expect(diffMetadata).toBeDefined();
    if (!diffMetadata) {
      throw new Error("Sweep diff runnable did not return metadata");
    }
    const consumerDiffs = diffMetadata["consumerDiffs"];
    expect(Array.isArray(consumerDiffs)).toBe(true);
    if (!Array.isArray(consumerDiffs)) {
      throw new Error("consumerDiffs metadata missing");
    }
    expect(consumerDiffs[0]?.path).toBe(recordPath);
  });

  it("records filtered sweep metadata when sweep focus targets issues", async () => {
    const context = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
      { key: SWEEP_FOCUS_FLAG, value: "issues" },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    if (!metadata) {
      throw new Error("Sweep metadata missing");
    }
    expect(metadata["sweepFocus"]).toEqual(["issues"]);
    expect(Array.isArray(metadata["filteredSweep"])).toBe(true);
  });

  it("records filtered consumer diffs when sweep focus targets diff", async () => {
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-sweep-filter-"));
    const manifestPath = join(dir, "manifest.json");
    const recordPath = join(dir, "record.json");
    writeFileSync(
      manifestPath,
      `${
        JSON.stringify(
          [
            {
              label: "file-entry",
              sessionTypeLiteral: "G₀",
              assignments: { Y: "★" },
              glueingSpan: "left-nontrivial",
            },
          ],
          null,
          2,
        )
      }\n`,
      "utf8",
    );
    const sweepContext = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
      { key: SWEEP_FILE_FLAG, value: manifestPath },
      { key: SWEEP_RECORD_FLAG, value: recordPath },
    ]);
    await sessionTypeGlueingSweepRunnable.run(sweepContext);
    const diffContext = createRunnableExampleContext([
      { key: SWEEP_DIFF_FLAG, value: recordPath },
      { key: SWEEP_FOCUS_FLAG, value: "diff" },
    ]);
    const diffOutcome = await sessionTypeGlueingSweepRunnable.run(diffContext);
    const diffMetadata = diffOutcome.metadata as Record<string, unknown> | undefined;
    expect(diffMetadata).toBeDefined();
    if (!diffMetadata) {
      throw new Error("Sweep diff metadata missing");
    }
    expect(diffMetadata["sweepFocus"]).toContain("diff");
    expect(Array.isArray(diffMetadata["filteredConsumerDiffs"])).toBe(true);
  });

  it("writes focused manifests when requested", async () => {
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-sweep-manifest-"));
    const manifestPath = join(dir, "next.json");
    markFreshManifestQueueCoverage();
    const context = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
      { key: SWEEP_MANIFEST_FLAG, value: manifestPath },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const manifests = metadata?.["generatedManifests"] as ReadonlyArray<{ path: string; entryCount: number }> | undefined;
    expect(Array.isArray(manifests)).toBe(true);
    expect(manifests?.[0]?.path).toBe(manifestPath);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Array<{ label?: string }>;
    expect(manifest).toHaveLength(1);
    expect(manifest[0]?.label).toBe("inline");
  });

  it("rejects manifest writes when manifest queue coverage is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-sweep-manifest-missing-"));
    const manifestPath = join(dir, "next.json");
    removeManifestQueueTestStatus();
    const context = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
      { key: SWEEP_MANIFEST_FLAG, value: manifestPath },
    ]);
    await expect(() => sessionTypeGlueingSweepRunnable.run(context)).rejects.toThrow(
      SWEEP_MANIFEST_OVERRIDE_FLAG,
    );
  });

  it("rejects manifest writes when λ₍coop₎ coverage issues remain", async () => {
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-sweep-lambda-coverage-"));
    const manifestPath = join(dir, "next.json");
    markFreshManifestQueueCoverage();
    const originalRun = sessionTypeGlueingStackRunnable.run;
    sessionTypeGlueingStackRunnable.run = async () => ({
      logs: [],
      metadata: {
        sessionMetadata: ["sessionType.runner.holds=true", "sessionType.runner.mismatches=0"],
        glueingMetadata: [],
        alignmentMetadata: [
          "λ₍coop₎.alignment.status=aligned",
          "λ₍coop₎.alignment.coverage.interpreter.expected=2",
          "λ₍coop₎.alignment.coverage.interpreter.covered=1",
          'λ₍coop₎.alignment.coverage.interpreter.missing=["userEval"]',
        ],
        alignmentNotes: [],
      },
    });
    try {
      const context = createRunnableExampleContext([
        { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
        { key: SWEEP_MANIFEST_FLAG, value: manifestPath },
      ]);
      await expect(() => sessionTypeGlueingSweepRunnable.run(context)).rejects.toThrow(
        "coverage issues remain",
      );
    } finally {
      sessionTypeGlueingStackRunnable.run = originalRun;
    }
  });

  it("allows manifest writes when the override flag is provided", async () => {
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-sweep-manifest-override-"));
    const manifestPath = join(dir, "next.json");
    removeManifestQueueTestStatus();
    const context = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
      { key: SWEEP_MANIFEST_FLAG, value: manifestPath },
      { key: SWEEP_MANIFEST_OVERRIDE_FLAG, value: "true" },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);
    expect(outcome.logs.some((line) => line.includes("override"))).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Array<{ label?: string }>;
    expect(manifest).toHaveLength(1);
  });

  it("replays manifests via the manifest input flag", async () => {
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-input-"));
    const manifestPath = join(dir, "manifest.json");
    writeFileSync(
      manifestPath,
      `${
        JSON.stringify(
          [
            {
              label: "manifest-entry",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
            },
          ],
          null,
          2,
        )
      }\n`,
      "utf8",
    );
    const context = createRunnableExampleContext([{ key: SWEEP_MANIFEST_INPUT_FLAG, value: manifestPath }]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);
    expect(outcome.logs.some((line) => line.includes("session-type glueing sweep"))).toBe(true);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    if (!metadata) {
      throw new Error("Sweep metadata missing for manifest input run");
    }
    const queueStatus = metadata["manifestQueueTestStatus"] as Record<string, unknown> | undefined;
    expect(queueStatus).toBeDefined();
    if (!queueStatus) {
      throw new Error("manifestQueueTestStatus metadata missing");
    }
    expect(typeof queueStatus["tested"]).toBe("boolean");
    expect(Array.isArray(metadata["sweep"])).toBe(true);
    const runs = metadata["sweep"] as ReadonlyArray<Record<string, unknown>> | undefined;
    expect(runs?.length).toBe(1);
    const manifestSessionMetadata = runs?.[0]?.["sessionMetadata"];
    expect(Array.isArray(manifestSessionMetadata)).toBe(true);
    const manifestEntries = manifestSessionMetadata as ReadonlyArray<string> | undefined;
    expect(manifestEntries?.some((entry) => entry.startsWith("sessionType.manifest.path="))).toBe(true);
    expect(manifestEntries?.some((entry) => entry.startsWith("sessionType.manifest.entryCount="))).toBe(true);
    expect(manifestEntries?.some((entry) => entry.startsWith("sessionType.manifest.replayedAt="))).toBe(true);
    expect(
      manifestEntries?.some((entry) => entry.startsWith("sessionType.manifestQueue.tested=")),
    ).toBe(true);
  });

  it("filters manifest outputs to mismatched manifest sources and logs suggestions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-suggestions-"));
    const recordPath = join(dir, "record.json");
    const manifestOutput = join(dir, "filtered.json");
    const manifestIssuePath = join(dir, "manifest-issue.json");
    const manifestCleanPath = join(dir, "manifest-clean.json");

    const mismatchBase = makeSnapshot();
    const mismatchSnapshot: SessionTypeGlueingSweepRunSnapshot = {
      ...mismatchBase,
      config: {
        ...mismatchBase.config,
        label: "manifest-issue",
        source: `manifest:${manifestIssuePath}`,
      },
      sessionMetadata: [
        ...mismatchBase.sessionMetadata,
        `sessionType.manifest.path=${manifestIssuePath}`,
        "sessionType.manifest.entryCount=2",
        "sessionType.manifest.replayedAt=2024-05-01T00:00:00.000Z",
      ],
      alignmentMetadata: [],
    };

    const cleanSnapshot = makeSnapshot({
      config: {
        label: "manifest-clean",
        sessionTypeLiteral: "Y",
        assignments: { Y: "•" },
        glueingSpan: "identity",
        source: `manifest:${manifestCleanPath}`,
      },
      sessionMetadata: [
        "sessionType.runner.holds=true",
        "sessionType.runner.mismatches=0",
        `sessionType.manifest.path=${manifestCleanPath}`,
        "sessionType.manifest.entryCount=1",
        "sessionType.manifest.replayedAt=2024-05-02T00:00:00.000Z",
      ],
    });

    writeSessionTypeGlueingSweepRecord(recordPath, [mismatchSnapshot, cleanSnapshot]);

    markFreshManifestQueueCoverage();
    const context = createRunnableExampleContext([
      { key: SWEEP_DIFF_FLAG, value: recordPath },
      { key: SWEEP_MANIFEST_FLAG, value: manifestOutput },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);

    const manifest = JSON.parse(readFileSync(manifestOutput, "utf8")) as Array<{ label?: string }>;
    expect(manifest).toHaveLength(1);
    expect(manifest[0]?.label).toBe("manifest-issue");
    expect(outcome.logs.some((line) => line.includes("Suggested manifest targets"))).toBe(true);
    expect(outcome.logs.some((line) => line.includes(manifestIssuePath))).toBe(true);

    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const suggestions = metadata?.["manifestTargetSuggestions"] as
      | ReadonlyArray<{ sourcePath?: string }>
      | undefined;
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions?.some((entry) => entry.sourcePath === manifestIssuePath)).toBe(true);
  });

  it("auto-generates suggested manifests when no explicit targets are provided", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-auto-"));
    const recordPath = join(dir, "record.json");
    const manifestIssuePath = join(dir, "manifest-issue.json");
    const suggestedPath = join(dir, "manifest-issue.issues.json");
    const manifestCleanPath = join(dir, "manifest-clean.json");

    const mismatchBase = makeSnapshot();
    const mismatchSnapshot: SessionTypeGlueingSweepRunSnapshot = {
      ...mismatchBase,
      config: {
        ...mismatchBase.config,
        label: "manifest-issue",
        source: `manifest:${manifestIssuePath}`,
      },
      sessionMetadata: [
        ...mismatchBase.sessionMetadata,
        `sessionType.manifest.path=${manifestIssuePath}`,
        "sessionType.manifest.entryCount=2",
        "sessionType.manifest.replayedAt=2024-05-01T00:00:00.000Z",
      ],
      alignmentMetadata: [],
    };

    const cleanSnapshot = makeSnapshot({
      config: {
        label: "manifest-clean",
        sessionTypeLiteral: "Y",
        assignments: { Y: "•" },
        glueingSpan: "identity",
        source: `manifest:${manifestCleanPath}`,
      },
      sessionMetadata: [
        "sessionType.runner.holds=true",
        "sessionType.runner.mismatches=0",
        `sessionType.manifest.path=${manifestCleanPath}`,
        "sessionType.manifest.entryCount=1",
        "sessionType.manifest.replayedAt=2024-05-02T00:00:00.000Z",
      ],
    });

    writeSessionTypeGlueingSweepRecord(recordPath, [mismatchSnapshot, cleanSnapshot]);

    markFreshManifestQueueCoverage();
    const context = createRunnableExampleContext([{ key: SWEEP_DIFF_FLAG, value: recordPath }]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);

    expect(outcome.logs.some((line) => line.includes("Automatically generated suggested manifests"))).toBe(true);
    expect(existsSync(suggestedPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(suggestedPath, "utf8")) as Array<{ label?: string }>;
    expect(manifest).toHaveLength(1);
    expect(manifest[0]?.label).toBe("manifest-issue");

    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    if (!metadata) {
      throw new Error("Sweep metadata missing for automatic manifest run");
    }
    const generated = metadata["generatedManifests"] as ReadonlyArray<Record<string, unknown>> | undefined;
    expect(generated?.some((entry) => entry?.["path"] === suggestedPath && entry?.["mode"] === "suggested")).toBe(true);
    const suggestedWrites = metadata["suggestedManifestWrites"] as ReadonlyArray<Record<string, unknown>> | undefined;
    expect(suggestedWrites?.some((entry) => entry?.["sourcePath"] === manifestIssuePath)).toBe(true);
    const queued = peekSessionTypeGlueingManifestQueue();
    expect(queued).toContain(suggestedPath);
    clearManifestQueues();
  });

  it("blocks automatic suggested manifests when manifest queue coverage is missing", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-blocked-"));
    const recordPath = join(dir, "record.json");
    const manifestIssuePath = join(dir, "manifest-issue.json");
    const suggestedPath = join(dir, "manifest-issue.issues.json");

    const mismatchSnapshot = makeSnapshot({
      config: {
        label: "manifest-issue",
        sessionTypeLiteral: "G₀",
        assignments: { Y: "★" },
        glueingSpan: "left-nontrivial",
        source: `manifest:${manifestIssuePath}`,
      },
      sessionMetadata: [
        "sessionType.runner.holds=false",
        "sessionType.runner.mismatches=1",
        `sessionType.manifest.path=${manifestIssuePath}`,
        "sessionType.manifest.entryCount=2",
        "sessionType.manifest.replayedAt=2024-05-01T00:00:00.000Z",
      ],
      alignmentMetadata: [],
    });

    writeSessionTypeGlueingSweepRecord(recordPath, [mismatchSnapshot]);

    removeManifestQueueTestStatus();
    const context = createRunnableExampleContext([{ key: SWEEP_DIFF_FLAG, value: recordPath }]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);
    expect(outcome.logs.some((line) => line.includes("gating active"))).toBe(true);
    expect(existsSync(suggestedPath)).toBe(false);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const blocked = metadata?.["blockedSuggestedManifestWrites"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(blocked?.some((entry) => entry?.["path"] === suggestedPath)).toBe(true);
    const plan = metadata?.["blockedManifestPlans"] as ReadonlyArray<Record<string, unknown>> | undefined;
    const entry = plan?.find((candidate) => candidate?.["path"] === suggestedPath);
    expect(entry).toBeDefined();
    expect(entry?.["sourcePath"]).toBe(manifestIssuePath);
    expect(typeof entry?.["entryCount"]).toBe("number");
    expect(Array.isArray(entry?.["entries"])).toBe(true);
    expect(peekSessionTypeGlueingManifestQueue()).not.toContain(suggestedPath);
    clearManifestQueues();
  });

  it("allows automatic suggested manifests when the override flag is provided", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-override-"));
    const recordPath = join(dir, "record.json");
    const manifestIssuePath = join(dir, "manifest-issue.json");
    const suggestedPath = join(dir, "manifest-issue.issues.json");

    const mismatchSnapshot = makeSnapshot({
      config: {
        label: "manifest-issue",
        sessionTypeLiteral: "G₀",
        assignments: { Y: "★" },
        glueingSpan: "left-nontrivial",
        source: `manifest:${manifestIssuePath}`,
      },
      sessionMetadata: [
        "sessionType.runner.holds=false",
        "sessionType.runner.mismatches=1",
        `sessionType.manifest.path=${manifestIssuePath}`,
        "sessionType.manifest.entryCount=2",
        "sessionType.manifest.replayedAt=2024-05-01T00:00:00.000Z",
      ],
      alignmentMetadata: [],
    });

    writeSessionTypeGlueingSweepRecord(recordPath, [mismatchSnapshot]);

    removeManifestQueueTestStatus();
    const context = createRunnableExampleContext([
      { key: SWEEP_DIFF_FLAG, value: recordPath },
      { key: SWEEP_MANIFEST_OVERRIDE_FLAG, value: "true" },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);
    expect(outcome.logs.some((line) => line.includes("override"))).toBe(true);
    expect(existsSync(suggestedPath)).toBe(true);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata?.["manifestQueueTestOverride"]).toBeDefined();
    clearManifestQueues();
  });

  it("applies blocked manifest plan inputs once the sentinel is fresh", async () => {
    clearManifestQueues();
    markFreshManifestQueueCoverage();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-plan-"));
    const planRecordPath = join(dir, "plan-record.json");
    const blockedManifestPath = join(dir, "blocked.issues.json");
    const planEntry: SessionTypeGlueingBlockedManifestPlanEntry = {
      path: blockedManifestPath,
      sourcePath: "manifest:/tmp/issues.json",
      mismatchedRuns: 2,
      totalRuns: 2,
      entryCount: 1,
      entries: [
        {
          label: "blocked-entry",
          sessionTypeLiteral: "Y",
          assignments: { Y: "•" },
          glueingSpan: "identity",
        },
      ],
    };
    writeSessionTypeGlueingSweepRecord(planRecordPath, [], { blockedManifestPlans: [planEntry] });

    const context = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
      { key: SWEEP_BLOCKED_PLAN_INPUT_FLAG, value: planRecordPath },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);

    expect(existsSync(blockedManifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(blockedManifestPath, "utf8")) as Array<{ label?: string }>;
    expect(manifest).toHaveLength(1);
    expect(manifest[0]?.label).toBe("blocked-entry");

    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const appliedPlanSweeps = metadata?.["appliedBlockedManifestPlanSweeps"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(
      appliedPlanSweeps?.some(
        (entry) =>
          entry?.["path"] === blockedManifestPath &&
          entry?.["planRecordPath"] === planRecordPath &&
          entry?.["entryCount"] === 1,
      ),
    ).toBe(true);
    const sweepRuns = metadata?.["sweep"] as ReadonlyArray<Record<string, unknown>> | undefined;
    expect(sweepRuns).toBeDefined();
    const sweepRunList = sweepRuns ?? [];
    expect(sweepRunList).toHaveLength(2);
    expect(
      sweepRunList.some(
        (run) =>
          typeof run?.["source"] === "string" &&
          (run?.["source"] as string).startsWith(`${blockedManifestPath}#plan-entry-`),
      ),
    ).toBe(true);
    const applied = metadata?.["appliedBlockedManifestPlans"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(applied?.some((entry) => entry?.["path"] === blockedManifestPath)).toBe(true);
    const generated = metadata?.["generatedManifests"] as ReadonlyArray<Record<string, unknown>> | undefined;
    expect(
      generated?.some(
        (entry) =>
          entry?.["path"] === blockedManifestPath &&
          entry?.["mode"] === "plan" &&
          entry?.["planRecordPath"] === planRecordPath,
      ),
    ).toBe(true);
    const sourceCoverage = metadata?.["sourceCoverage"] as
      | { manifestInputs?: number; blockedPlans?: number }
      | undefined;
    expect(sourceCoverage).toEqual({ manifestInputs: 1, blockedPlans: 1 });
    const sweepSummary = metadata?.["sweepSummary"] as
      | {
          sourceCoverage?: { manifestInputs?: number; blockedPlans?: number };
          sourceCoverageTotals?: { manifestInputs: number; blockedPlans: number; total: number };
          sourceCoverageIssues?: ReadonlyArray<string>;
        }
      | undefined;
    expect(sweepSummary?.sourceCoverage).toEqual({ manifestInputs: 1, blockedPlans: 1 });
    expect(sweepSummary?.sourceCoverageTotals).toEqual({ manifestInputs: 1, blockedPlans: 1, total: 2 });
    expect(sweepSummary?.sourceCoverageIssues).toEqual([]);
  });

  it("applies blocked plan inputs while writing explicit manifests", async () => {
    clearManifestQueues();
    markFreshManifestQueueCoverage();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-plan-combo-"));
    const manifestPath = join(dir, "manual.json");
    const planRecordPath = join(dir, "plan-record.json");
    const blockedManifestPath = join(dir, "blocked.issues.json");
    const planEntry: SessionTypeGlueingBlockedManifestPlanEntry = {
      path: blockedManifestPath,
      sourcePath: "manifest:/tmp/issues.json",
      mismatchedRuns: 1,
      totalRuns: 1,
      entryCount: 1,
      entries: [
        {
          label: "blocked-entry",
          sessionTypeLiteral: "Y",
          assignments: { Y: "•" },
          glueingSpan: "identity",
        },
      ],
    };
    writeSessionTypeGlueingSweepRecord(planRecordPath, [], { blockedManifestPlans: [planEntry] });

    const context = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
      { key: SWEEP_MANIFEST_FLAG, value: manifestPath },
      { key: SWEEP_BLOCKED_PLAN_INPUT_FLAG, value: planRecordPath },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);

    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(blockedManifestPath)).toBe(true);

    const manualManifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Array<{ label?: string }>;
    expect(manualManifest).toHaveLength(1);
    expect(manualManifest[0]?.label).toBe("inline");

    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const generated = metadata?.["generatedManifests"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(
      generated?.some((entry) => entry?.["path"] === manifestPath && entry?.["mode"] === "explicit"),
    ).toBe(true);
    expect(
      generated?.some(
        (entry) =>
          entry?.["path"] === blockedManifestPath &&
          entry?.["mode"] === "plan" &&
          entry?.["planRecordPath"] === planRecordPath,
      ),
    ).toBe(true);
  });

  it("blocks blocked manifest plan inputs when the sentinel is stale", async () => {
    clearManifestQueues();
    removeManifestQueueTestStatus();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-plan-blocked-"));
    const planRecordPath = join(dir, "plan-record.json");
    const blockedManifestPath = join(dir, "blocked.issues.json");
    const planEntry: SessionTypeGlueingBlockedManifestPlanEntry = {
      path: blockedManifestPath,
      sourcePath: "manifest:/tmp/issues.json",
      mismatchedRuns: 1,
      totalRuns: 1,
      entryCount: 1,
      entries: [
        {
          label: "blocked-entry",
          sessionTypeLiteral: "Y",
          assignments: { Y: "•" },
          glueingSpan: "identity",
        },
      ],
    };
    writeSessionTypeGlueingSweepRecord(planRecordPath, [], { blockedManifestPlans: [planEntry] });

    const context = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
      { key: SWEEP_BLOCKED_PLAN_INPUT_FLAG, value: planRecordPath },
    ]);
    await expect(() => sessionTypeGlueingSweepRunnable.run(context)).rejects.toThrow(
      /sweep-blocked-plan-input/,
    );
    expect(existsSync(blockedManifestPath)).toBe(false);
  });

  it("skips blocked manifest plan inputs when the sentinel coverage gate reports issues", async () => {
    clearManifestQueues();
    markSessionTypeGlueingManifestQueueTested({
      testedAt: "2024-07-01T00:00:00.000Z",
      coverageGate: {
        checkedAt: "2024-07-01T00:00:00.000Z",
        issues: ["missingCoverage"],
        warnings: ["refresh lambda-coop traces"],
      },
    });
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-plan-sentinel-"));
    const planRecordPath = join(dir, "plan-record.json");
    const blockedManifestPath = join(dir, "blocked.issues.json");
    const planEntry: SessionTypeGlueingBlockedManifestPlanEntry = {
      path: blockedManifestPath,
      sourcePath: "manifest:/tmp/issues.json",
      mismatchedRuns: 1,
      totalRuns: 1,
      entryCount: 1,
      entries: [
        {
          label: "blocked-entry",
          sessionTypeLiteral: "Y",
          assignments: { Y: "•" },
          glueingSpan: "identity",
        },
      ],
    };
    writeSessionTypeGlueingSweepRecord(planRecordPath, [], { blockedManifestPlans: [planEntry] });

    const context = createRunnableExampleContext([
      { key: SWEEP_BLOCKED_PLAN_INPUT_FLAG, value: planRecordPath },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);

    expect(existsSync(blockedManifestPath)).toBe(false);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const blockedPlanInputs = metadata?.["blockedManifestPlanInputs"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    const expectedBlockedPlanInput = expect.objectContaining({
      path: blockedManifestPath,
      planRecordPath,
      planIndex: 0,
      reason: "manifest-queue-sentinel",
      issues: ["coverageGate:missingCoverage"],
      warnings: ["refresh lambda-coop traces"],
    });
    expect(blockedPlanInputs).toEqual([expectedBlockedPlanInput]);
    const manifestQueue = metadata?.["manifestQueue"] as Record<string, unknown> | undefined;
    const queueBlockedPlans = manifestQueue?.["blockedManifestPlanInputs"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(queueBlockedPlans).toEqual([expectedBlockedPlanInput]);
    expect(peekSessionTypeGlueingBlockedManifestPlanQueue()).toEqual([planRecordPath]);
    const blockedPlanQueue = metadata?.["blockedManifestPlanQueue"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(blockedPlanQueue).toEqual([
      {
        path: planRecordPath,
        action: "queued",
      },
    ]);
    markFreshManifestQueueCoverage();
    clearSessionTypeGlueingBlockedManifestPlanQueue();
  });

  it("replays queued blocked plan inputs once sentinel coverage is refreshed", async () => {
    clearManifestQueues();
    markFreshManifestQueueCoverage();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-plan-queue-"));
    const planRecordPath = join(dir, "plan-record.json");
    const blockedManifestPath = join(dir, "blocked.issues.json");
    const planEntry: SessionTypeGlueingBlockedManifestPlanEntry = {
      path: blockedManifestPath,
      sourcePath: "manifest:/tmp/issues.json",
      mismatchedRuns: 1,
      totalRuns: 1,
      entryCount: 1,
      entries: [
        {
          label: "queued-plan-entry",
          sessionTypeLiteral: "Y",
          assignments: { Y: "•" },
          glueingSpan: "identity",
        },
      ],
    };
    writeSessionTypeGlueingSweepRecord(planRecordPath, [], { blockedManifestPlans: [planEntry] });
    enqueueSessionTypeGlueingBlockedManifestPlanQueue([planRecordPath]);

    const context = createRunnableExampleContext([
      { key: SWEEP_FLAG, value: "session-type:Y;assignment:Y=•;glueing-span:identity;label:inline" },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);

    expect(existsSync(blockedManifestPath)).toBe(true);
    expect(peekSessionTypeGlueingBlockedManifestPlanQueue()).toEqual([]);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const appliedPlanSweeps = metadata?.["appliedBlockedManifestPlanSweeps"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(
      appliedPlanSweeps?.some(
        (entry) =>
          entry?.["path"] === blockedManifestPath &&
          entry?.["planRecordPath"] === planRecordPath &&
          entry?.["entryCount"] === 1,
      ),
    ).toBe(true);
    const blockedPlanQueue = metadata?.["blockedManifestPlanQueue"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(blockedPlanQueue).toEqual([
      {
        path: planRecordPath,
        action: "consumed",
      },
    ]);
  });

  it("replays blocked plan inputs during diff sweeps", async () => {
    clearManifestQueues();
    markFreshManifestQueueCoverage();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-plan-diff-"));
    const recordPath = join(dir, "record.json");
    const planRecordPath = join(dir, "plan-record.json");
    const blockedManifestPath = join(dir, "blocked.issues.json");

    const mismatchSnapshot = makeSnapshot({
      config: {
        label: "manifest-issue",
        sessionTypeLiteral: "G₀",
        assignments: { Y: "★" },
        glueingSpan: "left-nontrivial",
        source: "cli[diff]",
      },
      sessionMetadata: [
        "sessionType.runner.holds=false",
        "sessionType.runner.mismatches=1",
      ],
      alignmentMetadata: ["λ₍coop₎.alignment.status=issues"],
      runnerHolds: false,
      runnerMismatches: 1,
    });
    writeSessionTypeGlueingSweepRecord(recordPath, [mismatchSnapshot]);

    const planEntry: SessionTypeGlueingBlockedManifestPlanEntry = {
      path: blockedManifestPath,
      sourcePath: "manifest:/tmp/issues.json",
      mismatchedRuns: 1,
      totalRuns: 1,
      entryCount: 1,
      entries: [
        {
          label: "blocked-entry",
          sessionTypeLiteral: "Y",
          assignments: { Y: "•" },
          glueingSpan: "identity",
        },
      ],
    };
    writeSessionTypeGlueingSweepRecord(planRecordPath, [], { blockedManifestPlans: [planEntry] });

    const context = createRunnableExampleContext([
      { key: SWEEP_DIFF_FLAG, value: recordPath },
      { key: SWEEP_FOCUS_FLAG, value: "diff" },
      { key: SWEEP_BLOCKED_PLAN_INPUT_FLAG, value: planRecordPath },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);

    expect(existsSync(blockedManifestPath)).toBe(true);

    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const diffSummaries = metadata?.["filteredConsumerDiffs"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(Array.isArray(diffSummaries) && diffSummaries.length > 0).toBe(true);
    const planSweeps = metadata?.["appliedBlockedManifestPlanSweeps"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(
      planSweeps?.some(
        (entry) => entry?.["path"] === blockedManifestPath && entry?.["planRecordPath"] === planRecordPath,
      ),
    ).toBe(true);
    const generated = metadata?.["generatedManifests"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(
      generated?.some(
        (entry) =>
          entry?.["path"] === blockedManifestPath &&
          entry?.["mode"] === "plan" &&
          entry?.["planRecordPath"] === planRecordPath,
      ),
    ).toBe(true);
  });

  it("replays manifest inputs while refreshing blocked plans", async () => {
    clearManifestQueues();
    markFreshManifestQueueCoverage();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-input-plan-"));
    const manifestPath = join(dir, "recorded.json");
    const planRecordPath = join(dir, "plan-record.json");
    const blockedManifestPath = join(dir, "blocked.issues.json");

    const manifestEntry = {
      label: "manifest-entry",
      sessionTypeLiteral: "Y",
      assignments: { Y: "•" } as Record<string, string>,
      glueingSpan: "identity",
    };
    const { path: recordedManifestPath } = writeSessionTypeGlueingManifest(manifestPath, [manifestEntry]);

    const planEntry: SessionTypeGlueingBlockedManifestPlanEntry = {
      path: blockedManifestPath,
      sourcePath: "manifest:/tmp/issues.json",
      mismatchedRuns: 1,
      totalRuns: 1,
      entryCount: 1,
      entries: [
        {
          label: "blocked-entry",
          sessionTypeLiteral: "Y",
          assignments: { Y: "•" },
          glueingSpan: "identity",
        },
      ],
    };
    writeSessionTypeGlueingSweepRecord(planRecordPath, [], { blockedManifestPlans: [planEntry] });

    const context = createRunnableExampleContext([
      { key: SWEEP_MANIFEST_INPUT_FLAG, value: recordedManifestPath },
      { key: SWEEP_BLOCKED_PLAN_INPUT_FLAG, value: planRecordPath },
    ]);
    const outcome = await sessionTypeGlueingSweepRunnable.run(context);

    expect(existsSync(blockedManifestPath)).toBe(true);

    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const sweepRuns = metadata?.["sweep"] as ReadonlyArray<Record<string, unknown>> | undefined;
    expect(Array.isArray(sweepRuns) && sweepRuns.length === 2).toBe(true);
    const manifestReplays = metadata?.["manifestReplays"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(
      manifestReplays?.some((replay) => replay?.["path"] === recordedManifestPath && replay?.["entryCount"] === 1),
    ).toBe(true);
    const planSweeps = metadata?.["appliedBlockedManifestPlanSweeps"] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    expect(
      planSweeps?.some(
        (entry) => entry?.["path"] === blockedManifestPath && entry?.["planRecordPath"] === planRecordPath,
      ),
    ).toBe(true);
    const generated = metadata?.["generatedManifests"] as ReadonlyArray<Record<string, unknown>> | undefined;
    expect(
      generated?.some(
        (entry) =>
          entry?.["path"] === blockedManifestPath &&
          entry?.["mode"] === "plan" &&
          entry?.["planRecordPath"] === planRecordPath,
      ),
    ).toBe(true);
  });

  it("consumes queued manifests as --sweep-manifest-input on the next run", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-queue-"));
    const recordPath = join(dir, "record.json");
    const manifestIssuePath = join(dir, "manifest-issue.json");
    const suggestedPath = join(dir, "manifest-issue.issues.json");

    const mismatchSnapshot = makeSnapshot({
      config: {
        label: "manifest-issue",
        sessionTypeLiteral: "G₀",
        assignments: { Y: "★" },
        glueingSpan: "left-nontrivial",
        source: `manifest:${manifestIssuePath}`,
      },
      sessionMetadata: [
        "sessionType.runner.holds=false",
        "sessionType.runner.mismatches=1",
        `sessionType.manifest.path=${manifestIssuePath}`,
        "sessionType.manifest.entryCount=2",
        "sessionType.manifest.replayedAt=2024-05-01T00:00:00.000Z",
      ],
      alignmentMetadata: [],
    });

    writeSessionTypeGlueingSweepRecord(recordPath, [mismatchSnapshot]);

    markFreshManifestQueueCoverage();
    const diffContext = createRunnableExampleContext([{ key: SWEEP_DIFF_FLAG, value: recordPath }]);
    await sessionTypeGlueingSweepRunnable.run(diffContext);

    const queuedAfterDiff = peekSessionTypeGlueingManifestQueue();
    expect(queuedAfterDiff).toContain(suggestedPath);

    markFreshManifestQueueCoverage();
    const queueReplayOutcome = await sessionTypeGlueingSweepRunnable.run(createRunnableExampleContext([]));
    const metadata = queueReplayOutcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    if (!metadata) {
      throw new Error("Queue replay metadata missing");
    }
    const queuedInputs = metadata["queuedManifestInputs"] as ReadonlyArray<string> | undefined;
    expect(queuedInputs).toContain(suggestedPath);
    const queuedReplays = metadata["queuedManifestReplays"] as ReadonlyArray<string> | undefined;
    expect(queuedReplays).toContain(suggestedPath);
    expect(peekSessionTypeGlueingManifestQueue()).not.toContain(suggestedPath);
    clearManifestQueues();
  });

  it("skips queued manifest replays when manifest queue coverage is missing", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-gating-"));
    const recordPath = join(dir, "record.json");
    const manifestIssuePath = join(dir, "manifest-issue.json");
    const suggestedPath = join(dir, "manifest-issue.issues.json");

    const mismatchSnapshot = makeSnapshot({
      config: {
        label: "manifest-issue",
        sessionTypeLiteral: "G₀",
        assignments: { Y: "★" },
        glueingSpan: "left-nontrivial",
        source: `manifest:${manifestIssuePath}`,
      },
      sessionMetadata: [
        "sessionType.runner.holds=false",
        "sessionType.runner.mismatches=1",
        `sessionType.manifest.path=${manifestIssuePath}`,
        "sessionType.manifest.entryCount=2",
        "sessionType.manifest.replayedAt=2024-05-01T00:00:00.000Z",
      ],
      alignmentMetadata: [],
    });

    writeSessionTypeGlueingSweepRecord(recordPath, [mismatchSnapshot]);

    markFreshManifestQueueCoverage();
    await sessionTypeGlueingSweepRunnable.run(
      createRunnableExampleContext([{ key: SWEEP_DIFF_FLAG, value: recordPath }]),
    );
    expect(peekSessionTypeGlueingManifestQueue()).toContain(suggestedPath);

    removeManifestQueueTestStatus();
    const outcome = await sessionTypeGlueingSweepRunnable.run(createRunnableExampleContext([]));
    expect(outcome.logs.some((line) => line.includes("skipped"))).toBe(true);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const blocked = metadata?.["blockedQueuedManifestInputs"] as ReadonlyArray<string> | undefined;
    expect(blocked).toContain(resolve(suggestedPath));
    const manifestQueue = metadata?.["manifestQueue"] as Record<string, unknown> | undefined;
    expect((manifestQueue?.["blockedInputs"] as ReadonlyArray<string> | undefined)).toContain(
      resolve(suggestedPath),
    );
    expect(peekSessionTypeGlueingManifestQueue()).toContain(suggestedPath);
    clearManifestQueues();
  });

  it("skips queued manifest replays when the sentinel coverage gate reports issues", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-gate-sentinel-"));
    const manifestPath = join(dir, "queued.json");
    writeFileSync(
      manifestPath,
      `${
        JSON.stringify(
          [
            {
              label: "queued-entry",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
            },
          ],
          null,
          2,
        )
      }\n`,
      "utf8",
    );
    enqueueSessionTypeGlueingManifestQueue([manifestPath]);
    markSessionTypeGlueingManifestQueueTested({
      testedAt: "2024-06-01T00:00:00.000Z",
      coverageGate: {
        checkedAt: "2024-06-01T00:00:00.000Z",
        issues: ["alignment.coverage:missing"],
        warnings: ["Resolve λ₍coop₎ coverage drift"],
      },
    });

    const outcome = await sessionTypeGlueingSweepRunnable.run(createRunnableExampleContext([]));
    expect(
      outcome.logs.some(
        (line) =>
          line.includes("Manifest queue coverage gating active") &&
          line.includes("coverageGate:alignment.coverage:missing"),
      ),
    ).toBe(true);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const blocked = metadata?.["blockedQueuedManifestInputs"] as ReadonlyArray<string> | undefined;
    expect(blocked).toContain(resolve(manifestPath));
    const manifestQueue = metadata?.["manifestQueue"] as Record<string, unknown> | undefined;
    expect((manifestQueue?.["blockedInputs"] as ReadonlyArray<string> | undefined)).toContain(
      resolve(manifestPath),
    );
    expect(peekSessionTypeGlueingManifestQueue()).toContain(manifestPath);
    markFreshManifestQueueCoverage();
    clearManifestQueues();
  });

  it("treats inferred queue snapshot paths as manifest-queue gate issues", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-gate-inferred-"));
    const manifestPath = join(dir, "queued.json");
    writeFileSync(
      manifestPath,
      `${
        JSON.stringify(
          [
            {
              label: "queued-entry",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
            },
          ],
          null,
          2,
        )
      }\n`,
      "utf8",
    );

    mkdirSync(dirname(SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH), { recursive: true });
    const now = new Date().toISOString();
    const legacySentinelRecord = {
      testedAt: now,
      revision: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_REVISION,
      coverageGate: { checkedAt: now, issues: [], warnings: [] },
    } satisfies Record<string, unknown>;
    writeFileSync(
      SESSION_TYPE_GLUEING_MANIFEST_QUEUE_TEST_STATUS_PATH,
      `${JSON.stringify(legacySentinelRecord, null, 2)}\n`,
      "utf8",
    );

    const outcome = await sessionTypeGlueingSweepRunnable.run(
      createRunnableExampleContext([{ key: SWEEP_MANIFEST_INPUT_FLAG, value: manifestPath }]),
    );
    expect(
      outcome.logs.some(
        (line) =>
          line.includes("Sentinel coverage gating active") &&
          line.includes("coverageGate:queueSnapshotPathsInferred"),
      ),
    ).toBe(true);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const blockedManifestInputs = metadata?.["blockedManifestInputs"] as ReadonlyArray<string> | undefined;
    expect(blockedManifestInputs).toContain(resolve(manifestPath));
    const manifestQueue = metadata?.["manifestQueue"] as Record<string, unknown> | undefined;
    expect((manifestQueue?.["blockedManifestInputs"] as ReadonlyArray<string> | undefined)).toContain(
      resolve(manifestPath),
    );
    expect(metadata?.["manifestQueueTestCoverageGateIssues"]).toEqual([
      "queueSnapshotPathsInferred",
    ]);
    const manifestQueueTestCoverageGateIssues = (
      manifestQueue?.["testCoverageGate"] as Record<string, unknown> | undefined
    )?.["issues"] as ReadonlyArray<string> | undefined;
    expect(manifestQueueTestCoverageGateIssues).toEqual(["queueSnapshotPathsInferred"]);
    expect(metadata?.["manifestQueueTestCoverageGateWarnings"]).toEqual([
      "Manifest-queue sentinel omitted queue snapshot paths; defaulted to live manifest/blocked-plan queue files. Refresh session-type manifest-queue tests to capture the preserved snapshots.",
    ]);
    expect(metadata?.["manifestQueueCoverageGateRollup"]).toEqual({
      checkedAt: now,
      issues: ["queueSnapshotPathsInferred"],
      warnings: [
        "Manifest-queue sentinel omitted queue snapshot paths; defaulted to live manifest/blocked-plan queue files. Refresh session-type manifest-queue tests to capture the preserved snapshots.",
      ],
      queueSnapshotPaths: {
        manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
        blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
      },
      queueSnapshotPathsInferred: true,
    });

    removeManifestQueueTestStatus();
    clearManifestQueues();
  });

  it("surfaces sentinel rerun queue issues in logs, metadata, and manifest summaries", async () => {
    clearManifestQueues();
    markSessionTypeGlueingManifestQueueTested({
      testedAt: "2024-07-15T00:00:00.000Z",
      coverageGate: {
        checkedAt: "2024-07-15T00:00:00.000Z",
        issues: [],
        warnings: [],
        blockedManifestPlanQueueIssues: ["blockedManifestPlanQueue.pending=1 (/tmp/pending-plan.json)"],
      },
    });

    const outcome = await sessionTypeGlueingSweepRunnable.run(createRunnableExampleContext([]));
    expect(
      outcome.logs.some((line) =>
        line.includes("coverage gate rerun queue issues") &&
        line.includes("blockedManifestPlanQueue.pending=1 (/tmp/pending-plan.json)"),
      ),
    ).toBe(true);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    expect(
      metadata?.["manifestQueueTestCoverageGateBlockedManifestPlanQueueIssues"],
    ).toEqual(["blockedManifestPlanQueue.pending=1 (/tmp/pending-plan.json)"]);
    expect(metadata?.["manifestQueueTestCoverageGateQueueSnapshotPaths"]).toEqual({
      manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
      blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
    });
    const manifestQueue = metadata?.["manifestQueue"] as Record<string, unknown> | undefined;
    const coverageGate = manifestQueue?.["testCoverageGate"] as Record<string, unknown> | undefined;
    expect(
      coverageGate?.["blockedManifestPlanQueueIssues"],
    ).toEqual(["blockedManifestPlanQueue.pending=1 (/tmp/pending-plan.json)"]);
    expect(metadata?.["manifestQueueCoverageGateRollup"]).toEqual({
      checkedAt: "2024-07-15T00:00:00.000Z",
      blockedManifestPlanQueueIssues: ["blockedManifestPlanQueue.pending=1 (/tmp/pending-plan.json)"],
      queueSnapshotPaths: {
        manifestQueuePath: SESSION_TYPE_GLUEING_MANIFEST_QUEUE_PATH,
        blockedManifestPlanQueuePath: SESSION_TYPE_GLUEING_BLOCKED_MANIFEST_PLAN_QUEUE_PATH,
      },
    });
    markFreshManifestQueueCoverage();
    clearManifestQueues();
  });

  it("blocks direct manifest replays when the sentinel coverage gate reports issues", async () => {
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-input-sentinel-"));
    const manifestPath = join(dir, "manifest.json");
    writeFileSync(
      manifestPath,
      `${
        JSON.stringify(
          [
            {
              label: "manifest-entry",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
            },
          ],
          null,
          2,
        )
      }\n`,
      "utf8",
    );
    markSessionTypeGlueingManifestQueueTested({
      testedAt: "2024-06-01T00:00:00.000Z",
      coverageGate: { checkedAt: "2024-06-01T00:00:00.000Z", issues: ["alignment.coverage:missing"], warnings: [] },
    });

    const outcome = await sessionTypeGlueingSweepRunnable.run(
      createRunnableExampleContext([{ key: SWEEP_MANIFEST_INPUT_FLAG, value: manifestPath }]),
    );
    expect(
      outcome.logs.some(
        (line) =>
          line.includes("Sentinel coverage gating active") && line.includes(resolve(manifestPath)),
      ),
    ).toBe(true);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    const blockedManifestInputs = metadata?.["blockedManifestInputs"] as ReadonlyArray<string> | undefined;
    expect(blockedManifestInputs).toContain(resolve(manifestPath));
    const manifestQueue = metadata?.["manifestQueue"] as Record<string, unknown> | undefined;
    expect((manifestQueue?.["blockedManifestInputs"] as ReadonlyArray<string> | undefined)).toContain(
      resolve(manifestPath),
    );
  });

  it("requeues queued manifests when λ₍coop₎ coverage issues remain", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-coverage-"));
    const manifestPath = join(dir, "queued.json");
    writeFileSync(
      manifestPath,
      `${
        JSON.stringify(
          [
            {
              label: "queued-entry",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
            },
          ],
          null,
          2,
        )
      }\n`,
      "utf8",
    );
    enqueueSessionTypeGlueingManifestQueue([manifestPath]);
    markFreshManifestQueueCoverage();

    const originalRun = sessionTypeGlueingStackRunnable.run;
    sessionTypeGlueingStackRunnable.run = async () => ({
      logs: [],
      metadata: {
        sessionMetadata: ["sessionType.runner.holds=true", "sessionType.runner.mismatches=0"],
        glueingMetadata: [],
        alignmentMetadata: ALIGNMENT_COVERAGE_METADATA_ENTRIES,
        alignmentNotes: [],
      },
    });

    try {
      const outcome = await sessionTypeGlueingSweepRunnable.run(createRunnableExampleContext([]));
      expect(outcome.logs.some((line) => line.includes("coverage gating active"))).toBe(true);
      const metadata = outcome.metadata as Record<string, unknown> | undefined;
      expect(metadata).toBeDefined();
      if (!metadata) {
        throw new Error("Queue coverage metadata missing");
      }
      const blocked = metadata["blockedQueuedManifestInputs"] as ReadonlyArray<string> | undefined;
      expect(blocked).toContain(resolve(manifestPath));
      const coverageIssues = metadata["manifestQueueCoverageIssues"] as ReadonlyArray<string> | undefined;
      expect(Array.isArray(coverageIssues) && coverageIssues.length > 0).toBe(true);
      expect(peekSessionTypeGlueingManifestQueue()).toContain(manifestPath);
    } finally {
      sessionTypeGlueingStackRunnable.run = originalRun;
      clearManifestQueues();
    }
  });

  it("rejects manifest writes when queued manifest coverage issues remain", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-coverage-write-"));
    const manifestPath = join(dir, "queued.json");
    const manifestTarget = join(dir, "next.json");
    writeFileSync(
      manifestPath,
      `${
        JSON.stringify(
          [
            {
              label: "queued-entry",
              sessionTypeLiteral: "Y",
              assignments: { Y: "•" },
              glueingSpan: "identity",
            },
          ],
          null,
          2,
        )
      }\n`,
      "utf8",
    );
    enqueueSessionTypeGlueingManifestQueue([manifestPath]);
    markFreshManifestQueueCoverage();

    const originalRun = sessionTypeGlueingStackRunnable.run;
    sessionTypeGlueingStackRunnable.run = async () => ({
      logs: [],
      metadata: {
        sessionMetadata: ["sessionType.runner.holds=true", "sessionType.runner.mismatches=0"],
        glueingMetadata: [],
        alignmentMetadata: ALIGNMENT_COVERAGE_METADATA_ENTRIES,
        alignmentNotes: [],
      },
    });

    try {
      const context = createRunnableExampleContext([{ key: SWEEP_MANIFEST_FLAG, value: manifestTarget }]);
      await expect(() => sessionTypeGlueingSweepRunnable.run(context)).rejects.toThrow(
        "queued manifest coverage issues",
      );
      expect(peekSessionTypeGlueingManifestQueue()).toContain(manifestPath);
    } finally {
      sessionTypeGlueingStackRunnable.run = originalRun;
      clearManifestQueues();
    }
  });

  it("logs and clears missing queued manifests without throwing", async () => {
    clearManifestQueues();
    const dir = mkdtempSync(join(tmpdir(), "session-type-glueing-manifest-missing-"));
    const missingPath = join(dir, "missing.json");
    enqueueSessionTypeGlueingManifestQueue([missingPath]);
    markFreshManifestQueueCoverage();
    const outcome = await sessionTypeGlueingSweepRunnable.run(createRunnableExampleContext([]));
    expect(outcome.logs.some((line) => line.includes("Queued manifest replay errors"))).toBe(true);
    const metadata = outcome.metadata as Record<string, unknown> | undefined;
    expect(metadata).toBeDefined();
    if (!metadata) {
      throw new Error("Queue error metadata missing");
    }
    const errors = metadata["queuedManifestReplayErrors"] as
      | ReadonlyArray<{ path?: string; error?: string }>
      | undefined;
    expect(Array.isArray(errors) && errors.length === 1).toBe(true);
    if (!errors) {
      throw new Error("Queue replay errors missing");
    }
    expect(errors[0]?.path).toBe(resolve(missingPath));
    expect(typeof errors[0]?.error).toBe("string");
    expect(peekSessionTypeGlueingManifestQueue()).toHaveLength(0);
    clearManifestQueues();
  });
});
