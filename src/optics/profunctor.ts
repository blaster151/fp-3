import { pipe } from "../../core"
import type { Option } from "../../option"
import { Some, getOrElseO, mapO } from "../../option"
import type { Result } from "../../result"
import { Err, Ok, isErr, isOk } from "../../result"
import type { Applicative, FunctorValue } from "../../typeclasses"
import type { Lens, Prism } from "./lens-prism"
import type { Optional, Traversal } from "./optional-traversal"
import {
  attachOptionalWitness,
  attachPrismWitness,
  makeOptionalWitnessBundle,
  makePrismWitnessBundle,
  readOptionalWitness,
  readPrismWitness,
  type OptionalWitnessCarrier,
  type PrismWitnessCarrier,
} from "./witness"

/**
 * Higher-kinded registry for binary profunctor constructors.
 *
 * The registry mirrors the HK infrastructure in `typeclasses/hkt.ts` but allows
 * both slots to vary. We keep it intentionally lightweight so each profunctor
 * can be described by a simple identifier that selects the underlying data
 * representation.
 */
export namespace HKP {
  export type FunctionId = "Function"
  export type PreviewId = "Preview"
  export type TaggedId = "Tagged"

  export type ForgetId<R> = readonly ["Forget", R]
  export type StarId<F> = readonly ["Star", F]

  export type Id = FunctionId | PreviewId | TaggedId | ForgetId<unknown> | StarId<unknown>

  export type Kind<I extends Id, A, B> = I extends FunctionId
    ? (a: A) => B
    : I extends PreviewId
      ? (a: A) => Option<B>
      : I extends TaggedId
        ? B
        : I extends ForgetId<infer R>
          ? (a: A) => R
          : I extends StarId<infer F>
            ? (a: A) => FunctorValue<F, B>
            : never
}

export interface Profunctor<I extends HKP.Id> {
  readonly dimap: <S, T, A, B>(
    pab: HKP.Kind<I, A, B>,
    f: (s: S) => A,
    g: (b: B) => T,
  ) => HKP.Kind<I, S, T>
}

export interface Strong<I extends HKP.Id> extends Profunctor<I> {
  readonly first: <A, B, C>(pab: HKP.Kind<I, A, B>) => HKP.Kind<I, readonly [A, C], readonly [B, C]>
}

export const secondFromFirst = <I extends HKP.Id>(P: Strong<I>) =>
  <A, B, C>(pab: HKP.Kind<I, A, B>): HKP.Kind<I, readonly [C, A], readonly [C, B]> =>
    P.dimap<readonly [C, A], readonly [C, B], readonly [A, C], readonly [B, C]>(
      P.first(pab),
      ([c, a]) => [a, c] as const,
      ([b, c]) => [c, b] as const,
    )

export interface Choice<I extends HKP.Id> extends Profunctor<I> {
  readonly left: <A, B, C>(pab: HKP.Kind<I, A, B>) => HKP.Kind<I, Result<A, C>, Result<B, C>>
}

export const rightFromLeft = <I extends HKP.Id>(P: Choice<I>) =>
  <A, B, C>(pab: HKP.Kind<I, A, B>): HKP.Kind<I, Result<C, A>, Result<C, B>> =>
    P.dimap<Result<C, A>, Result<C, B>, Result<A, C>, Result<B, C>>(
      P.left(pab),
      (rca) => (isErr(rca) ? Ok(rca.error) : Err(rca.value)),
      (rbc) => (isErr(rbc) ? Ok(rbc.error) : Err(rbc.value)),
    )

export type Affine<I extends HKP.Id> = Strong<I> & Choice<I>

export type Optic<I extends HKP.Id, S, T, A, B> = (pab: HKP.Kind<I, A, B>) => HKP.Kind<I, S, T>

export type LensLike<S, T, A, B> = <I extends HKP.Id>(P: Strong<I>) => Optic<I, S, T, A, B>

export type PrismLike<S, T, A, B> = (<I extends HKP.Id>(P: Choice<I>) => Optic<I, S, T, A, B>) &
  PrismWitnessCarrier<S, A>

