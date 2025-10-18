import type { Eq, Ord, Predicate, Refinement } from "../core"
import type { Option } from "../option"
import { None, Some, isSome } from "../option"
import type { Result } from "../result"
import { isErr } from "../result"
import type { Applicative, Foldable, FunctorValue } from "../typeclasses"
import type { Monoid, Semigroup } from "./monoid"
import type { PartialFn } from "./partial-fn"
import { eqSetBy } from "./eq"

export type Show<A> = (a: A) => string

export interface Magma<A> {
  readonly concat: (x: A, y: A) => A
}

export type ReadonlySetSeparated<L, R> = {
  readonly left: ReadonlySet<L>
  readonly right: ReadonlySet<R>
}

const toMutable = <A>(set: ReadonlySet<A>): Set<A> => new Set(set as Set<A>)
const fromMutable = <A>(set: Set<A>): ReadonlySet<A> => set as unknown as ReadonlySet<A>
const emptyMutable = <A>(): Set<A> => new Set<A>()
const empty = <A>(): ReadonlySet<A> => fromMutable(emptyMutable<A>())

const hasEq = <A>(E: Eq<A>) => (set: ReadonlySet<A>, value: A): boolean => {
  for (const candidate of set) {
    if (E(candidate, value)) return true
  }
  return false
}

const insertEq = <A>(E: Eq<A>) => (set: Set<A>, value: A): void => {
  for (const candidate of set) {
    if (E(candidate, value)) return
  }
  set.add(value)
}

const orderedValues = <A>(set: ReadonlySet<A>, ord?: Ord<A>): ReadonlyArray<A> => {
  const values = Array.from(set)
  if (ord) {
    return values.sort(ord) as ReadonlyArray<A>
  }
  return values as ReadonlyArray<A>
}

const eqTuple = <A, B>(EA: Eq<A>, EB: Eq<B>): Eq<readonly [A, B]> => (x, y) => EA(x[0], y[0]) && EB(x[1], y[1])

export const fromIterable = <A>(iterable: Iterable<A>): ReadonlySet<A> => fromMutable(new Set(iterable))
export const setFrom = fromIterable

export const toReadonlyArray =
  <A>(ord?: Ord<A>) =>
  (set: ReadonlySet<A>): ReadonlyArray<A> => orderedValues(set, ord)
export const toArraySet = toReadonlyArray

export const fromFoldable =
  <F>(F: Foldable<F>) =>
  <A>(E: Eq<A>) =>
  (fa: FunctorValue<F, A>): ReadonlySet<A> => {
    const result = F.reduce<A, Set<A>>(
      emptyMutable<A>(),
      (acc, a) => {
        insertEq(E)(acc, a)
        return acc
      },
    )(fa)
    return fromMutable(result)
  }

export const getEq = <A>(E: Eq<A>): Eq<ReadonlySet<A>> => eqSetBy(E)

export const getShow = <A>(showA: Show<A>, ord?: Ord<A>): Show<ReadonlySet<A>> => (set) => {
  const contents = orderedValues(set, ord).map(showA)
  return `Set { ${contents.join(', ')} }`
}

export const singleton = <A>(value: A): ReadonlySet<A> => fromMutable(new Set([value]))

export const isEmpty = <A>(set: ReadonlySet<A>): boolean => set.size === 0

export const size = <A>(set: ReadonlySet<A>): number => set.size

export const elem =
  <A>(E: Eq<A>) =>
  (value: A) =>
  (set: ReadonlySet<A>): boolean => hasEq(E)(set, value)

export const member = elem

export const subset =
  <A>(E: Eq<A>) =>
  (that: ReadonlySet<A>) =>
  (me: ReadonlySet<A>): boolean => {
    for (const value of me) {
      if (!hasEq(E)(that, value)) return false
    }
    return true
  }

export const isSubsetOf = subset

export const every =
  <A>(predicate: Predicate<A>) =>
  (set: ReadonlySet<A>): boolean => {
    for (const value of set) if (!predicate(value)) return false
    return true
  }

export const some =
  <A>(predicate: Predicate<A>) =>
  (set: ReadonlySet<A>): boolean => {
    for (const value of set) if (predicate(value)) return true
    return false
  }

export const map =
  <A, B>(E: Eq<B>) =>
  (f: (a: A) => B) =>
  (set: ReadonlySet<A>): ReadonlySet<B> => {
    const out = emptyMutable<B>()
    for (const value of set) insertEq(E)(out, f(value))
    return fromMutable(out)
  }

