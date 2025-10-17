import { describe, expect, it } from 'vitest'

import {
  analyzeManInternalGroup,
  checkInternalGroupAssociativity,
  checkInternalGroupInversion,
  checkInternalGroupUnit,
  makeManInternalGroupWitness,
} from '../../allTS'

const modulo = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus

describe('Smooth internal groups approximated by circle samples', () => {
  const modulus = 4
  const carrier = Array.from({ length: modulus }, (_, index) => index)
  const add = (left: number, right: number) => modulo(left + right, modulus)
  const negate = (value: number) => modulo(-value, modulus)
  const skewMultiply = (left: number, right: number) => modulo(left + 2 * right, modulus)

  const smoothness = {
    certifyBinary: (map: (left: number, right: number) => number) =>
      carrier.every((left) =>
        carrier.every((right) => map(left, right) === add(left, right)),
      ),
    certifyUnary: (map: (value: number) => number) =>
      carrier.every((value) => map(value) === negate(value)),
    certifyConstant: (value: number) => carrier.includes(value),
  }

  const context = makeManInternalGroupWitness({
    carrier,
    eq: (left, right) => left === right,
    multiply: add,
    inverse: negate,
    unit: 0,
    smoothness,
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

  it('summarises all internal-group checks via analyzeManInternalGroup', () => {
    const analysis = analyzeManInternalGroup(context)

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
      map: (value: { left: number; right: number }) => skewMultiply(value.left, value.right),
    }

    const result = checkInternalGroupAssociativity({
      category: context.category,
      witness: { ...context.witness, multiplication: brokenMultiplication },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('associativity'))).toBe(true)
  })

  it('flags a unit that fails the constant-law requirement', () => {
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
      throw new Error('Expected the Man witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminate = context.witness.unit.terminal.terminate(context.witness.object)
    const constantUnit = context.category.compose(context.witness.unit.arrow, terminate)

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [idG, constantUnit]),
    }

    const analysis = analyzeManInternalGroup({
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
      object: context.object,
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.right).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('⟨i, id⟩'))).toBe(true)
  })
})
