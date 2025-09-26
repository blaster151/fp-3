import { describe, expect, it } from 'vitest'
import { composeOrd, idOrd, isIsoOrd, mkOrdHom, OrdObj } from '../finord'

describe('FinOrd skeleton of FinSet', () => {
  it('constructs identities and composes morphisms', () => {
    const m = OrdObj(3)
    const n = OrdObj(4)
    const p = OrdObj(2)
    const f = mkOrdHom(m, n, [1, 0, 3])
    const g = mkOrdHom(n, p, [1, 1, 0, 0])
    const gof = composeOrd(g, f)
    const expectedMap = f.map.map(idx => g.map[idx]!)
    expect(gof).toEqual({ dom: m, cod: p, map: expectedMap })
  })

  it('detects isomorphisms via permutations', () => {
    const m = OrdObj(3)
    const id = idOrd(m)
    expect(isIsoOrd(id)).toBe(true)
    const notIso = mkOrdHom(m, m, [0, 0, 1])
    expect(isIsoOrd(notIso)).toBe(false)
  })
})
