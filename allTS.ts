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
// Note: ArrayM is now defined in the Category Theory section below

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

// =============== 2-Cat of Endofunctors on Types ==================
// A minimal "functor-like" shape (unary endofunctor on TS types)
export type EndofunctorK1<F> = {
  readonly map: <A, B>(f: (a: A) => B) => (fa: any /* F<A> */) => any /* F<B> */
}

// A natural transformation F ⇒ G: components α_A : F<A> → G<A>
export type NatK1<F, G> = {
  readonly app: <A>(fa: any /* F<A> */) => any /* G<A> */
}

// Identity 2-cell on functor F
export const idNatK1 = <F>(/* F: EndofunctorK1<F> */): NatK1<F, F> => ({
  app: <A>(fa: any) => fa
})

// Vertical composition: β ∘ α : F ⇒ H (pointwise composition)
export const vcompNatK1 =
  <F, G, H>(alpha: NatK1<F, G>, beta: NatK1<G, H>): NatK1<F, H> => ({
    app: <A>(fa: any) => beta.app<A>(alpha.app<A>(fa))
  })

// Whiskering and Horizontal composition (component-level)

// Left whisker:   F ∘ β : F∘H ⇒ F∘K   with (F ∘ β)_A = F.map(β_A)
export const leftWhisker =
  <F>(F: EndofunctorK1<F>) =>
  <H, K>(beta: NatK1<H, K>) => ({
    app: <A>(fha: any /* F<H<A>> */) =>
      F.map<any, any>((ha: any) => beta.app<A>(ha))(fha) // F.map applied to β_A
  }) as NatK1<any /* F∘H */, any /* F∘K */>

// Right whisker:  α ∘ H : F∘H ⇒ G∘H   with (α ∘ H)_A = α_{H A}
export const rightWhisker =
  <F, G>(alpha: NatK1<F, G>) =>
  <H>(/* H: EndofunctorK1<H> not needed at runtime */) => ({
    app: <A>(fha: any /* F<H<A>> */) => alpha.app<any>(fha)
  }) as NatK1<any /* F∘H */, any /* G∘H */>

// Horizontal composition (component form):
//   (α ⋆ β)_A : F<H<A>> → G<K<A>>
//   Either side is equal by naturality; we implement F.map(β_A) then α:
export const hcompNatK1_component =
  <F, G>(F: EndofunctorK1<F>) =>
  <H, K>(alpha: NatK1<F, G>, beta: NatK1<H, K>) => ({
    app: <A>(fha: any /* F<H<A>> */) =>
      alpha.app<any>(
        F.map<any, any>((ha: any) => beta.app<A>(ha))(fha)
      )
  }) as { app: <A>(fha: any /* F<H<A>> */) => any /* G<K<A>> */ }

/**
 * Laws (informal):
 *  - Vertical composition is associative; idNat is identity.
 *  - Horizontal composition respects whiskering and satisfies the interchange law:
 *      (β ∘v α) ⋆ (δ ∘v γ) = (β ⋆ δ) ∘v (α ⋆ γ)
 *  - Naturality ensures F.map(β_A); α_{H A} ≡ α_{K A}; G.map(β_A).
 */

// ================= 2-Functors on Endofunctors =================
// Core: composition & identities for endofunctors

// Identity endofunctor on Types
export const IdK1: EndofunctorK1<'IdK1'> = {
  map: <A, B>(f: (a: A) => B) => (a: A) => f(a)
}

// Horizontal composition of endofunctors: (F ∘ G).map = F.map ∘ G.map
export const composeEndoK1 =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>): EndofunctorK1<['Comp', F, G]> => ({
    map: <A, B>(f: (a: A) => B) => (fga: any) => F.map(G.map(f))(fga)
  })

// ================= 2-Functor Interfaces =================
// Strict 2-functor between our one-object 2-cats (Type → Type)
export interface TwoFunctorK1 {
  on1:  <F>(F: EndofunctorK1<F>) => EndofunctorK1<any>              // map 1-cells
  on2:  <F, G>(α: NatK1<F, G>) => NatK1<any, any>                  // map 2-cells
}

// Lax 2-functor: preserves comp/unit up to specified 2-cells (directions as in "lax")
export interface LaxTwoFunctorK1 extends TwoFunctorK1 {
  // μ_{F,G} : on1(F) ∘ on1(G) ⇒ on1(F ∘ G)
  mu:  <F, G>() => NatK1<any, any>
  // η : Id ⇒ on1(Id)
  eta: () => NatK1<any, any>
  // (laws: unit & associativity coherence; naturality in F,G)
}

// Oplax 2-functor: structure maps go the other way
export interface OplaxTwoFunctorK1 extends TwoFunctorK1 {
  // μ^op_{F,G} : on1(F ∘ G) ⇒ on1(F) ∘ on1(G)
  muOp:  <F, G>() => NatK1<any, any>
  // η^op : on1(Id) ⇒ Id
  etaOp: () => NatK1<any, any>
}

// ================= Concrete Lax 2-Functor: PostcomposeReader<R> =================
// Intuition: U(F)=Reader R∘F
// On 2-cells: apply the NT inside the Reader (right whiskering)
// η:Id⇒U(Id) is `a ↦ (_)=>a`
// μF,G:U(F)∘U(G)⇒U(F∘G) collapses the inner Reader by evaluating at the SAME environment

// Reader endofunctor you already have
export type Reader<R, A> = (r: R) => A
export const Reader = {
  map:  <A, B>(f: (a: A) => B) => <R>(ra: Reader<R, A>): Reader<R, B> => (r) => f(ra(r)),
  of:   <R, A>(a: A): Reader<R, A> => (_: R) => a,
  chain: <A, B, R>(f: (a: A) => Reader<R, B>) => (ra: Reader<R, A>): Reader<R, B> => (r) => f(ra(r))(r),
  ap:   <R, A, B>(rfab: Reader<R, (a: A) => B>) => (rfa: Reader<R, A>): Reader<R, B> => (r) => rfab(r)(rfa(r)),
  ask:  <R>(): Reader<R, R> => (r: R) => r,
  asks: <R, A>(f: (r: R) => A): Reader<R, A> => (r) => f(r),
  local: <R, Q>(f: (q: Q) => R) => <A>(rq: Reader<R, A>): Reader<Q, A> => (q) => rq(f(q)),
}

// Helper function to run a Reader with an environment
export const runReader = <R, A>(ra: Reader<R, A>, r: R): A => ra(r)

// Lax 2-functor: PostcomposeReader<R>
export const PostcomposeReader2 = <R>(): LaxTwoFunctorK1 => {
  const H: EndofunctorK1<'Reader'> = { map: Reader.map as any }

  const on1 = <F>(F: EndofunctorK1<F>) =>
    composeEndoK1(H, F) // Reader ∘ F

  const on2 = <F, G>(α: NatK1<F, G>) => ({
    app: <A>(rfa: Reader<R, any /* F<A> */>): Reader<R, any /* G<A> */> =>
      (r) => α.app<A>(rfa(r))
  })

  // η : Id ⇒ Reader ∘ Id   (aka "unit")
  const eta = () => ({
    app: <A>(a: A): Reader<R, A> => Reader.of<R, A>(a)
  })

  // μ_{F,G} : (Reader∘F) ∘ (Reader∘G) ⇒ Reader ∘ (F∘G)
  //  i.e.  Reader<R, F< Reader<R, G<A>> >>  →  Reader<R, F< G<A> >>
  const mu = <F, G>() => ({
    app: <A>(rf_rg: Reader<R, any>): Reader<R, any> =>
      (r: R) => {
        const f_rg = rf_rg(r)                            // F< Reader<R, G<A>> >
        // evaluate inner Reader at the SAME environment
        return ( (F: EndofunctorK1<F>) => F.map((rg: Reader<R, any>) => rg(r)) as any )(undefined as any) as never
      }
  }) as NatK1<any, any>

  return { on1, on2, eta, mu }
}

// The (slightly) typed version of μ using the provided F:
// Since TS can't pass F's value at runtime, we also export a helper that takes F explicitly:
export const muPostReader =
  <R>() =>
  <F, G>(F: EndofunctorK1<F>) =>
  ({
    app: <A>(rf_rg: Reader<R, any /* F< Reader<R, G<A>> > */>): Reader<R, any /* F< G<A> > */> =>
      (r: R) => F.map((rg: Reader<R, any>) => rg(r))(rf_rg(r))
  }) as NatK1<any, any>

// ================= Concrete Oplax 2-Functor: PrecomposeEnv<E> =================
// Use the Env comonad Env E A≅[E,A]
// We define U(F)=F∘Env E and give
// - η^op:U(Id)⇒Id as the counit (drop the E), and
// - μ^op_{F,G}:U(F∘G)⇒U(F)∘U(G) using a strength wrt Env (pull the pair outward)

// Env comonad endofunctor: A ↦ readonly [E, A]
export type Env<E, A> = readonly [E, A]
export const EnvEndo = <E>(): EndofunctorK1<['Env', E]> => ({
  map: <A, B>(f: (a: A) => B) => (ea: Env<E, A>): Env<E, B> => [ea[0], f(ea[1])] as const
})

// Strength wrt Env:  st_F : F<[E,A]> -> [E, F<A>]
export type StrengthEnv<F, E> = {
  st: <A>(fea: any /* F<Env<E,A>> */) => Env<E, any /* F<A> */>
}

// Oplax 2-functor: PrecomposeEnv<E> given a strength for every F you use
export const PrecomposeEnv2 =
  <E>(strengthFor: <F>(F: EndofunctorK1<F>) => StrengthEnv<F, E>): OplaxTwoFunctorK1 => {

  const on1 = <F>(F: EndofunctorK1<F>) => composeEndoK1(F, EnvEndo<E>()) // F ∘ Env<E,_>

  const on2 = <F, G>(α: NatK1<F, G>) => ({
    app: <A>(fea: any /* F<Env<E,A>> */): any /* G<Env<E,A>> */ =>
      α.app<Env<E, A>>(fea)
  })

  // η^op : on1(Id) = Env<E,_> ⇒ Id  (counit)
  const etaOp = () => ({
    app: <A>(ea: Env<E, A>): A => ea[1]
  })

  // μ^op_{F,G} : on1(F∘G) ⇒ on1(F) ∘ on1(G)
  //   F<G<Env<E,A>>>  →  F<Env<E, G<Env<E,A>>>>  →  Env<E, F<G<Env<E,A>>>>
  //   using st_G then st_F
  const muOp = <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) => ({
    app: <A>(fg_ea: any): any => {
      const sG = strengthFor(G).st
      const sF = strengthFor(F).st
      // step 1: push Env through G
      const f_env_g_ea = F.map((g_ea: any) => sG<any>(g_ea))(fg_ea)     // F<Env<E, G<A>>>
      // step 2: push Env through F
      return sF<any>(f_env_g_ea)                                        // Env<E, F<G<A>>>
    }
  }) as NatK1<any, any>

  return { on1, on2, etaOp, muOp: <F, G>() => ({ app: muOp as any } as any) }
}

// ================= Ready-made strengths for common functors =================

// Option: st<Option>(Option<[E,A]>) -> [E, Option<A>]
export const strengthEnvOption = <E>(): StrengthEnv<'Option', E> => ({
  st: <A>(oea: any) =>
    (oea && oea._tag === 'Some')
      ? [oea.value[0] as E, { _tag:'Some', value: (oea.value[1] as A) }] as const
      : [undefined as unknown as E, { _tag:'None' }]
})

// Result<E2,_>: st<Result>(Result<[E,A]>) -> [E, Result<A>]
//   If Err, we must still supply an E; we thread a "defaultE" you choose.
export const strengthEnvResult = <E, E2>(defaultE: E): StrengthEnv<'Result', E> => ({
  st: <A>(rea: any) =>
    (rea && rea._tag === 'Ok')
      ? [rea.value[0] as E, { _tag:'Ok', value: (rea.value[1] as A) }] as const
      : [defaultE, rea]
})

// Reader<R,_>: st<Reader>(Reader<[E,A]>) -> [E, Reader<A>]
export const strengthEnvReader = <E, R>(): StrengthEnv<'Reader', E> => ({
  st: <A>(r_ea: (r: R) => readonly [E, A]) => {
    // choose E from the current read (effectively "snapshot" E at run)
    const sample = r_ea as any as (r: R) => readonly [E, A]
    return [undefined as unknown as E,
      ((r: R) => sample(r)[1]) // Reader<R, A>
    ] as const
  }
})

/**
 * 2-functor (lax) laws (sketch):
 *  - on2 respects vertical & horizontal composition.
 *  - μ, η are natural in their arguments.
 *  - Unit:  (on1(F) ∘ η) ; μ_{F,Id} = id   and   (η ∘ on1(F)) ; μ_{Id,F} = id
 *  - Assoc:  (μ_{F,G} ⋆ id) ; μ_{F∘G,H} = (id ⋆ μ_{G,H}) ; μ_{F,G∘H}
 *
 * Oplax is dual: arrows reversed for η^op, μ^op and laws dualized.
 */

// ---------------------------------------------------------------------
// Sum (coproduct) of endofunctors: F ⊕ G
// Value shape carries a tag so we know which branch at runtime.
// ---------------------------------------------------------------------
export type SumVal<F, G, A> =
  | { readonly _sum: 'L'; readonly left:  any /* F<A> */ }
  | { readonly _sum: 'R'; readonly right: any /* G<A> */ }

export const inL =
  <F, G, A>(fa: any /* F<A> */): SumVal<F, G, A> =>
    ({ _sum: 'L', left: fa })

export const inR =
  <F, G, A>(ga: any /* G<A> */): SumVal<F, G, A> =>
    ({ _sum: 'R', right: ga })

export const SumEndo =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>): EndofunctorK1<['Sum', F, G]> => ({
    map: <A, B>(f: (a: A) => B) => (v: SumVal<F, G, A>): SumVal<F, G, B> =>
      v._sum === 'L'
        ? { _sum: 'L', left:  F.map(f)(v.left) }
        : { _sum: 'R', right: G.map(f)(v.right) }
  })

// Strength for Sum, derived from strengths of each side.
// st_(F⊕G) : (F⊕G)<[E,A]> -> [E, (F⊕G)<A>]
export const strengthEnvFromSum =
  <E>() =>
  <F, G>(sF: StrengthEnv<F, E>, sG: StrengthEnv<G, E>): StrengthEnv<['Sum', F, G], E> => ({
    st: <A>(v: SumVal<F, G, Env<E, A>>) =>
      v._sum === 'L'
        ? (() => { const [e, fa] = sF.st<A>(v.left);  return [e, inL<F, G, A>(fa)] as const })()
        : (() => { const [e, ga] = sG.st<A>(v.right); return [e, inR<F, G, A>(ga)] as const })()
  })

// (optional) case-analysis helper
export const matchSum =
  <F, G, A, B>(onL: (fa: any /* F<A> */) => B, onR: (ga: any /* G<A> */) => B) =>
  (v: SumVal<F, G, A>): B =>
    v._sum === 'L' ? onL(v.left) : onR(v.right)

// ---------------------------------------------------------------------
// Product of endofunctors: F ⊗ G   (pair the payloads componentwise)
// ---------------------------------------------------------------------
export type ProdVal<F, G, A> = {
  readonly left:  any /* F<A> */
  readonly right: any /* G<A> */
}

export const prod =
  <F, G, A>(fa: any /* F<A> */, ga: any /* G<A> */): ProdVal<F, G, A> =>
    ({ left: fa, right: ga })

export const ProdEndo =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>): EndofunctorK1<['Prod', F, G]> => ({
    map: <A, B>(f: (a: A) => B) => (p: ProdVal<F, G, A>): ProdVal<F, G, B> => ({
      left:  F.map(f)(p.left),
      right: G.map(f)(p.right),
    })
  })

// Strength for Product, derived componentwise.
// st_(F⊗G) : (F⊗G)<[E,A]> -> [E, (F⊗G)<A>]
// NOTE: both component strengths are expected to thread the SAME E (by law).
// We take the left E; if they differ, consider asserting in dev builds.
export const strengthEnvFromProd =
  <E>() =>
  <F, G>(sF: StrengthEnv<F, E>, sG: StrengthEnv<G, E>): StrengthEnv<['Prod', F, G], E> => ({
    st: <A>(p: ProdVal<F, G, Env<E, A>>) => {
      const [e1, fa] = sF.st<A>(p.left)
      const [_,  ga] = sG.st<A>(p.right)
      return [e1, prod<F, G, A>(fa, ga)] as const
    }
  })

// ---------- Sum/Product of natural transformations ----------

// α ⊕ β : (F ⊕ G) ⇒ (F' ⊕ G')
export const sumNat =
  <F, Fp, G, Gp>(alpha: NatK1<F, Fp>, beta: NatK1<G, Gp>): NatK1<['Sum', F, G], ['Sum', Fp, Gp]> => ({
    app: <A>(v: SumVal<F, G, A>): SumVal<Fp, Gp, A> =>
      v._sum === 'L'
        ? { _sum: 'L', left:  alpha.app<A>(v.left) }
        : { _sum: 'R', right: beta.app<A>(v.right) }
  })

// lift α to the left branch only: α ⊕ id
export const sumNatL =
  <F, Fp, G>(alpha: NatK1<F, Fp>): NatK1<['Sum', F, G], ['Sum', Fp, G]> => ({
    app: <A>(v: SumVal<F, G, A>) =>
      v._sum === 'L' ? { _sum: 'L', left: alpha.app<A>(v.left) } : v as any
  })

// lift β to the right branch only: id ⊕ β
export const sumNatR =
  <F, G, Gp>(beta: NatK1<G, Gp>): NatK1<['Sum', F, G], ['Sum', F, Gp]> => ({
    app: <A>(v: SumVal<F, G, A>) =>
      v._sum === 'R' ? { _sum: 'R', right: beta.app<A>(v.right) } : v as any
  })

// α ⊗ β : (F ⊗ G) ⇒ (F' ⊗ G')
export const prodNat =
  <F, Fp, G, Gp>(alpha: NatK1<F, Fp>, beta: NatK1<G, Gp>): NatK1<['Prod', F, G], ['Prod', Fp, Gp]> => ({
    app: <A>(p: ProdVal<F, G, A>): ProdVal<Fp, Gp, A> => ({
      left:  alpha.app<A>(p.left),
      right: beta.app<A>(p.right),
    })
  })

// affect only left / only right
export const prodNatL =
  <F, Fp, G>(alpha: NatK1<F, Fp>): NatK1<['Prod', F, G], ['Prod', Fp, G]> => ({
    app: <A>(p: ProdVal<F, G, A>): ProdVal<Fp, G, A> => ({ left: alpha.app<A>(p.left), right: p.right })
  })

export const prodNatR =
  <F, G, Gp>(beta: NatK1<G, Gp>): NatK1<['Prod', F, G], ['Prod', F, Gp]> => ({
    app: <A>(p: ProdVal<F, G, A>): ProdVal<F, Gp, A> => ({ left: p.left, right: beta.app<A>(p.right) })
  })

// ---------- Minimal Applicative & Traversable (simple version) ----------
export interface SimpleApplicativeK1<G> {
  readonly of:  <A>(a: A) => any /* G<A> */
  readonly map: <A, B>(f: (a: A) => B) => (ga: any /* G<A> */) => any /* G<B> */
  readonly ap:  <A, B>(gf: any /* G<(a:A)=>B> */) => (ga: any /* G<A> */) => any /* G<B> */
}

export interface TraversableK1<F> {
  // Standard shape: traverse :: (A -> G<B>) -> F<A> -> G<F<B>>
  readonly traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => any /* G<B> */) =>
    (fa: any /* F<A> */) => any /* G<F<B>> */
}

// ---------- Promise as Applicative ----------
export const PromiseApp: SimpleApplicativeK1<'Promise'> = {
  of:  <A>(a: A) => Promise.resolve(a),
  map: <A, B>(f: (a: A) => B) => (pa: Promise<A>) => pa.then(f),
  ap:  <A, B>(pf: Promise<(a: A) => B>) => (pa: Promise<A>) =>
        Promise.all([pf, pa]).then(([f, a]) => f(a)),
}

// ---------- Distributive law: F<Promise<A>> -> Promise<F<A>> ----------
export const distributePromiseK1 =
  <F>(T: TraversableK1<F>): NatK1<['Comp', F, 'Promise'], ['Comp', 'Promise', F]> => ({
    app: <A>(fpa: any) =>
      T.traverse(PromiseApp)<any, any>((pa: Promise<A>) => pa)(fpa) // sequence
  })

// Convenience: sequencePromiseK1(F) = distributePromiseK1(F)
export const sequencePromiseK1 = distributePromiseK1

