/**
 * LAW: A.S.-compatibility & Sampling Cancellation Tests (Step 9: 5.15-ish)
 * 
 * Tests for almost-sure equality framework and sampling cancellation oracle.
 * Key insight: sampling cancellation can fail in exotic semirings.
 */

import { describe, it, expect } from "vitest";
import { Prob, GhostRig } from "../../semiring-utils";
import type { Dist } from "../../dist";
import { argmaxSamp } from "../../dist";
import { 
  samplingCancellation,
  equalDistAS,
  testSamplingCancellationDetailed,
  createNullMask,
  createInvisibleDifference,
  testASCompatibility
} from "../../as-equality";

const dX = (pairs: [string, number][]): Dist<number, string> =>
  ({ R: Prob, w: new Map(pairs) });

const dGhost = <X>(pairs: [X, 0 | 1 | 2][]): Dist<0 | 1 | 2, X> =>
  ({ R: GhostRig, w: new Map(pairs) });

describe("A.S.-compat & sampling cancellation", () => {
  
  describe("Basic Sampling Cancellation", () => {
    it("If samp∘f# equals samp∘g# off a null set, then f# equals g# off that set", () => {
      const A = ["u", "v", "w"] as const;
      // f#, g# differ only at 'ghost' point "⊘", which we declare null.
      const fsharp = (a: string) => a === "u"
        ? dX([["x", 1]])
        : dX([["⊘", 1]]); // null support
      const gsharp = (a: string) => a === "u"
        ? dX([["x", 1]])
        : dX([["⊘", 1]]);

      const samp = argmaxSamp<number, string>((a, b) => a - b);
      const nullMask = (x: string) => x === "⊘";

      expect(samplingCancellation(Prob, A, fsharp, gsharp, samp, nullMask)).toBe(true);
    });

    it("Detects violation when samp∘f# and samp∘g# disagree on non-null points", () => {
      const A = ["u"] as const;
      const fsharp = (_: string) => dX([["x", 1]]);
      const gsharp = (_: string) => dX([["y", 1]]);
      const samp = argmaxSamp<number, string>((a, b) => a - b);
      expect(samplingCancellation(Prob, A, fsharp, gsharp, samp)).toBe(false);
    });

    it("Works when functions are identical", () => {
      const A = ["test"];
      const f = (_: string) => dX([["result", 0.7], ["other", 0.3]]);
      const samp = argmaxSamp<number, string>((a, b) => a - b);
      
      expect(samplingCancellation(Prob, A, f, f, samp)).toBe(true);
    });

    it("Handles null masks correctly", () => {
      const A = ["test"];
      const f = (_: string) => dX([["good", 0.8], ["null", 0.2]]);
      const g = (_: string) => dX([["good", 0.8], ["null", 0.0]]); // Differs only on null point
      const samp = argmaxSamp<number, string>((a, b) => a - b);
      const nullMask = createNullMask(["null"]);
      
      expect(samplingCancellation(Prob, A, f, g, samp, nullMask)).toBe(true);
    });
  });

  describe("Almost-Sure Equality Framework", () => {
    it("equalDistAS respects null masks", () => {
      const d1 = dX([["a", 0.5], ["null", 0.5]]);
      const d2 = dX([["a", 0.5], ["null", 0.3]]); // Differs on null point
      const nullMask = createNullMask(["null"]);
      
      expect(equalDistAS(Prob, d1, d2)).toBe(false); // Different without mask
      expect(equalDistAS(Prob, d1, d2, nullMask)).toBe(true); // Same with mask
    });

    it("handles empty null masks", () => {
      const d1 = dX([["a", 0.6], ["b", 0.4]]);
      const d2 = dX([["a", 0.6], ["b", 0.4]]);
      
      expect(equalDistAS(Prob, d1, d2)).toBe(true);
      expect(equalDistAS(Prob, d1, d2, () => false)).toBe(true); // No null points
    });

    it("handles total null masks", () => {
      const d1 = dX([["a", 0.6], ["b", 0.4]]);
      const d2 = dX([["c", 0.3], ["d", 0.7]]);
      
      expect(equalDistAS(Prob, d1, d2)).toBe(false);
      expect(equalDistAS(Prob, d1, d2, () => true)).toBe(true); // All points null
    });
  });

  describe("Detailed Cancellation Analysis", () => {
    it("provides detailed reporting", () => {
      const A = ["test"];
      const f = (_: string) => dX([["x", 1.0]]);
      const g = (_: string) => dX([["y", 1.0]]);
      const samp = argmaxSamp<number, string>((a, b) => a - b);
      
      const result = testSamplingCancellationDetailed(Prob, A, f, g, samp);
      
      expect(result.samplingEqual).toBe(false);
      expect(result.distributionsEqual).toBe(false);
      expect(result.cancellationHolds).toBe(true); // No requirement when sampling differs
      expect(result.details).toContain("Sampling differs");
    });

    it("detects cancellation failures", () => {
      const A = ["test"];
      // Functions that sample to same point but have different distributions
      const f = (_: string) => dX([["winner", 0.9], ["loser", 0.1]]);
      const g = (_: string) => dX([["winner", 0.8], ["loser", 0.2]]);
      const samp = argmaxSamp<number, string>((a, b) => a - b); // Always picks "winner"
      
      const result = testSamplingCancellationDetailed(Prob, A, f, g, samp);
      
      expect(result.samplingEqual).toBe(true);   // Both sample to "winner"
      expect(result.distributionsEqual).toBe(false); // But distributions differ
      expect(result.cancellationHolds).toBe(false);  // Cancellation fails!
    });
  });

  describe("Invisible Difference Construction", () => {
    it("creates distributions with invisible differences", () => {
      const { withInvisible, withoutInvisible } = createInvisibleDifference(
        Prob, "visible", "invisible", 0.8, 0.2
      );
      
      expect(withInvisible.w.size).toBe(2);
      expect(withoutInvisible.w.size).toBe(1);
      
      // Should differ without null mask
      expect(equalDistAS(Prob, withInvisible, withoutInvisible)).toBe(false);
      
      // Should be equal with appropriate null mask
      const nullMask = createNullMask(["invisible"]);
      expect(equalDistAS(Prob, withInvisible, withoutInvisible, nullMask)).toBe(true);
    });
  });

  describe("A.S.-Compatibility Testing Framework", () => {
    it("tests compatibility across different scenarios", () => {
      const testCases = [
        {
          name: "identical distributions",
          dist1: dX([["a", 0.5], ["b", 0.5]]),
          dist2: dX([["a", 0.5], ["b", 0.5]]),
          samp: argmaxSamp<number, string>((a, b) => a - b),
          expectCancellation: true
        },
        {
          name: "different sampling results",
          dist1: dX([["winner1", 1.0]]),
          dist2: dX([["winner2", 1.0]]),
          samp: argmaxSamp<number, string>((a, b) => a - b),
          expectCancellation: true // No requirement when sampling differs
        }
      ];
      
      const results = testASCompatibility(Prob, testCases);
      
      results.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });
  });

  describe("Cross-Semiring A.S. Behavior", () => {
    it("Prob semiring supports standard a.s. equality", () => {
      const d1 = dX([["a", 0.7], ["b", 0.3]]);
      const d2 = dX([["a", 0.7], ["b", 0.3]]);
      
      expect(equalDistAS(Prob, d1, d2)).toBe(true);
    });

    it("Different semirings handle a.s. equality", () => {
      const semirings = [Prob, GhostRig];
      
      semirings.forEach(R => {
        const d1 = { R, w: new Map([["test", R.one]]) };
        const d2 = { R, w: new Map([["test", R.one]]) };
        
        expect(equalDistAS(R, d1, d2)).toBe(true);
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty distributions", () => {
      const empty1: Dist<number, string> = { R: Prob, w: new Map() };
      const empty2: Dist<number, string> = { R: Prob, w: new Map() };
      
      expect(equalDistAS(Prob, empty1, empty2)).toBe(true);
    });

    it("handles single-element distributions", () => {
      const d1 = dX([["singleton", 1.0]]);
      const d2 = dX([["singleton", 1.0]]);
      
      expect(equalDistAS(Prob, d1, d2)).toBe(true);
    });

    it("handles distributions with only null elements", () => {
      const d1 = dX([["null1", 0.4], ["null2", 0.6]]);
      const d2 = dX([["null1", 0.1], ["null2", 0.9]]);
      const nullMask = createNullMask(["null1", "null2"]);
      
      expect(equalDistAS(Prob, d1, d2, nullMask)).toBe(true);
    });
  });

  describe("Foundation for Ghost Counterexample", () => {
    it("sets up the framework for ghost semiring failures", () => {
      // This test prepares for the ghost semiring counterexample
      // where sampling cancellation fails due to ε weights
      
      const eps = 1 as const; // ε element in GhostRig
      
      // Two distributions that sample the same but differ in ε weights
      const d1 = dGhost([["x", 2]]); // weight 1 at x
      const d2 = dGhost([["x", 2], ["y", eps]]); // weight 1 at x, ε at y
      
      // They should be different as distributions
      expect(equalDistAS(GhostRig, d1, d2)).toBe(false);
      
      // But a sampler that ignores ε weights would see them as the same
      // This sets up the counterexample for Step 10
    });
  });
});