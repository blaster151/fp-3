// as-equality.ts — A.S.-compatibility & Sampling Cancellation (Law 5.15-ish)
// Almost-sure equality test harness and sampling cancellation oracle

import type { CSRig } from "./semiring-utils";
import type { Dist } from "./dist";
import { dirac, bind } from "./dist";

// ===== Almost-Sure Equality Framework =====

/** Compare two distributions pointwise, allowing a null-set mask N ⊆ X. */
export function equalDistAS<R, X>(
  R: CSRig<R>,
  a: Dist<R, X>,
  b: Dist<R, X>,
  nullMask?: (x: X) => boolean // treat points with nullMask(x)=true as "don't care"
): boolean {
  const keys = new Set([...a.w.keys(), ...b.w.keys()]);
  for (const k of keys) {
    if (nullMask && nullMask(k)) continue;
    const va = a.w.get(k) ?? R.zero;
    const vb = b.w.get(k) ?? R.zero;
    if (!R.eq(va, vb)) return false;
  }
  return true;
}

/**
 * Sampling cancellation oracle:
 * Given f#, g#: A→PX (Kleisli), and a "sampler" s: PX→X,
 * if s∘f# = s∘g# (mod null set), then f# = g# (mod null set).
 *
 * For our finite tests, we simulate the 'a.s.' mask by ignoring a user-supplied null set N⊆X.
 */
export function samplingCancellation<R, A, X>(
  R: CSRig<R>,
  Avals: readonly A[],
  fsharp: (a: A) => Dist<R, X>,
  gsharp: (a: A) => Dist<R, X>,
  samp: (d: Dist<R, X>) => X,
  nullMask?: (x: X) => boolean
): boolean {
  // 1) Assume equality of sampled outputs a.s.
  for (const a of Avals) {
    const sx = samp(fsharp(a));
    const sy = samp(gsharp(a));
    // If sampled results differ *on a non-null point*, fail early.
    if (!(nullMask && nullMask(sx)) && !(nullMask && nullMask(sy)) && sx !== sy) {
      return false;
    }
  }
  // 2) Then enforce equality of the underlying distributions a.s.
  for (const a of Avals) {
    const fa = fsharp(a);
    const ga = gsharp(a);
    if (!equalDistAS(R, fa, ga, nullMask)) return false;
  }
  return true;
}

// ===== Enhanced A.S. Testing Utilities =====

/**
 * Check if two Kleisli morphisms are equal almost-surely
 */
export function equalKleisliAS<R, A, X>(
  R: CSRig<R>,
  Avals: readonly A[],
  f: (a: A) => Dist<R, X>,
  g: (a: A) => Dist<R, X>,
  nullMask?: (x: X) => boolean
): boolean {
  for (const a of Avals) {
    const fa = f(a);
    const ga = g(a);
    if (!equalDistAS(R, fa, ga, nullMask)) return false;
  }
  return true;
}

/**
 * Test sampling cancellation with detailed reporting
 */
export function testSamplingCancellationDetailed<R, A, X>(
  R: CSRig<R>,
  Avals: readonly A[],
  fsharp: (a: A) => Dist<R, X>,
  gsharp: (a: A) => Dist<R, X>,
  samp: (d: Dist<R, X>) => X,
  nullMask?: (x: X) => boolean
): {
  samplingEqual: boolean;
  distributionsEqual: boolean;
  cancellationHolds: boolean;
  details: string;
} {
  // Check if sampling is equal
  let samplingEqual = true;
  let samplingDetails: string[] = [];
  
  for (const a of Avals) {
    const sx = samp(fsharp(a));
    const sy = samp(gsharp(a));
    
    const sxIsNull = nullMask && nullMask(sx);
    const syIsNull = nullMask && nullMask(sy);
    
    if (!sxIsNull && !syIsNull && sx !== sy) {
      samplingEqual = false;
      samplingDetails.push(`Input ${a}: samp(f#) = ${sx}, samp(g#) = ${sy}`);
    }
  }
  
  // Check if distributions are equal a.s.
  const distributionsEqual = equalKleisliAS(R, Avals, fsharp, gsharp, nullMask);
  
  // Sampling cancellation: sampling equal ⇒ distributions equal
  const cancellationHolds = !samplingEqual || distributionsEqual;
  
  const details = samplingEqual 
    ? (distributionsEqual 
        ? "Sampling equal and distributions equal a.s. - cancellation holds"
        : "Sampling equal but distributions differ a.s. - cancellation FAILS")
    : "Sampling differs - no cancellation requirement";
  
  return {
    samplingEqual,
    distributionsEqual,
    cancellationHolds,
    details
  };
}

/**
 * Create a null mask that treats specific values as null
 */
export function createNullMask<X>(nullValues: readonly X[]): (x: X) => boolean {
  const nullSet = new Set(nullValues);
  return (x: X) => nullSet.has(x);
}

/**
 * Test if a semiring supports meaningful a.s. equality
 * (i.e., has enough structure to distinguish "null" from "non-null" events)
 */
export function supportsASEquality<R>(R: CSRig<R>): boolean {
  // For our purposes, all semirings support a.s. equality
  // The question is whether sampling cancellation holds
  return true;
}

// ===== Counterexample Construction Utilities =====

/**
 * Helper to construct distributions that differ in "invisible" weights
 * These are useful for testing sampling cancellation failures
 */
export function createInvisibleDifference<R, X>(
  R: CSRig<R>,
  baseSupport: X,
  invisibleSupport: X,
  baseWeight: R,
  invisibleWeight: R
): {
  withInvisible: Dist<R, X>;
  withoutInvisible: Dist<R, X>;
} {
  const withInvisible = {
    R,
    w: new Map([[baseSupport, baseWeight], [invisibleSupport, invisibleWeight]])
  };
  
  const withoutInvisible = {
    R,
    w: new Map([[baseSupport, baseWeight]])
  };
  
  return { withInvisible, withoutInvisible };
}

/**
 * Test framework for a.s.-compatibility of a semiring
 */
export function testASCompatibility<R, X>(
  R: CSRig<R>,
  testCases: Array<{
    name: string;
    dist1: Dist<R, X>;
    dist2: Dist<R, X>;
    samp: (d: Dist<R, X>) => X;
    nullMask?: (x: X) => boolean;
    expectCancellation: boolean;
  }>
): Array<{
  name: string;
  passed: boolean;
  details: string;
}> {
  return testCases.map(({ name, dist1, dist2, samp, nullMask, expectCancellation }) => {
    const A = ["test"]; // Single test input
    const f = (_: string) => dist1;
    const g = (_: string) => dist2;
    
    const result = testSamplingCancellationDetailed(R, A, f, g, samp, nullMask);
    const passed = result.cancellationHolds === expectCancellation;
    
    return {
      name,
      passed,
      details: result.details
    };
  });
}