import { describe, expect, it } from "vitest"

import { FinPosCat, FinPos, type FinPosObj, type MonoMap } from "../../models/finpos-cat"

type Relation = ReadonlyArray<[string, string]>

const relation = (pairs: Relation): ((a: string, b: string) => boolean) => {
  const lookup = new Set(pairs.map(([a, b]) => `${a}≤${b}`))
  return (a, b) => lookup.has(`${a}≤${b}`)
}

describe("Finite posets initial and terminal objects", () => {
  const discrete: FinPosObj = {
    name: "Disc₂",
    elems: ["a", "b"],
    leq: (x, y) => x === y,
  }

  const chainElems = ["0", "1", "2"] as const
  const chainOrder: Map<string, number> = new Map<string, number>(
    chainElems.map((value, index) => [value, index] as const),
  )
  const chain: FinPosObj = {
    name: "Chain₃",
    elems: chainElems.slice(),
    leq: (a, b) => (chainOrder.get(a) ?? 0) <= (chainOrder.get(b) ?? 0),
  }

  const vee: FinPosObj = {
    name: "Vee",
    elems: ["⊥", "x", "y", "⊤"],
    leq: relation([
      ["⊥", "⊥"],
      ["⊥", "x"],
      ["⊥", "y"],
      ["⊥", "⊤"],
      ["x", "x"],
      ["x", "⊤"],
      ["y", "y"],
      ["y", "⊤"],
      ["⊤", "⊤"],
    ]),
  }

  const samples: FinPosObj[] = [discrete, chain, vee]
  const initial = FinPos.zero()
  const terminal = FinPos.one()
  const category = FinPosCat([...samples, initial, terminal])

  const compare = (f: MonoMap, g: MonoMap) => category.eq(f, g)

  it("treats the empty poset as an initial object", () => {
    for (const poset of samples) {
      const canonical = FinPos.initialArrow(poset)
      expect(FinPos.isMonotone(initial, poset, canonical)).toBe(true)

      const arbitrary: MonoMap = {
        name: `κ_${poset.name}`,
        dom: initial.name,
        cod: poset.name,
        map: () => poset.elems[0] ?? poset.name,
      }

      expect(FinPos.isMonotone(initial, poset, arbitrary)).toBe(true)
      expect(compare(canonical, arbitrary)).toBe(true)
    }
  })

  it("records the unique map into the terminal singleton", () => {
    for (const poset of samples) {
      const canonical = FinPos.terminate(poset)
      expect(FinPos.isMonotone(poset, terminal, canonical)).toBe(true)

      const constant: MonoMap = {
        name: `!_${poset.name}→1`,
        dom: poset.name,
        cod: terminal.name,
        map: () => "⋆",
      }

      expect(FinPos.isMonotone(poset, terminal, constant)).toBe(true)
      expect(compare(canonical, constant)).toBe(true)
    }
  })

  it("enumerates the singleton's unique global element", () => {
    const globals = category.globals(category.one())
    expect(globals).toHaveLength(1)

    const [unique] = globals
    if (!unique) {
      throw new Error("Expected the singleton to contribute one global element")
    }

    expect(compare(unique, category.id(category.one()))).toBe(true)
  })
})
