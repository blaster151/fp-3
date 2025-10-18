import { describe, expect, it } from "vitest"
import {
  OptionFilterable,
  OptionFoldable,
  OptionTraversable,
  OptionWitherable,
  ResultFoldable,
  getFilterableArray,
  getFoldableArray,
  getFoldableWithIndexArray,
  getResultFilterable,
  getResultFoldable,
  getResultTraversable,
  getResultWitherable,
  getTraversableArray,
  getTraversableWithIndexArray,
  getWitherableArray,
  type Applicative,
  type ResultFilterableConfig,
  type ResultTag,
  type Traversable,
  type Witherable,
} from "../typeclasses"
import { None, Some, type Option } from "../option"
import { Err, Ok, type Result } from "../result"
import { MonoidString } from "../stdlib/monoid"
import type { Monoid } from "../stdlib/monoid"
import { OptionI, ResultI } from "../typeclasses"

const MonoidSum: Monoid<number> = { empty: 0, concat: (x, y) => x + y }

const optionApplicative: Applicative<'Option'> = OptionI
const resultApplicative: Applicative<'Result'> = ResultI

const sampleResultConfig: ResultFilterableConfig<string> = {
  onNone: () => "empty",
  onFalse: (a) => `rejected:${String(a)}`,
}

describe("Foldable", () => {
  it("foldMap on arrays matches manual reduction", () => {
    const foldable = getFoldableArray()
    const values = [1, 2, 3, 4]
    const manual = values.reduce((acc, n) => acc + n, 0)
    expect(foldable.foldMap(MonoidSum)((n) => n)(values)).toBe(manual)
  })

  it("foldMap on Option respects presence", () => {
    expect(OptionFoldable.foldMap(MonoidSum)((n: number) => n)(Some(5))).toBe(5)
    expect(OptionFoldable.foldMap(MonoidSum)((n: number) => n)(None)).toBe(0)
  })

  it("foldMap on Result ignores errors", () => {
    expect(ResultFoldable.foldMap(MonoidSum)((n: number) => n)(Ok(7))).toBe(7)
    expect(ResultFoldable.foldMap(MonoidSum)((n: number) => n)(Err("boom"))).toBe(0)
  })

  it("foldMapWithIndex annotates indexes for arrays", () => {
    const foldable = getFoldableWithIndexArray()
    const actual = foldable.foldMapWithIndex(MonoidString)((i, value) => `${i}:${value};`)(["a", "b", "c"])
    expect(actual).toBe("0:a;1:b;2:c;")
  })
})

describe("Traversable", () => {
  it("array traverse with Option accumulates successes", () => {
    const traversable = getTraversableArray()
    const lifted = traversable.traverse(optionApplicative)((n: number): Option<number> => (n > 0 ? Some(n * 2) : None))([
      1,
      2,
      3,
    ])
    expect(lifted).toEqual(Some([2, 4, 6]))

    const halted = traversable.traverse(optionApplicative)((n: number): Option<number> => (n > 1 ? Some(n) : None))([
      0,
      1,
      2,
    ])
    expect(halted).toBe(None)
  })

  it("array traverseWithIndex forwards indexes", () => {
    const traversable = getTraversableWithIndexArray()
    const result = traversable.traverseWithIndex(optionApplicative)((i, n: number) => Some(n + i))([1, 1, 1])
    expect(result).toEqual(Some([1, 2, 3]))
  })

  it("Option traverse works with Result applicative", () => {
    const okTraversal = OptionTraversable.traverse(resultApplicative)((n: number): Result<unknown, number> => Ok(n + 1))(Some(2))
    expect(okTraversal).toEqual(Ok(Some(3)))

    const errTraversal = OptionTraversable.traverse(resultApplicative)((_: number) => Err("oops" as const))(Some(2))
    expect(errTraversal).toEqual(Err("oops"))
  })

  it("Result traverse lifts into Option applicative", () => {
    const traversable = getResultTraversable<string>()
    const okResult = traversable.traverse(optionApplicative)((n: number): Option<number> => Some(n * 2))(Ok(3) as Result<string, number>)
    expect(okResult).toEqual(Some(Ok(6)))

    const halted = traversable.traverse(optionApplicative)((_: number): Option<number> => None)(Ok(3) as Result<string, number>)
    expect(halted).toBe(None)

    const existingErr = traversable.traverse(optionApplicative)((n: number): Option<number> => Some(n))(Err("fail"))
    expect(existingErr).toEqual(Some(Err("fail")))
  })
})

