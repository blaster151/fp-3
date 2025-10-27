import { describe, expect, it } from 'vitest'
import {
  FieldQ,
  Qof,
  packagePermutationRepresentation,
  representationInvariants,
  enumerateIntertwiners,
  analyzeSubrepresentation,
  type PermutationRepresentationPackage,
} from '../allTS'
import type { RepresentationPermutationAction } from '../allTS'
import { cyclicGroup } from './laws/fixtures/finGrp'

const q = (n: number, d = 1) => Qof(n, d)
const requireEq = <R>(predicate: ((a: R, b: R) => boolean) | undefined) => {
  if (!predicate) throw new Error('expected equality predicate for field')
  return predicate
}

describe('finite-group representation toolkit', () => {
  const group = cyclicGroup(3, 'C₃')
  const basis = ['e0', 'e1', 'e2'] as const
  const action: RepresentationPermutationAction = {
    basis,
    permutation: (element: string) => {
      const shift = Number(element) % basis.length
      return basis.map((_, index) => (index + shift) % basis.length)
    },
  }
  const pkg: PermutationRepresentationPackage<ReturnType<typeof Qof>> =
    packagePermutationRepresentation({ F: FieldQ, group, action, label: 'C₃-regular' })
  const eq = requireEq(FieldQ.eq)

  it('packages permutation actions into faithful representations', () => {
    expect(pkg.dimension).toBe(3)
    expect(pkg.basis).toEqual([...basis])

    const identity = pkg.matrices['0']
    if (!identity) throw new Error('identity matrix missing')
    for (let i = 0; i < pkg.dimension; i++) {
      for (let j = 0; j < pkg.dimension; j++) {
        const expected = i === j ? FieldQ.one : FieldQ.zero
        expect(eq(identity[i]![j]!, expected)).toBe(true)
      }
    }

    const rotation = pkg.matrices['1']
    if (!rotation) throw new Error('rotation matrix missing')
    expect(eq(rotation[1]![0]!, FieldQ.one)).toBe(true) // e0 ↦ e1
    expect(eq(rotation[2]![1]!, FieldQ.one)).toBe(true) // e1 ↦ e2
    expect(eq(rotation[0]![2]!, FieldQ.one)).toBe(true) // e2 ↦ e0
  })

  it('recovers invariant vectors via stacked (ρ(g)−I) kernels', () => {
    const invariants = representationInvariants(FieldQ)(pkg.representation, pkg.elements)
    expect(invariants.dimension).toBe(1)
    const [vector] = invariants.basis
    if (!vector) throw new Error('expected non-trivial invariant vector')
    expect(vector.length).toBe(pkg.dimension)
    for (let i = 1; i < vector.length; i++) {
      expect(eq(vector[i]!, vector[0]!)).toBe(true)
    }
  })

  it('enumerates intertwiners commuting with the action', () => {
    const intertwiners = enumerateIntertwiners(FieldQ)(
      pkg.representation,
      pkg.representation,
      pkg.elements,
    )
    expect(intertwiners.dimension).toBe(3)
    expect(intertwiners.variables).toBe(9)
  })

  it('diagnoses candidate subrepresentations', () => {
    const trivial = analyzeSubrepresentation(FieldQ)(
      pkg.representation,
      [[q(1), q(1), q(1)]],
      pkg.elements,
    )
    expect(trivial.invariant).toBe(true)
    const rotation = trivial.transitionMatrices['1']
    if (!rotation) throw new Error('missing transition matrix for generator')
    expect(rotation.length).toBe(1)
    expect(eq(rotation[0]![0]!, FieldQ.one)).toBe(true)

    const nonInvariant = analyzeSubrepresentation(FieldQ)(
      pkg.representation,
      [[q(1), q(0), q(0)]],
      pkg.elements,
    )
    expect(nonInvariant.invariant).toBe(false)
    expect(nonInvariant.failures.length).toBeGreaterThan(0)

    const twoDimensional = analyzeSubrepresentation(FieldQ)(
      pkg.representation,
      [
        [q(1), q(-1), q(0)],
        [q(1), q(0), q(-1)],
      ],
      pkg.elements,
    )
    expect(twoDimensional.invariant).toBe(true)
    const generator = twoDimensional.transitionMatrices['1']
    if (!generator) throw new Error('missing induced action on two-dimensional subspace')
    expect(generator.length).toBe(2)
    expect(generator[0]?.length).toBe(2)
    expect(eq(generator[0]![0]!, q(-1))).toBe(true)
    expect(eq(generator[1]![0]!, q(1))).toBe(true)
    expect(eq(generator[0]![1]!, q(-1))).toBe(true)
    expect(eq(generator[1]![1]!, q(0))).toBe(true)
  })
})
