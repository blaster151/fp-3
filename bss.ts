// bss.ts — Blackwell–Sherman–Stein (BSS) Equivalence with Barycentric Dilation Search
// Step 13c: Enhanced BSS with actual dilation search, not just equality checking

import type { Dist } from "./dist";
import { standardMeasure, equalDistNum } from "./standard-experiment";
import { sosdFromWitness, Dilation } from "./sosd";

// ===== Helpers to turn posteriors into vectors over Θ =====

function thetaOrder<Θ>(m: Dist<number, Θ>): Θ[] {
  return [...m.w.keys()];
}

function asVec<Θ>(post: Dist<number, Θ>, order: readonly Θ[]): number[] {
  return order.map(th => post.w.get(th) ?? 0);
}

function vecEq(a: number[], b: number[], eps = 1e-12): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > eps) return false;
  return true;
}

function linSolve(A: number[][], b: number[], eps = 1e-12): number[] | null {
  // Tiny Gaussian elimination for k<=3
  const n = A.length, m = A[0].length;
  // Augment
  const M = A.map((row, i) => [...row, b[i]]);
  let r = 0;
  for (let c = 0; c < m && r < n; c++) {
    // Find pivot
    let p = r;
    while (p < n && Math.abs(M[p][c]) <= eps) p++;
    if (p === n) continue;
    [M[r], M[p]] = [M[p], M[r]];
    const piv = M[r][c];
    for (let j = c; j <= m; j++) M[r][j] /= piv;
    for (let i = 0; i < n; i++) if (i !== r) {
      const factor = M[i][c];
      for (let j = c; j <= m; j++) M[i][j] -= factor * M[r][j];
    }
    r++;
  }
  // Read solution (assume square / full rank in our tiny uses)
  const x = new Array(m).fill(0);
  for (let i = 0; i < Math.min(n, m); i++) {
    // Find leading 1
    let lead = M[i].findIndex((v, idx) => idx < m && Math.abs(v - 1) <= eps);
    if (lead >= 0) x[lead] = M[i][m];
  }
  // Quick residual check
  for (let i = 0; i < n; i++) {
    let s = 0; 
    for (let j = 0; j < m; j++) s += A[i][j] * x[j];
    if (Math.abs(s - b[i]) > 1e-8) return null;
  }
  return x;
}

// ===== Barycentric solvers for k = 1, 2, 3 =====

function barycentric2(p: number[], q1: number[], q2: number[], eps = 1e-12): number[] | null {
// Solve p = w*q1 + (1-w)*q2 ⇒ for each coordinate with q1≠q2:
  for (let i = 0; i < p.length; i++) {
    const d = q1[i] - q2[i];
    if (Math.abs(d) > eps) {
      const w = (p[i] - q2[i]) / d;
      if (w >= -1e-12 && w <= 1 + 1e-12) {
        const test = q1.map((_, k) => w * q1[k] + (1 - w) * q2[k]);
        if (vecEq(test, p, 1e-8)) return [Math.max(0, w), Math.max(0, 1 - w)];
      }
    }
  }
  return null;
}

function barycentric3(p: number[], Q: number[][], eps = 1e-12): number[] | null {
  // Solve p = w1*Q1 + w2*Q2 + w3*Q3, w1+w2+w3=1, w>=0.
  // Set w3 = 1 - w1 - w2, reduce to A*[w1,w2]^T = p - Q3.
  const [q1, q2, q3] = Q;
  const A = [q1.map((x, i) => x - q3[i]), q2.map((x, i) => x - q3[i])]; // rows are vectors; transpose
  // Build normal equations for a small stable solve:
  const At = (M: number[][]) => M[0].map((_, j) => M.map(row => row[j]));
  const AT = At(A);
  const ATA = AT.map(r => AT.map((_, j) => r.reduce((s, ri, k) => s + ri * A[j][k], 0)));
  const b = AT.map(r => r.reduce((s, ri, i) => s + ri * (p[i] - q3[i]), 0));
  const w12 = linSolve(ATA, b);
  if (!w12) return null;
  const [w1, w2] = w12;
  const w3 = 1 - w1 - w2;
  const w = [w1, w2, w3];
  if (w.every(x => x >= -1e-8)) {
    const test = q1.map((_, i) => w1 * q1[i] + w2 * q2[i] + w3 * q3[i]);
    if (vecEq(test, p, 1e-6)) return w.map(x => Math.max(0, x));
  }
  return null;
}

