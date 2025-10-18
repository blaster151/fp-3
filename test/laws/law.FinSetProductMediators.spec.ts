import { describe, expect, it } from 'vitest'
import {
  CategoryLimits,
  FinSet,
  FinSetProductsWithTuple,
  finsetProductInitialIso,
  makeFinSetObj,
} from '../../allTS'
import type { FinSetMor, FinSetObj } from '../../allTS'

const arrowEquals = (left: FinSetMor, right: FinSetMor): boolean => {
  const eq = FinSet.equalMor
  if (eq) {
    return eq(left, right)
  }
  if (left.from !== right.from || left.to !== right.to || left.map.length !== right.map.length) {
    return false
  }
  for (let idx = 0; idx < left.map.length; idx++) {
    if (left.map[idx] !== right.map[idx]) {
      return false
    }
  }
  return true
}

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  expect(arrowEquals(left, right)).toBe(true)
}

describe('FinSet product mediators', () => {
  it('reconstructs the diagonal on A×A via tuple', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const { obj: product, projections } = FinSet.product([A, A])
    const diagonal = FinSetProductsWithTuple.tuple(
      A,
      [FinSet.id(A), FinSet.id(A)],
      product,
    )

    const [pi1, pi2] = projections as readonly [FinSetMor, FinSetMor]
    expectEqualArrows(FinSet.compose(pi1, diagonal), FinSet.id(A))
    expectEqualArrows(FinSet.compose(pi2, diagonal), FinSet.id(A))
  })

  it('matches componentwise pairings assembled from projections', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0', 'b1', 'b2'])
    const C = makeFinSetObj(['c0', 'c1'])

    const source = FinSet.product([A, B])
    const target = FinSet.product([B, C])

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

  it('recovers the strict-initial unit isomorphism for A×0', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const iso = finsetProductInitialIso(A)
    const [projectionToA, projectionToZero] = iso.projections

    const arrowFromZeroToA: FinSetMor = { from: FinSet.initialObj, to: A, map: [] }
    const idInitial = FinSet.id(FinSet.initialObj)
    const idProduct = FinSet.id(iso.product)

    const registry: FinSetMor[] = [
      FinSet.id(A),
      idInitial,
      idProduct,
      projectionToA,
      projectionToZero,
      iso.forward,
      iso.backward,
    ]

    const category: CategoryLimits.BinaryProductUnitCategory<FinSetObj, FinSetMor> = {
      objects: [A, FinSet.initialObj, iso.product],
      arrows: registry,
      eq: (left, right) => arrowEquals(left, right),
      compose: FinSet.compose,
      id: (object) => FinSet.id(object),
      src: (arrow) => arrow.from,
      dst: (arrow) => arrow.to,
    }

    const canonical = CategoryLimits.unitBinaryProduct<FinSetObj, FinSetObj, FinSetMor>({
      category,
      product: {
        object: iso.product,
        projections: [projectionToA, projectionToZero],
        tuple: (domain, legs) => FinSetProductsWithTuple.tuple(domain, legs, iso.product),
      },
      factor: { object: FinSet.initialObj, identity: idInitial },
      projection: projectionToZero,
      legs: [arrowFromZeroToA, idInitial],
      productIdentity: idProduct,
    })

    expectEqualArrows(canonical.forward, iso.forward)
    expectEqualArrows(canonical.backward, iso.backward)
  })
})
