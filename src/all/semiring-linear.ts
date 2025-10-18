// =====================================================================
// Semirings and linear-algebra primitives
//   - Semiring / Ring interfaces
//   - Common semiring instances
//   - Matrix and vector helpers parameterized by a Semiring
// =====================================================================

import { eqStrict } from "../../stdlib/eq"

export type { Vec } from "./semiring-matrix"
export { vecMat, matVec, powMat } from "./semiring-matrix"

export type Semiring<R> = {
  readonly zero: R
  readonly one: R
  readonly add: (x: R, y: R) => R
  readonly mul: (x: R, y: R) => R
  readonly eq?: (x: R, y: R) => boolean
}

export const SemiringNat: Semiring<number> = {
  zero: 0,
  one: 1,
  add: (x, y) => x + y,
  mul: (x, y) => x * y,
  eq: (x, y) => x === y,
}

// -------------------------------------------------------------
// Handy semirings
// -------------------------------------------------------------
export const SemiringMinPlus: Semiring<number> = {
  add: (a, b) => Math.min(a, b),
  zero: Number.POSITIVE_INFINITY,
  mul: (a, b) => a + b,
  one: 0,
  eq: eqStrict<number>(),
}

export const SemiringMaxPlus: Semiring<number> = {
  add: (a, b) => Math.max(a, b),
  zero: Number.NEGATIVE_INFINITY,
  mul: (a, b) => a + b,
  one: 0,
  eq: eqStrict<number>(),
}

// Boolean reachability (∨ for add, ∧ for mul)
export const SemiringBoolOrAnd: Semiring<boolean> = {
  add: (a, b) => a || b,
  zero: false,
  mul: (a, b) => a && b,
  one: true,
  eq: eqStrict<boolean>(),
}

// Probability semiring (standard +, ×)
export const SemiringProb: Semiring<number> = {
  add: (a, b) => a + b,
  zero: 0,
  mul: (a, b) => a * b,
  one: 1,
  eq: eqStrict<number>(),
}

// ---------- Ring (Semiring + additive inverses) ----------
export interface Ring<R> extends Semiring<R> {
  neg: (a: R) => R
  sub: (a: R, b: R) => R
}

// A concrete ring over number
export const RingReal: Ring<number> = {
  add: (a, b) => a + b,
  zero: 0,
  mul: (a, b) => a * b,
  one: 1,
  eq: eqStrict<number>(),
  neg: a => -a,
  sub: (a, b) => a - b,
}

export type Mat<R> = R[][] // rows x cols

// Identity matrix
export const eye = <R>(S: Semiring<R>) => (n: number): Mat<R> => {
  const result: R[][] = []
  for (let i = 0; i < n; i++) {
    const row: R[] = []
    for (let j = 0; j < n; j++) {
      row.push(i === j ? S.one : S.zero)
    }
    result.push(row)
  }
  return result
}

// Matrix multiplication
export const matMul = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): Mat<R> => {
  const m = A.length
  const k = B.length
  const n = B[0]?.length ?? 0

  const colsA = (() => {
    for (const row of A) {
      if (row) return row.length
    }
    return 0
  })()

  if (colsA !== k) {
    const zeroRowCase = m === 0 && colsA === 0
    const zeroColCase = colsA === 0 && k === 0
    if (!zeroRowCase && !zeroColCase) throw new Error('matMul: incompatible dimensions')
  }

  const result: R[][] = []
  for (let i = 0; i < m; i++) {
    const row: R[] = []
    for (let j = 0; j < n; j++) {
      let sum = S.zero
      for (let p = 0; p < k; p++) {
        sum = S.add(sum, S.mul(A[i]![p]!, B[p]![j]!))
      }
      row.push(sum)
    }
    result.push(row)
  }
  return result
}

