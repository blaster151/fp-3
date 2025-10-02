// entirety-check.ts — Entirety oracle (3.6)
// Ties together isEntire helper with pullback checker

import type { CSRig } from "./semiring-utils";
import type { Dist } from "./dist";
import { isEntire } from "./semiring-utils";
import { checkPullbackSquare } from "./pullback-square";

/**
 * Check the 3.6 law: if R is entire (no zero divisors),
 * then the pullback square (3.8) should always hold
 * for deterministic f,g.
 *
 * @param R semiring
 * @param A finite domain to test
 * @param f,g deterministic arrows A→X,Y
 */
export function checkEntirety<R, A, X, Y>(
  R: CSRig<R>,
  A: readonly A[],
  f: (a: A) => X,
  g: (a: A) => Y
): boolean {
  if (isEntire(R)) {
    // Entire rigs must always pass pullback law
    return checkPullbackSquare(R, A, f, g);
  } else {
    // Non-entire rigs may fail, so we don't assert
    return true;
  }
}

/**
 * Enhanced entirety check with detailed reporting
 */
export function checkEntiretyDetailed<R, A, X, Y>(
  R: CSRig<R>,
  A: readonly A[],
  f: (a: A) => X,
  g: (a: A) => Y
): {
  isEntire: boolean;
  pullbackPassed: boolean;
  lawSatisfied: boolean;
  details: string;
} {
  const entirety = isEntire(R);
  const pullbackPassed = checkPullbackSquare(R, A, f, g);
  
  if (entirety) {
    const lawSatisfied = pullbackPassed;
    return {
      isEntire: true,
      pullbackPassed,
      lawSatisfied,
      details: lawSatisfied 
        ? "Entire semiring correctly passes pullback square"
        : "ERROR: Entire semiring failed pullback square (unexpected!)"
    };
  } else {
    return {
      isEntire: false,
      pullbackPassed,
      lawSatisfied: true, // No requirement for non-entire semirings
      details: `Non-entire semiring (pullback ${pullbackPassed ? "passed" : "failed"} - no requirement)`
    };
  }
}

/**
 * Batch test entirety law across multiple semirings
 */
export function checkEntiretyAcrossSemirings<A, X, Y>(
  semirings: Array<{ name: string; R: CSRig<unknown> }>,
  A: readonly A[],
  f: (a: A) => X,
  g: (a: A) => Y
): Array<{
  name: string;
  isEntire: boolean;
  passed: boolean;
  details: string;
}> {
  return semirings.map(({ name, R }) => {
    const result = checkEntiretyDetailed(R, A, f, g);
    return {
      name,
      isEntire: result.isEntire,
      passed: result.lawSatisfied,
      details: result.details
    };
  });
}

/**
 * Predicate: does this semiring satisfy the entirety law?
 * (i.e., if entire then pullback square holds)
 */
export function satisfiesEntiretyLaw<R, A, X, Y>(
  R: CSRig<R>,
  A: readonly A[],
  f: (a: A) => X,
  g: (a: A) => Y
): boolean {
  return checkEntirety(R, A, f, g);
}

/**
 * Find counterexamples to the entirety law
 * (should be empty for well-behaved semirings)
 */
export function findEntiretyCounterexamples<A, X, Y>(
  semirings: Array<{ name: string; R: CSRig<unknown> }>,
  A: readonly A[],
  f: (a: A) => X,
  g: (a: A) => Y
): Array<{ name: string; reason: string }> {
  const counterexamples: Array<{ name: string; reason: string }> = [];
  
  for (const { name, R } of semirings) {
    const result = checkEntiretyDetailed(R, A, f, g);
    
    if (result.isEntire && !result.pullbackPassed) {
      counterexamples.push({
        name,
        reason: "Entire semiring failed pullback square (violates 3.6)"
      });
    }
  }
  
  return counterexamples;
}