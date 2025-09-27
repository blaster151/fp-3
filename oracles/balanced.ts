import type { FiniteCategory } from "../finite-cat"

export interface BalancedPromotion<Arr> {
  readonly arrow: Arr
  readonly inverse: Arr
}

const findTwoSidedInverse = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): Arr | null => {
  const source = category.src(arrow)
  const target = category.dst(arrow)
  const idSource = category.id(source)
  const idTarget = category.id(target)

  for (const candidate of category.arrows) {
    if (category.src(candidate) !== target) continue
    if (category.dst(candidate) !== source) continue
    const left = category.compose(candidate, arrow)
    if (!category.eq(left, idSource)) continue
    const right = category.compose(arrow, candidate)
    if (!category.eq(right, idTarget)) continue
    return candidate
  }

  return null
}

export const detectBalancedPromotions = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  isMono: (category: FiniteCategory<Obj, Arr>, arrow: Arr) => boolean,
  isEpi: (category: FiniteCategory<Obj, Arr>, arrow: Arr) => boolean,
): BalancedPromotion<Arr>[] => {
  if (!category.traits?.balanced) return []

  const promotions: BalancedPromotion<Arr>[] = []
  for (const arrow of category.arrows) {
    if (!isMono(category, arrow)) continue
    if (!isEpi(category, arrow)) continue
    const inverse = findTwoSidedInverse(category, arrow)
    if (!inverse) continue
    promotions.push({ arrow, inverse })
  }

  return promotions
}
