// Phase IV integration: λ_{coop} × runner API adapters
// Isolated to avoid pulling heavy CategoryLimits dependencies when only evaluator is used.

import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import {
  buildRunnerFromInteraction,
  summarizeResidualHandlers,
  type ResidualHandlerAggregateSummary,
  type StatefulRunner,
} from "./stateful-runner";
import type { GlueingRunnerBridgeResult } from "./glueing-runner-bridge";
import {
  RunnerOracles,
  enumerateRunnerOracles,
  type RunnerOracleOptions,
  type RunnerOracleResult,
  evaluateRunnerEquivalences,
  summarizeRunnerOracles,
  summarizeResidualRunnerOracles,
  type RunnerOracleSummary,
  type ResidualRunnerOracleSummary,
} from "./runner-oracles";
import {
  makeResidualRunnerFromInteractionLaw,
  identityResidualRunnerMorphism,
} from "./residual-stateful-runner";
import {
  makeResidualInteractionLaw,
  makeResidualInteractionLawFromRunner,
  checkResidualInteractionLaw,
  type ResidualInteractionLawAggregate,
  type ResidualInteractionLawCheckResult,
} from "./residual-interaction-law";
import { makeExample6MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import type {
  LambdaCoopKernelEvalCollectionSummary,
  LambdaCoopResourceSummary,
  LambdaCoopUserComputation,
  LambdaCoopUserEvalCollectionSummary,
  LambdaCoopValue,
} from "./lambda-coop";
import {
  summarizeUserComputationResources,
  summarizeValueResources,
  evaluateUser,
  summarizeUserEvaluation,
  summarizeUserEvaluations,
  evaluateKernel,
  instantiateKernelClause,
  summarizeKernelEvaluation,
  summarizeKernelEvaluations,
} from "./lambda-coop";
import type { SupervisedStack } from "./supervised-stack";
import {
  buildLambdaCoopComparisonArtifacts,
  type LambdaCoopBoundaryWitnesses,
  type LambdaCoopComparisonArtifacts,
  type LambdaCoopKernelOperationDescriptor,
  type LambdaCoopResidualCoverageDigest,
  canonicalValueForType,
} from "./supervised-stack-lambda-coop";

const UNIT_VALUE: LambdaCoopValue = { kind: "unitValue" };

const buildUserOperationChain = (
  operations: ReadonlyArray<string>,
  index = 0,
): LambdaCoopUserComputation => {
  if (operations.length === 0) {
    return { kind: "userReturn", value: UNIT_VALUE };
  }
  const [head, ...rest] = operations;
  if (head === undefined) {
    return { kind: "userReturn", value: UNIT_VALUE };
  }
  return {
    kind: "userOperation",
    operation: head,
    argument: UNIT_VALUE,
    continuation: {
      parameter: `u${index}`,
      body: buildUserOperationChain(rest, index + 1),
    },
  };
};

export interface LambdaCoopAlignmentSummary {
  readonly aligned: boolean;
  readonly oracle: RunnerOracleSummary;
  readonly residualOracles: ResidualRunnerOracleSummary;
  readonly interpreter: LambdaCoopUserEvalCollectionSummary;
  readonly kernel: LambdaCoopKernelEvalCollectionSummary;
  readonly residualHandlers?: ResidualHandlerAggregateSummary;
  readonly residualLaw?: ResidualInteractionLawAggregate;
  readonly residualLawCheck?: ResidualInteractionLawCheckResult<
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >;
  readonly boundary: LambdaCoopBoundaryWitnesses;
  readonly residual?: LambdaCoopResidualCoverageDigest;
  readonly unsupportedByKernel: ReadonlyArray<string>;
  readonly unacknowledgedByUser: ReadonlyArray<string>;
  readonly metadata: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

interface LambdaCoopAlignmentSummaryExtras {
  readonly residualHandlerSummary?: ResidualHandlerAggregateSummary;
  readonly residualLawAggregate?: ResidualInteractionLawAggregate;
  readonly residualLawCheck?: ResidualInteractionLawCheckResult<
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >;
  readonly additionalMetadata?: ReadonlyArray<string>;
  readonly additionalNotes?: ReadonlyArray<string>;
}

const buildLambdaCoopAlignmentSummary = (
  artifacts: {
    readonly aligned: boolean;
    readonly boundaryWitnesses: LambdaCoopBoundaryWitnesses;
    readonly residualCoverage?: LambdaCoopResidualCoverageDigest;
    readonly unsupportedByKernel: ReadonlyArray<string>;
    readonly unacknowledgedByUser: ReadonlyArray<string>;
  },
  oracleSummary: RunnerOracleSummary,
  residualOracleSummary: ResidualRunnerOracleSummary,
  interpreterCollectionSummary: LambdaCoopUserEvalCollectionSummary,
  kernelCollectionSummary: LambdaCoopKernelEvalCollectionSummary,
  extras: LambdaCoopAlignmentSummaryExtras = {},
): LambdaCoopAlignmentSummary => {
  const {
    residualHandlerSummary,
    residualLawAggregate,
    residualLawCheck,
    additionalMetadata,
    additionalNotes,
  } = extras;
  const boundary = artifacts.boundaryWitnesses;
  const metadata: string[] = [
    `λ₍coop₎.alignment.status=${artifacts.aligned ? "aligned" : "issues"}`,
    `λ₍coop₎.alignment.oracle=${JSON.stringify({
      total: oracleSummary.total,
      passed: oracleSummary.passed,
      failed: oracleSummary.failed,
    })}`,
    `λ₍coop₎.alignment.residualOracles=${JSON.stringify({
      total: residualOracleSummary.total,
      passed: residualOracleSummary.passed,
      failed: residualOracleSummary.failed,
      residualSquareTotals: residualOracleSummary.residualSquareTotals ?? null,
      diagramTotals: residualOracleSummary.diagramTotals ?? null,
    })}`,
    `λ₍coop₎.alignment.interpreter.status=${JSON.stringify(
      interpreterCollectionSummary.statusCounts,
    )}`,
    `λ₍coop₎.alignment.interpreter.total=${interpreterCollectionSummary.totalEvaluations}`,
    `λ₍coop₎.alignment.kernel.status=${JSON.stringify(kernelCollectionSummary.statusCounts)}`,
    `λ₍coop₎.alignment.kernel.total=${kernelCollectionSummary.totalEvaluations}`,
    `λ₍coop₎.alignment.boundary=${JSON.stringify(boundary)}`,
    `λ₍coop₎.alignment.unsupportedByKernel=${JSON.stringify(
      artifacts.unsupportedByKernel,
    )}`,
    `λ₍coop₎.alignment.unacknowledgedByUser=${JSON.stringify(
      artifacts.unacknowledgedByUser,
    )}`,
  ];
  if (artifacts.residualCoverage) {
    metadata.push(
      `λ₍coop₎.alignment.residual=${JSON.stringify(artifacts.residualCoverage)}`,
    );
  }
  if (residualHandlerSummary) {
    metadata.push(
      `λ₍coop₎.alignment.residualHandlers=${JSON.stringify({
        reports: residualHandlerSummary.reports,
        handled: residualHandlerSummary.handledSamples,
        unhandled: residualHandlerSummary.unhandledSamples,
        fullyHandled: residualHandlerSummary.fullyHandledObjects,
        withUnhandled: residualHandlerSummary.objectsWithUnhandled,
        sampleLimit: residualHandlerSummary.configuredSampleLimit,
        sampleRange: residualHandlerSummary.sampleLimitRange ?? null,
      })}`,
    );
  }
  if (residualLawAggregate) {
    metadata.push(
      `λ₍coop₎.alignment.residualLaw=${JSON.stringify({
        monad: residualLawAggregate.residualMonadName,
        functor: residualLawAggregate.residualFunctorName,
      })}`,
    );
    metadata.push(
      `λ₍coop₎.alignment.residualLaw.hasRho=${residualLawAggregate.hasRho}`,
    );
    if (residualLawAggregate.pureMapRelaxation) {
      metadata.push(
        "λ₍coop₎.alignment.residualLaw.pureMapRelaxation=true",
      );
    }
    if (residualLawCheck) {
      metadata.push(
        `λ₍coop₎.alignment.residualLaw.holds=${residualLawCheck.holds}`,
      );
      if (residualLawCheck.zeroResidual !== undefined) {
        metadata.push(
          `λ₍coop₎.alignment.residualLaw.zeroResidual=${residualLawCheck.zeroResidual}`,
        );
      }
    }
    if (residualLawAggregate.functorMetadata.length > 0) {
      metadata.push(
        `λ₍coop₎.alignment.residualLaw.functorMetadata=${JSON.stringify(
          residualLawAggregate.functorMetadata,
        )}`,
      );
    }
    if (residualLawAggregate.rhoDescription) {
      metadata.push(
        `λ₍coop₎.alignment.residualLaw.rho.description=${residualLawAggregate.rhoDescription}`,
      );
    }
    if (residualLawAggregate.rhoDiagnostics) {
      residualLawAggregate.rhoDiagnostics.forEach((diagnostic, index) =>
        metadata.push(
          `λ₍coop₎.alignment.residualLaw.rho.diagnostic[${index}]=${diagnostic}`,
        ),
      );
    }
    metadata.push(
      `λ₍coop₎.alignment.residualLaw.mismatches=${JSON.stringify(
        residualLawAggregate.mismatches,
      )}`,
    );
    metadata.push(
      `λ₍coop₎.alignment.residualLaw.counterexamples=${JSON.stringify(
        residualLawAggregate.counterexamples,
      )}`,
    );
    metadata.push(
      `λ₍coop₎.alignment.residualLaw.counterexampleSummary=${JSON.stringify(
        residualLawAggregate.counterexampleSummary,
      )}`,
    );
    if (residualLawAggregate.compatibilitySummary) {
      metadata.push(
        `λ₍coop₎.alignment.residualLaw.compatibilitySummary=${JSON.stringify({
          total: residualLawAggregate.compatibilitySummary.total,
          mismatched: residualLawAggregate.compatibilitySummary.mismatched,
          matching: residualLawAggregate.compatibilitySummary.matching,
          byLabel: residualLawAggregate.compatibilitySummary.byLabel,
        })}`,
      );
    }
    for (const total of residualLawAggregate.witnessTotals) {
      metadata.push(
        `λ₍coop₎.alignment.residualLaw.${total.diagram}=${JSON.stringify({
          objects: total.objects,
          checked: total.checked,
          mismatches: total.mismatches,
        })}`,
      );
    }
    if (residualLawAggregate.compatibility) {
      for (const comparison of residualLawAggregate.compatibility) {
        metadata.push(
          `λ₍coop₎.alignment.residualLaw.compatibility.${comparison.label}=${JSON.stringify({
            checked: comparison.checked,
            mismatches: comparison.mismatches,
          })}`,
        );
      }
    }
  }
  if (additionalMetadata && additionalMetadata.length > 0) {
    metadata.push(...additionalMetadata);
  }

  const formatList = (values: ReadonlyArray<string>): string =>
    values.length > 0 ? values.join(",") : "∅";

  const notes: string[] = [
    `λ₍coop₎ alignment summary: runner oracles ${oracleSummary.passed}/${oracleSummary.total} passed`,
    `λ₍coop₎ alignment interpreter evaluations=${interpreterCollectionSummary.totalEvaluations} statuses=${JSON.stringify(
      interpreterCollectionSummary.statusCounts,
    )}`,
    `λ₍coop₎ alignment kernel evaluations=${kernelCollectionSummary.totalEvaluations} statuses=${JSON.stringify(
      kernelCollectionSummary.statusCounts,
    )}`,
    `λ₍coop₎ alignment boundary supported=${formatList(boundary.supported)} unsupported=${formatList(
      boundary.unsupported,
    )} unacknowledged=${formatList(boundary.unacknowledged)}`,
  ];
  if (artifacts.residualCoverage) {
    notes.push(
      `λ₍coop₎ alignment residual handled=${artifacts.residualCoverage.handled} unhandled=${artifacts.residualCoverage.unhandled} sampleLimit=${artifacts.residualCoverage.sampleLimit}`,
    );
  }
  if (residualHandlerSummary) {
    notes.push(
      `λ₍coop₎ alignment residual handlers reports=${residualHandlerSummary.reports} handled=${residualHandlerSummary.handledSamples} unhandled=${residualHandlerSummary.unhandledSamples}`,
    );
    notes.push(
      ...residualHandlerSummary.notes.map(
        (note) => `λ₍coop₎ alignment residual handler note=${note}`,
      ),
    );
  }
  if (residualOracleSummary.total > 0 || residualOracleSummary.notes.length > 0) {
    notes.push(
      `λ₍coop₎ alignment residual oracles=${residualOracleSummary.passed}/${residualOracleSummary.total}` +
        ` failing=${residualOracleSummary.failed}`,
    );
  }
  if (residualLawAggregate) {
    notes.push(
      `λ₍coop₎ alignment residual law counterexample summary total=${residualLawAggregate.counterexampleSummary.total}` +
        ` law=${residualLawAggregate.counterexampleSummary.byOrigin.law}` +
        ` runner=${residualLawAggregate.counterexampleSummary.byOrigin.runner}`,
    );
    if (residualLawAggregate.pureMapRelaxation) {
      notes.push(
        "λ₍coop₎ alignment residual law Kleisli-pure relaxation enabled for RX × GY diagram",
      );
    }
    if (residualLawCheck) {
      notes.push(
        `λ₍coop₎ alignment residual law holds=${residualLawCheck.holds}`,
      );
      if (residualLawCheck.zeroResidual !== undefined) {
        notes.push(
          `λ₍coop₎ alignment residual law zeroResidual=${residualLawCheck.zeroResidual}`,
        );
      }
      notes.push(
        ...residualLawCheck.notes.map(
          (note) => `λ₍coop₎ alignment residual law check note=${note}`,
        ),
      );
      if (residualLawCheck.diagnostics.length > 0) {
        notes.push(
          ...residualLawCheck.diagnostics.map(
            (diagnostic) =>
              `λ₍coop₎ alignment residual law check diagnostic=${diagnostic}`,
          ),
        );
      }
    }
    if (residualLawAggregate.compatibilitySummary) {
      notes.push(
        `λ₍coop₎ alignment residual law compatibility summary total=${residualLawAggregate.compatibilitySummary.total}` +
          ` mismatched=${residualLawAggregate.compatibilitySummary.mismatched}` +
          ` matching=${residualLawAggregate.compatibilitySummary.matching}`,
      );
      for (const [label, entry] of Object.entries(
        residualLawAggregate.compatibilitySummary.byLabel,
      )) {
        notes.push(
          `λ₍coop₎ alignment residual law compatibility summary label=${label} mismatches=${entry.mismatches} checked=${entry.checked}`,
        );
      }
    }
    for (const [diagram, count] of Object.entries(
      residualLawAggregate.counterexampleSummary.byDiagram,
    )) {
      notes.push(
        `λ₍coop₎ alignment residual law counterexample summary diagram=${diagram} count=${count}`,
      );
    }
    for (const counterexample of residualLawAggregate.counterexamples) {
      notes.push(
        `λ₍coop₎ alignment residual law counterexample origin=${counterexample.origin} diagram=${counterexample.diagram} object=${counterexample.object}${counterexample.sample ? ` sample=${counterexample.sample}` : ""}${counterexample.error ? ` error=${counterexample.error}` : ""}`,
      );
      notes.push(`λ₍coop₎ alignment residual law counterexample description=${counterexample.description}`);
      for (const detail of counterexample.diagnostics) {
        notes.push(`λ₍coop₎ alignment residual law counterexample note=${detail}`);
      }
    }
  }
  if (residualLawAggregate) {
    notes.push(
      `λ₍coop₎ alignment residual law ${residualLawAggregate.residualMonadName} functor=${residualLawAggregate.residualFunctorName}`,
    );
    notes.push(
      `λ₍coop₎ alignment residual law ρ provided=${residualLawAggregate.hasRho}`,
    );
    if (residualLawAggregate.pureMapRelaxation) {
      notes.push(
        "λ₍coop₎ alignment residual law pureMapRelaxation=Kleisli-pure",
      );
    }
    if (residualLawAggregate.rhoDescription) {
      notes.push(
        `λ₍coop₎ alignment residual law ρ description=${residualLawAggregate.rhoDescription}`,
      );
    }
    if (residualLawAggregate.rhoDiagnostics) {
      for (const diagnostic of residualLawAggregate.rhoDiagnostics) {
        notes.push(`λ₍coop₎ alignment residual law ρ note=${diagnostic}`);
      }
    }
    for (const total of residualLawAggregate.witnessTotals) {
      notes.push(
        `λ₍coop₎ alignment residual law witness ${total.diagram}: objects=${total.objects} checked=${total.checked} mismatches=${total.mismatches}`,
      );
    }
    if (residualLawAggregate.compatibility) {
      for (const comparison of residualLawAggregate.compatibility) {
        notes.push(
          `λ₍coop₎ alignment residual law compatibility ${comparison.label}: checked=${comparison.checked} mismatches=${comparison.mismatches}`,
        );
      }
    }
    if (residualLawAggregate.mismatches.length > 0) {
      for (const mismatch of residualLawAggregate.mismatches) {
        notes.push(
          `λ₍coop₎ alignment residual law mismatch diagram=${mismatch.diagram} object=${mismatch.object} mismatches=${mismatch.mismatches} checked=${mismatch.checked}`,
        );
      }
    }
    if (residualLawAggregate.functorMetadata.length > 0) {
      notes.push(
        `λ₍coop₎ alignment residual law metadata=${residualLawAggregate.functorMetadata.join("; ")}`,
      );
    }
    notes.push(
      ...residualLawAggregate.diagnostics.map(
        (note) => `λ₍coop₎ alignment residual law note=${note}`,
      ),
    );
  }
  if (artifacts.unsupportedByKernel.length > 0 || artifacts.unacknowledgedByUser.length > 0) {
    notes.push(
      `λ₍coop₎ alignment outstanding operations unsupported=${formatList(
        artifacts.unsupportedByKernel,
      )} unacknowledged=${formatList(artifacts.unacknowledgedByUser)}`,
    );
  }
  notes.push(...oracleSummary.notes.map((note) => `λ₍coop₎ alignment oracle note=${note}`));
  notes.push(
    ...residualOracleSummary.notes.map(
      (note) => `λ₍coop₎ alignment residual oracle note=${note}`,
    ),
  );
  if (additionalNotes && additionalNotes.length > 0) {
    notes.push(...additionalNotes);
  }

  return {
    aligned: artifacts.aligned,
    oracle: oracleSummary,
    residualOracles: residualOracleSummary,
    interpreter: interpreterCollectionSummary,
    kernel: kernelCollectionSummary,
    ...(residualHandlerSummary ? { residualHandlers: residualHandlerSummary } : {}),
    ...(residualLawAggregate ? { residualLaw: residualLawAggregate } : {}),
    ...(residualLawCheck ? { residualLawCheck } : {}),
    boundary,
    ...(artifacts.residualCoverage ? { residual: artifacts.residualCoverage } : {}),
    unsupportedByKernel: artifacts.unsupportedByKernel,
    unacknowledgedByUser: artifacts.unacknowledgedByUser,
    metadata,
    notes,
  };
};

export interface LambdaCoopRunnerAlignmentOptions<Obj> extends RunnerOracleOptions<Obj> {
  readonly includeTriangleEquivalence?: boolean;
  readonly traceLimit?: number;
  readonly alignmentMetadata?: ReadonlyArray<string>;
  readonly alignmentNotes?: ReadonlyArray<string>;
}

export interface LambdaCoopRunnerAlignmentReport<Obj, Arr, Left, Right, Value> {
  readonly law: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>;
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly oracles: ReadonlyArray<RunnerOracleResult>;
  readonly oracleSummary: RunnerOracleSummary;
  readonly residualOracleSummary: ResidualRunnerOracleSummary;
  readonly residualLaw?: ResidualInteractionLawAggregate;
  readonly residualLawCheck?: ResidualInteractionLawCheckResult<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
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
  readonly equivalences: ReturnType<typeof evaluateRunnerEquivalences<Obj, Arr, Left, Right, Value>>;
  readonly oracleSummary: RunnerOracleSummary;
  readonly residualOracleSummary: ResidualRunnerOracleSummary;
  readonly residualHandlers?: ResidualHandlerAggregateSummary;
  readonly residualLaw?: ResidualInteractionLawAggregate;
  readonly residualLawCheck?: ResidualInteractionLawCheckResult<
    Obj,
    Arr,
    Left,
    Right,
    Value
  >;
  readonly lambdaCoop: LambdaCoopComparisonArtifacts & { readonly metadata: ReadonlyArray<string> };
  readonly runnerSummary: ReturnType<typeof summarizeValueResources>;
  readonly interpreterResult: ReturnType<typeof evaluateUser>;
  readonly alignmentSummary: LambdaCoopAlignmentSummary;
  readonly comparison: {
    readonly unsupportedByKernel: ReadonlyArray<string>;
    readonly unacknowledgedByUser: ReadonlyArray<string>;
    readonly boundaryWitnesses: LambdaCoopComparisonArtifacts["boundaryWitnesses"];
  };
  readonly notes: ReadonlyArray<string>;
}

export type SupervisedStackLambdaCoopGlueingAlignmentReport<
  Obj,
  Arr,
  Left,
  Right,
  Value,
  GlueObj = unknown,
  GlueArr = unknown,
  GlueLeft = unknown,
  GlueRight = unknown,
  GlueValue = unknown,
> = SupervisedStackLambdaCoopAlignmentReport<Obj, Arr, Left, Right, Value> & {
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
};

export function analyzeSupervisedStackLambdaCoopAlignmentWithGlueingBridge<
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
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  stack: SupervisedStack<Obj, Arr, Left, Right, Value>,
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
  options: LambdaCoopRunnerAlignmentOptions<Obj> = {},
): SupervisedStackLambdaCoopGlueingAlignmentReport<
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
> {
  const mergedMetadata = [
    ...(options.alignmentMetadata ?? []),
    ...glueingBridge.metadata,
  ];
  const mergedNotes = [
    ...(options.alignmentNotes ?? []),
    ...glueingBridge.notes,
  ];
  const mergedOptions: LambdaCoopRunnerAlignmentOptions<Obj> = {
    ...options,
    ...(mergedMetadata.length > 0 ? { alignmentMetadata: mergedMetadata } : {}),
    ...(mergedNotes.length > 0 ? { alignmentNotes: mergedNotes } : {}),
  };
  const alignment = analyzeSupervisedStackLambdaCoopAlignment(
    interaction,
    stack,
    mergedOptions,
  );
  return {
    ...alignment,
    glueingBridge,
  };
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
  const residualLawBase = makeResidualInteractionLaw(law.law);
  const residualRunner = makeResidualRunnerFromInteractionLaw(
    runner,
    law,
    residualLawBase,
    {
    diagnostics: ["λ₍coop₎ alignment: residual runner derived for standalone analysis"],
  });
  const residualLaw = makeResidualInteractionLawFromRunner(
    law.law,
    residualRunner,
    {
      residualMonadName: residualLawBase.residualMonadName,
      notes: [
        ...(residualLawBase.residualNotes ?? []),
        "λ₍coop₎ alignment: ρ synthesised from residual runner samples.",
      ],
      includeRunnerDiagnostics: true,
    },
  );
  const residualIdentity = identityResidualRunnerMorphism(residualRunner, law);
  const residualOracles: RunnerOracleResult[] = [
    RunnerOracles.residualMorphism(residualIdentity, residualRunner, law, oracleOptions),
    RunnerOracles.residualInteraction(residualRunner, law, residualLaw, oracleOptions),
  ];
  const oracles = [...base, ...extras, ...residualOracles];
  const oracleSummary = summarizeRunnerOracles(oracles);
  const residualOracleSummary = summarizeResidualRunnerOracles(oracles);
  const residualLawCheck = checkResidualInteractionLaw(residualLaw, {
    runner: residualRunner,
    interaction: law,
    ...(options.sampleLimit !== undefined
      ? { sampleLimit: options.sampleLimit }
      : {}),
  });
  const residualLawAggregate = residualLawCheck.aggregate;
  return {
    law,
    runner,
    oracles,
    oracleSummary,
    residualOracleSummary,
    residualLaw: residualLawAggregate,
    residualLawCheck,
    notes: [
      "λ_{coop}: aligned runner diagnostics with coalgebra/costate equivalences",
      `λ₍coop₎ residual oracle summary: ${residualOracleSummary.passed}/${residualOracleSummary.total} passed`,
      `λ₍coop₎ residual law ${residualLawAggregate.residualMonadName} functor=${residualLawAggregate.residualFunctorName}`,
      `λ₍coop₎ residual law ρ provided=${residualLawAggregate.hasRho}`,
      ...(residualLawAggregate.pureMapRelaxation
        ? ["λ₍coop₎ residual law pureMapRelaxation=Kleisli-pure"]
        : []),
      ...(residualLawAggregate.rhoDescription
        ? [`λ₍coop₎ residual law ρ description=${residualLawAggregate.rhoDescription}`]
        : []),
      ...(residualLawAggregate.rhoDiagnostics
        ? residualLawAggregate.rhoDiagnostics.map(
            (diagnostic) => `λ₍coop₎ residual law ρ note=${diagnostic}`,
          )
        : []),
      `λ₍coop₎ residual law mismatches=${JSON.stringify(residualLawAggregate.mismatches)}`,
      `λ₍coop₎ residual law counterexamples=${JSON.stringify(residualLawAggregate.counterexamples)}`,
      `λ₍coop₎ residual law counterexample summary=${JSON.stringify(residualLawAggregate.counterexampleSummary)}`,
      ...residualLawAggregate.mismatches.map(
        (mismatch) =>
          `λ₍coop₎ residual law mismatch diagram=${mismatch.diagram} object=${mismatch.object} mismatches=${mismatch.mismatches} checked=${mismatch.checked}`,
      ),
      ...residualLawAggregate.counterexamples.map(
        (counterexample) =>
          `λ₍coop₎ residual law counterexample origin=${counterexample.origin} diagram=${counterexample.diagram} object=${counterexample.object}${counterexample.sample ? ` sample=${counterexample.sample}` : ""}${counterexample.error ? ` error=${counterexample.error}` : ""}`,
      ),
      ...residualLawAggregate.diagnostics.map(
        (note) => `λ₍coop₎ residual law note=${note}`,
      ),
      ...residualLawCheck.notes.map(
        (note) => `λ₍coop₎ residual law check note=${note}`,
      ),
      ...residualLawCheck.diagnostics.map(
        (diagnostic) => `λ₍coop₎ residual law check diagnostic=${diagnostic}`,
      ),
    ],
  };
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
  const baseOracles = enumerateRunnerOracles(runner, interaction, oracleOptions);
  const residualLawBase = makeResidualInteractionLaw(interaction.law);
  const residualRunner = makeResidualRunnerFromInteractionLaw(
    runner,
    interaction,
    residualLawBase,
    {
    diagnostics: ["λ₍coop₎ alignment: residual runner derived from supervised stack"],
  });
  const residualLaw = makeResidualInteractionLawFromRunner(
    interaction.law,
    residualRunner,
    {
      residualMonadName: residualLawBase.residualMonadName,
      notes: [
        ...(residualLawBase.residualNotes ?? []),
        "λ₍coop₎ alignment: supervised stack ρ derived from residual runner.",
      ],
      includeRunnerDiagnostics: true,
    },
  );
  const residualIdentity = identityResidualRunnerMorphism(residualRunner, interaction);
  const residualOracles: RunnerOracleResult[] = [
    RunnerOracles.residualMorphism(residualIdentity, residualRunner, interaction, oracleOptions),
    RunnerOracles.residualInteraction(residualRunner, interaction, residualLaw, oracleOptions),
  ];
  const oracles = [...baseOracles, ...residualOracles];
  const equivalences = evaluateRunnerEquivalences(runner, interaction, oracleOptions);
  const oracleSummary = summarizeRunnerOracles(oracles);
  const residualOracleSummary = summarizeResidualRunnerOracles(oracles);
  const residualLawCheck = checkResidualInteractionLaw(residualLaw, {
    runner: residualRunner,
    interaction,
    ...(options.sampleLimit !== undefined
      ? { sampleLimit: options.sampleLimit }
      : {}),
  });
  const residualLawAggregate = residualLawCheck.aggregate;
  const residualHandlerSource = stack.residualSummary ?? stack.runner.residualHandlers;
  const residualHandlerSummary = residualHandlerSource
    ? summarizeResidualHandlers(residualHandlerSource)
    : undefined;

  const fallbackKernelDescriptors = (stack.kernel.monad?.operations ?? []).map(
    (op): LambdaCoopKernelOperationDescriptor => ({
      name: op.name,
      kind: op.kind,
      ...(op.description ? { description: op.description } : {}),
      ...(op.diagnostics.length > 0 ? { diagnostics: op.diagnostics } : {}),
      ...(op.parameterName ? { parameterName: op.parameterName } : {}),
      ...(op.parameterType ? { parameterType: op.parameterType } : {}),
      ...(op.resultValueType ? { resultValueType: op.resultValueType } : {}),
      ...(op.defaultResidual ? { defaultResidual: op.defaultResidual } : {}),
      ...(op.residualHandler?.description
        ? { handlerDescription: op.residualHandler.description }
        : {}),
      ...(op.residualHandler ? { hasHandler: true } : {}),
    }),
  );
  const fallbackAllowed = stack.user.monad?.allowedKernelOperations ?? new Set<string>();
  const fallbackExpectedOperations = (() => {
    if (fallbackAllowed.size > 0) return Array.from(fallbackAllowed);
    return fallbackKernelDescriptors.map((descriptor) => descriptor.name);
  })();
  const fallbackArtifacts = buildLambdaCoopComparisonArtifacts(
    fallbackKernelDescriptors,
    fallbackAllowed,
    {
      stateCarrierName: stack.kernel.spec.name,
      ...(fallbackExpectedOperations.length > 0
        ? { expectedOperations: fallbackExpectedOperations }
        : {}),
      ...(stack.runner.residualHandlers
        ? (() => {
            let handled = 0;
            let unhandled = 0;
            for (const report of stack.runner.residualHandlers?.reports ?? []) {
              handled += report.handledSamples;
              unhandled += report.unhandledSamples;
            }
            return {
              residualSummary: {
                handled,
                unhandled,
                sampleLimit: stack.runner.residualHandlers.sampleLimit,
                diagnostics: [...stack.runner.residualHandlers.diagnostics],
              },
            } as const;
          })()
        : {}),
    },
  );
  const lambdaCoopBase = stack.lambdaCoopComparison ?? fallbackArtifacts;
  const lambdaCoopBaseMetadata = [...lambdaCoopBase.metadata];

  const runnerSummary = summarizeValueResources(lambdaCoopBase.runnerLiteral);
  const evaluationOperations =
    lambdaCoopBase.userAllowed.length > 0
      ? lambdaCoopBase.userAllowed
      : lambdaCoopBase.kernelClauses.map((clause) => clause.name);
  const interpreterProgram: LambdaCoopUserComputation = {
    kind: "userRun",
    runner: lambdaCoopBase.runnerLiteral,
    computation: buildUserOperationChain(evaluationOperations),
  };
  const interpreterResult = evaluateUser(interpreterProgram);
  const interpreterSummary = summarizeUserEvaluation(interpreterResult);
  const finaliserSummary = interpreterSummary.finaliserSummary;
  const interpreterCollectionSummary = summarizeUserEvaluations([interpreterSummary]);

  const interpreterMetadata = [
    `λ₍coop₎.interpreter.status=${interpreterSummary.status}`,
    `λ₍coop₎.interpreter.operations=${JSON.stringify(interpreterSummary.operations)}`,
    `λ₍coop₎.interpreter.traceLength=${interpreterSummary.traceLength}`,
    interpreterSummary.exceptionPayloadKind
      ? `λ₍coop₎.interpreter.exceptionPayloadKind=${interpreterSummary.exceptionPayloadKind}`
      : 'λ₍coop₎.interpreter.exceptionPayloadKind=∅',
    interpreterSummary.signalPayloadKind
      ? `λ₍coop₎.interpreter.signalPayloadKind=${interpreterSummary.signalPayloadKind}`
      : 'λ₍coop₎.interpreter.signalPayloadKind=∅',
    finaliserSummary
      ? `λ₍coop₎.interpreter.finalisers=${JSON.stringify({
          totalRuns: finaliserSummary.totalRuns,
          totalOutcomes: finaliserSummary.totalOutcomes,
          statusCounts: finaliserSummary.statusCounts,
          exactlyOnce: finaliserSummary.exactlyOnce,
        })}`
      : 'λ₍coop₎.interpreter.finalisers={"totalRuns":0,"totalOutcomes":0,"statusCounts":{"handled":0,"propagated":0,"error":0},"exactlyOnce":true}',
    ...interpreterSummary.notes.map((note, index) => `λ₍coop₎.interpreter.note[${index}]=${note}`),
  ];
  const interpreterSummaryMetadata = [
    `λ₍coop₎.interpreter.summary.total=${interpreterCollectionSummary.totalEvaluations}`,
    `λ₍coop₎.interpreter.summary.status=${JSON.stringify(interpreterCollectionSummary.statusCounts)}`,
    `λ₍coop₎.interpreter.summary.operations=${JSON.stringify(interpreterCollectionSummary.operations)}`,
    `λ₍coop₎.interpreter.summary.valueKinds=${JSON.stringify(interpreterCollectionSummary.valueKinds)}`,
    `λ₍coop₎.interpreter.summary.exceptions=${JSON.stringify(interpreterCollectionSummary.exceptions)}`,
    `λ₍coop₎.interpreter.summary.signals=${JSON.stringify(interpreterCollectionSummary.signals)}`,
    `λ₍coop₎.interpreter.summary.exceptionPayloadKinds=${JSON.stringify(
      interpreterCollectionSummary.exceptionPayloadKinds,
    )}`,
    `λ₍coop₎.interpreter.summary.signalPayloadKinds=${JSON.stringify(
      interpreterCollectionSummary.signalPayloadKinds,
    )}`,
    `λ₍coop₎.interpreter.summary.errors=${JSON.stringify(interpreterCollectionSummary.errors)}`,
    `λ₍coop₎.interpreter.summary.trace=${JSON.stringify(interpreterCollectionSummary.trace)}`,
    `λ₍coop₎.interpreter.summary.finalisers=${JSON.stringify({
      totalRuns: interpreterCollectionSummary.finalisers.totalRuns,
      totalOutcomes: interpreterCollectionSummary.finalisers.totalOutcomes,
      statusCounts: interpreterCollectionSummary.finalisers.statusCounts,
      exactlyOnce: interpreterCollectionSummary.finalisers.exactlyOnce,
    })}`,
    ...interpreterCollectionSummary.notes.map(
      (note, index) => `λ₍coop₎.interpreter.summary.note[${index}]=${note}`,
    ),
  ];
  const traceLimit = Math.max(0, options.traceLimit ?? 16);
  const interpreterTraceMetadata = interpreterResult.trace
    .slice(0, traceLimit)
    .map((entry, index) =>
      `λ₍coop₎.interpreter.trace[${index}]=${JSON.stringify({
        rule: entry.rule,
        note: entry.note,
        before: entry.beforeKind,
        after: entry.afterKind,
      })}`,
    );
  const kernelClauseMetadata: string[] = [];
  const kernelClauseSummaries: ReturnType<typeof summarizeKernelEvaluation>[] = [];
  lambdaCoopBase.clauseBundles.forEach((bundle) => {
    const argument =
      bundle.argumentWitness ??
      canonicalValueForType(bundle.argumentType) ??
      undefined;
    if (!argument) {
      kernelClauseMetadata.push(
        `λ₍coop₎.kernel[${bundle.operation}].summary=skipped:no-argument-witness`,
      );
      return;
    }
    const instantiated = instantiateKernelClause(bundle.clause, argument);
    const kernelResult = evaluateKernel(instantiated);
    const kernelSummary = summarizeKernelEvaluation(kernelResult);
    kernelClauseSummaries.push(kernelSummary);
    kernelClauseMetadata.push(`λ₍coop₎.kernel[${bundle.operation}].status=${kernelSummary.status}`);
    kernelClauseMetadata.push(
      `λ₍coop₎.kernel[${bundle.operation}].operations=${JSON.stringify(kernelSummary.operations)}`,
    );
    kernelClauseMetadata.push(
      `λ₍coop₎.kernel[${bundle.operation}].traceLength=${kernelSummary.traceLength}`,
    );
    if (kernelSummary.valueKind) {
      kernelClauseMetadata.push(
        `λ₍coop₎.kernel[${bundle.operation}].valueKind=${kernelSummary.valueKind}`,
      );
    }
    if (kernelSummary.exception) {
      kernelClauseMetadata.push(
        `λ₍coop₎.kernel[${bundle.operation}].exception=${kernelSummary.exception}`,
      );
    }
    if (kernelSummary.exceptionPayloadKind) {
      kernelClauseMetadata.push(
        `λ₍coop₎.kernel[${bundle.operation}].exceptionPayloadKind=${kernelSummary.exceptionPayloadKind}`,
      );
    }
    if (kernelSummary.signal) {
      kernelClauseMetadata.push(
        `λ₍coop₎.kernel[${bundle.operation}].signal=${kernelSummary.signal}`,
      );
    }
    if (kernelSummary.signalPayloadKind) {
      kernelClauseMetadata.push(
        `λ₍coop₎.kernel[${bundle.operation}].signalPayloadKind=${kernelSummary.signalPayloadKind}`,
      );
    }
    kernelSummary.notes.forEach((note, noteIndex) =>
      kernelClauseMetadata.push(
        `λ₍coop₎.kernel[${bundle.operation}].note[${noteIndex}]=${note}`,
      ),
    );
  });
  const kernelCollectionSummary = summarizeKernelEvaluations(kernelClauseSummaries);
  kernelClauseMetadata.push(
    `λ₍coop₎.kernel.summary.total=${kernelCollectionSummary.totalEvaluations}`,
  );
  kernelClauseMetadata.push(
    `λ₍coop₎.kernel.summary.status=${JSON.stringify(kernelCollectionSummary.statusCounts)}`,
  );
  kernelClauseMetadata.push(
    `λ₍coop₎.kernel.summary.operations=${JSON.stringify(kernelCollectionSummary.operations)}`,
  );
  kernelClauseMetadata.push(
    `λ₍coop₎.kernel.summary.valueKinds=${JSON.stringify(kernelCollectionSummary.valueKinds)}`,
  );
  kernelClauseMetadata.push(
    `λ₍coop₎.kernel.summary.exceptions=${JSON.stringify(kernelCollectionSummary.exceptions)}`,
  );
  kernelClauseMetadata.push(
    `λ₍coop₎.kernel.summary.signals=${JSON.stringify(kernelCollectionSummary.signals)}`,
  );
  kernelClauseMetadata.push(
    `λ₍coop₎.kernel.summary.exceptionPayloadKinds=${JSON.stringify(
      kernelCollectionSummary.exceptionPayloadKinds,
    )}`,
  );
  kernelClauseMetadata.push(
    `λ₍coop₎.kernel.summary.signalPayloadKinds=${JSON.stringify(
      kernelCollectionSummary.signalPayloadKinds,
    )}`,
  );
  kernelClauseMetadata.push(
    `λ₍coop₎.kernel.summary.trace=${JSON.stringify(kernelCollectionSummary.trace)}`,
  );

  const alignmentExtras: LambdaCoopAlignmentSummaryExtras = {
    residualLawAggregate,
    residualLawCheck,
    ...(residualHandlerSummary ? { residualHandlerSummary } : {}),
    ...(options.alignmentMetadata
      ? { additionalMetadata: options.alignmentMetadata }
      : {}),
    ...(options.alignmentNotes ? { additionalNotes: options.alignmentNotes } : {}),
  };
  const alignmentSummary = buildLambdaCoopAlignmentSummary(
    {
      aligned: lambdaCoopBase.aligned,
      boundaryWitnesses: lambdaCoopBase.boundaryWitnesses,
      ...(lambdaCoopBase.residualCoverage
        ? { residualCoverage: lambdaCoopBase.residualCoverage }
        : {}),
      unsupportedByKernel: lambdaCoopBase.unsupportedByKernel,
      unacknowledgedByUser: lambdaCoopBase.unacknowledgedByUser,
    },
    oracleSummary,
    residualOracleSummary,
    interpreterCollectionSummary,
    kernelCollectionSummary,
    alignmentExtras,
  );

  const lambdaCoop: LambdaCoopComparisonArtifacts & { readonly metadata: ReadonlyArray<string> } = {
    ...lambdaCoopBase,
    metadata: [
      ...lambdaCoopBaseMetadata,
      ...interpreterMetadata,
      ...interpreterSummaryMetadata,
      ...interpreterTraceMetadata,
      ...kernelClauseMetadata,
      ...alignmentSummary.metadata,
    ],
  };

  const notes: string[] = [
    ...stack.diagnostics,
    ...stack.comparison.diagnostics,
    ...lambdaCoop.diagnostics,
    ...lambdaCoop.metadata,
    `λ₍coop₎ alignment status: ${lambdaCoop.aligned ? "aligned" : "issues detected"}`,
    `λ₍coop₎ equivalence summary: stateHandler=${equivalences.stateHandler.holds ? "ok" : "fail"}, coalgebra=${equivalences.coalgebra.holds ? "ok" : "fail"}, costate=${equivalences.costate.holds ? "ok" : "fail"}, costT=${equivalences.costT.holds ? "ok" : "fail"}, sweedler=${equivalences.sweedler.holds ? "ok" : "fail"}, triangle=${equivalences.triangle.holds ? "ok" : "fail"}`,
    `λ₍coop₎ runner resources: signatures=${Array.from(runnerSummary.usage.signatures).join(",") || "∅"} exceptions=${Array.from(runnerSummary.usage.exceptions).join(",") || "∅"} signals=${Array.from(runnerSummary.usage.signals).join(",") || "∅"} states=${Array.from(runnerSummary.usage.states).join(",") || "∅"}`,
    `λ₍coop₎ interpreter status=${interpreterSummary.status} operations=${interpreterSummary.operations.join(",") || "∅"} trace=${interpreterSummary.traceLength}`,
    `λ₍coop₎ boundary supported=${lambdaCoop.boundaryWitnesses.supported.join(",") || "∅"} unsupported=${lambdaCoop.boundaryWitnesses.unsupported.join(",") || "∅"} unacknowledged=${lambdaCoop.boundaryWitnesses.unacknowledged.join(",") || "∅"}`,
    `λ₍coop₎ residual law mismatches=${JSON.stringify(residualLawAggregate.mismatches)}`,
    `λ₍coop₎ residual law counterexamples=${JSON.stringify(residualLawAggregate.counterexamples)}`,
    `λ₍coop₎ residual law counterexample summary=${JSON.stringify(residualLawAggregate.counterexampleSummary)}`,
    `λ₍coop₎ residual law holds=${residualLawCheck.holds}`,
    ...(residualLawCheck.zeroResidual !== undefined
      ? [`λ₍coop₎ residual law zeroResidual=${residualLawCheck.zeroResidual}`]
      : []),
    ...(residualLawAggregate.pureMapRelaxation
      ? ["λ₍coop₎ residual law pureMapRelaxation=Kleisli-pure"]
      : []),
  ];
  if (residualLawAggregate.mismatches.length > 0) {
    for (const mismatch of residualLawAggregate.mismatches) {
      notes.push(
        `λ₍coop₎ residual law mismatch diagram=${mismatch.diagram} object=${mismatch.object} mismatches=${mismatch.mismatches} checked=${mismatch.checked}`,
      );
    }
  }
  if (residualLawAggregate.counterexampleSummary.total > 0) {
    notes.push(
      `λ₍coop₎ residual law counterexample totals law=${residualLawAggregate.counterexampleSummary.byOrigin.law} runner=${residualLawAggregate.counterexampleSummary.byOrigin.runner}`,
    );
    for (const [diagram, count] of Object.entries(
      residualLawAggregate.counterexampleSummary.byDiagram,
    )) {
      notes.push(
        `λ₍coop₎ residual law counterexample diagram=${diagram} count=${count}`,
      );
    }
  }
  if (residualLawAggregate.compatibilitySummary) {
    notes.push(
      `λ₍coop₎ residual law compatibility summary total=${residualLawAggregate.compatibilitySummary.total}` +
        ` mismatched=${residualLawAggregate.compatibilitySummary.mismatched}` +
        ` matching=${residualLawAggregate.compatibilitySummary.matching}`,
    );
    for (const [label, entry] of Object.entries(
      residualLawAggregate.compatibilitySummary.byLabel,
    )) {
      notes.push(
        `λ₍coop₎ residual law compatibility summary label=${label} mismatches=${entry.mismatches} checked=${entry.checked}`,
      );
    }
  }
  if (residualLawCheck.notes.length > 0) {
    notes.push(
      ...residualLawCheck.notes.map(
        (note) => `λ₍coop₎ residual law check note=${note}`,
      ),
    );
  }
  if (residualLawCheck.diagnostics.length > 0) {
    notes.push(
      ...residualLawCheck.diagnostics.map(
        (diagnostic) => `λ₍coop₎ residual law check diagnostic=${diagnostic}`,
      ),
    );
  }
  if (residualLawAggregate.counterexamples.length > 0) {
    for (const counterexample of residualLawAggregate.counterexamples) {
      notes.push(
        `λ₍coop₎ residual law counterexample origin=${counterexample.origin} diagram=${counterexample.diagram} object=${counterexample.object}${counterexample.sample ? ` sample=${counterexample.sample}` : ""}${counterexample.error ? ` error=${counterexample.error}` : ""}`,
      );
      notes.push(`λ₍coop₎ residual law counterexample description=${counterexample.description}`);
      for (const detail of counterexample.diagnostics) {
        notes.push(`λ₍coop₎ residual law counterexample note=${detail}`);
      }
    }
  }
  if (lambdaCoop.issues.length > 0) notes.push(...lambdaCoop.issues);
  if (finaliserSummary) {
    notes.push(
      `λ₍coop₎ interpreter finalisers runs=${finaliserSummary.totalRuns} outcomes=${finaliserSummary.totalOutcomes}` +
        ` handled=${finaliserSummary.statusCounts.handled} propagated=${finaliserSummary.statusCounts.propagated}` +
        ` errors=${finaliserSummary.statusCounts.error} exactlyOnce=${finaliserSummary.exactlyOnce}`,
    );
  } else {
    notes.push('λ₍coop₎ interpreter finalisers runs=0 outcomes=0 handled=0 propagated=0 errors=0 exactlyOnce=true');
  }
  interpreterCollectionSummary.notes.forEach((note) =>
    notes.push(`λ₍coop₎ interpreter summary ${note}`),
  );
  notes.push(...interpreterSummary.notes.map((note) => `λ₍coop₎ interpreter note=${note}`));
  if (interpreterSummary.exception) notes.push(`λ₍coop₎ interpreter exception=${interpreterSummary.exception}`);
  if (interpreterSummary.signal) notes.push(`λ₍coop₎ interpreter signal=${interpreterSummary.signal}`);
  if (interpreterSummary.error) notes.push(`λ₍coop₎ interpreter error=${interpreterSummary.error}`);
  if (lambdaCoop.clauseBundles) {
    for (const bundle of lambdaCoop.clauseBundles) {
      notes.push(...bundle.diagnostics);
    }
  }
  if (lambdaCoop.residualCoverage) {
    notes.push(
      `λ₍coop₎ residual coverage summary: handled=${lambdaCoop.residualCoverage.handled} unhandled=${lambdaCoop.residualCoverage.unhandled} sampleLimit=${lambdaCoop.residualCoverage.sampleLimit}`,
    );
  }
  kernelCollectionSummary.notes.forEach((note) =>
    notes.push(`λ₍coop₎ kernel summary ${note}`),
  );
  if (stack.residualSummary) {
    notes.push(...stack.residualSummary.diagnostics);
  }
  notes.push(...alignmentSummary.notes);

  return {
    law: interaction,
    stack,
    runner,
    oracles,
    oracleSummary,
    equivalences,
    lambdaCoop,
    runnerSummary,
    interpreterResult,
    alignmentSummary,
    residualOracleSummary,
    residualLaw: residualLawAggregate,
    residualLawCheck,
    ...(residualHandlerSummary ? { residualHandlers: residualHandlerSummary } : {}),
    comparison: {
      unsupportedByKernel: lambdaCoop.unsupportedByKernel,
      unacknowledgedByUser: lambdaCoop.unacknowledgedByUser,
      boundaryWitnesses: lambdaCoop.boundaryWitnesses,
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
    kind: "runnerLiteral",
    stateCarrier: "store",
    clauses: [
      {
        operation: "op",
        parameter: "x",
        parameterType: { kind: "base", name: "X" },
        body: { kind: "kernelReturn", value: { kind: "unitValue" } },
      },
    ],
  };
  const userComputation: LambdaCoopUserComputation = {
    kind: "userRun",
    runner: runnerLiteral,
    computation: {
      kind: "userOperation",
      operation: "op",
      argument: { kind: "unitValue" },
      continuation: {
        parameter: "u",
        body: { kind: "userReturn", value: { kind: "unitValue" } },
      },
      annotation: { operations: ["op"], states: ["store"] },
    },
  };
  const resourceSummary = summarizeUserComputationResources(userComputation);
  const law = makeExample6MonadComonadInteractionLaw();
  const runner = buildRunnerFromInteraction(law);
  const oracles = enumerateRunnerOracles(runner, law, { sampleLimit: 4 });
  return { law: law as any, runner: runner as any, resourceSummary, oracles };
}