// ---------- Optional: Task endofunctor (using existing Task type) ----------
export const TaskEndo: EndofunctorK1<'Task'> = {
  map: <A, B>(f: (a: A) => B) => (ta: Task<A>): Task<B> => () => ta().then(f)
}
export const TaskApp: SimpleApplicativeK1<'Task'> = {
  of:  <A>(a: A): Task<A> => () => Promise.resolve(a),
  map: <A, B>(f: (a: A) => B) => (ta: Task<A>): Task<B> => () => ta().then(f),
  ap:  <A, B>(tf: Task<(a: A) => B>) => (ta: Task<A>): Task<B> =>
        () => Promise.all([tf(), ta()]).then(([f, a]) => f(a)),
}
export const distributeTaskK1 =
  <F>(T: TraversableK1<F>): NatK1<['Comp', F, 'Task'], ['Comp', 'Task', F]> => ({
    app: <A>(fta: any) =>
      T.traverse(TaskApp)<any, any>((ta: Task<A>) => ta)(fta)
  })

// ---------- Lax 2-functor: post-compose with Promise (needs Traversable on left functor in μ) ----------
export const makePostcomposePromise2 = (
  getTrav: <F>(F: EndofunctorK1<F>) => TraversableK1<F> | null
): LaxTwoFunctorK1 => {
  const H: EndofunctorK1<'Promise'> = { map: PromiseApp.map as any }
  return {
    on1: <F>(F: EndofunctorK1<F>) => composeEndoK1(H, F), // Promise ∘ F
    on2: <F, G>(α: NatK1<F, G>) => ({
      app: <A>(pfa: Promise<any>) => pfa.then((fa: any) => α.app<A>(fa)),
    }),
    eta: () => ({ app: <A>(a: A) => Promise.resolve(a) }),
    mu: <F, G>() => ({
      app: <A>(p_fpg: Promise<any>) =>
        p_fpg.then((fpg: any) => {
          const T = getTrav({} as any) // simplified for now
          if (!T) throw new Error('muFor(Promise): missing Traversable for left functor')
          return sequencePromiseK1(T).app<any>(fpg)
        })
    }),
  }
}

// ---------- Example Traversable: Array ----------
export const TraversableArrayK1: TraversableK1<'Array'> = {
  traverse: <G>(G: SimpleApplicativeK1<G>) => <A, B>(f: (a: A) => any) => (as: ReadonlyArray<A>) =>
    as.reduce(
      (acc: any, a: A) =>
        G.ap(G.map((xs: ReadonlyArray<B>) => (b: B) => [...xs, b])(acc))(f(a)),
      G.of<ReadonlyArray<B>>([])
    )
}

// ---------- Additional Endofunctors for Free Algebra ----------
export const PairEndo = <C>(): EndofunctorK1<['Pair', C]> => ({
  map: <A, B>(f: (a: A) => B) => (p: readonly [C, A]): readonly [C, B] => [p[0], f(p[1])]
})

export const ConstEndo = <C>(): EndofunctorK1<['Const', C]> => ({
  map: <A, B>(_f: (a: A) => B) => (c: C): C => c
})

export const EitherEndo = <E>(): EndofunctorK1<['Either', E]> => ({
  map: <A, B>(f: (a: A) => B) => (eab: Result<E, A>): Result<E, B> => mapR<E, A, B>(f)(eab)
})

// Const functor: Const<C, A> ≅ C (ignores the A parameter)
export type Const<C, A> = C

// Additional strength helpers for Pair and Const
export const strengthEnvFromPair = <E>() => <C>(): StrengthEnv<['Pair', C], E> => ({
  st: <A>(p: readonly [C, Env<E, A>]) => [p[1][0], [p[0], p[1][1]] as const] as const
})

export const strengthEnvFromConst = <E, C>(defaultE: E): StrengthEnv<['Const', C], E> => ({
  st: <A>(_c: C) => [defaultE, _c] as const
})

// Composition strength helper
export const strengthEnvCompose = <E>() => 
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>, sF: StrengthEnv<F, E>, sG: StrengthEnv<G, E>): StrengthEnv<['Comp', F, G], E> => ({
    st: <A>(fg_ea: any) => {
      // F<G<[E,A]>> -> [E, F<G<A>>]
      // First use G's strength to get F<[E, G<A>]>
      const f_ega = F.map((g_ea: any) => sG.st<A>(g_ea))(fg_ea)
      // Then use F's strength to get [E, F<G<A>>]
      return sF.st<any>(f_ega)
    }
  })

// ==================== Comonad K1 ====================
export interface ComonadK1<F> extends EndofunctorK1<F> {
  // counit ε : W<A> -> A
  readonly extract: <A>(fa: any /* F<A> */) => A
  // comultiplication δ : W<A> -> W<W<A>>
  readonly duplicate: <A>(wa: any /* F<A> */) => any /* F<F<A>> */
  // extend (co-Kleisli lift): (W<A> -> B) -> (W<A> -> W<B>)
  readonly extend:  <A, B>(f: (fa: any /* F<A> */) => B) => (fa: any /* F<A> */) => any /* F<B> */
}
export const duplicateK1 =
  <F>(W: ComonadK1<F>) =>
  <A>(wa: any /* F<A> */) => W.extend<any, any>((x) => x)(wa)

// =============== Coalgebras for W ===============
// A coalgebra is a coaction α : A -> W<A> satisfying:
//  (CoCounit)   extract(α(a)) = a
//  (CoAssoc)    duplicate(α(a)) = map(α)(α(a))
export type Coalgebra<W, A> = (a: A) => any /* Kind1<W,A> */

// Morphism of coalgebras f : (A,α) -> (B,β) satisfies:
//   map(f) ∘ α = β ∘ f
export const isCoalgebraMorphism =
  <W>(W: EndofunctorK1<W>) =>
  <A, B>(alpha: Coalgebra<W, A>, beta: Coalgebra<W, B>, f: (a: A) => B, eq: (x: unknown, y: unknown) => boolean) =>
  (a: A): boolean =>
    eq(W.map(f as any)(alpha(a)), beta(f(a)))

// =============== Forgetful functor U : Coalg(W) -> Set ===============
// U "forgets" the coaction: on objects, (A,α) |-> A; on morphisms, f |-> f.
// In TS we model it as identity at runtime; the meaning is in the types.
export const ForgetfulFromCoalgebras =
  <W>(_W: ComonadK1<W>) => ({
    onObject: <A>(_alpha: Coalgebra<W, A>) => (undefined as unknown as A),
    onMorphism: <A, B>(f: (a: A) => B) => f,
  })

// =============== Concrete Comonad: Pair<E,_> (aka Env) ===============
// Env comonad (aka Pair<E,_>)
export const PairComonad =
  <E>(): ComonadK1<['Pair', E]> => ({
    ...PairEndo<E>(),
    extract: <A>(wa: readonly [E, A]) => wa[1],
    duplicate: <A>(wa: readonly [E, A]) => [wa[0], wa] as const,
    extend: <A, B>(f: (w: readonly [E, A]) => B) => (wa: readonly [E, A]) =>
      [wa[0], f(wa)] as const
  })

// =============== Co-Kleisli category ===============
// Co-Kleisli for W
export const CoKleisli =
  <W>(W: ComonadK1<W>) => ({
    id: <A>(): ((a: A) => any /* W<A> */) =>
      (a: A) => W.duplicate(W.map((_x: A) => a)(W.extract as any) as any) /* not used directly */,
    // Better: concrete builders below.
    arr: <A, B>(f: (a: A) => B) => (a: A) => (W as any).extend((_wa: any) => f(a))((W as any).duplicate as any), // rarely used

    // Practical composition: g ∘_CoK f :: A -> W<C>
    compose: <A, B, C>(g: (b: B) => any, f: (a: A) => any) =>
      (a: A) => {
        const wb = f(a)                 // W<B>
        const h  = (_wb: any) => W.extract(g(W.extract(wb))) // B -> C via g; evaluated "around" wb
        return W.extend((_wb: any) => h(_wb))(wb)           // W<C>
      }
  })

// ===============================================================
// Store<S, A> comonad  (aka "indexed context")
//   Intuition: a focus `pos : S` and a total observation `peek : S -> A`.
//   Functor maps *results* (post-compose peek), comonad can:
//     - extract: read A at the current position
//     - duplicate: reindex so every S-point gets its own focused Store
//     - extend: compute B from neighborhoods (co-Kleisli lift)
// ===============================================================
export type Store<S, A> = {
  readonly pos: S
  readonly peek: (s: S) => A
}

// Endofunctor instance for Store<S,_>
export const StoreEndo =
  <S>(): EndofunctorK1<['Store', S]> => ({
    map:
      <A, B>(f: (a: A) => B) =>
      (w: Store<S, A>): Store<S, B> => ({
        pos: w.pos,
        peek: (s: S) => f(w.peek(s)),
      })
  })

// Comonad instance
export const StoreComonad =
  <S>(): ComonadK1<['Store', S]> => {
    const F = StoreEndo<S>()
    return {
      ...F,
      extract: <A>(w: Store<S, A>): A => w.peek(w.pos),
      duplicate: <A>(w: Store<S, A>): Store<S, Store<S, A>> => ({
        pos: w.pos,
        peek: (s: S) => ({ pos: s, peek: w.peek }),
      }),
      extend:
        <A, B>(f: (w: Store<S, A>) => B) =>
        (w: Store<S, A>): Store<S, B> => ({
          pos: w.pos,
          peek: (s: S) => f({ pos: s, peek: w.peek }),
        }),
    }
  }

// Handy helpers
export const seek =
  <S>(s: S) =>
  <A>(w: Store<S, A>): Store<S, A> =>
    ({ pos: s, peek: w.peek })

export const peeks =
  <S>(k: (s: S) => S) =>
  <A>(w: Store<S, A>): Store<S, A> =>
    ({ pos: w.pos, peek: (s: S) => w.peek(k(s)) })

// Build a Store from an array (indexing with clamp)
export const storeFromArray =
  <A>(xs: ReadonlyArray<A>, start = 0): Store<number, A> => {
    const n = xs.length
    if (n === 0) throw new Error('storeFromArray: empty array')
    const clamp = (i: number) => (i < 0 ? 0 : i >= n ? n - 1 : i)
    return {
      pos: clamp(start),
      peek: (i: number) => xs[clamp(i)]!,
    }
  }

// Collect a Store<number, A> into an array snapshot of length n
export const collectStore =
  <A>(n: number) =>
  (w: Store<number, A>): ReadonlyArray<A> =>
    Array.from({ length: n }, (_, i) => seek<number>(i)(w).peek(i))

// ===============================================================
// Co-Kleisli usage: 3-point moving average over a numeric array
//   We "extend" a local computation over the whole Store: each index
//   gets the average of (i-1, i, i+1), clamped at edges.
// ===============================================================
export const movingAvg3 =
  (w: Store<number, number>): Store<number, number> => {
    const WC = StoreComonad<number>()
    const avg = (ctx: Store<number, number>): number => {
      const i = ctx.pos
      const a = ctx.peek(i - 1)
      const b = ctx.peek(i)
      const c = ctx.peek(i + 1)
      return (a + b + c) / 3
    }
    return WC.extend(avg)(w)
  }

// ==================== Env (product) comonad ====================
// A context value E carried along with A
// Note: Using earlier Env type definition from line 486

export const EnvC = {
  map:
    <A, B>(f: (a: A) => B) =>
    <E>(ea: Env<E, A>): Env<E, B> =>
      [ea[0], f(ea[1])] as const,

  extract:
    <E, A>(ea: Env<E, A>): A =>
      ea[1],

  extend:
    <A, B>(f: (w: Env<any, A>) => B) =>
    <E>(ea: Env<E, A>): Env<E, B> =>
      [ea[0], f(ea)] as const,

  duplicate:
    <E, A>(ea: Env<E, A>): Env<E, Env<E, A>> =>
      [ea[0], ea] as const,

} satisfies ComonadK1<'Env'> as any

// Env-specific extras (not part of ComonadK1)
export const EnvExtras = {
  ask:  <E, A>(ea: Env<E, A>): E => ea[0],
  asks: <E, B>(f: (e: E) => B) => <A>(ea: Env<E, A>): B => f(ea[0]),
  local:
    <E>(f: (e: E) => E) =>
    <A>(ea: Env<E, A>): Env<E, A> =>
      [f(ea[0]), ea[1]] as const,
}

// ==================== Traced comonad ====================
// Traced<M,A> ~ (m: M) => A, with monoid M
export type Traced<M, A> = (m: M) => A

export interface Monoid<A> { empty: A; concat: (x: A, y: A) => A }

export const TracedC = <M>(M: Monoid<M>) => ({
  map:
    <A, B>(f: (a: A) => B) =>
    (ta: Traced<M, A>): Traced<M, B> =>
      (m) => f(ta(m)),

  extract:
    <A>(ta: Traced<M, A>): A =>
      ta(M.empty),

  extend:
    <A, B>(f: (w: Traced<M, A>) => B) =>
    (ta: Traced<M, A>): Traced<M, B> =>
      (m) => f((m2: M) => ta(M.concat(m, m2))),

  // extras
  trace:
    <A>(ta: Traced<M, A>) => (m: M): A => ta(m),
})

// ==================== CoKleisli category helpers ====================
// For any comonad W, arrows A ==> B are W<A> -> B
// Composition:   (g ⧑ f)(wa) = g(extend(f)(wa))
// Identity:      extract
export const coKleisli = <F>(W: ComonadK1<F>) => ({
  id:  <A>() => (wa: any /* F<A> */): A => W.extract<A>(wa),
  comp:
    <A, B, C>(g: (wb: any /* F<B> */) => C, f: (wa: any /* F<A> */) => B) =>
    (wa: any /* F<A> */): C =>
      g(W.extend<any, any>(f)(wa)),
})

// ================= Cofree over a FunctorK1 =================
// Assumes your HKT aliases: HK.Id1, HK.Kind1, and FunctorK1<F> { map }

export type Cofree<F extends HK.Id1, A> = {
  readonly head: A
  readonly tail: HK.Kind1<F, Cofree<F, A>>
}

export const CofreeK1 = <F extends HK.Id1>(F: FunctorK1<F>) => {
  const map =
    <A, B>(f: (a: A) => B) =>
    (w: Cofree<F, A>): Cofree<F, B> =>
      ({ head: f(w.head), tail: F.map(map(f))(w.tail) })

  const extract =
    <A>(w: Cofree<F, A>): A =>
      w.head

  const extend =
    <A, B>(g: (w: Cofree<F, A>) => B) =>
    (w: Cofree<F, A>): Cofree<F, B> =>
      ({ head: g(w), tail: F.map(extend(g))(w.tail) })

  const duplicate = <A>(w: Cofree<F, A>): Cofree<F, Cofree<F, A>> =>
    extend<A, Cofree<F, A>>((x) => x)(w)

  // unfold (cofree-ana): ψ : S -> [A, F<S>]
  const unfold =
    <S, A>(psi: (s: S) => readonly [A, HK.Kind1<F, S>]) =>
    (s0: S): Cofree<F, A> => {
      const [a, fs] = psi(s0)
      return { head: a, tail: F.map(unfold(psi))(fs) }
    }

  // fold (cofree-cata): φ : F<B> -> B  and  h : [A, B] -> B
  //   combine head & folded tail
  const cata =
    <A, B>(phi: (fb: HK.Kind1<F, B>) => B, h: (a: A, b: B) => B) =>
    (w: Cofree<F, A>): B =>
      h(w.head, phi(F.map(cata(phi, h))(w.tail)))

  // limit (materialize N layers)
  const take =
    (n: number) =>
    <A>(w: Cofree<F, A>): Cofree<F, A> =>
      n <= 0 ? w : ({ head: w.head, tail: F.map(take(n - 1))(w.tail) })

  // change base functor via natural transformation F ~> G
  const hoist =
    <G extends HK.Id1>(G: FunctorK1<G>) =>
    (nt: <X>(fx: HK.Kind1<F, X>) => HK.Kind1<G, X>) => {
      const go = <A>(w: Cofree<F, A>): Cofree<G, A> =>
        ({ head: w.head, tail: G.map(go)(nt(w.tail)) })
      return go
    }

  return { map, extract, extend, duplicate, unfold, cata, take, hoist }
}

// ================= Store × Lens helpers =================
// Given your Lens<S, T> = { get: (s:S)=>T; set: (t:T)=>(s:S)=>S }
// and Store<S, A> = { peek: (s:S)=>A; pos: S }

export const StoreLens = {
  /** Focus a Store<S, A> down to the sub-position T via a lens. */
  focus:
    <S, T>(ln: Lens<S, T>) =>
    <A>(sa: Store<S, A>): Store<T, A> => ({
      peek: (t: T) => sa.peek(ln.set(t)(sa.pos)),
      pos: ln.get(sa.pos),
    }),

  /** Move along the lens: replace the sub-position T at the current S. */
  move:
    <S, T>(ln: Lens<S, T>) =>
    (t: T) =>
    <A>(sa: Store<S, A>): Store<S, A> =>
      ({ peek: sa.peek, pos: ln.set(t)(sa.pos) }),

  /** Transform the sub-position by a function T->T at current focus. */
  seeks:
    <S, T>(ln: Lens<S, T>) =>
    (k: (t: T) => T) =>
    <A>(sa: Store<S, A>): Store<S, A> =>
      ({ peek: sa.peek, pos: ln.set(k(ln.get(sa.pos)))(sa.pos) }),

  /** Peek at the A you'd get if the sub-position were set to a given T. */
  peekSub:
    <S, T>(ln: Lens<S, T>) =>
    (t: T) =>
    <A>(sa: Store<S, A>): A =>
      sa.peek(ln.set(t)(sa.pos)),

  /** Experiment: sample many sub-positions and collect their A's. */
  experiment:
    <S, T>(ln: Lens<S, T>) =>
    (alts: (t: T) => ReadonlyArray<T>) =>
    <A>(sa: Store<S, A>): ReadonlyArray<A> => {
      const t0 = ln.get(sa.pos)
      return alts(t0).map((t) => sa.peek(ln.set(t)(sa.pos)))
    },
}

// ================ Co-Do builder for any ComonadK1 =================

export type CoBuilder<F, A0, A> = {
  /** co-Kleisli composition: then(g) = g ⧑ current */
  then: <B>(g: (wb: any /* F<A> */) => B) => CoBuilder<F, A0, B>
  /** post-map the final result */
  map:  <B>(f: (a: A) => B) => CoBuilder<F, A0, B>
  /** side-effect on the final result (keeps A) */
  tap:  (f: (a: A) => void) => CoBuilder<F, A0, A>
  /** finish: the composed arrow F<A0> -> A */
  done: (wa: any /* F<A0> */) => A
}

export const DoCo = <F>(W: ComonadK1<F>) => {
  const Co = coKleisli(W)

  type Arrow<A0, A> = (wa: any /* F<A0> */) => A

  const make = <A0, A>(arrow: Arrow<A0, A>): CoBuilder<F, A0, A> => ({
    then: (g) => make(Co.comp(g, arrow)),
    map:  (f) => make((wa) => f(arrow(wa))),
    tap:  (f) => make((wa) => { const a = arrow(wa); f(a); return a }),
    done: arrow,
  })

  return {
    /** Start a pipeline: identity co-Kleisli arrow (extract). */
    start: <A>() => make<A, A>(Co.id<A>()),
  }
}

// ================= Cofree over ExprF with annotations =================
// Assumes you have FunctorK1<'ExprF'> and CofreeK1 already available

// ---------- helpers: enumerate children for ExprF ----------
type CofreeExpr<A> = Cofree<'ExprF', A>
type ExprKids<A> = HK.Kind1<'ExprF', CofreeExpr<A>> // = ExprF<Cofree<'ExprF',A>>

const childrenExprF = <A>(fa: ExprKids<A>): ReadonlyArray<CofreeExpr<A>> => {
  switch ((fa as any)._tag) {
    case 'Lit': return []
    case 'Add': return [(fa as any).left, (fa as any).right]
    case 'Mul': return [(fa as any).left, (fa as any).right]
    // extend here for Var/Let/Div/AddN/MulN/... if you have them
    default: return []
  }
}

// ---------- build Cofree tree from your Fix1<'ExprF'> ----------
export const toCofreeExpr =
  (ExprFK: FunctorK1<'ExprF'>) =>
  (t: Fix1<'ExprF'>): CofreeExpr<void> => {
    const CF = CofreeK1(ExprFK)
    return CF.unfold<Fix1<'ExprF'>, void>((node) => [undefined, node.un])(t)
  }

// ---------- annotate with {size, depth} using extend ----------
export type ExprAnn = { readonly size: number; readonly depth: number }

