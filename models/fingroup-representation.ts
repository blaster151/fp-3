import type { CatFunctor, FiniteCategory, Category } from "../stdlib/category"
import { eqStrict } from "../stdlib/eq"
import { intertwinerSpace, invariantSubspace } from "../stdlib/vect-view"
import type { IntertwinerSpace, Representation } from "../stdlib/vect-view"
import { eye, matMul, eqMat } from "../src/all/semiring-linear"
import type { FinGrpObj } from "./fingroup-cat"
import {
  FinGrpProductsWithTuple,
  solveLinear,
  nullspace,
  createRrefResolver,
  type RrefResolver,
} from "../src/all/triangulated"
import type { Field } from "../src/all/triangulated"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import type { SimpleCat } from "../simple-cat"
import {
  constructFunctorWithWitness,
  type Functor,
  type FunctorCheckSamples,
  type FunctorWithWitness,
} from "../functor"
import {
  constructNaturalTransformationWithWitness,
  type NaturalTransformationWithWitness,
  type NaturalTransformation,
} from "../natural-transformation"
import {
  enumerateCoordinateSubrepresentationWitnesses,
  type FiniteGroupRepresentation,
  type SubrepresentationSearchOptions,
  type SubrepresentationWitness,
} from "./fingroup-subrepresentation"

type GroupElement = string

type Matrix<R> = ReadonlyArray<ReadonlyArray<R>>
type MutableMatrix<R> = R[][]

type VectorSpace<R> = {
  readonly F: Representation<GroupElement, R>["F"]
  readonly dim: number
  readonly B?: ReadonlyArray<ReadonlyArray<R>>
}

type LinMap<R> = {
  readonly F: Representation<GroupElement, R>["F"]
  readonly dom: VectorSpace<R>
  readonly cod: VectorSpace<R>
  readonly M: Matrix<R>
}

export interface FinGrpActionCategory extends FiniteCategory<string, GroupElement> {
  readonly group: FinGrpObj
}

export interface RepObj {
  readonly dim: number
}

export interface RepMor<R> {
  readonly matrix: ReadonlyArray<ReadonlyArray<R>>
  readonly dom: RepObj
  readonly cod: RepObj
}

export interface RepresentationCategory<R>
  extends Category<RepObj, RepMor<R>>, ArrowFamilies.HasDomCod<RepObj, RepMor<R>> {
  readonly equalMor: (left: RepMor<R>, right: RepMor<R>) => boolean
  readonly object: RepObj
  readonly field: Representation<GroupElement, R>["F"]
}

interface VectorSpaceCategory<R>
  extends Category<VectorSpace<R>, LinMap<R>>, ArrowFamilies.HasDomCod<VectorSpace<R>, LinMap<R>> {
  readonly field: Representation<GroupElement, R>["F"]
}

interface FinGrpRepresentationActionContext<R> {
  readonly group: FinGrpObj
  readonly field: Representation<GroupElement, R>["F"]
  readonly dimension: number
  readonly target: RepresentationCategory<R>
  readonly onObj: (name: string) => RepObj
  readonly onMor: (element: GroupElement) => RepMor<R>
}

export interface FinGrpRepresentationFunctor<R>
  extends CatFunctor<FinGrpActionCategory, RepresentationCategory<R>> {
  readonly group: FinGrpObj
  readonly field: Representation<GroupElement, R>["F"]
  readonly dimension: number
  readonly representation: Representation<GroupElement, R>
}

export interface FinGrpNatTransOptions {
  readonly generators?: ReadonlyArray<GroupElement>
}

export interface FinGrpRepresentationFunctorWitnessOptions extends FinGrpNatTransOptions {
  readonly metadata?: ReadonlyArray<string>
}

export type FinGrpRepresentationFunctorWitness<R> = FunctorWithWitness<
  string,
  GroupElement,
  RepObj,
  RepMor<R>
>

export interface FinGrpRepresentationNatTransWithWitness<
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
> {
  readonly natTrans: FinGrpRepresentationNatTrans<R, F, G>
  readonly witness: NaturalTransformationWithWitness<
    string,
    GroupElement,
    RepObj,
    RepMor<R>
  >
}

export interface FinGrpRepresentationNatTransWitnessOptions extends FinGrpNatTransOptions {
  readonly metadata?: ReadonlyArray<string>
}

export interface FinGrpRepresentationNatTransMatrixOptions extends FinGrpNatTransOptions {
  readonly metadata?: ReadonlyArray<string>
}

export interface FinGrpRepresentationNatTransMatrixGroupMismatchFailure {
  readonly kind: "group-mismatch"
  readonly sourceGroup: FinGrpObj
  readonly targetGroup: FinGrpObj
}

export interface FinGrpRepresentationNatTransMatrixFieldMismatchFailure {
  readonly kind: "field-mismatch"
}

export interface FinGrpRepresentationNatTransMatrixRowFailure {
  readonly kind: "row-count"
  readonly expectedRows: number
  readonly actualRows: number
}

export interface FinGrpRepresentationNatTransMatrixColumnFailure {
  readonly kind: "column-count"
  readonly rowIndex: number
  readonly expectedColumns: number
  readonly actualColumns: number
}

export interface FinGrpRepresentationNatTransMatrixInvalidGeneratorFailure {
  readonly kind: "invalid-generator"
  readonly element: GroupElement
}

export interface FinGrpRepresentationNatTransMatrixNaturalityFailure<R> {
  readonly kind: "naturality"
  readonly element: GroupElement
  readonly left: Matrix<R>
  readonly right: Matrix<R>
}

export type FinGrpRepresentationNatTransMatrixFailure<R> =
  | FinGrpRepresentationNatTransMatrixGroupMismatchFailure
  | FinGrpRepresentationNatTransMatrixFieldMismatchFailure
  | FinGrpRepresentationNatTransMatrixRowFailure
  | FinGrpRepresentationNatTransMatrixColumnFailure
  | FinGrpRepresentationNatTransMatrixInvalidGeneratorFailure
  | FinGrpRepresentationNatTransMatrixNaturalityFailure<R>

export interface FinGrpRepresentationNatTransLinearAnalysisOptions {
  readonly resolver?: RrefResolver
}

export interface FinGrpRepresentationNatTransLinearAnalysis<
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
> {
  readonly source: F
  readonly target: G
  readonly field: Representation<GroupElement, R>["F"]
  readonly matrix: Matrix<R>
  readonly sourceDimension: number
  readonly targetDimension: number
  readonly kernelBasis: ReadonlyArray<ReadonlyArray<R>>
  readonly imageBasis: ReadonlyArray<ReadonlyArray<R>>
  readonly kernelDimension: number
  readonly imageDimension: number
  readonly rank: number
  readonly nullity: number
  readonly cokernelDimension: number
  readonly isInjective: boolean
  readonly isSurjective: boolean
  readonly isIsomorphism: boolean
}

export interface FinGrpRepresentationNatTransMatrixReport<R> {
  readonly holds: boolean
  readonly failures: ReadonlyArray<FinGrpRepresentationNatTransMatrixFailure<R>>
  readonly checkedElements: ReadonlyArray<GroupElement>
  readonly invalidGenerators: ReadonlyArray<GroupElement>
  readonly details: ReadonlyArray<string>
}

export interface FinGrpRepresentationNatIso<
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
> {
  readonly forward: FinGrpRepresentationNatTrans<R, F, G>
  readonly inverse: FinGrpRepresentationNatTrans<R, G, F>
}

export interface FinGrpRepresentationNatIsoWitness<
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
> {
  readonly forward: NaturalTransformationWithWitness<
    string,
    GroupElement,
    RepObj,
    RepMor<R>
  >
  readonly inverse: NaturalTransformationWithWitness<
    string,
    GroupElement,
    RepObj,
    RepMor<R>
  >
}

export interface FinGrpRepresentationNatIsoWithWitness<
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
> {
  readonly iso: FinGrpRepresentationNatIso<R, F, G>
  readonly witness: FinGrpRepresentationNatIsoWitness<R, F, G>
}

export interface FinGrpRepresentationNatIsoWitnessOptions extends FinGrpNatTransOptions {
  readonly metadata?: ReadonlyArray<string>
  readonly forwardMetadata?: ReadonlyArray<string>
  readonly inverseMetadata?: ReadonlyArray<string>
}

interface FinGrpNatCategorySampleOptions<R> {
  readonly objects?: ReadonlyArray<FinGrpRepresentationFunctor<R>>
  readonly arrows?: ReadonlyArray<
    FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >
  >
}

export interface FinGrpRepresentationNatCategoryIdentityFailure<R> {
  readonly object: FinGrpRepresentationFunctor<R>
  readonly arrow: FinGrpRepresentationNatTrans<
    R,
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationFunctor<R>
  >
  readonly side: "left" | "right"
  readonly composite: FinGrpRepresentationNatTrans<
    R,
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationFunctor<R>
  >
  readonly reason: string
}

export interface FinGrpRepresentationNatCategoryCompositionFailure<R> {
  readonly pair: {
    readonly f: FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >
    readonly g: FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >
  }
  readonly composite: FinGrpRepresentationNatTrans<
    R,
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationFunctor<R>
  >
  readonly reason: string
}

export interface FinGrpRepresentationNatCategoryAssociativityFailure<R> {
  readonly triple: {
    readonly f: FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >
    readonly g: FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >
    readonly h: FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >
  }
  readonly leftComposite: FinGrpRepresentationNatTrans<
    R,
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationFunctor<R>
  >
  readonly rightComposite: FinGrpRepresentationNatTrans<
    R,
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationFunctor<R>
  >
  readonly reason: string
}

export interface FinGrpRepresentationNatCategoryLawReport<R> {
  readonly identityFailures: ReadonlyArray<FinGrpRepresentationNatCategoryIdentityFailure<R>>
  readonly compositionFailures: ReadonlyArray<FinGrpRepresentationNatCategoryCompositionFailure<R>>
  readonly associativityFailures: ReadonlyArray<FinGrpRepresentationNatCategoryAssociativityFailure<R>>
  readonly holds: boolean
  readonly details: ReadonlyArray<string>
}

export interface FinGrpRepresentationNatCategoryLawOptions<R>
  extends FinGrpNatCategorySampleOptions<R> {
  readonly metadata?: ReadonlyArray<string>
}

const makeGroupCategory = (group: FinGrpObj): FinGrpActionCategory => {
  const { name } = group
  const hom = (a: string, b: string): ReadonlyArray<GroupElement> => {
    if (a !== name || b !== name) return []
    return group.elems
  }

  const ensureElement = (value: GroupElement, role: string): void => {
    if (!group.elems.includes(value)) {
      throw new Error(
        `makeGroupCategory(${group.name}): ${role} ${value} is not an element of ${group.name}.`,
      )
    }
  }

  return {
    objects: [name],
    hom,
    dom: (mor: GroupElement) => {
      ensureElement(mor, "domain evaluation of")
      return name
    },
    cod: (mor: GroupElement) => {
      ensureElement(mor, "codomain evaluation of")
      return name
    },
    group,
    id: (object: string): GroupElement => {
      if (object !== name) {
        throw new Error(
          `makeGroupCategory(${group.name}): identity requested for unknown object ${object}.`,
        )
      }
      return group.e
    },
    compose: (g: GroupElement, f: GroupElement): GroupElement => {
      ensureElement(g, "right factor")
      ensureElement(f, "left factor")
      return group.mul(g, f)
    },
    eq: eqStrict<GroupElement>(),
  }
}

const makeRepresentationCategory = <R>(
  field: Representation<GroupElement, R>["F"],
  dim: number,
): RepresentationCategory<R> => {
  const object: RepObj = { dim }
  const identity = eye(field)(dim)
  const multiply = matMul(field)
  const equal = eqMat(field)

  return {
    object,
    field,
    id: (obj: RepObj): RepMor<R> => {
      if (obj.dim !== dim) {
        throw new Error(
          `makeRepresentationCategory: identity requested for dim=${obj.dim}, expected ${dim}.`,
        )
      }
      return { matrix: identity, dom: object, cod: object }
    },
    compose: (g: RepMor<R>, f: RepMor<R>): RepMor<R> => {
      if (f.cod !== g.dom) {
        throw new Error(
          "makeRepresentationCategory: attempted to compose maps with incompatible endpoints.",
        )
      }
      return {
        matrix: multiply(g.matrix as R[][], f.matrix as R[][]),
        dom: f.dom,
        cod: g.cod,
      }
    },
    dom: (mor: RepMor<R>) => mor.dom,
    cod: (mor: RepMor<R>) => mor.cod,
    equalMor: (left: RepMor<R>, right: RepMor<R>) =>
      equal(left.matrix as R[][], right.matrix as R[][]),
  }
}

const makeVectorSpaceCategory = <R>(
  field: Representation<GroupElement, R>["F"],
): VectorSpaceCategory<R> => {
  const multiply = matMul(field)
  const equal = eqMat(field)

  return {
    field,
    id: (space: VectorSpace<R>): LinMap<R> => {
      const identity = eye(field)(space.dim)
      return {
        F: field,
        dom: space,
        cod: space,
        M: identity,
      }
    },
    compose: (g: LinMap<R>, f: LinMap<R>): LinMap<R> => {
      if (f.cod.dim !== g.dom.dim) {
        throw new Error("VectorSpaceCategory: attempted to compose linear maps with mismatched dimensions.")
      }
      return {
        F: field,
        dom: f.dom,
        cod: g.cod,
        M: multiply(g.M as R[][], f.M as R[][]),
      }
    },
    dom: (mor: LinMap<R>) => mor.dom,
    cod: (mor: LinMap<R>) => mor.cod,
    equalMor: (left: LinMap<R>, right: LinMap<R>) => {
      if (left.dom.dim !== right.dom.dim || left.cod.dim !== right.cod.dim) {
        return false
      }
      return equal(left.M as R[][], right.M as R[][])
    },
  }
}

const cloneMatrix = <R>(matrix: Matrix<R>): MutableMatrix<R> =>
  matrix.map((row) => row.map((value) => value))

const blockDiagonal = <R>(
  field: Representation<GroupElement, R>["F"],
  blocks: ReadonlyArray<Matrix<R>>,
): MutableMatrix<R> => {
  const total = blocks.reduce((acc, block) => acc + (block.length ?? 0), 0)
  if (total === 0) return []

  const result: R[][] = Array.from({ length: total }, () =>
    Array.from({ length: total }, () => field.zero),
  )

  let offset = 0
  for (const block of blocks) {
    const size = block.length
    for (let i = 0; i < size; i++) {
      const blockRow = block[i]
      const resultRow = result[offset + i]
      if (!blockRow || !resultRow) continue
      for (let j = 0; j < size; j++) {
        const value = blockRow[j]
        resultRow[offset + j] = value ?? field.zero
      }
    }
    offset += size
  }

  return result
}

const coordinateBasis = <R>(field: Representation<GroupElement, R>["F"], dim: number): MutableMatrix<R> =>
  Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (i === j ? field.one : field.zero)),
  )

const zeroMatrix = <R>(
  field: Representation<GroupElement, R>["F"],
  rows: number,
  cols: number,
): MutableMatrix<R> =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => field.zero))

const linearCombination = <R>(
  field: Representation<GroupElement, R>["F"],
  basis: ReadonlyArray<Matrix<R>>,
  coefficients: ReadonlyArray<R>,
  rows: number,
  cols: number,
): MutableMatrix<R> => {
  const result = zeroMatrix(field, rows, cols)
  const { add, mul } = field

  for (let i = 0; i < basis.length; i++) {
    const coefficient = coefficients[i] ?? field.zero
    const matrix = basis[i]
    if (!matrix) continue
    for (let r = 0; r < rows; r++) {
      const row = matrix[r]
      const resultRow = result[r]
      if (!row || !resultRow) continue
      for (let c = 0; c < cols; c++) {
        const entry = row[c]
        if (entry === undefined) continue
        const current = resultRow[c] ?? field.zero
        resultRow[c] = add(current, mul(coefficient, entry))
      }
    }
  }

  return result
}

const invertSquareMatrix = <R>(
  field: Representation<GroupElement, R>["F"],
  matrix: Matrix<R>,
): MutableMatrix<R> => {
  const dimension = matrix.length
  if (dimension === 0) return []

  for (const [index, row] of matrix.entries()) {
    if ((row?.length ?? 0) !== dimension) {
      throw new Error(
        `invertSquareMatrix: row ${index} has ${(row?.length ?? 0)} columns, expected ${dimension}.`,
      )
    }
  }

  const solver = solveLinear(field)
  const identity = coordinateBasis(field, dimension)
  const inverse = zeroMatrix(field, dimension, dimension)

  for (let columnIndex = 0; columnIndex < dimension; columnIndex++) {
    const rhs = identity.map((row) => row?.[columnIndex] ?? field.zero)
    const solution = solver(matrix as R[][], rhs)
    if (solution.length !== dimension) {
      throw new Error(
        "invertSquareMatrix: linear solver returned a vector with unexpected dimension.",
      )
    }
    for (let rowIndex = 0; rowIndex < dimension; rowIndex++) {
      const inverseRow = inverse[rowIndex]
      if (!inverseRow) continue
      inverseRow[columnIndex] = solution[rowIndex] ?? field.zero
    }
  }

  return inverse
}

const flattenColumnMajor = <R>(
  field: Representation<GroupElement, R>["F"],
  matrix: Matrix<R>,
  rows: number,
  cols: number,
): R[] => {
  const vector: R[] = []
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const value = matrix[r]?.[c]
      vector.push(value ?? field.zero)
    }
  }
  return vector
}

