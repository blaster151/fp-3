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
  readonly finaliser: LambdaCoopKernelComputation; // executed only for kernel-return branch per equations
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

export interface LambdaCoopUserEvalResult {
  readonly status: 'value' | 'exception' | 'signal' | 'error';
  readonly value?: LambdaCoopValue;
  readonly exception?: string;
  readonly signal?: string;
  readonly error?: string;
  readonly trace: ReadonlyArray<LambdaCoopReductionTraceEntry>;
  readonly finalResources: LambdaCoopResourceSummary;
  readonly operations: ReadonlyArray<string>;
}

export interface LambdaCoopKernelEvalResult {
  readonly status: 'value' | 'exception' | 'signal';
  readonly value?: LambdaCoopValue;
  readonly exception?: string;
  readonly signal?: string;
  readonly trace: ReadonlyArray<LambdaCoopReductionTraceEntry>;
  readonly finalResources: LambdaCoopResourceSummary;
  readonly operations: ReadonlyArray<string>;
}

export interface LambdaCoopEvalOptions { readonly stepLimit?: number; readonly enforceRunner?: boolean; }

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
export function evaluateKernel(term: LambdaCoopKernelComputation, options: LambdaCoopEvalOptions = {}): LambdaCoopKernelEvalResult {
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
        return { status: 'exception', exception: current.exception, trace, finalResources: summary, operations };
      }
      case 'kernelSignal': {
        const summary = summarizeKernelComputationResources(current);
        tracePush(trace, 'Kernel-Signal', `signal ${current.signal}`, current.kind, current.kind, summary);
        return { status: 'signal', signal: current.signal, trace, finalResources: summary, operations };
      }
      case 'kernelOperation': {
        operations.push(current.operation);
        // Evaluate continuation body immediately (call-by-value assumption on argument already value-like)
        const contBody = current.continuation.body;
        tracePush(trace, 'Kernel-Op', `invoke kernel op ${current.operation}`, current.kind, contBody.kind, summarizeKernelComputationResources(current));
        current = contBody; // ignore parameter binding for simplicity – extend later
        continue;
      }
      case 'kernelLet': {
        tracePush(trace, 'Kernel-Let', `let ${current.binder}`, current.kind, current.computation.kind, summarizeKernelComputationResources(current));
        // Evaluate first computation; if value, substitute binder variable occurrences in body if body is kernelReturn variable pattern
        const first = evaluateKernel(current.computation, options);
        trace.push(...first.trace);
          operations.push(...first.operations);
        if (first.status === 'value') {
          // naive substitution inside body if occurrences of binder appear as variable
          const body = current.body;
          current = body; // skipping actual substitution for brevity
          continue;
        } else {
          // propagate with precise variant
          if (first.status === 'exception') {
              return { status: 'exception', exception: first.exception as string, trace, finalResources: first.finalResources, operations };
          }
            return { status: 'signal', signal: first.signal as string, trace, finalResources: first.finalResources, operations };
        }
      }
      case 'kernelTry': {
        tracePush(trace, 'Kernel-Try', 'enter kernel try', current.kind, current.computation.kind, summarizeKernelComputationResources(current));
        const inner = evaluateKernel(current.computation, options);
          trace.push(...inner.trace);
          operations.push(...inner.operations);
        if (inner.status === 'value') {
          // apply return handler
            const handlerBody = current.returnHandler.body;
            tracePush(trace, 'Kernel-Try-Return', 'return handler', current.computation.kind, handlerBody.kind, summarizeKernelComputationResources(current));
            current = handlerBody; continue;
        } else if (inner.status === 'exception') {
          const handler = current.exceptionHandlers.find(h => h.exception === inner.exception);
          if (handler) { tracePush(trace, 'Kernel-Try-Exception', `handle ${inner.exception}`, current.computation.kind, handler.body.kind, summarizeKernelComputationResources(current)); current = handler.body; continue; }
            return { status: 'exception', exception: inner.exception as string, trace, finalResources: inner.finalResources, operations };
        } else { // signal
            return { status: 'signal', signal: inner.signal as string, trace, finalResources: inner.finalResources, operations };
        }
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
  const trace: LambdaCoopReductionTraceEntry[] = [];
  const stepLimit = Math.max(0, options.stepLimit ?? 512);
  let current: LambdaCoopUserComputationExtended = term;
  let steps = 0;
  const operations: string[] = [];
  while (steps < stepLimit) {
    steps++;
    switch (current.kind) {
      case 'userReturn': {
        const summary = summarizeUserComputationResources(current);
        tracePush(trace, 'User-Return', 'return value', current.kind, current.kind, summary);
          return { status: 'value', value: current.value, trace, finalResources: summary, operations };
      }
      case 'userRaise': {
        const summary = summarizeUserComputationResources(current);
        tracePush(trace, 'User-Raise', `raise ${current.exception}`, current.kind, current.kind, summary);
          return { status: 'exception', exception: current.exception, trace, finalResources: summary, operations };
      }
      case 'userOperation': {
          operations.push(current.operation);
        tracePush(trace, 'User-Op', `user op ${current.operation}`, current.kind, current.continuation.body.kind, summarizeUserComputationResources(current));
        current = current.continuation.body; continue;
      }
      case 'userLet': {
        tracePush(trace, 'User-Let', `let ${current.binder}`, current.kind, current.computation.kind, summarizeUserComputationResources(current));
        const first = evaluateUser(current.computation, options);
        trace.push(...first.trace);
          operations.push(...first.operations);
  if (first.status === 'value') { current = current.body; continue; }
    if (first.status === 'exception') return { status: 'exception', exception: first.exception as string, trace, finalResources: first.finalResources, operations };
    if (first.status === 'signal') return { status: 'signal', signal: first.signal as string, trace, finalResources: first.finalResources, operations };
    return { status: 'error', error: first.error ?? 'error', trace, finalResources: first.finalResources, operations };
      }
      case 'userTry': {
        tracePush(trace, 'User-Try', 'enter user try', current.kind, current.computation.kind, summarizeUserComputationResources(current));
        const inner = evaluateUser(current.computation, options);
        trace.push(...inner.trace);
          operations.push(...inner.operations);
        if (inner.status === 'value') { const handlerBody = current.returnHandler.body; tracePush(trace, 'User-Try-Return', 'return handler', current.computation.kind, handlerBody.kind, summarizeUserComputationResources(current)); current = handlerBody; continue; }
    if (inner.status === 'exception') { const handler = current.exceptionHandlers.find(h => h.exception === inner.exception); if (handler) { tracePush(trace, 'User-Try-Exception', `handle ${inner.exception}`, current.computation.kind, handler.body.kind, summarizeUserComputationResources(current)); current = handler.body; continue; } return { status: 'exception', exception: inner.exception as string, trace, finalResources: inner.finalResources, operations }; }
    if (inner.status === 'signal') return { status: 'signal', signal: inner.signal as string, trace, finalResources: inner.finalResources, operations };
    return { status: 'error', error: 'unexpected-status', trace, finalResources: inner.finalResources, operations };
      }
      case 'userRun': {
        // Runner without finaliser
        const runnerCaps = runnerCapabilitiesFromValue(current.runner);
        const summaryBefore = summarizeUserComputationResources(current);
        tracePush(trace, 'User-Run', 'run under runner', current.kind, current.computation.kind, summaryBefore);
        // delegate to underlying computation – placeholder (no kernel transition modeling)
        current = current.computation; continue;
      }
      case 'userRunFinally': {
        // Evaluate computation under runner, then apply equations: run(return)=return, run(raise)=raise, run(kill)=kill, run(op)=kernel clause body.
        const inner = evaluateUser(current.computation, options); // treat as user-level first
        trace.push(...inner.trace);
          operations.push(...inner.operations);
        if (inner.status === 'value') {
          // Equation: run (return V) finally F = return V (finaliser not executed here per Section 4.4 excerpt)
          const ret: LambdaCoopUserComputation = { kind: 'userReturn', value: inner.value ?? { kind: 'unitValue' } };
          const summary = summarizeUserComputationResources(ret);
          tracePush(trace, 'Run-Return', 'finaliser bypass (return)', current.kind, ret.kind, summary);
            return { status: 'value', value: inner.value as LambdaCoopValue, trace, finalResources: summary, operations };
        }
        if (inner.status === 'exception') {
          const summary = summarizeUserComputationResources(current.computation);
          tracePush(trace, 'Run-Raise', `propagate exception ${inner.exception}`, current.computation.kind, current.computation.kind, summary);
            return { status: 'exception', exception: inner.exception as string, trace, finalResources: summary, operations };
        }
        if (inner.status === 'signal') {
          const summary = summarizeUserComputationResources(current.computation);
          tracePush(trace, 'Run-Kill', `propagate signal ${inner.signal}`, current.computation.kind, current.computation.kind, summary);
            return { status: 'signal', signal: inner.signal as string, trace, finalResources: summary, operations };
        }
        break;
      }
      case 'userLetAbbrev': {
        const expanded = expandUserLetAbbrev(current as LambdaCoopUserLetAbbrev);
        tracePush(trace, 'User-Let-Abbrev', 'expand abbreviation', current.kind, expanded.kind, summarizeUserComputationResources(current.computation));
        current = expanded; continue;
      }
      default: {
          const summary = summarizeUserComputationResources(current as LambdaCoopUserComputation);
          tracePush(trace, 'User-Stuck', 'no rule applies', current.kind, current.kind, summary);
          return { status: 'error', error: 'stuck', trace, finalResources: summary, operations };
      }
    }
  }
    const summary = summarizeUserComputationResources(current as LambdaCoopUserComputation);
    tracePush(trace, 'User-StepLimit', 'step limit exceeded', current.kind, current.kind, summary);
    return { status: 'error', error: 'stepLimit', trace, finalResources: summary, operations };
}

// Describe evaluation trace for oracle diagnostics.
export function describeUserEval(result: LambdaCoopUserEvalResult): ReadonlyArray<string> {
  const lines: string[] = [];
  lines.push(
    `user-eval status=${result.status}` +
      (result.value ? ` valueKind=${result.value.kind}` : "") +
      (result.exception ? ` exception=${result.exception}` : "") +
      (result.signal ? ` signal=${result.signal}` : "") +
      (result.error ? ` error=${result.error}` : ""),
  );
  if (result.operations.length > 0) {
    lines.push(`  operations=${result.operations.join(", ")}`);
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
  lines.push(
    `kernel-eval status=${result.status}` +
      (result.value ? ` valueKind=${result.value.kind}` : "") +
      (result.exception ? ` exception=${result.exception}` : "") +
      (result.signal ? ` signal=${result.signal}` : ""),
  );
  if (result.operations.length > 0) {
    lines.push(`  operations=${result.operations.join(", ")}`);
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

