import { describe, expect, it } from 'vitest'
import {
  FinSet,
  FinSetProductsWithTuple,
  assertFinSetMor,
  finsetProductPullback,
  makeFinSetObj,
  type FinSetMor,
} from '../../allTS'

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  const equal = FinSet.equalMor?.(left, right)
  if (typeof equal === 'boolean') {
    expect(equal).toBe(true)
    return
  }

  expect(left.from).toBe(right.from)
  expect(left.to).toBe(right.to)
  expect(left.map.length).toBe(right.map.length)
  for (let idx = 0; idx < left.map.length; idx++) {
    expect(left.map[idx]).toBe(right.map[idx])
  }
}

describe('FinSet product-as-pullback helper', () => {
  it('reuses the product projections and terminal legs', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0'])

    const witness = finsetProductPullback(A, B)

    expect(witness.projectionIntoLeft.from).toBe(witness.product)
    expect(witness.projectionIntoLeft.to).toBe(A)
    expect(witness.projectionIntoRight.from).toBe(witness.product)
    expect(witness.projectionIntoRight.to).toBe(B)

    expect(witness.leftTerminate.from).toBe(A)
    expect(witness.leftTerminate.to).toBe(FinSet.terminalObj)
    expect(witness.rightTerminate.from).toBe(B)
    expect(witness.rightTerminate.to).toBe(FinSet.terminalObj)

    const leftComposite = FinSet.compose(witness.leftTerminate, witness.projectionIntoLeft)
    const rightComposite = FinSet.compose(witness.rightTerminate, witness.projectionIntoRight)
    expectEqualArrows(leftComposite, rightComposite)

    const identityMediator = witness.factorCone({
      object: witness.product,
      intoLeft: witness.projectionIntoLeft,
      intoRight: witness.projectionIntoRight,
    })
    expectEqualArrows(identityMediator, FinSet.id(witness.product))
  })

  it('factors wedges uniquely through the product apex', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0', 'b1'])
    const witness = finsetProductPullback(A, B)

    const X = makeFinSetObj(['x0', 'x1', 'x2'])
    const intoLeft = assertFinSetMor({ from: X, to: A, map: [0, 1, 0] })
    const intoRight = assertFinSetMor({ from: X, to: B, map: [1, 0, 1] })

    const mediator = witness.factorCone({ object: X, intoLeft, intoRight })
    expectEqualArrows(FinSet.compose(witness.projectionIntoLeft, mediator), intoLeft)
    expectEqualArrows(FinSet.compose(witness.projectionIntoRight, mediator), intoRight)

    const secondMediator = witness.factorCone({ object: X, intoLeft, intoRight })
    expectEqualArrows(secondMediator, mediator)

    const tupleMediator = FinSetProductsWithTuple.tuple(X, [intoLeft, intoRight], witness.product)
    expectEqualArrows(tupleMediator, mediator)
  })

  it('rejects wedges that do not match the product span', () => {
    const A = makeFinSetObj(['a0'])
    const B = makeFinSetObj(['b0', 'b1'])
    const witness = finsetProductPullback(A, B)

    const X = makeFinSetObj(['x0'])
    const intoLeft = assertFinSetMor({ from: X, to: A, map: [0] })
    const intoRight = assertFinSetMor({ from: X, to: B, map: [1] })

    expect(() =>
      witness.factorCone({ object: makeFinSetObj(['y0']), intoLeft, intoRight }),
    ).toThrow(/cone tip/)

    const skewLeft = assertFinSetMor({ from: X, to: B, map: [0] })
    expect(() => witness.factorCone({ object: X, intoLeft: skewLeft, intoRight })).toThrow(/left factor/)

    const skewRight = assertFinSetMor({ from: X, to: A, map: [0] })
    expect(() => witness.factorCone({ object: X, intoLeft, intoRight: skewRight })).toThrow(/right factor/)
  })
})
