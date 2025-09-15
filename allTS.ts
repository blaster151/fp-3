/**
 * tiny-fp — a compact, practical FP toolkit for TypeScript
 * --------------------------------------------------------
 * Goals
 *  - Zero deps, tree-shakeable, pragmatic types
 *  - Great dev ergonomics via type inference
 *  - Small but extensible: start with Option, Result, pipe/flow, pattern matching, and a few typeclasses
 *
 * Usage
 *  import { Option, Some, None, Result, Ok, Err, pipe, flow } from "./tiny-fp";
 *
 * Build
 *  tsc --target ES2019 --module ES2020 tiny-fp.ts
 */

// Some guidelines
// Prefer the “3-then-<R>” shape for helpers:

// Choosing between two approaches
// Parallel (*Par): best when steps don’t depend on each other and can run together. (Applicative style)
// Sequential (*Seq): best when each step depends on prior results/state or you want early short-circuit.

// Choosing between two approaches
// DoRTO / DoRWST: fluent, object-accumulating pipelines (great for building derived records).
// genRTO / genRWST: read-like-a-script monadic sequencing with early return (None short-circuit, RWST state/log threading).

// ================
// Core primitives
// ================

export type Lazy<T> = () => T
export type Predicate<A> = (a: A) => boolean
export type Refinement<A, B extends A> = (a: A) => a is B
export type Eq<A> = (x: A, y: A) => boolean
export type Ord<A> = (x: A, y: A) => number

export const id = <A>(a: A): A => a
export const const_ = <A>(a: A) => <B>(_?: B): A => a
export const absurd = (x: never): never => x

// ---------------
// pipe / flow / compose
// ---------------
export function pipe<A>(a: A): A
export function pipe<A, B>(a: A, ab: (a: A) => B): B
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C
export function pipe<A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D
export function pipe(a: unknown, ...fns: Array<(x: any) => any>): unknown {
  return fns.reduce((acc, f) => f(acc), a)
}

export const flow =
  <A extends any[], B>(ab: (...a: A) => B) => ab

export const compose = <A, B, C>(bc: (b: B) => C, ab: (a: A) => B) => (a: A): C => bc(ab(a))

// ---------------
// curry / uncurry
// ---------------
export const curry = <A, B, C>(f: (a: A, b: B) => C) => (a: A) => (b: B) => f(a, b)
export const uncurry = <A, B, C>(f: (a: A) => (b: B) => C) => (a: A, b: B) => f(a)(b)

// =======================
// Option (aka Maybe)
// =======================
export type None = { readonly _tag: 'None' }
export type Some<A> = { readonly _tag: 'Some', readonly value: A }
export type Option<A> = None | Some<A>

export const None: None = { _tag: 'None' }
export const Some = <A>(value: A): Option<A> => ({ _tag: 'Some', value })

export const isNone = <A>(oa: Option<A>): oa is None => oa._tag === 'None'
export const isSome = <A>(oa: Option<A>): oa is Some<A> => oa._tag === 'Some'

export const fromNullable = <A>(a: A | null | undefined): Option<A> => (a == null ? None : Some(a))
export const toNullable = <A>(oa: Option<A>): A | null => (isSome(oa) ? oa.value : null)

export const mapO = <A, B>(f: (a: A) => B) => (oa: Option<A>): Option<B> => (isSome(oa) ? Some(f(oa.value)) : None)
export const flatMapO = <A, B>(f: (a: A) => Option<B>) => (oa: Option<A>): Option<B> => (isSome(oa) ? f(oa.value) : None)
export const getOrElseO = <A>(onNone: Lazy<A>) => (oa: Option<A>): A => (isSome(oa) ? oa.value : onNone())
export const orElseO = <A>(that: Lazy<Option<A>>) => (oa: Option<A>): Option<A> => (isSome(oa) ? oa : that())
export const filterO = <A>(p: Predicate<A>) => (oa: Option<A>): Option<A> => (isSome(oa) && p(oa.value) ? oa : None)

// =======================
// Result (aka Either)
// =======================
export type Err<E> = { readonly _tag: 'Err', readonly error: E }
export type Ok<A> = { readonly _tag: 'Ok', readonly value: A }
export type Result<E, A> = Err<E> | Ok<A>

export const Err = <E>(error: E): Result<E, never> => ({ _tag: 'Err', error })
export const Ok = <A>(value: A): Result<never, A> => ({ _tag: 'Ok', value })

export const isErr = <E, A>(ra: Result<E, A>): ra is Err<E> => ra._tag === 'Err'
export const isOk = <E, A>(ra: Result<E, A>): ra is Ok<A> => ra._tag === 'Ok'

export const mapR = <E, A, B>(f: (a: A) => B) => (ra: Result<E, A>): Result<E, B> => (isOk(ra) ? Ok(f(ra.value)) : ra)
export const mapErr = <E, F, A>(f: (e: E) => F) => (ra: Result<E, A>): Result<F, A> => (isErr(ra) ? Err(f(ra.error)) : ra)
export const flatMapR = <E, A, F, B>(f: (a: A) => Result<F, B>) => (ra: Result<E, A>): Result<E | F, B> => (isOk(ra) ? f(ra.value) : ra as any)
export const getOrElseR = <E, A>(onErr: (e: E) => A) => (ra: Result<E, A>): A => (isOk(ra) ? ra.value : onErr(ra.error))

export const tryCatch = <A>(thunk: Lazy<A>, onThrow: (u: unknown) => Error = (u) => (u instanceof Error ? u : new Error(String(u)))): Result<Error, A> => {
  try {
    return Ok(thunk())
  } catch (u) {
    return Err(onThrow(u))
  }
}




// =======================
// Do-notation for Result
// =======================
//
// Goal
//  Build up an object step-by-step from multiple Result<E, A> values,
//  short-circuiting on the first Err, while keeping rich types for the
//  accumulated fields. No more temp variables or nested flatMaps.
//
// Shape
//  DoR<E>().bind('field', resultA).bind('other', resultB).let('derived', ...).map(...) / done()
//
// Notes
//  - `.bind` merges Ok values into an object { ...acc, [k]: value }
//  - On any Err, the builder keeps that Err and ignores the rest
//  - `.let` adds a pure, already-available value (no Result involved)

type _ObjectLike = Record<string, unknown>

export type DoResultBuilder<E, T extends _ObjectLike> = {
  /** Bind a Result under property `K` (accumulates on Ok; short-circuits on Err) */
  bind: <K extends string, A>(
    k: K,
    ra: Result<E, A>
  ) => DoResultBuilder<E, T & { readonly [P in K]: A }>

  /** Insert a pure value under `K` (no Result involved) */
  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoResultBuilder<E, T & { readonly [P in K]: A }>

  /** Map the final accumulated object into B, yielding Result<E, B> */
  map: <B>(f: (t: T) => B) => Result<E, B>

  /** Finish and return Result<E, T> */
  done: () => Result<E, T>
}

export const DoR = <E = never>() => {
  const start: Result<E, {}> = Ok({})
  const make = <T extends _ObjectLike>(acc: Result<E, T>): DoResultBuilder<E, T> => ({
    bind: (k, ra) =>
      make(
        isOk(acc)
          ? isOk(ra)
            ? Ok({ ...(acc.value as any), [k]: ra.value } as T)
            : (ra as any)
          : (acc as any)
      ),
    let: (k, a) =>
      make(
        isOk(acc)
          ? Ok({ ...(acc.value as any), [k]: a } as T)
          : (acc as any)
      ),
    map: (f) => mapR<E, T, any>(f)(acc),
    done: () => acc,
  })
  return make(start)
}









// =======================
// Typeclasses (Functor / Apply / Monad)
// =======================
export interface Functor<F> {
  readonly map: <A, B>(f: (a: A) => B) => (fa: any) => any
}
export interface Apply<F> extends Functor<F> {
  readonly ap: <A, B>(fab: any) => (fa: any) => any
}
export interface Monad<F> extends Apply<F> {
  readonly of: <A>(a: A) => any
  readonly chain: <A, B>(f: (a: A) => any) => (fa: any) => any
}

// Instances: Option
export const OptionI: Monad<'Option'> = {
  map: mapO as any,
  ap: <A, B>(fab: Option<(a: A) => B>) => (fa: Option<A>): Option<B> => (isSome(fab) && isSome(fa) ? Some(fab.value(fa.value)) : None),
  of: Some as any,
  chain: flatMapO as any
}

// Instances: Result (right-biased)
export const ResultI: Monad<'Result'> = {
  map: mapR as any,
  ap: <E, A, B>(rfab: Result<E, (a: A) => B>) => (rfa: Result<E, A>): Result<E, B> => (isOk(rfab) && isOk(rfa) ? Ok(rfab.value(rfa.value)) : (isErr(rfab) ? rfab : rfa) as any),
  of: Ok as any,
  chain: flatMapR as any
}

// =======================
// Monad packs (friendly, no collisions)
// =======================

// ---- Maybe (Option) ----
// Thin wrappers over your Option helpers; names chosen to avoid clashes.
export const MaybeM = {
  of: <A>(a: A) => Some(a) as Option<A>,
  map: mapO,
  chain: flatMapO,
  ap:
    <A, B>(ofab: Option<(a: A) => B>) =>
    (oa: Option<A>): Option<B> =>
      isSome(ofab) && isSome(oa) ? Some(ofab.value(oa.value)) : None,
  getOrElse: getOrElseO,
  orElse: orElseO,
  fromNullable,
}

// ---- Promise ----
// Useful when you want to work with native Promise directly (no Task wrapper).
export const PromiseM = {
  of: <A>(a: A) => Promise.resolve(a) as Promise<A>,
  map:
    <A, B>(f: (a: A) => B) =>
    (pa: Promise<A>): Promise<B> =>
      pa.then(f),
  chain:
    <A, B>(f: (a: A) => Promise<B>) =>
    (pa: Promise<A>): Promise<B> =>
      pa.then(f),
  ap:
    <A, B>(pfab: Promise<(a: A) => B>) =>
    (pa: Promise<A>): Promise<B> =>
      Promise.all([pfab, pa]).then(([fab, a]) => fab(a)),
}

// ---- Array (List) ----
// Readonly in/out to fit your FP style.
export const ArrayM = {
  of: <A>(a: A): ReadonlyArray<A> => [a],
  map:
    <A, B>(f: (a: A) => B) =>
    (as: ReadonlyArray<A>): ReadonlyArray<B> =>
      as.map(f),
  chain:
    <A, B>(f: (a: A) => ReadonlyArray<B>) =>
    (as: ReadonlyArray<A>): ReadonlyArray<B> =>
      as.flatMap(f),
  ap:
    <A, B>(fs: ReadonlyArray<(a: A) => B>) =>
    (as: ReadonlyArray<A>): ReadonlyArray<B> =>
      fs.flatMap(f => as.map(f)),
}

// ---- Result (fixed E) ----
// A monad instance where the error type is held constant across binds.
// (Nice ergonomics when you "pin" E for a pipeline.)
export const ResultM = <E>() => ({
  of: <A>(a: A): Result<E, A> => Ok(a) as Result<E, A>,
  map: <A, B>(f: (a: A) => B) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? Ok(f(ra.value)) : (ra as any),
  chain: <A, B>(f: (a: A) => Result<E, B>) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? f(ra.value) : (ra as any),
  ap: <A, B>(rfab: Result<E, (a: A) => B>) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(rfab) && isOk(ra)
        ? Ok(rfab.value(ra.value))
        : (isErr(rfab) ? rfab : (ra as any)),
  // still handy to keep around
  mapErr: <F>(_: (e: E) => F) =>
    <A>(ra: Result<E, A>): Result<E, A> =>
      ra, // fixed-E instance intentionally doesn't change E
})

/**
 * Kleisli composition (primer)
 * ----------------------------
 * Fix a monad M<_>. A *Kleisli arrow* is a function A -> M<B>.
 * Kleisli composition lets you compose effectful functions without
 * manually unwrapping the monad:
 *
 *   Given f: A -> M<B> and g: B -> M<C>,
 *   (f >=> g): A -> M<C> is defined as:
 *     a => chain(f(a), g)
 *
 * Where `chain` is the monad's bind/flatMap:
 *   - Option/Maybe: flatMapO
 *   - Result<E,_>: flatMapR  (short-circuits on Err)
 *   - Promise/Task: then      (sequences async)
 *   - Reader<R,_>: r => g(f(a)(r))(r)  (threads environment R)
 *   - ReaderTask<R,_>: r => f(a)(r).then(b => g(b)(r))
 *
 * Identities and laws (monad laws in Kleisli form):
 *   idK: A -> M<A> is `of`/`pure` (wrap a value): a => of(a)
 *   Left identity:   (of >=> f)   = f
 *   Right identity:  (f >=> of)   = f
 *   Associativity:   (f >=> g) >=> h  =  f >=> (g >=> h)
 *
 * Intuition:
 *   Compose "effectful" steps A -> M<B> -> M<C> as if they were pure.
 *   The monad carries the plumbing: errors, async, env, state, etc.
 */

// Kleisli helpers (specialized)
export const composeK_Maybe =
  <A, B, C>(f: (a: A) => Option<B>, g: (b: B) => Option<C>) =>
  (a: A): Option<C> =>
    flatMapO(g)(f(a))

export const composeK_Promise =
  <A, B, C>(f: (a: A) => Promise<B>, g: (b: B) => Promise<C>) =>
  (a: A): Promise<C> =>
    f(a).then(g)

export const composeK_Array =
  <A, B, C>(f: (a: A) => ReadonlyArray<B>, g: (b: B) => ReadonlyArray<C>) =>
  (a: A): ReadonlyArray<C> =>
    f(a).flatMap(g)

export const composeK_ResultE =
  <E>() =>
  <A, B, C>(f: (a: A) => Result<E, B>, g: (b: B) => Result<E, C>) =>
  (a: A): Result<E, C> =>
    isOk(f(a)) ? g((f(a) as Ok<B>).value) : (f(a) as any)




// =======================
// Reader monad pack
// =======================
//
// Shape: Reader<R, A> = (r: R) => A
// Goal: ergonomic `of / map / chain / ap` with R pinned once.

export const ReaderM = <R>() => ({
  // pure
  of: <A>(a: A): Reader<R, A> =>
    Reader.of<R, A>(a),

  // functor
  map: <A, B>(f: (a: A) => B) =>
    (ra: Reader<R, A>): Reader<R, B> =>
      Reader.map<A, B>(f)(ra),

  // monad
  chain: <A, B>(f: (a: A) => Reader<R, B>) =>
    (ra: Reader<R, A>): Reader<R, B> =>
      Reader.chain<A, B, R>(f)(ra),

  // applicative
  ap: <A, B>(rfab: Reader<R, (a: A) => B>) =>
    (rfa: Reader<R, A>): Reader<R, B> =>
      Reader.ap<R, A, B>(rfab)(rfa),

  // environment goodies
  ask: (): Reader<R, R> => Reader.ask<R>(),
  asks: <A>(f: (r: R) => A): Reader<R, A> => Reader.asks<R, A>(f),
  local: <Q>(f: (q: Q) => R) =>
    <A>(rq: Reader<R, A>): Reader<Q, A> =>
      Reader.local<R, Q>(f)(rq),

  // tiny runner
  run: <A>(ra: Reader<R, A>, r: R): A => runReader(ra, r),
})

