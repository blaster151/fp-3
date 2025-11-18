import type { MonadComonadInteractionLaw } from './monad-comonad-interaction-law';
import {
  evaluateSupervisedStackWithLambdaCoop,
  type LambdaCoopSupervisedStackRunOptions,
  type LambdaCoopSupervisedStackRunResult,
} from './lambda-coop-supervised-stack';
import {
  checkSessionTypeRunnerEvaluationAgainstInteraction,
  collectSessionTypeChannelNames,
  type SessionTypeRunnerEvaluationOptions,
  type SessionTypeRunnerEvaluationReport,
} from './session-type-runner';
import { formatSessionType, type SessionType } from './session-type';
import {
  makeSupervisedStack,
  type KernelMonadSpec,
  type SupervisedStack,
  type SupervisedStackOptions,
  type UserMonadSpec,
} from './supervised-stack';
import {
  analyzeSupervisedStackLambdaCoopAlignment,
  analyzeSupervisedStackLambdaCoopAlignmentWithGlueingBridge,
  type LambdaCoopRunnerAlignmentOptions,
  type SupervisedStackLambdaCoopAlignmentReport,
  type SupervisedStackLambdaCoopGlueingAlignmentReport,
} from './lambda-coop.runner-alignment';
import type { GlueingRunnerBridgeResult } from './glueing-runner-bridge';

export interface SessionTypeSupervisedStackOptions<Obj> {
  readonly stack?: SupervisedStackOptions<Obj>;
  readonly runnerEvaluation?: Omit<SessionTypeRunnerEvaluationOptions<Obj>, 'assignments'>;
  readonly stackRun?: LambdaCoopSupervisedStackRunOptions;
  readonly metadata?: ReadonlyArray<string>;
  readonly notes?: ReadonlyArray<string>;
}

export interface SessionTypeSupervisedStackResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
> {
  readonly type: SessionType;
  readonly assignments: ReadonlyMap<string, Obj>;
  readonly stack: SupervisedStack<Obj, Arr, Left, Right, Value>;
  readonly runnerEvaluation: SessionTypeRunnerEvaluationReport<Obj>;
  readonly stackRun?: LambdaCoopSupervisedStackRunResult;
  readonly metadata: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

interface SessionTypeRunnerEvaluationSummary {
  readonly checked: number;
  readonly mismatches: number;
}

const summarizeRunnerEvaluation = <Obj>(
  report: SessionTypeRunnerEvaluationReport<Obj>,
): SessionTypeRunnerEvaluationSummary => {
  let checked = 0;
  let mismatches = 0;
  for (const entry of report.entries) {
    checked += entry.checked;
    mismatches += entry.mismatches;
  }
  return { checked, mismatches };
};

const buildRunnerEvaluationOptions = <Obj>(
  assignments: ReadonlyMap<string, Obj>,
  overrides?: SessionTypeSupervisedStackOptions<Obj>['runnerEvaluation'],
): SessionTypeRunnerEvaluationOptions<Obj> => ({
  assignments,
  ...(overrides?.sampleLimit !== undefined ? { sampleLimit: overrides.sampleLimit } : {}),
  ...(overrides?.metadata ? { metadata: overrides.metadata } : {}),
});

export const makeSessionTypeSupervisedStack = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  type: SessionType,
  assignments: ReadonlyMap<string, Obj>,
  kernelSpec: KernelMonadSpec<Obj, Left, Right>,
  userSpec: UserMonadSpec<Obj>,
  options: SessionTypeSupervisedStackOptions<Obj> = {},
): SessionTypeSupervisedStackResult<Obj, Arr, Left, Right, Value> => {
  const stack = makeSupervisedStack(interaction, kernelSpec, userSpec, options.stack);
  const runnerEvaluation = checkSessionTypeRunnerEvaluationAgainstInteraction(
    type,
    stack.runner,
    interaction,
    buildRunnerEvaluationOptions(assignments, options.runnerEvaluation),
  );
  const stackRun = options.stackRun
    ? evaluateSupervisedStackWithLambdaCoop(stack, options.stackRun)
    : undefined;

  const runnerSummary = summarizeRunnerEvaluation(runnerEvaluation);
  const channelNames = Array.from(collectSessionTypeChannelNames(type)).sort();
  const assignmentEntries = Array.from(assignments.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const metadata: string[] = [];
  metadata.push(`sessionType.stack.kernel=${stack.kernel.spec.name}`);
  metadata.push(`sessionType.stack.user=${stack.user.spec.name}`);
  metadata.push(`sessionType.stack.type=${formatSessionType(type)}`);
  metadata.push(`sessionType.stack.channels=${JSON.stringify(channelNames)}`);
  metadata.push(`sessionType.runner.assignments=${JSON.stringify(assignmentEntries)}`);
  metadata.push(`sessionType.runner.checked=${runnerSummary.checked}`);
  metadata.push(`sessionType.runner.mismatches=${runnerSummary.mismatches}`);
  metadata.push(`sessionType.runner.entries=${runnerEvaluation.entries.length}`);
  metadata.push(`sessionType.runner.holds=${runnerEvaluation.holds}`);
  if (runnerEvaluation.metadata) {
    metadata.push(...runnerEvaluation.metadata);
  }
  if (stackRun?.metadata) {
    metadata.push(...stackRun.metadata);
  }
  if (options.metadata) {
    metadata.push(...options.metadata);
  }

  const notes: string[] = [];
  for (const note of runnerEvaluation.notes) {
    notes.push(`sessionType.runner.note=${note}`);
  }
  if (stackRun?.summary) {
    notes.push(...stackRun.summary.notes);
  }
  if (options.notes) {
    notes.push(...options.notes);
  }

  return {
    type,
    assignments,
    stack,
    runnerEvaluation,
    ...(stackRun ? { stackRun } : {}),
    metadata,
  notes,
  };
};

export interface SessionTypeLambdaCoopAlignmentOptions<Obj>
  extends LambdaCoopRunnerAlignmentOptions<Obj> {}

export const analyzeSessionTypeSupervisedStackLambdaCoopAlignment = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  sessionStack: SessionTypeSupervisedStackResult<Obj, Arr, Left, Right, Value>,
  options: SessionTypeLambdaCoopAlignmentOptions<Obj> = {},
): SupervisedStackLambdaCoopAlignmentReport<Obj, Arr, Left, Right, Value> => {
  const mergedMetadata = [
    ...sessionStack.metadata,
    ...(options.alignmentMetadata ?? []),
  ];
  const mergedNotes = [
    ...sessionStack.notes,
    ...(options.alignmentNotes ?? []),
  ];
  const mergedOptions: LambdaCoopRunnerAlignmentOptions<Obj> = {
    ...options,
    ...(mergedMetadata.length > 0 ? { alignmentMetadata: mergedMetadata } : {}),
    ...(mergedNotes.length > 0 ? { alignmentNotes: mergedNotes } : {}),
  };
  return analyzeSupervisedStackLambdaCoopAlignment(
    interaction,
    sessionStack.stack,
    mergedOptions,
  );
};

const buildGlueingSupervisedStackMetadata = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(stack: SupervisedStack<Obj, Arr, Left, Right, Value>): ReadonlyArray<string> => [
  `Glueing.supervisedStack.kernel=${stack.kernel.spec.name}`,
  `Glueing.supervisedStack.user=${stack.user.spec.name}`,
  `Glueing.supervisedStack.runnerMetadata=${stack.runner.metadata?.length ?? 0}`,
];

const buildGlueingSupervisedStackNotes = <
  GlueObj,
  GlueArr,
  GlueLeft,
  GlueRight,
  GlueValue,
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  glueingBridge: GlueingRunnerBridgeResult<
    GlueObj,
    GlueArr,
    GlueLeft,
    GlueRight,
    GlueValue,
    Obj,
    Arr,
    Left,
    Right,
    Value
  >,
): ReadonlyArray<string> => [
  `Glueing.supervisedStack.runnerSummary total=${glueingBridge.runnerSummary.total} failed=${glueingBridge.runnerSummary.failed}`,
  `Glueing.supervisedStack.residualSummary total=${glueingBridge.residualSummary.total} failed=${glueingBridge.residualSummary.failed}`,
  `Glueing.supervisedStack.residualLawDiagnostics=${glueingBridge.residualLaw.diagnostics.length}`,
];

