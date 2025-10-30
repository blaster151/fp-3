import type { ChainMap, Field, FinitePoset, PosetDiagram, Ring } from "../allTS"
import { kron, matMul, matAdd, matNeg, idMat } from "../src/all/semiring-linear"

export namespace VectView {
  export type VectorSpace<R> = {
    readonly F: Field<R>
    readonly dim: number
    /** Optional basis; if omitted, use standard basis */
    readonly B?: ReadonlyArray<ReadonlyArray<R>>
  }

  export type LinMap<R> = {
    readonly F: Field<R>
    readonly dom: VectorSpace<R>
    readonly cod: VectorSpace<R>
    /** cod.dim × dom.dim matrix in the chosen bases */
    readonly M: ReadonlyArray<ReadonlyArray<R>>
  }

  export type VectDiagram<R> = {
    I: FinitePoset
    V: Readonly<Record<string, VectorSpace<R>>>
    arr: (a: string, b: string) => LinMap<R> | undefined
  }

  export const VS =
    <R>(F: Field<R>) =>
    (dim: number, B?: R[][]): VectorSpace<R> => (B ? { F, dim, B } : { F, dim })

  /** Extract a Vect diagram for a single degree n from a PosetDiagram. */
  export const toVectAtDegree =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>, n: number): VectDiagram<R> => {
      const V: Record<string, VectorSpace<R>> = {}
      for (const o of D.I.objects) V[o] = VS(F)(D.X[o]!.dim[n] ?? 0)
      const arr = (a: string, b: string): LinMap<R> | undefined => {
        const f = D.arr(a, b)
        if (!f) return undefined
        const M = (f.f[n] ?? []) as R[][]
        return { F, dom: V[a]!, cod: V[b]!, M }
      }
      return { I: D.I, V, arr }
    }

  /** Convenience: get the raw matrix of D(a→b) at degree n (zeros if missing). */
  export const arrowMatrixAtDegree =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>, n: number, a: string, b: string): R[][] => {
      const f = D.arr(a, b)
      if (!f) {
        const rows = D.X[b]!.dim[n] ?? 0
        const cols = D.X[a]!.dim[n] ?? 0
        return Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      }
      return (f.f[n] ?? []) as R[][]
    }

  /** Turn a linear map back into a 1-degree chain map at degree n. */
  export const linToChain =
    <R>(F: Field<R>) =>
    (n: number, f: LinMap<R>): ChainMap<R> => ({
      S: F as Ring<R>,
      X: { S: F as Ring<R>, degrees: [n], dim: { [n]: f.dom.dim }, d: {} },
      Y: { S: F as Ring<R>, degrees: [n], dim: { [n]: f.cod.dim }, d: {} },
      f: { [n]: f.M as R[][] }
    })
}

type LinMap<R> = VectView.LinMap<R>

type VectorSpace<R> = VectView.VectorSpace<R>

/** Ring/algebra representation ρ: A → End(V) */
export type Representation<A, R> = {
  F: Field<R>
  dimV: number
  mat: (a: A) => R[][]
}

export type IntertwinerSpace<R> = {
  readonly basis: ReadonlyArray<ReadonlyArray<ReadonlyArray<R>>>
  readonly dim: number
}

export type InvariantSubspace<R> = {
  readonly basis: ReadonlyArray<ReadonlyArray<R>>
  readonly dim: number
}

const transpose = <R>(M: ReadonlyArray<ReadonlyArray<R>>): R[][] =>
  (M[0]?.map((_, j) => M.map(row => row[j]!)) ?? [])

const columnMajorMatrixSafe = <R>(vector: ReadonlyArray<R>, rows: number, cols: number, zero: R): R[][] => {
  const matrix: R[][] = []
  for (let r = 0; r < rows; r++) {
    const row: R[] = []
    for (let c = 0; c < cols; c++) {
      row.push(vector[c * rows + r] ?? zero)
    }
    matrix.push(row)
  }
  return matrix
}

