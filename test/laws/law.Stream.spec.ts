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
import { StreamArrow, StreamFusion } from '../../allTS'
import type { Stream, StreamProc } from '../../allTS'

type NumberStream = Stream<number>
type NumberProc = StreamProc<number, number>
type NumberPair = readonly [number, number]
type NumberEither = { _tag: 'Left'; value: number } | { _tag: 'Right'; value: number }

const sampleStreams: readonly NumberStream[] = [
  [],
  [1],
  [1, 2],
  [3, -1, 4]
]

const sampleFunctions: readonly ((value: number) => number)[] = [
  (value) => value + 1,
  (value) => value * 2,
  (value) => -value
]

const sampleProcessors: ReadonlyArray<NumberProc> = [
  (stream) => stream.map((value) => value + 1),
  (stream) => stream.map((value, index) => value - index),
  (stream) => stream.map((value, index, all) => (all[index - 1] ?? 0) + value)
]

const sampleProcessorTriples: ReadonlyArray<readonly [NumberProc, NumberProc, NumberProc]> =
  sampleProcessors.flatMap((first) =>
    sampleProcessors.flatMap((second) =>
      sampleProcessors.map((third) => [first, second, third] as const)
    )
  )

const composeNumbers = (g: NumberProc, f: NumberProc): NumberProc =>
  StreamArrow.then<number, number, number>(g)(f)

const composePairs = (
  g: StreamProc<NumberPair, NumberPair>,
  f: StreamProc<NumberPair, NumberPair>
): StreamProc<NumberPair, NumberPair> => StreamArrow.then<NumberPair, NumberPair, NumberPair>(g)(f)

const composeEithers = (
  g: StreamProc<NumberEither, NumberEither>,
  f: StreamProc<NumberEither, NumberEither>
): StreamProc<NumberEither, NumberEither> =>
  StreamArrow.then<NumberEither, NumberEither, NumberEither>(g)(f)

const expectStreamsEqual = <A>(actual: Stream<A>, expected: Stream<A>) => {
  expect([...actual]).toEqual([...expected])
}

