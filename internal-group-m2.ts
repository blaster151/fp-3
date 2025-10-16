import type { BinaryProductTuple } from './category-limits-helpers'
import {
  composeM2,
  equalM2Morphisms,
  makeM2Morphism,
  makeM2Object,
  productM2,
  type M2Morphism,
  type M2Object,
  type M2ProductWitness,
} from './m2-set'
import {
  analyzeInternalGroup,
  enrichInternalGroupDiagonal,
  type CategoryOps,
  type InternalGroupAnalysis,
  type InternalGroupCheckResult,
  type InternalGroupWitness,
  type TerminalWitness,
} from './internal-group'
import {
  analyzeInternalMonoid,
  enrichInternalMonoidDiagonal,
  type InternalMonoidAnalysis,
  type InternalMonoidCheckResult,
  type InternalMonoidWitness,
} from './internal-monoid'
import type { FinGrpObj } from './models/fingroup-cat'

const terminalLabel = '⋆'

const makeTerminal = (): TerminalWitness<M2Object<any>, M2Morphism<any, any>> => {
  const object = makeM2Object({
    carrier: [terminalLabel],
    endo: () => terminalLabel,
    eq: (left: unknown, right: unknown) => left === right,
  })

  return {
    object,
    terminate: (domain) =>
      makeM2Morphism({
        dom: domain,
        cod: object,
        map: () => terminalLabel,
      }),
  }
}

const toBinaryTuple = (
  witness: M2ProductWitness<any, any>,
): BinaryProductTuple<M2Object<any>, M2Morphism<any, any>> => ({
  object: witness.object,
  projections: witness.projections,
  tuple: (domain, legs) => {
    if (legs.length !== 2) {
      throw new Error(
        `makeM2BinaryTuple: expected 2 legs for a binary product, received ${legs.length}`,
      )
    }
    return witness.tuple(
      domain,
      legs as readonly [M2Morphism<any, any>, M2Morphism<any, any>],
    )
  },
})

const composeAny = (
  g: M2Morphism<any, any>,
  f: M2Morphism<any, any>,
): M2Morphism<any, any> => composeM2(g, f)

const identityAny = (object: M2Object<any>): M2Morphism<any, any> =>
  makeM2Morphism({
    dom: object,
    cod: object,
    map: (value) => value,
  })

const makeCategoryOps = (): CategoryOps<M2Object<any>, M2Morphism<any, any>> => ({
  compose: composeAny,
  eq: equalM2Morphisms,
  id: identityAny,
})

export interface M2InternalGroupInput {
  readonly group: FinGrpObj
  readonly endomorphism: (value: string) => string
  readonly equaliser?: (pair: readonly [string, string]) => boolean
}

export interface M2InternalGroupWitness {
  readonly object: M2Object<string>
  readonly category: CategoryOps<M2Object<any>, M2Morphism<any, any>>
  readonly witness: InternalGroupWitness<M2Object<any>, M2Morphism<any, any>>
}

export interface M2InternalGroupCompatibilityResult extends InternalGroupCheckResult {}

export interface M2InternalGroupAnalysis
  extends InternalGroupAnalysis<M2Object<any>, M2Morphism<any, any>> {
  readonly compatibility: M2InternalGroupCompatibilityResult
  readonly context: InternalGroupAnalysis<M2Object<any>, M2Morphism<any, any>>['context'] & {
    readonly group: FinGrpObj
    readonly endomorphism: (value: string) => string
    readonly eq: (left: string, right: string) => boolean
  }
}

export interface M2InternalGroupAnalysisInput {
  readonly witness: M2InternalGroupWitness
  readonly group: FinGrpObj
  readonly endomorphism: (value: string) => string
  readonly eq?: (left: string, right: string) => boolean
}

export interface M2InternalMonoidInput {
  readonly monoid: FinGrpObj
  readonly endomorphism: (value: string) => string
  readonly equaliser?: (pair: readonly [string, string]) => boolean
  readonly eq?: (left: string, right: string) => boolean
}

export interface M2InternalMonoidWitness {
  readonly object: M2Object<string>
  readonly category: CategoryOps<M2Object<any>, M2Morphism<any, any>>
  readonly witness: InternalMonoidWitness<M2Object<any>, M2Morphism<any, any>>
}

export interface M2InternalMonoidCompatibilityResult extends InternalMonoidCheckResult {}

