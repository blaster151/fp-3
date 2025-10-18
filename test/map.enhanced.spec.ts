import { describe, expect, it } from "vitest"
import { Some, None, isSome } from "../option"
import type { Option } from "../option"
import { Ok, Err } from "../result"
import { eqStrict } from "../stdlib/eq"
import { MonoidString, SemigroupString } from "../stdlib/monoid"
import { ordString } from "../stdlib/ord"
import { getFoldableArray } from "../typeclasses"
import {
  ConflictResolver,
  collect,
  collectMapEntries,
  collectMapValues,
  compact,
  difference,
  differenceKeys,
  entriesMap,
  filter,
  filterMap,
  filterMapMapEntries,
  filterMapMapValues,
  fromEntriesMap,
  fromFoldable,
  fromFoldableMap,
  getEq,
  getEqNative,
  getIntersectionSemigroup,
  getMonoid,
  getUnionMonoid,
  getUnionSemigroup,
  groupBy,
  intersection,
  isSubmap,
  keys,
  lookup,
  lookupWithKey,
  mapMapKeys,
  mapMapValues,
  mapWithIndex,
  member,
  modifyAt,
  partition,
  partitionMap,
  partitionMapBy,
  partitionMapWith,
  reduce,
  reduceRight,
  ReadonlyMapCompactable,
  ReadonlyMapFilterable,
  ReadonlyMapFoldable,
  ReadonlyMapFunctor,
  ReadonlyMapTraversableWithIndex,
  ReadonlyMapWitherable,
  sequence,
  separate,
  toUnfoldable,
  traverseWithIndex,
  union,
  updateAt,
  upsertAt,
  values,
  wither,
  deleteAt,
} from "../src/collections/map"
import type { Unfoldable } from "../src/collections/map"
import type { ApplicativeLike } from "../list"

const eqString = eqStrict<string>()
const eqNumber = eqStrict<number>()
const foldableArray = getFoldableArray()

const optionApplicative: ApplicativeLike<"Option"> = {
  map:
    <A, B>(f: (a: A) => B) =>
    (oa: Option<A>): Option<B> => (isSome(oa) ? Some(f(oa.value)) : None),
  ap:
    <A, B>(ofab: Option<(a: A) => B>) =>
    (oa: Option<A>): Option<B> => (isSome(ofab) && isSome(oa) ? Some(ofab.value(oa.value)) : None),
  of: Some,
}

const arrayUnfoldable: Unfoldable<"Array"> = {
  unfoldr: <B, A>(b: B, f: (b: B) => ReturnType<typeof Some> | typeof None): ReadonlyArray<A> => {
    const out: A[] = []
    let seed = b
    while (true) {
      const step = f(seed)
      if (!isSome(step)) break
      const [value, nextSeed] = step.value as readonly [A, B]
      out.push(value)
      seed = nextSeed
    }
    return out
  },
}

