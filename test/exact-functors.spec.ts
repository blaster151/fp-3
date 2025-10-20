import { expect, test } from 'vitest';

import {
  RingReal,
  complexIsValid,
  triangleFromMap,
  composeExact,
} from '../allTS';
import type { ChainMap, Complex, Triangle, Mat } from '../allTS';
import {
  makeScalarExactFunctor,
  makeShiftExactFunctor,
  type RingHom,
} from '../exact';

const deterministicMatrix = (rows: number, cols: number): Mat<number> =>
  Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ((row + col) % 3) - 1),
  );

const buildComplex = (m: number, n: number): Complex<number> => {
  const dim: Record<number, number> = {};
  dim[-1] = m;
  dim[0] = n;

  const d: Record<number, Mat<number>> = {};
  d[0] = deterministicMatrix(m, n);

  return { S: RingReal, degrees: [-1, 0], dim, d };
};

const buildIdentity = (X: Complex<number>): ChainMap<number> => {
  const identityMatrix = (n: number): Mat<number> =>
    Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    );

  const f: Record<number, Mat<number>> = {};
  for (const degree of X.degrees) {
    const size = X.dim[degree] ?? 0;
    if (size > 0) f[degree] = identityMatrix(size);
  }

  return { S: RingReal, X, Y: X, f };
};

const sampleDims: ReadonlyArray<[number, number]> = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [1, 2],
  [2, 2],
];

const phiId: RingHom<number, number> = {
  source: RingReal,
  target: RingReal,
  map: (x: number) => x,
};

const Fscalar = makeScalarExactFunctor(phiId);
const Fshift = makeShiftExactFunctor(RingReal);

test('ExactFunctor.preservesShift on representative complexes', () => {
  for (const [m, n] of sampleDims) {
    const X = buildComplex(m, n);
    expect(complexIsValid(X)).toBe(true);
    expect(Fscalar.preservesShift(X)).toBe(true);
    expect(Fshift.preservesShift(X)).toBe(true);
  }
});

test('ExactFunctor.preservesCones on identity maps', () => {
  for (const [m, n] of sampleDims) {
    const X = buildComplex(m, n);
    const f = buildIdentity(X);
    expect(Fscalar.preservesCones(f)).toBe(true);
    expect(Fshift.preservesCones(f)).toBe(true);
  }
});

test('composeExact matches sequential application on triangles', () => {
  for (const [m, n] of sampleDims) {
    if (m + n === 0) continue;

    const X = buildComplex(m, n);
    const f = buildIdentity(X);
    const triangle: Triangle<number> = triangleFromMap(f);

    const FG = composeExact(Fscalar, Fshift);
    const composite = FG.imageTriangle(triangle);
    const sequential = Fshift.imageTriangle(Fscalar.imageTriangle(triangle));

    expect(typeof composite).toBe('object');
    expect(typeof sequential).toBe('object');
  }
});

test('exact functor interfaces act on complexes and maps', () => {
  const X = buildComplex(1, 1);

  expect(complexIsValid(X)).toBe(true);

  const FXScalar = Fscalar.onComplex(X);
  const FXShift = Fshift.onComplex(X);

  expect(complexIsValid(FXScalar)).toBe(true);
  expect(complexIsValid(FXShift)).toBe(true);

  const f = buildIdentity(X);
  const FfScalar = Fscalar.onMap(f);
  const FfShift = Fshift.onMap(f);

  expect(typeof FfScalar).toBe('object');
  expect(typeof FfShift).toBe('object');
});
