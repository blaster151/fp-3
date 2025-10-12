// bss.ts — Blackwell–Sherman–Stein (BSS) Equivalence with Barycentric Dilation Search
// Step 13c: Enhanced BSS with actual dilation search, not just equality checking

import type { Dist } from "./dist";
import { standardMeasure, equalDistNum } from "./standard-experiment";
import { sosdFromWitness, type Dilation } from "./sosd";

// ===== Helpers to turn posteriors into vectors over Θ =====

function thetaOrder<Θ>(m: Dist<number, Θ>): Θ[] {
  return [...m.w.keys()];
}

function asVec<Θ>(post: Dist<number, Θ>, order: readonly Θ[]): number[] {
  return order.map(th => post.w.get(th) ?? 0);
}

function vecEq(a: number[], b: number[], eps = 1e-12): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai === undefined || bi === undefined) return false;
    if (Math.abs(ai - bi) > eps) return false;
  }
  return true;
}

function linSolve(A: number[][], b: number[], eps = 1e-12): number[] | null {
  // Tiny Gaussian elimination for k<=3
  const firstRow = A[0];
  if (!firstRow) return null;
  const n = A.length, m = firstRow.length;
  // Augment
  const M = A.map((row, i) => {
    const bi = b[i];
    return bi !== undefined ? [...row, bi] : [...row, 0];
  });
  let r = 0;
  for (let c = 0; c < m && r < n; c++) {
    // Find pivot
    let p = r;
    while (p < n) {
      const Mpc = M[p]?.[c];
      if (Mpc !== undefined && Math.abs(Mpc) > eps) break;
      p++;
    }
    if (p === n) continue;
    const Mr = M[r];
    const Mp = M[p];
    if (!Mr || !Mp) continue;
    [M[r], M[p]] = [Mp, Mr];
    const piv = M[r]?.[c];
    if (piv === undefined) continue;
    for (let j = c; j <= m; j++) {
      const Mrj = M[r]?.[j];
      if (Mrj !== undefined) M[r]![j] = Mrj / piv;
    }
    for (let i = 0; i < n; i++) if (i !== r) {
      const Mi = M[i];
      const factor = Mi?.[c];
      if (factor !== undefined && Mi) {
        for (let j = c; j <= m; j++) {
          const Mij = Mi[j];
          const Mrj = M[r]?.[j];
          if (Mij !== undefined && Mrj !== undefined) {
            Mi[j] = Mij - factor * Mrj;
          }
        }
      }
    }
    r++;
  }
  // Read solution (assume square / full rank in our tiny uses)
  const x = new Array(m).fill(0);
  for (let i = 0; i < Math.min(n, m); i++) {
    const Mi = M[i];
    if (!Mi) continue;
    // Find leading 1
    let lead = Mi.findIndex((v, idx) => idx < m && v !== undefined && Math.abs(v - 1) <= eps);
    const Mim = Mi[m];
    if (lead >= 0 && Mim !== undefined) x[lead] = Mim;
  }
  // Quick residual check
  for (let i = 0; i < n; i++) {
    let s = 0;
    const Ai = A[i];
    const bi = b[i];
    if (!Ai || bi === undefined) continue;
    for (let j = 0; j < m; j++) {
      const Aij = Ai[j];
      const xj = x[j];
      if (Aij !== undefined && xj !== undefined) s += Aij * xj;
    }
    if (Math.abs(s - bi) > 1e-8) return null;
  }
  return x;
}

// ===== Barycentric solvers for k = 1, 2, 3 =====

