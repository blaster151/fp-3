import { None, Some } from "../option"
import type { Option } from "../option"

export type NonEmptyArray<A> = readonly [A, ...A[]]

const isNonEmptyArray = <A>(as: ReadonlyArray<A>): as is NonEmptyArray<A> =>
  as.length > 0

export const fromArrayNE = <A>(as: ReadonlyArray<A>): Option<NonEmptyArray<A>> =>
  isNonEmptyArray(as) ? Some(as) : None

export const headNE = <A>(as: NonEmptyArray<A>): A => as[0]

export const tailNE = <A>(as: NonEmptyArray<A>): ReadonlyArray<A> => as.slice(1)

export const mapNE = <A, B>(as: NonEmptyArray<A>, f: (a: A) => B): NonEmptyArray<B> =>
  [f(as[0]), ...as.slice(1).map(f)]
