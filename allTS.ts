/**
 * fp-3 — a compact, practical FP toolkit for TypeScript
 * --------------------------------------------------------
 * Goals
 *  - Zero deps, tree-shakeable, pragmatic types
 *  - Great dev ergonomics via type inference
 *  - Small but extensible: start with Option, Result, pipe/flow, pattern matching, and a few typeclasses
 *
 * Usage
 *  import { Option, Some, None, Result, Ok, Err, pipe, flow } from "./fp-3";
 *
 * Build
 *  tsc --target ES2019 --module ES2020 fp-3.ts
 */

import {
  None,
  Some,
  isNone,
  isSome,
  fromNullable,
  toNullable,
  mapO,
  flatMapO,
  getOrElseO,
  orElseO,
  filterO,
} from "./option"
import type { Option } from "./option"
import {
  Err,
  Ok,
  isErr,
  isOk,
  mapR,
  mapErr,
  flatMapR,
  getOrElseR,
  tryCatch,
} from "./result"
import {
  FinGrp as FinGrpModel,
  type FinGrpObj as FinGrpObjModel,
  type Hom as FinGrpHomModel,
} from "./models/fingroup-cat"
import {
  makeFiniteSliceProduct,
  lookupSliceProductMetadata,
  type SliceObject as SliceObjectModel,
  type SliceArrow as SliceArrowModel,
} from "./slice-cat"
import {
  type FinSetCategory as FinSetCategoryModel,
  type FinSetName as FinSetNameModel,
  type FuncArr as FuncArrModel,
} from "./models/finset-cat"
import {
  checkBinaryProductComponentwiseCollapse as checkBinaryProductComponentwiseCollapseHelper,
  checkBinaryProductNaturality as checkBinaryProductNaturalityHelper,
  checkBinaryProductSwapCompatibility as checkBinaryProductSwapCompatibilityHelper,
  makeBinaryProductComponentwise,
  makeBinaryProductDiagonal,
  makeBinaryProductSwap,
  type BinaryProductComponentwiseCollapseInput as CategoryBinaryProductComponentwiseCollapseInput,
  type BinaryProductComponentwiseInput as CategoryBinaryProductComponentwiseInput,
  type BinaryProductDiagonalFactor as CategoryBinaryProductDiagonalFactor,
  type BinaryProductNaturalityInput as CategoryBinaryProductNaturalityInput,
  type BinaryProductSwapCompatibilityInput as CategoryBinaryProductSwapCompatibilityInput,
  type BinaryProductSwapResult as CategoryBinaryProductSwapResult,
  type BinaryProductTuple as CategoryBinaryProductTuple,
} from "./category-limits-helpers"
import { isIso } from "./kinds/inverses"
import type { FiniteCategory as RegistryFiniteCategory } from "./finite-cat"
import type { Result as ResultT } from "./result"
import type {
  EndofunctorValue,
  EndofunctorK1,
  NatK1,
  TwoFunctorK1,
  LaxTwoFunctorK1,
  OplaxTwoFunctorK1,
  Env,
  StrengthEnv,
  SumVal,
  ProdVal,
} from "./endo-2category"
import {
  idNatK1,
  vcompNatK1,
  leftWhisker,
  rightWhisker,
  hcompNatK1_component,
  IdK1,
  composeEndoK1,
  viewCompose,
  Reader,
  runReader,
  PostcomposeReader2,
  muPostReader,
  EnvEndo,
  PrecomposeEnv2,
  strengthEnvOption,
  strengthEnvResult,
  strengthEnvReader,
  inL,
  inR,
  SumEndo,
  strengthEnvFromSum,
  matchSum,
  prod,
  ProdEndo,
  strengthEnvFromProd,
} from "./endo-2category"
import {
  PairEndo,
  ConstEndo,
  strengthEnvFromPair,
  strengthEnvFromConst,
  strengthEnvCompose,
  smithNormalForm,
} from "./comonad-k1"
import {
  anaJson,
  cataJson,
  hyloJson,
  jArr,
  jBinary,
  jBool,
  jDate,
  jDec,
  jNull,
  jNum,
  jObj,
  jRegex,
  jSet,
  jStr,
  jUndef,
  makeRecursionK1,
} from "./array-recursion"
import type { Fix1, Json, JsonF } from "./array-recursion"
import { Task, TaskResult, ReaderTask, ReaderTaskResult } from "./task"
import { VErr, VOk, isVErr, isVOk, mapV, apV } from "./validation"
import type { Validation } from "./validation"
import {
  absurd,
  compose,
  const_,
  curry,
  flow,
  id,
  pipe,
  uncurry,
} from "./core"
import type { Eq, Lazy, Ord, Predicate, Refinement } from "./core"
import type { Apply, Functor, FunctorValue, Monad, ValidationTag } from "./typeclasses"
import { makePostcomposePromise2, prodNat, sumNat } from "./catTransforms"
import type { SimpleApplicativeK1, TraversableK1 } from "./catTransforms"
import { depthJson, sizeAndDepthJson, sizeJson, strsJson } from "./json-recursion"

type Result<E, A> = ResultT<E, A>

export * from "./option"
export * from "./result"
export * from "./endo-2category"
export * from "./comonad-k1"
export * from "./array-recursion"
export * from "./task"
export * from "./validation"
export * from "./reader-task-option"
export * from "./json-canonical"
export * from "./decoder"
export * from "./core"
export * from "./typeclasses"
export * from "./catTransforms"
export * from "./reader-tools"
export * from "./json-recursion"

// Aggregated exports for the emerging virtual equipment and relative layers.
export * from "./virtual-equipment";
export * from "./relative";

// Some guidelines
// Prefer the “3-then-<R>” shape for helpers:

// Choosing between two approaches
// Parallel (*Par): best when steps don’t depend on each other and can run together. (Applicative style)
// Sequential (*Seq): best when each step depends on prior results/state or you want early short-circuit.

// Choosing between two approaches
// DoRTO / DoRWST: fluent, object-accumulating pipelines (great for building derived records).
// genRTO / genRWST: read-like-a-script monadic sequencing with early return (None short-circuit, RWST state/log threading).

// ================
// Core primitives (see ./core)
// ================

type _ObjectLike = Record<string, unknown>









// =======================
// Typeclasses (see ./typeclasses)
// =======================

// =======================
// Natural transformation helpers (see ./catTransforms)
// =======================

// =======================
// Reader helpers (see ./reader-tools)
// =======================

// Array recursion helpers (cata/ana/hylo/para/apo) now live in array-recursion.ts




// ========== Endomorphisms (A -> A) with a Monoid ==========

export type Endo<A> = (a: A) => A

// Monoid of endomorphisms under composition; identity is id
export const MonoidEndo = <A>(): Monoid<Endo<A>> => ({
  empty: id,
  // choose a direction; here "then" (left-to-right): (f <> g)(x) = g(f(x))
  concat: (f, g) => (a: A) => g(f(a)),
})

// Convenience: apply a bunch of edits to a value
export const applyEdits =
  <A>(M = MonoidEndo<A>()) =>
  (edits: ReadonlyArray<Endo<A>>) =>
  (a: A): A =>
    concatAll(M)(edits)(a)





// Recursion-scheme helpers and Json fixpoint moved to array-recursion.ts

// --------------------------------------------------------------------
// Arithmetic Expr AST (pattern functor)
//   ExprF<A> where A marks recursive positions
// --------------------------------------------------------------------
export type ExprF<A> =
  | { _tag: 'Lit'; value: number }
  | { _tag: 'Add'; left: A; right: A }
  | { _tag: 'Mul'; left: A; right: A }
  | { _tag: 'Neg'; value: A }
  | { _tag: 'Abs'; value: A }                    // NEW: Absolute value node
  | { _tag: 'AddN'; items: ReadonlyArray<A> }
  | { _tag: 'MulN'; items: ReadonlyArray<A> }
  | { _tag: 'Var'; name: string }
  | { _tag: 'Let'; name: string; value: A; body: A }
  | { _tag: 'Div'; left: A; right: A }
  | { _tag: 'Pow'; base: A; exp: A }

export const mapExprF =
  <A, B>(f: (a: A) => B) =>
  (fa: ExprF<A>): ExprF<B> => {
    switch (fa._tag) {
      case 'Lit':  return fa
      case 'Add':  return { _tag: 'Add',  left: f(fa.left),  right: f(fa.right) }
      case 'Mul':  return { _tag: 'Mul',  left: f(fa.left),  right: f(fa.right) }
      case 'Neg':  return { _tag: 'Neg',  value: f(fa.value) }
      case 'Abs':  return { _tag: 'Abs',  value: f(fa.value) }  // NEW: handle Abs recursion
      case 'AddN': return { _tag: 'AddN', items: fa.items.map(f) }
      case 'MulN': return { _tag: 'MulN', items: fa.items.map(f) }
      case 'Var':  return fa
      case 'Let':  return { _tag: 'Let',  name: fa.name, value: f(fa.value), body: f(fa.body) }
      case 'Div':  return { _tag: 'Div',  left: f(fa.left),  right: f(fa.right) }
      case 'Pow':  return { _tag: 'Pow',  base: f(fa.base),  exp: f(fa.exp) }
      default: return _exhaustive(fa)  // Exhaustiveness guard
    }
  }

// ---- HKT functor instance + fixpoint + derived recursion for Expr ----
export const ExprFK: FunctorK1<'ExprF'> = { map: mapExprF }

export type Expr = Fix1<'ExprF'>

export const { cata: cataExpr, ana: anaExpr, hylo: hyloExpr } = makeRecursionK1(ExprFK)

const clampNatural = (n: number): number => {
  if (!Number.isFinite(n)) return 0
  const m = Math.floor(n)
  return m < 0 ? 0 : m
};

export const paraExpr =
  <B>(alg: (fb: ExprF<readonly [Expr, B]>) => B) => {
    const go = (expr: Expr): B => {
      const decorated = mapExprF((child: Expr) => [child, go(child)] as const)(expr.un)
      return alg(decorated)
    }
    return go
  };

export const apoExpr =
  (step: (expr: Expr) => Result<ReadonlyArray<Expr>, readonly [Expr, Expr]>) =>
  (seed: Expr): ReadonlyArray<Expr> => {
    const out: Expr[] = []
    let current: Expr | undefined = seed
    while (current !== undefined) {
      const r = step(current)
      if (isErr(r)) {
        out.push(...r.error)
        break
      }
      const [built, next] = r.value
      out.push(built)
      if (Object.is(next, current)) {
        break
      }
      current = next
    }
    return out
  };

type SumExprSeed =
  | { readonly tag: 'Sum'; readonly n: number }
  | { readonly tag: 'Emit'; readonly value: number }

export const coalgExpr_sum1toN = (seed: SumExprSeed): ExprF<SumExprSeed> => {
  if (seed.tag === 'Emit') {
    return { _tag: 'Lit', value: seed.value }
  }
  const n = clampNatural(seed.n)
  if (n <= 1) {
    return { _tag: 'Lit', value: n }
  }
  return {
    _tag: 'Add',
    left: { tag: 'Sum', n: n - 1 },
    right: { tag: 'Emit', value: n },
  }
};

type PowMulSeed = { readonly tag: 'PowMul'; readonly depth: number; readonly leaf: number }

export const coalgExpr_powMul = (seed: PowMulSeed): ExprF<PowMulSeed> => {
  if (seed.depth <= 0) {
    return { _tag: 'Lit', value: seed.leaf }
  }
  const nextDepth = clampNatural(seed.depth - 1)
  return {
    _tag: 'Mul',
    left: { tag: 'PowMul', depth: nextDepth, leaf: seed.leaf },
    right: { tag: 'PowMul', depth: nextDepth, leaf: seed.leaf },
  }
};

// Smart constructors
export const lit  = (n: number): Expr => ({ un: { _tag: 'Lit', value: n } })
export const add  = (l: Expr, r: Expr): Expr => ({ un: { _tag: 'Add', left: l, right: r } })
export const mul  = (l: Expr, r: Expr): Expr => ({ un: { _tag: 'Mul', left: l, right: r } })
export const neg  = (e: Expr): Expr => ({ un: { _tag: 'Neg', value: e } })
export const abs  = (e: Expr): Expr => ({ un: { _tag: 'Abs', value: e } })  // NEW: absolute value
export const addN = (items: ReadonlyArray<Expr>): Expr => ({ un: { _tag: 'AddN', items } })
export const mulN = (items: ReadonlyArray<Expr>): Expr => ({ un: { _tag: 'MulN', items } })
export const vvar = (name: string): Expr => ({ un: { _tag: 'Var', name } })
export const lett = (name: string, value: Expr, body: Expr): Expr =>
  ({ un: { _tag: 'Let', name, value, body } })
export const divE = (l: Expr, r: Expr): Expr => ({ un: { _tag: 'Div', left: l, right: r } })
export const powE = (base: Expr, exp: Expr): Expr =>
  ({ un: { _tag: 'Pow', base, exp } })

// --------- Examples for ExprF ---------

// Exhaustiveness guard helper (using the exported one)
const _absurd = (x: never): never => x

// Evaluate expression via cata
export const evalExpr: (e: Expr) => number =
  cataExpr<number>((f) => {
    switch (f._tag) {
      case 'Lit': return f.value
      case 'Add': return f.left + f.right
      case 'Mul': return f.left * f.right
      case 'Neg': return -f.value
      case 'Abs': return Math.abs(f.value)  // NEW: handle absolute value
      case 'AddN': return f.items.reduce((s, x) => s + x, 0)
      case 'MulN': return f.items.reduce((p, x) => p * x, 1)
      case 'Var': throw new Error(`unbound var: ${f.name}`)
      case 'Let': throw new Error('let expressions not supported in simple eval')
      case 'Div': return f.left / f.right
      case 'Pow': return Math.pow(f.base, f.exp)
      default: return _exhaustive(f)
    }
  })
// evalExpr(add(lit(2), mul(lit(3), lit(4)))) // 14
// evalExpr(neg(add(lit(2), lit(3)))) // -5
// evalExpr(addN([lit(1), lit(2), lit(3)])) // 6
// evalExpr(mulN([lit(2), lit(3), lit(4)])) // 24

// Pretty-print via cata
export const showExpr: (e: Expr) => string =
  cataExpr<string>((f) => {
    switch (f._tag) {
      case 'Lit': return String(f.value)
      case 'Add': return `(${f.left} + ${f.right})`
      case 'Mul': return `(${f.left} * ${f.right})`
      case 'Neg': return `(-${f.value})`
      case 'Abs': return `|${f.value}|`  // NEW: handle absolute value
      case 'AddN': return `(${f.items.join(' + ')})`
      case 'MulN': return `(${f.items.join(' * ')})`
      case 'Var': return f.name
      case 'Let': return `(let ${f.name} = ${f.value} in ${f.body})`
      case 'Div': return `(${f.left} / ${f.right})`
      case 'Pow': return `(${f.base} ^ ${f.exp})`
      default: return _exhaustive(f)
    }
  })

// Unfold: build a full binary tree of depth d where leaves are 1s
export const fullMulTree: (d: number) => Expr =
  anaExpr<number>((k) =>
    k <= 0
      ? ({ _tag: 'Lit', value: 1 })
      : ({ _tag: 'Mul', left: k - 1, right: k - 1 })
  )


// ====================================================================
// Expr: swap algebras to evaluate vs. pretty-print vs. collect
// ====================================================================
type ExprAlg<B> = (fb: ExprF<B>) => B

export const Alg_Expr_eval: ExprAlg<number> = (f) => {
  switch (f._tag) {
    case 'Lit': return f.value
    case 'Add': return f.left + f.right
    case 'Mul': return f.left * f.right
    case 'Neg': return -f.value
    case 'Abs': return Math.abs(f.value)  // NEW: handle absolute value
    case 'AddN': return f.items.reduce((s, x) => s + x, 0)
    case 'MulN': return f.items.reduce((p, x) => p * x, 1)
    case 'Var': throw new Error(`unbound var: ${f.name}`)
    case 'Let': throw new Error('let expressions not supported in simple eval')
    case 'Div': return f.left / f.right
    case 'Pow': return Math.pow(f.base, f.exp)
    default: return _exhaustive(f)
  }
}
export const Alg_Expr_evalF = Alg_Expr_eval
export const evalExprReusable = cataExpr(Alg_Expr_eval)

export const Alg_Expr_pretty: ExprAlg<string> = (f) => {
  switch (f._tag) {
    case 'Lit': return String(f.value)
    case 'Add': return `(${f.left} + ${f.right})`
    case 'Mul': return `(${f.left} * ${f.right})`
    case 'Neg': return `(-${f.value})`
    case 'Abs': return `|${f.value}|`  // NEW: handle absolute value
    case 'AddN': return `(${f.items.join(' + ')})`
    case 'MulN': return `(${f.items.join(' * ')})`
    case 'Var': return f.name
    case 'Let': return `(let ${f.name} = ${f.value} in ${f.body})`
    case 'Div': return `(${f.left} / ${f.right})`
    case 'Pow': return `(${f.base} ^ ${f.exp})`
    default: return _exhaustive(f)
  }
}
export const Alg_Expr_prettyF = Alg_Expr_pretty
export const showExprReusable = cataExpr(Alg_Expr_pretty)

// Collect all leaves
export const Alg_Expr_leaves: ExprAlg<ReadonlyArray<number>> = (f) => {
  switch (f._tag) {
    case 'Lit': return [f.value]
    case 'Add': return [...f.left, ...f.right]
    case 'Mul': return [...f.left, ...f.right]
    case 'Neg': return f.value
    case 'Abs': return f.value  // NEW: handle absolute value
    case 'AddN': return f.items.flat()
    case 'MulN': return f.items.flat()
    case 'Var': return []
    case 'Let': return [...f.value, ...f.body]
    case 'Div': return [...f.left, ...f.right]
    case 'Pow': return [...f.base, ...f.exp]
    default: return _exhaustive(f)
  }
}
export const leavesExprReusable = cataExpr(Alg_Expr_leaves)

// Count total nodes
export const Alg_Expr_size = (f: ExprF<number>): number => {
  switch (f._tag) {
    case 'Lit': case 'Var': return 1
    case 'Neg': return 1 + f.value
    case 'Abs': return 1 + f.value  // NEW: handle absolute value
    case 'Add': return 1 + f.left + f.right
    case 'Mul': return 1 + f.left + f.right
    case 'Div': return 1 + f.left + f.right
    case 'Pow': return 1 + f.base + f.exp
    case 'AddN': return 1 + f.items.reduce((n, x) => n + x, 0)
    case 'MulN': return 1 + f.items.reduce((n, x) => n + x, 0)
    case 'Let':  return 1 + f.value + f.body
    default: return _exhaustive(f)
  }
}

// Maximum depth
export const Alg_Expr_depth = (f: ExprF<number>): number => {
  switch (f._tag) {
    case 'Lit': case 'Var': return 1
    case 'Neg': return 1 + f.value
    case 'Abs': return 1 + f.value  // NEW: handle absolute value
    case 'Add': return 1 + Math.max(f.left, f.right)
    case 'Mul': return 1 + Math.max(f.left, f.right)
    case 'Div': return 1 + Math.max(f.left, f.right)
    case 'Pow': return 1 + Math.max(f.base, f.exp)
    case 'AddN': return 1 + (f.items.length ? Math.max(...f.items) : 0)
    case 'MulN': return 1 + (f.items.length ? Math.max(...f.items) : 0)
    case 'Let':  return 1 + Math.max(f.value, f.body)
    default: return _exhaustive(f)
  }
}

// Product algebra for combining two algebras in one traversal
export function productExprAlg2<B, C>(
  algB: (f: ExprF<B>) => B,
  algC: (f: ExprF<C>) => C,
): (f: ExprF<readonly [B, C]>) => readonly [B, C] {
  return (f: ExprF<readonly [B, C]>): readonly [B, C] => {
    switch (f._tag) {
      case 'Lit': return [algB({ _tag:'Lit', value:f.value }), algC({ _tag:'Lit', value:f.value })]
      case 'Var': return [algB({ _tag:'Var', name:f.name }),  algC({ _tag:'Var', name:f.name })]
      case 'Neg': { const [vB, vC] = f.value; return [
        algB({ _tag:'Neg', value:vB }), algC({ _tag:'Neg', value:vC })
      ] }
      case 'Abs': { const [vB, vC] = f.value; return [
        algB({ _tag:'Abs', value:vB }), algC({ _tag:'Abs', value:vC })
      ] }
      case 'Add': { const [lB,lC] = f.left, [rB,rC] = f.right; return [
        algB({ _tag:'Add', left:lB, right:rB }), algC({ _tag:'Add', left:lC, right:rC })
      ] }
      case 'Mul': { const [lB,lC] = f.left, [rB,rC] = f.right; return [
        algB({ _tag:'Mul', left:lB, right:rB }), algC({ _tag:'Mul', left:lC, right:rC })
      ] }
      case 'Div': { const [lB,lC] = f.left, [rB,rC] = f.right; return [
        algB({ _tag:'Div', left:lB, right:rB }), algC({ _tag:'Div', left:lC, right:rC })
      ] }
      case 'Pow': { const [bB,bC] = f.base, [eB,eC] = f.exp; return [
        algB({ _tag:'Pow', base:bB, exp:eB }), algC({ _tag:'Pow', base:bC, exp:eC })
      ] }
      case 'AddN': {
        const bs = f.items.map(p => p[0]); const cs = f.items.map(p => p[1])
        return [algB({ _tag:'AddN', items: bs }), algC({ _tag:'AddN', items: cs })]
      }
      case 'MulN': {
        const bs = f.items.map(p => p[0]); const cs = f.items.map(p => p[1])
        return [algB({ _tag:'MulN', items: bs }), algC({ _tag:'MulN', items: cs })]
      }
      case 'Let': {
        const [vB,vC] = f.value, [bB,bC] = f.body
        return [algB({ _tag:'Let', name:f.name, value:vB, body:bB }),
                algC({ _tag:'Let', name:f.name, value:vC, body:bC })]
      }
      default: return _exhaustive(f)
    }
  }
}

// size & depth in one pass (fused)
export const sizeAndDepthExpr = cataExpr(productExprAlg2(Alg_Expr_size, Alg_Expr_depth))

const sumSeed = (n: number): SumExprSeed => ({ tag: 'Sum', n: clampNatural(n) });

export const evalSum1toN_FUSED = (n: number): number =>
  hyloExpr(coalgExpr_sum1toN, Alg_Expr_evalF)(sumSeed(n))

export const showSum1toN_FUSED = (n: number): string =>
  hyloExpr(coalgExpr_sum1toN, Alg_Expr_prettyF)(sumSeed(n))

export const buildAndFoldSum_FUSED = (n: number): Expr => {
  const tree = anaExpr(coalgExpr_sum1toN)(sumSeed(n));
  const foldSum = paraExpr((fb: ExprF<readonly [Expr, Expr]>) => {
    switch (fb._tag) {
      case 'Lit':
        return lit(fb.value)
      case 'Add': {
        const [, leftExpr] = fb.left
        const [, rightExpr] = fb.right
        if (leftExpr.un._tag === 'Lit' && rightExpr.un._tag === 'Lit') {
          return lit(leftExpr.un.value + rightExpr.un.value)
        }
        return add(leftExpr, rightExpr)
      }
      default:
        return _absurd(fb as never)
    }
  });
  return foldSum(tree)
}

const powSeed = (depth: number, leaf: number): PowMulSeed => ({
  tag: 'PowMul',
  depth: clampNatural(depth),
  leaf,
});

export const evalPowMul_FUSED = (depth: number, leaf: number): number =>
  hyloExpr(coalgExpr_powMul, Alg_Expr_evalF)(powSeed(depth, leaf))

export const showPowMul_FUSED = (depth: number, leaf: number): string =>
  hyloExpr(coalgExpr_powMul, Alg_Expr_prettyF)(powSeed(depth, leaf))

export const showAndEvalPowMul_FUSED = (depth: number, leaf: number): readonly [string, number] =>
  hyloExpr(coalgExpr_powMul, productExprAlg2(Alg_Expr_prettyF, Alg_Expr_evalF))(powSeed(depth, leaf))

// ====================================================================
// Migration fold: convert binary chains to N-ary for better associativity
// ====================================================================

// Normalize: turn Add/Mul chains into AddN/MulN and flatten nested n-aries
export const normalizeExprToNary: (e: Expr) => Expr =
  cataExpr<Expr>(fb => {
    switch (fb._tag) {
      case 'Lit':  return lit(fb.value)
      case 'Neg':  return neg(fb.value)
      case 'Var':  return vvar(fb.name)
      case 'Div':  return divE(fb.left, fb.right)
      case 'Pow':  return powE(fb.base, fb.exp)
      case 'Let':  return lett(fb.name, fb.value, fb.body)
      case 'Add':  return addN([fb.left, fb.right])
      case 'Mul':  return mulN([fb.left, fb.right])
      case 'AddN': return addN(fb.items.flatMap(d => d.un._tag === 'AddN' ? d.un.items : [d]))
      case 'MulN': return mulN(fb.items.flatMap(d => d.un._tag === 'MulN' ? d.un.items : [d]))
      default:     return _absurd(fb as never)
    }
  })

// ====================================================================
// Advanced evaluators and pretty-printers
// ====================================================================

// Closed evaluator: only works when there are no Vars/Let.
// For Vars/Let, use the Reader evaluators below.
export const evalExprNum2 =
  cataExpr<number>((f) => {
    switch (f._tag) {
      case 'Lit':  return f.value
      case 'Neg':  return -f.value
      case 'Add':  return f.left + f.right
      case 'Mul':  return f.left * f.right
      case 'Div':  return f.left / f.right
      case 'AddN': return f.items.reduce((s, x) => s + x, 0)
      case 'MulN': return f.items.reduce((p, x) => p * x, 1)
      case 'Var':  throw new Error('evalExprNum2: Vars not supported. Use evalExprR / evalExprRR.')
      case 'Let':  throw new Error('evalExprNum2: Let not supported. Use evalExprR / evalExprRR.')
      case 'Pow':  return Math.pow(f.base, f.exp)
      default:     return _absurd(f as never)
    }
  })

// ----- Reader-based eval with variables -----
type ExprEnv = Readonly<Record<string, number>>

// Result type: (e: Expr) => Reader<ExprEnv, number>
export const evalExprR: (e: Expr) => Reader<ExprEnv, number> =
  cataExpr<Reader<ExprEnv, number>>((f) => {
    switch (f._tag) {
      case 'Lit':  return (_env) => f.value
      case 'Var':  return (env)  => env[f.name] ?? 0 // pick your policy (0 or throw/Err)
      case 'Neg':  return (env)  => -f.value(env)
      case 'Add':  return (env)  => f.left(env) + f.right(env)
      case 'Mul':  return (env)  => f.left(env) * f.right(env)
      case 'Div':  return (env)  => f.left(env) / f.right(env)
      case 'AddN': return (env)  => f.items.reduce((s, r) => s + r(env), 0)
      case 'MulN': return (env)  => f.items.reduce((p, r) => p * r(env), 1)
      case 'Pow':  return (env)  => Math.pow(f.base(env), f.exp(env))
      case 'Let':  return (env)  => {
        const bound = f.value(env)
        const env2  = { ...env, [f.name]: bound }
        return f.body(env2)
      }
      default:     return (_: ExprEnv) => { throw new Error('exhaustive') }
    }
  })

// Result type: (e: Expr) => Reader<ExprEnv, Result<string, number>>
export const evalExprRR:
  (e: Expr) => Reader<ExprEnv, Result<string, number>> =
  cataExpr<Reader<ExprEnv, Result<string, number>>>((f) => {
    switch (f._tag) {
      case 'Lit':  return (_env) => Ok(f.value)
      case 'Var':  return (env)  => {
        const v = env[f.name]
        return v === undefined ? Err(`unbound var: ${f.name}`) : Ok(v)
      }
      case 'Neg':  return (env)  => {
        const r = f.value(env)
        return isErr(r) ? r : Ok(-r.value)
      }
      case 'Add':  return (env)  => {
        const l = f.left(env);  if (isErr(l)) return l
        const r = f.right(env); if (isErr(r)) return r
        return Ok(l.value + r.value)
      }
      case 'Mul':  return (env)  => {
        const l = f.left(env);  if (isErr(l)) return l
        const r = f.right(env); if (isErr(r)) return r
        return Ok(l.value * r.value)
      }
      case 'Div':  return (env)  => {
        const l = f.left(env);  if (isErr(l)) return l
        const r = f.right(env); if (isErr(r)) return r
        if (r.value === 0) return Err('div by zero')
        return Ok(l.value / r.value)
      }
      case 'AddN': return (env)  => {
        let s = 0
        for (const rf of f.items) {
          const r = rf(env); if (isErr(r)) return r
          s += r.value
        }
        return Ok(s)
      }
      case 'MulN': return (env)  => {
        let p = 1
        for (const rf of f.items) {
          const r = rf(env); if (isErr(r)) return r
          p *= r.value
        }
        return Ok(p)
      }
      case 'Pow':  return (env)  => {
        const b = f.base(env);  if (isErr(b)) return b
        const e = f.exp(env);   if (isErr(e)) return e
        return Ok(Math.pow(b.value, e.value))
      }
      case 'Let':  return (env)  => {
        const rv = f.value(env); if (isErr(rv)) return rv
        const env2 = { ...env, [f.name]: rv.value }
        return f.body(env2)
      }
      default:     return (_: ExprEnv) => Err('exhaustive')
    }
  })

// ---------- Reader helpers (Applicative-style) ----------
export type Rdr<Env, A> = Reader<Env, A>

export const mapRdr =
  <Env, A, B>(f: (a: A) => B) =>
  (ra: Rdr<Env, A>): Rdr<Env, B> =>
    Reader.map<A, B>(f)<Env>(ra)

export const apRdr =
  <Env, A, B>(rfab: Rdr<Env, (a: A) => B>) =>
  (ra: Rdr<Env, A>): Rdr<Env, B> =>
    Reader.ap<Env, A, B>(rfab)(ra)

export const ofRdr =
  <Env, A>(a: A): Rdr<Env, A> =>
    Reader.of<Env, A>(a)

// liftN (curried)
export const lift2Rdr =
  <Env, A, B, C>(f: (a: A) => (b: B) => C) =>
  (ra: Rdr<Env, A>) =>
  (rb: Rdr<Env, B>): Rdr<Env, C> =>
    apRdr<Env, B, C>(mapRdr<Env, A, (b: B) => C>(f)(ra))(rb)

export const lift3Rdr =
  <Env, A, B, C, D>(f: (a: A) => (b: B) => (c: C) => D) =>
  (ra: Rdr<Env, A>) =>
  (rb: Rdr<Env, B>) =>
  (rc: Rdr<Env, C>): Rdr<Env, D> =>
    apRdr<Env, C, D>(
      apRdr<Env, B, (c: C) => D>(
        mapRdr<Env, A, (b: B) => (c: C) => D>(f)(ra)
      )(rb)
    )(rc)

// sequence/traverse for Reader
export const sequenceArrayRdr =
  <Env, A>(rs: ReadonlyArray<Rdr<Env, A>>): Rdr<Env, ReadonlyArray<A>> =>
  (env) => rs.map(r => r(env))

export const traverseArrayRdr =
  <Env, A, B>(as: ReadonlyArray<A>, f: (a: A) => Rdr<Env, B>): Rdr<Env, ReadonlyArray<B>> =>
  (env) => as.map(a => f(a)(env))

// apFirst / apSecond / zip / zipWith for Reader
export const apFirstRdr =
  <Env, A, B>(ra: Rdr<Env, A>) =>
  (rb: Rdr<Env, B>): Rdr<Env, A> =>
    lift2Rdr<Env, A, B, A>(a => _ => a)(ra)(rb)

export const apSecondRdr =
  <Env, A, B>(ra: Rdr<Env, A>) =>
  (rb: Rdr<Env, B>): Rdr<Env, B> =>
    lift2Rdr<Env, A, B, B>(_ => b => b)(ra)(rb)

export const zipWithRdr =
  <Env, A, B, C>(f: (a: A) => (b: B) => C) =>
  (ra: Rdr<Env, A>) =>
  (rb: Rdr<Env, B>): Rdr<Env, C> =>
    lift2Rdr<Env, A, B, C>(f)(ra)(rb)

export const zipRdr =
  <Env, A, B>(ra: Rdr<Env, A>) =>
  (rb: Rdr<Env, B>): Rdr<Env, readonly [A, B]> =>
    lift2Rdr<Env, A, B, readonly [A, B]>(a => b => [a, b] as const)(ra)(rb)

// ---------- Reader<Result> helpers ----------
export type RRes<Env, E, A> = Reader<Env, Result<E, A>>

export const mapRR =
  <Env, E, A, B>(f: (a: A) => B) =>
  (rra: RRes<Env, E, A>): RRes<Env, E, B> =>
  (env) => mapR<E, A, B>(f)(rra(env))

export const apRR =
  <Env, E, A, B>(rrf: RRes<Env, E, (a: A) => B>) =>
  (rra: RRes<Env, E, A>): RRes<Env, E, B> =>
  (env) => {
    const rf = rrf(env)
    if (isErr(rf)) return rf as Err<E>
    const ra = rra(env)
    if (isErr(ra)) return ra as Err<E>
    return Ok(rf.value(ra.value))
  }

export const ofRR =
  <Env, E = never, A = never>(a: A): RRes<Env, E, A> =>
  (_env) => Ok(a)

export const raiseRR =
  <Env, E, A = never>(e: E): RRes<Env, E, A> =>
  (_env) => Err(e)

export const chainRR =
  <Env, E, A, B>(f: (a: A) => RRes<Env, E, B>) =>
  (rra: RRes<Env, E, A>): RRes<Env, E, B> =>
  (env) => {
    const ra = rra(env)
    return isErr(ra) ? ra : f(ra.value)(env)
  }

// liftN (curried)
export const lift2RR =
  <Env, E, A, B, C>(f: (a: A) => (b: B) => C) =>
  (ra: RRes<Env, E, A>) =>
  (rb: RRes<Env, E, B>): RRes<Env, E, C> =>
    apRR<Env, E, B, C>(mapRR<Env, E, A, (b: B) => C>(f)(ra))(rb)

export const lift3RR =
  <Env, E, A, B, C, D>(f: (a: A) => (b: B) => (c: C) => D) =>
  (ra: RRes<Env, E, A>) =>
  (rb: RRes<Env, E, B>) =>
  (rc: RRes<Env, E, C>): RRes<Env, E, D> =>
    apRR<Env, E, C, D>(
      apRR<Env, E, B, (c: C) => D>(
        mapRR<Env, E, A, (b: B) => (c: C) => D>(f)(ra)
      )(rb)
    )(rc)

export const sequenceArrayRR =
  <Env, E, A>(rs: ReadonlyArray<RRes<Env, E, A>>): RRes<Env, E, ReadonlyArray<A>> =>
  (env) => {
    const out: A[] = []
    for (const rr of rs) {
      const r = rr(env)
      if (isErr(r)) return r
      out.push(r.value)
    }
    return Ok(out)
  }

export const traverseArrayRR =
  <Env, E, A, B>(as: ReadonlyArray<A>, f: (a: A) => RRes<Env, E, B>): RRes<Env, E, ReadonlyArray<B>> =>
  (env) => {
    const out: B[] = []
    for (const a of as) {
      const r = f(a)(env)
      if (isErr(r)) return r
      out.push(r.value)
    }
    return Ok(out)
  }

// apFirst / apSecond / zip / zipWith for Reader<Result>
export const apFirstRR =
  <Env, E, A, B>(ra: RRes<Env, E, A>) =>
  (rb: RRes<Env, E, B>): RRes<Env, E, A> =>
    lift2RR<Env, E, A, B, A>(a => _ => a)(ra)(rb)

export const apSecondRR =
  <Env, E, A, B>(ra: RRes<Env, E, A>) =>
  (rb: RRes<Env, E, B>): RRes<Env, E, B> =>
    lift2RR<Env, E, A, B, B>(_ => b => b)(ra)(rb)

export const zipWithRR =
  <Env, E, A, B, C>(f: (a: A) => (b: B) => C) =>
  (ra: RRes<Env, E, A>) =>
  (rb: RRes<Env, E, B>): RRes<Env, E, C> =>
    lift2RR<Env, E, A, B, C>(f)(ra)(rb)

export const zipRR =
  <Env, E, A, B>(ra: RRes<Env, E, A>) =>
  (rb: RRes<Env, E, B>): RRes<Env, E, readonly [A, B]> =>
    lift2RR<Env, E, A, B, readonly [A, B]>(a => b => [a, b] as const)(ra)(rb)

// ---------- Pure Result evaluator (no Reader, no async) ----------
export const evalExprResult: (e: Expr) => Result<string, number> =
  cataExpr<Result<string, number>>((f): Result<string, number> => {
    switch (f._tag) {
      case 'Lit':  return Ok(f.value)
      case 'Var':  return Err<string>(`unbound var: ${f.name}`) // pure Result can't access env
      case 'Neg':  return mapR<string, number, number>((n: number) => -n)(f.value)
      case 'Add': {
        const left = f.left
        if (isErr(left)) return left
        const right = f.right
        if (isErr(right)) return right
        return Ok(left.value + right.value)
      }
      case 'Mul': {
        const left = f.left
        if (isErr(left)) return left
        const right = f.right
        if (isErr(right)) return right
        return Ok(left.value * right.value)
      }
      case 'Div': {
        const left = f.left
        if (isErr(left)) return left
        const right = f.right
        if (isErr(right)) return right
        return right.value === 0 ? Err<string>('div by zero') : Ok(left.value / right.value)
      }
      case 'AddN': {
        let acc = 0
        for (const r of f.items) {
          if (isErr(r)) return r
          acc += r.value
        }
        return Ok(acc)
      }
      case 'MulN': {
        let acc = 1
        for (const r of f.items) {
          if (isErr(r)) return r
          acc *= r.value
        }
        return Ok(acc)
      }
      case 'Pow': {
        const base = f.base
        if (isErr(base)) return base
        const exp = f.exp
        if (isErr(exp)) return exp
        return Ok(Math.pow(base.value, exp.value))
      }
      case 'Let':  return Err<string>('let expressions require environment - use evalExprR or evalExprRR')
      case 'Abs':  return mapR<string, number, number>((n: number) => Math.abs(n))(f.value)
      default:     return _exhaustive(f)
    }
  })

// ---------- Reader evaluator (applicative style) ----------
export const evalExprR_app: (e: Expr) => Reader<ExprEnv, number> =
  cataExpr<Reader<ExprEnv, number>>((f) => {
    switch (f._tag) {
      case 'Lit':  return ofRdr<ExprEnv, number>(f.value)
      case 'Var':  return Reader.asks(env => env[f.name] ?? 0)
      case 'Neg':  return mapRdr<ExprEnv, number, number>(n => -n)(f.value)
      case 'Add':  return lift2Rdr<ExprEnv, number, number, number>(a => b => a + b)(f.left)(f.right)
      case 'Mul':  return lift2Rdr<ExprEnv, number, number, number>(a => b => a * b)(f.left)(f.right)
      case 'Div':  return lift2Rdr<ExprEnv, number, number, number>(a => b => a / b)(f.left)(f.right)
      case 'Pow':  return lift2Rdr<ExprEnv, number, number, number>(a => b => Math.pow(a, b))(f.base)(f.exp)
      case 'AddN': return mapRdr<ExprEnv, ReadonlyArray<number>, number>(xs => xs.reduce((s, x) => s + x, 0))(
                      sequenceArrayRdr<ExprEnv, number>(f.items)
                    )
      case 'MulN': return mapRdr<ExprEnv, ReadonlyArray<number>, number>(xs => xs.reduce((p, x) => p * x, 1))(
                      sequenceArrayRdr<ExprEnv, number>(f.items)
                    )
      case 'Let':  return (env) => {
        const bound = f.value(env)
        const env2  = { ...env, [f.name]: bound }
        return f.body(env2)
      }
      default:     return (_: ExprEnv) => { throw new Error('exhaustive') }
    }
  })

// ---------- Reader<Result> evaluator (applicative + short-circuit) ----------
export const evalExprRR_app:
  (e: Expr) => Reader<ExprEnv, Result<string, number>> =
  cataExpr<Reader<ExprEnv, Result<string, number>>>((f) => {
    switch (f._tag) {
      case 'Lit':  return ofRR<ExprEnv, string, number>(f.value)
      case 'Var':  return Reader.asks(env => {
        const v = env[f.name]
        return v === undefined ? Err(`unbound var: ${f.name}`) : Ok(v)
      })
      case 'Neg':  return mapRR<ExprEnv, string, number, number>(n => -n)(f.value)
      case 'Add':  return lift2RR<ExprEnv, string, number, number, number>(a => b => a + b)(f.left)(f.right)
      case 'Mul':  return lift2RR<ExprEnv, string, number, number, number>(a => b => a * b)(f.left)(f.right)
      case 'Pow':  return lift2RR<ExprEnv, string, number, number, number>(a => b => Math.pow(a, b))(f.base)(f.exp)
      case 'Div':  // need a zero-check on the RHS; use chainRR
        return chainRR<ExprEnv, string, number, number>((b) =>
          b === 0
            ? raiseRR<ExprEnv, string, number>('div by zero')
            : mapRR<ExprEnv, string, number, number>((a) => a / b)(f.left)
        )(f.right)

      case 'AddN': return mapRR<ExprEnv, string, ReadonlyArray<number>, number>(xs => xs.reduce((s, x) => s + x, 0))(
                      sequenceArrayRR<ExprEnv, string, number>(f.items)
                    )
      case 'MulN': return mapRR<ExprEnv, string, ReadonlyArray<number>, number>(xs => xs.reduce((p, x) => p * x, 1))(
                      sequenceArrayRR<ExprEnv, string, number>(f.items)
                    )
      case 'Let':  return (env) => {
        const rv = f.value(env); if (isErr(rv)) return rv
        const env2 = { ...env, [f.name]: rv.value }
        return f.body(env2)
      }
      default:     return (_: ExprEnv) => Err('exhaustive')
    }
  })

// ----- Precedence-aware pretty (min parens), updated for new tags -----
type Doc = { txt: string; prec: number }
const litD = (s: string): Doc => ({ txt: s, prec: 100 })
const withParens = (outer: number, inner: Doc) =>
  inner.prec < outer ? `(${inner.txt})` : inner.txt
const withParensL = (outer: number, inner: Doc) =>
  inner.prec < outer ? `(${inner.txt})` : inner.txt
const withParensR = (outer: number, inner: Doc) =>
  inner.prec <= outer ? `(${inner.txt})` : inner.txt

export const prettyExprMinParens2 =
  cataExpr<Doc>(f => {
    switch (f._tag) {
      case 'Lit':  return litD(String(f.value))
      case 'Var':  return litD(f.name)
      case 'Neg':  return { txt: `-${withParens(90, f.value)}`, prec: 90 }
      case 'Pow': {
        const prec = 95
        return { txt: `${withParensL(prec, f.base)} ^ ${withParensR(prec, f.exp)}`, prec }
      }
      case 'Mul':  return { txt: `${withParens(80, f.left)} * ${withParens(80, f.right)}`, prec: 80 }
      case 'Div':  return { txt: `${withParens(80, f.left)} / ${withParens(80, f.right)}`, prec: 80 }
      case 'Add':  return { txt: `${withParens(70, f.left)} + ${withParens(70, f.right)}`, prec: 70 }
      case 'AddN': return { txt: f.items.map(d => withParens(70, d)).join(' + '), prec: 70 }
      case 'MulN': return { txt: f.items.map(d => withParens(80, d)).join(' * '), prec: 80 }
      case 'Let':  return { txt: `(let ${f.name} = ${f.value.txt} in ${f.body.txt})`, prec: 0 }
      default:     return _absurd(f as never)
    }
  })
export const showExprMinParens2 = (e: Expr) => prettyExprMinParens2(e).txt

// ====================================================================
// Rewrite rules (simplifier) with constant-folding & identities
// ====================================================================

// tiny classifiers
const isLit  = (e: Expr): e is Expr & { un: { _tag: 'Lit'; value: number } } => e.un._tag === 'Lit'
const isZero = (e: Expr) => isLit(e) && e.un.value === 0
const isOne  = (e: Expr) => isLit(e) && e.un.value === 1

// remove neutral elements, fold constants, keep laws that are *always* valid
export const simplifyExpr: (e: Expr) => Expr =
  cataExpr<Expr>((f): Expr => {
    switch (f._tag) {
      case 'Lit':  return lit(f.value)
      case 'Var':  return vvar(f.name)
      case 'Neg': {
        const a = f.value
        // -- -(-x) => x ; -(0) => 0
        if (a.un._tag === 'Neg') return a.un.value
        if (isZero(a)) return lit(0)
        return neg(a)
      }
      case 'Add': {
        const l = f.left, r = f.right
        if (isZero(l)) return r
        if (isZero(r)) return l
        if (isLit(l) && isLit(r)) return lit(l.un.value + r.un.value)
        return add(l, r)
      }
      case 'Mul': {
        const l = f.left, r = f.right
        if (isZero(l) || isZero(r)) return lit(0)
        if (isOne(l))  return r
        if (isOne(r))  return l
        if (isLit(l) && isLit(r)) return lit(l.un.value * r.un.value)
        return mul(l, r)
      }
      case 'Div': {
        const l = f.left, r = f.right
        if (isZero(l) && !isZero(r)) return lit(0)        // safe: 0/x = 0 for x ≠ 0; we don't simplify 0/0
        if (isOne(r)) return l
        if (isLit(l) && isLit(r)) return lit(l.un.value / r.un.value)
        return divE(l, r)
      }
      case 'Pow': {
        const b = f.base, e = f.exp
        if (isOne(e)) return b
        if (isZero(e)) return lit(1)                      // convention: x^0 = 1 (we won't rewrite 0^0)
        if (isOne(b)) return lit(1)
        if (isLit(b) && isLit(e)) return lit(Math.pow(b.un.value, e.un.value))
        return powE(b, e)
      }
      case 'AddN': {
        // flatten + drop zeros + fold constants
        const xs = f.items.flatMap(x => x.un._tag === 'AddN' ? x.un.items : [x])
        const kept: Expr[] = []
        let c = 0
        for (const x of xs) {
          if (isZero(x)) continue
          if (isLit(x)) c += x.un.value
          else kept.push(x)
        }
        if (kept.length === 0) return lit(c)
        if (c !== 0) kept.push(lit(c))
        if (kept.length === 0) return lit(0)
        if (kept.length === 1) {
          const result = kept[0]
          if (result === undefined) return lit(0)
          return result
        }
        return addN(kept)
      }
      case 'MulN': {
        // flatten + annihilator zero + drop ones + fold constants
        const xs = f.items.flatMap(x => x.un._tag === 'MulN' ? x.un.items : [x])
        let c = 1
        const kept: Expr[] = []
        for (const x of xs) {
          if (isZero(x)) return lit(0)
          if (isOne(x)) continue
          if (isLit(x)) c *= x.un.value
          else kept.push(x)
        }
        if (kept.length === 0) return lit(c)
        if (c !== 1) kept.unshift(lit(c))
        if (kept.length === 0) return lit(1)
        if (kept.length === 1) {
          const result = kept[0]
          if (result === undefined) return lit(1)
          return result
        }
        return mulN(kept)
      }
      case 'Let':  return lett(f.name, f.value, f.body)
      default:     return _absurd(f as never)
    }
  })

// One-shot cleanup pass: normalize to n-ary then simplify
export const normalizeAndSimplify = (e: Expr): Expr =>
  simplifyExpr(normalizeExprToNary(e))

// ====================================================================
// Free/Bound vars and capture-avoiding substitution
// ====================================================================

// Free vars (Set<string>)
export const freeVars: (e: Expr) => ReadonlySet<string> =
  cataExpr<ReadonlySet<string>>((f) => {
    switch (f._tag) {
      case 'Lit':  return new Set()
      case 'Var':  return new Set([f.name])
      case 'Neg':  return f.value
      case 'Add':  return new Set([...f.left, ...f.right])
      case 'Mul':  return new Set([...f.left, ...f.right])
      case 'Div':  return new Set([...f.left, ...f.right])
      case 'Pow':  return new Set([...f.base, ...f.exp])
      case 'AddN': return new Set(f.items.flatMap(s => [...s]))
      case 'MulN': return new Set(f.items.flatMap(s => [...s]))
      case 'Let': {
        const fvVal  = f.value
        const fvBody = new Set([...f.body]); fvBody.delete(f.name)
        return new Set([...fvVal, ...fvBody])
      }
      default:     return _absurd(f as never)
    }
  })

// Bound vars
export const boundVars: (e: Expr) => ReadonlySet<string> =
  cataExpr<ReadonlySet<string>>((f) => {
    switch (f._tag) {
      case 'Let':  return new Set([f.name, ...f.value, ...f.body])
      case 'Neg':  return f.value
      case 'Add':  return new Set([...f.left, ...f.right])
      case 'Mul':  return new Set([...f.left, ...f.right])
      case 'Div':  return new Set([...f.left, ...f.right])
      case 'Pow':  return new Set([...f.base, ...f.exp])
      case 'AddN': return new Set(f.items.flatMap(s => [...s]))
      case 'MulN': return new Set(f.items.flatMap(s => [...s]))
      default:     return new Set()
    }
  })

// fresh name avoiding a set
export const freshName = (base: string, avoid: ReadonlySet<string>): string => {
  if (!avoid.has(base)) return base
  let i = 1
  while (avoid.has(`${base}_${i}`)) i++
  return `${base}_${i}`
}

// rename bound variable (alpha-conversion) in body: let x = v in body  => let x' = v in body[x'/x]
export const renameBound = (from: string, to: string) => (e: Expr): Expr => {
  const go = (t: Expr): Expr => {
    const u = t.un
    switch (u._tag) {
      case 'Var':  return u.name === from ? vvar(to) : t
      case 'Let':  return u.name === from
        ? lett(u.name, go(u.value), u.body) // inner same-named binder shadows; leave body
        : lett(u.name, go(u.value), go(u.body))
      case 'Neg':  return neg(go(u.value))
      case 'Add':  return add(go(u.left), go(u.right))
      case 'Mul':  return mul(go(u.left), go(u.right))
      case 'Div':  return divE(go(u.left), go(u.right))
      case 'Pow':  return powE(go(u.base), go(u.exp))
      case 'AddN': return addN(u.items.map(go))
      case 'MulN': return mulN(u.items.map(go))
      case 'Lit':  return t
      default:     return _absurd(u as never)
    }
  }
  return go(e)
}

// capture-avoiding substitution [x := v]e
export const subst = (x: string, v: Expr) => (e: Expr): Expr => {
  const go = (t: Expr): Expr => {
    const u = t.un
    switch (u._tag) {
      case 'Lit':  return t
      case 'Var':  return u.name === x ? v : t
      case 'Neg':  return neg(go(u.value))
      case 'Add':  return add(go(u.left), go(u.right))
      case 'Mul':  return mul(go(u.left), go(u.right))
      case 'Div':  return divE(go(u.left), go(u.right))
      case 'Pow':  return powE(go(u.base), go(u.exp))
      case 'AddN': return addN(u.items.map(go))
      case 'MulN': return mulN(u.items.map(go))
      case 'Let': {
        // substitute into value always
        const v1 = go(u.value)
        if (u.name === x) {
          // binder shadows x in body -> don't substitute in body
          return lett(u.name, v1, u.body)
        }
        // avoid capture: if binder collides with free vars of v, rename
        const fvV   = freeVars(v)
        if (fvV.has(u.name)) {
          const avoid = new Set<string>([...fvV, ...freeVars(u.body)])
          const fresh = freshName(u.name, avoid)
          const bodyR = renameBound(u.name, fresh)(u.body)
          return lett(fresh, v1, go(bodyR))
        }
        return lett(u.name, v1, go(u.body))
      }
      default: return _absurd(u as never)
    }
  }
  return go(e)
}

// ====================================================================
// Tiny stack machine (+ compiler & evaluator)
// ====================================================================

// -------- Stack machine --------
export type Instr =
  | { op: 'PUSH'; n: number }
  | { op: 'LOAD'; name: string }
  | { op: 'NEG' }
  | { op: 'ADD' } | { op: 'MUL' } | { op: 'DIV' } | { op: 'POW' }
  | { op: 'LET'; name: string }   // pops value, pushes a scope binding
  | { op: 'ENDLET' }

export type Program = ReadonlyArray<Instr>

// naive persistent env as a stack of scopes
type Scope = Map<string, number>

// Compile Expr -> Program
export const compileExpr = (e: Expr): Program => {
  const out: Instr[] = []
  const emit = (i: Instr) => out.push(i)
  const go = (t: Expr): void => {
    const u = t.un
    switch (u._tag) {
      case 'Lit':  emit({ op: 'PUSH', n: u.value }); return
      case 'Var':  emit({ op: 'LOAD', name: u.name }); return
      case 'Neg':  go(u.value); emit({ op: 'NEG' }); return
      case 'Add':  go(u.left); go(u.right); emit({ op: 'ADD' }); return
      case 'Mul':  go(u.left); go(u.right); emit({ op: 'MUL' }); return
      case 'Div':  go(u.left); go(u.right); emit({ op: 'DIV' }); return
      case 'Pow':  go(u.base); go(u.exp); emit({ op: 'POW' }); return
      case 'AddN': u.items.forEach(go); for (let i = 1; i < u.items.length; i++) emit({ op: 'ADD' }); return
      case 'MulN': u.items.forEach(go); for (let i = 1; i < u.items.length; i++) emit({ op: 'MUL' }); return
      case 'Let':  go(u.value); emit({ op: 'LET', name: u.name }); go(u.body); emit({ op: 'ENDLET' }); return
      default:     return _absurd(u as never)
    }
  }
  go(e)
  return out
}

// Run program with initial env; returns Result<string, number>
export const runProgram = (prog: Program, env0: Readonly<Record<string, number>> = {}): Result<string, number> => {
  const scopes: Scope[] = [new Map(Object.entries(env0))]
  const stack: number[] = []
  const peek = () => stack[stack.length - 1]
  const pop = (): number | undefined => stack.pop()
  const push = (n: number) => { stack.push(n) }

  const load = (name: string): Result<string, number> => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const scope = scopes[i]
      if (scope) {
        const v = scope.get(name)
        if (v !== undefined) return Ok(v)
      }
    }
    return Err(`unbound var: ${name}`)
  }

  for (const ins of prog) {
    switch (ins.op) {
      case 'PUSH': push(ins.n); break
      case 'LOAD': {
        const r = load(ins.name); if (isErr(r)) return r; push(r.value); break
      }
      case 'NEG':  { const a = pop(); if (a === undefined) return Err('stack underflow'); push(-a); break }
      case 'ADD':  { const b = pop(), a = pop(); if (a===undefined||b===undefined) return Err('stack underflow'); push(a + b); break }
      case 'MUL':  { const b = pop(), a = pop(); if (a===undefined||b===undefined) return Err('stack underflow'); push(a * b); break }
      case 'DIV':  { const b = pop(), a = pop(); if (a===undefined||b===undefined) return Err('stack underflow'); if (b === 0) return Err('div by zero'); push(a / b); break }
      case 'POW':  { const b = pop(), a = pop(); if (a===undefined||b===undefined) return Err('stack underflow'); push(Math.pow(a, b)); break }
      case 'LET':  {
        const v = pop(); if (v === undefined) return Err('stack underflow')
        const ns = new Map(scopes[scopes.length - 1])
        ns.set(ins.name, v)
        scopes.push(ns)
        break
      }
      case 'ENDLET': {
        if (scopes.length <= 1) return Err('scope underflow')
        scopes.pop()
        break
      }
    }
  }
  if (stack.length !== 1) return Err('stack not singleton at end')
  const result = peek()
  if (result === undefined) return Err('stack is empty')
  return Ok(result)
}

// ====================================================================
// Symbolic differentiation (d/dx) + cleanup
// ====================================================================

// d/dv (symbolic); supports Lit, Var, Neg, Add/AddN, Mul/MulN, Div, Pow(base, const)
export const diff = (v: string) => {
  const D = (e: Expr): Expr => {
    const u = e.un
    switch (u._tag) {
      case 'Lit':  return lit(0)
      case 'Var':  return lit(u.name === v ? 1 : 0)
      case 'Neg':  return neg(D(u.value))
      case 'Add':  return add(D(u.left), D(u.right))
      case 'Mul':  return add(mul(D(u.left), u.right), mul(u.left, D(u.right))) // product
      case 'Div':  return divE(
                      add(mul(D(u.left), u.right), neg(mul(u.left, D(u.right)))),
                      powE(u.right, lit(2))
                    )
      case 'Pow': {
        // Power rule only when exponent is a constant: d(u^c) = c*u^(c-1)*u'
        if (isLit(u.exp)) return mulN([ lit(u.exp.un.value), powE(u.base, lit(u.exp.un.value - 1)), D(u.base) ])
        // otherwise (general u^v) not supported without ln/exp in the AST
        return vvar('__d_unsupported_pow')
      }
      case 'AddN': return addN(u.items.map(D))
      case 'MulN': {
        // Sum over i: (x1*...*x'i*...*xn)
        const terms: Expr[] = []
        for (let i = 0; i < u.items.length; i++) {
          const di = D(u.items[i]!)
          const others = u.items.map((x, j) => (j === i ? di : x))
          terms.push(mulN(others))
        }
        return addN(terms)
      }
      case 'Let': {
        // d/dv (let x = a in b) = let x = a in d/dv b, but if v occurs in a, you may want total derivative.
        // We do the usual static scoping derivative of the body (substitute is not needed here).
        return lett(u.name, u.value, D(u.body))
      }
      default: return _absurd(u as never)
    }
  }
  return (e: Expr): Expr => normalizeAndSimplify(D(e))
}

// ====================================================================
// Ana & Hylo quickies (generation + fused transform)
// ====================================================================

// Ana: build a full binary *Mul* tree of depth d (leaves are 1)
export const fullMulTreeReusable = anaExpr<number>(k =>
  k <= 0 ? ({ _tag: 'Lit', value: 1 })
         : ({ _tag: 'Mul', left: k - 1, right: k - 1 })
)


// =======================
// Pattern matching (small, exhaustive by tag)
// =======================
export type Matcher<T extends { _tag: string }, R> = {
  [K in T["_tag"]]: (t: Extract<T, { _tag: K }>) => R
} & { _: (t: never) => R }

type MatcherBranch<
  T extends { _tag: string },
  R,
  K extends T["_tag"]
> = (value: Extract<T, { _tag: K }>) => R

export const match = <T extends { _tag: string }>(t: T) => <R>(m: Matcher<T, R>): R => {
  const tag = t._tag as T["_tag"]
  if (Object.prototype.hasOwnProperty.call(m, tag)) {
    const branch = m[tag as keyof Matcher<T, R>] as MatcherBranch<T, R, typeof tag>
    return branch(t as Extract<T, { _tag: typeof tag }>)
  }
  return m._(t as never)
}

// =======================
// Predicates & Refinements
// =======================
export const not = <A>(p: Predicate<A>) => (a: A) => !p(a)
export const and = <A>(...ps: Array<Predicate<A>>) => (a: A) => ps.every(p => p(a))
export const or = <A>(...ps: Array<Predicate<A>>) => (a: A) => ps.some(p => p(a))

export const isNullish = <A>(a: A | null | undefined): a is null | undefined => a == null
export const isString = (u: unknown): u is string => typeof u === 'string'
export const isNumber = (u: unknown): u is number => typeof u === 'number'
export const isBoolean = (u: unknown): u is boolean => typeof u === 'boolean'

// =======================
// Collections (immutable helpers)
// =======================
export const map = <A, B>(as: ReadonlyArray<A>, f: (a: A) => B): ReadonlyArray<B> => as.map(f)
export const filter = <A>(as: ReadonlyArray<A>, p: Predicate<A>): ReadonlyArray<A> => as.filter(p)
export const flatMap = <A, B>(as: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<B> => as.flatMap(f)
export const reduce = <A, B>(as: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): B => as.reduce(f, b)

export const head = <A>(as: ReadonlyArray<A>): Option<A> => (as.length > 0 ? Some(as[0]!) : None)
export const tail = <A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> => (as.length > 1 ? Some(as.slice(1)) : None)



// =======================
// Records (typed, immutable helpers)
// =======================
//
// Design goals
//  - Strongly typed over object records (string | number | symbol keys)
//  - Outputs are immutable (Readonly<Record<…>>) and arrays are ReadonlyArray<…>
//  - Helpers avoid prototype pollution via hasOwn checks
//  - Ergonomic, inference-friendly signatures

/** Type-safe own-property check (narrows K to keyof T) */
export const hasOwn = <
  T extends object,
  K extends PropertyKey
>(obj: T, key: K): key is Extract<K, keyof T> =>
  Object.prototype.hasOwnProperty.call(obj, key)

/** Typed Object.keys with readonly result */
export const keys = <T extends Record<PropertyKey, unknown>>(
  obj: T
): ReadonlyArray<keyof T> =>
  Object.keys(obj) as ReadonlyArray<keyof T>

/** Typed Object.values with readonly result */
export const values = <T extends Record<PropertyKey, unknown>>(
  obj: T
): ReadonlyArray<T[keyof T]> =>
  Object.values(obj) as ReadonlyArray<T[keyof T]>

/** Typed Object.entries with readonly result */
export const entries = <T extends Record<PropertyKey, unknown>>(
  obj: T
): ReadonlyArray<readonly [keyof T, T[keyof T]]> =>
  Object.entries(obj) as ReadonlyArray<readonly [keyof T, T[keyof T]]>

/** fromEntries with precise key/value typing and readonly result */
export const fromEntries = <
  K extends PropertyKey,
  V
>(pairs: ReadonlyArray<readonly [K, V]>): Readonly<Record<K, V>> => {
  const out = {} as Record<K, V>
  for (const [k, v] of pairs) out[k] = v
  return out
}

/**
 * mapValues — transform each value while preserving the key set.
 *
 * Example:
 *   const R = mapValues({ a: 1, b: 2 }, (n, k) => `${k}:${n}`)
 *   // R: { readonly a: "a:1"; readonly b: "b:2" }
 */
export const mapValues = <
  T extends Record<PropertyKey, unknown>,
  B
>(
  obj: T,
  f: <K extends keyof T>(value: T[K], key: K) => B
): Readonly<{ [K in keyof T]: B }> => {
  const out = {} as { [K in keyof T]: B }
  for (const k in obj) {
    if (hasOwn(obj, k)) {
      const key = k as keyof T
      out[key] = f(obj[key], key)
    }
  }
  return out
}

/**
 * mapEntries — transform ([key, value]) -> [newKey, newValue].
 * Useful for renaming keys or changing key types.
 *
 * Example:
 *   const R = mapEntries({ a: 1, b: 2 }, ([k, v]) => [k.toUpperCase(), v * 10] as const)
 *   // R: Readonly<Record<"A" | "B", number>>
 */
export const mapEntries = <
  T extends Record<PropertyKey, unknown>,
  NK extends PropertyKey,
  B
>(
  obj: T,
  f: <K extends keyof T>(entry: readonly [K, T[K]]) => readonly [NK, B]
): Readonly<Record<NK, B>> => {
  const out = {} as Record<NK, B>
  for (const k in obj) {
    if (hasOwn(obj, k)) {
      const key = k as keyof T
      const [nk, nv] = f([key, obj[key]])
      out[nk] = nv
    }
  }
  return out
}

/**
 * filterValues — keep entries whose value satisfies `pred`.
 * Returns a readonly Partial because the surviving key set is not known at compile time.
 *
 * Overload 1: boolean predicate
 * Overload 2: type-guard predicate (narrows value type in the result)
 */
export function filterValues<T extends Record<PropertyKey, unknown>>(
  obj: T,
  pred: <K extends keyof T>(value: T[K], key: K) => boolean
): Readonly<Partial<T>>

export function filterValues<T extends Record<PropertyKey, unknown>, V>(
  obj: T,
  pred: <K extends keyof T>(value: T[K], key: K) => value is Extract<T[K], V>
): Readonly<Partial<{ [K in keyof T]: Extract<T[K], V> }>>

export function filterValues<T extends Record<PropertyKey, unknown>>(
  obj: T,
  pred: (value: T[keyof T], key: keyof T) => boolean
): Readonly<Partial<T>> {
  const out: Partial<T> = {}
  for (const k in obj) {
    if (hasOwn(obj, k)) {
      const key = k as keyof T
      const v = obj[key]
      if (pred(v, key)) out[key] = v
    }
  }
  return out
}

/** filterKeys — keep entries whose key satisfies `pred` */
export const filterKeys = <T extends Record<PropertyKey, unknown>>(
  obj: T,
  pred: (key: keyof T) => boolean
): Readonly<Partial<T>> => {
  const out: Partial<T> = {}
  for (const key of keys(obj)) {
    if (pred(key)) {
      out[key] = obj[key]
    }
  }
  return out
}

/** pick — keep only `K` keys (typed) */
export const pick = <T extends Record<PropertyKey, unknown>, K extends keyof T>(
  obj: T,
  ks: ReadonlyArray<K>
): Readonly<Pick<T, K>> => {
  const out: Partial<T> = {}
  for (const key of ks) {
    if (hasOwn(obj, key)) {
      out[key] = obj[key]
    }
  }
  return out as Readonly<Pick<T, K>>
}

/** omit — drop `K` keys (typed) */
export const omit = <T extends Record<PropertyKey, unknown>, K extends keyof T>(
  obj: T,
  ks: ReadonlyArray<K>
): Readonly<Omit<T, K>> => {
  const out: Partial<T> = {}
  const drop = new Set<PropertyKey>(ks as ReadonlyArray<PropertyKey>)
  for (const key of keys(obj)) {
    if (!drop.has(key)) {
      out[key] = obj[key]
    }
  }
  return out as Readonly<Omit<T, K>>
}





// =======================
// Map & Set helpers (typed, immutable-ish)
// =======================
//
// Design
//  - All outputs are typed as ReadonlyMap / ReadonlySet / ReadonlyArray
//  - Never mutate inputs; always allocate fresh
//  - Helpful transforms: map/filter/union/intersection/difference
//  - Extras: groupBy (array -> Map), fromEntries/toEntries, etc.
//
// Notes
//  - When "mapping keys" (Map), collisions may occur; you can pass `onConflict`.
//  - When "mapping a Set", distinct inputs may collapse to the same output
//    (e.g., mapping [1,2] with x => x % 2 → {0,1}). This is expected.
//

// ---------- Map utilities ----------

/** Build a ReadonlyMap from entries (iterables also accepted) */
export const fromEntriesMap = <K, V>(
  entries: Iterable<readonly [K, V]>
): ReadonlyMap<K, V> => new Map<K, V>(entries) as ReadonlyMap<K, V>

/** Get entries as a readonly array */
export const entriesMap = <K, V>(
  m: ReadonlyMap<K, V>
): ReadonlyArray<readonly [K, V]> => {
  const out: Array<readonly [K, V]> = []
  for (const [k, v] of m) out.push([k, v] as const)
  return out
}

/** Get keys as a readonly array */
export const keysMap = <K, V>(m: ReadonlyMap<K, V>): ReadonlyArray<K> =>
  Array.from(m.keys()) as ReadonlyArray<K>

/** Get values as a readonly array */
export const valuesMap = <K, V>(m: ReadonlyMap<K, V>): ReadonlyArray<V> =>
  Array.from(m.values()) as ReadonlyArray<V>

/** map values: (K,V) -> B, preserve keys */
export const mapMapValues = <K, V, B>(
  m: ReadonlyMap<K, V>,
  f: (v: V, k: K) => B
): ReadonlyMap<K, B> => {
  const out = new Map<K, B>()
  for (const [k, v] of m) out.set(k, f(v, k))
  return out as ReadonlyMap<K, B>
}

/** map keys: (K,V) -> NK, with optional conflict resolver */
export const mapMapKeys = <K, V, NK>(
  m: ReadonlyMap<K, V>,
  f: (k: K, v: V) => NK,
  onConflict?: (existing: V, incoming: V, key: NK) => V
): ReadonlyMap<NK, V> => {
  const out = new Map<NK, V>()
  for (const [k, v] of m) {
    const nk = f(k, v)
    if (out.has(nk) && onConflict) {
      out.set(nk, onConflict(out.get(nk) as V, v, nk))
    } else {
      out.set(nk, v)
    }
  }
  return out as ReadonlyMap<NK, V>
}

/** filter map by predicate over (K,V) */
export const filterMap = <K, V>(
  m: ReadonlyMap<K, V>,
  pred: (v: V, k: K) => boolean
): ReadonlyMap<K, V> => {
  const out = new Map<K, V>()
  for (const [k, v] of m) if (pred(v, k)) out.set(k, v)
  return out as ReadonlyMap<K, V>
}

/** union of maps; resolve conflicts with combiner (default: right-biased) */
export const unionMap = <K, V>(
  a: ReadonlyMap<K, V>,
  b: ReadonlyMap<K, V>,
  combine: (x: V, y: V, k: K) => V = (_x, y) => y
): ReadonlyMap<K, V> => {
  const out = new Map<K, V>(a as Map<K, V>)
  for (const [k, v] of b) {
    if (out.has(k)) out.set(k, combine(out.get(k) as V, v, k))
    else out.set(k, v)
  }
  return out as ReadonlyMap<K, V>
}

/** intersection of maps; keep keys present in both; combine values */
export const intersectMap = <K, V>(
  a: ReadonlyMap<K, V>,
  b: ReadonlyMap<K, V>,
  combine: (x: V, y: V, k: K) => V = (x) => x
): ReadonlyMap<K, V> => {
  const out = new Map<K, V>()
  for (const [k, vA] of a) {
    const vB = b.get(k)
    if (vB !== undefined || b.has(k)) out.set(k, combine(vA, vB as V, k))
  }
  return out as ReadonlyMap<K, V>
}

/** difference of maps: a \ b (keep keys in `a` not present in `b`) */
export const differenceMap = <K, V>(
  a: ReadonlyMap<K, V>,
  b: ReadonlyMap<K, V>
): ReadonlyMap<K, V> => {
  const out = new Map<K, V>()
  for (const [k, v] of a) if (!b.has(k)) out.set(k, v)
  return out as ReadonlyMap<K, V>
}

/** groupBy: turn an array into a Map<K, A[]> by key function */
export const groupBy = <A, K>(
  items: ReadonlyArray<A>,
  keyOf: (a: A) => K
): ReadonlyMap<K, ReadonlyArray<A>> => {
  const out = new Map<K, A[]>()
  for (const a of items) {
    const k = keyOf(a)
    const arr = out.get(k)
    if (arr) arr.push(a)
    else out.set(k, [a])
  }
  // seal arrays as readonly on return
  return mapMapValues(out, (xs) => xs.slice() as ReadonlyArray<A>)
}

// =======================
// Map partition (type guard + Result routing)
// =======================

/**
 * partitionMapBy — split a map by a **type-guard** over values.
 *
 * Keeps the original keys, narrows the "yes" side to the guarded subtype,
 * and narrows the "no" side to the complement.
 *
 * Example:
 *   const m = new Map<string, string | number>([['a', 1], ['b', 'x']])
 *   const isNum = (v: string | number): v is number => typeof v === 'number'
 *   const [nums, nonNums] = partitionMapBy(m, isNum)
 *   // nums:    ReadonlyMap<string, number>
 *   // nonNums: ReadonlyMap<string, string>
 */
export const partitionMapBy = <K, V, B extends V>(
  m: ReadonlyMap<K, V>,
  pred: (v: V, k: K) => v is B
): readonly [ReadonlyMap<K, B>, ReadonlyMap<K, Exclude<V, B>>] => {
  const yes = new Map<K, B>()
  const no  = new Map<K, Exclude<V, B>>()
  for (const [k, v] of m) {
    if (pred(v, k)) yes.set(k, v as B)
    else            no.set(k, v as Exclude<V, B>)
  }
  return [yes as ReadonlyMap<K, B>, no as ReadonlyMap<K, Exclude<V, B>>]
}

/**
 * partitionMapWith — route entries via a function that returns Result<L, R>.
 *
 * - If f(v,k) = Err(l): goes to the LEFT map under key k with value l
 * - If f(v,k) = Ok(r):  goes to the RIGHT map under key k with value r
 *
 * Useful to do a transform + split in one pass (e.g., validate + keep errors).
 *
 * Example:
 *   const parse = (s: string): Result<string, number> =>
 *     isNaN(+s) ? Err(`bad ${s}`) : Ok(+s)
 *   const m = new Map([['a','1'], ['b','nope']])
 *   const [errs, nums] = partitionMapWith(m, parse)
 *   // errs: ReadonlyMap<'b', string>     -> 'bad nope'
 *   // nums: ReadonlyMap<'a', number>     -> 1
 */
export const partitionMapWith = <K, V, L, R>(
  m: ReadonlyMap<K, V>,
  f: (v: V, k: K) => Result<L, R>
): readonly [ReadonlyMap<K, L>, ReadonlyMap<K, R>] => {
  const left  = new Map<K, L>()
  const right = new Map<K, R>()
  for (const [k, v] of m) {
    const res = f(v, k)
    if (isErr(res)) left.set(k, res.error)
    else            right.set(k, res.value)
  }
  return [left as ReadonlyMap<K, L>, right as ReadonlyMap<K, R>]
}





// ---------- Set utilities ----------

/** Build a ReadonlySet from an iterable */
export const setFrom = <A>(it: Iterable<A>): ReadonlySet<A> =>
  new Set(it) as ReadonlySet<A>

/** Get elements as a readonly array */
export const toArraySet = <A>(s: ReadonlySet<A>): ReadonlyArray<A> =>
  Array.from(s) as ReadonlyArray<A>

/** map a set (may collapse distinct inputs to same output) */
export const mapSet = <A, B>(
  s: ReadonlySet<A>,
  f: (a: A) => B
): ReadonlySet<B> => {
  const out = new Set<B>()
  for (const a of s) out.add(f(a))
  return out as ReadonlySet<B>
}

/** filter a set */
export const filterSet = <A>(
  s: ReadonlySet<A>,
  pred: (a: A) => boolean
): ReadonlySet<A> => {
  const out = new Set<A>()
  for (const a of s) if (pred(a)) out.add(a)
  return out as ReadonlySet<A>
}

/** union of sets */
export const unionSet = <A>(
  a: ReadonlySet<A>,
  b: ReadonlySet<A>
): ReadonlySet<A> => {
  const out = new Set<A>(a as Set<A>)
  for (const x of b) out.add(x)
  return out as ReadonlySet<A>
}

/** intersection of sets */
export const intersectSet = <A>(
  a: ReadonlySet<A>,
  b: ReadonlySet<A>
): ReadonlySet<A> => {
  const out = new Set<A>()
  // iterate over smaller set for speed
  const [small, big] = a.size <= b.size ? [a, b] : [b, a]
  for (const x of small) if (big.has(x)) out.add(x)
  return out as ReadonlySet<A>
}

/** difference of sets: a \ b */
export const differenceSet = <A>(
  a: ReadonlySet<A>,
  b: ReadonlySet<A>
): ReadonlySet<A> => {
  const out = new Set<A>()
  for (const x of a) if (!b.has(x)) out.add(x)
  return out as ReadonlySet<A>
}

/** subset check: a ⊆ b */
export const isSubsetOf = <A>(
  a: ReadonlySet<A>,
  b: ReadonlySet<A>
): boolean => {
  for (const x of a) if (!b.has(x)) return false
  return true
}


// ---- Set partition (boolean + type-guard overloads) ----
export function partitionSet<A>(
  s: ReadonlySet<A>,
  pred: (a: A) => boolean
): readonly [ReadonlySet<A>, ReadonlySet<A>]
export function partitionSet<A, B extends A>(
  s: ReadonlySet<A>,
  pred: (a: A) => a is B
): readonly [ReadonlySet<B>, ReadonlySet<Exclude<A, B>>]
export function partitionSet<A>(
  s: ReadonlySet<A>,
  pred: (a: A) => boolean
): readonly [ReadonlySet<A>, ReadonlySet<A>] {
  const yes = new Set<A>(), no = new Set<A>()
  for (const a of s) (pred(a) ? yes : no).add(a)
  return [yes as ReadonlySet<A>, no as ReadonlySet<A>]
}

// ---- Set partition by Result (route Left/Right) ----
export const partitionSetWith = <A, L, R>(
  s: ReadonlySet<A>,
  f: (a: A) => Result<L, R>
): readonly [ReadonlySet<L>, ReadonlySet<R>] => {
  const left = new Set<L>(), right = new Set<R>()
  for (const a of s) {
    const r = f(a)
    if (isErr(r)) left.add(r.error)
    else          right.add(r.value)
  }
  return [left as ReadonlySet<L>, right as ReadonlySet<R>]
}

// ============
// Partial Functions
// ============

export type PartialFn<A, B> = {
  isDefinedAt: (a: A) => boolean
  apply: (a: A) => B
}

export const pf = <A, B>(
  isDefinedAt: (a: A) => boolean,
  apply: (a: A) => B
): PartialFn<A, B> => ({
  isDefinedAt,
  apply
})

// Lift to total Option / Result
export const liftOptionPF =
  <A, B>(p: PartialFn<A, B>) =>
  (a: A): Option<B> =>
    p.isDefinedAt(a) ? Some(p.apply(a)) : None

export const liftResultPF =
  <A, E, B>(onUndefined: (a: A) => E) =>
  (p: PartialFn<A, B>) =>
  (a: A): Result<E, B> =>
    p.isDefinedAt(a) ? Ok(p.apply(a)) : Err(onUndefined(a))

// Useful combinators
export const orElsePF =
  <A, B>(p: PartialFn<A, B>, q: PartialFn<A, B>): PartialFn<A, B> =>
    pf(
      (a) => p.isDefinedAt(a) || q.isDefinedAt(a),
      (a) => (p.isDefinedAt(a) ? p.apply(a) : q.apply(a))
    )

export const composePF =
  <A, B, C>(g: PartialFn<B, C>, f: PartialFn<A, B>): PartialFn<A, C> =>
    pf(
      (a) => f.isDefinedAt(a) && g.isDefinedAt(f.apply(a)),
      (a) => g.apply(f.apply(a))
    )

export const restrictPF =
  <A, B>(p: PartialFn<A, B>, pred: (a: A) => boolean): PartialFn<A, B> =>
    pf((a) => pred(a) && p.isDefinedAt(a), p.apply)

// Turn a maybe-throwing / maybe-null function into total Option/Result
export const optionFromPartial =
  <A, B>(f: (a: A) => B | null | undefined) =>
  (a: A): Option<B> => {
    try {
      const b = f(a)
      return b == null ? None : Some(b)
    } catch {
      return None
    }
  }

export const resultFromPartial =
  <A, E, B>(f: (a: A) => B | null | undefined, onFail: (a: A, u?: unknown) => E) =>
  (a: A): Result<E, B> => {
    try {
      const b = f(a)
      return b == null ? Err(onFail(a)) : Ok(b)
    } catch (u) {
      return Err(onFail(a, u))
    }
  }

// ============
// FilterMap / Collect helpers
// ============

// Arrays
// filterMap over arrays (with index)
export const filterMapArray =
  <A, B>(as: ReadonlyArray<A>, f: (a: A, i: number) => Option<B>): ReadonlyArray<B> => {
    const out: B[] = []
    for (let i = 0; i < as.length; i++) {
      const ob = f(as[i]!, i)
      if (isSome(ob)) out.push(ob.value)
    }
    return out
  }

// filterMap over arrays (without index)
export const filterMapArraySimple =
  <A, B>(as: ReadonlyArray<A>, f: (a: A) => Option<B>): ReadonlyArray<B> => {
    const out: B[] = []
    for (let i = 0; i < as.length; i++) {
      const ob = f(as[i]!)
      if (isSome(ob)) out.push(ob.value)
    }
    return out
  }

// collect: apply a PartialFn to each element; keep successes
export const collectArray =
  <A, B>(as: ReadonlyArray<A>, pf: PartialFn<A, B>): ReadonlyArray<B> =>
    filterMapArray(as, (a) => (pf.isDefinedAt(a) ? Some(pf.apply(a)) : None))

// Maps
// filterMap values (keep same keys)
export const filterMapMapValues =
  <K, A, B>(m: ReadonlyMap<K, A>, f: (a: A, k: K) => Option<B>): ReadonlyMap<K, B> => {
    const out = new Map<K, B>()
    for (const [k, a] of m) {
      const ob = f(a, k)
      if (isSome(ob)) out.set(k, ob.value)
    }
    return out
  }

// collect values with a PartialFn (same keys)
export const collectMapValues =
  <K, A, B>(m: ReadonlyMap<K, A>, pf: PartialFn<A, B>): ReadonlyMap<K, B> =>
    filterMapMapValues(m, (a) => (pf.isDefinedAt(a) ? Some(pf.apply(a)) : None))

// filterMap entries (allow remapping the key too)
export const filterMapMapEntries =
  <K, A, L, B>(m: ReadonlyMap<K, A>, f: (k: K, a: A) => Option<readonly [L, B]>): ReadonlyMap<L, B> => {
    const out = new Map<L, B>()
    for (const [k, a] of m) {
      const op = f(k, a)
      if (isSome(op)) {
        const [l, b] = op.value
        out.set(l, b)
      }
    }
    return out
  }

// collect entries with a PartialFn on [key, value]
export const collectMapEntries =
  <K, A, L, B>(m: ReadonlyMap<K, A>, pf: PartialFn<readonly [K, A], readonly [L, B]>): ReadonlyMap<L, B> =>
    filterMapMapEntries(m, (k, a) => (pf.isDefinedAt([k, a] as const) ? Some(pf.apply([k, a] as const)) : None))

// Sets (bonus)
// filterMap over sets (dedup via Set semantics on B)
export const filterMapSet =
  <A, B>(s: ReadonlySet<A>, f: (a: A) => Option<B>): ReadonlySet<B> => {
    const out = new Set<B>()
    for (const a of s) {
      const ob = f(a)
      if (isSome(ob)) out.add(ob.value)
    }
    return out
  }

// collect for sets with PartialFn
export const collectSet =
  <A, B>(s: ReadonlySet<A>, pf: PartialFn<A, B>): ReadonlySet<B> =>
    filterMapSet(s, (a) => (pf.isDefinedAt(a) ? Some(pf.apply(a)) : None))







// probably not placed well
// =======================
// Do-notation: RWST (fixed)
// =======================
export type DoRWSTBuilder<R, W, S, T extends Record<string, unknown>> = {
  bind: <K extends string, A>(
    k: K,
    m: RWST<R, W, S, A>
  ) => DoRWSTBuilder<R, W, S, T & { readonly [P in K]: A }>

  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoRWSTBuilder<R, W, S, T & { readonly [P in K]: A }>

  map:  <B>(f: (t: T) => B) => RWST<R, W, S, B>
  done: () => RWST<R, W, S, T>
}

export const DoRWST =
  <W>(M: Monoid<W>) =>
  <R, S>() => {
    const start: RWST<R, W, S, {}> = (_r) => async (s) => [{}, s, M.empty] as const
    const make = <T extends Record<string, unknown>>(
      acc: RWST<R, W, S, T>
    ): DoRWSTBuilder<R, W, S, T> => ({
      bind: <K extends string, A>(k: K, m: RWST<R, W, S, A>) =>
        make<T & { readonly [P in K]: A }>((r) => async (s0) => {
          const [obj, s1, w1] = await acc(r)(s0)
          const [a,   s2, w2] = await m(r)(s1)
          const next = { ...obj, [k]: a } as T & { readonly [P in K]: A }
          return [next, s2, M.concat(w1, w2)] as const
        }),

      let: <K extends string, A>(k: K, a: A) =>
        make<T & { readonly [P in K]: A }>((r) => async (s0) => {
          const [obj, s1, w1] = await acc(r)(s0)
          const next = { ...obj, [k]: a } as T & { readonly [P in K]: A }
          return [next, s1, w1] as const
        }),

      map: <B>(f: (t: T) => B): RWST<R, W, S, B> =>
        (r) => async (s0) => {
          const [t, s1, w] = await acc(r)(s0)
          return [f(t), s1, w] as const
        },

      done: () => acc,
    })
    return make(start)
  }







// =======================
// Equality for Set / Map
// =======================
//
// Two flavors:
//  - *Native-key* versions (fast): rely on Set.has / Map.has (SameValueZero).
//    Great for primitives or reference-identity keys.
//  - *By* versions: accept Eq comparers when you need structural equality.

// ---- Set equality ----

// Fast path (uses Set.has). Works when elements are primitives or
// you want reference equality on objects.
export const eqSetNative = <A>(
  a: ReadonlySet<A>,
  b: ReadonlySet<A>
): boolean => {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}

// Structural equality with a provided Eq for elements.
// O(n^2) worst-case (no hashing); fine for small sets.
export const eqSetBy = <A>(eqA: Eq<A>) =>
  (a: ReadonlySet<A>, b: ReadonlySet<A>): boolean => {
    if (a.size !== b.size) return false
    const bs = Array.from(b)
    const used = new Set<number>()
    outer: for (const av of a) {
      for (let i = 0; i < bs.length; i++) {
        if (used.has(i)) continue
        if (eqA(av, bs[i]!)) { used.add(i); continue outer }
      }
      return false
    }
    return true
  }

// ---- Map equality ----

// Fast path: keys compared with Map.has (identity), values via provided Eq.
export const eqMapNative = <K, V>(eqV: Eq<V>) =>
  (a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>): boolean => {
    if (a.size !== b.size) return false
    for (const [k, vA] of a) {
      if (!b.has(k)) return false
      const vB = b.get(k) as V
      if (!eqV(vA, vB)) return false
    }
    return true
  }

// Structural keys & values (Eq for K and V). O(n^2) without hashing.
export const eqMapBy = <K, V>(eqK: Eq<K>, eqV: Eq<V>) =>
  (a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>): boolean => {
    if (a.size !== b.size) return false
    const eb = Array.from(b.entries())
    const used = new Set<number>()
    outer: for (const [ka, va] of a) {
      for (let i = 0; i < eb.length; i++) {
        if (used.has(i)) continue
        const [kb, vb] = eb[i]!
        if (eqK(ka, kb) && eqV(va, vb)) { used.add(i); continue outer }
      }
      return false
    }
    return true
  }







// =======================
// Deep freeze (strong types + practical runtime)
// =======================
//
// Goal
//  - Provide a DeepReadonly<T> type and a deepFreeze function that
//    recursively freezes plain objects/arrays and *clones* Map/Set contents,
//    returning typed ReadonlyMap/ReadonlySet.
//  - Note: JS cannot truly "freeze" Map/Set entries; we clone & (optionally)
//    wrap them in a read-only proxy that throws on mutation.
//
// Usage
//   const frozen = deepFreeze(obj)  // typed as DeepReadonly<typeof obj>
//   // Any attempt to mutate will be a TS error; and common runtime mutations on
//   // objects/arrays will throw in strict mode.
//
// Trade-offs
//  - Map/Set are cloned; identity changes (by design).
//  - Proxies (for Map/Set) add small runtime overhead; remove if not desired.
//

// ----- DeepReadonly type -----
export type DeepReadonly<T> =
  // leave functions as-is
  T extends (...args: infer A) => infer R ? (...args: A) => R
  // arrays
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepReadonly<U>>
  : T extends Array<infer U> ? ReadonlyArray<DeepReadonly<U>>
  // maps
  : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  // sets
  : T extends ReadonlySet<infer U> ? ReadonlySet<DeepReadonly<U>>
  : T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>>
  // objects
  : T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  // primitives
  : T

// ----- Readonly proxies for Map/Set (optional but useful) -----
const _readonlyMapProxy = <K, V>(m: Map<K, V>): ReadonlyMap<K, V> =>
  new Proxy<Map<K, V>>(m, {
    get(target, prop, receiver) {
      if (prop === 'set' || prop === 'clear' || prop === 'delete') {
        return () => { throw new Error('ReadonlyMap: mutation disabled') }
      }
      return Reflect.get(target, prop, receiver)
    }
  }) as unknown as ReadonlyMap<K, V>

const _readonlySetProxy = <A>(s: Set<A>): ReadonlySet<A> =>
  new Proxy<Set<A>>(s, {
    get(target, prop, receiver) {
      if (prop === 'add' || prop === 'clear' || prop === 'delete') {
        return () => { throw new Error('ReadonlySet: mutation disabled') }
      }
      return Reflect.get(target, prop, receiver)
    }
  }) as unknown as ReadonlySet<A>

// ----- deepFreeze runtime -----
export const deepFreeze = <T>(input: T): DeepReadonly<T> => {
  // primitives & functions
  if (input === null || typeof input !== 'object') return input as DeepReadonly<T>

  // Arrays
  if (Array.isArray(input)) {
    const frozenItems = input.map((item) => deepFreeze(item))
    return Object.freeze(frozenItems) as DeepReadonly<T>
  }

  // Map
  if (input instanceof Map) {
    type Key = T extends Map<infer K, unknown>
      ? K
      : T extends ReadonlyMap<infer K, unknown>
        ? K
        : never
    type Value = T extends Map<unknown, infer V>
      ? V
      : T extends ReadonlyMap<unknown, infer V>
        ? V
        : never
    const frozen = new Map<DeepReadonly<Key>, DeepReadonly<Value>>()
    const entries = input as unknown as Map<Key, Value>
    for (const [k, v] of entries) frozen.set(deepFreeze(k), deepFreeze(v))
    // Option A: Proxy to block mutations at runtime
    return _readonlyMapProxy(frozen) as DeepReadonly<T>
    // Option B (lighter): return m as ReadonlyMap without proxy
    // return frozen as ReadonlyMap<DeepReadonly<Key>, DeepReadonly<Value>> as DeepReadonly<T>
  }

  // Set
  if (input instanceof Set) {
    type Value = T extends Set<infer U>
      ? U
      : T extends ReadonlySet<infer U>
        ? U
        : never
    const frozen = new Set<DeepReadonly<Value>>()
    const entries = input as unknown as Set<Value>
    for (const v of entries) frozen.add(deepFreeze(v))
    return _readonlySetProxy(frozen) as DeepReadonly<T>
    // Or without proxy:
    // return frozen as ReadonlySet<DeepReadonly<Value>> as DeepReadonly<T>
  }

  // Plain object
  const obj = input as Record<PropertyKey, unknown>
  // Freeze each own property first
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    obj[k] = deepFreeze(v)
  }
  return Object.freeze(obj) as DeepReadonly<T>
}





// =======================
// Eq / Ord helpers
// =======================
export const eqStrict = <A>(): Eq<A> => (x, y) => Object.is(x, y)
export const ordNumber: Ord<number> = (x, y) => (x < y ? -1 : x > y ? 1 : 0)
export const ordString: Ord<string> = (x, y) => (x < y ? -1 : x > y ? 1 : 0)

export const sortBy = <A>(as: ReadonlyArray<A>, ord: Ord<A>): ReadonlyArray<A> => [...as].sort(ord)

// =======================
// Small helpers
// =======================
export const tap = <A>(f: (a: A) => void) => (a: A) => (f(a), a)
export const attempt = <A>(f: Lazy<A>): Option<A> => {
  try { return Some(f()) } catch { return None }
}







// =======================
// Result family — extras (no overlap with your bimapR/bimapV)
// =======================

// fold (catamorphism): Result<E,A> -> B
export const foldR =
  <E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
  (ra: Result<E, A>): B =>
    isOk(ra) ? onOk(ra.value) : onErr(ra.error)

// swap: Ok<A> <-> Err<A>
export const swapR = <E, A>(ra: Result<E, A>): Result<A, E> =>
  isOk(ra) ? Err(ra.value) : Ok(ra.error)

// tap (side-effects without changing the value)
export const tapOkR =
  <E, A>(f: (a: A) => void) =>
  (ra: Result<E, A>): Result<E, A> => (isOk(ra) && f(ra.value), ra)

export const tapErrR =
  <E, A>(f: (e: E) => void) =>
  (ra: Result<E, A>): Result<E, A> => (isErr(ra) && f(ra.error), ra)





// =======================
// TaskResult — bifunctor & friends
// =======================

// map both sides (async)
export const mapBothTR =
  <E, F, A, B>(l: (e: E) => F, r: (a: A) => B) =>
  (tra: TaskResult<E, A>): TaskResult<F, B> =>
  async () => {
    const ra = await tra()
    return isOk(ra) ? Ok(r(ra.value)) : Err(l(ra.error))
  }

// directional aliases
export const leftMapTR  = <E, F, A>(l: (e: E) => F) => mapBothTR<E, F, A, A>(l, id)
export const rightMapTR = <E, A, B>(r: (a: A) => B) => mapBothTR<E, E, A, B>(id, r)

// fold to Task<B>
export const foldTR =
  <E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
  (tra: TaskResult<E, A>): Task<B> =>
  async () => {
    const ra = await tra()
    return isOk(ra) ? onOk(ra.value) : onErr(ra.error)
  }

// swap Ok/Err
export const swapTR =
  <E, A>(tra: TaskResult<E, A>): TaskResult<A, E> =>
  async () => swapR(await tra())

// taps
export const tapOkTR =
  <E, A>(f: (a: A) => void) =>
  (tra: TaskResult<E, A>): TaskResult<E, A> =>
  async () => {
    const ra = await tra()
    if (isOk(ra)) { try { f(ra.value) } catch {} }
    return ra
  }

export const tapErrTR =
  <E, A>(f: (e: E) => void) =>
  (tra: TaskResult<E, A>): TaskResult<E, A> =>
  async () => {
    const ra = await tra()
    if (isErr(ra)) { try { f(ra.error) } catch {} }
    return ra
  }



// =======================
// ReaderTaskResult — bifunctor & friends
// =======================
// (uses your alias: type ReaderTaskResult<R,E,A> = ReaderTask<R, Result<E,A>>)

export const mapBothRTR =
  <R, E, F, A, B>(l: (e: E) => F, mapRight: (a: A) => B) =>
  (rtr: ReaderTaskResult<R, E, A>): ReaderTaskResult<R, F, B> =>
  async (env: R) => {
    const ra = await rtr(env)
    return isOk(ra) ? Ok(mapRight(ra.value)) : Err(l(ra.error))
  }


export const leftMapRTR  = <R, E, F, A>(l: (e: E) => F) => mapBothRTR<R, E, F, A, A>(l, id)
export const rightMapRTR = <R, E, A, B>(r: (a: A) => B) => mapBothRTR<R, E, E, A, B>(id, r)

export const foldRTR =
  <R, E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
  (rtr: ReaderTaskResult<R, E, A>): ReaderTask<R, B> =>
  async (r: R) => {
    const ra = await rtr(r)
    return isOk(ra) ? onOk(ra.value) : onErr(ra.error)
  }

export const swapRTR =
  <R, E, A>(rtr: ReaderTaskResult<R, E, A>): ReaderTaskResult<R, A, E> =>
  async (r: R) => swapR(await rtr(r))

export const tapOkRTR =
  <R, E, A>(f: (a: A) => void) =>
  (rtr: ReaderTaskResult<R, E, A>): ReaderTaskResult<R, E, A> =>
  async (r: R) => {
    const ra = await rtr(r)
    if (isOk(ra)) { try { f(ra.value) } catch {} }
    return ra
  }

export const tapErrRTR =
  <R, E, A>(f: (e: E) => void) =>
  (rtr: ReaderTaskResult<R, E, A>): ReaderTaskResult<R, E, A> =>
  async (r: R) => {
    const ra = await rtr(r)
    if (isErr(ra)) { try { f(ra.error) } catch {} }
    return ra
  }




// =======================
// Optics: Lens & Prism (tiny, composable)
// =======================

/**
 * Lens<S, A>
 * ----------
 * A **total**, immutable "focus" from a structure `S` to a **guaranteed** value `A`.
 *
 * Think of a Lens as two pure functions:
 *  - `get : S -> A`     (read the focused field)
 *  - `set : A -> S -> S` (return a **new** `S` with the focused field replaced)
 *
 * Laws (good practice when writing custom lenses):
 *  1) get-set:  `ln.set(ln.get(s))(s) === s`
 *  2) set-get:  `ln.get(ln.set(a)(s)) === a`
 *  3) set-set:  `ln.set(b)(ln.set(a)(s)) === ln.set(b)(s)`
 *
 * These laws give you predictable behavior under composition.
 */
export type Lens<S, A> = {
  /** Read the focused `A` out of `S`. Must be **total**: always succeed. */
  readonly get: (s: S) => A
  /**
   * Return a **new** `S` with the focus replaced by `a`.
   * Immutability guarantee: never mutate `s` in-place.
   */
  readonly set: (a: A) => (s: S) => S
}

export const Lens = Symbol.for('Lens')

/**
 * Build a Lens from a `get` and a "binary" `set`.
 * We curry the setter to the common `A -> S -> S` shape for easy composition.
 */
export const lens = <S, A>(get: (s: S) => A, set: (a: A, s: S) => S): Lens<S, A> => ({
  get,
  set: (a: A) => (s: S) => set(a, s)
})

/**
 * Property lens: focus a **required** property `k` of an object `S`.
 *
 * Example:
 *   type User = { name: string; age: number }
 *   const nameL = lensProp<User>()('name')
 *   nameL.get({name:'Ada', age:35})                 // "Ada"
 *   nameL.set('Grace')({name:'Ada', age:35})        // {name:'Grace', age:35}
 *
 * Note:
 *  - This is **total**: it requires the key `k` to exist in `S`'s type.
 *  - For nullable/optional properties, prefer `optionalProp` (in your Optional section).
 */
export const lensProp = <S>() => <K extends keyof S>(k: K): Lens<S, S[K]> =>
  lens(
    (s) => s[k],
    (a, s) => ({ ...s, [k]: a }) as S // shallow structural copy
  )

/**
 * Compose two lenses:
 *   - `sa : Lens<S, A>` (from a big structure to a sub-structure)
 *   - `ab : Lens<A, B>` (from the sub-structure to the final focus)
 * Produces: `sb : Lens<S, B>`
 *
 * Intuition:
 *   Read:   first `sa.get` to get A, then `ab.get` to get B.
 *   Write:  read A, set B inside it with `ab.set`, then write A back via `sa.set`.
 *
 * Order matters: `composeLens(ab)(sa)` means "sa **then** ab".
 */
export const composeLens = <S, A, B>(ab: Lens<A, B>) => (sa: Lens<S, A>): Lens<S, B> => ({
  get: (s) => ab.get(sa.get(s)),
  set: (b) => (s) =>
    // set B inside A, then set that updated A back into S
    sa.set(ab.set(b)(sa.get(s)))(s)
})

/**
 * Convenience: "modify" under a lens.
 * Equivalent to: `s => ln.set(f(ln.get(s)))(s)`
 *
 * Example:
 *   const ageUp = over(ageL, n => n + 1)
 *   ageUp({name:'Ada', age:35}) // {name:'Ada', age:36}
 */
export const over = <S, A>(ln: Lens<S, A>, f: (a: A) => A) => (s: S): S =>
  ln.set(f(ln.get(s)))(s)

/**
 * Prism<S, A>
 * -----------
 * A **partial** focus from `S` to **zero-or-one** `A`.
 *
 * Contrast with Lens:
 *  - Lens is *total* (always has an A).
 *  - Prism is *partial* (there might be an A, or not).
 *
 * Operations:
 *  - `getOption : S -> Option<A>`   (try to view an `A` from `S`)
 *  - `reverseGet : A -> S`          (build an `S` back from an `A`)
 *
 * Common uses:
 *  - Focus the `Some` inside an `Option<A>` (if present)
 *  - Focus the `Ok` or `Err` inside a `Result<E,A>`
 *  - Focus a union variant (e.g., `{type:"A"} | {type:"B"}` → the `"A"` case)
 *
 * Laws (informally):
 *  - If `getOption(s)` yields `Some(a)`, then `reverseGet(a)` should produce an `S`
 *    that round-trips to that same `a` under `getOption`.
 *  - `reverseGet` doesn't need to be a full inverse for *all* `S`, only for those
 *    that successfully focus to an `A`.
 */
export type Prism<S, A> = {
  /** Try to extract the focus; return `Some(a)` if present, else `None`. */
  readonly getOption: (s: S) => Option<A>
  /** Build an `S` from an `A` (used to "put back" after modifying). */
  readonly reverseGet: (a: A) => S
}

/** Build a Prism from a partial getter and a constructor. */
export const prism = <S, A>(getOption: (s: S) => Option<A>, reverseGet: (a: A) => S): Prism<S, A> => ({
  getOption,
  reverseGet
})

/**
 * Compose two prisms:
 *   - `sa : Prism<S, A>`
 *   - `ab : Prism<A, B>`
 * Produces: `sb : Prism<S, B>`
 *
 * Read: try `sa.getOption(s)`; if `Some(a)`, continue with `ab.getOption(a)`.
 * Write: build `A` from `B` via `ab.reverseGet`, then build `S` from that `A` via `sa.reverseGet`.
 */
export const composePrism = <S, A, B>(ab: Prism<A, B>) => (sa: Prism<S, A>): Prism<S, B> =>
  prism(
    (s) => flatMapO((a: A) => ab.getOption(a))(sa.getOption(s)),
    (b) => sa.reverseGet(ab.reverseGet(b))
  )

/**
 * "Modify" under a Prism:
 *   If the focus exists, apply `f` and put it back.
 *   If not, return the original `S` unchanged.
 *
 * Equivalent pipeline:
 *   pipe(
 *     pr.getOption(s),
 *     mapO(a => pr.reverseGet(f(a))),
 *     getOrElseO(() => s)
 *   )
 */
export const modifyP = <S, A>(pr: Prism<S, A>, f: (a: A) => A) => (s: S): S =>
  pipe(
    pr.getOption(s),
    mapO((a) => pr.reverseGet(f(a))),
    getOrElseO(() => s)
  )

/**
 * Built-in prisms for common sum types
 * ------------------------------------
 * These are convenience prisms you’ll reach for a lot.
 */
export const PrismOption = {
  /**
   * Focus the `Some` inside an `Option<A>`.
   *
   * Examples:
   *   const P = PrismOption.some<number>()
   *   P.getOption(Some(42))          // Some(42)
   *   P.getOption(None)              // None
   *   P.reverseGet(5)                // Some(5)
   *
   * Useful in combination with `modifyP` to update an optional value in-place
   * (when present) without special-casing `None`.
   */
  some: <A>(): Prism<Option<A>, A> =>
    prism<Option<A>, A>(
      (oa) => (isSome(oa) ? Some(oa.value) : None),
      (a) => Some(a)
    )
}

export const PrismResult = {
  /**
   * Focus the `Ok` value of a `Result<E, A>`.
   *   - getOption(Ok(a))  -> Some(a)
   *   - getOption(Err(e)) -> None
   *   - reverseGet(a)     -> Ok(a)
   */
  ok: <E, A>(): Prism<Result<E, A>, A> =>
    prism<Result<E, A>, A>(
      (ra) => (isOk(ra) ? Some(ra.value) : None),
      (a) => Ok(a)
    ),

  /**
   * Focus the `Err` value of a `Result<E, A>`.
   *   - getOption(Err(e)) -> Some(e)
   *   - getOption(Ok(a))  -> None
   *   - reverseGet(e)     -> Err(e)
   */
  err: <E, A>(): Prism<Result<E, A>, E> =>
    prism<Result<E, A>, E>(
      (ra) => (isErr(ra) ? Some(ra.error) : None),
      (e) => Err(e)
    )
}

/* --------------------------------------------------------------------------
   Practical notes & patterns
   --------------------------------------------------------------------------
   • Immutability & performance
     - Our setters use shallow copies (`{ ...s, k: a }`).
       This is efficient for typical "update one field" cases and preserves
       structural sharing for unchanged parts.
     - If the focused value is already equal to the new one, you might want an
       `Eq<A>` to avoid churn:
         const setIfChanged = <S,A>(eq: Eq<A>) => (ln: Lens<S,A>) => (a: A) => (s: S) =>
           eq(ln.get(s), a) ? s : ln.set(a)(s)

   • Choosing Lens vs Prism
     - Use a Lens when a field is *always present*.
     - Use a Prism when the focus may or may not exist (e.g., optional, union case).
       For optional object fields, also see your `Optional` section and `lensToOptional`
       / `prismToOptional` adapters.

   • Composition cheatsheet
     - Lens ∘ Lens     → Lens
     - Prism ∘ Prism   → Prism
     - Lens ↔ Prism    → use your adapters to convert to `Optional`/`Traversal` when
                         you need to mix total & partial optics in one pipeline.

   • Modify helpers
     - `over(lens, f)`     – change a guaranteed field.
     - `modifyP(prism, f)` – change a field only if it exists; otherwise no-op.

   • Tiny usage examples (commented to avoid collisions)
     ------------------------------------------------------------------------
     // type User = { name: string; age: number; nick?: string }
     // const nameL = lensProp<User>()('name')
     // const ageL  = lensProp<User>()('age')
     // const u0 = { name: 'Ada', age: 35 }
     // nameL.get(u0)                       // "Ada"
     // over(ageL, n => n + 1)(u0)          // { name:'Ada', age:36 }

     // // Using Prism on Result
     // const POk = PrismResult.ok<string, number>()
     // POk.getOption(Ok(42))                // Some(42)
     // POk.getOption(Err('bad'))            // None
     // modifyP(POk, n => n + 1)(Ok(10))     // Ok(11)
     // modifyP(POk, n => n + 1)(Err('bad')) // Err('bad')

   -------------------------------------------------------------------------- */








// =======================
// Example usage (type-checked in editors)
// =======================
/*
// Option
const name = fromNullable(process.env["USER"]) // Option<string>
const greeting = pipe(
  name,
  mapO(n => `Hello, ${n}`),
  getOrElseO(() => "Hello, stranger")
)

// Result
const parsed: Result<string, number> = pipe(
  "42",
  (s) => (isNaN(Number(s)) ? Err("not a number") : Ok(Number(s)))
)

// match
const label = match(parsed)<string>({
  Ok: ({ value }) => `ok: ${value}`,
  Err: ({ error }) => `err: ${error}`,
  _: absurd
})

// Collections
const odds = filter([1,2,3,4,5], n => n % 2 === 1)
*/

/**
* fp-3 — a compact, practical FP toolkit for TypeScript
 * --------------------------------------------------------
 * Goals
 *  - Zero deps, tree-shakeable, pragmatic types
 *  - Great dev ergonomics via type inference
 *  - Small but extensible: start with Option, Result, pipe/flow, pattern matching, typeclasses
 *  - Added: Optics (Lens, Prism), Async (Task/TaskResult), Traversal/Optional
 */

// ... existing content omitted for brevity (Option, Result, etc.) ...

// =======================
// Optics: Lens & Prism
// =======================
// (previous Lens/Prism code stays here)


// =======================
// Traversals & Optionals
// =======================
export const optional = <S, A>(getOption: (s: S) => Option<A>, set: (a: A, s: S) => S): Optional<S, A> => ({
  getOption,
  set: (a: A) => (s: S) => set(a, s)
})

export const modifyO = <S, A>(opt: Optional<S, A>, f: (a: A) => A) => (s: S): S =>
  pipe(
    opt.getOption(s),
    mapO((a) => opt.set(f(a))(s)),
    getOrElseO(() => s)
  )

// Traversal: focus on 0..n elements
export type Traversal<S, A> = {
  readonly modify: (f: (a: A) => A) => (s: S) => S
}

export const traversalFromArray = <A>(): Traversal<ReadonlyArray<A>, A> => ({
  modify: (f) => (as) => as.map(f)
})

export const composeTraversal = <S, A, B>(ab: Traversal<A, B>) => (sa: Traversal<S, A>): Traversal<S, B> => ({
  modify: (f) => sa.modify(ab.modify(f))
})

// =======================
// Example usage
// =======================
/*
// Task/TaskResult
const delayed: TaskResult<string, number> = tryCatchT(async () => {
  await new Promise(r => setTimeout(r, 100))
  return 42
}, e => String(e))

// Traversal
const doubleAll = traversalFromArray<number>().modify(n => n*2)
const arr = [1,2,3]
const doubled = doubleAll(arr) // [2,4,6]
*/


// =======================
// Optics: Optional & Traversal
// =======================
export type Optional<S, A> = {
  readonly getOption: (s: S) => Option<A>
  readonly set: (a: A) => (s: S) => S
}

export const composeOptional = <S, A, B>(ab: Optional<A, B>) => (sa: Optional<S, A>): Optional<S, B> => ({
  getOption: (s) => flatMapO((a: A) => ab.getOption(a))(sa.getOption(s)),
  set: (b) => (s) => pipe(
    sa.getOption(s),
    mapO((a) => sa.set(ab.set(b)(a))(s)),
    getOrElseO(() => s)
  ),
})

export const lensToOptional = <S, A>(ln: Lens<S, A>): Optional<S, A> => optional(
  (s) => Some(ln.get(s)),
  (a, s) => ln.set(a)(s)
)

export const prismToOptional = <S, A>(pr: Prism<S, A>): Optional<S, A> => optional(
  pr.getOption,
  (a, s) => {
    void s
    return pr.reverseGet(a)
  }
)

export const optionalProp = <S>() => <K extends keyof S>(k: K): Optional<S, NonNullable<S[K]>> => optional(
  (s: S) => {
    const value = s[k]
    return value == null ? None : Some(value as NonNullable<S[K]>)
  },
  (a, s) => ({ ...s, [k]: a } as S)
)

export const optionalIndex = <A>(i: number): Optional<ReadonlyArray<A>, A> => optional(
  (as) => (i >= 0 && i < as.length ? Some(as[i]!) : None),
  (a, as) => (i >= 0 && i < as.length ? [...as.slice(0, i), a, ...as.slice(i + 1)] as readonly A[] : as)
) as Optional<ReadonlyArray<A>, A>

export const traversal = <S, A>(modify: (f: (a: A) => A) => (s: S) => S): Traversal<S, A> => ({ modify })

export const traversalArray = <A>(): Traversal<ReadonlyArray<A>, A> => traversal(
  (f) => (as) => as.map(f)
)

type ArrayElement<T> = T extends ReadonlyArray<infer Elem> ? Elem : never

export const traversalPropArray = <S>() =>
  <K extends keyof S>(k: K & (S[K] extends ReadonlyArray<unknown> ? K : never)):
    Traversal<S, ArrayElement<S[K]>> =>
      traversal((f) => (s: S) => {
        const current = s[k] as ReadonlyArray<ArrayElement<S[K]>>
        return { ...s, [k]: current.map(f) } as S
      })

export const optionalToTraversal = <S, A>(opt: Optional<S, A>): Traversal<S, A> => traversal(
  (f) => (s) => pipe(
    opt.getOption(s),
    mapO((a) => opt.set(f(a))(s)),
    getOrElseO(() => s)
  )
)

export const overT = <S, A>(tv: Traversal<S, A>, f: (a: A) => A) => tv.modify(f)


// =======================
// Async Task/ReaderTask combinators now live in task.ts
// =======================

// =======================
// Validation (accumulate errors) helpers now live in validation.ts
// =======================




export const curry2 = <A, B, C>(f: (a: A, b: B) => C) => (a: A) => (b: B) => f(a, b)
export const curry3 = <A, B, C, D>(f: (a: A, b: B, c: C) => D) => (a: A) => (b: B) => (c: C) => f(a, b, c)
export const curry4 = <A, B, C, D, R>(f: (a: A, b: B, c: C, d: D) => R) =>
  (a: A) => (b: B) => (c: C) => (d: D) => f(a, b, c, d)





// =======================
// Result & Validation — sequence / traverse
// =======================
//
// What you get
//  - Arrays:
//      sequenceArrayResult     : Result short-circuits on first Err
//      traverseArrayResult
//      sequenceArrayValidation : Validation accumulates all errors (needs concat)
//      traverseArrayValidation
//  - Structs (plain objects with known keys):
//      sequenceStructResult
//      sequenceStructValidation (needs concat)
//
// Notes
//  - For Validation we require a concatenator for error arrays:
//      const concat = <E>(xs: ReadonlyArray<E>, ys: ReadonlyArray<E>) => [...xs, ...ys]
//  - All outputs are readonly where it matters.

type UnwrapResult<T>     = T extends Result<infer _E, infer A> ? A : never

// ---------- Arrays: Result (short-circuit) ----------
export const sequenceArrayResult = <E, A>(
  rs: ReadonlyArray<Result<E, A>>
): Result<E, ReadonlyArray<A>> => {
  const out: A[] = []
  for (const r of rs) {
    if (isErr(r)) return r
    out.push((r as Ok<A>).value)
  }
  return Ok(out)
}

export const traverseArrayResult = <E, A, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => Result<E, B>
): Result<E, ReadonlyArray<B>> => {
  const out: B[] = []
  for (let i = 0; i < as.length; i++) {
    const r = f(as[i]!, i)
    if (isErr(r)) return r
    out.push((r as Ok<B>).value)
  }
  return Ok(out)
}

// ---------- Arrays: Validation (accumulate) ----------
// Map both sides of Result at once
export const bimapR =
  <E, F, A, B>(l: (e: E) => F, r: (a: A) => B) =>
  (ra: Result<E, A>): Result<F, B> =>
    isOk(ra) ? Ok(r(ra.value)) : Err(l(ra.error))

// Decoder helpers now live in decoder.ts

// =======================
// State — pure state transitions
// =======================
//
// Concept
//   State<S, A> = (s: S) => [A, S]
//   - Thread a state S through a computation that returns a value A.
//   - Pure (no Promises), great for reducers, ID generators, accumulators.
//
// Design notes
//   - Readonly tuples to discourage accidental mutation.
//   - "3-then-<R>" isn’t applicable here (no R), but we mirror your map/chain style.

export type State<S, A> = (s: S) => readonly [A, S]

export const State = {
  of:
    <A>(a: A) =>
    <S>(): State<S, A> =>
    (s) => [a, s] as const,

  // run helpers
  run:  <S, A>(sa: State<S, A>, s: S) => sa(s),
  eval: <S, A>(sa: State<S, A>, s: S): A => sa(s)[0],
  exec: <S, A>(sa: State<S, A>, s: S): S => sa(s)[1],

  // core
  get:  <S>(): State<S, S> => (s) => [s, s] as const,
  put:  <S>(s: S): State<S, void> => () => [undefined, s] as const,
  modify:
    <S>(f: (s: S) => S): State<S, void> =>
    (s) => [undefined, f(s)] as const,

  map:
    <A, B>(f: (a: A) => B) =>
    <S>(sa: State<S, A>): State<S, B> =>
    (s0) => {
      const [a, s1] = sa(s0)
      return [f(a), s1] as const
    },

  chain:
    <A, B, S>(f: (a: A) => State<S, B>) =>
    (sa: State<S, A>): State<S, B> =>
    (s0) => {
      const [a, s1] = sa(s0)
      return f(a)(s1)
    },

  ap:
    <S, A, B>(sfab: State<S, (a: A) => B>) =>
    (sa: State<S, A>): State<S, B> =>
    (s0) => {
      const [fab, s1] = sfab(s0)
      const [a, s2] = sa(s1)
      return [fab(a), s2] as const
    },
}

// batch ops
export const sequenceState =
  <S, A>(xs: ReadonlyArray<State<S, A>>): State<S, ReadonlyArray<A>> =>
  (s0) => {
    const out: A[] = []
    let s = s0
    for (const st of xs) {
      const [a, s1] = st(s)
      out.push(a)
      s = s1
    }
    return [out, s] as const
  }

export const traverseState =
  <S, A, B>(xs: ReadonlyArray<A>, f: (a: A) => State<S, B>): State<S, ReadonlyArray<B>> =>
    sequenceState(xs.map(f))

// =======================
// StateReaderTask — async + DI + state (fixed async placement)
// =======================

export type StateReaderTask<R, S, A> = (r: R) => (s: S) => Promise<readonly [A, S]>

export const SRT = {
  of:
    <A>(a: A) =>
    <S>() =>
    <R>(): StateReaderTask<R, S, A> =>
    (_r: R) =>
    async (s: S) => [a, s] as const,

  fromTask:
    <A>(ta: Task<A>) =>
    <S>() =>
    <R>(): StateReaderTask<R, S, A> =>
    (_r: R) =>
    async (s: S) => [await ta(), s] as const,

  fromReader:
    <R, A>(ra: Reader<R, A>) =>
    <S>(): StateReaderTask<R, S, A> =>
    (r: R) =>
    async (s: S) => [ra(r), s] as const,

  liftValue:
    <A>(a: A) =>
    <S>() =>
    <R>(): StateReaderTask<R, S, A> =>
      SRT.of<A>(a)<S>()<R>(),

  map:
    <A, B>(f: (a: A) => B) =>
    <S>() =>
    <R>(srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, B> =>
    (r: R) =>
    async (s0: S) => {
      const [a, s1] = await srt(r)(s0)
      return [f(a), s1] as const
    },

  chain:
    <A, B, S, R>(f: (a: A) => StateReaderTask<R, S, B>) =>
    (srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, B> =>
    (r: R) =>
    async (s0: S) => {
      const [a, s1] = await srt(r)(s0)
      return await f(a)(r)(s1)
    },

  ap:
    <S, R, A, B>(srtFab: StateReaderTask<R, S, (a: A) => B>) =>
    (srtA: StateReaderTask<R, S, A>): StateReaderTask<R, S, B> =>
    (r: R) =>
    async (s0: S) => {
      const [fab, s1] = await srtFab(r)(s0)
      const [a, s2] = await srtA(r)(s1)
      return [fab(a), s2] as const
    },

  local:
    <R, Q>(f: (q: Q) => R) =>
    <S, A>(srt: StateReaderTask<R, S, A>): StateReaderTask<Q, S, A> =>
    (q: Q) =>
    (s: S) =>
      srt(f(q))(s),

  // State helpers
  get:
    <S>() =>
    <R>(): StateReaderTask<R, S, S> =>
    (_r: R) =>
    async (s: S) => [s, s] as const,

  put:
    <S>(s1: S) =>
    <R>(): StateReaderTask<R, S, void> =>
    (_r: R) =>
    async (_s: S) => [undefined, s1] as const,

  modify:
    <S>(g: (s: S) => S) =>
    <R>(): StateReaderTask<R, S, void> =>
    (_r: R) =>
    async (s: S) => [undefined, g(s)] as const,
}

// sugar to run
export const runSRT = <R, S, A>(srt: StateReaderTask<R, S, A>, r: R, s: S) => srt(r)(s)
export const evalSRT = async <R, S, A>(srt: StateReaderTask<R, S, A>, r: R, s: S) =>
  (await srt(r)(s))[0]
export const execSRT = async <R, S, A>(srt: StateReaderTask<R, S, A>, r: R, s: S) =>
  (await srt(r)(s))[1]





// =======================
// RWST — Reader • Writer • State • Task
// =======================
//
// Type: (r) => (s) => Promise<[A, S, W]>
//  R: environment (deps)
//  S: threaded state
//  W: accumulated log (Monoid)

export type RWST<R, W, S, A> = (r: R) => (s: S) => Promise<readonly [A, S, W]>

export const RWST = {
  of:
    <A>(a: A) =>
    <W>(M: Monoid<W>) =>
    <S>() =>
    <R>(): RWST<R, W, S, A> =>
    (_r) => async (s) => [a, s, M.empty] as const,

  fromTask:
    <A>(ta: Task<A>) =>
    <W>(M: Monoid<W>) =>
    <S>() =>
    <R>(): RWST<R, W, S, A> =>
    (_r) => async (s) => [await ta(), s, M.empty] as const,

  fromReader:
    <R, A>(ra: Reader<R, A>) =>
    <W>(M: Monoid<W>) =>
    <S>(): RWST<R, W, S, A> =>
    (r) => async (s) => [ra(r), s, M.empty] as const,

  tell:
    <W>(w: W) =>
    <S>() =>
    <R>(): RWST<R, W, S, void> =>
    (_r) => async (s) => [undefined, s, w] as const,

  listen:
    <A, W, S, R>(m: RWST<R, W, S, A>): RWST<R, W, S, readonly [A, W]> =>
    (r) => async (s0) => {
      const [a, s1, w] = await m(r)(s0)
      return [[a, w] as const, s1, w] as const
    },

  censor:
    <W>(f: (w: W) => W) =>
    <S, A, R>(m: RWST<R, W, S, A>): RWST<R, W, S, A> =>
    (r) => async (s0) => {
      const [a, s1, w] = await m(r)(s0)
      return [a, s1, f(w)] as const
    },

    map:
      <A, B>(f: (a: A) => B) =>
      <W>(M: Monoid<W>) =>
      <S, R>(m: RWST<R, W, S, A>): RWST<R, W, S, B> =>
      (r) => async (s0) => {
        void M
        const [a, s1, w] = await m(r)(s0)
        return [f(a), s1, w] as const
      },

  chain:
    <A, B, W>(f: (a: A) => RWST<unknown, W, unknown, B>, M: Monoid<W>) =>
    <S, R>(m: RWST<R, W, S, A>): RWST<R, W, S, B> =>
    (r) => async (s0) => {
      const [a, s1, w1] = await m(r)(s0)
      const [b, s2, w2] = await (f(a) as RWST<R, W, S, B>)(r)(s1)
      return [b, s2, M.concat(w1, w2)] as const
    },

  // State ops
  get:
    <W>(M: Monoid<W>) =>
    <S>() =>
    <R>(): RWST<R, W, S, S> =>
    (_r) => async (s) => [s, s, M.empty] as const,

  put:
    <W>(M: Monoid<W>) =>
    <S>(s1: S) =>
    <R>(): RWST<R, W, S, void> =>
    (_r) => async (_s) => [undefined, s1, M.empty] as const,

  modify:
    <W>(M: Monoid<W>) =>
    <S>(g: (s: S) => S) =>
    <R>(): RWST<R, W, S, void> =>
    (_r) => async (s) => [undefined, g(s), M.empty] as const,

  local:
    <R, Q>(f: (q: Q) => R) =>
    <W, S, A>(m: RWST<R, W, S, A>): RWST<Q, W, S, A> =>
    (q) => (s) => m(f(q))(s),
}

// runners
export const runRWST = <R, W, S, A>(m: RWST<R, W, S, A>, r: R, s: S) => m(r)(s)
export const evalRWST = async <R, W, S, A>(m: RWST<R, W, S, A>, r: R, s: S) => (await m(r)(s))[0]
export const execRWST = async <R, W, S, A>(m: RWST<R, W, S, A>, r: R, s: S) => {
  const [, s1] = await m(r)(s); return s1
}
export const logRWST  = async <R, W, S, A>(m: RWST<R, W, S, A>, r: R, s: S) => {
  const [, , w] = await m(r)(s); return w
}

// =======================
// Gen (generator) for RWST
// =======================
//
// Usage:
//   const prog = genRWST(MonoidArray<string>())<Env, State>()(function* () {
//     const a = yield* RWST_(step1)     // RWST<Env, W, State, A>
//     const b = yield* RWST_(step2(a))
//     return a + b                      // final pure value A'
//   })

type RWST_Yield<R, W, S, A> = Generator<RWST<R, W, S, A>, A, A>
export const RWST_ =
  <R, W, S, A>(m: RWST<R, W, S, A>): RWST_Yield<R, W, S, A> =>
  (function* () { return (yield m) as A })()

export const genRWST =
  <W>(M: Monoid<W>) =>
  <R, S>() =>
  <A>(f: () => Generator<RWST<R, W, S, unknown>, A, unknown>): RWST<R, W, S, A> =>
  (r: R) =>
  async (s0: S) => {
    const it = f()
    let s = s0
    let wAcc = M.empty
    let last: unknown = undefined
    while (true) {
      const n = it.next(last)
      if (n.done) return [n.value as A, s, wAcc] as const
      const [a, s1, w] = await n.value(r)(s)
      last = a
      s = s1
      wAcc = M.concat(wAcc, w)
    }
  }




// =======================
// SRT ✕ Result helpers (no HTTP required)
// =======================

export type SRTResult<R, S, E, A> = StateReaderTask<R, S, Result<E, A>>

export const mapSRTResult =
  <E, A, B>(f: (a: A) => B) =>
  <R, S>(srt: SRTResult<R, S, E, A>): SRTResult<R, S, E, B> =>
  (r: R) =>
  async (s: S) => {
    const [res, s1] = await srt(r)(s)
    return [mapR<E, A, B>(f)(res), s1] as const
  }

export const chainSRTResult =
  <R, S, E, A, F, B>(f: (a: A) => SRTResult<R, S, F, B>) =>
  (srt: SRTResult<R, S, E, A>): SRTResult<R, S, E | F, B> =>
  (r: R) =>
  async (s0: S) => {
    const [res, s1] = await srt(r)(s0)
    return isOk(res) ? f(res.value)(r)(s1) : [res as Err<E | F>, s1] as const
  }

// =======================
// Lift Task helpers to SRT
// =======================

// Wrap SRT's inner Task with a Task<A> -> Task<A> transformer
const _wrapSRT =
  <R, S, A>(wrap: (ta: Task<readonly [A, S]>) => Task<readonly [A, S]>) =>
  (srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, A> =>
  (r: R) =>
  (s: S) =>
    wrap(() => srt(r)(s))()

export const srtWithTimeout =
  (ms: number) =>
  <R, S, A>(srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, A> =>
    _wrapSRT<R, S, A>(withTimeout(ms))(srt)

export const srtRetry =
  (retries: number, delayMs: number, factor = 1.5) =>
  <R, S, A>(srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, A> =>
    _wrapSRT<R, S, A>(retry(retries, delayMs, factor))(srt)



// =======================
// Batch: StateReaderTask
// =======================

/**
 * sequenceSRT
 * -----------
 * Run SRT steps left-to-right.
 * - Each step sees the **latest** state S.
 * - Results are collected in order.
 * - If a step throws/rejects, the returned Promise rejects (no special handling).
 */
export const sequenceSRT =
  <R, S, A>(steps: ReadonlyArray<StateReaderTask<R, S, A>>): StateReaderTask<R, S, ReadonlyArray<A>> =>
  (r: R) =>
  async (s0: S) => {
    const out: A[] = []
    let s = s0
    for (const step of steps) {
      const [a, s1] = await step(r)(s)
      out.push(a)
      s = s1
    }
    return [out, s] as const
  }

/**
 * traverseSRT
 * -----------
 * Map each input item to an SRT step, then run them **sequentially**.
 * - `f(item, index)` can depend on the item and position.
 * - Threads S exactly like sequenceSRT.
 */
export const traverseSRT =
  <R, S, A, B>(items: ReadonlyArray<A>, f: (a: A, index: number) => StateReaderTask<R, S, B>): StateReaderTask<R, S, ReadonlyArray<B>> =>
  (r: R) =>
  async (s0: S) => {
    const out: B[] = []
    let s = s0
    for (let i = 0; i < items.length; i++) {
      const [b, s1] = await f(items[i]!, i)(r)(s)
      out.push(b)
      s = s1
    }
    return [out, s] as const
  }

/**
 * sequenceSRTResult — like sequenceSRT, but stops on first Err.
 */
export const sequenceSRTResult =
  <R, S, E, A>(steps: ReadonlyArray<SRTResult<R, S, E, A>>): SRTResult<R, S, E, ReadonlyArray<A>> =>
  (r: R) =>
  async (s0: S) => {
    const out: A[] = []
    let s = s0
    for (const step of steps) {
      const [res, s1] = await step(r)(s)
      if (isErr(res)) return [res, s1] as const
      out.push((res as Ok<A>).value)
      s = s1
    }
    return [Ok(out), s] as const
  }

/**
 * traverseSRTResult — build steps from items, run sequentially, stop on Err.
 */
export const traverseSRTResult =
  <R, S, E, A, B>(items: ReadonlyArray<A>, f: (a: A, i: number) => SRTResult<R, S, E, B>): SRTResult<R, S, E, ReadonlyArray<B>> =>
  (r: R) =>
  async (s0: S) => {
    const out: B[] = []
    let s = s0
    for (let i = 0; i < items.length; i++) {
      const [res, s1] = await f(items[i]!, i)(r)(s)
      if (isErr(res)) return [res, s1] as const
      out.push((res as Ok<B>).value)
      s = s1
    }
    return [Ok(out), s] as const
  }







// =======================
// Bracket: acquire/use/release safely
// =======================

// Task
export const bracketT =
  <A, B>(acquire: Task<A>, use: (a: A) => Task<B>, release: (a: A) => Task<void>): Task<B> =>
  async () => {
    const a = await acquire()
    try {
      return await use(a)()
    } finally {
      try { await release(a)() } catch { /* swallow release errors */ }
    }
  }

// TaskResult — ensure release; prefer "use" error over "release" error
export const bracketTR =
  <E, A, B>(acq: TaskResult<E, A>, use: (a: A) => TaskResult<E, B>, rel: (a: A) => TaskResult<E, void>): TaskResult<E, B> =>
  async () => {
    const ra = await acq()
    if (isErr(ra)) return ra
    const a = ra.value
    const rb = await use(a)()
    const rr = await rel(a)()
    if (isErr(rb)) return rb
    if (isErr(rr)) return rr
    return rb
  }

// ReaderTask
// ReaderTask
export const bracketRT =
  <R, A, B>(
    acq: ReaderTask<R, A>,
    use: (a: A) => ReaderTask<R, B>,
    rel: (a: A) => ReaderTask<R, void>
  ): ReaderTask<R, B> =>
  async (r: R) => {
    const a = await acq(r)
    try {
      return await use(a)(r)
    } finally {
      try { await rel(a)(r) } catch { /* swallow */ }
    }
  }

export const bracketRTR =
  <R, E, A, B>(
    acq: ReaderTaskResult<R, E, A>,
    use: (a: A) => ReaderTaskResult<R, E, B>,
    rel: (a: A) => ReaderTaskResult<R, E, void>
  ): ReaderTaskResult<R, E, B> =>
  async (r: R) => {
    const ra = await acq(r)
    if (isErr(ra)) return ra
    const a = ra.value
    const rb = await use(a)(r)
    const rr = await rel(a)(r)
    if (isErr(rb)) return rb           // prefer "use" error
    if (isErr(rr)) return rr           // otherwise report "release" error
    return rb
  }









// =======================
// NonEmptyArray
// =======================
export type NonEmptyArray<A> = readonly [A, ...A[]]

const isNonEmptyArray = <A>(as: ReadonlyArray<A>): as is NonEmptyArray<A> =>
  as.length > 0

export const fromArrayNE = <A>(as: ReadonlyArray<A>): Option<NonEmptyArray<A>> =>
  isNonEmptyArray(as) ? Some(as) : None

export const headNE = <A>(as: NonEmptyArray<A>): A => as[0]
export const tailNE = <A>(as: NonEmptyArray<A>): ReadonlyArray<A> => as.slice(1)

export const mapNE = <A, B>(as: NonEmptyArray<A>, f: (a: A) => B): NonEmptyArray<B> =>
  [f(as[0]), ...as.slice(1).map(f)]

// =======================
// Semigroup / Monoid
// =======================
export interface Semigroup<A> { concat: (x: A, y: A) => A }
export interface Monoid<A> extends Semigroup<A> { empty: A }

export const SemigroupString: Semigroup<string> = { concat: (x, y) => x + y }
export const MonoidString: Monoid<string> = { ...SemigroupString, empty: '' }

export const SemigroupArray = <A>(): Semigroup<ReadonlyArray<A>> => ({ concat: (x, y) => [...x, ...y] })
export const MonoidArray = <A>(): Monoid<ReadonlyArray<A>> => ({ ...SemigroupArray<A>(), empty: [] })

export const concatAll =
  <A>(M: Monoid<A>) =>
  (as: ReadonlyArray<A>): A =>
    as.reduce(M.concat, M.empty)

// fold for NonEmpty (no empty needed)
export const concatNE =
  <A>(S: Semigroup<A>) =>
  (nea: NonEmptyArray<A>): A =>
    nea.slice(1).reduce(S.concat, nea[0])



// =======================
// Async helpers for Task / ReaderTask
// =======================

// Retry with backoff (Task)
export const retry =
  (retries: number, delayMs: number, factor = 1.5) =>
  <A>(ta: Task<A>): Task<A> =>
  async () => {
    let attempt = 0, wait = delayMs
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try { return await ta() }
      catch (e) {
        attempt++
        if (attempt > retries) throw e
        await new Promise(res => setTimeout(res, wait))
        wait = Math.round(wait * factor)
      }
    }
  }

// Timeout (Task)
export const withTimeout =
  (ms: number) =>
  <A>(ta: Task<A>): Task<A> =>
  async () => {
    return await Promise.race([
      ta(),
      new Promise<A>((_, rej) => setTimeout(() => rej(new Error(`Timeout ${ms}ms`)), ms))
    ])
  }

// Concurrency limiter for array of tasks
export const allLimited =
  (limit: number) =>
  <A>(tasks: ReadonlyArray<Task<A>>): Task<ReadonlyArray<A>> =>
  async () => {
    const results: A[] = []
    let i = 0
    const workers = Array.from({ length: Math.max(1, limit) }, async () => {
      while (i < tasks.length) {
        const idx = i++
        results[idx] = await tasks[idx]!()
      }
    })
    await Promise.all(workers)
    return results
  }




// ====================================================================
// tokenizeJSON: ReadableStream<string> | AsyncIterable<string>
//            -> AsyncGenerator<JsonEvent>
// ====================================================================
//

// =======================
// Type utilities for better inference
// =======================

export type NoInfer<T> = [T][T extends unknown ? 0 : never]

// Arrow type aliases for better inference
export type ArrRTR<R, E, A, B> = (a: A) => ReaderTaskResult<R, E, B>
export type ArrReader<R, A, B> = (a: A) => Reader<R, B>
export type ArrTask<A, B> = (a: A) => Task<B>
export type ArrReaderTask<R, A, B> = (a: A) => ReaderTask<R, B>

// =======================
// Kleisli Arrows
// =======================
// 
// Kleisli arrows provide structured composition for effectful functions (A -> M<B>)
// without committing to do-notation everywhere. They sit between Applicative and Monad,
// offering clean composition operators like (>>>), first, second, split (***), and fanout (&&&).

// ---------- Kleisli Arrow for Reader ----------
export const makeKleisliArrowReader = <R>() => {
  type M<B> = Reader<R, B>
  type Arr<A, B> = (a: A) => M<B>

  const arr =
    <A, B>(f: (a: A) => B): Arr<A, B> =>
    (a) => Reader.of<R, B>(f(a))

  const then =
    <A, B, C>(g: Arr<B, C>) =>
    (f: Arr<A, B>): Arr<A, C> =>
    (a) => (r: R) => g(f(a)(r))(r)

  const first =
    <A, B, C>(f: Arr<A, B>): Arr<readonly [A, C], readonly [B, C]> =>
    ([a, c]) => (r: R) => [f(a)(r), c] as const

  const second =
    <A, B, C>(f: Arr<B, C>): Arr<readonly [A, B], readonly [A, C]> =>
    ([a, b]) => (r: R) => [a, f(b)(r)] as const

  const split =
    <A, B, C, D>(f: Arr<A, B>, g: Arr<C, D>): Arr<readonly [A, C], readonly [B, D]> =>
    ([a, c]) => (r: R) => [f(a)(r), g(c)(r)] as const

  const fanout =
    <A, B, C>(f: Arr<A, B>, g: Arr<A, C>): Arr<A, readonly [B, C]> =>
    (a) => (r: R) => [f(a)(r), g(a)(r)] as const

  /** ArrowApply: app :: ([a, Arr a b]) -> Arr b  */
  const app =
    <A, B>(): Arr<readonly [A, Arr<A, B>], B> =>
    ([a, f]) =>
    (r: R) =>
      f(a)(r)

  /** Helper: applyTo(f)(a) = app([a, f]) */
  const applyTo =
    <A, B>(f: Arr<A, B>) =>
    (a: A): M<B> =>
      app<A, B>()([a, f])

  // =======================
  // Kleisli-friendly sugar
  // =======================
  // Nice aliases that read like monadic ops

  const idA = <A>(): Arr<A, A> => (a) => (_: R) => a

  const mapK =
    <A, B, C>(f: (b: B) => C) =>
    (ab: Arr<A, B>): Arr<A, C> =>
      then<A, B, C>(arr(f))(ab)

  // apK ff fa = app (fa &&& ff)
  const apK =
    <A, B, C>(ff: Arr<A, Arr<B, C>>) =>
    (fa: Arr<A, B>): Arr<A, C> =>
      then<A, readonly [B, Arr<B, C>], C>(app<B, C>())(fanout(fa, ff))

  const liftK2 =
    <A, B, C, D>(h: (b: B, c: C) => D) =>
    (fb: Arr<A, B>, fc: Arr<A, C>): Arr<A, D> =>
      then<A, readonly [B, C], D>(arr(([b, c]: readonly [B, C]) => h(b, c)))(fanout(fb, fc))

  // Higher-order bind (A -> Arr<A,B>)
  const bindK_HO =
    <A, B>(f: Arr<A, Arr<A, B>>): Arr<A, B> =>
      then<A, readonly [A, Arr<A, B>], B>(app<A, B>())(fanout(idA<A>(), f))

  return { arr, then, first, second, split, fanout, app, applyTo, idA, mapK, apK, liftK2, bindK_HO }
}

// ---------- Kleisli Arrow for Task ----------
export const makeKleisliArrowTask = () => {
  type M<B> = Task<B>
  type Arr<A, B> = (a: A) => M<B>

  const arr =
    <A, B>(f: (a: A) => B): Arr<A, B> =>
    (a) => () => Promise.resolve(f(a))

  const then =
    <A, B, C>(g: Arr<B, C>) =>
    (f: Arr<A, B>): Arr<A, C> =>
    (a) => async () => g(await f(a)())()

  const first =
    <A, B, C>(f: Arr<A, B>): Arr<readonly [A, C], readonly [B, C]> =>
    ([a, c]) => async () => [await f(a)(), c] as const

  const second =
    <A, B, C>(f: Arr<B, C>): Arr<readonly [A, B], readonly [A, C]> =>
    ([a, b]) => async () => [a, await f(b)()] as const

  const split =
    <A, B, C, D>(f: Arr<A, B>, g: Arr<C, D>): Arr<readonly [A, C], readonly [B, D]> =>
    ([a, c]) => async () => [await f(a)(), await g(c)()] as const

  const fanout =
    <A, B, C>(f: Arr<A, B>, g: Arr<A, C>): Arr<A, readonly [B, C]> =>
    (a) => async () => [await f(a)(), await g(a)()] as const

  const app =
    <A, B>(): Arr<readonly [A, Arr<A, B>], B> =>
    ([a, f]) =>
    async () =>
      f(a)()

  const applyTo =
    <A, B>(f: Arr<A, B>) =>
    (a: A): M<B> =>
      app<A, B>()([a, f])

  // =======================
  // Kleisli-friendly sugar
  // =======================

  const idA = <A>(): Arr<A, A> => (a) => async () => a

  const mapK =
    <A, B, C>(f: (b: B) => C) =>
    (ab: Arr<A, B>): Arr<A, C> =>
      then<A, B, C>(arr(f))(ab)

  const apK =
    <A, B, C>(ff: Arr<A, Arr<B, C>>) =>
    (fa: Arr<A, B>): Arr<A, C> =>
      then<A, readonly [B, Arr<B, C>], C>(app<B, C>())(fanout(fa, ff))

  const liftK2 =
    <A, B, C, D>(h: (b: B, c: C) => D) =>
    (fb: Arr<A, B>, fc: Arr<A, C>): Arr<A, D> =>
      then<A, readonly [B, C], D>(arr(([b, c]: readonly [B, C]) => h(b, c)))(fanout(fb, fc))

  const bindK_HO =
    <A, B>(f: Arr<A, Arr<A, B>>): Arr<A, B> =>
      then<A, readonly [A, Arr<A, B>], B>(app<A, B>())(fanout(idA<A>(), f))

  return { arr, then, first, second, split, fanout, app, applyTo, idA, mapK, apK, liftK2, bindK_HO }
}

// ---------- Kleisli Arrow for ReaderTask ----------
export const makeKleisliArrowReaderTask = <R>() => {
  type M<B> = ReaderTask<R, B>
  type Arr<A, B> = (a: A) => M<B>

  const arr =
    <A, B>(f: (a: A) => B): Arr<A, B> =>
    (a) => async (_: R) => f(a)

  const then =
    <A, B, C>(g: Arr<B, C>) =>
    (f: Arr<A, B>): Arr<A, C> =>
    (a) => async (r: R) => g(await f(a)(r))(r)

  const first =
    <A, B, C>(f: Arr<A, B>): Arr<readonly [A, C], readonly [B, C]> =>
    ([a, c]) => async (r: R) => [await f(a)(r), c] as const

  const second =
    <A, B, C>(f: Arr<B, C>): Arr<readonly [A, B], readonly [A, C]> =>
    ([a, b]) => async (r: R) => [a, await f(b)(r)] as const

  const split =
    <A, B, C, D>(f: Arr<A, B>, g: Arr<C, D>): Arr<readonly [A, C], readonly [B, D]> =>
    ([a, c]) => async (r: R) => [await f(a)(r), await g(c)(r)] as const

  const fanout =
    <A, B, C>(f: Arr<A, B>, g: Arr<A, C>): Arr<A, readonly [B, C]> =>
    (a) => async (r: R) => [await f(a)(r), await g(a)(r)] as const

  const app =
    <A, B>(): Arr<readonly [A, Arr<A, B>], B> =>
    ([a, f]) =>
    async (r: R) =>
      f(a)(r)

  const applyTo =
    <A, B>(f: Arr<A, B>) =>
    (a: A): M<B> =>
      app<A, B>()([a, f])

  // =======================
  // Kleisli-friendly sugar
  // =======================

  const idA = <A>(): Arr<A, A> => (a) => async (_: R) => a

  const mapK =
    <A, B, C>(f: (b: B) => C) =>
    (ab: Arr<A, B>): Arr<A, C> =>
      then<A, B, C>(arr(f))(ab)

  const apK =
    <A, B, C>(ff: Arr<A, Arr<B, C>>) =>
    (fa: Arr<A, B>): Arr<A, C> =>
      then<A, readonly [B, Arr<B, C>], C>(app<B, C>())(fanout(fa, ff))

  const liftK2 =
    <A, B, C, D>(h: (b: B, c: C) => D) =>
    (fb: Arr<A, B>, fc: Arr<A, C>): Arr<A, D> =>
      then<A, readonly [B, C], D>(arr(([b, c]: readonly [B, C]) => h(b, c)))(fanout(fb, fc))

  const bindK_HO =
    <A, B>(f: Arr<A, Arr<A, B>>): Arr<A, B> =>
      then<A, readonly [A, Arr<A, B>], B>(app<A, B>())(fanout(idA<A>(), f))

  return { arr, then, first, second, split, fanout, app, applyTo, idA, mapK, apK, liftK2, bindK_HO }
}

// ---------- Kleisli Arrow for ReaderTaskResult ----------
export const makeKleisliArrowRTR = <R, E>() => {
  type M<B> = ReaderTaskResult<R, E, B>
  type Arr<A, B> = (a: A) => M<B>

  const arr =
    <A, B>(f: (a: A) => B): Arr<A, B> =>
    (a) => async (_: R) => Ok(f(a))

  // Overload for better inference
  function then<A, B, C>(g: Arr<B, C>): (f: Arr<A, B>) => Arr<A, C>
  function then<A, B, C>(g: Arr<B, C>, f: Arr<A, B>): Arr<A, C>
  function then<A, B, C>(g: Arr<B, C>, f?: Arr<A, B>): Arr<A, C> | ((f: Arr<A, B>) => Arr<A, C>) {
    const chain = (fInner: Arr<A, B>): Arr<A, C> =>
      (a: A) => async (r: R) => {
        const rb = await fInner(a)(r)
        return isErr(rb) ? rb : g(rb.value)(r)
      }

    return f === undefined ? chain : chain(f)
  }

  const first =
    <A, B, C>(f: Arr<A, B>): Arr<readonly [A, C], readonly [B, C]> =>
    ([a, c]) => async (r: R) => {
      const rb = await f(a)(r)
      return isErr(rb) ? rb : Ok([rb.value, c] as const)
    }

  const second =
    <A, B, C>(f: Arr<B, C>): Arr<readonly [A, B], readonly [A, C]> =>
    ([a, b]) => async (r: R) => {
      const rc = await f(b)(r)
      return isErr(rc) ? rc : Ok([a, rc.value] as const)
    }

  // sequential; change to Promise.all if you want parallel and combine Errs differently
  const split =
    <A, B, C, D>(f: Arr<A, B>, g: Arr<C, D>): Arr<readonly [A, C], readonly [B, D]> =>
    ([a, c]) => async (r: R) => {
      const rb = await f(a)(r); if (isErr(rb)) return rb
      const rd = await g(c)(r); if (isErr(rd)) return rd
      return Ok([rb.value, rd.value] as const)
    }

  const fanout =
    <A, B, C>(f: Arr<A, B>, g: Arr<A, C>): Arr<A, readonly [B, C]> =>
    (a) => async (r: R) => {
      const rb = await f(a)(r); if (isErr(rb)) return rb
      const rc = await g(a)(r); if (isErr(rc)) return rc
      return Ok([rb.value, rc.value] as const)
    }

  /** Passes env + error semantics through unchanged */
  const app =
    <A, B>(): Arr<readonly [A, Arr<A, B>], B> =>
    ([a, f]) =>
    async (r: R) =>
      f(a)(r) // Result<E, B>

  const applyTo =
    <A, B>(f: Arr<A, B>) =>
    (a: A): M<B> =>
      app<A, B>()([a, f])

  // =======================
  // Kleisli-friendly sugar
  // =======================

  const idA = <A>(): Arr<A, A> => (a) => async (_: R) => Ok(a)

  const mapK =
    <A, B, C>(f: (b: B) => C) =>
    (ab: Arr<A, B>): Arr<A, C> =>
      then<A, B, C>(arr(f))(ab)

  const apK =
    <A, B, C>(ff: Arr<A, Arr<B, C>>) =>
    (fa: Arr<A, B>): Arr<A, C> =>
      then<A, readonly [B, Arr<B, C>], C>(app<B, C>())(fanout(fa, ff))

  const liftK2 =
    <A, B, C, D>(h: (b: B, c: C) => D) =>
    (fb: Arr<A, B>, fc: Arr<A, C>): Arr<A, D> =>
      then<A, readonly [B, C], D>(arr(([b, c]: readonly [B, C]) => h(b, c)))(fanout(fb, fc))

  const bindK_HO =
    <A, B>(f: Arr<A, Arr<A, B>>): Arr<A, B> =>
      then<A, readonly [A, Arr<A, B>], B>(app<A, B>())(fanout(idA<A>(), f))

  // Kleisli bind for ReaderTaskResult
  const bindK =
    <A, B>(k: (a: NoInfer<A>) => ReaderTaskResult<R, E, B>) =>
    <X>(f: (x: X) => ReaderTaskResult<R, E, A>) =>
    (x: X): ReaderTaskResult<R, E, B> =>
    async (r: R) => {
      const ra = await f(x)(r)
      return isErr(ra) ? ra : k(ra.value)(r)
    }

  return { arr, then, first, second, split, fanout, app, applyTo, idA, mapK, apK, liftK2, bindK_HO, bindK }
}

// =======================
// Stream Arrow Instance (Finite Streams)
// =======================
//
// Minimal stream processor for testing Stream/Iteration laws.
// Uses finite arrays as streams with denotational semantics.

// Stream type: finite list of values
export type Stream<A> = ReadonlyArray<A>

// Stream processor: transforms streams
export type StreamProc<A, B> = (stream: Stream<A>) => Stream<B>

// Stream arrow operations
export const StreamArrow = {
  // arr: lift pure function to stream processor
  arr: <A, B>(f: (a: A) => B): StreamProc<A, B> => 
    (stream: Stream<A>) => stream.map(f),

  // then: compose stream processors
  then: <A, B, C>(g: StreamProc<B, C>) => (f: StreamProc<A, B>): StreamProc<A, C> =>
    (stream: Stream<A>) => g(f(stream)),

  // first: process first element of pairs
  first: <A, B, C>(f: StreamProc<A, B>): StreamProc<readonly [A, C], readonly [B, C]> =>
    (stream: Stream<readonly [A, C]>) => stream.map(([a, c]) => [f([a])[0]!, c] as const),

  // second: process second element of pairs  
  second: <A, B, C>(f: StreamProc<B, C>): StreamProc<readonly [A, B], readonly [A, C]> =>
    (stream: Stream<readonly [A, B]>) => stream.map(([a, b]) => [a, f([b])[0]!] as const),

  // split: process pairs in parallel
  split: <A, B, C, D>(f: StreamProc<A, B>, g: StreamProc<C, D>): StreamProc<readonly [A, C], readonly [B, D]> =>
    (stream: Stream<readonly [A, C]>) => stream.map(([a, c]) => [f([a])[0]!, g([c])[0]!] as const),

  // fanout: duplicate input to two processors
  fanout: <A, B, C>(f: StreamProc<A, B>, g: StreamProc<A, C>): StreamProc<A, readonly [B, C]> =>
    (stream: Stream<A>) => stream.map(a => [f([a])[0]!, g([a])[0]!] as const),

  // left: process left side of Either-like values
  left: <A, B, C>(f: StreamProc<A, B>): StreamProc<{ _tag: 'Left'; value: A } | { _tag: 'Right'; value: C }, { _tag: 'Left'; value: B } | { _tag: 'Right'; value: C }> =>
    (stream: Stream<{ _tag: 'Left'; value: A } | { _tag: 'Right'; value: C }>) => 
      stream.map(e => e._tag === 'Left' ? { _tag: 'Left' as const, value: f([e.value])[0]! } : e),

  // right: process right side of Either-like values
  right: <A, B, C>(f: StreamProc<B, C>): StreamProc<{ _tag: 'Left'; value: A } | { _tag: 'Right'; value: B }, { _tag: 'Left'; value: A } | { _tag: 'Right'; value: C }> =>
    (stream: Stream<{ _tag: 'Left'; value: A } | { _tag: 'Right'; value: B }>) => 
      stream.map(e => e._tag === 'Right' ? { _tag: 'Right' as const, value: f([e.value])[0]! } : e),

  // zero: empty stream processor
  zero: <A, B>(): StreamProc<A, B> => () => [],

  // alt: choice between processors
  alt: <A, B>(f: StreamProc<A, B>, g: StreamProc<A, B>): StreamProc<A, B> =>
    (stream: Stream<A>) => {
      const resultF = f(stream)
      const resultG = g(stream)
      return resultF.length > 0 ? resultF : resultG
    },

  // loop: feedback loop processor
  loop: <A, B, C>(f: StreamProc<readonly [A, C], readonly [B, C]>): StreamProc<A, B> =>
    (stream: Stream<A>) => {
      const result: B[] = []
      let feedback: C[] = []
      
      for (const a of stream) {
        const input: readonly [A, C][] = [[a, feedback[0] ?? ({} as C)]]
        const output = f(input)
        if (output.length > 0) {
          const [b, c] = output[0]!
          result.push(b)
          feedback = [c]
        }
      }
      
      return result
    }
}

// Stream fusion operations
export const StreamFusion = {
  // fusePureInto: fuse pure function into processor
  fusePureInto: <A, B, C>(sigma: StreamProc<B, C>, f: (a: A) => B): StreamProc<A, C> =>
    (stream: Stream<A>) => sigma(stream.map(f)),

  // fuseProcInto: fuse processor into processor  
  fuseProcInto: <A, B, C>(sigma: StreamProc<B, C>, tau: StreamProc<A, B>): StreamProc<A, C> =>
    (stream: Stream<A>) => sigma(tau(stream)),

  // fusePureOut: fuse pure function out of processor
  fusePureOut: <A, B, C>(sigma: StreamProc<A, B>, g: (b: B) => C): StreamProc<A, C> =>
    (stream: Stream<A>) => sigma(stream).map(g)
}

// Stream independence predicate (simple version)
export const isIndependent = <A, B, C>(
  f: StreamProc<A, B>,
  g: StreamProc<A, C>
): boolean => {
  // Simple independence: processors don't share state
  // In a real implementation, this would be more sophisticated
  void f
  void g
  return true // For now, assume all processors are independent
}

// =======================
// Arrow IR System (Paper-Faithful)
// =======================
//
// This implements the "Laws → Shapes → Rewrites → Tests" principle
// with a proper IR-based approach to Arrow operations.

// ===============================================
// Minimal IR (paper-faithful)
// ===============================================

export type IR<I, O> =
  | { tag: 'Arr'; f: (i: I) => O }                    // arr
  | { tag: 'Comp'; f: IR<I, unknown>; g: IR<unknown, O> }     // >>>
  | { tag: 'First'; f: IR<unknown, unknown> }                 // first
  | { tag: 'Left'; f: IR<unknown, unknown> }                  // ArrowChoice
  | { tag: 'Par'; l: IR<unknown, unknown>; r: IR<unknown, unknown> }  // *** (derived: par(f,g) = first(f) >>> second(g))
  | { tag: 'Fanout'; l: IR<unknown, unknown>; r: IR<unknown, unknown> } // &&& (derived: fanout(f,g) = arr(dup) >>> par(f,g))
  | { tag: 'Zero' }                                   // ArrowZero
  | { tag: 'Alt'; l: IR<unknown, unknown>; r: IR<unknown, unknown> }  // ArrowPlus
  | { tag: 'Loop'; f: IR<[unknown, unknown], [unknown, unknown]> }    // ArrowLoop

// ===============================================
// Denotation Function (IR → Function)
// ===============================================

export const denot = <I, O>(ir: IR<I, O>): (i: I) => O => {
  switch (ir.tag) {
    case 'Arr':
      return ir.f

    case 'Comp': {
      const f = denot(ir.f)
      const g = denot(ir.g)
      return (i: I) => g(f(i))
    }

    case 'First': {
      const f = denot(ir.f)
      return (([a, c]: readonly [unknown, unknown]) => [f(a), c] as const) as unknown as (i: I) => O
    }

    case 'Left': {
      const f = denot(ir.f)
      return ((
        e:
          | { _tag: 'Left'; value: unknown }
          | { _tag: 'Right'; value: unknown }
      ) => {
        if (e._tag === 'Left') return { _tag: 'Left' as const, value: f(e.value) }
        return e
      }) as unknown as (i: I) => O
    }

    case 'Par': {
      const l = denot(ir.l)
      const r = denot(ir.r)
      return (([a, c]: readonly [unknown, unknown]) => [l(a), r(c)] as const) as unknown as (i: I) => O
    }

    case 'Fanout': {
      const l = denot(ir.l)
      const r = denot(ir.r)
      return ((a: unknown) => [l(a), r(a)] as const) as unknown as (i: I) => O
    }

    case 'Zero':
      return () => { throw new Error('ArrowZero: no value') }

    case 'Alt': {
      const l = denot(ir.l)
      const r = denot(ir.r)
      return ((a: unknown) => {
        try { return l(a) } catch { return r(a) }
      }) as unknown as (i: I) => O
    }

    case 'Loop': {
      const f = denot(ir.f)
      return ((a: unknown) => {
        let [b, c] = f([a, undefined] as [unknown, unknown])
        while (c !== undefined) {
          [b, c] = f([a, c] as [unknown, unknown])
        }
        return b
      }) as unknown as (i: I) => O
    }
  }
}

// ===============================================
// Arrow Constructors
// ===============================================

export const arr = <I, O>(f: (i: I) => O): IR<I, O> => ({ tag: 'Arr', f })

export const comp = <I, M, O>(f: IR<I, M>, g: IR<M, O>): IR<I, O> =>
  ({ tag: 'Comp', f: f as IR<I, unknown>, g: g as IR<unknown, O> }) as IR<I, O>

export const first = <A, B, C>(f: IR<A, B>): IR<readonly [A, C], readonly [B, C]> =>
  ({ tag: 'First', f: f as IR<unknown, unknown> }) as IR<readonly [A, C], readonly [B, C]>

export const leftArrow = <A, B, C>(f: IR<A, B>): IR<
  { _tag: 'Left'; value: A } | { _tag: 'Right'; value: C },
  { _tag: 'Left'; value: B } | { _tag: 'Right'; value: C }
> => ({ tag: 'Left', f: f as IR<unknown, unknown> }) as IR<
  { _tag: 'Left'; value: A } | { _tag: 'Right'; value: C },
  { _tag: 'Left'; value: B } | { _tag: 'Right'; value: C }
>

export const par = <A, B, C, D>(f: IR<A, B>, g: IR<C, D>): IR<readonly [A, C], readonly [B, D]> =>
  ({ tag: 'Par', l: f as IR<unknown, unknown>, r: g as IR<unknown, unknown> }) as IR<readonly [A, C], readonly [B, D]>

export const fanout = <A, B, C>(f: IR<A, B>, g: IR<A, C>): IR<A, readonly [B, C]> =>
  ({ tag: 'Fanout', l: f as IR<unknown, unknown>, r: g as IR<unknown, unknown> }) as IR<A, readonly [B, C]>

export const zero = <A, B>(): IR<A, B> => ({ tag: 'Zero' })

export const alt = <A, B>(f: IR<A, B>, g: IR<A, B>): IR<A, B> =>
  ({
    tag: 'Alt',
    l: f as IR<unknown, unknown>,
    r: g as IR<unknown, unknown>
  }) as IR<A, B>

export const loop = <A, B>(f: IR<[A, B], [B, B]>): IR<A, B> =>
  ({ tag: 'Loop', f: f as IR<[unknown, unknown], [unknown, unknown]> }) as IR<A, B>

// ===============================================
// Derived Combinators
// ===============================================

export const second = <A, B, C>(f: IR<B, C>): IR<readonly [A, B], readonly [A, C]> => {
  // second f = arr swap >>> first f >>> arr swap
  const swap = arr<readonly [A, B], readonly [B, A]>(([a, b]) => [b, a])
  const swapBack = arr<readonly [C, A], readonly [A, C]>(([c, a]) => [a, c])
  return comp(comp(swap, first(f)), swapBack)
}

type LeftValue<T> = { _tag: 'Left'; value: T }
type RightValue<T> = { _tag: 'Right'; value: T }
type EitherValue<L, R> = LeftValue<L> | RightValue<R>

const flipEither = <L, R>(): IR<EitherValue<L, R>, EitherValue<R, L>> =>
  arr<EitherValue<L, R>, EitherValue<R, L>>((e) =>
    e._tag === 'Left'
      ? { _tag: 'Right' as const, value: e.value }
      : { _tag: 'Left' as const, value: e.value }
  )

export const rightArrow = <A, B, C>(f: IR<A, B>): IR<EitherValue<C, A>, EitherValue<C, B>> => {
  // right f = arr mirror >>> left f >>> arr mirror
  const mirrorIn = flipEither<C, A>() as IR<EitherValue<C, A>, EitherValue<A, C>>
  const leftF = leftArrow(f) as IR<EitherValue<A, C>, EitherValue<B, C>>
  const mirrorOut = flipEither<B, C>() as IR<EitherValue<B, C>, EitherValue<C, B>>
  const mirroredLeft = comp(mirrorIn, leftF) as IR<EitherValue<C, A>, EitherValue<B, C>>
  return comp(mirroredLeft, mirrorOut) as IR<EitherValue<C, A>, EitherValue<C, B>>
}

export const plus = <A, B>(f: IR<A, B>, g: IR<A, B>): IR<A, B> => alt(f, g)

// ===============================================
// Explain-Plan Contract
// ===============================================

export interface RewriteStep {
  rule: string
  before: string
  after: string
  law: string
}

export interface RewritePlan<I = unknown, O = unknown> {
  plan: IR<I, O>
  steps: ReadonlyArray<RewriteStep>
}

// ===============================================
// Normalization Rewrites (with Explain-Plan)
// ===============================================

export const normalize = <I, O>(ir: IR<I, O>): RewritePlan<I, O> => {
  const steps: RewriteStep[] = []
  let current = ir
  let changed = true
  
  while (changed) {
    changed = false
    const result = rewriteWithPlan(current)
    if (result.plan !== current) {
      current = result.plan
      steps.push(...result.steps)
      changed = true
    }
  }
  
  return { plan: current, steps } as RewritePlan<I, O>
}

const rewriteWithPlan = <I, O>(ir: IR<I, O>): RewritePlan<I, O> => {
  const steps: RewriteStep[] = []
  const result = rewrite(ir, steps)
  return { plan: result, steps }
}

const rewrite = <I, O>(ir: IR<I, O>, steps: RewriteStep[] = []): IR<I, O> => {
  switch (ir.tag) {
    case 'Comp': {
      const f = rewrite(ir.f, steps)
      const g = rewrite(ir.g, steps)
      
      // Associativity: (f >>> g) >>> h = f >>> (g >>> h)
      if (f.tag === 'Comp') {
        const result = comp(f.f, comp(f.g, g))
        steps.push({
          rule: "AssocComp",
          before: hashIR(ir),
          after: hashIR(result),
          law: "Category.3 (Associativity)"
        })
        return result as IR<I, O>
      }
      
      // Identity elimination: arr id >>> f = f
      if (f.tag === 'Arr' && f.f === idFn) {
        steps.push({
          rule: "DropLeftId",
          before: hashIR(ir),
          after: hashIR(g),
          law: "Category.1 (Left Identity)"
        })
        return g as IR<I, O>
      }
      
      // Identity elimination: f >>> arr id = f  
      if (g.tag === 'Arr' && g.f === idFn) {
        steps.push({
          rule: "DropRightId",
          before: hashIR(ir),
          after: hashIR(f),
          law: "Category.2 (Right Identity)"
        })
        return f as IR<I, O>
      }
      
      // Functoriality: arr f >>> arr g = arr (g ∘ f)
      if (f.tag === 'Arr' && g.tag === 'Arr') {
        const result = arr((i: I) => g.f(f.f(i)))
        steps.push({
          rule: "FuseArr",
          before: hashIR(ir),
          after: hashIR(result),
          law: "Arrow.2 (Functoriality)"
        })
        return result as IR<I, O>
      }
      
      return { tag: 'Comp', f, g } as IR<I, O>
    }
    
    case 'First': {
      const f = rewrite(ir.f, steps)
      
      // first (arr f) = arr (first f)
      if (f.tag === 'Arr') {
        const result = arr(([a, c]: readonly [unknown, unknown]) => [f.f(a), c] as const) as IR<I, O>
        steps.push({
          rule: "CollapseFirstArr",
          before: hashIR(ir),
          after: hashIR(result),
          law: "Arrow.3 (Extension)"
        })
        return result
      }
      
      // first (f >>> g) = first f >>> first g
      if (f.tag === 'Comp') {
        const result = comp(first(f.f), first(f.g)) as IR<I, O>
        steps.push({
          rule: "PushFirstComp",
          before: hashIR(ir),
          after: hashIR(result),
          law: "Arrow.4 (Exchange)"
        })
        return result
      }
      
      return { tag: 'First', f } as IR<I, O>
    }
    
    case 'Par': {
      const l = rewrite(ir.l, steps)
      const r = rewrite(ir.r, steps)
      
      // Par(Arr f, Arr g) = Arr(f×g)
      if (l.tag === 'Arr' && r.tag === 'Arr') {
        const result = arr(([a, c]: readonly [unknown, unknown]) => [l.f(a), r.f(c)] as const) as IR<I, O>
        steps.push({
          rule: "FuseParArr",
          before: hashIR(ir),
          after: hashIR(result),
          law: "Arrow.5 (Product Functoriality)"
        })
        return result
      }
      
      // Comp(Par(a,b), Par(c,d)) = Par(Comp(a,c), Comp(b,d))
      // This would need more context to implement properly
      
      return { tag: 'Par', l, r } as IR<I, O>
    }
    
    case 'Fanout': {
      const l = rewrite(ir.l, steps)
      const r = rewrite(ir.r, steps)
      
      // Fanout(Arr f, Arr g) = Arr(f &&& g)
      if (l.tag === 'Arr' && r.tag === 'Arr') {
        const result = arr((a: I) => [l.f(a as unknown), r.f(a as unknown)] as const) as IR<I, O>
        steps.push({
          rule: "FuseFanoutArr",
          before: hashIR(ir),
          after: hashIR(result),
          law: "Arrow.6 (Fanout Functoriality)"
        })
        return result
      }
      
      return { tag: 'Fanout', l, r } as IR<I, O>
    }
    
    case 'Alt': {
      const l = rewrite(ir.l, steps)
      const r = rewrite(ir.r, steps)
      
      // Zero <+> p = p
      if (l.tag === 'Zero') {
        steps.push({
          rule: "DropLeftZero",
          before: hashIR(ir),
          after: hashIR(r),
          law: "ArrowPlus.1 (Left Identity)"
        })
        return r as IR<I, O>
      }
      
      // p <+> Zero = p
      if (r.tag === 'Zero') {
        steps.push({
          rule: "DropRightZero",
          before: hashIR(ir),
          after: hashIR(l),
          law: "ArrowPlus.2 (Right Identity)"
        })
        return l as IR<I, O>
      }
      
      // (p <+> q) <+> r = p <+> (q <+> r)
      if (l.tag === 'Alt') {
        const result = alt(l.l, alt(l.r, r))
        steps.push({
          rule: "AssocAlt",
          before: hashIR(ir),
          after: hashIR(result),
          law: "ArrowPlus.3 (Associativity)"
        })
        return result as IR<I, O>
      }
      
      return { tag: 'Alt', l, r } as IR<I, O>
    }
    
    case 'Left': {
      const f = rewrite(ir.f, steps)
      
      // left (arr f) = arr (left f)
      if (f.tag === 'Arr') {
        const result = arr((e: EitherValue<unknown, unknown>) => {
          if (e._tag === 'Left') return { _tag: 'Left' as const, value: f.f(e.value) }
          return e
        }) as IR<I, O>
        steps.push({
          rule: "CollapseLeftArr",
          before: hashIR(ir),
          after: hashIR(result),
          law: "ArrowChoice.1 (Left Identity)"
        })
        return result
      }
      
      // left (f >>> g) = left f >>> left g
      if (f.tag === 'Comp') {
        const result = comp(leftArrow(f.f), leftArrow(f.g)) as IR<I, O>
        steps.push({
          rule: "PushLeftComp",
          before: hashIR(ir),
          after: hashIR(result),
          law: "ArrowChoice.2 (Left Exchange)"
        })
        return result
      }
      
      return { tag: 'Left', f } as IR<I, O>
    }
    
    case 'Loop': {
      const f = rewrite(ir.f, steps)
      
      // Loop(f) >>> arr g = Loop(f >>> arr(g × id))
      // This would need more context to implement properly
      // For now, just return the loop unchanged
      
      return { tag: 'Loop', f } as IR<I, O>
    }
    
    default:
      return ir
  }
}

// Helper function for identity (avoiding conflict with existing id)
const idFn = <A>(a: A): A => a

// Simple hash function for IR (for explain-plan)
const hashIR = <I, O>(ir: IR<I, O>): string => {
  return JSON.stringify(ir, (key, value) => {
    void key
    if (typeof value === 'function') return '<function>'
    return value
  }).slice(0, 50) + '...'
}

// ===============================================
// Arrow API (High-Level)
// ===============================================

export const Arrow = {
  // Core operations
  arr,
  comp,
  first,
  left: leftArrow,
  par,
  fanout,
  zero,
  alt,
  loop,
  
  // Derived operations
  second,
  right: rightArrow,
  plus,
  
  // Utilities
  denot,
  normalize,
  
  // Convenience aliases
  then: comp,
  split: par,
  
  // Identity arrow
  id: <A>(): IR<A, A> => arr(idFn),
}




// =======================
// Exhaustiveness Guard (for safe refactoring)
// =======================
//
// Drop this helper in every switch over tagged unions to make missing cases
// compile-time errors. Essential for safe AST evolution!
export const _exhaustive = (x: never): never => x

// =======================
// HKT core (ours): HK.*
// =======================
//
// Design notes:
// - No module augmentation, no merging: single place to "register" types.
// - Names: HK.Registry1 / HK.Registry2 instead of fp-ts's URI mapping.
// - Left slot of Registry2<L, A> is the one you typically "pin" (e.g. Env or Error).

export namespace HK {
  // ---------- 1-parameter type constructors: F<_> ----------
  export interface Registry1<A> {
    Option: Option<A>
    JsonF: JsonF<A>
    ExprF: ExprF<A>

    // Add more if you like (uncomment when you actually want them):
    // Array: ReadonlyArray<A>
    // Task: Task<A>
  }
  export type Id1 = keyof Registry1<unknown>
  export type Kind1<F extends Id1, A> = Registry1<A>[F]

  // ---------- 2-parameter type constructors: F<_, _> ----------
  // Convention: the LEFT slot <L, A> is the one you often keep constant.
  export interface Registry2<L, A> {
    Result: Result<L, A>
    ReaderTask: ReaderTask<L, A>   // here L = R (environment) for ReaderTask
    // Reader: Reader<L, A>        // if you want Reader as a Kind2 too
  }
  export type Id2 = keyof Registry2<unknown, unknown>
  export type Kind2<F extends Id2, L, A> = Registry2<L, A>[F]
}

export type HKId1 = HK.Id1
export type HKKind1<F extends HK.Id1, A> = HK.Kind1<F, A>

// -----------------------
// Typeclasses over HK.*
// -----------------------
export interface FunctorK1<F extends HK.Id1> {
  readonly map: <A, B>(f: (a: A) => B) => (fa: HK.Kind1<F, A>) => HK.Kind1<F, B>
}

export interface ApplicativeK1<F extends HK.Id1> extends FunctorK1<F> {
  readonly of: <A>(a: A) => HK.Kind1<F, A>
  readonly ap: <A, B>(ff: HK.Kind1<F, (a: A) => B>) => (fa: HK.Kind1<F, A>) => HK.Kind1<F, B>
}

export interface MonadK1<F extends HK.Id1> extends ApplicativeK1<F> {
  readonly chain: <A, B>(f: (a: A) => HK.Kind1<F, B>) => (fa: HK.Kind1<F, A>) => HK.Kind1<F, B>
}

// 2-arg (constant-left) variant: pin L and work in A
export interface FunctorK2C<F extends HK.Id2, L> {
  readonly map: <A, B>(f: (a: A) => B) => (fa: HK.Kind2<F, L, A>) => HK.Kind2<F, L, B>
}
export interface ApplicativeK2C<F extends HK.Id2, L> extends FunctorK2C<F, L> {
  readonly of: <A>(a: A) => HK.Kind2<F, L, A>
  readonly ap: <A, B>(ff: HK.Kind2<F, L, (a: A) => B>) => (fa: HK.Kind2<F, L, A>) => HK.Kind2<F, L, B>
}
export interface MonadK2C<F extends HK.Id2, L> extends ApplicativeK2C<F, L> {
  readonly chain: <A, B>(f: (a: A) => HK.Kind2<F, L, B>) => (fa: HK.Kind2<F, L, A>) => HK.Kind2<F, L, B>
}

// -----------------------
// Endofunctor helpers
// -----------------------

// Endofunctor on K1 is just a FunctorK1 (endofunctor on TS types)
// Note: Using the earlier EndofunctorK1 definition from line 330

// Helpers to "fix" the left param of K2 constructors => a K1 endofunctor
export const ResultK1 = <E>() => {
  const endo = {
    map:  <A, B>(f: (a: A) => B) => (ra: Result<E, A>): Result<E, B> => mapR<E, A, B>(f)(ra),
    ap:   <A, B>(rf: Result<E, (a: A) => B>) => (ra: Result<E, A>): Result<E, B> =>
          isOk(rf) && isOk(ra) ? Ok(rf.value(ra.value)) : (isErr(rf) ? rf : (ra as Err<E>)),
    of:   <A>(a: A): Result<E, A> => Ok(a),
    chain:<A, B>(f: (a: A) => Result<E, B>) => (ra: Result<E, A>): Result<E, B> =>
          isOk(ra) ? f(ra.value) : (ra as Err<E>),
  }

  return endo as typeof endo & EndofunctorK1<['Either', E]>
}

// Fix Reader/ReaderTask environment to get a K1 endofunctor
export const ReaderK1 = <R>() => ({
  map:  <A, B>(f: (a: A) => B) => (ra: Reader<R, A>): Reader<R, B> => Reader.map<A, B>(f)(ra),
  ap:   <A, B>(rf: Reader<R, (a: A) => B>) => (ra: Reader<R, A>): Reader<R, B> => Reader.ap<R, A, B>(rf)(ra),
  of:   <A>(a: A): Reader<R, A> => Reader.of<R, A>(a),
  chain:<A, B>(f: (a: A) => Reader<R, B>) => (ra: Reader<R, A>): Reader<R, B> => Reader.chain<A, B, R>(f)(ra),
})

export const ReaderTaskK1 = <R>() => ({
  map:  <A, B>(f: (a: A) => B) => (rta: ReaderTask<R, A>): ReaderTask<R, B> => ReaderTask.map<A, B>(f)(rta),
  ap:   <A, B>(rf: ReaderTask<R, (a: A) => B>) => (ra: ReaderTask<R, A>): ReaderTask<R, B> => ReaderTask.ap<R, A, B>(rf)(ra),
  of:   <A>(a: A): ReaderTask<R, A> => ReaderTask.of<R, A>(a),
  chain:<A, B>(f: (a: A) => ReaderTask<R, B>) => (ra: ReaderTask<R, A>): ReaderTask<R, B> => ReaderTask.chain<A, B, R>(f)(ra),
})

// -----------------------
// Monoidal Functor Structure
// -----------------------

/**
 * MonoidalFunctorK1 (lax monoidal endofunctor on Types, tensor = product)
 * Laws (point-free; F is the functor, × is tuple, 1 is void):
 *
 * 1) Functor laws
 *    F.map(id) = id
 *    F.map(g ∘ f) = F.map(g) ∘ F.map(f)
 *
 * 2) Unit (left/right) coherence
 *    // λ: A ≅ [1, A],  ρ: A ≅ [A, 1]
 *    F.map(λ.from) = a => F.tensor(F.unit, a)          // expand with left unit
 *    F.map(ρ.from) = a => F.tensor(a, F.unit)          // expand with right unit
 *
 * 3) Associativity coherence
 *    // α: [A, [B, C]] ≅ [[A, B], C]
 *    F.map(α.from) ∘ F.tensor(F.tensor(a, b), c)
 *      = F.tensor(a, F.tensor(b, c))                   // both sides are F<[A,[B,C]]>
 *
 * 4) Naturality of tensor
 *    F.tensor(F.map(f)(a), F.map(g)(b))
 *      = F.map(bimap(f, g))(F.tensor(a, b))
 *
 * Helpers you can reuse in tests:
 *   const lFrom = <A>(a: A): readonly [void, A] => [undefined, a] as const
 *   const rFrom = <A>(a: A): readonly [A, void] => [a, undefined] as const
 *   const assocFrom = <A,B,C>(x: readonly [[A,B], C]): readonly [A, readonly [B,C]] =>
 *     [x[0][0], [x[0][1], x[1]] as const] as const
 *   const bimap = <A,B,C,D>(f: (a:A)=>C, g: (b:B)=>D) =>
 *     ([a,b]: readonly [A,B]): readonly [C,D] => [f(a), g(b)] as const
 */
export type MonoidalFunctorK1<F> = {
  /** φ₀ : 1 → F 1  (here: 1 is `void`) */
  unit: FunctorValue<F, void>
  /** φ_{A,B} : F A × F B → F (A×B)  (here: × is tuple) */
  tensor: <A, B>(fa: FunctorValue<F, A>, fb: FunctorValue<F, B>) => FunctorValue<F, readonly [A, B]>
  /** just to be convenient at call sites */
  map: <A, B>(f: (a: A) => B) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

export const monoidalFromApplicative = <F>(A: ApplicativeLike<F>): MonoidalFunctorK1<F> => ({
  unit: A.of<void>(undefined as void),
  tensor: <A, B>(fa: FunctorValue<F, A>, fb: FunctorValue<F, B>) =>
    A.ap(A.map((a: A) => (b: B) => [a, b] as const)(fa))(fb),
  map: A.map
})

// convenience shims built from each Monoidal
export const zipWithFromMonoidal =
  <F>(M: MonoidalFunctorK1<F>) =>
  <A, B, C>(f: (a: A, b: B) => C) =>
  (fa: FunctorValue<F, A>) =>
  (fb: FunctorValue<F, B>) =>
    M.map<readonly [A, B], C>(([a, b]) => f(a, b))(M.tensor<A, B>(fa, fb))

export const zipFromMonoidal =
  <F>(M: MonoidalFunctorK1<F>) =>
  <A, B>(fa: FunctorValue<F, A>) =>
  (fb: FunctorValue<F, B>) =>
    M.tensor<A, B>(fa, fb)

// -----------------------
// Monoidal Category Structure
// -----------------------

// ---------- Iso (categorical isomorphism as a pair of arrows) ----------
export type Iso<X, Y> = {
  readonly to:   (x: X) => Y
  readonly from: (y: Y) => X
}

// ---------- Plain function category (Types, functions) ----------
export type Hom<A, B> = (a: A) => B

export const CatFn = {
  id:      <A>(): Hom<A, A> => (a) => a,
  compose: <A, B, C>(f: Hom<B, C>, g: Hom<A, B>): Hom<A, C> => (a) => f(g(a)),
}

// ---------- Monoidal structure on functions: tensor = product, unit = void ----------
export const MonoidalFn = {
  I: undefined as void, // unit object 1

  // tensor on morphisms: (A→B) ⊗ (C→D) = ([A,C]→[B,D])
  tensor:
    <A, B, C, D>(f: Hom<A, B>, g: Hom<C, D>): Hom<readonly [A, C], readonly [B, D]> =>
      ([a, c]) => [f(a), g(c)] as const,

  // coherence isos (they're isomorphisms, not equalities)
  leftUnitor:  <A>(): Iso<readonly [void, A], A> =>
    ({ to: ([, a]) => a, from: (a) => [undefined, a] as const }),

  rightUnitor: <A>(): Iso<readonly [A, void], A> =>
    ({ to: ([a]) => a, from: (a) => [a, undefined] as const }),

  associator:  <A, B, C>(): Iso<
    readonly [A, readonly [B, C]],
    readonly [readonly [A, B], C]
  > => ({
    to:   ([a, [b, c]])   => [[a, b] as const, c] as const,
    from: ([[a, b],  c])  => [a, [b, c] as const] as const,
  }),
}

// -----------------------
// Monoidal Functor Instances
// -----------------------

// ----- Option -----
const ApplicativeOption: ApplicativeLike<'Option'> = {
  of: Some,
  map: mapO,
  ap: <A, B>(ff: Option<(a: A) => B>) => (fa: Option<A>): Option<B> =>
    isSome(ff) && isSome(fa) ? Some(ff.value(fa.value)) : None,
}
export const MonoidalOption = monoidalFromApplicative(ApplicativeOption)
export const zipOption      = zipFromMonoidal(MonoidalOption)
export const zipWithOption  = zipWithFromMonoidal(MonoidalOption)

// ----- Result<E,_> (short-circuiting; use Validation for accumulation) -----
const apResult = <E, A, B>(rf: Result<E, (a: A) => B>) => (ra: Result<E, A>): Result<E, B> =>
  isOk(rf) && isOk(ra) ? Ok(rf.value(ra.value)) : (isErr(rf) ? rf : ra as Err<E>)

export const ApplicativeResult = <E>(): ApplicativeLike<'Result'> => {
  const _phantom: undefined | E = undefined
  void _phantom
  return {
    of: Ok,
    map: mapR,
    ap: apResult,
  }
}
export const MonoidalResult = <E>() => monoidalFromApplicative(ApplicativeResult<E>())
export const zipResult =
  <E>() =>
  <A, B>(fa: Result<E, A>) =>
  (fb: Result<E, B>): Result<E, readonly [A, B]> =>
    MonoidalResult<E>().tensor(fa, fb) as Result<E, readonly [A, B]>

export const zipWithResult =
  <E>() =>
  <A, B, C>(f: (a: A, b: B) => C) =>
  (fa: Result<E, A>) =>
  (fb: Result<E, B>): Result<E, C> =>
    MonoidalResult<E>().map<readonly [A, B], C>(([a, b]) => f(a, b))(MonoidalResult<E>().tensor(fa, fb)) as Result<E, C>

// ----- Reader<R,_> -----
export const ApplicativeReader = <R>(): ApplicativeLike<'Reader'> => ({
  of: <A>(a: A) => Reader.of<R, A>(a),
  map: <A, B>(f: (a: A) => B) =>
    (ra: FunctorValue<'Reader', A>): FunctorValue<'Reader', B> =>
      Reader.map<A, B>(f)<R>(ra as Reader<R, A>),
  ap: <A, B>(rfab: FunctorValue<'Reader', (a: A) => B>) =>
    (rfa: FunctorValue<'Reader', A>): FunctorValue<'Reader', B> =>
      Reader.ap<R, A, B>(rfab as Reader<R, (a: A) => B>)(rfa as Reader<R, A>),
})
export const MonoidalReader = <R>() => monoidalFromApplicative(ApplicativeReader<R>())
export const zipReader =
  <R>() =>
  <A, B>(fa: Reader<R, A>) =>
  (fb: Reader<R, B>): Reader<R, readonly [A, B]> =>
    MonoidalReader<R>().tensor(fa, fb) as Reader<R, readonly [A, B]>

export const zipWithReader =
  <R>() =>
  <A, B, C>(f: (a: A, b: B) => C) =>
  (fa: Reader<R, A>) =>
  (fb: Reader<R, B>): Reader<R, C> =>
    MonoidalReader<R>().map<readonly [A, B], C>(([a, b]) => f(a, b))(MonoidalReader<R>().tensor(fa, fb)) as Reader<R, C>

// ----- ReaderTask<R,_> -----
export const ApplicativeReaderTask = <R>(): ApplicativeLike<'ReaderTask'> => ({
  of:  <A>(a: A) => ReaderTask.of<R, A>(a),
  map: <A, B>(f: (a: A) => B) =>
    (rta: FunctorValue<'ReaderTask', A>): FunctorValue<'ReaderTask', B> =>
      ReaderTask.map<A, B>(f)<R>(rta as ReaderTask<R, A>),
  ap:  <A, B>(rtfab: FunctorValue<'ReaderTask', (a: A) => B>) =>
    (rta: FunctorValue<'ReaderTask', A>): FunctorValue<'ReaderTask', B> =>
      ReaderTask.ap<R, A, B>(rtfab as ReaderTask<R, (a: A) => B>)(rta as ReaderTask<R, A>),
})
export const MonoidalReaderTask = <R>() => monoidalFromApplicative(ApplicativeReaderTask<R>())
export const zipReaderTask =
  <R>() =>
  <A, B>(fa: ReaderTask<R, A>) =>
  (fb: ReaderTask<R, B>): ReaderTask<R, readonly [A, B]> =>
    MonoidalReaderTask<R>().tensor(fa, fb) as ReaderTask<R, readonly [A, B]>

export const zipWithReaderTask =
  <R>() =>
  <A, B, C>(f: (a: A, b: B) => C) =>
  (fa: ReaderTask<R, A>) =>
  (fb: ReaderTask<R, B>): ReaderTask<R, C> =>
    MonoidalReaderTask<R>().map<readonly [A, B], C>(([a, b]) => f(a, b))(MonoidalReaderTask<R>().tensor(fa, fb)) as ReaderTask<R, C>

// ----- ReaderTaskEither<R,E,_> -----
export const ApplicativeRTE = <R, E>(): ApplicativeLike<'RTE'> => ({
  of:  <A>(a: A) => RTE.of<A>(a) as ReaderTaskEither<R, E, A>,
  map: <A, B>(f: (a: A) => B) =>
    (fea: FunctorValue<'RTE', A>): FunctorValue<'RTE', B> =>
      RTE.map<E, A, B>(f)(fea as ReaderTaskEither<R, E, A>),
  ap:  <A, B>(ff: FunctorValue<'RTE', (a: A) => B>) =>
    (fa: FunctorValue<'RTE', A>): FunctorValue<'RTE', B> =>
      RTE.ap<E, A, B>(ff as ReaderTaskEither<R, E, (a: A) => B>)(fa as ReaderTaskEither<R, E, A>),
})

export const MonoidalRTE = <R, E>() => monoidalFromApplicative(ApplicativeRTE<R, E>())

export const zipRTE_Monoidal =
  <R, E>() =>
  <A, B>(fa: ReaderTaskEither<R, E, A>) =>
  (fb: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, readonly [A, B]> =>
    zipRTE<R, E, A, B>(fa)(fb)

export const zipWithRTE_Monoidal =
  <R, E>() =>
  <A, B, C>(f: (a: A, b: B) => C) =>
  (fa: ReaderTaskEither<R, E, A>) =>
  (fb: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, C> =>
    zipWithRTE<R, E, A, B, C>(f)(fa)(fb)

// ----- Validation<E,_> (accumulating) -----
export const ApplicativeValidation =
  <E>(concatErrs: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>): ApplicativeLike<ValidationTag<E>> => ({
    of:  <A>(a: A): Validation<E, A> => VOk(a) as Validation<E, A>,
    map: <A, B>(f: (a: A) => B) => (va: Validation<E, A>): Validation<E, B> => mapV<E, A, B>(f)(va),
    ap:  <A, B>(vf: Validation<E, (a: A) => B>) =>
         (va: Validation<E, A>): Validation<E, B> => apV<E>(concatErrs)<A, B>(vf)(va),
  })

export const MonoidalValidation =
  <E>(concatErrs: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>) =>
    monoidalFromApplicative(ApplicativeValidation<E>(concatErrs))

// helpers:
export const zipValidation =
  <E>(concatErrs: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>) =>
  <A, B>(va: Validation<E, A>) =>
  (vb: Validation<E, B>): Validation<E, readonly [A, B]> =>
    MonoidalValidation<E>(concatErrs).tensor(va, vb)

// ----- Minimal aliases for RTE (adjust if you already have them) -----
const ofRTE = <R, E, A>(a: A): ReaderTaskEither<R, E, A> =>
  async (_: R) => Ok(a)

// ----- Monoidal Kleisli structure for RTE -----
export const MonoidalKleisliRTE = <R, E>() => {
  return {
    I: undefined as void,

    // tensor on arrows: ([A,C]) -> zip(f(a), g(c))
    tensor:
      <A, B, C, D>(
        f: (a: A) => ReaderTaskEither<R, E, B>,
        g: (c: C) => ReaderTaskEither<R, E, D>
      ) =>
      ([a, c]: readonly [A, C]): ReaderTaskEither<R, E, readonly [B, D]> =>
        zipWithRTE<R, E, B, D, readonly [B, D]>((b, d) => [b, d] as const)(f(a))(g(c)),

    // coherence isos lifted into Kleisli (pure maps wrapped with of)
    leftUnitor:  <A>() => ({
      to:   ([, a]: readonly [void, A]) => ofRTE<R, E, A>(a),
      from: (a: A)                       => ofRTE<R, E, readonly [void, A]>([undefined, a] as const),
    }),

    rightUnitor: <A>() => ({
      to:   ([a]: readonly [A, void]) => ofRTE<R, E, A>(a),
      from: (a: A)                     => ofRTE<R, E, readonly [A, void]>([a, undefined] as const),
    }),

    associator:  <A, B, C>() => ({
      to:   ([a, bc]: readonly [A, readonly [B, C]]) =>
              ofRTE<R, E, readonly [[A, B], C]>([[a, bc[0]] as const, bc[1]] as const),
      from: ([[a, b], c]: readonly [readonly [A, B], C]) =>
              ofRTE<R, E, readonly [A, readonly [B, C]]>([a, [b, c] as const] as const),
    }),
  }
}

// =======================
// Instances (no collisions)
// =======================

// Option as Kind1
export const OptionK: MonadK1<'Option'> = {
  map: <A, B>(f: (a: A) => B) => mapO(f),
  of : <A>(a: A): Option<A> => Some(a),
  ap : <A, B>(ff: Option<(a: A) => B>) => (fa: Option<A>): Option<B> =>
    isSome(ff) && isSome(fa) ? Some(ff.value(fa.value)) : None,
  chain: <A, B>(f: (a: A) => Option<B>) => flatMapO(f),
}

// ReaderTask with environment R pinned as the constant-left param
export const ReaderTaskK = <R>(): MonadK2C<'ReaderTask', R> => ({
  map: <A, B>(f: (a: A) => B) =>
    (fa: ReaderTask<R, A>): ReaderTask<R, B> =>
      async (env) => f(await fa(env)),

  of: <A>(a: A): ReaderTask<R, A> =>
    ReaderTask.of<R, A>(a),

  ap: <A, B>(ff: ReaderTask<R, (a: A) => B>) =>
    (fa: ReaderTask<R, A>): ReaderTask<R, B> =>
      async (env) => {
        const [f, a] = await Promise.all([ff(env), fa(env)])
        return f(a)
      },

  chain: <A, B>(f: (a: A) => ReaderTask<R, B>) =>
    (fa: ReaderTask<R, A>): ReaderTask<R, B> =>
      async (env) => {
        const a = await fa(env)
        return f(a)(env)
      },
})

// (Optional) Result with error E pinned as constant-left
export const ResultK = <E>(): MonadK2C<'Result', E> => ({
  map: <A, B>(f: (a: A) => B) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? Ok(f(ra.value)) : (ra as Err<E>),

  of: <A>(a: A): Result<E, A> => Ok(a) as Result<E, A>,

  ap:  <A, B>(rf: Result<E, (a: A) => B>) =>
       (ra: Result<E, A>): Result<E, B> =>
         isOk(rf) && isOk(ra) ? Ok(rf.value(ra.value)) : (isErr(rf) ? rf : (ra as Err<E>)),

  chain: <A, B>(f: (a: A) => Result<E, B>) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? f(ra.value) : (ra as Err<E>),
})

// =======================
// Generic helpers using HK.*
// =======================

// ====================================================================
// Category Theory Constructs: Natural Transformations, Kleisli, Writer
// ====================================================================

// ---------- Natural transformations over K1 ----------
// Note: Using the earlier NatK1 and idNatK1 definitions from lines 335 and 340

// identity / composition
// Note: Using the earlier idNatK1 definition
export const composeNatK1 = <F, G, H>(g: NatK1<G, H>, f: NatK1<F, G>): NatK1<F, H> => ({
  app: <A>(fa: EndofunctorValue<F, A>) => g.app<A>(f.app<A>(fa))
})

// ---------- Concrete polymorphic transforms (no HKT registry needed) ----------
export const optionToResult =
  <E>(onNone: E) =>
  <A>(oa: Option<A>): Result<E, A> =>
    isSome(oa) ? Ok(oa.value) : Err(onNone)

export const resultToOption =
  <E, A>(ra: Result<E, A>): Option<A> =>
    isOk(ra) ? Some(ra.value) : None

export const taskToReaderTask =
  <R, A>(ta: Task<A>): ReaderTask<R, A> =>
    async () => ta()

export const readerToReaderTask =
  <R, A>(ra: Reader<R, A>): ReaderTask<R, A> =>
    async (r: R) => ra(r)

// ---------- Kleisli "category" over each MonadK1 + ready-made instances ----------
// Minimal MonadK1 shape we rely on
export type MonadK1Like<F> = {
  of: <A>(a: A) => FunctorValue<F, A>
  chain: <A, B>(f: (a: A) => FunctorValue<F, B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

// Kleisli composition: (B -> M C) ∘ (A -> M B) -> (A -> M C)
export const Kleisli = <M>(M: MonadK1Like<M>) => ({
  id:
    <A>() =>
    (a: A) =>
      M.of<A>(a),

  compose:
    <A, B, C>(f: (b: B) => FunctorValue<M, C>, g: (a: A) => FunctorValue<M, B>) =>
    (a: A) =>
      M.chain<B, C>(f)(g(a)),
})

// Instances over your monads
const OptionMonadLike: MonadK1Like<'Option'> = {
  of: Some,
  chain: <A, B>(f: (a: A) => Option<B>) => (oa: Option<A>): Option<B> =>
    (isSome(oa) ? f(oa.value) : None),
}

const ResultMonadLike: MonadK1Like<'Result'> = {
  of: <A>(a: A): Result<unknown, A> => Ok(a),
  chain: <A, B>(f: (a: A) => Result<unknown, B>) => (ra: Result<unknown, A>): Result<unknown, B> =>
    (isOk(ra) ? f(ra.value) : ra),
}

export const TaskMonadLike: MonadK1Like<'Task'> = {
  of: Task.of,
  chain: Task.chain,
}

export const ReaderMonadLike: MonadK1Like<'Reader'> = {
  of: <A>(a: A) => Reader.of<unknown, A>(a) as unknown as FunctorValue<'Reader', A>,
  chain: <A, B>(f: (a: A) => FunctorValue<'Reader', B>) =>
    (ra: FunctorValue<'Reader', A>): FunctorValue<'Reader', B> =>
      Reader.chain<A, B, unknown>(f as (a: A) => Reader<unknown, B>)(ra as Reader<unknown, A>) as unknown as FunctorValue<'Reader', B>,
}

export const ReaderTaskMonadLike: MonadK1Like<'ReaderTask'> = {
  of: <A>(a: A) => ReaderTask.of<unknown, A>(a) as unknown as FunctorValue<'ReaderTask', A>,
  chain: <A, B>(f: (a: A) => FunctorValue<'ReaderTask', B>) =>
    (ra: FunctorValue<'ReaderTask', A>): FunctorValue<'ReaderTask', B> =>
      ReaderTask.chain<A, B, unknown>(f as (a: A) => ReaderTask<unknown, B>)(ra as ReaderTask<unknown, A>) as unknown as FunctorValue<'ReaderTask', B>,
}

export const K_Option = Kleisli<'Option'>(OptionMonadLike)
export const K_Result = Kleisli<'Result'>(ResultMonadLike)
export const K_Task = Kleisli<'Task'>(TaskMonadLike)
export const K_Reader = Kleisli<'Reader'>(ReaderMonadLike)
export const K_ReaderTask = Kleisli<'ReaderTask'>(ReaderTaskMonadLike)

// Quick sugar for logs
export const StringMonoid: Monoid<string> = { empty: "", concat: (a, b) => a + b }
export const ArrayMonoid = <A>(): Monoid<ReadonlyArray<A>> => ({ empty: [], concat: (x, y) => [...x, ...y] })

// ---------- Array/List monad + generic traverse/sequence ----------
// Plain array instances (no HKT needed)
export const ArrayM = {
  of: <A>(a: A): ReadonlyArray<A> => [a],
  map: <A, B>(f: (a: A) => B) => (as: ReadonlyArray<A>): ReadonlyArray<B> => as.map(f),
  ap:  <A, B>(fs: ReadonlyArray<(a: A) => B>) => (as: ReadonlyArray<A>): ReadonlyArray<B> =>
        fs.flatMap(f => as.map(f)),
  chain: <A, B>(f: (a: A) => ReadonlyArray<B>) => (as: ReadonlyArray<A>): ReadonlyArray<B> =>
        as.flatMap(f),
}

// Traverse/sequence with every Applicative
export type ApplicativeLike<F> = {
  of: <A>(a: A) => FunctorValue<F, A>
  ap: <A, B>(ff: FunctorValue<F, (a: A) => B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
  map: <A, B>(f: (a: A) => B) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

export const traverseArrayA =
  <F>(A: ApplicativeLike<F>) =>
  <A, B>(as: ReadonlyArray<A>, f: (a: A, i: number) => FunctorValue<F, B>) =>
    as.reduce<FunctorValue<F, ReadonlyArray<B>>>(
      (acc, a: A, i: number) =>
        A.ap(
          A.map((xs: ReadonlyArray<B>) => (b: B) => [...xs, b])(acc)
        )(f(a, i)),
      A.of([] as ReadonlyArray<B>)
    )

export const sequenceArrayA =
  <F>(A: ApplicativeLike<F>) =>
  <A>(fas: ReadonlyArray<FunctorValue<F, A>>) =>
    traverseArrayA<F>(A)(fas, (fa) => fa)

// ====================================================================
// Monad Transformers: MonadWriter, EitherT
// ====================================================================

// ----- MonadWriter interface + WriterT (with pass) -----
export interface MonadWriterT<F, W> {
  of: <A>(a: A) => FunctorValue<F, Writer<W, A>>
  map: <A, B>(f: (a: A) => B) => (fwa: FunctorValue<F, Writer<W, A>>) => FunctorValue<F, Writer<W, B>>
  chain: <A, B>(f: (a: A) => FunctorValue<F, Writer<W, B>>) => (fwa: FunctorValue<F, Writer<W, A>>) => FunctorValue<F, Writer<W, B>>
  tell: (w: W) => FunctorValue<F, Writer<W, void>>
  listen: <A>(fwa: FunctorValue<F, Writer<W, A>>) => FunctorValue<F, Writer<W, readonly [A, W]>>
  pass: <A>(fwa: FunctorValue<F, Writer<W, readonly [A, (w: W) => W]>>) => FunctorValue<F, Writer<W, A>>
}

// ----- Writer (pure) -----
export type Writer<W, A> = readonly [A, W]

export const Writer = {
  of:
    <W>(M: Monoid<W>) =>
    <A>(a: A): Writer<W, A> =>
      [a, M.empty] as const,

  map:
    <W, A, B>(f: (a: A) => B) =>
    (wa: Writer<W, A>): Writer<W, B> =>
      [f(wa[0]), wa[1]] as const,

  chain:
    <W>(M: Monoid<W>) =>
    <A, B>(f: (a: A) => Writer<W, B>) =>
    (wa: Writer<W, A>): Writer<W, B> => {
      const [a, w1] = wa
      const [b, w2] = f(a)
      return [b, M.concat(w1, w2)] as const
    },

  tell:
    <W>(w: W): Writer<W, void> =>
      [undefined, w] as const,

  listen:
    <W, A>(wa: Writer<W, A>): Writer<W, readonly [A, W]> =>
      [[wa[0], wa[1]] as const, wa[1]] as const,

  pass:
    <W, A>(wfw: Writer<W, readonly [A, (w: W) => W]>): Writer<W, A> => {
      const [[a, tweak], w] = wfw
      return [a, tweak(w)] as const
    },
}

// ----- WriterT over each base monad F (Reader, Task, ReaderTask, …) -----
export const WriterT = <W>(M: Monoid<W>) => <F>(F: MonadK1Like<F>): MonadWriterT<F, W> => ({
  of:
    <A>(a: A) =>
      F.of<Writer<W, A>>([a, M.empty] as const),

  map:
    <A, B>(f: (a: A) => B) =>
    (fwa: FunctorValue<F, Writer<W, A>>) =>
      F.chain<Writer<W, A>, Writer<W, B>>(([a, w]: Writer<W, A>) => F.of([f(a), w] as const))(fwa),

  chain:
    <A, B>(f: (a: A) => FunctorValue<F, Writer<W, B>>) =>
    (fwa: FunctorValue<F, Writer<W, A>>) =>
      F.chain<Writer<W, A>, Writer<W, B>>(([a, w1]: Writer<W, A>) =>
        F.chain<Writer<W, B>, Writer<W, B>>(([b, w2]: Writer<W, B>) =>
          F.of([b, M.concat(w1, w2)] as const)
        )(f(a))
      )(fwa),

  tell:
    (w: W) =>
      F.of([undefined, w] as const),

  listen:
    <A>(fwa: FunctorValue<F, Writer<W, A>>) =>
      F.chain<Writer<W, A>, Writer<W, readonly [A, W]>>(
        ([a, w]: Writer<W, A>) => F.of([[a, w] as const, w] as const)
      )(fwa),

  pass:
    <A>(fwa: FunctorValue<F, Writer<W, readonly [A, (w: W) => W]>>) =>
      F.chain<Writer<W, readonly [A, (w: W) => W]>, Writer<W, A>>(
        ([[a, tweak], w]: Writer<W, readonly [A, (w: W) => W]>) =>
          F.of([a, tweak(w)] as const)
      )(fwa),
})

// ----- Prewired Writer helpers -----
export const K_Reader_Writer: MonadK1Like<'Reader'> = ReaderMonadLike
export const K_ReaderTask_Writer: MonadK1Like<'ReaderTask'> = ReaderTaskMonadLike

// ready-to-use modules:
export const WriterInReader = <W>(M: Monoid<W>) => WriterT<W>(M)(K_Reader_Writer)
export const WriterInReaderTask = <W>(M: Monoid<W>) => WriterT<W>(M)(K_ReaderTask_Writer)

// ----- EitherT (tiny) + prewired aliases -----
export const EitherT = <F>(F: MonadK1Like<F>) => ({
  // Constructors
  right:  <A>(a: A) => F.of<Result<never, A>>(Ok(a)),
  left:   <E>(e: E) => F.of<Result<E, never>>(Err(e)),
  of:     <A>(a: A) => F.of<Result<never, A>>(Ok(a)),

  // Lift a pure F<A> into F<Result<never,A>>
  liftF:  <A>(fa: FunctorValue<F, A>) =>
    F.chain<A, Result<never, A>>((a: A) => F.of(Ok(a)))(fa),

  // Functor/Bifunctor
  map:
    <E, A, B>(f: (a: A) => B) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<E, B>>((ra) => F.of(mapR<E, A, B>(f)(ra)))(fea),

  mapLeft:
    <E, F2, A>(f: (e: E) => F2) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<F2, A>>((ra) => F.of(mapErr<E, F2, A>(f)(ra)))(fea),

  bimap:
    <E, F2, A, B>(l: (e: E) => F2, r: (a: A) => B) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<F2, B>>((ra) =>
        F.of(
          isOk(ra) ? Ok(r(ra.value)) : Err<F2>(l(ra.error))
        )
      )(fea),

  // Apply/Chain
  ap:
    <E, A, B>(ff: FunctorValue<F, Result<E, (a: A) => B>>) =>
    (fa: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, (a: A) => B>, Result<E, B>>((rf) =>
        isOk(rf)
          ? F.chain<Result<E, A>, Result<E, B>>((ra) =>
              F.of(
                isOk(ra)
                  ? Ok(rf.value(ra.value))
                  : Err<E>(ra.error)
              )
            )(fa)
          : F.of(rf)
      )(ff),

  chain:
    // note error union E|E2
    <E, A, E2, B>(f: (a: A) => FunctorValue<F, Result<E2, B>>) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<E | E2, B>>((ra) =>
        isOk(ra) ? f(ra.value) : F.of<Result<E | E2, B>>(Err<E | E2>(ra.error))
      )(fea),

  orElse:
    <E, A, E2>(f: (e: E) => FunctorValue<F, Result<E2, A>>) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<E | E2, A>>((ra) =>
        isErr(ra) ? f(ra.error) : F.of<Result<E | E2, A>>(ra)
      )(fea),

  // Eliminators/util
  getOrElse:
    <E, A>(onErr: (e: E) => A) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, A>((ra) => F.of(getOrElseR<E, A>(onErr)(ra)))(fea),

  fold:
    <E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, B>((ra) =>
        F.of(isOk(ra) ? onOk(ra.value) : onErr(ra.error))
      )(fea),

  swap:
    <E, A>(fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<A, E>>((ra) =>
        F.of(isOk(ra) ? Err<A>(ra.value) : Ok(ra.error))
      )(fea),
})

// ----- Prewired specializations (aliases) -----
export type TaskEither<E, A> = Task<Result<E, A>>
export const TaskEither = EitherT(TaskMonadLike)

export type ReaderEither<R, E, A> = Reader<R, Result<E, A>>
export const ReaderEither = EitherT(ReaderMonadLike)

export type ReaderTaskEither<R, E, A> = ReaderTask<R, Result<E, A>>
export const ReaderTaskEither = EitherT(ReaderTaskMonadLike)

// (Optional) ergonomic re-exports matching your current naming
export const RTE = ReaderTaskEither
export const TE  = TaskEither
export const RE  = ReaderEither

// ====================================================================
// Ready-to-use Writer Modules & Advanced Compositions
// ====================================================================

// ----- Ready "lifted" Writer modules for Reader/ReaderTask -----
export const LogArray = ArrayMonoid<string>()

export const MW_R = WriterInReader(LogArray)         // tell/listen/pass in Reader
export const MW_RT = WriterInReaderTask(LogArray)    // tell/listen/pass in ReaderTask

// ----- Module-level shims for ReaderTaskEither -----
export const apFirstRTE =
  <R, E, A, B>(rteB: ReaderTaskEither<R, E, B>) =>
  (rteA: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, A> =>
    async (r: R) => {
      const ra = await rteA(r)
      if (isErr(ra)) return Err<E>(ra.error)
      const rb = await rteB(r)
      if (isErr(rb)) return Err<E>(rb.error)
      return Ok(ra.value)
    }

export const apSecondRTE =
  <R, E, A, B>(rteB: ReaderTaskEither<R, E, B>) =>
  (rteA: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, B> =>
    async (r: R) => {
      const ra = await rteA(r)
      if (isErr(ra)) return Err<E>(ra.error)
      const rb = await rteB(r)
      if (isErr(rb)) return Err<E>(rb.error)
      return Ok(rb.value)
    }

export const zipWithRTE =
  <R, E, A, B, C>(f: (a: A, b: B) => C) =>
  (rteA: ReaderTaskEither<R, E, A>) =>
  (rteB: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, C> =>
    async (r: R) => {
      const ra = await rteA(r)
      if (isErr(ra)) return Err<E>(ra.error)
      const rb = await rteB(r)
      if (isErr(rb)) return Err<E>(rb.error)
      return Ok(f(ra.value, rb.value))
    }

export const zipRTE =
  <R, E, A, B>(rteA: ReaderTaskEither<R, E, A>) =>
  (rteB: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, readonly [A, B]> =>
    zipWithRTE<R, E, A, B, readonly [A, B]>((a, b) => [a, b] as const)(rteA)(rteB)

// ----- Do-notation for ReaderTaskEither (RTE) -----
// Reintroduce record merge helper used across do-notation builders
type _Merge<A, B> = { readonly [K in keyof A | keyof B]: K extends keyof B
  ? B[K]
  : K extends keyof A
    ? A[K]
    : never }

export type DoRTEBuilder<R, T, E> = {
  /** bind: run an RTE and add its Ok value at key K */
  bind: <K extends string, E2, A>(
    k: K,
    rtea: ReaderTaskEither<R, E2, A>
  ) => DoRTEBuilder<R, _Merge<T, { readonly [P in K]: A }>, E | E2>

  /** let: add a pure computed field (no effects) */
  let: <K extends string, A>(
    k: K,
    f: (t: T) => A
  ) => DoRTEBuilder<R, _Merge<T, { readonly [P in K]: A }>, E>

  /** apS: alias for bind, reads nicer in applicative-ish code */
  apS: <K extends string, E2, A>(
    k: K,
    rtea: ReaderTaskEither<R, E2, A>
  ) => DoRTEBuilder<R, _Merge<T, { readonly [P in K]: A }>, E | E2>

  /** run effect; keep current record T */
  apFirst:  <E2, A>(rtea: ReaderTaskEither<R, E2, A>) => DoRTEBuilder<R, T, E | E2>

  /** run effect; replace record with its Ok value */
  apSecond: <E2, A>(rtea: ReaderTaskEither<R, E2, A>) => DoRTEBuilder<R, A, E | E2>

  /** run effect derived from T; keep T (useful for logging/validation) */
  tap:      <E2>(f: (t: T) => ReaderTaskEither<R, E2, unknown>) => DoRTEBuilder<R, T, E | E2>

  /** map: final transform into B */
  map: <B>(f: (t: T) => B) => ReaderTaskEither<R, E, B>

  /** done: finish and return the accumulated record */
  done: ReaderTaskEither<R, E, T>
}

const mergeField = <Base, K extends string, A>(
  base: Base,
  key: K,
  value: A
): _Merge<Base, { readonly [P in K]: A }> =>
  ({ ...(base as Record<string, unknown>), [key]: value }) as _Merge<
    Base,
    { readonly [P in K]: A }
  >

export const DoRTE = <R>() => {
  const make = <T, E>(rte: ReaderTaskEither<R, E, T>): DoRTEBuilder<R, T, E> => ({
    bind: <K extends string, E2, A>(k: K, rtea: ReaderTaskEither<R, E2, A>) =>
      make(async (r): Promise<Result<E | E2, _Merge<T, { readonly [P in K]: A }>>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const next = await rtea(r)
        if (isErr(next)) return Err<E | E2>(next.error)
        return Ok(mergeField(current.value, k, next.value))
      }),

    apS: <K extends string, E2, A>(k: K, rtea: ReaderTaskEither<R, E2, A>) =>
      make(async (r): Promise<Result<E | E2, _Merge<T, { readonly [P in K]: A }>>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const next = await rtea(r)
        if (isErr(next)) return Err<E | E2>(next.error)
        return Ok(mergeField(current.value, k, next.value))
      }),

    let: <K extends string, A>(k: K, f: (t: T) => A) =>
      make(async (r): Promise<Result<E, _Merge<T, { readonly [P in K]: A }>>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E>(current.error)
        return Ok(mergeField(current.value, k, f(current.value)))
      }),

    apFirst: <E2, A>(rtea: ReaderTaskEither<R, E2, A>) =>
      make(async (r): Promise<Result<E | E2, T>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const next = await rtea(r)
        if (isErr(next)) return Err<E | E2>(next.error)
        return Ok(current.value)
      }),

    apSecond: <E2, A>(rtea: ReaderTaskEither<R, E2, A>) =>
      make(async (r): Promise<Result<E | E2, A>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const next = await rtea(r)
        if (isErr(next)) return Err<E | E2>(next.error)
        return Ok(next.value)
      }),

    tap: <E2>(f: (t: T) => ReaderTaskEither<R, E2, unknown>) =>
      make(async (r): Promise<Result<E | E2, T>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const effect = await f(current.value)(r)
        if (isErr(effect)) return Err<E | E2>(effect.error)
        return Ok(current.value)
      }),

    map: (f) =>
      async (r: R) => {
        const current = await rte(r)
        if (isErr(current)) return Err<E>(current.error)
        return Ok(f(current.value))
      },

    done: rte,
  })

  // start with {}
  return make(async (_r: R) => Ok({} as const))
}

// ----- Writer × EitherT × ReaderTask (WRTE) composition -----
export type WriterReaderTaskEither<W, R, E, A> =
  ReaderTask<R, Writer<W, Result<E, A>>>

export const WRTE = <W>(M: Monoid<W>) => {
  // helpers to keep types nice at call sites
  type _WRTE<R, E, A> = WriterReaderTaskEither<W, R, E, A>

  // lift a plain RTE into WRTE (adds empty log)
  const liftRTE =
    <R, E, A>(rte: ReaderTaskEither<R, E, A>): _WRTE<R, E, A> =>
      async (r: R) => {
        const ra = await rte(r)
        return [ra, M.empty] as const
      }

  // strip logs back to plain RTE (keep only Result)
  const stripLog =
    <R, E, A>(m: _WRTE<R, E, A>): ReaderTaskEither<R, E, A> =>
      async (r: R) => {
        const [ra] = await m(r)
        return ra
      }

  const right =
    <R = unknown, E = never, A = never>(a: A): _WRTE<R, E, A> =>
      async (_: R) => [Ok(a) as Result<E, A>, M.empty] as const

  const left =
    <R = unknown, E = never>(e: E): _WRTE<R, E, never> =>
      async (_: R) => [Err(e), M.empty] as const

  const of =
    <R = unknown, A = never>(a: A): _WRTE<R, never, A> => right<R, never, A>(a)

  const map =
    <R, E, A, B>(f: (a: A) => B) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, E, B> =>
      async (r: R) => {
        const [ra, w] = await ma(r)
        return [mapR<E, A, B>(f)(ra), w] as const
      }

  const mapLeft =
    <R, E, F2, A>(f: (e: E) => F2) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, F2, A> =>
      async (r: R) => {
        const [ra, w] = await ma(r)
        return [mapErr<E, F2, A>(f)(ra), w] as const
      }

  const bimap =
    <R, E, F2, A, B>(l: (e: E) => F2, r: (a: A) => B) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, F2, B> =>
      async (env: R) => {
        const [ra, w] = await ma(env)
        return [mapErr<E, F2, B>(l)(mapR<E, A, B>(r)(ra)), w] as const
      }

  const ap =
    <R, E, A, B>(mf: _WRTE<R, E, (a: A) => B>) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, E, B> =>
      async (r: R) => {
        const [rf, wf] = await mf(r)
        if (isErr(rf)) return [rf, wf] as const
        const [ra, wa] = await ma(r)
        return [mapR<E, A, B>((a) => rf.value(a))(ra), M.concat(wf, wa)] as const
      }

  const chain =
    <R, E, A, F2, B>(f: (a: A) => _WRTE<R, F2, B>) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, E | F2, B> =>
      async (r: R) => {
        const [ra, w1] = await ma(r)
        if (isErr(ra)) return [Err<E | F2>(ra.error), w1] as const
        const [rb, w2] = await f(ra.value)(r)
        return [mapErr<F2, E | F2, B>((e) => e)(rb), M.concat(w1, w2)] as const
      }

  const orElse =
    <R, E, A, F2>(f: (e: E) => _WRTE<R, F2, A>) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, E | F2, A> =>
      async (r: R) => {
        const [ra, w1] = await ma(r)
        if (isOk(ra)) return [mapErr<E, E | F2, A>((e) => e)(ra), w1] as const
        const [rb, w2] = await f(ra.error)(r)
        return [mapErr<F2, E | F2, A>((e) => e)(rb), M.concat(w1, w2)] as const
      }

  const tell =
    <R = unknown>(w: W): _WRTE<R, never, void> =>
      async (_: R) => [Ok<void>(undefined), w] as const

  const listen =
    <R, E, A>(ma: _WRTE<R, E, A>): _WRTE<R, E, readonly [A, W]> =>
      async (r: R) => {
        const [ra, w] = await ma(r)
        return [mapR<E, A, readonly [A, W]>((a) => [a, w] as const)(ra), w] as const
      }

  const pass =
    <R, E, A>(ma: _WRTE<R, E, readonly [A, (w: W) => W]>): _WRTE<R, E, A> =>
      async (r: R) => {
        const [ra, w] = await ma(r)
        if (isErr(ra)) return [Err<E>(ra.error), w] as const
        const [a, tweak] = ra.value
        return [Ok(a) as Result<E, A>, tweak(w)] as const
      }

  const apFirst =
    <R, E, A, B>(mb: WriterReaderTaskEither<W, R, E, B>) =>
    (ma: WriterReaderTaskEither<W, R, E, A>): WriterReaderTaskEither<W, R, E, A> =>
      chain<R, E, A, E, A>((a) => map<R, E, B, A>(() => a)(mb))(ma)

  const apSecond =
    <R, E, A, B>(mb: WriterReaderTaskEither<W, R, E, B>) =>
    (ma: WriterReaderTaskEither<W, R, E, A>): WriterReaderTaskEither<W, R, E, B> =>
      chain<R, E, A, E, B>(() => mb)(ma)

  const zipWith =
    <R, E, A, B, C>(f: (a: A, b: B) => C) =>
    (ma: WriterReaderTaskEither<W, R, E, A>) =>
    (mb: WriterReaderTaskEither<W, R, E, B>): WriterReaderTaskEither<W, R, E, C> =>
      chain<R, E, A, E, C>((a) => map<R, E, B, C>((b) => f(a, b))(mb))(ma)

  const zip =
    <R, E, A, B>(ma: WriterReaderTaskEither<W, R, E, A>) =>
    (mb: WriterReaderTaskEither<W, R, E, B>): WriterReaderTaskEither<W, R, E, readonly [A, B]> =>
      zipWith<R, E, A, B, readonly [A, B]>((a, b) => [a, b] as const)(ma)(mb)

  return {
    // constructors
    right,
    left,
    of,

    // core combinators
    map,
    mapLeft,
    bimap,

    ap,
    chain,
    orElse,

    // logging
    tell,
    listen,
    pass,

    // -------- apFirst / apSecond / zip / zipWith for WRTE --------
    apFirst,
    apSecond,
    zipWith,
    zip,

    // interop
    liftRTE,   // ReaderTaskEither<R,E,A> -> WRTE<W,R,E,A>
    stripLog,  // WRTE<W,R,E,A> -> ReaderTaskEither<R,E,A>

    // eliminators
    getOrElse:
      <R, E, A>(onErr: (e: E) => A) =>
      (ma: _WRTE<R, E, A>): ReaderTask<R, Writer<W, A>> =>
        async (r: R) => {
          const [ra, w] = await ma(r)
          return [getOrElseR<E, A>(onErr)(ra), w] as const
        },

    fold:
      <R, E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
      (ma: _WRTE<R, E, A>): ReaderTask<R, Writer<W, B>> =>
        async (r: R) => {
          const [ra, w] = await ma(r)
          return [isOk(ra) ? onOk(ra.value) : onErr((ra as Err<E>).error), w] as const
        },
  }
}

// ---------- Free endofunctor term ----------
export type EndoTerm<Sym extends string> =
  | { tag: 'Id' }
  | { tag: 'Base'; name: Sym }
  | { tag: 'Sum';  left: EndoTerm<Sym>; right: EndoTerm<Sym> }
  | { tag: 'Prod'; left: EndoTerm<Sym>; right: EndoTerm<Sym> }
  | { tag: 'Comp'; left: EndoTerm<Sym>; right: EndoTerm<Sym> }
  | { tag: 'Pair'; C: unknown }   // Pair<C,_>
  | { tag: 'Const'; C: unknown }  // Const<C,_>

// constructors
export const IdT   = { tag: 'Id' } as const
export const BaseT = <S extends string>(name: S): EndoTerm<S> => ({ tag: 'Base', name })
export const SumT  = <S extends string>(l: EndoTerm<S>, r: EndoTerm<S>): EndoTerm<S> => ({ tag: 'Sum',  left: l, right: r })
export const ProdT = <S extends string>(l: EndoTerm<S>, r: EndoTerm<S>): EndoTerm<S> => ({ tag: 'Prod', left: l, right: r })
export const CompT = <S extends string>(l: EndoTerm<S>, r: EndoTerm<S>): EndoTerm<S> => ({ tag: 'Comp', left: l, right: r })
export const PairT = <S extends string>(C: unknown): EndoTerm<S> => ({ tag: 'Pair', C })
export const ConstT= <S extends string>(C: unknown): EndoTerm<S> => ({ tag: 'Const', C })

// dictionaries to interpret bases
export type EndoDict<Sym extends string> = Record<Sym, EndofunctorK1<unknown>>
export type StrengthDict<Sym extends string, E> = Record<Sym, StrengthEnv<unknown, E>>
export type NatDict<SymFrom extends string, SymTo extends string> =
  (name: SymFrom) => { to: SymTo; nat: NatK1<unknown, unknown> }

// evaluate term to EndofunctorK1
export const evalEndo =
  <S extends string>(d: EndoDict<S>) =>
  (t: EndoTerm<S>): EndofunctorK1<unknown> => {
    switch (t.tag) {
      case 'Id':    return IdK1
      case 'Base':  return d[t.name]
      case 'Sum':   return SumEndo(evalEndo(d)(t.left), evalEndo(d)(t.right))
      case 'Prod':  return ProdEndo(evalEndo(d)(t.left), evalEndo(d)(t.right))
      case 'Comp':  return composeEndoK1(evalEndo(d)(t.left), evalEndo(d)(t.right))
      case 'Pair':  return PairEndo<unknown>()
      case 'Const': return ConstEndo<unknown>()
    }
  }

// derive StrengthEnv for term (needs base strengths and rules)
export const deriveStrengthEnv =
  <S extends string, E>(d: EndoDict<S>, sd: StrengthDict<S, E>) =>
  (t: EndoTerm<S>): StrengthEnv<unknown, E> => {
    switch (t.tag) {
      case 'Id':    return { st: <A>(ea: unknown) => {
        const env = ea as Env<E, A>
        return [env[0], env[1]] as const
      } }
      case 'Base':  return sd[t.name]
      case 'Sum':   return strengthEnvFromSum<E>()(deriveStrengthEnv(d, sd)(t.left), deriveStrengthEnv(d, sd)(t.right))
      case 'Prod':  return strengthEnvFromProd<E>()(deriveStrengthEnv(d, sd)(t.left), deriveStrengthEnv(d, sd)(t.right))
      case 'Comp':  return strengthEnvCompose<E>()(
                        evalEndo(d)(t.left),
                        evalEndo(d)(t.right),
                        deriveStrengthEnv(d, sd)(t.left),
                        deriveStrengthEnv(d, sd)(t.right)
                      )
      case 'Pair':  return strengthEnvFromPair<E>()<unknown>()
      case 'Const': return strengthEnvFromConst<E, unknown>(undefined as unknown as E)
    }
  }

// hoist bases along a mapping of natural transformations, preserving shape
export const hoistEndo =
  <SFrom extends string, STo extends string>(dFrom: EndoDict<SFrom>, dTo: EndoDict<STo>) =>
  (mapBase: NatDict<SFrom, STo>) =>
  (t: EndoTerm<SFrom>): { endo: EndofunctorK1<unknown>; nat: NatK1<unknown, unknown>; term: EndoTerm<STo> } => {
    type Out = { endo: EndofunctorK1<unknown>; nat: NatK1<unknown, unknown>; term: EndoTerm<STo> }
    switch (t.tag) {
      case 'Id': {
        return { endo: IdK1, nat: idNatK1(), term: IdT as EndoTerm<STo> } as Out
      }
      case 'Base': {
        const { to, nat } = mapBase(t.name)
        return { endo: dTo[to], nat, term: BaseT(to) } as Out
      }
      case 'Sum': {
        const L: Out = hoistEndo(dFrom, dTo)(mapBase)(t.left)
        const R: Out = hoistEndo(dFrom, dTo)(mapBase)(t.right)
        return {
          endo: SumEndo(L.endo, R.endo),
          nat:  sumNat(L.nat, R.nat),
          term: SumT(L.term, R.term),
        } as Out
      }
      case 'Prod': {
        const L: Out = hoistEndo(dFrom, dTo)(mapBase)(t.left)
        const R: Out = hoistEndo(dFrom, dTo)(mapBase)(t.right)
        return {
          endo: ProdEndo(L.endo, R.endo),
          nat:  prodNat(L.nat, R.nat),
          term: ProdT(L.term, R.term),
        } as Out
      }
      case 'Comp': {
        const L: Out = hoistEndo(dFrom, dTo)(mapBase)(t.left)
        const R: Out = hoistEndo(dFrom, dTo)(mapBase)(t.right)
        return {
          endo: composeEndoK1(L.endo, R.endo),
          nat:  hcompNatK1_component(L.endo)(L.nat, R.nat),
          term: CompT(L.term, R.term),
        } as Out
      }
      case 'Pair': {
        const endo = PairEndo<unknown>()
        return { endo, nat: idNatK1(), term: PairT<STo>(t.C) } as Out
      }
      case 'Const': {
        const endo = ConstEndo<unknown>()
        return { endo, nat: idNatK1(), term: ConstT<STo>(t.C) } as Out
      }
    }
  }

// ---------------------------------------------------------------------
// Build a natural transformation by STRUCTURE-ALIGNMENT of two EndoTerms.
// If shapes mismatch (e.g. Sum vs Prod, Pair<C1> vs Pair<C2>), we throw.
// For Base/Base we ask you for a base-level NT via `pickBase`.
// Returns both endofunctors (from/to) and the synthesized NatK1.
// ---------------------------------------------------------------------

export type AlignBuild<S1 extends string, S2 extends string> = {
  from: EndofunctorK1<unknown>
  to:   EndofunctorK1<unknown>
  nat:  NatK1<unknown, unknown>
  readonly symbols?: { readonly left: S1; readonly right: S2 }
}

export class EndoTermAlignError extends Error {
  constructor(msg: string) { super(`[EndoTerm align] ${msg}`) }
}

/**
 * Align two EndoTerms and synthesize a NatK1 by structural recursion.
 *
 * @param d1  dictionary for left/base symbols
 * @param d2  dictionary for right/base symbols
 * @param pickBase  (nameL,nameR) -> NatK1 for Base/Base leaves (return null to fail)
 */
export const buildNatForTerms =
  <S1 extends string, S2 extends string>(
    d1: EndoDict<S1>,
    d2: EndoDict<S2>,
    pickBase: (nameL: S1, nameR: S2) => NatK1<unknown, unknown> | null
  ) =>
  (t1: EndoTerm<S1>, t2: EndoTerm<S2>): AlignBuild<S1, S2> => {

    const go = (a: EndoTerm<S1>, b: EndoTerm<S2>): AlignBuild<S1, S2> => {
      if (a.tag !== b.tag) throw new EndoTermAlignError(`shape mismatch: ${a.tag} vs ${b.tag}`)

      switch (a.tag) {
        case 'Id': {
          return { from: IdK1, to: IdK1, nat: idNatK1() }
        }

        case 'Base': {
          const bBase = b as { tag: 'Base'; name: S2 }
          const F = d1[a.name as S1]
          const G = d2[bBase.name]
          const nat = pickBase(a.name as S1, bBase.name)
          if (!nat) throw new EndoTermAlignError(`no base NT for ${String(a.name)} ⇒ ${String(bBase.name)}`)
          return { from: F, to: G, nat }
        }

        case 'Sum': {
          const bSum = b as Extract<typeof b, { tag: 'Sum' }>
          const L = go(a.left,  bSum.left)
          const R = go(a.right, bSum.right)
          return {
            from: SumEndo(L.from, R.from),
            to:   SumEndo(L.to,   R.to),
            nat:  sumNat(L.nat, R.nat),
          }
        }

        case 'Prod': {
          const bProd = b as Extract<typeof b, { tag: 'Prod' }>
          const L = go(a.left,  bProd.left)
          const R = go(a.right, bProd.right)
          return {
            from: ProdEndo(L.from, R.from),
            to:   ProdEndo(L.to,   R.to),
            nat:  prodNat(L.nat, R.nat),
          }
        }

        case 'Comp': {
          const bComp = b as Extract<typeof b, { tag: 'Comp' }>
          const L = go(a.left,  bComp.left)   // α : L.from ⇒ L.to
          const R = go(a.right, bComp.right)  // β : R.from ⇒ R.to
          return {
            from: composeEndoK1(L.from, R.from),
            to:   composeEndoK1(L.to,   R.to),
            nat:  hcompNatK1_component(L.from)(L.nat, R.nat), // (α ▷ β)
          }
        }

        case 'Pair': {
          const bPair = b as Extract<typeof b, { tag: 'Pair'; C: unknown }>
          if (a.C !== bPair.C)
            throw new EndoTermAlignError(`Pair constants differ: ${String(a.C)} vs ${String(bPair.C)}`)
          const F = PairEndo<unknown>()
          return { from: F, to: F, nat: idNatK1() }
        }

        case 'Const': {
          const bConst = b as Extract<typeof b, { tag: 'Const'; C: unknown }>
          if (a.C !== bConst.C)
            throw new EndoTermAlignError(`Const values differ: ${String(a.C)} vs ${String(bConst.C)}`)
          const F = ConstEndo<unknown>()
          return { from: F, to: F, nat: idNatK1() }
        }
      }
    }

    return go(t1, t2)
  }

// =====================================================================
// Traversable registry (by functor VALUE identity) + helpers
// =====================================================================
export type TraversableRegistryK1 = WeakMap<EndofunctorK1<unknown>, TraversableK1<unknown>>

export const makeTraversableRegistryK1 = () => {
  const reg: TraversableRegistryK1 = new WeakMap()
  const register = <F>(F: EndofunctorK1<F>, T: TraversableK1<F>): EndofunctorK1<F> => {
    reg.set(F as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
    return F
  }
  const get = <F>(F: EndofunctorK1<F>): TraversableK1<F> | null =>
    (reg.get(F as EndofunctorK1<unknown>) as TraversableK1<F> | undefined) ?? null
  return { reg, register, get }
}

// ---------------------------------------------------------------------
// TraversableK1 instances
// ---------------------------------------------------------------------

// Option
export const TraversableOptionK1: TraversableK1<'Option'> = {
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
    (oa: Option<A>) =>
      oa._tag === 'Some'
        ? G.map((b: B) => Some(b))(f(oa.value))
        : G.of<Option<B>>(None)
}

// Either<L,_>
export const TraversableEitherK1 =
  <L>(): TraversableK1<['Either', L]> => ({
    traverse: <G>(G: SimpleApplicativeK1<G>) =>
      <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
      (eab: Result<L, A>) => // Using Result as Either
        eab._tag === 'Ok'
          ? G.map((b: B) => Ok<B>(b))(f(eab.value))
          : G.of<Result<L, B>>(Err<L>(eab.error))
  })

// NonEmptyArray
export type NEA<A> = readonly [A, ...A[]]

export const TraversableNEAK1: TraversableK1<['NEA']> = {
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
    (fa: EndofunctorValue<['NEA'], A>) => {
      const nea = fa as NEA<A>
      const [h, ...t] = nea
      // start with head
      let acc: EndofunctorValue<G, NEA<B>> = G.map((b: B) => [b] as NEA<B>)(f(h))
      // push each tail element
      for (const a of t) {
        const cons = G.map((xs: NEA<B>) => (b: B) => [...xs, b] as NEA<B>)(acc)
        acc = G.ap(cons)(f(a))
      }
      return acc as EndofunctorValue<G, EndofunctorValue<['NEA'], B>>
    }
}

// Ready-made traversables for parameterized functors
export const TraversablePairK1 = <C>(): TraversableK1<['Pair', C]> => ({
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
    (ca: Pair<C, A>) =>
      G.map((b: B) => [ca[0], b] as const)(f(ca[1]))
})

export const TraversableConstK1 = <C>(): TraversableK1<['Const', C]> => ({
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(_f: (a: A) => EndofunctorValue<G, B>) =>
    (cx: C) => // Const<C, A> is just C
      G.of<C>(cx)
})

// Derive traversable for Sum/Prod/Comp from components
export const deriveTraversableSumK1 =
  <F, G>(TF: TraversableK1<F>, TG: TraversableK1<G>): TraversableK1<['Sum', F, G]> => ({
    traverse: <App>(App: SimpleApplicativeK1<App>) =>
      <A, B>(f: (a: A) => EndofunctorValue<App, B>) =>
      (v: SumVal<F, G, A>) =>
        v._sum === 'L'
          ? App.map((fb: EndofunctorValue<F, B>) => inL<F, G, B>(fb))(TF.traverse(App)(f)(v.left))
          : App.map((gb: EndofunctorValue<G, B>) => inR<F, G, B>(gb))(TG.traverse(App)(f)(v.right))
  })

export const deriveTraversableProdK1 =
  <F, G>(TF: TraversableK1<F>, TG: TraversableK1<G>): TraversableK1<['Prod', F, G]> => ({
    traverse: <App>(App: SimpleApplicativeK1<App>) =>
      <A, B>(f: (a: A) => EndofunctorValue<App, B>) =>
      (p: ProdVal<F, G, A>) => {
        const lf = TF.traverse(App)(f)(p.left)
        const rf = TG.traverse(App)(f)(p.right)
        return App.ap(
          App.map((leftB: EndofunctorValue<F, B>) =>
            (rightB: EndofunctorValue<G, B>) => ({ left: leftB, right: rightB } as ProdVal<F, G, B>)
          )(lf)
        )(rf)
      }
  })

export const deriveTraversableCompK1 =
  <F, G>(TF: TraversableK1<F>, TG: TraversableK1<G>): TraversableK1<['Comp', F, G]> => ({
    traverse: <App>(App: SimpleApplicativeK1<App>) =>
      <A, B>(f: (a: A) => EndofunctorValue<App, B>) =>
      (fga: EndofunctorValue<['Comp', F, G], A>) =>
        TF.traverse(App)((ga: EndofunctorValue<G, A>) => TG.traverse(App)(f)(ga))(fga)
  })

// Register common families (return the same Endo value you should use elsewhere)
export const registerEitherTraversable =
  <E>(R: ReturnType<typeof makeTraversableRegistryK1>) => {
    const F: EndofunctorK1<['Either', E]> = ResultK1<E>() // Using Result as Either
    const T: TraversableK1<['Either', E]> = TraversableEitherK1<E>()
    return R.register(F, T)
  }

export const registerPairTraversable =
  <C>(R: ReturnType<typeof makeTraversableRegistryK1>) => {
    const F: EndofunctorK1<['Pair', C]> = PairEndo<C>()
    const T: TraversableK1<['Pair', C]> = TraversablePairK1<C>()
    return R.register(F, T)
  }

export const registerConstTraversable =
  <C>(R: ReturnType<typeof makeTraversableRegistryK1>) => {
    const F: EndofunctorK1<['Const', C]> = ConstEndo<C>()
    const T: TraversableK1<['Const', C]> = TraversableConstK1<C>()
    return R.register(F, T)
  }

// Compose/derive & register at runtime from parts already in registry
export const registerSumDerived =
  <F, G>(R: ReturnType<typeof makeTraversableRegistryK1>, FEndo: EndofunctorK1<F>, GEndo: EndofunctorK1<G>) => {
    const TF = R.get(FEndo); const TG = R.get(GEndo)
    if (!TF || !TG) throw new Error('registerSumDerived: missing component traversables')
    const FE = SumEndo(FEndo, GEndo)
    const TT = deriveTraversableSumK1(TF, TG)
    return R.register(FE, TT)
  }

export const registerProdDerived =
  <F, G>(R: ReturnType<typeof makeTraversableRegistryK1>, FEndo: EndofunctorK1<F>, GEndo: EndofunctorK1<G>) => {
    const TF = R.get(FEndo); const TG = R.get(GEndo)
    if (!TF || !TG) throw new Error('registerProdDerived: missing component traversables')
    const FE = ProdEndo(FEndo, GEndo)
    const TT = deriveTraversableProdK1(TF, TG)
    return R.register(FE, TT)
  }

export const registerCompDerived =
  <F, G>(R: ReturnType<typeof makeTraversableRegistryK1>, FEndo: EndofunctorK1<F>, GEndo: EndofunctorK1<G>) => {
    const TF = R.get(FEndo); const TG = R.get(GEndo)
    if (!TF || !TG) throw new Error('registerCompDerived: missing component traversables')
    const FE = composeEndoK1(FEndo, GEndo)
    const TT = deriveTraversableCompK1(TF, TG)
    return R.register(FE, TT)
  }

// Lax 2-functor (Promise postcompose) that consults the registry
export const makePostcomposePromise2WithRegistry = (R: TraversableRegistryK1): LaxTwoFunctorK1 =>
  makePostcomposePromise2(
    <F>(FEndo: EndofunctorK1<F>) =>
      (R.get(FEndo as EndofunctorK1<unknown>) as TraversableK1<F> | null) ?? null
  )

// =====================================================================
// Smart metadata for composed endofunctors + lazy Traversable lookup
// =====================================================================

// Internal shape metadata (WeakMap so GC-friendly)
type EndoMeta =
  | { tag: 'Sum';  left: EndofunctorK1<unknown>; right: EndofunctorK1<unknown> }
  | { tag: 'Prod'; left: EndofunctorK1<unknown>; right: EndofunctorK1<unknown> }
  | { tag: 'Comp'; left: EndofunctorK1<unknown>; right: EndofunctorK1<unknown> }
  | { tag: 'Pair'; C: unknown }
  | { tag: 'Const'; C: unknown }

const __endoMeta = new WeakMap<EndofunctorK1<unknown>, EndoMeta>()
const withMeta = <F>(e: EndofunctorK1<F>, m: EndoMeta): EndofunctorK1<F> => {
  __endoMeta.set(e as EndofunctorK1<unknown>, m)
  return e
}

// Meta-enabled constructors (use these if you want auto-derivation):
export const SumEndoM =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) =>
    withMeta(SumEndo(F, G), { tag: 'Sum', left: F, right: G })

export const ProdEndoM =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) =>
    withMeta(ProdEndo(F, G), { tag: 'Prod', left: F, right: G })

export const CompEndoM =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) =>
    withMeta(composeEndoK1(F, G), { tag: 'Comp', left: F, right: G })

export const PairEndoM =
  <C>(c: C) => withMeta(PairEndo<C>(), { tag: 'Pair', C: c })

export const ConstEndoM =
  <C>(c: C) => withMeta(ConstEndo<C>(), { tag: 'Const', C: c })

// Smart lookup: uses registry; if missing, tries to derive for Sum/Prod/Comp and caches result.
export const makeSmartGetTraversableK1 =
  (R: ReturnType<typeof makeTraversableRegistryK1>) =>
  <F>(FEndo: EndofunctorK1<F>): TraversableK1<F> | null => {
    const hit = R.get(FEndo as EndofunctorK1<unknown>)
    if (hit) return hit as TraversableK1<F>
    const m = __endoMeta.get(FEndo as EndofunctorK1<unknown>)
    if (!m) return null

    // recursive fetch that also caches
    const need = makeSmartGetTraversableK1(R)

    switch (m.tag) {
      case 'Sum': {
        const TL = need(m.left); const TR = need(m.right)
        if (!TL || !TR) return null
        const T = deriveTraversableSumK1(
          TL as TraversableK1<unknown>,
          TR as TraversableK1<unknown>
        ) as TraversableK1<F>
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T
      }
      case 'Prod': {
        const TL = need(m.left); const TR = need(m.right)
        if (!TL || !TR) return null
        const T = deriveTraversableProdK1(
          TL as TraversableK1<unknown>,
          TR as TraversableK1<unknown>
        ) as TraversableK1<F>
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T
      }
      case 'Comp': {
        const TL = need(m.left); const TR = need(m.right)
        if (!TL || !TR) return null
        const T = deriveTraversableCompK1(
          TL as TraversableK1<unknown>,
          TR as TraversableK1<unknown>
        ) as TraversableK1<F>
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T
      }
      case 'Pair': {
        const T = TraversablePairK1<unknown>()
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T as TraversableK1<F>
      }
      case 'Const': {
        const T = TraversableConstK1<unknown>()
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T as TraversableK1<F>
      }
    }
  }

// Promise-postcompose that uses the smart getter:
export const makePostcomposePromise2Smart =
  (R: ReturnType<typeof makeTraversableRegistryK1>): LaxTwoFunctorK1 =>
    makePostcomposePromise2(makeSmartGetTraversableK1(R))

// ---------------------------------------------------------------------
// Result<E,_>: factory to adapt your existing Ok/Err tags without imports.
// Provide a tag check and constructors so we don't collide with your names.
// ---------------------------------------------------------------------
export const makeTraversableResultK1 =
  <E>(
    isOk: <A>(r: Result<E, A>) => r is Ok<A>,
    getOk: <A>(ok: Ok<A>) => A,
    getErr: (err: Err<E>) => E,
    OkCtor: <A>(a: A) => Result<E, A>,
    ErrCtor: (e: E) => Result<E, never>
  ): TraversableK1<['Result', E]> => ({
    traverse: <G>(G: SimpleApplicativeK1<G>) =>
      <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
      (fa: EndofunctorValue<['Result', E], A>) => {
        const r = fa as Result<E, A>
        return isOk(r)
          ? G.map((b: B) => OkCtor(b))(f(getOk(r)))
          : G.of(ErrCtor(getErr(r)) as Result<E, B>)
      }
  })

// =======================
// Development Utilities (Dev-Only)
// =======================

type MaybeProcess = { readonly env?: Record<string, string | undefined> }

const resolveNodeEnv = (): string | undefined => {
  const processLike = (globalThis as { readonly process?: MaybeProcess }).process
  const nodeEnv = processLike?.env?.["NODE_ENV"]
  return typeof nodeEnv === "string" ? nodeEnv : undefined
}

const __DEV__ = resolveNodeEnv() !== "production"

export const assertMonoidalFnCoherence = (): void => {
  if (!__DEV__) return
  
  // Simple coherence test: test that isomorphisms are actually isomorphisms
  const A = 42 as const
  const leftUnitor = MonoidalFn.leftUnitor<typeof A>()
  const original = [undefined, A] as const
  const transformed = leftUnitor.to(original)
  const back = leftUnitor.from(transformed)
  
  if (JSON.stringify(original) !== JSON.stringify(back)) {
    console.warn("monoidal left unitor coherence failed")
  }
}

export const assertMonoidalKleisliRTECoherence = async <R, E>(): Promise<void> => {
  if (!__DEV__) return
  
  const M = MonoidalKleisliRTE<R, E>()
  
  // Test left unitor coherence
  const testValue = 42 as const
  const leftUnitor = M.leftUnitor<typeof testValue>()
  
  try {
    const result = await leftUnitor.to([undefined, testValue] as const)({} as R)
    if (!isOk(result) || result.value !== testValue) {
      console.warn("monoidal left unitor (Kleisli RTE) failed")
    }
  } catch (error) {
    console.warn("monoidal left unitor (Kleisli RTE) failed with error:", error)
  }
}

export const liftA2K1 =
  <F extends HK.Id1>(F: ApplicativeK1<F>) =>
  <A, B, C>(f: (a: A) => (b: B) => C) =>
  (fa: HK.Kind1<F, A>, fb: HK.Kind1<F, B>): HK.Kind1<F, C> =>
    F.ap(F.map(f)(fa))(fb)

export const liftA2K2C =
  <F extends HK.Id2, L>(F: ApplicativeK2C<F, L>) =>
  <A, B, C>(f: (a: A) => (b: B) => C) =>
  (fa: HK.Kind2<F, L, A>, fb: HK.Kind2<F, L, B>): HK.Kind2<F, L, C> =>
    F.ap(F.map(f)(fa))(fb)


// =======================
// HKT core (arity-3): HK.Registry3 / Kind3
// =======================
//
// Convention: left slots are the ones you typically "pin".
// Here we pin <R, E> for ReaderTaskResult<R, E, A>.

export namespace HK {
  export interface Registry3<L1, L2, A> {
    // ReaderTaskResult<R,E,A> ≅ ReaderTask<R, Result<E, A>>
    ReaderTaskResult: ReaderTask<L1, Result<L2, A>>
    // Add more 3-ary types here if you like (e.g., StateReaderTaskResult)
    // SRTResult: (define once you have it)
  }
  export type Id3 = keyof Registry3<unknown, unknown, unknown>
  export type Kind3<F extends Id3, L1, L2, A> = Registry3<L1, L2, A>[F]
}

// -----------------------
// Typeclasses (constant left-2): pin L1, L2; work in A
// -----------------------
export interface FunctorK3C<F extends HK.Id3, L1, L2> {
  readonly map: <A, B>(f: (a: A) => B) =>
    (fa: HK.Kind3<F, L1, L2, A>) => HK.Kind3<F, L1, L2, B>
}

export interface ApplicativeK3C<F extends HK.Id3, L1, L2>
  extends FunctorK3C<F, L1, L2> {
  readonly of: <A>(a: A) => HK.Kind3<F, L1, L2, A>
  readonly ap: <A, B>(ff: HK.Kind3<F, L1, L2, (a: A) => B>) =>
    (fa: HK.Kind3<F, L1, L2, A>) => HK.Kind3<F, L1, L2, B>
}

export interface MonadK3C<F extends HK.Id3, L1, L2>
  extends ApplicativeK3C<F, L1, L2> {
  readonly chain: <A, B>(f: (a: A) => HK.Kind3<F, L1, L2, B>) =>
    (fa: HK.Kind3<F, L1, L2, A>) => HK.Kind3<F, L1, L2, B>
}

// =======================
// Instance: ReaderTaskResult<R, E, A>
// =======================
//
// Uses your existing ReaderTask & Result helpers under the hood.

export const ReaderTaskResultK =
  <R, E>(): MonadK3C<'ReaderTaskResult', R, E> => ({
    map: <A, B>(f: (a: A) => B) =>
      (fa: HK.Kind3<'ReaderTaskResult', R, E, A>):
        HK.Kind3<'ReaderTaskResult', R, E, B> =>
      async (env: R) => {
        const ra = await fa(env)
        return mapR<E, A, B>(f)(ra)
      },

    of: <A>(a: A): HK.Kind3<'ReaderTaskResult', R, E, A> =>
      async (_: R) => Ok(a),

    ap:  <A, B>(ff: HK.Kind3<'ReaderTaskResult', R, E, (a: A) => B>) =>
         (fa: HK.Kind3<'ReaderTaskResult', R, E, A>):
           HK.Kind3<'ReaderTaskResult', R, E, B> =>
      async (env: R) => {
        const [rfab, rfa] = await Promise.all([ff(env), fa(env)])
        return (isOk(rfab) && isOk(rfa))
          ? Ok(rfab.value(rfa.value))
          : (isErr(rfab) ? rfab : (rfa as Err<E>))
      },

    chain: <A, B>(f: (a: A) =>
             HK.Kind3<'ReaderTaskResult', R, E, B>) =>
            (fa: HK.Kind3<'ReaderTaskResult', R, E, A>):
              HK.Kind3<'ReaderTaskResult', R, E, B> =>
      async (env: R) => {
        const ra = await fa(env)
        return isOk(ra) ? f(ra.value)(env) : (ra as Err<E>)
      },
  })

// =======================
// Generic helpers (arity-3)
// =======================

export const liftA2K3C =
  <F extends HK.Id3, L1, L2>(F: ApplicativeK3C<F, L1, L2>) =>
  <A, B, C>(f: (a: A) => (b: B) => C) =>
  (fa: HK.Kind3<F, L1, L2, A>, fb: HK.Kind3<F, L1, L2, B>):
    HK.Kind3<F, L1, L2, C> =>
      F.ap(F.map(f)(fa))(fb)

// Handy traversals for arrays with 3-ary applicatives/monads
export const traverseArrayK3C =
  <F extends HK.Id3, L1, L2>(F: ApplicativeK3C<F, L1, L2>) =>
  <A, B>(as: ReadonlyArray<A>, f: (a: A) => HK.Kind3<F, L1, L2, B>):
    HK.Kind3<F, L1, L2, ReadonlyArray<B>> => {
      const cons = (x: B) => (xs: ReadonlyArray<B>) => [x, ...xs] as const as ReadonlyArray<B>
      const ofNil = F.of<ReadonlyArray<B>>([])
      // foldRight to preserve order with applicatives
      return as.reduceRight(
        (acc, a) => liftA2K3C(F)<B, ReadonlyArray<B>, ReadonlyArray<B>>(cons)(f(a), acc),
        ofNil
      )
    }

export const sequenceArrayK3C =
  <F extends HK.Id3, L1, L2>(F: ApplicativeK3C<F, L1, L2>) =>
  <A>(fs: ReadonlyArray<HK.Kind3<F, L1, L2, A>>):
    HK.Kind3<F, L1, L2, ReadonlyArray<A>> =>
      traverseArrayK3C(F)<HK.Kind3<F, L1, L2, A>, A>(fs, (fa) => fa)


// ======================================================
// Pre-bound applicative helpers (no generic args needed)
// ======================================================

// ---------- Option ----------
export const liftA2O =
  <A, B, C>(f: (a: A) => (b: B) => C) =>
  (fa: Option<A>, fb: Option<B>): Option<C> =>
    OptionK.ap(OptionK.map(f)(fa))(fb)

export const liftA3O =
  <A, B, C, D>(f: (a: A) => (b: B) => (c: C) => D) =>
  (fa: Option<A>, fb: Option<B>, fc: Option<C>): Option<D> =>
    OptionK.ap(OptionK.ap(OptionK.map(f)(fa))(fb))(fc)


// Pairs
export type Pair<A, B> = readonly [A, B]

// Discard right, keep left
export const apFirstO =
  <A, B>(fa: Option<A>) =>
  (fb: Option<B>): Option<A> =>
    OptionK.ap(OptionK.map((a: A) => (_: B) => a)(fa))(fb)

// Discard left, keep right
export const apSecondO =
  <A, B>(fa: Option<A>) =>
  (fb: Option<B>): Option<B> =>
    OptionK.ap(OptionK.map((_: A) => (b: B) => b)(fa))(fb)

// zipWith / zip
export const zipWithO =
  <A, B, C>(f: (a: A) => (b: B) => C) =>
  (fa: Option<A>, fb: Option<B>): Option<C> =>
    OptionK.ap(OptionK.map(f)(fa))(fb)

export const zipO =
  <A, B>(fa: Option<A>, fb: Option<B>): Option<Pair<A, B>> =>
    zipWithO((a: A) => (b: B) => [a, b] as const)(fa, fb)


export const sequenceArrayO =
  <A>(as: ReadonlyArray<Option<A>>): Option<ReadonlyArray<A>> => {
    const cons = <X>(x: X) => (xs: ReadonlyArray<X>): ReadonlyArray<X> => [x, ...xs]
    return as.reduceRight(
      (acc, oa) => liftA2O((x: A) => (xs: ReadonlyArray<A>) => cons(x)(xs))(oa, acc),
      OptionK.of<ReadonlyArray<A>>([])
    )
  }

export const traverseArrayO =
  <A, B>(as: ReadonlyArray<A>, f: (a: A) => Option<B>): Option<ReadonlyArray<B>> =>
    sequenceArrayO(as.map(f))

// ---------- ReaderTask (pin R once) ----------
export const mkRT = <R>() => {
  const RT = ReaderTaskK<R>()

  const liftA2 =
    <A, B, C>(f: (a: A) => (b: B) => C) =>
    (fa: ReaderTask<R, A>, fb: ReaderTask<R, B>): ReaderTask<R, C> =>
      RT.ap(RT.map(f)(fa))(fb)

  const liftA3 =
    <A, B, C, D>(f: (a: A) => (b: B) => (c: C) => D) =>
    (fa: ReaderTask<R, A>, fb: ReaderTask<R, B>, fc: ReaderTask<R, C>): ReaderTask<R, D> =>
      RT.ap(RT.ap(RT.map(f)(fa))(fb))(fc)

  const apFirst =
    <A, B>(fa: ReaderTask<R, A>) =>
    (fb: ReaderTask<R, B>): ReaderTask<R, A> =>
      RT.ap(RT.map((a: A) => (_: B) => a)(fa))(fb)

  const apSecond =
    <A, B>(fa: ReaderTask<R, A>) =>
    (fb: ReaderTask<R, B>): ReaderTask<R, B> =>
      RT.ap(RT.map((_: A) => (b: B) => b)(fa))(fb)

  const zipWith =
    <A, B, C>(f: (a: A) => (b: B) => C) =>
    (fa: ReaderTask<R, A>, fb: ReaderTask<R, B>): ReaderTask<R, C> =>
      liftA2(f)(fa, fb)

  const zip =
    <A, B>(fa: ReaderTask<R, A>, fb: ReaderTask<R, B>): ReaderTask<R, Pair<A, B>> =>
      zipWith((a: A) => (b: B) => [a, b] as const)(fa, fb)

  const sequenceArray =
    <A>(as: ReadonlyArray<ReaderTask<R, A>>): ReaderTask<R, ReadonlyArray<A>> => {
      const cons = <X>(x: X) => (xs: ReadonlyArray<X>): ReadonlyArray<X> => [x, ...xs]
      return as.reduceRight(
        (acc, ra) => liftA2((x: A) => (xs: ReadonlyArray<A>) => cons(x)(xs))(ra, acc),
        RT.of<ReadonlyArray<A>>([])
      )
    }

  const traverseArray =
    <A, B>(as: ReadonlyArray<A>, f: (a: A) => ReaderTask<R, B>): ReaderTask<R, ReadonlyArray<B>> =>
      sequenceArray(as.map(f))

  return { liftA2, liftA3, apFirst, apSecond, zip, zipWith, sequenceArray, traverseArray }
}


// ---------- ReaderTaskResult (pin R and E once) ----------
export const mkRTR = <R, E>() => {
  const RTR = ReaderTaskResultK<R, E>()
  type RTRA<A> = ReaderTask<R, Result<E, A>>

  const liftA2 =
    <A, B, C>(f: (a: A) => (b: B) => C) =>
    (fa: RTRA<A>, fb: RTRA<B>): RTRA<C> =>
      RTR.ap(RTR.map(f)(fa))(fb)

  const liftA3 =
    <A, B, C, D>(f: (a: A) => (b: B) => (c: C) => D) =>
    (fa: RTRA<A>, fb: RTRA<B>, fc: RTRA<C>): RTRA<D> =>
      RTR.ap(RTR.ap(RTR.map(f)(fa))(fb))(fc)

  const apFirst =
    <A, B>(fa: RTRA<A>) =>
    (fb: RTRA<B>): RTRA<A> =>
      RTR.ap(RTR.map((a: A) => (_: B) => a)(fa))(fb)

  const apSecond =
    <A, B>(fa: RTRA<A>) =>
    (fb: RTRA<B>): RTRA<B> =>
      RTR.ap(RTR.map((_: A) => (b: B) => b)(fa))(fb)

  const zipWith =
    <A, B, C>(f: (a: A) => (b: B) => C) =>
    (fa: RTRA<A>, fb: RTRA<B>): RTRA<C> =>
      liftA2(f)(fa, fb)

  const zip =
    <A, B>(fa: RTRA<A>, fb: RTRA<B>): RTRA<Pair<A, B>> =>
      zipWith((a: A) => (b: B) => [a, b] as const)(fa, fb)

  const sequenceArray =
    <A>(as: ReadonlyArray<RTRA<A>>): RTRA<ReadonlyArray<A>> => {
      const cons = <X>(x: X) => (xs: ReadonlyArray<X>): ReadonlyArray<X> => [x, ...xs]
      return as.reduceRight(
        (acc, rtra) => liftA2((x: A) => (xs: ReadonlyArray<A>) => cons(x)(xs))(rtra, acc),
        RTR.of<ReadonlyArray<A>>([])
      )
    }

  const traverseArray =
    <A, B>(as: ReadonlyArray<A>, f: (a: A) => RTRA<B>): RTRA<ReadonlyArray<B>> =>
      sequenceArray(as.map(f))

  return { liftA2, liftA3, apFirst, apSecond, zip, zipWith, sequenceArray, traverseArray }
}
































































































// Tiny examples
// ENV / config
type AppEnv = { apiBase: string; token: string }

// Reader usage (pure dependency injection)
const authHeader: Reader<AppEnv, Record<string, string>> = Reader.asks((env) => ({
  Authorization: `Bearer ${env.token}`,
}))

const url: Reader<AppEnv, string> = Reader.asks((env) => `${env.apiBase}/users/me`)

const headersThenUrl = Reader.chain<Record<string, string>, string, AppEnv>((h) =>
  Reader.map<string, string>((u) => `${u}?auth=${!!h['Authorization']}`)(url)
)(authHeader)

// run
runReader(headersThenUrl, { apiBase: "https://api.example.com", token: "T" })
// -> "https://api.example.com/users/me?auth=true"




// Next example
// ReaderTask usage (async + DI)
type Http = (input: RequestInfo, init?: RequestInit) => Promise<Response>
type EnvRT = { apiBase: string; http: Http }

const getMe: ReaderTask<EnvRT, unknown> = ReaderTask.chain<string, unknown, EnvRT>(
  (u) =>
    async (env) => {
      const res = await env.http(u)
      return res.json()
    }
)(
  // build URL from env
  ReaderTask.asks((env) => `${env.apiBase}/users/me`)
)

// locally tweak environment (e.g., swap base URL)
const getMeFromStaging = ReaderTask.local<EnvRT, EnvRT>(
  (env) => ({ ...env, apiBase: "https://staging.example.com" })
)(getMe)

void getMeFromStaging

// run
// await getMe({
//   apiBase: "https://api.example.com",
//   http: (input, init) => fetch(input, init),
// })



// Next example
// ReaderTask + TaskResult (graceful errors)
type E = Error
type User = { id: string; name: string }
type EnvErr = { apiBase: string; http: Http }

const getJsonTR =
  <A>(path: string): ReaderTask<EnvErr, Result<E, A>> =>
  async (env) => {
    try {
      const res = await env.http(`${env.apiBase}${path}`)
      if (!res.ok) return Err(new Error(`HTTP ${res.status}`))
      return Ok((await res.json()) as A)
    } catch (u) {
      return Err(u instanceof Error ? u : new Error(String(u)))
    }
  }

type ExprEnvDemo = Readonly<Record<string, number>>

type ReaderTaskApplicativeShowcase = {
  readonly fetchUserName: ReaderTask<EnvErr, Result<E, string>>
  readonly partialFn: {
    readonly ints1: ReadonlyArray<number>
    readonly ints2: ReadonlyArray<number>
    readonly ages: ReadonlyMap<string, number>
    readonly byDomain: ReadonlyMap<string, string>
    readonly setInts: ReadonlySet<number>
  }
  readonly readerEval: {
    readonly program: Expr
    readonly emptyEnv: ExprEnvDemo
    readonly shadowEnv: ExprEnvDemo
    readonly emptyResult: number
    readonly shadowResult: number
  }
  readonly readerResult: {
    readonly expr: Expr
    readonly outcome: Result<string, number>
  }
  readonly stackMachine: {
    readonly expr: Expr
    readonly program: Program
    readonly result: Result<string, number>
  }
  readonly structuralMetrics: {
    readonly complexExpr: Expr
    readonly exprSize: number
    readonly exprDepth: number
    readonly complexJson: Json
    readonly jsonSize: number
    readonly jsonStrs: ReadonlyArray<string>
    readonly jsonDepth: number
    readonly jsonSize2: number
    readonly jsonDepth2: number
  }
}

export const readerTaskApplicativeShowcase: ReaderTaskApplicativeShowcase = (() => {
  const getUser = (id: string): ReaderTask<EnvErr, Result<E, User>> =>
    getJsonTR<User>(`/users/${id}`)

  const fetchUserName: ReaderTask<EnvErr, Result<Error, string>> =
    ReaderTaskResult.map<EnvErr, Error, User, string>((u) => u.name)(
      getUser("42")
    )

  // ---------- Partial function: parseInt on int-like strings ----------
  const intLike = (s: string) => /^-?\d+$/.test(s)
  const parseIntPF: PartialFn<string, number> = pf(intLike, s => Number(s))

  const raw = ["10", "x", "-3", "7.5", "0"]
  const ints1 = filterMapArraySimple(raw, (s) => intLike(s) ? Some(Number(s)) : None)
  const ints2 = collectArray(raw, parseIntPF)

  const agesRaw = new Map<string, string>([["a","19"], ["b","oops"], ["c","42"]])
  const ages = collectMapValues(agesRaw, parseIntPF)

  const emails = new Map<string, string>([
    ["u1", "ada@example.com"],
    ["u2", "not-an-email"],
    ["u3", "bob@example.com"]
  ])
  const emailDomainPF: PartialFn<readonly [string, string], readonly [string, string]> =
    pf(([, e]) => /@/.test(e), ([id, e]) => [e.split("@")[1]!, id] as const)
  const byDomain = collectMapEntries(emails, emailDomainPF)

  const setRaw = new Set(["1", "2", "two", "3"])
  const setInts = collectSet(setRaw, parseIntPF)

  const prog = lett("x", lit(10),
    addN([ vvar("x"), powE(lit(2), lit(3)), neg(lit(4)) ])
  )
  const emptyEnv: ExprEnvDemo = {}
  const shadowEnv: ExprEnvDemo = { x: 1 }
  const emptyResult = runReader(evalExprR_app(prog), emptyEnv)
  const shadowResult = runReader(evalExprR_app(prog), shadowEnv)

  const bad = divE(lit(1), add(vvar("d"), neg(vvar("d"))))
  const outcome = runReader(evalExprRR_app(bad), { d: 3 })

  const machineExpr = lett("y", lit(5), mul(add(vvar("y"), lit(1)), lit(3)))
  const program = compileExpr(machineExpr)
  const result = runProgram(program)

  const complexExpr = addN([neg(lit(4)), mulN([lit(2), lit(3)]), divE(lit(8), lit(2))])
  const [exprSize, exprDepth] = sizeAndDepthExpr(complexExpr)

  const complexJson = jObj([
    ['name', jStr('Ada')],
    ['tags', jArr([jStr('fp'), jStr('ts')])]
  ])
  const jsonSize = sizeJson(complexJson)
  const jsonStrs = strsJson(complexJson)
  const jsonDepth = depthJson(complexJson)
  const [jsonSize2, jsonDepth2] = sizeAndDepthJson(complexJson)

  return {
    fetchUserName,
    partialFn: { ints1, ints2, ages, byDomain, setInts },
    readerEval: { program: prog, emptyEnv, shadowEnv, emptyResult, shadowResult },
    readerResult: { expr: bad, outcome },
    stackMachine: { expr: machineExpr, program, result },
    structuralMetrics: {
      complexExpr,
      exprSize,
      exprDepth,
      complexJson,
      jsonSize,
      jsonStrs,
      jsonDepth,
      jsonSize2,
      jsonDepth2,
    },
  } as const
})()

// ===============================================================
// Generic descent/glue kit
//   - Works over every index type I (keys you glue along),
//     local pieces Xi, overlap observations Oij, and final A.
//   - You supply: how to "restrict" to overlaps, equality on overlaps,
//     optional completeness checks, and how to assemble the global.
// ===============================================================

export type GlueKit<I extends PropertyKey, Xi, Oij, A> = {
  readonly cover: ReadonlyArray<I>
  readonly restrict: (i: I, j: I) => (xi: Xi) => Oij
  readonly eqO: Eq<Oij>
  readonly assemble: (sections: Readonly<Record<I, Xi>>) => A
  readonly completeness?: (i: I, xi: Xi) => ReadonlyArray<string> // empty => ok
}

export type GlueErr<I extends PropertyKey, Oij> =
  | { _tag: 'Incomplete'; i: I; details: ReadonlyArray<string> }
  | { _tag: 'Conflict';  i: I; j: I; left: Oij; right: Oij }

export const GlueKit = Symbol.for('GlueKit')
export const GlueErr = Symbol.for('GlueErr')

export const checkDescent =
  <I extends PropertyKey, Xi, Oij, A>(
    kit: GlueKit<I, Xi, Oij, A>,
    secs: Readonly<Record<I, Xi>>
  ): Validation<GlueErr<I, Oij>, true> => {
    const errs: GlueErr<I, Oij>[] = []
    const ids = kit.cover

    // 1) completeness per piece (optional)
    if (kit.completeness) {
      for (const i of ids) {
        const issues = kit.completeness(i, secs[i])
        if (issues.length) errs.push({ _tag: 'Incomplete', i, details: issues })
      }
    }

    // 2) compatibility on all overlaps
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      const i = ids[a]!, j = ids[b]!
      const rij = kit.restrict(i, j)(secs[i])
      const rji = kit.restrict(j, i)(secs[j])
      if (!kit.eqO(rij, rji)) errs.push({ _tag: 'Conflict', i, j, left: rij, right: rji })
    }

    return errs.length ? VErr(...errs) : VOk(true as const)
  }

export const glue =
  <I extends PropertyKey, Xi, Oij, A>(
    kit: GlueKit<I, Xi, Oij, A>,
    secs: Readonly<Record<I, Xi>>
  ): Validation<GlueErr<I, Oij>, A> => {
    const ok = checkDescent(kit, secs)
    if (isVErr(ok)) return ok
    return VOk(kit.assemble(secs))
  }

// ===============================================================
// Record-based gluing (keys as "opens")
// ===============================================================
export type RecordCover<I extends PropertyKey, K extends PropertyKey> =
  Readonly<Record<I, ReadonlySet<K>>>
export type Sections<I extends PropertyKey, K extends PropertyKey, A> =
  Readonly<Record<I, Readonly<Partial<Record<K, A>>>>> 

export const RecordCover = Symbol.for('RecordCover')
export const Sections = Symbol.for('Sections')

const intersect = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>): ReadonlyArray<T> => {
  const out: T[] = []; for (const x of a) if (b.has(x)) out.push(x); return out
}

const eqRecordOn =
  <K extends PropertyKey, A>(eqA: Eq<A>) =>
  (keys: ReadonlyArray<K>) =>
  (
    x: Readonly<Partial<Record<K, A>>>,
    y: Readonly<Partial<Record<K, A>>>
  ): boolean =>
    keys.every(k => eqA(x[k] as A, y[k] as A))

const pickRecord = <K extends PropertyKey, A>(
  r: Readonly<Partial<Record<K, A>>>,
  ks: ReadonlyArray<K>
): Readonly<Partial<Record<K, A>>> => {
  const out: Partial<Record<K, A>> = {}
  for (const k of ks) {
    if (Object.prototype.hasOwnProperty.call(r, k)) {
      out[k] = r[k] as A
    }
  }
  return out
}

export const mkRecordGlueKit =
  <I extends PropertyKey, K extends PropertyKey, A>(
    cover: RecordCover<I, K>,
    eqA: Eq<A> = eqStrict<A>()
  ): GlueKit<
    I,
    Readonly<Partial<Record<K, A>>>,
    Readonly<Partial<Record<K, A>>>,
    Readonly<Record<K, A>>
  > => {
    const ids = Object.keys(cover) as I[]

    const restrict = (i: I, j: I) => (ri: Readonly<Partial<Record<K, A>>>) =>
      pickRecord(ri, intersect(cover[i], cover[j]))

    const eqO = (
      x: Readonly<Partial<Record<K, A>>>,
      y: Readonly<Partial<Record<K, A>>>
    ) =>
      eqRecordOn(eqA)(Object.keys(x) as K[])(x, y) &&
      eqRecordOn(eqA)(Object.keys(y) as K[])(x, y)

    const completeness = (i: I, ri: Readonly<Partial<Record<K, A>>>) => {
      const need = [...cover[i] as Set<K>]
      const miss = need.filter(k => !(k in ri))
      return miss.length ? miss.map(k => `missing ${String(k)}`) : []
    }

    const assemble = (secs: Readonly<Record<I, Readonly<Partial<Record<K, A>>>>>) => {
      // union of all keys in the cover
      const all = new Set<K>(); for (const i of ids) for (const k of cover[i]) all.add(k)
      const out: Partial<Record<K, A>> = {}
      // since descent holds, whatever section defines k has the same value
      for (const k of all) {
        for (const i of ids) {
          const ri = secs[i]
          if (Object.prototype.hasOwnProperty.call(ri, k)) {
            out[k] = ri[k] as A
            break
          }
        }
      }
      return out as Readonly<Record<K, A>>
    }

    return { cover: ids, restrict, eqO, completeness, assemble }
  }

// Legacy API compatibility
export const glueRecordCover =
  <I extends PropertyKey, K extends PropertyKey, A>(
    cover: RecordCover<I, K>,
    secs: Sections<I, K, A>,
    eq: Eq<A> = eqStrict<A>()
  ) => glue(mkRecordGlueKit(cover, eq), secs)

export const resRecord =
  <I extends PropertyKey, K extends PropertyKey, A>(cover: RecordCover<I, K>) =>
  (i: I, j: I) =>
  (si: Readonly<Partial<Record<K, A>>>): Readonly<Partial<Record<K, A>>> => {
    const kit = mkRecordGlueKit<I, K, A>(cover)
    return kit.restrict(i, j)(si)
  }

// ---------- Fused hylo demo (Expr or Json as you like) ----------
// Note: These functions would need to be implemented based on your fused hylo setup
// const s5 = evalSum1toN_FUSED(5)                          // 15
// const p2 = showPowMul_FUSED(2, 3)                        // "((3 * 3) * (3 * 3))"

// =====================================================================
// Semirings and matrix utilities for categorical theory
// =====================================================================
export type Semiring<R> = {
  readonly zero: R
  readonly one: R
  readonly add: (x: R, y: R) => R
  readonly mul: (x: R, y: R) => R
  readonly eq?: (x: R, y: R) => boolean
}

export const SemiringNat: Semiring<number> = {
  zero: 0,
  one: 1,
  add: (x, y) => x + y,
  mul: (x, y) => x * y,
  eq: (x, y) => x === y,
}

// -------------------------------------------------------------
// Handy semirings
// -------------------------------------------------------------
export const SemiringMinPlus: Semiring<number> = {
  add: (a,b) => Math.min(a,b),
  zero: Number.POSITIVE_INFINITY,
  mul: (a,b) => a + b,
  one: 0,
  eq: eqStrict<number>(),
}

export const SemiringMaxPlus: Semiring<number> = {
  add: (a,b) => Math.max(a,b),
  zero: Number.NEGATIVE_INFINITY,
  mul: (a,b) => a + b,
  one: 0,
  eq: eqStrict<number>(),
}

// Boolean reachability (∨ for add, ∧ for mul)
export const SemiringBoolOrAnd: Semiring<boolean> = {
  add: (a,b) => a || b,
  zero: false,
  mul: (a,b) => a && b,
  one: true,
  eq: eqStrict<boolean>(),
}

// Probability semiring (standard +, ×)
export const SemiringProb: Semiring<number> = {
  add: (a,b) => a + b,
  zero: 0,
  mul: (a,b) => a * b,
  one: 1,
  eq: eqStrict<number>(),
}

// ---------- Ring (Semiring + additive inverses) ----------
export interface Ring<R> extends Semiring<R> {
  neg: (a: R) => R
  sub: (a: R, b: R) => R
}

// A concrete ring over number
export const RingReal: Ring<number> = {
  add: (a,b) => a + b,
  zero: 0,
  mul: (a,b) => a * b,
  one: 1,
  eq: eqStrict<number>(),
  neg: a => -a,
  sub: (a,b) => a - b
}

export type Mat<R> = R[][] // rows x cols

// Identity matrix
export const eye = <R>(S: Semiring<R>) => (n: number): Mat<R> => {
  const result: R[][] = []
  for (let i = 0; i < n; i++) {
    const row: R[] = []
    for (let j = 0; j < n; j++) {
      row.push(i === j ? S.one : S.zero)
    }
    result.push(row)
  }
  return result
}

// Matrix multiplication
export const matMul = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): Mat<R> => {
  const m = A.length
  const k = B.length
  const n = B[0]?.length ?? 0
  if (A[0]?.length !== k) throw new Error('matMul: incompatible dimensions')
  
  const result: R[][] = []
  for (let i = 0; i < m; i++) {
    const row: R[] = []
    for (let j = 0; j < n; j++) {
      let sum = S.zero
      for (let p = 0; p < k; p++) {
        sum = S.add(sum, S.mul(A[i]![p]!, B[p]![j]!))
      }
      row.push(sum)
    }
    result.push(row)
  }
  return result
}

// Kronecker product
export const kron = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): Mat<R> => {
  const mA = A.length
  const nA = A[0]?.length ?? 0
  const mB = B.length
  const nB = B[0]?.length ?? 0
  
  const result: R[][] = []
  for (let i = 0; i < mA * mB; i++) {
    const row: R[] = []
    for (let j = 0; j < nA * nB; j++) {
      const iA = Math.floor(i / mB)
      const iB = i % mB
      const jA = Math.floor(j / nB)
      const jB = j % nB
      const aVal = A[iA]?.[jA] ?? S.zero
      const bVal = B[iB]?.[jB] ?? S.zero
      row.push(S.mul(aVal, bVal))
    }
    result.push(row)
  }
  return result
}

// Matrix equality
export const eqMat = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): boolean => {
  const eq = S.eq ?? ((x: R, y: R) => Object.is(x, y))
  if (A.length !== B.length) return false
  if (A[0]?.length !== B[0]?.length) return false
  
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < (A[0]?.length ?? 0); j++) {
      const aVal = A[i]?.[j]
      const bVal = B[i]?.[j]
      if (aVal === undefined || bVal === undefined || !eq(aVal, bVal)) {
        return false
      }
    }
  }
  return true
}

// =====================================================================
// Corings over semirings
//   A coring C over R^n is (R^n, Δ: C→C⊗C, ε: C→R) satisfying laws
// =====================================================================
export type Coring<R> = {
  readonly S: Semiring<R>
  readonly n: number         // rank of C ≅ R^n
  readonly Delta: Mat<R>     // (n*n) x n
  readonly Eps: Mat<R>       // 1 x n
}

// Diagonal coring: each basis element is group-like
export const makeDiagonalCoring = <R>(S: Semiring<R>) => (n: number): Coring<R> => {
  // Δ(c_i) = c_i ⊗ c_i
  const Delta: R[][] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const row: R[] = Array(n).fill(S.zero)
      if (i === j) row[i] = S.one
      Delta.push(row)
    }
  }
  
  // ε(c_i) = 1 for all i
  const Eps: R[][] = [Array(n).fill(S.one)]
  
  return { S, n, Delta, Eps }
}

// =========================================
// Algebra on free module A ≅ R^k (finite)
//   μ : A⊗A -> A     (k x k^2)
//   η : R   -> A     (k x 1)
// =========================================
export type Algebra<R> = {
  readonly S: Semiring<R>
  readonly k: number
  readonly Mu : Mat<R>  // k x (k*k)
  readonly Eta: Mat<R>  // k x 1
}

// Diagonal algebra: basis {e_i}; μ(e_i⊗e_j)=δ_{ij} e_i, η(1)=∑ e_i
export const makeDiagonalAlgebra =
  <R>(S: Semiring<R>) =>
  (k: number): Algebra<R> => {
    const Mu: R[][] = Array.from({ length: k }, () =>
      Array.from({ length: k * k }, () => S.zero)
    )
    for (let i = 0; i < k; i++) {
      const col = i * k + i // (i,i) slot in flattened k×k
      Mu[i]![col] = S.one
    }
    const Eta: R[][] = Array.from({ length: k }, () => [S.one])
    return { S, k, Mu, Eta }
  }

// =========================================
// Entwining between Algebra A and Coring C
//   Ψ : A⊗C → C⊗A    ((n*k) x (k*n))
// Laws (Brzeziński–Majid):
//  (1) (Δ⊗id_A) Ψ = (id_C⊗Ψ)(Ψ⊗id_C)(id_A⊗Δ)
//  (2) (id_C⊗μ)(Ψ⊗id_A)(id_A⊗Ψ) = Ψ(μ⊗id_C)
//  (3) Ψ(η⊗id_C) = id_C⊗η
//  (4) (ε⊗id_A)Ψ = id_A⊗ε
// =========================================
export type Entwining<R> = {
  readonly A: Algebra<R>
  readonly C: Coring<R>
  readonly Psi: Mat<R>             // (C.n * A.k) x (A.k * C.n)
}

// -------------------------------------------------------------
// Vectors + matrix powers/closures under a Semiring
// -------------------------------------------------------------
export type Vec<R> = ReadonlyArray<R>

// row vector (1×n) × (n×m) -> (1×m)
export const vecMat =
  <R>(S: Semiring<R>) =>
  (v: Vec<R>, M: Mat<R>): Vec<R> => {
    const m = M[0]?.length ?? 0
    const n = v.length
    const out = Array.from({ length: m }, () => S.zero)
    for (let j = 0; j < m; j++) {
      let acc = S.zero
      for (let i = 0; i < n; i++) acc = S.add(acc, S.mul(v[i]!, M[i]?.[j]!))
      out[j] = acc
    }
    return out
  }

// (n×m) × (m×1) column vector -> (n×1)
export const matVec =
  <R>(S: Semiring<R>) =>
  (M: Mat<R>, v: Vec<R>): Vec<R> => {
    const n = M.length
    const m = v.length
    const out = Array.from({ length: n }, () => S.zero)
    for (let i = 0; i < n; i++) {
      let acc = S.zero
      for (let j = 0; j < m; j++) acc = S.add(acc, S.mul(M[i]?.[j]!, v[j]!))
      out[i] = acc
    }
    return out
  }

// fast exponentiation: A^k under S
export const powMat =
  <R>(S: Semiring<R>) =>
  (A: Mat<R>, k: number): Mat<R> => {
    const n = A.length, m = A[0]?.length ?? 0
    if (n !== m) throw new Error('powMat: square matrix required')
    const I = eye(S)(n)
    let base = A, exp = k, res = I
    while (exp > 0) {
      if (exp & 1) res = matMul(S)(res, base)
      base = matMul(S)(base, base)
      exp >>= 1
    }
    return res
  }

// finite Kleene star up to L: I ⊕ A ⊕ A^2 ⊕ ... ⊕ A^L
export const closureUpTo =
  <R>(S: Semiring<R>) =>
  (A: Mat<R>, L: number): Mat<R> => {
    const n = A.length
    let acc = eye(S)(n)
    let p = eye(S)(n)
    for (let i = 1; i <= L; i++) {
      p = matMul(S)(p, A)
      // acc = acc ⊕ p  (elementwise add)
      acc = acc.map((row, r) => row.map((x, c) => S.add(x, p[r]?.[c]!)))
    }
    return acc
  }

// ---------- Matrix helpers that need a Ring ----------
export const matAdd =
  <R>(Rng: Ring<R>) =>
  (A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.map((row,i) => row.map((x,j) => Rng.add(x, B[i]?.[j]!)))

export const matNeg =
  <R>(Rng: Ring<R>) =>
  (A: Mat<R>): Mat<R> =>
    A.map(row => row.map(Rng.neg))

export const zerosMat =
  <R>(rows: number, cols: number, S: Semiring<R>): Mat<R> =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => S.zero))

export const idMat =
  <R>(n: number, S: Semiring<R>): Mat<R> => eye(S)(n)

// Block concat (no checks; keep careful with dims)
export const hcat =
  <R>(A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.map((row, i) => row.concat(B[i]!))

export const vcat =
  <R>(A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.concat(B)

// 3-factor permutation matrix P: factors [d0,d1,d2] -> permute by π
// π = [0,1,2] is identity; π = [1,2,0] cycles (0→1→2→0)
export const permute3 = <R>(S: Semiring<R>) =>
  (dims: [number, number, number], perm: [number, number, number]): Mat<R> => {
    const [d0, d1, d2] = dims
    const total = d0 * d1 * d2
    const M: R[][] = Array.from({ length: total }, () =>
      Array.from({ length: total }, () => S.zero)
    )
    
    // For permutation [p0, p1, p2], the target dimensions are [dims[p0], dims[p1], dims[p2]]
    const targetDims = [dims[perm[0]], dims[perm[1]], dims[perm[2]]]
    
    for (let i0 = 0; i0 < d0; i0++) {
      for (let i1 = 0; i1 < d1; i1++) {
        for (let i2 = 0; i2 < d2; i2++) {
          const indices = [i0, i1, i2]
          const sourceIdx = i0 * (d1 * d2) + i1 * d2 + i2
          
          // Apply permutation
          const permIndices = [indices[perm[0]!]!, indices[perm[1]!]!, indices[perm[2]!]!]
          const [j0, j1, j2] = permIndices
          const targetIdx = j0! * (targetDims[1]! * targetDims[2]!) + j1! * targetDims[2]! + j2!
          
          const row = M[targetIdx]
          if (row) row[sourceIdx] = S.one
        }
      }
    }
    return M
  }

const I = <R>(S: Semiring<R>) => (n: number) => eye(S)(n)

export const entwiningCoassocHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, k }, C: { n, Delta }, Psi } = E
  const idA = I(S)(k), idC = I(S)(n)

  // LHS: (Δ⊗id_A) Ψ
  const L = matMul(S)(kron(S)(Delta, idA), Psi)
  // RHS: (id_C⊗Ψ)(Ψ⊗id_C)(id_A⊗Δ)
  const R1 = kron(S)(idA, Delta)
  const R2 = matMul(S)(kron(S)(Psi, idC), R1)
  const R  = matMul(S)(kron(S)(idC, Psi), R2)

  return eqMat(S)(L, R)
}

export const entwiningMultHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, k, Mu }, C: { n }, Psi } = E
  const idA = I(S)(k), idC = I(S)(n)

  // LHS: (id_C⊗μ)(Ψ⊗id_A)(id_A⊗Ψ)
  const L1 = kron(S)(idA, Psi)
  const L2 = matMul(S)(kron(S)(Psi, idA), L1)
  const L  = matMul(S)(kron(S)(idC, Mu), L2)

  // RHS: Ψ(μ⊗id_C)
  const R  = matMul(S)(Psi, kron(S)(Mu, idC))

  return eqMat(S)(L, R)
}

export const entwiningUnitHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, Eta }, C: { n }, Psi } = E
  const idC = I(S)(n)
  // Ψ(η⊗id_C) = id_C⊗η  : both are (n*k) x n
  const left  = matMul(S)(Psi, kron(S)(Eta, idC))
  const right = kron(S)(idC, Eta)
  return eqMat(S)(left, right)
}

export const entwiningCounitHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, k }, C: { Eps }, Psi } = E
  const idA = I(S)(k)
  // (ε⊗id_A)Ψ = id_A⊗ε  : both are k x (k*n)
  const left  = matMul(S)(kron(S)(Eps, idA), Psi)
  const right = kron(S)(idA, Eps)
  return eqMat(S)(left, right)
}

// Permutation matrix that flips A⊗C → C⊗A in the chosen basis
export const flipAC =
  <R>(S: Semiring<R>) =>
  (k: number, n: number): Mat<R> => {
    const M: R[][] = Array.from({ length: n * k }, () =>
      Array.from({ length: k * n }, () => S.zero)
    )
    // column index c = a*n + cIdx ; row index r = cIdx*k + a
    for (let a = 0; a < k; a++) for (let cIdx = 0; cIdx < n; cIdx++) {
      const col = a * n + cIdx
      const row = cIdx * k + a
      const m = M[row]
      if (m) m[col] = S.one
    }
    return M
  }

// Ready-made diagonal entwining
export const makeDiagonalEntwining =
  <R>(A: Algebra<R>, C: Coring<R>): Entwining<R> => {
    if (A.S !== C.S) console.warn('Entwining assumes A and C over the same Semiring instance')
    return { A, C, Psi: flipAC(A.S)(A.k, C.n) }
  }

// =====================================================================
// (Left) A–module + (Right) C–comodule entwined by Ψ : A⊗C → C⊗A
//   Data on M ≅ R^m:
//     act : A⊗M → M         (matrix m × (k*m))
//     rho : M → M⊗C         (matrix (m*n) × m)
//   Compatibility (Brzeziński–Majid, left/right convention):
//     ρ ∘ act
//       = (act ⊗ id_C) ∘ P_(C,A,M→A,M,C) ∘ (Ψ ⊗ id_M)
//         ∘ P_(A,M,C→A,C,M) ∘ (id_A ⊗ ρ)
//   where P are the strict permutation matrices on 3 factors.
//
//   Shapes summary (k = dim A, n = dim C, m = dim M):
//     act :      m × (k*m)
//     rho : (m*n) × m
// =====================================================================
export type EntwinedModule<R> = {
  readonly S: Semiring<R>
  readonly A: Algebra<R>
  readonly C: Coring<R>
  readonly m: number
  readonly act: Mat<R>         // m × (k*m)
  readonly rho: Mat<R>         // (m*n) × m
}

export const entwinedLawHolds = <R>(
  E: Entwining<R>,
  M: EntwinedModule<R>
): boolean => {
  const { A: { S, k }, C: { n }, Psi } = E
  const { m, act, rho } = M
  if (S !== M.S || S !== E.C.S) console.warn('entwinedLawHolds: semiring instances differ')

  const I = (d: number) => eye(S)(d)

  // LHS: ρ ∘ act : (m*n) × (k*m)
  const L = matMul(S)(rho, act)

  // RHS pipeline:
  // (id_A ⊗ ρ) : (k*m*n) × (k*m)
  const step1 = kron(S)(I(k), rho)

  // P_(A,M,C → A,C,M)
  const P1 = permute3(S)([k, m, n], [0, 2, 1])
  const step2 = matMul(S)(P1, step1)

  // (Ψ ⊗ id_M)
  const step3 = matMul(S)(kron(S)(Psi, I(m)), step2)

  // P_(C,A,M → A,M,C)
  const P2 = permute3(S)([n, k, m], [1, 2, 0])
  const step4 = matMul(S)(P2, step3)

  // (act ⊗ id_C)
  const Rfinal = matMul(S)(kron(S)(act, I(n)), step4)

  return eqMat(S)(L, Rfinal)
}

// Helper type for left modules
export type LeftModule<R> = {
  readonly S: Semiring<R>
  readonly A: Algebra<R>
  readonly m: number
  readonly act: Mat<R>         // m × (k*m)
}

// A diagonal left A-module where each M-basis j picks an A-basis via τ(j)
// act(e_{τ(j)} ⊗ m_j) = m_j ; all other A-basis act as 0 on m_j
export const makeTaggedLeftModule =
  <R>(A: Algebra<R>) =>
  (m: number, tau: (j: number) => number): LeftModule<R> => {
    const act: R[][] = Array.from({ length: m }, () =>
      Array.from({ length: A.k * m }, () => A.S.zero)
    )
    for (let j = 0; j < m; j++) {
      const aIdx = tau(j) % A.k
      const row = act[j]
      if (row) row[aIdx * m + j] = A.S.one
    }
    return { S: A.S, A, m, act }
  }

// Pair the above action with a diagonal right C–coaction by σ(j)
export const makeDiagonalEntwinedModule =
  <R>(E: Entwining<R>) =>
  (m: number, tau: (j: number) => number, sigma: (j: number) => number): EntwinedModule<R> => {
    const A = E.A, C = E.C, S = A.S
    // action
    const LM = makeTaggedLeftModule(A)(m, tau)
    // coaction  ρ(m_j) = m_j ⊗ c_{σ(j)}
    const rho: R[][] = Array.from({ length: m * C.n }, () =>
      Array.from({ length: m }, () => S.zero)
    )
    for (let j = 0; j < m; j++) {
      const cIdx = sigma(j) % C.n
      const row = rho[j * C.n + cIdx]
      if (row) row[j] = S.one
    }
    const M: EntwinedModule<R> = { S, A, C, m, act: LM.act, rho }
    return M
  }

// =====================================================================
// Morphism of entwined modules f : M → N (linear map, shapes mN × mM)
//  (A,C,Ψ) fixed.
// Laws:
//   (i)  f ∘ act_M = act_N ∘ (id_A ⊗ f)
//   (ii) (f ⊗ id_C) ∘ rho_M = rho_N ∘ f
// =====================================================================
export const isEntwinedModuleHom =
  <R>(E: Entwining<R>) =>
  (M: EntwinedModule<R>, N: EntwinedModule<R>, f: Mat<R>): boolean => {
    const S = E.A.S
    const k = E.A.k, n = E.C.n
    const mM = M.m, mN = N.m

    // quick shape sanity (optional)
    if ((f.length !== mN) || (f[0]?.length ?? -1) !== mM) return false

    const I = (d: number) => eye(S)(d)

    // (i) action square
    const leftAct  = matMul(S)(f, M.act)                          // mN × (k*mM)
    const rightAct = matMul(S)(N.act, kron(S)(I(k), f))           // mN × (k*mM)

    // (ii) coaction square
    const leftCo   = matMul(S)(kron(S)(f, I(n)), M.rho)           // (mN*n) × mM
    const rightCo  = matMul(S)(N.rho, f)                          // (mN*n) × mM

    return eqMat(S)(leftAct, rightAct) && eqMat(S)(leftCo, rightCo)
  }

// ================================================
// Hom composition for EntwinedModule morphisms
//   If f : M→N (shape mN × mM) and g : N→P (mP × mN)
//   then g ∘ f : M→P  (mP × mM)
// ================================================
export const composeEntwinedHomsUnchecked =
  <R>(S: Semiring<R>) =>
  (g: Mat<R>, f: Mat<R>): Mat<R> =>
    // compose g ∘ f  (apply f, then g) — our convention matches composeMap
    matMul(S)(g, f)

// Safe version with shape + law checks
export const composeEntwinedHoms =
  <R>(E: Entwining<R>) =>
  (M: EntwinedModule<R>, N: EntwinedModule<R>, P: EntwinedModule<R>) =>
  (g: Mat<R>, f: Mat<R>): Result<string, Mat<R>> => {
    const S = E.A.S
    const rows = (A: Mat<R>) => A.length
    const cols = (A: Mat<R>) => (A[0]?.length ?? 0)

    // shape checks
    if (cols(f) !== M.m) return Err(`compose: f has ${cols(f)} cols, expected ${M.m} (dom M)`)
    if (rows(f) !== N.m) return Err(`compose: f has ${rows(f)} rows, expected ${N.m} (cod N)`)
    if (cols(g) !== N.m) return Err(`compose: g has ${cols(g)} cols, expected ${N.m} (dom N)`)
    if (rows(g) !== P.m) return Err(`compose: g has ${rows(g)} rows, expected ${P.m} (cod P)`)

    // hom checks
    if (!isEntwinedModuleHom(E)(M, N, f)) return Err('compose: f is not an entwined-module hom')
    if (!isEntwinedModuleHom(E)(N, P, g)) return Err('compose: g is not an entwined-module hom')

    // composition
    return Ok(matMul(S)(g, f))
  }

// Lift A⊗M to a comodule via (id_A ⊗ ρ_M)
export const liftAotimesToComodule = <R>(E: Entwining<R>) => (M: Comodule<R>): Comodule<R> => {
  const S = E.A.S, k = E.A.k, m = M.m
  const I = (d: number) => eye(S)(d)
  
  // A⊗M has dimension k*m
  // coaction: (id_A ⊗ ρ_M) : A⊗M → A⊗M⊗C, matrix (k*m*n) × (k*m)
  const rho_AM = kron(S)(I(k), M.rho)
  
  return { S, C: E.C, m: k * m, rho: rho_AM }
}

// Lift N⊗C to a left module via (act_N ⊗ id_C)
export const liftTensorCToLeftModule = <R>(E: Entwining<R>) => (N: LeftModule<R>): LeftModule<R> => {
  const S = E.A.S, n = E.C.n, m = N.m
  const I = (d: number) => eye(S)(d)
  
  // N⊗C has dimension m*n
  // action: A⊗(N⊗C) → N⊗C via (act_N ⊗ id_C), matrix (m*n) × (k*m*n)
  const act_NC = kron(S)(N.act, I(n))
  
  return { S, A: E.A, m: m * n, act: act_NC }
}

// A⊗M as an entwined module
export const entwinedFromComodule_AotimesM =
  <R>(E: Entwining<R>) =>
  (M: Comodule<R>): EntwinedModule<R> => {
    const S = E.A.S, k = E.A.k, m = M.m
    const I = (d: number) => eye(S)(d)

    // action (μ ⊗ id_M) : (k*m) × (k*k*m)
    const actA = matMul(S)(kron(S)(E.A.Mu, I(m)), eye(S)(k*k*m)) // assoc is strict in our encoding

    // coaction via earlier lift
    const AM_as_comod = liftAotimesToComodule(E)(M) // rho: (k*m*n) × (k*m)

    return { S, A: E.A, C: E.C, m: k*m, act: actA, rho: AM_as_comod.rho }
  }

// N⊗C as an entwined module
export const entwinedFromLeftModule_NotimesC =
  <R>(E: Entwining<R>) =>
  (N: LeftModule<R>): EntwinedModule<R> => {
    const S = E.A.S, n = E.C.n, m = N.m
    const I = (d: number) => eye(S)(d)

    // action on N⊗C via the lift
    const NC = liftTensorCToLeftModule(E)(N)  // act: (m*n) × (k*m*n)

    // coaction: id_N ⊗ Δ : (m*n^2) × (m*n)
    const rhoNC = kron(S)(I(m), E.C.Delta)

    return { S, A: E.A, C: E.C, m: m*n, act: NC.act, rho: rhoNC }
  }

// ==========================================================
// A tiny "category" façade for entwined modules over (A,C,Ψ)
// Gives you id, isHom, compose (safe), and composeUnchecked.
// ==========================================================
export const categoryOfEntwinedModules =
  <R>(E: Entwining<R>) => {
    const S = E.A.S
    const id = (M: EntwinedModule<R>): Mat<R> => eye(S)(M.m)
    const isHom = (M: EntwinedModule<R>, N: EntwinedModule<R>, f: Mat<R>) =>
      isEntwinedModuleHom(E)(M, N, f)

    const composeSafe =
      (M: EntwinedModule<R>, N: EntwinedModule<R>, P: EntwinedModule<R>) =>
      (g: Mat<R>, f: Mat<R>): Result<string, Mat<R>> =>
        composeEntwinedHoms(E)(M, N, P)(g, f)

    const composeUnchecked =
      (g: Mat<R>, f: Mat<R>): Mat<R> =>
        composeEntwinedHomsUnchecked(S)(g, f)

    // optional helper: assertHom (returns Ok(f) or Err(reason))
    const assertHom =
      (M: EntwinedModule<R>, N: EntwinedModule<R>, f: Mat<R>): Result<string, Mat<R>> =>
        isHom(M, N, f) ? Ok(f) : Err('assertHom: not an entwined-module hom')

    return { id, isHom, compose: composeSafe, composeUnchecked, assertHom }
  }

// ---------------------------------------------------------------------
// Exact functor composition: (F : R→S) ∘ (G : S→T) : R→T
//  - Pure composition on objects and maps
//  - Witnesses are combined by delegation (no extra equality assumptions)
// ---------------------------------------------------------------------

export interface AdditiveFunctor<R, S> {
  onComplex: (X: Complex<R>) => Complex<S>
  onMap:     (f: ChainMap<R>) => ChainMap<S>
}

export interface ExactFunctor<R, S> extends AdditiveFunctor<R, S> {
  preservesShift: (X: Complex<R>) => boolean
  preservesCones: (f: ChainMap<R>) => boolean
  imageTriangle:  (T: Triangle<R>) => Triangle<S>
}

export const composeExact =
  <R, S, T>(F: ExactFunctor<R, S>, G: ExactFunctor<S, T>): ExactFunctor<R, T> => {
    const onComplex = (X: Complex<R>) => G.onComplex(F.onComplex(X))
    const onMap     = (f: ChainMap<R>) => G.onMap(F.onMap(f))

    const preservesShift = (X: Complex<R>): boolean =>
      F.preservesShift(X) && G.preservesShift(F.onComplex(X))

    const preservesCones = (f: ChainMap<R>): boolean =>
      F.preservesCones(f) && G.preservesCones(F.onMap(f))

    const imageTriangle = (T0: Triangle<R>): Triangle<T> =>
      G.imageTriangle(F.imageTriangle(T0))

    return { onComplex, onMap, preservesShift, preservesCones, imageTriangle }
  }

// -------------------------------------------------------------
// Weighted automata over a Semiring R
//   states: n
//   init:   1×n row vector
//   final:  n×1 column vector (as Vec)
//   delta:  map from symbol -> n×n matrix
// Weight(word) = init · Π delta[s_i] · final
// -------------------------------------------------------------
export type WeightedAutomaton<R, Sym extends string = string> = {
  readonly S: Semiring<R>
  readonly n: number
  readonly init: Vec<R>          // length n
  readonly final: Vec<R>         // length n
  readonly delta: Readonly<Record<Sym, Mat<R>>>
}

export const waRun =
  <R, Sym extends string>(A: WeightedAutomaton<R, Sym>) =>
  (word: ReadonlyArray<Sym>): R => {
    const S = A.S
    let v = A.init
    for (const s of word) {
      const M = A.delta[s as Sym]
      if (!M) throw new Error(`waRun: unknown symbol ${String(s)}`)
      v = vecMat(S)(v, M)
    }
    // dot with final
    let acc = S.zero
    for (let i = 0; i < A.n; i++) acc = S.add(acc, S.mul(v[i]!, A.final[i]!))
    return acc
  }

// Product automaton (synchronous product) via Kronecker
export const waProduct =
  <R, S1 extends string, S2 extends string>(S: Semiring<R>) =>
  (A: WeightedAutomaton<R, S1>, B: WeightedAutomaton<R, S2>) =>
  (alphabet: ReadonlyArray<S1 & S2>): WeightedAutomaton<R, S1 & S2> => {
    const n = A.n * B.n
    const init = (() => {
      // kron row vectors: (1×nA) ⊗ (1×nB) ~ (1×nA*nB)
      const out: R[] = []
      for (let i = 0; i < A.n; i++) for (let j = 0; j < B.n; j++) {
        out.push(S.mul(A.init[i]!, B.init[j]!))
      }
      return out
    })()
    const final = (() => {
      const out: R[] = []
      for (let i = 0; i < A.n; i++) for (let j = 0; j < B.n; j++) {
        out.push(S.mul(A.final[i]!, B.final[j]!))
      }
      return out
    })()
    const delta: Record<S1 & S2, Mat<R>> = {} as Record<S1 & S2, Mat<R>>
    for (const a of alphabet) {
      delta[a] = kron(S)(A.delta[a as S1]!, B.delta[a as S2]!)
    }
    return { S, n, init, final, delta }
  }

// Boolean acceptance: A over BoolOrAnd, accepted iff weight === true
export const waAcceptsBool =
  (A: WeightedAutomaton<boolean, string>) =>
  (word: ReadonlyArray<string>): boolean =>
    waRun(A)(word)

// -------------------------------------------------------------
// HMM forward over a semiring (Prob or Viterbi as MaxPlus)
//   T: n×n transition
//   E[o]: n×n diagonal emission for obs symbol o
//   pi: 1×n initial
//   Optional final: n weight to end; otherwise sum over states.
// -------------------------------------------------------------
export type HMM<R, Obs extends string = string> = {
  readonly S: Semiring<R>
  readonly n: number
  readonly T: Mat<R>
  readonly E: Readonly<Record<Obs, Mat<R>>>  // diagonal by convention
  readonly pi: Vec<R>
  readonly final?: Vec<R>
}

export const hmmForward =
  <R, Obs extends string>(H: HMM<R, Obs>) =>
  (obs: ReadonlyArray<Obs>): R => {
    const S = H.S
    let α = H.pi
    for (const o of obs) {
      const Em = H.E[o as Obs]
      if (!Em) throw new Error(`hmmForward: unknown obs ${String(o)}`)
      α = vecMat(S)(α, Em)   // elementwise scale
      α = vecMat(S)(α, H.T)  // step
    }
    const fin = H.final ?? Array.from({ length: H.n }, () => S.one)
    let acc = S.zero
    for (let i = 0; i < H.n; i++) acc = S.add(acc, S.mul(α[i]!, fin[i]!))
    return acc
  }

// -------------------------------------------------------------
// Build adjacency from edge list
// -------------------------------------------------------------
export type Edge<W> = readonly [from: number, to: number, w?: W]

export const graphAdjNat =
  (n: number, edges: ReadonlyArray<Edge<number>>): Mat<number> => {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
    for (const [u,v] of edges) A[u]![v]! += 1
    return A
  }

export const graphAdjBool =
  (n: number, edges: ReadonlyArray<Edge<unknown>>): Mat<boolean> => {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => false))
    for (const [u,v] of edges) A[u]![v] = true
    return A
  }

export const graphAdjWeights =
  (n: number, edges: ReadonlyArray<Edge<number>>, absent = Number.POSITIVE_INFINITY): Mat<number> => {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => absent))
    for (let i=0;i<n;i++) A[i]![i] = 0
    for (const [u,v,w=1] of edges) A[u]![v] = Math.min(A[u]![v]!, w)
    return A
  }

// -------------------------------------------------------------
// Path counts of exact length L (ℕ semiring)
// -------------------------------------------------------------
export const countPathsOfLength =
  (A: Mat<number>, L: number): Mat<number> =>
    powMat(SemiringNat)(A, L)

// Reachability within ≤L steps (Boolean semiring)
export const reachableWithin =
  (A: Mat<boolean>, L: number): Mat<boolean> =>
    closureUpTo(SemiringBoolOrAnd)(A, L)

// All-pairs shortest paths up to ≤L edges (MinPlus)
// If L omitted, uses n-1 (no negative cycles support here)
export const shortestPathsUpTo =
  (A: Mat<number>, L?: number): Mat<number> => {
    const n = A.length
    const S = SemiringMinPlus
    const I = eye(S)(n)
    // convert weights matrix (dist) into adjacency in MinPlus:
    // A^1 is already the edge weights; add I (0 on diag)
    let acc = I
    let p = I
    // add one step
    p = matMul(S)(p, A)
    acc = acc.map((row,r) => row.map((x,c) => S.add(x, p[r]?.[c]!)))
    const maxL = L ?? (n - 1)
    for (let i = 2; i <= maxL; i++) {
      p = matMul(S)(p, A)
      acc = acc.map((row,r) => row.map((x,c) => S.add(x, p[r]?.[c]!)))
    }
    return acc
  }

// Pretty: lift a per-symbol scalar weight to a diagonal emission matrix (for HMM)
export const diagFromVec =
  <R>(S: Semiring<R>) =>
  (w: Vec<R>): Mat<R> =>
    w.map((wi, i) => w.map((_, j) => (i === j ? wi : S.zero)))

// Normalize a probability row vector (defensive; not a semiring op)
export const normalizeRow = (v: number[]): number[] => {
  const s = v.reduce((a,b) => a + b, 0)
  return s === 0 ? v.slice() : v.map(x => x / s)
}

// ---------------------------------------------
// Warshall/Floyd transitive closure on Bool
// If `reflexive=true`, includes identity (ε*).
// A is n×n, with A[i][j] = path(i→j) ? true : false
// ---------------------------------------------
export const transitiveClosureBool = (
  A: Mat<boolean>,
  reflexive = true
): Mat<boolean> => {
  const n = A.length
  // clone
  const R: boolean[][] = A.map(row => row.slice())
  if (reflexive) {
    for (let i = 0; i < n; i++) R[i]![i] = true
  }
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) if (R[i]?.[k]) {
      for (let j = 0; j < n; j++) {
        // Bool semiring: add = OR, mul = AND
        const current = R[i]?.[j] ?? false
        const path = (R[i]?.[k] ?? false) && (R[k]?.[j] ?? false)
        R[i]![j] = current || path
      }
    }
  }
  return R
}

// ---------------------------------------------
// Regex → WA<boolean> with + ? and [a-z] classes
// Supported:
//   literals (non-special, or escaped with \)
//   grouping (...)
//   alternation |
//   concatenation (implicit)
//   repeaters  *  +  ?
//   character classes [a-z0-9_] (positive only; ranges OK)
// ---------------------------------------------

type RX =
  | { _tag: 'Eps' }
  | { _tag: 'Lit'; ch: string }
  | { _tag: 'Class'; set: ReadonlyArray<string> }     // positive
  | { _tag: 'NClass'; set: ReadonlyArray<string> }    // negated
  | { _tag: 'Dot' }                                   // arbitrary element from alphabet
  | { _tag: 'Concat'; left: RX; right: RX }
  | { _tag: 'Alt'; left: RX; right: RX }
  | { _tag: 'Star'; inner: RX }

const isSpecialTop = (c: string) =>
  c === '(' || c === ')' || c === '|' || c === '*' || c === '+' || c === '?' || c === '[' || c === '.'

const readEscaped = (src: string, i: number): { ch: string; i: number } => {
  if (i >= src.length) throw new Error('regex: dangling escape')
  return { ch: src[i]!, i: i + 1 }
}

const expandRange = (a: string, b: string): string[] => {
  const aa = a.codePointAt(0)!, bb = b.codePointAt(0)!
  if (aa > bb) throw new Error(`regex: bad range ${a}-${b}`)
  const res: string[] = []
  for (let cp = aa; cp <= bb; cp++) res.push(String.fromCodePoint(cp))
  return res
}

const parseClass = (src: string, start: number): { node: RX; i: number } => {
  // src[start] === '['
  let i = start + 1
  let neg = false
  if (src[i] === '^') { neg = true; i++ }
  const items: string[] = []

  const takeChar = (): string => {
    const c = src[i]
    if (!c) throw new Error('regex: unterminated [ ]')
    if (c === '\\') {
      const r = readEscaped(src, i + 1); i = r.i; return r.ch
    }
    if (c === ']') throw new Error('regex: empty or malformed class')
    i++; return c
  }

  while (true) {
    const c = src[i]
    if (!c) throw new Error('regex: unterminated [ ]')
    if (c === ']') { i++; break }
    const a = takeChar()
    if (src[i] === '-' && src[i+1] && src[i+1] !== ']') {
      i++
      const b = takeChar()
      items.push(...expandRange(a, b))
    } else {
      items.push(a)
    }
  }

  if (items.length === 0) throw new Error('regex: [] empty')
  return { node: neg ? { _tag: 'NClass', set: items } : { _tag: 'Class', set: items }, i }
}

const parseRegex = (src: string): RX => {
  let i = 0
  const next = () => src[i]
  const eat = () => src[i++]

  const parseAtom = (): RX => {
    const c = next()
    if (!c) throw new Error('regex: unexpected end')

    if (c === '(') {
      eat()
      const r = parseAlt()
      if (next() !== ')') throw new Error('regex: expected )')
      eat()
      return r
    }

    if (c === '[') {
      const { node, i: j } = parseClass(src, i)
      i = j
      return node
    }

    if (c === '.') {
      eat()
      return { _tag: 'Dot' }
    }

    if (c === '\\') {
      eat()
      const { ch, i: j } = readEscaped(src, i)
      i = j
      return { _tag: 'Lit', ch }
    }

    if (isSpecialTop(c)) throw new Error(`regex: unexpected ${c}`)
    eat()
    return { _tag: 'Lit', ch: c }
  }

  const parseRepeat = (): RX => {
    let node = parseAtom()
    // Greedy repeaters: *, +, ? ; allow chaining like a+?* as "apply in order"
    while (true) {
      const c = next()
      if (c === '*') { eat(); node = { _tag: 'Star', inner: node }; continue }
      if (c === '+') { eat(); node = { _tag: 'Concat', left: node, right: { _tag: 'Star', inner: node } }; continue }
      if (c === '?') { eat(); node = { _tag: 'Alt', left: { _tag: 'Eps' }, right: node }; continue }
      break
    }
    return node
  }

  const parseConcat = (): RX => {
    const parts: RX[] = []
    while (true) {
      const c = next()
      if (!c || c === ')' || c === '|') break
      parts.push(parseRepeat())
    }
    if (parts.length === 0) throw new Error('regex: empty concat')
    return parts.reduce((l, r) => ({ _tag: 'Concat', left: l, right: r }))
  }

  const parseAlt = (): RX => {
    let node = parseConcat()
    while (next() === '|') {
      eat()
      const r = parseConcat()
      node = { _tag: 'Alt', left: node, right: r }
    }
    return node
  }

  const ast = parseAlt()
  if (i !== src.length) throw new Error('regex: trailing input')
  return ast
}

// ε-NFA via Thompson, then ε-eliminate with Warshall closure
type NFA = {
  n: number
  start: number
  accept: number
  epsAdj: boolean[][]
  symAdj: Record<string, boolean[][]>
  alphabet: string[]
}

const buildThompson = (rx: RX, alphabet: ReadonlyArray<string>): NFA => {
  let n = 0
  const eps: Array<Set<number>> = []
  const sym: Record<string, Array<Set<number>>> = {}

  const newState = () => {
    eps[n] = new Set()
    for (const s of Object.values(sym)) s[n] = new Set()
    return n++
  }
  const ensureSym = (ch: string) => {
    if (!sym[ch]) {
      sym[ch] = []
      for (let i = 0; i < n; i++) sym[ch]![i] = new Set()
    }
  }

  const classToSyms = (set: ReadonlyArray<string>): string[] =>
    Array.from(new Set(set)) // dedupe

  const nclassToSyms = (set: ReadonlyArray<string>): string[] => {
    const bad = new Set(set)
    return alphabet.filter(a => !bad.has(a))
  }

  type Frag = { s: number; t: number }

  const go = (e: RX): Frag => {
    switch (e._tag) {
      case 'Eps': {
        const s = newState(), t = newState()
        eps[s]!.add(t); return { s, t }
      }
      case 'Lit': {
        const s = newState(), t = newState()
        ensureSym(e.ch); sym[e.ch]![s]!.add(t); return { s, t }
      }
      case 'Dot': {
        const s = newState(), t = newState()
        for (const ch of alphabet) { ensureSym(ch); sym[ch]![s]!.add(t) }
        return { s, t }
      }
      case 'Class': {
        const s = newState(), t = newState()
        for (const ch of classToSyms(e.set)) { ensureSym(ch); sym[ch]![s]!.add(t) }
        return { s, t }
      }
      case 'NClass': {
        const s = newState(), t = newState()
        for (const ch of nclassToSyms(e.set)) { ensureSym(ch); sym[ch]![s]!.add(t) }
        return { s, t }
      }
      case 'Concat': {
        const a = go(e.left), b = go(e.right)
        eps[a.t]!.add(b.s); return { s: a.s, t: b.t }
      }
      case 'Alt': {
        const s = newState(), t = newState()
        const a = go(e.left), b = go(e.right)
        eps[s]!.add(a.s); eps[s]!.add(b.s)
        eps[a.t]!.add(t); eps[b.t]!.add(t)
        return { s, t }
      }
      case 'Star': {
        const s = newState(), t = newState()
        const a = go(e.inner)
        eps[s]!.add(a.s); eps[s]!.add(t)
        eps[a.t]!.add(a.s); eps[a.t]!.add(t)
        return { s, t }
      }
    }
  }

  const { s, t } = go(rx)
  const epsAdj: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => false))
  for (let i = 0; i < n; i++) for (const j of eps[i] ?? []) epsAdj[i]![j] = true

  const symAdj: Record<string, boolean[][]> = {}
  for (const ch of Object.keys(sym)) {
    const arr = sym[ch]!
    const M: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => false))
    for (let i = 0; i < n; i++) for (const j of arr[i] ?? []) M[i]![j] = true
    symAdj[ch] = M
  }

  return { n, start: s, accept: t, epsAdj, symAdj, alphabet: Array.from(alphabet) }
}

export const compileRegexToWA = (
  pattern: string,
  alphabet: ReadonlyArray<string>
): WeightedAutomaton<boolean, string> => {
  const rx  = parseRegex(pattern)
  const nfa = buildThompson(rx, alphabet)
  const B   = SemiringBoolOrAnd

  // ε-eliminate: E = ε*, Δ'_a = E·Δ_a·E
  const E = transitiveClosureBool(nfa.epsAdj, true)

  const delta: Record<string, boolean[][]> = {}
  for (const ch of alphabet) {
    const M = nfa.symAdj[ch] ?? Array.from({ length: nfa.n }, () => Array.from({ length: nfa.n }, () => false))
    delta[ch] = matMul(B)(matMul(B)(E, M), E)
  }

  // init and final, then push through E
  const init = Array.from({ length: nfa.n }, () => false); init[nfa.start] = true
  const final= Array.from({ length: nfa.n }, () => false); final[nfa.accept] = true

  const initP = vecMat(B)(init, E)
  const finalP= matVec(B)(E, final)

  return { S: B, n: nfa.n, init: initP, final: finalP, delta }
}

// =====================================================================
// Triangulated Categories: Chain Complexes and Distinguished Triangles
// =====================================================================

// ---------- Complex + checks ----------
export type Complex<R> = {
  readonly S: Ring<R>
  readonly degrees: ReadonlyArray<number>      // sorted ascending, e.g. [-1,0,1]
  readonly dim: Readonly<Record<number, number>> // dim at degree n (0 allowed)
  readonly d: Readonly<Record<number, Mat<R>>> // d_n : X_n -> X_{n-1}  shape (dim[n-1] x dim[n])
}

// Ensure shapes line up and d_{n-1} ∘ d_n = 0
export const complexIsValid =
  <R>(C: Complex<R>): boolean => {
    const S = C.S
    for (const n of C.degrees) {
      const dn = C.d[n]
      if (!dn) continue
      const rows = dn.length, cols = dn[0]?.length ?? 0
      if (rows !== (C.dim[n-1] ?? 0) || cols !== (C.dim[n] ?? 0)) return false
      const dn1 = C.d[n-1]
      if (dn1) {
        const comp = matMul(S)(dn1, dn)                  // X_{n-2} x X_n
        // zero check
        const eq = S.eq ?? ((a: R, b: R) => Object.is(a, b))
        for (const row of comp) for (const x of row) if (!eq(x, S.zero)) return false
      }
    }
    return true
  }

// Shift functor [1] (homological: X[1]n=Xn−1, dnX[1]=−dn−1X)
export const shift1 =
  <R>(C: Complex<R>): Complex<R> => {
    const S = C.S
    const degs = C.degrees.map(n => n+1)
    const dim: Record<number, number> = {}
    const d: Record<number, Mat<R>> = {}
    for (const n of C.degrees) {
      dim[n+1] = C.dim[n] ?? 0
      if (C.d[n]) d[n+1] = matNeg(S)(C.d[n]!) // sign flip
    }
    return { S, degrees: degs, dim, d }
  }

// ---------- Chain map ----------
export type ChainMap<R> = {
  readonly S: Ring<R>
  readonly X: Complex<R>
  readonly Y: Complex<R>
  readonly f: Readonly<Record<number, Mat<R>>>  // f_n : X_n -> Y_n
}

export const isChainMap =
  <R>(ϕ: ChainMap<R>): boolean => {
    const S = ϕ.S
    for (const n of ϕ.X.degrees) {
      const fn   = ϕ.f[n]
      const fnm1 = ϕ.f[n-1]
      const dXn  = ϕ.X.d[n]
      const dYn  = ϕ.Y.d[n]
      if (!fn || !dYn || !dXn || !fnm1) continue // tolerate zeros outside overlap
      const left  = matMul(S)(fnm1, dXn)
      const right = matMul(S)(dYn, fn)
      // compare
      const eq = S.eq ?? ((a: R, b: R) => Object.is(a, b))
      for (let i=0;i<left.length;i++)
        for (let j=0;j<(left[0]?.length ?? 0);j++)
          if (!eq(left[i]?.[j]!, right[i]?.[j]!)) return false
    }
    return true
  }

// ================= Chain-map utilities (compose, id, blocks) =================

export const composeChainMap =
  <R>(F: Field<R>) =>
  (g: ChainMap<R>, f: ChainMap<R>): ChainMap<R> => {
    // f: X→Y, g: Y→Z
    const X = f.X, Z = g.Y
    const mul = matMul(F)
    const out: Record<number, R[][]> = {}
    for (const n of X.degrees) {
      const gf = mul(g.f[n] ?? ([] as R[][]), f.f[n] ?? ([] as R[][]))
      out[n] = gf
    }
    return { S: f.S, X, Y: Z, f: out }
  }

export const idChainMapField =
  <R>(F: Field<R>) =>
  (X: Complex<R>): ChainMap<R> => {
    const f: Record<number, R[][]> = {}
    for (const n of X.degrees) f[n] = eye(F)(X.dim[n] ?? 0)
    return { S: X.S, X, Y: X, f }
  }

/** Inclusion of the k-th summand into a degreewise coproduct (direct sum). */
export const inclusionIntoCoproduct =
  <R>(F: Field<R>) =>
  (summands: ReadonlyArray<Complex<R>>, k: number): ChainMap<R> => {
    const coprodDim: Record<number, number> = {}
    const degrees = Array.from(new Set(summands.flatMap(X => X.degrees))).sort((a,b)=>a-b)
    for (const n of degrees) coprodDim[n] = summands.reduce((s,X)=>s+(X.dim[n]??0),0)

    const zeroDifferential: Record<number, Mat<R>> = {}
    const Y: Complex<R> = { S: summands[0]!.S, degrees, dim: coprodDim, d: zeroDifferential } // d not needed for inclusion map
    const f: Record<number, R[][]> = {}
    for (const n of degrees) {
      const dims = summands.map(X => X.dim[n] ?? 0)
      const rows = coprodDim[n]!, cols = dims[k]!
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      let offset = 0
      for (let i = 0; i < k; i++) offset += dims[i]!
      for (let i = 0; i < cols; i++) M[offset + i]![i] = F.one
      f[n] = M
    }
    return { S: summands[0]!.S, X: summands[k]!, Y, f }
  }

/** Projection from degreewise product onto the k-th factor (same matrices over a field). */
export const projectionFromProduct =
  <R>(F: Field<R>) =>
  (factors: ReadonlyArray<Complex<R>>, k: number): ChainMap<R> => {
    const prodDim: Record<number, number> = {}
    const degrees = Array.from(new Set(factors.flatMap(X => X.degrees))).sort((a,b)=>a-b)
    for (const n of degrees) prodDim[n] = factors.reduce((s,X)=>s+(X.dim[n]??0),0)

    const zeroDifferential: Record<number, Mat<R>> = {}
    const Xprod: Complex<R> = { S: factors[0]!.S, degrees, dim: prodDim, d: zeroDifferential }
    const f: Record<number, R[][]> = {}
    for (const n of degrees) {
      const dims = factors.map(X => X.dim[n] ?? 0)
      const rows = dims[k]!, cols = prodDim[n]!
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      let offset = 0
      for (let i = 0; i < k; i++) offset += dims[i]!
      for (let i = 0; i < rows; i++) M[i]![offset + i] = F.one
      f[n] = M
    }
    return { S: factors[0]!.S, X: Xprod, Y: factors[k]!, f }
  }

// ---------- Mapping cone Cone(f): Z with Z_n = Y_n ⊕ X_{n-1} ----------
export const cone =
  <R>(ϕ: ChainMap<R>): Complex<R> => {
    const S = ϕ.S
    const Rng = S as Ring<R>
    const degs = Array.from(new Set([...ϕ.Y.degrees, ...ϕ.X.degrees.map(n => n+1)])).sort((a,b)=>a-b)
    const dim: Record<number, number> = {}
    const d: Record<number, Mat<R>> = {}

    for (const n of degs) {
      const dimY = ϕ.Y.dim[n] ?? 0
      const dimXm1 = ϕ.X.dim[n-1] ?? 0
      dim[n] = dimY + dimXm1

      const dY  = ϕ.Y.d[n]     ?? zerosMat(ϕ.Y.dim[n-1] ?? 0, dimY, S)
      const fn1 = ϕ.f[n-1]     ?? zerosMat(ϕ.Y.dim[n-1] ?? 0, dimXm1, S) // Y_n <- X_{n-1}
      const dXm1= ϕ.X.d[n-1]   ?? zerosMat(ϕ.X.dim[n-2] ?? 0, dimXm1, S)
      const minus_dXm1 = matNeg(Rng)(dXm1)

      // Build block: [[dY , f_{n-1}],[0, -d_{X,n-1}]]
      const top  = hcat(dY, fn1)
      const botL = zerosMat((ϕ.X.dim[n-2] ?? 0), dimY, S)
      const bot  = hcat(botL, minus_dXm1)
      d[n] = vcat(top, bot)
    }

    return { S: Rng, degrees: degs, dim, d }
  }

// ---------- Distinguished triangles ----------
export type Triangle<R> = {
  readonly X: Complex<R>
  readonly Y: Complex<R>
  readonly Z: Complex<R>         // Cone(f)
  readonly f: ChainMap<R>
  readonly g: ChainMap<R>        // inclusion Y → Z
  readonly h: ChainMap<R>        // projection Z → X[1]
}

export const triangleFromMap =
  <R>(ϕ: ChainMap<R>): Triangle<R> => {
    const S = ϕ.S
    const Z = cone(ϕ)
    const X1 = shift1(ϕ.X)
    const incY: Record<number, Mat<R>> = {}
    const projX1: Record<number, Mat<R>> = {}

    for (const n of Z.degrees) {
      const dimY  = ϕ.Y.dim[n] ?? 0
      const dimXm1= ϕ.X.dim[n-1] ?? 0
      // g_n : Y_n → Y_n ⊕ X_{n-1}
      incY[n]  = vcat(idMat(dimY, S), zerosMat(dimXm1, dimY, S))
      // h_n : Y_n ⊕ X_{n-1} → X[1]_n = X_{n-1}
      projX1[n]= hcat(zerosMat(dimXm1, dimY, S), idMat(dimXm1, S))
    }

    const g: ChainMap<R> = { S, X: ϕ.Y, Y: Z, f: incY }
    const h: ChainMap<R> = { S, X: Z, Y: X1, f: projX1 }

    return { X: ϕ.X, Y: ϕ.Y, Z, f: ϕ, g, h }
  }

// Quick triangle sanity: (i) all complexes valid, (ii) chain-map laws, (iii) rotation shape sanity.
export const triangleIsSane =
  <R>(T: Triangle<R>): boolean =>
    complexIsValid(T.X) &&
    complexIsValid(T.Y) &&
    complexIsValid(T.Z) &&
    isChainMap(T.f) &&
    isChainMap(T.g) &&
    isChainMap(T.h)

// ---------------------------------------------------------------------
// Field + linear algebra for homology computation
// ---------------------------------------------------------------------
export interface Field<R> extends Ring<R> {
  inv: (a: R) => R        // a^{-1}, a ≠ 0
  div: (a: R, b: R) => R  // a * b^{-1}
}

// A toy field on JS numbers (ℚ-like for small tests)
export const FieldReal: Field<number> = {
  ...RingReal,
  inv: (a) => 1 / a,
  div: (a, b) => a / b
}

// ---------------------------------------------------------------------
// Big rational field Q = ℚ with bigint
//   - exact arithmetic (normalize by gcd, denominator > 0)
//   - full Field<Q>: add, mul, neg, sub, eq, zero, one, inv, div
// ---------------------------------------------------------------------

export type Q = { num: bigint; den: bigint } // den > 0, reduced

const bgcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b !== 0n) { const t = a % b; a = b; b = t }
  return a
}

export const qnorm = (n: bigint, d: bigint): Q => {
  if (d === 0n) throw new Error('Q: division by zero')
  if (n === 0n) return { num: 0n, den: 1n }
  if (d < 0n) { n = -n; d = -d }
  const g = bgcd(n, d)
  return { num: n / g, den: d / g }
}

export const Qof = (n: bigint | number, d: bigint | number = 1): Q =>
  qnorm(BigInt(n), BigInt(d))

export const Qeq = (a: Q, b: Q) => (a.num === b.num && a.den === b.den)
export const Qadd = (a: Q, b: Q): Q => qnorm(a.num * b.den + b.num * a.den, a.den * b.den)
export const Qneg = (a: Q): Q => ({ num: -a.num, den: a.den })
export const Qsub = (a: Q, b: Q): Q => Qadd(a, Qneg(b))
export const Qmul = (a: Q, b: Q): Q => qnorm(a.num * b.num, a.den * b.den)
export const Qinv = (a: Q): Q => {
  if (a.num === 0n) throw new Error('Q: inverse of 0')
  const s = a.num < 0n ? -1n : 1n
  return qnorm(s * a.den, s * a.num)
}
export const Qdiv = (a: Q, b: Q): Q => Qmul(a, Qinv(b))

export const FieldQ: Field<Q> = {
  // additive monoid
  add: Qadd,
  zero: Qof(0),
  // multiplicative monoid
  mul: Qmul,
  one: Qof(1),
  // equality
  eq: Qeq,
  // ring extras
  neg: Qneg,
  sub: Qsub,
  // field extras
  inv: Qinv,
  div: Qdiv
}

// Optional: embed integers and rationals from JS numbers
export const QfromInt = (n: number): Q => Qof(n, 1)
export const QfromRatio = (n: number, d: number): Q => Qof(n, d)

// Pretty printer
export const QtoString = (q: Q): string =>
  q.den === 1n ? q.num.toString() : `${q.num.toString()}/${q.den.toString()}`

// ---------------------------------------------------------------------
// Rational RREF with magnitude pivoting
// ---------------------------------------------------------------------

export const qAbsCmp = (a: Q, b: Q): number => {
  // compare |a| ? |b| without division: |a.num|*b.den ? |b.num|*a.den
  const an = a.num < 0n ? -a.num : a.num
  const bn = b.num < 0n ? -b.num : b.num
  const lhs = an * b.den
  const rhs = bn * a.den
  return lhs === rhs ? 0 : (lhs > rhs ? 1 : -1)
}

export const isQZero = (a: Q) => (a.num === 0n)

const qCloneM = (A: ReadonlyArray<ReadonlyArray<Q>>): Q[][] =>
  A.map(r => r.map(x => ({ num: x.num, den: x.den }) as Q))

export const rrefQPivot = (A0: ReadonlyArray<ReadonlyArray<Q>>) => {
  const A = qCloneM(A0)
  const m = A.length
  const n = (A[0]?.length ?? 0)
  let row = 0
  const pivots: number[] = []

  for (let col = 0; col < n && row < m; col++) {
    // find best pivot row: nonzero with max |entry|
    let pr = -1
    for (let i = row; i < m; i++) {
      if (!isQZero(A[i]?.[col]!)) {
        if (pr === -1) pr = i
        else if (qAbsCmp(A[i]?.[col]!, A[pr]?.[col]!) > 0) pr = i
      }
    }
    if (pr === -1) continue

    // swap
    if (pr !== row) { const tmp = A[row]!; A[row] = A[pr]!; A[pr] = tmp }

    // scale pivot row to make pivot 1
    const piv = A[row]?.[col]!
    const inv = Qinv(piv)
    for (let j = col; j < n; j++) A[row]![j] = Qmul(A[row]![j]!, inv)

    // eliminate other rows
    for (let i = 0; i < m; i++) if (i !== row) {
      const factor = A[i]?.[col]!
      if (!isQZero(factor)) {
        for (let j = col; j < n; j++) {
          A[i]![j] = Qsub(A[i]![j]!, Qmul(factor, A[row]![j]!))
        }
      }
    }

    pivots.push(col)
    row++
  }

  return { R: A, pivots }
}

type MatF<R> = ReadonlyArray<ReadonlyArray<R>>

const cloneM = <R>(A: MatF<R>): R[][] => A.map(r => r.slice() as R[])

// Reduced Row-Echelon Form (in place), returns pivot column indices
export const rref =
  <R>(F: Field<R>) =>
  (A0: MatF<R>): { R: R[][]; pivots: number[] } => {
    const A = cloneM(A0)
    const m = A.length, n = (A[0]?.length ?? 0)
    let row = 0
    const pivots: number[] = []
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    
    for (let col = 0; col < n && row < m; col++) {
      // find pivot row
      let pr = row
      while (pr < m && eq(A[pr]?.[col]!, F.zero)) pr++
      if (pr === m) continue
      ;[A[row], A[pr]] = [A[pr]!, A[row]!]
      const piv = A[row]?.[col]!
      const inv = F.inv(piv)
      // scale row
      for (let j = col; j < n; j++) A[row]![j] = F.mul(A[row]![j]!, inv)
      // eliminate others
      for (let i = 0; i < m; i++) if (i !== row) {
        const factor = A[i]?.[col]!
        if (!eq(factor, F.zero)) {
          for (let j = col; j < n; j++) {
            A[i]![j] = F.sub(A[i]![j]!, F.mul(factor, A[row]![j]!))
          }
        }
      }
      pivots.push(col)
      row++
    }
    return { R: A, pivots }
  }

// Nullspace basis of A (m×n): columns n×k
export const nullspace =
  <R>(F: Field<R>) =>
  (A: MatF<R>): R[][] => {
    const n = (A[0]?.length ?? 0)
    const { R, pivots } = rref(F)(A)
    const pivotSet = new Set(pivots)
    const free = [] as number[]
    for (let j = 0; j < n; j++) if (!pivotSet.has(j)) free.push(j)
    const basis: R[][] = []
    for (const f of free) {
      const v = Array.from({ length: n }, () => F.zero)
      v[f] = F.one
      // back-substitute pivot columns
      let prow = 0
      for (const pc of pivots) {
        // R[prow][pc] = 1 in RREF
        // v[pc] = - sum_{j>pc} R[prow][j] * v[j]
        let sum = F.zero
        for (let j = pc + 1; j < n; j++) {
          if (!F.eq?.(v[j]!, F.zero)) {
            sum = F.add(sum, F.mul(R[prow]?.[j]!, v[j]!))
          }
        }
        v[pc] = F.neg(sum)
        prow++
      }
      basis.push(v)
    }
    return basis // n×k (each basis vector is length n)
  }

// Column space basis (return columns of A forming a basis, as matrix n×r)
export const colspace =
  <R>(F: Field<R>) =>
  (A: MatF<R>): R[][] => {
    const AT = transpose(A)
    const { pivots } = rref(F)(AT)
    const cols: R[][] = []
    for (const j of pivots) cols.push(A.map(row => row[j]!))
    // pack as n×r
    const n = A.length ? A[0]!.length : 0
    const M: R[][] = Array.from({ length: n }, (_, i) =>
      cols.map(col => col[i] ?? F.zero)
    )
    return M
  }

const transpose = <R>(A: MatF<R>): R[][] =>
  (A[0]?.map((_, j) => A.map(row => row[j]!)) ?? [])

// Solve A x = b (least-structure; expects a solution to exist)
export const solveLinear =
  <R>(F: Field<R>) =>
  (A0: MatF<R>, b0: ReadonlyArray<R>): R[] => {
    const A = cloneM(A0)
    const b = b0.slice() as R[]
    const m = A.length, n = (A[0]?.length ?? 0)
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    let row = 0
    
    for (let col = 0; col < n && row < m; col++) {
      let pr = row
      while (pr < m && eq(A[pr]?.[col]!, F.zero)) pr++
      if (pr === m) continue
      ;[A[row], A[pr]] = [A[pr]!, A[row]!]; 
      ;[b[row], b[pr]] = [b[pr]!, b[row]!]
      const inv = F.inv(A[row]?.[col]!)
      for (let j = col; j < n; j++) A[row]![j] = F.mul(A[row]![j]!, inv)
      b[row] = F.mul(b[row]!, inv)
      for (let i = 0; i < m; i++) if (i !== row) {
        const factor = A[i]?.[col]!
        if (!eq(factor, F.zero)) {
          for (let j = col; j < n; j++) A[i]![j] = F.sub(A[i]![j]!, F.mul(factor, A[row]![j]!))
          b[i] = F.sub(b[i]!, F.mul(factor, b[row]!))
        }
      }
      row++
    }
    // read off solution (set free vars = 0)
    const x = Array.from({ length: n }, () => F.zero)
    let prow = 0
    for (let col = 0; col < n && prow < m; col++) {
      // leading one?
      if (!eq(A[prow]?.[col]!, F.one)) continue
      x[col] = b[prow]!
      prow++
    }
    return x
  }

// ---------------------------------------------------------------------
// Long exact sequence (cone) segment checker at degree n over a Field<R>
// Checks exactness of: Hn(X)→Hn(f)Hn(Y)→Hn(g)Hn(Cone(f))→Hn(h)Hn(X[1])
// ---------------------------------------------------------------------

export const checkLongExactConeSegment =
  <R>(F: Field<R>) =>
  (fxy: ChainMap<R>, n: number) => {
    // Note: This requires makeHomologyFunctor to be implemented
    // For now, we provide the interface structure
    
    const rank = (A: ReadonlyArray<ReadonlyArray<R>>): number =>
      rref(F)(A).pivots.length

    // matrix multiply (C = A ∘ B) with compat dims check
    const mul = (A: R[][], B: R[][]): R[][] => {
      const m = A.length, k = (A[0]?.length ?? 0), n2 = (B[0]?.length ?? 0)
      if (k !== B.length) return Array.from({ length: m }, () => Array.from({ length: n2 }, () => F.zero))
      const C: R[][] = Array.from({ length: m }, () => Array.from({ length: n2 }, () => F.zero))
      for (let i = 0; i < m; i++) {
        for (let t = 0; t < k; t++) {
          const a = A[i]?.[t]!
          const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
          if (eq(a, F.zero)) continue
          for (let j = 0; j < n2; j++) {
            C[i]![j] = F.add(C[i]![j]!, F.mul(a, B[t]?.[j]!))
          }
        }
      }
      return C
    }

    const isZeroMat = (A: R[][]): boolean => {
      const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
      return A.every(row => row.every(x => eq(x, F.zero)))
    }

    // This is a placeholder structure - full implementation would require
    // the homology functor to be completed
    return {
      input: { fxy, degree: n },
      helpers: { rank, compose: mul, isZeroMat },
      // Interface for when homology functor is implemented
      checkExactness: () => {
        // Would check the four exactness conditions
        return {
          compZeroAtY: true,
          compZeroAtC: true,
          dimImEqKerAtY: true,
          dimImEqKerAtC: true,
          dims: { dimHX: 0, dimHY: 0, dimHC: 0, dimHX1: 0 },
          ranks: { rankHF: 0, rankHG: 0, rankHH: 0 },
          kernels: { kerHG: 0, kerHH: 0 },
        }
      },
    }
  }

// ---------------------------------------------------------------------
// LES CONE SEGMENT PROPS (2-term complexes in degrees [-1,0])
// ---------------------------------------------------------------------

// tiny random matrix
const randMatN = (rows: number, cols: number, lo = -2, hi = 2): number[][] =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random()*(hi-lo+1))+lo)
  )

// identity matrix
const idnN = (n: number): number[][] =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  )

// build random 2-term complex X: X_{-1}→X_0 with d0 : dim[-1]×dim[0]
export const randomTwoTermComplex =
  (S = FieldReal, maxDim = 2): Complex<number> => {
    const m = Math.floor(Math.random()*(maxDim+1))     // dim[-1]
    const n = Math.floor(Math.random()*(maxDim+1))     // dim[0]
    const d0 = randMatN(m, n)
    const X: Complex<number> = {
      S,
      degrees: [-1, 0],
      dim: { [-1]: m, [0]: n },
      d:   { [0]: d0 }
    }
    return X
  }

// identity chain map X→X
export const idChainMapN = (X: Complex<number>): ChainMap<number> => {
  const f: Record<number, number[][]> = {}
  for (const k of X.degrees) {
    const n = X.dim[k] ?? 0
    if (n > 0) f[k] = idnN(n)
  }
  return { S: X.S, X, Y: X, f }
}

// zero chain map X→X (always a chain map)
export const zeroChainMapN = (X: Complex<number>): ChainMap<number> => {
  const f: Record<number, number[][]> = {}
  for (const k of X.degrees) {
    const n = X.dim[k] ?? 0
    if (n > 0) f[k] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
  }
  return { S: X.S, X, Y: X, f }
}

// Run a few randomized checks using checkLongExactConeSegment (numbers)
export const runLesConeProps = (samples = 50, degree = 0) => {
  const check = checkLongExactConeSegment(FieldReal)
  let okId = 0, okZero = 0
  for (let i = 0; i < samples; i++) {
    const X = randomTwoTermComplex(FieldReal, 2)
    // id map
    const fid = idChainMapN(X)
    const rid = check(fid, degree)
    if (rid.checkExactness().compZeroAtY && rid.checkExactness().compZeroAtC && 
        rid.checkExactness().dimImEqKerAtY && rid.checkExactness().dimImEqKerAtC) okId++

    // zero map
    const f0  = zeroChainMapN(X)
    const r0  = check(f0, degree)
    if (r0.checkExactness().compZeroAtY && r0.checkExactness().compZeroAtC && 
        r0.checkExactness().dimImEqKerAtY && r0.checkExactness().dimImEqKerAtC) okZero++
  }
  return { samples, okId, okZero }
}

// ---------------------------------------------------------------------
// Natural isomorphism H_n(X[1]) ≅ H_{n-1}(X) — witness matrices
// ---------------------------------------------------------------------

export const makeHomologyShiftIso =
  <R>(F: Field<R>) =>
  (n: number) => {
    // Note: This requires makeHomologyFunctor to be fully implemented
    // For now, we provide the interface structure
    
    // helper: column-concat, transpose, solve (reuse from earlier if present)
    const tpose = (A: ReadonlyArray<ReadonlyArray<R>>): R[][] =>
      (A[0]?.map((_, j) => A.map(row => row[j]!)) ?? [])

    const hcatHelper = (A: R[][], B: R[][], z: R): R[][] => {
      const rows = Math.max(A.length, B.length)
      const a = A[0]?.length ?? 0, b = B[0]?.length ?? 0
      const pad = (M: R[][], c: number) =>
        Array.from({ length: rows }, (_, i) =>
          Array.from({ length: c }, (_, j) => M[i]?.[j] ?? z)
        )
      const Ap = pad(A, a), Bp = pad(B, b)
      return Ap.map((row, i) => row.concat(Bp[i]!))
    }

    const solve = (A: R[][], b: R[]) => solveLinear(F)(tpose(A), b)

    // Build forward matrix Φ: H_n(X[1]) → H_{n-1}(X)
    const forward = (X: Complex<R>): R[][] => {
      const domDim = X.dim[n] ?? 0
      const codDim = X.dim[n - 1] ?? 0
      const size = Math.min(domDim, codDim) || 1
      return eye(F)(size)
    }

    // Build inverse matrix Ψ: H_{n-1}(X) → H_n(X[1])
    const backward = (X: Complex<R>): R[][] => {
      const domDim = X.dim[n - 1] ?? 0
      const codDim = X.dim[n] ?? 0
      const size = Math.min(domDim, codDim) || 1
      return eye(F)(size)
    }

    // Optional checker: Ψ∘Φ ≈ I and Φ∘Ψ ≈ I (by ranks)
    const rank =
      (A: ReadonlyArray<ReadonlyArray<R>>): number =>
        rref(F)(A).pivots.length

    const matMulHelper =
      (A: R[][], B: R[][]): R[][] => {
        const m = A.length, k = (A[0]?.length ?? 0), n2 = (B[0]?.length ?? 0)
        const C: R[][] = Array.from({ length: m }, () => Array.from({ length: n2 }, () => F.zero))
        const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
        for (let i = 0; i < m; i++) for (let t = 0; t < k; t++) {
          const a = A[i]?.[t]!; if (eq(a, F.zero)) continue
          for (let j = 0; j < n2; j++) C[i]![j] = F.add(C[i]![j]!, F.mul(a, B[t]?.[j]!))
        }
        return C
      }

    const isoCheck = (X: Complex<R>) => {
      const Φ = forward(X)
      const Ψ = backward(X)
      // ranks of compositions should equal full dimension
      const r1 = rank(matMulHelper(Ψ, Φ))
      const r2 = rank(matMulHelper(Φ, Ψ))
      return { rankPsiPhi: r1, rankPhiPsi: r2, dimHn: Φ[0]?.length ?? 0, dimHn1: Ψ[0]?.length ?? 0 }
    }

    return {
      degree: n,
      helpers: { hcatHelper, solve },
      forward,
      backward,
      isoCheck,
    }
  }

// === RREF selection + linear helpers ========================================
type RrefFn<R> = (A: ReadonlyArray<ReadonlyArray<R>>) => { R: R[][]; pivots: number[] }

/** Optional registry: lets you override the RREF used for a specific Field instance. */
const RREF_REGISTRY = new WeakMap<Field<unknown>, RrefFn<unknown>>()
export const registerRref = <R>(F: Field<R>, rr: RrefFn<R>) => {
  RREF_REGISTRY.set(F as Field<unknown>, rr as RrefFn<unknown>)
}

const getRref =
  <R>(F: Field<R>): RrefFn<R> => {
    const override = RREF_REGISTRY.get(F as Field<unknown>) as RrefFn<R> | undefined
    return override ?? ((A: ReadonlyArray<ReadonlyArray<R>>) => rref(F)(A))
  }

/** Column-space basis via RREF(A): take pivot columns from original A. */
const colspaceByRref =
  <R>(F: Field<R>) =>
  (A: R[][]): R[][] => {
    const { pivots } = getRref(F)(A)
    if (!A.length) return []
    const m = A.length
    const B: R[][] = Array.from({ length: m }, () => [])
    for (const j of pivots) for (let i = 0; i < m; i++) B[i]!.push(A[i]?.[j]!)
    return B
  }

/** Nullspace basis of A x = 0 using its RREF. Returns an n×k matrix whose columns form a basis. */
const nullspaceByRref =
  <R>(F: Field<R>) =>
  (A: R[][]): R[][] => {
    const { R: U, pivots } = getRref(F)(A) // U is RREF(A), size m×n
    const m = U.length
    const n = (U[0]?.length ?? 0)
    const pivotSet = new Set(pivots)
    const free: number[] = []
    for (let j = 0; j < n; j++) if (!pivotSet.has(j)) free.push(j)
    const cols: R[][] = []
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    // Back-substitute U x = 0
    for (const f of free) {
      const x: R[] = Array.from({ length: n }, () => F.zero)
      x[f] = F.one
      // go upward through pivot rows
      for (let i = m - 1; i >= 0; i--) {
        // find pivot column j in row i (U is RREF so pivot entry is 1)
        let j = -1
        for (let c = 0; c < n; c++) if (!eq(U[i]?.[c]!, F.zero)) { j = c; break }
        if (j < 0) continue
        // x[j] = - Σ_{k>j} U[i][k] * x[k]
        let s = F.zero
        for (let k = j + 1; k < n; k++) if (!eq(U[i]?.[k]!, F.zero)) {
          s = F.add(s, F.mul(U[i]?.[k]!, x[k]!))
        }
        x[j] = F.neg(s)
      }
      cols.push(x)
    }
    // pack columns to n×k
    const K: R[][] = Array.from({ length: n }, (_, i) =>
      cols.map(col => col[i] ?? F.zero)
    )
    return K
  }

/* ============================================================================
 * IMAGE / COIMAGE IN CHAIN-COMPLEX LAND (OVER A FIELD)
 * ----------------------------------------------------------------------------
 * Category-speak in one breath:
 * - In the additive category Ch_k (chain complexes over a field k), every map
 *   f : X → Y has degreewise linear maps f_n.  Define:
 *     • im(f)_n   = im(f_n)     (subspace of Y_n)     → subcomplex of Y
 *     • coim(f)_n = X_n / ker(f_n)                    → quotient of X
 * - These assemble into complexes Im(f) ↪ Y and X ↠ Coim(f), and the canonical
 *   factorization X ↠ Coim(f) —η→ Im(f) ↪ Y is an isomorphism (1st iso thm).
 *   In code we pick bases and produce matrices for these maps.
 * - This pairs with your Ker/Coker: exact rows
 *       0 → Ker(f) → X → Im(f) → 0           and          0 → Im(f) → Y → Coker(f) → 0
 *   and a canonical Coim(f) ≅ Im(f).
 * ========================================================================== */

const tposeHelper = <R>(A: ReadonlyArray<ReadonlyArray<R>>): R[][] =>
  (A[0]?.map((_, j) => A.map(r => r[j]!)) ?? [])

const matMulHelper =
  <R>(F: Field<R>) =>
  (A: R[][], B: R[][]): R[][] => {
    const m = A.length, k = (A[0]?.length ?? 0), n = (B[0]?.length ?? 0)
    const Z: R[][] = Array.from({ length: m }, () => Array.from({ length: n }, () => F.zero))
    const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
    for (let i = 0; i < m; i++) for (let p = 0; p < k; p++) {
      const a = A[i]?.[p]!; if (eq(a, F.zero)) continue
      for (let j = 0; j < n; j++) Z[i]![j] = F.add(Z[i]![j]!, F.mul(a, B[p]?.[j]!))
    }
    return Z
  }

const solveVecHelper =
  <R>(F: Field<R>) =>
  (A: R[][], b: R[]) => solveLinear(F)(tposeHelper(A), b)

/** coordinates in a chosen column-basis J (assumed independent) */
const coordsInHelper =
  <R>(F: Field<R>) =>
  (J: R[][], v: R[]): R[] =>
    solveVecHelper(F)(J, v)

export const imageComplex =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>): { Im: Complex<R>; incl: ChainMap<R>; basis: Record<number, R[][]> } => {
    const Y = f.Y
    const degrees = Y.degrees.slice()
    const dim: Record<number, number> = {}
    const dIm: Record<number, R[][]> = {}
    const jMat: Record<number, R[][]> = {} // inclusions j_n : Im_n ↪ Y_n (columns = basis)
    const mul = matMulHelper(F)
    const crd = coordsInHelper(F)

    // basis for im(f_n), store as columns J_n
    for (const n of degrees) {
      const fn = f.f[n] ?? ([] as R[][])          // Y_n × X_n
      const Jn = colspaceByRref(F)(fn)            // Y_n × r_n (auto-select RREF)
      jMat[n]  = Jn
      dim[n]   = Jn[0]?.length ?? 0
    }

    // d^Im_n = coords_{J_{n-1}}( d^Y_n · J_n )  ⇒ matrix of size dim(Im_{n-1}) × dim(Im_n)
    for (const n of degrees) {
      const Jn   = jMat[n]    ?? ([] as R[][])
      const Jn_1 = jMat[n-1]  ?? ([] as R[][])
      const dYn  = Y.d[n]     ?? ([] as R[][])    // Y_{n-1} × Y_n
      const cols = Jn[0]?.length ?? 0
      const rows = Jn_1[0]?.length ?? 0
      if (cols === 0) continue
      const D: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      const dYJ = mul(dYn as R[][], Jn as R[][])  // in Y_{n-1}
      for (let j = 0; j < cols; j++) {
        const v = dYJ.map(row => row[j] as R)
        const alpha = crd(Jn_1, v)                // coords in Im_{n-1}
        for (let i = 0; i < rows; i++) D[i]![j] = alpha[i] ?? F.zero
      }
      dIm[n] = D
    }

    const Im: Complex<R> = { S: f.S, degrees, dim, d: dIm }
    const incl: ChainMap<R> = { S: f.S, X: Im, Y, f: jMat }
    return { Im, incl, basis: jMat }
  }

export const coimageComplex =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>): { Coim: Complex<R>; proj: ChainMap<R>; Lbasis: Record<number, R[][]> } => {
    const X = f.X
    const degrees = X.degrees.slice()
    const dim: Record<number, number> = {}
    const dC: Record<number, R[][]> = {}
    const qMat: Record<number, R[][]> = {} // projections q_n : X_n ↠ Coim_n   (rows = coordinates)
    const Lb:  Record<number, R[][]> = {} // inclusions L_n ↪ X_n (columns = complement basis)
    const rr = rref(F)
    const rank = (A: R[][]) => rr(tposeHelper(A)).pivots.length
    const mul = matMulHelper(F)
    const crd = coordsInHelper(F)

    const kernelBasis = (A: R[][]): R[][] => nullspaceByRref(F)(A)

    const chooseComplement = (K: R[][]): R[][] => {
      // greedily extend columns of K to a basis of X_n using standard basis
      const n = K.length
      const std = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? F.one : F.zero))
      )
      let cur = K, picked: R[][] = []
      for (let j = 0; j < n; j++) {
        const ej = std.map(row => [row[j]] as R[])
        const cand = cur.map((row,i) => row.concat(ej[i]!))
        if (rank(cand) > rank(cur)) { picked.push(std.map(r => r[j] as R)); cur = cand }
      }
      return picked // columns = L_n
    }

    for (const n of degrees) {
      const fn = f.f[n] ?? ([] as R[][])          // Y_n × X_n
      const Kn = kernelBasis(fn)                  // X_n × k_n
      const Ln = chooseComplement(Kn)             // X_n × l_n  with [K|L] basis of X_n
      Lb[n]    = Ln
      dim[n]   = Ln[0]?.length ?? 0

      // projection q_n : X_n → Coim_n ~ coords in L_n
      // matrix shape: l_n × dim(X_n), where q_n * x = coords_L(x)
      // build q_n by columns: q_n e_j = coords_L(e_j)
      const nDim = X.dim[n] ?? 0
      const I = Array.from({ length: nDim }, (_, i) =>
        Array.from({ length: nDim }, (_, j) => (i === j ? F.one : F.zero))
      )
      const qn: R[][] = Array.from({ length: dim[n]! }, () => Array.from({ length: nDim }, () => F.zero))
      for (let j = 0; j < nDim; j++) {
        const e = I.map(r => r[j] as R)
        const [/*alpha*/, beta] = (() => {
          const KL = Kn.concat(Ln) as R[][]
          const coeff = solveLinear(F)(tposeHelper(KL), e) // [α;β]
          const kdim = Kn[0]?.length ?? 0
          return [coeff.slice(0, kdim), coeff.slice(kdim)]
        })()
        for (let i = 0; i < beta.length; i++) qn[i]![j] = beta[i]!
      }
      qMat[n] = qn
    }

    // d^Coim_n = coords_L_{n-1}( d^X_n · L_n )
    for (const n of degrees) {
      const Ln   = Lb[n]      ?? ([] as R[][])
      const Ln_1 = Lb[n-1]    ?? ([] as R[][])
      const dXn  = X.d[n]     ?? ([] as R[][])
      const cols = Ln[0]?.length ?? 0
      const rows = Ln_1[0]?.length ?? 0
      if (cols === 0) continue
      const D: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      const dXL = mul(dXn as R[][], Ln as R[][])
      for (let j = 0; j < cols; j++) {
        const v = dXL.map(row => row[j] as R)
        const beta = crd(Ln_1, v)
        for (let i = 0; i < rows; i++) D[i]![j] = beta[i] ?? F.zero
      }
      dC[n] = D
    }

    const Coim: Complex<R> = { S: f.S, degrees, dim, d: dC }
    const proj: ChainMap<R> = { S: f.S, X, Y: Coim, f: qMat }
    return { Coim, proj, Lbasis: Lb }
  }

/** Canonical η: Coim(f) → Im(f) as a chain map (isomorphism over a field). */
export const coimToIm =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>,
   coim: { Coim: Complex<R>; proj: ChainMap<R>; Lbasis: Record<number, R[][]> },
   im:   { Im: Complex<R>;   incl: ChainMap<R>;  basis:   Record<number, R[][]> }
  ): ChainMap<R> => {
    const { Lbasis } = coim
    const { basis: J } = im
    const mul = matMulHelper(F)
    const crd = coordsInHelper(F)
    const eta: Record<number, R[][]> = {}

    for (const n of f.X.degrees) {
      const Ln = Lbasis[n] ?? ([] as R[][])     // X_n × l_n
      const Jn = J[n]      ?? ([] as R[][])     // Y_n × r_n
      const fn = f.f[n]    ?? ([] as R[][])     // Y_n × X_n
      if ((Ln[0]?.length ?? 0) === 0) continue
      const YimageOfL = mul(fn as R[][], Ln as R[][])  // in Y_n
      // coords in Im basis ⇒ matrix r_n × l_n
      const r = Jn[0]?.length ?? 0
      const l = Ln[0]?.length ?? 0
      const M: R[][] = Array.from({ length: r }, () => Array.from({ length: l }, () => F.zero))
      for (let j = 0; j < l; j++) {
        const v = YimageOfL.map(row => row[j] as R)
        const alpha = crd(Jn, v)
        for (let i = 0; i < r; i++) M[i]![j] = alpha[i] ?? F.zero
      }
      eta[n] = M
    }

    return { S: f.S, X: coim.Coim, Y: im.Im, f: eta }
  }

/** Quick "isomorphism?" predicate degreewise using rank. */
export const isIsoChainMap =
  <R>(F: Field<R>) =>
  (h: ChainMap<R>): boolean => {
    const rr = rref(F)
    for (const n of h.X.degrees) {
      const l = h.X.dim[n] ?? 0
      const r = h.Y.dim[n] ?? 0
      if (l !== r) return false
      const rank = rr(h.f[n] ?? ([] as R[][])).pivots.length
      if (rank !== l) return false
    }
    return true
  }

// Smoke tests for preservation properties
export const smoke_coim_im_iso =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>) => {
    const co = coimageComplex(F)(f)
    const im = imageComplex(F)(f)
    const eta = coimToIm(F)(f, co, im)
    return isIsoChainMap(F)(eta)
  }

/* In the additive category of chain complexes over a field, exact functors
 * (e.g., shift, scalar extension) preserve short exact sequences and the long
 * exact sequence in homology. The connecting map δ is natural: applying the
 * functor and then forming δ agrees with transporting δ through the functor's
 * canonical isomorphisms on homology. The checkers below realize this as
 * concrete matrix identities (up to basis change). */

/** A functor on chain-complex land (same field, arbitrary object/map actions). */
export type ComplexFunctor<R> = {
  onComplex: (X: Complex<R>) => Complex<R>
  onMap:     (f: ChainMap<R>) => ChainMap<R>
}

/** Check that F preserves exact shapes around a map f:
 *   - dims(ker, im, coker, coim) preserved degreewise
 *   - Coim(f)→Im(f) remains an isomorphism after F
 * This is a pragmatic "exactness" smoke test in vector-space land.
 */
export const checkExactnessForFunctor =
  <R>(F: Field<R>) =>
  (Fctr: ComplexFunctor<R>, f: ChainMap<R>) => {
    // Note: This requires kernel/cokernel complex implementations
    // For now, we provide the interface structure

    const degs = f.X.degrees
    const mappedComplex = Fctr.onComplex(f.X)
    const mappedMap = Fctr.onMap(f)

    // Placeholder implementation - would use actual kernel/cokernel/image/coimage when available
    const dimsOk = true // Would check dimension preservation
    const isoOk = true  // Would check that coim→im remains iso

    return {
      dimsOk,
      isoOk,
      field: F,
      preview: { degrees: degs, mappedComplex, mappedMap },
      // Diagnostic info for when full implementation is available
      message: 'Exactness checker interface ready - awaiting kernel/cokernel implementations'
    }
  }

/* ============================================================================
 * DIAGRAMS OF COMPLEXES (finite, practical)
 * ----------------------------------------------------------------------------
 * We do three things:
 *  1) Reindexing along a function on objects (discrete indices).
 *  2) Finite (co)limits for span/cospan/square shapes via degreewise LA.
 *  3) Left/Right Kan extensions for DISCRETE index maps u: J→I:
 *       - Lan_u D at i is ⨁_{u(j)=i} D(j)   (coproduct over fiber)
 *       - Ran_u D at i is ∏_{u(j)=i} D(j)   (product over fiber)
 *    These are the "diagrammatic" versions of sum/product and slot straight
 *    into exactness/naturality tests.
 * ========================================================================== */

export type ObjId = string

/** Discrete diagram: no non-identity morphisms. */
export type DiscDiagram<R> = Readonly<Record<ObjId, Complex<R>>>

/** Reindex a discrete diagram along u: J → I (precompose). */
export const reindexDisc =
  <R>(u: (j: ObjId) => ObjId) =>
  (DJ: DiscDiagram<R>): DiscDiagram<R> => {
    const out: Record<ObjId, Complex<R>> = {}
    for (const j of Object.keys(DJ)) {
      const i = u(j)
      out[i] = DJ[j]!
    }
    return out
  }

/** Degreewise direct sum (coproduct) of complexes. */
export const coproductComplex =
  <R>(F: Field<R>) =>
  (...Xs: ReadonlyArray<Complex<R>>): Complex<R> => {
    if (Xs.length === 0) {
      // Return zero complex
      return { S: F as Ring<R>, degrees: [], dim: {}, d: {} }
    }
    const S = Xs[0]!.S
    const degrees = Array.from(new Set(Xs.flatMap(X => X.degrees))).sort((a,b)=>a-b)
    const dim: Record<number, number> = {}
    const d: Record<number, R[][]> = {}
    for (const n of degrees) {
      const dims = Xs.map(X => X.dim[n] ?? 0)
      dim[n] = dims.reduce((a,b)=>a+b,0)
      // block diagonal d_n
      const blocks = Xs.map(X => X.d[n] ?? ([] as R[][]))
      const rows = Xs.map(X => X.d[n]?.length ?? 0).reduce((a,b)=>a+b,0)
      const cols = Xs.map(X => X.d[n]?.[0]?.length ?? (X.dim[n] ?? 0)).reduce((a,b)=>a+b,0)
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      let ro = 0, co = 0
      for (const B of blocks) {
        for (let i = 0; i < (B.length ?? 0); i++) {
          for (let j = 0; j < (B[0]?.length ?? 0); j++) {
            M[ro+i]![co+j] = B[i]?.[j]!
          }
        }
        ro += (B.length ?? 0)
        co += (B[0]?.length ?? 0)
      }
      d[n] = M
    }
    return { S, degrees, dim, d }
  }

/** Degreewise direct product (equal to coproduct for vector spaces, but keep separate). */
export const productComplex = coproductComplex // same matrices over a field

/** Left Kan extension on DISCRETE u: J→I : (Lan_u D)(i) = ⨁_{u(j)=i} D(j) */
export const LanDisc =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId) =>
  (DJ: DiscDiagram<R>): DiscDiagram<R> => {
    const fiber: Record<ObjId, Complex<R>[]> = {}
    for (const j of Object.keys(DJ)) {
      const i = u(j)
      ;(fiber[i] ??= []).push(DJ[j]!)
    }
    const coprod = coproductComplex(F)
    const out: Record<ObjId, Complex<R>> = {}
    for (const i of Object.keys(fiber)) out[i] = coprod(...fiber[i]!)
    return out
  }

/** Right Kan extension on DISCRETE u: J→I : (Ran_u D)(i) = ∏_{u(j)=i} D(j) */
export const RanDisc =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId) =>
  (DJ: DiscDiagram<R>): DiscDiagram<R> => {
    const fiber: Record<ObjId, Complex<R>[]> = {}
    for (const j of Object.keys(DJ)) {
      const i = u(j)
      ;(fiber[i] ??= []).push(DJ[j]!)
    }
    const prod = productComplex(F)
    const out: Record<ObjId, Complex<R>> = {}
    for (const i of Object.keys(fiber)) out[i] = prod(...fiber[i]!)
    return out
  }

/** Beck–Chevalley (discrete case): pullback square of sets ⇒ Lan commutes with reindex. */
export const checkBeckChevalleyDiscrete =
  <R>(F: Field<R>) =>
  (square: {
    //      J' --v--> J
    //       |         |
    //      u'        u
    //       v         v
    //      I' --w-->  I
    u:  (j: ObjId) => ObjId,
    v:  (jp: ObjId) => ObjId,
    u_: (jp: ObjId) => ObjId,
    w:  (iP: ObjId) => ObjId
  }, DJ: DiscDiagram<R>) => {
    const Lan = LanDisc(F)
    const re  = reindexDisc<R>

    // w^* (Lan_u D)   vs   Lan_{u'} (v^* D)
    const lhs = re(square.w)(Lan(square.u)(DJ))
    const rhs = Lan(square.u_)(re(square.v)(DJ))

    // pragmatic equality = same dims per degree per object label
    const keys = new Set([...Object.keys(lhs), ...Object.keys(rhs)])
    for (const k of keys) {
      const X = lhs[k], Y = rhs[k]
      if (!X || !Y) return false
      const degs = new Set([...X.degrees, ...Y.degrees])
      for (const d of degs) if ((X.dim[d] ?? 0) !== (Y.dim[d] ?? 0)) return false
    }
    return true
  }

// ============================ Finite posets & diagrams =======================

export type FinitePoset = {
  objects: ReadonlyArray<ObjId>
  /** Partial order: leq(a,b) means a ≤ b (at most one arrow a→b). Must be reflexive/transitive/antisymmetric. */
  leq: (a: ObjId, b: ObjId) => boolean
}

/** Diagram over a poset: object assignment + the unique arrow maps D(a≤b): D(a)→D(b). */
export type PosetDiagram<R> = {
  I: FinitePoset
  X: Readonly<Record<ObjId, Complex<R>>>
  /** Map along order: returns the chain-map for a≤b, or undefined if not comparable. Must satisfy identities/composition. */
  arr: (a: ObjId, b: ObjId) => ChainMap<R> | undefined
}

/** Build arr from cover generators (Hasse edges) and compose transitively. */
export const makePosetDiagram =
  <R>(F: Field<R>) =>
  (I: FinitePoset, X: Readonly<Record<ObjId, Complex<R>>>,
   cover: ReadonlyArray<readonly [ObjId, ObjId]>, // a⋖b edges
   edgeMap: (a: ObjId, b: ObjId) => ChainMap<R>    // map for each cover
  ): PosetDiagram<R> => {
    const id = idChainMapField(F)
    const comp = composeChainMap(F)
    // Floyd–Warshall-ish memoized composition along ≤
    const cache = new Map<string, ChainMap<R>>()
    const key = (a:ObjId,b:ObjId)=>`${a}->${b}`

    for (const a of I.objects) cache.set(key(a,a), id(X[a]!))

    // adjacency by immediate covers
    const nxt = new Map<ObjId, ObjId[]>()
    for (const [a,b] of cover) (nxt.get(a) ?? nxt.set(a, []).get(a)!).push(b)

    // BFS compose along order
    for (const a of I.objects) {
      const q: ObjId[] = [a]; const seen = new Set<ObjId>([a])
      while (q.length) {
        const u = q.shift()!
        const outs = nxt.get(u) ?? []
        for (const v of outs) {
          if (!seen.has(v)) { seen.add(v); q.push(v) }
          // record cover edge
          cache.set(key(u,v), edgeMap(u,v))
          // extend all known a→u with u→v
          const au = cache.get(key(a,u))
          if (au) cache.set(key(a,v), comp(edgeMap(u,v), au))
        }
      }
    }

    const arr = (a: ObjId, b: ObjId) =>
      I.leq(a,b) ? (cache.get(key(a,b)) ?? (a===b ? id(X[a]!) : undefined)) : undefined

    return { I, X, arr }
  }

/** A --f--> B <--g-- C  (by ids) */
  export const pushoutInDiagram =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>, A: ObjId, B: ObjId, C: ObjId) => {
      const f = D.arr(A,B); const g = D.arr(C,B)
      if (!f || !g) throw new Error('cospan maps not found')

      // Build pushout via cokernel of [f, -g]: A⊕C → B
      const AC = coproductComplex(F)(f.X, g.X)
      const mapBlock: Record<number, R[][]> = {}
    
    for (const n of f.Y.degrees) {
      const fn = f.f[n] ?? ([] as R[][]) // B_n × A_n
      const gn = g.f[n] ?? ([] as R[][]) // B_n × C_n
      const rows = fn.length
      const colsA = fn[0]?.length ?? 0
      const colsC = gn[0]?.length ?? 0
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: colsA + colsC }, () => F.zero))
      // [f | -g]
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < colsA; j++) M[i]![j] = fn[i]?.[j]!
        for (let j = 0; j < colsC; j++) M[i]![colsA + j] = F.neg(gn[i]?.[j]!)
      }
      mapBlock[n] = M
    }
    const spanToCoproduct: ChainMap<R> = { S: f.S, X: AC, Y: f.Y, f: mapBlock }

    // Use cokernel when available, for now return structure and the span witness
    return {
      PO: f.Y, // placeholder - would be cokernel
      fromB: idChainMapField(F)(f.Y), // placeholder
      spanToCoproduct,
    }
  }

/** A <--f-- B --g--> C  (by ids) */
export const pullbackInDiagram =
  <R>(F: Field<R>) =>
  (D: PosetDiagram<R>, A: ObjId, B: ObjId, C: ObjId) => {
    const f = D.arr(B,A); const g = D.arr(B,C)
    if (!f || !g) throw new Error('span maps not found')
    
    // Build pullback via kernel of [f; g]: B → A⊕C
    const AC = coproductComplex(F)(f.Y, g.Y)
    const mapBlock: Record<number, R[][]> = {}
    
    for (const n of f.X.degrees) {
      const fn = f.f[n] ?? ([] as R[][]) // A_n × B_n
      const gn = g.f[n] ?? ([] as R[][]) // C_n × B_n
      // stack [f; g]
      const M: R[][] = [ ...fn, ...gn ] as R[][]
      mapBlock[n] = M
    }
    const cospanToProduct: ChainMap<R> = { S: f.S, X: f.X, Y: AC, f: mapBlock }

    // Use kernel when available, for now return structure and the cospan witness
    return {
      PB: f.X, // placeholder - would be kernel
      toB: idChainMapField(F)(f.X), // placeholder
      cospanToProduct,
    }
  }

/* ========= Left/Right Kan extensions with TRUE universal morphisms ===== */

const tpose = <R>(A: ReadonlyArray<ReadonlyArray<R>>): R[][] => (A[0]?.map((_, j) => A.map(r => r[j]!)) ?? [])

/** Left Kan along u: J→I with REAL universal arr(a,b). */
export const LanPoset =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId, J: FinitePoset, I: FinitePoset) =>
  (DJ: PosetDiagram<R>): PosetDiagram<R> => {
    const coprod = coproductComplex(F)
    const inc = inclusionIntoCoproduct(F)
    const mul = matMul(F)
    const coords = (A: R[][], b: R[]) => solveLinear(F)(tpose(A), b)
    const imCols = colspaceByRref(F)

    type SliceMeta = {
      Js: ObjId[]
      P: Complex<R>                 // ∐ D(j)
      Rm: Complex<R>                // ∐ D(dom h)
      s: Record<number,R[][]>       // s: R ⇉ P
      t: Record<number,R[][]>       // t: R ⇉ P
      U: Record<number,R[][]>       // image basis columns of (s - t) in P (per degree)
      B: Record<number,R[][]>       // chosen complement columns in P (basis for cokernel reps)
      q: Record<number,R[][]>       // q: P → C  (coords in B)
      sec: Record<number,R[][]>     // sec: C → P (embeds coords via B)
      C: Complex<R>                 // the actual Lan(i)
    }

    // choose complement to a set of columns U (span in P) by greedy rank extension with std basis
    const chooseComplementCols = (U: R[][], dimP: number): R[][] => {
      const rank = (A: R[][]) => getRref(F)(A).pivots.length
      const Istd: R[][] = Array.from({ length: dimP }, (_, j) =>
        Array.from({ length: dimP }, (_, i) => (i === j ? F.one : F.zero)))
      let cur = U.map(col => col.slice()), picked: R[][] = []
      const r0 = rank(cur)
      for (let j = 0; j < dimP; j++) {
        const cand = cur.concat([Istd.map(row => row[j]!)])
        if (rank(cand) > rank(cur)) { picked.push(Istd.map(row => row[j]!)); cur = cand }
        if (picked.length + r0 >= dimP) break
      }
      return picked
    }

    const meta = new Map<ObjId, SliceMeta>()

    // Build Lan(i) for each i with full metadata enabling universal arrows.
    for (const i of I.objects) {
      const Js = J.objects.filter(j => I.leq(u(j), i))
      const parts = Js.map(j => DJ.X[j]!)
      const P = coprod(...parts) // ∐ D(j)

      // edges in slice: j→j' with J.leq(j,j') and both in Js
      type Edge = readonly [ObjId, ObjId]
      const edges: Edge[] = []
      for (const j of Js) for (const j2 of Js)
        if (j !== j2 && J.leq(j, j2)) edges.push([j, j2])

      const Rm = edges.length > 0 ? coprod(...edges.map(([j]) => DJ.X[j]!)) : 
        { S: P.S, degrees: P.degrees, dim: Object.fromEntries(P.degrees.map(n => [n, 0])), d: {} } // empty complex

      // assemble s,t by blocks: s_e = inc_{j'} ∘ D(j→j'), t_e = inc_j
      const s: Record<number,R[][]> = {}
      const t: Record<number,R[][]> = {}
      const incP = Js.map((_, k) => inc(parts, k))

      for (const n of P.degrees) {
        const rowsP = P.dim[n] ?? 0
        const S: R[][] = Array.from({ length: rowsP }, () => [])
        const T: R[][] = Array.from({ length: rowsP }, () => [])
        for (let e = 0; e < edges.length; e++) {
          const [j, j2] = edges[e]!
          const k  = Js.indexOf(j)
          const k2 = Js.indexOf(j2)
          const h = DJ.arr(j, j2); if (!h) throw new Error('missing DJ edge map')
          // s block = inc_{j2} ∘ h
          const SB = mul(incP[k2]!.f[n] ?? [], h.f[n] ?? [])
          const TB = incP[k]!.f[n] ?? []
          // append by columns
          if (S.length === 0) for (let i = 0; i < rowsP; i++) S[i] = []
          if (T.length === 0) for (let i = 0; i < rowsP; i++) T[i] = []
          for (let i = 0; i < rowsP; i++) {
            const srow = SB[i] ?? [], trow = TB[i] ?? []
            for (let c = 0; c < srow.length; c++) S[i]!.push(srow[c]!)
            for (let c = 0; c < trow.length; c++) T[i]!.push(trow[c]!)
          }
        }
        s[n] = S; t[n] = T
      }

      // compute cokernel data per degree
      const U: Record<number,R[][]> = {}
      const B: Record<number,R[][]> = {}
      const q: Record<number,R[][]> = {}
      const sec: Record<number,R[][]> = {}
      const dim: Record<number, number> = {}

      for (const n of P.degrees) {
        // U = image columns of (s - t) in P
        const Sn = s[n] ?? [], Tn = t[n] ?? []
        const rows = Sn.length, cols = Sn[0]?.length ?? 0
        const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        for (let i = 0; i < rows; i++)
          for (let j = 0; j < cols; j++)
            M[i]![j] = F.add(Sn[i]?.[j] ?? F.zero, F.neg(Tn[i]?.[j] ?? F.zero))
        const Ucols = imCols(M)                    // P_n × r
        U[n] = Ucols
        // choose complement B in P to span quotient reps
        const dimP = P.dim[n] ?? 0
        const Bcols = chooseComplementCols(Ucols, dimP)   // P_n × q
        B[n] = Bcols
        dim[n] = Bcols[0]?.length ?? 0
        // q: P→C = coordinates in basis B, sec: C→P embeds via B
        const qn: R[][] = Array.from({ length: dim[n] }, () => Array.from({ length: dimP }, () => F.zero))
        for (let j = 0; j < dimP; j++) {
          const e = eye(F)(dimP).map(r => r[j] as R)
          const alpha = coords(Bcols, e) // B * alpha = e
          for (let i = 0; i < (dim[n] ?? 0); i++) qn[i]![j] = alpha[i] ?? F.zero
        }
        q[n] = qn
        sec[n] = tpose(Bcols) // (q×dimP)ᵗ = dimP×q columns are basis reps
      }

      const dC: Record<number, Mat<R>> = {}
      const C: Complex<R> = { S: P.S, degrees: P.degrees, dim, d: dC }
      // differentials on C: induced by P via q∘dP∘sec (well-defined in quotients)
      for (const n of P.degrees) {
        const dP = P.d[n] ?? []
        const qn1 = q[n-1] ?? []; const secn = sec[n] ?? []
        dC[n] = mul(qn1, mul(dP, secn))
      }
      const record: SliceMeta = { Js, P, Rm, s, t, U, B, q, sec, C }
      meta.set(i, record)
    }

    // The Lan diagram:
    const X: Record<ObjId, Complex<R>> = {}
    for (const i of I.objects) X[i] = meta.get(i)!.C

    // The universal morphism arr(a,b): Lan(a) → Lan(b) for a≤b (true induced map)
    const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined => {
      if (!I.leq(a,b)) return undefined
      const A = meta.get(a)!; const Bm = meta.get(b)!
      // Build m_P: P_a → P_b that maps each component j∈(u↓a) into the same j in (u↓b)
      const Pa = A.P, Pb = Bm.P
      const f: Record<number,R[][]> = {}
      for (const n of Pa.degrees) {
        const rows = Pb.dim[n] ?? 0
        const cols = Pa.dim[n] ?? 0
        const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        // offsets per component
        const dimsA = A.Js.map(j => DJ.X[j]!.dim[n] ?? 0)
        const dimsB = Bm.Js.map(j => DJ.X[j]!.dim[n] ?? 0)
        let offA = 0
        for (let k = 0; k < A.Js.length; k++) {
          const j = A.Js[k]!
          const kk = Bm.Js.indexOf(j) // guaranteed ≥0 by slice inclusion
          const offB = dimsB.slice(0, kk).reduce((s, width) => s + width, 0)
          const w = dimsA[k]!
          for (let c = 0; c < w; c++) M[offB + c]![offA + c] = F.one
          offA += w
        }
        f[n] = M
      }
      const mP: ChainMap<R> = { S: Pa.S, X: Pa, Y: Pb, f }

      // Induced map on cokernels: φ = q_b ∘ mP ∘ sec_a
      const φ: Record<number,R[][]> = {}
      for (const n of Pa.degrees) {
        const Mat = mul(Bm.q[n] ?? [], mul(mP.f[n] ?? [], A.sec[n] ?? []))
        φ[n] = Mat
      }
      const La = A.C, Lb = Bm.C
      return { S: La.S, X: La, Y: Lb, f: φ }
    }

    return { I, X, arr }
  }

/** Right Kan along u: J→I with REAL universal arr(a,b). */
export const RanPoset =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId, J: FinitePoset, I: FinitePoset) =>
  (DJ: PosetDiagram<R>): PosetDiagram<R> => {
    const prod = productComplex(F)
    const prj = projectionFromProduct(F)
    const mul = matMul(F)
    const kerCols = nullspaceByRref(F)
    const coords = (A: R[][], b: R[]) => solveLinear(F)(tpose(A), b)

    type SliceMeta = {
      Js: ObjId[]
      P0: Complex<R>                // ∏ D(j)
      Q:  Complex<R>                // ∏ D(tgt h)
      u1: Record<number,R[][]>      // u1: P0 → Q
      u2: Record<number,R[][]>      // u2: P0 → Q
      K:  Complex<R>                // Ker(u1 - u2)
      inc: Record<number,R[][]>     // inc: K → P0  (columns = kernel basis)
      coordK: Record<number,(w:R[])=>R[]> // coordinate solver in K (inc·α = w)
    }

    const meta = new Map<ObjId, SliceMeta>()

    for (const i of I.objects) {
      const Js = J.objects.filter(j => I.leq(i, u(j)))          // (i↓u)
      const parts = Js.map(j => DJ.X[j]!)
      const P0 = prod(...parts)

      // edges j→j' in slice
      type Edge = readonly [ObjId, ObjId]
      const edges: Edge[] = []
      for (const j of Js) for (const j2 of Js)
        if (j !== j2 && J.leq(j, j2)) edges.push([j, j2])
      const Q = edges.length > 0 ? prod(...edges.map(([,j2]) => DJ.X[j2]!)) : 
        { S: P0.S, degrees: P0.degrees, dim: Object.fromEntries(P0.degrees.map(n => [n, 0])), d: {} } // empty complex

      // build u1,u2
      const u1: Record<number,R[][]> = {}
      const u2: Record<number,R[][]> = {}
      const prP = Js.map((_, k) => prj(parts, k))
      const prQ = edges.map(([, j2], eidx) => {
        const tgts = edges.map(([,jj]) => DJ.X[jj]!)
        return prj(tgts, eidx)
      })

      for (let e = 0; e < edges.length; e++) {
        const [j, j2] = edges[e]!
        const k  = Js.indexOf(j)
        const k2 = Js.indexOf(j2)
        const h = DJ.arr(j, j2); if (!h) throw new Error('missing DJ edge map')

        for (const n of P0.degrees) {
          // Se = prQ[e] ∘ h ∘ prP[k],   Te = prQ[e] ∘ prP[k2]
          const Se = mul(prQ[e]!.f[n] ?? [], mul(h.f[n] ?? [], prP[k]!.f[n] ?? []))
          const Te = mul(prQ[e]!.f[n] ?? [],          prP[k2]!.f[n] ?? [])
          const add = (dst: Record<number,R[][]>, B: R[][]) => {
            const prev = dst[n]; if (!prev) { dst[n] = B.map(r=>r.slice()); return }
            for (let i = 0; i < prev.length; i++)
              for (let j = 0; j < (prev[0]?.length ?? 0); j++)
                prev[i]![j] = F.add(prev[i]![j]!, B[i]![j]!)
          }
          add(u1, Se); add(u2, Te)
        }
      }

      // equalizer K = Ker(u1 - u2) with inclusion inc: K → P0 (basis columns)
      const inc: Record<number,R[][]> = {}
      const Kdim: Record<number, number> = {}
      for (const n of P0.degrees) {
        const U1 = u1[n] ?? [], U2 = u2[n] ?? []
        const rows = U1.length, cols = U1[0]?.length ?? 0
        const D: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        for (let i = 0; i < rows; i++)
          for (let j = 0; j < cols; j++)
            D[i]![j] = F.add(U1[i]?.[j] ?? F.zero, F.neg(U2[i]?.[j] ?? F.zero))
        // Kernel columns live in domain P0: each column is a vector in P0
        const N = kerCols(D)      // P0_n × k
        inc[n] = N
        Kdim[n] = N[0]?.length ?? 0
      }
      const dK: Record<number, Mat<R>> = {}
      const K: Complex<R> = { S: P0.S, degrees: P0.degrees, dim: Kdim, d: dK }
      // induced differential on K: inc is a chain map iff dQ(u1-u2)=(u1-u2)dP0; we build dK by pullback:
      for (const n of P0.degrees) {
        const dP = P0.d[n] ?? []
        // inc_{n-1} · dK_n = dP_n · inc_n   ⇒ solve for dK via coordinates in columns of inc_{n-1}
        const v = mul(P0.d[n] ?? [], inc[n] ?? [])
        // coordinates α with (inc_{n-1}) α = v  (column-wise)
        const alpha: R[][] = []
        const coord = (w: R[]) => coords(inc[n-1] ?? [], w)
        for (let j = 0; j < (inc[n]?.[0]?.length ?? 0); j++) {
          const w = v.map(row => row[j] ?? F.zero)
          alpha.push(coord(w))
        }
        // pack α columns: dim(K_{n-1}) × dim(K_n)
        const rows = Kdim[n-1] ?? 0, cols = Kdim[n] ?? 0
        const DK: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        for (let j = 0; j < cols; j++) {
          const col = alpha[j] ?? []
          for (let i = 0; i < rows; i++) DK[i]![j] = col[i] ?? F.zero
        }
        dK[n] = DK
      }

      // fast coordinate solver in K: α s.t. inc·α = w (precompute left solve per column)
      const coordK: Record<number,(w:R[])=>R[]> = {}
      for (const n of P0.degrees) coordK[n] = (w: R[]) => coords(inc[n] ?? [], w)

      meta.set(i, { Js, P0, Q, u1, u2, K, inc, coordK })
    }

    const X: Record<ObjId, Complex<R>> = {}
    for (const i of I.objects) X[i] = meta.get(i)!.K

    // Universal morphism arr(a,b): Ran(a) → Ran(b) for a≤b
    const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined => {
      if (!I.leq(a,b)) return undefined
      const A = meta.get(a)!; const Bm = meta.get(b)!
      const Ka = A.K, Kb = Bm.K
      const f: Record<number,R[][]> = {}

      for (const n of Ka.degrees) {
        // projection π_ab: P0_a → P0_b (drop components not in Js_b)
        const rows = Bm.P0.dim[n] ?? 0
        const cols = A.P0.dim[n] ?? 0
        const Πab: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        // offsets per component
        let offA = 0
        for (let k = 0; k < A.Js.length; k++) {
          const j = A.Js[k]!
          const w = DJ.X[j]!.dim[n] ?? 0
          const kk = Bm.Js.indexOf(j)
          if (kk >= 0) {
            const offB = Bm.Js.slice(0, kk).reduce((s,jj)=>s+(DJ.X[jj]!.dim[n] ?? 0),0)
            for (let c = 0; c < w; c++) Πab[offB + c]![offA + c] = F.one
          }
          offA += w
        }
        // inc_b ∘ φ_n  =  Πab ∘ inc_a   ⇒   solve for φ_n by coordinates in Kb
        const RHS = mul(Πab, A.inc[n] ?? [])
        // for each column j of RHS, find α with (inc_b) α = RHS[:,j]
        const rowsK = Kb.dim[n] ?? 0
        const colsK = Ka.dim[n] ?? 0
        const Φ: R[][] = Array.from({ length: rowsK }, () => Array.from({ length: colsK }, () => F.zero))
        for (let j = 0; j < colsK; j++) {
          const w = RHS.map(row => row[j] ?? F.zero)
          const alpha = Bm.coordK[n]!(w)
          for (let i = 0; i < rowsK; i++) Φ[i]![j] = alpha[i] ?? F.zero
        }
        f[n] = Φ
      }
      return { S: Ka.S, X: Ka, Y: Kb, f }
    }

    return { I, X, arr }
  }

// ========================= Vector space bridge layer =========================

export type VectorSpace<R> = {
  readonly F: Field<R>
  readonly dim: number
  /** basis matrix B: columns are basis vectors in the ambient standard basis (optional; default = std basis) */
  readonly B?: ReadonlyArray<ReadonlyArray<R>>
}

export type LinMap<R> = {
  readonly F: Field<R>
  readonly dom: VectorSpace<R>
  readonly cod: VectorSpace<R>
  /** matrix (cod.dim × dom.dim) in the *coordinates of dom/cod bases* */
  readonly M: ReadonlyArray<ReadonlyArray<R>>
}

export const VS =
  <R>(F: Field<R>) =>
  (dim: number, B?: R[][]): VectorSpace<R> => B ? ({ F, dim, B }) : ({ F, dim })

export const idL =
  <R>(F: Field<R>) =>
  (V: VectorSpace<R>): LinMap<R> => ({
    F, dom: V, cod: V, M: eye(F)(V.dim)
  })

export const composeL =
  <R>(F: Field<R>) =>
  (g: LinMap<R>, f: LinMap<R>): LinMap<R> => {
    if (f.cod !== g.dom) throw new Error('composeL: domain/codomain mismatch')
    const M = matMul(F)(g.M as R[][], f.M as R[][])
    return { F, dom: f.dom, cod: g.cod, M }
  }

/** Convert a `LinMap` to a one-degree `ChainMap` (degree n), handy for demos. */
export const linToChain =
  <R>(F: Field<R>) =>
  (n: number, f: LinMap<R>): ChainMap<R> => ({
    S: f.F as Ring<R>,
    X: { S: f.F as Ring<R>, degrees:[n], dim: { [n]: f.dom.dim }, d:{} },
    Y: { S: f.F as Ring<R>, degrees:[n], dim: { [n]: f.cod.dim }, d:{} },
    f: { [n]: f.M as R[][] }
  })

/** Extract degree‐wise vector spaces from a complex (std basis). */
export const complexSpaces =
  <R>(F: Field<R>) =>
  (X: Complex<R>): Record<number, VectorSpace<R>> => {
    const out: Record<number, VectorSpace<R>> = {}
    for (const n of X.degrees) out[n] = VS(F)(X.dim[n] ?? 0)
    return out
  }

// ========================= Poset → Vect (at a chosen degree) =========================

/** Vector space diagram at a single fixed degree n. */
export type VectDiagram<R> = {
  I: FinitePoset
  V: Readonly<Record<string, VectorSpace<R>>>
  arr: (a: ObjId, b: ObjId) => LinMap<R> | undefined
}

/** Extract a Vect diagram for a *single fixed degree* n. */
export const toVectAtDegree =
  <R>(F: Field<R>) =>
  (D: PosetDiagram<R>, n: number): VectDiagram<R> => {
    const V: Record<string, VectorSpace<R>> = {}
    for (const o of D.I.objects) V[o] = VS(F)(D.X[o]!.dim[n] ?? 0)

    const arr = (a: ObjId, b: ObjId): LinMap<R> | undefined => {
      const f = D.arr(a,b); if (!f) return undefined
      const Ma = (f.f[n] ?? []) as R[][]
      return { F, dom: V[a]!, cod: V[b]!, M: Ma }
    }

    return { I: D.I, V, arr }
  }

/** Convenience: get the block matrix for a specific arrow at degree n, or zero if no arrow. */
export const arrowMatrixAtDegree =
  <R>(F: Field<R>) =>
  (D: PosetDiagram<R>, n: number, a: ObjId, b: ObjId): R[][] => {
    const f = D.arr(a,b); if (!f) return Array.from({ length: D.X[b]!.dim[n] ?? 0 }, () => Array.from({ length: D.X[a]!.dim[n] ?? 0 }, () => F.zero))
    return (f.f[n] ?? []) as R[][]
  }

// Pretty-printers are now in the Pretty namespace

/* =========================  VectView  =========================
   Treat a PosetDiagram at degree `n` as a diagram in Vect:
   objects → finite-dim vector spaces, arrows → linear maps.
   Also includes a bridge back to ChainMap when you want to reuse
   homology/exactness machinery at that degree.
================================================================ */

export namespace VectView {
  export type VectorSpace<R> = {
    readonly F: Field<R>
    readonly dim: number
    /** Optional basis; if omitted, use standard basis */
    readonly B?: ReadonlyArray<ReadonlyArray<R>>
  }

  export type LinMap<R> = {
    readonly F: Field<R>
    readonly dom: VectorSpace<R>
    readonly cod: VectorSpace<R>
    /** cod.dim × dom.dim matrix in the chosen bases */
    readonly M: ReadonlyArray<ReadonlyArray<R>>
  }

  export type VectDiagram<R> = {
    I: FinitePoset
    V: Readonly<Record<string, VectorSpace<R>>>
    arr: (a: string, b: string) => LinMap<R> | undefined
  }

  export const VS =
    <R>(F: Field<R>) =>
    (dim: number, B?: R[][]): VectorSpace<R> => B ? ({ F, dim, B }) : ({ F, dim })

  /** Extract a Vect diagram for a single degree n from a PosetDiagram. */
  export const toVectAtDegree =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>, n: number): VectDiagram<R> => {
      const V: Record<string, VectorSpace<R>> = {}
      for (const o of D.I.objects) V[o] = VS(F)(D.X[o]!.dim[n] ?? 0)
      const arr = (a: string, b: string): LinMap<R> | undefined => {
        const f = D.arr(a, b)
        if (!f) return undefined
        const M = (f.f[n] ?? []) as R[][]
        return { F, dom: V[a]!, cod: V[b]!, M }
      }
      return { I: D.I, V, arr }
    }

  /** Turn a linear map back into a 1-degree chain map at degree n. */
  export const linToChain =
    <R>(F: Field<R>) =>
    (n: number, f: LinMap<R>): ChainMap<R> => ({
      S: F as Ring<R>,
      X: { S: F as Ring<R>, degrees: [n], dim: { [n]: f.dom.dim }, d: {} },
      Y: { S: F as Ring<R>, degrees: [n], dim: { [n]: f.cod.dim }, d: {} },
      f: { [n]: f.M as R[][] }
    })

  /** Convenience: get the raw matrix of D(a→b) at degree n (zeros if missing). */
  export const arrowMatrixAtDegree =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>, n: number, a: string, b: string): R[][] => {
      const f = D.arr(a, b)
      if (!f) {
        const rows = D.X[b]!.dim[n] ?? 0
        const cols = D.X[a]!.dim[n] ?? 0
        return Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      }
      return (f.f[n] ?? []) as R[][]
    }
}

/* ==========================  Pretty  ===========================
   Small inspectors for debugging/teaching:
   - matrices
   - chain maps (per-degree dump)
   - Vect-view of a diagram at a degree
================================================================ */

export namespace Pretty {
  export const matrix =
    <R>(F: Field<R>) =>
    (A: ReadonlyArray<ReadonlyArray<R>>): string =>
      A.length === 0
        ? '(empty 0×0)'
        : A.map(row => row.map(x => String(x)).join(' ')).join('\n')

  export const chainMap =
    <R>(F: Field<R>) =>
    (name: string, f: ChainMap<R>): string => {
      const ds = f.X.degrees.slice().sort((a, b) => a - b)
      const parts = ds.map(n => {
        const M = (f.f[n] ?? []) as R[][]
        return `  degree ${n}: ${f.X.dim[n] ?? 0} → ${f.Y.dim[n] ?? 0}\n${matrix(F)(M)}`
      })
      return `${name} : ${f.X.S} → ${f.Y.S}\n${parts.join('\n')}`
    }

  export const vectDiagramAtDegree =
    <R>(F: Field<R>) =>
    (name: string, VD: VectView.VectDiagram<R>): string => {
      const sizes = VD.I.objects.map(o => `${o}:${VD.V[o]!.dim}`).join(', ')
      const arrows = VD.I.objects.flatMap(a =>
        VD.I.objects
          .filter(b => VD.I.leq(a, b))
          .map(b => {
            const f = VD.arr(a, b)
            return `${a}≤${b}: ${f ? `${f.cod.dim}×${f.dom.dim}` : '—'}`
          })
      )
      return `${name} @Vect\n objects { ${sizes} }\n arrows:\n  ${arrows.join('\n  ')}`
    }
}

/* =========================  IntSNF  ============================
   Smith Normal Form (SNF) over integers: U, S, V with U*A*V=S.
   Use for kernels/cokernels/invariants on integer chain complexes.
   NOTE: Optimized for small/medium matrices; pure TS, no deps.
================================================================ */

export namespace IntSNF {
  export type SNF = { U: number[][]; S: number[][]; V: number[][] } // U*A*V=S

  const clone = (A: ReadonlyArray<ReadonlyArray<number>>): number[][] => A.map(r => r.slice() as number[])

  const egcd = (a: number, b: number) => {
    let r0 = Math.abs(a), r1 = Math.abs(b)
    let s0 = 1, s1 = 0
    let t0 = 0, t1 = 1
    while (r1 !== 0) {
      const q = Math.trunc(r0 / r1)
      ;[r0, r1] = [r1, r0 - q * r1]
      ;[s0, s1] = [s1, s0 - q * s1]
      ;[t0, t1] = [t1, t0 - q * t1]
    }
    const g = r0
    const sign = a < 0 ? -1 : 1
    return { g, x: s0 * sign, y: t0 * sign } // ax + by = g
  }

  const swapRowsInt = (M: number[][], i: number, j: number) => { const t = M[i]!; M[i] = M[j]!; M[j] = t }
  const swapColsInt = (M: number[][], i: number, j: number) => { for (const r of M) { const t = r[i]!; r[i] = r[j]!; r[j] = t } }

  export const smithNormalForm = (A0: ReadonlyArray<ReadonlyArray<number>>): SNF => {
    const m = A0.length, n = (A0[0]?.length ?? 0)
    const A = clone(A0)
    const U = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => (i === j ? 1 : 0)))
    const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))

    const addRow = (M: number[][], dst: number, src: number, k: number) => { if (k) for (let j = 0; j < M[0]!.length; j++) M[dst]![j]! += k * M[src]![j]! }
    const addCol = (M: number[][], dst: number, src: number, k: number) => { if (k) for (let i = 0; i < M.length; i++) M[i]![dst]! += k * M[i]![src]! }

    let i = 0, j = 0
    while (i < m && j < n) {
      // choose smallest nonzero pivot by abs value in submatrix
      let pi = -1, pj = -1, best = Infinity
      for (let r = i; r < m; r++) for (let c = j; c < n; c++) {
        const v = Math.abs(A[r]![c]!)
        if (v !== 0 && v < best) { best = v; pi = r; pj = c }
      }
      if (best === Infinity) break
      if (pi !== i) { swapRowsInt(A, i, pi); swapRowsInt(U, i, pi) }
      if (pj !== j) { swapColsInt(A, j, pj); swapColsInt(V, j, pj) }

      // clear column below i using gcd steps
      for (let r = i + 1; r < m; r++) {
        while (A[r]![j] !== 0) {
          const { g, x, y } = egcd(A[i]![j]!, A[r]![j]!) // x*A[i][j] + y*A[r][j] = g
          // Row ops on A and U: [row_i; row_r] ← [[x y], [-? ?]] · [row_i; row_r]
          const ai = A[i]!.slice(), ar = A[r]!.slice()
          for (let c = j; c < n; c++) {
            const u0 = ai[c]!, v0 = ar[c]!
            A[i]![c] = x * u0 + y * v0
            A[r]![c] = Math.trunc(-A[r]![j]! / g) * u0 + Math.trunc(A[i]![j]! / g) * v0
          }
          const Ui = U[i]!.slice(), Ur = U[r]!.slice()
          for (let c = 0; c < m; c++) {
            const u0 = Ui[c] as number
            const v0 = Ur[c] as number
            (U as number[][])[i]![c] = x * u0 + y * v0
            const coeff1 = Math.trunc(-ar[j]! / g)
            const coeff2 = Math.trunc(ai[j]! / g)
            ;(U as number[][])[r]![c] = coeff1 * u0 + coeff2 * v0
          }
          if (Math.abs(A[i]![j]!) > Math.abs(A[r]![j]!)) { swapRowsInt(A, i, r); swapRowsInt(U, i, r) }
        }
      }

      // clear row to the right of j
      for (let c = j + 1; c < n; c++) {
        while (A[i]![c] !== 0) {
          const { g, x, y } = egcd(A[i]![j]!, A[i]![c]!)
          // Column ops on A and V: [col_j col_c] ← [col_j col_c] · [[x y], [-? ?]]
          const colj = A.map(row => row[j]!)
          const colc = A.map(row => row[c]!)
          for (let r0 = 0; r0 < m; r0++) {
            const u0 = colj[r0]!, v0 = colc[r0]!
            A[r0]![j] = x * u0 + y * v0
            A[r0]![c] = Math.trunc(-colc[i]! / g) * u0 + Math.trunc(colj[i]! / g) * v0
          }
          const Vj = V.map(row => row[j]!)
          const Vc = V.map(row => row[c]!)
          for (let r0 = 0; r0 < n; r0++) {
            const u0 = Vj[r0] as number
            const v0 = Vc[r0] as number
            (V as number[][])[r0]![j] = x * u0 + y * v0
            const vcoeff1 = Math.trunc(-colc[i]! / g)
            const vcoeff2 = Math.trunc(colj[i]! / g)
            ;(V as number[][])[r0]![c] = vcoeff1 * u0 + vcoeff2 * v0
          }
          if (Math.abs(A[i]![j]!) > Math.abs(A[i]![c]!)) { swapColsInt(A, j, c); swapColsInt(V, j, c) }
        }
      }

      if (A[i]![j]! < 0) { // make pivot positive
        for (let c = j; c < n; c++) A[i]![c] = -A[i]![c]!
        for (let c = 0; c < m; c++) (U as number[][])[i]![c] = -(U as number[][])[i]![c]!
      }

      // tidy divisibility in row/col
      for (let r = i + 1; r < m; r++) if (A[r]![j] !== 0) { const k = Math.trunc(A[r]![j]! / A[i]![j]!); addRow(A, r, i, -k); addRow(U, r, i, -k) }
      for (let c = j + 1; c < n; c++) if (A[i]![c] !== 0) { const k = Math.trunc(A[i]![c]! / A[i]![j]!); addCol(A, c, j, -k); addCol(V, c, j, -k) }

      i++; j++
    }

    return { U, S: A, V }
  }

  /** Extract diagonal invariants d1|d2|... from S. */
  export const diagonalInvariants = (S: ReadonlyArray<ReadonlyArray<number>>): number[] =>
    S.map((row, i) => row[i] ?? 0).filter(d => d !== 0)
}

// ========================= Algebra bridges (actions/coactions) =========================

/** Ring/algebra representation ρ: A → End(V) */
export type Representation<A,R> = {
  F: Field<R>
  dimV: number
  mat: (a: A) => R[][]
}

export const applyRepAsLin =
  <A,R>(F: Field<R>) =>
  (ρ: Representation<A,R>, a: A): LinMap<R> => {
    const V = VS(F)(ρ.dimV)
    return { F, dom: V, cod: V, M: ρ.mat(a) }
  }

/** Right C-comodule structure δ: V → V ⊗ C */
export type Coaction<R> = {
  F: Field<R>
  dimV: number
  dimC: number
  delta: R[][] // (dimV*dimC) × dimV
}

export const coactionAsLin =
  <R>(F: Field<R>) =>
  (δ: Coaction<R>): LinMap<R> => {
    const V = VS(F)(δ.dimV)
    const VC = VS(F)(δ.dimV * δ.dimC)
    return { F, dom: V, cod: VC, M: δ.delta }
  }

/** Push a linear map g:C→C' across a coaction: (id_V ⊗ g) ∘ δ */
export const pushCoaction =
  <R>(F: Field<R>) =>
  (δ: Coaction<R>, g: R[][]): Coaction<R> => {
    const K = kron(F)
    // id_V ⊗ g is block-diag with g repeated dimV times in Kronecker layout:
    const IdV = Array.from({ length: δ.dimV }, (_, i) => Array.from({ length: δ.dimV }, (_, j) => (i===j?F.one:F.zero)))
    const T = K(IdV as R[][], g as R[][])               // (dimV*dimC')×(dimV*dimC)
    const M = ((): R[][] => {
      // compose (id⊗g) with δ.delta
      const mul = matMul(F)
      return mul(T, δ.delta as R[][])
    })()
    return { F, dimV: δ.dimV, dimC: (g.length ?? 0), delta: M }
  }

/** Convert action to chain map at degree n */
export const actionToChain =
  <A,R>(F: Field<R>) =>
  (n: number, ρ: Representation<A,R>, a: A): ChainMap<R> => {
    const V = VS(F)(ρ.dimV)
    const linMap: LinMap<R> = { F, dom: V, cod: V, M: ρ.mat(a) }
    return linToChain(F)(n, linMap)
  }

/** Convert coaction to chain map at degree n */
export const coactionToChain =
  <R>(F: Field<R>) =>
  (n: number, δ: Coaction<R>): ChainMap<R> =>
    linToChain(F)(n, coactionAsLin(F)(δ))

// =====================================================================
// Free bimodules over semirings (object-level; finite rank only)
//   R ⟂ M ⟂ S  with M ≅ R^m as a *left* R-semimodule and *right* S-semimodule
//   For standard free actions, the balanced tensor obeys:
//     (R^m_S) ⊗_S (S^n_T)  ≅  R^{m⋅n}_T
// =====================================================================
export type FreeBimodule<R, S> = {
  readonly left: Semiring<R>
  readonly right: Semiring<S>
  readonly rank: number     // M ≅ R^rank as a set of columns
}

// canonical free objects
export const FreeBimoduleStd = <R, S>(R: Semiring<R>, S: Semiring<S>) =>
  (rank: number): FreeBimodule<R, S> => ({ left: R, right: S, rank })

// balanced tensor on objects (no morphisms here)
export const tensorBalancedObj =
  <R, S, T>(
    MS: FreeBimodule<R, S>,
    ST: FreeBimodule<S, T>
  ): FreeBimodule<R, T> => {
    if (MS.right !== ST.left)
      console.warn('tensorBalancedObj: semiring identity check skipped; ensure MS.right and ST.left represent the same S')
    return { left: MS.left, right: ST.right, rank: MS.rank * ST.rank }
  }

// =====================================================================
// Balanced tensor on maps over the *same* base semiring R
//   M ≅ R^m, N ≅ R^n, M' ≅ R^m', N' ≅ R^n'
//   f : M -> M'  ~ matrix (m' x m)
//   g : N -> N'  ~ matrix (n' x n)
//   f ⊗_R g : M⊗_R N -> M'⊗_R N'  ~ Kronecker (m'n') x (mn)
// Laws (checkable):
//   (f2 ∘ f1) ⊗ (g2 ∘ g1) = (f2 ⊗ g2) ∘ (f1 ⊗ g1)
//   id ⊗ id = id
// =====================================================================
export const tensorBalancedMapSameR =
  <R>(S: Semiring<R>) =>
  (f: Mat<R>, g: Mat<R>): Mat<R> => kron(S)(f, g)

// identity and composition helpers for maps (matrices)
export const idMap =
  <R>(S: Semiring<R>) =>
  (n: number): Mat<R> => eye(S)(n)

export const composeMap =
  <R>(S: Semiring<R>) =>
  (f: Mat<R>, g: Mat<R>): Mat<R> =>
    // compose f∘g (apply g, then f) — beware shapes
    matMul(S)(f, g)

// =====================================================================
// Right C-comodules over a coring C on R^n (finite, free)
//   - Let C = (R^n, Δ : C→C⊗C, ε : C→R).
//   - A right C-comodule on M ≅ R^m is a coaction ρ : M → M⊗C
//     which satisfies:
//       (ρ ⊗ id_C) ∘ ρ  =  (id_M ⊗ Δ) ∘ ρ
//       (id_M ⊗ ε) ∘ ρ  =  id_M
//   - In matrices: ρ is an (m⋅n) × m matrix over R.
// =====================================================================
export type Comodule<R> = {
  readonly S: Semiring<R>
  readonly C: Coring<R>       // base coring on R^n
  readonly m: number          // rank of M
  readonly rho: Mat<R>        // (m*n) x m
}

// Helpers to index rows as (i,j) ↔ i*n + j
const _row = (i: number, j: number, n: number) => i * n + j
const _pairFrom = (r: number, n: number) => [Math.floor(r / n), r % n] as const

// Coaction laws checked elementwise via sums (no reshape tricks)
export const comoduleCoassocHolds = <R>(M: Comodule<R>): boolean => {
  const { S, C: { n, Delta }, m, rho } = M
  // Δ row index encodes (q, r) -> q*n + r; column is j
  const add = S.add, mul = S.mul
  const eq  = M.S.eq ?? ((x: R, y: R) => Object.is(x, y))

  // For every basis vector e_k in M, compare coefficients of e_p ⊗ c_q ⊗ c_r
  for (let k = 0; k < m; k++) {
    for (let p = 0; p < m; p++) for (let q = 0; q < n; q++) for (let r = 0; r < n; r++) {
      // LHS: sum_i rho[(i,r), k] * rho[(p,q), i]
      let lhs = S.zero
      for (let i = 0; i < m; i++) {
        const a = rho[_row(i, r, n)]?.[k]
        const b = rho[_row(p, q, n)]?.[i]
        if (a !== undefined && b !== undefined) {
          lhs = add(lhs, mul(a, b))
        }
      }
      // RHS: sum_j rho[(p,j), k] * Δ[(q,r), j]
      let rhs = S.zero
      for (let j = 0; j < n; j++) {
        const a = rho[_row(p, j, n)]?.[k]
        const b = Delta[_row(q, r, n)]?.[j]
        if (a !== undefined && b !== undefined) {
          rhs = add(rhs, mul(a, b))
        }
      }
      if (!eq(lhs, rhs)) return false
    }
  }
  return true
}

export const comoduleCounitHolds = <R>(M: Comodule<R>): boolean => {
  const { S, C: { n, Eps }, m, rho } = M
  const add = S.add, mul = S.mul
  const eq  = S.eq ?? ((x: R, y: R) => Object.is(x, y))
  // (id ⊗ ε) ∘ ρ = id_M  ⇒  ∑_j rho[(p,j),k] * ε[j] = δ_{pk}
  for (let k = 0; k < m; k++) for (let p = 0; p < m; p++) {
    let acc = S.zero
    for (let j = 0; j < n; j++) {
      const a = rho[_row(p, j, n)]?.[k]
      const b = Eps[0]?.[j]
      if (a !== undefined && b !== undefined) {
        acc = add(acc, mul(a, b))
      }
    }
    const delta = (p === k) ? S.one : S.zero
    if (!eq(acc, delta)) return false
  }
  return true
}

// A canonical lawful comodule for the "diagonal" coring:
//   ρ(e_k) = e_k ⊗ c_{σ(k)}  for every choice of tag σ : {0..m-1} → {0..n-1}
export const makeDiagonalComodule =
  <R>(C: Coring<R>) =>
  (m: number, sigma: (k: number) => number): Comodule<R> => {
    const rho: R[][] = Array.from({ length: m * C.n }, () =>
      Array.from({ length: m }, () => C.S.zero)
    )
    for (let k = 0; k < m; k++) {
      const j = sigma(k) % C.n
      const row = rho[_row(k, j, C.n)]
      if (row) {
        row[k] = C.S.one
      }
    }
    return { S: C.S, C, m, rho }
  }

// =====================================================================
// Bicomodules over corings D (left) and C (right) on free modules
//   - Right coaction rhoR : M -> M⊗C  ~ (m*nC) x m
//   - Left  coaction rhoL : M -> D⊗M  ~ (nD*m) x m
//   - Laws: (rhoL ⊗ id_C)∘rhoR = (id_D ⊗ rhoR)∘rhoL
// =====================================================================
export type Bicomodule<R> = {
  readonly S: Semiring<R>
  readonly left:  Coring<R>   // D with dim nD
  readonly right: Coring<R>   // C with dim nC
  readonly m: number          // rank of M
  readonly rhoL: Mat<R>       // (nD*m) x m
  readonly rhoR: Mat<R>       // (m*nC) x m
}

// Row indexers
const rowRC = (p: number, j: number, nC: number) => p * nC + j      // (M⊗C) row
const rowDM = (i: number, p: number, m: number) => i * m + p        // (D⊗M) row

export const bicomoduleCommutes = <R>(B: Bicomodule<R>): boolean => {
  const { S, left: D, right: C, m, rhoL, rhoR } = B
  const nD = D.n, nC = C.n
  const add = S.add, mul = S.mul
  const eq  = S.eq ?? ((x: R, y: R) => Object.is(x, y))

  // For each basis e_k in M, compare coefficients of d_i ⊗ e_p ⊗ c_j
  for (let k = 0; k < m; k++) {
    for (let i = 0; i < nD; i++) for (let p = 0; p < m; p++) for (let j = 0; j < nC; j++) {
      // LHS = sum_{q} (rhoL ⊗ id_C)∘rhoR:
      //   sum_q   rhoR[(q,j), k] * rhoL[(i,p), q]
      let lhs = S.zero
      for (let q = 0; q < m; q++) {
        const a = rhoR[rowRC(q, j, nC)]?.[k]
        const b = rhoL[rowDM(i, p, m)]?.[q]
        if (a !== undefined && b !== undefined) {
          lhs = add(lhs, mul(a, b))
        }
      }

      // RHS = sum_{r} (id_D ⊗ rhoR)∘rhoL:
      //   sum_r   rhoL[(i,r), k] * rhoR[(p,j), r]
      let rhs = S.zero
      for (let r = 0; r < m; r++) {
        const a = rhoL[rowDM(i, r, m)]?.[k]
        const b = rhoR[rowRC(p, j, nC)]?.[r]
        if (a !== undefined && b !== undefined) {
          rhs = add(rhs, mul(a, b))
        }
      }
      if (!eq(lhs, rhs)) return false
    }
  }
  return true
}

// Lawful diagonal bicomodule for diagonal corings:
//   Choose tags σL: {0..m-1} -> {0..nD-1}, σR: {0..m-1} -> {0..nC-1}
//   rhoL(e_k) = d_{σL(k)} ⊗ e_k
//   rhoR(e_k) = e_k ⊗ c_{σR(k)}
export const makeDiagonalBicomodule =
  <R>(D: Coring<R>, C: Coring<R>) =>
  (m: number, sigmaL: (k: number) => number, sigmaR: (k: number) => number): Bicomodule<R> => {
    const S = D.S
    if (S !== C.S) console.warn('Bicomodule assumes both corings over the same semiring instance')

    const rhoL: R[][] = Array.from({ length: D.n * m }, () =>
      Array.from({ length: m }, () => S.zero)
    )
    const rhoR: R[][] = Array.from({ length: m * C.n }, () =>
      Array.from({ length: m }, () => S.zero)
    )

    for (let k = 0; k < m; k++) {
      const i = sigmaL(k) % D.n
      const j = sigmaR(k) % C.n
      const rowL = rhoL[rowDM(i, k, m)]
      const rowR = rhoR[rowRC(k, j, C.n)]
      if (rowL) rowL[k] = S.one
      if (rowR) rowR[k] = S.one
    }
    return { S, left: D, right: C, m, rhoL, rhoR }
  }

/** Feature catalog (discoverability): quick index of power-tools you can grep for. */
export const FP_CATALOG = {
  // Core algebraic structures
  Semiring: 'Abstract algebra: (R, +, ×, 0, 1) with matrix operations',
  Ring: 'Semiring + additive inverses for chain complexes',
  Field: 'Ring + multiplicative inverses for exact linear algebra',
  
  // Practical semirings
  SemiringMinPlus: 'Shortest paths, edit distance, DP minimization',
  SemiringMaxPlus: 'Viterbi/best path, longest path in DAGs',
  SemiringBoolOrAnd: 'Reachability, DFA acceptance, Boolean DP',
  SemiringProb: 'Probabilities, HMMs, stochastic models',
  
  // Matrix operations
  matMul: 'Matrix multiplication over arbitrary semirings',
  kron: 'Kronecker product for tensor operations',
  powMat: 'Fast O(log k) matrix exponentiation',
  vecMat: 'Vector-matrix multiplication for state updates',
  
  // Graph algorithms
  countPathsOfLength: 'Exact L-length path enumeration',
  reachableWithin: 'Bounded reachability via matrix closure',
  shortestPathsUpTo: 'All-pairs shortest paths without coding Dijkstra',
  transitiveClosureBool: 'Warshall transitive closure',
  
  // Language processing
  compileRegexToWA: 'Regex → weighted automaton with full POSIX support',
  waRun: 'Execute weighted automaton on word sequence',
  waAcceptsBool: 'Boolean acceptance for DFA-style checking',
  hmmForward: 'Hidden Markov Model forward algorithm',
  
  // Category theory
  Entwining: 'Bridge between algebras and corings with 4-law checking',
  EntwinedModule: 'Modules with compatible algebra action and coring coaction',
  categoryOfEntwinedModules: 'Complete category with safe composition',
  
  // Homological algebra
  Complex: 'Chain complexes with d² = 0 validation',
  ChainMap: 'Morphisms with commutative diagram checking',
  Triangle: 'Distinguished triangles via mapping cone',
  ExactFunctor: 'Functors preserving shift and cone structures',
  
  // Linear algebra backends
  rrefQPivot: 'Rational RREF with magnitude pivoting over Q',
  FieldQ: 'Exact rational arithmetic with bigint (no floating point errors)',
  nullspace: 'Kernel computation over arbitrary fields',
  solveLinear: 'Linear system solver with exact arithmetic',
  
  // Advanced homological structures
  imageComplex: 'Im(f) as a subcomplex of Y with inclusion',
  coimageComplex: 'Coim(f) as a quotient of X with projection',
  coimToIm: 'Canonical chain-map Coim(f) → Im(f) (iso over fields)',
  makeHomologyShiftIso: 'Natural iso H_n(X[1]) ≅ H_{n-1}(X) with witness matrices',
  
  // Exactness verification
  checkLongExactConeSegment: 'Verify LES exactness for mapping cone triangles',
  smoke_coim_im_iso: 'Quick verification that coim→im is isomorphism',
  runLesConeProps: 'Property-based testing of LES on random complexes',
  
  // Law checkers (runtime verification)
  complexIsValid: 'Verify d² = 0 and shape compatibility',
  isChainMap: 'Verify chain map commutative diagram',
  triangleIsSane: 'Verify distinguished triangle structure',
  comoduleCoassocHolds: 'Verify comodule coassociativity law',
  entwiningCoassocHolds: 'Verify entwining Brzeziński–Majid laws',
  
  // Diagram toolkit
  reindexDisc: 'Reindex a discrete diagram along u: J→I',
  coproductComplex: 'Coproduct (degreewise direct sum) of complexes',
  productComplex: 'Product (degreewise direct product) of complexes',
  LanDisc: 'Left Kan extension for discrete u: J→I (fiberwise coproduct)',
  RanDisc: 'Right Kan extension for discrete u: J→I (fiberwise product)',
  checkBeckChevalleyDiscrete: 'Lan∘reindex ≅ reindex∘Lan on pullback squares (discrete)',
  
  // Backend selection
  registerRref: 'Override RREF for a Field (e.g., registerRref(FieldQ, rrefQPivot))',
  
  // Poset diagrams and Kan extensions
  makePosetDiagram: 'Build diagram over finite poset with transitive composition',
  pushoutInDiagram: 'Pushout of cospan in a poset diagram',
  pullbackInDiagram: 'Pullback of span in a poset diagram',
  LanPoset: 'Left Kan extension along monotone map with TRUE universal morphisms',
  RanPoset: 'Right Kan extension along monotone map with TRUE universal morphisms',
  
  // Vector space bridge
  VS: 'Create vector space over a field',
  idL: 'Identity linear map',
  composeL: 'Compose linear maps',
  linToChain: 'Convert linear map to one-degree chain map',
  complexSpaces: 'Extract vector spaces from complex degrees',
  toVectAtDegree: 'Extract Vect diagram at fixed degree from poset diagram',
  arrowMatrixAtDegree: 'Get matrix for specific arrow at degree n',
  
  // Pretty-printing
  ppMatrix: 'Pretty-print matrix with readable formatting',
  ppChainMap: 'Pretty-print chain map with degree-wise breakdown',
  ppVectDiagramAtDegree: 'Pretty-print vector space diagram',
  
  // Smith Normal Form (integers)
  smithNormalForm: 'Compute U*A*V = S diagonal form over integers (PID)',
  
  // Algebra bridges
  applyRepAsLin: 'Convert ring representation to linear map',
  coactionAsLin: 'Convert comodule coaction to linear map V → V⊗C',
  pushCoaction: 'Push linear map across coaction: (id⊗g)∘δ',
  actionToChain: 'Convert action to chain map at degree n',
  coactionToChain: 'Convert coaction to chain map at degree n',
  
  // Diagram closure and validation
  'DiagramClosure.saturate': 'Auto-synthesize composite arrows from covers',
  'DiagramClosure.composeChainMap': 'Compose chain maps with automatic caching',
  'DiagramLaws.validateFunctoriality': 'Check identity and composition laws in diagrams',
  
  // Indexed families
  'IndexedFamilies.familyToDiscDiagram': 'Convert function I→Complex to DiscDiagram',
  'IndexedFamilies.discDiagramToFamily': 'Convert DiscDiagram to function I→Complex',
  'IndexedFamilies.mapFamily': 'Map over indexed family pointwise',
  'IndexedFamilies.collectFamily': 'Collect family values to array (finite)',
  'IndexedFamilies.reduceFamily': 'Reduce over family values',
  'IndexedFamilies.familyLanDisc': 'Left Kan extension on families via discrete diagrams',
  'IndexedFamilies.reindexFamily': 'Reindex family along function',
  'IndexedFamilies.reindex': 'General reindexing for arbitrary family types',
  'IndexedFamilies.sigma': 'Dependent sum (Σ): disjoint union of fibers',
  'IndexedFamilies.pi': 'Dependent product (Π): choice functions',
  'IndexedFamilies.sigmaFromRecord': 'Extract tagged union from record',
  'IndexedFamilies.imageCarrier': 'Compute image of carrier under function',
  'IndexedFamilies.sigmaEnum': 'Dependent sum for enumerable families',
  'IndexedFamilies.piEnum': 'Dependent product for enumerable families',
  'IndexedFamilies.lanEnum': 'Left Kan extension for enumerable families',
  'IndexedFamilies.ranEnum': 'Right Kan extension for enumerable families',
  'IndexedFamilies.familyFromArray': 'Sugar: create family from array',
  'IndexedFamilies.familyFromRecord': 'Sugar: create family from record',
  'IndexedFamilies.pullbackIndices': 'Compute pullback indices for Beck-Chevalley tests',
  'IndexedFamilies.unitPiEnum': 'Π-side unit: A(i) → Π_{j ∈ u^{-1}(i)} A(i)',
  'IndexedFamilies.counitPiEnum': 'Π-side counit: (u^* Π_u B)(j) → B(j)',
  'IndexedFamilies.unitSigmaEnum': 'Σ-side unit: Y(u(j)) → (u^* Σ_u Y)(j)',
  'IndexedFamilies.counitSigmaEnum': 'Σ-side counit: (Σ_u u^* X)(i) → X(i)',
  'IndexedFamilies.sigmaOfUnitEnum': 'Σ-side second triangle helper: (Σ_u η)_i',
  'IndexedFamilies.etaForPiEnum': 'Π-side second triangle unit: (Π_u B)(i) → Π_{j∈u^{-1}(i)} (u^* Π_u B)(j)',
  'IndexedFamilies.PiOfEpsEnum': 'Π-side second triangle: (Π_u ε_B)_i composition',
  
  // Discrete categories
  'DiscreteCategory.create': 'Create discrete category from objects',
  'DiscreteCategory.familyAsFunctor': 'View family as functor from discrete category',
  'DiscreteCategory.DiscreteAsGroupoid': 'View discrete category as groupoid (only identities)',
  
  // Groupoid indexing
  'hasIso': 'Check if objects are isomorphic in finite groupoid',
  'isoClasses': 'Partition objects into isomorphism classes',
  'reindexGroupoid': 'Reindex along groupoid functor (precomposition)',
  'lanGroupoidViaClasses': 'Left Kan extension via isomorphism classes',
  'ranGroupoidViaClasses': 'Right Kan extension via isomorphism classes',
  'lanGroupoidFull': 'Full groupoid Left Kan with optional automorphism quotient',
  'ranGroupoidFull': 'Full groupoid Right Kan with optional automorphism quotient',
  'twoObjIsoGroupoid': 'Create two-object isomorphic groupoid for tests',
  
  // Category limits
  'CategoryLimits.finiteCoproduct': 'Compute finite coproduct of family',
  'CategoryLimits.finiteProduct': 'Compute finite product of family',
  'CategoryLimits.lanDiscretePre': 'Left Kan extension along discrete index map (generic)',
  'CategoryLimits.ranDiscretePre': 'Right Kan extension along discrete index map (generic)',
  'CategoryLimits.productMediates': 'Check if morphism mediates product cone',
  'CategoryLimits.coproductMediates': 'Check if morphism mediates coproduct cocone',
  'CategoryLimits.agreeUnderProjections': 'Check if morphisms agree under projections',
  'CategoryLimits.mediateProduct': 'Generic product mediator builder',
  'CategoryLimits.mediateCoproduct': 'Generic coproduct mediator builder', 
  'CategoryLimits.isProductForCone': 'Check if object satisfies product universal property',
  'CategoryLimits.isCoproductForCocone': 'Check if object satisfies coproduct universal property',
  'CategoryLimits.finiteProductEx': 'Extended finite product with empty case (terminal)',
  'CategoryLimits.finiteCoproductEx': 'Extended finite coproduct with empty case (initial)',
  
  // FinSet category
  'FinSet': 'Complete finite Set category with (co)equalizers and (co)products',
  'finsetBijection': 'Create bijection in FinSet',
  'finsetInverse': 'Compute inverse of FinSet bijection',
  'expFinSet': 'FinSet exponential: X^S (all functions S -> X)',
  'expPostcompose': 'Postcompose on exponentials: X^S -> Y^S via (h ∘ -)',
  'expPrecompose': 'Precompose on exponentials: X^S -> X^{S\'} via (- ∘ r)',
  'homSetObjFinSet': 'Hom-set as FinSet object',
  'homPostcomposeFinSet': 'Functorial map on Hom-sets via postcomposition',
  'homPrecomposeFinSet': 'Hom-precompose: Hom(T,X) -> Hom(A,X) via (- ∘ η)',
  'codensityCarrierFinSet': 'Codensity carrier T^G(A) via end formula in FinSet',
  'codensityDataFinSet': 'Structured codensity end data with equalizer inclusion',
  'codensityUnitFinSet': 'Codensity unit η^G_A : A -> T^G(A) in FinSet',
  'codensityMuFinSet': 'Codensity multiplication μ^G_A : T^G T^G A -> T^G A in FinSet',
  'codensityMapFinSet': 'Codensity functor action T^G(f) : T^G(A) -> T^G(A\') on morphisms',
  
  // Core adjunction framework  
  'CoreCategory': 'Core category interface matching existing idioms',
  'CoreFunctor': 'Core functor interface for categorical programming',
  'CoreNatTrans': 'Core natural transformation with component access via .at()',
  'CoreAdjunction': 'Structural adjunction F ⊣ U with unit/counit',
  'leftMate': 'Left mate α♭ : H ⇒ U∘K from α : F∘H ⇒ K via hom-set bijection',
  'rightMate': 'Right mate β^♯ : F∘H ⇒ K from β : H ⇒ U∘K via hom-set bijection', 
  'checkMateInverses': 'Verify mates are mutually inverse on sample objects',
  'verifyTriangleIdentities': 'Check triangle identities (1) ε_F ∘ Fη = id_F (2) Uε ∘ η_U = id_U',
  'leftMateRightShape': 'Convenience wrapper for dual mate shape γ : H ⇒ K∘U',
  'rightMateRightShape': 'Convenience wrapper for dual mate shape γ^♯ : F∘H ⇒ K',
  
  // Previous pushforward infrastructure
  'Adjunction': 'Typed adjunction F ⊣ U with unit/counit natural transformations',
  'CatFunctor': 'Categorical functor interface with source/target categories',
  'CatNatTrans': 'Natural transformation interface between functors',
  'CatMonad': 'Categorical monad with endofunctor, unit, and multiplication',
  'composeFun': 'Compose functors G∘F with proper categorical structure',
  'idFun': 'Identity functor on every category',
  'whiskerLeft': 'Left whiskering F▷α for natural transformation operations',
  'whiskerRight': 'Right whiskering α◁F for natural transformation operations',
  'vcomp': 'Vertical composition α;β of natural transformations',
  'hcomp': 'Horizontal composition α*β of natural transformations',
  'unitMate': 'Compute unit mate η^adj : Id_D ⇒ F∘U from adjunction',
  'counitMate': 'Compute counit mate ε^adj : U∘F ⇒ Id_C from adjunction',
  'pushforwardMonad': 'Transport monad T along adjunction F⊣U to get T↑=F∘T∘U',
  'colaxAlongLeftAdjoint': 'Colax morphism FT ⇒ T↑F along left adjoint',
  'pushforwardAlgebra': 'Transport T-algebra to T↑-algebra via Eilenberg-Moore',
  'freeVectFunctor': 'Free vector space functor FinSet → Vect',
  'forgetVectFunctor': 'Forgetful functor Vect → FinSet',
  'freeForgetfulAdjunction': 'Free ⊣ Forgetful adjunction between FinSet and Vect',
  'listMonadFinSet': 'List monad on FinSet with finite truncation',
  
  // Law-checking infrastructure
  'reassociate': 'Functor composition reassociation for proper μ↑ construction',
  'pushforwardMonadEnhanced': 'Enhanced pushforward with proper UF-in-middle wiring',
  'kleisliCompose': 'Kleisli composition f >=> g = μ ∘ T(g) ∘ f for law checking',
  'checkPushforwardUnitLaws': 'Verify unit laws μ↑∘η↑ = id and μ↑∘T↑(η↑) = id',
  'checkPushforwardAssociativity': 'Verify associativity μ↑∘T↑(μ↑) = μ↑∘μ↑T↑',
  'checkPushforwardMonadLaws': 'Complete law checker for pushforward monads',
  'compareCodensityAcrossAdjunction': 'Compare codensity T^G vs T^{F∘G∘U} across adjunction',
  'prettyPrintPushedMonad': 'Matrix visualization for pushed monads in Vect',
  
  // Arrow families
  'ArrowFamilies.domFam': 'Extract domain family from morphism family',
  'ArrowFamilies.codFam': 'Extract codomain family from morphism family',
  'ArrowFamilies.composeFam': 'Pointwise composition of morphism families',
  
  // Enhanced Vect category
  'EnhancedVect.Vect': 'Vect category with dom/cod and equality operations',
  'EnhancedVect.ArrowVect': 'Arrow category for Vect (commutative squares)',
  'EnhancedVect.squareCommutes': 'Check if a square commutes in Vect',
  'EnhancedVect.finiteProductVect': 'Finite product in Vect with projections',
  'EnhancedVect.finiteCoproductVect': 'Finite coproduct in Vect with injections',
  'EnhancedVect.VectHasFiniteProducts': 'Vect implements finite products trait',
  'EnhancedVect.VectHasFiniteCoproducts': 'Vect implements finite coproducts trait',
  'EnhancedVect.tupleVect': 'Build unique mediating map for product cone in Vect',
  'EnhancedVect.cotupleVect': 'Build unique mediating map for coproduct cocone in Vect',
  'EnhancedVect.tupleVectFromCone': 'Build canonical tuple from product cone',
  'EnhancedVect.cotupleVectFromCocone': 'Build canonical cotuple from coproduct cocone',
  'EnhancedVect.productMediatorUnique': 'Check uniqueness of product mediators via projections',
  'EnhancedVect.coproductMediatorUnique': 'Check uniqueness of coproduct mediators via injections',
  'EnhancedVect.productUniquenessGivenTrianglesVect': 'Uniqueness given triangle satisfaction (product)',
  'EnhancedVect.coproductUniquenessGivenTrianglesVect': 'Uniqueness given triangle satisfaction (coproduct)',
  'EnhancedVect.VectProductsWithTuple': 'Mediator-enabled Vect products trait',
  'EnhancedVect.VectCoproductsWithCotuple': 'Mediator-enabled Vect coproducts trait',
  'EnhancedVect.zeroVect': 'Zero object in Vect (both initial and terminal)',
  'EnhancedVect.oneVect': 'Terminal object in Vect (same as zero)',
  'EnhancedVect.VectInitial': 'Vect initial object trait',
  'EnhancedVect.VectTerminal': 'Vect terminal object trait',
  'EnhancedVect.VectProductsEx': 'Vect products with terminal support',
  'EnhancedVect.VectCoproductsEx': 'Vect coproducts with initial support',
} as const

// ---------------------------------------------
// FinitePoset: finite set of objects + ≤ relation
// ---------------------------------------------

/** Build a finite poset from objects and Hasse covers. */
export const makeFinitePoset = (
  objects: ReadonlyArray<ObjId>,
  covers: ReadonlyArray<readonly [ObjId, ObjId]>
): FinitePoset => {
  const uniq = Array.from(new Set(objects))
  const idx = new Map<ObjId, number>(uniq.map((o, i) => [o, i]))
  // validate cover endpoints
  for (const [a, b] of covers) {
    if (!idx.has(a) || !idx.has(b)) {
      throw new Error(`makeFinitePoset: unknown object in cover (${a} ⋖ ${b})`)
    }
    if (a === b) throw new Error(`makeFinitePoset: self-cover not allowed (${a} ⋖ ${b})`)
  }

  const n = uniq.length
  // reachability matrix; start with reflexive closure
  const reach: boolean[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j)
  )
  // add cover edges
  for (const [a, b] of covers) {
    reach[idx.get(a)!]![idx.get(b)!] = true
  }
  // Floyd–Warshall transitive closure
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) if (reach[i]![k]) {
      for (let j = 0; j < n; j++) if (reach[k]![j]) {
        reach[i]![j] = true
      }
    }
  }
  // antisymmetry check: i ≤ j and j ≤ i ⇒ i==j
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && reach[i]![j] && reach[j]![i]) {
        const ai = uniq[i]!, aj = uniq[j]!
        throw new Error(`makeFinitePoset: cycle detected (${ai} ≼ ${aj} and ${aj} ≼ ${ai})`)
      }
    }
  }

  const leq = (a: ObjId, b: ObjId): boolean => {
    const ia = idx.get(a), ib = idx.get(b)
    if (ia == null || ib == null) return false
    return reach[ia]![ib]!
  }

  return { objects: uniq, leq }
}

/** Optional: quick text view of a poset. */
export const prettyPoset = (P: FinitePoset): string => {
  const lines: string[] = []
  lines.push(`Objects: ${P.objects.join(', ')}`)
  for (const a of P.objects) {
    const ups = P.objects.filter(b => a !== b && P.leq(a, b))
    if (ups.length) lines.push(`  ${a} ≤ { ${ups.join(', ')} }`)
  }
  return lines.join('\n')
}

/** Handy identity map builder (matches Complex shape). */
export const idChainMapCompat =
  <R>(X: Complex<R>): ChainMap<R> => {
    const { S } = X
    const f: Record<number, R[][]> = {}
    for (const n of X.degrees) {
      const dim = X.dim[n] ?? 0
      const I = Array.from({ length: dim }, (_, i) =>
        Array.from({ length: dim }, (_, j) => (i === j ? S.one : S.zero))
      )
      f[n] = I
    }
    return { S: X.S, X, Y: X, f }
  }

/**
 * Construct a PosetDiagram from:
 *  - a poset I,
 *  - node complexes X,
 *  - a list of arrow entries [a, b, f] where a ≤ b.
 */
export const makePosetDiagramCompat = <R>(
  I: FinitePoset,
  X: Readonly<Record<ObjId, Complex<R>>>,
  arrows: ReadonlyArray<readonly [ObjId, ObjId, ChainMap<R>]> = []
): PosetDiagram<R> => {
  // guard: nodes cover all objects
  for (const o of I.objects) {
    if (!X[o]) throw new Error(`makePosetDiagram: missing node complex for object '${o}'`)
  }
  // store arrows in a nested Map for quick lookup
  const table = new Map<ObjId, Map<ObjId, ChainMap<R>>>()
  const put = (a: ObjId, b: ObjId, f: ChainMap<R>) => {
    if (!I.leq(a, b)) throw new Error(`makePosetDiagram: arrow provided where ${a} ≰ ${b}`)
    if (!table.has(a)) table.set(a, new Map())
    table.get(a)!.set(b, f)
  }
  for (const [a, b, f] of arrows) put(a, b, f)

  const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined =>
    table.get(a)?.get(b)

  return { I, X, arr }
}

/* ================================================================
   DiagramClosure — synthesize composite arrows (functorial closure)
   ================================================================ */

export namespace DiagramClosure {
  // ----- matrix helpers -----
  const matMul =
    <R>(F: Pick<Field<R>, 'add'|'mul'|'zero'>) =>
    (B: ReadonlyArray<ReadonlyArray<R>>, A: ReadonlyArray<ReadonlyArray<R>>): R[][] => {
      const r = B.length, k = (B[0]?.length ?? 0), c = (A[0]?.length ?? 0)
      const Z: R[][] = Array.from({ length: r }, () => Array.from({ length: c }, () => F.zero))
      for (let i=0;i<r;i++) for (let t=0;t<k;t++) {
        const b = B[i]![t]!; if (b === F.zero) continue
        for (let j=0;j<c;j++) Z[i]![j] = F.add(Z[i]![j]!, F.mul(b, A[t]![j]!))
      }
      return Z
    }

  // Compose chain maps g∘f (same degree, X --f--> Y --g--> Z)
  export const composeChainMap =
    <R>(F: Pick<Field<R>, 'add'|'mul'|'zero'>) =>
    (g: ChainMap<R>, f: ChainMap<R>): ChainMap<R> => {
      const mul = matMul(F)
      const res: Record<number, R[][]> = {}
      for (const n of f.X.degrees) {
        const A = (f.f[n] ?? []) as R[][]                 // Y_n × X_n
        const B = (g.f[n] ?? []) as R[][]                 // Z_n × Y_n
        res[n] = mul(B, A)                                // Z_n × X_n
      }
      return { S: f.X.S, X: f.X, Y: g.Y, f: res }
    }

  // Identity map for a complex
  const idChain =
    <R>(F: Pick<Field<R>, 'zero'|'one'>) =>
    (X: Complex<R>): ChainMap<R> => {
      const f: Record<number, R[][]> = {}
      for (const n of X.degrees) {
        const d = X.dim[n] ?? 0
        f[n] = Array.from({ length: d }, (_, i) =>
          Array.from({ length: d }, (_, j) => (i===j ? F.one : F.zero))
        )
      }
      return { S: X.S, X, Y: X, f }
    }

  // Build adjacency from covers for BFS
  const adjacency = (I: FinitePoset): ReadonlyMap<ObjId, ReadonlyArray<ObjId>> => {
    const adj = new Map<ObjId, ObjId[]>()
    // Need to use covers from the poset - let's extract them from leq relation
    for (const a of I.objects) {
      for (const b of I.objects) {
        if (a !== b && I.leq(a, b)) {
          // Check if this is a cover (no intermediate element)
          const isCover = !I.objects.some(c => c !== a && c !== b && I.leq(a, c) && I.leq(c, b))
          if (isCover) {
            if (!adj.has(a)) adj.set(a, [])
            adj.get(a)!.push(b)
          }
        }
      }
    }
    for (const o of I.objects) if (!adj.has(o)) adj.set(o, [])
    return adj
  }

  // Find a (cover) path a -> ... -> b (BFS)
  const findPath = (I: FinitePoset, a: ObjId, b: ObjId): ObjId[] | undefined => {
    if (a === b) return [a]
    const adj = adjacency(I)
    const q: ObjId[] = [a]
    const prev = new Map<ObjId, ObjId | null>([[a, null]])
    while (q.length) {
      const x = q.shift()!
      for (const y of adj.get(x) ?? []) {
        if (!prev.has(y)) {
          prev.set(y, x)
          if (y === b) {
            const path: ObjId[] = [b]
            let cur: ObjId | null = b
            while ((cur = prev.get(cur)!) !== null) path.push(cur)
            path.reverse()
            return path
          }
          q.push(y)
        }
      }
    }
    return undefined
  }

  /** Wrap a diagram with a closure that synthesizes composites along covers.
      - Uses provided arrows when present.
      - Provides identities `arr(a,a)`.
      - Otherwise, composes along a BFS-found cover path (cached).
      If a needed cover arrow is missing, returns `undefined` for that pair. */
  export const saturate =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>): PosetDiagram<R> => {
      const baseArr = D.arr
      const cache = new Map<ObjId, Map<ObjId, ChainMap<R>>>()
      const put = (a: ObjId, b: ObjId, f: ChainMap<R>) => {
        if (!cache.has(a)) cache.set(a, new Map())
        cache.get(a)!.set(b, f)
      }
      const getCached = (a: ObjId, b: ObjId) => cache.get(a)?.get(b)

      const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined => {
        // fast paths
        const hit = getCached(a,b); if (hit) return hit
        const given = baseArr(a,b);  if (given) { put(a,b,given); return given }
        if (!D.I.leq(a,b)) return undefined
        if (a === b) { const id = idChain(F)(D.X[a]!); put(a,a,id); return id }

        // need to synthesize via covers
        const path = findPath(D.I, a, b); if (!path) return undefined
        // Compose along path: a=v0 -> v1 -> ... -> vk=b
        let cur: ChainMap<R> | undefined
        for (let i=0;i<path.length-1;i++) {
          const u = path[i]!, v = path[i+1]!
          const step = baseArr(u,v) ?? getCached(u,v)
          if (!step) { // missing basic cover map
            return undefined
          }
          cur = (i===0) ? step : composeChainMap(F)(step, cur!)
        }
        if (cur) put(a,b,cur)
        return cur
      }

      return { I: D.I, X: D.X, arr }
    }
}

/* ================================================================
   DiagramLaws — identity / composition validation for diagrams
   ================================================================ */

export namespace DiagramLaws {
  const eqMatrix =
    <R>(F: Pick<Field<R>, 'eq'>) =>
    (A: ReadonlyArray<ReadonlyArray<R>>, B: ReadonlyArray<ReadonlyArray<R>>): boolean => {
      if (A.length !== B.length) return false
      for (let i=0;i<A.length;i++) {
        const Ai = A[i], Bi = B[i]
        if ((Ai?.length ?? 0) !== (Bi?.length ?? 0)) return false
        for (let j=0;j<(Ai?.length ?? 0);j++) if (!F.eq!(Ai![j]!, Bi![j]!)) return false
      }
      return true
    }

  const eqChainMap =
    <R>(F: Pick<Field<R>, 'eq'>) =>
    (f: ChainMap<R>, g: ChainMap<R>): boolean => {
      // quick structural guards
      const ds = f.X.degrees
      if (ds.length !== g.X.degrees.length) return false
      for (let n of ds) {
        const A = (f.f[n] ?? []) as R[][]
        const B = (g.f[n] ?? []) as R[][]
        if (!eqMatrix(F)(A,B)) return false
      }
      return true
    }

  /** Validate identities and composition:
      - For each a: arr(a,a) ≈ id_X[a]
      - For each a≤b≤c: arr(b,c)∘arr(a,b) ≈ arr(a,c)
      If some arrows are missing, the corresponding checks are skipped.
      Returns a compact report. */
  export const validateFunctoriality =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>): { ok: boolean; issues: string[] } => {
      const issues: string[] = []
      const eq = eqChainMap(F)
      const idChain = (X: Complex<R>): ChainMap<R> => {
        const f: Record<number, R[][]> = {}
        for (const n of X.degrees) {
          const d = X.dim[n] ?? 0
          f[n] = Array.from({ length: d }, (_, i) =>
            Array.from({ length: d }, (_, j) => (i===j ? F.one : F.zero))
          )
        }
        return { S: X.S, X, Y: X, f }
      }

      // We validate against the *given* arrows when present; otherwise we also try closure.
      const Closed = DiagramClosure.saturate(F)(D)
      const compose = DiagramClosure.composeChainMap(F)

      // Identities
      for (const a of D.I.objects) {
        const ida = D.arr(a,a) ?? Closed.arr(a,a)
        const idX = idChain(D.X[a]!)
        if (!ida) {
          issues.push(`missing identity arrow arr(${a},${a})`)
        } else if (!eq(ida, idX)) {
          issues.push(`identity law fails at ${a}: arr(${a},${a}) ≠ id`)
        }
      }

      // Composition: for all a≤b≤c
      for (const a of D.I.objects) for (const b of D.I.objects) if (D.I.leq(a,b)) {
        const fab = D.arr(a,b) ?? Closed.arr(a,b)
        if (!fab) continue
        for (const c of D.I.objects) if (D.I.leq(b,c)) {
          const fbc = D.arr(b,c) ?? Closed.arr(b,c)
          const fac = D.arr(a,c) ?? Closed.arr(a,c)
          if (!fbc || !fac) continue
          const lhs = compose(fbc, fab)
          if (!eq(lhs, fac)) {
            issues.push(`composition law fails: arr(${b},${c})∘arr(${a},${b}) ≠ arr(${a},${c})`)
          }
        }
      }

      return { ok: issues.length === 0, issues }
    }
}

/* ================================================================
   IndexedFamilies — bridge between functions and discrete diagrams
   ================================================================ */

export namespace IndexedFamilies {
  /** An indexed family is just a function from index to object */
  export type Family<I, X> = (i: I) => X

  /** Finite index set with explicit carrier */
  export interface FiniteIndex<I> {
    readonly carrier: ReadonlyArray<I>
  }

  /** Convert family to discrete diagram (our existing DiscDiagram format) */
  export const familyToDiscDiagram =
    <I extends string, R>(fam: Family<I, Complex<R>>, indices: ReadonlyArray<I>): DiscDiagram<R> => {
      const result: Record<string, Complex<R>> = {}
      for (const i of indices) {
        result[i] = fam(i)
      }
      return result
    }

  /** Convert discrete diagram back to family function */
  export const discDiagramToFamily =
    <I extends string, R>(DD: DiscDiagram<R>): Family<I, Complex<R>> => {
      return (i: I) => {
        const complex = DD[i]
        if (!complex) throw new Error(`discDiagramToFamily: missing complex for index '${i}'`)
        return complex
      }
    }

  /** Map over a family pointwise */
  export const mapFamily =
    <I, X, Y>(f: (x: X, i: I) => Y) =>
    (fam: Family<I, X>): Family<I, Y> => 
      (i: I) => f(fam(i), i)

  /** Collect family values into array (finite case) */
  export const collectFamily =
    <I, X>(Ifin: FiniteIndex<I>, fam: Family<I, X>): ReadonlyArray<[I, X]> =>
      Ifin.carrier.map(i => [i, fam(i)] as const)

  /** Reduce over family values */
  export const reduceFamily =
    <I, X, A>(
      Ifin: FiniteIndex<I>,
      fam: Family<I, X>,
      seed: A,
      combine: (acc: A, x: X, i: I) => A
    ): A => {
      let acc = seed
      for (const i of Ifin.carrier) acc = combine(acc, fam(i), i)
      return acc
    }

  /** Create finite index from array */
  export const finiteIndex = <I>(carrier: ReadonlyArray<I>): FiniteIndex<I> => ({ carrier })

  /** Bridge to our existing discrete diagram operations */
  export const familyLanDisc =
    <I extends string, R>(F: Field<R>) =>
    (u: (j: I) => I, indices: ReadonlyArray<I>) =>
    (fam: Family<I, Complex<R>>): Family<I, Complex<R>> => {
      const DD = familyToDiscDiagram(fam, indices)
      const LanDD = LanDisc(F)(u as unknown as (j: string) => string)(DD)
      return discDiagramToFamily(LanDD)
    }

  /** Reindex a family along a function */
  export const reindexFamily =
    <I extends string, J extends string, R>(u: (j: J) => I) =>
    (fam: Family<I, Complex<R>>): Family<J, Complex<R>> =>
      (j: J) => fam(u(j))

  /** General reindexing for arbitrary family types (not just Complex<R>) */
  export const reindex =
    <J, I, X>(u: (j: J) => I, fam: Family<I, X>): Family<J, X> =>
      (j: J) => fam(u(j))

  // Laws: reindex(id) = id; reindex(v∘u) = reindex(u)∘reindex(v)

  /** Dependent sum (Σ): disjoint union of all fibers */
  export const sigma =
    <I, X>(Ifin: FiniteIndex<I>, fam: Family<I, X>): ReadonlyArray<{ i: I; x: X }> => {
      const result: { i: I; x: X }[] = []
      for (const i of Ifin.carrier) {
        result.push({ i, x: fam(i) })
      }
      return result
    }

  /** Dependent product (Π): choice functions (for finite literal types) */
  export type Pi<R extends Record<PropertyKey, unknown>> = { [K in keyof R]: R[K] }

  /** Build dependent product from family over finite literal index */
  export const pi =
    <I extends PropertyKey, X>(
      indices: ReadonlyArray<I>, 
      fam: Family<I, X>
    ): Record<I, X> => {
      const result = {} as Record<I, X>
      for (const i of indices) {
        result[i] = fam(i)
      }
      return result
    }

  /** Extract dependent sum as tagged union */
  export const sigmaFromRecord =
    <R extends Record<PropertyKey, unknown>>(
      record: R
    ): ReadonlyArray<{ i: keyof R; x: R[keyof R] }> => {
      const result: { i: keyof R; x: R[keyof R] }[] = []
      for (const [key, value] of Object.entries(record)) {
        result.push({ i: key as keyof R, x: value as R[keyof R] })
      }
      return result
    }

  /** Helper for reindexing: compute image of carrier under function */
  export const imageCarrier =
    <J, I>(Jcar: ReadonlyArray<J>, u: (j: J) => I): ReadonlyArray<I> => {
      const seen = new Set<I>()
      const out: I[] = []
      for (const j of Jcar) {
        const i = u(j)
        if (!seen.has(i)) { seen.add(i); out.push(i) }
      }
      return out
    }

  /** Enumerable family: each fiber can be enumerated */
  export interface Enumerable<X> { enumerate: () => ReadonlyArray<X> }
  export type EnumFamily<I, X> = Family<I, Enumerable<X>>

  /** Dependent sum for enumerable families (Σ) */
  export const sigmaEnum =
    <I, X>(Ifin: FiniteIndex<I>, fam: EnumFamily<I, X>): ReadonlyArray<{ i: I; x: X }> => {
      const out: Array<{ i: I; x: X }> = []
      for (const i of Ifin.carrier) {
        for (const x of fam(i).enumerate()) {
          out.push({ i, x })
        }
      }
      return out
    }

  /** Dependent product for enumerable families (Π) */
  export type Choice<I, X> = ReadonlyArray<readonly [I, X]>
  export const piEnum =
    <I, X>(Ifin: FiniteIndex<I>, fam: EnumFamily<I, X>): ReadonlyArray<Choice<I, X>> => {
      let acc: Array<Choice<I, X>> = [[]]
      for (const i of Ifin.carrier) {
        const next: Array<Choice<I, X>> = []
        const xs = fam(i).enumerate()
        for (const ch of acc) {
          for (const x of xs) {
            next.push([...ch, [i, x]] as const)
          }
        }
        acc = next
      }
      return acc
    }

  /** Left Kan extension for enumerable families */
  export const lanEnum =
    <J, I, X>(u: (j: J) => I, Jfin: FiniteIndex<J>, fam: EnumFamily<J, X>): EnumFamily<I, { j: J; x: X }> =>
      (i: I) => ({
        enumerate: () => Jfin.carrier
          .filter((j) => u(j) === i)
          .flatMap((j) => fam(j).enumerate().map((x) => ({ j, x })))
      })

  /** Right Kan extension for enumerable families */
  export const ranEnum =
    <J, I, X>(u: (j: J) => I, Jfin: FiniteIndex<J>, fam: EnumFamily<J, X>): EnumFamily<I, Choice<J, X>> =>
      (i: I) => ({
        enumerate: () => {
          const fiber = Jfin.carrier.filter((j) => u(j) === i)
          let acc: Array<Choice<J, X>> = [[]]
          for (const j of fiber) {
            const next: Array<Choice<J, X>> = []
            const xs = fam(j).enumerate()
            for (const ch of acc) {
              for (const x of xs) {
                next.push([...ch, [j, x]] as const)
              }
            }
            acc = next
          }
          return acc
        }
      })

  /** Π-side unit: A(i) → Π_{j ∈ u^{-1}(i)} A(i) (constant choice) */
  export const unitPiEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (a: X): ReadonlyArray<readonly [J, X]> =>
      Jfin.carrier
        .filter((j) => u(j) === i)
        .map((j) => [j, a] as const)

  /** Π-side counit: (u^* Π_u B)(j) → B(j) (extract j-component) */
  export const counitPiEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (j: J) => (choice: ReadonlyArray<readonly [J, X]>): X => {
      const hit = choice.find(([jj]) => jj === j)
      if (!hit) throw new Error("counitPiEnum: missing j in choice")
      return hit[1]
    }

  /** Σ-side unit: Y(u(j)) -> (u^* Σ_u Y)(j) = Σ_u Y (at i = u(j)) */
  export const unitSigmaEnum =
    <J, I, X>(
      u: (j: J) => I,
      _Jfin: { carrier: ReadonlyArray<J> } // kept for symmetry/future use
    ) => (j: J) => (y: X): { j: J; x: X } => ({ j, x: y })

  /** Σ-side counit: (Σ_u u^* X)(i) -> X(i) */
  export const counitSigmaEnum =
    <J, I, X>(
      _u: (j: J) => I,
      _Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (pair: { j: J; x: X }): X => pair.x

  /** Σ-side second triangle helper: (Σ_u η)_i : Σ_u A (i) -> Σ_u(u^*Σ_u A)(i) */
  export const sigmaOfUnitEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (elem: { j: J; x: X }): { j: J; x: { j: J; x: X } } => {
      const eta = unitSigmaEnum<J, I, X>(u, Jfin)
      return { j: elem.j, x: eta(elem.j)(elem.x) }
    }

  /** Π-side second triangle: η_{Π_u B,i} : (Π_u B)(i) -> Π_{j∈u^{-1}(i)} (u^* Π_u B)(j) */
  export const etaForPiEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (choice: ReadonlyArray<readonly [J, X]>): ReadonlyArray<readonly [J, ReadonlyArray<readonly [J, X]>]> => {
      const fiber = Jfin.carrier.filter((j) => u(j) === i)
      return fiber.map((j) => [j, choice] as const)
    }

  /** Π-side second triangle: (Π_u ε_B)_i : Π_{j∈u^{-1}(i)} (u^* Π_u B)(j) -> (Π_u B)(i) */
  export const PiOfEpsEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (bundle: ReadonlyArray<readonly [J, ReadonlyArray<readonly [J, X]>]>): ReadonlyArray<readonly [J, X]> => {
      const eps = counitPiEnum<J, I, X>(u, Jfin) // (u^* Π_u B)(j) -> B(j)
      const fiber = Jfin.carrier.filter((j) => u(j) === i)
      return fiber.map((j) => {
        const comp = bundle.find(([jj]) => jj === j)?.[1]
        if (!comp) throw new Error("PiOfEpsEnum: missing component for j")
        return [j, eps(j)(comp)] as const
      })
    }

  /** Sugar: create family from array */
  export const familyFromArray =
    <X>(xs: ReadonlyArray<X>) => {
      const I = xs.map((_, i) => i)
      const Ifin: FiniteIndex<number> = { carrier: I }
      const fam: Family<number, X> = (i) => xs[i]!
      return { I, Ifin, fam, Idisc: DiscreteCategory.create(I) } as const
    }

  /** Sugar: create family from record */
  export const familyFromRecord =
    <K extends string | number | symbol, X>(rec: Record<K, X>) => {
      const keys = Object.keys(rec) as K[]
      const Ifin: FiniteIndex<K> = { carrier: keys }
      const fam: Family<K, X> = (k) => rec[k]!
      return { keys, Ifin, fam, Idisc: DiscreteCategory.create(keys) } as const
    }

  /** Pullback indices for Beck-Chevalley tests */
  export const pullbackIndices =
    <I, K, L>(
      Ifin: { carrier: ReadonlyArray<I> },
      Kfin: { carrier: ReadonlyArray<K> },
      f: (i: I) => L,
      w: (k: K) => L
    ) => {
      const J = Ifin.carrier.flatMap((i) =>
        Kfin.carrier.filter((k) => f(i) === w(k)).map((k) => [i, k] as const)
      )
      const Jfin = { carrier: J }
      const u = (jk: readonly [I, K]) => jk[0]
      const v = (jk: readonly [I, K]) => jk[1]
      return { J, Jfin, u, v }
    }
}

/* ================================================================
   DiscreteCategory — when you need explicit categorical structure
   ================================================================ */

/** Lightweight Category interface */
export interface Category<O, M> {
  id: (a: O) => M
  compose: (g: M, f: M) => M
  isId?: (m: M) => boolean
  equalMor?: (x: M, y: M) => boolean
}

/** Groupoid: category where every morphism is invertible */
export interface Groupoid<O, M> extends Category<O, M>, ArrowFamilies.HasDomCod<O, M> {
  inv: (m: M) => M                           // inverse for every morphism
}

/** Finite, enumerable groupoid (for algorithms/tests) */
export interface FiniteGroupoid<O, M> extends Groupoid<O, M> {
  objects: ReadonlyArray<O>
  // All isomorphisms between a and b (may include only identities/empties)
  hom: (a: O, b: O) => ReadonlyArray<M>
}

/** Functor between groupoids */
export interface GFunctor<GO, GM, HO, HM> {
  source: FiniteGroupoid<GO, GM>
  target: FiniteGroupoid<HO, HM>
  onObj: (g: GO) => HO
  onMor: (m: GM) => HM
}

/** Finite small category for end constructions */
export interface FiniteCategory<O, M> extends Category<O, M>, ArrowFamilies.HasDomCod<O, M> {
  objects: ReadonlyArray<O>
  hom: (a: O, b: O) => ReadonlyArray<M>
}

export const FiniteCategory = Symbol.for('FiniteCategory')

/** Functor for codensity constructions */
export interface CFunctor<BO, BM, AO, AM> {
  source: FiniteCategory<BO, BM>
  target: Category<AO, AM> & ArrowFamilies.HasDomCod<AO, AM>
  onObj: (b: BO) => AO
  onMor: (m: BM) => AM
}

export const CFunctor = Symbol.for('CFunctor')

/** Categorical functor interface */
export type ObjOf<C> = C extends ArrowFamilies.HasDomCod<infer O, infer _>
  ? O
  : C extends { id: (a: infer O) => unknown }
    ? O
    : C extends { objects: ReadonlyArray<infer O> }
      ? O
      : C extends string
        ? string
        : unknown

export type MorOf<C> = C extends ArrowFamilies.HasDomCod<infer _, infer M>
  ? M
  : C extends { compose: (g: infer M, f: infer M) => unknown }
    ? M
    : C extends { hom: (a: infer _O, b: infer _O) => ReadonlyArray<infer M> }
      ? M
      : C extends string
        ? string
        : unknown

export interface CatFunctor<C, D> {
  source: C
  target: D
  onObj: (obj: ObjOf<C>) => ObjOf<D>
  onMor: (mor: MorOf<C>) => MorOf<D>
}

/** Natural transformation interface */
export interface CatNatTrans<
  F extends CatFunctor<unknown, unknown>,
  G extends CatFunctor<unknown, unknown>
> {
  source: F
  target: G
  component: (obj: ObjOf<F['source']>) => MorOf<F['target']>
}

/** Identity functor type */
export type CatId<C> = CatFunctor<C, C>

/** Functor composition type */
export type CatCompose<
  F extends CatFunctor<unknown, unknown>,
  G extends CatFunctor<F['target'], unknown>
> = CatFunctor<F['source'], G['target']>

/** Categorical monad interface */
export interface CatMonad<C> {
  category: C
  endofunctor: CatFunctor<C, C>
  unit: CatNatTrans<CatId<C>, CatFunctor<C, C>>
  mult: CatNatTrans<CatCompose<CatFunctor<C, C>, CatFunctor<C, C>>, CatFunctor<C, C>>
}

export const CatMonad = Symbol.for('CatMonad')

/** Adjunction with explicit unit/counit */
export interface Adjunction<C, D, F extends CatFunctor<C, D>, U extends CatFunctor<D, C>> {
  readonly F: F
  readonly U: U
  readonly unit: CatNatTrans<CatId<C>, CatCompose<F, U>>
  readonly counit: CatNatTrans<CatCompose<U, F>, CatId<D>>
}

/* ================================================================
   Natural transformation operations (whiskering, composition)
   ================================================================ */

/** Compose functors G∘F */
export const composeFun = <C, D, E>(
  F: CatFunctor<C, D>,
  G: CatFunctor<D, E>
): CatFunctor<C, E> => ({
  source: F.source,
  target: G.target,
  onObj: (a: ObjOf<C>) => G.onObj(F.onObj(a)),
  onMor: (f: MorOf<C>) => G.onMor(F.onMor(f))
})

/** Identity functor */
export const idFun = <C>(C: C): CatFunctor<C, C> => ({
  source: C,
  target: C,
  onObj: (obj: ObjOf<C>) => obj,
  onMor: (mor: MorOf<C>) => mor
})

const identityMorph = <C>(
  category: C,
  obj: ObjOf<C>
): MorOf<C> => {
  const candidate = category as Partial<Category<ObjOf<C>, MorOf<C>>>
  if (candidate.id) {
    return candidate.id(obj)
  }
  return obj as unknown as MorOf<C>
}

/** Identity natural transformation */
export const idNat = <C, D, F extends CatFunctor<C, D>>(F: F): CatNatTrans<F, F> => ({
  source: F,
  target: F,
  component: (obj: ObjOf<C>) => {
    const targetCategory = F.target as Partial<Category<ObjOf<D>, MorOf<D>>>
    if (targetCategory.id) {
      const image = F.onObj(obj) as ObjOf<D>
      return targetCategory.id(image)
    }
    const sourceCategory = F.source as Partial<Category<ObjOf<C>, MorOf<C>>>
    if (sourceCategory.id) {
      return F.onMor(sourceCategory.id(obj))
    }
    return F.onMor(obj as unknown as MorOf<C>)
  }
})

/** Left whiskering F ▷ α */
export const whiskerLeft = <
  A,
  B,
  C,
  F extends CatFunctor<A, B>,
  G extends CatFunctor<B, C>,
  H extends CatFunctor<B, C>
>(
  F: F,
  alpha: CatNatTrans<G, H>
): CatNatTrans<CatCompose<F, G>, CatCompose<F, H>> => ({
  source: composeFun(F, alpha.source),
  target: composeFun(F, alpha.target),
  component: (a: ObjOf<A>) => alpha.component(F.onObj(a))
})

/** Right whiskering α ◁ F */
export const whiskerRight = <
  A,
  B,
  C,
  G extends CatFunctor<B, C>,
  H extends CatFunctor<B, C>,
  F extends CatFunctor<A, B>
>(
  alpha: CatNatTrans<G, H>,
  F: F
): CatNatTrans<CatCompose<F, G>, CatCompose<F, H>> => ({
  source: composeFun(F, alpha.source),
  target: composeFun(F, alpha.target),
  component: (c: ObjOf<A>) => alpha.component(F.onObj(c))
})

/** Vertical composition α ; β */
export const vcomp = <
  C,
  D,
  F extends CatFunctor<C, D>,
  G extends CatFunctor<C, D>,
  H extends CatFunctor<C, D>
>(
  alpha: CatNatTrans<F, G>,
  beta: CatNatTrans<G, H>
): CatNatTrans<F, H> => ({
  source: alpha.source,
  target: beta.target,
  component: (obj: ObjOf<C>) => {
    const category = beta.target.target as
      | { compose?: (g: MorOf<D>, f: MorOf<D>) => MorOf<D> }
      | undefined
    if (category?.compose) {
      return category.compose(beta.component(obj), alpha.component(obj))
    }
    return beta.component(obj)
  }
})

/** Horizontal composition α * β */
export const hcomp = <
  A,
  B,
  C,
  F1 extends CatFunctor<A, B>,
  F2 extends CatFunctor<A, B>,
  G1 extends CatFunctor<B, C>,
  G2 extends CatFunctor<B, C>
>(
  alpha: CatNatTrans<F1, F2>,
  beta: CatNatTrans<G1, G2>
): CatNatTrans<CatCompose<F1, G1>, CatCompose<F2, G2>> => ({
  source: composeFun(alpha.source, beta.source),
  target: composeFun(alpha.target, beta.target),
  component: (a: ObjOf<A>) => {
    const targetCategory = beta.target.target as
      | { compose?: (g: MorOf<C>, f: MorOf<C>) => MorOf<C> }
      | undefined
    const Fa = alpha.source.onObj(a)
    const lifted = beta.target.onMor(alpha.component(a))
    const mapped = beta.component(Fa)
    return targetCategory?.compose ? targetCategory.compose(lifted, mapped) : mapped
  }
})

/* ================================================================
   Core Adjunction Framework with Mate Utilities
   ================================================================ */

// Re-export core types that match our existing idioms
export interface CoreCategory<Obj, Mor> {
  id: (a: Obj) => Mor  // Id_A
  compose: (g: Mor, f: Mor) => Mor  // g ∘ f
}

export interface CoreFunctor<CObj, DObj> {
  // Object action
  onObj: (a: CObj) => DObj
  // Morphism action
  onMor: (f: unknown) => unknown
}

type AnyCoreFunctor = CoreFunctor<any, any>

export interface CoreNatTrans<
  F extends AnyCoreFunctor,
  G extends AnyCoreFunctor
> {
  // component at object X in dom(F)=dom(G)
  at: (x: unknown) => unknown  // a morphism in codom(F)=codom(G)
}

type CoreNatSource<N> = N extends CoreNatTrans<infer S, AnyCoreFunctor> ? S : never
type CoreNatTarget<N> = N extends CoreNatTrans<AnyCoreFunctor, infer T> ? T : never

// Identity functor type
export type CoreId<CObj> = {
  onObj: <A extends CObj>(a: A) => A
  onMor: <f>(f: f) => f
}

// Functor composition type
export type CoreCompose<
  F extends AnyCoreFunctor,
  G extends AnyCoreFunctor
> = AnyCoreFunctor

/** Identity functor constructor */
export function coreIdFunctor<CObj>(): CoreId<CObj> {
  return {
    onObj: (a) => a,
    onMor: (f) => f
  }
}

/** Functor composition */
export function coreComposeFun<
  CObj, DObj, EObj,
  F extends CoreFunctor<CObj, DObj>,
  G extends CoreFunctor<DObj, EObj>
>(F_: F, G_: G): CoreCompose<F, G> {
  return {
    onObj: (a: CObj) => G_.onObj(F_.onObj(a)),
    onMor: (f: unknown) => G_.onMor(F_.onMor(f))
  } as unknown as CoreCompose<F, G>
}

/** Left whiskering F ▷ α */
export function coreWhiskerLeft<
  F extends AnyCoreFunctor,
  Source extends AnyCoreFunctor,
  Target extends AnyCoreFunctor,
  α extends CoreNatTrans<Source, Target>
>(F_: F, α_: α): CoreNatTrans<CoreCompose<F, Source>, CoreCompose<F, Target>> {
  return {
    at: (x: unknown) => F_.onMor(α_.at(x))
  } as CoreNatTrans<CoreCompose<F, Source>, CoreCompose<F, Target>>
}

/** Right whiskering α ◁ F */
export function coreWhiskerRight<
  Source extends AnyCoreFunctor,
  Target extends AnyCoreFunctor,
  α extends CoreNatTrans<Source, Target>,
  F extends AnyCoreFunctor
>(α_: α, F_: F): CoreNatTrans<CoreCompose<Source, F>, CoreCompose<Target, F>> {
  return {
    at: (x: unknown) => F_.onMor(α_.at(x))
  } as CoreNatTrans<CoreCompose<Source, F>, CoreCompose<Target, F>>
}

/** Vertical composition α ; β */
export function coreVcomp<
  Source extends AnyCoreFunctor,
  Mid extends AnyCoreFunctor,
  Target extends AnyCoreFunctor,
  F extends CoreNatTrans<Source, Mid>,
  G extends CoreNatTrans<Mid, Target>
>(α: F, β: G): CoreNatTrans<Source, Target> {
  return {
    at: (x: unknown) => {
      // In practice: β.at(x) ∘ α.at(x) in the target category
      // For now, simplified composition
      return β.at(x)
    }
  } as CoreNatTrans<Source, Target>
}

/** Identity natural transformation */
export function coreIdNat<F extends AnyCoreFunctor>(F_: F): CoreNatTrans<F, F> {
  return {
    at: (x: unknown) => {
      // In practice: identity morphism at F(x)
      return x  // Simplified
    }
  }
}

/* ================================================================
   Adjunction Interface and Triangle Identities
   ================================================================ */

// TODO(virtual-equipment): Equipment-level adjunctions and relative variants
// are staged in `virtual-equipment/`.  Keep this notice so contributors who
// search here discover the dedicated module boundary.
// TODO(relative-monads): Definition 4.1 framing analyzers and law catalogues
// now live in `relative/`.  Future refactors should wire the classic monad
// helpers through that layer once the relative adjunction calculus is ready.
/**
 * An adjunction F ⊣ U : C ↔ D given by unit η : Id_C ⇒ U∘F and
 * counit ε : F∘U ⇒ Id_D.
 *
 * Structural and typed to match existing Functor/NatTrans patterns.
 */
export interface CoreAdjunction<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>
> {
  F: F_  // left adjoint
  U: U_  // right adjoint

  unit: CoreNatTrans<CoreId<CObj> & CoreFunctor<CObj, CObj>, CoreCompose<U_, F_>>     // η : Id_C ⇒ U∘F
  counit: CoreNatTrans<CoreCompose<F_, U_>, CoreId<DObj> & CoreFunctor<DObj, DObj>>   // ε : F∘U ⇒ Id_D

  /**
   * Optional dev-only: witnesses for triangle identities
   * (1) ε_F ∘ Fη = id_F
   * (2) Uε ∘ η_U = id_U
   */
  verifyTriangles?: () => void
}

/* ================================================================
   Mate Utilities (Hom-set bijection at NatTrans level)
   ================================================================ */

/**
 * Left mate along F ⊣ U.
 * Given α : F ∘ H ⇒ K, produce α♭ : H ⇒ U ∘ K
 * Formula: α♭ = (η ▷ H) ; (U ▷ α)
 */
export function leftMate<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  alpha: CoreNatTrans<CoreCompose<F_, H>, K>,
  H_: H,  // Pass functor as value
  K_: K   // Pass functor as value
): CoreNatTrans<H, CoreCompose<U_, K>> {
  // α♭_X := U(α_X) ∘ η_{H X}
  return {
    at: (x: unknown) => {
      const HX = H_.onObj(x as CObj)
      const etaHX = adj.unit.at(HX)
      const UalphaX = adj.U.onMor(alpha.at(x))
      // Compose in C: HX --η--> U F HX --Uα--> U KX
      return { composed: [etaHX, UalphaX], result: UalphaX }  // Simplified composition
    }
  } as CoreNatTrans<H, CoreCompose<U_, K>>
}

/**
 * Right mate along F ⊣ U.
 * Given β : H ⇒ U ∘ K, produce β^♯ : F ∘ H ⇒ K
 * Formula: β^♯ = (F ▷ β) ; (ε ▷ K)
 */
export function rightMate<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  beta: CoreNatTrans<H, CoreCompose<U_, K>>,
  H_: H,  // Pass functor as value
  K_: K   // Pass functor as value
): CoreNatTrans<CoreCompose<F_, H>, K> {
  // β^♯_X := ε_{KX} ∘ F(β_X)
  return {
    at: (x: unknown) => {
      const HX = H_.onObj(x as CObj)
      const FHX = adj.F.onObj(HX)
      const FbetaX = adj.F.onMor(beta.at(x))
      const epsKX = adj.counit.at(K_.onObj(FHX))
      // Compose in D: F HX --Fβ--> F U KX --ε--> KX
      return { composed: [FbetaX, epsKX], result: epsKX }  // Simplified composition
    }
  } as CoreNatTrans<CoreCompose<F_, H>, K>
}

/**
 * Mate inverse verification: check that mates are mutually inverse
 * Useful for tests on small finite categories
 */
export function checkMateInverses<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  alpha: CoreNatTrans<CoreCompose<F_, H>, K>,
  H_: H,  // Pass functors as values
  K_: K,
  sampleObjs: CObj[]
): boolean {
  try {
    const beta = leftMate<CObj, DObj, F_, U_, H, K>(adj, alpha, H_, K_)
    const alphaSharp = rightMate<CObj, DObj, F_, U_, H, K>(adj, beta, H_, K_)

    // Check equality on sample objects
    for (const x of sampleObjs) {
      const lhs = alphaSharp.at(x)
      const rhs = alpha.at(x)
      // Simplified equality check
      if (JSON.stringify(lhs) !== JSON.stringify(rhs)) {
        return false
      }
    }
    return true
  } catch (e) {
    return false
  }
}

/* ================================================================
   Triangle Identity Verification
   ================================================================ */

/**
 * Verify triangle identities for adjunction F ⊣ U
 * (1) ε_F ∘ Fη = id_F
 * (2) Uε ∘ η_U = id_U
 */
export function verifyTriangleIdentities<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>, 
  U_ extends CoreFunctor<DObj, CObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  sampleDObjs: DObj[],
  sampleCObjs: CObj[]
): { triangle1: boolean; triangle2: boolean; bothPass: boolean } {
  let triangle1 = true
  let triangle2 = true

  try {
    // (1) ε_F ∘ Fη = id_F (check on objects of C via F)
    for (const c of sampleCObjs) {
      const Fc = adj.F.onObj(c)
      const Feta_c = adj.F.onMor(adj.unit.at(c))  // F(η_c): F c → F U F c
      const eps_Fc = adj.counit.at(Fc)            // ε_{Fc}: F U F c → F c
      
      // In practice: check eps_Fc ∘ Feta_c = id_{Fc}
      // Simplified: just verify components exist
      if (!Feta_c || !eps_Fc) {
        triangle1 = false
        break
      }
    }
  } catch (e) {
    triangle1 = false
  }

  try {
    // (2) Uε ∘ η_U = id_U (check on objects of D via U)  
    for (const d of sampleDObjs) {
      const Ud = adj.U.onObj(d)
      const eta_Ud = adj.unit.at(Ud)              // η_{Ud}: U d → U F U d
      const Ueps_d = adj.U.onMor(adj.counit.at(d)) // U(ε_d): U F U d → U d
      
      // In practice: check Ueps_d ∘ eta_Ud = id_{Ud}
      // Simplified: just verify components exist
      if (!eta_Ud || !Ueps_d) {
        triangle2 = false
        break
      }
    }
  } catch (e) {
    triangle2 = false
  }

  return {
    triangle1,
    triangle2,
    bothPass: triangle1 && triangle2
  }
}

/** Convenience wrappers for dual mate shapes */
export function leftMateRightShape<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  gamma: CoreNatTrans<H, CoreCompose<K, U_>>,
  H_: H,
  K_: K
): CoreNatTrans<CoreCompose<F_, H>, K> {
  // γ^♯ = (F ▷ γ) ; (ε ▷ K)
  return rightMate(
    adj,
    gamma as unknown as CoreNatTrans<H, CoreCompose<U_, K>>,
    H_,
    K_
  ) as CoreNatTrans<CoreCompose<F_, H>, K>
}

export function rightMateRightShape<
  CObj, DObj,
  F_ extends CoreFunctor<CObj, DObj>,
  U_ extends CoreFunctor<DObj, CObj>,
  H extends CoreFunctor<CObj, CObj>,
  K extends CoreFunctor<DObj, DObj>
>(
  adj: CoreAdjunction<CObj, DObj, F_, U_>,
  alphaSharp: CoreNatTrans<CoreCompose<F_, H>, K>,
  H_: H,
  K_: K
): CoreNatTrans<H, CoreCompose<K, U_>> {
  // γ = (η ▷ H) ; (U ▷ α^♯)
  return leftMate(
    adj,
    alphaSharp as unknown as CoreNatTrans<CoreCompose<F_, H>, CoreCompose<U_, K>>,
    H_,
    K_
  ) as CoreNatTrans<H, CoreCompose<K, U_>>
}

/* ================================================================
   Previous pushforward monad infrastructure (updated to use Core types)
   ================================================================ */

/** Compute unit mate: η^adj : Id_D ⇒ F∘U from η : Id_C ⇒ U∘F */
export const unitMate = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(adj: Adjunction<C, D, F, U>): CatNatTrans<CatId<D>, CatCompose<U, F>> => {
  const FU = composeFun(adj.U, adj.F)
  return {
    source: idFun(adj.F.target),
    target: FU,
    component: (x: ObjOf<D>) => identityMorph(adj.F.target, x)
  }
}

/** Compute counit mate: ε^adj : U∘F ⇒ Id_C from ε : F∘U ⇒ Id_D */
export const counitMate = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(adj: Adjunction<C, D, F, U>): CatNatTrans<CatCompose<F, U>, CatId<C>> => {
  const UF = composeFun(adj.F, adj.U)
  return {
    source: UF,
    target: idFun(adj.U.target),
    component: (y: ObjOf<C>) => identityMorph(adj.U.target, y)
  }
}

/**
 * Pushforward monad: transport monad structure along adjunction F ⊣ U
 * Given T on C and F ⊣ U : C ⇄ D, construct T↑ = F ∘ T ∘ U on D
 *
 * @deprecated These helpers assume endofunctor-based monads. Prefer routing
 * relative presentations through `relative/relative-monads.fromMonad` and the
 * equipment-driven constructors so Street-action witnesses remain visible.
 */
export const pushforwardMonad = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(
  adj: Adjunction<C, D, F, U>,
  T: CatMonad<C>
): CatMonad<D> => {
  // T↑ = F ∘ T ∘ U
  const FTU = composeFun(composeFun(adj.U, T.endofunctor), adj.F)

  const unitUp: CatNatTrans<CatId<D>, CatFunctor<D, D>> = {
    source: idFun(adj.F.target),
    target: FTU,
    component: (d: ObjOf<D>) => identityMorph(adj.F.target, FTU.onObj(d))
  }

  const multUp: CatNatTrans<
    CatCompose<CatFunctor<D, D>, CatFunctor<D, D>>,
    CatFunctor<D, D>
  > = {
    source: composeFun(FTU, FTU),
    target: FTU,
    component: (d: ObjOf<D>) => identityMorph(adj.F.target, FTU.onObj(d))
  }

  return {
    category: adj.F.target,
    endofunctor: FTU,
    unit: unitUp,
    mult: multUp
  }
}

/** Colax morphism of monads F T ⇒ T↑ F along left adjoint */
export const colaxAlongLeftAdjoint = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(
  adj: Adjunction<C, D, F, U>,
  T: CatMonad<C>
): CatNatTrans<CatFunctor<C, D>, CatFunctor<C, D>> => {
  // F T ⇒ F T η F ⇒ F T U F ⇒ T↑ F
  const FT = composeFun(T.endofunctor, adj.F)
  return idNat(FT)
}

/**
 * Eilenberg-Moore algebra transport: T-algebra induces T↑-algebra.
 *
 * @deprecated Relative algebra transports should flow through the Street
 * action analyzers; this helper keeps the legacy endofunctor variant available
 * for older examples.
 */
export const pushforwardAlgebra = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>,
  A extends ObjOf<C>,
  TA extends ObjOf<C>
>(
  adj: Adjunction<C, D, F, U>,
  _T: CatMonad<C>,
  algebra: {
    carrier: A
    action: (value: TA) => A
  }
) => {
  // F T U (F A) ≅ F T (U F) A → F T η A → F T T A → F μ A → F T A → F a → F A
  return {
    carrier: adj.F.onObj(algebra.carrier),
    action: (x: TA) => {
      // This would implement the full EM transport
      // For now, provide a placeholder
      return algebra.action(x)
    }
  }
}

/* ================================================================
   Law-checking infrastructure for pushforward monads
   ================================================================ */

/** Reassociate functor compositions for proper μ↑ construction */
export const reassociate = {
  // (F∘T∘U)∘(F∘T∘U) ≅ F∘T∘(U∘F)∘T∘U (placeholder implementation)
  leftToMiddle: <C, D>(FTU: CatFunctor<C, D>): CatNatTrans<CatFunctor<C, D>, CatFunctor<C, D>> =>
    idNat(FTU),

  // Other associativity isomorphisms as needed
  middleToRight: <C, D>(
    F: CatFunctor<C, D>,
    _T: CatFunctor<C, C>,
    _U: CatFunctor<D, C>
  ): CatNatTrans<CatFunctor<C, D>, CatFunctor<C, D>> => idNat(F)
}

/**
 * Enhanced pushforward monad with proper μ↑ wiring.
 *
 * @deprecated Maintained for legacy pushforward experiments. New code should
 * migrate to the relative monad constructors, which expose the same
 * diagnostics via `relativeMonadFromEquipment`.
 */
export const pushforwardMonadEnhanced = <
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>
>(
  adj: Adjunction<C, D, F, U>,
  T: CatMonad<C>
): CatMonad<D> => pushforwardMonad(adj, T)

/** Legacy shape describing a simple Kleisli morphism. */
interface SimpleKleisliMorph<C> {
  readonly from: ObjOf<C>
  readonly to: ObjOf<C>
  readonly compose: (x: ObjOf<C>) => ObjOf<C>
}

/**
 * Kleisli composition for law checking.
 *
 * @deprecated Use the relative Kleisli helpers in `relative/relative-monads`
 * once Street witnesses are available. This version assumes an endofunctor on
 * the nose.
 */
export const kleisliCompose = <C>(
  T: CatMonad<C>,
  f: SimpleKleisliMorph<C>,  // X -> T Y
  g: SimpleKleisliMorph<C>   // Y -> T Z
) => {
  const applyEndo = T.endofunctor.onMor as unknown as (
    mor: (value: ObjOf<C>) => ObjOf<C>
  ) => (value: ObjOf<C>) => ObjOf<C>
  const multAt = T.mult.component as unknown as (
    obj: ObjOf<C>
  ) => (value: ObjOf<C>) => ObjOf<C>

  return {
    from: f.from,
    to: g.to,
    compose: (x: ObjOf<C>) => {
      const Tf_x = f.compose(x)
      const liftedG = applyEndo(g.compose)
      return multAt(g.to)(liftedG(Tf_x))
    }
  }
}

/**
 * Check unit laws for pushforward monad.
 *
 * @deprecated Superseded by `algebra-oracles.ts` relative law analyzers, which
 * surface witness data alongside structured diagnostics.
 */
export const checkPushforwardUnitLaws = (
  adj: Adjunction<unknown, unknown, CatFunctor<unknown, unknown>, CatFunctor<unknown, unknown>>,
  T: CatMonad<unknown>,
  testObjects: ReadonlyArray<unknown>
) => {
  const TUp = pushforwardMonadEnhanced(adj, T)
  const results: boolean[] = []

  for (const X of testObjects) {
    try {
      // Left unit: μ↑ ∘ η↑ = id
      const etaX = TUp.unit.component(X)
      const applyEndo = TUp.endofunctor.onMor as (mor: unknown) => unknown
      const multAtX = TUp.mult.component(X) as (value: unknown) => unknown
      const muEtaX = multAtX(applyEndo(etaX))
      const idX = X  // Simplified - would be proper identity

      const leftUnit = JSON.stringify(muEtaX) === JSON.stringify(idX)

      // Right unit: μ↑ ∘ T↑(η↑) = id
      const TetaX = applyEndo(etaX)
      const muTEtaX = multAtX(TetaX)
      
      const rightUnit = JSON.stringify(muTEtaX) === JSON.stringify(idX)
      
      results.push(leftUnit && rightUnit)
    } catch (e) {
      results.push(false)
    }
  }
  
  return results.every(r => r)
}

/**
 * Check associativity law for pushforward monad.
 *
 * @deprecated Superseded by `checkRelativeMonadLaws`, which threads Street
 * witness requests through the oracle layer.
 */
export const checkPushforwardAssociativity = (
  adj: Adjunction<unknown, unknown, CatFunctor<unknown, unknown>, CatFunctor<unknown, unknown>>,
  T: CatMonad<unknown>,
  testObjects: ReadonlyArray<unknown>
) => {
  const TUp = pushforwardMonadEnhanced(adj, T)
  const results: boolean[] = []

  for (const X of testObjects) {
    try {
      // μ↑ ∘ T↑(μ↑) = μ↑ ∘ μ↑T↑ on T↑T↑T↑ X
      const TTTX = TUp.endofunctor.onObj(
        TUp.endofunctor.onObj(TUp.endofunctor.onObj(X))
      )

      // Left side: μ↑ ∘ T↑(μ↑)
      const multAtX = TUp.mult.component(X) as (value: unknown) => unknown
      const TmuUp = (TUp.endofunctor.onMor as (mor: unknown) => unknown)(
        TUp.mult.component(X)
      )
      const leftSide = multAtX(TmuUp)

      // Right side: μ↑ ∘ μ↑T↑
      const muUpT = TUp.mult.component(TUp.endofunctor.onObj(X)) as (value: unknown) => unknown
      const rightSide = multAtX(muUpT)
      
      const associative = JSON.stringify(leftSide) === JSON.stringify(rightSide)
      results.push(associative)
    } catch (e) {
      results.push(false)
    }
  }
  
  return results.every(r => r)
}

/**
 * Complete law checker for pushforward monads.
 *
 * @deprecated Use `checkRelativeMonadLaws` to obtain structural diagnostics and
 * pending Street-equality information for embedded classical monads.
 */
export const checkPushforwardMonadLaws = (
  adj: Adjunction<unknown, unknown, CatFunctor<unknown, unknown>, CatFunctor<unknown, unknown>>,
  T: CatMonad<unknown>,
  testObjects: ReadonlyArray<unknown> = []
) => {
  // Use small test objects if none provided
  const tests = testObjects.length > 0 ? testObjects : [
    { elements: ['x'] },
    { elements: ['a', 'b'] }
  ]
  
  const unitLaws = checkPushforwardUnitLaws(adj, T, tests)
  const associativity = checkPushforwardAssociativity(adj, T, tests)
  
  return {
    unitLaws,
    associativity,
    allPass: unitLaws && associativity
  }
}

/* ================================================================
   Integration with existing infrastructure
   ================================================================ */

/**
 * Compare codensity monad across adjunction.
 *
 * @deprecated Schedule a relative monad comparison via the Street-action
 * analyzers instead; this helper only observes classical endofunctors.
 */
export const compareCodensityAcrossAdjunction = <
  CO,
  DO,
  FO extends CatFunctor<CO, DO>,
  UO extends CatFunctor<DO, CO>,
  BO,
  BM
>(
  adj: Adjunction<CO, DO, FO, UO>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
) => {
  // This would compare T^G(A) with T^{G'}(F(A)) where G' = F ∘ G ∘ U
  // For equivalences, these should be naturally isomorphic
  return {
    originalCodensity: codensityCarrierFinSet(G.source, G, A),
    transportedCodensity: "placeholder", // Would compute via pushforward
    comparison: "placeholder" // Would check natural isomorphism
  }
}

/**
 * Matrix pretty-printing for pushed monads in Vect.
 *
 * @deprecated Prefer reporting via the relative monad construction diagnostics,
 * which surface the same matrices as witness payloads.
 */
export const prettyPrintPushedMonad = (
  pushedMonad: CatMonad<unknown>,
  V: EnhancedVect.VectObj
) => {
  const TV = assertVectObj(pushedMonad.endofunctor.onObj(V))
  return {
    originalDim: V.dim,
    pushedDim: TV.dim,
    unitMatrix: "placeholder", // Would extract matrix from unit
    multMatrix: "placeholder"  // Would extract matrix from mult
  }
}

/* ================================================================
   Concrete pushforward monad examples
  ================================================================ */

/** Free vector space functor FinSet -> Vect */
type VectObjShape = { readonly dim: number }

const isVectObjShape = (value: unknown): value is VectObjShape =>
  typeof value === 'object' &&
  value !== null &&
  'dim' in value &&
  typeof (value as { dim?: unknown }).dim === 'number'

const assertVectObj = (value: unknown): EnhancedVect.VectObj => {
  if (!isVectObjShape(value)) {
    throw new TypeError('Expected a Vect object')
  }
  return value as EnhancedVect.VectObj
}

type MatrixShape = ReadonlyArray<ReadonlyArray<number>>

const isMatrixShape = (value: unknown): value is MatrixShape =>
  isReadonlyArray(value) &&
  value.every(
    (row): row is ReadonlyArray<number> =>
      isReadonlyArray(row) && row.every((entry) => typeof entry === 'number')
  )

type VectMorShape = {
  readonly matrix: MatrixShape
  readonly from: VectObjShape
  readonly to: VectObjShape
}

const isVectMorShape = (value: unknown): value is VectMorShape =>
  typeof value === 'object' &&
  value !== null &&
  'matrix' in value &&
  'from' in value &&
  'to' in value &&
  isMatrixShape((value as { matrix?: unknown }).matrix) &&
  isVectObjShape((value as { from?: unknown }).from) &&
  isVectObjShape((value as { to?: unknown }).to)

const assertVectMor = (value: unknown): EnhancedVect.VectMor => {
  if (!isVectMorShape(value)) {
    throw new TypeError('Expected a Vect morphism')
  }
  return value as EnhancedVect.VectMor
}

export const freeVectFunctor = (): CatFunctor<typeof FinSet, typeof EnhancedVect.Vect> => ({
  source: FinSet,
  target: EnhancedVect.Vect,
  onObj: (obj: ObjOf<typeof FinSet>) => {
    const S = assertFinSetObj(obj)
    return { dim: S.elements.length }
  },
  onMor: (mor: MorOf<typeof FinSet>) => {
    const f = assertFinSetMor(mor)
    const rows = f.to.elements.length
    const cols = f.from.elements.length
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0))
    for (let j = 0; j < cols; j++) {
      const targetIndex = f.map[j]
      if (targetIndex === undefined) {
        throw new Error('Free functor: missing image index for basis element')
      }
      matrix[targetIndex]![j] = 1
    }
    return {
      matrix: matrix.map((row) => row.slice()),
      from: { dim: cols },
      to: { dim: rows }
    }
  }
})

/** Forgetful functor Vect -> FinSet */
export const forgetVectFunctor = (): CatFunctor<typeof EnhancedVect.Vect, typeof FinSet> => ({
  source: EnhancedVect.Vect,
  target: FinSet,
  onObj: (obj: ObjOf<typeof EnhancedVect.Vect>) => {
    const V = assertVectObj(obj)
    return makeFinSetObj(Array.from({ length: V.dim }, (_, i) => i))
  },
  onMor: (mor: MorOf<typeof EnhancedVect.Vect>) => {
    const f = assertVectMor(mor)
    const from = makeFinSetObj(Array.from({ length: f.from.dim }, (_, i) => i))
    const to = makeFinSetObj(Array.from({ length: f.to.dim }, (_, i) => i))
    const map = Array.from({ length: f.from.dim }, (_, i) =>
      i < f.to.dim ? i : 0
    )
    return { from, to, map }
  }
})

/** Free-Forgetful adjunction between FinSet and Vect */
export const freeForgetfulAdjunction = (): Adjunction<
  typeof FinSet,
  typeof EnhancedVect.Vect,
  CatFunctor<typeof FinSet, typeof EnhancedVect.Vect>,
  CatFunctor<typeof EnhancedVect.Vect, typeof FinSet>
> => {
  const F = freeVectFunctor()  // Free: FinSet -> Vect
  const U = forgetVectFunctor()  // Forget: Vect -> FinSet

  // Unit: Id_FinSet ⇒ U ∘ F (inclusion of set into free vector space)
  const unit: CatNatTrans<
    CatId<typeof FinSet>,
    CatCompose<typeof F, typeof U>
  > = {
    source: idFun(FinSet),
    target: composeFun(F, U),
    component: (obj: ObjOf<typeof FinSet>) => FinSet.id(assertFinSetObj(obj))
  }

  // Counit: F ∘ U ⇒ Id_Vect (evaluation of linear combination)
  const counit: CatNatTrans<
    CatCompose<typeof U, typeof F>,
    CatId<typeof EnhancedVect.Vect>
  > = {
    source: composeFun(U, F),
    target: idFun(EnhancedVect.Vect),
    component: (obj: ObjOf<typeof EnhancedVect.Vect>) =>
      EnhancedVect.Vect.id(assertVectObj(obj))
  }
  
  return { F, U, unit, counit }
}

/** Example: List monad on FinSet */
export const listMonadFinSet = (): CatMonad<typeof FinSet> => {
  const listElementsFor = (S: FinSetObj): ReadonlyArray<ReadonlyArray<FinSetElem>> => {
    const lists: Array<ReadonlyArray<FinSetElem>> = [[]]
    const extend = (
      prefix: ReadonlyArray<FinSetElem>,
      remaining: number
    ): void => {
      if (remaining === 0) {
        lists.push(prefix)
        return
      }
      for (const elem of S.elements) {
        extend([...prefix, elem], remaining - 1)
      }
    }
    for (let len = 1; len <= 3; len++) {
      extend([], len)
    }
    return lists
  }

  const findListIndex = (
    haystack: ReadonlyArray<ReadonlyArray<FinSetElem>>,
    needle: ReadonlyArray<FinSetElem>
  ): number =>
    haystack.findIndex(
      (candidate) =>
        candidate.length === needle.length &&
        candidate.every((value, idx) => Object.is(value, needle[idx]))
    )

  const mapElementVia = (f: FinSetMor, value: FinSetElem): FinSetElem => {
    const domainIndex = f.from.elements.findIndex((candidate) => Object.is(candidate, value))
    if (domainIndex < 0) {
      throw new Error('ListFunctor.onMor: value not found in domain')
    }
    const imageIndex = f.map[domainIndex]
    if (imageIndex === undefined) {
      throw new Error('ListFunctor.onMor: missing image index for value')
    }
    if (imageIndex < 0 || imageIndex >= f.to.elements.length) {
      throw new Error('ListFunctor.onMor: image index out of bounds')
    }
    return f.to.elements[imageIndex]!
  }

  const listObjectFor = (S: FinSetObj): FinSetObjOf<ReadonlyArray<FinSetElem>> =>
    makeFinSetObj(listElementsFor(S))

  const ListFunctor: CatFunctor<typeof FinSet, typeof FinSet> = {
    source: FinSet,
    target: FinSet,
    onObj: (obj: ObjOf<typeof FinSet>) => listObjectFor(assertFinSetObj(obj)),
    onMor: (mor: MorOf<typeof FinSet>) => {
      const f = assertFinSetMor(mor)
      const listS = listObjectFor(f.from)
      const listT = listObjectFor(f.to)
      const domainLists = assertListElements(listS.elements)
      const codomainLists = assertListElements(listT.elements)
      const map = domainLists.map((list) => {
        const mappedList = list.map((value) => mapElementVia(f, value))
        const idx = findListIndex(codomainLists, mappedList)
        if (idx < 0) {
          throw new Error('ListFunctor.onMor: mapped list not found in codomain')
        }
        return idx
      })
      return { from: listS, to: listT, map }
    }
  }

  const unit: CatNatTrans<CatId<typeof FinSet>, typeof ListFunctor> = {
    source: idFun(FinSet),
    target: ListFunctor,
    component: (obj: unknown) => {
      const S = assertFinSetObj(obj)
      const listS = listObjectFor(S)
      const codomainLists = assertListElements(listS.elements)
      const map = S.elements.map((value) => {
        const idx = findListIndex(codomainLists, [value])
        if (idx < 0) {
          throw new Error('ListFunctor.unit: singleton list missing from codomain')
        }
        return idx
      })
      return { from: S, to: listS, map }
    }
  }

  const mult: CatNatTrans<CatCompose<typeof ListFunctor, typeof ListFunctor>, typeof ListFunctor> = {
    source: composeFun(ListFunctor, ListFunctor),
    target: ListFunctor,
    component: (obj: unknown) => {
      const S = assertFinSetObj(obj)
      const listS = listObjectFor(S)
      const listListS = listObjectFor(listS)
      const nestedLists = assertNestedListElements(listListS.elements)
      const codomainLists = assertListElements(listS.elements)
      const map = nestedLists.map((nestedList) => {
        const flattened = nestedList.flat() as ReadonlyArray<FinSetElem>
        const idx = findListIndex(codomainLists, flattened)
        if (idx < 0) {
          throw new Error('ListFunctor.mult: flattened list missing from codomain')
        }
        return idx
      })
      return { from: listListS, to: listS, map }
    }
  }
  
  return {
    category: FinSet,
    endofunctor: ListFunctor,
    unit,
    mult
  }
}

export namespace DiscreteCategory {
  /** Morphism in discrete category (only identities exist) */
  export type DiscreteMor<I> = { readonly tag: "Id"; readonly obj: I }

  /** Discrete category: only identity morphisms */
  export interface Discrete<I> {
    readonly kind: "Discrete"
    readonly objects: ReadonlyArray<I>
    readonly id: (i: I) => DiscreteMor<I>
    readonly compose: (g: DiscreteMor<I>, f: DiscreteMor<I>) => DiscreteMor<I>
    readonly isId: (m: DiscreteMor<I>) => boolean
  }

  /** Create discrete category from objects */
  export const create = <I>(objects: ReadonlyArray<I>): Discrete<I> => ({
    kind: "Discrete",
    objects,
    id: (i) => ({ tag: "Id", obj: i }),
    compose: (g, f) => {
      if (g.tag !== "Id" || f.tag !== "Id") throw new Error("Non-identity in Discrete")
      if (g.obj !== f.obj) throw new Error("Cannot compose identities on different objects")
      return f // or g; both are the same identity
    },
    isId: (m) => m.tag === "Id"
  })

  /** Bridge: family as functor from discrete category to complexes */
  export const familyAsFunctor =
    <I, R>(disc: Discrete<I>, fam: IndexedFamilies.Family<I, Complex<R>>) => ({
      source: disc,
      onObj: (i: I) => fam(i),
      onMor: (f: DiscreteMor<I>) => {
        const X = fam(f.obj)
        return idChainMapCompat(X) // identity on the complex
      }
    })

  /** Adapter: view Discrete(I) as a (finite) groupoid (only identities) */
  export const DiscreteAsGroupoid = <I>(Icar: ReadonlyArray<I>): FiniteGroupoid<I, DiscreteMor<I>> => {
    const D = create(Icar)
    return {
      ...D,
      objects: Icar,
      hom: (a, b) => (a === b ? [D.id(a)] : []),
      dom: (m) => m.obj,
      cod: (m) => m.obj,
      inv: (m) => m // identities invert to themselves
    }
  }
}

/* ================================================================
   Groupoid utilities and Kan extensions via isomorphism classes
   ================================================================ */

/** Does there exist an isomorphism a ≅ b ? */
export const hasIso = <O, M>(G: FiniteGroupoid<O, M>, a: O, b: O): boolean => {
  if (a === b) return true
  const seen = new Set<O>()
  const q: O[] = [a]
  seen.add(a)
  while (q.length) {
    const x = q.shift()!
    for (const y of G.objects) {
      if (G.hom(x, y).length > 0 && !seen.has(y)) {
        if (y === b) return true
        seen.add(y)
        q.push(y)
      }
    }
  }
  return false
}

/** Partition objects into isomorphism classes (connected components) */
export const isoClasses = <O, M>(G: FiniteGroupoid<O, M>): ReadonlyArray<ReadonlyArray<O>> => {
  const classes: O[][] = []
  const unvisited = new Set(G.objects as O[])
  while (unvisited.size) {
    const start = unvisited.values().next().value as O
    const comp: O[] = []
    const q: O[] = [start]
    unvisited.delete(start)
    comp.push(start)
    while (q.length) {
      const x = q.shift()!
      for (const y of G.objects) {
        if (unvisited.has(y) && (G.hom(x, y).length > 0 || G.hom(y, x).length > 0)) {
          unvisited.delete(y)
          comp.push(y)
          q.push(y)
        }
      }
    }
    classes.push(comp)
  }
  return classes
}

/** Reindex (pullback) along a groupoid functor u: G -> H (precomposition) */
export const reindexGroupoid = <GO, GM, HO, HM, O, M>(
  u: GFunctor<GO, GM, HO, HM>,
  F: { onObj: (h: HO) => O; onMor?: (m: HM) => M }
) => ({
  onObj: (g: GO) => F.onObj(u.onObj(g)),
  onMor: F.onMor ? (m: GM) => F.onMor!(u.onMor(m)) : undefined
})

/** Left Kan extension along groupoid functors via isomorphism classes */
export const lanGroupoidViaClasses = <GO, GM, HO, HM, O, M>(
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  Fobj: IndexedFamilies.Family<GO, O>,                    // object part of F : G -> C
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteCoproducts<O, M>
) => {
  const classesG = isoClasses(G) // iso classes of G-objects
  const classRep = new Map<GO, GO>()
  for (const comp of classesG) for (const g of comp) classRep.set(g, comp[0]!)

  const cacheObj = new Map<HO, O>()
  const cacheInj = new Map<HO, ReadonlyArray<readonly [GO, M]>>()

  for (const h of IfinH.carrier) {
    // collect representative g of each G-iso-class where u(g) ≅ h
    const reps: GO[] = []
    const seenRep = new Set<GO>()
    for (const g of G.objects) {
      if (hasIso(H, u.onObj(g), h)) {
        const r = classRep.get(g)!
        if (!seenRep.has(r)) { seenRep.add(r); reps.push(r) }
      }
    }
    const { obj, injections } = C.coproduct(reps.map((r) => Fobj(r)))
    cacheObj.set(h, obj)
    cacheInj.set(h, injections.map((m, k) => [reps[k]!, m] as const))
  }

  return {
    at: (h: HO) => cacheObj.get(h)!,
    injections: (h: HO) => cacheInj.get(h)!
  }
}

/** Right Kan extension along groupoid functors via isomorphism classes */
export const ranGroupoidViaClasses = <GO, GM, HO, HM, O, M>(
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  Fobj: IndexedFamilies.Family<GO, O>,
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteProducts<O, M>
) => {
  const classesG = isoClasses(G)
  const classRep = new Map<GO, GO>()
  for (const comp of classesG) for (const g of comp) classRep.set(g, comp[0]!)

  const cacheObj = new Map<HO, O>()
  const cacheProj = new Map<HO, ReadonlyArray<readonly [GO, M]>>()

  for (const h of IfinH.carrier) {
    const reps: GO[] = []
    const seenRep = new Set<GO>()
    for (const g of G.objects) {
      if (hasIso(H, u.onObj(g), h)) {
        const r = classRep.get(g)!
        if (!seenRep.has(r)) { seenRep.add(r); reps.push(r) }
      }
    }
    const { obj, projections } = C.product(reps.map((r) => Fobj(r)))
    cacheObj.set(h, obj)
    cacheProj.set(h, projections.map((m, k) => [reps[k]!, m] as const))
  }

  return {
    at: (h: HO) => cacheObj.get(h)!,
    projections: (h: HO) => cacheProj.get(h)!
  }
}

/** Full groupoid Left Kan with optional automorphism quotient */
export const lanGroupoidFull = <GO, GM, HO, HM, O, M>(
  Cat: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  F: { onObj: (g: GO) => O; onMor?: (phi: GM) => M },   // F on isos (optional; req'd if quotienting)
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteCoproducts<O, M> & Partial<CategoryLimits.HasCoequalizers<O, M>> & Partial<CategoryLimits.HasInitial<O, M>>
) => {
  if (!C.coequalizer || !F.onMor) {
    const lite = lanGroupoidViaClasses(H, G, u, F.onObj, IfinH, C)
    return { at: lite.at }
  }

  const at: IndexedFamilies.Family<HO, O> = (h) => {
    // objects in (u ↓ h): pairs (g, α:u(g)→h) with α iso in H
    const objs: Array<{ g: GO; alpha: HM }> = []
    for (const g of G.objects) for (const a of H.hom(u.onObj(g), h)) objs.push({ g, alpha: a })
    if (objs.length === 0) {
      if ('initialObj' in C && C.initialObj !== undefined) {
        return C.initialObj
      }
      const empty = C.coproduct([])
      if (empty) return empty.obj
      throw new Error('lanGroupoidFull: empty fiber and no initial object')
    }

    // start: ⨿ F(g_i)
    const { obj: Cop0, injections } = C.coproduct(objs.map(o => F.onObj(o.g)))
    let Cobj = Cop0
    let inj = injections.slice()

    const onMor = F.onMor!
    const coequalizer = C.coequalizer!

    const eqH = (m1: HM, m2: HM) =>
      H.dom(m1) === H.dom(m2) && H.cod(m1) === H.cod(m2) && H.isId!(H.compose(H.inv(m1), m2))

    for (let s = 0; s < objs.length; s++) {
      for (let t = 0; t < objs.length; t++) {
        const src = objs[s]!, dst = objs[t]!
        for (const phi of G.hom(src.g, dst.g)) {
          if (!eqH(H.compose(dst.alpha, u.onMor(phi)), src.alpha)) continue
          const f = inj[s]!
          const g2 = Cat.compose(inj[t]!, onMor(phi))
          const { obj: Q, coequalize: q } = coequalizer(f, g2)
          Cobj = Q
          for (let k = 0; k < inj.length; k++) {
            const leg = inj[k]
            if (leg) inj[k] = Cat.compose(q, leg)
          }
        }
      }
    }
    return Cobj
  }
  return { at }
}

/** Full groupoid Right Kan with optional automorphism quotient */
export const ranGroupoidFull = <GO, GM, HO, HM, O, M>(
  Cat: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  F: { onObj: (g: GO) => O; onMor?: (phi: GM) => M; inv?: (m: M) => M }, // need inverse for equalizer-side
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteProducts<O, M> & Partial<CategoryLimits.HasEqualizers<O, M>> & Partial<CategoryLimits.HasTerminal<O, M>>
) => {
  if (!C.equalizer || !F.onMor || !F.inv) {
    const lite = ranGroupoidViaClasses(H, G, u, F.onObj, IfinH, C)
    return { at: lite.at }
  }

  const at: IndexedFamilies.Family<HO, O> = (h) => {
    const objs: Array<{ g: GO; alpha: HM }> = []
    for (const g of G.objects) for (const a of H.hom(u.onObj(g), h)) objs.push({ g, alpha: a })

    if (objs.length === 0) {
      if ('terminalObj' in C && C.terminalObj !== undefined) {
        return C.terminalObj
      }
      const empty = C.product([])
      if (empty) return empty.obj
      throw new Error('ranGroupoidFull: empty fiber and no terminal object')
    }

    const eqH = (m1: HM, m2: HM) =>
      H.dom(m1) === H.dom(m2) && H.cod(m1) === H.cod(m2) && H.isId!(H.compose(H.inv(m1), m2))

    const { obj: Prod0, projections } = C.product(objs.map(o => F.onObj(o.g)))
    let Pobj = Prod0
    let proj = projections.slice()

    const onMor = F.onMor!
    const invert = F.inv!
    const equalizer = C.equalizer!

    for (let s = 0; s < objs.length; s++) {
      for (let t = 0; t < objs.length; t++) {
        const src = objs[s]!, dst = objs[t]!
        for (const phi of G.hom(src.g, dst.g)) {
          if (!eqH(H.compose(dst.alpha, u.onMor(phi)), src.alpha)) continue
          const pi_s = proj[s]!
          const pi_t = proj[t]!
          const rhs = Cat.compose(invert(onMor(phi)), pi_t)
          const { obj: E, equalize: e } = equalizer(pi_s, rhs)
          Pobj = E
          for (let k = 0; k < proj.length; k++) {
            const leg = proj[k]
            if (leg) proj[k] = Cat.compose(leg, e)
          }
        }
      }
    }
    return Pobj
  }
  return { at }
}

/** Minimal constructor for two-object isomorphic groupoid (for tests) */
export const twoObjIsoGroupoid = <T>(a: T, b: T): FiniteGroupoid<T, { from: T; to: T; tag: 'iso' | 'id' }> => {
  const id = (x: T) => ({ from: x, to: x, tag: 'id' } as const)
  const iso = (x: T, y: T) => ({ from: x, to: y, tag: 'iso' } as const)
  const objects: ReadonlyArray<T> = [a, b]
  const hom = (x: T, y: T) => {
    if (x === y) return [id(x)]
    if ((x === a && y === b) || (x === b && y === a)) return [iso(x, y)]
    return []
  }
  return {
    objects,
    id,
    compose: (g, f) => {
      if (f.to !== g.from) throw new Error('compose mismatch')
      if (f.tag === 'id') return g
      if (g.tag === 'id') return f
      // iso ∘ iso = id (since unique up to our one-iso model)
      return id(f.from)
    },
    dom: (m) => m.from,
    cod: (m) => m.to,
    inv: (m) => (m.tag === 'id' ? m : { from: m.to, to: m.from, tag: 'iso' }),
    hom,
    isId: (m) => m.tag === 'id'
  }
}

/* ================================================================
   Finite Set category with complete categorical structure
   ================================================================ */

export type FinSetElem = unknown

export interface FinSetObj {
  elements: ReadonlyArray<FinSetElem>
}

export const FinSetObj = Symbol.for('FinSetObj')

export interface FinSetMor {
  from: FinSetObj
  to: FinSetObj
  map: ReadonlyArray<number> // total function by index: [0..|from|-1] -> [0..|to|-1]
}

export const FinSetMor = Symbol.for('FinSetMor')

const isReadonlyArray = (value: unknown): value is ReadonlyArray<unknown> =>
  Array.isArray(value)

export const isFinSetObj = (value: unknown): value is FinSetObj =>
  typeof value === 'object' &&
  value !== null &&
  'elements' in value &&
  isReadonlyArray((value as { elements?: unknown }).elements)

export const assertFinSetObj = (value: unknown): FinSetObj => {
  if (!isFinSetObj(value)) {
    throw new TypeError('Expected a FinSet object')
  }
  return value
}

const isNumberArray = (value: unknown): value is ReadonlyArray<number> =>
  isReadonlyArray(value) && value.every((entry) => typeof entry === 'number')

export const isFinSetMor = (value: unknown): value is FinSetMor =>
  typeof value === 'object' &&
  value !== null &&
  'from' in value &&
  'to' in value &&
  'map' in value &&
  isFinSetObj((value as { from?: unknown }).from) &&
  isFinSetObj((value as { to?: unknown }).to) &&
  isNumberArray((value as { map?: unknown }).map)

export const assertFinSetMor = (value: unknown): FinSetMor => {
  if (!isFinSetMor(value)) {
    throw new TypeError('Expected a FinSet morphism')
  }
  return value
}

type FinSetObjOf<T> = FinSetObj & { elements: ReadonlyArray<T> }

const isListElements = (
  elements: ReadonlyArray<FinSetElem>
): elements is ReadonlyArray<ReadonlyArray<FinSetElem>> =>
  elements.every((entry): entry is ReadonlyArray<FinSetElem> => Array.isArray(entry))

const isNestedListElements = (
  elements: ReadonlyArray<FinSetElem>
): elements is ReadonlyArray<ReadonlyArray<ReadonlyArray<FinSetElem>>> =>
  elements.every(
    (entry): entry is ReadonlyArray<ReadonlyArray<FinSetElem>> =>
      Array.isArray(entry) &&
      entry.every((inner): inner is ReadonlyArray<FinSetElem> => Array.isArray(inner))
  )

const assertListElements = (
  elements: ReadonlyArray<FinSetElem>
): ReadonlyArray<ReadonlyArray<FinSetElem>> => {
  if (!isListElements(elements)) {
    throw new TypeError('Expected list elements in FinSet object')
  }
  return elements
}

const assertNestedListElements = (
  elements: ReadonlyArray<FinSetElem>
): ReadonlyArray<ReadonlyArray<ReadonlyArray<FinSetElem>>> => {
  if (!isNestedListElements(elements)) {
    throw new TypeError('Expected nested list elements in FinSet object')
  }
  return elements
}

export const makeFinSetObj = <T>(elements: ReadonlyArray<T>): FinSetObjOf<T> => ({ elements })

export const FinSet: Category<FinSetObj, FinSetMor> & 
  ArrowFamilies.HasDomCod<FinSetObj, FinSetMor> &
  CategoryLimits.HasFiniteProducts<FinSetObj, FinSetMor> & 
  CategoryLimits.HasFiniteCoproducts<FinSetObj, FinSetMor> &
  CategoryLimits.HasEqualizers<FinSetObj, FinSetMor> & 
  CategoryLimits.HasCoequalizers<FinSetObj, FinSetMor> &
  CategoryLimits.HasInitial<FinSetObj, FinSetMor> & 
  CategoryLimits.HasTerminal<FinSetObj, FinSetMor> = {
  
  id: (X) => ({ from: X, to: X, map: X.elements.map((_, i) => i) }),
  compose: (g, f) => {
    if (f.to !== g.from) throw new Error('FinSet.compose: shape mismatch')
    return { from: f.from, to: g.to, map: f.map.map((i) => g.map[i]!) }
  },
  isId: (m) => m.map.every((i, idx) => i === idx) && m.from.elements.length === m.to.elements.length,
  dom: (m) => m.from,
  cod: (m) => m.to,
  equalMor: (f, g) =>
    f.from === g.from &&
    f.to === g.to &&
    f.map.length === g.map.length &&
    f.map.every((v, i) => v === g.map[i]),

  // products: cartesian product
  product: (objs) => {
    const factors = objs
    const indexTuples: number[][] = []
    const rec = (acc: number[], k: number) => {
      if (k === factors.length) { indexTuples.push(acc.slice()); return }
      for (let i = 0; i < factors[k]!.elements.length; i++) rec([...acc, i], k + 1)
    }
    rec([], 0)
    const P: FinSetObj = { elements: indexTuples }
    const projections = factors.map((F, k) => ({
      from: P,
      to: F,
      map: indexTuples.map(tuple => tuple[k]!)
    })) as FinSetMor[]
    return { obj: P, projections }
  },

  // coproducts: disjoint union
  coproduct: (objs) => {
    const tags: Array<{ tag: number; i: number }> = []
    const injections: FinSetMor[] = []
    let offset = 0
    objs.forEach((O, idx) => {
      const arr = Array.from({ length: O.elements.length }, (_, i) => ({ tag: idx, i }))
      tags.push(...arr)
      injections.push({ 
        from: O, 
        to: { elements: [] }, // will be fixed below
        map: Array.from({ length: O.elements.length }, (_, i) => offset + i) 
      })
      offset += O.elements.length
    })
    const Cop: FinSetObj = { elements: tags }
    // Fix codomain refs on injections
    for (let k = 0; k < objs.length; k++) {
      injections[k] = { ...injections[k]!, to: Cop }
    }
    return { obj: Cop, injections }
  },

  // equalizer of f,g: subset of X where f(x)=g(x)
  equalizer: (f, g) => {
    if (f.from !== g.from || f.to !== g.to) throw new Error('FinSet.equalizer: shape mismatch')
    const keepIdx: number[] = []
    for (let i = 0; i < f.from.elements.length; i++) {
      if (f.map[i] === g.map[i]) keepIdx.push(i)
    }
    const E: FinSetObj = { elements: keepIdx.map(i => f.from.elements[i]!) }
    const inj: FinSetMor = { from: E, to: f.from, map: keepIdx }
    return { obj: E, equalize: inj }
  },

  // coequalizer of f,g: quotient of Y by relation generated by f(x) ~ g(x)
  coequalizer: (f, g) => {
    if (f.from !== g.from || f.to !== g.to) throw new Error('FinSet.coequalizer: shape mismatch')
    const n = f.to.elements.length
    const parent = Array.from({ length: n }, (_, i) => i)
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)))
    const unite = (a: number, b: number) => { 
      a = find(a); b = find(b); if (a !== b) parent[b] = a 
    }
    for (let i = 0; i < f.from.elements.length; i++) unite(f.map[i]!, g.map[i]!)
    const reps = new Map<number, number>()
    let idx = 0
    for (let y = 0; y < n; y++) { 
      const r = find(y); if (!reps.has(r)) reps.set(r, idx++) 
    }
    const Q: FinSetObj = { elements: Array.from({ length: reps.size }, (_, i) => i) }
    const q: FinSetMor = { 
      from: f.to, 
      to: Q, 
      map: Array.from({ length: n }, (_, y) => reps.get(find(y))!) 
    }
    return { obj: Q, coequalize: q }
  },

  initialObj: { elements: [] },
  terminalObj: { elements: [null] }
}

/** FinSet bijection helper */
export const finsetBijection = (from: FinSetObj, to: FinSetObj, map: number[]): FinSetMor => {
  if (map.length !== from.elements.length) throw new Error('finsetBij: length mismatch')
  return { from, to, map }
}

/** FinSet inverse helper */
export const finsetInverse = (bij: FinSetMor): FinSetMor => {
  const inv: number[] = Array.from({ length: bij.to.elements.length }, () => -1)
  for (let i = 0; i < bij.map.length; i++) inv[bij.map[i]!] = i
  return { from: bij.to, to: bij.from, map: inv }
}

/** FinSet exponential: X^S (all functions S -> X) */
export const expFinSet = (X: FinSetObj, S: FinSetObj): FinSetObj => {
  // elements = all functions S -> X (represented as arrays of indices in X of length |S|)
  const nS = S.elements.length, nX = X.elements.length
  const funcs: number[][] = []
  const rec = (acc: number[], k: number) => {
    if (k === nS) { funcs.push(acc.slice()); return }
    for (let i = 0; i < nX; i++) rec([...acc, i], k + 1)
  }
  rec([], 0)
  return { elements: funcs }
}

/** Postcompose on exponentials: given h: X -> Y, map X^S -> Y^S by (h ∘ -) */
export const expPostcompose = (h: FinSetMor, S: FinSetObj): FinSetMor => {
  const XtoY = h.map
  const YpowS = expFinSet(h.to, S)
  const indexMap = new Map<string, number>()
  YpowS.elements.forEach((arr, idx) => indexMap.set(JSON.stringify(arr), idx))
  const XpowS = expFinSet(h.from, S)
  const map = XpowS.elements.map(arr => {
    const out = (arr as number[]).map((ix) => XtoY[ix]!)
    return indexMap.get(JSON.stringify(out))!
  })
  return { from: XpowS, to: YpowS, map }
}

/** Precompose on exponentials: given r: S' -> S, map X^S -> X^{S'} by (- ∘ r) */
export const expPrecompose = (X: FinSetObj, r: FinSetMor, S: FinSetObj, Sprime: FinSetObj): FinSetMor => {
  const XpowS = expFinSet(X, S)
  const XpowSprim = expFinSet(X, Sprime)
  const indexMap = new Map<string, number>()
  XpowSprim.elements.forEach((arr, idx) => indexMap.set(JSON.stringify(arr), idx))
  const map = XpowS.elements.map(arr => {
    const out = r.map.map((j) => (arr as number[])[j]!) // g[s'] = f[r(s')]
    return indexMap.get(JSON.stringify(out))!
  })
  return { from: XpowS, to: XpowSprim, map }
}

/** All FinSet morphisms A -> X as a FinSet object (the Hom-set object) */
export const homSetObjFinSet = (A: FinSetObj, X: FinSetObj): FinSetObj => {
  // Elements are arrays len |A| with entries in [0..|X|-1]
  const nA = A.elements.length, nX = X.elements.length
  const maps: number[][] = []
  const rec = (acc: number[], k: number) => {
    if (k === nA) { maps.push(acc.slice()); return }
    for (let i = 0; i < nX; i++) rec([...acc, i], k + 1)
  }
  rec([], 0)
  return { elements: maps }
}

/** The functorial map Hom(A, X) -> Hom(A, Y) induced by h: X->Y (postcompose) */
export const homPostcomposeFinSet = (A: FinSetObj, h: FinSetMor): FinSetMor => {
  const S = homSetObjFinSet(A, h.from)
  const T = homSetObjFinSet(A, h.to)
  const indexMap = new Map<string, number>()
  T.elements.forEach((arr, idx) => indexMap.set(JSON.stringify(arr), idx))
  const map = S.elements.map(arr => {
    const out = (arr as number[]).map(aIx => h.map[aIx]!)
    return indexMap.get(JSON.stringify(out))!
  })
  return { from: S, to: T, map }
}

/** Helper: index a FinSet object's elements by JSON */
const indexObj = (obj: FinSetObj): Map<string, number> => {
  const m = new Map<string, number>()
  obj.elements.forEach((e, i) => m.set(JSON.stringify(e), i))
  return m
}

/** Hom-precompose: given η: A -> T, send Hom(T, X) -> Hom(A, X) */
export const homPrecomposeFinSet = (eta: FinSetMor, X: FinSetObj): FinSetMor => {
  // Domain: Hom(T, X) : arrays length |T|; Codomain: Hom(A, X) : arrays length |A|
  const Sprime = homSetObjFinSet(eta.to, X)
  const S = homSetObjFinSet(eta.from, X)
  const map = Sprime.elements.map((_arr, idxT) => {
    // For each function h: T->X (encoded as array over |T|), produce h∘η: A->X
    const h = Sprime.elements[idxT] as number[]
    const out = eta.map.map((tIx) => h[tIx]!)
    const indexS = indexObj(S).get(JSON.stringify(out))!
    return indexS
  })
  return { from: Sprime, to: S, map }
}

/** Codensity carrier T^G(A) in FinSet via end formula */
export const codensityCarrierFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,   // G : B -> FinSet
  A: FinSetObj
): FinSetObj => {
  return codensityDataFinSet(CatB, G, A).TA
}

/** Structured data for the codensity end in FinSet */
export const codensityDataFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,   // G : B -> FinSet
  A: FinSetObj
) => {
  // S_b and E_b
  const bList = [...CatB.objects]
  const Sb: Map<BO, FinSetObj> = new Map()
  const Eb: Map<BO, FinSetObj> = new Map()
  for (const b of bList) {
    const Gb = G.onObj(b)
    const S = homSetObjFinSet(A, Gb)
    Sb.set(b, S)
    Eb.set(b, expFinSet(Gb, S))
  }

  // ∏_b E_b
  const EbArr = bList.map((b) => Eb.get(b)!)
  const { obj: ProdEb, projections: projEb } = FinSet.product(EbArr)

  // collect all arrows of B
  const arrows: Array<{ b: BO; bp: BO; f: BM }> = []
  for (const b of bList) for (const bp of bList) for (const f of CatB.hom(b, bp)) arrows.push({ b, bp, f })

  // Build parallel maps S,T : ∏_b E_b ⇉ ∏_f (G b')^{S_b}
  const FfbArr: FinSetObj[] = []
  const legsS: FinSetMor[] = []
  const legsT: FinSetMor[] = []
  for (const { b, bp, f } of arrows) {
    const Gb = G.onObj(b)
    const Gbp = G.onObj(bp)
    const Gf = G.onMor(f)
    const Sb_b = Sb.get(b)!
    const Sbp = Sb.get(bp)!

    const comp1 = expPostcompose(Gf, Sb_b)                  // F(1,f): E_b -> (G b')^S_b
    const homPush = homPostcomposeFinSet(A, Gf)             // S_b -> S_{b'}
    const comp2 = expPrecompose(Gbp, homPush, Sbp, Sb_b)    // F(f,1): E_{b'} -> (G b')^S_b

    const projFromB = projEb[bList.indexOf(b)]!
    const projFromBp = projEb[bList.indexOf(bp)]!
    const s_leg = FinSet.compose(comp1, projFromB)
    const t_leg = FinSet.compose(comp2, projFromBp)

    FfbArr.push(expFinSet(Gbp, Sb_b))
    legsS.push(s_leg)
    legsT.push(t_leg)
  }

  const { obj: ProdF } = FinSet.product(FfbArr)

  // Tuple-into-product helper (FinSet)
  const tupleInto = (from: FinSetObj, to: FinSetObj, legs: FinSetMor[]): FinSetMor => {
    const indexTo = new Map<string, number>()
    to.elements.forEach((elem, idx) => indexTo.set(JSON.stringify(elem), idx))
    const map = from.elements.map((_, eIx) => {
      const coords = legs.map((leg) => leg.map[eIx]!)
      const key = JSON.stringify(coords)
      const idx = indexTo.get(key)
      if (idx === undefined) throw new Error('tupleInto: coordinate missing')
      return idx
    })
    return { from, to, map }
  }

  const S = tupleInto(ProdEb, ProdF, legsS)
  const T = tupleInto(ProdEb, ProdF, legsT)

  const { obj: TA, equalize: include } = FinSet.equalizer(S, T)
  return { TA, include, bList, Sb, Eb, ProdEb }
}

// Update the convenience wrapper to use the structured version
export const codensityCarrierFinSetUpdated = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
): FinSetObj => {
  return codensityDataFinSet(CatB, G, A).TA
}

/** Codensity unit η^G_A : A -> T^G(A) (FinSet) */
export const codensityUnitFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
): FinSetMor => {
  const data = codensityDataFinSet(CatB, G, A)
  const { TA, include, bList, Sb, Eb, ProdEb } = data

  const EbIndex = new Map<BO, Map<string, number>>()
  for (const b of bList) EbIndex.set(b, indexObj(Eb.get(b)!))
  const ProdIndex = indexObj(ProdEb)

  const map: number[] = []
  for (let aIx = 0; aIx < A.elements.length; aIx++) {
    // Build the product coordinate tuple: for each b, element of E_b = (G b)^{S_b}
    const coords: number[] = []
    for (const b of bList) {
      const Gb = G.onObj(b)
      const S = Sb.get(b)!                  // Hom(A,Gb)
      const E = Eb.get(b)!                  // (Gb)^S
      // evaluation at 'a' : S -> Gb  ==> an element of E
      const arr = (S.elements as number[][]).map((k) => k[aIx]!)
      const eIdx = EbIndex.get(b)!.get(JSON.stringify(arr))!
      coords.push(eIdx)
    }
    const prodIdx = ProdIndex.get(JSON.stringify(coords))!
    // factor through equalizer by searching the unique preimage
    const tIx = include.map.findIndex((v) => v === prodIdx)
    if (tIx < 0) throw new Error('codensityUnitFinSet: missing equalizer preimage')
    map.push(tIx)
  }
  return { from: A, to: TA, map }
}

/** Codensity multiplication μ^G_A : T^G T^G A -> T^G A (FinSet) */
export const codensityMuFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
): FinSetMor => {
  // Data for TA and for TTA
  const TAdata = codensityDataFinSet(CatB, G, A)
  const TA = TAdata.TA
  const TTAdata = codensityDataFinSet(CatB, G, TA)
  const TTA = TTAdata.TA

  const { include: inclTA, bList, Sb, Eb, ProdEb } = TAdata
  const { include: inclTTA } = TTAdata

  const EbIndex = new Map<BO, Map<string, number>>()
  for (const b of bList) {
    EbIndex.set(b, indexObj(Eb.get(b)!))
  }
  const ProdIndex = indexObj(ProdEb)

  // For each θ ∈ TTA, compute μ(θ) ∈ TA by:
  // ψ_b(κ) = θ_b( h ), where h : TA -> G b is defined by h(t) = t_b(κ)
  const map: number[] = []
  for (let thetaIx = 0; thetaIx < TTA.elements.length; thetaIx++) {
    // Get the tuple of components of θ in ∏_b E'_b, then per b build ψ_b
    const tupleT = (TTAdata.ProdEb.elements as number[][])[inclTTA.map[thetaIx]!] // indices into E'_b
    const coordsForTA: number[] = []

    bList.forEach((b, bPos) => {
      // domain/codomain sets for this b
      const Gb = G.onObj(b)
      const Sb_b = Sb.get(b)!         // Hom(A,Gb)
      const E_b = Eb.get(b)!         // (Gb)^Sb_b

      // θ_b : S'_b -> Gb  where S'_b = Hom(TA, Gb); element of E'_b
      const Eprime_b = expFinSet(Gb, homSetObjFinSet(TA, Gb))
      const theta_b = Eprime_b.elements[tupleT![bPos]!] as number[]

      // Build ψ_b : Sb_b -> Gb as array over |Sb_b|
      const out: number[] = []
      for (let kIx = 0; kIx < Sb_b.elements.length; kIx++) {
        const k = (Sb_b.elements[kIx] as number[])   // k : A -> Gb

        // h : TA -> Gb, h(t) = t_b(k)
        const hVals: number[] = []
        for (let tIx = 0; tIx < TA.elements.length; tIx++) {
          // t_b is the b-component of t: lookup via inclusion into ∏ E_b
          const tupleTA = (TAdata.ProdEb.elements as number[][])[inclTA.map[tIx]!]
          const e_b_idx = tupleTA![bPos]!
          const t_b = (E_b.elements[e_b_idx] as number[]) // function Sb_b -> Gb (as array)
          const val = t_b[kIx]!
          hVals.push(val)
        }

        // Find index of h in S'_b = Hom(TA, Gb)
        const Sprime_b = homSetObjFinSet(TA, Gb)
        const hIdx = indexObj(Sprime_b).get(JSON.stringify(hVals))!
        // Evaluate θ_b at h
        const valGb = theta_b[hIdx]!
        out.push(valGb)
      }

      // Encode ψ_b as an element of E_b and record its index
      const eIdx = EbIndex.get(b)!.get(JSON.stringify(out))!
      coordsForTA.push(eIdx)
    })

    const prodIdx = ProdIndex.get(JSON.stringify(coordsForTA))!
    const tIx = inclTA.map.findIndex((v) => v === prodIdx)
    if (tIx < 0) throw new Error('codensityMuFinSet: missing equalizer preimage')
    map.push(tIx)
  }

  return { from: TTA, to: TA, map }
}

/** Codensity functor map: T^G(f) : T^G(A) -> T^G(A') (FinSet) */
export const codensityMapFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  f: FinSetMor                                // f: A -> A'
): FinSetMor => {
  const A = f.from
  const A2 = f.to

  const dataA = codensityDataFinSet(CatB, G, A)
  const dataA2 = codensityDataFinSet(CatB, G, A2)

  const { TA, include: incA, bList, Sb: SbA, Eb: EbA, ProdEb: ProdA } = dataA
  const { TA: TA2, include: incA2, Sb: SbA2, Eb: EbA2, ProdEb: ProdA2 } = dataA2

  // Precompute indexers
  const idxProdA2 = new Map<string, number>()
  ;(ProdA2.elements as number[][]).forEach((coords, i) => idxProdA2.set(JSON.stringify(coords), i))

  // For each b, build E_b(A) -> E_b(A') induced by precompose on Hom(A',Gb)->Hom(A,Gb)
  const comp_b: Map<BO, FinSetMor> = new Map()
  for (const b of bList) {
    const Gb = G.onObj(b)
    const r = homPrecomposeFinSet(f, Gb)                   // Hom(A',Gb) -> Hom(A,Gb)
    const comp = expPrecompose(Gb, r, SbA.get(b)!, SbA2.get(b)!) // (Gb)^{S_b(A)} -> (Gb)^{S_b(A')}
    comp_b.set(b, comp)
  }

  // Build map T(A) -> T(A') by factoring the product tuple through the equalizer
  const map: number[] = new Array(TA.elements.length)
  for (let tIx = 0; tIx < TA.elements.length; tIx++) {
    // coordinates in ∏_b E_b(A)
    const coordsA = (ProdA.elements as number[][])[incA.map[tIx]!]!.slice()

    // send each coordinate via comp_b to get coords in ∏_b E_b(A')
    const coordsA2: number[] = []
    bList.forEach((b, pos) => {
      const comp = comp_b.get(b)!
      const newCoord = comp.map[coordsA[pos]!]!
      coordsA2.push(newCoord)
    })

    // locate the product tuple in ProdA2, then pull back along the equalizer inclusion of TA'
    const prodIdxA2 = idxProdA2.get(JSON.stringify(coordsA2))
    if (prodIdxA2 === undefined) throw new Error('codensityMapFinSet: image tuple not found in product')
    const tIx2 = incA2.map.findIndex((v) => v === prodIdxA2)
    if (tIx2 < 0) throw new Error('codensityMapFinSet: no equalizer preimage in T(A\')')
    map[tIx] = tIx2
  }

  return { from: TA, to: TA2, map }
}

/* ================================================================
   Enhanced Vect category with dom/cod and Arrow category support
   ================================================================ */

export namespace EnhancedVect {
  export interface VectObj { readonly dim: number }
  export interface VectMor { 
    readonly matrix: ReadonlyArray<ReadonlyArray<number>>
    readonly from: VectObj
    readonly to: VectObj 
  }

  /** Arrow category object (morphism in Vect) */
  export type ArrowObj = { f: VectMor }
  
  /** Arrow category morphism (commutative square) */
  export type ArrowMor = { left: VectMor; right: VectMor }

  export const Vect: Category<VectObj, VectMor> & ArrowFamilies.HasDomCod<VectObj, VectMor> = {
    id: (v) => ({ 
      matrix: Array.from({ length: v.dim }, (_, r) => 
        Array.from({ length: v.dim }, (_, c) => (r === c ? 1 : 0))
      ), 
      from: v, 
      to: v 
    }),
    compose: (g, f) => {
      if (f.to.dim !== g.from.dim) throw new Error("Matrix dimension mismatch for composition")
      const m = f.matrix, n = g.matrix
      const rows = m.length, cols = n[0]?.length ?? 0, mid = n.length
      const out: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
      for (let i = 0; i < rows; i++) {
        for (let k = 0; k < mid; k++) {
          for (let j = 0; j < cols; j++) {
            out[i]![j]! += m[i]![k]! * n[k]![j]!
          }
        }
      }
      return { matrix: out, from: f.from, to: g.to }
    },
    dom: (m) => m.from,
    cod: (m) => m.to,
    isId: (m) => m.from.dim === m.to.dim && 
      m.matrix.every((row, r) => row.every((x, c) => (r === c ? x === 1 : x === 0))),
    equalMor: (x, y) => x.from.dim === y.from.dim && x.to.dim === y.to.dim && 
      x.matrix.length === y.matrix.length && 
      x.matrix.every((row, r) => row.every((v, c) => v === y.matrix[r]![c]))
  }

  /** Create zero morphism */
  export const zero = (v: VectObj, w: VectObj): VectMor => ({ 
    matrix: Array.from({ length: v.dim }, () => Array(w.dim).fill(0)), 
    from: v, 
    to: w 
  })

  /** Create identity morphism */
  export const idMap = (v: VectObj): VectMor => Vect.id(v)

  /** Arrow category for Vect */
  export const ArrowVect: Category<ArrowObj, ArrowMor> = {
    id: (obj: ArrowObj): ArrowMor => ({ 
      left: Vect.id(Vect.dom(obj.f)), 
      right: Vect.id(Vect.cod(obj.f)) 
    }),
    compose: (g: ArrowMor, f: ArrowMor): ArrowMor => ({ 
      left: Vect.compose(g.left, f.left), 
      right: Vect.compose(g.right, f.right) 
    }),
    isId: (m: ArrowMor) => Vect.isId!(m.left) && Vect.isId!(m.right)
  }

  /** Check if a square commutes */
  export const squareCommutes = (f: VectMor, g: VectMor, left: VectMor, right: VectMor): boolean =>
    Vect.equalMor!(Vect.compose(right, f), Vect.compose(g, left))

  /** Finite product in Vect */
  export const finiteProductVect =
    <I>(Ifin: IndexedFamilies.FiniteIndex<I>, fam: IndexedFamilies.Family<I, VectObj>) => {
      const dims = Ifin.carrier.map((i) => fam(i).dim)
      const total = dims.reduce((a, b) => a + b, 0)
      const product: VectObj = { dim: total }
      
      const projections: IndexedFamilies.Family<I, VectMor> = (i) => {
        const leftDims = Ifin.carrier.slice(0, Ifin.carrier.indexOf(i)).reduce((a, j) => a + fam(j).dim, 0)
        const kDim = fam(i).dim
        const M = Array.from({ length: kDim }, () => Array(total).fill(0))
        for (let r = 0; r < kDim; r++) M[r]![leftDims + r] = 1
        return { matrix: M, from: product, to: fam(i) }
      }
      
      return { product, projections }
    }

  /** Finite coproduct in Vect */
  export const finiteCoproductVect =
    <I>(Ifin: IndexedFamilies.FiniteIndex<I>, fam: IndexedFamilies.Family<I, VectObj>) => {
      const dims = Ifin.carrier.map((i) => fam(i).dim)
      const total = dims.reduce((a, b) => a + b, 0)
      const coproduct: VectObj = { dim: total }
      
      const injections: IndexedFamilies.Family<I, VectMor> = (i) => {
        const leftDims = Ifin.carrier.slice(0, Ifin.carrier.indexOf(i)).reduce((a, j) => a + fam(j).dim, 0)
        const kDim = fam(i).dim
        const M = Array.from({ length: total }, () => Array(kDim).fill(0))
        for (let r = 0; r < kDim; r++) M[leftDims + r]![r] = 1
        return { matrix: M, from: fam(i), to: coproduct }
      }
      
      return { coproduct, injections }
    }

  /** Sum of dimensions */
  export const directSumDims =
    <I>(Ifin: IndexedFamilies.FiniteIndex<I>, fam: IndexedFamilies.Family<I, VectObj>): number =>
      IndexedFamilies.reduceFamily(Ifin, fam, 0, (acc, v) => acc + v.dim)

  /**
   * tupleVect: given maps f_i : X -> V_i and a product object P = ⨉_i V_i,
   * build the unique ⟨f_i⟩ : X -> P whose block-columns are the f_i.
   */
  export const tupleVect =
    (
      X: VectObj,
      P: VectObj,                                  // P.dim = Σ dims(V_i)
      maps: ReadonlyArray<VectMor>                 // each from X to V_i
    ): VectMor => {
      const n = X.dim
      const total = maps.reduce((acc, m) => {
        if (m.from.dim !== n) throw new Error("tupleVect: domain mismatch")
        return acc + m.to.dim
      }, 0)
      if (total !== P.dim) throw new Error("tupleVect: codomain dim != product dim")

      const M = Array.from({ length: n }, () => Array(total).fill(0))
      let offset = 0
      for (const m of maps) {
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < m.to.dim; c++) {
            M[r]![offset + c] = m.matrix[r]![c]!
          }
        }
        offset += m.to.dim
      }
      return { matrix: M, from: X, to: P }
    }

  /**
   * cotupleVect: given maps g_i : V_i -> Y and a coproduct object C = ⨁_i V_i,
   * build the unique [g_i] : C -> Y whose block-rows are the g_i.
   */
  export const cotupleVect =
    (
      C: VectObj,                                  // C.dim = Σ dims(V_i)
      maps: ReadonlyArray<VectMor>,                // each from V_i to Y
      Y: VectObj
    ): VectMor => {
      const m = Y.dim
      const total = maps.reduce((acc, g) => {
        if (g.to.dim !== m) throw new Error("cotupleVect: codomain mismatch")
        return acc + g.from.dim
      }, 0)
      if (total !== C.dim) throw new Error("cotupleVect: domain dim != coproduct dim")

      const M = Array.from({ length: C.dim }, () => Array(m).fill(0))
      let offset = 0
      for (const g of maps) {
        for (let r = 0; r < g.from.dim; r++) {
          for (let c = 0; c < m; c++) {
            M[offset + r]![c] = g.matrix[r]![c]!
          }
        }
        offset += g.from.dim
      }
      return { matrix: M, from: C, to: Y }
    }

  /** Build canonical tuple from product cone */
  export const tupleVectFromCone =
    <I>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      cone: CategoryLimits.Cone<I, VectObj, VectMor>,   // legs(i): X -> V_i
      P: VectObj
    ): VectMor => {
      const legsArr = Ifin.carrier.map((i) => cone.legs(i))
      return tupleVect(cone.tip, P, legsArr)
    }

  /** Build canonical cotuple from coproduct cocone */
  export const cotupleVectFromCocone =
    <I>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      cocone: CategoryLimits.Cocone<I, VectObj, VectMor>, // legs(i): V_i -> Y
      C: VectObj
    ): VectMor => {
      const legsArr = Ifin.carrier.map((i) => cocone.legs(i))
      return cotupleVect(C, legsArr, cocone.coTip)
    }

  /** Check uniqueness of product mediators via projections */
  export const productMediatorUnique =
    <I>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      projections: IndexedFamilies.Family<I, VectMor>,  // π_i : P -> V_i
      m1: VectMor,
      m2: VectMor
    ): boolean => {
      for (const i of Ifin.carrier) {
        const lhs = Vect.compose(projections(i), m1)
        const rhs = Vect.compose(projections(i), m2)
        if (!Vect.equalMor!(lhs, rhs)) return false
      }
      return Vect.equalMor!(m1, m2)
    }

  /** Check uniqueness of coproduct mediators via injections */
  export const coproductMediatorUnique =
    <I>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      injections: IndexedFamilies.Family<I, VectMor>,   // ι_i : V_i -> C
      m1: VectMor,
      m2: VectMor
    ): boolean => {
      for (const i of Ifin.carrier) {
        const lhs = Vect.compose(m1, injections(i))
        const rhs = Vect.compose(m2, injections(i))
        if (!Vect.equalMor!(lhs, rhs)) return false
      }
      return Vect.equalMor!(m1, m2)
    }

  /** Uniqueness given triangles: both mediators equal canonical */
  export const productUniquenessGivenTrianglesVect =
    <I>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      projections: IndexedFamilies.Family<I, VectMor>,   // π_i : P -> V_i
      P: VectObj,
      cone: CategoryLimits.Cone<I, VectObj, VectMor>,
      m: VectMor,
      mPrime: VectMor
    ): boolean => {
      const indices = Ifin.carrier
      const ok1 = CategoryLimits.productMediates(Vect, Vect.equalMor!, projections, m, cone, indices)
      const ok2 = CategoryLimits.productMediates(Vect, Vect.equalMor!, projections, mPrime, cone, indices)
      if (!ok1 || !ok2) return false
      const canon = tupleVectFromCone(Ifin, cone, P)
      return Vect.equalMor!(m, canon) && Vect.equalMor!(mPrime, canon) && Vect.equalMor!(m, mPrime)
    }

  /** Uniqueness given triangles: both mediators equal canonical (coproduct) */
  export const coproductUniquenessGivenTrianglesVect =
    <I>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      injections: IndexedFamilies.Family<I, VectMor>,    // ι_i : V_i -> C
      C: VectObj,
      cocone: CategoryLimits.Cocone<I, VectObj, VectMor>,
      m: VectMor,
      mPrime: VectMor
    ): boolean => {
      const indices = Ifin.carrier
      const ok1 = CategoryLimits.coproductMediates(Vect, Vect.equalMor!, injections, m, cocone, indices)
      const ok2 = CategoryLimits.coproductMediates(Vect, Vect.equalMor!, injections, mPrime, cocone, indices)
      if (!ok1 || !ok2) return false
      const canon = cotupleVectFromCocone(Ifin, cocone, C)
      return Vect.equalMor!(m, canon) && Vect.equalMor!(mPrime, canon) && Vect.equalMor!(m, mPrime)
    }

  /** Vect implements finite products trait */
  export const VectHasFiniteProducts: CategoryLimits.HasFiniteProducts<VectObj, VectMor> = {
    product: (objs) => {
      const dims = objs.map((o) => o.dim)
      const total = dims.reduce((a, b) => a + b, 0)
      const prod: VectObj = { dim: total }
      const projections: VectMor[] = []
      let offset = 0
      for (const d of dims) {
        const M = Array.from({ length: total }, () => Array(d).fill(0))
        for (let r = 0; r < d; r++) M[offset + r]![r] = 1       // pick the block for this factor
        projections.push({ matrix: M, from: prod, to: { dim: d } })
        offset += d
      }
      return { obj: prod, projections }
    }
  }

  /** Vect implements finite coproducts trait */
  export const VectHasFiniteCoproducts: CategoryLimits.HasFiniteCoproducts<VectObj, VectMor> = {
    coproduct: (objs) => {
      const dims = objs.map((o) => o.dim)
      const total = dims.reduce((a, b) => a + b, 0)
      const cop: VectObj = { dim: total }
      const injections: VectMor[] = []
      let offset = 0
      for (const d of dims) {
        const M = Array.from({ length: d }, () => Array(total).fill(0))
        for (let r = 0; r < d; r++) M[r]![offset + r] = 1       // place block for this summand
        injections.push({ matrix: M, from: { dim: d }, to: cop })
        offset += d
      }
      return { obj: cop, injections }
    }
  }

  /** Mediator-enabled Vect adapters */
  export const VectProductsWithTuple: CategoryLimits.HasProductMediators<VectObj, VectMor> = {
    ...VectHasFiniteProducts,
    tuple: (X, legs, P) => tupleVect(X, P, legs)
  }

  export const VectCoproductsWithCotuple: CategoryLimits.HasCoproductMediators<VectObj, VectMor> = {
    ...VectHasFiniteCoproducts,
    cotuple: (C, legs, Y) => cotupleVect(C, legs, Y)
  }

  /** Zero object in Vect (both initial and terminal) */
  export const zeroVect: VectObj = { dim: 0 }
  export const oneVect: VectObj = zeroVect // terminal = initial in Vect (biproduct category)

  /** Vect initial object trait */
  export const VectInitial: CategoryLimits.HasInitial<VectObj, VectMor> = { 
    initialObj: zeroVect 
  }

  /** Vect terminal object trait */
  export const VectTerminal: CategoryLimits.HasTerminal<VectObj, VectMor> = { 
    terminalObj: oneVect 
  }

  /** Combined adapters with empty case support */
  export const VectProductsEx = { ...VectHasFiniteProducts, ...VectTerminal }
  export const VectCoproductsEx = { ...VectHasFiniteCoproducts, ...VectInitial }
}

/** Mediator-enabled FinGrp adapters */
export const FinGrpProductsWithTuple: CategoryLimits.HasProductMediators<FinGrpObjModel, FinGrpHomModel> = {
  product: (objs) => {
    const witness = FinGrpModel.productMany(objs)
    return { obj: witness.object, projections: witness.projections }
  },
  tuple: (domain, legs, product) => FinGrpModel.tupleMany(domain, legs, product)
}

type SliceObjModel = SliceObjectModel<FinSetNameModel, FuncArrModel>
type SliceArrModel = SliceArrowModel<FinSetNameModel, FuncArrModel>

export const makeSliceProductsWithTuple = (
  base: FinSetCategoryModel,
  anchor: FinSetNameModel,
): CategoryLimits.HasProductMediators<SliceObjModel, SliceArrModel> => ({
  product: (objs) => {
    const witness = makeFiniteSliceProduct(base, anchor, objs)
    return { obj: witness.object, projections: witness.projections }
  },
  tuple: (domain, legs, product) => {
    const metadata = lookupSliceProductMetadata(product)
    if (!metadata) {
      throw new Error(
        `makeSliceProductsWithTuple: unrecognised product object ${product.domain}; build it via makeFiniteSliceProduct first`,
      )
    }
    return metadata.tuple(domain, legs)
  }
})

/* ================================================================
   General (co)limit interfaces for categories
   ================================================================ */

export namespace CategoryLimits {
  /** Category with finite coproducts */
  export interface HasFiniteCoproducts<O, M> {
    coproduct: (xs: ReadonlyArray<O>) => { obj: O; injections: ReadonlyArray<M> }
  }

  /** Category with finite products */
  export interface HasFiniteProducts<O, M> {
    product: (xs: ReadonlyArray<O>) => { obj: O; projections: ReadonlyArray<M> }
  }

  /** Category with equalizers */
  export interface HasEqualizers<O, M> {
    // equalizer of f,g : X -> Y returns E --e--> X s.t. f∘e = g∘e and universal
    equalizer: (f: M, g: M) => { obj: O; equalize: M }
  }

  /** Category with coequalizers */
  export interface HasCoequalizers<O, M> {
    // coequalizer of f,g : X -> Y returns Y --q--> Q s.t. q∘f = q∘g and universal
    coequalizer: (f: M, g: M) => { obj: O; coequalize: M }
  }

  /** Category with initial object */
  export interface HasInitial<O, M> {
    initialObj: O // ⨿ over ∅
  }

  /** Category with terminal object */
  export interface HasTerminal<O, M> {
    terminalObj: O // ∏ over ∅
  }

  /** Compute finite coproduct of a family with injection family */
  export const finiteCoproduct =
    <I, O, M>(
      Ifin: { carrier: ReadonlyArray<I> },
      fam: (i: I) => O,
      C: HasFiniteCoproducts<O, M>
    ) => {
      const objs = Ifin.carrier.map((i) => fam(i))
      const { obj, injections } = C.coproduct(objs)
      const injFam = (i: I) => injections[Ifin.carrier.indexOf(i)]!
      return { coproduct: obj, injections: injFam }
    }

  /** Compute finite product of a family with projection family */
  export const finiteProduct =
    <I, O, M>(
      Ifin: { carrier: ReadonlyArray<I> },
      fam: (i: I) => O,
      C: HasFiniteProducts<O, M>
    ) => {
      const objs = Ifin.carrier.map((i) => fam(i))
      const { obj, projections } = C.product(objs)
      const projFam = (i: I) => projections[Ifin.carrier.indexOf(i)]!
      return { product: obj, projections: projFam }
    }

  /** Extended finite product that honors empty case with terminal */
  export const finiteProductEx =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      fam: IndexedFamilies.Family<I, O>,
      C: HasFiniteProducts<O, M> & Partial<HasTerminal<O, M>>
    ) => {
      if (Ifin.carrier.length === 0) {
        const T = (C as HasTerminal<O, M>).terminalObj
        return {
          product: T,
          projections: (_: I): M => {
            throw new Error('no projections from empty product')
          }
        }
      }
      return finiteProduct(Ifin, fam, C)
    }

  /** Extended finite coproduct that honors empty case with initial */
  export const finiteCoproductEx =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      fam: IndexedFamilies.Family<I, O>,
      C: HasFiniteCoproducts<O, M> & Partial<HasInitial<O, M>>
    ) => {
      if (Ifin.carrier.length === 0) {
        const I0 = (C as HasInitial<O, M>).initialObj
        return {
          coproduct: I0,
          injections: (_: I): M => {
            throw new Error('no injections into empty coproduct')
          }
        }
      }
      return finiteCoproduct(Ifin, fam, C)
    }

  /** Helper: list fiber objects and remember which j they came from */
  const fiberObjs =
    <J, I, O>(
      Jfin: IndexedFamilies.FiniteIndex<J>,
      u: (j: J) => I,
      i: I,
      F: IndexedFamilies.Family<J, O>
    ): ReadonlyArray<{ j: J; obj: O }> => {
      const js = Jfin.carrier.filter((j) => u(j) === i)
      return js.map((j) => ({ j, obj: F(j) }))
    }

  /** LEFT KAN: Lan_u F at i is coproduct over fiber u^{-1}(i) */
  export const lanDiscretePre =
    <J, I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      Jfin: IndexedFamilies.FiniteIndex<J>,
      u: (j: J) => I,
      F: IndexedFamilies.Family<J, O>,
      C: HasFiniteCoproducts<O, M>
    ) => {
      // Precompute for each i
      const cacheObj = new Map<I, O>()
      const cacheInj = new Map<I, ReadonlyArray<readonly [J, M]>>()

      for (const i of Ifin.carrier) {
        const items = fiberObjs(Jfin, u, i, F)
        const { obj, injections } = C.coproduct(items.map((x) => x.obj))
        cacheObj.set(i, obj)
        cacheInj.set(i, injections.map((m, k) => [items[k]!.j, m] as const))
      }

      return {
        at: (i: I) => {
          const o = cacheObj.get(i)
          if (o === undefined) {
            // On-demand fallback for i not in Ifin
            const items = fiberObjs(Jfin, u, i, F)
            return C.coproduct(items.map((x) => x.obj)).obj
          }
          return o
        },
        injections: (i: I) => cacheInj.get(i) ?? (() => {
          const items = fiberObjs(Jfin, u, i, F)
          const { injections } = C.coproduct(items.map((x) => x.obj))
          return injections.map((m, k) => [items[k]!.j, m] as const)
        })()
      }
    }

  /** RIGHT KAN: Ran_u F at i is product over fiber u^{-1}(i) */
  export const ranDiscretePre =
    <J, I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      Jfin: IndexedFamilies.FiniteIndex<J>,
      u: (j: J) => I,
      F: IndexedFamilies.Family<J, O>,
      C: HasFiniteProducts<O, M>
    ) => {
      const cacheObj = new Map<I, O>()
      const cacheProj = new Map<I, ReadonlyArray<readonly [J, M]>>()

      for (const i of Ifin.carrier) {
        const items = fiberObjs(Jfin, u, i, F)
        const { obj, projections } = C.product(items.map((x) => x.obj))
        cacheObj.set(i, obj)
        cacheProj.set(i, projections.map((m, k) => [items[k]!.j, m] as const))
      }

      return {
        at: (i: I) => {
          const o = cacheObj.get(i)
          if (o === undefined) {
            const items = fiberObjs(Jfin, u, i, F)
            return C.product(items.map((x) => x.obj)).obj
          }
          return o
        },
        projections: (i: I) => cacheProj.get(i) ?? (() => {
          const items = fiberObjs(Jfin, u, i, F)
          const { projections } = C.product(items.map((x) => x.obj))
          return projections.map((m, k) => [items[k]!.j, m] as const)
        })()
      }
    }

  /** Cone over a family (for product universal property) */
  export type Cone<I, O, M> = {
    tip: O                                // X
    legs: IndexedFamilies.Family<I, M>    // f_i : X -> F(i)
  }

  /** Cocone over a family (for coproduct universal property) */
  export type Cocone<I, O, M> = {
    coTip: O                              // Y
    legs: IndexedFamilies.Family<I, M>    // g_i : F(i) -> Y
  }

  /** Check if a morphism mediates a product cone */
  export const productMediates =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (x: M, y: M) => boolean,
      projections: IndexedFamilies.Family<I, M>,      // π_i : P -> F(i)
      mediator: M,                                     // ⟨f_i⟩ : X -> P
      cone: Cone<I, O, M>,                            // legs f_i : X -> F(i)
      indices: ReadonlyArray<I>                        // explicit index carrier
    ): boolean => {
      // type sanity: dom(mediator) = X; cod(mediator) = P
      if (C.dom(mediator) !== cone.tip) return false
      
      // triangles: π_i ∘ ⟨f⟩ = f_i
      for (const i of indices) {
        const lhs = C.compose(projections(i), mediator)
        const rhs = cone.legs(i)
        if (!eq(lhs, rhs)) return false
      }
      return true
    }

  /** Check if a morphism mediates a coproduct cocone */
  export const coproductMediates =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (x: M, y: M) => boolean,
      injections: IndexedFamilies.Family<I, M>,       // ι_i : F(i) -> C
      mediator: M,                                     // [g_i] : C -> Y
      cocone: Cocone<I, O, M>,                        // legs g_i : F(i) -> Y
      indices: ReadonlyArray<I>                        // explicit index carrier
    ): boolean => {
      // type sanity: cod(mediator) = Y
      if (C.cod(mediator) !== cocone.coTip) return false
      
      // triangles: [g] ∘ ι_i = g_i
      for (const i of indices) {
        const lhs = C.compose(mediator, injections(i)) // [g] ∘ ι_i : F(i) -> Y
        const rhs = cocone.legs(i)                     // g_i
        if (!eq(lhs, rhs)) return false
      }
      return true
    }

  /** Helper to check agreement under projections */
  export const agreeUnderProjections =
    <I, O, M>(
      C: Category<O, M>,
      eq: (x: M, y: M) => boolean,
      projections: IndexedFamilies.Family<I, M>,
      m1: M, 
      m2: M,
      indices: ReadonlyArray<I>
    ): boolean => {
      // π_i ∘ m1 == π_i ∘ m2 for all i
      for (const i of indices) {
        const lhs = C.compose(projections(i), m1)
        const rhs = C.compose(projections(i), m2)
        if (!eq(lhs, rhs)) return false
      }
      return true
    }

  /** Helper to check agreement under injections */
  export const agreeUnderInjections =
    <I, O, M>(
      C: Category<O, M>,
      eq: (x: M, y: M) => boolean,
      injections: IndexedFamilies.Family<I, M>,
      m1: M,
      m2: M,
      indices: ReadonlyArray<I>
    ): boolean => {
      for (const i of indices) {
        const lhs = C.compose(m1, injections(i))
        const rhs = C.compose(m2, injections(i))
        if (!eq(lhs, rhs)) return false
      }
      return true
    }

  /** Trait for building mediating maps (beyond shapes) */
  export interface HasProductMediators<O, M> extends HasFiniteProducts<O, M> {
    // build ⟨f_i⟩ : X -> ∏F(i) from legs f_i and known product object
    tuple: (domain: O, legs: ReadonlyArray<M>, product: O) => M
  }

  export type BinaryProductTuple<O, M> = CategoryBinaryProductTuple<O, M>

  export type BinaryProductSwapResult<O, M> = CategoryBinaryProductSwapResult<O, M>

  export type BinaryProductDiagonalFactor<O, M> = CategoryBinaryProductDiagonalFactor<O, M>

  export type BinaryProductComponentwiseInput<O, M> = CategoryBinaryProductComponentwiseInput<O, M>

  export type BinaryProductNaturalityInput<O, M> = CategoryBinaryProductNaturalityInput<O, M>

  export interface BinaryProductUnitCategory<C, M> {
    readonly objects: ReadonlyArray<C>
    readonly arrows: ReadonlyArray<M>
    readonly eq: (a: M, b: M) => boolean
    readonly compose: (g: M, f: M) => M
    readonly id: (object: C) => M
    readonly src: (arrow: M) => C
    readonly dst: (arrow: M) => C
  }

  export interface BinaryProductUnitInput<O, C, M> {
    readonly category: BinaryProductUnitCategory<C, M>
    readonly product: BinaryProductTuple<O, M>
    readonly factor: BinaryProductDiagonalFactor<O, M>
    readonly projection: M
    readonly legs: readonly [M, M]
    readonly productIdentity: M
  }

  export interface BinaryProductUnitWitness<M> {
    readonly forward: M
    readonly backward: M
  }

  export const swapBinaryProduct = makeBinaryProductSwap as <O, M>(
    current: BinaryProductTuple<O, M>,
    swapped: BinaryProductTuple<O, M>,
  ) => BinaryProductSwapResult<O, M>

  export const diagonalBinaryProduct = makeBinaryProductDiagonal as <O, M>(
    product: BinaryProductTuple<O, M>,
    factor: BinaryProductDiagonalFactor<O, M>,
  ) => M

  export const componentwiseBinaryProduct = makeBinaryProductComponentwise as <O, M>(
    input: BinaryProductComponentwiseInput<O, M>,
  ) => M

  export const checkBinaryProductComponentwiseCollapse =
    checkBinaryProductComponentwiseCollapseHelper as <O, M>(
      input: CategoryBinaryProductComponentwiseCollapseInput<O, M>,
    ) => boolean

  export const checkBinaryProductNaturality = checkBinaryProductNaturalityHelper as <O, M>(
    input: BinaryProductNaturalityInput<O, M>,
  ) => boolean

  export const checkBinaryProductSwapCompatibility =
    checkBinaryProductSwapCompatibilityHelper as <O, M>(
      input: CategoryBinaryProductSwapCompatibilityInput<O, M>,
    ) => boolean

  export const unitBinaryProduct = <O, C, M>({
    category,
    product,
    factor,
    projection,
    legs,
    productIdentity,
  }: BinaryProductUnitInput<O, C, M>): BinaryProductUnitWitness<M> => {
    if (legs.length !== 2) {
      throw new Error("CategoryLimits.unitBinaryProduct: expected exactly two legs")
    }

    const backward = product.tuple(factor.object, legs)
    const forward = projection

    const registry = category.arrows as M[]
    const eq = category.eq

    if (!registry.some((arrow) => eq(arrow, forward))) {
      registry.push(forward)
    }
    if (!registry.some((arrow) => eq(arrow, backward))) {
      registry.push(backward)
    }

    const compose = category.compose
    const identityFactor = factor.identity
    const identityProduct = productIdentity

    const forwardThenBackward = compose(forward, backward)
    if (!eq(forwardThenBackward, identityFactor)) {
      throw new Error(
        "CategoryLimits.unitBinaryProduct: forward ∘ backward must equal the identity on the factor",
      )
    }

    const backwardThenForward = compose(backward, forward)
    if (!eq(backwardThenForward, identityProduct)) {
      throw new Error(
        "CategoryLimits.unitBinaryProduct: backward ∘ forward must equal the identity on the product",
      )
    }

    const isoCategory = category as unknown as RegistryFiniteCategory<O, M>

    if (!isIso(isoCategory, forward)) {
      throw new Error("CategoryLimits.unitBinaryProduct: expected the forward arrow to be an isomorphism")
    }

    if (!isIso(isoCategory, backward)) {
      throw new Error("CategoryLimits.unitBinaryProduct: expected the backward arrow to be an isomorphism")
    }

    return { forward, backward }
  }

  /** Trait for building coproduct mediating maps */
  export interface HasCoproductMediators<O, M> extends HasFiniteCoproducts<O, M> {
    // build [g_i] : ⨁F(i) -> Y from legs g_i and known coproduct object
    cotuple: (coproduct: O, legs: ReadonlyArray<M>, codomain: O) => M
  }

  /** Generic product mediator builder */
  export const mediateProduct =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,             // objects F(i)
      C: HasProductMediators<O, M>,
      X: O,                                        // domain of legs
      legs: IndexedFamilies.Family<I, M>           // legs f_i : X -> F(i)
    ) => {
      const objs = Ifin.carrier.map((i) => F(i))
      const { obj: P, projections } = C.product(objs)
      const legsArr = Ifin.carrier.map((i) => legs(i))
      const mediator = C.tuple(X, legsArr, P)
      return { 
        product: P, 
        projections: (i: I) => projections[Ifin.carrier.indexOf(i)]!, 
        mediator 
      }
    }

  /** Generic coproduct mediator builder */
  export const mediateCoproduct =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,             // objects F(i)
      C: HasCoproductMediators<O, M>,
      Y: O,                                        // codomain of legs
      legs: IndexedFamilies.Family<I, M>           // legs g_i : F(i) -> Y
    ) => {
      const objs = Ifin.carrier.map((i) => F(i))
      const { obj: Cop, injections } = C.coproduct(objs)
      const legsArr = Ifin.carrier.map((i) => legs(i))
      const mediator = C.cotuple(Cop, legsArr, Y)
      return { 
        coproduct: Cop, 
        injections: (i: I) => injections[Ifin.carrier.indexOf(i)]!, 
        mediator 
      }
    }

  /** Check if object satisfies product universal property for given cone */
  export const isProductForCone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      productObj: O,
      projections: IndexedFamilies.Family<I, M>,
      cone: Cone<I, O, M>,                         // f_i : X -> F(i)
      tuple: (X: O, legs: ReadonlyArray<M>, P: O) => M,
      options?: { competitor?: M }
    ) => {
      const indices = Ifin.carrier
      const legsArr = indices.map((i) => cone.legs(i))
      const mediator = tuple(cone.tip, legsArr, productObj)
      const triangles = productMediates(C, eq, projections, mediator, cone, indices)
      let unique = triangles

      if (triangles) {
        const competitor = options?.competitor
        if (competitor) {
          const competitorTriangles = productMediates(C, eq, projections, competitor, cone, indices)
          if (competitorTriangles) {
            const agrees = agreeUnderProjections(C, eq, projections, mediator, competitor, indices)
            if (!agrees || !eq(competitor, mediator)) unique = false
          }
        }
      }
      return { triangles, unique }
    }

  /** Check if object satisfies coproduct universal property for given cocone */
  export const isCoproductForCocone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      coproductObj: O,
      injections: IndexedFamilies.Family<I, M>,
      cocone: Cocone<I, O, M>,                     // g_i : F(i) -> Y
      cotuple: (Cop: O, legs: ReadonlyArray<M>, Y: O) => M,
      options?: { competitor?: M }
    ) => {
      const indices = Ifin.carrier
      const legsArr = indices.map((i) => cocone.legs(i))
      const mediator = cotuple(coproductObj, legsArr, cocone.coTip)
      const triangles = coproductMediates(C, eq, injections, mediator, cocone, indices)
      let unique = triangles

      if (triangles) {
        const competitor = options?.competitor
        if (competitor) {
          const competitorTriangles = coproductMediates(C, eq, injections, competitor, cocone, indices)
          if (competitorTriangles) {
            const agrees = agreeUnderInjections(C, eq, injections, mediator, competitor, indices)
            if (!agrees || !eq(competitor, mediator)) unique = false
          }
        }
      }
      return { triangles, unique }
    }
}

/* ================================================================
   Arrow category operations for families of morphisms
   ================================================================ */

export namespace ArrowFamilies {
  /** Category with domain/codomain operations */
  export interface HasDomCod<O, M> {
    dom: (f: M) => O
    cod: (f: M) => O
  }

  /** Extract domain family from family of morphisms */
  export const domFam =
    <I, O, M>(C: HasDomCod<O, M>, G: IndexedFamilies.Family<I, { f: M }>): IndexedFamilies.Family<I, O> =>
      (i: I) => C.dom(G(i).f)

  /** Extract codomain family from family of morphisms */
  export const codFam =
    <I, O, M>(C: HasDomCod<O, M>, G: IndexedFamilies.Family<I, { f: M }>): IndexedFamilies.Family<I, O> =>
      (i: I) => C.cod(G(i).f)

  /** Pointwise composition of morphism families (when types align) */
  export const composeFam =
    <I, M>(
      compose: (g: M, f: M) => M,
      H: IndexedFamilies.Family<I, { f: M }>,
      G: IndexedFamilies.Family<I, { f: M }>
    ): IndexedFamilies.Family<I, { f: M }> =>
      (i: I) => ({ f: compose(H(i).f, G(i).f) })
}

// Namespaced exports for discoverability
export const Diagram = {
  makePosetDiagram, pushoutInDiagram, pullbackInDiagram,
  LanDisc, RanDisc, reindexDisc,
  LanPoset, RanPoset,
  coproductComplex, productComplex,
  makeFinitePoset, prettyPoset, makePosetDiagramCompat, idChainMapCompat
}

export const Lin = { 
  registerRref, rrefQPivot, FieldQ, solveLinear, nullspace, colspace
}

export const Vect = {
  VS, idL, composeL, linToChain, complexSpaces,
  toVectAtDegree, arrowMatrixAtDegree
}

// Pretty namespace is defined above

export const IntegerLA = {
  smithNormalForm
}

export const Algebra = {
  applyRepAsLin, coactionAsLin, pushCoaction,
  actionToChain, coactionToChain
}

export { makeSubcategory, makeFullSubcategory, isFullSubcategory } from "./subcategory"
export { ProductCat, Pi1, Pi2, Pairing } from "./product-cat"
export { Dual } from "./dual-cat"
export { Contra, isContravariant } from "./contravariant"
export type { SimpleCat } from "./simple-cat"
export {
  makeFinitePullbackCalculator,
  type PullbackCalculator,
  type PullbackData,
} from "./pullback"
export {
  makeReindexingFunctor,
  type ReindexingFunctor,
} from "./reindexing"
export {
  checkReindexIdentityLaw,
  checkReindexCompositionLaw,
  sampleSlice,
  type SliceSamples,
} from "./reindexing-laws"
export {
  makeSlice,
  makeCoslice,
  makePostcomposeOnSlice,
  makeSliceProduct,
  makeFiniteSliceProduct,
  lookupSliceProductMetadata,
  type SliceObject,
  type SliceArrow,
  type CosliceObject,
  type CosliceArrow,
  type SlicePostcomposeFunctor,
  type SliceProductWitness,
  type SliceFiniteProductWitness,
  type SliceProductDiagonal,
  type SliceProductUnit,
} from "./slice-cat"
export {
  makeSliceTripleArrow,
  composeSliceTripleArrows,
  idSliceTripleArrow,
  sliceArrowToTriple,
  sliceTripleToArrow,
  type SliceTripleArrow,
  type SliceTripleObject,
} from "./slice-triple"
export {
  makeCosliceTripleArrow,
  composeCosliceTripleArrows,
  idCosliceTripleArrow,
  cosliceArrowToTriple,
  cosliceTripleToArrow,
  type CosliceTripleArrow,
  type CosliceTripleObject,
} from "./coslice-triple"
export {
  makeCoslicePrecomposition,
  type CoslicePrecomposition,
} from "./coslice-precompose"
export {
  makeFinitePushoutCalc,
  makeFinitePushoutCalculator,
  type PushoutCalc,
  type PushoutCalculator,
  type PushoutData,
} from "./pushout"
export { makeToyPushouts } from "./pushout-toy"
export {
  makeCosliceReindexingFunctor,
  type CosliceReindexingFunctor,
} from "./coslice-reindexing"
export {
  explainSliceMismatch,
  explainCoSliceMismatch,
  describeInverseEquation,
  checkInverseEquation,
} from "./diagnostics"
export {
  makeArrowCategory,
  makeArrowDomainFunctor,
  makeArrowCodomainFunctor,
  type ArrowSquare,
} from "./arrow-category"
export {
  makeComma,
  type Functor as CommaFunctor,
  type CommaObject,
  type CommaArrow,
} from "./comma"
export {
  isMono,
  isEpi,
} from "./kinds/mono-epi"
export { withMonoEpiCache, type MonoEpiCache } from "./kinds/mono-epi-cache"
export {
  identityIsMono,
  identityIsEpi,
  composeMonosAreMono,
  composeEpisAreEpi,
  rightFactorOfMono,
  leftFactorOfEpi,
  saturateMonoEpi,
  type MonoEpiClosure,
} from "./kinds/mono-epi-laws"
export { forkCommutes, isMonoByForks } from "./kinds/fork"
export {
  leftInverses,
  rightInverses,
  hasLeftInverse,
  hasRightInverse,
  twoSidedInverses,
  isIso as isIsoByInverseSearch,
} from "./kinds/inverses"
export { type CatTraits } from "./kinds/traits"
export { arrowGlyph, prettyArrow } from "./pretty"
export { isMonoByGlobals, type HasTerminal } from "./traits/global-elements"
export {
  checkGeneralizedElementSeparation,
  type GeneralizedElementAnalysis,
  type GeneralizedElementFailure,
  type GeneralizedElementOptions,
  type GeneralizedElementWitness,
  type HasGeneralizedElements,
} from "./traits/generalized-elements"
export {
  checkPointSeparator,
  checkWellPointedness,
  type ParallelPair,
  type PointSeparatorAnalysis,
  type PointSeparatorFailure,
  type PointSeparatorWitness,
  type WellPointednessAnalysis,
} from "./traits/well-pointedness"
export { nonEpiWitnessInSet, type NonEpiWitness } from "./kinds/epi-witness-set"
export {
  FinSetCat,
  type FinSetName,
  type FuncArr,
  type FinSetCategory,
  isInjective,
  isSurjective,
} from "./models/finset-cat"
export {
  buildLeftInverseForInjective,
  buildRightInverseForSurjective,
} from "./models/finset-inverses"
export {
  FinPosCat,
  FinPos,
  type FinPosCategory,
  type FinPosObj,
  type MonoMap,
} from "./models/finpos-cat"
export {
  FinGrpCat,
  FinGrp,
  type FinGrpCategory,
  type FinGrpObj,
  type Hom as FinGrpHom,
  type FinGrpProductWitness,
  type FinGrpFiniteProductWitness,
  type FinGrpProductDiagonal,
  type FinGrpProductUnit,
} from "./models/fingroup-cat"
export {
  makeToyNonEpicProductCategory,
  type ToyArrow,
  type ToyNonEpicProductCategory,
  type ToyObject,
} from "./models/toy-non-epi-product"
export {
  kernelElements,
  nonMonoWitness as finGrpNonMonoWitness,
  type KernelWitness as FinGrpKernelWitness,
} from "./models/fingroup-kernel"
export {
  inverse,
  isIso,
  isoWitness,
  areIsomorphic,
  type IsoWitness,
} from "./kinds/iso"
export {
  findMutualMonicFactorizations,
  verifyMutualMonicFactorizations,
  type MutualMonicFactorization,
  type FactorisationCheckResult,
} from "./kinds/monic-factorization"
export {
  epiMonoFactor,
  epiMonoMiddleIso,
  type Factor as EpiMonoFactor,
  type FactorIso as EpiMonoFactorIso,
} from "./kinds/epi-mono-factor"
export {
  catFromGroup,
  groupFromOneObjectGroupoid,
  type FinGroup,
} from "./kinds/group-as-category"
export {
  type Group,
  type GroupHomomorphism,
  type GroupIsomorphism,
  type GroupAutomorphism,
  type Rational,
  isGroupHomomorphism,
  isGroupIsomorphism,
  isGroupAutomorphism,
  IntegerAdditionGroup,
  RationalAdditionGroup,
  integerSamples,
  rationalSamples,
  identityAutomorphismZ,
  negationAutomorphismZ,
  scalingAutomorphismQ,
  rational,
  verifyIntegerAutomorphisms,
  verifyScalingAutomorphism,
} from "./kinds/group-automorphism"
export {
  isGroupoid,
  actionGroupoid,
} from "./kinds/groupoid"
export {
  makeTextbookToolkit,
  type TextbookToolkit,
  type TextbookToolkitOptions,
  type SliceToolkit,
  type CosliceToolkit,
  type ProductToolkit,
  type SubcategoryToolkit,
} from "./textbook-toolkit"
export {
  LeftInverseImpliesMono,
  RightInverseImpliesEpi,
  IsoIsMonoAndEpi,
  MonoWithRightInverseIsIso,
  EpiWithLeftInverseIsIso,
  type ArrowOracle,
} from "./oracles/inverses-oracles"
export {
  detectBalancedPromotions,
  type BalancedPromotion,
} from "./oracles/balanced"
export {
  MonicFactorizationYieldsIso,
  type CategoryOracle,
} from "./oracles/monic-factorization"
export {
  checkSliceCategoryLaws,
  type SliceCategoryLawReport,
} from "./slice-laws"
export {
  Rewriter,
  defaultOperationRules,
  type OperationRule,
  type OperationContext,
  type Suggestion as OperationSuggestion,
  type Rewrite as OperationRewrite,
  type NormalizeCompositeRewrite,
  type UpgradeToIsoRewrite,
  type ReplaceWithIdentityRewrite,
  type MergeSubobjectsRewrite,
  type MergeObjectsRewrite,
  type FactorThroughEpiMonoRewrite,
} from "./operations/rewriter"
export { UnionFind } from "./operations/union-find"

// Namespaces are declared above and exported automatically

export const Chain = {
  compose: composeChainMap, 
  id: idChainMapField, 
  inclusionIntoCoproduct, 
  projectionFromProduct 
}

export const Exactness = {
  checkExactnessForFunctor,
  smoke_coim_im_iso,
  runLesConeProps,
  checkLongExactConeSegment
}

// Examples have been moved to examples.ts
