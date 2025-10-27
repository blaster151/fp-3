import { describe, expect, it } from "vitest"
import {
  RingInteger,
  checkStructureSheaf,
  checkPresheaf,
  checkSheafGluing,
  buildStructureSheaf,
  buildStructureSheafSite,
  type StructureSheafData,
  type StructureSheafArrow,
  type StructureSheafCovering,
  type StructureSheafOpen,
  type LocalizationFraction,
  type MatchingFamilySample,
} from "../allTS"

const fraction = (numerator: bigint, denominator: bigint): LocalizationFraction<bigint> => ({ numerator, denominator })

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
      id: "res-2-1",
      from: "D(2)",
      to: "D(1)",
      map: localizeAlong(2n, 1n),
      label: "D(2) → D(1)",
      sectionSamples: [fraction(1n, 1n), fraction(3n, 1n)],
      ringLawSamples: [fraction(1n, 1n), fraction(3n, 1n)],
    },
    {
      id: "res-3-1",
      from: "D(3)",
      to: "D(1)",
      map: localizeAlong(3n, 1n),
      label: "D(3) → D(1)",
      sectionSamples: [fraction(1n, 1n), fraction(3n, 1n)],
      ringLawSamples: [fraction(1n, 1n), fraction(3n, 1n)],
    },
    {
      id: "res-6-2",
      from: "D(6)",
      to: "D(2)",
      map: localizeAlong(6n, 2n),
      label: "D(6) → D(2)",
      sectionSamples: [fraction(1n, 1n), fraction(1n, 2n)],
      ringLawSamples: [fraction(1n, 1n), fraction(3n, 1n)],
    },
    {
      id: "res-6-3",
      from: "D(6)",
      to: "D(3)",
      map: localizeAlong(6n, 3n),
      label: "D(6) → D(3)",
      sectionSamples: [fraction(1n, 1n), fraction(1n, 3n)],
      ringLawSamples: [fraction(1n, 1n), fraction(3n, 1n)],
    },
  ]

  const coverings: StructureSheafCovering<bigint>[] = [
    { id: "cov-1", target: "D(1)", arrowIds: ["res-2-1", "res-3-1"], label: "{D(2), D(3)} → D(1)" },
    { id: "cov-2", target: "D(2)", arrowIds: ["id-2"], label: "{D(2)} → D(2)" },
    { id: "cov-3", target: "D(3)", arrowIds: ["id-3"], label: "{D(3)} → D(3)" },
    { id: "cov-6", target: "D(6)", arrowIds: ["id-6"], label: "{D(6)} → D(6)" },
  ]

  return {
    ring: RingInteger,
    label: "Spec ℤ principal opens",
    opens,
    arrows,
    coverings,
  }
}

const buildGluingSample = (data: StructureSheafData<bigint>): MatchingFamilySample<string, StructureSheafArrow<bigint>, LocalizationFraction<bigint>> => {
  const site = buildStructureSheafSite(data)
  const covering = site.coverings("D(1)")[0]!
  const assignments = [
    { arrow: covering.arrows[0]!, section: covering.arrows[0]!.map(fraction(3n, 1n)) },
    { arrow: covering.arrows[1]!, section: covering.arrows[1]!.map(fraction(3n, 1n)) },
  ]
  const overlaps = [
    {
      leftIndex: 0,
      rightIndex: 1,
      leftRestriction: resolveArrow(data, "res-6-2")!,
      rightRestriction: resolveArrow(data, "res-6-3")!,
    },
  ]
  return { covering, assignments, overlaps }
}

const resolveArrow = (data: StructureSheafData<bigint>, id: string): StructureSheafArrow<bigint> | undefined =>
  data.arrows.find(arrow => arrow.id === id)

describe("structure sheaf infrastructure", () => {
  const data = buildStructureSheafData()
  const sheaf = buildStructureSheaf(data)

  it("validates the Spec ℤ structure sheaf data", () => {
    const result = checkStructureSheaf(data, { arrowSectionLimit: 3 })

    expect(result.holds).toBe(true)
    expect(result.metadata.openCount).toBe(4)
    expect(result.metadata.localizationFailures).toBe(0)
  })

  it("produces a presheaf that satisfies restriction and composition laws", () => {
    const result = checkPresheaf(sheaf, {
      objectSamples: data.opens.map(open => open.id),
      arrowSamples: data.arrows,
      sectionSampleLimit: 3,
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.distinctObjectSamples).toBe(4)
  })

  it("supports sheaf gluing across the {D(2), D(3)} cover", () => {
    const sample = buildGluingSample(data)
    const result = checkSheafGluing(sheaf, [sample])

    expect(result.holds).toBe(true)
    expect(result.metadata.gluingChecks).toBe(1)
  })

  it("detects restriction failures in flawed structure sheaf data", () => {
    const flawed: StructureSheafData<bigint> = {
      ...data,
      arrows: data.arrows.map(arrow =>
        arrow.id === "res-6-2"
          ? { ...arrow, map: (section) => ({ numerator: section.numerator, denominator: section.denominator }) }
          : arrow,
      ),
    }

    const result = checkStructureSheaf(flawed, { arrowSectionLimit: 2 })

    expect(result.holds).toBe(false)
    expect(result.violations.some(violation => violation.kind === "restrictionAddition")).toBe(true)
  })
})