const buildCoefficientMatrix = <R>(
  field: Representation<GroupElement, R>["F"],
  basis: ReadonlyArray<Matrix<R>>,
  rows: number,
  cols: number,
): Matrix<R> => {
  if (basis.length === 0) return []
  const vectors = basis.map((matrix) => flattenColumnMajor(field, matrix, rows, cols))
  const totalRows = rows * cols
  return Array.from({ length: totalRows }, (_, rowIndex) =>
    vectors.map((vector) => vector[rowIndex] ?? field.zero),
  )
}

const isZeroMatrix = <R>(
  field: Representation<GroupElement, R>["F"],
  matrix: Matrix<R>,
): boolean => {
  const eq = field.eq ?? ((a: R, b: R) => Object.is(a, b))
  for (const row of matrix) {
    for (const value of row ?? []) {
      if (!eq(value!, field.zero)) {
        return false
      }
    }
  }
  return true
}

const ensureRepresentation = <R>(
  group: FinGrpObj,
  representation: Representation<GroupElement, R>,
): void => {
  const dim = representation.dimV
  if (dim < 0) {
    throw new Error(`Representation for ${group.name} must have non-negative dimension.`)
  }

  for (const element of group.elems) {
    const matrix = representation.mat(element)
    if (matrix.length !== dim) {
      throw new Error(
        `Representation for ${group.name}: matrix for ${element} has ${matrix.length} rows, expected ${dim}.`,
      )
    }
    for (const row of matrix) {
      if (row.length !== dim) {
        throw new Error(
          `Representation for ${group.name}: matrix for ${element} is not ${dim}×${dim}.`,
        )
      }
    }
  }
}

export const makeFinGrpRepresentationFunctor = <R>(
  group: FinGrpObj,
  representation: Representation<GroupElement, R>,
): FinGrpRepresentationFunctor<R> => {
  ensureRepresentation(group, representation)

  const source = makeGroupCategory(group)
  const target = makeRepresentationCategory(representation.F, representation.dimV)

  const morphism = (element: GroupElement): RepMor<R> => {
    if (!group.elems.includes(element)) {
      throw new Error(`Representation(${group.name}): unknown element ${element}.`)
    }
    const matrix = representation.mat(element)
    return {
      matrix,
      dom: target.object,
      cod: target.object,
    }
  }

  return {
    source,
    target,
    onObj: (name: string): RepObj => {
      if (name !== group.name) {
        throw new Error(
          `Representation(${group.name}): requested image of unknown object ${name}.`,
        )
      }
      return target.object
    },
    onMor: morphism,
    group,
    field: representation.F,
    dimension: representation.dimV,
    representation,
  }
}

export const makeFinGrpRepresentationFunctorWithWitness = <R>(
  functor: FinGrpRepresentationFunctor<R>,
  options?: FinGrpRepresentationFunctorWitnessOptions,
): FinGrpRepresentationFunctorWitness<R> => {
  const samples = makeFunctorSamples(functor.group, options?.generators)
  const metadata = [
    "FinGrp representation functor witness verifies generator identities and products.",
    ...(options?.metadata ?? []),
  ]
  return constructFunctorWithWitness(
    asSimpleCategory(functor.source),
    asSimpleCategory(functor.target),
    {
      F0: (object: string) => functor.onObj(object),
      F1: (arrow: GroupElement) => functor.onMor(arrow),
    },
    samples,
    metadata,
  )
}

export const makeFinGrpProductRepresentation = <R>(
  functors: ReadonlyArray<FinGrpRepresentationFunctor<R>>,
): FinGrpRepresentationFunctor<R> => {
  if (functors.length === 0) {
    throw new Error("makeFinGrpProductRepresentation: at least one component functor is required.")
  }

  const first = functors[0]!
  const rest = functors.slice(1)
  for (const candidate of rest) {
    if (candidate.field !== first.field) {
      throw new Error(
        "makeFinGrpProductRepresentation: all component representations must share the same field instance.",
      )
    }
  }

  const factors = functors.map((functor) => functor.group)
  const productWitness = FinGrpProductsWithTuple.product(factors)
  const { obj: productObj, projections } = productWitness
  if (projections.length !== functors.length) {
    throw new Error(
      "makeFinGrpProductRepresentation: projection arity does not match supplied representations.",
    )
  }

  const dimension = functors.reduce((acc, functor) => acc + functor.dimension, 0)

  const representation: Representation<GroupElement, R> = {
    F: first.field,
    dimV: dimension,
    mat: (element: GroupElement): R[][] => {
      if (!productObj.elems.includes(element)) {
        throw new Error(
          `makeFinGrpProductRepresentation(${productObj.name}): ${element} is not an element of ${productObj.name}.`,
        )
      }
      const blocks = projections.map((projection, index) => {
        const coordinate = projection.map(element)
        const component = functors[index]
        if (!component) {
          throw new Error(
            "makeFinGrpProductRepresentation: missing component while building block diagonal action.",
          )
        }
        return component.onMor(coordinate).matrix
      })
      return blockDiagonal(first.field, blocks)
    },
  }

  return makeFinGrpRepresentationFunctor(productObj, representation)
}

export interface RepresentationRecoveryOptions {
  readonly generators?: ReadonlyArray<GroupElement>
}

const buildRepresentationFromAction = <R>(
  action: FinGrpRepresentationActionContext<R>,
  options?: RepresentationRecoveryOptions,
): Representation<GroupElement, R> => {
  const { group, target, field, dimension } = action
  const generators = options?.generators ?? group.elems

  const generatorSet = new Set(generators)
  if (!generatorSet.has(group.e)) generatorSet.add(group.e)

  const generatorArray = Array.from(generatorSet)
  for (const generator of generatorArray) {
    if (!group.elems.includes(generator)) {
      throw new Error(
        `functorToFinGrpRepresentation(${group.name}): generator ${generator} is not an element of ${group.name}.`,
      )
    }
  }

  const reachable = new Set<GroupElement>()
  const queue: GroupElement[] = [...generatorArray]
  while (queue.length > 0) {
    const element = queue.shift()!
    if (reachable.has(element)) continue
    reachable.add(element)
    for (const generator of generatorSet) {
      const forward = group.mul(element, generator)
      const backward = group.mul(generator, element)
      if (!reachable.has(forward)) queue.push(forward)
      if (!reachable.has(backward)) queue.push(backward)
    }
  }

  if (reachable.size !== group.elems.length) {
    throw new Error(
      `functorToFinGrpRepresentation(${group.name}): provided generators do not span the entire group.`,
    )
  }

  const idImage = action.onMor(group.e)
  if (!target.equalMor(idImage, target.id(action.onObj(group.name)))) {
    throw new Error(`functorToFinGrpRepresentation(${group.name}): identity law violated.`)
  }

  const checkElement = (element: GroupElement): void => {
    const inverse = group.inv(element)
    const mor = action.onMor(element)
    const invMor = action.onMor(inverse)
    const identity = target.id(action.onObj(group.name))
    const composed = target.compose(mor, invMor)
    if (!target.equalMor(composed, identity)) {
      throw new Error(
        `functorToFinGrpRepresentation(${group.name}): element ${element} does not admit inverse under functorial image.`,
      )
    }

    const reverse = target.compose(invMor, mor)
    if (!target.equalMor(reverse, identity)) {
      throw new Error(
        `functorToFinGrpRepresentation(${group.name}): inverse check failed for ${element} · ${inverse}.`,
      )
    }
  }

  for (const element of reachable) {
    checkElement(element)
  }

  const compose = target.compose
  const equal = target.equalMor

  const checkAssociativity = (a: GroupElement, b: GroupElement) => {
    const left = action.onMor(group.mul(a, b))
    const right = compose(action.onMor(a), action.onMor(b))
    if (!equal(left, right)) {
      throw new Error(
        `functorToFinGrpRepresentation(${group.name}): coherence failed at ${a}·${b}.`,
      )
    }
  }

  for (const a of reachable) {
    for (const b of generatorArray) {
      checkAssociativity(a, b)
      checkAssociativity(b, a)
    }
  }

  for (const element of group.elems) {
    if (!reachable.has(element)) {
      throw new Error(
        `functorToFinGrpRepresentation(${group.name}): element ${element} is unreachable despite generator closure.`,
      )
    }
    const matrix = action.onMor(element).matrix
    if (matrix.length !== dimension) {
      throw new Error(
        `functorToFinGrpRepresentation(${group.name}): matrix for ${element} has inconsistent row count ${matrix.length}.`,
      )
    }
  }

  return {
    F: field,
    dimV: dimension,
    mat: (element: GroupElement): R[][] => cloneMatrix(action.onMor(element).matrix),
  }
}

export const functorToFinGrpRepresentation = <R>(
  functor: FinGrpRepresentationFunctor<R>,
  options?: RepresentationRecoveryOptions,
): Representation<GroupElement, R> => buildRepresentationFromAction(functor, options)

export const finGrpRepresentationFunctorFromCatFunctor = <R>(
  functor: CatFunctor<FinGrpActionCategory, RepresentationCategory<R>>,
  options?: RepresentationRecoveryOptions,
): FinGrpRepresentationFunctor<R> => {
  const { source, target } = functor
  const group = source.group
  const field = target.field

  if (!source.objects.includes(group.name)) {
    throw new Error(
      `finGrpRepresentationFunctorFromCatFunctor(${group.name}): domain category does not expose the group object ${group.name}.`,
    )
  }

  const image = functor.onObj(group.name)
  if (image.dim !== target.object.dim) {
    throw new Error(
      `finGrpRepresentationFunctorFromCatFunctor(${group.name}): object image dimension ${image.dim} does not match target representation dimension ${target.object.dim}.`,
    )
  }

  const representation = buildRepresentationFromAction(
    {
      group,
      field,
      dimension: image.dim,
      target,
      onObj: functor.onObj,
      onMor: functor.onMor,
    },
    options,
  )

  return {
    source,
    target,
    onObj: functor.onObj,
    onMor: functor.onMor,
    group,
    field,
    dimension: image.dim,
    representation,
  }
}

const ensureSharedGroup = <R>(
  source: FinGrpRepresentationFunctor<R>,
  target: FinGrpRepresentationFunctor<R>,
): void => {
  if (source.group !== target.group) {
    throw new Error(
      `FinGrp representation natural transformations require both functors to share the same group instance.`,
    )
  }
}

const ensureSharedField = <R>(
  source: FinGrpRepresentationFunctor<R>,
  target: FinGrpRepresentationFunctor<R>,
): void => {
  if (source.field !== target.field) {
    throw new Error(
      `FinGrp representation natural transformations require functors to use the same field instance.`,
    )
  }
}

const ensureLinearMapCompatibility = <R>(
  source: FinGrpRepresentationFunctor<R>,
  target: FinGrpRepresentationFunctor<R>,
  linMap: LinMap<R>,
): void => {
  if (linMap.F !== source.field || linMap.F !== target.field) {
    throw new Error(
      "FinGrp representation linear map: expected map to use the same field instance as the functors.",
    )
  }
  if (linMap.dom.F !== source.field || linMap.dom.dim !== source.dimension) {
    throw new Error(
      "FinGrp representation linear map: domain vector space does not match the source representation.",
    )
  }
  if (linMap.cod.F !== target.field || linMap.cod.dim !== target.dimension) {
    throw new Error(
      "FinGrp representation linear map: codomain vector space does not match the target representation.",
    )
  }
}

const normalizeGenerators = (
  group: FinGrpObj,
  generators?: ReadonlyArray<GroupElement>,
): ReadonlyArray<GroupElement> => {
  const candidateList = generators ?? group.elems
  const seen = new Set<GroupElement>()
  const normalized: GroupElement[] = []

  for (const element of candidateList) {
    if (!group.elems.includes(element)) {
      throw new Error(
        `FinGrp representation natural transformations: generator ${element} is not an element of ${group.name}.`,
      )
    }
    if (!seen.has(element)) {
      seen.add(element)
      normalized.push(element)
    }
  }

  return normalized
}

const collectGeneratorsForCheck = (
  group: FinGrpObj,
  generators?: ReadonlyArray<GroupElement>,
): { normalized: GroupElement[]; invalid: GroupElement[] } => {
  const seen = new Set<GroupElement>()
  const normalized: GroupElement[] = []
  const invalid: GroupElement[] = []

  const domain = group.elems
  const candidates = generators ?? domain

  for (const element of candidates) {
    if (!domain.includes(element)) {
      if (!invalid.includes(element)) {
        invalid.push(element)
      }
      continue
    }
    if (!seen.has(element)) {
      seen.add(element)
      normalized.push(element)
    }
  }

  if (normalized.length === 0 && domain.length > 0) {
    for (const element of domain) {
      if (!seen.has(element)) {
        seen.add(element)
        normalized.push(element)
      }
    }
  }

  if (!seen.has(group.e)) {
    seen.add(group.e)
    normalized.push(group.e)
  }

  return { normalized, invalid }
}

const normalizeGeneratorsWithIdentity = (
  group: FinGrpObj,
  generators?: ReadonlyArray<GroupElement>,
): ReadonlyArray<GroupElement> => {
  const normalized = normalizeGenerators(group, generators)
  const sample = new Set<GroupElement>(normalized)
  sample.add(group.e)
  if (normalized.length === 0) {
    for (const element of group.elems) {
      sample.add(element)
    }
  }
  return Array.from(sample)
}

const asSimpleCategory = <Obj, Mor>(
  category: Category<Obj, Mor> & ArrowFamilies.HasDomCod<Obj, Mor>,
): SimpleCat<Obj, Mor> => ({
  id: (object: Obj) => category.id(object),
  compose: (g: Mor, f: Mor) => category.compose(g, f),
  src: (arrow: Mor) => category.dom(arrow),
  dst: (arrow: Mor) => category.cod(arrow),
})

const makeFunctorSamples = (
  group: FinGrpObj,
  generators?: ReadonlyArray<GroupElement>,
): FunctorCheckSamples<string, GroupElement> => {
  const arrows = normalizeGeneratorsWithIdentity(group, generators)
  const composablePairs = arrows.flatMap((g) => arrows.map((f) => ({ f, g })))
  return {
    objects: [group.name],
    arrows,
    composablePairs,
  }
}

export interface FinGrpRepresentationNatTrans<
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
> {
  readonly source: F
  readonly target: G
  readonly matrix: Matrix<R>
  readonly component: (object: string) => RepMor<R>
  readonly asLinMap: () => LinMap<R>
}

export type FinGrpRepresentationLinearMap<R> = LinMap<R>

export interface FinGrpRepresentationHomSpace<
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
> extends IntertwinerSpace<R> {
  readonly naturalTransformations: ReadonlyArray<FinGrpRepresentationNatTrans<R, F, G>>
  readonly vectorSpace: VectorSpace<R>
  readonly zeroCoordinates: () => ReadonlyArray<R>
  readonly zeroMatrix: () => Matrix<R>
  readonly zeroLinearMap: () => FinGrpRepresentationLinearMap<R>
  readonly zeroNaturalTransformation: () => FinGrpRepresentationNatTrans<R, F, G>
  readonly addCoordinates: (
    left: ReadonlyArray<R>,
    right: ReadonlyArray<R>,
  ) => ReadonlyArray<R>
  readonly scaleCoordinates: (scalar: R, coords: ReadonlyArray<R>) => ReadonlyArray<R>
  readonly addMatrices: (left: Matrix<R>, right: Matrix<R>) => Matrix<R>
  readonly scaleMatrix: (scalar: R, matrix: Matrix<R>) => Matrix<R>
  readonly addLinearMaps: (
    left: FinGrpRepresentationLinearMap<R>,
    right: FinGrpRepresentationLinearMap<R>,
  ) => FinGrpRepresentationLinearMap<R>
  readonly scaleLinearMap: (
    scalar: R,
    linMap: FinGrpRepresentationLinearMap<R>,
  ) => FinGrpRepresentationLinearMap<R>
  readonly addNaturalTransformations: (
    left: FinGrpRepresentationNatTrans<R, F, G>,
    right: FinGrpRepresentationNatTrans<R, F, G>,
  ) => FinGrpRepresentationNatTrans<R, F, G>
  readonly scaleNaturalTransformation: (
    scalar: R,
    nat: FinGrpRepresentationNatTrans<R, F, G>,
  ) => FinGrpRepresentationNatTrans<R, F, G>
  readonly matrixFromCoordinates: (coefficients: ReadonlyArray<R>) => Matrix<R>
  readonly linearMapFromCoordinates: (
    coefficients: ReadonlyArray<R>,
  ) => FinGrpRepresentationLinearMap<R>
  readonly naturalTransformationFromCoordinates: (
    coefficients: ReadonlyArray<R>,
  ) => FinGrpRepresentationNatTrans<R, F, G>
  readonly naturalTransformationFromLinearMap: (
    linMap: FinGrpRepresentationLinearMap<R>,
  ) => FinGrpRepresentationNatTrans<R, F, G>
  readonly coordinatesFromMatrix: (matrix: Matrix<R>) => ReadonlyArray<R>
  readonly coordinatesFromNaturalTransformation: (
    nat: FinGrpRepresentationNatTrans<R, F, G>,
  ) => ReadonlyArray<R>
  readonly coordinatesFromLinearMap: (
    linMap: FinGrpRepresentationLinearMap<R>,
  ) => ReadonlyArray<R>
}

export interface FinGrpRepresentationEndomorphismAlgebra<
  R,
  F extends FinGrpRepresentationFunctor<R>,
