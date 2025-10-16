import { describe, expect, it } from "vitest"

import { CategoryLimits, makeSliceProductsWithTuple } from "../../allTS"
import {
  makeSlice,
  makeFiniteSliceProduct,
  makeSliceProduct,
  type SliceArrow,
  type SliceObject,
} from "../../slice-cat"
import { FinSetCat, type FinSetCategory, type FuncArr } from "../../models/finset-cat"
import type { Functor } from "../../functor"
import { checkProductUP } from "../../product-up"

type SliceObj = SliceObject<string, FuncArr>
type SliceArr = SliceArrow<string, FuncArr>

describe("Finite slice products over a common anchor", () => {
  const universe = {
    X: ["x0", "x1", "x2"] as const,
    A: ["a0", "a1"] as const,
    B: ["b0", "b1", "b2"] as const,
    C: ["c0", "c1"] as const,
    D: ["d0", "d1", "d2"] as const,
  }

  const base: FinSetCategory = FinSetCat(universe)
  const registry = base.arrows as FuncArr[]

  const idX = base.id("X")
  const idA = base.id("A")
  const idB = base.id("B")
  const idC = base.id("C")
  const idD = base.id("D")

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

  const k: FuncArr = {
    name: "k",
    dom: "D",
    cod: "X",
    map: (value) => {
      if (value === "d0") return "x0"
      if (value === "d1") return "x1"
      return "x1"
    },
  }

  const p: FuncArr = {
    name: "p",
    dom: "D",
    cod: "A",
    map: (value) => (value === "d0" ? "a0" : "a1"),
  }

  const q: FuncArr = {
    name: "q",
    dom: "D",
    cod: "B",
    map: (value) => {
      if (value === "d0") return "b0"
      if (value === "d1") return "b1"
      return "b2"
    },
  }

  const r: FuncArr = {
    name: "r",
    dom: "D",
    cod: "C",
    map: (value) => (value === "d0" ? "c0" : "c1"),
  }

  const rAlt: FuncArr = {
    name: "r'",
    dom: "D",
    cod: "C",
    map: (value) => (value === "d2" ? "c0" : r.map(value)),
  }

  registry.push(idX, idA, idB, idC, idD, f, g, h, k, p, q, r, rAlt)

  const slice = makeSlice(base, "X")

  const left = slice.objects.find((object) => object.domain === "A")
  const middle = slice.objects.find((object) => object.domain === "B")
  const right = slice.objects.find((object) => object.domain === "C")
  const source = slice.objects.find((object) => object.domain === "D")

  if (!left || !middle || !right || !source) {
    throw new Error("Expected slice objects for A, B, C, and D to exist")
  }

  const pairAB = makeSliceProduct(base, "X", left, middle, { name: "A×_X B" })

  const triple = makeFiniteSliceProduct(base, "X", [left, middle, right], {
    name: "A×_X B×_X C",
  })

  const fiberCarrier = base.carrier(triple.object.domain)

  it("enumerates the triple fiber product carrier and projections", () => {
    const decoded = fiberCarrier.map((value) => triple.decode(value))
    expect(decoded).toEqual([
      ["a0", "b0", "c0"],
      ["a1", "b1", "c1"],
      ["a1", "b2", "c1"],
    ])

    const projections = triple.projections
    expect(projections).toHaveLength(3)

    const [π1, π2, π3] = projections
    if (!π1 || !π2 || !π3) {
      throw new Error("Expected three projections from the triple product")
    }

    expect(slice.eq(π1, pairAB.projectionLeft)).toBe(true)
    expect(slice.eq(π2, pairAB.projectionRight)).toBe(true)

    const expectedΠ3: SliceArr = {
      src: triple.object,
      dst: right,
      mediating: {
        name: π3.mediating.name,
        dom: triple.object.domain,
        cod: right.domain,
        map: (value: string) => {
          const coords = triple.decode(value)
          const third = coords[2]
          if (third === undefined) {
            throw new Error(
              `makeSliceProduct: element ${value} does not decode to a triple`,
            )
          }
          return third
        },
      },
    }
    expect(slice.eq(π3, expectedΠ3)).toBe(true)
  })

  const legA: SliceArr = { src: source, dst: left, mediating: p }
  const legB: SliceArr = { src: source, dst: middle, mediating: q }
  const legC: SliceArr = { src: source, dst: right, mediating: r }
  const badLegC: SliceArr = { src: source, dst: right, mediating: rAlt }

  const pairToAB = pairAB.pair(legA, legB)
  const tripleMediator = triple.tuple(source, [legA, legB, legC])

  const constantFiber = fiberCarrier[0]
  if (!constantFiber) {
    throw new Error("Triple fiber product is unexpectedly empty")
  }
  const constantToAB: SliceArr = {
    src: source,
    dst: pairAB.object,
    mediating: {
      name: "const_AB",
      dom: source.domain,
      cod: pairAB.object.domain,
      map: () => constantFiber,
    },
  }

  it("collapses compatible legs to the canonical mediating arrow", () => {
    const composed1 = slice.compose(triple.projections[0]!, tripleMediator)
    const composed2 = slice.compose(triple.projections[1]!, tripleMediator)
    const composed3 = slice.compose(triple.projections[2]!, tripleMediator)

    expect(base.eq(composed1.mediating, p)).toBe(true)
    expect(base.eq(composed2.mediating, q)).toBe(true)
    expect(base.eq(composed3.mediating, r)).toBe(true)

    expect(() => triple.tuple(source, [legA, legB, badLegC])).toThrow(
      /do not agree over the anchor/,
    )
  })

  it("verifies the final binary step with checkProductUP", () => {
    const arrowSamples = ["id_source", "leg", "id_left", "id_right"] as const
    type ObjX = "source" | "left" | "right"
    type ArrX = (typeof arrowSamples)[number]

    const F: Functor<ObjX, ArrX, SliceObj, SliceArr> = {
      F0: (object) => {
        switch (object) {
          case "source":
            return source
          case "left":
            return pairAB.object
          case "right":
            return pairAB.object
        }
      },
      F1: (arrow) => {
        switch (arrow) {
          case "leg":
            return pairToAB
          case "id_source":
            return slice.id(source)
          case "id_left":
          case "id_right":
            return slice.id(pairAB.object)
        }
      },
    }

    const G: Functor<ObjX, ArrX, SliceObj, SliceArr> = {
      F0: (object) => (object === "source" ? source : right),
      F1: (arrow) => {
        switch (arrow) {
          case "leg":
            return legC
          case "id_source":
            return slice.id(source)
          case "id_left":
          case "id_right":
            return slice.id(right)
        }
      },
    }

    type PairObj = readonly [SliceObj, SliceObj]
    type PairArr = {
      readonly src: PairObj
      readonly dst: PairObj
      readonly cf: SliceArr
      readonly dg: SliceArr
    }

    const H: Functor<ObjX, ArrX, PairObj, PairArr> = {
      F0: (object) =>
        object === "source" ? [source, source] : [pairAB.object, right],
      F1: (arrow) => {
        switch (arrow) {
          case "leg":
            return {
              src: [source, source] as const,
              dst: [pairAB.object, right] as const,
              cf: constantToAB,
              dg: slice.compose(triple.projections[2]!, tripleMediator),
            }
          case "id_source":
            return {
              src: [source, source] as const,
              dst: [source, source] as const,
              cf: slice.id(source),
              dg: slice.id(source),
            }
          case "id_left":
            return {
              src: [pairAB.object, right] as const,
              dst: [pairAB.object, right] as const,
              cf: slice.id(pairAB.object),
              dg: slice.id(right),
            }
          case "id_right":
            return {
              src: [pairAB.object, right] as const,
              dst: [pairAB.object, right] as const,
              cf: slice.id(pairAB.object),
              dg: slice.id(right),
            }
        }
      },
    }

    const eqArr = slice.eq
    const result = checkProductUP(slice, slice, F, G, H, ["source", "left", "right"], arrowSamples, {
      eqCArr: eqArr,
      eqDArr: eqArr,
      eqPairArr: (leftPair, rightPair) =>
        leftPair.src[0] === rightPair.src[0] &&
        leftPair.src[1] === rightPair.src[1] &&
        leftPair.dst[0] === rightPair.dst[0] &&
        leftPair.dst[1] === rightPair.dst[1] &&
        eqArr(leftPair.cf, rightPair.cf) &&
        eqArr(leftPair.dg, rightPair.dg),
    })

    expect(result).toBe(true)

    const failing: typeof H = {
      ...H,
      F1: (arrow) => {
        if (arrow === "leg") {
          return {
            src: [source, source] as const,
            dst: [pairAB.object, right] as const,
            cf: constantToAB,
            dg: slice.compose(triple.projections[2]!, tripleMediator),
          }
        }
        return H.F1(arrow)
      },
    }

    expect(
      checkProductUP(slice, slice, F, G, failing, ["source", "left", "right"], arrowSamples, {
        eqCArr: eqArr,
        eqDArr: eqArr,
      }),
    ).toBe(false)
  })

  it("integrates with CategoryLimits finite-product helpers", () => {
    const hasProducts = makeSliceProductsWithTuple(base, "X")
    const indices = { carrier: [0, 1, 2] as const }
    const factors = [left, middle, right] as const

    const { product, projections } = CategoryLimits.finiteProduct(indices, (i) => factors[i], hasProducts)

    expect(product.domain).toBe(triple.object.domain)
    expect(base.eq(product.arrowToAnchor, triple.object.arrowToAnchor)).toBe(true)

    const mediated = hasProducts.tuple(source, [legA, legB, legC], product)

    expect(base.eq(slice.compose(projections(0), mediated).mediating, p)).toBe(true)
    expect(base.eq(slice.compose(projections(1), mediated).mediating, q)).toBe(true)
    expect(base.eq(slice.compose(projections(2), mediated).mediating, r)).toBe(true)
  })
})
