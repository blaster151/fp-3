// Phase IV integration: λ_{coop} × runner API adapters
// Isolated to avoid pulling heavy CategoryLimits dependencies when only evaluator is used.

import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import { buildRunnerFromInteraction, type StatefulRunner } from "./stateful-runner";
import { RunnerOracles, enumerateRunnerOracles, type RunnerOracleOptions, type RunnerOracleResult } from "./runner-oracles";
import { makeExample6MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import type { LambdaCoopResourceSummary, LambdaCoopUserComputation, LambdaCoopValue } from './lambda-coop';
import { summarizeUserComputationResources } from './lambda-coop';

export interface LambdaCoopRunnerAlignmentOptions<Obj> extends RunnerOracleOptions<Obj> {
  readonly includeTriangleEquivalence?: boolean;
}

export interface LambdaCoopRunnerAlignmentReport<Obj, Arr, Left, Right, Value> {
  readonly law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>;
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly oracles: ReadonlyArray<RunnerOracleResult>;
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
