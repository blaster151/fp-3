import type { ChainMap, Complex, Field, FinitePoset, ObjId, PosetDiagram } from "../allTS"
import type { ArrowFamilies } from "./arrow-families"
import type { Category, FiniteCategory as FiniteCategoryT } from "./category"
import { makeSubcategory, type SmallCategory } from "../subcategory"

export namespace DiagramClosure {
  // ----- matrix helpers -----
  const matMul =
    <R>(F: Pick<Field<R>, 'add' | 'mul' | 'zero'>) =>
    (B: ReadonlyArray<ReadonlyArray<R>>, A: ReadonlyArray<ReadonlyArray<R>>): R[][] => {
      const r = B.length
      const k = B[0]?.length ?? 0
      const c = A[0]?.length ?? 0
      const Z: R[][] = Array.from({ length: r }, () => Array.from({ length: c }, () => F.zero))
      for (let i = 0; i < r; i++) for (let t = 0; t < k; t++) {
        const b = B[i]![t]!
        if (b === F.zero) continue
        for (let j = 0; j < c; j++) Z[i]![j] = F.add(Z[i]![j]!, F.mul(b, A[t]![j]!))
      }
      return Z
    }

  // Compose chain maps g∘f (same degree, X --f--> Y --g--> Z)
  export const composeChainMap =
    <R>(F: Pick<Field<R>, 'add' | 'mul' | 'zero'>) =>
    (g: ChainMap<R>, f: ChainMap<R>): ChainMap<R> => {
      const mul = matMul(F)
      const res: Record<number, R[][]> = {}
      for (const n of f.X.degrees) {
        const A = (f.f[n] ?? []) as R[][]
        const B = (g.f[n] ?? []) as R[][]
        res[n] = mul(B, A)
      }
      return { S: f.X.S, X: f.X, Y: g.Y, f: res }
    }

  // Identity map for a complex
  const idChain =
    <R>(F: Pick<Field<R>, 'zero' | 'one'>) =>
    (X: Complex<R>): ChainMap<R> => {
      const f: Record<number, R[][]> = {}
      for (const n of X.degrees) {
        const d = X.dim[n] ?? 0
        f[n] = Array.from({ length: d }, (_, i) =>
          Array.from({ length: d }, (_, j) => (i === j ? F.one : F.zero))
        )
      }
      return { S: X.S, X, Y: X, f }
    }

  // Build adjacency from covers for BFS
  const adjacency = (I: FinitePoset): ReadonlyMap<ObjId, ReadonlyArray<ObjId>> => {
    const adj = new Map<ObjId, ObjId[]>()
    for (const a of I.objects) {
      for (const b of I.objects) {
        if (a !== b && I.leq(a, b)) {
          const isCover = !I.objects.some(c => c !== a && c !== b && I.leq(a, c) && I.leq(c, b))
          if (isCover) {
            if (!adj.has(a)) adj.set(a, [])
            adj.get(a)!.push(b)
          }
        }
      }
    }
    for (const o of I.objects) if (!adj.has(o)) adj.set(o, [])
    return adj
  }

  // Find a (cover) path a -> ... -> b (BFS)
  const findPath = (I: FinitePoset, a: ObjId, b: ObjId): ObjId[] | undefined => {
    if (a === b) return [a]
    const adj = adjacency(I)
    const q: ObjId[] = [a]
    const prev = new Map<ObjId, ObjId | null>([[a, null]])
    while (q.length) {
      const x = q.shift()!
      for (const y of adj.get(x) ?? []) {
        if (!prev.has(y)) {
          prev.set(y, x)
          if (y === b) {
            const path: ObjId[] = [b]
            let cur: ObjId | null = b
            while ((cur = prev.get(cur)!) !== null) path.push(cur)
            path.reverse()
            return path
          }
          q.push(y)
        }
      }
    }
    return undefined
  }

