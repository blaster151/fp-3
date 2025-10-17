import type { Lazy, Predicate } from "../../core"
import type { Option } from "../../option"
import { None, Some } from "../../option"

/**
 * Small, generally useful helpers that previously lived in allTS.ts.
 */
export const tap = <A>(f: (a: A) => void) => (a: A) => {
  f(a)
  return a
}

export const attempt = <A>(f: Lazy<A>): Option<A> => {
  try {
    return Some(f())
  } catch {
    return None
  }
}

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

export const not = <A>(p: Predicate<A>) => (a: A) => !p(a)
export const and = <A>(...ps: ReadonlyArray<Predicate<A>>) => (a: A) => ps.every(p => p(a))
export const or = <A>(...ps: ReadonlyArray<Predicate<A>>) => (a: A) => ps.some(p => p(a))

export const isNullish = <A>(a: A | null | undefined): a is null | undefined => a == null
export const isString = (u: unknown): u is string => typeof u === "string"
export const isNumber = (u: unknown): u is number => typeof u === "number"
export const isBoolean = (u: unknown): u is boolean => typeof u === "boolean"

export const map = <A, B>(as: ReadonlyArray<A>, f: (a: A) => B): ReadonlyArray<B> => as.map(f)
export const filter = <A>(as: ReadonlyArray<A>, p: Predicate<A>): ReadonlyArray<A> => as.filter(p)
export const flatMap = <A, B>(as: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<B> =>
  as.flatMap(f)
export const reduce = <A, B>(as: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): B => as.reduce(f, b)

export const head = <A>(as: ReadonlyArray<A>): Option<A> => (as.length > 0 ? Some(as[0]!) : None)
export const tail = <A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> =>
  as.length > 1 ? Some(as.slice(1)) : None
