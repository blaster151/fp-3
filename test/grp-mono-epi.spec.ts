import { describe, expect, it } from "vitest"
import { FinGrpCat, FinGrp, type FinGrpObj, type Hom } from "../models/fingroup-cat"
import { isMono, isEpi } from "../kinds/mono-epi"

const Z2: FinGrpObj = {
  name: "Z2",
  elems: ["0", "1"] as const,
  e: "0",
  mul: (a, b) => ((Number(a) + Number(b)) % 2).toString(),
  inv: (a) => a,
}

const Z4: FinGrpObj = {
  name: "Z4",
  elems: ["0", "1", "2", "3"] as const,
  e: "0",
  mul: (a, b) => ((Number(a) + Number(b)) % 4).toString(),
  inv: (a) => ((4 - Number(a)) % 4).toString(),
}

describe("Finite Grp: mono⇔injective, epi⇔surjective", () => {
  const category = FinGrpCat([Z2, Z4])

  const inj: Hom = { name: "i", dom: "Z2", cod: "Z4", map: (a) => ((Number(a) * 2) % 4).toString() }
  const nonInj: Hom = { name: "n", dom: "Z2", cod: "Z4", map: (_a) => "0" }
  const surj: Hom = { name: "s", dom: "Z4", cod: "Z2", map: (a) => (Number(a) % 2).toString() }
  const nonSurj: Hom = { name: "c", dom: "Z4", cod: "Z2", map: (_a) => "0" }
  const idZ4: Hom = { name: "id", dom: "Z4", cod: "Z4", map: (a) => a }

  ;(category.arrows as Hom[]).push(inj, nonInj, surj, nonSurj, idZ4)

  it("hom sanity", () => {
    expect(FinGrp.isHom(Z2, Z4, inj)).toBe(true)
    expect(FinGrp.isHom(Z2, Z4, nonInj)).toBe(true)
    expect(FinGrp.isHom(Z4, Z2, surj)).toBe(true)
    expect(FinGrp.isHom(Z4, Z2, nonSurj)).toBe(true)
    expect(FinGrp.isHom(Z4, Z4, idZ4)).toBe(true)
  })

  it("monomorphisms correspond to injective homomorphisms", () => {
    expect(isMono(category, inj)).toBe(true)
    expect(isMono(category, nonInj)).toBe(false)
    expect(isMono(category, inj)).toBe(FinGrp.injective(Z2, Z4, inj))
    expect(isMono(category, nonInj)).toBe(FinGrp.injective(Z2, Z4, nonInj))
  })

  it("epimorphisms correspond to surjective homomorphisms", () => {
    expect(isEpi(category, surj)).toBe(true)
    expect(isEpi(category, idZ4)).toBe(true)
    expect(isEpi(category, nonSurj)).toBe(false)
    expect(isEpi(category, surj)).toBe(FinGrp.surjective(Z4, Z2, surj))
    expect(isEpi(category, idZ4)).toBe(FinGrp.surjective(Z4, Z4, idZ4))
    expect(isEpi(category, nonSurj)).toBe(FinGrp.surjective(Z4, Z2, nonSurj))
  })
})
