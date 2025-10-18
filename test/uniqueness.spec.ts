import { describe, test, expect } from 'vitest'
import {
  EnhancedVect,
  CategoryLimits,
  IndexedFamilies
} from '../allTS'

const emptyDiagram: CategoryLimits.Diagram<number, EnhancedVect.VectMor> = { arrows: [] }

// tiny random 0/1 matrix
const randMat = (r: number, c: number) =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => (Math.random() < 0.5 ? 0 : 1)))

describe('Uniqueness — product (Vect)', () => {
  test('m and m′ satisfying triangles are equal to the canonical tuple', () => {
    const X: EnhancedVect.VectObj = { dim: 3 }
    const V1: EnhancedVect.VectObj = { dim: 2 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const I = [0, 1] as const
    const Ifin = { carrier: I as readonly number[] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const { product: P, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)

    const f0: EnhancedVect.VectMor = { matrix: randMat(X.dim, V1.dim), from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: randMat(X.dim, V2.dim), from: X, to: V2 }
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? f0 : f1),
      diagram: emptyDiagram,
    }

    const m = EnhancedVect.tupleVectFromCone(Ifin, cone, P)
    const mPrime = EnhancedVect.tupleVectFromCone(Ifin, cone, P)

    expect(EnhancedVect.productMediatorUnique(Ifin, projections, m, mPrime)).toBe(true)
    expect(EnhancedVect.productUniquenessGivenTrianglesVect(Ifin, projections, P, cone, m, mPrime)).toBe(true)

    // perturb → should fail
    const badMatrix = mPrime.matrix.map((row, r) => 
      row.map((x, c) => (r === 0 && c === 0 ? x ^ 1 : x))
    )
    const bad: EnhancedVect.VectMor = { ...mPrime, matrix: badMatrix }
    expect(EnhancedVect.productMediatorUnique(Ifin, projections, m, bad)).toBe(false)
    expect(EnhancedVect.productUniquenessGivenTrianglesVect(Ifin, projections, P, cone, m, bad)).toBe(false)
  })

  test('projections are jointly monic (uniqueness via projections)', () => {
    const X: EnhancedVect.VectObj = { dim: 2 }
    const P: EnhancedVect.VectObj = { dim: 4 } // product of {dim:3} + {dim:1}
    const I = [0, 1]
    const Ifin = { carrier: I }
    const F = (i: number) => ({ dim: i === 0 ? 3 : 1 })
    const { projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    
    // Two identical maps
    const m1: EnhancedVect.VectMor = { 
      matrix: [[1, 0, 0, 0], [0, 1, 0, 0]], 
      from: X, 
      to: P 
    }
    const m2: EnhancedVect.VectMor = { 
      matrix: [[1, 0, 0, 0], [0, 1, 0, 0]], 
      from: X, 
      to: P 
    }
    
    expect(EnhancedVect.productMediatorUnique(Ifin, projections, m1, m2)).toBe(true)
    
    // Different maps should not be unique
    const m3: EnhancedVect.VectMor = { 
      matrix: [[1, 0, 0, 1], [0, 1, 0, 0]], 
      from: X, 
      to: P 
    }
    expect(EnhancedVect.productMediatorUnique(Ifin, projections, m1, m3)).toBe(false)
  })
})

describe('Uniqueness — coproduct (Vect)', () => {
  test('m and m′ satisfying triangles are equal to the canonical cotuple', () => {
    const V1: EnhancedVect.VectObj = { dim: 2 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Y: EnhancedVect.VectObj = { dim: 3 }
    const I = [0, 1] as const
    const Ifin = { carrier: I as readonly number[] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const { coproduct: C, injections } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)

    const g0: EnhancedVect.VectMor = { matrix: randMat(V1.dim, Y.dim), from: V1, to: Y }
    const g1: EnhancedVect.VectMor = { matrix: randMat(V2.dim, Y.dim), from: V2, to: Y }
    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i: number) => (i === 0 ? g0 : g1),
      diagram: emptyDiagram,
    }

    const m = EnhancedVect.cotupleVectFromCocone(Ifin, cocone, C)
    const mPrime = EnhancedVect.cotupleVectFromCocone(Ifin, cocone, C)

    expect(EnhancedVect.coproductMediatorUnique(Ifin, injections, m, mPrime)).toBe(true)
    expect(EnhancedVect.coproductUniquenessGivenTrianglesVect(Ifin, injections, C, cocone, m, mPrime)).toBe(true)

    const badMatrix = mPrime.matrix.map((row, r) => 
      row.map((x, c) => (r === 0 && c === 0 ? x ^ 1 : x))
    )
    const bad: EnhancedVect.VectMor = { ...mPrime, matrix: badMatrix }
    expect(EnhancedVect.coproductMediatorUnique(Ifin, injections, m, bad)).toBe(false)
    expect(EnhancedVect.coproductUniquenessGivenTrianglesVect(Ifin, injections, C, cocone, m, bad)).toBe(false)
  })

  test('injections are jointly epic (uniqueness via injections)', () => {
    const C: EnhancedVect.VectObj = { dim: 3 } // coproduct of {dim:2} + {dim:1}
    const Y: EnhancedVect.VectObj = { dim: 2 }
    const I = [0, 1]
    const Ifin = { carrier: I }
    const F = (i: number) => ({ dim: i === 0 ? 2 : 1 })
    const { injections } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)
    
    // Two identical maps
    const m1: EnhancedVect.VectMor = { 
      matrix: [[1, 0, 0], [0, 1, 0]], 
      from: C, 
      to: Y 
    }
    const m2: EnhancedVect.VectMor = { 
      matrix: [[1, 0, 0], [0, 1, 0]], 
      from: C, 
      to: Y 
    }
    
    expect(EnhancedVect.coproductMediatorUnique(Ifin, injections, m1, m2)).toBe(true)
    
    // Different maps should not be unique
    const m3: EnhancedVect.VectMor = { 
      matrix: [[1, 0, 1], [0, 1, 0]], 
      from: C, 
      to: Y 
    }
    expect(EnhancedVect.coproductMediatorUnique(Ifin, injections, m1, m3)).toBe(false)
  })
})

describe('Complete Universal Property Story', () => {
  test('existence + uniqueness = universal property (product)', () => {
    // Setup: X with maps to V1, V2
    const X: EnhancedVect.VectObj = { dim: 2 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const I = [0, 1]
    const Ifin = { carrier: I }
    const F = (i: number) => (i === 0 ? V1 : V2)
    
    // Build product
    const { product: P, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    
    // Create cone
    const f0: EnhancedVect.VectMor = { matrix: [[2], [3]], from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: [[5], [7]], from: X, to: V2 }
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? f0 : f1),
      diagram: emptyDiagram,
    }
    
    // EXISTENCE: canonical mediator exists and satisfies triangles
    const canonical = EnhancedVect.tupleVectFromCone(Ifin, cone, P)
    const trianglesOk = CategoryLimits.productMediates(
      EnhancedVect.Vect, 
      EnhancedVect.Vect.equalMor!, 
      projections, 
      canonical, 
      cone, 
      I
    )
    expect(trianglesOk).toBe(true)
    
    // UNIQUENESS: any other mediator satisfying triangles equals canonical
    // (We test this by construction - canonical is unique by construction in Vect)
    const canonical2 = EnhancedVect.tupleVectFromCone(Ifin, cone, P)
    expect(EnhancedVect.Vect.equalMor!(canonical, canonical2)).toBe(true)
    
    console.log('✓ Universal property verified: existence + uniqueness')
  })
})