import { describe, expect, it } from "vitest"
import { makeToyCategory, arrows } from "./toy-category"
import {
  composeEpisAreEpi,
  composeMonosAreMono,
  identityIsEpi,
  identityIsMono,
  leftFactorOfEpi,
  rightFactorOfMono,
  saturateMonoEpi,
} from "../../kinds/mono-epi-laws"

describe("Mono/Epi inference laws", () => {
  const category = makeToyCategory()

  it("treats identities as mono and epi", () => {
    for (const object of category.objects) {
      expect(identityIsMono(category, object)).toBe(true)
      expect(identityIsEpi(category, object)).toBe(true)
    }
  })

  it("preserves monos and epis under composition", () => {
    expect(composeMonosAreMono(category, arrows.g, arrows.f)).toBe(true)
    expect(composeEpisAreEpi(category, arrows.g, arrows.f)).toBe(true)
  })

  it("inherits mono/epi properties from composites", () => {
    expect(rightFactorOfMono(category, arrows.g, arrows.f)).toBe(true)
    expect(leftFactorOfEpi(category, arrows.g, arrows.f)).toBe(true)
  })

  it("saturates mono/epi facts across the category", () => {
    const closure = saturateMonoEpi(category)
    expect(closure.idMonos.size).toBe(category.objects.length)
    expect(closure.idEpis.size).toBe(category.objects.length)
    expect(closure.monos.has(arrows.f)).toBe(true)
    expect(closure.monos.has(arrows.g)).toBe(true)
    expect(closure.epis.has(arrows.f)).toBe(true)
    expect(closure.epis.has(arrows.g)).toBe(true)
  })
})
