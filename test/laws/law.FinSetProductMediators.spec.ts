import { describe, expect, it } from "vitest"

import {
  CategoryLimits,
  FinSet,
  FinSetProductsWithTuple,
  makeFinSetObj,
} from "../../allTS"
import type { FinSetMor, FinSetObj } from "../../allTS"

const arrowEquals = (left: FinSetMor, right: FinSetMor): boolean => {
  const eq = FinSet.equalMor
  if (eq) return eq(left, right)
  if (left.from !== right.from || left.to !== right.to) return false
  if (left.map.length !== right.map.length) return false
  return left.map.every((value, index) => value === right.map[index])
}

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  expect(arrowEquals(left, right)).toBe(true)
}

describe("FinSet product mediators", () => {
  it("rebuilds the diagonal on A×A", () => {
    const A = makeFinSetObj(["a₀", "a₁", "a₂"])
    const { obj: product, projections } = FinSetProductsWithTuple.product([A, A])
    const diagonal = FinSetProductsWithTuple.tuple(
      A,
      [FinSet.id(A), FinSet.id(A)],
      product,
    )

    const tupleIndex = new Map<string, number>()
    product.elements.forEach((tuple, index) => {
      tupleIndex.set(JSON.stringify(tuple), index)
    })

    const expectedMap = A.elements.map((_, index) => {
      const key = JSON.stringify([index, index])
      const match = tupleIndex.get(key)
      if (match === undefined) {
        throw new Error("Missing diagonal tuple in product carrier")
      }
      return match
    })

    expect(diagonal.map).toEqual(expectedMap)

    const [pi1, pi2] = projections as readonly [FinSetMor, FinSetMor]
    expectEqualArrows(FinSet.compose(pi1, diagonal), FinSet.id(A))
    expectEqualArrows(FinSet.compose(pi2, diagonal), FinSet.id(A))
  })

  it("aligns componentwise pairings with projection composition", () => {
    const A = makeFinSetObj(["a₀", "a₁"])
    const B = makeFinSetObj(["b₀", "b₁", "b₂"])
    const C = makeFinSetObj(["c₀", "c₁"])

    const source = FinSetProductsWithTuple.product([A, B])
    const target = FinSetProductsWithTuple.product([B, C])

    const [sourceLeft, sourceRight] = source.projections as readonly [FinSetMor, FinSetMor]
    const [targetLeft, targetRight] = target.projections as readonly [FinSetMor, FinSetMor]

    const leftComponent: FinSetMor = { from: A, to: B, map: [0, 2] }
    const rightComponent: FinSetMor = { from: B, to: C, map: [0, 1, 0] }

    const expected = FinSetProductsWithTuple.tuple(
      source.obj,
      [FinSet.compose(leftComponent, sourceLeft), FinSet.compose(rightComponent, sourceRight)],
      target.obj,
    )

    const actual = CategoryLimits.componentwiseBinaryProduct<FinSetObj, FinSetMor>({
      category: { compose: FinSet.compose },
      source: {
        object: source.obj,
        projections: [sourceLeft, sourceRight],
        tuple: (domain, legs) => FinSetProductsWithTuple.tuple(domain, legs, source.obj),
      },
      target: {
        object: target.obj,
        projections: [targetLeft, targetRight],
        tuple: (domain, legs) => FinSetProductsWithTuple.tuple(domain, legs, target.obj),
      },
      components: [leftComponent, rightComponent],
    })

    expectEqualArrows(actual, expected)
  })

  it("recovers the strict-initial unit on A×0", () => {
    const A = makeFinSetObj(["a₀", "a₁"])
    const zero = FinSet.initialObj
    const product = FinSetProductsWithTuple.product([A, zero])

    const binaryProduct: CategoryLimits.BinaryProductTuple<FinSetObj, FinSetMor> = {
      object: product.obj,
      projections: [product.projections[0]!, product.projections[1]!] as const,
      tuple: (domain, legs) => {
        if (legs.length !== 2) {
          throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
        }
        return FinSetProductsWithTuple.tuple(domain, legs, product.obj)
      },
    }

    const arrows: FinSetMor[] = [
      FinSet.id(A),
      FinSet.id(zero),
      FinSet.id(product.obj),
      product.projections[0]!,
      product.projections[1]!,
    ]

    const category: CategoryLimits.BinaryProductUnitCategory<FinSetObj, FinSetMor> = {
      objects: [A, zero, product.obj],
      arrows,
      eq: (left, right) => arrowEquals(left, right),
      compose: FinSet.compose,
      id: (object) => FinSet.id(object),
      src: (arrow) => arrow.from,
      dst: (arrow) => arrow.to,
    }

    const legs: readonly [FinSetMor, FinSetMor] = [
      FinSet.initialArrow(A),
      FinSet.id(zero),
    ]

    const canonical = CategoryLimits.unitBinaryProduct<FinSetObj, FinSetObj, FinSetMor>({
      category,
      product: binaryProduct,
      factor: {
        object: zero,
        identity: FinSet.id(zero),
      },
      projection: product.projections[1]!,
      legs,
      productIdentity: FinSet.id(product.obj),
    })

    expectEqualArrows(canonical.forward, product.projections[1]!)

    const expectedBackward = FinSetProductsWithTuple.tuple(zero, legs, product.obj)
    expectEqualArrows(canonical.backward, expectedBackward)

    const forwardThenBackward = FinSet.compose(canonical.forward, canonical.backward)
    expectEqualArrows(forwardThenBackward, FinSet.id(zero))

    const backwardThenForward = FinSet.compose(canonical.backward, canonical.forward)
    expectEqualArrows(backwardThenForward, FinSet.id(product.obj))
  })
})
