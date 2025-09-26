import type { FiniteCategory } from "../finite-cat"
import { isMono, isEpi } from "./mono-epi"

export interface Factor<Obj, Arr> {
  readonly mid: Obj
  readonly epi: Arr
  readonly mono: Arr
}

export const epiMonoFactor = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): Factor<Obj, Arr> | null => {
  const source = category.src(arrow)
  const target = category.dst(arrow)
  for (const mid of category.objects) {
    for (const epi of category.arrows) {
      if (category.src(epi) !== source || category.dst(epi) !== mid) continue
      if (!isEpi(category, epi)) continue
      for (const mono of category.arrows) {
        if (category.src(mono) !== mid || category.dst(mono) !== target) continue
        if (!isMono(category, mono)) continue
        const composite = category.compose(mono, epi)
        if (category.eq(composite, arrow)) {
          return { mid, epi, mono }
        }
      }
    }
  }
  return null
}
