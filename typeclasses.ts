import { None, Some, fromNullable, getOrElseO, isSome, mapO, flatMapO, orElseO } from "./option"
import type { Option } from "./option"
import { Ok, flatMapR, isErr, isOk, mapR } from "./result"
import type { Result as ResultT } from "./result"
import type { Task } from "./task"
import type { Validation } from "./validation"

type Result<E, A> = ResultT<E, A>

type IdentityValue<A> = { readonly _id: A }

export type ValidationTag<E> = { readonly tag: 'Validation'; readonly error: E }

export type FunctorValue<F, A> =
  F extends 'Option' ? Option<A> :
  F extends 'Result' ? Result<unknown, A> :
  F extends 'Either' ? Result<unknown, A> :
  F extends 'Promise' ? Promise<A> :
  F extends 'Task' ? Task<A> :
  F extends 'Array' ? ReadonlyArray<A> :
  F extends 'Id' ? IdentityValue<A> :
  F extends ValidationTag<infer E> ? Validation<E, A> :
  F extends 'IdK1' ? A :
  unknown

export interface Functor<F> {
  readonly map: <A, B>(f: (a: A) => B) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

export interface Apply<F> extends Functor<F> {
  readonly ap: <A, B>(fab: FunctorValue<F, (a: A) => B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

export interface Monad<F> extends Apply<F> {
  readonly of: <A>(a: A) => FunctorValue<F, A>
  readonly chain: <A, B>(f: (a: A) => FunctorValue<F, B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

export const OptionI: Monad<'Option'> = {
  map: mapO,
  ap: <A, B>(fab: Option<(a: A) => B>) => (fa: Option<A>): Option<B> => (isSome(fab) && isSome(fa) ? Some(fab.value(fa.value)) : None),
  of: Some,
  chain: flatMapO,
}

export const ResultI: Monad<'Result'> = {
  map: mapR,
  ap:
    <E, A, B>(rfab: Result<E, (a: A) => B>) =>
    (rfa: Result<E, A>): Result<E, B> => {
      if (isErr(rfab)) {
        return rfab
      }
      if (isErr(rfa)) {
        return rfa
      }
      return Ok(rfab.value(rfa.value))
    },
  of: Ok,
  chain: flatMapR,
}

export const MaybeM = {
  of: <A>(a: A) => Some(a),
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

export const ResultM = <E>() => ({
  of: <A>(a: A): Result<E, A> => Ok(a),
  map: <A, B>(f: (a: A) => B) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? Ok(f(ra.value)) : ra,
  chain: <A, B>(f: (a: A) => Result<E, B>) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? f(ra.value) : ra,
  ap: <A, B>(rfab: Result<E, (a: A) => B>) =>
    (ra: Result<E, A>): Result<E, B> => {
      if (isErr(rfab)) {
        return rfab
      }
      if (isErr(ra)) {
        return ra
      }
      return Ok(rfab.value(ra.value))
    },
  mapErr: <F>(_: (e: E) => F) =>
    <A>(ra: Result<E, A>): Result<E, A> =>
      ra,
})

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
  (a: A): Result<E, C> => {
    const fb = f(a)
    return isOk(fb) ? g(fb.value) : fb
  }
