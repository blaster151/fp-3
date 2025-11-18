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
  canonicalValueForType,
  type LambdaCoopComparisonArtifacts,
  type LambdaCoopKernelOperationDescriptor,
  type LambdaCoopClauseBundle,
  type LambdaCoopClauseResidualFallback,
  type LambdaCoopResidualCoverageDigest,
  type LambdaCoopBoundaryWitnesses,
} from "./supervised-stack-lambda-coop";
import type {
  LambdaCoopKernelComputation,
  LambdaCoopRunnerClause,
  LambdaCoopRunnerLiteral,
  LambdaCoopValue,
  LambdaCoopValueType,
} from "./lambda-coop";

export type KernelEffectKind = "state" | "exception" | "signal" | "external";

export interface KernelOperationSpec<Obj, Left, Right> {
  readonly name: string;
  readonly kind: KernelEffectKind;
  readonly description?: string;
  readonly residualHandler?: ResidualHandlerSpec<Obj, Left, Right>;
  readonly parameterName?: string;
  readonly parameterType?: LambdaCoopValueType;
  readonly resultValueType?: LambdaCoopValueType;
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

const synthesiseUserBoundaryDescription = (
  explicitDescription: string | undefined,
  allowedOperations: ReadonlyArray<string>,
  kernelOperations: ReadonlyArray<string>,
  missingInKernel: ReadonlyArray<string>,
  kernelOnlyOperations: ReadonlyArray<string>,
): string => {
  if (explicitDescription) return explicitDescription;
  if (allowedOperations.length === 0) {
    if (kernelOperations.length === 0) {
      return "No kernel operations declared; boundary defaults to empty interface.";
    }
    return `Defaults to kernel boundary (${kernelOperations.length} operation(s): ${kernelOperations.join(", ")}).`;
  }

  const segments = [
    `User boundary expects ${allowedOperations.length} operation(s): ${allowedOperations.join(", ")}`,
  ];
  if (missingInKernel.length > 0) {
    segments.push(`missing in kernel: ${missingInKernel.join(", ")}`);
  } else {
    segments.push("all expected operations present in kernel");
  }
  if (kernelOnlyOperations.length > 0) {
    segments.push(`kernel-only operations: ${kernelOnlyOperations.join(", ")}`);
  }
  return segments.join(" — ");
};

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
  const kernelOperationOrder =
    kernel?.monad?.operations?.map((op) => op.name) ??
    [...kernelOperationLookup.keys()];
  const allowedOperationList = [...allowedKernelOperations];

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
  const unusedKernelOperations: string[] = [];
  const recordKernelOnly = (name: string) => {
    if (!allowedKernelOperations.has(name) && !unusedKernelOperations.includes(name)) {
      unusedKernelOperations.push(name);
    }
  };
  for (const name of kernelOperationOrder) recordKernelOnly(name);
  for (const name of kernelOperationLookup.keys()) recordKernelOnly(name);

