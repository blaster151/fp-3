// markov-monoidal.ts — Monoidal / Independence laws (Step 8)
// Covers "δ and samp are monoidal" + strength naturality-on-second-arg square

import type { CSRig } from "./semiring-utils";
import type { Dist } from "./dist";
import { dirac, bind, map, strength } from "./dist";
export { independentIndexedProduct, independentInfObj } from "./markov-infinite";

// Stable key for Map (only used if you want string keys elsewhere)
const pair = <X, Y>(x: X, y: Y): [X, Y] => [x, y] as [X, Y];

// ===== Core product of independent distributions =====
// ∇ : PX × PY → P(X×Y)
export function independentProduct<R, X, Y>(
  R: CSRig<R>,
  dx: Dist<R, X>,
  dy: Dist<R, Y>
): Dist<R, [X, Y]> {
  // σ: X ⊗ PY → P(X ⊗ Y), then integrate over X
  // i.e., ∇(dx,dy) = bind(dx, x => strength(R)<X,Y>(x, dy))
  const sigma = strength<R, X, Y>(R);
  return bind(dx, (x) => sigma(x, dy));
}

// ===== Pushforward along deterministic map =====
// P(h) : PZ → PW
export function push<R, Z, W>(
  R: CSRig<R>,
  dz: Dist<R, Z>,
  h: (z: Z) => W
): Dist<R, W> {
  return map(dz, h);
}

// ===== Pushforward on pairs =====
// P(id×h) : P(X×Y) → P(X×Z)
export function pushPairSecond<R, X, Y, Z>(
  R: CSRig<R>,
  dxy: Dist<R, [X, Y]>,
  h: (y: Y) => Z
): Dist<R, [X, Z]> {
  return map(dxy, ([x, y]) => pair(x, h(y)));
}

// P(h×id) : P(X×Y) → P(Z×Y)
export function pushPairFirst<R, X, Y, Z>(
  R: CSRig<R>,
  dxy: Dist<R, [X, Y]>,
  h: (x: X) => Z
): Dist<R, [Z, Y]> {
  return map(dxy, ([x, y]) => pair(h(x), y));
}

// ===== Monoidal Law Checkers =====

/**
 * Check that δ is monoidal: δ(x,y) = ∇(δx, δy)
 * i.e., Dirac at a pair equals the independent product of Diracs
 */
export function checkDiracMonoidal<R, X, Y>(
  R: CSRig<R>,
  testPairs: readonly [X, Y][]
): boolean {
  for (const [x, y] of testPairs) {
    const diracPair = dirac(R)(pair(x, y));
    const diracX = dirac(R)(x);
    const diracY = dirac(R)(y);
    const productDiracs = independentProduct(R, diracX, diracY);
    
    if (!equalDist(R, diracPair, productDiracs)) {
      return false;
    }
  }
  return true;
}

/**
 * Check strength naturality in second argument
 * σ ∘ (id × P h) = P(id×h) ∘ σ
 */
export function checkStrengthNaturality<R, X, Y, Z>(
  R: CSRig<R>,
  x: X,
  dy: Dist<R, Y>,
  h: (y: Y) => Z
): boolean {
  const sigma = strength<R, X, Y>(R);
  const sigmaZ = strength<R, X, Z>(R);
  
  // Left side: σ ∘ (id × P h)
  const left = sigmaZ(x, push(R, dy, h));
  
  // Right side: P(id×h) ∘ σ  
  const right = pushPairSecond(R, sigma(x, dy), h);
  
  return equalDist(R, left, right);
}

/**
 * Check that sampling respects products (sampling is monoidal)
 * For independent product distributions, sampling factors
 */
export function checkSamplingMonoidal<R, X, Y>(
  R: CSRig<R>,
  dx: Dist<R, X>,
  dy: Dist<R, Y>,
  sampX: (d: Dist<R, X>) => X,
  sampY: (d: Dist<R, Y>) => Y,
  sampPair: (d: Dist<R, [X, Y]>) => [X, Y]
): boolean {
  // Sample marginals independently
  const xStar = sampX(dx);
  const yStar = sampY(dy);
  
  // Sample from product
  const dxy = independentProduct(R, dx, dy);
  const [xProd, yProd] = sampPair(dxy);
  
  // Should be equal (for factorized distributions)
  return xStar === xProd && yStar === yProd;
}

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

