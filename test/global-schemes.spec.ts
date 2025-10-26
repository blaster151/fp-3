import { describe, expect, it } from "vitest"
import {
  RingInteger,
  checkSchemeFiberProduct,
  checkSchemeGluing,
  createModuloRing,
  normalizeMod,
  type AffineSchemeMorphism,
  type AffineSchemePullbackSquare,
  type PrimeSpectrum,
  type PrimeSpectrumPoint,
  type RingHomomorphism,
  type RingIdeal,
  type SchemeAtlas,
  type SchemeChart,
  type SchemeFiberProductDiagram,
  type StructureSheafData,
  type StructureSheafArrow,
  type StructureSheafOpen,
  type StructureSheafCovering,
  type LocalizationFraction,
} from "../allTS"

const fraction = (numerator: bigint, denominator: bigint): LocalizationFraction<bigint> => ({ numerator, denominator })

const principalIdeal = (generator: bigint, label: string): RingIdeal<bigint> => ({
  ring: RingInteger,
  contains: (value) => (generator === 0n ? value === 0n : value % generator === 0n),
  name: label,
})

const isPowerOf = (value: bigint, base: bigint): boolean => {
  if (base === 1n) {
    return value === 1n
  }
  if (value <= 0n) {
    return false
  }
  let current = value
  while (current % base === 0n) {
    current /= base
  }
  return current === 1n
}

const makePrincipalMultiplicativeSet = (generator: bigint) => ({
  ring: RingInteger,
  contains: (value: bigint) => {
    if (value === 1n) {
      return true
    }
    if (value < 0n) {
      return false
    }
    if (generator === 1n) {
      return value === 1n
    }
    return isPowerOf(value, generator)
  },
  label: `S(${generator})`,
})

const enumerateSections = (generator: bigint, numerators: ReadonlyArray<bigint>): LocalizationFraction<bigint>[] => {
  const denominators = generator === 1n ? [1n] : [1n, generator, generator * generator]
  const sections: LocalizationFraction<bigint>[] = []
  for (const numerator of numerators) {
    for (const denominator of denominators) {
      sections.push(fraction(numerator, denominator))
    }
  }
  return sections
}

const pow = (base: bigint, exponent: number): bigint => {
  let result = 1n
  for (let index = 0; index < exponent; index += 1) {
    result *= base
  }
  return result
}

const exponentOf = (value: bigint, generator: bigint): number => {
  if (value === 1n) {
    return 0
  }
  let current = value
  let exponent = 0
  while (generator !== 1n && current % generator === 0n) {
    current /= generator
    exponent += 1
  }
  if (generator === 1n) {
    return 0
  }
  if (current !== 1n) {
    throw new Error(`Value ${value.toString()} is not a power of ${generator.toString()}`)
  }
  return exponent
}

const localizeAlong = (domainGenerator: bigint, codomainGenerator: bigint) =>
  (section: LocalizationFraction<bigint>): LocalizationFraction<bigint> => {
    const exponent = exponentOf(section.denominator, codomainGenerator)
    const ratio = codomainGenerator === 0n ? 1n : domainGenerator / codomainGenerator
    const denominator = pow(domainGenerator, exponent)
    const multiplier = pow(ratio, exponent)
    return {
      numerator: section.numerator * multiplier,
      denominator,
    }
  }

const identityArrow = (section: LocalizationFraction<bigint>): LocalizationFraction<bigint> => ({ ...section })

