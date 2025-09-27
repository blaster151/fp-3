import type { FinSetCategory, FuncArr } from "./finset-cat"

const fallbackLabel = (arrow: FuncArr, flavour: "left" | "right"): string =>
  `${arrow.name}_${flavour}Inv`

/**
 * Given an injective arrow f, construct a left inverse g with g ∘ f = id.
 * Returns null when the arrow is not injective or when no such inverse can
 * exist (for instance, when the domain is empty but the codomain is not).
 */
export const buildLeftInverseForInjective = (
  category: FinSetCategory,
  arrow: FuncArr,
): FuncArr | null => {
  if (!category.isInjective(arrow)) return null
  const domain = category.carrier(arrow.dom)
  const codomain = category.carrier(arrow.cod)
  if (domain.length === 0) {
    return codomain.length === 0
      ? {
          name: fallbackLabel(arrow, "left"),
          dom: arrow.cod,
          cod: arrow.dom,
          map: (_x: string) => {
            throw new Error("buildLeftInverseForInjective: unexpected evaluation on empty domain")
          },
        }
      : null
  }

  const preimage: Record<string, string> = {}
  for (const element of domain) {
    const image = arrow.map(element)
    if (preimage[image] === undefined) preimage[image] = element
  }
  const fallback = domain[0]!

  return {
    name: fallbackLabel(arrow, "left"),
    dom: arrow.cod,
    cod: arrow.dom,
    map: (y: string) => preimage[y] ?? fallback,
  }
}

/**
 * Given a surjective arrow f, construct a right inverse g with f ∘ g = id.
 * Returns null when the arrow fails to be surjective.
 */
export const buildRightInverseForSurjective = (
  category: FinSetCategory,
  arrow: FuncArr,
): FuncArr | null => {
  if (!category.isSurjective(arrow)) return null
  const domain = category.carrier(arrow.dom)
  const codomain = category.carrier(arrow.cod)

  const sections: Record<string, string> = {}
  for (const element of domain) {
    const image = arrow.map(element)
    if (sections[image] === undefined) sections[image] = element
  }

  const fallback = domain[0]

  return {
    name: fallbackLabel(arrow, "right"),
    dom: arrow.cod,
    cod: arrow.dom,
    map: (y: string) => {
      const chosen = sections[y]
      if (chosen !== undefined) return chosen
      if (fallback !== undefined) return fallback
      throw new Error("buildRightInverseForSurjective: codomain element has no preimage")
    },
  }
}
