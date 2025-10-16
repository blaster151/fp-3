import { describe, expect, it } from 'vitest'

import {
  analyzeSetInternalMonoid,
  checkInternalMonoidAssociativity,
  checkInternalMonoidUnit,
  makeSetInternalMonoidWitness,
} from '../../allTS'

describe('Internal monoids in Set', () => {
  const booleanMonoid = {
    carrier: [false, true] as const,
    eq: (left: boolean, right: boolean) => left === right,
    multiply: (left: boolean, right: boolean) => left || right,
    unit: false,
  }

  const context = makeSetInternalMonoidWitness(booleanMonoid)

  it('satisfies the internal monoid associativity and unit laws', () => {
    const associativity = checkInternalMonoidAssociativity(context)
    expect(associativity.holds).toBe(true)
    expect(associativity.issues).toHaveLength(0)

    const unit = checkInternalMonoidUnit(context)
    expect(unit.holds).toBe(true)
    expect(unit.issues).toHaveLength(0)
  })

  it('aggregates the internal monoid checks via analyzeSetInternalMonoid', () => {
    const analysis = analyzeSetInternalMonoid(context)

    expect(analysis.overall).toBe(true)
    expect(analysis.issues).toHaveLength(0)
    expect(analysis.associativity.holds).toBe(true)
    expect(analysis.unit.holds).toBe(true)
    expect(analysis.diagonalPairing?.self).toBe(true)
    expect(analysis.context.object).toBe(context.object)
  })

  it('detects a multiplication that breaks associativity', () => {
    const brokenMultiplication = {
      ...context.witness.multiplication,
      map: (value: { left: boolean }) => value.left,
    }

    const result = checkInternalMonoidAssociativity({
      category: context.category,
      witness: { ...context.witness, multiplication: brokenMultiplication },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('associativity'))).toBe(true)
  })

  it('flags a unit arrow that fails the left or right law', () => {
    const skewUnit = {
      ...context.witness.unit.arrow,
      map: () => true,
    }

    const result = checkInternalMonoidUnit({
      category: context.category,
      witness: { ...context.witness, unit: { ...context.witness.unit, arrow: skewUnit } },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('unit'))).toBe(true)
  })

  it('highlights diagonal pairing mismatches when the diagonal is perturbed', () => {
    const diagonal = context.witness.diagonal
    if (!diagonal) {
      throw new Error('Expected the Set monoid witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminate = context.witness.unit.terminal.terminate(context.witness.object)
    const constantUnit = context.category.compose(context.witness.unit.arrow, terminate)

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [constantUnit, constantUnit]),
    }

    const analysis = analyzeSetInternalMonoid({
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
      object: context.object,
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.self).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('diagonal'))).toBe(true)
  })
})
