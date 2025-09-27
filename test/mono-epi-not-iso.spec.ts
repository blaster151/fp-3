import { describe, expect, it } from "vitest"
import { isEpi, isMono } from "../kinds/mono-epi"
import { isIso } from "../kinds/iso"
import { leftInverses } from "../kinds/inverses"
import { TwoObjectCategory, nonIdentity } from "../two-object-cat"
import { FinSetCat, type FuncArr } from "../models/finset-cat"
import { FinGrpCat, type Hom } from "../models/fingroup-cat"

describe("Mono + epi need not imply iso", () => {
  const f = nonIdentity

  it("has cancellable but non-invertible arrow in the two-object category", () => {
    expect(isMono(TwoObjectCategory, f)).toBe(true)
    expect(isEpi(TwoObjectCategory, f)).toBe(true)
    expect(isIso(TwoObjectCategory, f)).toBe(false)
  })

  it("still validates iso ⇒ mono & epi in FinSet", () => {
    const universe = { A: ["a1", "a2"], B: ["b1", "b2"] } as const
    const category = FinSetCat(universe)
    const iso: FuncArr = {
      name: "iso",
      dom: "A",
      cod: "B",
      map: (value) => (value === "a1" ? "b1" : "b2"),
    }
    ;(category.arrows as FuncArr[]).push(iso)
    expect(isIso(category, iso)).toBe(true)
    expect(isMono(category, iso)).toBe(true)
    expect(isEpi(category, iso)).toBe(true)
  })
})

describe("Grp counterexample: injective hom without a splitting", () => {
  const Z2 = {
    name: "Z2",
    elems: ["0", "1"] as const,
    e: "0",
    mul: (a: string, b: string) => ((Number(a) + Number(b)) % 2).toString(),
    inv: (a: string) => a,
  }

  const Z4 = {
    name: "Z4",
    elems: ["0", "1", "2", "3"] as const,
    e: "0",
    mul: (a: string, b: string) => ((Number(a) + Number(b)) % 4).toString(),
    inv: (a: string) => ((4 - Number(a)) % 4).toString(),
  }

  const category = FinGrpCat([Z2, Z4])

  const inclusion: Hom = {
    name: "i",
    dom: "Z2",
    cod: "Z4",
    map: (value) => (value === "0" ? "0" : "2"),
  }

  ;(category.arrows as Hom[]).push(inclusion)

  it("is a monomorphism", () => {
    expect(isMono(category, inclusion)).toBe(true)
  })

  it("admits no retraction", () => {
    expect(leftInverses(category, inclusion)).toHaveLength(0)
  })
})