  /** Wrap a diagram with a closure that synthesizes composites along covers. */
  export const saturate =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>): PosetDiagram<R> => {
      const baseArr = D.arr
      const cache = new Map<ObjId, Map<ObjId, ChainMap<R>>>()
      const put = (a: ObjId, b: ObjId, f: ChainMap<R>) => {
        if (!cache.has(a)) cache.set(a, new Map())
        cache.get(a)!.set(b, f)
      }
      const getCached = (a: ObjId, b: ObjId) => cache.get(a)?.get(b)

      const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined => {
        const hit = getCached(a, b)
        if (hit) return hit
        const given = baseArr(a, b)
        if (given) {
          put(a, b, given)
          return given
        }
        if (!D.I.leq(a, b)) return undefined
        if (a === b) {
          const id = idChain(F)(D.X[a]!)
          put(a, a, id)
          return id
        }

        const path = findPath(D.I, a, b)
        if (!path) return undefined
        let cur: ChainMap<R> | undefined
        for (let i = 0; i < path.length - 1; i++) {
          const u = path[i]!
          const v = path[i + 1]!
          const step = baseArr(u, v) ?? getCached(u, v)
          if (!step) {
            return undefined
          }
          cur = i === 0 ? step : composeChainMap(F)(step, cur!)
        }
        if (cur) put(a, b, cur)
        return cur
      }

      return {
        I: D.I,
        X: D.X,
        arr
      }
    }

  type Equality<M> = (left: M, right: M) => boolean

  const morphismEquality = <O, M>(category: Category<O, M>, eq?: Equality<M>): Equality<M> => {
    if (eq) {
      return eq
    }
    if (typeof category.equalMor === "function") {
      return (left, right) => category.equalMor!(left, right)
    }
    return (left, right) => Object.is(left, right)
  }

  export interface FiniteDiagram<I, A, O, M> {
    readonly shape: FiniteCategoryT<I, A>
    readonly onObjects: (object: I) => O
    readonly onMorphisms: (arrow: A) => M
    readonly objects: ReadonlyArray<I>
    readonly arrows: ReadonlyArray<A>
    readonly arrowLookup: ReadonlyMap<A, M>
  }

  export interface CloseFiniteDiagramInput<I, A, O, M> {
    readonly ambient: SmallCategory<I, A>
    readonly target: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly onObjects: (object: I) => O
    readonly seeds: ReadonlyArray<{ arrow: A; morphism: M }>
    readonly objects?: Iterable<I>
    readonly eq?: Equality<M>
  }

  export const closeFiniteDiagram = <I, A, O, M>(
    input: CloseFiniteDiagramInput<I, A, O, M>,
  ): FiniteDiagram<I, A, O, M> => {
    const { ambient, target, onObjects, seeds, eq } = input
    const objectSeeds = input.objects ? Array.from(input.objects) : []

    const ensureAmbientObject = (object: I): void => {
      if (!ambient.objects.has(object)) {
        throw new Error("closeFiniteDiagram: object is not part of the ambient category")
      }
    }

    objectSeeds.forEach(ensureAmbientObject)

    const seedArrows = new Set<A>()
    const seedObjects = new Set<I>(objectSeeds)

    for (const { arrow } of seeds) {
      if (!ambient.arrows.has(arrow)) {
        throw new Error("closeFiniteDiagram: seed arrow is not part of the ambient category")
      }
      seedArrows.add(arrow)
      const src = ambient.src(arrow)
      const dst = ambient.dst(arrow)
      ensureAmbientObject(src)
      ensureAmbientObject(dst)
      seedObjects.add(src)
      seedObjects.add(dst)
    }

    const closure = makeSubcategory(ambient, seedObjects, seedArrows)
    const objectsArray = Array.from(closure.objects)
    const equality = morphismEquality(target, eq)

    const objectImage = new Map<I, O>()
    for (const object of objectsArray) {
      objectImage.set(object, onObjects(object))
    }

    const arrowMap = new Map<A, M>()
    const arrowList: A[] = []

    const recordArrow = (arrow: A, morphism: M): boolean => {
      if (!closure.arrows.has(arrow)) {
        throw new Error("closeFiniteDiagram: arrow is not part of the closure")
      }
      const src = closure.src(arrow)
      const dst = closure.dst(arrow)
      const dom = target.dom(morphism)
      const cod = target.cod(morphism)
      const expectedDom = objectImage.get(src)
      const expectedCod = objectImage.get(dst)
      if (expectedDom === undefined || expectedCod === undefined) {
        throw new Error("closeFiniteDiagram: morphism references an object outside the closure")
      }
      if (!Object.is(dom, expectedDom) || !Object.is(cod, expectedCod)) {
        throw new Error("closeFiniteDiagram: morphism endpoints do not match the arrow endpoints")
      }
      const existing = arrowMap.get(arrow)
      if (existing) {
        if (!equality(existing, morphism)) {
          throw new Error("closeFiniteDiagram: inconsistent morphism assignment detected")
        }
        return false
      }
      arrowMap.set(arrow, morphism)
      arrowList.push(arrow)
      return true
    }

    for (const object of objectsArray) {
      const image = objectImage.get(object)!
      const idArrow = closure.id(object)
      const idMorph = target.id(image)
      recordArrow(idArrow, idMorph)
    }

    for (const { arrow, morphism } of seeds) {
      recordArrow(arrow, morphism)
    }

    const closureArrows = Array.from(closure.arrows)
    let changed = true
    while (changed) {
      changed = false
      for (const f of closureArrows) {
        const fImage = arrowMap.get(f)
        if (!fImage) continue
        for (const g of closureArrows) {
          const gImage = arrowMap.get(g)
          if (!gImage) continue
          if (!Object.is(closure.dst(f), closure.src(g))) continue
          if (!Object.is(target.cod(fImage), target.dom(gImage))) {
            throw new Error("closeFiniteDiagram: seed morphisms are not composable in the target category")
          }
          const composite = closure.compose(g, f)
          const composed = target.compose(gImage, fImage)
          const inserted = recordArrow(composite, composed)
          if (inserted) {
            changed = true
          }
        }
      }
    }

    if (arrowMap.size !== closure.arrows.size) {
      throw new Error("closeFiniteDiagram: could not extend the morphism assignment to the closure")
    }

    const homBySource = new Map<I, Map<I, A[]>>()
    for (const arrow of arrowList) {
      const src = closure.src(arrow)
      const dst = closure.dst(arrow)
      let bySource = homBySource.get(src)
      if (!bySource) {
        bySource = new Map<I, A[]>()
        homBySource.set(src, bySource)
      }
      let bucket = bySource.get(dst)
      if (!bucket) {
        bucket = []
        bySource.set(dst, bucket)
      }
      bucket.push(arrow)
    }

    const shape: FiniteCategoryT<I, A> = {
      objects: objectsArray.slice(),
      hom: (a, b) => homBySource.get(a)?.get(b)?.slice() ?? [],
      id: (object) => {
        const idArrow = closure.id(object)
        if (!arrowMap.has(idArrow)) {
          throw new Error("closeFiniteDiagram: identity arrow missing from closure")
        }
        return idArrow
      },
      compose: (g, f) => {
        if (!Object.is(closure.dst(f), closure.src(g))) {
          throw new Error("closeFiniteDiagram: attempted to compose non-composable arrows")
        }
        const composite = closure.compose(g, f)
        if (!arrowMap.has(composite)) {
          throw new Error("closeFiniteDiagram: composite arrow missing from closure")
        }
        return composite
      },
      dom: (arrow) => closure.src(arrow),
      cod: (arrow) => closure.dst(arrow),
    }

    const onObjectsLookup = (object: I): O => {
      const image = objectImage.get(object)
      if (image === undefined) {
        throw new Error("closeFiniteDiagram: object is not part of the closure")
      }
      return image
    }

    const onMorphismsLookup = (arrow: A): M => {
      const morphism = arrowMap.get(arrow)
      if (morphism === undefined) {
        throw new Error("closeFiniteDiagram: arrow is not part of the closure")
      }
      return morphism
    }

    return {
      shape,
      onObjects: onObjectsLookup,
      onMorphisms: onMorphismsLookup,
      objects: shape.objects,
      arrows: arrowList.slice(),
      arrowLookup: new Map(arrowMap),
    }
  }
}
