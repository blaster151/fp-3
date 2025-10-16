import { describe, expect, it } from "vitest"

import {
  FinPos,
  type FinPosObj,
  type MonoMap,
  type PointSeparationAnalysis,
} from "../../models/finpos-cat"

const chain: FinPosObj = {
  name: "C₂",
  elems: ["⊥", "⊤"],
  leq: (a, b) => a === b || a === "⊥",
}

describe("Terminal points separate parallel arrows", () => {
  const codomain = chain

  it("produces a point witness that distinguishes monotone maps", () => {
    const identity: MonoMap = {
      name: "id",
      dom: chain.name,
      cod: codomain.name,
      map: (value) => value,
    }

    const constantBottom: MonoMap = {
      name: "const_⊥",
      dom: chain.name,
      cod: codomain.name,
      map: () => "⊥",
    }

    const analysis = FinPos.checkPointSeparation(chain, identity, constantBottom, codomain)

    expect(analysis.holds).toBe(true)
    expect(analysis.witness).toBeDefined()

    const witness = analysis.witness!
    expect(witness.element).toBe("⊤")
    expect(witness.leftValue).toBe("⊤")
    expect(witness.rightValue).toBe("⊥")

    const point = witness.point
    expect(point.dom).toBe(FinPos.one().name)
    expect(point.cod).toBe(chain.name)
    const terminalPoint = FinPos.one().elems[0]!
    expect(point.map(terminalPoint)).toBe("⊤")
  })

  it("signals when parallel arrows are indistinguishable by points", () => {
    const collapse: MonoMap = {
      name: "collapse",
      dom: chain.name,
      cod: codomain.name,
      map: () => "⊥",
    }

    const analysis: PointSeparationAnalysis = FinPos.checkPointSeparation(
      chain,
      collapse,
      collapse,
      codomain,
    )

    expect(analysis.holds).toBe(false)
    expect(analysis.failure).toEqual({ kind: "indistinguishable" })
    expect(analysis.details).toContain("coincide on every point element")
  })
})
