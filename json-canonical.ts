import { None, Some } from "./option"
import type { Option } from "./option"
import {
  cataJson,
  jArr,
  jBinary,
  jBool,
  jDate,
  jDec,
  jNull,
  jNum,
  jObj,
  jRegex,
  jSet,
  jStr,
  jUndef,
} from "./array-recursion"
import type { Json, JsonF } from "./array-recursion"

// ====================================================================
// Canonicalization fold for Json
// ====================================================================

// Policy threading for canonicalization
export type CanonicalPolicy = Readonly<{
  sortObjects?: boolean            // default: true
  dedupSets?: boolean              // default: true
  sortSets?: boolean               // default: true
  normalizeRegexFlags?: boolean    // default: true
}>

const defaultPolicy: Required<CanonicalPolicy> = {
  sortObjects: true,
  dedupSets: true,
  sortSets: true,
  normalizeRegexFlags: true,
}

/** Stable, deterministic canonicalization for Json:
 *  - JObj: sort keys lexicographically
 *  - JSet: deduplicate (by structural key) and sort
 *  - JRegex: normalize flags by sorting/uniquing
 *  Leaves (Null/Undefined/Bool/Num/Dec/Str/Binary) unchanged.
 */

// Policy-aware canonicalization
export const canonicalizeJsonP =
  (policy: CanonicalPolicy = {}): ((j: Json) => Json) => {
    const P = { ...defaultPolicy, ...policy }
    const normFlags = (f: string | undefined) => {
      if (!P.normalizeRegexFlags || !f) return f
      const flags = Array.from(new Set(f.split('')))
      flags.sort()
      const normalized = flags.join('')
      return normalized === '' ? undefined : normalized
    }

    return cataJson<Json>((f) => {
      switch (f._tag) {
        case 'JNull':      return jNull()
        case 'JUndefined': return jUndef()
        case 'JBool':      return jBool(f.value)
        case 'JNum':       return jNum(f.value)
        case 'JDec':       return jDec(f.decimal)
        case 'JStr':       return jStr(f.value)
        case 'JBinary':    return jBinary(f.base64)
        case 'JRegex':     return jRegex(f.pattern, normFlags(f.flags))
        case 'JDate':      return jDate(f.iso)

        case 'JArr': {
          // arrays keep order; children are already canonical
          return jArr(f.items)
        }

        case 'JSet': {
          let xs = f.items
          if (P.dedupSets) {
            const m = new Map(xs.map(x => [canonicalKey(x), x]))
            xs = [...m.values()]
          }
          if (P.sortSets) {
            xs = [...xs].sort(compareCanonical)
          }
          return jSet(xs)
        }

        case 'JObj': {
          const es = P.sortObjects
            ? [...f.entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            : f.entries
          return jObj(es)
        }
      }
    })
  }

// Keep existing default function delegating to policyful version
export const canonicalizeJson = (j: Json): Json => canonicalizeJsonP()(j)

// ====================================================================
// EJSON-like encoder/decoder pair
// ====================================================================

// ------------------------
// EJSON-like encoder
// ------------------------
export const toEJson = (j: Json): unknown => {
  const go = cataJson<unknown>((f) => {
    switch (f._tag) {
      case 'JNull':      return null
      case 'JUndefined': return { $undefined: true }
      case 'JBool':      return f.value
      case 'JNum':       return f.value
      case 'JDec':       return { $decimal: f.decimal }
      case 'JStr':       return f.value
      case 'JBinary':    return { $binary: f.base64 }
      case 'JRegex':     return f.flags ? { $regex: f.pattern, $flags: f.flags } : { $regex: f.pattern }
      case 'JDate':      return { $date: f.iso }
      case 'JArr':       return f.items
      case 'JSet':       return { $set: f.items }
      case 'JObj':       return Object.fromEntries(f.entries)
    }
  })
  return go(j)
}

// canonical encoder (stable object key order & set order)
export const toEJsonCanonical = (j: Json): unknown =>
  toEJson(canonicalizeJson(j))

// encoder that accepts an optional policy
export const toEJsonCanonicalWithPolicy = (j: Json, policy?: CanonicalPolicy): unknown =>
  toEJson(canonicalizeJsonP(policy)(j))



// ====================================================================
// Canonical utilities: equality, hash, hash-consing
// ====================================================================

// Stable canonical key = JSON of the canonical EJSON encoding
export const canonicalKey = (j: Json): string =>
  JSON.stringify(toEJsonCanonical(j))

// Canonical equality & ordering (lexicographic on canonical key)
export const equalsCanonical = (a: Json, b: Json): boolean =>
  canonicalKey(a) === canonicalKey(b)

export const compareCanonical = (a: Json, b: Json): number => {
  const ka = canonicalKey(a), kb = canonicalKey(b)
  return ka < kb ? -1 : ka > kb ? 1 : 0
}

// FNV-1a 32-bit hash (deterministic across platforms)
const _fnv1a32 = (s: string): number => {
  let h = 0x811c9dc5 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    // h *= 16777619 mod 2^32
    h = (h + ((h << 1) >>> 0) + ((h << 4) >>> 0) + ((h << 7) >>> 0) + ((h << 8) >>> 0) + ((h << 24) >>> 0)) >>> 0
  }
  return h >>> 0
}

const _hex8 = (n: number): string =>
  (n >>> 0).toString(16).padStart(8, '0')

// Public hash helpers (string form is convenient as a Map key)
export const hashCanonicalNum = (j: Json): number =>
  _fnv1a32(canonicalKey(j))

export const hashCanonical = (j: Json): string =>
  _hex8(hashCanonicalNum(j))

