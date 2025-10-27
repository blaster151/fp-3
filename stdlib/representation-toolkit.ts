import type { Field } from "../allTS"
import type { Representation } from "./vect-view"
import type { FinGrpObj } from "../models/fingroup-cat"
import { nullspace, solveLinear } from "../allTS"

export interface PermutationAction {
  readonly basis: ReadonlyArray<string>
  readonly permutation: (element: string) => ReadonlyArray<number>
}

export interface PermutationRepresentationPackage<R> {
  readonly label: string
  readonly dimension: number
  readonly basis: ReadonlyArray<string>
  readonly representation: Representation<string, R>
  readonly matrices: Readonly<Record<string, ReadonlyArray<ReadonlyArray<R>>>>
  readonly group: FinGrpObj
  readonly elements: ReadonlyArray<string>
}

const requireEq = <R>(F: Field<R>) =>
  F.eq ?? ((a: R, b: R) => Object.is(a, b))

const ensurePermutation = (
  perm: ReadonlyArray<number>,
  dimension: number,
  context: string,
): void => {
  if (perm.length !== dimension) {
    throw new Error(`${context}: permutation must have length ${dimension}`)
  }
  const seen = new Set<number>()
  for (const value of perm) {
    if (!Number.isInteger(value) || value < 0 || value >= dimension) {
      throw new Error(
        `${context}: permutation entry ${value} is outside [0, ${dimension})`,
      )
    }
    if (seen.has(value)) {
      throw new Error(`${context}: permutation repeats index ${value}`)
    }
    seen.add(value)
  }
}

const composePermutation = (
  left: ReadonlyArray<number>,
  right: ReadonlyArray<number>,
): number[] => right.map(index => left[index]!)

const identityPermutation = (dimension: number): number[] =>
  Array.from({ length: dimension }, (_, index) => index)

const permutationMatrix = <R>(
  F: Field<R>,
  perm: ReadonlyArray<number>,
  dimension: number,
): R[][] => {
  const matrix: R[][] = Array.from({ length: dimension }, () =>
    Array.from({ length: dimension }, () => F.zero),
  )
  for (let column = 0; column < dimension; column++) {
    const row = perm[column]!
    matrix[row]![column] = F.one
  }
  return matrix
}

export const packagePermutationRepresentation = <R>(input: {
  readonly F: Field<R>
  readonly group: FinGrpObj
  readonly action: PermutationAction
  readonly label?: string
}): PermutationRepresentationPackage<R> => {
  const { F, group, action, label } = input
  const elements = group.elems
  if (elements.length === 0) {
    throw new Error("packagePermutationRepresentation: group must have elements")
  }
  const dimension = action.basis.length
  if (dimension === 0) {
    throw new Error("packagePermutationRepresentation: basis must be non-empty")
  }
  const permutations: Record<string, ReadonlyArray<number>> = {}
  const context = label ?? `ρ:${group.name}`
  for (const element of elements) {
    const perm = action.permutation(element)
    ensurePermutation(perm, dimension, `${context}:${element}`)
    permutations[element] = perm.slice()
  }
  const identity = permutations[group.e]
  if (!identity) {
    throw new Error(
      `${context}: action must provide a permutation for the identity ${group.e}`,
    )
  }
  const targetIdentity = identityPermutation(dimension)
  identity.forEach((value, index) => {
    if (value !== targetIdentity[index]) {
      throw new Error(
        `${context}: identity element must act as the identity permutation`,
      )
    }
  })
  for (const g of elements) {
    for (const h of elements) {
      const gh = group.mul(g, h)
      const left = permutations[g]
      const right = permutations[h]
      const product = permutations[gh]
      if (!left || !right || !product) {
        throw new Error(
          `${context}: missing permutations for ${g}, ${h}, or ${gh}`,
        )
      }
      const composed = composePermutation(left, right)
      for (let i = 0; i < dimension; i++) {
        if (composed[i] !== product[i]) {
          throw new Error(
            `${context}: action must satisfy ρ(${g})ρ(${h}) = ρ(${gh})`,
          )
        }
      }
    }
  }
  const matrices: Record<string, R[][]> = {}
  for (const element of elements) {
    matrices[element] = permutationMatrix(F, permutations[element]!, dimension)
  }
  const representation: Representation<string, R> = {
    F,
    dimV: dimension,
    mat: (element: string) => {
      const matrix = matrices[element]
      if (!matrix) {
        throw new Error(
          `${context}: unknown group element ${element} in representation`,
        )
      }
      return matrix
    },
  }
  return {
    label: label ?? `${group.name}-perm`,
    dimension,
    basis: action.basis.slice(),
    representation,
    matrices,
    group,
    elements,
  }
}

