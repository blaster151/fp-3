import { describe, expect, it } from 'vitest'

import {
  analyzeFinGrpInternalGroup,
  checkInternalGroupAssociativity,
  checkInternalGroupInversion,
  checkInternalGroupUnit,
  makeFinGrpInternalGroupWitness,
} from '../../allTS'
import type { FinGrpObj, Hom } from '../../models/fingroup-cat'

const cyclicGroup = (order: number, name: string): FinGrpObj => {
  const elems = Array.from({ length: order }, (_, index) => index.toString())
  const add = (mod: number) => (a: string, b: string) => ((Number(a) + Number(b)) % mod).toString()
  const inv = (mod: number) => (a: string) => ((mod - Number(a)) % mod).toString()
  return {
    name,
    elems,
    e: '0',
    mul: add(order),
    inv: inv(order),
  }
}

describe('Finite groups as internal groups in Set', () => {
  const Z3 = cyclicGroup(3, 'Z₃')
  const skewMultiply = (left: string, right: string) => ((Number(left) + 2 * Number(right)) % 3).toString()
  const context = makeFinGrpInternalGroupWitness(Z3)

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

  it('summarises all internal-group checks via analyzeFinGrpInternalGroup', () => {
    const analysis = analyzeFinGrpInternalGroup(context)

    expect(analysis.overall).toBe(true)
    expect(analysis.issues).toHaveLength(0)
    expect(analysis.associativity.holds).toBe(true)
    expect(analysis.unit.holds).toBe(true)
    expect(analysis.inversion.holds).toBe(true)
    expect(analysis.diagonalPairing?.left).toBe(true)
    expect(analysis.diagonalPairing?.right).toBe(true)
    expect(analysis.context.group).toBe(Z3)
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

    const result = checkInternalGroupAssociativity({
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

    const result = checkInternalGroupUnit({
      category: context.category,
      witness: { ...context.witness, unit: { ...context.witness.unit, arrow: skewUnit } },
    })

    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('unit'))).toBe(true)
  })

  it('highlights inverses that do not collapse to the identity', () => {
    const identityInverse: Hom = {
      ...context.witness.inverse,
      map: (value) => value,
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
      throw new Error('Expected the FinGrp witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminate = context.witness.unit.terminal.terminate(context.witness.object)
    const constantUnit = context.category.compose(context.witness.unit.arrow, terminate)

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [idG, constantUnit]),
    }

    const analysis = analyzeFinGrpInternalGroup({
      group: context.group,
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.right).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('⟨i, id⟩'))).toBe(true)
  })
})
