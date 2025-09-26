import type { FiniteCategory } from "../finite-cat"

export interface IsoWitness<Arr> {
  readonly forward: Arr
  readonly inverse: Arr
}

export const inverse = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): Arr | null => {
  const source = category.src(arrow)
  const target = category.dst(arrow)
  for (const candidate of category.arrows) {
    if (category.src(candidate) !== target || category.dst(candidate) !== source) continue
    const left = category.compose(candidate, arrow)
    const right = category.compose(arrow, candidate)
    if (category.eq(left, category.id(source)) && category.eq(right, category.id(target))) {
      return candidate
    }
  }
  return null
}

export const isIso = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): boolean => inverse(category, arrow) !== null

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
