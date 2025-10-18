import { None, Some, fromNullable, getOrElseO, isSome, mapO, flatMapO, orElseO } from "./option"
import type { Option } from "./option"
import { Err, Ok, flatMapR, isErr, isOk, mapR } from "./result"
import type { Result as ResultT } from "./result"
import type { Task } from "./task"
import type { Validation } from "./validation"
import type { Lazy, Predicate, Refinement } from "./core"
import type { Monoid } from "./stdlib/monoid"

type Result<E, A> = ResultT<E, A>

type IdentityValue<A> = { readonly _id: A }

export type ValidationTag<E> = { readonly tag: 'Validation'; readonly error: E }

export type ResultTag<E> = { readonly tag: 'Result'; readonly error: E }

export type FunctorValue<F, A> =
  F extends 'Option' ? Option<A> :
  F extends 'Result' ? Result<unknown, A> :
  F extends 'Either' ? Result<unknown, A> :
  F extends 'Promise' ? Promise<A> :
  F extends 'Task' ? Task<A> :
  F extends 'Array' ? ReadonlyArray<A> :
  F extends 'Id' ? IdentityValue<A> :
  F extends ValidationTag<infer E> ? Validation<E, A> :
  F extends ResultTag<infer E> ? Result<E, A> :
  F extends 'IdK1' ? A :
  unknown