// Rebuild a Json node from a JsonF whose children are already Json
const _rebuildFromF = (f: JsonF<Json>): Json => {
  switch (f._tag) {
    case 'JNull':      return jNull()
    case 'JUndefined': return jUndef()
    case 'JBool':      return jBool(f.value)
    case 'JNum':       return jNum(f.value)
    case 'JDec':       return jDec(f.decimal)
    case 'JStr':       return jStr(f.value)
    case 'JBinary':    return jBinary(f.base64)
    case 'JRegex':     return jRegex(f.pattern, f.flags)
    case 'JDate':      return jDate(f.iso)
    case 'JArr':       return jArr(f.items)
    case 'JSet':       return jSet(f.items)
    case 'JObj':       return jObj(f.entries)
  }
}

/** Hash-consing: share identical subtrees.
 *  - Canonicalize each rebuilt node
 *  - Use canonicalKey as the memo key
 *  - Return the pooled (shared) node
 */
export const hashConsJson = (j: Json, pool?: Map<string, Json>): Json => {
  const P = pool ?? new Map<string, Json>()
  const go = cataJson<Json>((f) => {
    // children are already deduped; rebuild this node
    const node  = _rebuildFromF(f)
    const canon = canonicalizeJson(node)
    const key   = canonicalKey(canon)
    const hit   = P.get(key)
    if (hit) return hit
    P.set(key, canon)
    return canon
  })
  return go(j)
}

// =========================================================
// Canonical containers for Json
//  - CanonicalJsonMap<V>: Map-like, keys are canonical Json
//  - CanonicalJsonSet:    Set-like, elements are canonical Json
// Notes:
//  * Keys/elements are stored canonicalized (and hash-consed).
//  * Equality is equalsCanonical; iteration is insertion order.
//  * Backing Map is keyed by canonicalKey(j).
// =========================================================

export class CanonicalJsonMap<V> implements Iterable<readonly [Json, V]> {
  private readonly buckets = new Map<string, { k: Json; v: V }>()
  private readonly pool = new Map<string, Json>() // share identical subtrees across inserts

  constructor(init?: Iterable<readonly [Json, V]>) {
    if (init) for (const [k, v] of init) this.set(k, v)
  }

  get size(): number { return this.buckets.size }
  clear(): void { this.buckets.clear() }

  has(key: Json): boolean {
    const c = canonicalizeJson(key)
    return this.buckets.has(canonicalKey(c))
  }

  get(key: Json): V | undefined {
    const c = canonicalizeJson(key)
    const e = this.buckets.get(canonicalKey(c))
    return e?.v
  }

  set(key: Json, value: V): this {
    // canonicalize + hash-cons so we physically share equal subtrees
    const c0 = canonicalizeJson(key)
    const c  = hashConsJson(c0, this.pool)
    this.buckets.set(canonicalKey(c), { k: c, v: value })
    return this
  }

  delete(key: Json): boolean {
    const c = canonicalizeJson(key)
    return this.buckets.delete(canonicalKey(c))
  }

  // Iteration (insertion order)
  *keys(): IterableIterator<Json> {
    for (const { k } of this.buckets.values()) yield k
  }
  *values(): IterableIterator<V> {
    for (const { v } of this.buckets.values()) yield v
  }
  *entries(): IterableIterator<readonly [Json, V]> {
    for (const { k, v } of this.buckets.values()) yield [k, v] as const
  }
  [Symbol.iterator](): IterableIterator<readonly [Json, V]> { return this.entries() }

  forEach(cb: (value: V, key: Json, map: this) => void, thisArg?: unknown): void {
    for (const { k, v } of this.buckets.values()) cb.call(thisArg, v, k, this)
  }

  // Convenience upsert
  upsert(key: Json, onMissing: () => V, onHit?: (v: V) => V): V {
    const c0 = canonicalizeJson(key)
    const c  = hashConsJson(c0, this.pool)
    const ck = canonicalKey(c)
    const hit = this.buckets.get(ck)
    if (hit) {
      if (onHit) hit.v = onHit(hit.v)
      return hit.v
    }
    const nv = onMissing()
    this.buckets.set(ck, { k: c, v: nv })
    return nv
  }

  static from<V>(iter: Iterable<readonly [Json, V]>): CanonicalJsonMap<V> {
    return new CanonicalJsonMap(iter)
  }
}

export class CanonicalJsonSet implements Iterable<Json> {
  private readonly m = new CanonicalJsonMap<true>()

  constructor(init?: Iterable<Json>) {
    if (init) for (const x of init) this.add(x)
  }

  get size(): number { return this.m.size }
  clear(): void { this.m.clear() }
  has(x: Json): boolean { return this.m.has(x) }
  add(x: Json): this { this.m.set(x, true); return this }
  delete(x: Json): boolean { return this.m.delete(x) }

  *keys(): IterableIterator<Json> { yield* this.m.keys() }
  *values(): IterableIterator<Json> { yield* this.m.keys() }
  *entries(): IterableIterator<readonly [Json, Json]> {
    for (const k of this.m.keys()) yield [k, k] as const
  }
  [Symbol.iterator](): IterableIterator<Json> { return this.values() }

  forEach(cb: (value: Json, value2: Json, set: this) => void, thisArg?: unknown): void {
    for (const k of this.m.keys()) cb.call(thisArg, k, k, this)
  }

  static from(iter: Iterable<Json>): CanonicalJsonSet {
    return new CanonicalJsonSet(iter)
  }
}

