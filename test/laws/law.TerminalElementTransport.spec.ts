import { describe, expect, it } from "vitest"

import {
  FinPos,
  type FinPosObj,
  type MonoMap,
  type TerminalElementTransportAnalysis,
} from "../../models/finpos-cat"

const chain: FinPosObj = {
  name: "C₂",
  elems: ["⊥", "⊤"],
  leq: (a, b) => a === b || a === "⊥",
}

const altTerminal: FinPosObj = {
  name: "1'",
  elems: ["★"],
  leq: () => true,
}

describe("Point elements are terminal-iso invariant", () => {
  it("transports alternative terminal elements to the canonical point", () => {
    const element: MonoMap = {
      name: "ξ",
      dom: altTerminal.name,
      cod: chain.name,
      map: () => "⊤",
    }

    const analysis = FinPos.checkTerminalElementTransport(chain, element, altTerminal)

    expect(analysis.holds).toBe(true)
    expect(analysis.witness).toBeDefined()

    const witness = analysis.witness!
    expect(witness.value).toBe("⊤")
    const canonical = witness.canonical
    const canonicalPoint = FinPos.one().elems[0]!
    expect(canonical.map(canonicalPoint)).toBe("⊤")

    const iso = witness.iso
    expect(iso.toCanonical.dom).toBe(altTerminal.name)
    expect(iso.toCanonical.cod).toBe(FinPos.one().name)
    expect(iso.fromCanonical.dom).toBe(FinPos.one().name)
    expect(iso.fromCanonical.cod).toBe(altTerminal.name)
  })

  it("rejects non-terminal alternatives before transporting", () => {
    const badTerminal: FinPosObj = {
      name: "NotTerminal",
      elems: ["a", "b"],
      leq: (a, b) => a === b || a === "a",
    }

    const element: MonoMap = {
      name: "η",
      dom: badTerminal.name,
      cod: chain.name,
      map: () => "⊥",
    }

    const analysis: TerminalElementTransportAnalysis = FinPos.checkTerminalElementTransport(
      chain,
      element,
      badTerminal,
    )

    expect(analysis.holds).toBe(false)
    expect(analysis.failure).toEqual({
      kind: "nonTerminal",
      reason: "NotTerminal cannot be terminal with |NotTerminal| = 2",
    })
    expect(analysis.details).toContain("cannot act as a terminal picker")
  })
})

