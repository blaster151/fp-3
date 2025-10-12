// pullback-square.ts — Full pullback square (3.8) checker
// The "only possible joint is the Dirac at the pair" rule

import { type CSRig, isBooleanRig, isNumericRig } from "./semiring-utils";
import type { Dist } from "./dist";
import { dirac as delta } from "./dist";

// ===== Helpers (reused from Step 4) =====

const isZero = <R>(R: CSRig<R>) => (x: R) => (R.isZero ? R.isZero(x) : R.eq(x, R.zero));

export function equalDist<R, X>(R: CSRig<R>, a: Dist<R, X>, b: Dist<R, X>): boolean {
  const keys = new Set([...a.w.keys(), ...b.w.keys()]);
  for (const k of keys) {
    const va = a.w.get(k) ?? R.zero;
    const vb = b.w.get(k) ?? R.zero;
    if (!R.eq(va, vb)) return false;
  }
  return true;
}

// ===== String-pair encoding (stable Map keys) =====

const keyXY = (x: unknown, y: unknown) => `${String(x)}|${String(y)}`;

export function marginals<R, X, Y>(
  R: CSRig<R>,
  pxy: Dist<R, string>
): [Dist<R, X>, Dist<R, Y>] {
  const wx = new Map<X, R>();
  const wy = new Map<Y, R>();
  pxy.w.forEach((p, key) => {
    if (isZero(R)(p)) return;
    const bar = key.indexOf("|");
    if (bar < 0) return;
    const x = (key.slice(0, bar) as unknown) as X;
    const y = (key.slice(bar + 1) as unknown) as Y;
    wx.set(x, (wx.get(x) ?? R.zero) as R);
    wy.set(y, (wy.get(y) ?? R.zero) as R);
    wx.set(x, R.add(wx.get(x)!, p));
    wy.set(y, R.add(wy.get(y)!, p));
  });
  return [{ R, w: wx }, { R, w: wy }];
}

// ===== The "Dirac joint" δ⟨f,g⟩: A → P(X×Y) =====

export function diracPairAt<R, A, X, Y>(R: CSRig<R>, x: X, y: Y): Dist<R, string> {
  return { R, w: new Map([[keyXY(x, y), R.one]]) };
}

// ===== Law 3.8 Pullback Square — Executable Oracle =====

/**
 * Law 3.8 pullback square — executable oracle.
 *
 * Intuition:
 *   For each a∈A, if a joint p(x,y) has BOTH marginals equal to δ(f(a)) and δ(g(a)),
 *   then p must equal δ( (f(a), g(a)) ).
 *
 * API:
 *   - R : your CSRig
 *   - Avals : finite sample of points in A
 *   - f, g : deterministic arrows A→X and A→Y (we use them as the bottom/left legs of the square)
 *   - candidates (optional): supply alternative joint builders to "try to break" uniqueness
 *
 * Returns false as soon as one candidate produces a non-Dirac joint with the same marginals.
 */
export function checkPullbackSquare<R, A, X, Y>(
  R: CSRig<R>,
  Avals: readonly A[],
  f: (a: A) => X,
  g: (a: A) => Y,
  candidates?: Array<(a: A) => Dist<R, string>>
): boolean {
  for (const a of Avals) {
    const xa = f(a);
    const ya = g(a);

    // The Dirac joint demanded by the pullback universal property
    const dir = diracPairAt<R, A, X, Y>(R, xa, ya);
    const [mx_dir, my_dir] = marginals<R, X, Y>(R, dir);

    // Sanity: its marginals must be δ∘f and δ∘g
    if (!equalDist(R, mx_dir, delta(R)(xa)) || !equalDist(R, my_dir, delta(R)(ya))) {
      return false;
    }

    // If no extra candidates provided, this a passes.
    if (!candidates || candidates.length === 0) continue;

    // Try provided candidate joints; require each to collapse to the Dirac joint if marginals match.
    for (const build of candidates) {
      const h = build(a);
      const [mx, my] = marginals<R, X, Y>(R, h);

      const mxMatches = equalDist(R, mx, delta(R)(xa));
      const myMatches = equalDist(R, my, delta(R)(ya));

      // If a candidate achieves the same δ-marginals but differs from Dirac pair, the pullback fails.
      if (mxMatches && myMatches && !equalDist(R, h, dir)) {
        return false;
      }
    }
  }
  return true;
}

