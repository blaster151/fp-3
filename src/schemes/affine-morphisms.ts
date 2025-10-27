import type { RingIdeal } from "../algebra/ring/ideals"
import type { PrimeIdealCheckOptions, PrimeIdealCheckResult } from "../algebra/ring/prime-ideals"
import { checkPrimeIdeal } from "../algebra/ring/prime-ideals"
import type { RingHomomorphism } from "../algebra/ring/structures"
import type { PrimeSpectrum, PrimeSpectrumPoint } from "./prime-spectrum"
import type { SchemeChart } from "./global-schemes"

const withEquality = <A>(eq?: (left: A, right: A) => boolean): ((left: A, right: A) => boolean) =>
  eq ?? ((left, right) => Object.is(left, right))

const uniqueWith = <A>(values: ReadonlyArray<A>, eq: (left: A, right: A) => boolean): A[] => {
  const result: A[] = []
  values.forEach(value => {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  })
  return result
}

const gatherSamples = <A>(
  explicit: ReadonlyArray<A> | undefined,
  points: ReadonlyArray<PrimeSpectrumPoint<A>>,
  eq: (left: A, right: A) => boolean,
): A[] => {
  const fromPoints = points.flatMap(point => point.samples ?? [])
  const combined = explicit ? [...explicit, ...fromPoints] : fromPoints
  return uniqueWith(combined, eq)
}

const idealsAgreeOnSamples = <A>(
  left: RingIdeal<A>,
  right: RingIdeal<A>,
  samples: ReadonlyArray<A>,
): boolean => samples.every(sample => left.contains(sample) === right.contains(sample))

export const pullbackIdeal = <Source, Target>(
  homomorphism: RingHomomorphism<Source, Target>,
  ideal: RingIdeal<Target>,
  label?: string,
): RingIdeal<Source> => {
  const name = label ?? (ideal.name ? `${ideal.name}^*` : undefined)
  return {
    ring: homomorphism.source,
    contains: (value: Source) => ideal.contains(homomorphism.map(value)),
    ...(name === undefined ? {} : { name }),
  }
}

export interface AffineSchemeMorphism<Source, Target> {
  readonly ringMap: RingHomomorphism<Source, Target>
  readonly domain: PrimeSpectrum<Target>
  readonly codomain: PrimeSpectrum<Source>
  readonly label?: string
}

export interface AffineSchemeMorphismCheckOptions<Source, Target> {
  readonly codomainSamples?: ReadonlyArray<Source>
  readonly domainSamples?: ReadonlyArray<Target>
  readonly principalGenerators?: ReadonlyArray<Source>
  readonly requireImagePoint?: boolean
  readonly witnessLimit?: number
  readonly primeIdeal?: PrimeIdealCheckOptions<Source>
}

export type AffineSchemeMorphismViolation<Source, Target> =
  | { readonly kind: "domainSpectrumMismatch"; readonly ringLabel?: string }
  | { readonly kind: "codomainSpectrumMismatch"; readonly ringLabel?: string }
  | { readonly kind: "domainPointRingMismatch"; readonly index: number; readonly point: PrimeSpectrumPoint<Target> }
  | { readonly kind: "codomainPointRingMismatch"; readonly index: number; readonly point: PrimeSpectrumPoint<Source> }
  | {
      readonly kind: "preimageNotPrime"
      readonly index: number
      readonly point: PrimeSpectrumPoint<Target>
      readonly result: PrimeIdealCheckResult<Source>
    }
  | {
      readonly kind: "missingImagePoint"
      readonly index: number
      readonly point: PrimeSpectrumPoint<Target>
      readonly preimage: RingIdeal<Source>
    }
  | {
      readonly kind: "principalOpenMismatch"
      readonly index: number
      readonly point: PrimeSpectrumPoint<Target>
      readonly generator: Source
      readonly mapped: Target
      readonly preimageContains: boolean
      readonly imageContains: boolean
    }

