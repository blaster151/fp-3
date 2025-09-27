import type { FiniteCategory } from "../finite-cat"
import {
  type FactorisationCheckResult,
  verifyMutualMonicFactorizations,
} from "../kinds/monic-factorization"

export interface CategoryOracle {
  readonly id: string
  readonly title: string
  readonly check: <Obj, Arr>(
    category: FiniteCategory<Obj, Arr>,
  ) => FactorisationCheckResult<Arr>
}

export const MonicFactorizationYieldsIso: CategoryOracle = {
  id: "MonicFactorizationYieldsIso",
  title: "Mutually factoring monomorphisms yield isomorphisms",
  check: (category) => verifyMutualMonicFactorizations(category),
}
