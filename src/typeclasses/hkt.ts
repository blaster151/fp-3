import { None, Some, flatMapO, isSome, mapO } from "../../option"
import type { Option } from "../../option"
import { Err, Ok, isErr, isOk, mapR } from "../../result"
import type { Err as ErrT, Result } from "../../result"
import { Reader } from "../../endo-2category"
import type { Reader as ReaderT } from "../../endo-2category"
import { ReaderTask, Task } from "../../task"
import type { ReaderTask as ReaderTaskT } from "../../task"
import type { JsonF } from "../../array-recursion"
import * as Expr from "../../stdlib/expr"
import { apV, mapV, VOk } from "../../validation"
import type { Validation } from "../../validation"
import type { FunctorValue, ValidationTag } from "../../typeclasses"
import type { EndofunctorK1, EndofunctorValue, NatK1 } from "../../endo-2category"
import { zipRTE, zipWithRTE, RTE, ReaderTaskEither } from "../result/either-transformer"

export const curry2 = <A, B, C>(f: (a: A, b: B) => C) => (a: A) => (b: B) => f(a, b)
export const curry3 = <A, B, C, D>(f: (a: A, b: B, c: C) => D) => (a: A) => (b: B) => (c: C) => f(a, b, c)
export const curry4 = <A, B, C, D, R>(f: (a: A, b: B, c: C, d: D) => R) =>
  (a: A) => (b: B) => (c: C) => (d: D) => f(a, b, c, d)

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
    ExprF: Expr.ExprF<A>

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
          isOk(rf) && isOk(ra) ? Ok(rf.value(ra.value)) : (isErr(rf) ? rf : (ra as ErrT<E>)),
    of:   <A>(a: A): Result<E, A> => Ok(a),
    chain:<A, B>(f: (a: A) => Result<E, B>) => (ra: Result<E, A>): Result<E, B> =>
          isOk(ra) ? f(ra.value) : (ra as ErrT<E>),
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
  unit: A.of(undefined as void),
  tensor: <A, B>(fa: FunctorValue<F, A>, fb: FunctorValue<F, B>) =>
    A.ap(A.map((a: A) => (b: B) => [a, b] as const)(fa))(fb),
  map: A.map,
})

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
  isOk(rf) && isOk(ra) ? Ok(rf.value(ra.value)) : (isErr(rf) ? rf : ra as ErrT<E>)

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
      Reader.map<A, B>(f)<R>(ra as ReaderT<R, A>),
  ap: <A, B>(rfab: FunctorValue<'Reader', (a: A) => B>) =>
    (rfa: FunctorValue<'Reader', A>): FunctorValue<'Reader', B> =>
      Reader.ap<R, A, B>(rfab as ReaderT<R, (a: A) => B>)(rfa as ReaderT<R, A>),
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
      ReaderTask.map<A, B>(f)<R>(rta as ReaderTaskT<R, A>),
  ap:  <A, B>(rtfab: FunctorValue<'ReaderTask', (a: A) => B>) =>
    (rta: FunctorValue<'ReaderTask', A>): FunctorValue<'ReaderTask', B> =>
      ReaderTask.ap<R, A, B>(rtfab as ReaderTaskT<R, (a: A) => B>)(rta as ReaderTaskT<R, A>),
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
      isOk(ra) ? Ok(f(ra.value)) : (ra as ErrT<E>),

  of: <A>(a: A): Result<E, A> => Ok(a) as Result<E, A>,

  ap:  <A, B>(rf: Result<E, (a: A) => B>) =>
       (ra: Result<E, A>): Result<E, B> =>
         isOk(rf) && isOk(ra) ? Ok(rf.value(ra.value)) : (isErr(rf) ? rf : (ra as ErrT<E>)),

  chain: <A, B>(f: (a: A) => Result<E, B>) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? f(ra.value) : (ra as ErrT<E>),
})

// =======================
// Generic helpers using HK.*
// =======================

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

// ====================================================================
// tokenizeJSON: ReadableStream<string> | AsyncIterable<string>
//            -> AsyncGenerator<JsonEvent>
// ====================================================================
//
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
          : (isErr(rfab) ? rfab : (rfa as ErrT<E>))
      },

    chain: <A, B>(f: (a: A) =>
             HK.Kind3<'ReaderTaskResult', R, E, B>) =>
            (fa: HK.Kind3<'ReaderTaskResult', R, E, A>):
              HK.Kind3<'ReaderTaskResult', R, E, B> =>
      async (env: R) => {
        const ra = await fa(env)
        return isOk(ra) ? f(ra.value)(env) : (ra as ErrT<E>)
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

export type Pair<A, B> = readonly [A, B]

export const apFirstO =
  <A, B>(fa: Option<A>) =>
  (fb: Option<B>): Option<A> =>
    OptionK.ap(OptionK.map((a: A) => (_: B) => a)(fa))(fb)

export const apSecondO =
  <A, B>(fa: Option<A>) =>
  (fb: Option<B>): Option<B> =>
    OptionK.ap(OptionK.map((_: A) => (b: B) => b)(fa))(fb)

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
