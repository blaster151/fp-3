import type { GlueingInteractionLawSummary } from "./functor-interaction-law";
import {
  buildRunnerFromInteraction,
  type BuildRunnerOptions,
} from "./stateful-runner";
import type {
  MonadComonadInteractionLaw,
} from "./monad-comonad-interaction-law";
import {
  enumerateRunnerOracles,
  summarizeRunnerOracles,
  summarizeResidualRunnerOracles,
  RunnerOracles,
  type RunnerOracleOptions,
  type RunnerOracleSummary,
  type ResidualRunnerOracleSummary,
} from "./runner-oracles";
import {
  makeResidualInteractionLaw,
  makeResidualInteractionLawFromRunner,
  type ResidualInteractionLawSummary,
  type ResidualInteractionLawFromRunnerOptions,
} from "./residual-interaction-law";
import {
  makeResidualRunnerFromInteractionLaw,
  identityResidualRunnerMorphism,
} from "./residual-stateful-runner";

export interface GlueingRunnerBridgeOptions<
  RunObj,
  RunArr,
  RunLeft,
  RunRight,
  RunValue,
> {
  readonly interaction: MonadComonadInteractionLaw<
    RunObj,
    RunArr,
    RunLeft,
    RunRight,
    RunValue,
    RunObj,
    RunArr
  >;
  readonly runnerOptions?: BuildRunnerOptions;
  readonly oracleOptions?: RunnerOracleOptions<RunObj>;
  readonly residualOracleOptions?: RunnerOracleOptions<RunObj>;
  readonly residualLawOptions?: ResidualInteractionLawFromRunnerOptions<
    RunObj,
    RunLeft,
    RunRight,
    RunValue
  >;
}

export interface GlueingRunnerBridgeResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  RunObj,
  RunArr,
  RunLeft,
  RunRight,
  RunValue,
> {
  readonly summary: GlueingInteractionLawSummary<Obj, Arr, Left, Right, Value>;
  readonly interaction: MonadComonadInteractionLaw<
    RunObj,
    RunArr,
    RunLeft,
    RunRight,
    RunValue,
    RunObj,
    RunArr
  >;
  readonly runnerSummary: RunnerOracleSummary;
  readonly residualSummary: ResidualRunnerOracleSummary;
  readonly residualLaw: ResidualInteractionLawSummary<RunObj, RunArr, RunLeft, RunRight, RunValue>;
  readonly metadata: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

const pullbackMetadata = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  summary: GlueingInteractionLawSummary<Obj, Arr, Left, Right, Value>,
): string =>
  `Glueing.residualBridge.pullbackStable=${
    summary.leftSubcategory.pullbackStable && summary.rightSubcategory.pullbackStable
      ? "true"
      : "false"
  }`;

export const bridgeGlueingSummaryToResidualRunner = <
  Obj,
  Arr,
  Left,
  Right,
  Value,
  RunObj,
  RunArr,
  RunLeft,
  RunRight,
  RunValue,
>(
  summary: GlueingInteractionLawSummary<Obj, Arr, Left, Right, Value>,
  options: GlueingRunnerBridgeOptions<RunObj, RunArr, RunLeft, RunRight, RunValue>,
): GlueingRunnerBridgeResult<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  RunObj,
  RunArr,
  RunLeft,
  RunRight,
  RunValue
> => {
  const { interaction } = options;
  const runner = buildRunnerFromInteraction(interaction, {
    ...options.runnerOptions,
    metadata: [
      "Glueing residual bridge: runner constructed for glueing summary.",
      ...(options.runnerOptions?.metadata ?? []),
    ],
  });
  const runnerSummary = summarizeRunnerOracles(
    enumerateRunnerOracles(runner, interaction, options.oracleOptions),
  );

  const spanCount = summary.span.length;
  const evaluationCount = summary.evaluations.length;
  const residualSeed = makeResidualInteractionLaw(interaction.law, {
    notes: [
      `Glueing residual bridge: ${spanCount} span component(s), ${evaluationCount} evaluation sample(s).`,
      ...(summary.notes ?? []),
    ],
  });

  const residualRunner = makeResidualRunnerFromInteractionLaw(
    runner,
    interaction,
    residualSeed,
    {
      metadata: [
        `Glueing residual runner spanCount=${spanCount} evaluationCount=${evaluationCount}.`,
        ...(summary.metadata ?? []),
      ],
    },
  );

  const residualLaw = makeResidualInteractionLawFromRunner(
    interaction.law,
    residualRunner,
    {
      includeRunnerDiagnostics: true,
      ...(options.residualLawOptions ?? {}),
      notes: [
        `Glueing residual bridge: runner-derived law for ${summary.leftSubcategory.label}/${summary.rightSubcategory.label}.`,
        ...(options.residualLawOptions?.notes ?? []),
        ...(summary.notes ?? []),
      ],
    },
  );

  const residualResults = [
    RunnerOracles.residualMorphism(
      identityResidualRunnerMorphism(residualRunner, interaction),
      residualRunner,
      interaction,
      options.residualOracleOptions,
    ),
    RunnerOracles.residualInteraction(
      residualRunner,
      interaction,
      residualLaw,
      options.residualOracleOptions,
    ),
  ];
  const residualSummary = summarizeResidualRunnerOracles(residualResults);

  const metadata: string[] = [
    `Glueing.residualBridge.spanCount=${spanCount}`,
    `Glueing.residualBridge.evaluationCount=${evaluationCount}`,
    `Glueing.residualBridge.runnerOracles=${JSON.stringify({
      total: runnerSummary.total,
      failed: runnerSummary.failed,
    })}`,
    `Glueing.residualBridge.residualOracles=${JSON.stringify({
      total: residualSummary.total,
      failed: residualSummary.failed,
    })}`,
    pullbackMetadata(summary),
  ];

  const notes: string[] = [
    ...runnerSummary.notes,
    ...residualSummary.notes,
    ...(summary.notes ?? []),
  ];

  return {
    summary,
    interaction,
    runnerSummary,
    residualSummary,
    residualLaw,
    metadata,
    notes,
  };
};
