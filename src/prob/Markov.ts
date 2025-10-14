/** Finite Markov kernels as row-stochastic matrices P[i][j] >= 0, sum_j P[i][j] = 1. */
const EPS = 1e-9;

export type Stoch = number[][];
export function isRowStochastic(P: Stoch): boolean {
  return P.every(row => {
    const s = row.reduce((a, b) => a + b, 0);
    return row.every(x => x >= -EPS) && Math.abs(s - 1) < 1e-7;
  });
}

export function compose(P: Stoch, Q: Stoch): Stoch {
  const n = P.length, m = Q[0].length, k = Q.length;
  if (P[0].length !== k) throw new Error("compose: inner dims mismatch");
  const R: Stoch = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) for (let t = 0; t < k; t++)
    R[i][j] += P[i][t] * Q[t][j];
  // normalize tiny drift
  for (let i = 0; i < n; i++) {
    const s = R[i].reduce((a, b) => a + b, 0);
    for (let j = 0; j < m; j++) R[i][j] /= s || 1;
  }
  return R;
}

export function idStoch(n: number): Stoch {
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  return I;
}

/** Act on distributions viewed as row vectors: d * P. */
export function push(d: number[], P: Stoch): number[] {
  const n = d.length, m = P[0].length;
  const out = Array(m).fill(0);
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) out[j] += d[i] * P[i][j];
  const s = out.reduce((a, b) => a + b, 0);
  return out.map(x => x / (s || 1));
}
