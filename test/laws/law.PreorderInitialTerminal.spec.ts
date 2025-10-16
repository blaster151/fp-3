import { describe, expect, it } from "vitest"

import { analyzeGreatestElement, analyzeLeastElement } from "../../preord-cat"
import type { Preorder } from "../../preorder-cat"

describe("Preorder initial and terminal behaviour", () => {
  const naturals: Preorder<number> = {
    elems: [0, 1, 2, 3, 4, 5],
    le: (a, b) => a <= b,
  }

  it("recognises 0 as the least element of ℕ", () => {
    const analysis = analyzeLeastElement(naturals, 0)
    expect(analysis.holds).toBe(true)
  })

  it("exhibits arbitrarily large witnesses showing ℕ has no terminal object", () => {
    naturals.elems.forEach((candidate, index) => {
      const report = analyzeGreatestElement(naturals, candidate, [...naturals.elems, candidate + 1])
      expect(report.holds).toBe(false)
      expect(report.failure?.kind).toBe("violatesUpperBound")
      if (report.failure?.kind !== "violatesUpperBound") {
        throw new Error("Expected an upper-bound violation witness")
      }
      expect(report.failure.witness).toBe(naturals.elems[index]! + 1)
    })
  })

  const integers: Preorder<number> = {
    elems: [-2, -1, 0, 1, 2],
    le: (a, b) => a <= b,
  }

  it("confirms ℤ lacks both least and greatest elements on sampled witnesses", () => {
    for (const candidate of integers.elems) {
      const belowReport = analyzeLeastElement(integers, candidate, [...integers.elems, candidate - 1])
      expect(belowReport.holds).toBe(false)
      expect(belowReport.failure?.kind).toBe("violatesLowerBound")

      const aboveReport = analyzeGreatestElement(integers, candidate, [...integers.elems, candidate + 1])
      expect(aboveReport.holds).toBe(false)
      expect(aboveReport.failure?.kind).toBe("violatesUpperBound")
    }
  })
})
