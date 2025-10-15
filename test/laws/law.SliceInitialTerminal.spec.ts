import { describe, expect, it } from "vitest"

import { makeSlice } from "../../slice-cat"
import { FinSetCat, type FuncArr } from "../../models/finset-cat"

describe("Set/X slice initial and terminal objects", () => {
  const universe = {
    0: [] as const,
    A: ["a"] as const,
    B: ["b₀", "b₁"] as const,
    X: ["x₀", "x₁"] as const,
  }

  const category = FinSetCat(universe)
  const registry = category.arrows as FuncArr[]

  const id0 = category.id("0")
  const idX = category.id("X")

  const zeroToX: FuncArr = {
    name: "!₀X",
    dom: "0",
    cod: "X",
    map: () => "x₀",
  }

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

  const f: FuncArr = {
    name: "f",
    dom: "A",
    cod: "X",
    map: () => "x₀",
  }

  const g: FuncArr = {
    name: "g",
    dom: "B",
    cod: "X",
    map: (value) => (value === "b₀" ? "x₀" : "x₁"),
  }

  registry.push(id0, idX, zeroToX, zeroToA, zeroToB, f, g)

  const slice = makeSlice(category, "X")

  const initial = slice.objects.find((object) => object.domain === "0") ?? null
  const terminal = slice.objects.find((object) => object.domain === "X") ?? null

  const homSet = (src: (typeof slice.objects)[number], dst: (typeof slice.objects)[number]) =>
    slice.arrows.filter((arrow) => arrow.src === src && arrow.dst === dst)

  const canonicalFromInitial: Record<string, FuncArr> = {
    0: id0,
    A: zeroToA,
    B: zeroToB,
    X: zeroToX,
  }

  it("treats (∅ → X) as the initial object", () => {
    if (!initial) {
      throw new Error("Expected the empty-set leg to appear in the slice")
    }

    for (const target of slice.objects) {
      const arrows = homSet(initial, target)
      expect(arrows).toHaveLength(1)

      const [unique] = arrows
      if (!unique) throw new Error("Expected a unique mediating morphism")

      const expected = canonicalFromInitial[target.domain]
      if (!expected) {
        throw new Error(`Missing canonical map from ∅ to ${target.domain}`)
      }

      expect(category.eq(unique.mediating, expected)).toBe(true)
    }
  })

  it("designates (X → X) as the terminal object", () => {
    if (!terminal) {
      throw new Error("Expected the identity on X to appear in the slice")
    }

    for (const source of slice.objects) {
      const arrows = homSet(source, terminal)
      expect(arrows).toHaveLength(1)

      const [unique] = arrows
      if (!unique) throw new Error("Expected a unique mediating morphism")

      expect(category.eq(unique.mediating, source.arrowToAnchor)).toBe(true)
    }
  })
})
