import { describe, expect, it } from 'vitest'

import {
  analyzeSetInternalGroup,
  checkInternalGroupAssociativity,
  checkInternalGroupInversion,
  checkInternalGroupUnit,
  makeSetInternalGroupWitness,
} from '../../allTS'

describe('Set internal groups from classical group data', () => {
  const order = 4
  const carrier = Array.from({ length: order }, (_, index) => index)
  const modAdd = (left: number, right: number) => (left + right) % order
  const modNeg = (value: number) => (order - value) % order

  const context = makeSetInternalGroupWitness({
    carrier,
    eq: (left, right) => left === right,
    multiply: modAdd,
    inverse: modNeg,
    unit: 0,
  })

  it('satisfies the internal-group associativity, unit, and inversion laws', () => {
    const associativity = checkInternalGroupAssociativity(context)
    expect(associativity.holds).toBe(true)
    expect(associativity.issues).toHaveLength(0)

    const unit = checkInternalGroupUnit(context)
    expect(unit.holds).toBe(true)
    expect(unit.issues).toHaveLength(0)

    const inversion = checkInternalGroupInversion(context)
    expect(inversion.holds).toBe(true)
    expect(inversion.issues).toHaveLength(0)
  })

  it('summarises all internal-group checks via analyzeSetInternalGroup', () => {
    const analysis = analyzeSetInternalGroup(context)
    expect(analysis.overall).toBe(true)
    expect(analysis.issues).toHaveLength(0)
    expect(analysis.associativity.holds).toBe(true)
    expect(analysis.unit.holds).toBe(true)
    expect(analysis.inversion.holds).toBe(true)
    expect(analysis.diagonalPairing?.left).toBe(true)
    expect(analysis.diagonalPairing?.right).toBe(true)
    expect(analysis.context.object).toBe(context.object)
  })

  it('detects a multiplication that breaks associativity', () => {
    const brokenMultiplication = {
      ...context.witness.multiplication,
      map: () => 0,
    }

    const result = checkInternalGroupAssociativity({
      category: context.category,
      witness: { ...context.witness, multiplication: brokenMultiplication },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('associativity'))).toBe(true)
  })

  it('flags a unit that fails either unit law', () => {
    const skewUnit = {
      ...context.witness.unit.arrow,
      map: () => 1,
    }

    const result = checkInternalGroupUnit({
      category: context.category,
      witness: { ...context.witness, unit: { ...context.witness.unit, arrow: skewUnit } },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('unit'))).toBe(true)
  })

  it('highlights inverses that fail to reach the identity', () => {
    const identityInverse = {
      ...context.witness.inverse,
      map: (value: number) => value,
    }

    const result = checkInternalGroupInversion({
      category: context.category,
      witness: { ...context.witness, inverse: identityInverse },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('inverse'))).toBe(true)
  })

  it('detects diagonal pairing mismatches when the diagonal is perturbed', () => {
    const diagonal = context.witness.diagonal
    if (!diagonal) {
      throw new Error('Expected the Set witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminalElement = context.witness.unit.terminal.object.carrier[0]
    const unitValue = context.witness.unit.arrow.map(terminalElement)
    const constantUnit = {
      ...idG,
      map: () => unitValue,
    }

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [idG, constantUnit]),
    }

    const analysis = analyzeSetInternalGroup({
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
      object: context.object,
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.right).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('⟨i, id⟩'))).toBe(true)
  })
})
