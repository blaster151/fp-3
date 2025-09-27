import { describe, expect, it } from "vitest"
import { FinSetCat, type FuncArr } from "../models/finset-cat"
import { Rewriter, defaultOperationRules } from "../operations/rewriter"

describe("Operations layer rewrites", () => {
  const universe = {
    A: ["a1", "a2"],
    B: ["b1", "b2"],
    R: ["r1", "r2"],
    S: ["s1", "s2"],
    X: ["x1", "x2"],
  } as const

  const category = FinSetCat(universe)
  const registry = category.arrows as FuncArr[]

  const u: FuncArr = {
    name: "u",
    dom: "A",
    cod: "B",
    map: (value) => (value === "a1" ? "b2" : "b1"),
  }
  const v: FuncArr = {
    name: "v",
    dom: "B",
    cod: "A",
    map: (value) => (value === "b1" ? "a2" : "a1"),
  }

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

  registry.push(u, v, r, s, g, h)

  const [isoRule, upgradeRule, balancedRule, epiMonoRule, objectIsoRule, mergeRule] =
    defaultOperationRules<string, FuncArr>()

  it("suggests cancelling inverse pairs", () => {
    const rewriter = new Rewriter([isoRule])
    const suggestions = rewriter.analyze({ category, path: [u, v, u] })
    expect(suggestions).toHaveLength(1)
    const [suggestion] = suggestions
    expect(suggestion.severity).toBe("safe")
    expect(suggestion.rewrites[0]?.kind).toBe("NormalizeComposite")
  })

  it("proposes upgrading monic arrows with right inverses", () => {
    const rewriter = new Rewriter([upgradeRule])
    const suggestions = rewriter.analyze({ category, focus: u })
    expect(suggestions).toHaveLength(1)
    const [suggestion] = suggestions
    expect(suggestion.rewrites.some((rewrite) => rewrite.kind === "UpgradeToIso")).toBe(true)
  })

  it("promotes monic and epic arrows when the category is balanced", () => {
    const rewriter = new Rewriter([balancedRule])
    const suggestions = rewriter.analyze({ category, focus: u })
    expect(suggestions).toHaveLength(1)
    const [suggestion] = suggestions
    expect(suggestion.oracle).toBe("BalancedMonoEpicIsIso")
    expect(suggestion.rewrites.some((rewrite) => rewrite.kind === "UpgradeToIso")).toBe(true)
  })

  it("merges mutually factoring monomorphisms", () => {
    const rewriter = new Rewriter([mergeRule])
    const suggestions = rewriter.analyze({ category })
    expect(suggestions).toHaveLength(1)
    const [suggestion] = suggestions
    expect(suggestion.rewrites.every((rewrite) => rewrite.kind === "MergeSubobjects")).toBe(true)
  })

  it("detects isomorphic objects and proposes a merge", () => {
    const rewriter = new Rewriter([objectIsoRule])
    const suggestions = rewriter.analyze({ category })
    expect(suggestions).toHaveLength(1)
    const [suggestion] = suggestions
    expect(suggestion.rewrites.every((rewrite) => rewrite.kind === "MergeObjects")).toBe(true)
  })

  it("exposes epi-mono factorisations when focused on an arrow", () => {
    const rewriter = new Rewriter([epiMonoRule])
    const suggestions = rewriter.analyze({ category, focus: r })
    expect(suggestions).toHaveLength(1)
    const [suggestion] = suggestions
    expect(suggestion.oracle).toBe("EpiMonoFactorization")
    expect(suggestion.rewrites).toEqual([
      {
        kind: "FactorThroughEpiMono",
        arrow: r,
        epi: g,
        mono: s,
      },
    ])
  })
})
