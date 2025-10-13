import { describe, test, expect } from 'vitest'
import {
  EnhancedVect,
  CategoryLimits,
  IndexedFamilies
} from '../allTS'

const randMat = (r: number, c: number) =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => (Math.random() < 0.5 ? 0 : 1)))

describe('mediateProduct / isProductForCone (Vect)', () => {
  test('build canonical mediator and verify triangles', () => {
    const X: EnhancedVect.VectObj = { dim: 3 }
    const [V1, V2]: readonly [EnhancedVect.VectObj, EnhancedVect.VectObj] = [{ dim: 2 }, { dim: 1 }]
    const { I, Ifin } = IndexedFamilies.familyFromArray([0, 1]) // indices 0,1
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const f0: EnhancedVect.VectMor = { matrix: randMat(X.dim, V1.dim), from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: randMat(X.dim, V2.dim), from: X, to: V2 }
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = { 
      tip: X, 
      legs: (i: number) => (i === 0 ? f0 : f1) 
    }

    // generic mediate
    const { product: P, projections, mediator } =
      CategoryLimits.mediateProduct(Ifin, F, EnhancedVect.VectProductsWithTuple, X, cone.legs)

    // triangles via generic predicate
    const { triangles, unique } =
      CategoryLimits.isProductForCone(
        EnhancedVect.Vect, 
        EnhancedVect.Vect.equalMor!, 
        Ifin, 
        F, 
        P, 
        projections, 
        cone, 
        EnhancedVect.VectProductsWithTuple.tuple
      )

    expect(triangles).toBe(true)
    expect(unique).toBe(true)

    // Cross-check with "shape-only" product
    const { product: P2, projections: proj2 } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    expect(P2.dim).toBe(P.dim)
    expect(proj2(0).to.dim).toBe(V1.dim)
    expect(proj2(1).to.dim).toBe(V2.dim)
  })

  test('generic mediator matches specialized construction', () => {
    const X: EnhancedVect.VectObj = { dim: 2 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Ifin = { carrier: [0, 1] }
    const F = (i: number) => (i === 0 ? V1 : V2)
    
    const f0: EnhancedVect.VectMor = { matrix: [[1], [2]], from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: [[3], [4]], from: X, to: V2 }
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? f0 : f1)
    }
    
    // Generic construction
    const { mediator: generic } = CategoryLimits.mediateProduct(
      Ifin, F, EnhancedVect.VectProductsWithTuple, X, cone.legs
    )
    
    // Specialized construction
    const { product: P } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    const specialized = EnhancedVect.tupleVectFromCone(Ifin, cone, P)
    
    // Should be identical
    expect(EnhancedVect.Vect.equalMor!(generic, specialized)).toBe(true)
  })
})

describe('mediateCoproduct / isCoproductForCocone (Vect)', () => {
  test('build canonical cotuple and verify triangles', () => {
    const [V1, V2]: readonly [EnhancedVect.VectObj, EnhancedVect.VectObj] = [{ dim: 2 }, { dim: 1 }]
    const Y: EnhancedVect.VectObj = { dim: 3 }
    const { I, Ifin } = IndexedFamilies.familyFromArray([0, 1])
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const g0: EnhancedVect.VectMor = { matrix: randMat(V1.dim, Y.dim), from: V1, to: Y }
    const g1: EnhancedVect.VectMor = { matrix: randMat(V2.dim, Y.dim), from: V2, to: Y }
    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = { 
      coTip: Y, 
      legs: (i: number) => (i === 0 ? g0 : g1) 
    }

    const { coproduct: C, injections, mediator } =
      CategoryLimits.mediateCoproduct(Ifin, F, EnhancedVect.VectCoproductsWithCotuple, Y, cocone.legs)

    const { triangles, unique } =
      CategoryLimits.isCoproductForCocone(
        EnhancedVect.Vect, 
        EnhancedVect.Vect.equalMor!, 
        Ifin, 
        F, 
        C, 
        injections, 
        cocone, 
        EnhancedVect.VectCoproductsWithCotuple.cotuple
      )

    expect(triangles).toBe(true)
    expect(unique).toBe(true)

    // Cross-check with "shape-only" coproduct
    const { coproduct: C2, injections: inj2 } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)
    expect(C2.dim).toBe(C.dim)
    expect(inj2(0).from.dim).toBe(V1.dim)
    expect(inj2(1).from.dim).toBe(V2.dim)
  })

  test('generic mediator matches specialized construction', () => {
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Y: EnhancedVect.VectObj = { dim: 2 }
    const Ifin = { carrier: [0, 1] }
    const F = (i: number) => (i === 0 ? V1 : V2)
    
    const g0: EnhancedVect.VectMor = { matrix: [[1, 0]], from: V1, to: Y }
    const g1: EnhancedVect.VectMor = { matrix: [[0, 1]], from: V2, to: Y }
    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i: number) => (i === 0 ? g0 : g1)
    }
    
    // Generic construction
    const { mediator: generic } = CategoryLimits.mediateCoproduct(
      Ifin, F, EnhancedVect.VectCoproductsWithCotuple, Y, cocone.legs
    )
    
    // Specialized construction
    const { coproduct: C } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)
    const specialized = EnhancedVect.cotupleVectFromCocone(Ifin, cocone, C)
    
    // Should be identical
    expect(EnhancedVect.Vect.equalMor!(generic, specialized)).toBe(true)
  })
})

describe('Generic universal property framework', () => {
  test('mediateProduct provides complete universal property solution', () => {
    const X: EnhancedVect.VectObj = { dim: 2 }
    const family = (i: number) => ({ dim: i + 1 })
    const Ifin = { carrier: [0, 1, 2] }
    
    // Create legs
    const legs = (i: number): EnhancedVect.VectMor => ({
      matrix: Array.from({ length: X.dim }, () => Array.from({ length: i + 1 }, () => Math.floor(Math.random() * 2))),
      from: X,
      to: family(i)
    })
    
    // Use generic mediator
    const result = CategoryLimits.mediateProduct(
      Ifin, 
      family, 
      EnhancedVect.VectProductsWithTuple, 
      X, 
      legs
    )
    
    expect(result.product.dim).toBe(6) // 1+2+3
    expect(result.mediator.from).toBe(X)
    expect(result.mediator.to).toBe(result.product)
    
    // Verify universal property
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs
    }
    
    const verification = CategoryLimits.isProductForCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      family,
      result.product,
      result.projections,
      cone,
      EnhancedVect.VectProductsWithTuple.tuple
    )
    
    expect(verification.triangles).toBe(true)
    expect(verification.unique).toBe(true)
  })
})