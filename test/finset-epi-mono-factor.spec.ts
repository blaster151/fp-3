import { describe, it, expect } from "vitest"
import { FinSetCat, type FinSetName, type FuncArr } from "../models/finset-cat"
import { epiMonoFactor, epiMonoMiddleIso, type Factor } from "../kinds/epi-mono-factor"
import { isEpi, isMono } from "../kinds/mono-epi"

describe("FinSet epi–mono factorisations", () => {
  const universe = {
    A: ["a1", "a2", "a3"],
    B: ["b1", "b2", "b3", "b4"],
  } as const

  const category = FinSetCat(universe)

  const arrow: FuncArr = {
    name: "f",
    dom: "A",
    cod: "B",
    map: (x) => {
      switch (x) {
        case "a1":
          return "b1"
        case "a2":
          return "b2"
        default:
          return "b2"
      }
    },
  }

  ;(category.arrows as FuncArr[]).push(arrow)

  it("builds the image factorisation for every function", () => {
    const factor = epiMonoFactor(category, arrow)
    expect(factor).not.toBeNull()
    if (!factor) return

    expect(category.eq(category.compose(factor.mono, factor.epi), arrow)).toBe(true)
    expect(isEpi(category, factor.epi)).toBe(true)
    expect(isMono(category, factor.mono)).toBe(true)

    const midCarrier = category.carrier(factor.mid)
    expect(midCarrier).toEqual(["b1", "b2"])

    const secondFactor = epiMonoFactor(category, arrow)
    expect(secondFactor).not.toBeNull()
    if (!secondFactor) return
    expect(secondFactor.mid).toBe(factor.mid)
    expect(category.eq(secondFactor.epi, factor.epi)).toBe(true)
    expect(category.eq(secondFactor.mono, factor.mono)).toBe(true)
  })

  it("produces an isomorphism between different epi–mono middles", () => {
    category.registerObject("AltImage", ["b2", "b1"])
    const altEpi: FuncArr = {
      name: "alt_epi",
      dom: "A",
      cod: "AltImage",
      map: (x) => arrow.map(x),
    }
    const altMono: FuncArr = {
      name: "alt_mono",
      dom: "AltImage",
      cod: "B",
      map: (y) => y,
    }
    ;(category.arrows as FuncArr[]).push(altEpi, altMono)

    const canonical = epiMonoFactor(category, arrow)
    expect(canonical).not.toBeNull()
    if (!canonical) return

    const manual: Factor<FinSetName, FuncArr> = {
      mid: "AltImage",
      epi: altEpi,
      mono: altMono,
    }
    expect(category.eq(category.compose(manual.mono, manual.epi), arrow)).toBe(true)

    const forwardBridge: FuncArr = {
      name: "image_to_alt",
      dom: canonical.mid,
      cod: manual.mid,
      map: (y) => y,
    }
    const backwardBridge: FuncArr = {
      name: "alt_to_image",
      dom: manual.mid,
      cod: canonical.mid,
      map: (y) => y,
    }
    ;(category.arrows as FuncArr[]).push(forwardBridge, backwardBridge)

    const iso = epiMonoMiddleIso(category, canonical, manual)
    expect(iso).not.toBeNull()
    if (!iso) return

    const forward = iso.forward
    const backward = iso.backward
    expect(category.src(forward)).toBe(canonical.mid)
    expect(category.dst(forward)).toBe(manual.mid)
    expect(category.eq(category.compose(forward, canonical.epi), manual.epi)).toBe(true)
    expect(category.eq(category.compose(manual.mono, forward), canonical.mono)).toBe(true)
    expect(category.eq(category.compose(backward, forward), category.id(canonical.mid))).toBe(true)
    expect(category.eq(category.compose(forward, backward), category.id(manual.mid))).toBe(true)
  })
})
