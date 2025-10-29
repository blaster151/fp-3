import { pipe } from "../../core"
import type { Option } from "../../option"
import { None, Some, getOrElseO, mapO } from "../../option"
import type { Result } from "../../result"
import { Err, Ok, isOk } from "../../result"
import type { Lens, Prism } from "./lens-prism"
import type { OptionalLike } from "./profunctor"
import {
  composeOptionalLike,
  fromLens,
  fromOptional,
  fromPrism,
  lensLikeToOptionalLike,
  optionalLikeToTraversalLike,
  prismLikeToOptionalLike,
  rightFromLeft,
  toOptional,
  toTraversal,
} from "./profunctor"
import {
  attachOptionalWitness,
  attachPrismWitness,
  makeOptionalWitnessBundle,
  makePrismWitnessBundle,
  optionalMiss,
  readOptionalWitness,
  readPrismWitness,
  type OptionalWitnessBundle,
  type OptionalWitnessCarrier,
  type PrismWitnessBundle,
} from "./witness"

/** Optional and Traversal abstractions extracted from allTS.ts. */
export const optional = <S, A>(getOption: (s: S) => Option<A>, set: (a: A, s: S) => S): Optional<S, A> => {
  const optic: OptionalLike<S, S, A, A> = ((P) => {
    const right = rightFromLeft(P)
    return (pab) =>
      P.dimap(
        right<readonly [A, S], readonly [A, S], S>(P.first<A, A, S>(pab)),
        (s: S) =>
          pipe(
            getOption(s),
            mapO((a: A): readonly [A, S] => [a, s] as const),
            mapO((pair: readonly [A, S]): Result<S, readonly [A, S]> => Ok(pair)),
            getOrElseO<Result<S, readonly [A, S]>>(() => Err(s)),
          ),
        (result) =>
          isOk(result)
            ? set(result.value[0], result.value[1])
            : result.error,
      )
  }) as OptionalLike<S, S, A, A>
  const base = toOptional(optic)
  const bundle = makeOptionalWitnessBundle<S, A>(
    getOption,
    (next, source) => set(next, source),
  )
  return attachOptionalBundle(base, bundle, [optic])
}

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
} & OptionalWitnessCarrier<S, A>

const ensureOptionalWitness = <S, A>(opt: Optional<S, A>): OptionalWitnessBundle<S, A> => {
  const existing = readOptionalWitness(opt)
  if (existing) {
    return existing
  }

  const bundle = makeOptionalWitnessBundle(
    (source: S) => opt.getOption(source),
    (next: A, source: S) => opt.set(next)(source),
  )

  attachOptionalWitness(opt, bundle)
  return bundle
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

const attachOptionalBundle = <S, A>(
  opt: Optional<S, A>,
  bundle: OptionalWitnessBundle<S, A>,
  carriers: readonly OptionalWitnessCarrier<S, A>[] = [],
): Optional<S, A> => {
  for (const carrier of carriers) {
    attachOptionalWitness(carrier, bundle)
  }
  return attachOptionalWitness(opt, bundle)
}

export const composeOptional = <S, A, B>(ab: Optional<A, B>) => (sa: Optional<S, A>): Optional<S, B> => {
  const composed = toOptional(composeOptionalLike(fromOptional(ab), fromOptional(sa)))
  const outerWitness = ensureOptionalWitness(sa)
  const innerWitness = ensureOptionalWitness(ab)

  const bundle: OptionalWitnessBundle<S, B> = {
    focus: (source) => {
      const outer = outerWitness.focus(source)
      if (outer.tag === "miss") {
        return optionalMiss(source, outer.reason)
      }

      const inner = innerWitness.focus(outer.focus)
      if (inner.tag === "miss") {
        return optionalMiss(source, inner.reason)
      }

      return { tag: "hit", source, focus: inner.focus }
    },
    update: (before, next) => {
      const outer = outerWitness.focus(before)
      if (outer.tag === "miss") {
        const miss = optionalMiss(before, outer.reason)
        return { tag: "skipped", before, reason: miss.reason, miss }
      }

      const innerFocus = innerWitness.focus(outer.focus)
      if (innerFocus.tag === "miss") {
        const miss = optionalMiss(before, innerFocus.reason)
        return { tag: "skipped", before, reason: miss.reason, miss }
      }

      const innerUpdate = innerWitness.update(outer.focus, next)
      if (innerUpdate.tag === "skipped") {
        const reason = innerUpdate.reason
        const miss = optionalMiss(before, reason)
        return { tag: "skipped", before, reason, miss }
      }

      try {
        const after = composed.set(next)(before)
        return {
          tag: "updated",
          before,
          after,
          previous: innerUpdate.previous,
          next,
        }
      } catch (error) {
        const reason = { tag: "errored", error } as const
        const miss = optionalMiss(before, reason)
        return { tag: "skipped", before, reason, miss }
      }
    },
  }

  return attachOptionalBundle(composed, bundle)
}

export const lensToOptional = <S, A>(ln: Lens<S, A>): Optional<S, A> => {
  const optic = lensLikeToOptionalLike(fromLens(ln))
  const base = toOptional(optic)
  const bundle = makeOptionalWitnessBundle<S, A>(
    (source: S) => Some(ln.get(source)),
    (next: A, source: S) => ln.set(next)(source),
  )
  return attachOptionalBundle(base, bundle, [optic])
}

export const prismToOptional = <S, A>(pr: Prism<S, A>): Optional<S, A> => {
  const optionalLike = prismLikeToOptionalLike(fromPrism(pr))
  const base = toOptional(optionalLike)
  const witness = ensurePrismWitness(pr)
  const bundle: OptionalWitnessBundle<S, A> = {
    focus: (source) => {
      const match = witness.match(source)
      return match.tag === "match"
        ? { tag: "hit", source, focus: match.focus }
        : optionalMiss(source, match.reason)
    },
    update: (before, next) => {
      const match = witness.match(before)
      if (match.tag === "reject") {
        const miss = optionalMiss(before, match.reason)
        return { tag: "skipped", before, reason: miss.reason, miss }
      }

      try {
        const after = base.set(next)(before)
        return {
          tag: "updated",
          before,
          after,
          previous: match.focus,
          next,
        }
      } catch (error) {
        const reason = { tag: "errored", error } as const
        const miss = optionalMiss(before, reason)
        return { tag: "skipped", before, reason, miss }
      }
    },
  }

  return attachOptionalBundle(base, bundle, [optionalLike])
}

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

export const optionalToTraversal = <S, A>(opt: Optional<S, A>): Traversal<S, A> =>
  toTraversal(optionalLikeToTraversalLike(fromOptional(opt)))

export const overT = <S, A>(tv: Traversal<S, A>, f: (a: A) => A) => tv.modify(f)
