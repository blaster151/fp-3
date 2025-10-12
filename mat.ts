export type Matrix = ReadonlyArray<ReadonlyArray<number>>;

function assertRectangular(matrix: ReadonlyArray<ReadonlyArray<number>>): void {
  const [firstRow, ...rest] = matrix;
  if (firstRow === undefined) {
    return;
  }
  const width = firstRow.length;
  rest.forEach((row, index) => {
    if (row.length !== width) {
      throw new Error(`Mat: matrix rows must have equal length (row ${index + 2})`);
    }
  });
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
  const firstA = a[0];
  const n = firstA === undefined ? 0 : firstA.length;
  const n2 = b.length;
  const firstB = b[0];
  const p = firstB === undefined ? 0 : firstB.length;
  if (n !== n2) {
    throw new Error('Mat: dimension mismatch for multiplication');
  }
  const result = Array.from({ length: m }, () => Array.from({ length: p }, () => 0));
  for (let i = 0; i < m; i += 1) {
    const rowA = a[i];
    const resultRow = result[i];
    if (rowA === undefined || resultRow === undefined) {
      continue;
    }
    if (rowA.length !== n) {
      throw new Error('Mat: matrix rows must have equal length');
    }
    for (let k = 0; k < n; k += 1) {
      const aik = rowA[k];
      if (aik === undefined || aik === 0) continue;
      const rowB = b[k];
      if (rowB === undefined) {
        throw new Error('Mat: dimension mismatch for multiplication');
      }
      if (rowB.length !== p) {
        throw new Error('Mat: matrix rows must have equal length');
      }
      for (let j = 0; j < p; j += 1) {
        const bkj = rowB[j];
        if (bkj === undefined) {
          throw new Error('Mat: matrix rows must have equal length');
        }
        const current = resultRow[j];
        if (current === undefined) {
          throw new Error('Mat: unexpected column access during multiplication');
        }
        resultRow[j] = current + aik * bkj;
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
    const firstRow = entries[0];
    if (firstRow === undefined) {
      throw new Error('Mat: row count must match domain dimension');
    }
    if (firstRow.length !== n) {
      throw new Error('Mat: column count must match codomain dimension');
    }
    return entries;
  },
  compose: composeMat,
};
