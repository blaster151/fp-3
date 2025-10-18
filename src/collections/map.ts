import type { Eq, Ord } from "../../core"
import { None, Some, isSome } from "../../option"
import type { Option } from "../../option"
import type { Result } from "../../result"
import { isErr } from "../../result"
import type { PartialFn } from "../../stdlib/partial-fn"
import type { Monoid, Semigroup } from "../../stdlib/monoid"
import { eqMapBy, eqMapNative } from "../../stdlib/eq"
import type { Foldable, FunctorValue } from "../../typeclasses"
import type { ApplicativeLike, HKT } from "../../list"

export type ConflictResolver<K, A> = (existing: A, incoming: A, key: K) => A

const defaultResolver = <K, A>(): ConflictResolver<K, A> => (_existing, incoming) => incoming

const clone = <K, A>(m: ReadonlyMap<K, A>): Map<K, A> => new Map<K, A>(m as Map<K, A>)

const findKey = <K>(E: Eq<K>) => (m: ReadonlyMap<K, unknown>, k: K): K | undefined => {
  for (const key of m.keys()) if (E(key, k)) return key
  return undefined
}

const upsertInternal = <K, A>(
  map: ReadonlyMap<K, A>,
  key: K,
  value: A,
  resolver: ConflictResolver<K, A>,
  existingKey?: K,
): ReadonlyMap<K, A> => {
  const next = clone(map)
  const slot = existingKey ?? key
  const previous = next.get(slot)
  if (previous === undefined && !next.has(slot)) {
    next.set(key, value)
    return next as ReadonlyMap<K, A>
  }
  next.set(slot, resolver(previous as A, value, slot))
  return next as ReadonlyMap<K, A>
}

const deleteInternal = <K, A>(map: ReadonlyMap<K, A>, key: K): ReadonlyMap<K, A> => {
  if (!map.has(key)) return map
  const next = clone(map)
  next.delete(key)
  return next as ReadonlyMap<K, A>
}

export const fromEntriesMap = <K, A>(entries: Iterable<readonly [K, A]>): ReadonlyMap<K, A> =>
  new Map<K, A>(entries) as ReadonlyMap<K, A>

export const entriesMap = <K, A>(m: ReadonlyMap<K, A>): ReadonlyArray<readonly [K, A]> => {
  const out: Array<readonly [K, A]> = []
  for (const entry of m) out.push(entry)
  return out
}

export const mapMapValues = <K, A, B>(m: ReadonlyMap<K, A>, f: (value: A, key: K) => B): ReadonlyMap<K, B> => {
  const out = new Map<K, B>()
  for (const [k, a] of m) out.set(k, f(a, k))
  return out as ReadonlyMap<K, B>
}

export const mapMapKeys = <K, A, NK>(
  m: ReadonlyMap<K, A>,
  f: (key: K, value: A) => NK,
  onConflict: ConflictResolver<NK, A> = defaultResolver(),
): ReadonlyMap<NK, A> => {
  const out = new Map<NK, A>()
  for (const [k, v] of m) {
    const nk = f(k, v)
    if (out.has(nk)) out.set(nk, onConflict(out.get(nk) as A, v, nk))
    else out.set(nk, v)
  }
  return out as ReadonlyMap<NK, A>
}

export const filterMapMapValues = <K, A, B>(
  m: ReadonlyMap<K, A>,
  f: (value: A, key: K) => Option<B>,
): ReadonlyMap<K, B> => {
  const out = new Map<K, B>()
  for (const [k, a] of m) {
    const ob = f(a, k)
    if (isSome(ob)) out.set(k, ob.value)
  }
  return out as ReadonlyMap<K, B>
}

export const collectMapValues = <K, A, B>(
  m: ReadonlyMap<K, A>,
  pf: PartialFn<A, B>,
): ReadonlyMap<K, B> => filterMapMapValues(m, (a) => (pf.isDefinedAt(a) ? Some(pf.apply(a)) : None))

export const filterMapMapEntries = <K, A, NK, B>(
  m: ReadonlyMap<K, A>,
  f: (key: K, value: A) => Option<readonly [NK, B]>,
): ReadonlyMap<NK, B> => {
  const out = new Map<NK, B>()
  for (const [k, a] of m) {
    const op = f(k, a)
    if (isSome(op)) {
      const [nk, b] = op.value
      out.set(nk, b)
    }
  }
  return out as ReadonlyMap<NK, B>
}

