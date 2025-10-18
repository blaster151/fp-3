import { describe, expect, it } from "vitest"

import {
  ReadonlySetFilterable,
  ReadonlySetTraversableWithIndex,
  cartesianProduct,
  compact,
  difference,
  elem,
  every,
  filter,
  filterMap,
  fromFoldable,
  fromIterable,
  getDifferenceMagma,
  getEq,
  getIntersectionSemigroup,
  getShow,
  getSymmetricDifferenceMagma,
  getUnionMonoid,
  intersection,
  isEmpty,
  map,
  member,
  partition,
  partitionMap,
  separate,
  setFrom,
  singleton,
  size,
  some,
  subset,
  symmetricDifference,
  union,
  wither,
  wilt,
} from "../src/collections/set"
import { eqStrict } from "../stdlib/eq"
import { ordNumber } from "../stdlib/ord"
import type { Option } from "../option"
import { None, Some, isSome } from "../option"
import type { Result } from "../result"
import { Err, Ok } from "../result"
import type { Applicative, Foldable } from "../typeclasses"
import type { Monoid } from "../stdlib/monoid"

const numberEq = eqStrict<number>()
const stringEq = eqStrict<string>()

const arrayFoldable: Foldable<'Array'> = {
  reduce:
    <A, B>(b: B, f: (acc: B, a: A) => B) =>
    (fa: ReadonlyArray<A>): B => fa.reduce(f, b),
  foldMap:
    <M>(M: Monoid<M>) =>
    <A>(f: (a: A) => M) =>
    (fa: ReadonlyArray<A>): M => fa.reduce((acc, a) => M.concat(acc, f(a)), M.empty),
  reduceRight:
    <A, B>(b: B, f: (a: A, acc: B) => B) =>
    (fa: ReadonlyArray<A>): B => fa.reduceRight((acc, a) => f(a, acc), b),
}

const optionApplicative: Applicative<'Option'> = {
  of: Some,
  map:
    <A, B>(f: (a: A) => B) =>
    (oa: Option<A>): Option<B> => (isSome(oa) ? Some(f(oa.value)) : None),
  ap:
    <A, B>(ofab: Option<(a: A) => B>) =>
    (oa: Option<A>): Option<B> => (isSome(ofab) && isSome(oa) ? Some(ofab.value(oa.value)) : None),
}

