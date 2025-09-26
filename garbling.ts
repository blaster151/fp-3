// garbling.ts — Informativeness (garbling) + Standard Experiment/Measure (Step 12)
// Classic informativeness oracle and joint construction from garbling witnesses

import type { CSRig } from "./semiring-utils";
import type { Dist } from "./dist";
import { bind, dirac as delta, map } from "./dist";

// ===== Utilities =====

export function equalDist<R, X>(R: CSRig<R>, a: Dist<R, X>, b: Dist<R, X>): boolean {
  const keys = new Set([...a.w.keys(), ...b.w.keys()]);
  for (const k of keys) {
    const va = a.w.get(k) ?? R.zero;
    const vb = b.w.get(k) ?? R.zero;
    if (!R.eq(va, vb)) return false;
  }
  return true;
}

// Pushforward along a deterministic map X→Y on a distribution over X
export function push<R, X, Y>(R: CSRig<R>, dx: Dist<R, X>, c: (x: X) => Y): Dist<R, Y> {
  const w = new Map<Y, R>();
  dx.w.forEach((p, x) => {
    const y = c(x);
    const cur = w.get(y) ?? R.zero;
    w.set(y, R.add(cur, p));
  });
  return { R, w };
}

// Compose a stochastic kernel f: Θ→PX with deterministic c: X→Y
export function composeDet<R, Θ, X, Y>(
  R: CSRig<R>,
  f: (th: Θ) => Dist<R, X>,
  c: (x: X) => Y
): (th: Θ) => Dist<R, Y> {
  return (th: Θ) => push(R, f(th), c);
}

// ===== Oracle: classic informativeness (prior-independent) =====

// Search over a finite candidate set of functions c: X→Y for a witness s.t. c∘f = g (pointwise by θ).
export function moreInformativeClassic<R, Θ, X, Y>(
  R: CSRig<R>,
  thetaVals: readonly Θ[],
  f: (th: Θ) => Dist<R, X>,
  g: (th: Θ) => Dist<R, Y>,
  cCandidates: readonly ((x: X) => Y)[]
): { ok: true; c: (x: X) => Y } | { ok: false } {
  for (const c of cCandidates) {
    let good = true;
    for (const th of thetaVals) {
      const lhs = composeDet(R, f, c)(th);
      const rhs = g(th);
      if (!equalDist(R, lhs, rhs)) { 
        good = false; 
        break; 
      }
    }
    if (good) return { ok: true, c };
  }
  return { ok: false };
}

// ===== Build a joint from a garbling witness (garbling theorem forward direction) =====

// Given c: X→Y and f: Θ→PX, produce h: Θ→P(X×Y) with marginals f and g=c∘f.
export function jointFromGarbling<R, Θ, X, Y>(
  R: CSRig<R>,
  f: (th: Θ) => Dist<R, X>,
  c: (x: X) => Y
): (th: Θ) => Dist<R, [X, Y]> {
  return (th: Θ) => {
    const w = new Map<[X, Y], R>();
    f(th).w.forEach((px, x) => {
      const y = c(x);
      const cur = w.get([x, y] as [X, Y]) ?? R.zero;
      w.set([x, y] as [X, Y], R.add(cur, px));
    });
    return { R, w };
  };
}

// ===== From joint + sufficiency back to garbling (sketch) =====

// For finite spaces, when h has marginals f,g and (id_X ⊗ del_Y) sufficient, a c exists s.t. g=c∘f.
// In code, for tests you can *recover* c by majority/argmax rule per x when h concentrates mass on a single y per x.
export function recoverGarblingFromJoint<X, Y>(
  xVals: readonly X[],
  yVals: readonly Y[],
  hTheta: Array<Dist<number, [X, Y]>>
): ((x: X) => Y) | null {
  // Aggregate counts for p(y|x) from the batch of θ-instances (only for numeric Prob in tests).
  const table = new Map<X, Map<Y, number>>();
  for (const d of hTheta) {
    d.w.forEach((p, [x, y]) => {
      const row = table.get(x) ?? new Map<Y, number>();
      row.set(y, (row.get(y) ?? 0) + p);
      table.set(x, row);
    });
  }
  
  const c = (x: X) => {
    const row = table.get(x);
    if (!row) return yVals[0];
    let bestY = yVals[0], best = -Infinity;
    for (const y of yVals) {
      const v = row.get(y) ?? 0;
      if (v > best) { 
        best = v; 
        bestY = y; 
      }
    }
    return bestY;
  };
  
  // Sanity: each x should map consistently
  return c;
}

