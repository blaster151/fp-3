import type { FiniteCategory } from "../finite-cat"
import { isMono } from "./mono-epi"

export interface MutualMonicFactorization<Arr> {
  readonly left: Arr
  readonly right: Arr
  readonly forward: Arr
  readonly backward: Arr
}

const arrowKey = <Arr>(lookup: Map<Arr, number>, arrow: Arr): string => {
  const index = lookup.get(arrow)
  if (index === undefined) {
    throw new Error("monic factorisation: arrow not present in category.arrows")
  }
  return String(index)
}

export const findMutualMonicFactorizations = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): MutualMonicFactorization<Arr>[] => {
  const results: MutualMonicFactorization<Arr>[] = []
  const index = new Map<Arr, number>()
  category.arrows.forEach((arrow, i) => index.set(arrow, i))
  const seen = new Set<string>()

  for (const r of category.arrows) {
    if (!isMono(category, r)) continue
    const cod = category.dst(r)
    const domR = category.src(r)

    for (const s of category.arrows) {
      if (!isMono(category, s)) continue
      if (category.dst(s) !== cod) continue
      const domS = category.src(s)

      const key = `${arrowKey(index, r)}|${arrowKey(index, s)}`
      if (seen.has(key)) continue

      const gCandidates = category.arrows.filter(
        (candidate) => category.src(candidate) === domR && category.dst(candidate) === domS,
      )
      const hCandidates = category.arrows.filter(
        (candidate) => category.src(candidate) === domS && category.dst(candidate) === domR,
      )

      let recorded = false
      for (const g of gCandidates) {
        const sg = category.compose(s, g)
        if (!category.eq(sg, r)) continue
        for (const h of hCandidates) {
          const rh = category.compose(r, h)
          if (!category.eq(rh, s)) continue
          results.push({ left: r, right: s, forward: g, backward: h })
          recorded = true
          break
        }
        if (recorded) break
      }

      if (recorded) {
        seen.add(key)
        seen.add(`${arrowKey(index, s)}|${arrowKey(index, r)}`)
      }
    }
  }

  return results
}

export interface FactorisationCheckResult<Arr> {
  readonly holds: boolean
  readonly witness?: MutualMonicFactorization<Arr>
  readonly detail?: string
}

export const verifyMutualMonicFactorizations = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): FactorisationCheckResult<Arr> => {
  for (const witness of findMutualMonicFactorizations(category)) {
    const domR = category.src(witness.left)
    const domS = category.src(witness.right)
    const hg = category.compose(witness.backward, witness.forward)
    const gh = category.compose(witness.forward, witness.backward)
    const idR = category.id(domR)
    const idS = category.id(domS)
    const leftOk = category.eq(hg, idR)
    const rightOk = category.eq(gh, idS)
    if (!leftOk || !rightOk) {
      const detail = [
        leftOk ? undefined : "h ∘ g ≠ 1",
        rightOk ? undefined : "g ∘ h ≠ 1",
      ]
        .filter((entry): entry is string => entry !== undefined)
        .join(", ")
      return { holds: false, witness, detail }
    }
  }
  return { holds: true }
}
