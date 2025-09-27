import type { FiniteCategory } from "../finite-cat"
import { isMono, isEpi } from "./mono-epi"

export interface Factor<Obj, Arr> {
  readonly mid: Obj
  readonly epi: Arr
  readonly mono: Arr
}

export interface FactorIso<Arr> {
  readonly forward: Arr
  readonly backward: Arr
}

export const epiMonoFactor = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): Factor<Obj, Arr> | null => {
  const specialised = (category as { imageFactorisation?: (arrow: Arr) => Factor<Obj, Arr> | null })
    .imageFactorisation
  if (typeof specialised === "function") {
    const factor = specialised(arrow)
    if (factor) return factor
  }
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

const factorForwardMatches = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  left: Factor<Obj, Arr>,
  right: Factor<Obj, Arr>,
  candidate: Arr,
) => {
  if (category.src(candidate) !== left.mid) return false
  if (category.dst(candidate) !== right.mid) return false
  const throughEpi = category.compose(candidate, left.epi)
  if (!category.eq(throughEpi, right.epi)) return false
  const throughMono = category.compose(right.mono, candidate)
  return category.eq(throughMono, left.mono)
}

const factorBackwardMatches = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  left: Factor<Obj, Arr>,
  right: Factor<Obj, Arr>,
  candidate: Arr,
) => {
  if (category.src(candidate) !== right.mid) return false
  if (category.dst(candidate) !== left.mid) return false
  const throughEpi = category.compose(candidate, right.epi)
  if (!category.eq(throughEpi, left.epi)) return false
  const throughMono = category.compose(left.mono, candidate)
  return category.eq(throughMono, right.mono)
}

export const epiMonoMiddleIso = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  left: Factor<Obj, Arr>,
  right: Factor<Obj, Arr>,
): FactorIso<Arr> | null => {
  const forwardCandidates = category.arrows.filter((candidate) =>
    factorForwardMatches(category, left, right, candidate),
  )
  const backwardCandidates = category.arrows.filter((candidate) =>
    factorBackwardMatches(category, left, right, candidate),
  )

  const idLeft = category.id(left.mid)
  const idRight = category.id(right.mid)

  for (const forward of forwardCandidates) {
    for (const backward of backwardCandidates) {
      const backThenFor = category.compose(backward, forward)
      if (!category.eq(backThenFor, idLeft)) continue
      const forThenBack = category.compose(forward, backward)
      if (!category.eq(forThenBack, idRight)) continue
      return { forward, backward }
    }
  }

  return null
}
