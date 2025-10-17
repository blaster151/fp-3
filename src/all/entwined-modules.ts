// =====================================================================
// Entwined modules over an algebra/coring pair with entwining
//   - Definitions of left modules, comodules lifts, and compatibility law
//   - Homomorphism checks and composition helpers
//   - Category façade exposing id/isHom/compose/assertHom
// =====================================================================

import type { Mat, Semiring } from "./semiring-linear"
import { eye, matMul, kron, eqMat, permute3 } from "./semiring-linear"
import type { Algebra, Coring, Entwining, Comodule } from "./corings-entwinings"
import { Err, Ok } from "./option-result"
import type { Result } from "./option-result"

// =====================================================================
// Entwined module structure
// =====================================================================

export type EntwinedModule<R> = {
  readonly S: Semiring<R>
  readonly A: Algebra<R>
  readonly C: Coring<R>
  readonly m: number
  readonly act: Mat<R>         // m × (k*m)
  readonly rho: Mat<R>         // (m*n) × m
}

export const entwinedLawHolds = <R>(
  E: Entwining<R>,
  M: EntwinedModule<R>,
): boolean => {
  const { A: { S, k }, C: { n }, Psi } = E
  const { m, act, rho } = M
  if (S !== M.S || S !== E.C.S) console.warn('entwinedLawHolds: semiring instances differ')

  const I = (d: number) => eye(S)(d)

  const L = matMul(S)(rho, act)                              // (m*n) × (k*m)
  const step1 = kron(S)(I(k), rho)                           // (k*m*n) × (k*m)
  const P1 = permute3(S)([k, m, n], [0, 2, 1])
  const step2 = matMul(S)(P1, step1)
  const step3 = matMul(S)(kron(S)(Psi, I(m)), step2)
  const P2 = permute3(S)([n, k, m], [1, 2, 0])
  const step4 = matMul(S)(P2, step3)
  const Rfinal = matMul(S)(kron(S)(act, I(n)), step4)

  return eqMat(S)(L, Rfinal)
}

// =====================================================================
// Left modules and diagonal constructions
// =====================================================================

export type LeftModule<R> = {
  readonly S: Semiring<R>
  readonly A: Algebra<R>
  readonly m: number
  readonly act: Mat<R>         // m × (k*m)
}

export const makeTaggedLeftModule =
  <R>(A: Algebra<R>) =>
  (m: number, tau: (j: number) => number): LeftModule<R> => {
    const act: R[][] = Array.from({ length: m }, () =>
      Array.from({ length: A.k * m }, () => A.S.zero)
    )
    for (let j = 0; j < m; j++) {
      const aIdx = tau(j) % A.k
      const row = act[j]
      if (row) row[aIdx * m + j] = A.S.one
    }
    return { S: A.S, A, m, act }
  }

export const makeDiagonalEntwinedModule =
  <R>(E: Entwining<R>) =>
  (m: number, tau: (j: number) => number, sigma: (j: number) => number): EntwinedModule<R> => {
    const A = E.A, C = E.C, S = A.S
    const LM = makeTaggedLeftModule(A)(m, tau)
    const rho: R[][] = Array.from({ length: m * C.n }, () =>
      Array.from({ length: m }, () => S.zero)
    )
    for (let j = 0; j < m; j++) {
      const cIdx = sigma(j) % C.n
      const row = rho[j * C.n + cIdx]
      if (row) row[j] = S.one
    }
    return { S, A, C, m, act: LM.act, rho }
  }

// =====================================================================
// Morphisms between entwined modules
// =====================================================================

export const isEntwinedModuleHom =
  <R>(E: Entwining<R>) =>
  (M: EntwinedModule<R>, N: EntwinedModule<R>, f: Mat<R>): boolean => {
    const S = E.A.S
    const k = E.A.k, n = E.C.n
    const mM = M.m, mN = N.m

    if ((f.length !== mN) || (f[0]?.length ?? -1) !== mM) return false

    const I = (d: number) => eye(S)(d)

    const leftAct  = matMul(S)(f, M.act)
    const rightAct = matMul(S)(N.act, kron(S)(I(k), f))

    const leftCo   = matMul(S)(kron(S)(f, I(n)), M.rho)
    const rightCo  = matMul(S)(N.rho, f)

    return eqMat(S)(leftAct, rightAct) && eqMat(S)(leftCo, rightCo)
  }