> {
  readonly functor: F
  readonly homSpace: FinGrpRepresentationHomSpace<R, F, F>
  readonly basis: ReadonlyArray<FinGrpRepresentationNatTrans<R, F, F>>
  readonly dimension: number
  readonly identity: FinGrpRepresentationNatTrans<R, F, F>
  readonly identityCoordinates: ReadonlyArray<R>
  readonly composeNaturalTransformations: (
    left: FinGrpRepresentationNatTrans<R, F, F>,
    right: FinGrpRepresentationNatTrans<R, F, F>,
  ) => FinGrpRepresentationNatTrans<R, F, F>
  readonly composeMatrices: (left: Matrix<R>, right: Matrix<R>) => Matrix<R>
  readonly composeCoordinates: (
    left: ReadonlyArray<R>,
    right: ReadonlyArray<R>,
  ) => ReadonlyArray<R>
  readonly matrixFromCoordinates: (coefficients: ReadonlyArray<R>) => Matrix<R>
  readonly linearMapFromCoordinates: (
    coefficients: ReadonlyArray<R>,
  ) => FinGrpRepresentationLinearMap<R>
  readonly naturalTransformationFromCoordinates: (
    coefficients: ReadonlyArray<R>,
  ) => FinGrpRepresentationNatTrans<R, F, F>
  readonly naturalTransformationFromLinearMap: (
    linMap: FinGrpRepresentationLinearMap<R>,
  ) => FinGrpRepresentationNatTrans<R, F, F>
  readonly coordinatesFromMatrix: (matrix: Matrix<R>) => ReadonlyArray<R>
  readonly coordinatesFromNaturalTransformation: (
    nat: FinGrpRepresentationNatTrans<R, F, F>,
  ) => ReadonlyArray<R>
  readonly coordinatesFromLinearMap: (
    linMap: FinGrpRepresentationLinearMap<R>,
  ) => ReadonlyArray<R>
  readonly structureConstants: ReadonlyArray<ReadonlyArray<ReadonlyArray<R>>>
}

export const checkFinGrpRepresentationNatTransMatrix = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  matrix: Matrix<R>,
  options: FinGrpRepresentationNatTransMatrixOptions = {},
): FinGrpRepresentationNatTransMatrixReport<R> => {
  const failures: Array<FinGrpRepresentationNatTransMatrixFailure<R>> = []
  const checkedElements: GroupElement[] = []

  let canCheckNaturality = true

  if (source.group !== target.group) {
    failures.push({
      kind: "group-mismatch",
      sourceGroup: source.group,
      targetGroup: target.group,
    })
    canCheckNaturality = false
  }

  if (source.field !== target.field) {
    failures.push({ kind: "field-mismatch" })
    canCheckNaturality = false
  }

  const expectedRows = target.dimension
  const actualRows = matrix.length
  if (actualRows !== expectedRows) {
    failures.push({
      kind: "row-count",
      expectedRows,
      actualRows,
    })
    canCheckNaturality = false
  }

  const expectedColumns = source.dimension
  let columnMismatch = false
  for (const [rowIndex, row] of matrix.entries()) {
    const actualColumns = row?.length ?? 0
    if (actualColumns !== expectedColumns) {
      failures.push({
        kind: "column-count",
        rowIndex,
        expectedColumns,
        actualColumns,
      })
      columnMismatch = true
    }
  }

  if (columnMismatch) {
    canCheckNaturality = false
  }

  const { normalized: normalizedGenerators, invalid: invalidGenerators } = collectGeneratorsForCheck(
    source.group,
    options.generators,
  )

  for (const element of invalidGenerators) {
    failures.push({ kind: "invalid-generator", element })
  }

  const elementsToCheck =
    source.group.elems.length > 0 ? source.group.elems : normalizedGenerators

  if (canCheckNaturality && elementsToCheck.length > 0) {
    const multiply = matMul(source.field)
    const equal = eqMat(source.field)
    const matrixClone = cloneMatrix(matrix)

    for (const element of elementsToCheck) {
      const left = multiply(target.representation.mat(element) as R[][], matrixClone as R[][])
      const right = multiply(matrixClone as R[][], source.representation.mat(element) as R[][])
      checkedElements.push(element)
      if (!equal(left as R[][], right as R[][])) {
        failures.push({
          kind: "naturality",
          element,
          left: cloneMatrix(left) as Matrix<R>,
          right: cloneMatrix(right) as Matrix<R>,
        })
      }
    }
  }

  const firstRow = matrix[0] ?? []
  const matrixColumns = firstRow.length

  const details: string[] = [
    `Source dimension ${source.dimension}, target dimension ${target.dimension}, matrix shape ${actualRows}×${matrixColumns}.`,
    `Checked ${checkedElements.length} group element(s) for naturality.`,
  ]

  if (invalidGenerators.length > 0) {
    details.push(
      `Ignored ${invalidGenerators.length} invalid generator(s): ${invalidGenerators.join(", ")}.`,
    )
  }

  if (options.metadata) {
    details.push(...options.metadata)
  }

  return {
    holds: failures.length === 0,
    failures,
    checkedElements,
    invalidGenerators,
    details,
  }
}

const computeColumnBasis = <R>(
  field: Representation<GroupElement, R>["F"],
  resolver: RrefResolver,
  matrix: Matrix<R>,
): R[][] => {
  if (matrix.length === 0) return []
  const { pivots } = resolver.get(field)(matrix)
  if (pivots.length === 0) return []
  return pivots.map((pivot) =>
    matrix.map((row) => {
      const value = row[pivot]
      return value === undefined ? field.zero : value
    }),
  )
}

export const analyzeFinGrpRepresentationNatTrans = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  nat: FinGrpRepresentationNatTrans<R, F, G>,
  options: FinGrpRepresentationNatTransLinearAnalysisOptions = {},
): FinGrpRepresentationNatTransLinearAnalysis<R, F, G> => {
  const resolver = options.resolver ?? createRrefResolver()
  const field = nat.source.field
  const kernelBasis = nullspace(field, resolver)(nat.matrix)
  const imageBasis = computeColumnBasis(field, resolver, nat.matrix)
  const sourceDimension = nat.source.dimension
  const targetDimension = nat.target.dimension
  const rank = imageBasis.length
  const nullity = kernelBasis.length
  const cokernelDimension = Math.max(0, targetDimension - rank)

  return {
    source: nat.source,
    target: nat.target,
    field,
    matrix: nat.matrix,
    sourceDimension,
    targetDimension,
    kernelBasis,
    imageBasis,
    kernelDimension: nullity,
    imageDimension: rank,
    rank,
    nullity,
    cokernelDimension,
    isInjective: nullity === 0,
    isSurjective: cokernelDimension === 0,
    isIsomorphism:
      nullity === 0 && cokernelDimension === 0 && sourceDimension === targetDimension,
  }
}

export const makeFinGrpRepresentationNatTrans = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  matrix: Matrix<R>,
  options?: FinGrpNatTransOptions,
): FinGrpRepresentationNatTrans<R, F, G> => {
  ensureSharedGroup(source, target)
  ensureSharedField(source, target)

  const generatorList = normalizeGenerators(source.group, options?.generators)
  const rows = matrix.length
  if (rows !== target.dimension) {
    throw new Error(
      `makeFinGrpRepresentationNatTrans expected a matrix with ${target.dimension} rows, received ${rows}.`,
    )
  }

  const expectedCols = source.dimension
  for (const [index, row] of matrix.entries()) {
    if ((row?.length ?? 0) !== expectedCols) {
      throw new Error(
        `makeFinGrpRepresentationNatTrans: row ${index} has ${(row?.length ?? 0)} columns, expected ${expectedCols}.`,
      )
    }
  }

  const multiply = matMul(source.field)
  const equal = eqMat(source.field)
  const matrixClone = cloneMatrix(matrix)

  const elementsToCheck = source.group.elems.length > 0 ? source.group.elems : generatorList
  for (const element of elementsToCheck) {
    const imageTarget = target.representation.mat(element)
    const imageSource = source.representation.mat(element)
    const left = multiply(imageTarget as R[][], matrixClone as R[][])
    const right = multiply(matrixClone as R[][], imageSource as R[][])
    if (!equal(left as R[][], right as R[][])) {
      throw new Error(
        `makeFinGrpRepresentationNatTrans: matrix does not commute with the action of ${element}.`,
      )
    }
  }

  const stored = cloneMatrix(matrixClone)
  const domSpace: VectorSpace<R> = { F: source.field, dim: source.dimension }
  const codSpace: VectorSpace<R> = { F: target.field, dim: target.dimension }

  return {
    source,
    target,
    matrix: stored,
    component: (object: string) => {
      if (object !== source.group.name) {
        throw new Error(
          `makeFinGrpRepresentationNatTrans: natural transformation component requested for unknown object ${object}.`,
        )
      }
      return {
        matrix: cloneMatrix(stored),
        dom: source.target.object,
        cod: target.target.object,
      }
    },
    asLinMap: () => ({
      F: source.field,
      dom: domSpace,
      cod: codSpace,
      M: cloneMatrix(stored),
    }),
  }
}

export const makeFinGrpRepresentationNatTransFromLinMap = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  linMap: LinMap<R>,
  options?: FinGrpNatTransOptions,
): FinGrpRepresentationNatTrans<R, F, G> => {
  ensureLinearMapCompatibility(source, target, linMap)
  return makeFinGrpRepresentationNatTrans(source, target, linMap.M, options)
}

const toUnderlyingFunctor = <R>(
  functor: FinGrpRepresentationFunctor<R>,
): Functor<string, GroupElement, RepObj, RepMor<R>> => ({
  F0: (object: string) => functor.onObj(object),
  F1: (arrow: GroupElement) => functor.onMor(arrow),
})

const ensureUnderlyingFunctorCompatibility = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
>(
  functor: F,
  candidate: Functor<string, GroupElement, RepObj, RepMor<R>>,
  role: string,
  generators?: ReadonlyArray<GroupElement>,
): void => {
  const objectName = functor.group.name
  const expectedObject = functor.onObj(objectName)
  const actualObject = candidate.F0(objectName)
  if (actualObject !== expectedObject) {
    throw new Error(
      `${role}: natural transformation ${role} functor does not map ${objectName} to the expected representation object.`,
    )
  }

  const sample = generators ?? functor.group.elems
  for (const arrow of sample) {
    const expectedArrow = functor.onMor(arrow)
    const actualArrow = candidate.F1(arrow)
    if (!functor.target.equalMor(actualArrow, expectedArrow)) {
      throw new Error(
        `${role}: natural transformation ${role} functor does not match the supplied FinGrp representation on ${arrow}.`,
      )
    }
  }
}

const ensureNatTransComponentCompatibility = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  component: RepMor<R>,
): void => {
  if (component.dom.dim !== source.dimension) {
    throw new Error(
      "finGrpRepresentationNatTransFromNaturalTransformation: component domain dimension does not match source representation.",
    )
  }
  if (component.cod.dim !== target.dimension) {
    throw new Error(
      "finGrpRepresentationNatTransFromNaturalTransformation: component codomain dimension does not match target representation.",
    )
  }
}

export const finGrpRepresentationNatTransFromNaturalTransformation = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  natTrans: NaturalTransformation<string, GroupElement, RepObj, RepMor<R>>,
  options?: FinGrpNatTransOptions,
): FinGrpRepresentationNatTrans<R, F, G> => {
  ensureUnderlyingFunctorCompatibility(
    source,
    natTrans.source,
    "finGrpRepresentationNatTransFromNaturalTransformation (source)",
    options?.generators,
  )
  ensureUnderlyingFunctorCompatibility(
    target,
    natTrans.target,
    "finGrpRepresentationNatTransFromNaturalTransformation (target)",
    options?.generators,
  )

  const component = natTrans.component(source.group.name)
  ensureNatTransComponentCompatibility(source, target, component)
  return makeFinGrpRepresentationNatTrans(source, target, component.matrix, options)
}

export const finGrpRepresentationNatTransFromNaturalTransformationWithWitness = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  natTrans: NaturalTransformationWithWitness<string, GroupElement, RepObj, RepMor<R>>,
  options?: FinGrpRepresentationNatTransWitnessOptions,
): FinGrpRepresentationNatTransWithWitness<R, F, G> => {
  const upgraded = finGrpRepresentationNatTransFromNaturalTransformation(
    source,
    target,
    natTrans.transformation,
    options,
  )

  const metadata = [
    "Converted from generic natural-transformation witness.",
    ...(options?.metadata ?? []),
    ...(natTrans.metadata ?? []),
  ]

  const witness = finGrpRepresentationNatTransWitness(upgraded, {
    ...options,
    metadata,
  })

  return { natTrans: upgraded, witness }
}

export const finGrpRepresentationNatTransToNaturalTransformation = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  natTrans: FinGrpRepresentationNatTrans<R, F, G>,
): NaturalTransformation<string, GroupElement, RepObj, RepMor<R>> => ({
  source: toUnderlyingFunctor(natTrans.source),
  target: toUnderlyingFunctor(natTrans.target),
  component: (object) => natTrans.component(object),
})

export const finGrpRepresentationNatTransToNaturalTransformationWithWitness = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  natTrans: FinGrpRepresentationNatTrans<R, F, G>,
  options?: FinGrpRepresentationNatTransWitnessOptions,
): NaturalTransformationWithWitness<string, GroupElement, RepObj, RepMor<R>> => {
  const metadata = [
    "Converted FinGrp representation natural transformation into generic witness form.",
    ...(options?.metadata ?? []),
  ]

  return buildFinGrpRepresentationNatTransWitness(natTrans, {
    ...options,
    metadata,
  })
}

const buildFinGrpRepresentationNatTransWitness = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  natTrans: FinGrpRepresentationNatTrans<R, F, G>,
  options?: FinGrpRepresentationNatTransWitnessOptions,
): NaturalTransformationWithWitness<string, GroupElement, RepObj, RepMor<R>> => {
  const samples = makeFunctorSamples(natTrans.source.group, options?.generators)
  const metadata = [
    "FinGrp representation natural transformation witness checks commuting matrices on generators.",
    ...(options?.metadata ?? []),
  ]
  const functorWitnessOptions = options?.generators
    ? { generators: options.generators }
    : undefined
  const sourceWitness = makeFinGrpRepresentationFunctorWithWitness(
    natTrans.source,
    functorWitnessOptions,
  )
  const targetWitness = makeFinGrpRepresentationFunctorWithWitness(
    natTrans.target,
    functorWitnessOptions,
  )
  return constructNaturalTransformationWithWitness(
    sourceWitness,
    targetWitness,
    (object) => natTrans.component(object),
    {
      samples,
      equalMor: natTrans.target.target.equalMor,
      metadata,
    },
  )
}

export const finGrpRepresentationNatTransWitness = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  natTrans: FinGrpRepresentationNatTrans<R, F, G>,
  options?: FinGrpRepresentationNatTransWitnessOptions,
): NaturalTransformationWithWitness<string, GroupElement, RepObj, RepMor<R>> =>
  buildFinGrpRepresentationNatTransWitness(natTrans, options)

export const makeFinGrpRepresentationNatTransWithWitness = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  matrix: Matrix<R>,
  options?: FinGrpRepresentationNatTransWitnessOptions,
): FinGrpRepresentationNatTransWithWitness<R, F, G> => {
  const natTrans = makeFinGrpRepresentationNatTrans(source, target, matrix, options)
  const witness = buildFinGrpRepresentationNatTransWitness(natTrans, options)
  return { natTrans, witness }
}

const ensureComposableNatTrans = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
  H extends FinGrpRepresentationFunctor<R>,
>(
  left: FinGrpRepresentationNatTrans<R, G, H>,
  right: FinGrpRepresentationNatTrans<R, F, G>,
): void => {
  if (right.target !== left.source) {
    throw new Error(
      "composeFinGrpRepresentationNatTrans: target of the right-hand natural transformation must equal the source of the left-hand natural transformation.",
    )
  }

  ensureSharedGroup(right.source, right.target)
  ensureSharedGroup(left.source, left.target)
  ensureSharedGroup(right.source, left.target)

  ensureSharedField(right.source, right.target)
  ensureSharedField(left.source, left.target)
  ensureSharedField(right.source, left.target)
}

export const composeFinGrpRepresentationNatTrans = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
  H extends FinGrpRepresentationFunctor<R>,
>(
  left: FinGrpRepresentationNatTrans<R, G, H>,
  right: FinGrpRepresentationNatTrans<R, F, G>,
  options?: FinGrpNatTransOptions,
): FinGrpRepresentationNatTrans<R, F, H> => {
  ensureComposableNatTrans(left, right)

  const multiply = matMul(right.source.field)
  const product = multiply(left.matrix as R[][], right.matrix as R[][])
  const cloned = cloneMatrix(product as Matrix<R>)

  return makeFinGrpRepresentationNatTrans(right.source, left.target, cloned, options)
}

export const composeFinGrpRepresentationNatTransWithWitness = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
  H extends FinGrpRepresentationFunctor<R>,
>(
  left: FinGrpRepresentationNatTrans<R, G, H>,
  right: FinGrpRepresentationNatTrans<R, F, G>,
  options?: FinGrpRepresentationNatTransWitnessOptions,
): FinGrpRepresentationNatTransWithWitness<R, F, H> => {
  const natTrans = composeFinGrpRepresentationNatTrans(left, right, options)
  const witness = finGrpRepresentationNatTransWitness(natTrans, options)
  return { natTrans, witness }
}

export const makeFinGrpRepresentationNatIso = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  matrix: Matrix<R>,
  options?: FinGrpNatTransOptions,
): FinGrpRepresentationNatIso<R, F, G> => {
  const forward = makeFinGrpRepresentationNatTrans(source, target, matrix, options)

  if (source.dimension !== target.dimension) {
    throw new Error(
      "makeFinGrpRepresentationNatIso: natural isomorphisms require equal source and target dimensions.",
    )
  }

  const dimension = source.dimension
  if (dimension === 0) {
    const emptyMatrix: Matrix<R> = []
    const inverse = makeFinGrpRepresentationNatTrans(target, source, emptyMatrix, options)
    return { forward, inverse }
  }

  const field = source.field
  const multiply = matMul(field)
  const equal = eqMat(field)

  const inverseMatrix = invertSquareMatrix(field, forward.matrix)
  const identity = eye(field)(dimension)

  const leftProduct = multiply(forward.matrix as R[][], inverseMatrix as R[][])
  if (!equal(leftProduct as R[][], identity as R[][])) {
    throw new Error(
      "makeFinGrpRepresentationNatIso: supplied matrix is not invertible (forward ∘ inverse ≠ id).",
    )
  }

  const rightProduct = multiply(inverseMatrix as R[][], forward.matrix as R[][])
  if (!equal(rightProduct as R[][], identity as R[][])) {
    throw new Error(
      "makeFinGrpRepresentationNatIso: supplied matrix is not invertible (inverse ∘ forward ≠ id).",
    )
  }

  const inverse = makeFinGrpRepresentationNatTrans(target, source, inverseMatrix, options)
  return { forward, inverse }
}

