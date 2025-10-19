import { describe, test, expect } from 'vitest'
import {
  EnhancedVect,
  CategoryLimits,
  IndexedFamilies
} from '../allTS'

const emptyDiagram: CategoryLimits.Diagram<number, EnhancedVect.VectMor> = { arrows: [] }

// helper to make a random matrix of shape (rows x cols)
function randMat(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => 
    Array.from({ length: cols }, () => Math.floor(Math.random() * 3) - 1)
  )
}

describe('Universal property — Product in Vect', () => {
  test('tupleVect mediates: π_i ∘ ⟨f_i⟩ = f_i (triangles commute)', () => {
    // random small dims
    const X: EnhancedVect.VectObj = { dim: 3 }
    const V1: EnhancedVect.VectObj = { dim: 2 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const I = [0, 1] as const
    const Ifin = IndexedFamilies.finiteIndex(I as readonly number[])

    // family F : I -> Vect objects
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)
    const { product: P, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)

    // random maps f_i : X -> F(i)
    const f0: EnhancedVect.VectMor = { matrix: randMat(X.dim, V1.dim), from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: randMat(X.dim, V2.dim), from: X, to: V2 }

    const tuple = EnhancedVect.tupleVect(X, P, [f0, f1])

    // Build the cone and check triangles
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? f0 : f1),
      diagram: emptyDiagram,
    }

    const ok = CategoryLimits.productMediates(
      EnhancedVect.Vect, 
      EnhancedVect.Vect.equalMor!, 
      projections, 
      tuple, 
      cone,
      I as readonly number[]
    )
    expect(ok).toBe(true)

    // Negative sanity: perturb a single entry → at least one triangle must fail
    const badMatrix = tuple.matrix.map((row, r) => 
      row.map((x, c) => (r === 0 && c === 0 ? x + 1 : x))
    )
    const bad: EnhancedVect.VectMor = { ...tuple, matrix: badMatrix }
    const stillOk = CategoryLimits.productMediates(
      EnhancedVect.Vect, 
      EnhancedVect.Vect.equalMor!, 
      projections, 
      bad, 
      cone,
      I as readonly number[]
    )
    expect(stillOk).toBe(false)
  })
})

describe('Universal property — Coproduct in Vect', () => {
  test('[g_i] mediates: [g_i] ∘ ι_i = g_i (triangles commute)', () => {
    // random small dims
    const V1: EnhancedVect.VectObj = { dim: 2 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Y: EnhancedVect.VectObj = { dim: 3 }
    const I = [0, 1] as const
    const Ifin = IndexedFamilies.finiteIndex(I as readonly number[])

    // family F : I -> Vect objects
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)
    const { coproduct: C, injections } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)

    // random maps g_i : F(i) -> Y
    const g0: EnhancedVect.VectMor = { matrix: randMat(V1.dim, Y.dim), from: V1, to: Y }
    const g1: EnhancedVect.VectMor = { matrix: randMat(V2.dim, Y.dim), from: V2, to: Y }

    const cotuple = EnhancedVect.cotupleVect(C, [g0, g1], Y)

    // Build the cocone and check triangles
    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i: number) => (i === 0 ? g0 : g1),
      diagram: emptyDiagram,
    }

    const ok = CategoryLimits.coproductMediates(
      EnhancedVect.Vect, 
      EnhancedVect.Vect.equalMor!, 
      injections, 
      cotuple, 
      cocone,
      I as readonly number[]
    )
    expect(ok).toBe(true)

    // Negative sanity: perturb → must fail
    const badMatrix = cotuple.matrix.map((row, r) => 
      row.map((x, c) => (r === 0 && c === 0 ? x + 1 : x))
    )
    const bad: EnhancedVect.VectMor = { ...cotuple, matrix: badMatrix }
    const stillOk = CategoryLimits.coproductMediates(
      EnhancedVect.Vect, 
      EnhancedVect.Vect.equalMor!, 
      injections, 
      bad, 
      cocone,
      I as readonly number[]
    )
    expect(stillOk).toBe(false)
  })
})

describe('Universal property verification', () => {
  test('agreement under projections works', () => {
    const X: EnhancedVect.VectObj = { dim: 2 }
    const P: EnhancedVect.VectObj = { dim: 3 } // product of {dim:2} + {dim:1}
    
    const I = [0, 1]
    const Ifin = IndexedFamilies.finiteIndex(I)
    const F = (i: number) => ({ dim: i === 0 ? 2 : 1 })
    const { projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    
    // Two identical maps
    const m1: EnhancedVect.VectMor = { matrix: [[1, 0, 0], [0, 1, 0]], from: X, to: P }
    const m2: EnhancedVect.VectMor = { matrix: [[1, 0, 0], [0, 1, 0]], from: X, to: P }
    
    const agree = CategoryLimits.agreeUnderProjections(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      projections,
      m1,
      m2,
      I
    )
    expect(agree).toBe(true)
    
    // Different maps should not agree
    const m3: EnhancedVect.VectMor = { matrix: [[1, 0, 1], [0, 1, 0]], from: X, to: P }
    const disagree = CategoryLimits.agreeUnderProjections(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      projections,
      m1,
      m3,
      I
    )
    expect(disagree).toBe(false)
  })
})