import { describe, expect, it } from 'vitest'

import {
  FinSet,
  assertFinSetMor,
  finsetEqualizerAsPullback,
  finsetEqualizerComparison,
  finsetFactorThroughEqualizer,
  makeFinSetObj,
  type FinSetMor,
} from '../../allTS'

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  const equal = FinSet.equalMor?.(left, right)
  if (typeof equal === 'boolean') {
    expect(equal).toBe(true)
    return
  }

  expect(left.from).toBe(right.from)
  expect(left.to).toBe(right.to)
  expect(left.map.length).toBe(right.map.length)
  for (let idx = 0; idx < left.map.length; idx++) {
    expect(left.map[idx]).toBe(right.map[idx])
  }
}

const makeExample = () => {
  const domain = makeFinSetObj(['a0', 'a1', 'a2'])
  const codomain = makeFinSetObj(['b0', 'b1'])
  const left = assertFinSetMor({ from: domain, to: codomain, map: [0, 1, 1] })
  const right = assertFinSetMor({ from: domain, to: codomain, map: [0, 1, 0] })
  return { domain, codomain, left, right }
}

describe('FinSet equalizer pullbacks', () => {
  it('matches the subset equalizer and preserves the pullback square', () => {
    const { left, right } = makeExample()
    const canonical = FinSet.equalizer(left, right)
    const witness = finsetEqualizerAsPullback(left, right)

    expect(witness.equalizer.object.elements).toEqual(canonical.obj.elements)
    expect(witness.equalizer.inclusion.map).toEqual(canonical.equalize.map)

    const viaPair = FinSet.compose(witness.span.pair, witness.equalizer.inclusion)
    const viaDiagonal = FinSet.compose(witness.span.diagonal, witness.pullback.toAnchor)
    expectEqualArrows(viaPair, viaDiagonal)

    const identityMediator = witness.factorCone(witness.equalizer.inclusion)
    expectEqualArrows(identityMediator, FinSet.id(witness.equalizer.object))
  })

  it('rejects cones that fail to equalize the fork', () => {
    const { domain, left, right } = makeExample()
    const witness = finsetEqualizerAsPullback(left, right)

    const skew = assertFinSetMor({ from: makeFinSetObj(['z0', 'z1']), to: domain, map: [0, 2] })
    expect(() => witness.factorCone(skew)).toThrow(/equalise/i)
  })

  it('builds comparison isomorphisms that factor through each witness', () => {
    const { left, right } = makeExample()
    const canonical = FinSet.equalizer(left, right)
    const witness = finsetEqualizerAsPullback(left, right)

    const comparison = finsetEqualizerComparison(
      left,
      right,
      canonical.equalize,
      witness.equalizer.inclusion,
    )

    expectEqualArrows(
      FinSet.compose(witness.equalizer.inclusion, comparison.forward),
      canonical.equalize,
    )
    expectEqualArrows(
      FinSet.compose(canonical.equalize, comparison.backward),
      witness.equalizer.inclusion,
    )

    const viaWitness = witness.factorCone(canonical.equalize)
    expectEqualArrows(viaWitness, comparison.forward)

    const viaSubset = finsetFactorThroughEqualizer(
      left,
      right,
      canonical.equalize,
      witness.equalizer.inclusion,
    )
    expectEqualArrows(viaSubset, comparison.backward)
  })
})
