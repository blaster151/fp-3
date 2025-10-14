/**
 * LAW: Sampling-Delta Identity Laws
 * 
 * Core representability property: samp∘delta = id
 * This ensures that sampling from a Dirac distribution recovers the original element.
 * 
 * Laws implemented following the format:
 * (Name, Domain, Statement, Rationale, Test Oracle)
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { Dist } from '../../dist'
import { Prob } from '../../semiring-utils'
import { checkSampDeltaIdentity, isDeterministic } from '../../markov-laws'
import { mkFin } from '../../markov-category'

const compareNumber = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0)

const deltaProb = <X>(x: X): Dist<number, X> => ({ R: Prob, w: new Map([[x, Prob.one]]) })

const sampProb = <X>(dist: Dist<number, X>): X => {
  let best: { value: X; weight: number } | undefined
  dist.w.forEach((weight, value) => {
    if (best === undefined || compareNumber(weight, best.weight) > 0) {
      best = { value, weight }
    }
  })
  if (!best) {
    throw new Error('Cannot sample from empty distribution')
  }
  return best.value
}

const fromPairs = <X>(pairs: Iterable<[X, number]>): Dist<number, X> => {
  const weights = new Map<X, number>()
  for (const [value, weight] of pairs) {
    weights.set(value, (weights.get(value) ?? 0) + weight)
  }
  return { R: Prob, w: weights }
}

describe("LAW: Sampling-Delta Identity", () => {

  describe("A.1 Core Representability", () => {
    /**
     * Name: Sampling-Delta Identity
     * Domain: Any finite type X with equality
     * Statement: samp(delta(x)) = x for all x ∈ X
     * Rationale: Dirac distributions should be perfectly recoverable
     * Test Oracle: Direct equality check after round-trip
     */

    it("samp∘delta = id for integers", () => {
      fc.assert(
        fc.property(fc.integer(), (x) => {
          const dist = deltaProb(x)
          const recovered = sampProb(dist)
          return recovered === x
        })
      )
    })

    it("samp∘delta = id for strings", () => {
      fc.assert(
        fc.property(fc.string(), (raw) => {
          const x = raw
          const dist = deltaProb(x)
          const recovered = sampProb(dist)
          return recovered === x
        })
      )
    })

    it("samp∘delta = id for finite sets", () => {
      const runFiniteTest = <T>(values: ReadonlyArray<T>, eq: (a: T, b: T) => boolean) => {
        const fin = mkFin(values, eq)
        expect(checkSampDeltaIdentity(Prob, deltaProb, sampProb, fin.elems, fin.eq)).toBe(true)
      }

      runFiniteTest([0, 1, 2], (a, b) => a === b)
      runFiniteTest(['a', 'b', 'c'], (a, b) => a === b)
      runFiniteTest([true, false], (a, b) => a === b)
    })

    it("samp∘delta = id for complex objects", () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer(),
            name: fc.string(),
            active: fc.boolean()
          }),
          (obj) => {
            const dist = deltaProb(obj)
            const recovered = sampProb(dist)
            return recovered.id === obj.id &&
                   recovered.name === obj.name &&
                   recovered.active === obj.active
          }
        )
      )
    })
  })

  describe("A.2 Determinism Recognition", () => {
    /**
     * Name: Deterministic Kernel Recognition
     * Domain: Kernels f: A → Dist(X)
     * Statement: f is deterministic iff it factors through delta
     * Rationale: Characterizes deterministic morphisms in Markov categories
     * Test Oracle: Check factorization through delta exists
     */

    it("recognizes deterministic kernels", () => {
      // Deterministic kernel: always maps to single element
      const detKernel = (x: number): Dist<number, number> => deltaProb(x * 2)
      const sampleInputs = [0, 1, 2, 3, 4]

      const result = isDeterministic(Prob, detKernel, sampleInputs)
      expect(result.det).toBe(true)

      if (result.base) {
        // Check factorization: f(x) = delta(base(x))
        for (let x = 0; x < 5; x++) {
          const direct = detKernel(x)
          const factored = deltaProb(result.base(x))

          // Should have same support
          const directSupport = [...direct.w.keys()]
          const factoredSupport = [...factored.w.keys()]
          expect(directSupport).toHaveLength(1)
          expect(factoredSupport).toHaveLength(1)
          expect(directSupport[0]).toBe(factoredSupport[0])
        }
      }
    })

    it("recognizes non-deterministic kernels", () => {
      // Non-deterministic kernel: uniform over two elements
      const nonDetKernel = (x: number): Dist<number, number> =>
        fromPairs([[x, 0.5], [x + 1, 0.5]])

      const result = isDeterministic(Prob, nonDetKernel, [0, 1])
      expect(result.det).toBe(false)
    })

    it("handles edge cases", () => {
      // Empty distribution (should not be deterministic)
      const emptyKernel = (_x: number): Dist<number, number> => ({ R: Prob, w: new Map() })

      // Zero-weight distribution (should not be deterministic)
      const zeroKernel = (_x: number): Dist<number, number> =>
        fromPairs([[1, 0], [2, 0]])

      expect(isDeterministic(Prob, emptyKernel, [0]).det).toBe(false)
      expect(isDeterministic(Prob, zeroKernel, [0]).det).toBe(false)
    })
  })

  describe("A.3 Sampling Properties", () => {
    /**
     * Name: Sampling Stability
     * Domain: Distributions with unique maxima
     * Statement: samp is stable under weight scaling and normalization
     * Rationale: Sampling should be invariant to positive scaling
     * Test Oracle: Same element sampled before/after scaling
     */

    it("sampling is invariant to positive scaling", () => {
      fc.assert(
        fc.property(
          fc.integer(),
          fc.float(),
          (x, rawScale) => {
            const scale = Math.max(Math.abs(rawScale), 0.1)
            const original = deltaProb(x)
            const scaled: Dist<number, number> = fromPairs([[x, scale]])

            const sampOriginal = sampProb(original)
            const sampScaled = sampProb(scaled)

            return sampOriginal === sampScaled
          }
        )
      )
    })

    it("sampling selects maximum weight element", () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.integer(), fc.float())),
          (rawPairs) => {
            if (rawPairs.length === 0) return true
            const pairs = rawPairs.slice(0, 5).map(([n, w]) => [n, Math.abs(w)] as [number, number])

            const dist = fromPairs(pairs)
            if (dist.w.size === 0) return true

            const sampled = sampProb(dist)
            const sampledWeight = dist.w.get(sampled) ?? 0

            // Should be one of the maximum weight elements
            const weights = [...dist.w.values()]
            if (weights.length === 0) return true
            const maxWeight = Math.max(...weights)
            return Math.abs(sampledWeight - maxWeight) < 1e-10
          }
        )
      )
    })
  })

  describe("A.4 Composition Properties", () => {
    /**
     * Name: Delta-Samp Composition Laws
     * Domain: Finite distributions and deterministic kernels
     * Statement: Various composition properties involving delta and samp
     * Rationale: Ensures coherent behavior in categorical compositions
     * Test Oracle: Equality of composite operations
     */

    it("delta is left inverse to samp (when samp is total)", () => {
      fc.assert(
        fc.property(fc.integer(), (x) => {
          // delta(x) should be the unique distribution that samp maps back to x
          const dist = deltaProb(x)
          const recovered = sampProb(dist)
          const reDeleted = deltaProb(recovered)

          // Should get back the same distribution
          expect(reDeleted.w.size).toBe(1)
          expect(reDeleted.w.get(x)).toBe(Prob.one)
          return true
        })
      )
    })

    it("samp respects deterministic composition", () => {
      // If f is deterministic, then samp(f(x)) should equal the unique support element
      const f = (x: number): Dist<number, number> => deltaProb(x * x)

      fc.assert(
        fc.property(fc.integer(), (x) => {
          const dist = f(x)
          const sampled = sampProb(dist)
          return sampled === x * x
        })
      )
    })
  })
})