/**
 * Kleisli for Reader
 * ------------------
 * Reader<R, A> = (r: R) => A
 * A Kleisli arrow here is A -> Reader<R, B>.
 * Composition (>=>):
 *   (f >=> g)(a): Reader<R, C> =
 *     r => {
 *       const b = f(a)(r)
 *       return g(b)(r)
 *     }
 * This is exactly what `Reader.chain` does; `composeK_Reader` just
 * gives you the nicer A -> Reader<R,_> composition style.
 */

/** Kleisli composition for Reader */
export const composeK_Reader =
  <R, A, B, C>(f: (a: A) => Reader<R, B>, g: (b: B) => Reader<R, C>) =>
  (a: A): Reader<R, C> =>
  (r: R) =>
    g(f(a)(r))(r)

// =======================
// ReaderTask monad pack
// =======================
//
// Shape: ReaderTask<R, A> = (r: R) => Promise<A>
// Goal: ergonomic `of / map / chain / ap`, plus fromTask/fromReader.

export const ReaderTaskM = <R>() => ({
  // pure
  of:  <A>(a: A): ReaderTask<R, A> =>
    ReaderTask.of<R, A>(a),

  // interop
  fromTask:  <A>(ta: Task<A>): ReaderTask<R, A> =>
    async (_: R) => ta(),
  fromReader:<A>(ra: Reader<R, A>): ReaderTask<R, A> =>
    async (r) => ra(r),

  // functor
  map: <A, B>(f: (a: A) => B) =>
    (rta: ReaderTask<R, A>): ReaderTask<R, B> =>
    async (r) => f(await rta(r)),

  // monad
  chain: <A, B>(f: (a: A) => ReaderTask<R, B>) =>
    (rta: ReaderTask<R, A>): ReaderTask<R, B> =>
    async (r) => {
      const a = await rta(r)
      return f(a)(r)
    },

  // applicative (parallel over env)
  ap: <A, B>(rtfab: ReaderTask<R, (a: A) => B>) =>
    (rta: ReaderTask<R, A>): ReaderTask<R, B> =>
    async (r) => {
      const [fab, a] = await Promise.all([rtfab(r), rta(r)])
      return fab(a)
    },

  // environment goodies
  ask:  (): ReaderTask<R, R> => ReaderTask.ask<R>(),
  asks: <A>(f: (r: R) => A): ReaderTask<R, A> => ReaderTask.asks<R, A>(f),
  local: <Q>(f: (q: Q) => R) =>
    <A>(rtq: ReaderTask<R, A>): ReaderTask<Q, A> =>
      ReaderTask.local<R, Q>(f)(rtq),

  // tiny runner
  run:  <A>(rta: ReaderTask<R, A>, r: R) => rta(r),
})

/**
 * Kleisli for ReaderTask
 * ----------------------
 * ReaderTask<R, A> = (r: R) => Promise<A>
 * A Kleisli arrow is A -> ReaderTask<R, B>.
 * Composition (>=>):
 *   (f >=> g)(a): ReaderTask<R, C> =
 *     async r => {
 *       const b = await f(a)(r)
 *       return g(b)(r)
 *     }
 * Matches `ReaderTask.chain`. Because both sides share the same `r`,
 * this composes DI + async in one step, with no manual Promise or env
 * plumbing in user code.
 */

/** Kleisli composition for ReaderTask */
export const composeK_ReaderTask =
  <R, A, B, C>(f: (a: A) => ReaderTask<R, B>, g: (b: B) => ReaderTask<R, C>) =>
  (a: A): ReaderTask<R, C> =>
  async (r: R) => {
    const b = await f(a)(r)
    return g(b)(r)
  }



// =======================
// Do-notation: Reader
// =======================
//
// Build records step-by-step while threading the same environment R.
// No async here; everything is (r: R) => A.

export type DoReaderBuilder<R, T extends Record<string, unknown>> = {
  bind: <K extends string, A>(
    k: K,
    ra: Reader<R, A>
  ) => DoReaderBuilder<R, T & { readonly [P in K]: A }>

  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoReaderBuilder<R, T & { readonly [P in K]: A }>

  map:  <B>(f: (t: T) => B) => Reader<R, B>
  done: () => Reader<R, T>
}

export const DoReader = <R = unknown>() => {
  const start: Reader<R, {}> = Reader.of<R, {}>({})
  const make = <T extends Record<string, unknown>>(acc: Reader<R, T>): DoReaderBuilder<R, T> => ({
    bind: <K extends string, A>(k: K, ra: Reader<R, A>) =>
      make<T & { readonly [P in K]: A }>((r) =>
        ({ ...(acc(r) as any), [k]: ra(r) } as T & { readonly [P in K]: A })
      ),

    let: <K extends string, A>(k: K, a: A) =>
      make<T & { readonly [P in K]: A }>((r) =>
        ({ ...(acc(r) as any), [k]: a } as T & { readonly [P in K]: A })
      ),

    map:  <B>(f: (t: T) => B): Reader<R, B> =>
      (r) => f(acc(r)),

    done: () => acc,
  })
  return make(start)
}



// I don't really know where these should go
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
    step: (s: S) => Option<readonly [A, S]>,                 // coalgebra
    alg: (head: A, tailFold: B) => B,                        // algebra
    nil: B
  ) =>
  (s0: S): B => {
    const go = (s: S): B => {
      const o = step(s)
      if (isNone(o)) return nil
      const [a, s1] = o.value
      return alg(a, go(s1))
    }
    return go(s0)
  }

// ========== Paramorphism / Apomorphism (Array) ==========

// para: step sees (head, tail_unprocessed, folded_tail)
export const paraArray =
  <A, B>(nil: B, cons: (head: A, tail: ReadonlyArray<A>, foldedTail: B) => B) =>
  (as: ReadonlyArray<A>): B => {
    const go = (xs: ReadonlyArray<A>): B =>
      xs.length === 0 ? nil : cons(xs[0]!, xs.slice(1), go(xs.slice(1)))
    return go(as)
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





// ====================================================================
// Recursion schemes (concrete, no HKT):
//  - Base functor F<A> where recursive positions are "A"
//  - Fixpoint type     FixF = { un: F<FixF> }
//  - mapF: <A,B>(f: (A)->B) => (F<A>)->F<B>   (the functor action)
//  - cata (fold), ana (unfold), hylo (unfold+fold fused)
// ====================================================================

/**
 * CATAMORPHISM (fold) — consume a FixF into a B using an algebra:
 *   alg: F<B> -> B
 *   cata(alg)(t) = alg (mapF (cata(alg)) (t.un))
 *
 * ANAMORPHISM (unfold) — build a FixF from a seed S using a coalgebra:
 *   coalg: S -> F<S>
 *   ana(coalg)(s) = { un: mapF (ana(coalg)) (coalg(s)) }
 *
 * HYLOMORPHISM (fused ana ∘ cata) — no intermediate FixF:
 *   hylo(coalg, alg)(s) = fold(alg) (unfold(coalg)(s)) but fused.
 */

// --------------------------------------------------------------------
// JSON-ish AST (tagged union base functor)
// --------------------------------------------------------------------

export type JsonF<A> =
  | { _tag: 'JNull' }
  | { _tag: 'JBool'; value: boolean }
  | { _tag: 'JNum';  value: number }
  | { _tag: 'JStr';  value: string }
  | { _tag: 'JArr';  items: ReadonlyArray<A> }
  | { _tag: 'JObj';  entries: ReadonlyArray<readonly [string, A]> }

// Functor action for JsonF
export const mapJsonF =
  <A, B>(f: (a: A) => B) =>
  (fa: JsonF<A>): JsonF<B> => {
    switch (fa._tag) {
      case 'JNull': return fa
      case 'JBool': return fa
      case 'JNum':  return fa
      case 'JStr':  return fa
      case 'JArr':  return { _tag: 'JArr', items: fa.items.map(f) }
      case 'JObj':  return {
        _tag: 'JObj',
        entries: fa.entries.map(([k, a]) => [k, f(a)] as const)
      }
    }
  }




// Fixpoint for a 1-arg functor F<_>
export type Fix1<F extends HK.Id1> = { un: HK.Kind1<F, Fix1<F>> }

// Generic factory — no `any`, no casts.
export const makeRecursionK1 = <F extends HK.Id1>(F: FunctorK1<F>) => {
  const cata =
    <B>(alg: (fb: HK.Kind1<F, B>) => B) =>
    (t: Fix1<F>): B =>
      alg(F.map(cata(alg))(t.un))

  const ana =
    <S>(coalg: (s: S) => HK.Kind1<F, S>) =>
    (s0: S): Fix1<F> =>
      ({ un: F.map(ana(coalg))(coalg(s0)) })

  const hylo =
    <S, B>(coalg: (s: S) => HK.Kind1<F, S>, alg: (fb: HK.Kind1<F, B>) => B) =>
    (s0: S): B => {
      const go = (s: S): B => alg(F.map(go)(coalg(s)))
      return go(s0)
    }

  return { cata, ana, hylo }
}






// ---- HKT functor instance + fixpoint alias via factory ----
export const JsonFK: FunctorK1<'JsonF'> = { map: mapJsonF }

// If you don't already have these in scope, make sure you pasted earlier:
//   export type Fix1<F extends HK.Id1> = { un: HK.Kind1<F, Fix1<F>> }
//   export const makeRecursionK1 = <F extends HK.Id1>(F: FunctorK1<F>) => ({ cata, ana, hylo })

export type Json = Fix1<'JsonF'>

// Smart constructors (unchanged shape)
export const jNull  = (): Json => ({ un: { _tag: 'JNull' } })
export const jBool  = (b: boolean): Json => ({ un: { _tag: 'JBool', value: b } })
export const jNum   = (n: number): Json => ({ un: { _tag: 'JNum',  value: n } })
export const jStr   = (s: string): Json => ({ un: { _tag: 'JStr',  value: s } })
export const jArr   = (xs: ReadonlyArray<Json>): Json => ({ un: { _tag: 'JArr', items: xs } })
export const jObj   = (es: ReadonlyArray<readonly [string, Json]>): Json =>
  ({ un: { _tag: 'JObj', entries: es } })

// cata / ana / hylo derived from the HKT factory (remove your old ad-hoc versions)
export const { cata: cataJson, ana: anaJson, hylo: hyloJson } = makeRecursionK1(JsonFK)





// --------- Examples for JsonF ---------

// 1) Pretty-print via cata
export const ppJson: (j: Json) => string =
  cataJson<string>((f) => {
    switch (f._tag) {
      case 'JNull': return 'null'
      case 'JBool': return String(f.value)
      case 'JNum':  return String(f.value)
      case 'JStr':  return JSON.stringify(f.value)
      case 'JArr':  return `[${f.items.join(', ')}]`
      case 'JObj':  return `{${f.entries.map(([k,v]) => JSON.stringify(k)+': '+v).join(', ')}}`
    }
  })

// 2) Count total nodes via cata
export const sizeJson: (j: Json) => number =
  cataJson<number>((f) => {
    switch (f._tag) {
      case 'JNull':
      case 'JBool':
      case 'JNum':
      case 'JStr':  return 1
      case 'JArr':  return 1 + f.items.reduce((n, x) => n + x, 0)
      case 'JObj':  return 1 + f.entries.reduce((n, [,v]) => n + v, 0)
    }
  })

// 3) Unfold a simple range into a Json array via ana
export const rangeToJsonArr =
  (n: number): Json =>
    anaJson<number>((k) => k <= 0
      ? ({ _tag: 'JArr', items: [] })
      : ({ _tag: 'JArr', items: [k - 1] })
    )(n)

// 4) Fuse: “sum of numbers in unfolded range-json” via hylo (no intermediate JSON)
export const sumRangeViaHylo =
  (n: number): number =>
    hyloJson<number, number>(
      // coalgebra: unfold into a JSON-ish structure describing the list
      (k) => k <= 0
        ? ({ _tag: 'JArr', items: [] })
        : ({ _tag: 'JArr', items: [k - 1] }),
      // algebra: interpret that structure as a sum
      (f) => f._tag === 'JArr'
        ? f.items.reduce((acc, x) => acc + x, 0)
        : 0
    )(n)


// ====================================================================
// Reusable JSON Algebras - swap meaning without new recursion
// ====================================================================

// Alias for readability
type JsonAlgebra<B> = (fb: JsonF<B>) => B

// 1) Pretty-print JSON (no extra whitespace, deterministic object order as-is)
export const Alg_Json_pretty: JsonAlgebra<string> = (f) => {
  switch (f._tag) {
    case 'JNull': return 'null'
    case 'JBool': return String(f.value)
    case 'JNum':  return String(f.value)
    case 'JStr':  return JSON.stringify(f.value)
    case 'JArr':  return `[${f.items.join(', ')}]`
    case 'JObj':  return `{${f.entries.map(([k,v]) => JSON.stringify(k)+': '+v).join(', ')}}`
  }
}
export const prettyJson = cataJson(Alg_Json_pretty)

// 2) Size: count every node (scalars/arrays/objects)
export const Alg_Json_size: JsonAlgebra<number> = (f) => {
  switch (f._tag) {
    case 'JNull':
    case 'JBool':
    case 'JNum':
    case 'JStr':  return 1
    case 'JArr':  return 1 + f.items.reduce((n, x) => n + x, 0)
    case 'JObj':  return 1 + f.entries.reduce((n, [,v]) => n + v, 0)
  }
}
export const sizeJsonReusable = cataJson(Alg_Json_size)

// 3) Collect all string leaves
export const Alg_Json_collectStrings: JsonAlgebra<ReadonlyArray<string>> = (f) => {
  switch (f._tag) {
    case 'JStr':  return [f.value]
    case 'JArr':  return f.items.flat()
    case 'JObj':  return f.entries.flatMap(([,v]) => v)
    default:      return []
  }
}
export const collectStrings = cataJson(Alg_Json_collectStrings)

// 4) Sum all numbers (0 for others)
export const Alg_Json_sumNumbers: JsonAlgebra<number> = (f) => {
  switch (f._tag) {
    case 'JNum':  return f.value
    case 'JArr':  return f.items.reduce((s, n) => s + n, 0)
    case 'JObj':  return f.entries.reduce((s, [,n]) => s + n, 0)
    default:      return 0
  }
}
export const sumNumbersJson = cataJson(Alg_Json_sumNumbers)

// 5) Normalize: drop nulls in objects/arrays (transformation via cata)
//     (You can write any structural rewrite like this.)
export const Alg_Json_dropNulls: JsonAlgebra<Json> = (f) => {
  switch (f._tag) {
    case 'JNull': return jNull()
    case 'JBool': return jBool(f.value)
    case 'JNum':  return jNum(f.value)
    case 'JStr':  return jStr(f.value)
    case 'JArr':  return jArr(f.items.filter(j => j.un._tag !== 'JNull'))
    case 'JObj':  return jObj(f.entries.filter(([_, v]) => v.un._tag !== 'JNull'))
  }
}
export const dropNulls = cataJson(Alg_Json_dropNulls)

// ====================================================================
// One traversal, many meanings: product algebra
// ====================================================================
// Compute multiple results in one pass by pairing algebras. 
// Feed cataJson(product(…)) once; get both values.

// Product algebra: combine two Json algebras B and C into one that returns [B, C]
export const productJsonAlg =
  <B, C>(algB: JsonAlgebra<B>, algC: JsonAlgebra<C>): JsonAlgebra<readonly [B, C]> =>
  (fbc: JsonF<readonly [B, C]>) => {
    switch (fbc._tag) {
      case 'JNull': return [algB({ _tag:'JNull' }), algC({ _tag:'JNull' })] as const
      case 'JBool': return [algB({ _tag:'JBool', value: fbc.value }),
                            algC({ _tag:'JBool', value: fbc.value })] as const
      case 'JNum':  return [algB({ _tag:'JNum',  value: fbc.value }),
                            algC({ _tag:'JNum',  value: fbc.value })] as const
      case 'JStr':  return [algB({ _tag:'JStr',  value: fbc.value }),
                            algC({ _tag:'JStr',  value: fbc.value })] as const
      case 'JArr': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JArr', items: bs }), algC({ _tag:'JArr', items: cs })] as const
      }
      case 'JObj': {
        const bs = fbc.entries.map(([k, bc]) => [k, bc[0]] as const)
        const cs = fbc.entries.map(([k, bc]) => [k, bc[1]] as const)
        return [algB({ _tag:'JObj', entries: bs }), algC({ _tag:'JObj', entries: cs })] as const
      }
    }
  }

