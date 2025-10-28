import type { FiniteGroupRepresentation } from "../models/fingroup-subrepresentation"
import {
  analyzeFinGrpRepresentationSemisimplicity,
  certifyFinGrpRepresentationSemisimplicity,
  checkFinGrpRepresentationIrreducible,
  collectFinGrpRepresentationSemisimplicitySummands,
  collectFinGrpRepresentationIrreducibleSummands,
  type FinGrpRepresentationIrreducibilityOptions,
  type FinGrpRepresentationIrreducibilityReport,
  type FinGrpRepresentationIrreducibilityWitness,
  type FinGrpRepresentationSemisimplicityOptions,
  type FinGrpRepresentationSemisimplicityReport,
  type FinGrpRepresentationSemisimplicitySummandsOptions,
  type FinGrpRepresentationSemisimplicitySummandsReport,
  type FinGrpRepresentationIrreducibleSummandsOptions,
  type FinGrpRepresentationIrreducibleSummandsReport,
  type FinGrpRepresentationSemisimplicityDirectSumOptions,
  type FinGrpRepresentationSemisimplicityDirectSumReport,
  type FinGrpRepresentationSemisimplicityBranch,
  type FinGrpRepresentationSemisimplicityNode,
  type FinGrpRepresentationSemisimplicityFailureReason,
  type FinGrpRepresentationSemisimplicityFailure,
  type FinGrpRepresentationSemisimplicitySummandsFailure,
  type FinGrpRepresentationIrreducibleSummandsFailure,
  type FinGrpRepresentationSemisimplicityDirectSumFailure,
} from "../models/fingroup-representation"

type WithDetails = {
  readonly holds: boolean
  readonly details: ReadonlyArray<string>
}

export interface FinGrpRepresentationLawDescriptor {
  readonly registryPath: string
  readonly name: string
  readonly summary: string
}

export const FinGrpRepresentationLawRegistry = {
  irreducibility: {
    registryPath: "AlgebraOracles.representation.checkFinGrpRepresentationIrreducible",
    name: "Finite-group representation irreducibility",
    summary:
      "Detect invariant vectors or coordinate subrepresentations to certify reducibility with constructive witnesses or confirm irreducibility.",
  },
  semisimplicityAnalysis: {
    registryPath: "AlgebraOracles.representation.analyzeFinGrpRepresentationSemisimplicity",
    name: "Finite-group representation semisimplicity analysis",
    summary:
      "Search for coordinate splittings, solve for quotient sections, and recursively decompose representations into direct sums.",
  },
  semisimplicitySummands: {
    registryPath: "AlgebraOracles.representation.collectFinGrpRepresentationSemisimplicitySummands",
    name: "Finite-group representation semisimplicity summands",
    summary:
      "Flatten semisimplicity trees into direct-sum summands, replay π∘ι identities, and certify ambient reconstruction from inclusion/projection contributions.",
  },
  irreducibleSummands: {
    registryPath: "AlgebraOracles.representation.collectFinGrpRepresentationIrreducibleSummands",
    name: "Finite-group representation irreducible summands",
    summary:
      "Filter semisimplicity summands to those certified irreducible, propagating analysis failures and reducibility witnesses for transparent diagnostics.",
  },
  semisimplicityCertification: {
    registryPath: "AlgebraOracles.representation.certifyFinGrpRepresentationSemisimplicity",
    name: "Finite-group representation semisimplicity certification",
    summary:
      "Upgrade successful semisimplicity analyses into explicit direct-sum representations equipped with natural isomorphisms back to the ambient action.",
  },
} as const satisfies Record<string, FinGrpRepresentationLawDescriptor>

export type FinGrpRepresentationLawKey = keyof typeof FinGrpRepresentationLawRegistry

interface FinGrpRepresentationOracleBase<
  Kind extends FinGrpRepresentationLawKey,
  Report extends WithDetails,
> {
  readonly kind: Kind
  readonly registryPath: (typeof FinGrpRepresentationLawRegistry)[Kind]["registryPath"]
  readonly name: (typeof FinGrpRepresentationLawRegistry)[Kind]["name"]
  readonly summary: (typeof FinGrpRepresentationLawRegistry)[Kind]["summary"]
  readonly holds: boolean
  readonly pending: false
  readonly report: Report
  readonly details: ReadonlyArray<string>
}

type IrreducibilityReport = FinGrpRepresentationIrreducibilityReport & WithDetails

type SemisimplicityReport = FinGrpRepresentationSemisimplicityReport & WithDetails

type SemisimplicitySummandsReport =
  FinGrpRepresentationSemisimplicitySummandsReport & WithDetails

type SemisimplicityCertificationReport =
  FinGrpRepresentationSemisimplicityDirectSumReport & WithDetails

export type FinGrpRepresentationIrreducibilityOracleResult = FinGrpRepresentationOracleBase<
  "irreducibility",
  IrreducibilityReport
>

export type FinGrpRepresentationSemisimplicityOracleResult = FinGrpRepresentationOracleBase<
  "semisimplicityAnalysis",
  SemisimplicityReport
>

export type FinGrpRepresentationSemisimplicitySummandsOracleResult =
  FinGrpRepresentationOracleBase<"semisimplicitySummands", SemisimplicitySummandsReport>

type IrreducibleSummandsReport = FinGrpRepresentationIrreducibleSummandsReport & WithDetails

export type FinGrpRepresentationIrreducibleSummandsOracleResult =
  FinGrpRepresentationOracleBase<"irreducibleSummands", IrreducibleSummandsReport>

export type FinGrpRepresentationSemisimplicityCertificationOracleResult =
  FinGrpRepresentationOracleBase<
    "semisimplicityCertification",
    SemisimplicityCertificationReport
  >

export type FinGrpRepresentationOracleResult =
  | FinGrpRepresentationIrreducibilityOracleResult
  | FinGrpRepresentationSemisimplicityOracleResult
  | FinGrpRepresentationSemisimplicitySummandsOracleResult
  | FinGrpRepresentationIrreducibleSummandsOracleResult
  | FinGrpRepresentationSemisimplicityCertificationOracleResult

const toOracleResult = <
  Kind extends FinGrpRepresentationLawKey,
  Report extends WithDetails,
>(
  kind: Kind,
  report: Report,
): FinGrpRepresentationOracleBase<Kind, Report> => {
  const descriptor = FinGrpRepresentationLawRegistry[kind]
  return {
    kind,
    registryPath: descriptor.registryPath,
    name: descriptor.name,
    summary: descriptor.summary,
    holds: report.holds,
    pending: false,
    report,
    details: report.details,
  }
}

export const FinGrpRepresentationOracles = {
  irreducibility: (
    representation: FiniteGroupRepresentation,
    options: FinGrpRepresentationIrreducibilityOptions = {},
  ): FinGrpRepresentationIrreducibilityOracleResult =>
    toOracleResult("irreducibility", checkFinGrpRepresentationIrreducible(representation, options)),
  semisimplicityAnalysis: (
    representation: FiniteGroupRepresentation,
    options: FinGrpRepresentationSemisimplicityOptions = {},
  ): FinGrpRepresentationSemisimplicityOracleResult =>
    toOracleResult(
      "semisimplicityAnalysis",
      analyzeFinGrpRepresentationSemisimplicity(representation, options),
    ),
  semisimplicitySummands: (
    report: FinGrpRepresentationSemisimplicityReport,
    options: FinGrpRepresentationSemisimplicitySummandsOptions = {},
  ): FinGrpRepresentationSemisimplicitySummandsOracleResult =>
    toOracleResult(
      "semisimplicitySummands",
      collectFinGrpRepresentationSemisimplicitySummands(report, options),
    ),
  irreducibleSummands: (
    report: FinGrpRepresentationSemisimplicityReport,
    options: FinGrpRepresentationIrreducibleSummandsOptions = {},
  ): FinGrpRepresentationIrreducibleSummandsOracleResult =>
    toOracleResult(
      "irreducibleSummands",
      collectFinGrpRepresentationIrreducibleSummands(report, options),
    ),
  semisimplicityCertification: (
    report: FinGrpRepresentationSemisimplicityReport,
    options: FinGrpRepresentationSemisimplicityDirectSumOptions = {},
  ): FinGrpRepresentationSemisimplicityCertificationOracleResult =>
    toOracleResult(
      "semisimplicityCertification",
      certifyFinGrpRepresentationSemisimplicity(report, options),
    ),
} as const

