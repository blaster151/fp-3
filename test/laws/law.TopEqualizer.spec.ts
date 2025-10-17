import { describe, expect, it } from 'vitest'

import { makeContinuousMap, compose } from '../../src/top/ContinuousMap'
import { subspace } from '../../src/top/Subspace'
import { discrete } from '../../src/top/Topology'
import { topEqualizer, topFactorThroughEqualizer, topEqualizerComparison } from '../../src/top/equalizers'

const eqString = (a: string, b: string) => a === b
const eqNumber = (a: number, b: number) => a === b

describe('Top equalizer schemes', () => {
  const TX = discrete(['x0', 'x1', 'x2'])
  const TY = discrete([0, 1])

  const f = makeContinuousMap({
    source: TX,
    target: TY,
    eqSource: eqString,
    eqTarget: eqNumber,
    map: (x: string) => (x === 'x1' ? 1 : 0),
  })

  const g = makeContinuousMap({
    source: TX,
    target: TY,
    eqSource: eqString,
    eqTarget: eqNumber,
    map: (_x: string) => 0,
  })

  it('builds the equalizer subspace and factors commuting forks', () => {
    const { obj: equalizer, equalize } = topEqualizer(f, g)

    expect(equalizer.carrier).toEqual(['x0', 'x2'])

    const TW = discrete(['w0', 'w1'])
    const fork = makeContinuousMap({
      source: TW,
      target: TX,
      eqSource: eqString,
      eqTarget: eqString,
      map: (w: string) => (w === 'w0' ? 'x0' : 'x2'),
    })

    const mediatorReport = topFactorThroughEqualizer(f, g, equalize, fork)

    expect(mediatorReport.holds).toBe(true)
    expect(mediatorReport.failures).toHaveLength(0)

    const mediator = mediatorReport.mediator
    expect(mediator).toBeDefined()
    if (mediator === undefined) {
      throw new Error('mediator must exist when the report holds')
    }

    expect(mediator.target).toBe(equalizer)
    expect(mediator.map('w0')).toBe('x0')
    expect(mediator.map('w1')).toBe('x2')

    const recomposed = compose(equalize, mediator)
    expect(recomposed.map('w0')).toBe('x0')
    expect(recomposed.map('w1')).toBe('x2')
  })

  it('rejects forks that fail to commute with the parallel pair', () => {
    const { equalize } = topEqualizer(f, g)

    const skew = makeContinuousMap({
      source: discrete(['w0', 'w1']),
      target: TX,
      eqSource: eqString,
      eqTarget: eqString,
      map: (w: string) => (w === 'w0' ? 'x0' : 'x1'),
    })

    const skewReport = topFactorThroughEqualizer(f, g, equalize, skew)
    expect(skewReport.holds).toBe(false)
    expect(skewReport.failures.some((failure) => /does not commute/.test(failure))).toBe(true)
  })

  it('rejects forks that land outside the equalizer subspace', () => {
    const { equalize } = topEqualizer(f, g)

    const outside = makeContinuousMap({
      source: discrete(['w0']),
      target: TX,
      eqSource: eqString,
      eqTarget: eqString,
      map: (_w: string) => 'x1',
    })

    const outsideReport = topFactorThroughEqualizer(f, g, equalize, outside)
    expect(outsideReport.holds).toBe(false)
    expect(outsideReport.failures.some((failure) => /lands outside the equalizer/.test(failure))).toBe(true)
  })

  it('extracts comparison isomorphisms between equalizer witnesses', () => {
    const { obj: equalizer, equalize } = topEqualizer(f, g)

    const reversed = subspace(eqString, TX, ['x2', 'x0'])
    const reversedInclude = makeContinuousMap({
      source: reversed,
      target: TX,
      eqSource: eqString,
      eqTarget: eqString,
      map: (x: string) => x,
    })

    const comparison = topEqualizerComparison(f, g, equalize, reversedInclude)

    const forwardComposite = compose(reversedInclude, comparison.forward)
    const backwardComposite = compose(equalize, comparison.backward)

    expect(forwardComposite.map('x0')).toBe('x0')
    expect(forwardComposite.map('x2')).toBe('x2')

    expect(backwardComposite.map('x0')).toBe('x0')
    expect(backwardComposite.map('x2')).toBe('x2')

    const roundTripFirst = compose(comparison.backward, comparison.forward)
    const roundTripSecond = compose(comparison.forward, comparison.backward)

    equalizer.carrier.forEach((point) => {
      expect(roundTripFirst.map(point)).toBe(point)
    })

    reversed.carrier.forEach((point) => {
      expect(roundTripSecond.map(point)).toBe(point)
    })
  })
})
