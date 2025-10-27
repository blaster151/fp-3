import type { ChainMap, Field, FinitePoset, PosetDiagram, Ring } from "../allTS"
import { FinGrpProductsWithTuple, kron, matMul, nullspace } from "../allTS"
import type { RrefResolver } from "../allTS"
import { createRrefResolver } from "../allTS"
import type { FinGrpObj, Hom } from "../models/fingroup-cat"
import { kernelElements, nonMonoWitness, type KernelWitness } from "../models/fingroup-kernel"

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

const makeZeroVector = <R>(F: Field<R>, n: number): R[] =>
  Array.from({ length: n }, () => F.zero)

const asMatrix = <R>(F: Field<R>, rows: number, cols: number, data: ReadonlyArray<R>): R[][] => {
  const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const idx = i * cols + j
      M[i]![j] = data[idx] ?? F.zero
    }
  }
  return M
}

const assertSquare = <R>(dim: number, M: ReadonlyArray<ReadonlyArray<R>>, tag: string) => {
  if (M.length !== dim || (M[0]?.length ?? 0) !== dim) {
    throw new Error(`${tag}: expected ${dim}×${dim} matrix`)
  }
}

export type IntertwinerSpace<R> = {
  readonly basis: ReadonlyArray<R[][]>
  readonly dimension: number
}

export interface IntertwinerOptions {
  readonly resolver?: RrefResolver
}

const identityMatrix = <R>(F: Field<R>, dim: number): R[][] =>
  Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (i === j ? F.one : F.zero)),
  )

export const intertwinerSpace =
  <A, R>(F: Field<R>) =>
  (
    ρ1: Representation<A, R>,
    ρ2: Representation<A, R>,
    generators: ReadonlyArray<A>,
    options?: IntertwinerOptions,
  ): IntertwinerSpace<R> => {
    if (ρ1.dimV <= 0 || ρ2.dimV <= 0) {
      return { basis: [], dimension: 0 }
    }
    const resolver = options?.resolver ?? createRrefResolver()
    const d1 = ρ1.dimV
    const d2 = ρ2.dimV
    const vars = d1 * d2

    const rows: R[][] = []
    for (const g of generators) {
      const M1 = ρ1.mat(g)
      const M2 = ρ2.mat(g)
      assertSquare(d1, M1, "intertwinerSpace: ρ1(g)")
      assertSquare(d2, M2, "intertwinerSpace: ρ2(g)")
      for (let i = 0; i < d2; i++) {
        for (let j = 0; j < d1; j++) {
          const row = makeZeroVector(F, vars)
          for (let k = 0; k < d2; k++) {
            const idx = k * d1 + j
            row[idx] = F.add(row[idx]!, M2[i]?.[k]! ?? F.zero)
          }
          for (let l = 0; l < d1; l++) {
            const idx = i * d1 + l
            row[idx] = F.sub(row[idx]!, M1[l]?.[j]! ?? F.zero)
          }
          rows.push(row)
        }
      }
    }

    if (rows.length === 0) {
      const basis: R[][][] = []
      for (let idx = 0; idx < vars; idx++) {
        const vec = makeZeroVector(F, vars)
        vec[idx] = F.one
        basis.push(asMatrix(F, d2, d1, vec))
      }
      return { basis, dimension: vars }
    }

    const basisVecs = nullspace(F, resolver)(rows)
    const basis = basisVecs.map((vec) => asMatrix(F, d2, d1, vec))
    return { basis, dimension: basis.length }
  }

export type FixedVectorSpace<R> = {
  readonly basis: ReadonlyArray<R[]>
  readonly dimension: number
  readonly kernelElements?: ReadonlyArray<string>
  readonly kernelWitness?: KernelWitness | null
  readonly shortCircuit?: "trivial-group" | "trivial-action"
}

