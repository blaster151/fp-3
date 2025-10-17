import type { Category } from "./category"
import { ArrowFamilies } from "./arrow-families"
import { CategoryLimits } from "./category-limits"
import { IndexedFamilies } from "./indexed-families"

export namespace EnhancedVect {
  export interface VectObj { readonly dim: number }
  export interface VectMor {
    readonly matrix: ReadonlyArray<ReadonlyArray<number>>
    readonly from: VectObj
    readonly to: VectObj
  }

  /** Arrow category object (morphism in Vect) */
  export type ArrowObj = { f: VectMor }

  /** Arrow category morphism (commutative square) */
  export type ArrowMor = { left: VectMor; right: VectMor }

  export const Vect: Category<VectObj, VectMor> & ArrowFamilies.HasDomCod<VectObj, VectMor> = {
    id: (v) => ({
      matrix: Array.from({ length: v.dim }, (_, r) =>
        Array.from({ length: v.dim }, (_, c) => (r === c ? 1 : 0))
      ),
      from: v,
      to: v
    }),
    compose: (g, f) => {
      if (f.to.dim !== g.from.dim) throw new Error("Matrix dimension mismatch for composition")
      const m = f.matrix, n = g.matrix
      const rows = m.length, cols = n[0]?.length ?? 0, mid = n.length
      const out: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))
      for (let i = 0; i < rows; i++) {
        for (let k = 0; k < mid; k++) {
          for (let j = 0; j < cols; j++) {
            out[i]![j]! += m[i]![k]! * n[k]![j]!
          }
        }
      }
      return { matrix: out, from: f.from, to: g.to }
    },
    dom: (m) => m.from,
    cod: (m) => m.to,
    isId: (m) => m.from.dim === m.to.dim &&
      m.matrix.every((row, r) => row.every((x, c) => (r === c ? x === 1 : x === 0))),
    equalMor: (f, g) =>
      f.from.dim === g.from.dim &&
      f.to.dim === g.to.dim &&
      f.matrix.length === g.matrix.length &&
      f.matrix.every((row, i) =>
        row.length === g.matrix[i]!.length &&
        row.every((value, j) => value === g.matrix[i]![j])
      )
  }

  export const VectArr: Category<ArrowObj, ArrowMor> & ArrowFamilies.HasDomCod<ArrowObj, ArrowMor> = {
    id: (obj) => ({ left: Vect.id(obj.f.from), right: Vect.id(obj.f.to) }),
    compose: (g, f) => {
      if (f.left.to !== g.left.from || f.right.to !== g.right.from) {
        throw new Error('Arrow composition: domain/codomain mismatch')
      }
      return {
        left: Vect.compose(g.left, f.left),
        right: Vect.compose(g.right, f.right)
      }
    },
    dom: (m) => ({ f: m.left }),
    cod: (m) => ({ f: m.right })
  }

  /** Finite product in Vect */
  export const finiteProductVect =
    <I>(Ifin: IndexedFamilies.FiniteIndex<I>, fam: IndexedFamilies.Family<I, VectObj>) => {
      const dims = Ifin.carrier.map((i) => fam(i).dim)
      const total = dims.reduce((a, b) => a + b, 0)
      const product: VectObj = { dim: total }

      const projections: IndexedFamilies.Family<I, VectMor> = (i) => {
        const leftDims = Ifin.carrier.slice(0, Ifin.carrier.indexOf(i)).reduce((a, j) => a + fam(j).dim, 0)
        const kDim = fam(i).dim
        const M = Array.from({ length: kDim }, () => Array(total).fill(0))
        for (let r = 0; r < kDim; r++) M[r]![leftDims + r] = 1
        return { matrix: M, from: fam(i), to: product }
      }

      return { product, projections }
    }

  /** Finite coproduct in Vect */
  export const finiteCoproductVect =
    <I>(Ifin: IndexedFamilies.FiniteIndex<I>, fam: IndexedFamilies.Family<I, VectObj>) => {
      const dims = Ifin.carrier.map((i) => fam(i).dim)
      const total = dims.reduce((a, b) => a + b, 0)
      const coproduct: VectObj = { dim: total }

      const injections: IndexedFamilies.Family<I, VectMor> = (i) => {
        const leftDims = Ifin.carrier.slice(0, Ifin.carrier.indexOf(i)).reduce((a, j) => a + fam(j).dim, 0)
        const kDim = fam(i).dim
        const M = Array.from({ length: total }, () => Array(kDim).fill(0))
        for (let r = 0; r < kDim; r++) M[leftDims + r]![r] = 1
        return { matrix: M, from: fam(i), to: coproduct }
      }

      return { coproduct, injections }
    }

  /** Sum of dimensions */
  export const directSumDims =
    <I>(Ifin: IndexedFamilies.FiniteIndex<I>, fam: IndexedFamilies.Family<I, VectObj>): number =>
      IndexedFamilies.reduceFamily(Ifin, fam, 0, (acc, v) => acc + v.dim)

  /**
   * tupleVect: given maps f_i : X -> V_i and a product object P = ⨉_i V_i,
   * build the unique ⟨f_i⟩ : X -> P whose block-columns are the f_i.
   */
  export const tupleVect = (
    X: VectObj,
    P: VectObj,
    maps: ReadonlyArray<VectMor>
  ): VectMor => {
    const n = X.dim
    const total = maps.reduce((acc, m) => {
      if (m.from.dim !== n) throw new Error('tupleVect: domain mismatch')
      return acc + m.to.dim
    }, 0)
    if (total !== P.dim) throw new Error('tupleVect: codomain dim != product dim')

    const M = Array.from({ length: n }, () => Array(total).fill(0))
    let offset = 0
    for (const m of maps) {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < m.to.dim; c++) {
          M[r]![offset + c] = m.matrix[r]![c]!
        }
      }
      offset += m.to.dim
    }
    return { matrix: M, from: X, to: P }
  }

  /**
   * cotupleVect: given maps g_i : V_i -> Y and a coproduct object C = ⨁_i V_i,
   * build the unique [g_i] : C -> Y whose block-rows are the g_i.
   */
  export const cotupleVect = (
    C: VectObj,
    maps: ReadonlyArray<VectMor>,
    Y: VectObj
  ): VectMor => {
    const m = Y.dim
    const total = maps.reduce((acc, g) => {
      if (g.to.dim !== m) throw new Error('cotupleVect: codomain mismatch')
      return acc + g.from.dim
    }, 0)
    if (total !== C.dim) throw new Error('cotupleVect: domain dim != coproduct dim')

    const M = Array.from({ length: C.dim }, () => Array(m).fill(0))
    let offset = 0
    for (const g of maps) {
      for (let r = 0; r < g.from.dim; r++) {
        for (let c = 0; c < m; c++) {
          M[offset + r]![c] = g.matrix[r]![c]!
        }
      }
      offset += g.from.dim
    }
    return { matrix: M, from: C, to: Y }
  }

  /** Build canonical tuple from product cone */
  export const tupleVectFromCone = <I>(
    Ifin: IndexedFamilies.FiniteIndex<I>,
    cone: CategoryLimits.Cone<I, VectObj, VectMor>,
    P: VectObj
  ): VectMor => {
    const legsArr = Ifin.carrier.map((i) => cone.legs(i))
    return tupleVect(cone.tip, P, legsArr)
  }

  /** Build canonical cotuple from coproduct cocone */
  export const cotupleVectFromCocone = <I>(
    Ifin: IndexedFamilies.FiniteIndex<I>,
    cocone: CategoryLimits.Cocone<I, VectObj, VectMor>,
    C: VectObj
  ): VectMor => {
    const legsArr = Ifin.carrier.map((i) => cocone.legs(i))
    return cotupleVect(C, legsArr, cocone.coTip)
  }

  /** Check uniqueness of product mediators via projections */
  export const productMediatorUnique = <I>(
    Ifin: IndexedFamilies.FiniteIndex<I>,
    projections: IndexedFamilies.Family<I, VectMor>,
    m1: VectMor,
    m2: VectMor
  ): boolean => {
    for (const i of Ifin.carrier) {
      const lhs = Vect.compose(projections(i), m1)
      const rhs = Vect.compose(projections(i), m2)
      if (!Vect.equalMor!(lhs, rhs)) return false
    }
    return Vect.equalMor!(m1, m2)
  }

  /** Check uniqueness of coproduct mediators via injections */
  export const coproductMediatorUnique = <I>(
    Ifin: IndexedFamilies.FiniteIndex<I>,
    injections: IndexedFamilies.Family<I, VectMor>,
    m1: VectMor,
    m2: VectMor
  ): boolean => {
    for (const i of Ifin.carrier) {
      const lhs = Vect.compose(m1, injections(i))
      const rhs = Vect.compose(m2, injections(i))
      if (!Vect.equalMor!(lhs, rhs)) return false
    }
    return Vect.equalMor!(m1, m2)
  }

  /** Uniqueness given triangles: both mediators equal canonical */
  export const productUniquenessGivenTrianglesVect = <I>(
    Ifin: IndexedFamilies.FiniteIndex<I>,
    projections: IndexedFamilies.Family<I, VectMor>,
    P: VectObj,
    cone: CategoryLimits.Cone<I, VectObj, VectMor>,
    m: VectMor,
    mPrime: VectMor
  ): boolean => {
    const indices = Ifin.carrier
    const ok1 = CategoryLimits.productMediates(Vect, Vect.equalMor!, projections, m, cone, indices)
    const ok2 = CategoryLimits.productMediates(Vect, Vect.equalMor!, projections, mPrime, cone, indices)
    if (!ok1 || !ok2) return false
    const canon = tupleVectFromCone(Ifin, cone, P)
    return Vect.equalMor!(m, canon) && Vect.equalMor!(mPrime, canon) && Vect.equalMor!(m, mPrime)
  }

  /** Uniqueness given triangles: both mediators equal canonical (coproduct) */
  export const coproductUniquenessGivenTrianglesVect = <I>(
    Ifin: IndexedFamilies.FiniteIndex<I>,
    injections: IndexedFamilies.Family<I, VectMor>,
    C: VectObj,
    cocone: CategoryLimits.Cocone<I, VectObj, VectMor>,
    m: VectMor,
    mPrime: VectMor
  ): boolean => {
    const indices = Ifin.carrier
    const ok1 = CategoryLimits.coproductMediates(Vect, Vect.equalMor!, injections, m, cocone, indices)
    const ok2 = CategoryLimits.coproductMediates(Vect, Vect.equalMor!, injections, mPrime, cocone, indices)
    if (!ok1 || !ok2) return false
    const canon = cotupleVectFromCocone(Ifin, cocone, C)
    return Vect.equalMor!(m, canon) && Vect.equalMor!(mPrime, canon) && Vect.equalMor!(m, mPrime)
  }

  /** Vect implements finite products trait */
  export const VectHasFiniteProducts: CategoryLimits.HasFiniteProducts<VectObj, VectMor> = {
    product: (objs) => {
      const dims = objs.map((o) => o.dim)
      const total = dims.reduce((a, b) => a + b, 0)
      const prod: VectObj = { dim: total }
      const projections: VectMor[] = []
      let offset = 0
      for (const d of dims) {
        const M = Array.from({ length: total }, () => Array(d).fill(0))
        for (let r = 0; r < d; r++) M[offset + r]![r] = 1
        projections.push({ matrix: M, from: prod, to: { dim: d } })
        offset += d
      }
      return { obj: prod, projections }
    }
  }

  /** Vect implements finite coproducts trait */
  export const VectHasFiniteCoproducts: CategoryLimits.HasFiniteCoproducts<VectObj, VectMor> = {
    coproduct: (objs) => {
      const dims = objs.map((o) => o.dim)
      const total = dims.reduce((a, b) => a + b, 0)
      const cop: VectObj = { dim: total }
      const injections: VectMor[] = []
      let offset = 0
      for (const d of dims) {
        const M = Array.from({ length: d }, () => Array(total).fill(0))
        for (let r = 0; r < d; r++) M[r]![offset + r] = 1
        injections.push({ matrix: M, from: { dim: d }, to: cop })
        offset += d
      }
      return { obj: cop, injections }
    }
  }

  /** Mediator-enabled Vect adapters */
  export const VectProductsWithTuple: CategoryLimits.HasProductMediators<VectObj, VectMor> = {
    ...VectHasFiniteProducts,
    tuple: (X, legs, P) => tupleVect(X, P, legs)
  }

  export const VectCoproductsWithCotuple: CategoryLimits.HasCoproductMediators<VectObj, VectMor> = {
    ...VectHasFiniteCoproducts,
    cotuple: (C, legs, Y) => cotupleVect(C, legs, Y)
  }

  /** Zero object in Vect (both initial and terminal) */
  export const zeroVect: VectObj = { dim: 0 }
  export const oneVect: VectObj = zeroVect // terminal = initial in Vect (biproduct category)

  /** Vect initial object trait */
  export const VectInitial: CategoryLimits.HasInitial<VectObj, VectMor> = {
    initialObj: zeroVect
  }

  /** Vect terminal object trait */
  export const VectTerminal: CategoryLimits.HasTerminal<VectObj, VectMor> = {
    terminalObj: oneVect
  }

  /** Combined adapters with empty case support */
  export const VectProductsEx = { ...VectHasFiniteProducts, ...VectTerminal }
  export const VectCoproductsEx = { ...VectHasFiniteCoproducts, ...VectInitial }
}
