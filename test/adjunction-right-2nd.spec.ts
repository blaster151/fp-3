import { describe, test, expect } from 'vitest'
import {
  IndexedFamilies
} from '../allTS'

describe('Right adjunction (Π): second triangle  (Π_u ε) ∘ η_{Π_u B} = id', () => {
  test('elementwise identity on (Π_u B)(i) choices', () => {
    // index sets
    const Icar = [0, 1] as const
    const Jcar = [0, 1, 2, 3] as const
    type I = (typeof Icar)[number]
    type J = (typeof Jcar)[number]
    const Jfin = { carrier: Jcar as unknown as J[] }

    // index map u : J -> I
    const u = (j: number) => Icar[j % Icar.length]!

    // builders
    const eta = IndexedFamilies.etaForPiEnum<J, I, number>(u, Jfin)
    const Pieps = IndexedFamilies.PiOfEpsEnum<J, I, number>(u, Jfin)

    // test each i with a concrete choice over its fiber
    for (const i of Icar as unknown as I[]) {
      const fiber = Jcar.filter((j) => u(j) === i) as unknown as J[]
      // build a simple choice: value = 10*j + i
      const choice = fiber.map((j) => [j, 10 * (j as number) + (i as number)] as const)

      const result = Pieps(i)(eta(i)(choice))
      // same length, same (j, value) pairs and order
      expect(result.length).toBe(choice.length)
      for (let k = 0; k < choice.length; k++) {
        expect(result[k]![0]).toBe(choice[k]![0])
        expect(result[k]![1]).toBe(choice[k]![1])
      }
    }
  })

  test('second triangle preserves choice structure', () => {
    const Jcar = [0, 1, 2, 3]
    const u = (j: number) => j % 2 // fibers: {0,2} at i=0, {1,3} at i=1
    const Jfin = { carrier: Jcar }
    
    const eta = IndexedFamilies.etaForPiEnum<number, number, string>(u, Jfin)
    const Pieps = IndexedFamilies.PiOfEpsEnum<number, number, string>(u, Jfin)
    
    // Test with fiber 0: {0,2}
    const choice0: ReadonlyArray<readonly [number, string]> = [
      [0, 'zero'],
      [2, 'two']
    ]
    
    const etaResult = eta(0)(choice0)
    expect(etaResult).toEqual([
      [0, choice0],
      [2, choice0]
    ])
    
    const backToChoice = Pieps(0)(etaResult)
    expect(backToChoice).toEqual(choice0)
  })

  test('works with empty fibers', () => {
    const Jcar = [0, 1]
    const u = (j: number) => j + 2 // maps to {2,3}, so fiber for i=0,1 is empty
    const Jfin = { carrier: Jcar }
    
    const eta = IndexedFamilies.etaForPiEnum<number, number, string>(u, Jfin)
    const Pieps = IndexedFamilies.PiOfEpsEnum<number, number, string>(u, Jfin)
    
    // Empty choice for empty fiber
    const emptyChoice: ReadonlyArray<readonly [number, string]> = []
    
    const etaResult = eta(0)(emptyChoice)
    expect(etaResult).toEqual([]) // empty fiber → empty result
    
    const backToChoice = Pieps(0)(etaResult)
    expect(backToChoice).toEqual(emptyChoice)
  })
})