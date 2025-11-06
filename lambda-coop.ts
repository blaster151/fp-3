/**
 * λ_{coop} calculus infrastructure capturing types, terms, and resource accounting.
 *
 * This module models the value/kernel/user syntactic categories outlined in
 * "Runners in Action" so later passes can build typing derivations and
 * operational semantics. The structures here focus on representing syntax
 * together with resource annotations (available operations, exceptions,
 * signals, and state objects) and expose utilities for summarising the
 * resources a term requires.
 */

/** Tracks the effect resources a λ_{coop} fragment depends on. */
export interface LambdaCoopResourceUsage {
  readonly signatures: Set<string>;
  readonly exceptions: Set<string>;
  readonly signals: Set<string>;
  readonly states: Set<string>;
}

/** Notes generated while traversing a λ_{coop} term when collecting resources. */
export interface LambdaCoopResourceTraceEntry {
  readonly termKind: string;
  readonly note: string;
  readonly operations?: readonly string[];
  readonly exceptions?: readonly string[];
  readonly signals?: readonly string[];
  readonly states?: readonly string[];
}

/** Summary returned by the resource analysers. */
export interface LambdaCoopResourceSummary {
  readonly usage: LambdaCoopResourceUsage;
  readonly trace: readonly LambdaCoopResourceTraceEntry[];
}

/**
 * Resource annotations attached to types or syntactic forms. Arrays are used so
 * callers can provide human-friendly literals; the analysers convert them into
 * sets during traversal.
 */
export interface LambdaCoopResourceAnnotation {
  readonly operations?: readonly string[];
  readonly exceptions?: readonly string[];
  readonly signals?: readonly string[];
  readonly states?: readonly string[];
}

/**
 * Creates an empty usage record with fresh sets so downstream callers can add
 * witnesses without mutating shared state.
 */
export function makeEmptyResourceUsage(): LambdaCoopResourceUsage {
  return {
    signatures: new Set<string>(),
    exceptions: new Set<string>(),
    signals: new Set<string>(),
    states: new Set<string>(),
  };
}

function mergeUsage(into: LambdaCoopResourceUsage, from: LambdaCoopResourceUsage): void {
  for (const value of from.signatures) {
    into.signatures.add(value);
  }
  for (const value of from.exceptions) {
    into.exceptions.add(value);
  }
  for (const value of from.signals) {
    into.signals.add(value);
  }
  for (const value of from.states) {
    into.states.add(value);
  }
}

function applyAnnotation(usage: LambdaCoopResourceUsage, annotation?: LambdaCoopResourceAnnotation): void {
  if (!annotation) {
    return;
  }
  for (const op of annotation.operations ?? []) {
    usage.signatures.add(op);
  }
  for (const ex of annotation.exceptions ?? []) {
    usage.exceptions.add(ex);
  }
  for (const signal of annotation.signals ?? []) {
    usage.signals.add(signal);
  }
  for (const state of annotation.states ?? []) {
    usage.states.add(state);
  }
}

function combineSummaries(
  children: readonly LambdaCoopResourceSummary[],
  entry: LambdaCoopResourceTraceEntry,
  adjustUsage?: (usage: LambdaCoopResourceUsage) => void,
): LambdaCoopResourceSummary {
  const usage = makeEmptyResourceUsage();
  const trace: LambdaCoopResourceTraceEntry[] = [];
  for (const child of children) {
    mergeUsage(usage, child.usage);
    trace.push(...child.trace);
  }
  if (adjustUsage) {
    adjustUsage(usage);
  }
  trace.push(entry);
  return { usage, trace };
}

