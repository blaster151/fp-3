import type { FiniteCategory } from "../finite-cat"
import { hasLeftInverse, hasRightInverse } from "./inverses"

export const isRetractionOf = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  retraction: Arr,
  section: Arr,
): boolean => category.eq(category.compose(retraction, section), category.id(category.src(section)))

export const isSectionOf = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  section: Arr,
  retraction: Arr,
): boolean => isRetractionOf(category, retraction, section)

export const isSplitMono = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): boolean => hasLeftInverse(category, arrow)

export const isSplitEpi = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): boolean => hasRightInverse(category, arrow)
