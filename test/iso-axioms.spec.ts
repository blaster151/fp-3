import { describe, expect, it } from "vitest"
import { IsoAxioms, isIso } from "../oracles/iso-axioms"
import { makeIsoReadyFinSet, makeIsoReadyFinPos, makeIsoReadyFinGrp, FinPos } from "../adapters/iso-ready"
import type { FuncArr } from "../models/finset-cat"
import type { MonoMap, FinPosObj } from "../models/finpos-cat"
import type { FinGrpObj, Hom } from "../models/fingroup-cat"

describe("Isomorphism axioms", () => {
  it("identifies identity arrows as isomorphisms in FinSet", () => {
    const category = makeIsoReadyFinSet({ A: ["a", "b"], B: ["x", "y"], C: ["p", "q"] })

    const iso: FuncArr = {
      name: "swap",
      dom: "A",
      cod: "B",
      map: (value) => (value === "a" ? "x" : "y"),
    }
    ;(category.arrows as FuncArr[]).push(iso)

    const identityResult = IsoAxioms.identityIsIso(category, "A")
    expect(identityResult.holds).toBe(true)

    expect(isIso(category, iso)).toBe(true)

    const [inverse] = category.candidatesToInvert(iso)
    expect(inverse).toBeDefined()

    const unique = IsoAxioms.uniqueInverse(category, iso, inverse, inverse)
    expect(unique.holds).toBe(true)

    const iso2: FuncArr = {
      name: "permute",
      dom: "B",
      cod: "C",
      map: (value) => (value === "x" ? "p" : "q"),
    }
    ;(category.arrows as FuncArr[]).push(iso2)
    const composition = IsoAxioms.closedUnderComposition(category, iso, iso2)
    expect(composition.holds).toBe(true)
  })

  it("exposes failures of uniqueness when candidates disagree", () => {
    const category = makeIsoReadyFinSet({ A: ["0", "1"], B: ["u", "v"] })
    const iso: FuncArr = {
      name: "flip",
      dom: "A",
      cod: "B",
      map: (value) => (value === "0" ? "u" : "v"),
    }
    ;(category.arrows as FuncArr[]).push(iso)

    const [inverse] = category.candidatesToInvert(iso)
    expect(inverse).toBeDefined()

    const bogus: FuncArr = {
      name: "const",
      dom: "B",
      cod: "A",
      map: (_value) => "0",
    }

    const result = IsoAxioms.uniqueInverse(category, iso, inverse, bogus)
    expect(result.holds).toBe(false)
    expect(result.detail).toBeDefined()
    expect(result.detail).toContain("fails")
  })

  it("provides counterexamples where mono + epi ≠ iso in FinPos", () => {
    const discrete: FinPosObj = { name: "Disc", elems: ["a", "b"], leq: (x, y) => x === y }
    const chain: FinPosObj = {
      name: "Chain",
      elems: ["a", "b"],
      leq: (x, y) => x === y || x === "a",
    }
    const category = makeIsoReadyFinPos([discrete, chain, FinPos.one()])

    const f: MonoMap = {
      name: "incl",
      dom: "Disc",
      cod: "Chain",
      map: (value) => value,
    }
    ;(category.arrows as MonoMap[]).push(f)

    expect(isIso(category, f)).toBe(false)
  })

  it("detects non-isomorphisms in FinGrp while validating identity isos", () => {
    const Z2: FinGrpObj = {
      name: "Z2",
      elems: ["0", "1"],
      e: "0",
      mul: (a, b) => ((Number(a) + Number(b)) % 2).toString(),
      inv: (a) => a,
    }
    const category = makeIsoReadyFinGrp([Z2])

    const identity = IsoAxioms.identityIsIso(category, "Z2")
    expect(identity.holds).toBe(true)

    const constant: Hom = {
      name: "const0",
      dom: "Z2",
      cod: "Z2",
      map: () => "0",
    }
    ;(category.arrows as Hom[]).push(constant)
    expect(isIso(category, constant)).toBe(false)
  })
})
