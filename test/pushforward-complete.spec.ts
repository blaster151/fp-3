import { describe, test, expect } from 'vitest'
import {
  FinSet,
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
  freeVectFunctor,
  forgetVectFunctor,
  freeForgetfulAdjunction,
  listMonadFinSet,
  EnhancedVect
} from '../allTS'
import type {
  FinSetObj,
  FinSetMor,
  CatFunctor,
  CatNatTrans,
  CatMonad,
  Adjunction,
  CatId,
  CatCompose
} from '../allTS'

describe('Complete Pushforward Monad Implementation', () => {
  test('can construct categorical structures', () => {
    // Test basic functor composition
    const F: CatFunctor<string, string> = {
      source: 'A',
      target: 'B',
      onObj: (x: string) => `F(${x})`,
      onMor: (f: string) => `F(${f})`
    }

    const G: CatFunctor<string, string> = {
      source: 'B',
      target: 'C',
      onObj: (x: string) => `G(${x})`,
      onMor: (f: string) => `G(${f})`
    }

    const GF = composeFun(F, G)
    expect(GF.source).toBe('A')
    expect(GF.target).toBe('C')
    expect(GF.onObj('x')).toBe('G(F(x))')
    expect(GF.onMor('f')).toBe('G(F(f))')
  })

  test('natural transformation operations work', () => {
    const F: CatFunctor<string, string> = {
      source: 'A',
      target: 'B',
      onObj: (x: string) => `F(${x})`,
      onMor: (f: string) => `F(${f})`
    }

    const G: CatFunctor<string, string> = {
      source: 'A',
      target: 'B',
      onObj: (x: string) => `G(${x})`,
      onMor: (f: string) => `G(${f})`
    }

    const alpha: CatNatTrans<typeof F, typeof G> = {
      source: F,
      target: G,
      component: (x: string) => `α(${x})`
    }

    const H: CatFunctor<string, string> = {
      source: 'C',
      target: 'A',
      onObj: (x: string) => `H(${x})`,
      onMor: (f: string) => `H(${f})`
    }

    // Test whiskering
    const alphaH = whiskerRight(alpha, H)
    expect(alphaH).toBeDefined()
    expect(alphaH.component).toBeDefined()

    // Test vertical composition
    const beta: CatNatTrans<typeof G, typeof F> = {
      source: G,
      target: F,
      component: (x: string) => `β(${x})`
    }

    const comp = vcomp(alpha, beta)
    expect(comp.source).toBe(F)
    expect(comp.target).toBe(F)
  })

  test('adjunction mates work', () => {
    // Create a simple adjunction
    const F: CatFunctor<string, string> = {
      source: 'C',
      target: 'D',
      onObj: (x: string) => `F(${x})`,
      onMor: (f: string) => `F(${f})`
    }

    const U: CatFunctor<string, string> = {
      source: 'D',
      target: 'C',
      onObj: (x: string) => `U(${x})`,
      onMor: (f: string) => `U(${f})`
    }

    const unit: CatNatTrans<CatId<string>, CatCompose<typeof U, typeof F>> = {
      source: idFun('C'),
      target: composeFun(U, F),
      component: (x: string) => `η(${x})`
    }

    const counit: CatNatTrans<CatCompose<typeof F, typeof U>, CatId<string>> = {
      source: composeFun(F, U),
      target: idFun('D'),
      component: (x: string) => `ε(${x})`
    }

    const adj: Adjunction<string, string, typeof F, typeof U> = {
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
    const T: CatMonad<string> = {
      category: 'C',
      endofunctor: {
        source: 'C',
        target: 'C',
        onObj: (x: string) => `T(${x})`,
        onMor: (f: string) => `T(${f})`
      },
      unit: {
        source: idFun('C'),
        target: {} as unknown as CatFunctor<string, string>,
        component: (x: string) => `η^T(${x})`
      },
      mult: {
        source: {} as unknown as CatCompose<CatFunctor<string, string>, CatFunctor<string, string>>,
        target: {} as unknown as CatFunctor<string, string>,
        component: (x: string) => `μ^T(${x})`
      }
    }

    // Create adjunction
    const F: CatFunctor<string, string> = {
      source: 'C',
      target: 'D',
      onObj: (x: string) => `F(${x})`,
      onMor: (f: string) => `F(${f})`
    }

    const U: CatFunctor<string, string> = {
      source: 'D',
      target: 'C',
      onObj: (x: string) => `U(${x})`,
      onMor: (f: string) => `U(${f})`
    }

    const adj: Adjunction<string, string, typeof F, typeof U> = {
      F, U,
      unit: {
        source: idFun('C'),
        target: composeFun(U, F),
        component: (x: string) => `η(${x})`
      },
      counit: {
        source: composeFun(F, U),
        target: idFun('D'),
        component: (x: string) => `ε(${x})`
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
    const T: CatMonad<string> = {
      category: 'C',
      endofunctor: {
        source: 'C',
        target: 'C',
        onObj: (x: string) => `T(${x})`,
        onMor: (f: string) => `T(${f})`
      },
      unit: {
        source: idFun('C'),
        target: {} as unknown as CatFunctor<string, string>,
        component: (x: string) => `η^T(${x})`
      },
      mult: {
        source: {} as unknown as CatCompose<CatFunctor<string, string>, CatFunctor<string, string>>,
        target: {} as unknown as CatFunctor<string, string>,
        component: (x: string) => `μ^T(${x})`
      }
    }

    const adj: Adjunction<string, string, CatFunctor<string, string>, CatFunctor<string, string>> = {
      F: { source: 'C', target: 'D', onObj: (x: string) => x, onMor: (f: string) => f },
      U: { source: 'D', target: 'C', onObj: (x: string) => x, onMor: (f: string) => f },
      unit: {
        source: idFun('C'),
        target: {} as unknown as CatCompose<CatFunctor<string, string>, CatFunctor<string, string>>,
        component: (x: string) => x
      },
      counit: {
        source: {} as unknown as CatCompose<CatFunctor<string, string>, CatFunctor<string, string>>,
        target: idFun('D'),
        component: (x: string) => x
      }
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
    const hasEmptyList = ListS.elements.some((list: unknown) =>
      Array.isArray(list) && list.length === 0
    )
    const hasSingleton = ListS.elements.some((list: unknown) =>
      Array.isArray(list) && list.length === 1 && (list as unknown[])[0] === 'a'
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
      action: (lists: unknown) => {
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