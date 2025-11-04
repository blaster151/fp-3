import type { RingIdeal } from "../algebra/ring/ideals"
import { createModuloRing, RingInteger } from "../algebra/ring/instances"
import type { LocalizationFraction } from "../algebra/ring/localizations"
import type { Ring } from "../algebra/ring/structures"
import type { SchemeChart } from "./global-schemes"
import type { PrimeSpectrum, PrimeSpectrumPoint } from "./prime-spectrum"
import type {
  StructureSheafArrow,
  StructureSheafCovering,
  StructureSheafData,
  StructureSheafOpen,
} from "./structure-sheaf"

const withEquality = <A>(ring: Ring<A>): ((left: A, right: A) => boolean) =>
  ring.eq ?? ((left, right) => Object.is(left, right))

const uniqueWith = <A>(values: ReadonlyArray<A>, eq: (left: A, right: A) => boolean): A[] => {
  const result: A[] = []
  values.forEach(value => {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  })
  return result
}

const buildConstantFractions = <A>(ring: Ring<A>, samples: ReadonlyArray<A>): LocalizationFraction<A>[] => {
  const eq = withEquality(ring)
  const candidates = uniqueWith([ring.zero, ring.one, ...samples], eq)
  return candidates.map(value => ({ numerator: value, denominator: ring.one }))
}

const isDivisibleBy = (value: bigint, generator: bigint): boolean => {
  if (generator === 0n) {
    return value === 0n
  }
  return value % generator === 0n
}

const principalIdealInZ = (generator: bigint, label: string): RingIdeal<bigint> => ({
  ring: RingInteger,
  contains: value => isDivisibleBy(value, generator),
  name: label,
})

const buildSpectrumPoint = (
  generator: bigint,
  label: string,
  samples: ReadonlyArray<bigint>,
): PrimeSpectrumPoint<bigint> => ({
  ideal: principalIdealInZ(generator, label),
  label,
  samples,
})

const buildSpecZSpectrum = (): PrimeSpectrum<bigint> => ({
  ring: RingInteger,
  label: "Spec ℤ",
  points: [
    buildSpectrumPoint(0n, "(0)", [0n, 1n, -1n, 2n]),
    buildSpectrumPoint(2n, "(2)", [0n, 2n, -2n, 1n, 3n]),
    buildSpectrumPoint(3n, "(3)", [0n, 3n, -3n, 1n, 2n]),
  ],
})

const buildSpecZStructureSheaf = (): StructureSheafData<bigint> => {
  const eq = withEquality(RingInteger)

  const globalOpen: StructureSheafOpen<bigint> = {
    id: "SpecZ",
    label: "Spec ℤ",
    localization: {
      base: RingInteger,
      multiplicativeSet: {
        ring: RingInteger,
        contains: value => eq(value, RingInteger.one),
        label: "⟨1⟩",
      },
    },
    sections: buildConstantFractions(RingInteger, [0n, 1n, -1n, 2n]),
    localizationOptions: {
      numeratorSamples: [0n, 1n, -1n, 2n],
      denominatorSamples: [RingInteger.one],
      fractionSamples: [
        { numerator: 0n, denominator: RingInteger.one },
        { numerator: 1n, denominator: RingInteger.one },
      ],
    },
  }

  const complementOf2 = {
    ring: RingInteger,
    contains: (value: bigint) => value % 2n !== 0n,
    label: "ℤ \\ (2)",
  }

  const d2Sections = uniqueWith(
    [
      { numerator: 0n, denominator: RingInteger.one },
      { numerator: 1n, denominator: RingInteger.one },
      { numerator: 1n, denominator: 3n },
    ],
    (left, right) => left.numerator === right.numerator && left.denominator === right.denominator,
  )

  const d2Open: StructureSheafOpen<bigint> = {
    id: "D-2",
    label: "D(2)",
    localization: {
      base: RingInteger,
      multiplicativeSet: complementOf2,
    },
    sections: d2Sections,
    localizationOptions: {
      numeratorSamples: [0n, 1n, -1n, 2n, 3n],
      denominatorSamples: [RingInteger.one, 3n],
      multiplierSamples: [RingInteger.one, 3n],
      fractionSamples: [
        { numerator: 0n, denominator: RingInteger.one },
        { numerator: 1n, denominator: RingInteger.one },
        { numerator: 1n, denominator: 3n },
      ],
    },
  }

  const identity = (open: StructureSheafOpen<bigint>): StructureSheafArrow<bigint> => ({
    id: `id-${open.id}`,
    from: open.id,
    to: open.id,
    label: `id_${open.label ?? open.id}`,
    map: section => ({ ...section }),
    ringLawSamples: open.sections.slice(0, 4),
  })

  const restriction: StructureSheafArrow<bigint> = {
    id: `res-${globalOpen.id}-${d2Open.id}`,
    from: d2Open.id,
    to: globalOpen.id,
    label: `${d2Open.label ?? d2Open.id} ⊆ ${globalOpen.label ?? globalOpen.id}`,
    sectionSamples: globalOpen.sections.slice(0, 4),
    ringLawSamples: d2Sections.slice(0, 4),
    map: section => ({ numerator: section.numerator, denominator: section.denominator }),
  }

  const identityCovering = (open: StructureSheafOpen<bigint>): StructureSheafCovering<bigint> => ({
    id: `cov-${open.id}`,
    target: open.id,
    arrowIds: [`id-${open.id}`],
    label: `{${open.label ?? open.id}} → ${open.label ?? open.id}`,
  })

  const principalCovering: StructureSheafCovering<bigint> = {
    id: `cov-${globalOpen.id}-principal`,
    target: globalOpen.id,
    arrowIds: [restriction.id],
    label: `${globalOpen.label ?? globalOpen.id} principal covering`,
  }

  return {
    ring: RingInteger,
    label: "Structure sheaf of Spec ℤ",
    opens: [globalOpen, d2Open],
    arrows: [identity(globalOpen), identity(d2Open), restriction],
    coverings: [identityCovering(globalOpen), identityCovering(d2Open), principalCovering],
  }
}

