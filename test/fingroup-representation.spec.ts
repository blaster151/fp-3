import { describe, expect, it } from "vitest"

import { FieldReal } from "../src/all/triangulated"
import { eqMat, matMul } from "../src/all/semiring-linear"
import type { Representation } from "../stdlib/vect-view"
import type { CatFunctor } from "../stdlib/category"
import type { FinGrpObj, Hom } from "../models/fingroup-cat"
import {
  makeFinGrpRepresentationFunctor,
  makeFinGrpProductRepresentation,
  functorToFinGrpRepresentation,
  finGrpRepresentationFunctorFromCatFunctor,
  makeFinGrpRepresentationNatTrans,
  makeFinGrpRepresentationNatTransFromLinMap,
  composeFinGrpRepresentationNatTrans,
  checkFinGrpRepresentationNatTransMatrix,
  analyzeFinGrpRepresentationNatTrans,
  makeFinGrpRepresentationFunctorWithWitness,
  makeFinGrpRepresentationNatTransWithWitness,
  composeFinGrpRepresentationNatTransWithWitness,
  finGrpRepresentationNatTransWitness,
  makeFinGrpRepresentationNatIso,
  makeFinGrpRepresentationNatIsoWithWitness,
  finGrpRepresentationNatIsoWitness,
  finGrpRepresentationNatTransFromNaturalTransformation,
  finGrpRepresentationNatTransFromNaturalTransformationWithWitness,
  finGrpRepresentationNatTransToNaturalTransformation,
  finGrpRepresentationNatTransToNaturalTransformationWithWitness,
  finGrpRepresentationHomSpace,
  makeFinGrpRepresentationEndomorphismAlgebra,
  makeFinGrpRepresentationNatCategory,
  checkFinGrpRepresentationNatCategoryLaws,
  makeFinGrpRepresentationHomIntoFunctor,
  finGrpRepresentationHomIntoFunctorWitness,
  makeFinGrpRepresentationHomIntoFunctorWithWitness,
  makeFinGrpRepresentationHomFromFunctor,
  finGrpRepresentationHomFromFunctorWitness,
  makeFinGrpRepresentationHomFromFunctorWithWitness,
  makeFinGrpRepresentationHomBifunctor,
  finGrpRepresentationHomBifunctorWitness,
  makeFinGrpRepresentationHomBifunctorWithWitness,
  checkFinGrpRepresentationIrreducible,
  analyzeFinGrpRepresentationSemisimplicity,
  collectFinGrpRepresentationSemisimplicitySummands,
  collectFinGrpRepresentationIrreducibleSummands,
  certifyFinGrpRepresentationSemisimplicity,
} from "../models/fingroup-representation"
import type {
  FinGrpNatTransOptions,
  FinGrpRepresentationFunctor,
  FinGrpRepresentationHomSpace,
  FinGrpRepresentationNatCategory,
} from "../models/fingroup-representation"
import { finGrpKernelEqualizer } from "../models/fingroup-equalizer"
import { makePrimeField } from "../models/fingroup-subrepresentation"
import type { FiniteGroupRepresentation } from "../models/fingroup-subrepresentation"
import { constructNaturalTransformationWithWitness } from "../natural-transformation"
import {
  FinGrpRepresentationLawRegistry,
  enumerateFinGrpRepresentationOracles,
  runFinGrpRepresentationSemisimplicityWorkflow,
  formatFinGrpRepresentationSemisimplicityWorkflow,
  formatFinGrpRepresentationSemisimplicityWorkflowProfile,
  summarizeFinGrpRepresentationSemisimplicityWorkflow,
  profileFinGrpRepresentationSemisimplicityWorkflow,
  reportFinGrpRepresentationSemisimplicityWorkflow,
  surveyFinGrpRepresentationSemisimplicityWorkflows,
  formatFinGrpRepresentationSemisimplicitySurvey,
} from "../oracles/fingroup-representation"

const identityMatrix = (dim: number): number[][] =>
  Array.from({ length: dim }, (_, row) =>
    Array.from({ length: dim }, (_, col) => (row === col ? 1 : 0)),
  )

const blockDiagonal = (blocks: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>): number[][] => {
  const total = blocks.reduce((acc, block) => acc + (block.length ?? 0), 0)
  const result: number[][] = Array.from({ length: total }, () => Array(total).fill(0))
  let offset = 0
  for (const block of blocks) {
    const size = block.length
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        result[offset + i]![offset + j]! = block[i]![j]!
      }
    }
    offset += size
  }
  return result
}

const cyclicGroup = (order: number, name: string): FinGrpObj => {
  const elems = Array.from({ length: order }, (_, index) => index.toString())
  const add = (a: string, b: string) => ((Number(a) + Number(b)) % order).toString()
  const inv = (a: string) => ((order - Number(a)) % order).toString()
  return {
    name,
    elems,
    e: "0",
    mul: add,
    inv,
  }
}

type FinRepFunctor = FinGrpRepresentationFunctor<number>

const buildHomSpace = <F extends FinRepFunctor, G extends FinRepFunctor>(
  source: F,
  target: G,
  options?: FinGrpNatTransOptions,
): FinGrpRepresentationHomSpace<number, F, G> =>
  finGrpRepresentationHomSpace<number, F, G>(source, target, options)

