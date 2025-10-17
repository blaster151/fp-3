import { pipe } from "../../core"
import type { Option } from "../../option"
import { None, Some, flatMapO, getOrElseO, isSome, mapO } from "../../option"
import type { Result } from "../../result"
import { Err, Ok, isErr, isOk } from "../../result"

/** Lens and Prism abstractions extracted from allTS.ts. */
export type Lens<S, A> = {
  readonly get: (s: S) => A
  readonly set: (a: A) => (s: S) => S
}

export const Lens = Symbol.for("Lens")

export const lens = <S, A>(get: (s: S) => A, set: (a: A, s: S) => S): Lens<S, A> => ({
  get,
  set: (a: A) => (s: S) => set(a, s),
})

export const lensProp = <S>() => <K extends keyof S>(k: K): Lens<S, S[K]> =>
  lens(
    (s) => s[k],
    (a, s) => ({ ...s, [k]: a }) as S,
  )

export const composeLens = <S, A, B>(ab: Lens<A, B>) => (sa: Lens<S, A>): Lens<S, B> => ({
  get: (s) => ab.get(sa.get(s)),
  set: (b) => (s) => sa.set(ab.set(b)(sa.get(s)))(s),
})

export const over = <S, A>(ln: Lens<S, A>, f: (a: A) => A) => (s: S): S =>
  ln.set(f(ln.get(s)))(s)

export type Prism<S, A> = {
  readonly getOption: (s: S) => Option<A>
  readonly reverseGet: (a: A) => S
}

export const prism = <S, A>(getOption: (s: S) => Option<A>, reverseGet: (a: A) => S): Prism<S, A> => ({
  getOption,
  reverseGet,
})

export const composePrism = <S, A, B>(ab: Prism<A, B>) => (sa: Prism<S, A>): Prism<S, B> =>
  prism(
    (s) => flatMapO((a: A) => ab.getOption(a))(sa.getOption(s)),
    (b) => sa.reverseGet(ab.reverseGet(b)),
  )

export const modifyP = <S, A>(pr: Prism<S, A>, f: (a: A) => A) => (s: S): S =>
  pipe(
    pr.getOption(s),
    mapO((a) => pr.reverseGet(f(a))),
    getOrElseO(() => s),
  )

export const PrismOption = {
  some: <A>(): Prism<Option<A>, A> =>
    prism<Option<A>, A>(
      (oa) => (isSome(oa) ? Some(oa.value) : None),
      (a) => Some(a),
    ),
}

export const PrismResult = {
  ok: <E, A>(): Prism<Result<E, A>, A> =>
    prism<Result<E, A>, A>(
      (ra) => (isOk(ra) ? Some(ra.value) : None),
      (a) => Ok(a),
    ),

  err: <E, A>(): Prism<Result<E, A>, E> =>
    prism<Result<E, A>, E>(
      (ra) => (isErr(ra) ? Some(ra.error) : None),
      (e) => Err(e),
    ),
}