const buildStructureSheafData = (): StructureSheafData<bigint> => {
  const numerators = [-3n, -1n, 0n, 1n, 3n]

  const opens: StructureSheafOpen<bigint>[] = [
    {
      id: "D(1)",
      label: "D(1)",
      localization: { base: RingInteger, multiplicativeSet: makePrincipalMultiplicativeSet(1n) },
      sections: enumerateSections(1n, numerators),
    },
    {
      id: "D(2)",
      label: "D(2)",
      localization: { base: RingInteger, multiplicativeSet: makePrincipalMultiplicativeSet(2n) },
      sections: enumerateSections(2n, numerators),
    },
    {
      id: "D(3)",
      label: "D(3)",
      localization: { base: RingInteger, multiplicativeSet: makePrincipalMultiplicativeSet(3n) },
      sections: enumerateSections(3n, numerators),
    },
    {
      id: "D(6)",
      label: "D(6)",
      localization: { base: RingInteger, multiplicativeSet: makePrincipalMultiplicativeSet(6n) },
      sections: enumerateSections(6n, numerators),
    },
  ]

  const arrows: StructureSheafArrow<bigint>[] = [
    {
      id: "id-1",
      from: "D(1)",
      to: "D(1)",
      map: identityArrow,
      label: "id_{D(1)}",
      ringLawSamples: [fraction(1n, 1n), fraction(3n, 1n)],
    },
    {
      id: "id-2",
      from: "D(2)",
      to: "D(2)",
      map: identityArrow,
      label: "id_{D(2)}",
      ringLawSamples: [fraction(1n, 1n), fraction(3n, 1n)],
    },
    {
      id: "id-3",
      from: "D(3)",
      to: "D(3)",
      map: identityArrow,
      label: "id_{D(3)}",
      ringLawSamples: [fraction(1n, 1n), fraction(3n, 1n)],
    },
    {
      id: "id-6",
      from: "D(6)",
      to: "D(6)",
      map: identityArrow,
      label: "id_{D(6)}",
      ringLawSamples: [fraction(1n, 1n), fraction(3n, 1n)],
    },
    {
      id: "res-6-2",
      from: "D(6)",
      to: "D(2)",
      map: localizeAlong(2n, 6n),
      label: "res_{6→2}",
      sectionSamples: [fraction(1n, 6n), fraction(3n, 6n)],
      ringLawSamples: [fraction(1n, 6n), fraction(3n, 6n)],
    },
    {
      id: "res-6-3",
      from: "D(6)",
      to: "D(3)",
      map: localizeAlong(3n, 6n),
      label: "res_{6→3}",
      sectionSamples: [fraction(1n, 6n), fraction(3n, 6n)],
      ringLawSamples: [fraction(1n, 6n), fraction(3n, 6n)],
    },
    {
      id: "res-2-1",
      from: "D(2)",
      to: "D(1)",
      map: localizeAlong(1n, 2n),
      label: "res_{2→1}",
      sectionSamples: [fraction(1n, 2n), fraction(3n, 2n)],
      ringLawSamples: [fraction(1n, 2n), fraction(3n, 2n)],
    },
    {
      id: "res-3-1",
      from: "D(3)",
      to: "D(1)",
      map: localizeAlong(1n, 3n),
      label: "res_{3→1}",
      sectionSamples: [fraction(1n, 3n), fraction(3n, 3n)],
      ringLawSamples: [fraction(1n, 3n), fraction(3n, 3n)],
    },
  ]

  const coverings: StructureSheafCovering<bigint>[] = [
    {
      id: "cover-1",
      target: "D(1)",
      arrowIds: ["res-2-1", "res-3-1"],
      label: "{D(2), D(3)} → D(1)",
    },
  ]

  const data: StructureSheafData<bigint> = {
    ring: RingInteger,
    opens,
    arrows,
    coverings,
    label: "Spec ℤ sheaf",
  }

  return data
}

const spectrumZ = (): PrimeSpectrum<bigint> => {
  const ringSamples = [-6n, -4n, -2n, -1n, 0n, 1n, 2n, 3n, 4n, 5n, 6n]
  const points: PrimeSpectrumPoint<bigint>[] = [
    { ideal: principalIdeal(0n, "(0)"), label: "(0)", samples: ringSamples },
    { ideal: principalIdeal(2n, "(2)"), label: "(2)", samples: ringSamples },
  ]
  return { ring: RingInteger, label: "Spec ℤ", points }
}

