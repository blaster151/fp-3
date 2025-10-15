import { isOk } from "./result"
import type { Result } from "./result"

export type VErr<E> = { readonly _tag: 'VErr'; readonly errors: ReadonlyArray<E> }
export type VOk<A>  = { readonly _tag: 'VOk';  readonly value: A }
export type Validation<E, A> = VErr<E> | VOk<A>

export function VErr<E>(e: E): Validation<E, never>
export function VErr<E>(...es: ReadonlyArray<E>): Validation<E, never>
export function VErr<E>(...es: ReadonlyArray<E>): Validation<E, never> {
  return { _tag: 'VErr', errors: es }
}

export const VOk = <A>(a: A): Validation<never, A> => ({ _tag: 'VOk', value: a })
export const isVErr = <E, A>(v: Validation<E, A>): v is VErr<E> => v._tag === 'VErr'
export const isVOk  = <E, A>(v: Validation<E, A>): v is VOk<A>  => v._tag === 'VOk'

export const Validation = {
  VErr,
  VOk,
}

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
    return isVErr(vfab) ? vfab : (va as VErr<E>)
  }

export const validate =
  <E, A>(e: E, p: (a: A) => boolean) =>
  (a: A): Validation<E, A> =>
    p(a) ? VOk(a) : (VErr<E>(e) as Validation<E, A>)

export const concatArray =
  <E>(a: ReadonlyArray<E>, b: ReadonlyArray<E>): ReadonlyArray<E> => [...a, ...b]

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

type UnwrapValidation<T> = T extends Validation<infer _E, infer A> ? A : never

type SequenceStructValidationValue<S> = { readonly [K in keyof S]: UnwrapValidation<S[K]> }

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

export const sequenceStructValidation = <
  E,
  S extends Record<string, Validation<E, unknown>>
>(
  s: S,
  concat: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>
): Validation<E, SequenceStructValidationValue<S>> => {
  const out: Partial<SequenceStructValidationValue<S>> = {}
  let errs: ReadonlyArray<E> | null = null
  for (const k in s) {
    const validation = s[k]!
    if (isVOk(validation)) {
      out[k] = validation.value as UnwrapValidation<S[typeof k]>
    } else {
      const errors = validation.errors
      errs = errs ? concat(errs, errors) : errors
    }
  }
  return errs
    ? VErr(...errs)
    : VOk(out as SequenceStructValidationValue<S>)
}

export const mapErrorsV =
  <E, F>(f: (e: E) => F) =>
  <A>(v: Validation<E, A>): Validation<F, A> =>
    isVOk(v)
      ? (VOk(v.value) as Validation<F, A>)
      : (VErr(...v.errors.map(f)) as Validation<F, A>)

export const bimapV =
  <E, F, A, B>(fe: (e: E) => F, fa: (a: A) => B) =>
  (v: Validation<E, A>): Validation<F, B> =>
    isVOk(v) ? VOk(fa(v.value)) : VErr(...v.errors.map(fe))

export const toValidation =
  <A>(r: Result<ReadonlyArray<string>, A>): Validation<string, A> =>
    isOk(r) ? VOk(r.value) : VErr(...r.error)

export const ValidationK1 = <E>() => ({
  map:  <A, B>(f: (a: A) => B) => (va: Validation<E, A>): Validation<E, B> => mapV<E, A, B>(f)(va),
  // for ap, you'll use your `apV` with a chosen concat
  ap:   <A, B>(concat: (x: ReadonlyArray<E>, y: ReadonlyArray<E>) => ReadonlyArray<E>) =>
        (vf: Validation<E, (a: A) => B>) =>
        (va: Validation<E, A>): Validation<E, B> => apV<E>(concat)<A, B>(vf)(va),
  of:   <A>(a: A): Validation<E, A> => VOk(a),
  chain:<A, B>(f: (a: A) => Validation<E, B>) => (va: Validation<E, A>): Validation<E, B> =>
        isVOk(va) ? f(va.value) : (va as VErr<E>),
})
