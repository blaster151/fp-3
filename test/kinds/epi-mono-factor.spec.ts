import { describe, it, expect } from "vitest"
import { makeToyCategory, arrows } from "./toy-category"
import { epiMonoFactor } from "../../kinds/epi-mono-factor"
import { isMono, isEpi } from "../../kinds/mono-epi"

describe("kinds/epi-mono-factor", () => {
  const category = makeToyCategory()

  it("produces an epi-mono factorisation for f", () => {
    const factor = epiMonoFactor(category, arrows.f)
    expect(factor).not.toBeNull()
    expect(isEpi(category, factor!.epi)).toBe(true)
    expect(isMono(category, factor!.mono)).toBe(true)
    expect(category.eq(category.compose(factor!.mono, factor!.epi), arrows.f)).toBe(true)
  })
})
