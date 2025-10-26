import type { MultiplicativeSet, MultiplicativeSetCheckOptions, MultiplicativeSetCheckResult, MultiplicativeSetWitness } from "../algebra/ring/multiplicative-sets"
import { checkMultiplicativeSet } from "../algebra/ring/multiplicative-sets"
import type {
  LocalizationRingCheckOptions,
  LocalizationRingCheckResult,
  LocalizationRingData,
  LocalizationRingWitness,
} from "../algebra/ring/localizations"
import { checkLocalizationRing } from "../algebra/ring/localizations"
import type { RingIdeal } from "../algebra/ring/ideals"
import type {
  PrimeIdealCheckOptions,
  PrimeIdealCheckResult,
  PrimeIdealViolation,
  PrimeIdealWitness,
} from "../algebra/ring/prime-ideals"
import { checkPrimeIdeal } from "../algebra/ring/prime-ideals"
import type { Ring } from "../algebra/ring/structures"

export interface PrimeSpectrumPoint<A> {
  readonly ideal: RingIdeal<A>
  readonly label?: string
  readonly samples?: ReadonlyArray<A>
}

export interface PrimeSpectrum<A> {
  readonly ring: Ring<A>
  readonly points: ReadonlyArray<PrimeSpectrumPoint<A>>
  readonly label?: string
}

export interface PrimeSpectrumCheckOptions<A> extends PrimeIdealCheckOptions<A> {
  readonly ringSamples?: ReadonlyArray<A>
  readonly witnessLimit?: number
}

export type PrimeSpectrumViolation<A> =
  | { readonly kind: "idealRingMismatch"; readonly index: number; readonly point: PrimeSpectrumPoint<A> }
  | {
      readonly kind: "idealNotPrime"
      readonly index: number
      readonly point: PrimeSpectrumPoint<A>
      readonly result: PrimeIdealCheckResult<A>
    }

export interface PrimeSpectrumWitness<A> {
  readonly index: number
  readonly point: PrimeSpectrumPoint<A>
  readonly witness?: PrimeIdealWitness<A>
  readonly violation?: PrimeIdealViolation<A>
}

