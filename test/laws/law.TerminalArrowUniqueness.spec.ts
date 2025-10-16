import { describe, expect, it } from "vitest"

import {
  FinPos,
  FinPosCat,
  type FinPosObj,
  type MonoMap,
  type TerminalArrowAnalysis,
} from "../../models/finpos-cat"

const chain: FinPosObj = {
  name: "C₂",
  elems: ["⊥", "⊤"],
  leq: (a, b) => a === b || a === "⊥",
}

describe("Theorem 29: terminal arrows collapse uniquely", () => {
  const category = FinPosCat([chain])
  const source = category.lookup(chain.name)
  const terminal = FinPos.one()

  it("recovers the canonical collapse as a witness", () => {
    const altCollapse: MonoMap = {
      name: "φ",
      dom: source.name,
      cod: terminal.name,
      map: () => terminal.elems[0]!,
    }

    const analysis = FinPos.checkTerminalArrowUniqueness(source, altCollapse, terminal)

    expect(analysis.holds).toBe(true)
    expect(analysis.witness).toBeDefined()
    const witness = analysis.witness as MonoMap
    for (const element of source.elems) {
      expect(witness.map(element)).toBe(terminal.elems[0])
    }
    expect(analysis.details).toContain("unique terminal map")
  })

  it("flags codomain mismatches before claiming uniqueness", () => {
    const badArrow: MonoMap = {
      name: "ψ",
      dom: source.name,
      cod: source.name,
      map: (value) => value,
    }

    const analysis: TerminalArrowAnalysis = FinPos.checkTerminalArrowUniqueness(
      source,
      badArrow,
      terminal,
    )

    expect(analysis.holds).toBe(false)
    expect(analysis.failure).toEqual({
      kind: "codomainMismatch",
      expected: terminal.name,
      received: source.name,
    })
    expect(analysis.details).toContain("does not target")
  })
})