// =========================================================
// Canonical multimap (Json → many V)
// Backed by CanonicalJsonMap<ReadonlyArray<V>> with upsert.
// =========================================================
export class CanonicalJsonMultiMap<V> implements Iterable<readonly [Json, ReadonlyArray<V>]> {
  private readonly m = new CanonicalJsonMap<ReadonlyArray<V>>()

  constructor(init?: Iterable<readonly [Json, V]>) {
    if (init) for (const [k, v] of init) this.add(k, v)
  }

  get size(): number { return this.m.size }
  clear(): void { this.m.clear() }

  get(key: Json): ReadonlyArray<V> {
    return this.m.get(key) ?? []
  }

  add(key: Json, value: V): this {
    this.m.upsert(key, () => [value], (xs) => [...xs, value])
    return this
  }

  addAll(key: Json, values: ReadonlyArray<V>): this {
    if (values.length === 0) return this
    this.m.upsert(key, () => [...values], (xs) => [...xs, ...values])
    return this
  }

  setList(key: Json, values: ReadonlyArray<V>): this {
    this.m.set(key, [...values])
    return this
  }

  delete(key: Json): boolean {
    return this.m.delete(key)
  }
  
  has(key: Json): boolean {
    return this.m.has(key)
  }

  keys(): IterableIterator<Json> { return this.m.keys() }
  
  values(): IterableIterator<ReadonlyArray<V>> { return this.m.values() }
  
  entries(): IterableIterator<readonly [Json, ReadonlyArray<V>]> { return this.m.entries() }
  
  [Symbol.iterator](): IterableIterator<readonly [Json, ReadonlyArray<V>]> { 
    return this.entries() 
  }

  static from<V>(pairs: Iterable<readonly [Json, V]>): CanonicalJsonMultiMap<V> {
    return new CanonicalJsonMultiMap(pairs)
  }

  static fromGroups<V>(groups: CanonicalJsonMap<ReadonlyArray<V>>): CanonicalJsonMultiMap<V> {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of groups) out.addAll(k, vs)
    return out
  }
}

// =========================================================
// groupBy helpers (canonical)
// =========================================================

// Group an array of T by a Json key derived from each item.
export const groupByCanonical = <T>(
  items: ReadonlyArray<T>,
  keyOf: (t: T) => Json
): CanonicalJsonMap<ReadonlyArray<T>> => {
  const m = new CanonicalJsonMap<ReadonlyArray<T>>()
  for (const t of items) {
    const k = keyOf(t)
    m.upsert(k, () => [t], (xs) => [...xs, t])
  }
  return m
}

// Group pairs [Json, V] by the Json key.
export const groupPairsByCanonical = <V>(
  pairs: ReadonlyArray<readonly [Json, V]>
): CanonicalJsonMap<ReadonlyArray<V>> => {
  const m = new CanonicalJsonMap<ReadonlyArray<V>>()
  for (const [k, v] of pairs) {
    m.upsert(k, () => [v], (xs) => [...xs, v])
  }
  return m
}

// Multimap variants if you prefer that interface:
export const multiMapByCanonical = <T>(
  items: ReadonlyArray<T>,
  keyOf: (t: T) => Json
): CanonicalJsonMultiMap<T> => {
  const mm = new CanonicalJsonMultiMap<T>()
  for (const t of items) mm.add(keyOf(t), t)
  return mm
}

export const multiMapPairsByCanonical = <V>(
  pairs: ReadonlyArray<readonly [Json, V]>
): CanonicalJsonMultiMap<V> => CanonicalJsonMultiMap.from(pairs)

// =========================================================
// CanonicalJsonMap<ReadonlyArray<V>> adapters
//   - mapGroupValues:    transform whole group -> W
//   - mapEachGroup:      map each element in group -> U
//   - filterEachGroup:   keep elements by predicate
//   - mergeGroupValues:  fold group elements -> Acc
//   - dedupeEachGroup:   deduplicate elements by key
//   - flattenGroups:     to flat pairs [Json, V]
// =========================================================

export const mapGroupValues =
  <V, W>(m: CanonicalJsonMap<ReadonlyArray<V>>,
         f: (values: ReadonlyArray<V>, key: Json) => W): CanonicalJsonMap<W> => {
    const out = new CanonicalJsonMap<W>()
    for (const [k, vs] of m) out.set(k, f(vs, k))
    return out
  }

export const mapEachGroup =
  <V, U>(m: CanonicalJsonMap<ReadonlyArray<V>>,
         f: (v: V, key: Json, index: number) => U): CanonicalJsonMap<ReadonlyArray<U>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<U>>()
    for (const [k, vs] of m) out.set(k, vs.map((v, i) => f(v, k, i)) as ReadonlyArray<U>)
    return out
  }

export const filterEachGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
       p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) out.set(k, vs.filter((v, i) => p(v, k, i)) as ReadonlyArray<V>)
    return out
  }

export const mergeGroupValues =
  <V, Acc>(m: CanonicalJsonMap<ReadonlyArray<V>>,
           init: (key: Json) => Acc,
           step: (acc: Acc, v: V, key: Json, index: number) => Acc): CanonicalJsonMap<Acc> => {
    const out = new CanonicalJsonMap<Acc>()
    for (const [k, vs] of m) {
      let acc = init(k)
      vs.forEach((v, i) => { acc = step(acc, v, k, i) })
      out.set(k, acc)
    }
    return out
  }

export const dedupeEachGroup =
  <V, K>(m: CanonicalJsonMap<ReadonlyArray<V>>,
         keyOf: (v: V, key: Json) => K): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) {
      const seen = new Set<K>()
      const arr: V[] = []
      for (const v of vs) {
        const h = keyOf(v, k)
        if (!seen.has(h)) { seen.add(h); arr.push(v) }
      }
      out.set(k, arr as ReadonlyArray<V>)
    }
    return out
  }

