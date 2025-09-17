/**
 * LAW: Stream/Iteration laws
 * 
 * Mathematical forms:
 * - Fusion: denote(Seq(Arr f, Proc σ)) == denote(fuse(σ,f))
 * - Parallel: denote(Par(σ, τ)) == denote(σ) × denote(τ)
 * - Exchange: denote(Seq(σ, Arr g)) == denote(fuse(σ,g))
 * - RightTightening: Loop(σ) >>> Arr g == Loop(σ >>> Arr(g × id))
 * - Merge/Independence: If σ and τ are independent, then merge(σ, τ) == σ × τ
 * 
 * These laws ensure that stream processing optimizations are correct.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  StreamArrow, StreamFusion, isIndependent, 
  Stream, StreamProc 
} from '../../allTS'
import { commonGenerators, commonEquality } from './law-helpers'

describe("LAW: Stream/Iteration laws", () => {
  // Common generators
  const genInt = commonGenerators.integer
  const genString = commonGenerators.string
  const genFn = () => commonGenerators.fn(genInt)
  const genStream = () => commonGenerators.array(genInt)
  const genStreamProc = () => fc.func(fc.constant(commonGenerators.array(genInt)))

  // Stream equality
  const eqStream = (a: Stream<any>, b: Stream<any>) => {
    if (a.length !== b.length) return false
    return a.every((x, i) => x === b[i])
  }

  // Stream processor equality (test with a few random streams)
  const eqStreamProc = (f: StreamProc<any, any>, g: StreamProc<any, any>) => {
    for (let i = 0; i < 5; i++) {
      const stream = Array.from({ length: Math.floor(Math.random() * 5) }, () => Math.floor(Math.random() * 100))
      if (!eqStream(f(stream), g(stream))) return false
    }
    return true
  }

  describe("Stream Fusion laws", () => {
    it("Fusion: denote(Seq(Arr f, Proc σ)) == denote(fuse(σ,f))", () => {
      fc.assert(
        fc.property(genFn(), genStreamProc(), genStream(), (f, sigma, stream) => {
          const left = StreamArrow.then(sigma)(StreamArrow.arr(f))(stream)
          const right = StreamFusion.fusePureInto(sigma, f)(stream)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })

    it("Exchange: denote(Seq(σ, Arr g)) == denote(fuse(σ,g))", () => {
      fc.assert(
        fc.property(genStreamProc(), genFn(), genStream(), (sigma, g, stream) => {
          const left = StreamArrow.then(StreamArrow.arr(g))(sigma)(stream)
          const right = StreamFusion.fusePureOut(sigma, g)(stream)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })
  })

  describe("Stream Parallel laws", () => {
    it("Parallel: denote(Par(σ, τ)) == denote(σ) × denote(τ)", () => {
      fc.assert(
        fc.property(genStreamProc(), genStreamProc(), genStream(), (sigma, tau, stream) => {
          const left = StreamArrow.split(sigma, tau)(stream.map(x => [x, x] as const))
          const right = stream.map(x => [sigma([x])[0]!, tau([x])[0]!] as const)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })
  })

  describe("Stream RightTightening laws", () => {
    it("RightTightening: Loop(σ) >>> Arr g == Loop(σ >>> Arr(g × id))", () => {
      fc.assert(
        fc.property(genStreamProc(), genFn(), genStream(), (sigma, g, stream) => {
          // Create a loop processor that takes [A, C] and returns [B, C]
          const loopProc: StreamProc<readonly [number, number], readonly [number, number]> = 
            (stream: Stream<readonly [number, number]>) => 
              stream.map(([a, c]) => [sigma([a])[0]!, c] as const)
          
          const left = StreamArrow.then(StreamArrow.arr(g))(StreamArrow.loop(loopProc))(stream)
          const right = StreamArrow.loop(
            StreamArrow.then(StreamArrow.arr(([b, c]: readonly [number, number]) => [g(b), c] as const))(loopProc)
          )(stream)
          
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })
  })

  describe("Stream Merge/Independence laws", () => {
    it("Merge/Independence: If σ and τ are independent, then merge(σ, τ) == σ × τ", () => {
      fc.assert(
        fc.property(genStreamProc(), genStreamProc(), genStream(), (sigma, tau, stream) => {
          // Check independence
          if (!isIndependent(sigma, tau)) {
            return true // Skip if not independent
          }
          
          // Simple merge: run both processors and combine results
          const merge = (stream: Stream<number>) => {
            const resultS = sigma(stream)
            const resultT = tau(stream)
            return resultS.map((s, i) => [s, resultT[i] ?? 0] as const)
          }
          
          const left = merge(stream)
          const right = stream.map(x => [sigma([x])[0]!, tau([x])[0]!] as const)
          
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })
  })

  describe("Stream Arrow laws", () => {
    it("Stream Arrow Category: associativity", () => {
      fc.assert(
        fc.property(genStreamProc(), genStreamProc(), genStreamProc(), genStream(), (f, g, h, stream) => {
          const left = StreamArrow.then(h)(StreamArrow.then(g)(f))(stream)
          const right = StreamArrow.then(StreamArrow.then(h)(g))(f)(stream)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })

    it("Stream Arrow Category: identity", () => {
      fc.assert(
        fc.property(genStreamProc(), genStream(), (f, stream) => {
          const left = StreamArrow.then(f)(StreamArrow.arr(x => x))(stream)
          const right = StreamArrow.then(StreamArrow.arr(x => x))(f)(stream)
          return eqStream(left, right) && eqStream(left, f(stream))
        }),
        { numRuns: 200 }
      )
    })

    it("Stream Arrow Functoriality: arr(g∘f) == arr f >>> arr g", () => {
      fc.assert(
        fc.property(genFn(), genFn(), genStream(), (f, g, stream) => {
          const left = StreamArrow.arr((x: number) => g(f(x)))(stream)
          const right = StreamArrow.then(StreamArrow.arr(g))(StreamArrow.arr(f))(stream)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })
  })

  describe("Stream ArrowChoice laws", () => {
    it("Left functoriality: left(arr f) == arr(left f)", () => {
      fc.assert(
        fc.property(genFn(), genStream(), (f, stream) => {
          const eitherStream = stream.map(x => ({ _tag: 'Left' as const, value: x }))
          const left = StreamArrow.left(StreamArrow.arr(f))(eitherStream)
          const right = StreamArrow.arr((e: { _tag: 'Left'; value: number }) => 
            e._tag === 'Left' ? { _tag: 'Left' as const, value: f(e.value) } : e
          )(eitherStream)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })

    it("Left composition: left(f >>> g) == left f >>> left g", () => {
      fc.assert(
        fc.property(genStreamProc(), genStreamProc(), genStream(), (f, g, stream) => {
          const eitherStream = stream.map(x => ({ _tag: 'Left' as const, value: x }))
          const left = StreamArrow.left(StreamArrow.then(g)(f))(eitherStream)
          const right = StreamArrow.then(StreamArrow.left(g))(StreamArrow.left(f))(eitherStream)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })
  })

  describe("Stream ArrowPlus laws", () => {
    it("Left identity: zero <+> p = p", () => {
      fc.assert(
        fc.property(genStreamProc(), genStream(), (p, stream) => {
          const left = StreamArrow.alt(StreamArrow.zero(), p)(stream)
          const right = p(stream)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })

    it("Right identity: p <+> zero = p", () => {
      fc.assert(
        fc.property(genStreamProc(), genStream(), (p, stream) => {
          const left = StreamArrow.alt(p, StreamArrow.zero())(stream)
          const right = p(stream)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })

    it("Associativity: (p <+> q) <+> r = p <+> (q <+> r)", () => {
      fc.assert(
        fc.property(genStreamProc(), genStreamProc(), genStreamProc(), genStream(), (p, q, r, stream) => {
          const left = StreamArrow.alt(r)(StreamArrow.alt(q)(p))(stream)
          const right = StreamArrow.alt(StreamArrow.alt(r)(q))(p)(stream)
          return eqStream(left, right)
        }),
        { numRuns: 200 }
      )
    })
  })
})
