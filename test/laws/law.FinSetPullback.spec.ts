import { describe, expect, it } from 'vitest'
import { FinSet, finsetPullback, makeFinSetObj } from '../../allTS'
import type { FinSetMor } from '../../allTS'

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

describe('FinSet pullback/intersection helper', () => {
  it('computes the carrier X ∩ Y and makes the square commute', () => {
    const Z = makeFinSetObj(['z0', 'z1', 'z2', 'z3'])
    const X = makeFinSetObj(['z0', 'z2'])
    const Y = makeFinSetObj(['z1', 'z2', 'z3'])

    const inclusionX: FinSetMor = { from: X, to: Z, map: [0, 2] }
    const inclusionY: FinSetMor = { from: Y, to: Z, map: [1, 2, 3] }

    const pullback = finsetPullback(inclusionX, inclusionY)

    expect(pullback.object.elements).toEqual([Z.elements[2]])

    expect(pullback.inclusionIntoLeft.to).toBe(X)
    expect(pullback.inclusionIntoRight.to).toBe(Y)

    expectEqualArrows(
      FinSet.compose(inclusionX, pullback.inclusionIntoLeft),
      pullback.toCodomain,
    )
    expectEqualArrows(
      FinSet.compose(inclusionY, pullback.inclusionIntoRight),
      pullback.toCodomain,
    )
  })

  it('factors commuting cones uniquely through the intersection', () => {
    const Z = makeFinSetObj(['z0', 'z1', 'z2'])
    const X = makeFinSetObj(['z0', 'z2'])
    const Y = makeFinSetObj(['z1', 'z2'])

    const inclusionX: FinSetMor = { from: X, to: Z, map: [0, 2] }
    const inclusionY: FinSetMor = { from: Y, to: Z, map: [1, 2] }

    const pullback = finsetPullback(inclusionX, inclusionY)

    const W = makeFinSetObj(['w0', 'w1'])
    const intoX: FinSetMor = { from: W, to: X, map: [1, 1] }
    const intoY: FinSetMor = { from: W, to: Y, map: [1, 1] }

    const mediator = pullback.factorCone({ object: W, intoLeft: intoX, intoRight: intoY })

    expectEqualArrows(FinSet.compose(pullback.inclusionIntoLeft, mediator), intoX)
    expectEqualArrows(FinSet.compose(pullback.inclusionIntoRight, mediator), intoY)

    const secondMediator = pullback.factorCone({ object: W, intoLeft: intoX, intoRight: intoY })
    expectEqualArrows(mediator, secondMediator)

    const badIntoY: FinSetMor = { from: W, to: Y, map: [0, 0] }
    expect(() => pullback.factorCone({ object: W, intoLeft: intoX, intoRight: badIntoY })).toThrow()
  })

  it('recovers the other leg when intersecting with an identity inclusion', () => {
    const Z = makeFinSetObj(['z0', 'z1'])
    const X = makeFinSetObj(['z0'])

    const idZ = FinSet.id(Z)
    const inclusionX: FinSetMor = { from: X, to: Z, map: [0] }

    const pullback = finsetPullback(idZ, inclusionX)

    expect(pullback.object.elements).toEqual(X.elements)
    expectEqualArrows(pullback.inclusionIntoLeft, inclusionX)
    expectEqualArrows(pullback.inclusionIntoRight, FinSet.id(X))

    const W = makeFinSetObj(['w'])
    const intoZ: FinSetMor = { from: W, to: Z, map: [0] }
    const intoX: FinSetMor = { from: W, to: X, map: [0] }

    const mediator = pullback.factorCone({ object: W, intoLeft: intoZ, intoRight: intoX })
    expectEqualArrows(FinSet.compose(pullback.inclusionIntoLeft, mediator), intoZ)
    expectEqualArrows(FinSet.compose(pullback.inclusionIntoRight, mediator), intoX)
  })
})