export type OptionalLike<S, T, A, B> = (<I extends HKP.Id>(P: Affine<I>) => Optic<I, S, T, A, B>) &
  OptionalWitnessCarrier<S, A>

export interface Wander<I extends HKP.Id, F> extends Strong<I> {
  readonly wander: <S, T, A, B>(
    pab: HKP.Kind<I, A, B>,
    traverse: (afb: (a: A) => FunctorValue<F, B>) => (s: S) => FunctorValue<F, T>,
  ) => HKP.Kind<I, S, T>
}

export type TraversalLike<S, T, A, B> = <F>(applicative: Applicative<F>) => Optic<HKP.StarId<F>, S, T, A, B>

const functionProfunctor: Affine<HKP.FunctionId> = {
  dimap: <S, T, A, B>(pab: HKP.Kind<HKP.FunctionId, A, B>, f: (s: S) => A, g: (b: B) => T) =>
    (s: S) => g(pab(f(s))),
  first: <A, B, C>(pab: HKP.Kind<HKP.FunctionId, A, B>) =>
    ([a, c]: readonly [A, C]) => [pab(a), c] as const,
  left: <A, B, C>(pab: HKP.Kind<HKP.FunctionId, A, B>) =>
    (rac: Result<A, C>): Result<B, C> =>
      (isErr(rac) ? Err(pab(rac.error)) : Ok(rac.value)),
}

const forgetProfunctor = <R>(): Strong<HKP.ForgetId<R>> => ({
  dimap: (pab, f) => (s) => pab(f(s)),
  first: (pab) => ([a]) => pab(a),
})

const previewProfunctor: Affine<HKP.PreviewId> = {
  dimap: <S, T, A, B>(pab: HKP.Kind<HKP.PreviewId, A, B>, f: (s: S) => A, g: (b: B) => T) =>
    (s: S) => mapO(g)(pab(f(s))),
  first: <A, B, C>(pab: HKP.Kind<HKP.PreviewId, A, B>) =>
    ([a, c]: readonly [A, C]) => mapO((b: B) => [b, c] as const)(pab(a)),
  left: <A, B, C>(pab: HKP.Kind<HKP.PreviewId, A, B>) =>
    (rac: Result<A, C>): Option<Result<B, C>> =>
      (isErr(rac)
        ? mapO((b: B): Result<B, C> => Err(b))(pab(rac.error))
        : Some(Ok(rac.value))),
}

const taggedChoice: Choice<HKP.TaggedId> = {
  dimap: (b, _f, g) => g(b),
  left: (b) => Err(b),
}

const starWander = <F>(applicative: Applicative<F>): Wander<HKP.StarId<F>, F> => ({
  dimap: <S, T, A, B>(pab: HKP.Kind<HKP.StarId<F>, A, B>, f: (s: S) => A, g: (b: B) => T) =>
    (s: S) => applicative.map(g)(pab(f(s))),
  first: <A, B, C>(pab: HKP.Kind<HKP.StarId<F>, A, B>) =>
    ([a, c]: readonly [A, C]) => applicative.map((b: B) => [b, c] as const)(pab(a)),
  wander: <S, T, A, B>(pab: HKP.Kind<HKP.StarId<F>, A, B>, walk: (afb: (a: A) => FunctorValue<F, B>) => (s: S) => FunctorValue<F, T>) =>
    (s: S) => walk((a) => pab(a))(s),
})

const identityApplicative: Applicative<'IdK1'> = {
  of: (a) => a,
  map: (f) => (fa) => f(fa),
  ap: (ff) => (fa) => ff(fa),
}

export const fromLens = <S, A>(ln: Lens<S, A>): LensLike<S, S, A, A> =>
  <I extends HKP.Id>(P: Strong<I>) =>
    (pab: HKP.Kind<I, A, A>) => {
      const first = P.first(pab) as HKP.Kind<I, readonly [A, S], readonly [A, S]>
      return P.dimap(
        first,
        (s: S) => [ln.get(s), s] as const,
        ([a, s]: readonly [A, S]) => ln.set(a)(s),
      )
    }