export const collectMapEntries = <K, A, NK, B>(
  m: ReadonlyMap<K, A>,
  pf: PartialFn<readonly [K, A], readonly [NK, B]>,
): ReadonlyMap<NK, B> =>
  filterMapMapEntries(m, (k, a) => (pf.isDefinedAt([k, a] as const) ? Some(pf.apply([k, a] as const)) : None))

export const groupBy = <A, K>(items: ReadonlyArray<A>, keyOf: (a: A) => K): ReadonlyMap<K, ReadonlyArray<A>> => {
  const buckets = new Map<K, Array<A>>()
  for (const item of items) {
    const key = keyOf(item)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }
  const out = new Map<K, ReadonlyArray<A>>()
  for (const [k, arr] of buckets) out.set(k, arr.slice())
  return out as ReadonlyMap<K, ReadonlyArray<A>>
}

export const partitionMapBy = <K, A, B extends A>(
  m: ReadonlyMap<K, A>,
  pred: (value: A, key: K) => value is B,
): readonly [ReadonlyMap<K, B>, ReadonlyMap<K, Exclude<A, B>>] => {
  const yes = new Map<K, B>()
  const no = new Map<K, Exclude<A, B>>()
  for (const [k, v] of m) {
    if (pred(v, k)) yes.set(k, v)
    else no.set(k, v as Exclude<A, B>)
  }
  return [yes as ReadonlyMap<K, B>, no as ReadonlyMap<K, Exclude<A, B>>]
}

export const partitionMapWith = <K, A, L, R>(
  m: ReadonlyMap<K, A>,
  f: (value: A, key: K) => Result<L, R>,
): readonly [ReadonlyMap<K, L>, ReadonlyMap<K, R>] => {
  const left = new Map<K, L>()
  const right = new Map<K, R>()
  for (const [k, v] of m) {
    const result = f(v, k)
    if (isErr(result)) left.set(k, result.error)
    else right.set(k, result.value)
  }
  return [left as ReadonlyMap<K, L>, right as ReadonlyMap<K, R>]
}

export const getEqNative = <K, A>(eqA: Eq<A>) => eqMapNative<K, A>(eqA)

export const getEq = <K, A>(eqK: Eq<K>, eqA: Eq<A>) => eqMapBy(eqK, eqA)

export const fromFoldable =
  <F>(F: Foldable<F>) =>
  <K>(E: Eq<K>) =>
  <A>(
    onConflict: ConflictResolver<K, A> = defaultResolver(),
  ) =>
  (fka: FunctorValue<F, readonly [K, A]>): ReadonlyMap<K, A> => {
    const initial = new Map<K, A>()
    const reduceFn = F.reduce<readonly [K, A], Map<K, A>>(initial, (acc, [k, a]) => {
      const existingKey = findKey(E)(acc, k)
      if (existingKey !== undefined) {
        acc.set(existingKey, onConflict(acc.get(existingKey) as A, a, existingKey))
      } else {
        acc.set(k, a)
      }
      return acc
    })
    return reduceFn(fka) as ReadonlyMap<K, A>
  }

export const fromFoldableMap =
  <F>(F: Foldable<F>) =>
  <K>(E: Eq<K>) =>
  <A, B>(
    project: (a: A) => readonly [K, B],
    onConflict: ConflictResolver<K, B> = defaultResolver(),
  ) =>
  (fa: FunctorValue<F, A>): ReadonlyMap<K, B> => {
    const initial = new Map<K, B>()
    const reduceFn = F.reduce<A, Map<K, B>>(initial, (acc, a) => {
      const [k, b] = project(a)
      const existingKey = findKey(E)(acc, k)
      if (existingKey !== undefined) {
        acc.set(existingKey, onConflict(acc.get(existingKey) as B, b, existingKey))
      } else {
        acc.set(k, b)
      }
      return acc
    })
    return reduceFn(fa) as ReadonlyMap<K, B>
  }