describe("ReadonlySet helpers", () => {
  it("constructs from iterables and foldables", () => {
    const viaIterable = fromIterable([1, 2, 2, 3])
    expect(new Set(viaIterable).size).toBe(3)

    const viaFoldable = fromFoldable(arrayFoldable)(numberEq)([1, 1, 2, 3])
    expect(new Set(viaFoldable).size).toBe(3)
  })

  it("supports basic predicates and eq/show", () => {
    const values = setFrom([1, 2, 3])
    expect(isEmpty(values)).toBe(false)
    expect(size(values)).toBe(3)
    expect(isEmpty(setFrom([]))).toBe(true)
    expect(Array.from(singleton(5))).toEqual([5])
    expect(elem(numberEq)(2)(values)).toBe(true)
    expect(member(numberEq)(4)(values)).toBe(false)

    const other = setFrom([2, 3])
    expect(subset(numberEq)(values)(other)).toBe(true)
    expect(subset(numberEq)(other)(values)).toBe(false)
    expect(every((n: number) => n > 0)(values)).toBe(true)
    expect(some((n: number) => n > 2)(values)).toBe(true)

    const eqSet = getEq(numberEq)
    expect(eqSet(values, setFrom([3, 2, 1]))).toBe(true)

    const show = getShow((n: number) => `#${n}`, ordNumber)
    expect(show(values)).toBe("Set { #1, #2, #3 }")
  })

  it("maps, filters, and partitions with Eq awareness", () => {
    const base = setFrom([1, 2, 3, 4])
    const doubled = map<number, number>(numberEq)((n) => n * 2)(base)
    expect(new Set(doubled).size).toBe(4)
    const evens = filter((n: number) => n % 2 === 0)(base)
    expect(Array.from(evens).sort((a, b) => a - b)).toEqual([2, 4])

    const parted = partition((n: number) => n % 2 === 0)(base)
    expect(Array.from(parted.right).sort((a, b) => a - b)).toEqual([2, 4])
    expect(Array.from(parted.left).sort((a, b) => a - b)).toEqual([1, 3])

    const resultPartition = partitionMap<number, string, string>(
      (a, b) => a === b,
      (a, b) => a === b,
    )((n) => (n % 2 === 0 ? Ok(`even-${n}`) : Err(`odd-${n}`)))(base)
    expect(Array.from(resultPartition.right).sort()).toEqual(["even-2", "even-4"])
    expect(Array.from(resultPartition.left).sort()).toEqual(["odd-1", "odd-3"])
  })

  it("supports filterMap, compact, and separate", () => {
    const base = setFrom([1, 2, 3, 4])
    const filtered = filterMap<number, number>(numberEq)((n) => (n % 2 === 0 ? Some(n * 2) : None))(base)
    expect(Array.from(filtered).sort((a, b) => a - b)).toEqual([4, 8])

    const optionSet = setFrom<Option<number>>([Some(1), None, Some(2), Some(1)])
    const compacted = compact(numberEq)(optionSet)
    expect(Array.from(compacted).sort((a, b) => a - b)).toEqual([1, 2])

    const resultSet = setFrom<Result<string, number>>([Ok(1), Err("bad"), Ok(2), Err("bad")])
    const separated = separate((a, b) => a === b, numberEq)(resultSet)
    expect(Array.from(separated.right).sort((a, b) => a - b)).toEqual([1, 2])
    expect(Array.from(separated.left)).toEqual(["bad"])
  })

  it("performs set algebra", () => {
    const left = setFrom([1, 2, 3])
    const right = setFrom([3, 4, 5])

    expect(Array.from(union(numberEq)(right)(left)).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    expect(Array.from(intersection(numberEq)(right)(left)).sort((a, b) => a - b)).toEqual([3])
    expect(Array.from(difference(numberEq)(right)(left)).sort((a, b) => a - b)).toEqual([1, 2])
    expect(Array.from(symmetricDifference(numberEq)(right)(left)).sort((a, b) => a - b)).toEqual([1, 2, 4, 5])

    const pairs = cartesianProduct(numberEq, stringEq)(setFrom(["a", "b"]))(setFrom([1, 1, 2]))
    expect(Array.from(pairs)).toEqual([
      [1, "a"],
      [1, "b"],
      [2, "a"],
      [2, "b"],
    ])
  })

  it("exposes algebraic structures", () => {
    const unionMonoid = getUnionMonoid(numberEq)
    const interSemigroup = getIntersectionSemigroup(numberEq)
    const diffMagma = getDifferenceMagma(numberEq)
    const symDiffMagma = getSymmetricDifferenceMagma(numberEq)

    const a = setFrom([1, 2])
    const b = setFrom([2, 3])
    const c = setFrom([3, 4])

    expect(Array.from(unionMonoid.concat(a, b)).sort((x, y) => x - y)).toEqual([1, 2, 3])
    expect(Array.from(unionMonoid.concat(unionMonoid.empty, a)).sort((x, y) => x - y)).toEqual([1, 2])
    expect(Array.from(interSemigroup.concat(a, b)).sort((x, y) => x - y)).toEqual([2])
    expect(Array.from(diffMagma.concat(a, b)).sort((x, y) => x - y)).toEqual([1])
    expect(Array.from(symDiffMagma.concat(a, b)).sort((x, y) => x - y)).toEqual([1, 3])
    expect(Array.from(symDiffMagma.concat(a, c)).sort((x, y) => x - y)).toEqual([1, 2, 3, 4])
  })

  it("provides filterable and traversable dictionaries", () => {
    const base = setFrom([1, 2, 3, 4])
    const viaFilterable = ReadonlySetFilterable.filterMap<number, number>(numberEq)((n) =>
      n % 2 === 0 ? Some(n / 2) : None,
    )(base)
    expect(Array.from(viaFilterable).sort()).toEqual([1, 2])

    const visited: Array<number> = []
      const traversed = ReadonlySetTraversableWithIndex.traverse(optionApplicative)<number, number>({
        ord: ordNumber,
        eq: numberEq,
      })((n) => {
        visited.push(n)
        return Some(n * 3)
    })(setFrom([3, 1, 2]))

    expect(visited).toEqual([1, 2, 3])
    expect(isSome(traversed)).toBe(true)
    if (isSome(traversed)) {
      expect(Array.from(traversed.value).sort((a, b) => a - b)).toEqual([3, 6, 9])
    }
  })

  it("supports wither and wilt respecting order", () => {
      const wiltApplicative: Applicative<'Option'> = optionApplicative

    const visitedWither: Array<number> = []
    const withered = wither(optionApplicative)<number, number>({ ord: ordNumber, eq: numberEq })((n) => {
      visitedWither.push(n)
      return Some(n % 2 === 0 ? Some(n * 2) : None)
    })(setFrom([3, 1, 2]))

    expect(visitedWither).toEqual([1, 2, 3])
    expect(isSome(withered)).toBe(true)
    if (isSome(withered)) {
      expect(Array.from(withered.value).sort((a, b) => a - b)).toEqual([4])
    }

    const visitedWilt: Array<number> = []
    const wilted = wilt(wiltApplicative)<number, string, number>({ ord: ordNumber, left: (a, b) => a === b, right: numberEq })(
      (n) => {
        visitedWilt.push(n)
        return Some(n % 2 === 0 ? Ok(n) : Err(`odd-${n}`))
      },
    )(setFrom([3, 1, 2]))

    expect(visitedWilt).toEqual([1, 2, 3])
    expect(isSome(wilted)).toBe(true)
    if (isSome(wilted)) {
      expect({
        left: Array.from(wilted.value.left).sort(),
        right: Array.from(wilted.value.right).sort((a, b) => a - b),
      }).toEqual({ left: ["odd-1", "odd-3"], right: [2] })
    }
  })
})
