import type { Module } from "./modules"
import type { Ring } from "./structures"

type Equality<A> = (left: A, right: A) => boolean

export interface FinitelyGeneratedModule<R, M> {
  readonly module: Module<R, M>
  readonly generators: ReadonlyArray<M>
  readonly label?: string
  readonly eq?: Equality<M>
}

export interface AscendingChain<R, M> {
  readonly module: Module<R, M>
  readonly generatorSamples: ReadonlyArray<ReadonlyArray<M>>
  readonly label?: string
  readonly eq?: Equality<M>
}

export interface AscendingChainSearchOptions<R, M> extends ModuleGenerationCheckOptions<R, M> {
  readonly chainLimit?: number
}

export interface AscendingChainStage<R, M> {
  readonly index: number
  readonly generators: ReadonlyArray<M>
  readonly finitelyGenerated: FinitelyGeneratedModule<R, M>
  readonly generation: ModuleGenerationCheckResult<R, M>
  readonly missingVectors: ReadonlyArray<M>
}

export interface AscendingChainSearchResult<R, M> {
  readonly stabilized: boolean
  readonly stabilizationIndex?: number
  readonly stages: ReadonlyArray<AscendingChainStage<R, M>>
  readonly exhaustedChain: boolean
  readonly reachedLimit: boolean
  readonly details: string
}

export type NoetherianModuleViolation<M> =
  | {
      readonly kind: "chainDidNotStabilize"
      readonly stageIndex: number
      readonly missingVectors: ReadonlyArray<M>
    }
  | {
      readonly kind: "stabilizedWithMissingVectors"
      readonly stageIndex: number
      readonly missingVectors: ReadonlyArray<M>
    }

export interface NoetherianModuleCheckOptions<R, M> extends AscendingChainSearchOptions<R, M> {}

export interface NoetherianModuleCheckResult<R, M> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<NoetherianModuleViolation<M>>
  readonly stages: ReadonlyArray<AscendingChainStage<R, M>>
  readonly details: string
  readonly metadata: {
    readonly stabilized: boolean
    readonly stabilizationIndex?: number
    readonly stagesTested: number
    readonly chainLimit: number
    readonly generatorSamples: number
    readonly vectorSamplesTested: number
    readonly exhaustedChain: boolean
    readonly reachedLimit: boolean
  }
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

const sameSet = <A>(left: ReadonlyArray<A>, right: ReadonlyArray<A>, eq: Equality<A>): boolean => {
  if (left.length !== right.length) {
    return false
  }
  return left.every(candidate => right.some(other => eq(candidate, other)))
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

export const searchAscendingChain = <R, M>(
  chain: AscendingChain<R, M>,
  options: AscendingChainSearchOptions<R, M> = {},
): AscendingChainSearchResult<R, M> => {
  const { chainLimit: providedChainLimit, ...rest } = options
  const generationOptions: ModuleGenerationCheckOptions<R, M> = {
    ...(rest.vectorSamples !== undefined ? { vectorSamples: rest.vectorSamples } : {}),
    ...(rest.coefficientSamples !== undefined
      ? { coefficientSamples: rest.coefficientSamples }
      : {}),
    ...(rest.witnessLimit !== undefined ? { witnessLimit: rest.witnessLimit } : {}),
    ...(rest.combinationLimit !== undefined ? { combinationLimit: rest.combinationLimit } : {}),
  }
  const chainLimit = providedChainLimit ?? chain.generatorSamples.length
  const eq = withEquality(chain.eq ?? chain.module.eq)
  const label = chain.label ?? chain.module.name ?? "module"

  const stages: AscendingChainStage<R, M>[] = []
  let stabilized = false
  let stabilizationIndex: number | undefined
  let previousMissing: ReadonlyArray<M> | undefined

  const limit = Math.max(0, Math.min(chainLimit, chain.generatorSamples.length))

  for (let index = 0; index < limit; index++) {
    const generators = chain.generatorSamples[index] ?? []
    const finitelyGenerated: FinitelyGeneratedModule<R, M> = {
      module: chain.module,
      generators,
      label: `${label} stage ${index + 1}`,
      eq,
    }

    const generation = checkFinitelyGeneratedModule(finitelyGenerated, generationOptions)
    const missingVectors = dedupe(
      generation.violations.flatMap(violation =>
        violation.kind === "notGenerated" ? [violation.target] : [],
      ),
      eq,
    )

    stages.push({
      index,
      generators,
      finitelyGenerated,
      generation,
      missingVectors,
    })

    if (missingVectors.length === 0) {
      stabilized = true
      stabilizationIndex = index
      break
    }

    if (previousMissing && sameSet(previousMissing, missingVectors, eq)) {
      stabilized = true
      stabilizationIndex = index
      break
    }

    previousMissing = missingVectors
  }

  const reachedLimit =
    !stabilized && chainLimit < chain.generatorSamples.length && stages.length >= chainLimit
  const exhaustedChain =
    !stabilized && !reachedLimit && stages.length === chain.generatorSamples.length

  const details = stabilized
    ? `Ascending chain stabilized after ${stages.length} stage${stages.length === 1 ? "" : "s"}.`
    : `Ascending chain did not stabilize across ${stages.length} stage${stages.length === 1 ? "" : "s"}.`

  return {
    stabilized,
    stages,
    exhaustedChain,
    reachedLimit,
    details,
    ...(stabilizationIndex !== undefined ? { stabilizationIndex } : {}),
  }
}

export const checkNoetherianModule = <R, M>(
  chain: AscendingChain<R, M>,
  options: NoetherianModuleCheckOptions<R, M> = {},
): NoetherianModuleCheckResult<R, M> => {
  const searchResult = searchAscendingChain(chain, options)
  const stages = searchResult.stages
  const finalStage = stages[stages.length - 1]
  const stabilizationIndex = searchResult.stabilizationIndex
  const stabilized = searchResult.stabilized
  const vectorSamplesTested = options.vectorSamples?.length ?? 0
  const chainLimit = options.chainLimit ?? chain.generatorSamples.length

  const violations: NoetherianModuleViolation<M>[] = []

  if (!stabilized) {
    const stageIndex = finalStage?.index ?? stages.length - 1
    violations.push({
      kind: "chainDidNotStabilize",
      stageIndex: stageIndex < 0 ? 0 : stageIndex,
      missingVectors: finalStage?.missingVectors ?? [],
    })
  } else if (finalStage && finalStage.missingVectors.length > 0) {
    violations.push({
      kind: "stabilizedWithMissingVectors",
      stageIndex: finalStage.index,
      missingVectors: finalStage.missingVectors,
    })
  }

  const holds = stabilized && (!finalStage || finalStage.missingVectors.length === 0)

  const baseLabel = chain.label ?? chain.module.name ?? "module"
  const details = holds
    ? `${baseLabel} chain stabilized after ${stages.length} stage${stages.length === 1 ? "" : "s"}.`
    : `${baseLabel} chain failed to stabilize on sampled generators.`

  return {
    holds,
    violations,
    stages,
    details,
    metadata: {
      stabilized,
      stagesTested: stages.length,
      chainLimit,
      generatorSamples: chain.generatorSamples.length,
      vectorSamplesTested,
      exhaustedChain: searchResult.exhaustedChain,
      reachedLimit: searchResult.reachedLimit,
      ...(stabilizationIndex !== undefined ? { stabilizationIndex } : {}),
    },
  }
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
