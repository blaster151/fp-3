import { pipe } from "../../core"
import type { Option } from "../../option"
import { None, Some, flatMapO, getOrElseO, mapO } from "../../option"
import type { Lens, Prism } from "./lens-prism"

/** Optional and Traversal abstractions extracted from allTS.ts. */
export const optional = <S, A>(getOption: (s: S) => Option<A>, set: (a: A, s: S) => S): Optional<S, A> => ({
  getOption,
  set: (a: A) => (s: S) => set(a, s),
})

export const modifyO = <S, A>(opt: Optional<S, A>, f: (a: A) => A) => (s: S): S =>
  pipe(
    opt.getOption(s),
    mapO((a) => opt.set(f(a))(s)),
    getOrElseO(() => s),
  )

export type Traversal<S, A> = {
  readonly modify: (f: (a: A) => A) => (s: S) => S
}

export const traversalFromArray = <A>(): Traversal<ReadonlyArray<A>, A> => ({
  modify: (f) => (as) => as.map(f),
})

export const composeTraversal = <S, A, B>(ab: Traversal<A, B>) => (sa: Traversal<S, A>): Traversal<S, B> => ({
  modify: (f) => sa.modify(ab.modify(f)),
})

export type Optional<S, A> = {
  readonly getOption: (s: S) => Option<A>
  readonly set: (a: A) => (s: S) => S
}

export const composeOptional = <S, A, B>(ab: Optional<A, B>) => (sa: Optional<S, A>): Optional<S, B> => ({
  getOption: (s) => flatMapO((a: A) => ab.getOption(a))(sa.getOption(s)),
  set: (b) => (s) =>
    pipe(
      sa.getOption(s),
      mapO((a) => sa.set(ab.set(b)(a))(s)),
      getOrElseO(() => s),
    ),
})

export const lensToOptional = <S, A>(ln: Lens<S, A>): Optional<S, A> => optional(
  (s) => Some(ln.get(s)),
  (a, s) => ln.set(a)(s),
)

export const prismToOptional = <S, A>(pr: Prism<S, A>): Optional<S, A> => optional(
  pr.getOption,
  (a, s) => {
    void s
    return pr.reverseGet(a)
  },
)

export const optionalProp = <S>() => <K extends keyof S>(k: K): Optional<S, NonNullable<S[K]>> => optional(
  (s: S) => {
    const value = s[k]
    return value == null ? None : Some(value as NonNullable<S[K]>)
  },
  (a, s) => ({ ...s, [k]: a } as S),
)

export const optionalIndex = <A>(i: number): Optional<ReadonlyArray<A>, A> => optional(
  (as) => (i >= 0 && i < as.length ? Some(as[i]!) : None),
  (a, as) => (i >= 0 && i < as.length ? [...as.slice(0, i), a, ...as.slice(i + 1)] as readonly A[] : as),
) as Optional<ReadonlyArray<A>, A>

export const traversal = <S, A>(modify: (f: (a: A) => A) => (s: S) => S): Traversal<S, A> => ({ modify })

export const traversalArray = <A>(): Traversal<ReadonlyArray<A>, A> => traversal(
  (f) => (as) => as.map(f),
)

type ArrayElement<T> = T extends ReadonlyArray<infer Elem> ? Elem : never

export const traversalPropArray = <S>() =>
  <K extends keyof S>(k: K & (S[K] extends ReadonlyArray<unknown> ? K : never)):
    Traversal<S, ArrayElement<S[K]>> =>
      traversal((f) => (s: S) => {
        const current = s[k] as ReadonlyArray<ArrayElement<S[K]>>
        return { ...s, [k]: current.map(f) } as S
      })

export const optionalToTraversal = <S, A>(opt: Optional<S, A>): Traversal<S, A> => traversal(
  (f) => (s) =>
    pipe(
      opt.getOption(s),
      mapO((a) => opt.set(f(a))(s)),
      getOrElseO(() => s),
    ),
)

export const overT = <S, A>(tv: Traversal<S, A>, f: (a: A) => A) => tv.modify(f)
