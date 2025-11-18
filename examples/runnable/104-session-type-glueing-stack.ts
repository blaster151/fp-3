import type { RunnableExample, RunnableExampleContext, RunnableOutcome } from "./types";
import { getRunnableFlag, getRunnableFlagValues } from "./types";
import { parseSessionType, formatSessionType } from "../../session-type";
import {
  makeExample8GlueingBridge,
  normalizeExample8GlueingSpanVariant,
  type Example8GlueingSpanVariant,
} from "../../session-type-glueing.examples";
import { buildGlueingExampleKernelSpec, buildGlueingExampleUserSpec } from "../../glueing-supervised-stack.examples";
import { makeSessionTypeGlueingSupervisedStack } from "../../session-type-supervised-stack";
import type { TwoObject } from "../../two-object-cat";
import type { SessionTypeRunnerEvaluationReport } from "../../session-type-runner";
import {
  ASSIGNMENT_FLAG,
  ASSIGNMENT_JSON_FLAG,
  DEFAULT_SESSION_TYPE_LITERAL,
  GLUEING_SPAN_FLAG,
  SESSION_TYPE_FLAG,
} from "../../session-type-glueing-cli";

const summarizeRunnerEvaluation = <Obj>(report: SessionTypeRunnerEvaluationReport<Obj>) => {
  let checked = 0;
  let mismatches = 0;
  for (const entry of report.entries) {
    checked += entry.checked;
    mismatches += entry.mismatches;
  }
  return { checked, mismatches };
};

const parseTwoObject = (value: string, kernelObjects: readonly TwoObject[]): TwoObject => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Assignment value must not be empty.");
  }
  const normalized = trimmed.toLowerCase();
  const aliasMap: Record<string, TwoObject> = {
    "•": "•",
    dot: "•",
    bullet: "•",
    circle: "•",
    "★": "★",
    star: "★",
    asterisk: "★",
    "?": "?",
    question: "?",
    unknown: "?",
  };
  const candidate = aliasMap[normalized] ?? aliasMap[trimmed];
  const available = new Set(kernelObjects);
  if (candidate && available.has(candidate)) {
    return candidate;
  }
  if (available.has(trimmed as TwoObject)) {
    return trimmed as TwoObject;
  }
  const choices = Array.from(available.values()).join(", ");
  throw new Error(`Unknown Example 8 kernel object '${value}'. Expected one of ${choices}.`);
};

const parseAssignmentToken = (
  token: string,
  kernelObjects: readonly TwoObject[],
): [string, TwoObject] => {
  const separator = token.includes("=") ? "=" : token.includes(":") ? ":" : undefined;
  if (!separator) {
    throw new Error(`Assignment '${token}' must use '=' or ':'.`);
  }
  const [rawChannel, rawValue] = token.split(separator, 2);
  if (!rawChannel) {
    throw new Error(`Assignment '${token}' is missing a channel name.`);
  }
  const channel = rawChannel.trim();
  if (channel.length === 0) {
    throw new Error(`Assignment '${token}' is missing a channel name.`);
  }
  const value = parseTwoObject(rawValue ?? "", kernelObjects);
  return [channel, value];
};

const parseAssignmentsFromFlags = (
  values: ReadonlyArray<string>,
  kernelObjects: readonly TwoObject[],
): Map<string, TwoObject> => {
  const result = new Map<string, TwoObject>();
  for (const entry of values) {
    const [channel, object] = parseAssignmentToken(entry, kernelObjects);
    result.set(channel, object);
  }
  return result;
};

const parseAssignmentsFromJson = (
  json: string,
  kernelObjects: readonly TwoObject[],
): Map<string, TwoObject> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`Failed to parse assignment JSON: ${String(error)}`);
  }
  if (parsed === null || typeof parsed !== "object") {
    throw new Error("Assignment JSON must be an object mapping channel names to kernel objects.");
  }
  const result = new Map<string, TwoObject>();
  for (const [channel, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof channel !== "string" || channel.trim().length === 0) {
      throw new Error("Assignment JSON keys must be non-empty strings.");
    }
    if (typeof value !== "string") {
      throw new Error(`Assignment JSON value for '${channel}' must be a string.`);
    }
    result.set(channel, parseTwoObject(value, kernelObjects));
  }
  return result;
};

const describeAssignments = (assignments: ReadonlyMap<string, TwoObject>): string => {
  const entries = Array.from(assignments.entries()).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
};

