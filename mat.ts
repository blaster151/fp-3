export type Matrix = ReadonlyArray<ReadonlyArray<number>>;

function assertRectangular(matrix: ReadonlyArray<ReadonlyArray<number>>): void {
  if (matrix.length === 0) {
    return;
  }
  const width = matrix[0].length;
  for (let i = 1; i < matrix.length; i += 1) {
    if (matrix[i].length !== width) {
      throw new Error('Mat: matrix rows must have equal length');
    }
  }
}

export function idMat(n: number): number[][] {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('Mat: identity dimension must be a non-negative integer');
  }
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

export function composeMat(a: Matrix, b: Matrix): number[][] {
  assertRectangular(a);
  assertRectangular(b);
  const m = a.length;
  const n = m === 0 ? 0 : a[0].length;
  const n2 = b.length;
  const p = n2 === 0 ? 0 : b[0].length;
  if (n !== n2) {
    throw new Error('Mat: dimension mismatch for multiplication');
  }
  if (p === 0) {
    return Array.from({ length: m }, () => Array.from({ length: 0 }, () => 0));
  }
  for (let row = 0; row < n2; row += 1) {
    if (b[row].length !== p) {
      throw new Error('Mat: matrix rows must have equal length');
    }
  }
  const result = Array.from({ length: m }, () => Array(p).fill(0));
  for (let i = 0; i < m; i += 1) {
    for (let k = 0; k < n; k += 1) {
      const aik = a[i]?.[k] ?? 0;
      if (aik === 0) continue;
      for (let j = 0; j < p; j += 1) {
        result[i][j] += aik * (b[k]?.[j] ?? 0);
      }
    }
  }
  return result;
}

export const MatCat = {
  obj: (n: number): number => {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error('Mat: object must be a non-negative integer');
    }
    return n;
  },
  id: idMat,
  hom: (m: number, n: number, entries: Matrix): Matrix => {
    if (!Number.isInteger(m) || m < 0 || !Number.isInteger(n) || n < 0) {
      throw new Error('Mat: hom dimensions must be non-negative integers');
    }
    if (entries.length !== m) {
      throw new Error('Mat: row count must match domain dimension');
    }
    assertRectangular(entries);
    if (entries.length === 0) {
      if (n !== 0) {
        throw new Error('Mat: empty matrix must represent 0×0 morphism');
      }
      return entries;
    }
    if (entries[0]?.length !== n) {
      throw new Error('Mat: column count must match codomain dimension');
    }
    return entries;
  },
  compose: composeMat,
};
