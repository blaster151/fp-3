import { describe, expect, it } from 'vitest'

import {
  analyzeTopInternalGroup,
  checkInternalGroupAssociativity,
  checkInternalGroupInversion,
  checkInternalGroupUnit,
  makeTopInternalGroupWitness,
} from '../../allTS'
import { discrete, structureFromTop } from '../../src/top/Topology'

const eqBit = (a: number, b: number) => a === b
const carrier = [0, 1]

const makeWitness = () =>
  makeTopInternalGroupWitness<number>({
    structure: structureFromTop(eqBit, discrete(carrier)),
    multiply: (left, right) => (left + right) % 2,
    inverse: (value) => value,
    unit: 0,
  })

const skewMultiply = (left: number, right: number) => (left === 1 ? 0 : right)

describe('Top internal groups via discrete topologies', () => {
  it('satisfies the internal-group associativity, unit, and inversion laws', () => {
    const context = makeWitness()

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

  it('summarises all internal-group checks via analyzeTopInternalGroup', () => {
    const context = makeWitness()
    const analysis = analyzeTopInternalGroup(context)

    expect(analysis.overall).toBe(true)
    expect(analysis.issues).toHaveLength(0)
    expect(analysis.associativity.holds).toBe(true)
    expect(analysis.unit.holds).toBe(true)
    expect(analysis.inversion.holds).toBe(true)
    expect(analysis.diagonalPairing?.left).toBe(true)
    expect(analysis.diagonalPairing?.right).toBe(true)
    expect(analysis.context.object).toBe(context.object)
    expect(analysis.context.object.structure.eq).toBe(eqBit)
  })

  it('detects a multiplication that breaks associativity', () => {
    const context = makeWitness()
    const [leftProjection, rightProjection] = context.witness.product.projections
    const brokenMultiplication = {
      ...context.witness.multiplication,
      map: (value: unknown) =>
        skewMultiply(leftProjection.map(value as never), rightProjection.map(value as never)),
    }

    const result = checkInternalGroupAssociativity({
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

    const result = checkInternalGroupUnit({
      category: context.category,
      witness: { ...context.witness, unit: { ...context.witness.unit, arrow: skewUnit } },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('unit'))).toBe(true)
  })

  it('highlights inverses that do not collapse to the identity', () => {
    const context = makeWitness()
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
    const context = makeWitness()
    const diagonal = context.witness.diagonal
    if (!diagonal) {
      throw new Error('Expected the Top witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminate = context.witness.unit.terminal.terminate(context.witness.object)
    const constantUnit = context.category.compose(context.witness.unit.arrow, terminate)

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [idG, constantUnit]),
    }

    const analysis = analyzeTopInternalGroup({
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
      object: context.object,
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.right).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('⟨i, id⟩'))).toBe(true)
  })

  it('rejects multiplication that leaves the carrier', () => {
    expect(() =>
      makeTopInternalGroupWitness({
        structure: structureFromTop(eqBit, discrete(carrier)),
        multiply: () => 2,
        inverse: (value: number) => value,
        unit: 0,
      }),
    ).toThrow(/carrier/)
  })
})
