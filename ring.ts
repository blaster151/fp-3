// ring.ts
// Minimal Ring layer (Semiring + additive inverses) and a few matrix helpers.

import type { Semiring, Mat } from './allTS'
import { eye, eqStrict } from './allTS'

export interface Ring<R> extends Semiring<R> {
  neg: (a: R) => R
  sub: (a: R, b: R) => R
}

// A concrete Ring over number
export const RingReal: Ring<number> = {
  add: (a,b) => a + b,
  zero: 0,
  mul: (a,b) => a * b,
  one: 1,
  eq: eqStrict<number>(),
  neg: (a) => -a,
  sub: (a,b) => a - b,
}

export const RingInteger: Ring<bigint> = {
  add: (a, b) => a + b,
  zero: 0n,
  mul: (a, b) => a * b,
  one: 1n,
  eq: (a, b) => a === b,
  neg: (a) => -a,
  sub: (a, b) => a - b,
}

// Elementwise matrix addition (same shape)
export const matAdd =
  <R>(Rng: Ring<R>) =>
  (A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.map((row,i) => row.map((x,j) => Rng.add(x, B[i]?.[j]!)))

export const matNeg =
  <R>(Rng: Ring<R>) =>
  (A: Mat<R>): Mat<R> =>
    A.map(row => row.map(Rng.neg))

// Fresh zeros matrix
export const zerosMat =
  <R>(rows: number, cols: number, S: Semiring<R>): Mat<R> =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => S.zero))

// Identity matrix
export const idMat =
  <R>(n: number, S: Semiring<R>): Mat<R> =>
    eye(S)(n)

// Block concatenations (shape-safe if you pass matching dims)
export const hcat =
  <R>(A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.map((row, i) => row.concat(B[i]!))

export const vcat =
  <R>(A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.concat(B)