import { isNone } from "./option"
import type { Option } from "./option"
import { isErr } from "./result"
import type { Result as ResultT } from "./result"
import type { FunctorK1, HKId1, HKKind1 } from "./allTS"
import { evalDefer, evalMap, evalNow, evaluate } from "./array-recursion-trampoline"

// ========== Catamorphism / Anamorphism / Hylomorphism (Array) ==========

// cata over arrays (right-fold)
export const cataArray =
  <A, B>(nil: B, cons: (head: A, tailFold: B) => B) =>
  (as: ReadonlyArray<A>): B =>
    as.reduceRight((acc, a) => cons(a, acc), nil)

// ana over arrays (unfold)
export const anaArray =
  <A, S>(step: (s: S) => Option<readonly [A, S]>) =>
  (s0: S): ReadonlyArray<A> => {
    const out: A[] = []
    let s = s0
    // build left-to-right
    // step(s) = Some([a, s']) emits a and continues; None stops
    for (;;) {
      const o = step(s)
      if (isNone(o)) break
      const [a, s1] = o.value
      out.push(a)
      s = s1
    }
    return out
  }

// hylo (unfold + fold) without storing the intermediate array
export const hyloArray =
  <A, S, B>(
    step: (s: S) => Option<readonly [A, S]>, // coalgebra
    alg: (head: A, tailFold: B) => B, // algebra
    nil: B
  ) =>
  (s0: S): B => {
    const go = (s: S) =>
      evalDefer(() => {
        const o = step(s)
        if (isNone(o)) return evalNow(nil)
        const [a, s1] = o.value
        return evalMap(go(s1), (tail) => alg(a, tail))
      })

    return evaluate(go(s0))
  }

// ========== Paramorphism / Apomorphism (Array) ==========

type Result<E, A> = ResultT<E, A>

// para: step sees (head, tail_unprocessed, folded_tail)
export const paraArray =
  <A, B>(nil: B, cons: (head: A, tail: ReadonlyArray<A>, foldedTail: B) => B) =>
  (as: ReadonlyArray<A>): B => {
    const go = (xs: ReadonlyArray<A>) =>
      evalDefer(() => {
        if (xs.length === 0) return evalNow(nil)
        const tail = xs.slice(1)
        return evalMap(go(tail), (foldedTail) => cons(xs[0]!, tail, foldedTail))
      })

    return evaluate(go(as))
  }

// apo: step returns either an embedded remaining tail (Err) or one element + next seed (Ok)
export const apoArray =
  <A, S>(step: (s: S) => Result<ReadonlyArray<A>, readonly [A, S]>) =>
  (s0: S): ReadonlyArray<A> => {
    const out: A[] = []
    let s = s0
    for (;;) {
      const r = step(s)
      if (isErr(r)) {
        // splice in the whole remaining tail and finish
        return [...out, ...r.error]
      } else {
        const [a, s1] = r.value
        out.push(a)
        s = s1
      }
    }
  }

// ====================================================================
// Recursion schemes (concrete, no HKT):
//  - Base functor F<A> where recursive positions are "A"
//  - Fixpoint type     FixF = { un: F<FixF> }
//  - mapF: <A,B>(f: (A)->B) => (F<A>)->F<B>   (the functor action)
//  - cata (fold), ana (unfold), hylo (unfold+fold fused)
// ====================================================================

// --------------------------------------------------------------------
// JSON-ish AST (tagged union base functor)
// --------------------------------------------------------------------

export type JsonF<A> =
  | { _tag: 'JNull' }
  | { _tag: 'JUndefined' }                       // NEW
  | { _tag: 'JBool';  value: boolean }
  | { _tag: 'JNum';   value: number }
  | { _tag: 'JDec';   decimal: string }          // NEW: decimal-as-string
  | { _tag: 'JStr';   value: string }
  | { _tag: 'JBinary'; base64: string }          // NEW: binary-as-base64
  | { _tag: 'JRegex'; pattern: string; flags?: string } // NEW
  | { _tag: 'JDate'; iso: string }                      // NEW: date handling
  | { _tag: 'JArr';   items: ReadonlyArray<A> }
  | { _tag: 'JSet';   items: ReadonlyArray<A> }  // NEW: set semantics
  | { _tag: 'JObj';   entries: ReadonlyArray<readonly [string, A]> }

