import type { NonEmptyArray } from "./nonempty-array"

export interface Semigroup<A> {
  readonly concat: (x: A, y: A) => A
}

export interface Monoid<A> extends Semigroup<A> {
  readonly empty: A
}

export const SemigroupString: Semigroup<string> = { concat: (x, y) => x + y }

export const MonoidString: Monoid<string> = { ...SemigroupString, empty: "" }

export const SemigroupArray = <A>(): Semigroup<ReadonlyArray<A>> => ({ concat: (x, y) => [...x, ...y] })

export const MonoidArray = <A>(): Monoid<ReadonlyArray<A>> => ({ ...SemigroupArray<A>(), empty: [] })

export const concatAll =
  <A>(M: Monoid<A>) =>
  (as: ReadonlyArray<A>): A =>
    as.reduce(M.concat, M.empty)

export const concatNE =
  <A>(S: Semigroup<A>) =>
  (nea: NonEmptyArray<A>): A =>
    nea.slice(1).reduce(S.concat, nea[0])
