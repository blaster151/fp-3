import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import type { StatefulRunner } from "./stateful-runner";
import {
  buildRunnerLawReport,
  checkRunnerCoalgebra,
  checkRunnerCostate,
  checkRunTCategoryLaws,
  checkRunnerStateHandlers,
  checkPsiToThetaConsistency,
  checkRunnerCurryingConsistency,
  checkRunnerAxioms,
  runnerToCoalgebraComponents,
  coalgebraComponentsToRunner,
  runnerToCostateComponents,
  costateComponentsToRunner,
  coalgebraToCostate,
  costateToCoalgebra,
} from "./stateful-runner";

export interface RunnerOracleResult {
  readonly registryPath: string;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
  readonly diagnostics?: unknown;
}

export interface RunnerOracleOptions<Obj> {
  readonly sampleLimit?: number;
  readonly objectFilter?: (object: Obj) => boolean;
}

const path = (suffix: string): string => `runner.${suffix}`;

export const RunnerOracles = {
  axioms: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    // checkRunnerAxioms expects RunnerAxiomOptions with a polymorphic objectFilter signature.
    // Rewrap options to avoid generic name shadowing under exactOptionalPropertyTypes.
    const axiomOptions: {
      sampleLimit?: number;
      metadata?: ReadonlyArray<string>;
      objectFilter?: (<T>(object: T) => boolean);
    } = {};
    if (options.sampleLimit !== undefined) axiomOptions.sampleLimit = options.sampleLimit;
    if (options.objectFilter) {
      const f = options.objectFilter as (o: Obj) => boolean;
      axiomOptions.objectFilter = (<T>(o: T) => f(o as unknown as Obj));
    }
    const report = checkRunnerAxioms(runner, law, axiomOptions as never);
    return {
      registryPath: path("axioms"),
      holds: report.holds,
      details: report.details.slice(0, 12),
      diagnostics: report,
    };
  },
  currying: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const report = checkRunnerCurryingConsistency(runner, law, options);
    return {
      registryPath: path("currying"),
      holds: report.mismatchesTotal === 0,
      details: report.details,
      diagnostics: report,
    };
  },
  coalgebra: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const report = checkRunnerCoalgebra(runner, law, options);
    return {
      registryPath: path("coalgebra"),
      holds: report.holds,
      details: report.details.slice(0, 12),
      diagnostics: report,
    };
  },
  costate: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const report = checkRunnerCostate(runner, law, options);
    return {
      registryPath: path("costate"),
      holds: report.holds,
      details: report.details.slice(0, 12),
      diagnostics: report,
    };
  },
  category: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const report = checkRunTCategoryLaws(law, { source: runner }, options);
    return {
      registryPath: path("categoryLaws"),
      holds: report.holds,
      details: report.details.slice(0, 12),
      diagnostics: report,
    };
  },
  handlers: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const report = checkRunnerStateHandlers<Obj, Arr, Left, Right, Value>(runner, law, options);
    return {
      registryPath: path("handlers"),
      holds: report.holds,
      details: report.details.slice(0, 12),
      diagnostics: report,
    };
  },
  psiTheta: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const psiToTheta = checkPsiToThetaConsistency(runner, law, options);
    return {
      registryPath: path("psiToTheta"),
      holds: psiToTheta.mismatches === 0,
      details: psiToTheta.details.slice(0, 12),
      diagnostics: psiToTheta,
    };
  },
  unified: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: { sampleLimit?: number; includeFinite?: boolean } = {},
  ): RunnerOracleResult => {
    const report = buildRunnerLawReport(runner, law, options);
    return {
      registryPath: path("unified"),
      holds: report.holds,
      details: report.details.slice(0, 16),
      diagnostics: report,
    };
  },
  equivalenceCoalgebra: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const forward = runnerToCoalgebraComponents(runner, law, options);
    const back = coalgebraComponentsToRunner(forward.components, law, options);
    const holds = forward.diagnostics.mismatches === 0 && back.diagnostics.mismatches === 0;
    return {
      registryPath: path("equivalence.coalgebra"),
      holds,
      details: [...forward.diagnostics.details.slice(0, 6), ...back.diagnostics.details.slice(0, 6)],
      diagnostics: { forward, back },
    };
  },
  equivalenceCostate: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const forward = runnerToCostateComponents(runner, law, options);
    const back = costateComponentsToRunner(forward.components, law, options);
    const holds = forward.diagnostics.mismatches === 0 && back.diagnostics.mismatches === 0;
    return {
      registryPath: path("equivalence.costate"),
      holds,
      details: [...forward.diagnostics.details.slice(0, 6), ...back.diagnostics.details.slice(0, 6)],
      diagnostics: { forward, back },
    };
  },
  equivalenceTriangle: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    // Form coalgebra, translate to costate, then back to coalgebra, measuring mismatches.
    const coal = runnerToCoalgebraComponents(runner, law, options);
    const cost = coalgebraToCostate(coal.components, law, options);
    const coalBack = costateToCoalgebra(cost.components, law, options);
    const holds = coal.diagnostics.mismatches === 0 && cost.diagnostics.mismatches === 0 && coalBack.diagnostics.mismatches === 0;
    return {
      registryPath: path("equivalence.triangle"),
      holds,
      details: [
        ...coal.diagnostics.details.slice(0, 4),
        ...cost.diagnostics.details.slice(0, 4),
        ...coalBack.diagnostics.details.slice(0, 4),
      ],
      diagnostics: { coal, cost, coalBack },
    };
  },
};

export const enumerateRunnerOracles = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: RunnerOracleOptions<Obj> = {},
): ReadonlyArray<RunnerOracleResult> => [
  RunnerOracles.axioms(runner, law, options),
  RunnerOracles.currying(runner, law, options),
  RunnerOracles.coalgebra(runner, law, options),
  RunnerOracles.costate(runner, law, options),
  RunnerOracles.category(runner, law, options),
  RunnerOracles.handlers(runner, law, options),
  RunnerOracles.psiTheta(runner, law, options),
  RunnerOracles.unified(runner, law, options),
  RunnerOracles.equivalenceCoalgebra(runner, law, options),
  RunnerOracles.equivalenceCostate(runner, law, options),
  RunnerOracles.equivalenceTriangle(runner, law, options),
];
