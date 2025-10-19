import { describe, expect, it } from 'vitest'

import {
  FinSetSubobjectClassifier,
  finsetBottomSubobject,
  finsetIdentitySubobject,
  finsetSubobjectLeq,
  finsetSubobjectPartialOrder,
  finsetTopSubobject,
  finsetZeroSubobject,
  makeFinSetObj,
  type FinSetMor,
  type FinSetObj,
} from '../../allTS'

const sameObject = (left: FinSetObj, right: FinSetObj): boolean =>
  left === right || (
    left.elements.length === right.elements.length &&
    left.elements.every((value, index) => value === right.elements[index])
  )

const eqArrows = (left: FinSetMor, right: FinSetMor): boolean => {
  const verdict = FinSetSubobjectClassifier.equalMor?.(left, right)
  if (typeof verdict === 'boolean' && verdict) {
    return true
  }

  return (
    sameObject(left.from, right.from) &&
    sameObject(left.to, right.to) &&
    left.map.length === right.map.length &&
    left.map.every((value, index) => value === right.map[index])
  )
}

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  expect(eqArrows(left, right)).toBe(true)
}

describe('FinSet subobject order', () => {
  it('establishes reflexivity and transitivity of the subobject preorder', () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2', 'x3'])

    const tiny = makeFinSetObj(['t0'])
    const mid = makeFinSetObj(['m0', 'm1'])
    const large = makeFinSetObj(['l0', 'l1', 'l2'])

    const includeTiny: FinSetMor = { from: tiny, to: X, map: [0] }
    const includeMid: FinSetMor = { from: mid, to: X, map: [0, 2] }
    const includeLarge: FinSetMor = { from: large, to: X, map: [0, 1, 2] }

    const reflexive = finsetSubobjectLeq(includeMid, includeMid)
    expect(reflexive.holds).toBe(true)
    expect(reflexive.mediator).toBeDefined()
    expectEqualArrows(reflexive.mediator!, FinSetSubobjectClassifier.id(mid))

    const tinyLeqMid = finsetSubobjectLeq(includeTiny, includeMid)
    const midLeqLarge = finsetSubobjectLeq(includeMid, includeLarge)
    const tinyLeqLarge = finsetSubobjectLeq(includeTiny, includeLarge)

    expect(tinyLeqMid.holds).toBe(true)
    expect(midLeqLarge.holds).toBe(true)
    expect(tinyLeqLarge.holds).toBe(true)

    const composed = FinSetSubobjectClassifier.compose(
      midLeqLarge.mediator!,
      tinyLeqMid.mediator!,
    )
    expectEqualArrows(composed, tinyLeqLarge.mediator!)
  })

  it('upgrades mutual comparisons into the promised isomorphism', () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2'])
    const left = makeFinSetObj(['l0', 'l1'])
    const right = makeFinSetObj(['r0', 'r1'])

    const includeLeft: FinSetMor = { from: left, to: X, map: [0, 2] }
    const includeRight: FinSetMor = { from: right, to: X, map: [0, 2] }

    const verdict = finsetSubobjectPartialOrder(includeLeft, includeRight)
    expect(verdict.leftLeqRight.holds).toBe(true)
    expect(verdict.rightLeqLeft.holds).toBe(true)
    expect(verdict.isomorphic).toBeDefined()

    const iso = verdict.isomorphic!
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(iso.backward, iso.forward),
      FinSetSubobjectClassifier.id(left),
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(iso.forward, iso.backward),
      FinSetSubobjectClassifier.id(right),
    )

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(includeRight, iso.forward),
      includeLeft,
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(includeLeft, iso.backward),
      includeRight,
    )
  })

  it('exhibits the top and bottom subobjects as extremal elements', () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2'])
    const mid = makeFinSetObj(['m0', 'm1'])

    const includeMid: FinSetMor = { from: mid, to: X, map: [0, 2] }
    const identity = finsetIdentitySubobject(X)
    const zero = finsetZeroSubobject(X)

    expectEqualArrows(identity.inclusion, FinSetSubobjectClassifier.id(X))
    expectEqualArrows(zero.inclusion, FinSetSubobjectClassifier.initialArrow(X))

    const top = finsetTopSubobject(X)
    const midBelowTop = top.dominates(includeMid)
    expect(midBelowTop.holds).toBe(true)
    expectEqualArrows(midBelowTop.mediator!, includeMid)

    const topSelf = top.dominates(identity.inclusion)
    expect(topSelf.holds).toBe(true)
    expectEqualArrows(topSelf.mediator!, FinSetSubobjectClassifier.id(X))

    const bottom = finsetBottomSubobject(X)
    const zeroIntoMid = bottom.subordinate(includeMid)
    expect(zeroIntoMid.holds).toBe(true)
    expectEqualArrows(
      zeroIntoMid.mediator!,
      FinSetSubobjectClassifier.initialArrow(mid),
    )

    const bottomSelf = bottom.subordinate(zero.inclusion)
    expect(bottomSelf.holds).toBe(true)
    expectEqualArrows(
      bottomSelf.mediator!,
      FinSetSubobjectClassifier.id(zero.subobject),
    )
  })

  it('rejects codomain mismatches and non-monic candidates', () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2'])
    const Y = makeFinSetObj(['y0', 'y1'])
    const S = makeFinSetObj(['s0'])
    const T = makeFinSetObj(['t0', 't1'])

    const includeS: FinSetMor = { from: S, to: X, map: [0] }
    const includeT: FinSetMor = { from: T, to: X, map: [1, 2] }
    const mismatch: FinSetMor = { from: S, to: Y, map: [0] }
    const nonMono: FinSetMor = { from: T, to: X, map: [0, 0] }

    const mismatchVerdict = finsetSubobjectLeq(includeS, mismatch)
    expect(mismatchVerdict.holds).toBe(false)
    expect(mismatchVerdict.reason).toMatch(/codomain/i)

    const top = finsetTopSubobject(X)
    expect(() => top.dominates(nonMono)).toThrow(/mono/i)

    const bottom = finsetBottomSubobject(X)
    const incomparable = bottom.subordinate(includeT)
    expect(incomparable.holds).toBe(true)

    const failedComparison = finsetSubobjectLeq(includeT, includeS)
    expect(failedComparison.holds).toBe(false)
    expect(failedComparison.reason).toMatch(/factor|image/i)
  })
})
