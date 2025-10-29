import type { RunnableExample } from "./types"
import type { Representation } from "../../stdlib/vect-view"
import type { FinGrpObj } from "../../models/fingroup-cat"
import { FieldReal } from "../../src/all/triangulated"
import {
  makeFinGrpRepresentationFunctor,
  makeFinGrpRepresentationNatTransWithWitness,
  checkFinGrpRepresentationNatTransMatrix,
} from "../../src/all/category-toolkit"
import type {
  FinGrpRepresentationNatTransMatrixFailure,
  FinGrpRepresentationFunctor,
} from "../../src/all/category-toolkit"

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

const describeFailure = (
  failure: FinGrpRepresentationNatTransMatrixFailure<number>,
): string => {
  switch (failure.kind) {
    case "group-mismatch":
      return `Group mismatch: source ${failure.sourceGroup.name}, target ${failure.targetGroup.name}.`
    case "field-mismatch":
      return "Field mismatch between source and target representations."
    case "row-count":
      return `Matrix row count ${failure.actualRows} does not match target dimension ${failure.expectedRows}.`
    case "column-count":
      return `Row ${failure.rowIndex} has ${failure.actualColumns} column(s), expected ${failure.expectedColumns}.`
    case "invalid-generator":
      return `Generator ${failure.element} is not part of the chosen generating set.`
    case "naturality":
      return `Naturality failed on element ${failure.element}: ${formatMatrix(failure.left)} ≠ ${formatMatrix(failure.right)}.`
  }
}

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

const describeObjectSamples = (
  functor: FinGrpRepresentationFunctor<number>,
  objects: ReadonlyArray<string>,
): string => {
  if (objects.length === 0) return "No object samples recorded."
  return objects
    .map((object, index) => {
      const image = functor.onObj(object)
      return `Object sample ${index + 1} (${object}): dimension ${image.dim}`
    })
    .join("\n")
}

const describeArrowSamples = (
  arrows: ReadonlyArray<string>,
): string => {
  if (arrows.length === 0) return "No arrow samples recorded."
  return `Arrow samples: ${arrows.join(", ")}`
}

export const stage094FinGrpRepresentationNaturalTransformations: RunnableExample = {
  id: "094",
  title: "Finite-group representation natural transformations",
  outlineReference: 94,
  summary:
    "Validate permutation→sign intertwiners and inspect detailed naturality diagnostics for FinGrp representations.",
  async run() {
    const Z2 = cyclicGroup(2, "Z₂")
    const permutationFunctor = makeFinGrpRepresentationFunctor(Z2, buildPermutationRepresentation())
    const signFunctor = makeFinGrpRepresentationFunctor(Z2, buildSignRepresentation())

    const intertwinerMatrix = [[1, -1]]
    const intertwiner = makeFinGrpRepresentationNatTransWithWitness(
      permutationFunctor,
      signFunctor,
      intertwinerMatrix,
      {
        generators: ["1"],
        metadata: [
          "Witness confirms permutation→sign natural transformation across the sampled generator.",
        ],
      },
    )

    const successReport = intertwiner.witness.report
    const objectSamples = describeObjectSamples(
      permutationFunctor,
      intertwiner.witness.witness.objectSamples,
    )
    const arrowSamples = describeArrowSamples(intertwiner.witness.witness.arrowSamples)

    const failingMatrix = [[1, 1]]
    const failureReport = checkFinGrpRepresentationNatTransMatrix(
      permutationFunctor,
      signFunctor,
      failingMatrix,
      {
        generators: ["1"],
        metadata: ["Diagnostic run for non-intertwining column vector."],
      },
    )

    const failureDescriptions = failureReport.failures.map(describeFailure)

    const logs = [
      "== Verified permutation→sign natural transformation ==",
      `Group: ${Z2.name} with ${Z2.elems.length} element(s).`,
      `Source dimension ${permutationFunctor.dimension}, target dimension ${signFunctor.dimension}.`,
      `Intertwiner matrix: ${formatMatrix(intertwinerMatrix)}.`,
      ...successReport.details,
      objectSamples,
      arrowSamples,
      "",
      "== Non-intertwiner diagnostic ==",
      `Candidate matrix: ${formatMatrix(failingMatrix)}.`,
      ...failureReport.details,
      ...(failureDescriptions.length > 0
        ? failureDescriptions
        : ["No failures recorded (unexpected)."]),
    ]

    return { logs }
  },
}

export default stage094FinGrpRepresentationNaturalTransformations