export const composeEntwinedHomsUnchecked =
  <R>(S: Semiring<R>) =>
  (g: Mat<R>, f: Mat<R>): Mat<R> =>
    matMul(S)(g, f)

export const composeEntwinedHoms =
  <R>(E: Entwining<R>) =>
  (M: EntwinedModule<R>, N: EntwinedModule<R>, P: EntwinedModule<R>) =>
  (g: Mat<R>, f: Mat<R>): Result<string, Mat<R>> => {
    const S = E.A.S
    const rows = (A: Mat<R>) => A.length
    const cols = (A: Mat<R>) => (A[0]?.length ?? 0)

    if (cols(f) !== M.m) return Err(`compose: f has ${cols(f)} cols, expected ${M.m} (dom M)`)
    if (rows(f) !== N.m) return Err(`compose: f has ${rows(f)} rows, expected ${N.m} (cod N)`)
    if (cols(g) !== N.m) return Err(`compose: g has ${cols(g)} cols, expected ${N.m} (dom N)`)
    if (rows(g) !== P.m) return Err(`compose: g has ${rows(g)} rows, expected ${P.m} (cod P)`)

    if (!isEntwinedModuleHom(E)(M, N, f)) return Err('compose: f is not an entwined-module hom')
    if (!isEntwinedModuleHom(E)(N, P, g)) return Err('compose: g is not an entwined-module hom')

    return Ok(matMul(S)(g, f))
  }

// =====================================================================
// Lifts between modules/comodules and entwined modules
// =====================================================================

export const liftAotimesToComodule = <R>(E: Entwining<R>) => (M: Comodule<R>): Comodule<R> => {
  const S = E.A.S, k = E.A.k, m = M.m
  const I = (d: number) => eye(S)(d)

  const rho_AM = kron(S)(I(k), M.rho)

  return { S, C: E.C, m: k * m, rho: rho_AM }
}

export const liftTensorCToLeftModule = <R>(E: Entwining<R>) => (N: LeftModule<R>): LeftModule<R> => {
  const S = E.A.S, n = E.C.n, m = N.m
  const I = (d: number) => eye(S)(d)

  const act_NC = kron(S)(N.act, I(n))

  return { S, A: E.A, m: m * n, act: act_NC }
}

export const entwinedFromComodule_AotimesM =
  <R>(E: Entwining<R>) =>
  (M: Comodule<R>): EntwinedModule<R> => {
    const S = E.A.S, k = E.A.k, m = M.m
    const I = (d: number) => eye(S)(d)

    const actA = matMul(S)(kron(S)(E.A.Mu, I(m)), eye(S)(k * k * m))
    const AM_as_comod = liftAotimesToComodule(E)(M)

    return { S, A: E.A, C: E.C, m: k * m, act: actA, rho: AM_as_comod.rho }
  }

export const entwinedFromLeftModule_NotimesC =
  <R>(E: Entwining<R>) =>
  (N: LeftModule<R>): EntwinedModule<R> => {
    const S = E.A.S, n = E.C.n, m = N.m
    const I = (d: number) => eye(S)(d)

    const NC = liftTensorCToLeftModule(E)(N)
    const rhoNC = kron(S)(I(m), E.C.Delta)

    return { S, A: E.A, C: E.C, m: m * n, act: NC.act, rho: rhoNC }
  }

// =====================================================================
// Category façade for entwined modules
// =====================================================================

export const categoryOfEntwinedModules =
  <R>(E: Entwining<R>) => {
    const S = E.A.S
    const id = (M: EntwinedModule<R>): Mat<R> => eye(S)(M.m)
    const isHom = (M: EntwinedModule<R>, N: EntwinedModule<R>, f: Mat<R>) =>
      isEntwinedModuleHom(E)(M, N, f)

    const composeSafe =
      (M: EntwinedModule<R>, N: EntwinedModule<R>, P: EntwinedModule<R>) =>
      (g: Mat<R>, f: Mat<R>): Result<string, Mat<R>> =>
        composeEntwinedHoms(E)(M, N, P)(g, f)

    const composeUnchecked =
      (g: Mat<R>, f: Mat<R>): Mat<R> =>
        composeEntwinedHomsUnchecked(S)(g, f)

    const assertHom =
      (M: EntwinedModule<R>, N: EntwinedModule<R>, f: Mat<R>): Result<string, Mat<R>> =>
        isHom(M, N, f) ? Ok(f) : Err('assertHom: not an entwined-module hom')

    return { id, isHom, compose: composeSafe, composeUnchecked, assertHom }
  }
