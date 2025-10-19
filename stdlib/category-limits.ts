import type { FiniteCategory as FiniteCategoryT } from "../finite-cat"
import type { PullbackCalculator, PullbackData } from "../pullback"
import type { PushoutData } from "../pushout"
import { isIso } from "../kinds/inverses"
import { DiagramClosure } from "./diagram-closure"
import type { SmallCategory } from "../subcategory"
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
  export interface HasSmallProducts<O, M> {
    smallProduct: <I>(
      index: IndexedFamilies.SmallIndex<I>,
      family: IndexedFamilies.SmallFamily<I, O>,
    ) => { obj: O; projections: IndexedFamilies.SmallFamily<I, M> }
  }

  export interface HasSmallEqualizers<O, M> {
    smallEqualizer: <I>(
      index: IndexedFamilies.SmallIndex<I>,
      parallel: IndexedFamilies.SmallFamily<I, M>,
    ) => { obj: O; equalize: IndexedFamilies.SmallFamily<I, M> }
  }

  export interface HasSmallProductMediators<O, M> extends HasProductMediators<O, M> {
    smallProduct: HasSmallProducts<O, M>["smallProduct"]
  }

  /** Category with finite coproducts */
  export interface HasFiniteCoproducts<O, M> {
    coproduct: (xs: ReadonlyArray<O>) => { obj: O; injections: ReadonlyArray<M> }
  }

  /** Category with finite products */
  export interface HasFiniteProducts<O, M> {
    product: (xs: ReadonlyArray<O>) => { obj: O; projections: ReadonlyArray<M> }
    smallProduct?: HasSmallProducts<O, M>['smallProduct']
  }

  /** Category with equalizers */
  export interface HasEqualizers<O, M> {
    // equalizer of f,g : X -> Y returns E --e--> X s.t. f∘e = g∘e and universal
    equalizer: (f: M, g: M) => { obj: O; equalize: M }
    smallEqualizer?: HasSmallEqualizers<O, M>['smallEqualizer']
  }

  export interface EqualizerFactorizationResult<M> {
    readonly factored: boolean
    readonly mediator?: M
    readonly reason?: string
  }

  export type EqualizerFactorizer<M> = (input: {
    readonly left: M
    readonly right: M
    readonly inclusion: M
    readonly fork: M
  }) => EqualizerFactorizationResult<M>

  export interface CoequalizerFactorizationResult<M> {
    readonly factored: boolean
    readonly mediator?: M
    readonly reason?: string
  }

  export type CoequalizerFactorizer<M> = (input: {
    readonly left: M
    readonly right: M
    readonly coequalizer: M
    readonly fork: M
  }) => CoequalizerFactorizationResult<M>

  export interface EqualizerFromPullbacksInput<O, M> {
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly terminal: HasTerminal<O, M>
    readonly products: HasProductMediators<O, M>
    readonly pullbacks: PullbackCalculator<O, M>
    readonly eq?: (left: M, right: M) => boolean
  }

  export interface EqualizerFromPullbackSpanWitness<O, M> {
    readonly left: M
    readonly right: M
    readonly product: { readonly obj: O; readonly projections: readonly [M, M] }
    readonly diagonal: M
    readonly pairing: M
    readonly pullback: PullbackData<O, M>
    readonly inclusion: M
    readonly anchor: M
  }

  export interface EqualizerFromPullbacksWitness<O, M> {
    readonly equalizer: HasEqualizers<O, M>["equalizer"]
    readonly factorEqualizer: EqualizerFactorizer<M>
    readonly spanWitness: (left: M, right: M) => EqualizerFromPullbackSpanWitness<O, M>
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

  /** Category equipped with a subobject classifier */
  export interface SubobjectClassifierCategory<O, M>
    extends Category<O, M>,
      ArrowFamilies.HasDomCod<O, M>,
      HasTerminal<O, M>,
      HasInitial<O, M> {
    readonly terminate: (X: O) => M
    readonly truthValues: O
    readonly truthArrow: M
    readonly initialArrow: (X: O) => M
    characteristic: (monomorphism: M) => M
    subobjectFromCharacteristic: (
      characteristic: M,
    ) => { readonly subobject: O; readonly inclusion: M }
  }

  /** Category with finite colimits */
  export interface FinitelyCocompleteCategory<O, M>
    extends Category<O, M>,
      ArrowFamilies.HasDomCod<O, M>,
      HasInitial<O, M>,
      HasProductMediators<O, M>,
      HasCoproductMediators<O, M>,
      HasCoequalizers<O, M> {
    readonly pushout: (left: M, right: M) => PushoutData<O, M>
    readonly initialArrow: (target: O) => M
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
      if (
        "smallProduct" in C &&
        typeof C.smallProduct === "function"
      ) {
        const small = (C as HasSmallProducts<O, M>).smallProduct(
          IndexedFamilies.finiteIndex(Ifin.carrier),
          fam,
        )
        const projections = Ifin.carrier.map((i) => small.projections(i))
        const projFam = (i: I) => projections[Ifin.carrier.indexOf(i)]!
        return { product: small.obj, projections: projFam }
      }
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

  export interface DiagramArrow<I, M> {
    readonly source: I
    readonly target: I
    readonly morphism: M
  }

  export interface Diagram<I, M> {
    readonly arrows: ReadonlyArray<DiagramArrow<I, M>>
  }

  export interface SmallDiagram<I, A, O, M> {
    readonly shape: SmallCategory<I, A>
    readonly objectIndex: IndexedFamilies.SmallIndex<I>
    readonly onObjects: IndexedFamilies.SmallFamily<I, O>
    readonly arrowIndex: IndexedFamilies.SmallIndex<A>
    readonly onMorphisms: IndexedFamilies.SmallFamily<A, M>
  }

  export interface FiniteDiagram<I, A, O, M> {
    readonly shape: FiniteCategoryT<I, A>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly onMorphisms: (arrow: A) => M
  }

  export const makeFiniteDiagram = <I, A, O, M>(input: {
    readonly shape: FiniteCategoryT<I, A>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly onMorphisms: (arrow: A) => M
  }): FiniteDiagram<I, A, O, M> => {
    const { shape, onObjects, onMorphisms } = input
    for (const object of shape.objects) {
      onObjects(object)
    }
    shape.arrows.forEach((arrow) => {
      onMorphisms(arrow)
    })
    return { shape, onObjects, onMorphisms }
  }

  interface DiscreteDiagramArrow<I> {
    readonly source: I
    readonly target: I
  }

  export const finiteDiagramFromDiscrete = <I, O, M>(input: {
    readonly base: Category<O, M>
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
  }): FiniteDiagram<I, DiscreteDiagramArrow<I>, O, M> => {
    const { base, indices, onObjects } = input
    const objects = indices.carrier.slice()
    const arrows = objects.map((object) => ({ source: object, target: object }))
    const shape: FiniteCategoryT<I, DiscreteDiagramArrow<I>> = {
      objects,
      arrows,
      id: (object) => ({ source: object, target: object }),
      compose: (g, f) => {
        if (f.source !== f.target || g.source !== g.target || f.target !== g.source) {
          throw new Error('finiteDiagramFromDiscrete: non-identity composition requested')
        }
        return { source: f.source, target: g.target }
      },
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq: (left, right) => left.source === right.source && left.target === right.target,
    }

    const onMorphisms = (arrow: DiscreteDiagramArrow<I>): M => {
      if (arrow.source !== arrow.target) {
        throw new Error('finiteDiagramFromDiscrete: only identity arrows are present')
      }
      return base.id(onObjects(arrow.source))
    }

    return { shape, onObjects, onMorphisms }
  }

  export interface FinitePosetShape<I> {
    readonly objects: ReadonlyArray<I>
    readonly leq: (a: I, b: I) => boolean
  }

  export interface PosetCoverArrow<I, M> {
    readonly source: I
    readonly target: I
    readonly morphism: M
  }

  interface PosetDiagramArrow<I> {
    readonly source: I
    readonly target: I
  }

  const posetKey = <I>(source: I, target: I): string => `${String(source)}→${String(target)}`

  export const finiteDiagramFromPoset = <I, O, M>(input: {
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly poset: FinitePosetShape<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cover: ReadonlyArray<PosetCoverArrow<I, M>>
  }): FiniteDiagram<I, PosetDiagramArrow<I>, O, M> => {
    const { base, eq, poset, onObjects, cover } = input
    const objects = poset.objects.slice()
    const adjacency = new Map<I, Array<PosetCoverArrow<I, M>>>()
    const coverKeys = new Set<string>()

    for (const arrow of cover) {
      if (!poset.leq(arrow.source, arrow.target) || arrow.source === arrow.target) {
        throw new Error('finiteDiagramFromPoset: cover arrows must respect the partial order and be non-identity')
      }
      const expectedDom = onObjects(arrow.source)
      const expectedCod = onObjects(arrow.target)
      if (base.dom(arrow.morphism) !== expectedDom || base.cod(arrow.morphism) !== expectedCod) {
        throw new Error('finiteDiagramFromPoset: cover arrow does not match object assignment')
      }
      const key = posetKey(arrow.source, arrow.target)
      if (coverKeys.has(key)) {
        throw new Error('finiteDiagramFromPoset: duplicate cover arrow detected')
      }
      coverKeys.add(key)
      const list = adjacency.get(arrow.source)
      if (list) {
        list.push(arrow)
      } else {
        adjacency.set(arrow.source, [arrow])
      }
    }

    const arrowCache = new Map<string, M>()
    for (const object of objects) {
      const id = base.id(onObjects(object))
      arrowCache.set(posetKey(object, object), id)
    }

    const bfsFrom = (origin: I) => {
      const queue: I[] = [origin]
      const seen = new Set<I>([origin])
      while (queue.length > 0) {
        const current = queue.shift()!
        const baseArrow = arrowCache.get(posetKey(origin, current))
        if (!baseArrow) continue
        const outgoing = adjacency.get(current) ?? []
        for (const edge of outgoing) {
          const composite = base.compose(edge.morphism, baseArrow)
          const key = posetKey(origin, edge.target)
          const existing = arrowCache.get(key)
          if (existing) {
            if (!eq(existing, composite)) {
              throw new Error('finiteDiagramFromPoset: inconsistent composites detected')
            }
          } else {
            arrowCache.set(key, composite)
          }
          if (!seen.has(edge.target)) {
            seen.add(edge.target)
            queue.push(edge.target)
          }
        }
      }
    }

    for (const object of objects) {
      bfsFrom(object)
    }

    for (const source of objects) {
      for (const target of objects) {
        if (!poset.leq(source, target)) continue
        const key = posetKey(source, target)
        const cached = arrowCache.get(key)
        if (!cached) {
          throw new Error('finiteDiagramFromPoset: cover data does not generate required composites')
        }
        const expectedDom = onObjects(source)
        const expectedCod = onObjects(target)
        if (base.dom(cached) !== expectedDom || base.cod(cached) !== expectedCod) {
          throw new Error('finiteDiagramFromPoset: generated morphism has mismatched domain or codomain')
        }
      }
    }

    const arrows: PosetDiagramArrow<I>[] = []
    for (const source of objects) {
      for (const target of objects) {
        if (!poset.leq(source, target)) continue
        arrows.push({ source, target })
      }
    }

    const shape: FiniteCategoryT<I, PosetDiagramArrow<I>> = {
      objects,
      arrows,
      id: (object) => ({ source: object, target: object }),
      compose: (g, f) => {
        if (f.target !== g.source) {
          throw new Error('finiteDiagramFromPoset: attempt to compose non-composable arrows')
        }
        return { source: f.source, target: g.target }
      },
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq: (left, right) => left.source === right.source && left.target === right.target,
    }

    const onMorphisms = (arrow: PosetDiagramArrow<I>): M => {
      const morphism = arrowCache.get(posetKey(arrow.source, arrow.target))
      if (!morphism) {
        throw new Error('finiteDiagramFromPoset: missing morphism for requested arrow')
      }
      return morphism
    }

    return { shape, onObjects, onMorphisms }
  }

  type DiagramLike<I, O, M> = Diagram<I, M> | FiniteDiagram<I, any, O, M> | SmallDiagram<I, any, O, M>

  const isFiniteDiagram = <I, O, M>(value: DiagramLike<I, O, M>): value is FiniteDiagram<I, any, O, M> =>
    typeof (value as FiniteDiagram<I, any, O, M>).onMorphisms === 'function' &&
    typeof (value as FiniteDiagram<I, any, O, M>).onObjects === 'function' &&
    typeof (value as FiniteDiagram<I, any, O, M>).shape === 'object' &&
    Array.isArray((value as FiniteDiagram<I, any, O, M>).shape.objects)

  const isSmallDiagram = <I, A, O, M>(value: DiagramLike<I, O, M>): value is SmallDiagram<I, A, O, M> =>
    typeof (value as SmallDiagram<I, A, O, M>).onMorphisms === 'function' &&
    typeof (value as SmallDiagram<I, A, O, M>).onObjects === 'function' &&
    typeof (value as SmallDiagram<I, A, O, M>).shape === 'object' &&
    value !== undefined &&
    (value as SmallDiagram<I, A, O, M>).objectIndex !== undefined &&
    (value as SmallDiagram<I, A, O, M>).arrowIndex !== undefined

  const enumerateDiagramArrows = <I, O, M>(diagram: DiagramLike<I, O, M>): ReadonlyArray<DiagramArrow<I, M>> => {
    if (isFiniteDiagram(diagram)) {
      return diagram.shape.arrows.map((arrow) => ({
        source: diagram.shape.src(arrow),
        target: diagram.shape.dst(arrow),
        morphism: diagram.onMorphisms(arrow),
      }))
    }
    if (isSmallDiagram(diagram)) {
      const arrows = IndexedFamilies.materialiseSmallIndex(diagram.arrowIndex)
      return arrows.map((arrow) => ({
        source: diagram.shape.src(arrow),
        target: diagram.shape.dst(arrow),
        morphism: diagram.onMorphisms(arrow),
      }))
    }
    return diagram.arrows
  }

  export interface FiniteDiagramCheckResult {
    readonly holds: boolean
    readonly issues: ReadonlyArray<string>
  }

  export const checkFiniteDiagramFunctoriality = <I, A, O, M>(input: {
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly diagram: FiniteDiagram<I, A, O, M>
  }): FiniteDiagramCheckResult => {
    const { base, eq, diagram } = input
    const issues: string[] = []
    for (const object of diagram.shape.objects) {
      const assigned = diagram.onObjects(object)
      const diagId = diagram.onMorphisms(diagram.shape.id(object))
      const baseId = base.id(assigned)
      if (!eq(diagId, baseId)) {
        issues.push(`identity mismatch at object ${String(object)}`)
      }
      if (base.dom(diagId) !== assigned || base.cod(diagId) !== assigned) {
        issues.push(`identity arrow has incorrect domain or codomain at ${String(object)}`)
      }
    }

    for (const arrow of diagram.shape.arrows) {
      const morphism = diagram.onMorphisms(arrow)
      const source = diagram.onObjects(diagram.shape.src(arrow))
      const target = diagram.onObjects(diagram.shape.dst(arrow))
      if (base.dom(morphism) !== source) {
        issues.push(`domain mismatch for arrow ${String(posetKey(diagram.shape.src(arrow), diagram.shape.dst(arrow)))}`)
      }
      if (base.cod(morphism) !== target) {
        issues.push(`codomain mismatch for arrow ${String(posetKey(diagram.shape.src(arrow), diagram.shape.dst(arrow)))}`)
      }
    }

    for (const f of diagram.shape.arrows) {
      for (const g of diagram.shape.arrows) {
        if (diagram.shape.dst(f) !== diagram.shape.src(g)) continue
        const compositeArrow = diagram.shape.compose(g, f)
        const lhs = diagram.onMorphisms(compositeArrow)
        const rhs = base.compose(diagram.onMorphisms(g), diagram.onMorphisms(f))
        if (!eq(lhs, rhs)) {
          issues.push(
            `composition mismatch for ${String(posetKey(diagram.shape.src(f), diagram.shape.dst(g)))} via ${String(
              posetKey(diagram.shape.src(f), diagram.shape.dst(f)),
            )} then ${String(posetKey(diagram.shape.src(g), diagram.shape.dst(g)))}`,
          )
        }
      }
    }

    return { holds: issues.length === 0, issues }
  }

  export const composeFiniteDiagramPath = <I, A, O, M>(input: {
    readonly base: Category<O, M>
    readonly diagram: FiniteDiagram<I, A, O, M>
    readonly path: ReadonlyArray<A>
    readonly start?: I
  }):
    | { defined: true; composite: M; source: I; target: I }
    | { defined: false; reason: string } => {
    const { base, diagram, path, start } = input
    if (path.length === 0) {
      if (start === undefined) {
        return { defined: false, reason: 'composeFiniteDiagramPath: empty path requires explicit start object' }
      }
      const object = diagram.onObjects(start)
      return { defined: true, composite: base.id(object), source: start, target: start }
    }

    const first = path[0]!
    const rest = path.slice(1)
    const initialSource = diagram.shape.src(first)
    let currentTarget = diagram.shape.dst(first)
    let composite = diagram.onMorphisms(first)

    for (const arrow of rest) {
      const source = diagram.shape.src(arrow)
      if (source !== currentTarget) {
        return { defined: false, reason: 'composeFiniteDiagramPath: non-composable arrows encountered' }
      }
      const morphism = diagram.onMorphisms(arrow)
      composite = base.compose(morphism, composite)
      currentTarget = diagram.shape.dst(arrow)
    }

    return { defined: true, composite, source: initialSource, target: currentTarget }
  }

  /** Product (limit) shape data */
  export interface Cone<I, O, M> {
    tip: O
    legs: IndexedFamilies.Family<I, M>
    diagram: DiagramLike<I, O, M>
  }

  export interface ConeMorphism<I, O, M> {
    readonly source: Cone<I, O, M>
    readonly target: Cone<I, O, M>
    readonly mediator: M
  }

  export interface ConeCategoryResult<I, O, M> {
    readonly category: FiniteCategoryT<Cone<I, O, M>, ConeMorphism<I, O, M>>
    readonly locateCone: (cone: Cone<I, O, M>) => Cone<I, O, M> | undefined
    readonly morphisms: (
      source: Cone<I, O, M>,
      target: Cone<I, O, M>,
    ) => ReadonlyArray<ConeMorphism<I, O, M>>
  }

  export interface ConeTerminalityWitness<I, O, M> {
    readonly locatedLimit?: Cone<I, O, M>
    readonly mediators: ReadonlyArray<{ source: Cone<I, O, M>; arrow: ConeMorphism<I, O, M> }>
    readonly holds: boolean
    readonly failure?: { source: Cone<I, O, M>; arrows: ReadonlyArray<ConeMorphism<I, O, M>> }
  }

  const isFiniteCategoryStructure = <O, M>(
    C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  ): C is Category<O, M> & ArrowFamilies.HasDomCod<O, M> & FiniteCategoryT<O, M> => {
    const candidate = C as Partial<FiniteCategoryT<O, M> & Category<O, M>>
    return (
      Array.isArray(candidate?.objects) &&
      Array.isArray(candidate?.arrows) &&
      typeof candidate?.eq === "function" &&
      typeof candidate?.id === "function" &&
      typeof candidate?.compose === "function"
    )
  }

  export const makeConeCategory = <I, O, M>(input: {
    readonly base: FiniteCategoryT<O, M> & Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly Ifin: IndexedFamilies.FiniteIndex<I>
    readonly F: IndexedFamilies.Family<I, O>
    readonly diagram: DiagramLike<I, O, M>
  }): ConeCategoryResult<I, O, M> => {
    const { base, eq = base.eq, Ifin, F, diagram } = input

    if (!eq) {
      throw new Error("CategoryLimits.makeConeCategory: base category must supply equality on morphisms")
    }

    const indices = Ifin.carrier
    const includesIndex = (value: I): boolean => indices.some((candidate) => candidate === value)
    const diagramArrows = enumerateDiagramArrows(diagram)

    if (isFiniteDiagram(diagram)) {
      for (const object of diagram.shape.objects) {
        if (!includesIndex(object)) {
          throw new Error(
            "CategoryLimits.makeConeCategory: finite diagram contains an object outside the supplied indices",
          )
        }
      }
      for (const index of indices) {
        if (!diagram.shape.objects.some((candidate) => candidate === index)) {
          throw new Error(
            "CategoryLimits.makeConeCategory: index family includes an object missing from the diagram",
          )
        }
        const assigned = diagram.onObjects(index)
        const advertised = F(index)
        if (assigned !== advertised) {
          throw new Error(
            "CategoryLimits.makeConeCategory: diagram object assignment disagrees with the supplied family",
          )
        }
      }
      const functoriality = checkFiniteDiagramFunctoriality({ base, eq, diagram })
      if (!functoriality.holds) {
        throw new Error(
          `CategoryLimits.makeConeCategory: diagram fails functoriality checks: ${functoriality.issues.join('; ')}`,
        )
      }
    }

    for (const arrow of diagramArrows) {
      if (!includesIndex(arrow.source) || !includesIndex(arrow.target)) {
        throw new Error(
          "CategoryLimits.makeConeCategory: diagram references an index outside the supplied finite family",
        )
      }
    }

    type EnumeratedCone = Cone<I, O, M> & { readonly legsMap: ReadonlyMap<I, M> }

    const cones: EnumeratedCone[] = []

    const conesEqual = (left: EnumeratedCone, right: Cone<I, O, M>): boolean => {
      if (left.tip !== right.tip) return false
      for (const index of indices) {
        const expected = left.legsMap.get(index)
        if (expected === undefined) return false
        const candidate = right.legs(index)
        if (!eq(expected, candidate)) return false
      }
      return true
    }

    const locateCone = (candidate: Cone<I, O, M>): EnumeratedCone | undefined =>
      cones.find((existing) => conesEqual(existing, candidate))

    const addCone = (cone: EnumeratedCone): void => {
      if (!locateCone(cone)) {
        cones.push(cone)
      }
    }

    if (indices.length === 0 && diagramArrows.length > 0) {
      throw new Error(
        "CategoryLimits.makeConeCategory: non-empty diagram requires indices in the supplied finite family",
      )
    }

    for (const tip of base.objects) {
      if (indices.length === 0) {
        const legsMap = new Map<I, M>()
        const cone: EnumeratedCone = {
          tip,
          legs: (index: I) => {
            throw new Error(
              `CategoryLimits.makeConeCategory: no legs available for index ${String(index)} in an empty diagram`,
            )
          },
          diagram,
          legsMap,
        }
        addCone(cone)
        continue
      }

      const options = indices.map((index) =>
        base.arrows.filter((arrow) => base.src(arrow) === tip && base.dst(arrow) === F(index)),
      )

      if (options.some((choices) => choices.length === 0)) continue

      const assignments: M[] = new Array(indices.length)

      const buildCone = (position: number) => {
        if (position === indices.length) {
          const legsMap = new Map<I, M>()
          indices.forEach((index, idx) => legsMap.set(index, assignments[idx]!))
          const cone: EnumeratedCone = {
            tip,
            legs: (index: I) => {
              const leg = legsMap.get(index)
              if (leg === undefined) {
                throw new Error(
                  `CategoryLimits.makeConeCategory: missing leg for index ${String(index)} in enumerated cone`,
                )
              }
              return leg
            },
            diagram,
            legsMap,
          }
          if (coneRespectsDiagram(base, eq, cone)) {
            addCone(cone)
          }
          return
        }

        for (const arrow of options[position]!) {
          assignments[position] = arrow
          buildCone(position + 1)
        }
      }

      buildCone(0)
    }

    const morphisms: ConeMorphism<I, O, M>[] = []

    const arrowEq = (left: ConeMorphism<I, O, M>, right: ConeMorphism<I, O, M>) =>
      left.source === right.source && left.target === right.target && eq(left.mediator, right.mediator)

    const addMorphism = (morphism: ConeMorphism<I, O, M>): void => {
      if (!morphisms.some((existing) => arrowEq(existing, morphism))) {
        morphisms.push(morphism)
      }
    }

    for (const cone of cones) {
      const identity = base.id(cone.tip)
      addMorphism({ source: cone, target: cone, mediator: identity })
    }

    for (const arrow of base.arrows) {
      const domain = base.dom(arrow)
      const codomain = base.cod(arrow)
      const sources = cones.filter((cone) => cone.tip === domain)
      const targets = cones.filter((cone) => cone.tip === codomain)
      for (const sourceCone of sources) {
        for (const targetCone of targets) {
          let commutes = true
          for (const index of indices) {
            const composed = base.compose(targetCone.legs(index), arrow)
            const expected = sourceCone.legs(index)
            if (!eq(composed, expected)) {
              commutes = false
              break
            }
          }
          if (commutes) {
            addMorphism({ source: sourceCone, target: targetCone, mediator: arrow })
          }
        }
      }
    }

    const findMorphism = (
      source: EnumeratedCone,
      target: EnumeratedCone,
      mediator: M,
    ): ConeMorphism<I, O, M> => {
      const found = morphisms.find(
        (arrow) => arrow.source === source && arrow.target === target && eq(arrow.mediator, mediator),
      )
      if (!found) {
        throw new Error("CategoryLimits.makeConeCategory: mediator not present in cone category")
      }
      return found
    }

    const objects = cones as ReadonlyArray<Cone<I, O, M>>
    const arrows = morphisms as ReadonlyArray<ConeMorphism<I, O, M>>

    const category: FiniteCategoryT<Cone<I, O, M>, ConeMorphism<I, O, M>> = {
      objects,
      arrows,
      id: (object) => findMorphism(object as EnumeratedCone, object as EnumeratedCone, base.id(object.tip)),
      compose: (g, f) => {
        if (f.target !== g.source) {
          throw new Error("CategoryLimits.makeConeCategory: morphism composition domain mismatch")
        }
        const mediator = base.compose(g.mediator, f.mediator)
        return findMorphism(f.source as EnumeratedCone, g.target as EnumeratedCone, mediator)
      },
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq: arrowEq,
    }

    const morphismsBetween = (
      source: Cone<I, O, M>,
      target: Cone<I, O, M>,
    ): ReadonlyArray<ConeMorphism<I, O, M>> => {
      const locatedSource = locateCone(source)
      const locatedTarget = locateCone(target)
      if (!locatedSource || !locatedTarget) return []
      return morphisms.filter((arrow) => arrow.source === locatedSource && arrow.target === locatedTarget)
    }

    return {
      category,
      locateCone,
      morphisms: morphismsBetween,
    }
  }

  export const checkTerminalCone = <I, O, M>(
    category: ConeCategoryResult<I, O, M>,
    candidate: Cone<I, O, M>,
  ): ConeTerminalityWitness<I, O, M> => {
    const locatedLimit = category.locateCone(candidate)
    if (!locatedLimit) {
      return { holds: false, mediators: [], failure: { source: candidate, arrows: [] } }
    }

    const witnesses: Array<{ source: Cone<I, O, M>; arrow: ConeMorphism<I, O, M> }> = []
    const identity = category.category.id(locatedLimit)

    for (const cone of category.category.objects) {
      const arrows = category.morphisms(cone, locatedLimit)
      if (arrows.length !== 1) {
        return { holds: false, locatedLimit, mediators: witnesses, failure: { source: cone, arrows } }
      }
      const arrow = arrows[0]!
      witnesses.push({ source: cone, arrow })
      if (cone === locatedLimit && !category.category.eq(arrow, identity)) {
        return { holds: false, locatedLimit, mediators: witnesses, failure: { source: cone, arrows } }
      }
    }

    return { holds: true, locatedLimit, mediators: witnesses }
  }

  export interface LimitOfDiagramResult<I, O, M> {
    readonly cone: Cone<I, O, M>
    readonly factor: (candidate: Cone<I, O, M>) => { holds: boolean; mediator?: M; reason?: string }
    readonly coneCategory: ConeCategoryResult<I, O, M>
    readonly terminality: ConeTerminalityWitness<I, O, M>
  }

  export interface SmallLimitFromProductsAndEqualizersInput<I, A, O, M> {
    readonly base: Category<O, M> &
      ArrowFamilies.HasDomCod<O, M> &
      HasSmallProducts<O, M> &
      HasSmallEqualizers<O, M>
    readonly products: HasSmallProductMediators<O, M>
    readonly diagram: SmallDiagram<I, A, O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly factorEqualizer: EqualizerFactorizer<M>
    readonly guard?: { readonly objects?: number; readonly arrows?: number }
  }

  export interface SmallLimitFromProductsAndEqualizersWitness<I, O, M> {
    readonly product: { readonly obj: O; readonly projections: IndexedFamilies.SmallFamily<I, M> }
    readonly pair: readonly [M, M]
    readonly equalizer: { readonly obj: O; readonly equalize: M }
    readonly cone: Cone<I, O, M>
    readonly factor: (candidate: Cone<I, O, M>) => EqualizerFactorizationResult<M>
  }

  export const smallLimitFromProductsAndEqualizers = <I, A, O, M>(
    input: SmallLimitFromProductsAndEqualizersInput<I, A, O, M>,
  ): SmallLimitFromProductsAndEqualizersWitness<I, O, M> => {
    const { base, products, diagram, factorEqualizer } = input
    const eq = input.eq ?? (base as { eq?: (a: M, b: M) => boolean }).eq

    if (!eq) {
      throw new Error(
        'CategoryLimits.smallLimitFromProductsAndEqualizers: base category must supply morphism equality',
      )
    }

    const guard = input.guard ?? {}
    const objectCarrier = IndexedFamilies.materialiseSmallIndex(
      diagram.objectIndex,
      guard.objects !== undefined ? { maxSize: guard.objects } : {},
    )

    if (objectCarrier.length === 0) {
      throw new Error(
        'CategoryLimits.smallLimitFromProductsAndEqualizers: diagram must contain at least one object',
      )
    }

    const arrowCarrier = IndexedFamilies.materialiseSmallIndex(
      diagram.arrowIndex,
      guard.arrows !== undefined ? { maxSize: guard.arrows } : {},
    )

    const objectFamily = diagram.onObjects

    const smallProduct = products.smallProduct
    if (!smallProduct) {
      throw new Error(
        'CategoryLimits.smallLimitFromProductsAndEqualizers: product mediators must provide smallProduct witness',
      )
    }
    const productWitness = smallProduct(diagram.objectIndex, objectFamily)

    const getProjection = (index: I): M => productWitness.projections(index)

    const arrowTargetsFamily: IndexedFamilies.SmallFamily<A, O> = (arrow) => {
      const target = diagram.shape.dst(arrow)
      return diagram.onObjects(target)
    }

    const arrowProductWitness = smallProduct(diagram.arrowIndex, arrowTargetsFamily)

    const arrowSourceLegs: M[] = arrowCarrier.map((arrow) => {
      const sourceIndex = diagram.shape.src(arrow)
      const morphism = diagram.onMorphisms(arrow)
      return base.compose(morphism, getProjection(sourceIndex))
    })

    const arrowTargetLegs: M[] = arrowCarrier.map((arrow) => {
      const targetIndex = diagram.shape.dst(arrow)
      return getProjection(targetIndex)
    })

    const deltaSource = products.tuple(productWitness.obj, arrowSourceLegs, arrowProductWitness.obj)
    const deltaTarget = products.tuple(productWitness.obj, arrowTargetLegs, arrowProductWitness.obj)

    const equalizerIndex = IndexedFamilies.finiteIndex([0 as const, 1 as const])
    const equalizerWitness = base.smallEqualizer(equalizerIndex, (position) =>
      position === 0 ? deltaSource : deltaTarget,
    )

    const inclusion = equalizerWitness.equalize(equalizerIndex.carrier[0]!)

    const limitLegs: IndexedFamilies.SmallFamily<I, M> = (index) =>
      base.compose(getProjection(index), inclusion)

    const limitCone: Cone<I, O, M> = { tip: equalizerWitness.obj, legs: limitLegs, diagram }

    const validateCone = (candidate: Cone<I, O, M>): ConeValidationResult => {
      if (candidate.diagram !== diagram) {
        return {
          valid: false,
          reason: 'CategoryLimits.smallLimitFromProductsAndEqualizers: candidate references a different diagram',
        }
      }

      for (const index of objectCarrier) {
        const leg = candidate.legs(index)
        if (base.dom(leg) !== candidate.tip) {
          return {
            valid: false,
            reason: `CategoryLimits.smallLimitFromProductsAndEqualizers: leg ${String(
              index,
            )} has incorrect domain`,
          }
        }
        const expectedCodomain = diagram.onObjects(index)
        if (base.cod(leg) !== expectedCodomain) {
          return {
            valid: false,
            reason: `CategoryLimits.smallLimitFromProductsAndEqualizers: leg ${String(
              index,
            )} has incorrect codomain`,
          }
        }
      }

      for (const arrow of arrowCarrier) {
        const source = diagram.shape.src(arrow)
        const target = diagram.shape.dst(arrow)
        const morphism = diagram.onMorphisms(arrow)
        const transported = base.compose(morphism, candidate.legs(source))
        const expected = candidate.legs(target)
        if (!eq(transported, expected)) {
          return {
            valid: false,
            reason: `CategoryLimits.smallLimitFromProductsAndEqualizers: leg ${String(
              target,
            )} does not commute with arrow ${String(source)}→${String(target)}`,
          }
        }
      }

      return { valid: true }
    }

    const factor = (candidate: Cone<I, O, M>): EqualizerFactorizationResult<M> => {
      const validation = validateCone(candidate)
      if (!validation.valid) {
        return validation.reason
          ? { factored: false, reason: validation.reason }
          : { factored: false }
      }

      const legsArr = objectCarrier.map((index) => candidate.legs(index))
      const fork = products.tuple(candidate.tip, legsArr, productWitness.obj)

      const report = factorEqualizer({
        left: deltaSource,
        right: deltaTarget,
        inclusion,
        fork,
      })

      if (!report.factored || !report.mediator) {
        return {
          factored: false,
          reason:
            report.reason ??
            'CategoryLimits.smallLimitFromProductsAndEqualizers: equalizer factorization failed',
        }
      }

      if (base.dom(report.mediator) !== candidate.tip || base.cod(report.mediator) !== limitCone.tip) {
        return {
          factored: false,
          reason:
            'CategoryLimits.smallLimitFromProductsAndEqualizers: mediator shape does not match the cones',
        }
      }

      for (const index of objectCarrier) {
        const expected = candidate.legs(index)
        const projection = getProjection(index)
        const recomposed = base.compose(projection, report.mediator)
        if (!eq(recomposed, expected)) {
          return {
            factored: false,
            reason: `CategoryLimits.smallLimitFromProductsAndEqualizers: mediator does not reproduce leg ${String(
              index,
            )}`,
          }
        }
      }

      return { factored: true, mediator: report.mediator }
    }

    const projections: IndexedFamilies.SmallFamily<I, M> = (index) => getProjection(index)

    return {
      product: { obj: productWitness.obj, projections },
      pair: [deltaSource, deltaTarget],
      equalizer: { obj: equalizerWitness.obj, equalize: inclusion },
      cone: limitCone,
      factor,
    }
  }

  export interface LimitFromProductsAndEqualizersInput<I, A, O, M> {
    readonly base: Category<O, M> &
      ArrowFamilies.HasDomCod<O, M> &
      HasFiniteProducts<O, M> &
      HasEqualizers<O, M>
    readonly products: HasProductMediators<O, M>
    readonly diagram: FiniteDiagram<I, A, O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly factorEqualizer: EqualizerFactorizer<M>
  }

  export interface LimitFromProductsAndEqualizersWitness<I, O, M> {
    readonly product: { readonly obj: O; readonly projections: IndexedFamilies.Family<I, M> }
    readonly pair: readonly [M, M]
    readonly equalizer: { readonly obj: O; readonly equalize: M }
    readonly cone: Cone<I, O, M>
    readonly factor: (candidate: Cone<I, O, M>) => EqualizerFactorizationResult<M>
  }

  export const limitFromProductsAndEqualizers = <I, A, O, M>(
    input: LimitFromProductsAndEqualizersInput<I, A, O, M>,
  ): LimitFromProductsAndEqualizersWitness<I, O, M> => {
    const { base, products, diagram, factorEqualizer } = input
    const eq = input.eq ?? base.eq

    if (!eq) {
      throw new Error(
        'CategoryLimits.limitFromProductsAndEqualizers: base category must supply morphism equality',
      )
    }

    const objectCarrier = diagram.shape.objects.slice()
    if (objectCarrier.length === 0) {
      throw new Error(
        'CategoryLimits.limitFromProductsAndEqualizers: diagram must contain at least one object',
      )
    }

    const Ifin = IndexedFamilies.finiteIndex(objectCarrier)
    const projectionCache = new Map<I, M>()
    const legCache = new Map<I, M>()

    const objectsFamily: IndexedFamilies.Family<I, O> = (index) => diagram.onObjects(index)

    const factors = objectCarrier.map((index) => diagram.onObjects(index))
    const productWitness = products.product(factors)

    objectCarrier.forEach((index, idx) => {
      const projection = productWitness.projections[idx]
      if (!projection) {
        throw new Error(
          'CategoryLimits.limitFromProductsAndEqualizers: missing projection for diagram object',
        )
      }
      projectionCache.set(index, projection)
    })

    const getProjection = (index: I): M => {
      const projection = projectionCache.get(index)
      if (!projection) {
        throw new Error(
          `CategoryLimits.limitFromProductsAndEqualizers: no projection available for ${String(index)}`,
        )
      }
      return projection
    }

    const arrows = diagram.shape.arrows.slice()
    const arrowTargets = arrows.map((arrow) => diagram.onObjects(diagram.shape.dst(arrow)))
    const arrowProductWitness = products.product(arrowTargets)

    const arrowSourceLegs = arrows.map((arrow) => {
      const sourceIndex = diagram.shape.src(arrow)
      const morphism = diagram.onMorphisms(arrow)
      return base.compose(morphism, getProjection(sourceIndex))
    })

    const arrowTargetLegs = arrows.map((arrow) => {
      const targetIndex = diagram.shape.dst(arrow)
      return getProjection(targetIndex)
    })

    const deltaSource = products.tuple(productWitness.obj, arrowSourceLegs, arrowProductWitness.obj)
    const deltaTarget = products.tuple(productWitness.obj, arrowTargetLegs, arrowProductWitness.obj)
    const equalizerWitness = base.equalizer(deltaSource, deltaTarget)

    objectCarrier.forEach((index) => {
      const leg = base.compose(getProjection(index), equalizerWitness.equalize)
      legCache.set(index, leg)
    })

    const limitLegs: IndexedFamilies.Family<I, M> = (index) => {
      const leg = legCache.get(index)
      if (!leg) {
        throw new Error(
          `CategoryLimits.limitFromProductsAndEqualizers: limit leg unavailable for ${String(index)}`,
        )
      }
      return leg
    }

    const limitCone: Cone<I, O, M> = { tip: equalizerWitness.obj, legs: limitLegs, diagram }

    const factor = (candidate: Cone<I, O, M>): EqualizerFactorizationResult<M> => {
      const validation = validateConeAgainstDiagram({
        category: base,
        eq,
        indices: Ifin,
        onObjects: objectsFamily,
        cone: candidate,
      })

      if (!validation.valid) {
        return validation.reason
          ? { factored: false, reason: validation.reason }
          : { factored: false }
      }

      const legsArr = Ifin.carrier.map((index) => candidate.legs(index))
      const fork = products.tuple(candidate.tip, legsArr, productWitness.obj)

      const report = factorEqualizer({
        left: deltaSource,
        right: deltaTarget,
        inclusion: equalizerWitness.equalize,
        fork,
      })

      if (!report.factored || !report.mediator) {
        return {
          factored: false,
          reason:
            report.reason ??
            'CategoryLimits.limitFromProductsAndEqualizers: equalizer factorization failed',
        }
      }

      if (base.dom(report.mediator) !== candidate.tip || base.cod(report.mediator) !== limitCone.tip) {
        return {
          factored: false,
          reason:
            'CategoryLimits.limitFromProductsAndEqualizers: mediator shape does not match the cones',
        }
      }

      for (const index of objectCarrier) {
        const expected = candidate.legs(index)
        const projection = getProjection(index)
        const recomposed = base.compose(projection, report.mediator)
        if (!eq(recomposed, expected)) {
          return {
            factored: false,
            reason: `CategoryLimits.limitFromProductsAndEqualizers: mediator does not reproduce leg ${String(
              index,
            )}`,
          }
        }
      }

      return { factored: true, mediator: report.mediator }
    }

    const projections: IndexedFamilies.Family<I, M> = (index) => getProjection(index)

    return {
      product: { obj: productWitness.obj, projections },
      pair: [deltaSource, deltaTarget],
      equalizer: { obj: equalizerWitness.obj, equalize: equalizerWitness.equalize },
      cone: limitCone,
      factor,
    }
  }

  export interface FiniteColimitFromCoproductsAndCoequalizersInput<I, A, O, M> {
    readonly base: FinitelyCocompleteCategory<O, M>
    readonly diagram: FiniteDiagram<I, A, O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly factorCoequalizer: CoequalizerFactorizer<M>
  }

  export interface FiniteColimitFromCoproductsAndCoequalizersWitness<I, O, M> {
    readonly coproduct: { readonly obj: O; readonly injections: IndexedFamilies.Family<I, M> }
    readonly pair: readonly [M, M]
    readonly coequalizer: { readonly obj: O; readonly coequalize: M }
    readonly cocone: Cocone<I, O, M>
    readonly factor: (candidate: Cocone<I, O, M>) => CoequalizerFactorizationResult<M>
  }

  export const finiteColimitFromCoproductsAndCoequalizers = <I, A, O, M>(
    input: FiniteColimitFromCoproductsAndCoequalizersInput<I, A, O, M>,
  ): FiniteColimitFromCoproductsAndCoequalizersWitness<I, O, M> => {
    const { base, diagram, factorCoequalizer } = input
    const eq = input.eq ?? base.eq

    if (!eq) {
      throw new Error(
        'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: base category must supply morphism equality',
      )
    }

    const objectCarrier = diagram.shape.objects.slice()
    const Ifin = IndexedFamilies.finiteIndex(objectCarrier)

    const objectFamily: IndexedFamilies.Family<I, O> = (index) => diagram.onObjects(index)

    const objectCoproductWitness =
      objectCarrier.length === 0
        ? ({ obj: base.initialObj, injections: [] } as {
            readonly obj: O
            readonly injections: ReadonlyArray<M>
          })
        : base.coproduct(objectCarrier.map((index) => diagram.onObjects(index)))

    const injectionCache = new Map<I, M>()
    objectCarrier.forEach((index, position) => {
      const injection = objectCoproductWitness.injections[position]
      if (!injection) {
        throw new Error(
          'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: missing injection for diagram object',
        )
      }
      injectionCache.set(index, injection)
    })

    const getInjection = (index: I): M => {
      const injection = injectionCache.get(index)
      if (!injection) {
        throw new Error(
          `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: no injection available for ${String(index)}`,
        )
      }
      return injection
    }

    const arrows = diagram.shape.arrows.slice()
    const arrowSources = arrows.map((arrow) => diagram.onObjects(diagram.shape.src(arrow)))
    const arrowCoproduct =
      arrows.length === 0
        ? ({ obj: base.initialObj, injections: [] } as {
            readonly obj: O
            readonly injections: ReadonlyArray<M>
          })
        : base.coproduct(arrowSources)

    const arrowLeftLegs = arrows.map((arrow) => getInjection(diagram.shape.src(arrow)))
    const arrowRightLegs = arrows.map((arrow) => {
      const morphism = diagram.onMorphisms(arrow)
      const targetInjection = getInjection(diagram.shape.dst(arrow))
      return base.compose(targetInjection, morphism)
    })

    const deltaSource = base.cotuple(arrowCoproduct.obj, arrowLeftLegs, objectCoproductWitness.obj)
    const deltaTarget = base.cotuple(arrowCoproduct.obj, arrowRightLegs, objectCoproductWitness.obj)

    const coequalizerWitness = base.coequalizer(deltaSource, deltaTarget)

    const legCache = new Map<I, M>()
    objectCarrier.forEach((index) => {
      const injection = getInjection(index)
      const leg = base.compose(coequalizerWitness.coequalize, injection)
      legCache.set(index, leg)
    })

    const colimitLegs: IndexedFamilies.Family<I, M> = (index) => {
      const leg = legCache.get(index)
      if (!leg) {
        throw new Error(
          `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: colimit leg unavailable for ${String(index)}`,
        )
      }
      return leg
    }

    const cocone: Cocone<I, O, M> = {
      coTip: coequalizerWitness.obj,
      legs: colimitLegs,
      diagram,
    }

    const validation = validateCoconeAgainstDiagram({
      category: base,
      eq,
      indices: Ifin,
      onObjects: objectFamily,
      cocone,
    })

    if (!validation.valid) {
      throw new Error(
        validation.reason
          ? `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: canonical cocone invalid: ${validation.reason}`
          : 'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: canonical cocone fails validation',
      )
    }

    const factor = (candidate: Cocone<I, O, M>): CoequalizerFactorizationResult<M> => {
      const candidateValidation = validateCoconeAgainstDiagram({
        category: base,
        eq,
        indices: Ifin,
        onObjects: objectFamily,
        cocone: candidate,
      })

      if (!candidateValidation.valid) {
        return candidateValidation.reason
          ? { factored: false, reason: candidateValidation.reason }
          : { factored: false }
      }

      const legsArr = Ifin.carrier.map((index) => candidate.legs(index))
      const fork = base.cotuple(objectCoproductWitness.obj, legsArr, candidate.coTip)

      const report = factorCoequalizer({
        left: deltaSource,
        right: deltaTarget,
        coequalizer: coequalizerWitness.coequalize,
        fork,
      })

      if (!report.factored || !report.mediator) {
        return {
          factored: false,
          reason:
            report.reason ??
            'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: coequalizer factorization failed',
        }
      }

      if (base.dom(report.mediator) !== cocone.coTip || base.cod(report.mediator) !== candidate.coTip) {
        return {
          factored: false,
          reason:
            'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: mediator shape does not match the cocones',
        }
      }

      for (const index of objectCarrier) {
        const expected = candidate.legs(index)
        const canonical = colimitLegs(index)
        const recomposed = base.compose(report.mediator, canonical)
        if (!eq(recomposed, expected)) {
          return {
            factored: false,
            reason: `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: mediator does not reproduce leg ${String(
              index,
            )}`,
          }
        }
      }

      return { factored: true, mediator: report.mediator }
    }

    const injections: IndexedFamilies.Family<I, M> = (index) => getInjection(index)

    return {
      coproduct: { obj: objectCoproductWitness.obj, injections },
      pair: [deltaSource, deltaTarget],
      coequalizer: { obj: coequalizerWitness.obj, coequalize: coequalizerWitness.coequalize },
      cocone,
      factor,
    }
  }

  export const makeEqualizersFromPullbacks = <O, M extends object>(
    input: EqualizerFromPullbacksInput<O, M>,
  ): EqualizerFromPullbacksWitness<O, M> => {
    const { base, terminal, products, pullbacks } = input
    const eq = input.eq ?? base.equalMor ?? ((left: M, right: M) => Object.is(left, right))

    const { terminalObj } = terminal
    if (terminalObj === undefined) {
      throw new Error('CategoryLimits.makeEqualizersFromPullbacks: terminal object witness is required')
    }

    const registry = new WeakMap<M, EqualizerFromPullbackSpanWitness<O, M>>()

    const describe = (left: M, right: M): EqualizerFromPullbackSpanWitness<O, M> => {
      const source = base.dom(left)
      if (source !== base.dom(right)) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: arrows must share a domain')
      }

      const target = base.cod(left)
      if (target !== base.cod(right)) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: arrows must share a codomain')
      }

      const { obj: productObj, projections } = products.product([target, target])
      if (projections.length !== 2) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: binary product must supply two projections')
      }

      const [projectionLeft, projectionRight] = projections as readonly [M, M]
      const pairing = products.tuple(source, [left, right], productObj)

      const idTarget = base.id(target)
      const diagonal = products.tuple(target, [idTarget, idTarget], productObj)

      const pullback = pullbacks.pullback(pairing, diagonal)
      const inclusion = pullback.toDomain
      const anchor = pullback.toAnchor

      if (base.dom(inclusion) !== pullback.apex) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: inclusion must originate at the pullback apex')
      }
      if (base.cod(inclusion) !== source) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: inclusion must land in the shared domain')
      }
      if (base.dom(anchor) !== pullback.apex || base.cod(anchor) !== target) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: anchor leg must land in the shared codomain')
      }

      const witness: EqualizerFromPullbackSpanWitness<O, M> = {
        left,
        right,
        product: { obj: productObj, projections: [projectionLeft, projectionRight] },
        diagonal,
        pairing,
        pullback,
        inclusion,
        anchor,
      }

      registry.set(inclusion, witness)
      return witness
    }

    const equalizer = (left: M, right: M) => {
      const witness = describe(left, right)
      return { obj: witness.pullback.apex, equalize: witness.inclusion }
    }

    const factorEqualizer: EqualizerFactorizer<M> = ({ left, right, inclusion, fork }) => {
      const witness = registry.get(inclusion)
      if (!witness) {
        return {
          factored: false,
          reason:
            'CategoryLimits.makeEqualizersFromPullbacks: unrecognised inclusion; construct it via spanWitness or equalizer first.',
        }
      }

      if (!eq(left, witness.left) || !eq(right, witness.right)) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: supplied arrows differ from the registered parallel pair.',
        }
      }

      const forkDomain = base.dom(fork)
      const forkCodomain = base.cod(fork)
      const expectedCodomain = base.cod(witness.inclusion)
      if (forkCodomain !== expectedCodomain) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: fork must land in the equalizer domain.',
        }
      }

      const viaLeft = base.compose(left, fork)
      const viaRight = base.compose(right, fork)
      if (!eq(viaLeft, viaRight)) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: fork does not equalize the parallel pair.',
        }
      }

      const candidate: PullbackData<O, M> = { apex: forkDomain, toDomain: fork, toAnchor: viaLeft }

      let mediator: M | undefined
      try {
        const verdict = pullbacks.factorCone(witness.pullback, candidate)
        if (!verdict.factored) {
          return {
            factored: false,
            reason:
              verdict.reason ?? 'CategoryLimits.makeEqualizersFromPullbacks: pullback calculator could not produce a mediator.',
          }
        }
        mediator = verdict.mediator
      } catch (error) {
        return {
          factored: false,
          reason:
            error instanceof Error
              ? error.message
              : 'CategoryLimits.makeEqualizersFromPullbacks: pullback calculator threw during factorisation.',
        }
      }

      if (!mediator) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: pullback factorisation did not return a mediator.',
        }
      }

      const recomposed = base.compose(witness.inclusion, mediator)
      if (!eq(recomposed, fork)) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: constructed mediator does not reproduce the fork.',
        }
      }

      return { factored: true, mediator }
    }

    return { equalizer, factorEqualizer, spanWitness: describe }
  }

  export const limitOfDiagram = <I, A, O, M>(input: {
    readonly base: FiniteCategoryT<O, M> &
      Category<O, M> &
      ArrowFamilies.HasDomCod<O, M> &
      HasFiniteProducts<O, M> &
      HasProductMediators<O, M> &
      HasEqualizers<O, M> &
      HasTerminal<O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly diagram: FiniteDiagram<I, A, O, M>
  }): LimitOfDiagramResult<I, O, M> => {
    const { base, diagram } = input
    const eq = input.eq ?? base.eq

    if (!eq) {
      throw new Error('CategoryLimits.limitOfDiagram: base category must supply morphism equality')
    }

    const objectCarrier = diagram.shape.objects.slice()
    const Ifin = IndexedFamilies.finiteIndex(objectCarrier)

    const projectionCache = new Map<I, M>()
    const legCache = new Map<I, M>()

    const objectsFamily: IndexedFamilies.Family<I, O> = (index) => diagram.onObjects(index)

    let limitTip: O
    let equalize: M | undefined

    if (objectCarrier.length === 0) {
      limitTip = base.terminalObj
    } else {
      const factors = objectCarrier.map((index) => diagram.onObjects(index))
      const { obj: productObj, projections } = base.product(factors)
      objectCarrier.forEach((index, idx) => {
        const projection = projections[idx]
        if (!projection) {
          throw new Error('CategoryLimits.limitOfDiagram: missing projection for diagram object')
        }
        projectionCache.set(index, projection)
      })

      const getProjection = (index: I): M => {
        const projection = projectionCache.get(index)
        if (!projection) {
          throw new Error(`CategoryLimits.limitOfDiagram: no projection available for ${String(index)}`)
        }
        return projection
      }

      const arrows = diagram.shape.arrows.slice()
      if (arrows.length === 0) {
        limitTip = productObj
        equalize = base.id(productObj)
      } else {
        const arrowTargets = arrows.map((arrow) => diagram.onObjects(diagram.shape.dst(arrow)))
        const { obj: arrowProductObj } = base.product(arrowTargets)

        const arrowSourceLegs = arrows.map((arrow) => {
          const sourceIndex = diagram.shape.src(arrow)
          const morphism = diagram.onMorphisms(arrow)
          return base.compose(morphism, getProjection(sourceIndex))
        })

        const arrowTargetLegs = arrows.map((arrow) => {
          const targetIndex = diagram.shape.dst(arrow)
          return getProjection(targetIndex)
        })

        const deltaSource = base.tuple(productObj, arrowSourceLegs, arrowProductObj)
        const deltaTarget = base.tuple(productObj, arrowTargetLegs, arrowProductObj)
        const equalizerWitness = base.equalizer(deltaSource, deltaTarget)
        limitTip = equalizerWitness.obj
        equalize = equalizerWitness.equalize
      }

      if (!equalize) {
        throw new Error('CategoryLimits.limitOfDiagram: failed to construct equalizer mediator')
      }

      objectCarrier.forEach((index) => {
        const projection = getProjection(index)
        const leg = base.compose(projection, equalize!)
        legCache.set(index, leg)
      })
    }

    const limitLegs: IndexedFamilies.Family<I, M> = (index) => {
      const leg = legCache.get(index)
      if (!leg) {
        throw new Error(`CategoryLimits.limitOfDiagram: limit leg unavailable for ${String(index)}`)
      }
      return leg
    }

    const limitCone: Cone<I, O, M> = objectCarrier.length === 0
      ? {
          tip: limitTip,
          legs: () => {
            throw new Error('CategoryLimits.limitOfDiagram: empty diagram has no legs')
          },
          diagram,
        }
      : { tip: limitTip, legs: limitLegs, diagram }

    const coneCategory = makeConeCategory({ base, eq, Ifin, F: objectsFamily, diagram })
    const terminality = checkTerminalCone(coneCategory, limitCone)
    if (!terminality.holds || !terminality.locatedLimit) {
      throw new Error('CategoryLimits.limitOfDiagram: canonical cone is not terminal in the cone category')
    }

    const mediatorLookup = new Map<Cone<I, O, M>, ConeMorphism<I, O, M>>()
    terminality.mediators.forEach(({ source, arrow }) => mediatorLookup.set(source, arrow))

    const factor = (candidate: Cone<I, O, M>) => {
      for (const index of objectCarrier) {
        let leg: M
        try {
          leg = candidate.legs(index)
        } catch (error) {
          return {
            holds: false,
            reason: `CategoryLimits.limitOfDiagram: cone is missing leg ${String(index)} (${String(error)})`,
          }
        }
        if (base.dom(leg) !== candidate.tip) {
          return {
            holds: false,
            reason: `CategoryLimits.limitOfDiagram: leg ${String(index)} originates at ${String(
              base.dom(leg),
            )} instead of the cone tip`,
          }
        }
        const expectedCodomain = diagram.onObjects(index)
        if (base.cod(leg) !== expectedCodomain) {
          return {
            holds: false,
            reason: `CategoryLimits.limitOfDiagram: leg ${String(index)} lands in ${String(
              base.cod(leg),
            )} rather than ${String(expectedCodomain)}`,
          }
        }
      }

      const normalizedCone: Cone<I, O, M> = { tip: candidate.tip, legs: candidate.legs, diagram }
      if (!coneRespectsDiagram(base, eq, normalizedCone)) {
        return { holds: false, reason: 'CategoryLimits.limitOfDiagram: cone legs do not commute with the diagram' }
      }

      const located = coneCategory.locateCone(candidate)
      if (!located) {
        return { holds: false, reason: 'CategoryLimits.limitOfDiagram: cone not present in the enumerated cone category' }
      }

      const mediatorEntry = mediatorLookup.get(located)
      if (!mediatorEntry) {
        return { holds: false, reason: 'CategoryLimits.limitOfDiagram: no mediator recorded for the supplied cone' }
      }

      const mediator = mediatorEntry.mediator
      if (base.dom(mediator) !== candidate.tip || base.cod(mediator) !== limitCone.tip) {
        return { holds: false, reason: 'CategoryLimits.limitOfDiagram: mediator shape does not match the cones' }
      }

      for (const index of objectCarrier) {
        const lhs = base.compose(limitCone.legs(index), mediator)
        const rhs = candidate.legs(index)
        if (!eq(lhs, rhs)) {
          return {
            holds: false,
            reason: `CategoryLimits.limitOfDiagram: mediator does not reproduce leg ${String(index)}`,
          }
        }
      }

      return { holds: true, mediator }
    }

    return { cone: limitCone, factor, coneCategory, terminality }
  }

  /** Coproduct (colimit) shape data */
  export interface Cocone<I, O, M> {
    coTip: O
    legs: IndexedFamilies.Family<I, M>
    diagram: DiagramLike<I, O, M>
  }

  export interface CoconeMorphism<I, O, M> {
    readonly source: Cocone<I, O, M>
    readonly target: Cocone<I, O, M>
    readonly mediator: M
  }

  export interface CoconeCategoryResult<I, O, M> {
    readonly category: FiniteCategoryT<Cocone<I, O, M>, CoconeMorphism<I, O, M>>
    readonly locateCocone: (cocone: Cocone<I, O, M>) => Cocone<I, O, M> | undefined
    readonly morphisms: (
      source: Cocone<I, O, M>,
      target: Cocone<I, O, M>,
    ) => ReadonlyArray<CoconeMorphism<I, O, M>>
  }

  export interface CoconeInitialityWitness<I, O, M> {
    readonly locatedColimit?: Cocone<I, O, M>
    readonly mediators: ReadonlyArray<{ target: Cocone<I, O, M>; arrow: CoconeMorphism<I, O, M> }>
    readonly holds: boolean
    readonly failure?: { target: Cocone<I, O, M>; arrows: ReadonlyArray<CoconeMorphism<I, O, M>> }
  }

  export const makeCoconeCategory = <I, O, M>(input: {
    readonly base: FiniteCategoryT<O, M> & Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly Ifin: IndexedFamilies.FiniteIndex<I>
    readonly F: IndexedFamilies.Family<I, O>
    readonly diagram: DiagramLike<I, O, M>
  }): CoconeCategoryResult<I, O, M> => {
    const { base, eq = base.eq, Ifin, F, diagram } = input

    if (!eq) {
      throw new Error('CategoryLimits.makeCoconeCategory: base category must supply equality on morphisms')
    }

    const indices = Ifin.carrier
    const includesIndex = (value: I): boolean => indices.some((candidate) => candidate === value)
    const diagramArrows = enumerateDiagramArrows(diagram)

    if (isFiniteDiagram(diagram)) {
      for (const object of diagram.shape.objects) {
        if (!includesIndex(object)) {
          throw new Error(
            'CategoryLimits.makeCoconeCategory: finite diagram contains an object outside the supplied indices',
          )
        }
      }
      for (const index of indices) {
        if (!diagram.shape.objects.some((candidate) => candidate === index)) {
          throw new Error(
            'CategoryLimits.makeCoconeCategory: index family includes an object missing from the diagram',
          )
        }
        const assigned = diagram.onObjects(index)
        const advertised = F(index)
        if (assigned !== advertised) {
          throw new Error(
            'CategoryLimits.makeCoconeCategory: diagram object assignment disagrees with the supplied family',
          )
        }
      }
      const functoriality = checkFiniteDiagramFunctoriality({ base, eq, diagram })
      if (!functoriality.holds) {
        throw new Error(
          `CategoryLimits.makeCoconeCategory: diagram fails functoriality checks: ${functoriality.issues.join('; ')}`,
        )
      }
    }

    for (const arrow of diagramArrows) {
      if (!includesIndex(arrow.source) || !includesIndex(arrow.target)) {
        throw new Error(
          'CategoryLimits.makeCoconeCategory: diagram references an index outside the supplied finite family',
        )
      }
    }

    type EnumeratedCocone = Cocone<I, O, M> & { readonly legsMap: ReadonlyMap<I, M> }

    const cocones: EnumeratedCocone[] = []

    const coconesEqual = (left: EnumeratedCocone, right: Cocone<I, O, M>): boolean => {
      if (left.coTip !== right.coTip) return false
      for (const index of indices) {
        const expected = left.legsMap.get(index)
        if (expected === undefined) return false
        const candidate = right.legs(index)
        if (!eq(expected, candidate)) return false
      }
      return true
    }

    const locateCocone = (candidate: Cocone<I, O, M>): EnumeratedCocone | undefined =>
      cocones.find((existing) => coconesEqual(existing, candidate))

    const addCocone = (cocone: EnumeratedCocone): void => {
      if (!locateCocone(cocone)) {
        cocones.push(cocone)
      }
    }

    if (indices.length === 0 && diagramArrows.length > 0) {
      throw new Error(
        'CategoryLimits.makeCoconeCategory: non-empty diagram requires indices in the supplied finite family',
      )
    }

    for (const coTip of base.objects) {
      if (indices.length === 0) {
        const legsMap = new Map<I, M>()
        const cocone: EnumeratedCocone = {
          coTip,
          legs: (index: I) => {
            throw new Error(
              `CategoryLimits.makeCoconeCategory: no legs available for index ${String(index)} in an empty diagram`,
            )
          },
          diagram,
          legsMap,
        }
        addCocone(cocone)
        continue
      }

      const options = indices.map((index) =>
        base.arrows.filter((arrow) => base.dom(arrow) === F(index) && base.cod(arrow) === coTip),
      )

      if (options.some((choices) => choices.length === 0)) continue

      const assignments: M[] = new Array(indices.length)

      const buildCocone = (position: number) => {
        if (position === indices.length) {
          const legsMap = new Map<I, M>()
          indices.forEach((index, idx) => legsMap.set(index, assignments[idx]!))
          const cocone: EnumeratedCocone = {
            coTip,
            legs: (index: I) => {
              const leg = legsMap.get(index)
              if (leg === undefined) {
                throw new Error(
                  `CategoryLimits.makeCoconeCategory: missing leg for index ${String(index)} in enumerated cocone`,
                )
              }
              return leg
            },
            diagram,
            legsMap,
          }
          if (coconeRespectsDiagram(base, eq, cocone)) {
            addCocone(cocone)
          }
          return
        }

        for (const arrow of options[position]!) {
          assignments[position] = arrow
          buildCocone(position + 1)
        }
      }

      buildCocone(0)
    }

    const morphisms: CoconeMorphism<I, O, M>[] = []

    const arrowEq = (left: CoconeMorphism<I, O, M>, right: CoconeMorphism<I, O, M>) =>
      left.source === right.source && left.target === right.target && eq(left.mediator, right.mediator)

    const addMorphism = (morphism: CoconeMorphism<I, O, M>): void => {
      if (!morphisms.some((existing) => arrowEq(existing, morphism))) {
        morphisms.push(morphism)
      }
    }

    for (const cocone of cocones) {
      const identity = base.id(cocone.coTip)
      addMorphism({ source: cocone, target: cocone, mediator: identity })
    }

    for (const arrow of base.arrows) {
      const domain = base.dom(arrow)
      const codomain = base.cod(arrow)
      const sources = cocones.filter((cocone) => cocone.coTip === domain)
      const targets = cocones.filter((cocone) => cocone.coTip === codomain)
      for (const sourceCocone of sources) {
        for (const targetCocone of targets) {
          let commutes = true
          for (const index of indices) {
            const composed = base.compose(arrow, sourceCocone.legs(index))
            const expected = targetCocone.legs(index)
            if (!eq(composed, expected)) {
              commutes = false
              break
            }
          }
          if (commutes) {
            addMorphism({ source: sourceCocone, target: targetCocone, mediator: arrow })
          }
        }
      }
    }

    const findMorphism = (
      source: EnumeratedCocone,
      target: EnumeratedCocone,
      mediator: M,
    ): CoconeMorphism<I, O, M> => {
      const found = morphisms.find(
        (arrow) => arrow.source === source && arrow.target === target && eq(arrow.mediator, mediator),
      )
      if (!found) {
        throw new Error('CategoryLimits.makeCoconeCategory: mediator not present in cocone category')
      }
      return found
    }

    const objects = cocones as ReadonlyArray<Cocone<I, O, M>>
    const arrows = morphisms as ReadonlyArray<CoconeMorphism<I, O, M>>

    const category: FiniteCategoryT<Cocone<I, O, M>, CoconeMorphism<I, O, M>> = {
      objects,
      arrows,
      id: (object) => findMorphism(object as EnumeratedCocone, object as EnumeratedCocone, base.id(object.coTip)),
      compose: (g, f) => {
        if (f.target !== g.source) {
          throw new Error('CategoryLimits.makeCoconeCategory: morphism composition domain mismatch')
        }
        const mediator = base.compose(g.mediator, f.mediator)
        return findMorphism(f.source as EnumeratedCocone, g.target as EnumeratedCocone, mediator)
      },
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq: arrowEq,
    }

    const morphismsBetween = (
      source: Cocone<I, O, M>,
      target: Cocone<I, O, M>,
    ): ReadonlyArray<CoconeMorphism<I, O, M>> => {
      const locatedSource = locateCocone(source)
      const locatedTarget = locateCocone(target)
      if (!locatedSource || !locatedTarget) return []
      return morphisms.filter((arrow) => arrow.source === locatedSource && arrow.target === locatedTarget)
    }

    return {
      category,
      locateCocone,
      morphisms: morphismsBetween,
    }
  }

  export const checkInitialCocone = <I, O, M>(
    category: CoconeCategoryResult<I, O, M>,
    candidate: Cocone<I, O, M>,
  ): CoconeInitialityWitness<I, O, M> => {
    const locatedColimit = category.locateCocone(candidate)
    if (!locatedColimit) {
      return { holds: false, mediators: [], failure: { target: candidate, arrows: [] } }
    }

    const witnesses: Array<{ target: Cocone<I, O, M>; arrow: CoconeMorphism<I, O, M> }> = []
    const identity = category.category.id(locatedColimit)

    for (const cocone of category.category.objects) {
      const arrows = category.morphisms(locatedColimit, cocone)
      if (arrows.length !== 1) {
        return { holds: false, locatedColimit, mediators: witnesses, failure: { target: cocone, arrows } }
      }
      const arrow = arrows[0]!
      witnesses.push({ target: cocone, arrow })
      if (cocone === locatedColimit && !category.category.eq(arrow, identity)) {
        return { holds: false, locatedColimit, mediators: witnesses, failure: { target: cocone, arrows } }
      }
    }

    return { holds: true, locatedColimit, mediators: witnesses }
  }

  export const coneRespectsDiagram = <I, O, M>(
    C: Category<O, M>,
    eq: (a: M, b: M) => boolean,
    cone: Cone<I, O, M>,
  ): boolean => {
    for (const { source, target, morphism } of enumerateDiagramArrows(cone.diagram)) {
      const transported = C.compose(morphism, cone.legs(source))
      const targetLeg = cone.legs(target)
      if (!eq(transported, targetLeg)) {
        return false
      }
    }
    return true
  }

  export const coconeRespectsDiagram = <I, O, M>(
    C: Category<O, M>,
    eq: (a: M, b: M) => boolean,
    cocone: Cocone<I, O, M>,
  ): boolean => {
    for (const { source, target, morphism } of enumerateDiagramArrows(cocone.diagram)) {
      const transported = C.compose(cocone.legs(target), morphism)
      const sourceLeg = cocone.legs(source)
      if (!eq(transported, sourceLeg)) {
        return false
      }
    }
    return true
  }

  export interface ConeValidationResult {
    readonly valid: boolean
    readonly reason?: string
  }

  export const validateConeAgainstDiagram = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cone: Cone<I, O, M>
  }): ConeValidationResult => {
    const { category: C, eq, indices, onObjects, cone } = input
    const { diagram } = cone
    const carrier = indices.carrier

    const includesIndex = (index: I): boolean => carrier.some((candidate) => candidate === index)

    if (isFiniteDiagram(diagram)) {
      for (const object of diagram.shape.objects) {
        if (!includesIndex(object)) {
          return {
            valid: false,
            reason: `validateConeAgainstDiagram: diagram references object ${String(object)} outside the supplied index set`,
          }
        }
        const advertised = onObjects(object)
        const assigned = diagram.onObjects(object)
        if (!Object.is(advertised, assigned)) {
          return {
            valid: false,
            reason: `validateConeAgainstDiagram: diagram object ${String(object)} disagrees with supplied family`,
          }
        }
      }
    }

    for (const index of carrier) {
      const leg = cone.legs(index)
      if (C.dom(leg) !== cone.tip) {
        return {
          valid: false,
          reason: `validateConeAgainstDiagram: leg ${String(index)} has domain ${String(C.dom(leg))} instead of the cone tip`,
        }
      }
      const expectedCodomain = onObjects(index)
      if (C.cod(leg) !== expectedCodomain) {
        return {
          valid: false,
          reason: `validateConeAgainstDiagram: leg ${String(index)} targets ${String(C.cod(leg))} rather than ${String(
            expectedCodomain,
          )}`,
        }
      }
    }

    for (const { source, target, morphism } of enumerateDiagramArrows(diagram)) {
      if (!includesIndex(source) || !includesIndex(target)) {
        return {
          valid: false,
          reason: `validateConeAgainstDiagram: arrow ${String(source)}→${String(target)} leaves the supplied index set`,
        }
      }
      const expectedDom = onObjects(source)
      const expectedCod = onObjects(target)
      if (!Object.is(C.dom(morphism), expectedDom)) {
        return {
          valid: false,
          reason: `validateConeAgainstDiagram: morphism ${String(source)}→${String(target)} has domain ${String(
            C.dom(morphism),
          )} instead of ${String(expectedDom)}`,
        }
      }
      if (!Object.is(C.cod(morphism), expectedCod)) {
        return {
          valid: false,
          reason: `validateConeAgainstDiagram: morphism ${String(source)}→${String(target)} has codomain ${String(
            C.cod(morphism),
          )} instead of ${String(expectedCod)}`,
        }
      }
      const transported = C.compose(morphism, cone.legs(source))
      const targetLeg = cone.legs(target)
      if (!eq(transported, targetLeg)) {
        return {
          valid: false,
          reason: `validateConeAgainstDiagram: leg ${String(target)} does not commute with arrow ${String(
            source,
          )}→${String(target)}`,
        }
      }
    }

    return { valid: true }
  }

  export interface CoconeValidationResult {
    readonly valid: boolean
    readonly reason?: string
  }

  export const validateCoconeAgainstDiagram = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cocone: Cocone<I, O, M>
  }): CoconeValidationResult => {
    const { category: C, eq, indices, onObjects, cocone } = input
    const { diagram } = cocone
    const carrier = indices.carrier

    const includesIndex = (index: I): boolean => carrier.some((candidate) => candidate === index)

    if (isFiniteDiagram(diagram)) {
      for (const object of diagram.shape.objects) {
        if (!includesIndex(object)) {
          return {
            valid: false,
            reason: `validateCoconeAgainstDiagram: diagram references object ${String(object)} outside the supplied index set`,
          }
        }
        const advertised = onObjects(object)
        const assigned = diagram.onObjects(object)
        if (!Object.is(advertised, assigned)) {
          return {
            valid: false,
            reason: `validateCoconeAgainstDiagram: diagram object ${String(object)} disagrees with supplied family`,
          }
        }
      }
    }

    for (const index of carrier) {
      const leg = cocone.legs(index)
      const expectedDomain = onObjects(index)
      if (C.dom(leg) !== expectedDomain) {
        return {
          valid: false,
          reason: `validateCoconeAgainstDiagram: leg ${String(index)} has domain ${String(C.dom(leg))} instead of ${String(
            expectedDomain,
          )}`,
        }
      }
      if (C.cod(leg) !== cocone.coTip) {
        return {
          valid: false,
          reason: `validateCoconeAgainstDiagram: leg ${String(index)} targets ${String(C.cod(leg))} instead of the cocone cotip`,
        }
      }
    }

    for (const { source, target, morphism } of enumerateDiagramArrows(diagram)) {
      if (!includesIndex(source) || !includesIndex(target)) {
        return {
          valid: false,
          reason: `validateCoconeAgainstDiagram: arrow ${String(source)}→${String(target)} leaves the supplied index set`,
        }
      }
      const expectedDom = onObjects(source)
      const expectedCod = onObjects(target)
      if (!Object.is(C.dom(morphism), expectedDom)) {
        return {
          valid: false,
          reason: `validateCoconeAgainstDiagram: morphism ${String(source)}→${String(target)} has domain ${String(
            C.dom(morphism),
          )} instead of ${String(expectedDom)}`,
        }
      }
      if (!Object.is(C.cod(morphism), expectedCod)) {
        return {
          valid: false,
          reason: `validateCoconeAgainstDiagram: morphism ${String(source)}→${String(target)} has codomain ${String(
            C.cod(morphism),
          )} instead of ${String(expectedCod)}`,
        }
      }
      const transported = C.compose(cocone.legs(target), morphism)
      const sourceLeg = cocone.legs(source)
      if (!eq(transported, sourceLeg)) {
        return {
          valid: false,
          reason: `validateCoconeAgainstDiagram: leg ${String(source)} does not commute with arrow ${String(
            source,
          )}→${String(target)}`,
        }
      }
    }

    return { valid: true }
  }

  export const extendConeToClosure = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cone: Cone<I, O, M>
  }): { extended: true; cone: Cone<I, O, M> } | { extended: false; reason: string } => {
    const { category: C, eq, indices, onObjects, cone } = input
    if (!isFiniteDiagram(cone.diagram)) {
      return { extended: false, reason: 'extendConeToClosure: cone does not carry finite diagram data' }
    }

    const finiteDiagram = cone.diagram
    const ambient: SmallCategory<I, typeof finiteDiagram.shape.arrows[number]> = {
      objects: new Set(finiteDiagram.shape.objects),
      arrows: new Set(finiteDiagram.shape.arrows),
      id: finiteDiagram.shape.id,
      compose: (g, f) => finiteDiagram.shape.compose(g, f),
      src: (arrow) => finiteDiagram.shape.src(arrow),
      dst: (arrow) => finiteDiagram.shape.dst(arrow),
    }

    const seeds = finiteDiagram.shape.arrows.map((arrow) => ({
      arrow,
      morphism: finiteDiagram.onMorphisms(arrow),
    }))

    const closed = DiagramClosure.closeFiniteDiagram({
      ambient,
      target: C,
      onObjects: finiteDiagram.onObjects,
      seeds,
      objects: finiteDiagram.shape.objects,
      eq,
    })

    const closureArrows = closed.arrows.map((arrow) => ({
      source: closed.shape.dom(arrow),
      target: closed.shape.cod(arrow),
      morphism: closed.onMorphisms(arrow),
    }))

    const extendedCone: Cone<I, O, M> = {
      tip: cone.tip,
      legs: cone.legs,
      diagram: { arrows: closureArrows },
    }

    const validation = validateConeAgainstDiagram({ category: C, eq, indices, onObjects, cone: extendedCone })
    if (!validation.valid) {
      return {
        extended: false,
        reason: validation.reason ?? 'extendConeToClosure: extended cone fails validation',
      }
    }

    return { extended: true, cone: extendedCone }
  }

  export const extendCoconeToClosure = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cocone: Cocone<I, O, M>
  }): { extended: true; cocone: Cocone<I, O, M> } | { extended: false; reason: string } => {
    const { category: C, eq, indices, onObjects, cocone } = input
    if (!isFiniteDiagram(cocone.diagram)) {
      return { extended: false, reason: 'extendCoconeToClosure: cocone does not carry finite diagram data' }
    }

    const finiteDiagram = cocone.diagram
    const ambient: SmallCategory<I, typeof finiteDiagram.shape.arrows[number]> = {
      objects: new Set(finiteDiagram.shape.objects),
      arrows: new Set(finiteDiagram.shape.arrows),
      id: finiteDiagram.shape.id,
      compose: (g, f) => finiteDiagram.shape.compose(g, f),
      src: (arrow) => finiteDiagram.shape.src(arrow),
      dst: (arrow) => finiteDiagram.shape.dst(arrow),
    }

    const seeds = finiteDiagram.shape.arrows.map((arrow) => ({
      arrow,
      morphism: finiteDiagram.onMorphisms(arrow),
    }))

    const closed = DiagramClosure.closeFiniteDiagram({
      ambient,
      target: C,
      onObjects: finiteDiagram.onObjects,
      seeds,
      objects: finiteDiagram.shape.objects,
      eq,
    })

    const closureArrows = closed.arrows.map((arrow) => ({
      source: closed.shape.dom(arrow),
      target: closed.shape.cod(arrow),
      morphism: closed.onMorphisms(arrow),
    }))

    const extendedCocone: Cocone<I, O, M> = {
      coTip: cocone.coTip,
      legs: cocone.legs,
      diagram: { arrows: closureArrows },
    }

    const validation = validateCoconeAgainstDiagram({ category: C, eq, indices, onObjects, cocone: extendedCocone })
    if (!validation.valid) {
      return {
        extended: false,
        reason: validation.reason ?? 'extendCoconeToClosure: extended cocone fails validation',
      }
    }

    return { extended: true, cocone: extendedCocone }
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

    const isoCategory = category as unknown as FiniteCategoryT<O, M>

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
    ): { triangles: boolean; unique: boolean; mediator?: M; reason?: string } => {
      const indices = Ifin.carrier

      for (const index of indices) {
        const leg = cone.legs(index)
        if (!Object.is(C.dom(leg), cone.tip)) {
          return {
            triangles: false,
            unique: false,
            reason: `isProductForCone: leg ${String(index)} has domain ${String(
              C.dom(leg),
            )} instead of the cone tip`,
          }
        }
        const expectedCodomain = F(index)
        if (!Object.is(C.cod(leg), expectedCodomain)) {
          return {
            triangles: false,
            unique: false,
            reason: `isProductForCone: leg ${String(index)} targets ${String(
              C.cod(leg),
            )} rather than ${String(expectedCodomain)}`,
          }
        }
      }

    const validation = validateConeAgainstDiagram({ category: C, eq, indices: Ifin, onObjects: F, cone })
    if (!validation.valid) {
      return {
        triangles: false,
        unique: false,
        reason: validation.reason ?? 'isProductForCone: cone legs do not respect the diagram',
      }
    }

      const legsArr = indices.map((i) => cone.legs(i))
      const mediator = tuple(cone.tip, legsArr, productObj)
      const triangles = productMediates(C, eq, projections, mediator, cone, indices)
      let unique = triangles

      if (triangles) {
        if (isFiniteCategoryStructure(C)) {
          try {
            const limitCone: Cone<I, O, M> = {
              tip: productObj,
              legs: (i: I) => projections(i),
              diagram: cone.diagram,
            }
            const coneCategory = makeConeCategory({ base: C, eq, Ifin, F, diagram: cone.diagram })
            const locatedSource = coneCategory.locateCone(cone)
            const terminality = checkTerminalCone(coneCategory, limitCone)
            if (locatedSource && terminality.locatedLimit) {
              if (!terminality.holds) {
                unique = false
              } else {
                const witness = terminality.mediators.find((entry) => entry.source === locatedSource)
                if (!witness || !eq(witness.arrow.mediator, mediator)) unique = false
              }
            }
          } catch {
            // Fall back to legacy uniqueness checks when the finite cone category cannot be constructed.
          }
        }

        const competitor = options?.competitor
        if (competitor) {
          const competitorTriangles = productMediates(C, eq, projections, competitor, cone, indices)
          if (competitorTriangles) {
            const agrees = agreeUnderProjections(C, eq, projections, mediator, competitor, indices)
            if (!agrees || !eq(competitor, mediator)) unique = false
          }
        }
      }
      return { triangles, unique, mediator }
    }

  export const factorConeThroughProduct =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      productObj: O,
      projections: IndexedFamilies.Family<I, M>,
      cone: Cone<I, O, M>,
      tuple: (X: O, legs: ReadonlyArray<M>, P: O) => M,
      options?: { competitor?: M }
    ): { factored: boolean; mediator?: M; unique?: boolean; reason?: string } => {
      const verdict = isProductForCone(C, eq, Ifin, F, productObj, projections, cone, tuple, options)
      if (!verdict.triangles || !verdict.mediator) {
        return {
          factored: false,
          reason:
            verdict.reason ?? 'factorConeThroughProduct: cone does not factor through the advertised product object',
        }
    }
    return { factored: true, mediator: verdict.mediator, unique: verdict.unique }
  }

  export const arrowFromCone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      productObj: O,
      projections: IndexedFamilies.Family<I, M>,
      cone: Cone<I, O, M>,
      tuple: (X: O, legs: ReadonlyArray<M>, P: O) => M,
      options?: { competitor?: M }
    ): { success: true; arrow: M; unique: boolean | undefined } | { success: false; reason: string } => {
      const factoring = factorConeThroughProduct(
        C,
        eq,
        Ifin,
        F,
        productObj,
        projections,
        cone,
        tuple,
        options,
      )

      if (!factoring.factored || !factoring.mediator) {
        return {
          success: false,
          reason:
            factoring.reason ?? 'arrowFromCone: cone does not factor through the advertised product object',
        }
      }

      return { success: true, arrow: factoring.mediator, unique: factoring.unique }
    }

  export const coneFromArrow =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      productObj: O,
      projections: IndexedFamilies.Family<I, M>,
      arrow: M,
      diagram: DiagramLike<I, O, M>,
    ): { constructed: true; cone: Cone<I, O, M> } | { constructed: false; reason: string } => {
      if (C.cod(arrow) !== productObj) {
        return {
          constructed: false,
          reason: 'coneFromArrow: arrow must target the advertised product object',
        }
      }

      const indices = Ifin.carrier
      for (const index of indices) {
        const projection = projections(index)
        if (C.dom(projection) !== productObj) {
          return {
            constructed: false,
            reason: `coneFromArrow: projection ${String(index)} has domain ${String(
              C.dom(projection),
            )} instead of the product object`,
          }
        }
        const expectedCodomain = F(index)
        if (C.cod(projection) !== expectedCodomain) {
          return {
            constructed: false,
            reason: `coneFromArrow: projection ${String(index)} targets ${String(
              C.cod(projection),
            )} rather than ${String(expectedCodomain)}`,
          }
        }
      }

      const cache = new Map<I, M>()
      const legs: IndexedFamilies.Family<I, M> = (i) => {
        if (!cache.has(i)) {
          cache.set(i, C.compose(projections(i), arrow))
        }
        return cache.get(i)!
      }

      const cone: Cone<I, O, M> = {
        tip: C.dom(arrow),
        legs,
        diagram,
      }

      if (!coneRespectsDiagram(C, eq, cone)) {
        return {
          constructed: false,
          reason: 'coneFromArrow: derived cone does not respect the diagram',
        }
      }

      return { constructed: true, cone }
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
    ): { triangles: boolean; unique: boolean; mediator?: M; reason?: string } => {
      const indices = Ifin.carrier

      for (const index of indices) {
        const leg = cocone.legs(index)
        const expectedDomain = F(index)
        if (!Object.is(C.dom(leg), expectedDomain)) {
          return {
            triangles: false,
            unique: false,
            reason: `isCoproductForCocone: leg ${String(index)} has domain ${String(
              C.dom(leg),
            )} instead of ${String(expectedDomain)}`,
          }
        }
        if (!Object.is(C.cod(leg), cocone.coTip)) {
          return {
            triangles: false,
            unique: false,
            reason: `isCoproductForCocone: leg ${String(index)} targets ${String(
              C.cod(leg),
            )} instead of the cocone cotip`,
          }
        }
      }

    const validation = validateCoconeAgainstDiagram({ category: C, eq, indices: Ifin, onObjects: F, cocone })
    if (!validation.valid) {
      return {
        triangles: false,
        unique: false,
        reason: validation.reason ?? 'isCoproductForCocone: cocone legs do not respect the diagram',
      }
    }

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
      return { triangles, unique, mediator }
    }

  export const factorCoconeThroughCoproduct =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      coproductObj: O,
      injections: IndexedFamilies.Family<I, M>,
      cocone: Cocone<I, O, M>,
      cotuple: (Cop: O, legs: ReadonlyArray<M>, Y: O) => M,
      options?: { competitor?: M }
    ): { factored: boolean; mediator?: M; unique?: boolean; reason?: string } => {
      const verdict = isCoproductForCocone(C, eq, Ifin, F, coproductObj, injections, cocone, cotuple, options)
      if (!verdict.triangles || !verdict.mediator) {
        return {
          factored: false,
          reason:
            verdict.reason ??
            'factorCoconeThroughCoproduct: cocone does not factor through the advertised coproduct object',
        }
    }
    return { factored: true, mediator: verdict.mediator, unique: verdict.unique }
  }

  export const arrowFromCocone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      coproductObj: O,
      injections: IndexedFamilies.Family<I, M>,
      cocone: Cocone<I, O, M>,
      cotuple: (Cop: O, legs: ReadonlyArray<M>, Y: O) => M,
      options?: { competitor?: M }
    ): { success: true; arrow: M; unique: boolean | undefined } | { success: false; reason: string } => {
      const factoring = factorCoconeThroughCoproduct(
        C,
        eq,
        Ifin,
        F,
        coproductObj,
        injections,
        cocone,
        cotuple,
        options,
      )

      if (!factoring.factored || !factoring.mediator) {
        return {
          success: false,
          reason:
            factoring.reason ?? 'arrowFromCocone: cocone does not factor through the advertised coproduct object',
        }
      }

      return { success: true, arrow: factoring.mediator, unique: factoring.unique }
    }

  export const coconeFromArrow =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      coproductObj: O,
      injections: IndexedFamilies.Family<I, M>,
      arrow: M,
      diagram: DiagramLike<I, O, M>,
    ): { constructed: true; cocone: Cocone<I, O, M> } | { constructed: false; reason: string } => {
      if (C.dom(arrow) !== coproductObj) {
        return {
          constructed: false,
          reason: 'coconeFromArrow: arrow must originate at the advertised coproduct object',
        }
      }

      const indices = Ifin.carrier
      for (const index of indices) {
        const injection = injections(index)
        const expectedDomain = F(index)
        if (C.dom(injection) !== expectedDomain) {
          return {
            constructed: false,
            reason: `coconeFromArrow: injection ${String(index)} has domain ${String(
              C.dom(injection),
            )} instead of ${String(expectedDomain)}`,
          }
        }
        if (C.cod(injection) !== coproductObj) {
          return {
            constructed: false,
            reason: `coconeFromArrow: injection ${String(index)} targets ${String(
              C.cod(injection),
            )} instead of the coproduct object`,
          }
        }
      }

      const cache = new Map<I, M>()
      const legs: IndexedFamilies.Family<I, M> = (i) => {
        if (!cache.has(i)) {
          cache.set(i, C.compose(arrow, injections(i)))
        }
        return cache.get(i)!
      }

      const cocone: Cocone<I, O, M> = {
        coTip: C.cod(arrow),
        legs,
        diagram,
      }

      if (!coconeRespectsDiagram(C, eq, cocone)) {
        return {
          constructed: false,
          reason: 'coconeFromArrow: derived cocone does not respect the diagram',
        }
      }

      return { constructed: true, cocone }
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