const standardMatrixBasis = <R>(rows: number, cols: number, zero: R, one: R): R[][][] => {
  const basis: R[][][] = []
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const matrix: R[][] = []
      for (let i = 0; i < rows; i++) {
        const row: R[] = []
        for (let j = 0; j < cols; j++) {
          row.push(i === r && j === c ? one : zero)
        }
        matrix.push(row)
      }
      basis.push(matrix)
    }
  }
  return basis
}

const standardVectorBasis = <R>(dim: number, zero: R, one: R): R[][] =>
  Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (i === j ? one : zero))
  )

type Matrix<R> = ReadonlyArray<ReadonlyArray<R>>

const cloneMatrix = <R>(matrix: Matrix<R>): R[][] =>
  matrix.map((row) => Array.from(row))

const makeRref = <R>(F: Field<R>) =>
  (matrix: Matrix<R>): { R: R[][]; pivots: number[] } => {
    const rows = cloneMatrix(matrix)
    const m = rows.length
    const n = rows[0]?.length ?? 0
    const pivots: number[] = []
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    const sub = F.sub ?? ((a: R, b: R) => F.add(a, F.neg(b)))
    let pivotRow = 0

    for (let col = 0; col < n && pivotRow < m; col++) {
      let candidate = pivotRow
      while (
        candidate < m &&
        eq(rows[candidate]?.[col] ?? F.zero, F.zero)
      ) {
        candidate++
      }
      if (candidate === m) {
        continue
      }
      if (candidate !== pivotRow) {
        ;[rows[pivotRow], rows[candidate]] = [rows[candidate]!, rows[pivotRow]!]
      }
      const pivot = rows[pivotRow]?.[col]
      if (pivot === undefined || eq(pivot, F.zero)) {
        continue
      }
      const inv = F.inv(pivot)
      for (let j = col; j < n; j++) {
        rows[pivotRow]![j] = F.mul(rows[pivotRow]![j]!, inv)
      }
      for (let r = 0; r < m; r++) {
        if (r === pivotRow) continue
        const factor = rows[r]?.[col]
        if (factor === undefined || eq(factor, F.zero)) continue
        for (let j = col; j < n; j++) {
          rows[r]![j] = sub(rows[r]![j]!, F.mul(factor, rows[pivotRow]![j]!))
        }
      }
      pivots.push(col)
      pivotRow++
    }

    return { R: rows, pivots }
  }

const nullspace =
  <R>(F: Field<R>) =>
  (matrix: Matrix<R>): R[][] => {
    const width = matrix[0]?.length ?? 0
    if (width === 0) {
      return []
    }
    const { R, pivots } = makeRref(F)(matrix)
    const pivotSet = new Set(pivots)
    const free: number[] = []
    for (let j = 0; j < width; j++) {
      if (!pivotSet.has(j)) {
        free.push(j)
      }
    }
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    const basis: R[][] = []
    for (const f of free) {
      const vector = Array.from({ length: width }, () => F.zero)
      vector[f] = F.one
      let row = 0
      for (const pivotCol of pivots) {
        let sum = F.zero
        for (let j = pivotCol + 1; j < width; j++) {
          const coefficient = R[row]?.[j]
          const value = vector[j]
          if (coefficient === undefined || value === undefined || eq(value, F.zero)) {
            continue
          }
          sum = F.add(sum, F.mul(coefficient, value))
        }
        vector[pivotCol] = F.neg(sum)
        row++
      }
      basis.push(vector)
    }
    return basis
  }

export const applyRepAsLin =
  <A, R>(F: Field<R>) =>
  (ρ: Representation<A, R>, a: A): LinMap<R> => {
    const V = VectView.VS(F)(ρ.dimV)
    return { F, dom: V, cod: V, M: ρ.mat(a) }
  }

