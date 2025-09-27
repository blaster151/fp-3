import { describe, expect, it } from "vitest"
import { FinPosCat, FinPos, type MonoMap } from "../models/finpos-cat"
import { isMono, isEpi } from "../kinds/mono-epi"

describe("Finite Pos: mono⇔injective, epi⇔surjective", () => {
  const A = {
    name: "A",
    elems: ["a1", "a2"] as const,
    leq: (x: string, y: string) => x === y || x === "a1",
  }
  const B = {
    name: "B",
    elems: ["b1", "b2", "b3"] as const,
    leq: (x: string, y: string) => x === y || x === "b1",
  }
  const category = FinPosCat([A, B, FinPos.one()])

  const inj: MonoMap = { name: "i", dom: "A", cod: "B", map: (x) => (x === "a1" ? "b1" : "b2") }
  const nonInj: MonoMap = { name: "n", dom: "A", cod: "B", map: (_x: string) => "b1" }
  const surj: MonoMap = {
    name: "s",
    dom: "B",
    cod: "A",
    map: (y) => (y === "b3" ? "a2" : "a1"),
  }
  const nonSurj: MonoMap = { name: "t", dom: "B", cod: "A", map: (_x: string) => "a1" }

  ;(category.arrows as MonoMap[]).push(inj, nonInj, surj, nonSurj)

  it("monotone sanity", () => {
    expect(FinPos.isMonotone(A, B, inj)).toBe(true)
    expect(FinPos.isMonotone(A, B, nonInj)).toBe(true)
    expect(FinPos.isMonotone(B, A, surj)).toBe(true)
    expect(FinPos.isMonotone(B, A, nonSurj)).toBe(true)
  })

  it("monos correspond to injective monotone maps", () => {
    expect(isMono(category, inj)).toBe(true)
    expect(isMono(category, nonInj)).toBe(false)
    expect(isMono(category, inj)).toBe(FinPos.injective(A, B, inj))
    expect(isMono(category, nonInj)).toBe(FinPos.injective(A, B, nonInj))
  })

  it("epis correspond to surjective monotone maps", () => {
    expect(isEpi(category, surj)).toBe(true)
    expect(isEpi(category, nonSurj)).toBe(false)
    expect(isEpi(category, surj)).toBe(FinPos.surjective(B, A, surj))
    expect(isEpi(category, nonSurj)).toBe(FinPos.surjective(B, A, nonSurj))
  })
})