export const flattenGroups =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>): ReadonlyArray<readonly [Json, V]> => {
    const out: Array<readonly [Json, V]> = []
    for (const [k, vs] of m) for (const v of vs) out.push([k, v] as const)
    return out
  }

// =========================================================
// CanonicalJsonMultiMap<V> adapters
//   - collapseToMap:   MultiMap -> CanonicalJsonMap<ReadonlyArray<V>>
//   - mapMultiValues:  group -> W (like mapGroupValues)
//   - mapEachMulti:    per-element map
//   - filterEachMulti: per-element filter
//   - mergeMulti:      fold group -> Acc
// =========================================================

export const collapseToMap =
  <V>(mm: CanonicalJsonMultiMap<V>): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of mm) out.set(k, [...vs] as ReadonlyArray<V>)
    return out
  }

export const mapMultiValues =
  <V, W>(mm: CanonicalJsonMultiMap<V>,
         f: (values: ReadonlyArray<V>, key: Json) => W): CanonicalJsonMap<W> => {
    const out = new CanonicalJsonMap<W>()
    for (const [k, vs] of mm) out.set(k, f(vs, k))
    return out
  }

export const mapEachMulti =
  <V, U>(mm: CanonicalJsonMultiMap<V>,
         f: (v: V, key: Json, index: number) => U): CanonicalJsonMap<ReadonlyArray<U>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<U>>()
    for (const [k, vs] of mm) out.set(k, vs.map((v, i) => f(v, k, i)) as ReadonlyArray<U>)
    return out
  }

export const filterEachMulti =
  <V>(mm: CanonicalJsonMultiMap<V>,
       p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of mm) out.set(k, vs.filter((v, i) => p(v, k, i)) as ReadonlyArray<V>)
    return out
  }

export const mergeMulti =
  <V, Acc>(mm: CanonicalJsonMultiMap<V>,
           init: (key: Json) => Acc,
           step: (acc: Acc, v: V, key: Json, index: number) => Acc): CanonicalJsonMap<Acc> => {
    const out = new CanonicalJsonMap<Acc>()
    for (const [k, vs] of mm) {
      let acc = init(k)
      vs.forEach((v, i) => { acc = step(acc, v, k, i) })
      out.set(k, acc)
    }
    return out
  }

// =========================================================
// Small array utilities (used below)
// =========================================================

const dedupeArrayBy =
  <V, K>(xs: ReadonlyArray<V>, keyOf: (v: V) => K): ReadonlyArray<V> => {
    const seen = new Set<K>(), out: V[] = []
    for (const v of xs) { const k = keyOf(v); if (!seen.has(k)) { seen.add(k); out.push(v) } }
    return out
  }

const intersectArrayBy =
  <V, K>(as: ReadonlyArray<V>, bs: ReadonlyArray<V>, keyOf: (v: V) => K): ReadonlyArray<V> => {
    const sb = new Set(bs.map(keyOf))
    return as.filter(a => sb.has(keyOf(a)))
  }

const diffArrayBy =
  <V, K>(as: ReadonlyArray<V>, bs: ReadonlyArray<V>, keyOf: (v: V) => K): ReadonlyArray<V> => {
    const sb = new Set(bs.map(keyOf))
    return as.filter(a => !sb.has(keyOf(a)))
  }

// =========================================================
// CanonicalJsonMap<ReadonlyArray<V>> — set-like group ops
// =========================================================

// Concatenate groups; m1 values come first if both have the key
export const concatGroups =
  <V>(m1: CanonicalJsonMap<ReadonlyArray<V>>,
      m2: CanonicalJsonMap<ReadonlyArray<V>>): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m1) out.set(k, vs)
    for (const [k, vs] of m2) out.set(k, (out.get(k) ? [...(out.get(k)!), ...vs] : vs) as ReadonlyArray<V>)
    return out
  }

// Union groups with element de-duplication by keyOf
export const unionGroupsBy =
  <V, K>(m1: CanonicalJsonMap<ReadonlyArray<V>>,
         m2: CanonicalJsonMap<ReadonlyArray<V>>,
         keyOf: (v: V) => K): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    const add = (k: Json, vs: ReadonlyArray<V>) =>
      out.set(k, dedupeArrayBy([...(out.get(k) ?? []), ...vs], keyOf))
    for (const [k, vs] of m1) add(k, vs)
    for (const [k, vs] of m2) add(k, vs)
    return out
  }

// Intersection: keep only keys present in both, and intersect elements (by keyOf)
export const intersectGroupsBy =
  <V, K>(m1: CanonicalJsonMap<ReadonlyArray<V>>,
         m2: CanonicalJsonMap<ReadonlyArray<V>>,
         keyOf: (v: V) => K): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs1] of m1) {
      const vs2 = m2.get(k)
      if (vs2) out.set(k, intersectArrayBy(vs1, vs2, keyOf))
    }
    return out
  }

// Difference: A\B by elements (only keys from A kept), using keyOf
export const diffGroupsBy =
  <V, K>(ma: CanonicalJsonMap<ReadonlyArray<V>>,
         mb: CanonicalJsonMap<ReadonlyArray<V>>,
         keyOf: (v: V) => K): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vsA] of ma) {
      const vsB = mb.get(k) ?? []
      const diff = diffArrayBy(vsA, vsB, keyOf)
      if (diff.length) out.set(k, diff)
    }
    return out
  }

// =========================================================
// Per-group "top K" and global sorting of groups
// =========================================================