const flattenIndex = (rows: number, column: number, row: number): number =>
  column * rows + row

const subtract = <R>(F: Field<R>, a: R, b: R): R =>
  F.sub ? F.sub(a, b) : F.add(a, F.neg(b))

export interface IntertwinerResult<R> {
  readonly basis: ReadonlyArray<ReadonlyArray<ReadonlyArray<R>>>
  readonly dimension: number
  readonly system: ReadonlyArray<ReadonlyArray<R>>
  readonly variables: number
}

export const enumerateIntertwiners = <R>(F: Field<R>) => (
  left: Representation<string, R>,
  right: Representation<string, R>,
  elements: ReadonlyArray<string>,
): IntertwinerResult<R> => {
  const leftDim = left.dimV
  const rightDim = right.dimV
  const totalVars = leftDim * rightDim
  const eq = requireEq(F)
  const rows: R[][] = []
  for (const element of elements) {
    const leftMat = left.mat(element)
    const rightMat = right.mat(element)
    for (let i = 0; i < rightDim; i++) {
      for (let j = 0; j < leftDim; j++) {
        const row = Array.from({ length: totalVars }, () => F.zero)
        for (let k = 0; k < rightDim; k++) {
          const coeff = rightMat[i]?.[k] ?? F.zero
          if (!eq(coeff, F.zero)) {
            const index = flattenIndex(rightDim, j, k)
            row[index] = F.add(row[index]!, coeff)
          }
        }
        for (let k = 0; k < leftDim; k++) {
          const coeff = leftMat[k]?.[j] ?? F.zero
          if (!eq(coeff, F.zero)) {
            const index = flattenIndex(rightDim, k, i)
            row[index] = subtract(F, row[index]!, coeff)
          }
        }
        rows.push(row)
      }
    }
  }
  const kernel = nullspace(F)(rows)
  const basis = kernel.map(vector => {
    const matrix: R[][] = Array.from({ length: rightDim }, () =>
      Array.from({ length: leftDim }, () => F.zero),
    )
    for (let column = 0; column < leftDim; column++) {
      for (let row = 0; row < rightDim; row++) {
        const index = flattenIndex(rightDim, column, row)
        matrix[row]![column] = vector[index]!
      }
    }
    return matrix
  })
  return {
    basis,
    dimension: basis.length,
    system: rows,
    variables: totalVars,
  }
}

export interface RepresentationInvariantResult<R> {
  readonly basis: ReadonlyArray<ReadonlyArray<R>>
  readonly dimension: number
  readonly system: ReadonlyArray<ReadonlyArray<R>>
}

export const representationInvariants = <R>(F: Field<R>) => (
  representation: Representation<string, R>,
  elements: ReadonlyArray<string>,
): RepresentationInvariantResult<R> => {
  const dim = representation.dimV
  const rows: R[][] = []
  for (const element of elements) {
    const matrix = representation.mat(element)
    for (let i = 0; i < dim; i++) {
      const row: R[] = []
      for (let j = 0; j < dim; j++) {
        const diff = subtract(
          F,
          matrix[i]?.[j] ?? F.zero,
          i === j ? F.one : F.zero,
        )
        row.push(diff)
      }
      rows.push(row)
    }
  }
  const kernel = nullspace(F)(rows)
  return {
    basis: kernel,
    dimension: kernel.length,
    system: rows,
  }
}

export interface SubrepresentationFailure<R> {
  readonly element: string
  readonly vectorIndex: number
  readonly image: ReadonlyArray<R>
  readonly residual: ReadonlyArray<R>
}

