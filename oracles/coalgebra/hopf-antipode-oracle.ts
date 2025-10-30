import type {
  HopfAlgebraStructure,
  HopfAntipodeConvolutionComparisons,
  HopfAntipodeDiagnostics,
  HopfAntipodePropertySamplingReport,
} from "../../operations/coalgebra/coalgebra-interfaces"
import { analyzeHopfAntipode, evaluateHopfAntipodeOnSamples } from "../../operations/coalgebra/coalgebra-interfaces"
import type { HopfAntipodeConvolutionWitness, HopfAntipodeWitness } from "../../operations/coalgebra/coalgebra-witnesses"
import {
  buildHopfAntipodeConvolutionComparisons,
  type HopfAntipodeConvolutionOptions,
} from "../../operations/coalgebra/hopf-convolution"
import { buildHopfAntipodeWitness } from "../../operations/coalgebra/coalgebra-witnesses"
import { describeHopfAntipodeFailure, summarizeHopfAntipodePropertySampling } from "../../diagnostics"

export interface HopfAntipodeOracleComponent<M> {
  readonly holds: boolean
  readonly witness: HopfAntipodeConvolutionWitness<M>
  readonly details?: string
}

export interface HopfAntipodeOracleReport<M, Grade = unknown, Trace = unknown, Sample = unknown> {
  readonly overall: boolean
  readonly left: HopfAntipodeOracleComponent<M>
  readonly right: HopfAntipodeOracleComponent<M>
  readonly diagnostics: HopfAntipodeDiagnostics<M, Grade, Trace>
  readonly witness: HopfAntipodeWitness<M>
  readonly comparisons: HopfAntipodeConvolutionComparisons<M>
  readonly propertySampling?: HopfAntipodePropertySamplingReport<Sample>
  readonly propertySamplingSummary?: string
}

export type HopfAntipodeOracleOptions<O, M, Grade = unknown, Trace = unknown, Sample = unknown> =
  HopfAntipodeConvolutionOptions<O, M, Grade, Trace, Sample>

const component = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  side: "left" | "right",
  witness: HopfAntipodeConvolutionWitness<M>,
): HopfAntipodeOracleComponent<M> => {
  const details = witness.holds ? undefined : describeHopfAntipodeFailure(hopf, side, witness)
  return {
    holds: witness.holds,
    witness,
    ...(details ? { details } : {}),
  }
}

export const checkHopfAntipode = <
  O,
  M,
  Grade = unknown,
  Trace = unknown,
  Sample = unknown,
>(
  hopf: HopfAlgebraStructure<O, M>,
  options: HopfAntipodeOracleOptions<O, M, Grade, Trace, Sample> = {},
): HopfAntipodeOracleReport<M, Grade, Trace, Sample> => {
  const comparisons = buildHopfAntipodeConvolutionComparisons(hopf, options)
  const diagnostics = analyzeHopfAntipode(hopf, comparisons, options.derived)
  const witness = buildHopfAntipodeWitness(hopf, comparisons, diagnostics)
  const propertySampling = options.propertySampling
    ? evaluateHopfAntipodeOnSamples(comparisons, options.propertySampling)
    : undefined
  const propertySamplingSummary = propertySampling
    ? summarizeHopfAntipodePropertySampling(propertySampling)
    : undefined
  return {
    overall: diagnostics.overall,
    left: component(hopf, "left", witness.left),
    right: component(hopf, "right", witness.right),
    diagnostics,
    witness,
    comparisons,
    ...(propertySampling ? { propertySampling } : {}),
    ...(propertySamplingSummary ? { propertySamplingSummary } : {}),
  }
}