export interface PrimeSpectrumCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<PrimeSpectrumViolation<A>>
  readonly witnesses: ReadonlyArray<PrimeSpectrumWitness<A>>
  readonly details: string
  readonly metadata: {
    readonly pointCount: number
    readonly ringSampleCandidates: number
    readonly primeChecks: number
    readonly primeFailures: number
    readonly requireProper: boolean
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

const defaultPrimeSamples = <A>(point: PrimeSpectrumPoint<A>, options: PrimeSpectrumCheckOptions<A>): ReadonlyArray<A> => {
  if (point.samples && point.samples.length > 0) {
    return point.samples
  }
  return options.ringSamples ?? []
}

export const checkPrimeSpectrum = <A>(
  spectrum: PrimeSpectrum<A>,
  options: PrimeSpectrumCheckOptions<A> = {},
): PrimeSpectrumCheckResult<A> => {
  const witnessLimit = options.witnessLimit ?? 4
  const requireProper = options.requireProper ?? true
  const ringSamples = options.ringSamples ?? []

  const violations: PrimeSpectrumViolation<A>[] = []
  const witnesses: PrimeSpectrumWitness<A>[] = []

  let primeFailures = 0

  spectrum.points.forEach((point, index) => {
    if (point.ideal.ring !== spectrum.ring) {
      const violation: PrimeSpectrumViolation<A> = {
        kind: "idealRingMismatch",
        index,
        point,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ index, point })
      }
      return
    }

    const samples = defaultPrimeSamples(point, options)
    const primeOptions: PrimeIdealCheckOptions<A> = {
      ringSamples: samples,
      requireProper,
      witnessLimit: options.witnessLimit,
    }

    const result = checkPrimeIdeal(point.ideal, primeOptions)
    if (!result.holds) {
      primeFailures += 1
      violations.push({ kind: "idealNotPrime", index, point, result })
      if (witnesses.length < witnessLimit) {
        const violation = result.violations[0]
        witnesses.push({ index, point, violation })
      }
      return
    }

    if (result.witnesses.length > 0 && witnesses.length < witnessLimit) {
      const witness = result.witnesses[0]
      witnesses.push({ index, point, witness })
    }
  })

  const holds = violations.length === 0
  const detailLabel = spectrum.label ?? "prime spectrum"
  const details = holds
    ? `${detailLabel} validated across ${spectrum.points.length} prime ideal${
        spectrum.points.length === 1 ? "" : "s"
      }.`
    : `${detailLabel} failed ${primeFailures} prime ideal check${primeFailures === 1 ? "" : "s"}.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      pointCount: spectrum.points.length,
      ringSampleCandidates: ringSamples.length,
      primeChecks: spectrum.points.length,
      primeFailures,
      requireProper,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

export const primeComplementMultiplicativeSet = <A>(
  spectrum: PrimeSpectrum<A>,
  point: PrimeSpectrumPoint<A>,
): MultiplicativeSet<A> => ({
  ring: spectrum.ring,
  contains: (value) => !point.ideal.contains(value),
  label: point.label ? `S_${point.label}` : "prime complement",
})

export interface PrimeStalkCheckOptions<A> {
  readonly ringSamples?: ReadonlyArray<A>
  readonly multiplicativeSet?: MultiplicativeSetCheckOptions<A>
  readonly localization?: LocalizationRingCheckOptions<A>
  readonly witnessLimit?: number
}

export type PrimeStalkViolation<A> =
  | { readonly kind: "idealRingMismatch"; readonly index: number; readonly point: PrimeSpectrumPoint<A> }
  | {
      readonly kind: "multiplicativeSetFailure"
      readonly index: number
      readonly point: PrimeSpectrumPoint<A>
      readonly result: MultiplicativeSetCheckResult<A>
    }
  | {
      readonly kind: "localizationFailure"
      readonly index: number
      readonly point: PrimeSpectrumPoint<A>
      readonly result: LocalizationRingCheckResult<A>
    }

export interface PrimeStalkWitness<A> {
  readonly index: number
  readonly point: PrimeSpectrumPoint<A>
  readonly multiplicativeSetWitness?: MultiplicativeSetWitness<A>
  readonly localizationWitness?: LocalizationRingWitness<A>
}

export interface PrimeStalkCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<PrimeStalkViolation<A>>
  readonly witnesses: ReadonlyArray<PrimeStalkWitness<A>>
  readonly details: string
  readonly metadata: {
    readonly pointCount: number
    readonly ringSampleCandidates: number
    readonly multiplicativeSetChecks: number
    readonly localizationChecks: number
    readonly multiplicativeSetFailures: number
    readonly localizationFailures: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

const mergeMultiplicativeSetOptions = <A>(
  point: PrimeSpectrumPoint<A>,
  options: PrimeStalkCheckOptions<A>,
): MultiplicativeSetCheckOptions<A> => {
  const ringSamples = point.samples && point.samples.length > 0 ? point.samples : options.ringSamples
  const base: MultiplicativeSetCheckOptions<A> = {
    ringSamples,
    requireOne: true,
    forbidZero: true,
  }
  if (!options.multiplicativeSet) {
    return base
  }
  return {
    ...base,
    ...options.multiplicativeSet,
    ringSamples: options.multiplicativeSet.ringSamples ?? base.ringSamples,
    requireOne: options.multiplicativeSet.requireOne ?? true,
    forbidZero: options.multiplicativeSet.forbidZero ?? true,
  }
}

const mergeLocalizationOptions = <A>(
  point: PrimeSpectrumPoint<A>,
  options: PrimeStalkCheckOptions<A>,
): LocalizationRingCheckOptions<A> => {
  const fallback = point.samples ?? options.ringSamples ?? []
  if (!options.localization) {
    return {
      numeratorSamples: fallback,
      denominatorSamples: fallback,
      multiplierSamples: fallback,
    }
  }
  return {
    numeratorSamples: options.localization.numeratorSamples ?? fallback,
    denominatorSamples: options.localization.denominatorSamples ?? fallback,
    multiplierSamples: options.localization.multiplierSamples ?? fallback,
    fractionSamples: options.localization.fractionSamples,
    witnessLimit: options.localization.witnessLimit,
  }
}

export const checkPrimeStalks = <A>(
  spectrum: PrimeSpectrum<A>,
  options: PrimeStalkCheckOptions<A> = {},
): PrimeStalkCheckResult<A> => {
  const witnessLimit = options.witnessLimit ?? 4
  const ringSamples = options.ringSamples ?? []

  const violations: PrimeStalkViolation<A>[] = []
  const witnesses: PrimeStalkWitness<A>[] = []

  let multiplicativeSetChecks = 0
  let localizationChecks = 0
  let multiplicativeSetFailures = 0
  let localizationFailures = 0

  spectrum.points.forEach((point, index) => {
    if (point.ideal.ring !== spectrum.ring) {
      violations.push({ kind: "idealRingMismatch", index, point })
      if (witnesses.length < witnessLimit) {
        witnesses.push({ index, point })
      }
      return
    }

    const complement = primeComplementMultiplicativeSet(spectrum, point)
    const multiplicativeOptions = mergeMultiplicativeSetOptions(point, options)

    const multiplicativeResult = checkMultiplicativeSet(complement, multiplicativeOptions)
    multiplicativeSetChecks += 1
    if (!multiplicativeResult.holds) {
      multiplicativeSetFailures += 1
      violations.push({ kind: "multiplicativeSetFailure", index, point, result: multiplicativeResult })
      if (multiplicativeResult.witnesses.length > 0 && witnesses.length < witnessLimit) {
        witnesses.push({ index, point, multiplicativeSetWitness: multiplicativeResult.witnesses[0] })
      }
      return
    }

    const localizationOptions = mergeLocalizationOptions(point, options)
    const localizationData: LocalizationRingData<A> = {
      base: spectrum.ring,
      multiplicativeSet: complement,
    }

    const localizationResult = checkLocalizationRing(localizationData, localizationOptions)
    localizationChecks += 1
    if (!localizationResult.holds) {
      localizationFailures += 1
      violations.push({ kind: "localizationFailure", index, point, result: localizationResult })
      if (localizationResult.witnesses.length > 0 && witnesses.length < witnessLimit) {
        witnesses.push({ index, point, localizationWitness: localizationResult.witnesses[0] })
      }
      return
    }

    if (witnesses.length < witnessLimit) {
      const recorded = localizationResult.witnesses[0]
      if (recorded) {
        witnesses.push({ index, point, localizationWitness: recorded })
      }
    }
  })

  const holds = violations.length === 0
  const detailLabel = spectrum.label ?? "prime spectrum"
  const details = holds
    ? `${detailLabel} localization checks succeeded for all ${spectrum.points.length} stalk${
        spectrum.points.length === 1 ? "" : "s"
      }.`
    : `${detailLabel} encountered ${violations.length} localization issue${violations.length === 1 ? "" : "s"}.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      pointCount: spectrum.points.length,
      ringSampleCandidates: ringSamples.length,
      multiplicativeSetChecks,
      localizationChecks,
      multiplicativeSetFailures,
      localizationFailures,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}
