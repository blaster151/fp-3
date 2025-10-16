import {
  analyzeInternalGroup,
  type CategoryOps,
  type InternalGroupAnalysis,
  type InternalGroupWitness,
  type TerminalWitness,
  enrichInternalGroupDiagonal,
} from './internal-group'
import {
  analyzeInternalMonoid,
  enrichInternalMonoidDiagonal,
  type InternalMonoidAnalysis,
  type InternalMonoidWitness,
} from './internal-monoid'
import type { BinaryProductTuple } from './category-limits-helpers'
import { FinGrp, FinGrpCat, type FinGrpObj, type Hom, type FinGrpProductWitness } from './models/fingroup-cat'

const toBinaryTuple = (
  witness: FinGrpProductWitness,
): BinaryProductTuple<FinGrpObj, Hom> => ({
  object: witness.object,
  projections: [witness.projection1, witness.projection2],
  tuple: (domain, legs) => {
    if (legs.length !== 2) {
      throw new Error(
        `makeFinGrpInternalGroupWitness: binary tuple expects 2 legs, received ${legs.length}`,
      )
    }
    const [left, right] = legs
    return witness.pair(domain, left, right)
  },
})

const makeCategoryOps = (objects: readonly FinGrpObj[]) => {
  const category = FinGrpCat(objects)
  const ops: CategoryOps<FinGrpObj, Hom> = {
    compose: category.compose,
    eq: category.eq,
    id: (object) => category.id(object.name),
  }
  return { category, ops }
}

const makeMultiplication = (group: FinGrpObj, product: FinGrpProductWitness): Hom => ({
  name: `mul_${group.name}`,
  dom: product.object.name,
  cod: group.name,
  map: (value) => {
    const [left, right] = product.decompose(value)
    return group.mul(left, right)
  },
})

const makeInverse = (group: FinGrpObj): Hom => ({
  name: `inv_${group.name}`,
  dom: group.name,
  cod: group.name,
  map: (value) => group.inv(value),
})

const makeUnit = (group: FinGrpObj, terminal: FinGrpObj): Hom => ({
  name: `e_${group.name}`,
  dom: terminal.name,
  cod: group.name,
  map: () => group.e,
})

const makeTerminate = (terminal: FinGrpObj): ((domain: FinGrpObj) => Hom) =>
  (domain) => ({
    name: `!_${domain.name}`,
    dom: domain.name,
    cod: terminal.name,
    map: () => terminal.e,
  })

export interface FinGrpInternalGroupWitness {
  readonly group: FinGrpObj
  readonly category: CategoryOps<FinGrpObj, Hom>
  readonly witness: InternalGroupWitness<FinGrpObj, Hom>
}

export const makeFinGrpInternalGroupWitness = (group: FinGrpObj): FinGrpInternalGroupWitness => {
  const product = FinGrp.product(group, group, { name: `${group.name}×${group.name}` })
  const productLeft = FinGrp.product(product.object, group, {
    name: `(${product.object.name})×${group.name}`,
  })
  const productRight = FinGrp.product(group, product.object, {
    name: `${group.name}×(${product.object.name})`,
  })

  const { category, ops } = makeCategoryOps([
    group,
    product.object,
    productLeft.object,
    productRight.object,
  ])

  const terminal = category.lookup('1')
  const unit: TerminalWitness<FinGrpObj, Hom> = {
    object: terminal,
    terminate: makeTerminate(terminal),
  }

  const witness: InternalGroupWitness<FinGrpObj, Hom> = {
    object: group,
    product: toBinaryTuple(product),
    multiplication: makeMultiplication(group, product),
    unit: {
      terminal: unit,
      arrow: makeUnit(group, terminal),
    },
    inverse: makeInverse(group),
    productLeft: toBinaryTuple(productLeft),
    productRight: toBinaryTuple(productRight),
    diagonal: enrichInternalGroupDiagonal(ops, toBinaryTuple(product), {
      object: group,
      identity: ops.id(group),
    }),
  }

  return { group, category: ops, witness }
}

export interface FinGrpInternalMonoidWitness {
  readonly monoid: FinGrpObj
  readonly category: CategoryOps<FinGrpObj, Hom>
  readonly witness: InternalMonoidWitness<FinGrpObj, Hom>
}

export const makeFinGrpInternalMonoidWitness = (group: FinGrpObj): FinGrpInternalMonoidWitness => {
  const product = FinGrp.product(group, group, { name: `${group.name}×${group.name}` })
  const productLeft = FinGrp.product(product.object, group, {
    name: `(${product.object.name})×${group.name}`,
  })
  const productRight = FinGrp.product(group, product.object, {
    name: `${group.name}×(${product.object.name})`,
  })

  const { category, ops } = makeCategoryOps([
    group,
    product.object,
    productLeft.object,
    productRight.object,
  ])

  const terminal = category.lookup('1')
  const unit: TerminalWitness<FinGrpObj, Hom> = {
    object: terminal,
    terminate: makeTerminate(terminal),
  }

  const witness: InternalMonoidWitness<FinGrpObj, Hom> = {
    object: group,
    product: toBinaryTuple(product),
    multiplication: makeMultiplication(group, product),
    unit: {
      terminal: unit,
      arrow: makeUnit(group, terminal),
    },
    productLeft: toBinaryTuple(productLeft),
    productRight: toBinaryTuple(productRight),
    diagonal: enrichInternalMonoidDiagonal(ops, toBinaryTuple(product), {
      object: group,
      identity: ops.id(group),
    }),
  }

  return { monoid: group, category: ops, witness }
}

type FinGrpInternalGroupAnalysisContext =
  InternalGroupAnalysis<FinGrpObj, Hom>['context'] & {
    readonly group: FinGrpObj
  }

export type FinGrpInternalGroupAnalysis = InternalGroupAnalysis<FinGrpObj, Hom> & {
  readonly context: FinGrpInternalGroupAnalysisContext
}

type FinGrpInternalMonoidAnalysisContext =
  InternalMonoidAnalysis<FinGrpObj, Hom>['context'] & {
    readonly monoid: FinGrpObj
  }

export type FinGrpInternalMonoidAnalysis = InternalMonoidAnalysis<FinGrpObj, Hom> & {
  readonly context: FinGrpInternalMonoidAnalysisContext
}

export const analyzeFinGrpInternalGroup = (
  input: FinGrpInternalGroupWitness,
): FinGrpInternalGroupAnalysis => {
  const analysis = analyzeInternalGroup(input)
  const { category, witness } = analysis.context
  const context: FinGrpInternalGroupAnalysisContext = {
    category,
    witness,
    group: input.group,
  }

  return { ...analysis, context }
}

export const analyzeFinGrpInternalMonoid = (
  input: FinGrpInternalMonoidWitness,
): FinGrpInternalMonoidAnalysis => {
  const analysis = analyzeInternalMonoid(input)
  const { category, witness } = analysis.context
  const context: FinGrpInternalMonoidAnalysisContext = {
    category,
    witness,
    monoid: input.monoid,
  }

  return { ...analysis, context }
}
