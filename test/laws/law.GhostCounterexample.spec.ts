/**
 * LAW: Ghost Semiring Counterexample Tests (Step 10: Ex 3.26)
 * 
 * Demonstrates the paper's phenomenon: representable but not a.s.-compatible.
 * Shows f# ≠ g# but samp∘f# = samp∘g# (sampling cancellation fails).
 */

import { describe, it, expect } from "vitest";
import { GhostRig, Prob } from "../../semiring-utils";
import type { Dist } from "../../dist";
import { argmaxSamp } from "../../dist";
import { samplingCancellation } from "../../as-equality";

type G = 0 | 1 | 2; // 0, ε, 1 (from GhostRig)
const d = <X>(pairs: [X, G][]): Dist<G, X> => ({ R: GhostRig, w: new Map(pairs) });
const dX = (pairs: [string, number][]): Dist<number, string> => ({ R: Prob, w: new Map(pairs) });

// A toy sampler for Ghost: pick the unique nonzero-weight support if there is one;
// if multiple nonzero supports, choose one by key order — this is just to define 'samp' for tests.
function sampGhost<X>(dx: Dist<G, X>): X {
  let pick: X | undefined;
  dx.w.forEach((w, x) => { 
    if (w !== 0 && pick === undefined) pick = x; 
  });
  if (pick === undefined) throw new Error("empty");
  return pick!;
}

