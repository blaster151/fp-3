import { describe, expect, it } from "vitest"

import {
  buildHopfAlgebraStructure,
  buildHopfFiniteDual,
  deriveBialgebraTensorWitnessesFromSymmetricMonoidal,
  type HopfAlgebraStructure,
  type MonoidalIsomorphismWitness,
  type SymmetricMonoidalWitnesses,
} from "../operations/coalgebra/coalgebra-interfaces"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import type { Category } from "../stdlib/category"
import type { CategoryLimits } from "../stdlib/category-limits"

type Dim = number

type Matrix = ReadonlyArray<ReadonlyArray<number>>

interface LinearMap {
  readonly dom: Dim
  readonly cod: Dim
  readonly matrix: Matrix
}

const zeroMatrix = (rows: number, cols: number): number[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))

const setMatrixEntry = (matrix: number[][], rowIndex: number, colIndex: number, value: number) => {
  const row = matrix[rowIndex]
  if (!row) {
    throw new Error(`Matrix row ${rowIndex} is undefined`)
  }
  row[colIndex] = value
}

const incrementMatrixEntry = (matrix: number[][], rowIndex: number, colIndex: number, delta: number) => {
  const row = matrix[rowIndex]
  if (!row) {
    throw new Error(`Matrix row ${rowIndex} is undefined`)
  }
  row[colIndex] = (row[colIndex] ?? 0) + delta
}

const identityMatrix = (size: number): number[][] =>
  zeroMatrix(size, size).map((row, i) => row.map((value, j) => (i === j ? 1 : value)))

const mkLinearMap = (dom: Dim, cod: Dim, matrix: Matrix): LinearMap => {
  if (matrix.length !== cod) {
    throw new Error(`Expected ${cod} rows, received ${matrix.length}`)
  }
  if (matrix.some((row) => row.length !== dom)) {
    throw new Error(`Expected ${dom} columns in every row`)
  }
  return { dom, cod, matrix }
}

const multiplyMatrices = (left: LinearMap, right: LinearMap): number[][] => {
  if (right.cod !== left.dom) {
    throw new Error(
      `Cannot compose ${left.cod}×${left.dom} with ${right.cod}×${right.dom}`,
    )
  }
  const result = zeroMatrix(left.cod, right.dom)
  for (let i = 0; i < left.cod; i += 1) {
    for (let k = 0; k < left.dom; k += 1) {
      const leftValue = left.matrix[i]?.[k] ?? 0
      if (leftValue === 0) {
        continue
      }
      for (let j = 0; j < right.dom; j += 1) {
        const rightValue = right.matrix[k]?.[j] ?? 0
        if (rightValue === 0) {
          continue
        }
        incrementMatrixEntry(result, i, j, leftValue * rightValue)
      }
    }
  }
  return result
}

const equalLinearMaps = (left: LinearMap, right: LinearMap, epsilon = 1e-9): boolean => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    return false
  }
  for (let i = 0; i < left.cod; i += 1) {
    for (let j = 0; j < left.dom; j += 1) {
      const leftValue = left.matrix[i]?.[j] ?? 0
      const rightValue = right.matrix[i]?.[j] ?? 0
      if (Math.abs(leftValue - rightValue) > epsilon) {
        return false
      }
    }
  }
  return true
}

const kroneckerProduct = (left: LinearMap, right: LinearMap): number[][] => {
  const result = zeroMatrix(left.cod * right.cod, left.dom * right.dom)
  for (let i = 0; i < left.cod; i += 1) {
    for (let j = 0; j < left.dom; j += 1) {
      const leftValue = left.matrix[i]?.[j] ?? 0
      if (leftValue === 0) {
        continue
      }
      for (let p = 0; p < right.cod; p += 1) {
        for (let q = 0; q < right.dom; q += 1) {
          const rightValue = right.matrix[p]?.[q] ?? 0
          if (rightValue === 0) {
            continue
          }
          incrementMatrixEntry(result, i * right.cod + p, j * right.dom + q, leftValue * rightValue)
        }
      }
    }
  }
  return result
}

const transposeMatrix = (matrix: Matrix): number[][] => {
  const rows = matrix.length
  const cols = rows === 0 ? 0 : matrix[0]!.length
  const transposed = zeroMatrix(cols, rows)
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const value = matrix[i]?.[j] ?? 0
      setMatrixEntry(transposed, j, i, value)
    }
  }
  return transposed
}

