import type { Module, ModuleHomomorphism } from "../algebra/ring/modules"
import type { CoveringFamily } from "./sites"
import type { Sheaf } from "./sheaves"

type Equality<A> = (left: A, right: A) => boolean

const withEquality = <A>(eq?: Equality<A>): Equality<A> => eq ?? ((left, right) => Object.is(left, right))

const dedupe = <A>(values: ReadonlyArray<A>, eq: Equality<A>): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

export interface ChainComplexLevel<R, M> {
  readonly degree: number
  readonly module: Module<R, M>
  readonly elements: ReadonlyArray<M>
  readonly label?: string
}

export interface ChainComplexDifferential<R, Domain, Codomain>
  extends ModuleHomomorphism<R, Domain, Codomain> {
  readonly sourceDegree: number
  readonly targetDegree: number
}

export interface ChainComplex<R> {
  readonly levels: ReadonlyArray<ChainComplexLevel<R, any>>
  readonly differentials: ReadonlyArray<ChainComplexDifferential<R, any, any>>
  readonly label?: string
}

export interface ChainComplexCheckOptions {
  readonly witnessLimit?: number
}

export type ChainComplexViolation =
  | {
      readonly kind: "degreeMismatch"
      readonly sourceDegree: number
      readonly targetDegree: number
      readonly expectedTargetDegree: number
    }
  | {
      readonly kind: "missingLevel"
      readonly degree: number
      readonly role: "source" | "target"
    }
  | {
      readonly kind: "composition"
      readonly degree: number
      readonly nextDegree: number
      readonly element: unknown
      readonly image: unknown
      readonly nextImage: unknown
    }

export interface ChainComplexWitness {
  readonly degree: number
  readonly element: unknown
  readonly violation: ChainComplexViolation
}

export interface ChainComplexCheckMetadata {
  readonly differentials: number
  readonly levels: number
  readonly samplesTested: number
  readonly compositionChecks: number
  readonly witnessLimit: number
  readonly witnessesRecorded: number
}

export interface ChainComplexCheckResult {
  readonly holds: boolean
  readonly violations: ReadonlyArray<ChainComplexViolation>
  readonly witnesses: ReadonlyArray<ChainComplexWitness>
  readonly details: string
  readonly metadata: ChainComplexCheckMetadata
}