export interface InvariantOptions<A> {
  readonly resolver?: RrefResolver
  readonly finiteGroup?: {
    readonly domain: FinGrpObj
    readonly codomain: FinGrpObj
    readonly hom: Hom
    readonly kernelName?: string
    readonly products?: typeof FinGrpProductsWithTuple
  }
  readonly includeKernelWitness?: boolean
}

const stackDifferenceRows = <R>(diff: ReadonlyArray<ReadonlyArray<R>>): R[][] =>
  diff.map((row) => row.slice() as R[])

const subtractIdentity = <R>(F: Field<R>, M: ReadonlyArray<ReadonlyArray<R>>): R[][] => {
  const dim = M.length
  const N: R[][] = []
  for (let i = 0; i < dim; i++) {
    const row: R[] = []
    for (let j = 0; j < dim; j++) {
      const entry = M[i]?.[j] ?? F.zero
      const delta = i === j ? F.one : F.zero
      row.push(F.sub(entry, delta))
    }
    N.push(row)
  }
  return N
}

const intersectKernels = <R>(F: Field<R>, rows: R[][], resolver: RrefResolver): R[][] =>
  nullspace(F, resolver)(rows)

export const invariantSubspace =
  <A, R>(F: Field<R>) =>
  (
    ρ: Representation<A, R>,
    generators: ReadonlyArray<A>,
    options?: InvariantOptions<A>,
  ): FixedVectorSpace<R> => {
    const dim = ρ.dimV
    if (dim === 0) return { basis: [], dimension: 0 }

    const resolver = options?.resolver ?? createRrefResolver()
    const finiteGroup = options?.finiteGroup
    if (finiteGroup) {
      const ker = kernelElements(finiteGroup.domain, finiteGroup.codomain, finiteGroup.hom)
      if (ker.length === finiteGroup.domain.elems.length) {
        const basis = identityMatrix(F, dim).map((row) => row.slice())
        const witness = options?.includeKernelWitness
          ? nonMonoWitness(finiteGroup.domain, finiteGroup.codomain, finiteGroup.hom, {
              kernelName: finiteGroup.kernelName,
            })
          : null
        return {
          basis,
          dimension: dim,
          kernelElements: ker,
          kernelWitness: witness,
          shortCircuit: "trivial-action",
        }
      }
      if (finiteGroup.domain.elems.length === 1) {
        const toolkit = finiteGroup.products ?? FinGrpProductsWithTuple
        try {
          void toolkit.product([finiteGroup.domain])
        } catch {
          /* ignore: product metadata optional */
        }
        const basis = identityMatrix(F, dim).map((row) => row.slice())
        return {
          basis,
          dimension: dim,
          kernelElements: ker,
          kernelWitness: null,
          shortCircuit: "trivial-group",
        }
      }
    }

    const stacked: R[][] = []
    for (const g of generators) {
      const M = ρ.mat(g)
      assertSquare(dim, M, "invariantSubspace: ρ(g)")
      const diff = subtractIdentity(F, M)
      stacked.push(...stackDifferenceRows(diff))
    }

    if (stacked.length === 0) {
      const basis = identityMatrix(F, dim).map((row) => row.slice())
      return { basis, dimension: dim }
    }

    const vecs = intersectKernels(F, stacked, resolver)
    return { basis: vecs, dimension: vecs.length }
  }

export const fixedVectors = invariantSubspace

export const applyRepAsLin =
  <A, R>(F: Field<R>) =>
  (ρ: Representation<A, R>, a: A): LinMap<R> => {
    const V = VectView.VS(F)(ρ.dimV)
    return { F, dom: V, cod: V, M: ρ.mat(a) }
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

/** Convert coaction to chain map at degree n */
export const coactionToChain =
  <R>(F: Field<R>) =>
  (n: number, δ: Coaction<R>): ChainMap<R> =>
    VectView.linToChain(F)(n, coactionAsLin(F)(δ))

export type { VectorSpace, LinMap }
export type VectDiagram<R> = VectView.VectDiagram<R>