const transposeLinearMap = (map: LinearMap): LinearMap =>
  mkLinearMap(map.cod, map.dom, transposeMatrix(map.matrix))

const permutationWitness = (
  size: number,
  forwardIndex: (domainIndex: number) => number,
): MonoidalIsomorphismWitness<LinearMap> => {
  const forward = zeroMatrix(size, size)
  const backward = zeroMatrix(size, size)
  for (let index = 0; index < size; index += 1) {
    const image = forwardIndex(index)
    setMatrixEntry(forward, image, index, 1)
    setMatrixEntry(backward, index, image, 1)
  }
  return {
    forward: mkLinearMap(size, size, forward),
    backward: mkLinearMap(size, size, backward),
  }
}

const associatorWitness = (left: Dim, middle: Dim, right: Dim): MonoidalIsomorphismWitness<LinearMap> => {
  const size = left * middle * right
  const forwardIndex = (domainIndex: number) => {
    const k = domainIndex % right
    const temp = (domainIndex - k) / right
    const j = temp % middle
    const i = (temp - j) / middle
    return i * (middle * right) + j * right + k
  }
  return permutationWitness(size, forwardIndex)
}

const braidingWitness = (left: Dim, right: Dim): MonoidalIsomorphismWitness<LinearMap> => {
  const size = left * right
  const forwardIndex = (domainIndex: number) => {
    const j = domainIndex % right
    const i = (domainIndex - j) / right
    return j * left + i
  }
  return permutationWitness(size, forwardIndex)
}

const vectorSpaceCategory: Category<Dim, LinearMap> & ArrowFamilies.HasDomCod<Dim, LinearMap> = {
  id: (object) => mkLinearMap(object, object, identityMatrix(object)),
  compose: (g, f) => {
    if (f.cod !== g.dom) {
      throw new Error(
        `Cannot compose maps of type ${f.cod}→${f.dom} and ${g.cod}→${g.dom}: codomain/domain mismatch`,
      )
    }
    return mkLinearMap(f.dom, g.cod, multiplyMatrices(g, f))
  },
  dom: (morphism) => morphism.dom,
  cod: (morphism) => morphism.cod,
  equalMor: (left, right) => equalLinearMaps(left, right),
}

const tensor: CategoryLimits.TensorProductStructure<Dim, LinearMap> = {
  onObjects: (left, right) => left * right,
  onMorphisms: (left, right) =>
    mkLinearMap(left.dom * right.dom, left.cod * right.cod, kroneckerProduct(left, right)),
}

const symmetricWitnesses: SymmetricMonoidalWitnesses<Dim, LinearMap> = {
  associator: (left, middle, right) => associatorWitness(left, middle, right),
  braiding: (left, right) => braidingWitness(left, right),
}

const hopfTensorWitnesses = (object: Dim) =>
  deriveBialgebraTensorWitnessesFromSymmetricMonoidal(
    vectorSpaceCategory,
    tensor,
    symmetricWitnesses,
    object,
  )

const buildQc3Hopf = (): HopfAlgebraStructure<Dim, LinearMap> => {
  const hopfDim = 3
  const unitDim = 1

  const multiplyMatrix = zeroMatrix(hopfDim, hopfDim * hopfDim)
  for (let i = 0; i < hopfDim; i += 1) {
    for (let j = 0; j < hopfDim; j += 1) {
      const product = (i + j) % hopfDim
      setMatrixEntry(multiplyMatrix, product, i * hopfDim + j, 1)
    }
  }

  const unitMatrix = zeroMatrix(hopfDim, unitDim)
  setMatrixEntry(unitMatrix, 0, 0, 1)

  const copyMatrix = zeroMatrix(hopfDim * hopfDim, hopfDim)
  for (let i = 0; i < hopfDim; i += 1) {
    setMatrixEntry(copyMatrix, i * hopfDim + i, i, 1)
  }

  const discardMatrix = zeroMatrix(unitDim, hopfDim)
  setMatrixEntry(discardMatrix, 0, 0, 1)

  const antipodeMatrix = zeroMatrix(hopfDim, hopfDim)
  setMatrixEntry(antipodeMatrix, 0, 0, 1)
  setMatrixEntry(antipodeMatrix, 1, 2, 1)
  setMatrixEntry(antipodeMatrix, 2, 1, 1)

  return buildHopfAlgebraStructure({
    category: vectorSpaceCategory,
    tensor,
    algebra: {
      object: hopfDim,
      multiply: mkLinearMap(hopfDim * hopfDim, hopfDim, multiplyMatrix),
      unit: mkLinearMap(unitDim, hopfDim, unitMatrix),
    },
    comonoid: {
      object: hopfDim,
      copy: mkLinearMap(hopfDim, hopfDim * hopfDim, copyMatrix),
      discard: mkLinearMap(hopfDim, unitDim, discardMatrix),
    },
    tensorWitnesses: hopfTensorWitnesses(hopfDim),
    antipode: mkLinearMap(hopfDim, hopfDim, antipodeMatrix),
  })
}

