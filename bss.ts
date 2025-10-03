// bss.ts — Blackwell–Sherman–Stein (BSS) Equivalence with Barycentric Dilation Search
// Step 13c: Enhanced BSS with actual dilation search, not just equality checking

import type { Dist } from "./dist";
import { standardMeasure, equalDistNum } from "./standard-experiment";
import { sosdFromWitness, Dilation } from "./sosd";

const NEG_WEIGHT_TOL = 5e-3;
const MIX_TOL = 3e-3;

// ===== Helpers to turn posteriors into vectors over Θ =====

function thetaOrder<Θ>(m: Dist<number, Θ>): Θ[] {
  return [...m.w.keys()];
}

function asVec<Θ>(post: Dist<number, Θ>, order: readonly Θ[]): number[] {
  return order.map(th => post.w.get(th) ?? 0);
}

function experimentsEqual<
  Θ extends string | number,
  X extends string | number,
  Y extends string | number
>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[],
  eps = MIX_TOL
): boolean {
  const xSet = new Set<X>(xVals);
  const ySet = new Set<Y>(yVals);
  if (xSet.size !== ySet.size) return false;
  for (const x of xSet) {
    if (!ySet.has(x as unknown as Y)) return false;
  }
  for (const θ of m.w.keys()) {
    if (!equalDistNum(f(θ), g(θ) as unknown as Dist<number, X>, eps)) return false;
  }
  return true;
}

function vecEq(a: number[], b: number[], eps = 1e-12): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > eps) return false;
  return true;
}

function linSolve(
  A: number[][] | null | undefined,
  b: number[] | null | undefined,
  eps = 1e-12
): number[] | null {
  // Guard against degenerate inputs that can arise from empty search spaces.
  if (!A || !b || A.length === 0) return null;
  const firstRow = A[0];
  if (!firstRow) return null;

  // Tiny Gaussian elimination for k<=3
  const n = A.length;
  const m = firstRow.length;
  if (m === 0 || b.length < n) return null;

  // Augment
  const M = A.map((row, i) => {
    const rhs = b[i];
    if (rhs === undefined) return [...row, 0];
    return [...row, rhs];
  });
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
      if (w >= -NEG_WEIGHT_TOL && w <= 1 + NEG_WEIGHT_TOL) {
        const test = q1.map((_, k) => w * q1[k] + (1 - w) * q2[k]);
        if (vecEq(test, p, 1e-8)) return [Math.max(0, w), Math.max(0, 1 - w)];
      }
    }
  }
  return null;
}

function barycentric3(p: number[], Q: number[][], eps = 1e-12): number[] | null {
  // Solve p = w1*Q1 + w2*Q2 + w3*Q3 with w1+w2+w3=1 and wi ≥ 0.
  const [q1, q2, q3] = Q;

  // Build the matrix whose columns are q1-q3 and q2-q3.
  // We then solve (q1-q3, q2-q3) * [w1, w2]^T = p - q3 via normal equations.
  const cols: number[][] = p.map((_, i) => [q1[i] - q3[i], q2[i] - q3[i]]);

  // If all columns are ~0, the three posteriors coincide. Check equality directly.
  const hasVariation = cols.some(([a, b]) => Math.abs(a) > eps || Math.abs(b) > eps);
  if (!hasVariation) {
    if (vecEq(p, q1, 1e-8)) return [1, 0, 0];
    if (vecEq(p, q2, 1e-8)) return [0, 1, 0];
    if (vecEq(p, q3, 1e-8)) return [0, 0, 1];
    return null;
  }

  // Compute (B^T B) and (B^T (p - q3)). B has rows given by `cols`.
  const BTB = [
    [0, 0],
    [0, 0]
  ];
  const BTy = [0, 0];
  cols.forEach(([c1, c2], i) => {
    BTB[0][0] += c1 * c1;
    BTB[0][1] += c1 * c2;
    BTB[1][0] += c2 * c1;
    BTB[1][1] += c2 * c2;
    const diff = p[i] - q3[i];
    BTy[0] += c1 * diff;
    BTy[1] += c2 * diff;
  });

  const w12 = linSolve(BTB, BTy);
  if (!w12) return null;
  const [w1, w2] = w12;
  const w3 = 1 - w1 - w2;
  const weights = [w1, w2, w3];

  if (weights.every(w => w >= -NEG_WEIGHT_TOL)) {
    const test = q1.map((_, i) => w1 * q1[i] + w2 * q2[i] + w3 * q3[i]);
    if (vecEq(test, p, 1e-6)) {
      return weights.map(w => (w <= 0 ? 0 : w));
    }
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

function normalizeWeights(weights: number[], eps = 1e-12): number[] | null {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= eps) return null;
  return weights.map(w => w / total);
}

function rowDilationOptions<Θ>(
  p: Dist<number, Θ>,
  posts: Dist<number, Θ>[],
  order: readonly Θ[]
): Dist<number, Dist<number, Θ>>[] {
  const pv = asVec(p, order);
  const options: Dist<number, Dist<number, Θ>>[] = [];
  const seen = new Set<string>();

  const record = (qs: Dist<number, Θ>[], weights: number[]) => {
    const normalized = normalizeWeights(weights);
    if (!normalized) return;
    const entries: Array<[Dist<number, Θ>, number]> = [];
    normalized.forEach((w, i) => {
      if (w > 1e-10) entries.push([qs[i], w]);
    });
    if (entries.length === 0) return;
    // Verify the reconstructed posterior matches within tolerance.
    const approx = order.map((_, idx) =>
      entries.reduce((s, [q, w]) => s + (q.w.get(order[idx]) ?? 0) * w, 0)
    );
    if (!vecEq(approx, pv, MIX_TOL)) return;
    const key = entries
      .map(([q, w]) => `${posts.indexOf(q)}:${w.toFixed(12)}`)
      .join("|");
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ R: p.R, w: new Map(entries) });
  };

  // k = 1
  for (const q of posts) {
    if (equalDistNum(p, q)) {
      record([q], [1]);
    }
  }

  // k = 2
  for (const [q1, q2] of combinations(posts, 2)) {
    const weights = barycentric2(pv, asVec(q1, order), asVec(q2, order));
    if (weights) record([q1, q2], weights);
  }

  // k = 3
  for (const [q1, q2, q3] of combinations(posts, 3)) {
    const weights = barycentric3(pv, [asVec(q1, order), asVec(q2, order), asVec(q3, order)]);
    if (weights) record([q1, q2, q3], weights);
  }

  return options;
}

