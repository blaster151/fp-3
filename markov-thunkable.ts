// markov-thunkable.ts — Thunkability ⇔ Determinism (Law ~3.14)
// Executable oracle for thunkable maps and their commuting behavior

import { type CSRig, isNumericRig } from "./semiring-utils";
import type { Dist } from "./dist";
import { dirac as delta, bind } from "./dist";

// ===== Helper Functions =====

// Is the mass on exactly one support point?
export function isDiracAt<R, X>(
  R: CSRig<R>,
  d: Dist<R, X>
): { ok: true; x: X } | { ok: false } {
  const isZero = R.isZero ? R.isZero : (a: R) => R.eq(a, R.zero);
  let count = 0;
  let theX: X | undefined = undefined;
  d.w.forEach((p, x) => {
    if (!isZero(p)) {
      count++;
      if (theX === undefined) theX = x;
    }
  });
  if (count === 1 && theX !== undefined) return { ok: true, x: theX };
  return { ok: false };
}

/** Pushforward of a distribution d on A along a deterministic g: A→B. */
export function pushforward<R, A, B>(
  R: CSRig<R>,
  d: Dist<R, A>,
  g: (a: A) => B
): Dist<R, B> {
  const w = new Map<B, R>();
  d.w.forEach((p, a) => {
    const b = g(a);
    const cur = w.get(b) ?? R.zero;
    w.set(b, R.add(cur, p));
  });
  return { R, w };
}

/** Pf: PX→PY — the Kleisli extension of f: X→PY */
export function liftP<R, A, B>(
  R: CSRig<R>,
  f: (a: A) => Dist<R, B>
): (da: Dist<R, A>) => Dist<R, B> {
  return (da) => bind(da, f);
}

// Distribution equality
export function equalDist<R, X>(R: CSRig<R>, a: Dist<R, X>, b: Dist<R, X>): boolean {
  const keys = new Set([...a.w.keys(), ...b.w.keys()]);
  for (const k of keys) {
    const va = a.w.get(k) ?? R.zero;
    const vb = b.w.get(k) ?? R.zero;
    if (!R.eq(va, vb)) return false;
  }
  return true;
}

// ===== Core: Thunkability Recognizer =====

/**
 * isThunkable ⇔ deterministic:
 * 1) Each f(a) must be Dirac at some b(a).
 * 2) For arbitrary input mixtures d on A, Pf(d) must equal the pushforward of d by b.
 */
export function isThunkable<R, A, B>(
  R: CSRig<R>,
  f: (a: A) => Dist<R, B>,
  sampleAs: readonly A[],
  probeDists: readonly Dist<R, A>[]
): { thunkable: boolean; base?: (a: A) => B } {
  // Try to extract a base map b from Dirac centers
  const baseMap = new Map<A, B>();
  for (const a of sampleAs) {
    const fa = f(a);
    const dir = isDiracAt(R, fa);
    if (!dir.ok) return { thunkable: false };
    baseMap.set(a, dir.x);
  }
  
  const b = (a: A) => {
    const v = baseMap.get(a);
    if (v === undefined) {
      // For new inputs not in our sample, compute f(a) and extract center
      const fa = f(a);
      const dir = isDiracAt(R, fa);
      if (!dir.ok) throw new Error("Function is not thunkable at input");
      return dir.x;
    }
    return v;
  };

  // Check Pf(d) = pushforward(d, b) for supplied probes
  const Pf = liftP(R, f);
  for (const d of probeDists) {
    const lhs = Pf(d);
    const rhs = pushforward(R, d, b);
    if (!equalDist(R, lhs, rhs)) return { thunkable: false };
  }

  return { thunkable: true, base: b };
}

// ===== Enhanced Thunkability Testing =====

/**
 * Generate test distributions for probing thunkability
 */
export function generateProbeDists<R, A>(
  R: CSRig<R>,
  domain: readonly A[]
): Array<Dist<R, A>> {
  if (domain.length === 0) return [];
  
  const probes: Array<Dist<R, A>> = [];
  
  // Add point masses (Dirac distributions)
  for (const a of domain) {
    probes.push(delta(R)(a));
  }
  
  // Add uniform distribution (if domain has multiple elements)
  if (domain.length > 1) {
    const w = new Map<A, R>();
    for (const a of domain) {
      w.set(a, R.one);
    }
    probes.push({ R, w });
  }
  
  // Add some mixed distributions (for numeric semirings)
  if (isNumericRig(R) && domain.length >= 2) {
    // Probability-like semiring
    const w1 = new Map<A, R>();
    const w2 = new Map<A, R>();

    w1.set(domain[0], 0.7);
    w1.set(domain[1], 0.3);
    probes.push({ R, w: w1 });

    if (domain.length >= 3) {
      w2.set(domain[0], 0.2);
      w2.set(domain[1], 0.3);
      w2.set(domain[2], 0.5);
      probes.push({ R, w: w2 });
    }
  }
  
  return probes;
}

/**
 * Comprehensive thunkability test with automatic probe generation
 */
export function checkThunkabilityRobust<R, A, B>(
  R: CSRig<R>,
  f: (a: A) => Dist<R, B>,
  domain: readonly A[]
): {
  thunkable: boolean;
  base?: (a: A) => B;
  details: string;
} {
  const probes = generateProbeDists(R, domain);
  const result = isThunkable(R, f, domain, probes);
  
  if (result.thunkable) {
    return {
      thunkable: true,
      base: result.base,
      details: `Thunkable: passed ${probes.length} probe distributions`
    };
  } else {
    return {
      thunkable: false,
      details: "Not thunkable: either non-Dirac outputs or mixture law failed"
    };
  }
}

/**
 * Test the commuting square property directly
 * This verifies that δ behaves naturally for thunkable maps
 */
export function checkCommutingSquare<R, A, B>(
  R: CSRig<R>,
  f: (a: A) => Dist<R, B>,
  b: (a: A) => B,
  testDists: readonly Dist<R, A>[]
): boolean {
  const Pf = liftP(R, f);
  
  for (const d of testDists) {
    // Left path: d → Pf(d)
    const leftPath = Pf(d);
    
    // Right path: d → pushforward(d, b) 
    const rightPath = pushforward(R, d, b);
    
    if (!equalDist(R, leftPath, rightPath)) {
      return false;
    }
  }
  
  return true;
}

// ===== Utility Functions =====

/**
 * Create a deterministic function from a base function
 */
export function makeDeterministic<R, A, B>(
  R: CSRig<R>,
  base: (a: A) => B
): (a: A) => Dist<R, B> {
  return (a: A) => delta(R)(base(a));
}

/**
 * Test that deterministic functions are thunkable
 */
export function verifyDeterministicIsThunkable<R, A, B>(
  R: CSRig<R>,
  base: (a: A) => B,
  domain: readonly A[]
): boolean {
  const f = makeDeterministic(R, base);
  const probes = generateProbeDists(R, domain);
  const result = isThunkable(R, f, domain, probes);
  
  return result.thunkable && result.base !== undefined;
}

/**
 * Test that non-deterministic functions are not thunkable
 */
export function verifyStochasticNotThunkable<R, A, B>(
  R: CSRig<R>,
  f: (a: A) => Dist<R, B>,
  domain: readonly A[]
): boolean {
  const probes = generateProbeDists(R, domain);
  const result = isThunkable(R, f, domain, probes);
  
  return !result.thunkable;
}