// Convenience: run two algebras in one traversal
export const bothJson =
  <B, C>(algB: JsonAlgebra<B>, algC: JsonAlgebra<C>) =>
  (j: Json): readonly [B, C] =>
    cataJson(productJsonAlg(algB, algC))(j)

// Example: pretty + size in one pass
export const prettyAndSize = bothJson(Alg_Json_pretty, Alg_Json_size)

// Hylo: "generate a range (as JSON array) then sum it" in one go (no intermediate tree)
// (sumRangeViaHylo is already defined above)


// --------------------------------------------------------------------
// Arithmetic Expr AST (pattern functor)
//   ExprF<A> where A marks recursive positions
// --------------------------------------------------------------------
export type ExprF<A> =
  | { _tag: 'Lit'; value: number }
  | { _tag: 'Add'; left: A; right: A }
  | { _tag: 'Mul'; left: A; right: A }

export const mapExprF =
  <A, B>(f: (a: A) => B) =>
  (fa: ExprF<A>): ExprF<B> => {
    switch (fa._tag) {
      case 'Lit': return fa
      case 'Add': return { _tag: 'Add', left: f(fa.left), right: f(fa.right) }
      case 'Mul': return { _tag: 'Mul', left: f(fa.left), right: f(fa.right) }
    }
  }

// ---- HKT functor instance + fixpoint + derived recursion for Expr ----
export const ExprFK: FunctorK1<'ExprF'> = { map: mapExprF }

export type Expr = Fix1<'ExprF'>

export const { cata: cataExpr, ana: anaExpr, hylo: hyloExpr } = makeRecursionK1(ExprFK)

// Smart constructors
export const lit = (n: number): Expr => ({ un: { _tag: 'Lit', value: n } })
export const add = (l: Expr, r: Expr): Expr => ({ un: { _tag: 'Add', left: l, right: r } })
export const mul = (l: Expr, r: Expr): Expr => ({ un: { _tag: 'Mul', left: l, right: r } })

// --------- Examples for ExprF ---------

// Evaluate expression via cata
export const evalExpr: (e: Expr) => number =
  cataExpr<number>((f) => {
    switch (f._tag) {
      case 'Lit': return f.value
      case 'Add': return f.left + f.right
      case 'Mul': return f.left * f.right
    }
  })
// evalExpr(add(lit(2), mul(lit(3), lit(4)))) // 14

// Pretty-print via cata
export const showExpr: (e: Expr) => string =
  cataExpr<string>((f) => {
    switch (f._tag) {
      case 'Lit': return String(f.value)
      case 'Add': return `(${f.left} + ${f.right})`
      case 'Mul': return `(${f.left} * ${f.right})`
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
  }
}
export const evalExprReusable = cataExpr(Alg_Expr_eval)

export const Alg_Expr_pretty: ExprAlg<string> = (f) => {
  switch (f._tag) {
    case 'Lit': return String(f.value)
    case 'Add': return `(${f.left} + ${f.right})`
    case 'Mul': return `(${f.left} * ${f.right})`
  }
}
export const showExprReusable = cataExpr(Alg_Expr_pretty)

// Collect all leaves
export const Alg_Expr_leaves: ExprAlg<ReadonlyArray<number>> = (f) => {
  switch (f._tag) {
    case 'Lit': return [f.value]
    case 'Add': return [...f.left, ...f.right]
    case 'Mul': return [...f.left, ...f.right]
  }
}
export const leavesExprReusable = cataExpr(Alg_Expr_leaves)

// ====================================================================
// Ana & Hylo quickies (generation + fused transform)
// ====================================================================

// Ana: build a full binary *Mul* tree of depth d (leaves are 1)
export const fullMulTreeReusable = anaExpr<number>(k =>
  k <= 0 ? ({ _tag: 'Lit', value: 1 })
         : ({ _tag: 'Mul', left: k - 1, right: k - 1 })
)

// ====================================================================
// Fused pipelines (hylo) for JsonF - Generate → Consume in one pass
// ====================================================================
//
// This section demonstrates the power of hylomorphism: composing coalgebras
// (generators) with algebras (consumers) to create deforested pipelines
// that never build intermediate data structures. This is especially useful
// for processing large or infinite data streams efficiently.

// Convenience alias for fused pipelines (avoiding conflict with existing JsonAlgebra)
export type JsonAlgFused<B> = (fb: JsonF<B>) => B

// Generic "fuse" helper: pick any coalgebra + algebra, get a deforested pipeline
export const fuseJson =
  <S, B>(coalg: (s: S) => JsonF<S>, alg: JsonAlgFused<B>) =>
  (s0: S): B =>
    hyloJson<S, B>(coalg, alg)(s0)

// ---------- Ready-to-use coalgebras ----------

// Unfold a *unary* list-like array: [n-1, then (n-2), …, 0]
export const coalgRangeUnary =
  (n: number): JsonF<number> =>
    n <= 0 ? ({ _tag: 'JArr', items: [] })
           : ({ _tag: 'JArr', items: [n - 1] })

// Unfold a *full binary* tree of given depth (leaves are 1s)
export const coalgFullBinary =
  (depth: number): JsonF<number> =>
    depth <= 0 ? ({ _tag: 'JNum', value: 1 })
               : ({ _tag: 'JArr', items: [depth - 1, depth - 1] })

// ---------- Handy algebras you can swap in ----------

// Pretty (compact) - fused pipeline version
export const Alg_Json_pretty_fused: JsonAlgFused<string> = (f) => {
  switch (f._tag) {
    case 'JNull': return 'null'
    case 'JBool': return String(f.value)
    case 'JNum':  return String(f.value)
    case 'JStr':  return JSON.stringify(f.value)
    case 'JArr':  return `[${f.items.join(', ')}]`
    case 'JObj':  return `{${f.entries.map(([k,v]) => JSON.stringify(k)+': '+v).join(', ')}}`
  }
}

// Sum numbers (0 elsewhere) - fused pipeline version
export const Alg_Json_sum_fused: JsonAlgFused<number> = (f) => {
  switch (f._tag) {
    case 'JNum':  return f.value
    case 'JArr':  return f.items.reduce((s, n) => s + n, 0)
    case 'JObj':  return f.entries.reduce((s, [,n]) => s + n, 0)
    default:      return 0
  }
}

// Count nodes - fused pipeline version
export const Alg_Json_size_fused: JsonAlgFused<number> = (f) => {
  switch (f._tag) {
    case 'JNull':
    case 'JBool':
    case 'JNum':
    case 'JStr':  return 1
    case 'JArr':  return 1 + f.items.reduce((n, x) => n + x, 0)
    case 'JObj':  return 1 + f.entries.reduce((n, [,v]) => n + v, 0)
  }
}

// Stats record, combined in one pass (sum + count + max + height)
export type JStats = { sum: number; count: number; max: number; height: number }
export const Alg_Json_stats: JsonAlgFused<JStats> = (f) => {
  switch (f._tag) {
    case 'JNum':  return { sum: f.value, count: 1, max: f.value, height: 1 }
    case 'JArr': {
      if (f.items.length === 0) return { sum: 0, count: 1, max: -Infinity, height: 1 }
      const xs = f.items
      return {
        sum:    xs.reduce((a, x) => a + x.sum, 0),
        count:  1 + xs.reduce((a, x) => a + x.count, 0),
        max:    xs.reduce((m, x) => Math.max(m, x.max), -Infinity),
        height: 1 + Math.max(...xs.map(x => x.height)),
      }
    }
    case 'JObj': {
      const vs = f.entries.map(([,v]) => v)
      return {
        sum:    vs.reduce((a, x) => a + x.sum, 0),
        count:  1 + vs.reduce((a, x) => a + x.count, 0),
        max:    vs.reduce((m, x) => Math.max(m, x.max), -Infinity),
        height: 1 + Math.max(0, ...vs.map(x => x.height)),
      }
    }
    default: return { sum: 0, count: 1, max: -Infinity, height: 1 }
  }
}

// ---------- Fused pipelines you can call directly ----------

// 1) Range → (sum)   (unary-array unfold; no intermediate Json constructed)
export const sumRange_FUSED = (n: number): number =>
  fuseJson(coalgRangeUnary, Alg_Json_sum_fused)(n)

// 2) Range → (pretty, in one pass)
//    (Strictly illustrative: pretty-printing a unary array is a bit silly,
//     but shows "generate → pretty" fused.)
export const prettyRange_FUSED = (n: number): string =>
  fuseJson(coalgRangeUnary, Alg_Json_pretty_fused)(n)

// 3) Full binary(depth) → stats (sum/count/max/height) in one pass
export const statsFullBinary_FUSED = (depth: number): JStats =>
  fuseJson(coalgFullBinary, Alg_Json_stats)(depth)

// 4) Full binary(depth) → *both* pretty and size in one pass via a product algebra
//    If you already defined a product algebra elsewhere, feel free to reuse it;
//    this local version avoids naming collisions.
export const productJsonAlg2 =
  <B, C>(algB: JsonAlgFused<B>, algC: JsonAlgFused<C>): JsonAlgFused<readonly [B, C]> =>
  (fbc: JsonF<readonly [B, C]>) => {
    switch (fbc._tag) {
      case 'JNull': return [algB({ _tag:'JNull' }), algC({ _tag:'JNull' })] as const
      case 'JBool': return [algB({ _tag:'JBool', value: fbc.value }),
                            algC({ _tag:'JBool', value: fbc.value })] as const
      case 'JNum':  return [algB({ _tag:'JNum',  value: fbc.value }),
                            algC({ _tag:'JNum',  value: fbc.value })] as const
      case 'JStr':  return [algB({ _tag:'JStr',  value: fbc.value }),
                            algC({ _tag:'JStr',  value: fbc.value })] as const
      case 'JArr': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JArr', items: bs }), algC({ _tag:'JArr', items: cs })] as const
      }
      case 'JObj': {
        const bs = fbc.entries.map(([k, bc]) => [k, bc[0]] as const)
        const cs = fbc.entries.map(([k, bc]) => [k, bc[1]] as const)
        return [algB({ _tag:'JObj', entries: bs }), algC({ _tag:'JObj', entries: cs })] as const
      }
    }
  }

export const prettyAndSize_FUSED =
  (depth: number): readonly [string, number] =>
    fuseJson(coalgFullBinary, productJsonAlg2(Alg_Json_pretty_fused, Alg_Json_size_fused))(depth)


// ====================================================================
// makeRecursion — generic cata/ana/hylo for any base functor
// ====================================================================
//
// How to use (pattern):
//   1) Define your base functor F<A> (tagged union where recursive
//      positions are the type parameter A) and its functor action `mapF`.
//   2) Define the fixpoint type: `type T = { un: F<T> }`.
//   3) Call `makeRecursion<T>(mapF)` to get { cata, ana, hylo } specialized
//      to your functor.
//

// =====================================
// HKT-based recursion schemes (arity-1)
// =====================================













/**
 * Closures (primer)
 * -----------------
 * A closure is a function that *captures* variables from its lexical scope.
 * In JS/TS this is built-in: whenever you return a function, it "remembers"
 * the environment it was created in. That makes encapsulated state, memoizers,
 * once-guards, and factories trivial to write in a functional style.
 *
 * In short: if you write `(x) => () => x`, that inner function is a closure
 * over `x`. You already use closures everywhere in your library (e.g. `map`,
 * `chain`, lenses, Do-builders), because you return functions that reference
 * outer variables.
 */
// once: run f at most once, cache the result
export const once =
  <A extends any[], R>(f: (...a: A) => R) => {
    let done = false, value: R
    return (...a: A): R => {
      if (!done) { value = f(...a); done = true }
      return value!
    }
  }

// memoize (unary, keyable args). Great for pure functions.
export const memoize1 =
  <K extends PropertyKey, V>(f: (k: K) => V) => {
    const cache = new Map<K, V>()
    return (k: K): V => {
      if (cache.has(k)) return cache.get(k)!
      const v = f(k); cache.set(k, v); return v
    }
  }

// makeCounter: classic closure demo (private state)
export const makeCounter = (start = 0) => {
  let n = start
  return {
    next: () => (++n),
    current: () => n,
    reset: (to = 0) => { n = to }
  }
}



