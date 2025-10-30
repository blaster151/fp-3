/**
 * Global scheme tooling coordinates atlas-level validation and refinement.
 *
 * The utilities exported from this module allow downstream callers to verify
 * that affine charts glue correctly, synthesize fibre products, and refine
 * existing atlases. In particular, `refineSchemeAtlas` can be used to merge two
 * compatible atlases: it aligns shared spectra, reuses the existing inverse
 * validation logic, and automatically re-runs `checkSchemeGluing` on the
 * original and refined atlases so that the returned narrative `details`
 * describe every verification pass.
 */
import type { RingIdeal } from "../algebra/ring/ideals"
import type { Ring } from "../algebra/ring/structures"
import {
  type AffineSchemeMorphism,
  type AffineSchemeMorphismCheckOptions,
  type AffineSchemeMorphismCheckResult,
  type AffineSchemePullbackCheckOptions,
  type AffineSchemePullbackCheckResult,
  type AffineSchemePullbackSquare,
  checkAffineSchemeMorphism,
  checkAffineSchemePullbackSquare,
  pullbackIdeal,
} from "./affine-morphisms"
import {
  type PrimeSpectrum,
  type PrimeSpectrumCheckOptions,
  type PrimeSpectrumCheckResult,
  type PrimeSpectrumPoint,
  checkPrimeSpectrum,
} from "./prime-spectrum"
import {
  type StructureSheafCheckOptions,
  type StructureSheafCheckResult,
  type StructureSheafData,
  checkStructureSheaf,
} from "./structure-sheaf"

const withEquality = <A>(ring: Ring<A>): ((left: A, right: A) => boolean) =>
  ring.eq ?? ((left, right) => Object.is(left, right))

const pushUnique = <A>(values: A[], value: A, eq: (left: A, right: A) => boolean): void => {
  if (!values.some(existing => eq(existing, value))) {
    values.push(value)
  }
}

const gatherRingSamples = <A>(
  ring: Ring<A>,
  explicit: ReadonlyArray<A> | undefined,
  points: ReadonlyArray<PrimeSpectrumPoint<A>>,
): A[] => {
  const eq = withEquality(ring)
  const samples: A[] = []

  explicit?.forEach(value => pushUnique(samples, value, eq))
  points.forEach(point => point.samples?.forEach(sample => pushUnique(samples, sample, eq)))

  if (samples.length === 0) {
    pushUnique(samples, ring.zero, eq)
    pushUnique(samples, ring.one, eq)
  }

  return samples
}

const gatherAlignmentSamples = <A>(
  ring: Ring<A>,
  left: ReadonlyArray<PrimeSpectrumPoint<A>>,
  right: ReadonlyArray<PrimeSpectrumPoint<A>>,
): A[] => {
  const eq = withEquality(ring)
  const samples: A[] = []

  left.forEach(point => point.samples?.forEach(sample => pushUnique(samples, sample, eq)))
  right.forEach(point => point.samples?.forEach(sample => pushUnique(samples, sample, eq)))

  if (samples.length === 0) {
    pushUnique(samples, ring.zero, eq)
    pushUnique(samples, ring.one, eq)
  }

  return samples
}

const idealsAgreeOnSamples = <A>(
  left: RingIdeal<A>,
  right: RingIdeal<A>,
  samples: ReadonlyArray<A>,
): boolean => samples.every(sample => left.contains(sample) === right.contains(sample))

const findMatchingPoint = <A>(
  spectrum: PrimeSpectrum<A>,
  ideal: RingIdeal<A>,
  samples: ReadonlyArray<A>,
): { readonly point: PrimeSpectrumPoint<A>; readonly index: number } | undefined => {
  const eq = withEquality(spectrum.ring)
  const combinedSamples = samples.length > 0 ? samples : [spectrum.ring.zero, spectrum.ring.one]

  for (let index = 0; index < spectrum.points.length; index += 1) {
    const candidate = spectrum.points[index]
    if (!candidate || candidate.ideal.ring !== spectrum.ring) {
      continue
    }
    const pointSamples: A[] = []
    candidate.samples?.forEach(sample => pushUnique(pointSamples, sample, eq))
    combinedSamples.forEach(sample => pushUnique(pointSamples, sample, eq))
    if (idealsAgreeOnSamples(candidate.ideal, ideal, pointSamples)) {
      return { point: candidate, index }
    }
  }

  return undefined
}

