import type {
  BialgebraCompatibilityDiagnostics,
  BialgebraStructure,
  BialgebraCompatibilityComponent,
} from "../../operations/coalgebra/coalgebra-interfaces"
import { ensureBialgebraCompatibility } from "../../operations/coalgebra/coalgebra-interfaces"
import type { BialgebraCompatibilityWitnesses } from "../../operations/coalgebra/coalgebra-witnesses"
import { buildBialgebraCompatibilityWitness } from "../../operations/coalgebra/coalgebra-witnesses"
import {
  describeBialgebraCompatibilityFailure,
  collectBialgebraCompatibilitySummary,
  collectBialgebraCompatibilityFailures,
  summarizeBialgebraCompatibility,
  type BialgebraCompatibilitySummary,
  type BialgebraCompatibilityFailure,
} from "../../diagnostics"

export interface BialgebraCompatibilityOracleComponent<M> {
  readonly holds: boolean
  readonly witness: BialgebraCompatibilityWitnesses<M>[BialgebraCompatibilityComponent]
  readonly details?: string
}

export interface BialgebraCompatibilityOracleReport<M> {
  readonly overall: boolean
  readonly multiplication: BialgebraCompatibilityOracleComponent<M>
  readonly unit: BialgebraCompatibilityOracleComponent<M>
  readonly counit: BialgebraCompatibilityOracleComponent<M>
  readonly diagnostics: BialgebraCompatibilityDiagnostics<M>
  readonly witness: BialgebraCompatibilityWitnesses<M>
  readonly summary: string
  readonly summaryDetails: BialgebraCompatibilitySummary<M>
  readonly failures: readonly BialgebraCompatibilityFailure<M>[]
}

export interface BialgebraCompatibilityOracleOptions<M> {
  readonly diagnostics?: BialgebraCompatibilityDiagnostics<M>
}

const component = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  key: BialgebraCompatibilityComponent,
  witness: BialgebraCompatibilityWitnesses<M>[BialgebraCompatibilityComponent],
): BialgebraCompatibilityOracleComponent<M> => {
  const details = witness.holds ? undefined : describeBialgebraCompatibilityFailure(bialgebra, key, witness)
  return {
    holds: witness.holds,
    witness,
    ...(details ? { details } : {}),
  }
}

export const checkBialgebraCompatibility = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  options: BialgebraCompatibilityOracleOptions<M> = {},
): BialgebraCompatibilityOracleReport<M> => {
  const diagnostics = options.diagnostics ?? ensureBialgebraCompatibility(bialgebra)
  const witness = buildBialgebraCompatibilityWitness(bialgebra, diagnostics)
  return {
    overall: diagnostics.overall,
    multiplication: component(bialgebra, "multiplication", witness.multiplication),
    unit: component(bialgebra, "unit", witness.unit),
    counit: component(bialgebra, "counit", witness.counit),
    diagnostics,
    witness,
    summary: summarizeBialgebraCompatibility(bialgebra, witness),
    summaryDetails: collectBialgebraCompatibilitySummary(bialgebra, witness),
    failures: collectBialgebraCompatibilityFailures(bialgebra, witness),
  }
}
