import { describe, test, expect } from 'vitest'
import {
  // Basic types
  FinSet,
  FinSetObj,
  FinSetMor,
  // Categorical structures
  CatFunctor,
  CatNatTrans,
  CatMonad,
  Adjunction,
  // Operations
  composeFun,
  idFun,
  whiskerLeft,
  whiskerRight,
  vcomp,
  hcomp,
  unitMate,
  counitMate,
  pushforwardMonad,
  colaxAlongLeftAdjoint,
  pushforwardAlgebra,
  // Examples
  freeVectFunctor,
  forgetVectFunctor,
  freeForgetfulAdjunction,
  listMonadFinSet,
  // Enhanced Vect
  EnhancedVect
} from '../allTS'

describe('Complete Pushforward Monad Implementation', () => {
  test('can construct categorical structures', () => {
    // Test basic functor composition
    const F: CatFunctor<any, any> = {
      source: 'A',
      target: 'B',
      onObj: (x: any) => `F(${x})`,
      onMor: (f: any) => `F(${f})`
    }

    const G: CatFunctor<any, any> = {
      source: 'B',
      target: 'C',
      onObj: (x: any) => `G(${x})`,
      onMor: (f: any) => `G(${f})`
    }

    const GF = composeFun(F, G)
    expect(GF.source).toBe('A')
    expect(GF.target).toBe('C')
    expect(GF.onObj('x')).toBe('G(F(x))')
    expect(GF.onMor('f')).toBe('G(F(f))')
  })

  test('natural transformation operations work', () => {
    const F: CatFunctor<any, any> = {
      source: 'A',
      target: 'B',
      onObj: (x: any) => `F(${x})`,
      onMor: (f: any) => `F(${f})`
    }

    const G: CatFunctor<any, any> = {
      source: 'A',
      target: 'B',
      onObj: (x: any) => `G(${x})`,
      onMor: (f: any) => `G(${f})`
    }

    const alpha: CatNatTrans<any, any> = {
      source: F,
      target: G,
      component: (x: any) => `α(${x})`
    }

    const H: CatFunctor<any, any> = {
      source: 'C',
      target: 'A',
      onObj: (x: any) => `H(${x})`,
      onMor: (f: any) => `H(${f})`
    }

    // Test whiskering
    const alphaH = whiskerRight(alpha, H)
    expect(alphaH).toBeDefined()
    expect(alphaH.component).toBeDefined()

    // Test vertical composition
    const beta: CatNatTrans<any, any> = {
      source: G,
      target: F,
      component: (x: any) => `β(${x})`
    }

    const comp = vcomp(alpha, beta)
    expect(comp.source).toBe(F)
    expect(comp.target).toBe(F)
  })

  test('adjunction mates work', () => {
    // Create a simple adjunction
    const F: CatFunctor<any, any> = {
      source: 'C',
      target: 'D',
      onObj: (x: any) => `F(${x})`,
      onMor: (f: any) => `F(${f})`
    }

    const U: CatFunctor<any, any> = {
      source: 'D',
      target: 'C',
      onObj: (x: any) => `U(${x})`,
      onMor: (f: any) => `U(${f})`
    }

    const unit: CatNatTrans<any, any> = {
      source: idFun('C'),
      target: composeFun(U, F),
      component: (x: any) => `η(${x})`
    }

    const counit: CatNatTrans<any, any> = {
      source: composeFun(F, U),
      target: idFun('D'),
      component: (x: any) => `ε(${x})`
    }

    const adj: Adjunction<any, any, any, any> = {
      F, U, unit, counit
    }

    // Test mate construction
    const unitM = unitMate(adj)
    expect(unitM).toBeDefined()
    expect(unitM.source).toBeDefined()
    expect(unitM.target).toBeDefined()

    const counitM = counitMate(adj)
    expect(counitM).toBeDefined()
    expect(counitM.source).toBeDefined()
    expect(counitM.target).toBeDefined()
  })

  test('pushforward monad construction', () => {
    // Create a simple monad
    const T: CatMonad<any> = {
      category: 'C',
      endofunctor: {
        source: 'C',
        target: 'C',
        onObj: (x: any) => `T(${x})`,
        onMor: (f: any) => `T(${f})`
      },
      unit: {
        source: idFun('C'),
        target: {} as any,
        component: (x: any) => `η^T(${x})`
      },
      mult: {
        source: {} as any,
        target: {} as any,
        component: (x: any) => `μ^T(${x})`
      }
    }

    // Create adjunction
    const F: CatFunctor<any, any> = {
      source: 'C',
      target: 'D',
      onObj: (x: any) => `F(${x})`,
      onMor: (f: any) => `F(${f})`
    }

    const U: CatFunctor<any, any> = {
      source: 'D',
      target: 'C',
      onObj: (x: any) => `U(${x})`,
      onMor: (f: any) => `U(${f})`
    }

    const adj: Adjunction<any, any, any, any> = {
      F, U,
      unit: {
        source: idFun('C'),
        target: composeFun(U, F),
        component: (x: any) => `η(${x})`
      },
      counit: {
        source: composeFun(F, U),
        target: idFun('D'),
        component: (x: any) => `ε(${x})`
      }
    }

    // Test pushforward construction
    const TUp = pushforwardMonad(adj, T)
    expect(TUp).toBeDefined()
    expect(TUp.category).toBe('D')
    expect(TUp.endofunctor).toBeDefined()
    expect(TUp.unit).toBeDefined()
    expect(TUp.mult).toBeDefined()
  })

  test('colax morphism construction', () => {
    // Simple test for colax morphism
    const T: CatMonad<any> = {
      category: 'C',
      endofunctor: {
        source: 'C',
        target: 'C',
        onObj: (x: any) => `T(${x})`,
        onMor: (f: any) => `T(${f})`
      },
      unit: {
        source: idFun('C'),
        target: {} as any,
        component: (x: any) => `η^T(${x})`
      },
      mult: {
        source: {} as any,
        target: {} as any,
        component: (x: any) => `μ^T(${x})`
      }
    }

    const adj: Adjunction<any, any, any, any> = {
      F: { source: 'C', target: 'D', onObj: (x: any) => x, onMor: (f: any) => f },
      U: { source: 'D', target: 'C', onObj: (x: any) => x, onMor: (f: any) => f },
      unit: { source: idFun('C'), target: {} as any, component: (x: any) => x },
      counit: { source: {} as any, target: idFun('D'), component: (x: any) => x }
    }

    const colax = colaxAlongLeftAdjoint(adj, T)
    expect(colax).toBeDefined()
    expect(colax.source).toBeDefined()
    expect(colax.target).toBeDefined()
  })

  test('concrete free-forgetful adjunction', () => {
    const adj = freeForgetfulAdjunction()
    expect(adj.F).toBeDefined()
    expect(adj.U).toBeDefined()
    expect(adj.unit).toBeDefined()
    expect(adj.counit).toBeDefined()

    // Test that functors work on simple objects
    const S: FinSetObj = { elements: ['a', 'b'] }
    const V = adj.F.onObj(S)
    expect(V.dim).toBe(2)

    const S2 = adj.U.onObj(V)
    expect(S2.elements.length).toBe(2)
  })

  test('list monad construction', () => {
    const listMonad = listMonadFinSet()
    expect(listMonad.category).toBe(FinSet)
    expect(listMonad.endofunctor).toBeDefined()
    expect(listMonad.unit).toBeDefined()
    expect(listMonad.mult).toBeDefined()

    // Test on a simple set
    const S: FinSetObj = { elements: ['a'] }
    const ListS = listMonad.endofunctor.onObj(S)
    expect(ListS.elements).toBeDefined()
    expect(ListS.elements.length).toBeGreaterThan(0)

    // Should contain at least the empty list and singleton lists
    const hasEmptyList = ListS.elements.some((list: any) => 
      Array.isArray(list) && list.length === 0
    )
    const hasSingleton = ListS.elements.some((list: any) => 
      Array.isArray(list) && list.length === 1 && list[0] === 'a'
    )
    
    expect(hasEmptyList).toBe(true)
    expect(hasSingleton).toBe(true)
  })

  test('pushforward of list monad along free-forgetful', () => {
    const adj = freeForgetfulAdjunction()
    const listMonad = listMonadFinSet()
    
    // This would push the list monad from FinSet to Vect
    const pushedMonad = pushforwardMonad(adj, listMonad)
    
    expect(pushedMonad).toBeDefined()
    expect(pushedMonad.category).toBe(EnhancedVect.Vect)
    expect(pushedMonad.endofunctor).toBeDefined()
    expect(pushedMonad.unit).toBeDefined()
    expect(pushedMonad.mult).toBeDefined()

    // The pushed monad T↑(V) = F(List(U(V))) for vector space V
    const V: EnhancedVect.VectObj = { dim: 2 }
    const TV = pushedMonad.endofunctor.onObj(V)
    expect(TV).toBeDefined()
    expect(TV.dim).toBeDefined()
  })

  test('algebra transport', () => {
    const adj = freeForgetfulAdjunction()
    const listMonad = listMonadFinSet()
    
    // Simple algebra: sum operation on lists of numbers
    const sumAlgebra = {
      carrier: { elements: [1, 2, 3] },
      action: (lists: any) => {
        // This would sum all numbers in all lists
        return lists
      }
    }
    
    const transportedAlgebra = pushforwardAlgebra(adj, listMonad, sumAlgebra)
    expect(transportedAlgebra).toBeDefined()
    expect(transportedAlgebra.carrier).toBeDefined()
    expect(transportedAlgebra.action).toBeDefined()
  })
})