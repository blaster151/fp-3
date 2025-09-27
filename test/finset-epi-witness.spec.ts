import { describe, expect, it } from "vitest"
import { FinSetCat, type FuncArr, isSurjective } from "../models/finset-cat"
import { isEpi } from "../kinds/mono-epi"
import { nonEpiWitnessInSet } from "../kinds/epi-witness-set"

describe("Finite Set epi diagnostics", () => {
  it("builds an explicit witness for non-surjective arrows", () => {
    const baseUniverse = {
      C: ["c1", "c2"] as const,
      D: ["d1", "d2", "d3"] as const,
    }

    const nonSurj: FuncArr = {
      name: "f",
      dom: "C",
      cod: "D",
      map: (x) => (x === "c1" ? "d1" : "d2"),
    }

    expect(isSurjective(baseUniverse, nonSurj)).toBe(false)

    const witness = nonEpiWitnessInSet(baseUniverse, nonSurj)
    expect(witness).not.toBeNull()

    const { codomain, g, h, missingElement } = witness!
    const extendedUniverse: Record<string, readonly string[]> = {
      ...baseUniverse,
      [codomain.name]: codomain.elems,
    }
    const category = FinSetCat(extendedUniverse)
    ;(category.arrows as FuncArr[]).push(nonSurj, g, h)

    const gf = category.compose(g, nonSurj)
    const hf = category.compose(h, nonSurj)
    expect(category.eq(gf, hf)).toBe(true)
    expect(category.eq(g, h)).toBe(false)
    expect(isEpi(category, nonSurj)).toBe(false)
    expect(missingElement).toBe("d3")
    expect(h.map(missingElement)).toBe("1")
  })

  it("returns null for surjective arrows", () => {
    const universe = {
      C3: ["c1", "c2", "c3"] as const,
      D: ["d1", "d2", "d3"] as const,
    }

    const surj: FuncArr = {
      name: "σ",
      dom: "C3",
      cod: "D",
      map: (x) => (x === "c1" ? "d1" : x === "c2" ? "d2" : "d3"),
    }

    expect(isSurjective(universe, surj)).toBe(true)
    expect(nonEpiWitnessInSet(universe, surj)).toBeNull()

    const category = FinSetCat(universe)
    ;(category.arrows as FuncArr[]).push(surj)
    expect(isEpi(category, surj)).toBe(true)
  })
})
