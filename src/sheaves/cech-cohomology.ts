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

const cartesianProduct = <A>(factors: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<ReadonlyArray<A>> => {
  if (factors.length === 0) {
    return [[]]
  }

  return factors.reduce<ReadonlyArray<ReadonlyArray<A>>>(
    (acc, factor) => {
      const next: Array<ReadonlyArray<A>> = []
      for (const prefix of acc) {
        for (const value of factor) {
          next.push([...prefix, value])
        }
      }
      return next
    },
    [[]],
  )
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

const keyOf = (indices: ReadonlyArray<number>): string => indices.join("|")

const isStrictlyIncreasing = (values: ReadonlyArray<number>): boolean =>
  values.every((value, index) => index === 0 || value > values[index - 1]!)

const sameKey = (left: ReadonlyArray<number>, right: ReadonlyArray<number>): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index])

const dedupeVectors = <Section>(
  vectors: ReadonlyArray<ReadonlyArray<Section>>,
  eq: Equality<Section>,
): ReadonlyArray<ReadonlyArray<Section>> => {
  const vectorEq: Equality<ReadonlyArray<Section>> = (left, right) =>
    left.length === right.length && left.every((value, index) => eq(value, right[index]!))
  return dedupe(vectors, vectorEq)
}

const buildProductModule = <R, Section>(
  base: Module<R, Section>,
  size: number,
  label: string,
  eq: Equality<Section>,
): Module<R, ReadonlyArray<Section>> => {
  const vectorEq: Equality<ReadonlyArray<Section>> = (left, right) =>
    left.length === right.length && left.every((value, index) => eq(value, right[index]!))

  const zeroVector = Array.from({ length: size }, () => base.zero) as ReadonlyArray<Section>

  return {
    ring: base.ring,
    zero: zeroVector,
    add: (left, right) =>
      left.map((value, index) => base.add(value, right[index]!)) as ReadonlyArray<Section>,
    neg: value => value.map(entry => base.neg(entry)) as ReadonlyArray<Section>,
    scalar: (scalar, value) =>
      value.map(entry => base.scalar(scalar, entry)) as ReadonlyArray<Section>,
    eq: vectorEq,
    name: label,
  }
}

export interface CechIntersectionFace<Arr> {
  readonly omit: number
  readonly targetKey: ReadonlyArray<number>
  readonly arrow: Arr
  readonly label?: string
}

export interface MultiOpenCechCell<Obj, Arr, Section> {
  readonly key: ReadonlyArray<number>
  readonly object: Obj
  readonly faces: ReadonlyArray<CechIntersectionFace<Arr>>
  readonly samples?: ReadonlyArray<Section>
  readonly label?: string
}

export interface MultiOpenCechSetup<Obj, Arr, Section, R> {
  readonly sheaf: Sheaf<Obj, Arr, Section>
  readonly covering: CoveringFamily<Obj, Arr>
  readonly module: Module<R, Section>
  readonly intersections: ReadonlyArray<MultiOpenCechCell<Obj, Arr, Section>>
  readonly coveringSamples?: ReadonlyArray<ReadonlyArray<Section> | undefined>
  readonly label?: string
}

export interface CechDerivedMismatch {
  readonly degree: number
  readonly actualRank: number
  readonly expectedRank: number
  readonly actualKernel: number
  readonly expectedKernel: number
  readonly actualImage: number
  readonly expectedImage: number
}

export interface CechDerivedComparison {
  readonly provided: CohomologyAnalysis
  readonly matches: boolean
  readonly mismatches: ReadonlyArray<CechDerivedMismatch>
  readonly details: string
}

export interface CechCohomologyOptions {
  readonly chain?: ChainComplexCheckOptions
  readonly derived?: CohomologyAnalysis
}

export interface CechCohomologyResult {
  readonly holds: boolean
  readonly complex: ChainComplex<any>
  readonly chainCheck: ChainComplexCheckResult
  readonly cohomology: CohomologyAnalysis
  readonly derivedComparison?: CechDerivedComparison
  readonly details: string
}

