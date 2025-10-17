import { describe, expect, it } from 'vitest'

import { FinSet, makeFinSetObj } from '../../allTS'
import type { FinSetMor } from '../../allTS'
import { finsetEqualizerComparison, finsetFactorThroughEqualizer } from '../../finset-equalizers'

describe('FinSet equalizer schemes', () => {
  const makeParallelPair = () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2'])
    const Y = makeFinSetObj(['y0', 'y1'])

    const f: FinSetMor = { from: X, to: Y, map: [0, 0, 1] }
    const g: FinSetMor = { from: X, to: Y, map: [0, 1, 1] }

    const { obj: E, equalize: include } = FinSet.equalizer(f, g)
    return { X, Y, E, f, g, include }
  }

  it('factors commuting forks through the equalizer', () => {
    const { f, g, include } = makeParallelPair()

    const W = makeFinSetObj(['w0', 'w1', 'w2'])
    const fork: FinSetMor = { from: W, to: include.to, map: [0, 2, 0] }

    const mediator = finsetFactorThroughEqualizer(f, g, include, fork)
    const recomposed = FinSet.compose(include, mediator)

    expect(FinSet.equalMor?.(recomposed, fork) ?? recomposed.map.every((value, index) => value === fork.map[index])).toBe(true)
  })

  it('rejects forks that do not commute with the parallel pair', () => {
    const { f, g, include } = makeParallelPair()

    const W = makeFinSetObj(['w0', 'w1'])
    const skew: FinSetMor = { from: W, to: include.to, map: [0, 1] }

    expect(() => finsetFactorThroughEqualizer(f, g, include, skew)).toThrow(/does not commute/)
  })

  it('rejects forks that land outside the equalizer subset', () => {
    const { f, g, include } = makeParallelPair()

    const trimmed = {
      from: makeFinSetObj(include.from.elements.slice(0, 1)),
      to: include.to,
      map: include.map.slice(0, 1),
    } satisfies FinSetMor

    const W = makeFinSetObj(['w0'])
    const fork: FinSetMor = { from: W, to: include.to, map: [include.map[1]!] }

    expect(() => finsetFactorThroughEqualizer(f, g, trimmed, fork)).toThrow(/lands outside the equalizer/)
  })

  it('builds the comparison isomorphism between equalizer witnesses', () => {
    const { f, g, include } = makeParallelPair()

    const flippedFrom = makeFinSetObj([...include.from.elements].reverse())
    const flippedMap = [...include.map].reverse()

    const flipped: FinSetMor = { from: flippedFrom, to: include.to, map: flippedMap }

    const comparison = finsetEqualizerComparison(f, g, include, flipped)

    const forwardComposite = FinSet.compose(comparison.forward, include)
    const backwardComposite = FinSet.compose(comparison.backward, flipped)

    expect(FinSet.equalMor?.(forwardComposite, flipped) ?? forwardComposite.map.every((value, index) => value === flipped.map[index])).toBe(true)
    expect(
      FinSet.equalMor?.(backwardComposite, include) ?? backwardComposite.map.every((value, index) => value === include.map[index]),
    ).toBe(true)
  })
})
