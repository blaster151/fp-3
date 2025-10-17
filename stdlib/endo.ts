import { id } from "../core"
import { concatAll } from "./monoid"
import type { Monoid } from "./monoid"

export type Endo<A> = (a: A) => A

export const MonoidEndo = <A>(): Monoid<Endo<A>> => ({
  empty: id,
  concat: (f, g) => (a: A) => g(f(a)),
})

export const applyEdits =
  <A>(M = MonoidEndo<A>()) =>
  (edits: ReadonlyArray<Endo<A>>) =>
  (a: A): A =>
    concatAll(M)(edits)(a)
