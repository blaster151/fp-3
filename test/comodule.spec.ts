import { describe, it, expect } from 'vitest'
import {
  SemiringNat,
  makeDiagonalCoring,
  makeDiagonalComodule,
  comoduleCoassocHolds,
  comoduleCounitHolds,
  tensorBalancedMapSameR,
  idMap,
  composeMap,
  eqMat,
  makeDiagonalBicomodule,
  bicomoduleCommutes,
  FreeBimoduleStd,
  tensorBalancedObj,
  makeDiagonalAlgebra,
  makeDiagonalEntwining,
  entwiningCoassocHolds,
  entwiningMultHolds,
  entwiningUnitHolds,
  entwiningCounitHolds,
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

describe('Balanced tensor of maps', () => {
  it('satisfies composition laws', () => {
    const S = SemiringNat
    const f: number[][] = [[1,0], [0,1], [1,1]] // 3x2
    const g: number[][] = [[1,1], [0,1]] // 2x2
    const id2 = idMap(S)(2)

    // Law: (f∘id)⊗(g∘id) == (f⊗g)∘(id⊗id)
    const left = tensorBalancedMapSameR(S)(composeMap(S)(f, id2), composeMap(S)(g, id2))
    const right = composeMap(S)(
      tensorBalancedMapSameR(S)(f, g),
      tensorBalancedMapSameR(S)(id2, id2)
    )
    expect(eqMat(S)(left, right)).toBe(true)
  })

  it('produces correct dimensions', () => {
    const S = SemiringNat
    const f: number[][] = [[1,0,1], [0,1,1]] // 2x3
    const g: number[][] = [[1,1], [0,1], [1,0]] // 3x2
    
    const result = tensorBalancedMapSameR(S)(f, g)
    expect(result.length).toBe(6) // 2*3 = 6 rows
    expect(result[0]?.length).toBe(6) // 3*2 = 6 cols
  })
})

describe('Bicomodules', () => {
  it('diagonal bicomodule satisfies commutativity law', () => {
    const S = SemiringNat
    const D = makeDiagonalCoring(S)(2) // left coring
    const C = makeDiagonalCoring(S)(3) // right coring
    
    const B = makeDiagonalBicomodule(D, C)(2, k => k, k => k + 1)
    expect(bicomoduleCommutes(B)).toBe(true)
  })

  it('works with different tagging functions', () => {
    const S = SemiringNat
    const D = makeDiagonalCoring(S)(3)
    const C = makeDiagonalCoring(S)(2)
    
    const B = makeDiagonalBicomodule(D, C)(3, k => k % 3, k => (k * 2) % 2)
    expect(bicomoduleCommutes(B)).toBe(true)
  })
})

describe('Object-level tensor product', () => {
  it('computes correct ranks', () => {
    const R = SemiringNat
    const S = SemiringNat
    const T = SemiringNat

    const RS = FreeBimoduleStd(R, S)(3)
    const ST = FreeBimoduleStd(S, T)(4)
    const RT = tensorBalancedObj(RS, ST)
    
    expect(RT.rank).toBe(12) // 3 * 4
    expect(RT.left).toBe(R)
    expect(RT.right).toBe(T)
  })
})

describe('Entwinings between algebras and corings', () => {
  it('diagonal entwining satisfies all four laws', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(3)   // A ≅ R^3
    const C = makeDiagonalCoring(S)(4)    // C ≅ R^4
    const E = makeDiagonalEntwining(A, C)

    expect(entwiningCoassocHolds(E)).toBe(true)
    expect(entwiningMultHolds(E)).toBe(true)
    expect(entwiningUnitHolds(E)).toBe(true)
    expect(entwiningCounitHolds(E)).toBe(true)
  })

  it('works with different dimensions', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(2)   // A ≅ R^2
    const C = makeDiagonalCoring(S)(5)    // C ≅ R^5
    const E = makeDiagonalEntwining(A, C)

    expect(entwiningCoassocHolds(E)).toBe(true)
    expect(entwiningMultHolds(E)).toBe(true)
    expect(entwiningUnitHolds(E)).toBe(true)
    expect(entwiningCounitHolds(E)).toBe(true)
  })

  it('produces correct flip matrix dimensions', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(3)   // k = 3
    const C = makeDiagonalCoring(S)(4)    // n = 4
    const E = makeDiagonalEntwining(A, C)

    // Psi: A⊗C → C⊗A should be (n*k) × (k*n) = 12 × 12
    expect(E.Psi.length).toBe(12)         // n * k
    expect(E.Psi[0]?.length).toBe(12)     // k * n
  })

  it('works with single-dimensional cases', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(1)   // A ≅ R^1
    const C = makeDiagonalCoring(S)(1)    // C ≅ R^1
    const E = makeDiagonalEntwining(A, C)

    expect(entwiningCoassocHolds(E)).toBe(true)
    expect(entwiningMultHolds(E)).toBe(true)
    expect(entwiningUnitHolds(E)).toBe(true)
    expect(entwiningCounitHolds(E)).toBe(true)
  })
})