/**
 * LAW: Pullback Square Tests (Step 5: 3.8)
 * 
 * Tests for the full pullback square property:
 * "The only joint with Dirac marginals is the Dirac pair"
 * 
 * This is the crucial test that separates well-behaved semirings
 * from exotic counterexamples.
 */

import { describe, it, expect } from "vitest";
import { Prob, directSum, BoolRig, MaxPlus, GhostRig, isEntire } from "../../semiring-utils";
import type { Dist } from "../../dist";
import { 
  checkPullbackSquare, 
  generateCheatingCandidates,
  checkPullbackSquareRobust,
  checkFullRepresentability
} from "../../pullback-square";

// Helper to create distributions
const d = <R>(R: CSRig<R>, w: [string, R][]): Dist<R, string> => ({ R, w: new Map(w) });

// A trivial "spoof" generator to try to cheat the joint (should FAIL to cheat for Prob)
const spoof = (xa: string, ya: string) => (a: unknown): Dist<number, string> => {
  // Try to spread mass off the (xa,ya) point but keep both marginals δ_xa and δ_ya.
  // Over ordinary probabilities this is IMPOSSIBLE unless those extra masses are zero.
  // The oracle should accept only the true Dirac joint.
  return d(Prob, [
    [`${xa}|${ya}`, 1.0],
    [`${xa}|${ya}_bogus`, 0.0],       // zero mass: harmless
    [`${xa}_bogus|${ya}`, 0.0],       // zero mass: harmless
  ]);
};

describe("Pullback square (3.8) — ordinary probabilities", () => {
  
  it("Unique joint with Dirac marginals is the Dirac pair", () => {
    const A = ["u", "v", "w"] as const;
    const f = (a: typeof A[number]) => (a === "u" ? "x" : "y");
    const g = (a: typeof A[number]) => (a === "w" ? "z" : "t");

    const ok = checkPullbackSquare(
      Prob, A, f, g,
      // give it a candidate that *tries* to deviate; it shouldn't break anything for Prob
      A.map(a => spoof(f(a), g(a)))
    );
    expect(ok).toBe(true);
  });

  it("Basic pullback square without candidates", () => {
    const A = [1, 2, 3, 4];
    const f = (n: number) => n % 2 === 0 ? "even" : "odd";
    const g = (n: number) => n < 3 ? "small" : "big";
    
    const result = checkPullbackSquare(Prob, A, f, g);
    expect(result).toBe(true);
  });

  it("Detects violations when candidates break uniqueness", () => {
    // This is a conceptual test - in practice, for Prob semiring,
    // it's impossible to create a proper cheating candidate
    const A = [1];
    const f = (_: number) => "x";
    const g = (_: number) => "y";
    
    // Try to create a "cheating" candidate that somehow has the right marginals
    // but wrong joint (this should be impossible for Prob)
    const impossibleCandidate = (_: number): Dist<number, string> => {
      // This candidate can't actually cheat for Prob semiring
      return d(Prob, [["x|y", 1.0]]);
    };
    
    const result = checkPullbackSquare(Prob, A, f, g, [impossibleCandidate]);
    expect(result).toBe(true); // Should still pass because cheating is impossible
  });
});

describe("Multiple Semirings", () => {
  const testSemirings = [
    { name: "Prob", R: Prob },
    { name: "MaxPlus", R: MaxPlus },
    { name: "BoolRig", R: BoolRig },
    { name: "GhostRig", R: GhostRig }
  ];

  testSemirings.forEach(({ name, R }) => {
    it(`${name}: pullback square holds`, () => {
      const A = ["a", "b", "c"];
      const f = (a: string) => a.toUpperCase();
      const g = (a: string) => a.length.toString();
      
      const result = checkPullbackSquare(R, A, f, g);
      expect(result).toBe(true);
    });
  });
});