export interface AffineSchemeMorphismWitness<Source, Target> {
  readonly index?: number
  readonly point?: PrimeSpectrumPoint<Target>
  readonly preimage?: RingIdeal<Source>
  readonly imagePoint?: { readonly point: PrimeSpectrumPoint<Source>; readonly index: number }
  readonly violation?: AffineSchemeMorphismViolation<Source, Target>
}

export interface AffineSchemeMorphismCheckResult<Source, Target> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<AffineSchemeMorphismViolation<Source, Target>>
  readonly witnesses: ReadonlyArray<AffineSchemeMorphismWitness<Source, Target>>
  readonly details: string
  readonly metadata: {
    readonly domainPoints: number
    readonly codomainPoints: number
    readonly codomainSampleCandidates: number
    readonly domainSampleCandidates: number
    readonly preimagePrimeFailures: number
    readonly imageMatches: number
    readonly principalOpenChecks: number
    readonly principalOpenFailures: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
    readonly requireImagePoint: boolean
  }
}

const locateMatchingPoint = <A>(
  spectrum: PrimeSpectrum<A>,
  ideal: RingIdeal<A>,
  samples: ReadonlyArray<A>,
): { readonly point: PrimeSpectrumPoint<A>; readonly index: number } | undefined => {
  for (let index = 0; index < spectrum.points.length; index += 1) {
    const point = spectrum.points[index]
    if (!point) {
      continue
    }
    if (point.ideal.ring !== spectrum.ring) {
      continue
    }
    if (idealsAgreeOnSamples(point.ideal, ideal, samples)) {
      return { point, index }
    }
  }
  return undefined
}

