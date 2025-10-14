/** Finite Markov kernels as row-stochastic matrices P[i][j] >= 0, sum_j P[i][j] = 1. */
const EPS = 1e-9;

export type Stoch = number[][];
export function isRowStochastic(P: Stoch): boolean {
  return P.every(row => {
    const s = row.reduce((a, b) => a + b, 0);
    return row.every(x => x >= -EPS) && Math.abs(s - 1) < 1e-7;
  });
}

const requireRow = (matrix: Stoch, index: number, context: string): number[] => {
  const row = matrix[index];
  if (!row) {
    throw new Error(`${context}: missing row ${index}`);
  }
  return row;
};

export function compose(P: Stoch, Q: Stoch): Stoch {
  const n = P.length;
  const k = Q.length;
  const firstRowQ = Q[0];
  if (!firstRowQ) {
    throw new Error('compose: right kernel must have at least one row');
  }
  const m = firstRowQ.length;
  const firstRowP = P[0];
  if (!firstRowP) {
    throw new Error('compose: left kernel must have at least one row');
  }
  if (firstRowP.length !== k) {
    throw new Error('compose: inner dims mismatch');
  }
  const R: Stoch = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    const rowP = requireRow(P, i, 'compose');
    const rowR = requireRow(R, i, 'compose result');
    for (let j = 0; j < m; j++) {
      let acc = 0;
      for (let t = 0; t < k; t++) {
        const rowQ = requireRow(Q, t, 'compose');
        const left = rowP[t] ?? 0;
        const right = rowQ[j] ?? 0;
        acc += left * right;
      }
      rowR[j] = acc;
    }
  }
  // normalize tiny drift
  for (let i = 0; i < n; i++) {
    const row = requireRow(R, i, 'compose');
    const s = row.reduce((a, b) => a + b, 0);
    const denom = s || 1;
    for (let j = 0; j < m; j++) {
      row[j] = (row[j] ?? 0) / denom;
    }
  }
  return R;
}

export function idStoch(n: number): Stoch {
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  return I;
}

/** Act on distributions viewed as row vectors: d * P. */
export function push(d: number[], P: Stoch): number[] {
  const firstRow = P[0];
  if (!firstRow) {
    throw new Error('push: kernel must have at least one row');
  }
  const n = d.length;
  const m = firstRow.length;
  const out = Array(m).fill(0);
  for (let j = 0; j < m; j++) {
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const row = requireRow(P, i, 'push');
      const weight = row[j] ?? 0;
      acc += (d[i] ?? 0) * weight;
    }
    out[j] = acc;
  }
  const s = out.reduce((a, b) => a + b, 0);
  return out.map(x => x / (s || 1));
}