export interface Functor<F> {
  readonly map: <A, B>(f: (a: A) => B) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

export interface Apply<F> extends Functor<F> {
  readonly ap: <A, B>(fab: FunctorValue<F, (a: A) => B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

export interface Applicative<F> extends Apply<F> {
  readonly of: <A>(a: A) => FunctorValue<F, A>
}

export interface Monad<F> extends Apply<F> {
  readonly of: <A>(a: A) => FunctorValue<F, A>
  readonly chain: <A, B>(f: (a: A) => FunctorValue<F, B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

export type Separated<F, L, R> = {
  readonly left: FunctorValue<F, L>
  readonly right: FunctorValue<F, R>
}

export interface Foldable<F> {
  readonly reduce: <A, B>(b: B, f: (acc: B, a: A) => B) => (fa: FunctorValue<F, A>) => B
  readonly foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: FunctorValue<F, A>) => M
  readonly reduceRight: <A, B>(b: B, f: (a: A, acc: B) => B) => (fa: FunctorValue<F, A>) => B
}

export interface FoldableWithIndex<I, F> extends Foldable<F> {
  readonly reduceWithIndex: <A, B>(b: B, f: (i: I, acc: B, a: A) => B) => (fa: FunctorValue<F, A>) => B
  readonly foldMapWithIndex: <M>(M: Monoid<M>) => <A>(f: (i: I, a: A) => M) => (fa: FunctorValue<F, A>) => M
  readonly reduceRightWithIndex: <A, B>(b: B, f: (i: I, a: A, acc: B) => B) => (fa: FunctorValue<F, A>) => B
}

export interface Traversable<F> extends Functor<F>, Foldable<F> {
  readonly traverse: <G>(G: Applicative<G>) => <A, B>(f: (a: A) => FunctorValue<G, B>) => (ta: FunctorValue<F, A>) => FunctorValue<G, FunctorValue<F, B>>
  readonly sequence: <G>(G: Applicative<G>) => <A>(ta: FunctorValue<F, FunctorValue<G, A>>) => FunctorValue<G, FunctorValue<F, A>>
}

export interface TraversableWithIndex<I, F> extends Traversable<F>, FoldableWithIndex<I, F> {
  readonly traverseWithIndex: <G>(G: Applicative<G>) => <A, B>(f: (i: I, a: A) => FunctorValue<G, B>) => (ta: FunctorValue<F, A>) => FunctorValue<G, FunctorValue<F, B>>
}

export interface Compactable<F> {
  readonly compact: <A>(fa: FunctorValue<F, Option<A>>) => FunctorValue<F, A>
  readonly separate: <A, B>(fa: FunctorValue<F, Result<A, B>>) => Separated<F, A, B>
}

export interface Filterable<F> extends Functor<F>, Compactable<F> {
  readonly filterMap: <A, B>(f: (a: A) => Option<B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
  readonly filter: <A>(predicate: Predicate<A>) => (fa: FunctorValue<F, A>) => FunctorValue<F, A>
  readonly filterRefinement: <A, B extends A>(refinement: Refinement<A, B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
  readonly partitionMap: <A, B, C>(f: (a: A) => Result<B, C>) => (fa: FunctorValue<F, A>) => Separated<F, B, C>
  readonly partition: <A>(predicate: Predicate<A>) => (fa: FunctorValue<F, A>) => Separated<F, A, A>
  readonly partitionRefinement: <A, B extends A>(refinement: Refinement<A, B>) => (fa: FunctorValue<F, A>) => Separated<F, Exclude<A, B>, B>
}

export interface FilterableWithIndex<I, F> extends Filterable<F>, FoldableWithIndex<I, F> {
  readonly filterMapWithIndex: <A, B>(f: (i: I, a: A) => Option<B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
  readonly filterWithIndex: <A>(predicate: (i: I, a: A) => boolean) => (fa: FunctorValue<F, A>) => FunctorValue<F, A>
  readonly partitionMapWithIndex: <A, B, C>(f: (i: I, a: A) => Result<B, C>) => (fa: FunctorValue<F, A>) => Separated<F, B, C>
  readonly partitionWithIndex: <A>(predicate: (i: I, a: A) => boolean) => (fa: FunctorValue<F, A>) => Separated<F, A, A>
}

export interface Witherable<F> extends Traversable<F>, Filterable<F> {
  readonly wither: <G>(G: Applicative<G>) => <A, B>(f: (a: A) => FunctorValue<G, Option<B>>) => (ta: FunctorValue<F, A>) => FunctorValue<G, FunctorValue<F, B>>
  readonly wilt: <G, B, C>(G: Applicative<G>) => <A>(f: (a: A) => FunctorValue<G, Result<B, C>>) => (ta: FunctorValue<F, A>) => FunctorValue<G, Separated<F, B, C>>
}

const foldableArray: Foldable<'Array'> = {
  reduce: <A, B>(b: B, f: (acc: B, a: A) => B) => (fa: ReadonlyArray<A>): B => fa.reduce(f, b),
  foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: ReadonlyArray<A>): M => fa.reduce((acc, a) => M.concat(acc, f(a)), M.empty),
  reduceRight: <A, B>(b: B, f: (a: A, acc: B) => B) => (fa: ReadonlyArray<A>): B => fa.reduceRight((acc, a) => f(a, acc), b),
}

const foldableWithIndexArray: FoldableWithIndex<number, 'Array'> = {
  ...foldableArray,
  reduceWithIndex:
    <A, B>(b: B, f: (i: number, acc: B, a: A) => B) =>
    (fa: ReadonlyArray<A>): B => fa.reduce((acc, a, i) => f(i, acc, a), b),
  foldMapWithIndex:
    <M>(M: Monoid<M>) =>
    <A>(f: (i: number, a: A) => M) =>
    (fa: ReadonlyArray<A>): M => fa.reduce((acc, a, i) => M.concat(acc, f(i, a)), M.empty),
  reduceRightWithIndex:
    <A, B>(b: B, f: (i: number, a: A, acc: B) => B) =>
    (fa: ReadonlyArray<A>): B => fa.reduceRight((acc, a, i) => f(i, a, acc), b),
}

const traverseArray = <G>(G: Applicative<G>) =>
  <A, B>(f: (a: A) => FunctorValue<G, B>) =>
  (ta: ReadonlyArray<A>): FunctorValue<G, ReadonlyArray<B>> => {
    return ta.reduce<FunctorValue<G, ReadonlyArray<B>>>(
      (gbs, a) => {
        const append = (bs: ReadonlyArray<B>) => (b: B): ReadonlyArray<B> => [...bs, b]
        const liftedAppend = G.map<ReadonlyArray<B>, (b: B) => ReadonlyArray<B>>(append)(gbs)
        return G.ap(liftedAppend)(f(a))
      },
      G.of<ReadonlyArray<B>>([]),
    )
  }

const traversableArray: Traversable<'Array'> = {
  ...foldableArray,
  map: <A, B>(f: (a: A) => B) => (fa: ReadonlyArray<A>): ReadonlyArray<B> => fa.map(f),
  traverse: traverseArray,
  sequence: <G>(G: Applicative<G>) => <A>(ta: ReadonlyArray<FunctorValue<G, A>>) => traverseArray(G)((x: FunctorValue<G, A>) => x)(ta),
}

const traversableWithIndexArray: TraversableWithIndex<number, 'Array'> = {
  ...traversableArray,
  ...foldableWithIndexArray,
  traverseWithIndex:
    <G>(G: Applicative<G>) =>
    <A, B>(f: (i: number, a: A) => FunctorValue<G, B>) =>
    (ta: ReadonlyArray<A>): FunctorValue<G, ReadonlyArray<B>> => {
      return ta.reduce<FunctorValue<G, ReadonlyArray<B>>>(
        (gbs, a, i) => {
          const append = (bs: ReadonlyArray<B>) => (b: B): ReadonlyArray<B> => [...bs, b]
          const liftedAppend = G.map<ReadonlyArray<B>, (b: B) => ReadonlyArray<B>>(append)(gbs)
          return G.ap(liftedAppend)(f(i, a))
        },
        G.of<ReadonlyArray<B>>([]),
      )
    },
}

const compactArray = <A>(fa: ReadonlyArray<Option<A>>): ReadonlyArray<A> => {
  const out: Array<A> = []
  for (const oa of fa) {
    if (isSome(oa)) {
      out.push(oa.value)
    }
  }
  return out
}

const separateArray = <A, B>(fa: ReadonlyArray<Result<A, B>>): Separated<'Array', A, B> => {
  const left: Array<A> = []
  const right: Array<B> = []
  for (const r of fa) {
    if (isErr(r)) {
      left.push(r.error)
    } else {
      right.push(r.value)
    }
  }
  return { left, right }
}

const filterableArray: FilterableWithIndex<number, 'Array'> = {
  ...traversableWithIndexArray,
  compact: compactArray,
  separate: separateArray,
  filterMap: <A, B>(f: (a: A) => Option<B>) => (fa: ReadonlyArray<A>): ReadonlyArray<B> => compactArray(fa.map(f)),
  filter: <A>(predicate: Predicate<A>) => (fa: ReadonlyArray<A>): ReadonlyArray<A> => fa.filter(predicate),
  filterRefinement: <A, B extends A>(refinement: Refinement<A, B>) => (fa: ReadonlyArray<A>): ReadonlyArray<B> => fa.filter(refinement as Predicate<A>) as ReadonlyArray<B>,
  partitionMap:
    <A, B, C>(f: (a: A) => Result<B, C>) =>
    (fa: ReadonlyArray<A>): Separated<'Array', B, C> => separateArray(fa.map(f)),
  partition:
    <A>(predicate: Predicate<A>) =>
    (fa: ReadonlyArray<A>): Separated<'Array', A, A> => {
      const left: Array<A> = []
      const right: Array<A> = []
      for (const a of fa) {
        if (predicate(a)) {
          right.push(a)
        } else {
          left.push(a)
        }
      }
      return { left, right }
    },
  partitionRefinement:
    <A, B extends A>(refinement: Refinement<A, B>) =>
    (fa: ReadonlyArray<A>): Separated<'Array', Exclude<A, B>, B> => {
      const left: Array<Exclude<A, B>> = []
      const right: Array<B> = []
      for (const a of fa) {
        if (refinement(a)) {
          right.push(a)
        } else {
          left.push(a as Exclude<A, B>)
        }
      }
      return { left, right }
    },
  filterMapWithIndex:
    <A, B>(f: (i: number, a: A) => Option<B>) =>
    (fa: ReadonlyArray<A>): ReadonlyArray<B> => compactArray(fa.map((a, i) => f(i, a))),
  filterWithIndex:
    <A>(predicate: (i: number, a: A) => boolean) =>
    (fa: ReadonlyArray<A>): ReadonlyArray<A> => fa.filter((a, i) => predicate(i, a)),
  partitionMapWithIndex:
    <A, B, C>(f: (i: number, a: A) => Result<B, C>) =>
    (fa: ReadonlyArray<A>): Separated<'Array', B, C> => separateArray(fa.map((a, i) => f(i, a))),
  partitionWithIndex:
    <A>(predicate: (i: number, a: A) => boolean) =>
    (fa: ReadonlyArray<A>): Separated<'Array', A, A> => {
      const left: Array<A> = []
      const right: Array<A> = []
      for (let i = 0; i < fa.length; i += 1) {
        const a = fa[i]
        if (predicate(i, a)) {
          right.push(a)
        } else {
          left.push(a)
        }
      }
      return { left, right }
    },
}

const witherableArray: Witherable<'Array'> = {
  ...filterableArray,
  traverse: traversableArray.traverse,
  sequence: traversableArray.sequence,
  wither:
    <G>(G: Applicative<G>) =>
    <A, B>(f: (a: A) => FunctorValue<G, Option<B>>) =>
    (ta: ReadonlyArray<A>): FunctorValue<G, ReadonlyArray<B>> =>
      G.map(compactArray)(traverseArray(G)(f)(ta)),
  wilt:
    <G, B, C>(G: Applicative<G>) =>
    <A>(f: (a: A) => FunctorValue<G, Result<B, C>>) =>
    (ta: ReadonlyArray<A>): FunctorValue<G, Separated<'Array', B, C>> =>
      G.map(separateArray)(traverseArray(G)(f)(ta)),
}

const foldableOption: Foldable<'Option'> = {
  reduce: <A, B>(b: B, f: (acc: B, a: A) => B) => (fa: Option<A>): B => (isSome(fa) ? f(b, fa.value) : b),
  foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Option<A>): M => (isSome(fa) ? f(fa.value) : M.empty),
  reduceRight: <A, B>(b: B, f: (a: A, acc: B) => B) => (fa: Option<A>): B => (isSome(fa) ? f(fa.value, b) : b),
}

const traversableOption: TraversableWithIndex<void, 'Option'> = {
  ...foldableOption,
  reduceWithIndex: <A, B>(b: B, f: (_: void, acc: B, a: A) => B) => (fa: Option<A>): B => (isSome(fa) ? f(undefined, b, fa.value) : b),
  foldMapWithIndex:
    <M>(M: Monoid<M>) =>
    <A>(f: (_: void, a: A) => M) =>
    (fa: Option<A>): M => (isSome(fa) ? f(undefined, fa.value) : M.empty),
  reduceRightWithIndex:
    <A, B>(b: B, f: (_: void, a: A, acc: B) => B) =>
    (fa: Option<A>): B => (isSome(fa) ? f(undefined, fa.value, b) : b),
  map: mapO,
  traverse:
    <G>(G: Applicative<G>) =>
    <A, B>(f: (a: A) => FunctorValue<G, B>) =>
    (ta: Option<A>): FunctorValue<G, Option<B>> =>
      (isSome(ta) ? G.map((b: B) => Some(b))(f(ta.value)) : G.of<Option<B>>(None)),
  traverseWithIndex:
    <G>(G: Applicative<G>) =>
    <A, B>(f: (_: void, a: A) => FunctorValue<G, B>) =>
    (ta: Option<A>): FunctorValue<G, Option<B>> =>
      (isSome(ta) ? G.map((b: B) => Some(b))(f(undefined, ta.value)) : G.of<Option<B>>(None)),
  sequence: <G>(G: Applicative<G>) => <A>(ta: Option<FunctorValue<G, A>>): FunctorValue<G, Option<A>> =>
    (isSome(ta) ? G.map((a: A) => Some(a))(ta.value) : G.of<Option<A>>(None)),
  compact: <A>(fa: Option<Option<A>>): Option<A> => (isSome(fa) ? fa.value : None),
  separate: <A, B>(fa: Option<Result<A, B>>): Separated<'Option', A, B> => {
    if (isSome(fa)) {
      return isErr(fa.value) ? { left: Some(fa.value.error), right: None } : { left: None, right: Some(fa.value.value) }
    }
    return { left: None, right: None }
  },
  filterMap: <A, B>(f: (a: A) => Option<B>) => (fa: Option<A>): Option<B> => (isSome(fa) ? f(fa.value) : None),
  filter: <A>(predicate: Predicate<A>) => (fa: Option<A>): Option<A> => (isSome(fa) && predicate(fa.value) ? fa : None),
  filterRefinement: <A, B extends A>(refinement: Refinement<A, B>) => (fa: Option<A>): Option<B> =>
    (isSome(fa) && refinement(fa.value) ? Some(fa.value) : None),
  partitionMap: <A, B, C>(f: (a: A) => Result<B, C>) => (fa: Option<A>): Separated<'Option', B, C> => {
    if (isSome(fa)) {
      const result = f(fa.value)
      return isErr(result) ? { left: Some(result.error), right: None } : { left: None, right: Some(result.value) }
    }
    return { left: None, right: None }
  },
  partition: <A>(predicate: Predicate<A>) => (fa: Option<A>): Separated<'Option', A, A> => {
    if (isSome(fa)) {
      return predicate(fa.value) ? { left: None, right: fa } : { left: fa, right: None }
    }
    return { left: None, right: None }
  },
  partitionRefinement: <A, B extends A>(refinement: Refinement<A, B>) => (fa: Option<A>): Separated<'Option', Exclude<A, B>, B> => {
    if (isSome(fa)) {
      return refinement(fa.value)
        ? { left: None, right: Some(fa.value) }
        : { left: Some(fa.value as Exclude<A, B>), right: None }
    }
    return { left: None, right: None }
  },
  filterMapWithIndex: <A, B>(f: (_: void, a: A) => Option<B>) => (fa: Option<A>): Option<B> => (isSome(fa) ? f(undefined, fa.value) : None),
  filterWithIndex: <A>(predicate: (_: void, a: A) => boolean) => (fa: Option<A>): Option<A> =>
    (isSome(fa) && predicate(undefined, fa.value) ? fa : None),
  partitionMapWithIndex: <A, B, C>(f: (_: void, a: A) => Result<B, C>) => (fa: Option<A>): Separated<'Option', B, C> => {
    if (isSome(fa)) {
      const result = f(undefined, fa.value)
      return isErr(result) ? { left: Some(result.error), right: None } : { left: None, right: Some(result.value) }
    }
    return { left: None, right: None }
  },
  partitionWithIndex: <A>(predicate: (_: void, a: A) => boolean) => (fa: Option<A>): Separated<'Option', A, A> => {
    if (isSome(fa)) {
      return predicate(undefined, fa.value) ? { left: None, right: fa } : { left: fa, right: None }
    }
    return { left: None, right: None }
  },
  wither:
    <G>(G: Applicative<G>) =>
    <A, B>(f: (a: A) => FunctorValue<G, Option<B>>) =>
    (ta: Option<A>): FunctorValue<G, Option<B>> =>
      (isSome(ta)
        ? G.map((ob: Option<B>) => (isSome(ob) ? Some(ob.value) : None))(f(ta.value))
        : G.of<Option<B>>(None)),
  wilt:
    <G, B, C>(G: Applicative<G>) =>
    <A>(f: (a: A) => FunctorValue<G, Result<B, C>>) =>
    (ta: Option<A>): FunctorValue<G, Separated<'Option', B, C>> => {
      if (isSome(ta)) {
        return G.map((res: Result<B, C>) => (isErr(res)
          ? { left: Some(res.error), right: None }
          : { left: None, right: Some(res.value) }))(f(ta.value))
      }
      return G.of({ left: None, right: None } as Separated<'Option', B, C>)
    },
}

export type ResultCompactableConfig<E> = {
  readonly onNone: Lazy<E>
  readonly onLeft?: Lazy<E>
  readonly onRight?: Lazy<E>
}

export type ResultFilterableConfig<E> = ResultCompactableConfig<E> & {
  readonly onFalse: <A>(a: A) => E
}

const defaultResultFallback = <E>(fallback: Lazy<E> | undefined, otherwise: Lazy<E>): E => (fallback ? fallback() : otherwise())

const getResultFoldableInternal = <E>(): Foldable<ResultTag<E>> => ({
  reduce: <A, B>(b: B, f: (acc: B, a: A) => B) => (fa: Result<E, A>): B => (isOk(fa) ? f(b, fa.value) : b),
  foldMap: <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Result<E, A>): M => (isOk(fa) ? f(fa.value) : M.empty),
  reduceRight: <A, B>(b: B, f: (a: A, acc: B) => B) => (fa: Result<E, A>): B => (isOk(fa) ? f(fa.value, b) : b),
})

const getResultTraversableInternal = <E>(): Traversable<ResultTag<E>> => {
  const FoldableResult = getResultFoldableInternal<E>()
  return {
    ...FoldableResult,
    map: <A, B>(f: (a: A) => B) => (fa: Result<E, A>): Result<E, B> => (isOk(fa) ? Ok(f(fa.value)) : fa),
    traverse:
      <G>(G: Applicative<G>) =>
      <A, B>(f: (a: A) => FunctorValue<G, B>) =>
      (ta: Result<E, A>): FunctorValue<G, Result<E, B>> =>
        (isOk(ta) ? G.map((b: B) => Ok(b) as Result<E, B>)(f(ta.value)) : G.of<Result<E, B>>(ta as Result<E, B>)),
    sequence:
      <G>(G: Applicative<G>) =>
      <A>(ta: Result<E, FunctorValue<G, A>>): FunctorValue<G, Result<E, A>> =>
        (isOk(ta) ? G.map((a: A) => Ok(a) as Result<E, A>)(ta.value) : G.of<Result<E, A>>(ta as Result<E, A>)),
  }
}

const getResultCompactableInternal = <E>(config: ResultCompactableConfig<E>): Compactable<ResultTag<E>> => ({
  compact: <A>(fa: Result<E, Option<A>>): Result<E, A> => {
    if (isOk(fa)) {
      return isSome(fa.value) ? Ok(fa.value.value) : Err(config.onNone())
    }
    return fa
  },
  separate: <A, B>(fa: Result<E, Result<A, B>>): Separated<ResultTag<E>, A, B> => {
    if (isOk(fa)) {
      const inner = fa.value
      if (isErr(inner)) {
        return {
          left: Ok(inner.error),
          right: Err(defaultResultFallback(config.onRight, config.onNone)),
        }
      }
      return {
        left: Err(defaultResultFallback(config.onLeft, config.onNone)),
        right: Ok(inner.value),
      }
    }
    return { left: fa as Result<E, A>, right: fa as Result<E, B> }
  },
})

const getResultFilterableInternal = <E>(config: ResultFilterableConfig<E>): Filterable<ResultTag<E>> => {
  const compactable = getResultCompactableInternal(config)
  return {
    ...getResultTraversableInternal<E>(),
    compact: compactable.compact,
    separate: compactable.separate,
    filterMap:
      <A, B>(f: (a: A) => Option<B>) =>
      (fa: Result<E, A>): Result<E, B> => {
        if (isOk(fa)) {
          const ob = f(fa.value)
          return isSome(ob) ? Ok(ob.value) : Err(config.onNone())
        }
        return fa as Result<E, B>
      },
    filter:
      <A>(predicate: Predicate<A>) =>
      (fa: Result<E, A>): Result<E, A> => {
        if (isOk(fa)) {
          return predicate(fa.value) ? fa : Err(config.onFalse(fa.value))
        }
        return fa
      },
    filterRefinement:
      <A, B extends A>(refinement: Refinement<A, B>) =>
      (fa: Result<E, A>): Result<E, B> => {
        if (isOk(fa)) {
          return refinement(fa.value) ? Ok(fa.value) : Err(config.onFalse(fa.value))
        }
        return fa as Result<E, B>
      },
    partitionMap:
      <A, B, C>(f: (a: A) => Result<B, C>) =>
      (fa: Result<E, A>): Separated<ResultTag<E>, B, C> => {
        if (isOk(fa)) {
          const inner = f(fa.value)
          return isErr(inner)
            ? {
                left: Ok(inner.error),
                right: Err(defaultResultFallback(config.onRight, config.onNone)),
              }
            : {
                left: Err(defaultResultFallback(config.onLeft, config.onNone)),
                right: Ok(inner.value),
              }
        }
        return { left: fa as Result<E, B>, right: fa as Result<E, C> }
      },
    partition:
      <A>(predicate: Predicate<A>) =>
      (fa: Result<E, A>): Separated<ResultTag<E>, A, A> => {
        if (isOk(fa)) {
          return predicate(fa.value)
            ? {
                left: Err(defaultResultFallback(config.onLeft, config.onNone)),
                right: fa,
              }
            : {
                left: fa,
                right: Err(defaultResultFallback(config.onRight, config.onNone)),
              }
        }
        return { left: fa as Result<E, A>, right: fa as Result<E, A> }
      },
    partitionRefinement:
      <A, B extends A>(refinement: Refinement<A, B>) =>
      (fa: Result<E, A>): Separated<ResultTag<E>, Exclude<A, B>, B> => {
        if (isOk(fa)) {
          return refinement(fa.value)
            ? {
                left: Err(defaultResultFallback(config.onLeft, config.onNone)) as Result<E, Exclude<A, B>>,
                right: Ok(fa.value),
              }
            : {
                left: Ok(fa.value as Exclude<A, B>),
                right: Err(defaultResultFallback(config.onRight, config.onNone)),
              }
        }
        return { left: fa as Result<E, Exclude<A, B>>, right: fa as Result<E, B> }
      },
  }
}

const getResultWitherableInternal = <E>(config: ResultFilterableConfig<E>): Witherable<ResultTag<E>> => {
  const filterable = getResultFilterableInternal(config)
  return {
    ...filterable,
    wither:
      <G>(G: Applicative<G>) =>
      <A, B>(f: (a: A) => FunctorValue<G, Option<B>>) =>
      (ta: Result<E, A>): FunctorValue<G, Result<E, B>> => {
        if (isOk(ta)) {
          return G.map((ob: Option<B>) => (isSome(ob) ? Ok(ob.value) : Err(config.onNone())))(f(ta.value))
        }
        return G.of<Result<E, B>>(ta as Result<E, B>)
      },
    wilt:
      <G, B, C>(G: Applicative<G>) =>
      <A>(f: (a: A) => FunctorValue<G, Result<B, C>>) =>
      (ta: Result<E, A>): FunctorValue<G, Separated<ResultTag<E>, B, C>> => {
        if (isOk(ta)) {
          return G.map((inner: Result<B, C>) => (isErr(inner)
            ? {
                left: Ok(inner.error),
                right: Err(defaultResultFallback(config.onRight, config.onNone)),
              }
            : {
                left: Err(defaultResultFallback(config.onLeft, config.onNone)),
                right: Ok(inner.value),
              }))(f(ta.value))
        }
        return G.of({ left: ta as Result<E, B>, right: ta as Result<E, C> })
      },
  }
}

export const getFoldableArray = (): Foldable<'Array'> => foldableArray
export const getFoldableWithIndexArray = (): FoldableWithIndex<number, 'Array'> => foldableWithIndexArray
export const getTraversableArray = (): Traversable<'Array'> => traversableArray
export const getTraversableWithIndexArray = (): TraversableWithIndex<number, 'Array'> => traversableWithIndexArray
export const getFilterableArray = (): FilterableWithIndex<number, 'Array'> => filterableArray
export const getWitherableArray = (): Witherable<'Array'> => witherableArray

export const OptionFoldable: Foldable<'Option'> = foldableOption
export const OptionFoldableWithIndex: FoldableWithIndex<void, 'Option'> = traversableOption
export const OptionTraversable: TraversableWithIndex<void, 'Option'> = traversableOption
export const OptionFilterable: FilterableWithIndex<void, 'Option'> = traversableOption
export const OptionWitherable: Witherable<'Option'> = traversableOption

export const getResultFoldable = <E>(): Foldable<ResultTag<E>> => getResultFoldableInternal<E>()
export const getResultTraversable = <E>(): Traversable<ResultTag<E>> => getResultTraversableInternal<E>()
export const getResultCompactable = <E>(config: ResultCompactableConfig<E>): Compactable<ResultTag<E>> => getResultCompactableInternal(config)
export const getResultFilterable = <E>(config: ResultFilterableConfig<E>): Filterable<ResultTag<E>> => getResultFilterableInternal(config)
export const getResultWitherable = <E>(config: ResultFilterableConfig<E>): Witherable<ResultTag<E>> => getResultWitherableInternal(config)

const defaultResultConfig: ResultFilterableConfig<unknown> = {
  onNone: () => undefined,
  onFalse: () => undefined,
}

export const ResultFoldable: Foldable<'Result'> = getResultFoldableInternal<unknown>()
export const ResultTraversable: Traversable<'Result'> = getResultTraversableInternal<unknown>()
export const ResultCompactable: Compactable<'Result'> = getResultCompactableInternal(defaultResultConfig)
export const ResultFilterable: Filterable<'Result'> = getResultFilterableInternal(defaultResultConfig)
export const ResultWitherable: Witherable<'Result'> = getResultWitherableInternal(defaultResultConfig)

export const OptionI: Monad<'Option'> = {
  map: mapO,
  ap: <A, B>(fab: Option<(a: A) => B>) => (fa: Option<A>): Option<B> => (isSome(fab) && isSome(fa) ? Some(fab.value(fa.value)) : None),
  of: Some,
  chain: flatMapO,
}

export const ResultI: Monad<'Result'> = {
  map: mapR,
  ap:
    <E, A, B>(rfab: Result<E, (a: A) => B>) =>
    (rfa: Result<E, A>): Result<E, B> => {
      if (isErr(rfab)) {
        return rfab
      }
      if (isErr(rfa)) {
        return rfa
      }
      return Ok(rfab.value(rfa.value))
    },
  of: Ok,
  chain: flatMapR,
}

export const MaybeM = {
  of: <A>(a: A) => Some(a),
  map: mapO,
  chain: flatMapO,
  ap:
    <A, B>(ofab: Option<(a: A) => B>) =>
    (oa: Option<A>): Option<B> =>
      isSome(ofab) && isSome(oa) ? Some(ofab.value(oa.value)) : None,
  getOrElse: getOrElseO,
  orElse: orElseO,
  fromNullable,
}

export const PromiseM = {
  of: <A>(a: A) => Promise.resolve(a) as Promise<A>,
  map:
    <A, B>(f: (a: A) => B) =>
    (pa: Promise<A>): Promise<B> =>
      pa.then(f),
  chain:
    <A, B>(f: (a: A) => Promise<B>) =>
    (pa: Promise<A>): Promise<B> =>
      pa.then(f),
  ap:
    <A, B>(pfab: Promise<(a: A) => B>) =>
    (pa: Promise<A>): Promise<B> =>
      Promise.all([pfab, pa]).then(([fab, a]) => fab(a)),
}

export const ResultM = <E>() => ({
  of: <A>(a: A): Result<E, A> => Ok(a),
  map: <A, B>(f: (a: A) => B) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? Ok(f(ra.value)) : ra,
  chain: <A, B>(f: (a: A) => Result<E, B>) =>
    (ra: Result<E, A>): Result<E, B> =>
      isOk(ra) ? f(ra.value) : ra,
  ap: <A, B>(rfab: Result<E, (a: A) => B>) =>
    (ra: Result<E, A>): Result<E, B> => {
      if (isErr(rfab)) {
        return rfab
      }
      if (isErr(ra)) {
        return ra
      }
      return Ok(rfab.value(ra.value))
    },
  mapErr: <F>(_: (e: E) => F) =>
    <A>(ra: Result<E, A>): Result<E, A> =>
      ra,
})

export const composeK_Maybe =
  <A, B, C>(f: (a: A) => Option<B>, g: (b: B) => Option<C>) =>
  (a: A): Option<C> =>
    flatMapO(g)(f(a))

export const composeK_Promise =
  <A, B, C>(f: (a: A) => Promise<B>, g: (b: B) => Promise<C>) =>
  (a: A): Promise<C> =>
    f(a).then(g)

export const composeK_Array =
  <A, B, C>(f: (a: A) => ReadonlyArray<B>, g: (b: B) => ReadonlyArray<C>) =>
  (a: A): ReadonlyArray<C> =>
    f(a).flatMap(g)

export const composeK_ResultE =
  <E>() =>
  <A, B, C>(f: (a: A) => Result<E, B>, g: (b: B) => Result<E, C>) =>
  (a: A): Result<E, C> => {
    const fb = f(a)
    return isOk(fb) ? g(fb.value) : fb
  }
