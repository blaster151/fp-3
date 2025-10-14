/**
 * LAW: Sampling-Delta Identity Laws
 *
 * Core representability property: samp∘delta = id
 * This ensures that sampling from a Dirac distribution recovers the original element.
 *
 * Laws implemented following the format:
 * (Name, Domain, Statement, Rationale, Test Oracle)
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Prob } from "../../semiring-utils";
import { argmaxSamp, type Dist } from "../../dist";
import { checkSampDeltaIdentity, isDeterministic } from "../../markov-laws";
import { mkFin } from "../../markov-category";

const deltaProb = <X>(x: X): Dist<number, X> => ({
  R: Prob,
  w: new Map([[x, Prob.one]])
});
const compareWeights = (a: number, b: number) => (a > b ? 1 : a < b ? -1 : 0);
const samplerFor = <X>() => argmaxSamp<number, X>(compareWeights);
const mkProbDist = <X>(entries: Array<[X, number]>): Dist<number, X> => ({
  R: Prob,
  w: new Map(entries)
});

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
      const sampleNumber = samplerFor<number>();
      fc.assert(
        fc.property(fc.integer(), x => {
          const dist = deltaProb(x);
          const recovered = sampleNumber(dist);
          return recovered === x;
        })
      );
    });

    it("samp∘delta = id for strings", () => {
      const sampleString = samplerFor<string>();
      fc.assert(
        fc.property(fc.string(), x => {
          const dist = deltaProb(x);
          const recovered = sampleString(dist);
          return recovered === x;
        })
      );
    });

    it("samp∘delta = id for finite sets", () => {
      const finNumbers = mkFin([0, 1, 2], (a, b) => a === b);
      const finStrings = mkFin(["a", "b", "c"], (a, b) => a === b);
      const finBooleans = mkFin([true, false], (a, b) => a === b);

      const samplerNumbers = samplerFor<number>();
      expect(
        checkSampDeltaIdentity(
          Prob,
          deltaProb,
          samplerNumbers,
          finNumbers.elems,
          finNumbers.eq
        )
      ).toBe(true);

      const samplerStrings = samplerFor<string>();
      expect(
        checkSampDeltaIdentity(
          Prob,
          deltaProb,
          samplerStrings,
          finStrings.elems,
          finStrings.eq
        )
      ).toBe(true);

      const samplerBooleans = samplerFor<boolean>();
      expect(
        checkSampDeltaIdentity(
          Prob,
          deltaProb,
          samplerBooleans,
          finBooleans.elems,
          finBooleans.eq
        )
      ).toBe(true);
    });

    it("samp∘delta = id for complex objects", () => {
      type Complex = { id: number; name: string; active: boolean };
      const sampleComplex = samplerFor<Complex>();
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer(),
            name: fc.string(),
            active: fc.boolean()
          }),
          obj => {
            const dist = deltaProb(obj);
            const recovered = sampleComplex(dist);
            return (
              recovered.id === obj.id &&
              recovered.name === obj.name &&
              recovered.active === obj.active
            );
          }
        )
      );
    });
  });

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
      const detKernel = (x: number): Dist<number, number> => deltaProb(x * 2);
      const domain = [0, 1, 2, 3, 4];

      const result = isDeterministic(Prob, detKernel, domain);
      expect(result.det).toBe(true);

      expect(result.base).toBeDefined();
      if (result.base) {
        for (const x of domain) {
          const direct = detKernel(x);
          const baseValue = result.base(x);
          const factored = deltaProb(baseValue);

          expect(direct.w.size).toBe(1);
          expect(factored.w.size).toBe(1);
          const support = [...direct.w.keys()][0];
          expect(support).toBe(baseValue);
          const factoredSupport = [...factored.w.keys()][0];
          expect(factoredSupport).toBe(baseValue);
        }
      }
    });

    it("recognizes non-deterministic kernels", () => {
      const nonDetKernel = (x: number): Dist<number, number> =>
        mkProbDist([
          [x, 0.5],
          [x + 1, 0.5]
        ]);

      const result = isDeterministic(Prob, nonDetKernel, [0, 1, 2]);
      expect(result.det).toBe(false);
      expect(result.base).toBeUndefined();
    });

    it("handles edge cases", () => {
      const emptyKernel = (_x: number): Dist<number, number> => mkProbDist([]);
      const zeroKernel = (_x: number): Dist<number, number> =>
        mkProbDist([
          [1, 0],
          [2, 0]
        ]);

      expect(isDeterministic(Prob, emptyKernel, [0]).det).toBe(false);
      expect(isDeterministic(Prob, zeroKernel, [0]).det).toBe(false);
    });
  });

  describe("A.3 Sampling Properties", () => {
    /**
     * Name: Sampling Stability
     * Domain: Distributions with unique maxima
     * Statement: samp is stable under weight scaling and normalization
     * Rationale: Sampling should be invariant to positive scaling
     * Test Oracle: Same element sampled before/after scaling
     */

    it("sampling is invariant to positive scaling", () => {
      const sampleNumber = samplerFor<number>();
      const valueArb = fc.constantFrom(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
      const scaleArb = fc.constantFrom(0.1, 0.5, 1, 2, 3, 5, 10);
      fc.assert(
        fc.property(valueArb, scaleArb, (x, scale) => {
          const original = deltaProb(x);
          const scaled = mkProbDist([[x, scale]]);

          const sampOriginal = sampleNumber(original);
          const sampScaled = sampleNumber(scaled);

          return sampOriginal === sampScaled;
        })
      );
    });

    it("sampling selects maximum weight element", () => {
      const sampleNumber = samplerFor<number>();
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.integer(),
              fc.float({ min: 0, max: 1 })
            ),
            { minLength: 1, maxLength: 5 }
          ),
          pairs => {
            if (pairs.length === 0) return true;

            const dist = mkProbDist(pairs);
            const sampled = sampleNumber(dist);
            const sampledWeight = dist.w.get(sampled) ?? 0;

            const weights = Array.from(dist.w.values());
            const maxWeight = Math.max(...weights);
            return Math.abs(sampledWeight - maxWeight) < 1e-10;
          }
        )
      );
    });
  });

  describe("A.4 Composition Properties", () => {
    /**
     * Name: Delta-Samp Composition Laws
     * Domain: Finite distributions and deterministic kernels
     * Statement: Various composition properties involving delta and samp
     * Rationale: Ensures coherent behavior in categorical compositions
     * Test Oracle: Equality of composite operations
     */

    it("delta is left inverse to samp (when samp is total)", () => {
      const sampleNumber = samplerFor<number>();
      fc.assert(
        fc.property(fc.integer(), x => {
          const dist = deltaProb(x);
          const recovered = sampleNumber(dist);
          const reDeleted = deltaProb(recovered);

          return (
            reDeleted.w.size === 1 &&
            Prob.eq(reDeleted.w.get(x) ?? Prob.zero, Prob.one)
          );
        })
      );
    });

    it("samp respects deterministic composition", () => {
      const sampleNumber = samplerFor<number>();
      const f = (x: number): Dist<number, number> => deltaProb(x * x);

      const smallInts = fc.constantFrom(-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5);
      fc.assert(
        fc.property(smallInts, x => {
          const dist = f(x);
          const sampled = sampleNumber(dist);
          return sampled === x * x;
        })
      );
    });
  });
});