// Keep top K elements *per group* by score (desc), stable on ties
export const topKBy =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      k: number,
      scoreOf: (v: V, key: Json) => number): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [kjson, vs] of m) {
      const ranked = vs.map((v, i) => ({ v, i, s: scoreOf(v, kjson) }))
        .sort((a, b) => (b.s - a.s) || (a.i - b.i))
        .slice(0, Math.max(0, k))
        .map(x => x.v)
      out.set(kjson, ranked as ReadonlyArray<V>)
    }
    return out
  }

// Sort groups globally by a summary; returns a NEW CanonicalJsonMap with that order
export const sortGroupsBy =
  <V, S>(m: CanonicalJsonMap<ReadonlyArray<V>>,
         summarize: (values: ReadonlyArray<V>, key: Json) => S,
         compare: (sa: S, sb: S, ka: Json, kb: Json) => number): CanonicalJsonMap<ReadonlyArray<V>> => {
    const rows = [...m].map(([k, vs]) => [k, vs, summarize(vs, k)] as const)
    rows.sort((a, b) => compare(a[2], b[2], a[0], b[0]))
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of rows) out.set(k, vs)
    return out
  }

// A convenient numeric-desc variant (falls back to key order for ties)
export const sortGroupsByNumberDesc =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      summarize: (values: ReadonlyArray<V>, key: Json) => number): CanonicalJsonMap<ReadonlyArray<V>> =>
    sortGroupsBy(m, summarize, (sa, sb, ka, kb) =>
      (sb - sa) || compareCanonical(ka, kb)
    )

// =========================================================
// CanonicalJsonMultiMap wrappers (thin adapters)
// =========================================================

// Concatenate groups (values), preserving group insertion order
export const concatGroupsMM =
  <V>(m1: CanonicalJsonMultiMap<V>, m2: CanonicalJsonMultiMap<V>): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of m1) out.addAll(k, vs)
    for (const [k, vs] of m2) out.addAll(k, vs)
    return out
  }

export const unionGroupsByMM =
  <V, K>(m1: CanonicalJsonMultiMap<V>, m2: CanonicalJsonMultiMap<V>, keyOf: (v: V) => K): CanonicalJsonMultiMap<V> => {
    const base = collapseToMap(m1)
    const merged = unionGroupsBy(base, collapseToMap(m2), keyOf)
    return CanonicalJsonMultiMap.fromGroups(merged)
  }

export const intersectGroupsByMM =
  <V, K>(m1: CanonicalJsonMultiMap<V>, m2: CanonicalJsonMultiMap<V>, keyOf: (v: V) => K): CanonicalJsonMultiMap<V> => {
    const a = collapseToMap(m1)
    const b = collapseToMap(m2)
    return CanonicalJsonMultiMap.fromGroups(intersectGroupsBy(a, b, keyOf))
  }

export const diffGroupsByMM =
  <V, K>(ma: CanonicalJsonMultiMap<V>, mb: CanonicalJsonMultiMap<V>, keyOf: (v: V) => K): CanonicalJsonMultiMap<V> => {
    const a = collapseToMap(ma)
    const b = collapseToMap(mb)
    return CanonicalJsonMultiMap.fromGroups(diffGroupsBy(a, b, keyOf))
  }

export const topKByMM =
  <V>(mm: CanonicalJsonMultiMap<V>, k: number, scoreOf: (v: V, key: Json) => number): CanonicalJsonMultiMap<V> =>
    CanonicalJsonMultiMap.fromGroups(topKBy(collapseToMap(mm), k, scoreOf))

export const sortGroupsByNumberDescMM =
  <V>(mm: CanonicalJsonMultiMap<V>, summarize: (values: ReadonlyArray<V>, key: Json) => number): CanonicalJsonMultiMap<V> =>
    CanonicalJsonMultiMap.fromGroups(sortGroupsByNumberDesc(collapseToMap(mm), summarize))

// =========================================================
// Array micro-helpers (used below)
// =========================================================

const minBy = <V>(xs: ReadonlyArray<V>, scoreOf: (v: V, i: number) => number): V | undefined => {
  if (xs.length === 0) return undefined
  let best = xs[0]!, sbest = scoreOf(best, 0)
  for (let i = 1; i < xs.length; i++) {
    const s = scoreOf(xs[i]!, i)
    if (s < sbest) { best = xs[i]!; sbest = s }
  }
  return best
}

const maxBy = <V>(xs: ReadonlyArray<V>, scoreOf: (v: V, i: number) => number): V | undefined => {
  if (xs.length === 0) return undefined
  let best = xs[0]!, sbest = scoreOf(best, 0)
  for (let i = 1; i < xs.length; i++) {
    const s = scoreOf(xs[i]!, i)
    if (s > sbest) { best = xs[i]!; sbest = s }
  }
  return best
}

const takeWhileArr = <V>(xs: ReadonlyArray<V>, p: (v: V, i: number) => boolean): ReadonlyArray<V> => {
  let i = 0; while (i < xs.length && p(xs[i]!, i)) i++; return xs.slice(0, i)
}

const dropWhileArr = <V>(xs: ReadonlyArray<V>, p: (v: V, i: number) => boolean): ReadonlyArray<V> => {
  let i = 0; while (i < xs.length && p(xs[i]!, i)) i++; return xs.slice(i)
}

// =========================================================
// Per-group minBy/maxBy + global min/max
// =========================================================

// Keep only the minimum element per group (ties keep first by index)
export const minByGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      scoreOf: (v: V, key: Json, index: number) => number): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) {
      const v = minBy(vs, (x, i) => scoreOf(x, k, i))
      out.set(k, v === undefined ? [] : [v] as const)
    }
    return out
  }