export interface M2InternalMonoidAnalysis
  extends InternalMonoidAnalysis<M2Object<any>, M2Morphism<any, any>> {
  readonly compatibility: M2InternalMonoidCompatibilityResult
  readonly context: InternalMonoidAnalysis<M2Object<any>, M2Morphism<any, any>>['context'] & {
    readonly monoid: FinGrpObj
    readonly endomorphism: (value: string) => string
    readonly eq: (left: string, right: string) => boolean
  }
}

export interface M2InternalMonoidAnalysisInput {
  readonly witness: M2InternalMonoidWitness
  readonly monoid: FinGrpObj
  readonly endomorphism: (value: string) => string
  readonly eq?: (left: string, right: string) => boolean
}

const contains = (carrier: readonly string[], eq: (left: string, right: string) => boolean) =>
  (value: string): boolean => carrier.some((candidate) => eq(candidate, value))

const defaultEq = (left: string, right: string) => left === right

export const checkM2InternalGroupCompatibility = (input: {
  readonly group: FinGrpObj
  readonly endomorphism: (value: string) => string
  readonly eq?: (left: string, right: string) => boolean
}): M2InternalGroupCompatibilityResult => {
  const { group, endomorphism } = input
  const eq = input.eq ?? defaultEq
  const issues: string[] = []
  const isInCarrier = contains(group.elems, eq)

  for (const value of group.elems) {
    const image = endomorphism(value)
    if (!isInCarrier(image)) {
      issues.push('compatibility: endomorphism must preserve the carrier of the group object')
      break
    }
    const twice = endomorphism(image)
    if (!eq(twice, image)) {
      issues.push('compatibility: endomorphism must be idempotent')
      break
    }
  }

  const unitImage = endomorphism(group.e)
  if (!eq(unitImage, group.e)) {
    issues.push('compatibility: endomorphism must fix the unit element')
  }

  for (const element of group.elems) {
    const left = endomorphism(group.inv(element))
    const right = group.inv(endomorphism(element))
    if (!eq(left, right)) {
      issues.push('compatibility: endomorphism must commute with inversion')
      break
    }
  }

  outer: for (const a of group.elems) {
    for (const b of group.elems) {
      const left = endomorphism(group.mul(a, b))
      const right = group.mul(endomorphism(a), endomorphism(b))
      if (!eq(left, right)) {
        issues.push('compatibility: endomorphism must be a group homomorphism')
        break outer
      }
    }
  }

  return { holds: issues.length === 0, issues }
}

export const checkM2InternalMonoidCompatibility = (input: {
  readonly monoid: FinGrpObj
  readonly endomorphism: (value: string) => string
  readonly eq?: (left: string, right: string) => boolean
}): M2InternalMonoidCompatibilityResult => {
  const { monoid, endomorphism } = input
  const eq = input.eq ?? defaultEq
  const issues: string[] = []
  const isInCarrier = contains(monoid.elems, eq)

  for (const value of monoid.elems) {
    const image = endomorphism(value)
    if (!isInCarrier(image)) {
      issues.push('compatibility: endomorphism must preserve the carrier of the monoid object')
      break
    }
    const twice = endomorphism(image)
    if (!eq(twice, image)) {
      issues.push('compatibility: endomorphism must be idempotent')
      break
    }
  }

  const unitImage = endomorphism(monoid.e)
  if (!eq(unitImage, monoid.e)) {
    issues.push('compatibility: endomorphism must fix the unit element')
  }

  outer: for (const a of monoid.elems) {
    for (const b of monoid.elems) {
      const left = endomorphism(monoid.mul(a, b))
      const right = monoid.mul(endomorphism(a), endomorphism(b))
      if (!eq(left, right)) {
        issues.push('compatibility: endomorphism must be a monoid homomorphism')
        break outer
      }
    }
  }

  return { holds: issues.length === 0, issues }
}