interface NormalizedCechCell<Obj, Arr, Section> {
  readonly key: ReadonlyArray<number>
  readonly object: Obj
  readonly faces: ReadonlyArray<CechIntersectionFace<Arr>>
  readonly samples: ReadonlyArray<Section>
  readonly label?: string
}

interface LevelInfo<R, Section> {
  readonly degree: number
  readonly cells: ReadonlyArray<NormalizedCechCell<any, any, Section>>
  readonly module: Module<R, ReadonlyArray<Section>>
  readonly elements: ReadonlyArray<ReadonlyArray<Section>>
  readonly indexByKey: Map<string, number>
}

export const buildCechComplex = <Obj, Arr, Section, R>(
  setup: MultiOpenCechSetup<Obj, Arr, Section, R>,
): ChainComplex<R> => {
  const { sheaf, covering, module } = setup
  const coveringArrows = covering.arrows
  if (coveringArrows.length === 0) {
    throw new Error("Čech complex requires a non-empty covering family.")
  }

  const site = sheaf.site
  const eqSection = withEquality(sheaf.sectionEq)

  const coveringCells: NormalizedCechCell<Obj, Arr, Section>[] = coveringArrows.map((arrow, index) => {
    const domain = site.category.src(arrow)
    const provided = setup.coveringSamples?.[index]
    const samples = dedupe(provided ?? sheaf.sections(domain), eqSection)
    return {
      key: [index],
      object: domain,
      faces: [],
      samples,
  label: covering.label ? `${covering.label}[${index}]` : "",
    }
  })

  const normalizedIntersections: NormalizedCechCell<Obj, Arr, Section>[] = setup.intersections.map(cell => {
    if (cell.key.length < 2) {
      throw new Error("Čech intersections must involve at least two covering indices.")
    }
    if (!isStrictlyIncreasing(cell.key)) {
      throw new Error("Čech intersection keys must be strictly increasing.")
    }
    if (cell.faces.length !== cell.key.length) {
      throw new Error("Čech intersection must provide one face map per omitted index.")
    }

    const normalizedFaces = cell.faces.map(face => {
      if (face.omit < 0 || face.omit >= cell.key.length) {
        throw new Error("Čech face omission index is out of bounds.")
      }
      const expectedTarget = cell.key.filter((_, index) => index !== face.omit)
      if (!sameKey(expectedTarget, face.targetKey)) {
        throw new Error("Čech face target key does not match omitted index pattern.")
      }
      return face
    })

    const samples = dedupe(cell.samples ?? sheaf.sections(cell.object), eqSection)

    return {
      key: cell.key,
      object: cell.object,
      faces: normalizedFaces,
      samples,
  label: cell.label ?? "",
    }
  })

  const allCells: NormalizedCechCell<Obj, Arr, Section>[] = [...coveringCells, ...normalizedIntersections]
  const cellByKey = new Map<string, NormalizedCechCell<Obj, Arr, Section>>()
  for (const cell of allCells) {
    const key = keyOf(cell.key)
    if (cellByKey.has(key)) {
      throw new Error(`Duplicate Čech intersection data for key ${key}.`)
    }
    cellByKey.set(key, cell)
  }

  for (const cell of normalizedIntersections) {
    for (const face of cell.faces) {
      const targetKey = keyOf(face.targetKey)
      if (!cellByKey.has(targetKey)) {
        throw new Error(`Čech intersection missing target for face ${targetKey}.`)
      }
    }
  }

  const maxLength = allCells.reduce((current, cell) => Math.max(current, cell.key.length), 1)
  const levels: ChainComplexLevel<R, ReadonlyArray<Section>>[] = []
  const levelInfos: LevelInfo<R, Section>[] = []

  for (let length = 1; length <= maxLength; length += 1) {
    const degree = length - 1
    const cellsAtLength = allCells.filter(cell => cell.key.length === length)
    if (cellsAtLength.length === 0) {
      continue
    }

    const moduleLabel = setup.label
      ? `C^${degree}(${setup.label})`
      : covering.label
        ? `C^${degree}(${covering.label})`
        : `C^${degree}`
    const moduleForLevel = buildProductModule(module, cellsAtLength.length, moduleLabel, eqSection)

    const factorSamples = cellsAtLength.map(cell => cell.samples)
    const elements = dedupeVectors(cartesianProduct(factorSamples), eqSection)

    const level: ChainComplexLevel<R, ReadonlyArray<Section>> = {
      degree,
      module: moduleForLevel,
      elements,
  label: `C^${degree}`,
    }
    levels.push(level)

    const indexByKey = new Map<string, number>()
    cellsAtLength.forEach((cell, index) => {
      indexByKey.set(keyOf(cell.key), index)
    })

    levelInfos[degree] = {
      degree,
      cells: cellsAtLength,
      module: moduleForLevel,
      elements,
      indexByKey,
    }
  }

  const differentials: ChainComplexDifferential<R, ReadonlyArray<Section>, ReadonlyArray<Section>>[] = []

  for (let degree = 0; degree < levelInfos.length - 1; degree += 1) {
    const sourceInfo = levelInfos[degree]
    const targetInfo = levelInfos[degree + 1]
    if (!sourceInfo || !targetInfo) {
      continue
    }

    const differential: ChainComplexDifferential<R, ReadonlyArray<Section>, ReadonlyArray<Section>> = {
      source: sourceInfo.module,
      target: targetInfo.module,
      sourceDegree: degree,
      targetDegree: degree + 1,
      label: `δ^${degree}`,
      map: cochain => {
        const outputs: Section[] = targetInfo.cells.map(() => module.zero)

        targetInfo.cells.forEach((cell, cellIndex) => {
          let value = module.zero
          cell.faces.forEach(face => {
            const sourceIndex = sourceInfo.indexByKey.get(keyOf(face.targetKey))
            if (sourceIndex === undefined) {
              throw new Error(`Čech differential missing source for face ${keyOf(face.targetKey)}.`)
            }
            const section = cochain[sourceIndex]
            if (section === undefined) {
              throw new Error(`Čech differential encountered missing section at source ${keyOf(face.targetKey)}.`)
            }
            const restricted = sheaf.restrict(face.arrow, section)
            const signed = face.omit % 2 === 0 ? restricted : module.neg(restricted)
            value = module.add(value, signed)
          })
          outputs[cellIndex] = value
        })

        return outputs as ReadonlyArray<Section>
      },
    }

    differentials.push(differential)
  }

  const label = setup.label ?? `Čech complex for ${covering.label ?? "covering"}`

  return {
    label,
    levels,
    differentials,
  }
}