export const upsertAt =
  <K>(E: Eq<K>) =>
  <A>(key: K, value: A, map: ReadonlyMap<K, A>, onConflict: ConflictResolver<K, A> = defaultResolver()): ReadonlyMap<K, A> => {
    const existingKey = findKey(E)(map, key)
    return upsertInternal(map, key, value, onConflict, existingKey)
  }

export const modifyAt =
  <K>(E: Eq<K>) =>
  <A>(key: K, f: (value: A) => A, map: ReadonlyMap<K, A>): Option<ReadonlyMap<K, A>> => {
    const existingKey = findKey(E)(map, key)
    if (existingKey === undefined) return None
    const current = map.get(existingKey) as A
    return Some(upsertInternal(map, key, f(current), (_prev, next) => next, existingKey))
  }

export const updateAt =
  <K>(E: Eq<K>) =>
  <A>(key: K, value: A, map: ReadonlyMap<K, A>): Option<ReadonlyMap<K, A>> => {
    const existingKey = findKey(E)(map, key)
    if (existingKey === undefined) return None
    return Some(upsertInternal(map, key, value, (_prev, next) => next, existingKey))
  }

export const deleteAt =
  <K>(E: Eq<K>) =>
  <A>(key: K, map: ReadonlyMap<K, A>): ReadonlyMap<K, A> => {
    const existingKey = findKey(E)(map, key)
    if (existingKey === undefined) return map
    return deleteInternal(map, existingKey)
  }

export const lookup =
  <K>(E: Eq<K>) =>
  <A>(key: K, map: ReadonlyMap<K, A>): Option<A> => {
    const existingKey = findKey(E)(map, key)
    if (existingKey === undefined) return None
    const value = map.get(existingKey)
    return value === undefined && !map.has(existingKey) ? None : Some(value as A)
  }

export const lookupWithKey =
  <K>(E: Eq<K>) =>
  <A>(key: K, map: ReadonlyMap<K, A>): Option<readonly [K, A]> => {
    const existingKey = findKey(E)(map, key)
    if (existingKey === undefined) return None
    const value = map.get(existingKey)
    return value === undefined && !map.has(existingKey) ? None : Some([existingKey, value as A] as const)
  }

export const member =
  <K>(E: Eq<K>) =>
  (key: K, map: ReadonlyMap<K, unknown>): boolean => findKey(E)(map, key) !== undefined

export const isSubmap =
  <K>(E: Eq<K>) =>
  <A>(eqA: Eq<A>) =>
  (first: ReadonlyMap<K, A>, second: ReadonlyMap<K, A>): boolean => {
    for (const [k, a] of first) {
      const existingKey = findKey(E)(second, k)
      if (existingKey === undefined) return false
      const value = second.get(existingKey)
      if (value === undefined && !second.has(existingKey)) return false
      if (!eqA(a, value as A)) return false
    }
    return true
  }

const sortKeys = <K>(O: Ord<K>) => (keys: ReadonlyArray<K>): ReadonlyArray<K> => [...keys].sort(O)

export const keys =
  <K>(O: Ord<K>) =>
  <A>(map: ReadonlyMap<K, A>): ReadonlyArray<K> => sortKeys(O)(Array.from(map.keys()))

export const values =
  <K>(O: Ord<K>) =>
  <A>(map: ReadonlyMap<K, A>): ReadonlyArray<A> => {
    const sortedKeys = keys(O)<A>(map)
    return sortedKeys.map((k) => map.get(k) as A)
  }

export const collect =
  <K>(O: Ord<K>) =>
  <A, B>(map: ReadonlyMap<K, A>, f: (key: K, value: A) => B): ReadonlyArray<B> => {
    const sortedKeys = keys(O)<A>(map)
    return sortedKeys.map((k) => f(k, map.get(k) as A))
  }

export interface Unfoldable<F> {
  readonly unfoldr: <B, A>(b: B, f: (b: B) => Option<readonly [A, B]>) => HKT<F, A>
}

export const toUnfoldable =
  <F>(U: Unfoldable<F>) =>
  <K>(O: Ord<K>) =>
  <A>(map: ReadonlyMap<K, A>): HKT<F, readonly [K, A]> => {
    const pairs = collect(O)(map, (k, a) => [k, a] as const)
    return U.unfoldr<number, readonly [K, A]>(0, (index) =>
      index < pairs.length ? Some([pairs[index]!, index + 1] as const) : None,
    )
  }