export const finGrpRepresentationNatIsoWitness = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  iso: FinGrpRepresentationNatIso<R, F, G>,
  options?: FinGrpRepresentationNatIsoWitnessOptions,
): FinGrpRepresentationNatIsoWitness<R, F, G> => {
  const baseMetadata = [
    "FinGrp representation natural isomorphism witness validates forward and inverse components on generators.",
    ...(options?.metadata ?? []),
  ]

  const forwardWitness = finGrpRepresentationNatTransWitness(iso.forward, {
    ...(options?.generators ? { generators: options.generators } : {}),
    metadata: [
      ...baseMetadata,
      "Forward component of the natural isomorphism.",
      ...(options?.forwardMetadata ?? []),
    ],
  })

  const inverseWitness = finGrpRepresentationNatTransWitness(iso.inverse, {
    ...(options?.generators ? { generators: options.generators } : {}),
    metadata: [
      ...baseMetadata,
      "Inverse component of the natural isomorphism.",
      ...(options?.inverseMetadata ?? []),
    ],
  })

  return { forward: forwardWitness, inverse: inverseWitness }
}

export const makeFinGrpRepresentationNatIsoWithWitness = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  matrix: Matrix<R>,
  options?: FinGrpRepresentationNatIsoWitnessOptions,
): FinGrpRepresentationNatIsoWithWitness<R, F, G> => {
  const iso = makeFinGrpRepresentationNatIso(source, target, matrix, options)
  const witness = finGrpRepresentationNatIsoWitness(iso, options)
  return { iso, witness }
}

export const finGrpRepresentationHomSpace = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
  G extends FinGrpRepresentationFunctor<R>,
>(
  source: F,
  target: G,
  options?: FinGrpNatTransOptions,
): FinGrpRepresentationHomSpace<R, F, G> => {
  ensureSharedGroup(source, target)
  ensureSharedField(source, target)

  const generatorList = normalizeGenerators(source.group, options?.generators)
  const space = intertwinerSpace<GroupElement, R>(source.field)(
    source.representation,
    target.representation,
    generatorList,
  )

  const basis = space.basis.map((basisMatrix) => cloneMatrix(basisMatrix))
  if (space.dim !== basis.length) {
    throw new Error(
      "finGrpRepresentationHomSpace: internal inconsistency between reported dimension and basis length.",
    )
  }

  const domainSpace: VectorSpace<R> = { F: source.field, dim: source.dimension }
  const codomainSpace: VectorSpace<R> = { F: target.field, dim: target.dimension }

  const naturalTransformations: FinGrpRepresentationNatTrans<R, F, G>[] = []
  for (const basisMatrix of basis) {
    naturalTransformations.push(
      makeFinGrpRepresentationNatTrans(source, target, basisMatrix, { generators: generatorList }),
    )
  }

  const vectorSpace: VectorSpace<R> = {
    F: source.field,
    dim: basis.length,
    B: coordinateBasis(source.field, basis.length),
  }

  const zeroCoordinates = (): ReadonlyArray<R> =>
    Array.from({ length: basis.length }, () => source.field.zero)

  const assertMatrixShape = (matrix: Matrix<R>, context: string): void => {
    if (matrix.length !== target.dimension) {
      throw new Error(
        `${context}: matrix has ${matrix.length} rows, expected ${target.dimension}.`,
      )
    }
    for (const [rowIndex, row] of matrix.entries()) {
      if ((row?.length ?? 0) !== source.dimension) {
        throw new Error(
          `${context}: row ${rowIndex} has ${(row?.length ?? 0)} columns, expected ${source.dimension}.`,
        )
      }
    }
  }

  const addCoordinates = (
    left: ReadonlyArray<R>,
    right: ReadonlyArray<R>,
  ): ReadonlyArray<R> => {
    if (left.length !== basis.length || right.length !== basis.length) {
      throw new Error(
        `finGrpRepresentationHomSpace: coordinate vectors must have length ${basis.length}.`,
      )
    }

    const { add, zero } = source.field
    return left.map((value, index) => add(value ?? zero, right[index] ?? zero))
  }

  const scaleCoordinates = (scalar: R, coords: ReadonlyArray<R>): ReadonlyArray<R> => {
    if (coords.length !== basis.length) {
      throw new Error(
        `finGrpRepresentationHomSpace: coordinate vector must have length ${basis.length}.`,
      )
    }

    const { mul, zero } = source.field
    return coords.map((value) => mul(scalar, value ?? zero))
  }

  const addMatrices = (left: Matrix<R>, right: Matrix<R>): Matrix<R> => {
    assertMatrixShape(left, "finGrpRepresentationHomSpace")
    assertMatrixShape(right, "finGrpRepresentationHomSpace")

    const { add, zero } = source.field
    const result = zeroMatrix(source.field, target.dimension, source.dimension)

    for (let r = 0; r < target.dimension; r++) {
      const resultRow = result[r]
      if (!resultRow) continue
      for (let c = 0; c < source.dimension; c++) {
        const leftEntry = left[r]?.[c] ?? zero
        const rightEntry = right[r]?.[c] ?? zero
        resultRow[c] = add(leftEntry, rightEntry)
      }
    }

    return result
  }

  const scaleMatrix = (scalar: R, matrix: Matrix<R>): Matrix<R> => {
    assertMatrixShape(matrix, "finGrpRepresentationHomSpace")

    const { mul, zero } = source.field
    const result = zeroMatrix(source.field, target.dimension, source.dimension)

    for (let r = 0; r < target.dimension; r++) {
      const resultRow = result[r]
      if (!resultRow) continue
      for (let c = 0; c < source.dimension; c++) {
        const entry = matrix[r]?.[c] ?? zero
        resultRow[c] = mul(scalar, entry)
      }
    }

    return result
  }

  const ensureNaturalTransformationScope = (
    nat: FinGrpRepresentationNatTrans<R, F, G>,
    context: string,
  ): void => {
    if (nat.source !== source || nat.target !== target) {
      throw new Error(
        `${context}: natural transformation does not connect the requested functors.`,
      )
    }
  }

  const zeroMatrixValue = (): Matrix<R> => matrixFromCoordinates(zeroCoordinates())

  const zeroLinearMap = (): FinGrpRepresentationLinearMap<R> => ({
    F: source.field,
    dom: domainSpace,
    cod: codomainSpace,
    M: zeroMatrixValue(),
  })

  const zeroNaturalTransformation = (): FinGrpRepresentationNatTrans<R, F, G> =>
    makeFinGrpRepresentationNatTrans(source, target, zeroMatrixValue(), { generators: generatorList })

  const addLinearMaps = (
    left: FinGrpRepresentationLinearMap<R>,
    right: FinGrpRepresentationLinearMap<R>,
  ): FinGrpRepresentationLinearMap<R> => {
    ensureLinearMapCompatibility(source, target, left)
    ensureLinearMapCompatibility(source, target, right)

    return {
      F: source.field,
      dom: domainSpace,
      cod: codomainSpace,
      M: addMatrices(left.M, right.M),
    }
  }

  const scaleLinearMap = (
    scalar: R,
    linMap: FinGrpRepresentationLinearMap<R>,
  ): FinGrpRepresentationLinearMap<R> => {
    ensureLinearMapCompatibility(source, target, linMap)

    return {
      F: source.field,
      dom: domainSpace,
      cod: codomainSpace,
      M: scaleMatrix(scalar, linMap.M),
    }
  }

  const addNaturalTransformations = (
    left: FinGrpRepresentationNatTrans<R, F, G>,
    right: FinGrpRepresentationNatTrans<R, F, G>,
  ): FinGrpRepresentationNatTrans<R, F, G> => {
    ensureNaturalTransformationScope(left, "finGrpRepresentationHomSpace")
    ensureNaturalTransformationScope(right, "finGrpRepresentationHomSpace")
    const sum = addMatrices(left.matrix, right.matrix)
    return makeFinGrpRepresentationNatTrans(source, target, sum, { generators: generatorList })
  }

  const scaleNaturalTransformation = (
    scalar: R,
    nat: FinGrpRepresentationNatTrans<R, F, G>,
  ): FinGrpRepresentationNatTrans<R, F, G> => {
    ensureNaturalTransformationScope(nat, "finGrpRepresentationHomSpace")
    const scaled = scaleMatrix(scalar, nat.matrix)
    return makeFinGrpRepresentationNatTrans(source, target, scaled, { generators: generatorList })
  }

  const coefficientMatrix = buildCoefficientMatrix(
    source.field,
    basis,
    target.dimension,
    source.dimension,
  )

  const matrixFromCoordinates = (coefficients: ReadonlyArray<R>): Matrix<R> => {
    if (coefficients.length !== basis.length) {
      throw new Error(
        `finGrpRepresentationHomSpace: expected ${basis.length} coefficients, received ${coefficients.length}.`,
      )
    }
    if (basis.length === 0) {
      return zeroMatrix(source.field, target.dimension, source.dimension)
    }
    return linearCombination(source.field, basis, coefficients, target.dimension, source.dimension)
  }

  const coordinatesFromMatrix = (matrix: Matrix<R>): ReadonlyArray<R> => {
    assertMatrixShape(matrix, "finGrpRepresentationHomSpace")
    if (basis.length === 0) {
      if (!isZeroMatrix(source.field, matrix)) {
        throw new Error(
          "finGrpRepresentationHomSpace: non-zero matrix provided but Hom-space is zero-dimensional.",
        )
      }
      return []
    }
    const vector = flattenColumnMajor(source.field, matrix, target.dimension, source.dimension)
    const solution = solveLinear(source.field)(coefficientMatrix as R[][], vector)
    if (solution.length !== basis.length) {
      throw new Error(
        "finGrpRepresentationHomSpace: coordinate solver returned inconsistent dimension.",
      )
    }
    return solution
  }

  const naturalTransformationFromCoordinates = (
    coefficients: ReadonlyArray<R>,
  ): FinGrpRepresentationNatTrans<R, F, G> =>
    makeFinGrpRepresentationNatTrans(source, target, matrixFromCoordinates(coefficients), {
      generators: generatorList,
    })

  const coordinatesFromNaturalTransformation = (
    nat: FinGrpRepresentationNatTrans<R, F, G>,
  ): ReadonlyArray<R> => coordinatesFromMatrix(nat.matrix)

  const linearMapFromCoordinates = (
    coefficients: ReadonlyArray<R>,
  ): LinMap<R> => ({
    F: source.field,
    dom: domainSpace,
    cod: codomainSpace,
    M: matrixFromCoordinates(coefficients),
  })

  const naturalTransformationFromLinearMap = (
    linMap: LinMap<R>,
  ): FinGrpRepresentationNatTrans<R, F, G> =>
    makeFinGrpRepresentationNatTransFromLinMap(source, target, linMap, {
      generators: generatorList,
    })

  const coordinatesFromLinearMap = (linMap: LinMap<R>): ReadonlyArray<R> => {
    ensureLinearMapCompatibility(source, target, linMap)
    return coordinatesFromMatrix(linMap.M)
  }

  return {
    basis,
    dim: space.dim,
    naturalTransformations,
    vectorSpace,
    zeroCoordinates,
    zeroMatrix: zeroMatrixValue,
    zeroLinearMap,
    zeroNaturalTransformation,
    addCoordinates,
    scaleCoordinates,
    addMatrices,
    scaleMatrix,
    addLinearMaps,
    scaleLinearMap,
    addNaturalTransformations,
    scaleNaturalTransformation,
    matrixFromCoordinates,
    linearMapFromCoordinates,
    naturalTransformationFromCoordinates,
    naturalTransformationFromLinearMap,
    coordinatesFromMatrix,
    coordinatesFromNaturalTransformation,
    coordinatesFromLinearMap,
  }
}

export const makeFinGrpRepresentationEndomorphismAlgebra = <
  R,
  F extends FinGrpRepresentationFunctor<R>,
>(
  functor: F,
  options?: FinGrpNatTransOptions,
): FinGrpRepresentationEndomorphismAlgebra<R, F> => {
  const homSpace = finGrpRepresentationHomSpace<R, F, F>(
    functor,
    functor,
    options,
  )
  const multiply = matMul(functor.field)
  const identityMatrix = eye(functor.field)(functor.dimension)
  const identity = makeFinGrpRepresentationNatTrans(functor, functor, identityMatrix, options)
  const identityCoordinates = homSpace.coordinatesFromMatrix(identityMatrix)

  const composeMatrices = (left: Matrix<R>, right: Matrix<R>): Matrix<R> =>
    multiply(left as R[][], right as R[][])

  const composeNaturalTransformations = (
    left: FinGrpRepresentationNatTrans<R, F, F>,
    right: FinGrpRepresentationNatTrans<R, F, F>,
  ): FinGrpRepresentationNatTrans<R, F, F> => {
    if (
      left.source !== functor ||
      left.target !== functor ||
      right.source !== functor ||
      right.target !== functor
    ) {
      throw new Error(
        "makeFinGrpRepresentationEndomorphismAlgebra: attempted to compose natural transformations outside the endomorphism algebra.",
      )
    }
    const product = composeMatrices(left.matrix, right.matrix)
    return makeFinGrpRepresentationNatTrans(functor, functor, product, options)
  }

  const composeCoordinates = (
    left: ReadonlyArray<R>,
    right: ReadonlyArray<R>,
  ): ReadonlyArray<R> => {
    if (left.length !== homSpace.dim || right.length !== homSpace.dim) {
      throw new Error(
        `makeFinGrpRepresentationEndomorphismAlgebra: expected coordinate vectors of length ${homSpace.dim}.`,
      )
    }
    const leftMatrix = homSpace.matrixFromCoordinates(left)
    const rightMatrix = homSpace.matrixFromCoordinates(right)
    const product = composeMatrices(leftMatrix, rightMatrix)
    return homSpace.coordinatesFromMatrix(product)
  }

  const structureConstants: R[][][] = Array.from({ length: homSpace.dim }, () =>
    Array.from({ length: homSpace.dim }, () =>
      Array.from({ length: homSpace.dim }, () => functor.field.zero),
    ),
  )

  for (let i = 0; i < homSpace.dim; i++) {
    const left = homSpace.naturalTransformations[i]
    if (!left) continue
    for (let j = 0; j < homSpace.dim; j++) {
      const right = homSpace.naturalTransformations[j]
      if (!right) continue
      const product = composeMatrices(left.matrix, right.matrix)
      const coordinates = homSpace.coordinatesFromMatrix(product)
      const firstIndex = structureConstants[i]
      const secondIndex = firstIndex?.[j]
      if (!firstIndex || !secondIndex) continue
      for (let k = 0; k < coordinates.length; k++) {
        secondIndex[k] = coordinates[k] ?? functor.field.zero
      }
    }
  }

  return {
    functor,
    homSpace,
    basis: homSpace.naturalTransformations,
    dimension: homSpace.dim,
    identity,
    identityCoordinates,
    composeNaturalTransformations,
    composeMatrices,
    composeCoordinates,
    matrixFromCoordinates: homSpace.matrixFromCoordinates,
    linearMapFromCoordinates: homSpace.linearMapFromCoordinates,
    naturalTransformationFromCoordinates: homSpace.naturalTransformationFromCoordinates,
    naturalTransformationFromLinearMap: homSpace.naturalTransformationFromLinearMap,
    coordinatesFromMatrix: homSpace.coordinatesFromMatrix,
    coordinatesFromNaturalTransformation: homSpace.coordinatesFromNaturalTransformation,
    coordinatesFromLinearMap: homSpace.coordinatesFromLinearMap,
    structureConstants,
  }
}

export interface FinGrpRepresentationNatCategory<R>
  extends Category<
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>
    >,
    ArrowFamilies.HasDomCod<
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>
    > {
  readonly group: FinGrpObj
  readonly field: Representation<GroupElement, R>["F"]
  readonly ensureObject: (functor: FinGrpRepresentationFunctor<R>) => void
}

export const makeFinGrpRepresentationNatCategory = <R>(
  group: FinGrpObj,
  field: Representation<GroupElement, R>["F"],
): FinGrpRepresentationNatCategory<R> => {
  const eqMatrix = eqMat(field)
  const multiply = matMul(field)

  const ensureObject = (functor: FinGrpRepresentationFunctor<R>): void => {
    if (functor.group !== group) {
      throw new Error("FinGrp representation category: object uses a different group instance.")
    }
    if (functor.field !== field) {
      throw new Error("FinGrp representation category: object uses a different field instance.")
    }
  }

  return {
    group,
    field,
    ensureObject,
    id: <F extends FinGrpRepresentationFunctor<R>>(functor: F) => {
      ensureObject(functor)
      const identity = eye(field)(functor.dimension)
      return makeFinGrpRepresentationNatTrans(functor, functor, identity)
    },
    compose: (
      g: FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
      f: FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
    ) => {
      if (f.target !== g.source) {
        throw new Error("FinGrp representation category: attempted to compose mismatched natural transformations.")
      }
      ensureObject(f.source)
      ensureObject(g.target)
      const product = multiply(g.matrix as R[][], f.matrix as R[][])
      return makeFinGrpRepresentationNatTrans(f.source, g.target, product)
    },
    dom: (
      mor: FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
    ) => {
      ensureObject(mor.source)
      return mor.source
    },
    cod: (
      mor: FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
    ) => {
      ensureObject(mor.target)
      return mor.target
    },
    equalMor: (
      left: FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
      right: FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
    ) => eqMatrix(left.matrix as R[][], right.matrix as R[][]),
  }
}

