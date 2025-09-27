import { describe, it, expect } from "vitest"
import { FinSetCat, type FuncArr } from "../models/finset-cat"
import { buildLeftInverseForInjective, buildRightInverseForSurjective } from "../models/finset-inverses"
import { checkInverseEquation } from "../diagnostics"
import {
  IsoIsMonoAndEpi,
  LeftInverseImpliesMono,
  RightInverseImpliesEpi,
  MonoWithRightInverseIsIso,
  EpiWithLeftInverseIsIso,
} from "../oracles/inverses-oracles"

describe("Inverse diagnostics and oracle implications", () => {
  const universe = {
    C: ["c1", "c2", "c3"],
    D: ["d1", "d2"],
    A: ["a"],
    B: ["b"],
  } as const

  const category = FinSetCat(universe)
  const registry = category.arrows as FuncArr[]

  const s: FuncArr = {
    name: "s",
    dom: "C",
    cod: "D",
    map: (x) => (x === "c1" ? "d1" : "d2"),
  }
  const r: FuncArr = {
    name: "r",
    dom: "D",
    cod: "C",
    map: (d) => (d === "d1" ? "c1" : "c2"),
  }
  const u: FuncArr = {
    name: "u",
    dom: "A",
    cod: "B",
    map: () => "b",
  }
  const v: FuncArr = {
    name: "v",
    dom: "B",
    cod: "A",
    map: () => "a",
  }

  registry.push(s, r, u, v)

  it("reports counterexamples when inverse equations fail", () => {
    const bad: FuncArr = { name: "bad", dom: "D", cod: "C", map: () => "c1" }
    const result = checkInverseEquation(category, s, bad, "right")
    expect(result.ok).toBe(false)
    expect(result.msg).toMatch(/≠/)
    expect(result.msg).toMatch(/d1/)
  })

  it("constructs inverses for injective and surjective maps", () => {
    const left = buildLeftInverseForInjective(category, r)
    expect(left).not.toBeNull()
    const right = buildRightInverseForSurjective(category, s)
    expect(right).not.toBeNull()

    for (const d of universe.D) {
      expect(left!.map(r.map(d))).toBe(d)
      expect(s.map(right!.map(d))).toBe(d)
    }
  })

  it("oracles detect the expected cancellability properties", () => {
    expect(LeftInverseImpliesMono.applies({ cat: category, arrow: r })).toBe(true)
    expect(LeftInverseImpliesMono.check({ cat: category, arrow: r })).toBe(true)

    expect(RightInverseImpliesEpi.applies({ cat: category, arrow: s })).toBe(true)
    expect(RightInverseImpliesEpi.check({ cat: category, arrow: s })).toBe(true)

    expect(IsoIsMonoAndEpi.applies({ cat: category, arrow: u })).toBe(true)
    expect(IsoIsMonoAndEpi.check({ cat: category, arrow: u })).toBe(true)

    expect(MonoWithRightInverseIsIso.applies({ cat: category, arrow: u })).toBe(true)
    expect(MonoWithRightInverseIsIso.check({ cat: category, arrow: u })).toBe(true)

    expect(EpiWithLeftInverseIsIso.applies({ cat: category, arrow: v })).toBe(true)
    expect(EpiWithLeftInverseIsIso.check({ cat: category, arrow: v })).toBe(true)
  })
})
