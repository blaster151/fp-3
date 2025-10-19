import { describe, it, expect } from 'vitest'

import {
  FinSet,
  assertFinSetMor,
  finsetFactorImageThroughMonomorphism,
  finsetImageComparison,
  finsetImageFactorization,
  makeFinSetObj,
  type FinSetImageFactorization,
  type FinSetMor,
  type FinSetObj,
} from '../../allTS'

describe('FinSet image factorizations', () => {
  const domain: FinSetObj = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
  const codomain: FinSetObj = makeFinSetObj(['b0', 'b1', 'b2', 'b3'])
  const arrow: FinSetMor = assertFinSetMor({ from: domain, to: codomain, map: [2, 0, 2, 1] })

  it('builds the canonical image factorization', () => {
    const canonical = finsetImageFactorization(arrow)
    expect(canonical.image.elements).toEqual(['b2', 'b0', 'b1'])
    expect(canonical.epi.map).toEqual([0, 1, 0, 2])
    expect(canonical.mono.map).toEqual([2, 0, 1])

    const recomposed = FinSet.compose(canonical.mono, canonical.epi)
    expect(recomposed.map).toEqual(arrow.map)
  })

  it('factors the canonical image through an alternate monomorphism', () => {
    const canonical = finsetImageFactorization(arrow)
    const alternateImage = makeFinSetObj(['b0', 'b1', 'b2'])
    const alternateMono = assertFinSetMor({ from: alternateImage, to: codomain, map: [0, 1, 2] })

    const mediator = finsetFactorImageThroughMonomorphism(canonical, alternateMono)
    expect(mediator.map).toEqual([2, 0, 1])

    const recomposed = FinSet.compose(alternateMono, mediator)
    expect(recomposed.map).toEqual(canonical.mono.map)
  })

  it('rejects alternate monomorphisms that miss canonical image points', () => {
    const canonical = finsetImageFactorization(arrow)
    const skewImage = makeFinSetObj(['b0', 'b1'])
    const skewMono = assertFinSetMor({ from: skewImage, to: codomain, map: [0, 1] })

    expect(() => finsetFactorImageThroughMonomorphism(canonical, skewMono)).toThrow(/omits the canonical image element/)
  })

  it('extracts inverse mediators between image factorizations', () => {
    const canonical = finsetImageFactorization(arrow)
    const alternateImage = makeFinSetObj(['b0', 'b1', 'b2'])
    const alternateEpi = assertFinSetMor({ from: domain, to: alternateImage, map: [2, 0, 2, 1] })
    const alternateMono = assertFinSetMor({ from: alternateImage, to: codomain, map: [0, 1, 2] })
    const alternate: FinSetImageFactorization = {
      arrow,
      image: alternateImage,
      epi: alternateEpi,
      mono: alternateMono,
    }

    const comparison = finsetImageComparison(canonical, alternate)
    expect(comparison.forward.map).toEqual([2, 0, 1])
    expect(comparison.backward.map).toEqual([1, 2, 0])

    const backwardThenForward = FinSet.compose(comparison.backward, comparison.forward)
    expect(backwardThenForward.map).toEqual([0, 1, 2])

    const forwardThenBackward = FinSet.compose(comparison.forward, comparison.backward)
    expect(forwardThenBackward.map).toEqual([0, 1, 2])
  })

  it('rejects comparisons whose epimorphisms are not surjective', () => {
    const canonical = finsetImageFactorization(arrow)
    const deficientImage = makeFinSetObj(['b0', 'b1'])
    const deficientEpi = assertFinSetMor({ from: domain, to: deficientImage, map: [0, 0, 0, 0] })
    const deficientMono = assertFinSetMor({ from: deficientImage, to: codomain, map: [0, 1] })
    const deficient: FinSetImageFactorization = {
      arrow,
      image: deficientImage,
      epi: deficientEpi,
      mono: deficientMono,
    }

    expect(() => finsetImageComparison(canonical, deficient)).toThrow(/not surjective/)
  })

  it('rejects comparisons for mismatched arrows', () => {
    const canonical = finsetImageFactorization(arrow)
    const otherArrow = assertFinSetMor({ from: domain, to: codomain, map: [0, 1, 2, 3] })
    const otherFactorization = finsetImageFactorization(otherArrow)

    expect(() => finsetImageComparison(canonical, otherFactorization)).toThrow(/must target the same arrow/)
  })
})
