import { describe, expect, it } from "vitest"

import { FinPosCat, FinPos, type FinPosObj, type MonoMap } from "../../models/finpos-cat"
import { checkGeneralizedElementSeparation } from "../../traits/generalized-elements"

type Element = "⊥" | "x" | "y" | "⊤"

type ChainElement = "0" | "1" | "2"

const vee: FinPosObj = {
  name: "Vee",
  elems: ["⊥", "x", "y", "⊤"],
  leq: (a, b) =>
    (a === "⊥" && (b === "⊥" || b === "x" || b === "y" || b === "⊤")) ||
    (a === "x" && (b === "x" || b === "⊤")) ||
    (a === "y" && (b === "y" || b === "⊤")) ||
    a === b,
}

const chain: FinPosObj = {
  name: "Chain₃",
  elems: ["0", "1", "2"],
  leq: (a, b) => {
    const ranks: Record<ChainElement, number> = { "0": 0, "1": 1, "2": 2 }
    return (ranks[a as ChainElement] ?? 0) <= (ranks[b as ChainElement] ?? 0)
  },
}

const discrete: FinPosObj = {
  name: "Disc₂",
  elems: ["L", "R"],
  leq: (a, b) => a === b,
}

const category = FinPosCat([vee, chain, discrete, FinPos.one()])

const left: MonoMap = {
  name: "collapseₗ",
  dom: vee.name,
  cod: chain.name,
  map: (value) => {
    switch (value as Element) {
      case "⊥":
        return "0"
      case "x":
        return "1"
      case "y":
        return "1"
      case "⊤":
        return "2"
      default:
        return "0"
    }
  },
}

const right: MonoMap = {
  name: "collapseᵣ",
  dom: vee.name,
  cod: chain.name,
  map: (value) => {
    switch (value as Element) {
      case "⊥":
        return "0"
      case "x":
        return "1"
      case "y":
        return "2"
      case "⊤":
        return "2"
      default:
        return "0"
    }
  },
}

describe("Theorem 32: generalized elements separate parallel arrows", () => {
  it("finds witnesses when shapes provide enough probes", () => {
    const shapes = [FinPos.one().name, chain.name, discrete.name]
    const analysis = checkGeneralizedElementSeparation(category, left, right, { shapes })

    expect(analysis.holds).toBe(true)
    const witness = analysis.witness
    if (!witness) {
      throw new Error("Expected separating generalized element witness")
    }
    expect(category.eq(witness.leftComposite, witness.rightComposite)).toBe(false)
  })

  it("certifies equality when every generalized element yields matching composites", () => {
    const shapes = [FinPos.one().name, chain.name, discrete.name]
    const analysis = checkGeneralizedElementSeparation(category, left, left, { shapes })

    expect(analysis.holds).toBe(false)
    expect(analysis.failure).toEqual({ kind: "indistinguishable", domain: vee.name, codomain: chain.name })
    expect(category.eq(left, left)).toBe(true)
  })
})
