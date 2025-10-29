import type {
  Coalgebra,
  CoalgebraLawDiagnostics,
  CoalgebraMorphism,
  CoalgebraMorphismWitness,
  ComonadStructure,
} from "./coalgebra-interfaces"
import {
  analyzeCoalgebraLaws,
  analyzeCoalgebraMorphism,
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
