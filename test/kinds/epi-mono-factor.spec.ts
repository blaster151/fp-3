import { describe, it, expect } from "vitest"
import type { FiniteCategory } from "../../finite-cat"
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

  it("returns null when no epi–mono factorisation exists", () => {
    type Obj = "C"
    type Arrow = { readonly name: string; readonly source: Obj; readonly target: Obj }

    const id: Arrow = { name: "id_C", source: "C", target: "C" }
    const i: Arrow = { name: "i", source: "C", target: "C" }

    const arrowsList: Arrow[] = [id, i]

    const compose = (first: Arrow, second: Arrow): Arrow => {
      if (second === id) return first
      if (first === id) return second
      return i
    }

    const eq = (left: Arrow, right: Arrow) => left.name === right.name

    const miniCategory: FiniteCategory<Obj, Arrow> = {
      objects: ["C"],
      arrows: arrowsList,
      id: () => id,
      compose: (first, second) => compose(first, second),
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq,
    }

    expect(isMono(miniCategory, i)).toBe(false)
    expect(isEpi(miniCategory, i)).toBe(false)
    expect(epiMonoFactor(miniCategory, i)).toBeNull()
  })
})
