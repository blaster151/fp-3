import { describe, expect, it } from "vitest"

import { checkProductUP } from "../../product-up"
import { isEpi } from "../../kinds/mono-epi"
import {
  makeToyNonEpicProductCategory,
  type ToyArrow,
  type ToyObject,
} from "../../models/toy-non-epi-product"
import type { Functor } from "../../functor"

const arrowSamples = ["leg", "id_source", "id_target"] as const

type ObjX = "source" | "target"
type ArrX = (typeof arrowSamples)[number]

describe("Product projections need not be epic", () => {
  const category = makeToyNonEpicProductCategory()
  const { product, nonEpicWitness } = category
  const compose = category.compose

  const objectSamples: readonly ObjX[] = ["source", "target"]

  const F: Functor<ObjX, ArrX, ToyObject, ToyArrow> = {
    F0: (object) => (object === "source" ? product.object : "A"),
    F1: (arrow) => {
      switch (arrow) {
        case "leg":
          return product.projections[0]
        case "id_source":
          return category.id(product.object)
        case "id_target":
          return category.id("A")
      }
    },
  }

  const G: Functor<ObjX, ArrX, ToyObject, ToyArrow> = {
    F0: (object) => (object === "source" ? product.object : "B"),
    F1: (arrow) => {
      switch (arrow) {
        case "leg":
          return product.projections[1]
        case "id_source":
          return category.id(product.object)
        case "id_target":
          return category.id("B")
      }
    },
  }

  const H: Functor<ObjX, ArrX, readonly [ToyObject, ToyObject], {
    readonly src: readonly [ToyObject, ToyObject]
    readonly dst: readonly [ToyObject, ToyObject]
    readonly cf: ToyArrow
    readonly dg: ToyArrow
  }> = {
    F0: (object) => (object === "source" ? [product.object, product.object] : ["A", "B"]),
    F1: (arrow) => {
      switch (arrow) {
        case "leg":
          return {
            src: [product.object, product.object],
            dst: ["A", "B"],
            cf: compose(product.projections[0], category.id(product.object)),
            dg: compose(product.projections[1], category.id(product.object)),
          }
        case "id_source":
          return {
            src: [product.object, product.object],
            dst: [product.object, product.object],
            cf: category.id(product.object),
            dg: category.id(product.object),
          }
        case "id_target":
          return {
            src: ["A", "B"],
            dst: ["A", "B"],
            cf: category.id("A"),
            dg: category.id("B"),
          }
      }
    },
  }

  it("witnesses the binary product of A and B", () => {
    const holds = checkProductUP(
      category,
      category,
      F,
      G,
      H,
      objectSamples,
      arrowSamples,
      {
        eqCArr: category.eq,
        eqDArr: category.eq,
      },
    )
    expect(holds).toBe(true)
  })

  it("exhibits distinct arrows collapsing through π₁", () => {
    const [first, second] = nonEpicWitness.parallel
    const { projection, composite } = nonEpicWitness

    expect(category.eq(first, second)).toBe(false)
    expect(category.eq(compose(first, projection), composite)).toBe(true)
    expect(category.eq(compose(second, projection), composite)).toBe(true)
  })

  it("confirms π₁ fails to be an epimorphism", () => {
    expect(isEpi(category, nonEpicWitness.projection)).toBe(false)
  })

  it("still validates π₁ as an epimorphism when restricted to identities", () => {
    const restriction = category.eq(
      compose(category.id("A"), nonEpicWitness.projection),
      nonEpicWitness.projection,
    )
    expect(restriction).toBe(true)
  })
})