// ====================================================================
// Streaming JSON fold — event-driven (no full tree), O(depth) memory
// ====================================================================
//
// Idea
//  • You already have: JsonF algebra  F<B> -> B  (cata).
//  • For streaming, we can't collect "all children" up front.
//  • So we use an incremental algebra with accumulators:
//
//    type JsonStreamAlg<B, ArrAcc, ObjAcc> = {
//      JNull: () => B
//      JBool: (b: boolean) => B
//      JNum : (n: number)  => B
//      JStr : (s: string)  => B
//      Arr  : { begin: () => ArrAcc
//               step : (acc: ArrAcc, child: B) => ArrAcc
//               done : (acc: ArrAcc) => B }
//      Obj  : { begin: () => ObjAcc
//               step : (acc: ObjAcc, kv: readonly [string, B]) => ObjAcc
//               done : (acc: ObjAcc) => B }
//    }
//
//  • We feed a stream of JsonEvent into a sink { push, done }.
//  • "push" updates a frame stack using closures over the algebra.
//  • "done" returns Result<Error, B> (root value or an error).
//
// Wiring
//  • You can derive this streaming algebra automatically from your
//    ordinary Json algebra F<B> -> B (we use ReadonlyArray accumulators).
//  • Or handcraft tiny accumulators (e.g., numbers for sums) for true O(depth).
//

// ----- Event model (SAX-like) -----
export type JsonEvent =
  | { _tag: 'StartArr' }
  | { _tag: 'EndArr' }
  | { _tag: 'StartObj' }
  | { _tag: 'EndObj' }
  | { _tag: 'Key'; key: string }
  | { _tag: 'Null' }
  | { _tag: 'Bool'; value: boolean }
  | { _tag: 'Num';  value: number }
  | { _tag: 'Str';  value: string }

// Constructors (ergonomic)
export const ev = {
  startArr: (): JsonEvent => ({ _tag: 'StartArr' }),
  endArr  : (): JsonEvent => ({ _tag: 'EndArr' }),
  startObj: (): JsonEvent => ({ _tag: 'StartObj' }),
  endObj  : (): JsonEvent => ({ _tag: 'EndObj' }),
  key     : (k: string): JsonEvent => ({ _tag: 'Key', key: k }),
  null    : (): JsonEvent => ({ _tag: 'Null' }),
  bool    : (b: boolean): JsonEvent => ({ _tag: 'Bool', value: b }),
  num     : (n: number): JsonEvent => ({ _tag: 'Num', value: n }),
  str     : (s: string): JsonEvent => ({ _tag: 'Str', value: s }),
}

// ----- Streaming algebra -----
export type JsonStreamAlg<B, ArrAcc, ObjAcc> = {
  JNull: () => B
  JBool: (b: boolean) => B
  JNum : (n: number)  => B
  JStr : (s: string)  => B
  Arr  : {
    begin: () => ArrAcc
    step : (acc: ArrAcc, child: B) => ArrAcc
    done : (acc: ArrAcc) => B
  }
  Obj  : {
    begin: () => ObjAcc
    step : (acc: ObjAcc, kv: readonly [string, B]) => ObjAcc
    done : (acc: ObjAcc) => B
  }
}

// Derive a streaming algebra from a plain Json algebra (uses arrays).
// This is the "bridge" from your cata algebra to streaming.
export type JsonAlg<B> = {
  JNull: () => B
  JBool: (b: boolean) => B
  JNum : (n: number)  => B
  JStr : (s: string)  => B
  JArr : (items: ReadonlyArray<B>) => B
  JObj : (entries: ReadonlyArray<readonly [string, B]>) => B
}

export const toStreamAlg = <B>(alg: JsonAlg<B>): JsonStreamAlg<B, B[], Array<readonly [string, B]>> => ({
  JNull: alg.JNull,
  JBool: alg.JBool,
  JNum : alg.JNum,
  JStr : alg.JStr,
  Arr: {
    begin: () => [],
    step : (acc, child) => (acc.push(child), acc),
    done : (acc) => alg.JArr(acc),
  },
  Obj: {
    begin: () => [],
    step : (acc, kv) => (acc.push(kv), acc),
    done : (acc) => alg.JObj(acc),
  }
})

// ----- The streaming sink (closure + stack machine) -----
type Frame<B, AA, OA> =
  | { tag: 'arr'; acc: AA }
  | { tag: 'obj'; acc: OA; expect: 'key' | 'value'; lastKey?: string }

export const makeJsonStreamFolder = <B, AA, OA>(ALG: JsonStreamAlg<B, AA, OA>) => {
  let stack: Array<Frame<B, AA, OA>> = []
  let root: Option<B> = None
  let finished = false

  const emitValue = (b: B): Result<Error, void> => {
    if (stack.length === 0) {
      if (isSome(root)) return Err(new Error('Multiple roots'))
      root = Some(b)
      return Ok(undefined)
    }
    const top = stack[stack.length - 1]!
    if (top.tag === 'arr') {
      top.acc = ALG.Arr.step(top.acc, b)
      return Ok(undefined)
    }
    // object expects a value paired with lastKey
    if (top.expect !== 'value' || top.lastKey == null) {
      return Err(new Error('Object value without a key'))
    }
    top.acc   = ALG.Obj.step(top.acc, [top.lastKey, b] as const)
    top.lastKey = undefined as any
    top.expect  = 'key'
    return Ok(undefined)
  }

  const push = (e: JsonEvent): Result<Error, void> => {
    if (finished) return Err(new Error('Stream already finished'))

    switch (e._tag) {
      case 'StartArr':
        stack.push({ tag: 'arr', acc: ALG.Arr.begin() })
        return Ok(undefined)

      case 'EndArr': {
        const top = stack.pop()
        if (!top || top.tag !== 'arr') return Err(new Error('Mismatched EndArr'))
        return emitValue(ALG.Arr.done(top.acc))
      }

      case 'StartObj':
        stack.push({ tag: 'obj', acc: ALG.Obj.begin(), expect: 'key', lastKey: undefined as any })
        return Ok(undefined)

      case 'EndObj': {
        const top = stack.pop()
        if (!top || top.tag !== 'obj' || top.expect === 'value') {
          return Err(new Error('Mismatched EndObj or dangling key'))
        }
        return emitValue(ALG.Obj.done(top.acc))
      }

      case 'Key': {
        const top = stack[stack.length - 1]
        if (!top || top.tag !== 'obj' || top.expect !== 'key') {
          return Err(new Error('Key outside object or not expected'))
        }
        top.lastKey = e.key
        top.expect  = 'value'
        return Ok(undefined)
      }

      case 'Null': return emitValue(ALG.JNull())
      case 'Bool': return emitValue(ALG.JBool(e.value))
      case 'Num' : return emitValue(ALG.JNum(e.value))
      case 'Str' : return emitValue(ALG.JStr(e.value))
    }
  }

  const done = (): Result<Error, B> => {
    if (finished) return Err(new Error('Stream already finished'))
    finished = true
    if (stack.length !== 0) return Err(new Error('Unclosed arrays/objects'))
    if (!isSome(root))     return Err(new Error('Empty stream (no root)'))
    return Ok(root.value)
  }

  return {
    push,          // (e) => Result<Error, void>
    done,          // () => Result<Error, B>
    isDone: () => finished,
    depth: () => stack.length,
  }
}

// --- Example: count all nodes (each value, array, and object counts as 1)
const CountAlg: JsonStreamAlg<number, number, number> = {
  JNull: () => 1,
  JBool: () => 1,
  JNum : () => 1,
  JStr : () => 1,
  Arr  : {
    begin: () => 1,                           // count the array node itself
    step : (acc, child) => acc + child,       // add each child count
    done : (acc) => acc
  },
  Obj  : {
    begin: () => 1,                           // count the object node itself
    step : (acc, [, child]) => acc + child,   // ignore key; add child
    done : (acc) => acc
  }
}

// --- Example: sum of all numbers (others contribute 0)
const SumNumbersAlg: JsonStreamAlg<number, number, number> = {
  JNull: () => 0,
  JBool: () => 0,
  JNum : (n) => n,
  JStr : () => 0,
  Arr  : { begin: () => 0, step: (acc, c) => acc + c, done: (acc) => acc },
  Obj  : { begin: () => 0, step: (acc, [,c]) => acc + c, done: (acc) => acc },
}

// Build a sink that counts nodes as it streams
const counter = makeJsonStreamFolder(CountAlg)

// Imagine these events arrive chunk-by-chunk:
void counter.push(ev.startObj())
void counter.push(ev.key('users'))
void counter.push(ev.startArr())
  void counter.push(ev.startObj())
    void counter.push(ev.key('id'));    void counter.push(ev.num(1))
    void counter.push(ev.key('name'));  void counter.push(ev.str('Ada'))
  void counter.push(ev.endObj())
void counter.push(ev.endArr())
void counter.push(ev.endObj())

const resultCount = counter.done() // Result<Error, number>








// =======================
// Pattern matching (small, exhaustive by tag)
// =======================
export type Matcher<T extends { _tag: string }, R> = {
  [K in T["_tag"]]: (t: Extract<T, { _tag: K }>) => R
} & { _: (t: never) => R }