describe("LAW: Stream/Iteration laws", () => {
  describe("Stream Fusion laws", () => {
    it("Fusion: denote(Seq(Arr f, Proc σ)) == denote(fuse(σ,f))", () => {
      for (const f of sampleFunctions) {
        for (const sigma of sampleProcessors) {
          for (const stream of sampleStreams) {
            const left = composeNumbers(sigma, StreamArrow.arr<number, number>(f))(stream)
            const right = StreamFusion.fusePureInto(sigma, f)(stream)
            expectStreamsEqual(left, right)
          }
        }
      }
    })

    it("Exchange: denote(Seq(σ, Arr g)) == denote(fuse(σ,g))", () => {
      for (const sigma of sampleProcessors) {
        for (const g of sampleFunctions) {
          for (const stream of sampleStreams) {
            const left = composeNumbers(StreamArrow.arr<number, number>(g), sigma)(stream)
            const right = StreamFusion.fusePureOut(sigma, g)(stream)
            expectStreamsEqual(left, right)
          }
        }
      }
    })
  })

  describe("Stream Parallel laws", () => {
    it("Parallel: denote(Par(σ, τ)) == denote(σ) × denote(τ)", () => {
      for (const sigma of sampleProcessors) {
        for (const tau of sampleProcessors) {
          for (const stream of sampleStreams) {
            const pairedStream: Stream<NumberPair> = stream.map((value) => [value, value] as const)
            const left = StreamArrow.split(sigma, tau)(pairedStream)
            const right = stream.map((value) => [sigma([value])[0]!, tau([value])[0]!] as const)
            expectStreamsEqual(left, right)
          }
        }
      }
    })
  })

  describe("Stream RightTightening laws", () => {
    it("RightTightening: Loop(σ) >>> Arr g == Loop(σ >>> Arr(g × id))", () => {
      for (const sigma of sampleProcessors) {
        for (const g of sampleFunctions) {
          for (const stream of sampleStreams) {
            const loopProc: StreamProc<NumberPair, NumberPair> =
              (input: Stream<NumberPair>) =>
                input.map(([a, c]) => [sigma([a])[0]!, c] as const)

            const left = composeNumbers(
              StreamArrow.arr<number, number>(g),
              StreamArrow.loop<number, number, number>(loopProc)
            )(stream)
            const transformedLoop = composePairs(
              StreamArrow.arr<NumberPair, NumberPair>(([b, c]) => [g(b), c] as const),
              loopProc
            )
            const right = StreamArrow.loop<number, number, number>(transformedLoop)(stream)

            expectStreamsEqual(left, right)
          }
        }
      }
    })
  })

  describe("Stream Merge/Independence laws", () => {
    it("Merge/Independence: If σ and τ are independent, then merge(σ, τ) == σ × τ", () => {
      for (const sigma of sampleProcessors) {
        for (const tau of sampleProcessors) {
          for (const stream of sampleStreams) {
            const merge = (input: NumberStream): Stream<NumberPair> => {
              const resultS = sigma(input)
              const resultT = tau(input)
              return resultS.map((value, index) => [value, resultT[index] ?? 0] as const)
            }

            const left = merge(stream)
            const right = stream.map((value) => [sigma([value])[0]!, tau([value])[0]!] as const)

            expectStreamsEqual(left, right)
          }
        }
      }
    })
  })

  describe("Stream Arrow laws", () => {
    it("Stream Arrow Category: associativity", () => {
      for (const [f, g, h] of sampleProcessorTriples) {
        for (const stream of sampleStreams) {
          const left = composeNumbers(h, composeNumbers(g, f))(stream)
          const right = composeNumbers(composeNumbers(h, g), f)(stream)
          expectStreamsEqual(left, right)
        }
      }
    })

    it("Stream Arrow Category: identity", () => {
      for (const f of sampleProcessors) {
        for (const stream of sampleStreams) {
          const identityProc = StreamArrow.arr<number, number>((value) => value)
          const left = composeNumbers(f, identityProc)(stream)
          const right = composeNumbers(identityProc, f)(stream)
          expectStreamsEqual(left, right)
          expectStreamsEqual(left, f(stream))
        }
      }
    })

    it("Stream Arrow Functoriality: arr(g∘f) == arr f >>> arr g", () => {
      for (const f of sampleFunctions) {
        for (const g of sampleFunctions) {
          for (const stream of sampleStreams) {
            const left = StreamArrow.arr((value: number) => g(f(value)))(stream)
            const right = composeNumbers(
              StreamArrow.arr<number, number>(g),
              StreamArrow.arr<number, number>(f)
            )(stream)
            expectStreamsEqual(left, right)
          }
        }
      }
    })
  })

  describe("Stream ArrowChoice laws", () => {
    it("Left functoriality: left(arr f) == arr(left f)", () => {
      for (const f of sampleFunctions) {
        for (const stream of sampleStreams) {
          const eitherStream: Stream<NumberEither> =
            stream.map((value, index) =>
              index % 2 === 0
                ? { _tag: 'Left' as const, value }
                : { _tag: 'Right' as const, value }
            )

          const left = StreamArrow.left(StreamArrow.arr<number, number>(f))(eitherStream)
          const right = StreamArrow.arr((e: NumberEither) =>
            e._tag === 'Left' ? { _tag: 'Left' as const, value: f(e.value) } : e
          )(eitherStream)

          expectStreamsEqual(left, right)
        }
      }
    })

    it("Left composition: left(f >>> g) == left f >>> left g", () => {
      for (const f of sampleProcessors) {
        for (const g of sampleProcessors) {
          for (const stream of sampleStreams) {
            const eitherStream: Stream<NumberEither> =
              stream.map((value, index) =>
                index % 2 === 0
                  ? { _tag: 'Left' as const, value }
                  : { _tag: 'Right' as const, value }
              )

            const left = StreamArrow.left(composeNumbers(g, f))(eitherStream)
            const right = composeEithers(StreamArrow.left(g), StreamArrow.left(f))(eitherStream)

            expectStreamsEqual(left, right)
          }
        }
      }
    })
  })

  describe("Stream ArrowPlus laws", () => {
    it("Left identity: zero <+> p = p", () => {
      for (const p of sampleProcessors) {
        for (const stream of sampleStreams) {
          const left = StreamArrow.alt(StreamArrow.zero(), p)(stream)
          const right = p(stream)
          expectStreamsEqual(left, right)
        }
      }
    })

    it("Right identity: p <+> zero = p", () => {
      for (const p of sampleProcessors) {
        for (const stream of sampleStreams) {
          const left = StreamArrow.alt(p, StreamArrow.zero())(stream)
          const right = p(stream)
          expectStreamsEqual(left, right)
        }
      }
    })

    it("Associativity: (p <+> q) <+> r = p <+> (q <+> r)", () => {
      for (const [p, q, r] of sampleProcessorTriples) {
        for (const stream of sampleStreams) {
          const left = StreamArrow.alt(StreamArrow.alt(p, q), r)(stream)
          const right = StreamArrow.alt(p, StreamArrow.alt(q, r))(stream)
          expectStreamsEqual(left, right)
        }
      }
    })
  })
})