export const checkFinGrpRepresentationNatCategoryLaws = <R>(
  category: FinGrpRepresentationNatCategory<R>,
  options: FinGrpRepresentationNatCategoryLawOptions<R> = {},
): FinGrpRepresentationNatCategoryLawReport<R> => {
  const baseObjects = new Set<FinGrpRepresentationFunctor<R>>(options.objects ?? [])
  for (const arrow of options.arrows ?? []) {
    baseObjects.add(category.dom(arrow))
    baseObjects.add(category.cod(arrow))
  }

  if (baseObjects.size === 0) {
    throw new Error(
      "checkFinGrpRepresentationNatCategoryLaws: at least one functor sample is required to verify the laws.",
    )
  }

  const samples = makeNatCategoryFunctorSamples(category, {
    ...options,
    objects: Array.from(baseObjects),
  })

  const identityFailures: Array<FinGrpRepresentationNatCategoryIdentityFailure<R>> = []
  const compositionFailures: Array<FinGrpRepresentationNatCategoryCompositionFailure<R>> = []
  const associativityFailures: Array<FinGrpRepresentationNatCategoryAssociativityFailure<R>> = []
  const eqMatrix = eqMat(category.field)
  const multiply = matMul(category.field)

  const arrows = samples.arrows ?? []
  const objects = samples.objects ?? []
  for (const object of objects) {
    const identity = category.id(object)
    const dom = category.dom(identity)
    const cod = category.cod(identity)
    if (dom !== object || cod !== object) {
      identityFailures.push({
        object,
        arrow: identity,
        side: "left",
        composite: identity,
        reason: "Identity arrow does not have the expected endpoints.",
      })
      continue
    }

    for (const arrow of arrows) {
      if (category.dom(arrow) === object) {
        const composite = category.compose(arrow, identity)
        if (!eqMatrix(composite.matrix as R[][], arrow.matrix as R[][])) {
          identityFailures.push({
            object,
            arrow,
            side: "right",
            composite,
            reason: "Post-composition with the identity did not leave the arrow unchanged.",
          })
        }
      }
      if (category.cod(arrow) === object) {
        const composite = category.compose(identity, arrow)
        if (!eqMatrix(composite.matrix as R[][], arrow.matrix as R[][])) {
          identityFailures.push({
            object,
            arrow,
            side: "left",
            composite,
            reason: "Pre-composition with the identity did not leave the arrow unchanged.",
          })
        }
      }
    }
  }

  const composablePairs = samples.composablePairs ?? []
  for (const pair of composablePairs) {
    const { f, g } = pair
    const composite = category.compose(g, f)
    const expectedMatrix = multiply(g.matrix as R[][], f.matrix as R[][])
    if (!eqMatrix(composite.matrix as R[][], expectedMatrix as R[][])) {
      compositionFailures.push({
        pair,
        composite,
        reason: "Composition matrix does not match the expected product.",
      })
    }
    if (category.dom(composite) !== category.dom(f) || category.cod(composite) !== category.cod(g)) {
      compositionFailures.push({
        pair,
        composite,
        reason: "Composite arrow has unexpected endpoints.",
      })
    }
  }
  let associativityChecks = 0
  for (const f of arrows) {
    for (const g of arrows) {
      if (category.cod(f) !== category.dom(g)) continue
      for (const h of arrows) {
        if (category.cod(g) !== category.dom(h)) continue
        associativityChecks += 1
        const leftComposite = category.compose(h, category.compose(g, f))
        const rightComposite = category.compose(category.compose(h, g), f)
        if (!eqMatrix(leftComposite.matrix as R[][], rightComposite.matrix as R[][])) {
          associativityFailures.push({
            triple: { f, g, h },
            leftComposite,
            rightComposite,
            reason: "Associativity failed on the supplied triple.",
          })
        }
      }
    }
  }

  const details: string[] = [
    `Checked ${objects.length} objects for identity laws in the FinGrp representation natural-transformation category.`,
    `Checked ${composablePairs.length} composable pairs for matrix compatibility.`,
    `Checked ${associativityChecks} composable triples for associativity.`,
    ...(options.metadata ?? []),
  ]

  const holds =
    identityFailures.length === 0 && compositionFailures.length === 0 && associativityFailures.length === 0

  return {
    identityFailures,
    compositionFailures,
    associativityFailures,
    holds,
    details,
  }
}

const makeNatCategoryFunctorSamples = <R>(
  category: FinGrpRepresentationNatCategory<R>,
  options: FinGrpNatCategorySampleOptions<R>,
): FunctorCheckSamples<
  FinGrpRepresentationFunctor<R>,
  FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>
> => {
  const objectSet = new Set<FinGrpRepresentationFunctor<R>>()
  const objects: FinGrpRepresentationFunctor<R>[] = []

  const ensureObject = (object: FinGrpRepresentationFunctor<R>): void => {
    category.ensureObject(object)
    if (!objectSet.has(object)) {
      objectSet.add(object)
      objects.push(object)
    }
  }

  for (const object of options.objects ?? []) {
    ensureObject(object)
  }

  const arrows: Array<
    FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >
  > = []

  const addArrow = (
    arrow: FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >,
  ): void => {
    ensureObject(category.dom(arrow))
    ensureObject(category.cod(arrow))
    arrows.push(arrow)
  }

  for (const arrow of options.arrows ?? []) {
    addArrow(arrow)
  }

  if (objects.length === 0) {
    throw new Error(
      "makeNatCategoryFunctorSamples: at least one object sample is required to build a functor witness.",
    )
  }

  for (const object of objects) {
    addArrow(category.id(object))
  }

  const composablePairs: Array<{
    readonly f: FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >
    readonly g: FinGrpRepresentationNatTrans<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >
  }> = []

  for (const f of arrows) {
    for (const g of arrows) {
      if (category.cod(f) === category.dom(g)) {
        composablePairs.push({ f, g })
      }
    }
  }

  return {
    objects,
    arrows,
    composablePairs,
  }
}

export interface FinGrpRepresentationHomFunctorOptions extends FinGrpNatTransOptions {}

export interface FinGrpRepresentationHomIntoFunctor<R>
  extends CatFunctor<FinGrpRepresentationNatCategory<R>, VectorSpaceCategory<R>> {
  readonly group: FinGrpObj
  readonly field: Representation<GroupElement, R>["F"]
  readonly sourceRepresentation: FinGrpRepresentationFunctor<R>
  readonly homSpace: <G extends FinGrpRepresentationFunctor<R>>(
    target: G,
  ) => FinGrpRepresentationHomSpace<R, FinGrpRepresentationFunctor<R>, G>
  readonly options: FinGrpRepresentationHomFunctorOptions
}

export interface FinGrpRepresentationHomIntoFunctorWitnessOptions<R>
  extends FinGrpRepresentationHomFunctorOptions,
    FinGrpNatCategorySampleOptions<R> {
  readonly metadata?: ReadonlyArray<string>
}

export interface FinGrpRepresentationHomIntoFunctorWithWitness<R> {
  readonly functor: FinGrpRepresentationHomIntoFunctor<R>
  readonly witness: FunctorWithWitness<
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
    VectorSpace<R>,
    LinMap<R>
  >
}

export const makeFinGrpRepresentationHomIntoFunctor = <R>(
  source: FinGrpRepresentationFunctor<R>,
  options?: FinGrpRepresentationHomFunctorOptions,
): FinGrpRepresentationHomIntoFunctor<R> => {
  const natCategory = makeFinGrpRepresentationNatCategory<R>(source.group, source.field)
  const vectorCategory = makeVectorSpaceCategory(source.field)
  const generatorList = options?.generators
  const natOptions: FinGrpNatTransOptions | undefined =
    generatorList !== undefined ? { generators: generatorList } : undefined
  const multiply = matMul(source.field)
  const zero = source.field.zero

  const cache = new WeakMap<
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationHomSpace<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>
  >()

  const getHomSpace = <G extends FinGrpRepresentationFunctor<R>>(
    target: G,
  ): FinGrpRepresentationHomSpace<R, FinGrpRepresentationFunctor<R>, G> => {
    natCategory.ensureObject(target)
    const cached = cache.get(target)
    if (cached) {
      return cached as unknown as FinGrpRepresentationHomSpace<
        R,
        FinGrpRepresentationFunctor<R>,
        G
      >
    }
    const computed = finGrpRepresentationHomSpace<
      R,
      FinGrpRepresentationFunctor<R>,
      G
    >(source, target, natOptions)
    cache.set(
      target,
      computed as unknown as FinGrpRepresentationHomSpace<
        R,
        FinGrpRepresentationFunctor<R>,
        FinGrpRepresentationFunctor<R>
      >,
    )
    return computed as unknown as FinGrpRepresentationHomSpace<R, FinGrpRepresentationFunctor<R>, G>
  }

  return {
    source: natCategory,
    target: vectorCategory,
    onObj: (target) => getHomSpace(target).vectorSpace,
    onMor: (mor) => {
      const domainHom = getHomSpace(mor.source)
      const codomainHom = getHomSpace(mor.target)
      const rows = codomainHom.dim
      const cols = domainHom.dim
      const matrix: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => zero))

      for (let column = 0; column < cols; column++) {
        const basisNat = domainHom.naturalTransformations[column]
        if (!basisNat) continue
        const composed = multiply(mor.matrix as R[][], basisNat.matrix as R[][])
        const coordinates = codomainHom.coordinatesFromMatrix(composed)
        if (coordinates.length !== rows) {
          throw new Error(
            "makeFinGrpRepresentationHomIntoFunctor: coordinate dimension mismatch while post-composing.",
          )
        }
        for (let row = 0; row < rows; row++) {
          const rowValues = matrix[row]
          if (!rowValues) {
            throw new Error(
              "makeFinGrpRepresentationHomIntoFunctor: expected initialized row while writing post-composition coordinates.",
            )
          }
          const coordinate = coordinates[row]
          if (coordinate === undefined) {
            throw new Error(
              "makeFinGrpRepresentationHomIntoFunctor: missing coordinate after dimension check.",
            )
          }
          rowValues[column] = coordinate
        }
      }

      return {
        F: source.field,
        dom: domainHom.vectorSpace,
        cod: codomainHom.vectorSpace,
        M: matrix,
      }
    },
    group: source.group,
    field: source.field,
    sourceRepresentation: source,
    homSpace: getHomSpace,
    options: natOptions ?? {},
  }
}

export const finGrpRepresentationHomIntoFunctorWitness = <R>(
  functor: FinGrpRepresentationHomIntoFunctor<R>,
  options?: FinGrpRepresentationHomIntoFunctorWitnessOptions<R>,
): FunctorWithWitness<
  FinGrpRepresentationFunctor<R>,
  FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
  VectorSpace<R>,
  LinMap<R>
> => {
  const arrowSamples = options?.arrows ?? []
  const objectSamples: FinGrpRepresentationFunctor<R>[] = [
    functor.sourceRepresentation,
    ...(options?.objects ?? []),
  ]

  for (const arrow of arrowSamples) {
    objectSamples.push(arrow.source, arrow.target)
  }

  const samples = makeNatCategoryFunctorSamples(functor.source, {
    objects: objectSamples,
    arrows: arrowSamples,
  })

  const metadata = [
    "FinGrp representation Hom(source,-) functor witness validates post-composition coordinates.",
    ...(options?.metadata ?? []),
  ]

  return constructFunctorWithWitness(
    asSimpleCategory(functor.source),
    asSimpleCategory(functor.target),
    {
      F0: (object: FinGrpRepresentationFunctor<R>) => functor.onObj(object),
      F1: (
        arrow: FinGrpRepresentationNatTrans<
          R,
          FinGrpRepresentationFunctor<R>,
          FinGrpRepresentationFunctor<R>
        >,
      ) => functor.onMor(arrow),
    },
    samples,
    metadata,
  )
}

export const makeFinGrpRepresentationHomIntoFunctorWithWitness = <R>(
  source: FinGrpRepresentationFunctor<R>,
  options?: FinGrpRepresentationHomIntoFunctorWitnessOptions<R>,
): FinGrpRepresentationHomIntoFunctorWithWitness<R> => {
  const functor = makeFinGrpRepresentationHomIntoFunctor(
    source,
    options?.generators ? { generators: options.generators } : undefined,
  )
  const witness = finGrpRepresentationHomIntoFunctorWitness(functor, options)
  return { functor, witness }
}

export interface FinGrpRepresentationHomFromFunctorOptions extends FinGrpNatTransOptions {}

export interface FinGrpRepresentationHomFromFunctor<R>
  extends CatFunctor<FinGrpRepresentationNatCategory<R>, VectorSpaceCategory<R>> {
  readonly group: FinGrpObj
  readonly field: Representation<GroupElement, R>["F"]
  readonly targetRepresentation: FinGrpRepresentationFunctor<R>
  readonly homSpace: <F extends FinGrpRepresentationFunctor<R>>(
    source: F,
  ) => FinGrpRepresentationHomSpace<R, F, FinGrpRepresentationFunctor<R>>
  readonly options: FinGrpRepresentationHomFromFunctorOptions
}

export interface FinGrpRepresentationHomFromFunctorWitnessOptions<R>
  extends FinGrpRepresentationHomFromFunctorOptions,
    FinGrpNatCategorySampleOptions<R> {
  readonly metadata?: ReadonlyArray<string>
}

export interface FinGrpRepresentationHomFromFunctorWithWitness<R> {
  readonly functor: FinGrpRepresentationHomFromFunctor<R>
  readonly witness: FunctorWithWitness<
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
    VectorSpace<R>,
    LinMap<R>
  >
}

export const makeFinGrpRepresentationHomFromFunctor = <R>(
  target: FinGrpRepresentationFunctor<R>,
  options?: FinGrpRepresentationHomFromFunctorOptions,
): FinGrpRepresentationHomFromFunctor<R> => {
  const natCategory = makeFinGrpRepresentationNatCategory<R>(target.group, target.field)
  const vectorCategory = makeVectorSpaceCategory(target.field)
  const generatorList = options?.generators
  const natOptions: FinGrpNatTransOptions | undefined =
    generatorList !== undefined ? { generators: generatorList } : undefined
  const multiply = matMul(target.field)
  const zero = target.field.zero

  const cache = new WeakMap<
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationHomSpace<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>
  >()

  const getHomSpace = <F extends FinGrpRepresentationFunctor<R>>(
    source: F,
  ): FinGrpRepresentationHomSpace<R, F, FinGrpRepresentationFunctor<R>> => {
    natCategory.ensureObject(source)
    const cached = cache.get(source)
    if (cached) {
      return cached as unknown as FinGrpRepresentationHomSpace<
        R,
        F,
        FinGrpRepresentationFunctor<R>
      >
    }
    const computed = finGrpRepresentationHomSpace<
      R,
      F,
      FinGrpRepresentationFunctor<R>
    >(source, target, natOptions)
    cache.set(
      source,
      computed as unknown as FinGrpRepresentationHomSpace<
        R,
        FinGrpRepresentationFunctor<R>,
        FinGrpRepresentationFunctor<R>
      >,
    )
    return computed as unknown as FinGrpRepresentationHomSpace<R, F, FinGrpRepresentationFunctor<R>>
  }

  return {
    source: natCategory,
    target: vectorCategory,
    onObj: (source) => getHomSpace(source).vectorSpace,
    onMor: (mor) => {
      const domainHom = getHomSpace(mor.target)
      const codomainHom = getHomSpace(mor.source)
      const rows = codomainHom.dim
      const cols = domainHom.dim
      const matrix: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => zero))

      for (let column = 0; column < cols; column++) {
        const basisNat = domainHom.naturalTransformations[column]
        if (!basisNat) continue
        const composed = multiply(basisNat.matrix as R[][], mor.matrix as R[][])
        const coordinates = codomainHom.coordinatesFromMatrix(composed)
        if (coordinates.length !== rows) {
          throw new Error(
            "makeFinGrpRepresentationHomFromFunctor: coordinate dimension mismatch while pre-composing.",
          )
        }
        for (let row = 0; row < rows; row++) {
          const rowValues = matrix[row]
          if (!rowValues) {
            throw new Error(
              "makeFinGrpRepresentationHomFromFunctor: expected initialized row while writing pre-composition coordinates.",
            )
          }
          const coordinate = coordinates[row]
          if (coordinate === undefined) {
            throw new Error(
              "makeFinGrpRepresentationHomFromFunctor: missing coordinate after dimension check.",
            )
          }
          rowValues[column] = coordinate
        }
      }

      return {
        F: target.field,
        dom: domainHom.vectorSpace,
        cod: codomainHom.vectorSpace,
        M: matrix,
      }
    },
    group: target.group,
    field: target.field,
    targetRepresentation: target,
    homSpace: getHomSpace,
    options: natOptions ?? {},
  }
}

export const finGrpRepresentationHomFromFunctorWitness = <R>(
  functor: FinGrpRepresentationHomFromFunctor<R>,
  options?: FinGrpRepresentationHomFromFunctorWitnessOptions<R>,
): FunctorWithWitness<
  FinGrpRepresentationFunctor<R>,
  FinGrpRepresentationNatTrans<R, FinGrpRepresentationFunctor<R>, FinGrpRepresentationFunctor<R>>,
  VectorSpace<R>,
  LinMap<R>
