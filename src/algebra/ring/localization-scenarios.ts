import type { PrimeSpectrum, PrimeSpectrumPoint } from "../../schemes/prime-spectrum"
import { primeComplementMultiplicativeSet } from "../../schemes/prime-spectrum"
import type {
  LocalizationRingCheckOptions,
  LocalizationRingCheckResult,
  LocalizationRingData,
} from "./localizations"
import { checkLocalizationRing } from "./localizations"
import type { MultiplicativeSet } from "./multiplicative-sets"
import type { Ring } from "./structures"

export interface PrimeLocalizationScenario<A> {
  readonly spectrum: PrimeSpectrum<A>
  readonly point: PrimeSpectrumPoint<A>
  readonly multiplicativeSet: MultiplicativeSet<A>
  readonly localization: LocalizationRingData<A>
  readonly label: string
  readonly numeratorSamples?: ReadonlyArray<A>
  readonly denominatorSamples?: ReadonlyArray<A>
}

const ensurePrimePoint = <A>(spectrum: PrimeSpectrum<A>, point: PrimeSpectrumPoint<A>): void => {
  if (point.ideal.ring !== spectrum.ring) {
    throw new Error("PrimeLocalizationScenario: point ideal does not belong to the supplied spectrum ring.")
  }
}

export const buildPrimeLocalizationScenario = <A>(
  spectrum: PrimeSpectrum<A>,
  point: PrimeSpectrumPoint<A>,
): PrimeLocalizationScenario<A> => {
  ensurePrimePoint(spectrum, point)
  const multiplicativeSet = primeComplementMultiplicativeSet(spectrum, point)
  const localization: LocalizationRingData<A> = {
    base: spectrum.ring,
    multiplicativeSet,
  }
  const samples = point.samples ?? []
  const label = point.label ?? "prime localization"
  return {
    spectrum,
    point,
    multiplicativeSet,
    localization,
    label,
    numeratorSamples: samples,
    denominatorSamples: samples,
  }
}

export interface PrimeLocalizationAnalysis<A> {
  readonly scenario: PrimeLocalizationScenario<A>
  readonly result: LocalizationRingCheckResult<A>
}

export interface PrimeLocalizationAnalysisOptions<A> {
  readonly localization?: LocalizationRingCheckOptions<A>
}

const resolveSampleOption = <A>(
  explicit: ReadonlyArray<A> | undefined,
  fallback: ReadonlyArray<A> | undefined,
): ReadonlyArray<A> | undefined => {
  if (explicit && explicit.length > 0) {
    return explicit
  }
  if (fallback && fallback.length > 0) {
    return fallback
  }
  return undefined
}

export const analyzePrimeLocalization = <A>(
  scenario: PrimeLocalizationScenario<A>,
  options: PrimeLocalizationAnalysisOptions<A> = {},
): PrimeLocalizationAnalysis<A> => {
  const localizationOptions = options.localization ?? {}
  const numeratorSamples =
    resolveSampleOption(localizationOptions.numeratorSamples, scenario.numeratorSamples) ?? []
  const denominatorSamples =
    resolveSampleOption(localizationOptions.denominatorSamples, scenario.denominatorSamples) ?? []
  const analysisOptions: LocalizationRingCheckOptions<A> = {
    ...localizationOptions,
    numeratorSamples,
    denominatorSamples,
  }
  const result = checkLocalizationRing(scenario.localization, analysisOptions)
  return { scenario, result }
}

export const localizedRingData = <A>(
  ring: Ring<A>,
  multiplicativeSet: MultiplicativeSet<A>,
): LocalizationRingData<A> => ({
  base: ring,
  multiplicativeSet,
})
