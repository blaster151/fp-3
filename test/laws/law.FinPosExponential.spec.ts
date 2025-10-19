import { describe, expect, it } from "vitest"

import {
  FinPos,
  FinPosCat,
  type FinPosObj,
  type FinPosExponentialWitness,
  type FinPosProductWitness,
  type MonoMap,
} from "../../models/finpos-cat"

const makeChain = (name: string, elements: readonly string[]): FinPosObj => {
  const rank = new Map(elements.map((value, index) => [value, index]))
  return {
    name,
    elems: [...elements],
    leq: (left, right) => (rank.get(left) ?? -1) <= (rank.get(right) ?? -1),
  }
}

const A = makeChain("A₂", ["a0", "a1"])
const B = makeChain("B₂", ["b0", "b1"])
const C = makeChain("C₃", ["c0", "c1", "c2"])

const productAB: FinPosProductWitness = FinPos.product(A, B, { name: "A₂×B₂" })
const exponential: FinPosExponentialWitness = FinPos.exponential(B, C)

const category = FinPosCat([A, B, C])

describe("FinPos exponentials", () => {
  it("orders monotone maps pointwise", () => {
    for (const argument of B.elems) {
      const valueAtArgument: MonoMap = {
        name: `ev_${argument}`,
        dom: exponential.object.name,
        cod: C.name,
        map: (functionName: string) => exponential.lookup(functionName).map(argument),
      }
      expect(FinPos.isMonotone(exponential.object, C, valueAtArgument)).toBe(true)
    }
  })

  it("supplies a monotone evaluation arrow", () => {
    const { product, arrow } = exponential.evaluation
    expect(FinPos.isMonotone(product.object, C, arrow)).toBe(true)
  })

  it("curries every monotone arrow A×B → C uniquely", () => {
    const mediator: MonoMap = {
      name: "h",
      dom: productAB.object.name,
      cod: C.name,
      map: (value: string) => {
        const [a, b] = productAB.decompose(value)
        if (a === "a0" && b === "b0") return "c0"
        if (a === "a0" && b === "b1") return "c1"
        if (a === "a1" && b === "b0") return "c1"
        return "c2"
      },
    }

    expect(FinPos.isMonotone(productAB.object, C, mediator)).toBe(true)

    const curried = exponential.curry({ domain: A, product: productAB, arrow: mediator })

    const firstLeg = category.compose(curried, productAB.projection1)
    const secondLeg = productAB.projection2
    const lifting = exponential.evaluation.product.pair(productAB.object, firstLeg, secondLeg)
    const recomposed = category.compose(exponential.evaluation.arrow, lifting)

    expect(category.eq(recomposed, mediator)).toBe(true)

    const candidates = FinPos.generalizedElements(A, exponential.object)
    const factors = candidates.filter((candidate) => {
      const left = category.compose(candidate, productAB.projection1)
      const right = productAB.projection2
      const through = exponential.evaluation.product.pair(productAB.object, left, right)
      const recovered = category.compose(exponential.evaluation.arrow, through)
      return category.eq(recovered, mediator)
    })

    expect(factors).toHaveLength(1)
    expect(category.eq(factors[0]!, curried)).toBe(true)
  })
})
