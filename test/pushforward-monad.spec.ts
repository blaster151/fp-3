import { describe, test, expect } from 'vitest'
import {
  // Basic structures
  FinSet,
  // Operations
  composeFun,
  idFun,
  whiskerLeft,
  whiskerRight,
  pushforwardMonad
} from '../allTS'
import type {
  FinSetObj,
  CatFunctor,
  CatNatTrans,
  CatId,
  CatCompose,
  CatMonad,
  Adjunction
} from '../allTS'

describe('Pushforward monads', () => {
  test('can construct basic categorical structures', () => {
    // Create a simple identity functor
    const idFinSet: CatId<typeof FinSet> = {
      source: FinSet,
      target: FinSet,
      onObj: (obj) => obj,
      onMor: (mor) => mor
    }

    expect(idFinSet.source).toBe(FinSet)
    expect(idFinSet.target).toBe(FinSet)

    // Test identity functor constructor
    const idFunctor = idFun(FinSet)
    expect(idFunctor.source).toBe(FinSet)
    expect(idFunctor.target).toBe(FinSet)
  })

  test('functor composition works', () => {
    const F: CatFunctor<'A', 'B'> = {
      source: 'A',
      target: 'B',
      onObj: (x) => `F(${x})`,
      onMor: (f) => `F(${f})`
    }

    const G: CatFunctor<'B', 'C'> = {
      source: 'B',
      target: 'C',
      onObj: (x) => `G(${x})`,
      onMor: (f) => `G(${f})`
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
      onObj: (x) => `F(${x})`,
      onMor: (f) => `F(${f})`
    }

    const U: CatFunctor<typeof D, typeof C> = {
      source: D,
      target: C,
      onObj: (x) => `U(${x})`,
      onMor: (f) => `U(${f})`
    }

    // Mock natural transformations for adjunction
    const unit: CatNatTrans<CatId<typeof C>, CatCompose<typeof U, typeof F>> = {
      source: idFun(C),
      target: composeFun(U, F),
      component: (x) => `η(${x})`
    }

    const counit: CatNatTrans<CatCompose<typeof F, typeof U>, CatId<typeof D>> = {
      source: composeFun(F, U),
      target: idFun(D),
      component: (x) => `ε(${x})`
    }

    const adj: Adjunction<typeof C, typeof D, typeof F, typeof U> = {
      F, U, unit, counit
    }

    // Mock monad on C
    const endofunctor: CatFunctor<typeof C, typeof C> = {
      source: C,
      target: C,
      onObj: (x) => `T(${x})`,
      onMor: (f) => `T(${f})`
    }

    const unitNat: CatNatTrans<CatId<typeof C>, typeof endofunctor> = {
      source: idFun(C),
      target: endofunctor,
      component: (x) => `η^T(${x})`
    }

    const endoSquared = composeFun(endofunctor, endofunctor)

    const multNat: CatNatTrans<typeof endoSquared, typeof endofunctor> = {
      source: endoSquared,
      target: endofunctor,
      component: (x) => `μ^T(${x})`
    }

    const T: CatMonad<typeof C> = {
      category: C,
      endofunctor,
      unit: unitNat,
      mult: multNat
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
      onObj: (x) => `F(${x})`,
      onMor: (f) => `F(${f})`
    }

    const G: CatFunctor<'B', 'C'> = {
      source: 'B',
      target: 'C',
      onObj: (x) => `G(${x})`,
      onMor: (f) => `G(${f})`
    }

    const H: CatFunctor<'A', 'B'> = {
      source: 'A',
      target: 'B',
      onObj: (x) => `H(${x})`,
      onMor: (f) => `H(${f})`
    }

    // Natural transformation α: F ⇒ H
    const alpha: CatNatTrans<typeof F, typeof H> = {
      source: F,
      target: H,
      component: (x) => `α(${x})`
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
      onObj: (x) => `K(${x})`,
      onMor: (f) => `K(${f})`
    }

    const alphaK = whiskerRight(alpha, K)
    expect(alphaK.source.first).toBe(K)
    expect(alphaK.source.second).toBe(F)
  })
})