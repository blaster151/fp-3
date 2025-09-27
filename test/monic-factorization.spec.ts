import { describe, expect, it } from "vitest"
import { FinSetCat, type FuncArr } from "../models/finset-cat"
import {
  findMutualMonicFactorizations,
  verifyMutualMonicFactorizations,
} from "../kinds/monic-factorization"
import { MonicFactorizationYieldsIso } from "../oracles/monic-factorization"

describe("Monic factorisation oracles", () => {
  const universe = {
    R: ["r1", "r2"],
    S: ["s1", "s2"],
    X: ["x1", "x2"],
  } as const

  const category = FinSetCat(universe)
  const registry = category.arrows as FuncArr[]

  const r: FuncArr = {
    name: "r",
    dom: "R",
    cod: "X",
    map: (value) => (value === "r1" ? "x1" : "x2"),
  }
  const s: FuncArr = {
    name: "s",
    dom: "S",
    cod: "X",
    map: (value) => (value === "s1" ? "x1" : "x2"),
  }
  const g: FuncArr = {
    name: "g",
    dom: "R",
    cod: "S",
    map: (value) => (value === "r1" ? "s1" : "s2"),
  }
  const h: FuncArr = {
    name: "h",
    dom: "S",
    cod: "R",
    map: (value) => (value === "s1" ? "r1" : "r2"),
  }

  registry.push(r, s, g, h)

  it("detects mutually factoring monomorphisms", () => {
    const witnesses = findMutualMonicFactorizations(category)
    expect(witnesses).toHaveLength(1)
    const witness = witnesses[0]
    if (!witness) throw new Error("expected a mutual monic factorization witness")
    expect(category.eq(category.compose(s, witness.forward), witness.left)).toBe(true)
    expect(category.eq(category.compose(r, witness.backward), witness.right)).toBe(true)
  })

  it("verifies that the connecting arrows are inverse", () => {
    const check = verifyMutualMonicFactorizations(category)
    expect(check.holds).toBe(true)
  })

  it("oracle reports success", () => {
    const result = MonicFactorizationYieldsIso.check(category)
    expect(result.holds).toBe(true)
  })
})
