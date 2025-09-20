import { describe, test, expect } from 'vitest'
import {
  // FinSet
  FinSet,
  FinSetObj,
  FinSetMor,
  // tiny cat/functor
  FiniteCategory,
  CFunctor,
  // codensity
  codensityCarrierFinSet,
  codensityUnitFinSet,
  codensityMuFinSet,
  codensityMapFinSet
} from '../allTS'

// Discrete 1-object category
function disc1(): FiniteCategory<'b', { from: 'b'; to: 'b' }> {
  return {
    objects: ['b'],
    id: () => ({ from: 'b', to: 'b' }),
    compose: (g, f) => ({ from: f.from, to: g.to }),
    isId: (m) => true,
    dom: (m) => m.from,
    cod: (m) => m.to,
    hom: (_a, _b) => [{ from: 'b', to: 'b' }]
  }
}

describe('Codensity monad in FinSet — functoriality + monad laws (tiny case)', () => {
  test('T is a functor; left unit and associativity hold', () => {
    const B = disc1()
    const X: FinSetObj = { elements: [0] }                 // |X| = 1 (keeps sizes tiny)
    const G: CFunctor<'b', any, FinSetObj, FinSetMor> = {
      source: B,
      target: FinSet,
      onObj: (_b) => X,
      onMor: (_m) => FinSet.id(X)
    }

    // A and A' arbitrary small sets
    const A: FinSetObj = { elements: ['a', 'b'] }
    const A2: FinSetObj = { elements: ['z'] }

    // carrier objects
    const TA = codensityCarrierFinSet(B, G, A)
    const TA2 = codensityCarrierFinSet(B, G, A2)
    const TTA = codensityCarrierFinSet(B, G, TA)
    const TTTA = codensityCarrierFinSet(B, G, TTA)
    // (Everything is size 1 with X singleton.)
    expect(TA.elements.length).toBe(1)
    expect(TA2.elements.length).toBe(1)
    expect(TTA.elements.length).toBe(1)
    expect(TTTA.elements.length).toBe(1)

    // T on morphisms
    const f: FinSetMor = { from: A, to: A2, map: [0, 0] } // collapse both to the single element
    const g: FinSetMor = { from: A2, to: A2, map: [0] }   // id
    const idA: FinSetMor = FinSet.id(A)

    const Tf = codensityMapFinSet(B, G, f)
    const Tg = codensityMapFinSet(B, G, g)
    const TidA = codensityMapFinSet(B, G, idA)

    // Functoriality: T(id) = id, T(g∘f) = T(g)∘T(f)
    expect(FinSet.equalMor!(TidA, FinSet.id(TA))).toBe(true)
    const gof = FinSet.compose(g, f)
    const Tgof = codensityMapFinSet(B, G, gof)
    expect(FinSet.equalMor!(Tgof, FinSet.compose(Tg, Tf))).toBe(true)

    // Unit and multiplication
    const etaA = codensityUnitFinSet(B, G, A)   // A -> T A
    const muA = codensityMuFinSet(B, G, A)     // T T A -> T A
    const etaTA = codensityUnitFinSet(B, G, TA)  // T A -> T T A
    const muTA = codensityMuFinSet(B, G, TA)    // T T T A -> T T A

    // Left unit: μ_A ∘ T(η_A) = id_{T A}
    const TetaA = codensityMapFinSet(B, G, etaA) // T(η_A): T A -> T T A
    const leftUnit = FinSet.compose(muA, TetaA)
    expect(FinSet.equalMor!(leftUnit, FinSet.id(TA))).toBe(true)

    // Associativity: μ_A ∘ T(μ_A) = μ_A ∘ μ_{T A}
    const TmuA = codensityMapFinSet(B, G, muA)   // T(μ_A): T T T A -> T T A
    const lhs = FinSet.compose(muA, TmuA)       // TTTA -> TA
    const rhs = FinSet.compose(muA, muTA)       // TTTA -> TA
    expect(FinSet.equalMor!(lhs, rhs)).toBe(true)
  })

  test('codensity functor preserves identity and composition', () => {
    const B = disc1()
    const X: FinSetObj = { elements: [0] }
    const G: CFunctor<'b', any, FinSetObj, FinSetMor> = {
      source: B,
      target: FinSet,
      onObj: (_b) => X,
      onMor: (_m) => FinSet.id(X)
    }

    const A: FinSetObj = { elements: ['a'] }
    const B_obj: FinSetObj = { elements: ['b'] }
    const C: FinSetObj = { elements: ['c'] }

    // morphisms
    const f: FinSetMor = { from: A, to: B_obj, map: [0] }
    const g: FinSetMor = { from: B_obj, to: C, map: [0] }
    const idA = FinSet.id(A)

    // T preserves identity
    const TA = codensityCarrierFinSet(B, G, A)
    const TidA = codensityMapFinSet(B, G, idA)
    expect(FinSet.equalMor!(TidA, FinSet.id(TA))).toBe(true)

    // T preserves composition
    const gf = FinSet.compose(g, f)
    const Tf = codensityMapFinSet(B, G, f)
    const Tg = codensityMapFinSet(B, G, g)
    const Tgf = codensityMapFinSet(B, G, gf)
    const TgTf = FinSet.compose(Tg, Tf)
    
    expect(FinSet.equalMor!(Tgf, TgTf)).toBe(true)
  })

  test('codensity monad satisfies unit laws', () => {
    const B = disc1()
    const X: FinSetObj = { elements: [0] }
    const G: CFunctor<'b', any, FinSetObj, FinSetMor> = {
      source: B,
      target: FinSet,
      onObj: (_b) => X,
      onMor: (_m) => FinSet.id(X)
    }

    const A: FinSetObj = { elements: ['x'] }
    const TA = codensityCarrierFinSet(B, G, A)
    const TTA = codensityCarrierFinSet(B, G, TA)

    const eta = codensityUnitFinSet(B, G, A)    // A -> TA
    const mu = codensityMuFinSet(B, G, A)       // TTA -> TA
    const etaTA = codensityUnitFinSet(B, G, TA) // TA -> TTA
    const Teta = codensityMapFinSet(B, G, eta)  // TA -> TTA

    // Right unit: μ ∘ η_{TA} = id_{TA}
    const rightUnit = FinSet.compose(mu, etaTA)
    expect(FinSet.equalMor!(rightUnit, FinSet.id(TA))).toBe(true)

    // Left unit: μ ∘ T(η) = id_{TA}  
    const leftUnit = FinSet.compose(mu, Teta)
    expect(FinSet.equalMor!(leftUnit, FinSet.id(TA))).toBe(true)
  })
})