import { describe, expect, it } from "vitest"

import {
  ListApplicative,
  ListFilterable,
  ListFoldable,
  ListFunctor,
  ListMonad,
  ListTraversable,
  ListWitherable,
  append,
  chain,
  compact,
  concat,
  cons,
  drop,
  filter,
  filterMap,
  flatten,
  foldl,
  foldr,
  fromArray,
  fromIterable,
  getEq,
  getMonoid,
  getOrd,
  getSemigroup,
  groupBy,
  isCons,
  isNil,
  length,
  listComprehension,
  listDo,
  map,
  nil,
  of,
  partition,
  partitionMap,
  prepend,
  reduce,
  reverse,
  separate,
  sequence,
  take,
  toArray,
  toNonEmptyOption,
  traverse,
  unzip,
  zip,
  wither,
} from "../list"
import { None, Some, isSome, mapO } from "../option"
import { Err, Ok } from "../result"
import type { Option } from "../option"
import type { Result } from "../result"

const eqNumberList = getEq<number>((x, y) => x === y)

const optionApplicative = {
  of: Some,
  map: mapO,
  ap:
    <A, B>(ofab: Option<(a: A) => B>) =>
    (oa: Option<A>): Option<B> => (isSome(ofab) && isSome(oa) ? Some(ofab.value(oa.value)) : None),
}