/** Base value types appearing in λ_{coop}. */
export type LambdaCoopValueType =
  | { readonly kind: 'unit' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'base'; readonly name: string }
  | { readonly kind: 'product'; readonly left: LambdaCoopValueType; readonly right: LambdaCoopValueType }
  | { readonly kind: 'sum'; readonly left: LambdaCoopValueType; readonly right: LambdaCoopValueType }
  | { readonly kind: 'signature'; readonly name: string; readonly parameters: readonly LambdaCoopValueType[]; readonly result: LambdaCoopValueType }
  | { readonly kind: 'operation'; readonly signature: string; readonly operation: string }
  | LambdaCoopUserFunctionType
  | LambdaCoopKernelFunctionType
  | LambdaCoopRunnerFunctionType;

/** User computations `X → Y` (values returning a user computation). */
export interface LambdaCoopUserFunctionType {
  readonly kind: 'userFunctionType';
  readonly parameter: LambdaCoopValueType;
  readonly result: LambdaCoopUserComputationType;
}

/** Kernel computations `X ⇀ Y` (values returning a kernel computation). */
export interface LambdaCoopKernelFunctionType {
  readonly kind: 'kernelFunctionType';
  readonly parameter: LambdaCoopValueType;
  readonly result: LambdaCoopKernelComputationType;
}

/** Runner functions `X ⇒ Y` accompanied by their resource annotations. */
export interface LambdaCoopRunnerFunctionType {
  readonly kind: 'runnerFunctionType';
  readonly parameter: LambdaCoopValueType;
  readonly result: LambdaCoopKernelComputationType;
  readonly resources: LambdaCoopResourceAnnotation;
}

/** User computation result types, recording residual resources. */
export interface LambdaCoopUserComputationType {
  readonly kind: 'userComputationType';
  readonly result: LambdaCoopValueType;
  readonly resources: LambdaCoopResourceAnnotation;
}

/** Kernel computation result types with their resource requirements. */
export interface LambdaCoopKernelComputationType {
  readonly kind: 'kernelComputationType';
  readonly result: LambdaCoopValueType;
  readonly resources: LambdaCoopResourceAnnotation;
}

/** λ_{coop} values. */
export type LambdaCoopValue =
  | LambdaCoopVariable
  | LambdaCoopConstant
  | LambdaCoopUnit
  | LambdaCoopPair
  | LambdaCoopInl
  | LambdaCoopInr
  | LambdaCoopUserLambda
  | LambdaCoopKernelLambda
  | LambdaCoopRunnerLiteral;

export interface LambdaCoopVariable {
  readonly kind: 'variable';
  readonly name: string;
}

export interface LambdaCoopConstant {
  readonly kind: 'constant';
  readonly label: string;
}

export interface LambdaCoopUnit {
  readonly kind: 'unitValue';
}

export interface LambdaCoopPair {
  readonly kind: 'pair';
  readonly left: LambdaCoopValue;
  readonly right: LambdaCoopValue;
}

export interface LambdaCoopInl {
  readonly kind: 'inl';
  readonly value: LambdaCoopValue;
}

export interface LambdaCoopInr {
  readonly kind: 'inr';
  readonly value: LambdaCoopValue;
}

export interface LambdaCoopUserLambda {
  readonly kind: 'userLambda';
  readonly parameter: string;
  readonly parameterType: LambdaCoopValueType;
  readonly body: LambdaCoopUserComputation;
}

export interface LambdaCoopKernelLambda {
  readonly kind: 'kernelLambda';
  readonly parameter: string;
  readonly parameterType: LambdaCoopValueType;
  readonly body: LambdaCoopKernelComputation;
}

export interface LambdaCoopRunnerClause {
  readonly operation: string;
  readonly parameter: string;
  readonly parameterType: LambdaCoopValueType;
  readonly body: LambdaCoopKernelComputation;
}

export interface LambdaCoopRunnerLiteral {
  readonly kind: 'runnerLiteral';
  readonly stateCarrier: string;
  readonly clauses: readonly LambdaCoopRunnerClause[];
}

/** User continuations produced by operation calls. */
export interface LambdaCoopUserContinuation {
  readonly parameter: string;
  readonly body: LambdaCoopUserComputation;
}

