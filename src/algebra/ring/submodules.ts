import type { Module, ModuleHomomorphism } from "./modules"

type Equality<A> = (left: A, right: A) => boolean

export interface Submodule<R, M> {
  readonly module: Module<R, M>
  readonly contains: (value: M) => boolean
  readonly name?: string
  readonly sampleElements?: ReadonlyArray<M>
}

export type SubmoduleViolation<R, M> =
  | { readonly kind: "zero" }
  | { readonly kind: "membership"; readonly value: M }
  | { readonly kind: "addition"; readonly pair: readonly [M, M] }
  | { readonly kind: "negation"; readonly value: M }
  | { readonly kind: "scalar"; readonly scalar: R; readonly value: M }

export interface SubmoduleCheckOptions<R, M> {
  readonly vectorSamples?: ReadonlyArray<M>
  readonly scalarSamples?: ReadonlyArray<R>
  readonly requireMembership?: boolean
}

export interface SubmoduleCheckResult<R, M> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<SubmoduleViolation<R, M>>
  readonly details: string
  readonly metadata: {
    readonly checkedVectors: number
    readonly scalarSamples: number
  }
}

const withEquality = <R, M>(module: Module<R, M>): Equality<M> =>
  module.eq ?? ((left, right) => Object.is(left, right))

const dedupe = <A>(values: ReadonlyArray<A>, eq: Equality<A>): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