describe("List", () => {
  it("round-trips through array conversion", () => {
    const values = [1, 2, 3, 4]
    const list = fromArray(values)
    expect(toArray(list)).toEqual(values)
    const rebuilt = fromArray(toArray(list))
    expect(eqNumberList(rebuilt, list)).toBe(true)
  })

  it("constructs from iterable", () => {
    const list = fromIterable(new Set([1, 2, 3]))
    expect(toArray(list)).toEqual([1, 2, 3])
  })

  it("supports basic constructors and predicates", () => {
    const empty = nil<number>()
    expect(isNil(empty)).toBe(true)
    const singleton = of(42)
    expect(isCons(singleton)).toBe(true)
    expect(toArray(singleton)).toEqual([42])
    const viaCons = cons(1)(cons(2)(nil()))
    expect(toArray(viaCons)).toEqual([1, 2])
  })

  it("maps, chains, and flattens", () => {
    const base = fromArray([1, 2, 3])
    expect(toArray(map((n: number) => n * 2)(base))).toEqual([2, 4, 6])
    const chained = chain((n: number) => fromArray([n, n + 10]))(base)
    expect(toArray(chained)).toEqual([1, 11, 2, 12, 3, 13])
    const flattened = flatten(fromArray([fromArray([1]), fromArray([2, 3])]))
    expect(toArray(flattened)).toEqual([1, 2, 3])
  })

  it("applies functions applicatively", () => {
    const fs = fromArray([(n: number) => n + 1, (n: number) => n * 3])
    const values = fromArray([1, 2])
    expect(toArray(ListApplicative.ap(fs)(values))).toEqual([2, 3, 3, 6])
  })

  it("folds from both directions", () => {
    const list = fromArray([1, 2, 3])
    expect(foldl<number, number>((acc, n) => acc + n)(0)(list)).toBe(6)
    expect(foldr<number, string>((n, acc) => `${acc}${n}`)("!")(list)).toBe("!321")
    expect(reduce<number, number>(10)((acc, n) => acc + n)(list)).toBe(16)
  })

  it("filters and partitions", () => {
    const list = fromArray([1, 2, 3, 4])
    expect(toArray(filter((n: number) => n % 2 === 0)(list))).toEqual([2, 4])
    const [even, odd] = partition((n: number) => n % 2 === 0)(list)
    expect(toArray(even)).toEqual([2, 4])
    expect(toArray(odd)).toEqual([1, 3])
    const doubled = filterMap((n: number) => (n % 2 === 0 ? Some(n * 2) : None))(list)
    expect(toArray(doubled)).toEqual([4, 8])
  })

  it("partitions with results", () => {
    const list = fromArray([1, 2, 3])
    const [lefts, rights] = partitionMap((n: number): Result<string, number> =>
      n % 2 === 0 ? Ok(n) : Err(`odd-${n}`),
    )(list)
    expect(toArray(lefts)).toEqual(["odd-1", "odd-3"])
    expect(toArray(rights)).toEqual([2])
    expect(toArray(compact(fromArray<Option<number>>([Some(1), None, Some(3)])))).toEqual([1, 3])
    const separated = separate(fromArray<Result<string, number>>([Ok(1), Err("x"), Ok(3)]))
    expect(toArray(separated[0])).toEqual(["x"])
    expect(toArray(separated[1])).toEqual([1, 3])
  })

  it("zips and unzips", () => {
    const letters = fromArray(["a", "b", "c"])
    const nums = fromArray([1, 2])
    const zipped = zip(nums)(letters)
    expect(toArray(zipped)).toEqual([
      ["a", 1],
      ["b", 2],
    ])
    const [backLetters, backNums] = unzip(zipped)
    expect(toArray(backLetters)).toEqual(["a", "b"])
    expect(toArray(backNums)).toEqual([1, 2])
  })

  it("takes, drops, concatenates, appends, and prepends", () => {
    const list = fromArray([1, 2, 3, 4])
    expect(toArray(take(2)(list))).toEqual([1, 2])
    expect(toArray(drop(2)(list))).toEqual([3, 4])
    expect(toArray(concat(fromArray([5, 6]))(list))).toEqual([1, 2, 3, 4, 5, 6])
    expect(toArray(append(7)(list))).toEqual([1, 2, 3, 4, 7])
    expect(toArray(prepend(0)(list))).toEqual([0, 1, 2, 3, 4])
  })

  it("groups by key", () => {
    const grouped = groupBy((s: string) => s.length)(fromArray(["a", "hi", "bb", "ccc"]))
    expect(Array.from(grouped.keys()).sort()).toEqual([1, 2, 3])
    expect(toArray(grouped.get(2)!)).toEqual(["hi", "bb"])
  })

  it("reverses and measures length", () => {
    const list = fromArray([1, 2, 3])
    expect(toArray(reverse(list))).toEqual([3, 2, 1])
    expect(length(list)).toBe(3)
  })

  it("interoperates with NonEmptyArray", () => {
    const list = fromArray([1, 2, 3])
    const nea = toNonEmptyOption(list)
    expect(isSome(nea)).toBe(true)
    if (isSome(nea)) {
      expect(nea.value).toEqual([1, 2, 3])
      expect(toArray(fromArray(nea.value))).toEqual([1, 2, 3])
    }
    expect(toNonEmptyOption(nil())).toBe(None)
  })

  it("builds Eq, Ord, Semigroup, and Monoid", () => {
    const eq = getEq<number>((x, y) => x === y)
    const ord = getOrd<number>((x, y) => x - y)
    const s = getSemigroup<number>()
    const m = getMonoid<number>()
    const a = fromArray([1, 2])
    const b = fromArray([3])
    const c = fromArray([4, 5])
    expect(eq(a, fromArray([1, 2]))).toBe(true)
    expect(ord(a, b)).toBeLessThan(0)
    expect(toArray(s.concat(a, b))).toEqual([1, 2, 3])
    expect(toArray(m.concat(a, m.concat(b, c)))).toEqual([1, 2, 3, 4, 5])
    expect(toArray(m.concat(m.empty, a))).toEqual([1, 2])
    expect(toArray(m.concat(a, m.empty))).toEqual([1, 2])
  })

  it("provides functor, applicative, monad, and foldable instances", () => {
    const list = fromArray([1, 2, 3])
    expect(toArray(ListFunctor.map((n: number) => n + 1)(list))).toEqual([2, 3, 4])
    expect(toArray(ListMonad.chain((n: number) => fromArray([n, n * 2]))(list))).toEqual([
      1,
      2,
      2,
      4,
      3,
      6,
    ])
    expect(foldl<number, number>((acc, n) => acc + n)(0)(list)).toBe(
      ListFoldable.reduce<number, number>(0)((acc, n) => acc + n)(list),
    )
    expect(ListFilterable.filter).toBe(filter)
    expect(ListTraversable.traverse).toBe(traverse)
    expect(ListWitherable.wither).toBe(wither)
  })

  it("traverses and sequences with Option applicative", () => {
    const list = fromArray([1, 2, 3])
    const traversed = traverse(optionApplicative)((n: number) => (n < 3 ? Some(n * 2) : None))(list)
    expect(traversed).toBe(None)
    const okTraverse = traverse(optionApplicative)((n: number) => Some(n * 2))(list)
    expect(isSome(okTraverse)).toBe(true)
    if (isSome(okTraverse)) {
      expect(toArray(okTraverse.value)).toEqual([2, 4, 6])
    }
    const sequenced = sequence(optionApplicative)(fromArray([Some(1), Some(2)]))
    expect(isSome(sequenced)).toBe(true)
    if (isSome(sequenced)) {
      expect(toArray(sequenced.value)).toEqual([1, 2])
    }
  })

  it("wither filters effectfully", () => {
    const list = fromArray([1, 2, 3, 4])
    const result = wither(optionApplicative)((n: number) =>
      Some(n % 2 === 0 ? Some(n * 10) : None),
    )(list)
    expect(isSome(result)).toBe(true)
    if (isSome(result)) {
      expect(toArray(result.value)).toEqual([20, 40])
    }
  })

  it("supports do-notation style comprehensions", () => {
    const outcomes = listDo(function* () {
      const a = yield fromArray([1, 2])
      const b = yield fromArray([10, 20])
      return a + b
    })
    expect(toArray(outcomes)).toEqual([11, 21, 12, 22])
  })

  it("builds comprehensions via helper", () => {
    const result = listComprehension(
      fromArray(["a", "b"]),
      (letter) => fromArray([1, 2]),
      (letter, n) => `${letter}${n}`,
    )
    expect(toArray(result)).toEqual(["a1", "a2", "b1", "b2"])
  })
})
