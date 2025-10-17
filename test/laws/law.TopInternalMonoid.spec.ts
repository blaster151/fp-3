import { describe, expect, it } from 'vitest'

import {
  analyzeTopInternalMonoid,
  checkInternalMonoidAssociativity,
  checkInternalMonoidUnit,
  makeTopInternalMonoidWitness,
} from '../../allTS'
import { discrete } from '../../src/top/Topology'

const eqBit = (a: number, b: number) => a === b
const carrier = [0, 1]

const makeWitness = () =>
  makeTopInternalMonoidWitness<number>({
    topology: discrete(carrier),
    eq: eqBit,
    multiply: (left, right) => (left + right) % 2,
    unit: 0,
  })

const skewMultiply = (left: number, right: number) => (left === 1 ? 0 : right)

describe('Top internal monoids via discrete topologies', () => {
  it('satisfies the internal-monoid associativity and unit laws', () => {
    const context = makeWitness()

    const associativity = checkInternalMonoidAssociativity(context)
    expect(associativity.holds).toBe(true)
    expect(associativity.issues).toHaveLength(0)

    const unit = checkInternalMonoidUnit(context)
    expect(unit.holds).toBe(true)
    expect(unit.issues).toHaveLength(0)
  })

  it('aggregates the internal-monoid checks via analyzeTopInternalMonoid', () => {
    const context = makeWitness()
    const analysis = analyzeTopInternalMonoid(context)

    expect(analysis.overall).toBe(true)
    expect(analysis.issues).toHaveLength(0)
    expect(analysis.associativity.holds).toBe(true)
    expect(analysis.unit.holds).toBe(true)
    expect(analysis.diagonalPairing?.self).toBe(true)
    expect(analysis.context.object).toBe(context.object)
  })

  it('detects a multiplication that breaks associativity', () => {
    const context = makeWitness()
    const [leftProjection, rightProjection] = context.witness.product.projections
    const brokenMultiplication = {
      ...context.witness.multiplication,
      map: (value: unknown) =>
        skewMultiply(leftProjection.map(value as never), rightProjection.map(value as never)),
    }

    const result = checkInternalMonoidAssociativity({
      category: context.category,
      witness: { ...context.witness, multiplication: brokenMultiplication },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('associativity'))).toBe(true)
  })

  it('flags a unit arrow that fails the left or right law', () => {
    const context = makeWitness()
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

  it('highlights diagonal pairing mismatches when the diagonal is perturbed', () => {
    const context = makeWitness()
    const diagonal = context.witness.diagonal
    if (!diagonal) {
      throw new Error('Expected the Top monoid witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminate = context.witness.unit.terminal.terminate(context.witness.object)
    const constantUnit = context.category.compose(context.witness.unit.arrow, terminate)

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [constantUnit, idG]),
    }

    const analysis = analyzeTopInternalMonoid({
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
      object: context.object,
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.self).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('diagonal'))).toBe(true)
  })

  it('rejects multiplications that leave the carrier', () => {
    expect(() =>
      makeTopInternalMonoidWitness({
        topology: discrete(carrier),
        eq: eqBit,
        multiply: () => 2,
        unit: 0,
      }),
    ).toThrow(/carrier/)
  })
})
