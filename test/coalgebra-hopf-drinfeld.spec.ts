import { describe, expect, it } from "vitest"

import {
  analyzeHopfDrinfeldDouble,
  analyzeHopfHalfBraiding,
  buildBraidedHopfAlgebraStructure,
  buildHopfAlgebraStructure,
  deriveBialgebraTensorWitnessesFromSymmetricMonoidal,
  type HopfAlgebraStructure,
  type HopfDrinfeldDoubleInput,
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
    mkLinearMap(
      left.dom * right.dom,
      left.cod * right.cod,
      kroneckerProduct(left, right),
    ),
}

const symmetricWitnesses: SymmetricMonoidalWitnesses<Dim, LinearMap> = {
  associator: associatorWitness,
  braiding: braidingWitness,
}

const oneByOne = mkLinearMap(1, 1, [[1]])

const makeTrivialHopf = (): HopfAlgebraStructure<Dim, LinearMap> => {
  const tensorWitnesses = deriveBialgebraTensorWitnessesFromSymmetricMonoidal(
    vectorSpaceCategory,
    tensor,
    symmetricWitnesses,
    1,
  )
  return buildHopfAlgebraStructure({
    category: vectorSpaceCategory,
    tensor,
    algebra: {
      object: 1,
      multiply: oneByOne,
      unit: oneByOne,
    },
    comonoid: {
      object: 1,
      copy: oneByOne,
      discard: oneByOne,
    },
    tensorWitnesses,
    antipode: oneByOne,
  })
}

describe("Hopf Drinfeld double diagnostics", () => {
  it("accepts central embeddings and invertible half braiding", () => {
    const hopf = makeTrivialHopf()
    const braidedHopf = buildBraidedHopfAlgebraStructure({
      ...hopf,
      symmetricMonoidalWitnesses: symmetricWitnesses,
    })
    const dual = makeTrivialHopf()
    const doubleHopf = makeTrivialHopf()

    const embeddings = {
      primal: {
        domain: braidedHopf,
        codomain: doubleHopf,
        arrow: oneByOne,
      },
      dual: {
        domain: dual,
        codomain: doubleHopf,
        arrow: oneByOne,
      },
    }

    const input: HopfDrinfeldDoubleInput<Dim, LinearMap> = {
      braidedHopf,
      dualHopf: dual,
      double: doubleHopf,
      embeddings,
      halfBraiding: braidingWitness(1, 1),
    }

    const diagnostics = analyzeHopfDrinfeldDouble(input)
    expect(diagnostics.overall).toBe(true)
    expect(diagnostics.centrality.forward.holds).toBe(true)
    expect(diagnostics.centrality.backward.holds).toBe(true)
    expect(diagnostics.halfBraiding.overall).toBe(true)
  })

  it("detects half-braiding inverses that fail to compose to identities", () => {
    const hopf = makeTrivialHopf()
    const braidedHopf = buildBraidedHopfAlgebraStructure({
      ...hopf,
      symmetricMonoidalWitnesses: symmetricWitnesses,
    })
    const dual = makeTrivialHopf()
    const doubleHopf = makeTrivialHopf()

    const embeddings = {
      primal: {
        domain: braidedHopf,
        codomain: doubleHopf,
        arrow: oneByOne,
      },
      dual: {
        domain: dual,
        codomain: doubleHopf,
        arrow: oneByOne,
      },
    }

    const failingHalfBraiding: MonoidalIsomorphismWitness<LinearMap> = {
      forward: oneByOne,
      backward: mkLinearMap(1, 1, [[0]]),
    }

    const input: HopfDrinfeldDoubleInput<Dim, LinearMap> = {
      braidedHopf,
      dualHopf: dual,
      double: doubleHopf,
      embeddings,
      halfBraiding: failingHalfBraiding,
    }

    const diagnostics = analyzeHopfDrinfeldDouble(input)
    expect(diagnostics.overall).toBe(false)
    expect(diagnostics.halfBraiding.overall).toBe(false)
  })
})

describe("Hopf braided infrastructure", () => {
  it("promotes Hopf data with symmetric witnesses to a braided Hopf structure", () => {
    const hopf = makeTrivialHopf()
    const braided = buildBraidedHopfAlgebraStructure({
      ...hopf,
      symmetricMonoidalWitnesses: symmetricWitnesses,
      quasitriangular: {
        rMatrix: oneByOne,
        inverse: oneByOne,
      },
    })
    expect(braided.symmetricMonoidalWitnesses).toBe(symmetricWitnesses)
    expect(braided.quasitriangular?.rMatrix).toBe(oneByOne)
  })

  it("checks half-braiding invertibility directly", () => {
    const halfBraiding = braidingWitness(1, 1)
    const diagnostics = analyzeHopfHalfBraiding(
      vectorSpaceCategory,
      tensor,
      [1, 1],
      halfBraiding,
    )
    expect(diagnostics.overall).toBe(true)
  })
})
