import type { RunnableExample } from "./types"
import type { Representation } from "../../stdlib/vect-view"
import type { FinGrpObj } from "../../models/fingroup-cat"
import { FieldReal } from "../../src/all/triangulated"
import {
  makeFinGrpRepresentationFunctor,
  makeFinGrpRepresentationHomIntoFunctor,
  makeFinGrpRepresentationHomFromFunctor,
  makeFinGrpRepresentationNatTrans,
} from "../../src/all/category-toolkit"
import type { FinGrpRepresentationFunctor } from "../../src/all/category-toolkit"

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

const formatMatrix = (matrix: ReadonlyArray<ReadonlyArray<number>>): string =>
  matrix.map((row) => `[${row.map((entry) => entry.toString()).join(", ")}]`).join(" ")

const buildPermutationRepresentation = (): Representation<string, number> => ({
  F: FieldReal,
  dimV: 2,
  mat: (element) =>
    element === "0"
      ? [
          [1, 0],
          [0, 1],
        ]
      : [
          [0, 1],
          [1, 0],
        ],
})

const buildSignRepresentation = (): Representation<string, number> => ({
  F: FieldReal,
  dimV: 1,
  mat: (element) => (element === "0" ? [[1]] : [[-1]]),
})

const describeBasis = (
  label: string,
  matrices: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>,
): string => {
  if (matrices.length === 0) {
    return `${label}: empty basis`
  }
  return `${label}: ` + matrices.map((matrix, index) => `b${index + 1}=${formatMatrix(matrix)}`).join("; ")
}

const describeLinearMap = (map: { M: ReadonlyArray<ReadonlyArray<number>> }): string =>
  formatMatrix(map.M)

const makeSwapEndomorphism = (
  functor: FinGrpRepresentationFunctor<number>,
): ReturnType<typeof makeFinGrpRepresentationNatTrans> =>
  makeFinGrpRepresentationNatTrans(functor, functor, [
    [0, 1],
    [1, 0],
  ])

export const stage095FinGrpRepresentationHomFunctors: RunnableExample = {
  id: "095",
  title: "Finite-group representation Hom functors",
  outlineReference: 95,
  summary:
    "Explore Hom(source,-) and Hom(-,target) functors for FinGrp representations, highlighting basis transport and coordinate actions.",
  async run() {
    const Z2 = cyclicGroup(2, "Z₂")
    const permutationFunctor = makeFinGrpRepresentationFunctor(Z2, buildPermutationRepresentation())
    const signFunctor = makeFinGrpRepresentationFunctor(Z2, buildSignRepresentation())

    const homInto = makeFinGrpRepresentationHomIntoFunctor(permutationFunctor, {
      generators: ["1"],
    })
    const homFrom = makeFinGrpRepresentationHomFromFunctor(signFunctor, {
      generators: ["1"],
    })

    const permToSign = homInto.homSpace(signFunctor)
    const permEndo = homInto.homSpace(permutationFunctor)

    const basisDescription = describeBasis("Hom(perm,sign) basis", permToSign.basis)
    const basisMatrix = permToSign.basis[0]
    const coordinates = basisMatrix ? permToSign.coordinatesFromMatrix(basisMatrix) : []
    const reconstructed = permToSign.matrixFromCoordinates(coordinates)

    const naturalTransformation =
      permToSign.dim > 0 ? permToSign.naturalTransformationFromCoordinates([1]) : undefined
    const linearMap = permToSign.dim > 0 ? permToSign.linearMapFromCoordinates([1]) : undefined

    const signIntoPermutation = makeFinGrpRepresentationNatTrans(
      signFunctor,
      permutationFunctor,
      [
        [1],
        [-1],
      ],
      { generators: ["1"] },
    )
    const postComposition = homInto.onMor(signIntoPermutation)

    const swap = makeSwapEndomorphism(permutationFunctor)
    const preComposition = homFrom.onMor(swap)
    const signHom = homFrom.homSpace(permutationFunctor)

    const logs = [
      "== Hom(source,-) functor diagnostics ==",
      `Hom(permutation, sign) dimension: ${permToSign.dim}.`,
      basisDescription,
      `Coordinates of first basis element: [${coordinates.join(", ")}].`,
      `Reconstructed matrix from coordinates: ${formatMatrix(reconstructed)}.`,
      ...(naturalTransformation
        ? [`Natural transformation from coordinates [1]: ${formatMatrix(naturalTransformation.matrix)}.`]
        : ["Hom(permutation, sign) has zero dimension — no natural transformation samples."]),
      ...(linearMap
        ? [`Linear map from coordinates [1]: ${describeLinearMap(linearMap)}.`]
        : ["Hom(permutation, sign) has zero dimension — no linear map samples."]),
      "Post-composition with sign→permutation intertwiner:",
      `Resulting matrix: ${describeLinearMap(postComposition)}.`,
      "",
      "== Hom(-,target) functor diagnostics ==",
      `Hom(permutation, permutation) dimension: ${permEndo.dim}.`,
      `Hom(permutation, sign) via Hom(-,sign) dimension: ${signHom.dim}.`,
      `Pre-composition with permutation swap endomorphism: ${describeLinearMap(preComposition)}.`,
    ]

    return { logs }
  },
}

export default stage095FinGrpRepresentationHomFunctors
