import type {
  BinaryProductDiagonalFactor,
  BinaryProductTuple,
} from './category-limits-helpers'
import {
  checkBinaryProductDiagonalPairing,
  makeBinaryProductComponentwise,
  makeBinaryProductDiagonal,
} from './category-limits-helpers'
import type { CategoryOps, TerminalWitness } from './internal-group'

export interface InternalMonoidWitness<O, M> {
  readonly object: O
  readonly product: BinaryProductTuple<O, M>
  readonly multiplication: M
  readonly unit: {
    readonly terminal: TerminalWitness<O, M>
    readonly arrow: M
  }
  readonly productLeft: BinaryProductTuple<O, M>
  readonly productRight: BinaryProductTuple<O, M>
  readonly diagonal?: {
    readonly factor: BinaryProductDiagonalFactor<O, M>
    readonly arrow: M
  }
}

export interface InternalMonoidCheckResult {
  readonly holds: boolean
  readonly issues: readonly string[]
}

export interface InternalMonoidAnalysis<O, M> {
  readonly associativity: InternalMonoidCheckResult
  readonly unit: InternalMonoidCheckResult
  readonly diagonalPairing?: {
    readonly self: boolean
  }
  readonly overall: boolean
  readonly issues: readonly string[]
  readonly context: {
    readonly category: CategoryOps<O, M>
    readonly witness: InternalMonoidWitness<O, M>
  }
}

const makeAssociatorToRight = <O, M>(
  category: CategoryOps<O, M>,
  witness: InternalMonoidWitness<O, M>,
): M => {
  const [leftFirst, leftSecond] = witness.productLeft.projections
  const [pi1, pi2] = witness.product.projections

  const firstLeg = category.compose(pi1, leftFirst)
  const secondLegLeft = category.compose(pi2, leftFirst)
  const secondLeg = witness.product.tuple(witness.productLeft.object, [secondLegLeft, leftSecond])
  return witness.productRight.tuple(witness.productLeft.object, [firstLeg, secondLeg])
}

export const checkInternalMonoidAssociativity = <O, M>(input: {
  readonly category: CategoryOps<O, M>
  readonly witness: InternalMonoidWitness<O, M>
}): InternalMonoidCheckResult => {
  const { category, witness } = input
  const issues: string[] = []
  const idG = category.id(witness.object)

  const leftComponentwise = makeBinaryProductComponentwise({
    category,
    source: witness.productLeft,
    target: witness.product,
    components: [witness.multiplication, idG],
  })
  const leftComposite = category.compose(witness.multiplication, leftComponentwise)

  const rightComponentwise = makeBinaryProductComponentwise({
    category,
    source: witness.productRight,
    target: witness.product,
    components: [idG, witness.multiplication],
  })
  const associator = makeAssociatorToRight(category, witness)
  const rightAdjusted = category.compose(rightComponentwise, associator)
  const rightComposite = category.compose(witness.multiplication, rightAdjusted)

  if (!category.eq(leftComposite, rightComposite)) {
    issues.push('associativity: m ∘ (m × id) must equal m ∘ (id × m)')
  }

  return { holds: issues.length === 0, issues }
}

export const checkInternalMonoidUnit = <O, M>(input: {
  readonly category: CategoryOps<O, M>
  readonly witness: InternalMonoidWitness<O, M>
}): InternalMonoidCheckResult => {
  const { category, witness } = input
  const issues: string[] = []
  const terminate = witness.unit.terminal.terminate(witness.object)
  const constant = category.compose(witness.unit.arrow, terminate)
  const idG = category.id(witness.object)

  const leftTuple = witness.product.tuple(witness.object, [constant, idG])
  const leftComposite = category.compose(witness.multiplication, leftTuple)
  if (!category.eq(leftComposite, idG)) {
    issues.push('unit: left unit law failed (m ∘ ⟨e ∘ !, id⟩ ≠ id)')
  }

  const rightTuple = witness.product.tuple(witness.object, [idG, constant])
  const rightComposite = category.compose(witness.multiplication, rightTuple)
  if (!category.eq(rightComposite, idG)) {
    issues.push('unit: right unit law failed (m ∘ ⟨id, e ∘ !⟩ ≠ id)')
  }

  if (witness.diagonal) {
    const diagonal = witness.diagonal
    const componentwise = makeBinaryProductComponentwise({
      category,
      source: witness.product,
      target: witness.product,
      components: [idG, idG],
    })

    const compatible = checkBinaryProductDiagonalPairing({
      category,
      target: witness.product,
      diagonal: diagonal.arrow,
      domain: diagonal.factor.object,
      legs: [idG, idG],
      componentwise,
    })

    if (!compatible) {
      issues.push('unit: diagonal pairing compatibility fails for ⟨id, id⟩')
    }
  }

  return { holds: issues.length === 0, issues }
}

export const enrichInternalMonoidDiagonal = <O, M>(
  category: CategoryOps<O, M>,
  product: BinaryProductTuple<O, M>,
  factor: BinaryProductDiagonalFactor<O, M>,
): { readonly factor: BinaryProductDiagonalFactor<O, M>; readonly arrow: M } => ({
  factor,
  arrow: makeBinaryProductDiagonal(product, factor),
})

export const analyzeInternalMonoid = <O, M>(input: {
  readonly category: CategoryOps<O, M>
  readonly witness: InternalMonoidWitness<O, M>
}): InternalMonoidAnalysis<O, M> => {
  const { category, witness } = input
  const associativity = checkInternalMonoidAssociativity(input)
  const unit = checkInternalMonoidUnit(input)

  const issues = [...associativity.issues, ...unit.issues]

  let diagonalPairing: InternalMonoidAnalysis<O, M>['diagonalPairing']
  if (witness.diagonal) {
    const idG = category.id(witness.object)
    const componentwise = makeBinaryProductComponentwise({
      category,
      source: witness.product,
      target: witness.product,
      components: [idG, idG],
    })

    const compatible = checkBinaryProductDiagonalPairing({
      category,
      target: witness.product,
      diagonal: witness.diagonal.arrow,
      domain: witness.diagonal.factor.object,
      legs: [idG, idG],
      componentwise,
    })

    if (!compatible) {
      issues.push('diagonal: ⟨id, id⟩ must agree with the componentwise product of id and id')
    }

    diagonalPairing = { self: compatible }
  }

  const analysis: InternalMonoidAnalysis<O, M> = {
    associativity,
    unit,
    overall: issues.length === 0,
    issues,
    context: input,
  }

  if (diagonalPairing) {
    ;(analysis as { diagonalPairing: NonNullable<InternalMonoidAnalysis<O, M>['diagonalPairing']> }).diagonalPairing =
      diagonalPairing
  }

  return analysis
}