  diagnostics.push(
    `Boundary: ${synthesiseUserBoundaryDescription(
      spec.boundaryDescription,
      allowedOperationList,
      kernelOperationOrder,
      missingInKernel,
      unusedKernelOperations,
    )}`,
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
    ...(comparison ? { comparison } : {}),
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

  const kernelObjects = interaction.law.kernel.base.objects;

  const stateCarrierMap = new Map<Obj, SetObj<unknown>>();
  if (kernel.monad) {
    for (const object of kernelObjects) {
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
      for (const object of kernelObjects) {
        if (!residualSpecs.has(object)) {
          residualSpecs.set(object, op.residualHandler);
        }
      }
    }
    if (op.defaultResidual) {
      for (const object of kernelObjects) {
        if (!residualSpecs.has(object)) {
          residualSpecs.set(object, {
            description: `Default residual for ${op.name}`,
            predicate: () => false,
          });
        }
      }
    }
  }

  const residualOptions: ResidualHandlerAnalysisOptions<Obj> = {
    ...(options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {}),
    ...(options.objectFilter ? { objectFilter: options.objectFilter } : {}),
    ...(options.maxLoggedUnhandled !== undefined
      ? { maxLoggedUnhandled: options.maxLoggedUnhandled }
      : {}),
  };

  const runner = attachResidualHandlers(enrichedRunner, interaction, residualSpecs, residualOptions);

  const diagnostics: string[] = [
    `Supervised stack scaffold: kernel="${kernelSpec.name}", user="${userSpec.name}".`,
  ];
  diagnostics.push(...kernel.diagnostics);
  diagnostics.push(...user.diagnostics);

  const kernelOperationNames = new Set<string>(kernel.operationLookup.keys());
  const boundarySet = user.monad?.allowedKernelOperations ?? new Set<string>();
  const expectedOperations =
    userSpec.allowedKernelOperations && userSpec.allowedKernelOperations.length > 0
      ? [...userSpec.allowedKernelOperations]
      : (kernel.monad?.operations ?? []).map((op) => op.name);
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
  const kernelOperationDescriptors = (kernel.monad?.operations ?? []).map(
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
  metadataEntries.add(
    metadataJson(
      "kernel.operations",
      kernelOperationDescriptors.map((op) => ({ name: op.name, kind: op.kind })),
    ),
  );
  metadataEntries.add(metadataJson("user.allowed", [...boundarySet]));
  metadataEntries.add(metadataJson("comparison.unsupportedByKernel", unsupportedByKernel));
  metadataEntries.add(metadataJson("comparison.unacknowledgedByUser", unacknowledgedByUser));

  const residualSummaryDigest: (LambdaCoopResidualCoverageDigest & {
    readonly diagnostics: ReadonlyArray<string>;
  }) | undefined = runner.residualHandlers
    ? (() => {
        let handled = 0;
        let unhandled = 0;
        for (const report of runner.residualHandlers?.reports ?? []) {
          handled += report.handledSamples;
          unhandled += report.unhandledSamples;
        }
        return {
          handled,
          unhandled,
          sampleLimit: runner.residualHandlers.sampleLimit,
          diagnostics: [...runner.residualHandlers.diagnostics],
        };
      })()
    : undefined;

  if (runner.residualHandlers) {
    metadataEntries.add(
      metadataJson("residual.summary", {
        reports: runner.residualHandlers.reports.length,
        sampleLimit: runner.residualHandlers.sampleLimit,
        handled: residualSummaryDigest?.handled ?? 0,
        unhandled: residualSummaryDigest?.unhandled ?? 0,
      }),
    );
  }

  const lambdaCoopArtifacts = buildLambdaCoopComparisonArtifacts(
    kernelOperationDescriptors,
    boundarySet,
    {
      stateCarrierName: kernelSpec.name,
      ...(expectedOperations.length > 0 ? { expectedOperations } : {}),
      ...(residualSummaryDigest ? { residualSummary: residualSummaryDigest } : {}),
    },
  );
  metadataEntries.add(
    metadataJson("lambdaCoop.kernelClauses", lambdaCoopArtifacts.kernelClauses),
  );
  metadataEntries.add(metadataJson("lambdaCoop.userAllowed", lambdaCoopArtifacts.userAllowed));
  metadataEntries.add(metadataJson("lambdaCoop.runnerLiteral", lambdaCoopArtifacts.runnerLiteral));
  metadataEntries.add(metadataJson("lambdaCoop.stateCarrier", lambdaCoopArtifacts.stateCarrier));
  metadataEntries.add(metadataJson("lambdaCoop.clauseBundles", lambdaCoopArtifacts.clauseBundles));
  metadataEntries.add(metadataJson("lambdaCoop.aligned", lambdaCoopArtifacts.aligned));
  metadataEntries.add(metadataJson("lambdaCoop.issues", lambdaCoopArtifacts.issues));
  metadataEntries.add(
    metadataJson("lambdaCoop.boundary", lambdaCoopArtifacts.boundaryWitnesses),
  );
  if (lambdaCoopArtifacts.residualCoverage) {
    metadataEntries.add(
      metadataJson("lambdaCoop.residualCoverage", lambdaCoopArtifacts.residualCoverage),
    );
  }
  const lambdaCoopMetadata = [
    ...lambdaCoopArtifacts.metadata,
    ...lambdaCoopArtifacts.diagnostics,
    ...lambdaCoopArtifacts.clauseBundles.flatMap((bundle) => bundle.diagnostics),
    `λ₍coop₎ boundary supported=${lambdaCoopArtifacts.boundaryWitnesses.supported.join(",") || "∅"} unsupported=${lambdaCoopArtifacts.boundaryWitnesses.unsupported.join(",") || "∅"} unacknowledged=${lambdaCoopArtifacts.boundaryWitnesses.unacknowledged.join(",") || "∅"}`,
  ];

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
    const analysisOptions: ResidualHandlerAnalysisOptions<Obj> = {
      ...(options.sampleLimit !== undefined ? { sampleLimit: options.sampleLimit } : {}),
      ...(options.objectFilter ? { objectFilter: options.objectFilter } : {}),
      ...(options.maxLoggedUnhandled !== undefined
        ? { maxLoggedUnhandled: options.maxLoggedUnhandled }
        : {}),
    };
    residualSummary = analyzeResidualHandlerCoverage(
      enrichedRunner,
      interaction,
      residualSpecs,
      analysisOptions,
    );
    diagnostics.push(...residualSummary.diagnostics);
  } else if (annotatedRunner.residualHandlers) {
    diagnostics.push(...annotatedRunner.residualHandlers.diagnostics);
  }

  const finalRunner: StatefulRunner<Obj, Left, Right, Value> =
    options.includeResidualAnalysis && residualSummary
      ? { ...annotatedRunner, residualHandlers: residualSummary }
      : annotatedRunner;

  const result: SupervisedStack<Obj, Arr, Left, Right, Value> = {
    kernel,
    user,
    runner: finalRunner,
    diagnostics: [
      ...diagnostics,
    ],
    comparison: {
      userToKernel: user.comparison?.userToKernel ?? new Map(),
      unsupportedByKernel,
      unacknowledgedByUser,
      diagnostics: user.comparison?.diagnostics ?? [],
    },
    ...(residualSummary ? { residualSummary } : {}),
    lambdaCoopComparison: {
      ...lambdaCoopArtifacts,
      metadata: lambdaCoopMetadata,
    },
  };

  return result;
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

export interface RunnerToStackKernelOperationSummary {
  readonly name: string;
  readonly kind: KernelEffectKind;
  readonly description?: string;
  readonly parameterName?: string;
  readonly parameterType?: LambdaCoopValueType;
  readonly argumentWitness?: LambdaCoopValue;
  readonly resultKind?: "return" | "raise" | "signal";
  readonly resultValueType?: LambdaCoopValueType;
  readonly resultWitness?: LambdaCoopValue;
  readonly residual?: LambdaCoopClauseResidualFallback;
  readonly diagnostics: ReadonlyArray<string>;
}

const summariseKernelOperationSpec = <Obj, Left, Right>(
  operation: KernelOperationSpec<Obj, Left, Right>,
): RunnerToStackKernelOperationSummary => {
  const residualNotes: string[] = [];
  if (operation.defaultResidual) {
    residualNotes.push("runnerToStack: metadata marks operation as default residual fallback.");
  }
  if (operation.residualHandler) {
    residualNotes.push(
      operation.residualHandler.description
        ? `runnerToStack: metadata references residual handler "${operation.residualHandler.description}".`
        : "runnerToStack: metadata references a residual handler without description.",
    );
  }
  const residual =
    residualNotes.length > 0
      ? ({
          defaulted: Boolean(operation.defaultResidual),
          ...(operation.residualHandler?.description
            ? { handlerDescription: operation.residualHandler.description }
            : {}),
          notes: residualNotes,
        } satisfies LambdaCoopClauseResidualFallback)
      : undefined;

  const resultKind: "return" | "raise" | "signal" =
    operation.kind === "exception"
      ? "raise"
      : operation.kind === "signal"
      ? "signal"
      : "return";

  return {
    name: operation.name,
    kind: operation.kind,
    ...(operation.description ? { description: operation.description } : {}),
    ...(operation.parameterName ? { parameterName: operation.parameterName } : {}),
    ...(operation.parameterType ? { parameterType: operation.parameterType } : {}),
    ...(resultKind ? { resultKind } : {}),
    ...(operation.resultValueType ? { resultValueType: operation.resultValueType } : {}),
    ...(residual ? { residual } : {}),
    diagnostics: [],
  } satisfies RunnerToStackKernelOperationSummary;
};

export interface RunnerToStackKernelSummary {
  readonly name?: string;
  readonly stateCarrier?: string;
  readonly operations: ReadonlyArray<RunnerToStackKernelOperationSummary>;
}

export interface RunnerToStackUserSummary {
  readonly name?: string;
  readonly allowedOperations: ReadonlyArray<string>;
}

export interface RunnerToStackComparisonSummary {
  readonly unsupportedByKernel: ReadonlyArray<string>;
  readonly unacknowledgedByUser: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

export interface RunnerToStackLambdaCoopSummary {
  readonly kernelClauses: ReadonlyArray<{ readonly name: string; readonly kind: KernelEffectKind }>;
  readonly userAllowed: ReadonlyArray<string>;
  readonly runnerLiteral?: LambdaCoopRunnerLiteral;
  readonly aligned?: boolean;
  readonly issues?: ReadonlyArray<string>;
  readonly clauseBundles?: ReadonlyArray<LambdaCoopClauseBundle>;
  readonly stateCarrier?: string;
  readonly residualCoverage?: LambdaCoopResidualCoverageDigest;
  readonly boundaryWitnesses?: LambdaCoopBoundaryWitnesses;
}

export interface RunnerToStackResult<Obj, Left, Right> {
  readonly kernel?: RunnerToStackKernelSummary;
  readonly user?: RunnerToStackUserSummary;
  readonly comparison: RunnerToStackComparisonSummary;
  readonly residualSummary?: ResidualHandlerSummary<Obj, Left, Right>;
  readonly lambdaCoop?: RunnerToStackLambdaCoopSummary;
  readonly diagnostics: ReadonlyArray<string>;
}

const LAMBDA_COOP_UNIT_TYPE: LambdaCoopValueType = { kind: "unit" };

const inferLambdaCoopValueType = (
  value: LambdaCoopValue,
): LambdaCoopValueType | undefined => {
  switch (value.kind) {
    case "unitValue":
      return LAMBDA_COOP_UNIT_TYPE;
    case "constant":
      return { kind: "base", name: value.label };
    default:
      return undefined;
  }
};

const inferClauseResultKind = (
  body: LambdaCoopKernelComputation,
): "return" | "raise" | "signal" | undefined => {
  switch (body.kind) {
    case "kernelReturn":
      return "return";
    case "kernelRaise":
      return "raise";
    case "kernelSignal":
      return "signal";
    default:
      return undefined;
  }
};

const inferClauseResultValueType = (
  body: LambdaCoopKernelComputation,
): LambdaCoopValueType | undefined => {
  if (body.kind !== "kernelReturn") return undefined;
  return inferLambdaCoopValueType(body.value);
};

const inferClauseEffectKind = (
  fallback: KernelEffectKind | undefined,
  body: LambdaCoopKernelComputation,
): KernelEffectKind => {
  if (fallback) return fallback;
  switch (body.kind) {
    case "kernelRaise":
      return "exception";
    case "kernelSignal":
      return "signal";
    default:
      return "state";
  }
};

const augmentKernelOperationsFromLiteral = (
  operations: ReadonlyArray<RunnerToStackKernelOperationSummary>,
  literal: LambdaCoopRunnerLiteral | undefined,
  clauseKinds: ReadonlyMap<string, KernelEffectKind>,
  clauseBundles: ReadonlyArray<LambdaCoopClauseBundle>,
): {
  readonly operations: ReadonlyArray<RunnerToStackKernelOperationSummary>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
} => {
  if (!literal && clauseBundles.length === 0) {
    return { operations, diagnostics: [], notes: [] };
  }

  const bundleMap = new Map(clauseBundles.map((bundle) => [bundle.operation, bundle]));
  const clauseMap = new Map<string, LambdaCoopRunnerClause>();
  for (const bundle of clauseBundles) {
    clauseMap.set(bundle.operation, bundle.clause);
  }
  if (literal) {
    for (const clause of literal.clauses) {
      if (!clauseMap.has(clause.operation)) clauseMap.set(clause.operation, clause);
    }
  }
  let updateCount = 0;
  const augmented = operations.map((operation) => {
    const bundle = bundleMap.get(operation.name);
    const clause = clauseMap.get(operation.name) ?? bundle?.clause;
    if (!clause && !bundle) return operation;
    const additions: string[] = [];
    let description = operation.description;
    if (!description && bundle?.description) {
      description = bundle.description;
      additions.push(
        `runnerToStack: description recovered from λ₍coop₎ clause bundle for ${operation.name}.`,
      );
    }
    let argumentWitness = operation.argumentWitness;
    if (!argumentWitness && bundle?.argumentWitness) {
      argumentWitness = bundle.argumentWitness;
      additions.push(
        `runnerToStack: argument witness recovered from λ₍coop₎ clause bundle for ${operation.name}.`,
      );
    }
    let residual = operation.residual;
    if (bundle?.residual) {
      const combinedResidualNotes = Array.from(
        new Set([...bundle.residual.notes, ...(residual?.notes ?? [])]),
      );
      residual = {
        ...bundle.residual,
        notes: combinedResidualNotes,
      } satisfies LambdaCoopClauseResidualFallback;
      if (!operation.residual) {
        additions.push(
          `runnerToStack: residual metadata recovered from λ₍coop₎ clause bundle for ${operation.name}.`,
        );
      }
    }
    let resultWitness = operation.resultWitness;
    if (!resultWitness && bundle?.resultWitness) {
      resultWitness = bundle.resultWitness;
      additions.push(
        `runnerToStack: result witness recovered from λ₍coop₎ clause bundle for ${operation.name}.`,
      );
    }

    if (!clause) {
      const clauseDiagnostics = bundle?.diagnostics ?? [];
      const changed = additions.length > 0;
      if (!changed && clauseDiagnostics.length === 0) return operation;
      if (changed) updateCount += 1;
      const mergedDiagnostics = Array.from(
        new Set([...operation.diagnostics, ...clauseDiagnostics, ...additions]),
      );
      return {
        ...operation,
        ...(description ? { description } : {}),
        ...(argumentWitness ? { argumentWitness } : {}),
        ...(residual ? { residual } : {}),
        ...(resultWitness ? { resultWitness } : {}),
        diagnostics: mergedDiagnostics,
      } satisfies RunnerToStackKernelOperationSummary;
    }

    let parameterName = operation.parameterName;
    if (!parameterName && clause.parameter) {
      parameterName = clause.parameter;
      additions.push(
        `runnerToStack: parameter name recovered from λ₍coop₎ literal for ${operation.name}.`,
      );
    }
    let parameterType = operation.parameterType;
    if (!parameterType) {
      parameterType = clause.parameterType;
      additions.push(
        `runnerToStack: parameter type recovered from λ₍coop₎ literal for ${operation.name}.`,
      );
    }
    let resultKind = operation.resultKind;
    if (!resultKind) {
      const inferredKind = inferClauseResultKind(clause.body);
      if (inferredKind) {
        resultKind = inferredKind;
        additions.push(
          `runnerToStack: result kind inferred from λ₍coop₎ literal for ${operation.name}.`,
        );
      }
    }
    let resultValueType = operation.resultValueType;
    if (!resultValueType) {
      const inferredType = inferClauseResultValueType(clause.body);
      if (inferredType) {
        resultValueType = inferredType;
        additions.push(
          `runnerToStack: result type inferred from λ₍coop₎ literal for ${operation.name}.`,
        );
      }
    }
    if (!argumentWitness) {
      const inferredArgument = canonicalValueForType(clause.parameterType);
      if (inferredArgument) {
        argumentWitness = inferredArgument;
        additions.push(
          `runnerToStack: argument witness inferred from λ₍coop₎ literal for ${operation.name}.`,
        );
      }
    }
    if (!resultWitness && clause.body.kind === "kernelReturn") {
      resultWitness = clause.body.value;
      additions.push(
        `runnerToStack: result witness recovered from λ₍coop₎ literal for ${operation.name}.`,
      );
    }
    const clauseDiagnostics = bundle?.diagnostics ?? [];
    const changed = additions.length > 0;
    if (!changed && clauseDiagnostics.length === 0) return operation;
    if (changed) updateCount += 1;
    const mergedDiagnostics = Array.from(
      new Set([...operation.diagnostics, ...clauseDiagnostics, ...additions]),
    );
    return {
      ...operation,
      ...(description ? { description } : {}),
      ...(parameterName ? { parameterName } : {}),
      ...(parameterType ? { parameterType } : {}),
      ...(argumentWitness ? { argumentWitness } : {}),
      ...(resultKind ? { resultKind } : {}),
      ...(resultValueType ? { resultValueType } : {}),
      ...(resultWitness ? { resultWitness } : {}),
      ...(residual ? { residual } : {}),
      diagnostics: mergedDiagnostics,
    } satisfies RunnerToStackKernelOperationSummary;
  });

  const existingNames = new Set(operations.map((operation) => operation.name));
  const added: RunnerToStackKernelOperationSummary[] = [];
  const registerClause = (
    name: string,
    clause: LambdaCoopRunnerClause | undefined,
    bundle: LambdaCoopClauseBundle | undefined,
    source: "bundle" | "literal",
  ): void => {
    if (!clause || existingNames.has(name)) return;
    const effectKind =
      clauseKinds.get(name) ?? bundle?.kind ?? inferClauseEffectKind(undefined, clause.body);
    const inferredKind = inferClauseResultKind(clause.body);
    const inferredType = inferClauseResultValueType(clause.body);
    const residual = bundle?.residual;
    const description = bundle?.description;
    const argumentWitness = bundle?.argumentWitness ?? canonicalValueForType(clause.parameterType);
    const resultWitness =
      bundle?.resultWitness ?? (clause.body.kind === "kernelReturn" ? clause.body.value : undefined);
    const diagnostics = [
      `runnerToStack: synthesized kernel operation ${name} from λ₍coop₎ ${source} (metadata missing).`,
      ...(bundle?.diagnostics ?? []),
    ];
    added.push({
      name,
      kind: effectKind,
      parameterName: clause.parameter,
      parameterType: clause.parameterType,
      ...(description ? { description } : {}),
      ...(argumentWitness ? { argumentWitness } : {}),
      ...(inferredKind ? { resultKind: inferredKind } : {}),
      ...(inferredType ? { resultValueType: inferredType } : {}),
      ...(resultWitness ? { resultWitness } : {}),
      ...(residual ? { residual } : {}),
      diagnostics,
    });
  };

  for (const [name, bundle] of bundleMap) {
    registerClause(name, bundle.clause, bundle, "bundle");
  }

  if (literal) {
    for (const clause of literal.clauses) {
      if (bundleMap.has(clause.operation)) continue;
      registerClause(clause.operation, clause, undefined, "literal");
    }
  }

  const summaryDiagnostics: string[] = [];
  const summaryNotes: string[] = [];
  if (updateCount > 0 || added.length > 0) {
    summaryDiagnostics.push(
      `runnerToStack: λ₍coop₎ literal augmentation applied (updates=${updateCount} additions=${added.length}).`,
    );
  }
  if (updateCount > 0) {
    summaryNotes.push(
      `λ₍coop₎ reconstruction: supplemented ${updateCount} operations with literal parameter/result details.`,
    );
  }
  if (added.length > 0) {
    summaryNotes.push(
      `λ₍coop₎ reconstruction: introduced ${added.length} operations missing from metadata using literal clauses.`,
    );
  }

  return {
    operations: [...augmented, ...added],
    diagnostics: summaryDiagnostics,
    notes: summaryNotes,
  };
};

const valueTypesEqual = (
  left: LambdaCoopValueType | undefined,
  right: LambdaCoopValueType | undefined,
): boolean => {
  if (left === right) return true;
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
};

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
  let lambdaCoopKernelClauses =
    parseMetadata<ReadonlyArray<{ name: string; kind: KernelEffectKind }>>(
      "lambdaCoop.kernelClauses",
    ) ?? [];
  const lambdaCoopUserAllowed =
    parseMetadata<ReadonlyArray<string>>("lambdaCoop.userAllowed") ?? [];
  let lambdaCoopRunnerLiteral = parseMetadata<LambdaCoopRunnerLiteral>(
    "lambdaCoop.runnerLiteral",
  );
  const lambdaCoopClauseBundles =
    parseMetadata<ReadonlyArray<LambdaCoopClauseBundle>>("lambdaCoop.clauseBundles") ?? [];
  let lambdaCoopStateCarrier = parseMetadata<string>("lambdaCoop.stateCarrier");
  const lambdaCoopResidualCoverage = parseMetadata<LambdaCoopResidualCoverageDigest>(
    "lambdaCoop.residualCoverage",
  );
  const lambdaCoopBoundary = parseMetadata<LambdaCoopBoundaryWitnesses>("lambdaCoop.boundary");
  const lambdaCoopAligned = parseMetadata<boolean>("lambdaCoop.aligned");
  const lambdaCoopIssues =
    parseMetadata<ReadonlyArray<string>>("lambdaCoop.issues") ?? [];

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
  if (lambdaCoopClauseBundles.length > 0) {
    diagnostics.push(
      `runnerToStack: λ₍coop₎ clause bundles=${lambdaCoopClauseBundles.length}.`,
    );
  }
  if (lambdaCoopStateCarrier) {
    diagnostics.push(`runnerToStack: λ₍coop₎ state carrier=${lambdaCoopStateCarrier}.`);
  }
  if (lambdaCoopResidualCoverage) {
    diagnostics.push(
      `runnerToStack: residual coverage handled=${lambdaCoopResidualCoverage.handled} unhandled=${lambdaCoopResidualCoverage.unhandled} sampleLimit=${lambdaCoopResidualCoverage.sampleLimit}.`,
    );
  }
  if (lambdaCoopBoundary) {
    diagnostics.push(
      `runnerToStack: λ₍coop₎ boundary supported=${lambdaCoopBoundary.supported.length} unsupported=${lambdaCoopBoundary.unsupported.length} unacknowledged=${lambdaCoopBoundary.unacknowledged.length}.`,
    );
  }

  const comparisonNotes: string[] = [];
  if (lambdaCoopClauseBundles.length > 0) {
    comparisonNotes.push(
      `λ₍coop₎ reconstruction: recovered ${lambdaCoopClauseBundles.length} clause bundles from embedded literal.`,
    );
  }
  if (lambdaCoopStateCarrier) {
    comparisonNotes.push(`λ₍coop₎ reconstruction: state carrier ${lambdaCoopStateCarrier}.`);
  }

  const clauseKindMap = new Map(lambdaCoopKernelClauses.map((clause) => [clause.name, clause.kind]));

  if (!lambdaCoopStateCarrier && lambdaCoopClauseBundles.length > 0) {
    const inferredCarrier = lambdaCoopClauseBundles[0]?.stateCarrier;
    if (inferredCarrier) {
      lambdaCoopStateCarrier = inferredCarrier;
      diagnostics.push(
        `runnerToStack: λ₍coop₎ state carrier derived from clause bundles (${inferredCarrier}).`,
      );
      comparisonNotes.push(`λ₍coop₎ reconstruction: inferred state carrier ${inferredCarrier} from clause bundles.`);
    }
  }

  if (lambdaCoopKernelClauses.length === 0 && lambdaCoopClauseBundles.length > 0) {
    lambdaCoopKernelClauses = lambdaCoopClauseBundles.map((bundle) => ({
      name: bundle.operation,
      kind: bundle.kind,
    }));
    diagnostics.push(
      `runnerToStack: λ₍coop₎ kernel clauses synthesised from clause bundles (count=${lambdaCoopKernelClauses.length}).`,
    );
  }

  if (!lambdaCoopRunnerLiteral && lambdaCoopClauseBundles.length > 0) {
    const literalStateCarrier =
      lambdaCoopStateCarrier ?? lambdaCoopClauseBundles[0]?.stateCarrier ?? "state";
    if (!lambdaCoopStateCarrier) {
      lambdaCoopStateCarrier = literalStateCarrier;
      diagnostics.push(
        `runnerToStack: λ₍coop₎ state carrier defaulted to ${literalStateCarrier} for synthesised literal.`,
      );
    }
    lambdaCoopRunnerLiteral = {
      kind: "runnerLiteral",
      stateCarrier: literalStateCarrier,
      clauses: lambdaCoopClauseBundles.map((bundle) => bundle.clause),
    };
    diagnostics.push(
      `runnerToStack: λ₍coop₎ runner literal synthesised from clause bundles (clauses=${lambdaCoopRunnerLiteral.clauses.length}).`,
    );
  }

  let reconstructedKernelOperations: RunnerToStackKernelOperationSummary[] =
    lambdaCoopClauseBundles.length > 0
      ? lambdaCoopClauseBundles.map((bundle) => ({
          name: bundle.operation,
          kind: bundle.kind,
          ...(bundle.description ? { description: bundle.description } : {}),
          parameterName: bundle.clause.parameter,
          parameterType: bundle.argumentType,
          ...(bundle.argumentWitness ? { argumentWitness: bundle.argumentWitness } : {}),
          resultKind: bundle.resultKind,
          ...(bundle.resultValueType ? { resultValueType: bundle.resultValueType } : {}),
          ...(bundle.resultWitness ? { resultWitness: bundle.resultWitness } : {}),
          ...(bundle.residual ? { residual: bundle.residual } : {}),
          diagnostics: bundle.diagnostics,
        }))
      : kernelOperations.map((operation) => summariseKernelOperationSpec(operation));

  if (lambdaCoopClauseBundles.length > 0 && kernelOperations.length > 0) {
    const bundleNames = new Set(lambdaCoopClauseBundles.map((bundle) => bundle.operation));
    for (const operation of kernelOperations) {
      if (bundleNames.has(operation.name)) continue;
      const metadataSummary = summariseKernelOperationSpec(operation);
      const metadataDiagnostics = [
        ...metadataSummary.diagnostics,
        `runnerToStack: kernel metadata preserved operation ${operation.name} missing λ₍coop₎ clause bundle.`,
      ];
      diagnostics.push(
        `runnerToStack: kernel metadata operation ${operation.name} lacks λ₍coop₎ clause bundle; preserving metadata summary.`,
      );
      reconstructedKernelOperations = [
        ...reconstructedKernelOperations,
        { ...metadataSummary, diagnostics: metadataDiagnostics },
      ];
    }
  }

  if (lambdaCoopClauseBundles.length === 0 && lambdaCoopRunnerLiteral?.clauses.length) {
    diagnostics.push(
      "runnerToStack: λ₍coop₎ clause bundles unavailable; augmenting reconstruction with runner literal clauses.",
    );
  }

  const augmentation = augmentKernelOperationsFromLiteral(
    reconstructedKernelOperations,
    lambdaCoopRunnerLiteral,
    clauseKindMap,
    lambdaCoopClauseBundles,
  );
  reconstructedKernelOperations = [...augmentation.operations];
  if (augmentation.diagnostics.length > 0) diagnostics.push(...augmentation.diagnostics);
  if (augmentation.notes.length > 0) comparisonNotes.push(...augmentation.notes);

  if (lambdaCoopClauseBundles.length > 0 && kernelOperations.length > 0) {
    const literalNames = new Set(lambdaCoopClauseBundles.map((bundle) => bundle.operation));
    const metadataNames = new Set(kernelOperations.map((operation) => operation.name));
    for (const name of literalNames) {
      if (!metadataNames.has(name)) {
        comparisonNotes.push(`λ₍coop₎ reconstruction: operation ${name} missing from kernel metadata.`);
      }
    }
    for (const name of metadataNames) {
      if (!literalNames.has(name)) {
        comparisonNotes.push(`λ₍coop₎ reconstruction: metadata references operation ${name} absent from literal.`);
      }
    }
  }

  if (reconstructedKernelOperations.length > 0) {
    diagnostics.push(
      `runnerToStack: reconstructed λ₍coop₎ kernel operations=${reconstructedKernelOperations.length}.`,
    );
  }

  const kernelSummary: RunnerToStackKernelSummary = {
    ...(kernelMeta?.name ? { name: kernelMeta.name } : {}),
    ...(lambdaCoopStateCarrier ? { stateCarrier: lambdaCoopStateCarrier } : {}),
    operations: reconstructedKernelOperations,
  };
  const userSummary: RunnerToStackUserSummary = {
    ...(userMeta?.name ? { name: userMeta.name } : {}),
    allowedOperations:
      lambdaCoopUserAllowed.length > 0 ? lambdaCoopUserAllowed : userAllowed,
  };

  return {
    kernel: kernelSummary,
    user: userSummary,
    comparison: {
      unsupportedByKernel: comparisonUnsupported,
      unacknowledgedByUser: comparisonUnacknowledged,
      notes: comparisonNotes,
    },
    ...(runner.residualHandlers
      ? { residualSummary: runner.residualHandlers as ResidualHandlerSummary<Obj, Left, Right> }
      : {}),
    ...(lambdaCoopKernelClauses.length > 0 ||
    lambdaCoopUserAllowed.length > 0 ||
    lambdaCoopRunnerLiteral
      ? {
          lambdaCoop: {
            kernelClauses: lambdaCoopKernelClauses,
            userAllowed: lambdaCoopUserAllowed,
            ...(lambdaCoopRunnerLiteral ? { runnerLiteral: lambdaCoopRunnerLiteral } : {}),
            ...(lambdaCoopClauseBundles.length > 0
              ? { clauseBundles: lambdaCoopClauseBundles }
              : {}),
            ...(lambdaCoopStateCarrier ? { stateCarrier: lambdaCoopStateCarrier } : {}),
            ...(lambdaCoopResidualCoverage
              ? { residualCoverage: lambdaCoopResidualCoverage }
              : {}),
            ...(lambdaCoopBoundary ? { boundaryWitnesses: lambdaCoopBoundary } : {}),
            ...(lambdaCoopAligned !== undefined ? { aligned: lambdaCoopAligned } : {}),
            ...(lambdaCoopIssues.length > 0 ? { issues: lambdaCoopIssues } : {}),
          },
        }
      : {}),
    diagnostics,
  };
};

export interface SupervisedStackRoundTripResult<Obj, Arr, Left, Right, Value> {
  readonly stack: SupervisedStack<Obj, Arr, Left, Right, Value>;
  readonly reconstructed: RunnerToStackResult<Obj, Left, Right>;
  readonly mismatches: ReadonlyArray<string>;
}

export const replaySupervisedStackRoundTrip = <
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
): SupervisedStackRoundTripResult<Obj, Arr, Left, Right, Value> => {
  const stack = makeSupervisedStack(interaction, kernelSpec, userSpec, options);
  const reconstructed = runnerToStack(stack.runner, interaction);
  const mismatches: string[] = [];

  if (!reconstructed.kernel?.name) {
    mismatches.push("Kernel name missing from reconstruction.");
  } else if (reconstructed.kernel.name !== kernelSpec.name) {
    mismatches.push(
      `Kernel name mismatch: expected ${kernelSpec.name} but reconstructed ${reconstructed.kernel.name}.`,
    );
  }

  if (!reconstructed.user?.name) {
    mismatches.push("User name missing from reconstruction.");
  } else if (reconstructed.user.name !== userSpec.name) {
    mismatches.push(
      `User name mismatch: expected ${userSpec.name} but reconstructed ${reconstructed.user.name}.`,
    );
  }

  const expectedOperations = kernelSpec.operations ?? [];
  const reconstructedOperations = reconstructed.kernel?.operations ?? [];
  const reconstructedByName = new Map(
    reconstructedOperations.map((operation) => [operation.name, operation]),
  );

  for (const spec of expectedOperations) {
    const reconstructedOp = reconstructedByName.get(spec.name);
    if (!reconstructedOp) {
      mismatches.push(`Missing reconstructed operation for ${spec.name}.`);
      continue;
    }
    if (reconstructedOp.kind !== spec.kind) {
      mismatches.push(
        `Kind mismatch for ${spec.name}: expected ${spec.kind} but found ${reconstructedOp.kind}.`,
      );
    }
    if (spec.parameterName && reconstructedOp.parameterName && spec.parameterName !== reconstructedOp.parameterName) {
      mismatches.push(
        `Parameter name mismatch for ${spec.name}: expected ${spec.parameterName} but found ${reconstructedOp.parameterName}.`,
      );
    }
    if (spec.parameterType && !valueTypesEqual(spec.parameterType, reconstructedOp.parameterType)) {
      mismatches.push(
        `Parameter type mismatch for ${spec.name}.`,
      );
    }
    if (spec.resultValueType && !valueTypesEqual(spec.resultValueType, reconstructedOp.resultValueType)) {
      mismatches.push(
        `Result type mismatch for ${spec.name}.`,
      );
    }
    const expectedResultKind = (() => {
      switch (spec.kind) {
        case "exception":
          return "raise" as const;
        case "signal":
          return "signal" as const;
        default:
          return "return" as const;
      }
    })();
    if (reconstructedOp.resultKind && reconstructedOp.resultKind !== expectedResultKind) {
      mismatches.push(
        `Result kind mismatch for ${spec.name}: expected ${expectedResultKind} but found ${reconstructedOp.resultKind}.`,
      );
    }
    const expectsDefaultResidual = spec.defaultResidual === true;
    const reconstructedDefaultResidual = reconstructedOp.residual?.defaulted === true;
    if (expectsDefaultResidual !== reconstructedDefaultResidual) {
      mismatches.push(
        `Default residual mismatch for ${spec.name}: expected ${expectsDefaultResidual ? "enabled" : "disabled"}.`,
      );
    }
    const expectsHandler = spec.residualHandler !== undefined;
    const reconstructedHandler = reconstructedOp.residual?.handlerDescription !== undefined;
    if (expectsHandler !== reconstructedHandler) {
      mismatches.push(
        `Residual handler mismatch for ${spec.name}: expected handler=${expectsHandler}.`,
      );
    }
  }

  for (const operation of reconstructedOperations) {
    if (!expectedOperations.some((spec) => spec.name === operation.name)) {
      mismatches.push(`Unexpected reconstructed operation ${operation.name}.`);
    }
  }

  if (expectedOperations.length !== reconstructedOperations.length) {
    mismatches.push(
      `Kernel operation count mismatch: expected ${expectedOperations.length} but reconstructed ${reconstructedOperations.length}.`,
    );
  }

  const expectedAllowed = new Set(userSpec.allowedKernelOperations ?? []);
  const reconstructedAllowed = new Set(reconstructed.user?.allowedOperations ?? []);
  for (const name of expectedAllowed) {
    if (!reconstructedAllowed.has(name)) {
      mismatches.push(`Missing reconstructed user allowance for operation ${name}.`);
    }
  }
  for (const name of reconstructedAllowed) {
    if (!expectedAllowed.has(name)) {
      mismatches.push(`Unexpected reconstructed user allowance for operation ${name}.`);
    }
  }

  if (
    reconstructed.kernel?.stateCarrier !== undefined &&
    reconstructed.kernel.stateCarrier !== kernelSpec.name
  ) {
    mismatches.push(
      `State carrier mismatch: expected ${kernelSpec.name} but reconstructed ${reconstructed.kernel.stateCarrier}.`,
    );
  }

  return { stack, reconstructed, mismatches };
};