export interface SubrepresentationAnalysis<R> {
  readonly invariant: boolean
  readonly failures: ReadonlyArray<SubrepresentationFailure<R>>
  readonly transitionMatrices: Readonly<Record<string, ReadonlyArray<ReadonlyArray<R>>>>
  readonly basisSize: number
}

const matVec = <R>(F: Field<R>, matrix: ReadonlyArray<ReadonlyArray<R>>, vector: ReadonlyArray<R>): R[] => {
  const rows = matrix.length
  const cols = vector.length
  const eq = requireEq(F)
  const result: R[] = Array.from({ length: rows }, () => F.zero)
  for (let i = 0; i < rows; i++) {
    let acc = F.zero
    for (let j = 0; j < cols; j++) {
      const coeff = matrix[i]?.[j] ?? F.zero
      if (!eq(coeff, F.zero)) {
        acc = F.add(acc, F.mul(coeff, vector[j]!))
      }
    }
    result[i] = acc
  }
  return result
}

const matMul = <R>(
  F: Field<R>,
  left: ReadonlyArray<ReadonlyArray<R>>,
  right: ReadonlyArray<ReadonlyArray<R>>,
): R[][] => {
  const rows = left.length
  const cols = right[0]?.length ?? 0
  const inner = right.length
  const eq = requireEq(F)
  const result: R[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => F.zero),
  )
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const coeff = left[i]?.[k] ?? F.zero
      if (eq(coeff, F.zero)) continue
      for (let j = 0; j < cols; j++) {
        const rightEntry = right[k]?.[j] ?? F.zero
        if (!eq(rightEntry, F.zero)) {
          result[i]![j] = F.add(result[i]![j]!, F.mul(coeff, rightEntry))
        }
      }
    }
  }
  return result
}

const isZeroVector = <R>(F: Field<R>, vector: ReadonlyArray<R>): boolean => {
  const eq = requireEq(F)
  return vector.every(entry => eq(entry, F.zero))
}

export const analyzeSubrepresentation = <R>(F: Field<R>) => (
  representation: Representation<string, R>,
  basis: ReadonlyArray<ReadonlyArray<R>>,
  elements: ReadonlyArray<string>,
): SubrepresentationAnalysis<R> => {
  const dim = representation.dimV
  const basisSize = basis.length
  for (const vector of basis) {
    if (vector.length !== dim) {
      throw new Error(
        "analyzeSubrepresentation: basis vector dimension mismatch",
      )
    }
  }
  const transitions: Record<string, R[][]> = {}
  const failures: SubrepresentationFailure<R>[] = []
  if (basisSize === 0) {
    for (const element of elements) {
      transitions[element] = []
    }
    return { invariant: true, failures, transitionMatrices: transitions, basisSize }
  }
  const basisMatrix: R[][] = Array.from({ length: dim }, (_, row) =>
    basis.map(vector => vector[row]!),
  )
  for (const element of elements) {
    const action = representation.mat(element)
    const images = matMul(F, action, basisMatrix)
    const transition: R[][] = Array.from({ length: basisSize }, () =>
      Array.from({ length: basisSize }, () => F.zero),
    )
    for (let col = 0; col < basisSize; col++) {
      const target = images.map(row => row[col]!)
      const coeffs = solveLinear(F)(basisMatrix, target)
      const reconstructed = matVec(F, basisMatrix, coeffs)
      const residual = reconstructed.map((value, index) =>
        subtract(F, value, target[index]!),
      )
      if (!isZeroVector(F, residual)) {
        failures.push({ element, vectorIndex: col, image: target, residual })
      }
      for (let row = 0; row < basisSize; row++) {
        transition[row]![col] = coeffs[row]!
      }
    }
    transitions[element] = transition
  }
  return {
    invariant: failures.length === 0,
    failures,
    transitionMatrices: transitions,
    basisSize,
  }
}

export type {
  PermutationAction as RepresentationPermutationAction,
  PermutationRepresentationPackage,
  IntertwinerResult,
  RepresentationInvariantResult,
  SubrepresentationFailure,
  SubrepresentationAnalysis,
}