export interface SchemeChartOptions<A> {
  readonly spectrum?: PrimeSpectrumCheckOptions<A>
  readonly structureSheaf?: StructureSheafCheckOptions<A>
}

export interface SchemeChart<A> {
  readonly spectrum: PrimeSpectrum<A>
  readonly structureSheaf: StructureSheafData<A>
  readonly label?: string
  readonly options?: SchemeChartOptions<A>
}

export interface SchemeGluingCompatibility<Left, Right> {
  readonly leftSamples?: ReadonlyArray<Left>
  readonly rightSamples?: ReadonlyArray<Right>
  readonly leftPointIndices?: ReadonlyArray<number>
  readonly rightPointIndices?: ReadonlyArray<number>
}

export interface SchemeAtlasGluing<Left, Right> {
  readonly leftChart: number
  readonly rightChart: number
  readonly forward: AffineSchemeMorphism<Left, Right>
  readonly backward: AffineSchemeMorphism<Right, Left>
  readonly forwardOptions?: AffineSchemeMorphismCheckOptions<Left, Right>
  readonly backwardOptions?: AffineSchemeMorphismCheckOptions<Right, Left>
  readonly compatibility?: SchemeGluingCompatibility<Left, Right>
  readonly label?: string
}

export interface SchemeAtlas {
  readonly charts: ReadonlyArray<SchemeChart<any>>
  readonly gluings: ReadonlyArray<SchemeAtlasGluing<any, any>>
  readonly label?: string
}

export interface SchemeGluingCheckOptions {
  readonly witnessLimit?: number
  readonly requireInverse?: boolean
}

export type SchemeGluingViolation =
  | { readonly kind: "chartRingMismatch"; readonly chartIndex: number; readonly chart: SchemeChart<any> }
  | {
      readonly kind: "chartSpectrumFailure"
      readonly chartIndex: number
      readonly chart: SchemeChart<any>
      readonly result: PrimeSpectrumCheckResult<any>
    }
  | {
      readonly kind: "chartStructureSheafFailure"
      readonly chartIndex: number
      readonly chart: SchemeChart<any>
      readonly result: StructureSheafCheckResult<any>
    }
  | { readonly kind: "missingChart"; readonly gluingIndex: number; readonly side: "left" | "right"; readonly index: number }
  | {
      readonly kind: "gluingSpectrumMismatch"
      readonly gluingIndex: number
      readonly side: "forward" | "backward"
      readonly expectation: "domain" | "codomain"
    }
  | {
      readonly kind: "gluingFailure"
      readonly gluingIndex: number
      readonly direction: "forward" | "backward"
      readonly result: AffineSchemeMorphismCheckResult<any, any>
    }
  | {
      readonly kind: "inverseMismatch"
      readonly gluingIndex: number
      readonly direction: "left" | "right"
      readonly pointIndex: number
      readonly originalPoint: PrimeSpectrumPoint<any>
      readonly intermediateIdeal: RingIdeal<any>
      readonly returnedIdeal: RingIdeal<any>
    }
  | {
      readonly kind: "inverseMissing"
      readonly gluingIndex: number
      readonly direction: "left" | "right"
      readonly pointIndex: number
      readonly originalPoint: PrimeSpectrumPoint<any>
      readonly intermediateIdeal: RingIdeal<any>
    }

export interface SchemeGluingWitness {
  readonly chartIndex?: number
  readonly gluingIndex?: number
  readonly violation: SchemeGluingViolation
}