export const match = <T extends { _tag: string }>(t: T) => <R>(m: Matcher<T, R>): R => {
  // @ts-ignore index by runtime tag
  const f = m[t._tag] ?? m._
  return f(t as any)
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
  for (const [k, v] of pairs) (out as any)[k] = v
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
  T extends Record<PropertyKey, any>,
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
  T extends Record<PropertyKey, any>,
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
      ;(out as any)[nk] = nv
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
export function filterValues<T extends Record<PropertyKey, any>>(
  obj: T,
  pred: <K extends keyof T>(value: T[K], key: K) => boolean
): Readonly<Partial<T>>

export function filterValues<T extends Record<PropertyKey, any>, V>(
  obj: T,
  pred: <K extends keyof T>(value: T[K], key: K) => value is Extract<T[K], V>
): Readonly<Partial<{ [K in keyof T]: Extract<T[K], V> }>>

export function filterValues<T extends Record<PropertyKey, any>>(
  obj: T,
  pred: (value: T[keyof T], key: keyof T) => boolean
): Readonly<Partial<T>> {
  const out: Partial<T> = {}
  for (const k in obj) {
    if (hasOwn(obj, k)) {
      const key = k as keyof T
      const v = obj[key]
      if (pred(v, key)) (out as any)[key] = v
    }
  }
  return out
}

/** filterKeys — keep entries whose key satisfies `pred` */
export const filterKeys = <T extends Record<PropertyKey, any>>(
  obj: T,
  pred: (key: keyof T) => boolean
): Readonly<Partial<T>> => {
  const out: Partial<T> = {}
  for (const k in obj) {
    if (hasOwn(obj, k) && pred(k as keyof T)) {
      ;(out as any)[k] = (obj as any)[k]
    }
  }
  return out
}

/** pick — keep only `K` keys (typed) */
export const pick = <T, K extends keyof T>(
  obj: T,
  ks: ReadonlyArray<K>
): Readonly<Pick<T, K>> => {
  const out = {} as Pick<T, K>
  const set = new Set<keyof T>(ks as ReadonlyArray<keyof T>)
  for (const k in obj as any) {
    if (hasOwn(obj as any, k) && set.has(k as keyof T)) {
      (out as any)[k] = (obj as any)[k]
    }
  }
  return out
}

/** omit — drop `K` keys (typed) */
export const omit = <T, K extends keyof T>(
  obj: T,
  ks: ReadonlyArray<K>
): Readonly<Omit<T, K>> => {
  const out = {} as Omit<T, K>
  const drop = new Set<keyof T>(ks as ReadonlyArray<keyof T>)
  for (const k in obj as any) {
    if (hasOwn(obj as any, k) && !drop.has(k as keyof T)) {
      (out as any)[k] = (obj as any)[k]
    }
  }
  return out
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
          return [{ ...(obj as any), [k]: a } as T & { readonly [P in K]: A }, s2, M.concat(w1, w2)] as const
        }),

      let: <K extends string, A>(k: K, a: A) =>
        make<T & { readonly [P in K]: A }>((r) => async (s0) => {
          const [obj, s1, w1] = await acc(r)(s0)
          return [{ ...(obj as any), [k]: a } as T & { readonly [P in K]: A }, s1, w1] as const
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
  T extends (...args: any) => any ? T
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
  new Proxy(m as any, {
    get(target, prop, receiver) {
      if (prop === 'set' || prop === 'clear' || prop === 'delete') {
        return () => { throw new Error('ReadonlyMap: mutation disabled') }
      }
      return Reflect.get(target, prop, receiver)
    }
  }) as ReadonlyMap<K, V>

const _readonlySetProxy = <A>(s: Set<A>): ReadonlySet<A> =>
  new Proxy(s as any, {
    get(target, prop, receiver) {
      if (prop === 'add' || prop === 'clear' || prop === 'delete') {
        return () => { throw new Error('ReadonlySet: mutation disabled') }
      }
      return Reflect.get(target, prop, receiver)
    }
  }) as ReadonlySet<A>

// ----- deepFreeze runtime -----
export const deepFreeze = <T>(input: T): DeepReadonly<T> => {
  // primitives & functions
  if (input === null || typeof input !== 'object') return input as any
  if (typeof input === 'function') return input as any

  // Arrays
  if (Array.isArray(input)) {
    const frozenItems = input.map(deepFreeze)
    return Object.freeze(frozenItems) as any
  }

  // Map
  if (input instanceof Map) {
    const m = new Map<any, any>()
    for (const [k, v] of input) m.set(deepFreeze(k), deepFreeze(v))
    // Option A: Proxy to block mutations at runtime
    return _readonlyMapProxy(m) as any
    // Option B (lighter): return m as ReadonlyMap without proxy
    // return m as any as ReadonlyMap<any, any>
  }

  // Set
  if (input instanceof Set) {
    const s = new Set<any>()
    for (const v of input) s.add(deepFreeze(v))
    return _readonlySetProxy(s) as any
    // Or without proxy:
    // return s as any as ReadonlySet<any>
  }

  // Plain object
  const obj = input as Record<PropertyKey, unknown>
  // Freeze each own property first
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k]
    ;(obj as any)[k] = deepFreeze(v)
  }
  return Object.freeze(obj) as any
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
  isOk(ra) ? Err(ra.value as A) : Ok(ra.error as E)

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
  async () => {
    const ra = await tra()
    return isOk(ra) ? Err(ra.value as A) : Ok(ra.error as E)
  }

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
  async (r: R) => {
    const ra = await rtr(r)
    return isOk(ra) ? Err(ra.value as A) : Ok(ra.error as E)
  }

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
 * tiny-fp — a compact, practical FP toolkit for TypeScript
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
// Async: Task & TaskResult
// =======================
export type Task<A> = () => Promise<A>

export const Task = {
  of: <A>(a: A): Task<A> => () => Promise.resolve(a),
  delay: (ms: number) => <A>(a: A): Task<A> => () => new Promise(res => setTimeout(() => res(a), ms)),
  map: <A, B>(f: (a: A) => B) => (ta: Task<A>): Task<B> => () => ta().then(f),
  chain: <A, B>(f: (a: A) => Task<B>) => (ta: Task<A>): Task<B> => () => ta().then(a => f(a)()),
  ap: <A, B>(tfab: Task<(a: A) => B>) => (ta: Task<A>): Task<B> => () => Promise.all([tfab(), ta()]).then(([fab, a]) => fab(a)),
  tryCatch: <A>(thunk: Lazy<Promise<A>>): Task<A> => () => thunk()
}

export const fromPromise = <A>(thunk: Lazy<Promise<A>>): Task<A> => () => thunk()
export const sequenceT = <A>(ts: ReadonlyArray<Task<A>>): Task<ReadonlyArray<A>> => () => Promise.all(ts.map(t => t()))
export const traverseT = <A, B>(as: ReadonlyArray<A>, f: (a: A) => Task<B>): Task<ReadonlyArray<B>> => sequenceT(as.map(f))

// Result in Task (right-biased)
export type TaskResult<E, A> = Task<Result<E, A>>

export const TaskResult = {
  of: <E = never, A = never>(a: A): TaskResult<E, A> => Task.of(Ok(a)),
  fromResult: <E, A>(r: Result<E, A>): TaskResult<E, A> => Task.of(r),
  map: <E, A, B>(f: (a: A) => B) => (tra: TaskResult<E, A>): TaskResult<E, B> => () => tra().then(mapR<E, A, B>(f)),
  mapErr: <E, F, A>(f: (e: E) => F) => (tra: TaskResult<E, A>): TaskResult<F, A> => () => tra().then(mapErr<E, F, A>(f)),
  chain: <E, A, F, B>(f: (a: A) => TaskResult<F, B>) => (tra: TaskResult<E, A>): TaskResult<E | F, B> => () => tra().then(r => isOk(r) ? f(r.value)() : Promise.resolve(r as any)),
  getOrElse: <E, A>(onErr: (e: E) => A) => (tra: TaskResult<E, A>): Task<A> => () => tra().then(getOrElseR<E, A>(onErr)),
  tryCatch: <A>(thunk: Lazy<Promise<A>>, onThrow: (u: unknown) => Error = (u) => (u instanceof Error ? u : new Error(String(u)))): TaskResult<Error, A> =>
    () => thunk().then(Ok).catch((u) => Ok(Err(onThrow(u)) as any) as any).then((r) => (isErr(r as any) ? (r as any) : r)),
}


// Applicative helpers for TaskResult

export const apTR =
  <E, A, B>(tfab: TaskResult<E, (a: A) => B>) =>
  (tfa: TaskResult<E, A>): TaskResult<E, B> =>
  async () => {
    const [rfab, rfa] = await Promise.all([tfab(), tfa()])
    return isOk(rfab) && isOk(rfa)
      ? Ok(rfab.value(rfa.value))
      : (isErr(rfab) ? rfab : (rfa as any))
  }

// liftA2: combine two independent TRs in parallel via a curried function
export const liftA2TR =
  <E, A, B, C>(f: (a: A) => (b: B) => C) =>
  (ta: TaskResult<E, A>) =>
  (tb: TaskResult<E, B>): TaskResult<E, C> =>
    apTR<E, B, C>(TaskResult.map<E, A, (b: B) => C>(f)(ta))(tb)

// zipWith: non-curried convenience
export const zipWithTR =
  <E, A, B, C>(f: (a: A, b: B) => C) =>
  (ta: TaskResult<E, A>) =>
  (tb: TaskResult<E, B>): TaskResult<E, C> =>
    liftA2TR<E, A, B, C>((a) => (b) => f(a, b))(ta)(tb)

// product: pair two TRs
export const productTR =
  <E, A, B>(ta: TaskResult<E, A>) =>
  (tb: TaskResult<E, B>): TaskResult<E, readonly [A, B]> =>
    zipWithTR<E, A, B, readonly [A, B]>((a, b) => [a, b] as const)(ta)(tb)




export const sequenceTR = <E, A>(ts: ReadonlyArray<TaskResult<E, A>>): TaskResult<E, ReadonlyArray<A>> => async () => {
  const rs = await Promise.all(ts.map(t => t()))
  const firstErr = rs.find(isErr as any) as Err<E> | undefined
  if (firstErr) return firstErr
  return Ok(rs.map(r => (r as Ok<A>).value))
}

export const traverseTR = <E, A, B>(as: ReadonlyArray<A>, f: (a: A) => TaskResult<E, B>): TaskResult<E, ReadonlyArray<B>> => sequenceTR(as.map(f))



// ===========================
// Do-notation for TaskResult
// ===========================
//
// Goal
//  Same user experience as DoR, but for async Result:
//    TaskResult<E, A> = () => Promise<Result<E, A>>
//
// Behavior
//  - Steps execute SEQUENTIALLY (bind order) to preserve dependency order
//  - Short-circuits on the first Err
//  - Types accumulate across binds
//
// Usage
//  const program = DoTR<string>()
//    .bind('user', getUserTR(id))
//    .bind('posts', getPostsTR(id))
//    .let('count', 42)
//    .map(({ user, posts, count }) => ({ ... }))
//    .done()

export type DoTaskResultBuilder<E, T extends _ObjectLike> = {
  bind: <K extends string, A>(
    k: K,
    tra: TaskResult<E, A>
  ) => DoTaskResultBuilder<E, T & { readonly [P in K]: A }>

  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoTaskResultBuilder<E, T & { readonly [P in K]: A }>

  map:  <B>(f: (t: T) => B) => TaskResult<E, B>
  done: () => TaskResult<E, T>
}

export const DoTR = <E = never>() => {
  const start: TaskResult<E, {}> = TaskResult.of<E, {}>({})
  const make = <T extends _ObjectLike>(acc: TaskResult<E, T>): DoTaskResultBuilder<E, T> => ({
    bind: (k, tra) => make(async () => {
      const rObj = await acc()
      if (isErr(rObj)) return rObj as any
      const rVal = await tra()
      return isOk(rVal)
        ? Ok({ ...(rObj.value as any), [k]: rVal.value } as T)
        : (rVal as any)
    }),
    let: (k, a) => make(async () => {
      const rObj = await acc()
      return isOk(rObj)
        ? Ok({ ...(rObj.value as any), [k]: a } as T)
        : (rObj as any)
    }),
    map: (f) => async () => {
      const rObj = await acc()
      return mapR<E, T, any>(f)(rObj)
    },
    done: () => acc,
  })
  return make(start)
}









// Helpers to unwrap TaskResult payloads
type UnwrapTR<T> = T extends TaskResult<infer _E, infer A> ? A : never

// ========== Arrays ==========

// Parallel: start all tasks at once, wait for all; return first Err if any.
export const sequenceArrayTRPar = <E, A>(
  ts: ReadonlyArray<TaskResult<E, A>>
): TaskResult<E, ReadonlyArray<A>> => async () => {
  const rs = await Promise.all(ts.map(t => t()))
  const firstErr = rs.find(isErr as any) as Err<E> | undefined
  if (firstErr) return firstErr
  return Ok(rs.map(r => (r as Ok<A>).value))
}

export const traverseArrayTRPar = <E, A, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => TaskResult<E, B>
): TaskResult<E, ReadonlyArray<B>> =>
  sequenceArrayTRPar(as.map(f))

// Sequential: run tasks left→right; short-circuit on first Err.
export const sequenceArrayTRSeq = <E, A>(
  ts: ReadonlyArray<TaskResult<E, A>>
): TaskResult<E, ReadonlyArray<A>> => async () => {
  const out: A[] = []
  for (const t of ts) {
    const r = await t()
    if (isErr(r)) return r
    out.push((r as Ok<A>).value)
  }
  return Ok(out)
}

export const traverseArrayTRSeq = <E, A, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => TaskResult<E, B>
): TaskResult<E, ReadonlyArray<B>> => async () => {
  const out: B[] = []
  for (let i = 0; i < as.length; i++) {
    const r = await f(as[i]!, i)()
    if (isErr(r)) return r
    out.push((r as Ok<B>).value)
  }
  return Ok(out)
}

// ========== Structs (objects) ==========

// Parallel over object of TaskResults → TaskResult of object
export const sequenceStructTRPar = <
  E,
  S extends Record<string, TaskResult<E, any>>
>(s: S): TaskResult<E, { readonly [K in keyof S]: UnwrapTR<S[K]> }> => async () => {
  const ks = Object.keys(s) as Array<keyof S>
  const rs = await Promise.all(ks.map(k => s[k]!()))
  const firstErr = rs.find(isErr as any) as Err<E> | undefined
  if (firstErr) return firstErr
  const out = {} as { [K in keyof S]: UnwrapTR<S[K]> }
  ks.forEach((k, i) => { (out as any)[k] = (rs[i] as Ok<any>).value })
  return Ok(out as { readonly [K in keyof S]: UnwrapTR<S[K]> })
}

// Sequential over object (deterministic order by key array you pass in)
export const sequenceStructTRSeq = <
  E,
  S extends Record<string, TaskResult<E, any>>
>(s: S, order?: ReadonlyArray<keyof S>): TaskResult<E, { readonly [K in keyof S]: UnwrapTR<S[K]> }> => async () => {
  const ks = (order ?? (Object.keys(s) as Array<keyof S>))
  const out = {} as { [K in keyof S]: UnwrapTR<S[K]> }
  for (const k of ks) {
    const r = await s[k]!()
    if (isErr(r)) return r as any
    ;(out as any)[k] = (r as Ok<any>).value
  }
  return Ok(out as { readonly [K in keyof S]: UnwrapTR<S[K]> })
}







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
    mapO(a => sa.set(ab.set(b)(a))(s)),
    getOrElseO(() => s)
  )
})

export const lensToOptional = <S, A>(ln: Lens<S, A>): Optional<S, A> => optional(
  (s) => Some(ln.get(s)),
  (a, s) => ln.set(a)(s)
)

export const prismToOptional = <S, A>(pr: Prism<S, A>): Optional<S, A> => optional(
  pr.getOption,
  (a, s) => pr.reverseGet(a)
)

