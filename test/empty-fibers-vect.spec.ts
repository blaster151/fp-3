import { describe, test, expect } from 'vitest'
import {
  EnhancedVect,
  CategoryLimits,
  IndexedFamilies
} from '../allTS'

describe('Empty fibers use initial/terminal in Vect', () => {
  test('Empty coproduct -> initial (zeroVect); Empty product -> terminal (zeroVect)', () => {
    const Ifin0 = { carrier: [] as readonly number[] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (_i) => ({ dim: 1 })

    const { coproduct } = CategoryLimits.finiteCoproductEx(Ifin0, F, EnhancedVect.VectCoproductsEx)
    const { product } = CategoryLimits.finiteProductEx(Ifin0, F, EnhancedVect.VectProductsEx)

    expect(coproduct.dim).toBe(0)
    expect(product.dim).toBe(0)
  })

  test('Zero object is both initial and terminal', () => {
    expect(EnhancedVect.zeroVect.dim).toBe(0)
    expect(EnhancedVect.oneVect.dim).toBe(0)
    expect(EnhancedVect.zeroVect).toBe(EnhancedVect.oneVect) // same object
    
    expect(EnhancedVect.VectInitial.initialObj).toBe(EnhancedVect.zeroVect)
    expect(EnhancedVect.VectTerminal.terminalObj).toBe(EnhancedVect.oneVect)
  })

  test('Empty family operations handle zero dimensions correctly', () => {
    const emptyIdx = { carrier: [] as readonly string[] }
    const emptyFam: IndexedFamilies.Family<string, EnhancedVect.VectObj> = (_i) => ({ dim: 5 })
    
    // Should use zero object when no indices
    const { product } = CategoryLimits.finiteProductEx(emptyIdx, emptyFam, EnhancedVect.VectProductsEx)
    const { coproduct } = CategoryLimits.finiteCoproductEx(emptyIdx, emptyFam, EnhancedVect.VectCoproductsEx)
    
    expect(product.dim).toBe(0)
    expect(coproduct.dim).toBe(0)
  })

  test('Extended finite operations fall back to regular when non-empty', () => {
    const idx = { carrier: [0, 1] }
    const fam = (i: number) => ({ dim: i + 1 })
    
    const regular = CategoryLimits.finiteProduct(idx, fam, EnhancedVect.VectHasFiniteProducts)
    const extended = CategoryLimits.finiteProductEx(idx, fam, EnhancedVect.VectProductsEx)
    
    expect(extended.product.dim).toBe(regular.product.dim)
    expect(extended.projections(0).to.dim).toBe(regular.projections(0).to.dim)
  })
})