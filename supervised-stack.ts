import type { MonadComonadInteractionLaw } from "./monad-comonad-interaction-law";
import { SetCat, type SetObj } from "./set-cat";
import {
  attachResidualHandlers,
  analyzeResidualHandlerCoverage,
  buildEnrichedStatefulRunner,
  buildRunnerFromInteraction,
  type ResidualHandlerAnalysisOptions,
  type ResidualHandlerSpec,
  type ResidualHandlerSummary,
  type StatefulRunner,
} from "./stateful-runner";
import {
  buildLambdaCoopComparisonArtifacts,
  type LambdaCoopComparisonArtifacts,
} from "./supervised-stack-lambda-coop";
import type { LambdaCoopRunnerLiteral } from "./lambda-coop";

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

export interface KernelOperationResultBase {
  readonly state: unknown;
  readonly diagnostics?: ReadonlyArray<string>;
}

export interface KernelOperationReturn extends KernelOperationResultBase {
  readonly kind: "return";
  readonly value: unknown;
}

export interface KernelOperationRaise extends KernelOperationResultBase {
  readonly kind: "raise";
  readonly exception: unknown;
  readonly payload?: unknown;
}

export interface KernelOperationSignal extends KernelOperationResultBase {
  readonly kind: "signal";
  readonly signal: unknown;
  readonly payload?: unknown;
}

export interface KernelOperationResidual extends KernelOperationResultBase {
  readonly kind: "residual";
  readonly note: string;
}

export type KernelOperationResult =
  | KernelOperationReturn
  | KernelOperationRaise
  | KernelOperationSignal
  | KernelOperationResidual;

export interface KernelOperationImplementation<Obj, Left, Right>
  extends KernelOperationSpec<Obj, Left, Right> {
  readonly execute: (state: unknown, input: unknown) => KernelOperationResult;
  readonly diagnostics: ReadonlyArray<string>;
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
    readonly operations: ReadonlyArray<KernelOperationImplementation<Obj, Left, Right>>;
  };
  readonly diagnostics: ReadonlyArray<string>;
  readonly operationLookup: ReadonlyMap<string, KernelOperationImplementation<Obj, Left, Right>>;
}