// ===== Enumerate small subsets =====

function* combinations<T>(arr: readonly T[], k: number): Generator<T[]> {
  const n = arr.length;
  const idx = Array.from({ length: k }, (_, i) => i);
  const pick = () => idx.map(i => arr[i]);
  if (k === 0 || k > n) return;
  while (true) {
    yield pick();
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

// ===== Build one row T(p) by finding 1-, 2-, or 3-sparse barycentric combos over postsG =====

function rowDilationForPosterior<Θ>(
  p: Dist<number, Θ>,
  postsG: Dist<number, Θ>[],
  order: readonly Θ[]
): Dist<number, Dist<number, Θ>> | null {
  const pv = asVec(p, order);

  // k = 1
  for (const q of postsG) {
    if (equalDistNum(p, q)) {
      return { R: p.R, w: new Map([[q, 1]]) };
    }
  }

  // k = 2
  for (const [q1, q2] of combinations(postsG, 2)) {
    const w = barycentric2(pv, asVec(q1, order), asVec(q2, order));
    if (w) {
      return { R: p.R, w: new Map([[q1, w[0]], [q2, w[1]]]) };
    }
  }

  // k = 3
  for (const [q1, q2, q3] of combinations(postsG, 3)) {
    const w = barycentric3(pv, [asVec(q1, order), asVec(q2, order), asVec(q3, order)]);
    if (w) {
      return { R: p.R, w: new Map([[q1, w[0]], [q2, w[1]], [q3, w[2]]]) };
    }
  }

  return null;
}

// ===== Assemble a full dilation T by solving each row independently =====

function buildDilation<Θ>(
  postsF: Dist<number, Θ>[],
  postsG: Dist<number, Θ>[],
  order: readonly Θ[]
): Dilation<number, Dist<number, Θ>> | null {
  const rowMap = new Map<Dist<number, Θ>, Dist<number, Dist<number, Θ>>>();
  for (const p of postsF) {
    const row = rowDilationForPosterior(p, postsG, order);
    if (!row) return null;
    rowMap.set(p, row);
  }
  // Dilation: return the precomputed row for the input posterior
  return (p) => rowMap.get(p)!;
}

// ===== Apply T# to fHat =====

function pushMeasure<Θ>(
  fHat: Dist<number, Dist<number, Θ>>,
  T: Dilation<number, Dist<number, Θ>>
): Dist<number, Dist<number, Θ>> {
  const R = fHat.R;
  const w = new Map<Dist<number, Θ>, number>();
  fHat.w.forEach((pf, p) => {
    const mix = T(p);
    mix.w.forEach((wq, q) => {
      w.set(q, (w.get(q) ?? 0) + pf * wq);
    });
  });
  return { R, w };
}

// ===== Public API: BSS with barycentric dilation search (k ≤ 3) =====

export type Posterior<Θ> = Dist<number, Θ>;
export type StandardMeasure<Θ> = Dist<number, Posterior<Θ>>;

/**
 * Enhanced BSS compare with barycentric dilation search
 * f ⪰ g iff ∃ dilation T with gHat = T# fHat and e∘T = id
 */
export function bssCompare<
  Θ extends string | number,
  X extends string | number,
  Y extends string | number
>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): boolean {
  const fHat = standardMeasure(m, f, xVals);
  const gHat = standardMeasure(m, g, yVals);
  if (equalDistNum(fHat, gHat)) return true;

  const order = thetaOrder(m);
  const postsF = [...fHat.w.keys()];
  const postsG = [...gHat.w.keys()];

  const T = buildDilation(postsF, postsG, order);
  if (!T) return false;

  const pushed = pushMeasure(fHat, T);
  return equalDistNum(pushed, gHat);
}

// ===== Enhanced BSS Testing Framework =====

/**
 * Test BSS equivalence with detailed dilation analysis
 */
export function testBSSDetailed<
  Θ extends string | number,
  X extends string | number,
  Y extends string | number
>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): {
  fMoreInformative: boolean;
  gMoreInformative: boolean;
  equivalent: boolean;
  dilationFound: boolean;
  details: string;
} {
  const fToG = bssCompare(m, f, g, xVals, yVals);
  const gToF = bssCompare(m, g, f, yVals, xVals);
  
  const equivalent = fToG && gToF;
  const dilationFound = fToG || gToF;
  
  const details = equivalent 
    ? "Experiments are BSS-equivalent (dilations found in both directions)"
    : fToG 
    ? "f is more informative than g (dilation found: f ⪰ g)"
    : gToF
    ? "g is more informative than f (dilation found: g ⪰ f)"
    : "Experiments are BSS-incomparable (no dilations found)";
  
  return {
    fMoreInformative: fToG,
    gMoreInformative: gToF,
    equivalent,
    dilationFound,
    details
  };
}

