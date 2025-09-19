import { describe, it, expect } from 'vitest'
import {
  SemiringNat,
  makeDiagonalCoring,
  makeDiagonalComodule,
  comoduleCoassocHolds,
  comoduleCounitHolds,
} from '../allTS'

describe('Right comodules over diagonal coring', () => {
  it('diagonal coaction satisfies laws', () => {
    const C = makeDiagonalCoring(SemiringNat)(4)
    const M = makeDiagonalComodule(C)(3, k => k) // tag i ↦ i
    expect(comoduleCoassocHolds(M)).toBe(true)
    expect(comoduleCounitHolds(M)).toBe(true)
  })

  it('diagonal coaction with modular tagging satisfies laws', () => {
    const C = makeDiagonalCoring(SemiringNat)(3)
    const M = makeDiagonalComodule(C)(2, k => k % 3) // tag with modulo
    expect(comoduleCoassocHolds(M)).toBe(true)
    expect(comoduleCounitHolds(M)).toBe(true)
  })

  it('works with larger dimensions', () => {
    const C = makeDiagonalCoring(SemiringNat)(5)
    const M = makeDiagonalComodule(C)(4, k => (k * 2) % 5) // more complex tagging
    expect(comoduleCoassocHolds(M)).toBe(true)
    expect(comoduleCounitHolds(M)).toBe(true)
  })
})