/** Kernel continuations produced by co-operations. */
export interface LambdaCoopKernelContinuation {
  readonly parameter: string;
  readonly body: LambdaCoopKernelComputation;
}

/** Exception handler clause for user computations. */
export interface LambdaCoopExceptionHandler {
  readonly exception: string;
  readonly parameter?: string;
  readonly body: LambdaCoopUserComputation;
}

/** Kernel-level exception handler clause. */
export interface LambdaCoopKernelExceptionHandler {
  readonly exception: string;
  readonly parameter?: string;
  readonly body: LambdaCoopKernelComputation;
}

/** Exception handler clause for kernel signals. */
export interface LambdaCoopSignalHandler {
  readonly signal: string;
  readonly body: LambdaCoopKernelComputation;
}

/** λ_{coop} user computations. */
export type LambdaCoopUserComputation =
  | LambdaCoopUserReturn
  | LambdaCoopUserApply
  | LambdaCoopUserLet
  | LambdaCoopUserOperation
  | LambdaCoopUserRun
  | LambdaCoopUserRaise
  | LambdaCoopUserTry;

export interface LambdaCoopUserReturn {
  readonly kind: 'userReturn';
  readonly value: LambdaCoopValue;
}

export interface LambdaCoopUserApply {
  readonly kind: 'userApply';
  readonly functionTerm: LambdaCoopValue;
  readonly argument: LambdaCoopValue;
}

export interface LambdaCoopUserLet {
  readonly kind: 'userLet';
  readonly binder: string;
  readonly computation: LambdaCoopUserComputation;
  readonly body: LambdaCoopUserComputation;
}

export interface LambdaCoopUserOperation {
  readonly kind: 'userOperation';
  readonly operation: string;
  readonly argument: LambdaCoopValue;
  readonly continuation: LambdaCoopUserContinuation;
  readonly annotation?: LambdaCoopResourceAnnotation;
}

export interface LambdaCoopUserRun {
  readonly kind: 'userRun';
  readonly runner: LambdaCoopValue;
  readonly computation: LambdaCoopUserComputation;
}

export interface LambdaCoopUserRaise {
  readonly kind: 'userRaise';
  readonly exception: string;
  readonly payload?: LambdaCoopValue;
}

export interface LambdaCoopUserTry {
  readonly kind: 'userTry';
  readonly computation: LambdaCoopUserComputation;
  readonly returnHandler: LambdaCoopUserContinuation;
  readonly exceptionHandlers: readonly LambdaCoopExceptionHandler[];
}

/** λ_{coop} kernel computations. */
export type LambdaCoopKernelComputation =
  | LambdaCoopKernelReturn
  | LambdaCoopKernelApply
  | LambdaCoopKernelLet
  | LambdaCoopKernelOperation
  | LambdaCoopKernelRaise
  | LambdaCoopKernelSignal
  | LambdaCoopKernelTry;

export interface LambdaCoopKernelReturn {
  readonly kind: 'kernelReturn';
  readonly value: LambdaCoopValue;
}

export interface LambdaCoopKernelApply {
  readonly kind: 'kernelApply';
  readonly functionTerm: LambdaCoopValue;
  readonly argument: LambdaCoopValue;
}

export interface LambdaCoopKernelLet {
  readonly kind: 'kernelLet';
  readonly binder: string;
  readonly computation: LambdaCoopKernelComputation;
  readonly body: LambdaCoopKernelComputation;
}

export interface LambdaCoopKernelOperation {
  readonly kind: 'kernelOperation';
  readonly operation: string;
  readonly argument: LambdaCoopValue;
  readonly continuation: LambdaCoopKernelContinuation;
  readonly annotation?: LambdaCoopResourceAnnotation;
  readonly stateEffect?: string;
}

export interface LambdaCoopKernelRaise {
  readonly kind: 'kernelRaise';
  readonly exception: string;
  readonly payload?: LambdaCoopValue;
}

