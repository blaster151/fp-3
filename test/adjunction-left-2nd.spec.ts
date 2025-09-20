import { describe, test, expect } from 'vitest'
import {
  IndexedFamilies
} from '../allTS'

describe('Left adjunction (Σ): second triangle  ε ∘ (Σ_u η) = id on Σ_u A', () => {
  test('elementwise identity per fiber', () => {
    const Icar = [0, 1] as const
    const Jcar = [0, 1, 2, 3] as const
    type I = (typeof Icar)[number]
    type J = (typeof Jcar)[number]
    const Jfin = { carrier: Jcar as unknown as J[] }
    const u = (j: number) => Icar[j % Icar.length]!

    const sigEta = IndexedFamilies.sigmaOfUnitEnum<J, I, number>(u, Jfin)   // (Σ_u η)_i
    const eps = IndexedFamilies.counitSigmaEnum<J, I, number>(u, Jfin)      // ε_i

    for (const i of Icar as unknown as I[]) {
      // Build some elements of Σ_u A at index i (pairs (j, a) with u(j)=i)
      const fiber = (Jfin.carrier as J[]).filter((j) => u(j) === i)
      const elems: Array<{ j: J; x: number }> =
        fiber.map((j) => ({ j, x: 10 * (j as number) + (i as number) }))

      for (const e of elems) {
        const afterSigmaEta = sigEta(i)(e) // (j, (j, a))
        const back = eps(i)(afterSigmaEta) // (j, a)
        expect(back.j).toBe(e.j)
        expect(back.x).toBe(e.x)
      }
    }
  })

  test('Σ-side unit creates tagged pairs correctly', () => {
    const Jcar = [0, 1, 2]
    const u = (j: number) => Math.floor(j / 2) // fibers: {0,1} at i=0, {2} at i=1
    const Jfin = { carrier: Jcar }
    
    const eta = IndexedFamilies.unitSigmaEnum<number, number, string>(u, Jfin)
    
    // Test unit at different j values
    const result0 = eta(0)('hello')
    expect(result0).toEqual({ j: 0, x: 'hello' })
    
    const result1 = eta(1)('world')
    expect(result1).toEqual({ j: 1, x: 'world' })
  })

  test('Σ-side counit extracts values correctly', () => {
    const Jcar = [0, 1, 2]
    const u = (j: number) => j % 2
    const Jfin = { carrier: Jcar }
    
    const eps = IndexedFamilies.counitSigmaEnum<number, number, string>(u, Jfin)
    
    // Test counit extraction
    const pair = { j: 1, x: 'extracted' }
    const result = eps(1)(pair) // i doesn't matter for counit - just extracts x
    expect(result).toBe('extracted')
  })

  test('Σ-side second triangle round-trip', () => {
    const Jcar = [0, 1, 2, 3]
    const u = (j: number) => j % 2
    const Jfin = { carrier: Jcar }
    
    const sigEta = IndexedFamilies.sigmaOfUnitEnum<number, number, number>(u, Jfin)
    const eps = IndexedFamilies.counitSigmaEnum<number, number, number>(u, Jfin)
    
    // Test round-trip for various elements
    const testElements = [
      { j: 0, x: 42 },
      { j: 1, x: 17 },
      { j: 2, x: 99 },
      { j: 3, x: 123 }
    ]
    
    for (const elem of testElements) {
      const i = u(elem.j)
      const afterSigEta = sigEta(i)(elem)
      const recovered = eps(i)(afterSigEta)
      
      expect(recovered.j).toBe(elem.j)
      expect(recovered.x).toBe(elem.x)
    }
  })
})