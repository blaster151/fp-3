import type { FiniteCategory } from "../finite-cat"

/**
 * Determine whether an arrow is a monomorphism by checking left cancellability
 * across all arrows with matching codomain. Suitable for finite categories.
 */
export const isMono = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): boolean => {
  const target = category.src(arrow)
  const candidates = category.arrows.filter((a) => category.dst(a) === target)
  for (const u of candidates) {
    for (const v of candidates) {
      const left = category.compose(arrow, u)
      const right = category.compose(arrow, v)
      if (category.eq(left, right) && !category.eq(u, v)) {
        return false
      }
    }
  }
  return true
}

/**
 * Determine whether an arrow is an epimorphism by checking right cancellability
 * across all arrows with matching domain. Suitable for finite categories.
 */
export const isEpi = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): boolean => {
  const source = category.dst(arrow)
  const candidates = category.arrows.filter((a) => category.src(a) === source)
  for (const u of candidates) {
    for (const v of candidates) {
      const left = category.compose(u, arrow)
      const right = category.compose(v, arrow)
      if (category.eq(left, right) && !category.eq(u, v)) {
        return false
      }
    }
  }
  return true
}
