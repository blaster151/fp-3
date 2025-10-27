import { describe, expect, it } from "vitest"
import {
  checkCoveringFamily,
  checkPresheaf,
  checkSheafGluing,
  buildZariskiMatchingFamily,
  type GrothendieckTopology,
  type CoveringFamily,
  type MatchingFamilySample,
  type Presheaf,
  type Sheaf,
  type Site,
} from "../allTS"
import { AlgebraOracles } from "../algebra-oracles"
import type { SimpleCat } from "../simple-cat"

type OpenSet = "U" | "V" | "UV" | "I"

interface Inclusion {
  readonly from: OpenSet
  readonly to: OpenSet
}

const makeInclusion = (from: OpenSet, to: OpenSet): Inclusion => ({ from, to })

const inclusionCategory: SimpleCat<OpenSet, Inclusion> = {
  id: (object) => makeInclusion(object, object),
  compose: (g, f) => makeInclusion(f.from, g.to),
  src: (arrow) => arrow.from,
  dst: (arrow) => arrow.to,
}

const pointsByOpen: Record<OpenSet, ReadonlyArray<string>> = {
  U: ["a", "c"],
  V: ["b", "c"],
  UV: ["a", "b", "c"],
  I: ["c"],
}

type Section = { readonly values: Readonly<Record<string, number>> }

const enumerateSections = (points: ReadonlyArray<string>): Section[] => {
  if (points.length === 0) {
    return [{ values: {} }]
  }
  const total = 1 << points.length
  const sections: Section[] = []
  for (let mask = 0; mask < total; mask += 1) {
    const values: Record<string, number> = {}
    points.forEach((point, index) => {
      values[point] = (mask >> index) & 1
    })
    sections.push({ values })
  }
  return sections
}

const sectionEq = (left: Section, right: Section): boolean => {
  const keys = new Set([...Object.keys(left.values), ...Object.keys(right.values)])
  for (const key of keys) {
    if ((left.values[key] ?? 0) !== (right.values[key] ?? 0)) {
      return false
    }
  }
  return true
}

const restrictSection = (arrow: Inclusion, section: Section): Section => {
  const domainPoints = pointsByOpen[arrow.from]
  const values: Record<string, number> = {}
  for (const point of domainPoints) {
    values[point] = section.values[point] ?? 0
  }
  return { values }
}

const constantSection = (open: OpenSet, value: number): Section => {
  const values: Record<string, number> = {}
  for (const point of pointsByOpen[open]) {
    values[point] = value
  }
  return { values }
}

const zeroSection = (open: OpenSet): Section => constantSection(open, 0)

const buildSite = (): Site<OpenSet, Inclusion> => {
  const site: Site<OpenSet, Inclusion> = {
    category: inclusionCategory,
    coverings: (object) => {
      if (object !== "UV") {
        return []
      }
      return [
        {
          site,
          target: "UV",
          arrows: [makeInclusion("U", "UV"), makeInclusion("V", "UV")],
          label: "{U, V} → UV",
        },
      ]
    },
    objectEq: (left, right) => left === right,
    arrowEq: (left, right) => left.from === right.from && left.to === right.to,
    label: "Two-open site",
  }
  return site
}

const buildTopology = (
  site: Site<OpenSet, Inclusion>,
): GrothendieckTopology<OpenSet, Inclusion> => ({
  site,
  coverings: site.coverings,
  label: "Two-open Grothendieck topology",
})

const sectionsByOpen: Record<OpenSet, Section[]> = {
  U: enumerateSections(pointsByOpen.U),
  V: enumerateSections(pointsByOpen.V),
  UV: enumerateSections(pointsByOpen.UV),
  I: enumerateSections(pointsByOpen.I),
}

const buildPresheaf = (site: Site<OpenSet, Inclusion>): Presheaf<OpenSet, Inclusion, Section> => ({
  site,
  sections: (object) => sectionsByOpen[object],
  restrict: restrictSection,
  sectionEq,
  label: "Binary-valued constant presheaf",
})

const buildSheaf = (site: Site<OpenSet, Inclusion>): Sheaf<OpenSet, Inclusion, Section> => ({
  ...buildPresheaf(site),
  label: "Binary-valued constant sheaf",
  glue: (covering, assignments) => {
    const unionValues: Record<string, number> = {}
    for (const assignment of assignments) {
      const domainPoints = pointsByOpen[assignment.arrow.from]
      for (const point of domainPoints) {
        const value = assignment.section.values[point] ?? 0
        if (unionValues[point] !== undefined && unionValues[point] !== value) {
          return {
            exists: false,
            details: `Conflicting value at ${point}: ${unionValues[point]} vs ${value}`,
          }
        }
        unionValues[point] = value
      }
    }
    const targetPoints = pointsByOpen[covering.target]
    for (const point of targetPoints) {
      if (unionValues[point] === undefined) {
        unionValues[point] = 0
      }
    }
    return { exists: true, section: { values: unionValues } }
  },
})

