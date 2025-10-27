import { FinGrp, type FinGrpObj, type Hom } from "./fingroup-cat"
import {
  finGrpKernelEqualizer,
  type FinGrpKernelEqualizerWitness,
} from "./fingroup-equalizer"

export interface FiniteField {
  readonly characteristic: number
  readonly elements: readonly number[]
  readonly zero: number
  readonly one: number
  readonly add: (left: number, right: number) => number
  readonly sub: (left: number, right: number) => number
  readonly mul: (left: number, right: number) => number
  readonly neg: (value: number) => number
}

export const makePrimeField = (p: number): FiniteField => {
  if (!Number.isInteger(p) || p <= 1) {
    throw new Error(`makePrimeField: characteristic must be a prime integer ≥ 2 (received ${p}).`)
  }
  const mod = (value: number): number => {
    const remainder = value % p
    return remainder < 0 ? remainder + p : remainder
  }
  const elements = Array.from({ length: p }, (_, index) => index)
  return {
    characteristic: p,
    elements,
    zero: 0,
    one: 1,
    add: (left, right) => mod(left + right),
    sub: (left, right) => mod(left - right),
    mul: (left, right) => mod(left * right),
    neg: (value) => mod(-value),
  }
}

const enumerateVectors = (field: FiniteField, dim: number): number[][] => {
  if (dim === 0) {
    return [[]]
  }
  const indices = Array.from({ length: dim }, () => 0)
  const vectors: number[][] = []
  while (true) {
    vectors.push(indices.map((index) => field.elements[index]!))
    let position = dim - 1
    while (position >= 0) {
      indices[position]! += 1
      if (indices[position]! < field.elements.length) {
        break
      }
      indices[position] = 0
      position -= 1
    }
    if (position < 0) {
      return vectors
    }
  }
}

const ZERO_VECTOR_TOKEN = "()"

const encodeVector = (vector: readonly number[]): string =>
  vector.length === 0 ? ZERO_VECTOR_TOKEN : vector.join(",")

const decodeVector = (token: string, dim: number): number[] => {
  if (token === ZERO_VECTOR_TOKEN) {
    return Array.from({ length: dim }, () => 0)
  }
  if (token.length === 0) {
    return []
  }
  return token.split(",").map((entry) => Number(entry))
}

export interface VectorGroupContext {
  readonly group: FinGrpObj
  readonly field: FiniteField
  readonly dim: number
  readonly encode: (vector: readonly number[]) => string
  readonly decode: (token: string) => number[]
}

export const makeVectorGroupContext = (
  field: FiniteField,
  dim: number,
  name: string,
): VectorGroupContext => {
  const vectors = enumerateVectors(field, dim)
  const encode = (vector: readonly number[]): string => encodeVector(vector)
  const decode = (token: string): number[] => decodeVector(token, dim)
  const identity = encode(Array.from({ length: dim }, () => field.zero))
  const group: FinGrpObj = {
    name,
    elems: vectors.map((vector) => encode(vector)),
    e: identity,
    mul: (left, right) => {
      const leftVec = decode(left)
      const rightVec = decode(right)
      const result = leftVec.map((value, index) =>
        field.add(value, rightVec[index] ?? field.zero),
      )
      return encode(result)
    },
    inv: (value) => {
      const vector = decode(value)
      const result = vector.map((entry) => field.neg(entry))
      return encode(result)
    },
  }
  return { group, field, dim, encode, decode }
}

const matMulField = (
  field: FiniteField,
  left: ReadonlyArray<ReadonlyArray<number>>,
  right: ReadonlyArray<ReadonlyArray<number>>,
): number[][] => {
  const rows = left.length
  const inner = left[0]?.length ?? 0
  if (inner !== right.length) {
    throw new Error(
      `matMulField: dimension mismatch (${rows}×${inner})·(${right.length}×${right[0]?.length ?? 0}).`,
    )
  }
  const cols = right[0]?.length ?? 0
  const result = Array.from({ length: rows }, () => Array(cols).fill(field.zero))
  for (let i = 0; i < rows; i += 1) {
    for (let k = 0; k < inner; k += 1) {
      const leftEntry = left[i]?.[k]
      if (leftEntry === undefined) continue
      for (let j = 0; j < cols; j += 1) {
        const rightEntry = right[k]?.[j]
        if (rightEntry === undefined) continue
        result[i]![j] = field.add(
          result[i]![j]!,
          field.mul(leftEntry, rightEntry),
        )
      }
    }
  }
  return result
}

const matSubField = (
  field: FiniteField,
  left: ReadonlyArray<ReadonlyArray<number>>,
  right: ReadonlyArray<ReadonlyArray<number>>,
): number[][] => {
  const rows = left.length
  const cols = left[0]?.length ?? 0
  const result = Array.from({ length: rows }, () => Array(cols).fill(field.zero))
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const leftEntry = left[i]?.[j] ?? field.zero
      const rightEntry = right[i]?.[j] ?? field.zero
      result[i]![j] = field.sub(leftEntry, rightEntry)
    }
  }
  return result
}

