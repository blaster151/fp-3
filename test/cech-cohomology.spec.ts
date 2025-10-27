import { describe, expect, it } from "vitest"
import {
  analyzeCohomology,
  buildTwoOpenCechComplex,
  checkChainComplex,
  checkTwoOpenCechCohomology,
  type ChainComplex,
  type Sheaf,
  type Site,
  type CoveringFamily,
  type Module,
} from "../allTS"
import type { SimpleCat } from "../simple-cat"
import type { Ring } from "../src/algebra/ring/structures"

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

interface Section {
  readonly values: Readonly<Record<string, number>>
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

const buildSheaf = (site: Site<OpenSet, Inclusion>): Sheaf<OpenSet, Inclusion, Section> => ({
  site,
  sections: (object) => enumerateSections(pointsByOpen[object]),
  restrict: restrictSection,
  sectionEq,
  label: "Binary-valued functions",
  glue: (covering, assignments) => {
    const result: Record<string, number> = {}
    for (const assignment of assignments) {
      const domainPoints = pointsByOpen[assignment.arrow.from]
      for (const point of domainPoints) {
        const value = assignment.section.values[point] ?? 0
        if (result[point] !== undefined && result[point] !== value) {
          return {
            exists: false,
            details: `Conflict at ${point}: ${result[point]} vs ${value}`,
          }
        }
        result[point] = value
      }
    }
    const targetPoints = pointsByOpen[covering.target]
    for (const point of targetPoints) {
      if (result[point] === undefined) {
        result[point] = 0
      }
    }
    return { exists: true, section: { values: result } }
  },
})

const ringF2: Ring<number> = {
  zero: 0,
  one: 1,
  add: (left, right) => (left + right) & 1,
  mul: (left, right) => (left * right) & 1,
  neg: (value) => value & 1,
  sub: (left, right) => (left + right) & 1,
  eq: (left, right) => left === right,
}

const sectionModule = (site: Site<OpenSet, Inclusion>): Module<number, Section> => {
  const basePoints = pointsByOpen["UV"]
  const zeroValues: Record<string, number> = {}
  for (const point of basePoints) {
    zeroValues[point] = 0
  }
  const scale = (scalar: number, value: Section): Section => {
    const scaled: Record<string, number> = {}
    for (const point of basePoints) {
      const entry = value.values[point] ?? 0
      scaled[point] = ringF2.mul(scalar, entry)
    }
    return { values: scaled }
  }
  return {
    ring: ringF2,
    zero: { values: { ...zeroValues } },
    add: (left, right) => {
      const values: Record<string, number> = {}
      for (const point of basePoints) {
        const leftValue = left.values[point] ?? 0
        const rightValue = right.values[point] ?? 0
        values[point] = ringF2.add(leftValue, rightValue)
      }
      return { values }
    },
    neg: (value) => scale(ringF2.neg(ringF2.one), value),
    scalar: scale,
    eq: sectionEq,
    name: `F₂-functions on ${site.label ?? "site"}`,
  }
}

describe("Čech cohomology oracles", () => {
  const site = buildSite()
  const sheaf = buildSheaf(site)
  const coveringCandidate = site.coverings("UV")[0]
  if (!coveringCandidate) {
    throw new Error("Expected two-open covering for Čech cohomology tests")
  }
  const covering: CoveringFamily<OpenSet, Inclusion> = coveringCandidate
  const intersectionArrow = {
    object: "I" as const,
    toFirst: makeInclusion("I", "U"),
    toSecond: makeInclusion("I", "V"),
    label: "I",
  }
  const module = sectionModule(site)

  it("validates the two-open Čech complex and computes cohomology", () => {
    const complex = buildTwoOpenCechComplex({
      sheaf,
      covering,
      intersection: intersectionArrow,
      module,
      label: "{U,V} cover",
    })
    const chainCheck = checkChainComplex(complex)
    expect(chainCheck.holds).toBe(true)
    expect(chainCheck.metadata.compositionChecks).toBe(16)
    expect(chainCheck.metadata.samplesTested).toBe(16)

    const cohomology = analyzeCohomology(complex)
    expect(cohomology.metadata.degrees).toEqual([0, 1, 2])

    const h0 = cohomology.groups.find(group => group.degree === 0)
    expect(h0?.kernelSize).toBe(8)
    expect(h0?.rank).toBe(8)

    const h1 = cohomology.groups.find(group => group.degree === 1)
    expect(h1?.kernelSize).toBe(2)
    expect(h1?.imageSize).toBe(2)
    expect(h1?.rank).toBe(1)

    const result = checkTwoOpenCechCohomology({
      sheaf,
      covering,
      intersection: intersectionArrow,
      module,
      label: "{U,V} cover",
    })
    expect(result.holds).toBe(true)
    expect(result.cohomology.groups).toHaveLength(3)
  })

  it("detects chain-complex composition failures", () => {
    const complex = buildTwoOpenCechComplex({
      sheaf,
      covering,
      intersection: intersectionArrow,
      module,
      label: "{U,V} cover",
    }) as ChainComplex<number>

    const level1 = complex.levels[1]
    const differential1 = complex.differentials[1]
    if (!level1 || !differential1) {
      throw new Error("Expected level and differential in two-open complex")
    }
    const badDifferential = {
      ...differential1,
      map: (value: Section) => value,
    }

    const differential0 = complex.differentials[0]
    if (!differential0) {
      throw new Error("Expected initial differential in two-open complex")
    }

    const failing: ChainComplex<number> = {
      ...complex,
      differentials: [differential0, badDifferential],
    }

    const check = checkChainComplex(failing, { witnessLimit: 1 })
    expect(check.holds).toBe(false)
    expect(check.violations.some(v => v.kind === "composition")).toBe(true)
    expect(check.witnesses).toHaveLength(1)
    const composition = check.violations.find(v => v.kind === "composition")
    expect(composition && level1.module.eq?.(composition.image as Section, module.zero)).toBe(false)
  })
})
