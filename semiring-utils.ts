// semiring-utils.ts — Centralized semiring instances and utilities
import { NumSemiring, normalizeR } from "./semiring-dist";

// ===== Core Dist Type (re-exported from semiring-dist) =====
export type { Dist } from "./semiring-dist";

// ===== Centralized Semiring Instances =====

const defaultEq = (a: number, b: number) => Math.abs(a - b) <= 1e-12;

// Standard probability semiring (ℝ₊, +, ×, 0, 1)
export const Prob: NumSemiring = {
  add: (a,b) => a + b,
  mul: (a,b) => a * b, 
  zero: 0,
  one: 1,
  eq: defaultEq,
  noZeroDivisors: true,
};

// Log-probability semiring (ℝ ∪ {-∞}, logsumexp, +, -∞, 0)
export const LogProb: NumSemiring = {
  add: (a,b) => {
    if (a === -Infinity) return b;
    if (b === -Infinity) return a;
    const m = Math.max(a,b);
    return m + Math.log(Math.exp(a-m) + Math.exp(b-m));
  },
  mul: (a,b) => a + b,
  zero: -Infinity,
  one: 0,
  eq: (a,b) => Math.abs(a - b) <= 1e-12 || (a === -Infinity && b === -Infinity),
  noZeroDivisors: true,
};

// Tropical max-plus semiring (ℝ ∪ {-∞}, max, +, -∞, 0)
export const MaxPlus: NumSemiring = {
  add: (a,b) => Math.max(a,b),
  mul: (a,b) => a + b,
  zero: -Infinity,
  one: 0,
  eq: (a,b) => Math.abs(a - b) <= 1e-12 || (a === -Infinity && b === -Infinity),
  noZeroDivisors: true,
};

// Tropical min-plus semiring (ℝ ∪ {+∞}, min, +, +∞, 0)  
export const MinPlus: NumSemiring = {
  add: (a,b) => Math.min(a,b),
  mul: (a,b) => a + b,
  zero: Infinity,
  one: 0,
  eq: (a,b) => Math.abs(a - b) <= 1e-12 || (a === Infinity && b === Infinity),
  noZeroDivisors: true,
};

// Boolean semiring ({0,1}, ∨, ∧, 0, 1)
export const Bool: NumSemiring = {
  add: (a,b) => (a || b) ? 1 : 0,
  mul: (a,b) => (a && b) ? 1 : 0,
  zero: 0,
  one: 1,
  eq: (a,b) => (a ? 1 : 0) === (b ? 1 : 0),
  noZeroDivisors: true,
};

// Legacy aliases for compatibility
export const RPlus = Prob;
export const TropicalMaxPlus = MaxPlus;
export const BoolRig = Bool;

// ===== Entireness Check =====

/**
 * Check if a semiring is "entire" (no zero divisors, nontrivial)
 * For finite tests, we use a simple structural check
 */
export const isEntire = (R: NumSemiring): boolean => {
  const eq = R.eq ?? defaultEq;
  
  // Must be nontrivial: 0 ≠ 1
  if (eq(R.zero, R.one)) return false;
  
  // For our standard semirings, we know they have no zero divisors
  if (R.noZeroDivisors !== undefined) return R.noZeroDivisors;
  
  // Could add randomized testing here for unknown semirings
  return true;
};

// Generic constructor then normalize appropriately for the chosen semiring
export function fromPairsR<T>(R: NumSemiring, pairs: Array<[T, number]>): Dist<T> {
  const m = new Map<T, number>();
  for (const [x, w] of pairs) m.set(x, (m.get(x) ?? R.zero) + w);
  return normalizeR(R, m);
}

// Friendly wrappers
export const fromProbs   = <T>(pairs: Array<[T, number]>) => fromPairsR(RPlus, pairs);
export const fromLogits  = <T>(pairs: Array<[T, number]>) => fromPairsR(LogProb, pairs);          // weights are log-probs
export const fromScoresMax = <T>(pairs: Array<[T, number]>) => fromPairsR(TropicalMaxPlus, pairs); // weights are arbitrary scores
export function fromBoolSupport<T>(support: Iterable<T>): Dist<T> {
  const m = new Map<T, number>();
  for (const x of support) m.set(x, BoolRig.one);
  return m; // no normalization; require nonempty support at call sites
}

// Read off the "best" key(s) for a distribution under a semiring
export function argBestR<T>(R: NumSemiring, d: Dist<T>): T[] {
  if (R === RPlus) { // pick max probability
    let best = -Infinity, out: T[] = [];
    for (const [x, w] of d) {
      if (w > best) { best = w; out = [x]; }
      else if (w === best) out.push(x);
    }
    return out;
  }
  if (R === LogProb) { // higher log-prob is better
    let best = -Infinity, out: T[] = [];
    for (const [x, w] of d) {
      if (w > best) { best = w; out = [x]; }
      else if (w === best) out.push(x);
    }
    return out;
  }
  if (R === TropicalMaxPlus) { // max score (after normalizeR, the best weight is 0)
    let best = -Infinity, out: T[] = [];
    for (const [x, w] of d) {
      if (w > best) { best = w; out = [x]; }
      else if (w === best) out.push(x);
    }
    return out;
  }
  // Bool: everything with weight 1 is "reachable"
  const out: T[] = [];
  for (const [x, w] of d) if (w !== 0) out.push(x);
  return out;
}