import type { LocalizationFraction } from "../algebra/ring/localizations"
import { buildPrimeLocalizationData } from "../algebra/ring/localizations"
import type { PrimePointSample, RingSample } from "../algebra/ring/samples"
import { CommutativeRingSamples } from "../algebra/ring/samples"
import type { Ring } from "../algebra/ring/structures"
import type { SchemeChart } from "./global-schemes"
import type { PrimeSpectrum } from "./prime-spectrum"
import type {
  StructureSheafArrow,
  StructureSheafCovering,
  StructureSheafData,
  StructureSheafOpen,
} from "./structure-sheaf"

type Equality<A> = (left: A, right: A) => boolean

const withEquality = <A>(eq?: Equality<A>): Equality<A> => eq ?? ((left, right) => Object.is(left, right))

const dedupe = <A>(values: ReadonlyArray<A>, eq: Equality<A>): A[] => {
  const result: A[] = []
  values.forEach(value => {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  })
  return result
}

const dedupeFractions = <A>(
  values: ReadonlyArray<LocalizationFraction<A>>,
  eq: Equality<A>,
): LocalizationFraction<A>[] => {
  const result: LocalizationFraction<A>[] = []
  values.forEach(value => {
    if (
      !result.some(
        existing => eq(existing.numerator, value.numerator) && eq(existing.denominator, value.denominator),
      )
    ) {
      result.push(value)
    }
  })
  return result
}

const sanitizeFragment = (label: string): string => {
  const trimmed = label.trim()
  if (trimmed.length === 0) {
    return ""
  }
  const sanitized = trimmed.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return sanitized
}

const buildFractionSamples = <A>(
  ring: Ring<A>,
  localizationHint?: PrimePointSample<A>["localization"],
): LocalizationFraction<A>[] => {
  const eq = withEquality(ring.eq)
  if (!localizationHint) {
    return [
      { numerator: ring.zero, denominator: ring.one },
      { numerator: ring.one, denominator: ring.one },
    ]
  }

  const options = localizationHint.options
  if (!options) {
    return [
      { numerator: ring.zero, denominator: ring.one },
      { numerator: ring.one, denominator: ring.one },
    ]
  }

  const fractions: LocalizationFraction<A>[] = []
  if (options.fractionSamples) {
    fractions.push(...options.fractionSamples)
  }

  const denominators = options.denominatorSamples && options.denominatorSamples.length > 0
    ? options.denominatorSamples
    : [ring.one]

  if (options.numeratorSamples) {
    options.numeratorSamples.forEach(numerator => {
      denominators.forEach(denominator => {
        fractions.push({ numerator, denominator })
      })
    })
  }

  fractions.push({ numerator: ring.zero, denominator: ring.one })
  fractions.push({ numerator: ring.one, denominator: ring.one })

  return dedupeFractions(fractions, eq)
}

const buildGlobalOpen = <A>(sample: RingSample<A>): StructureSheafOpen<A> => {
  const ring = sample.ring
  const eq = withEquality(ring.eq)
  const numeratorCandidates = dedupe([ring.zero, ring.one, ...sample.ringSamples], eq)
  const sections = numeratorCandidates.map(value => ({ numerator: value, denominator: ring.one }))

  return {
    id: "Spec",
    label: sample.label ? `Spec ${sample.label}` : "Spec",
    localization: {
      base: ring,
      multiplicativeSet: {
        ring,
        contains: (value) => eq(value, ring.one),
        label: "⟨1⟩",
      },
    },
    sections,
    localizationOptions: {
      numeratorSamples: numeratorCandidates,
      denominatorSamples: [ring.one],
      fractionSamples: sections,
    },
  }
}

const buildOpenFromPrimeSample = <A>(
  index: number,
  sample: PrimePointSample<A>,
  ring: Ring<A>,
): StructureSheafOpen<A> | undefined => {
  const localization = buildPrimeLocalizationData(sample.point, sample.complement)
  if (localization.kind !== "success") {
    return undefined
  }

  const labelBase = sample.point.label ?? `p${index}`
  const cleanedLabel = labelBase.replace(/[()]/g, "")
  const fragment = sanitizeFragment(cleanedLabel)
  const id = fragment.length > 0 ? `D-${fragment}` : `D-${index}`
  const displayLabel = `D(${cleanedLabel.length > 0 ? cleanedLabel : index.toString()})`

  return {
    id,
    label: displayLabel,
    localization: sample.localization?.data ?? localization.data,
    sections: buildFractionSamples(ring, sample.localization),
    ...(sample.localization?.options ? { localizationOptions: sample.localization.options } : {}),
  }
}

const buildIdentityArrow = <A>(open: StructureSheafOpen<A>): StructureSheafArrow<A> => ({
  id: `id-${open.id}`,
  from: open.id,
  to: open.id,
  label: `id_${open.label ?? open.id}`,
  map: (section) => ({ ...section }),
  ringLawSamples: open.sections.slice(0, 4),
})

