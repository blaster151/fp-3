import { describe, expect, it } from 'vitest'
import {
  FinSet,
  assertFinSetMor,
  finsetPushout,
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

describe('FinSet pushout via quotient coproducts', () => {
  it('packages the quotient apex together with canonical injections', () => {
    const X = makeFinSetObj(['x0', 'x1'])
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0', 'b1', 'b2'])

    const f = assertFinSetMor({ from: X, to: A, map: [0, 0] })
    const g = assertFinSetMor({ from: X, to: B, map: [1, 2] })

    const witness = finsetPushout(f, g)

    expect(witness.fromDomain.from).toBe(A)
    expect(witness.fromAnchor.from).toBe(B)
    expect(witness.fromDomain.to).toBe(witness.apex)
    expect(witness.fromAnchor.to).toBe(witness.apex)
    expect(witness.quotient.from).toBe(witness.coproduct)
    expect(witness.quotient.to).toBe(witness.apex)

    const leftComposite = FinSet.compose(witness.fromDomain, f)
    const rightComposite = FinSet.compose(witness.fromAnchor, g)
    expectEqualArrows(leftComposite, rightComposite)

    // a0 is identified with b1 and b2 while a1 and b0 stay distinct
    expect(witness.apex.elements.length).toBe(3)
    expect(witness.fromDomain.map).toEqual([0, 1])
    expect(witness.fromAnchor.map).toEqual([2, 0, 0])
  })

  it('factors commuting wedges uniquely through the pushout', () => {
    const X = makeFinSetObj(['x0', 'x1'])
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0', 'b1', 'b2'])

    const f = assertFinSetMor({ from: X, to: A, map: [0, 0] })
    const g = assertFinSetMor({ from: X, to: B, map: [1, 2] })
    const witness = finsetPushout(f, g)

    const Z = makeFinSetObj(['z0', 'z1', 'z2'])
    const fromLeft = assertFinSetMor({ from: A, to: Z, map: [0, 1] })
    const fromRight = assertFinSetMor({ from: B, to: Z, map: [2, 0, 0] })

    const mediator = witness.factorCocone({ object: Z, fromLeft, fromRight })
    expect(mediator.from).toBe(witness.apex)
    expect(mediator.to).toBe(Z)
    expect(mediator.map).toEqual([0, 1, 2])

    expectEqualArrows(FinSet.compose(mediator, witness.fromDomain), fromLeft)
    expectEqualArrows(FinSet.compose(mediator, witness.fromAnchor), fromRight)

    const secondMediator = witness.factorCocone({ object: Z, fromLeft, fromRight })
    expectEqualArrows(secondMediator, mediator)
  })

  it('rejects wedges that fail the universal property checks', () => {
    const X = makeFinSetObj(['x0'])
    const A = makeFinSetObj(['a0'])
    const B = makeFinSetObj(['b0', 'b1'])

    const f = assertFinSetMor({ from: X, to: A, map: [0] })
    const g = assertFinSetMor({ from: X, to: B, map: [0] })
    const witness = finsetPushout(f, g)

    const Z = makeFinSetObj(['z0', 'z1'])
    const fromLeft = assertFinSetMor({ from: A, to: Z, map: [0] })
    const fromRight = assertFinSetMor({ from: B, to: Z, map: [0, 1] })

    const skewRight = assertFinSetMor({ from: B, to: Z, map: [1, 1] })
    expect(() => witness.factorCocone({ object: Z, fromLeft, fromRight: skewRight })).toThrow(/pushout/)

    const skewDomain = assertFinSetMor({ from: makeFinSetObj(['c0']), to: Z, map: [0] })
    expect(() => witness.factorCocone({ object: Z, fromLeft: skewDomain, fromRight })).toThrow(/codomains/)

    const nonCommutingRight = assertFinSetMor({ from: B, to: Z, map: [0, 0] })
    expect(() => witness.factorCocone({ object: Z, fromLeft, fromRight: nonCommutingRight })).toThrow(/commute/)
  })
})
