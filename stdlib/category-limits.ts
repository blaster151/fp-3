import type { FiniteCategory as RegistryFiniteCategory } from "../finite-cat"
import { isIso } from "../kinds/inverses"
import {
  checkBinaryProductComponentwiseCollapse as checkBinaryProductComponentwiseCollapseHelper,
  checkBinaryProductDiagonalPairing as checkBinaryProductDiagonalPairingHelper,
  checkBinaryProductInterchange as checkBinaryProductInterchangeHelper,
  checkBinaryProductNaturality as checkBinaryProductNaturalityHelper,
  checkBinaryProductSwapCompatibility as checkBinaryProductSwapCompatibilityHelper,
  checkBinaryProductUnitPointCompatibility as checkBinaryProductUnitPointCompatibilityHelper,
  makeBinaryProductComponentwise,
  makeBinaryProductDiagonal,
  makeBinaryProductSwap,
  type BinaryProductComponentwiseCollapseInput as CategoryBinaryProductComponentwiseCollapseInput,
  type BinaryProductComponentwiseInput as CategoryBinaryProductComponentwiseInput,
  type BinaryProductDiagonalFactor as CategoryBinaryProductDiagonalFactor,
  type BinaryProductDiagonalPairingInput as CategoryBinaryProductDiagonalPairingInput,
  type BinaryProductInterchangeInput as CategoryBinaryProductInterchangeInput,
  type BinaryProductNaturalityInput as CategoryBinaryProductNaturalityInput,
  type BinaryProductSwapCompatibilityInput as CategoryBinaryProductSwapCompatibilityInput,
  type BinaryProductSwapResult as CategoryBinaryProductSwapResult,
  type BinaryProductTuple as CategoryBinaryProductTuple,
  type BinaryProductUnitPointCompatibilityInput as CategoryBinaryProductUnitPointCompatibilityInput,
} from "../category-limits-helpers"
import { ArrowFamilies } from "./arrow-families"
import { IndexedFamilies } from "./indexed-families"
import type { Category } from "./category"

export namespace CategoryLimits {
  /** Category with finite coproducts */
  export interface HasFiniteCoproducts<O, M> {
    coproduct: (xs: ReadonlyArray<O>) => { obj: O; injections: ReadonlyArray<M> }
  }

  /** Category with finite products */
  export interface HasFiniteProducts<O, M> {
    product: (xs: ReadonlyArray<O>) => { obj: O; projections: ReadonlyArray<M> }
  }

  /** Category with equalizers */
  export interface HasEqualizers<O, M> {
    // equalizer of f,g : X -> Y returns E --e--> X s.t. f∘e = g∘e and universal
    equalizer: (f: M, g: M) => { obj: O; equalize: M }
  }

  /** Category with coequalizers */
  export interface HasCoequalizers<O, M> {
    // coequalizer of f,g : X -> Y returns Y --q--> Q s.t. q∘f = q∘g and universal
    coequalizer: (f: M, g: M) => { obj: O; coequalize: M }
  }

  /** Category with initial object */
  export interface HasInitial<O, M> {
    initialObj: O // ⨿ over ∅
  }

  /** Category with terminal object */
  export interface HasTerminal<O, M> {
    terminalObj: O // ∏ over ∅
  }

  /** Compute finite coproduct of a family with injection family */
  export const finiteCoproduct =
    <I, O, M>(
      Ifin: { carrier: ReadonlyArray<I> },
      fam: (i: I) => O,
      C: HasFiniteCoproducts<O, M>
    ) => {
      const objs = Ifin.carrier.map((i) => fam(i))
      const { obj, injections } = C.coproduct(objs)
      const injFam = (i: I) => injections[Ifin.carrier.indexOf(i)]!
      return { coproduct: obj, injections: injFam }
    }