const buildRunnableSessionConfig = (
  context: RunnableExampleContext | undefined,
  kernelObjects: readonly TwoObject[],
) => {
  const sessionTypeLiteral = getRunnableFlag(context, SESSION_TYPE_FLAG) ?? DEFAULT_SESSION_TYPE_LITERAL;
  const defaultObject = (kernelObjects[0] as TwoObject | undefined) ?? "•";
  let assignments: Map<string, TwoObject> | undefined;
  let assignmentSource = "default";
  const assignmentJson = getRunnableFlag(context, ASSIGNMENT_JSON_FLAG);
  if (assignmentJson) {
    assignments = parseAssignmentsFromJson(assignmentJson, kernelObjects);
    assignmentSource = "assignment-json";
  }
  const assignmentFlags = getRunnableFlagValues(context, ASSIGNMENT_FLAG);
  if (assignmentFlags.length > 0) {
    const parsed = parseAssignmentsFromFlags(assignmentFlags, kernelObjects);
    if (!assignments) {
      assignments = parsed;
    } else {
      for (const [channel, value] of parsed) {
        assignments.set(channel, value);
      }
    }
    assignmentSource = assignments && assignmentSource === "assignment-json"
      ? "assignment-json+assignment"
      : "assignment";
  }
  if (!assignments || assignments.size === 0) {
    assignments = new Map<string, TwoObject>([["Y", defaultObject]]);
  }
  return { sessionTypeLiteral, assignments, assignmentSource };
};

export const sessionTypeGlueingStackRunnable: RunnableExample = {
  id: "104",
  outlineReference: 104,
  title: "Session-type glueing supervised-stack alignment",
  summary:
    "Runs the Example 8 session-type specification through the glueing bridge, supervised stack builder, and λ₍coop₎ alignment report.",
  tags: ["phase-vii", "lambda-coop", "session-type", "glueing", "future-work"],
  async run(context?: RunnableExampleContext): Promise<RunnableOutcome> {
    const spanVariant: Example8GlueingSpanVariant = normalizeExample8GlueingSpanVariant(
      getRunnableFlag(context, GLUEING_SPAN_FLAG),
    );
    const { interaction, bridge } = makeExample8GlueingBridge({
      runnerOptions: { sampleLimit: 4 },
      metadata: ["Example8.glueingBridge=Runnable"],
      notes: ["Runnable Example 8 glueing bridge"],
      spanVariant,
    });
    const kernelObjects = interaction.law.kernel.base.objects as readonly TwoObject[];
    const kernelSpec = buildGlueingExampleKernelSpec(kernelObjects);
    const userSpec = buildGlueingExampleUserSpec<TwoObject>();
    const { sessionTypeLiteral, assignments, assignmentSource } = buildRunnableSessionConfig(
      context,
      kernelObjects,
    );
    const sessionType = parseSessionType(sessionTypeLiteral);

    const sessionStack = makeSessionTypeGlueingSupervisedStack(
      bridge,
      interaction,
      sessionType,
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

    const logs: string[] = [];
    const { session, glueingBridge, alignment } = sessionStack;
    const runnerSummary = summarizeRunnerEvaluation(session.runnerEvaluation);

    logs.push("=== Session-Type Glueing Supervised Stack (Example 8) ===");
    logs.push(`Session type literal: ${formatSessionType(session.type)} (source=${sessionTypeLiteral})`);
    logs.push(`Assignments (${assignmentSource}): ${describeAssignments(session.assignments)}`);
    logs.push(`Glueing span variant: ${spanVariant}`);
    logs.push(
      `Session runner evaluation: holds=${session.runnerEvaluation.holds} checked=${runnerSummary.checked} mismatches=${runnerSummary.mismatches}`,
    );
    logs.push(
      `Glueing runner summary: total=${glueingBridge.runnerSummary.total} failed=${glueingBridge.runnerSummary.failed}`,
    );
    logs.push(
      `Glueing residual summary: total=${glueingBridge.residualSummary.total} failed=${glueingBridge.residualSummary.failed}`,
    );
    logs.push(
      `Alignment metadata entries=${alignment.alignmentSummary.metadata.length} notes=${alignment.alignmentSummary.notes.length}`,
    );
    logs.push("Sample alignment metadata:");
    for (const line of alignment.alignmentSummary.metadata.slice(0, 6)) {
      logs.push(`  • ${line}`);
    }
    if (alignment.alignmentSummary.metadata.length > 6) {
      logs.push(
        `  • … (${alignment.alignmentSummary.metadata.length - 6} additional metadata entries suppressed)`,
      );
    }

    return {
      logs,
      metadata: {
        sessionMetadata: sessionStack.metadata,
        sessionNotes: sessionStack.notes,
        glueingMetadata: glueingBridge.metadata,
        glueingNotes: glueingBridge.notes,
        alignmentMetadata: alignment.alignmentSummary.metadata,
        alignmentNotes: alignment.alignmentSummary.notes,
        exampleArgs: context?.rawFlags ?? [],
      },
    };
  },
};
