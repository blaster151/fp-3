import { describe, expect, it } from 'vitest'

import { MonCat, type MonoidHom } from '../../mon-cat'
import type { Monoid } from '../../monoid-cat'
import { monoidEqualizer, monoidEqualizerComparison, monoidFactorThroughEqualizer } from '../../mon-equalizers'
import { xorMonoid2, xorMonoid4 } from './fixtures/mon'

describe('MonCat equalizer schemes', () => {
  const domain = xorMonoid4
  const codomain = xorMonoid2

  const f: MonoidHom<number, number> = {
    dom: domain,
    cod: codomain,
    map: (value) => value & 1,
  }

  const g: MonoidHom<number, number> = {
    dom: domain,
    cod: codomain,
    map: (value) => (value >> 1) & 1,
  }

  it('builds the equalizer submonoid and factors commuting forks', () => {
    const { obj: equalizer, equalize } = monoidEqualizer(f, g)

    expect(equalizer.elements).toEqual([0, 3])

    const fork: MonoidHom<number, number> = {
      dom: xorMonoid2,
      cod: domain,
      map: (value) => (value === 0 ? 0 : 3),
    }

    const mediator = monoidFactorThroughEqualizer(f, g, equalize, fork)

    expect(MonCat.isHom(mediator)).toBe(true)

    const recomposed = MonCat.compose(equalize, mediator)
    fork.dom.elements!.forEach((value) => {
      expect(recomposed.map(value)).toBe(fork.map(value))
    })
  })

  it('rejects forks that do not commute with the parallel pair', () => {
    const { equalize } = monoidEqualizer(f, g)

    const skew: MonoidHom<number, number> = {
      dom: xorMonoid2,
      cod: domain,
      map: (value) => value,
    }

    expect(() => monoidFactorThroughEqualizer(f, g, equalize, skew)).toThrow(/does not commute/)
  })

  it('rejects forks that land outside the equalizer submonoid', () => {
    const { obj: equalizer, equalize } = monoidEqualizer(f, g)

    const trimmed: Monoid<number> = {
      e: equalizer.e,
      op: equalizer.op,
      elements: [0],
    }

    const trimmedInclude: MonoidHom<number, number> = {
      dom: trimmed,
      cod: domain,
      map: (value) => value,
    }

    expect(() => monoidFactorThroughEqualizer(f, g, trimmedInclude, equalize)).toThrow(/outside the equalizer submonoid/)
  })

  it('extracts comparison isomorphisms between equalizer witnesses', () => {
    const { obj: equalizer, equalize } = monoidEqualizer(f, g)

    const flipped: Monoid<number> = {
      e: equalizer.e,
      op: equalizer.op,
      elements: [...equalizer.elements!].reverse(),
    }

    const flippedInclude: MonoidHom<number, number> = {
      dom: flipped,
      cod: equalize.cod,
      map: (value) => value,
    }

    const comparison = monoidEqualizerComparison(f, g, equalize, flippedInclude)

    const forwardComposite = MonCat.compose(comparison.forward, equalize)
    const backwardComposite = MonCat.compose(comparison.backward, flippedInclude)

    flipped.elements!.forEach((value) => {
      expect(forwardComposite.map(value)).toBe(flippedInclude.map(value))
    })

    equalizer.elements!.forEach((value) => {
      expect(backwardComposite.map(value)).toBe(equalize.map(value))
    })
  })
})
