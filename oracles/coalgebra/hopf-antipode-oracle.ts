import type {
  HopfAlgebraStructure,
  HopfAntipodeConvolutionComparisons,
  HopfAntipodeDiagnostics,
} from "../../operations/coalgebra/coalgebra-interfaces"
import { analyzeHopfAntipode } from "../../operations/coalgebra/coalgebra-interfaces"
import type { HopfAntipodeConvolutionWitness, HopfAntipodeWitness } from "../../operations/coalgebra/coalgebra-witnesses"
import {
  buildHopfAntipodeConvolutionComparisons,
  type HopfAntipodeConvolutionOptions,
} from "../../operations/coalgebra/hopf-convolution"
import { buildHopfAntipodeWitness } from "../../operations/coalgebra/coalgebra-witnesses"
import { describeHopfAntipodeFailure } from "../../diagnostics"

export interface HopfAntipodeOracleComponent<M> {
  readonly holds: boolean
  readonly witness: HopfAntipodeConvolutionWitness<M>
  readonly details?: string
}

export interface HopfAntipodeOracleReport<M> {
  readonly overall: boolean
  readonly left: HopfAntipodeOracleComponent<M>
  readonly right: HopfAntipodeOracleComponent<M>
  readonly diagnostics: HopfAntipodeDiagnostics<M>
  readonly witness: HopfAntipodeWitness<M>
  readonly comparisons: HopfAntipodeConvolutionComparisons<M>
}

export type HopfAntipodeOracleOptions<M> = HopfAntipodeConvolutionOptions<M>

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

export const checkHopfAntipode = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  options: HopfAntipodeOracleOptions<M> = {},
): HopfAntipodeOracleReport<M> => {
  const comparisons = buildHopfAntipodeConvolutionComparisons(hopf, options)
  const diagnostics = analyzeHopfAntipode(hopf, comparisons)
  const witness = buildHopfAntipodeWitness(hopf, comparisons, diagnostics)
  return {
    overall: diagnostics.overall,
    left: component(hopf, "left", witness.left),
    right: component(hopf, "right", witness.right),
    diagnostics,
    witness,
    comparisons,
  }
}
