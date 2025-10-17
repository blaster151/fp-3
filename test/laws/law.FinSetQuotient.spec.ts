import { describe, expect, it } from 'vitest'

import { FinSet, makeFinSetObj } from '../../allTS'
import type { FinSetMor } from '../../allTS'
import { finsetFactorThroughQuotient, finsetQuotientComparison } from '../../finset-quotients'

describe('FinSet quotient schemes', () => {
  const equalMor = (left: FinSetMor, right: FinSetMor): boolean =>
    FinSet.equalMor?.(left, right) ??
    (left.map.length === right.map.length && left.map.every((value, index) => value === right.map[index]))

  const makeParallelPair = () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2', 'x3'])
    const Y = makeFinSetObj(['y0', 'y1', 'y2'])

    const f: FinSetMor = { from: X, to: Y, map: [0, 0, 1, 2] }
    const g: FinSetMor = { from: X, to: Y, map: [0, 1, 1, 2] }

    const { obj: Q, coequalize: q } = FinSet.coequalizer(f, g)
    return { X, Y, Q, f, g, q }
  }

  it('factors cocones that are constant on equivalence classes', () => {
    const { Y, q } = makeParallelPair()
    const Z = makeFinSetObj(['z0', 'z1'])

    const h: FinSetMor = { from: Y, to: Z, map: [0, 0, 1] }
    const mediator = finsetFactorThroughQuotient(q, h)

    const recomposed = FinSet.compose(mediator, q)
    expect(equalMor(recomposed, h)).toBe(true)
  })

  it('rejects cocones that disagree on an equivalence class', () => {
    const { Y, q } = makeParallelPair()
    const Z = makeFinSetObj(['z0', 'z1'])

    const skew: FinSetMor = { from: Y, to: Z, map: [0, 1, 1] }
    expect(() => finsetFactorThroughQuotient(q, skew)).toThrow(/not constant on the equivalence class/)
  })

  it('constructs the unique comparison between quotient schemes', () => {
    const { q, Q } = makeParallelPair()
    const QPrime = makeFinSetObj(['classB', 'classA'])
    const swap: FinSetMor = { from: Q, to: QPrime, map: [1, 0] }
    const swapBack: FinSetMor = { from: QPrime, to: Q, map: [1, 0] }
    const qPrime = FinSet.compose(swap, q)

    const comparison = finsetQuotientComparison(q, qPrime)

    const forwardComposite = FinSet.compose(comparison.forward, q)
    const backwardComposite = FinSet.compose(comparison.backward, qPrime)

    expect(equalMor(forwardComposite, qPrime)).toBe(true)
    expect(equalMor(backwardComposite, q)).toBe(true)
    expect(equalMor(comparison.forward, swap)).toBe(true)
    expect(equalMor(comparison.backward, swapBack)).toBe(true)
  })
})