export interface LambdaCoopKernelSignal {
  readonly kind: 'kernelSignal';
  readonly signal: string;
  readonly payload?: LambdaCoopValue;
}

export interface LambdaCoopKernelTry {
  readonly kind: 'kernelTry';
  readonly computation: LambdaCoopKernelComputation;
  readonly returnHandler: LambdaCoopKernelContinuation;
  readonly exceptionHandlers: readonly LambdaCoopKernelExceptionHandler[];
  readonly signalHandlers?: readonly LambdaCoopSignalHandler[];
}

function summarizeUserContinuation(continuation: LambdaCoopUserContinuation): LambdaCoopResourceSummary {
  const bodySummary = summarizeUserComputationResources(continuation.body);
  return combineSummaries(
    [bodySummary],
    { termKind: 'userContinuation', note: `continuation ${continuation.parameter}` },
  );
}

function summarizeKernelContinuation(continuation: LambdaCoopKernelContinuation): LambdaCoopResourceSummary {
  const bodySummary = summarizeKernelComputationResources(continuation.body);
  return combineSummaries(
    [bodySummary],
    { termKind: 'kernelContinuation', note: `continuation ${continuation.parameter}` },
  );
}

function summarizeExceptionHandlers(handlers: readonly LambdaCoopExceptionHandler[]): LambdaCoopResourceSummary {
  const childSummaries = handlers.map((handler) =>
    summarizeUserComputationResources(handler.body),
  );
  return combineSummaries(
    childSummaries,
    {
      termKind: 'userExceptionHandlers',
      note: handlers.length === 0 ? 'no exception handlers' : `handlers for ${handlers.map((h) => h.exception).join(', ')}`,
      exceptions: handlers.map((h) => h.exception),
    },
  );
}

function summarizeKernelExceptionHandlers(
  handlers: readonly LambdaCoopKernelExceptionHandler[],
): LambdaCoopResourceSummary {
  const childSummaries = handlers.map((handler) =>
    summarizeKernelComputationResources(handler.body),
  );
  return combineSummaries(
    childSummaries,
    {
      termKind: 'kernelExceptionHandlers',
      note: handlers.length === 0 ? 'no exception handlers' : `handlers for ${handlers.map((h) => h.exception).join(', ')}`,
      exceptions: handlers.map((h) => h.exception),
    },
  );
}

function summarizeSignalHandlers(handlers: readonly LambdaCoopSignalHandler[] | undefined): LambdaCoopResourceSummary {
  if (!handlers || handlers.length === 0) {
    return combineSummaries([], { termKind: 'kernelSignalHandlers', note: 'no signal handlers' });
  }
  const childSummaries = handlers.map((handler) =>
    summarizeKernelComputationResources(handler.body),
  );
  return combineSummaries(
    childSummaries,
    {
      termKind: 'kernelSignalHandlers',
      note: `handlers for ${handlers.map((h) => h.signal).join(', ')}`,
      signals: handlers.map((h) => h.signal),
    },
  );
}

