/**
 * LAW: Parametric Distribution Laws (Step 2)
 * 
 * Tests for the new Dist<R,X> type with semiring context,
 * monad operations, and strength σ.
 */

import { describe, it, expect } from "vitest";
import { Prob, BoolRig, MaxPlus, LogProb, GhostRig } from "../../semiring-utils";
import type { Ghost } from "../../semiring-utils";
import type { Dist } from "../../dist";
import { dirac, bind, mass, strength, map, delta, argmaxSamp } from "../../dist";

const diracProb = <X>(x: X) => dirac<number, X>(Prob)(x);
const diracBool = <X>(x: X) => dirac<boolean, X>(BoolRig)(x);
const diracMaxPlus = <X>(x: X) => dirac<number, X>(MaxPlus)(x);
const diracLog = <X>(x: X) => dirac<number, X>(LogProb)(x);
const diracGhost = <X>(x: X) => dirac<Ghost, X>(GhostRig)(x);
const deltaProb = delta<number, string>(Prob);

describe("Dist monad + strength", () => {
  
  describe("Basic Operations", () => {
    it("dirac mass = 1", () => {
      const d = diracProb("x");
      expect(Prob.eq(mass(d), Prob.one)).toBe(true);
    });

    it("bind distributes probabilities", () => {
      const coin = { R: Prob, w: new Map([["H", 0.5], ["T", 0.5]]) };
      const k = (s: string) => s === "H"
        ? { R: Prob, w: new Map([["A", 1]]) }
        : { R: Prob, w: new Map([["B", 1]]) };
      const out = bind(coin, k);
      expect(Prob.eq(mass(out), Prob.one)).toBe(true);
      expect(out.w.get("A")).toBeCloseTo(0.5);
      expect(out.w.get("B")).toBeCloseTo(0.5);
    });

    it("strength builds product", () => {
      const dy: Dist<number, number> = { R: Prob, w: new Map<number, number>([[1, 0.3], [2, 0.7]]) };
      const sigma = strength(Prob)<string, number>;
      const dxy = sigma("x", dy);
      
      // Check that we have the right number of entries
      expect(dxy.w.size).toBe(2);
      
      // Check total mass is preserved
      expect(Prob.eq(mass(dxy), mass(dy))).toBe(true);
      
      // Check individual weights by iterating (since Map keys are by reference)
      let found1 = false, found2 = false;
      for (const [[x, y], weight] of dxy.w.entries()) {
        if (x === "x" && y === 1) {
          expect(weight).toBeCloseTo(0.3);
          found1 = true;
        }
        if (x === "x" && y === 2) {
          expect(weight).toBeCloseTo(0.7);
          found2 = true;
        }
      }
      expect(found1).toBe(true);
      expect(found2).toBe(true);
    });
  });

  describe("Monad Laws", () => {
    it("left identity: return(a) >>= f = f(a)", () => {
      const a = "test";
      const f = (x: string) => ({ R: Prob, w: new Map([[x.length, 0.5], [x.length + 1, 0.5]]) });
      
      const lhs = bind(diracProb(a), f);
      const rhs = f(a);

      expect(lhs.w.size).toBe(rhs.w.size);
      for (const [key, weight] of lhs.w.entries()) {
        expect(rhs.w.get(key)).toBeCloseTo(weight);
      }
    });

    it("right identity: m >>= return = m", () => {
      const m: Dist<number, string> = { R: Prob, w: new Map<string, number>([["a", 0.3], ["b", 0.7]]) };
      const result = bind(m, (x: string) => diracProb(x));

      expect(result.w.size).toBe(m.w.size);
      for (const [key, weight] of result.w.entries()) {
        expect(m.w.get(key)).toBeCloseTo(weight);
      }
    });

    it("associativity: (m >>= f) >>= g = m >>= (x => f(x) >>= g)", () => {
      const m: Dist<number, string> = { R: Prob, w: new Map<string, number>([["x", 1]]) };
      const f = (s: string): Dist<number, string> => ({ R: Prob, w: new Map<string, number>([[s + "1", 0.6], [s + "2", 0.4]]) });
      const g = (s: string): Dist<number, string> => ({ R: Prob, w: new Map<string, number>([[s + "a", 0.8], [s + "b", 0.2]]) });
      
      const lhs = bind(bind(m, f), g);
      const rhs = bind(m, (x: string) => bind(f(x), g));

      expect(lhs.w.size).toBe(rhs.w.size);
      for (const [key, weight] of lhs.w.entries()) {
        const rhsWeight = rhs.w.get(key) ?? 0;
        expect(Math.abs(weight - rhsWeight)).toBeLessThan(1e-10);
      }
    });
  });

  describe("Multiple Semirings", () => {
    it("Boolean semiring operations", () => {
      const d1 = { R: BoolRig, w: new Map([["a", true], ["b", false]]) };
      const d2 = bind(d1, (x) => x === "a"
        ? diracBool(x + "1")
        : diracBool(x + "2"));
      
      expect(d2.w.get("a1")).toBe(true);
      // Note: our implementation now prunes false/zero values, so "b2" shouldn't exist
      expect(d2.w.has("b2")).toBe(false); // false values get pruned
      expect(d2.w.size).toBe(1); // Only "a1" should remain
    });

    it("MaxPlus semiring (Viterbi)", () => {
      const d = { R: MaxPlus, w: new Map([["path1", 5], ["path2", 3], ["path3", 7]]) };
      const cmp = (a: number, b: number) => a - b;
      const best = argmaxSamp(cmp)(d);
      expect(best).toBe("path3"); // highest score
    });

    it("LogProb semiring", () => {
      const d = diracLog(42);
      expect(LogProb.eq(mass(d), LogProb.one)).toBe(true); // mass should be 0 in log space
    });

    it("Ghost semiring", () => {
      const eps = 1 as const; // ε element
      const d = { R: GhostRig, w: new Map([["x", eps], ["y", GhostRig.one]]) };
      const result = bind(d, (x) => diracGhost(x + "_next"));
      
      expect(result.w.get("x_next")).toBe(eps);
      expect(result.w.get("y_next")).toBe(GhostRig.one);
    });
  });

  describe("Functor Laws", () => {
    it("map identity: map(id) = id", () => {
      const d = { R: Prob, w: new Map([["a", 0.3], ["b", 0.7]]) };
      const mapped = map(d, (x: string) => x);
      
      expect(mapped.w.size).toBe(d.w.size);
      mapped.w.forEach((weight, key) => {
        expect(d.w.get(key)).toBeCloseTo(weight);
      });
    });

    it("map composition: map(g ∘ f) = map(g) ∘ map(f)", () => {
      const d = { R: Prob, w: new Map([[1, 0.4], [2, 0.6]]) };
      const f = (x: number) => x * 2;
      const g = (x: number) => x.toString();
      
      const lhs = map(d, (x) => g(f(x)));
      const rhs = map(map(d, f), g);
      
      expect(lhs.w.size).toBe(rhs.w.size);
      lhs.w.forEach((weight, key) => {
        expect(rhs.w.get(key)).toBeCloseTo(weight);
      });
    });
  });

  describe("Strength Properties", () => {
    it("strength is natural", () => {
      const dy: Dist<number, number> = { R: Prob, w: new Map<number, number>([[1, 0.4], [2, 0.6]]) };
      const f = (n: number) => n.toString();
      const sigma = strength(Prob)<string, number>;
      const sigmaStr = strength(Prob)<string, string>;
      
      // strength(x, map(f, dy)) = map(id × f, strength(x, dy))
      const lhs = sigmaStr("x", map(dy, f));
      const rhs = map(sigma("x", dy), ([x, n]: [string, number]) => [x, f(n)] as [string, string]);
      
      expect(lhs.w.size).toBe(rhs.w.size);
      
      // Check by comparing total masses (simpler than key equality)
      expect(Prob.eq(mass(lhs), mass(rhs))).toBe(true);
      
      // Check that both have the expected structure
      let lhsFound1 = false, lhsFound2 = false;
      let rhsFound1 = false, rhsFound2 = false;
      
      for (const [[x, str], weight] of lhs.w.entries()) {
        if (x === "x" && str === "1") { expect(weight).toBeCloseTo(0.4); lhsFound1 = true; }
        if (x === "x" && str === "2") { expect(weight).toBeCloseTo(0.6); lhsFound2 = true; }
      }

      for (const [[x, str], weight] of rhs.w.entries()) {
        if (x === "x" && str === "1") { expect(weight).toBeCloseTo(0.4); rhsFound1 = true; }
        if (x === "x" && str === "2") { expect(weight).toBeCloseTo(0.6); rhsFound2 = true; }
      }
      
      expect(lhsFound1 && lhsFound2 && rhsFound1 && rhsFound2).toBe(true);
    });

    it("strength preserves mass", () => {
      const dy: Dist<number, number> = { R: Prob, w: new Map<number, number>([[1, 0.3], [2, 0.7]]) };
      const sigma = strength(Prob)<string, number>;
      const result = sigma("x", dy);
      
      expect(Prob.eq(mass(result), mass(dy))).toBe(true);
    });
  });

  describe("Affine Law Oracle (5.1)", () => {
    it("mass preservation for affine semirings", () => {
      const dProb = diracProb("test");
      expect(Prob.eq(mass(dProb), Prob.one)).toBe(true);
      expect(Prob.eq(mass(bind(dProb, (x: string) => diracProb(`${x}_bound`))), Prob.one)).toBe(true);

      const dLogProb = diracLog("test");
      expect(LogProb.eq(mass(dLogProb), LogProb.one)).toBe(true);
      expect(LogProb.eq(mass(bind(dLogProb, (x: string) => diracLog(`${x}_bound`))), LogProb.one)).toBe(true);

      const dMaxPlus = diracMaxPlus("test");
      const boundMaxPlus = bind(dMaxPlus, (x: string) => diracMaxPlus(`${x}_bound`));
      const eqMax = MaxPlus.eq ?? ((a: number, b: number) => Math.abs(a - b) < 1e-10);
      expect(eqMax(mass(dMaxPlus), MaxPlus.one)).toBe(true);
      expect(eqMax(mass(boundMaxPlus), MaxPlus.one)).toBe(true);

      const dGhost = diracGhost("test");
      expect(GhostRig.eq(mass(dGhost), GhostRig.one)).toBe(true);
      expect(GhostRig.eq(mass(bind(dGhost, (x: string) => diracGhost(`${x}_bound`))), GhostRig.one)).toBe(true);
    });
  });

  describe("Delta/Samp Round-trips", () => {
    it("samp ∘ delta = id for numeric semirings", () => {
      const cmp = (a: number, b: number) => a - b;
      const samp = argmaxSamp(cmp);
      
      const values = ["a", "b", "c"];
      values.forEach(x => {
        const d = deltaProb(x);
        const recovered = samp(d);
        expect(recovered).toBe(x);
      });
    });
  });
});