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
    if (candidate.ideal.ring !== spectrum.ring) {
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

  const details = holds
    ? `Scheme gluing for ${atlas.label ?? "the provided atlas"} verified across ${atlas.charts.length} charts.`
    : `${violations.length} gluing issues detected for ${atlas.label ?? "the provided atlas"}.`

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
