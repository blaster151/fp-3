import { describe, expect, it } from "vitest"

import {
  RelCat,
  composeRel,
  emptyRelation,
  initialRelation,
  makeRel,
  relEquals,
  terminalRelation,
} from "../../rel"

type FiniteSet<A extends string> = readonly A[]

describe("Rel zero object", () => {
  const empty: FiniteSet<never> = [] as const
  const singleton: FiniteSet<"⋆"> = ["⋆"] as const
  const pair: FiniteSet<"x" | "y"> = ["x", "y"] as const

  const samples: readonly FiniteSet<any>[] = [singleton, pair]

  it("treats the empty set as an initial object", () => {
    for (const target of samples) {
      const canonical = initialRelation(target)
      expect(relEquals(canonical, emptyRelation<never, (typeof target)[number]>())).toBe(true)

      const realised = RelCat.hom(empty, target, [])
      expect(relEquals(canonical, realised)).toBe(true)

      const arbitrary = makeRel<never, (typeof target)[number]>([])
      expect(relEquals(canonical, arbitrary)).toBe(true)
    }
  })

  it("treats the empty set as a terminal object", () => {
    for (const source of samples) {
      const canonical = terminalRelation(source)
      expect(relEquals(canonical, emptyRelation<(typeof source)[number], never>())).toBe(true)

      const realised = RelCat.hom(source, empty, [])
      expect(relEquals(canonical, realised)).toBe(true)

      const arbitrary = makeRel<(typeof source)[number], never>([])
      expect(relEquals(canonical, arbitrary)).toBe(true)
    }
  })

  it("forces composites through the empty relation to vanish", () => {
    const toEmpty = terminalRelation(pair)
    const fromEmpty = initialRelation(singleton)

    const composite = composeRel(toEmpty, fromEmpty)
    expect(relEquals(composite, emptyRelation<(typeof pair)[number], (typeof singleton)[number]>())).toBe(true)
  })
})