describe("global scheme infrastructure", () => {
  const ringSamples = [-6n, -4n, -2n, -1n, 0n, 1n, 2n, 3n, 4n, 5n, 6n]

  const baseSpectrum = spectrumZ()
  const structureSheaf = buildStructureSheafData()

  const baseChart: SchemeChart<bigint> = {
    spectrum: baseSpectrum,
    structureSheaf,
    label: "Chart U",
    options: {
      spectrum: { ringSamples },
      structureSheaf: {
        localization: {
          numeratorSamples: ringSamples,
          denominatorSamples: ringSamples,
          multiplierSamples: ringSamples,
        },
      },
    },
  }

  const secondChart: SchemeChart<bigint> = {
    spectrum: spectrumZ(),
    structureSheaf: buildStructureSheafData(),
    label: "Chart V",
    options: baseChart.options,
  }

  const identity: RingHomomorphism<bigint, bigint> = {
    source: RingInteger,
    target: RingInteger,
    map: (value) => value,
    label: "id_ℤ",
  }

  const forward: AffineSchemeMorphism<bigint, bigint> = {
    ringMap: identity,
    domain: secondChart.spectrum,
    codomain: baseChart.spectrum,
    label: "Chart V → Chart U",
  }

  const backward: AffineSchemeMorphism<bigint, bigint> = {
    ringMap: identity,
    domain: baseChart.spectrum,
    codomain: secondChart.spectrum,
    label: "Chart U → Chart V",
  }

  const atlas: SchemeAtlas = {
    label: "Spec ℤ glued from two charts",
    charts: [baseChart, secondChart],
    gluings: [
      {
        leftChart: 0,
        rightChart: 1,
        forward,
        backward,
        forwardOptions: { codomainSamples: ringSamples, domainSamples: ringSamples },
        backwardOptions: { codomainSamples: ringSamples, domainSamples: ringSamples },
        compatibility: { leftSamples: ringSamples, rightSamples: ringSamples },
      },
    ],
  }

  it("validates the gluing of two affine charts for Spec ℤ", () => {
    const result = checkSchemeGluing(atlas, { witnessLimit: 6 })

    expect(result.holds).toBe(true)
    expect(result.metadata.chartCount).toBe(2)
    expect(result.metadata.quasiCompact).toBe(true)
    expect(result.metadata.separatedOnSamples).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it("detects when a gluing atlas omits the induced image prime", () => {
    const truncatedSpectrum: PrimeSpectrum<bigint> = {
      ...secondChart.spectrum,
      points: secondChart.spectrum.points.slice(0, 1),
    }

    const faultyChart: SchemeChart<bigint> = { ...secondChart, spectrum: truncatedSpectrum }

    const faultyForward: AffineSchemeMorphism<bigint, bigint> = {
      ...forward,
      domain: truncatedSpectrum,
    }

    const faultyBackward: AffineSchemeMorphism<bigint, bigint> = {
      ...backward,
      codomain: truncatedSpectrum,
    }

    const faultyAtlas: SchemeAtlas = {
      ...atlas,
      charts: [baseChart, faultyChart],
      gluings: [
        {
          leftChart: 0,
          rightChart: 1,
          forward: faultyForward,
          backward: faultyBackward,
          forwardOptions: atlas.gluings[0]?.forwardOptions,
          backwardOptions: atlas.gluings[0]?.backwardOptions,
          compatibility: atlas.gluings[0]?.compatibility,
        },
      ],
    }

    const result = checkSchemeGluing(faultyAtlas, { witnessLimit: 6 })

    expect(result.holds).toBe(false)
    expect(result.metadata.forwardFailures + result.metadata.inverseFailures).toBeGreaterThan(0)
    expect(result.violations.some(violation => violation.kind === "gluingFailure")).toBe(true)
  })

  const identitySquare: AffineSchemePullbackSquare<bigint, bigint, bigint, bigint> = {
    base: baseSpectrum,
    left: { spectrum: baseSpectrum, map: identity },
    right: { spectrum: baseSpectrum, map: identity },
    apex: { spectrum: baseSpectrum, leftMap: identity, rightMap: identity },
    label: "identity pullback",
  }

  const fiberDiagram: SchemeFiberProductDiagram = {
    label: "Identity fibre product",
    entries: [
      {
        square: identitySquare,
        options: {
          baseSamples: ringSamples,
          leftSamples: ringSamples,
          rightSamples: ringSamples,
          matchingPairs: [
            { leftIndex: 0, rightIndex: 0, apexIndex: 0 },
            { leftIndex: 1, rightIndex: 1, apexIndex: 1 },
          ],
        },
      },
    ],
  }

  it("confirms fibre-product squares assemble into a global diagram", () => {
    const result = checkSchemeFiberProduct(fiberDiagram)

    expect(result.holds).toBe(true)
    expect(result.metadata.entryCount).toBe(1)
    expect(result.metadata.failureCount).toBe(0)
  })

  it("exposes fibre-product mismatches across a diagram", () => {
    const mod2Ring = createModuloRing(2n)
    const mod2Ideal: RingIdeal<bigint> = {
      ring: mod2Ring,
      contains: (value) => mod2Ring.eq?.(value, mod2Ring.zero) ?? value === mod2Ring.zero,
      name: "(0)",
    }

    const mod2Spectrum: PrimeSpectrum<bigint> = {
      ring: mod2Ring,
      label: "Spec ℤ/2",
      points: [
        { ideal: mod2Ideal, label: "(0)", samples: [0n, 1n] },
      ],
    }

    const projection: RingHomomorphism<bigint, bigint> = {
      source: RingInteger,
      target: mod2Ring,
      map: (value) => normalizeMod(value, 2n),
      label: "ℤ → ℤ/2",
    }

    const brokenSquare: AffineSchemePullbackSquare<bigint, bigint, bigint, bigint> = {
      base: baseSpectrum,
      left: { spectrum: baseSpectrum, map: identity },
      right: { spectrum: mod2Spectrum, map: projection },
      apex: { spectrum: mod2Spectrum, leftMap: projection, rightMap: projection },
      label: "broken pullback",
    }

    const brokenDiagram: SchemeFiberProductDiagram = {
      label: "Faulty fibre product",
      entries: [
        {
          square: brokenSquare,
          options: { matchingPairs: [{ leftIndex: 1, rightIndex: 0, apexIndex: 1 }] },
        },
      ],
    }

    const result = checkSchemeFiberProduct(brokenDiagram)

    expect(result.holds).toBe(false)
    expect(result.metadata.failureCount).toBe(1)
    expect(result.violations[0]?.kind).toBe("squareFailure")
  })
})
