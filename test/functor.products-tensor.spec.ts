import { describe, expect, test } from "vitest"
import type { FunctorCheckSamples } from "../functor"
import { CategoryLimits } from "../stdlib/category-limits"
import type { FinSetMor, FinSetObj } from "../src/all/triangulated"
import { FinSet, makeFinSetObj } from "../src/all/triangulated"

const buildTensorStructure = () => {
  const cache = new WeakMap<
    FinSetObj,
    WeakMap<FinSetObj, { readonly obj: FinSetObj; readonly projections: readonly [FinSetMor, FinSetMor] }>
  >()

  const lookup = (left: FinSetObj, right: FinSetObj) => {
    let inner = cache.get(left)
    if (!inner) {
      inner = new WeakMap()
      cache.set(left, inner)
    }
    const cached = inner.get(right)
    if (cached) {
      return cached
    }
    const { obj, projections } = FinSet.product([left, right])
    const entry = { obj, projections: [projections[0]!, projections[1]!] as const }
    inner.set(right, entry)
    return entry
  }

  return {
    onObjects: (left: FinSetObj, right: FinSetObj): FinSetObj => lookup(left, right).obj,
    onMorphisms: (left: FinSetMor, right: FinSetMor): FinSetMor => {
      const source = lookup(left.from, right.from)
      const target = lookup(left.to, right.to)
      const leftLeg = FinSet.compose(left, source.projections[0])
      const rightLeg = FinSet.compose(right, source.projections[1])
      return FinSet.tuple(source.obj, [leftLeg, rightLeg], target.obj)
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
      products: FinSet,
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
