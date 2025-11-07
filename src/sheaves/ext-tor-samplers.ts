import type { CohomologyAnalysis, CechCohomologyResult } from "./cech-cohomology"
import type {
  FlatModuleCheckResult,
  FlatModuleViolation,
  FlatModuleWitness,
  TensorProductCheckResult,
  TensorProductViolation,
  TensorProductWitness,
} from "../algebra/ring/tensor-products"

const cohomologyRank = (analysis: CohomologyAnalysis, degree: number): number =>
  analysis.groups.find(group => group.degree === degree)?.rank ?? 0

type FlatWitnessKind = FlatModuleWitness<any, any, any, any>["kind"]

type FlatViolationCategory = "kernel" | "surjection" | "composition" | "general"

const classifyFlatViolation = (
  violation: FlatModuleViolation<any, any, any, any>,
): FlatViolationCategory => {
  switch (violation.kind) {
    case "kernelWitness":
    case "kernelSample":
    case "kernelSampleMissingPreimage":
      return "kernel"
    case "surjectionWitness":
    case "surjectionSample":
    case "surjectionSampleMissingLift":
      return "surjection"
    case "compositionWitness":
    case "injectSample":
      return "composition"
    case "witnessInconsistent":
      if (violation.stage === "kernel") {
        return "kernel"
      }
      if (violation.stage === "surjection") {
        return "surjection"
      }
      return "composition"
    default:
      return "general"
  }
}

export interface TorDegreeConfig {
  readonly torDegree: number
  readonly cohomologyDegree?: number
  readonly witnessKinds?: ReadonlyArray<FlatWitnessKind>
}

const defaultTorDegrees: ReadonlyArray<TorDegreeConfig> = [
  { torDegree: 0, witnessKinds: ["surjection", "composition"] },
  { torDegree: 1, witnessKinds: ["kernel"] },
]

export interface TorSamplerOptions {
  readonly degrees?: ReadonlyArray<TorDegreeConfig>
  readonly label?: string
}

export interface TorDegreeComparison {
  readonly torDegree: number
  readonly cohomologyDegree: number
  readonly cohomologyRank: number
  readonly witnessKinds: ReadonlyArray<FlatWitnessKind>
  readonly witnessCount: number
  readonly violationCount: number
  readonly matches: boolean
  readonly details: string
}

export interface TorSamplerResult {
  readonly matches: boolean
  readonly comparisons: ReadonlyArray<TorDegreeComparison>
  readonly details: string
  readonly metadata: {
    readonly totalDegrees: number
    readonly satisfiedDegrees: number
    readonly tensorWitnesses: number
    readonly tensorViolations: number
  }
}

const getWitnessKinds = (config: TorDegreeConfig): ReadonlyArray<FlatWitnessKind> =>
  config.witnessKinds ?? ["kernel", "surjection", "composition"]

export const sampleTorFromFlat = <Left, Middle, Right, Candidate, Section, R>(
  input: {
  readonly cech: CechCohomologyResult<Section, R>
    readonly flat: FlatModuleCheckResult<Left, Middle, Right, Candidate>
    readonly options?: TorSamplerOptions
  },
): TorSamplerResult => {
  const { cech, flat, options = {} } = input
  const analysis = cech.cohomology
  const configs = options.degrees ?? defaultTorDegrees

  const comparisons: TorDegreeComparison[] = configs.map(config => {
    const cohomologyDegree = config.cohomologyDegree ?? config.torDegree
    const rank = cohomologyRank(analysis, cohomologyDegree)
    const witnessKinds = getWitnessKinds(config)
    const relevantWitnesses = flat.witnesses.filter(witness => witnessKinds.includes(witness.kind))
    const relevantViolations = flat.violations.filter(violation => {
      const category = classifyFlatViolation(violation)
      return category !== "general" && witnessKinds.includes(category as FlatWitnessKind)
    })

    const matches = rank === 0
      ? relevantViolations.length === 0
      : relevantWitnesses.length > 0 && relevantViolations.length === 0

    const label = `Tor_${config.torDegree}`
    const cohomologyLabel = `H^${cohomologyDegree}`
    const details = matches
      ? `${label} (${cohomologyLabel}) evidence aligns with Čech rank ${rank} using ${relevantWitnesses.length} tensor witness(es).`
      : `${label} (${cohomologyLabel}) misaligned: rank ${rank}, ${relevantWitnesses.length} witness(es), ${relevantViolations.length} violation(s).`

    return {
      torDegree: config.torDegree,
      cohomologyDegree,
      cohomologyRank: rank,
      witnessKinds,
      witnessCount: relevantWitnesses.length,
      violationCount: relevantViolations.length,
      matches,
      details,
    }
  })

  const matches = comparisons.every(comparison => comparison.matches)
  const satisfiedDegrees = comparisons.filter(comparison => comparison.matches).length
  const label = options.label ?? "Tor sampler"
  const details = matches
    ? `${label} reconciled Čech cohomology with tensor flatness across ${comparisons.length} degree(s).`
    : `${label} detected Tor/Čech discrepancies at degree(s) ${comparisons
        .filter(comparison => !comparison.matches)
        .map(comparison => comparison.torDegree)
        .join(", "
      )}.`

  return {
    matches,
    comparisons,
    details,
    metadata: {
      totalDegrees: comparisons.length,
      satisfiedDegrees,
      tensorWitnesses: flat.witnesses.length,
      tensorViolations: flat.violations.length,
    },
  }
}