export function filter<A, B extends A>(refinement: Refinement<A, B>): (set: ReadonlySet<A>) => ReadonlySet<B>
export function filter<A>(predicate: Predicate<A>): (set: ReadonlySet<A>) => ReadonlySet<A>
export function filter<A>(predicate: Predicate<A>): (set: ReadonlySet<A>) => ReadonlySet<A> {
  return (set) => {
    const out = emptyMutable<A>()
    for (const value of set) if (predicate(value)) out.add(value)
    return fromMutable(out)
  }
}

export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (set: ReadonlySet<A>) => ReadonlySetSeparated<Exclude<A, B>, B>
export function partition<A>(
  predicate: Predicate<A>
): (set: ReadonlySet<A>) => ReadonlySetSeparated<A, A>
export function partition<A>(
  predicate: Predicate<A>
): (set: ReadonlySet<A>) => ReadonlySetSeparated<A, A> {
  return (set) => {
    const left = emptyMutable<A>()
    const right = emptyMutable<A>()
    for (const value of set) {
      if (predicate(value)) right.add(value)
      else left.add(value)
    }
    return { left: fromMutable(left), right: fromMutable(right) }
  }
}

export const partitionRefinement =
  <A, B extends A>(refinement: Refinement<A, B>) =>
  (set: ReadonlySet<A>): ReadonlySetSeparated<Exclude<A, B>, B> =>
    partition(refinement as Predicate<A>)(set) as ReadonlySetSeparated<Exclude<A, B>, B>

export const partitionMap =
  <A, B, C>(ELeft: Eq<B>, ERight: Eq<C>) =>
  (f: (a: A) => Result<B, C>) =>
  (set: ReadonlySet<A>): ReadonlySetSeparated<B, C> => {
    const left = emptyMutable<B>()
    const right = emptyMutable<C>()
    for (const value of set) {
      const result = f(value)
      if (isErr(result)) insertEq(ELeft)(left, result.error)
      else insertEq(ERight)(right, result.value)
    }
    return { left: fromMutable(left), right: fromMutable(right) }
  }

export const filterMap =
  <A, B>(E: Eq<B>) =>
  (f: (a: A) => Option<B>) =>
  (set: ReadonlySet<A>): ReadonlySet<B> => {
    const out = emptyMutable<B>()
    for (const value of set) {
      const ob = f(value)
      if (isSome(ob)) insertEq(E)(out, ob.value)
    }
    return fromMutable(out)
  }

export const compact =
  <A>(E: Eq<A>) =>
  (set: ReadonlySet<Option<A>>): ReadonlySet<A> => {
    const out = emptyMutable<A>()
    for (const value of set) if (isSome(value)) insertEq(E)(out, value.value)
    return fromMutable(out)
  }

export const separate =
  <A, B>(ELeft: Eq<A>, ERight: Eq<B>) =>
  (set: ReadonlySet<Result<A, B>>): ReadonlySetSeparated<A, B> => {
    const left = emptyMutable<A>()
    const right = emptyMutable<B>()
    for (const value of set) {
      if (isErr(value)) insertEq(ELeft)(left, value.error)
      else insertEq(ERight)(right, value.value)
    }
    return { left: fromMutable(left), right: fromMutable(right) }
  }

export const union =
  <A>(E: Eq<A>) =>
  (that: ReadonlySet<A>) =>
  (me: ReadonlySet<A>): ReadonlySet<A> => {
    const out = toMutable(me)
    for (const value of that) insertEq(E)(out, value)
    return fromMutable(out)
  }

export const intersection =
  <A>(E: Eq<A>) =>
  (that: ReadonlySet<A>) =>
  (me: ReadonlySet<A>): ReadonlySet<A> => {
    const out = emptyMutable<A>()
    const [small, large] = me.size <= that.size ? [me, that] : [that, me]
    for (const value of small) if (hasEq(E)(large, value)) insertEq(E)(out, value)
    return fromMutable(out)
  }

export const difference =
  <A>(E: Eq<A>) =>
  (that: ReadonlySet<A>) =>
  (me: ReadonlySet<A>): ReadonlySet<A> => {
    const out = emptyMutable<A>()
    for (const value of me) if (!hasEq(E)(that, value)) insertEq(E)(out, value)
    return fromMutable(out)
  }

export const symmetricDifference =
  <A>(E: Eq<A>) =>
  (that: ReadonlySet<A>) =>
  (me: ReadonlySet<A>): ReadonlySet<A> => {
    const left = difference(E)(that)(me)
    const right = difference(E)(me)(that)
    return union(E)(right)(left)
  }

