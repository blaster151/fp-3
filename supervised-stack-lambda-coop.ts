import type {
  LambdaCoopKernelComputation,
  LambdaCoopRunnerClause,
  LambdaCoopRunnerLiteral,
  LambdaCoopValue,
} from "./lambda-coop";

export type LambdaCoopKernelEffectKind = "state" | "exception" | "signal" | "external";

export interface LambdaCoopComparisonArtifacts {
  readonly runnerLiteral: LambdaCoopRunnerLiteral;
  readonly kernelClauses: ReadonlyArray<{ readonly name: string; readonly kind: LambdaCoopKernelEffectKind }>;
  readonly userAllowed: ReadonlyArray<string>;
  readonly unsupportedByKernel: ReadonlyArray<string>;
  readonly unacknowledgedByUser: ReadonlyArray<string>;
  readonly aligned: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly diagnostics: ReadonlyArray<string>;
}

const UNIT_TYPE = { kind: "unit" } as const;
const UNIT_VALUE: LambdaCoopValue = { kind: "unitValue" };

const makeKernelReturn = (): LambdaCoopKernelComputation => ({
  kind: "kernelReturn",
  value: UNIT_VALUE,
});

const makeKernelRaise = (exception: string): LambdaCoopKernelComputation => ({
  kind: "kernelRaise",
  exception,
});

const makeKernelSignal = (signal: string): LambdaCoopKernelComputation => ({
  kind: "kernelSignal",
  signal,
});

const buildClause = (
  operation: string,
  kind: LambdaCoopKernelEffectKind,
): LambdaCoopRunnerClause => {
  let body: LambdaCoopKernelComputation;
  switch (kind) {
    case "state":
    case "external":
      body = makeKernelReturn();
      break;
    case "exception":
      body = makeKernelRaise(operation);
      break;
    case "signal":
      body = makeKernelSignal(operation);
      break;
    default: {
      const exhaustive: never = kind;
      body = makeKernelReturn();
      return exhaustive;
    }
  }
  return {
    operation,
    parameter: "input",
    parameterType: UNIT_TYPE,
    body,
  };
};

const toArray = (value: ReadonlySet<string> | ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.isArray(value) ? value : Array.from(value);

export interface BuildLambdaCoopComparisonOptions {
  readonly stateCarrierName?: string;
}

export const buildLambdaCoopComparisonArtifacts = (
  kernelOperations: ReadonlyArray<{ readonly name: string; readonly kind: LambdaCoopKernelEffectKind }>,
  userAllowed: ReadonlySet<string> | ReadonlyArray<string>,
  options: BuildLambdaCoopComparisonOptions = {},
): LambdaCoopComparisonArtifacts => {
  const kernelClauses = kernelOperations.map((op) => ({
    name: op.name,
    kind: op.kind,
  }));
  const stateCarrierName = options.stateCarrierName ?? "state";
  const runnerLiteral: LambdaCoopRunnerLiteral = {
    kind: "runnerLiteral",
    stateCarrier: stateCarrierName,
    clauses: kernelClauses.map((op) => buildClause(op.name, op.kind)),
  };

  const userAllowedList = toArray(userAllowed);
  const kernelOperationNames = new Set(kernelClauses.map((clause) => clause.name));
  const userAllowedSet = new Set(userAllowedList);

  const unsupportedByKernel = userAllowedList.filter((name) => !kernelOperationNames.has(name));
  const unacknowledgedByUser = kernelClauses
    .map((clause) => clause.name)
    .filter((name) => !userAllowedSet.has(name));

  const diagnostics: string[] = [
    `λ₍coop₎ comparison: kernel clauses=${kernelClauses.length} userAllowed=${userAllowedList.length}`,
  ];
  const issues: string[] = [];
  if (unsupportedByKernel.length > 0) {
    const message = `λ₍coop₎ comparison warning: user references operations missing from kernel (${unsupportedByKernel.join(
      ", ",
    )}).`;
    diagnostics.push(message);
    issues.push(message);
  }
  if (unacknowledgedByUser.length > 0) {
    const message = `λ₍coop₎ comparison note: kernel exposes operations not acknowledged by user (${unacknowledgedByUser.join(
      ", ",
    )}).`;
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

  return {
    runnerLiteral,
    kernelClauses,
    userAllowed: userAllowedList,
    unsupportedByKernel,
    unacknowledgedByUser,
    aligned: issues.length === 0,
    issues,
    diagnostics,
  };
};
