import { describe, expect, it } from "vitest"

import { FinGrp, FinGrpCat, type FinGrpObj, type Hom } from "../../models/fingroup-cat"

type Element = string

describe("Finite groups zero object", () => {
  const makeCyclicGroup = (name: string, order: number): FinGrpObj => {
    const elems = Array.from({ length: order }, (_, index) => `${index}`)
    const encode = (value: number): Element => `${((value % order) + order) % order}`
    const decode = (value: Element): number => Number.parseInt(value, 10)
    return {
      name,
      elems,
      mul: (a, b) => encode(decode(a) + decode(b)),
      e: "0",
      inv: (a) => encode(-decode(a)),
    }
  }

  const Z2 = makeCyclicGroup("ℤ₂", 2)
  const Z4 = makeCyclicGroup("ℤ₄", 4)
  const samples = [Z2, Z4]

  const trivial = FinGrp.trivial()
  const category = FinGrpCat(samples)

  const compare = (f: Hom, g: Hom) => category.eq(f, g)

  it("registers the trivial group alongside supplied samples", () => {
    expect(category.objects).toContain(trivial.name)
  })

  it("treats the trivial group as an initial object", () => {
    for (const group of samples) {
      const canonical = FinGrp.initialArrow(group)
      expect(FinGrp.isHom(trivial, group, canonical)).toBe(true)

      const arbitrary: Hom = {
        name: `ι_${group.name}`,
        dom: trivial.name,
        cod: group.name,
        map: () => group.e,
      }

      expect(FinGrp.isHom(trivial, group, arbitrary)).toBe(true)
      expect(compare(canonical, arbitrary)).toBe(true)

      const invalid: Hom = {
        name: `ω_${group.name}`,
        dom: trivial.name,
        cod: group.name,
        map: () => group.mul(group.e, group.elems[1] ?? group.e),
      }

      expect(FinGrp.isHom(trivial, group, invalid)).toBe(false)
    }
  })

  it("treats the trivial group as a terminal object", () => {
    for (const group of samples) {
      const canonical = FinGrp.terminate(group)
      expect(FinGrp.isHom(group, trivial, canonical)).toBe(true)

      const arbitrary: Hom = {
        name: `!^{${group.name}}`,
        dom: group.name,
        cod: trivial.name,
        map: () => trivial.e,
      }

      expect(FinGrp.isHom(group, trivial, arbitrary)).toBe(true)
      expect(compare(canonical, arbitrary)).toBe(true)

      const invalid: Hom = {
        name: `σ_${group.name}`,
        dom: group.name,
        cod: trivial.name,
        map: (value) => value,
      }

      expect(FinGrp.isHom(group, trivial, invalid)).toBe(false)
    }
  })
})
