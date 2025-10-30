// sosd.ts — SOSD & Dilations (Step 11: Section 4)
// Second-order stochastic dominance with runnable, minimal-oracle code

import type { CSRig } from "./semiring-utils";
import type { Dist } from "./dist";
import { bind } from "./dist";

// ===== Core Kleisli push (composition) =====

export function push<R, A, B>(
  R: CSRig<R>,
  d: Dist<R, A>,
  k: (a: A) => Dist<R, B>
): Dist<R, B> {
  const w = new Map<B, R>();
  d.w.forEach((pa, a) => {
    const db = k(a);
    db.w.forEach((pb, b) => {
      const cur = w.get(b) ?? R.zero;
      w.set(b, R.add(cur, R.mul(pa, pb)));
    });
  });
  return { R, w };
}

export function equalDist<R, X>(R: CSRig<R>, a: Dist<R, X>, b: Dist<R, X>): boolean {
  const isZero = R.isZero ?? ((x: R) => R.eq(x, R.zero));

  for (const [k, weight] of a.w) {
    if (!isZero(weight)) {
      const vb = b.w.get(k) ?? R.zero;
      if (isZero(vb) || !R.eq(weight, vb)) {
        return false;
      }
    }
  }

  for (const [k, weight] of b.w) {
    if (!isZero(weight)) {
      const va = a.w.get(k) ?? R.zero;
      if (isZero(va) || !R.eq(va, weight)) {
        return false;
      }
    }
  }

  return true;
}

// ===== Dilation primitives =====

/**
 * A dilation (mean-preserving spread) is a kernel t: A → P A
 * that preserves an evaluation e: P A → A, i.e. e(t(a)) = a.
 */
export type Dilation<R, A> = (a: A) => Dist<R, A>;

/** Check e ∘ t = id (dilation law) */
export function isDilation<R, A>(
  R: CSRig<R>,
  t: Dilation<R, A>,
  e: (d: Dist<R, A>) => A,
  sampleAs: readonly A[]
): boolean {
  for (const a of sampleAs) {
    if (e(t(a)) !== a) return false;
  }
  return true;
}

/**
 * SOSD (second-order stochastic dominance) via dilation witness.
 *
 * Convention here (common in the mean-preserving-spread literature):
 *    p ⪯_SOSD q  iff  ∃ dilation t with  q = t#(p)  and  e∘t = id.
 *
 * If you prefer the opposite direction, pass `direction:"qFromP"` or "pFromQ".
 */
export function sosdFromWitness<R, A>(
  R: CSRig<R>,
  p: Dist<R, A>,
  q: Dist<R, A>,
  e: (d: Dist<R, A>) => A,
  t: Dilation<R, A>,
  sampleAs: readonly A[],
  direction: "qFromP" | "pFromQ" = "qFromP"
): boolean {
  if (!isDilation(R, t, e, sampleAs)) return false;
  if (direction === "qFromP") {
    const q2 = push(R, p, t);
    return equalDist(R, q2, q);
  } else {
    const p2 = push(R, q, t);
    return equalDist(R, p2, p);
  }
}

/**
 * Convenience: expectation-based e for numeric A with real Prob semiring.
 * WARNING: assumes A is number and weights sum to 1.
 */
export function expectation(eps = 1e-12) {
  return (d: Dist<number, number>): number => {
    let num = 0, den = 0;
    d.w.forEach((p, x) => { num += p * x; den += p; });
    if (Math.abs(den - 1) > eps) throw new Error("non-affine Dist in expectation()");
    return num;
  };
}

// ===== Enhanced Dilation Testing =====

/**
 * Test if a kernel is a valid dilation with detailed reporting
 */
export function testDilationDetailed<R, A>(
  R: CSRig<R>,
  t: Dilation<R, A>,
  e: (d: Dist<R, A>) => A,
  sampleAs: readonly A[]
): {
  isDilation: boolean;
  failures: Array<{ input: A; expected: A; actual: A }>;
  details: string;
} {
  const failures: Array<{ input: A; expected: A; actual: A }> = [];
  
  for (const a of sampleAs) {
    const actual = e(t(a));
    if (actual !== a) {
      failures.push({ input: a, expected: a, actual });
    }
  }
  
  const isDilation = failures.length === 0;
  const details = isDilation 
    ? `Valid dilation: e∘t = id on ${sampleAs.length} samples`
    : `Invalid dilation: ${failures.length} failures out of ${sampleAs.length} samples`;
  
  return { isDilation, failures, details };
}

/**
 * Test SOSD relationship with detailed analysis
 */