// Keep only the maximum element per group
export const maxByGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      scoreOf: (v: V, key: Json, index: number) => number): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) {
      const v = maxBy(vs, (x, i) => scoreOf(x, k, i))
      out.set(k, v === undefined ? [] : [v] as const)
    }
    return out
  }

// Global min across all groups (Option)
export const minByGlobal =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      scoreOf: (v: V, key: Json, index: number) => number): Option<readonly [Json, V]> => {
    let bestK: Json | undefined, bestV: V | undefined, sbest = Infinity, idx = 0
    for (const [k, vs] of m) {
      for (let i = 0; i < vs.length; i++, idx++) {
        const v = vs[i]!, s = scoreOf(v, k, i)
        if (s < sbest) { sbest = s; bestK = k; bestV = v }
      }
    }
    return bestK === undefined ? None : Some([bestK, bestV!] as const)
  }

// Global max across all groups (Option)
export const maxByGlobal =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      scoreOf: (v: V, key: Json, index: number) => number): Option<readonly [Json, V]> => {
    let bestK: Json | undefined, bestV: V | undefined, sbest = -Infinity, idx = 0
    for (const [k, vs] of m) {
      for (let i = 0; i < vs.length; i++, idx++) {
        const v = vs[i]!, s = scoreOf(v, k, i)
        if (s > sbest) { sbest = s; bestK = k; bestV = v }
      }
    }
    return bestK === undefined ? None : Some([bestK, bestV!] as const)
  }

// =========================================================
// MultiMap variants for min/max
// =========================================================

export const minByGroupMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      scoreOf: (v: V, key: Json, index: number) => number): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) {
      const v = minBy(vs, (x, i) => scoreOf(x, k, i))
      if (v !== undefined) out.addAll(k, [v])
    }
    return out
  }

export const maxByGroupMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      scoreOf: (v: V, key: Json, index: number) => number): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) {
      const v = maxBy(vs, (x, i) => scoreOf(x, k, i))
      if (v !== undefined) out.addAll(k, [v])
    }
    return out
  }

// =========================================================
// Per-group takeWhile/dropWhile
// =========================================================

export const takeWhileGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) out.set(k, takeWhileArr(vs, (v, i) => p(v, k, i)))
    return out
  }

export const dropWhileGroup =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) out.set(k, dropWhileArr(vs, (v, i) => p(v, k, i)))
    return out
  }

// MultiMap flavors (yield MultiMap)
export const takeWhileGroupMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) out.addAll(k, takeWhileArr(vs, (v, i) => p(v, k, i)))
    return out
  }

export const dropWhileGroupMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      p: (v: V, key: Json, index: number) => boolean): CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) out.addAll(k, dropWhileArr(vs, (v, i) => p(v, k, i)))
    return out
  }

// =========================================================
// Streaming reducers (single pass over Iterable<[Json, V]>)
// =========================================================

// Reduce stream of (Json, V) with per-key accumulator
export const streamReduceByCanonical =
  <V, Acc>(pairs: Iterable<readonly [Json, V]>,
           init: (key: Json) => Acc,
           step: (acc: Acc, v: V, key: Json, index: number) => Acc): CanonicalJsonMap<Acc> => {
    const out = new CanonicalJsonMap<Acc>()
    const idx = new CanonicalJsonMap<number>() // per-key index
    for (const [j, v] of pairs) {
      const i = idx.get(j) ?? 0
      out.upsert(j, () => step(init(j), v, canonicalizeJson(j), i),
                    (a) => step(a, v, canonicalizeJson(j), i))
      idx.set(j, i + 1)
    }
    return out
  }

// Maintain top-K per key while streaming
export const streamTopKByCanonical =
  <V>(k: number,
      scoreOf: (v: V, key: Json, index: number) => number) =>
  (pairs: Iterable<readonly [Json, V]>): CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    const idx = new CanonicalJsonMap<number>()
    for (const [j, v] of pairs) {
      const i = idx.get(j) ?? 0
      const cur = out.get(j) ?? []
      const withScore = cur.map((x, ii) => ({ v: x, s: scoreOf(x, j, ii) }))
      withScore.push({ v, s: scoreOf(v, j, i) })
      withScore.sort((a, b) => (b.s - a.s)) // desc
      const keep = withScore.slice(0, Math.max(0, k)).map(x => x.v)
      out.set(j, keep as ReadonlyArray<V>)
      idx.set(j, i + 1)
    }
    return out
  }

// Count stream per key
export const streamCountsByCanonical =
  (pairs: Iterable<readonly [Json, unknown]>): CanonicalJsonMap<number> =>
    streamReduceByCanonical(pairs, () => 0, (acc) => acc + 1)

// Sum stream per key by a projection
export const streamSumByCanonical =
  <V>(pairs: Iterable<readonly [Json, V]>, valueOf: (v: V, key: Json, index: number) => number): CanonicalJsonMap<number> =>
    streamReduceByCanonical(pairs, () => 0, (acc, v, k, i) => acc + valueOf(v, k, i))

// =========================================================
// Canonical min/max operations for Json arrays
// =========================================================

// =========== Json[] min/max by canonical key (lexicographic) ===========

export const minByCanonical =
  (xs: ReadonlyArray<Json>): Option<Json> => {
    if (xs.length === 0) return None
    let best = xs[0]!, kbest = canonicalKey(xs[0]!)
    for (let i = 1; i < xs.length; i++) {
      const k = canonicalKey(xs[i]!)
      if (k < kbest) { best = xs[i]!; kbest = k }
    }
    return Some(best)
  }

