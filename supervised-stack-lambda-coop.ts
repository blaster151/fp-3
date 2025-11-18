import type {
  LambdaCoopKernelComputation,
  LambdaCoopRunnerClause,
  LambdaCoopRunnerLiteral,
  LambdaCoopValue,
  LambdaCoopValueType,
} from "./lambda-coop";

export type LambdaCoopKernelEffectKind = "state" | "exception" | "signal" | "external";

export interface LambdaCoopResidualCoverageDigest {
  readonly handled: number;
  readonly unhandled: number;
  readonly sampleLimit: number;
}

export interface LambdaCoopClauseResidualFallback {
  readonly defaulted: boolean;
  readonly handlerDescription?: string;
  readonly coverage?: LambdaCoopResidualCoverageDigest;
  readonly notes: ReadonlyArray<string>;
}

export interface LambdaCoopClauseBundle {
  readonly operation: string;
  readonly kind: LambdaCoopKernelEffectKind;
  readonly clause: LambdaCoopRunnerClause;
  readonly stateCarrier: string;
  readonly argumentType: LambdaCoopValueType;
  readonly argumentWitness?: LambdaCoopValue;
  readonly resultKind: "return" | "raise" | "signal";
  readonly resultValueType?: LambdaCoopValueType;
  readonly resultWitness?: LambdaCoopValue;
  readonly description?: string;
  readonly residual?: LambdaCoopClauseResidualFallback;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface LambdaCoopKernelOperationDescriptor {
  readonly name: string;
  readonly kind: LambdaCoopKernelEffectKind;
  readonly description?: string;
  readonly diagnostics?: ReadonlyArray<string>;
  readonly parameterName?: string;
  readonly parameterType?: LambdaCoopValueType;
  readonly resultValueType?: LambdaCoopValueType;
  readonly defaultResidual?: boolean;
  readonly handlerDescription?: string;
  readonly hasHandler?: boolean;
}

export interface LambdaCoopBoundaryWitnesses {
  readonly kernel: ReadonlyArray<string>;
  readonly user: ReadonlyArray<string>;
  readonly supported: ReadonlyArray<string>;
  readonly unsupported: ReadonlyArray<string>;
  readonly unacknowledged: ReadonlyArray<string>;
}

export interface LambdaCoopComparisonArtifacts {
  readonly runnerLiteral: LambdaCoopRunnerLiteral;
  readonly kernelClauses: ReadonlyArray<{ readonly name: string; readonly kind: LambdaCoopKernelEffectKind }>;
  readonly clauseBundles: ReadonlyArray<LambdaCoopClauseBundle>;
  readonly userAllowed: ReadonlyArray<string>;
  readonly unsupportedByKernel: ReadonlyArray<string>;
  readonly unacknowledgedByUser: ReadonlyArray<string>;
  readonly boundaryWitnesses: LambdaCoopBoundaryWitnesses;
  readonly aligned: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
  readonly stateCarrier: string;
  readonly residualCoverage?: LambdaCoopResidualCoverageDigest;
  readonly metadata: ReadonlyArray<string>;
}

const UNIT_TYPE: LambdaCoopValueType = { kind: "unit" };
const UNIT_VALUE: LambdaCoopValue = { kind: "unitValue" };

const CANONICAL_CONSTANT_SUFFIX = "#0";

export const canonicalValueForType = (
  type: LambdaCoopValueType,
): LambdaCoopValue | undefined => {
  switch (type.kind) {
    case "unit":
      return UNIT_VALUE;
    case "base":
      return { kind: "constant", label: `${type.name}${CANONICAL_CONSTANT_SUFFIX}` };
    case "product": {
      const left = canonicalValueForType(type.left);
      const right = canonicalValueForType(type.right);
      if (!left || !right) return undefined;
      return { kind: "pair", left, right };
    }
    case "sum": {
      const left = canonicalValueForType(type.left);
      if (left) {
        return { kind: "inl", value: left };
      }
      const right = canonicalValueForType(type.right);
      if (right) {
        return { kind: "inr", value: right };
      }
      return undefined;
    }
    case "signature":
      return { kind: "constant", label: `Σ:${type.name}${CANONICAL_CONSTANT_SUFFIX}` };
    case "operation":
      return { kind: "constant", label: `op:${type.operation}${CANONICAL_CONSTANT_SUFFIX}` };
    case "userFunctionType":
    case "kernelFunctionType":
    case "runnerFunctionType":
    case "empty":
      return undefined;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
};

const describeValue = (value: LambdaCoopValue): string => {
  switch (value.kind) {
    case "unitValue":
      return "()";
    case "constant":
      return value.label;
    case "pair":
      return `(${describeValue(value.left)}, ${describeValue(value.right)})`;
    case "inl":
      return `inl ${describeValue(value.value)}`;
    case "inr":
      return `inr ${describeValue(value.value)}`;
    case "runnerLiteral":
      return `runnerLiteral(${value.stateCarrier})`;
    case "variable":
      return value.name;
    case "userLambda":
    case "kernelLambda":
      return `${value.kind}(${value.parameter})`;
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
};

const makeKernelReturn = (value: LambdaCoopValue = UNIT_VALUE): LambdaCoopKernelComputation => ({
  kind: "kernelReturn",
  value,
});

const makeKernelRaise = (
  exception: string,
  payload?: LambdaCoopValue,
): LambdaCoopKernelComputation => ({
  kind: "kernelRaise",
  exception,
  ...(payload ? { payload } : {}),
});

const makeKernelSignal = (
  signal: string,
  payload?: LambdaCoopValue,
): LambdaCoopKernelComputation => ({
  kind: "kernelSignal",
  signal,
  ...(payload ? { payload } : {}),
});

const describeValueType = (type: LambdaCoopValueType): string => {
  switch (type.kind) {
    case "unit":
      return "unit";
    case "empty":
      return "empty";
    case "base":
      return type.name;
    case "product":
      return `(${describeValueType(type.left)}×${describeValueType(type.right)})`;
    case "sum":
      return `(${describeValueType(type.left)}+${describeValueType(type.right)})`;
    case "signature":
      return `Σ ${type.name}`;
    case "operation":
      return `op ${type.operation}`;
    case "userFunctionType":
      return `(${describeValueType(type.parameter)}→user)`;
    case "kernelFunctionType":
      return `(${describeValueType(type.parameter)}⇀kernel)`;
    case "runnerFunctionType":
      return `(${describeValueType(type.parameter)}⇒runner)`;
    default: {
      const exhaustive: never = type;
      throw new Error(`Unsupported λ₍coop₎ value type encountered.`);
    }
  }
};

const buildClause = (
  descriptor: LambdaCoopKernelOperationDescriptor,
): {
  readonly clause: LambdaCoopRunnerClause;
  readonly resultKind: "return" | "raise" | "signal";
  readonly resultValueType?: LambdaCoopValueType;
  readonly argumentWitness?: LambdaCoopValue;
  readonly resultWitness?: LambdaCoopValue;
} => {
  const operation = descriptor.name;
  const parameter = descriptor.parameterName ?? "input";
  const parameterType = descriptor.parameterType ?? UNIT_TYPE;
  const argumentWitness = canonicalValueForType(parameterType);
  let body: LambdaCoopKernelComputation;
  let resultKind: "return" | "raise" | "signal";
  let resultValueType: LambdaCoopValueType | undefined;
  let resultWitness: LambdaCoopValue | undefined;
  switch (descriptor.kind) {
    case "state":
    case "external":
      resultValueType = descriptor.resultValueType ?? UNIT_TYPE;
      resultWitness = resultValueType ? canonicalValueForType(resultValueType) : undefined;
      body = makeKernelReturn(resultWitness ?? UNIT_VALUE);
      resultKind = "return";
      break;
    case "exception":
      body = makeKernelRaise(operation, argumentWitness);
      resultKind = "raise";
      break;
    case "signal":
      body = makeKernelSignal(operation, argumentWitness);
      resultKind = "signal";
      break;
    default: {
      const exhaustive: never = descriptor.kind;
      body = makeKernelReturn();
      resultKind = "return";
      resultValueType = descriptor.resultValueType ?? UNIT_TYPE;
      return exhaustive;
    }
  }
  return {
    clause: {
      operation,
      parameter,
      parameterType,
      body,
    },
    resultKind,
    ...(resultValueType ? { resultValueType } : {}),
    ...(argumentWitness ? { argumentWitness } : {}),
    ...(resultWitness ? { resultWitness } : {}),
  };
};

const toArray = (value: ReadonlySet<string> | ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.isArray(value) ? value : Array.from(value);

export interface BuildLambdaCoopComparisonOptions {
  readonly stateCarrierName?: string;
  readonly residualSummary?: LambdaCoopResidualCoverageDigest & {
    readonly diagnostics: ReadonlyArray<string>;
  };
  readonly expectedOperations?: ReadonlyArray<string>;
}

export const buildLambdaCoopComparisonArtifacts = (
  kernelOperations: ReadonlyArray<LambdaCoopKernelOperationDescriptor>,
  userAllowed: ReadonlySet<string> | ReadonlyArray<string>,
  options: BuildLambdaCoopComparisonOptions = {},
): LambdaCoopComparisonArtifacts => {
  const stateCarrierName = options.stateCarrierName ?? "state";
  const clauseResults = kernelOperations.map((op) => buildClause(op));
  const kernelClauses = clauseResults.map((result, index) => ({
    name: kernelOperations[index]?.name ?? result.clause.operation,
    kind: kernelOperations[index]?.kind ?? "state",
  }));
  const runnerLiteral: LambdaCoopRunnerLiteral = {
    kind: "runnerLiteral",
    stateCarrier: stateCarrierName,
    clauses: clauseResults.map((result) => result.clause),
  };

  const userAllowedList = toArray(userAllowed);
  const kernelOperationNames = new Set(kernelClauses.map((clause) => clause.name));
  const userAllowedSet = new Set(userAllowedList);

  const unsupportedByKernel = userAllowedList.filter((name) => !kernelOperationNames.has(name));
  const unacknowledgedByUser = kernelClauses
    .map((clause) => clause.name)
    .filter((name) => !userAllowedSet.has(name));
  const supportedBoundary = userAllowedList.filter((name) => kernelOperationNames.has(name));

  const boundaryWitnesses: LambdaCoopBoundaryWitnesses = {
    kernel: kernelClauses.map((clause) => clause.name),
    user: userAllowedList,
    supported: supportedBoundary,
    unsupported: unsupportedByKernel,
    unacknowledged: unacknowledgedByUser,
  };

  const residualCoverage = options.residualSummary
    ? {
        handled: options.residualSummary.handled,
        unhandled: options.residualSummary.unhandled,
        sampleLimit: options.residualSummary.sampleLimit,
      }
    : undefined;

  const clauseBundles: LambdaCoopClauseBundle[] = clauseResults.map((result, index) => {
    const descriptor = kernelOperations[index];
    const name = descriptor?.name ?? result.clause.operation;
    const kind = descriptor?.kind ?? "state";
    const hasResidualHandler = descriptor?.hasHandler === true;
    const usesDefaultResidual = descriptor?.defaultResidual === true;
    const includeResidualCoverage = Boolean(
      residualCoverage && (hasResidualHandler || usesDefaultResidual),
    );
    const coverage = includeResidualCoverage
      ? (residualCoverage as LambdaCoopResidualCoverageDigest)
      : undefined;
    const residualNotes: string[] = [];
    if (descriptor?.handlerDescription) {
      residualNotes.push(`Residual handler: ${descriptor.handlerDescription}`);
    }
    if (usesDefaultResidual && !hasResidualHandler) {
      residualNotes.push(`Default residual fallback active for ${name}.`);
    }
    if (coverage) {
      residualNotes.push(
        `Residual coverage: handled=${coverage.handled} unhandled=${coverage.unhandled} sampleLimit=${coverage.sampleLimit}`,
      );
    }

    const argumentWitnessDescription = result.argumentWitness
      ? describeValue(result.argumentWitness)
      : "∅";
    const resultWitnessDescription = result.resultWitness
      ? describeValue(result.resultWitness)
      : "∅";
    const clauseDiagnostics: string[] = [
      `Clause ${name}: kind=${kind} parameter=${describeValueType(result.clause.parameterType)} argumentWitness=${argumentWitnessDescription} result=${result.resultKind}`,
      ...(result.resultValueType
        ? [`Clause ${name}: resultType=${describeValueType(result.resultValueType)} resultWitness=${resultWitnessDescription}`]
        : [`Clause ${name}: resultWitness=${resultWitnessDescription}`]),
      ...(descriptor?.diagnostics ?? []),
    ];
    if (residualNotes.length > 0) {
      clauseDiagnostics.push(...residualNotes);
    }

    const residual =
      residualNotes.length > 0
        ? {
            defaulted: Boolean(usesDefaultResidual && !hasResidualHandler),
            ...(descriptor?.handlerDescription
              ? { handlerDescription: descriptor.handlerDescription }
              : {}),
            ...(coverage ? { coverage } : {}),
            notes: residualNotes,
          }
        : undefined;

    return {
      operation: name,
      kind: kind,
      clause: result.clause,
      stateCarrier: stateCarrierName,
      argumentType: result.clause.parameterType,
      ...(result.argumentWitness ? { argumentWitness: result.argumentWitness } : {}),
      resultKind: result.resultKind,
      ...(result.resultValueType ? { resultValueType: result.resultValueType } : {}),
      ...(result.resultWitness ? { resultWitness: result.resultWitness } : {}),
      ...(descriptor?.description ? { description: descriptor.description } : {}),
      ...(residual ? { residual } : {}),
      diagnostics: clauseDiagnostics,
    } satisfies LambdaCoopClauseBundle;
  });

  const diagnostics: string[] = [
    `λ₍coop₎ comparison: kernel clauses=${kernelClauses.length} userAllowed=${userAllowedList.length}`,
  ];
  for (const bundle of clauseBundles) {
    const residualTag = bundle.residual?.defaulted
      ? " residual=default"
      : bundle.residual?.handlerDescription
        ? " residual=handler"
        : "";
    diagnostics.push(
      `λ₍coop₎ clause ${bundle.operation}: parameter=${describeValueType(bundle.argumentType)} result=${bundle.resultKind} stateCarrier=${bundle.stateCarrier}${residualTag}`,
    );
  }
  if (residualCoverage) {
    diagnostics.push(
      `λ₍coop₎ residual coverage summary: handled=${residualCoverage.handled} unhandled=${residualCoverage.unhandled} sampleLimit=${residualCoverage.sampleLimit}`,
    );
  }
  diagnostics.push(...(options.residualSummary?.diagnostics ?? []));

  const issues: string[] = [];
  if (unsupportedByKernel.length > 0) {
    const message = `λ₍coop₎ comparison warning: user references operations missing from kernel (${unsupportedByKernel.join(", ")}).`;
    diagnostics.push(message);
    issues.push(message);
  }
  if (unacknowledgedByUser.length > 0) {
    const message = `λ₍coop₎ comparison note: kernel exposes operations not acknowledged by user (${unacknowledgedByUser.join(", ")}).`;
    diagnostics.push(message);
    issues.push(message);
  }
  if (kernelClauses.length === 0) {
    const message = "λ₍coop₎ comparison note: kernel exposes no operations (residual-only).";
    diagnostics.push(message);
    issues.push(message);
  }
  if (userAllowedList.length === 0) {
    const message = "λ₍coop₎ comparison note: user declares no allowed operations.";
    diagnostics.push(message);
    issues.push(message);
  }

  const metadata: string[] = [];
  metadata.push(`λ₍coop₎.stateCarrier=${stateCarrierName}`);
  metadata.push(
    `λ₍coop₎.kernelClauses=${JSON.stringify(kernelClauses.map((clause) => clause.name))}`,
  );
  metadata.push(`λ₍coop₎.userAllowed=${JSON.stringify(userAllowedList)}`);
  metadata.push(`λ₍coop₎.unsupportedByKernel=${JSON.stringify(unsupportedByKernel)}`);
  metadata.push(`λ₍coop₎.unacknowledgedByUser=${JSON.stringify(unacknowledgedByUser)}`);
  metadata.push(`λ₍coop₎.boundary=${JSON.stringify(boundaryWitnesses)}`);
  metadata.push(
    `λ₍coop₎ boundary supported=${boundaryWitnesses.supported.join(",") || "∅"} unsupported=${
      boundaryWitnesses.unsupported.join(",") || "∅"
    } unacknowledged=${boundaryWitnesses.unacknowledged.join(",") || "∅"}`,
  );
  if (options.expectedOperations && options.expectedOperations.length > 0) {
    metadata.push(
      `λ₍coop₎.interpreter.expectedOperations=${JSON.stringify(options.expectedOperations)}`,
    );
  }
  if (residualCoverage) {
    metadata.push(
      `λ₍coop₎.residual.coverage=${JSON.stringify({
        handled: residualCoverage.handled,
        unhandled: residualCoverage.unhandled,
        sampleLimit: residualCoverage.sampleLimit,
      })}`,
    );
  }
  clauseBundles.forEach((bundle, index) => {
    metadata.push(`λ₍coop₎.clause[${index}].operation=${bundle.operation}`);
    metadata.push(`λ₍coop₎.clause[${index}].kind=${bundle.kind}`);
    metadata.push(
      `λ₍coop₎.clause[${index}].parameterType=${JSON.stringify(bundle.argumentType)}`,
    );
    if (bundle.argumentWitness) {
      metadata.push(
        `λ₍coop₎.clause[${index}].argumentWitness=${JSON.stringify(bundle.argumentWitness)}`,
      );
    }
    metadata.push(`λ₍coop₎.clause[${index}].result=${bundle.resultKind}`);
    if (bundle.resultValueType) {
      metadata.push(
        `λ₍coop₎.clause[${index}].resultType=${JSON.stringify(bundle.resultValueType)}`,
      );
    }
    if (bundle.resultWitness) {
      metadata.push(
        `λ₍coop₎.clause[${index}].resultWitness=${JSON.stringify(bundle.resultWitness)}`,
      );
    }
    metadata.push(
      `λ₍coop₎.clause[${index}].residual=${JSON.stringify(bundle.residual ?? null)}`,
    );
  });

  return {
    runnerLiteral,
    kernelClauses,
    clauseBundles,
    userAllowed: userAllowedList,
    unsupportedByKernel,
    unacknowledgedByUser,
    boundaryWitnesses,
    aligned: issues.length === 0,
    issues,
    diagnostics,
    stateCarrier: stateCarrierName,
    metadata,
    ...(residualCoverage ? { residualCoverage } : {}),
  };
};