describe("Filterable", () => {
  it("array filter behaves like native filter", () => {
    const filterable = getFilterableArray()
    expect(filterable.filter((n: number) => n % 2 === 0)([1, 2, 3, 4, 5])).toEqual([2, 4])
  })

  it("array partition produces complementary views", () => {
    const filterable = getFilterableArray()
    const partitioned = filterable.partition((n: number) => n > 2)([1, 2, 3, 4])
    expect(partitioned.left).toEqual([1, 2])
    expect(partitioned.right).toEqual([3, 4])
  })

  it("Option filter removes failing entries", () => {
    expect(OptionFilterable.filter((n: number) => n > 2)(Some(4))).toEqual(Some(4))
    expect(OptionFilterable.filter((n: number) => n > 2)(Some(1))).toEqual(None)
  })

  it("Result filter uses fallback errors", () => {
    const filterable = getResultFilterable(sampleResultConfig)
    expect(filterable.filter((n: number) => n > 0)(Ok(3))).toEqual(Ok(3))
    expect(filterable.filter((n: number) => n > 0)(Ok(-1))).toEqual(Err("rejected:-1"))
    expect(filterable.compact(Ok(Some(5)))).toEqual(Ok(5))
    expect(filterable.compact(Ok(None))).toEqual(Err("empty"))
  })
})

describe("Witherable", () => {
  it("array wither combines traversal and compaction", () => {
    const witherable = getWitherableArray()
    const result = witherable.wither(optionApplicative)((n: number): Option<Option<number>> =>
      Some(n % 2 === 0 ? Some(n * 3) : None),
    )([1, 2, 3, 4])
    expect(result).toEqual(Some([6, 12]))
  })

  it("Option wither handles nested Options", () => {
    const kept = OptionWitherable.wither(optionApplicative)((n: number): Option<Option<number>> => Some(n > 0 ? Some(n) : None))(Some(5))
    expect(kept).toEqual(Some(Some(5)))

    const dropped = OptionWitherable.wither(optionApplicative)((n: number): Option<Option<number>> => Some(n > 0 ? Some(n) : None))(Some(-1))
    expect(dropped).toEqual(Some(None))
  })

  it("Result wither respects the supplied config", () => {
    const witherable = getResultWitherable(sampleResultConfig)
    const okResult = witherable.wither(optionApplicative)((n: number): Option<Option<number>> => Some(n > 0 ? Some(n * 2) : None))(Ok(2))
    expect(okResult).toEqual(Some(Ok(4)))

    const filtered = witherable.wither(optionApplicative)((n: number): Option<Option<number>> => Some(n > 0 ? Some(n * 2) : None))(Ok(0))
    expect(filtered).toEqual(Some(Err("empty")))

    const existingErr = witherable.wither(optionApplicative)((n: number): Option<Option<number>> => Some(n > 0 ? Some(n * 2) : None))(Err("fail"))
    expect(existingErr).toEqual(Some(Err("fail")))
  })

  it("array wilt separates successes and failures", () => {
    const witherable = getWitherableArray()
    const split = witherable.wilt(optionApplicative)((n: number): Option<Result<number, number>> =>
      Some(n % 2 === 0 ? Ok(n * 2) : Err(n)),
    )([1, 2, 3])
    expect(split).toEqual(Some({ left: [1, 3], right: [4] }))
  })
})

// Ensure traversable helpers remain assignable to broader types
const _arrayTraversable: Traversable<'Array'> = getTraversableArray()
const _resultTraversable: Traversable<ResultTag<string>> = getResultTraversable<string>()
const _optionWitherable: Witherable<'Option'> = OptionWitherable
const _arrayWitherable: Witherable<'Array'> = getWitherableArray()
const _resultWitherable: Witherable<ResultTag<string>> = getResultWitherable<string>(sampleResultConfig)