export const maxByCanonical =
  (xs: ReadonlyArray<Json>): Option<Json> => {
    if (xs.length === 0) return None
    let best = xs[0]!, kbest = canonicalKey(xs[0]!)
    for (let i = 1; i < xs.length; i++) {
      const k = canonicalKey(xs[i]!)
      if (k > kbest) { best = xs[i]!; kbest = k }
    }
    return Some(best)
  }

// =========== Json[] min/max by a canonical score ===========
// scoreOf gets both Json and its canonical key (handy if you pre-tokenize key)

export const minByCanonicalScore =
  (xs: ReadonlyArray<Json>, scoreOf: (j: Json, key: string) => number): Option<Json> => {
    if (xs.length === 0) return None
    let best = xs[0]!, kbest = canonicalKey(xs[0]!), sbest = scoreOf(xs[0]!, kbest)
    for (let i = 1; i < xs.length; i++) {
      const j = xs[i]!, kj = canonicalKey(j), s = scoreOf(j, kj)
      if (s < sbest) { best = j; kbest = kj; sbest = s }
    }
    return Some(best)
  }

export const maxByCanonicalScore =
  (xs: ReadonlyArray<Json>, scoreOf: (j: Json, key: string) => number): Option<Json> => {
    if (xs.length === 0) return None
    let best = xs[0]!, kbest = canonicalKey(xs[0]!), sbest = scoreOf(xs[0]!, kbest)
    for (let i = 1; i < xs.length; i++) {
      const j = xs[i]!, kj = canonicalKey(j), s = scoreOf(j, kj)
      if (s > sbest) { best = j; kbest = kj; sbest = s }
    }
    return Some(best)
  }

// =========================================================
// Streaming distinct operations for Json
// =========================================================

// =========== Streaming distinct for Json ===========

export function* distinctByCanonical(it: Iterable<Json>): IterableIterator<Json> {
  const seen = new Set<string>()
  for (const j of it) {
    const k = canonicalKey(j)
    if (!seen.has(k)) { seen.add(k); yield canonicalizeJson(j) }
  }
}

export const distinctByCanonicalToArray =
  (it: Iterable<Json>): ReadonlyArray<Json> => Array.from(distinctByCanonical(it))

// =========== Streaming distinct for pairs [Json, V] (first-wins) ===========

export function* distinctPairsByCanonical<V>(
  it: Iterable<readonly [Json, V]>
): IterableIterator<readonly [Json, V]> {
  const seen = new Set<string>()
  for (const [j, v] of it) {
    const k = canonicalKey(j)
    if (!seen.has(k)) { seen.add(k); yield [canonicalizeJson(j), v] as const }
  }
}

export const distinctPairsByCanonicalToArray =
  <V>(it: Iterable<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> =>
    Array.from(distinctPairsByCanonical(it))

// =========================================================
// Last-wins distinct operations (non-streaming)
// =========================================================

export const distinctByCanonicalLast =
  (xs: ReadonlyArray<Json>): ReadonlyArray<Json> => {
    const m = new Map<string, Json>()
    for (const j of xs) m.set(canonicalKey(j), canonicalizeJson(j))
    return [...m.values()]
  }

export const distinctPairsByCanonicalLast =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> => {
    const m = new Map<string, readonly [Json, V]>()
    for (const [j, v] of xs) m.set(canonicalKey(j), [canonicalizeJson(j), v] as const)
    return [...m.values()]
  }

// =========================================================
// Canonical sort and unique operations for Json arrays
// =========================================================

// Stable sort by canonical key (asc)
export const sortJsonByCanonical =
  (xs: ReadonlyArray<Json>): ReadonlyArray<Json> =>
    xs
      .map((j, i) => ({ j, k: canonicalKey(j), i }))               // decorate
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.i - b.i))// stable
      .map(({ j }) => j)                                           // undecorate

// Stable sort (desc)
export const sortJsonByCanonicalDesc =
  (xs: ReadonlyArray<Json>): ReadonlyArray<Json> =>
    xs
      .map((j, i) => ({ j, k: canonicalKey(j), i }))
      .sort((a, b) => (a.k > b.k ? -1 : a.k < b.k ? 1 : a.i - b.i))
      .map(({ j }) => j)

// Unique (first-wins) by canonical key — returns canonicalized nodes
export const uniqueJsonByCanonical =
  (xs: ReadonlyArray<Json>): ReadonlyArray<Json> => {
    const seen = new Set<string>(), out: Json[] = []
    for (const j of xs) {
      const k = canonicalKey(j)
      if (!seen.has(k)) { seen.add(k); out.push(canonicalizeJson(j)) }
    }
    return out
  }

// If you prefer last-wins (already added earlier, here's the alias name):
export const uniqueJsonByCanonicalLast = distinctByCanonicalLast

// ==============================
// Pairs: sort by canonical key
// ==============================

// Stable asc sort by canonical key
export const sortPairsByCanonical =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> =>
    xs
      .map(([j, v], i) => ({ j, v, k: canonicalKey(j), i }))                    // decorate
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.i - b.i))             // stable
      .map(({ j, v }) => [j, v] as const)                                       // undecorate

// Stable desc sort by canonical key
export const sortPairsByCanonicalDesc =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> =>
    xs
      .map(([j, v], i) => ({ j, v, k: canonicalKey(j), i }))
      .sort((a, b) => (a.k > b.k ? -1 : a.k < b.k ? 1 : a.i - b.i))
      .map(({ j, v }) => [j, v] as const)
// ===========================================
// Pairs: unique by canonical key (first/last)
// ===========================================