export const annotateExprSizeDepth =
  (ExprFK: FunctorK1<'ExprF'>) =>
  (w0: CofreeExpr<void>): CofreeExpr<ExprAnn> => {
    const CF = CofreeK1(ExprFK)
    function ann(w: CofreeExpr<any>): ExprAnn {
      const ks = childrenExprF(w.tail).map(ann)
      const size = 1 + ks.reduce((n, k) => n + k.size, 0)
      const depth = 1 + (ks.length ? Math.max(...ks.map(k => k.depth)) : 0)
      return { size, depth }
    }
    return CF.extend(ann)(w0)
  }

// ================= Cofree Zipper for ExprF =================
// Minimal, focused on Lit | Add | Mul. Add frames for any extra constructors you have.

// ---------- Zipper over Cofree<'ExprF',A> ----------
type FrameExpr<A> =
  | { _tag: 'AddL'; right: CofreeExpr<A> }
  | { _tag: 'AddR'; left:  CofreeExpr<A> }
  | { _tag: 'MulL'; right: CofreeExpr<A> }
  | { _tag: 'MulR'; left:  CofreeExpr<A> }

export type ZipperExpr<A> = {
  readonly focus: CofreeExpr<A>
  readonly crumbs: ReadonlyArray<FrameExpr<A>>
}

export const ZipperExpr = {
  fromRoot: <A>(root: CofreeExpr<A>): ZipperExpr<A> => ({ focus: root, crumbs: [] }),

  // rebuild a node from a child + a frame
  privateRebuild:
    <A>(child: CofreeExpr<A>, frame: FrameExpr<A>): CofreeExpr<A> => {
      switch (frame._tag) {
        case 'AddL': return { head: (frame.right.head as any), // keep parent head as-is; you can choose policy
                            tail: { _tag: 'Add', left: child, right: frame.right } as any }
        case 'AddR': return { head: (frame.left.head as any),
                            tail: { _tag: 'Add', left: frame.left, right: child } as any }
        case 'MulL': return { head: (frame.right.head as any),
                            tail: { _tag: 'Mul', left: child, right: frame.right } as any }
        case 'MulR': return { head: (frame.left.head as any),
                            tail: { _tag: 'Mul', left: frame.left, right: child } as any }
      }
    },

  // try to go down-left / down-right where applicable
  downLeft: <A>(z: ZipperExpr<A>): ZipperExpr<A> => {
    const t = z.focus.tail as any
    switch (t._tag) {
      case 'Add': return { focus: t.left, crumbs: [{ _tag:'AddL', right: t.right }, ...z.crumbs] }
      case 'Mul': return { focus: t.left, crumbs: [{ _tag:'MulL', right: t.right }, ...z.crumbs] }
      default:    return z
    }
  },

  downRight: <A>(z: ZipperExpr<A>): ZipperExpr<A> => {
    const t = z.focus.tail as any
    switch (t._tag) {
      case 'Add': return { focus: t.right, crumbs: [{ _tag:'AddR', left: t.left }, ...z.crumbs] }
      case 'Mul': return { focus: t.right, crumbs: [{ _tag:'MulR', left: t.left }, ...z.crumbs] }
      default:    return z
    }
  },

  up: <A>(z: ZipperExpr<A>): ZipperExpr<A> => {
    const [f, ...rest] = z.crumbs
    if (!f) return z
    return { focus: ZipperExpr.privateRebuild(z.focus, f), crumbs: rest }
  },

  // apply function to focus head (annotation/value) only
  mapHead: <A, B>(f: (a: A) => B) => (z: ZipperExpr<A>): ZipperExpr<B> => ({
    focus: { head: f(z.focus.head), tail: z.focus.tail as any },
    crumbs: z.crumbs as any
  }),

  // replace focus entirely
  replace: <A>(focus: CofreeExpr<A>) => (z: ZipperExpr<A>): ZipperExpr<A> => ({ focus, crumbs: z.crumbs }),

  // rebuild full tree by walking up
  toTree: <A>(z: ZipperExpr<A>): CofreeExpr<A> => {
    let cur = z
    while (cur.crumbs.length) cur = ZipperExpr.up(cur)
    return cur.focus
  },
}

// ============== DoCoBind — record-building Co-Do for any ComonadK1 =============

type _Merge<A, B> = { readonly [K in keyof A | keyof B]:
  K extends keyof B ? B[K] : K extends keyof A ? A[K] : never }

export type DoCoBuilder<F, A0, T> = {
  /** bind: run a co-Kleisli arrow on W<T> and add its result under key K */
  bind: <K extends string, A>(k: K, h: (wT: any /* W<T> */) => A)
      => DoCoBuilder<F, A0, _Merge<T, { readonly [P in K]: A }>>
  /** alias */
  apS:  <K extends string, A>(k: K, h: (wT: any /* W<T> */) => A)
      => DoCoBuilder<F, A0, _Merge<T, { readonly [P in K]: A }>>
  /** let: add a pure field computed from T */
  let:  <K extends string, A>(k: K, f: (t: T) => A)
      => DoCoBuilder<F, A0, _Merge<T, { readonly [P in K]: A }>>
  /** map final record */
  map:  <B>(f: (t: T) => B) => DoCoBuilder<F, A0, B>
  /** side-effect on final record */
  tap:  (f: (t: T) => void) => DoCoBuilder<F, A0, T>
  /** finish: composed co-Kleisli arrow W<A0> -> T */
  done: (wa: any /* W<A0> */) => T
}

export const DoCoBind = <F>(W: ComonadK1<F>) => {
  const make = <A0, T>(arrow: (wa: any) => T): DoCoBuilder<F, A0, T> => ({
    bind: (k, h) =>
      make<A0, any>((wa) => {
        const t  = arrow(wa)                                  // T
        const wT = W.extend((_wa: any) => arrow(_wa))(wa)     // W<T>
        const a  = h(wT)
        return { ...(t as any), [k]: a } as const
      }),

    apS: (k, h) =>
      make<A0, any>((wa) => {
        const t  = arrow(wa)
        const wT = W.extend((_wa: any) => arrow(_wa))(wa)
        const a  = h(wT)
        return { ...(t as any), [k]: a } as const
      }),

    let: (k, f) =>
      make<A0, any>((wa) => {
        const t = arrow(wa)
        return { ...(t as any), [k]: f(t) } as const
      }),

    map: (f) => make<A0, any>((wa) => f(arrow(wa))),

    tap: (f) => make<A0, T>((wa) => {
      const t = arrow(wa); f(t); return t
    }),

    done: arrow,
  })

  return {
    /** start with empty record {} */
    startEmpty: <A0>() => make<A0, {}>((_) => ({} as const)),
    /** start from an initial projection */
    startWith:  <A0, T>(init: (wa: any /* W<A0> */) => T) => make<A0, T>(init),
  }
}

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

export const DoReader = <R>() => {
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





// --------- Examples for JsonF ---------

// 1) Pretty-print via cata
export const ppJson: (j: Json) => string =
  cataJson<string>((f) => {
    switch (f._tag) {
      case 'JNull': return 'null'
      case 'JUndefined': return 'undefined'
      case 'JBool': return String(f.value)
      case 'JNum':  return String(f.value)
      case 'JDec':  return f.decimal
      case 'JStr':  return JSON.stringify(f.value)
      case 'JBinary': return `"base64(${f.base64})"`
      case 'JRegex': return `"/${f.pattern}/${f.flags ?? ''}"`
      case 'JDate':  return `"${new Date(f.iso).toISOString()}"`
      case 'JArr':  return `[${f.items.join(', ')}]`
      case 'JSet':  return `Set[${f.items.join(', ')}]`
      case 'JObj':  return `{${f.entries.map(([k,v]) => JSON.stringify(k)+': '+v).join(', ')}}`
    }
  })

// 2) Count total nodes via cata
export const sizeJson: (j: Json) => number =
  cataJson<number>((f) => {
    switch (f._tag) {
      case 'JNull':
      case 'JUndefined':
      case 'JBool':
      case 'JNum':
      case 'JDec':
      case 'JStr':
      case 'JBinary':
      case 'JRegex':
      case 'JDate':
        return 1
      case 'JArr':
      case 'JSet':
        return 1 + f.items.reduce((n, x) => n + x, 0)
      case 'JObj':
        return 1 + f.entries.reduce((n, [,v]) => n + v, 0)
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
    case 'JUndefined': return 'undefined'
    case 'JBool': return String(f.value)
    case 'JNum':  return String(f.value)
    case 'JDec':  return f.decimal   // or `"dec(" + f.decimal + ")"` if you want to mark it
    case 'JStr':  return JSON.stringify(f.value)
    case 'JBinary': return `"base64(${f.base64})"`
    case 'JRegex': return `"/${f.pattern}/${f.flags ?? ''}"`
    case 'JDate':  return `"${new Date(f.iso).toISOString()}"`
    case 'JArr':  return `[${f.items.join(', ')}]`
    case 'JSet':  return `Set[${f.items.join(', ')}]`
    case 'JObj':  return `{${f.entries.map(([k,v]) => JSON.stringify(k)+': '+v).join(', ')}}`
  }
}
export const prettyJson = cataJson(Alg_Json_pretty)

// 2) Size: count every node (scalars/arrays/objects)
export const Alg_Json_size: JsonAlgebra<number> = (f) => {
  switch (f._tag) {
    case 'JNull':
    case 'JUndefined':
    case 'JBool':
    case 'JNum':
    case 'JDec':
    case 'JStr':
    case 'JBinary':
    case 'JRegex':
    case 'JDate':
      return 1
    case 'JArr':
    case 'JSet':
      return 1 + f.items.reduce((n, x) => n + x, 0)
    case 'JObj':
      return 1 + f.entries.reduce((n, [,v]) => n + v, 0)
  }
}
export const sizeJsonReusable = cataJson(Alg_Json_size)

// 3) Collect all string leaves
export const Alg_Json_collectStrings: JsonAlgebra<ReadonlyArray<string>> = (f) => {
  switch (f._tag) {
    case 'JStr':   return [f.value]
    case 'JArr':   return f.items.flat()
    case 'JSet':   return f.items.flat()
    case 'JObj':   return f.entries.flatMap(([,v]) => v)
    // leaves that don't carry strings contribute nothing:
    case 'JNull':
    case 'JUndefined':
    case 'JBool':
    case 'JNum':
    case 'JDec':
    case 'JBinary':
    case 'JRegex':
    case 'JDate':
      return []
  }
}
export const collectStrings = cataJson(Alg_Json_collectStrings)

// Alias for consistency with the new naming
export const Alg_Json_collectStrs = Alg_Json_collectStrings

// Maximum depth
export const Alg_Json_depth = (f: JsonF<number>): number => {
  switch (f._tag) {
    case 'JNull':
    case 'JUndefined':
    case 'JBool':
    case 'JNum':
    case 'JDec':
    case 'JStr':
    case 'JBinary':
    case 'JRegex':
    case 'JDate':
      return 1
    case 'JArr':
    case 'JSet':
      return 1 + (f.items.length ? Math.max(...f.items) : 0)
    case 'JObj':
      return 1 + (f.entries.length ? Math.max(...f.entries.map(([,v]) => v)) : 0)
  }
}

// Convenience functions for the new algebras
export const sizeJsonNew = cataJson(Alg_Json_size)
export const strsJson = cataJson(Alg_Json_collectStrings)
export const depthJson = cataJson(Alg_Json_depth)

// Product algebra: runs two algebras in lockstep with payload consistency
export const productJsonAlg2 =
  <B, C>(algB: (fb: JsonF<B>) => B, algC: (fc: JsonF<C>) => C) =>
  (fbc: JsonF<readonly [B, C]>): readonly [B, C] => {
    switch (fbc._tag) {
      // LEAVES: forward identical payload to both algebras
      case 'JNull':      return [algB({ _tag: 'JNull' }),      algC({ _tag: 'JNull' })]
      case 'JUndefined': return [algB({ _tag: 'JUndefined' }), algC({ _tag: 'JUndefined' })]
      case 'JBool':      return [algB({ _tag: 'JBool',  value: fbc.value }),
                                 algC({ _tag: 'JBool',  value: fbc.value })]
      case 'JNum':       return [algB({ _tag: 'JNum',   value: fbc.value }),
                                 algC({ _tag: 'JNum',   value: fbc.value })]
      case 'JDec':       return [algB({ _tag: 'JDec',   decimal: fbc.decimal }),
                                 algC({ _tag: 'JDec',   decimal: fbc.decimal })]
      case 'JStr':       return [algB({ _tag: 'JStr',   value: fbc.value }),
                                 algC({ _tag: 'JStr',   value: fbc.value })]
      case 'JBinary':    return [algB({ _tag: 'JBinary', base64: fbc.base64 }),
                                 algC({ _tag: 'JBinary', base64: fbc.base64 })]
      case 'JRegex':     return [algB({ _tag: 'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) }),
                                 algC({ _tag: 'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) })]
      case 'JDate':      return [algB({ _tag: 'JDate', iso: fbc.iso }),
                                 algC({ _tag: 'JDate', iso: fbc.iso })]

      // RECURSIVE: map children's left/right parts separately
      case 'JArr': {
        const left  = fbc.items.map(([b]) => b)
        const right = fbc.items.map(([, c]) => c)
        return [algB({ _tag: 'JArr', items: left }),
                algC({ _tag: 'JArr', items: right })]
      }
      case 'JSet': {
        const left  = fbc.items.map(([b]) => b)
        const right = fbc.items.map(([, c]) => c)
        return [algB({ _tag: 'JSet', items: left }),
                algC({ _tag: 'JSet', items: right })]
      }
      case 'JObj': {
        const left  = fbc.entries.map(([k, [b]]) => [k, b] as const)
        const right = fbc.entries.map(([k, [, c]]) => [k, c] as const)
        return [algB({ _tag: 'JObj', entries: left }),
                algC({ _tag: 'JObj', entries: right })]
      }
    }
  }

// Legacy product algebra (kept for compatibility)
export const productJsonAlg2Regular = productJsonAlg2

// Size & depth in a single traversal
export const sizeAndDepthJson = cataJson(productJsonAlg2(Alg_Json_size, Alg_Json_depth))

// Strings & size in a single traversal
export const strsAndSizeJson = cataJson(productJsonAlg2(Alg_Json_collectStrs, Alg_Json_size))

// ====================================================================
// Canonicalization fold for Json
// ====================================================================

// Policy threading for canonicalization
export type CanonicalPolicy = Readonly<{
  sortObjects?: boolean            // default: true
  dedupSets?: boolean              // default: true
  sortSets?: boolean               // default: true
  normalizeRegexFlags?: boolean    // default: true
}>

const defaultPolicy: Required<CanonicalPolicy> = {
  sortObjects: true,
  dedupSets: true,
  sortSets: true,
  normalizeRegexFlags: true,
}

/** Stable, deterministic canonicalization for Json:
 *  - JObj: sort keys lexicographically
 *  - JSet: deduplicate (by structural key) and sort
 *  - JRegex: normalize flags by sorting/uniquing
 *  Leaves (Null/Undefined/Bool/Num/Dec/Str/Binary) unchanged.
 */

// Build a stable string key for a *canonical* Json node.
// We encode to EJSON and JSON.stringify it. Because canonicalization
// sorts keys and set items first, this string is stable.
const _canonicalStableKey = (j: Json): string => {
  const ej = toEJsonCanonical(j) // defined below
  return JSON.stringify(ej)
}

// normalize regex flags (dedupe + sort)
const _normFlags = (flags?: string): string | undefined => {
  if (!flags) return undefined
  const uniq = Array.from(new Set(flags.split('')))
  uniq.sort()
  return uniq.join('') || undefined
}

// Policy-aware canonicalization
export const canonicalizeJsonP =
  (policy: CanonicalPolicy = {}): ((j: Json) => Json) => {
    const P = { ...defaultPolicy, ...policy }
    const normFlags = (f: string | undefined) =>
      !P.normalizeRegexFlags || !f ? f : Array.from(new Set(f.split(''))).sort().join('') || undefined

    return cataJson<Json>((f) => {
      switch (f._tag) {
        case 'JNull':      return jNull()
        case 'JUndefined': return jUndef()
        case 'JBool':      return jBool(f.value)
        case 'JNum':       return jNum(f.value)
        case 'JDec':       return jDec(f.decimal)
        case 'JStr':       return jStr(f.value)
        case 'JBinary':    return jBinary(f.base64)
        case 'JRegex':     return jRegex(f.pattern, normFlags(f.flags))
        case 'JDate':      return jDate(f.iso)

        case 'JArr': {
          // arrays keep order; children are already canonical
          return jArr(f.items)
        }

        case 'JSet': {
          let xs = f.items
          if (P.dedupSets) {
            const m = new Map(xs.map(x => [canonicalKey(x), x]))
            xs = [...m.values()]
          }
          if (P.sortSets) {
            xs = [...xs].sort(compareCanonical)
          }
          return jSet(xs)
        }

        case 'JObj': {
          const es = P.sortObjects ? [...f.entries].sort(([a],[b]) => a<b?-1:a>b?1:0) : f.entries
          return jObj(es)
        }
      }
    })
  }

// Keep existing default function delegating to policyful version
export const canonicalizeJson = (j: Json): Json => canonicalizeJsonP()(j)

// ====================================================================
// EJSON-like encoder/decoder pair
// ====================================================================

// ------------------------
// EJSON-like encoder
// ------------------------
export const toEJson = (j: Json): unknown => {
  const go = cataJson<unknown>((f) => {
    switch (f._tag) {
      case 'JNull':      return null
      case 'JUndefined': return { $undefined: true }
      case 'JBool':      return f.value
      case 'JNum':       return f.value
      case 'JDec':       return { $decimal: f.decimal }
      case 'JStr':       return f.value
      case 'JBinary':    return { $binary: f.base64 }
      case 'JRegex':     return f.flags ? { $regex: f.pattern, $flags: f.flags } : { $regex: f.pattern }
      case 'JDate':      return { $date: f.iso }
      case 'JArr':       return f.items
      case 'JSet':       return { $set: f.items }
      case 'JObj':       return Object.fromEntries(f.entries)
    }
  })
  return go(j)
}

// canonical encoder (stable object key order & set order)
export const toEJsonCanonical = (j: Json): unknown =>
  toEJson(canonicalizeJson(j))

// encoder that accepts an optional policy
export const toEJsonCanonicalWithPolicy = (j: Json, policy?: CanonicalPolicy): unknown =>
  toEJson(canonicalizeJsonP(policy)(j))

// ------------------------
// Decoder with error aggregation:
//   fromEJson(u) -> Result<string[], Json>
// ------------------------

type V<A> = Validation<string, A>
const concatStrs = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => [...a, ...b]

const V_of = <A>(a: A): V<A> => VOk(a) as any
const V_err = (m: string): V<never> => VErr(m)

const sequenceV = <A>(vs: ReadonlyArray<V<A>>): V<ReadonlyArray<A>> => {
  const out: A[] = []
  let errs: string[] | null = null
  for (const v of vs) {
    if (isVOk(v)) out.push(v.value as A)
    else errs = errs ? concatStrs(errs, v.errors as string[]) : [...(v.errors as string[])]
  }
  return errs ? VErr(...errs) : VOk(out as ReadonlyArray<A>) as any
}

const isPlainObj = (u: unknown): u is Record<string, unknown> =>
  typeof u === 'object' && u !== null && !Array.isArray(u)

const exactKeys = (o: Record<string, unknown>, required: string[], optional: string[] = []): boolean => {
  const ks = Object.keys(o).sort()
  const need = [...required].sort()
  // all required present?
  if (!need.every(k => ks.includes(k))) return false
  // no unexpected keys?
  const allowed = new Set([...required, ...optional])
  return ks.every(k => allowed.has(k))
}

const decodeValueV = (u: unknown): V<Json> => {
  // null
  if (u === null) return V_of(jNull())
  // boolean
  if (typeof u === 'boolean') return V_of(jBool(u))
  // number (must be finite)
  if (typeof u === 'number') {
    return Number.isFinite(u) ? V_of(jNum(u)) : V_err(`non-finite number: ${String(u)}`)
  }
  // string
  if (typeof u === 'string') return V_of(jStr(u))
  // array
  if (Array.isArray(u)) {
    const elems = sequenceV(u.map(decodeValueV))
    return isVOk(elems) ? V_of(jArr(elems.value)) : elems as any
  }
  // object-ish
  if (isPlainObj(u)) {
    // tagged forms (must be exact)
    if (exactKeys(u, ['$undefined'])) {
      return u['$undefined'] === true ? V_of(jUndef()) : V_err(`$undefined must be true`)
    }
    if (exactKeys(u, ['$decimal'])) {
      const v = u['$decimal']
      return typeof v === 'string'
        ? V_of(jDec(v))
        : V_err(`$decimal must be string`)
    }
    if (exactKeys(u, ['$binary'])) {
      const v = u['$binary']
      return typeof v === 'string'
        ? V_of(jBinary(v))
        : V_err(`$binary must be string (base64)`)
    }
    if (exactKeys(u, ['$regex'], ['$flags'])) {
      const p = u['$regex'], f = u['$flags']
      if (typeof p !== 'string') return V_err(`$regex must be string`)
      if (f !== undefined && typeof f !== 'string') return V_err(`$flags must be string`)
      return V_of(jRegex(p, f as string | undefined))
    }
    if (exactKeys(u, ['$set'])) {
      const arr = u['$set']
      if (!Array.isArray(arr)) return V_err(`$set must be array`)
      const vs = sequenceV(arr.map(decodeValueV))
      return isVOk(vs) ? V_of(jSet(vs.value)) : vs as any
    }
    // plain object: decode each value
    const entries = Object.entries(u)
    const decoded = sequenceV(entries.map(([k, v]) => {
      const vResult = decodeValueV(v)
      return isVOk(vResult) ? V_of([k, vResult.value] as const) : vResult as any
    }))
    return isVOk(decoded) ? V_of(jObj(decoded.value as ReadonlyArray<readonly [string, Json]>)) : decoded as any
  }
  // otherwise
  return V_err(`unsupported value: ${Object.prototype.toString.call(u)}`)
}

export const fromEJson = (u: unknown): Result<ReadonlyArray<string>, Json> => {
  const v = decodeValueV(u)
  return isVOk(v) ? Ok(v.value) : Err(v.errors as ReadonlyArray<string>)
}

// ====================================================================
// Canonical utilities: equality, hash, hash-consing
// ====================================================================

// Stable canonical key = JSON of the canonical EJSON encoding
export const canonicalKey = (j: Json): string =>
  JSON.stringify(toEJsonCanonical(j))

// Canonical equality & ordering (lexicographic on canonical key)
export const equalsCanonical = (a: Json, b: Json): boolean =>
  canonicalKey(a) === canonicalKey(b)

export const compareCanonical = (a: Json, b: Json): number => {
  const ka = canonicalKey(a), kb = canonicalKey(b)
  return ka < kb ? -1 : ka > kb ? 1 : 0
}

// FNV-1a 32-bit hash (deterministic across platforms)
const _fnv1a32 = (s: string): number => {
  let h = 0x811c9dc5 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    // h *= 16777619 mod 2^32
    h = (h + ((h << 1) >>> 0) + ((h << 4) >>> 0) + ((h << 7) >>> 0) + ((h << 8) >>> 0) + ((h << 24) >>> 0)) >>> 0
  }
  return h >>> 0
}

const _hex8 = (n: number): string =>
  (n >>> 0).toString(16).padStart(8, '0')

// Public hash helpers (string form is convenient as a Map key)
export const hashCanonicalNum = (j: Json): number =>
  _fnv1a32(canonicalKey(j))

export const hashCanonical = (j: Json): string =>
  _hex8(hashCanonicalNum(j))

// Rebuild a Json node from a JsonF whose children are already Json
const _rebuildFromF = (f: JsonF<Json>): Json => {
  switch (f._tag) {
    case 'JNull':      return jNull()
    case 'JUndefined': return jUndef()
    case 'JBool':      return jBool(f.value)
    case 'JNum':       return jNum(f.value)
    case 'JDec':       return jDec(f.decimal)
    case 'JStr':       return jStr(f.value)
    case 'JBinary':    return jBinary(f.base64)
    case 'JRegex':     return jRegex(f.pattern, f.flags)
    case 'JDate':      return jDate(f.iso)
    case 'JArr':       return jArr(f.items)
    case 'JSet':       return jSet(f.items)
    case 'JObj':       return jObj(f.entries)
  }
}

/** Hash-consing: share identical subtrees.
 *  - Canonicalize each rebuilt node
 *  - Use canonicalKey as the memo key
 *  - Return the pooled (shared) node
 */
export const hashConsJson = (j: Json, pool?: Map<string, Json>): Json => {
  const P = pool ?? new Map<string, Json>()
  const go = cataJson<Json>((f) => {
    // children are already deduped; rebuild this node
    const node  = _rebuildFromF(f)
    const canon = canonicalizeJson(node)
    const key   = canonicalKey(canon)
    const hit   = P.get(key)
    if (hit) return hit
    P.set(key, canon)
    return canon
  })
  return go(j)
}

// =========================================================
// Canonical containers for Json
//  - CanonicalJsonMap<V>: Map-like, keys are canonical Json
//  - CanonicalJsonSet:    Set-like, elements are canonical Json
// Notes:
//  * Keys/elements are stored canonicalized (and hash-consed).
//  * Equality is equalsCanonical; iteration is insertion order.
//  * Backing Map is keyed by canonicalKey(j).
// =========================================================

export class CanonicalJsonMap<V> implements Iterable<readonly [Json, V]> {
  private readonly buckets = new Map<string, { k: Json; v: V }>()
  private readonly pool = new Map<string, Json>() // share identical subtrees across inserts

  constructor(init?: Iterable<readonly [Json, V]>) {
    if (init) for (const [k, v] of init) this.set(k, v)
  }

  get size(): number { return this.buckets.size }
  clear(): void { this.buckets.clear() }

  has(key: Json): boolean {
    const c = canonicalizeJson(key)
    return this.buckets.has(canonicalKey(c))
  }

  get(key: Json): V | undefined {
    const c = canonicalizeJson(key)
    const e = this.buckets.get(canonicalKey(c))
    return e?.v
  }

  set(key: Json, value: V): this {
    // canonicalize + hash-cons so we physically share equal subtrees
    const c0 = canonicalizeJson(key)
    const c  = hashConsJson(c0, this.pool)
    this.buckets.set(canonicalKey(c), { k: c, v: value })
    return this
  }

  delete(key: Json): boolean {
    const c = canonicalizeJson(key)
    return this.buckets.delete(canonicalKey(c))
  }

  // Iteration (insertion order)
  *keys(): IterableIterator<Json> {
    for (const { k } of this.buckets.values()) yield k
  }
  *values(): IterableIterator<V> {
    for (const { v } of this.buckets.values()) yield v
  }
  *entries(): IterableIterator<readonly [Json, V]> {
    for (const { k, v } of this.buckets.values()) yield [k, v] as const
  }
  [Symbol.iterator](): IterableIterator<readonly [Json, V]> { return this.entries() }

  forEach(cb: (value: V, key: Json, map: this) => void, thisArg?: unknown): void {
    for (const { k, v } of this.buckets.values()) cb.call(thisArg, v, k, this)
  }

  // Convenience upsert
  upsert(key: Json, onMissing: () => V, onHit?: (v: V) => V): V {
    const c0 = canonicalizeJson(key)
    const c  = hashConsJson(c0, this.pool)
    const ck = canonicalKey(c)
    const hit = this.buckets.get(ck)
    if (hit) {
      if (onHit) hit.v = onHit(hit.v)
      return hit.v
    }
    const nv = onMissing()
    this.buckets.set(ck, { k: c, v: nv })
    return nv
  }

  static from<V>(iter: Iterable<readonly [Json, V]>): CanonicalJsonMap<V> {
    return new CanonicalJsonMap(iter)
  }
}

export class CanonicalJsonSet implements Iterable<Json> {
  private readonly m = new CanonicalJsonMap<true>()

  constructor(init?: Iterable<Json>) {
    if (init) for (const x of init) this.add(x)
  }

  get size(): number { return this.m.size }
  clear(): void { this.m.clear() }
  has(x: Json): boolean { return this.m.has(x) }
  add(x: Json): this { this.m.set(x, true); return this }
  delete(x: Json): boolean { return this.m.delete(x) }

  *keys(): IterableIterator<Json> { yield* this.m.keys() }
  *values(): IterableIterator<Json> { yield* this.m.keys() }
  *entries(): IterableIterator<readonly [Json, Json]> {
    for (const k of this.m.keys()) yield [k, k] as const
  }
  [Symbol.iterator](): IterableIterator<Json> { return this.values() }

  forEach(cb: (value: Json, value2: Json, set: this) => void, thisArg?: unknown): void {
    for (const k of this.m.keys()) cb.call(thisArg, k, k, this)
  }

  static from(iter: Iterable<Json>): CanonicalJsonSet {
    return new CanonicalJsonSet(iter)
  }
}

// =========================================================
// Canonical multimap (Json → many V)
// Backed by CanonicalJsonMap<ReadonlyArray<V>> with upsert.
// =========================================================
export class CanonicalJsonMultiMap<V> implements Iterable<readonly [Json, ReadonlyArray<V>]> {
  private readonly m = new CanonicalJsonMap<ReadonlyArray<V>>()

  constructor(init?: Iterable<readonly [Json, V]>) {
    if (init) for (const [k, v] of init) this.add(k, v)
  }

  get size(): number { return this.m.size }
  clear(): void { this.m.clear() }

  get(key: Json): ReadonlyArray<V> {
    return this.m.get(key) ?? []
  }

  add(key: Json, value: V): this {
    this.m.upsert(key, () => [value], (xs) => [...xs, value])
    return this
  }

  addAll(key: Json, values: ReadonlyArray<V>): this {
    if (values.length === 0) return this
    this.m.upsert(key, () => [...values], (xs) => [...xs, ...values])
    return this
  }

  setList(key: Json, values: ReadonlyArray<V>): this {
    this.m.set(key, [...values])
    return this
  }

  delete(key: Json): boolean {
    return this.m.delete(key)
  }
  
  has(key: Json): boolean {
    return this.m.has(key)
  }

  keys(): IterableIterator<Json> { return this.m.keys() }
  
  values(): IterableIterator<ReadonlyArray<V>> { return this.m.values() }
  
  entries(): IterableIterator<readonly [Json, ReadonlyArray<V>]> { return this.m.entries() }
  
  [Symbol.iterator](): IterableIterator<readonly [Json, ReadonlyArray<V>]> { 
    return this.entries() 
  }

  static from<V>(pairs: Iterable<readonly [Json, V]>): CanonicalJsonMultiMap<V> {
    return new CanonicalJsonMultiMap(pairs)
  }

  static fromGroups<V>(groups: CanonicalJsonMap<ReadonlyArray<V>>): CanonicalJsonMultiMap<V> {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of groups) out.addAll(k, vs)
    return out
  }
}

// =========================================================
// groupBy helpers (canonical)
// =========================================================

// Group an array of T by a Json key derived from each item.
export const groupByCanonical = <T>(
  items: ReadonlyArray<T>,
  keyOf: (t: T) => Json
): CanonicalJsonMap<ReadonlyArray<T>> => {
  const m = new CanonicalJsonMap<ReadonlyArray<T>>()
  for (const t of items) {
    const k = keyOf(t)
    m.upsert(k, () => [t], (xs) => [...xs, t])
  }
  return m
}

// Group pairs [Json, V] by the Json key.
export const groupPairsByCanonical = <V>(
  pairs: ReadonlyArray<readonly [Json, V]>
): CanonicalJsonMap<ReadonlyArray<V>> => {
  const m = new CanonicalJsonMap<ReadonlyArray<V>>()
  for (const [k, v] of pairs) {
    m.upsert(k, () => [v], (xs) => [...xs, v])
  }
  return m
}

// Multimap variants if you prefer that interface:
export const multiMapByCanonical = <T>(
  items: ReadonlyArray<T>,
  keyOf: (t: T) => Json
): CanonicalJsonMultiMap<T> => {
  const mm = new CanonicalJsonMultiMap<T>()
  for (const t of items) mm.add(keyOf(t), t)
  return mm
}

export const multiMapPairsByCanonical = <V>(
  pairs: ReadonlyArray<readonly [Json, V]>
): CanonicalJsonMultiMap<V> => CanonicalJsonMultiMap.from(pairs)

// =========================================================
// CanonicalJsonMap<ReadonlyArray<V>> adapters
//   - mapGroupValues:    transform whole group -> W
//   - mapEachGroup:      map each element in group -> U
//   - filterEachGroup:   keep elements by predicate
//   - mergeGroupValues:  fold group elements -> Acc
//   - dedupeEachGroup:   deduplicate elements by key
//   - flattenGroups:     to flat pairs [Json, V]
// =========================================================

export const mapGroupValues =
  <V, W>(m: CanonicalJsonMap<ReadonlyArray<V>>,
         f: (values: ReadonlyArray<V>, key: Json) => W): CanonicalJsonMap<W> => {
    const out = new CanonicalJsonMap<W>()
    for (const [k, vs] of m) out.set(k, f(vs, k))
    return out
  }

export const mapEachGroup =
  <V, U>(m: CanonicalJsonMap<ReadonlyArray<V>>,
         f: (v: V, key: Json, index: number) => U): CanonicalJsonMap<ReadonlyArray<U>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<U>>()
    for (const [k, vs] of m) out.set(k, vs.map((v, i) => f(v, k, i)) as ReadonlyArray<U>)
    return out
  }

export const filterEachGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
       p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) out.set(k, vs.filter((v, i) => p(v, k, i)) as ReadonlyArray<V>)
    return out
  }

export const mergeGroupValues =
  <V, Acc>(m: CanonicalJsonMap<ReadonlyArray<V>>,
           init: (key: Json) => Acc,
           step: (acc: Acc, v: V, key: Json, index: number) => Acc): CanonicalJsonMap<Acc> => {
    const out = new CanonicalJsonMap<Acc>()
    for (const [k, vs] of m) {
      let acc = init(k)
      vs.forEach((v, i) => { acc = step(acc, v, k, i) })
      out.set(k, acc)
    }
    return out
  }

export const dedupeEachGroup =
  <V, K>(m: CanonicalJsonMap<ReadonlyArray<V>>,
         keyOf: (v: V, key: Json) => K): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) {
      const seen = new Set<K>()
      const arr: V[] = []
      for (const v of vs) {
        const h = keyOf(v, k)
        if (!seen.has(h)) { seen.add(h); arr.push(v) }
      }
      out.set(k, arr as ReadonlyArray<V>)
    }
    return out
  }