// ===== Assemble a full dilation T by solving each row independently =====

function buildDilation<Θ>(
  source: StandardMeasure<Θ>,
  target: StandardMeasure<Θ>,
  order: readonly Θ[]
): Dilation<number, Dist<number, Θ>> | null {
  const sourcePosts = [...source.w.keys()];
  const targetPosts = [...target.w.keys()];

  const candidates = sourcePosts.map(p => ({
    post: p,
    rows: rowDilationOptions(p, targetPosts, order)
  }));

  if (candidates.some(c => c.rows.length === 0)) return null;

  const assignment = new Map<Dist<number, Θ>, Dist<number, Dist<number, Θ>>>();

  const search = (idx: number): Dilation<number, Dist<number, Θ>> | null => {
    if (idx === candidates.length) {
      const T: Dilation<number, Dist<number, Θ>> = (p) => assignment.get(p)!;
      const pushed = pushMeasure(source, T);
      return equalDistNum(pushed, target, MIX_TOL) ? T : null;
    }

    const { post, rows } = candidates[idx];
    for (const row of rows) {
      assignment.set(post, row);
      const result = search(idx + 1);
      if (result) return result;
    }
    assignment.delete(post);
    return null;
  };

  return search(0);
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

function aggregateMeasure<Θ>(
  measure: StandardMeasure<Θ>,
  order: readonly Θ[],
  eps = MIX_TOL
): Array<{ vec: number[]; weight: number }> {
  const groups: Array<{ vec: number[]; weight: number }> = [];
  measure.w.forEach((weight, post) => {
    const vec = asVec(post, order);
    const existing = groups.find(group => vecEq(group.vec, vec, eps));
    if (existing) {
      existing.weight += weight;
    } else {
      groups.push({ vec, weight });
    }
  });
  return groups.filter(group => group.weight > eps);
}

function measuresApproximatelyEqual<Θ>(
  a: StandardMeasure<Θ>,
  b: StandardMeasure<Θ>,
  order: readonly Θ[],
  eps = MIX_TOL
): boolean {
  const aggA = aggregateMeasure(a, order, eps);
  const aggB = aggregateMeasure(b, order, eps);
  if (aggA.length !== aggB.length) return false;
  const used = new Array(aggB.length).fill(false);
  for (const groupA of aggA) {
    let match = -1;
    for (let i = 0; i < aggB.length; i++) {
      if (used[i]) continue;
      const groupB = aggB[i];
      if (Math.abs(groupA.weight - groupB.weight) <= eps && vecEq(groupA.vec, groupB.vec, eps)) {
        match = i;
        break;
      }
    }
    if (match === -1) return false;
    used[match] = true;
  }
  return true;
}

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
  const order = thetaOrder(m);
  const fHat = standardMeasure(m, f, xVals);
  const gHat = standardMeasure(m, g, yVals);
  const measuresEqual =
    equalDistNum(fHat, gHat, MIX_TOL) ||
    measuresApproximatelyEqual(fHat, gHat, order, MIX_TOL);
  if (measuresEqual) {
    return experimentsEqual(m, f, g, xVals, yVals, MIX_TOL);
  }

  // Build a dilation from ĝ to f̂. Intuitively, a less informative experiment
  // (g) can be simulated from a more informative one (f) by first running f and
  // then stochastically "forgetting" information. On the standard-measure
  // side, this corresponds to expressing each posterior of g as a barycentric
  // combination of f's posteriors and pushing ĝ forward along that kernel.
  const T = buildDilation(gHat, fHat, order);
  if (!T) return false;

  const pushed = pushMeasure(gHat, T);
  return equalDistNum(pushed, fHat, MIX_TOL);
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
  const order = thetaOrder(m);
  const fHat = standardMeasure(m, f, xVals);
  const gHat = standardMeasure(m, g, yVals);
  const measuresEqual =
    equalDistNum(fHat, gHat, MIX_TOL) ||
    measuresApproximatelyEqual(fHat, gHat, order, MIX_TOL);
  const experimentsMatch = measuresEqual && experimentsEqual(m, f, g, xVals, yVals, MIX_TOL);

  const fToG = experimentsMatch ? true : bssCompare(m, f, g, xVals, yVals);
  const gToF = experimentsMatch ? true : bssCompare(m, g, f, yVals, xVals);

  const equivalent = measuresEqual || (fToG && gToF);
  const dilationFound = measuresEqual || fToG || gToF;

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
    details: `Found ${mostInformative.length} experiment(s) with max score ${maxScore}/${experiments.length} via dilations`
  };
}