import type { PrimeSpectrumPoint } from "../../schemes/prime-spectrum"
import type {
  MultiplicativeSet,
  MultiplicativeSetCheckOptions,
  MultiplicativeSetCheckResult,
} from "./multiplicative-sets"
import { checkMultiplicativeSet } from "./multiplicative-sets"
import type {
  LocalizationRingCheckOptions,
  LocalizationRingCheckResult,
} from "./localizations"
import { buildPrimeLocalizationData, checkLocalizationRing } from "./localizations"
import type { RingIdeal } from "./ideals"
import type { Ring } from "./structures"

export interface PrimeIdealCheckOptions<A> {
  readonly ringSamples?: ReadonlyArray<A>
  readonly requireProper?: boolean
  readonly witnessLimit?: number
}

export type PrimeIdealViolation<A> =
  | {
      readonly kind: "unit"
      readonly unit: A
    }
  | {
      readonly kind: "absorbsProduct"
      readonly factors: readonly [A, A]
      readonly product: A
    }

export interface PrimeIdealWitness<A> {
  readonly product: A
  readonly factors: readonly [A, A]
}

export interface PrimeIdealCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<PrimeIdealViolation<A>>
  readonly witnesses: ReadonlyArray<PrimeIdealWitness<A>>
  readonly details: string
  readonly metadata: {
    readonly ringSampleCandidates: number
    readonly distinctRingSamples: number
    readonly pairChecks: number
    readonly requireProper: boolean
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

const defaultEquality = <A>(ring: Ring<A>): ((left: A, right: A) => boolean) =>
  ring.eq ?? ((left, right) => Object.is(left, right))

const uniqueWith = <A>(values: ReadonlyArray<A>, eq: (left: A, right: A) => boolean): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

const buildPairs = <A>(samples: ReadonlyArray<A>): ReadonlyArray<readonly [A, A]> => {
  const result: Array<readonly [A, A]> = []
  for (const left of samples) {
    for (const right of samples) {
      result.push([left, right])
    }
  }
  return result
}

export const checkPrimeIdeal = <A>(
  ideal: RingIdeal<A>,
  options: PrimeIdealCheckOptions<A> = {},
): PrimeIdealCheckResult<A> => {
  const ring = ideal.ring
  const eq = defaultEquality(ring)
  const sampleCandidates = options.ringSamples ?? []
  const samples = uniqueWith(sampleCandidates, eq)
  const requireProper = options.requireProper ?? true
  const witnessLimit = options.witnessLimit ?? 1

  const violations: PrimeIdealViolation<A>[] = []
  const witnesses: PrimeIdealWitness<A>[] = []

  if (requireProper && ideal.contains(ring.one)) {
    violations.push({ kind: "unit", unit: ring.one })
  }

  let pairChecks = 0
  for (const [left, right] of buildPairs(samples)) {
    pairChecks += 1
    const product = ring.mul(left, right)
    if (!ideal.contains(product)) {
      continue
    }
    if (ideal.contains(left) || ideal.contains(right)) {
      continue
    }

    const violation: PrimeIdealViolation<A> = {
      kind: "absorbsProduct",
      factors: [left, right],
      product,
    }
    violations.push(violation)

    if (witnesses.length < witnessLimit) {
      witnesses.push({ product, factors: [left, right] })
    }
  }

  const holds = violations.length === 0
  const describeViolation = (violation: PrimeIdealViolation<A>): string =>
    violation.kind === "unit"
      ? "ideal contains the multiplicative identity"
      : "product ab in ideal while a and b are outside"
  const details = holds
    ? `Prime ideal verified on ${samples.length} distinct ring samples.`
    : `Prime ideal violations: ${violations.map(describeViolation).join("; ")}.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      ringSampleCandidates: sampleCandidates.length,
      distinctRingSamples: samples.length,
      pairChecks,
      requireProper,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

export interface PrimeLocalizationCheckOptions<A> {
  readonly ringSamples?: ReadonlyArray<A>
  readonly prime?: PrimeIdealCheckOptions<A>
  readonly multiplicativeSet?: MultiplicativeSetCheckOptions<A>
  readonly localization?: LocalizationRingCheckOptions<A>
}

export type PrimeLocalizationCheckViolation<A> =
  | {
      readonly kind: "primeIdealFailure"
      readonly point: PrimeSpectrumPoint<A>
      readonly result: PrimeIdealCheckResult<A>
    }
  | {
      readonly kind: "multiplicativeSetFailure"
      readonly point: PrimeSpectrumPoint<A>
      readonly result: MultiplicativeSetCheckResult<A>
    }
  | {
      readonly kind: "multiplicativeSetRingMismatch"
      readonly point: PrimeSpectrumPoint<A>
      readonly multiplicativeSet: MultiplicativeSet<A>
    }
  | {
      readonly kind: "localizationFailure"
      readonly point: PrimeSpectrumPoint<A>
      readonly result: LocalizationRingCheckResult<A>
    }

export interface PrimeLocalizationCheckResult<A> {
  readonly point: PrimeSpectrumPoint<A>
  readonly holds: boolean
  readonly prime: PrimeIdealCheckResult<A>
  readonly multiplicativeSet?: MultiplicativeSetCheckResult<A>
  readonly localization?: LocalizationRingCheckResult<A>
  readonly violations: ReadonlyArray<PrimeLocalizationCheckViolation<A>>
  readonly details: string
  readonly metadata: {
    readonly ringSampleCandidates: number
    readonly primeChecked: boolean
    readonly multiplicativeSetChecked: boolean
    readonly localizationChecked: boolean
  }
}

export type PrimeLocalizationCheck<A> = (
  options?: PrimeLocalizationCheckOptions<A>,
) => PrimeLocalizationCheckResult<A>

/**
 * Compose prime, multiplicative-set, and localization diagnostics around a
 * {@link PrimeSpectrumPoint}. Sample catalogues in `examples/runnable/092-commutative-ring-sample-library.ts`
 * provide ready-to-use inputs for this harness via bundled prime entries.
 */
export const buildPrimeLocalizationCheck = <A>(
  point: PrimeSpectrumPoint<A>,
  multiplicativeSet: MultiplicativeSet<A>,
): PrimeLocalizationCheck<A> => {
  const describeViolation = (
    violation: PrimeLocalizationCheckViolation<A>,
  ): string => {
    switch (violation.kind) {
      case "primeIdealFailure":
        return "prime ideal check failed"
      case "multiplicativeSetFailure":
        return "multiplicative set complement failed"
      case "multiplicativeSetRingMismatch":
        return "multiplicative set ring mismatch"
      case "localizationFailure":
        return "localization ring laws failed"
      default:
        return "localization harness failure"
    }
  }

  return (options = {}) => {
    const label = point.label ?? "prime point"
    const sampleCandidates = options.ringSamples ?? point.samples ?? []
    const primeOverrides = options.prime ?? {}
    const primeOptions: PrimeIdealCheckOptions<A> = {
      ringSamples: primeOverrides.ringSamples ?? sampleCandidates,
      requireProper: primeOverrides.requireProper ?? true,
      ...(primeOverrides.witnessLimit === undefined
        ? {}
        : { witnessLimit: primeOverrides.witnessLimit }),
    }

    const primeResult = checkPrimeIdeal(point.ideal, primeOptions)
    const violations: PrimeLocalizationCheckViolation<A>[] = []
    let multiplicativeSetChecked = false
    let localizationChecked = false
    let multiplicativeResult: MultiplicativeSetCheckResult<A> | undefined
    let localizationResult: LocalizationRingCheckResult<A> | undefined

    const finalize = (holds: boolean, details: string): PrimeLocalizationCheckResult<A> => ({
      point,
      holds,
      prime: primeResult,
      ...(multiplicativeResult ? { multiplicativeSet: multiplicativeResult } : {}),
      ...(localizationResult ? { localization: localizationResult } : {}),
      violations,
      details,
      metadata: {
        ringSampleCandidates: sampleCandidates.length,
        primeChecked: true,
        multiplicativeSetChecked,
        localizationChecked,
      },
    })

    if (!primeResult.holds) {
      violations.push({ kind: "primeIdealFailure", point, result: primeResult })
      const details = `${label} localization failed: ${violations
        .map(describeViolation)
        .join("; ")}.`
      return finalize(false, details)
    }

    const multiplicativeOverrides = options.multiplicativeSet ?? {}
    const multiplicativeOptions: MultiplicativeSetCheckOptions<A> = {
      ringSamples: multiplicativeOverrides.ringSamples ?? sampleCandidates,
      requireOne: multiplicativeOverrides.requireOne ?? true,
      forbidZero: multiplicativeOverrides.forbidZero ?? true,
      ...(multiplicativeOverrides.witnessLimit === undefined
        ? {}
        : { witnessLimit: multiplicativeOverrides.witnessLimit }),
    }

    multiplicativeResult = checkMultiplicativeSet(multiplicativeSet, multiplicativeOptions)
    multiplicativeSetChecked = true

    if (!multiplicativeResult.holds) {
      violations.push({ kind: "multiplicativeSetFailure", point, result: multiplicativeResult })
      const details = `${label} localization failed: ${violations
        .map(describeViolation)
        .join("; ")}.`
      return finalize(false, details)
    }

    const built = buildPrimeLocalizationData(point, multiplicativeSet)
    if (built.kind !== "success") {
      violations.push({ kind: "multiplicativeSetRingMismatch", point, multiplicativeSet })
      const details = `${label} localization failed: ${violations
        .map(describeViolation)
        .join("; ")}.`
      return finalize(false, details)
    }

    const localizationOverrides = options.localization ?? {}
    const localizationFallback = sampleCandidates
    const localizationOptions: LocalizationRingCheckOptions<A> = {
      numeratorSamples: localizationOverrides.numeratorSamples ?? localizationFallback,
      denominatorSamples: localizationOverrides.denominatorSamples ?? localizationFallback,
      multiplierSamples: localizationOverrides.multiplierSamples ?? localizationFallback,
      ...(localizationOverrides.fractionSamples
        ? { fractionSamples: localizationOverrides.fractionSamples }
        : {}),
      ...(localizationOverrides.witnessLimit === undefined
        ? {}
        : { witnessLimit: localizationOverrides.witnessLimit }),
    }

    localizationResult = checkLocalizationRing(built.data, localizationOptions)
    localizationChecked = true

    if (!localizationResult.holds) {
      violations.push({ kind: "localizationFailure", point, result: localizationResult })
    }

    const holds = violations.length === 0
    const successFractions = localizationResult?.metadata.fractionSamples ?? 0
    const details = holds
      ? `${label} localization succeeded across ${successFractions} sampled fraction${
          successFractions === 1 ? "" : "s"
        }.`
      : `${label} localization failed: ${violations.map(describeViolation).join("; ")}.`

    return finalize(holds, details)
  }
}

export const checkLocalRingAtPrime = <A>(
  point: PrimeSpectrumPoint<A>,
  multiplicativeSet: MultiplicativeSet<A>,
  options?: PrimeLocalizationCheckOptions<A>,
): PrimeLocalizationCheckResult<A> => buildPrimeLocalizationCheck(point, multiplicativeSet)(options)
