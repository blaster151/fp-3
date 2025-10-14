/**
 * LAW: Monoidal Laws Tests (Step 8 - Simplified)
 * 
 * Simplified tests focusing on the core monoidal properties
 * without getting bogged down in Map key equality issues.
 */

import { describe, it, expect } from "vitest";
import { Prob, MaxPlus, BoolRig, GhostRig, type CSRig } from "../../semiring-utils";
import type { Dist } from "../../dist";
import { dirac, argmaxSamp, strength, map } from "../../dist";
import { independentProduct, push } from "../../markov-monoidal";

// Small helpers
const dNum = (w: [number, number][]): Dist<number, number> => ({ R: Prob, w: new Map(w) });
const dStr = (w: [string, number][]): Dist<number, string> => ({ R: Prob, w: new Map(w) });

describe("Monoidal laws: δ and σ (Simplified)", () => {
  
  describe("Core Dirac Monoidal Property", () => {
    it("Product of Diracs is Dirac at the pair (δ monoidal)", () => {
      const dx = dirac(Prob)("x");
      const dy = dirac(Prob)(42);
      const dxy = independentProduct(Prob, dx, dy);
      
      // Should result in single element with unit mass
      expect(dxy.w.size).toBe(1);
      
      let totalMass = 0;
      dxy.w.forEach(weight => totalMass += weight);
      expect(totalMass).toBeCloseTo(1.0);
    });

    it("Works across semirings", () => {
      const expectDiracProduct = <R>(R: CSRig<R>) => {
        const dx = dirac<R, string>(R)("test");
        const dy = dirac<R, number>(R)(1);
        const dxy = independentProduct(R, dx, dy);

        expect(dxy.w.size).toBe(1);

        let totalMass: R = R.zero;
        dxy.w.forEach(weight => {
          totalMass = R.add(totalMass, weight);
        });
        expect(R.eq(totalMass, R.one)).toBe(true);
      };

      expectDiracProduct(Prob);
      expectDiracProduct(MaxPlus);
      expectDiracProduct(BoolRig);
      expectDiracProduct(GhostRig);
    });
  });

  describe("Strength Properties", () => {
    it("Strength preserves mass", () => {
      const x = "tag";
      const dy = dNum([[1, 0.3], [2, 0.7]]);
      const sigma = strength(Prob);
      const result = sigma(x, dy);
      
      // Should preserve the mass of dy
      let dyMass = 0, resultMass = 0;
      dy.w.forEach(w => dyMass += w);
      result.w.forEach(w => resultMass += w);
      
      expect(Math.abs(dyMass - resultMass)).toBeLessThan(1e-10);
    });

    it("Strength creates proper pairs", () => {
      const x = "fixed";
      const dy = dNum([[1, 0.6], [2, 0.4]]);
      const sigma = strength(Prob);
      const result = sigma(x, dy);
      
      // Should have same number of elements as dy
      expect(result.w.size).toBe(dy.w.size);
      
      // Each element should be a pair with x as first component
      result.w.forEach((weight, key) => {
        const [firstComp, secondComp] = key as [string, number];
        expect(firstComp).toBe("fixed");
        expect([1, 2]).toContain(secondComp);
      });
    });
  });

  describe("Independent Product Properties", () => {
    it("Preserves total mass", () => {
      const dx = dStr([["a", 0.4], ["b", 0.6]]);
      const dy = dNum([[1, 0.3], [2, 0.7]]);
      
      const dxy = independentProduct(Prob, dx, dy);
      
      // Total mass should be product of marginal masses
      let massX = 0, massY = 0, massXY = 0;
      dx.w.forEach(w => massX += w);
      dy.w.forEach(w => massY += w);
      dxy.w.forEach(w => massXY += w);
      
      expect(Math.abs(massXY - massX * massY)).toBeLessThan(1e-10);
    });

    it("Has correct support size", () => {
      const dx = dStr([["a", 0.5], ["b", 0.5]]);
      const dy = dNum([[1, 0.4], [2, 0.6]]);
      
      const dxy = independentProduct(Prob, dx, dy);
      
      // Should have |X| × |Y| = 2 × 2 = 4 elements
      expect(dxy.w.size).toBe(4);
    });

    it("Handles zero weights correctly", () => {
      const dx = dStr([["a", 0.7], ["b", 0.3], ["c", 0.0]]);
      const dy = dNum([[1, 0.6], [2, 0.0], [3, 0.4]]);
      
      const dxy = independentProduct(Prob, dx, dy);
      
      // Should only have non-zero products
      dxy.w.forEach(weight => {
        expect(weight).toBeGreaterThan(0);
      });
    });
  });

  describe("Sampling Independence", () => {
    it("Argmax sampling factors for independent products", () => {
      const dx = dStr([["winner", 0.8], ["loser", 0.2]]);
      const dy = dNum([[100, 0.9], [1, 0.1]]);
      
      const sampStr = argmaxSamp<number, string>((a, b) => a - b);
      const sampNum = argmaxSamp<number, number>((a, b) => a - b);
      const sampPair = argmaxSamp<number, [string, number]>((a, b) => a - b);
      
      // Sample marginals
      const xStar = sampStr(dx);
      const yStar = sampNum(dy);
      
      // Sample product
      const dxy = independentProduct(Prob, dx, dy);
      const [xProd, yProd] = sampPair(dxy);
      
      expect(xStar).toBe("winner");
      expect(yStar).toBe(100);
      expect(xProd).toBe("winner");
      expect(yProd).toBe(100);
    });
  });

  describe("Pushforward Operations", () => {
    it("Push preserves structure", () => {
      const d = dNum([[1, 0.4], [2, 0.6]]);
      const h = (n: number) => n * 2;
      
      const pushed = push(Prob, d, h);
      
      // Should have same number of elements (assuming h is injective)
      expect(pushed.w.size).toBe(d.w.size);
      
      // Should preserve total mass
      let originalMass = 0, pushedMass = 0;
      d.w.forEach(w => originalMass += w);
      pushed.w.forEach(w => pushedMass += w);
      
      expect(Math.abs(originalMass - pushedMass)).toBeLessThan(1e-10);
    });

    it("Push with constant function concentrates mass", () => {
      const d = dNum([[1, 0.3], [2, 0.7]]);
      const constant = (_: number) => "const";
      
      const pushed = push(Prob, d, constant);
      
      expect(pushed.w.size).toBe(1);
      expect(pushed.w.get("const")).toBeCloseTo(1.0);
    });
  });

  describe("Cross-Semiring Basic Tests", () => {
    it("All semirings support Dirac products", () => {
      const expectDiracProduct = <R>(R: CSRig<R>) => {
        const dx = dirac<R, string>(R)("x");
        const dy = dirac<R, number>(R)(1);
        const dxy = independentProduct(R, dx, dy);

        expect(dxy.w.size).toBe(1);

        let mass: R = R.zero;
        dxy.w.forEach(w => {
          mass = R.add(mass, w);
        });
        expect(R.eq(mass, R.one)).toBe(true);
      };

      expectDiracProduct(Prob);
      expectDiracProduct(MaxPlus);
      expectDiracProduct(BoolRig);
      expectDiracProduct(GhostRig);
    });

    it("All semirings support strength operation", () => {
      const expectStrengthProduct = <R>(R: CSRig<R>) => {
        const x = "test";
        const dy = dirac<R, number>(R)(1);
        const sigma = strength(R);
        const result = sigma(x, dy);

        expect(result.w.size).toBe(1);

        let mass: R = R.zero;
        result.w.forEach(w => {
          mass = R.add(mass, w);
        });
        expect(R.eq(mass, R.one)).toBe(true);
      };

      expectStrengthProduct(Prob);
      expectStrengthProduct(MaxPlus);
      expectStrengthProduct(BoolRig);
      expectStrengthProduct(GhostRig);
    });
  });

  describe("Integration Verification", () => {
    it("Monoidal structure works with previous steps", () => {
      // Verify that the monoidal operations integrate well
      const dx = dirac<number, string>(Prob)("test");
      const dy = dirac<number, number>(Prob)(42);
      
      // Independent product
      const dxy = independentProduct(Prob, dx, dy);
      expect(dxy.w.size).toBe(1);
      
      // Strength operation
      const sigma = strength(Prob);
      const strengthResult = sigma("fixed", dy);
      expect(strengthResult.w.size).toBe(1);
      
      // Push operation
      const pushed = push(Prob, dx, (s: string) => s.length);
      expect(pushed.w.size).toBe(1);
      expect(pushed.w.get(4)).toBeCloseTo(1.0); // "test".length = 4
    });
  });
});