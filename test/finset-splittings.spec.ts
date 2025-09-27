import { describe, expect, it } from "vitest"
import { FinSetCat, type FuncArr } from "../models/finset-cat"
import { splitEpiWitness, splitIdempotent, splitMonoWitness } from "../models/finset-splittings"
import { isIdempotent, projectorFromSection } from "../kinds/idempotent"

describe("FinSet split witnesses and idempotents", () => {
  const universe = {
    C: ["c1", "c2"],
    D: ["d1", "d2", "d3"],
    E: ["e1", "e2"],
    Empty: [] as const,
  }

  const category = FinSetCat(universe)

  const injective: FuncArr = {
    name: "inj",
    dom: "C",
    cod: "D",
    map: (value) => (value === "c1" ? "d1" : "d2"),
  }

  const surjective: FuncArr = {
    name: "surj",
    dom: "D",
    cod: "E",
    map: (value) => (value === "d3" ? "e2" : "e1"),
  }

  const emptyMono: FuncArr = {
    name: "empty",
    dom: "Empty",
    cod: "D",
    map: () => "d1",
  }

  ;(category.arrows as FuncArr[]).push(injective, surjective, emptyMono)

  it("provides a canonical section for every non-empty injective map", () => {
    const section = splitMonoWitness(category, injective)
    const composite = category.compose(section, injective)
    expect(category.eq(composite, category.id("C"))).toBe(true)
  })

  it("provides a canonical retraction for every surjective map", () => {
    const retraction = splitEpiWitness(category, surjective)
    const composite = category.compose(surjective, retraction)
    expect(category.eq(composite, category.id("E"))).toBe(true)
  })

  it("refuses to split an empty-domain mono", () => {
    expect(() => splitMonoWitness(category, emptyMono)).toThrow()
  })

  it("builds an idempotent from a section/retraction pair", () => {
    const retraction = splitMonoWitness(category, injective)
    const projector = projectorFromSection(category, injective, retraction)
    expect(isIdempotent(category, projector)).toBe(true)
  })

  it("splits an idempotent onto its fixed points", () => {
    const retraction = splitMonoWitness(category, injective)
    const projector = projectorFromSection(category, injective, retraction)
    const { object, retraction: r, section } = splitIdempotent(category, projector)
    expect(category.eq(category.compose(r, section), category.id(object))).toBe(true)
    expect(category.eq(category.compose(section, r), projector)).toBe(true)
    expect(category.carrier(object)).toEqual(["d1", "d2"])
  })
})