const compareDerivedAnalyses = (
  actual: CohomologyAnalysis,
  expected: CohomologyAnalysis,
): CechDerivedComparison => {
  const actualByDegree = new Map(actual.groups.map(group => [group.degree, group]))
  const expectedByDegree = new Map(expected.groups.map(group => [group.degree, group]))
  const allDegrees = Array.from(new Set([...actualByDegree.keys(), ...expectedByDegree.keys()])).sort(
    (left, right) => left - right,
  )

  const mismatches: CechDerivedMismatch[] = []
  for (const degree of allDegrees) {
    const actualGroup = actualByDegree.get(degree)
    const expectedGroup = expectedByDegree.get(degree)
    const actualRank = actualGroup?.rank ?? 0
    const expectedRank = expectedGroup?.rank ?? 0
    const actualKernel = actualGroup?.kernelSize ?? 0
    const expectedKernel = expectedGroup?.kernelSize ?? 0
    const actualImage = actualGroup?.imageSize ?? 0
    const expectedImage = expectedGroup?.imageSize ?? 0

    if (actualRank !== expectedRank || actualKernel !== expectedKernel || actualImage !== expectedImage) {
      mismatches.push({
        degree,
        actualRank,
        expectedRank,
        actualKernel,
        expectedKernel,
        actualImage,
        expectedImage,
      })
    }
  }

  const matches = mismatches.length === 0
  const degreeSummary = allDegrees.length > 0 ? allDegrees.join(", ") : "∅"
  const details = matches
    ? `Derived functor comparison matches across degrees ${degreeSummary}.`
    : `Derived functor comparison found ${mismatches.length} mismatch(es) across degrees ${mismatches
        .map(mismatch => mismatch.degree)
        .join(", ")}.`

  return { provided: expected, matches, mismatches, details }
}