export interface SessionTypeGlueingSupervisedStackOptions<Obj> {
  readonly session?: SessionTypeSupervisedStackOptions<Obj>;
  readonly alignment?: LambdaCoopRunnerAlignmentOptions<Obj>;
  readonly metadata?: ReadonlyArray<string>;
  readonly notes?: ReadonlyArray<string>;
}

export interface SessionTypeGlueingSupervisedStackResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  GlueObj,
  GlueArr,
  GlueLeft,
  GlueRight,
  GlueValue,
> {
  readonly session: SessionTypeSupervisedStackResult<Obj, Arr, Left, Right, Value>;
  readonly glueingBridge: GlueingRunnerBridgeResult<
    GlueObj,
    GlueArr,
    GlueLeft,
    GlueRight,
    GlueValue,
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly alignment: SupervisedStackLambdaCoopGlueingAlignmentReport<
    Obj,
    Arr,
    Left,
    Right,
    Value,
    GlueObj,
    GlueArr,
    GlueLeft,
    GlueRight,
    GlueValue
  >;
  readonly metadata: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

export const makeSessionTypeGlueingSupervisedStack = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  GlueObj,
  GlueArr,
  GlueLeft,
  GlueRight,
  GlueValue,
>(
  glueingBridge: GlueingRunnerBridgeResult<
    GlueObj,
    GlueArr,
    GlueLeft,
    GlueRight,
    GlueValue,
    Obj,
    Arr,
    Left,
    Right,
    Value
  >,
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  type: SessionType,
  assignments: ReadonlyMap<string, Obj>,
  kernelSpec: KernelMonadSpec<Obj, Left, Right>,
  userSpec: UserMonadSpec<Obj>,
  options: SessionTypeGlueingSupervisedStackOptions<Obj> = {},
): SessionTypeGlueingSupervisedStackResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  GlueObj,
  GlueArr,
  GlueLeft,
  GlueRight,
  GlueValue
> => {
  const session = makeSessionTypeSupervisedStack(
    interaction,
    type,
    assignments,
    kernelSpec,
    userSpec,
    options.session,
  );
  const glueingStackMetadata = buildGlueingSupervisedStackMetadata(session.stack);
  const glueingStackNotes = buildGlueingSupervisedStackNotes(glueingBridge);
  const optionMetadata = options.metadata ?? [];
  const optionNotes = options.notes ?? [];
  const alignmentMetadata = [
    ...session.metadata,
    ...glueingStackMetadata,
    ...optionMetadata,
    ...(options.alignment?.alignmentMetadata ?? []),
  ];
  const alignmentNotes = [
    ...session.notes,
    ...glueingStackNotes,
    ...optionNotes,
    ...(options.alignment?.alignmentNotes ?? []),
  ];
  const alignment = analyzeSupervisedStackLambdaCoopAlignmentWithGlueingBridge(
    interaction,
    session.stack,
    glueingBridge,
    {
      ...(options.alignment ?? {}),
      ...(alignmentMetadata.length > 0 ? { alignmentMetadata } : {}),
      ...(alignmentNotes.length > 0 ? { alignmentNotes } : {}),
    },
  );
  const metadata = [
    ...session.metadata,
    ...glueingStackMetadata,
    ...glueingBridge.metadata,
    ...optionMetadata,
    ...(options.alignment?.alignmentMetadata ?? []),
  ];
  const notes = [
    ...session.notes,
    ...glueingStackNotes,
    ...glueingBridge.notes,
    ...optionNotes,
    ...(options.alignment?.alignmentNotes ?? []),
  ];
  return { session, glueingBridge, alignment, metadata, notes };
};
