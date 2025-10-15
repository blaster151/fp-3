export type Lazy<T> = () => T
export type Predicate<A> = (a: A) => boolean
export type Refinement<A, B extends A> = (a: A) => a is B
export type Eq<A> = (x: A, y: A) => boolean
export type Ord<A> = (x: A, y: A) => number

export const id = <A>(a: A): A => a
export const const_ = <A>(a: A) => <B>(_?: B): A => a
export const absurd = (x: never): never => x

export function pipe<A>(a: A): A
export function pipe<A, B>(a: A, ab: (a: A) => B): B
export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C
export function pipe<A, B, C, D>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): D
export function pipe(a: unknown, ...fns: Array<(x: unknown) => unknown>): unknown {
  return fns.reduce((acc, f) => f(acc), a)
}

export const flow = <A extends unknown[], B>(ab: (...a: A) => B) => ab

export const compose = <A, B, C>(bc: (b: B) => C, ab: (a: A) => B) => (a: A): C => bc(ab(a))

export const curry = <A, B, C>(f: (a: A, b: B) => C) => (a: A) => (b: B) => f(a, b)
export const uncurry = <A, B, C>(f: (a: A) => (b: B) => C) => (a: A, b: B) => f(a)(b)
