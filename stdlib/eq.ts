import type { Eq } from "../core"

export const eqStrict = <A>(): Eq<A> => (x, y) => Object.is(x, y)

export const eqSetNative = <A>(a: ReadonlySet<A>, b: ReadonlySet<A>): boolean => {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}

export const eqSetBy =
  <A>(eqA: Eq<A>) =>
  (a: ReadonlySet<A>, b: ReadonlySet<A>): boolean => {
    if (a.size !== b.size) return false
    const bs = Array.from(b)
    const used = new Set<number>()
    outer: for (const av of a) {
      for (let i = 0; i < bs.length; i++) {
        if (used.has(i)) continue
        if (eqA(av, bs[i]!)) {
          used.add(i)
          continue outer
        }
      }
      return false
    }
    return true
  }

export const eqMapNative =
  <K, V>(eqV: Eq<V>) =>
  (a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>): boolean => {
    if (a.size !== b.size) return false
    for (const [k, vA] of a) {
      if (!b.has(k)) return false
      const vB = b.get(k) as V
      if (!eqV(vA, vB)) return false
    }
    return true
  }

export const eqMapBy =
  <K, V>(eqK: Eq<K>, eqV: Eq<V>) =>
  (a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>): boolean => {
    if (a.size !== b.size) return false
    const eb = Array.from(b.entries())
    const used = new Set<number>()
    outer: for (const [ka, va] of a) {
      for (let i = 0; i < eb.length; i++) {
        if (used.has(i)) continue
        const [kb, vb] = eb[i]!
        if (eqK(ka, kb) && eqV(va, vb)) {
          used.add(i)
          continue outer
        }
      }
      return false
    }
    return true
  }
