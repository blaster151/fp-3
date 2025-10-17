import type { ChainMap, Field, FinitePoset, PosetDiagram, Ring } from "../allTS"
import { kron, matMul } from "../allTS"

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