export const makeM2InternalGroupWitness = (input: M2InternalGroupInput): M2InternalGroupWitness => {
  const { group, endomorphism, equaliser } = input
  const eq = defaultEq
  const compatibility = checkM2InternalGroupCompatibility({ group, endomorphism, eq })
  if (!compatibility.holds) {
    throw new Error(
      `makeM2InternalGroupWitness: endomorphism must preserve the group structure (${compatibility.issues.join('; ')})`,
    )
  }

  const object = makeM2Object({
    carrier: group.elems,
    endo: endomorphism,
    eq,
  })

  const product = productM2({
    left: object,
    right: object,
    ...(equaliser ? { equaliser } : {}),
  })
  const productLeft = productM2({ left: product.object, right: object })
  const productRight = productM2({ left: object, right: product.object })

  const multiplication = makeM2Morphism({
    dom: product.object,
    cod: object,
    map: ([left, right]) => group.mul(left, right),
  })

  const inverse = makeM2Morphism({
    dom: object,
    cod: object,
    map: (value) => group.inv(value),
  })

  const terminal = makeTerminal()

  const unitArrow = makeM2Morphism({
    dom: terminal.object,
    cod: object,
    map: () => group.e,
  })

  const category = makeCategoryOps()
  const binaryProduct = toBinaryTuple(product)

  const witness: InternalGroupWitness<M2Object<any>, M2Morphism<any, any>> = {
    object,
    product: binaryProduct,
    multiplication,
    unit: {
      terminal,
      arrow: unitArrow,
    },
    inverse,
    productLeft: toBinaryTuple(productLeft),
    productRight: toBinaryTuple(productRight),
    diagonal: enrichInternalGroupDiagonal(category, binaryProduct, {
      object,
      identity: category.id(object),
    }),
  }

  return { object, category, witness }
}

export const analyzeM2InternalGroup = (
  input: M2InternalGroupAnalysisInput,
): M2InternalGroupAnalysis => {
  const { witness, group, endomorphism } = input
  const eq = input.eq ?? defaultEq

  const baseAnalysis = analyzeInternalGroup({
    category: witness.category,
    witness: witness.witness,
  })

  const compatibility = checkM2InternalGroupCompatibility({ group, endomorphism, eq })

  const combinedIssues = compatibility.holds
    ? baseAnalysis.issues
    : [...baseAnalysis.issues, ...compatibility.issues]

  const analysis: M2InternalGroupAnalysis = {
    ...baseAnalysis,
    compatibility,
    issues: combinedIssues,
    overall: baseAnalysis.overall && compatibility.holds,
    context: {
      ...baseAnalysis.context,
      group,
      endomorphism,
      eq,
    },
  }

  return analysis
}

export const makeM2InternalMonoidWitness = (
  input: M2InternalMonoidInput,
): M2InternalMonoidWitness => {
  const { monoid, endomorphism, equaliser } = input
  const eq = input.eq ?? defaultEq
  const compatibility = checkM2InternalMonoidCompatibility({ monoid, endomorphism, eq })
  if (!compatibility.holds) {
    throw new Error(
      `makeM2InternalMonoidWitness: endomorphism must preserve the monoid structure (${compatibility.issues.join('; ')})`,
    )
  }

  const object = makeM2Object({
    carrier: monoid.elems,
    endo: endomorphism,
    eq,
  })

  const product = productM2({
    left: object,
    right: object,
    ...(equaliser ? { equaliser } : {}),
  })
  const productLeft = productM2({ left: product.object, right: object })
  const productRight = productM2({ left: object, right: product.object })

  const multiplication = makeM2Morphism({
    dom: product.object,
    cod: object,
    map: ([left, right]) => monoid.mul(left, right),
  })

  const terminal = makeTerminal()
  const unitArrow = makeM2Morphism({
    dom: terminal.object,
    cod: object,
    map: () => monoid.e,
  })

  const category = makeCategoryOps()

  const binaryProduct = toBinaryTuple(product)

  const witness: InternalMonoidWitness<M2Object<any>, M2Morphism<any, any>> = {
    object,
    product: binaryProduct,
    multiplication,
    unit: {
      terminal,
      arrow: unitArrow,
    },
    productLeft: toBinaryTuple(productLeft),
    productRight: toBinaryTuple(productRight),
    diagonal: enrichInternalMonoidDiagonal(category, binaryProduct, {
      object,
      identity: category.id(object),
    }),
  }

  return { object, category, witness }
}

export const analyzeM2InternalMonoid = (
  input: M2InternalMonoidAnalysisInput,
): M2InternalMonoidAnalysis => {
  const { witness, monoid } = input
  const eq = input.eq ?? defaultEq
  const baseAnalysis = analyzeInternalMonoid({
    category: witness.category,
    witness: witness.witness,
  })
  const compatibility = checkM2InternalMonoidCompatibility({ monoid, endomorphism: input.endomorphism, eq })

  const analysis: M2InternalMonoidAnalysis = {
    ...baseAnalysis,
    compatibility,
    context: {
      ...baseAnalysis.context,
      monoid,
      endomorphism: input.endomorphism,
      eq,
    },
    overall: baseAnalysis.overall && compatibility.holds,
    issues: baseAnalysis.overall && compatibility.holds
      ? []
      : [...baseAnalysis.issues, ...(!compatibility.holds ? compatibility.issues : [])],
  }

  return analysis
}