function barycentric2(p: number[], q1: number[], q2: number[], eps = 1e-12): number[] | null {
// Solve p = w*q1 + (1-w)*q2 ⇒ for each coordinate with q1≠q2:
  for (let i = 0; i < p.length; i++) {
    const q1i = q1[i];
    const q2i = q2[i];
    const pi = p[i];
    if (q1i === undefined || q2i === undefined || pi === undefined) continue;
    const d = q1i - q2i;
    if (Math.abs(d) > eps) {
      const w = (pi - q2i) / d;
      if (w >= -1e-12 && w <= 1 + 1e-12) {
        const test = q1.map((_, k) => {
          const q1k = q1[k];
          const q2k = q2[k];
          return q1k !== undefined && q2k !== undefined ? w * q1k + (1 - w) * q2k : 0;
        });
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
  if (!q1 || !q2 || !q3) return null;
  const A = [
    q1.map((x, i) => {
      const q3i = q3[i];
      return q3i !== undefined ? x - q3i : 0;
    }),
    q2.map((x, i) => {
      const q3i = q3[i];
      return q3i !== undefined ? x - q3i : 0;
    })
  ]; // rows are vectors; transpose
  // Build normal equations for a small stable solve:
  const At = (M: number[][]) => {
    const firstRow = M[0];
    if (!firstRow) return [];
    return firstRow.map((_, j) => M.map(row => {
      const val = row[j];
      return val !== undefined ? val : 0;
    }));
  };
  const AT = At(A);
  const ATA = AT.map(r => AT.map((_, j) => r.reduce((s, ri, k) => {
    const Ajk = A[j]?.[k];
    return Ajk !== undefined ? s + ri * Ajk : s;
  }, 0)));
  const b = AT.map(r => r.reduce((s, ri, i) => {
    const pi = p[i];
    const q3i = q3[i];
    return pi !== undefined && q3i !== undefined ? s + ri * (pi - q3i) : s;
  }, 0));
  const w12 = linSolve(ATA, b);
  if (!w12) return null;
  const [w1, w2] = w12;
  if (w1 === undefined || w2 === undefined) return null;
  const w3 = 1 - w1 - w2;
  const w = [w1, w2, w3];
  if (w.every(x => x !== undefined && x >= -1e-8)) {
    const test = q1.map((_, i) => {
      const q1i = q1[i];
      const q2i = q2[i];
      const q3i = q3[i];
      return q1i !== undefined && q2i !== undefined && q3i !== undefined
        ? w1 * q1i + w2 * q2i + w3 * q3i
        : 0;
    });
    if (vecEq(test, p, 1e-6)) return w.map(x => Math.max(0, x));
  }
  return null;
}

// ===== Enumerate small subsets =====

function* combinations<T>(arr: readonly T[], k: number): Generator<T[]> {
  const n = arr.length;
  const idx = Array.from({ length: k }, (_, i) => i);
  const pick = () => idx.map(i => {
    const val = arr[i];
    return val!; // We know i is in bounds from the algorithm
  });
  if (k === 0 || k > n) return;
  while (true) {
    yield pick();
    let i = k - 1;
    const idxi = idx[i];
    while (i >= 0 && idxi !== undefined && idxi === n - k + i) i--;
    if (i < 0) break;
    const currentIdx = idx[i];
    if (currentIdx !== undefined) {
      idx[i] = currentIdx + 1;
      for (let j = i + 1; j < k; j++) {
        const prevIdx = idx[j - 1];
        if (prevIdx !== undefined) idx[j] = prevIdx + 1;
      }
    }
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
    if (!q1 || !q2) continue;
    const w = barycentric2(pv, asVec(q1, order), asVec(q2, order));
    if (w) {
      const w0 = w[0];
      const w1 = w[1];
      if (w0 !== undefined && w1 !== undefined) {
        return { R: p.R, w: new Map([[q1, w0], [q2, w1]]) };
      }
    }
  }

  // k = 3
  for (const [q1, q2, q3] of combinations(postsG, 3)) {
    if (!q1 || !q2 || !q3) continue;
    const w = barycentric3(pv, [asVec(q1, order), asVec(q2, order), asVec(q3, order)]);
    if (w) {
      const w0 = w[0];
      const w1 = w[1];
      const w2 = w[2];
      if (w0 !== undefined && w1 !== undefined && w2 !== undefined) {
        return { R: p.R, w: new Map([[q1, w0], [q2, w1], [q3, w2]]) };
      }
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
      if (!from || !to) continue;
      
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
    const matrixRow = matrix[i];
    const experiment = experiments[i];
    if (!matrixRow || !experiment) continue;
    for (let j = 0; j < experiments.length; j++) {
      const entry = matrixRow[j];
      if (entry && entry.dilationFound && entry.moreInformative) score++;
    }
    scores.set(experiment.name, score);
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