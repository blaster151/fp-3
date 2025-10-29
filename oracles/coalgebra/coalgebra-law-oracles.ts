import type {
  Coalgebra,
  CoalgebraLawDiagnostics,
  CoalgebraMorphism,
  CoalgebraMorphismWitness,
  ComonadStructure,
} from "../../operations/coalgebra/coalgebra-interfaces"
import {
  analyzeCoalgebraLaws,
  analyzeCoalgebraMorphism,
} from "../../operations/coalgebra/coalgebra-interfaces"
import {
  buildCoalgebraCoassociativityWitness,
  buildCoalgebraCounitWitness,
  buildCoalgebraLawWitness,
  buildCoalgebraMorphismCoherenceWitness,
  type CoalgebraCoassociativityWitness,
  type CoalgebraCounitWitness,
  type CoalgebraLawWitness,
  type CoalgebraMorphismCoherenceWitness,
} from "../../operations/coalgebra/coalgebra-witnesses"
import {
  describeCoalgebraCoassociativityFailure,
  describeCoalgebraCounitFailure,
  describeCoalgebraMorphismFailure,
} from "../../diagnostics"

interface CoalgebraLawComponent<Witness> {
  readonly holds: boolean
  readonly witness: Witness
  readonly details?: string
}

const describeNamed = (value: unknown): string => {
  const name = (value as { readonly name?: unknown })?.name
  if (typeof name === "string" && name.length > 0) {
    return name
  }
  return String(value)
}

export interface CoalgebraLawOracleReport<M> {
  readonly overall: boolean
  readonly counit: CoalgebraLawComponent<CoalgebraCounitWitness<M>>
  readonly coassociativity: CoalgebraLawComponent<CoalgebraCoassociativityWitness<M>>
  readonly diagnostics: CoalgebraLawDiagnostics<M>
  readonly witness: CoalgebraLawWitness<M>
}

const counitComponent = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
  diagnostics: CoalgebraLawDiagnostics<M>,
): CoalgebraLawComponent<CoalgebraCounitWitness<M>> => {
  const witness = buildCoalgebraCounitWitness(comonad, coalgebra, diagnostics)
  const details = witness.holds
    ? undefined
    : describeCoalgebraCounitFailure(comonad, coalgebra, witness)
  return {
    holds: witness.holds,
    witness,
    ...(details ? { details } : {}),
  }
}

const coassociativityComponent = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
  diagnostics: CoalgebraLawDiagnostics<M>,
): CoalgebraLawComponent<CoalgebraCoassociativityWitness<M>> => {
  const witness = buildCoalgebraCoassociativityWitness(comonad, coalgebra, diagnostics)
  const details = witness.holds
    ? undefined
    : describeCoalgebraCoassociativityFailure(comonad, coalgebra, witness)
  return {
    holds: witness.holds,
    witness,
    ...(details ? { details } : {}),
  }
}

export const checkCoalgebraLaws = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
): CoalgebraLawOracleReport<M> => {
  const diagnostics = analyzeCoalgebraLaws(comonad, coalgebra)
  return {
    overall: diagnostics.overall,
    counit: counitComponent(comonad, coalgebra, diagnostics),
    coassociativity: coassociativityComponent(comonad, coalgebra, diagnostics),
    diagnostics,
    witness: buildCoalgebraLawWitness(comonad, coalgebra, diagnostics),
  }
}

export interface CoalgebraMorphismOracleReport<M> {
  readonly holds: boolean
  readonly diagnostics: CoalgebraMorphismWitness<M>
  readonly witness: CoalgebraMorphismCoherenceWitness<M>
  readonly details?: string
}

export const checkCoalgebraMorphism = <O, M>(
  comonad: ComonadStructure<O, M>,
  morphism: CoalgebraMorphism<O, M>,
): CoalgebraMorphismOracleReport<M> => {
  const diagnostics = analyzeCoalgebraMorphism(comonad, morphism)
  const witness = buildCoalgebraMorphismCoherenceWitness(comonad, morphism, diagnostics)
  const details = witness.holds
    ? undefined
    : describeCoalgebraMorphismFailure(comonad, morphism, witness)
  return {
    holds: witness.holds,
    diagnostics,
    witness,
    ...(details ? { details } : {}),
  }
}

const detailList = (details: ReadonlyArray<string | undefined>): readonly string[] =>
  details.filter((value): value is string => typeof value === "string" && value.length > 0)

export interface CoalgebraLawBatchEntry<O, M> {
  readonly coalgebra: Coalgebra<O, M>
  readonly label: string
  readonly report: CoalgebraLawOracleReport<M>
  readonly passed: boolean
  readonly details?: string
}

export interface CoalgebraLawBatchOptions<O, M> {
  readonly describe?: (coalgebra: Coalgebra<O, M>) => string
}

export const analyzeCoalgebraFamily = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebras: readonly Coalgebra<O, M>[],
  options: CoalgebraLawBatchOptions<O, M> = {},
): readonly CoalgebraLawBatchEntry<O, M>[] => {
  const describe = options.describe ?? ((coalgebra: Coalgebra<O, M>) => describeNamed(coalgebra.object))
  return coalgebras.map((coalgebra) => {
    const report = checkCoalgebraLaws(comonad, coalgebra)
    const details = detailList([
      report.counit.details,
      report.coassociativity.details,
    ])
    return {
      coalgebra,
      label: describe(coalgebra),
      report,
      passed: report.overall,
      ...(details.length > 0 ? { details: details.join("\n") } : {}),
    }
  })
}

export interface CoalgebraMorphismBatchEntry<O, M> {
  readonly morphism: CoalgebraMorphism<O, M>
  readonly label: string
  readonly report: CoalgebraMorphismOracleReport<M>
  readonly passed: boolean
  readonly details?: string
}

export interface CoalgebraMorphismBatchOptions<O, M> {
  readonly describe?: (morphism: CoalgebraMorphism<O, M>) => string
}

export const analyzeCoalgebraMorphisms = <O, M>(
  comonad: ComonadStructure<O, M>,
  morphisms: readonly CoalgebraMorphism<O, M>[],
  options: CoalgebraMorphismBatchOptions<O, M> = {},
): readonly CoalgebraMorphismBatchEntry<O, M>[] => {
  const describe =
    options.describe ??
    ((morphism: CoalgebraMorphism<O, M>) => describeNamed(morphism.morphism))
  return morphisms.map((morphism) => {
    const report = checkCoalgebraMorphism(comonad, morphism)
    return {
      morphism,
      label: describe(morphism),
      report,
      passed: report.holds,
      ...(report.details ? { details: report.details } : {}),
    }
  })
}
