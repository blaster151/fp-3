import type { ChainMap, Complex, Field, FinitePoset, ObjId, PosetDiagram } from "../allTS"

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
}
