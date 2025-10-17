import { describe, it, expect } from "vitest"
import { FinSetCat, type FuncArr } from "../models/finset-cat"
import type { FiniteCategory } from "../finite-cat"
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
  type ObjName = keyof typeof universe
  const expectObj = (object: unknown): ObjName => {
    if (typeof object === 'string' && object in universe) {
      return object as ObjName
    }
    throw new Error('expected FinSet object name')
  }
  const expectArrow = (arrow: unknown): FuncArr => {
    if (arrow && typeof arrow === 'object' && 'dom' in arrow && 'cod' in arrow && 'map' in arrow) {
      return arrow as FuncArr
    }
    throw new Error('expected FinSet arrow')
  }
  const categoryForOracles: FiniteCategory<unknown, unknown> = {
    objects: category.objects as ReadonlyArray<unknown>,
    arrows: registry as ReadonlyArray<unknown>,
    id: (object) => category.id(expectObj(object)),
    compose: (g, f) => category.compose(expectArrow(g), expectArrow(f)),
    src: (arrow) => category.src(expectArrow(arrow)),
    dst: (arrow) => category.dst(expectArrow(arrow)),
    eq: (left, right) => category.eq(expectArrow(left), expectArrow(right)),
    traits: category.traits,
  }

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
    expect(result.msg).toMatch(/s∘bad/)
    expect(result.msg).toMatch(/id_D/)
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
    expect(LeftInverseImpliesMono.applies({ cat: categoryForOracles, arrow: r })).toBe(true)
    expect(LeftInverseImpliesMono.check({ cat: categoryForOracles, arrow: r })).toBe(true)

    expect(RightInverseImpliesEpi.applies({ cat: categoryForOracles, arrow: s })).toBe(true)
    expect(RightInverseImpliesEpi.check({ cat: categoryForOracles, arrow: s })).toBe(true)

    expect(IsoIsMonoAndEpi.applies({ cat: categoryForOracles, arrow: u })).toBe(true)
    expect(IsoIsMonoAndEpi.check({ cat: categoryForOracles, arrow: u })).toBe(true)

    expect(MonoWithRightInverseIsIso.applies({ cat: categoryForOracles, arrow: u })).toBe(true)
    expect(MonoWithRightInverseIsIso.check({ cat: categoryForOracles, arrow: u })).toBe(true)

    expect(EpiWithLeftInverseIsIso.applies({ cat: categoryForOracles, arrow: v })).toBe(true)
    expect(EpiWithLeftInverseIsIso.check({ cat: categoryForOracles, arrow: v })).toBe(true)
  })
})
