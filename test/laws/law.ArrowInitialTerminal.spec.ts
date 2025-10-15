import { describe, expect, it } from "vitest"

import { makeArrowCategory } from "../../arrow-category"
import { FinSetCat, type FuncArr } from "../../models/finset-cat"

describe("Set^→ initial and terminal objects", () => {
  const universe = {
    0: [] as const,
    A: ["a"] as const,
    B: ["b₀", "b₁"] as const,
  }

  const category = FinSetCat(universe)
  const registry = category.arrows as FuncArr[]

  const id0 = category.id("0")
  const id1 = category.id(category.one())
  const idA = category.id("A")
  const idB = category.id("B")

  const zeroToA: FuncArr = {
    name: "!₀A",
    dom: "0",
    cod: "A",
    map: () => "a",
  }

  const zeroToB: FuncArr = {
    name: "!₀B",
    dom: "0",
    cod: "B",
    map: () => "b₀",
  }

  const zeroTo1: FuncArr = {
    name: "!₀1",
    dom: "0",
    cod: category.one(),
    map: () => "⋆",
  }

  const to1FromA: FuncArr = {
    name: "!A",
    dom: "A",
    cod: category.one(),
    map: () => "⋆",
  }

  const to1FromB: FuncArr = {
    name: "!B",
    dom: "B",
    cod: category.one(),
    map: () => "⋆",
  }

  const f: FuncArr = {
    name: "f",
    dom: "A",
    cod: "B",
    map: (value) => (value === "a" ? "b₀" : "b₁"),
  }

  registry.push(
    id0,
    id1,
    idA,
    idB,
    zeroToA,
    zeroToB,
    zeroTo1,
    to1FromA,
    to1FromB,
    f,
  )

  const arrowCategory = makeArrowCategory(category)

  const mapToTerminal: Record<string, FuncArr> = {
    0: zeroTo1,
    1: id1,
    A: to1FromA,
    B: to1FromB,
  }

  const mapFromInitial: Record<string, FuncArr> = {
    0: id0,
    1: zeroTo1,
    A: zeroToA,
    B: zeroToB,
  }

  const findObject = (name: string) =>
    arrowCategory.objects.find((arrow) => arrow.name === name) ?? null

  const homSet = (src: FuncArr, dst: FuncArr) =>
    arrowCategory.arrows.filter((square) => square.src === src && square.dst === dst)

  it("designates id₁ as the terminal object", () => {
    const terminal = findObject("id_1")
    if (!terminal) {
      throw new Error("Expected the identity on 1 to appear in the arrow category")
    }

    for (const object of arrowCategory.objects) {
      const arrows = homSet(object, terminal)
      expect(arrows).toHaveLength(1)

      const [unique] = arrows
      if (!unique) throw new Error("Expected a unique mediating square")

      const expectedJ = mapToTerminal[object.dom]
      const expectedK = mapToTerminal[object.cod]
      if (!expectedJ || !expectedK) {
        throw new Error(`Missing canonical map to 1 for ${object.name}`)
      }

      expect(category.eq(unique.j, expectedJ)).toBe(true)
      expect(category.eq(unique.k, expectedK)).toBe(true)
    }
  })

  it("treats id₀ as the initial object", () => {
    const initial = findObject("id_0")
    if (!initial) {
      throw new Error("Expected the identity on 0 to appear in the arrow category")
    }

    for (const target of arrowCategory.objects) {
      const arrows = homSet(initial, target)
      expect(arrows).toHaveLength(1)

      const [unique] = arrows
      if (!unique) throw new Error("Expected a unique mediating square")

      const expectedJ = mapFromInitial[target.dom]
      const expectedK = mapFromInitial[target.cod]
      if (!expectedJ || !expectedK) {
        throw new Error(`Missing canonical map from 0 for ${target.name}`)
      }

      expect(category.eq(unique.j, expectedJ)).toBe(true)
      expect(category.eq(unique.k, expectedK)).toBe(true)
    }
  })
})
