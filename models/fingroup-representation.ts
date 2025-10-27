import type { CatFunctor, FiniteCategory, Category } from "../stdlib/category"
import { eqStrict } from "../stdlib/eq"
import type { Representation } from "../stdlib/vect-view"
import { eye, matMul, eqMat } from "../src/all/semiring-linear"
import type { FinGrpObj } from "./fingroup-cat"
import { FinGrpProductsWithTuple } from "../src/all/triangulated"
import type { ArrowFamilies } from "../stdlib/arrow-families"

type GroupElement = string

interface FinGrpActionCategory extends FiniteCategory<string, GroupElement> {
  readonly group: FinGrpObj
}

interface RepObj {
  readonly dim: number
}

export interface RepMor<R> {
  readonly matrix: ReadonlyArray<ReadonlyArray<R>>
  readonly dom: RepObj
  readonly cod: RepObj
}

interface RepresentationCategory<R>
  extends Category<RepObj, RepMor<R>>, ArrowFamilies.HasDomCod<RepObj, RepMor<R>> {
  readonly equalMor: (left: RepMor<R>, right: RepMor<R>) => boolean
  readonly object: RepObj
}

export interface FinGrpRepresentationFunctor<R>
  extends CatFunctor<FinGrpActionCategory, RepresentationCategory<R>> {
  readonly group: FinGrpObj
  readonly field: Representation<GroupElement, R>["F"]
  readonly dimension: number
  readonly representation: Representation<GroupElement, R>
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

const cloneMatrix = <R>(matrix: ReadonlyArray<ReadonlyArray<R>>): R[][] =>
  matrix.map((row) => row.map((value) => value))

const blockDiagonal = <R>(
  field: Representation<GroupElement, R>["F"],
  blocks: ReadonlyArray<ReadonlyArray<ReadonlyArray<R>>>,
): R[][] => {
  const total = blocks.reduce((acc, block) => acc + (block.length ?? 0), 0)
  if (total === 0) return []

  const result: R[][] = Array.from({ length: total }, () =>
    Array.from({ length: total }, () => field.zero),
  )

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

export const makeFinGrpProductRepresentation = <R>(
  functors: ReadonlyArray<FinGrpRepresentationFunctor<R>>,
): FinGrpRepresentationFunctor<R> => {
  if (functors.length === 0) {
    throw new Error("makeFinGrpProductRepresentation: at least one component functor is required.")
  }

  const [first, ...rest] = functors
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

export const functorToFinGrpRepresentation = <R>(
  functor: FinGrpRepresentationFunctor<R>,
  options?: RepresentationRecoveryOptions,
): Representation<GroupElement, R> => {
  const { group, target, field, dimension } = functor
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
      const forward = functor.group.mul(element, generator)
      const backward = functor.group.mul(generator, element)
      if (!reachable.has(forward)) queue.push(forward)
      if (!reachable.has(backward)) queue.push(backward)
    }
  }

  if (reachable.size !== group.elems.length) {
    throw new Error(
      `functorToFinGrpRepresentation(${group.name}): provided generators do not span the entire group.`,
    )
  }

  const idImage = functor.onMor(group.e)
  if (!target.equalMor(idImage, target.id(functor.onObj(group.name)))) {
    throw new Error(`functorToFinGrpRepresentation(${group.name}): identity law violated.`)
  }

  const checkElement = (element: GroupElement): void => {
    const inverse = group.inv(element)
    const mor = functor.onMor(element)
    const invMor = functor.onMor(inverse)
    const identity = target.id(functor.onObj(group.name))
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
    const left = functor.onMor(group.mul(a, b))
    const right = compose(functor.onMor(a), functor.onMor(b))
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
    const matrix = functor.onMor(element).matrix
    if (matrix.length !== dimension) {
      throw new Error(
        `functorToFinGrpRepresentation(${group.name}): matrix for ${element} has inconsistent row count ${matrix.length}.`,
      )
    }
  }

  return {
    F: field,
    dimV: dimension,
    mat: (element: GroupElement): R[][] => cloneMatrix(functor.onMor(element).matrix),
  }
}