> => {
  const arrowSamples = options?.arrows ?? []
  const objectSamples: FinGrpRepresentationFunctor<R>[] = [
    functor.targetRepresentation,
    ...(options?.objects ?? []),
  ]

  for (const arrow of arrowSamples) {
    objectSamples.push(arrow.source, arrow.target)
  }

  const samples = makeNatCategoryFunctorSamples(functor.source, {
    objects: objectSamples,
    arrows: arrowSamples,
  })

  const metadata = [
    "FinGrp representation Hom(-,target) functor witness validates precomposition coordinates.",
    ...(options?.metadata ?? []),
  ]

  return constructFunctorWithWitness(
    asSimpleCategory(functor.source),
    asSimpleCategory(functor.target),
    {
      F0: (object: FinGrpRepresentationFunctor<R>) => functor.onObj(object),
      F1: (
        arrow: FinGrpRepresentationNatTrans<
          R,
          FinGrpRepresentationFunctor<R>,
          FinGrpRepresentationFunctor<R>
        >,
      ) => functor.onMor(arrow),
    },
    samples,
    metadata,
  )
}

export const makeFinGrpRepresentationHomFromFunctorWithWitness = <R>(
  target: FinGrpRepresentationFunctor<R>,
  options?: FinGrpRepresentationHomFromFunctorWitnessOptions<R>,
): FinGrpRepresentationHomFromFunctorWithWitness<R> => {
  const functor = makeFinGrpRepresentationHomFromFunctor(
    target,
    options?.generators ? { generators: options.generators } : undefined,
  )
  const witness = finGrpRepresentationHomFromFunctorWitness(functor, options)
  return { functor, witness }
}

export type FinGrpRepresentationHomBifunctorObject<R> = readonly [
  FinGrpRepresentationFunctor<R>,
  FinGrpRepresentationFunctor<R>,
]

export interface FinGrpRepresentationHomBifunctorArrow<R> {
  readonly pre: FinGrpRepresentationNatTrans<
    R,
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationFunctor<R>
  >
  readonly post: FinGrpRepresentationNatTrans<
    R,
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationFunctor<R>
  >
}

const makeFinGrpRepresentationHomBifunctorDomain = <R>(
  category: FinGrpRepresentationNatCategory<R>,
): SimpleCat<
  FinGrpRepresentationHomBifunctorObject<R>,
  FinGrpRepresentationHomBifunctorArrow<R>
> => ({
  id: ([source, target]) => ({
    pre: category.id(source),
    post: category.id(target),
  }),
  compose: (g, f) => ({
    pre: category.compose(f.pre, g.pre),
    post: category.compose(g.post, f.post),
  }),
  src: (arrow) => [arrow.pre.target, arrow.post.source] as const,
  dst: (arrow) => [arrow.pre.source, arrow.post.target] as const,
})

export interface FinGrpRepresentationHomBifunctorOptions<R> extends FinGrpNatTransOptions {}

export interface FinGrpRepresentationHomBifunctor<R>
  extends CatFunctor<
    SimpleCat<
      FinGrpRepresentationHomBifunctorObject<R>,
      FinGrpRepresentationHomBifunctorArrow<R>
    >,
    VectorSpaceCategory<R>
  > {
  readonly group: FinGrpObj
  readonly field: Representation<GroupElement, R>["F"]
  readonly category: FinGrpRepresentationNatCategory<R>
  readonly vectorCategory: VectorSpaceCategory<R>
  readonly options: FinGrpRepresentationHomBifunctorOptions<R>
  readonly homSpace: (
    source: FinGrpRepresentationFunctor<R>,
    target: FinGrpRepresentationFunctor<R>,
  ) => FinGrpRepresentationHomSpace<
    R,
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationFunctor<R>
  >
}

const zeroMatrixWithDimensions = <R>(
  field: Representation<GroupElement, R>["F"],
  rows: number,
  cols: number,
): MutableMatrix<R> =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => field.zero))

export const makeFinGrpRepresentationHomBifunctor = <R>(
  category: FinGrpRepresentationNatCategory<R>,
  options?: FinGrpRepresentationHomBifunctorOptions<R>,
): FinGrpRepresentationHomBifunctor<R> => {
  const domain = makeFinGrpRepresentationHomBifunctorDomain(category)
  const vectorCategory = makeVectorSpaceCategory(category.field)
  const generatorList = options?.generators
  const natOptions: FinGrpNatTransOptions | undefined =
    generatorList !== undefined ? { generators: generatorList } : undefined
  const zero = category.field.zero

  const cache = new WeakMap<
    FinGrpRepresentationFunctor<R>,
    WeakMap<
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationHomSpace<
        R,
        FinGrpRepresentationFunctor<R>,
        FinGrpRepresentationFunctor<R>
      >
    >
  >()

  const getHomSpace = (
    source: FinGrpRepresentationFunctor<R>,
    target: FinGrpRepresentationFunctor<R>,
  ): FinGrpRepresentationHomSpace<
    R,
    FinGrpRepresentationFunctor<R>,
    FinGrpRepresentationFunctor<R>
  > => {
    category.ensureObject(source)
    category.ensureObject(target)

    let targetCache = cache.get(source)
    if (!targetCache) {
      targetCache = new WeakMap()
      cache.set(source, targetCache)
    }

    const cached = targetCache.get(target)
    if (cached) {
      return cached
    }

    const computed = finGrpRepresentationHomSpace<
      R,
      FinGrpRepresentationFunctor<R>,
      FinGrpRepresentationFunctor<R>
    >(source, target, natOptions)
    targetCache.set(target, computed)
    return computed
  }

  const normalizedOptions: FinGrpRepresentationHomBifunctorOptions<R> =
    natOptions ?? {}

  return {
    source: domain,
    target: vectorCategory,
    onObj: (pair) => {
      const [sourceFunctor, targetFunctor] = pair
      return getHomSpace(sourceFunctor, targetFunctor).vectorSpace
    },
    onMor: (arrow) => {
      const [sourceFunctor, targetFunctor] = domain.src(arrow)
      const [destSource, destTarget] = domain.dst(arrow)
      const domainHom = getHomSpace(sourceFunctor, targetFunctor)
      const codomainHom = getHomSpace(destSource, destTarget)

      const rows = codomainHom.dim
      const cols = domainHom.dim
      const matrix = zeroMatrixWithDimensions(category.field, rows, cols)

      for (let column = 0; column < cols; column++) {
        const basisNat = domainHom.naturalTransformations[column]
        if (!basisNat) continue
        const precomposed = category.compose(basisNat, arrow.pre)
        const transported = category.compose(arrow.post, precomposed)
        const coordinates = codomainHom.coordinatesFromNaturalTransformation(transported)
        if (coordinates.length !== rows) {
          throw new Error(
            "makeFinGrpRepresentationHomBifunctor: coordinate dimension mismatch while transporting intertwiners.",
          )
        }
        for (let row = 0; row < rows; row++) {
          const rowValues = matrix[row]
          if (!rowValues) {
            throw new Error(
              "makeFinGrpRepresentationHomBifunctor: expected initialized row while transporting intertwiners.",
            )
          }
          const coordinate = coordinates[row] ?? zero
          rowValues[column] = coordinate
        }
      }

      return {
        F: category.field,
        dom: domainHom.vectorSpace,
        cod: codomainHom.vectorSpace,
        M: matrix,
      }
    },
    group: category.group,
    field: category.field,
    category,
    vectorCategory,
    options: normalizedOptions,
    homSpace: getHomSpace,
  }
}

export interface FinGrpRepresentationHomBifunctorWitnessOptions<R>
  extends FinGrpRepresentationHomBifunctorOptions<R> {
  readonly samples?: FunctorCheckSamples<
    FinGrpRepresentationHomBifunctorObject<R>,
    FinGrpRepresentationHomBifunctorArrow<R>
  >
  readonly metadata?: ReadonlyArray<string>
}

export interface FinGrpRepresentationHomBifunctorWithWitness<R> {
  readonly functor: FinGrpRepresentationHomBifunctor<R>
  readonly witness: FunctorWithWitness<
    FinGrpRepresentationHomBifunctorObject<R>,
    FinGrpRepresentationHomBifunctorArrow<R>,
    VectorSpace<R>,
    LinMap<R>
  >
}

export const finGrpRepresentationHomBifunctorWitness = <R>(
  functor: FinGrpRepresentationHomBifunctor<R>,
  options?: FinGrpRepresentationHomBifunctorWitnessOptions<R>,
): FunctorWithWitness<
  FinGrpRepresentationHomBifunctorObject<R>,
  FinGrpRepresentationHomBifunctorArrow<R>,
  VectorSpace<R>,
  LinMap<R>
> => {
  const metadata = [
    "FinGrp representation Hom(-,-) bifunctor witness validates simultaneous pre- and post-composition.",
    ...(options?.metadata ?? []),
  ]

  return constructFunctorWithWitness(
    functor.source,
    asSimpleCategory(functor.target),
    {
      F0: (object: FinGrpRepresentationHomBifunctorObject<R>) => functor.onObj(object),
      F1: (arrow: FinGrpRepresentationHomBifunctorArrow<R>) => functor.onMor(arrow),
    },
    options?.samples ?? {},
    metadata,
  )
}

export const makeFinGrpRepresentationHomBifunctorWithWitness = <R>(
  category: FinGrpRepresentationNatCategory<R>,
  options?: FinGrpRepresentationHomBifunctorWitnessOptions<R>,
): FinGrpRepresentationHomBifunctorWithWitness<R> => {
  const functor = makeFinGrpRepresentationHomBifunctor(
    category,
    options?.generators ? { generators: options.generators } : undefined,
  )
  const witness = finGrpRepresentationHomBifunctorWitness(functor, options)
  return { functor, witness }
}

/* ================================================================
   Irreducibility and semisimplicity oracles for finite-group reps
   ================================================================ */

const modularInverse = (characteristic: number, value: number): number => {
  if (!Number.isInteger(characteristic) || characteristic <= 1) {
    throw new Error(
      `modularInverse: expected prime characteristic ≥ 2 (received ${characteristic}).`,
    )
  }
  const modulus = characteristic
  let a = ((value % modulus) + modulus) % modulus
  if (a === 0) {
    throw new Error("modularInverse: zero has no multiplicative inverse in a field.")
  }

  let t = 0
  let newT = 1
  let r = modulus
  let newR = a

  while (newR !== 0) {
    const quotient = Math.trunc(r / newR)
    ;[t, newT] = [newT, t - quotient * newT]
    ;[r, newR] = [newR, r - quotient * newR]
  }

  if (r !== 1) {
    throw new Error(
      `modularInverse: element ${value} is not invertible modulo ${characteristic}.`,
    )
  }

  if (t < 0) {
    t += modulus
  }
  return t % modulus
}

const makeFiniteFieldAsField = (finite: FiniteGroupRepresentation["field"]): Field<number> => ({
  zero: finite.zero,
  one: finite.one,
  add: (left, right) => finite.add(left, right),
  mul: (left, right) => finite.mul(left, right),
  neg: (value) => finite.neg(value),
  sub: (left, right) => finite.sub(left, right),
  eq: (left, right) => finite.sub(left, right) === finite.zero,
  inv: (value) => modularInverse(finite.characteristic, value),
  div: (left, right) => finite.mul(left, modularInverse(finite.characteristic, right)),
})

const makeRepresentationFromFinite = (
  representation: FiniteGroupRepresentation,
  field: Field<number>,
): Representation<GroupElement, number> => ({
  F: field,
  dimV: representation.dim,
  mat: (element: GroupElement) =>
    representation.matrix(element).map((row) => row.slice()) as number[][],
})

const makeSubrepresentationFromWitness = (
  ambient: FiniteGroupRepresentation,
  witness: SubrepresentationWitness,
  kind: "sub" | "quotient",
): FiniteGroupRepresentation => {
  const dimension =
    kind === "sub" ? witness.subspace.context.dim : witness.complement.context.dim
  const matrices = kind === "sub" ? witness.restrictedMatrices : witness.quotientMatrices

  return {
    group: ambient.group,
    field: ambient.field,
    dim: dimension,
    label:
      ambient.label !== undefined
        ? `${ambient.label}_${kind}(${witness.subspace.indices.join(",")})`
        : `${kind}[${witness.subspace.indices.join(",")}]`,
    matrix: (element: GroupElement) => {
      const matrix = matrices[element]
      if (!matrix) {
        throw new Error(
          `makeSubrepresentationFromWitness: missing ${kind} matrix for element ${element}.`,
        )
      }
      return matrix
    },
  }
}

const applyMatrixToVector = <R>(
  field: Field<R>,
  matrix: ReadonlyArray<ReadonlyArray<R>>,
  vector: ReadonlyArray<R>,
): R[] => {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  if (vector.length !== cols) {
    throw new Error(
      `applyMatrixToVector: expected vector of length ${cols}, received ${vector.length}.`,
    )
  }
  const result: R[] = Array.from({ length: rows }, () => field.zero)
  for (let i = 0; i < rows; i += 1) {
    let sum = field.zero
    for (let j = 0; j < cols; j += 1) {
      const coefficient = matrix[i]?.[j]
      const entry = vector[j]
      if (coefficient === undefined || entry === undefined) continue
      sum = field.add(sum, field.mul(coefficient, entry))
    }
    result[i] = sum
  }
  return result
}

const makeBlockDiagonalMatrix = (
  field: FiniteGroupRepresentation["field"],
  matrices: ReadonlyArray<Matrix<number>>,
): Matrix<number> => {
  const totalRows = matrices.reduce((rows, matrix) => rows + matrix.length, 0)
  const totalCols = matrices.reduce(
    (cols, matrix) => cols + (matrix[0]?.length ?? 0),
    0,
  )
  const result: MutableMatrix<number> = Array.from({ length: totalRows }, () =>
    Array.from({ length: totalCols }, () => field.zero),
  )

  let rowOffset = 0
  let columnOffset = 0
  for (const matrix of matrices) {
    for (let row = 0; row < matrix.length; row += 1) {
      const entries = matrix[row]
      const resultRow = result[rowOffset + row]
      if (!entries || !resultRow) continue
      for (let column = 0; column < entries.length; column += 1) {
        const value = entries[column]
        if (value === undefined) continue
        resultRow[columnOffset + column] = value
      }
    }
    rowOffset += matrix.length
    columnOffset += matrix[0]?.length ?? 0
  }

  return result
}

export interface FinGrpRepresentationIrreducibilityOptions {
  readonly generators?: ReadonlyArray<GroupElement>
  readonly search?: SubrepresentationSearchOptions
}

export type FinGrpRepresentationIrreducibilityWitness =
  | {
      readonly kind: "irreducible"
      readonly checkedSubspaces: number
      readonly invariantsDimension: number
      readonly invariantBasis: ReadonlyArray<ReadonlyArray<number>>
      readonly generators: ReadonlyArray<GroupElement>
    }
  | {
      readonly kind: "coordinate-subrepresentation"
      readonly witness: SubrepresentationWitness
    }
  | {
      readonly kind: "invariant"
      readonly basisVector: ReadonlyArray<number>
      readonly invariantsDimension: number
      readonly generators: ReadonlyArray<GroupElement>
      readonly images: Readonly<Record<GroupElement, ReadonlyArray<number>>>
    }

export interface FinGrpRepresentationIrreducibilityReport {
  readonly holds: boolean
  readonly witness: FinGrpRepresentationIrreducibilityWitness
  readonly details: ReadonlyArray<string>
}

export const checkFinGrpRepresentationIrreducible = (
  representation: FiniteGroupRepresentation,
  options: FinGrpRepresentationIrreducibilityOptions = {},
): FinGrpRepresentationIrreducibilityReport => {
  if (representation.dim < 0) {
    throw new Error(
      `checkFinGrpRepresentationIrreducible: representation dimension must be non-negative (received ${representation.dim}).`,
    )
  }

  const generatorList = normalizeGeneratorsWithIdentity(
    representation.group,
    options.generators,
  )
  const field = makeFiniteFieldAsField(representation.field)
  const asRepresentation = makeRepresentationFromFinite(representation, field)
  const invariants = invariantSubspace<GroupElement, number>(field)(
    asRepresentation,
    generatorList,
  )

  if (
    representation.dim > 1 &&
    invariants.dim > 0 &&
    invariants.dim < representation.dim &&
    invariants.basis.length > 0
  ) {
    const basisVector = invariants.basis[0]!.slice()
    const images: Record<GroupElement, ReadonlyArray<number>> = {}
    generatorList.forEach((element) => {
      const matrix = representation.matrix(element)
      images[element] = applyMatrixToVector(field, matrix, basisVector)
    })
    return {
      holds: false,
      witness: {
        kind: "invariant",
        basisVector,
        invariantsDimension: invariants.dim,
        generators: generatorList,
        images,
      },
      details: [
        `Invariant subspace of dimension ${invariants.dim} detected for ${representation.label ?? "representation"}.`,
        "The supplied basis vector remains fixed under every generator, certifying reducibility.",
      ],
    }
  }

  const witnesses = enumerateCoordinateSubrepresentationWitnesses(
    representation,
    options.search,
  )
  if (witnesses.length > 0) {
    return {
      holds: false,
      witness: { kind: "coordinate-subrepresentation", witness: witnesses[0]! },
      details: [
        "A proper coordinate subrepresentation was located, so the representation is reducible.",
        `Checked ${witnesses.length} stable coordinate subspaces while searching for certificates.`,
      ],
    }
  }

  return {
    holds: true,
    witness: {
      kind: "irreducible",
      checkedSubspaces: witnesses.length,
      invariantsDimension: invariants.dim,
      invariantBasis: invariants.basis,
      generators: generatorList,
    },
    details: [
      "No proper coordinate subrepresentation was found and no non-trivial invariants were detected.",
      `Generators inspected: ${generatorList.join(", ")}.`,
    ],
  }
}

