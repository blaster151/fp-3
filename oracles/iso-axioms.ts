import type { FiniteCategory } from "../finite-cat"
import { isoWitness as findIsoWitness } from "../kinds/iso"
import type { IsoWitness } from "../kinds/iso"

export interface IsoAxiomResult<Arr> {
  readonly holds: boolean
  readonly detail?: string
  readonly witness?: IsoWitness<Arr> | Arr
}

const arrowLabel = <Obj, Arr>(category: FiniteCategory<Obj, Arr>, arrow: Arr): string => {
  const name = (arrow as { readonly name?: unknown }).name
  const src = category.src(arrow)
  const dst = category.dst(arrow)
  const tag = typeof name === "string" ? name : "⟨anon⟩"
  return `${tag}:${String(src)}→${String(dst)}`
}

const twoSidedCheck = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  forward: Arr,
  candidate: Arr,
) => {
  const gof = category.compose(candidate, forward)
  const fog = category.compose(forward, candidate)
  const srcId = category.id(category.src(forward))
  const dstId = category.id(category.dst(forward))
  const leftOk = category.eq(gof, srcId)
  const rightOk = category.eq(fog, dstId)
  return { leftOk, rightOk, gof, fog, srcId, dstId }
}

export const IsoAxioms = {
  identityIsIso<Obj, Arr>(
    category: FiniteCategory<Obj, Arr>,
    object: Obj,
  ): IsoAxiomResult<Arr> {
    const identity = category.id(object)
    const witness = findIsoWitness(category, identity)
    if (witness) {
      return { holds: true, witness }
    }
    return {
      holds: false,
      detail: `Identity ${arrowLabel(category, identity)} does not have a two-sided inverse.`,
    }
  },

  uniqueInverse<Obj, Arr>(
    category: FiniteCategory<Obj, Arr>,
    arrow: Arr,
    g: Arr,
    h: Arr,
  ): IsoAxiomResult<Arr> {
    const first = twoSidedCheck(category, arrow, g)
    const second = twoSidedCheck(category, arrow, h)

    if (!first.leftOk || !first.rightOk || !second.leftOk || !second.rightOk) {
      const details = [
        !first.leftOk || !first.rightOk
          ? `g fails: g∘f=${arrowLabel(category, first.gof)}; f∘g=${arrowLabel(category, first.fog)}`
          : undefined,
        !second.leftOk || !second.rightOk
          ? `h fails: h∘f=${arrowLabel(category, second.gof)}; f∘h=${arrowLabel(category, second.fog)}`
          : undefined,
      ]
        .filter((entry): entry is string => entry !== undefined)
        .join("; ")
      return {
        holds: false,
        detail: details.length > 0 ? details : "Provided arrows are not two-sided inverses.",
      }
    }

    if (!category.eq(g, h)) {
      return {
        holds: false,
        detail: `Inverse of ${arrowLabel(category, arrow)} must be unique, but g=${arrowLabel(category, g)} and h=${arrowLabel(category, h)} differ.`,
      }
    }

    const isoG = findIsoWitness(category, g)
    const isoH = findIsoWitness(category, h)
    if (!isoG || !isoH) {
      return {
        holds: false,
        detail: `Inverses should themselves be isomorphisms (g iso? ${!!isoG}, h iso? ${!!isoH}).`,
      }
    }

    return { holds: true }
  },

  closedUnderComposition<Obj, Arr>(
    category: FiniteCategory<Obj, Arr>,
    f: Arr,
    g: Arr,
  ): IsoAxiomResult<Arr> {
    const witnessF = findIsoWitness(category, f)
    const witnessG = findIsoWitness(category, g)
    if (!witnessF || !witnessG) {
      const missing = [
        witnessF ? undefined : `f ${arrowLabel(category, f)} is not an isomorphism`,
        witnessG ? undefined : `g ${arrowLabel(category, g)} is not an isomorphism`,
      ]
        .filter((entry): entry is string => entry !== undefined)
        .join("; ")
      return { holds: false, detail: missing }
    }

    const composite = category.compose(g, f)
    const expectedInverse = category.compose(witnessF.inverse, witnessG.inverse)
    const check = twoSidedCheck(category, composite, expectedInverse)
    if (check.leftOk && check.rightOk) {
      return { holds: true, witness: { forward: composite, inverse: expectedInverse } }
    }

    const compositeLabel = arrowLabel(category, composite)
    const expectedLabel = arrowLabel(category, expectedInverse)
    return {
      holds: false,
      detail: `Expected inverse for ${compositeLabel} to be ${expectedLabel}, but g∘f∘(f⁻¹∘g⁻¹)=${arrowLabel(category, check.fog)} and (f⁻¹∘g⁻¹)∘(g∘f)=${arrowLabel(category, check.gof)}.`,
    }
  },
}

export { findIsoWitness as isoWitness }
export { isIso } from "../kinds/iso"
