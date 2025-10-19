import { describe, expect, it } from "vitest"

import {
  createSliceProductToolkit,
  makeSliceProductFromPullback,
  makeSliceFiniteProductFromPullback,
  type SliceArrow,
  type SliceObject,
} from "../../slice-cat"
import { makeFinitePullbackCalculator, type PullbackCalculator } from "../../pullback"
import type { FiniteCategory } from "../../finite-cat"
import { makeSliceProductsWithTuple } from "../../allTS"

type Obj = "⊤" | "a" | "b" | "⊥"

interface Arr {
  readonly name: string
  readonly src: Obj
  readonly dst: Obj
}

const makeArrow = (src: Obj, dst: Obj): Arr => ({
  name: `${src}≤${dst}`,
  src,
  dst,
})

const identities: Record<Obj, Arr> = {
  "⊤": { name: "id_⊤", src: "⊤", dst: "⊤" },
  a: { name: "id_a", src: "a", dst: "a" },
  b: { name: "id_b", src: "b", dst: "b" },
  "⊥": { name: "id_⊥", src: "⊥", dst: "⊥" },
}

const arrows: readonly Arr[] = [
  identities["⊤"],
  identities.a,
  identities.b,
  identities["⊥"],
  makeArrow("⊥", "a"),
  makeArrow("⊥", "b"),
  makeArrow("⊥", "⊤"),
  makeArrow("a", "⊤"),
  makeArrow("b", "⊤"),
]

const findArrow = (src: Obj, dst: Obj) => {
  const candidate = arrows.find((arrow) => arrow.src === src && arrow.dst === dst)
  if (!candidate) {
    throw new Error(`posetCategory: missing arrow ${src}→${dst}`)
  }
  return candidate
}

const compose = (g: Arr, f: Arr): Arr => {
  if (f.dst !== g.src) {
    throw new Error("posetCategory: attempted to compose non-composable arrows")
  }
  if (f.name.startsWith("id_")) return g
  if (g.name.startsWith("id_")) return f
  return findArrow(f.src, g.dst)
}

const PosetCategory: FiniteCategory<Obj, Arr> = {
  objects: ["⊤", "a", "b", "⊥"],
  arrows,
  id: (object) => identities[object],
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (left, right) => left.name === right.name && left.src === right.src && left.dst === right.dst,
}

const anchor: Obj = "⊤"

const topSlice: SliceObject<Obj, Arr> = {
  domain: "⊤",
  arrowToAnchor: identities["⊤"],
}

const aSlice: SliceObject<Obj, Arr> = {
  domain: "a",
  arrowToAnchor: findArrow("a", "⊤"),
}

const bSlice: SliceObject<Obj, Arr> = {
  domain: "b",
  arrowToAnchor: findArrow("b", "⊤"),
}

const bottomSlice: SliceObject<Obj, Arr> = {
  domain: "⊥",
  arrowToAnchor: findArrow("⊥", "⊤"),
}

