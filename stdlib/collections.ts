import type { Option } from "../option"
import { None, Some, isSome } from "../option"
import type { Result } from "../result"
import { isErr } from "../result"
import type { PartialFn } from "./partial-fn"
export {
  cartesianProduct,
  collectSet,
  compact as compactSet,
  difference as differenceSet,
  filter as filterSet,
  filterMap as filterMapSet,
  fromIterable as setFrom,
  getDifferenceMagma,
  getIntersectionSemigroup,
  getSymmetricDifferenceMagma,
  getUnionMonoid,
  intersection as intersectSet,
  isEmpty as isEmptySet,
  isSubsetOf,
  map as mapSet,
  partition as partitionSet,
  partitionMap as partitionSetWith,
  singleton as singletonSet,
  size as sizeSet,
  symmetricDifference as symmetricDifferenceSet,
  cartesianProduct as cartesianProductSet,
  toReadonlyArray as toArraySet,
  union as unionSet,
  wither as witherSet,
  wilt as wiltSet,
} from "./set"

export const fromEntriesMap = <K, V>(
  entries: Iterable<readonly [K, V]>
): ReadonlyMap<K, V> => new Map<K, V>(entries) as ReadonlyMap<K, V>

export const entriesMap = <K, V>(
  m: ReadonlyMap<K, V>
): ReadonlyArray<readonly [K, V]> => {
  const out: Array<readonly [K, V]> = []
  for (const [k, v] of m) out.push([k, v] as const)
  return out
}

export const keysMap = <K, V>(m: ReadonlyMap<K, V>): ReadonlyArray<K> =>
  Array.from(m.keys()) as ReadonlyArray<K>

export const valuesMap = <K, V>(m: ReadonlyMap<K, V>): ReadonlyArray<V> =>
  Array.from(m.values()) as ReadonlyArray<V>

export const mapMapValues = <K, V, B>(
  m: ReadonlyMap<K, V>,
  f: (v: V, k: K) => B
): ReadonlyMap<K, B> => {
  const out = new Map<K, B>()
  for (const [k, v] of m) out.set(k, f(v, k))
  return out as ReadonlyMap<K, B>
}

export const mapMapKeys = <K, V, NK>(
  m: ReadonlyMap<K, V>,
  f: (k: K, v: V) => NK,
  onConflict?: (existing: V, incoming: V, key: NK) => V
): ReadonlyMap<NK, V> => {
  const out = new Map<NK, V>()
  for (const [k, v] of m) {
    const nk = f(k, v)
    if (out.has(nk) && onConflict) {
      out.set(nk, onConflict(out.get(nk) as V, v, nk))
    } else {
      out.set(nk, v)
    }
  }
  return out as ReadonlyMap<NK, V>
}

export const filterMap = <K, V>(
  m: ReadonlyMap<K, V>,
  pred: (v: V, k: K) => boolean
): ReadonlyMap<K, V> => {
  const out = new Map<K, V>()
  for (const [k, v] of m) if (pred(v, k)) out.set(k, v)
  return out as ReadonlyMap<K, V>
}

export const unionMap = <K, V>(
  a: ReadonlyMap<K, V>,
  b: ReadonlyMap<K, V>,
  combine: (x: V, y: V, k: K) => V = (_x, y) => y
): ReadonlyMap<K, V> => {
  const out = new Map<K, V>(a as Map<K, V>)
  for (const [k, v] of b) {
    if (out.has(k)) out.set(k, combine(out.get(k) as V, v, k))
    else out.set(k, v)
  }
  return out as ReadonlyMap<K, V>
}

export const intersectMap = <K, V>(
  a: ReadonlyMap<K, V>,
  b: ReadonlyMap<K, V>,
  combine: (x: V, y: V, k: K) => V = (x) => x
): ReadonlyMap<K, V> => {
  const out = new Map<K, V>()
  for (const [k, vA] of a) {
    const vB = b.get(k)
    if (vB !== undefined || b.has(k)) out.set(k, combine(vA, vB as V, k))
  }
  return out as ReadonlyMap<K, V>
}

