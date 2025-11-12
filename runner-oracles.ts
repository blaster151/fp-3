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
  runnerToStateHandlerComponents,
  stateHandlerComponentsToRunner,
  compareStateHandlerComponents,
  runnerToCostTCoalgebraComponents,
  costTCoalgebraComponentsToRunner,
  compareCostTCoalgebraComponents,
  runnerToSweedlerCoalgebraComponents,
  sweedlerCoalgebraComponentsToRunner,
  compareSweedlerCoalgebraComponents,
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
import {
  checkResidualRunnerMorphism,
  getResidualThetaWitness,
  getResidualEtaWitness,
  getResidualMuWitness,
  compareResidualDiagramWitness,
  type ResidualRunnerMorphism,
  type ResidualStatefulRunner,
} from "./residual-stateful-runner";
import type { ResidualInteractionLawSummary } from "./residual-interaction-law";

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
  const result: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {};
  const sampleLimit =
    options.translatorSampleLimit !== undefined ? options.translatorSampleLimit : options.sampleLimit;
  if (sampleLimit !== undefined) {
    result.sampleLimit = sampleLimit;
  }
  const objectFilter =
    options.translatorObjectFilter !== undefined ? options.translatorObjectFilter : options.objectFilter;
  if (objectFilter) {
    result.objectFilter = objectFilter;
  }
  return result;
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
    stateHandlerEquivalence: <Obj, Arr, Left, Right, Value>(
      runner: StatefulRunner<Obj, Left, Right, Value>,
      law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
      options: RunnerOracleOptions<Obj> = {},
    ): RunnerOracleResult => {
      const translatorOpts = translatorOptions(options);
      const forward = runnerToStateHandlerComponents(runner, law, translatorOpts);
      const back = stateHandlerComponentsToRunner(forward.components, law, translatorOpts);
      const reconstructed = runnerToStateHandlerComponents(back.runner, law, translatorOpts);
      const zigZagRunner = compareRunnerThetas(runner, back.runner, law, options);
      const zigZagHandlers = compareStateHandlerComponents(
        forward.components,
        reconstructed.components,
        law,
        options,
      );
      const holds =
        forward.diagnostics.mismatches === 0 &&
        back.diagnostics.mismatches === 0 &&
        zigZagRunner.mismatches === 0 &&
        zigZagHandlers.mismatches === 0;
      return {
        registryPath: path("equivalence.stateHandler"),
        holds,
        details: [
          ...forward.diagnostics.details.slice(0, 4),
          ...back.diagnostics.details.slice(0, 4),
          ...zigZagRunner.details.slice(0, 3),
          ...zigZagHandlers.details.slice(0, 3),
        ],
        diagnostics: { forward, back, zigZagRunner, zigZagHandlers },
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
  residualMorphism: <Obj, Arr, Left, Right, Value>(
    morphism: ResidualRunnerMorphism<Obj, Left, Right, Value, unknown, unknown>,
    runner: ResidualStatefulRunner<Obj, Left, Right, Value>,
    law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const checkOptions: { sampleLimit?: number; objectFilter?: (object: Obj) => boolean } = {};
    if (options.sampleLimit !== undefined) checkOptions.sampleLimit = options.sampleLimit;
    if (options.objectFilter) checkOptions.objectFilter = options.objectFilter;
    const report = checkResidualRunnerMorphism(runner, morphism, law, checkOptions);
    return {
      registryPath: path("residual.morphism"),
      holds: report.holds,
      details: [
        `residualSquare checked=${report.residualSquare.checked} mismatches=${report.residualSquare.mismatches}`,
        ...report.diagnostics.slice(0, 8),
      ],
      diagnostics: report,
    };
  },
  residualInteraction: <Obj, Arr, Left, Right, Value>(
    runner: ResidualStatefulRunner<Obj, Left, Right, Value>,
    interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
    residualLaw: ResidualInteractionLawSummary<Obj, Arr, Left, Right, Value>,
    options: RunnerOracleOptions<Obj> = {},
  ): RunnerOracleResult => {
    const sampleLimit = Math.max(1, options.sampleLimit ?? 12);
    const theta = getResidualThetaWitness(runner, sampleLimit);
    const eta = getResidualEtaWitness(runner, interaction, sampleLimit);
    const mu = getResidualMuWitness(runner, interaction, sampleLimit);
    const thetaComparison = compareResidualDiagramWitness("theta", theta, residualLaw.thetaWitness);
    const etaComparison = compareResidualDiagramWitness("eta", eta, residualLaw.etaWitness);
    const muComparison = compareResidualDiagramWitness("mu", mu, residualLaw.muWitness);
    const holds =
      thetaComparison.mismatches === 0 &&
      etaComparison.mismatches === 0 &&
      muComparison.mismatches === 0;
    const details: string[] = [
      `${thetaComparison.label}: mismatches=${thetaComparison.mismatches}`,
      `${etaComparison.label}: mismatches=${etaComparison.mismatches}`,
      `${muComparison.label}: mismatches=${muComparison.mismatches}`,
      ...thetaComparison.details.slice(0, 3),
      ...etaComparison.details.slice(0, 3),
      ...muComparison.details.slice(0, 3),
    ];
    return {
      registryPath: path("residual.interaction"),
      holds,
      details,
      diagnostics: {
        theta: thetaComparison,
        eta: etaComparison,
        mu: muComparison,
        law: residualLaw,
      },
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
    const backComponents = runnerToCoalgebraComponents(back.runner, law, translatorOpts);
    const zigZagRunner = compareRunnerThetas(runner, back.runner, law, options);
    const zigZagCoalgebra = compareCoalgebraComponents(forward.components, backComponents.components, law, options);
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
      backComponents.diagnostics.mismatches === 0 &&
      zigZagRunner.mismatches === 0 &&
      zigZagCoalgebra.mismatches === 0;
    return {
      registryPath: path("equivalence.coalgebra"),
      holds,
      details: [
        ...forward.diagnostics.details.slice(0, 4),
        ...back.diagnostics.details.slice(0, 4),
        ...backComponents.diagnostics.details.slice(0, 4),
        ...zigZagRunner.details.slice(0, 3),
        ...zigZagCoalgebra.details.slice(0, 3),
        ...meta,
      ],
      diagnostics: { forward, back, backComponents, zigZagRunner, zigZagCoalgebra },
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
    const backComponents = runnerToCostateComponents(back.runner, law, translatorOpts);
    const zigZagRunner = compareRunnerThetas(runner, back.runner, law, options);
    const zigZagCostate = compareCostateComponents(forward.components, backComponents.components, law, options);
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
      backComponents.diagnostics.mismatches === 0 &&
      zigZagRunner.mismatches === 0 &&
      zigZagCostate.mismatches === 0;
    return {
      registryPath: path("equivalence.costate"),
      holds,
      details: [
        ...forward.diagnostics.details.slice(0, 4),
        ...back.diagnostics.details.slice(0, 4),
        ...backComponents.diagnostics.details.slice(0, 4),
        ...zigZagRunner.details.slice(0, 3),
        ...zigZagCostate.details.slice(0, 3),
        ...meta,
      ],
      diagnostics: { forward, back, backComponents, zigZagRunner, zigZagCostate },
    };
  },
    equivalenceCostT: <Obj, Arr, Left, Right, Value>(
      runner: StatefulRunner<Obj, Left, Right, Value>,
      law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
      options: RunnerOracleOptions<Obj> = {},
    ): RunnerOracleResult => {
      const translatorOpts = translatorOptions(options);
      const forward = runnerToCostTCoalgebraComponents(runner, law, translatorOpts);
      const back = costTCoalgebraComponentsToRunner(forward.components, law, translatorOpts);
      const backComponents = runnerToCostTCoalgebraComponents(back.runner, law, translatorOpts);
      const zigZagRunner = compareRunnerThetas(runner, back.runner, law, options);
      const zigZagCoalgebra = compareCostTCoalgebraComponents(forward.components, backComponents.components, law, options);
      const holds =
        forward.diagnostics.mismatches === 0 &&
        back.diagnostics.mismatches === 0 &&
        zigZagRunner.mismatches === 0 &&
        zigZagCoalgebra.mismatches === 0;
      return {
        registryPath: path("equivalence.costT"),
        holds,
        details: [
          ...forward.diagnostics.details.slice(0, 4),
          ...back.diagnostics.details.slice(0, 4),
          ...backComponents.diagnostics.details.slice(0, 4),
          ...zigZagRunner.details.slice(0, 3),
          ...zigZagCoalgebra.details.slice(0, 3),
        ],
        diagnostics: { forward, back, backComponents, zigZagRunner, zigZagCoalgebra },
      };
    },
    equivalenceSweedler: <Obj, Arr, Left, Right, Value>(
      runner: StatefulRunner<Obj, Left, Right, Value>,
      law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
      options: RunnerOracleOptions<Obj> = {},
    ): RunnerOracleResult => {
      const translatorOpts = translatorOptions(options);
      const forward = runnerToSweedlerCoalgebraComponents(runner, law, translatorOpts);
      const back = sweedlerCoalgebraComponentsToRunner(forward.components, law, translatorOpts);
      const backComponents = runnerToSweedlerCoalgebraComponents(back.runner, law, translatorOpts);
      const zigZagRunner = compareRunnerThetas(runner, back.runner, law, options);
      const zigZagCoalgebra = compareSweedlerCoalgebraComponents(forward.components, backComponents.components, law, options);
      const holds =
        forward.diagnostics.mismatches === 0 &&
        back.diagnostics.mismatches === 0 &&
        zigZagRunner.mismatches === 0 &&
        zigZagCoalgebra.mismatches === 0;
      return {
        registryPath: path("equivalence.sweedler"),
        holds,
        details: [
          ...forward.diagnostics.details.slice(0, 4),
          ...back.diagnostics.details.slice(0, 4),
          ...backComponents.diagnostics.details.slice(0, 4),
          ...zigZagRunner.details.slice(0, 3),
          ...zigZagCoalgebra.details.slice(0, 3),
        ],
        diagnostics: { forward, back, backComponents, zigZagRunner, zigZagCoalgebra },
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
  RunnerOracles.stateHandlerEquivalence(runner, law, options),
  RunnerOracles.handlers(runner, law, options),
  RunnerOracles.psiTheta(runner, law, options),
  RunnerOracles.unified(runner, law, options),
  RunnerOracles.equivalenceCoalgebra(runner, law, options),
  RunnerOracles.equivalenceCostate(runner, law, options),
  RunnerOracles.equivalenceCostT(runner, law, options),
  RunnerOracles.equivalenceSweedler(runner, law, options),
  RunnerOracles.equivalenceTriangle(runner, law, options),
];

export const evaluateRunnerEquivalences = <Obj, Arr, Left, Right, Value>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  options: RunnerOracleOptions<Obj> = {},
): {
  readonly stateHandler: RunnerOracleResult;
  readonly coalgebra: RunnerOracleResult;
  readonly costate: RunnerOracleResult;
  readonly costT: RunnerOracleResult;
  readonly sweedler: RunnerOracleResult;
  readonly triangle: RunnerOracleResult;
} => ({
  stateHandler: RunnerOracles.stateHandlerEquivalence(runner, law, options),
  coalgebra: RunnerOracles.equivalenceCoalgebra(runner, law, options),
  costate: RunnerOracles.equivalenceCostate(runner, law, options),
  costT: RunnerOracles.equivalenceCostT(runner, law, options),
  sweedler: RunnerOracles.equivalenceSweedler(runner, law, options),
  triangle: RunnerOracles.equivalenceTriangle(runner, law, options),
});
