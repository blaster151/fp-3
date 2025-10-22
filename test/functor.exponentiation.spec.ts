import { describe, expect, test } from "vitest"

import type { FunctorCheckSamples } from "../functor"
import { CategoryLimits } from "../stdlib/category-limits"
import type { FinSetMor, FinSetObj } from "../src/all/triangulated"
import { FinSet, makeFinSetObj } from "../src/all/triangulated"

describe("CategoryLimits.exponentiateByObjectFunctor", () => {
  test("curries arrows and satisfies evaluation naturality", () => {
    const parameter = makeFinSetObj([0, 1])
    const bool = makeFinSetObj([0, 1])
    const triple = makeFinSetObj([0, 1, 2])

    const embed: FinSetMor = { from: bool, to: triple, map: [0, 2] }
    const collapse: FinSetMor = { from: triple, to: bool, map: [0, 1, 1] }

    const samples: FunctorCheckSamples<FinSetObj, FinSetMor> = {
      objects: [bool, triple],
      arrows: [embed, collapse],
      composablePairs: [{ f: embed, g: collapse }],
    }

    const result = CategoryLimits.exponentiateByObjectFunctor({
      category: FinSet,
      cartesianClosed: FinSet,
      parameter,
      samples,
      label: "FinSet",
    })

    expect(result.functor.report.holds).toBe(true)
    expect(result.diagnostics.holds).toBe(true)
    expect(result.evaluation.report.holds).toBe(true)

    for (const diagnostic of result.diagnostics.arrows) {
      expect(diagnostic.domainMatches).toBe(true)
      expect(diagnostic.codomainMatches).toBe(true)
      expect(diagnostic.naturality.holds).toBe(true)
      const equality = FinSet.equalMor?.(diagnostic.naturality.expected, diagnostic.naturality.actual)
      expect(equality ?? false).toBe(true)
    }

    expect(result.diagnostics.identities.every((entry) => entry.holds)).toBe(true)
    expect(result.diagnostics.compositions.every((entry) => entry.holds)).toBe(true)

    const exponentialAtBool = result.exponential(bool)
    const direct = FinSet.exponential(parameter, bool)
    expect(exponentialAtBool.obj.elements.length).toBe(direct.obj.elements.length)

    const evaluationComponent = result.evaluation.transformation.component(bool)
    const evaluationEquality = FinSet.equalMor?.(
      evaluationComponent,
      exponentialAtBool.evaluation,
    )
    expect(evaluationEquality ?? false).toBe(true)
  })
})