/** Summarises the resource usage of a λ_{coop} value. */
export function summarizeValueResources(value: LambdaCoopValue): LambdaCoopResourceSummary {
  switch (value.kind) {
    case 'variable':
      return combineSummaries([], { termKind: 'variable', note: `variable ${value.name}` });
    case 'constant':
      return combineSummaries([], { termKind: 'constant', note: `constant ${value.label}` });
    case 'unitValue':
      return combineSummaries([], { termKind: 'unitValue', note: 'unit literal' });
    case 'pair': {
      const left = summarizeValueResources(value.left);
      const right = summarizeValueResources(value.right);
      return combineSummaries([left, right], { termKind: 'pair', note: 'pair value' });
    }
    case 'inl': {
      const child = summarizeValueResources(value.value);
      return combineSummaries([child], { termKind: 'inl', note: 'left injection' });
    }
    case 'inr': {
      const child = summarizeValueResources(value.value);
      return combineSummaries([child], { termKind: 'inr', note: 'right injection' });
    }
    case 'userLambda': {
      const bodySummary = summarizeUserComputationResources(value.body);
      return combineSummaries(
        [bodySummary],
        { termKind: 'userLambda', note: `λ ${value.parameter}` },
      );
    }
    case 'kernelLambda': {
      const bodySummary = summarizeKernelComputationResources(value.body);
      return combineSummaries(
        [bodySummary],
        { termKind: 'kernelLambda', note: `λₖ ${value.parameter}` },
      );
    }
    case 'runnerLiteral': {
      const clauseSummaries = value.clauses.map((clause) =>
        summarizeKernelComputationResources(clause.body),
      );
      return combineSummaries(
        clauseSummaries,
        {
          termKind: 'runnerLiteral',
          note: `runner with ${value.clauses.length} clause(s)` ,
          operations: value.clauses.map((clause) => clause.operation),
          states: [value.stateCarrier],
        },
        (usage) => {
          usage.states.add(value.stateCarrier);
          for (const clause of value.clauses) {
            usage.signatures.add(clause.operation);
          }
        },
      );
    }
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

/** Summarises the resource usage of a λ_{coop} user computation. */
export function summarizeUserComputationResources(term: LambdaCoopUserComputation): LambdaCoopResourceSummary {
  switch (term.kind) {
    case 'userReturn': {
      const child = summarizeValueResources(term.value);
      return combineSummaries([child], { termKind: 'userReturn', note: 'return' });
    }
    case 'userApply': {
      const fnSummary = summarizeValueResources(term.functionTerm);
      const argSummary = summarizeValueResources(term.argument);
      return combineSummaries([fnSummary, argSummary], { termKind: 'userApply', note: 'user application' });
    }
    case 'userLet': {
      const computationSummary = summarizeUserComputationResources(term.computation);
      const bodySummary = summarizeUserComputationResources(term.body);
      return combineSummaries(
        [computationSummary, bodySummary],
        { termKind: 'userLet', note: `let ${term.binder}` },
      );
    }
    case 'userOperation': {
      const argumentSummary = summarizeValueResources(term.argument);
      const continuationSummary = summarizeUserContinuation(term.continuation);
      return combineSummaries(
        [argumentSummary, continuationSummary],
        {
          termKind: 'userOperation',
          note: `user operation ${term.operation}` ,
          operations: [term.operation],
        },
        (usage) => {
          usage.signatures.add(term.operation);
          applyAnnotation(usage, term.annotation);
        },
      );
    }
    case 'userRun': {
      const runnerSummary = summarizeValueResources(term.runner);
      const computationSummary = summarizeUserComputationResources(term.computation);
      return combineSummaries(
        [runnerSummary, computationSummary],
        { termKind: 'userRun', note: 'run computation under runner' },
      );
    }
    case 'userRaise': {
      const payloadSummary = term.payload ? summarizeValueResources(term.payload) : combineSummaries([], { termKind: 'userRaisePayload', note: 'no payload' });
      return combineSummaries(
        [payloadSummary],
        {
          termKind: 'userRaise',
          note: `raise ${term.exception}` ,
          exceptions: [term.exception],
        },
        (usage) => {
          usage.exceptions.add(term.exception);
        },
      );
    }
    case 'userTry': {
      const computationSummary = summarizeUserComputationResources(term.computation);
      const returnSummary = summarizeUserContinuation(term.returnHandler);
      const exceptionSummary = summarizeExceptionHandlers(term.exceptionHandlers);
      return combineSummaries(
        [computationSummary, returnSummary, exceptionSummary],
        { termKind: 'userTry', note: 'user try' },
      );
    }
    default: {
      const _exhaustive: never = term;
      return _exhaustive;
    }
  }
}

/** Summarises the resource usage of a λ_{coop} kernel computation. */
export function summarizeKernelComputationResources(term: LambdaCoopKernelComputation): LambdaCoopResourceSummary {
  switch (term.kind) {
    case 'kernelReturn': {
      const child = summarizeValueResources(term.value);
      return combineSummaries([child], { termKind: 'kernelReturn', note: 'kernel return' });
    }
    case 'kernelApply': {
      const fnSummary = summarizeValueResources(term.functionTerm);
      const argSummary = summarizeValueResources(term.argument);
      return combineSummaries([fnSummary, argSummary], { termKind: 'kernelApply', note: 'kernel application' });
    }
    case 'kernelLet': {
      const computationSummary = summarizeKernelComputationResources(term.computation);
      const bodySummary = summarizeKernelComputationResources(term.body);
      return combineSummaries(
        [computationSummary, bodySummary],
        { termKind: 'kernelLet', note: `let ${term.binder}` },
      );
    }
    case 'kernelOperation': {
      const argumentSummary = summarizeValueResources(term.argument);
      const continuationSummary = summarizeKernelContinuation(term.continuation);
        return combineSummaries(
          [argumentSummary, continuationSummary],
          {
            termKind: 'kernelOperation',
            note: `kernel operation ${term.operation}` ,
            operations: [term.operation] as const,
            ...(term.stateEffect ? { states: [term.stateEffect] as const } : {}),
          },
          (usage) => {
            usage.signatures.add(term.operation);
            if (term.stateEffect) {
              usage.states.add(term.stateEffect);
            }
            applyAnnotation(usage, term.annotation);
          },
        );
    }
    case 'kernelRaise': {
      const payloadSummary = term.payload ? summarizeValueResources(term.payload) : combineSummaries([], { termKind: 'kernelRaisePayload', note: 'no payload' });
        return combineSummaries(
          [payloadSummary],
          {
            termKind: 'kernelRaise',
            note: `kernel raise ${term.exception}` ,
            exceptions: [term.exception] as const,
          },
          (usage) => {
            usage.exceptions.add(term.exception);
          },
        );
    }
    case 'kernelSignal': {
      const payloadSummary = term.payload ? summarizeValueResources(term.payload) : combineSummaries([], { termKind: 'kernelSignalPayload', note: 'no payload' });
        return combineSummaries(
          [payloadSummary],
          {
            termKind: 'kernelSignal',
            note: `signal ${term.signal}` ,
            signals: [term.signal] as const,
          },
          (usage) => {
            usage.signals.add(term.signal);
          },
        );
    }
    case 'kernelTry': {
      const computationSummary = summarizeKernelComputationResources(term.computation);
      const returnSummary = summarizeKernelContinuation(term.returnHandler);
      const exceptionSummary = summarizeKernelExceptionHandlers(term.exceptionHandlers);
      const signalSummary = summarizeSignalHandlers(term.signalHandlers);
      return combineSummaries(
        [computationSummary, returnSummary, exceptionSummary, signalSummary],
        { termKind: 'kernelTry', note: 'kernel try' },
      );
    }
    default: {
      const _exhaustive: never = term;
      return _exhaustive;
    }
  }
}

/**
 * Converts a resource annotation into a summary. Useful for tests or when
 * recovering the metadata stored inside types.
 */
export function summarizeAnnotation(note: string, annotation?: LambdaCoopResourceAnnotation): LambdaCoopResourceSummary {
  return combineSummaries(
    [],
    {
      termKind: 'annotation',
      note,
      ...(annotation?.operations ? { operations: annotation.operations } : {}),
      ...(annotation?.exceptions ? { exceptions: annotation.exceptions } : {}),
      ...(annotation?.signals ? { signals: annotation.signals } : {}),
      ...(annotation?.states ? { states: annotation.states } : {}),
    },
    (usage) => {
      applyAnnotation(usage, annotation);
    },
  );
}

