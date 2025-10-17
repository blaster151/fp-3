import { describe, expect, it } from 'vitest'

import {
  analyzeFinGrpInternalMonoid,
  checkInternalMonoidAssociativity,
  checkInternalMonoidUnit,
  makeFinGrpInternalMonoidWitness,
} from '../../allTS'
import type { FinGrpObj, Hom } from '../../models/fingroup-cat'

const cyclicGroup = (order: number, name: string): FinGrpObj => {
  const elems = Array.from({ length: order }, (_, index) => index.toString())
  const add = (mod: number) => (a: string, b: string) => ((Number(a) + Number(b)) % mod).toString()
  return {
    name,
    elems,
    e: '0',
    mul: add(order),
    inv: (value: string) => ((order - Number(value)) % order).toString(),
  }
}

describe('Finite groups as internal monoids in Set', () => {
  const Z3 = cyclicGroup(3, 'Z₃')
  const skewMultiply = (left: string, right: string) => ((Number(left) + 2 * Number(right)) % 3).toString()
  const context = makeFinGrpInternalMonoidWitness(Z3)

  it('satisfies the internal-monoid associativity and unit laws', () => {
    const associativity = checkInternalMonoidAssociativity(context)
    expect(associativity.holds).toBe(true)
    expect(associativity.issues).toHaveLength(0)

    const unit = checkInternalMonoidUnit(context)
    expect(unit.holds).toBe(true)
    expect(unit.issues).toHaveLength(0)
  })

  it('aggregates the internal-monoid checks via analyzeFinGrpInternalMonoid', () => {
    const analysis = analyzeFinGrpInternalMonoid(context)

    expect(analysis.overall).toBe(true)
    expect(analysis.issues).toHaveLength(0)
    expect(analysis.associativity.holds).toBe(true)
    expect(analysis.unit.holds).toBe(true)
    expect(analysis.diagonalPairing?.self).toBe(true)
    expect(analysis.context.monoid).toBe(Z3)
  })

  it('detects a multiplication that breaks associativity', () => {
    const [leftProjection, rightProjection] = context.witness.product.projections
    const brokenMultiplication: Hom = {
      ...context.witness.multiplication,
      map: (value) => {
        const left = leftProjection.map(value)
        const right = rightProjection.map(value)
        return skewMultiply(left, right)
      },
    }

    const result = checkInternalMonoidAssociativity({
      category: context.category,
      witness: { ...context.witness, multiplication: brokenMultiplication },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('associativity'))).toBe(true)
  })

  it('flags a unit that fails the left or right law', () => {
    const skewUnit: Hom = {
      ...context.witness.unit.arrow,
      map: () => '1',
    }

    const result = checkInternalMonoidUnit({
      category: context.category,
      witness: { ...context.witness, unit: { ...context.witness.unit, arrow: skewUnit } },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('unit'))).toBe(true)
  })

  it('reports diagonal mismatches when the diagonal arrow is perturbed', () => {
    const diagonal = context.witness.diagonal
    if (!diagonal) {
      throw new Error('Expected the FinGrp monoid witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminate = context.witness.unit.terminal.terminate(context.witness.object)
    const constantUnit = context.category.compose(context.witness.unit.arrow, terminate)

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [constantUnit, idG]),
    }

    const analysis = analyzeFinGrpInternalMonoid({
      monoid: context.monoid,
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.self).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('diagonal'))).toBe(true)
  })
})