describe("sheaf infrastructure", () => {
  const site = buildSite()
  const topology = buildTopology(site)
  const presheaf = buildPresheaf(site)
  const sheaf = buildSheaf(site)
  const uvCover = site.coverings("UV")[0]!

  const canonicalFamilies = buildZariskiMatchingFamily(
    topology,
    (object) => sectionsByOpen[object],
    {
      coverings: [uvCover],
      sectionSampleLimit: 4,
      combinationLimit: 16,
    },
  )

  const selectSample = (
    predicate: (sample: MatchingFamilySample<OpenSet, Inclusion, Section>) => boolean,
  ): MatchingFamilySample<OpenSet, Inclusion, Section> => {
    const sample = canonicalFamilies.find(predicate)
    if (!sample) {
      throw new Error("Expected matching family sample was not generated")
    }
    return sample
  }

  const matchingSample = (): MatchingFamilySample<OpenSet, Inclusion, Section> =>
    selectSample((sample) =>
      sample.overlaps.every((overlap) => {
        const leftSection = sheaf.restrict(
          overlap.leftRestriction,
          sample.assignments[overlap.leftIndex]!.section,
        )
        const rightSection = sheaf.restrict(
          overlap.rightRestriction,
          sample.assignments[overlap.rightIndex]!.section,
        )
        return sectionEq(leftSection, rightSection)
      }),
    )

  const incompatibleSample = (): MatchingFamilySample<OpenSet, Inclusion, Section> =>
    selectSample((sample) =>
      sample.overlaps.some((overlap) => {
        const leftSection = sheaf.restrict(
          overlap.leftRestriction,
          sample.assignments[overlap.leftIndex]!.section,
        )
        const rightSection = sheaf.restrict(
          overlap.rightRestriction,
          sample.assignments[overlap.rightIndex]!.section,
        )
        return !sectionEq(leftSection, rightSection)
      }),
    )

  it("validates the standard two-open covering", () => {
    const result = checkCoveringFamily(uvCover)
    expect(result.holds).toBe(true)
    expect(result.metadata.distinctArrows).toBe(uvCover.arrows.length)
    expect(result.metadata.enforceNonEmpty).toBe(true)
  })

  it("detects covering arrows with incorrect targets", () => {
    const flawed: CoveringFamily<OpenSet, Inclusion> = {
      site,
      target: "UV",
      arrows: [makeInclusion("U", "U"), makeInclusion("V", "UV")],
      label: "flawed",
    }
    const result = checkCoveringFamily(flawed)
    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "targetMismatch")).toBe(true)
  })

  it("confirms presheaf identity and composition laws", () => {
    const result = checkPresheaf(presheaf, {
      objectSamples: ["U", "V", "UV"] as const,
      arrowSamples: uvCover.arrows,
      sectionSampleLimit: 4,
    })
    expect(result.holds).toBe(true)
    expect(result.metadata.restrictionChecks).toBeGreaterThan(0)
    expect(result.metadata.compositionChecks).toBeGreaterThan(0)
  })

  it("surfaces presheaf identity failures", () => {
    const errant: Presheaf<OpenSet, Inclusion, Section> = {
      ...presheaf,
      restrict: (arrow, section) => {
        if (arrow.from === arrow.to) {
          return zeroSection(arrow.from)
        }
        return restrictSection(arrow, section)
      },
      label: "Errant presheaf",
    }
    const result = checkPresheaf(errant, {
      objectSamples: ["U"] as const,
      arrowSamples: [makeInclusion("U", "U")],
      sectionSampleLimit: 2,
      witnessLimit: 1,
    })
    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "identity")).toBe(true)
    expect(result.witnesses.length).toBeGreaterThan(0)
  })

  it("validates presheaf morphisms that preserve restrictions", () => {
    const identityMorphism = {
      source: presheaf,
      target: presheaf,
      map: (_object: OpenSet, section: Section) => section,
      label: "identity presheaf morphism",
    }
    const result = AlgebraOracles.sheaf.presheafMorphism(identityMorphism, {
      objectSamples: ["U", "V", "UV"] as const,
      arrowSamples: uvCover.arrows,
      sectionSampleLimit: 3,
    })
    expect(result.holds).toBe(true)
    expect(result.metadata.naturalityChecks).toBeGreaterThan(0)
    expect(result.source.holds).toBe(true)
    expect(result.target.holds).toBe(true)
  })

  it("detects presheaf morphisms that break naturality", () => {
    const inconsistentMorphism = {
      source: presheaf,
      target: presheaf,
      map: (object: OpenSet, _section: Section) =>
        object === "UV" ? constantSection("UV", 1) : zeroSection(object),
      label: "inconsistent presheaf morphism",
    }
    const result = AlgebraOracles.sheaf.presheafMorphism(inconsistentMorphism, {
      objectSamples: ["UV", "U"] as const,
      arrowSamples: uvCover.arrows,
      sectionSampleLimit: 2,
      witnessLimit: 1,
    })
    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "naturality")).toBe(true)
    expect(result.witnesses.length).toBeGreaterThan(0)
  })

  it("certifies sheaf gluing for matching families", () => {
    const result = checkSheafGluing(sheaf, [matchingSample()], { witnessLimit: 1 })
    expect(result.holds).toBe(true)
    expect(result.metadata.gluingChecks).toBe(1)
    expect(result.metadata.restrictionChecks).toBeGreaterThan(0)
  })

  it("detects incompatible sheaf data on overlaps", () => {
    const result = checkSheafGluing(sheaf, [incompatibleSample()], { witnessLimit: 2 })
    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "overlapMismatch")).toBe(true)
    expect(result.witnesses.length).toBeGreaterThan(0)
  })

  it("confirms sheaf morphisms respect gluing", () => {
    const morphism = {
      source: sheaf,
      target: sheaf,
      map: (_object: OpenSet, section: Section) => section,
      label: "identity sheaf morphism",
    }
    const result = AlgebraOracles.sheaf.sheafMorphism(
      morphism,
      [matchingSample()],
      {
        objectSamples: ["U", "V", "UV"] as const,
        arrowSamples: uvCover.arrows,
        sectionSampleLimit: 3,
        witnessLimit: 1,
        sheaf: { witnessLimit: 1 },
      },
    )
    expect(result.holds).toBe(true)
    expect(result.presheaf.holds).toBe(true)
    expect(result.sourceSheaf.holds).toBe(true)
    expect(result.targetSheaf.holds).toBe(true)
    expect(result.metadata.compatibilityChecks).toBeGreaterThan(0)
  })

  it("flags sheaf morphisms whose mapped families fail to glue", () => {
    const obstructedSheaf: Sheaf<OpenSet, Inclusion, Section> = {
      ...sheaf,
      label: "obstructed sheaf",
      glue: (covering, assignments) => {
        const hasNonZero = assignments.some((assignment) =>
          Object.values(assignment.section.values).some((value) => value !== 0),
        )
        if (hasNonZero) {
          return { exists: false, details: "reject non-zero sections" }
        }
        return sheaf.glue(covering, assignments)
      },
    }
    const morphism = {
      source: sheaf,
      target: obstructedSheaf,
      map: (_object: OpenSet, section: Section) => section,
      label: "obstructed sheaf morphism",
    }
    const canonical = matchingSample()
    const nonZeroSample: MatchingFamilySample<OpenSet, Inclusion, Section> = {
      covering: canonical.covering,
      overlaps: canonical.overlaps,
      assignments: canonical.covering.arrows.map((arrow) => ({
        arrow,
        section: constantSection(arrow.from, 1),
      })),
    }
    const result = AlgebraOracles.sheaf.sheafMorphism(
      morphism,
      [nonZeroSample],
      {
        objectSamples: ["U", "V", "UV"] as const,
        arrowSamples: uvCover.arrows,
        sectionSampleLimit: 3,
        witnessLimit: 1,
        sheaf: { witnessLimit: 1 },
      },
    )
    expect(result.holds).toBe(false)
    expect(result.presheaf.holds).toBe(true)
    expect(result.violations.some((violation) => violation.kind === "mappedGluingFailed")).toBe(
      true,
    )
    expect(result.witnesses.length).toBeGreaterThan(0)
  })

  it("generates canonical Zariski matching families for the two-open cover", () => {
    expect(canonicalFamilies.length).toBeGreaterThan(0)
    const sample = matchingSample()
    expect(sample.covering).toBe(uvCover)
    expect(sample.overlaps.length).toBeGreaterThan(0)
  })
})
