import { describe, test, expect } from 'vitest'
import {
  // groupoid core
  DiscreteCategory,
  hasIso,
  isoClasses,
  twoObjIsoGroupoid,
  // Kan (groupoid) via classes
  lanGroupoidViaClasses,
  ranGroupoidViaClasses,
  // family & indices
  IndexedFamilies,
  // Vect
  EnhancedVect
} from '../allTS'
import type { GFunctor } from '../allTS'

describe('Groupoid basics', () => {
  test('isoClasses & hasIso on a 2-object iso groupoid', () => {
    const G = twoObjIsoGroupoid('a', 'b')
    const classes = isoClasses(G)
    expect(classes.length).toBe(1)
    expect(hasIso(G, 'a', 'b')).toBe(true)
    expect(hasIso(G, 'a', 'a')).toBe(true)
  })

  test('DiscreteAsGroupoid creates proper groupoid structure', () => {
    const G = DiscreteCategory.DiscreteAsGroupoid(['x', 'y', 'z'])
    
    expect(G.objects).toEqual(['x', 'y', 'z'])
    expect(G.hom('x', 'x').length).toBe(1) // identity
    expect(G.hom('x', 'y').length).toBe(0) // no morphisms between different objects
    
    const idX = G.id('x')
    expect(G.dom(idX)).toBe('x')
    expect(G.cod(idX)).toBe('x')
    expect(G.inv(idX)).toBe(idX) // identity inverts to itself
  })

  test('isoClasses partitions discrete groupoid correctly', () => {
    const G = DiscreteCategory.DiscreteAsGroupoid(['a', 'b', 'c'])
    const classes = isoClasses(G)
    
    // Each object should be in its own class (no isomorphisms in discrete)
    expect(classes.length).toBe(3)
    expect(classes.every(cls => cls.length === 1)).toBe(true)
  })
})

describe('Lan/Ran via isomorphism classes (Vect)', () => {
  test('Collapses isomorphic G-objects that map to the same H-iso-class', () => {
    // H: single object h with only identity (discrete-1 groupoid)
    const H = DiscreteCategory.DiscreteAsGroupoid(['h'] as const)
    const HIndex = IndexedFamilies.finiteIndex(H.objects)

    // G: two objects a,b isomorphic
    const G = twoObjIsoGroupoid<'a' | 'b'>('a', 'b')

    type GObj = (typeof G)['objects'][number]
    type GMor = ReturnType<typeof G['id']>
    type HObj = (typeof H)['objects'][number]
    type HMor = ReturnType<typeof H['id']>

    const targetObj: HObj = H.objects[0]!

    // u: both a,b ↦ h
    const u: GFunctor<GObj, GMor, HObj, HMor> = {
      source: G,
      target: H,
      onObj: () => targetObj,
      onMor: () => H.id(targetObj)
    }

    // Fobj: map both to same Vect dim (iso-invariant scenario)
    const Fobj: IndexedFamilies.Family<GObj, EnhancedVect.VectObj> = () => ({ dim: 2 })

    const Lan = lanGroupoidViaClasses(H, G, u, Fobj, HIndex, EnhancedVect.VectHasFiniteCoproducts)
    const Ran = ranGroupoidViaClasses(H, G, u, Fobj, HIndex, EnhancedVect.VectHasFiniteProducts)

    // Since a~b in G and both map to class of h, Lan/Ran use a single representative ⇒ dim 2
    expect(Lan.at('h').dim).toBe(2)
    expect(Ran.at('h').dim).toBe(2)
  })

  test('Keeps distinct non-isomorphic G-objects in the fiber', () => {
    // H: discrete with objects h0,h1; u(g)=h0 for both g
    const H = DiscreteCategory.DiscreteAsGroupoid(['h0', 'h1'] as const)
    const HIndex = IndexedFamilies.finiteIndex(H.objects)

    // G: discrete (no iso between a and b)
    const Gdisc = DiscreteCategory.DiscreteAsGroupoid(['a', 'b'] as const)

    type GObj = (typeof Gdisc)['objects'][number]
    type GMor = ReturnType<typeof Gdisc['id']>
    type HObj = (typeof H)['objects'][number]
    type HMor = ReturnType<typeof H['id']>

    const targetObj: HObj = H.objects[0]!

    const u: GFunctor<GObj, GMor, HObj, HMor> = {
      source: Gdisc,
      target: H,
      onObj: () => targetObj,
      onMor: () => H.id(targetObj)
    }

    const Fobj: IndexedFamilies.Family<GObj, EnhancedVect.VectObj> = (g) => ({ dim: g === 'a' ? 2 : 3 })

    const Lan = lanGroupoidViaClasses(H, Gdisc, u, Fobj, HIndex, EnhancedVect.VectHasFiniteCoproducts)
    const Ran = ranGroupoidViaClasses(H, Gdisc, u, Fobj, HIndex, EnhancedVect.VectHasFiniteProducts)

    // No iso collapsing: Lan('h0') is direct sum of dims 2 and 3; Ran('h0') same total dim in Vect
    expect(Lan.at('h0').dim).toBe(5)
    expect(Ran.at('h0').dim).toBe(5)

    // Nothing maps (up to iso) to h1 ⇒ zero-length (co)products: we model as empty fold ⇒ 0-dim object
    expect(Lan.at('h1').dim).toBe(0)
    expect(Ran.at('h1').dim).toBe(0)
  })

  test('Groupoid Kan respects isomorphism structure', () => {
    // Create a groupoid with non-trivial isomorphisms
    const G = twoObjIsoGroupoid<'x' | 'y'>('x', 'y')
    const H = DiscreteCategory.DiscreteAsGroupoid(['target'] as const)

    type GObj = (typeof G)['objects'][number]
    type GMor = ReturnType<typeof G['id']>
    type HObj = (typeof H)['objects'][number]
    type HMor = ReturnType<typeof H['id']>

    const targetObj: HObj = H.objects[0]!

    // All objects map to the same target
    const u: GFunctor<GObj, GMor, HObj, HMor> = {
      source: G,
      target: H,
      onObj: () => targetObj,
      onMor: () => H.id(targetObj)
    }

    // Different dimensions but isomorphic objects
    const Fobj: IndexedFamilies.Family<GObj, EnhancedVect.VectObj> = (g) => ({ dim: g === 'x' ? 3 : 3 })

    const HIndex = IndexedFamilies.finiteIndex(H.objects)
    const Lan = lanGroupoidViaClasses(H, G, u, Fobj, HIndex, EnhancedVect.VectHasFiniteCoproducts)
    
    // Should collapse to single representative since x ≅ y
    expect(Lan.at('target').dim).toBe(3) // only one representative, not 6
    expect(Lan.injections('target').length).toBe(1) // only one injection
  })
})