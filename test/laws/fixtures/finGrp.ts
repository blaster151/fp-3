import type { FinGrpObj } from '../../../models/fingroup-cat'

type Permutation = readonly [number, number, number]

type PermutationTable = Record<string, Permutation>

type PermutationNameByTuple = Map<string, string>

const tupleKey = (tuple: Permutation): string => tuple.join(',')

const makePermutationLookup = (
  permutations: PermutationTable,
): { readonly nameByTuple: PermutationNameByTuple } => ({
  nameByTuple: new Map<string, string>(
    Object.entries(permutations).map(([name, tuple]) => [tupleKey(tuple), name]),
  ),
})

export const cyclicGroup = (order: number, name: string): FinGrpObj => {
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

export const symmetricGroupS3 = (): FinGrpObj => {
  const permutations: PermutationTable = {
    e: [1, 2, 3],
    '(12)': [2, 1, 3],
    '(13)': [3, 2, 1],
    '(23)': [1, 3, 2],
    '(123)': [2, 3, 1],
    '(132)': [3, 1, 2],
  }

  const { nameByTuple } = makePermutationLookup(permutations)

  const compose = (left: string, right: string): string => {
    const leftTuple = permutations[left]
    const rightTuple = permutations[right]
    if (!leftTuple || !rightTuple) {
      throw new Error('symmetricGroupS3: expected known permutation names')
    }
    const composeCoordinate = (index: 0 | 1 | 2): number => {
      const position = rightTuple[index] - 1
      const value = leftTuple[position]
      if (value === undefined) {
        throw new Error('symmetricGroupS3: composition left the S₃ carrier')
      }
      return value
    }
    const result: Permutation = [
      composeCoordinate(0),
      composeCoordinate(1),
      composeCoordinate(2),
    ]
    const name = nameByTuple.get(tupleKey(result))
    if (!name) {
      throw new Error('symmetricGroupS3: composition left the S₃ carrier')
    }
    return name
  }

  const inverse = (name: string): string => {
    for (const candidate of Object.keys(permutations)) {
      if (compose(name, candidate) === 'e' && compose(candidate, name) === 'e') {
        return candidate
      }
    }
    throw new Error('symmetricGroupS3: expected every permutation to have an inverse')
  }

  const elems = Object.keys(permutations)

  return {
    name: 'S₃',
    elems,
    e: 'e',
    mul: compose,
    inv: inverse,
  }
}
