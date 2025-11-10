import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import type { RunnerMorphism, StatefulRunner } from "./stateful-runner";
import {
  buildRunnerLawReport,
  checkRunnerCoalgebra,
  checkRunnerCostate,
  checkRunTCategoryLaws,
  checkRunnerStateHandlers,
  checkPsiToThetaConsistency,
  checkRunnerCurryingConsistency,
  checkRunnerAxioms,
  checkRunnerMorphism,
  runnerToCoalgebraComponents,
  coalgebraComponentsToRunner,
  runnerToCostateComponents,
  costateComponentsToRunner,
  coalgebraToCostate,
  costateToCoalgebra,
  compareRunnerThetas,
  compareCoalgebraComponents,
  compareCostateComponents,
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
  readonly translatorSampleLimit?: number;
  readonly translatorObjectFilter?: (object: Obj) => boolean;
}

const path = (suffix: string): string => `runner.${suffix}`;

const translatorOptions = <Obj>(
  options: RunnerOracleOptions<Obj>,
): { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } => {
  const sampleLimit =
    options.translatorSampleLimit !== undefined ? options.translatorSampleLimit : options.sampleLimit;
  const objectFilter =
    options.translatorObjectFilter !== undefined ? options.translatorObjectFilter : options.objectFilter;
  return { sampleLimit, objectFilter };
};

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
    morphism: <Obj, Arr, Left, Right, Value>(
      morphism: RunnerMorphism<Obj, Left, Right, Value, unknown, unknown>,
      source: StatefulRunner<Obj, Left, Right, Value>,
      target: StatefulRunner<Obj, Left, Right, Value>,
      law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
      options: RunnerOracleOptions<Obj> = {},
    ): RunnerOracleResult => {
      const morphismOptions: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {};
      if (options.sampleLimit !== undefined) morphismOptions.sampleLimit = options.sampleLimit;
      if (options.objectFilter) morphismOptions.objectFilter = options.objectFilter;
      const report = checkRunnerMorphism(morphism, source, target, law, morphismOptions);
      return {
        registryPath: path("morphism"),
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
    const translatorOpts = translatorOptions(options);
    const forward = runnerToCoalgebraComponents(runner, law, translatorOpts);
    const back = coalgebraComponentsToRunner(forward.components, law, translatorOpts);
    const zigZagRunner = compareRunnerThetas(runner, back.runner, law, options);
    const zigZagCoalgebra = compareCoalgebraComponents(forward.components, back.components, law, options);
    const meta: string[] = [];
    if (options.translatorSampleLimit !== undefined) {
      meta.push(`translator sampleLimit=${options.translatorSampleLimit}`);
    } else {
      meta.push("translator sampleLimit=adaptive");
    }
    if (options.translatorObjectFilter) {
      meta.push("translator objectFilter applied.");
    }
    const holds =
      forward.diagnostics.mismatches === 0 &&
      back.diagnostics.mismatches === 0 &&
      zigZagRunner.mismatches === 0 &&
      zigZagCoalgebra.mismatches === 0;
    return {
      registryPath: path("equivalence.coalgebra"),
      holds,
      details: [
        ...forward.diagnostics.details.slice(0, 4),
        ...back.diagnostics.details.slice(0, 4),
        ...zigZagRunner.details.slice(0, 3),
        ...zigZagCoalgebra.details.slice(0, 3),
        ...meta,
      ],
      diagnostics: { forward, back, zigZagRunner, zigZagCoalgebra },
    };
  },
  equivalenceCostate: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const translatorOpts = translatorOptions(options);
    const forward = runnerToCostateComponents(runner, law, translatorOpts);
    const back = costateComponentsToRunner(forward.components, law, translatorOpts);
    const zigZagRunner = compareRunnerThetas(runner, back.runner, law, options);
    const zigZagCostate = compareCostateComponents(forward.components, back.components, law, options);
    const meta: string[] = [];
    if (options.translatorSampleLimit !== undefined) {
      meta.push(`translator sampleLimit=${options.translatorSampleLimit}`);
    } else {
      meta.push("translator sampleLimit=adaptive");
    }
    if (options.translatorObjectFilter) {
      meta.push("translator objectFilter applied.");
    }
    const holds =
      forward.diagnostics.mismatches === 0 &&
      back.diagnostics.mismatches === 0 &&
      zigZagRunner.mismatches === 0 &&
      zigZagCostate.mismatches === 0;
    return {
      registryPath: path("equivalence.costate"),
      holds,
      details: [
        ...forward.diagnostics.details.slice(0, 4),
        ...back.diagnostics.details.slice(0, 4),
        ...zigZagRunner.details.slice(0, 3),
        ...zigZagCostate.details.slice(0, 3),
        ...meta,
      ],
      diagnostics: { forward, back, zigZagRunner, zigZagCostate },
    };
  },
  equivalenceTriangle: <Obj, Arr, Left, Right, Value>(
    runner: StatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const translatorOpts = translatorOptions(options);
    // Form coalgebra, translate to costate, then back to coalgebra, measuring mismatches.
    const coal = runnerToCoalgebraComponents(runner, law, translatorOpts);
    const cost = coalgebraToCostate(coal.components, law, translatorOpts);
    const coalBack = costateToCoalgebra(cost.components, law, translatorOpts);
    const costBack = coalgebraToCostate(coalBack.components, law, translatorOpts);
    const zigZagCoalgebra = compareCoalgebraComponents(coal.components, coalBack.components, law, options);
    const zigZagCostate = compareCostateComponents(cost.components, costBack.components, law, options);
    const meta: string[] = [];
    if (options.translatorSampleLimit !== undefined) {
      meta.push(`translator sampleLimit=${options.translatorSampleLimit}`);
    } else {
      meta.push("translator sampleLimit=adaptive");
    }
    if (options.translatorObjectFilter) {
      meta.push("translator objectFilter applied.");
    }
    const holds =
      coal.diagnostics.mismatches === 0 &&
      cost.diagnostics.mismatches === 0 &&
      coalBack.diagnostics.mismatches === 0 &&
      costBack.diagnostics.mismatches === 0 &&
      zigZagCoalgebra.mismatches === 0 &&
      zigZagCostate.mismatches === 0;
    return {
      registryPath: path("equivalence.triangle"),
      holds,
      details: [
        ...coal.diagnostics.details.slice(0, 4),
        ...cost.diagnostics.details.slice(0, 4),
        ...coalBack.diagnostics.details.slice(0, 4),
        ...costBack.diagnostics.details.slice(0, 4),
        ...zigZagCoalgebra.details.slice(0, 3),
        ...zigZagCostate.details.slice(0, 3),
        ...meta,
      ],
      diagnostics: { coal, cost, coalBack, costBack, zigZagCoalgebra, zigZagCostate },
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
