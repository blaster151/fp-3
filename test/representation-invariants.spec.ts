import { describe, it, expect } from 'vitest'
import {
  FieldReal,
  matMul,
  matVec,
  type Representation,
  intertwinerSpace,
  invariantSubspace,
} from '../allTS'

type SwapGen = 'swap'

const F = FieldReal
const multiply = matMul(F)
const applyMatrix = matVec(F)

const swapMatrix: number[][] = [
  [F.zero, F.one],
  [F.one, F.zero],
]

const toMutableMatrix = (matrix: ReadonlyArray<ReadonlyArray<number>>): number[][] =>
  matrix.map((row) => [...row])

const permutationRep: Representation<SwapGen, number> = {
  F,
  dimV: 2,
  mat: (g) =>
    g === 'swap'
      ? [
          [F.zero, F.one],
          [F.one, F.zero],
        ]
      : [
          [F.one, F.zero],
          [F.zero, F.one],
        ],
}

const signRep: Representation<SwapGen, number> = {
  F,
  dimV: 1,
  mat: (g) => (g === 'swap' ? [[F.neg(F.one)]] : [[F.one]]),
}

describe('intertwinerSpace', () => {
  it('finds commuting matrices for the permutation representation', () => {
    const result = intertwinerSpace<SwapGen, number>(F)(permutationRep, permutationRep, ['swap'])

    expect(result.dim).toBe(2)
    expect(result.basis.length).toBe(2)

    for (const M of result.basis) {
      expect(M.length).toBe(2)
      expect(M[0]?.length).toBe(2)

      const mutableM = toMutableMatrix(M)
      const left = multiply(swapMatrix, mutableM)
      const right = multiply(mutableM, swapMatrix)
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          expect(F.eq?.(left[i]![j]!, right[i]![j]!) ?? left[i]![j]! === right[i]![j]!).toBe(true)
        }
      }
    }
  })

  it('detects absence of intertwiners into the sign representation', () => {
    const result = intertwinerSpace<SwapGen, number>(F)(permutationRep, signRep, ['swap'])

    expect(result.dim).toBe(0)
    expect(result.basis.length).toBe(0)
  })
})

describe('invariantSubspace', () => {
  it('returns the swap-fixed line', () => {
    const invariants = invariantSubspace<SwapGen, number>(F)(permutationRep, ['swap'])

    expect(invariants.dim).toBe(1)
    expect(invariants.basis.length).toBe(1)

    const [v] = invariants.basis
    if (!v) throw new Error('Expected invariant basis vector')
    expect(v.length).toBe(2)

    const image = applyMatrix(swapMatrix, v)
    for (let i = 0; i < 2; i++) {
      expect(F.eq?.(image[i]!, v[i]!) ?? image[i] === v[i]).toBe(true)
    }
  })

  it('falls back to the full space when no generators are provided', () => {
    const invariants = invariantSubspace<SwapGen, number>(F)(permutationRep, [])

    expect(invariants.dim).toBe(2)
    expect(invariants.basis.length).toBe(2)

    const eq = F.eq ?? ((x: number, y: number) => Object.is(x, y))
    expect(eq(invariants.basis[0]?.[0] ?? F.zero, F.one)).toBe(true)
    expect(eq(invariants.basis[1]?.[1] ?? F.zero, F.one)).toBe(true)
  })

  it('identifies only the zero vector for the sign representation', () => {
    const invariants = invariantSubspace<SwapGen, number>(F)(signRep, ['swap'])

    expect(invariants.dim).toBe(0)
    expect(invariants.basis.length).toBe(0)
  })
})