// Kronecker product
export const kron = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): Mat<R> => {
  const mA = A.length
  const nA = A[0]?.length ?? 0
  const mB = B.length
  const nB = B[0]?.length ?? 0

  const result: R[][] = []
  for (let i = 0; i < mA * mB; i++) {
    const row: R[] = []
    for (let j = 0; j < nA * nB; j++) {
      const iA = Math.floor(i / mB)
      const iB = i % mB
      const jA = Math.floor(j / nB)
      const jB = j % nB
      const aVal = A[iA]?.[jA] ?? S.zero
      const bVal = B[iB]?.[jB] ?? S.zero
      row.push(S.mul(aVal, bVal))
    }
    result.push(row)
  }
  return result
}

// Matrix equality
export const eqMat = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): boolean => {
  const eq = S.eq ?? ((x: R, y: R) => Object.is(x, y))
  if (A.length !== B.length) return false
  if (A[0]?.length !== B[0]?.length) return false

  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < (A[0]?.length ?? 0); j++) {
      const aVal = A[i]?.[j]
      const bVal = B[i]?.[j]
      if (aVal === undefined || bVal === undefined || !eq(aVal, bVal)) {
        return false
      }
    }
  }
  return true
}

// finite Kleene star up to L: I ⊕ A ⊕ A^2 ⊕ ... ⊕ A^L
export const closureUpTo =
  <R>(S: Semiring<R>) =>
  (A: Mat<R>, L: number): Mat<R> => {
    const n = A.length
    let acc = eye(S)(n)
    let p = eye(S)(n)
    for (let i = 1; i <= L; i++) {
      p = matMul(S)(p, A)
      // acc = acc ⊕ p  (elementwise add)
      acc = acc.map((row, r) => row.map((x, c) => S.add(x, p[r]?.[c]!)))
    }
    return acc
  }

// ---------- Matrix helpers that need a Ring ----------
export const matAdd =
  <R>(Rng: Ring<R>) =>
  (A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.map((row, i) => row.map((x, j) => Rng.add(x, B[i]?.[j]!)))

export const matNeg =
  <R>(Rng: Ring<R>) =>
  (A: Mat<R>): Mat<R> =>
    A.map(row => row.map(Rng.neg))

export const zerosMat =
  <R>(rows: number, cols: number, S: Semiring<R>): Mat<R> =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => S.zero))

export const idMat =
  <R>(n: number, S: Semiring<R>): Mat<R> => eye(S)(n)

// Block concat (no checks; keep careful with dims)
export const hcat =
  <R>(A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.map((row, i) => row.concat(B[i]!))

export const vcat =
  <R>(A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.concat(B)

// 3-factor permutation matrix P: factors [d0,d1,d2] -> permute by π
// π = [0,1,2] is identity; π = [1,2,0] cycles (0→1→2→0)
export const permute3 = <R>(S: Semiring<R>) =>
  (dims: [number, number, number], perm: [number, number, number]): Mat<R> => {
    const [d0, d1, d2] = dims
    const total = d0 * d1 * d2
    const M: R[][] = Array.from({ length: total }, () =>
      Array.from({ length: total }, () => S.zero)
    )

    // For permutation [p0, p1, p2], the target dimensions are [dims[p0], dims[p1], dims[p2]]
    const targetDims = [dims[perm[0]], dims[perm[1]], dims[perm[2]]]

    for (let i0 = 0; i0 < d0; i0++) {
      for (let i1 = 0; i1 < d1; i1++) {
        for (let i2 = 0; i2 < d2; i2++) {
          const indices = [i0, i1, i2]
          const sourceIdx = i0 * (d1 * d2) + i1 * d2 + i2

          // Apply permutation
          const permIndices = [indices[perm[0]!]!, indices[perm[1]!]!, indices[perm[2]!]!]
          const [j0, j1, j2] = permIndices
          const targetIdx = j0! * (targetDims[1]! * targetDims[2]!) + j1! * targetDims[2]! + j2!

          const row = M[targetIdx]
          if (row) row[sourceIdx] = S.one
        }
      }
    }
    return M
  }