export const optionalProp = <S>() => <K extends keyof S>(k: K): Optional<S, NonNullable<S[K]>> => optional(
  (s: S) => fromNullable(s[k] as any),
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

export const traversalPropArray = <S>() => <K extends keyof S, A = any>(k: K & (S[K] extends ReadonlyArray<infer T> ? K : never)):
  Traversal<S, S[K] extends ReadonlyArray<infer T> ? T : never> => traversal(
    (f) => (s: S) => ({ ...s, [k]: (s[k] as any as ReadonlyArray<any>).map(f) }) as S
)

export const optionalToTraversal = <S, A>(opt: Optional<S, A>): Traversal<S, A> => traversal(
  (f) => (s) => pipe(
    opt.getOption(s),
    mapO(a => opt.set(f(a))(s)),
    getOrElseO(() => s)
  )
)

export const overT = <S, A>(tv: Traversal<S, A>, f: (a: A) => A) => tv.modify(f)







// =======================
// Reader
// =======================
export type Reader<R, A> = (r: R) => A

export const Reader = {
  of:
    <R = unknown, A = never>(a: A): Reader<R, A> =>
    (_: R) =>
      a,

  ask: <R>(): Reader<R, R> => (r: R) => r,

  asks:
    <R, A>(f: (r: R) => A): Reader<R, A> =>
    (r) =>
      f(r),

  map:
    <A, B>(f: (a: A) => B) =>
    <R>(ra: Reader<R, A>): Reader<R, B> =>
    (r) =>
      f(ra(r)),

  chain:
    <A, B, R>(f: (a: A) => Reader<R, B>) =>
    (ra: Reader<R, A>): Reader<R, B> =>
    (r) =>
      f(ra(r))(r),

  ap:
    <R, A, B>(rfab: Reader<R, (a: A) => B>) =>
    (rfa: Reader<R, A>): Reader<R, B> =>
    (r) =>
      rfab(r)(rfa(r)),

  local:
    <R, Q>(f: (q: Q) => R) =>
    <A>(rq: Reader<R, A>): Reader<Q, A> =>
    (q) =>
      rq(f(q)),
}

// helpers
export const runReader = <R, A>(ra: Reader<R, A>, r: R): A => ra(r)




// =======================
// ReaderTask
// =======================
export type ReaderTask<R, A> = (r: R) => Promise<A>

export const ReaderTask = {
  of:
    <R = unknown, A = never>(a: A): ReaderTask<R, A> =>
    async (_: R) =>
      a,

  fromTask:
    <A>(ta: Task<A>): ReaderTask<unknown, A> =>
    async () =>
      ta(),

  fromReader:
    <R, A>(ra: Reader<R, A>): ReaderTask<R, A> =>
    async (r) =>
      ra(r),

  ask: <R>(): ReaderTask<R, R> => async (r) => r,

  asks:
    <R, A>(f: (r: R) => A): ReaderTask<R, A> =>
    async (r) =>
      f(r),

  map:
    <A, B>(f: (a: A) => B) =>
    <R>(rta: ReaderTask<R, A>): ReaderTask<R, B> =>
    async (r) =>
      f(await rta(r)),

  chain:
    <A, B, R>(f: (a: A) => ReaderTask<R, B>) =>
    (rta: ReaderTask<R, A>): ReaderTask<R, B> =>
    async (r) => {
      const a = await rta(r)
      return f(a)(r)
    },

  ap:
    <R, A, B>(rtfab: ReaderTask<R, (a: A) => B>) =>
    (rta: ReaderTask<R, A>): ReaderTask<R, B> =>
    async (r) => {
      const [fab, a] = await Promise.all([rtfab(r), rta(r)])
      return fab(a)
    },

  local:
    <R, Q>(f: (q: Q) => R) =>
    <A>(rtq: ReaderTask<R, A>): ReaderTask<Q, A> =>
    async (q) =>
      rtq(f(q)),
}

// Interop with TaskResult (optional, since you already have it)
export const fromTaskResult =
  <R, E, A>(tra: TaskResult<E, A>): ReaderTask<R, Result<E, A>> =>
  async () =>
    tra()

export const ReaderTaskResult = {
  map:
    <R, E, A, B>(f: (a: A) => B) =>
    (rtra: ReaderTask<R, Result<E, A>>): ReaderTask<R, Result<E, B>> =>
    async (r: R) =>
      mapR<E, A, B>(f)(await rtra(r)),

  chain:
    <R, E, A, F, B>(f: (a: A) => ReaderTask<R, Result<F, B>>) =>
    (rtra: ReaderTask<R, Result<E, A>>): ReaderTask<R, Result<E | F, B>> =>
    async (r: R) => {
      const ra = await rtra(r)
      return isOk(ra) ? f(ra.value)(r) : (ra as any)
    },
}

// Gen for ReaderTaskResult (no type re-declare)
export const RTR_ =
  <R, E, A>(ma: ReaderTaskResult<R, E, A>) =>
  (function* () { return (yield ma) as A })()

export const genRTR =
  <R, E>() =>
  <A>(f: () => Generator<ReaderTaskResult<R, E, any>, A, any>): ReaderTaskResult<R, E, A> =>
  async (r: R) => {
    const it = f()
    let last: any = undefined
    while (true) {
      const n = it.next(last)
      if (n.done) return Ok(n.value as A)
      const rr = await (n.value as ReaderTaskResult<R, E, any>)(r)
      if (isErr(rr)) return rr
      last = (rr as Ok<any>).value
    }
  }




// =======================
// Gen (generator) for TaskResult
// =======================
//
// Write linear code with `yield*`, short-circuit on Err.
// Usage:
//   const prog = genTR<string>()(function* () {
//     const a = yield* TR_(stepA)      // stepA: TaskResult<string, A>
//     const b = yield* TR_(stepB(a))   // stepB: A -> TaskResult<string, B>
//     return combine(a, b)             // final pure result
//   })
//   const r = await prog()             // -> Result<string, ...>

type TR_Yield<E, A> = Generator<TaskResult<E, A>, A, A>

/** Wrap a TaskResult so it can be `yield*`'d with correct typing. */
export const TR_ =
  <E, A>(ma: TaskResult<E, A>): TR_Yield<E, A> =>
  (function* () { return (yield ma) as A })()

/** Turn a generator of TaskResults into a single TaskResult. */
export const genTR =
  <E>() =>
  <A>(f: () => Generator<TaskResult<E, any>, A, any>): TaskResult<E, A> =>
  async () => {
    const it = f()
    let last: any = undefined
    while (true) {
      const n = it.next(last)
      if (n.done) return Ok(n.value as A)
      const r = await (n.value as TaskResult<E, any>)()
      if (isErr(r)) return r
      last = (r as Ok<any>).value
    }
  }

/*
// pretend asyncs
const okAfter = <A>(ms: number, a: A): TaskResult<string, A> =>
  () => new Promise(res => setTimeout(() => res(Ok(a)), ms))
const errAfter = (ms: number, e: string): TaskResult<string, never> =>
  () => new Promise(res => setTimeout(() => res(Err(e)), ms))

const prog = genTR<string>()(function* () {
  const n = yield* TR_(okAfter(5, 2))
  const s = yield* TR_(okAfter(5, 'x'))
  // const _ = yield* TR_(errAfter(1, 'boom')) // uncomment to test short-circuit
  return `${s}:${n * 10}` as const
})
// (async () => console.log(await prog()))()
*/








// =======================
// OptionT: TaskOption / ReaderTaskOption
// =======================
export type TaskOption<A> = Task<Option<A>>
export type ReaderTaskOption<R, A> = ReaderTask<R, Option<A>>

export const TaskOption = {
  of: <A>(a: A): TaskOption<A> => Task.of(Some(a)),
  none: (): TaskOption<never> => Task.of(None),
  fromOption: <A>(oa: Option<A>): TaskOption<A> => Task.of(oa),
  fromNullable: <A>(a: A | null | undefined): TaskOption<NonNullable<A>> =>
    Task.of(fromNullable(a as any) as any),

  map: <A, B>(f: (a: A) => B) => (ta: TaskOption<A>): TaskOption<B> =>
    () => ta().then(mapO(f)),

  chain: <A, B>(f: (a: A) => TaskOption<B>) => (ta: TaskOption<A>): TaskOption<B> =>
    async () => {
      const oa = await ta()
      return isSome(oa) ? f(oa.value)() : None
    },

  ap: <A, B>(tfab: TaskOption<(a: A) => B>) => (ta: TaskOption<A>): TaskOption<B> =>
    async () => {
      const [ofab, oa] = await Promise.all([tfab(), ta()])
      return isSome(ofab) && isSome(oa) ? Some(ofab.value(oa.value)) : None
    },

  getOrElse: <A>(onNone: Lazy<A>) => (ta: TaskOption<A>): Task<A> =>
    () => ta().then(getOrElseO(onNone)),

  orElse: <A>(that: Lazy<TaskOption<A>>) => (ta: TaskOption<A>): TaskOption<A> =>
    async () => {
      const oa = await ta()
      return isSome(oa) ? oa : await that()()
    },

  // Result interop
  fromResultOk: <E, A>(tra: TaskResult<E, A>): TaskOption<A> =>
    () => tra().then(r => (isOk(r) ? Some(r.value) : None)),
  toResult: <E, A>(onNone: Lazy<E>) => (ta: TaskOption<A>): TaskResult<E, A> =>
    () => ta().then(oa => (isSome(oa) ? Ok(oa.value) : Err(onNone()))),
}

export const ReaderTaskOption = {
  of: <R = unknown, A = never>(a: A): ReaderTaskOption<R, A> => async () => Some(a),
  none: <R = unknown>(): ReaderTaskOption<R, never> => async () => None,

  fromReader: <R, A>(ra: Reader<R, A>): ReaderTaskOption<R, A> =>
    async (r) => Some(ra(r)),

  fromTaskOption: <R, A>(ta: TaskOption<A>): ReaderTaskOption<R, A> =>
    async () => ta(),

  ask: <R>(): ReaderTaskOption<R, R> => async (r) => Some(r),

  map: <A, B>(f: (a: A) => B) => <R>(rto: ReaderTaskOption<R, A>): ReaderTaskOption<R, B> =>
    async (r) => mapO(f)(await rto(r)),

  chain: <A, B, R>(f: (a: A) => ReaderTaskOption<R, B>) =>
    (rto: ReaderTaskOption<R, A>): ReaderTaskOption<R, B> =>
    async (r) => {
      const oa = await rto(r)
      return isSome(oa) ? f(oa.value)(r) : None
    },

  getOrElse: <A>(onNone: Lazy<A>) =>
    <R>(rto: ReaderTaskOption<R, A>): ReaderTask<R, A> =>
    async (r) => getOrElseO(onNone)(await rto(r)),

  local: <R, Q>(f: (q: Q) => R) =>
    <A>(rto: ReaderTaskOption<R, A>): ReaderTaskOption<Q, A> =>
    async (q) => rto(f(q)),
}

// =======================
// Do-notation: ReaderTaskOption
// =======================

// =======================
// Do-notation: ReaderTaskOption (fixed)
// =======================

export type DoRTOBuilder<R, T extends Record<string, unknown>> = {
  bind: <K extends string, A>(
    k: K,
    rto: ReaderTaskOption<R, A>
  ) => DoRTOBuilder<R, T & { readonly [P in K]: A }>

  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoRTOBuilder<R, T & { readonly [P in K]: A }>

  map:  <B>(f: (t: T) => B) => ReaderTaskOption<R, B>
  done: () => ReaderTaskOption<R, T>
}

export const DoRTO = <R = unknown>() => {
  const start: ReaderTaskOption<R, {}> = async () => Some({})
  const make = <T extends Record<string, unknown>>(
    acc: ReaderTaskOption<R, T>
  ): DoRTOBuilder<R, T> => ({
    bind: <K extends string, A>(k: K, rto: ReaderTaskOption<R, A>) =>
      make<T & { readonly [P in K]: A }>(async (r) => {
        const ot = await acc(r)
        if (!isSome(ot)) return None
        const oa = await rto(r)
        return isSome(oa)
          ? Some({ ...(ot.value as any), [k]: oa.value } as T & { readonly [P in K]: A })
          : None
      }),

    let:  <K extends string, A>(k: K, a: A) =>
      make<T & { readonly [P in K]: A }>(async (r) => {
        const ot = await acc(r)
        return isSome(ot)
          ? Some({ ...(ot.value as any), [k]: a } as T & { readonly [P in K]: A })
          : None
      }),

    map:  <B>(f: (t: T) => B): ReaderTaskOption<R, B> =>
      async (r) => mapO<T, B>(f)(await acc(r)),

    done: () => acc,
  })
  return make(start)
}

// =======================
// Gen (generator) for ReaderTaskOption
// =======================
//
// Usage:
//   const prog = genRTO<R>(function* () {
//     const a = yield* RTO_(stepA)   // stepA: ReaderTaskOption<R, A>
//     const b = yield* RTO_(stepB(a))
//     return combine(a, b)           // final pure value
//   })
//
// `prog` has type ReaderTaskOption<R, ReturnTypeOfReturn>.

type RTO_Yield<R, A> = Generator<ReaderTaskOption<R, A>, A, A>
export const RTO_ =
  <R, A>(ma: ReaderTaskOption<R, A>): RTO_Yield<R, A> =>
  (function* () { return (yield ma) as A })()

export const genRTO =
  <R>() =>
  <A>(f: () => Generator<ReaderTaskOption<R, any>, A, any>): ReaderTaskOption<R, A> =>
  async (r: R) => {
    const it = f()
    const step = async (input?: any): Promise<Option<A>> => {
      const n = it.next(input)
      if (n.done) return Some(n.value as A)
      const oa = await (n.value as ReaderTaskOption<R, any>)(r)
      return isSome(oa) ? step(oa.value) : None
    }
    return step()
  }







// =======================
// Validation (accumulate errors)
// =======================
export type VErr<E> = { readonly _tag: 'VErr'; readonly errors: ReadonlyArray<E> }
export type VOk<A>  = { readonly _tag: 'VOk';  readonly value: A }
export type Validation<E, A> = VErr<E> | VOk<A>

// Overloads keep E precise (no 'unknown')
export function VErr<E>(e: E): Validation<E, never>
export function VErr<E>(...es: ReadonlyArray<E>): Validation<E, never>
export function VErr<E>(...es: ReadonlyArray<E>): Validation<E, never> {
  return { _tag: 'VErr', errors: es }
}

export const VOk = <A>(a: A): Validation<never, A> => ({ _tag: 'VOk', value: a })
export const isVErr = <E, A>(v: Validation<E, A>): v is VErr<E> => v._tag === 'VErr'
export const isVOk  = <E, A>(v: Validation<E, A>): v is VOk<A>  => v._tag === 'VOk'

export const mapV =
  <E, A, B>(f: (a: A) => B) =>
  (va: Validation<E, A>): Validation<E, B> =>
    isVOk(va) ? VOk(f(va.value)) : va

export const apV =
  <E>(concat: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>) =>
  <A, B>(vfab: Validation<E, (a: A) => B>) =>
  (va: Validation<E, A>): Validation<E, B> => {
    if (isVOk(vfab) && isVOk(va)) return VOk(vfab.value(va.value))
    if (isVErr(vfab) && isVErr(va)) return VErr(...concat(vfab.errors, va.errors))
    return isVErr(vfab) ? vfab : (va as any)
  }

export const validate =
  <E, A>(e: E, p: (a: A) => boolean) =>
  (a: A): Validation<E, A> =>
    p(a) ? VOk(a) : (VErr<E>(e) as Validation<E, A>)

// somewhere once in your lib (you already have this):
export const concatArray =
  <E>(a: ReadonlyArray<E>, b: ReadonlyArray<E>): ReadonlyArray<E> => [...a, ...b]






// -----------------------------------------------------------------------------
// Applicative lifting for Validation
// -----------------------------------------------------------------------------
//
// The general pattern:
//   - We often have a *curried constructor* like mkUser: (name) => (email) => (age) => User
//   - We also have several independent Validation<E, A> values (one per field).
//   - The `liftA*V` helpers let us "apply" the constructor inside Validation,
//     while accumulating *all* errors, not just short-circuiting on the first.
//
// Think: "If all fields validate, combine them into one result;
//         otherwise collect every error along the way."
//
// Usage example:
//   const userV = liftA3V(mkUser)(nonEmpty(name))(emailLike(email))(adult(age))
//
//   If all three succeed: VOk<User>
//   If some fail: VErr<readonly string[]>
// -----------------------------------------------------------------------------

// Lift a curried 2-arg function into Validation
export const liftA2V =
  <E, A, B, C>(f: (a: A) => (b: B) => C) =>
  (va: Validation<E, A>) =>
  (vb: Validation<E, B>): Validation<E, C> => {
    const apE = apV<E>(concatArray)
    return apE(mapV<E, A, (b: B) => C>(f)(va))(vb)
  }

// Lift a curried 3-arg function into Validation
export const liftA3V =
  <E, A, B, C, D>(f: (a: A) => (b: B) => (c: C) => D) =>
  (va: Validation<E, A>) =>
  (vb: Validation<E, B>) =>
  (vc: Validation<E, C>): Validation<E, D> => {
    const apE = apV<E>(concatArray)
    return apE(apE(mapV<E, A, (b: B) => (c: C) => D>(f)(va))(vb))(vc)
  }

// Lift a curried 4-arg function into Validation
export const liftA4V =
  <E, A, B, C, D, R>(f: (a: A) => (b: B) => (c: C) => (d: D) => R) =>
  (va: Validation<E, A>) =>
  (vb: Validation<E, B>) =>
  (vc: Validation<E, C>) =>
  (vd: Validation<E, D>): Validation<E, R> => {
    const apE = apV<E>(concatArray)
    return apE(apE(apE(mapV<E, A, (b: B) => (c: C) => (d: D) => R>(f)(va))(vb))(vc))(vd)
  }

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
type UnwrapValidation<T> = T extends Validation<infer _E, infer A> ? A : never

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
export const sequenceArrayValidation = <E, A>(
  vs: ReadonlyArray<Validation<E, A>>,
  concat: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>
): Validation<E, ReadonlyArray<A>> => {
  const out: A[] = []
  let errs: ReadonlyArray<E> | null = null
  for (const v of vs) {
    if (isVOk(v)) out.push(v.value)
    else errs = errs ? concat(errs, v.errors) : v.errors
  }
  return errs ? VErr(...errs) : VOk(out)
}

export const traverseArrayValidation = <E, A, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => Validation<E, B>,
  concat: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>
): Validation<E, ReadonlyArray<B>> =>
  sequenceArrayValidation(as.map(f), concat)

// ---------- Structs: Result (short-circuit) ----------
export const sequenceStructResult = <
  E,
  S extends Record<string, Result<E, any>>
>(s: S): Result<E, { readonly [K in keyof S]: UnwrapResult<S[K]> }> => {
  const out: Record<string, unknown> = {}
  for (const k in s) {
    const r = s[k]
    if (isErr(r!)) return r as any
    out[k] = (r as Ok<any>).value
  }
  return Ok(out as { readonly [K in keyof S]: UnwrapResult<S[K]> })
}

// ---------- Structs: Validation (accumulate) ----------
export const sequenceStructValidation = <
  E,
  S extends Record<string, Validation<E, any>>
>(
  s: S,
  concat: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>
): Validation<E, { readonly [K in keyof S]: UnwrapValidation<S[K]> }> => {
  const out: Record<string, unknown> = {}
  let errs: ReadonlyArray<E> | null = null
  for (const k in s) {
    const v = s[k]
    if (isVOk(v!)) out[k] = v.value
    else errs = errs ? concat(errs, (v as any).errors) : (v as any).errors
  }
  return errs
    ? VErr(...errs)
    : VOk(out as { readonly [K in keyof S]: UnwrapValidation<S[K]> })
}






