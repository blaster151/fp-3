import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { PairComonad, CoKleisliK1 } from '../allTS'

const W = PairComonad<number>()
const C = CoKleisliK1(W)

describe('Co-Kleisli(Pair) laws', () => {
  // helpers: co-Kleisli arrows
  const f = (wa: readonly [number, number]) => wa[1] + 1
  const g = (wb: readonly [number, number]) => wb[1] * 2
  const h = (wc: readonly [number, number]) => wc[1] - 3

  it('left identity: id ∘ f = f', () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), (e, a) => {
      const wa = [e, a] as const
      const left  = C.compose<number, number, number>(C.id<number>(), f)(wa)
      const right = f(wa)
      return left === right
    }))
  })

  it('right identity: f ∘ id = f', () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), (e, a) => {
      const wa = [e, a] as const
      const left  = C.compose<number, number, number>(f, C.id<number>())(wa)
      const right = f(wa)
      return left === right
    }))
  })

  it('associativity: h ∘ (g ∘ f) = (h ∘ g) ∘ f', () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), (e, a) => {
      const wa = [e, a] as const
      const left  = C.compose(h, C.compose(g, f))(wa)
      const right = C.compose(C.compose(h, g), f)(wa)
      return left === right
    }))
  })

  it('arr preserves composition: arr(g ∘ f) = arr(g) ∘ arr(f)', () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), (e, a) => {
      const wa = [e, a] as const
      const plainF = (x: number) => x + 10
      const plainG = (x: number) => x * 3
      const composed = (x: number) => plainG(plainF(x))
      
      const left  = C.arr(composed)(wa)
      const right = C.compose(C.arr(plainG), C.arr(plainF))(wa)
      return left === right
    }))
  })

  it('arr is a functor: arr(id) = id', () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), (e, a) => {
      const wa = [e, a] as const
      const id = <A>(x: A) => x
      const left  = C.arr(id)(wa)
      const right = C.id<number>()(wa)
      return left === right
    }))
  })

  it('practical example: chained computations', () => {
    // Build a pipeline: extract value, add context info, format
    const addContext = (wa: readonly [number, number]) => 
      `env=${wa[0]}, val=${wa[1]}`
    
    const addExclamation = (wb: readonly [number, string]) => 
      `${wb[1]}!`
    
    const pipeline = C.compose(addExclamation, addContext)
    const result = pipeline([42, 100] as const)
    
    expect(result).toBe('env=42, val=100!')
  })

  it('extend relationship: practical Co-Kleisli composition', () => {
    // Simpler test: verify that Co-Kleisli composition works as expected
    const wa = [10, 5] as const
    const f = (wx: readonly [number, number]) => wx[1] + 1  // 5 + 1 = 6
    const g = (wy: readonly [number, number]) => wy[1] * 2  // 6 * 2 = 12
    
    const composed = C.compose(g, f)
    const result = composed(wa)
    
    // f extends wa to [10, 6], then g extracts and computes 6 * 2 = 12
    expect(result).toBe(12)
  })
})