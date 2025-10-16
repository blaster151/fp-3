import { describe, expect, it } from 'vitest'

import {
  analyzeInternalMonoid,
  analyzeM2InternalMonoid,
  checkInternalMonoidAssociativity,
  checkInternalMonoidUnit,
  checkM2InternalMonoidCompatibility,
  makeM2InternalMonoidWitness,
} from '../../allTS'
import type { FinGrpObj } from '../../models/fingroup-cat'

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

describe('Internal monoids inside M₂', () => {
  const Z3 = cyclicGroup(3, 'Z₃')

  it('builds a witness when the endomorphism is a monoid homomorphism', () => {
    const collapseToIdentity = () => '0'
    const compatibility = checkM2InternalMonoidCompatibility({
      monoid: Z3,
      endomorphism: collapseToIdentity,
    })

    expect(compatibility.holds).toBe(true)
    expect(compatibility.issues).toHaveLength(0)

    const context = makeM2InternalMonoidWitness({ monoid: Z3, endomorphism: collapseToIdentity })

    const m2Analysis = analyzeM2InternalMonoid({
      witness: context,
      monoid: Z3,
      endomorphism: collapseToIdentity,
    })

    expect(m2Analysis.overall).toBe(true)
    expect(m2Analysis.compatibility.holds).toBe(true)
    expect(m2Analysis.issues).toHaveLength(0)
    expect(m2Analysis.associativity.holds).toBe(true)
    expect(m2Analysis.unit.holds).toBe(true)
    expect(m2Analysis.diagonalPairing?.self).toBe(true)

    const associativity = checkInternalMonoidAssociativity(context)
    expect(associativity.holds).toBe(true)
    expect(associativity.issues).toHaveLength(0)

    const unit = checkInternalMonoidUnit(context)
    expect(unit.holds).toBe(true)
    expect(unit.issues).toHaveLength(0)
  })

  it('rejects endomorphisms that fail to respect multiplication', () => {
    const skewProjection = (value: string) => (value === '2' ? '1' : value)
    const compatibility = checkM2InternalMonoidCompatibility({
      monoid: Z3,
      endomorphism: skewProjection,
    })

    expect(compatibility.holds).toBe(false)
    expect(compatibility.issues.some((issue) => issue.includes('monoid homomorphism'))).toBe(true)
    expect(() => makeM2InternalMonoidWitness({ monoid: Z3, endomorphism: skewProjection })).toThrow()
  })

  it('surfaces unit misalignment diagnostics', () => {
    const moveUnit = (value: string) => (value === '0' ? '1' : value)
    const compatibility = checkM2InternalMonoidCompatibility({
      monoid: Z3,
      endomorphism: moveUnit,
    })

    expect(compatibility.holds).toBe(false)
    expect(compatibility.issues.some((issue) => issue.includes('unit element'))).toBe(true)
  })

  it('aggregates compatibility failures via analyzeM2InternalMonoid', () => {
    const collapseToIdentity = () => '0'
    const context = makeM2InternalMonoidWitness({
      monoid: Z3,
      endomorphism: collapseToIdentity,
    })

    const skewProjection = (value: string) => (value === '2' ? '1' : value)
    const analysis = analyzeM2InternalMonoid({
      witness: context,
      monoid: Z3,
      endomorphism: skewProjection,
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.compatibility.holds).toBe(false)
    expect(analysis.associativity.holds).toBe(true)
    expect(analysis.unit.holds).toBe(true)
    expect(analysis.issues.some((issue) => issue.includes('monoid homomorphism'))).toBe(true)
  })

  it('detects diagonal pairing mismatches when the diagonal is perturbed', () => {
    const collapseToIdentity = () => '0'
    const context = makeM2InternalMonoidWitness({ monoid: Z3, endomorphism: collapseToIdentity })
    const diagonal = context.witness.diagonal
    if (!diagonal) {
      throw new Error('Expected the M₂ monoid witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminate = context.witness.unit.terminal.terminate(context.witness.object)
    const constantUnit = context.category.compose(context.witness.unit.arrow, terminate)

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [idG, constantUnit]),
    }

    const analysis = analyzeInternalMonoid({
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.self).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('diagonal'))).toBe(true)
  })
})