const buildSpecZChart = (): SchemeChart<bigint> => ({
  spectrum: buildSpecZSpectrum(),
  structureSheaf: buildSpecZStructureSheaf(),
  label: "Spec ℤ",
  options: {
    spectrum: {
      ringSamples: [0n, 1n, -1n, 2n, 3n],
      witnessLimit: 4,
    },
    structureSheaf: {
      localization: {
        numeratorSamples: [0n, 1n, -1n, 2n, 3n],
        denominatorSamples: [RingInteger.one, 3n],
        multiplierSamples: [RingInteger.one, 3n],
      },
    },
  },
})

const buildSpecF5Spectrum = (ring: Ring<bigint>): PrimeSpectrum<bigint> => {
  const eq = withEquality(ring)
  const zeroIdeal: RingIdeal<bigint> = {
    ring,
    contains: value => eq(value, ring.zero),
    name: "(0)",
  }

  return {
    ring,
    label: "Spec 𝔽₅",
    points: [
      {
        ideal: zeroIdeal,
        label: "(0)",
        samples: [0n, 1n, 2n, 3n, 4n],
      },
    ],
  }
}

const buildSpecF5StructureSheaf = (ring: Ring<bigint>): StructureSheafData<bigint> => {
  const eq = withEquality(ring)
  const sections = buildConstantFractions(ring, [0n, 1n, 2n, 3n, 4n])

  const globalOpen: StructureSheafOpen<bigint> = {
    id: "SpecF5",
    label: "Spec 𝔽₅",
    localization: {
      base: ring,
      multiplicativeSet: {
        ring,
        contains: value => eq(value, ring.one),
        label: "⟨1⟩",
      },
    },
    sections,
    localizationOptions: {
      numeratorSamples: [0n, 1n, 2n, 3n, 4n],
      denominatorSamples: [ring.one],
      fractionSamples: sections,
    },
  }

  const identityArrow: StructureSheafArrow<bigint> = {
    id: `id-${globalOpen.id}`,
    from: globalOpen.id,
    to: globalOpen.id,
    label: `id_${globalOpen.label ?? globalOpen.id}`,
    map: section => ({ ...section }),
    ringLawSamples: sections.slice(0, 4),
  }

  const identityCovering: StructureSheafCovering<bigint> = {
    id: `cov-${globalOpen.id}`,
    target: globalOpen.id,
    arrowIds: [identityArrow.id],
    label: `{${globalOpen.label ?? globalOpen.id}} → ${globalOpen.label ?? globalOpen.id}`,
  }

  return {
    ring,
    label: "Structure sheaf of Spec 𝔽₅",
    opens: [globalOpen],
    arrows: [identityArrow],
    coverings: [identityCovering],
  }
}

const buildSpecF5Chart = (): SchemeChart<bigint> => {
  const ring = createModuloRing(5n)
  const spectrum = buildSpecF5Spectrum(ring)
  const structureSheaf = buildSpecF5StructureSheaf(ring)
  return {
    spectrum,
    structureSheaf,
  label: spectrum.label ?? "Spec",
    options: {
      spectrum: { ringSamples: [0n, 1n, 2n, 3n, 4n] },
      structureSheaf: {
        localization: {
          numeratorSamples: [0n, 1n, 2n, 3n, 4n],
          denominatorSamples: [structureSheaf.ring.one],
          fractionSamples: structureSheaf.opens[0]?.sections ?? [],
        },
      },
    },
  }
}

export interface SchemeChartExample<A> {
  readonly chart: SchemeChart<A>
  readonly label: string
  readonly description: string
}

export const SchemeChartExamples = {
  specIntegers: {
    chart: buildSpecZChart(),
    label: "Spec ℤ",
    description: "Affine scheme of the integers with localisation at the complement of (2).",
  } satisfies SchemeChartExample<bigint>,
  specFiniteField5: {
    chart: buildSpecF5Chart(),
    label: "Spec 𝔽₅",
    description: "Single-chart affine scheme for the finite field with five elements.",
  } satisfies SchemeChartExample<bigint>,
} as const

type SchemeChartExamplesType = typeof SchemeChartExamples

export type SchemeChartExampleKey = keyof SchemeChartExamplesType

export const schemeChartList: ReadonlyArray<SchemeChartExamplesType[keyof SchemeChartExamplesType]> =
  Object.values(SchemeChartExamples) as ReadonlyArray<SchemeChartExamplesType[keyof SchemeChartExamplesType]>
