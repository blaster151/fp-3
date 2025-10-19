import { describe, test, expect } from 'vitest'
import {
  IndexedFamilies
} from '../allTS'

// For a pullback square:
//    J --v--> K
//    |        |
//    u        w
//    v        v
//    I --f--> L
// Beck–Chevalley (right):  f^* Ran_w G  ≅  Ran_u (v^* G)

describe('Beck–Chevalley (Π / right Kan) on discrete indices — count equality', () => {
  test('f^* Ran_w G and Ran_u v^* G produce equal product sizes over each fiber', () => {
    // Small fixed shapes
    const Icar = [0, 1]
    const Kcar = [0, 1, 2, 3]
    const L = [0, 1]

    const Ifin = IndexedFamilies.finiteIndex(Icar)
    const Kfin = { carrier: Kcar }

    const f = (i: number) => L[i % L.length]!
    const w = (k: number) => L[k % L.length]!

    // Pullback and projections u:J->I, v:J->K
    const { Jfin, u, v } = IndexedFamilies.pullbackIndices(Ifin, Kfin, f, w)

    // G : K -> Set (enumerable): fiber size at k is (k%3)+1
    const G: IndexedFamilies.EnumFamily<number, number> = (k) => ({ 
      enumerate: () => Array.from({ length: (k % 3) + 1 }, (_, t) => t) 
    })

    // Left: f^* Ran_w G   (evaluate Ran_w at f(i))
    const Ran_w = IndexedFamilies.ranEnum(w, Kfin, G) // L-indexed EnumFamily
    const leftCount = (i: number) => {
      const fiber = Kcar.filter((k) => w(k) === f(i))
      return fiber.reduce((acc, k) => acc * G(k).enumerate().length, 1)
    }

    // Right: Ran_u (v^* G)  (evaluate Ran_u at i)
    const vPull = (jk: readonly [number, number]) => G(v(jk))
    const Ran_u = IndexedFamilies.ranEnum(u, Jfin, vPull) // I-indexed EnumFamily over choices on u-fibers
    const rightCount = (i: number) => Ran_u(i).enumerate().length

    for (const i of Ifin.carrier) {
      expect(rightCount(i)).toBe(leftCount(i))
    }
  })

  test('Beck-Chevalley preserves fiber structure', () => {
    // Test with different fiber structures
    const Icar = [0, 1, 2]
    const Kcar = [0, 1, 2, 3, 4]
    const L = [0, 1]

    const Ifin = IndexedFamilies.finiteIndex(Icar)
    const Kfin = { carrier: Kcar }

    // More complex maps
    const f = (i: number) => i < 2 ? 0 : 1
    const w = (k: number) => k % 2

    const { Jfin, u, v } = IndexedFamilies.pullbackIndices(Ifin, Kfin, f, w)

    // Family with varying sizes
    const G: IndexedFamilies.EnumFamily<number, string> = (k) => ({
      enumerate: () => Array.from({ length: k + 1 }, (_, i) => String.fromCharCode(65 + i))
    })

    const Ran_w = IndexedFamilies.ranEnum(w, Kfin, G)
    const vPull = (jk: readonly [number, number]) => G(v(jk))
    const Ran_u = IndexedFamilies.ranEnum(u, Jfin, vPull)

    // Check that pullback preserves the relationship
    for (const i of Ifin.carrier) {
      const leftSize = Ran_w(f(i)).enumerate().length
      const rightSize = Ran_u(i).enumerate().length
      expect(rightSize).toBe(leftSize)
      
      // Additional check: both should be products over the same K-fiber
      const expectedFiber = Kcar.filter((k) => w(k) === f(i))
      const expectedSize = expectedFiber.reduce((acc, k) => acc * G(k).enumerate().length, 1)
      expect(leftSize).toBe(expectedSize)
      expect(rightSize).toBe(expectedSize)
    }
  })
})