export interface SchemeGluingCheckResult {
  readonly holds: boolean
  readonly violations: ReadonlyArray<SchemeGluingViolation>
  readonly witnesses: ReadonlyArray<SchemeGluingWitness>
  readonly details: string
  readonly metadata: {
    readonly chartCount: number
    readonly gluingCount: number
    readonly ringMismatchFailures: number
    readonly spectrumFailures: number
    readonly sheafFailures: number
    readonly forwardFailures: number
    readonly backwardFailures: number
    readonly inverseChecks: number
    readonly inverseFailures: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
    readonly quasiCompact: boolean
    readonly separatedOnSamples: boolean
  }
}

export const checkSchemeGluing = (atlas: SchemeAtlas, options: SchemeGluingCheckOptions = {}): SchemeGluingCheckResult => {
  const witnessLimit = options.witnessLimit ?? 6
  const requireInverse = options.requireInverse ?? true

  const violations: SchemeGluingViolation[] = []
  const witnesses: SchemeGluingWitness[] = []

  let ringMismatchFailures = 0
  let spectrumFailures = 0
  let sheafFailures = 0
  let forwardFailures = 0
  let backwardFailures = 0
  let inverseChecks = 0
  let inverseFailures = 0

  atlas.charts.forEach((chart, chartIndex) => {
    if (chart.spectrum.ring !== chart.structureSheaf.ring) {
      const violation: SchemeGluingViolation = { kind: "chartRingMismatch", chartIndex, chart }
      ringMismatchFailures += 1
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ chartIndex, violation })
      }
    }

    const spectrumResult = checkPrimeSpectrum(chart.spectrum, chart.options?.spectrum ?? {})
    if (!spectrumResult.holds) {
      const violation: SchemeGluingViolation = {
        kind: "chartSpectrumFailure",
        chartIndex,
        chart,
        result: spectrumResult,
      }
      spectrumFailures += 1
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ chartIndex, violation })
      }
    }

    const sheafResult = checkStructureSheaf(chart.structureSheaf, chart.options?.structureSheaf ?? {})
    if (!sheafResult.holds) {
      const violation: SchemeGluingViolation = {
        kind: "chartStructureSheafFailure",
        chartIndex,
        chart,
        result: sheafResult,
      }
      sheafFailures += 1
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ chartIndex, violation })
      }
    }
  })

  atlas.gluings.forEach((gluing, gluingIndex) => {
    const leftChart = atlas.charts[gluing.leftChart]
    const rightChart = atlas.charts[gluing.rightChart]

    if (!leftChart) {
      const violation: SchemeGluingViolation = {
        kind: "missingChart",
        gluingIndex,
        side: "left",
        index: gluing.leftChart,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ gluingIndex, violation })
      }
      return
    }

    if (!rightChart) {
      const violation: SchemeGluingViolation = {
        kind: "missingChart",
        gluingIndex,
        side: "right",
        index: gluing.rightChart,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ gluingIndex, violation })
      }
      return
    }

    if (gluing.forward.codomain.ring !== leftChart.spectrum.ring) {
      const violation: SchemeGluingViolation = {
        kind: "gluingSpectrumMismatch",
        gluingIndex,
        side: "forward",
        expectation: "codomain",
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ gluingIndex, violation })
      }
    }

    if (gluing.forward.domain.ring !== rightChart.spectrum.ring) {
      const violation: SchemeGluingViolation = {
        kind: "gluingSpectrumMismatch",
        gluingIndex,
        side: "forward",
        expectation: "domain",
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ gluingIndex, violation })
      }
    }

    if (gluing.backward.codomain.ring !== rightChart.spectrum.ring) {
      const violation: SchemeGluingViolation = {
        kind: "gluingSpectrumMismatch",
        gluingIndex,
        side: "backward",
        expectation: "codomain",
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ gluingIndex, violation })
      }
    }

    if (gluing.backward.domain.ring !== leftChart.spectrum.ring) {
      const violation: SchemeGluingViolation = {
        kind: "gluingSpectrumMismatch",
        gluingIndex,
        side: "backward",
        expectation: "domain",
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ gluingIndex, violation })
      }
    }

    const forwardResult = checkAffineSchemeMorphism(gluing.forward, gluing.forwardOptions ?? {})
    if (!forwardResult.holds) {
      const violation: SchemeGluingViolation = {
        kind: "gluingFailure",
        gluingIndex,
        direction: "forward",
        result: forwardResult,
      }
      forwardFailures += 1
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ gluingIndex, violation })
      }
    }

    const backwardResult = checkAffineSchemeMorphism(gluing.backward, gluing.backwardOptions ?? {})
    if (!backwardResult.holds) {
      const violation: SchemeGluingViolation = {
        kind: "gluingFailure",
        gluingIndex,
        direction: "backward",
        result: backwardResult,
      }
      backwardFailures += 1
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ gluingIndex, violation })
      }
    }

    if (!requireInverse) {
      return
    }

    const compatibility = gluing.compatibility ?? {}
    const leftSamples = gatherRingSamples(
      leftChart.spectrum.ring,
      compatibility.leftSamples,
      leftChart.spectrum.points,
    )
    const rightSamples = gatherRingSamples(
      rightChart.spectrum.ring,
      compatibility.rightSamples,
      rightChart.spectrum.points,
    )
    const leftIndices =
      compatibility.leftPointIndices ?? leftChart.spectrum.points.map((_, index) => index)
    const rightIndices =
      compatibility.rightPointIndices ?? rightChart.spectrum.points.map((_, index) => index)

    leftIndices.forEach(pointIndex => {
      const point = leftChart.spectrum.points[pointIndex]
      if (!point || point.ideal.ring !== leftChart.spectrum.ring) {
        return
      }
      inverseChecks += 1

      const toRight = pullbackIdeal(gluing.backward.ringMap, point.ideal, point.label)
      const match = findMatchingPoint(rightChart.spectrum, toRight, rightSamples)
      if (!match) {
        inverseFailures += 1
        const violation: SchemeGluingViolation = {
          kind: "inverseMissing",
          gluingIndex,
          direction: "left",
          pointIndex,
          originalPoint: point,
          intermediateIdeal: toRight,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ gluingIndex, violation })
        }
        return
      }

      const backToLeft = pullbackIdeal(gluing.forward.ringMap, match.point.ideal, match.point.label)
      if (!idealsAgreeOnSamples(point.ideal, backToLeft, leftSamples)) {
        inverseFailures += 1
        const violation: SchemeGluingViolation = {
          kind: "inverseMismatch",
          gluingIndex,
          direction: "left",
          pointIndex,
          originalPoint: point,
          intermediateIdeal: toRight,
          returnedIdeal: backToLeft,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ gluingIndex, violation })
        }
      }
    })

    rightIndices.forEach(pointIndex => {
      const point = rightChart.spectrum.points[pointIndex]
      if (!point || point.ideal.ring !== rightChart.spectrum.ring) {
        return
      }
      inverseChecks += 1

      const toLeft = pullbackIdeal(gluing.forward.ringMap, point.ideal, point.label)
      const match = findMatchingPoint(leftChart.spectrum, toLeft, leftSamples)
      if (!match) {
        inverseFailures += 1
        const violation: SchemeGluingViolation = {
          kind: "inverseMissing",
          gluingIndex,
          direction: "right",
          pointIndex,
          originalPoint: point,
          intermediateIdeal: toLeft,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ gluingIndex, violation })
        }
        return
      }

      const backToRight = pullbackIdeal(gluing.backward.ringMap, match.point.ideal, match.point.label)
      if (!idealsAgreeOnSamples(point.ideal, backToRight, rightSamples)) {
        inverseFailures += 1
        const violation: SchemeGluingViolation = {
          kind: "inverseMismatch",
          gluingIndex,
          direction: "right",
          pointIndex,
          originalPoint: point,
          intermediateIdeal: toLeft,
          returnedIdeal: backToRight,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ gluingIndex, violation })
        }
      }
    })
  })

  const holds = violations.length === 0
  const quasiCompact = atlas.charts.length > 0
  const separatedOnSamples = inverseFailures === 0 && requireInverse

  const heuristicDetails = `Heuristics — quasi-compact on samples: ${quasiCompact ? "yes" : "no"}; separated on sampled gluings: ${
    separatedOnSamples ? "yes" : "no"
  }.`
  const details = holds
    ? `Scheme gluing for ${atlas.label ?? "the provided atlas"} verified across ${atlas.charts.length} charts. ${heuristicDetails}`
    : `${violations.length} gluing issues detected for ${atlas.label ?? "the provided atlas"}. ${heuristicDetails}`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      chartCount: atlas.charts.length,
      gluingCount: atlas.gluings.length,
      ringMismatchFailures,
      spectrumFailures,
      sheafFailures,
      forwardFailures,
      backwardFailures,
      inverseChecks,
      inverseFailures,
      witnessLimit,
      witnessesRecorded: witnesses.length,
      quasiCompact,
      separatedOnSamples,
    },
  }
}

