import { describe, expect, it } from "vitest"
import {
  checkCoveringFamily,
  checkPresheaf,
  checkSheafGluing,
  type CoveringFamily,
  type MatchingFamilySample,
  type Presheaf,
  type Sheaf,
  type Site,
} from "../allTS"
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

const zeroSection = (open: OpenSet): Section => {
  const values: Record<string, number> = {}
  for (const point of pointsByOpen[open]) {
    values[point] = 0
  }
  return { values }
}

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
  const presheaf = buildPresheaf(site)
  const sheaf = buildSheaf(site)
  const uvCover = site.coverings("UV")[0]!

  const matchingSample: MatchingFamilySample<OpenSet, Inclusion, Section> = {
    covering: uvCover,
    assignments: [
      { arrow: uvCover.arrows[0]!, section: sectionsByOpen.U[3]! },
      { arrow: uvCover.arrows[1]!, section: sectionsByOpen.V[3]! },
    ],
    overlaps: [
      {
        leftIndex: 0,
        rightIndex: 1,
        leftRestriction: makeInclusion("I", "U"),
        rightRestriction: makeInclusion("I", "V"),
      },
    ],
  }

  const incompatibleSample: MatchingFamilySample<OpenSet, Inclusion, Section> = {
    covering: uvCover,
    assignments: [
      { arrow: uvCover.arrows[0]!, section: sectionsByOpen.U[0]! },
      { arrow: uvCover.arrows[1]!, section: sectionsByOpen.V[1]! },
    ],
    overlaps: [
      {
        leftIndex: 0,
        rightIndex: 1,
        leftRestriction: makeInclusion("I", "U"),
        rightRestriction: makeInclusion("I", "V"),
      },
    ],
  }

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

  it("certifies sheaf gluing for matching families", () => {
    const result = checkSheafGluing(sheaf, [matchingSample], { witnessLimit: 1 })
    expect(result.holds).toBe(true)
    expect(result.metadata.gluingChecks).toBe(1)
    expect(result.metadata.restrictionChecks).toBeGreaterThan(0)
  })

  it("detects incompatible sheaf data on overlaps", () => {
    const result = checkSheafGluing(sheaf, [incompatibleSample], { witnessLimit: 2 })
    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "overlapMismatch")).toBe(true)
    expect(result.witnesses.length).toBeGreaterThan(0)
  })
})
