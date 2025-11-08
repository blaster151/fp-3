import { describe, it, expect } from 'vitest'
import { IsoAxioms, isIso } from '../oracles/iso-axioms'
import { makeIsoReadyFinSet } from '../adapters/iso-ready.finset'
import type { FuncArr } from '../models/finset-cat'

describe('Isomorphism axioms (FinSet only)', () => {
  it('identifies identity arrows as isomorphisms and isos are closed under composition', () => {
    const category = makeIsoReadyFinSet({ A: ['a', 'b'], B: ['x', 'y'], C: ['p', 'q'] })

    const iso: FuncArr = {
      name: 'swap', dom: 'A', cod: 'B', map: (v) => (v === 'a' ? 'x' : 'y'),
    }
    ;(category.arrows as FuncArr[]).push(iso)

    const identityResult = IsoAxioms.identityIsIso(category, 'A')
    expect(identityResult.holds).toBe(true)

    expect(isIso(category, iso)).toBe(true)

    const inverse = category.candidatesToInvert(iso)[0]
    if (!inverse) throw new Error('Expected inverse candidate')

    const unique = IsoAxioms.uniqueInverse(category, iso, inverse, inverse)
    expect(unique.holds).toBe(true)

    const iso2: FuncArr = {
      name: 'permute', dom: 'B', cod: 'C', map: (v) => (v === 'x' ? 'p' : 'q'),
    }
    ;(category.arrows as FuncArr[]).push(iso2)
    const composition = IsoAxioms.closedUnderComposition(category, iso, iso2)
    expect(composition.holds).toBe(true)
  })

  it('exposes failures of uniqueness when candidates disagree', () => {
    const category = makeIsoReadyFinSet({ A: ['0', '1'], B: ['u', 'v'] })

    const iso: FuncArr = { name: 'flip', dom: 'A', cod: 'B', map: (v) => (v === '0' ? 'u' : 'v') }
    ;(category.arrows as FuncArr[]).push(iso)

    const inverse = category.candidatesToInvert(iso)[0]
    if (!inverse) throw new Error('Expected inverse candidate')

    const bogus: FuncArr = { name: 'const', dom: 'B', cod: 'A', map: () => '0' }

    const result = IsoAxioms.uniqueInverse(category, iso, inverse, bogus)
    expect(result.holds).toBe(false)
    expect(result.detail).toBeDefined()
  })
})
