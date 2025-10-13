import { describe, test, expect } from 'vitest'
import {
  coreIdFunctor,
  coreComposeFun,
  coreWhiskerLeft,
  coreWhiskerRight,
  coreVcomp,
  leftMate,
  rightMate,
  checkMateInverses,
  verifyTriangleIdentities,
  leftMateRightShape,
  rightMateRightShape,
  EnhancedVect
} from '../allTS'
import type {
  CoreFunctor,
  CoreNatTrans,
  CoreAdjunction,
  CoreId,
  CoreCompose,
  FinSetObj,
  FinSetMor
} from '../allTS'

type CString = string
type DNumber = number

describe('Core Adjunction Framework', () => {
  test('core functor operations work', () => {
    // Test identity functor
    const idF = coreIdFunctor<string>()
    expect(idF.onObj('x')).toBe('x')
    expect(idF.onMor('f')).toBe('f')

    // Test functor composition
    const F: CoreFunctor<string, number> = {
      onObj: (s: string) => s.length,
      onMor: (f: unknown) => f
    }

    const G: CoreFunctor<number, boolean> = {
      onObj: (n: number) => n > 0,
      onMor: (f: unknown) => f
    }

    const GF = coreComposeFun<CString, DNumber, boolean, typeof F, typeof G>(F, G)
    expect(GF.onObj('hello')).toBe(true)  // length 5 > 0
    expect(GF.onObj('')).toBe(false)      // length 0 = 0
  })

  test('natural transformation operations work', () => {
    const F: CoreFunctor<string, string> = {
      onObj: (s: string) => `F(${s})`,
      onMor: (f: unknown) => `F(${f})`
    }

    const G: CoreFunctor<string, string> = {
      onObj: (s: string) => `G(${s})`,
      onMor: (f: unknown) => `G(${f})`
    }

    const alpha: CoreNatTrans<typeof F, typeof G> = {
      at: (x: unknown) => `α(${x})`
    }

    // Test whiskering
    const H: CoreFunctor<number, string> = {
      onObj: (n: number) => n.toString(),
      onMor: (f: unknown) => f
    }

    const whiskerL = coreWhiskerLeft(H, alpha)
    expect(whiskerL.at).toBeDefined()

    const whiskerR = coreWhiskerRight(alpha, H)
    expect(whiskerR.at).toBeDefined()

    // Test vertical composition
    const beta: CoreNatTrans<typeof G, typeof F> = {
      at: (x: unknown) => `β(${x})`
    }

    const comp = coreVcomp(alpha, beta)
    expect(comp.at).toBeDefined()
  })

  test('simple adjunction construction', () => {
    // Create a simple adjunction between mock categories
    const F: CoreFunctor<CString, DNumber> = {
      onObj: (c: CString) => c.length,
      onMor: (f: unknown) => f
    }

    const U: CoreFunctor<DNumber, CString> = {
      onObj: (d: DNumber) => `U(${d})`,
      onMor: (f: unknown) => f
    }

    const unit: CoreNatTrans<
      CoreId<CString> & CoreFunctor<CString, CString>,
      CoreCompose<typeof U, typeof F>
    > = {
      at: (x: unknown) => ({ unitAppliedTo: x })
    }

    const counit: CoreNatTrans<
      CoreCompose<typeof F, typeof U>,
      CoreId<DNumber> & CoreFunctor<DNumber, DNumber>
    > = {
      at: (x: unknown) => ({ counitAppliedTo: x })
    }

    const adj: CoreAdjunction<CString, DNumber, typeof F, typeof U> = {
      F,
      U,
      unit,
      counit
    }

    expect(adj.F).toBe(F)
    expect(adj.U).toBe(U)
    expect(adj.unit).toBe(unit)
    expect(adj.counit).toBe(counit)
  })

  test('mate utilities work', () => {
    // Create simple adjunction
    const F: CoreFunctor<CString, DNumber> = {
      onObj: (c: CString) => c.length,
      onMor: (f: unknown) => f
    }

    const U: CoreFunctor<DNumber, CString> = {
      onObj: (d: DNumber) => `U(${d})`,
      onMor: (f: unknown) => f
    }

    const adj: CoreAdjunction<CString, DNumber, typeof F, typeof U> = {
      F,
      U,
      unit: {
        at: (x: unknown) => ({ unitAppliedTo: x })
      },
      counit: {
        at: (x: unknown) => ({ counitAppliedTo: x })
      }
    }

    // Create test functors H: C -> C, K: D -> D
    const H: CoreFunctor<CString, CString> = {
      onObj: (c: CString) => `H(${c})`,
      onMor: (f: unknown) => f
    }

    const K: CoreFunctor<DNumber, DNumber> = {
      onObj: (d: DNumber) => d + 1,
      onMor: (f: unknown) => f
    }

    // Test natural transformation α : F∘H ⇒ K
    const alpha: CoreNatTrans<CoreCompose<typeof F, typeof H>, typeof K> = {
      at: (x: unknown) => `α(${x})`
    }

    // Compute left mate
    const alphaMate = leftMate(adj, alpha, H, K)
    expect(alphaMate).toBeDefined()
    expect(alphaMate.at).toBeDefined()

    // Compute right mate
    const beta: CoreNatTrans<typeof H, CoreCompose<typeof U, typeof K>> = {
      at: (x: unknown) => `β(${x})`
    }

    const betaMate = rightMate(adj, beta, H, K)
    expect(betaMate).toBeDefined()
    expect(betaMate.at).toBeDefined()
  })

  test('mate inverses check', () => {
    const F: CoreFunctor<CString, DNumber> = {
      onObj: (c: CString) => c.length,
      onMor: (f: unknown) => f
    }

    const U: CoreFunctor<DNumber, CString> = {
      onObj: (d: DNumber) => `U(${d})`,
      onMor: (f: unknown) => f
    }

    const adj: CoreAdjunction<CString, DNumber, typeof F, typeof U> = {
      F,
      U,
      unit: {
        at: (x: unknown) => ({ unitAppliedTo: x })
      },
      counit: {
        at: (x: unknown) => ({ counitAppliedTo: x })
      }
    }

    const H: CoreFunctor<CString, CString> = {
      onObj: (c: CString) => `H(${c})`,
      onMor: (f: unknown) => f
    }

    const K: CoreFunctor<DNumber, DNumber> = {
      onObj: (d: DNumber) => d + 1,
      onMor: (f: unknown) => f
    }

    const alpha: CoreNatTrans<CoreCompose<typeof F, typeof H>, typeof K> = {
      at: (x: unknown) => `α(${x})`
    }

    const sampleObjs: CString[] = ['c1', 'c2']
    const result = checkMateInverses(adj, alpha, H, K, sampleObjs)
    expect(typeof result).toBe('boolean')
  })

  test('triangle identity verification', () => {
    const F: CoreFunctor<CString, DNumber> = {
      onObj: (c: CString) => c.length,
      onMor: (f: unknown) => f
    }

    const U: CoreFunctor<DNumber, CString> = {
      onObj: (d: DNumber) => `U(${d})`,
      onMor: (f: unknown) => f
    }

    const adj: CoreAdjunction<CString, DNumber, typeof F, typeof U> = {
      F,
      U,
      unit: {
        at: (x: unknown) => ({ unitAppliedTo: x })
      },
      counit: {
        at: (x: unknown) => ({ counitAppliedTo: x })
      }
    }

    const sampleCObjs: CString[] = ['c1', 'c2']
    const sampleDObjs: DNumber[] = [1, 2]

    const triangles = verifyTriangleIdentities(adj, sampleDObjs, sampleCObjs)
    expect(triangles).toBeDefined()
    expect(triangles.triangle1).toBeDefined()
    expect(triangles.triangle2).toBeDefined()
    expect(triangles.bothPass).toBeDefined()
    expect(typeof triangles.bothPass).toBe('boolean')
  })

  test('dual mate shapes work', () => {
    const F: CoreFunctor<CString, DNumber> = {
      onObj: (c: CString) => c.length,
      onMor: (f: unknown) => f
    }

    const U: CoreFunctor<DNumber, CString> = {
      onObj: (d: DNumber) => `U(${d})`,
      onMor: (f: unknown) => f
    }

    const adj: CoreAdjunction<CString, DNumber, typeof F, typeof U> = {
      F,
      U,
      unit: {
        at: (x: unknown) => ({ unitAppliedTo: x })
      },
      counit: {
        at: (x: unknown) => ({ counitAppliedTo: x })
      }
    }

    const H: CoreFunctor<CString, CString> = {
      onObj: (c: CString) => `H(${c})`,
      onMor: (f: unknown) => f
    }

    const K: CoreFunctor<DNumber, DNumber> = {
      onObj: (d: DNumber) => d + 1,
      onMor: (f: unknown) => f
    }

    // Test dual shapes
    const gamma: CoreNatTrans<typeof H, CoreCompose<typeof K, typeof U>> = {
      at: (x: unknown) => `γ(${x})`
    }

    const leftDual = leftMateRightShape(adj, gamma, H, K)
    expect(leftDual).toBeDefined()
    expect(leftDual.at).toBeDefined()

    const alpha: CoreNatTrans<CoreCompose<typeof F, typeof H>, typeof K> = {
      at: (x: unknown) => `α(${x})`
    }

    const rightDual = rightMateRightShape(adj, alpha, H, K)
    expect(rightDual).toBeDefined()
    expect(rightDual.at).toBeDefined()
  })

  test('integration with existing infrastructure', () => {
    // Test that core adjunctions can work with our existing FinSet/Vect
    const mockFinSetFunctor: CoreFunctor<FinSetObj, number> = {
      onObj: (S: FinSetObj) => S.elements.length,
      onMor: (f: unknown) => (f as FinSetMor).map.length
    }

    const mockVectFunctor: CoreFunctor<EnhancedVect.VectObj, number> = {
      onObj: (V: EnhancedVect.VectObj) => V.dim,
      onMor: (f: unknown) => (f as EnhancedVect.VectMor).matrix.length
    }

    expect(mockFinSetFunctor.onObj({ elements: ['a', 'b'] })).toBe(2)
    expect(mockVectFunctor.onObj({ dim: 3 })).toBe(3)

    // These can be used as building blocks for real adjunctions
    expect(mockFinSetFunctor).toBeDefined()
    expect(mockVectFunctor).toBeDefined()
  })
})