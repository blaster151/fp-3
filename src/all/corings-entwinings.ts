// =====================================================================
// Corings, Algebras, and Entwinings over Semirings
//   - Finite-dimensional corings and algebras (modules over R^n)
//   - Canonical diagonal instances
//   - Entwining laws (Brzeziński–Majid) and law checkers
// =====================================================================

import type { Mat, Semiring } from "./semiring-linear"
import { eye, matMul, kron, eqMat } from "./semiring-linear"

// =====================================================================
// Corings over semirings
//   A coring C over R^n is (R^n, Δ: C→C⊗C, ε: C→R) satisfying laws
// =====================================================================
export type Coring<R> = {
  readonly S: Semiring<R>
  readonly n: number         // rank of C ≅ R^n
  readonly Delta: Mat<R>     // (n*n) x n
  readonly Eps: Mat<R>       // 1 x n
}

// Diagonal coring: each basis element is group-like
export const makeDiagonalCoring = <R>(S: Semiring<R>) => (n: number): Coring<R> => {
  // Δ(c_i) = c_i ⊗ c_i
  const Delta: R[][] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const row: R[] = Array(n).fill(S.zero)
      if (i === j) row[i] = S.one
      Delta.push(row)
    }
  }

  // ε(c_i) = 1 for all i
  const Eps: R[][] = [Array(n).fill(S.one)]

  return { S, n, Delta, Eps }
}

// =========================================
// Algebra on free module A ≅ R^k (finite)
//   μ : A⊗A -> A     (k x k^2)
//   η : R   -> A     (k x 1)
// =========================================
export type Algebra<R> = {
  readonly S: Semiring<R>
  readonly k: number
  readonly Mu : Mat<R>  // k x (k*k)
  readonly Eta: Mat<R>  // k x 1
}

// Diagonal algebra: basis {e_i}; μ(e_i⊗e_j)=δ_{ij} e_i, η(1)=∑ e_i
export const makeDiagonalAlgebra =
  <R>(S: Semiring<R>) =>
  (k: number): Algebra<R> => {
    const Mu: R[][] = Array.from({ length: k }, () =>
      Array.from({ length: k * k }, () => S.zero)
    )
    for (let i = 0; i < k; i++) {
      const col = i * k + i // (i,i) slot in flattened k×k
      Mu[i]![col] = S.one
    }
    const Eta: R[][] = Array.from({ length: k }, () => [S.one])
    return { S, k, Mu, Eta }
  }

// =========================================
// Entwining between Algebra A and Coring C
//   Ψ : A⊗C → C⊗A    ((n*k) x (k*n))
// Laws (Brzeziński–Majid):
//  (1) (Δ⊗id_A) Ψ = (id_C⊗Ψ)(Ψ⊗id_C)(id_A⊗Δ)
//  (2) (id_C⊗μ)(Ψ⊗id_A)(id_A⊗Ψ) = Ψ(μ⊗id_C)
//  (3) Ψ(η⊗id_C) = id_C⊗η
//  (4) (ε⊗id_A)Ψ = id_A⊗ε
// =========================================
export type Entwining<R> = {
  readonly A: Algebra<R>
  readonly C: Coring<R>
  readonly Psi: Mat<R>             // (C.n * A.k) x (A.k * C.n)
}

const I = <R>(S: Semiring<R>) => (n: number) => eye(S)(n)

export const entwiningCoassocHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, k }, C: { n, Delta }, Psi } = E
  const idA = I(S)(k), idC = I(S)(n)

  // LHS: (Δ⊗id_A) Ψ
  const L = matMul(S)(kron(S)(Delta, idA), Psi)
  // RHS: (id_C⊗Ψ)(Ψ⊗id_C)(id_A⊗Δ)
  const R1 = kron(S)(idA, Delta)
  const R2 = matMul(S)(kron(S)(Psi, idC), R1)
  const R  = matMul(S)(kron(S)(idC, Psi), R2)

  return eqMat(S)(L, R)
}

export const entwiningMultHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, k, Mu }, C: { n }, Psi } = E
  const idA = I(S)(k), idC = I(S)(n)

  // LHS: (id_C⊗μ)(Ψ⊗id_A)(id_A⊗Ψ)
  const L1 = kron(S)(idA, Psi)
  const L2 = matMul(S)(kron(S)(Psi, idA), L1)
  const L  = matMul(S)(kron(S)(idC, Mu), L2)

  // RHS: Ψ(μ⊗id_C)
  const R  = matMul(S)(Psi, kron(S)(Mu, idC))

  return eqMat(S)(L, R)
}

