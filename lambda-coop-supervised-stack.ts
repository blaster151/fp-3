import type { SupervisedStack } from "./supervised-stack";
import {
  evaluateUser,
  summarizeUserEvaluation,
  type LambdaCoopEvalOptions,
  type LambdaCoopRunnerLiteral,
  type LambdaCoopUserComputation,
  type LambdaCoopUserEvalResult,
  type LambdaCoopUserEvalSummary,
  type LambdaCoopValue,
} from "./lambda-coop";

const UNIT_VALUE: LambdaCoopValue = { kind: "unitValue" };

const buildUserOperationChain = (
  operations: ReadonlyArray<string>,
  index = 0,
): LambdaCoopUserComputation => {
  if (operations.length === 0 || index >= operations.length) {
    return { kind: "userReturn", value: UNIT_VALUE };
  }
  const operation = operations[index];
  if (!operation) {
    return { kind: "userReturn", value: UNIT_VALUE };
  }
  return {
    kind: "userOperation",
    operation,
    argument: UNIT_VALUE,
    continuation: {
      parameter: `u${index}`,
      body: buildUserOperationChain(operations, index + 1),
    },
  };
};

const uniq = (items: ReadonlyArray<string>): ReadonlyArray<string> => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const item of items) {
    if (item && !seen.has(item)) {
      seen.add(item);
      ordered.push(item);
    }
  }
  return ordered;
};

export interface LambdaCoopSupervisedStackRunOptions {
  readonly operations?: ReadonlyArray<string>;
  readonly enforceRunnerLiteral?: boolean;
  readonly stepLimit?: number;
}

export interface LambdaCoopSupervisedStackRunResult {
  readonly runner: LambdaCoopRunnerLiteral;
  readonly program: LambdaCoopUserComputation;
  readonly evaluation: LambdaCoopUserEvalResult;
  readonly summary: LambdaCoopUserEvalSummary;
  readonly metadata: ReadonlyArray<string>;
}

export function evaluateSupervisedStackWithLambdaCoop<
  Obj,
  Arr,
  Left,
  Right,
  Value,
>(
  stack: SupervisedStack<Obj, Arr, Left, Right, Value>,
  options: LambdaCoopSupervisedStackRunOptions = {},
): LambdaCoopSupervisedStackRunResult {
  const comparison = stack.lambdaCoopComparison;
  if (!comparison) {
    throw new Error(
      "Supervised stack does not expose λ₍coop₎ comparison artifacts; rebuild the stack with λ₍coop₎ alignment enabled.",
    );
  }
  const runnerLiteral = comparison.runnerLiteral;
  const allowedByUser = stack.user.monad?.allowedKernelOperations
    ? Array.from(stack.user.monad.allowedKernelOperations)
    : comparison.userAllowed;
  const defaultOperations = options.operations ?? allowedByUser ?? [];
  const operationPlan = uniq(defaultOperations);
  const chain = buildUserOperationChain(operationPlan);
  const program: LambdaCoopUserComputation = {
    kind: "userRun",
    runner: runnerLiteral,
    computation: chain,
  };
  const evalOptions: LambdaCoopEvalOptions = {
    enforceRunner: options.enforceRunnerLiteral ?? true,
    ...(options.stepLimit !== undefined ? { stepLimit: options.stepLimit } : {}),
  };
  const evaluation = evaluateUser(program, evalOptions);
  const summary = summarizeUserEvaluation(evaluation);
  const metadata: string[] = [];
  metadata.push(`λ₍coop₎.stackRun.kernel=${stack.kernel.spec.name}`);
  metadata.push(`λ₍coop₎.stackRun.user=${stack.user.spec.name}`);
  metadata.push(`λ₍coop₎.stackRun.operations=${JSON.stringify(operationPlan)}`);
  metadata.push(`λ₍coop₎.stackRun.status=${evaluation.status}`);
  metadata.push(`λ₍coop₎.stackRun.traceLength=${summary.traceLength}`);
  metadata.push(
    `λ₍coop₎.stackRun.finalResources=${JSON.stringify(summary.finalResources)}`,
  );
  if (summary.finaliserSummary) {
    metadata.push(
      `λ₍coop₎.stackRun.finalisers=${JSON.stringify(summary.finaliserSummary)}`,
    );
  }
  if (summary.error) {
    metadata.push(`λ₍coop₎.stackRun.error=${summary.error}`);
  }
  if (summary.exception) {
    metadata.push(`λ₍coop₎.stackRun.exception=${summary.exception}`);
  }
  if (summary.signal) {
    metadata.push(`λ₍coop₎.stackRun.signal=${summary.signal}`);
  }
  return { runner: runnerLiteral, program, evaluation, summary, metadata };
}