describe("Slice products reconstructed from pullbacks", () => {
  const calculator = makeFinitePullbackCalculator(PosetCategory)
  const toolkit = createSliceProductToolkit<Obj, Arr>()

  it("builds binary fiber products and mediates pairings", () => {
    const product = makeSliceProductFromPullback(PosetCategory, anchor, calculator, aSlice, bSlice, {
      toolkit,
    })
    expect(product.object.domain).toBe("⊥")
    expect(PosetCategory.eq(product.object.arrowToAnchor, findArrow("⊥", "⊤"))).toBe(true)
    expect(PosetCategory.eq(product.projectionLeft.mediating, findArrow("⊥", "a"))).toBe(true)
    expect(PosetCategory.eq(product.projectionRight.mediating, findArrow("⊥", "b"))).toBe(true)

    const leftLeg: SliceArrow<Obj, Arr> = {
      src: bottomSlice,
      dst: aSlice,
      mediating: findArrow("⊥", "a"),
    }
    const rightLeg: SliceArrow<Obj, Arr> = {
      src: bottomSlice,
      dst: bSlice,
      mediating: findArrow("⊥", "b"),
    }
    const mediator = product.pair(leftLeg, rightLeg)
    expect(PosetCategory.eq(mediator.mediating, identities["⊥"])).toBe(true)
    expect(mediator.dst).toEqual(product.object)
  })

  it("exposes swap, diagonal, and unit isomorphisms", () => {
    const product = makeSliceProductFromPullback(PosetCategory, anchor, calculator, aSlice, bSlice, {
      toolkit,
    })
    const swap = product.swap?.()
    expect(swap).toBeDefined()
    if (!swap) throw new Error("expected swap data")
    expect(PosetCategory.eq(swap.forward.mediating, identities["⊥"])).toBe(true)
    expect(PosetCategory.eq(swap.backward.mediating, identities["⊥"])).toBe(true)

    const selfProduct = makeSliceProductFromPullback(
      PosetCategory,
      anchor,
      calculator,
      aSlice,
      aSlice,
      { toolkit },
    )
    const diagonal = selfProduct.diagonal?.()
    expect(diagonal).toBeDefined()
    if (!diagonal) throw new Error("expected diagonal data")
    expect(PosetCategory.eq(diagonal.arrow.mediating, findArrow("a", "a"))).toBe(true)

    const leftUnit = makeSliceProductFromPullback(PosetCategory, anchor, calculator, topSlice, aSlice, {
      toolkit,
    })
    const leftUnitIso = leftUnit.leftUnit?.()
    expect(leftUnitIso).toBeDefined()
    if (!leftUnitIso) throw new Error("expected left unit data")
    expect(PosetCategory.eq(leftUnitIso.forward.mediating, findArrow("⊥", "a"))).toBe(true)
    expect(PosetCategory.eq(leftUnitIso.backward.mediating, identities["a"])).toBe(true)

    const rightUnit = makeSliceProductFromPullback(PosetCategory, anchor, calculator, aSlice, topSlice, {
      toolkit,
    })
    const rightUnitIso = rightUnit.rightUnit?.()
    expect(rightUnitIso).toBeDefined()
    if (!rightUnitIso) throw new Error("expected right unit data")
    expect(PosetCategory.eq(rightUnitIso.forward.mediating, findArrow("⊥", "a"))).toBe(true)
    expect(PosetCategory.eq(rightUnitIso.backward.mediating, identities["a"])).toBe(true)
  })

  it("iterates pullback products across finite families", () => {
    const witness = makeSliceFiniteProductFromPullback(PosetCategory, anchor, calculator, [
      aSlice,
      bSlice,
      topSlice,
    ], {
      toolkit,
    })
    expect(witness.factors.length).toBe(3)
    expect(PosetCategory.eq(witness.object.arrowToAnchor, findArrow("⊥", "⊤"))).toBe(true)

    const legs: SliceArrow<Obj, Arr>[] = [
      { src: bottomSlice, dst: aSlice, mediating: findArrow("⊥", "a") },
      { src: bottomSlice, dst: bSlice, mediating: findArrow("⊥", "b") },
      { src: bottomSlice, dst: topSlice, mediating: findArrow("⊥", "⊤") },
    ]
    const mediator = witness.tuple(bottomSlice, legs)
    expect(PosetCategory.eq(mediator.mediating, identities["⊥"])).toBe(true)
  })

  it("integrates with the tuple toolkit when using pullback builders", () => {
    const limits = makeSliceProductsWithTuple(PosetCategory, anchor, { pullbacks: calculator, toolkit })
    const { obj, projections } = limits.product([aSlice, bSlice])
    expect(obj).toEqual({ domain: "⊥", arrowToAnchor: findArrow("⊥", "⊤") })
    expect(projections).toHaveLength(2)
    const tuple = limits.tuple(bottomSlice, [
      { src: bottomSlice, dst: aSlice, mediating: findArrow("⊥", "a") },
      { src: bottomSlice, dst: bSlice, mediating: findArrow("⊥", "b") },
    ], obj)
    expect(PosetCategory.eq(tuple.mediating, identities["⊥"])).toBe(true)
  })

  it("rejects calculators that do not certify the pullback universal property", () => {
    const faulty: PullbackCalculator<Obj, Arr> = {
      ...calculator,
      factorCone: () => ({ factored: false, reason: "faulty" }),
    }
    expect(() =>
      makeSliceProductFromPullback(PosetCategory, anchor, faulty, aSlice, bSlice, {
        toolkit,
      }),
    ).toThrow(/does not factor/)
  })

  it("detects non-commuting slice legs when pairing", () => {
    const product = makeSliceProductFromPullback(PosetCategory, anchor, calculator, aSlice, bSlice, {
      toolkit,
    })
    const leftLeg: SliceArrow<Obj, Arr> = {
      src: bottomSlice,
      dst: aSlice,
      mediating: findArrow("⊥", "a"),
    }
    const invalidRight: SliceArrow<Obj, Arr> = {
      src: bottomSlice,
      dst: aSlice,
      mediating: findArrow("⊥", "a"),
    }
    expect(() => product.pair(leftLeg, invalidRight)).toThrow(/right factor/)
  })
})