const buildRestrictionArrow = <A>(
  target: StructureSheafOpen<A>,
  domain: StructureSheafOpen<A>,
): StructureSheafArrow<A> => ({
  id: `res-${target.id}-${domain.id}`,
  from: domain.id,
  to: target.id,
  label: `${domain.label ?? domain.id} ⊆ ${target.label ?? target.id}`,
  sectionSamples: target.sections.slice(0, 4),
  ringLawSamples: domain.sections.slice(0, 4),
  map: (section) => ({ numerator: section.numerator, denominator: section.denominator }),
})

const buildIdentityCovering = <A>(open: StructureSheafOpen<A>): StructureSheafCovering<A> => ({
  id: `cov-${open.id}`,
  target: open.id,
  arrowIds: [`id-${open.id}`],
  label: `{${open.label ?? open.id}} → ${open.label ?? open.id}`,
})

const buildGlobalCovering = <A>(
  globalOpen: StructureSheafOpen<A>,
  restrictionArrows: ReadonlyArray<StructureSheafArrow<A>>,
): StructureSheafCovering<A> | undefined => {
  if (restrictionArrows.length === 0) {
    return undefined
  }
  return {
    id: `cov-${globalOpen.id}-principal`,
    target: globalOpen.id,
    arrowIds: restrictionArrows.map(arrow => arrow.id),
    label: `${globalOpen.label ?? globalOpen.id} principal covering`,
  }
}

export const buildStructureSheafFromRingSample = <A>(sample: RingSample<A>): StructureSheafData<A> => {
  const globalOpen = buildGlobalOpen(sample)
  const primeOpens = sample.primePoints
    .map((primeSample, index) => buildOpenFromPrimeSample(index, primeSample, sample.ring))
    .filter((open): open is StructureSheafOpen<A> => open !== undefined)

  const opens: StructureSheafOpen<A>[] = [globalOpen, ...primeOpens]
  const identityArrows = opens.map(buildIdentityArrow)
  const restrictionArrows = primeOpens.map(open => buildRestrictionArrow(globalOpen, open))
  const arrows: StructureSheafArrow<A>[] = [...identityArrows, ...restrictionArrows]

  const coverings: StructureSheafCovering<A>[] = opens.map(buildIdentityCovering)
  const globalCovering = buildGlobalCovering(globalOpen, restrictionArrows)
  if (globalCovering) {
    coverings.push(globalCovering)
  }

  return {
    ring: sample.ring,
    ...(sample.label ? { label: `Structure sheaf of Spec ${sample.label}` } : {}),
    opens,
    arrows,
    coverings,
  }
}

export const buildSpectrumFromRingSample = <A>(sample: RingSample<A>): PrimeSpectrum<A> => ({
  ring: sample.ring,
  points: sample.primeSpectrum,
  label: sample.label ? `Spec ${sample.label}` : "Prime spectrum",
})

export const buildSchemeChartFromRingSample = <A>(sample: RingSample<A>): SchemeChart<A> => {
  const spectrum = buildSpectrumFromRingSample(sample)
  const structureSheaf = buildStructureSheafFromRingSample(sample)

  const structureOptions = structureSheaf.opens[0]?.localizationOptions

  return {
    spectrum,
    structureSheaf,
    ...(spectrum.label ? { label: spectrum.label } : {}),
    options: {
      spectrum: { ringSamples: sample.ringSamples },
      ...(structureOptions ? { structureSheaf: { localization: structureOptions } } : {}),
    },
  }
}

export interface AffineSchemeSample<A> {
  readonly chart: SchemeChart<A>
  readonly label: string
  readonly description: string
}

export type AffineSchemeLibrary = Readonly<Record<string, AffineSchemeSample<any>>>

const buildAffineSchemeSample = <A>(
  sample: RingSample<A>,
  label: string,
  description: string,
): AffineSchemeSample<A> => ({
  chart: buildSchemeChartFromRingSample(sample),
  label,
  description,
})

export const AffineSchemeExamples = {
  specIntegers: buildAffineSchemeSample(
    CommutativeRingSamples.integers.ring,
    "Spec ℤ",
    "Affine scheme of the integers with canonical localization charts.",
  ),
  specDualNumbers: buildAffineSchemeSample(
    CommutativeRingSamples.dualNumbersOverZ.ring,
    "Spec ℤ[ε]/(ε²)",
    "Dual-number spectrum with localizations at ε and arithmetic primes.",
  ),
  specFiniteField5: buildAffineSchemeSample(
    CommutativeRingSamples.finiteField5.ring,
    "Spec 𝔽₅",
    "Finite field spectrum realised as the single-point affine scheme Spec 𝔽₅.",
  ),
} as const satisfies AffineSchemeLibrary