export const flattenGroups =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>): ReadonlyArray<readonly [Json, V]> => {
    const out: Array<readonly [Json, V]> = []
    for (const [k, vs] of m) for (const v of vs) out.push([k, v] as const)
    return out
  }

// =========================================================
// CanonicalJsonMultiMap<V> adapters
//   - collapseToMap:   MultiMap -> CanonicalJsonMap<ReadonlyArray<V>>
//   - mapMultiValues:  group -> W (like mapGroupValues)
//   - mapEachMulti:    per-element map
//   - filterEachMulti: per-element filter
//   - mergeMulti:      fold group -> Acc
// =========================================================

export const collapseToMap =
  <V>(mm: CanonicalJsonMultiMap<V>): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of mm) out.set(k, [...vs] as ReadonlyArray<V>)
    return out
  }

export const mapMultiValues =
  <V, W>(mm: CanonicalJsonMultiMap<V>,
         f: (values: ReadonlyArray<V>, key: Json) => W): CanonicalJsonMap<W> => {
    const out = new CanonicalJsonMap<W>()
    for (const [k, vs] of mm) out.set(k, f(vs, k))
    return out
  }

export const mapEachMulti =
  <V, U>(mm: CanonicalJsonMultiMap<V>,
         f: (v: V, key: Json, index: number) => U): CanonicalJsonMap<ReadonlyArray<U>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<U>>()
    for (const [k, vs] of mm) out.set(k, vs.map((v, i) => f(v, k, i)) as ReadonlyArray<U>)
    return out
  }

export const filterEachMulti =
  <V>(mm: CanonicalJsonMultiMap<V>,
       p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of mm) out.set(k, vs.filter((v, i) => p(v, k, i)) as ReadonlyArray<V>)
    return out
  }

export const mergeMulti =
  <V, Acc>(mm: CanonicalJsonMultiMap<V>,
           init: (key: Json) => Acc,
           step: (acc: Acc, v: V, key: Json, index: number) => Acc): CanonicalJsonMap<Acc> => {
    const out = new CanonicalJsonMap<Acc>()
    for (const [k, vs] of mm) {
      let acc = init(k)
      vs.forEach((v, i) => { acc = step(acc, v, k, i) })
      out.set(k, acc)
    }
    return out
  }

// =========================================================
// Small array utilities (used below)
// =========================================================

const dedupeArrayBy =
  <V, K>(xs: ReadonlyArray<V>, keyOf: (v: V) => K): ReadonlyArray<V> => {
    const seen = new Set<K>(), out: V[] = []
    for (const v of xs) { const k = keyOf(v); if (!seen.has(k)) { seen.add(k); out.push(v) } }
    return out
  }

const intersectArrayBy =
  <V, K>(as: ReadonlyArray<V>, bs: ReadonlyArray<V>, keyOf: (v: V) => K): ReadonlyArray<V> => {
    const sb = new Set(bs.map(keyOf))
    return as.filter(a => sb.has(keyOf(a)))
  }

const diffArrayBy =
  <V, K>(as: ReadonlyArray<V>, bs: ReadonlyArray<V>, keyOf: (v: V) => K): ReadonlyArray<V> => {
    const sb = new Set(bs.map(keyOf))
    return as.filter(a => !sb.has(keyOf(a)))
  }

// =========================================================
// CanonicalJsonMap<ReadonlyArray<V>> — set-like group ops
// =========================================================

// Concatenate groups; m1 values come first if both have the key
export const concatGroups =
  <V>(m1: CanonicalJsonMap<ReadonlyArray<V>>,
      m2: CanonicalJsonMap<ReadonlyArray<V>>): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m1) out.set(k, vs)
    for (const [k, vs] of m2) out.set(k, (out.get(k) ? [...(out.get(k)!), ...vs] : vs) as ReadonlyArray<V>)
    return out
  }

// Union groups with element de-duplication by keyOf
export const unionGroupsBy =
  <V, K>(m1: CanonicalJsonMap<ReadonlyArray<V>>,
         m2: CanonicalJsonMap<ReadonlyArray<V>>,
         keyOf: (v: V) => K): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    const add = (k: Json, vs: ReadonlyArray<V>) =>
      out.set(k, dedupeArrayBy([...(out.get(k) ?? []), ...vs], keyOf))
    for (const [k, vs] of m1) add(k, vs)
    for (const [k, vs] of m2) add(k, vs)
    return out
  }

// Intersection: keep only keys present in both, and intersect elements (by keyOf)
export const intersectGroupsBy =
  <V, K>(m1: CanonicalJsonMap<ReadonlyArray<V>>,
         m2: CanonicalJsonMap<ReadonlyArray<V>>,
         keyOf: (v: V) => K): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs1] of m1) {
      const vs2 = m2.get(k)
      if (vs2) out.set(k, intersectArrayBy(vs1, vs2, keyOf))
    }
    return out
  }

// Difference: A\B by elements (only keys from A kept), using keyOf
export const diffGroupsBy =
  <V, K>(ma: CanonicalJsonMap<ReadonlyArray<V>>,
         mb: CanonicalJsonMap<ReadonlyArray<V>>,
         keyOf: (v: V) => K): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vsA] of ma) {
      const vsB = mb.get(k) ?? []
      const diff = diffArrayBy(vsA, vsB, keyOf)
      if (diff.length) out.set(k, diff)
    }
    return out
  }

// =========================================================
// Per-group "top K" and global sorting of groups
// =========================================================

// Keep top K elements *per group* by score (desc), stable on ties
export const topKBy =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      k: number,
      scoreOf: (v: V, key: Json) => number): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [kjson, vs] of m) {
      const ranked = vs.map((v, i) => ({ v, i, s: scoreOf(v, kjson) }))
        .sort((a, b) => (b.s - a.s) || (a.i - b.i))
        .slice(0, Math.max(0, k))
        .map(x => x.v)
      out.set(kjson, ranked as ReadonlyArray<V>)
    }
    return out
  }

// Sort groups globally by a summary; returns a NEW CanonicalJsonMap with that order
export const sortGroupsBy =
  <V, S>(m: CanonicalJsonMap<ReadonlyArray<V>>,
         summarize: (values: ReadonlyArray<V>, key: Json) => S,
         compare: (sa: S, sb: S, ka: Json, kb: Json) => number): CanonicalJsonMap<ReadonlyArray<V>> => {
    const rows = [...m].map(([k, vs]) => [k, vs, summarize(vs, k)] as const)
    rows.sort((a, b) => compare(a[2], b[2], a[0], b[0]))
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of rows) out.set(k, vs)
    return out
  }

// A convenient numeric-desc variant (falls back to key order for ties)
export const sortGroupsByNumberDesc =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      summarize: (values: ReadonlyArray<V>, key: Json) => number): CanonicalJsonMap<ReadonlyArray<V>> =>
    sortGroupsBy(m, summarize, (sa, sb, ka, kb) =>
      (sb - sa) || compareCanonical(ka, kb)
    )

// =========================================================
// CanonicalJsonMultiMap wrappers (thin adapters)
// =========================================================