export interface FinGrpRepresentationSemisimplicityOptions
  extends FinGrpRepresentationIrreducibilityOptions {}

export interface FinGrpRepresentationSemisimplicityDecomposition {
  readonly witness: SubrepresentationWitness
  readonly inclusion: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly projection: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly quotientProjection: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly section: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly sectionCoordinates: ReadonlyArray<number>
}

export interface FinGrpRepresentationSemisimplicityNode {
  readonly representation: FiniteGroupRepresentation
  readonly functor: FinGrpRepresentationFunctor<number>
  readonly invariantsDimension: number
  readonly invariantBasis: ReadonlyArray<ReadonlyArray<number>>
  readonly generators: ReadonlyArray<GroupElement>
  readonly checkedSubrepresentations: number
  readonly decomposition?: FinGrpRepresentationSemisimplicityDecomposition
  readonly children: ReadonlyArray<FinGrpRepresentationSemisimplicityNode>
}

export type FinGrpRepresentationSemisimplicityFailureReason =
  | "no-subrepresentation"
  | "invariant-without-coordinate-witness"
  | "no-splitting"
  | "child-failure"

export interface FinGrpRepresentationSemisimplicityFailure {
  readonly reason: FinGrpRepresentationSemisimplicityFailureReason
  readonly node: FinGrpRepresentationSemisimplicityNode
  readonly witness?: SubrepresentationWitness
  readonly cause?: FinGrpRepresentationSemisimplicityFailure
}

export interface FinGrpRepresentationSemisimplicityReport {
  readonly holds: boolean
  readonly root: FinGrpRepresentationSemisimplicityNode
  readonly failure?: FinGrpRepresentationSemisimplicityFailure
  readonly checkedSubrepresentations: number
  readonly details: ReadonlyArray<string>
}

interface FinGrpRepresentationSemisimplicityOutcome {
  readonly holds: boolean
  readonly node: FinGrpRepresentationSemisimplicityNode
  readonly failure?: FinGrpRepresentationSemisimplicityFailure
  readonly checkedSubrepresentations: number
  readonly details: ReadonlyArray<string>
}

const findSplittingSection = (
  field: Field<number>,
  homSpace: FinGrpRepresentationHomSpace<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >,
  projection: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >,
): {
  readonly found: boolean
  readonly section?: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly coordinates?: ReadonlyArray<number>
  readonly details: ReadonlyArray<string>
} => {
  const quotientDim = projection.target.dimension
  if (quotientDim === 0) {
    return {
      found: true,
      section: homSpace.zeroNaturalTransformation(),
      coordinates: homSpace.zeroCoordinates(),
      details: ["Quotient dimension is zero; splitting is trivial."],
    }
  }

  const basis = homSpace.naturalTransformations
  if (basis.length === 0) {
    return {
      found: false,
      details: [
        "Hom(Q,V) has dimension 0, so no section can be constructed that splits the quotient.",
      ],
    }
  }

  const multiply = matMul(field)
  const identity = eye(field)(quotientDim)
  const eqMatrix = eqMat(field)

  const equations: number[][] = []
  const targets: number[] = []
  for (let row = 0; row < quotientDim; row += 1) {
    for (let col = 0; col < quotientDim; col += 1) {
      const coeffs = basis.map((nat) => {
        const product = multiply(projection.matrix as number[][], nat.matrix as number[][])
        return product[row]?.[col] ?? field.zero
      })
      equations.push(coeffs)
      targets.push(identity[row]?.[col] ?? field.zero)
    }
  }

  let coordinates: number[]
  try {
    coordinates = solveLinear(field)(equations, targets)
  } catch (error) {
    return {
      found: false,
      details: [
        `Failed to solve for a splitting section: ${(error as Error).message}.`,
      ],
    }
  }

  const section = homSpace.naturalTransformationFromCoordinates(coordinates)
  const verification = multiply(
    projection.matrix as number[][],
    section.matrix as number[][],
  )
  if (!eqMatrix(verification as number[][], identity as number[][])) {
    return {
      found: false,
      details: [
        "Candidate section does not split the quotient projection (projection ∘ section ≠ id).",
      ],
    }
  }

  return { found: true, section, coordinates, details: ["Found section splitting the quotient."] }
}

const analyzeSemisimplicityNode = (
  representation: FiniteGroupRepresentation,
  field: Field<number>,
  options: FinGrpRepresentationSemisimplicityOptions,
): FinGrpRepresentationSemisimplicityOutcome => {
  const generatorList = normalizeGeneratorsWithIdentity(
    representation.group,
    options.generators,
  )
  const asRepresentation = makeRepresentationFromFinite(representation, field)
  const functor = makeFinGrpRepresentationFunctor<number>(
    representation.group,
    asRepresentation,
  )
  const invariants = invariantSubspace<GroupElement, number>(field)(
    asRepresentation,
    generatorList,
  )
  const coordinateWitnesses = enumerateCoordinateSubrepresentationWitnesses(
    representation,
    options.search,
  )

  const baseDetails: string[] = [
    `${representation.label ?? "representation"}: dim = ${representation.dim}, invariants = ${invariants.dim}.`,
  ]

  if (representation.dim <= 1) {
    const node: FinGrpRepresentationSemisimplicityNode = {
      representation,
      functor,
      invariantsDimension: invariants.dim,
      invariantBasis: invariants.basis,
      generators: generatorList,
      checkedSubrepresentations: coordinateWitnesses.length,
      children: [],
    }
    return {
      holds: true,
      node,
      checkedSubrepresentations: coordinateWitnesses.length,
      details: baseDetails.concat(["Dimension ≤ 1 implies semisimplicity."]),
    }
  }

  if (coordinateWitnesses.length === 0) {
    const node: FinGrpRepresentationSemisimplicityNode = {
      representation,
      functor,
      invariantsDimension: invariants.dim,
      invariantBasis: invariants.basis,
      generators: generatorList,
      checkedSubrepresentations: 0,
      children: [],
    }
    if (invariants.dim > 0 && invariants.dim < representation.dim) {
      return {
        holds: false,
        node,
        failure: {
          reason: "invariant-without-coordinate-witness",
          node,
        },
        checkedSubrepresentations: 0,
        details: baseDetails.concat([
          "Non-trivial invariant vectors detected without a coordinate witness to certify splitting.",
        ]),
      }
    }
    return {
      holds: true,
      node,
      checkedSubrepresentations: 0,
      details: baseDetails.concat([
        "No proper coordinate subrepresentation found; treating the representation as irreducible.",
      ]),
    }
  }

  let lastAttemptFailure: FinGrpRepresentationSemisimplicityFailure | undefined
  const attemptDetails: string[] = []
  for (const witness of coordinateWitnesses) {
    attemptDetails.push(
      `Attempting split along coordinates [${witness.subspace.indices.join(",")}].`,
    )

    const subFinite = makeSubrepresentationFromWitness(representation, witness, "sub")
    const quotientFinite = makeSubrepresentationFromWitness(representation, witness, "quotient")
    const subFunctor = makeFinGrpRepresentationFunctor<number>(
      subFinite.group,
      makeRepresentationFromFinite(subFinite, field),
    )
    const quotientFunctor = makeFinGrpRepresentationFunctor<number>(
      quotientFinite.group,
      makeRepresentationFromFinite(quotientFinite, field),
    )

    const natOptions = { generators: generatorList }
    const inclusion = makeFinGrpRepresentationNatTrans(
      subFunctor,
      functor,
      witness.subspace.inclusionMatrix,
      natOptions,
    )
    const projection = makeFinGrpRepresentationNatTrans(
      functor,
      subFunctor,
      witness.subspace.projectionMatrix,
      natOptions,
    )
    const quotientProjection = makeFinGrpRepresentationNatTrans(
      functor,
      quotientFunctor,
      witness.complement.projectionMatrix,
      natOptions,
    )

    const homSpace = finGrpRepresentationHomSpace<
      number,
      FinGrpRepresentationFunctor<number>,
      FinGrpRepresentationFunctor<number>
    >(quotientFunctor, functor, natOptions)
    const splitting = findSplittingSection(field, homSpace, quotientProjection)
    attemptDetails.push(...splitting.details)
    if (!splitting.found || !splitting.section) {
      lastAttemptFailure = {
        reason: "no-splitting",
        node: {
          representation,
          functor,
          invariantsDimension: invariants.dim,
          invariantBasis: invariants.basis,
          generators: generatorList,
          checkedSubrepresentations: coordinateWitnesses.length,
          children: [],
        },
        witness,
      }
      continue
    }

    const identitySub = makeFinGrpRepresentationNatTrans(
      subFunctor,
      subFunctor,
      eye(field)(subFunctor.dimension),
      natOptions,
    )
    const identityQuotient = makeFinGrpRepresentationNatTrans(
      quotientFunctor,
      quotientFunctor,
      eye(field)(quotientFunctor.dimension),
      natOptions,
    )

    const leftComposite = composeFinGrpRepresentationNatTrans(projection, inclusion)
    const rightComposite = composeFinGrpRepresentationNatTrans(
      quotientProjection,
      splitting.section,
    )
    const eqMatrix = eqMat(field)
    if (!eqMatrix(leftComposite.matrix as number[][], identitySub.matrix as number[][])) {
      lastAttemptFailure = {
        reason: "no-splitting",
        node: {
          representation,
          functor,
          invariantsDimension: invariants.dim,
          invariantBasis: invariants.basis,
          generators: generatorList,
          checkedSubrepresentations: coordinateWitnesses.length,
          children: [],
        },
        witness,
      }
      attemptDetails.push("Projection ∘ inclusion failed to recover the subrepresentation identity.")
      continue
    }
    if (
      !eqMatrix(
        rightComposite.matrix as number[][],
        identityQuotient.matrix as number[][],
      )
    ) {
      lastAttemptFailure = {
        reason: "no-splitting",
        node: {
          representation,
          functor,
          invariantsDimension: invariants.dim,
          invariantBasis: invariants.basis,
          generators: generatorList,
          checkedSubrepresentations: coordinateWitnesses.length,
          children: [],
        },
        witness,
      }
      attemptDetails.push("Quotient projection ∘ section failed to be the identity.")
      continue
    }

    const subOutcome = analyzeSemisimplicityNode(subFinite, field, options)
    const quotientOutcome = analyzeSemisimplicityNode(quotientFinite, field, options)
    const totalChecked =
      coordinateWitnesses.length +
      subOutcome.checkedSubrepresentations +
      quotientOutcome.checkedSubrepresentations

    const node: FinGrpRepresentationSemisimplicityNode = {
      representation,
      functor,
      invariantsDimension: invariants.dim,
      invariantBasis: invariants.basis,
      generators: generatorList,
      checkedSubrepresentations: totalChecked,
      decomposition: {
        witness,
        inclusion,
        projection,
        quotientProjection,
        section: splitting.section,
        sectionCoordinates: splitting.coordinates ?? [],
      },
      children: [subOutcome.node, quotientOutcome.node],
    }

    const combinedDetails = baseDetails
      .concat(attemptDetails)
      .concat(subOutcome.details)
      .concat(quotientOutcome.details)

    if (!subOutcome.holds) {
      return {
        holds: false,
        node,
        failure: {
          reason: "child-failure",
          node,
          witness,
          cause:
            subOutcome.failure ?? {
              reason: "child-failure",
              node: subOutcome.node,
            },
        },
        checkedSubrepresentations: totalChecked,
        details: combinedDetails,
      }
    }
    if (!quotientOutcome.holds) {
      return {
        holds: false,
        node,
        failure: {
          reason: "child-failure",
          node,
          witness,
          cause:
            quotientOutcome.failure ?? {
              reason: "child-failure",
              node: quotientOutcome.node,
            },
        },
        checkedSubrepresentations: totalChecked,
        details: combinedDetails,
      }
    }

    return {
      holds: true,
      node,
      checkedSubrepresentations: totalChecked,
      details: combinedDetails.concat([
        "Constructed explicit splitting exhibiting the representation as a direct sum of sub and quotient constituents.",
      ]),
    }
  }

  const fallbackNode: FinGrpRepresentationSemisimplicityNode = {
    representation,
    functor,
    invariantsDimension: invariants.dim,
    invariantBasis: invariants.basis,
    generators: generatorList,
    checkedSubrepresentations: coordinateWitnesses.length,
    children: [],
  }

  return {
    holds: false,
    node: fallbackNode,
    failure:
      lastAttemptFailure ?? {
        reason: "no-subrepresentation",
        node: fallbackNode,
      },
    checkedSubrepresentations: coordinateWitnesses.length,
    details: baseDetails
      .concat(attemptDetails)
      .concat(["Unable to assemble a splitting that verifies semisimplicity."]),
  }
}

export const analyzeFinGrpRepresentationSemisimplicity = (
  representation: FiniteGroupRepresentation,
  options: FinGrpRepresentationSemisimplicityOptions = {},
): FinGrpRepresentationSemisimplicityReport => {
  const field = makeFiniteFieldAsField(representation.field)
  const outcome = analyzeSemisimplicityNode(representation, field, options)
  return {
    holds: outcome.holds,
    root: outcome.node,
    ...(outcome.failure !== undefined ? { failure: outcome.failure } : {}),
    checkedSubrepresentations: outcome.checkedSubrepresentations,
    details: outcome.details,
  }
}

export type FinGrpRepresentationSemisimplicityBranch = "sub" | "quotient"

interface FinGrpRepresentationSemisimplicityAccumulatedSummand {
  readonly node: FinGrpRepresentationSemisimplicityNode
  readonly path: ReadonlyArray<FinGrpRepresentationSemisimplicityBranch>
  readonly inclusion: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly projection: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
}

export interface FinGrpRepresentationSemisimplicitySummand
  extends FinGrpRepresentationSemisimplicityAccumulatedSummand {
  readonly irreducibility?: FinGrpRepresentationIrreducibilityReport
}

export interface FinGrpRepresentationSemisimplicitySummandsOptions {
  readonly generators?: ReadonlyArray<GroupElement>
  readonly includeIrreducibility?: boolean
  readonly irreducibilityOptions?: FinGrpRepresentationIrreducibilityOptions
}

export type FinGrpRepresentationSemisimplicitySummandsFailure =
  | {
      readonly kind: "summand-identity"
      readonly path: ReadonlyArray<FinGrpRepresentationSemisimplicityBranch>
      readonly expected: Matrix<number>
      readonly actual: Matrix<number>
    }
  | {
      readonly kind: "sum-identity"
      readonly expected: Matrix<number>
      readonly actual: Matrix<number>
    }

export interface FinGrpRepresentationSemisimplicitySummandsReport {
  readonly holds: boolean
  readonly root: FinGrpRepresentationSemisimplicityNode
  readonly summands: ReadonlyArray<FinGrpRepresentationSemisimplicitySummand>
  readonly contributions: ReadonlyArray<
    FinGrpRepresentationNatTrans<
      number,
      FinGrpRepresentationFunctor<number>,
      FinGrpRepresentationFunctor<number>
    >
  >
  readonly total: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly identity: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly failures: ReadonlyArray<FinGrpRepresentationSemisimplicitySummandsFailure>
  readonly details: ReadonlyArray<string>
}

const makeIdentityNatTrans = (
  functor: FinGrpRepresentationFunctor<number>,
  options?: FinGrpNatTransOptions,
): FinGrpRepresentationNatTrans<
  number,
  FinGrpRepresentationFunctor<number>,
  FinGrpRepresentationFunctor<number>
> => {
  const identityMatrix = eye(functor.field)(functor.dimension)
  return makeFinGrpRepresentationNatTrans(functor, functor, identityMatrix, options)
}

const accumulateSemisimplicitySummands = (
  node: FinGrpRepresentationSemisimplicityNode,
  toRoot: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >,
  fromRoot: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >,
  path: ReadonlyArray<FinGrpRepresentationSemisimplicityBranch>,
  generators: ReadonlyArray<GroupElement>,
  out: FinGrpRepresentationSemisimplicityAccumulatedSummand[],
): void => {
  const decomposition = node.decomposition
  if (!decomposition || node.children.length === 0) {
    out.push({ node, path, inclusion: toRoot, projection: fromRoot })
    return
  }

  if (node.children.length !== 2) {
    throw new Error(
      "accumulateSemisimplicitySummands: expected binary decomposition node with sub and quotient children.",
    )
  }

  const compositionOptions = generators.length > 0 ? { generators } : undefined
  const [subCandidate, quotientCandidate] = node.children
  if (subCandidate === undefined || quotientCandidate === undefined) {
    throw new Error(
      "accumulateSemisimplicitySummands: decomposition children must be defined when length is 2.",
    )
  }
  const { inclusion, projection, quotientProjection: projectionToQuotient, section } = decomposition
  const subNode = subCandidate
  const quotientNode = quotientCandidate

  const subInclusion = composeFinGrpRepresentationNatTrans(
    toRoot,
    inclusion,
    compositionOptions,
  )
  const subProjection = composeFinGrpRepresentationNatTrans(
    projection,
    fromRoot,
    compositionOptions,
  )

  accumulateSemisimplicitySummands(
    subNode,
    subInclusion,
    subProjection,
    path.concat("sub"),
    generators,
    out,
  )

  const quotientInclusion = composeFinGrpRepresentationNatTrans(
    toRoot,
    section,
    compositionOptions,
  )
  const quotientProjectionFromRoot = composeFinGrpRepresentationNatTrans(
    projectionToQuotient,
    fromRoot,
    compositionOptions,
  )

  accumulateSemisimplicitySummands(
    quotientNode,
    quotientInclusion,
    quotientProjectionFromRoot,
    path.concat("quotient"),
    generators,
    out,
  )
}

