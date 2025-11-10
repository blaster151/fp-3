import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import { SetCat, type SetObj } from "./set-cat";
import {
  attachResidualHandlers,
  analyzeResidualHandlerCoverage,
  buildRunnerFromInteraction,
  type ResidualHandlerAnalysisOptions,
  type ResidualHandlerSpec,
  type ResidualHandlerSummary,
  type StatefulRunner,
} from "./stateful-runner";

export type KernelEffectKind = "state" | "exception" | "signal" | "external";

export interface KernelOperationSpec<Obj, Left, Right> {
  readonly name: string;
  readonly kind: KernelEffectKind;
  readonly description?: string;
  readonly residualHandler?: ResidualHandlerSpec<Obj, Left, Right>;
  readonly handle?: (
    state: unknown,
    input: unknown,
  ) => { readonly state: unknown; readonly output: unknown };
  readonly defaultResidual?: boolean;
}

export interface KernelMonadSpec<Obj, Left, Right> {
  readonly name: string;
  readonly description?: string;
  readonly stateCarrier?: SetObj<unknown>;
  readonly initialState?: unknown;
  readonly operations?: ReadonlyArray<KernelOperationSpec<Obj, Left, Right>>;
  readonly residualHandlers?: ReadonlyMap<Obj, ResidualHandlerSpec<Obj, Left, Right>>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface KernelMonadResult<Obj, Left, Right> {
  readonly spec: KernelMonadSpec<Obj, Left, Right>;
  readonly monad?: {
    readonly stateCarrier: SetObj<unknown>;
    readonly initialState: unknown;
    readonly return: (state: unknown, value: unknown) => { readonly state: unknown; readonly value: unknown };
    readonly operations: ReadonlyArray<KernelOperationSpec<Obj, Left, Right>>;
  };
  readonly diagnostics: ReadonlyArray<string>;
}

export interface UserMonadSpec<Obj> {
  readonly name: string;
  readonly description?: string;
  readonly boundaryDescription?: string;
  readonly allowedKernelOperations?: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface UserMonadResult<Obj> {
  readonly spec: UserMonadSpec<Obj>;
  readonly monad?: {
    readonly allowedKernelOperations: ReadonlySet<string>;
  };
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
  readonly comparison: {
    readonly unsupportedByKernel: ReadonlyArray<string>;
    readonly unacknowledgedByUser: ReadonlyArray<string>;
  };
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

  const stateCarrier =
    spec.stateCarrier ??
    SetCat.obj([spec.initialState ?? null], { tag: `${spec.name}:stateCarrier` });
  diagnostics.push(
    `State carrier source: ${spec.stateCarrier ? "custom" : "auto-generated placeholder"}`,
  );
  diagnostics.push(
    `Initial state: ${spec.initialState !== undefined ? "provided" : "defaulted to null"}`,
  );

  const operations = spec.operations ?? [];
  const operationNames = new Set<string>();
  const duplicateOperations: string[] = [];
  const operationSummaries = operations.map((op) => {
    if (operationNames.has(op.name)) {
      duplicateOperations.push(op.name);
    } else {
      operationNames.add(op.name);
    }
    return `${op.kind}:${op.name}`;
  });

  if (operations.length === 0) {
    diagnostics.push("Kernel operations: none specified (placeholder only).");
  } else {
    diagnostics.push(
      `Kernel operations (${operations.length}): ${operationSummaries.join(", ")}`,
    );
    if (duplicateOperations.length > 0) {
      diagnostics.push(
        `Kernel operations warning: duplicate operation names detected (${duplicateOperations.join(
          ", ",
        )}).`,
      );
    }
    const operationsWithHandlers = operations.filter((op) => op.residualHandler);
    if (operationsWithHandlers.length > 0 && (!spec.residualHandlers || spec.residualHandlers.size === 0)) {
      diagnostics.push(
        "Kernel operations note: operation-level residual handlers supplied but no object-level residual mapping provided.",
      );
    }
  }

  if (!spec.residualHandlers || spec.residualHandlers.size === 0) {
    diagnostics.push("Residual coverage: no handler specifications supplied (all effects treated as unhandled until implemented).");
  } else {
    diagnostics.push(`Residual coverage: ${spec.residualHandlers.size} handler specification(s) supplied.`);
  }
  const operationsWithHandles = operations.filter((op) => op.handle);
  if (operationsWithHandles.length > 0) {
    diagnostics.push(
      `Kernel operation handlers provided for: ${operationsWithHandles
        .map((op) => op.name)
        .join(", ")}`,
    );
  } else if (operations.length > 0) {
    diagnostics.push("Kernel operation handlers: none provided (using identity state transitions).");
  }
  const defaultResidualOps = operations.filter((op) => op.defaultResidual);
  if (defaultResidualOps.length > 0) {
    diagnostics.push(
      `Kernel operations marked as residual-only: ${defaultResidualOps
        .map((op) => op.name)
        .join(", ")}`,
    );
  }

  return {
    spec,
    monad:
      spec.operations && spec.operations.length > 0
        ? {
            stateCarrier,
            initialState: spec.initialState ?? null,
            return: (state: unknown, value: unknown) => ({ state, value }),
            operations,
          }
        : undefined,
    diagnostics,
  };
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
  if (spec.allowedKernelOperations && spec.allowedKernelOperations.length > 0) {
    diagnostics.push(
      `User boundary expectations (${spec.allowedKernelOperations.length} operation(s)): ${spec.allowedKernelOperations.join(
        ", ",
      )}`,
    );
  } else {
    diagnostics.push("User boundary expectations: none declared.");
  }
  if (spec.metadata && spec.metadata.length > 0) {
    diagnostics.push(`Metadata: ${spec.metadata.join(", ")}`);
  }
  const allowedKernelOperations = new Set(spec.allowedKernelOperations ?? []);
  return { spec, monad: { allowedKernelOperations }, diagnostics };
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

  const residualSpecs: Map<Obj, ResidualHandlerSpec<Obj, Left, Right>> =
    kernelSpec.residualHandlers
      ? new Map(kernelSpec.residualHandlers)
      : new Map();

  // Promote operation-level residual handlers into the residual spec map if provided.
  for (const op of kernelSpec.operations ?? []) {
    if (op.residualHandler) {
      for (const object of interaction.kernel.base.objects) {
        if (!residualSpecs.has(object)) {
          residualSpecs.set(object, op.residualHandler);
        }
      }
    }
    if (op.defaultResidual) {
      for (const object of interaction.kernel.base.objects) {
        if (!residualSpecs.has(object)) {
          residualSpecs.set(object, {
            description: `Default residual for ${op.name}`,
            predicate: () => false,
          });
        }
      }
    }
  }

  const runner = attachResidualHandlers(baseRunner, interaction, residualSpecs, {
    sampleLimit: options.sampleLimit,
    objectFilter: options.objectFilter,
    maxLoggedUnhandled: options.maxLoggedUnhandled,
  });

  const diagnostics: string[] = [
    `Supervised stack scaffold: kernel="${kernelSpec.name}", user="${userSpec.name}".`,
  ];
  diagnostics.push(...kernel.diagnostics);
  diagnostics.push(...user.diagnostics);

  const kernelOperationNames = new Set<string>(
    (kernelSpec.operations ?? []).map((op) => op.name),
  );
  const boundarySet = user.monad?.allowedKernelOperations ?? new Set<string>();
  const unsupportedByKernel = [...boundarySet].filter(
    (name) => !kernelOperationNames.has(name),
  );
  const unacknowledgedByUser = [...kernelOperationNames].filter(
    (name) => !boundarySet.has(name),
  );
  if (unsupportedByKernel.length > 0) {
    diagnostics.push(
      `Boundary warning: user references kernel operations that are not declared (${unsupportedByKernel.join(
        ", ",
      )}).`,
    );
  }
  if (unacknowledgedByUser.length > 0) {
    diagnostics.push(
      `Boundary note: kernel operations not explicitly acknowledged by user spec (${unacknowledgedByUser.join(
        ", ",
      )}).`,
    );
  }

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
    comparison: {
      unsupportedByKernel,
      unacknowledgedByUser,
    },
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
    `runnerToStack scaffold: residual reports=${runner.residualHandlers?.reports.length ?? 0}, diagnostics lines=${runner.diagnostics.length}.`,
  ],
});