// Concatenate groups (values), preserving group insertion order
export const concatGroupsMM =
  <V>(m1: CanonicalJsonMultiMap<V>, m2: CanonicalJsonMultiMap<V>): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of m1) out.addAll(k, vs)
    for (const [k, vs] of m2) out.addAll(k, vs)
    return out
  }

export const unionGroupsByMM =
  <V, K>(m1: CanonicalJsonMultiMap<V>, m2: CanonicalJsonMultiMap<V>, keyOf: (v: V) => K): CanonicalJsonMultiMap<V> => {
    const base = collapseToMap(m1)
    const merged = unionGroupsBy(base, collapseToMap(m2), keyOf)
    return CanonicalJsonMultiMap.fromGroups(merged)
  }

export const intersectGroupsByMM =
  <V, K>(m1: CanonicalJsonMultiMap<V>, m2: CanonicalJsonMultiMap<V>, keyOf: (v: V) => K): CanonicalJsonMultiMap<V> => {
    const a = collapseToMap(m1)
    const b = collapseToMap(m2)
    return CanonicalJsonMultiMap.fromGroups(intersectGroupsBy(a, b, keyOf))
  }

export const diffGroupsByMM =
  <V, K>(ma: CanonicalJsonMultiMap<V>, mb: CanonicalJsonMultiMap<V>, keyOf: (v: V) => K): CanonicalJsonMultiMap<V> => {
    const a = collapseToMap(ma)
    const b = collapseToMap(mb)
    return CanonicalJsonMultiMap.fromGroups(diffGroupsBy(a, b, keyOf))
  }

export const topKByMM =
  <V>(mm: CanonicalJsonMultiMap<V>, k: number, scoreOf: (v: V, key: Json) => number): CanonicalJsonMultiMap<V> =>
    CanonicalJsonMultiMap.fromGroups(topKBy(collapseToMap(mm), k, scoreOf))

export const sortGroupsByNumberDescMM =
  <V>(mm: CanonicalJsonMultiMap<V>, summarize: (values: ReadonlyArray<V>, key: Json) => number): CanonicalJsonMultiMap<V> =>
    CanonicalJsonMultiMap.fromGroups(sortGroupsByNumberDesc(collapseToMap(mm), summarize))

// =========================================================
// Array micro-helpers (used below)
// =========================================================

const minBy = <V>(xs: ReadonlyArray<V>, scoreOf: (v: V, i: number) => number): V | undefined => {
  if (xs.length === 0) return undefined
  let best = xs[0]!, sbest = scoreOf(best, 0)
  for (let i = 1; i < xs.length; i++) {
    const s = scoreOf(xs[i]!, i)
    if (s < sbest) { best = xs[i]!; sbest = s }
  }
  return best
}

const maxBy = <V>(xs: ReadonlyArray<V>, scoreOf: (v: V, i: number) => number): V | undefined => {
  if (xs.length === 0) return undefined
  let best = xs[0]!, sbest = scoreOf(best, 0)
  for (let i = 1; i < xs.length; i++) {
    const s = scoreOf(xs[i]!, i)
    if (s > sbest) { best = xs[i]!; sbest = s }
  }
  return best
}

const takeWhileArr = <V>(xs: ReadonlyArray<V>, p: (v: V, i: number) => boolean): ReadonlyArray<V> => {
  let i = 0; while (i < xs.length && p(xs[i]!, i)) i++; return xs.slice(0, i)
}

const dropWhileArr = <V>(xs: ReadonlyArray<V>, p: (v: V, i: number) => boolean): ReadonlyArray<V> => {
  let i = 0; while (i < xs.length && p(xs[i]!, i)) i++; return xs.slice(i)
}

// =========================================================
// Per-group minBy/maxBy + global min/max
// =========================================================

// Keep only the minimum element per group (ties keep first by index)
export const minByGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      scoreOf: (v: V, key: Json, index: number) => number): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) {
      const v = minBy(vs, (x, i) => scoreOf(x, k, i))
      out.set(k, v === undefined ? [] : [v] as const)
    }
    return out
  }

// Keep only the maximum element per group
export const maxByGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      scoreOf: (v: V, key: Json, index: number) => number): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) {
      const v = maxBy(vs, (x, i) => scoreOf(x, k, i))
      out.set(k, v === undefined ? [] : [v] as const)
    }
    return out
  }

// Global min across all groups (Option)
export const minByGlobal =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      scoreOf: (v: V, key: Json, index: number) => number): Option<readonly [Json, V]> => {
    let bestK: Json | undefined, bestV: V | undefined, sbest = Infinity, idx = 0
    for (const [k, vs] of m) {
      for (let i = 0; i < vs.length; i++, idx++) {
        const v = vs[i]!, s = scoreOf(v, k, i)
        if (s < sbest) { sbest = s; bestK = k; bestV = v }
      }
    }
    return bestK === undefined ? None : Some([bestK, bestV!] as const)
  }

// Global max across all groups (Option)
export const maxByGlobal =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      scoreOf: (v: V, key: Json, index: number) => number): Option<readonly [Json, V]> => {
    let bestK: Json | undefined, bestV: V | undefined, sbest = -Infinity, idx = 0
    for (const [k, vs] of m) {
      for (let i = 0; i < vs.length; i++, idx++) {
        const v = vs[i]!, s = scoreOf(v, k, i)
        if (s > sbest) { sbest = s; bestK = k; bestV = v }
      }
    }
    return bestK === undefined ? None : Some([bestK, bestV!] as const)
  }

// =========================================================
// MultiMap variants for min/max
// =========================================================

export const minByGroupMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      scoreOf: (v: V, key: Json, index: number) => number): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) {
      const v = minBy(vs, (x, i) => scoreOf(x, k, i))
      if (v !== undefined) out.addAll(k, [v])
    }
    return out
  }

export const maxByGroupMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      scoreOf: (v: V, key: Json, index: number) => number): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) {
      const v = maxBy(vs, (x, i) => scoreOf(x, k, i))
      if (v !== undefined) out.addAll(k, [v])
    }
    return out
  }

// =========================================================
// Per-group takeWhile/dropWhile
// =========================================================

export const takeWhileGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) out.set(k, takeWhileArr(vs, (v, i) => p(v, k, i)))
    return out
  }

export const dropWhileGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) out.set(k, dropWhileArr(vs, (v, i) => p(v, k, i)))
    return out
  }

// MultiMap flavors (yield MultiMap)
export const takeWhileGroupMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) out.addAll(k, takeWhileArr(vs, (v, i) => p(v, k, i)))
    return out
  }

export const dropWhileGroupMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) out.addAll(k, dropWhileArr(vs, (v, i) => p(v, k, i)))
    return out
  }

// =========================================================
// Streaming reducers (single pass over Iterable<[Json, V]>)
// =========================================================

// Reduce stream of (Json, V) with per-key accumulator
export const streamReduceByCanonical =
  <V, Acc>(pairs: Iterable<readonly [Json, V]>,
           init: (key: Json) => Acc,
           step: (acc: Acc, v: V, key: Json, index: number) => Acc): CanonicalJsonMap<Acc> => {
    const out = new CanonicalJsonMap<Acc>()
    const idx = new CanonicalJsonMap<number>() // per-key index
    for (const [j, v] of pairs) {
      const i = idx.get(j) ?? 0
      out.upsert(j, () => step(init(j), v, canonicalizeJson(j), i),
                    (a) => step(a, v, canonicalizeJson(j), i))
      idx.set(j, i + 1)
    }
    return out
  }

// Maintain top-K per key while streaming
export const streamTopKByCanonical =
  <V>(k: number,
      scoreOf: (v: V, key: Json, index: number) => number) =>
  (pairs: Iterable<readonly [Json, V]>): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    const idx = new CanonicalJsonMap<number>()
    for (const [j, v] of pairs) {
      const i = idx.get(j) ?? 0
      const cur = out.get(j) ?? []
      const withScore = cur.map((x, ii) => ({ v: x, s: scoreOf(x, j, ii) }))
      withScore.push({ v, s: scoreOf(v, j, i) })
      withScore.sort((a, b) => (b.s - a.s)) // desc
      const keep = withScore.slice(0, Math.max(0, k)).map(x => x.v)
      out.set(j, keep as ReadonlyArray<V>)
      idx.set(j, i + 1)
    }
    return out
  }

// Count stream per key
export const streamCountsByCanonical =
  (pairs: Iterable<readonly [Json, unknown]>): CanonicalJsonMap<number> =>
    streamReduceByCanonical(pairs, () => 0, (acc) => acc + 1)

// Sum stream per key by a projection
export const streamSumByCanonical =
  <V>(pairs: Iterable<readonly [Json, V]>, valueOf: (v: V, key: Json, index: number) => number): CanonicalJsonMap<number> =>
    streamReduceByCanonical(pairs, () => 0, (acc, v, k, i) => acc + valueOf(v, k, i))

// =========================================================
// Canonical min/max operations for Json arrays
// =========================================================

// =========== Json[] min/max by canonical key (lexicographic) ===========

export const minByCanonical =
  (xs: ReadonlyArray<Json>): Option<Json> => {
    if (xs.length === 0) return None
    let best = xs[0]!, kbest = canonicalKey(xs[0]!)
    for (let i = 1; i < xs.length; i++) {
      const k = canonicalKey(xs[i]!)
      if (k < kbest) { best = xs[i]!; kbest = k }
    }
    return Some(best)
  }

export const maxByCanonical =
  (xs: ReadonlyArray<Json>): Option<Json> => {
    if (xs.length === 0) return None
    let best = xs[0]!, kbest = canonicalKey(xs[0]!)
    for (let i = 1; i < xs.length; i++) {
      const k = canonicalKey(xs[i]!)
      if (k > kbest) { best = xs[i]!; kbest = k }
    }
    return Some(best)
  }

// =========== Json[] min/max by a canonical score ===========
// scoreOf gets both Json and its canonical key (handy if you pre-tokenize key)

export const minByCanonicalScore =
  (xs: ReadonlyArray<Json>, scoreOf: (j: Json, key: string) => number): Option<Json> => {
    if (xs.length === 0) return None
    let best = xs[0]!, kbest = canonicalKey(xs[0]!), sbest = scoreOf(xs[0]!, kbest)
    for (let i = 1; i < xs.length; i++) {
      const j = xs[i]!, kj = canonicalKey(j), s = scoreOf(j, kj)
      if (s < sbest) { best = j; kbest = kj; sbest = s }
    }
    return Some(best)
  }

export const maxByCanonicalScore =
  (xs: ReadonlyArray<Json>, scoreOf: (j: Json, key: string) => number): Option<Json> => {
    if (xs.length === 0) return None
    let best = xs[0]!, kbest = canonicalKey(xs[0]!), sbest = scoreOf(xs[0]!, kbest)
    for (let i = 1; i < xs.length; i++) {
      const j = xs[i]!, kj = canonicalKey(j), s = scoreOf(j, kj)
      if (s > sbest) { best = j; kbest = kj; sbest = s }
    }
    return Some(best)
  }

// =========================================================
// Streaming distinct operations for Json
// =========================================================

// =========== Streaming distinct for Json ===========

export function* distinctByCanonical(it: Iterable<Json>): IterableIterator<Json> {
  const seen = new Set<string>()
  for (const j of it) {
    const k = canonicalKey(j)
    if (!seen.has(k)) { seen.add(k); yield canonicalizeJson(j) }
  }
}

export const distinctByCanonicalToArray =
  (it: Iterable<Json>): ReadonlyArray<Json> => Array.from(distinctByCanonical(it))

// =========== Streaming distinct for pairs [Json, V] (first-wins) ===========

export function* distinctPairsByCanonical<V>(
  it: Iterable<readonly [Json, V]>
): IterableIterator<readonly [Json, V]> {
  const seen = new Set<string>()
  for (const [j, v] of it) {
    const k = canonicalKey(j)
    if (!seen.has(k)) { seen.add(k); yield [canonicalizeJson(j), v] as const }
  }
}

export const distinctPairsByCanonicalToArray =
  <V>(it: Iterable<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> =>
    Array.from(distinctPairsByCanonical(it))

// =========================================================
// Last-wins distinct operations (non-streaming)
// =========================================================

export const distinctByCanonicalLast =
  (xs: ReadonlyArray<Json>): ReadonlyArray<Json> => {
    const m = new Map<string, Json>()
    for (const j of xs) m.set(canonicalKey(j), canonicalizeJson(j))
    return [...m.values()]
  }

export const distinctPairsByCanonicalLast =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> => {
    const m = new Map<string, readonly [Json, V]>()
    for (const [j, v] of xs) m.set(canonicalKey(j), [canonicalizeJson(j), v] as const)
    return [...m.values()]
  }

// =========================================================
// Canonical sort and unique operations for Json arrays
// =========================================================

// Stable sort by canonical key (asc)
export const sortJsonByCanonical =
  (xs: ReadonlyArray<Json>): ReadonlyArray<Json> =>
    xs
      .map((j, i) => ({ j, k: canonicalKey(j), i }))               // decorate
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.i - b.i))// stable
      .map(({ j }) => j)                                           // undecorate

// Stable sort (desc)
export const sortJsonByCanonicalDesc =
  (xs: ReadonlyArray<Json>): ReadonlyArray<Json> =>
    xs
      .map((j, i) => ({ j, k: canonicalKey(j), i }))
      .sort((a, b) => (a.k > b.k ? -1 : a.k < b.k ? 1 : a.i - b.i))
      .map(({ j }) => j)

// Unique (first-wins) by canonical key — returns canonicalized nodes
export const uniqueJsonByCanonical =
  (xs: ReadonlyArray<Json>): ReadonlyArray<Json> => {
    const seen = new Set<string>(), out: Json[] = []
    for (const j of xs) {
      const k = canonicalKey(j)
      if (!seen.has(k)) { seen.add(k); out.push(canonicalizeJson(j)) }
    }
    return out
  }

// If you prefer last-wins (already added earlier, here's the alias name):
export const uniqueJsonByCanonicalLast = distinctByCanonicalLast

// ==============================
// Pairs: sort by canonical key
// ==============================

// Stable asc sort by canonical key
export const sortPairsByCanonical =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> =>
    xs
      .map(([j, v], i) => ({ j, v, k: canonicalKey(j), i }))                    // decorate
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.i - b.i))             // stable
      .map(({ j, v }) => [j, v] as const)                                       // undecorate

// Stable desc sort by canonical key
export const sortPairsByCanonicalDesc =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> =>
    xs
      .map(([j, v], i) => ({ j, v, k: canonicalKey(j), i }))
      .sort((a, b) => (a.k > b.k ? -1 : a.k < b.k ? 1 : a.i - b.i))
      .map(({ j, v }) => [j, v] as const)
// ===========================================
// Pairs: unique by canonical key (first/last)
// ===========================================

// First-wins; returns canonicalized keys
export const uniquePairsByCanonical =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> => {
    const seen = new Set<string>()
    const out: Array<readonly [Json, V]> = []
    for (const [j, v] of xs) {
      const k = canonicalKey(j)
      if (!seen.has(k)) {
        seen.add(k)
        out.push([canonicalizeJson(j), v] as const)
      }
    }
    return out
  }

// Last-wins; returns canonicalized keys
export const uniquePairsByCanonicalLast =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> => {
    const m = new Map<string, readonly [Json, V]>()
    for (const [j, v] of xs) {
      m.set(canonicalKey(j), [canonicalizeJson(j), v] as const)
    }
    return [...m.values()]
  }

// Note: distinctPairsByCanonicalLast is already defined earlier in the file

// ==============================
// Value-aware sort helpers
// ==============================

// ------------ pairs: generic stable sort by comparator ------------
export const sortPairsBy =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      cmp: (a: readonly [Json, V], b: readonly [Json, V]) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    xs
      .map((p, i) => ({ p, i }))
      .sort((A, B) => cmp(A.p, B.p) || (A.i - B.i)) // stable
      .map(({ p }) => p)

// ------------ pairs: by canonical, then by a value projection ------------
export const sortPairsByCanonicalThen =
  <V, S>(xs: ReadonlyArray<readonly [Json, V]>,
         proj: (v: V, j: Json) => S,
         compare: (a: S, b: S) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    xs
      .map(([j, v], i) => ({ j, v, k: canonicalKey(j), s: proj(v, j), i }))
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : compare(a.s, b.s) || (a.i - b.i)))
      .map(({ j, v }) => [j, v] as const)

// ------------ pairs: numeric convenience ------------
export const sortPairsByCanonicalThenNumberAsc =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      valueOf: (v: V, j: Json) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    sortPairsByCanonicalThen(xs, valueOf, (a, b) => a - b)

export const sortPairsByCanonicalThenNumberDesc =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      valueOf: (v: V, j: Json) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    sortPairsByCanonicalThen(xs, valueOf, (a, b) => b - a)

// ------------ groups: sort values inside each group by comparator ------------
export const sortValuesInGroups =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      cmp: (a: V, b: V, key: Json) => number)
  : CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) {
      const decorated = vs.map((v, i) => ({ v, i }))
      decorated.sort((A, B) => cmp(A.v, B.v, k) || (A.i - B.i)) // stable
      out.set(k, decorated.map(d => d.v) as ReadonlyArray<V>)
    }
    return out
  }

// ------------ groups: numeric asc/desc convenience ------------
export const sortValuesInGroupsByNumberAsc =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      valueOf: (v: V, key: Json) => number)
  : CanonicalJsonMap<ReadonlyArray<V>> =>
    sortValuesInGroups(m, (a, b, k) => valueOf(a, k) - valueOf(b, k))

export const sortValuesInGroupsByNumberDesc =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      valueOf: (v: V, key: Json) => number)
  : CanonicalJsonMap<ReadonlyArray<V>> =>
    sortValuesInGroups(m, (a, b, k) => valueOf(b, k) - valueOf(a, k))

// ------------ multimap versions ------------
export const sortValuesInGroupsMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      cmp: (a: V, b: V, key: Json) => number)
  : CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) {
      const decorated = vs.map((v, i) => ({ v, i }))
      decorated.sort((A, B) => cmp(A.v, B.v, k) || (A.i - B.i)) // stable
      out.addAll(k, decorated.map(d => d.v))
    }
    return out
  }

export const sortValuesInGroupsByNumberAscMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      valueOf: (v: V, key: Json) => number)
  : CanonicalJsonMultiMap<V> =>
    sortValuesInGroupsMM(mm, (a, b, k) => valueOf(a, k) - valueOf(b, k))

export const sortValuesInGroupsByNumberDescMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      valueOf: (v: V, key: Json) => number)
  : CanonicalJsonMultiMap<V> =>
    sortValuesInGroupsMM(mm, (a, b, k) => valueOf(b, k) - valueOf(a, k))

