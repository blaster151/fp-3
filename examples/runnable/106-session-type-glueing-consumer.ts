import type { RunnableExample, RunnableExampleContext, RunnableOutcome } from "./types";
import { getRunnableFlag } from "./types";
import { parseSessionType } from "../../session-type";
import {
  DEFAULT_SESSION_TYPE_CHANNEL,
  DEFAULT_SESSION_TYPE_LITERAL,
  DEFAULT_SESSION_TYPE_OBJECT,
  GLUEING_SPAN_FLAG,
} from "../../session-type-glueing-cli";
import {
  makeExample8GlueingBridge,
  normalizeExample8GlueingSpanVariant,
  type Example8GlueingSpanVariant,
} from "../../session-type-glueing.examples";
import { buildGlueingExampleKernelSpec, buildGlueingExampleUserSpec } from "../../glueing-supervised-stack.examples";
import { makeSessionTypeGlueingSupervisedStack } from "../../session-type-supervised-stack";
import type { TwoObject } from "../../two-object-cat";
import {
  buildSessionTypeGlueingSweepRecord,
  collectSessionTypeGlueingSweepRunSnapshot,
  formatSessionTypeGlueingSourceCoverageLines,
  type SessionTypeGlueingSweepRunSnapshot,
} from "../../session-type-glueing-dashboard";
import { diffSessionTypeGlueingSweepRecord } from "../../session-type-glueing-consumer";
import type { SessionTypeGlueingSweepConfig } from "../../session-type-glueing-sweep";

const MANIFEST_PATH_FLAG = "manifest-path";
const SKIP_MISMATCH_FLAG = "skip-mismatch";

const DEFAULT_ASSIGNMENTS: Readonly<Record<string, string>> = {
  [DEFAULT_SESSION_TYPE_CHANNEL]: DEFAULT_SESSION_TYPE_OBJECT,
};

const DEFAULT_RUN_OPTIONS = {
  session: {
    runnerEvaluation: { sampleLimit: 4 },
    stack: { sampleLimit: 6 },
    stackRun: { operations: ["getenv"], stepLimit: 24 },
  },
  alignment: { sampleLimit: 4 },
  metadata: ["SessionTypeGlueingConsumer=Example106"],
  notes: ["Session-type glueing consumer runnable"],
} as const;

interface RunnableManifestMetadata {
  readonly path: string;
  readonly entryCount?: number;
  readonly replayedAt?: string;
}

interface RunnableSnapshotOptions {
  readonly manifest?: RunnableManifestMetadata;
  readonly mutateAlignmentMetadata?: boolean;
  readonly mutateAlignmentNotes?: boolean;
}

const buildConfig = (
  label: string,
  spanVariant: Example8GlueingSpanVariant,
  overrides: Partial<Pick<SessionTypeGlueingSweepConfig, "sessionTypeLiteral" | "assignments" | "source">> = {},
): SessionTypeGlueingSweepConfig => ({
  label,
  sessionTypeLiteral: overrides.sessionTypeLiteral ?? DEFAULT_SESSION_TYPE_LITERAL,
  assignments: overrides.assignments ?? DEFAULT_ASSIGNMENTS,
  glueingSpan: spanVariant,
  source: overrides.source ?? "manifest",
});

const buildAssignments = (
  assignments: Readonly<Record<string, string>>,
  kernelObjects: ReadonlySet<TwoObject>,
): Map<string, TwoObject> => {
  const result = new Map<string, TwoObject>();
  for (const [channel, object] of Object.entries(assignments)) {
    const candidate = object as TwoObject;
    if (!kernelObjects.has(candidate)) {
      const choices = Array.from(kernelObjects.values()).join(", ");
      throw new Error(`Assignment '${channel}' uses unknown kernel object '${object}'. Expected one of ${choices}.`);
    }
    result.set(channel, candidate);
  }
  return result;
};