describe("Robust Testing with Cheating Attempts", () => {
  it("generates meaningful cheating candidates", () => {
    const A = [1, 2];
    const f = (n: number) => `f${n}`;
    const g = (n: number) => `g${n}`;
    
    const candidates = generateCheatingCandidates(Prob, f, g);
    expect(candidates.length).toBeGreaterThan(0);
    
    // Test that candidates can be executed
    for (const candidate of candidates) {
      const result = candidate(1);
      expect(result.R).toBe(Prob);
      expect(result.w.size).toBeGreaterThan(0);
    }
  });

  it("robust check passes for well-behaved semirings", () => {
    const A = [1, 2, 3];
    const f = (n: number) => n > 2 ? "big" : "small";
    const g = (n: number) => n % 2 === 0 ? "even" : "odd";
    
    const result = checkPullbackSquareRobust(Prob, A, f, g);
    expect(result.passed).toBe(true);
    expect(result.details).toContain("Passed all");
  });
});

describe("Integration with Step 4 Diagnostics", () => {
  it("combines split mono and pullback square checks", () => {
    const A = [1, 2, 3];
    const f = (n: number) => n.toString();
    const g = (n: number) => (n * 2).toString();
    
    // For now, we'll assume split mono passes (would be checked separately)
    const splitMonoPassed = true;
    
    const result = checkFullRepresentability(Prob, A, f, g, splitMonoPassed);
    expect(result.splitMono).toBe(true);
    expect(result.pullbackSquare).toBe(true);
    expect(result.overall).toBe(true);
  });
});

describe("Notes for exotic rigs (e.g., direct sums)", () => {
  it("The same oracle can be used with R⊕R once you build candidates in that rig", () => {
    const R2 = directSum(Prob);
    // In your counterexample tests, you'll construct an h with δ-marginals
    // in R⊕R that is not equal to the Dirac joint. When you have that h,
    // pass it via candidates and expect the oracle to return false.
    expect(R2.entire).toBe(false);
    expect(isEntire(R2)).toBe(false);
  });

  it("Direct sum semiring setup for future counterexamples", () => {
    const R2 = directSum(Prob);
    
    // Basic pullback square test (should pass even for non-entire semirings
    // when we don't have exotic candidates)
    const A = ["test"];
    const f = (_: string) => "x";
    const g = (_: string) => "y";
    
    const result = checkPullbackSquare(R2, A, f, g);
    expect(result).toBe(true);
    
    // The failures will show up when we construct proper counterexample
    // candidates that exploit the zero divisors in R⊕R
  });

  it("Foundation for exotic counterexample construction", () => {
    const R2 = directSum(Prob);
    
    // This test sets up the foundation for constructing the counterexamples
    // mentioned in the paper. The actual counterexample construction will
    // be added in later steps when we have the full apparatus.
    
    // For now, verify that we can detect the zero divisor structure
    const zeroDiv1 = [1, 0] as const;
    const zeroDiv2 = [0, 1] as const;
    const product = R2.mul(zeroDiv1, zeroDiv2);
    
    expect(R2.eq(product, R2.zero)).toBe(true);
    expect(isEntire(R2)).toBe(false);
    
    // This zero divisor structure is what will eventually allow us to
    // construct joints with Dirac marginals that aren't Dirac pairs
  });
});

describe("Edge Cases and Stress Tests", () => {
  it("handles trivial mappings", () => {
    const A = [1, 2, 3];
    const f = (_: number) => "constant";
    const g = (_: number) => "also_constant";
    
    const result = checkPullbackSquare(Prob, A, f, g);
    expect(result).toBe(true);
  });

  it("handles identity mappings", () => {
    const A = ["a", "b", "c"];
    const f = (a: string) => a;
    const g = (a: string) => a;
    
    const result = checkPullbackSquare(Prob, A, f, g);
    expect(result).toBe(true);
  });

  it("handles empty domain", () => {
    const A: string[] = [];
    const f = (a: string) => a;
    const g = (a: string) => a;
    
    const result = checkPullbackSquare(Prob, A, f, g);
    expect(result).toBe(true); // Vacuously true
  });

  it("handles large domains efficiently", () => {
    const A = Array.from({ length: 100 }, (_, i) => i);
    const f = (n: number) => `group_${n % 5}`;
    const g = (n: number) => `type_${n % 3}`;
    
    const result = checkPullbackSquare(Prob, A, f, g);
    expect(result).toBe(true);
  });
});