export const fromPrism = <S, A>(pr: Prism<S, A>): PrismLike<S, S, A, A> => {
  const witness =
    readPrismWitness(pr) ?? makePrismWitnessBundle(pr.getOption, pr.reverseGet)
  attachPrismWitness(pr, witness)
  const optic = (<I extends HKP.Id>(P: Choice<I>) => {
    const right = rightFromLeft(P)
    return (pab: HKP.Kind<I, A, A>) => {
      const lifted = right<A, A, S>(pab as HKP.Kind<I, A, A>)
      return P.dimap(
        lifted,
        (s: S) =>
          pipe(
            pr.getOption(s),
            mapO((a: A): Result<S, A> => Ok(a)),
            getOrElseO<Result<S, A>>(() => Err(s)),
          ),
        (result) => (isOk(result) ? pr.reverseGet(result.value) : result.error),
      )
    }
  }) as PrismLike<S, S, A, A>
  return attachPrismWitness(optic, witness)
}

export const fromOptional = <S, A>(opt: Optional<S, A>): OptionalLike<S, S, A, A> => {
  const witness =
    readOptionalWitness(opt) ??
    makeOptionalWitnessBundle(
      (source) => opt.getOption(source),
      (next, source) => opt.set(next)(source),
    )
  attachOptionalWitness(opt, witness)
  const optic = (<I extends HKP.Id>(P: Affine<I>) => {
    const right = rightFromLeft(P)
    return (pab: HKP.Kind<I, A, A>) => {
      const first = P.first(pab) as HKP.Kind<I, readonly [A, S], readonly [A, S]>
      const lifted = right<readonly [A, S], readonly [A, S], S>(first)
      return P.dimap(
        lifted,
        (s: S) =>
          pipe(
            opt.getOption(s),
            mapO((a: A): readonly [A, S] => [a, s] as const),
            mapO((pair: readonly [A, S]): Result<S, readonly [A, S]> => Ok(pair)),
            getOrElseO<Result<S, readonly [A, S]>>(() => Err(s)),
          ),
        (result) =>
          isOk(result)
            ? opt.set(result.value[0])(result.value[1])
            : result.error,
      )
    }
  }) as OptionalLike<S, S, A, A>
  return attachOptionalWitness(optic, witness)
}

const composeOptics = <I extends HKP.Id, S, T, A, B, C, D>(
  ab: Optic<I, A, B, C, D>,
  sa: Optic<I, S, T, A, B>,
): Optic<I, S, T, C, D> =>
  (pcd) => sa(ab(pcd))

export const composeLensLike = <S, T, A, B, C, D>(
  ab: LensLike<A, B, C, D>,
  sa: LensLike<S, T, A, B>,
): LensLike<S, T, C, D> =>
  <I extends HKP.Id>(P: Strong<I>) => {
    const left = ab(P)
    const right = sa(P)
    return composeOptics(left, right)
  }

export const composePrismLike = <S, T, A, B, C, D>(
  ab: PrismLike<A, B, C, D>,
  sa: PrismLike<S, T, A, B>,
): PrismLike<S, T, C, D> =>
  <I extends HKP.Id>(P: Choice<I>) => {
    const left = ab(P)
    const right = sa(P)
    return composeOptics(left, right)
  }

export const composeOptionalLike = <S, T, A, B, C, D>(
  ab: OptionalLike<A, B, C, D>,
  sa: OptionalLike<S, T, A, B>,
): OptionalLike<S, T, C, D> =>
  <I extends HKP.Id>(P: Affine<I>) => {
    const left = ab(P)
    const right = sa(P)
    return composeOptics(left, right)
  }

export const composeTraversalLike = <S, T, A, B, C, D>(
  ab: TraversalLike<A, B, C, D>,
  sa: TraversalLike<S, T, A, B>,
): TraversalLike<S, T, C, D> =>
  <F>(applicative: Applicative<F>) => {
    const left = ab(applicative)
    const right = sa(applicative)
    return composeOptics(left, right)
  }