/**
 * Create a sampler that picks the element with maximum weight
 */
export function createArgmaxSampler<R, X>(
  R: CSRig<R>,
  compare: (a: R, b: R) => number
) {
  return (d: Dist<R, X>): X => {
    let best: { x: X; weight: R } | null = null;
    
    d.w.forEach((weight, x) => {
      if (!best || compare(weight, best.weight) > 0) {
        best = { x, weight };
      }
    });
    
    if (!best) throw new Error("Cannot sample from empty distribution");
    return best.x;
  };
}

// ===== Comprehensive Monoidal Testing =====

/**
 * Test all monoidal laws for a given semiring
 */
export function checkAllMonoidalLaws<R, X, Y, Z>(
  R: CSRig<R>,
  testData: {
    pairs: readonly [X, Y][];
    x: X;
    dy: Dist<R, Y>;
    h: (y: Y) => Z;
    dx: Dist<R, X>;
    sampX: (d: Dist<R, X>) => X;
    sampY: (d: Dist<R, Y>) => Y;
    sampPair: (d: Dist<R, [X, Y]>) => [X, Y];
  }
): {
  diracMonoidal: boolean;
  strengthNaturality: boolean;
  samplingMonoidal: boolean;
  overall: boolean;
} {
  const diracMonoidal = checkDiracMonoidal(R, testData.pairs);
  const strengthNaturality = checkStrengthNaturality(R, testData.x, testData.dy, testData.h);
  const samplingMonoidal = checkSamplingMonoidal(
    R, testData.dx, testData.dy, 
    testData.sampX, testData.sampY, testData.sampPair
  );
  
  return {
    diracMonoidal,
    strengthNaturality,
    samplingMonoidal,
    overall: diracMonoidal && strengthNaturality && samplingMonoidal
  };
}

/**
 * Generate standard test data for monoidal law checking
 */
export function generateMonoidalTestData<R>(
  R: CSRig<R>
): {
  pairs: [string, number][];
  x: string;
  dy: Dist<R, number>;
  h: (y: number) => string;
  dx: Dist<R, string>;
  sampX: (d: Dist<R, string>) => string;
  sampY: (d: Dist<R, number>) => number;
  sampPair: (d: Dist<R, [string, number]>) => [string, number];
} {
  // Create appropriate weights for the semiring
  let weight1: R, weight2: R;
  if (R.eq(R.one, 1 as any)) {
    // Probability-like semiring
    weight1 = 0.3 as any;
    weight2 = 0.7 as any;
  } else if (R.eq(R.one, true as any)) {
    // Boolean semiring
    weight1 = R.one;
    weight2 = R.one;
  } else {
    // Other semirings (MaxPlus, etc.)
    weight1 = R.one;
    weight2 = R.one;
  }
  
  const pairs: [string, number][] = [["a", 1], ["b", 2], ["c", 3]];
  const x = "test";
  const dy: Dist<R, number> = { R, w: new Map([[1, weight1], [2, weight2]]) };
  const h = (y: number) => `num_${y}`;
  const dx: Dist<R, string> = { R, w: new Map([["x", weight1], ["y", weight2]]) };
  
  // Create appropriate samplers
  const compare = (a: R, b: R): number => {
    if (R.eq(R.one, 1 as any)) {
      return (a as any) - (b as any); // Numeric comparison
    } else if (R.eq(R.one, true as any)) {
      return (a as any) ? 1 : 0; // Boolean: true > false
    } else {
      // For other semirings, use a default comparison
      return R.eq(a, b) ? 0 : 1;
    }
  };
  
  const sampX = createArgmaxSampler(R, compare);
  const sampY = createArgmaxSampler(R, compare);
  const sampPair = createArgmaxSampler(R, compare);
  
  return { pairs, x, dy, h, dx, sampX, sampY, sampPair };
}