// ------------ bonus: sort pairs by value first, then canonical ------------
export const sortPairsByValueThenCanonical =
  <V, S>(xs: ReadonlyArray<readonly [Json, V]>,
         proj: (v: V, j: Json) => S,
         compare: (a: S, b: S) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    xs
      .map(([j, v], i) => ({ j, v, k: canonicalKey(j), s: proj(v, j), i }))
      .sort((a, b) => compare(a.s, b.s) || (a.k < b.k ? -1 : a.k > b.k ? 1 : (a.i - b.i)))
      .map(({ j, v }) => [j, v] as const)

export const sortPairsByValueNumberAscThenCanonical =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      valueOf: (v: V, j: Json) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    sortPairsByValueThenCanonical(xs, valueOf, (a, b) => a - b)

export const sortPairsByValueNumberDescThenCanonical =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      valueOf: (v: V, j: Json) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    sortPairsByValueThenCanonical(xs, valueOf, (a, b) => b - a)

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
    case 'JUndefined': return jUndef()
    case 'JBool': return jBool(f.value)
    case 'JNum':  return jNum(f.value)
    case 'JDec':  return jDec(f.decimal)
    case 'JStr':  return jStr(f.value)
    case 'JBinary': return jBinary(f.base64)
    case 'JRegex': return jRegex(f.pattern, f.flags)
    case 'JDate':  return jDate(f.iso)
    case 'JArr':  return jArr(f.items.filter(j => j.un._tag !== 'JNull'))
    case 'JSet':  return jSet(f.items.filter(j => j.un._tag !== 'JNull'))
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
      case 'JUndefined': return [algB({ _tag:'JUndefined' }), algC({ _tag:'JUndefined' })] as const
      case 'JBool': return [algB({ _tag:'JBool', value: fbc.value }),
                            algC({ _tag:'JBool', value: fbc.value })] as const
      case 'JNum':  return [algB({ _tag:'JNum',  value: fbc.value }),
                            algC({ _tag:'JNum',  value: fbc.value })] as const
      case 'JDec':  return [algB({ _tag:'JDec',  decimal: fbc.decimal }),
                            algC({ _tag:'JDec',  decimal: fbc.decimal })] as const
      case 'JStr':  return [algB({ _tag:'JStr',  value: fbc.value }),
                            algC({ _tag:'JStr',  value: fbc.value })] as const
      case 'JBinary': return [algB({ _tag:'JBinary', base64: fbc.base64 }),
                              algC({ _tag:'JBinary', base64: fbc.base64 })] as const
      case 'JRegex': return [algB({ _tag:'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) }),
                             algC({ _tag:'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) })] as const
      case 'JDate':  return [algB({ _tag:'JDate', iso: fbc.iso }),
                             algC({ _tag:'JDate', iso: fbc.iso })] as const
      case 'JArr': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JArr', items: bs }), algC({ _tag:'JArr', items: cs })] as const
      }
      case 'JSet': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JSet', items: bs }), algC({ _tag:'JSet', items: cs })] as const
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
export const productExprAlg2 =
  <B, C>(algB: (f: ExprF<B>) => B, algC: (f: ExprF<C>) => C) =>
  (f: ExprF<readonly [B, C]>): readonly [B, C] => {
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

// size & depth in one pass (fused)
export const sizeAndDepthExpr = cataExpr(productExprAlg2(Alg_Expr_size, Alg_Expr_depth))

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
    if (isErr(rf)) return rf as any
    const ra = rra(env)
    if (isErr(ra)) return ra as any
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
  cataExpr<Result<string, number>>((f) => {
    switch (f._tag) {
      case 'Lit':  return Ok(f.value)
      case 'Var':  return Err(`unbound var: ${f.name}`) // pure Result can't access env
      case 'Neg':  return mapR((n: number) => -n)(f.value)
      case 'Add':  return ResultI.ap(mapR((l: number) => (r: number) => l + r)(f.left))(f.right)
      case 'Mul':  return ResultI.ap(mapR((l: number) => (r: number) => l * r)(f.left))(f.right)
      case 'Div':  return ResultI.chain((l: number) => ResultI.chain((r: number) =>
                           r === 0 ? Err('div by zero') : Ok(l / r)
                         )(f.right))(f.left)
      case 'AddN': return f.items.reduce((acc, r) => 
                         ResultI.ap(ResultI.map((a: number) => (b: number) => a + b)(acc))(r), 
                         Ok(0))
      case 'MulN': return f.items.reduce((acc, r) => 
                         ResultI.ap(ResultI.map((a: number) => (b: number) => a * b)(acc))(r), 
                         Ok(1))
      case 'Pow':  return ResultI.ap(ResultI.map((b: number) => (e: number) => Math.pow(b, e))(f.base))(f.exp)
      case 'Let':  return Err('let expressions require environment - use evalExprR or evalExprRR')
      case 'Abs':  return mapR((n: number) => Math.abs(n))(f.value)
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
const litVal = (e: Expr) => (isLit(e) ? e.un.value : undefined)
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
    case 'JUndefined': return 'undefined'
    case 'JBool': return String(f.value)
    case 'JNum':  return String(f.value)
    case 'JDec':  return f.decimal
    case 'JStr':  return JSON.stringify(f.value)
    case 'JBinary': return `"base64(${f.base64})"`
    case 'JRegex': return `"/${f.pattern}/${f.flags ?? ''}"`
    case 'JDate':  return `"${new Date(f.iso).toISOString()}"`
    case 'JArr':  return `[${f.items.join(', ')}]`
    case 'JSet':  return `Set[${f.items.join(', ')}]`
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
    case 'JUndefined':
    case 'JBool':
    case 'JNum':
    case 'JDec':
    case 'JStr':
    case 'JBinary':
    case 'JRegex':
    case 'JDate':
      return 1
    case 'JArr':
    case 'JSet':
      return 1 + f.items.reduce((n, x) => n + x, 0)
    case 'JObj':
      return 1 + f.entries.reduce((n, [,v]) => n + v, 0)
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
export const productJsonAlg2Fused =
  <B, C>(algB: JsonAlgFused<B>, algC: JsonAlgFused<C>): JsonAlgFused<readonly [B, C]> =>
  (fbc: JsonF<readonly [B, C]>) => {
    switch (fbc._tag) {
      case 'JNull': return [algB({ _tag:'JNull' }), algC({ _tag:'JNull' })] as const
      case 'JUndefined': return [algB({ _tag:'JUndefined' }), algC({ _tag:'JUndefined' })] as const
      case 'JBool': return [algB({ _tag:'JBool', value: fbc.value }),
                            algC({ _tag:'JBool', value: fbc.value })] as const
      case 'JNum':  return [algB({ _tag:'JNum',  value: fbc.value }),
                            algC({ _tag:'JNum',  value: fbc.value })] as const
      case 'JDec':  return [algB({ _tag:'JDec',  decimal: fbc.decimal }),
                            algC({ _tag:'JDec',  decimal: fbc.decimal })] as const
      case 'JStr':  return [algB({ _tag:'JStr',  value: fbc.value }),
                            algC({ _tag:'JStr',  value: fbc.value })] as const
      case 'JBinary': return [algB({ _tag:'JBinary', base64: fbc.base64 }),
                              algC({ _tag:'JBinary', base64: fbc.base64 })] as const
      case 'JRegex': return [algB({ _tag:'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) }),
                             algC({ _tag:'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) })] as const
      case 'JDate':  return [algB({ _tag:'JDate', iso: fbc.iso }),
                             algC({ _tag:'JDate', iso: fbc.iso })] as const
      case 'JArr': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JArr', items: bs }), algC({ _tag:'JArr', items: cs })] as const
      }
      case 'JSet': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JSet', items: bs }), algC({ _tag:'JSet', items: cs })] as const
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
    fuseJson(coalgFullBinary, productJsonAlg2Fused(Alg_Json_pretty_fused, Alg_Json_size_fused))(depth)


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
// Reader (using earlier definition from line 432)
// =======================
// Note: Reader type and implementation already defined earlier




// =======================
// ReaderTask
// =======================
export type ReaderTask<R, A> = (r: R) => Promise<A>

export const ReaderTask = {
  of:
    <R, A>(a: A): ReaderTask<R, A> =>
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
  of: <R, A>(a: A): ReaderTaskOption<R, A> => async () => Some(a),
  none: <R>(): ReaderTaskOption<R, never> => async () => None,

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
// Path-based navigation for JsonZipper
// =======================

// Path steps
export type JsonPathStep =
  | { _tag: 'Arr'; index: number }
  | { _tag: 'Set'; index: number }
  | { _tag: 'Obj'; key: string }

// Navigate to a focus by path using existing JsonZipper
export const focusAtPath = (root: Json, path: ReadonlyArray<JsonPathStep>): Option<JsonZipper> => {
  let z: JsonZipper = zipRoot(root)
  for (const step of path) {
    switch (step._tag) {
      case 'Arr': {
        const oz = zipDownIndex(step.index)(z); if (isNone(oz)) return None
        z = oz.value; break
      }
      case 'Set': {
        // For sets, treat as array for navigation
        const oz = zipDownIndex(step.index)(z); if (isNone(oz)) return None
        z = oz.value; break
      }
      case 'Obj': {
        const oz = zipDownKey(step.key)(z); if (isNone(oz)) return None
        z = oz.value; break
      }
    }
  }
  return Some(z)
}

// Optional<Json, Json> focusing by path
export const optionalAtPath = (path: ReadonlyArray<JsonPathStep>): Optional<Json, Json> => optional(
  (root: Json) => {
    const oz = focusAtPath(root, path)
    return isSome(oz) ? Some(oz.value.focus) : None
  },
  (newFocus: Json, root: Json) => {
    const oz = focusAtPath(root, path)
    if (isNone(oz)) return root
    // replace focus and rebuild
    const z2 = zipReplace(newFocus)(oz.value)
    return zipTree(z2)
  }
)

// Convenience function for path-based modification
export const modifyAtPath = (path: ReadonlyArray<JsonPathStep>, f: (j: Json) => Json) =>
  (root: Json): Json => {
    const oz = focusAtPath(root, path)
    if (isNone(oz)) return root
    const z2 = zipModify(f)(oz.value)
    return zipTree(z2)
  }

// Aliases for compatibility with examples
export const fromJsonZ = zipRoot
export const toJsonZ = zipTree
export const downArr = zipDownIndex
export const downSet = zipDownIndex  // Sets are treated as arrays for navigation
export const downObjKey = zipDownKey
export const up = zipUp
export const left = zipLeft
export const right = zipRight
export const replaceFocus = zipReplace
export const modifyFocus = zipModify

// =======================
// Type utilities for better inference
// =======================

export type NoInfer<T> = [T][T extends any ? 0 : never]

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
  function then<A, B, C>(g: Arr<B, C>, f?: Arr<A, B>): any {
    if (f === undefined) {
      return (f: Arr<A, B>): Arr<A, C> =>
        (a) => async (r: R) => {
          const rb = await f(a)(r)
          return isErr(rb) ? rb : g(rb.value)(r)
        }
    }
    return (a: A) => async (r: R) => {
      const rb = await f(a)(r)
      return isErr(rb) ? rb : g(rb.value)(r)
    }
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
  | { tag: 'Comp'; f: IR<I, any>; g: IR<any, O> }     // >>>
  | { tag: 'First'; f: IR<any, any> }                 // first
  | { tag: 'Left'; f: IR<any, any> }                  // ArrowChoice
  | { tag: 'Par'; l: IR<any, any>; r: IR<any, any> }  // *** (derived: par(f,g) = first(f) >>> second(g))
  | { tag: 'Fanout'; l: IR<any, any>; r: IR<any, any> } // &&& (derived: fanout(f,g) = arr(dup) >>> par(f,g))
  | { tag: 'Zero' }                                   // ArrowZero
  | { tag: 'Alt'; l: IR<any, any>; r: IR<any, any> }  // ArrowPlus
  | { tag: 'Loop'; f: IR<[any, any], [any, any]> }    // ArrowLoop

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
      return (([a, c]: readonly [any, any]) => [f(a), c] as const) as unknown as (i: I) => O
    }

    case 'Left': {
      const f = denot(ir.f)
      return (e: any) => {
        if (e._tag === 'Left') return { _tag: 'Left' as const, value: f(e.value) }
        return e
      }
    }

    case 'Par': {
      const l = denot(ir.l)
      const r = denot(ir.r)
      return (([a, c]: readonly [any, any]) => [l(a), r(c)] as const) as unknown as (i: I) => O
    }

    case 'Fanout': {
      const l = denot(ir.l)
      const r = denot(ir.r)
      return ((a: any) => [l(a), r(a)] as const) as unknown as (i: I) => O
    }

    case 'Zero':
      return () => { throw new Error('ArrowZero: no value') }

    case 'Alt': {
      const l = denot(ir.l)
      const r = denot(ir.r)
      return (a: any) => {
        try { return l(a) } catch { return r(a) }
      }
    }

    case 'Loop': {
      const f = denot(ir.f)
      return (a: any) => {
        let [b, c] = f([a, undefined])
        while (c !== undefined) {
          [b, c] = f([a, c])
        }
        return b
      }
    }
  }
}

// ===============================================
// Arrow Constructors
// ===============================================

export const arr = <I, O>(f: (i: I) => O): IR<I, O> => ({ tag: 'Arr', f })

export const comp = <I, M, O>(f: IR<I, M>, g: IR<M, O>): IR<I, O> => ({ tag: 'Comp', f, g })

export const first = <A, B, C>(f: IR<A, B>): IR<readonly [A, C], readonly [B, C]> => ({ tag: 'First', f })

export const leftArrow = <A, B, C>(f: IR<A, B>): IR<{ _tag: 'Left'; value: A } | { _tag: 'Right'; value: C }, { _tag: 'Left'; value: B } | { _tag: 'Right'; value: C }> => ({ tag: 'Left', f })

export const par = <A, B, C, D>(f: IR<A, B>, g: IR<C, D>): IR<readonly [A, C], readonly [B, D]> => ({ tag: 'Par', l: f, r: g })

export const fanout = <A, B, C>(f: IR<A, B>, g: IR<A, C>): IR<A, readonly [B, C]> => ({ tag: 'Fanout', l: f, r: g })

export const zero = <A, B>(): IR<A, B> => ({ tag: 'Zero' })

export const alt = <A, B>(f: IR<A, B>, g: IR<A, B>): IR<A, B> => ({ tag: 'Alt', l: f, r: g })

export const loop = <A, B>(f: IR<[A, B], [B, B]>): IR<A, B> => ({ tag: 'Loop', f })

// ===============================================
// Derived Combinators
// ===============================================

export const second = <A, B, C>(f: IR<B, C>): IR<readonly [A, B], readonly [A, C]> => {
  // second f = arr swap >>> first f >>> arr swap
  const swap = arr<readonly [A, B], readonly [B, A]>(([a, b]) => [b, a])
  const swapBack = arr<readonly [C, A], readonly [A, C]>(([c, a]) => [a, c])
  return comp(comp(swap, first(f)), swapBack)
}

export const rightArrow = <A, B, C>(f: IR<A, B>): IR<{ _tag: 'Left'; value: C } | { _tag: 'Right'; value: A }, { _tag: 'Left'; value: C } | { _tag: 'Right'; value: B }> => {
  // right f = arr mirror >>> left f >>> arr mirror
  const mirror = arr<any, any>((e: any) => 
    e._tag === 'Left' ? { _tag: 'Right' as const, value: e.value } : { _tag: 'Left' as const, value: e.value }
  )
  return comp(comp(mirror, leftArrow(f)), mirror)
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

export interface RewritePlan {
  plan: IR<any, any>
  steps: ReadonlyArray<RewriteStep>
}

// ===============================================
// Normalization Rewrites (with Explain-Plan)
// ===============================================

export const normalize = <I, O>(ir: IR<I, O>): RewritePlan => {
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
  
  return { plan: current, steps }
}

const rewriteWithPlan = <I, O>(ir: IR<I, O>): RewritePlan => {
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
        return result
      }
      
      // Identity elimination: arr id >>> f = f
      if (f.tag === 'Arr' && f.f === idFn) {
        steps.push({
          rule: "DropLeftId",
          before: hashIR(ir),
          after: hashIR(g),
          law: "Category.1 (Left Identity)"
        })
        return g
      }
      
      // Identity elimination: f >>> arr id = f  
      if (g.tag === 'Arr' && g.f === idFn) {
        steps.push({
          rule: "DropRightId",
          before: hashIR(ir),
          after: hashIR(f),
          law: "Category.2 (Right Identity)"
        })
        return f
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
        return result
      }
      
      return { tag: 'Comp', f, g }
    }
    
    case 'First': {
      const f = rewrite(ir.f, steps)
      
      // first (arr f) = arr (first f)
      if (f.tag === 'Arr') {
        const result = arr(([a, c]: readonly [any, any]) => [f.f(a), c] as const) as IR<I, O>
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
      
      return { tag: 'First', f }
    }
    
    case 'Par': {
      const l = rewrite(ir.l, steps)
      const r = rewrite(ir.r, steps)
      
      // Par(Arr f, Arr g) = Arr(f×g)
      if (l.tag === 'Arr' && r.tag === 'Arr') {
        const result = arr(([a, c]: readonly [any, any]) => [l.f(a), r.f(c)] as const) as IR<I, O>
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
      
      return { tag: 'Par', l, r }
    }
    
    case 'Fanout': {
      const l = rewrite(ir.l, steps)
      const r = rewrite(ir.r, steps)
      
      // Fanout(Arr f, Arr g) = Arr(f &&& g)
      if (l.tag === 'Arr' && r.tag === 'Arr') {
        const result = arr((a: any) => [l.f(a), r.f(a)] as const) as IR<I, O>
        steps.push({
          rule: "FuseFanoutArr",
          before: hashIR(ir),
          after: hashIR(result),
          law: "Arrow.6 (Fanout Functoriality)"
        })
        return result
      }
      
      return { tag: 'Fanout', l, r }
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
        return r
      }
      
      // p <+> Zero = p
      if (r.tag === 'Zero') {
        steps.push({
          rule: "DropRightZero",
          before: hashIR(ir),
          after: hashIR(l),
          law: "ArrowPlus.2 (Right Identity)"
        })
        return l
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
        return result
      }
      
      return { tag: 'Alt', l, r }
    }
    
    case 'Left': {
      const f = rewrite(ir.f, steps)
      
      // left (arr f) = arr (left f)
      if (f.tag === 'Arr') {
        const result = arr((e: any) => {
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
      
      return { tag: 'Left', f }
    }
    
    case 'Loop': {
      const f = rewrite(ir.f, steps)
      
      // Loop(f) >>> arr g = Loop(f >>> arr(g × id))
      // This would need more context to implement properly
      // For now, just return the loop unchanged
      
      return { tag: 'Loop', f }
    }
    
    default:
      return ir
  }
}

// Helper function for identity (avoiding conflict with existing id)
const idFn = <A>(a: A): A => a

// Simple hash function for IR (for explain-plan)
const hashIR = (ir: IR<any, any>): string => {
  return JSON.stringify(ir, (key, value) => {
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
  left,
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

// -----------------------
// Endofunctor helpers
// -----------------------

// Endofunctor on K1 is just a FunctorK1 (endofunctor on TS types)
// Note: Using the earlier EndofunctorK1 definition from line 330

// Helpers to "fix" the left param of K2 constructors => a K1 endofunctor
export const ResultK1 = <E>() => ({
  map:  <A, B>(f: (a: A) => B) => (ra: Result<E, A>): Result<E, B> => mapR<E, A, B>(f)(ra),
  ap:   <A, B>(rf: Result<E, (a: A) => B>) => (ra: Result<E, A>): Result<E, B> =>
        isOk(rf) && isOk(ra) ? Ok(rf.value(ra.value)) : (isErr(rf) ? rf : ra) as any,
  of:   <A>(a: A): Result<E, A> => Ok(a),
  chain:<A, B>(f: (a: A) => Result<E, B>) => (ra: Result<E, A>): Result<E, B> =>
        isOk(ra) ? f(ra.value) : ra as any,
})

export const ValidationK1 = <E>() => ({
  map:  <A, B>(f: (a: A) => B) => (va: Validation<E, A>): Validation<E, B> => mapV<E, A, B>(f)(va),
  // for ap, you'll use your `apV` with a chosen concat
  ap:   <A, B>(concat: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>) =>
        (vf: Validation<E, (a: A) => B>) =>
        (va: Validation<E, A>): Validation<E, B> => apV<E>(concat)<A, B>(vf)(va),
  of:   <A>(a: A): Validation<E, A> => VOk(a),
  chain:<A, B>(f: (a: A) => Validation<E, B>) => (va: Validation<E, A>): Validation<E, B> =>
        isVOk(va) ? f(va.value) : va as any,
})

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
  unit: any /* Kind1<F, void> */
  /** φ_{A,B} : F A × F B → F (A×B)  (here: × is tuple) */
  tensor: <A, B>(fa: any /* F<A> */, fb: any /* F<B> */) => any /* F<readonly [A,B]> */
  /** just to be convenient at call sites */
  map: <A, B>(f: (a: A) => B) => (fa: any /* F<A> */) => any /* F<B> */
}

export const monoidalFromApplicative = <F>(A: ApplicativeLike<F>): MonoidalFunctorK1<F> => ({
  unit: A.of<void>(undefined as void),
  tensor: <A, B>(fa: any, fb: any) => A.ap(A.map((a: A) => (b: B) => [a, b] as const)(fa))(fb),
  map: A.map
})

// convenience shims built from any Monoidal
export const zipWithFromMonoidal =
  <F>(M: MonoidalFunctorK1<F>) =>
  <A, B, C>(f: (a: A, b: B) => C) =>
  (fa: any /* F<A> */) =>
  (fb: any /* F<B> */) =>
    M.map<readonly [A, B], C>(([a, b]) => f(a, b))(M.tensor<A, B>(fa, fb))

export const zipFromMonoidal =
  <F>(M: MonoidalFunctorK1<F>) =>
  <A, B>(fa: any /* F<A> */) =>
  (fb: any /* F<B> */) =>
    M.tensor<A, B>(fa, fb) as any /* F<readonly [A,B]> */

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
  map: mapO as any,
  ap: <A, B>(ff: Option<(a: A) => B>) => (fa: Option<A>): Option<B> =>
    isSome(ff) && isSome(fa) ? Some(ff.value(fa.value)) : None,
}
export const MonoidalOption = monoidalFromApplicative(ApplicativeOption)
export const zipOption      = zipFromMonoidal(MonoidalOption)<any, any>
export const zipWithOption  = zipWithFromMonoidal(MonoidalOption)<any, any, any>

// ----- Result<E,_> (short-circuiting; use Validation for accumulation) -----
const apResult = <E, A, B>(rf: Result<E, (a: A) => B>) => (ra: Result<E, A>): Result<E, B> =>
  isOk(rf) && isOk(ra) ? Ok(rf.value(ra.value)) : (isErr(rf) ? rf : ra) as any

export const ApplicativeResult = <E>(): ApplicativeLike<'Result'> => ({
  of: Ok as any,
  map: mapR as any,
  ap: apResult as any,
})
export const MonoidalResult = <E>() => monoidalFromApplicative(ApplicativeResult<E>())
export const zipResult     = <E>() => zipFromMonoidal(MonoidalResult<E>())
export const zipWithResult = <E>() => zipWithFromMonoidal(MonoidalResult<E>())

// ----- Reader<R,_> -----
export const ApplicativeReader = <R>(): ApplicativeLike<'Reader'> => ({
  of: <A>(a: A) => Reader.of<R, A>(a),
  map: Reader.map as any,
  ap:  Reader.ap  as any,
})
export const MonoidalReader = <R>() => monoidalFromApplicative(ApplicativeReader<R>())
export const zipReader      = <R>() => zipFromMonoidal(MonoidalReader<R>())
export const zipWithReader  = <R>() => zipWithFromMonoidal(MonoidalReader<R>())

// ----- ReaderTask<R,_> -----
export const ApplicativeReaderTask = <R>(): ApplicativeLike<'ReaderTask'> => ({
  of:  <A>(a: A) => ReaderTask.of<R, A>(a),
  map: ReaderTask.map as any,
  ap:  ReaderTask.ap  as any,
})
export const MonoidalReaderTask = <R>() => monoidalFromApplicative(ApplicativeReaderTask<R>())
export const zipReaderTask      = <R>() => zipFromMonoidal(MonoidalReaderTask<R>())
export const zipWithReaderTask  = <R>() => zipWithFromMonoidal(MonoidalReaderTask<R>())

// ----- ReaderTaskEither<R,E,_> -----
export const ApplicativeRTE = <R, E>(): ApplicativeLike<'RTE'> => ({
  of:  <A>(a: A) => RTE.of<A>(a) as ReaderTaskEither<R, E, A>,
  map: RTE.map as any,
  ap:  RTE.ap  as any,
})

export const MonoidalRTE = <R, E>() => monoidalFromApplicative(ApplicativeRTE<R, E>())

export const zipRTE_Monoidal =
  <R, E>() =>
  <A, B>(fa: ReaderTaskEither<R, E, A>) =>
  (fb: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, readonly [A, B]> =>
    MonoidalRTE<R, E>().tensor(fa, fb) as any

export const zipWithRTE_Monoidal =
  <R, E>() =>
  <A, B, C>(f: (a: A, b: B) => C) =>
  (fa: ReaderTaskEither<R, E, A>) =>
  (fb: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, C> =>
    MonoidalRTE<R, E>().map<readonly [A, B], C>(([a, b]) => f(a, b))(MonoidalRTE<R, E>().tensor(fa, fb))

// ----- Validation<E,_> (accumulating) -----
export const ApplicativeValidation =
  <E>(concatErrs: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>): ApplicativeLike<'Validation'> => ({
    of:  <A>(a: A) => VOk(a) as any,
    map: mapV as any,
    ap:  <A, B>(vf: Validation<E, (a: A) => B>) =>
         (va: Validation<E, A>) => apV<E>(concatErrs)<A, B>(vf)(va) as any,
  })

export const MonoidalValidation =
  <E>(concatErrs: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>) =>
    monoidalFromApplicative(ApplicativeValidation<E>(concatErrs))

// helpers:
export const zipValidation =
  <E>(concatErrs: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>) =>
  <A, B>(va: Validation<E, A>) =>
  (vb: Validation<E, B>): Validation<E, readonly [A, B]> =>
    MonoidalValidation<E>(concatErrs).tensor(va, vb) as any

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

// ====================================================================
// Category Theory Constructs: Natural Transformations, Kleisli, Writer
// ====================================================================

// ---------- Natural transformations over K1 ----------
// Note: Using the earlier NatK1 and idNatK1 definitions from lines 335 and 340

// identity / composition
// Note: Using the earlier idNatK1 definition
export const composeNatK1 = <F, G, H>(g: NatK1<G, H>, f: NatK1<F, G>): NatK1<F, H> => ({
  app: <A>(fa: any) => g.app(f.app(fa))
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

// ---------- Kleisli "category" over any MonadK1 + ready-made instances ----------
// Minimal MonadK1 shape we rely on
export type MonadK1Like<F> = {
  of: <A>(a: A) => any
  chain: <A, B>(f: (a: A) => any) => (fa: any) => any
}

// Kleisli composition: (B -> M C) ∘ (A -> M B) -> (A -> M C)
export const Kleisli = <M>(M: MonadK1Like<M>) => ({
  id:
    <A>() =>
    (a: A) =>
      M.of<A>(a),

  compose:
    <A, B, C>(f: (b: B) => any, g: (a: A) => any) =>
    (a: A) =>
      M.chain<B, C>(f)(g(a)),
})

// Instances over your monads
export const K_Option   = Kleisli({ of: Some,      chain: <A,B>(f:(a:A)=>Option<B>) => (oa:Option<A>) => isSome(oa) ? f(oa.value) : None })
export const K_Result   = Kleisli({ of: Ok,        chain: <E,A,B>(f:(a:A)=>Result<E,B>) => (ra:Result<E,A>) => isOk(ra) ? f(ra.value) : ra })
export const K_Task     = Kleisli({ of: Task.of,   chain: Task.chain })
export const K_Reader   = Kleisli({ of: Reader.of, chain: Reader.chain })
export const K_ReaderTask = Kleisli({ of: ReaderTask.of, chain: ReaderTask.chain })

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

// Traverse/sequence with any Applicative
export type ApplicativeLike<F> = {
  of: <A>(a: A) => any
  ap: <A, B>(ff: any) => (fa: any) => any
  map: <A, B>(f: (a: A) => B) => (fa: any) => any
}

export const traverseArrayA =
  <F>(A: ApplicativeLike<F>) =>
  <A, B>(as: ReadonlyArray<A>, f: (a: A, i: number) => any /* F<B> */) =>
    as.reduce(
      (acc: any, a: A, i: number) =>
        A.ap(A.map((xs: ReadonlyArray<B>) => (b: B) => [...xs, b])(acc))(f(a, i)),
      A.of([] as ReadonlyArray<B>)
    )

export const sequenceArrayA =
  <F>(A: ApplicativeLike<F>) =>
  <A>(fas: ReadonlyArray<any /* F<A> */>) =>
    traverseArrayA<F>(A)(fas, (fa) => fa)

// ====================================================================
// Monad Transformers: MonadWriter, EitherT
// ====================================================================

// ----- MonadWriter interface + WriterT (with pass) -----
export interface MonadWriterT<F, W> {
  of: <A>(a: A) => any /* F<Writer<W,A>> */
  map: <A, B>(f: (a: A) => B) => (fwa: any) => any /* F<Writer<W,B>> */
  chain: <A, B>(f: (a: A) => any /* F<Writer<W,B>> */) => (fwa: any) => any
  tell: (w: W) => any /* F<Writer<W, void>> */
  listen: <A>(fwa: any /* F<Writer<W,A>> */) => any /* F<Writer<W,[A,W]>> */
  pass: <A>(fwa: any /* F<Writer<W,[A,(W)=>W]>> */) => any /* F<Writer<W,A>> */
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
      const [[a, tweak], w] = [[wfw[0], (wfw as any)[0][1]], wfw[1]] as unknown as [readonly [A, (w: W)=>W], W]
      return [a, tweak(w)] as const
    },
}

// ----- WriterT over any base monad F (Reader, Task, ReaderTask, …) -----
export const WriterT = <W>(M: Monoid<W>) => <F>(F: MonadK1Like<F>): MonadWriterT<F, W> => ({
  of:
    <A>(a: A) =>
      F.of<Writer<W, A>>([a, M.empty] as const),

  map:
    <A, B>(f: (a: A) => B) =>
    (fwa: any) =>
      F.chain<Writer<W, A>, Writer<W, B>>(([a, w]: Writer<W, A>) => F.of([f(a), w] as const))(fwa),

  chain:
    <A, B>(f: (a: A) => any /* F<Writer<W,B>> */) =>
    (fwa: any) =>
      F.chain<Writer<W, A>, Writer<W, B>>(([a, w1]: Writer<W, A>) =>
        F.chain<Writer<W, B>, Writer<W, B>>(([b, w2]: Writer<W, B>) =>
          F.of([b, M.concat(w1, w2)] as const)
        )(f(a))
      )(fwa),

  tell:
    (w: W) =>
      F.of([undefined, w] as const),

  listen:
    <A>(fwa: any) =>
      F.chain<Writer<W, A>, Writer<W, readonly [A, W]>>(
        ([a, w]: Writer<W, A>) => F.of([[a, w] as const, w] as const)
      )(fwa),

  pass:
    <A>(fwa: any /* F<Writer<W, [A,(W)=>W]>> */) =>
      F.chain<Writer<W, readonly [A, (w: W) => W]>, Writer<W, A>>(
        ([[a, tweak], w]: Writer<W, readonly [A, (w: W) => W]>) =>
          F.of([a, tweak(w)] as const)
      )(fwa),
})

// ----- Prewired Writer helpers -----
export const K_Reader_Writer = {
  of: <A>(a: A) => Reader.of<unknown, A>(a),
  chain: <A, B>(f: (a: A) => Reader<unknown, B>) => (ra: Reader<unknown, A>) => Reader.chain<A, B, unknown>(f)(ra)
}
export const K_ReaderTask_Writer = {
  of: <A>(a: A) => ReaderTask.of<unknown, A>(a),
  chain: <A, B>(f: (a: A) => ReaderTask<unknown, B>) => (rta: ReaderTask<unknown, A>) => ReaderTask.chain<A, B, unknown>(f)(rta)
}

// ready-to-use modules:
export const WriterInReader = <W>(M: Monoid<W>) => WriterT<W>(M)(K_Reader_Writer)
export const WriterInReaderTask = <W>(M: Monoid<W>) => WriterT<W>(M)(K_ReaderTask_Writer)

// ----- EitherT (tiny) + prewired aliases -----
export const EitherT = <F>(F: MonadK1Like<F>) => ({
  // Constructors
  right:  <A>(a: A) => F.of<Result<never, A>>(Ok(a)) as any,
  left:   <E>(e: E) => F.of<Result<E, never>>(Err(e)) as any,
  of:     <A>(a: A) => F.of<Result<never, A>>(Ok(a)) as any,

  // Lift a pure F<A> into F<Result<never,A>>
  liftF:  <A>(fa: any) => F.chain<A, Result<never, A>>((a: A) => F.of(Ok(a)))(fa),

  // Functor/Bifunctor
  map:
    <E, A, B>(f: (a: A) => B) =>
    (fea: any) =>
      F.chain<Result<E, A>, Result<E, B>>((ra) => F.of(mapR<E, A, B>(f)(ra)))(fea),

  mapLeft:
    <E, F2, A>(f: (e: E) => F2) =>
    (fea: any) =>
      F.chain<Result<E, A>, Result<F2, A>>((ra) => F.of(mapErr<E, F2, A>(f)(ra)))(fea),

  bimap:
    <E, F2, A, B>(l: (e: E) => F2, r: (a: A) => B) =>
    (fea: any) =>
      F.chain<Result<E, A>, Result<F2, B>>((ra) => F.of(isOk(ra) ? Ok(r(ra.value)) : Err(l((ra as Err<E>).error))))(fea),

  // Apply/Chain
  ap:
    <E, A, B>(ff: any /* F<Result<E,(a:A)=>B>> */) =>
    (fa: any /* F<Result<E,A>> */) =>
      F.chain<Result<E, (a: A) => B>, Result<E, B>>((rf) =>
        isOk(rf)
          ? F.chain<Result<E, A>, Result<E, B>>((ra) =>
              F.of(isOk(ra) ? Ok(rf.value(ra.value)) : (ra as any))
            )(fa)
          : F.of(rf as any)
      )(ff),

  chain:
    // note error union E|E2
    <E, A, E2, B>(f: (a: A) => any /* F<Result<E2,B>> */) =>
    (fea: any /* F<Result<E,A>> */) =>
      F.chain<Result<E, A>, Result<E | E2, B>>((ra) => (isOk(ra) ? f(ra.value) : F.of(ra as any)))(fea),

  orElse:
    <E, A, E2>(f: (e: E) => any /* F<Result<E2, A>> */) =>
    (fea: any /* F<Result<E,A>> */) =>
      F.chain<Result<E, A>, Result<E | E2, A>>((ra) => (isErr(ra) ? f(ra.error) : F.of(ra)))(fea),

  // Eliminators/util
  getOrElse:
    <E, A>(onErr: (e: E) => A) =>
    (fea: any) =>
      F.chain<Result<E, A>, A>((ra) => F.of(getOrElseR<E, A>(onErr)(ra)))(fea),

  fold:
    <E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
    (fea: any) =>
      F.chain<Result<E, A>, B>((ra) => F.of(isOk(ra) ? onOk(ra.value) : onErr((ra as Err<E>).error)))(fea),

  swap:
    <E, A>(fea: any) =>
      F.chain<Result<E, A>, Result<A, E>>((ra) => F.of(isOk(ra) ? Err(ra.value as any) : Ok((ra as Err<E>).error as any)))(fea),
})

// ----- Prewired specializations (aliases) -----
export type TaskEither<E, A> = Task<Result<E, A>>
export const TaskEither = EitherT({
  of: Task.of,
  chain: Task.chain
})

export type ReaderEither<R, E, A> = Reader<R, Result<E, A>>
export const ReaderEither = EitherT({
  of: <A>(a: A) => Reader.of<unknown, A>(a),
  chain: <A, B>(f: (a: A) => Reader<unknown, B>) => (ra: Reader<unknown, A>) => Reader.chain<A, B, unknown>(f)(ra)
})

export type ReaderTaskEither<R, E, A> = ReaderTask<R, Result<E, A>>
export const ReaderTaskEither = EitherT({
  of: <A>(a: A) => ReaderTask.of<unknown, A>(a),
  chain: <A, B>(f: (a: A) => ReaderTask<unknown, B>) => (rta: ReaderTask<unknown, A>) => ReaderTask.chain<A, B, unknown>(f)(rta)
})

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
    RTE.chain<A, E, never, A>((a) => RTE.map(() => a)(rteB))(rteA)

export const apSecondRTE =
  <R, E, A, B>(rteB: ReaderTaskEither<R, E, B>) =>
  (rteA: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, B> =>
    RTE.chain<A, E, never, B>(() => rteB)(rteA)

export const zipWithRTE =
  <R, E, A, B, C>(f: (a: A, b: B) => C) =>
  (rteA: ReaderTaskEither<R, E, A>) =>
  (rteB: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, C> =>
    RTE.ap(RTE.map((a: A) => (b: B) => f(a, b))(rteA))(rteB)

export const zipRTE =
  <R, E, A, B>(rteA: ReaderTaskEither<R, E, A>) =>
  (rteB: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, readonly [A, B]> =>
    zipWithRTE<R, E, A, B, readonly [A, B]>((a, b) => [a, b] as const)(rteA)(rteB)

// ----- Do-notation for ReaderTaskEither (RTE) -----
// Note: Using earlier _Merge type definition from line 944

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

export const DoRTE = <R>() => {
  const make = <T, E>(rte: ReaderTaskEither<R, E, T>): DoRTEBuilder<R, T, E> => ({
    bind: (k, rtea) =>
      make(
        RTE.chain<T, E, any, _Merge<T, Record<typeof k, any>>>((t) =>
          RTE.map((a: any) => ({ ...(t as any), [k]: a } as const))(rtea)
        )(rte) as any
      ),

    apS: (k, rtea) =>
      make(
        RTE.chain<T, E, any, _Merge<T, Record<typeof k, any>>>((t) =>
          RTE.map((a: any) => ({ ...(t as any), [k]: a } as const))(rtea)
        )(rte) as any
      ),

    let: (k, f) =>
      make(RTE.map((t: T) => ({ ...(t as any), [k]: f(t) } as const))(rte)),

    apFirst: (rtea) =>
      make(
        RTE.chain<T, E, any, T>((t) =>
          RTE.map(() => t)(rtea)
        )(rte) as any
      ),

    apSecond: (rtea) =>
      make(
        RTE.chain<T, E, any, any>(() => rtea)(rte) as any
      ) as any, // resulting builder's T is the Ok value type of rtea

    tap: (f) =>
      make(
        RTE.chain<T, any, any, T>((t) =>
          RTE.map(() => t)(f(t) as any)
        )(rte) as any
      ) as any,

    map: (f) => RTE.map(f)(rte),

    done: rte,
  })

  // start with {}
  return make(RTE.of({} as const))
}

// ----- Writer × EitherT × ReaderTask (WRTE) composition -----
export type WriterReaderTaskEither<W, R, E, A> =
  ReaderTask<R, Writer<W, Result<E, A>>>

export const WRTE = <W>(M: Monoid<W>) => {
  // base monad = ReaderTask
  const F = {
    of: <A>(a: A) => ReaderTask.of<unknown, A>(a),
    chain: <A, B>(f: (a: A) => ReaderTask<unknown, B>) =>
      (fa: ReaderTask<unknown, A>) => ReaderTask.chain<A, B, unknown>(f)(fa),
  }

  // WriterT over ReaderTask
  const WT = WriterT<W>(M)(F)

  // EitherT over (WriterT over ReaderTask)
  const ET = EitherT(WT)

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

  return {
    // constructors
    right:  <R = unknown, E = never, A = never>(a: A): _WRTE<R, E, A> => ET.right(a),
    left:   <R = unknown, E = never>(e: E): _WRTE<R, E, never> => ET.left(e),
    of:     <R = unknown, A = never>(a: A): _WRTE<R, never, A> => ET.of(a),

    // core combinators
    map:     <R, E, A, B>(f: (a: A) => B) => (m: _WRTE<R, E, A>): _WRTE<R, E, B> => ET.map<E, A, B>(f)(m) as any,
    mapLeft: <R, E, F2, A>(f: (e: E) => F2) => (m: _WRTE<R, E, A>): _WRTE<R, F2, A> => ET.mapLeft<E, F2, A>(f)(m) as any,
    bimap:   <R, E, F2, A, B>(l:(e:E)=>F2, r:(a:A)=>B) => (m:_WRTE<R,E,A>): _WRTE<R,F2,B> => ET.bimap(l, r)(m) as any,

    ap:
      <R, E, A, B>(mf: _WRTE<R, E, (a: A) => B>) =>
      (ma: _WRTE<R, E, A>): _WRTE<R, E, B> => ET.ap<E, A, B>(mf)(ma) as any,

    chain:
      <R, E, A, F2, B>(f: (a: A) => _WRTE<R, F2, B>) =>
      (ma: _WRTE<R, E, A>): _WRTE<R, E | F2, B> => ET.chain<E, A, F2, B>(f)(ma) as any,

    orElse:
      <R, E, A, F2>(f: (e: E) => _WRTE<R, F2, A>) =>
      (ma: _WRTE<R, E, A>): _WRTE<R, E | F2, A> => ET.orElse<E, A, F2>(f)(ma) as any,

    // logging
    tell:   <R = unknown>(w: W): _WRTE<R, never, void> => WT.tell(w) as any,
    listen: <R, E, A>(ma: _WRTE<R, E, A>): _WRTE<R, E, readonly [A, W]> => WT.listen(ma) as any,
    pass:   <R, E, A>(ma: _WRTE<R, E, readonly [A, (w: W) => W]>): _WRTE<R, E, A> => WT.pass(ma) as any,

    // -------- apFirst / apSecond / zip / zipWith for WRTE --------
    apFirst:
      <R, E, A, B>(mb: WriterReaderTaskEither<W, R, E, B>) =>
      (ma: WriterReaderTaskEither<W, R, E, A>): WriterReaderTaskEither<W, R, E, A> =>
        ET.chain<A, E, never, A>((a) => ET.map(() => a)(mb))(ma) as any,

    apSecond:
      <R, E, A, B>(mb: WriterReaderTaskEither<W, R, E, B>) =>
      (ma: WriterReaderTaskEither<W, R, E, A>): WriterReaderTaskEither<W, R, E, B> =>
        ET.chain<A, E, never, B>(() => mb)(ma) as any,

    zipWith:
      <R, E, A, B, C>(f: (a: A, b: B) => C) =>
      (ma: WriterReaderTaskEither<W, R, E, A>) =>
      (mb: WriterReaderTaskEither<W, R, E, B>): WriterReaderTaskEither<W, R, E, C> =>
        // ap(map(f)(ma))(mb)
        ET.ap<E, A, (b: B) => C>(ET.map((a: A) => (b: B) => f(a, b))(ma))(mb) as any,

    zip:
      <R, E, A, B>(ma: WriterReaderTaskEither<W, R, E, A>) =>
      (mb: WriterReaderTaskEither<W, R, E, B>): WriterReaderTaskEither<W, R, E, readonly [A, B]> =>
        ET.ap<E, A, (b: B) => readonly [A, B]>(ET.map((a: A) => (b: B) => [a, b] as const)(ma))(mb) as any,

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
export type EndoDict<Sym extends string> = Record<Sym, EndofunctorK1<any>>
export type StrengthDict<Sym extends string, E> = Record<Sym, StrengthEnv<any, E>>
export type NatDict<SymFrom extends string, SymTo extends string> =
  (name: SymFrom) => { to: SymTo; nat: NatK1<any, any> }

// evaluate term to EndofunctorK1
export const evalEndo =
  <S extends string>(d: EndoDict<S>) =>
  (t: EndoTerm<S>): EndofunctorK1<any> => {
    switch (t.tag) {
      case 'Id':    return IdK1
      case 'Base':  return d[t.name]
      case 'Sum':   return SumEndo(evalEndo(d)(t.left), evalEndo(d)(t.right))
      case 'Prod':  return ProdEndo(evalEndo(d)(t.left), evalEndo(d)(t.right))
      case 'Comp':  return composeEndoK1(evalEndo(d)(t.left), evalEndo(d)(t.right))
      case 'Pair':  return PairEndo<any>()
      case 'Const': return ConstEndo<any>()
    }
  }

// derive StrengthEnv for term (needs base strengths and rules)
export const deriveStrengthEnv =
  <S extends string, E>(sd: StrengthDict<S, E>) =>
  (t: EndoTerm<S>): StrengthEnv<any, E> => {
    switch (t.tag) {
      case 'Id':    return { st: <A>(ea: Env<E, A>) => [ea[0], ea[1]] as const }
      case 'Base':  return sd[t.name]
      case 'Sum':   return strengthEnvFromSum<E>()(deriveStrengthEnv(sd)(t.left), deriveStrengthEnv(sd)(t.right))
      case 'Prod':  return strengthEnvFromProd<E>()(deriveStrengthEnv(sd)(t.left), deriveStrengthEnv(sd)(t.right))
      case 'Comp':  return strengthEnvCompose<E>()(
                        evalEndo(({} as any) as EndoDict<S>)(t.left) as any,
                        evalEndo(({} as any) as EndoDict<S>)(t.right) as any,
                        deriveStrengthEnv(sd)(t.left),
                        deriveStrengthEnv(sd)(t.right)
                      )
      case 'Pair':  return strengthEnvFromPair<E>()<any>()
      case 'Const': return strengthEnvFromConst<E, any>(undefined as unknown as E)
    }
  }

// hoist bases along a mapping of natural transformations, preserving shape
export const hoistEndo =
  <SFrom extends string, STo extends string>(dFrom: EndoDict<SFrom>, dTo: EndoDict<STo>) =>
  (mapBase: NatDict<SFrom, STo>) =>
  (t: EndoTerm<SFrom>): { endo: EndofunctorK1<any>; nat: NatK1<any, any>; term: EndoTerm<STo> } => {
    type Out = { endo: EndofunctorK1<any>; nat: NatK1<any, any>; term: EndoTerm<STo> }
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
        const endo = PairEndo<any>()
        return { endo, nat: idNatK1(), term: PairT<STo>(t.C) } as Out
      }
      case 'Const': {
        const endo = ConstEndo<any>()
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
  from: EndofunctorK1<any>
  to:   EndofunctorK1<any>
  nat:  NatK1<any, any>
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
    pickBase: (nameL: S1, nameR: S2) => NatK1<any, any> | null
  ) =>
  (t1: EndoTerm<S1>, t2: EndoTerm<S2>): AlignBuild<S1, S2> => {

    const go = (a: EndoTerm<any>, b: EndoTerm<any>): AlignBuild<any, any> => {
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
          const L = go(a.left,  (b as any).left)
          const R = go(a.right, (b as any).right)
          return {
            from: SumEndo(L.from, R.from),
            to:   SumEndo(L.to,   R.to),
            nat:  sumNat(L.nat, R.nat),
          }
        }

        case 'Prod': {
          const L = go(a.left,  (b as any).left)
          const R = go(a.right, (b as any).right)
          return {
            from: ProdEndo(L.from, R.from),
            to:   ProdEndo(L.to,   R.to),
            nat:  prodNat(L.nat, R.nat),
          }
        }

        case 'Comp': {
          const L = go(a.left,  (b as any).left)   // α : L.from ⇒ L.to
          const R = go(a.right, (b as any).right)  // β : R.from ⇒ R.to
          return {
            from: composeEndoK1(L.from, R.from),
            to:   composeEndoK1(L.to,   R.to),
            nat:  hcompNatK1_component(L.from)(L.nat, R.nat), // (α ▷ β)
          }
        }

        case 'Pair': {
          if (a.C !== (b as any).C)
            throw new EndoTermAlignError(`Pair constants differ: ${String(a.C)} vs ${String((b as any).C)}`)
          const F = PairEndo<any>()
          return { from: F, to: F, nat: idNatK1() }
        }

        case 'Const': {
          if (a.C !== (b as any).C)
            throw new EndoTermAlignError(`Const values differ: ${String(a.C)} vs ${String((b as any).C)}`)
          const F = ConstEndo<any>()
          return { from: F, to: F, nat: idNatK1() }
        }
      }
    }

    return go(t1, t2)
  }

// =====================================================================
// Traversable registry (by functor VALUE identity) + helpers
// =====================================================================
export type TraversableRegistryK1 = WeakMap<EndofunctorK1<any>, TraversableK1<any>>

export const makeTraversableRegistryK1 = () => {
  const reg: TraversableRegistryK1 = new WeakMap()
  const register = <F>(F: EndofunctorK1<F>, T: TraversableK1<F>): EndofunctorK1<F> => {
    reg.set(F as any, T as any)
    return F
  }
  const get = <F>(F: EndofunctorK1<F>): TraversableK1<F> | null =>
    (reg.get(F as any) as any) ?? null
  return { reg, register, get }
}

// ---------------------------------------------------------------------
// TraversableK1 instances
// ---------------------------------------------------------------------

// Option
export const TraversableOptionK1: TraversableK1<'Option'> = {
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => any) =>
    (oa: Option<A>) =>
      oa._tag === 'Some'
        ? G.map((b: B) => Some(b))(f(oa.value))
        : G.of<Option<B>>(None)
}

// Either<L,_>
export const TraversableEitherK1 =
  <L>(): TraversableK1<['Either', L]> => ({
    traverse: <G>(G: SimpleApplicativeK1<G>) =>
      <A, B>(f: (a: A) => any) =>
      (eab: Result<L, A>) => // Using Result as Either
        eab._tag === 'Ok'
          ? G.map((b: B) => Ok<B>(b))(f(eab.value))
          : G.of<Result<L, B>>(Err<L>(eab.error))
  })

// NonEmptyArray
export type NEA<A> = readonly [A, ...A[]]

export const TraversableNEAK1: TraversableK1<['NEA']> = {
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => any) =>
    (nea: NEA<A>) => {
      const [h, ...t] = nea
      // start with head
      let acc: any = G.map((b: B) => [b] as NEA<B>)(f(h))
      // push each tail element
      for (const a of t) {
        const cons = G.map((xs: NEA<B>) => (b: B) => [...xs, b] as NEA<B>)(acc)
        acc = G.ap(cons)(f(a))
      }
      return acc // G<NEA<B>>
    }
}

// Ready-made traversables for parameterized functors
export const TraversablePairK1 = <C>(): TraversableK1<['Pair', C]> => ({
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => any) =>
    (ca: Pair<C, A>) =>
      G.map((b: B) => [ca[0], b] as const)(f(ca[1]))
})

export const TraversableConstK1 = <C>(): TraversableK1<['Const', C]> => ({
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(_f: (a: A) => any) =>
    (cx: C) => // Const<C, A> is just C
      G.of(cx as any as C) // Const<C, B> is still just C
})

// Derive traversable for Sum/Prod/Comp from components
export const deriveTraversableSumK1 =
  <F, G>(TF: TraversableK1<F>, TG: TraversableK1<G>): TraversableK1<['Sum', F, G]> => ({
    traverse: <App>(App: SimpleApplicativeK1<App>) =>
      <A, B>(f: (a: A) => any) =>
      (v: SumVal<F, G, A>) =>
        v._sum === 'L'
          ? App.map((fb: any) => inL<F, G, B>(fb))(TF.traverse(App)(f)(v.left))
          : App.map((gb: any) => inR<F, G, B>(gb))(TG.traverse(App)(f)(v.right))
  })

export const deriveTraversableProdK1 =
  <F, G>(TF: TraversableK1<F>, TG: TraversableK1<G>): TraversableK1<['Prod', F, G]> => ({
    traverse: <App>(App: SimpleApplicativeK1<App>) =>
      <A, B>(f: (a: A) => any) =>
      (p: ProdVal<F, G, A>) => {
        const lf = TF.traverse(App)(f)(p.left)
        const rf = TG.traverse(App)(f)(p.right)
        const ap2 = <X, Y, Z>(gxy: any, gy: any) =>
          App.ap(App.map((x: X) => (y: Y) => ({ left: x, right: y } as ProdVal<F, G, Z>))(gxy))(gy)
        return ap2(lf, rf)
      }
  })

export const deriveTraversableCompK1 =
  <F, G>(TF: TraversableK1<F>, TG: TraversableK1<G>): TraversableK1<['Comp', F, G]> => ({
    traverse: <App>(App: SimpleApplicativeK1<App>) =>
      <A, B>(f: (a: A) => any) =>
      (fga: any) =>
        TF.traverse(App)((ga: any) => TG.traverse(App)(f)(ga))(fga)
  })

// Register common families (return the same Endo value you should use elsewhere)
export const registerEitherTraversable =
  <E>(R: ReturnType<typeof makeTraversableRegistryK1>, tag?: E) => {
    const F = ResultK1<E>() // Using Result as Either
    const T = TraversableEitherK1<E>()
    return R.register(F as any, T as any)
  }

export const registerPairTraversable =
  <C>(R: ReturnType<typeof makeTraversableRegistryK1>) => {
    const F = PairEndo<C>()
    const T = TraversablePairK1<C>()
    return R.register(F as any, T as any)
  }

export const registerConstTraversable =
  <C>(R: ReturnType<typeof makeTraversableRegistryK1>) => {
    const F = ConstEndo<C>()
    const T = TraversableConstK1<C>()
    return R.register(F as any, T as any)
  }

// Compose/derive & register at runtime from parts already in registry
export const registerSumDerived =
  <F, G>(R: ReturnType<typeof makeTraversableRegistryK1>, FEndo: EndofunctorK1<F>, GEndo: EndofunctorK1<G>) => {
    const TF = R.get(FEndo); const TG = R.get(GEndo)
    if (!TF || !TG) throw new Error('registerSumDerived: missing component traversables')
    const FE = SumEndo(FEndo, GEndo)
    const TT = deriveTraversableSumK1(TF as any, TG as any)
    return R.register(FE as any, TT as any)
  }

export const registerProdDerived =
  <F, G>(R: ReturnType<typeof makeTraversableRegistryK1>, FEndo: EndofunctorK1<F>, GEndo: EndofunctorK1<G>) => {
    const TF = R.get(FEndo); const TG = R.get(GEndo)
    if (!TF || !TG) throw new Error('registerProdDerived: missing component traversables')
    const FE = ProdEndo(FEndo, GEndo)
    const TT = deriveTraversableProdK1(TF as any, TG as any)
    return R.register(FE as any, TT as any)
  }

export const registerCompDerived =
  <F, G>(R: ReturnType<typeof makeTraversableRegistryK1>, FEndo: EndofunctorK1<F>, GEndo: EndofunctorK1<G>) => {
    const TF = R.get(FEndo); const TG = R.get(GEndo)
    if (!TF || !TG) throw new Error('registerCompDerived: missing component traversables')
    const FE = composeEndoK1(FEndo, GEndo)
    const TT = deriveTraversableCompK1(TF as any, TG as any)
    return R.register(FE as any, TT as any)
  }

// Lax 2-functor (Promise postcompose) that consults the registry
export const makePostcomposePromise2WithRegistry = (R: TraversableRegistryK1): LaxTwoFunctorK1 =>
  makePostcomposePromise2(<F>(FEndo: EndofunctorK1<F>) => (R.get(FEndo as any) as any) ?? null)

// =====================================================================
// Smart metadata for composed endofunctors + lazy Traversable lookup
// =====================================================================

// Internal shape metadata (WeakMap so GC-friendly)
type EndoMeta =
  | { tag: 'Sum';  left: EndofunctorK1<any>; right: EndofunctorK1<any> }
  | { tag: 'Prod'; left: EndofunctorK1<any>; right: EndofunctorK1<any> }
  | { tag: 'Comp'; left: EndofunctorK1<any>; right: EndofunctorK1<any> }
  | { tag: 'Pair'; C: unknown }
  | { tag: 'Const'; C: unknown }

const __endoMeta = new WeakMap<EndofunctorK1<any>, EndoMeta>()
const withMeta = <F>(e: EndofunctorK1<F>, m: EndoMeta): EndofunctorK1<F> => {
  __endoMeta.set(e as any, m)
  return e
}

// Meta-enabled constructors (use these if you want auto-derivation):
export const SumEndoM =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) =>
    withMeta(SumEndo(F, G) as any, { tag: 'Sum', left: F, right: G })

export const ProdEndoM =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) =>
    withMeta(ProdEndo(F, G) as any, { tag: 'Prod', left: F, right: G })

export const CompEndoM =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) =>
    withMeta(composeEndoK1(F, G) as any, { tag: 'Comp', left: F, right: G })

export const PairEndoM =
  <C>(c: C) => withMeta(PairEndo<C>() as any, { tag: 'Pair', C: c } as any)

export const ConstEndoM =
  <C>(c: C) => withMeta(ConstEndo<C>() as any, { tag: 'Const', C: c } as any)

// Smart lookup: uses registry; if missing, tries to derive for Sum/Prod/Comp and caches result.
export const makeSmartGetTraversableK1 =
  (R: ReturnType<typeof makeTraversableRegistryK1>) =>
  <F>(FEndo: EndofunctorK1<F>): TraversableK1<F> | null => {
    const hit = R.get(FEndo as any)
    if (hit) return hit as any
    const m = __endoMeta.get(FEndo as any)
    if (!m) return null

    // recursive fetch that also caches
    const need = makeSmartGetTraversableK1(R)

    switch (m.tag) {
      case 'Sum': {
        const TL = need(m.left); const TR = need(m.right)
        if (!TL || !TR) return null
        const T = deriveTraversableSumK1(TL as any, TR as any) as any
        R.register(FEndo as any, T)
        return T
      }
      case 'Prod': {
        const TL = need(m.left); const TR = need(m.right)
        if (!TL || !TR) return null
        const T = deriveTraversableProdK1(TL as any, TR as any) as any
        R.register(FEndo as any, T)
        return T
      }
      case 'Comp': {
        const TL = need(m.left); const TR = need(m.right)
        if (!TL || !TR) return null
        const T = deriveTraversableCompK1(TL as any, TR as any) as any
        R.register(FEndo as any, T)
        return T
      }
      case 'Pair': {
        const T = TraversablePairK1<any>()
        R.register(FEndo as any, T as any)
        return T as any
      }
      case 'Const': {
        const T = TraversableConstK1<any>()
        R.register(FEndo as any, T as any)
        return T as any
      }
    }
  }

// Promise-postcompose that uses the smart getter:
export const makePostcomposePromise2Smart =
  (R: ReturnType<typeof makeTraversableRegistryK1>): LaxTwoFunctorK1 =>
    makePostcomposePromise2(<F>(FEndo: EndofunctorK1<F>) => makeSmartGetTraversableK1(R)(FEndo) as any)

// ---------------------------------------------------------------------
// Result<E,_>: factory to adapt your existing Ok/Err tags without imports.
// Provide a tag check and constructors so we don't collide with your names.
// ---------------------------------------------------------------------
export const makeTraversableResultK1 =
  <E>(isOk: (r: any) => boolean, getOk: (r: any) => any, getErr: (r: any) => E,
      OkCtor: <A>(a: A) => any, ErrCtor: (e: E) => any): TraversableK1<['Result', E]> => ({
    traverse: <G>(G: SimpleApplicativeK1<G>) =>
      <A, B>(f: (a: A) => any) =>
      (r: any) =>
        isOk(r)
          ? G.map((b: B) => OkCtor(b))(f(getOk(r)))
          : G.of(ErrCtor(getErr(r)))
  })

// =======================
// Development Utilities (Dev-Only)
// =======================

const __DEV__ = process.env['NODE_ENV'] !== "production"

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
type AppEnv = { apiBase: string; token: string }

// Reader usage (pure dependency injection)
const authHeader: Reader<AppEnv, Record<string, string>> = Reader.asks((env) => ({
  Authorization: `Bearer ${env.token}`,
}))

const withApi = Reader.local<AppEnv, { apiBase: string }>(
  (q) => ({ apiBase: q.apiBase, token: "n/a" }) // adapt env shape if needed
)

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

// ============
// Runnable mini-examples (sanity suite)
// ============

// ---------- Partial function: parseInt on int-like strings ----------
const intLike = (s: string) => /^-?\d+$/.test(s)
const parseIntPF: PartialFn<string, number> = pf(intLike, s => Number(s))

// Arrays: filterMap / collect
const raw = ["10", "x", "-3", "7.5", "0"]
const ints1 = filterMapArraySimple(raw, (s) => intLike(s) ? Some(Number(s)) : None)
const ints2 = collectArray(raw, parseIntPF)
// ints1/ints2 -> [10, -3, 0]

// Maps: value collect (keep keys)
const agesRaw = new Map<string, string>([["a","19"], ["b","oops"], ["c","42"]])
const ages = collectMapValues(agesRaw, parseIntPF)
// ages.get("a") = 19, ages.get("b") = undefined, ages.get("c") = 42

// Maps: entry collect (remap keys)
const emails = new Map<string, string>([
  ["u1", "ada@example.com"],
  ["u2", "not-an-email"],
  ["u3", "bob@example.com"]
])
const emailDomainPF: PartialFn<readonly [string, string], readonly [string, string]> =
  pf(([, e]) => /@/.test(e), ([id, e]) => [e.split("@")[1]!, id] as const)
// swap key to domain, value to id (only for valid emails)
const byDomain = collectMapEntries(emails, emailDomainPF)
// byDomain.get("example.com") has "u1" and/or "u3" depending on last write (Map overwrites duplicate keys)

// Sets: filterMap / collect
const setRaw = new Set(["1", "2", "two", "3"])
const setInts = collectSet(setRaw, parseIntPF) // Set{1, 2, 3}

// ---------- Reader applicative eval demo ----------
type ExprEnvDemo = Readonly<Record<string, number>>
const prog = lett("x", lit(10),
  addN([ vvar("x"), powE(lit(2), lit(3)), neg(lit(4)) ]) // x + 2^3 + (-4)
)

const n1 = runReader(evalExprR_app(prog), {})            // 10 + 8 - 4 = 14 (x defaulted to 0? Nope, we bind x=10)
const n2 = runReader(evalExprR_app(prog), { x: 1 })      // still 14 (let shadows)

// ---------- Reader<Result> eval demo (div-by-zero) ----------
const bad = divE(lit(1), add(vvar("d"), neg(vvar("d")))) // 1 / (d + (-d)) = 1/0
const r1 = runReader(evalExprRR_app(bad), { d: 3 })      // Err("div by zero")

// ---------- Fused hylo demo (Expr or Json as you like) ----------
// Note: These functions would need to be implemented based on your fused hylo setup
// const s5 = evalSum1toN_FUSED(5)                          // 15
// const p2 = showPowMul_FUSED(2, 3)                        // "((3 * 3) * (3 * 3))"

// ---------- Stack machine demo ----------
const machineExpr = lett("y", lit(5), mul(add(vvar("y"), lit(1)), lit(3))) // (y+1)*3 where y=5
const progAsm = compileExpr(machineExpr)
const runAsm = runProgram(progAsm)                       // Ok(18)

// ---------- New algebras demo (size & depth) ----------
const complexExpr = addN([neg(lit(4)), mulN([lit(2), lit(3)]), divE(lit(8), lit(2))])
const [exprSize, exprDepth] = sizeAndDepthExpr(complexExpr)  // [5, 3]

const complexJson = jObj([['name', jStr('Ada')], ['tags', jArr([jStr('fp'), jStr('ts')])]])
const jsonSize = sizeJson(complexJson)     // 6
const jsonStrs = strsJson(complexJson)     // ['Ada', 'fp', 'ts']
const jsonDepth = depthJson(complexJson)   // 3
const [jsonSize2, jsonDepth2] = sizeAndDepthJson(complexJson)  // [6, 3]



// Examples have been moved to examples.ts