// First-wins; returns canonicalized keys
export const uniquePairsByCanonical =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> => {
    const seen = new Set<string>()
    const out: Array<readonly [Json, V]> = []
    for (const [j, v] of xs) {
      const k = canonicalKey(j)
      if (!seen.has(k)) {
        seen.add(k)
        out.push([canonicalizeJson(j), v] as const)
      }
    }
    return out
  }

// Last-wins; returns canonicalized keys
export const uniquePairsByCanonicalLast =
  <V>(xs: ReadonlyArray<readonly [Json, V]>): ReadonlyArray<readonly [Json, V]> => {
    const m = new Map<string, readonly [Json, V]>()
    for (const [j, v] of xs) {
      m.set(canonicalKey(j), [canonicalizeJson(j), v] as const)
    }
    return [...m.values()]
  }

// Note: distinctPairsByCanonicalLast is already defined earlier in the file

// ==============================
// Value-aware sort helpers
// ==============================

// ------------ pairs: generic stable sort by comparator ------------
export const sortPairsBy =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      cmp: (a: readonly [Json, V], b: readonly [Json, V]) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    xs
      .map((p, i) => ({ p, i }))
      .sort((A, B) => cmp(A.p, B.p) || (A.i - B.i)) // stable
      .map(({ p }) => p)

// ------------ pairs: by canonical, then by a value projection ------------
export const sortPairsByCanonicalThen =
  <V, S>(xs: ReadonlyArray<readonly [Json, V]>,
         proj: (v: V, j: Json) => S,
         compare: (a: S, b: S) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    xs
      .map(([j, v], i) => ({ j, v, k: canonicalKey(j), s: proj(v, j), i }))
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : compare(a.s, b.s) || (a.i - b.i)))
      .map(({ j, v }) => [j, v] as const)

// ------------ pairs: numeric convenience ------------
export const sortPairsByCanonicalThenNumberAsc =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      valueOf: (v: V, j: Json) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    sortPairsByCanonicalThen(xs, valueOf, (a, b) => a - b)

export const sortPairsByCanonicalThenNumberDesc =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      valueOf: (v: V, j: Json) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    sortPairsByCanonicalThen(xs, valueOf, (a, b) => b - a)

// ------------ groups: sort values inside each group by comparator ------------
export const sortValuesInGroups =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      cmp: (a: V, b: V, key: Json) => number)
  : CanonicalJsonMap<ReadonlyArray<V>> => {
    const out = new CanonicalJsonMap<ReadonlyArray<V>>()
    for (const [k, vs] of m) {
      const decorated = vs.map((v, i) => ({ v, i }))
      decorated.sort((A, B) => cmp(A.v, B.v, k) || (A.i - B.i)) // stable
      out.set(k, decorated.map(d => d.v) as ReadonlyArray<V>)
    }
    return out
  }

// ------------ groups: numeric asc/desc convenience ------------
export const sortValuesInGroupsByNumberAsc =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      valueOf: (v: V, key: Json) => number)
  : CanonicalJsonMap<ReadonlyArray<V>> =>
    sortValuesInGroups(m, (a, b, k) => valueOf(a, k) - valueOf(b, k))

export const sortValuesInGroupsByNumberDesc =
  <V>(m: CanonicalJsonMap<ReadonlyArray<V>>,
      valueOf: (v: V, key: Json) => number)
  : CanonicalJsonMap<ReadonlyArray<V>> =>
    sortValuesInGroups(m, (a, b, k) => valueOf(b, k) - valueOf(a, k))

// ------------ multimap versions ------------
export const sortValuesInGroupsMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      cmp: (a: V, b: V, key: Json) => number)
  : CanonicalJsonMultiMap<V> => {
    const out = new CanonicalJsonMultiMap<V>()
    for (const [k, vs] of mm) {
      const decorated = vs.map((v, i) => ({ v, i }))
      decorated.sort((A, B) => cmp(A.v, B.v, k) || (A.i - B.i)) // stable
      out.addAll(k, decorated.map(d => d.v))
    }
    return out
  }

export const sortValuesInGroupsByNumberAscMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      valueOf: (v: V, key: Json) => number)
  : CanonicalJsonMultiMap<V> =>
    sortValuesInGroupsMM(mm, (a, b, k) => valueOf(a, k) - valueOf(b, k))

export const sortValuesInGroupsByNumberDescMM =
  <V>(mm: CanonicalJsonMultiMap<V>,
      valueOf: (v: V, key: Json) => number)
  : CanonicalJsonMultiMap<V> =>
    sortValuesInGroupsMM(mm, (a, b, k) => valueOf(b, k) - valueOf(a, k))

// ------------ bonus: sort pairs by value first, then canonical ------------
export const sortPairsByValueThenCanonical =
  <V, S>(xs: ReadonlyArray<readonly [Json, V]>,
         proj: (v: V, j: Json) => S,
         compare: (a: S, b: S) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    xs
      .map(([j, v], i) => ({ j, v, k: canonicalKey(j), s: proj(v, j), i }))
      .sort((a, b) => compare(a.s, b.s) || (a.k < b.k ? -1 : a.k > b.k ? 1 : (a.i - b.i)))
      .map(({ j, v }) => [j, v] as const)

export const sortPairsByValueNumberAscThenCanonical =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      valueOf: (v: V, j: Json) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    sortPairsByValueThenCanonical(xs, valueOf, (a, b) => a - b)

export const sortPairsByValueNumberDescThenCanonical =
  <V>(xs: ReadonlyArray<readonly [Json, V]>,
      valueOf: (v: V, j: Json) => number)
  : ReadonlyArray<readonly [Json, V]> =>
    sortPairsByValueThenCanonical(xs, valueOf, (a, b) => b - a)

