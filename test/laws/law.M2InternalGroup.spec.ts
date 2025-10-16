import { describe, expect, it } from 'vitest'

import {
  analyzeInternalGroup,
  analyzeM2InternalGroup,
  checkInternalGroupAssociativity,
  checkInternalGroupInversion,
  checkInternalGroupUnit,
  checkM2InternalGroupCompatibility,
  makeM2InternalGroupWitness,
} from '../../allTS'
import type { FinGrpObj } from '../../models/fingroup-cat'

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

describe('Internal groups inside M₂', () => {
  const Z3 = cyclicGroup(3, 'Z₃')

  it('builds a witness when the idempotent is a group homomorphism', () => {
    const collapseToIdentity = () => '0'
    const compatibility = checkM2InternalGroupCompatibility({
      group: Z3,
      endomorphism: collapseToIdentity,
    })

    expect(compatibility.holds).toBe(true)
    expect(compatibility.issues).toHaveLength(0)

    const context = makeM2InternalGroupWitness({ group: Z3, endomorphism: collapseToIdentity })

    const m2Analysis = analyzeM2InternalGroup({
      witness: context,
      group: Z3,
      endomorphism: collapseToIdentity,
    })

    expect(m2Analysis.overall).toBe(true)
    expect(m2Analysis.compatibility.holds).toBe(true)
    expect(m2Analysis.issues).toHaveLength(0)
    expect(m2Analysis.associativity.holds).toBe(true)
    expect(m2Analysis.unit.holds).toBe(true)
    expect(m2Analysis.inversion.holds).toBe(true)
    expect(m2Analysis.diagonalPairing?.left).toBe(true)
    expect(m2Analysis.diagonalPairing?.right).toBe(true)

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

  it('rejects endomorphisms that fail to respect multiplication', () => {
    const skewProjection = (value: string) => (value === '2' ? '1' : value)
    const compatibility = checkM2InternalGroupCompatibility({
      group: Z3,
      endomorphism: skewProjection,
    })

    expect(compatibility.holds).toBe(false)
    expect(compatibility.issues.some((issue) => issue.includes('group homomorphism'))).toBe(true)
    expect(() => makeM2InternalGroupWitness({ group: Z3, endomorphism: skewProjection })).toThrow()
  })

  it('surfaces unit misalignment diagnostics', () => {
    const moveUnit = (value: string) => (value === '0' ? '1' : value)
    const compatibility = checkM2InternalGroupCompatibility({
      group: Z3,
      endomorphism: moveUnit,
    })

    expect(compatibility.holds).toBe(false)
    expect(compatibility.issues.some((issue) => issue.includes('unit element'))).toBe(true)
  })

  it('aggregates compatibility failures via analyzeM2InternalGroup', () => {
    const collapseToIdentity = () => '0'
    const context = makeM2InternalGroupWitness({
      group: Z3,
      endomorphism: collapseToIdentity,
    })

    const skewProjection = (value: string) => (value === '2' ? '1' : value)
    const analysis = analyzeM2InternalGroup({
      witness: context,
      group: Z3,
      endomorphism: skewProjection,
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.compatibility.holds).toBe(false)
    expect(analysis.associativity.holds).toBe(true)
    expect(analysis.unit.holds).toBe(true)
    expect(analysis.inversion.holds).toBe(true)
    expect(analysis.issues.some((issue) => issue.includes('group homomorphism'))).toBe(true)
  })

  it('detects diagonal pairing mismatches when the diagonal is perturbed', () => {
    const collapseToIdentity = () => '0'
    const context = makeM2InternalGroupWitness({ group: Z3, endomorphism: collapseToIdentity })
    const diagonal = context.witness.diagonal
    if (!diagonal) {
      throw new Error('Expected the M₂ witness to expose a diagonal')
    }

    const idG = context.category.id(context.witness.object)
    const terminate = context.witness.unit.terminal.terminate(context.witness.object)
    const constantUnit = context.category.compose(context.witness.unit.arrow, terminate)

    const skewDiagonal = {
      ...diagonal,
      arrow: context.witness.product.tuple(diagonal.factor.object, [idG, constantUnit]),
    }

    const analysis = analyzeInternalGroup({
      category: context.category,
      witness: { ...context.witness, diagonal: skewDiagonal },
    })

    expect(analysis.overall).toBe(false)
    expect(analysis.diagonalPairing?.right).toBe(false)
    expect(analysis.issues.some((issue) => issue.includes('⟨i, id⟩'))).toBe(true)
  })
})
