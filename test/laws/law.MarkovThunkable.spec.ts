/**
 * LAW: Thunkability ⇔ Determinism Tests (Step 7: ~3.14)
 * 
 * Tests for the thunkability oracle that recognizes thunkable maps
 * and verifies the commuting square behavior on arbitrary mixtures.
 * 
 * Key insight: f is thunkable ⇔ f is deterministic
 * Test oracle: Pf(d) = pushforward(d, b) for all distributions d
 */

import { describe, it, expect } from "vitest";
import { Prob, BoolRig, MaxPlus, GhostRig } from "../../semiring-utils";
import type { Dist } from "../../dist";
import { dirac } from "../../dist";
import { 
  isThunkable, 
  equalDist, 
  pushforward, 
  liftP,
  checkThunkabilityRobust,
  checkCommutingSquare,
  makeDeterministic,
  verifyDeterministicIsThunkable,
  verifyStochasticNotThunkable,
  generateProbeDists,
  isDiracAt
} from "../../markov-thunkable";

const dA = (pairs: [number, number][]): Dist<number, number> =>
  ({ R: Prob, w: new Map<number, number>(pairs) });

describe("Thunkability ⇔ determinism", () => {
  
  describe("Basic Thunkability Recognition", () => {
    it("Deterministic f (Dirac outputs) is thunkable and respects Pf(d) = pushforward", () => {
      // base map b: n ↦ n+1
      const b = (n: number) => n + 1;
      const f = (n: number) => dirac(Prob)(b(n));

      const A = [0, 1, 2, 3] as const;
      const probes = [
        dA([[0, 1]]),
        dA([[1, 0.4], [2, 0.6]]),
        dA([[0, 0.2], [3, 0.8]]),
      ];

      const res = isThunkable(Prob, f, A, probes);
      expect(res.thunkable).toBe(true);
      expect(res.base?.(10)).toBe(11);

      // Double-check the commuting behavior on probes:
      const Pf = liftP(Prob, f);
      for (const d of probes) {
        const lhs = Pf(d);
        const rhs = pushforward(Prob, d, b);
        expect(equalDist(Prob, lhs, rhs)).toBe(true);
      }
    });

    it("Genuinely stochastic f (non-Dirac) is not thunkable", () => {
      const coin = (n: number) =>
        ({ R: Prob, w: new Map<string, number>([["H", 0.5], ["T", 0.5]]) });

      const A = [0, 1] as const;
      const probes = [dA([[0, 0.5], [1, 0.5]])];

      const res = isThunkable(Prob, coin as any, A, probes);
      expect(res.thunkable).toBe(false);
    });

    it("Mixed deterministic/stochastic is not thunkable", () => {
      const mixed = (n: number) => 
        n === 0 ? dirac(Prob)("det") : 
        ({ R: Prob, w: new Map([["A", 0.6], ["B", 0.4]]) });

      const A = [0, 1] as const;
      const probes = [dA([[0, 0.5], [1, 0.5]])];

      const res = isThunkable(Prob, mixed as any, A, probes);
      expect(res.thunkable).toBe(false);
    });
  });

  describe("Multiple Semirings", () => {
    it("Boolean semiring: deterministic is thunkable", () => {
      const f = (s: string) => dirac(BoolRig)(s.toUpperCase());
      const domain = ["a", "b", "c"];
      
      const result = checkThunkabilityRobust(BoolRig, f, domain);
      expect(result.thunkable).toBe(true);
      expect(result.base?.("test")).toBe("TEST");
    });

    it("MaxPlus semiring: deterministic is thunkable", () => {
      const f = (n: number) => dirac(MaxPlus)(n * n);
      const domain = [1, 2, 3];
      
      const result = checkThunkabilityRobust(MaxPlus, f, domain);
      expect(result.thunkable).toBe(true);
      expect(result.base?.(5)).toBe(25);
    });

    it("Ghost semiring: deterministic is thunkable", () => {
      const f = (s: string) => dirac(GhostRig)(s + "_ghost");
      const domain = ["x", "y"];
      
      const result = checkThunkabilityRobust(GhostRig, f, domain);
      expect(result.thunkable).toBe(true);
      expect(result.base?.("test")).toBe("test_ghost");
    });
  });

  describe("Commuting Square Property", () => {
    it("verifies δ behaves naturally for thunkable maps", () => {
      const base = (n: number) => n * 2;
      const f = makeDeterministic(Prob, base);
      const domain = [1, 2, 3, 4];
      const testDists = generateProbeDists(Prob, domain);
      
      const commutes = checkCommutingSquare(Prob, f, base, testDists);
      expect(commutes).toBe(true);
    });

    it("detects when commuting square fails", () => {
      const base = (n: number) => n * 2;
      const wrongBase = (n: number) => n + 1; // Deliberately wrong
      const f = makeDeterministic(Prob, base);
      const domain = [1, 2, 3];
      const testDists = generateProbeDists(Prob, domain);
      
      const commutes = checkCommutingSquare(Prob, f, wrongBase, testDists);
      expect(commutes).toBe(false);
    });

    it("works with complex base functions", () => {
      // Use string output to avoid Map key issues with objects
      const complexBase = (n: number) => `id_${n}_doubled_${n * 2}_cat_${n % 3 === 0 ? "zero" : n % 3 === 1 ? "one" : "two"}`;
      
      const f = makeDeterministic(Prob, complexBase);
      const domain = [0, 1, 2, 3, 4, 5];
      
      const result = verifyDeterministicIsThunkable(Prob, complexBase, domain);
      expect(result).toBe(true);
    });
  });

  describe("Probe Distribution Generation", () => {
    it("generates appropriate probe distributions", () => {
      const domain = [1, 2, 3, 4];
      const probes = generateProbeDists(Prob, domain);
      
      expect(probes.length).toBeGreaterThan(domain.length); // At least point masses + more
      
      // Should include point masses
      let foundPointMasses = 0;
      probes.forEach(probe => {
        const diracCheck = isDiracAt(Prob, probe);
        if (diracCheck.ok) foundPointMasses++;
      });
      expect(foundPointMasses).toBe(domain.length);
    });

    it("handles different semiring types", () => {
      const domain = ["a", "b"];
      
      const probProbes = generateProbeDists(Prob, domain);
      const boolProbes = generateProbeDists(BoolRig, domain);
      const maxProbes = generateProbeDists(MaxPlus, domain);
      
      expect(probProbes.length).toBeGreaterThan(0);
      expect(boolProbes.length).toBeGreaterThan(0);
      expect(maxProbes.length).toBeGreaterThan(0);
    });

    it("handles edge cases", () => {
      // Empty domain
      expect(generateProbeDists(Prob, [])).toHaveLength(0);
      
      // Single element domain
      const singleProbes = generateProbeDists(Prob, ["singleton"]);
      expect(singleProbes.length).toBe(1); // Just the point mass
    });
  });

  describe("Structural Properties", () => {
    it("thunkable functions have extractable base", () => {
      const base = (n: number) => n % 5;
      const f = makeDeterministic(Prob, base);
      const domain = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      
      const result = checkThunkabilityRobust(Prob, f, domain);
      expect(result.thunkable).toBe(true);
      
      // Verify extracted base matches original
      if (result.base) {
        for (const n of domain) {
          expect(result.base(n)).toBe(base(n));
        }
      }
    });

    it("non-thunkable functions are correctly identified", () => {
      const stochastic = (_: number) => ({ 
        R: Prob, 
        w: new Map([["A", 0.3], ["B", 0.4], ["C", 0.3]]) 
      });
      
      const domain = [1, 2, 3];
      const result = verifyStochasticNotThunkable(Prob, stochastic as any, domain);
      expect(result).toBe(true);
    });

    it("handles partially deterministic functions", () => {
      const partial = (n: number) => 
        n < 2 ? dirac(Prob)(n.toString()) :
        ({ R: Prob, w: new Map([["big", 0.7], ["huge", 0.3]]) });
      
      const domain = [0, 1, 2, 3];
      const result = checkThunkabilityRobust(Prob, partial as any, domain);
      expect(result.thunkable).toBe(false);
    });
  });

  describe("Law Verification", () => {
    it("verifies thunkability ⇒ determinism", () => {
      // If a function is thunkable, it must be deterministic
      const base = (s: string) => s.length;
      const f = makeDeterministic(Prob, base);
      const domain = ["a", "bb", "ccc"];
      
      const result = checkThunkabilityRobust(Prob, f, domain);
      expect(result.thunkable).toBe(true);
      
      // Verify each output is indeed Dirac
      for (const a of domain) {
        const fa = f(a);
        const diracCheck = isDiracAt(Prob, fa);
        expect(diracCheck.ok).toBe(true);
        expect(diracCheck.ok && diracCheck.x).toBe(base(a));
      }
    });

    it("verifies determinism ⇒ thunkability", () => {
      // If each f(a) is Dirac, then f should be thunkable
      const numericBases = [
        (n: number) => n + 10,
        (n: number) => n * 3,
        (n: number) => Math.abs(n)
      ];
      
      numericBases.forEach(base => {
        const f = makeDeterministic(Prob, base);
        const domain = [0, 1, 2];
        
        const result = verifyDeterministicIsThunkable(Prob, base, domain);
        expect(result).toBe(true);
      });
      
      // Test string-based function separately
      const stringBase = (s: string) => s.toUpperCase();
      const stringF = makeDeterministic(Prob, stringBase);
      const stringDomain = ["a", "b"];
      
      const stringResult = verifyDeterministicIsThunkable(Prob, stringBase, stringDomain);
      expect(stringResult).toBe(true);
    });

    it("structural test without solving for g in f = δ∘g", () => {
      // The beauty of this approach: we don't need to solve for g
      // We just check the mixture law directly
      
      const mysteryF = (n: number) => {
        // This is deterministic but we pretend we don't know the base function
        const result = n * n + 1;
        return dirac(Prob)(result);
      };
      
      const domain = [0, 1, 2, 3, 4];
      const probes = generateProbeDists(Prob, domain);
      
      const result = isThunkable(Prob, mysteryF, domain, probes);
      expect(result.thunkable).toBe(true);
      
      // The recognizer should extract the base function
      if (result.base) {
        expect(result.base(5)).toBe(26); // 5² + 1 = 26
        expect(result.base(0)).toBe(1);  // 0² + 1 = 1
      }
    });
  });

  describe("Edge Cases and Robustness", () => {
    it("handles empty probe distributions", () => {
      const f = (n: number) => dirac(Prob)(n.toString());
      const domain = [1, 2, 3];
      const emptyProbes: Array<Dist<number, number>> = [];
      
      const result = isThunkable(Prob, f, domain, emptyProbes);
      expect(result.thunkable).toBe(true); // Should pass with no probes
    });

    it("handles functions with empty outputs", () => {
      const emptyF = (_: number) => ({ R: Prob, w: new Map() });
      const domain = [1, 2];
      const probes = generateProbeDists(Prob, domain);
      
      const result = isThunkable(Prob, emptyF as any, domain, probes);
      expect(result.thunkable).toBe(false);
    });

    it("handles single-element domains", () => {
      const f = (_: string) => dirac(Prob)("result");
      const domain = ["singleton"];
      
      const result = checkThunkabilityRobust(Prob, f, domain);
      expect(result.thunkable).toBe(true);
    });

    it("stress test with large domains", () => {
      const largeDomain = Array.from({ length: 20 }, (_, i) => i);
      const f = (n: number) => dirac(Prob)(`result_${n % 5}`);
      
      const result = checkThunkabilityRobust(Prob, f, largeDomain);
      expect(result.thunkable).toBe(true);
      expect(result.details).toContain("passed");
    });
  });

  describe("Cross-Semiring Consistency", () => {
    it("thunkability works across all semirings", () => {
      const semirings = [
        { name: "Prob", R: Prob },
        { name: "BoolRig", R: BoolRig },
        { name: "MaxPlus", R: MaxPlus },
        { name: "GhostRig", R: GhostRig }
      ];
      
      semirings.forEach(({ name, R }) => {
        const base = (n: number) => `${name}_${n}`;
        const f = makeDeterministic(R, base);
        const domain = [0, 1, 2];
        
        const result = verifyDeterministicIsThunkable(R, base, domain);
        expect(result).toBe(true);
      });
    });

    it("non-deterministic functions fail across semirings", () => {
      const semirings = [
        { name: "Prob", R: Prob, stoch: (_: number) => ({ R: Prob, w: new Map([["A", 0.5], ["B", 0.5]]) }) },
        { name: "BoolRig", R: BoolRig, stoch: (_: number) => ({ R: BoolRig, w: new Map([["X", true], ["Y", true]]) }) }
      ];
      
      semirings.forEach(({ name, R, stoch }) => {
        const domain = [1, 2];
        const result = verifyStochasticNotThunkable(R, stoch as any, domain);
        expect(result).toBe(true);
      });
    });
  });

  describe("Pushforward Properties", () => {
    it("pushforward preserves mass", () => {
      const d = dA([[1, 0.3], [2, 0.7]]);
      const g = (n: number) => n > 1 ? "big" : "small";
      
      const pushed = pushforward(Prob, d, g);
      
      // Mass should be preserved
      let originalMass = 0;
      let pushedMass = 0;
      d.w.forEach(p => originalMass += p);
      pushed.w.forEach(p => pushedMass += p);
      
      expect(Math.abs(originalMass - pushedMass)).toBeLessThan(1e-10);
    });

    it("pushforward aggregates correctly", () => {
      const d = dA([[1, 0.2], [2, 0.3], [3, 0.5]]);
      const g = (n: number) => n % 2 === 0 ? "even" : "odd";
      
      const pushed = pushforward(Prob, d, g);
      
      expect(pushed.w.get("even")).toBeCloseTo(0.3); // Just element 2
      expect(pushed.w.get("odd")).toBeCloseTo(0.7);  // Elements 1 and 3
    });

    it("pushforward with constant function", () => {
      const d = dA([[1, 0.4], [2, 0.6]]);
      const constant = (_: number) => "const";
      
      const pushed = pushforward(Prob, d, constant);
      
      expect(pushed.w.size).toBe(1);
      expect(pushed.w.get("const")).toBeCloseTo(1.0); // All mass concentrated
    });
  });

  describe("Dirac Detection", () => {
    it("correctly identifies Dirac distributions", () => {
      const diracDist = dirac(Prob)("test");
      const result = isDiracAt(Prob, diracDist);
      
      expect(result.ok).toBe(true);
      expect(result.ok && result.x).toBe("test");
    });

    it("correctly rejects non-Dirac distributions", () => {
      const mixedDist = { R: Prob, w: new Map([["A", 0.4], ["B", 0.6]]) };
      const result = isDiracAt(Prob, mixedDist);
      
      expect(result.ok).toBe(false);
    });

    it("handles zero-weight elements", () => {
      const almostDirac = { R: Prob, w: new Map([["A", 1.0], ["B", 0.0]]) };
      const result = isDiracAt(Prob, almostDirac);
      
      expect(result.ok).toBe(true);
      expect(result.ok && result.x).toBe("A");
    });

    it("handles empty distributions", () => {
      const empty = { R: Prob, w: new Map() };
      const result = isDiracAt(Prob, empty);
      
      expect(result.ok).toBe(false);
    });
  });

  describe("Integration with Previous Steps", () => {
    it("thunkable functions are deterministic (by our earlier recognizer)", () => {
      const base = (n: number) => n + 5;
      const f = makeDeterministic(Prob, base);
      const domain = [1, 2, 3];
      
      // Should be thunkable
      const thunkResult = checkThunkabilityRobust(Prob, f, domain);
      expect(thunkResult.thunkable).toBe(true);
      
      // Note: Integration with markov-laws would go here in a full setup
      // For now, we verify thunkability implies the outputs are all Dirac
      for (const a of domain) {
        const fa = f(a);
        const diracCheck = isDiracAt(Prob, fa);
        expect(diracCheck.ok).toBe(true);
      }
    });

    it("provides consistent base function extraction", () => {
      const originalBase = (s: string) => s.repeat(2);
      const f = makeDeterministic(Prob, originalBase);
      const domain = ["a", "b", "c"];
      
      const result = checkThunkabilityRobust(Prob, f, domain);
      expect(result.thunkable).toBe(true);
      
      // Extracted base should match original
      if (result.base) {
        for (const s of domain) {
          expect(result.base(s)).toBe(originalBase(s));
        }
      }
    });
  });
});