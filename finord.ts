// finord.ts — skeletal FinSet using finite ordinals as objects
// Objects: n ∈ ℕ (standing for {0,…,n-1})
// Morphisms: arbitrary functions f: [m] -> [n], represented as arrays length m with values in 0..n-1

export type Ord = number & { __tag: 'FinOrd' }

export type OrdHom = {
  readonly dom: Ord
  readonly cod: Ord
  // f(i) ∈ [0..n-1] for i ∈ [0..m-1]
  readonly map: ReadonlyArray<number>
}

export const OrdObj = (n: number): Ord => {
  if (!Number.isInteger(n) || n < 0) throw new Error('FinOrd: object must be a nonnegative integer')
  return n as Ord
}

export const idOrd = (n: Ord): OrdHom => ({
  dom: n,
  cod: n,
  map: Array.from({ length: n }, (_, i) => i),
})

export const composeOrd = (g: OrdHom, f: OrdHom): OrdHom => {
  // g ∘ f, with f: m→n and g: n→p
  if (f.cod !== g.dom) throw new Error('FinOrd: compose dom/cod mismatch')
  const m = f.dom
  const p = g.cod
  const map = Array.from({ length: m }, (_, i) => {
    const fi = f.map[i]!
    if (fi < 0 || fi >= g.dom) throw new Error('FinOrd: f(i) out of range for g.dom')
    const gi = g.map[fi]!
    if (gi === undefined) throw new Error('FinOrd: g map missing image')
    return gi
  })
  for (const v of map) {
    if (v < 0 || v >= p) throw new Error('FinOrd: composite value out of range')
  }
  return { dom: f.dom, cod: g.cod, map }
}

export const mkOrdHom = (m: Ord, n: Ord, map: ReadonlyArray<number>): OrdHom => {
  if (map.length !== m) throw new Error('FinOrd: map length must equal domain size')
  for (const v of map) {
    if (!Number.isInteger(v) || v < 0 || v >= n) throw new Error('FinOrd: map value outside codomain')
  }
  return { dom: m, cod: n, map: [...map] }
}

export const isIsoOrd = (h: OrdHom): boolean => {
  if (h.dom !== h.cod) return false
  const seen = new Set<number>()
  for (const v of h.map) {
    if (!Number.isInteger(v) || v < 0 || v >= h.cod) return false
    seen.add(v)
  }
  return seen.size === h.cod
}

export const transportToOrd = <A, B>(
  f: Map<A, B>,
  bijA: Map<A, number>,
  bijBInv: Map<number, B>,
): OrdHom => {
  const n = bijA.size as Ord
  const m = bijBInv.size as Ord
  const arr: number[] = Array.from({ length: n }, (_, i) => {
    const entryA = [...bijA.entries()].find(([, idx]) => idx === i)
    if (!entryA) throw new Error('transportToOrd: domain element missing in bijection')
    const a = entryA[0]
    const b = f.get(a)
    const entryB = [...bijBInv.entries()].find(([, el]) => el === b)
    if (!entryB) throw new Error('transportToOrd: codomain element not in bijection')
    return entryB[0]
  })
  return mkOrdHom(n, m, arr)
}
