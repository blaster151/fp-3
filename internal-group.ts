import type {
  BinaryProductDiagonalFactor,
  BinaryProductTuple,
} from './category-limits-helpers'
import {
  checkBinaryProductDiagonalPairing,
  makeBinaryProductComponentwise,
  makeBinaryProductDiagonal,
} from './category-limits-helpers'

export interface CategoryOps<O, M> {
  readonly compose: (g: M, f: M) => M
  readonly eq: (left: M, right: M) => boolean
  readonly id: (object: O) => M
}

export interface TerminalWitness<O, M> {
  readonly object: O
  readonly terminate: (domain: O) => M
}

export interface InternalGroupWitness<O, M> {
  readonly object: O
  readonly product: BinaryProductTuple<O, M>
  readonly multiplication: M
  readonly unit: {
    readonly terminal: TerminalWitness<O, M>
    readonly arrow: M
  }
  readonly inverse: M
  readonly productLeft: BinaryProductTuple<O, M>
  readonly productRight: BinaryProductTuple<O, M>
  readonly diagonal?: {
    readonly factor: BinaryProductDiagonalFactor<O, M>
    readonly arrow: M
  }
}

export interface InternalGroupCheckResult {
  readonly holds: boolean
  readonly issues: readonly string[]
}

export interface InternalGroupAnalysis<O, M> {
  readonly associativity: InternalGroupCheckResult
  readonly unit: InternalGroupCheckResult
  readonly inversion: InternalGroupCheckResult
  readonly diagonalPairing?: {
    readonly left: boolean
    readonly right: boolean
  }
  readonly overall: boolean
  readonly issues: readonly string[]
  readonly context: {
    readonly category: CategoryOps<O, M>
    readonly witness: InternalGroupWitness<O, M>
  }
}

const makeAssociatorToRight = <O, M>(
  category: CategoryOps<O, M>,
  witness: InternalGroupWitness<O, M>,
): M => {
  const [leftFirst, leftSecond] = witness.productLeft.projections
  const [pi1, pi2] = witness.product.projections

  const firstLeg = category.compose(pi1, leftFirst)
  const secondLegLeft = category.compose(pi2, leftFirst)
  const secondLeg = witness.product.tuple(witness.productLeft.object, [secondLegLeft, leftSecond])
  return witness.productRight.tuple(witness.productLeft.object, [firstLeg, secondLeg])
}

export const checkInternalGroupAssociativity = <O, M>(input: {
  readonly category: CategoryOps<O, M>
  readonly witness: InternalGroupWitness<O, M>
}): InternalGroupCheckResult => {
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

export const checkInternalGroupUnit = <O, M>(input: {
  readonly category: CategoryOps<O, M>
  readonly witness: InternalGroupWitness<O, M>
}): InternalGroupCheckResult => {
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

  return { holds: issues.length === 0, issues }
}

export const checkInternalGroupInversion = <O, M>(input: {
  readonly category: CategoryOps<O, M>
  readonly witness: InternalGroupWitness<O, M>
}): InternalGroupCheckResult => {
  const { category, witness } = input
  const issues: string[] = []
  const terminate = witness.unit.terminal.terminate(witness.object)
  const constant = category.compose(witness.unit.arrow, terminate)
  const idG = category.id(witness.object)

  const leftTuple = witness.product.tuple(witness.object, [idG, witness.inverse])
  const leftComposite = category.compose(witness.multiplication, leftTuple)
  if (!category.eq(leftComposite, constant)) {
    issues.push('inverse: m ∘ ⟨id, i⟩ must equal e ∘ !')
  }

  const rightTuple = witness.product.tuple(witness.object, [witness.inverse, idG])
  const rightComposite = category.compose(witness.multiplication, rightTuple)
  if (!category.eq(rightComposite, constant)) {
    issues.push('inverse: m ∘ ⟨i, id⟩ must equal e ∘ !')
  }

  if (witness.diagonal) {
    const diagonal = witness.diagonal
    const pairingOk = checkBinaryProductDiagonalPairing({
      category,
      target: witness.product,
      diagonal: diagonal.arrow,
      domain: witness.object,
      legs: [idG, witness.inverse],
      componentwise: makeBinaryProductComponentwise({
        category,
        source: witness.product,
        target: witness.product,
        components: [idG, witness.inverse],
      }),
    })

    if (!pairingOk) {
      issues.push('inverse: diagonal pairing compatibility fails for ⟨id, i⟩')
    }
  }

  return { holds: issues.length === 0, issues }
}

export const enrichInternalGroupDiagonal = <O, M>(
  category: CategoryOps<O, M>,
  product: BinaryProductTuple<O, M>,
  factor: BinaryProductDiagonalFactor<O, M>,
): { readonly factor: BinaryProductDiagonalFactor<O, M>; readonly arrow: M } => ({
  factor,
  arrow: makeBinaryProductDiagonal(product, factor),
})

export const analyzeInternalGroup = <O, M>(input: {
  readonly category: CategoryOps<O, M>
  readonly witness: InternalGroupWitness<O, M>
}): InternalGroupAnalysis<O, M> => {
  const { category, witness } = input
  const associativity = checkInternalGroupAssociativity(input)
  const unit = checkInternalGroupUnit(input)
  const inversion = checkInternalGroupInversion(input)

  const issues = [
    ...associativity.issues,
    ...unit.issues,
    ...inversion.issues,
  ]

  let diagonalPairing: InternalGroupAnalysis<O, M>['diagonalPairing']
  if (witness.diagonal) {
    const idG = category.id(witness.object)
    const diagonal = witness.diagonal

    const leftComponentwise = makeBinaryProductComponentwise({
      category,
      source: witness.product,
      target: witness.product,
      components: [idG, witness.inverse],
    })

    const leftPairing = checkBinaryProductDiagonalPairing({
      category,
      target: witness.product,
      diagonal: diagonal.arrow,
      domain: diagonal.factor.object,
      legs: [idG, witness.inverse],
      componentwise: leftComponentwise,
    })

    const rightComponentwise = makeBinaryProductComponentwise({
      category,
      source: witness.product,
      target: witness.product,
      components: [witness.inverse, idG],
    })

    const rightPairing = checkBinaryProductDiagonalPairing({
      category,
      target: witness.product,
      diagonal: diagonal.arrow,
      domain: diagonal.factor.object,
      legs: [witness.inverse, idG],
      componentwise: rightComponentwise,
    })

    if (!rightPairing) {
      issues.push('inverse: diagonal pairing compatibility fails for ⟨i, id⟩')
    }

    diagonalPairing = { left: leftPairing, right: rightPairing }
  }

  const analysis: InternalGroupAnalysis<O, M> = {
    associativity,
    unit,
    inversion,
    overall: issues.length === 0,
    issues,
    context: input,
  }

  if (diagonalPairing) {
    ;(analysis as { diagonalPairing: NonNullable<InternalGroupAnalysis<O, M>['diagonalPairing']> }).diagonalPairing =
      diagonalPairing
  }

  return analysis
}