export const intertwinerSpace =
  <A, R>(F: Field<R>) =>
  (ρ1: Representation<A, R>, ρ2: Representation<A, R>, generators: ReadonlyArray<A>): IntertwinerSpace<R> => {
    const dimDom = ρ1.dimV
    const dimCod = ρ2.dimV

    if (dimDom === 0 || dimCod === 0) {
      return { basis: [], dim: 0 }
    }

    if (generators.length === 0) {
      const basis = standardMatrixBasis(dimCod, dimDom, F.zero, F.one)
      return { basis, dim: basis.length }
    }

    const kronF = kron(F)
    const add = matAdd(F)
    const neg = matNeg(F)
    const IdDom = idMat(dimDom, F)
    const IdCod = idMat(dimCod, F)
    const constraints: R[][] = []

    for (const g of generators) {
      const left = kronF(IdDom, ρ2.mat(g))
      const right = kronF(transpose(ρ1.mat(g)), IdCod)
      const diff = add(left, neg(right))
      constraints.push(...diff)
    }

    if (constraints.length === 0 || (constraints[0]?.length ?? 0) === 0) {
      const basis = standardMatrixBasis(dimCod, dimDom, F.zero, F.one)
      return { basis, dim: basis.length }
    }

    const nullBasis = nullspace(F)(constraints)
    const basis = nullBasis.map(v => columnMajorMatrixSafe(v, dimCod, dimDom, F.zero))
    return { basis, dim: basis.length }
  }

/** Right C-comodule structure δ: V → V ⊗ C */
export type Coaction<R> = {
  F: Field<R>
  dimV: number
  dimC: number
  delta: R[][] // (dimV*dimC) × dimV
}

export const coactionAsLin =
  <R>(F: Field<R>) =>
  (δ: Coaction<R>): LinMap<R> => {
    const V = VectView.VS(F)(δ.dimV)
    const VC = VectView.VS(F)(δ.dimV * δ.dimC)
    return { F, dom: V, cod: VC, M: δ.delta }
  }

/** Push a linear map g:C→C' across a coaction: (id_V ⊗ g) ∘ δ */
export const pushCoaction =
  <R>(F: Field<R>) =>
  (δ: Coaction<R>, g: R[][]): Coaction<R> => {
    const K = kron(F)
    const IdV = Array.from({ length: δ.dimV }, (_, i) =>
      Array.from({ length: δ.dimV }, (_, j) => (i === j ? F.one : F.zero))
    )
    const T = K(IdV as R[][], g as R[][])
    const mul = matMul(F)
    const M = mul(T, δ.delta as R[][])
    return { F, dimV: δ.dimV, dimC: g.length ?? 0, delta: M }
  }

/** Convert action to chain map at degree n */
export const actionToChain =
  <A, R>(F: Field<R>) =>
  (n: number, ρ: Representation<A, R>, a: A): ChainMap<R> => {
    const V = VectView.VS(F)(ρ.dimV)
    const linMap: LinMap<R> = { F, dom: V, cod: V, M: ρ.mat(a) }
    return VectView.linToChain(F)(n, linMap)
  }

export const invariantSubspace =
  <A, R>(F: Field<R>) =>
  (ρ: Representation<A, R>, generators: ReadonlyArray<A>): InvariantSubspace<R> => {
    const dim = ρ.dimV

    if (dim === 0) {
      return { basis: [], dim: 0 }
    }

    if (generators.length === 0) {
      const basis = standardVectorBasis(dim, F.zero, F.one)
      return { basis, dim: basis.length }
    }

    const add = matAdd(F)
    const neg = matNeg(F)
    const Id = idMat(dim, F)
    const constraints: R[][] = []

    for (const g of generators) {
      const diff = add(ρ.mat(g), neg(Id))
      constraints.push(...diff)
    }

    if (constraints.length === 0) {
      const basis = standardVectorBasis(dim, F.zero, F.one)
      return { basis, dim: basis.length }
    }

    const nullBasis = nullspace(F)(constraints)
    const basis = nullBasis.map(v => v.slice(0, dim))
    return { basis, dim: basis.length }
  }

/** Convert coaction to chain map at degree n */
export const coactionToChain =
  <R>(F: Field<R>) =>
  (n: number, δ: Coaction<R>): ChainMap<R> =>
    VectView.linToChain(F)(n, coactionAsLin(F)(δ))

export type { VectorSpace, LinMap }
export type VectDiagram<R> = VectView.VectDiagram<R>
