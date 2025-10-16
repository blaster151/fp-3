import { describe, expect, it } from 'vitest'

import {
  analyzeManInternalMonoid,
  checkInternalMonoidAssociativity,
  checkInternalMonoidUnit,
  makeManInternalMonoidWitness,
} from '../../allTS'

const modulo = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus

describe('Smooth internal monoids approximated by circle samples', () => {
  const modulus = 4
  const carrier = Array.from({ length: modulus }, (_, index) => index)
  const add = (left: number, right: number) => modulo(left + right, modulus)

  const smoothness = {
    certifyBinary: (map: (left: number, right: number) => number) =>
      carrier.every((left) => carrier.every((right) => map(left, right) === add(left, right))),
    certifyUnary: (map: (value: number) => number) =>
      carrier.every((value) => map(value) === value),
    certifyConstant: (value: number) => carrier.includes(value),
  }

  const context = makeManInternalMonoidWitness({
    carrier,
    eq: (left, right) => left === right,
    multiply: add,
    unit: 0,
    smoothness,
  })

  it('satisfies the internal-monoid associativity and unit laws', () => {
    const associativity = checkInternalMonoidAssociativity(context)
    expect(associativity.holds).toBe(true)
    expect(associativity.issues).toHaveLength(0)

    const unit = checkInternalMonoidUnit(context)
    expect(unit.holds).toBe(true)
    expect(unit.issues).toHaveLength(0)
  })

  it('summarises all internal-monoid checks via analyzeManInternalMonoid', () => {
    const analysis = analyzeManInternalMonoid(context)

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
      map: () => 0,
    }

    const result = checkInternalMonoidAssociativity({
      category: context.category,
      witness: { ...context.witness, multiplication: brokenMultiplication },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('associativity'))).toBe(true)
  })

  it('flags a unit arrow that fails the constant-law requirement', () => {
    const skewUnit = {
      ...context.witness.unit.arrow,
      map: () => 1,
    }

    const result = checkInternalMonoidUnit({
      category: context.category,
      witness: { ...context.witness, unit: { ...context.witness.unit, arrow: skewUnit } },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('unit'))).toBe(true)
  })

  it('detects diagonal pairing mismatches when the diagonal is perturbed', () => {
    const diagonal = context.witness.diagonal
    if (!diagonal) {
      throw new Error('Expected the Man monoid witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminate = context.witness.unit.terminal.terminate(context.witness.object)
    const constantUnit = context.category.compose(context.witness.unit.arrow, terminate)

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [constantUnit, idG]),
    }

    const analysis = analyzeManInternalMonoid({
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
      object: context.object,
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.self).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('diagonal'))).toBe(true)
  })

  it('rejects multiplication witnesses that fail the smoothness check', () => {
    expect(() =>
      makeManInternalMonoidWitness({
        carrier,
        eq: (left, right) => left === right,
        multiply: () => 0,
        unit: 0,
        smoothness,
      }),
    ).toThrow(/smooth/)
  })
})
