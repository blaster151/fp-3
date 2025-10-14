import { eqDist } from "./Dist";
import type { Dist } from "./Dist";
import type { Kernel } from "./Kleisli";
import type { Stoch } from "./Markov";

/** Convert a kernel k : A -> Dist<B> to a row-stochastic matrix using enumerations. */
export function kernelToMatrix<A, B>(
  As: A[],
  Bs: B[],
  eqB: (x: B, y: B) => boolean,
  k: Kernel<A, B>
): Stoch {
  const P: number[][] = As.map((a) => {
    const d = k(a);
    const row = Bs.map(() => 0);
    for (const { x, p } of d) {
      const j = Bs.findIndex((b) => eqB(b, x));
      if (j >= 0) {
        row[j] = (row[j] ?? 0) + p;
      }
    }
    const s = row.reduce((acc, value) => acc + value, 0) || 1;
    return row.map((value) => value / s);
  });
  return P;
}

/** Convert a row-stochastic matrix to a kernel, using enumerations. */
export function matrixToKernel<A, B>(
  As: A[],
  Bs: B[],
  P: Stoch
): Kernel<A, B> {
  const idxA = (a: A) => {
    const i = As.findIndex((x) => x === a);
    if (i < 0) throw new Error("matrixToKernel: a not in enumeration");
    return i;
  };
  return (a: A) => {
    const i = idxA(a);
    const row = P[i];
    if (!row) return Bs.map((b) => ({ x: b, p: 0 })) as Dist<B>;
    return Bs.map((b, j) => ({ x: b, p: row[j] ?? 0 })) as Dist<B>;
  };
}

export function approxEqMatrix(P: Stoch, Q: Stoch, eps = 1e-7): boolean {
  const p0 = P[0];
  const q0 = Q[0];
  if (!p0 || !q0 || P.length !== Q.length || p0.length !== q0.length) return false;
  for (let i = 0; i < P.length; i++) {
    const pRow = P[i];
    const qRow = Q[i];
    if (!pRow || !qRow || pRow.length !== qRow.length) return false;
    for (let j = 0; j < pRow.length; j++) {
      const p = pRow[j];
      const q = qRow[j];
      if (p === undefined || q === undefined) return false;
      if (Math.abs(p - q) > eps) return false;
    }
  }
  return true;
}

/** Pointwise equality of kernels on As using distribution equality over Bs. */
export function kernelsEq<A, B>(
  As: A[],
  eqB: (x: B, y: B) => boolean,
  k1: Kernel<A, B>,
  k2: Kernel<A, B>
): boolean {
  return As.every((a) => eqDist(eqB, k1(a), k2(a)));
}

/** Handy builders for tiny sample kernels. */
export const Samples = {
  // put mass on first B
  pointFirst<A, B>(Bs: B[]): Kernel<A, B> {
    const first = Bs[0];
    if (first === undefined) return () => [] as Dist<B>;
    return (_: A) => [{ x: first, p: 1 }];
  },
  // uniform distribution on Bs
  uniform<A, B>(Bs: B[]): Kernel<A, B> {
    if (Bs.length === 0) return () => [] as Dist<B>;
    const p = 1 / Bs.length;
    return (_: A) => Bs.map((b) => ({ x: b, p }));
  },
  // indexy kernel (when A,B are number-like)
  addOneMod<A extends number, B extends number>(Bs: B[]): Kernel<A, B> {
    const n = Bs.length;
    if (n === 0) return () => [] as Dist<B>;
    return (a: A) => [{ x: Bs[((a + 1) % n) as number] as B, p: 1 }];
  },
};