// Map both sides of Result at once
export const bimapR =
  <E, F, A, B>(l: (e: E) => F, r: (a: A) => B) =>
  (ra: Result<E, A>): Result<F, B> =>
    isOk(ra) ? Ok(r(ra.value)) : Err(l(ra.error))

// Map Validation's Ok and its error *items* (not the whole array)
export const mapErrorsV =
  <E, F>(f: (e: E) => F) =>
  <A>(v: Validation<E, A>): Validation<F, A> =>
    isVOk(v) ? v as any : VErr(...v.errors.map(f))

export const bimapV =
  <E, F, A, B>(fe: (e: E) => F, fa: (a: A) => B) =>
  (v: Validation<E, A>): Validation<F, B> =>
    isVOk(v) ? VOk(fa(v.value)) : VErr(...v.errors.map(fe))






// =======================
// Decoder — a tiny “zod-lite” for parsing unknown data
// =======================
//
// Design
//  - A Decoder<A> tries to turn unknown input into A, returning Result<string[], A>
//  - Compose with map / andThen / refine
//  - Batteries included: string, number, boolean, literal, arrayOf, union, object, nullable
//  - Interop: toValidation() if you prefer Validation<string, A>
//

export type Decoder<A> = (u: unknown, path?: string) => Result<ReadonlyArray<string>, A>

// Constructors
export const succeed =
  <A>(a: A): Decoder<A> =>
  () => Ok(a)

export const fail =
  (msg: string): Decoder<never> =>
  (_u, path = '$') =>
    Err([`${path}: ${msg}`])

// Combinators
export const mapD =
  <A, B>(f: (a: A) => B) =>
  (da: Decoder<A>): Decoder<B> =>
  (u, p) => mapR<ReadonlyArray<string>, A, B>(f)(da(u, p))

export const andThenD =
  <A, B>(f: (a: A) => Decoder<B>) =>
  (da: Decoder<A>): Decoder<B> =>
  (u, p) => {
    const r = da(u, p)
    return isOk(r) ? f(r.value)(u, p) : (r as any)
  }

// Predicate guard with custom message
export const refineD =
  <A>(msg: string, pred: (a: A) => boolean) =>
  (da: Decoder<A>): Decoder<A> =>
  (u, p) => {
    const r = da(u, p)
    return isOk(r) ? (pred(r.value) ? r : Err([`${p ?? '$'}: ${msg}`])) : r
  }

// Primitives
export const stringD: Decoder<string> = (u, p = '$') =>
  typeof u === 'string' ? Ok(u) : Err([`${p}: expected string`])

export const numberD: Decoder<number> = (u, p = '$') =>
  typeof u === 'number' && Number.isFinite(u) ? Ok(u) : Err([`${p}: expected finite number`])

export const booleanD: Decoder<boolean> = (u, p = '$') =>
  typeof u === 'boolean' ? Ok(u) : Err([`${p}: expected boolean`])

  // Optional-with-default (object field utility)
export const withDefaultD =
  <A>(d: Decoder<A>, def: A): Decoder<A> =>
  (u, p) =>
    u === undefined ? Ok(def) : d(u, p)

// Non-empty string
export const nonEmptyStringD: Decoder<string> = refineD<string>("expected non-empty string", s => s.trim().length > 0)(stringD)

// Int (no decimals)
export const intD: Decoder<number> = refineD<number>("expected integer", n => Number.isInteger(n))(numberD)

// Record<string, A>
export const recordOf =
  <A>(d: Decoder<A>): Decoder<Record<string, A>> =>
  (u, p = "$") => {
    if (typeof u !== "object" || u === null || Array.isArray(u)) return Err([`${p}: expected object`])
    const rec = u as Record<string, unknown>
    const out: Record<string, A> = {}
    const errs: string[] = []
    for (const k of Object.keys(rec)) {
      const r = d(rec[k], `${p}.${k}`)
      if (isOk(r)) out[k] = r.value
      else errs.push(...r.error)
    }
    return errs.length ? Err(errs) : Ok(out)
  }


// Literal(s)
export const literalD =
  <L extends string | number | boolean>(...lits: readonly L[]): Decoder<L> =>
  (u, p = '$') =>
    (lits as readonly unknown[]).some(x => Object.is(x, u))
      ? Ok(u as L)
      : Err([`${p}: expected one of ${lits.map(String).join(', ')}`])

// Nullable wrapper (accepts null -> Ok(null), otherwise run decoder)
export const nullableD =
  <A>(d: Decoder<A>): Decoder<A | null> =>
  (u, p) =>
    u === null ? Ok(null) : d(u, p)

// Array
export const arrayOf =
  <A>(d: Decoder<A>): Decoder<ReadonlyArray<A>> =>
  (u, p = '$') => {
    if (!Array.isArray(u)) return Err([`${p}: expected array`])
    const out: A[] = []
    const errs: string[] = []
    u.forEach((item, i) => {
      const r = d(item, `${p}[${i}]`)
      if (isOk(r)) out.push(r.value)
      else errs.push(...r.error)
    })
    return errs.length ? Err(errs) : Ok(out)
  }

// Object (exact shape; extra keys are allowed but ignored)
export const object =
  <S extends Record<string, Decoder<any>>>(shape: S): Decoder<{ [K in keyof S]: ReturnType<S[K]> extends Result<any, infer A> ? A : never }> =>
  (u, p = '$') => {
    if (typeof u !== 'object' || u === null || Array.isArray(u)) return Err([`${p}: expected object`])
    const rec = u as Record<string, unknown>
    const out: any = {}
    const errs: string[] = []
    for (const k in shape) {
      const r = shape[k]!(rec[k], `${p}.${k}`)
      if (isOk(r)) out[k] = r.value
      else errs.push(...r.error)
    }
    return errs.length ? Err(errs) : Ok(out)
  }

// Union — try decoders in order and collect why each failed
export const union =
  <A>(...ds: Decoder<A>[]): Decoder<A> =>
  (u, p = '$') => {
    const errors: string[] = []
    for (const d of ds) {
      const r = d(u, p)
      if (isOk(r)) return r
      errors.push(...r.error)
    }
    return Err([`${p}: no union variant matched` , ...errors])
  }

// Optional (for object fields): treat undefined as Ok(undefined), otherwise decode
export const optionalD =
  <A>(d: Decoder<A>): Decoder<A | undefined> =>
  (u, p) =>
    u === undefined ? Ok(undefined) : d(u, p)

// Interop: convert to Validation (same error array)
export const toValidation =
  <A>(r: Result<ReadonlyArray<string>, A>): Validation<string, A> =>
    isOk(r) ? VOk(r.value) : VErr(...r.error)

// Convenience: run a decoder
export const decode =
  <A>(d: Decoder<A>) =>
  (u: unknown): Result<ReadonlyArray<string>, A> =>
    d(u, '$')





// =======================
// DecoderResult / Async interop
// =======================
//
// Goal: ergonomic helpers when a Decoder runs in Task / ReaderTask contexts.
// Types used from your lib: Result, Task, ReaderTask, mapR/isOk/Err/Ok

// Run a decoder against a value inside Task
export const decodeTask =
  <A>(d: Decoder<A>) =>
  (thunk: () => Promise<unknown>): Task<Result<ReadonlyArray<string>, A>> =>
  async () => {
    const u = await thunk()
    return decode(d)(u)
  }

// Run a decoder against a value inside ReaderTask<R, unknown>
export const decodeReaderTask =
  <R, A>(d: Decoder<A>) =>
  (rta: ReaderTask<R, unknown>): ReaderTask<R, Result<ReadonlyArray<string>, A>> =>
  async (r) => decode(d)(await rta(r))

// Convenience: decode JSON (string -> A), with parse failure captured in Result
export const decodeJson =
  <A>(d: Decoder<A>): Decoder<A> =>
  (u: unknown, p) => {
    if (typeof u !== "string") return Err([`${p ?? "$"}: expected JSON string`])
    try {
      const parsed = JSON.parse(u)
      return d(parsed, p)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return Err([`${p ?? "$"}: invalid JSON (${msg})`])
    }
  }

// Map/chain over Result within ReaderTask (common pattern)
export const mapRTResult =
  <R, E, A, B>(f: (a: A) => B) =>
  (rtra: ReaderTask<R, Result<E, A>>): ReaderTask<R, Result<E, B>> =>
  async (r) => mapR<E, A, B>(f)(await rtra(r))

export const chainRTResult =
  <R, E, A, F, B>(f: (a: A) => ReaderTask<R, Result<F, B>>) =>
  (rtra: ReaderTask<R, Result<E, A>>): ReaderTask<R, Result<E | F, B>> =>
  async (r) => {
    const ra = await rtra(r)
    return isOk(ra) ? f(ra.value)(r) : (ra as any)
  }

// Helpful: pretty-print the error path list from Decoder results
export const formatDecodeErrors = (errs: ReadonlyArray<string>): string =>
  errs.join("\n")


// =======================
// Convenience aliases
// =======================
export type DecodeErr = ReadonlyArray<string>
export type DecoderResult<A> = Result<DecodeErr, A>
export type ReaderTaskDecoder<R, A> = ReaderTask<R, DecoderResult<A>>
export type TaskDecoder<A> = Task<DecoderResult<A>>


// =======================
// ReaderTask decoding helpers (HTTP-flavored)
// =======================

// rename to avoid merging with your existing `Http`
export type HttpFn = (input: RequestInfo, init?: RequestInit) => Promise<Response>
export type EnvHttp = { apiBase: string; http: HttpFn }


// GET a JSON endpoint and decode it in one go
export const getJsonD =
  <A>(path: string, d: Decoder<A>): ReaderTaskDecoder<EnvHttp, A> =>
  async (env) => {
    try {
      const res = await env.http(`${env.apiBase}${path}`)
      if (!res.ok) return Err([`$.: HTTP ${res.status}`])
      const data = await res.json()
      return decode(d)(data)
    } catch (u) {
      return Err([`$.: network error: ${u instanceof Error ? u.message : String(u)}`])
    }
  }

// Same but with a RequestInit (headers, method…)
export const fetchJsonD =
  <A>(input: string, init: RequestInit | undefined, d: Decoder<A>): ReaderTaskDecoder<EnvHttp, A> =>
  async (env) => {
    try {
      const res = await env.http(input.startsWith("http") ? input : `${env.apiBase}${input}`, init)
      if (!res.ok) return Err([`$.: HTTP ${res.status}`])
      const data = await res.json()
      return decode(d)(data)
    } catch (u) {
      return Err([`$.: network error: ${u instanceof Error ? u.message : String(u)}`])
    }
  }




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
      const [a, s1, w] = await m(r)(s0)
      return [f(a), s1, w] as const
    },

  chain:
    <A, B, W>(f: (a: A) => RWST<any, W, any, B>, M: Monoid<W>) =>
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
  <A>(f: () => Generator<RWST<R, W, S, any>, A, any>): RWST<R, W, S, A> =>
  (r: R) =>
  async (s0: S) => {
    const it = f()
    let s = s0
    let wAcc = M.empty
    let last: any = undefined
    while (true) {
      const n = it.next(last)
      if (n.done) return [n.value as A, s, wAcc] as const
      const [a, s1, w] = await (n.value as RWST<R, W, S, any>)(r)(s)
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
    return isOk(res) ? f(res.value)(r)(s1) : [res as any, s1] as const
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

// ReaderTaskResult
export type ReaderTaskResult<R, E, A> = ReaderTask<R, Result<E, A>>

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

export const fromArrayNE = <A>(as: ReadonlyArray<A>): Option<NonEmptyArray<A>> =>
  as.length > 0 ? Some(as as any) : None

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
// • Incremental: safe across chunk boundaries (strings, numbers, literals)
// • Emits your StartArr/EndArr/StartObj/EndObj/Key/Null/Bool/Num/Str events
// • Maintains minimal parser state (stack) so keys are recognized
// • On malformed input, throws (you can wrap and return Result if you prefer)
//
// Notes: This is a "sane subset" tokenizer for typical JSON. It enforces
//         balanced structures and a valid token boundary for numbers/literals.
//         If you need full RFC8259 edge-cases, use a mature SAX parser.
//

export async function* tokenizeJSON(
  src: ReadableStream<string> | AsyncIterable<string>
): AsyncGenerator<JsonEvent, void, void> {
  const it = isReadableStream(src) ? streamToAsyncIterable(src) : src
  let buf = ""
  // Stack drives whether we're expecting keys/values inside objects/arrays
  type ArrF = { kind: "array"; expect: "value" | "commaOrEnd" }
  type ObjF = { kind: "object"; expect: "key" | "colon" | "value" | "commaOrEnd"; lastKey?: string }

  const stack: Array<ArrF | ObjF> = []

  for await (const chunk of it) {
    buf += chunk
    let i = 0

    parseLoop: while (true) {
      i = skipWS(buf, i)
      if (i >= buf.length) break parseLoop

      const top = stack[stack.length - 1]
      const ch = buf[i]

      // Structural tokens
      if (ch === "{") {
        yield ev.startObj()
        stack.push({ kind: "object", expect: "key" })
        i++
        continue
      }
      if (ch === "}") {
        if (!top || top.kind !== "object" || top.expect === "colon" || top.expect === "value") {
          throw new Error('Mismatched EndObj or dangling key/value')
        }
        yield ev.endObj()
        stack.pop()
        // after closing, parent expects commaOrEnd (handled by parent frame)
        i++
        continue
      }
      if (ch === "[") {
        yield ev.startArr()
        stack.push({ kind: "array", expect: "value" })
        i++
        continue
      }
      if (ch === "]") {
        if (!top || top.kind !== "array" || top.expect === "value")
          throw new Error("Mismatched ] or missing array value")
        yield ev.endArr()
        stack.pop()
        i++
        continue
      }
      if (ch === ",") {
        if (!top || top.expect !== "commaOrEnd")
          throw new Error("Unexpected comma")
        if (top.kind === "array") top.expect = "value"
        else top.expect = "key"
        i++
        continue
      }
      if (ch === ":") {
        if (!top || top.kind !== "object" || top.expect !== "colon")
          throw new Error("Unexpected colon")
        top.expect = "value"
        i++
        continue
      }

      // Value or key
      if (ch === '"') {
        const str = readJSONString(buf, i)
        if (str.kind === "needMore") break parseLoop
        if (str.kind === "error") throw new Error(str.message)
        i = str.end
        if (top && top.kind === "object" && top.expect === "key") {
          yield ev.key(str.value)
          top.expect = "colon"
        } else {
          yield ev.str(str.value)
          bumpAfterValue(stack)
        }
        continue
      }

      // Literals: true/false/null
      if (ch === "t" || ch === "f" || ch === "n") {
        const lit = readJSONLiteral(buf, i)
        if (lit.kind === "needMore") break parseLoop
        if (lit.kind === "error") throw new Error(lit.message)
        i = lit.end
        if (lit.type === "true")  yield ev.bool(true)
        if (lit.type === "false") yield ev.bool(false)
        if (lit.type === "null")  yield ev.null()
        bumpAfterValue(stack)
        continue
      }

      // Numbers
      if (ch === "-" || (ch! >= "0" && ch! <= "9")) {
        const num = readJSONNumber(buf, i)
        if (num.kind === "needMore") break parseLoop
        if (num.kind === "error") throw new Error(num.message)
        yield ev.num(num.value)
        i = num.end
        bumpAfterValue(stack)
        continue
      }

      // If we get here, it's invalid or we need more
      if (isWS(ch!)) { i++; continue } // defensive
      throw new Error(`Unexpected character '${ch}' at offset ${i}`)
    }

    // keep only the unconsumed tail
    buf = buf.slice(i)
  }

  // End-of-stream checks
  const tail = skipWS(buf, 0)
  if (tail !== buf.length) throw new Error("Trailing characters after JSON")
  if (stack.length !== 0)  throw new Error("Unclosed arrays/objects")
}

// -------- helpers -----------------------------------------------------

const isReadableStream = (x: any): x is ReadableStream<string> =>
  typeof x?.getReader === "function"

async function* streamToAsyncIterable(stream: ReadableStream<string>) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      if (value != null) yield value
    }
  } finally {
    reader.releaseLock()
  }
}

