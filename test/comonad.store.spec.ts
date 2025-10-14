import { describe, it, expect } from 'vitest'
import {
  StoreEndo, StoreComonad, storeFromArray, seek, collectStore, movingAvg3,
} from '../allTS'
import type { Store } from '../allTS'

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const requireValue = <T>(values: readonly T[], index: number): T => {
  const value = values[index]
  if (value === undefined) {
    throw new Error(`Expected value at index ${index}`)
  }
  return value
}

describe('Store<S,_> comonad laws', () => {
  const W = StoreComonad<number>()
  const F = StoreEndo<number>()

  it('right counit: extract ∘ duplicate = id', () => {
    const xs = [10, 20, 30]
    const w = storeFromArray(xs, 1)
    const lhs = W.extract(W.duplicate(w))
    const rhs = w
    expect(eq(lhs, rhs)).toBe(true)
  })

  const sampleStores: ReadonlyArray<{ xs: ReadonlyArray<number>; start: number }> = [
    { xs: [1], start: 0 },
    { xs: [2, 4, 6, 8], start: 0 },
    { xs: [5, 10, 15, 20, 25], start: 2 },
    { xs: [3, -1, 7, 9, -5, 12], start: -3 },
    { xs: [0, 1, 0, 1, 0, 1], start: 10 },
  ]

  it('left counit: map(extract) ∘ duplicate = id', () => {
    for (const { xs, start } of sampleStores) {
      const w = storeFromArray(xs, start)
      const lhs = F.map(W.extract)(W.duplicate(w))
      expect(eq(lhs, w)).toBe(true)
    }
  })

  it('coassociativity: duplicate ∘ duplicate = map(duplicate) ∘ duplicate', () => {
    for (const { xs, start } of sampleStores) {
      const w = storeFromArray(xs, start)
      const lhs = W.duplicate(W.duplicate(w))
      const rhs = F.map(W.duplicate)(W.duplicate(w))
      expect(eq(lhs, rhs)).toBe(true)
    }
  })

  it('extend laws: extend(extract) = id', () => {
    for (const { xs, start } of sampleStores) {
      const w = storeFromArray(xs, start)
      const lhs = W.extend(W.extract)(w)
      expect(eq(lhs, w)).toBe(true)
    }
  })

  it('extend laws: extract ∘ extend(f) = f', () => {
    const f = (ctx: Store<number, number>) => ctx.peek(ctx.pos) * 2
    for (const { xs, start } of sampleStores) {
      const w = storeFromArray(xs, start)
      const lhs = W.extract(W.extend(f)(w))
      const rhs = f(w)
      expect(lhs).toBe(rhs)
    }
  })
})

