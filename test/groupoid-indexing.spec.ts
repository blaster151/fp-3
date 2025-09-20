import { describe, test, expect } from 'vitest'
import {
  // groupoid core
  FiniteGroupoid,
  GFunctor,
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
    const IfinH = { carrier: ['h'] as const }

    // G: two objects a,b isomorphic
    const G = twoObjIsoGroupoid('a', 'b')

    // u: both a,b ↦ h
    const u: GFunctor<'a' | 'b', any, 'h', any> = {
      source: G as any,
      target: H as any,
      onObj: (_g) => 'h',
      onMor: (_m) => ({ tag: 'Id', obj: 'h' } as any)
    }

    // Fobj: map both to same Vect dim (iso-invariant scenario)
    const Fobj: IndexedFamilies.Family<'a' | 'b', EnhancedVect.VectObj> = (g) => ({ dim: 2 })

    const Lan = lanGroupoidViaClasses(H as any, G as any, u, Fobj, IfinH as any, EnhancedVect.VectHasFiniteCoproducts)
    const Ran = ranGroupoidViaClasses(H as any, G as any, u, Fobj, IfinH as any, EnhancedVect.VectHasFiniteProducts)

    // Since a~b in G and both map to class of h, Lan/Ran use a single representative ⇒ dim 2
    expect(Lan.at('h').dim).toBe(2)
    expect(Ran.at('h').dim).toBe(2)
  })

  test('Keeps distinct non-isomorphic G-objects in the fiber', () => {
    // H: discrete with objects h0,h1; u(g)=h0 for both g
    const H = DiscreteCategory.DiscreteAsGroupoid(['h0', 'h1'] as const)
    const IfinH = { carrier: ['h0', 'h1'] as const }

    // G: discrete (no iso between a and b)
    const Gdisc = DiscreteCategory.DiscreteAsGroupoid(['a', 'b'] as const)

    const u: GFunctor<'a' | 'b', any, 'h0' | 'h1', any> = {
      source: Gdisc as any,
      target: H as any,
      onObj: (_g) => 'h0',
      onMor: (m) => m as any
    }

    const Fobj: IndexedFamilies.Family<'a' | 'b', EnhancedVect.VectObj> = (g) => ({ dim: g === 'a' ? 2 : 3 })

    const Lan = lanGroupoidViaClasses(H as any, Gdisc as any, u, Fobj, IfinH as any, EnhancedVect.VectHasFiniteCoproducts)
    const Ran = ranGroupoidViaClasses(H as any, Gdisc as any, u, Fobj, IfinH as any, EnhancedVect.VectHasFiniteProducts)

    // No iso collapsing: Lan('h0') is direct sum of dims 2 and 3; Ran('h0') same total dim in Vect
    expect(Lan.at('h0').dim).toBe(5)
    expect(Ran.at('h0').dim).toBe(5)

    // Nothing maps (up to iso) to h1 ⇒ zero-length (co)products: we model as empty fold ⇒ 0-dim object
    expect(Lan.at('h1').dim).toBe(0)
    expect(Ran.at('h1').dim).toBe(0)
  })

  test('Groupoid Kan respects isomorphism structure', () => {
    // Create a groupoid with non-trivial isomorphisms
    const G = twoObjIsoGroupoid('x', 'y')
    const H = DiscreteCategory.DiscreteAsGroupoid(['target'])
    
    // All objects map to the same target
    const u: GFunctor<'x' | 'y', any, 'target', any> = {
      source: G as any,
      target: H as any,
      onObj: (_g) => 'target',
      onMor: (_m) => ({ tag: 'Id', obj: 'target' } as any)
    }
    
    // Different dimensions but isomorphic objects
    const Fobj: IndexedFamilies.Family<'x' | 'y', EnhancedVect.VectObj> = (g) => ({ dim: g === 'x' ? 3 : 3 })
    
    const IfinH = { carrier: ['target'] as const }
    const Lan = lanGroupoidViaClasses(H as any, G as any, u, Fobj, IfinH as any, EnhancedVect.VectHasFiniteCoproducts)
    
    // Should collapse to single representative since x ≅ y
    expect(Lan.at('target').dim).toBe(3) // only one representative, not 6
    expect(Lan.injections('target').length).toBe(1) // only one injection
  })
})