const isWS = (c: string) =>
  c === " " || c === "\n" || c === "\r" || c === "\t"

function skipWS(s: string, i: number): number {
  while (i < s.length && isWS(s[i]!)) i++
  return i
}

// ----- string reader (handles escapes; incremental) -----
function readJSONString(input: string, i0: number):
  | { kind: "ok"; value: string; end: number }
  | { kind: "needMore" }
  | { kind: "error"; message: string } {
  if (input[i0] !== '"') return { kind: "error", message: "String must start with '\"'" }
  let i = i0 + 1
  let out = ""
  while (i < input.length) {
    const ch = input[i]!
    if (ch === '"') return { kind: "ok", value: out, end: i + 1 }
    if (ch === "\\") {
      if (i + 1 >= input.length) return { kind: "needMore" }
      const esc = input[i + 1]!
      switch (esc) {
        case '"': out += '"';  i += 2; break
        case "\\": out += "\\"; i += 2; break
        case "/": out += "/";  i += 2; break
        case "b": out += "\b"; i += 2; break
        case "f": out += "\f"; i += 2; break
        case "n": out += "\n"; i += 2; break
        case "r": out += "\r"; i += 2; break
        case "t": out += "\t"; i += 2; break
        case "u": {
          if (i + 6 > input.length) return { kind: "needMore" }
          const hex = input.slice(i + 2, i + 6)
          if (!/^[0-9a-fA-F]{4}$/.test(hex))
            return { kind: "error", message: "Invalid \\u escape" }
          out += String.fromCharCode(parseInt(hex, 16))
          i += 6
          break
        }
        default:
          return { kind: "error", message: `Invalid escape \\${esc}` }
      }
    } else {
      out += ch
      i++
    }
  }
  return { kind: "needMore" }
}

// ----- literal reader (true/false/null; incremental) -----
function readJSONLiteral(input: string, i0: number):
  | { kind: "ok"; type: "true" | "false" | "null"; end: number }
  | { kind: "needMore" }
  | { kind: "error"; message: string } {
  const sub = input.slice(i0)
  const tries = [
    { word: "true",  type: "true"  as const },
    { word: "false", type: "false" as const },
    { word: "null",  type: "null"  as const },
  ]
  for (const t of tries) {
    if (sub.startsWith(t.word)) {
      const end = i0 + t.word.length
      // must be at a boundary (whitespace, comma, ] or })
      if (end < input.length && !isBoundary(input[end]!))
        return { kind: "error", message: "Invalid literal boundary" }
      // if boundary not present yet, ask for more
      if (end === input.length) return { kind: "needMore" }
      return { kind: "ok", type: t.type, end }
    }
    // may be a split literal across chunks
    if (t.word.startsWith(sub)) return { kind: "needMore" }
  }
  return { kind: "error", message: "Unknown literal" }
}

// ----- number reader (JSON number grammar; incremental) -----
function readJSONNumber(input: string, i0: number):
  | { kind: "ok"; value: number; end: number }
  | { kind: "needMore" }
  | { kind: "error"; message: string } {
  const sub = input.slice(i0)
  const m = sub.match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)
  if (!m || m[0].length === 0) return { kind: "error", message: "Invalid number" }
  const end = i0 + m[0].length
  // If we're at the end of buffer, we might be in the middle of a longer number
  if (end === input.length) return { kind: "needMore" }
  // Next char must be a boundary
  const next = input[end]!
  if (!isBoundary(next)) return { kind: "error", message: "Invalid number boundary" }
  const n = Number(m[0])
  if (!Number.isFinite(n)) return { kind: "error", message: "Non-finite number" }
  return { kind: "ok", value: n, end }
}

function isBoundary(c: string): boolean {
  return isWS(c) || c === "," || c === "]" || c === "}"
}

// After a value is emitted, adjust parent expectations
function bumpAfterValue(stack: Array<{ kind: "array" | "object"; expect: any }>) {
  const top = stack[stack.length - 1]
  if (!top) return
  if (top.kind === "array") top.expect = "commaOrEnd"
  else top.expect = "commaOrEnd"
}


// =======================
// JSON Zipper
// =======================
//
// Focused navigation & edits over Json without rebuilding the whole tree.
// Operations are pure; each returns a new zipper.

type ArrCtx = { tag: 'Arr'; left: Json[]; right: Json[] }
type ObjCtx = { tag: 'Obj'; left: Array<readonly [string, Json]>; key: string; right: Array<readonly [string, Json]> }
type Ctx = ArrCtx | ObjCtx

export type JsonZipper = { focus: Json; parents: ReadonlyArray<Ctx> }

// Create a zipper focused at the root
export const zipRoot = (j: Json): JsonZipper => ({ focus: j, parents: [] })

// Rebuild the full tree from the zipper (without moving)
export const zipTree = (z: JsonZipper): Json => {
  let node = z.focus
  for (let i = z.parents.length - 1; i >= 0; i--) {
    const c = z.parents[i]!
    if (c.tag === 'Arr') {
      node = jArr([...c.left, node, ...c.right])
    } else {
      node = jObj([...c.left, [c.key, node] as const, ...c.right])
    }
  }
  return node
}

// Move up one level
export const zipUp = (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  if (ps.length === 0) return None
  const top = ps[ps.length - 1]!
  if (top.tag === 'Arr') {
    const parent = jArr([...top.left, z.focus, ...top.right])
    return Some({ focus: parent, parents: ps.slice(0, -1) })
  } else {
    const parent = jObj([...top.left, [top.key, z.focus] as const, ...top.right])
    return Some({ focus: parent, parents: ps.slice(0, -1) })
  }
}

// Down into array index i
export const zipDownIndex = (i: number) => (z: JsonZipper): Option<JsonZipper> => {
  const n = z.focus.un
  if (n._tag !== 'JArr') return None
  if (i < 0 || i >= n.items.length) return None
  const left = n.items.slice(0, i)
  const focus = n.items[i]!
  const right = n.items.slice(i + 1)
  const ctx: ArrCtx = { tag: 'Arr', left: [...left], right: [...right] }
  return Some({ focus, parents: [...z.parents, ctx] })
}

// Left/right within array
export const zipLeft = (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top || top.tag !== 'Arr' || top.left.length === 0) return None
  const newRight = [z.focus, ...top.right]
  const newFocus = top.left[top.left.length - 1]!
  const newLeft = top.left.slice(0, -1)
  const ctx: ArrCtx = { tag: 'Arr', left: newLeft, right: newRight }
  return Some({ focus: newFocus, parents: [...ps.slice(0, -1), ctx] })
}

export const zipRight = (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top || top.tag !== 'Arr' || top.right.length === 0) return None
  const newLeft = [...top.left, z.focus]
  const newFocus = top.right[0]!
  const newRight = top.right.slice(1)
  const ctx: ArrCtx = { tag: 'Arr', left: newLeft, right: newRight }
  return Some({ focus: newFocus, parents: [...ps.slice(0, -1), ctx] })
}

// Down into object value by key (first match)
export const zipDownKey = (k: string) => (z: JsonZipper): Option<JsonZipper> => {
  const n = z.focus.un
  if (n._tag !== 'JObj') return None
  const idx = n.entries.findIndex(([kk]) => kk === k)
  if (idx < 0) return None
  const left = n.entries.slice(0, idx)
  const [_, value] = n.entries[idx]!
  const right = n.entries.slice(idx + 1)
  const ctx: ObjCtx = { tag: 'Obj', left: [...left], key: k, right: [...right] }
  return Some({ focus: value, parents: [...z.parents, ctx] })
}

// Replace / modify focus
export const zipReplace = (j: Json) => (z: JsonZipper): JsonZipper =>
  ({ focus: j, parents: z.parents })

export const zipModify = (f: (j: Json) => Json) => (z: JsonZipper): JsonZipper =>
  ({ focus: f(z.focus), parents: z.parents })

// Insert into arrays (before/after current focus)
export const zipInsertLeft = (j: Json) => (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top || top.tag !== 'Arr') return None
  const ctx: ArrCtx = { tag: 'Arr', left: [...top.left, j], right: top.right }
  return Some({ focus: z.focus, parents: [...ps.slice(0, -1), ctx] })
}

export const zipInsertRight = (j: Json) => (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top || top.tag !== 'Arr') return None
  const ctx: ArrCtx = { tag: 'Arr', left: top.left, right: [j, ...top.right] }
  return Some({ focus: z.focus, parents: [...ps.slice(0, -1), ctx] })
}

// Delete focus; move left if possible, else right; if no siblings, replace with empty container
export const zipDelete = (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top) return None
  if (top.tag === 'Arr') {
    if (top.left.length > 0) {
      const newFocus = top.left[top.left.length - 1]!
      const ctx: ArrCtx = { tag: 'Arr', left: top.left.slice(0, -1), right: top.right }
      return Some({ focus: newFocus, parents: [...ps.slice(0, -1), ctx] })
    }
    if (top.right.length > 0) {
      const newFocus = top.right[0]!
      const ctx: ArrCtx = { tag: 'Arr', left: top.left, right: top.right.slice(1) }
      return Some({ focus: newFocus, parents: [...ps.slice(0, -1), ctx] })
    }
    // no siblings: replace parent array with empty
    return zipUp({ focus: jArr([]), parents: ps })
  } else {
    // object: drop the current key/value
    if (top.left.length > 0) {
      const [kPrev, vPrev] = top.left[top.left.length - 1]!
      const ctx: ObjCtx = { tag: 'Obj', left: top.left.slice(0, -1), key: kPrev, right: [[top.key, z.focus] as const, ...top.right] }
      return Some({ focus: vPrev, parents: [...ps.slice(0, -1), ctx] })
    }
    if (top.right.length > 0) {
      const [kNext, vNext] = top.right[0]!
      const ctx: ObjCtx = { tag: 'Obj', left: [...top.left, [top.key, z.focus] as const], key: kNext, right: top.right.slice(1) }
      return Some({ focus: vNext, parents: [...ps.slice(0, -1), ctx] })
    }
    return zipUp({ focus: jObj([]), parents: ps })
  }
}













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
  export type Id1 = keyof Registry1<any>
  export type Kind1<F extends Id1, A> = Registry1<A>[F]

  // ---------- 2-parameter type constructors: F<_, _> ----------
  // Convention: the LEFT slot <L, A> is the one you often keep constant.
  export interface Registry2<L, A> {
    Result: Result<L, A>
    ReaderTask: ReaderTask<L, A>   // here L = R (environment) for ReaderTask
    // Reader: Reader<L, A>        // if you want Reader as a Kind2 too
  }
  export type Id2 = keyof Registry2<any, any>
  export type Kind2<F extends Id2, L, A> = Registry2<L, A>[F]
}

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

// =======================
// Instances (no collisions)
// =======================

// Option as Kind1
export const OptionK: MonadK1<'Option'> = {
  map: mapO as any,
  of : Some as any,
  ap : <A, B>(ff: Option<(a: A) => B>) => (fa: Option<A>): Option<B> =>
    isSome(ff) && isSome(fa) ? Some(ff.value(fa.value)) : None,
  chain: flatMapO as any,
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
      isOk(ra) ? Ok(f(ra.value)) : (ra as any),

  of: <A>(a: A): Result<E, A> => Ok(a) as Result<E, A>,

  ap:  <A, B>(rf: Result<E, (a: A) => B>) =>
       (ra: Result<E, A>): Result<E, B> =>
         isOk(rf) && isOk(ra) ? Ok(rf.value(ra.value)) : (isErr(rf) ? rf : ra as any),

  chain: <A, B>(f: (a: A) => Result<E, B>) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? f(ra.value) : (ra as any),
})

// =======================
// Generic helpers using HK.*
// =======================

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
  export type Id3 = keyof Registry3<any, any, any>
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
          : (isErr(rfab) ? rfab : rfa as any)
      },

    chain: <A, B>(f: (a: A) =>
             HK.Kind3<'ReaderTaskResult', R, E, B>) =>
            (fa: HK.Kind3<'ReaderTaskResult', R, E, A>):
              HK.Kind3<'ReaderTaskResult', R, E, B> =>
      async (env: R) => {
        const ra = await fa(env)
        return isOk(ra) ? f(ra.value)(env) : ra as any
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
      traverseArrayK3C(F)<HK.Kind3<F, L1, L2, A> extends infer _ ? unknown : never, A>
        (fs as any, (x: any) => x)


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
type Env = { apiBase: string; token: string }

// Reader usage (pure dependency injection)
const authHeader: Reader<Env, Record<string, string>> = Reader.asks((env) => ({
  Authorization: `Bearer ${env.token}`,
}))

const withApi = Reader.local<Env, { apiBase: string }>(
  (q) => ({ apiBase: q.apiBase, token: "n/a" }) // adapt env shape if needed
)

const url: Reader<Env, string> = Reader.asks((env) => `${env.apiBase}/users/me`)

const headersThenUrl = Reader.chain<Record<string, string>, string, Env>((h) =>
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

const getUser = (id: string): ReaderTask<EnvErr, Result<E, User>> =>
  getJsonTR<User>(`/users/${id}`)

// map the Ok value with ReaderTaskResult.map
// map: <E, A, B>(f: (a: A) => B) =>
//      <R>(rtra: ReaderTask<R, Result<E, A>>) => ReaderTask<R, Result<E, B>>

// map: <R, E, A, B>(f: (a: A) => B) =>
//      (rtra: ReaderTask<R, Result<E, A>>) => ReaderTask<R, Result<E, B>>

const getUserName: ReaderTask<EnvErr, Result<Error, string>> =
  ReaderTaskResult.map<EnvErr, Error, User, string>((u) => u.name)(
    getUser("42")
  )



// Examples have been moved to examples.ts
