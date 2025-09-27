import type { FiniteCategory } from "../finite-cat"

export const isIdempotent = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): boolean => category.eq(category.compose(arrow, arrow), arrow)

export const projectorFromSection = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  section: Arr,
  retraction: Arr,
): Arr => category.compose(section, retraction)
