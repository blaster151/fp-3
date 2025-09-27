import type { FiniteCategory } from "../finite-cat"
import { twoSidedInverses } from "./inverses"

export { isIso } from "./inverses"

export interface IsoWitness<Arr> {
  readonly forward: Arr
  readonly inverse: Arr
}

export const inverse = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): Arr | null => {
  const [candidate] = twoSidedInverses(category, arrow)
  return candidate ?? null
}

export const isoWitness = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): IsoWitness<Arr> | null => {
  const inv = inverse(category, arrow)
  return inv == null ? null : { forward: arrow, inverse: inv }
}

export const areIsomorphic = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  a: Obj,
  b: Obj,
): IsoWitness<Arr> | null => {
  for (const arrow of category.arrows) {
    if (category.src(arrow) !== a || category.dst(arrow) !== b) continue
    const inv = inverse(category, arrow)
    if (inv != null) {
      return { forward: arrow, inverse: inv }
    }
  }
  return null
}
