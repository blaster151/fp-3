import type {
  Coalgebra,
  CoalgebraLawDiagnostics,
  CoalgebraMorphism,
  CoalgebraMorphismWitness,
  ComonadStructure,
  HopfAlgebraStructure,
  BialgebraStructure,
  BialgebraCompatibilityDiagnostics,
  BialgebraCompatibilityWitness,
  BialgebraCompatibilityComponent,
  HopfAntipodeConvolutionDiagnostics,
  HopfAntipodeConvolutionComparisons,
  HopfAntipodeDiagnostics,
} from "./coalgebra-interfaces"
import {
  analyzeCoalgebraLaws,
  analyzeCoalgebraMorphism,
  analyzeHopfAntipode,
  ensureBialgebraCompatibility,
  ensureBialgebraCompatibilityComponent,
} from "./coalgebra-interfaces"

export interface CoalgebraCounitWitness<M> {
  readonly holds: boolean
  readonly composite: M
  readonly identity: M
}

export const buildCoalgebraCounitWitness = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
  diagnostics?: CoalgebraLawDiagnostics<M>,
): CoalgebraCounitWitness<M> => {
  const report = diagnostics ?? analyzeCoalgebraLaws(comonad, coalgebra)
  return {
    holds: report.counit.holds,
    composite: report.counit.actual,
    identity: report.counit.expected,
  }
}

export interface CoalgebraCoassociativityWitness<M> {
  readonly holds: boolean
  readonly left: M
  readonly right: M
}

export const buildCoalgebraCoassociativityWitness = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
  diagnostics?: CoalgebraLawDiagnostics<M>,
): CoalgebraCoassociativityWitness<M> => {
  const report = diagnostics ?? analyzeCoalgebraLaws(comonad, coalgebra)
  return {
    holds: report.coassociativity.holds,
    left: report.coassociativity.left,
    right: report.coassociativity.right,
  }
}

export interface CoalgebraLawWitness<M> {
  readonly counit: CoalgebraCounitWitness<M>
  readonly coassociativity: CoalgebraCoassociativityWitness<M>
  readonly overall: boolean
}

export const buildCoalgebraLawWitness = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
  diagnostics?: CoalgebraLawDiagnostics<M>,
): CoalgebraLawWitness<M> => {
  const report = diagnostics ?? analyzeCoalgebraLaws(comonad, coalgebra)
  return {
    counit: buildCoalgebraCounitWitness(comonad, coalgebra, report),
    coassociativity: buildCoalgebraCoassociativityWitness(comonad, coalgebra, report),
    overall: report.overall,
  }
}

export interface CoalgebraMorphismCoherenceWitness<M> {
  readonly holds: boolean
  readonly left: M
  readonly right: M
}

export const buildCoalgebraMorphismCoherenceWitness = <O, M>(
  comonad: ComonadStructure<O, M>,
  morphism: CoalgebraMorphism<O, M>,
  diagnostics?: CoalgebraMorphismWitness<M>,
): CoalgebraMorphismCoherenceWitness<M> => {
  const report = diagnostics ?? analyzeCoalgebraMorphism(comonad, morphism)
  return {
    holds: report.holds,
    left: report.left,
    right: report.right,
  }
}

export type HopfAntipodeConvolutionWitness<M> = HopfAntipodeConvolutionDiagnostics<M>

export interface HopfAntipodeWitness<M> {
  readonly left: HopfAntipodeConvolutionWitness<M>
  readonly right: HopfAntipodeConvolutionWitness<M>
  readonly overall: boolean
}

export const buildHopfAntipodeWitness = <O, M, Grade = unknown, Trace = unknown>(
  hopf: HopfAlgebraStructure<O, M>,
  comparisons: HopfAntipodeConvolutionComparisons<M>,
  diagnostics?: HopfAntipodeDiagnostics<M, Grade, Trace>,
): HopfAntipodeWitness<M> => {
  const report = diagnostics ?? analyzeHopfAntipode(hopf, comparisons)
  return {
    left: report.left,
    right: report.right,
    overall: report.overall,
  }
}

export interface BialgebraCompatibilityWitnesses<M> extends BialgebraCompatibilityDiagnostics<M> {}

export const buildBialgebraCompatibilityComponentWitness = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  component: BialgebraCompatibilityComponent,
  diagnostics?: BialgebraCompatibilityDiagnostics<M>,
): BialgebraCompatibilityWitness<M> =>
  diagnostics?.[component] ?? ensureBialgebraCompatibilityComponent(bialgebra, component)

export const buildBialgebraCompatibilityWitness = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  diagnostics?: BialgebraCompatibilityDiagnostics<M>,
): BialgebraCompatibilityWitnesses<M> =>
  diagnostics ?? ensureBialgebraCompatibility(bialgebra)
