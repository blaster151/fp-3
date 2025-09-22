/**
 * LAW: Semiring Utils Smoke Tests
 * 
 * Quick verification that our centralized semiring instances work correctly.
 * These are the smoke tests from the production drop-in.
 */

import { describe, it, expect } from 'vitest'
import { 
  Prob, MaxPlus, MinPlus, BoolRig, GhostRig, LogProb,
  isEntire, directSum, CSRig 
} from '../../semiring-utils'

describe("semiring-utils smoke tests", () => {
  
  it("Prob basics", () => {
    expect(Prob.add(0.2, 0.3)).toBeCloseTo(0.5);
    expect(Prob.mul(0.2, 0.5)).toBeCloseTo(0.1);
    expect(isEntire(Prob)).toBe(true);
  });

  it("Tropical identities", () => {
    expect(MaxPlus.add(-Infinity, 3)).toBe(3);
    expect(MaxPlus.mul(2, 3)).toBe(5);
    expect(MinPlus.add(+Infinity, 7)).toBe(7);
    expect(MinPlus.mul(2, 3)).toBe(5);
    expect(isEntire(MaxPlus)).toBe(true);
    expect(isEntire(MinPlus)).toBe(true);
  });

  it("Boolean semiring", () => {
    expect(BoolRig.add(false, true)).toBe(true);
    expect(BoolRig.add(true, true)).toBe(true);
    expect(BoolRig.mul(true, false)).toBe(false);
    expect(BoolRig.mul(true, true)).toBe(true);
    expect(isEntire(BoolRig)).toBe(true);
  });

  it("LogProb semiring", () => {
    // logsumexp(-∞, x) = x
    expect(LogProb.add(-Infinity, 2.5)).toBe(2.5);
    // log multiplication is addition
    expect(LogProb.mul(1.0, 2.0)).toBe(3.0);
    expect(isEntire(LogProb)).toBe(true);
  });

  it("GhostRig table", () => {
    const { zero: Z, one: O } = GhostRig;
    // ε is the middle element (1 in our encoding)
    const E = 1 as const;
    
    expect(GhostRig.add(E, O)).toBe(O);  // ε + 1 = 1
    expect(GhostRig.mul(E, E)).toBe(E);  // ε·ε = ε
    expect(GhostRig.mul(E, O)).toBe(E);  // ε·1 = ε
    expect(GhostRig.mul(O, E)).toBe(E);  // 1·ε = ε
    expect(isEntire(GhostRig)).toBe(true);
    
    // Check enumeration
    const elements = GhostRig.enumerate?.();
    expect(elements).toEqual([0, 1, 2]); // [0, ε, 1]
  });

  it("Direct sum has zero divisors", () => {
    const R2 = directSum(Prob);
    // (1,0) · (0,1) = (0,0)
    const a: readonly [number, number] = [1, 0];
    const b: readonly [number, number] = [0, 1];
    const prod = R2.mul(a, b);
    expect(R2.eq(prod, R2.zero)).toBe(true);
    expect(isEntire(R2)).toBe(false);
  });

  it("CSRig interface completeness", () => {
    // Test that all our semirings implement the full interface
    const semirings: CSRig<any>[] = [Prob, BoolRig, MaxPlus, MinPlus, GhostRig, LogProb];
    
    for (const R of semirings) {
      // Basic structure
      expect(R.zero).toBeDefined();
      expect(R.one).toBeDefined();
      expect(typeof R.add).toBe('function');
      expect(typeof R.mul).toBe('function');
      expect(typeof R.eq).toBe('function');
      
      // Identity laws
      expect(R.eq(R.add(R.zero, R.one), R.one)).toBe(true);  // 0 + 1 = 1
      expect(R.eq(R.add(R.one, R.zero), R.one)).toBe(true);  // 1 + 0 = 1
      expect(R.eq(R.mul(R.one, R.one), R.one)).toBe(true);   // 1 * 1 = 1
      
      // Zero laws
      expect(R.eq(R.mul(R.zero, R.one), R.zero)).toBe(true); // 0 * 1 = 0
      expect(R.eq(R.mul(R.one, R.zero), R.zero)).toBe(true); // 1 * 0 = 0
    }
  });

  it("isEntire exhaustive vs algebraic flags", () => {
    // GhostRig: should be provable by exhaustion
    expect(isEntire(GhostRig)).toBe(true);
    
    // Prob: should trust the algebraic flag
    expect(isEntire(Prob)).toBe(true);
    
    // Direct sum: should detect zero divisors
    const R2 = directSum(Prob);
    expect(isEntire(R2)).toBe(false);
    
    // Test with explicit algebraic flag override
    const fakeNonEntire: CSRig<number> = { ...Prob, entire: false };
    expect(isEntire(fakeNonEntire)).toBe(false);
  });

  it("Pretty printing", () => {
    expect(Prob.toString?.(3.14159)).toBe("3.14159");
    expect(BoolRig.toString?.(true)).toBe("⊤");
    expect(BoolRig.toString?.(false)).toBe("⊥");
    expect(MaxPlus.toString?.(-Infinity)).toBe("-∞");
    expect(MinPlus.toString?.(+Infinity)).toBe("+∞");
    expect(GhostRig.toString?.(0)).toBe("0");
    expect(GhostRig.toString?.(1)).toBe("ε");
    expect(GhostRig.toString?.(2)).toBe("1");
  });

  it("Commutativity spot checks", () => {
    // Prob
    expect(Prob.add(0.3, 0.7)).toBeCloseTo(Prob.add(0.7, 0.3));
    expect(Prob.mul(0.3, 0.7)).toBeCloseTo(Prob.mul(0.7, 0.3));
    
    // BoolRig  
    expect(BoolRig.add(true, false)).toBe(BoolRig.add(false, true));
    expect(BoolRig.mul(true, false)).toBe(BoolRig.mul(false, true));
    
    // MaxPlus
    expect(MaxPlus.add(2, 5)).toBe(MaxPlus.add(5, 2));
    expect(MaxPlus.mul(2, 5)).toBe(MaxPlus.mul(5, 2));
    
    // GhostRig
    const E = 1, O = 2;
    expect(GhostRig.add(E, O)).toBe(GhostRig.add(O, E));
    expect(GhostRig.mul(E, O)).toBe(GhostRig.mul(O, E));
  });
});