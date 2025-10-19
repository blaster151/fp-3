import type { ChainMap, Field } from "../allTS"
import type { VectDiagram } from "./vect-view"

export namespace Pretty {
  export const matrix =
    <R>(F: Field<R>) =>
    (A: ReadonlyArray<ReadonlyArray<R>>): string =>
      A.length === 0
        ? '(empty 0×0)'
        : A.map(row => row.map(x => String(x)).join(' ')).join('\n')

  export const chainMap =
    <R>(F: Field<R>) =>
    (name: string, f: ChainMap<R>): string => {
      const ds = [...f.X.degrees].sort((a, b) => a - b)
      const parts = ds.map(n => {
        const M = (f.f[n] ?? []) as R[][]
        return `  degree ${n}: ${f.X.dim[n] ?? 0} → ${f.Y.dim[n] ?? 0}\n${matrix(F)(M)}`
      })
      return `${name} : ${f.X.S} → ${f.Y.S}\n${parts.join('\n')}`
    }

  export const vectDiagramAtDegree =
    <R>(F: Field<R>) =>
    (name: string, VD: VectDiagram<R>): string => {
      const sizes = VD.I.objects.map(o => `${o}:${VD.V[o]!.dim}`).join(', ')
      const arrows = VD.I.objects.flatMap(a =>
        VD.I.objects
          .filter(b => VD.I.leq(a, b))
          .map(b => {
            const f = VD.arr(a, b)
            return `${a}≤${b}: ${f ? `${f.cod.dim}×${f.dom.dim}` : '—'}`
          })
      )
      return `${name} @Vect\n objects { ${sizes} }\n arrows:\n  ${arrows.join('\n  ')}`
    }
}