describe("Finite group representations as functors", () => {
  const Z2 = cyclicGroup(2, "Z₂")
  const eqMatrix = eqMat(FieldReal)
  const multiply = matMul(FieldReal)

  const representationZ2: Representation<string, number> = {
    F: FieldReal,
    dimV: 2,
    mat: (element) => (element === "0" ? identityMatrix(2) : [[0, 1], [1, 0]]),
  }

  it("recovers representation matrices after round-tripping through the functor view", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const V = functor.onObj(Z2.name)
    expect(V.dim).toBe(2)

    const generator = functor.onMor("1")
    const squared = functor.target.compose(generator, generator)
    const identity = functor.target.id(V)
    expect(functor.target.equalMor(squared, identity)).toBe(true)

    const recovered = functorToFinGrpRepresentation(functor)
    expect(eqMatrix(recovered.mat("0"), representationZ2.mat("0"))).toBe(true)
    expect(eqMatrix(recovered.mat("1"), representationZ2.mat("1"))).toBe(true)
  })

  it("upgrades raw CatFunctor data into enriched FinGrp representation functors", () => {
    const base = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const plain: CatFunctor<typeof base.source, typeof base.target> = {
      source: base.source,
      target: base.target,
      onObj: base.onObj,
      onMor: base.onMor,
    }

    const upgraded = finGrpRepresentationFunctorFromCatFunctor(plain)
    expect(upgraded.group).toBe(base.group)
    expect(upgraded.field).toBe(base.field)
    expect(upgraded.dimension).toBe(base.dimension)
    expect(eqMatrix(upgraded.representation.mat("1"), representationZ2.mat("1"))).toBe(true)

    const recovered = functorToFinGrpRepresentation(upgraded)
    expect(eqMatrix(recovered.mat("1"), representationZ2.mat("1"))).toBe(true)
  })

  it("builds product representations compatible with FinGrp metadata", () => {
    const factorFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const combined = makeFinGrpProductRepresentation([factorFunctor, factorFunctor])

    const productGroup = combined.group
    expect(productGroup.elems.length).toBe(4)

    const decode = (value: string): readonly [string, string] => JSON.parse(value) as readonly [string, string]

    const projection1: Hom = {
      name: "π₁",
      dom: productGroup.name,
      cod: Z2.name,
      map: (value: string) => decode(value)[0]!,
    }

    const kernelWitness = finGrpKernelEqualizer(productGroup, Z2, projection1, { kernelName: "Kerπ₁" })
    expect(kernelWitness.kernel.elems.length).toBe(2)

    for (const element of kernelWitness.kernel.elems) {
      const matrix = combined.onMor(element).matrix
      const firstBlock = matrix.slice(0, 2).map((row) => row.slice(0, 2))
      expect(eqMatrix(firstBlock as number[][], representationZ2.mat("0"))).toBe(true)
    }

    const [a, b] = productGroup.elems.filter((value) => value !== productGroup.e)
    if (!a || !b) throw new Error("Expected non-trivial elements in product group")

    const composed = combined.target.compose(combined.onMor(a), combined.onMor(b))
    const mulResult = productGroup.mul(a, b)
    expect(combined.target.equalMor(composed, combined.onMor(mulResult))).toBe(true)

    const recovered = functorToFinGrpRepresentation(combined)
    for (const element of productGroup.elems) {
      const [left, right] = decode(element)
      const expected = blockDiagonal([
        representationZ2.mat(left),
        representationZ2.mat(right),
      ])
      expect(eqMatrix(recovered.mat(element), expected)).toBe(true)
    }
  })

  it("builds functor witnesses for finite-group representations", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const witness = makeFinGrpRepresentationFunctorWithWitness(functor, { generators: ["1"] })

    expect(witness.report.holds).toBe(true)
    const image = witness.functor.F0(Z2.name)
    expect(image.dim).toBe(2)

    const arrow = witness.functor.F1("1")
    expect(eqMatrix(arrow.matrix as number[][], representationZ2.mat("1"))).toBe(true)
  })

  it("enumerates Hom-spaces and natural transformations for the permutation representation", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const hom = buildHomSpace(functor, functor)

    expect(hom.dim).toBe(2)
    expect(hom.basis.length).toBe(2)
    expect(hom.naturalTransformations.length).toBe(2)
    expect(hom.vectorSpace.dim).toBe(2)
    expect(hom.vectorSpace.B?.length).toBe(2)

    const identity = identityMatrix(2)
    const swap = representationZ2.mat("1")

    const tags = new Set<string>()
    for (const nat of hom.naturalTransformations) {
      const component = nat.component(Z2.name)
      const componentMatrix = component.matrix as number[][]
      expect(eqMatrix(componentMatrix, nat.matrix as number[][])).toBe(true)

      const lin = nat.asLinMap()
      expect(lin.dom.dim).toBe(2)
      expect(lin.cod.dim).toBe(2)
      expect(eqMatrix(lin.M as number[][], nat.matrix as number[][])).toBe(true)

      if (componentMatrix[0]?.[0] !== undefined) {
        const before = nat.matrix[0]![0]!
        componentMatrix[0]![0]! = before + 1
        expect(nat.matrix[0]![0]!).toBe(before)
      }

      const left = multiply(swap as number[][], nat.matrix as number[][])
      const right = multiply(nat.matrix as number[][], swap as number[][])
      expect(eqMatrix(left as number[][], right as number[][])).toBe(true)

      if (eqMatrix(nat.matrix as number[][], identity)) {
        tags.add("id")
      } else if (eqMatrix(nat.matrix as number[][], swap as number[][])) {
        tags.add("swap")
      } else {
        tags.add("other")
      }
    }

    expect(tags.has("other")).toBe(false)
    expect(tags.has("id")).toBe(true)
    expect(tags.has("swap")).toBe(true)

    const firstMatrix = hom.matrixFromCoordinates([1, 0])
    expect(eqMatrix(firstMatrix as number[][], hom.basis[0]! as number[][])).toBe(true)
    const firstLinearMap = hom.linearMapFromCoordinates([1, 0])
    expect(firstLinearMap.dom.dim).toBe(2)
    expect(firstLinearMap.cod.dim).toBe(2)
    expect(eqMatrix(firstLinearMap.M as number[][], hom.basis[0]! as number[][])).toBe(true)
    const recoveredFromLinearMap = hom.coordinatesFromLinearMap(firstLinearMap)
    expect(recoveredFromLinearMap.length).toBe(2)
    expect(recoveredFromLinearMap[0]).toBeCloseTo(1)
    expect(recoveredFromLinearMap[1]).toBeCloseTo(0)
    const natFromLinearMap = hom.naturalTransformationFromLinearMap(firstLinearMap)
    expect(eqMatrix(natFromLinearMap.matrix as number[][], hom.basis[0]! as number[][])).toBe(true)
    const secondNat = hom.naturalTransformationFromCoordinates([0, 1])
    expect(eqMatrix(secondNat.matrix as number[][], hom.basis[1]! as number[][])).toBe(true)

    const identityCoords = hom.coordinatesFromMatrix(identity)
    expect(identityCoords.length).toBe(2)
    expect(eqMatrix(hom.matrixFromCoordinates(identityCoords) as number[][], identity)).toBe(true)
    const swapCoords = hom.coordinatesFromNaturalTransformation(hom.naturalTransformations[1]!)
    expect(eqMatrix(hom.matrixFromCoordinates(swapCoords) as number[][], swap as number[][])).toBe(true)
  })

  it("exposes vector-space operations on Hom-space data", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const hom = buildHomSpace(functor, functor)

    const zeroCoords = hom.zeroCoordinates()
    expect(zeroCoords.length).toBe(2)
    expect(zeroCoords.every((value) => value === 0)).toBe(true)

    const zeroMatrix = hom.zeroMatrix()
    expect(eqMatrix(zeroMatrix as number[][], [[0, 0], [0, 0]])).toBe(true)

    const zeroNat = hom.zeroNaturalTransformation()
    expect(eqMatrix(zeroNat.matrix as number[][], zeroMatrix as number[][])).toBe(true)

    const zeroLin = hom.zeroLinearMap()
    expect(eqMatrix(zeroLin.M as number[][], zeroMatrix as number[][])).toBe(true)

    const [identityNat, swapNat] = hom.naturalTransformations
    if (!identityNat || !swapNat) throw new Error("Expected two basis natural transformations")

    const coordsIdentity = hom.coordinatesFromNaturalTransformation(identityNat)
    const coordsSwap = hom.coordinatesFromNaturalTransformation(swapNat)

    const sumNat = hom.addNaturalTransformations(identityNat, swapNat)
    const expectedSumMatrix = hom.addMatrices(identityNat.matrix, swapNat.matrix)
    expect(eqMatrix(sumNat.matrix as number[][], expectedSumMatrix as number[][])).toBe(true)

    const sumCoords = hom.addCoordinates(coordsIdentity, coordsSwap)
    expect(eqMatrix(hom.matrixFromCoordinates(sumCoords) as number[][], expectedSumMatrix as number[][])).toBe(true)

    const scalar = 3
    const scaledNat = hom.scaleNaturalTransformation(scalar, swapNat)
    const scaledMatrix = hom.scaleMatrix(scalar, swapNat.matrix)
    expect(eqMatrix(scaledNat.matrix as number[][], scaledMatrix as number[][])).toBe(true)

    const scaledCoords = hom.scaleCoordinates(scalar, coordsSwap)
    expect(eqMatrix(hom.matrixFromCoordinates(scaledCoords) as number[][], scaledMatrix as number[][])).toBe(true)

    const swapLinearMap = hom.linearMapFromCoordinates(coordsSwap)
    const scaledLinearMap = hom.scaleLinearMap(scalar, swapLinearMap)
    expect(eqMatrix(scaledLinearMap.M as number[][], scaledMatrix as number[][])).toBe(true)

    const identityLinearMap = hom.linearMapFromCoordinates(coordsIdentity)
    const sumLinearMap = hom.addLinearMaps(identityLinearMap, swapLinearMap)
    expect(eqMatrix(sumLinearMap.M as number[][], expectedSumMatrix as number[][])).toBe(true)

    const zeroMatrixFromCoords = hom.matrixFromCoordinates(hom.zeroCoordinates())
    expect(eqMatrix(zeroMatrixFromCoords as number[][], zeroMatrix as number[][])).toBe(true)
  })

  it("validates commuting matrices with the naturality checker", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const identity = identityMatrix(2)

    const report = checkFinGrpRepresentationNatTransMatrix(functor, functor, identity)
    expect(report.holds).toBe(true)
    expect(report.failures.length).toBe(0)
    expect(report.checkedElements.length).toBeGreaterThan(0)
    expect(report.details[0]).toContain("Source dimension")
  })

  it("reports detailed failures for invalid naturality matrices", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)

    const rectangularMatrix = [
      [1, 0],
      [0, 1],
      [0, 0],
    ]

    const dimensionReport = checkFinGrpRepresentationNatTransMatrix(functor, functor, rectangularMatrix)
    expect(dimensionReport.holds).toBe(false)
    expect(dimensionReport.failures.some((failure) => failure.kind === "row-count")).toBe(true)

    const generatorReport = checkFinGrpRepresentationNatTransMatrix(functor, functor, identityMatrix(2), {
      generators: ["not-an-element"],
    })
    expect(generatorReport.holds).toBe(false)
    expect(
      generatorReport.failures.some(
        (failure) => failure.kind === "invalid-generator" && failure.element === "not-an-element",
      ),
    ).toBe(true)
    expect(generatorReport.invalidGenerators).toContain("not-an-element")

    const nonCommuting = [
      [1, 0],
      [0, 0],
    ]

    const naturalityReport = checkFinGrpRepresentationNatTransMatrix(functor, functor, nonCommuting)
    expect(naturalityReport.holds).toBe(false)
    const naturalityFailure = naturalityReport.failures.find(
      (failure) => failure.kind === "naturality",
    )
    if (!naturalityFailure || naturalityFailure.kind !== "naturality") {
      throw new Error("Expected a naturality failure for the non-commuting matrix")
    }
    expect(eqMatrix(naturalityFailure.left as number[][], naturalityFailure.right as number[][])).toBe(false)
    expect(naturalityReport.checkedElements.length).toBeGreaterThan(0)
  })

  it("promotes linear maps into natural transformations", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const hom = buildHomSpace(functor, functor)
    const basisNat = hom.naturalTransformations[0]
    if (!basisNat) throw new Error("expected a natural transformation basis element")

    const linMap = basisNat.asLinMap()
    const upgraded = makeFinGrpRepresentationNatTransFromLinMap(functor, functor, linMap)
    expect(eqMatrix(upgraded.matrix as number[][], basisNat.matrix as number[][])).toBe(true)

    const invalid = {
      ...linMap,
      cod: { ...linMap.cod, dim: linMap.cod.dim + 1 },
    } as typeof linMap
    expect(() => makeFinGrpRepresentationNatTransFromLinMap(functor, functor, invalid)).toThrow(
      /linear map: codomain vector space does not match the target representation/,
    )
  })

  it("composes FinGrp representation natural transformations", () => {
    const permutation: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)

    const swapMatrix = representationZ2.mat("1")
    const swapNat = makeFinGrpRepresentationNatTrans(permutation, permutation, swapMatrix)
    const composedSwap = composeFinGrpRepresentationNatTrans(swapNat, swapNat)
    const expectedSwap = multiply(swapNat.matrix as number[][], swapNat.matrix as number[][])
    expect(eqMatrix(composedSwap.matrix as number[][], expectedSwap as number[][])).toBe(true)

    const signRepresentation: Representation<string, number> = {
      F: FieldReal,
      dimV: 1,
      mat: (element) => (element === "0" ? [[1]] : [[-1]]),
    }
    const signFunctor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, signRepresentation)

    const permutationToSign = buildHomSpace(permutation, signFunctor)
    const basisNat = permutationToSign.naturalTransformations[0]
    if (!basisNat) throw new Error("expected a generator for Hom(permutation, sign)")

    const negNat = makeFinGrpRepresentationNatTrans(signFunctor, signFunctor, [[-1]])
    const negComposed = composeFinGrpRepresentationNatTrans(negNat, basisNat)
    const expectedRectangular = multiply(negNat.matrix as number[][], basisNat.matrix as number[][])
    expect(eqMatrix(negComposed.matrix as number[][], expectedRectangular as number[][])).toBe(true)

    const { natTrans, witness } = composeFinGrpRepresentationNatTransWithWitness(negNat, basisNat, {
      generators: ["1"],
    })
    expect(eqMatrix(natTrans.matrix as number[][], expectedRectangular as number[][])).toBe(true)
    expect(witness.report.holds).toBe(true)
  })

  it("constructs the endomorphism algebra for the permutation representation", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const end = makeFinGrpRepresentationEndomorphismAlgebra<number, FinRepFunctor>(functor)

    expect(end.dimension).toBe(2)
    expect(end.basis.length).toBe(2)
    expect(end.identityCoordinates.length).toBe(2)

    const identity = identityMatrix(2)
    expect(eqMatrix(end.identity.matrix as number[][], identity)).toBe(true)
    expect(eqMatrix(end.matrixFromCoordinates(end.identityCoordinates) as number[][], identity)).toBe(true)
    const identityLinearMap = end.linearMapFromCoordinates(end.identityCoordinates)
    expect(identityLinearMap.dom.dim).toBe(2)
    expect(identityLinearMap.cod.dim).toBe(2)
    expect(eqMatrix(identityLinearMap.M as number[][], identity)).toBe(true)
    expect(eqMatrix(
      end.naturalTransformationFromLinearMap(identityLinearMap).matrix as number[][],
      identity,
    )).toBe(true)
    const identityFromLinearMap = end.coordinatesFromLinearMap(identityLinearMap)
    expect(identityFromLinearMap[0]).toBeCloseTo(end.identityCoordinates[0] ?? 0)
    expect(identityFromLinearMap[1]).toBeCloseTo(end.identityCoordinates[1] ?? 0)

    const swapMatrix = representationZ2.mat("1")
    const swapCoords = end.coordinatesFromMatrix(swapMatrix)
    expect(swapCoords.length).toBe(2)
    const swapNat = end.naturalTransformationFromCoordinates(swapCoords)
    expect(eqMatrix(swapNat.matrix as number[][], swapMatrix)).toBe(true)

    const composedCoords = end.composeCoordinates(swapCoords, swapCoords)
    expect(eqMatrix(end.matrixFromCoordinates(composedCoords) as number[][], identity)).toBe(true)

    const composedNat = end.composeNaturalTransformations(swapNat, swapNat)
    expect(eqMatrix(composedNat.matrix as number[][], identity)).toBe(true)

    const productMatrix = end.composeMatrices(swapMatrix, swapMatrix)
    expect(eqMatrix(productMatrix as number[][], identity)).toBe(true)

    const identityIndex = end.basis.findIndex((nat) => eqMatrix(nat.matrix as number[][], identity))
    const swapIndex = end.basis.findIndex((nat) => eqMatrix(nat.matrix as number[][], swapMatrix))
    expect(identityIndex).toBeGreaterThanOrEqual(0)
    expect(swapIndex).toBeGreaterThanOrEqual(0)
    if (identityIndex < 0 || swapIndex < 0) throw new Error("expected basis to contain identity and swap")

    const structure = end.structureConstants
    expect(structure.length).toBe(2)
    expect(structure[swapIndex]![swapIndex]![identityIndex]).toBeCloseTo(1)
    expect(structure[swapIndex]![swapIndex]![1 - identityIndex]).toBeCloseTo(0)
    expect(structure[identityIndex]![swapIndex]![swapIndex]).toBeCloseTo(1)
    expect(structure[swapIndex]![identityIndex]![swapIndex]).toBeCloseTo(1)

    expect(() => end.composeCoordinates([1], swapCoords)).toThrow(/expected coordinate vectors/)
  })

  it("diagnoses natural-transformation category laws for FinGrp representations", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const category: FinGrpRepresentationNatCategory<number> = makeFinGrpRepresentationNatCategory(Z2, FieldReal)
    const hom = buildHomSpace(functor, functor)

    const success = checkFinGrpRepresentationNatCategoryLaws(category, {
      objects: [functor],
      arrows: hom.naturalTransformations,
      metadata: ["law-check: permutation representation"],
    })

    expect(success.holds).toBe(true)
    expect(success.identityFailures).toHaveLength(0)
    expect(success.compositionFailures).toHaveLength(0)
    expect(success.associativityFailures).toHaveLength(0)
    expect(success.details.some((line) => line.includes("law-check"))).toBe(true)

    const swappedCompose = {
      ...category,
      compose: (
        g: (typeof hom.naturalTransformations)[number],
        f: (typeof hom.naturalTransformations)[number],
      ) => category.compose(f, g),
    } as FinGrpRepresentationNatCategory<number>

    const failure = checkFinGrpRepresentationNatCategoryLaws(swappedCompose, {
      objects: [functor],
      arrows: hom.naturalTransformations.slice(0, 2),
    })

    expect(failure.holds).toBe(false)
    expect(
      failure.compositionFailures.length + failure.associativityFailures.length,
    ).toBeGreaterThan(0)
  })

  it("rejects matrices that fail the intertwining equations", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)

    expect(() =>
      makeFinGrpRepresentationNatTrans(functor, functor, [
        [1, 1],
        [0, 1],
      ]),
    ).toThrow(/commute/)
  })

  it("produces rectangular natural transformations when the codomain dimension differs", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)

    const signRepresentation: Representation<string, number> = {
      F: FieldReal,
      dimV: 1,
      mat: (element) => (element === "0" ? [[1]] : [[-1]]),
    }

    const signFunctor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, signRepresentation)
    const hom = buildHomSpace(functor, signFunctor)

    expect(hom.dim).toBe(1)
    expect(hom.basis.length).toBe(1)
    expect(hom.naturalTransformations.length).toBe(1)

    const component = hom.naturalTransformations[0]
    if (!component) throw new Error("expected a natural transformation basis element")

    const matrix = component.matrix as number[][]
    expect(matrix.length).toBe(1)
    expect(matrix[0]?.length).toBe(2)

    const swap = representationZ2.mat("1")
    const sign = signRepresentation.mat("1")
    const left = multiply(sign as number[][], matrix as number[][])
    const right = multiply(matrix as number[][], swap as number[][])
    expect(eqMatrix(left as number[][], right as number[][])).toBe(true)

    const natural = makeFinGrpRepresentationNatTrans(
      functor,
      signFunctor,
      hom.basis[0]!,
    )
    expect(eqMatrix(natural.matrix as number[][], hom.basis[0]! as number[][])).toBe(true)
  })

  it("analyzes kernels and images of natural transformations", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const hom = buildHomSpace(functor, functor)

    const [identityNat] = hom.naturalTransformations
    if (!identityNat) throw new Error("Expected natural transformations in Hom-space basis")

    const identityAnalysis = analyzeFinGrpRepresentationNatTrans(identityNat)
    expect(identityAnalysis.rank).toBe(2)
    expect(identityAnalysis.nullity).toBe(0)
    expect(identityAnalysis.isIsomorphism).toBe(true)
    expect(identityAnalysis.kernelBasis.length).toBe(0)
    expect(identityAnalysis.imageBasis.length).toBe(2)
    expect(identityAnalysis.imageBasis[0]).toEqual([1, 0])
    expect(identityAnalysis.imageBasis[1]).toEqual([0, 1])

    const signRepresentation: Representation<string, number> = {
      F: FieldReal,
      dimV: 1,
      mat: (element) => (element === "0" ? [[1]] : [[-1]]),
    }

    const signFunctor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, signRepresentation)
    const rectangularHom = buildHomSpace(functor, signFunctor)
    const rectangularNat = rectangularHom.naturalTransformations[0]
    if (!rectangularNat) throw new Error("Expected rectangular natural transformation")

    const rectangularAnalysis = analyzeFinGrpRepresentationNatTrans(rectangularNat)
    expect(rectangularAnalysis.rank).toBe(1)
    expect(rectangularAnalysis.nullity).toBe(1)
    expect(rectangularAnalysis.isInjective).toBe(false)
    expect(rectangularAnalysis.isSurjective).toBe(true)
    expect(rectangularAnalysis.kernelBasis).toHaveLength(1)
    expect(rectangularAnalysis.kernelBasis[0]).toEqual([1, 1])
    expect(rectangularAnalysis.imageBasis).toHaveLength(1)
    expect(rectangularAnalysis.imageBasis[0]).toEqual([1])
  })

  it("upgrades commuting matrices to natural transformation witnesses", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const swapMatrix = representationZ2.mat("1")

    const { natTrans, witness } = makeFinGrpRepresentationNatTransWithWitness(
      functor,
      functor,
      swapMatrix,
    )

    expect(eqMatrix(natTrans.matrix as number[][], swapMatrix)).toBe(true)
    expect(witness.report.holds).toBe(true)

    const component = witness.transformation.component(Z2.name)
    expect(eqMatrix(component.matrix as number[][], swapMatrix)).toBe(true)

    const replay = finGrpRepresentationNatTransWitness(natTrans)
    expect(replay.report.holds).toBe(true)
  })

  it("converts generic natural transformations into FinGrp representation form", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const swapMatrix = representationZ2.mat("1")

    const naturalTransformation = makeFinGrpRepresentationNatTrans(
      functor,
      functor,
      swapMatrix,
    )

    const sourceWitness = makeFinGrpRepresentationFunctorWithWitness(functor, {
      generators: ["1"],
    })
    const targetWitness = makeFinGrpRepresentationFunctorWithWitness(functor, {
      generators: ["1"],
    })

    const generic = constructNaturalTransformationWithWitness(
      sourceWitness,
      targetWitness,
      (object) => naturalTransformation.component(object),
      { metadata: ["generic natural transformation witness"] },
    )

    const upgraded = finGrpRepresentationNatTransFromNaturalTransformation(
      functor,
      functor,
      generic.transformation,
    )
    expect(eqMatrix(upgraded.matrix as number[][], swapMatrix)).toBe(true)

    const withWitness = finGrpRepresentationNatTransFromNaturalTransformationWithWitness(
      functor,
      functor,
      generic,
      { metadata: ["FinGrp conversion"] },
    )

    expect(eqMatrix(withWitness.natTrans.matrix as number[][], swapMatrix)).toBe(true)
    expect(withWitness.witness.report.holds).toBe(true)

    const metadata = withWitness.witness.metadata ?? []
    expect(metadata).toContain("Converted from generic natural-transformation witness.")
    expect(metadata).toContain("FinGrp conversion")
    expect(metadata).toContain("generic natural transformation witness")
  })

  it("converts FinGrp representation natural transformations into the generic form", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const swapMatrix = representationZ2.mat("1")

    const naturalTransformation = makeFinGrpRepresentationNatTrans(
      functor,
      functor,
      swapMatrix,
    )

    const generic = finGrpRepresentationNatTransToNaturalTransformation(naturalTransformation)

    expect(generic.source).toBe(functor)
    expect(generic.target).toBe(functor)

    const component = generic.component(Z2.name)
    const componentMatrix = component.matrix as number[][]
    expect(eqMatrix(componentMatrix, swapMatrix)).toBe(true)

    componentMatrix[0]![0]! += 1
    expect(eqMatrix(naturalTransformation.matrix as number[][], swapMatrix)).toBe(true)
  })

  it("packages FinGrp natural transformations with generic witnesses", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const swapMatrix = representationZ2.mat("1")

    const naturalTransformation = makeFinGrpRepresentationNatTrans(
      functor,
      functor,
      swapMatrix,
    )

    const withWitness = finGrpRepresentationNatTransToNaturalTransformationWithWitness(
      naturalTransformation,
      { metadata: ["generic conversion"] },
    )

    expect(withWitness.report.holds).toBe(true)
    const component = withWitness.transformation.component(Z2.name)
    expect(eqMatrix(component.matrix as number[][], swapMatrix)).toBe(true)

    const metadata = withWitness.metadata ?? []
    expect(metadata).toContain(
      "Converted FinGrp representation natural transformation into generic witness form.",
    )
    expect(metadata).toContain("generic conversion")
    expect(metadata).toContain(
      "FinGrp representation natural transformation witness checks commuting matrices on generators.",
    )
  })

  it("promotes invertible intertwiners to natural isomorphisms", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const isoMatrix = [
      [2, 1],
      [1, 2],
    ]

    const iso = makeFinGrpRepresentationNatIso(functor, functor, isoMatrix)
    expect(eqMatrix(iso.forward.matrix as number[][], isoMatrix)).toBe(true)

    const expectedInverse = [
      [2 / 3, -1 / 3],
      [-1 / 3, 2 / 3],
    ]
    expect(eqMatrix(iso.inverse.matrix as number[][], expectedInverse)).toBe(true)

    const leftIdentity = multiply(iso.forward.matrix as number[][], iso.inverse.matrix as number[][])
    const rightIdentity = multiply(iso.inverse.matrix as number[][], iso.forward.matrix as number[][])
    expect(eqMatrix(leftIdentity as number[][], identityMatrix(2))).toBe(true)
    expect(eqMatrix(rightIdentity as number[][], identityMatrix(2))).toBe(true)
  })

  it("attaches witnesses to finite-group representation natural isomorphisms", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const isoMatrix = [
      [2, 1],
      [1, 2],
    ]

    const { iso, witness } = makeFinGrpRepresentationNatIsoWithWitness(functor, functor, isoMatrix, {
      generators: ["1"],
    })

    expect(witness.forward.report.holds).toBe(true)
    expect(witness.inverse.report.holds).toBe(true)

    const replay = finGrpRepresentationNatIsoWitness(iso, { generators: ["1"] })
    expect(replay.forward.report.holds).toBe(true)
    expect(replay.inverse.report.holds).toBe(true)
  })

  it("rejects singular commuting matrices when building natural isomorphisms", () => {
    const functor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const singular = [
      [1, 1],
      [1, 1],
    ]

    expect(() => makeFinGrpRepresentationNatIso(functor, functor, singular)).toThrow(
      /natural isomorphism/i,
    )
  })

  it("assembles the natural-transformation category for a fixed finite group", () => {
    const Z2 = cyclicGroup(2, "Z₂")
    const permutation: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, {
      F: FieldReal,
      dimV: 2,
      mat: (element) => (element === "0" ? identityMatrix(2) : [[0, 1], [1, 0]]),
    })

    const category: FinGrpRepresentationNatCategory<number> = makeFinGrpRepresentationNatCategory(Z2, FieldReal)
    category.ensureObject(permutation)

    const idNat = category.id(permutation)
    expect(eqMatrix(idNat.matrix as number[][], identityMatrix(2))).toBe(true)

    const swapMatrix = permutation.representation.mat("1")
    const swapNat = makeFinGrpRepresentationNatTrans(permutation, permutation, swapMatrix)

    const composed = category.compose(swapNat, idNat)
    expect(category.equalMor?.(composed, swapNat)).toBe(true)
    expect(category.dom(swapNat)).toBe(permutation)
    expect(category.cod(swapNat)).toBe(permutation)

    const back = category.compose(idNat, swapNat)
    expect(category.equalMor?.(back, swapNat)).toBe(true)
  })

  it("packages Hom(permutation,-) as a functor to vector spaces", () => {
    const permutation: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const signRepresentation: Representation<string, number> = {
      F: FieldReal,
      dimV: 1,
      mat: (element) => (element === "0" ? [[1]] : [[-1]]),
    }
    const signFunctor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, signRepresentation)

    const homFunctor = makeFinGrpRepresentationHomIntoFunctor(permutation)
    const permutationHom = homFunctor.homSpace(permutation)
    const signHom = homFunctor.homSpace(signFunctor)

    expect(homFunctor.onObj(permutation)).toBe(permutationHom.vectorSpace)
    expect(homFunctor.onObj(signFunctor)).toBe(signHom.vectorSpace)

    const swapMatrix = permutation.representation.mat("1")
    const swapNat = makeFinGrpRepresentationNatTrans(permutation, permutation, swapMatrix)
    const postCompose = homFunctor.onMor(swapNat)
    expect(eqMatrix(postCompose.M as number[][], [[0, 1], [1, 0]])).toBe(true)

    const negNat = makeFinGrpRepresentationNatTrans(signFunctor, signFunctor, [[-1]])
    const negLinear = homFunctor.onMor(negNat)
    expect(eqMatrix(negLinear.M as number[][], [[-1]])).toBe(true)

    const alphaBasis = signHom.naturalTransformations[0]
    if (!alphaBasis) throw new Error("expected a generator for Hom(permutation, sign)")
    const induced = homFunctor.onMor(alphaBasis)
    const expectedColumns = permutationHom.naturalTransformations.map((nat) => {
      const composed = multiply(alphaBasis.matrix as number[][], nat.matrix as number[][])
      return signHom.coordinatesFromMatrix(composed)
    })
    const expectedMatrix = Array.from({ length: signHom.dim }, (_, row) =>
      expectedColumns.map((column) => column[row] ?? 0),
    )
    expect(eqMatrix(induced.M as number[][], expectedMatrix as number[][])).toBe(true)
  })

  it("packages Hom(-,sign) as a functor with precomposition coordinates", () => {
    const permutation: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const signRepresentation: Representation<string, number> = {
      F: FieldReal,
      dimV: 1,
      mat: (element) => (element === "0" ? [[1]] : [[-1]]),
    }
    const signFunctor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, signRepresentation)

    const homFunctor = makeFinGrpRepresentationHomFromFunctor(signFunctor)
    const permutationHom = homFunctor.homSpace(permutation)
    const signHom = homFunctor.homSpace(signFunctor)

    expect(homFunctor.onObj(permutation)).toBe(permutationHom.vectorSpace)
    expect(homFunctor.onObj(signFunctor)).toBe(signHom.vectorSpace)

    const swapMatrix = permutation.representation.mat("1")
    const swapNat = makeFinGrpRepresentationNatTrans(permutation, permutation, swapMatrix)
    const preCompose = homFunctor.onMor(swapNat)
    expect(eqMatrix(preCompose.M as number[][], [[-1]])).toBe(true)

    const negNat = makeFinGrpRepresentationNatTrans(signFunctor, signFunctor, [[-1]])
    const postCompose = homFunctor.onMor(negNat)
    expect(eqMatrix(postCompose.M as number[][], [[-1]])).toBe(true)

    const alphaBasis = permutationHom.naturalTransformations[0]
    if (!alphaBasis) throw new Error("expected a generator for Hom(permutation, sign)")
    const induced = homFunctor.onMor(alphaBasis)
    const expectedColumns = signHom.naturalTransformations.map((nat) => {
      const composed = multiply(nat.matrix as number[][], alphaBasis.matrix as number[][])
      return permutationHom.coordinatesFromMatrix(composed)
    })
    const expectedMatrix = Array.from({ length: permutationHom.dim }, (_, row) =>
      expectedColumns.map((column) => column[row] ?? 0),
    )
    expect(eqMatrix(induced.M as number[][], expectedMatrix as number[][])).toBe(true)
  })

  it("builds witnesses for Hom(source,-) functors", () => {
    const permutation: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const homFunctor = makeFinGrpRepresentationHomIntoFunctor(permutation)

    const witness = finGrpRepresentationHomIntoFunctorWitness(homFunctor)
    expect(witness.report.holds).toBe(true)
    expect(witness.witness.objectGenerators.includes(permutation)).toBe(true)
    expect(witness.metadata?.some((line: string) => line.includes("Hom(source,-)"))).toBe(true)

    const constructed = makeFinGrpRepresentationHomIntoFunctorWithWitness(permutation)
    expect(constructed.functor.sourceRepresentation).toBe(permutation)
    expect(constructed.witness.report.holds).toBe(true)
    const builtSpace = constructed.witness.functor.F0(permutation)
    expect(builtSpace.B).toBeDefined()
    expect(homFunctor.homSpace(permutation).vectorSpace.B).toBeDefined()
    expect(
      eqMatrix(
        builtSpace.B as number[][],
        homFunctor.homSpace(permutation).vectorSpace.B as number[][],
      ),
    ).toBe(true)
  })

  it("builds witnesses for Hom(-,sign) functors", () => {
    const permutation: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const signRepresentation: Representation<string, number> = {
      F: FieldReal,
      dimV: 1,
      mat: (element) => (element === "0" ? [[1]] : [[-1]]),
    }
    const signFunctor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, signRepresentation)
    const homFunctor = makeFinGrpRepresentationHomFromFunctor(signFunctor)

    const witness = finGrpRepresentationHomFromFunctorWitness(homFunctor)
    expect(witness.report.holds).toBe(true)
    expect(witness.witness.objectGenerators.includes(signFunctor)).toBe(true)
    expect(witness.metadata?.some((line: string) => line.includes("Hom(-,target)"))).toBe(true)

    const constructed = makeFinGrpRepresentationHomFromFunctorWithWitness(signFunctor)
    expect(constructed.functor.targetRepresentation).toBe(signFunctor)
    expect(constructed.witness.report.holds).toBe(true)
    const builtSpace = constructed.witness.functor.F0(signFunctor)
    expect(builtSpace.B).toBeDefined()
    expect(homFunctor.homSpace(signFunctor).vectorSpace.B).toBeDefined()
    expect(
      eqMatrix(
        builtSpace.B as number[][],
        homFunctor.homSpace(signFunctor).vectorSpace.B as number[][],
      ),
    ).toBe(true)
  })

  it("packages Hom(-,-) as a bifunctor with coordinated transport", () => {
    const permutation: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const signRepresentation: Representation<string, number> = {
      F: FieldReal,
      dimV: 1,
      mat: (element) => (element === "0" ? [[1]] : [[-1]]),
    }
    const signFunctor: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, signRepresentation)
    const natCategory: FinGrpRepresentationNatCategory<number> = makeFinGrpRepresentationNatCategory(Z2, FieldReal)
    const bifunctor = makeFinGrpRepresentationHomBifunctor(natCategory)

    const permutationPair = bifunctor.homSpace(permutation, permutation)
    expect(bifunctor.onObj([permutation, permutation])).toBe(permutationPair.vectorSpace)

    const swapNat = makeFinGrpRepresentationNatTrans(
      permutation,
      permutation,
      representationZ2.mat("1"),
    )
    const identityNat = natCategory.id(permutation)
    const transported = bifunctor.onMor({ pre: swapNat, post: identityNat })
    expect(eqMatrix(transported.M as number[][], [[0, 1], [1, 0]])).toBe(true)

    const permutationSign = bifunctor.homSpace(permutation, signFunctor)
    expect(bifunctor.onObj([permutation, signFunctor])).toBe(permutationSign.vectorSpace)

    const negateNat = makeFinGrpRepresentationNatTrans(signFunctor, signFunctor, [[-1]])
    const negated = bifunctor.onMor({ pre: identityNat, post: negateNat })
    expect(eqMatrix(negated.M as number[][], [[-1]])).toBe(true)
  })

  it("builds witnesses for the Hom(-,-) bifunctor", () => {
    const permutation: FinRepFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const natCategory: FinGrpRepresentationNatCategory<number> = makeFinGrpRepresentationNatCategory(Z2, FieldReal)
    const bifunctor = makeFinGrpRepresentationHomBifunctor(natCategory)
    const swapNat = makeFinGrpRepresentationNatTrans(
      permutation,
      permutation,
      representationZ2.mat("1"),
    )
    const identityNat = natCategory.id(permutation)

    const witness = finGrpRepresentationHomBifunctorWitness(bifunctor, {
      samples: {
        objects: [[permutation, permutation]],
        arrows: [{ pre: swapNat, post: identityNat }],
      },
    })
    expect(witness.report.holds).toBe(true)

    const constructed = makeFinGrpRepresentationHomBifunctorWithWitness(natCategory, {
      samples: {
        objects: [[permutation, permutation]],
        arrows: [{ pre: swapNat, post: identityNat }],
      },
    })
    expect(constructed.witness.report.holds).toBe(true)
    const transported = constructed.functor.onMor({ pre: swapNat, post: identityNat })
    expect(eqMatrix(transported.M as number[][], [[0, 1], [1, 0]])).toBe(true)
  })

  describe("irreducibility and semisimplicity diagnostics", () => {
    it("detects invariant-based reducibility", () => {
      const F3 = makePrimeField(3)
      const twisted: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_twisted",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [2, 2],
                [1, 0],
              ],
      }

      const report = checkFinGrpRepresentationIrreducible(twisted)
      expect(report.holds).toBe(false)
      expect(report.witness.kind).toBe("invariant")
      if (report.witness.kind !== "invariant") {
        throw new Error("expected invariant witness")
      }
      const invariant = report.witness
      expect(invariant.invariantsDimension).toBe(1)
      const image = invariant.images["1"]
      expect(image).toBeDefined()
      expect(image).toEqual(invariant.basisVector)
    })

    it("certifies irreducible one-dimensional representations", () => {
      const F3 = makePrimeField(3)
      const sign: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 1,
        label: "ρ_sign",
        matrix: (element) => (element === "0" ? [[1]] : [[2]]),
      }

      const report = checkFinGrpRepresentationIrreducible(sign)
      expect(report.holds).toBe(true)
      expect(report.witness.kind).toBe("irreducible")
      if (report.witness.kind !== "irreducible") {
        throw new Error("expected irreducibility witness")
      }
      expect(report.witness.invariantsDimension).toBe(0)
    })

    it("constructs splitting data for semisimple representations", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const report = analyzeFinGrpRepresentationSemisimplicity(diagonal)
      expect(report.holds).toBe(true)
      expect(report.root.decomposition).toBeDefined()
      const decomposition = report.root.decomposition!
      const product = composeFinGrpRepresentationNatTrans(
        decomposition.quotientProjection,
        decomposition.section,
      )
      expect(product.matrix).toEqual([[1]])
    })

    it("reports missing splittings for non-semisimple modules", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const report = analyzeFinGrpRepresentationSemisimplicity(jordan)
      expect(report.holds).toBe(false)
      expect(report.failure?.reason).toBe("no-splitting")
      expect(report.failure?.witness?.subspace.indices).toEqual([0])
    })

    it("collects semisimplicity summands and verifies reconstruction", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const report = analyzeFinGrpRepresentationSemisimplicity(diagonal)
      expect(report.holds).toBe(true)

      const summands = collectFinGrpRepresentationSemisimplicitySummands(report, {
        includeIrreducibility: true,
      })
      expect(summands.holds).toBe(true)
      expect(summands.failures).toHaveLength(0)
      expect(summands.summands).toHaveLength(2)
      expect(
        summands.details.some((line) => line.includes("certified irreducible")),
      ).toBe(true)

      const eqF3 = eqMat(F3)
      expect(
        eqF3(
          summands.total.matrix as number[][],
          summands.identity.matrix as number[][],
        ),
      ).toBe(true)
    })

    it("retains failure metadata when semisimplicity breaks", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const report = analyzeFinGrpRepresentationSemisimplicity(jordan)
      expect(report.holds).toBe(false)

      const summands = collectFinGrpRepresentationSemisimplicitySummands(report)
      expect(summands.holds).toBe(false)
      expect(
        summands.details.some((detail) => detail.includes("reported failure")),
      ).toBe(true)
    })

    it("isolates irreducible summands when every leaf splits", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const report = analyzeFinGrpRepresentationSemisimplicity(diagonal)
      const summands = collectFinGrpRepresentationSemisimplicitySummands(report, {
        includeIrreducibility: true,
      })
      const irreducible = collectFinGrpRepresentationIrreducibleSummands(report, {
        reuseSummandsReport: summands,
      })

      expect(irreducible.holds).toBe(true)
      expect(irreducible.summands).toHaveLength(2)
      expect(irreducible.failures).toHaveLength(0)
      expect(
        irreducible.details.some((line) => line.includes("Identified 2 irreducible summands")),
      ).toBe(true)
    })

    it("propagates reducibility witnesses when leaves fail irreducibility", () => {
      const F3 = makePrimeField(3)
      const reducible: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_red",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const report = analyzeFinGrpRepresentationSemisimplicity(reducible)
      const irreducible = collectFinGrpRepresentationIrreducibleSummands(report)

      expect(irreducible.holds).toBe(false)
      expect(
        irreducible.failures.some((failure) => failure.kind === "analysis-failure"),
      ).toBe(true)
    })

    it("certifies direct-sum decompositions when semisimplicity succeeds", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const analysis = analyzeFinGrpRepresentationSemisimplicity(diagonal)
      const certification = certifyFinGrpRepresentationSemisimplicity(analysis)
      expect(certification.holds).toBe(true)
      const direct = certification.directSum
      expect(direct).toBeDefined()
      if (!direct) {
        throw new Error("expected direct-sum certification")
      }

      const eqF3 = eqMat(F3)
      expect(
        eqF3(
          direct.forwardThenBackward.matrix as number[][],
          direct.identityDirectSum.matrix as number[][],
        ),
      ).toBe(true)
      expect(
        eqF3(
          direct.backwardThenForward.matrix as number[][],
          certification.summands.identity.matrix as number[][],
        ),
      ).toBe(true)

      expect(direct.representation.matrix("1")).toEqual([
        [1, 0],
        [0, 2],
      ])
      expect(direct.offsets).toEqual([0, 1, 2])
    })

    it("propagates analysis failures when certification cannot proceed", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const analysis = analyzeFinGrpRepresentationSemisimplicity(jordan)
      const certification = certifyFinGrpRepresentationSemisimplicity(analysis)
      expect(certification.holds).toBe(false)
      expect(certification.failure?.kind).toBe("analysis-failure")
      expect(certification.directSum).toBeUndefined()
      expect(certification.details.some((line) => line.includes("skipping direct-sum"))).toBe(true)
    })

    it("enumerates irreducibility and semisimplicity diagnostics", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const suite = enumerateFinGrpRepresentationOracles(diagonal)
      expect(suite.all).toHaveLength(5)
      expect(suite.irreducibility.registryPath).toBe(
        FinGrpRepresentationLawRegistry.irreducibility.registryPath,
      )
      expect(suite.irreducibility.holds).toBe(false)
      expect(suite.irreducibility.report.witness.kind).toBe("coordinate-subrepresentation")
      expect(suite.semisimplicity.holds).toBe(true)
      expect(suite.summands.holds).toBe(true)
      expect(suite.irreducibleSummands.holds).toBe(true)
      expect(suite.certification.holds).toBe(true)
      expect(suite.summands.report.root).toBe(suite.semisimplicity.report.root)
      expect(suite.all.map((result) => result.registryPath)).toEqual([
        FinGrpRepresentationLawRegistry.irreducibility.registryPath,
        FinGrpRepresentationLawRegistry.semisimplicityAnalysis.registryPath,
        FinGrpRepresentationLawRegistry.semisimplicitySummands.registryPath,
        FinGrpRepresentationLawRegistry.irreducibleSummands.registryPath,
        FinGrpRepresentationLawRegistry.semisimplicityCertification.registryPath,
      ])
    })

    it("surfaces semisimplicity failures in the enumerator", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const suite = enumerateFinGrpRepresentationOracles(jordan)
      expect(suite.semisimplicity.holds).toBe(false)
      expect(suite.summands.holds).toBe(false)
      expect(suite.certification.holds).toBe(false)
      expect(suite.certification.report.failure?.kind).toBe("analysis-failure")
      expect(suite.irreducibleSummands.holds).toBe(false)
      expect(suite.all[0]).toBe(suite.irreducibility)
      expect(suite.all[4]).toBe(suite.certification)
    })

    it("aggregates semisimplicity workflow results", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(diagonal)
      expect(workflow.holds).toBe(true)
      expect(workflow.isIrreducible).toBe(false)
      expect(workflow.isSemisimple).toBe(true)
      expect(workflow.hasSummands).toBe(true)
      expect(workflow.hasIrreducibleSummands).toBe(true)
      expect(workflow.hasCertifiedDirectSum).toBe(true)
      expect(workflow.failures).toHaveLength(0)
      expect(workflow.timeline).toHaveLength(5)
      expect(workflow.timeline.map((stage) => stage.kind)).toEqual([
        "irreducibility",
        "semisimplicityAnalysis",
        "semisimplicitySummands",
        "irreducibleSummands",
        "semisimplicityCertification",
      ])
      expect(workflow.stages.irreducibility).toBe(workflow.timeline[0])
      expect(workflow.stages.certification.summary).toContain("Certified a direct sum")
      expect(workflow.details.some((line) => line.includes("Semisimplicity analysis succeeded"))).toBe(true)
      expect(workflow.details[0]).toContain("Finite-group representation irreducibility")
      expect(workflow.details.some((line) => line.includes("Direct-sum certification produced"))).toBe(true)
      expect(workflow.suite.all).toHaveLength(5)
    })

    it("records the first failing stage in the workflow", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(jordan)
      expect(workflow.holds).toBe(false)
      expect(workflow.isSemisimple).toBe(false)
      expect(workflow.hasCertifiedDirectSum).toBe(false)
      expect(workflow.failure?.stage).toBe("semisimplicityAnalysis")
      expect(workflow.failures.length).toBeGreaterThan(0)
      expect(workflow.timeline[1]?.holds).toBe(false)
      expect(workflow.timeline[1]?.summary).toContain("failed")
      expect(workflow.details.some((line) => line.includes("failed to produce a splitting tree"))).toBe(true)
      expect(workflow.suite.semisimplicity.holds).toBe(false)
    })

    it("formats a readable semisimplicity workflow narrative", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(diagonal)
      const narrative = formatFinGrpRepresentationSemisimplicityWorkflow(workflow)

      expect(narrative[0]).toContain("succeeded")
      expect(narrative[0]).toMatch(/direct sum/i)
      expect(narrative[1]).toMatch(/^  [✔✘]/u)
      expect(
        narrative.some((line) => line.includes("Finite-group representation semisimplicity analysis")),
      ).toBe(true)

      const narrativeWithDetails = formatFinGrpRepresentationSemisimplicityWorkflow(workflow, {
        includeStageDetails: true,
        includeWorkflowDetails: true,
      })
      const hasStageDetails = workflow.timeline.some((stage) => stage.details.length > 0)
      if (hasStageDetails) {
        expect(narrativeWithDetails.length).toBeGreaterThan(narrative.length)
      }
      expect(
        workflow.details.every((detail) =>
          narrativeWithDetails.some((line) => line.includes(detail)),
        ),
      ).toBe(true)
    })

    it("highlights failing stages in the formatted narrative", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(jordan)
      const narrative = formatFinGrpRepresentationSemisimplicityWorkflow(workflow, {
        includeWorkflowDetails: true,
      })

      expect(narrative[0]).toContain("failed")
      expect(narrative[0]).toContain("semisimplicity analysis")
      expect(
        narrative.some((line) => line.includes("Semisimplicity analysis failed to produce a splitting tree")),
      ).toBe(true)
      expect(
        workflow.details.some((detail) => narrative.some((line) => line.includes(detail))),
      ).toBe(true)
    })

    it("summarizes successful semisimplicity workflows", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(diagonal)
      const summary = summarizeFinGrpRepresentationSemisimplicityWorkflow(workflow)

      expect(summary.classification).toBe("certified-semisimple")
      expect(summary.headline).toContain("succeeded")
      expect(summary.status.certification).toBe(true)
      expect(summary.stageSummaries).toHaveLength(5)
      expect(summary.stageSummaries[0]?.kind).toBe("irreducibility")
      expect(summary.highlights.some((line) => line.includes("Semisimplicity analysis succeeded"))).toBe(true)
      expect(summary.recommendations.some((line) => line.includes("direct-sum witnesses"))).toBe(true)
      expect(summary.failure).toBeUndefined()
    })

    it("summarizes failing semisimplicity workflows with recommendations", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(jordan)
      const summary = summarizeFinGrpRepresentationSemisimplicityWorkflow(workflow)

      expect(summary.classification).toBe("reducible-with-witness")
      expect(summary.headline).toContain("failed")
      expect(summary.status.semisimple).toBe(false)
      expect(summary.failure?.stage).toBe("semisimplicityAnalysis")
      expect(summary.failure?.summary).toContain("failed")
      expect(summary.highlights.some((line) => line.includes("failed to produce a splitting tree"))).toBe(true)
      expect(
        summary.recommendations.some((line) =>
          line.includes("Semisimplicity analysis failed"),
        ),
      ).toBe(true)
    })

    it("profiles successful semisimplicity workflows with quantitative metrics", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(diagonal)
      const profile = profileFinGrpRepresentationSemisimplicityWorkflow(workflow)

      expect(profile.classification).toBe("certified-semisimple")
      expect(profile.representation.dimension).toBe(2)
      expect(profile.analysis.tree.leafCount).toBeGreaterThanOrEqual(1)
      expect(profile.summands.total).toBe(profile.analysis.tree.leafCount)
      expect(profile.irreducibleSummands.verified).toBe(profile.irreducibleSummands.total)
      expect(profile.certification.holds).toBe(true)
      expect(profile.workflow.failureStage).toBeUndefined()
    })

    it("profiles failing semisimplicity workflows with failure diagnostics", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(jordan)
      const profile = profileFinGrpRepresentationSemisimplicityWorkflow(workflow)

      expect(profile.classification).toBe("reducible-with-witness")
      expect(profile.analysis.holds).toBe(false)
      expect(profile.analysis.failureReason).toBeDefined()
      expect(profile.summands.failureCount).toBeGreaterThanOrEqual(0)
      expect(profile.certification.holds).toBe(false)
      expect(profile.workflow.failureStage).toBe("semisimplicityAnalysis")
    })

    it("formats semisimplicity workflow profiles with default sections", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(diagonal)
      const profile = profileFinGrpRepresentationSemisimplicityWorkflow(workflow)
      const formatted = formatFinGrpRepresentationSemisimplicityWorkflowProfile(profile)

      expect(formatted[0]).toContain("ρ_diag")
      expect(formatted[0]).toContain("Certified semisimple")
      expect(formatted).toContain("  Representation:")
      expect(
        formatted.some((line) => line.includes("Group order")),
      ).toBe(true)
      expect(
        formatted.some((line) => line.includes("All stages succeeded")),
      ).toBe(true)
      expect(
        formatted.some((line) => line.includes("Irreducibility:") && line.includes("witness=irreducible")),
      ).toBe(true)
      expect(
        formatted.some((line) => line.includes("Semisimplicity analysis:") && line.includes("Successful")),
      ).toBe(true)
      expect(formatted).toContain("  Semisimplicity summands:")
      expect(
        formatted.some((line) => line.includes("✓") && line.includes("summand")),
      ).toBe(true)
      expect(formatted).toContain("  Irreducible summands:")
      expect(formatted.some((line) => line.includes("verified"))).toBe(true)
      expect(formatted).toContain("  Direct-sum certification:")
      expect(formatted.some((line) => line.includes("Succeeded"))).toBe(true)
    })

    it("formats semisimplicity workflow profiles with custom detail toggles", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const workflow = runFinGrpRepresentationSemisimplicityWorkflow(jordan)
      const profile = profileFinGrpRepresentationSemisimplicityWorkflow(workflow)
      const formatted = formatFinGrpRepresentationSemisimplicityWorkflowProfile(profile, {
        includeRepresentation: false,
        includeAnalysisTreeMetrics: true,
        includeDimensionDetails: true,
        successSymbol: "✔",
        failureSymbol: "✘",
      })

      expect(formatted[0]).toContain("Reducible with witness")
      expect(
        formatted.some((line) => line.startsWith("  Representation:")),
      ).toBe(false)
      expect(formatted.some((line) => line.includes("Status: ✘ Failed"))).toBe(true)
      expect(formatted).toContain("  Semisimplicity analysis:")
      expect(
        formatted.some((line) => line.includes("Tree:") && line.includes("nodes")),
      ).toBe(true)
      expect(
        formatted.filter((line) => line.includes("Dimensions: [")).length,
      ).toBeGreaterThanOrEqual(2)
      expect(
        formatted.some((line) =>
          line.includes("Direct-sum certification:") &&
          line.includes("semisimplicity analysis reported a failure"),
        ),
      ).toBe(true)
    })

    it("reports semisimplicity workflows with aggregated artifacts", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const report = reportFinGrpRepresentationSemisimplicityWorkflow(diagonal)

      expect(report.workflow.holds).toBe(true)
      expect(report.summary.classification).toBe("certified-semisimple")
      expect(report.profile.workflow.holds).toBe(true)
      expect(report.profile.representation.dimension).toBe(diagonal.dim)
      expect(report.narrative?.[0]).toContain("succeeded")
    })

    it("omits the narrative when requested", () => {
      const F3 = makePrimeField(3)
      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const report = reportFinGrpRepresentationSemisimplicityWorkflow(jordan, {
        includeNarrative: false,
      })

      expect(report.workflow.holds).toBe(false)
      expect(report.summary.classification).toBe("reducible-with-witness")
      expect(report.narrative).toBeUndefined()
    })

    it("surveys semisimplicity workflows across multiple representations", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const sign: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 1,
        label: "ρ_sign",
        matrix: (element) => (element === "0" ? [[1]] : [[2]]),
      }

      const survey = surveyFinGrpRepresentationSemisimplicityWorkflows([
        diagonal,
        jordan,
        sign,
      ])

      expect(survey.observations).toHaveLength(3)
      expect(survey.metrics.total).toBe(3)
      expect(survey.metrics.successCount).toBe(2)
      expect(survey.metrics.withNarrative).toBe(3)
      expect(survey.metrics.classificationCounts).toEqual({
        "certified-semisimple": 2,
        "semisimple-without-certification": 0,
        irreducible: 0,
        "reducible-with-witness": 1,
        "partial-decomposition": 0,
        inconclusive: 0,
      })
      expect(survey.metrics.statusCounts.irreducible).toBe(1)
      expect(survey.metrics.statusCounts.certification).toBe(2)
      expect(survey.metrics.failureStageCounts).toEqual({
        semisimplicityAnalysis: 1,
      })
      expect(survey.metrics.dimension.min).toBe(1)
      expect(survey.metrics.dimension.max).toBe(2)
      expect(survey.metrics.dimension.average).toBeCloseTo(5 / 3)
    })

    it("formats semisimplicity survey analytics for humans", () => {
      const F3 = makePrimeField(3)
      const diagonal: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_diag",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 0],
                [0, 2],
              ],
      }

      const jordan: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 2,
        label: "ρ_jordan",
        matrix: (element) =>
          element === "0"
            ? [
                [1, 0],
                [0, 1],
              ]
            : [
                [1, 1],
                [0, 1],
              ],
      }

      const sign: FiniteGroupRepresentation = {
        group: Z2,
        field: F3,
        dim: 1,
        label: "ρ_sign",
        matrix: (element) => (element === "0" ? [[1]] : [[2]]),
      }

      const survey = surveyFinGrpRepresentationSemisimplicityWorkflows([
        diagonal,
        jordan,
        sign,
      ])

      const formatted = formatFinGrpRepresentationSemisimplicitySurvey(survey)
      expect(formatted[0]).toBe(
        "Semisimplicity workflow survey across 3 representations",
      )
      expect(formatted).toContain("  2 succeeded; 3 include narratives")
      expect(formatted).toContain("  Classification breakdown:")
      expect(formatted).toContain("    - Certified semisimple: 2")
      expect(formatted).toContain("    - Reducible with witness: 1")
      expect(formatted).toContain(
        "  First failure stage counts:",
      )
      expect(
        formatted.some((line) =>
          line.includes("Finite-group representation semisimplicity analysis"),
        ),
      ).toBe(true)
      expect(formatted).toContain(
        "  Dimension stats: min=1, max=2, average≈1.67",
      )

      expect(formatted).toContain("  - ρ_diag: Certified semisimple ✓")
      expect(formatted).toContain("  - ρ_jordan: Reducible with witness ✗")
      expect(formatted).toContain("  - ρ_sign: Certified semisimple ✓")
      expect(
        formatted.some((line) =>
          line.startsWith("      Certification: ✗"),
        ),
      ).toBe(true)
      expect(
        formatted.some((line) => line.startsWith("      Irreducible: ✓")),
      ).toBe(true)

      const concise = formatFinGrpRepresentationSemisimplicitySurvey(survey, {
        includeObservations: false,
        includeClassificationBreakdown: false,
      })
      expect(concise.some((line) => line.includes("Observations:"))).toBe(false)
      expect(
        concise.some((line) => line.includes("Classification breakdown")),
      ).toBe(false)
    })
  })
})