const chartsShareSpectrum = <A>(left: SchemeChart<A>, right: SchemeChart<A>): boolean => {
  if (left.spectrum.ring !== right.spectrum.ring) {
    return false
  }

  const samples = gatherAlignmentSamples(left.spectrum.ring, left.spectrum.points, right.spectrum.points)

  const everyLeftMatches = left.spectrum.points.every(point =>
    findMatchingPoint(right.spectrum, point.ideal, samples) !== undefined,
  )
  const everyRightMatches = right.spectrum.points.every(point =>
    findMatchingPoint(left.spectrum, point.ideal, samples) !== undefined,
  )

  return everyLeftMatches && everyRightMatches
}

const mergeIndexLists = (
  left?: ReadonlyArray<number>,
  right?: ReadonlyArray<number>,
): ReadonlyArray<number> | undefined => {
  if (!left && !right) {
    return undefined
  }

  const indices: number[] = []
  const push = (value: number): void => pushUnique(indices, value, (a, b) => a === b)
  left?.forEach(push)
  right?.forEach(push)

  return indices
}

const mergeSamples = <A>(
  ring: Ring<A>,
  left?: ReadonlyArray<A>,
  right?: ReadonlyArray<A>,
): ReadonlyArray<A> | undefined => {
  if (!left && !right) {
    return undefined
  }

  const merged: A[] = []
  const eq = withEquality(ring)
  left?.forEach(sample => pushUnique(merged, sample, eq))
  right?.forEach(sample => pushUnique(merged, sample, eq))

  return merged
}