// Functor action for JsonF (map over recursive slots only)
export const mapJsonF =
  <A, B>(f: (a: A) => B) =>
  (fa: JsonF<A>): JsonF<B> => {
    switch (fa._tag) {
      case 'JNull':      return fa
      case 'JUndefined': return fa
      case 'JBool':      return fa
      case 'JNum':       return fa
      case 'JDec':       return fa
      case 'JStr':       return fa
      case 'JBinary':    return fa
      case 'JRegex':     return fa
      case 'JDate':      return fa
      case 'JArr':       return { _tag: 'JArr', items: fa.items.map(f) }
      case 'JSet':       return { _tag: 'JSet', items: fa.items.map(f) }
      case 'JObj':       return {
        _tag: 'JObj',
        entries: fa.entries.map(([k, a]) => [k, f(a)] as const)
      }
    }
  }

// Fixpoint for a 1-arg functor F<_>
export type Fix1<F extends HKId1> = { un: HKKind1<F, Fix1<F>> }

// Generic factory — no unsound casts.
export const makeRecursionK1 = <F extends HKId1>(F: FunctorK1<F>) => {
  // These schemes build chains of Eval thunks and execute them via evaluate (see array-recursion-trampoline.ts)
  const cata =
    <B>(alg: (fb: HKKind1<F, B>) => B) =>
    (t: Fix1<F>): B => {
      const fold = (node: Fix1<F>) =>
        evalDefer(() => {
          const mapped = F.map((child: Fix1<F>) => evaluate(fold(child)))(node.un)
          return evalNow(alg(mapped))
        })

      return evaluate(fold(t))
    }

  const ana =
    <S>(coalg: (s: S) => HKKind1<F, S>) =>
    (s0: S): Fix1<F> => {
      const unfold = (s: S) =>
        evalDefer(() => {
          const mapped = F.map((next: S) => evaluate(unfold(next)))(coalg(s))
          return evalNow({ un: mapped })
        })

      return evaluate(unfold(s0))
    }

  const hylo =
    <S, B>(coalg: (s: S) => HKKind1<F, S>, alg: (fb: HKKind1<F, B>) => B) =>
    (s0: S): B => {
      const go = (s: S) =>
        evalDefer(() => {
          const mapped = F.map((next: S) => evaluate(go(next)))(coalg(s))
          return evalNow(alg(mapped))
        })

      return evaluate(go(s0))
    }

  return { cata, ana, hylo }
}

// ---- HKT functor instance + fixpoint alias via factory ----
export const JsonFK: FunctorK1<'JsonF'> = { map: mapJsonF }

export type Json = Fix1<'JsonF'>

// Smart constructors (unchanged shape)
export const jNull  = (): Json => ({ un: { _tag: 'JNull' } })
export const jBool  = (b: boolean): Json => ({ un: { _tag: 'JBool', value: b } })
export const jNum   = (n: number): Json => ({ un: { _tag: 'JNum',  value: n } })
export const jStr   = (s: string): Json => ({ un: { _tag: 'JStr',  value: s } })
export const jArr   = (xs: ReadonlyArray<Json>): Json => ({ un: { _tag: 'JArr', items: xs } })
export const jObj   = (es: ReadonlyArray<readonly [string, Json]>): Json =>
  ({ un: { _tag: 'JObj', entries: es } })

// New constructors for extended Json variants
export const jUndef = (): Json => ({ un: { _tag: 'JUndefined' } })
export const jDec    = (decimal: string): Json => ({ un: { _tag: 'JDec', decimal } })
export const jBinary = (base64: string): Json => ({ un: { _tag: 'JBinary', base64 } })
export const jRegex  = (pattern: string, flags?: string): Json =>
  ({ un: { _tag: 'JRegex', pattern, ...(flags !== undefined ? { flags } : {}) } })
export const jDate   = (iso: string): Json => ({ un: { _tag: 'JDate', iso } })
export const jSet    = (xs: ReadonlyArray<Json>): Json =>
  ({ un: { _tag: 'JSet', items: xs } })

// cata / ana / hylo derived from the HKT factory (remove your old ad-hoc versions)
export const { cata: cataJson, ana: anaJson, hylo: hyloJson } = makeRecursionK1(JsonFK)
