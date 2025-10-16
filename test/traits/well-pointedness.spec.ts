import { describe, expect, it } from "vitest"

import { FinSetCat, type FuncArr } from "../../models/finset-cat"
import type { FiniteCategory } from "../../finite-cat"
import { checkPointSeparator, checkWellPointedness } from "../../traits/well-pointedness"
import type { HasTerminal } from "../../traits/global-elements"

type Obj = "1" | "A" | "B"
interface Arrow {
  readonly name: string
  readonly dom: Obj
  readonly cod: Obj
}

describe("checkPointSeparator", () => {
  it("extracts a separating terminal point in FinSet", () => {
    const category = FinSetCat({
      A: ["a", "b"],
      B: ["x", "y"],
    })

    const flip: FuncArr = {
      name: "flip",
      dom: "A",
      cod: "B",
      map: (value) => (value === "a" ? "x" : "y"),
    }

    const constant: FuncArr = {
      name: "const_x",
      dom: "A",
      cod: "B",
      map: () => "x",
    }

    const analysis = checkPointSeparator(category, flip, constant)

    expect(analysis.holds).toBe(true)
    expect(analysis.witness).toBeDefined()

    const witness = analysis.witness!
    expect(witness.domain).toBe("A")
    expect(witness.codomain).toBe("B")
    expect(category.eq(witness.left, flip)).toBe(true)
    expect(category.eq(witness.right, constant)).toBe(true)

    const composite = category.compose(flip, witness.point)
    expect(category.eq(composite, witness.leftComposite)).toBe(true)
    const constantComposite = category.compose(constant, witness.point)
    expect(category.eq(constantComposite, witness.rightComposite)).toBe(true)
    expect(category.eq(composite, constantComposite)).toBe(false)
  })

  it("records indistinguishable pairs", () => {
    const category = FinSetCat({
      A: ["a"],
      B: ["x"],
    })

    const constant: FuncArr = {
      name: "const_x",
      dom: "A",
      cod: "B",
      map: () => "x",
    }

    const analysis = checkPointSeparator(category, constant, constant)

    expect(analysis.holds).toBe(false)
    expect(analysis.failure).toEqual({ kind: "indistinguishable", domain: "A", codomain: "B" })
  })

  it("fails when no terminal points are available", () => {
    const category: FiniteCategory<Obj, Arrow> & HasTerminal<Obj, Arrow> = {
      objects: ["1", "A", "B"],
      arrows: [],
      id: (object) => ({ name: `id_${object}`, dom: object, cod: object }),
      compose: (g, f) => ({ name: `${g.name}∘${f.name}`, dom: f.dom, cod: g.cod }),
      src: (arrow) => arrow.dom,
      dst: (arrow) => arrow.cod,
      eq: (left, right) => left.name === right.name && left.dom === right.dom && left.cod === right.cod,
      traits: { functionalArrows: true },
      one: () => "1",
      globals: () => [],
    }

    const f: Arrow = { name: "f", dom: "A", cod: "B" }
    const g: Arrow = { name: "g", dom: "A", cod: "B" }

    const analysis = checkPointSeparator(category, f, g)

    expect(analysis.holds).toBe(false)
    expect(analysis.failure).toEqual({ kind: "noPoints", domain: "A", terminal: "1" })
  })
})

describe("checkWellPointedness", () => {
  it("summarises successes, failures, and indistinguishable pairs", () => {
    const category = FinSetCat({
      A: ["a", "b"],
      B: ["x", "y"],
    })

    const flip: FuncArr = {
      name: "flip",
      dom: "A",
      cod: "B",
      map: (value) => (value === "a" ? "x" : "y"),
    }

    const constant: FuncArr = {
      name: "const_x",
      dom: "A",
      cod: "B",
      map: () => "x",
    }

    const analysis = checkWellPointedness(category, [
      { left: flip, right: constant },
      { left: constant, right: constant },
    ])

    expect(analysis.holds).toBe(true)
    expect(analysis.witnesses).toHaveLength(1)
    expect(analysis.indistinguishable).toHaveLength(1)
    expect(analysis.failures).toHaveLength(0)
  })

  it("flags pairs lacking separating points", () => {
    const category: FiniteCategory<Obj, Arrow> & HasTerminal<Obj, Arrow> = {
      objects: ["1", "A", "B"],
      arrows: [],
      id: (object) => ({ name: `id_${object}`, dom: object, cod: object }),
      compose: (g, f) => ({ name: `${g.name}∘${f.name}`, dom: f.dom, cod: g.cod }),
      src: (arrow) => arrow.dom,
      dst: (arrow) => arrow.cod,
      eq: (left, right) => left.name === right.name && left.dom === right.dom && left.cod === right.cod,
      traits: { functionalArrows: true },
      one: () => "1",
      globals: () => [],
    }

    const f: Arrow = { name: "f", dom: "A", cod: "B" }
    const g: Arrow = { name: "g", dom: "A", cod: "B" }

    const analysis = checkWellPointedness(category, [{ left: f, right: g }])

    expect(analysis.holds).toBe(false)
    expect(analysis.failures).toHaveLength(1)
    expect(analysis.failures[0]).toEqual({ kind: "noPoints", domain: "A", terminal: "1" })
    expect(analysis.indistinguishable).toHaveLength(0)
  })
})
