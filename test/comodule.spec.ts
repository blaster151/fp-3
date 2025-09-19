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
  makeDiagonalEntwinedModule,
  entwinedLawHolds,
  isEntwinedModuleHom,
  entwinedFromComodule_AotimesM,
  entwinedFromLeftModule_NotimesC,
  makeTaggedLeftModule,
  eye,
} from '../allTS'

// handy basis permutation m×m (σ: index -> index)
const permuteBasis = (m: number, sigma: (i: number) => number): number[][] => {
  const M = Array.from({ length: m }, () => Array.from({ length: m }, () => 0))
  for (let i = 0; i < m; i++) M[sigma(i)]![i] = 1
  return M
}

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

describe('Entwined modules', () => {
  it('diagonal entwined module satisfies compatibility law', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(3)    // A ≅ R^3
    const C = makeDiagonalCoring(S)(4)     // C ≅ R^4
    const E = makeDiagonalEntwining(A, C)  // Ψ = flip

    const tau = (j: number) => j % A.k     // action tagging
    const sigma = (j: number) => (j + 1) % C.n   // coaction tagging

    const M = makeDiagonalEntwinedModule(E)(2, tau, sigma)
    expect(entwinedLawHolds(E, M)).toBe(true)
  })

  it('works with different tagging functions', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(2)    // A ≅ R^2
    const C = makeDiagonalCoring(S)(3)     // C ≅ R^3
    const E = makeDiagonalEntwining(A, C)

    const tau = (j: number) => (j * 2) % A.k
    const sigma = (j: number) => (j + 2) % C.n

    const M = makeDiagonalEntwinedModule(E)(4, tau, sigma)
    expect(entwinedLawHolds(E, M)).toBe(true)
  })

  it('produces correct matrix dimensions', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(3)    // k = 3
    const C = makeDiagonalCoring(S)(4)     // n = 4
    const E = makeDiagonalEntwining(A, C)

    const M = makeDiagonalEntwinedModule(E)(2, j => j, j => j) // m = 2

    // act: m × (k*m) = 2 × 6
    expect(M.act.length).toBe(2)
    expect(M.act[0]?.length).toBe(6)

    // rho: (m*n) × m = 8 × 2
    expect(M.rho.length).toBe(8)
    expect(M.rho[0]?.length).toBe(2)
  })

  it('works with single-dimensional module', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(2)
    const C = makeDiagonalCoring(S)(2)
    const E = makeDiagonalEntwining(A, C)

    const M = makeDiagonalEntwinedModule(E)(1, j => j, j => j)
    expect(entwinedLawHolds(E, M)).toBe(true)
  })
})

describe('Entwined modules – advanced constructions', () => {
  it('A⊗M becomes a lawful entwined module', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(3)
    const C = makeDiagonalCoring(S)(4)
    const E = makeDiagonalEntwining(A, C)

    // M: simple diagonal comodule on R^2
    const M = makeDiagonalComodule(C)(2, k => (k+1) % C.n)

    const EM = entwinedFromComodule_AotimesM(E)(M)
    expect(entwinedLawHolds(E, EM)).toBe(true)
  })

  it('N⊗C becomes a lawful entwined module', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(2)
    const C = makeDiagonalCoring(S)(3)
    const E = makeDiagonalEntwining(A, C)

    const N = makeTaggedLeftModule(A)(2, j => j % A.k)
    const EN = entwinedFromLeftModule_NotimesC(E)(N)

    expect(entwinedLawHolds(E, EN)).toBe(true)
  })

  it('isEntwinedModuleHom validates identity and basic morphisms', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(2)
    const C = makeDiagonalCoring(S)(2)
    const E = makeDiagonalEntwining(A, C)

    // Build two identical entwined modules 
    const M1 = makeDiagonalComodule(C)(1, k => k)
    const M2 = makeDiagonalComodule(C)(1, k => k)

    const E1 = entwinedFromComodule_AotimesM(E)(M1)
    const E2 = entwinedFromComodule_AotimesM(E)(M2)

    // identity is a hom
    const id = eye(S)(E1.m)
    expect(isEntwinedModuleHom(E)(E1, E1, id)).toBe(true)

    // between identical modules, identity should also work
    expect(isEntwinedModuleHom(E)(E1, E2, id)).toBe(true)

    // zero map is always a hom (trivially preserves both action and coaction)
    const zero = Array.from({ length: E1.m }, () => Array(E1.m).fill(0))
    expect(isEntwinedModuleHom(E)(E1, E2, zero)).toBe(true)
  })

  it('validates morphism laws with dimension checks', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(2)
    const C = makeDiagonalCoring(S)(2)
    const E = makeDiagonalEntwining(A, C)

    const M1 = makeDiagonalComodule(C)(1, k => k)
    const M2 = makeDiagonalComodule(C)(1, k => k)

    const E1 = entwinedFromComodule_AotimesM(E)(M1) // dim = 2*1 = 2
    const E2 = entwinedFromComodule_AotimesM(E)(M2) // dim = 2*1 = 2

    // Wrong dimensions should fail
    const wrongDim = [[1, 0, 0], [0, 1, 0]] // 2×3 instead of 2×2
    expect(isEntwinedModuleHom(E)(E1, E2, wrongDim)).toBe(false)

    // Correct identity should pass
    const id = eye(S)(E1.m)
    expect(isEntwinedModuleHom(E)(E1, E2, id)).toBe(true)
  })

  it('constructions produce correct dimensions', () => {
    const S = SemiringNat
    const A = makeDiagonalAlgebra(S)(3) // k = 3
    const C = makeDiagonalCoring(S)(4)  // n = 4
    const E = makeDiagonalEntwining(A, C)

    // A⊗M construction
    const M = makeDiagonalComodule(C)(2, k => k) // m = 2
    const AM = entwinedFromComodule_AotimesM(E)(M)
    expect(AM.m).toBe(6) // k * m = 3 * 2

    // N⊗C construction  
    const N = makeTaggedLeftModule(A)(2, j => j) // m = 2
    const NC = entwinedFromLeftModule_NotimesC(E)(N)
    expect(NC.m).toBe(8) // m * n = 2 * 4
  })
})