export interface UserMonadSpec<Obj> {
  readonly name: string;
  readonly description?: string;
  readonly boundaryDescription?: string;
  readonly allowedKernelOperations?: ReadonlyArray<string>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface UserKernelComparison<Obj, Left, Right> {
  readonly userToKernel: ReadonlyMap<string, KernelOperationImplementation<Obj, Left, Right>>;
  readonly missingInKernel: ReadonlyArray<string>;
  readonly unusedKernelOperations: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface UserMonadResult<Obj, Left, Right> {
  readonly spec: UserMonadSpec<Obj>;
  readonly monad?: {
    readonly allowedKernelOperations: ReadonlySet<string>;
    readonly invoke: (
      operation: string,
      state: unknown,
      input: unknown,
    ) => KernelOperationResult;
  };
  readonly diagnostics: ReadonlyArray<string>;
  readonly comparison?: UserKernelComparison<Obj, Left, Right>;
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
  readonly user: UserMonadResult<Obj, Left, Right>;
  readonly runner: StatefulRunner<Obj, Left, Right, Value>;
  readonly residualSummary?: ResidualHandlerSummary<Obj, Left, Right>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly comparison: {
    readonly userToKernel: ReadonlyMap<string, KernelOperationImplementation<Obj, Left, Right>>;
    readonly unsupportedByKernel: ReadonlyArray<string>;
    readonly unacknowledgedByUser: ReadonlyArray<string>;
    readonly diagnostics: ReadonlyArray<string>;
  };
  readonly lambdaCoopComparison?: LambdaCoopComparisonArtifacts & {
    readonly metadata: ReadonlyArray<string>;
  };
}

export const makeKernelMonad = <Obj, Left, Right>(
  spec: KernelMonadSpec<Obj, Left, Right>,
): KernelMonadResult<Obj, Left, Right> => {
  const diagnostics: string[] = [
    `Kernel monad "${spec.name}": assembling operation semantics.`,
  ];
  if (spec.description) diagnostics.push(`Description: ${spec.description}`);
  if (spec.metadata && spec.metadata.length > 0) {
    diagnostics.push(`Metadata: ${spec.metadata.join(", ")}`);
  }

  const initialState = spec.initialState ?? null;
  const stateCarrier =
    spec.stateCarrier ??
    SetCat.obj([initialState], { tag: `${spec.name}:stateCarrier` });
  diagnostics.push(
    `State carrier source: ${spec.stateCarrier ? "custom specification" : "auto-generated from initial state"}`,
  );
  diagnostics.push(
    `Initial state: ${spec.initialState !== undefined ? "provided" : "defaulted to null"}`,
  );

  const operations = spec.operations ?? [];
  const operationNames = new Set<string>();
  const duplicateOperations: string[] = [];
  const implementations: KernelOperationImplementation<Obj, Left, Right>[] = operations.map((op) => {
    if (operationNames.has(op.name)) {
      duplicateOperations.push(op.name);
    } else {
      operationNames.add(op.name);
    }
    const implementationDiagnostics: string[] = [];
    if (op.description) {
      implementationDiagnostics.push(`Description: ${op.description}`);
    }
    if (op.handle) {
      implementationDiagnostics.push("Custom handler provided.");
    }
    if (op.residualHandler) {
      implementationDiagnostics.push("Residual handler bound to operation.");
    }
    if (op.defaultResidual) {
      implementationDiagnostics.push("Marked as default residual (invocations promote to residual effects when no handler overrides).");
    }

    const execute = (state: unknown, input: unknown): KernelOperationResult => {
      const localDiagnostics: string[] = [
        `Kernel operation ${op.name}: kind=${op.kind}`,
      ];
      const runHandler = (): KernelOperationResult | undefined => {
        if (!op.handle) return undefined;
        try {
          const result = op.handle(state, input) ?? { state, output: undefined };
          const nextState = result.state ?? state;
          const output = result.output;
          localDiagnostics.push("Handler executed successfully.");
          switch (op.kind) {
            case "state":
            case "external":
              return {
                kind: "return",
                state: nextState,
                value: output,
                diagnostics: localDiagnostics,
              };
            case "exception":
              return {
                kind: "raise",
                state: nextState,
                exception: op.name,
                payload: output,
                diagnostics: localDiagnostics,
              };
            case "signal":
              return {
                kind: "signal",
                state: nextState,
                signal: op.name,
                payload: output,
                diagnostics: localDiagnostics,
              };
            default: {
              const _exhaustive: never = op.kind;
              return {
                kind: "return",
                state: nextState,
                value: output,
                diagnostics: localDiagnostics,
              };
            }
          }
        } catch (error) {
          localDiagnostics.push(`Handler threw: ${error instanceof Error ? error.message : String(error)}`);
          return {
            kind: "raise",
            state,
            exception: op.name,
            payload: error instanceof Error ? error : String(error),
            diagnostics: localDiagnostics,
          };
        }
      };

      if (op.defaultResidual && !op.handle) {
        const note = `Operation ${op.name} is delegated to residual handling.`;
        localDiagnostics.push(note);
        return { kind: "residual", state, note, diagnostics: localDiagnostics };
      }

      const handled = runHandler();
      if (handled) {
        return handled;
      }

      switch (op.kind) {
        case "state": {
          localDiagnostics.push("Default state effect: expose current state; no mutation.");
          return {
            kind: "return",
            state,
            value: state,
            diagnostics: localDiagnostics,
          };
        }
        case "exception": {
          localDiagnostics.push("Default exception: raise with input payload.");
          return {
            kind: "raise",
            state,
            exception: op.name,
            payload: input,
            diagnostics: localDiagnostics,
          };
        }
        case "signal": {
          localDiagnostics.push("Default signal: emit payload without mutating state.");
          return {
            kind: "signal",
            state,
            signal: op.name,
            payload: input,
            diagnostics: localDiagnostics,
          };
        }
        case "external": {
          const note = `External operation ${op.name} requires residual interpreter.`;
          localDiagnostics.push(note);
          return {
            kind: "residual",
            state,
            note,
            diagnostics: localDiagnostics,
          };
        }
        default: {
          const _exhaustive: never = op.kind;
          localDiagnostics.push("Unhandled operation kind; returning residual.");
          return {
            kind: "residual",
            state,
            note: `Unsupported operation kind for ${op.name}.`,
            diagnostics: localDiagnostics,
          };
        }
      }
    };

    return {
      ...op,
      execute,
      diagnostics: implementationDiagnostics,
    };
  });

  const operationSummaries = implementations.map((op) => `${op.kind}:${op.name}`);

  if (implementations.length === 0) {
    diagnostics.push("Kernel operations: none specified (runner executes ψ without kernel delegation).");
  } else {
    diagnostics.push(`Kernel operations (${implementations.length}): ${operationSummaries.join(", ")}`);
    if (duplicateOperations.length > 0) {
      diagnostics.push(
        `Kernel operations warning: duplicate operation names detected (${duplicateOperations.join(", ")}).`,
      );
    }
    const operationsWithHandlers = implementations.filter((op) => op.handle);
    if (operationsWithHandlers.length > 0) {
      diagnostics.push(
        `Kernel operation handlers provided for: ${operationsWithHandlers.map((op) => op.name).join(", ")}`,
      );
    } else {
      diagnostics.push("Kernel operation handlers: none provided (defaults active).");
    }
    const residualOnly = implementations.filter((op) => op.defaultResidual && !op.handle);
    if (residualOnly.length > 0) {
      diagnostics.push(
        `Kernel operations marked residual-only (no handler override): ${residualOnly.map((op) => op.name).join(", ")}`,
      );
    }
  }

  if (!spec.residualHandlers || spec.residualHandlers.size === 0) {
    diagnostics.push(
      "Residual coverage: no handler specifications supplied (effects default to unhandled unless operations specify otherwise).",
    );
  } else {
    diagnostics.push(`Residual coverage: ${spec.residualHandlers.size} handler specification(s) supplied.`);
  }

  return {
    spec,
    monad: {
      stateCarrier,
      initialState,
      return: (state: unknown, value: unknown) => ({ state, value }),
      operations: implementations,
    },
    diagnostics,
    operationLookup: new Map(implementations.map((op) => [op.name, op])),
  };
};

export const makeUserMonad = <Obj, Left, Right>(
  spec: UserMonadSpec<Obj>,
  kernel?: KernelMonadResult<Obj, Left, Right>,
): UserMonadResult<Obj, Left, Right> => {
  const diagnostics: string[] = [
    `User monad "${spec.name}": building kernel comparison.`,
  ];
  if (spec.description) diagnostics.push(`Description: ${spec.description}`);
  if (spec.boundaryDescription) {
    diagnostics.push(`Boundary: ${spec.boundaryDescription}`);
  } else {
    diagnostics.push("Boundary: TODO — provide explicit comparison morphism description.");
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
  const kernelOperationLookup =
    kernel?.operationLookup ??
    new Map<string, KernelOperationImplementation<Obj, Left, Right>>();

  const userToKernel = new Map<string, KernelOperationImplementation<Obj, Left, Right>>();
  const missingInKernel: string[] = [];
  for (const opName of allowedKernelOperations) {
    const candidate = kernelOperationLookup.get(opName);
    if (candidate) {
      userToKernel.set(opName, candidate);
    } else {
      missingInKernel.push(opName);
    }
  }
  const unusedKernelOperations = [...kernelOperationLookup.keys()].filter(
    (name) => !allowedKernelOperations.has(name),
  );

  const comparisonDiagnostics: string[] = [];
  if (kernel) {
    if (missingInKernel.length === 0 && allowedKernelOperations.size > 0) {
      comparisonDiagnostics.push("Comparison: all user-declared operations available in kernel.");
    } else if (missingInKernel.length > 0) {
      comparisonDiagnostics.push(
        `Comparison warning: user references kernel operations not present (${missingInKernel.join(
          ", ",
        )}).`,
      );
    } else {
      comparisonDiagnostics.push("Comparison: user did not declare any kernel operations.");
    }
    if (unusedKernelOperations.length > 0) {
      comparisonDiagnostics.push(
        `Comparison note: kernel exposes operations not acknowledged by user (${unusedKernelOperations.join(
          ", ",
        )}).`,
      );
    } else if (kernelOperationLookup.size > 0) {
      comparisonDiagnostics.push("Comparison: user acknowledges all kernel operations.");
    }
  } else if (allowedKernelOperations.size > 0) {
    comparisonDiagnostics.push(
      "Comparison pending: kernel monad not supplied; all user operations treated as residual.",
    );
  }
  if (comparisonDiagnostics.length > 0) {
    diagnostics.push(...comparisonDiagnostics);
  }

  const comparison: UserKernelComparison<Obj, Left, Right> | undefined =
    allowedKernelOperations.size > 0 || kernelOperationLookup.size > 0
      ? {
          userToKernel,
          missingInKernel,
          unusedKernelOperations,
          diagnostics: comparisonDiagnostics,
        }
      : undefined;

  const invoke = (
    operation: string,
    state: unknown,
    input: unknown,
  ): KernelOperationResult => {
    const kernelOp = userToKernel.get(operation) ?? kernelOperationLookup.get(operation);
    if (!kernelOp) {
      const note = `User operation ${operation} lacks kernel support.`;
      return {
        kind: "residual",
        state,
        note,
        diagnostics: [
          `User operation ${operation}: residual fallback (no kernel delegate).`,
        ],
      };
    }
    const result = kernelOp.execute(state, input);
    const mergedDiagnostics = [
      `User operation ${operation}: delegated to kernel operation "${kernelOp.name}".`,
      ...(result.diagnostics ?? []),
    ];
    switch (result.kind) {
      case "return":
        return { ...result, diagnostics: mergedDiagnostics };
      case "raise":
        return { ...result, diagnostics: mergedDiagnostics };
      case "signal":
        return { ...result, diagnostics: mergedDiagnostics };
      case "residual":
        return { ...result, diagnostics: mergedDiagnostics };
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  };

  return {
    spec,
    monad: {
      allowedKernelOperations,
      invoke,
    },
    diagnostics,
    comparison,
  };
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
  const user = makeUserMonad(userSpec, kernel);

  const rawRunner = buildRunnerFromInteraction(interaction, {
    metadata: [`supervised-stack:${kernelSpec.name}/${userSpec.name}`],
  });

  const stateCarrierMap = new Map<Obj, SetObj<unknown>>();
  if (kernel.monad) {
    for (const object of interaction.kernel.base.objects) {
      stateCarrierMap.set(object, kernel.monad.stateCarrier);
    }
  }
  const enrichedRunner = buildEnrichedStatefulRunner(
    rawRunner,
    interaction,
    {
      initialState: () => kernel.monad?.initialState ?? null,
      stateCarrierMap,
      metadata: [`supervised-stack:${kernelSpec.name}/${userSpec.name}:stateful`],
    },
  );

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

  const runner = attachResidualHandlers(enrichedRunner, interaction, residualSpecs, {
    sampleLimit: options.sampleLimit,
    objectFilter: options.objectFilter,
    maxLoggedUnhandled: options.maxLoggedUnhandled,
  });

  const diagnostics: string[] = [
    `Supervised stack scaffold: kernel="${kernelSpec.name}", user="${userSpec.name}".`,
  ];
  diagnostics.push(...kernel.diagnostics);
  diagnostics.push(...user.diagnostics);

  const kernelOperationNames = new Set<string>(kernel.operationLookup.keys());
  const boundarySet = user.monad?.allowedKernelOperations ?? new Set<string>();
  const unsupportedByKernel =
    user.comparison?.missingInKernel ??
    [...boundarySet].filter((name) => !kernelOperationNames.has(name));
  const unacknowledgedByUser =
    user.comparison?.unusedKernelOperations ??
    [...kernelOperationNames].filter((name) => !boundarySet.has(name));
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

  const metadataEntries = new Set(runner.metadata ?? []);
  const metadataJson = (key: string, value: unknown) =>
    `supervised-stack.${key}=${JSON.stringify(value)}`;
  metadataEntries.add(metadataJson("kernel", { name: kernelSpec.name }));
  metadataEntries.add(metadataJson("user", { name: userSpec.name }));
  metadataEntries.add(
    metadataJson(
      "kernel.operations",
      (kernel.monad?.operations ?? []).map((op) => ({ name: op.name, kind: op.kind })),
    ),
  );
  metadataEntries.add(metadataJson("user.allowed", [...boundarySet]));
  metadataEntries.add(metadataJson("comparison.unsupportedByKernel", unsupportedByKernel));
  metadataEntries.add(metadataJson("comparison.unacknowledgedByUser", unacknowledgedByUser));
  if (runner.residualHandlers) {
    metadataEntries.add(
      metadataJson("residual.summary", {
        reports: runner.residualHandlers.reports.length,
        sampleLimit: runner.residualHandlers.sampleLimit,
      }),
    );
  }
  const lambdaCoopArtifacts = buildLambdaCoopComparisonArtifacts(
    (kernel.monad?.operations ?? []).map((op) => ({
      name: op.name,
      kind: op.kind,
    })),
    boundarySet,
    { stateCarrierName: kernelSpec.name },
  );
  metadataEntries.add(
    metadataJson("lambdaCoop.kernelClauses", lambdaCoopArtifacts.kernelClauses),
  );
  metadataEntries.add(metadataJson("lambdaCoop.userAllowed", lambdaCoopArtifacts.userAllowed));
  metadataEntries.add(metadataJson("lambdaCoop.runnerLiteral", lambdaCoopArtifacts.runnerLiteral));
  const lambdaCoopMetadata = [...lambdaCoopArtifacts.diagnostics];

  const annotatedRunner: StatefulRunner<Obj, Left, Right, Value> = {
    ...runner,
    metadata: [...metadataEntries],
    diagnostics: [
      ...runner.diagnostics,
      `supervised-stack.kernel.operations=${(kernel.monad?.operations ?? [])
        .map((op) => `${op.kind}:${op.name}`)
        .join(", ") || "none"}`,
      `supervised-stack.user.allowed=${[...boundarySet].join(", ") || "none"}`,
      ...lambdaCoopMetadata,
    ],
  };

  let residualSummary: ResidualHandlerSummary<Obj, Left, Right> | undefined =
    annotatedRunner.residualHandlers;
  if (options.includeResidualAnalysis) {
    residualSummary = analyzeResidualHandlerCoverage(enrichedRunner, interaction, residualSpecs, {
      sampleLimit: options.sampleLimit,
      objectFilter: options.objectFilter,
      maxLoggedUnhandled: options.maxLoggedUnhandled,
    });
    diagnostics.push(...residualSummary.diagnostics);
  } else if (runner.residualHandlers) {
    diagnostics.push(...runner.residualHandlers.diagnostics);
  }

  const finalRunner: StatefulRunner<Obj, Left, Right, Value> =
    options.includeResidualAnalysis && residualSummary
      ? { ...annotatedRunner, residualHandlers: residualSummary }
      : annotatedRunner;

  return {
    kernel,
    user,
    runner: finalRunner,
    residualSummary,
    diagnostics: [
      ...diagnostics,
    ],
    comparison: {
      userToKernel: user.comparison?.userToKernel ?? new Map(),
      unsupportedByKernel,
      unacknowledgedByUser,
      diagnostics: user.comparison?.diagnostics ?? [],
    },
    lambdaCoopComparison: {
      ...lambdaCoopArtifacts,
      metadata: lambdaCoopMetadata,
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

export interface RunnerToStackKernelSummary {
  readonly name?: string;
  readonly operations: ReadonlyArray<{
    readonly name: string;
    readonly kind: KernelEffectKind;
  }>;
}

export interface RunnerToStackUserSummary {
  readonly name?: string;
  readonly allowedOperations: ReadonlyArray<string>;
}

export interface RunnerToStackComparisonSummary {
  readonly unsupportedByKernel: ReadonlyArray<string>;
  readonly unacknowledgedByUser: ReadonlyArray<string>;
}

export interface RunnerToStackLambdaCoopSummary {
  readonly kernelClauses: ReadonlyArray<{ readonly name: string; readonly kind: KernelEffectKind }>;
  readonly userAllowed: ReadonlyArray<string>;
  readonly runnerLiteral?: LambdaCoopRunnerLiteral;
  readonly aligned?: boolean;
  readonly issues?: ReadonlyArray<string>;
}

export interface RunnerToStackResult<Obj, Left, Right> {
  readonly kernel?: RunnerToStackKernelSummary;
  readonly user?: RunnerToStackUserSummary;
  readonly comparison: RunnerToStackComparisonSummary;
  readonly residualSummary?: ResidualHandlerSummary<Obj, Left, Right>;
  readonly lambdaCoop?: RunnerToStackLambdaCoopSummary;
  readonly diagnostics: ReadonlyArray<string>;
}

export const runnerToStack = <
  Obj,
  Arr,
  Left,
  Right,
  Value
>(
  runner: StatefulRunner<Obj, Left, Right, Value>,
  _interaction: MonadComonadInteractionLaw<Obj, Arr, Left, Right, Value, Obj, Arr>,
): RunnerToStackResult<Obj, Left, Right> => {
  const diagnostics: string[] = [
    "runnerToStack: attempting supervised stack reconstruction.",
    `runner.diagnostics.size=${runner.diagnostics.length}`,
    `runner.metadata.size=${runner.metadata?.length ?? 0}`,
  ];

  const parseMetadata = <T>(key: string): T | undefined => {
    const entry = runner.metadata?.find((value) => value.startsWith(`supervised-stack.${key}=`));
    if (!entry) return undefined;
    const raw = entry.slice(entry.indexOf("=") + 1);
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      diagnostics.push(
        `runnerToStack: failed to parse metadata for key "${key}" → ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  };

  const kernelMeta = parseMetadata<{ name?: string }>("kernel");
  const kernelOperations =
    parseMetadata<ReadonlyArray<{ name: string; kind: KernelEffectKind }>>(
      "kernel.operations",
    ) ?? [];
  const userMeta = parseMetadata<{ name?: string }>("user");
  const userAllowed = parseMetadata<ReadonlyArray<string>>("user.allowed") ?? [];
  const comparisonUnsupported =
    parseMetadata<ReadonlyArray<string>>("comparison.unsupportedByKernel") ?? [];
  const comparisonUnacknowledged =
    parseMetadata<ReadonlyArray<string>>("comparison.unacknowledgedByUser") ?? [];
  const lambdaCoopKernelClauses =
    parseMetadata<ReadonlyArray<{ name: string; kind: KernelEffectKind }>>(
      "lambdaCoop.kernelClauses",
    ) ?? [];
  const lambdaCoopUserAllowed =
    parseMetadata<ReadonlyArray<string>>("lambdaCoop.userAllowed") ?? [];
  const lambdaCoopRunnerLiteral = parseMetadata<LambdaCoopRunnerLiteral>(
    "lambdaCoop.runnerLiteral",
  );

  const residualSummaryMeta = parseMetadata<{ reports?: number; sampleLimit?: number }>(
    "residual.summary",
  );
  if (residualSummaryMeta) {
    diagnostics.push(
      `runnerToStack: residual metadata reports=${residualSummaryMeta.reports ?? "?"} sampleLimit=${residualSummaryMeta.sampleLimit ?? "?"}`,
    );
  }

  if (!kernelMeta?.name) diagnostics.push("runnerToStack: kernel name metadata missing.");
  if (!userMeta?.name) diagnostics.push("runnerToStack: user name metadata missing.");
  diagnostics.push(`runnerToStack: kernel operations detected=${kernelOperations.length}.`);
  diagnostics.push(`runnerToStack: user allowed operations=${userAllowed.length}.`);

  if (runner.stateCarriers && runner.stateCarriers.size > 0) {
    diagnostics.push(`runnerToStack: state carriers=${runner.stateCarriers.size}.`);
  }
  if (runner.stateThetas && runner.stateThetas.size > 0) {
    diagnostics.push(`runnerToStack: stateful θ components=${runner.stateThetas.size}.`);
  }
  diagnostics.push(
    `runnerToStack: residual reports=${runner.residualHandlers?.reports.length ?? 0}.`,
  );
  if (lambdaCoopRunnerLiteral) {
    diagnostics.push(
      `runnerToStack: λ₍coop₎ runner clauses=${lambdaCoopRunnerLiteral.clauses.length} state=${lambdaCoopRunnerLiteral.stateCarrier}`,
    );
  }

  return {
    kernel: {
      name: kernelMeta?.name,
      operations: kernelOperations,
    },
    user: {
      name: userMeta?.name,
      allowedOperations: userAllowed,
    },
    comparison: {
      unsupportedByKernel: comparisonUnsupported,
      unacknowledgedByUser: comparisonUnacknowledged,
    },
    residualSummary: runner.residualHandlers as ResidualHandlerSummary<Obj, Left, Right> | undefined,
    lambdaCoop: lambdaCoopKernelClauses.length > 0 || lambdaCoopUserAllowed.length > 0
      ? {
          kernelClauses: lambdaCoopKernelClauses,
          userAllowed: lambdaCoopUserAllowed,
          runnerLiteral: lambdaCoopRunnerLiteral,
          aligned: stack.lambdaCoopComparison?.aligned,
          issues: stack.lambdaCoopComparison?.issues,
        }
      : undefined,
    diagnostics,
  };
};