export const mapWithIndex =
  <K, A, B>(f: (key: K, value: A) => B) =>
  (map: ReadonlyMap<K, A>): ReadonlyMap<K, B> => {
    const out = new Map<K, B>()
    for (const [k, a] of map) out.set(k, f(k, a))
    return out as ReadonlyMap<K, B>
  }

export const map =
  <A, B>(f: (value: A) => B) =>
  <K>(map: ReadonlyMap<K, A>): ReadonlyMap<K, B> => mapMapValues(map, (value) => f(value))

export const reduce =
  <K>(O: Ord<K>) =>
  <A, B>(initial: B, f: (acc: B, value: A, key: K) => B) =>
  (map: ReadonlyMap<K, A>): B => {
    let acc = initial
    for (const k of keys(O)<A>(map)) acc = f(acc, map.get(k) as A, k)
    return acc
  }

export const reduceRight =
  <K>(O: Ord<K>) =>
  <A, B>(initial: B, f: (value: A, acc: B, key: K) => B) =>
  (map: ReadonlyMap<K, A>): B => {
    let acc = initial
    const sortedKeys = keys(O)<A>(map)
    for (let i = sortedKeys.length - 1; i >= 0; i -= 1) {
      const key = sortedKeys[i]!
      acc = f(map.get(key) as A, acc, key)
    }
    return acc
  }

export const foldMap =
  <K>(O: Ord<K>) =>
  <M>(M: Monoid<M>) =>
  <A>(map: ReadonlyMap<K, A>, f: (value: A, key: K) => M): M => {
    let acc = M.empty
    for (const key of keys(O)<A>(map)) acc = M.concat(acc, f(map.get(key) as A, key))
    return acc
  }

export const foldMapWithIndex =
  <K>(O: Ord<K>) =>
  <M>(M: Monoid<M>) =>
  <A>(map: ReadonlyMap<K, A>, f: (key: K, value: A) => M): M => foldMap(O)(M)(map, (value, key) => f(key, value))

export const traverseWithIndex =
  <F>(App: ApplicativeLike<F>) =>
  <K>(O: Ord<K>) =>
  <A, B>(f: (key: K, value: A) => HKT<F, B>) =>
  (map: ReadonlyMap<K, A>): HKT<F, ReadonlyMap<K, B>> => {
    const sortedKeys = keys(O)<A>(map)
    let acc = App.of<ReadonlyMap<K, B>>(new Map<K, B>() as ReadonlyMap<K, B>)
    for (let i = sortedKeys.length - 1; i >= 0; i -= 1) {
      const key = sortedKeys[i]!
      const lifted = App.map((b: B) => (rest: ReadonlyMap<K, B>) => {
        const next = clone(rest)
        next.set(key, b)
        return next as ReadonlyMap<K, B>
      })(f(key, map.get(key) as A))
      acc = App.ap(lifted)(acc)
    }
    return acc
  }

export const sequence =
  <F>(App: ApplicativeLike<F>) =>
  <K>(O: Ord<K>) =>
  <A>(map: ReadonlyMap<K, HKT<F, A>>): HKT<F, ReadonlyMap<K, A>> => traverseWithIndex(App)(O)((_, fa) => fa)(map)

export const compact = <K, A>(map: ReadonlyMap<K, Option<A>>): ReadonlyMap<K, A> => {
  const out = new Map<K, A>()
  for (const [k, oa] of map) if (isSome(oa)) out.set(k, oa.value)
  return out as ReadonlyMap<K, A>
}

export const filter =
  <K, A>(predicate: (key: K, value: A) => boolean) =>
  (map: ReadonlyMap<K, A>): ReadonlyMap<K, A> => {
    const out = new Map<K, A>()
    for (const [k, a] of map) if (predicate(k, a)) out.set(k, a)
    return out as ReadonlyMap<K, A>
  }