export const sessionTypeGlueingConsumerRunnable: RunnableExample = {
  id: "106",
  outlineReference: 106,
  title: "Session-type glueing manifest diff consumer",
  summary:
    "Replays curated Example 8 session-type sweeps, compares them against fresh λ₍coop₎ runs, and surfaces manifest, queue, and source-coverage telemetry.",
  tags: ["phase-vii", "lambda-coop", "session-type", "glueing", "future-work"],
  async run(context?: RunnableExampleContext): Promise<RunnableOutcome> {
    const spanVariant = normalizeExample8GlueingSpanVariant(getRunnableFlag(context, GLUEING_SPAN_FLAG));
    const manifestPath = getRunnableFlag(context, MANIFEST_PATH_FLAG) ?? "/tmp/example8.session-type.manifest.json";
    const skipMismatch = Boolean(getRunnableFlag(context, SKIP_MISMATCH_FLAG));

    const { interaction, bridge } = makeExample8GlueingBridge({
      spanVariant,
      runnerOptions: { sampleLimit: 4 },
      metadata: ["Example8.glueingBridge=Runnable"],
      notes: ["Runnable Example 8 glueing bridge"],
    });
    const kernelObjectList = interaction.law.kernel.base.objects as readonly TwoObject[];
    const kernelObjects = new Set(kernelObjectList);
    const kernelSpec = buildGlueingExampleKernelSpec(kernelObjectList);
    const userSpec = buildGlueingExampleUserSpec<TwoObject>();

    const manifestReplay = new Date().toISOString();

    const buildSnapshot = (
      config: SessionTypeGlueingSweepConfig,
      options: RunnableSnapshotOptions = {},
    ): SessionTypeGlueingSweepRunSnapshot => {
      const assignments = buildAssignments(config.assignments, kernelObjects);
      const sessionType = parseSessionType(config.sessionTypeLiteral);
      const stack = makeSessionTypeGlueingSupervisedStack(
        bridge,
        interaction,
        sessionType,
        assignments,
        kernelSpec,
        userSpec,
        DEFAULT_RUN_OPTIONS,
      );
      const sessionMetadata = [...stack.metadata];
      if (options.manifest) {
        sessionMetadata.push(`sessionType.manifest.path=${options.manifest.path}`);
        if (options.manifest.entryCount !== undefined) {
          sessionMetadata.push(`sessionType.manifest.entryCount=${options.manifest.entryCount}`);
        }
        if (options.manifest.replayedAt) {
          sessionMetadata.push(`sessionType.manifest.replayedAt=${options.manifest.replayedAt}`);
        }
      }
      const alignmentMetadata = [...stack.alignment.alignmentSummary.metadata];
      if (options.mutateAlignmentMetadata && alignmentMetadata.length > 0) {
        alignmentMetadata.pop();
      }
      const alignmentNotes = [...stack.alignment.alignmentSummary.notes];
      if (options.mutateAlignmentNotes && alignmentNotes.length > 0) {
        alignmentNotes.pop();
      }
      return collectSessionTypeGlueingSweepRunSnapshot(
        config,
        {
          sessionMetadata,
          glueingMetadata: [...stack.glueingBridge.metadata],
          alignmentMetadata,
          alignmentNotes,
        },
        context?.rawFlags ?? [],
      );
    };

    const snapshots: SessionTypeGlueingSweepRunSnapshot[] = [];
    const manifestConfig = buildConfig("Example8-manifest", spanVariant);
    snapshots.push(
      buildSnapshot(manifestConfig, {
        manifest: { path: manifestPath, entryCount: 2, replayedAt: manifestReplay },
      }),
    );

    if (!skipMismatch) {
      const mismatchedConfig = buildConfig("Example8-mismatch", spanVariant, {
        source: "diff",
      });
      snapshots.push(
        buildSnapshot(mismatchedConfig, {
          mutateAlignmentMetadata: true,
        }),
      );
    }

    const blockedPlanConfig = buildConfig("Example8-blocked-plan", spanVariant, {
      source: "blocked-plan",
      assignments: {
        [DEFAULT_SESSION_TYPE_CHANNEL]: "★",
      },
    });
    snapshots.push(
      buildSnapshot(blockedPlanConfig, {
        manifest: { path: `${manifestPath}.blocked`, entryCount: 1, replayedAt: manifestReplay },
        mutateAlignmentNotes: true,
      }),
    );

    const suggestedManifestPath = `${manifestPath}.issues.json`;
    const blockedManifestPath = `${manifestPath}.blocked-plan.issues.json`;

    const record = buildSessionTypeGlueingSweepRecord(snapshots, {
      recordedSweepFile: "runnable/106-session-type-glueing-consumer", 
      generatedManifests: [
        { path: suggestedManifestPath, entryCount: 1, mode: "suggested", sourcePath: manifestPath },
      ],
      suggestedManifestWrites: [
        { path: suggestedManifestPath, entryCount: 1, sourcePath: manifestPath },
      ],
      blockedSuggestedManifestWrites: [
        { path: blockedManifestPath, sourcePath: manifestPath, mismatchedRuns: 1, totalRuns: 1, entryCount: 1 },
      ],
      blockedQueuedManifestInputs: ["/tmp/fw4/queued/example8.manifest.json"],
      blockedManifestPlans: [
        {
          path: blockedManifestPath,
          sourcePath: manifestPath,
          mismatchedRuns: 1,
          totalRuns: 1,
          entryCount: 1,
          entries: [
            {
              label: blockedPlanConfig.label,
              sessionTypeLiteral: blockedPlanConfig.sessionTypeLiteral,
              assignments: blockedPlanConfig.assignments,
              glueingSpan: blockedPlanConfig.glueingSpan,
            },
          ],
        },
      ],
      manifestQueue: {
        inputs: [manifestPath],
        replays: ["/tmp/fw4/replays/example8.manifest.json"],
        outputs: [suggestedManifestPath],
        blockedInputs: [blockedManifestPath],
        replayErrors: [{ path: "/tmp/fw4/queued/missing.json", error: "ENOENT" }],
        tested: false,
        testedAt: manifestReplay,
        testRevision: 7,
        testIssues: ["manifest-queue-sentinel-missing"],
        testWarnings: ["Re-run npm run session-type:manifest-queue:test before accepting manifests."],
        testOverride: {
          flag: "--allow-manifest-queue-issues",
          issues: ["sentinel missing"],
          reasons: ["Runnable demo"],
        },
      },
      sourceCoverage: { manifestInputs: skipMismatch ? 1 : 2, blockedPlans: 1 },
    });

    const summary = diffSessionTypeGlueingSweepRecord(record);
    const logs: string[] = [];
    logs.push(
      `Diff summary: runs=${summary.totalRuns} mismatched=${summary.mismatchedRuns} schema=${summary.schemaVersion}`,
    );
    for (const entry of summary.entries) {
      if (entry.issues.length === 0) {
        continue;
      }
      logs.push(`- ${entry.config.label}: ${entry.issues.join("; ")}`);
      if (entry.manifestSource) {
        logs.push(
          `  manifest=${entry.manifestSource.path ?? "<unknown>"} entries=${entry.manifestSource.entryCount ?? "?"}`,
        );
      }
      if (entry.runnerDiff) {
        logs.push(
          `  runner mismatch recorded=${String(entry.runnerDiff.recordedHolds)}→${String(
            entry.runnerDiff.recomputedHolds,
          )} mismatches=${String(entry.runnerDiff.recordedMismatches)}→${entry.runnerDiff.recomputedMismatches}`,
        );
      }
    }
    if (summary.manifestSourceTotals && summary.manifestSourceTotals.length > 0) {
      logs.push("Manifest sources:");
      for (const entry of summary.manifestSourceTotals) {
        logs.push(
          `  ${entry.source.path ?? "<unknown>"} runs=${entry.totalRuns} mismatched=${entry.mismatchedRuns}`,
        );
      }
    }
    if (summary.manifestQueue) {
      logs.push(
        `Manifest queue tested=${summary.manifestQueue.tested ?? false} revision=${summary.manifestQueue.testRevision ?? "?"}`,
      );
      if (summary.manifestQueue.testIssues && summary.manifestQueue.testIssues.length > 0) {
        logs.push(`  issues: ${summary.manifestQueue.testIssues.join(", ")}`);
      }
      if (summary.manifestQueue.testWarnings && summary.manifestQueue.testWarnings.length > 0) {
        logs.push(`  warnings: ${summary.manifestQueue.testWarnings.join(", ")}`);
      }
    }
    logs.push(...formatSessionTypeGlueingSourceCoverageLines(summary.sourceCoverage));

    return {
      logs,
      metadata: {
        totalRuns: summary.totalRuns,
        mismatchedRuns: summary.mismatchedRuns,
        manifestSourceTotals: summary.manifestSourceTotals ?? [],
        manifestQueue: summary.manifestQueue,
        sourceCoverage: summary.sourceCoverageTotals,
        blockedSuggestedManifestWrites: summary.blockedSuggestedManifestWrites ?? [],
        blockedManifestPlans: summary.blockedManifestPlans ?? [],
      },
    };
  },
};
