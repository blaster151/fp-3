import { describe, expect, it } from 'vitest'

import {
  analyzeFinGrpInternalMonoid,
  checkInternalMonoidAssociativity,
  checkInternalMonoidUnit,
  makeFinGrpInternalMonoidWitness,
} from '../../allTS'
import type { Hom } from '../../models/fingroup-cat'
import { cyclicGroup, symmetricGroupS3 } from './fixtures/finGrp'

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

  it('rejects non-abelian groups when building the internal-monoid witness', () => {
    const S3 = symmetricGroupS3()
    expect(() => makeFinGrpInternalMonoidWitness(S3)).toThrow(
      /makeFinGrpInternalMonoidWitness\(S₃\): multiplication must be a FinGrp homomorphism; internal monoids in Grp require abelian carriers \(dom=S₃×S₃, cod=S₃\): .*fails to preserve products/,
    )
  })
})