export const checkAffineSchemeMorphism = <Source, Target>(
  morphism: AffineSchemeMorphism<Source, Target>,
  options: AffineSchemeMorphismCheckOptions<Source, Target> = {},
): AffineSchemeMorphismCheckResult<Source, Target> => {
  const witnessLimit = options.witnessLimit ?? 4
  const requireImagePoint = options.requireImagePoint ?? true

  const domainEq = withEquality(morphism.domain.ring.eq)
  const codomainEq = withEquality(morphism.codomain.ring.eq)

  const domainSamples = gatherSamples(options.domainSamples, morphism.domain.points, domainEq)
  const codomainSamples = gatherSamples(options.codomainSamples, morphism.codomain.points, codomainEq)

  const principalGenerators = options.principalGenerators ?? []

  const violations: AffineSchemeMorphismViolation<Source, Target>[] = []
  const witnesses: AffineSchemeMorphismWitness<Source, Target>[] = []

  let preimagePrimeFailures = 0
  let principalOpenChecks = 0
  let principalOpenFailures = 0
  let imageMatches = 0

  if (morphism.domain.ring !== morphism.ringMap.target) {
    const ringLabel = morphism.domain.label
    violations.push(
      ringLabel === undefined
        ? { kind: "domainSpectrumMismatch" }
        : { kind: "domainSpectrumMismatch", ringLabel },
    )
  }

  if (morphism.codomain.ring !== morphism.ringMap.source) {
    const ringLabel = morphism.codomain.label
    violations.push(
      ringLabel === undefined
        ? { kind: "codomainSpectrumMismatch" }
        : { kind: "codomainSpectrumMismatch", ringLabel },
    )
  }

  morphism.codomain.points.forEach((point, index) => {
    if (point.ideal.ring !== morphism.codomain.ring) {
      const violation: AffineSchemeMorphismViolation<Source, Target> = {
        kind: "codomainPointRingMismatch",
        index,
        point,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ index, violation })
      }
    }
  })

  morphism.domain.points.forEach((point, index) => {
    if (point.ideal.ring !== morphism.domain.ring) {
      const violation: AffineSchemeMorphismViolation<Source, Target> = {
        kind: "domainPointRingMismatch",
        index,
        point,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ index, point, violation })
      }
      return
    }

    const preimage = pullbackIdeal(morphism.ringMap, point.ideal, point.label ? `${point.label}^*` : undefined)

    const primeOptions: PrimeIdealCheckOptions<Source> = {
      ...options.primeIdeal,
      ringSamples: options.primeIdeal?.ringSamples ?? codomainSamples,
    }

    const primeResult = checkPrimeIdeal(preimage, primeOptions)
    if (!primeResult.holds) {
      preimagePrimeFailures += 1
      const violation: AffineSchemeMorphismViolation<Source, Target> = {
        kind: "preimageNotPrime",
        index,
        point,
        result: primeResult,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ index, point, preimage, violation })
      }
      return
    }

    const match = locateMatchingPoint(morphism.codomain, preimage, codomainSamples)
    if (match) {
      imageMatches += 1
      if (witnesses.length < witnessLimit) {
        witnesses.push({ index, point, preimage, imagePoint: match })
      }
    } else if (requireImagePoint) {
      const violation: AffineSchemeMorphismViolation<Source, Target> = {
        kind: "missingImagePoint",
        index,
        point,
        preimage,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ index, point, preimage, violation })
      }
    }

    principalGenerators.forEach(generator => {
      const mapped = morphism.ringMap.map(generator)
      const preimageContains = preimage.contains(generator)
      const imageContains = point.ideal.contains(mapped)
      principalOpenChecks += 1
      if (preimageContains !== imageContains) {
        principalOpenFailures += 1
        const violation: AffineSchemeMorphismViolation<Source, Target> = {
          kind: "principalOpenMismatch",
          index,
          point,
          generator,
          mapped,
          preimageContains,
          imageContains,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ index, point, preimage, violation })
        }
      }
    })
  })

  const holds = violations.length === 0
  const label = morphism.label ?? "affine scheme morphism"
  const detail = holds
    ? `${label} validated across ${morphism.domain.points.length} point${
        morphism.domain.points.length === 1 ? "" : "s"
      }.`
    : `${label} encountered ${violations.length} issue${violations.length === 1 ? "" : "s"}.`

  return {
    holds,
    violations,
    witnesses,
    details: detail,
    metadata: {
      domainPoints: morphism.domain.points.length,
      codomainPoints: morphism.codomain.points.length,
      codomainSampleCandidates: codomainSamples.length,
      domainSampleCandidates: domainSamples.length,
      preimagePrimeFailures,
      imageMatches,
      principalOpenChecks,
      principalOpenFailures,
      witnessLimit,
      witnessesRecorded: witnesses.length,
      requireImagePoint,
    },
  }
}

export interface AffineSchemePullbackSquare<Base, Left, Right, Apex> {
  readonly base: PrimeSpectrum<Base>
  readonly left: {
    readonly spectrum: PrimeSpectrum<Left>
    readonly map: RingHomomorphism<Base, Left>
  }
  readonly right: {
    readonly spectrum: PrimeSpectrum<Right>
    readonly map: RingHomomorphism<Base, Right>
  }
  readonly apex: {
    readonly spectrum: PrimeSpectrum<Apex>
    readonly leftMap: RingHomomorphism<Left, Apex>
    readonly rightMap: RingHomomorphism<Right, Apex>
  }
  readonly label?: string
}

export interface AffineSchemePullbackCheckOptions<Base, Left, Right, Apex> {
  readonly baseSamples?: ReadonlyArray<Base>
  readonly leftSamples?: ReadonlyArray<Left>
  readonly rightSamples?: ReadonlyArray<Right>
  readonly witnessLimit?: number
  readonly matchingPairs?: ReadonlyArray<{ readonly leftIndex: number; readonly rightIndex: number; readonly apexIndex?: number }>
  readonly leftPrimeOptions?: PrimeIdealCheckOptions<Left>
  readonly rightPrimeOptions?: PrimeIdealCheckOptions<Right>
}