export const differenceMap = <K, V>(
  a: ReadonlyMap<K, V>,
  b: ReadonlyMap<K, V>
): ReadonlyMap<K, V> => {
  const out = new Map<K, V>()
  for (const [k, v] of a) if (!b.has(k)) out.set(k, v)
  return out as ReadonlyMap<K, V>
}

export const groupBy = <A, K>(
  items: ReadonlyArray<A>,
  keyOf: (a: A) => K
): ReadonlyMap<K, ReadonlyArray<A>> => {
  const out = new Map<K, A[]>()
  for (const a of items) {
    const k = keyOf(a)
    const arr = out.get(k)
    if (arr) arr.push(a)
    else out.set(k, [a])
  }
  return mapMapValues(out, (xs) => xs.slice() as ReadonlyArray<A>)
}

export const partitionMapBy = <K, V, B extends V>(
  m: ReadonlyMap<K, V>,
  pred: (v: V, k: K) => v is B
): readonly [ReadonlyMap<K, B>, ReadonlyMap<K, Exclude<V, B>>] => {
  const yes = new Map<K, B>()
  const no = new Map<K, Exclude<V, B>>()
  for (const [k, v] of m) {
    if (pred(v, k)) yes.set(k, v as B)
    else no.set(k, v as Exclude<V, B>)
  }
  return [yes as ReadonlyMap<K, B>, no as ReadonlyMap<K, Exclude<V, B>>]
}

export const partitionMapWith = <K, V, L, R>(
  m: ReadonlyMap<K, V>,
  f: (v: V, k: K) => Result<L, R>
): readonly [ReadonlyMap<K, L>, ReadonlyMap<K, R>] => {
  const left = new Map<K, L>()
  const right = new Map<K, R>()
  for (const [k, v] of m) {
    const res = f(v, k)
    if (isErr(res)) left.set(k, res.error)
    else right.set(k, res.value)
  }
  return [left as ReadonlyMap<K, L>, right as ReadonlyMap<K, R>]
}


export const filterMapArray =
  <A, B>(as: ReadonlyArray<A>, f: (a: A, i: number) => Option<B>): ReadonlyArray<B> => {
    const out: B[] = []
    for (let i = 0; i < as.length; i++) {
      const ob = f(as[i]!, i)
      if (isSome(ob)) out.push(ob.value)
    }
    return out
  }

export const filterMapArraySimple =
  <A, B>(as: ReadonlyArray<A>, f: (a: A) => Option<B>): ReadonlyArray<B> => {
    const out: B[] = []
    for (let i = 0; i < as.length; i++) {
      const ob = f(as[i]!)
      if (isSome(ob)) out.push(ob.value)
    }
    return out
  }

export const collectArray =
  <A, B>(as: ReadonlyArray<A>, pf: PartialFn<A, B>): ReadonlyArray<B> =>
    filterMapArray(as, (a) => (pf.isDefinedAt(a) ? Some(pf.apply(a)) : None))

export const filterMapMapValues =
  <K, A, B>(m: ReadonlyMap<K, A>, f: (a: A, k: K) => Option<B>): ReadonlyMap<K, B> => {
    const out = new Map<K, B>()
    for (const [k, a] of m) {
      const ob = f(a, k)
      if (isSome(ob)) out.set(k, ob.value)
    }
    return out
  }

export const collectMapValues =
  <K, A, B>(m: ReadonlyMap<K, A>, pf: PartialFn<A, B>): ReadonlyMap<K, B> =>
    filterMapMapValues(m, (a) => (pf.isDefinedAt(a) ? Some(pf.apply(a)) : None))

export const filterMapMapEntries =
  <K, A, L, B>(m: ReadonlyMap<K, A>, f: (k: K, a: A) => Option<readonly [L, B]>): ReadonlyMap<L, B> => {
    const out = new Map<L, B>()
    for (const [k, a] of m) {
      const op = f(k, a)
      if (isSome(op)) {
        const [l, b] = op.value
        out.set(l, b)
      }
    }
    return out
  }

export const collectMapEntries =
  <K, A, L, B>(m: ReadonlyMap<K, A>, pf: PartialFn<readonly [K, A], readonly [L, B]>): ReadonlyMap<L, B> =>
    filterMapMapEntries(m, (k, a) => (pf.isDefinedAt([k, a] as const) ? Some(pf.apply([k, a] as const)) : None))

