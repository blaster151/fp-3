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

// =============================
// Figure 1 (excerpt) – extended type grammar helpers
// =============================
// We introduce opaque wrappers for runner capability blocks and kernel effect blocks so
// diagnostics and subtyping witnesses can reason about widening.

export interface LambdaCoopRunnerCapabilityType {
  readonly kind: 'runnerCapabilityType';
  readonly operations: ReadonlySet<string>;
  readonly signals: ReadonlySet<string>; // permitted signals (for supervised propagation)
  readonly stateCarrier?: string; // name/identifier of state object C
}

export interface LambdaCoopKernelEffectType {
  readonly kind: 'kernelEffectType';
  readonly operations: ReadonlySet<string>; // Σ
  readonly exceptions: ReadonlySet<string>; // E
  readonly signals: ReadonlySet<string>;    // S
  readonly stateCarrier?: string;           // C
}

export type LambdaCoopGroundType =
  | { readonly kind: 'groundUnit' }
  | { readonly kind: 'groundEmpty' }
  | { readonly kind: 'groundBase'; readonly name: string }
  | { readonly kind: 'groundProduct'; readonly left: LambdaCoopGroundType; readonly right: LambdaCoopGroundType }
  | { readonly kind: 'groundSum'; readonly left: LambdaCoopGroundType; readonly right: LambdaCoopGroundType };

// Normalise conversion of existing value type (subset) to ground shape when possible.
export function toGround(value: LambdaCoopValueType): LambdaCoopGroundType | undefined {
  switch (value.kind) {
    case 'unit': return { kind: 'groundUnit' };
    case 'empty': return { kind: 'groundEmpty' };
    case 'base': return { kind: 'groundBase', name: value.name };
    case 'product': {
      const l = toGround(value.left); const r = toGround(value.right);
      if (!l || !r) return undefined; return { kind: 'groundProduct', left: l, right: r };
    }
    case 'sum': {
      const l = toGround(value.left); const r = toGround(value.right);
      if (!l || !r) return undefined; return { kind: 'groundSum', left: l, right: r };
    }
    default: return undefined;
  }
}

// =============================
// Figure 3 – Subtyping witnesses
// =============================
export type LambdaCoopTypeForSubtyping =
  | LambdaCoopValueType
  | LambdaCoopKernelComputationType
  | LambdaCoopUserComputationType
  | LambdaCoopRunnerCapabilityType
  | LambdaCoopKernelEffectType;

export interface LambdaCoopSubtypingWitness {
  readonly rule: 'Sub-Ground' | 'Sub-Runner' | 'Sub-Kernel';
  readonly left: LambdaCoopTypeForSubtyping;
  readonly right: LambdaCoopTypeForSubtyping;
  readonly holds: boolean;
  readonly diagnostics: ReadonlyArray<string>;
}

const setIncludes = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => {
  for (const v of b) if (!a.has(v)) return false; return true;
};

export function subtypeGround(left: LambdaCoopValueType, right: LambdaCoopValueType): LambdaCoopSubtypingWitness {
  const gL = toGround(left); const gR = toGround(right);
  const holds = !!gL && !!gR && JSON.stringify(gL) === JSON.stringify(gR);
  return { rule: 'Sub-Ground', left, right, holds, diagnostics: [holds ? 'ground types identical' : 'ground types not identical'] };
}

export function subtypeRunner(left: LambdaCoopRunnerCapabilityType, right: LambdaCoopRunnerCapabilityType): LambdaCoopSubtypingWitness {
  const opsOk = setIncludes(right.operations, left.operations); // left ≤ right ⇒ right.ops ⊇ left.ops
  const sigOk = setIncludes(right.signals, left.signals);
  const stateOk = left.stateCarrier === right.stateCarrier || right.stateCarrier === undefined || left.stateCarrier === undefined ? true : left.stateCarrier === right.stateCarrier;
  const holds = opsOk && sigOk && stateOk;
  const diag: string[] = [];
  diag.push(`opsOk=${opsOk} signalsOk=${sigOk} stateOk=${stateOk}`);
  if (!opsOk) diag.push('runner operations shrink');
  if (!sigOk) diag.push('runner signals shrink');
  if (!stateOk) diag.push('state carriers mismatch');
  return { rule: 'Sub-Runner', left, right, holds, diagnostics: diag };
}

export function subtypeKernel(left: LambdaCoopKernelEffectType, right: LambdaCoopKernelEffectType): LambdaCoopSubtypingWitness {
  const opsOk = setIncludes(right.operations, left.operations);
  const excOk = setIncludes(right.exceptions, left.exceptions);
  const sigOk = setIncludes(right.signals, left.signals);
  const stateOk = left.stateCarrier === right.stateCarrier || right.stateCarrier === undefined || left.stateCarrier === undefined ? true : left.stateCarrier === right.stateCarrier;
  const holds = opsOk && excOk && sigOk && stateOk;
  const diag: string[] = [];
  diag.push(`opsOk=${opsOk} excOk=${excOk} signalsOk=${sigOk} stateOk=${stateOk}`);
  if (!opsOk) diag.push('kernel operations shrink');
  if (!excOk) diag.push('kernel exceptions shrink');
  if (!sigOk) diag.push('kernel signals shrink');
  if (!stateOk) diag.push('state carriers mismatch');
  return { rule: 'Sub-Kernel', left, right, holds, diagnostics: diag };
}

export function deriveSubtyping(left: LambdaCoopTypeForSubtyping, right: LambdaCoopTypeForSubtyping): LambdaCoopSubtypingWitness | undefined {
  // Dispatch according to Figure 3 rules only; anything else returns undefined.
  if ('kind' in left && 'kind' in right) {
    if ((left as any).kind === 'runnerCapabilityType' && (right as any).kind === 'runnerCapabilityType') return subtypeRunner(left as LambdaCoopRunnerCapabilityType, right as LambdaCoopRunnerCapabilityType);
    if ((left as any).kind === 'kernelEffectType' && (right as any).kind === 'kernelEffectType') return subtypeKernel(left as LambdaCoopKernelEffectType, right as LambdaCoopKernelEffectType);
  }
  // Ground check when both are value types reducible to ground.
  if (isValueType(left) && isValueType(right)) return subtypeGround(left, right);
  return undefined;
}

function isValueType(t: LambdaCoopTypeForSubtyping): t is LambdaCoopValueType {
  return !!t && typeof t === 'object' && 'kind' in t && (
    (t as any).kind === 'unit' || (t as any).kind === 'empty' || (t as any).kind === 'base' || (t as any).kind === 'product' || (t as any).kind === 'sum' || (t as any).kind === 'signature' || (t as any).kind === 'operation' || (t as any).kind === 'userFunctionType' || (t as any).kind === 'kernelFunctionType' || (t as any).kind === 'runnerFunctionType'
  );
}

// =============================
// Typing judgements (Figure 3) with provenance
// =============================
export interface LambdaCoopContextEntry { readonly name: string; readonly type: LambdaCoopValueType; }
export interface LambdaCoopContext { readonly entries: ReadonlyArray<LambdaCoopContextEntry>; }

export interface LambdaCoopTypingProvenanceStep { readonly note: string; readonly rule?: string; }

export interface LambdaCoopValueTyping {
  readonly kind: 'valueTyping';
  readonly context: LambdaCoopContext;
  readonly term: LambdaCoopValue;
  readonly type: LambdaCoopValueType;
  readonly provenance: ReadonlyArray<LambdaCoopTypingProvenanceStep>;
  readonly resources: LambdaCoopResourceSummary;
}

export interface LambdaCoopUserComputationTyping {
  readonly kind: 'userTyping';
  readonly context: LambdaCoopContext;
  readonly term: LambdaCoopUserComputation;
  readonly type: LambdaCoopUserComputationType; // result + resources
  readonly provenance: ReadonlyArray<LambdaCoopTypingProvenanceStep>;
  readonly resources: LambdaCoopResourceSummary;
}

export interface LambdaCoopKernelComputationTyping {
  readonly kind: 'kernelTyping';
  readonly context: LambdaCoopContext;
  readonly term: LambdaCoopKernelComputation;
  readonly type: LambdaCoopKernelComputationType;
  readonly provenance: ReadonlyArray<LambdaCoopTypingProvenanceStep>;
  readonly resources: LambdaCoopResourceSummary;
}

export type LambdaCoopTypingDerivation = LambdaCoopValueTyping | LambdaCoopUserComputationTyping | LambdaCoopKernelComputationTyping;

const emptyContext: LambdaCoopContext = { entries: [] };
export function makeContext(entries: ReadonlyArray<LambdaCoopContextEntry>): LambdaCoopContext { return { entries: [...entries] }; }

export function deriveValue(term: LambdaCoopValue, assumedType?: LambdaCoopValueType, ctx: LambdaCoopContext = emptyContext): LambdaCoopValueTyping {
  // Minimal heuristic: trust provided assumedType else fabricate base type label.
  const type = assumedType ?? { kind: 'base', name: 'Unknown' };
  const res = summarizeValueResources(term);
  return { kind: 'valueTyping', context: ctx, term, type, resources: res, provenance: [{ note: 'Value typing (placeholder)', rule: 'Ty-Value' }] };
}

export function deriveUserOp(
  ctx: LambdaCoopContext,
  operation: string,
  argument: LambdaCoopValue,
  continuation: LambdaCoopUserContinuation,
  resultType: LambdaCoopValueType,
  ambientOperations: ReadonlyArray<string>,
  exceptions: ReadonlyArray<string>,
  signals: ReadonlyArray<string>,
  stateCarrier?: string,
  annotation?: LambdaCoopResourceAnnotation,
): LambdaCoopUserComputationTyping {
  const term: LambdaCoopUserComputation = { kind: 'userOperation', operation, argument, continuation, ...(annotation ? { annotation } : {}) } as LambdaCoopUserComputation;
  const resourcesAnno: LambdaCoopResourceAnnotation = {
    operations: [operation, ...ambientOperations.filter(o => o !== operation)],
    exceptions: [...exceptions],
    signals: [...signals],
    ...(stateCarrier ? { states: [stateCarrier] } : {}),
  };
  const type: LambdaCoopUserComputationType = { kind: 'userComputationType', result: resultType, resources: resourcesAnno };
  const res = summarizeUserComputationResources(term);
  const provenance: LambdaCoopTypingProvenanceStep[] = [
    { note: `TyUser-Op uses operation ${operation}`, rule: 'TyUser-Op' },
    { note: `Requires Σ⊇{${operation}}; ambient Σ size=${ambientOperations.length}` },
  ];
  return { kind: 'userTyping', context: ctx, term, type, resources: res, provenance };
}

export function deriveKernelOp(
  ctx: LambdaCoopContext,
  operation: string,
  argument: LambdaCoopValue,
  continuation: LambdaCoopKernelContinuation,
  resultType: LambdaCoopValueType,
  operations: ReadonlyArray<string>,
  exceptions: ReadonlyArray<string>,
  signals: ReadonlyArray<string>,
  stateCarrier?: string,
  annotation?: LambdaCoopResourceAnnotation,
  stateEffect?: string,
): LambdaCoopKernelComputationTyping {
  const term: LambdaCoopKernelComputation = { kind: 'kernelOperation', operation, argument, continuation, ...(annotation ? { annotation } : {}), ...(stateEffect ? { stateEffect } : {}) } as LambdaCoopKernelComputation;
  const resourcesAnno: LambdaCoopResourceAnnotation = {
    operations: [operation, ...operations.filter(o => o !== operation)],
    exceptions: [...exceptions],
    signals: [...signals],
    ...(stateCarrier ? { states: [stateCarrier] } : {}),
  };
  const type: LambdaCoopKernelComputationType = { kind: 'kernelComputationType', result: resultType, resources: resourcesAnno };
  const res = summarizeKernelComputationResources(term);
  const provenance: LambdaCoopTypingProvenanceStep[] = [
    { note: `TyKernel-Op uses operation ${operation}`, rule: 'TyKernel-Op' },
    { note: `State carrier=${stateCarrier ?? 'none'} stateEffect=${stateEffect ?? 'none'}` },
  ];
  return { kind: 'kernelTyping', context: ctx, term, type, resources: res, provenance };
}

export function deriveUserRun(
  ctx: LambdaCoopContext,
  runnerValue: LambdaCoopValue,
  computation: LambdaCoopUserComputationTyping,
  ambientOperations: ReadonlyArray<string>,
): LambdaCoopUserComputationTyping {
  const term: LambdaCoopUserComputation = { kind: 'userRun', runner: runnerValue, computation: computation.term };
  const res = summarizeUserComputationResources(term);
  const provenance: LambdaCoopTypingProvenanceStep[] = [
    { note: 'TyUser-Run executes computation under runner', rule: 'TyUser-Run' },
    { note: `Runner must implement all operations in Σ size=${ambientOperations.length}` },
  ];
  // Preserve original type; widen if runner adds operations (placeholder logic)
  const widenedResources: LambdaCoopResourceAnnotation = {
    operations: Array.from(new Set([...(computation.type.resources.operations ?? []), ...ambientOperations])),
    ...(computation.type.resources.exceptions ? { exceptions: computation.type.resources.exceptions } : {}),
    ...(computation.type.resources.signals ? { signals: computation.type.resources.signals } : {}),
    ...(computation.type.resources.states ? { states: computation.type.resources.states } : {}),
  } as LambdaCoopResourceAnnotation;
  const type: LambdaCoopUserComputationType = { kind: 'userComputationType', result: computation.type.result, resources: widenedResources };
  return { kind: 'userTyping', context: ctx, term, type, resources: res, provenance };
}

export function deriveUserTry(
  ctx: LambdaCoopContext,
  computation: LambdaCoopUserComputationTyping,
  returnCont: LambdaCoopUserContinuation,
  exceptionHandlers: ReadonlyArray<LambdaCoopExceptionHandler>,
): LambdaCoopUserComputationTyping {
  const term: LambdaCoopUserComputation = { kind: 'userTry', computation: computation.term, returnHandler: returnCont, exceptionHandlers };
  const res = summarizeUserComputationResources(term);
  const provenance: LambdaCoopTypingProvenanceStep[] = [
    { note: 'TyUser-Try introduces handlers', rule: 'TyUser-Try' },
    { note: `Handlers for exceptions=${exceptionHandlers.map(h => h.exception).join(', ') || 'none'}` },
  ];
  const type: LambdaCoopUserComputationType = { kind: 'userComputationType', result: computation.type.result, resources: computation.type.resources };
  return { kind: 'userTyping', context: ctx, term, type, resources: res, provenance };
}

