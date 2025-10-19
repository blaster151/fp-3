import { describe, expect, it } from 'vitest'

import {
  FinSet,
  FinSetEqualizersFromPullbacks,
  finsetFactorThroughEqualizer,
  makeFinSetObj,
  type FinSetMor,
  type FinSetObj,
} from '../../allTS'

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  const verdict = FinSet.equalMor?.(left, right)
  if (typeof verdict === 'boolean') {
    expect(verdict).toBe(true)
    return
  }

  expect(left.from).toBe(right.from)
  expect(left.to).toBe(right.to)
  expect(left.map.length).toBe(right.map.length)
  left.map.forEach((value, index) => {
    expect(value).toBe(right.map[index])
  })
}

const expectEqualObjects = (left: FinSetObj, right: FinSetObj) => {
  expect(left.elements.length).toBe(right.elements.length)
  left.elements.forEach((value, index) => {
    expect(value).toEqual(right.elements[index])
  })
}

describe('FinSet equalizers from pullbacks', () => {
  it('reconstructs the canonical subset equalizer and diagonal pullback', () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2'])
    const Y = makeFinSetObj(['y0', 'y1'])

    const f: FinSetMor = { from: X, to: Y, map: [0, 0, 1] }
    const g: FinSetMor = { from: X, to: Y, map: [0, 1, 1] }

    const canonical = FinSet.equalizer(f, g)
    const witness = FinSetEqualizersFromPullbacks.spanWitness(f, g)

    expectEqualObjects(witness.pullback.apex, canonical.obj)
    expectEqualArrows(witness.inclusion, canonical.equalize)

    const viaLeft = FinSet.compose(f, witness.inclusion)
    const viaRight = FinSet.compose(g, witness.inclusion)
    expectEqualArrows(viaLeft, viaRight)

    const throughPairing = FinSet.compose(witness.pairing, witness.inclusion)
    const throughDiagonal = FinSet.compose(witness.diagonal, witness.anchor)
    expectEqualArrows(throughPairing, throughDiagonal)

    const derived = FinSetEqualizersFromPullbacks.equalizer(f, g)
    expectEqualObjects(derived.obj, canonical.obj)
    expectEqualArrows(derived.equalize, canonical.equalize)
  })

  it('factors commuting forks through the pullback-derived equalizer', () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2'])
    const Y = makeFinSetObj(['y0', 'y1'])

    const f: FinSetMor = { from: X, to: Y, map: [0, 0, 1] }
    const g: FinSetMor = { from: X, to: Y, map: [0, 1, 1] }

    const witness = FinSetEqualizersFromPullbacks.spanWitness(f, g)

    const W = makeFinSetObj(['w0', 'w1'])
    const fork: FinSetMor = { from: W, to: X, map: [0, 2] }

    const leftComposite = FinSet.compose(f, fork)
    const rightComposite = FinSet.compose(g, fork)
    expectEqualArrows(leftComposite, rightComposite)

    const verdict = FinSetEqualizersFromPullbacks.factorEqualizer({
      left: f,
      right: g,
      inclusion: witness.inclusion,
      fork,
    })

    expect(verdict.factored).toBe(true)
    const mediator = verdict.mediator!

    expectEqualArrows(FinSet.compose(witness.inclusion, mediator), fork)
    expectEqualArrows(FinSet.compose(witness.anchor, mediator), leftComposite)

    const subsetMediator = finsetFactorThroughEqualizer(f, g, witness.inclusion, fork)
    expectEqualArrows(mediator, subsetMediator)
  })

  it('rejects forks that fail to equalize the span', () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2'])
    const Y = makeFinSetObj(['y0', 'y1'])

    const f: FinSetMor = { from: X, to: Y, map: [0, 0, 1] }
    const g: FinSetMor = { from: X, to: Y, map: [0, 1, 1] }

    const witness = FinSetEqualizersFromPullbacks.spanWitness(f, g)

    const W = makeFinSetObj(['w0', 'w1'])
    const skew: FinSetMor = { from: W, to: X, map: [0, 1] }

    const verdict = FinSetEqualizersFromPullbacks.factorEqualizer({
      left: f,
      right: g,
      inclusion: witness.inclusion,
      fork: skew,
    })

    expect(verdict.factored).toBe(false)
    expect(verdict.reason).toMatch(/equalize/i)
  })

  it('requires the registered inclusion produced by the pullback helper', () => {
    const X = makeFinSetObj(['x0', 'x1'])
    const Y = makeFinSetObj(['y0', 'y1'])

    const f: FinSetMor = { from: X, to: Y, map: [0, 1] }
    const g: FinSetMor = { from: X, to: Y, map: [0, 0] }

    const canonical = FinSet.equalizer(f, g)
    const fork: FinSetMor = { from: canonical.obj, to: X, map: canonical.equalize.map.slice() }

    const verdict = FinSetEqualizersFromPullbacks.factorEqualizer({
      left: f,
      right: g,
      inclusion: canonical.equalize,
      fork,
    })

    expect(verdict.factored).toBe(false)
    expect(verdict.reason).toMatch(/unrecognised inclusion/i)
  })
})