const applyMatrixField = (
  field: FiniteField,
  matrix: ReadonlyArray<ReadonlyArray<number>>,
  vector: ReadonlyArray<number>,
): number[] => {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  if (vector.length !== cols) {
    throw new Error(
      `applyMatrixField: expected vector length ${cols}, received ${vector.length}.`,
    )
  }
  const result = Array.from({ length: rows }, () => field.zero)
  for (let i = 0; i < rows; i += 1) {
    let sum = field.zero
    for (let j = 0; j < cols; j += 1) {
      const entry = matrix[i]?.[j]
      const value = vector[j]
      if (entry === undefined || value === undefined) continue
      sum = field.add(sum, field.mul(entry, value))
    }
    result[i] = sum
  }
  return result
}

const makeLinearHomFromMatrix = (
  name: string,
  matrix: ReadonlyArray<ReadonlyArray<number>>,
  domain: VectorGroupContext,
  codomain: VectorGroupContext,
): Hom => ({
  name,
  dom: domain.group.name,
  cod: codomain.group.name,
  map: (token) => {
    const vector = domain.decode(token)
    const image = applyMatrixField(domain.field, matrix, vector)
    return codomain.encode(image)
  },
})

export interface FiniteGroupRepresentation {
  readonly group: FinGrpObj
  readonly field: FiniteField
  readonly dim: number
  readonly matrix: (element: string) => ReadonlyArray<ReadonlyArray<number>>
  readonly label?: string
}

const coordinateInclusionMatrix = (
  field: FiniteField,
  ambientDim: number,
  indices: ReadonlyArray<number>,
): number[][] => {
  const cols = indices.length
  const matrix = Array.from({ length: ambientDim }, () => Array(cols).fill(field.zero))
  indices.forEach((rowIndex, colIndex) => {
    if (rowIndex < 0 || rowIndex >= ambientDim) {
      throw new Error(`coordinateInclusionMatrix: index ${rowIndex} out of range 0…${ambientDim - 1}.`)
    }
    matrix[rowIndex]![colIndex] = field.one
  })
  return matrix
}

const coordinateProjectionMatrix = (
  field: FiniteField,
  ambientDim: number,
  indices: ReadonlyArray<number>,
): number[][] => {
  const rows = indices.length
  const matrix = Array.from({ length: rows }, () => Array(ambientDim).fill(field.zero))
  indices.forEach((columnIndex, rowIndex) => {
    if (columnIndex < 0 || columnIndex >= ambientDim) {
      throw new Error(`coordinateProjectionMatrix: index ${columnIndex} out of range 0…${ambientDim - 1}.`)
    }
    matrix[rowIndex]![columnIndex] = field.one
  })
  return matrix
}

const validateSquareMatrix = (
  matrix: ReadonlyArray<ReadonlyArray<number>>,
  expectedDim: number,
  context: string,
): void => {
  if (matrix.length !== expectedDim) {
    throw new Error(`${context}: expected ${expectedDim} rows, received ${matrix.length}.`)
  }
  matrix.forEach((row, index) => {
    if (row.length !== expectedDim) {
      throw new Error(`${context}: row ${index} expected ${expectedDim} columns, received ${row.length}.`)
    }
  })
}

export interface DifferenceWitness {
  readonly element: string
  readonly matrix: ReadonlyArray<ReadonlyArray<number>>
  readonly hom: Hom
  readonly kernel: FinGrpKernelEqualizerWitness
}

export interface SubrepresentationWitness {
  readonly representation: FiniteGroupRepresentation
  readonly ambient: VectorGroupContext
  readonly subspace: {
    readonly indices: ReadonlyArray<number>
    readonly context: VectorGroupContext
    readonly inclusionMatrix: ReadonlyArray<ReadonlyArray<number>>
    readonly inclusionHom: Hom
    readonly projectionMatrix: ReadonlyArray<ReadonlyArray<number>>
    readonly projectionHom: Hom
  }
  readonly complement: {
    readonly indices: ReadonlyArray<number>
    readonly context: VectorGroupContext
    readonly inclusionMatrix: ReadonlyArray<ReadonlyArray<number>>
    readonly inclusionHom: Hom
    readonly projectionMatrix: ReadonlyArray<ReadonlyArray<number>>
    readonly projectionHom: Hom
  }
  readonly restrictedMatrices: Record<string, ReadonlyArray<ReadonlyArray<number>>>
  readonly quotientMatrices: Record<string, ReadonlyArray<ReadonlyArray<number>>>
  readonly difference: ReadonlyArray<DifferenceWitness>
}

const enumerateCoordinateSubsets = (
  dim: number,
  includeTrivial: boolean,
): ReadonlyArray<ReadonlyArray<number>> => {
  if (dim === 0) {
    return includeTrivial ? [[]] : []
  }
  const subsets: number[][] = []
  const fullMask = (1 << dim) - 1
  for (let mask = 0; mask <= fullMask; mask += 1) {
    const indices: number[] = []
    for (let bit = 0; bit < dim; bit += 1) {
      if ((mask & (1 << bit)) !== 0) {
        indices.push(bit)
      }
    }
    if (!includeTrivial) {
      if (indices.length === 0 || indices.length === dim) {
        continue
      }
    }
    subsets.push(indices)
  }
  return subsets
}