describe('Store – Co-Kleisli moving average', () => {
  const W = StoreComonad<number>()
  const F = StoreEndo<number>()

  // 3-point average centered at current index (clamped)
  const avg3 = (ctx: Store<number, number>) => {
    const i = ctx.pos
    return (ctx.peek(i - 1) + ctx.peek(i) + ctx.peek(i + 1)) / 3
  }

  it('extend(avg3) produces a smoothed store', () => {
    const xs = [1, 2, 100, 2, 1]
    const w0 = storeFromArray(xs, 0)
    const ws = W.extend(avg3)(w0)
    const out = collectStore<number>(xs.length)(ws)
    // Just check shape + a couple of key points
    expect(out.length).toBe(xs.length)
    const first = requireValue(out, 0)
    const third = requireValue(out, 2)
    expect(Math.round(first*100)/100).toBe(Math.round((1+1+2)/3*100)/100)  // ≈ 1.33…
    expect(Math.round(third*100)/100).toBe(Math.round((2+100+2)/3*100)/100) // ≈ 34.67…
  })

  it('movingAvg3 helper function works correctly', () => {
    const signal = [1, 2, 100, 2, 1] as const
    const w0 = storeFromArray(signal, 0)
    const wSmoothed = movingAvg3(w0)
    const out = collectStore<number>(signal.length)(wSmoothed)
    
    expect(out.length).toBe(signal.length)
    
    // Test specific expected values
    const expected = [
      (1+1+2)/3,     // [0]: clamp(-1,0,1) = (1,1,2)
      (1+2+100)/3,   // [1]: (0,1,2) = (1,2,100)
      (2+100+2)/3,   // [2]: (1,2,3) = (2,100,2)
      (100+2+1)/3,   // [3]: (2,3,4) = (100,2,1)
      (2+1+1)/3      // [4]: (3,4,5) = (2,1,1) - clamp(5) = 4
    ]

    for (let i = 0; i < expected.length; i++) {
      const value = requireValue(out, i)
      const expectedValue = requireValue(expected, i)
      expect(Math.abs(value - expectedValue)).toBeLessThan(0.001)
    }
  })

  it('seek changes focus but preserves peek', () => {
    const xs = [10, 20, 30]
    const w = storeFromArray(xs, 0)
    expect(W.extract(seek(2)(w))).toBe(30)
    expect(W.extract(seek(1)(w))).toBe(20)
    expect(W.extract(seek(0)(w))).toBe(10)
  })

  it('collectStore captures the entire store as array', () => {
    const xs = [5, 15, 25, 35]
    const w = storeFromArray(xs, 1) // start at index 1
    const collected = collectStore<number>(xs.length)(w)
    expect(collected).toEqual(xs)
  })

  it('Store functor law: map(id) = id', () => {
    const xs = [1, 2, 3]
    const w = storeFromArray(xs, 1)
    const id = <A>(a: A) => a
    const lhs = F.map(id)(w)
    expect(eq(lhs, w)).toBe(true)
  })

  it('Store functor law: map(f ∘ g) = map(f) ∘ map(g)', () => {
    const xs = [1, 2, 3]
    const w = storeFromArray(xs, 1)
    const f = (n: number) => n + 1
    const g = (n: number) => n * 2
    const composed = (n: number) => f(g(n))
    
    const lhs = F.map(composed)(w)
    const rhs = F.map(f)(F.map(g)(w))
    expect(eq(lhs, rhs)).toBe(true)
  })

  it('practical example: edge detection via extend', () => {
    const signal = [1, 1, 5, 5, 1, 1]
    const w = storeFromArray(signal, 0)
    
    // Edge detection: high gradient when neighbors differ significantly
    const edgeDetect = (ctx: Store<number, number>) => {
      const i = ctx.pos
      const left = ctx.peek(i - 1)
      const right = ctx.peek(i + 1)
      return Math.abs(right - left)
    }
    
    const edges = W.extend(edgeDetect)(w)
    const edgeValues = collectStore<number>(signal.length)(edges)
    
    // Edge detection working correctly!
    
    // Should detect edges at positions where values change dramatically
    // Signal: [1, 1, 5, 5, 1, 1]
    // At i=0: left=1(clamped), right=1 -> |1-1| = 0
    // At i=1: left=1, right=5 -> |5-1| = 4  
    // At i=2: left=1, right=5 -> |5-1| = 4
    // At i=3: left=5, right=1 -> |1-5| = 4
    // At i=4: left=5, right=1 -> |1-5| = 4
    // At i=5: left=1, right=1(clamped) -> |1-1| = 0
    expect(requireValue(edgeValues, 0)).toBe(0)   // |1-1| = 0
    expect(requireValue(edgeValues, 1)).toBe(4)   // |5-1| = 4 (edge!)
    expect(requireValue(edgeValues, 2)).toBe(4)   // |5-1| = 4 (edge!)
    expect(requireValue(edgeValues, 3)).toBe(4)   // |1-5| = 4 (edge!)
    expect(requireValue(edgeValues, 4)).toBe(4)   // |1-5| = 4 (edge!)
    expect(requireValue(edgeValues, 5)).toBe(0)   // |1-1| = 0
  })
})
