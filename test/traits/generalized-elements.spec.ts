import { describe, expect, it } from "vitest"

import { FinPosCat, FinPos, type FinPosObj, type MonoMap } from "../../models/finpos-cat"
import { checkGeneralizedElementSeparation } from "../../traits/generalized-elements"

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
    const order = new Map<string, number>([
      ["0", 0],
      ["1", 1],
      ["2", 2],
    ])
    return (order.get(a) ?? 0) <= (order.get(b) ?? 0)
  },
}

const category = FinPosCat([vee, chain, FinPos.one()])

const collapseXFirst: MonoMap = {
  name: "collapseₓ",
  dom: vee.name,
  cod: chain.name,
  map: (value) => {
    switch (value) {
      case "⊥":
        return "0"
      case "x":
        return "1"
      case "y":
        return "2"
      case "⊤":
        return "2"
      default:
        return value
    }
  },
}

const collapseYFirst: MonoMap = {
  name: "collapseᵧ",
  dom: vee.name,
  cod: chain.name,
  map: (value) => {
    switch (value) {
      case "⊥":
        return "0"
      case "x":
        return "2"
      case "y":
        return "1"
      case "⊤":
        return "2"
      default:
        return value
    }
  },
}

describe("checkGeneralizedElementSeparation", () => {
  it("discovers separating generalized elements from richer shapes", () => {
    const analysis = checkGeneralizedElementSeparation(category, collapseXFirst, collapseYFirst, {
      shapes: [chain.name],
    })

    expect(analysis.holds).toBe(true)
    const witness = analysis.witness
    if (!witness) {
      throw new Error("Expected a separating generalized element witness")
    }

    expect(witness.shape).toBe(chain.name)
    expect(category.eq(witness.left, collapseXFirst)).toBe(true)
    expect(category.eq(witness.right, collapseYFirst)).toBe(true)
    expect(category.eq(witness.leftComposite, witness.rightComposite)).toBe(false)
  })

  it("reports when the initial shape cannot separate non-identical arrows", () => {
    const initialShape = FinPos.zero().name
    const analysis = checkGeneralizedElementSeparation(category, collapseXFirst, collapseYFirst, {
      shapes: [initialShape],
    })

    expect(analysis.holds).toBe(false)
    expect(analysis.failure).toEqual({
      kind: "noSeparator",
      domain: vee.name,
      codomain: chain.name,
      shapes: [initialShape],
    })
  })

  it("records missing generalized elements when a shape cannot map into the domain", () => {
    const chainShape = chain.name
    const initialArrow = FinPos.initialArrow(vee)
    const analysis = checkGeneralizedElementSeparation(category, initialArrow, initialArrow, {
      shapes: [chainShape],
    })

    expect(analysis.holds).toBe(false)
    expect(analysis.failure).toEqual({
      kind: "noElements",
      domain: initialArrow.dom,
      codomain: vee.name,
      shapes: [chainShape],
    })
  })
})