export const filterMap =
  <K, A, B>(f: (key: K, value: A) => Option<B>) =>
  (map: ReadonlyMap<K, A>): ReadonlyMap<K, B> => {
    const out = new Map<K, B>()
    for (const [k, a] of map) {
      const ob = f(k, a)
      if (isSome(ob)) out.set(k, ob.value)
    }
    return out as ReadonlyMap<K, B>
  }

export const partition =
  <K, A>(predicate: (key: K, value: A) => boolean) =>
  (map: ReadonlyMap<K, A>): readonly [ReadonlyMap<K, A>, ReadonlyMap<K, A>] => {
    const left = new Map<K, A>()
    const right = new Map<K, A>()
    for (const [k, a] of map) (predicate(k, a) ? right : left).set(k, a)
    return [left as ReadonlyMap<K, A>, right as ReadonlyMap<K, A>]
  }

export const partitionMap =
  <K, A, L, R>(f: (key: K, value: A) => Result<L, R>) =>
  (map: ReadonlyMap<K, A>): readonly [ReadonlyMap<K, L>, ReadonlyMap<K, R>] => {
    const left = new Map<K, L>()
    const right = new Map<K, R>()
    for (const [k, a] of map) {
      const r = f(k, a)
      if (isErr(r)) left.set(k, r.error)
      else right.set(k, r.value)
    }
    return [left as ReadonlyMap<K, L>, right as ReadonlyMap<K, R>]
  }

export const separate = <K, L, R>(map: ReadonlyMap<K, Result<L, R>>): readonly [ReadonlyMap<K, L>, ReadonlyMap<K, R>] => {
  const left = new Map<K, L>()
  const right = new Map<K, R>()
  for (const [k, r] of map) {
    if (isErr(r)) left.set(k, r.error)
    else right.set(k, r.value)
  }
  return [left as ReadonlyMap<K, L>, right as ReadonlyMap<K, R>]
}

export const difference =
  <K>(E: Eq<K>) =>
  <A>(first: ReadonlyMap<K, A>, second: ReadonlyMap<K, A>): ReadonlyMap<K, A> => {
    const out = new Map<K, A>()
    for (const [k, a] of first) if (!member(E)(k, second)) out.set(k, a)
    return out as ReadonlyMap<K, A>
  }

export const differenceKeys =
  <K>(E: Eq<K>) =>
  <A>(first: ReadonlyMap<K, A>, keysToRemove: Iterable<K>): ReadonlyMap<K, A> => {
    const removals = Array.from(keysToRemove)
    const out = new Map<K, A>()
    for (const [k, a] of first) if (!removals.some((rk) => E(rk, k))) out.set(k, a)
    return out as ReadonlyMap<K, A>
  }

export const intersection =
  <K>(E: Eq<K>) =>
  <A>(
    first: ReadonlyMap<K, A>,
    second: ReadonlyMap<K, A>,
    onConflict: ConflictResolver<K, A> = (_existing, value) => value,
  ): ReadonlyMap<K, A> => {
    const out = new Map<K, A>()
    for (const [k, a] of first) {
      const existingKey = findKey(E)(second, k)
      if (existingKey !== undefined) {
        const value = second.get(existingKey)
        if (value !== undefined || second.has(existingKey)) {
          out.set(existingKey, onConflict(a, value as A, existingKey))
        }
      }
    }
    return out as ReadonlyMap<K, A>
  }

export const union =
  <K>(E: Eq<K>) =>
  <A>(
    first: ReadonlyMap<K, A>,
    second: ReadonlyMap<K, A>,
    onConflict: ConflictResolver<K, A> = defaultResolver(),
  ): ReadonlyMap<K, A> => {
    let out = first
    for (const [k, a] of second) {
      const existingKey = findKey(E)(out, k)
      if (existingKey === undefined) {
        const next = clone(out)
        next.set(k, a)
        out = next as ReadonlyMap<K, A>
      } else {
        out = upsertInternal(out, existingKey, a, onConflict, existingKey)
      }
    }
    return out
  }

export const getMonoid =
  <K>(E: Eq<K>) =>
  <A>(M: Monoid<A>): Monoid<ReadonlyMap<K, A>> => ({
    empty: new Map<K, A>() as ReadonlyMap<K, A>,
    concat: (x, y) => union(E)<A>(x, y, (xa, ya, key) => M.concat(xa, ya)),
  })

