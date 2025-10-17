import {
  SemiringNat,
  SemiringBoolOrAnd,
  SemiringMinPlus,
  eye,
  matMul,
  kron,
  closureUpTo,
  powMat,
  vecMat,
} from "./semiring-linear"
import type { Semiring, Mat, Vec } from "./semiring-linear"

// -------------------------------------------------------------
// Weighted automata over a Semiring R
//   states: n
//   init:   1×n row vector
//   final:  n×1 column vector (as Vec)
//   delta:  map from symbol -> n×n matrix
// Weight(word) = init · Π delta[s_i] · final
// -------------------------------------------------------------
export type WeightedAutomaton<R, Sym extends string = string> = {
  readonly S: Semiring<R>
  readonly n: number
  readonly init: Vec<R>          // length n
  readonly final: Vec<R>         // length n
  readonly delta: Readonly<Record<Sym, Mat<R>>>
}

export const waRun =
  <R, Sym extends string>(A: WeightedAutomaton<R, Sym>) =>
  (word: ReadonlyArray<Sym>): R => {
    const S = A.S
    let v = A.init
    for (const s of word) {
      const M = A.delta[s as Sym]
      if (!M) throw new Error(`waRun: unknown symbol ${String(s)}`)
      v = vecMat(S)(v, M)
    }
    // dot with final
    let acc = S.zero
    for (let i = 0; i < A.n; i++) acc = S.add(acc, S.mul(v[i]!, A.final[i]!))
    return acc
  }

// Product automaton (synchronous product) via Kronecker
export const waProduct =
  <R, S1 extends string, S2 extends string>(S: Semiring<R>) =>
  (A: WeightedAutomaton<R, S1>, B: WeightedAutomaton<R, S2>) =>
  (alphabet: ReadonlyArray<S1 & S2>): WeightedAutomaton<R, S1 & S2> => {
    const n = A.n * B.n
    const init = (() => {
      // kron row vectors: (1×nA) ⊗ (1×nB) ~ (1×nA*nB)
      const out: R[] = []
      for (let i = 0; i < A.n; i++) for (let j = 0; j < B.n; j++) {
        out.push(S.mul(A.init[i]!, B.init[j]!))
      }
      return out
    })()
    const final = (() => {
      const out: R[] = []
      for (let i = 0; i < A.n; i++) for (let j = 0; j < B.n; j++) {
        out.push(S.mul(A.final[i]!, B.final[j]!))
      }
      return out
    })()
    const delta: Record<S1 & S2, Mat<R>> = {} as Record<S1 & S2, Mat<R>>
    for (const a of alphabet) {
      delta[a] = kron(S)(A.delta[a as S1]!, B.delta[a as S2]!)
    }
    return { S, n, init, final, delta }
  }

// Boolean acceptance: A over BoolOrAnd, accepted iff weight === true
export const waAcceptsBool =
  (A: WeightedAutomaton<boolean, string>) =>
  (word: ReadonlyArray<string>): boolean =>
    waRun(A)(word)

// -------------------------------------------------------------
// HMM forward over a semiring (Prob or Viterbi as MaxPlus)
//   T: n×n transition
//   E[o]: n×n diagonal emission for obs symbol o
//   pi: 1×n initial
//   Optional final: n weight to end; otherwise sum over states.
// -------------------------------------------------------------
export type HMM<R, Obs extends string = string> = {
  readonly S: Semiring<R>
  readonly n: number
  readonly T: Mat<R>
  readonly E: Readonly<Record<Obs, Mat<R>>>  // diagonal by convention
  readonly pi: Vec<R>
  readonly final?: Vec<R>
}

export const hmmForward =
  <R, Obs extends string>(H: HMM<R, Obs>) =>
  (obs: ReadonlyArray<Obs>): R => {
    const S = H.S
    let α = H.pi
    for (const o of obs) {
      const Em = H.E[o as Obs]
      if (!Em) throw new Error(`hmmForward: unknown obs ${String(o)}`)
      α = vecMat(S)(α, Em)   // elementwise scale
      α = vecMat(S)(α, H.T)  // step
    }
    const fin = H.final ?? Array.from({ length: H.n }, () => S.one)
    let acc = S.zero
    for (let i = 0; i < H.n; i++) acc = S.add(acc, S.mul(α[i]!, fin[i]!))
    return acc
  }

