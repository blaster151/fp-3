// Phase IV integration: λ_{coop} × runner API adapters
// Isolated to avoid pulling heavy CategoryLimits dependencies when only evaluator is used.

import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import { buildRunnerFromInteraction, type StatefulRunner } from "./stateful-runner";
import {
  RunnerOracles,
  enumerateRunnerOracles,
  type RunnerOracleOptions,
  type RunnerOracleResult,
} from "./runner-oracles";
import { makeExample6MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import type { LambdaCoopResourceSummary, LambdaCoopUserComputation, LambdaCoopValue } from "./lambda-coop";
import { summarizeUserComputationResources } from "./lambda-coop";
import type { SupervisedStack } from "./supervised-stack";
import {
  buildLambdaCoopComparisonArtifacts,
  type LambdaCoopComparisonArtifacts,
} from "./supervised-stack-lambda-coop";

export interface LambdaCoopRunnerAlignmentOptions<Obj> extends RunnerOracleOptions<Obj> {
  readonly includeTriangleEquivalence?: boolean;
}

export interface LambdaCoopRunnerAlignmentReport<Obj, Arr, Left, Right, Value> {
  readonly law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>;
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly oracles: ReadonlyArray<RunnerOracleResult>;
  readonly notes: ReadonlyArray<string>;
}

export interface SupervisedStackLambdaCoopAlignmentReport<
  Obj,
  Arr,
  Left,
  Right,
  Value
> {
  readonly law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>;
  readonly stack: SupervisedStack<Obj, Arr, Left, Right, Value>;
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly oracles: ReadonlyArray<RunnerOracleResult>;
  readonly lambdaCoop: LambdaCoopComparisonArtifacts & { readonly metadata: ReadonlyArray<string> };
  readonly comparison: {
    readonly unsupportedByKernel: ReadonlyArray<string>;
    readonly unacknowledgedByUser: ReadonlyArray<string>;
  };
  readonly notes: ReadonlyArray<string>;
}

export function analyzeLambdaCoopRunnerAlignment<Obj, Arr, Left, Right, Value>(
  law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: LambdaCoopRunnerAlignmentOptions<Obj> = {},
): LambdaCoopRunnerAlignmentReport<Obj, Arr, Left, Right, Value> {
  const runner = buildRunnerFromInteraction(law, { metadata: ["λ_{coop} alignment: runner built from ψ currying"] });
  const oracleOptions: any = {};
  if (options.sampleLimit !== undefined) oracleOptions.sampleLimit = options.sampleLimit;
  if (options.objectFilter) oracleOptions.objectFilter = options.objectFilter;
  const base = enumerateRunnerOracles(runner, law, oracleOptions);
  const extras: RunnerOracleResult[] = [];
  if (options.includeTriangleEquivalence) {
    extras.push(RunnerOracles.equivalenceTriangle(runner, law, oracleOptions));
  }
  return { law, runner, oracles: [...base, ...extras], notes: ["λ_{coop}: aligned runner diagnostics with coalgebra/costate equivalences"] };
}

export function analyzeSupervisedStackLambdaCoopAlignment<
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  stack: SupervisedStack<Obj, Arr, Left, Right, Value>,
  options: LambdaCoopRunnerAlignmentOptions<Obj> = {},
): SupervisedStackLambdaCoopAlignmentReport<Obj, Arr, Left, Right, Value> {
  const runner = stack.runner;
  const oracleOptions: any = {};
  if (options.sampleLimit !== undefined) oracleOptions.sampleLimit = options.sampleLimit;
  if (options.objectFilter) oracleOptions.objectFilter = options.objectFilter;
  const oracles = enumerateRunnerOracles(runner, interaction, oracleOptions);

  const lambdaCoop =
    stack.lambdaCoopComparison ??
    ({
      ...buildLambdaCoopComparisonArtifacts(
        (stack.kernel.monad?.operations ?? []).map((op) => ({
          name: op.name,
          kind: op.kind,
        })),
        stack.user.monad?.allowedKernelOperations ?? new Set<string>(),
        { stateCarrierName: stack.kernel.spec.name },
      ),
      metadata: [] as ReadonlyArray<string>,
    } as LambdaCoopComparisonArtifacts & { readonly metadata: ReadonlyArray<string> });

  const notes: string[] = [
    ...stack.diagnostics,
    ...stack.comparison.diagnostics,
    ...lambdaCoop.diagnostics,
    ...lambdaCoop.metadata,
    `λ₍coop₎ alignment status: ${lambdaCoop.aligned ? "aligned" : "issues detected"}`,
  ];
  if (lambdaCoop.issues.length > 0) notes.push(...lambdaCoop.issues);
  if (stack.residualSummary) {
    notes.push(...stack.residualSummary.diagnostics);
  }

  return {
    law: interaction,
    stack,
    runner,
    oracles,
    lambdaCoop,
    comparison: {
      unsupportedByKernel: lambdaCoop.unsupportedByKernel,
      unacknowledgedByUser: lambdaCoop.unacknowledgedByUser,
    },
    notes,
  };
}

export interface SupervisedLambdaCoopExampleReport<Obj, Arr, Left, Right, Value> {
  readonly law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>;
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly resourceSummary: LambdaCoopResourceSummary;
  readonly oracles: ReadonlyArray<RunnerOracleResult>;
}

export function supervisedLambdaCoopExample(): SupervisedLambdaCoopExampleReport<any, any, any, any, any> {
  const runnerLiteral: LambdaCoopValue = {
    kind: 'runnerLiteral',
    stateCarrier: 'store',
    clauses: [
      { operation: 'op', parameter: 'x', parameterType: { kind: 'base', name: 'X' }, body: { kind: 'kernelReturn', value: { kind: 'unitValue' } } },
    ],
  };
  const userComputation: LambdaCoopUserComputation = {
    kind: 'userRun',
    runner: runnerLiteral,
    computation: {
      kind: 'userOperation', operation: 'op', argument: { kind: 'unitValue' }, continuation: { parameter: 'u', body: { kind: 'userReturn', value: { kind: 'unitValue' } } },
      annotation: { operations: ['op'], states: ['store'] },
    },
  };
  const resourceSummary = summarizeUserComputationResources(userComputation);
  const law = makeExample6MonadComonadInteractionLaw();
  const runner = buildRunnerFromInteraction(law);
  const oracles = enumerateRunnerOracles(runner, law, { sampleLimit: 4 });
  return { law: law as any, runner: runner as any, resourceSummary, oracles };
}
