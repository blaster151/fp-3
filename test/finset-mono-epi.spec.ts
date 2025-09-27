import { describe, expect, it } from "vitest"
import { FinSetCat, isInjective, isSurjective, type FuncArr } from "../models/finset-cat"
import { isMono, isEpi } from "../kinds/mono-epi"

describe("FinSet model matches mono/epi cancellability", () => {
  const universe = {
    A: ["a1", "a2"],
    B: ["b1", "b2", "b3"],
  } as const

  const category = FinSetCat(universe)

  const inj: FuncArr = { name: "i", dom: "A", cod: "B", map: (x) => (x === "a1" ? "b1" : "b2") }
  const nonInj: FuncArr = { name: "n", dom: "A", cod: "B", map: () => "b1" }
  const surj: FuncArr = {
    name: "s",
    dom: "B",
    cod: "A",
    map: (y) => (y === "b3" ? "a2" : "a1"),
  }
  const nonSurj: FuncArr = { name: "t", dom: "B", cod: "A", map: () => "a1" }

  ;(category.arrows as FuncArr[]).push(inj, nonInj, surj, nonSurj)

  it("exposes functional traits and global elements", () => {
    expect(category.traits?.functionalArrows).toBe(true)
    expect(category.one()).toBe("1")
    expect(category.globals("A")).toHaveLength(universe.A.length)
  })

  it("monomorphisms correspond to injective functions", () => {
    expect(isMono(category, inj)).toBe(isInjective(universe, inj))
    expect(isMono(category, nonInj)).toBe(isInjective(universe, nonInj))
  })

  it("epimorphisms correspond to surjective functions", () => {
    expect(isEpi(category, surj)).toBe(isSurjective(universe, surj))
    expect(isEpi(category, nonSurj)).toBe(isSurjective(universe, nonSurj))
  })
})
