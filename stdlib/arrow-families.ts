import { IndexedFamilies } from "./indexed-families"

export namespace ArrowFamilies {
  /** Category with domain/codomain operations */
  export interface HasDomCod<O, M> {
    dom: (f: M) => O
    cod: (f: M) => O
  }

  /** Extract domain family from family of morphisms */
  export const domFam =
    <I, O, M>(C: HasDomCod<O, M>, G: IndexedFamilies.Family<I, { f: M }>): IndexedFamilies.Family<I, O> =>
      (i: I) => C.dom(G(i).f)

  /** Extract codomain family from family of morphisms */
  export const codFam =
    <I, O, M>(C: HasDomCod<O, M>, G: IndexedFamilies.Family<I, { f: M }>): IndexedFamilies.Family<I, O> =>
      (i: I) => C.cod(G(i).f)

  /** Pointwise composition of morphism families (when types align) */
  export const composeFam =
    <I, M>(
      compose: (g: M, f: M) => M,
      H: IndexedFamilies.Family<I, { f: M }>,
      G: IndexedFamilies.Family<I, { f: M }>
    ): IndexedFamilies.Family<I, { f: M }> =>
      (i: I) => ({ f: compose(H(i).f, G(i).f) })
}