export interface EnumerateFinGrpRepresentationOraclesOptions {
  readonly irreducibility?: FinGrpRepresentationIrreducibilityOptions
  readonly semisimplicity?: FinGrpRepresentationSemisimplicityOptions
  readonly summands?: FinGrpRepresentationSemisimplicitySummandsOptions
  readonly irreducibleSummands?: FinGrpRepresentationIrreducibleSummandsOptions
  readonly certification?: FinGrpRepresentationSemisimplicityDirectSumOptions
}

export interface FinGrpRepresentationOracleSuite {
  readonly representation: FiniteGroupRepresentation
  readonly irreducibility: FinGrpRepresentationIrreducibilityOracleResult
  readonly semisimplicity: FinGrpRepresentationSemisimplicityOracleResult
  readonly summands: FinGrpRepresentationSemisimplicitySummandsOracleResult
  readonly irreducibleSummands: FinGrpRepresentationIrreducibleSummandsOracleResult
  readonly certification: FinGrpRepresentationSemisimplicityCertificationOracleResult
  readonly all: ReadonlyArray<FinGrpRepresentationOracleResult>
}

export const enumerateFinGrpRepresentationOracles = (
  representation: FiniteGroupRepresentation,
  options: EnumerateFinGrpRepresentationOraclesOptions = {},
): FinGrpRepresentationOracleSuite => {
  const irreducibility = FinGrpRepresentationOracles.irreducibility(
    representation,
    options.irreducibility,
  )
  const semisimplicity = FinGrpRepresentationOracles.semisimplicityAnalysis(
    representation,
    options.semisimplicity,
  )
  const summands = FinGrpRepresentationOracles.semisimplicitySummands(
    semisimplicity.report,
    options.summands,
  )
  const irreducibleSummandsOptions: FinGrpRepresentationIrreducibleSummandsOptions =
    options.irreducibleSummands
      ? {
          ...options.irreducibleSummands,
          reuseSummandsReport:
            options.irreducibleSummands.reuseSummandsReport ?? summands.report,
        }
      : {
          reuseSummandsReport: summands.report,
          generators: options.summands?.generators,
          irreducibilityOptions: options.summands?.irreducibilityOptions,
        }
  const irreducibleSummands = FinGrpRepresentationOracles.irreducibleSummands(
    semisimplicity.report,
    irreducibleSummandsOptions,
  )
  const certificationOptions: FinGrpRepresentationSemisimplicityDirectSumOptions | undefined =
    options.certification ?? (options.summands ? { ...options.summands } : undefined)
  const certification = FinGrpRepresentationOracles.semisimplicityCertification(
    semisimplicity.report,
    certificationOptions,
  )

  return {
    representation,
    irreducibility,
    semisimplicity,
    summands,
    irreducibleSummands,
    certification,
    all: [
      irreducibility,
      semisimplicity,
      summands,
      irreducibleSummands,
      certification,
    ],
  }
}

type SemisimplicityStageKey = Exclude<FinGrpRepresentationLawKey, "irreducibility">

type SemisimplicityStageOracle<K extends SemisimplicityStageKey> = Extract<
  FinGrpRepresentationOracleResult,
  { readonly kind: K }
>

type StageResult<K extends FinGrpRepresentationLawKey> = Extract<
  FinGrpRepresentationOracleResult,
  { readonly kind: K }
>

export interface FinGrpRepresentationSemisimplicityWorkflowStageSummary<
  K extends FinGrpRepresentationLawKey = FinGrpRepresentationLawKey,
> {
  readonly kind: K
  readonly name: (typeof FinGrpRepresentationLawRegistry)[K]["name"]
  readonly registryPath: (typeof FinGrpRepresentationLawRegistry)[K]["registryPath"]
  readonly holds: boolean
  readonly summary: string
  readonly details: ReadonlyArray<string>
  readonly oracle: StageResult<K>
}

export interface FinGrpRepresentationSemisimplicityWorkflowStages {
  readonly irreducibility: FinGrpRepresentationSemisimplicityWorkflowStageSummary<"irreducibility">
  readonly semisimplicity: FinGrpRepresentationSemisimplicityWorkflowStageSummary<"semisimplicityAnalysis">
  readonly summands: FinGrpRepresentationSemisimplicityWorkflowStageSummary<"semisimplicitySummands">
  readonly irreducibleSummands: FinGrpRepresentationSemisimplicityWorkflowStageSummary<"irreducibleSummands">
  readonly certification: FinGrpRepresentationSemisimplicityWorkflowStageSummary<"semisimplicityCertification">
}

export interface FinGrpRepresentationSemisimplicityWorkflowFailure<
  K extends SemisimplicityStageKey = SemisimplicityStageKey,
> {
  readonly stage: K
  readonly oracle: SemisimplicityStageOracle<K>
}

export interface FinGrpRepresentationSemisimplicityWorkflowResult {
  readonly representation: FiniteGroupRepresentation
  readonly suite: FinGrpRepresentationOracleSuite
  readonly holds: boolean
  readonly isIrreducible: boolean
  readonly isSemisimple: boolean
  readonly hasSummands: boolean
  readonly hasIrreducibleSummands: boolean
  readonly hasCertifiedDirectSum: boolean
  readonly failure?: FinGrpRepresentationSemisimplicityWorkflowFailure
  readonly failures: ReadonlyArray<FinGrpRepresentationSemisimplicityWorkflowFailure>
  readonly stages: FinGrpRepresentationSemisimplicityWorkflowStages
  readonly timeline: ReadonlyArray<FinGrpRepresentationSemisimplicityWorkflowStageSummary>
  readonly details: ReadonlyArray<string>
}

export type FinGrpRepresentationSemisimplicityWorkflowOptions = EnumerateFinGrpRepresentationOraclesOptions

