import { describe, it, expect } from "vitest"
import { FinSetCat, type FuncArr } from "../models/finset-cat"
import { forkCommutes, isMonoByForks } from "../kinds/fork"
import { isMono, isEpi } from "../kinds/mono-epi"
import { isMonoByGlobals } from "../traits/global-elements"

describe("fork utilities and functional traits", () => {
  const universe = {
    A: ["a1", "a2"],
    B: ["b1", "b2"],
  } as const
  const C = FinSetCat(universe)

  const inj: FuncArr = { name: "inj", dom: "A", cod: "B", map: (x) => (x === "a1" ? "b1" : "b2") }
  const nonInj: FuncArr = { name: "collapse", dom: "A", cod: "B", map: () => "b1" }
  const surj: FuncArr = { name: "surj", dom: "B", cod: "A", map: (y) => (y === "b2" ? "a2" : "a1") }
  const nonSurj: FuncArr = { name: "const", dom: "B", cod: "A", map: () => "a1" }

  const [eta1, eta2] = C.globals("A")
  ;(C.arrows as FuncArr[]).push(inj, nonInj, surj, nonSurj, eta1, eta2)

  it("detects commuting forks witnessing non-monic arrows", () => {
    expect(forkCommutes(C, nonInj, eta1, eta2)).toBe(true)
    expect(isMonoByForks(C, nonInj)).toBe(false)
  })

  it("agrees with cancellability and fast-path diagnostics", () => {
    expect(isMono(C, inj)).toBe(true)
    expect(isMono(C, nonInj)).toBe(false)
    expect(isMonoByForks(C, inj)).toBe(true)
    expect(isMonoByGlobals(C, inj)).toBe(true)
    expect(isMonoByGlobals(C, nonInj)).toBe(false)
  })

  it("uses functional traits to accelerate epi checks", () => {
    expect(isEpi(C, surj)).toBe(true)
    expect(isEpi(C, nonSurj)).toBe(false)
  })
})