export const collectFinGrpRepresentationSemisimplicitySummands = (
  report: FinGrpRepresentationSemisimplicityReport,
  options: FinGrpRepresentationSemisimplicitySummandsOptions = {},
): FinGrpRepresentationSemisimplicitySummandsReport => {
  const { root } = report
  const rootFunctor = root.functor
  const generatorList = options.generators ?? root.generators
  const compositionOptions = generatorList.length > 0 ? { generators: generatorList } : undefined
  const identity = makeIdentityNatTrans(rootFunctor, compositionOptions)

  const accumulated: FinGrpRepresentationSemisimplicityAccumulatedSummand[] = []
  accumulateSemisimplicitySummands(
    root,
    identity,
    identity,
    [],
    generatorList,
    accumulated,
  )

  const summands: FinGrpRepresentationSemisimplicitySummand[] = accumulated.map((entry) => {
    if (options.includeIrreducibility === true) {
      const irreducibility = checkFinGrpRepresentationIrreducible(
        entry.node.representation,
        options.irreducibilityOptions ?? {},
      )
      return { ...entry, irreducibility }
    }
    return { ...entry }
  })

  const field = rootFunctor.field
  const eqAmbient = eqMat(field)
  const homSpace = finGrpRepresentationHomSpace<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >(rootFunctor, rootFunctor, compositionOptions)
  let totalCoordinates = homSpace.zeroCoordinates()
  const contributions: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >[] = []
  const failures: FinGrpRepresentationSemisimplicitySummandsFailure[] = []
  const details: string[] = []

  for (const summand of summands) {
    const pathLabel = summand.path.length === 0 ? "root" : summand.path.join("→")
    const label =
      summand.node.representation.label ?? `dim=${summand.node.representation.dim}`
    details.push(
      `Summand ${pathLabel} (${label}) has dimension ${summand.node.representation.dim}.`,
    )

    if (summand.irreducibility) {
      details.push(
        summand.irreducibility.holds
          ? `Summand ${pathLabel} certified irreducible.`
          : `Summand ${pathLabel} reducible via ${summand.irreducibility.witness.kind} witness.`,
      )
    }

    const projectionThenInclusion = composeFinGrpRepresentationNatTrans(
      summand.projection,
      summand.inclusion,
      compositionOptions,
    )
    const leafIdentity = makeIdentityNatTrans(summand.node.functor, compositionOptions)
    const eqLeaf = eqMat(summand.node.functor.field)
    if (
      !eqLeaf(
        projectionThenInclusion.matrix as number[][],
        leafIdentity.matrix as number[][],
      )
    ) {
      failures.push({
        kind: "summand-identity",
        path: summand.path,
        expected: leafIdentity.matrix,
        actual: projectionThenInclusion.matrix,
      })
    }

    const ambientContribution = composeFinGrpRepresentationNatTrans(
      summand.inclusion,
      summand.projection,
      compositionOptions,
    )
    contributions.push(ambientContribution)
    const coords = homSpace.coordinatesFromNaturalTransformation(ambientContribution)
    totalCoordinates = homSpace.addCoordinates(totalCoordinates, coords)
  }

  const total = homSpace.naturalTransformationFromCoordinates(totalCoordinates)
  if (!eqAmbient(total.matrix as number[][], identity.matrix as number[][])) {
    failures.push({ kind: "sum-identity", expected: identity.matrix, actual: total.matrix })
  }

  if (report.holds) {
    details.push("Semisimplicity analysis succeeded; all decompositions validated.")
  } else if (report.failure) {
    details.push(
      `Semisimplicity analysis reported failure: ${report.failure.reason}. Direct-sum verification limited to available decompositions.`,
    )
  }

  const holds = report.holds && failures.length === 0

  return {
    holds,
    root,
    summands,
    contributions,
    total,
    identity,
    failures,
    details,
  }
}

export interface FinGrpRepresentationIrreducibleSummand
  extends FinGrpRepresentationSemisimplicitySummand {
  readonly irreducibility: FinGrpRepresentationIrreducibilityReport
}

export interface FinGrpRepresentationIrreducibleSummandsOptions
  extends FinGrpRepresentationSemisimplicitySummandsOptions {
  readonly reuseSummandsReport?: FinGrpRepresentationSemisimplicitySummandsReport
}

export type FinGrpRepresentationIrreducibleSummandsFailure =
  | { readonly kind: "analysis-failure"; readonly failure?: FinGrpRepresentationSemisimplicityFailure }
  | {
      readonly kind: "summands-failure"
      readonly failures: ReadonlyArray<FinGrpRepresentationSemisimplicitySummandsFailure>
    }
  | { readonly kind: "no-summands" }
  | {
      readonly kind: "missing-irreducibility"
      readonly path: ReadonlyArray<FinGrpRepresentationSemisimplicityBranch>
    }
  | {
      readonly kind: "reducible-summand"
      readonly path: ReadonlyArray<FinGrpRepresentationSemisimplicityBranch>
      readonly report: FinGrpRepresentationIrreducibilityReport
    }

export interface FinGrpRepresentationIrreducibleSummandsReport {
  readonly holds: boolean
  readonly root: FinGrpRepresentationSemisimplicityNode
  readonly summands: ReadonlyArray<FinGrpRepresentationIrreducibleSummand>
  readonly summandsReport: FinGrpRepresentationSemisimplicitySummandsReport
  readonly failures: ReadonlyArray<FinGrpRepresentationIrreducibleSummandsFailure>
  readonly details: ReadonlyArray<string>
}

export const collectFinGrpRepresentationIrreducibleSummands = (
  report: FinGrpRepresentationSemisimplicityReport,
  options: FinGrpRepresentationIrreducibleSummandsOptions = {},
): FinGrpRepresentationIrreducibleSummandsReport => {
  const summandsOptions: FinGrpRepresentationSemisimplicitySummandsOptions = {
    ...(options.generators ? { generators: options.generators } : {}),
    ...(options.irreducibilityOptions
      ? { irreducibilityOptions: options.irreducibilityOptions }
      : {}),
    includeIrreducibility: true,
  }

  const summandsReport =
    options.reuseSummandsReport ??
    collectFinGrpRepresentationSemisimplicitySummands(report, summandsOptions)

  const irreducibleSummands: FinGrpRepresentationIrreducibleSummand[] = []
  const failures: FinGrpRepresentationIrreducibleSummandsFailure[] = []
  const details = [...summandsReport.details]

  if (!report.holds && report.failure) {
    failures.push({ kind: "analysis-failure", failure: report.failure })
    details.push(
      `Semisimplicity analysis reported failure: ${report.failure.reason}. Irreducible isolation may be incomplete.`,
    )
  }

  if (!summandsReport.holds && summandsReport.failures.length > 0) {
    failures.push({ kind: "summands-failure", failures: summandsReport.failures })
    details.push(
      "Semisimplicity summand verification reported failures; irreducible isolation will be conservative.",
    )
  }

  if (summandsReport.summands.length === 0) {
    failures.push({ kind: "no-summands" })
    details.push("No semisimplicity summands were available to inspect.")
  }

  for (const summand of summandsReport.summands) {
    const irreducibility = summand.irreducibility
    const pathLabel = summand.path.length === 0 ? "root" : summand.path.join("→")
    if (!irreducibility) {
      failures.push({ kind: "missing-irreducibility", path: summand.path })
      details.push(
        `Summand ${pathLabel} did not include an irreducibility report; skipping irreducible certification.`,
      )
      continue
    }

    if (!irreducibility.holds) {
      failures.push({ kind: "reducible-summand", path: summand.path, report: irreducibility })
      details.push(
        `Summand ${pathLabel} was reducible via ${irreducibility.witness.kind} witness; removing from irreducible list.`,
      )
      continue
    }

    irreducibleSummands.push({ ...summand, irreducibility })
  }

  if (irreducibleSummands.length > 0) {
    details.push(
      `Identified ${irreducibleSummands.length} irreducible summand${
        irreducibleSummands.length === 1 ? "" : "s"
      }.`,
    )
  }

  const holds = report.holds && summandsReport.holds && failures.length === 0

  return {
    holds,
    root: summandsReport.root,
    summands: irreducibleSummands,
    summandsReport,
    failures,
    details,
  }
}

export interface FinGrpRepresentationSemisimplicityDirectSumOptions
  extends FinGrpRepresentationSemisimplicitySummandsOptions {
  readonly label?: string
}

export type FinGrpRepresentationSemisimplicityDirectSumFailure =
  | {
      readonly kind: "analysis-failure"
      readonly failure?: FinGrpRepresentationSemisimplicityFailure
    }
  | {
      readonly kind: "summands-failure"
      readonly failures: ReadonlyArray<FinGrpRepresentationSemisimplicitySummandsFailure>
    }
  | { readonly kind: "no-summands" }
  | { readonly kind: "forward-construction"; readonly error: string }
  | { readonly kind: "backward-construction"; readonly error: string }
  | {
      readonly kind: "direct-sum-identity"
      readonly expected: Matrix<number>
      readonly actual: Matrix<number>
    }
  | {
      readonly kind: "ambient-identity"
      readonly expected: Matrix<number>
      readonly actual: Matrix<number>
    }

export interface FinGrpRepresentationSemisimplicityDirectSum {
  readonly representation: FiniteGroupRepresentation
  readonly functor: FinGrpRepresentationFunctor<number>
  readonly forward: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly backward: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly forwardThenBackward: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly backwardThenForward: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly identityDirectSum: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly identityAmbient: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  readonly generators: ReadonlyArray<GroupElement>
  readonly offsets: ReadonlyArray<number>
}

export interface FinGrpRepresentationSemisimplicityDirectSumReport {
  readonly holds: boolean
  readonly root: FinGrpRepresentationSemisimplicityNode
  readonly summands: FinGrpRepresentationSemisimplicitySummandsReport
  readonly directSum?: FinGrpRepresentationSemisimplicityDirectSum
  readonly failure?: FinGrpRepresentationSemisimplicityDirectSumFailure
  readonly details: ReadonlyArray<string>
}

const buildDirectSumRepresentation = (
  root: FinGrpRepresentationSemisimplicityNode,
  summands: ReadonlyArray<FinGrpRepresentationSemisimplicitySummand>,
  label?: string,
): FiniteGroupRepresentation => {
  const matricesByElement = new Map<
    GroupElement,
    ReadonlyArray<Matrix<number>>
  >()
  const totalDim = summands.reduce(
    (dimension, summand) => dimension + summand.node.representation.dim,
    0,
  )

  return {
    group: root.representation.group,
    field: root.representation.field,
    dim: totalDim,
    label:
      label ??
      (root.representation.label
        ? `${root.representation.label}_⊕`
        : "direct-sum"),
    matrix: (element: GroupElement) => {
      let matrices = matricesByElement.get(element)
      if (!matrices) {
        matrices = summands.map((summand) => summand.node.representation.matrix(element))
        matricesByElement.set(element, matrices)
      }
      return makeBlockDiagonalMatrix(root.representation.field, matrices)
    },
  }
}

const buildDirectSumMatrices = (
  root: FinGrpRepresentationSemisimplicityNode,
  summands: ReadonlyArray<FinGrpRepresentationSemisimplicitySummand>,
): {
  readonly forward: Matrix<number>
  readonly backward: Matrix<number>
  readonly offsets: number[]
} => {
  const ambientDim = root.representation.dim
  const totalDim = summands.reduce(
    (dimension, summand) => dimension + summand.node.representation.dim,
    0,
  )
  const forward: MutableMatrix<number> = Array.from({ length: ambientDim }, () =>
    Array.from({ length: totalDim }, () => root.representation.field.zero),
  )
  const backward: MutableMatrix<number> = Array.from({ length: totalDim }, () =>
    Array.from({ length: ambientDim }, () => root.representation.field.zero),
  )

  const offsets: number[] = []
  let columnOffset = 0
  let rowOffset = 0
  for (const summand of summands) {
    offsets.push(columnOffset)
    const inclusion = summand.inclusion.matrix
    const projection = summand.projection.matrix
    for (let row = 0; row < inclusion.length; row += 1) {
      const entries = inclusion[row]
      const resultRow = forward[row]
      if (!entries || !resultRow) continue
      for (let column = 0; column < entries.length; column += 1) {
        const value = entries[column]
        if (value === undefined) continue
        resultRow[columnOffset + column] = value
      }
    }
    for (let row = 0; row < projection.length; row += 1) {
      const entries = projection[row]
      const resultRow = backward[rowOffset + row]
      if (!entries || !resultRow) continue
      for (let column = 0; column < entries.length; column += 1) {
        const value = entries[column]
        if (value === undefined) continue
        resultRow[column] = value
      }
    }
    columnOffset += summand.node.representation.dim
    rowOffset += summand.node.representation.dim
  }
  offsets.push(columnOffset)

  return { forward, backward, offsets }
}

export const certifyFinGrpRepresentationSemisimplicity = (
  report: FinGrpRepresentationSemisimplicityReport,
  options: FinGrpRepresentationSemisimplicityDirectSumOptions = {},
): FinGrpRepresentationSemisimplicityDirectSumReport => {
  const summands = collectFinGrpRepresentationSemisimplicitySummands(report, options)
  const combinedDetails = report.details.concat(summands.details)

  if (!report.holds) {
    return {
      holds: false,
      root: report.root,
      summands,
      ...(report.failure
        ? { failure: { kind: "analysis-failure", failure: report.failure } }
        : {}),
      details: combinedDetails.concat([
        "Semisimplicity analysis reported failure; skipping direct-sum certification.",
      ]),
    }
  }

  if (!summands.holds) {
    return {
      holds: false,
      root: report.root,
      summands,
      failure: { kind: "summands-failure", failures: summands.failures },
      details: combinedDetails.concat([
        "Semisimplicity summand verification failed; skipping direct-sum certification.",
      ]),
    }
  }

  if (summands.summands.length === 0) {
    return {
      holds: false,
      root: report.root,
      summands,
      failure: { kind: "no-summands" },
      details: combinedDetails.concat([
        "Semisimplicity summand collection returned no constituents.",
      ]),
    }
  }

  const generatorList =
    options.generators && options.generators.length > 0
      ? options.generators
      : report.root.generators
  const compositionOptions =
    generatorList.length > 0 ? { generators: generatorList } : undefined

  const directSumRepresentation = buildDirectSumRepresentation(
    report.root,
    summands.summands,
    options.label,
  )
  const field = makeFiniteFieldAsField(report.root.representation.field)
  const directSumFunctor = makeFinGrpRepresentationFunctor<number>(
    report.root.representation.group,
    makeRepresentationFromFinite(directSumRepresentation, field),
  )

  const { forward, backward, offsets } = buildDirectSumMatrices(
    report.root,
    summands.summands,
  )

  let forwardNat: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  try {
    forwardNat = makeFinGrpRepresentationNatTrans(
      directSumFunctor,
      report.root.functor,
      forward,
      compositionOptions,
    )
  } catch (error) {
    return {
      holds: false,
      root: report.root,
      summands,
      failure: { kind: "forward-construction", error: (error as Error).message },
      details: combinedDetails.concat([
        `Failed to construct direct-sum inclusion: ${(error as Error).message}.`,
      ]),
    }
  }

  let backwardNat: FinGrpRepresentationNatTrans<
    number,
    FinGrpRepresentationFunctor<number>,
    FinGrpRepresentationFunctor<number>
  >
  try {
    backwardNat = makeFinGrpRepresentationNatTrans(
      report.root.functor,
      directSumFunctor,
      backward,
      compositionOptions,
    )
  } catch (error) {
    return {
      holds: false,
      root: report.root,
      summands,
      failure: { kind: "backward-construction", error: (error as Error).message },
      details: combinedDetails.concat([
        `Failed to construct direct-sum projection: ${(error as Error).message}.`,
      ]),
    }
  }

  const identityDirectSum = makeIdentityNatTrans(
    directSumFunctor,
    compositionOptions,
  )
  const forwardThenBackward = composeFinGrpRepresentationNatTrans(
    backwardNat,
    forwardNat,
    compositionOptions,
  )
  const backwardThenForward = composeFinGrpRepresentationNatTrans(
    forwardNat,
    backwardNat,
    compositionOptions,
  )

  const eqMatrix = eqMat(report.root.functor.field)
  if (
    !eqMatrix(
      forwardThenBackward.matrix as number[][],
      identityDirectSum.matrix as number[][],
    )
  ) {
    return {
      holds: false,
      root: report.root,
      summands,
      failure: {
        kind: "direct-sum-identity",
        expected: identityDirectSum.matrix,
        actual: forwardThenBackward.matrix,
      },
      details: combinedDetails.concat([
        "Direct-sum projection after inclusion did not yield the identity on the direct sum.",
      ]),
    }
  }

  if (
    !eqMatrix(
      backwardThenForward.matrix as number[][],
      summands.identity.matrix as number[][],
    )
  ) {
    return {
      holds: false,
      root: report.root,
      summands,
      failure: {
        kind: "ambient-identity",
        expected: summands.identity.matrix,
        actual: backwardThenForward.matrix,
      },
      details: combinedDetails.concat([
        "Inclusion after projection failed to recover the identity on the ambient representation.",
      ]),
    }
  }

  return {
    holds: true,
    root: report.root,
    summands,
    directSum: {
      representation: directSumRepresentation,
      functor: directSumFunctor,
      forward: forwardNat,
      backward: backwardNat,
      forwardThenBackward,
      backwardThenForward,
      identityDirectSum,
      identityAmbient: summands.identity,
      generators: generatorList,
      offsets,
    },
    details: combinedDetails.concat([
      [
        `Constructed a direct-sum representation of dimension ${directSumRepresentation.dim}.`,
        `Spanning ${summands.summands.length} summands.`,
      ].join(" "),
      "Verified the direct-sum inclusion/projection form a natural isomorphism with the ambient representation.",
    ]),
  }
}

