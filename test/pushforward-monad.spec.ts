import { describe, test, expect } from 'vitest'
import {
  // Basic types
  FinSet,
  FinSetObj,
  FinSetMor,
  // Categorical structures
  CatFunctor,
  CatNatTrans,
  CatIdentity,
  CatCompose,
  CategoricalMonad,
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
  pushforwardMonad
} from '../allTS'

describe('Pushforward monads', () => {
  test('can construct basic categorical structures', () => {
    // Create a simple identity functor
    const idFinSet: CatIdentity<typeof FinSet> = {
      source: FinSet,
      target: FinSet,
      onObj: (obj: any) => obj,
      onMor: (mor: any) => mor
    }

    expect(idFinSet.source).toBe(FinSet)
    expect(idFinSet.target).toBe(FinSet)

    // Test identity functor constructor
    const idFunctor = idFun(FinSet)
    expect(idFunctor.source).toBe(FinSet)
    expect(idFunctor.target).toBe(FinSet)
  })

  test('functor composition works', () => {
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

  test('pushforward monad constructor is well-typed', () => {
    // Create dummy structures for type checking
    const C = { name: 'C' }
    const D = { name: 'D' }

    const F: CatFunctor<typeof C, typeof D> = {
      source: C,
      target: D,
      onObj: (x: any) => `F(${x})`,
      onMor: (f: any) => `F(${f})`
    }

    const U: CatFunctor<typeof D, typeof C> = {
      source: D,
      target: C,
      onObj: (x: any) => `U(${x})`,
      onMor: (f: any) => `U(${f})`
    }

    // Mock natural transformations for adjunction
    const unit: CatNatTrans<CatIdentity<typeof C>, CatCompose<typeof U, typeof F>> = {
      source: idFun(C),
      target: composeFun(U, F),
      component: (x: any) => `η(${x})`
    }

    const counit: CatNatTrans<CatCompose<typeof F, typeof U>, CatIdentity<typeof D>> = {
      source: composeFun(F, U),
      target: idFun(D),
      component: (x: any) => `ε(${x})`
    }

    const adj: Adjunction<typeof C, typeof D, typeof F, typeof U> = {
      F, U, unit, counit
    }

    // Mock monad on C
    const T: CategoricalMonad<typeof C> = {
      category: C,
      endofunctor: {
        source: C,
        target: C,
        onObj: (x: any) => `T(${x})`,
        onMor: (f: any) => `T(${f})`
      },
      unit: {
        source: idFun(C),
        target: {} as any, // simplified for test
        component: (x: any) => `η^T(${x})`
      },
      mult: {
        source: {} as any, // simplified for test
        target: {} as any,
        component: (x: any) => `μ^T(${x})`
      }
    }

    // This should compile and create a pushforward monad
    const TUp = pushforwardMonad(adj, T)
    
    expect(TUp.category).toBe(D)
    expect(TUp.endofunctor).toBeDefined()
    expect(TUp.unit).toBeDefined()
    expect(TUp.mult).toBeDefined()
  })

  test('natural transformation operations work', () => {
    // Create simple functors for testing
    const F: CatFunctor<'A', 'B'> = {
      source: 'A',
      target: 'B',
      onObj: (x: any) => `F(${x})`,
      onMor: (f: any) => `F(${f})`
    }

    const G: CatFunctor<'B', 'C'> = {
      source: 'B', 
      target: 'C',
      onObj: (x: any) => `G(${x})`,
      onMor: (f: any) => `G(${f})`
    }

    const H: CatFunctor<'A', 'B'> = {
      source: 'A',
      target: 'B', 
      onObj: (x: any) => `H(${x})`,
      onMor: (f: any) => `H(${f})`
    }

    // Natural transformation α: F ⇒ H
    const alpha: CatNatTrans<typeof F, typeof H> = {
      source: F,
      target: H,
      component: (x: any) => `α(${x})`
    }

    // Test left whiskering G ▷ α
    const Galpha = whiskerLeft(G, alpha)
    expect(Galpha.source.first).toBe(F)
    expect(Galpha.source.second).toBe(G)
    expect(Galpha.target.first).toBe(H)
    expect(Galpha.target.second).toBe(G)

    // Test right whiskering α ◁ G (need to adjust types)
    const K: CatFunctor<'C', 'A'> = {
      source: 'C',
      target: 'A',
      onObj: (x: any) => `K(${x})`,
      onMor: (f: any) => `K(${f})`
    }

    const alphaK = whiskerRight(alpha, K)
    expect(alphaK.source.first).toBe(K)
    expect(alphaK.source.second).toBe(F)
  })
})