// Option (aka Maybe) module extracted from allTS.ts

type Lazy<T> = () => T
type Predicate<A> = (a: A) => boolean

export type None = { readonly _tag: 'None' }
export type Some<A> = { readonly _tag: 'Some'; readonly value: A }
export type Option<A> = None | Some<A>

export const None: None = { _tag: 'None' }
export const Some = <A>(value: A): Option<A> => ({ _tag: 'Some', value })

export const isNone = <A>(oa: Option<A>): oa is None => oa._tag === 'None'
export const isSome = <A>(oa: Option<A>): oa is Some<A> => oa._tag === 'Some'

export const fromNullable = <A>(a: A | null | undefined): Option<A> => (a == null ? None : Some(a))
export const toNullable = <A>(oa: Option<A>): A | null => (isSome(oa) ? oa.value : null)

export const mapO = <A, B>(f: (a: A) => B) => (oa: Option<A>): Option<B> => (isSome(oa) ? Some(f(oa.value)) : None)
export const flatMapO = <A, B>(f: (a: A) => Option<B>) => (oa: Option<A>): Option<B> =>
  isSome(oa) ? f(oa.value) : None
export const getOrElseO = <A>(onNone: Lazy<A>) => (oa: Option<A>): A => (isSome(oa) ? oa.value : onNone())
export const orElseO = <A>(that: Lazy<Option<A>>) => (oa: Option<A>): Option<A> => (isSome(oa) ? oa : that())
export const filterO = <A>(p: Predicate<A>) => (oa: Option<A>): Option<A> =>
  isSome(oa) && p(oa.value) ? oa : None