export function testSOSDDetailed<R, A>(
  R: CSRig<R>,
  p: Dist<R, A>,
  q: Dist<R, A>,
  e: (d: Dist<R, A>) => A,
  t: Dilation<R, A>,
  sampleAs: readonly A[],
  direction: "qFromP" | "pFromQ" = "qFromP"
): {
  validDilation: boolean;
  transformationCorrect: boolean;
  sosdHolds: boolean;
  details: string;
} {
  const dilationTest = testDilationDetailed(R, t, e, sampleAs);
  const validDilation = dilationTest.isDilation;
  
  let transformationCorrect = false;
  if (validDilation) {
    if (direction === "qFromP") {
      const q2 = push(R, p, t);
      transformationCorrect = equalDist(R, q2, q);
    } else {
      const p2 = push(R, q, t);
      transformationCorrect = equalDist(R, p2, p);
    }
  }
  
  const sosdHolds = validDilation && transformationCorrect;
  
  const details = !validDilation 
    ? `SOSD fails: ${dilationTest.details}`
    : !transformationCorrect
    ? `SOSD fails: valid dilation but transformation equation doesn't hold`
    : `SOSD holds: ${direction} via valid dilation`;
  
  return { validDilation, transformationCorrect, sosdHolds, details };
}

// ===== Standard Dilation Constructors =====

/**
 * Identity dilation: t(a) = δ(a)
 */
export function identityDilation<R, A>(R: CSRig<R>): Dilation<R, A> {
  return (a: A) => ({ R, w: new Map([[a, R.one]]) });
}

/**
 * Mean-preserving spread for numeric domains
 * Creates a symmetric spread around the input value
 */
export function symmetricSpread(
  R: CSRig<number>,
  spreadAmount: number
): Dilation<number, number> {
  return (a: number) => {
    const left = a - spreadAmount;
    const right = a + spreadAmount;
    
    // For Prob semiring, use equal weights
    if (R.eq(R.one, 1)) {
      return { R, w: new Map([[left, 0.5], [right, 0.5]]) };
    } else {
      // For other semirings, use unit weights
      return { R, w: new Map([[left, R.one], [right, R.one]]) };
    }
  };
}

/**
 * Create a dilation that spreads a point mass into a uniform distribution
 */
export function uniformSpread<R, A>(
  R: CSRig<R>,
  support: readonly A[]
): Dilation<R, A> {
  return (a: A) => {
    // If input is in support, spread uniformly; otherwise return Dirac
    if (!support.includes(a)) {
      return { R, w: new Map([[a, R.one]]) };
    }
    
    const w = new Map<A, R>();
    for (const x of support) {
      w.set(x, R.one);
    }
    return { R, w };
  };
}

// ===== SOSD Testing Utilities =====

/**
 * Test various SOSD relationships with automatic dilation generation
 */
export function testSOSDRelationships<R, A>(
  R: CSRig<R>,
  distributions: readonly Dist<R, A>[],
  e: (d: Dist<R, A>) => A,
  dilations: readonly Dilation<R, A>[],
  sampleAs: readonly A[]
): Array<{
  pIndex: number;
  qIndex: number;
  dilationIndex: number;
  sosdHolds: boolean;
  direction: "qFromP" | "pFromQ";
  details: string;
}> {
  const results: Array<{
    pIndex: number;
    qIndex: number;
    dilationIndex: number;
    sosdHolds: boolean;
    direction: "qFromP" | "pFromQ";
    details: string;
  }> = [];
  
  for (let i = 0; i < distributions.length; i++) {
    for (let j = 0; j < distributions.length; j++) {
      if (i === j) continue; // Skip self-comparison
      
      for (let k = 0; k < dilations.length; k++) {
        const p = distributions[i];
        const q = distributions[j];
        const t = dilations[k];

        if (p === undefined || q === undefined || t === undefined) {
          continue;
        }

        // Test both directions
        for (const direction of ["qFromP", "pFromQ"] as const) {
          const result = testSOSDDetailed(R, p, q, e, t, sampleAs, direction);
          
          results.push({
            pIndex: i,
            qIndex: j,
            dilationIndex: k,
            sosdHolds: result.sosdHolds,
            direction,
            details: result.details
          });
        }
      }
    }
  }
  
  return results;
}

/**
 * Find all SOSD relationships in a set of distributions
 */
export function findAllSOSDRelationships<R, A>(
  R: CSRig<R>,
  distributions: readonly Dist<R, A>[],
  e: (d: Dist<R, A>) => A,
  dilations: readonly Dilation<R, A>[],
  sampleAs: readonly A[]
): Array<{
  from: number;
  to: number;
  dilation: number;
  direction: "qFromP" | "pFromQ";
}> {
  const relationships = testSOSDRelationships(R, distributions, e, dilations, sampleAs);
  
  return relationships
    .filter(r => r.sosdHolds)
    .map(r => ({
      from: r.pIndex,
      to: r.qIndex,
      dilation: r.dilationIndex,
      direction: r.direction
    }));
}