import { makeRecursionK1 } from "../array-recursion"
import type { Fix1 } from "../array-recursion"
import type { FunctorK1 } from "../allTS"
import { Err, Ok, isErr, mapR } from "../result"
import type { Result } from "../result"
import { Reader as ReaderNS } from "../endo-2category"
import type { Reader } from "../endo-2category"

import { _exhaustive } from "./exhaustive"

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
    ReaderNS.map<A, B>(f)<Env>(ra)

export const apRdr =
  <Env, A, B>(rfab: Rdr<Env, (a: A) => B>) =>
  (ra: Rdr<Env, A>): Rdr<Env, B> =>
    ReaderNS.ap<Env, A, B>(rfab)(ra)

export const ofRdr =
  <Env, A>(a: A): Rdr<Env, A> =>
    ReaderNS.of<Env, A>(a)

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
      case 'Var':  return ReaderNS.asks(env => env[f.name] ?? 0)
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
      case 'Var':  return ReaderNS.asks(env => {
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


