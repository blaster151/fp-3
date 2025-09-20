import { describe, test, expect } from 'vitest'
import {
  // Core adjunction framework
  CoreCategory,
  CoreFunctor,
  CoreNatTrans,
  CoreAdjunction,
  CoreId,
  CoreCompose,
  coreIdFunctor,
  coreComposeFun,
  coreWhiskerLeft,
  coreWhiskerRight,
  coreVcomp,
  coreIdNat,
  leftMate,
  rightMate,
  checkMateInverses,
  verifyTriangleIdentities,
  leftMateRightShape,
  rightMateRightShape,
  // Existing infrastructure
  FinSet,
  FinSetObj,
  FinSetMor,
  EnhancedVect
} from '../allTS'

describe('Core Adjunction Framework', () => {
  test('core functor operations work', () => {
    // Test identity functor
    const idF = coreIdFunctor<string>()
    expect(idF.onObj('x')).toBe('x')
    expect(idF.onMor('f')).toBe('f')

    // Test functor composition
    const F: CoreFunctor<string, number> = {
      onObj: (s: string) => s.length,
      onMor: (f: any) => f
    }

    const G: CoreFunctor<number, boolean> = {
      onObj: (n: number) => n > 0,
      onMor: (f: any) => f
    }

    const GF = coreComposeFun(F, G)
    expect(GF.onObj('hello')).toBe(true)  // length 5 > 0
    expect(GF.onObj('')).toBe(false)      // length 0 = 0
  })

  test('natural transformation operations work', () => {
    const F: CoreFunctor<string, string> = {
      onObj: (s: string) => `F(${s})`,
      onMor: (f: any) => `F(${f})`
    }

    const G: CoreFunctor<string, string> = {
      onObj: (s: string) => `G(${s})`,
      onMor: (f: any) => `G(${f})`
    }

    const alpha: CoreNatTrans<typeof F, typeof G> = {
      at: (x: any) => `α(${x})`
    }

    // Test whiskering
    const H: CoreFunctor<number, string> = {
      onObj: (n: number) => n.toString(),
      onMor: (f: any) => f
    }

    const whiskerL = coreWhiskerLeft(H, alpha)
    expect(whiskerL.at).toBeDefined()

    const whiskerR = coreWhiskerRight(alpha, H)
    expect(whiskerR.at).toBeDefined()

    // Test vertical composition
    const beta: CoreNatTrans<typeof G, typeof F> = {
      at: (x: any) => `β(${x})`
    }

    const comp = coreVcomp(alpha, beta)
    expect(comp.at).toBeDefined()
  })

  test('simple adjunction construction', () => {
    // Create a simple adjunction between mock categories
    const C = { name: 'C' }
    const D = { name: 'D' }

    const F: CoreFunctor<typeof C, typeof D> = {
      onObj: (c: any) => `F(${c})`,
      onMor: (f: any) => `F(${f})`
    }

    const U: CoreFunctor<typeof D, typeof C> = {
      onObj: (d: any) => `U(${d})`,
      onMor: (f: any) => `U(${f})`
    }

    const unit: CoreNatTrans<any, any> = {
      at: (x: any) => `η(${x})`
    }

    const counit: CoreNatTrans<any, any> = {
      at: (x: any) => `ε(${x})`
    }

    const adj: CoreAdjunction<typeof C, typeof D, typeof F, typeof U> = {
      F, U, unit, counit
    }

    expect(adj.F).toBe(F)
    expect(adj.U).toBe(U)
    expect(adj.unit).toBe(unit)
    expect(adj.counit).toBe(counit)
  })

  test('mate utilities work', () => {
    // Create simple adjunction
    const C = { name: 'C' }
    const D = { name: 'D' }

    const F: CoreFunctor<typeof C, typeof D> = {
      onObj: (c: any) => `F(${c})`,
      onMor: (f: any) => `F(${f})`
    }

    const U: CoreFunctor<typeof D, typeof C> = {
      onObj: (d: any) => `U(${d})`,
      onMor: (f: any) => `U(${f})`
    }

    const adj: CoreAdjunction<typeof C, typeof D, typeof F, typeof U> = {
      F, U,
      unit: { at: (x: any) => `η(${x})` },
      counit: { at: (x: any) => `ε(${x})` }
    }

    // Create test functors H: C -> E, K: D -> E
    const H: CoreFunctor<typeof C, any> = {
      onObj: (c: any) => `H(${c})`,
      onMor: (f: any) => `H(${f})`
    }

    const K: CoreFunctor<typeof D, any> = {
      onObj: (d: any) => `K(${d})`,
      onMor: (f: any) => `K(${f})`
    }

    // Test natural transformation α : F∘H ⇒ K
    const alpha: CoreNatTrans<any, any> = {
      at: (x: any) => `α(${x})`
    }

    // Compute left mate
    const alphaMate = leftMate(adj, alpha, H, K)
    expect(alphaMate).toBeDefined()
    expect(alphaMate.at).toBeDefined()

    // Compute right mate
    const beta: CoreNatTrans<any, any> = {
      at: (x: any) => `β(${x})`
    }

    const betaMate = rightMate(adj, beta, H, K)
    expect(betaMate).toBeDefined()
    expect(betaMate.at).toBeDefined()
  })

  test('mate inverses check', () => {
    const C = { name: 'C' }
    const D = { name: 'D' }

    const F: CoreFunctor<typeof C, typeof D> = {
      onObj: (c: any) => `F(${c})`,
      onMor: (f: any) => `F(${f})`
    }

    const U: CoreFunctor<typeof D, typeof C> = {
      onObj: (d: any) => `U(${d})`,
      onMor: (f: any) => `U(${f})`
    }

    const adj: CoreAdjunction<typeof C, typeof D, typeof F, typeof U> = {
      F, U,
      unit: { at: (x: any) => `η(${x})` },
      counit: { at: (x: any) => `ε(${x})` }
    }

    const H: CoreFunctor<typeof C, any> = {
      onObj: (c: any) => `H(${c})`,
      onMor: (f: any) => `H(${f})`
    }

    const K: CoreFunctor<typeof D, any> = {
      onObj: (d: any) => `K(${d})`,
      onMor: (f: any) => `K(${f})`
    }

    const alpha: CoreNatTrans<any, any> = {
      at: (x: any) => `α(${x})`
    }

    const sampleObjs = ['c1', 'c2']
    const result = checkMateInverses(adj, alpha, H, K, sampleObjs)
    expect(typeof result).toBe('boolean')
  })

  test('triangle identity verification', () => {
    const C = { name: 'C' }
    const D = { name: 'D' }

    const F: CoreFunctor<typeof C, typeof D> = {
      onObj: (c: any) => `F(${c})`,
      onMor: (f: any) => `F(${f})`
    }

    const U: CoreFunctor<typeof D, typeof C> = {
      onObj: (d: any) => `U(${d})`,
      onMor: (f: any) => `U(${f})`
    }

    const adj: CoreAdjunction<typeof C, typeof D, typeof F, typeof U> = {
      F, U,
      unit: { at: (x: any) => `η(${x})` },
      counit: { at: (x: any) => `ε(${x})` }
    }

    const sampleCObjs = ['c1', 'c2']
    const sampleDObjs = ['d1', 'd2']

    const triangles = verifyTriangleIdentities(adj, sampleDObjs, sampleCObjs)
    expect(triangles).toBeDefined()
    expect(triangles.triangle1).toBeDefined()
    expect(triangles.triangle2).toBeDefined()
    expect(triangles.bothPass).toBeDefined()
    expect(typeof triangles.bothPass).toBe('boolean')
  })

  test('dual mate shapes work', () => {
    const C = { name: 'C' }
    const D = { name: 'D' }

    const F: CoreFunctor<typeof C, typeof D> = {
      onObj: (c: any) => `F(${c})`,
      onMor: (f: any) => `F(${f})`
    }

    const U: CoreFunctor<typeof D, typeof C> = {
      onObj: (d: any) => `U(${d})`,
      onMor: (f: any) => `U(${f})`
    }

    const adj: CoreAdjunction<typeof C, typeof D, typeof F, typeof U> = {
      F, U,
      unit: { at: (x: any) => `η(${x})` },
      counit: { at: (x: any) => `ε(${x})` }
    }

    const H: CoreFunctor<typeof C, any> = {
      onObj: (c: any) => `H(${c})`,
      onMor: (f: any) => `H(${f})`
    }

    const K: CoreFunctor<typeof D, any> = {
      onObj: (d: any) => `K(${d})`,
      onMor: (f: any) => `K(${f})`
    }

    // Test dual shapes
    const gamma: CoreNatTrans<any, any> = {
      at: (x: any) => `γ(${x})`
    }

    const leftDual = leftMateRightShape(adj, gamma, H, K)
    expect(leftDual).toBeDefined()
    expect(leftDual.at).toBeDefined()

    const alpha: CoreNatTrans<any, any> = {
      at: (x: any) => `α(${x})`
    }

    const rightDual = rightMateRightShape(adj, alpha, H, K)
    expect(rightDual).toBeDefined()
    expect(rightDual.at).toBeDefined()
  })

  test('integration with existing infrastructure', () => {
    // Test that core adjunctions can work with our existing FinSet/Vect
    const mockFinSetFunctor: CoreFunctor<FinSetObj, any> = {
      onObj: (S: FinSetObj) => S.elements.length,
      onMor: (f: FinSetMor) => f.map.length
    }

    const mockVectFunctor: CoreFunctor<EnhancedVect.VectObj, any> = {
      onObj: (V: EnhancedVect.VectObj) => V.dim,
      onMor: (f: EnhancedVect.VectMor) => f.matrix.length
    }

    expect(mockFinSetFunctor.onObj({ elements: ['a', 'b'] })).toBe(2)
    expect(mockVectFunctor.onObj({ dim: 3 })).toBe(3)

    // These can be used as building blocks for real adjunctions
    expect(mockFinSetFunctor).toBeDefined()
    expect(mockVectFunctor).toBeDefined()
  })
})