export const checkSubmodule = <R, M>(
  submodule: Submodule<R, M>,
  options: SubmoduleCheckOptions<R, M> = {},
): SubmoduleCheckResult<R, M> => {
  const module = submodule.module
  const eq = withEquality(module)
  const vectorCandidates = options.vectorSamples ?? submodule.sampleElements ?? []
  const enriched = [module.zero, ...vectorCandidates]
  const vectorSamples = dedupe(enriched.filter(submodule.contains), eq)
  const scalarSamples = options.scalarSamples ?? []
  const violations: SubmoduleViolation<R, M>[] = []

  if (!submodule.contains(module.zero)) {
    violations.push({ kind: "zero" })
  }

  if (options.requireMembership === true) {
    for (const value of vectorCandidates) {
      if (!submodule.contains(value)) {
        violations.push({ kind: "membership", value })
      }
    }
  }

  for (const value of vectorSamples) {
    const negated = module.neg(value)
    if (!submodule.contains(negated)) {
      violations.push({ kind: "negation", value })
    }
  }

  for (const left of vectorSamples) {
    for (const right of vectorSamples) {
      const sum = module.add(left, right)
      if (!submodule.contains(sum)) {
        violations.push({ kind: "addition", pair: [left, right] })
      }
    }
  }

  for (const scalar of scalarSamples) {
    for (const value of vectorSamples) {
      const scaled = module.scalar(scalar, value)
      if (!submodule.contains(scaled)) {
        violations.push({ kind: "scalar", scalar, value })
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `Submodule closed over ${vectorSamples.length} vectors and ${scalarSamples.length} scalars.`
    : `${violations.length} submodule constraints failed.`

  return {
    holds,
    violations,
    details,
    metadata: {
      checkedVectors: vectorSamples.length,
      scalarSamples: scalarSamples.length,
    },
  }
}

export interface QuotientModuleElement<M> {
  readonly representative: M
}

export interface QuotientModuleConstruction<R, M> {
  readonly base: Module<R, M>
  readonly submodule: Submodule<R, M>
  readonly reduce: (value: M) => M
  readonly name?: string
}

export interface QuotientModule<R, M> {
  readonly base: Module<R, M>
  readonly submodule: Submodule<R, M>
  readonly module: Module<R, QuotientModuleElement<M>>
  readonly project: (value: M) => QuotientModuleElement<M>
  readonly representative: (value: QuotientModuleElement<M>) => M
  readonly name?: string
}

const makeCoset = <M>(reduce: (value: M) => M, value: M): QuotientModuleElement<M> => ({
  representative: reduce(value),
})

export const buildQuotientModule = <R, M>(
  construction: QuotientModuleConstruction<R, M>,
): QuotientModule<R, M> => {
  const { base, submodule, reduce } = construction
  const lift = (value: QuotientModuleElement<M>): M => value.representative
  const cosetEq = (left: QuotientModuleElement<M>, right: QuotientModuleElement<M>): boolean =>
    submodule.contains(base.add(lift(left), base.neg(lift(right))))

  const projectedSamples = submodule.sampleElements?.map(sample => makeCoset(reduce, sample))

  const module: Module<R, QuotientModuleElement<M>> = {
    ring: base.ring,
    zero: makeCoset(reduce, base.zero),
    add: (left, right) => makeCoset(reduce, base.add(lift(left), lift(right))),
    neg: (value) => makeCoset(reduce, base.neg(lift(value))),
    scalar: (scalar, value) => makeCoset(reduce, base.scalar(scalar, lift(value))),
    eq: (left, right) => cosetEq(left, right),
    ...(construction.name ? { name: construction.name } : {}),
    ...(projectedSamples && projectedSamples.length > 0 ? { sampleElements: projectedSamples } : {}),
  }

  return {
    base,
    submodule,
    module,
    project: (value: M) => makeCoset(reduce, value),
    representative: lift,
    ...(construction.name === undefined ? {} : { name: construction.name }),
  }
}

export const restrictModule = <R, M>(submodule: Submodule<R, M>): Module<R, M> => ({
  ring: submodule.module.ring,
  zero: submodule.module.zero,
  add: submodule.module.add,
  neg: submodule.module.neg,
  scalar: submodule.module.scalar,
  ...(submodule.module.eq ? { eq: submodule.module.eq } : {}),
  ...((submodule.name ?? submodule.module.name)
    ? { name: submodule.name ?? submodule.module.name }
    : {}),
  contains: submodule.contains,
  ...(submodule.sampleElements ? { sampleElements: submodule.sampleElements } : {}),
})

export interface QuotientModuleCheckOptions<R, M> {
  readonly vectorSamples?: ReadonlyArray<M>
  readonly scalarSamples?: ReadonlyArray<R>
}

export type QuotientModuleViolation<R, M> =
  | { readonly kind: "reductionIdempotence"; readonly value: M }
  | { readonly kind: "differenceNotInSubmodule"; readonly value: M }
  | { readonly kind: "zero"; readonly value: M }
  | { readonly kind: "addition"; readonly pair: readonly [M, M] }
  | { readonly kind: "scalar"; readonly scalar: R; readonly value: M }

export interface QuotientModuleCheckResult<R, M> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<QuotientModuleViolation<R, M>>
  readonly details: string
  readonly metadata: {
    readonly vectorSamples: number
    readonly scalarSamples: number
    readonly idempotenceChecks: number
    readonly cosetComparisons: number
  }
}

export const checkQuotientModule = <R, M>(
  quotient: QuotientModule<R, M>,
  options: QuotientModuleCheckOptions<R, M> = {},
): QuotientModuleCheckResult<R, M> => {
  const vectorSamples = options.vectorSamples ?? quotient.submodule.sampleElements ?? []
  const scalarSamples = options.scalarSamples ?? []
  const eq = quotient.module.eq ?? ((left, right) => Object.is(left, right))
  const baseEq = quotient.base.eq ?? ((left, right) => Object.is(left, right))
  const violations: QuotientModuleViolation<R, M>[] = []

  const project = quotient.project
  const lift = quotient.representative

  let idempotenceChecks = 0
  let cosetComparisons = 0

  for (const value of vectorSamples) {
    const projected = project(value)
    const representative = lift(projected)
    const second = lift(project(representative))
    idempotenceChecks += 1
    if (!baseEq(second, representative)) {
      violations.push({ kind: "reductionIdempotence", value })
    }

    const difference = quotient.base.add(value, quotient.base.neg(representative))
    if (!quotient.submodule.contains(difference)) {
      violations.push({ kind: "differenceNotInSubmodule", value })
    }

    const projectedZero = quotient.module.add(projected, quotient.module.neg(projected))
    if (!eq(projectedZero, quotient.module.zero)) {
      violations.push({ kind: "zero", value })
    }
  }

  for (const left of vectorSamples) {
    for (const right of vectorSamples) {
      const projectedSum = quotient.module.add(project(left), project(right))
      const baseSum = project(quotient.base.add(left, right))
      cosetComparisons += 1
      if (!eq(projectedSum, baseSum)) {
        violations.push({ kind: "addition", pair: [left, right] })
      }
    }
  }

  for (const scalar of scalarSamples) {
    for (const value of vectorSamples) {
      const projectedScalar = quotient.module.scalar(scalar, project(value))
      const baseScalar = project(quotient.base.scalar(scalar, value))
      if (!eq(projectedScalar, baseScalar)) {
        violations.push({ kind: "scalar", scalar, value })
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `Quotient module respected ${vectorSamples.length} representatives with ${idempotenceChecks} idempotence checks.`
    : `${violations.length} quotient module constraints failed after ${idempotenceChecks} idempotence checks.`

  return {
    holds,
    violations,
    details,
    metadata: {
      vectorSamples: vectorSamples.length,
      scalarSamples: scalarSamples.length,
      idempotenceChecks,
      cosetComparisons,
    },
  }
}

export const submoduleInclusion = <R, M>(submodule: Submodule<R, M>): ModuleHomomorphism<R, M, M> => ({
  source: restrictModule(submodule),
  target: submodule.module,
  map: (value) => value,
  label: submodule.name ? `ι_${submodule.name}` : "ι",
})

export const quotientProjection = <R, M>(
  quotient: QuotientModule<R, M>,
): ModuleHomomorphism<R, M, QuotientModuleElement<M>> => ({
  source: quotient.base,
  target: quotient.module,
  map: quotient.project,
  label: quotient.name ? `π_${quotient.name}` : "π",
})
