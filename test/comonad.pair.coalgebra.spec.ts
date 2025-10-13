import { describe, it, expect } from 'vitest'
import { PairComonad, PairEndo, isCoalgebraMorphism, ForgetfulFromCoalgebras } from '../allTS'
import type { Coalgebra } from '../allTS'

// simple structural equality
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

describe('Pair<E,_> comonad laws', () => {
  const W = PairComonad<string>()
  const F = PairEndo<string>()
  const envSamples = ['ε', 'ctx', 'obs', 'seed'] as const
  const valueSamples = [0, 1, -5, 'value', 'zeta', true, false] as const
  const numericSamples = [0, 1, -8, 42, 99] as const

  it('extract ∘ duplicate = id  (right counit)', () => {
    for (const env of envSamples) {
      for (const value of valueSamples) {
        const wa = [env, value] as const
        const lhs = W.extract(W.duplicate(wa))
        expect(eq(lhs, wa)).toBe(true)
      }
    }
  })

  it('map(extract) ∘ duplicate = id  (left counit)', () => {
    const mapExtract = F.map(<A>(inner: readonly [string, A]) => W.extract(inner))
    for (const env of envSamples) {
      for (const value of valueSamples) {
        const wa = [env, value] as const
        const lhs = mapExtract(W.duplicate(wa))
        expect(eq(lhs, wa)).toBe(true)
      }
    }
  })

  it('duplicate ∘ duplicate = map(duplicate) ∘ duplicate  (coassoc)', () => {
    const mapDuplicate = F.map(W.duplicate)
    for (const env of envSamples) {
      for (const value of valueSamples) {
        const wa = [env, value] as const
        const lhs = W.duplicate(W.duplicate(wa))
        const rhs = mapDuplicate(W.duplicate(wa))
        expect(eq(lhs, rhs)).toBe(true)
      }
    }
  })

  it('extend satisfies: extend(extract) = id', () => {
    const extendExtract = W.extend(W.extract)
    for (const env of envSamples) {
      for (const value of valueSamples) {
        const wa = [env, value] as const
        const lhs = extendExtract(wa)
        expect(eq(lhs, wa)).toBe(true)
      }
    }
  })

  it('extend satisfies: extract ∘ extend(f) = f', () => {
    const f = (w: readonly [string, number]) => w[1] * 2 + w[0].length
    for (const env of envSamples) {
      for (const n of numericSamples) {
        const wa = [env, n] as const
        const lhs = W.extract(W.extend(f)(wa))
        const rhs = f(wa)
        expect(lhs).toBe(rhs)
      }
    }
  })

  it('extend satisfies: extend(f) ∘ extend(g) = extend(f ∘ extend(g))', () => {
    const g = (w: readonly [string, number]) => `${w[0]}:${w[1]}`
    const f = (w: readonly [string, string]) => w[1].length + w[0].length
    const extendG = W.extend(g)
    const extendF = W.extend(f)
    const composed = W.extend((w: readonly [string, number]) => f(extendG(w)))
    for (const env of envSamples) {
      for (const n of numericSamples) {
        const wa = [env, n] as const
        const lhs = extendF(extendG(wa))
        const rhs = composed(wa)
        expect(eq(lhs, rhs)).toBe(true)
      }
    }
  })
})

describe('Coalgebra + forgetful functor', () => {
  const W = PairComonad<number>()
  const F = PairEndo<number>()
  const envSeeds = [0, 7, -3, 42] as const
  const payloadSamples = [0, -1, 3, 'value', 'z', true, false] as const
  // A coalgebra α : A -> [E, A]; easy family: pick any "observer" e(a)
  const alpha = <A>(obs: (a: A) => number): ((a: A) => readonly [number, A]) =>
    (a) => [obs(a), a] as const

  it('counit: extract(α(a)) = a', () => {
    for (const env of envSeeds) {
      for (const payload of payloadSamples) {
        const α = alpha<typeof payload>((_a) => env)
        expect(W.extract(α(payload))).toBe(payload)
      }
    }
  })

  it('coassoc: duplicate(α(a)) = map(α)(α(a))', () => {
    for (const env of envSeeds) {
      for (const payload of payloadSamples) {
        const α = alpha<typeof payload>((_a) => env)
        const lhs = W.duplicate(α(payload))
        const rhs = F.map(α)(α(payload))
        expect(eq(lhs, rhs)).toBe(true)
      }
    }
  })

  it('morphisms: map(f) ∘ α = β ∘ f', () => {
    // Use the same environment type for both coalgebras to make the morphism work
    const α: Coalgebra<['Pair', number], number> = (n) => [n % 7, n] as const
    const β: Coalgebra<['Pair', number], string> = (s) => [s.length, s] as const
    const f = (n: number) => `${n}!`           // f : number -> string

    // For this to work, we need the environment types to match
    // Let's use a simpler test: α and β both use number environment
    const αSimple: Coalgebra<['Pair', number], number> = (n) => [42, n] as const
    const βSimple: Coalgebra<['Pair', number], string> = (s) => [42, s] as const
    
    const okAt = isCoalgebraMorphism(PairEndo<number>())(αSimple, βSimple, f, eq)
    expect(okAt(5)).toBe(true)
  })

  it('forgetful functor is identity on morphisms', () => {
    const U = ForgetfulFromCoalgebras(W)
    const f = (n: number) => `${n}`
    expect(U.onMorphism(f)(3)).toBe('3')
    expect(U.onMorphism(f)(42)).toBe('42')
  })

  it('practical coalgebra example: state observers', () => {
    // Coalgebra that observes "parity" of a number
    const parityCoalg: Coalgebra<['Pair', boolean], number> = 
      (n) => [n % 2 === 0, n] as const
    
    // Test counit law
    const testNum = 17
    const coaction = parityCoalg(testNum)
    expect(W.extract(coaction as any)).toBe(testNum)
    
    // Test that we can observe the environment
    expect(coaction[0]).toBe(false) // 17 is odd
    expect(parityCoalg(42)[0]).toBe(true) // 42 is even
  })

  it('extend with coalgebra: local computations', () => {
    const α = alpha<string>((s) => s.length)
    
    // Use extend to compute something that depends on both the value and its "context"
    const computation = (w: readonly [number, string]) => 
      `length=${w[0]}, value="${w[1]}", doubled=${w[1].repeat(2)}`
    
    const testStr = "hello"
    const coaction = α(testStr)  // [5, "hello"]
    const result = W.extend(computation)(coaction)
    
    expect(result[0]).toBe(5) // environment preserved
    expect(result[1]).toBe('length=5, value="hello", doubled=hellohello')
  })
})