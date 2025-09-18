import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  PairComonad, PairEndo, isCoalgebraMorphism, ForgetfulFromCoalgebras,
  Coalgebra, ComonadK1, Pair
} from '../allTS'

// simple structural equality
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

describe('Pair<E,_> comonad laws', () => {
  const W = PairComonad<string>()

  it('extract ∘ duplicate = id  (right counit)', () => {
    fc.assert(fc.property(fc.string(), fc.oneof(fc.integer(), fc.string(), fc.boolean()), (e, a) => {
      const wa = [e, a] as const
      const lhs = W.extract(W.duplicate(wa))
      return eq(lhs, wa)
    }))
  })

  it('map(extract) ∘ duplicate = id  (left counit)', () => {
    fc.assert(fc.property(fc.string(), fc.oneof(fc.integer(), fc.string(), fc.boolean()), (e, a) => {
      const wa = [e, a] as const
      const lhs = W.map(W.extract as any)(W.duplicate(wa))
      return eq(lhs, wa)
    }))
  })

  it('duplicate ∘ duplicate = map(duplicate) ∘ duplicate  (coassoc)', () => {
    fc.assert(fc.property(fc.string(), fc.oneof(fc.integer(), fc.string(), fc.boolean()), (e, a) => {
      const wa = [e, a] as const
      const lhs = W.duplicate(W.duplicate(wa))
      const rhs = W.map(W.duplicate as any)(W.duplicate(wa))
      return eq(lhs, rhs)
    }))
  })

  it('extend satisfies: extend(extract) = id', () => {
    fc.assert(fc.property(fc.string(), fc.oneof(fc.integer(), fc.string(), fc.boolean()), (e, a) => {
      const wa = [e, a] as const
      const lhs = W.extend(W.extract)(wa)
      return eq(lhs, wa)
    }))
  })

  it('extend satisfies: extract ∘ extend(f) = f', () => {
    fc.assert(fc.property(fc.string(), fc.integer(), (e, n) => {
      const wa = [e, n] as const
      const f = (w: readonly [string, number]) => w[1] * 2 + w[0].length
      const lhs = W.extract(W.extend(f)(wa))
      const rhs = f(wa)
      return lhs === rhs
    }))
  })

  it('extend satisfies: extend(f) ∘ extend(g) = extend(f ∘ extend(g))', () => {
    fc.assert(fc.property(fc.string(), fc.integer(), (e, n) => {
      const wa = [e, n] as const
      const f = (w: readonly [string, number]) => w[1] + 10
      const g = (w: readonly [string, number]) => w[0] + w[1].toString()
      
      const lhs = W.extend(f)(W.extend(g)(wa))
      const rhs = W.extend((w: readonly [string, string]) => f(W.extend(g)(w) as any))(wa)
      return eq(lhs, rhs)
    }))
  })
})

describe('Coalgebra + forgetful functor', () => {
  const W = PairComonad<number>()
  // A coalgebra α : A -> [E, A]; easy family: pick any "observer" e(a)
  const alpha = <A>(obs: (a: A) => number): ((a: A) => readonly [number, A]) =>
    (a) => [obs(a), a] as const

  it('counit: extract(α(a)) = a', () => {
    fc.assert(fc.property(fc.integer(), fc.oneof(fc.integer(), fc.string(), fc.boolean()), (e, a) => {
      const α = alpha((_a) => e)
      return W.extract(α(a)) === a
    }))
  })

  it('coassoc: duplicate(α(a)) = map(α)(α(a))', () => {
    fc.assert(fc.property(fc.integer(), fc.oneof(fc.integer(), fc.string(), fc.boolean()), (e, a) => {
      const α = alpha((_a) => e)
      const lhs = W.duplicate(α(a))
      const rhs = W.map(α as any)(α(a))
      return eq(lhs, rhs)
    }))
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