/**
 * Comprehensive BSS analysis with dilation search details
 */
export function analyzeBSS<
  Θ extends string | number,
  X extends string | number,
  Y extends string | number
>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): {
  standardMeasures: {
    fHat: StandardMeasure<Θ>;
    gHat: StandardMeasure<Θ>;
  };
  bssResult: ReturnType<typeof testBSSDetailed>;
  dilationAnalysis: {
    fHatSupport: number;
    gHatSupport: number;
    searchSpace: string;
  };
} {
  const fHat = standardMeasure(m, f, xVals);
  const gHat = standardMeasure(m, g, yVals);
  const bssResult = testBSSDetailed(m, f, g, xVals, yVals);
  
  return {
    standardMeasures: { fHat, gHat },
    bssResult,
    dilationAnalysis: {
      fHatSupport: fHat.w.size,
      gHatSupport: gHat.w.size,
      searchSpace: `k≤3 barycentric combinations over ${gHat.w.size} posteriors`
    }
  };
}

// ===== Legacy API Compatibility =====

/**
 * Batch test BSS relationships across multiple experiments
 */
export function testBSSMatrix<
  Θ extends string | number,
  X extends string | number
>(
  m: Dist<number, Θ>,
  experiments: Array<{
    name: string;
    f: (θ: Θ) => Dist<number, X>;
  }>,
  xVals: readonly X[]
): Array<Array<{
  from: string;
  to: string;
  moreInformative: boolean;
  dilationFound: boolean;
}>> {
  const results: Array<Array<{
    from: string;
    to: string;
    moreInformative: boolean;
    dilationFound: boolean;
  }>> = [];

  for (let i = 0; i < experiments.length; i++) {
    const row: Array<{
      from: string;
      to: string;
      moreInformative: boolean;
      dilationFound: boolean;
    }> = [];
    for (let j = 0; j < experiments.length; j++) {
      const from = experiments[i];
      const to = experiments[j];
      
      const analysis = testBSSDetailed(m, from.f, to.f, xVals, xVals);
      
      row.push({
        from: from.name,
        to: to.name,
        moreInformative: analysis.fMoreInformative,
        dilationFound: analysis.dilationFound
      });
    }
    results.push(row);
  }
  
  return results;
}

/**
 * Find the most informative experiment with dilation analysis
 */
export function findMostInformative<
  Θ extends string | number,
  X extends string | number
>(
  m: Dist<number, Θ>,
  experiments: Array<{
    name: string;
    f: (θ: Θ) => Dist<number, X>;
  }>,
  xVals: readonly X[]
): {
  mostInformative: string[];
  dilationMatrix: Array<Array<{ from: string; to: string; dilationFound: boolean }>>;
  details: string;
} {
  const matrix = testBSSMatrix(m, experiments, xVals);
  const scores = new Map<string, number>();
  
  // Count how many experiments each one dominates via actual dilations
  for (let i = 0; i < experiments.length; i++) {
    let score = 0;
    for (let j = 0; j < experiments.length; j++) {
      if (matrix[i][j].dilationFound && matrix[i][j].moreInformative) score++;
    }
    scores.set(experiments[i].name, score);
  }
  
  const maxScore = Math.max(...scores.values());
  const mostInformative = [...scores.entries()]
    .filter(([_, score]) => score === maxScore)
    .map(([name, _]) => name);
  
  const dilationMatrix = matrix.map(row => 
    row.map(({ from, to, dilationFound }) => ({ from, to, dilationFound }))
  );
  
  return {
    mostInformative,
    dilationMatrix,
    details: `Found ${mostInformative.length} experiment(s) with max dilation score ${maxScore}/${experiments.length}`
  };
}