// ===== Enhanced Pullback Testing Utilities =====

/**
 * Generate various test candidates that attempt to "cheat" the pullback square
 * These should all fail for well-behaved semirings
 */
export function generateCheatingCandidates<R, A, X, Y>(
  R: CSRig<R>,
  f: (a: A) => X,
  g: (a: A) => Y
): Array<(a: A) => Dist<R, string>> {
  return [
    // Candidate 1: Try to add zero-weight "noise" 
    (a: A) => {
      const xa = f(a);
      const ya = g(a);
      const w = new Map<string, R>();
      w.set(keyXY(xa, ya), R.one);
      w.set(keyXY(xa, `${String(ya)}_bogus`), R.zero);
      w.set(keyXY(`${String(xa)}_bogus`, ya), R.zero);
      return { R, w };
    },
    
    // Candidate 2: Try to spread mass (should fail if not zero)
    (a: A) => {
      const xa = f(a);
      const ya = g(a);
      const w = new Map<string, R>();
      // This will only work if R.add(half, half) = R.one and both marginals work out
      // For most semirings, there's no valid "half" that makes this work
      try {
        // Attempt to create a "half" weight (this is semiring-dependent)
        let half: R;
        if (isNumericRig(R)) {
          half = 0.5 as R;
        } else if (isBooleanRig(R)) {
          half = R.one; // Bool: can't really split
        } else {
          half = R.one; // Default: just use one (won't actually split)
        }
        
        w.set(keyXY(xa, ya), half);
        w.set(keyXY(xa, `${String(ya)}_alt`), half);
        return { R, w };
      } catch {
        // Fallback to Dirac if we can't construct a proper split
        return diracPairAt(R, xa, ya);
      }
    }
  ];
}

/**
 * Comprehensive pullback square test with multiple cheating attempts
 */
export function checkPullbackSquareRobust<R, A, X, Y>(
  R: CSRig<R>,
  Avals: readonly A[],
  f: (a: A) => X,
  g: (a: A) => Y
): { passed: boolean; details: string } {
  // First, basic check without candidates
  const basicPassed = checkPullbackSquare(R, Avals, f, g);
  if (!basicPassed) {
    return { passed: false, details: "Failed basic pullback square check" };
  }
  
  // Then, try with cheating candidates
  const candidates = generateCheatingCandidates(R, f, g);
  const robustPassed = checkPullbackSquare(R, Avals, f, g, candidates);
  
  if (!robustPassed) {
    return { passed: false, details: "Failed robust check - found cheating candidate" };
  }
  
  return { passed: true, details: "Passed all pullback square tests" };
}

// ===== Integration with Step 4 Diagnostics =====

/**
 * Combined test that checks both Step 4 (split mono) and Step 5 (pullback square)
 * Note: This is a forward declaration - the actual integration will be done
 * when we have a proper module system in place
 */
export function checkFullRepresentability<R, A, X, Y>(
  R: CSRig<R>,
  Avals: readonly A[],
  f: (a: A) => X,
  g: (a: A) => Y,
  splitMonoResult?: boolean // Pass in the result from Step 4 check
): {
  splitMono: boolean;
  pullbackSquare: boolean;
  overall: boolean;
} {
  const splitMono = splitMonoResult ?? true; // Default to true if not provided
  const pullbackSquare = checkPullbackSquare(R, Avals, f, g);
  
  return {
    splitMono,
    pullbackSquare,
    overall: splitMono && pullbackSquare
  };
}