export interface SubrepresentationSearchOptions {
  readonly includeTrivial?: boolean
}

export const enumerateCoordinateSubrepresentationWitnesses = (
  representation: FiniteGroupRepresentation,
  options: SubrepresentationSearchOptions = {},
): ReadonlyArray<SubrepresentationWitness> => {
  const { group, field, dim } = representation
  const includeTrivial = options.includeTrivial ?? false
  if (dim <= 0) {
    throw new Error(`enumerateCoordinateSubrepresentationWitnesses: representation dimension must be positive (received ${dim}).`)
  }
  const ambient = makeVectorGroupContext(
    field,
    dim,
    representation.label ? `${representation.label}_ambient` : `F_${field.characteristic}^${dim}`,
  )
  const subsets = enumerateCoordinateSubsets(dim, includeTrivial)
  const witnesses: SubrepresentationWitness[] = []

  group.elems.forEach((element) => {
    const matrix = representation.matrix(element)
    validateSquareMatrix(matrix, dim, `ρ(${element})`)
  })

  for (const indices of subsets) {
    const subDim = indices.length
    const complementIndices = Array.from({ length: dim }, (_, index) => index).filter(
      (index) => !indices.includes(index),
    )
    const subspace = makeVectorGroupContext(
      field,
      subDim,
      `${ambient.group.name}[${indices.join(",")}]`,
    )
    const complement = makeVectorGroupContext(
      field,
      complementIndices.length,
      `${ambient.group.name}{${complementIndices.join(",")}}`,
    )

    const inclusionMatrix = coordinateInclusionMatrix(field, dim, indices)
    const projectionMatrix = coordinateProjectionMatrix(field, dim, indices)
    const complementInclusionMatrix = coordinateInclusionMatrix(field, dim, complementIndices)
    const complementProjectionMatrix = coordinateProjectionMatrix(field, dim, complementIndices)

    const inclusionHom = makeLinearHomFromMatrix(
      `ι_${subspace.group.name}→${ambient.group.name}`,
      inclusionMatrix,
      subspace,
      ambient,
    )
    const projectionHom = makeLinearHomFromMatrix(
      `π_${ambient.group.name}→${subspace.group.name}`,
      projectionMatrix,
      ambient,
      subspace,
    )
    const complementInclusionHom = makeLinearHomFromMatrix(
      `ι_${complement.group.name}→${ambient.group.name}`,
      complementInclusionMatrix,
      complement,
      ambient,
    )
    const complementProjectionHom = makeLinearHomFromMatrix(
      `π_${ambient.group.name}→${complement.group.name}`,
      complementProjectionMatrix,
      ambient,
      complement,
    )

    const restrictedMatrices: Record<string, ReadonlyArray<ReadonlyArray<number>>> = {}
    const quotientMatrices: Record<string, ReadonlyArray<ReadonlyArray<number>>> = {}
    const differenceWitnesses: DifferenceWitness[] = []

    let stable = true
    for (const element of group.elems) {
      const action = representation.matrix(element)
      const actionOnSubspace = matMulField(field, action, inclusionMatrix)
      const restricted = matMulField(field, projectionMatrix, actionOnSubspace)
      restrictedMatrices[element] = restricted

      const differenceMatrix = matSubField(
        field,
        actionOnSubspace,
        matMulField(field, inclusionMatrix, restricted),
      )
      const differenceHom = makeLinearHomFromMatrix(
        `Δ_${element}_${subspace.group.name}`,
        differenceMatrix,
        subspace,
        ambient,
      )
      if (!FinGrp.isHom(subspace.group, ambient.group, differenceHom)) {
        throw new Error(
          `enumerateCoordinateSubrepresentationWitnesses: difference map Δ_${element} must be a FinGrp homomorphism.`,
        )
      }
      const kernel = finGrpKernelEqualizer(subspace.group, ambient.group, differenceHom)
      differenceWitnesses.push({ element, matrix: differenceMatrix, hom: differenceHom, kernel })
      if (kernel.kernel.elems.length !== subspace.group.elems.length) {
        stable = false
      }

      const quotientAction = matMulField(field, action, complementInclusionMatrix)
      const quotient = matMulField(field, complementProjectionMatrix, quotientAction)
      quotientMatrices[element] = quotient
    }

    if (stable) {
      witnesses.push({
        representation,
        ambient,
        subspace: {
          indices,
          context: subspace,
          inclusionMatrix,
          inclusionHom,
          projectionMatrix,
          projectionHom,
        },
        complement: {
          indices: complementIndices,
          context: complement,
          inclusionMatrix: complementInclusionMatrix,
          inclusionHom: complementInclusionHom,
          projectionMatrix: complementProjectionMatrix,
          projectionHom: complementProjectionHom,
        },
        restrictedMatrices,
        quotientMatrices,
        difference: differenceWitnesses,
      })
    }
  }

  return witnesses
}