// Simple helper to snapshot runner capabilities from a runner literal value.
export function runnerCapabilitiesFromValue(value: LambdaCoopValue): LambdaCoopRunnerCapabilityType | undefined {
  if (value.kind !== 'runnerLiteral') return undefined;
  return {
    kind: 'runnerCapabilityType',
    operations: new Set(value.clauses.map(c => c.operation)),
    signals: new Set<string>(),
    stateCarrier: value.stateCarrier,
  };
}

// Diagnostics aggregator for a typing derivation.
export function describeTyping(derivation: LambdaCoopTypingDerivation): ReadonlyArray<string> {
  const lines: string[] = [];
  lines.push(`typing: kind=${derivation.kind}`);
  for (const step of derivation.provenance) lines.push(`  - ${step.rule ?? 'step'}: ${step.note}`);
  lines.push(`resources: ops=${Array.from(derivation.resources.usage.signatures).join(',') || '∅'} exc=${Array.from(derivation.resources.usage.exceptions).join(',') || '∅'} sig=${Array.from(derivation.resources.usage.signals).join(',') || '∅'} state=${Array.from(derivation.resources.usage.states).join(',') || '∅'}`);
  return lines;
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

export interface LambdaCoopUserSignalHandler {
  readonly signal: string;
  readonly body: LambdaCoopUserComputation;
}

export interface LambdaCoopUserFinaliserBundle {
  readonly returnHandler: LambdaCoopUserContinuation;
  readonly exceptionHandlers: readonly LambdaCoopExceptionHandler[];
  readonly signalHandlers: readonly LambdaCoopUserSignalHandler[] | undefined;
}

export interface LambdaCoopKernelFinaliserBundle {
  readonly returnHandler: LambdaCoopKernelContinuation;
  readonly exceptionHandlers: readonly LambdaCoopKernelExceptionHandler[];
  readonly signalHandlers?: readonly LambdaCoopSignalHandler[];
}

/** λ_{coop} user computations. */
export type LambdaCoopUserComputation =
  | LambdaCoopUserReturn
  | LambdaCoopUserApply
  | LambdaCoopUserLet
  | LambdaCoopUserOperation
  | LambdaCoopUserRun
  | LambdaCoopUserRunFinally
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

function summarizeUserSignalHandlers(
  handlers: readonly LambdaCoopUserSignalHandler[] | undefined,
): LambdaCoopResourceSummary {
  if (!handlers || handlers.length === 0) {
    return combineSummaries([], { termKind: 'userSignalHandlers', note: 'no signal handlers' });
  }
  const childSummaries = handlers.map((handler) =>
    summarizeUserComputationResources(handler.body),
  );
  return combineSummaries(
    childSummaries,
    {
      termKind: 'userSignalHandlers',
      note: `handlers for ${handlers.map((h) => h.signal).join(', ')}`,
      signals: handlers.map((h) => h.signal),
    },
  );
}

function summarizeFinaliserBundle(bundle: LambdaCoopUserFinaliserBundle): LambdaCoopResourceSummary {
  const returnSummary = summarizeUserContinuation(bundle.returnHandler);
  const exceptionSummary = summarizeExceptionHandlers(bundle.exceptionHandlers);
  const signalSummary = summarizeUserSignalHandlers(bundle.signalHandlers);
  return combineSummaries(
    [returnSummary, exceptionSummary, signalSummary],
    { termKind: 'userFinaliser', note: 'finaliser bundle' },
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
    case 'userRunFinally': {
      const runnerSummary = summarizeValueResources(term.runner);
      const computationSummary = summarizeUserComputationResources(term.computation);
      const finaliserSummary = summarizeFinaliserBundle(term.finaliser);
      return combineSummaries(
        [runnerSummary, computationSummary, finaliserSummary],
        { termKind: 'userRunFinally', note: 'run computation with finaliser' },
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

// (Phase IV runner-alignment utilities moved to lambda-coop.runner-alignment.ts to avoid heavy imports at module load.)

// =============================
// Section 4.4: λ_{coop} evaluator & rewrite system (Plan L520-L522)
// =============================
// Adds small-step / big-step hybrid evaluators for user and kernel computations with
// rule provenance, resource discipline, and support for run ... finally ..., exception
// & signal propagation, and let_{X,E} abbreviation.

// Additional syntax for finalisation and let abbreviation.
export interface LambdaCoopUserRunFinally {
  readonly kind: 'userRunFinally';
  readonly runner: LambdaCoopValue; // expected to be runnerLiteral
  readonly computation: LambdaCoopUserComputation;
  readonly finaliser: LambdaCoopUserFinaliserBundle;
}

export interface LambdaCoopUserLetAbbrev { // let_{X,E} x = M in N abbreviation
  readonly kind: 'userLetAbbrev';
  readonly binder: string;
  readonly computation: LambdaCoopUserComputation;
  readonly body: LambdaCoopUserComputation;
  readonly exceptions: readonly string[]; // E set for abbreviation expansion
}

// Extend union types
declare module './lambda-coop' { /* ambient declaration safety (no-op) */ }

// (Non-ambient augmentation; extend local unions) – reuse existing exported unions via re-export pattern if necessary.
export type LambdaCoopUserComputationExtended = LambdaCoopUserComputation | LambdaCoopUserRunFinally | LambdaCoopUserLetAbbrev;

// Reduction rule provenance
export interface LambdaCoopReductionTraceEntry {
  readonly rule: string;          // e.g. Run-Return, Run-Op, User-Let-Abbrev, Kernel-Op
  readonly note: string;          // human-readable note
  readonly beforeKind: string;    // term kind before reduction
  readonly afterKind: string;     // term kind after reduction
  readonly resourcesSnapshot: LambdaCoopResourceUsage; // snapshot after applying rule
}

export interface LambdaCoopRunFinallyEquationReport {
  readonly law: 'run-return' | 'run-exception' | 'run-signal' | 'run-error';
  readonly branch: LambdaCoopFinaliserOutcomeBranch;
  readonly term: LambdaCoopUserRunFinally;
  readonly innerResult: LambdaCoopUserEvalResult;
  readonly runResult: LambdaCoopUserEvalResult;
  readonly finaliserResult?: LambdaCoopUserEvalResult;
  readonly equivalent: boolean;
  readonly notes: ReadonlyArray<string>;
}

export interface LambdaCoopKernelFinallyEquationReport {
  readonly law: 'kernel-return' | 'kernel-exception' | 'kernel-signal';
  readonly branch: LambdaCoopFinaliserOutcomeBranch;
  readonly computation: LambdaCoopKernelComputation;
  readonly finaliser: LambdaCoopKernelFinaliserBundle;
  readonly kernelResult: LambdaCoopKernelEvalResult;
  readonly finaliserResult?: LambdaCoopKernelEvalResult;
  readonly equivalent: boolean;
  readonly notes: ReadonlyArray<string>;
}

export type LambdaCoopRunOutcome =
  | { readonly kind: 'return'; readonly value: LambdaCoopValue }
  | {
      readonly kind: 'exception';
      readonly exception: string;
      readonly payload?: LambdaCoopValue;
    }
  | { readonly kind: 'signal'; readonly signal: string; readonly payload?: LambdaCoopValue }
  | { readonly kind: 'error'; readonly error: string };

export type LambdaCoopFinaliserOutcomeBranch = 'return' | 'exception' | 'signal' | 'error';

export interface LambdaCoopFinaliserOutcomeSnapshot {
  readonly runId: string;
  readonly outcome: LambdaCoopRunOutcome;
  readonly branch: LambdaCoopFinaliserOutcomeBranch;
  readonly status: 'handled' | 'propagated' | 'error';
  readonly handler?: string;
  readonly error?: string;
}

export interface LambdaCoopFinaliserOutcomeStatusCounts {
  handled: number;
  propagated: number;
  error: number;
}

export interface LambdaCoopFinaliserOutcomeRunSummary {
  readonly runId: string;
  readonly outcomes: ReadonlyArray<LambdaCoopFinaliserOutcomeSnapshot>;
  readonly totalOutcomes: number;
  readonly handled: number;
  readonly propagated: number;
  readonly errors: number;
  readonly notes: ReadonlyArray<string>;
}

export interface LambdaCoopFinaliserOutcomeSummary {
  readonly totalRuns: number;
  readonly totalOutcomes: number;
  readonly branchCounts: Record<LambdaCoopFinaliserOutcomeBranch, number>;
  readonly statusCounts: LambdaCoopFinaliserOutcomeStatusCounts;
  readonly runs: ReadonlyArray<LambdaCoopFinaliserOutcomeRunSummary>;
  readonly guardErrors: ReadonlyArray<{
    readonly runId: string;
    readonly branch: LambdaCoopFinaliserOutcomeBranch;
    readonly handler?: string;
    readonly error: string;
  }>;
  readonly multipleOutcomes: ReadonlyArray<{ readonly runId: string; readonly count: number }>;
  readonly notes: ReadonlyArray<string>;
  readonly exactlyOnce: boolean;
}

export interface LambdaCoopUserEvalSummary {
  readonly status: LambdaCoopUserEvalResult['status'];
  readonly valueKind?: LambdaCoopValue['kind'];
  readonly exception?: string;
  readonly exceptionPayloadKind?: LambdaCoopValue['kind'];
  readonly signal?: string;
  readonly signalPayloadKind?: LambdaCoopValue['kind'];
  readonly error?: string;
  readonly operations: ReadonlyArray<string>;
  readonly traceLength: number;
  readonly finalResources: LambdaCoopResourceSummary;
  readonly finaliserSummary?: LambdaCoopFinaliserOutcomeSummary;
  readonly notes: ReadonlyArray<string>;
}

export interface LambdaCoopKernelEvalSummary {
  readonly status: LambdaCoopKernelEvalResult['status'];
  readonly valueKind?: LambdaCoopValue['kind'];
  readonly exception?: string;
  readonly exceptionPayloadKind?: LambdaCoopValue['kind'];
  readonly signal?: string;
  readonly signalPayloadKind?: LambdaCoopValue['kind'];
  readonly operations: ReadonlyArray<string>;
  readonly traceLength: number;
  readonly finalResources: LambdaCoopResourceSummary;
  readonly notes: ReadonlyArray<string>;
}

export interface LambdaCoopKernelEvalCollectionSummary {
  readonly totalEvaluations: number;
  readonly statusCounts: Record<LambdaCoopKernelEvalResult['status'], number>;
  readonly operations: ReadonlyArray<string>;
  readonly valueKinds: Readonly<Record<string, number>>;
  readonly exceptions: Readonly<Record<string, number>>;
  readonly signals: Readonly<Record<string, number>>;
  readonly exceptionPayloadKinds: Readonly<Record<string, number>>;
  readonly signalPayloadKinds: Readonly<Record<string, number>>;
  readonly trace: {
    readonly total: number;
    readonly min: number;
    readonly max: number;
    readonly average: number;
  };
  readonly notes: ReadonlyArray<string>;
}

export interface LambdaCoopUserEvalCollectionSummary {
  readonly totalEvaluations: number;
  readonly statusCounts: Record<LambdaCoopUserEvalResult['status'], number>;
  readonly operations: ReadonlyArray<string>;
  readonly valueKinds: Readonly<Record<string, number>>;
  readonly exceptions: Readonly<Record<string, number>>;
  readonly signals: Readonly<Record<string, number>>;
  readonly exceptionPayloadKinds: Readonly<Record<string, number>>;
  readonly signalPayloadKinds: Readonly<Record<string, number>>;
  readonly errors: Readonly<Record<string, number>>;
  readonly trace: {
    readonly total: number;
    readonly min: number;
    readonly max: number;
    readonly average: number;
  };
  readonly finalisers: {
    readonly totalRuns: number;
    readonly totalOutcomes: number;
    readonly statusCounts: LambdaCoopFinaliserOutcomeStatusCounts;
    readonly exactlyOnce: boolean;
  };
  readonly finaliserGuardErrors: ReadonlyArray<{
    readonly runId: string;
    readonly branch: LambdaCoopFinaliserOutcomeBranch;
    readonly handler?: string;
    readonly error: string;
  }>;
  readonly finaliserMultipleOutcomes: ReadonlyArray<{ readonly runId: string; readonly count: number }>;
  readonly finaliserNotes: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

export interface LambdaCoopUserEvalResult {
  readonly status: 'value' | 'exception' | 'signal' | 'error';
  readonly value?: LambdaCoopValue;
  readonly exception?: string;
  readonly exceptionPayload?: LambdaCoopValue;
  readonly signal?: string;
  readonly signalPayload?: LambdaCoopValue;
  readonly error?: string;
  readonly trace: ReadonlyArray<LambdaCoopReductionTraceEntry>;
  readonly finalResources: LambdaCoopResourceSummary;
  readonly operations: ReadonlyArray<string>;
  readonly finaliserOutcomes?: ReadonlyArray<LambdaCoopFinaliserOutcomeSnapshot>;
}

export interface LambdaCoopKernelEvalResult {
  readonly status: 'value' | 'exception' | 'signal';
  readonly value?: LambdaCoopValue;
  readonly exception?: string;
  readonly exceptionPayload?: LambdaCoopValue;
  readonly signal?: string;
  readonly signalPayload?: LambdaCoopValue;
  readonly trace: ReadonlyArray<LambdaCoopReductionTraceEntry>;
  readonly finalResources: LambdaCoopResourceSummary;
  readonly operations: ReadonlyArray<string>;
}

export interface LambdaCoopEvalOptions {
  readonly stepLimit?: number;
  readonly enforceRunner?: boolean;
  readonly kernelEnvironment?: LambdaCoopValue;
  readonly _finaliserContext?: LambdaCoopFinaliserContext;
}

interface LambdaCoopKernelEnvironmentState {
  value: LambdaCoopValue;
}

interface LambdaCoopFinaliserContextEntry {
  consumed: boolean;
  readonly label: string;
  readonly runId: string;
}

interface LambdaCoopFinaliserContext {
  readonly tokens: Map<symbol, LambdaCoopFinaliserContextEntry>;
  readonly stack: symbol[];
  nextId: number;
}

type LambdaCoopEvalOptionsWithFinaliserContext = LambdaCoopEvalOptions & {
  readonly _finaliserContext: LambdaCoopFinaliserContext;
};

type FinaliserInvocationError = 'finaliser-already-run' | 'finaliser-missing-token';

interface FinaliserInvocationOk<T> {
  readonly status: 'ok';
  readonly value: T;
}

interface FinaliserInvocationFailed {
  readonly status: 'error';
  readonly error: FinaliserInvocationError;
}

type FinaliserInvocationResult<T> = FinaliserInvocationOk<T> | FinaliserInvocationFailed;

function ensureFinaliserOptions(options: LambdaCoopEvalOptions): LambdaCoopEvalOptionsWithFinaliserContext {
  if ((options as LambdaCoopEvalOptionsWithFinaliserContext)._finaliserContext) {
    return options as LambdaCoopEvalOptionsWithFinaliserContext;
  }
  const context: LambdaCoopFinaliserContext = {
    tokens: new Map(),
    stack: [],
    nextId: 0,
  };
  return { ...options, _finaliserContext: context };
}

function registerFinaliserToken(context: LambdaCoopFinaliserContext, label: string): symbol {
  const token = Symbol(label);
  const runId = `${label}#${context.nextId++}`;
  context.tokens.set(token, { consumed: false, label, runId });
  return token;
}

function lookupFinaliserRunId(context: LambdaCoopFinaliserContext, token: symbol): string {
  const entry = context.tokens.get(token);
  if (!entry) {
    return 'finaliser#unknown';
  }
  return entry.runId;
}

function invokeFinaliserToken<T>(
  context: LambdaCoopFinaliserContext,
  token: symbol,
  action: () => T,
): FinaliserInvocationResult<T> {
  const entry = context.tokens.get(token);
  if (!entry) {
    return { status: 'error', error: 'finaliser-missing-token' };
  }
  if (entry.consumed) {
    return { status: 'error', error: 'finaliser-already-run' };
  }
  entry.consumed = true;
  context.stack.push(token);
  try {
    return { status: 'ok', value: action() };
  } finally {
    const popped = context.stack.pop();
    if (popped !== token) {
      // Ensure the stack remains balanced even if mismatched pops occur.
      const index = context.stack.indexOf(token);
      if (index >= 0) {
        context.stack.splice(index, 1);
      }
    }
  }
}

function completeFinaliserToken(context: LambdaCoopFinaliserContext, token: symbol): void {
  context.tokens.delete(token);
}

function summarizeRunOutcomeForFinaliser(result: LambdaCoopUserEvalResult): LambdaCoopRunOutcome {
  switch (result.status) {
    case 'value':
      return { kind: 'return', value: result.value ?? { kind: 'unitValue' } };
    case 'exception':
      return {
        kind: 'exception',
        exception: result.exception ?? 'unknown-exception',
        ...(result.exceptionPayload ? { payload: result.exceptionPayload } : {}),
      };
    case 'signal':
      return {
        kind: 'signal',
        signal: result.signal ?? 'unknown-signal',
        ...(result.signalPayload ? { payload: result.signalPayload } : {}),
      };
    default:
      return { kind: 'error', error: result.error ?? 'unexpected-status' };
  }
}

function recordFinaliserOutcome(
  target: LambdaCoopFinaliserOutcomeSnapshot[],
  runId: string,
  outcome: LambdaCoopRunOutcome,
  branch: LambdaCoopFinaliserOutcomeBranch,
  status: 'handled' | 'propagated' | 'error',
  handler?: string,
  error?: string,
): void {
  const snapshot: LambdaCoopFinaliserOutcomeSnapshot = {
    runId,
    outcome,
    branch,
    status,
    ...(handler ? { handler } : {}),
    ...(error ? { error } : {}),
  };
  target.push(snapshot);
}

export function summarizeFinaliserOutcomes(
  outcomes: ReadonlyArray<LambdaCoopFinaliserOutcomeSnapshot>,
): LambdaCoopFinaliserOutcomeSummary {
  const branchCounts: Record<LambdaCoopFinaliserOutcomeBranch, number> = {
    return: 0,
    exception: 0,
    signal: 0,
    error: 0,
  };
  const statusCounts: LambdaCoopFinaliserOutcomeStatusCounts = {
    handled: 0,
    propagated: 0,
    error: 0,
  };
  const runs = new Map<string, LambdaCoopFinaliserOutcomeSnapshot[]>();
  for (const outcome of outcomes) {
    branchCounts[outcome.branch] = (branchCounts[outcome.branch] ?? 0) + 1;
    statusCounts[outcome.status] = (statusCounts[outcome.status] ?? 0) + 1;
    const runOutcomes = runs.get(outcome.runId);
    if (runOutcomes) {
      runOutcomes.push(outcome);
    } else {
      runs.set(outcome.runId, [outcome]);
    }
  }
  const guardErrors: Array<{ runId: string; branch: LambdaCoopFinaliserOutcomeBranch; handler?: string; error: string }> = [];
  const multipleOutcomes: Array<{ runId: string; count: number }> = [];
  const notes: string[] = [];
  const summaries: LambdaCoopFinaliserOutcomeRunSummary[] = [];
  for (const [runId, snapshots] of runs) {
    const handled = snapshots.filter((snapshot) => snapshot.status === 'handled').length;
    const propagated = snapshots.filter((snapshot) => snapshot.status === 'propagated').length;
    const errors = snapshots.filter((snapshot) => snapshot.status === 'error').length;
    const runNotes: string[] = [];
    if (snapshots.length > 1) {
      runNotes.push(`multiple-finaliser-outcomes:${snapshots.length}`);
      multipleOutcomes.push({ runId, count: snapshots.length });
    }
    for (const snapshot of snapshots) {
      let detail = `branch=${snapshot.branch} status=${snapshot.status}`;
      if (snapshot.outcome.kind === 'return') {
        detail += ` value=${snapshot.outcome.value.kind}`;
      } else if (snapshot.outcome.kind === 'exception') {
        detail += ` exception=${snapshot.outcome.exception}`;
        if (snapshot.outcome.payload) {
          detail += ` payload=${snapshot.outcome.payload.kind}`;
        }
      } else if (snapshot.outcome.kind === 'signal') {
        detail += ` signal=${snapshot.outcome.signal}`;
        if (snapshot.outcome.payload) {
          detail += ` payload=${snapshot.outcome.payload.kind}`;
        }
      } else if (snapshot.outcome.kind === 'error') {
        detail += ` error=${snapshot.outcome.error}`;
      }
      detail +=
        (snapshot.handler ? ` handler=${snapshot.handler}` : '') +
        (snapshot.error ? ` error=${snapshot.error}` : '');
      runNotes.push(detail);
      if (snapshot.status === 'error') {
        guardErrors.push({
          runId,
          branch: snapshot.branch,
          ...(snapshot.handler ? { handler: snapshot.handler } : {}),
          error: snapshot.error ?? 'unknown-error',
        });
      }
    }
    notes.push(`run=${runId} ${runNotes.join(' | ')}`);
    summaries.push({
      runId,
      outcomes: snapshots,
      totalOutcomes: snapshots.length,
      handled,
      propagated,
      errors,
      notes: runNotes,
    });
  }
  const exactlyOnce = summaries.every((summary) => summary.totalOutcomes === 1 && summary.errors === 0);
  return {
    totalRuns: summaries.length,
    totalOutcomes: outcomes.length,
    branchCounts,
    statusCounts,
    runs: summaries,
    guardErrors,
    multipleOutcomes,
    notes,
    exactlyOnce,
  };
}

export function summarizeUserEvaluation(result: LambdaCoopUserEvalResult): LambdaCoopUserEvalSummary {
  const notes: string[] = [];
  const finaliserSummary =
    result.finaliserOutcomes && result.finaliserOutcomes.length > 0
      ? summarizeFinaliserOutcomes(result.finaliserOutcomes)
      : undefined;
  notes.push(`status:${result.status}`);
  if (result.value) {
    notes.push(`value:${result.value.kind}`);
  }
  if (result.exception) {
    notes.push(`exception:${result.exception}`);
  }
  if (result.exceptionPayload) {
    notes.push(`exceptionPayload:${result.exceptionPayload.kind}`);
  }
  if (result.signal) {
    notes.push(`signal:${result.signal}`);
  }
  if (result.signalPayload) {
    notes.push(`signalPayload:${result.signalPayload.kind}`);
  }
  if (result.error) {
    notes.push(`error:${result.error}`);
  }
  notes.push(`operations:${result.operations.length}`);
  if (result.operations.length > 0) {
    notes.push(`operations:list=${result.operations.join(',')}`);
  }
  notes.push(`trace:${result.trace.length}`);
  if (finaliserSummary) {
    notes.push(
      `finalisers:runs=${finaliserSummary.totalRuns} outcomes=${finaliserSummary.totalOutcomes}` +
        ` handled=${finaliserSummary.statusCounts.handled} propagated=${finaliserSummary.statusCounts.propagated}` +
        ` errors=${finaliserSummary.statusCounts.error}`,
    );
    notes.push(`finalisers:exactlyOnce=${finaliserSummary.exactlyOnce}`);
    for (const entry of finaliserSummary.guardErrors) {
      notes.push(
        `finaliser-guard run=${entry.runId} branch=${entry.branch}` +
          (entry.handler ? ` handler=${entry.handler}` : '') +
          ` error=${entry.error}`,
      );
    }
    for (const entry of finaliserSummary.multipleOutcomes) {
      notes.push(`finaliser-multiple run=${entry.runId} count=${entry.count}`);
    }
    for (const note of finaliserSummary.notes) {
      notes.push(`finaliser-note:${note}`);
    }
  } else {
    notes.push('finalisers:none');
  }
  return {
    status: result.status,
    ...(result.value ? { valueKind: result.value.kind } : {}),
    ...(result.exception ? { exception: result.exception } : {}),
    ...(result.exceptionPayload ? { exceptionPayloadKind: result.exceptionPayload.kind } : {}),
    ...(result.signal ? { signal: result.signal } : {}),
    ...(result.signalPayload ? { signalPayloadKind: result.signalPayload.kind } : {}),
    ...(result.error ? { error: result.error } : {}),
    operations: [...result.operations],
    traceLength: result.trace.length,
    finalResources: result.finalResources,
    ...(finaliserSummary ? { finaliserSummary } : {}),
    notes,
  };
}

export function summarizeUserEvaluations(
  summaries: ReadonlyArray<LambdaCoopUserEvalSummary>,
): LambdaCoopUserEvalCollectionSummary {
  if (summaries.length === 0) {
    return {
      totalEvaluations: 0,
      statusCounts: { value: 0, exception: 0, signal: 0, error: 0 },
      operations: [],
      valueKinds: {},
      exceptions: {},
      signals: {},
      exceptionPayloadKinds: {},
      signalPayloadKinds: {},
      errors: {},
      trace: { total: 0, min: 0, max: 0, average: 0 },
      finalisers: {
        totalRuns: 0,
        totalOutcomes: 0,
        statusCounts: { handled: 0, propagated: 0, error: 0 },
        exactlyOnce: true,
      },
      finaliserGuardErrors: [],
      finaliserMultipleOutcomes: [],
      finaliserNotes: [],
      notes: [],
    };
  }

  const statusCounts: Record<LambdaCoopUserEvalResult['status'], number> = {
    value: 0,
    exception: 0,
    signal: 0,
    error: 0,
  };
  const operations = new Set<string>();
  const valueKinds = new Map<string, number>();
  const exceptions = new Map<string, number>();
  const signals = new Map<string, number>();
  const exceptionPayloadKinds = new Map<string, number>();
  const signalPayloadKinds = new Map<string, number>();
  const errors = new Map<string, number>();
  const detailNotes: string[] = [];
  const finaliserNotes: string[] = [];
  const finaliserGuardErrors: Array<{
    readonly runId: string;
    readonly branch: LambdaCoopFinaliserOutcomeBranch;
    readonly handler?: string;
    readonly error: string;
  }> = [];
  const finaliserMultipleOutcomes: Array<{ readonly runId: string; readonly count: number }> = [];
  let totalTrace = 0;
  let minTrace = Number.POSITIVE_INFINITY;
  let maxTrace = 0;
  let totalFinaliserRuns = 0;
  let totalFinaliserOutcomes = 0;
  const finaliserStatusCounts: LambdaCoopFinaliserOutcomeStatusCounts = {
    handled: 0,
    propagated: 0,
    error: 0,
  };
  let finaliserExactlyOnce = true;

  summaries.forEach((summary, index) => {
    statusCounts[summary.status] += 1;
    for (const operation of summary.operations) {
      operations.add(operation);
    }
    if (summary.valueKind) {
      valueKinds.set(summary.valueKind, (valueKinds.get(summary.valueKind) ?? 0) + 1);
    }
    if (summary.exception) {
      exceptions.set(summary.exception, (exceptions.get(summary.exception) ?? 0) + 1);
    }
    if (summary.exceptionPayloadKind) {
      exceptionPayloadKinds.set(
        summary.exceptionPayloadKind,
        (exceptionPayloadKinds.get(summary.exceptionPayloadKind) ?? 0) + 1,
      );
    }
    if (summary.signal) {
      signals.set(summary.signal, (signals.get(summary.signal) ?? 0) + 1);
    }
    if (summary.signalPayloadKind) {
      signalPayloadKinds.set(
        summary.signalPayloadKind,
        (signalPayloadKinds.get(summary.signalPayloadKind) ?? 0) + 1,
      );
    }
    if (summary.error) {
      errors.set(summary.error, (errors.get(summary.error) ?? 0) + 1);
    }
    totalTrace += summary.traceLength;
    minTrace = Math.min(minTrace, summary.traceLength);
    maxTrace = Math.max(maxTrace, summary.traceLength);
    detailNotes.push(...summary.notes.map((note) => `evaluation[${index}]:${note}`));
    const finaliserSummary = summary.finaliserSummary;
    if (finaliserSummary) {
      totalFinaliserRuns += finaliserSummary.totalRuns;
      totalFinaliserOutcomes += finaliserSummary.totalOutcomes;
      finaliserStatusCounts.handled += finaliserSummary.statusCounts.handled;
      finaliserStatusCounts.propagated += finaliserSummary.statusCounts.propagated;
      finaliserStatusCounts.error += finaliserSummary.statusCounts.error;
      finaliserGuardErrors.push(...finaliserSummary.guardErrors);
      finaliserMultipleOutcomes.push(...finaliserSummary.multipleOutcomes);
      finaliserNotes.push(...finaliserSummary.notes.map((note) => `evaluation[${index}]:${note}`));
      finaliserExactlyOnce = finaliserExactlyOnce && finaliserSummary.exactlyOnce;
    } else {
      finaliserNotes.push(`evaluation[${index}]:finalisers:none`);
    }
  });

  const totalEvaluations = summaries.length;
  const valueKindCounts = mapCountEntries(valueKinds);
  const exceptionCounts = mapCountEntries(exceptions);
  const signalCounts = mapCountEntries(signals);
  const exceptionPayloadCounts = mapCountEntries(exceptionPayloadKinds);
  const signalPayloadCounts = mapCountEntries(signalPayloadKinds);
  const errorCounts = mapCountEntries(errors);
  const summaryNotes = [
    `total=${totalEvaluations}`,
    `status=${JSON.stringify(statusCounts)}`,
    `valueKinds=${JSON.stringify(valueKindCounts)}`,
    `exceptions=${JSON.stringify(exceptionCounts)}`,
    `signals=${JSON.stringify(signalCounts)}`,
    `exceptionPayloadKinds=${JSON.stringify(exceptionPayloadCounts)}`,
    `signalPayloadKinds=${JSON.stringify(signalPayloadCounts)}`,
    `errors=${JSON.stringify(errorCounts)}`,
    `operations=${JSON.stringify(Array.from(operations))}`,
    `trace=${JSON.stringify({
      total: totalTrace,
      min: Number.isFinite(minTrace) ? minTrace : 0,
      max: maxTrace,
      average: totalTrace / totalEvaluations,
    })}`,
    `finalisers=${JSON.stringify({
      totalRuns: totalFinaliserRuns,
      totalOutcomes: totalFinaliserOutcomes,
      statusCounts: finaliserStatusCounts,
      exactlyOnce: finaliserExactlyOnce,
    })}`,
  ];
  finaliserGuardErrors.forEach((entry) =>
    summaryNotes.push(
      `finaliser-guard run=${entry.runId} branch=${entry.branch}` +
        (entry.handler ? ` handler=${entry.handler}` : '') +
        ` error=${entry.error}`,
    ),
  );
  finaliserMultipleOutcomes.forEach((entry) =>
    summaryNotes.push(`finaliser-multiple run=${entry.runId} count=${entry.count}`),
  );

  return {
    totalEvaluations,
    statusCounts,
    operations: Array.from(operations),
    valueKinds: valueKindCounts,
    exceptions: exceptionCounts,
    signals: signalCounts,
    exceptionPayloadKinds: exceptionPayloadCounts,
    signalPayloadKinds: signalPayloadCounts,
    errors: errorCounts,
    trace: {
      total: totalTrace,
      min: Number.isFinite(minTrace) ? minTrace : 0,
      max: maxTrace,
      average: totalTrace / totalEvaluations,
    },
    finalisers: {
      totalRuns: totalFinaliserRuns,
      totalOutcomes: totalFinaliserOutcomes,
      statusCounts: finaliserStatusCounts,
      exactlyOnce: finaliserExactlyOnce,
    },
    finaliserGuardErrors,
    finaliserMultipleOutcomes,
    finaliserNotes,
    notes: [...summaryNotes, ...detailNotes, ...finaliserNotes],
  };
}

export function summarizeKernelEvaluation(result: LambdaCoopKernelEvalResult): LambdaCoopKernelEvalSummary {
  const notes: string[] = [];
  notes.push(`status:${result.status}`);
  if (result.value) {
    notes.push(`value:${result.value.kind}`);
  }
  if (result.exception) {
    notes.push(`exception:${result.exception}`);
  }
  if (result.exceptionPayload) {
    notes.push(`exceptionPayload:${result.exceptionPayload.kind}`);
  }
  if (result.signal) {
    notes.push(`signal:${result.signal}`);
  }
  if (result.signalPayload) {
    notes.push(`signalPayload:${result.signalPayload.kind}`);
  }
  notes.push(`operations:${result.operations.length}`);
  if (result.operations.length > 0) {
    notes.push(`operations:list=${result.operations.join(',')}`);
  }
  notes.push(`trace:${result.trace.length}`);
  return {
    status: result.status,
    ...(result.value ? { valueKind: result.value.kind } : {}),
    ...(result.exception ? { exception: result.exception } : {}),
    ...(result.exceptionPayload ? { exceptionPayloadKind: result.exceptionPayload.kind } : {}),
    ...(result.signal ? { signal: result.signal } : {}),
    ...(result.signalPayload ? { signalPayloadKind: result.signalPayload.kind } : {}),
    operations: [...result.operations],
    traceLength: result.trace.length,
    finalResources: result.finalResources,
    notes,
  };
}

function mapCountEntries(source: Map<string, number>): Record<string, number> {
  const target: Record<string, number> = {};
  for (const [key, value] of source.entries()) {
    target[key] = value;
  }
  return target;
}

export function summarizeKernelEvaluations(
  summaries: ReadonlyArray<LambdaCoopKernelEvalSummary>,
): LambdaCoopKernelEvalCollectionSummary {
  if (summaries.length === 0) {
    return {
      totalEvaluations: 0,
      statusCounts: { value: 0, exception: 0, signal: 0 },
      operations: [],
      valueKinds: {},
      exceptions: {},
      signals: {},
      exceptionPayloadKinds: {},
      signalPayloadKinds: {},
      trace: { total: 0, min: 0, max: 0, average: 0 },
      notes: [],
    };
  }
  const statusCounts: Record<LambdaCoopKernelEvalResult['status'], number> = {
    value: 0,
    exception: 0,
    signal: 0,
  };
  const operations = new Set<string>();
  const valueKinds = new Map<string, number>();
  const exceptions = new Map<string, number>();
  const signals = new Map<string, number>();
  const exceptionPayloadKinds = new Map<string, number>();
  const signalPayloadKinds = new Map<string, number>();
  const detailNotes: string[] = [];
  let totalTrace = 0;
  let minTrace = Number.POSITIVE_INFINITY;
  let maxTrace = 0;
  for (const summary of summaries) {
    statusCounts[summary.status] += 1;
    for (const operation of summary.operations) {
      operations.add(operation);
    }
    if (summary.valueKind) {
      valueKinds.set(summary.valueKind, (valueKinds.get(summary.valueKind) ?? 0) + 1);
    }
    if (summary.exception) {
      exceptions.set(summary.exception, (exceptions.get(summary.exception) ?? 0) + 1);
    }
    if (summary.exceptionPayloadKind) {
      exceptionPayloadKinds.set(
        summary.exceptionPayloadKind,
        (exceptionPayloadKinds.get(summary.exceptionPayloadKind) ?? 0) + 1,
      );
    }
    if (summary.signal) {
      signals.set(summary.signal, (signals.get(summary.signal) ?? 0) + 1);
    }
    if (summary.signalPayloadKind) {
      signalPayloadKinds.set(
        summary.signalPayloadKind,
        (signalPayloadKinds.get(summary.signalPayloadKind) ?? 0) + 1,
      );
    }
    totalTrace += summary.traceLength;
    minTrace = Math.min(minTrace, summary.traceLength);
    maxTrace = Math.max(maxTrace, summary.traceLength);
    detailNotes.push(...summary.notes.map((note) => `clause:${note}`));
  }
  const totalEvaluations = summaries.length;
  const valueKindCounts = mapCountEntries(valueKinds);
  const exceptionCounts = mapCountEntries(exceptions);
  const signalCounts = mapCountEntries(signals);
  const exceptionPayloadCounts = mapCountEntries(exceptionPayloadKinds);
  const signalPayloadCounts = mapCountEntries(signalPayloadKinds);
  const summaryNotes = [
    `total=${totalEvaluations}`,
    `status=${JSON.stringify(statusCounts)}`,
    `valueKinds=${JSON.stringify(valueKindCounts)}`,
    `exceptions=${JSON.stringify(exceptionCounts)}`,
    `signals=${JSON.stringify(signalCounts)}`,
    `exceptionPayloadKinds=${JSON.stringify(exceptionPayloadCounts)}`,
    `signalPayloadKinds=${JSON.stringify(signalPayloadCounts)}`,
    `operations=${JSON.stringify(Array.from(operations))}`,
    `trace=${JSON.stringify({ total: totalTrace, min: minTrace, max: maxTrace, average: totalTrace / totalEvaluations })}`,
  ];
  return {
    totalEvaluations,
    statusCounts,
    operations: Array.from(operations),
    valueKinds: valueKindCounts,
    exceptions: exceptionCounts,
    signals: signalCounts,
    exceptionPayloadKinds: exceptionPayloadCounts,
    signalPayloadKinds: signalPayloadCounts,
    trace: {
      total: totalTrace,
      min: Number.isFinite(minTrace) ? minTrace : 0,
      max: maxTrace,
      average: totalTrace / totalEvaluations,
    },
    notes: [...summaryNotes, ...detailNotes],
  };
}

function substituteKernelContinuation(
  continuation: LambdaCoopKernelContinuation,
  name: string,
  replacement: LambdaCoopValue,
): LambdaCoopKernelContinuation {
  if (continuation.parameter === name) {
    return continuation;
  }
  return {
    ...continuation,
    body: substituteKernelComputation(continuation.body, name, replacement),
  };
}

function substituteKernelExceptionHandlers(
  handlers: readonly LambdaCoopKernelExceptionHandler[],
  name: string,
  replacement: LambdaCoopValue,
): ReadonlyArray<LambdaCoopKernelExceptionHandler> {
  return handlers.map((handler) =>
    handler.parameter === name
      ? handler
      : {
          ...handler,
          body: substituteKernelComputation(handler.body, name, replacement),
        },
  );
}

function substituteKernelSignalHandlers(
  handlers: readonly LambdaCoopSignalHandler[] | undefined,
  name: string,
  replacement: LambdaCoopValue,
): ReadonlyArray<LambdaCoopSignalHandler> | undefined {
  if (!handlers) return handlers;
  return handlers.map((handler) => ({
    ...handler,
    body: substituteKernelComputation(handler.body, name, replacement),
  }));
}

function substituteKernelComputation(
  term: LambdaCoopKernelComputation,
  name: string,
  replacement: LambdaCoopValue,
): LambdaCoopKernelComputation {
  switch (term.kind) {
    case 'kernelReturn':
      return { ...term, value: substituteValue(term.value, name, replacement) };
    case 'kernelRaise':
      return {
        ...term,
        ...(term.payload ? { payload: substituteValue(term.payload, name, replacement) } : {}),
      };
    case 'kernelSignal':
      return {
        ...term,
        ...(term.payload ? { payload: substituteValue(term.payload, name, replacement) } : {}),
      };
    case 'kernelOperation':
      return {
        ...term,
        argument: substituteValue(term.argument, name, replacement),
        continuation: substituteKernelContinuation(term.continuation, name, replacement),
      };
    case 'kernelLet':
      return {
        ...term,
        computation: substituteKernelComputation(term.computation, name, replacement),
        body: term.binder === name ? term.body : substituteKernelComputation(term.body, name, replacement),
      };
    case 'kernelTry':
      const updatedSignalHandlers = substituteKernelSignalHandlers(
        term.signalHandlers,
        name,
        replacement,
      );
      return {
        ...term,
        computation: substituteKernelComputation(term.computation, name, replacement),
        returnHandler:
          term.returnHandler.parameter === name
            ? term.returnHandler
            : {
                ...term.returnHandler,
                body: substituteKernelComputation(term.returnHandler.body, name, replacement),
              },
        exceptionHandlers: substituteKernelExceptionHandlers(term.exceptionHandlers, name, replacement),
        ...(updatedSignalHandlers !== undefined ? { signalHandlers: updatedSignalHandlers } : {}),
      };
    default:
      return term;
  }
}

export function instantiateKernelClause(
  clause: LambdaCoopRunnerClause,
  argument: LambdaCoopValue,
): LambdaCoopKernelComputation {
  return substituteKernelComputation(clause.body, clause.parameter, argument);
}

function substituteUserContinuation(
  continuation: LambdaCoopUserContinuation,
  name: string,
  replacement: LambdaCoopValue,
): LambdaCoopUserContinuation {
  if (continuation.parameter === name) {
    return continuation;
  }
  return {
    ...continuation,
    body: substituteUserComputation(continuation.body, name, replacement),
  };
}

function substituteUserExceptionHandlers(
  handlers: readonly LambdaCoopExceptionHandler[],
  name: string,
  replacement: LambdaCoopValue,
): ReadonlyArray<LambdaCoopExceptionHandler> {
  return handlers.map((handler) =>
    handler.parameter === name
      ? handler
      : {
          ...handler,
          body: substituteUserComputation(handler.body, name, replacement),
        },
  );
}

function substituteUserSignalHandlers(
  handlers: readonly LambdaCoopUserSignalHandler[] | undefined,
  name: string,
  replacement: LambdaCoopValue,
): ReadonlyArray<LambdaCoopUserSignalHandler> | undefined {
  if (!handlers) {
    return undefined;
  }
  return handlers.map((handler) => ({
    ...handler,
    body: substituteUserComputation(handler.body, name, replacement),
  }));
}

export function substituteUserFinaliserBundle(
  bundle: LambdaCoopUserFinaliserBundle,
  name: string,
  replacement: LambdaCoopValue,
): LambdaCoopUserFinaliserBundle {
  const updatedSignalHandlers = substituteUserSignalHandlers(
    bundle.signalHandlers,
    name,
    replacement,
  );
  return {
    returnHandler: substituteUserContinuation(bundle.returnHandler, name, replacement),
    exceptionHandlers: substituteUserExceptionHandlers(bundle.exceptionHandlers, name, replacement),
    signalHandlers: updatedSignalHandlers,
  };
}

export function substituteUserComputation(
  term: LambdaCoopUserComputation,
  name: string,
  replacement: LambdaCoopValue,
): LambdaCoopUserComputation {
  switch (term.kind) {
    case 'userReturn':
      return { ...term, value: substituteValue(term.value, name, replacement) };
    case 'userOperation':
      return {
        ...term,
        argument: substituteValue(term.argument, name, replacement),
        continuation: substituteUserContinuation(term.continuation, name, replacement),
      };
    case 'userLet':
      return {
        ...term,
        computation: substituteUserComputation(term.computation, name, replacement),
        body: term.binder === name ? term.body : substituteUserComputation(term.body, name, replacement),
      };
    case 'userRaise':
      return {
        ...term,
        ...(term.payload ? { payload: substituteValue(term.payload, name, replacement) } : {}),
      };
    case 'userTry':
      return {
        ...term,
        computation: substituteUserComputation(term.computation, name, replacement),
        returnHandler: substituteUserContinuation(term.returnHandler, name, replacement),
        exceptionHandlers: substituteUserExceptionHandlers(term.exceptionHandlers, name, replacement),
      };
    case 'userRun':
      return {
        ...term,
        computation: substituteUserComputation(term.computation, name, replacement),
      };
    case 'userRunFinally':
      return {
        ...term,
        computation: substituteUserComputation(term.computation, name, replacement),
        finaliser: substituteUserFinaliserBundle(term.finaliser, name, replacement),
      };
    default:
      return term;
  }
}

function prefixKernelTrace(
  trace: readonly LambdaCoopReductionTraceEntry[],
): LambdaCoopReductionTraceEntry[] {
  return trace.map((entry) => ({
    ...entry,
    rule: entry.rule.startsWith('Kernel-') ? entry.rule : `Kernel-${entry.rule}`,
  }));
}

function evaluateUserUnderRunner(
  runner: LambdaCoopRunnerLiteral,
  computation: LambdaCoopUserComputation,
  options: LambdaCoopEvalOptions,
): LambdaCoopUserEvalResult {
  const prepared = ensureFinaliserOptions(options);
  const context = prepared._finaliserContext;
  const trace: LambdaCoopReductionTraceEntry[] = [];
  const operations: string[] = [];
  const stepLimit = Math.max(0, prepared.stepLimit ?? 512);
  let current: LambdaCoopUserComputation = computation;
  let steps = 0;
  while (steps < stepLimit) {
    steps++;
    switch (current.kind) {
      case 'userReturn': {
        const summary = summarizeUserComputationResources(current);
        tracePush(trace, 'Run-User-Return', 'return inside runner', current.kind, current.kind, summary);
        return { status: 'value', value: current.value, trace, finalResources: summary, operations };
      }
      case 'userRaise': {
        const summary = summarizeUserComputationResources(current);
        tracePush(trace, 'Run-User-Raise', `raise ${current.exception}`, current.kind, current.kind, summary);
        return {
          status: 'exception',
          exception: current.exception,
          ...(current.payload ? { exceptionPayload: current.payload } : {}),
          trace,
          finalResources: summary,
          operations,
        };
      }
      case 'userOperation': {
        const operationName = current.operation;
        const argument = current.argument;
        const continuation = current.continuation;
        operations.push(operationName);
        const summary = summarizeUserComputationResources(current);
        tracePush(trace, 'Run-User-Op', `dispatch ${operationName}`, current.kind, continuation.body.kind, summary);
        const clause = runner.clauses.find((candidate) => candidate.operation === operationName);
        if (!clause) {
          tracePush(trace, 'Run-User-Op-Missing', `no clause for ${operationName}`, current.kind, current.kind, summary);
          return {
            status: 'error',
            error: `missing-clause:${operationName}`,
            trace,
            finalResources: summary,
            operations,
          };
        }
        const substituted = substituteKernelComputation(clause.body, clause.parameter, argument);
        const kernelResult = evaluateKernel(substituted, prepared);
        trace.push(...prefixKernelTrace(kernelResult.trace));
        operations.push(...kernelResult.operations);
        if (kernelResult.status === 'value') {
          const continuationValue = kernelResult.value ?? { kind: 'unitValue' };
          current = substituteUserComputation(
            continuation.body,
            continuation.parameter,
            continuationValue,
          );
          continue;
        }
        if (kernelResult.status === 'exception') {
          return {
            status: 'exception',
            exception: kernelResult.exception ?? 'kernel-exception',
            ...(kernelResult.exceptionPayload ? { exceptionPayload: kernelResult.exceptionPayload } : {}),
            trace,
            finalResources: kernelResult.finalResources,
            operations,
          };
        }
        return {
          status: 'signal',
          signal: kernelResult.signal ?? 'kernel-signal',
          ...(kernelResult.signalPayload ? { signalPayload: kernelResult.signalPayload } : {}),
          trace,
          finalResources: kernelResult.finalResources,
          operations,
        };
      }
      case 'userLet': {
        const summary = summarizeUserComputationResources(current);
        tracePush(trace, 'Run-User-Let', `let ${current.binder}`, current.kind, current.computation.kind, summary);
        const first = evaluateUserUnderRunner(runner, current.computation, prepared);
        trace.push(...first.trace);
        operations.push(...first.operations);
        if (first.status === 'value') {
          const replacement = first.value ?? { kind: 'unitValue' };
          current = substituteUserComputation(current.body, current.binder, replacement);
          continue;
        }
        return {
          status: first.status,
          ...(first.value ? { value: first.value } : {}),
          ...(first.exception ? { exception: first.exception } : {}),
          ...(first.exceptionPayload ? { exceptionPayload: first.exceptionPayload } : {}),
          ...(first.signal ? { signal: first.signal } : {}),
          ...(first.signalPayload ? { signalPayload: first.signalPayload } : {}),
          ...(first.error ? { error: first.error } : {}),
          trace,
          finalResources: first.finalResources,
          operations,
        };
      }
      case 'userTry': {
        const summary = summarizeUserComputationResources(current);
        tracePush(trace, 'Run-User-Try', 'enter try under runner', current.kind, current.computation.kind, summary);
        const inner = evaluateUserUnderRunner(runner, current.computation, prepared);
        trace.push(...inner.trace);
        operations.push(...inner.operations);
        if (inner.status === 'value') {
          const replacement = inner.value ?? { kind: 'unitValue' };
          current = substituteUserComputation(current.returnHandler.body, current.returnHandler.parameter, replacement);
          continue;
        }
        if (inner.status === 'exception' && inner.exception) {
          const handler = current.exceptionHandlers.find((candidate) => candidate.exception === inner.exception);
          if (handler) {
            const payload = inner.exceptionPayload ?? { kind: 'unitValue' };
            current = handler.parameter
              ? substituteUserComputation(handler.body, handler.parameter, payload)
              : handler.body;
            continue;
          }
        }
        return {
          status: inner.status,
          ...(inner.value ? { value: inner.value } : {}),
          ...(inner.exception ? { exception: inner.exception } : {}),
          ...(inner.exceptionPayload ? { exceptionPayload: inner.exceptionPayload } : {}),
          ...(inner.signal ? { signal: inner.signal } : {}),
          ...(inner.signalPayload ? { signalPayload: inner.signalPayload } : {}),
          ...(inner.error ? { error: inner.error } : {}),
          trace,
          finalResources: inner.finalResources,
          operations,
        };
      }
      default: {
        const fallback = evaluateUser(current as LambdaCoopUserComputationExtended, prepared);
        trace.push(...fallback.trace);
        operations.push(...fallback.operations);
        return {
          status: fallback.status,
          ...(fallback.value ? { value: fallback.value } : {}),
          ...(fallback.exception ? { exception: fallback.exception } : {}),
          ...(fallback.exceptionPayload ? { exceptionPayload: fallback.exceptionPayload } : {}),
          ...(fallback.signal ? { signal: fallback.signal } : {}),
          ...(fallback.signalPayload ? { signalPayload: fallback.signalPayload } : {}),
          ...(fallback.error ? { error: fallback.error } : {}),
          ...(fallback.finaliserOutcomes ? { finaliserOutcomes: fallback.finaliserOutcomes } : {}),
          trace,
          finalResources: fallback.finalResources,
          operations,
        };
      }
    }
  }
  const summary = summarizeUserComputationResources(current);
  tracePush(trace, 'Run-StepLimit', 'step limit exceeded', current.kind, current.kind, summary);
  return { status: 'error', error: 'stepLimit', trace, finalResources: summary, operations };
}

export function evaluateUserComputationUnderRunner(
  runner: LambdaCoopRunnerLiteral,
  computation: LambdaCoopUserComputation,
  options: LambdaCoopEvalOptions = {},
): LambdaCoopUserEvalResult {
  return evaluateUserUnderRunner(runner, computation, options);
}

// Utility: shallow substitution in values (variables only)
function substituteValue(v: LambdaCoopValue, name: string, replacement: LambdaCoopValue): LambdaCoopValue {
  switch (v.kind) {
    case 'variable': return v.name === name ? replacement : v;
    case 'pair': return { kind: 'pair', left: substituteValue(v.left, name, replacement), right: substituteValue(v.right, name, replacement) };
    case 'inl': return { kind: 'inl', value: substituteValue(v.value, name, replacement) };
    case 'inr': return { kind: 'inr', value: substituteValue(v.value, name, replacement) };
    default: return v;
  }
}

function snapshot(usage: LambdaCoopResourceUsage): LambdaCoopResourceUsage {
  return {
    signatures: new Set(usage.signatures),
    exceptions: new Set(usage.exceptions),
    signals: new Set(usage.signals),
    states: new Set(usage.states),
  };
}

function tracePush(trace: LambdaCoopReductionTraceEntry[], rule: string, note: string, beforeKind: string, afterKind: string, summary: LambdaCoopResourceSummary) {
  trace.push({ rule, note, beforeKind, afterKind, resourcesSnapshot: snapshot(summary.usage) });
}

// Expand let_{X,E} abbreviation into try structure: let_{X,E} x = M in N ↦ try M with return x ↦ N; raise e ↦ raise e
export function expandUserLetAbbrev(abbrev: LambdaCoopUserLetAbbrev): LambdaCoopUserComputation {
  const handlers: LambdaCoopExceptionHandler[] = abbrev.exceptions.map(e => ({ exception: e, body: { kind: 'userRaise', exception: e } }));
  return { kind: 'userTry', computation: abbrev.computation, returnHandler: { parameter: abbrev.binder, body: abbrev.body }, exceptionHandlers: handlers };
}

// Kernel evaluation (simplified big-step with trace)
export function evaluateKernel(
  term: LambdaCoopKernelComputation,
  options: LambdaCoopEvalOptions = {},
): LambdaCoopKernelEvalResult {
  const environmentState: LambdaCoopKernelEnvironmentState = {
    value: options.kernelEnvironment ?? { kind: 'unitValue' },
  };
  return evaluateKernelWithEnvironment(term, options, environmentState);
}

function evaluateKernelWithEnvironment(
  term: LambdaCoopKernelComputation,
  options: LambdaCoopEvalOptions,
  environmentState: LambdaCoopKernelEnvironmentState,
): LambdaCoopKernelEvalResult {
  const trace: LambdaCoopReductionTraceEntry[] = [];
  const stepLimit = Math.max(0, options.stepLimit ?? 512);
  let current: LambdaCoopKernelComputation = term;
  let steps = 0;
  const operations: string[] = [];
  while (steps < stepLimit) {
    steps++;
    switch (current.kind) {
      case 'kernelReturn': {
        const summary = summarizeKernelComputationResources(current);
        tracePush(trace, 'Kernel-Return', 'return value', current.kind, current.kind, summary);
        return { status: 'value', value: current.value, trace, finalResources: summary, operations };
      }
      case 'kernelRaise': {
        const summary = summarizeKernelComputationResources(current);
        tracePush(trace, 'Kernel-Raise', `raise ${current.exception}`, current.kind, current.kind, summary);
        return {
          status: 'exception',
          exception: current.exception,
          ...(current.payload ? { exceptionPayload: current.payload } : {}),
          trace,
          finalResources: summary,
          operations,
        };
      }
      case 'kernelSignal': {
        const summary = summarizeKernelComputationResources(current);
        tracePush(trace, 'Kernel-Signal', `signal ${current.signal}`, current.kind, current.kind, summary);
        return {
          status: 'signal',
          signal: current.signal,
          ...(current.payload ? { signalPayload: current.payload } : {}),
          trace,
          finalResources: summary,
          operations,
        };
      }
      case 'kernelOperation': {
        operations.push(current.operation);
        const summaryBefore = summarizeKernelComputationResources(current);
        let continuationArgument: LambdaCoopValue = current.argument;
        if (current.operation === 'getenv') {
          continuationArgument = environmentState.value;
        } else if (current.operation === 'setenv') {
          environmentState.value = current.argument;
          continuationArgument = { kind: 'unitValue' };
        }
        const contBody = substituteKernelComputation(
          current.continuation.body,
          current.continuation.parameter,
          continuationArgument,
        );
        tracePush(
          trace,
          'Kernel-Op',
          `invoke kernel op ${current.operation}`,
          current.kind,
          contBody.kind,
          summaryBefore,
        );
        current = contBody;
        continue;
      }
      case 'kernelLet': {
        const summaryBefore = summarizeKernelComputationResources(current);
        tracePush(trace, 'Kernel-Let', `let ${current.binder}`, current.kind, current.computation.kind, summaryBefore);
        const first = evaluateKernelWithEnvironment(current.computation, options, environmentState);
        trace.push(...first.trace);
        operations.push(...first.operations);
        if (first.status === 'value') {
          const replacement = first.value ?? { kind: 'unitValue' };
          current = substituteKernelComputation(current.body, current.binder, replacement);
          continue;
        }
        if (first.status === 'exception') {
          return {
            status: 'exception',
            exception: first.exception ?? 'kernel-exception',
            ...(first.exceptionPayload ? { exceptionPayload: first.exceptionPayload } : {}),
            trace,
            finalResources: first.finalResources,
            operations,
          };
        }
        return {
          status: 'signal',
          signal: first.signal ?? 'kernel-signal',
          ...(first.signalPayload ? { signalPayload: first.signalPayload } : {}),
          trace,
          finalResources: first.finalResources,
          operations,
        };
      }
      case 'kernelTry': {
        const summaryBefore = summarizeKernelComputationResources(current);
        tracePush(trace, 'Kernel-Try', 'enter kernel try', current.kind, current.computation.kind, summaryBefore);
        const inner = evaluateKernelWithEnvironment(current.computation, options, environmentState);
        trace.push(...inner.trace);
        operations.push(...inner.operations);
        if (inner.status === 'value') {
          const replacement = inner.value ?? { kind: 'unitValue' };
          const handlerBody = substituteKernelComputation(
            current.returnHandler.body,
            current.returnHandler.parameter,
            replacement,
          );
          tracePush(
            trace,
            'Kernel-Try-Return',
            'return handler',
            current.computation.kind,
            handlerBody.kind,
            summaryBefore,
          );
          current = handlerBody;
          continue;
        }
        if (inner.status === 'exception' && inner.exception) {
          const handler = current.exceptionHandlers.find((candidate) => candidate.exception === inner.exception);
          if (handler) {
            const payload = inner.exceptionPayload ?? { kind: 'unitValue' };
            const handlerBody = handler.parameter
              ? substituteKernelComputation(handler.body, handler.parameter, payload)
              : handler.body;
            tracePush(
              trace,
              'Kernel-Try-Exception',
              `handle ${inner.exception}`,
              current.computation.kind,
              handlerBody.kind,
              summaryBefore,
            );
            current = handlerBody;
            continue;
          }
          return {
            status: 'exception',
            exception: inner.exception,
            ...(inner.exceptionPayload ? { exceptionPayload: inner.exceptionPayload } : {}),
            trace,
            finalResources: inner.finalResources,
            operations,
          };
        }
        if (inner.status === 'signal' && inner.signal) {
          const handler = current.signalHandlers?.find((candidate) => candidate.signal === inner.signal);
          if (handler) {
            const handlerBody = handler.body;
            tracePush(
              trace,
              'Kernel-Try-Signal',
              `handle ${inner.signal}`,
              current.computation.kind,
              handlerBody.kind,
              summaryBefore,
            );
            current = handlerBody;
            continue;
          }
          return {
            status: 'signal',
            signal: inner.signal,
            ...(inner.signalPayload ? { signalPayload: inner.signalPayload } : {}),
            trace,
            finalResources: inner.finalResources,
            operations,
          };
        }
        return {
          status: inner.status,
          ...(inner.exception ? { exception: inner.exception } : {}),
          ...(inner.exceptionPayload ? { exceptionPayload: inner.exceptionPayload } : {}),
          ...(inner.signal ? { signal: inner.signal } : {}),
          ...(inner.signalPayload ? { signalPayload: inner.signalPayload } : {}),
          trace,
          finalResources: inner.finalResources,
          operations,
        };
      }
      default: {
        const summary = summarizeKernelComputationResources(current);
        tracePush(trace, 'Kernel-Stuck', 'no rule applies', current.kind, current.kind, summary);
          return { status: 'signal', signal: 'stuck', trace, finalResources: summary, operations };
      }
    }
  }
  const summary = summarizeKernelComputationResources(current);
  tracePush(trace, 'Kernel-StepLimit', 'step limit exceeded', current.kind, current.kind, summary);
    return { status: 'signal', signal: 'stepLimit', trace, finalResources: summary, operations };
}

export function evaluateUser(term: LambdaCoopUserComputationExtended, options: LambdaCoopEvalOptions = {}): LambdaCoopUserEvalResult {
  const prepared = ensureFinaliserOptions(options);
  const context = prepared._finaliserContext;
  const trace: LambdaCoopReductionTraceEntry[] = [];
  const stepLimit = Math.max(0, prepared.stepLimit ?? 512);
  let current: LambdaCoopUserComputationExtended = term;
  let steps = 0;
  const operations: string[] = [];
  const finaliserOutcomes: LambdaCoopFinaliserOutcomeSnapshot[] = [];
  const finalizeResult = (result: LambdaCoopUserEvalResult): LambdaCoopUserEvalResult =>
    finaliserOutcomes.length === 0 ? result : { ...result, finaliserOutcomes };
  const absorbFinaliserOutcomes = (result: LambdaCoopUserEvalResult): void => {
    if (result.finaliserOutcomes && result.finaliserOutcomes.length > 0) {
      finaliserOutcomes.push(...result.finaliserOutcomes);
    }
  };
  while (steps < stepLimit) {
    steps++;
    switch (current.kind) {
      case 'userReturn': {
        const summary = summarizeUserComputationResources(current);
        tracePush(trace, 'User-Return', 'return value', current.kind, current.kind, summary);
        return finalizeResult({ status: 'value', value: current.value, trace, finalResources: summary, operations });
      }
      case 'userRaise': {
        const summary = summarizeUserComputationResources(current);
        tracePush(trace, 'User-Raise', `raise ${current.exception}`, current.kind, current.kind, summary);
        return finalizeResult({
          status: 'exception',
          exception: current.exception,
          ...(current.payload ? { exceptionPayload: current.payload } : {}),
          trace,
          finalResources: summary,
          operations,
        });
      }
      case 'userOperation': {
          operations.push(current.operation);
        tracePush(trace, 'User-Op', `user op ${current.operation}`, current.kind, current.continuation.body.kind, summarizeUserComputationResources(current));
        current = current.continuation.body; continue;
      }
      case 'userLet': {
        tracePush(trace, 'User-Let', `let ${current.binder}`, current.kind, current.computation.kind, summarizeUserComputationResources(current));
        const first = evaluateUser(current.computation, prepared);
        trace.push(...first.trace);
        operations.push(...first.operations);
        absorbFinaliserOutcomes(first);
        if (first.status === 'value') {
          const replacement = first.value ?? { kind: 'unitValue' };
          current = substituteUserComputation(current.body, current.binder, replacement);
          continue;
        }
        if (first.status === 'exception') {
          return finalizeResult({
            status: 'exception',
            exception: first.exception as string,
            ...(first.exceptionPayload ? { exceptionPayload: first.exceptionPayload } : {}),
            trace,
            finalResources: first.finalResources,
            operations,
          });
        }
        if (first.status === 'signal') {
          return finalizeResult({
            status: 'signal',
            signal: first.signal as string,
            ...(first.signalPayload ? { signalPayload: first.signalPayload } : {}),
            trace,
            finalResources: first.finalResources,
            operations,
          });
        }
        return finalizeResult({
          status: 'error',
          error: first.error ?? 'error',
          trace,
          finalResources: first.finalResources,
          operations,
        });
      }
      case 'userTry': {
        tracePush(trace, 'User-Try', 'enter user try', current.kind, current.computation.kind, summarizeUserComputationResources(current));
        const inner = evaluateUser(current.computation, prepared);
        trace.push(...inner.trace);
        operations.push(...inner.operations);
        absorbFinaliserOutcomes(inner);
        if (inner.status === 'value') {
          const replacement = inner.value ?? { kind: 'unitValue' };
          const handlerBody = substituteUserComputation(
            current.returnHandler.body,
            current.returnHandler.parameter,
            replacement,
          );
          tracePush(
            trace,
            'User-Try-Return',
            'return handler',
            current.computation.kind,
            handlerBody.kind,
            summarizeUserComputationResources(current),
          );
          current = handlerBody;
          continue;
        }
        if (inner.status === 'exception') {
          const handler = current.exceptionHandlers.find((candidate) => candidate.exception === inner.exception);
          if (handler) {
            const payload = inner.exceptionPayload ?? { kind: 'unitValue' };
            const handlerBody = handler.parameter
              ? substituteUserComputation(handler.body, handler.parameter, payload)
              : handler.body;
            tracePush(
              trace,
              'User-Try-Exception',
              `handle ${inner.exception}`,
              current.computation.kind,
              handlerBody.kind,
              summarizeUserComputationResources(current),
            );
            current = handlerBody;
            continue;
          }
          return finalizeResult({
            status: 'exception',
            exception: inner.exception as string,
            ...(inner.exceptionPayload ? { exceptionPayload: inner.exceptionPayload } : {}),
            trace,
            finalResources: inner.finalResources,
            operations,
          });
        }
        if (inner.status === 'signal') {
          return finalizeResult({
            status: 'signal',
            signal: inner.signal as string,
            ...(inner.signalPayload ? { signalPayload: inner.signalPayload } : {}),
            trace,
            finalResources: inner.finalResources,
            operations,
          });
        }
        return finalizeResult({
          status: 'error',
          error: 'unexpected-status',
          trace,
          finalResources: inner.finalResources,
          operations,
        });
      }
      case 'userRun': {
        const summaryBefore = summarizeUserComputationResources(current);
        tracePush(trace, 'User-Run', 'run under runner', current.kind, current.computation.kind, summaryBefore);
        if (current.runner.kind !== 'runnerLiteral') {
          if (options.enforceRunner) {
            return finalizeResult({
              status: 'error',
              error: 'runner-not-literal',
              trace,
              finalResources: summaryBefore,
              operations,
            });
          }
          current = current.computation;
          continue;
        }
        const runResult = evaluateUserUnderRunner(current.runner, current.computation, prepared);
        trace.push(...runResult.trace);
        operations.push(...runResult.operations);
        absorbFinaliserOutcomes(runResult);
        return finalizeResult({
          status: runResult.status,
          ...(runResult.value ? { value: runResult.value } : {}),
          ...(runResult.exception ? { exception: runResult.exception } : {}),
          ...(runResult.exceptionPayload ? { exceptionPayload: runResult.exceptionPayload } : {}),
          ...(runResult.signal ? { signal: runResult.signal } : {}),
          ...(runResult.signalPayload ? { signalPayload: runResult.signalPayload } : {}),
          ...(runResult.error ? { error: runResult.error } : {}),
          trace,
          finalResources: runResult.finalResources,
          operations,
        });
      }
      case 'userRunFinally': {
        const summaryBefore = summarizeUserComputationResources(current);
        if (context.stack.length > 0) {
          tracePush(
            trace,
            'User-Run-Finally-Reentrant',
            'finaliser execution is already in progress',
            current.kind,
            current.kind,
            summaryBefore,
          );
          return finalizeResult({
            status: 'error',
            error: 'finaliser-reentrancy',
            trace,
            finalResources: summaryBefore,
            operations,
          });
        }
        tracePush(trace, 'User-Run-Finally', 'run with finaliser', current.kind, current.computation.kind, summaryBefore);
        if (current.runner.kind !== 'runnerLiteral') {
          return finalizeResult({
            status: 'error',
            error: 'runner-not-literal',
            trace,
            finalResources: summaryBefore,
            operations,
          });
        }
        const finaliserToken = registerFinaliserToken(context, 'user-run-finally');
        const runResult = evaluateUserUnderRunner(current.runner, current.computation, prepared);
        trace.push(...runResult.trace);
        operations.push(...runResult.operations);
        absorbFinaliserOutcomes(runResult);
        const finaliser = current.finaliser;
        const unitFallback: LambdaCoopValue = { kind: 'unitValue' };
        const runOutcome = summarizeRunOutcomeForFinaliser(runResult);
        const runId = lookupFinaliserRunId(context, finaliserToken);
        const finishWithOutcome = (
          partial: LambdaCoopUserEvalResult,
          branch: LambdaCoopFinaliserOutcomeBranch,
          status: 'handled' | 'propagated' | 'error',
          handler?: string,
          errorNote?: string,
        ): LambdaCoopUserEvalResult => {
          recordFinaliserOutcome(finaliserOutcomes, runId, runOutcome, branch, status, handler, errorNote);
          completeFinaliserToken(context, finaliserToken);
          return finalizeResult(partial);
        };
        switch (runResult.status) {
          case 'value': {
            const substituted = substituteUserComputation(
              finaliser.returnHandler.body,
              finaliser.returnHandler.parameter,
              runResult.value ?? unitFallback,
            );
            const branchSummary = summarizeUserComputationResources(substituted);
            tracePush(
              trace,
              'User-Run-Finally-Return',
              'dispatch return finaliser',
              current.kind,
              substituted.kind,
              branchSummary,
            );
            const invocation = invokeFinaliserToken(context, finaliserToken, () =>
              evaluateUser(substituted, prepared),
            );
            if (invocation.status === 'error') {
              tracePush(
                trace,
                'User-Run-Finally-Guard',
                `finaliser ${invocation.error}`,
                current.kind,
                substituted.kind,
                branchSummary,
              );
              return finishWithOutcome(
                {
                  status: 'error',
                  error: invocation.error,
                  trace,
                  finalResources: branchSummary,
                  operations,
                },
                'return',
                'error',
                'return',
                invocation.error,
              );
            }
            const evaluated = invocation.value;
            trace.push(...evaluated.trace);
            operations.push(...evaluated.operations);
            absorbFinaliserOutcomes(evaluated);
            return finishWithOutcome(
              {
                ...evaluated,
                trace,
                operations,
              },
              'return',
              'handled',
              'return',
            );
          }
          case 'exception': {
            if (!runResult.exception) {
              return finishWithOutcome(
                {
                  status: 'error',
                  error: 'missing-exception',
                  trace,
                  finalResources: runResult.finalResources,
                  operations,
                },
                'exception',
                'error',
                'exception:unknown',
                'missing-exception',
              );
            }
            const handler = finaliser.exceptionHandlers.find(
              (candidate) => candidate.exception === runResult.exception,
            );
            if (!handler) {
              return finishWithOutcome(
                {
                  status: 'exception',
                  exception: runResult.exception,
                  ...(runResult.exceptionPayload ? { exceptionPayload: runResult.exceptionPayload } : {}),
                  trace,
                  finalResources: runResult.finalResources,
                  operations,
                },
                'exception',
                'propagated',
                `exception:${runResult.exception}`,
              );
            }
            const substituted = handler.parameter
              ? substituteUserComputation(
                  handler.body,
                  handler.parameter,
                  runResult.exceptionPayload ?? unitFallback,
                )
              : handler.body;
            const branchSummary = summarizeUserComputationResources(substituted);
            tracePush(
              trace,
              'User-Run-Finally-Exception',
              `dispatch ${runResult.exception} finaliser`,
              current.kind,
              substituted.kind,
              branchSummary,
            );
            const invocation = invokeFinaliserToken(context, finaliserToken, () =>
              evaluateUser(substituted, prepared),
            );
            if (invocation.status === 'error') {
              tracePush(
                trace,
                'User-Run-Finally-Guard',
                `finaliser ${invocation.error}`,
                current.kind,
                substituted.kind,
                branchSummary,
              );
              return finishWithOutcome(
                {
                  status: 'error',
                  error: invocation.error,
                  trace,
                  finalResources: branchSummary,
                  operations,
                },
                'exception',
                'error',
                `exception:${runResult.exception}`,
                invocation.error,
              );
            }
            const evaluated = invocation.value;
            trace.push(...evaluated.trace);
            operations.push(...evaluated.operations);
            absorbFinaliserOutcomes(evaluated);
            return finishWithOutcome(
              {
                ...evaluated,
                trace,
                operations,
              },
              'exception',
              'handled',
              `exception:${runResult.exception}`,
            );
          }
          case 'signal': {
            if (!runResult.signal) {
              return finishWithOutcome(
                {
                  status: 'error',
                  error: 'missing-signal',
                  trace,
                  finalResources: runResult.finalResources,
                  operations,
                },
                'signal',
                'error',
                'signal:unknown',
                'missing-signal',
              );
            }
            const handler = finaliser.signalHandlers?.find(
              (candidate) => candidate.signal === runResult.signal,
            );
            if (!handler) {
              return finishWithOutcome(
                {
                  status: 'signal',
                  signal: runResult.signal,
                  ...(runResult.signalPayload ? { signalPayload: runResult.signalPayload } : {}),
                  trace,
                  finalResources: runResult.finalResources,
                  operations,
                },
                'signal',
                'propagated',
                `signal:${runResult.signal}`,
              );
            }
            const branchSummary = summarizeUserComputationResources(handler.body);
            tracePush(
              trace,
              'User-Run-Finally-Signal',
              `dispatch ${runResult.signal} finaliser`,
              current.kind,
              handler.body.kind,
              branchSummary,
            );
            const invocation = invokeFinaliserToken(context, finaliserToken, () =>
              evaluateUser(handler.body, prepared),
            );
            if (invocation.status === 'error') {
              tracePush(
                trace,
                'User-Run-Finally-Guard',
                `finaliser ${invocation.error}`,
                current.kind,
                handler.body.kind,
                branchSummary,
              );
              return finishWithOutcome(
                {
                  status: 'error',
                  error: invocation.error,
                  trace,
                  finalResources: branchSummary,
                  operations,
                },
                'signal',
                'error',
                `signal:${runResult.signal}`,
                invocation.error,
              );
            }
            const evaluated = invocation.value;
            trace.push(...evaluated.trace);
            operations.push(...evaluated.operations);
            absorbFinaliserOutcomes(evaluated);
            return finishWithOutcome(
              {
                ...evaluated,
                trace,
                operations,
              },
              'signal',
              'handled',
              `signal:${runResult.signal}`,
            );
          }
          case 'error':
          default:
            return finishWithOutcome(
              {
                status: runResult.status,
                ...(runResult.value ? { value: runResult.value } : {}),
                ...(runResult.exception ? { exception: runResult.exception } : {}),
                ...(runResult.exceptionPayload ? { exceptionPayload: runResult.exceptionPayload } : {}),
                ...(runResult.signal ? { signal: runResult.signal } : {}),
                ...(runResult.signalPayload ? { signalPayload: runResult.signalPayload } : {}),
                ...(runResult.error ? { error: runResult.error } : {}),
                trace,
                finalResources: runResult.finalResources,
                operations,
              },
              'error',
              'propagated',
            );
        }
      }
      case 'userLetAbbrev': {
        const expanded = expandUserLetAbbrev(current as LambdaCoopUserLetAbbrev);
        tracePush(trace, 'User-Let-Abbrev', 'expand abbreviation', current.kind, expanded.kind, summarizeUserComputationResources(current.computation));
        current = expanded; continue;
      }
      default: {
          const summary = summarizeUserComputationResources(current as LambdaCoopUserComputation);
          tracePush(trace, 'User-Stuck', 'no rule applies', current.kind, current.kind, summary);
          return finalizeResult({ status: 'error', error: 'stuck', trace, finalResources: summary, operations });
      }
    }
  }
    const summary = summarizeUserComputationResources(current as LambdaCoopUserComputation);
    tracePush(trace, 'User-StepLimit', 'step limit exceeded', current.kind, current.kind, summary);
    return finalizeResult({ status: 'error', error: 'stepLimit', trace, finalResources: summary, operations });
}

// Describe evaluation trace for oracle diagnostics.
export function describeUserEval(result: LambdaCoopUserEvalResult): ReadonlyArray<string> {
  const lines: string[] = [];
  lines.push(
    `user-eval status=${result.status}` +
      (result.value ? ` valueKind=${result.value.kind}` : "") +
      (result.exception ? ` exception=${result.exception}` : "") +
      (result.exceptionPayload ? ` exceptionPayload=${result.exceptionPayload.kind}` : "") +
      (result.signal ? ` signal=${result.signal}` : "") +
      (result.signalPayload ? ` signalPayload=${result.signalPayload.kind}` : "") +
      (result.error ? ` error=${result.error}` : ""),
  );
  if (result.operations.length > 0) {
    lines.push(`  operations=${result.operations.join(", ")}`);
  }
  if (result.finaliserOutcomes && result.finaliserOutcomes.length > 0) {
    const summary = summarizeFinaliserOutcomes(result.finaliserOutcomes);
    lines.push(
      `  finalisers totalRuns=${summary.totalRuns} totalOutcomes=${summary.totalOutcomes} ` +
        `handled=${summary.statusCounts.handled} propagated=${summary.statusCounts.propagated} errors=${summary.statusCounts.error} ` +
        `exactlyOnce=${summary.exactlyOnce}`,
    );
    for (const run of summary.runs) {
      lines.push(
        `    run=${run.runId} total=${run.totalOutcomes} handled=${run.handled} propagated=${run.propagated} errors=${run.errors}`,
      );
      for (const outcome of run.outcomes) {
        let outcomeNote = `outcome=${outcome.outcome.kind}`;
        if (outcome.outcome.kind === 'return') {
          outcomeNote += ` value=${outcome.outcome.value.kind}`;
        } else if (outcome.outcome.kind === 'exception') {
          outcomeNote += ` exception=${outcome.outcome.exception}`;
          if (outcome.outcome.payload) {
            outcomeNote += ` payload=${outcome.outcome.payload.kind}`;
          }
        } else if (outcome.outcome.kind === 'signal') {
          outcomeNote += ` signal=${outcome.outcome.signal}`;
          if (outcome.outcome.payload) {
            outcomeNote += ` payload=${outcome.outcome.payload.kind}`;
          }
        } else if (outcome.outcome.kind === 'error') {
          outcomeNote += ` error=${outcome.outcome.error}`;
        }
        lines.push(
          `      branch=${outcome.branch} status=${outcome.status}` +
            (outcome.handler ? ` handler=${outcome.handler}` : '') +
            ` ${outcomeNote}` +
            (outcome.error ? ` guardError=${outcome.error}` : ''),
        );
      }
    }
  }
  for (const t of result.trace) {
    lines.push(
      `  rule=${t.rule} note=${t.note} before=${t.beforeKind} after=${t.afterKind} ops=${Array.from(
        t.resourcesSnapshot.signatures,
      ).join(",") || "∅"}`,
    );
  }
  return lines;
}

export function describeKernelEval(result: LambdaCoopKernelEvalResult): ReadonlyArray<string> {
  const lines: string[] = [];
  const summary = summarizeKernelEvaluation(result);
  lines.push(
    `kernel-eval status=${summary.status}` +
      (summary.valueKind ? ` valueKind=${summary.valueKind}` : "") +
      (summary.exception ? ` exception=${summary.exception}` : "") +
      (summary.exceptionPayloadKind ? ` exceptionPayload=${summary.exceptionPayloadKind}` : "") +
      (summary.signal ? ` signal=${summary.signal}` : "") +
      (summary.signalPayloadKind ? ` signalPayload=${summary.signalPayloadKind}` : ""),
  );
  if (summary.operations.length > 0) {
    lines.push(`  operations=${summary.operations.join(", ")}`);
  }
  for (const note of summary.notes) {
    lines.push(`  note=${note}`);
  }
  for (const t of result.trace) {
    lines.push(
      `  rule=${t.rule} note=${t.note} before=${t.beforeKind} after=${t.afterKind} ops=${Array.from(
        t.resourcesSnapshot.signatures,
      ).join(",") || "∅"}`,
    );
  }
  return lines;
}

function lambdaCoopValuesEqual(left?: LambdaCoopValue, right?: LambdaCoopValue): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  if (left.kind !== right.kind) {
    return false;
  }
  switch (left.kind) {
    case 'unitValue':
      return true;
    case 'constant':
      return left.label === (right as LambdaCoopConstant).label;
    case 'variable':
      return left.name === (right as LambdaCoopVariable).name;
    case 'pair': {
      const candidate = right as LambdaCoopPair;
      return (
        lambdaCoopValuesEqual(left.left, candidate.left) &&
        lambdaCoopValuesEqual(left.right, candidate.right)
      );
    }
    case 'inl':
      return lambdaCoopValuesEqual(left.value, (right as LambdaCoopInl).value);
    case 'inr':
      return lambdaCoopValuesEqual(left.value, (right as LambdaCoopInr).value);
    default:
      return false;
  }
}

function userEvalResultsEquivalent(
  left: LambdaCoopUserEvalResult,
  right: LambdaCoopUserEvalResult,
): boolean {
  if (left.status !== right.status) {
    return false;
  }
  switch (left.status) {
    case 'value':
      return lambdaCoopValuesEqual(left.value, right.value);
    case 'exception':
      return (
        left.exception === right.exception &&
        lambdaCoopValuesEqual(left.exceptionPayload, right.exceptionPayload)
      );
    case 'signal':
      return (
        left.signal === right.signal &&
        lambdaCoopValuesEqual(left.signalPayload, right.signalPayload)
      );
    case 'error':
    default:
      return left.error === right.error;
  }
}

function kernelEvalResultsEquivalent(
  left: LambdaCoopKernelEvalResult,
  right: LambdaCoopKernelEvalResult,
): boolean {
  if (left.status !== right.status) {
    return false;
  }
  switch (left.status) {
    case 'value':
      return lambdaCoopValuesEqual(left.value, right.value);
    case 'exception':
      return (
        left.exception === right.exception &&
        lambdaCoopValuesEqual(left.exceptionPayload, right.exceptionPayload)
      );
    case 'signal':
      return (
        left.signal === right.signal &&
        lambdaCoopValuesEqual(left.signalPayload, right.signalPayload)
      );
    default:
      return false;
  }
}

function instantiateFinaliserBranch(
  bundle: LambdaCoopUserFinaliserBundle,
  branch: LambdaCoopFinaliserOutcomeBranch,
  inner: LambdaCoopUserEvalResult,
): LambdaCoopUserComputation | undefined {
  const unitFallback: LambdaCoopValue = { kind: 'unitValue' };
  switch (branch) {
    case 'return': {
      const value = inner.value ?? unitFallback;
      return substituteUserComputation(bundle.returnHandler.body, bundle.returnHandler.parameter, value);
    }
    case 'exception': {
      if (!inner.exception) {
        return undefined;
      }
      const handler = bundle.exceptionHandlers.find((candidate) => candidate.exception === inner.exception);
      const payload = inner.exceptionPayload ?? unitFallback;
      if (handler) {
        return handler.parameter
          ? substituteUserComputation(handler.body, handler.parameter, payload)
          : handler.body;
      }
      return {
        kind: 'userRaise',
        exception: inner.exception,
        ...(inner.exceptionPayload ? { payload: inner.exceptionPayload } : {}),
      };
    }
    case 'signal': {
      if (!inner.signal) {
        return undefined;
      }
      const handler = bundle.signalHandlers?.find((candidate) => candidate.signal === inner.signal);
      return handler?.body;
    }
    default:
      return undefined;
  }
}

function instantiateKernelFinaliserBranch(
  bundle: LambdaCoopKernelFinaliserBundle,
  branch: LambdaCoopFinaliserOutcomeBranch,
  inner: LambdaCoopKernelEvalResult,
): LambdaCoopKernelComputation | undefined {
  const unitFallback: LambdaCoopValue = { kind: 'unitValue' };
  switch (branch) {
    case 'return': {
      const value = inner.value ?? unitFallback;
      return substituteKernelComputation(bundle.returnHandler.body, bundle.returnHandler.parameter, value);
    }
    case 'exception': {
      if (!inner.exception) {
        return undefined;
      }
      const handler = bundle.exceptionHandlers.find((candidate) => candidate.exception === inner.exception);
      if (!handler) {
        return undefined;
      }
      const payload = inner.exceptionPayload ?? unitFallback;
      return handler.parameter
        ? substituteKernelComputation(handler.body, handler.parameter, payload)
        : handler.body;
    }
    case 'signal': {
      if (!inner.signal) {
        return undefined;
      }
      const handler = bundle.signalHandlers?.find((candidate) => candidate.signal === inner.signal);
      return handler?.body;
    }
    default:
      return undefined;
  }
}

function branchFromStatus(status: LambdaCoopUserEvalResult['status']): LambdaCoopFinaliserOutcomeBranch {
  if (status === 'value') {
    return 'return';
  }
  if (status === 'exception') {
    return 'exception';
  }
  if (status === 'signal') {
    return 'signal';
  }
  return 'error';
}

function lawFromBranch(branch: LambdaCoopFinaliserOutcomeBranch): LambdaCoopRunFinallyEquationReport['law'] {
  switch (branch) {
    case 'return':
      return 'run-return';
    case 'exception':
      return 'run-exception';
    case 'signal':
      return 'run-signal';
    default:
      return 'run-error';
  }
}

function kernelBranchFromStatus(status: LambdaCoopKernelEvalResult['status']): LambdaCoopFinaliserOutcomeBranch {
  if (status === 'value') {
    return 'return';
  }
  if (status === 'exception') {
    return 'exception';
  }
  if (status === 'signal') {
    return 'signal';
  }
  return 'error';
}

function kernelLawFromBranch(branch: LambdaCoopFinaliserOutcomeBranch): LambdaCoopKernelFinallyEquationReport['law'] {
  switch (branch) {
    case 'return':
      return 'kernel-return';
    case 'exception':
      return 'kernel-exception';
    default:
      return 'kernel-signal';
  }
}

export function checkRunFinallyEquation(
  term: LambdaCoopUserRunFinally,
  options: LambdaCoopEvalOptions = {},
): LambdaCoopRunFinallyEquationReport {
  if (term.runner.kind !== 'runnerLiteral') {
    const runResult = evaluateUser(term, options);
    return {
      law: 'run-error',
      branch: 'error',
      term,
      innerResult: runResult,
      runResult,
      equivalent: false,
      notes: ['runner-not-literal'],
    };
  }
  const innerResult = evaluateUserComputationUnderRunner(term.runner, term.computation, options);
  const runResult = evaluateUser(term, options);
  const branch = branchFromStatus(innerResult.status);
  const notes: string[] = [
    `innerStatus=${innerResult.status}`,
    `runStatus=${runResult.status}`,
  ];
  const finaliserTerm = instantiateFinaliserBranch(term.finaliser, branch, innerResult);
  let finaliserResult: LambdaCoopUserEvalResult | undefined;
  if (finaliserTerm) {
    finaliserResult = evaluateUser(finaliserTerm, options);
    notes.push('finaliserBranch=handled');
  } else if (branch === 'signal' || branch === 'error') {
    finaliserResult = innerResult;
    notes.push('finaliserBranch=propagated');
  } else {
    notes.push('finaliserBranch=missing');
  }
  const comparisonTarget = finaliserResult ?? innerResult;
  const equivalent = userEvalResultsEquivalent(runResult, comparisonTarget);
  notes.push(`equivalent=${equivalent}`);
  return {
    law: lawFromBranch(branch),
    branch,
    term,
    innerResult,
    runResult,
    ...(finaliserTerm && finaliserResult ? { finaliserResult } : {}),
    equivalent,
    notes,
  };
}

export function checkKernelFinallyEquation(
  computation: LambdaCoopKernelComputation,
  finaliser: LambdaCoopKernelFinaliserBundle,
  options: LambdaCoopEvalOptions = {},
): LambdaCoopKernelFinallyEquationReport {
  const kernelResult = evaluateKernel(computation, options);
  const branch = kernelBranchFromStatus(kernelResult.status);
  const notes: string[] = [`kernelStatus=${kernelResult.status}`];
  const finaliserTerm = instantiateKernelFinaliserBranch(finaliser, branch, kernelResult);
  let finaliserResult: LambdaCoopKernelEvalResult | undefined;
  if (finaliserTerm) {
    finaliserResult = evaluateKernel(finaliserTerm, options);
    notes.push('finaliserBranch=handled');
  } else if (branch === 'signal') {
    notes.push('finaliserBranch=propagated');
  } else {
    notes.push('finaliserBranch=missing');
  }
  const equivalent = finaliserResult !== undefined;
  notes.push(`equivalent=${equivalent}`);
  return {
    law: kernelLawFromBranch(branch),
    branch,
    computation,
    finaliser,
    kernelResult,
    ...(finaliserResult ? { finaliserResult } : {}),
    equivalent,
    notes,
  };
}

export type LambdaCoopKernelRewriteLaw = 'kernel-getenv' | 'kernel-setenv' | 'kernel-operation';

export interface LambdaCoopKernelRewriteEquationReport {
  readonly law: LambdaCoopKernelRewriteLaw;
  readonly left: LambdaCoopKernelComputation;
  readonly right: LambdaCoopKernelComputation;
  readonly leftResult: LambdaCoopKernelEvalResult;
  readonly rightResult: LambdaCoopKernelEvalResult;
  readonly equivalent: boolean;
  readonly notes: ReadonlyArray<string>;
}

export type LambdaCoopRunnerCalculusLaw =
  | LambdaCoopRunFinallyEquationReport['law']
  | LambdaCoopKernelFinallyEquationReport['law']
  | LambdaCoopKernelRewriteLaw;

export const RUNNER_CALCULUS_EXPECTED_LAWS: ReadonlyArray<LambdaCoopRunnerCalculusLaw> = Object.freeze([
  'run-return',
  'run-exception',
  'run-signal',
  'kernel-return',
  'kernel-exception',
  'kernel-signal',
  'kernel-getenv',
  'kernel-setenv',
  'kernel-operation',
]);

export interface RunnerCalculusRunFinallyHarnessEntry {
  readonly description?: string | undefined;
  readonly term: LambdaCoopUserRunFinally;
  readonly options?: LambdaCoopEvalOptions | undefined;
}

export interface RunnerCalculusKernelFinallyHarnessEntry {
  readonly description?: string | undefined;
  readonly computation: LambdaCoopKernelComputation;
  readonly options?: LambdaCoopEvalOptions | undefined;
}

export interface RunnerCalculusKernelFinallyHarness {
  readonly finaliser: LambdaCoopKernelFinaliserBundle;
  readonly branches: ReadonlyArray<RunnerCalculusKernelFinallyHarnessEntry>;
}

export interface RunnerCalculusKernelGetEnvHarnessEntry
  extends LambdaCoopKernelGetEnvEquationInput {
  readonly description?: string | undefined;
}

export interface RunnerCalculusKernelSetEnvHarnessEntry
  extends LambdaCoopKernelSetEnvEquationInput {
  readonly description?: string | undefined;
}

export interface RunnerCalculusKernelOperationHarnessEntry
  extends LambdaCoopKernelOperationPropagationInput {
  readonly description?: string | undefined;
}

export interface RunnerCalculusRewriteHarness {
  readonly runFinally?: ReadonlyArray<RunnerCalculusRunFinallyHarnessEntry>;
  readonly kernelFinally?: RunnerCalculusKernelFinallyHarness;
  readonly kernelGetEnv?: ReadonlyArray<RunnerCalculusKernelGetEnvHarnessEntry>;
  readonly kernelSetEnv?: ReadonlyArray<RunnerCalculusKernelSetEnvHarnessEntry>;
  readonly kernelOperation?: ReadonlyArray<RunnerCalculusKernelOperationHarnessEntry>;
  readonly expectedLaws?: ReadonlyArray<LambdaCoopRunnerCalculusLaw>;
}

export interface RunnerCalculusRunFinallyReportEntry {
  readonly description?: string | undefined;
  readonly report: LambdaCoopRunFinallyEquationReport;
}

export interface RunnerCalculusKernelFinallyReportEntry {
  readonly description?: string | undefined;
  readonly report: LambdaCoopKernelFinallyEquationReport;
}

export interface RunnerCalculusKernelRewriteReportEntry {
  readonly description?: string | undefined;
  readonly report: LambdaCoopKernelRewriteEquationReport;
}

export interface RunnerCalculusRewriteSummaryTotals {
  readonly expectedLaws: number;
  readonly coveredLaws: number;
  readonly satisfiedLaws: number;
  readonly totalReports: number;
}

export interface RunnerCalculusRewriteSummary {
  readonly runFinallyReports: ReadonlyArray<RunnerCalculusRunFinallyReportEntry>;
  readonly kernelFinallyReports: ReadonlyArray<RunnerCalculusKernelFinallyReportEntry>;
  readonly kernelRewriteReports: ReadonlyArray<RunnerCalculusKernelRewriteReportEntry>;
  readonly totals: RunnerCalculusRewriteSummaryTotals;
  readonly missingLaws: ReadonlyArray<LambdaCoopRunnerCalculusLaw>;
  readonly failingLaws: ReadonlyArray<LambdaCoopRunnerCalculusLaw>;
  readonly notes: ReadonlyArray<string>;
}

interface KernelRewriteEquationOptions {
  readonly law: LambdaCoopKernelRewriteLaw;
  readonly left: LambdaCoopKernelComputation;
  readonly right: LambdaCoopKernelComputation;
  readonly leftOptions: LambdaCoopEvalOptions;
  readonly rightOptions: LambdaCoopEvalOptions;
  readonly extraNotes?: ReadonlyArray<string>;
}

function runKernelRewriteEquation({
  law,
  left,
  right,
  leftOptions,
  rightOptions,
  extraNotes = [],
}: KernelRewriteEquationOptions): LambdaCoopKernelRewriteEquationReport {
  const leftResult = evaluateKernel(left, leftOptions);
  const rightResult = evaluateKernel(right, rightOptions);
  const equivalent = kernelEvalResultsEquivalent(leftResult, rightResult);
  const notes = [
    `leftStatus=${leftResult.status}`,
    `rightStatus=${rightResult.status}`,
    ...extraNotes,
    `equivalent=${equivalent}`,
  ];
  return { law, left, right, leftResult, rightResult, equivalent, notes };
}

function withKernelEnvironment(
  options: LambdaCoopEvalOptions | undefined,
  environment: LambdaCoopValue,
): LambdaCoopEvalOptions {
  return { ...(options ?? {}), kernelEnvironment: environment };
}

export interface LambdaCoopKernelGetEnvEquationInput {
  readonly continuation: LambdaCoopKernelContinuation;
  readonly environment: LambdaCoopValue;
  readonly options?: LambdaCoopEvalOptions;
}

export function checkKernelGetEnvEquation(
  input: LambdaCoopKernelGetEnvEquationInput,
): LambdaCoopKernelRewriteEquationReport {
  const left: LambdaCoopKernelOperation = {
    kind: 'kernelOperation',
    operation: 'getenv',
    argument: { kind: 'unitValue' },
    continuation: input.continuation,
  };
  const right = substituteKernelComputation(
    input.continuation.body,
    input.continuation.parameter,
    input.environment,
  );
  return runKernelRewriteEquation({
    law: 'kernel-getenv',
    left,
    right,
    leftOptions: withKernelEnvironment(input.options, input.environment),
    rightOptions: withKernelEnvironment(input.options, input.environment),
    extraNotes: [`environmentKind=${input.environment.kind}`],
  });
}

export interface LambdaCoopKernelSetEnvEquationInput {
  readonly continuation: LambdaCoopKernelContinuation;
  readonly nextEnvironment: LambdaCoopValue;
  readonly initialEnvironment?: LambdaCoopValue;
  readonly acknowledgement?: LambdaCoopValue;
  readonly options?: LambdaCoopEvalOptions;
}

export function checkKernelSetEnvEquation(
  input: LambdaCoopKernelSetEnvEquationInput,
): LambdaCoopKernelRewriteEquationReport {
  const left: LambdaCoopKernelOperation = {
    kind: 'kernelOperation',
    operation: 'setenv',
    argument: input.nextEnvironment,
    continuation: input.continuation,
  };
  const acknowledgement = input.acknowledgement ?? { kind: 'unitValue' };
  const right = substituteKernelComputation(
    input.continuation.body,
    input.continuation.parameter,
    acknowledgement,
  );
  const initialEnvironment =
    input.initialEnvironment ?? input.options?.kernelEnvironment ?? { kind: 'unitValue' };
  return runKernelRewriteEquation({
    law: 'kernel-setenv',
    left,
    right,
    leftOptions: withKernelEnvironment(input.options, initialEnvironment),
    rightOptions: withKernelEnvironment(input.options, input.nextEnvironment),
    extraNotes: [
      `initialEnvKind=${initialEnvironment.kind}`,
      `nextEnvKind=${input.nextEnvironment.kind}`,
    ],
  });
}

export interface LambdaCoopKernelOperationPropagationInput {
  readonly operation: string;
  readonly argument: LambdaCoopValue;
  readonly continuation: LambdaCoopKernelContinuation;
  readonly options?: LambdaCoopEvalOptions;
}

export function checkKernelOperationPropagationEquation(
  input: LambdaCoopKernelOperationPropagationInput,
): LambdaCoopKernelRewriteEquationReport {
  const left: LambdaCoopKernelOperation = {
    kind: 'kernelOperation',
    operation: input.operation,
    argument: input.argument,
    continuation: input.continuation,
  };
  const right = substituteKernelComputation(
    input.continuation.body,
    input.continuation.parameter,
    input.argument,
  );
  return runKernelRewriteEquation({
    law: 'kernel-operation',
    left,
    right,
    leftOptions: input.options ?? {},
    rightOptions: input.options ?? {},
    extraNotes: [`operation=${input.operation}`],
  });
}

export function summarizeRunnerCalculusRewrites(
  harness: RunnerCalculusRewriteHarness,
): RunnerCalculusRewriteSummary {
  const runFinallyReports: RunnerCalculusRunFinallyReportEntry[] = (harness.runFinally ?? []).map(
    (entry) => ({
      description: entry.description,
      report: checkRunFinallyEquation(entry.term, entry.options),
    }),
  );
  const kernelFinallyReports: RunnerCalculusKernelFinallyReportEntry[] = harness.kernelFinally
    ? harness.kernelFinally.branches.map((entry) => ({
        description: entry.description,
        report: checkKernelFinallyEquation(entry.computation, harness.kernelFinally!.finaliser, entry.options),
      }))
    : [];
  const kernelRewriteReports: RunnerCalculusKernelRewriteReportEntry[] = [];
  for (const entry of harness.kernelGetEnv ?? []) {
    kernelRewriteReports.push({
      description: entry.description,
      report: checkKernelGetEnvEquation(entry),
    });
  }
  for (const entry of harness.kernelSetEnv ?? []) {
    kernelRewriteReports.push({
      description: entry.description,
      report: checkKernelSetEnvEquation(entry),
    });
  }
  for (const entry of harness.kernelOperation ?? []) {
    kernelRewriteReports.push({
      description: entry.description,
      report: checkKernelOperationPropagationEquation(entry),
    });
  }

  const expectedLaws = harness.expectedLaws ?? RUNNER_CALCULUS_EXPECTED_LAWS;
  const coverage = new Map<LambdaCoopRunnerCalculusLaw, { covered: boolean; satisfied: boolean }>();
  const register = (law: LambdaCoopRunnerCalculusLaw, equivalent: boolean): void => {
    const current = coverage.get(law) ?? { covered: false, satisfied: false };
    coverage.set(law, {
      covered: true,
      satisfied: current.satisfied || equivalent,
    });
  };

  for (const entry of runFinallyReports) {
    register(entry.report.law, entry.report.equivalent);
  }
  for (const entry of kernelFinallyReports) {
    register(entry.report.law, entry.report.equivalent);
  }
  for (const entry of kernelRewriteReports) {
    register(entry.report.law, entry.report.equivalent);
  }

  const coveredLaws = expectedLaws.filter((law) => coverage.get(law)?.covered === true);
  const satisfiedLaws = expectedLaws.filter((law) => coverage.get(law)?.satisfied === true);
  const missingLaws = expectedLaws.filter((law) => coverage.get(law) === undefined);
  const failingLaws = expectedLaws.filter((law) => {
    const info = coverage.get(law);
    return info !== undefined && !info.satisfied;
  });
  const totalReports =
    runFinallyReports.length + kernelFinallyReports.length + kernelRewriteReports.length;
  const notes: string[] = [
    `expected=${expectedLaws.length}`,
    `covered=${coveredLaws.length}`,
    `satisfied=${satisfiedLaws.length}`,
    `reports=${totalReports}`,
  ];
  if (missingLaws.length > 0) {
    notes.push(`missing=${missingLaws.join(',')}`);
  }
  if (failingLaws.length > 0) {
    notes.push(`failing=${failingLaws.join(',')}`);
  }

  return {
    runFinallyReports,
    kernelFinallyReports,
    kernelRewriteReports,
    totals: {
      expectedLaws: expectedLaws.length,
      coveredLaws: coveredLaws.length,
      satisfiedLaws: satisfiedLaws.length,
      totalReports,
    },
    missingLaws,
    failingLaws,
    notes,
  };
}

