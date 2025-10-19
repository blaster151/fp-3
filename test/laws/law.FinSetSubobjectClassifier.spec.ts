import { describe, expect, it } from 'vitest'

import {
  FinSetSubobjectClassifier,
  finsetCharacteristicPullback,
  finsetSubobjectLeq,
  finsetSubobjectPartialOrder,
  makeFinSetObj,
  type FinSetMor,
  type FinSetObj,
  type PullbackData,
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

const buildIsoFromCanonical = (
  canonical: { readonly subobject: FinSetObj; readonly inclusion: FinSetMor },
  mono: FinSetMor,
): { readonly forward: FinSetMor; readonly backward: FinSetMor } => {
  const forwardMap = canonical.inclusion.map.map((codomainIndex) => {
    const domainIndex = mono.map.indexOf(codomainIndex)
    if (domainIndex < 0) {
      throw new Error('buildIsoFromCanonical: mono does not hit the canonical fibre index')
    }
    return domainIndex
  })

  const backwardMap = mono.map.map((codomainIndex) => {
    const canonicalIndex = canonical.inclusion.map.indexOf(codomainIndex)
    if (canonicalIndex < 0) {
      throw new Error('buildIsoFromCanonical: canonical fibre missing mono image')
    }
    return canonicalIndex
  })

  return {
    forward: { from: canonical.subobject, to: mono.from, map: forwardMap },
    backward: { from: mono.from, to: canonical.subobject, map: backwardMap },
  }
}

describe('FinSetSubobjectClassifier', () => {
  it('classifies monomorphisms via truth-valued characteristic maps', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const S = makeFinSetObj(['s0', 's1'])
    const inclusion: FinSetMor = { from: S, to: A, map: [0, 2] }

    const chi = FinSetSubobjectClassifier.characteristic(inclusion)

    expect(chi.from).toBe(A)
    expect(chi.to).toBe(FinSetSubobjectClassifier.truthValues)
    expect(chi.map).toEqual([1, 0, 1])

    const truthComposite = FinSetSubobjectClassifier.compose(
      FinSetSubobjectClassifier.truthArrow,
      FinSetSubobjectClassifier.terminate(S),
    )

    const charComposite = FinSetSubobjectClassifier.compose(chi, inclusion)
    expectEqualArrows(charComposite, truthComposite)
  })

  it('reconstructs subobjects from characteristic maps', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const S = makeFinSetObj(['s0', 's1'])
    const inclusion: FinSetMor = { from: S, to: A, map: [1, 3] }

    const chi = FinSetSubobjectClassifier.characteristic(inclusion)
    const canonical = FinSetSubobjectClassifier.subobjectFromCharacteristic(chi)
    const pullbackWitness = finsetCharacteristicPullback(chi)

    expect(canonical.subobject.elements).toEqual(['a1', 'a3'])
    expect(canonical.inclusion.to).toBe(A)
    expect(canonical.inclusion.map).toEqual([1, 3])

    expectEqualArrows(pullbackWitness.inclusion, canonical.inclusion)
    expect(sameObject(pullbackWitness.subobject, canonical.subobject)).toBe(true)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(chi, pullbackWitness.inclusion),
      FinSetSubobjectClassifier.compose(
        FinSetSubobjectClassifier.truthArrow,
        pullbackWitness.terminalProjection,
      ),
    )

    const canonicalTruth = FinSetSubobjectClassifier.compose(
      FinSetSubobjectClassifier.truthArrow,
      FinSetSubobjectClassifier.terminate(canonical.subobject),
    )

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(chi, canonical.inclusion),
      canonicalTruth,
    )

    expectEqualArrows(
      FinSetSubobjectClassifier.characteristic(canonical.inclusion),
      chi,
    )
  })

  it('packages the truth pullback universal property for characteristic maps', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const S = makeFinSetObj(['s0', 's1'])
    const inclusion: FinSetMor = { from: S, to: A, map: [1, 3] }

    const chi = FinSetSubobjectClassifier.characteristic(inclusion)
    const pullbackWitness = finsetCharacteristicPullback(chi)

    expect(pullbackWitness.squareCommutes).toBe(true)
    expect(pullbackWitness.certification.valid).toBe(true)
    expectEqualArrows(
      pullbackWitness.characteristicComposite,
      FinSetSubobjectClassifier.compose(chi, pullbackWitness.inclusion),
    )
    expectEqualArrows(
      pullbackWitness.truthComposite,
      FinSetSubobjectClassifier.compose(
        FinSetSubobjectClassifier.truthArrow,
        pullbackWitness.terminalProjection,
      ),
    )

    const wedge = makeFinSetObj(['w0', 'w1'])
    const wedgeToAmbient: FinSetMor = { from: wedge, to: A, map: [1, 3] }
    const wedgeToTerminal = FinSetSubobjectClassifier.terminate(wedge)

    const commutingCone: PullbackData<FinSetObj, FinSetMor> = {
      apex: wedge,
      toDomain: wedgeToAmbient,
      toAnchor: wedgeToTerminal,
    }

    const factoring = pullbackWitness.factorCone(commutingCone)
    expect(factoring.factored).toBe(true)
    expect(factoring.mediator).toBeDefined()
    const mediator = factoring.mediator!
    wedge.elements.forEach((_value, index) => {
      const apexIndex = mediator.map[index]
      if (apexIndex === undefined) {
        throw new Error('FinSetSubobjectClassifier: mediator misses apex index')
      }
      expect(pullbackWitness.inclusion.map[apexIndex]).toBe(wedgeToAmbient.map[index])
      expect(pullbackWitness.terminalProjection.map[apexIndex]).toBe(
        wedgeToTerminal.map[index],
      )
    })

    const skewCone: PullbackData<FinSetObj, FinSetMor> = {
      apex: wedge,
      toDomain: { from: wedge, to: A, map: [1, 2] },
      toAnchor: wedgeToTerminal,
    }

    const skewFactoring = pullbackWitness.factorCone(skewCone)
    expect(skewFactoring.factored).toBe(false)
    expect(skewFactoring.reason).toMatch(/equalizer|pullback|factor/i)
  })

  it('identifies isomorphic subobjects sharing a characteristic map', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const left = makeFinSetObj(['u0', 'u1'])
    const right = makeFinSetObj(['v0', 'v1'])

    const includeLeft: FinSetMor = { from: left, to: A, map: [0, 2] }
    const includeRight: FinSetMor = { from: right, to: A, map: [0, 2] }

    const chiLeft = FinSetSubobjectClassifier.characteristic(includeLeft)
    const chiRight = FinSetSubobjectClassifier.characteristic(includeRight)

    expectEqualArrows(chiLeft, chiRight)

    const canonical = FinSetSubobjectClassifier.subobjectFromCharacteristic(chiLeft)

    const isoLeft = buildIsoFromCanonical(canonical, includeLeft)
    const isoRight = buildIsoFromCanonical(canonical, includeRight)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(isoLeft.backward, isoLeft.forward),
      FinSetSubobjectClassifier.id(canonical.subobject),
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(isoLeft.forward, isoLeft.backward),
      FinSetSubobjectClassifier.id(left),
    )

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(isoRight.backward, isoRight.forward),
      FinSetSubobjectClassifier.id(canonical.subobject),
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(isoRight.forward, isoRight.backward),
      FinSetSubobjectClassifier.id(right),
    )

    const forward = FinSetSubobjectClassifier.compose(isoRight.forward, isoLeft.backward)
    const backward = FinSetSubobjectClassifier.compose(isoLeft.forward, isoRight.backward)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(backward, forward),
      FinSetSubobjectClassifier.id(left),
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(forward, backward),
      FinSetSubobjectClassifier.id(right),
    )
  })

  it('rejects malformed characteristic maps through the pullback helper', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const malformed: FinSetMor = {
      from: A,
      to: FinSetSubobjectClassifier.truthValues,
      map: [0, 2, 1],
    }

    expect(() => finsetCharacteristicPullback(malformed)).toThrow(/pullback|truth/i)
  })

  it('rejects non-monic arrows and non truth-valued characteristic maps', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const S = makeFinSetObj(['s0', 's1'])

    const nonMono: FinSetMor = { from: S, to: A, map: [0, 0] }
    expect(() => FinSetSubobjectClassifier.characteristic(nonMono)).toThrow(/injective|mono/i)

    const skewCodomain: FinSetMor = { from: A, to: A, map: [0, 1] }
    expect(() => FinSetSubobjectClassifier.subobjectFromCharacteristic(skewCodomain)).toThrow(/truth/i)

    const badTruth: FinSetMor = {
      from: A,
      to: FinSetSubobjectClassifier.truthValues,
      map: [0, 2],
    }
    expect(() => FinSetSubobjectClassifier.subobjectFromCharacteristic(badTruth)).toThrow(/truth/i)
  })

  it('detects the subobject order via reflexivity and transitivity', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])

    const tiny = makeFinSetObj(['t0'])
    const mid = makeFinSetObj(['m0', 'm1'])
    const large = makeFinSetObj(['l0', 'l1', 'l2'])

    const includeTiny: FinSetMor = { from: tiny, to: A, map: [0] }
    const includeMid: FinSetMor = { from: mid, to: A, map: [0, 2] }
    const includeLarge: FinSetMor = { from: large, to: A, map: [0, 1, 2] }

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

    const composed = FinSetSubobjectClassifier.compose(midLeqLarge.mediator!, tinyLeqMid.mediator!)
    expectEqualArrows(composed, tinyLeqLarge.mediator!)
  })

  it('certifies antisymmetry by producing subobject isomorphisms', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const left = makeFinSetObj(['u0', 'u1'])
    const right = makeFinSetObj(['v0', 'v1'])

    const includeLeft: FinSetMor = { from: left, to: A, map: [0, 2] }
    const includeRight: FinSetMor = { from: right, to: A, map: [0, 2] }

    const comparison = finsetSubobjectPartialOrder(includeLeft, includeRight)

    expect(comparison.leftLeqRight.holds).toBe(true)
    expect(comparison.rightLeqLeft.holds).toBe(true)
    expect(comparison.isomorphic).toBeDefined()

    const iso = comparison.isomorphic!
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

  it('rejects incomparable subobjects and codomain mismatches', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const B = makeFinSetObj(['b0', 'b1'])

    const S = makeFinSetObj(['s0'])
    const T = makeFinSetObj(['t0', 't1'])

    const includeS: FinSetMor = { from: S, to: A, map: [0] }
    const includeT: FinSetMor = { from: T, to: A, map: [1, 2] }
    const mismatch: FinSetMor = { from: S, to: B, map: [0] }

    const incomparable = finsetSubobjectLeq(includeT, includeS)
    expect(incomparable.holds).toBe(false)
    expect(incomparable.reason).toMatch(/factor|image/i)

    const mismatchVerdict = finsetSubobjectLeq(includeS, mismatch)
    expect(mismatchVerdict.holds).toBe(false)
    expect(mismatchVerdict.reason).toMatch(/codomain/i)
  })

  it('throws when supplied arrows are not monomorphisms', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const S = makeFinSetObj(['s0', 's1'])

    const mono: FinSetMor = { from: S, to: A, map: [0, 1] }
    const nonMono: FinSetMor = { from: S, to: A, map: [0, 0] }

    expect(() => finsetSubobjectLeq(nonMono, mono)).toThrow(/mono/i)
    expect(() => finsetSubobjectLeq(mono, nonMono)).toThrow(/mono/i)

    expect(() => finsetSubobjectPartialOrder(nonMono, mono)).toThrow(/mono/i)
  })

  it('does not claim isomorphism when only one comparison succeeds', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const small = makeFinSetObj(['s0'])
    const big = makeFinSetObj(['b0', 'b1'])

    const includeSmall: FinSetMor = { from: small, to: A, map: [0] }
    const includeBig: FinSetMor = { from: big, to: A, map: [0, 1] }

    const verdict = finsetSubobjectPartialOrder(includeSmall, includeBig)
    expect(verdict.leftLeqRight.holds).toBe(true)
    expect(verdict.rightLeqLeft.holds).toBe(false)
    expect(verdict.isomorphic).toBeUndefined()
  })
})
