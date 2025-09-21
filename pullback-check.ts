// pullback-check.ts — Pullback/Faithfulness diagnostics (Step 4: 3.4 + 3.6)
// Executable oracles for the core representability properties

import type { CSRig } from "./semiring-utils";
import type { Dist } from "./dist";

// ===== Utility Functions =====

export function equalDist<R, X>(R: CSRig<R>, a: Dist<R, X>, b: Dist<R, X>): boolean {
  const keys = new Set([...a.w.keys(), ...b.w.keys()]);
  for (const k of keys) {
    const va = a.w.get(k) ?? R.zero;
    const vb = b.w.get(k) ?? R.zero;
    if (!R.eq(va, vb)) return false;
  }
  return true;
}

const isZero = <R>(R: CSRig<R>) => (x: R) => (R.isZero ? R.isZero(x) : R.eq(x, R.zero));

// For Map keys, prefer primitives (string/number/boolean). If you use tuples, ensure stable keys upstream.

// ===== ∇ : PX×PX → P(X×X) (independent product) =====

export function prodPX<R, X>(R: CSRig<R>, px: Dist<R, X>, qx: Dist<R, X>): Dist<R, string> {
  const w = new Map<string, R>();
  px.w.forEach((p, x) => {
    if (isZero(R)(p)) return;
    qx.w.forEach((q, y) => {
      if (isZero(R)(q)) return;
      const k = `${String(x)}|${String(y)}`;
      const cur = w.get(k) ?? R.zero;
      w.set(k, R.add(cur, R.mul(p, q)));
    });
  });
  return { R, w };
}

// ===== Δ : P(X×X) → PX×PX (marginals) =====

export function marginals<R, X>(R: CSRig<R>, pxx: Dist<R, string>): [Dist<R, X>, Dist<R, X>] {
  const w1 = new Map<X, R>();
  const w2 = new Map<X, R>();
  pxx.w.forEach((p, key) => {
    if (isZero(R)(p)) return;
    const bar = key.indexOf("|");
    if (bar < 0) return;
    const x = (key.slice(0, bar) as unknown) as X;
    const y = (key.slice(bar + 1) as unknown) as X;
    w1.set(x, (w1.get(x) ?? R.zero) as R);
    w2.set(y, (w2.get(y) ?? R.zero) as R);
    w1.set(x, R.add(w1.get(x)!, p));
    w2.set(y, R.add(w2.get(y)!, p));
  });
  return [{ R, w: w1 }, { R, w: w2 }];
}

// ===== Checker: Δ ∘ ∇ = id (split mono ⇒ monic) =====

export function checkSplitMono<R, X>(
  R: CSRig<R>,
  samples: Array<Dist<R, X>>
): boolean {
  // Filter out empty distributions
  const nonEmptySamples = samples.filter(d => d.w.size > 0);
  
  // If no non-empty samples, trivially true
  if (nonEmptySamples.length === 0) return true;
  
  // Try all pairs (or a subset) of samples in PX
  for (let i = 0; i < nonEmptySamples.length; i++) {
    for (let j = 0; j < nonEmptySamples.length; j++) {
      const px = nonEmptySamples[i];
      const qx = nonEmptySamples[j];
      const pxx = prodPX(R, px, qx);
      const [px1, qx1] = marginals(R, pxx);
      const ok1 = equalDist(R, px, px1);
      const ok2 = equalDist(R, qx, qx1);
      if (!ok1 || !ok2) return false;
    }
  }
  return true;
}

// ===== δ monic: if δ∘u = δ∘v then u=v (on finite A) =====

export function checkDeltaMonic<R, A, X>(
  R: CSRig<R>,
  Avals: readonly A[],
  u: (a: A) => X,
  v: (a: A) => X
): boolean {
  for (const a of Avals) {
    const ua = u(a);
    const va = v(a);
    // δ∘u = δ∘v ⇔ Dirac(ua) = Dirac(va) ⇔ ua=va
    if (ua !== va) return false;
  }
  return true;
}

// ===== 3.4 Faithfulness suite (practical oracle) =====

export function checkFaithfulness<R, X>(
  R: CSRig<R>,
  PXsamples: Array<Dist<R, X>>,
  Avals: readonly X[]
): { splitMono: boolean; deltaMonic: boolean } {
  const splitMono = checkSplitMono(R, PXsamples);
  const deltaMonic = checkDeltaMonic(
    R,
    Avals,
    (x: X) => x,
    (x: X) => x
  ); // identity vs identity (sanity) – real tests pass varied u,v below
  return { splitMono, deltaMonic };
}

// ===== Enhanced Faithfulness Tests =====

/**
 * Test δ monicity with different functions
 * This provides a more meaningful test than identity vs identity
 */
export function checkDeltaMonicityVaried<R, A, X>(
  R: CSRig<R>,
  Avals: readonly A[],
  testCases: Array<{
    name: string;
    u: (a: A) => X;
    v: (a: A) => X;
    shouldBeEqual: boolean;
  }>
): Array<{ name: string; passed: boolean }> {
  return testCases.map(({ name, u, v, shouldBeEqual }) => {
    const actualEqual = checkDeltaMonic(R, Avals, u, v);
    const passed = actualEqual === shouldBeEqual;
    return { name, passed };
  });
}

// ===== Pullback Square Checker (Foundation for Step 5) =====

/**
 * Check if a pullback square commutes
 * This is preparation for the full (3.8) pullback square with δ
 */
export function checkPullbackSquare<R, A, B, C, D>(
  R: CSRig<R>,
  samples: readonly A[],
  f: (a: A) => B,
  g: (a: A) => C,
  h: (b: B) => D,
  k: (c: C) => D,
  eq: (d1: D, d2: D) => boolean
): boolean {
  for (const a of samples) {
    const b = f(a);
    const c = g(a);
    const d1 = h(b);
    const d2 = k(c);
    if (!eq(d1, d2)) return false;
  }
  return true;
}

// ===== Legacy Support =====

/**
 * Legacy function names for backward compatibility
 * @deprecated Use checkSplitMono instead
 */
export const pullbackSquareHolds = checkSplitMono;

/**
 * Legacy random check function
 * @deprecated Use checkSplitMono with proper samples instead
 */
export function checkPullbackRandom<R, X>(
  R: CSRig<R>,
  finX: { elems: readonly X[] },
  numTests: number
): boolean {
  // Generate random distributions for testing
  const samples: Array<Dist<R, X>> = [];
  
  for (let i = 0; i < Math.min(numTests, 10); i++) {
    const w = new Map<X, R>();
    let totalWeight = R.zero;
    
    // Create a random distribution
    for (const x of finX.elems) {
      if (Math.random() > 0.5) {
        const weight = R.one; // Simplified: just use unit weights
        w.set(x, weight);
        totalWeight = R.add(totalWeight, weight);
      }
    }
    
    // Only add non-empty distributions
    if (!R.eq(totalWeight, R.zero)) {
      samples.push({ R, w });
    }
  }
  
  return samples.length > 0 ? checkSplitMono(R, samples) : true;
}