export const cartesianProduct =
  <A, B>(EA: Eq<A>, EB: Eq<B>) =>
  (bs: ReadonlySet<B>) =>
  (as: ReadonlySet<A>): ReadonlySet<readonly [A, B]> => {
    const out = emptyMutable<readonly [A, B]>()
    const pairEq = eqTuple(EA, EB)
    for (const a of as) {
      for (const b of bs) insertEq(pairEq)(out, [a, b] as const)
    }
    return fromMutable(out)
  }

export const filterSet =
  <A>(predicate: Predicate<A>) =>
  (set: ReadonlySet<A>): ReadonlySet<A> => filter(predicate)(set)

export const mapSet =
  <A, B>(E: Eq<B>) =>
  (set: ReadonlySet<A>, f: (a: A) => B): ReadonlySet<B> => map<A, B>(E)(f)(set)

export const partitionSet =
  <A>(predicate: Predicate<A>) =>
  (set: ReadonlySet<A>): readonly [ReadonlySet<A>, ReadonlySet<A>] => {
    const separated = partition(predicate)(set)
    return [separated.right, separated.left]
  }

export const partitionSetWith =
  <A, L, R>(ELeft: Eq<L>, ERight: Eq<R>) =>
  (set: ReadonlySet<A>, f: (a: A) => Result<L, R>): readonly [ReadonlySet<L>, ReadonlySet<R>] => {
    const separated = partitionMap(ELeft, ERight)(f)(set)
    return [separated.left, separated.right]
  }

export const filterMapSet =
  <A, B>(E: Eq<B>) =>
  (set: ReadonlySet<A>, f: (a: A) => Option<B>): ReadonlySet<B> => filterMap(E)(f)(set)

export const collectSet =
  <A, B>(E: Eq<B>) =>
  (set: ReadonlySet<A>, pf: PartialFn<A, B>): ReadonlySet<B> =>
    filterMap(E)((a: A) => (pf.isDefinedAt(a) ? Some(pf.apply(a)) : None))(set)

export const getUnionMonoid = <A>(E: Eq<A>): Monoid<ReadonlySet<A>> => ({
  concat: (x, y) => union(E)(y)(x),
  empty: empty<A>(),
})

export const getIntersectionSemigroup = <A>(E: Eq<A>): Semigroup<ReadonlySet<A>> => ({
  concat: (x, y) => intersection(E)(y)(x),
})

export const getDifferenceMagma = <A>(E: Eq<A>): Magma<ReadonlySet<A>> => ({
  concat: (x, y) => difference(E)(y)(x),
})

export const getSymmetricDifferenceMagma = <A>(E: Eq<A>): Magma<ReadonlySet<A>> => ({
  concat: (x, y) => symmetricDifference(E)(y)(x),
})

const traverseInternal =
  <G>(G: Applicative<G>) =>
  <A, B>(ord: Ord<A> | undefined, EQB: Eq<B>, f: (index: number, a: A) => FunctorValue<G, B>) =>
  (set: ReadonlySet<A>): FunctorValue<G, ReadonlySet<B>> => {
    const values = orderedValues(set, ord)
    return values.reduce<FunctorValue<G, ReadonlySet<B>>>(
      (gbs, value, index) => {
        const append = (bs: ReadonlySet<B>) => (b: B): ReadonlySet<B> => {
          const next = toMutable(bs)
          insertEq(EQB)(next, b)
          return fromMutable(next)
        }
        const liftedAppend = G.map(append)(gbs)
        return G.ap(liftedAppend)(f(index, value))
      },
      G.of(empty<B>()),
    )
  }

export const traverse =
  <G>(G: Applicative<G>) =>
  <A, B>(options: { readonly ord?: Ord<A>; readonly eq: Eq<B> }) =>
  (f: (a: A) => FunctorValue<G, B>) =>
  (set: ReadonlySet<A>): FunctorValue<G, ReadonlySet<B>> =>
    traverseInternal(G)<A, B>(options.ord, options.eq, (_i, a) => f(a))(set)

export const traverseWithIndex =
  <G>(G: Applicative<G>) =>
  <A, B>(options: { readonly ord?: Ord<A>; readonly eq: Eq<B> }) =>
  (f: (index: number, a: A) => FunctorValue<G, B>) =>
  (set: ReadonlySet<A>): FunctorValue<G, ReadonlySet<B>> =>
    traverseInternal(G)<A, B>(options.ord, options.eq, f)(set)