// ===== Enhanced Informativeness Testing =====

/**
 * Test informativeness with detailed analysis
 */
export function testInformativenessDetailed<R, Θ, X, Y>(
  R: CSRig<R>,
  thetaVals: readonly Θ[],
  f: (th: Θ) => Dist<R, X>,
  g: (th: Θ) => Dist<R, Y>,
  cCandidates: readonly ((x: X) => Y)[]
): {
  moreInformative: boolean;
  witness?: (x: X) => Y;
  details: string;
} {
  const result = moreInformativeClassic(R, thetaVals, f, g, cCandidates);
  
  if (result.ok) {
    return {
      moreInformative: true,
      witness: result.c,
      details: `Found garbling witness: f is more informative than g`
    };
  } else {
    return {
      moreInformative: false,
      details: `No garbling witness found: f may not be more informative than g`
    };
  }
}

/**
 * Generate all possible functions from a finite domain to finite codomain
 */
export function generateAllFunctions<X, Y>(
  domain: readonly X[],
  codomain: readonly Y[]
): Array<(x: X) => Y> {
  if (domain.length === 0) return [() => codomain[0]];
  
  const functions: Array<(x: X) => Y> = [];
  
  // Generate all possible mappings (|Y|^|X| total functions)
  const generateMappings = (index: number, currentMapping: Map<X, Y>): void => {
    if (index >= domain.length) {
      // Complete mapping - create function
      const mapping = new Map(currentMapping);
      functions.push((x: X) => mapping.get(x) ?? codomain[0]);
      return;
    }
    
    // Try each possible value for domain[index]
    for (const y of codomain) {
      currentMapping.set(domain[index], y);
      generateMappings(index + 1, currentMapping);
      currentMapping.delete(domain[index]);
    }
  };
  
  generateMappings(0, new Map());
  return functions;
}

/**
 * Comprehensive informativeness test with automatic candidate generation
 */
export function testInformativenessComprehensive<R, Θ, X, Y>(
  R: CSRig<R>,
  thetaVals: readonly Θ[],
  f: (th: Θ) => Dist<R, X>,
  g: (th: Θ) => Dist<R, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): {
  moreInformative: boolean;
  witness?: (x: X) => Y;
  totalCandidates: number;
  details: string;
} {
  const candidates = generateAllFunctions(xVals, yVals);
  const result = testInformativenessDetailed(R, thetaVals, f, g, candidates);
  
  return {
    ...result,
    totalCandidates: candidates.length,
    details: `${result.details} (tested ${candidates.length} candidates)`
  };
}

// ===== Marginal Extraction Utilities =====

/**
 * Extract X-marginal from a joint distribution over [X,Y]
 */
export function marginalX<R, X, Y>(R: CSRig<R>, joint: Dist<R, [X, Y]>): Dist<R, X> {
  const w = new Map<X, R>();
  joint.w.forEach((p, [x, _y]) => {
    const cur = w.get(x) ?? R.zero;
    w.set(x, R.add(cur, p));
  });
  return { R, w };
}

/**
 * Extract Y-marginal from a joint distribution over [X,Y]
 */
export function marginalY<R, X, Y>(R: CSRig<R>, joint: Dist<R, [X, Y]>): Dist<R, Y> {
  const w = new Map<Y, R>();
  joint.w.forEach((p, [_x, y]) => {
    const cur = w.get(y) ?? R.zero;
    w.set(y, R.add(cur, p));
  });
  return { R, w };
}

/**
 * Verify that a joint has the expected marginals
 */
export function verifyJointMarginals<R, Θ, X, Y>(
  R: CSRig<R>,
  thetaVals: readonly Θ[],
  joint: (th: Θ) => Dist<R, [X, Y]>,
  expectedX: (th: Θ) => Dist<R, X>,
  expectedY: (th: Θ) => Dist<R, Y>
): boolean {
  for (const th of thetaVals) {
    const h = joint(th);
    const margX = marginalX(R, h);
    const margY = marginalY(R, h);
    
    if (!equalDist(R, margX, expectedX(th))) return false;
    if (!equalDist(R, margY, expectedY(th))) return false;
  }
  return true;
}