export const checkCechCohomology = <Obj, Arr, Section, R>(
  setup: MultiOpenCechSetup<Obj, Arr, Section, R>,
  options: CechCohomologyOptions = {},
): CechCohomologyResult => {
  const complex = buildCechComplex(setup)
  const chainCheck = checkChainComplex(complex, options.chain)
  const cohomology = analyzeCohomology(complex)
  const derivedComparison = options.derived
    ? compareDerivedAnalyses(cohomology, options.derived)
    : undefined
  const holds = chainCheck.holds && (!derivedComparison || derivedComparison.matches)

  const complexLabel = complex.label ? ` ${complex.label}` : ""

  let details: string
  if (chainCheck.holds) {
    details = `Čech complex${complexLabel} validates chain conditions with ${cohomology.groups.length} cohomology degree(s).`
    if (derivedComparison) {
      details += derivedComparison.matches
        ? " Derived functor comparison confirms all sampled ranks."
        : ` Derived functor comparison flagged mismatches at degree(s) ${derivedComparison.mismatches
            .map(mismatch => mismatch.degree)
            .join(", ")}.`
    }
  } else {
    details = `Čech complex${complexLabel} failed chain validation: ${chainCheck.details}`
    if (derivedComparison) {
      details += derivedComparison.matches
        ? " Derived functor comparison agrees with expected ranks despite chain failures."
        : ` Derived functor comparison also flagged mismatches at degree(s) ${derivedComparison.mismatches
            .map(mismatch => mismatch.degree)
            .join(", ")}.`
    }
  }

  return {
    holds,
    complex,
    chainCheck,
    cohomology,
    ...(derivedComparison === undefined ? {} : { derivedComparison }),
    details,
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

const twoOpenToMultiOpenSetup = <Obj, Arr, Section, R>(
  setup: TwoOpenCechSetup<Obj, Arr, Section, R>,
): MultiOpenCechSetup<Obj, Arr, Section, R> => {
  const { sheaf, covering, intersection, module } = setup
  if (covering.arrows.length !== 2) {
    throw new Error("Two-open Čech complex requires exactly two covering arrows.")
  }

  const coveringSamples: Array<ReadonlyArray<Section> | undefined> = []
  coveringSamples[0] = setup.samples?.first
  coveringSamples[1] = setup.samples?.second

  const label =
    setup.label ?? `Čech complex for ${covering.label ?? "two-open cover"}`

  return {
    sheaf,
    covering,
    module,
    intersections: [
      {
        key: [0, 1],
        object: intersection.object,
        faces: [
          { omit: 0, targetKey: [1], arrow: intersection.toSecond },
          { omit: 1, targetKey: [0], arrow: intersection.toFirst },
        ],
  samples: setup.samples?.intersection ?? [],
  label: intersection.label ?? "",
      },
    ],
    coveringSamples,
    label,
  }
}

export const buildTwoOpenCechComplex = <Obj, Arr, Section, R>(
  setup: TwoOpenCechSetup<Obj, Arr, Section, R>,
): ChainComplex<R> => buildCechComplex(twoOpenToMultiOpenSetup(setup))

export type TwoOpenCechCohomologyOptions = CechCohomologyOptions

export type TwoOpenCechCohomologyResult = CechCohomologyResult

export const checkTwoOpenCechCohomology = <Obj, Arr, Section, R>(
  setup: TwoOpenCechSetup<Obj, Arr, Section, R>,
  options: TwoOpenCechCohomologyOptions = {},
): TwoOpenCechCohomologyResult => checkCechCohomology(twoOpenToMultiOpenSetup(setup), options)
