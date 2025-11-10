import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import {
  attachResidualHandlers,
  analyzeResidualHandlerCoverage,
  buildRunnerFromInteraction,
  type ResidualHandlerAnalysisOptions,
  type ResidualHandlerSpec,
  type ResidualHandlerSummary,
  type StatefulRunner,
} from "./stateful-runner";

export interface KernelMonadSpec<Obj, Left, Right> {
  readonly name: string;
  readonly description?: string;
  readonly residualHandlers?: ReadonlyMap<Obj, ResidualHandlerSpec<Obj, Left, Right>>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface KernelMonadResult<Obj, Left, Right> {
  readonly spec: KernelMonadSpec<Obj, Left, Right>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface UserMonadSpec<Obj> {
  readonly name: string;
  readonly description?: string;
  readonly boundaryDescription?: string;
  readonly metadata?: ReadonlyArray<string>;
}

export interface UserMonadResult<Obj> {
  readonly spec: UserMonadSpec<Obj>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface SupervisedStackOptions<Obj> extends ResidualHandlerAnalysisOptions<Obj> {
  readonly includeResidualAnalysis?: boolean;
}

export interface SupervisedStack<
  Obj,
  Arr,
  Left,
  Right,
  Value
> {
  readonly kernel: KernelMonadResult<Obj, Left, Right>;
  readonly user: UserMonadResult<Obj>;
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly residualSummary?: ResidualHandlerSummary<Obj, Left, Right>;
  readonly diagnostics: ReadonlyArray<string>;
}

export const makeKernelMonad = <Obj, Left, Right>(
  spec: KernelMonadSpec<Obj, Left, Right>,
): KernelMonadResult<Obj, Left, Right> => {
  const diagnostics: string[] = [
    `Kernel monad scaffold "${spec.name}": placeholder (pending concrete implementation).`,
  ];
  if (spec.description) diagnostics.push(`Description: ${spec.description}`);
  if (spec.metadata && spec.metadata.length > 0) {
    diagnostics.push(`Metadata: ${spec.metadata.join(", ")}`);
  }
  if (!spec.residualHandlers || spec.residualHandlers.size === 0) {
    diagnostics.push("Residual coverage: no handler specifications supplied (all effects treated as unhandled until implemented).");
  } else {
    diagnostics.push(`Residual coverage: ${spec.residualHandlers.size} handler specification(s) supplied.`);
  }
  return { spec, diagnostics };
};

export const makeUserMonad = <Obj>(
  spec: UserMonadSpec<Obj>,
): UserMonadResult<Obj> => {
  const diagnostics: string[] = [
    `User monad scaffold "${spec.name}": placeholder (pending concrete implementation).`,
  ];
  if (spec.description) diagnostics.push(`Description: ${spec.description}`);
  if (spec.boundaryDescription) {
    diagnostics.push(`Boundary: ${spec.boundaryDescription}`);
  } else {
    diagnostics.push("Boundary: TODO — comparison morphism not yet implemented.");
  }
  if (spec.metadata && spec.metadata.length > 0) {
    diagnostics.push(`Metadata: ${spec.metadata.join(", ")}`);
  }
  return { spec, diagnostics };
};

export const makeSupervisedStack = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  kernelSpec: KernelMonadSpec<Obj, Left, Right>,
  userSpec: UserMonadSpec<Obj>,
  options: SupervisedStackOptions<Obj> = {},
): SupervisedStack<Obj, Arr, Left, Right, Value> => {
  const kernel = makeKernelMonad(kernelSpec);
  const user = makeUserMonad(userSpec);

  const baseRunner = buildRunnerFromInteraction(interaction, {
    metadata: [`supervised-stack:${kernelSpec.name}/${userSpec.name}`],
  });

  const residualSpecs =
    kernelSpec.residualHandlers ?? new Map<Obj, ResidualHandlerSpec<Obj, Left, Right>>();

  const runner = attachResidualHandlers(baseRunner, interaction, residualSpecs, {
    sampleLimit: options.sampleLimit,
    objectFilter: options.objectFilter,
    maxLoggedUnhandled: options.maxLoggedUnhandled,
  });

  const diagnostics: string[] = [
    `Supervised stack scaffold: kernel="${kernelSpec.name}", user="${userSpec.name}".`,
    ...kernel.diagnostics,
    ...user.diagnostics,
  ];

  let residualSummary: ResidualHandlerSummary<Obj, Left, Right> | undefined = runner.residualHandlers;
  if (options.includeResidualAnalysis) {
    residualSummary = analyzeResidualHandlerCoverage(baseRunner, interaction, residualSpecs, {
      sampleLimit: options.sampleLimit,
      objectFilter: options.objectFilter,
      maxLoggedUnhandled: options.maxLoggedUnhandled,
    });
    diagnostics.push(...residualSummary.diagnostics);
  } else if (runner.residualHandlers) {
    diagnostics.push(...runner.residualHandlers.diagnostics);
  }

  return {
    kernel,
    user,
    runner,
    residualSummary,
    diagnostics,
  };
};

export const stackToRunner = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
  kernelSpec: KernelMonadSpec<Obj, Left, Right>,
  userSpec: UserMonadSpec<Obj>,
  options: SupervisedStackOptions<Obj> = {},
): StatefulRunner<Obj, Left, Right, Value> =>
  makeSupervisedStack(interaction, kernelSpec, userSpec, options).runner;

export interface RunnerToStackResult {
  readonly diagnostics: ReadonlyArray<string>;
}

export const runnerToStack = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  _runner: StatefulRunner<Obj, Left, Right, Value>,
  _interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerToStackResult => ({
  diagnostics: [
    "runnerToStack: TODO — reconstruction of supervised stack from runner is not implemented yet.",
  ],
});