export const lensLikeToOptionalLike = <S, T, A, B>(
  ln: LensLike<S, T, A, B>,
): OptionalLike<S, T, A, B> =>
  <I extends HKP.Id>(P: Affine<I>) => ln(P)

export const prismLikeToOptionalLike = <S, T, A, B>(
  pr: PrismLike<S, T, A, B>,
): OptionalLike<S, T, A, B> =>
  <I extends HKP.Id>(P: Affine<I>) => pr(P)

const starChoice = <F>(applicative: Applicative<F>): Choice<HKP.StarId<F>> => ({
  dimap: starWander(applicative).dimap,
  left: <A, B, C>(pab: HKP.Kind<HKP.StarId<F>, A, B>) =>
    (rac: Result<A, C>): FunctorValue<F, Result<B, C>> =>
      (isErr(rac)
        ? applicative.map((b: B): Result<B, C> => Err(b))(pab(rac.error))
        : applicative.of<Result<B, C>>(Ok(rac.value))),
})

const starAffine = <F>(applicative: Applicative<F>): Affine<HKP.StarId<F>> & Wander<HKP.StarId<F>, F> => ({
  ...starWander(applicative),
  left: starChoice(applicative).left,
})

export const optionalLikeToTraversalLike = <S, T, A, B>(
  opt: OptionalLike<S, T, A, B>,
): TraversalLike<S, T, A, B> =>
  <F>(applicative: Applicative<F>) => {
    const affine = starAffine(applicative) as Affine<HKP.StarId<F>>
    return opt(affine)
  }

export const toLens = <S, A>(optic: LensLike<S, S, A, A>): Lens<S, A> => ({
  get: (s: S) => {
    const focus = optic(forgetProfunctor<A>()) as Optic<HKP.ForgetId<A>, S, S, A, A>
    return focus((a: A) => a)(s)
  },
  set: (a: A) => (s: S) => {
    const updater = optic(functionProfunctor) as Optic<HKP.FunctionId, S, S, A, A>
    return updater((_old: A) => a)(s)
  },
})

export const toPrism = <S, A>(optic: PrismLike<S, S, A, A>): Prism<S, A> => {
  const preview = optic(previewProfunctor) as Optic<HKP.PreviewId, S, S, A, A>
  const tagged = optic(taggedChoice) as Optic<HKP.TaggedId, S, S, A, A>
  const getOption = (s: S): Option<A> => preview((a: A) => Some(a))(s) as Option<A>
  const reverseGet = (a: A) => tagged(a)
  const base: Prism<S, A> = {
    getOption,
    reverseGet,
  }
  const witness = readPrismWitness(optic) ?? makePrismWitnessBundle(getOption, reverseGet)
  attachPrismWitness(optic, witness)
  return attachPrismWitness(base, witness)
}

export const toOptional = <S, A>(optic: OptionalLike<S, S, A, A>): Optional<S, A> => {
  const preview = optic(previewProfunctor) as Optic<HKP.PreviewId, S, S, A, A>
  const updater = optic(functionProfunctor) as Optic<HKP.FunctionId, S, S, A, A>
  const getOption = (s: S): Option<A> => preview((a: A) => Some(a))(s) as Option<A>
  const setValue = (a: A, s: S) => updater((_old: A) => a)(s)
  const base: Optional<S, A> = {
    getOption,
    set: (a: A) => (s: S) => setValue(a, s),
  }
  const witness =
    readOptionalWitness(optic) ?? makeOptionalWitnessBundle(getOption, setValue)
  attachOptionalWitness(optic, witness)
  return attachOptionalWitness(base, witness)
}

export const toTraversal = <S, A>(optic: TraversalLike<S, S, A, A>): Traversal<S, A> => ({
  modify: (f: (a: A) => A) => {
    const starOptic = optic(identityApplicative)
    return (s: S) => starOptic((a: A) => f(a))(s)
  },
})

export const FunctionProfunctor = functionProfunctor
export const PreviewProfunctor = previewProfunctor
export const ForgetProfunctor = forgetProfunctor
export const TaggedProfunctor = taggedChoice
export const StarProfunctor = starWander
export { starWander }
