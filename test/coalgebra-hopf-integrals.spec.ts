import { describe, expect, it } from "vitest"

import {
  analyzeHopfCointegral,
  analyzeHopfIntegral,
  analyzeHopfIntegralCointegralPair,
  buildHopfAlgebraStructure,
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
  zeroMatrix(size, size).map((row, rowIndex) =>
    row.map((value, colIndex) => (rowIndex === colIndex ? 1 : value)),
  )

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

const buildUnitors = (
  hopf: HopfAlgebraStructure<Dim, LinearMap>,
): {
  readonly left: MonoidalIsomorphismWitness<LinearMap>
  readonly right: MonoidalIsomorphismWitness<LinearMap>
} => {
  const hopfDim = hopf.algebra.object
  const unitDim = hopf.category.dom(hopf.algebra.unit)

  const leftForward = zeroMatrix(hopfDim, unitDim * hopfDim)
  const leftBackward = zeroMatrix(unitDim * hopfDim, hopfDim)
  for (let i = 0; i < hopfDim; i += 1) {
    setMatrixEntry(leftForward, i, i, 1)
    setMatrixEntry(leftBackward, i, i, 1)
  }

  const rightForward = zeroMatrix(hopfDim, hopfDim * unitDim)
  const rightBackward = zeroMatrix(hopfDim * unitDim, hopfDim)
  for (let i = 0; i < hopfDim; i += 1) {
    setMatrixEntry(rightForward, i, i * unitDim, 1)
    setMatrixEntry(rightBackward, i * unitDim, i, 1)
  }

  return {
    left: {
      forward: mkLinearMap(unitDim * hopfDim, hopfDim, leftForward),
      backward: mkLinearMap(hopfDim, unitDim * hopfDim, leftBackward),
    },
    right: {
      forward: mkLinearMap(hopfDim * unitDim, hopfDim, rightForward),
      backward: mkLinearMap(hopfDim, hopfDim * unitDim, rightBackward),
    },
  }
}

describe("Hopf integrals and cointegrals", () => {
  it("verifies integral invariance and antipode stability", () => {
    const hopf = buildQc3Hopf()
    const unitors = buildUnitors(hopf)

    const integral = mkLinearMap(1, hopf.algebra.object, [[1], [1], [1]])

    const diagnostics = analyzeHopfIntegral(hopf, integral, {
      leftUnitor: unitors.left,
      rightUnitor: unitors.right,
    })

    expect(diagnostics.left?.holds).toBe(true)
    expect(diagnostics.right?.holds).toBe(true)
    expect(diagnostics.antipode.holds).toBe(true)
    expect(diagnostics.overall).toBe(true)
  })

  it("verifies cointegral invariance and antipode stability", () => {
    const hopf = buildQc3Hopf()
    const unitors = buildUnitors(hopf)

    const cointegral = mkLinearMap(hopf.algebra.object, 1, [[1, 0, 0]])

    const diagnostics = analyzeHopfCointegral(hopf, cointegral, {
      leftUnitor: unitors.left,
      rightUnitor: unitors.right,
    })

    expect(diagnostics.left?.holds).toBe(true)
    expect(diagnostics.right?.holds).toBe(true)
    expect(diagnostics.antipode.holds).toBe(true)
    expect(diagnostics.overall).toBe(true)
  })

  it("checks integral and cointegral normalization", () => {
    const hopf = buildQc3Hopf()
    const unitors = buildUnitors(hopf)

    const integral = mkLinearMap(1, hopf.algebra.object, [[1], [1], [1]])
    const cointegral = mkLinearMap(hopf.algebra.object, 1, [[1, 0, 0]])

    const diagnostics = analyzeHopfIntegralCointegralPair(
      hopf,
      { integral, cointegral },
      {
        integral: { leftUnitor: unitors.left, rightUnitor: unitors.right },
        cointegral: { leftUnitor: unitors.left, rightUnitor: unitors.right },
      },
    )

    expect(diagnostics.integral.overall).toBe(true)
    expect(diagnostics.cointegral.overall).toBe(true)
    expect(diagnostics.normalization.holds).toBe(true)
    expect(diagnostics.overall).toBe(true)
  })

  it("detects a failing integral candidate", () => {
    const hopf = buildQc3Hopf()
    const unitors = buildUnitors(hopf)

    const integral = mkLinearMap(1, hopf.algebra.object, [[1], [0], [0]])

    const diagnostics = analyzeHopfIntegral(hopf, integral, {
      leftUnitor: unitors.left,
      rightUnitor: unitors.right,
    })

    expect(diagnostics.left?.holds).toBe(false)
    expect(diagnostics.overall).toBe(false)
  })

  it("reports normalization mismatches", () => {
    const hopf = buildQc3Hopf()
    const unitors = buildUnitors(hopf)

    const integral = mkLinearMap(1, hopf.algebra.object, [[1], [1], [1]])
    const cointegral = mkLinearMap(hopf.algebra.object, 1, [[1, 0, 0]])
    const scaledIdentity = mkLinearMap(1, 1, [[2]])

    const diagnostics = analyzeHopfIntegralCointegralPair(
      hopf,
      { integral, cointegral },
      {
        integral: { leftUnitor: unitors.left, rightUnitor: unitors.right },
        cointegral: { leftUnitor: unitors.left, rightUnitor: unitors.right },
        normalization: { expected: scaledIdentity },
      },
    )

    expect(diagnostics.normalization.holds).toBe(false)
    expect(diagnostics.overall).toBe(false)
  })
})
