import { describe, expect, it } from 'vitest'
import {
  Algebra,
  FieldReal,
  matMul,
} from '../allTS'
import { symmetricGroupS3 } from './laws/fixtures/finGrp'

const F = FieldReal
const multiply = matMul(F)

type PermutationName = '(12)' | '(123)'

const permutationMatrices: Record<PermutationName, number[][]> = {
  '(12)': [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ],
  '(123)': [
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0],
  ],
}

const permutationMatrix = (name: PermutationName): number[][] =>
  permutationMatrices[name].map((row) => row.slice())

const permutationRepresentation = {
  F,
  dimV: 3,
  mat: (name: PermutationName) => permutationMatrix(name),
}

const signValues: Record<PermutationName, number> = {
  '(12)': -1,
  '(123)': 1,
}

const signRepresentation = {
  F,
  dimV: 1,
  mat: (name: PermutationName) => [[signValues[name]]],
}

const trivialRepresentation = {
  F,
  dimV: 1,
  mat: (_name: PermutationName) => [[1]],
}

const generators: PermutationName[] = ['(12)', '(123)']

const applyMatrix = (M: ReadonlyArray<ReadonlyArray<number>>, v: ReadonlyArray<number>): number[] =>
  M.map((row) => row.reduce((sum, entry, index) => sum + entry * v[index]!, 0))

describe('intertwiner spaces', () => {
  it('computes the commutant of the permutation representation', () => {
    const result = Algebra.intertwinerSpace(FieldReal)(
      permutationRepresentation,
      permutationRepresentation,
      generators,
    )
    expect(result.dimension).toBe(2)
    expect(result.basis).toHaveLength(2)
    for (const T of result.basis) {
      for (const g of generators) {
        const left = multiply(permutationRepresentation.mat(g), T)
        const right = multiply(T, permutationRepresentation.mat(g))
        expect(left).toEqual(right)
      }
    }
  })

  it('finds the averaging intertwiner to the trivial representation', () => {
    const result = Algebra.intertwinerSpace(FieldReal)(
      permutationRepresentation,
      trivialRepresentation,
      generators,
    )
    expect(result.dimension).toBe(1)
    const [basis] = result.basis
    expect(basis).toBeDefined()
    for (const g of generators) {
      const left = multiply(trivialRepresentation.mat(g), basis)
      const right = multiply(basis, permutationRepresentation.mat(g))
      expect(left).toEqual(right)
    }
  })

  it('returns only the zero map between sign and trivial representations', () => {
    const result = Algebra.intertwinerSpace(FieldReal)(
      signRepresentation,
      trivialRepresentation,
      generators,
    )
    expect(result.dimension).toBe(0)
    expect(result.basis).toHaveLength(0)
  })
})

describe('invariant subspaces', () => {
  it('detects the one-dimensional fixed subspace of the permutation representation', () => {
    const result = Algebra.invariantSubspace(FieldReal)(permutationRepresentation, generators)
    expect(result.dimension).toBe(1)
    expect(result.basis).toHaveLength(1)
    const [vector] = result.basis
    expect(vector).toBeDefined()
    for (const g of generators) {
      const image = applyMatrix(permutationRepresentation.mat(g), vector)
      expect(image).toEqual(vector)
    }
  })

  it('has no non-zero invariants for the sign representation', () => {
    const result = Algebra.invariantSubspace(FieldReal)(signRepresentation, generators)
    expect(result.dimension).toBe(0)
    expect(result.basis).toHaveLength(0)
  })

  it('short-circuits to the full space for a trivial action with finite group data', () => {
    const S3 = symmetricGroupS3()
    const constantHom = {
      name: 'trivial',
      dom: S3.name,
      cod: S3.name,
      map: () => S3.e,
    }
    const result = Algebra.fixedVectors(FieldReal)(trivialRepresentation, generators, {
      finiteGroup: {
        domain: S3,
        codomain: S3,
        hom: constantHom,
        kernelName: 'Ker(trivial)',
      },
      includeKernelWitness: true,
    })
    expect(result.dimension).toBe(1)
    expect(result.shortCircuit).toBe('trivial-action')
    expect(result.kernelElements).toBeDefined()
    expect(result.kernelElements?.length).toBe(S3.elems.length)
    expect(result.kernelWitness).not.toBeNull()
  })
})