export interface ExtDegreeConfig {
  readonly extDegree: number
  readonly cohomologyDegree?: number
  readonly mapLabels?: ReadonlyArray<string>
}

export interface ExtSamplerOptions {
  readonly degrees?: ReadonlyArray<ExtDegreeConfig>
  readonly label?: string
}

export interface ExtDegreeComparison {
  readonly extDegree: number
  readonly cohomologyDegree: number
  readonly cohomologyRank: number
  readonly witnessCount: number
  readonly violationCount: number
  readonly mapLabels?: ReadonlyArray<string>
  readonly matches: boolean
  readonly details: string
}

export interface ExtSamplerResult {
  readonly matches: boolean
  readonly comparisons: ReadonlyArray<ExtDegreeComparison>
  readonly details: string
  readonly metadata: {
    readonly totalDegrees: number
    readonly satisfiedDegrees: number
    readonly tensorWitnesses: number
    readonly tensorViolations: number
  }
}

const defaultExtDegrees = (analysis: CohomologyAnalysis): ReadonlyArray<ExtDegreeConfig> =>
  analysis.groups.map(group => ({ extDegree: group.degree }))

const relevantTensorWitness = (
  witness: TensorProductWitness<any, any, any>,
  labels?: ReadonlyArray<string>,
): boolean => (labels ? labels.includes(witness.mapLabel) : true)

const relevantTensorViolation = (
  violation: TensorProductViolation<any, any, any>,
  labels?: ReadonlyArray<string>,
): boolean => {
  if (!labels || labels.length === 0) {
    return true
  }
  if (!("mapLabel" in violation)) {
    return false
  }
  return violation.mapLabel !== undefined && labels.includes(violation.mapLabel)
}

export const sampleExtFromTensor = <Left, Right, Tensor, Section, R>(
  input: {
  readonly cech: CechCohomologyResult<Section, R>
    readonly tensor: TensorProductCheckResult<Left, Right, Tensor>
    readonly options?: ExtSamplerOptions
  },
): ExtSamplerResult => {
  const { cech, tensor, options = {} } = input
  const analysis = cech.cohomology
  const configs = options.degrees ?? defaultExtDegrees(analysis)

  const comparisons: ExtDegreeComparison[] = configs.map(config => {
    const cohomologyDegree = config.cohomologyDegree ?? config.extDegree
    const rank = cohomologyRank(analysis, cohomologyDegree)
    const relevantWitnesses = tensor.witnesses.filter(witness =>
      relevantTensorWitness(witness, config.mapLabels),
    )
    const relevantViolations = tensor.violations.filter(violation =>
      relevantTensorViolation(violation, config.mapLabels),
    )

    const matches = rank === 0
      ? relevantViolations.length === 0
      : relevantWitnesses.length > 0 && relevantViolations.length === 0

    const label = `Ext^${config.extDegree}`
    const cohomologyLabel = `H^${cohomologyDegree}`
    const details = matches
      ? `${label} (${cohomologyLabel}) aligns with ${relevantWitnesses.length} tensor witness(es) supporting rank ${rank}.`
      : `${label} (${cohomologyLabel}) mismatch: rank ${rank}, ${relevantWitnesses.length} witness(es), ${relevantViolations.length} violation(s).`

    return {
      extDegree: config.extDegree,
      cohomologyDegree,
      cohomologyRank: rank,
      witnessCount: relevantWitnesses.length,
      violationCount: relevantViolations.length,
      ...(config.mapLabels ? { mapLabels: config.mapLabels } : {}),
      matches,
      details,
    }
  })

  const matches = comparisons.every(comparison => comparison.matches)
  const satisfiedDegrees = comparisons.filter(comparison => comparison.matches).length
  const label = options.label ?? "Ext sampler"
  const details = matches
    ? `${label} reconciled Čech cohomology with tensor Ext samples across ${comparisons.length} degree(s).`
    : `${label} detected Ext/Čech discrepancies at degree(s) ${comparisons
        .filter(comparison => !comparison.matches)
        .map(comparison => comparison.extDegree)
        .join(", "
      )}.`

  return {
    matches,
    comparisons,
    details,
    metadata: {
      totalDegrees: comparisons.length,
      satisfiedDegrees,
      tensorWitnesses: tensor.witnesses.length,
      tensorViolations: tensor.violations.length,
    },
  }
}

