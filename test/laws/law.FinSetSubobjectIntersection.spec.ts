import { describe, expect, it } from 'vitest'

import {
  FinSet,
  compareFinSetSubobjectIntersections,
  finsetSubobjectIntersection,
  makeFinSetObj,
  makeFinSetPullbackCalculator,
  type FinSetMor,
  type FinSetObj,
  type FinSetSubobjectIntersectionWitness,
  type IsoWitness,
} from '../../allTS'

const sameObject = (left: FinSetObj, right: FinSetObj): boolean =>
  left === right || (
    left.elements.length === right.elements.length &&
    left.elements.every((value, index) => value === right.elements[index])
  )

const eqArrows = (left: FinSetMor, right: FinSetMor): boolean => {
  const verdict = FinSet.equalMor?.(left, right)
  if (typeof verdict === 'boolean') {
    return verdict
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

describe('FinSetSubobjectIntersection', () => {
  it('builds intersections by pulling back monomorphisms', () => {
    const ambient = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const left = makeFinSetObj(['l0', 'l1', 'l2'])
    const right = makeFinSetObj(['r0', 'r1', 'r2'])

    const includeLeft: FinSetMor = { from: left, to: ambient, map: [0, 1, 3] }
    const includeRight: FinSetMor = { from: right, to: ambient, map: [1, 2, 3] }

    const intersection = finsetSubobjectIntersection(includeLeft, includeRight)

    expect(sameObject(intersection.intersection.subobject, intersection.pullback.apex)).toBe(true)
    expect(intersection.intersection.inclusion.to).toBe(ambient)
    expect(intersection.intersection.inclusion.map).toEqual([1, 3])

    expect(intersection.projections.left.to).toBe(left)
    expect(intersection.projections.right.to).toBe(right)

    expectEqualArrows(
      FinSet.compose(includeLeft, intersection.projections.left),
      intersection.intersection.inclusion,
    )
    expectEqualArrows(
      FinSet.compose(includeRight, intersection.projections.right),
      intersection.intersection.inclusion,
    )

    const identityFactor = intersection.factorCone(intersection.pullback)
    expect(identityFactor.factored).toBe(true)
    expect(identityFactor.mediator).toBeDefined()
    expectEqualArrows(identityFactor.mediator!, FinSet.id(intersection.pullback.apex))

    const mismatchedCone = {
      apex: left,
      toDomain: FinSet.id(left),
      toAnchor: { from: left, to: right, map: [0, 0, 0] as const },
    }
    const mismatch = intersection.factorCone(mismatchedCone)
    expect(mismatch.factored).toBe(false)
    expect(mismatch.reason).toMatch(/equalizer|factor/i)
  })

  it('rejects legs that miss their ambient images', () => {
    const ambient = makeFinSetObj(['a0'])
    const domain = makeFinSetObj(['d0'])

    const invalid: FinSetMor = { from: domain, to: ambient, map: [1] }
    const valid: FinSetMor = { from: domain, to: ambient, map: [0] }

    expect(() => finsetSubobjectIntersection(invalid, valid)).toThrow(/outside the target carrier/i)
    expect(() => finsetSubobjectIntersection(valid, invalid)).toThrow(/outside the target carrier/i)
  })

  it('rejects monomorphisms with distinct codomains', () => {
    const ambient = makeFinSetObj(['a0'])
    const otherAmbient = makeFinSetObj(['b0'])
    const domain = makeFinSetObj(['d0'])

    const includeAmbient: FinSetMor = { from: domain, to: ambient, map: [0] }
    const includeOther: FinSetMor = { from: domain, to: otherAmbient, map: [0] }

    expect(() => finsetSubobjectIntersection(includeAmbient, includeOther)).toThrow(
      /share a codomain/i,
    )
  })

  it('rejects non-monomorphic inputs', () => {
    const ambient = makeFinSetObj(['a0', 'a1'])
    const leftDomain = makeFinSetObj(['l0', 'l1'])
    const rightDomain = makeFinSetObj(['r0'])

    const notMono: FinSetMor = { from: leftDomain, to: ambient, map: [0, 0] }
    const mono: FinSetMor = { from: rightDomain, to: ambient, map: [1] }

    expect(() => finsetSubobjectIntersection(notMono, mono)).toThrow(/not injective/i)
    expect(() => finsetSubobjectIntersection(mono, notMono)).toThrow(/not injective/i)
  })

  it('compares intersection witnesses via unique isomorphisms', () => {
    const ambient = makeFinSetObj(['a0', 'a1', 'a2', 'a3', 'a4'])
    const left = makeFinSetObj(['l0', 'l1', 'l2'])
    const right = makeFinSetObj(['r0', 'r1', 'r2'])

    const includeLeft: FinSetMor = { from: left, to: ambient, map: [0, 2, 4] }
    const includeRight: FinSetMor = { from: right, to: ambient, map: [1, 2, 4] }

    const canonical = finsetSubobjectIntersection(includeLeft, includeRight)

    const reversedApex = makeFinSetObj([...canonical.pullback.apex.elements].reverse())

    const reversedToDomain: FinSetMor = {
      from: reversedApex,
      to: canonical.projections.left.to,
      map: [...canonical.projections.left.map].reverse(),
    }

    const reversedToAnchor: FinSetMor = {
      from: reversedApex,
      to: canonical.projections.right.to,
      map: [...canonical.projections.right.map].reverse(),
    }

    const forwardIsoMap = canonical.pullback.apex.elements.map((_value, index, array) =>
      array.length - 1 - index,
    )
    const forwardIso: FinSetMor = {
      from: canonical.pullback.apex,
      to: reversedApex,
      map: forwardIsoMap,
    }
    const backwardIso: FinSetMor = {
      from: reversedApex,
      to: canonical.pullback.apex,
      map: [...forwardIsoMap].reverse(),
    }

    const isoWitness: IsoWitness<FinSetMor> = {
      forward: forwardIso,
      inverse: backwardIso,
    }

    const calculator = makeFinSetPullbackCalculator()
    const transportedPullback = calculator.transportPullback(
      includeLeft,
      includeRight,
      canonical.pullback,
      isoWitness,
      { apex: reversedApex, toDomain: reversedToDomain, toAnchor: reversedToAnchor },
    )

    const reversedInclusion = FinSet.compose(includeLeft, transportedPullback.toDomain)

    expectEqualArrows(
      reversedInclusion,
      FinSet.compose(includeRight, transportedPullback.toAnchor),
    )

    const reversedWitness: FinSetSubobjectIntersectionWitness = {
      pullback: transportedPullback,
      intersection: { subobject: transportedPullback.apex, inclusion: reversedInclusion },
      projections: { left: transportedPullback.toDomain, right: transportedPullback.toAnchor },
      factorCone: (cone) => calculator.factorCone(transportedPullback, cone),
    }

    const iso = compareFinSetSubobjectIntersections(
      includeLeft,
      includeRight,
      canonical,
      reversedWitness,
    )

    expectEqualArrows(
      FinSet.compose(iso.backward, iso.forward),
      FinSet.id(canonical.pullback.apex),
    )
    expectEqualArrows(
      FinSet.compose(iso.forward, iso.backward),
      FinSet.id(reversedApex),
    )
    expectEqualArrows(
      FinSet.compose(reversedInclusion, iso.forward),
      canonical.intersection.inclusion,
    )
    expectEqualArrows(
      FinSet.compose(canonical.intersection.inclusion, iso.backward),
      reversedInclusion,
    )
  })
})
