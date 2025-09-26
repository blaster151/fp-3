import { describe, it, expect } from "vitest"
import { makeToyCategory, arrows } from "./toy-category"
import { isMono, isEpi } from "../../kinds/mono-epi"

describe("kinds/mono-epi", () => {
  const category = makeToyCategory()

  it("treats identities as mono and epi", () => {
    expect(isMono(category, arrows.idA)).toBe(true)
    expect(isMono(category, arrows.idB)).toBe(true)
    expect(isEpi(category, arrows.idA)).toBe(true)
    expect(isEpi(category, arrows.idB)).toBe(true)
  })

  it("detects that f: A→B is both mono and epi in the toy category", () => {
    expect(isMono(category, arrows.f)).toBe(true)
    expect(isEpi(category, arrows.f)).toBe(true)
  })

  it("recognises that g: B→A is both mono and epi in the toy category", () => {
    expect(isMono(category, arrows.g)).toBe(true)
    expect(isEpi(category, arrows.g)).toBe(true)
  })
})
