import type { ChainMap, Complex, Field, PosetDiagram } from "../allTS"
import { DiagramClosure } from "./diagram-closure"

export namespace DiagramLaws {
  const eqMatrix =
    <R>(F: Pick<Field<R>, 'eq'>) =>
    (A: ReadonlyArray<ReadonlyArray<R>>, B: ReadonlyArray<ReadonlyArray<R>>): boolean => {
      if (A.length !== B.length) return false
      for (let i = 0; i < A.length; i++) {
        const Ai = A[i]
        const Bi = B[i]
        if ((Ai?.length ?? 0) !== (Bi?.length ?? 0)) return false
        for (let j = 0; j < (Ai?.length ?? 0); j++) if (!F.eq!(Ai![j]!, Bi![j]!)) return false
      }
      return true
    }

  const eqChainMap =
    <R>(F: Pick<Field<R>, 'eq'>) =>
    (f: ChainMap<R>, g: ChainMap<R>): boolean => {
      const ds = f.X.degrees
      if (ds.length !== g.X.degrees.length) return false
      for (const n of ds) {
        const A = (f.f[n] ?? []) as R[][]
        const B = (g.f[n] ?? []) as R[][]
        if (!eqMatrix(F)(A, B)) return false
      }
      return true
    }

  /** Validate identities and composition for poset diagrams. */
  export const validateFunctoriality =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>): { ok: boolean; issues: string[] } => {
      const issues: string[] = []
      const eq = eqChainMap(F)
      const idChain = (X: Complex<R>): ChainMap<R> => {
        const f: Record<number, R[][]> = {}
        for (const n of X.degrees) {
          const d = X.dim[n] ?? 0
          f[n] = Array.from({ length: d }, (_, i) =>
            Array.from({ length: d }, (_, j) => (i === j ? F.one : F.zero))
          )
        }
        return { S: X.S, X, Y: X, f }
      }

      const Closed = DiagramClosure.saturate(F)(D)
      const compose = DiagramClosure.composeChainMap(F)

      for (const a of D.I.objects) {
        const ida = D.arr(a, a) ?? Closed.arr(a, a)
        const idX = idChain(D.X[a]!)
        if (!ida) {
          issues.push(`missing identity arrow arr(${a},${a})`)
        } else if (!eq(ida, idX)) {
          issues.push(`identity law fails at ${a}: arr(${a},${a}) ≠ id`)
        }
      }

      for (const a of D.I.objects) for (const b of D.I.objects) if (D.I.leq(a, b)) {
        const fab = D.arr(a, b) ?? Closed.arr(a, b)
        if (!fab) continue
        for (const c of D.I.objects) if (D.I.leq(b, c)) {
          const fbc = D.arr(b, c) ?? Closed.arr(b, c)
          const fac = D.arr(a, c) ?? Closed.arr(a, c)
          if (!fbc || !fac) continue
          const lhs = compose(fbc, fab)
          if (!eq(lhs, fac)) {
            issues.push(`composition law fails: arr(${b},${c})∘arr(${a},${b}) ≠ arr(${a},${c})`)
          }
        }
      }

      return { ok: issues.length === 0, issues }
    }
}
