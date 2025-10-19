import { describe, expect, it } from "vitest"

import { makeFinitePullbackCalculator } from "../../pullback"
import { makeSlice, makeSliceProduct, type SliceArrow } from "../../slice-cat"
import { FinSetCat, type FinSetCategory, type FuncArr } from "../../models/finset-cat"
type SliceArr = SliceArrow<string, FuncArr>

describe("FinSet slice products agree with pullback data", () => {
  const universe = {
    X: ["x0", "x1", "x2"] as const,
    A: ["a0", "a1"] as const,
    B: ["b0", "b1", "b2"] as const,
    C: ["c0", "c1", "c2"] as const,
  }

  const category: FinSetCategory = FinSetCat(universe)
  const registry = category.arrows as FuncArr[]

  const idX = category.id("X")
  const idA = category.id("A")
  const idB = category.id("B")
  const idC = category.id("C")

  const f: FuncArr = {
    name: "f",
    dom: "A",
    cod: "X",
    map: (value) => (value === "a0" ? "x0" : "x1"),
  }

  const g: FuncArr = {
    name: "g",
    dom: "B",
    cod: "X",
    map: (value) => {
      if (value === "b0") return "x0"
      if (value === "b1") return "x1"
      return "x1"
    },
  }

  const h: FuncArr = {
    name: "h",
    dom: "C",
    cod: "X",
    map: (value) => (value === "c0" ? "x0" : "x1"),
  }

  const u: FuncArr = {
    name: "u",
    dom: "C",
    cod: "A",
    map: (value) => (value === "c0" ? "a0" : "a1"),
  }

  const v: FuncArr = {
    name: "v",
    dom: "C",
    cod: "B",
    map: (value) => {
      if (value === "c0") return "b0"
      if (value === "c1") return "b1"
      return "b2"
    },
  }

  registry.push(idX, idA, idB, idC, f, g, h, u, v)

  const slice = makeSlice(category, "X")

  const left = slice.objects.find((object) => object.domain === "A")
  const right = slice.objects.find((object) => object.domain === "B")
  const source = slice.objects.find((object) => object.domain === "C")

  if (!left || !right || !source) {
    throw new Error("Expected the slice objects for A, B, and C to be present")
  }

  const product = makeSliceProduct(category, "X", left, right, { name: "A×_X B" })

  registry.push(
    product.object.arrowToAnchor,
    product.projectionLeft.mediating,
    product.projectionRight.mediating,
    category.id(product.object.domain),
  )

  const calculator = makeFinitePullbackCalculator(category)
  const pullback = calculator.pullback(left.arrowToAnchor, right.arrowToAnchor)

  it("matches the pullback apex and projections", () => {
    expect(pullback.apex).toBe(product.object.domain)
    expect(category.eq(pullback.toDomain, product.projectionLeft.mediating)).toBe(true)
    expect(category.eq(pullback.toAnchor, product.projectionRight.mediating)).toBe(true)
  })

  const leftLeg: SliceArr = { src: source, dst: left, mediating: u }
  const rightLeg: SliceArr = { src: source, dst: right, mediating: v }
  const pairing = product.pair(leftLeg, rightLeg)
  registry.push(pairing.mediating)

  it("shares mediating arrows with the slice pairing", () => {
    const factoring = calculator.factorCone(pullback, {
      apex: leftLeg.src.domain,
      toDomain: leftLeg.mediating,
      toAnchor: rightLeg.mediating,
    })

    expect(factoring.factored).toBe(true)
    expect(factoring.mediator).toBeDefined()
    const mediator = factoring.mediator
    if (!mediator) throw new Error("Expected a mediating arrow from the pullback")

    expect(category.eq(mediator, pairing.mediating)).toBe(true)
    expect(category.eq(category.compose(pullback.toDomain, mediator), leftLeg.mediating)).toBe(true)
    expect(category.eq(category.compose(pullback.toAnchor, mediator), rightLeg.mediating)).toBe(true)
  })

  it("forces the canonical cone to factor through the identity", () => {
    const factoring = calculator.factorCone(pullback, {
      apex: pullback.apex,
      toDomain: product.projectionLeft.mediating,
      toAnchor: product.projectionRight.mediating,
    })

    expect(factoring.factored).toBe(true)
    expect(factoring.mediator).toBeDefined()
    const mediator = factoring.mediator
    if (!mediator) throw new Error("Expected an identity mediator for the pullback apex")

    expect(category.eq(mediator, category.id(pullback.apex))).toBe(true)
  })

  it("detects that non-pullback wedges disagree with the slice product", () => {
    const fakeWedge = {
      apex: leftLeg.src.domain,
      toDomain: leftLeg.mediating,
      toAnchor: rightLeg.mediating,
    } as const

    expect(fakeWedge.apex).not.toBe(product.object.domain)
    expect(category.eq(fakeWedge.toDomain, product.projectionLeft.mediating)).toBe(false)
    expect(category.eq(fakeWedge.toAnchor, product.projectionRight.mediating)).toBe(false)

    const certification = calculator.certify(left.arrowToAnchor, right.arrowToAnchor, fakeWedge)
    expect(certification.valid).toBe(false)
    expect(certification.reason).toMatch(/Pullback certification/)
  })
})
