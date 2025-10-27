import type { Module } from "./modules"
import type { Ring } from "./structures"

type Equality<A> = (left: A, right: A) => boolean

export interface FinitelyGeneratedModule<R, M> {
  readonly module: Module<R, M>
  readonly generators: ReadonlyArray<M>
  readonly label?: string
  readonly eq?: Equality<M>
}

export interface ModuleGenerationWitness<R, M> {
  readonly target: M
  readonly coefficients: ReadonlyArray<R>
  readonly linearCombination: ReadonlyArray<{
    readonly generator: M
    readonly coefficient: R
  }>
}

export type ModuleGenerationViolation<M> =
  | { readonly kind: "missingGenerators" }
  | { readonly kind: "insufficientCoefficients" }
  | { readonly kind: "notGenerated"; readonly target: M }

export interface ModuleGenerationCheckOptions<R, M> {
  readonly vectorSamples?: ReadonlyArray<M>
  readonly coefficientSamples?: ReadonlyArray<R>
  readonly witnessLimit?: number
  readonly combinationLimit?: number
}

export interface ModuleGenerationCheckResult<R, M> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<ModuleGenerationViolation<M>>
  readonly witnesses: ReadonlyArray<ModuleGenerationWitness<R, M>>
  readonly details: string
  readonly metadata: {
    readonly generatorCount: number
    readonly vectorSampleCandidates: number
    readonly distinctVectorSamples: number
    readonly coefficientCandidates: number
    readonly combinationLimit: number
    readonly combinationsTested: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

const withEquality = <A>(eq?: Equality<A>): Equality<A> => eq ?? ((left, right) => Object.is(left, right))

const dedupe = <A>(values: ReadonlyArray<A>, eq: Equality<A>): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

const defaultCoefficientSamples = <R>(ring: Ring<R>): R[] => {
  const samples = [ring.zero, ring.one, ring.neg(ring.one)]
  return dedupe(samples, withEquality(ring.eq))
}

type CombinationSearchState<R, M> = {
  readonly module: Module<R, M>
  readonly generators: ReadonlyArray<M>
  readonly coefficientSamples: ReadonlyArray<R>
  readonly eq: Equality<M>
  readonly limit: number
  combinationsTested: number
}

const searchLinearCombination = <R, M>(
  state: CombinationSearchState<R, M>,
  target: M,
): ModuleGenerationWitness<R, M> | undefined => {
  const { module, generators, coefficientSamples, eq } = state
  if (generators.length === 0 || coefficientSamples.length === 0) {
    return undefined
  }

  const coefficients: R[] = new Array(generators.length)

  const explore = (index: number, current: M): ModuleGenerationWitness<R, M> | undefined => {
    if (state.combinationsTested >= state.limit) {
      return undefined
    }

    if (index === generators.length) {
      state.combinationsTested += 1
      if (eq(current, target)) {
        const linearCombination = generators.map(
          (generator, idx): { readonly generator: M; readonly coefficient: R } => ({
            generator,
            coefficient: coefficients[idx]!,
          }),
        )

        return {
          target,
          coefficients: coefficients.slice(),
          linearCombination,
        }
      }
      return undefined
    }

    for (const coefficient of coefficientSamples) {
      if (state.combinationsTested >= state.limit) {
        break
      }

      coefficients[index] = coefficient
      const generator = generators[index]!
      const contribution = module.scalar(coefficient, generator)
      const next = module.add(current, contribution)
      const witness = explore(index + 1, next)
      if (witness) {
        return witness
      }
    }

    return undefined
  }

  return explore(0, module.zero)
}

export const checkFinitelyGeneratedModule = <R, M>(
  finitelyGenerated: FinitelyGeneratedModule<R, M>,
  options: ModuleGenerationCheckOptions<R, M> = {},
): ModuleGenerationCheckResult<R, M> => {
  const { module, generators } = finitelyGenerated
  const eq = withEquality(finitelyGenerated.eq ?? module.eq)
  const ring: Ring<R> = module.ring

  const vectorSampleCandidates = options.vectorSamples ?? []
  const samples = dedupe(vectorSampleCandidates, eq)
  const coefficientCandidates =
    options.coefficientSamples ?? defaultCoefficientSamples(ring)
  const coefficients = dedupe(coefficientCandidates, withEquality(ring.eq))
  const witnessLimit = options.witnessLimit ?? 1

  const generatorCount = generators.length
  const coefficientCount = coefficients.length

  const violations: ModuleGenerationViolation<M>[] = []
  const witnesses: ModuleGenerationWitness<R, M>[] = []

  if (generatorCount === 0) {
    violations.push({ kind: "missingGenerators" })
  }

  if (coefficientCount === 0) {
    violations.push({ kind: "insufficientCoefficients" })
  }

  const naiveLimit = coefficientCount === 0 ? 0 : coefficientCount ** generatorCount
  const combinationLimit = options.combinationLimit ?? naiveLimit

  const state: CombinationSearchState<R, M> = {
    module,
    generators,
    coefficientSamples: coefficients,
    eq,
    limit: combinationLimit,
    combinationsTested: 0,
  }

  if (violations.length === 0) {
    for (const sample of samples) {
      const witness = searchLinearCombination(state, sample)
      if (!witness) {
        violations.push({ kind: "notGenerated", target: sample })
      } else if (witnesses.length < witnessLimit) {
        witnesses.push(witness)
      }
      if (state.combinationsTested >= state.limit) {
        break
      }
    }
  }

  const holds = violations.length === 0
  const label = finitelyGenerated.label ?? module.name ?? "module"

  const describeViolation = (violation: ModuleGenerationViolation<M>): string => {
    switch (violation.kind) {
      case "missingGenerators":
        return "no generators supplied"
      case "insufficientCoefficients":
        return "no coefficient samples available for search"
      default:
        return "sample not generated by provided set"
    }
  }

  const details = holds
    ? `${label} generation verified on ${samples.length} distinct vectors using ${generatorCount} generators.`
    : `${label} generation violations: ${violations
        .map(describeViolation)
        .join("; ")}.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      generatorCount,
      vectorSampleCandidates: vectorSampleCandidates.length,
      distinctVectorSamples: samples.length,
      coefficientCandidates: coefficientCandidates.length,
      combinationLimit,
      combinationsTested: state.combinationsTested,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}