export const entwiningUnitHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, Eta }, C: { n }, Psi } = E
  const idC = I(S)(n)
  // Ψ(η⊗id_C) = id_C⊗η  : both are (n*k) x n
  const left  = matMul(S)(Psi, kron(S)(Eta, idC))
  const right = kron(S)(idC, Eta)
  return eqMat(S)(left, right)
}

export const entwiningCounitHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, k }, C: { Eps }, Psi } = E
  const idA = I(S)(k)
  // (ε⊗id_A)Ψ = id_A⊗ε  : both are k x (k*n)
  const left  = matMul(S)(kron(S)(Eps, idA), Psi)
  const right = kron(S)(idA, Eps)
  return eqMat(S)(left, right)
}

// Permutation matrix that flips A⊗C → C⊗A in the chosen basis
export const flipAC =
  <R>(S: Semiring<R>) =>
  (k: number, n: number): Mat<R> => {
    const M: R[][] = Array.from({ length: n * k }, () =>
      Array.from({ length: k * n }, () => S.zero)
    )
    // column index c = a*n + cIdx ; row index r = cIdx*k + a
    for (let a = 0; a < k; a++) for (let cIdx = 0; cIdx < n; cIdx++) {
      const col = a * n + cIdx
      const row = cIdx * k + a
      const m = M[row]
      if (m) m[col] = S.one
    }
    return M
  }

// Ready-made diagonal entwining
export const makeDiagonalEntwining =
  <R>(A: Algebra<R>, C: Coring<R>): Entwining<R> => {
    if (A.S !== C.S) console.warn('Entwining assumes A and C over the same Semiring instance')
    return { A, C, Psi: flipAC(A.S)(A.k, C.n) }
  }

// =====================================================================
// Free bimodules and balanced tensor utilities over semirings
// =====================================================================

export type FreeBimodule<R, S> = {
  readonly left: Semiring<R>
  readonly right: Semiring<S>
  readonly rank: number
}

export const FreeBimoduleStd = <R, S>(R: Semiring<R>, S: Semiring<S>) =>
  (rank: number): FreeBimodule<R, S> => ({ left: R, right: S, rank })

export const tensorBalancedObj =
  <R, S, T>(
    MS: FreeBimodule<R, S>,
    ST: FreeBimodule<S, T>,
  ): FreeBimodule<R, T> => {
    if (MS.right !== ST.left)
      console.warn('tensorBalancedObj: semiring identity check skipped; ensure MS.right and ST.left represent the same S')
    return { left: MS.left, right: ST.right, rank: MS.rank * ST.rank }
  }

export const tensorBalancedMapSameR =
  <R>(S: Semiring<R>) =>
  (f: Mat<R>, g: Mat<R>): Mat<R> => kron(S)(f, g)

export const idMap =
  <R>(S: Semiring<R>) =>
  (n: number): Mat<R> => eye(S)(n)

export const composeMap =
  <R>(S: Semiring<R>) =>
  (f: Mat<R>, g: Mat<R>): Mat<R> =>
    matMul(S)(f, g)

// =====================================================================
// Right C-comodules over a coring C on R^n (finite, free)
// =====================================================================

export type Comodule<R> = {
  readonly S: Semiring<R>
  readonly C: Coring<R>
  readonly m: number
  readonly rho: Mat<R>
}

const _row = (i: number, j: number, n: number) => i * n + j

export const comoduleCoassocHolds = <R>(M: Comodule<R>): boolean => {
  const { S, C: { n, Delta }, m, rho } = M
  const add = S.add, mul = S.mul
  const eq = M.S.eq ?? ((x: R, y: R) => Object.is(x, y))

  for (let k = 0; k < m; k++) {
    for (let p = 0; p < m; p++) for (let q = 0; q < n; q++) for (let r = 0; r < n; r++) {
      let lhs = S.zero
      for (let i = 0; i < m; i++) {
        const a = rho[_row(i, r, n)]?.[k]
        const b = rho[_row(p, q, n)]?.[i]
        if (a !== undefined && b !== undefined) {
          lhs = add(lhs, mul(a, b))
        }
      }

      let rhs = S.zero
      for (let j = 0; j < n; j++) {
        const a = rho[_row(p, j, n)]?.[k]
        const b = Delta[_row(q, r, n)]?.[j]
        if (a !== undefined && b !== undefined) {
          rhs = add(rhs, mul(a, b))
        }
      }
      if (!eq(lhs, rhs)) return false
    }
  }
  return true
}

