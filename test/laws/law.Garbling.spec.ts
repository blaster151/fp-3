/**
 * LAW: Informativeness (Garbling) Tests (Step 12: Section 5)
 * 
 * Tests for classic informativeness oracle and joint construction.
 * Implements Blackwell sufficiency and garbling theory.
 */

import { describe, it, expect } from "vitest";
import { Prob } from "../../semiring-utils";
import type { Dist } from "../../dist";
import { dirac } from "../../dist";
import {
  moreInformativeClassic,
  jointFromGarbling,
  equalDist,
  composeDet,
  testInformativenessDetailed,
  generateAllFunctions,
  testInformativenessComprehensive,
  marginalX,
  marginalY,
  verifyJointMarginals,
  recoverGarblingFromJoint
} from "../../garbling";

const d = <X>(pairs: [X, number][]): Dist<number, X> =>
  ({ R: Prob, w: new Map(pairs) });

describe("Informativeness: classic garbling witness", () => {
  
  describe("Basic Informativeness Detection", () => {
    it("Finds c: X→Y with c∘f = g on a finite example", () => {
      type Θ = "t1" | "t2";
      type X = "xA" | "xB";
      type Y = "yL" | "yR";
      const Θs: Θ[] = ["t1", "t2"];
      const Xs: X[] = ["xA", "xB"];
      const Ys: Y[] = ["yL", "yR"];

      // Likelihood f: Θ→P X
      const f = (t: Θ): Dist<number, X> =>
        t === "t1" ? d([["xA", 0.8], ["xB", 0.2]])
                   : d([["xA", 0.1], ["xB", 0.9]]);

      // Garbling c: X→Y (unknown to the algorithm, we'll search it)
      const cTrue = (x: X) => x === "xA" ? "yL" : "yR";

      // g = c ∘ f
      const g = (t: Θ): Dist<number, Y> =>
        cTrue("xA") === "yL"
          ? d([["yL", f(t).w.get("xA") ?? 0], ["yR", f(t).w.get("xB") ?? 0]])
          : d([["yR", f(t).w.get("xA") ?? 0], ["yL", f(t).w.get("xB") ?? 0]]);

      // Candidate function class: all functions X→Y (2^2 = 4 candidates)
      const cCandidates = [
        (x: X) => "yL" as Y,
        (x: X) => "yR" as Y,
        (x: X) => (x === "xA" ? "yL" : "yR") as Y,
        (x: X) => (x === "xA" ? "yR" : "yL") as Y,
      ];

      const found = moreInformativeClassic(Prob, Θs, f, g, cCandidates);
      expect(found.ok).toBe(true);
      const c = (found as any).c as (x: X) => Y;

      // Verify explicitly
      for (const t of Θs) {
        expect(equalDist(Prob, composeDet(Prob, f, c)(t), g(t))).toBe(true);
      }

      // Build a joint from the witness and check marginals
      const h = jointFromGarbling(Prob, f, c);
      for (const t of Θs) {
        // Marginal over X is f(t)
        const margX = marginalX(Prob, h(t));
        // Marginal over Y is g(t)  
        const margY = marginalY(Prob, h(t));
        
        expect(equalDist(Prob, margX, f(t))).toBe(true);
        expect(equalDist(Prob, margY, g(t))).toBe(true);
      }
    });

    it("Detects when no garbling witness exists", () => {
      type Θ = "t1" | "t2";
      type X = "x1" | "x2";
      type Y = "y1" | "y2";
      
      const Θs: Θ[] = ["t1", "t2"];
      
      // f: clearly distinguishes between t1 and t2
      const f = (t: Θ): Dist<number, X> =>
        t === "t1" ? d([["x1", 1]]) : d([["x2", 1]]);
      
      // g: has different structure that can't be achieved by any garbling
      const g = (t: Θ): Dist<number, Y> =>
        t === "t1" ? d([["y1", 0.5], ["y2", 0.5]]) : d([["y1", 0.8], ["y2", 0.2]]);
      
      // No garbling can transform deterministic f into probabilistic g
      const candidates = generateAllFunctions(["x1", "x2"], ["y1", "y2"]);
      
      const result = moreInformativeClassic(Prob, Θs, f, g, candidates);
      expect(result.ok).toBe(false);
    });

    it("Handles identity garbling", () => {
      type Θ = "state1" | "state2";
      type X = "obs1" | "obs2";
      
      const Θs: Θ[] = ["state1", "state2"];
      
      const f = (t: Θ): Dist<number, X> =>
        t === "state1" ? d([["obs1", 0.7], ["obs2", 0.3]])
                       : d([["obs1", 0.2], ["obs2", 0.8]]);
      
      // g = f (identity garbling)
      const g = f;
      
      const candidates = [
        (x: X) => x, // Identity function
        (x: X) => x === "obs1" ? "obs2" : "obs1" // Swap function
      ];
      
      const result = moreInformativeClassic(Prob, Θs, f, g, candidates);
      expect(result.ok).toBe(true);
      
      // Should find the identity function
      if (result.ok) {
        expect(result.c("obs1")).toBe("obs1");
        expect(result.c("obs2")).toBe("obs2");
      }
    });
  });

  describe("Joint Construction from Garbling", () => {
    it("constructs proper joints from garbling witnesses", () => {
      type Θ = "θ1" | "θ2";
      type X = "x1" | "x2";
      type Y = "y1" | "y2";
      
      const Θs: Θ[] = ["θ1", "θ2"];
      
      const f = (t: Θ): Dist<number, X> =>
        t === "θ1" ? d([["x1", 0.6], ["x2", 0.4]])
                   : d([["x1", 0.3], ["x2", 0.7]]);
      
      const c = (x: X) => x === "x1" ? "y1" : "y2";
      const g = (t: Θ) => composeDet(Prob, f, c)(t);
      
      const joint = jointFromGarbling(Prob, f, c);
      
      // Verify marginals for each θ
      const verified = verifyJointMarginals(Prob, Θs, joint, f, g);
      expect(verified).toBe(true);
    });

    it("joint construction preserves total mass", () => {
      const f = (t: string) => d([["a", 0.4], ["b", 0.6]]);
      const c = (x: string) => x.toUpperCase();
      
      const joint = jointFromGarbling(Prob, f, c);
      const result = joint("test");
      
      let totalMass = 0;
      result.w.forEach(weight => totalMass += weight);
      expect(totalMass).toBeCloseTo(1.0);
    });

    it("handles deterministic likelihoods", () => {
      const f = (t: string) => d([[t, 1]]); // Deterministic: always observes the state
      const c = (x: string) => `garbled_${x}`;
      
      const joint = jointFromGarbling(Prob, f, c);
      const result = joint("test");
      
      expect(result.w.size).toBe(1);
      
      // Should be concentrated on ("test", "garbled_test")
      let foundKey: [string, string] | null = null;
      result.w.forEach((weight, key) => {
        foundKey = key as [string, string];
        expect(weight).toBeCloseTo(1.0);
      });
      
      expect(foundKey?.[0]).toBe("test");
      expect(foundKey?.[1]).toBe("garbled_test");
    });
  });

  describe("Comprehensive Informativeness Testing", () => {
    it("exhaustively searches all possible garblings", () => {
      type X = "a" | "b";
      type Y = "1" | "2";
      
      const xVals: X[] = ["a", "b"];
      const yVals: Y[] = ["1", "2"];
      
      const f = (_t: string) => d([["a", 0.6], ["b", 0.4]]);
      const g = (_t: string) => d([["1", 0.6], ["2", 0.4]]); // Same structure, different labels
      
      const result = testInformativenessComprehensive(
        Prob, ["test"], f, g, xVals, yVals
      );
      
      expect(result.moreInformative).toBe(true);
      expect(result.totalCandidates).toBe(4); // 2^2 = 4 possible functions
      expect(result.details).toContain("Found garbling witness");
    });

    it("handles cases with no valid garbling", () => {
      type X = "x1" | "x2";
      type Y = "y";
      
      const xVals: X[] = ["x1", "x2"];
      const yVals: Y[] = ["y"]; // Single output
      
      const f = (_t: string) => d([["x1", 0.5], ["x2", 0.5]]);
      const g = (_t: string) => d([["y", 0.3]]); // Different total mass
      
      const result = testInformativenessComprehensive(
        Prob, ["test"], f, g, xVals, yVals
      );
      
      expect(result.moreInformative).toBe(false);
      expect(result.details).toContain("No garbling witness found");
    });
  });

  describe("Garbling Recovery", () => {
    it("recovers garbling from joint distributions", () => {
      type X = "x1" | "x2";
      type Y = "y1" | "y2";
      
      const xVals: X[] = ["x1", "x2"];
      const yVals: Y[] = ["y1", "y2"];
      
      // Original garbling
      const originalC = (x: X) => x === "x1" ? "y1" : "y2";
      
      // Create some joint distributions using this garbling
      const joints = [
        d([
          [["x1", "y1"], 0.6],
          [["x2", "y2"], 0.4]
        ]),
        d([
          [["x1", "y1"], 0.3],
          [["x2", "y2"], 0.7]
        ])
      ];
      
      const recovered = recoverGarblingFromJoint(xVals, yVals, joints);
      expect(recovered).not.toBeNull();
      
      if (recovered) {
        // Should recover the original garbling
        expect(recovered("x1")).toBe("y1");
        expect(recovered("x2")).toBe("y2");
      }
    });

    it("handles ambiguous cases gracefully", () => {
      type X = "x1" | "x2";
      type Y = "y1" | "y2";
      
      const xVals: X[] = ["x1", "x2"];
      const yVals: Y[] = ["y1", "y2"];
      
      // Ambiguous joint (both x values map to both y values)
      const ambiguousJoint = d([
        [["x1", "y1"], 0.25],
        [["x1", "y2"], 0.25],
        [["x2", "y1"], 0.25],
        [["x2", "y2"], 0.25]
      ]);
      
      const recovered = recoverGarblingFromJoint(xVals, yVals, [ambiguousJoint]);
      expect(recovered).not.toBeNull(); // Should return some function
    });
  });

  describe("Integration with Previous Steps", () => {
    it("informativeness respects deterministic structure", () => {
      // Deterministic experiment should be maximally informative
      const f = (t: string) => d([[t, 1]]); // Perfect observation
      const g = (t: string) => d([["garbled", 1]]); // Complete loss of information
      
      const candidates = [
        (_x: string) => "garbled", // Constant function
        (x: string) => x           // Identity function
      ];
      
      const result = moreInformativeClassic(Prob, ["test"], f, g, candidates);
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        expect(result.c("anything")).toBe("garbled");
      }
    });

    it("garbling construction respects monoidal structure", () => {
      const f = (t: string) => d([["x", 1]]);
      const c = (x: string) => "y";
      
      const joint = jointFromGarbling(Prob, f, c);
      const result = joint("test");
      
      // Should be concentrated on ("x", "y")
      expect(result.w.size).toBe(1);
      
      let foundPair: [string, string] | null = null;
      result.w.forEach((weight, key) => {
        foundPair = key as [string, string];
        expect(weight).toBeCloseTo(1.0);
      });
      
      expect(foundPair).toEqual(["x", "y"]);
    });
  });

  describe("Theoretical Properties", () => {
    it("identity garbling preserves all information", () => {
      const f = (t: string) => d([[`obs_${t}`, 1]]);
      const identity = (x: string) => x;
      
      const result = moreInformativeClassic(Prob, ["a", "b"], f, f, [identity]);
      expect(result.ok).toBe(true);
    });

    it("constant garbling loses all information", () => {
      const f = (t: string) => d([[`distinct_${t}`, 1]]);
      const g = (_t: string) => d([["constant", 1]]);
      const constant = (_x: string) => "constant";
      
      const result = moreInformativeClassic(Prob, ["a", "b"], f, g, [constant]);
      expect(result.ok).toBe(true);
    });

    it("garbling is transitive", () => {
      // f more informative than g, g more informative than h
      // ⇒ f more informative than h (via composition of garblings)
      
      const f = (t: string) => d([[`f_${t}`, 1]]);
      const g = (t: string) => d([[t.length > 1 ? "long" : "short", 1]]);
      const h = (_t: string) => d([["uniform", 1]]);
      
      const c1 = (x: string) => x.startsWith("f_") ? (x.length > 3 ? "long" : "short") : "short";
      const c2 = (_x: string) => "uniform";
      
      // f → g
      const result1 = moreInformativeClassic(Prob, ["a", "bb"], f, g, [c1]);
      expect(result1.ok).toBe(true);
      
      // g → h  
      const result2 = moreInformativeClassic(Prob, ["a", "bb"], g, h, [c2]);
      expect(result2.ok).toBe(true);
      
      // f → h (via composition)
      const c3 = (x: string) => "uniform";
      const result3 = moreInformativeClassic(Prob, ["a", "bb"], f, h, [c3]);
      expect(result3.ok).toBe(true);
    });
  });

  describe("Edge Cases and Robustness", () => {
    it("handles empty candidate sets", () => {
      const f = (t: string) => d([["x", 1]]);
      const g = (t: string) => d([["y", 1]]);
      
      const result = moreInformativeClassic(Prob, ["test"], f, g, []);
      expect(result.ok).toBe(false);
    });

    it("handles single-element domains", () => {
      const f = (_t: string) => d([["singleton", 1]]);
      const g = (_t: string) => d([["result", 1]]);
      const c = (_x: string) => "result";
      
      const result = moreInformativeClassic(Prob, ["test"], f, g, [c]);
      expect(result.ok).toBe(true);
    });

    it("handles probabilistic experiments", () => {
      const f = (t: string) => d([["good", 0.8], ["bad", 0.2]]);
      const g = (t: string) => d([["positive", 0.8], ["negative", 0.2]]);
      const c = (x: string) => x === "good" ? "positive" : "negative";
      
      const result = moreInformativeClassic(Prob, ["test"], f, g, [c]);
      expect(result.ok).toBe(true);
    });
  });

  describe("Function Generation", () => {
    it("generates all possible functions correctly", () => {
      const domain = ["a", "b"];
      const codomain = ["1", "2"];
      
      const functions = generateAllFunctions(domain, codomain);
      expect(functions.length).toBe(4); // 2^2 = 4
      
      // Test that all functions are distinct
      const results = functions.map(f => `${f("a")},${f("b")}`);
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(4);
    });

    it("handles larger domains efficiently", () => {
      const domain = ["a", "b", "c"];
      const codomain = ["1", "2"];
      
      const functions = generateAllFunctions(domain, codomain);
      expect(functions.length).toBe(8); // 2^3 = 8
    });

    it("handles single-element codomains", () => {
      const domain = ["a", "b", "c"];
      const codomain = ["single"];
      
      const functions = generateAllFunctions(domain, codomain);
      expect(functions.length).toBe(1); // Only one constant function
      
      const f = functions[0];
      expect(f("a")).toBe("single");
      expect(f("b")).toBe("single");
      expect(f("c")).toBe("single");
    });
  });

  describe("Performance and Scalability", () => {
    it("handles reasonable-sized search spaces", () => {
      const domain = ["x1", "x2", "x3"];
      const codomain = ["y1", "y2"];
      
      const f = (t: string) => d([["x1", 0.5], ["x2", 0.3], ["x3", 0.2]]);
      const g = (t: string) => d([["y1", 0.8], ["y2", 0.2]]);
      
      const start = Date.now();
      const result = testInformativenessComprehensive(
        Prob, ["test"], f, g, domain, codomain
      );
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should be reasonably fast
      expect(result.totalCandidates).toBe(8); // 2^3 = 8
    });
  });
});