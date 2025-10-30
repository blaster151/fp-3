import { describe, expect, it } from "vitest"

import {
  analyzeHopfComoduleMorphism,
  analyzeHopfModuleMorphism,
  buildHopfAlgebraStructure,
  deriveBialgebraTensorWitnessesFromSymmetricMonoidal,
  mkHopfComodule,
  mkHopfComoduleMorphism,
  mkHopfModule,
  mkHopfModuleMorphism,
  type HopfAlgebraStructure,
  type MonoidalIsomorphismWitness,
  type SymmetricMonoidalWitnesses,
} from "../operations/coalgebra/coalgebra-interfaces"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import type { Category } from "../stdlib/category"
import type { CategoryLimits } from "../stdlib/category-limits"

type Dim = number

interface LinearMap {
  readonly dom: Dim
  readonly cod: Dim
  readonly matrix: ReadonlyArray<ReadonlyArray<number>>
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

const mkLinearMap = (dom: Dim, cod: Dim, matrix: ReadonlyArray<ReadonlyArray<number>>): LinearMap => {
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
    throw new Error(`Cannot compose ${left.cod}×${left.dom} with ${right.cod}×${right.dom}`)
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

const buildSweedlerHopf = (): HopfAlgebraStructure<Dim, LinearMap> => {
  const hopfDim = 4
  const unitDim = 1

  const multiplyMatrix = zeroMatrix(hopfDim, hopfDim * hopfDim)
  const setProduct = (
    leftBasis: number,
    rightBasis: number,
    contributions: ReadonlyArray<readonly [number, number]>,
  ) => {
    const column = leftBasis * hopfDim + rightBasis
    contributions.forEach(([row, coefficient]) => {
      incrementMatrixEntry(multiplyMatrix, row, column, coefficient)
    })
  }

  for (let basis = 0; basis < hopfDim; basis += 1) {
    setProduct(0, basis, [[basis, 1]])
    setProduct(basis, 0, [[basis, 1]])
  }

  setProduct(1, 1, [[0, 1]])
  setProduct(1, 2, [[3, 1]])
  setProduct(1, 3, [[2, 1]])
  setProduct(2, 1, [[3, -1]])
  setProduct(3, 1, [[2, -1]])

  const unitMatrix = zeroMatrix(hopfDim, unitDim)
  setMatrixEntry(unitMatrix, 0, 0, 1)

  const copyMatrix = zeroMatrix(hopfDim * hopfDim, hopfDim)
  setMatrixEntry(copyMatrix, 0 * hopfDim + 0, 0, 1)
  setMatrixEntry(copyMatrix, 1 * hopfDim + 1, 1, 1)
  setMatrixEntry(copyMatrix, 2 * hopfDim + 0, 2, 1)
  setMatrixEntry(copyMatrix, 1 * hopfDim + 2, 2, 1)
  setMatrixEntry(copyMatrix, 3 * hopfDim + 1, 3, 1)
  setMatrixEntry(copyMatrix, 0 * hopfDim + 3, 3, 1)

  const discardMatrix = zeroMatrix(unitDim, hopfDim)
  setMatrixEntry(discardMatrix, 0, 0, 1)
  setMatrixEntry(discardMatrix, 0, 1, 1)

  const antipodeMatrix = zeroMatrix(hopfDim, hopfDim)
  setMatrixEntry(antipodeMatrix, 0, 0, 1)
  setMatrixEntry(antipodeMatrix, 1, 1, 1)
  setMatrixEntry(antipodeMatrix, 3, 2, -1)
  setMatrixEntry(antipodeMatrix, 2, 3, 1)

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

const leftMultiplicationByGenerator = (): LinearMap => {
  const matrix = zeroMatrix(3, 3)
  for (let basis = 0; basis < 3; basis += 1) {
    setMatrixEntry(matrix, (basis + 1) % 3, basis, 1)
  }
  return mkLinearMap(3, 3, matrix)
}

const qc3ModuleFailure = (): LinearMap => {
  const matrix = zeroMatrix(3, 3)
  setMatrixEntry(matrix, 0, 0, 1)
  setMatrixEntry(matrix, 0, 1, 1)
  setMatrixEntry(matrix, 2, 2, 1)
  return mkLinearMap(3, 3, matrix)
}

const sweedlerModuleAction = (): LinearMap => {
  const hopfDim = 4
  const moduleDim = 2
  const actionMatrix = zeroMatrix(moduleDim, hopfDim * moduleDim)
  const representations: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>> = [
    [
      [1, 0],
      [0, 1],
    ],
    [
      [1, 0],
      [0, -1],
    ],
    [
      [0, 1],
      [0, 0],
    ],
    [
      [0, 1],
      [0, 0],
    ],
  ]

  for (let basis = 0; basis < hopfDim; basis += 1) {
    const representation = representations[basis] ?? []
    for (let column = 0; column < moduleDim; column += 1) {
      for (let row = 0; row < moduleDim; row += 1) {
        const value = representation[row]?.[column] ?? 0
        setMatrixEntry(actionMatrix, row, basis * moduleDim + column, value)
      }
    }
  }

  return mkLinearMap(hopfDim * moduleDim, moduleDim, actionMatrix)
}

const sweedlerModuleProjection = (): LinearMap =>
  mkLinearMap(2, 2, [
    [1, 0],
    [0, 0],
  ])

describe("Hopf representations for ℚ[C₃]", () => {
  it("validates the regular module and comodule morphisms", () => {
    const hopf = buildQc3Hopf()
    expect(hopf.compatibility?.overall).toBe(true)

    const action = hopf.algebra.multiply
    const module = mkHopfModule(hopf.algebra.object, action)
    const identityMorphism = mkHopfModuleMorphism(
      module,
      module,
      vectorSpaceCategory.id(module.object),
    )
    const identityDiagnostics = analyzeHopfModuleMorphism(hopf, identityMorphism)
    expect(identityDiagnostics.holds).toBe(true)

    const generatorMorphism = mkHopfModuleMorphism(
      module,
      module,
      leftMultiplicationByGenerator(),
    )
    const generatorDiagnostics = analyzeHopfModuleMorphism(hopf, generatorMorphism)
    expect(generatorDiagnostics.holds).toBe(true)

    const failingModuleMorphism = mkHopfModuleMorphism(
      module,
      module,
      qc3ModuleFailure(),
    )
    const failingModuleDiagnostics = analyzeHopfModuleMorphism(hopf, failingModuleMorphism)
    expect(failingModuleDiagnostics.holds).toBe(false)

    const coaction = hopf.comonoid.copy
    const comodule = mkHopfComodule(hopf.algebra.object, coaction)
    const identityComodule = mkHopfComoduleMorphism(
      comodule,
      comodule,
      vectorSpaceCategory.id(comodule.object),
    )
    const comoduleIdentityDiagnostics = analyzeHopfComoduleMorphism(hopf, identityComodule)
    expect(comoduleIdentityDiagnostics.holds).toBe(true)

    const generatorComodule = mkHopfComoduleMorphism(
      comodule,
      comodule,
      leftMultiplicationByGenerator(),
    )
    const generatorComoduleDiagnostics = analyzeHopfComoduleMorphism(hopf, generatorComodule)
    expect(generatorComoduleDiagnostics.holds).toBe(false)
  })
})

describe("Hopf representations for the Sweedler Hopf algebra", () => {
  it("confirms the two-dimensional indecomposable module respects the action", () => {
    const hopf = buildSweedlerHopf()
    expect(hopf.compatibility?.overall).toBe(true)

    const action = sweedlerModuleAction()
    const module = mkHopfModule(2, action)
    const identityDiagnostics = analyzeHopfModuleMorphism(
      hopf,
      mkHopfModuleMorphism(module, module, vectorSpaceCategory.id(module.object)),
    )
    expect(identityDiagnostics.holds).toBe(true)

    const projectionDiagnostics = analyzeHopfModuleMorphism(
      hopf,
      mkHopfModuleMorphism(module, module, sweedlerModuleProjection()),
    )
    expect(projectionDiagnostics.holds).toBe(false)
  })
})
