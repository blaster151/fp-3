/**
 * LAW: Entirety Check Tests (Step 6: 3.6)
 * 
 * Tests for the entirety oracle that connects isEntire with pullback square.
 * This is the complete implementation of Law 3.6:
 * "If R is entire (no zero divisors), then pullback square (3.8) always holds"
 */

import { describe, it, expect } from "vitest";
import { Prob, BoolRig, MaxPlus, GhostRig, directSum, isEntire } from "../../semiring-utils";
import type { CSRig } from "../../semiring-utils";
import { 
  checkEntirety, 
  checkEntiretyDetailed, 
  checkEntiretyAcrossSemirings,
  satisfiesEntiretyLaw,
  findEntiretyCounterexamples
} from "../../entirety-check";
import { checkPullbackSquare } from "../../pullback-square";

// Toy functions for testing
const A = [0, 1, 2];
const f = (a: number) => (a % 2 === 0 ? "even" : "odd");
const g = (a: number) => (a > 0 ? "pos" : "nonpos");

describe("Entirety law (3.6)", () => {
  
  describe("Basic Entirety Checks", () => {
    it("Probability semiring is entire ⇒ pullback always holds", () => {
      expect(checkEntirety(Prob, A, f, g)).toBe(true);
    });

    it("Bool semiring is entire ⇒ pullback always holds", () => {
      expect(checkEntirety(BoolRig, A, f, g)).toBe(true);
    });

    it("MaxPlus is entire ⇒ pullback always holds", () => {
      expect(checkEntirety(MaxPlus, A, f, g)).toBe(true);
    });

    it("GhostRig is entire ⇒ pullback always holds", () => {
      expect(checkEntirety(GhostRig, A, f, g)).toBe(true);
    });

    it("Direct sum is NOT entire, so we don't assert pullback law", () => {
      const R2 = directSum(Prob);
      expect(R2.entire).toBe(false);
      expect(isEntire(R2)).toBe(false);
      // We just skip strict assertion — returns true by convention
      expect(checkEntirety(R2, A, f, g)).toBe(true);
    });
  });

  describe("Detailed Entirety Analysis", () => {
    it("provides detailed reporting for entire semirings", () => {
      const result = checkEntiretyDetailed(Prob, A, f, g);
      
      expect(result.isEntire).toBe(true);
      expect(result.pullbackPassed).toBe(true);
      expect(result.lawSatisfied).toBe(true);
      expect(result.details).toContain("correctly passes");
    });

    it("provides detailed reporting for non-entire semirings", () => {
      const R2 = directSum(Prob);
      const result = checkEntiretyDetailed(R2, A, f, g);
      
      expect(result.isEntire).toBe(false);
      expect(result.lawSatisfied).toBe(true); // No requirement
      expect(result.details).toContain("Non-entire semiring");
    });

    it("handles various function types", () => {
      const testCases = [
        {
          name: "constant functions",
          f: (_: number) => "const",
          g: (_: number) => "also_const"
        },
        {
          name: "identity-like functions", 
          f: (n: number) => n.toString(),
          g: (n: number) => `item_${n}`
        },
        {
          name: "modular functions",
          f: (n: number) => `mod3_${n % 3}`,
          g: (n: number) => `mod2_${n % 2}`
        }
      ];
      
      testCases.forEach(({ name, f, g }) => {
        const result = checkEntiretyDetailed(Prob, A, f, g);
        expect(result.lawSatisfied).toBe(true);
      });
    });
  });

  describe("Cross-Semiring Analysis", () => {
    it("analyzes entirety law across multiple semirings", () => {
      const semirings: ReadonlyArray<{ readonly name: string; readonly R: CSRig<unknown> }> = [
        { name: "Prob", R: Prob },
        { name: "BoolRig", R: BoolRig },
        { name: "MaxPlus", R: MaxPlus },
        { name: "GhostRig", R: GhostRig },
        { name: "DirectSum", R: directSum(Prob) }
      ];
      
      const results = checkEntiretyAcrossSemirings(semirings, A, f, g);
      
      // All entire semirings should pass
      const entireResults = results.filter(r => r.isEntire);
      entireResults.forEach(result => {
        expect(result.passed).toBe(true);
        expect(result.details).toContain("correctly passes");
      });
      
      // Non-entire semirings should be flagged but not fail
      const nonEntireResults = results.filter(r => !r.isEntire);
      nonEntireResults.forEach(result => {
        expect(result.passed).toBe(true); // No requirement
        expect(result.details).toContain("Non-entire");
      });
    });

    it("finds no counterexamples in well-behaved semirings", () => {
      const semirings: ReadonlyArray<{ readonly name: string; readonly R: CSRig<unknown> }> = [
        { name: "Prob", R: Prob },
        { name: "BoolRig", R: BoolRig },
        { name: "MaxPlus", R: MaxPlus },
        { name: "GhostRig", R: GhostRig }
      ];
      
      const counterexamples = findEntiretyCounterexamples(semirings, A, f, g);
      expect(counterexamples).toHaveLength(0);
    });

    it("correctly identifies entirety status", () => {
      const testCases: ReadonlyArray<{ readonly name: string; readonly R: CSRig<unknown>; readonly shouldBeEntire: boolean }> = [
        { name: "Prob", R: Prob, shouldBeEntire: true },
        { name: "BoolRig", R: BoolRig, shouldBeEntire: true },
        { name: "MaxPlus", R: MaxPlus, shouldBeEntire: true },
        { name: "GhostRig", R: GhostRig, shouldBeEntire: true },
        { name: "DirectSum", R: directSum(Prob), shouldBeEntire: false }
      ];
      
      testCases.forEach(({ name, R, shouldBeEntire }) => {
        const rig = R as CSRig<unknown>;
        expect(isEntire(rig)).toBe(shouldBeEntire);
        expect(satisfiesEntiretyLaw(rig, A, f, g)).toBe(true);
      });
    });
  });

  describe("Stress Testing", () => {
    it("handles large domains efficiently", () => {
      const largeA = Array.from({ length: 50 }, (_, i) => i);
      const largeF = (n: number) => `group_${n % 7}`;
      const largeG = (n: number) => `type_${n % 5}`;
      
      expect(checkEntirety(Prob, largeA, largeF, largeG)).toBe(true);
      expect(checkEntirety(BoolRig, largeA, largeF, largeG)).toBe(true);
    });

    it("handles complex output types", () => {
      // Note: Complex objects as Map keys can be tricky due to reference equality
      // For this test, we'll use string-based outputs to avoid Map key issues
      const complexF = (n: number) => `obj_${n}_cat_${n % 3}`;
      const complexG = (n: number) => `val_${n * 2}_label_item_${n}`;
      
      expect(checkEntirety(Prob, A, complexF, complexG)).toBe(true);
    });

    it("handles edge cases", () => {
      // Empty domain
      expect(checkEntirety(Prob, [], f, g)).toBe(true);
      
      // Single element domain
      expect(checkEntirety(Prob, [42], f, g)).toBe(true);
      
      // Constant functions
      const constF = (_: number) => "constant";
      const constG = (_: number) => "also_constant";
      expect(checkEntirety(Prob, A, constF, constG)).toBe(true);
    });
  });

  describe("Integration with Previous Steps", () => {
    it("entirety check builds on pullback square foundation", () => {
      // This test verifies that Step 6 properly integrates with Step 5
      const semirings: ReadonlyArray<CSRig<unknown>> = [Prob, BoolRig, MaxPlus, GhostRig];
      
      semirings.forEach(R => {
        const rig = R as CSRig<unknown>;
        expect(isEntire(rig)).toBe(true);

        // The entirety check should delegate to pullback square
        const entiretyResult = checkEntirety(rig, A, f, g);
        expect(entiretyResult).toBe(true);

        // Verify this matches direct pullback square check
        const directResult = checkPullbackSquare(rig, A, f, g);
        expect(entiretyResult).toBe(directResult);
      });
    });

    it("non-entire semirings bypass pullback requirement", () => {
      const R2 = directSum(Prob);
      expect(isEntire(R2)).toBe(false);
      
      // Even if pullback square might fail for exotic cases,
      // the entirety check returns true (no requirement)
      const result = checkEntirety(R2, A, f, g);
      expect(result).toBe(true);
      
      const detailed = checkEntiretyDetailed(R2, A, f, g);
      expect(detailed.isEntire).toBe(false);
      expect(detailed.lawSatisfied).toBe(true);
    });
  });

  describe("Law 3.6 Complete Verification", () => {
    it("verifies the complete 3.6 statement", () => {
      // Law 3.6: "If R is entire, then pullback square always holds"
      // This is the contrapositive test: if pullback fails, then R is not entire
      
      const entireSemirings = [
        { name: "Prob", R: Prob },
        { name: "BoolRig", R: BoolRig },
        { name: "MaxPlus", R: MaxPlus },
        { name: "GhostRig", R: GhostRig }
      ];
      
      // For all entire semirings, entirety check must pass
      entireSemirings.forEach(({ name, R }) => {
        const rig = R as CSRig<unknown>;
        expect(isEntire(rig)).toBe(true);
        expect(checkEntirety(rig, A, f, g)).toBe(true);
      });
      
      // For non-entire semirings, no requirement (but we don't assert failure)
      const nonEntire = directSum(Prob);
      expect(isEntire(nonEntire)).toBe(false);
      expect(checkEntirety(nonEntire, A, f, g)).toBe(true); // Convention: return true
    });

    it("provides foundation for counterexample construction", () => {
      const R2 = directSum(Prob);
      
      // This semiring has the algebraic structure needed for counterexamples
      expect(isEntire(R2)).toBe(false);
      expect(R2.entire).toBe(false);
      
      // The zero divisors: (1,0) · (0,1) = (0,0)
      const zd1 = [1, 0] as const;
      const zd2 = [0, 1] as const;
      const product = R2.mul(zd1, zd2);
      expect(R2.eq(product, R2.zero)).toBe(true);
      
      // This structure will be exploited in later steps to construct
      // joints with Dirac marginals that aren't Dirac pairs
    });
  });

  describe("Performance and Scalability", () => {
    it("scales well with domain size", () => {
      const sizes = [10, 25, 50];
      
      sizes.forEach(size => {
        const domain = Array.from({ length: size }, (_, i) => i);
        const mapF = (n: number) => `f_${n % 5}`;
        const mapG = (n: number) => `g_${n % 3}`;
        
        const start = Date.now();
        const result = checkEntirety(Prob, domain, mapF, mapG);
        const duration = Date.now() - start;
        
        expect(result).toBe(true);
        expect(duration).toBeLessThan(100); // Should be fast
      });
    });

    it("handles complex function compositions", () => {
      const compositeF = (n: number) => {
        const base = n % 4;
        const modifier = n > 10 ? "_big" : "_small";
        return `${base}${modifier}`;
      };
      
      const compositeG = (n: number) => {
        const category = n % 3 === 0 ? "zero" : n % 3 === 1 ? "one" : "two";
        const size = n < 5 ? "tiny" : n < 15 ? "medium" : "large";
        return `${category}_${size}`;
      };
      
      expect(checkEntirety(Prob, A, compositeF, compositeG)).toBe(true);
    });
  });
});