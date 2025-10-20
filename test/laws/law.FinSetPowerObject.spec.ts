import { describe, expect, it } from 'vitest'

import {
  CategoryLimits,
  FinSet,
  FinSetPowerObject,
  FinSetPullbacksFromEqualizer,
  FinSetTruthArrow,
  FinSetTruthValues,
  finsetCharacteristicPullback,
  makeFinSetObj,
  type FinSetMor,
  type FinSetObj,
} from '../../allTS'

const sameObject = (left: FinSetObj, right: FinSetObj): boolean =>
  left === right ||
  (left.elements.length === right.elements.length &&
    left.elements.every((value, index) => value === right.elements[index]))

const equalArrows = (left: FinSetMor, right: FinSetMor): boolean => {
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
  expect(equalArrows(left, right)).toBe(true)
}

describe('FinSet power objects', () => {
  it('exposes the membership subobject and classifies relations via Ω^Y transposes', () => {
    const Y = makeFinSetObj(['y0', 'y1'])
    const powerWitness = FinSetPowerObject(Y)

    expect(powerWitness.anchor).toBe(Y)
    expect(powerWitness.membership.evaluation.to).toBe(FinSetTruthValues)
    expect(powerWitness.membership.certification.valid).toBe(true)

    const membershipPullback = powerWitness.membership.pullback
    const evaluationComposite = FinSet.compose(
      powerWitness.membership.evaluation,
      membershipPullback.toDomain,
    )
    const truthComposite = FinSet.compose(FinSetTruthArrow, membershipPullback.toAnchor)
    expectEqualArrows(evaluationComposite, truthComposite)

    const X = makeFinSetObj(['x0', 'x1', 'x2'])
    const product = FinSet.binaryProduct(X, Y)
    const productWitness: CategoryLimits.BinaryProductWithPairWitness<FinSetObj, FinSetMor> = {
      obj: product.obj,
      projections: [product.proj1, product.proj2],
      pair: (domain, left, right) => product.pair(domain, left, right),
    }

    const relationDomain = makeFinSetObj(['r0', 'r1', 'r2'])
    const relation: FinSetMor = { from: relationDomain, to: product.obj, map: [1, 2, 5] }

    const classification = powerWitness.classify({
      ambient: X,
      relation,
      product: productWitness,
      pullbacks: FinSetPullbacksFromEqualizer,
    })

    expect(classification.certification.valid).toBe(true)
    expect(classification.mediator.from).toBe(X)
    expect(classification.mediator.to).toBe(powerWitness.powerObj)

    const decodeFunction = (index: number): ReadonlyArray<number> => {
      const encoding = powerWitness.powerObj.elements[index]
      if (!Array.isArray(encoding)) {
        throw new Error('FinSetPowerObject test: expected truth-function encoding as an array.')
      }
      return encoding as ReadonlyArray<number>
    }

    expect(decodeFunction(classification.mediator.map[0]!)).toEqual([0, 1])
    expect(decodeFunction(classification.mediator.map[1]!)).toEqual([1, 0])
    expect(decodeFunction(classification.mediator.map[2]!)).toEqual([0, 1])

    const recoveredRelation = FinSet.compose(classification.pullback.toDomain, classification.relationIso.forward)
    expectEqualArrows(recoveredRelation, relation)

    const relationCone = {
      apex: relation.from,
      toDomain: relation,
      toAnchor: classification.relationAnchor,
    }

    const factor = classification.factorCone(relationCone)
    expect(factor.factored).toBe(true)
    expectEqualArrows(factor.mediator!, classification.relationIso.forward)

    const membershipComposite = FinSet.compose(powerWitness.membership.inclusion, classification.relationAnchor)
    const pairingComposite = FinSet.compose(classification.pairing, relation)
    expectEqualArrows(membershipComposite, pairingComposite)
  })

  it('builds membership by pulling evaluation back along the truth arrow', () => {
    const Y = makeFinSetObj(['y0', 'y1', 'y2'])
    const powerWitness = FinSetPowerObject(Y)

    const manual = finsetCharacteristicPullback(powerWitness.membership.evaluation)

    expect(sameObject(powerWitness.membership.subobject, manual.subobject)).toBe(true)
    expectEqualArrows(powerWitness.membership.inclusion, manual.inclusion)
    expectEqualArrows(powerWitness.membership.pullback.toDomain, manual.pullback.toDomain)
    expectEqualArrows(powerWitness.membership.pullback.toAnchor, manual.pullback.toAnchor)
  })

  it('rejects non-monomorphic relations', () => {
    const Y = makeFinSetObj(['y0', 'y1'])
    const powerWitness = FinSetPowerObject(Y)
    const X = makeFinSetObj(['x0', 'x1'])
    const product = FinSet.binaryProduct(X, Y)
    const productWitness: CategoryLimits.BinaryProductWithPairWitness<FinSetObj, FinSetMor> = {
      obj: product.obj,
      projections: [product.proj1, product.proj2],
      pair: (domain, left, right) => product.pair(domain, left, right),
    }

    const relationDomain = makeFinSetObj(['r0', 'r1'])
    const nonMonic: FinSetMor = { from: relationDomain, to: product.obj, map: [0, 0] }

    expect(() =>
      powerWitness.classify({
        ambient: X,
        relation: nonMonic,
        product: productWitness,
        pullbacks: FinSetPullbacksFromEqualizer,
      }),
    ).toThrow(/monomorphism/i)
  })

  it('rejects products that fail to describe X × Y', () => {
    const Y = makeFinSetObj(['y0'])
    const powerWitness = FinSetPowerObject(Y)
    const X = makeFinSetObj(['x0', 'x1'])
    const product = FinSet.binaryProduct(X, Y)

    const swappedProduct: CategoryLimits.BinaryProductWithPairWitness<FinSetObj, FinSetMor> = {
      obj: product.obj,
      projections: [product.proj2, product.proj1],
      pair: (domain, left, right) => product.pair(domain, left, right),
    }

    const relationDomain = makeFinSetObj(['r0'])
    const relation: FinSetMor = { from: relationDomain, to: product.obj, map: [1] }

    expect(() =>
      powerWitness.classify({
        ambient: X,
        relation,
        product: swappedProduct,
        pullbacks: FinSetPullbacksFromEqualizer,
      }),
    ).toThrow(/ambient|anchor|product/i)
  })
})
