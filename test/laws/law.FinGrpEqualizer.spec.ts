import { describe, expect, it } from 'vitest'

import {
  FinGrp,
  finGrpFactorThroughKernelEqualizer,
  finGrpKernelEqualizer,
  finGrpKernelEqualizerComparison,
  type FinGrpHom,
} from '../../allTS'
import { cyclicGroup } from './fixtures/finGrp'

describe('FinGrp kernel equalizer schemes', () => {
  const domain = cyclicGroup(4, 'Z₄')
  const codomain = cyclicGroup(2, 'Z₂')

  const mod2: FinGrpHom = {
    name: 'mod₂',
    dom: domain.name,
    cod: codomain.name,
    map: (value) => (Number(value) % 2).toString(),
  }

  it('extracts the kernel subgroup and factors commuting forks', () => {
    const witness = finGrpKernelEqualizer(domain, codomain, mod2)
    expect(witness.kernel.elems).toEqual(['0', '2'])

    const forkDomain = cyclicGroup(2, 'Z₂-double')
    const double: FinGrpHom = {
      name: 'double',
      dom: forkDomain.name,
      cod: domain.name,
      map: (value) => (value === '0' ? '0' : '2'),
    }

    const mediator = finGrpFactorThroughKernelEqualizer(domain, codomain, mod2, witness, forkDomain, double)

    expect(FinGrp.isHom(forkDomain, witness.kernel, mediator)).toBe(true)
    forkDomain.elems.forEach((element) => {
      const recomposed = witness.inclusion.map(mediator.map(element))
      expect(recomposed).toBe(double.map(element))
    })
  })

  it('rejects forks that do not commute with the kernel pair', () => {
    const witness = finGrpKernelEqualizer(domain, codomain, mod2)

    const forkDomain = cyclicGroup(2, 'Z₂-skew')
    const skew: FinGrpHom = {
      name: 'skew',
      dom: forkDomain.name,
      cod: domain.name,
      map: (value) => (value === '0' ? '0' : '1'),
    }

    expect(() =>
      finGrpFactorThroughKernelEqualizer(domain, codomain, mod2, witness, forkDomain, skew),
    ).toThrow(/does not commute/)
  })

  it('rejects forks that are not FinGrp homomorphisms', () => {
    const witness = finGrpKernelEqualizer(domain, codomain, mod2)

    const forkDomain = cyclicGroup(2, 'Z₂-malformed')

    const malformed: FinGrpHom = {
      name: 'malformed',
      dom: forkDomain.name,
      cod: domain.name,
      map: () => '1',
    }

    expect(() =>
      finGrpFactorThroughKernelEqualizer(domain, codomain, mod2, witness, forkDomain, malformed),
    ).toThrow(/must be a FinGrp homomorphism/)
  })

  it('builds comparison mediators between kernel witnesses', () => {
    const first = finGrpKernelEqualizer(domain, codomain, mod2)
    const second = finGrpKernelEqualizer(domain, codomain, mod2, { kernelName: 'Ker(mod₂)′' })

    const comparison = finGrpKernelEqualizerComparison(domain, codomain, mod2, first, second)

    expect(FinGrp.isHom(first.kernel, second.kernel, comparison.forward)).toBe(true)
    expect(FinGrp.isHom(second.kernel, first.kernel, comparison.backward)).toBe(true)

    first.kernel.elems.forEach((element) => {
      const forwardThenInclude = second.inclusion.map(comparison.forward.map(element))
      expect(forwardThenInclude).toBe(first.inclusion.map(element))
    })

    second.kernel.elems.forEach((element) => {
      const backwardThenInclude = first.inclusion.map(comparison.backward.map(element))
      expect(backwardThenInclude).toBe(second.inclusion.map(element))
    })
  })
})
