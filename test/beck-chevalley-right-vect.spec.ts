import { describe, test, expect } from 'vitest'
import {
  EnhancedVect,
  CategoryLimits,
  IndexedFamilies
} from '../allTS'

// In Vect, products of a discrete family are direct sums (block products).
// Beck–Chevalley (right) becomes: for each i∈I, the two product objects over
// the corresponding K-fiber coincide up to canonical iso (here same dim & arity).

describe('Beck–Chevalley (Π / right Kan) — structural check in Vect', () => {
  test('For each i, f^*Ran_w G and Ran_u v^*G yield isomorphic product objects (dims & arity match)', () => {
    // Shapes
    const Icar = [0, 1] as const
    const Kcar = [0, 1, 2, 3] as const
    const L = [0, 1] as const

    const Ifin = { carrier: Icar as readonly number[] }
    const Kfin = { carrier: Kcar as readonly number[] }

    const f = (i: number) => L[i % L.length]!
    const w = (k: number) => L[k % L.length]!

    const { J, Jfin, u, v } = IndexedFamilies.pullbackIndices(Ifin, Kfin, f, w)

    // Family G : K -> Vect objects (dim varies with k)
    const G = (k: number): EnhancedVect.VectObj => ({ dim: (k % 3) + 1 })

    // Left side: Ran_w G is L-indexed; pull back along f by evaluation at f(i)
    const Ran_w = CategoryLimits.ranDiscretePre(
      { carrier: Array.from(L) as readonly number[] }, // Ifin over L
      Kfin, w, G, EnhancedVect.VectHasFiniteProducts
    )

    // Right side: Ran_u (v^* G) is I-indexed
    const vPull = (jk: readonly [number, number]): EnhancedVect.VectObj => G(v(jk))
    const Ran_u = CategoryLimits.ranDiscretePre(Ifin, Jfin, u, vPull, EnhancedVect.VectHasFiniteProducts)

    for (const i of Ifin.carrier) {
      const leftObj = Ran_w.at(f(i))
      const rightObj = Ran_u.at(i)
      expect(leftObj.dim).toBe(rightObj.dim)

      // Check arity / number of projections matches the size of the K-fiber at f(i)
      const Kfiber = Kcar.filter((k) => w(k) === f(i))
      expect(Ran_w.projections(f(i)).length).toBe(Kfiber.length)
      expect(Ran_u.projections(i).length).toBe(Kfiber.length)

      // Sanity: each projection codomain has correct dim (= dim G(k)) for some k in the fiber
      const leftCodims = Ran_w.projections(f(i)).map(([, m]) => EnhancedVect.Vect.cod(m).dim)
      const rightCodims = Ran_u.projections(i).map(([, m]) => EnhancedVect.Vect.cod(m).dim)
      const expected = Kfiber.map((k) => G(k).dim).sort((a,b)=>a-b)
      expect(leftCodims.slice().sort((a,b)=>a-b)).toEqual(expected)
      expect(rightCodims.slice().sort((a,b)=>a-b)).toEqual(expected)
    }
  })

  test('Beck-Chevalley structural preservation in Vect', () => {
    // Test with different pullback structure
    const Icar = [0, 1, 2]
    const Kcar = [0, 1, 2, 3, 4]
    const L = [0, 1]

    const Ifin = { carrier: Icar }
    const Kfin = { carrier: Kcar }

    const f = (i: number) => i < 2 ? 0 : 1
    const w = (k: number) => k % 2

    const { Jfin, u, v } = IndexedFamilies.pullbackIndices(Ifin, Kfin, f, w)

    // Family with varying dimensions
    const G = (k: number): EnhancedVect.VectObj => ({ dim: k + 1 })

    const Ran_w = CategoryLimits.ranDiscretePre(
      { carrier: Array.from(L) as readonly number[] },
      Kfin, w, G, EnhancedVect.VectHasFiniteProducts
    )
    const vPull = (jk: readonly [number, number]): EnhancedVect.VectObj => G(v(jk))
    const Ran_u = CategoryLimits.ranDiscretePre(Ifin, Jfin, u, vPull, EnhancedVect.VectHasFiniteProducts)

    // Verify structural equivalence
    for (const i of Ifin.carrier) {
      const leftObj = Ran_w.at(f(i))
      const rightObj = Ran_u.at(i)
      
      // Same dimension (direct sum of factors)
      expect(rightObj.dim).toBe(leftObj.dim)
      
      // Same number of projections (= K-fiber size)
      const Kfiber = Kcar.filter((k) => w(k) === f(i))
      expect(Ran_u.projections(i).length).toBe(Kfiber.length)
      expect(Ran_w.projections(f(i)).length).toBe(Kfiber.length)
      
      // Projection codomains match G(k) for k in fiber
      const expectedDims = Kfiber.map((k) => G(k).dim).sort((a,b)=>a-b)
      const rightDims = Ran_u.projections(i).map(([, m]) => EnhancedVect.Vect.cod(m).dim).sort((a,b)=>a-b)
      const leftDims = Ran_w.projections(f(i)).map(([, m]) => EnhancedVect.Vect.cod(m).dim).sort((a,b)=>a-b)
      
      expect(rightDims).toEqual(expectedDims)
      expect(leftDims).toEqual(expectedDims)
    }
  })
})