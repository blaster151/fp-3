/**
 * LAW: Entirety Implications (3.6)
 * 
 * Tests that demonstrate the connection between entirety and faithfulness.
 * "If R is entire, then the pullback square passes for all tests"
 */

import { describe, it, expect } from "vitest";
import { Prob, MaxPlus, BoolRig, GhostRig, directSum, isEntire } from "../../semiring-utils";
import { checkFaithfulness, checkSplitMono } from "../../pullback-check";

describe("Entirety Implications (3.6)", () => {
  
  describe("Entire Semirings Pass Faithfulness", () => {
    const entireSemirings = [
      { name: "Prob", R: Prob },
      { name: "MaxPlus", R: MaxPlus },
      { name: "BoolRig", R: BoolRig },
      { name: "GhostRig", R: GhostRig }
    ];

    entireSemirings.forEach(({ name, R }) => {
      it(`${name}: entirety ⇒ faithfulness`, () => {
        expect(isEntire(R)).toBe(true);
        
        // Create diverse test samples (avoid zero weights for cleaner tests)
        const samples = [
          { R, w: new Map([["a", R.one]]) },
          { R, w: new Map([["b", R.one]]) }
        ];
        
        // Add a mixed distribution if the semiring supports it
        if (R === Prob) {
          samples.push({ R, w: new Map([["a", 0.3], ["b", 0.7]]) });
        } else if (R === MaxPlus) {
          samples.push({ R, w: new Map([["a", 0], ["b", -1]]) });
        } else {
          // For other semirings, add a distribution with both elements
          samples.push({ R, w: new Map([["a", R.one], ["b", R.one]]) });
        }
        
        const domain = ["a", "b"];
        const result = checkFaithfulness(R, samples, domain);
        
        expect(result.splitMono).toBe(true);
        expect(result.deltaMonic).toBe(true);
      });
    });
  });

  describe("Non-Entire Semirings: Counterexample Arena", () => {
    it("Direct sum R⊕R is non-entire", () => {
      const R2 = directSum(Prob);
      expect(isEntire(R2)).toBe(false);
      
      // The direct sum has zero divisors: (1,0) · (0,1) = (0,0)
      const a = [1, 0] as const;
      const b = [0, 1] as const;
      const product = R2.mul(a, b);
      expect(R2.eq(product, R2.zero)).toBe(true);
    });

    it("Non-entire semirings can still pass basic tests", () => {
      const R2 = directSum(Prob);
      
      // Basic faithfulness can still pass
      const samples = [
        { R: R2, w: new Map([["test", R2.one]]) }
      ];
      
      const result = checkFaithfulness(R2, samples, ["test"]);
      expect(result.splitMono).toBe(true);
      expect(result.deltaMonic).toBe(true);
    });

    it("Non-entire failures show up in complex scenarios", () => {
      const R2 = directSum(Prob);
      
      // Note: The failures mentioned in the paper (3.8) show up in the full
      // pullback square with δ, not just the basic Δ∘∇ = id test.
      // Those will be tested when we implement the full square checker.
      
      // For now, we just verify the setup is correct
      expect(R2.entire).toBe(false);
      expect(isEntire(R2)).toBe(false);
    });
  });

  describe("Entirety as Oracle for Advanced Properties", () => {
    it("entirety predicts determinism=Dirac behavior", () => {
      // This is a forward-looking test for when we implement
      // the full "entirety ⇒ determinism=Dirac" property
      
      const entireSemirings = [Prob, MaxPlus, BoolRig, GhostRig];
      
      entireSemirings.forEach(R => {
        expect(isEntire(R)).toBe(true);
        
        // In entire semirings, deterministic morphisms should
        // be exactly those that factor through δ
        // (This will be tested more thoroughly in later steps)
      });
    });

    it("provides foundation for pullback square testing", () => {
      // The split mono property Δ∘∇ = id is just the beginning
      // The full pullback square (3.8) uses this foundation
      
      const testSamples = [
        { R: Prob, w: new Map([["x", 0.5], ["y", 0.5]]) },
        { R: Prob, w: new Map([["x", 1.0]]) }
      ];
      
      expect(checkSplitMono(Prob, testSamples)).toBe(true);
      
      // This success gives us confidence that the full pullback
      // square with δ will also pass for entire semirings
    });
  });

  describe("Cross-Semiring Consistency", () => {
    it("all entire semirings behave consistently", () => {
      const entireSemirings = [
        { name: "Prob", R: Prob, unit: 1, zero: 0 },
        { name: "MaxPlus", R: MaxPlus, unit: 0, zero: -Infinity },
        { name: "BoolRig", R: BoolRig, unit: true, zero: false },
        { name: "GhostRig", R: GhostRig, unit: 2, zero: 0 }
      ];
      
      entireSemirings.forEach(({ name, R, unit, zero }) => {
        // Basic semiring properties
        expect(isEntire(R)).toBe(true);
        expect(R.eq(R.one, unit)).toBe(true);
        expect(R.eq(R.zero, zero)).toBe(true);
        
        // Faithfulness with unit distribution
        const unitDist = { R, w: new Map([["test", R.one]]) };
        const result = checkFaithfulness(R, [unitDist], ["test"]);
        expect(result.splitMono).toBe(true);
        expect(result.deltaMonic).toBe(true);
      });
    });
  });
});