const mergeCompatibility = <Left, Right>(
  leftRing: Ring<Left>,
  rightRing: Ring<Right>,
  existing?: SchemeGluingCompatibility<Left, Right>,
  incoming?: SchemeGluingCompatibility<Left, Right>,
): SchemeGluingCompatibility<Left, Right> | undefined => {
  if (!existing) {
    return incoming
  }
  if (!incoming) {
    return existing
  }

  const leftSamples = mergeSamples(leftRing, existing.leftSamples, incoming.leftSamples)
  const rightSamples = mergeSamples(rightRing, existing.rightSamples, incoming.rightSamples)
  const leftIndices = mergeIndexLists(existing.leftPointIndices, incoming.leftPointIndices)
  const rightIndices = mergeIndexLists(existing.rightPointIndices, incoming.rightPointIndices)

  const merged: SchemeGluingCompatibility<Left, Right> = {
    ...(leftSamples ? { leftSamples } : {}),
    ...(rightSamples ? { rightSamples } : {}),
    ...(leftIndices ? { leftPointIndices: leftIndices } : {}),
    ...(rightIndices ? { rightPointIndices: rightIndices } : {}),
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}

const findMatchingChartIndex = (charts: ReadonlyArray<SchemeChart<any>>, chart: SchemeChart<any>): number | undefined => {
  for (let index = 0; index < charts.length; index += 1) {
    const candidate = charts[index]
    if (!candidate) {
      continue
    }
    if (chartsShareSpectrum(candidate, chart)) {
      return index
    }
  }
  return undefined
}

const buildGluingKey = (
  leftIndex: number,
  rightIndex: number,
  forwardLabel?: string,
  backwardLabel?: string,
  label?: string,
): string => `${leftIndex}->${rightIndex}|${label ?? ""}|${forwardLabel ?? ""}|${backwardLabel ?? ""}`

export interface SchemeAtlasRefinementOptions {
  readonly label?: string
  readonly checkOptions?: SchemeGluingCheckOptions
}

export interface SchemeAtlasRefinementResult {
  readonly atlas: SchemeAtlas
  readonly details: string
  readonly summaries: {
    readonly left: SchemeGluingCheckResult
    readonly right: SchemeGluingCheckResult
    readonly refined: SchemeGluingCheckResult
  }
}

/**
 * Construct a refined atlas that merges the charts and gluings of two input
 * atlases.
 *
 * Shared spectra are aligned using {@link findMatchingPoint}, compatibility
 * samples are merged, and the gluings are revalidated by calling
 * {@link checkSchemeGluing} on the left atlas, right atlas, and the refined
 * atlas. The combined narrative is surfaced in the returned `details` field so
 * callers can display a concise verification summary.
 */
export const refineSchemeAtlas = (
  left: SchemeAtlas,
  right: SchemeAtlas,
  options: SchemeAtlasRefinementOptions = {},
): SchemeAtlasRefinementResult => {
  const leftSummary = checkSchemeGluing(left, options.checkOptions)
  const rightSummary = checkSchemeGluing(right, options.checkOptions)

  const charts: SchemeChart<any>[] = [...left.charts]
  const leftIndexMap = left.charts.map((_, index) => index)
  const rightIndexMap: number[] = []

  right.charts.forEach((chart, index) => {
    const matchIndex = findMatchingChartIndex(charts, chart)
    if (matchIndex !== undefined) {
      rightIndexMap[index] = matchIndex
      return
    }

    charts.push(chart)
    rightIndexMap[index] = charts.length - 1
  })

  const gluings: SchemeAtlasGluing<any, any>[] = []
  const gluingIndexByKey = new Map<string, number>()

  const registerGluing = <Left, Right>(
    gluing: SchemeAtlasGluing<Left, Right>,
    leftIndex: number,
    rightIndex: number,
  ): void => {
    const leftChart = charts[leftIndex] as SchemeChart<Left>
    const rightChart = charts[rightIndex] as SchemeChart<Right>

    const normalized: SchemeAtlasGluing<Left, Right> = {
      leftChart: leftIndex,
      rightChart: rightIndex,
      forward: {
        ...gluing.forward,
        domain: rightChart.spectrum,
        codomain: leftChart.spectrum,
      },
      backward: {
        ...gluing.backward,
        domain: leftChart.spectrum,
        codomain: rightChart.spectrum,
      },
      ...(gluing.forwardOptions ? { forwardOptions: gluing.forwardOptions } : {}),
      ...(gluing.backwardOptions ? { backwardOptions: gluing.backwardOptions } : {}),
      ...(gluing.compatibility ? { compatibility: gluing.compatibility } : {}),
      ...(gluing.label ? { label: gluing.label } : {}),
    }

    const key = buildGluingKey(
      leftIndex,
      rightIndex,
      normalized.forward.label,
      normalized.backward.label,
      normalized.label,
    )

    const existingIndex = gluingIndexByKey.get(key)
    if (existingIndex === undefined) {
      gluingIndexByKey.set(key, gluings.length)
      gluings.push(normalized)
      return
    }

    const existing = gluings[existingIndex] as SchemeAtlasGluing<Left, Right>
    const compatibility = mergeCompatibility(
      leftChart.spectrum.ring,
      rightChart.spectrum.ring,
      existing.compatibility,
      normalized.compatibility,
    )

    const merged: SchemeAtlasGluing<Left, Right> = {
      ...existing,
      ...(compatibility ? { compatibility } : {}),
    }

    gluings[existingIndex] = merged
  }

  left.gluings.forEach(gluing => {
    const leftIndex = leftIndexMap[gluing.leftChart]
    const rightIndex = leftIndexMap[gluing.rightChart]
    if (leftIndex === undefined || rightIndex === undefined) {
      return
    }
    registerGluing(gluing, leftIndex, rightIndex)
  })

  right.gluings.forEach(gluing => {
    const leftIndex = rightIndexMap[gluing.leftChart]
    const rightIndex = rightIndexMap[gluing.rightChart]
    if (leftIndex === undefined || rightIndex === undefined) {
      return
    }
    registerGluing(gluing, leftIndex, rightIndex)
  })

  const label = options.label ??
    `Refined atlas from ${left.label ?? "left atlas"} and ${right.label ?? "right atlas"}`

  const refinedAtlas: SchemeAtlas = {
    label,
    charts,
    gluings,
  }

  const refinedSummary = checkSchemeGluing(refinedAtlas, options.checkOptions)

  const details = `${label}: ${refinedSummary.details} Source atlases — left: ${leftSummary.details}; right: ${rightSummary.details}.`

  return {
    atlas: refinedAtlas,
    details,
    summaries: {
      left: leftSummary,
      right: rightSummary,
      refined: refinedSummary,
    },
  }
}

export interface SchemeFiberProductEntry<Base, Left, Right, Apex> {
  readonly square: AffineSchemePullbackSquare<Base, Left, Right, Apex>
  readonly options?: AffineSchemePullbackCheckOptions<Base, Left, Right, Apex>
}

export interface SchemeFiberProductDiagram {
  readonly entries: ReadonlyArray<SchemeFiberProductEntry<any, any, any, any>>
  readonly label?: string
}

export interface SchemeFiberProductCheckOptions {
  readonly witnessLimit?: number
}

export type SchemeFiberProductViolation = {
  readonly kind: "squareFailure"
  readonly index: number
  readonly result: AffineSchemePullbackCheckResult<any, any, any, any>
}

export interface SchemeFiberProductWitness {
  readonly index: number
  readonly violation: SchemeFiberProductViolation
}

export interface SchemeFiberProductCheckResult {
  readonly holds: boolean
  readonly violations: ReadonlyArray<SchemeFiberProductViolation>
  readonly witnesses: ReadonlyArray<SchemeFiberProductWitness>
  readonly details: string
  readonly metadata: {
    readonly entryCount: number
    readonly failureCount: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

export const checkSchemeFiberProduct = (
  diagram: SchemeFiberProductDiagram,
  options: SchemeFiberProductCheckOptions = {},
): SchemeFiberProductCheckResult => {
  const witnessLimit = options.witnessLimit ?? 4
  const violations: SchemeFiberProductViolation[] = []
  const witnesses: SchemeFiberProductWitness[] = []

  let failureCount = 0

  diagram.entries.forEach((entry, index) => {
    const result = checkAffineSchemePullbackSquare(entry.square, entry.options ?? {})
    if (!result.holds) {
      const violation: SchemeFiberProductViolation = { kind: "squareFailure", index, result }
      failureCount += 1
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ index, violation })
      }
    }
  })

  const holds = failureCount === 0
  const details = holds
    ? `Fiber product checks for ${diagram.label ?? "the provided diagram"} succeeded across ${diagram.entries.length} charts.`
    : `${failureCount} fiber product issues detected for ${diagram.label ?? "the provided diagram"}.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      entryCount: diagram.entries.length,
      failureCount,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}