const identityWitnessForDimension = (dimension: Dim): MonoidalIsomorphismWitness<LinearMap> => {
  const matrix = identityMatrix(dimension)
  const map = mkLinearMap(dimension, dimension, matrix)
  return { forward: map, backward: map }
}

describe("Finite dual Hopf formation", () => {
  it("builds the dual Hopf structure with canonical pairings", () => {
    const hopf = buildQc3Hopf()
    expect(hopf.compatibility?.overall).toBe(true)

    const hopfDim = hopf.algebra.object
    const evaluationMatrix = zeroMatrix(1, hopfDim * hopfDim)
    for (let i = 0; i < hopfDim; i += 1) {
      setMatrixEntry(evaluationMatrix, 0, i * hopfDim + i, 1)
    }
    const evaluation = mkLinearMap(hopfDim * hopfDim, 1, evaluationMatrix)

    const coevaluationMatrix = zeroMatrix(hopfDim * hopfDim, 1)
    for (let i = 0; i < hopfDim; i += 1) {
      setMatrixEntry(coevaluationMatrix, i * hopfDim + i, 0, 1)
    }
    const coevaluation = mkLinearMap(1, hopfDim * hopfDim, coevaluationMatrix)

    const bidualEvaluation = mkLinearMap(
      hopfDim,
      hopfDim,
      identityMatrix(hopfDim),
    )

    const result = buildHopfFiniteDual({
      hopf,
      dualObject: hopfDim,
      dualizeMorphism: transposeLinearMap,
      dualTensorIsomorphism: (left, right) => identityWitnessForDimension(left * right),
      dualUnitIsomorphism: identityWitnessForDimension(1),
      evaluation,
      coevaluation,
      bidualEvaluation,
      symmetricMonoidalWitnesses: symmetricWitnesses,
      tensorWitnesses: hopfTensorWitnesses(hopfDim),
    })

    expect(result.dual.algebra.object).toBe(hopfDim)
    expect(result.dual.compatibility?.overall).toBe(true)

    const expectedMultiply = transposeLinearMap(hopf.comonoid.copy)
    expect(equalLinearMaps(result.dual.algebra.multiply, expectedMultiply)).toBe(true)

    const expectedUnit = transposeLinearMap(hopf.comonoid.discard)
    expect(equalLinearMaps(result.dual.algebra.unit, expectedUnit)).toBe(true)

    const expectedCopy = transposeLinearMap(hopf.algebra.multiply)
    expect(equalLinearMaps(result.dual.comonoid.copy, expectedCopy)).toBe(true)

    const expectedDiscard = transposeLinearMap(hopf.algebra.unit)
    expect(equalLinearMaps(result.dual.comonoid.discard, expectedDiscard)).toBe(true)

    const expectedAntipode = transposeLinearMap(hopf.antipode)
    expect(equalLinearMaps(result.dual.antipode, expectedAntipode)).toBe(true)

    expect(equalLinearMaps(result.witnesses.pairings.right, evaluation)).toBe(true)

    const braiding = symmetricWitnesses.braiding(hopfDim, hopfDim).forward
    const expectedLeftPairing = vectorSpaceCategory.compose(evaluation, braiding)
    expect(equalLinearMaps(result.witnesses.pairings.left, expectedLeftPairing)).toBe(true)

    expect(equalLinearMaps(result.witnesses.bidualEvaluation, bidualEvaluation)).toBe(true)
  })
})
