import { describe, test, expect } from 'vitest'
import {
  IndexedFamilies
} from '../allTS'

describe('Right adjunction u^* ⊣ Π_u on discrete indices (enumerable)', () => {
  test('Triangle identity: ε ∘ (u^* η) = id on u^*A (elementwise)', () => {
    // Indices
    const Icar = [0, 1, 2] as const
    const Jcar = [0, 1, 2, 3] as const
    type I = (typeof Icar)[number]
    type J = (typeof Jcar)[number]
    const Ifin = { carrier: Icar as unknown as I[] }
    const Jfin = { carrier: Jcar as unknown as J[] }

    // Index map u: J -> I
    const u = (j: number): number => j % Icar.length

    // A : I -> Set (enumerable)
    const A: IndexedFamilies.EnumFamily<I, number> = (i) => ({
      enumerate: () => Array.from({ length: (i % 3) + 1 }, (_, k) => k)
    })

    // Build unit and counit
    const eta = IndexedFamilies.unitPiEnum<J, I, number>(u, Jfin)   // A(i) -> Π_{j:u(j)=i} A(i)
    const eps = IndexedFamilies.counitPiEnum<J, I, number>(u, Jfin) // (u^* Π_u A)(j) -> A(u(j))

    // Check: for every j and y ∈ A(u(j)),  ε_j( (u^*η)_j(y) ) = y
    for (const j of Jfin.carrier) {
      const i = u(j) as I
      for (const y of A(i).enumerate()) {
        const pulledUnit = eta(i)(y)   // a choice over the fiber of i
        const back = eps(j)(pulledUnit)
        expect(back).toBe(y)
      }
    }
  })

  test('Unit creates constant choices over fibers', () => {
    const Jcar = [0, 1, 2, 3]
    const u = (j: number) => j % 2 // fibers: {0,2} at i=0, {1,3} at i=1
    const Jfin = { carrier: Jcar }
    
    const eta = IndexedFamilies.unitPiEnum<number, number, string>(u, Jfin)
    
    // Test unit at i=0 with element 'hello'
    const choice0 = eta(0)('hello')
    expect(choice0).toEqual([
      [0, 'hello'],
      [2, 'hello']
    ])
    
    // Test unit at i=1 with element 'world'
    const choice1 = eta(1)('world')
    expect(choice1).toEqual([
      [1, 'world'],
      [3, 'world']
    ])
  })

  test('Counit extracts correct component from choice', () => {
    const Jcar = [0, 1, 2]
    const u = (j: number) => Math.floor(j / 2) // fibers: {0,1} at i=0, {2} at i=1
    const Jfin = { carrier: Jcar }
    
    const eps = IndexedFamilies.counitPiEnum<number, number, string>(u, Jfin)
    
    // Test extraction from choice
    const choice: ReadonlyArray<readonly [number, string]> = [
      [0, 'zero'],
      [1, 'one'], 
      [2, 'two']
    ]
    
    expect(eps(0)(choice)).toBe('zero')
    expect(eps(1)(choice)).toBe('one')
    expect(eps(2)(choice)).toBe('two')
  })

  test('Unit-counit round trip property', () => {
    const Jcar = [0, 1, 2, 3]
    const u = (j: number) => j % 2
    const Jfin = { carrier: Jcar }
    
    const eta = IndexedFamilies.unitPiEnum<number, number, number>(u, Jfin)
    const eps = IndexedFamilies.counitPiEnum<number, number, number>(u, Jfin)
    
    // For any j and element a, round trip should preserve: eps_j(eta_{u(j)}(a)) = a
    for (const j of Jcar) {
      const i = u(j)
      const testValues = [42, 17, 99]
      
      for (const a of testValues) {
        const choice = eta(i)(a)
        const recovered = eps(j)(choice)
        expect(recovered).toBe(a)
      }
    }
  })
})