export const checkChainComplex = <R>(
  complex: ChainComplex<R>,
  options: ChainComplexCheckOptions = {},
): ChainComplexCheckResult => {
  const witnessLimit = options.witnessLimit ?? 3
  const violations: ChainComplexViolation[] = []
  const witnesses: ChainComplexWitness[] = []

  const levelByDegree = new Map<number, ChainComplexLevel<R, any>>()
  for (const level of complex.levels) {
    levelByDegree.set(level.degree, level)
  }

  const differentialBySource = new Map<number, ChainComplexDifferential<R, any, any>>()
  for (const differential of complex.differentials) {
    differentialBySource.set(differential.sourceDegree, differential)
  }

  let samplesTested = 0
  let compositionChecks = 0

  for (const differential of complex.differentials) {
    const sourceLevel = levelByDegree.get(differential.sourceDegree)
    if (!sourceLevel) {
      const violation: ChainComplexViolation = {
        kind: "missingLevel",
        degree: differential.sourceDegree,
        role: "source",
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ degree: differential.sourceDegree, element: undefined, violation })
      }
      continue
    }

    const targetLevel = levelByDegree.get(differential.targetDegree)
    if (!targetLevel) {
      const violation: ChainComplexViolation = {
        kind: "missingLevel",
        degree: differential.targetDegree,
        role: "target",
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ degree: differential.targetDegree, element: undefined, violation })
      }
      continue
    }

    const expectedTarget = differential.sourceDegree + 1
    if (differential.targetDegree !== expectedTarget) {
      const violation: ChainComplexViolation = {
        kind: "degreeMismatch",
        sourceDegree: differential.sourceDegree,
        targetDegree: differential.targetDegree,
        expectedTargetDegree: expectedTarget,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ degree: differential.sourceDegree, element: undefined, violation })
      }
    }

    const nextDifferential = differentialBySource.get(differential.targetDegree)
    const nextEq = nextDifferential ? withEquality(nextDifferential.target.eq) : undefined
    const nextZero = nextDifferential ? nextDifferential.target.zero : undefined

    for (const element of sourceLevel.elements) {
      samplesTested += 1
      if (!nextDifferential || !nextEq || nextZero === undefined) {
        continue
      }
      compositionChecks += 1
      const image = differential.map(element)
      const nextImage = nextDifferential.map(image)
      if (!nextEq(nextImage, nextZero)) {
        const violation: ChainComplexViolation = {
          kind: "composition",
          degree: differential.sourceDegree,
          nextDegree: nextDifferential.targetDegree,
          element,
          image,
          nextImage,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ degree: differential.sourceDegree, element, violation })
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? complex.label
      ? `Chain complex ${complex.label} satisfies d^{n+1} ∘ d^n = 0 on ${samplesTested} sample(s).`
      : `Chain complex satisfies d^{n+1} ∘ d^n = 0 on ${samplesTested} sample(s).`
    : `Chain complex${complex.label ? ` ${complex.label}` : ""} exhibits ${violations.length} violation(s).`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      differentials: complex.differentials.length,
      levels: complex.levels.length,
      samplesTested,
      compositionChecks,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

export interface CohomologyGroup<M> {
  readonly degree: number
  readonly kernel: ReadonlyArray<M>
  readonly image: ReadonlyArray<M>
  readonly representatives: ReadonlyArray<M>
  readonly kernelSize: number
  readonly imageSize: number
  readonly rank: number
  readonly details: string
}

export interface CohomologyAnalysis {
  readonly groups: ReadonlyArray<CohomologyGroup<any>>
  readonly details: string
  readonly metadata: {
    readonly degrees: ReadonlyArray<number>
    readonly totalKernelElements: number
    readonly totalImageElements: number
  }
}

export const analyzeCohomology = <R>(complex: ChainComplex<R>): CohomologyAnalysis => {
  const levelByDegree = new Map<number, ChainComplexLevel<R, any>>()
  for (const level of complex.levels) {
    levelByDegree.set(level.degree, level)
  }

  const incomingByDegree = new Map<number, ChainComplexDifferential<R, any, any>>()
  const outgoingByDegree = new Map<number, ChainComplexDifferential<R, any, any>>()
  for (const differential of complex.differentials) {
    outgoingByDegree.set(differential.sourceDegree, differential)
    incomingByDegree.set(differential.targetDegree, differential)
  }

  const degrees = [...levelByDegree.keys()].sort((left, right) => left - right)
  const groups: CohomologyGroup<any>[] = []
  let totalKernel = 0
  let totalImage = 0

  for (const degree of degrees) {
    const level = levelByDegree.get(degree)
    if (!level) {
      continue
    }
    const eqLevel = withEquality(level.module.eq)
    const outgoing = outgoingByDegree.get(degree)
    const incoming = incomingByDegree.get(degree)

    const kernel: any[] = []
    if (outgoing) {
      const eqTarget = withEquality(outgoing.target.eq)
      const zero = outgoing.target.zero
      for (const element of level.elements) {
        const image = outgoing.map(element)
        if (eqTarget(image, zero)) {
          kernel.push(element)
        }
      }
    } else {
      kernel.push(...level.elements)
    }

    const image: any[] = []
    const zero = level.module.zero
    image.push(zero)
    if (incoming) {
      const sourceLevel = levelByDegree.get(incoming.sourceDegree)
      const sourceElements = sourceLevel?.elements ?? []
      for (const element of sourceElements) {
        const mapped = incoming.map(element)
        if (!image.some(existing => eqLevel(existing, mapped))) {
          image.push(mapped)
        }
      }
    }

    const representatives: any[] = []
    for (const element of kernel) {
      let covered = false
      for (const rep of representatives) {
        const difference = level.module.add(element, level.module.neg(rep))
        if (image.some(existing => eqLevel(existing, difference))) {
          covered = true
          break
        }
      }
      if (!covered) {
        representatives.push(element)
      }
    }

    const details = `H^${degree} has kernel size ${kernel.length}, image size ${image.length}, coset count ${representatives.length}.`

    groups.push({
      degree,
      kernel: kernel.slice(),
      image: image.slice(),
      representatives,
      kernelSize: kernel.length,
      imageSize: image.length,
      rank: representatives.length,
      details,
    })

    totalKernel += kernel.length
    totalImage += image.length
  }

  const details = complex.label
    ? `Computed cohomology for ${complex.label} across degrees ${degrees.join(", ")}.`
    : `Computed cohomology across degrees ${degrees.join(", ")}.`

  return {
    groups,
    details,
    metadata: {
      degrees,
      totalKernelElements: totalKernel,
      totalImageElements: totalImage,
    },
  }
}

export interface TwoOpenIntersection<Obj, Arr> {
  readonly object: Obj
  readonly toFirst: Arr
  readonly toSecond: Arr
  readonly label?: string
}

export interface TwoOpenCechSamples<Section> {
  readonly first?: ReadonlyArray<Section>
  readonly second?: ReadonlyArray<Section>
  readonly intersection?: ReadonlyArray<Section>
}

export interface TwoOpenCechSetup<Obj, Arr, Section, R> {
  readonly sheaf: Sheaf<Obj, Arr, Section>
  readonly covering: CoveringFamily<Obj, Arr>
  readonly intersection: TwoOpenIntersection<Obj, Arr>
  readonly module: Module<R, Section>
  readonly samples?: TwoOpenCechSamples<Section>
  readonly label?: string
}

const pairEquality = <Section>(eq: Equality<Section>): Equality<readonly [Section, Section]> =>
  (left, right) => eq(left[0], right[0]) && eq(left[1], right[1])

const cartesianPairs = <Section>(
  first: ReadonlyArray<Section>,
  second: ReadonlyArray<Section>,
): Array<readonly [Section, Section]> => {
  const result: Array<readonly [Section, Section]> = []
  for (const left of first) {
    for (const right of second) {
      result.push([left, right] as const)
    }
  }
  return result
}

export const buildTwoOpenCechComplex = <Obj, Arr, Section, R>(
  setup: TwoOpenCechSetup<Obj, Arr, Section, R>,
): ChainComplex<R> => {
  const { sheaf, covering, intersection, module } = setup
  if (covering.arrows.length !== 2) {
    throw new Error("Two-open Čech complex requires exactly two covering arrows.")
  }

  const eqSection = withEquality(sheaf.sectionEq)

  const site = sheaf.site
  const firstArrow = covering.arrows[0]
  const secondArrow = covering.arrows[1]
  if (!firstArrow || !secondArrow) {
    throw new Error("Two-open Čech complex requires two covering arrows.")
  }
  const firstDomain = site.category.src(firstArrow)
  const secondDomain = site.category.src(secondArrow)

  const firstSections = dedupe(
    setup.samples?.first ?? sheaf.sections(firstDomain),
    eqSection,
  )
  const secondSections = dedupe(
    setup.samples?.second ?? sheaf.sections(secondDomain),
    eqSection,
  )
  const intersectionSections = dedupe(
    setup.samples?.intersection ?? sheaf.sections(intersection.object),
    eqSection,
  )

  const pairEq = pairEquality(eqSection)
  const pairModule: Module<R, readonly [Section, Section]> = {
    ring: module.ring,
    zero: [module.zero, module.zero] as const,
    add: (left, right) => [module.add(left[0], right[0]), module.add(left[1], right[1])] as const,
    neg: value => [module.neg(value[0]), module.neg(value[1])] as const,
    scalar: (scalar, value) => [module.scalar(scalar, value[0]), module.scalar(scalar, value[1])] as const,
    eq: pairEq,
    name: `C^0(${setup.label ?? covering.label ?? "two-open cover"})`,
  }

  const cochain0Elements = cartesianPairs(firstSections, secondSections)
  const cochain1Elements = intersectionSections
  const zeroOnly = [module.zero]

  const level0: ChainComplexLevel<R, readonly [Section, Section]> = {
    degree: 0,
    module: pairModule,
    elements: cochain0Elements,
    label: "C^0",
  }

  const level1: ChainComplexLevel<R, Section> = {
    degree: 1,
    module: { ...module, name: `C^1(${setup.label ?? covering.label ?? "two-open cover"})` },
    elements: cochain1Elements,
    label: "C^1",
  }

  const level2: ChainComplexLevel<R, Section> = {
    degree: 2,
    module: { ...module, name: `C^2(${setup.label ?? covering.label ?? "two-open cover"})` },
    elements: zeroOnly,
    label: "C^2",
  }

  const differential0: ChainComplexDifferential<R, readonly [Section, Section], Section> = {
    source: pairModule,
    target: level1.module,
    sourceDegree: 0,
    targetDegree: 1,
    label: "δ^0",
    map: ([firstSection, secondSection]) => {
      const firstRestricted = sheaf.restrict(intersection.toFirst, firstSection)
      const secondRestricted = sheaf.restrict(intersection.toSecond, secondSection)
      return module.add(secondRestricted, module.neg(firstRestricted))
    },
  }

  const differential1: ChainComplexDifferential<R, Section, Section> = {
    source: level1.module,
    target: level2.module,
    sourceDegree: 1,
    targetDegree: 2,
    label: "δ^1",
    map: () => module.zero,
  }

  return {
    label: setup.label ?? `Čech complex for ${covering.label ?? "two-open cover"}`,
    levels: [level0, level1, level2],
    differentials: [differential0, differential1],
  }
}

export interface TwoOpenCechCohomologyOptions {
  readonly chain?: ChainComplexCheckOptions
}

export interface TwoOpenCechCohomologyResult {
  readonly holds: boolean
  readonly complex: ChainComplex<any>
  readonly chainCheck: ChainComplexCheckResult
  readonly cohomology: CohomologyAnalysis
  readonly details: string
}

export const checkTwoOpenCechCohomology = <Obj, Arr, Section, R>(
  setup: TwoOpenCechSetup<Obj, Arr, Section, R>,
  options: TwoOpenCechCohomologyOptions = {},
): TwoOpenCechCohomologyResult => {
  const complex = buildTwoOpenCechComplex(setup)
  const chainCheck = checkChainComplex(complex, options.chain)
  const cohomology = analyzeCohomology(complex)
  const holds = chainCheck.holds
  const details = holds
    ? `Čech complex ${complex.label ?? ""} validates derived functor checks with ${cohomology.groups.length} cohomology degree(s).`
    : `Čech complex ${complex.label ?? ""} failed derived functor checks: ${chainCheck.details}`
  return {
    holds,
    complex,
    chainCheck,
    cohomology,
    details,
  }
}
