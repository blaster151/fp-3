import { describe, expect, it } from "vitest"
import {
  checkFiberedCategory,
  checkStackDescent,
  type CartesianComparison,
  type DescentDatum,
  type DescentTransition,
  type FiberedCategory,
  type FiberedCategorySample,
  type Site,
  type CoveringFamily,
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

interface Bundle {
  readonly base: OpenSet
  readonly label: string
}

interface BundleArrow {
  readonly base: OpenSet
  readonly source: Bundle
  readonly target: Bundle
  readonly name: string
}

const bundleEq = (left: Bundle, right: Bundle): boolean =>
  left.base === right.base && left.label === right.label

const arrowEq = (left: BundleArrow, right: BundleArrow): boolean =>
  left.base === right.base &&
  bundleEq(left.source, right.source) &&
  bundleEq(left.target, right.target) &&
  left.name === right.name

const makeBundle = (base: OpenSet, label: string): Bundle => ({ base, label })

const makeArrow = (source: Bundle, target: Bundle, name: string): BundleArrow => ({
  base: source.base,
  source,
  target,
  name,
})

const idArrow = (object: Bundle): BundleArrow => makeArrow(object, object, `id(${object.label}@${object.base})`)

const composeArrow = (g: BundleArrow, f: BundleArrow): BundleArrow | undefined => {
  if (!bundleEq(f.target, g.source) || f.target.base !== g.source.base) {
    return undefined
  }
  if (bundleEq(f.source, g.target)) {
    return idArrow(f.source)
  }
  return makeArrow(f.source, g.target, `${g.name}∘${f.name}`)
}

const buildFiberedCategory = (): FiberedCategory<OpenSet, Inclusion, Bundle, BundleArrow> => ({
  base: inclusionCategory,
  fiber: {
    src: (arrow) => arrow.source,
    dst: (arrow) => arrow.target,
    id: idArrow,
    compose: composeArrow,
    objectEq: bundleEq,
    arrowEq,
  },
  baseOfObject: (object) => object.base,
  pullback: (arrow, target) => {
    if (target.base !== arrow.to) {
      return {
        exists: false,
        details: `Target ${target.label}@${target.base} not over ${arrow.to}.`,
      }
    }
    const object = makeBundle(arrow.from, `${target.label}|${arrow.from}`)
    const lift = makeArrow(object, target, `lift(${target.label}|${arrow.from}->${arrow.to})`)
    return {
      exists: true,
      object,
      lift,
      details: `Cartesian lift of ${target.label} along ${arrow.from}→${arrow.to}.`,
    }
  },
  label: "Trivial line bundles",
})

const brokenFiberedCategory = (): FiberedCategory<OpenSet, Inclusion, Bundle, BundleArrow> => ({
  ...buildFiberedCategory(),
  pullback: (arrow, target) => ({
    exists: false,
    details: `No lift available for ${target.label} along ${arrow.from}→${arrow.to}.`,
  }),
  label: "Broken line bundles",
})

const buildFiberedSample = (
  covering: CoveringFamily<OpenSet, Inclusion>,
  fibered: FiberedCategory<OpenSet, Inclusion, Bundle, BundleArrow>,
): FiberedCategorySample<OpenSet, Inclusion, Bundle, BundleArrow> => {
  const target = makeBundle("UV", "L")
  const baseArrow = covering.arrows[0]
  if (!baseArrow) {
    throw new Error("Expected covering arrow for sample setup")
  }
  const lift = fibered.pullback(baseArrow, target)
  if (!lift.exists || !lift.object || !lift.lift) {
    throw new Error("Expected cartesian lift in sample setup")
  }
  const comparisons: ReadonlyArray<CartesianComparison<Bundle, BundleArrow>> = [
    {
      from: lift.object,
      arrow: lift.lift,
      factorization: idArrow(lift.object),
      label: "Identity factorization",
    },
  ]
  return {
    baseArrow,
    target,
    comparisons,
    label: "Lift along U → UV",
  }
}

const buildDescentDatum = (
  covering: CoveringFamily<OpenSet, Inclusion>,
  fibered: FiberedCategory<OpenSet, Inclusion, Bundle, BundleArrow>,
): DescentDatum<OpenSet, Inclusion, Bundle, BundleArrow> => {
  if (covering.arrows.length < 2) {
    throw new Error("Expected two covering arrows for descent datum")
  }
  const localObjects = covering.arrows.map(arrow => makeBundle(arrow.from, `L|${arrow.from}`))
  const leftLocal = localObjects[0]
  const rightLocal = localObjects[1]
  if (!leftLocal || !rightLocal) {
    throw new Error("Expected local bundles for descent datum")
  }
  const transitions: DescentTransition<OpenSet, Inclusion, Bundle, BundleArrow>[] = []

  const overlap = "I"
  const toU = makeInclusion(overlap, "U")
  const toV = makeInclusion(overlap, "V")

  const leftRestriction = fibered.pullback(toU, leftLocal)
  const rightRestriction = fibered.pullback(toV, rightLocal)
  if (!leftRestriction.exists || !leftRestriction.object || !rightRestriction.exists || !rightRestriction.object) {
    throw new Error("Expected restrictions to exist for descent datum")
  }

  const forward = makeArrow(
    leftRestriction.object,
    rightRestriction.object,
    "transition(U→V)",
  )
  const backward = makeArrow(
    rightRestriction.object,
    leftRestriction.object,
    "transition(V→U)",
  )

  transitions.push({
    overlap,
    toLeft: toU,
    toRight: toV,
    leftIndex: 0,
    rightIndex: 1,
    transition: forward,
    inverse: backward,
    label: "Two-open overlap",
  })

  return {
    fibered,
    covering,
    localObjects,
    transitions,
    cocycles: [
      {
        first: forward,
        second: backward,
        expected: idArrow(leftRestriction.object),
        label: "Overlap identity",
      },
    ],
    glue: () => ({
      exists: true,
      object: makeBundle("UV", "L"),
      arrows: [
        { index: 0, arrow: makeArrow(leftLocal, makeBundle("UV", "L"), "glue-U") },
        { index: 1, arrow: makeArrow(rightLocal, makeBundle("UV", "L"), "glue-V") },
      ],
    }),
    label: "Trivial line bundle descent",
  }
}

describe("moduli and stack scaffolding", () => {
  const site = buildSite()
  const covering = site.coverings("UV")[0]
  if (!covering) {
    throw new Error("Expected two-open covering for UV")
  }
  const fibered = buildFiberedCategory()

  it("validates cartesian lifts for the trivial bundle stack", () => {
    const sample = buildFiberedSample(covering, fibered)
    const result = checkFiberedCategory(fibered, [sample])
    expect(result.holds).toBe(true)
    expect(result.metadata.samplesTested).toBe(1)
  })

  it("detects missing cartesian lifts", () => {
    const broken = brokenFiberedCategory()
    const sample = buildFiberedSample(covering, fibered)
    const result = checkFiberedCategory(broken, [sample])
    expect(result.holds).toBe(false)
    expect(result.violations.some(v => v.kind === "pullbackFailed")).toBe(true)
  })

  it("detects non-unique factorisations", () => {
    const sample = buildFiberedSample(covering, fibered)
    const comparisons = sample.comparisons
    if (!comparisons || comparisons.length === 0) {
      throw new Error("Expected comparison witness in sample")
    }
    const firstComparison = comparisons[0]
    if (!firstComparison) {
      throw new Error("Expected first comparison in sample")
    }
    const badComparison: CartesianComparison<Bundle, BundleArrow> = {
      from: firstComparison.from,
      arrow: firstComparison.arrow,
      factorization: firstComparison.factorization,
      alternatives: [makeArrow(firstComparison.from, firstComparison.from, "twist")],
    }
    const result = checkFiberedCategory(
      fibered,
      [
        {
          ...sample,
          comparisons: [badComparison],
        },
      ],
    )
    expect(result.holds).toBe(false)
    expect(result.violations.some(v => v.kind === "comparisonUniquenessFailure")).toBe(true)
  })

  it("validates descent data for the trivial bundle", () => {
    const datum = buildDescentDatum(covering, fibered)
    const result = checkStackDescent(datum)
    expect(result.holds).toBe(true)
    expect(result.metadata.transitionsChecked).toBe(1)
    expect(result.metadata.cocyclesChecked).toBe(1)
  })

  it("detects transition mismatches in descent data", () => {
    const datum = buildDescentDatum(covering, fibered)
    const firstTransition = datum.transitions[0]
    if (!firstTransition) {
      throw new Error("Expected transition in descent datum")
    }
    const brokenTransition: DescentTransition<OpenSet, Inclusion, Bundle, BundleArrow> = {
      ...firstTransition,
      inverse: makeArrow(firstTransition.transition.source, firstTransition.transition.target, "not inverse"),
    }
    const brokenDatum: DescentDatum<OpenSet, Inclusion, Bundle, BundleArrow> = {
      ...datum,
      transitions: [brokenTransition],
    }
    const result = checkStackDescent(brokenDatum)
    expect(result.holds).toBe(false)
    expect(result.violations.some(v => v.kind === "transitionInverseFailure")).toBe(true)
  })
})