export const sequence =
  <G>(G: Applicative<G>) =>
  <A>(options: { readonly ord?: Ord<A>; readonly eq: Eq<A> }) =>
  (set: ReadonlySet<FunctorValue<G, A>>): FunctorValue<G, ReadonlySet<A>> =>
    traverse(G)<FunctorValue<G, A>, A>({ ord: options.ord, eq: options.eq })((ga) => ga)(set)

export const sequenceWithIndex =
  <G>(G: Applicative<G>) =>
  <A>(options: { readonly ord?: Ord<A>; readonly eq: Eq<A> }) =>
  (set: ReadonlySet<FunctorValue<G, A>>): FunctorValue<G, ReadonlySet<A>> =>
    traverseWithIndex(G)<FunctorValue<G, A>, A>({ ord: options.ord, eq: options.eq })((_, ga) => ga)(set)

export const wither =
  <G>(G: Applicative<G>) =>
  <A, B>(options: { readonly ord?: Ord<A>; readonly eq: Eq<B> }) =>
  (f: (a: A) => FunctorValue<G, Option<B>>) =>
  (set: ReadonlySet<A>): FunctorValue<G, ReadonlySet<B>> => {
    const eqOption: Eq<Option<B>> = (x, y) =>
      (isSome(x) && isSome(y) && options.eq(x.value, y.value)) || (!isSome(x) && !isSome(y))
    return G.map(compact(options.eq))(traverse(G)<A, Option<B>>({ ord: options.ord, eq: eqOption })(f)(set))
  }

export const wilt =
  <G>(G: Applicative<G>) =>
  <A, B, C>(options: { readonly ord?: Ord<A>; readonly left: Eq<B>; readonly right: Eq<C> }) =>
  (f: (a: A) => FunctorValue<G, Result<B, C>>) =>
  (set: ReadonlySet<A>): FunctorValue<G, ReadonlySetSeparated<B, C>> => {
    const eqResult: Eq<Result<B, C>> = (x, y) => {
      if (isErr(x) && isErr(y)) return options.left(x.error, y.error)
      if (!isErr(x) && !isErr(y)) return options.right(x.value, y.value)
      return false
    }
    return G.map(separate(options.left, options.right))(
      traverse(G)<A, Result<B, C>>({ ord: options.ord, eq: eqResult })(f)(set),
    )
  }

export interface ReadonlySetFunctorInstance {
  readonly map: typeof map
}

export interface ReadonlySetCompactableInstance {
  readonly compact: typeof compact
  readonly separate: typeof separate
}

export interface ReadonlySetFilterableInstance extends ReadonlySetFunctorInstance, ReadonlySetCompactableInstance {
  readonly filter: typeof filter
  readonly filterRefinement: typeof filter
  readonly filterMap: typeof filterMap
  readonly partition: typeof partition
  readonly partitionRefinement: typeof partitionRefinement
  readonly partitionMap: typeof partitionMap
}

export interface ReadonlySetWitherableInstance extends ReadonlySetFilterableInstance {
  readonly wither: typeof wither
  readonly wilt: typeof wilt
}

export interface ReadonlySetTraversableWithIndexInstance extends ReadonlySetWitherableInstance {
  readonly traverse: typeof traverse
  readonly traverseWithIndex: typeof traverseWithIndex
  readonly sequence: typeof sequence
  readonly sequenceWithIndex: typeof sequenceWithIndex
}

export const ReadonlySetFunctor: ReadonlySetFunctorInstance = {
  map,
}

export const ReadonlySetCompactable: ReadonlySetCompactableInstance = {
  compact,
  separate,
}

export const ReadonlySetFilterable: ReadonlySetFilterableInstance = {
  map,
  compact,
  separate,
  filter,
  filterRefinement: filter,
  filterMap,
  partition,
  partitionRefinement,
  partitionMap,
}

export const ReadonlySetWitherable: ReadonlySetWitherableInstance = {
  map,
  compact,
  separate,
  filter,
  filterRefinement: filter,
  filterMap,
  partition,
  partitionRefinement,
  partitionMap,
  wither,
  wilt,
}

export const ReadonlySetTraversableWithIndex: ReadonlySetTraversableWithIndexInstance = {
  map,
  compact,
  separate,
  filter,
  filterRefinement: filter,
  filterMap,
  partition,
  partitionRefinement,
  partitionMap,
  wither,
  wilt,
  traverse,
  traverseWithIndex,
  sequence,
  sequenceWithIndex,
}