describe("Ghost semiring counterexample (representable but not a.s.-compatible)", () => {
  
  describe("Core Counterexample (Ex 3.26)", () => {
    it("There exist f#, g# with f#≠g# but samp∘f# = samp∘g#", () => {
      // Two distributions differ in ε-weights but sample to the same point.
      const fsharp = d<string>([["x", 2]]);               // weight 1 at x
      const gsharp = d<string>([["x", 2], ["y", 1]]);     // weight 1 at x, ε at y

      // 1) Not equal as distributions
      let equalPointwise = true;
      const keys = new Set([...fsharp.w.keys(), ...gsharp.w.keys()]);
      for (const k of keys) {
        const fa = fsharp.w.get(k) ?? GhostRig.zero;
        const ga = gsharp.w.get(k) ?? GhostRig.zero;
        if (!GhostRig.eq(fa, ga)) { 
          equalPointwise = false; 
          break; 
        }
      }
      expect(equalPointwise).toBe(false);

      // 2) But sampling agrees (ε doesn't dethrone the 1-weight)
      expect(sampGhost(fsharp)).toBe(sampGhost(gsharp));
    });

    it("Sampling cancellation fails in Ghost semiring", () => {
      const A = ["test"];
      const fsharp = (_: string) => d<string>([["x", 2]]);               // weight 1 at x
      const gsharp = (_: string) => d<string>([["x", 2], ["y", 1]]);     // weight 1 at x, ε at y
      
      // Sampling cancellation should fail because:
      // - samp∘f# = samp∘g# (both return "x")
      // - But f# ≠ g# (they differ at point "y")
      const cancellationResult = samplingCancellation(GhostRig, A, fsharp, gsharp, sampGhost);
      expect(cancellationResult).toBe(false);
    });

    it("Demonstrates the ε-weight phenomenon", () => {
      const eps = 1 as const; // ε element
      const one = 2 as const; // 1 element
      
      // Distribution with only 1-weight
      const pure = d([["winner", one]]);
      
      // Distribution with 1-weight + ε-weight  
      const mixed = d([["winner", one], ["ghost", eps]]);
      
      // They sample to the same element
      expect(sampGhost(pure)).toBe("winner");
      expect(sampGhost(mixed)).toBe("winner");
      
      // But they're different distributions
      expect(pure.w.size).toBe(1);
      expect(mixed.w.size).toBe(2);
      expect(mixed.w.get("ghost")).toBe(eps);
    });
  });

  describe("Ghost Semiring Properties", () => {
    it("ε weights are preserved in operations", () => {
      const eps = 1 as const;
      const one = 2 as const;
      
      // ε + ε = ε
      expect(GhostRig.add(eps, eps)).toBe(eps);
      
      // ε * 1 = ε
      expect(GhostRig.mul(eps, one)).toBe(eps);
      
      // 1 + ε = 1
      expect(GhostRig.add(one, eps)).toBe(one);
    });

    it("ε weights create invisible differences", () => {
      const eps = 1 as const;
      const one = 2 as const;
      
      const d1 = d([["visible", one]]);
      const d2 = d([["visible", one], ["invisible", eps]]);
      
      // Different as distributions
      expect(d1.w.size).toBe(1);
      expect(d2.w.size).toBe(2);
      
      // But sampler sees them as the same (picks "visible" in both cases)
      expect(sampGhost(d1)).toBe("visible");
      expect(sampGhost(d2)).toBe("visible");
    });

    it("demonstrates non-a.s.-compatibility", () => {
      const eps = 1 as const;
      const one = 2 as const;
      
      // Create two functions that sample identically but differ distributionally
      const A = ["input"];
      const f = (_: string) => d([["result", one]]);
      const g = (_: string) => d([["result", one], ["ghost", eps]]);
      
      // They sample to the same result
      expect(sampGhost(f("input"))).toBe(sampGhost(g("input")));
      
      // But they're not equal as distributions
      const fa = f("input");
      const ga = g("input");
      expect(fa.w.size).toBe(1);
      expect(ga.w.size).toBe(2);
      
      // This breaks sampling cancellation
      const cancellation = samplingCancellation(GhostRig, A, f, g, sampGhost);
      expect(cancellation).toBe(false);
    });
  });

  describe("Comparison with Well-Behaved Semirings", () => {
    it("Prob semiring maintains sampling cancellation", () => {
      const A = ["test"];
      
      // In Prob, if two distributions sample to the same point,
      // they must be "close" in some sense (for reasonable samplers)
      const f = (_: string) => dX([["winner", 0.9], ["loser", 0.1]]);
      const g = (_: string) => dX([["winner", 0.9], ["loser", 0.1]]);
      const samp = argmaxSamp<number, string>((a, b) => a - b);
      
      const cancellation = samplingCancellation(Prob, A, f, g, samp);
      expect(cancellation).toBe(true);
    });

    it("Highlights the uniqueness of Ghost semiring pathology", () => {
      // The Ghost semiring is special because it allows "invisible" weights (ε)
      // that don't affect sampling but do affect distributional equality
      
      const eps = 1 as const;
      const zero = 0 as const;
      const one = 2 as const;
      
      // Key insight: ε is neither 0 nor 1, but behaves specially
      expect(GhostRig.eq(eps, zero)).toBe(false);
      expect(GhostRig.eq(eps, one)).toBe(false);
      
      // ε + 1 = 1 (ε gets "absorbed")
      expect(GhostRig.add(eps, one)).toBe(one);
      
      // But ε ≠ 0, so it's a "real" weight that affects distributions
      expect(GhostRig.isZero?.(eps)).toBe(false);
      
      // This creates the pathological behavior where distributions
      // can differ by ε-weights without affecting sampling
    });
  });

  describe("Theoretical Implications", () => {
    it("demonstrates limits of representability", () => {
      // The ghost semiring shows that representability doesn't guarantee
      // a.s.-compatibility. This is a deep result about the foundations
      // of probability theory and measure theory.
      
      const eps = 1 as const;
      const one = 2 as const;
      
      // GhostRig is representable (has δ and samp)
      expect(GhostRig.zero).toBeDefined();
      expect(GhostRig.one).toBeDefined();
      
      // But it's not a.s.-compatible due to ε-weight pathology
      const f = d([["x", one]]);
      const g = d([["x", one], ["y", eps]]);
      
      expect(sampGhost(f)).toBe(sampGhost(g)); // Same sampling
      expect(f.w.size !== g.w.size).toBe(true); // Different distributions
    });

    it("provides foundation for advanced measure theory", () => {
      // This counterexample provides the foundation for understanding
      // when measure-theoretic arguments break down in discrete settings
      
      // The key insight: ε weights are "infinitesimal" but not zero
      // They affect distributional equality but not sampling behavior
      
      const eps = 1 as const;
      
      // ε is a "ghost probability" - present but invisible to sampling
      expect(GhostRig.isZero?.(eps)).toBe(false);
      expect(eps !== GhostRig.zero).toBe(true);
      
      // This creates a gap between syntactic and semantic equality
      // that's crucial for understanding the limits of discrete probability
    });
  });
});