export type AffineSchemePullbackViolation<Base, Left, Right, Apex> =
  | { readonly kind: "baseSpectrumMismatch"; readonly ringLabel?: string }
  | { readonly kind: "leftSpectrumMismatch"; readonly ringLabel?: string }
  | { readonly kind: "rightSpectrumMismatch"; readonly ringLabel?: string }
  | { readonly kind: "apexSpectrumMismatch"; readonly ringLabel?: string }
  | { readonly kind: "leftPointRingMismatch"; readonly index: number; readonly point: PrimeSpectrumPoint<Left> }
  | { readonly kind: "rightPointRingMismatch"; readonly index: number; readonly point: PrimeSpectrumPoint<Right> }
  | { readonly kind: "apexPointRingMismatch"; readonly index: number; readonly point: PrimeSpectrumPoint<Apex> }
  | {
      readonly kind: "leftPreimageNotPrime"
      readonly apexIndex: number
      readonly apexPoint: PrimeSpectrumPoint<Apex>
      readonly result: PrimeIdealCheckResult<Left>
    }
  | {
      readonly kind: "rightPreimageNotPrime"
      readonly apexIndex: number
      readonly apexPoint: PrimeSpectrumPoint<Apex>
      readonly result: PrimeIdealCheckResult<Right>
    }
  | {
      readonly kind: "leftImageMissing"
      readonly apexIndex: number
      readonly apexPoint: PrimeSpectrumPoint<Apex>
      readonly preimage: RingIdeal<Left>
    }
  | {
      readonly kind: "rightImageMissing"
      readonly apexIndex: number
      readonly apexPoint: PrimeSpectrumPoint<Apex>
      readonly preimage: RingIdeal<Right>
    }
  | {
      readonly kind: "baseMismatch"
      readonly apexIndex: number
      readonly apexPoint: PrimeSpectrumPoint<Apex>
      readonly leftPreimage: RingIdeal<Base>
      readonly rightPreimage: RingIdeal<Base>
      readonly leftIndex?: number
      readonly rightIndex?: number
    }
  | { readonly kind: "matchingPairMissing"; readonly leftIndex: number; readonly rightIndex: number }

export interface AffineSchemePullbackWitness<Base, Left, Right, Apex> {
  readonly apexIndex?: number
  readonly apexPoint?: PrimeSpectrumPoint<Apex>
  readonly leftPreimage?: RingIdeal<Left>
  readonly rightPreimage?: RingIdeal<Right>
  readonly baseLeftPreimage?: RingIdeal<Base>
  readonly baseRightPreimage?: RingIdeal<Base>
  readonly leftPoint?: { readonly point: PrimeSpectrumPoint<Left>; readonly index: number }
  readonly rightPoint?: { readonly point: PrimeSpectrumPoint<Right>; readonly index: number }
  readonly violation?: AffineSchemePullbackViolation<Base, Left, Right, Apex>
}