export const comoduleCounitHolds = <R>(M: Comodule<R>): boolean => {
  const { S, C: { n, Eps }, m, rho } = M
  const add = S.add, mul = S.mul
  const eq = S.eq ?? ((x: R, y: R) => Object.is(x, y))
  for (let k = 0; k < m; k++) for (let p = 0; p < m; p++) {
    let acc = S.zero
    for (let j = 0; j < n; j++) {
      const a = rho[_row(p, j, n)]?.[k]
      const b = Eps[0]?.[j]
      if (a !== undefined && b !== undefined) {
        acc = add(acc, mul(a, b))
      }
    }
    const delta = (p === k) ? S.one : S.zero
    if (!eq(acc, delta)) return false
  }
  return true
}

export const makeDiagonalComodule =
  <R>(C: Coring<R>) =>
  (m: number, sigma: (k: number) => number): Comodule<R> => {
    const rho: R[][] = Array.from({ length: m * C.n }, () =>
      Array.from({ length: m }, () => C.S.zero)
    )
    for (let k = 0; k < m; k++) {
      const j = sigma(k) % C.n
      const row = rho[_row(k, j, C.n)]
      if (row) {
        row[k] = C.S.one
      }
    }
    return { S: C.S, C, m, rho }
  }

// =====================================================================
// Bicomodules over corings D (left) and C (right) on free modules
// =====================================================================

export type Bicomodule<R> = {
  readonly S: Semiring<R>
  readonly left: Coring<R>
  readonly right: Coring<R>
  readonly m: number
  readonly rhoL: Mat<R>
  readonly rhoR: Mat<R>
}

const rowRC = (p: number, j: number, nC: number) => p * nC + j
const rowDM = (i: number, p: number, m: number) => i * m + p

export const bicomoduleCommutes = <R>(B: Bicomodule<R>): boolean => {
  const { S, left: D, right: C, m, rhoL, rhoR } = B
  const nD = D.n, nC = C.n
  const add = S.add, mul = S.mul
  const eq = S.eq ?? ((x: R, y: R) => Object.is(x, y))

  for (let k = 0; k < m; k++) {
    for (let i = 0; i < nD; i++) for (let p = 0; p < m; p++) for (let j = 0; j < nC; j++) {
      let lhs = S.zero
      for (let q = 0; q < m; q++) {
        const a = rhoR[rowRC(q, j, nC)]?.[k]
        const b = rhoL[rowDM(i, p, m)]?.[q]
        if (a !== undefined && b !== undefined) {
          lhs = add(lhs, mul(a, b))
        }
      }

      let rhs = S.zero
      for (let r = 0; r < m; r++) {
        const a = rhoL[rowDM(i, r, m)]?.[k]
        const b = rhoR[rowRC(p, j, nC)]?.[r]
        if (a !== undefined && b !== undefined) {
          rhs = add(rhs, mul(a, b))
        }
      }
      if (!eq(lhs, rhs)) return false
    }
  }
  return true
}

export const makeDiagonalBicomodule =
  <R>(D: Coring<R>, C: Coring<R>) =>
  (m: number, sigmaL: (k: number) => number, sigmaR: (k: number) => number): Bicomodule<R> => {
    const S = D.S
    if (S !== C.S) console.warn('Bicomodule assumes both corings over the same semiring instance')

    const rhoL: R[][] = Array.from({ length: D.n * m }, () =>
      Array.from({ length: m }, () => S.zero)
    )
    const rhoR: R[][] = Array.from({ length: m * C.n }, () =>
      Array.from({ length: m }, () => S.zero)
    )

    for (let k = 0; k < m; k++) {
      const i = sigmaL(k) % D.n
      const j = sigmaR(k) % C.n
      const rowL = rhoL[rowDM(i, k, m)]
      const rowR = rhoR[rowRC(k, j, C.n)]
      if (rowL) rowL[k] = S.one
      if (rowR) rowR[k] = S.one
    }
    return { S, left: D, right: C, m, rhoL, rhoR }
  }