export const getUnionSemigroup =
  <K>(E: Eq<K>) =>
  <A>(S: Semigroup<A>): Semigroup<ReadonlyMap<K, A>> => ({
    concat: (x, y) => union(E)<A>(x, y, (xa, ya, key) => S.concat(xa, ya)),
  })

export const getUnionMonoid =
  <K>(E: Eq<K>) =>
  <A>(M: Monoid<A>): Monoid<ReadonlyMap<K, A>> => ({
    empty: new Map<K, A>() as ReadonlyMap<K, A>,
    concat: (x, y) => union(E)<A>(x, y, (xa, ya, key) => M.concat(xa, ya)),
  })

export const getIntersectionSemigroup =
  <K>(E: Eq<K>) =>
  <A>(S: Semigroup<A>): Semigroup<ReadonlyMap<K, A>> => ({
    concat: (x, y) => intersection(E)<A>(x, y, (xa, ya, key) => S.concat(xa, ya)),
  })

export interface ReadonlyMapFunctorInstance {
  readonly map: typeof map
  readonly mapWithIndex: typeof mapWithIndex
}

export interface ReadonlyMapFoldableInstance {
  readonly reduce: typeof reduce
  readonly reduceRight: typeof reduceRight
  readonly foldMap: typeof foldMap
  readonly foldMapWithIndex: typeof foldMapWithIndex
}

export interface ReadonlyMapTraversableWithIndexInstance extends ReadonlyMapFunctorInstance, ReadonlyMapFoldableInstance {
  readonly traverseWithIndex: typeof traverseWithIndex
  readonly sequence: typeof sequence
}

export interface ReadonlyMapCompactableInstance {
  readonly compact: typeof compact
  readonly separate: typeof separate
}

export interface ReadonlyMapFilterableInstance extends ReadonlyMapCompactableInstance {
  readonly filter: typeof filter
  readonly filterMap: typeof filterMap
  readonly partition: typeof partition
  readonly partitionMap: typeof partitionMap
}

export interface ReadonlyMapWitherableInstance
  extends ReadonlyMapTraversableWithIndexInstance,
    ReadonlyMapFilterableInstance {
  readonly wither: typeof wither
}

export const ReadonlyMapFunctor: ReadonlyMapFunctorInstance = {
  map,
  mapWithIndex,
}

export const ReadonlyMapFoldable: ReadonlyMapFoldableInstance = {
  reduce,
  reduceRight,
  foldMap,
  foldMapWithIndex,
}

export const ReadonlyMapTraversableWithIndex: ReadonlyMapTraversableWithIndexInstance = {
  ...ReadonlyMapFunctor,
  ...ReadonlyMapFoldable,
  traverseWithIndex,
  sequence,
}

export const ReadonlyMapCompactable: ReadonlyMapCompactableInstance = {
  compact,
  separate,
}

export const ReadonlyMapFilterable: ReadonlyMapFilterableInstance = {
  ...ReadonlyMapCompactable,
  filter,
  filterMap,
  partition,
  partitionMap,
}

export const wither =
  <F>(App: ApplicativeLike<F>) =>
  <K>(O: Ord<K>) =>
  <A, B>(f: (key: K, value: A) => HKT<F, Option<B>>) =>
  (map: ReadonlyMap<K, A>): HKT<F, ReadonlyMap<K, B>> => {
    const sortedKeys = keys(O)<A>(map)
    let acc = App.of<ReadonlyMap<K, B>>(new Map<K, B>() as ReadonlyMap<K, B>)
    for (let i = sortedKeys.length - 1; i >= 0; i -= 1) {
      const key = sortedKeys[i]!
      const lifted = App.map((ob: Option<B>) => (rest: ReadonlyMap<K, B>) => {
        if (isSome(ob)) {
          const next = clone(rest)
          next.set(key, ob.value)
          return next as ReadonlyMap<K, B>
        }
        return rest
      })(f(key, map.get(key) as A))
      acc = App.ap(lifted)(acc)
    }
    return acc
  }

export const ReadonlyMapWitherable: ReadonlyMapWitherableInstance = {
  ...ReadonlyMapTraversableWithIndex,
  ...ReadonlyMapFilterable,
  wither,
}