export interface AffineSchemePullbackCheckResult<Base, Left, Right, Apex> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<AffineSchemePullbackViolation<Base, Left, Right, Apex>>
  readonly witnesses: ReadonlyArray<AffineSchemePullbackWitness<Base, Left, Right, Apex>>
  readonly details: string
  readonly metadata: {
    readonly apexPoints: number
    readonly baseSampleCandidates: number
    readonly leftSampleCandidates: number
    readonly rightSampleCandidates: number
    readonly leftPrimeFailures: number
    readonly rightPrimeFailures: number
    readonly baseAgreementFailures: number
    readonly matchingPairChecks: number
    readonly matchingPairFailures: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

export const checkAffineSchemePullbackSquare = <Base, Left, Right, Apex>(
  square: AffineSchemePullbackSquare<Base, Left, Right, Apex>,
  options: AffineSchemePullbackCheckOptions<Base, Left, Right, Apex> = {},
): AffineSchemePullbackCheckResult<Base, Left, Right, Apex> => {
  const witnessLimit = options.witnessLimit ?? 4

  const baseEq = withEquality(square.base.ring.eq)
  const leftEq = withEquality(square.left.spectrum.ring.eq)
  const rightEq = withEquality(square.right.spectrum.ring.eq)

  const baseSamples = gatherSamples(options.baseSamples, square.base.points, baseEq)
  const leftSamples = gatherSamples(options.leftSamples, square.left.spectrum.points, leftEq)
  const rightSamples = gatherSamples(options.rightSamples, square.right.spectrum.points, rightEq)

  const violations: AffineSchemePullbackViolation<Base, Left, Right, Apex>[] = []
  const witnesses: AffineSchemePullbackWitness<Base, Left, Right, Apex>[] = []

  let leftPrimeFailures = 0
  let rightPrimeFailures = 0
  let baseAgreementFailures = 0

  if (square.base.ring !== square.left.map.source || square.base.ring !== square.right.map.source) {
    const ringLabel = square.base.label
    violations.push(
      ringLabel === undefined
        ? { kind: "baseSpectrumMismatch" }
        : { kind: "baseSpectrumMismatch", ringLabel },
    )
  }
  if (square.left.spectrum.ring !== square.left.map.target) {
    const ringLabel = square.left.spectrum.label
    violations.push(
      ringLabel === undefined
        ? { kind: "leftSpectrumMismatch" }
        : { kind: "leftSpectrumMismatch", ringLabel },
    )
  }
  if (square.right.spectrum.ring !== square.right.map.target) {
    const ringLabel = square.right.spectrum.label
    violations.push(
      ringLabel === undefined
        ? { kind: "rightSpectrumMismatch" }
        : { kind: "rightSpectrumMismatch", ringLabel },
    )
  }
  if (
    square.apex.spectrum.ring !== square.apex.leftMap.target ||
    square.apex.spectrum.ring !== square.apex.rightMap.target
  ) {
    const ringLabel = square.apex.spectrum.label
    violations.push(
      ringLabel === undefined
        ? { kind: "apexSpectrumMismatch" }
        : { kind: "apexSpectrumMismatch", ringLabel },
    )
  }

  square.left.spectrum.points.forEach((point, index) => {
    if (point.ideal.ring !== square.left.spectrum.ring) {
      violations.push({ kind: "leftPointRingMismatch", index, point })
    }
  })
  square.right.spectrum.points.forEach((point, index) => {
    if (point.ideal.ring !== square.right.spectrum.ring) {
      violations.push({ kind: "rightPointRingMismatch", index, point })
    }
  })

  const leftMatches: Array<number | undefined> = []
  const rightMatches: Array<number | undefined> = []

  square.apex.spectrum.points.forEach((point, apexIndex) => {
    if (point.ideal.ring !== square.apex.spectrum.ring) {
      const violation: AffineSchemePullbackViolation<Base, Left, Right, Apex> = {
        kind: "apexPointRingMismatch",
        index: apexIndex,
        point,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ apexIndex, apexPoint: point, violation })
      }
      leftMatches[apexIndex] = undefined
      rightMatches[apexIndex] = undefined
      return
    }

    const leftPreimage = pullbackIdeal(square.apex.leftMap, point.ideal, point.label ? `${point.label}_{left}` : undefined)
    const rightPreimage = pullbackIdeal(square.apex.rightMap, point.ideal, point.label ? `${point.label}_{right}` : undefined)

    const leftPrimeOptions: PrimeIdealCheckOptions<Left> = {
      ...options.leftPrimeOptions,
      ringSamples: options.leftPrimeOptions?.ringSamples ?? leftSamples,
    }
    const rightPrimeOptions: PrimeIdealCheckOptions<Right> = {
      ...options.rightPrimeOptions,
      ringSamples: options.rightPrimeOptions?.ringSamples ?? rightSamples,
    }

    const leftPrime = checkPrimeIdeal(leftPreimage, leftPrimeOptions)
    if (!leftPrime.holds) {
      leftPrimeFailures += 1
      const violation: AffineSchemePullbackViolation<Base, Left, Right, Apex> = {
        kind: "leftPreimageNotPrime",
        apexIndex,
        apexPoint: point,
        result: leftPrime,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ apexIndex, apexPoint: point, leftPreimage, violation })
      }
      return
    }

    const rightPrime = checkPrimeIdeal(rightPreimage, rightPrimeOptions)
    if (!rightPrime.holds) {
      rightPrimeFailures += 1
      const violation: AffineSchemePullbackViolation<Base, Left, Right, Apex> = {
        kind: "rightPreimageNotPrime",
        apexIndex,
        apexPoint: point,
        result: rightPrime,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ apexIndex, apexPoint: point, rightPreimage, violation })
      }
      return
    }

    const leftMatch = locateMatchingPoint(square.left.spectrum, leftPreimage, leftSamples)
    if (!leftMatch) {
      const violation: AffineSchemePullbackViolation<Base, Left, Right, Apex> = {
        kind: "leftImageMissing",
        apexIndex,
        apexPoint: point,
        preimage: leftPreimage,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ apexIndex, apexPoint: point, leftPreimage, violation })
      }
    }
    const rightMatch = locateMatchingPoint(square.right.spectrum, rightPreimage, rightSamples)
    if (!rightMatch) {
      const violation: AffineSchemePullbackViolation<Base, Left, Right, Apex> = {
        kind: "rightImageMissing",
        apexIndex,
        apexPoint: point,
        preimage: rightPreimage,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ apexIndex, apexPoint: point, rightPreimage, violation })
      }
    }

    leftMatches[apexIndex] = leftMatch?.index
    rightMatches[apexIndex] = rightMatch?.index

    const baseFromLeft = pullbackIdeal(square.left.map, leftPreimage, point.label ? `${point.label}_{base}` : undefined)
    const baseFromRight = pullbackIdeal(square.right.map, rightPreimage, point.label ? `${point.label}_{base}` : undefined)

    if (!idealsAgreeOnSamples(baseFromLeft, baseFromRight, baseSamples)) {
      baseAgreementFailures += 1
      const violation: AffineSchemePullbackViolation<Base, Left, Right, Apex> = {
        kind: "baseMismatch",
        apexIndex,
        apexPoint: point,
        leftPreimage: baseFromLeft,
        rightPreimage: baseFromRight,
        ...(leftMatch ? { leftIndex: leftMatch.index } : {}),
        ...(rightMatch ? { rightIndex: rightMatch.index } : {}),
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({
          apexIndex,
          apexPoint: point,
          leftPreimage,
          rightPreimage,
          baseLeftPreimage: baseFromLeft,
          baseRightPreimage: baseFromRight,
          ...(leftMatch ? { leftPoint: leftMatch } : {}),
          ...(rightMatch ? { rightPoint: rightMatch } : {}),
          violation,
        })
      }
      return
    }

    if (witnesses.length < witnessLimit && leftMatch && rightMatch) {
      witnesses.push({
        apexIndex,
        apexPoint: point,
        leftPreimage,
        rightPreimage,
        baseLeftPreimage: baseFromLeft,
        baseRightPreimage: baseFromRight,
        leftPoint: leftMatch,
        rightPoint: rightMatch,
      })
    }
  })

  let matchingPairFailures = 0
  let matchingPairChecks = 0
  const pairs = options.matchingPairs ?? []
  pairs.forEach(pair => {
    matchingPairChecks += 1
    const found = square.apex.spectrum.points.findIndex((_, index) => {
      const leftIndex = leftMatches[index]
      const rightIndex = rightMatches[index]
      if (pair.apexIndex !== undefined && pair.apexIndex !== index) {
        return false
      }
      return leftIndex === pair.leftIndex && rightIndex === pair.rightIndex
    })
    if (found === -1) {
      matchingPairFailures += 1
      const violation: AffineSchemePullbackViolation<Base, Left, Right, Apex> = {
        kind: "matchingPairMissing",
        leftIndex: pair.leftIndex,
        rightIndex: pair.rightIndex,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ violation })
      }
    }
  })

  const holds = violations.length === 0
  const label = square.label ?? "affine scheme pullback"
  const details = holds
    ? `${label} validated across ${square.apex.spectrum.points.length} apex point${
        square.apex.spectrum.points.length === 1 ? "" : "s"
      }.`
    : `${label} encountered ${violations.length} issue${violations.length === 1 ? "" : "s"}.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      apexPoints: square.apex.spectrum.points.length,
      baseSampleCandidates: baseSamples.length,
      leftSampleCandidates: leftSamples.length,
      rightSampleCandidates: rightSamples.length,
      leftPrimeFailures,
      rightPrimeFailures,
      baseAgreementFailures,
      matchingPairChecks,
      matchingPairFailures,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

export interface AffineFiberProductComputation<Base, Left, Right, Apex> {
  readonly chart: SchemeChart<Apex>
  readonly result: AffineSchemePullbackCheckResult<Base, Left, Right, Apex>
}

export type AffineFiberProductCheck<Base, Left, Right, Apex> = (
  options?: AffineSchemePullbackCheckOptions<Base, Left, Right, Apex>,
) => AffineFiberProductComputation<Base, Left, Right, Apex>

export interface AffineFiberProductBuilderOptions<Apex> {
  readonly chart: SchemeChart<Apex>
}

export const buildAffineFiberProduct = <Base, Left, Right, Apex>(
  square: AffineSchemePullbackSquare<Base, Left, Right, Apex>,
  builderOptions: AffineFiberProductBuilderOptions<Apex>,
): AffineFiberProductCheck<Base, Left, Right, Apex> => {
  const baseEq = withEquality(square.base.ring.eq)
  const leftEq = withEquality(square.left.spectrum.ring.eq)
  const rightEq = withEquality(square.right.spectrum.ring.eq)
  const apexEq = withEquality(square.apex.spectrum.ring.eq)

  const defaultBaseSamples = gatherSamples(undefined, square.base.points, baseEq)
  const defaultLeftSamples = gatherSamples(undefined, square.left.spectrum.points, leftEq)
  const defaultRightSamples = gatherSamples(undefined, square.right.spectrum.points, rightEq)
  const defaultApexSamples = gatherSamples(undefined, square.apex.spectrum.points, apexEq)

  const providedChart = builderOptions.chart
  const chart: SchemeChart<Apex> = {
    ...providedChart,
    options: {
      ...(providedChart.options ?? {}),
      spectrum: {
        ...(providedChart.options?.spectrum ?? {}),
        ringSamples: defaultApexSamples,
      },
    },
  }

  return (options = {}) => {
    const baseSamples =
      options.baseSamples === undefined
        ? defaultBaseSamples
        : gatherSamples(options.baseSamples, square.base.points, baseEq)
    const leftSamples =
      options.leftSamples === undefined
        ? defaultLeftSamples
        : gatherSamples(options.leftSamples, square.left.spectrum.points, leftEq)
    const rightSamples =
      options.rightSamples === undefined
        ? defaultRightSamples
        : gatherSamples(options.rightSamples, square.right.spectrum.points, rightEq)

    const derivedOptions: AffineSchemePullbackCheckOptions<Base, Left, Right, Apex> = {
      ...options,
      baseSamples,
      leftSamples,
      rightSamples,
    }

    const result = checkAffineSchemePullbackSquare(square, derivedOptions)
    return { chart, result }
  }
}

