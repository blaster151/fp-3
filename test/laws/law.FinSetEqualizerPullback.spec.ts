import { describe, expect, it } from 'vitest'
import {
  FinSet,
  assertFinSetMor,
  finsetEqualizerPullback,
} from '../../src/all/triangulated'

const makeExample = () => {
  const domain = { elements: ['a0', 'a1', 'a2'] }
  const codomain = { elements: ['b0', 'b1'] }
  const left = assertFinSetMor({ from: domain, to: codomain, map: [0, 1, 1] })
  const right = assertFinSetMor({ from: domain, to: codomain, map: [0, 1, 0] })
  return { domain, codomain, left, right }
}

describe('FinSet equalizer pullbacks', () => {
  it('constructs the equalizer via pullbacks and factors mediators', () => {
    const { domain, left, right } = makeExample()
    const witness = finsetEqualizerPullback(left, right)

    expect(witness.object.elements).toEqual(['a0', 'a1'])
    expect(witness.inclusion.map).toEqual([0, 1])
    expect(witness.toCodomain.map).toEqual([0, 1])
    expect(witness.certification.valid).toBe(true)
    expect(witness.certification.conesChecked.length).toBeGreaterThan(0)

    const mediatorDomain = { elements: ['z0', 'z1'] }
    const arrow = assertFinSetMor({ from: mediatorDomain, to: domain, map: [0, 1] })

    const mediator = witness.factor(arrow)
    expect(mediator.from).toBe(mediatorDomain)
    expect(mediator.to).toBe(witness.object)
    expect(mediator.map).toEqual([0, 1])

    const leftComposite = FinSet.compose(left, arrow)
    const viaMediator = FinSet.compose(witness.toCodomain, mediator)
    const equalMor = FinSet.equalMor?.(leftComposite, viaMediator) ?? false
    expect(equalMor).toBe(true)
  })

  it('rejects arrows that fail to equalize the parallel pair', () => {
    const { domain, left, right } = makeExample()
    const witness = finsetEqualizerPullback(left, right)
    const nonEqualising = assertFinSetMor({ from: { elements: ['u'] }, to: domain, map: [2] })

    expect(() => witness.factor(nonEqualising)).toThrow(
      /does not factor through the equaliser/i,
    )
  })

  it('requires the parallel pair to share domain and codomain', () => {
    const { domain, codomain, left } = makeExample()
    const skew = assertFinSetMor({ from: { elements: ['x', 'y'] }, to: codomain, map: [0, 1] })
    expect(() => finsetEqualizerPullback(left, skew)).toThrow(/share a domain and codomain/i)
    const mismatched = assertFinSetMor({ from: domain, to: { elements: ['c0'] }, map: [0, 0, 0] })
    expect(() => finsetEqualizerPullback(left, mismatched)).toThrow(/share a domain and codomain/i)
  })
})