// -------------------------------------------------------------
// Build adjacency from edge list
// -------------------------------------------------------------
export type Edge<W> = readonly [from: number, to: number, w?: W]

export const graphAdjNat =
  (n: number, edges: ReadonlyArray<Edge<number>>): Mat<number> => {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
    for (const [u,v] of edges) A[u]![v]! += 1
    return A
  }

export const graphAdjBool =
  (n: number, edges: ReadonlyArray<Edge<unknown>>): Mat<boolean> => {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => false))
    for (const [u,v] of edges) A[u]![v] = true
    return A
  }

export const graphAdjWeights =
  (n: number, edges: ReadonlyArray<Edge<number>>, absent = Number.POSITIVE_INFINITY): Mat<number> => {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => absent))
    for (let i=0;i<n;i++) A[i]![i] = 0
    for (const [u,v,w=1] of edges) A[u]![v] = Math.min(A[u]![v]!, w)
    return A
  }

// -------------------------------------------------------------
// Path counts of exact length L (ℕ semiring)
// -------------------------------------------------------------
export const countPathsOfLength =
  (A: Mat<number>, L: number): Mat<number> =>
    powMat(SemiringNat)(A, L)

// Reachability within ≤L steps (Boolean semiring)
export const reachableWithin =
  (A: Mat<boolean>, L: number): Mat<boolean> =>
    closureUpTo(SemiringBoolOrAnd)(A, L)

// All-pairs shortest paths up to ≤L edges (MinPlus)
// If L omitted, uses n-1 (no negative cycles support here)
export const shortestPathsUpTo =
  (A: Mat<number>, L?: number): Mat<number> => {
    const n = A.length
    const S = SemiringMinPlus
    const I = eye(S)(n)
    // convert weights matrix (dist) into adjacency in MinPlus:
    // A^1 is already the edge weights; add I (0 on diag)
    let acc = I
    let p = I
    // add one step
    p = matMul(S)(p, A)
    acc = acc.map((row,r) => row.map((x,c) => S.add(x, p[r]?.[c]!)))
    const maxL = L ?? (n - 1)
    for (let i = 2; i <= maxL; i++) {
      p = matMul(S)(p, A)
      acc = acc.map((row,r) => row.map((x,c) => S.add(x, p[r]?.[c]!)))
    }
    return acc
  }

// Pretty: lift a per-symbol scalar weight to a diagonal emission matrix (for HMM)
export const diagFromVec =
  <R>(S: Semiring<R>) =>
  (w: Vec<R>): Mat<R> =>
    w.map((wi, i) => w.map((_, j) => (i === j ? wi : S.zero)))

// Normalize a probability row vector (defensive; not a semiring op)
export const normalizeRow = (v: number[]): number[] => {
  const s = v.reduce((a,b) => a + b, 0)
  return s === 0 ? v.slice() : v.map(x => x / s)
}

// ---------------------------------------------
// Warshall/Floyd transitive closure on Bool
// If `reflexive=true`, includes identity (ε*).
// A is n×n, with A[i][j] = path(i→j) ? true : false
// ---------------------------------------------
export const transitiveClosureBool = (
  A: Mat<boolean>,
  reflexive = true
): Mat<boolean> => {
  const n = A.length
  // clone
  const R: boolean[][] = A.map(row => row.slice())
  if (reflexive) {
    for (let i = 0; i < n; i++) R[i]![i] = true
  }
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) if (R[i]?.[k]) {
      for (let j = 0; j < n; j++) {
        // Bool semiring: add = OR, mul = AND
        const current = R[i]?.[j] ?? false
        const path = (R[i]?.[k] ?? false) && (R[k]?.[j] ?? false)
        R[i]![j] = current || path
      }
    }
  }
  return R
}
