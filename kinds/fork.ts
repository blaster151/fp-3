import type { FiniteCategory } from "../finite-cat"

/**
 * Check whether two arrows form a commuting fork over a given arrow.
 *
 * A fork over f is a pair of arrows g, h with shared domain X and codomain
 * matching the domain of f such that f ∘ g = f ∘ h.
 */
export const forkCommutes = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  f: Arr,
  g: Arr,
  h: Arr,
): boolean => {
  if (category.src(f) !== category.dst(g)) return false
  if (category.src(f) !== category.dst(h)) return false
  if (category.src(g) !== category.src(h)) return false
  const fg = category.compose(f, g)
  const fh = category.compose(f, h)
  return category.eq(fg, fh)
}

/**
 * Determine monicity by inspecting all forks over the arrow and ensuring every
 * commuting fork has identical legs. An optional callback reports the first
 * counterexample discovered.
 */
export const isMonoByForks = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  f: Arr,
  onCounterexample?: (g: Arr, h: Arr) => void,
): boolean => {
  const domain = category.src(f)
  const candidates = category.arrows.filter((arrow) => category.dst(arrow) === domain)
  for (const g of candidates) {
    for (const h of candidates) {
      if (!forkCommutes(category, f, g, h)) continue
      if (category.eq(g, h)) continue
      onCounterexample?.(g, h)
      return false
    }
  }
  return true
}