describe("enhanced map helpers", () => {
  it("builds maps from foldables with conflict resolution", () => {
    const result = fromFoldable(foldableArray)<string>(eqString)<number>((existing, incoming) => existing + incoming)([
      ["alpha", 1],
      ["beta", 2],
      ["alpha", 3],
    ])
    expect(result.get("alpha")).toBe(4)
    expect(result.get("beta")).toBe(2)
  })

  it("projects entries while folding", () => {
    const res = fromFoldableMap(foldableArray)<string>(eqString)<number, string>((n) => [`k${n}`, `${n}!`], (old, next) => `${old}-${next}`)([
      1,
      1,
      2,
    ])
    expect(res.get("k1")).toBe("1!-1!")
    expect(res.get("k2")).toBe("2!")
  })

  it("updates structurally equal keys", () => {
    const base = fromEntriesMap([[{ id: 1 }, 1]])
    const resolver: ConflictResolver<{ id: number }, number> = (existing, incoming) => existing + incoming
    const updated = upsertAt((a, b) => a.id === b.id)<number>({ id: 1 }, 4, base, resolver)
    expect(updated.get({ id: 1 } as unknown as { id: number })).toBeUndefined()
    expect(Array.from(updated.values())).toEqual([5])
  })

  it("modifies and deletes entries", () => {
    const base = fromEntriesMap([["a", 1]])
    const modified = modifyAt(eqString)("a", (n) => n + 1, base)
    expect(isSome(modified)).toBe(true)
    expect(modified.value?.get("a")).toBe(2)
    const removed = deleteAt(eqString)("a", modified.value ?? base)
    expect(removed.has("a")).toBe(false)
  })

  it("looks up keys with structural equality", () => {
    const base = fromEntriesMap([[{ tag: "k" }, 1]])
    const eqKey = (a: { tag: string }, b: { tag: string }) => a.tag === b.tag
    expect(isSome(lookup(eqKey)({ tag: "k" }, base))).toBe(true)
    const withKey = lookupWithKey(eqKey)({ tag: "k" }, base)
    expect(isSome(withKey)).toBe(true)
    expect(member(eqKey)({ tag: "missing" }, base)).toBe(false)
  })

  it("checks submaps using eq comparers", () => {
    const left = fromEntriesMap([["a", 1]])
    const right = fromEntriesMap([["a", 1], ["b", 2]])
    expect(isSubmap(eqString)(eqNumber)(left, right)).toBe(true)
    expect(isSubmap(eqString)(eqNumber)(right, left)).toBe(false)
  })

  it("orders keys and values via Ord", () => {
    const base = fromEntriesMap([["b", 2], ["a", 1]])
    expect(keys(ordString)(base)).toEqual(["a", "b"])
    expect(values(ordString)(base)).toEqual([1, 2])
    const collected = collect(ordString)(base, (k, v) => `${k}:${v}`)
    expect(collected).toEqual(["a:1", "b:2"])
  })

  it("converts to unfoldable structures", () => {
    const base = fromEntriesMap([["a", 1], ["b", 2]])
    const arr = toUnfoldable(arrayUnfoldable)<string>(ordString)(base)
    expect(arr).toEqual([
      ["a", 1],
      ["b", 2],
    ])
  })

  it("maps and reduces with index awareness", () => {
    const base = fromEntriesMap([["a", 1], ["b", 2]])
    const mapped = mapWithIndex((key, value: number) => `${key}${value}`)(base)
    expect(Array.from(mapped.values())).toEqual(["a1", "b2"])
    const sum = reduce(ordString)<number, number>(0, (acc, value) => acc + value)(base)
    expect(sum).toBe(3)
    const reversed = reduceRight(ordString)<number, string>("", (value, acc, key) => `${acc}${key}${value}`)(base)
    expect(reversed).toBe("b2a1")
  })

  it("foldMaps with monoids", () => {
    const base = fromEntriesMap([["a", "hi"], ["b", "there"]])
    const combined = foldMap(ordString)(MonoidString)(base, (value) => value)
    expect(combined).toBe("hithere")
  })

  it("traverses and sequences applicatively", () => {
    const base = fromEntriesMap([["a", 1], ["b", 2]])
    const traversed = traverseWithIndex(optionApplicative)(ordString)((key, value) =>
      value > 0 ? Some(`${key}:${value}`) : None,
    )(base)
    expect(isSome(traversed)).toBe(true)
    const sequenced = sequence(optionApplicative)(ordString)(mapMapValues(base, (value) => Some(value * 2)))
    expect(isSome(sequenced)).toBe(true)
    expect(sequenced.value?.get("b")).toBe(4)
  })

  it("compacts, filters, partitions, and separates", () => {
    const base = fromEntriesMap([["a", Some(1)], ["b", None]])
    expect(compact(base).has("b")).toBe(false)

    const filtered = filter<string, number>((key, value) => key === "a")(fromEntriesMap([["a", 1], ["b", 2]]))
    expect(filtered.has("b")).toBe(false)

    const filterMapped = filterMap<string, number, string>((key, value) =>
      value % 2 === 0 ? Some(`${key}:${value}`) : None,
    )(fromEntriesMap([["a", 1], ["b", 2]]))
    expect(filterMapped.has("b")).toBe(true)
    expect(filterMapped.has("a")).toBe(false)

    const [odds, evens] = partition<string, number>((_k, value) => value % 2 === 0)(fromEntriesMap([["a", 1], ["b", 2]]))
    expect(odds.has("a")).toBe(true)
    expect(evens.has("b")).toBe(true)

    const [errs, oks] = partitionMap<string, number, string, string>((key, value) =>
      value % 2 === 0 ? Ok(`${key}${value}`) : Err(`${key}${value}`),
    )(fromEntriesMap([["a", 1], ["b", 2]]))
    expect(oks.has("b")).toBe(true)
    expect(errs.has("a")).toBe(true)

    const separated = separate(fromEntriesMap([["a", Ok(1)], ["b", Err("no")]]))
    expect(separated[0].has("b")).toBe(true)
    expect(separated[1].has("a")).toBe(true)
  })

  it("supports classic helpers for backwards compatibility", () => {
    const base = fromEntriesMap([["a", 1], ["b", 2]])
    const mapped = mapMapValues(base, (value, key) => `${key}:${value}`)
    expect(mapped.get("b")).toBe("b:2")
    const mappedKeys = mapMapKeys(base, (key) => key.toUpperCase())
    expect(mappedKeys.has("A")).toBe(true)
    const collected = collectMapValues(base, { isDefinedAt: (n: number) => n > 1, apply: (n: number) => n * 10 })
    expect(collected.has("a")).toBe(false)
    const remapped = filterMapMapEntries(base, (key, value) => (value > 1 ? Some([key + key, value]) : None))
    expect(remapped.has("bb")).toBe(true)
    const liftedEntries = collectMapEntries(base, {
      isDefinedAt: ([, value]: readonly [string, number]) => value > 1,
      apply: ([key, value]: readonly [string, number]) => [key.toUpperCase(), value * 2] as const,
    })
    expect(liftedEntries.get("B")).toBe(4)
    expect(entriesMap(base)).toEqual([
      ["a", 1],
      ["b", 2],
    ])
    const grouped = groupBy(
      ["avocado", "apple", "banana"],
      (word) => word[0]!,
    )
    expect(grouped.get("a")?.length).toBe(2)
  })

  it("computes set-like operations with custom resolvers", () => {
    const a = fromEntriesMap([["x", 1], ["y", 2]])
    const b = fromEntriesMap([["y", 3], ["z", 4]])
    const diff = difference(eqString)<number>(a, b)
    expect(diff.has("x")).toBe(true)
    expect(diff.has("y")).toBe(false)

    const inter = intersection(eqString)<number>(a, b, (leftValue, rightValue) => leftValue + rightValue)
    expect(inter.get("y")).toBe(5)

    const un = union(eqString)<number>(a, b, (leftValue, rightValue) => leftValue + rightValue)
    expect(un.get("y")).toBe(5)
    expect(un.get("z")).toBe(4)

    const removed = differenceKeys(eqString)<number>(un, ["y"])
    expect(removed.has("y")).toBe(false)
  })

  it("refines and partitions entries", () => {
    const base = fromEntriesMap([["a", 1], ["b", 2]])
    const [evens, odds] = partitionMapBy<string, number, number>(base, (value): value is number => value % 2 === 0)
    expect(evens.has("b")).toBe(true)
    expect(odds.has("a")).toBe(true)

    const lifted = partitionMapWith(base, (value) => (value % 2 === 0 ? Ok(value) : Err(value)))
    expect(lifted[0].has("a")).toBe(true)
    expect(lifted[1].has("b")).toBe(true)
  })

  it("exposes algebra builders consistent with fp-ts", () => {
    const monoid = getUnionMonoid(eqString)<string>(MonoidString)
    const combined = monoid.concat(fromEntriesMap([["a", "hi"]]), fromEntriesMap([["a", " there"]]))
    expect(combined.get("a")).toBe("hi there")

    const intersectionSemigroup = getIntersectionSemigroup(eqString)<string>(SemigroupString)
    const result = intersectionSemigroup.concat(
      fromEntriesMap([["a", "hello"], ["b", "bye"]]),
      fromEntriesMap([["a", "world"], ["c", "!"], ["b", " again"]]),
    )
    expect(result.get("a")).toBe("helloworld")
    expect(result.has("c")).toBe(false)

    const monoidMap = getMonoid(eqString)<string>(MonoidString)
    const empty = monoidMap.empty
    expect(empty.size).toBe(0)
  })

  it("provides typeclass dictionaries wired to primitives", () => {
    const base = fromEntriesMap([["a", 1], ["b", 2]])
    const mapped = ReadonlyMapFunctor.map<number, string>((value) => `${value * 2}`)(base)
    expect(mapped.get("a")).toBe("2")

    const sum = ReadonlyMapFoldable.reduce(ordString)<number, number>(0, (acc, value) => acc + value)(base)
    expect(sum).toBe(3)

    const traversed = ReadonlyMapTraversableWithIndex.traverseWithIndex(optionApplicative)(ordString)((key, value) =>
      value > 0 ? Some(`${key}:${value}`) : None,
    )(base)
    expect(isSome(traversed)).toBe(true)

    const compacted = ReadonlyMapCompactable.compact(fromEntriesMap([["a", Some(1)], ["b", None]]))
    expect(compacted.has("a")).toBe(true)

    const filtered = ReadonlyMapFilterable.filter((key: string, value: number) => key === "a")(base)
    expect(filtered.size).toBe(1)

    const withered = ReadonlyMapWitherable.wither(optionApplicative)(ordString)((key: string, value: number) =>
      value > 1 ? Some(Some(value * 2)) : Some(None),
    )(base)
    expect(isSome(withered)).toBe(true)
    expect(withered.value?.has("b")).toBe(true)
    expect(withered.value?.has("a")).toBe(false)
  })

  it("reuses map equality helpers", () => {
    const eqNative = getEqNative<number>(eqNumber)
    const first = fromEntriesMap([["a", 1]])
    const second = fromEntriesMap([["a", 1]])
    expect(eqNative(first, second)).toBe(true)

    const eqStructural = getEq(eqString, eqNumber)
    expect(eqStructural(first, second)).toBe(true)
  })
})
