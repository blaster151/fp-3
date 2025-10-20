import { describe, expect, it } from 'vitest'
import {
  FinSet,
  finsetInitialProductIso,
  finsetProductInitialIso,
  makeFinSetObj,
} from '../../allTS'
import type { FinSetMor } from '../../allTS'

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  const equal =
    FinSet.equalMor?.(left, right) ??
    (left.from === right.from &&
      left.to === right.to &&
      left.map.length === right.map.length &&
      left.map.every((value, idx) => value === right.map[idx]))
  expect(equal).toBe(true)
}

describe('FinSet products with the initial object', () => {
  const A = makeFinSetObj(['a0', 'a1'])
  const arrowFromZeroToA = FinSet.initialArrow(A)

  it('builds an isomorphism A×0 ≅ 0 whose projections factor through 0', () => {
    const witness = finsetProductInitialIso(A)
    const [toA, toZero] = witness.projections

    expectEqualArrows(
      FinSet.compose(witness.forward, witness.backward),
      FinSet.id(FinSet.initialObj),
    )
    expectEqualArrows(
      FinSet.compose(witness.backward, witness.forward),
      FinSet.id(witness.product),
    )

    expectEqualArrows(toZero, witness.forward)
    expectEqualArrows(FinSet.compose(arrowFromZeroToA, witness.forward), toA)
  })

  it('builds an isomorphism 0×A ≅ 0 whose projections factor through 0', () => {
    const witness = finsetInitialProductIso(A)
    const [toZero, toA] = witness.projections

    expectEqualArrows(
      FinSet.compose(witness.forward, witness.backward),
      FinSet.id(FinSet.initialObj),
    )
    expectEqualArrows(
      FinSet.compose(witness.backward, witness.forward),
      FinSet.id(witness.product),
    )

    expectEqualArrows(toZero, witness.forward)
    expectEqualArrows(FinSet.compose(arrowFromZeroToA, witness.forward), toA)
  })

  it('confirms every exhibited arrow into 0 is monic', () => {
    const rightWitness = finsetProductInitialIso(A)
    const leftWitness = finsetInitialProductIso(A)
    const arrows: FinSetMor[] = [
      rightWitness.forward,
      rightWitness.projections[1]!,
      leftWitness.forward,
      leftWitness.projections[0]!,
      FinSet.id(FinSet.initialObj),
    ]

    for (const arrow of arrows) {
      expect(FinSet.isInjective(arrow)).toBe(true)
    }
  })
})
