import { describe, test, expect } from 'vitest'
import {
  // FinSet
  FinSet,
  FinSetObj,
  FinSetMor,
  // small cat + functor
  FiniteCategory,
  CFunctor,
  codensityCarrierFinSet,
  homSetObjFinSet,
  expFinSet
} from '../allTS'

function discCat(objects: string[]): FiniteCategory<string, { from: string; to: string }> {
  return {
    objects,
    id: (o) => ({ from: o, to: o }),
    compose: (g, f) => ({ from: f.from, to: g.to }),
    isId: (m) => m.from === m.to,
    dom: (m) => m.from,
    cod: (m) => m.to,
    hom: (a, b) => (a === b ? [{ from: a, to: a }] : [])
  }
}

describe('Codensity carrier via end in FinSet', () => {
  test('Discrete B: T^G(A) = ∏_b (G b)^(Hom(A,G b))', () => {
    const B = discCat(['b0','b1'])
    const X0: FinSetObj = { elements: [0,1] }      // |X0|=2
    const X1: FinSetObj = { elements: ['x'] }      // |X1|=1
    const G: CFunctor<string, any, FinSetObj, FinSetMor> = {
      source: B, 
      target: FinSet, 
      onObj: (b) => (b==='b0'? X0 : X1), 
      onMor: (m) => ({ from: X0, to: X0, map: [0,1] })
    }
    const A: FinSetObj = { elements: ['a','b'] }   // |A|=2
    const T = codensityCarrierFinSet(B, G, A)

    // discrete ⇒ end is just product; sizes:
    // |Hom(A,X0)| = 2^2 = 4, hence |X0|^|Hom| = 2^4 = 16
    // |Hom(A,X1)| = 1^2 = 1, hence |X1|^|Hom| = 1^1 = 1
    // total |T| = 16 * 1 = 16
    expect(T.elements.length).toBe(16)
  })

  test('FinSet exponentials work correctly', () => {
    const X: FinSetObj = { elements: ['a', 'b'] }  // 2 elements
    const S: FinSetObj = { elements: [0, 1] }      // 2 elements
    
    const XpowS = expFinSet(X, S)
    expect(XpowS.elements.length).toBe(4) // 2^2 = 4 functions
    
    // Each function should be array of length |S| with values in [0, |X|-1]
    for (const func of XpowS.elements) {
      expect((func as number[]).length).toBe(2)
      for (const val of func as number[]) {
        expect(val >= 0 && val < 2).toBe(true)
      }
    }
  })

  test('Hom-set objects computed correctly', () => {
    const A: FinSetObj = { elements: ['x'] }      // 1 element
    const B: FinSetObj = { elements: [1, 2, 3] }  // 3 elements
    
    const HomAB = homSetObjFinSet(A, B)
    expect(HomAB.elements.length).toBe(3) // 3^1 = 3 functions
    
    // Each function maps 1 element to one of 3 targets
    const expectedMaps = [[0], [1], [2]]
    for (const expectedMap of expectedMaps) {
      expect(HomAB.elements).toContainEqual(expectedMap)
    }
  })

  test('Exponential postcompose works correctly', () => {
    const X: FinSetObj = { elements: ['a', 'b'] }
    const Y: FinSetObj = { elements: [1, 2, 3] }
    const S: FinSetObj = { elements: [0] }  // singleton
    
    const h: FinSetMor = { from: X, to: Y, map: [1, 2] } // a->2, b->3
    
    const postcomp = expPostcompose(h, S)
    
    // X^S has 2 elements: [0], [1] (functions from S to X)
    // Y^S has 3 elements: [0], [1], [2] (functions from S to Y)
    // Postcompose should map [0] -> [1], [1] -> [2]
    expect(postcomp.from.elements.length).toBe(2)
    expect(postcomp.to.elements.length).toBe(3)
  })

  test('End construction handles empty categories', () => {
    const emptyB = discCat([])
    const G: CFunctor<string, any, FinSetObj, FinSetMor> = {
      source: emptyB,
      target: FinSet,
      onObj: (_b) => ({ elements: [] }),
      onMor: (_m) => ({ from: { elements: [] }, to: { elements: [] }, map: [] })
    }
    const A: FinSetObj = { elements: ['test'] }
    
    // Empty category should give terminal object (singleton)
    const T = codensityCarrierFinSet(emptyB, G, A)
    expect(T.elements.length).toBe(1) // terminal object in FinSet
  })
})