const formatCount = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`

const formatBranchPath = (
  path: ReadonlyArray<FinGrpRepresentationSemisimplicityBranch>,
): string => (path.length === 0 ? "root" : `root→${path.join("→")}`)

const countSemisimplicityLeaves = (
  node: FinGrpRepresentationSemisimplicityNode,
): number =>
  node.children.length === 0
    ? 1
    : node.children.reduce((total, child) => total + countSemisimplicityLeaves(child), 0)

const describeSemisimplicityFailure = (
  failure: FinGrpRepresentationSemisimplicityFailure,
): string => {
  switch (failure.reason) {
    case "no-subrepresentation":
      return "no coordinate subrepresentation produced a valid splitting"
    case "invariant-without-coordinate-witness":
      return "non-trivial invariants were detected without a coordinate witness to split the action"
    case "no-splitting": {
      const indices = failure.witness?.subspace.indices ?? []
      const coordinateLabel = indices.length > 0 ? `[${indices.join(",")}]` : "[]"
      return `failed to split along coordinates ${coordinateLabel}`
    }
    case "child-failure":
      return failure.cause
        ? describeSemisimplicityFailure(failure.cause)
        : "a recursive decomposition step failed"
    default:
      return "semisimplicity analysis reported an unknown failure"
  }
}

const describeSummandsFailure = (
  failure: FinGrpRepresentationSemisimplicitySummandsFailure,
): string => {
  switch (failure.kind) {
    case "summand-identity":
      return `summand ${formatBranchPath(failure.path)} inclusion/projection did not reproduce the identity`
    case "sum-identity":
      return "the accumulated contributions did not equal the ambient identity"
    default:
      return "unexpected summand verification failure"
  }
}

const describeIrreducibleSummandsFailure = (
  failure: FinGrpRepresentationIrreducibleSummandsFailure,
): string => {
  switch (failure.kind) {
    case "analysis-failure":
      return failure.failure
        ? describeSemisimplicityFailure(failure.failure)
        : "semisimplicity analysis reported a failure"
    case "summands-failure":
      return failure.failures.length > 0
        ? describeSummandsFailure(failure.failures[0]!)
        : "semisimplicity summand verification reported failures"
    case "no-summands":
      return "no semisimplicity summands were available for inspection"
    case "missing-irreducibility":
      return `summand ${formatBranchPath(failure.path)} was missing an irreducibility report`
    case "reducible-summand":
      return `summand ${formatBranchPath(failure.path)} was reducible (${failure.report.witness.kind})`
    default:
      return "unexpected irreducible isolation failure"
  }
}

const describeCertificationFailure = (
  failure: FinGrpRepresentationSemisimplicityDirectSumFailure,
): string => {
  switch (failure.kind) {
    case "analysis-failure":
      return failure.failure
        ? describeSemisimplicityFailure(failure.failure)
        : "semisimplicity analysis reported a failure"
    case "summands-failure":
      return failure.failures.length > 0
        ? describeSummandsFailure(failure.failures[0]!)
        : "semisimplicity summand verification reported failures"
    case "no-summands":
      return "no summands were available to assemble a direct sum"
    case "forward-construction":
      return `failed to assemble the forward natural transformation (${failure.error})`
    case "backward-construction":
      return `failed to assemble the backward natural transformation (${failure.error})`
    case "direct-sum-identity":
      return "forward ∘ backward did not yield the identity on the constructed direct sum"
    case "ambient-identity":
      return "backward ∘ forward did not yield the identity on the ambient representation"
    default:
      return "unexpected direct-sum certification failure"
  }
}

const describeIrreducibilityStage = (
  oracle: StageResult<"irreducibility">,
): string => {
  const witness = oracle.report.witness
  if (oracle.holds && witness.kind === "irreducible") {
    const checked = formatCount(
      witness.checkedSubspaces,
      "coordinate subspace",
      "coordinate subspaces",
    )
    const invariantMessage =
      witness.invariantsDimension > 0
        ? ` (invariants dimension ${witness.invariantsDimension})`
        : ""
    return `Irreducibility confirmed after inspecting ${checked}${invariantMessage}.`
  }

  if (!oracle.holds) {
    if (witness.kind === "invariant") {
      return "Invariant vector detected; representation is reducible."
    }
    if (witness.kind === "coordinate-subrepresentation") {
      const indices = witness.witness.subspace.indices
      const coordinateLabel = indices.length > 0 ? `[${indices.join(",")}]` : "[]"
      return `Coordinate subrepresentation on coordinates ${coordinateLabel} certifies reducibility.`
    }
  }

  return oracle.holds
    ? "Irreducibility oracle succeeded."
    : "Irreducibility oracle reported reducibility."
}

const describeSemisimplicityStage = (
  oracle: StageResult<"semisimplicityAnalysis">,
): string => {
  if (oracle.holds) {
    const leaves = countSemisimplicityLeaves(oracle.report.root)
    const checked = formatCount(
      oracle.report.checkedSubrepresentations,
      "coordinate witness",
      "coordinate witnesses",
    )
    return `Constructed a semisimplicity tree with ${formatCount(leaves, "leaf", "leaves")} after checking ${checked}.`
  }

  return oracle.report.failure
    ? `Semisimplicity analysis failed: ${describeSemisimplicityFailure(oracle.report.failure)}.`
    : "Semisimplicity analysis failed."
}

const describeSummandsStage = (
  oracle: StageResult<"semisimplicitySummands">,
): string => {
  if (oracle.holds) {
    return `Verified ${formatCount(
      oracle.report.summands.length,
      "semisimplicity summand",
      "semisimplicity summands",
    )} and reconstructed the identity from ${formatCount(
      oracle.report.contributions.length,
      "contribution",
      "contributions",
    )}.`
  }

  const failure = oracle.report.failures[0]
  return failure
    ? `Semisimplicity summand verification failed: ${describeSummandsFailure(failure)}.`
    : "Semisimplicity summand verification failed."
}

const describeIrreducibleSummandsStage = (
  oracle: StageResult<"irreducibleSummands">,
): string => {
  if (oracle.holds) {
    return `Isolated ${formatCount(
      oracle.report.summands.length,
      "irreducible summand",
      "irreducible summands",
    )}.`
  }

  const failure = oracle.report.failures[0]
  return failure
    ? `Irreducible isolation incomplete: ${describeIrreducibleSummandsFailure(failure)}.`
    : "Irreducible isolation incomplete."
}

const describeCertificationStage = (
  oracle: StageResult<"semisimplicityCertification">,
): string => {
  if (oracle.holds) {
    const summandCount = oracle.report.summands.summands.length
    const directSumDim = oracle.report.directSum?.representation.dim
    const dimensionMessage =
      typeof directSumDim === "number"
        ? ` of dimension ${directSumDim}`
        : ""
    return `Certified a direct sum${dimensionMessage} with ${formatCount(
      summandCount,
      "summand",
      "summands",
    )}.`
  }

  return oracle.report.failure
    ? `Direct-sum certification failed: ${describeCertificationFailure(oracle.report.failure)}.`
    : "Direct-sum certification failed."
}

const makeStageSummary = <K extends FinGrpRepresentationLawKey>(
  oracle: StageResult<K>,
  summary: string,
): FinGrpRepresentationSemisimplicityWorkflowStageSummary<K> => {
  const descriptor = FinGrpRepresentationLawRegistry[oracle.kind]
  return {
    kind: oracle.kind,
    name: descriptor.name,
    registryPath: descriptor.registryPath,
    holds: oracle.holds,
    summary,
    details: oracle.details,
    oracle,
  }
}

const buildFinGrpRepresentationSemisimplicityWorkflowStages = (
  suite: FinGrpRepresentationOracleSuite,
): FinGrpRepresentationSemisimplicityWorkflowStages => ({
  irreducibility: makeStageSummary(
    suite.irreducibility,
    describeIrreducibilityStage(suite.irreducibility),
  ),
  semisimplicity: makeStageSummary(
    suite.semisimplicity,
    describeSemisimplicityStage(suite.semisimplicity),
  ),
  summands: makeStageSummary(
    suite.summands,
    describeSummandsStage(suite.summands),
  ),
  irreducibleSummands: makeStageSummary(
    suite.irreducibleSummands,
    describeIrreducibleSummandsStage(suite.irreducibleSummands),
  ),
  certification: makeStageSummary(
    suite.certification,
    describeCertificationStage(suite.certification),
  ),
})

export const runFinGrpRepresentationSemisimplicityWorkflow = (
  representation: FiniteGroupRepresentation,
  options: FinGrpRepresentationSemisimplicityWorkflowOptions = {},
): FinGrpRepresentationSemisimplicityWorkflowResult => {
  const suite = enumerateFinGrpRepresentationOracles(representation, options)

  const stages = buildFinGrpRepresentationSemisimplicityWorkflowStages(suite)
  const timeline = [
    stages.irreducibility,
    stages.semisimplicity,
    stages.summands,
    stages.irreducibleSummands,
    stages.certification,
  ] as const

  const failures: FinGrpRepresentationSemisimplicityWorkflowFailure[] = []
  if (!suite.semisimplicity.holds) {
    failures.push({ stage: "semisimplicityAnalysis", oracle: suite.semisimplicity })
  }
  if (!suite.summands.holds) {
    failures.push({ stage: "semisimplicitySummands", oracle: suite.summands })
  }
  if (!suite.irreducibleSummands.holds) {
    failures.push({ stage: "irreducibleSummands", oracle: suite.irreducibleSummands })
  }
  if (!suite.certification.holds) {
    failures.push({ stage: "semisimplicityCertification", oracle: suite.certification })
  }

  const details: string[] = []
  timeline.forEach((stage) => {
    details.push(`${stage.name}: ${stage.summary}`)
  })
  details.push(
    suite.irreducibility.holds
      ? "Irreducibility oracle certified the representation as irreducible; semisimplicity is immediate."
      : "Irreducibility oracle found a non-trivial invariant subspace; proceeding with decomposition diagnostics.",
  )

  const summandCount = suite.summands.report.summands.length
  details.push(
    suite.semisimplicity.holds
      ? `Semisimplicity analysis succeeded with ${formatCount(summandCount, "summand", "summands")}.`
      : "Semisimplicity analysis failed to produce a splitting tree; see report for the first obstruction.",
  )

  details.push(
    suite.summands.holds
      ? "Semisimplicity summand verification reconstructed the ambient action from inclusion/projection witnesses."
      : "Semisimplicity summand verification could not reassemble the ambient representation."
  )

  const irreducibleCount = suite.irreducibleSummands.report.summands.length
  details.push(
    suite.irreducibleSummands.holds
      ? `Irreducible isolation certified ${formatCount(
          irreducibleCount,
          "irreducible summand",
          "irreducible summands",
        )}.`
      : "Irreducible isolation reported failures; see reducibility witnesses for obstructed leaves.",
  )

  details.push(
    suite.certification.holds
      ? "Direct-sum certification produced explicit natural isomorphisms between the ambient representation and the constructed summands."
      : "Direct-sum certification failed; the constructed witnesses do not yield a natural isomorphism.",
  )

  return {
    representation,
    suite,
    holds: suite.certification.holds,
    isIrreducible: suite.irreducibility.holds,
    isSemisimple: suite.semisimplicity.holds,
    hasSummands: suite.summands.holds,
    hasIrreducibleSummands: suite.irreducibleSummands.holds,
    hasCertifiedDirectSum: suite.certification.holds,
    failure: failures[0],
    failures,
    stages,
    timeline,
    details,
  }
}

export interface FinGrpRepresentationSemisimplicityWorkflowNarrativeOptions {
  readonly includeStageDetails?: boolean
  readonly includeWorkflowDetails?: boolean
  readonly successSymbol?: string
  readonly failureSymbol?: string
  readonly indent?: string
}

const defaultWorkflowNarrativeOptions: Required<
  Omit<FinGrpRepresentationSemisimplicityWorkflowNarrativeOptions, "includeStageDetails" | "includeWorkflowDetails">
> & {
  readonly includeStageDetails: boolean
  readonly includeWorkflowDetails: boolean
} = {
  includeStageDetails: false,
  includeWorkflowDetails: false,
  successSymbol: "✔",
  failureSymbol: "✘",
  indent: "  ",
}

const getStageSummaryForKey = (
  workflow: FinGrpRepresentationSemisimplicityWorkflowResult,
  key: FinGrpRepresentationLawKey,
): FinGrpRepresentationSemisimplicityWorkflowStageSummary => {
  switch (key) {
    case "irreducibility":
      return workflow.stages.irreducibility
    case "semisimplicityAnalysis":
      return workflow.stages.semisimplicity
    case "semisimplicitySummands":
      return workflow.stages.summands
    case "irreducibleSummands":
      return workflow.stages.irreducibleSummands
    case "semisimplicityCertification":
      return workflow.stages.certification
    default: {
      const exhaustiveCheck: never = key
      return exhaustiveCheck
    }
  }
}

const formatWorkflowHeadline = (
  workflow: FinGrpRepresentationSemisimplicityWorkflowResult,
  symbolFor: (holds: boolean) => string,
): string => {
  if (workflow.holds) {
    return `${symbolFor(true)} Semisimplicity workflow succeeded — ${workflow.stages.certification.summary}`
  }

  const failureStage = workflow.failure?.stage
  if (!failureStage) {
    return `${symbolFor(false)} Semisimplicity workflow failed — ${workflow.stages.certification.summary}`
  }

  const failureStageSummary = getStageSummaryForKey(workflow, failureStage)
  const failureStageName = FinGrpRepresentationLawRegistry[failureStage]?.name ?? failureStage
  return `${symbolFor(false)} Semisimplicity workflow failed at ${failureStageName} — ${failureStageSummary.summary}`
}

export const formatFinGrpRepresentationSemisimplicityWorkflow = (
  workflow: FinGrpRepresentationSemisimplicityWorkflowResult,
  options: FinGrpRepresentationSemisimplicityWorkflowNarrativeOptions = {},
): ReadonlyArray<string> => {
  const {
    includeStageDetails,
    includeWorkflowDetails,
    successSymbol,
    failureSymbol,
    indent,
  } = { ...defaultWorkflowNarrativeOptions, ...options }

  const lines: string[] = []
  lines.push(
    formatWorkflowHeadline(workflow, (holds) => (holds ? successSymbol : failureSymbol)),
  )

  workflow.timeline.forEach((stage) => {
    const stageSymbol = stage.holds ? successSymbol : failureSymbol
    lines.push(`${indent}${stageSymbol} ${stage.name} — ${stage.summary}`)
    if (includeStageDetails && stage.details.length > 0) {
      stage.details.forEach((detail) => {
        lines.push(`${indent}${indent}${detail}`)
      })
    }
  })

  if (includeWorkflowDetails && workflow.details.length > 0) {
    workflow.details.forEach((detail) => {
      lines.push(`${indent}${detail}`)
    })
  }

  return lines
}

export type FinGrpRepresentationSemisimplicityWorkflowClassification =
  | "certified-semisimple"
  | "semisimple-without-certification"
  | "irreducible"
  | "reducible-with-witness"
  | "partial-decomposition"
  | "inconclusive"

export interface FinGrpRepresentationSemisimplicityWorkflowStageHeadline {
  readonly kind: FinGrpRepresentationLawKey
  readonly name: string
  readonly registryPath: string
  readonly holds: boolean
  readonly summary: string
}

export interface FinGrpRepresentationSemisimplicityWorkflowFailureSummary {
  readonly stage: SemisimplicityStageKey
  readonly name: string
  readonly registryPath: string
  readonly summary: string
  readonly details: ReadonlyArray<string>
}

export interface FinGrpRepresentationSemisimplicityWorkflowSummary {
  readonly classification: FinGrpRepresentationSemisimplicityWorkflowClassification
  readonly headline: string
  readonly status: {
    readonly irreducible: boolean
    readonly semisimple: boolean
    readonly summands: boolean
    readonly irreducibleSummands: boolean
    readonly certification: boolean
  }
  readonly stageSummaries: ReadonlyArray<FinGrpRepresentationSemisimplicityWorkflowStageHeadline>
  readonly highlights: ReadonlyArray<string>
  readonly recommendations: ReadonlyArray<string>
  readonly failure?: FinGrpRepresentationSemisimplicityWorkflowFailureSummary
}

const classifySemisimplicityWorkflow = (
  workflow: FinGrpRepresentationSemisimplicityWorkflowResult,
): FinGrpRepresentationSemisimplicityWorkflowClassification => {
  if (workflow.holds) {
    return "certified-semisimple"
  }

  if (workflow.isIrreducible) {
    return "irreducible"
  }

  if (workflow.isSemisimple) {
    return "semisimple-without-certification"
  }

  if (!workflow.isIrreducible) {
    return "reducible-with-witness"
  }

  if (workflow.hasSummands || workflow.hasIrreducibleSummands) {
    return "partial-decomposition"
  }

  return "inconclusive"
}

const buildSemisimplicityWorkflowRecommendations = (
  workflow: FinGrpRepresentationSemisimplicityWorkflowResult,
  classification: FinGrpRepresentationSemisimplicityWorkflowClassification,
): string[] => {
  const recommendations: string[] = []

  switch (classification) {
    case "certified-semisimple":
      recommendations.push(
        "Semisimplicity workflow completed successfully; direct-sum witnesses are ready for downstream tooling.",
      )
      break
    case "semisimple-without-certification":
      recommendations.push(
        "Semisimplicity decomposition succeeded but certification failed; inspect the certification report to debug the natural isomorphisms.",
      )
      break
    case "irreducible":
      recommendations.push(
        "Irreducibility oracle confirmed the representation is irreducible; no further decomposition is required.",
      )
      break
    case "reducible-with-witness":
      recommendations.push(
        "Use the recorded invariant or coordinate subrepresentation witness to construct an explicit decomposition.",
      )
      break
    case "partial-decomposition":
      recommendations.push(
        "Review the partial summand diagnostics to refine the decomposition or supply additional witnesses.",
      )
      break
    case "inconclusive":
      recommendations.push(
        "Consider increasing the generator set or adjusting oracle options to gather more diagnostics.",
      )
      break
    default: {
      const exhaustiveCheck: never = classification
      return exhaustiveCheck
    }
  }

  const failureStage = workflow.failure?.stage
  if (failureStage) {
    switch (failureStage) {
      case "semisimplicityAnalysis":
        recommendations.push(
          "Semisimplicity analysis failed; inspect the recorded failure reason and consider providing additional coordinate witnesses or adjusting generator options.",
        )
        break
      case "semisimplicitySummands":
        recommendations.push(
          "Semisimplicity summand verification failed; review the offending inclusion/projection witnesses.",
        )
        break
      case "irreducibleSummands":
        recommendations.push(
          "Irreducible summand isolation failed; inspect reducibility witnesses and summand diagnostics for obstructed branches.",
        )
        break
      case "semisimplicityCertification":
        recommendations.push(
          "Direct-sum certification failed; inspect the forward/backward natural transformations recorded in the report.",
        )
        break
      default: {
        const exhaustiveCheck: never = failureStage
        return exhaustiveCheck
      }
    }
  }

  return recommendations
}

export const summarizeFinGrpRepresentationSemisimplicityWorkflow = (
  workflow: FinGrpRepresentationSemisimplicityWorkflowResult,
): FinGrpRepresentationSemisimplicityWorkflowSummary => {
  const classification = classifySemisimplicityWorkflow(workflow)
  const stageSummaries: FinGrpRepresentationSemisimplicityWorkflowStageHeadline[] = workflow.timeline.map(
    (stage) => ({
      kind: stage.kind,
      name: stage.name,
      registryPath: stage.registryPath,
      holds: stage.holds,
      summary: stage.summary,
    }),
  )

  const failureStage = workflow.failure?.stage
  const failure = failureStage
    ? (() => {
        const summary = getStageSummaryForKey(workflow, failureStage)
        const descriptor = FinGrpRepresentationLawRegistry[failureStage]
        return {
          stage: failureStage,
          name: descriptor.name,
          registryPath: descriptor.registryPath,
          summary: summary.summary,
          details: summary.details,
        } satisfies FinGrpRepresentationSemisimplicityWorkflowFailureSummary
      })()
    : undefined

  const headline = formatWorkflowHeadline(workflow, () => "").trimStart()
  const recommendations = buildSemisimplicityWorkflowRecommendations(workflow, classification)

  return {
    classification,
    headline,
    status: {
      irreducible: workflow.isIrreducible,
      semisimple: workflow.isSemisimple,
      summands: workflow.hasSummands,
      irreducibleSummands: workflow.hasIrreducibleSummands,
      certification: workflow.hasCertifiedDirectSum,
    },
    stageSummaries,
    highlights: workflow.details,
    recommendations,
    failure,
  }
}

interface FinGrpRepresentationSemisimplicityTreeStructure {
  readonly nodeCount: number
  readonly leafCount: number
  readonly splitCount: number
  readonly depth: number
  readonly invariantNodes: number
  readonly maxInvariantDimension: number
}

const analyzeSemisimplicityTreeStructure = (
  node: FinGrpRepresentationSemisimplicityNode,
): FinGrpRepresentationSemisimplicityTreeStructure => {
  if (node.children.length === 0) {
    return {
      nodeCount: 1,
      leafCount: 1,
      splitCount: 0,
      depth: 1,
      invariantNodes: node.invariantsDimension > 0 ? 1 : 0,
      maxInvariantDimension: node.invariantsDimension,
    }
  }

  const childStructures = node.children.map(analyzeSemisimplicityTreeStructure)

  const nodeCount =
    1 + childStructures.reduce((total, child) => total + child.nodeCount, 0)
  const leafCount = childStructures.reduce((total, child) => total + child.leafCount, 0)
  const splitCount =
    (node.decomposition ? 1 : 0) + childStructures.reduce((total, child) => total + child.splitCount, 0)
  const depth = 1 + Math.max(...childStructures.map((child) => child.depth))
  const invariantNodes =
    (node.invariantsDimension > 0 ? 1 : 0) +
    childStructures.reduce((total, child) => total + child.invariantNodes, 0)
  const maxInvariantDimension = Math.max(
    node.invariantsDimension,
    ...childStructures.map((child) => child.maxInvariantDimension),
  )

  return {
    nodeCount,
    leafCount,
    splitCount,
    depth,
    invariantNodes,
    maxInvariantDimension,
  }
}

export interface FinGrpRepresentationSemisimplicityWorkflowIrreducibilityProfile {
  readonly holds: boolean
  readonly witnessKind: FinGrpRepresentationIrreducibilityWitness["kind"]
  readonly invariantsDimension?: number
  readonly generatorCount?: number
  readonly checkedSubspaces?: number
  readonly subrepresentationDimension?: number
}

export interface FinGrpRepresentationSemisimplicityWorkflowAnalysisProfile {
  readonly holds: boolean
  readonly failureReason?: FinGrpRepresentationSemisimplicityFailureReason
  readonly invariantsDimension: number
  readonly invariantBasisCount: number
  readonly generatorCount: number
  readonly checkedSubrepresentations: number
  readonly tree: {
    readonly nodeCount: number
    readonly leafCount: number
    readonly splitCount: number
    readonly depth: number
    readonly invariantNodes: number
    readonly maxInvariantDimension: number
  }
}

export interface FinGrpRepresentationSemisimplicityWorkflowSummandsProfile {
  readonly holds: boolean
  readonly total: number
  readonly failureCount: number
  readonly contributions: number
  readonly dimensions: ReadonlyArray<number>
}

export interface FinGrpRepresentationSemisimplicityWorkflowIrreducibleSummandsProfile {
  readonly holds: boolean
  readonly total: number
  readonly verified: number
  readonly failureCount: number
  readonly reducibleCount: number
  readonly dimensions: ReadonlyArray<number>
}

export interface FinGrpRepresentationSemisimplicityWorkflowCertificationProfile {
  readonly holds: boolean
  readonly failureKind?: FinGrpRepresentationSemisimplicityDirectSumFailure["kind"]
}

export interface FinGrpRepresentationSemisimplicityWorkflowProfile {
  readonly classification: FinGrpRepresentationSemisimplicityWorkflowClassification
  readonly representation: {
    readonly label?: string
    readonly dimension: number
    readonly groupOrder: number
    readonly generatorCount: number
  }
  readonly workflow: {
    readonly holds: boolean
    readonly stageCount: number
    readonly failureCount: number
    readonly failureStage?: FinGrpRepresentationSemisimplicityWorkflowFailure["stage"]
    readonly detailCount: number
  }
  readonly irreducibility: FinGrpRepresentationSemisimplicityWorkflowIrreducibilityProfile
  readonly analysis: FinGrpRepresentationSemisimplicityWorkflowAnalysisProfile
  readonly summands: FinGrpRepresentationSemisimplicityWorkflowSummandsProfile
  readonly irreducibleSummands: FinGrpRepresentationSemisimplicityWorkflowIrreducibleSummandsProfile
  readonly certification: FinGrpRepresentationSemisimplicityWorkflowCertificationProfile
}

export const profileFinGrpRepresentationSemisimplicityWorkflow = (
  workflow: FinGrpRepresentationSemisimplicityWorkflowResult,
): FinGrpRepresentationSemisimplicityWorkflowProfile => {
  const classification = classifySemisimplicityWorkflow(workflow)
  const { representation } = workflow
  const {
    irreducibility: irreducibilityOracle,
    semisimplicity: semisimplicityOracle,
    summands: summandsOracle,
    irreducibleSummands: irreducibleSummandsOracle,
    certification: certificationOracle,
  } = workflow.suite

  const irreducibilityReport = irreducibilityOracle.report
  const semisimplicityReport = semisimplicityOracle.report
  const summandsReport = summandsOracle.report
  const irreducibleSummandsReport = irreducibleSummandsOracle.report
  const certificationReport = certificationOracle.report

  const treeStructure = analyzeSemisimplicityTreeStructure(semisimplicityReport.root)

  const irreducibility: FinGrpRepresentationSemisimplicityWorkflowIrreducibilityProfile =
    ((report: FinGrpRepresentationIrreducibilityReport) => {
      const base: FinGrpRepresentationSemisimplicityWorkflowIrreducibilityProfile = {
        holds: report.holds,
        witnessKind: report.witness.kind,
      }

      switch (report.witness.kind) {
        case "irreducible":
          return {
            ...base,
            invariantsDimension: report.witness.invariantsDimension,
            generatorCount: report.witness.generators.length,
            checkedSubspaces: report.witness.checkedSubspaces,
          }
        case "coordinate-subrepresentation":
          return {
            ...base,
            subrepresentationDimension: report.witness.witness.subspace.context.dim,
          }
        case "invariant":
          return {
            ...base,
            invariantsDimension: report.witness.invariantsDimension,
            generatorCount: report.witness.generators.length,
          }
        default: {
          const exhaustiveCheck: never = report.witness
          return exhaustiveCheck
        }
      }
    })(irreducibilityReport)

  const analysis: FinGrpRepresentationSemisimplicityWorkflowAnalysisProfile = {
    holds: semisimplicityReport.holds,
    failureReason: semisimplicityReport.failure?.reason,
    invariantsDimension: semisimplicityReport.root.invariantsDimension,
    invariantBasisCount: semisimplicityReport.root.invariantBasis.length,
    generatorCount: semisimplicityReport.root.generators.length,
    checkedSubrepresentations: semisimplicityReport.checkedSubrepresentations,
    tree: {
      nodeCount: treeStructure.nodeCount,
      leafCount: treeStructure.leafCount,
      splitCount: treeStructure.splitCount,
      depth: treeStructure.depth,
      invariantNodes: treeStructure.invariantNodes,
      maxInvariantDimension: treeStructure.maxInvariantDimension,
    },
  }

  const summands: FinGrpRepresentationSemisimplicityWorkflowSummandsProfile = {
    holds: summandsReport.holds,
    total: summandsReport.summands.length,
    failureCount: summandsReport.failures.length,
    contributions: summandsReport.contributions.length,
    dimensions: summandsReport.summands.map((summand) => summand.node.representation.dim),
  }

  const irreducibleSummands: FinGrpRepresentationSemisimplicityWorkflowIrreducibleSummandsProfile = {
    holds: irreducibleSummandsReport.holds,
    total: irreducibleSummandsReport.summands.length,
    verified: irreducibleSummandsReport.summands.filter((summand) => summand.irreducibility.holds).length,
    failureCount: irreducibleSummandsReport.failures.length,
    reducibleCount: irreducibleSummandsReport.failures.filter(
      (failure) => failure.kind === "reducible-summand",
    ).length,
    dimensions: irreducibleSummandsReport.summands.map(
      (summand) => summand.node.representation.dim,
    ),
  }

  const certification: FinGrpRepresentationSemisimplicityWorkflowCertificationProfile = {
    holds: certificationReport.holds,
    failureKind: certificationReport.failure?.kind,
  }

  return {
    classification,
    representation: {
      label: representation.label,
      dimension: representation.dim,
      groupOrder: representation.group.elems.length,
      generatorCount: semisimplicityReport.root.generators.length,
    },
    workflow: {
      holds: workflow.holds,
      stageCount: workflow.timeline.length,
      failureCount: workflow.failures.length,
      failureStage: workflow.failure?.stage,
      detailCount: workflow.details.length,
    },
    irreducibility,
    analysis,
    summands,
    irreducibleSummands,
    certification,
  }
}

export interface FinGrpRepresentationSemisimplicityWorkflowReportOptions {
  readonly workflow?: FinGrpRepresentationSemisimplicityWorkflowOptions
  readonly narrative?: FinGrpRepresentationSemisimplicityWorkflowNarrativeOptions
  readonly includeNarrative?: boolean
}

export interface FinGrpRepresentationSemisimplicityWorkflowReport {
  readonly representation: FiniteGroupRepresentation
  readonly workflow: FinGrpRepresentationSemisimplicityWorkflowResult
  readonly summary: FinGrpRepresentationSemisimplicityWorkflowSummary
  readonly profile: FinGrpRepresentationSemisimplicityWorkflowProfile
  readonly narrative?: ReadonlyArray<string>
}

export const reportFinGrpRepresentationSemisimplicityWorkflow = (
  representation: FiniteGroupRepresentation,
  options: FinGrpRepresentationSemisimplicityWorkflowReportOptions = {},
): FinGrpRepresentationSemisimplicityWorkflowReport => {
  const workflow = runFinGrpRepresentationSemisimplicityWorkflow(
    representation,
    options.workflow,
  )
  const summary = summarizeFinGrpRepresentationSemisimplicityWorkflow(workflow)
  const profile = profileFinGrpRepresentationSemisimplicityWorkflow(workflow)
  const narrative =
    options.includeNarrative === false
      ? undefined
      : formatFinGrpRepresentationSemisimplicityWorkflow(workflow, options.narrative)

  return {
    representation,
    workflow,
    summary,
    profile,
    narrative,
  }
}

export interface FinGrpRepresentationSemisimplicitySurveyObservation {
  readonly report: FinGrpRepresentationSemisimplicityWorkflowReport
  readonly classification: FinGrpRepresentationSemisimplicityWorkflowClassification
}

export interface FinGrpRepresentationSemisimplicitySurveyMetrics {
  readonly total: number
  readonly successCount: number
  readonly withNarrative: number
  readonly classificationCounts: Record<
    FinGrpRepresentationSemisimplicityWorkflowClassification,
    number
  >
  readonly statusCounts: {
    readonly irreducible: number
    readonly semisimple: number
    readonly summands: number
    readonly irreducibleSummands: number
    readonly certification: number
  }
  readonly failureStageCounts: Partial<Record<SemisimplicityStageKey, number>>
  readonly dimension: {
    readonly min: number
    readonly max: number
    readonly average: number
  }
}

export interface FinGrpRepresentationSemisimplicitySurveyResult {
  readonly observations: ReadonlyArray<FinGrpRepresentationSemisimplicitySurveyObservation>
  readonly metrics: FinGrpRepresentationSemisimplicitySurveyMetrics
}

const classificationLabels: Record<
  FinGrpRepresentationSemisimplicityWorkflowClassification,
  string
> = {
  "certified-semisimple": "Certified semisimple",
  "semisimple-without-certification": "Semisimple without certification",
  irreducible: "Irreducible",
  "reducible-with-witness": "Reducible with witness",
  "partial-decomposition": "Partial decomposition",
  inconclusive: "Inconclusive",
}

export interface FinGrpRepresentationSemisimplicityWorkflowProfileFormatOptions {
  readonly includeRepresentation?: boolean
  readonly includeWorkflow?: boolean
  readonly includeIrreducibility?: boolean
  readonly includeAnalysis?: boolean
  readonly includeAnalysisTreeMetrics?: boolean
  readonly includeSummands?: boolean
  readonly includeIrreducibleSummands?: boolean
  readonly includeCertification?: boolean
  readonly includeDimensionDetails?: boolean
  readonly indent?: string
  readonly bullet?: string
  readonly successSymbol?: string
  readonly failureSymbol?: string
}

const defaultProfileFormatOptions: Required<
  Pick<
    FinGrpRepresentationSemisimplicityWorkflowProfileFormatOptions,
    | "includeRepresentation"
    | "includeWorkflow"
    | "includeIrreducibility"
    | "includeAnalysis"
    | "includeAnalysisTreeMetrics"
    | "includeSummands"
    | "includeIrreducibleSummands"
    | "includeCertification"
    | "includeDimensionDetails"
    | "indent"
    | "bullet"
    | "successSymbol"
    | "failureSymbol"
  >
> = {
  includeRepresentation: true,
  includeWorkflow: true,
  includeIrreducibility: true,
  includeAnalysis: true,
  includeAnalysisTreeMetrics: false,
  includeSummands: true,
  includeIrreducibleSummands: true,
  includeCertification: true,
  includeDimensionDetails: false,
  indent: "  ",
  bullet: "-",
  successSymbol: "✓",
  failureSymbol: "✗",
}

const semisimplicityFailureReasonSummaries: Record<
  FinGrpRepresentationSemisimplicityFailureReason,
  string
> = {
  "no-subrepresentation": "no coordinate subrepresentation produced a valid splitting",
  "invariant-without-coordinate-witness":
    "detected invariants without a coordinate splitting witness",
  "no-splitting": "failed to split along the candidate coordinates",
  "child-failure": "a recursive decomposition step failed",
}

const certificationFailureKindSummaries: Record<
  FinGrpRepresentationSemisimplicityDirectSumFailure["kind"],
  string
> = {
  "analysis-failure": "semisimplicity analysis reported a failure",
  "summands-failure": "summand verification reported failures",
  "no-summands": "no summands were available for assembly",
  "forward-construction": "failed to construct the forward natural transformation",
  "backward-construction": "failed to construct the backward natural transformation",
  "direct-sum-identity": "forward ∘ backward was not the identity on the direct sum",
  "ambient-identity": "backward ∘ forward was not the identity on the ambient representation",
}

const formatDimensionList = (values: ReadonlyArray<number>): string => {
  if (values.length === 0) {
    return "none"
  }
  const total = values.reduce((sum, value) => sum + value, 0)
  return `[${values.join(", ")}] (total=${total})`
}

export const formatFinGrpRepresentationSemisimplicityWorkflowProfile = (
  profile: FinGrpRepresentationSemisimplicityWorkflowProfile,
  options: FinGrpRepresentationSemisimplicityWorkflowProfileFormatOptions = {},
): ReadonlyArray<string> => {
  const settings = { ...defaultProfileFormatOptions, ...options }
  const {
    includeRepresentation,
    includeWorkflow,
    includeIrreducibility,
    includeAnalysis,
    includeAnalysisTreeMetrics,
    includeSummands,
    includeIrreducibleSummands,
    includeCertification,
    includeDimensionDetails,
    indent,
    bullet,
    successSymbol,
    failureSymbol,
  } = settings

  const headingIndent = indent
  const detailIndent = indent + indent

  const lines: string[] = []
  const classificationLabel =
    classificationLabels[profile.classification] ?? profile.classification
  const representationHeading = profile.representation.label
    ? `${profile.representation.label} (dim ${profile.representation.dimension})`
    : `dimension ${profile.representation.dimension} representation`

  const symbolFor = (holds: boolean): string =>
    holds ? successSymbol : failureSymbol

  lines.push(
    `Semisimplicity profile for ${representationHeading} — ${classificationLabel}`,
  )

  if (includeRepresentation) {
    lines.push(`${headingIndent}Representation:`)
    lines.push(
      `${detailIndent}${bullet} Group order: ${profile.representation.groupOrder}`,
    )
    lines.push(
      `${detailIndent}${bullet} Generators: ${profile.representation.generatorCount}`,
    )
  }

  if (includeWorkflow) {
    lines.push(`${headingIndent}Workflow:`)
    const workflowStageName = profile.workflow.failureStage
      ? FinGrpRepresentationLawRegistry[profile.workflow.failureStage]?.name ??
        profile.workflow.failureStage
      : undefined
    const workflowStatus = profile.workflow.holds
      ? `${symbolFor(true)} All stages succeeded`
      : `${symbolFor(false)} Failed${
          workflowStageName ? ` at ${workflowStageName}` : ""
        }`
    lines.push(`${detailIndent}${bullet} Status: ${workflowStatus}`)
    lines.push(
      `${detailIndent}${bullet} Stages inspected: ${profile.workflow.stageCount}`,
    )
    lines.push(
      `${detailIndent}${bullet} Failures recorded: ${profile.workflow.failureCount}`,
    )
    lines.push(
      `${detailIndent}${bullet} Workflow details logged: ${profile.workflow.detailCount}`,
    )
  }

  if (includeIrreducibility) {
    lines.push(`${headingIndent}Irreducibility:`)
    const witnessDescription = profile.irreducibility.witnessKind.replace(/-/g, " ")
    const irreducibilityDetails: string[] = []
    if (profile.irreducibility.invariantsDimension !== undefined) {
      irreducibilityDetails.push(
        `invariants=${profile.irreducibility.invariantsDimension}`,
      )
    }
    if (profile.irreducibility.generatorCount !== undefined) {
      irreducibilityDetails.push(
        `generators=${profile.irreducibility.generatorCount}`,
      )
    }
    if (profile.irreducibility.checkedSubspaces !== undefined) {
      irreducibilityDetails.push(
        `checked=${profile.irreducibility.checkedSubspaces}`,
      )
    }
    if (profile.irreducibility.subrepresentationDimension !== undefined) {
      irreducibilityDetails.push(
        `subrepresentation-dim=${profile.irreducibility.subrepresentationDimension}`,
      )
    }
    const detailSuffix =
      irreducibilityDetails.length > 0
        ? ` (${irreducibilityDetails.join("; ")})`
        : ""
    lines.push(
      `${detailIndent}${bullet} ${symbolFor(profile.irreducibility.holds)} witness=${witnessDescription}${detailSuffix}`,
    )
  }

  if (includeAnalysis) {
    lines.push(`${headingIndent}Semisimplicity analysis:`)
    const failureSummary = profile.analysis.failureReason
      ? semisimplicityFailureReasonSummaries[profile.analysis.failureReason] ??
        profile.analysis.failureReason
      : undefined
    const analysisStatus = profile.analysis.holds
      ? `${symbolFor(true)} Successful`
      : `${symbolFor(false)} Failed${
          failureSummary ? ` (${failureSummary})` : ""
        }`
    lines.push(`${detailIndent}${bullet} Status: ${analysisStatus}`)
    lines.push(
      `${detailIndent}${bullet} Invariants dimension: ${profile.analysis.invariantsDimension}`,
    )
    lines.push(
      `${detailIndent}${bullet} Invariant basis vectors: ${profile.analysis.invariantBasisCount}`,
    )
    lines.push(
      `${detailIndent}${bullet} Checked subrepresentations: ${profile.analysis.checkedSubrepresentations}`,
    )
    lines.push(
      `${detailIndent}${bullet} Generators inspected: ${profile.analysis.generatorCount}`,
    )

    if (includeAnalysisTreeMetrics) {
      const { tree } = profile.analysis
      lines.push(
        `${detailIndent}${bullet} Tree: nodes=${tree.nodeCount}, leaves=${tree.leafCount}, splits=${tree.splitCount}, depth=${tree.depth}, invariant nodes=${tree.invariantNodes}, max invariant dim=${tree.maxInvariantDimension}`,
      )
    }
  }

  if (includeSummands) {
    lines.push(`${headingIndent}Semisimplicity summands:`)
    lines.push(
      `${detailIndent}${bullet} ${symbolFor(profile.summands.holds)} ${formatCount(
        profile.summands.total,
        "summand",
        "summands",
      )}`,
    )
    lines.push(
      `${detailIndent}${bullet} Contributions reconstructed: ${profile.summands.contributions}`,
    )
    lines.push(
      `${detailIndent}${bullet} Verification failures: ${profile.summands.failureCount}`,
    )
    if (includeDimensionDetails) {
      lines.push(
        `${detailIndent}${bullet} Dimensions: ${formatDimensionList(profile.summands.dimensions)}`,
      )
    }
  }

  if (includeIrreducibleSummands) {
    lines.push(`${headingIndent}Irreducible summands:`)
    lines.push(
      `${detailIndent}${bullet} ${symbolFor(profile.irreducibleSummands.holds)} verified ${profile.irreducibleSummands.verified} of ${profile.irreducibleSummands.total}`,
    )
    lines.push(
      `${detailIndent}${bullet} Reducible leaves: ${profile.irreducibleSummands.reducibleCount}`,
    )
    lines.push(
      `${detailIndent}${bullet} Isolation failures: ${profile.irreducibleSummands.failureCount}`,
    )
    if (includeDimensionDetails) {
      lines.push(
        `${detailIndent}${bullet} Dimensions: ${formatDimensionList(profile.irreducibleSummands.dimensions)}`,
      )
    }
  }

  if (includeCertification) {
    lines.push(`${headingIndent}Direct-sum certification:`)
    const certificationStatus = profile.certification.holds
      ? `${symbolFor(true)} Succeeded`
      : `${symbolFor(false)} Failed${
          profile.certification.failureKind
            ? ` (${certificationFailureKindSummaries[profile.certification.failureKind] ?? profile.certification.failureKind})`
            : ""
        }`
    lines.push(`${detailIndent}${bullet} Status: ${certificationStatus}`)
  }

  return lines
}

const surveyClassificationOrder: ReadonlyArray<FinGrpRepresentationSemisimplicityWorkflowClassification> = [
  "certified-semisimple",
  "semisimple-without-certification",
  "irreducible",
  "reducible-with-witness",
  "partial-decomposition",
  "inconclusive",
]

export const surveyFinGrpRepresentationSemisimplicityWorkflows = (
  representations: ReadonlyArray<FiniteGroupRepresentation>,
  options: FinGrpRepresentationSemisimplicityWorkflowReportOptions = {},
): FinGrpRepresentationSemisimplicitySurveyResult => {
  const observations: FinGrpRepresentationSemisimplicitySurveyObservation[] = []

  const classificationCounts: Record<
    FinGrpRepresentationSemisimplicityWorkflowClassification,
    number
  > = {
    "certified-semisimple": 0,
    "semisimple-without-certification": 0,
    irreducible: 0,
    "reducible-with-witness": 0,
    "partial-decomposition": 0,
    inconclusive: 0,
  }

  const statusCounts = {
    irreducible: 0,
    semisimple: 0,
    summands: 0,
    irreducibleSummands: 0,
    certification: 0,
  }

  const failureStageCounts: Partial<Record<SemisimplicityStageKey, number>> = {}

  let successCount = 0
  let narrativeCount = 0
  let dimensionSum = 0
  let minDimension = Number.POSITIVE_INFINITY
  let maxDimension = Number.NEGATIVE_INFINITY

  representations.forEach((representation) => {
    const report = reportFinGrpRepresentationSemisimplicityWorkflow(
      representation,
      options,
    )
    const classification = report.summary.classification

    observations.push({ report, classification })

    classificationCounts[classification] += 1

    if (report.workflow.holds) {
      successCount += 1
    }

    if (report.narrative) {
      narrativeCount += 1
    }

    const { status } = report.summary
    if (status.irreducible) {
      statusCounts.irreducible += 1
    }
    if (status.semisimple) {
      statusCounts.semisimple += 1
    }
    if (status.summands) {
      statusCounts.summands += 1
    }
    if (status.irreducibleSummands) {
      statusCounts.irreducibleSummands += 1
    }
    if (status.certification) {
      statusCounts.certification += 1
    }

    if (report.summary.failure) {
      const stage = report.summary.failure.stage
      failureStageCounts[stage] = (failureStageCounts[stage] ?? 0) + 1
    }

    const dimension = report.profile.representation.dimension
    dimensionSum += dimension
    if (dimension < minDimension) {
      minDimension = dimension
    }
    if (dimension > maxDimension) {
      maxDimension = dimension
    }
  })

  const total = observations.length

  const dimensionStats =
    total === 0
      ? { min: 0, max: 0, average: 0 }
      : {
          min: minDimension,
          max: maxDimension,
          average: dimensionSum / total,
        }

  return {
    observations,
    metrics: {
      total,
      successCount,
      withNarrative: narrativeCount,
      classificationCounts,
      statusCounts: {
        irreducible: statusCounts.irreducible,
        semisimple: statusCounts.semisimple,
        summands: statusCounts.summands,
        irreducibleSummands: statusCounts.irreducibleSummands,
        certification: statusCounts.certification,
      },
      failureStageCounts,
      dimension: dimensionStats,
    },
  }
}

export interface FinGrpRepresentationSemisimplicitySurveyFormatOptions {
  readonly includeClassificationBreakdown?: boolean
  readonly includeStatusCounts?: boolean
  readonly includeFailureBreakdown?: boolean
  readonly includeDimensionStatistics?: boolean
  readonly includeObservations?: boolean
  readonly includeObservationStatuses?: boolean
  readonly includeObservationRecommendations?: boolean
  readonly includeObservationHeadlines?: boolean
  readonly includeObservationNarratives?: boolean
  readonly successSymbol?: string
  readonly failureSymbol?: string
  readonly bullet?: string
  readonly indent?: string
}

const defaultSurveyFormatOptions: Required<
  Pick<
    FinGrpRepresentationSemisimplicitySurveyFormatOptions,
    | "includeClassificationBreakdown"
    | "includeStatusCounts"
    | "includeFailureBreakdown"
    | "includeDimensionStatistics"
    | "includeObservations"
    | "includeObservationStatuses"
    | "includeObservationRecommendations"
    | "includeObservationHeadlines"
    | "includeObservationNarratives"
    | "successSymbol"
    | "failureSymbol"
    | "bullet"
    | "indent"
  >
> = {
  includeClassificationBreakdown: true,
  includeStatusCounts: true,
  includeFailureBreakdown: true,
  includeDimensionStatistics: true,
  includeObservations: true,
  includeObservationStatuses: true,
  includeObservationRecommendations: false,
  includeObservationHeadlines: true,
  includeObservationNarratives: false,
  successSymbol: "✓",
  failureSymbol: "✗",
  bullet: "-",
  indent: "  ",
}

const stageOrder: ReadonlyArray<SemisimplicityStageKey> = [
  "semisimplicityAnalysis",
  "semisimplicitySummands",
  "irreducibleSummands",
  "semisimplicityCertification",
]

export const formatFinGrpRepresentationSemisimplicitySurvey = (
  survey: FinGrpRepresentationSemisimplicitySurveyResult,
  options: FinGrpRepresentationSemisimplicitySurveyFormatOptions = {},
): ReadonlyArray<string> => {
  const settings = { ...defaultSurveyFormatOptions, ...options }
  const {
    includeClassificationBreakdown,
    includeStatusCounts,
    includeFailureBreakdown,
    includeDimensionStatistics,
    includeObservations,
    includeObservationStatuses,
    includeObservationRecommendations,
    includeObservationHeadlines,
    includeObservationNarratives,
    successSymbol,
    failureSymbol,
    bullet,
    indent,
  } = settings

  const lines: string[] = []
  const { metrics, observations } = survey

  lines.push(
    `Semisimplicity workflow survey across ${metrics.total} representation${
      metrics.total === 1 ? "" : "s"
    }`,
  )
  lines.push(
    `${indent}${metrics.successCount} succeeded; ${metrics.withNarrative} include narratives`,
  )

  if (includeClassificationBreakdown) {
    lines.push(`${indent}Classification breakdown:`)
    surveyClassificationOrder.forEach((classification) => {
      lines.push(
        `${indent}${indent}${bullet} ${classificationLabels[classification]}: ${metrics.classificationCounts[classification]}`,
      )
    })
  }

  if (includeStatusCounts) {
    lines.push(`${indent}Stage success counts:`)
    const statusLines: Array<[keyof typeof metrics.statusCounts, string]> = [
      ["irreducible", "Irreducibility"],
      ["semisimple", "Semisimplicity"],
      ["summands", "Summand verification"],
      ["irreducibleSummands", "Irreducible summands"],
      ["certification", "Certification"],
    ]
    statusLines.forEach(([statusKey, label]) => {
      lines.push(
        `${indent}${indent}${bullet} ${label}: ${metrics.statusCounts[statusKey]}`,
      )
    })
  }

  if (includeFailureBreakdown) {
    lines.push(`${indent}First failure stage counts:`)
    let recordedStage = false
    stageOrder.forEach((stage) => {
      const count = metrics.failureStageCounts[stage]
      if (count === undefined) {
        return
      }
      recordedStage = true
      const descriptor = FinGrpRepresentationLawRegistry[stage]
      lines.push(`${indent}${indent}${bullet} ${descriptor.name}: ${count}`)
    })
    if (!recordedStage) {
      lines.push(`${indent}${indent}${bullet} None`)
    }
  }

  if (includeDimensionStatistics) {
    const { min, max, average } = metrics.dimension
    const formattedAverage = Number.isFinite(average)
      ? Number(average.toPrecision(3))
      : average
    lines.push(
      `${indent}Dimension stats: min=${min}, max=${max}, average≈${formattedAverage}`,
    )
  }

  if (includeObservations) {
    lines.push(`Observations:`)
    observations.forEach((observation, index) => {
      const { report, classification } = observation
      const label = report.representation.label ?? `Representation ${index + 1}`
      const success = report.workflow.holds ? successSymbol : failureSymbol
      const classificationLabel = classificationLabels[classification]
      lines.push(
        `${indent}${bullet} ${label}: ${classificationLabel} ${success}`,
      )

      if (includeObservationHeadlines) {
        lines.push(`${indent}${indent}${report.summary.headline}`)
      }

      if (includeObservationStatuses) {
        const statuses: Array<
          readonly [keyof typeof report.summary.status, string]
        > = [
          ["irreducible", "Irreducible"],
          ["semisimple", "Semisimple"],
          ["summands", "Summands"],
          ["irreducibleSummands", "Irreducible summands"],
          ["certification", "Certification"],
        ]
        statuses.forEach(([statusKey, statusLabel]) => {
          const symbol = report.summary.status[statusKey]
            ? successSymbol
            : failureSymbol
          lines.push(`${indent}${indent}${indent}${statusLabel}: ${symbol}`)
        })
      }

      if (includeObservationRecommendations) {
        if (report.summary.recommendations.length > 0) {
          lines.push(`${indent}${indent}Recommendations:`)
          report.summary.recommendations.forEach((recommendation) => {
            lines.push(`${indent}${indent}${indent}${bullet} ${recommendation}`)
          })
        }
      }

      if (includeObservationNarratives && report.narrative) {
        lines.push(`${indent}${indent}Narrative:`)
        report.narrative.forEach((line) => {
          lines.push(`${indent}${indent}${indent}${line}`)
        })
      }
    })
  }

  return lines
}
