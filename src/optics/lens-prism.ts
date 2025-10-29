import { pipe } from "../../core"
import type { Option } from "../../option"
import { None, Some, getOrElseO, isSome, mapO } from "../../option"
import type { Result } from "../../result"
import { Err, Ok, isErr, isOk } from "../../result"
import type { LensLike, PrismLike } from "./profunctor"
import {
  composeLensLike,
  composePrismLike,
  fromLens,
  fromPrism,
  toLens,
  toPrism,
  rightFromLeft,
} from "./profunctor"
import {
  attachPrismWitness,
  makePrismWitnessBundle,
  readPrismWitness,
  type PrismWitnessBundle,
  type PrismWitnessCarrier,
} from "./witness"

/** Lens and Prism abstractions extracted from allTS.ts. */
export type Lens<S, A> = {
  readonly get: (s: S) => A
  readonly set: (a: A) => (s: S) => S
}

export const Lens = Symbol.for("Lens")

export const lens = <S, A>(get: (s: S) => A, set: (a: A, s: S) => S): Lens<S, A> => {
  const optic: LensLike<S, S, A, A> = (P) => (pab) =>
    P.dimap(
      P.first<A, A, S>(pab),
      (s: S) => [get(s), s] as const,
      ([a, s]: readonly [A, S]) => set(a, s),
    )
  return toLens(optic)
}

export const lensProp = <S>() => <K extends keyof S>(k: K): Lens<S, S[K]> =>
  lens(
    (s) => s[k],
    (a, s) => ({ ...s, [k]: a }) as S,
  )

export const composeLens = <S, A, B>(ab: Lens<A, B>) => (sa: Lens<S, A>): Lens<S, B> =>
  toLens(composeLensLike(fromLens(ab), fromLens(sa)))

export const over = <S, A>(ln: Lens<S, A>, f: (a: A) => A) => (s: S): S =>
  ln.set(f(ln.get(s)))(s)

export type Prism<S, A> = {
  readonly getOption: (s: S) => Option<A>
  readonly reverseGet: (a: A) => S
} & PrismWitnessCarrier<S, A>

export const prism = <S, A>(getOption: (s: S) => Option<A>, reverseGet: (a: A) => S): Prism<S, A> => {
  const optic: PrismLike<S, S, A, A> = ((P) => {
    const right = rightFromLeft(P)
    return (pab) =>
      P.dimap(
        right<A, A, S>(pab),
        (s: S) =>
          pipe(
            getOption(s),
            mapO((a: A): Result<S, A> => Ok(a)),
            getOrElseO<Result<S, A>>(() => Err(s)),
          ),
        (result) => (isOk(result) ? reverseGet(result.value) : result.error),
      )
  }) as PrismLike<S, S, A, A>
  const base = toPrism(optic)
  const bundle = makePrismWitnessBundle(getOption, reverseGet)
  attachPrismWitness(optic, bundle)
  return attachPrismWitness(base, bundle)
}

const ensurePrismWitness = <S, A>(pr: Prism<S, A>): PrismWitnessBundle<S, A> => {
  const existing = readPrismWitness(pr)
  if (existing) {
    return existing
  }

  const bundle = makePrismWitnessBundle(pr.getOption, pr.reverseGet)
  attachPrismWitness(pr, bundle)
  return bundle
}

export const composePrism = <S, A, B>(ab: Prism<A, B>) => (sa: Prism<S, A>): Prism<S, B> => {
  const composed = toPrism(composePrismLike(fromPrism(ab), fromPrism(sa)))
  const outerWitness = ensurePrismWitness(sa)
  const innerWitness = ensurePrismWitness(ab)

  const bundle: PrismWitnessBundle<S, B> = {
    match: (source) => {
      const outer = outerWitness.match(source)
      if (outer.tag === "reject") {
        return { tag: "reject", source, reason: outer.reason }
      }

      const inner = innerWitness.match(outer.focus)
      if (inner.tag === "reject") {
        return { tag: "reject", source, reason: inner.reason }
      }

      return { tag: "match", source, focus: inner.focus }
    },
    embed: (value) => {
      const inner = innerWitness.embed(value)
      const outer = outerWitness.embed(inner.result)
      return { tag: "build", value, result: outer.result }
    },
  }

  return attachPrismWitness(composed, bundle)
}

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
