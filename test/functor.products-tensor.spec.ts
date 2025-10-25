import { describe, expect, test } from "vitest"
import type { FunctorCheckSamples } from "../functor"
import { CategoryLimits } from "../stdlib/category-limits"
import type { FinSetMor, FinSetObj } from "../src/all/triangulated"
import { FinSet, FinSetFinitelyCocomplete, makeFinSetObj } from "../src/all/triangulated"

const encodePairKey = (leftIndex: number, rightIndex: number): string => `${leftIndex}|${rightIndex}`

const buildTensorStructure = () => {
  type ProductCacheEntry = {
    readonly obj: FinSetObj
    readonly tupleIndex: (leftIndex: number, rightIndex: number) => number
    readonly tuples: ReadonlyArray<readonly [number, number]>
  }

  const cache = new WeakMap<FinSetObj, WeakMap<FinSetObj, ProductCacheEntry>>()

  const readTuple = (tuple: unknown): readonly [number, number] => {
    const coordinates = tuple as ReadonlyArray<number>
    const leftIndex = coordinates[0]
    const rightIndex = coordinates[1]
    if (typeof leftIndex !== "number" || typeof rightIndex !== "number") {
      throw new Error("FinSet tensor: encountered malformed product tuple")
    }
    return [leftIndex, rightIndex]
  }

  const lookup = (left: FinSetObj, right: FinSetObj): ProductCacheEntry => {
    let inner = cache.get(left)
    if (!inner) {
      inner = new WeakMap()
      cache.set(left, inner)
    }
    const cached = inner.get(right)
    if (cached) {
      return cached
    }
    const { obj } = FinSet.product([left, right])
    const tupleKeys = new Map<string, number>()
    const tuples = obj.elements.map((tuple, index) => {
      const coordinates = readTuple(tuple)
      tupleKeys.set(encodePairKey(coordinates[0], coordinates[1]), index)
      return coordinates
    })
    const entry: ProductCacheEntry = {
      obj,
      tuples,
      tupleIndex: (leftIndex, rightIndex) => {
        const key = encodePairKey(leftIndex, rightIndex)
        const target = tupleKeys.get(key)
        if (target === undefined) {
          throw new Error(`FinSet tensor: missing coordinate (${leftIndex}, ${rightIndex}) in product carrier`)
        }
        return target
      },
    }
    inner.set(right, entry)
    return entry
  }

  return {
    onObjects: (left: FinSetObj, right: FinSetObj): FinSetObj => lookup(left, right).obj,
    onMorphisms: (left: FinSetMor, right: FinSetMor): FinSetMor => {
      const source = lookup(left.from, right.from)
      const target = lookup(left.to, right.to)
      const map = source.tuples.map(([leftIndex, rightIndex]) => {
        const leftImage = left.map[leftIndex]
        const rightImage = right.map[rightIndex]
        if (leftImage === undefined || rightImage === undefined) {
          throw new Error("FinSet tensor: morphism legs missing image data")
        }
        return target.tupleIndex(leftImage, rightImage)
      })
      return { from: source.obj, to: target.obj, map }
    },
  }
}

describe("CategoryLimits.productWithObjectFunctor", () => {
  test("packages (- × C) with projection diagnostics", () => {
    const bool = makeFinSetObj([0, 1])
    const triple = makeFinSetObj([0, 1, 2])
    const parameter = makeFinSetObj([0, 1, 2, 3])

    const flip: FinSetMor = { from: bool, to: bool, map: [1, 0] }
    const embed: FinSetMor = { from: bool, to: triple, map: [0, 2] }
    const collapse: FinSetMor = { from: triple, to: bool, map: [0, 1, 1] }

    const samples: FunctorCheckSamples<FinSetObj, FinSetMor> = {
      objects: [bool, triple],
      arrows: [flip, embed, collapse],
      composablePairs: [{ f: embed, g: collapse }],
    }

    const result = CategoryLimits.productWithObjectFunctor({
      category: FinSet,
      products: FinSetFinitelyCocomplete,
      parameter,
      samples,
      label: "FinSet",
    })

    expect(result.functor.report.holds).toBe(true)
    expect(result.diagnostics.holds).toBe(true)
    expect(result.diagnostics.identities.every((entry) => entry.diagnostic.holds)).toBe(true)
    expect(result.diagnostics.compositions.every((entry) => entry.sequential.holds)).toBe(true)

    const embedDiagnostic = result.diagnostics.arrows.find((entry) => entry.arrow === embed)
    expect(embedDiagnostic?.holds).toBe(true)
  })
})

describe("CategoryLimits.tensorWithObjectFunctor", () => {
  test("fixes the right tensor factor via the supplied bifunctor", () => {
    const bool = makeFinSetObj([0, 1])
    const triple = makeFinSetObj([0, 1, 2])
    const parameter = makeFinSetObj([0, 1, 2, 3])

    const embed: FinSetMor = { from: bool, to: triple, map: [0, 2] }
    const collapse: FinSetMor = { from: triple, to: bool, map: [0, 1, 1] }

    const samples: FunctorCheckSamples<FinSetObj, FinSetMor> = {
      objects: [bool, triple],
      arrows: [embed, collapse],
      composablePairs: [{ f: embed, g: collapse }],
    }

    const tensor = buildTensorStructure()
    const result = CategoryLimits.tensorWithObjectFunctor({
      category: FinSet,
      tensor,
      parameter,
      samples,
      label: "FinSet",
    })

    expect(result.functor.report.holds).toBe(true)
    expect(result.diagnostics.holds).toBe(true)
    expect(result.diagnostics.identities.every((entry) => entry.holds)).toBe(true)
    expect(result.diagnostics.compositions.every((entry) => entry.holds)).toBe(true)

    const idParameter = FinSet.id(parameter)
    const expected = tensor.onMorphisms(embed, idParameter)
    const actual = result.functor.functor.F1(embed)
    expect(FinSet.equalMor?.(expected, actual) ?? false).toBe(true)
  })
})