  /** Compute finite product of a family with projection family */
  export const finiteProduct =
    <I, O, M>(
      Ifin: { carrier: ReadonlyArray<I> },
      fam: (i: I) => O,
      C: HasFiniteProducts<O, M>
    ) => {
      const objs = Ifin.carrier.map((i) => fam(i))
      const { obj, projections } = C.product(objs)
      const projFam = (i: I) => projections[Ifin.carrier.indexOf(i)]!
      return { product: obj, projections: projFam }
    }

  /** Extended finite product that honors empty case with terminal */
  export const finiteProductEx =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      fam: IndexedFamilies.Family<I, O>,
      C: HasFiniteProducts<O, M> & Partial<HasTerminal<O, M>>
    ) => {
      if (Ifin.carrier.length === 0) {
        const T = (C as HasTerminal<O, M>).terminalObj
        return {
          product: T,
          projections: (_: I): M => {
            throw new Error('no projections from empty product')
          }
        }
      }
      return finiteProduct(Ifin, fam, C)
    }

  /** Extended finite coproduct that honors empty case with initial */
  export const finiteCoproductEx =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      fam: IndexedFamilies.Family<I, O>,
      C: HasFiniteCoproducts<O, M> & Partial<HasInitial<O, M>>
    ) => {
      if (Ifin.carrier.length === 0) {
        const I0 = (C as HasInitial<O, M>).initialObj
        return {
          coproduct: I0,
          injections: (_: I): M => {
            throw new Error('no injections into empty coproduct')
          }
        }
      }
      return finiteCoproduct(Ifin, fam, C)
    }

  /** Helper: list fiber objects and remember which j they came from */
  const fiberObjs =
    <J, I, O>(
      Jfin: IndexedFamilies.FiniteIndex<J>,
      u: (j: J) => I,
      i: I,
      F: IndexedFamilies.Family<J, O>
    ): ReadonlyArray<{ j: J; obj: O }> => {
      const js = Jfin.carrier.filter((j) => u(j) === i)
      return js.map((j) => ({ j, obj: F(j) }))
    }

  /** LEFT KAN: Lan_u F at i is coproduct over fiber u^{-1}(i) */
  export const lanDiscretePre =
    <J, I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      Jfin: IndexedFamilies.FiniteIndex<J>,
      u: (j: J) => I,
      F: IndexedFamilies.Family<J, O>,
      C: HasFiniteCoproducts<O, M>
    ) => {
      // Precompute for each i
      const cacheObj = new Map<I, O>()
      const cacheInj = new Map<I, ReadonlyArray<readonly [J, M]>>()

      for (const i of Ifin.carrier) {
        const objs = fiberObjs(Jfin, u, i, F)
        if (objs.length === 0) continue
        const { obj, injections } = C.coproduct(objs.map(({ obj }) => obj))
        const injPairs = objs.map(({ j }, idx) => [j, injections[idx]!] as const)
        cacheObj.set(i, obj)
        cacheInj.set(i, injPairs)
      }

      return {
        at: (i: I) => cacheObj.get(i)!,
        injections: (i: I) => cacheInj.get(i) ?? []
      }
    }

  /** RIGHT KAN: Ran_u F at i is product over fiber u^{-1}(i) */
  export const ranDiscretePre =
    <J, I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      Jfin: IndexedFamilies.FiniteIndex<J>,
      u: (j: J) => I,
      F: IndexedFamilies.Family<J, O>,
      C: HasFiniteProducts<O, M>
    ) => {
      const cacheObj = new Map<I, O>()
      const cacheProj = new Map<I, ReadonlyArray<readonly [J, M]>>()

      for (const i of Ifin.carrier) {
        const objs = fiberObjs(Jfin, u, i, F)
        if (objs.length === 0) continue
        const { obj, projections } = C.product(objs.map(({ obj }) => obj))
        const projPairs = objs.map(({ j }, idx) => [j, projections[idx]!] as const)
        cacheObj.set(i, obj)
        cacheProj.set(i, projPairs)
      }

      return {
        at: (i: I) => cacheObj.get(i)!,
        projections: (i: I) => cacheProj.get(i) ?? []
      }
    }

  /** Product (limit) shape data */
  export interface Cone<I, O, M> {
    tip: O
    legs: IndexedFamilies.Family<I, M>
  }

  /** Coproduct (colimit) shape data */
  export interface Cocone<I, O, M> {
    coTip: O
    legs: IndexedFamilies.Family<I, M>
  }

  /** Trait for building product mediating maps */
  export interface HasProductMediators<O, M> extends HasFiniteProducts<O, M> {
    // build ⟨f_i⟩ : X -> ∏F(i) from legs f_i and known product object
    tuple: (domain: O, legs: ReadonlyArray<M>, product: O) => M
  }

  export type BinaryProductTuple<O, M> = CategoryBinaryProductTuple<O, M>

  export type BinaryProductSwapResult<O, M> = CategoryBinaryProductSwapResult<O, M>

  export type BinaryProductDiagonalFactor<O, M> = CategoryBinaryProductDiagonalFactor<O, M>

  export type BinaryProductComponentwiseInput<O, M> = CategoryBinaryProductComponentwiseInput<O, M>

  export type BinaryProductDiagonalPairingInput<O, M> = CategoryBinaryProductDiagonalPairingInput<O, M>

  export type BinaryProductInterchangeInput<O, M> = CategoryBinaryProductInterchangeInput<O, M>

  export type BinaryProductNaturalityInput<O, M> = CategoryBinaryProductNaturalityInput<O, M>

  export type BinaryProductUnitPointCompatibilityInput<O, M> = CategoryBinaryProductUnitPointCompatibilityInput<O, M>

  export interface BinaryProductUnitCategory<C, M> {
    readonly objects: ReadonlyArray<C>
    readonly arrows: ReadonlyArray<M>
    readonly eq: (a: M, b: M) => boolean
    readonly compose: (g: M, f: M) => M
    readonly id: (object: C) => M
    readonly src: (arrow: M) => C
    readonly dst: (arrow: M) => C
  }

  export interface BinaryProductUnitInput<O, C, M> {
    readonly category: BinaryProductUnitCategory<C, M>
    readonly product: BinaryProductTuple<O, M>
    readonly factor: BinaryProductDiagonalFactor<O, M>
    readonly projection: M
    readonly legs: readonly [M, M]
    readonly productIdentity: M
  }

  export interface BinaryProductUnitWitness<M> {
    readonly forward: M
    readonly backward: M
  }

  export const swapBinaryProduct = makeBinaryProductSwap as <O, M>(
    current: BinaryProductTuple<O, M>,
    swapped: BinaryProductTuple<O, M>,
  ) => BinaryProductSwapResult<O, M>

  export const diagonalBinaryProduct = makeBinaryProductDiagonal as <O, M>(
    product: BinaryProductTuple<O, M>,
    factor: BinaryProductDiagonalFactor<O, M>,
  ) => M

  export const componentwiseBinaryProduct = makeBinaryProductComponentwise as <O, M>(
    input: BinaryProductComponentwiseInput<O, M>,
  ) => M

  export const checkBinaryProductComponentwiseCollapse =
    checkBinaryProductComponentwiseCollapseHelper as <O, M>(
      input: CategoryBinaryProductComponentwiseCollapseInput<O, M>,
    ) => boolean

  export const checkBinaryProductNaturality = checkBinaryProductNaturalityHelper as <O, M>(
    input: BinaryProductNaturalityInput<O, M>,
  ) => boolean

  export const checkBinaryProductDiagonalPairing = checkBinaryProductDiagonalPairingHelper as <O, M>(
    input: BinaryProductDiagonalPairingInput<O, M>,
  ) => boolean

  export const checkBinaryProductInterchange = checkBinaryProductInterchangeHelper as <O, M>(
    input: BinaryProductInterchangeInput<O, M>,
  ) => boolean

  export const checkBinaryProductSwapCompatibility =
    checkBinaryProductSwapCompatibilityHelper as <O, M>(
      input: CategoryBinaryProductSwapCompatibilityInput<O, M>,
    ) => boolean

  export const checkBinaryProductUnitPointCompatibility =
    checkBinaryProductUnitPointCompatibilityHelper as <O, M>(
      input: BinaryProductUnitPointCompatibilityInput<O, M>,
    ) => boolean

  export const unitBinaryProduct = <O, C, M>({
    category,
    product,
    factor,
    projection,
    legs,
    productIdentity,
  }: BinaryProductUnitInput<O, C, M>): BinaryProductUnitWitness<M> => {
    if (legs.length !== 2) {
      throw new Error("CategoryLimits.unitBinaryProduct: expected exactly two legs")
    }

    const backward = product.tuple(factor.object, legs)
    const forward = projection

    const registry = category.arrows as M[]
    const eq = category.eq

    if (!registry.some((arrow) => eq(arrow, forward))) {
      registry.push(forward)
    }
    if (!registry.some((arrow) => eq(arrow, backward))) {
      registry.push(backward)
    }

    const compose = category.compose
    const identityFactor = factor.identity
    const identityProduct = productIdentity

    const forwardThenBackward = compose(forward, backward)
    if (!eq(forwardThenBackward, identityFactor)) {
      throw new Error(
        "CategoryLimits.unitBinaryProduct: forward ∘ backward must equal the identity on the factor",
      )
    }

    const backwardThenForward = compose(backward, forward)
    if (!eq(backwardThenForward, identityProduct)) {
      throw new Error(
        "CategoryLimits.unitBinaryProduct: backward ∘ forward must equal the identity on the product",
      )
    }

    const isoCategory = category as unknown as RegistryFiniteCategory<O, M>

    if (!isIso(isoCategory, forward)) {
      throw new Error("CategoryLimits.unitBinaryProduct: expected the forward arrow to be an isomorphism")
    }

    if (!isIso(isoCategory, backward)) {
      throw new Error("CategoryLimits.unitBinaryProduct: expected the backward arrow to be an isomorphism")
    }

    return { forward, backward }
  }

  /** Trait for building coproduct mediating maps */
  export interface HasCoproductMediators<O, M> extends HasFiniteCoproducts<O, M> {
    // build [g_i] : ⨁F(i) -> Y from legs g_i and known coproduct object
    cotuple: (coproduct: O, legs: ReadonlyArray<M>, codomain: O) => M
  }

  /** Generic product mediator builder */
  export const mediateProduct =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,             // objects F(i)
      C: HasProductMediators<O, M>,
      X: O,                                        // domain of legs
      legs: IndexedFamilies.Family<I, M>           // legs f_i : X -> F(i)
    ) => {
      const objs = Ifin.carrier.map((i) => F(i))
      const { obj: P, projections } = C.product(objs)
      const legsArr = Ifin.carrier.map((i) => legs(i))
      const mediator = C.tuple(X, legsArr, P)
      return {
        product: P,
        projections: (i: I) => projections[Ifin.carrier.indexOf(i)]!,
        mediator
      }
    }

  /** Generic coproduct mediator builder */
  export const mediateCoproduct =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,             // objects F(i)
      C: HasCoproductMediators<O, M>,
      Y: O,                                        // codomain of legs
      legs: IndexedFamilies.Family<I, M>           // legs g_i : F(i) -> Y
    ) => {
      const objs = Ifin.carrier.map((i) => F(i))
      const { obj: Cop, injections } = C.coproduct(objs)
      const legsArr = Ifin.carrier.map((i) => legs(i))
      const mediator = C.cotuple(Cop, legsArr, Y)
      return {
        coproduct: Cop,
        injections: (i: I) => injections[Ifin.carrier.indexOf(i)]!,
        mediator
      }
    }

  /** Check if object satisfies product universal property for given cone */
  export const isProductForCone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      productObj: O,
      projections: IndexedFamilies.Family<I, M>,
      cone: Cone<I, O, M>,                         // f_i : X -> F(i)
      tuple: (X: O, legs: ReadonlyArray<M>, P: O) => M,
      options?: { competitor?: M }
    ) => {
      const indices = Ifin.carrier
      const legsArr = indices.map((i) => cone.legs(i))
      const mediator = tuple(cone.tip, legsArr, productObj)
      const triangles = productMediates(C, eq, projections, mediator, cone, indices)
      let unique = triangles

      if (triangles) {
        const competitor = options?.competitor
        if (competitor) {
          const competitorTriangles = productMediates(C, eq, projections, competitor, cone, indices)
          if (competitorTriangles) {
            const agrees = agreeUnderProjections(C, eq, projections, mediator, competitor, indices)
            if (!agrees || !eq(competitor, mediator)) unique = false
          }
        }
      }
      return { triangles, unique }
    }

  /** Check if object satisfies coproduct universal property for given cocone */
  export const isCoproductForCocone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      coproductObj: O,
      injections: IndexedFamilies.Family<I, M>,
      cocone: Cocone<I, O, M>,                     // g_i : F(i) -> Y
      cotuple: (Cop: O, legs: ReadonlyArray<M>, Y: O) => M,
      options?: { competitor?: M }
    ) => {
      const indices = Ifin.carrier
      const legsArr = indices.map((i) => cocone.legs(i))
      const mediator = cotuple(coproductObj, legsArr, cocone.coTip)
      const triangles = coproductMediates(C, eq, injections, mediator, cocone, indices)
      let unique = triangles

      if (triangles) {
        const competitor = options?.competitor
        if (competitor) {
          const competitorTriangles = coproductMediates(C, eq, injections, competitor, cocone, indices)
          if (competitorTriangles) {
            const agrees = agreeUnderInjections(C, eq, injections, mediator, competitor, indices)
            if (!agrees || !eq(competitor, mediator)) unique = false
          }
        }
      }
      return { triangles, unique }
    }

  /** Do projections agree on mediators? */
  export const agreeUnderProjections =
    <I, O, M>(
      C: Category<O, M>,
      eq: (a: M, b: M) => boolean,
      projections: IndexedFamilies.Family<I, M>,
      mediator: M,
      competitor: M,
      indices: ReadonlyArray<I>
    ) => {
      for (const i of indices) {
        const lhs = C.compose(projections(i), mediator)
        const rhs = C.compose(projections(i), competitor)
        if (!eq(lhs, rhs)) return false
      }
      return true
    }

  /** Do injections agree on mediators? */
  export const agreeUnderInjections =
    <I, O, M>(
      C: Category<O, M>,
      eq: (a: M, b: M) => boolean,
      injections: IndexedFamilies.Family<I, M>,
      mediator: M,
      competitor: M,
      indices: ReadonlyArray<I>
    ) => {
      for (const i of indices) {
        const lhs = C.compose(mediator, injections(i))
        const rhs = C.compose(competitor, injections(i))
        if (!eq(lhs, rhs)) return false
      }
      return true
    }

  /** Does mediator satisfy universal property triangles? */
  export const productMediates =
    <I, O, M>(
      C: Category<O, M>,
      eq: (a: M, b: M) => boolean,
      projections: IndexedFamilies.Family<I, M>,
      mediator: M,
      cone: Cone<I, O, M>,
      indices: ReadonlyArray<I>
    ) => {
      for (const i of indices) {
        const composed = C.compose(projections(i), mediator)
        if (!eq(composed, cone.legs(i))) return false
      }
      return true
    }

  /** Does mediator satisfy coproduct universal property triangles? */
  export const coproductMediates =
    <I, O, M>(
      C: Category<O, M>,
      eq: (a: M, b: M) => boolean,
      injections: IndexedFamilies.Family<I, M>,
      mediator: M,
      cocone: Cocone<I, O, M>,
      indices: ReadonlyArray<I>
    ) => {
      for (const i of indices) {
        const composed = C.compose(mediator, injections(i))
        if (!eq(composed, cocone.legs(i))) return false
      }
      return true
    }
}
