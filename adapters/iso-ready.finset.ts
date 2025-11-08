import type { FinSetCategory, FinSetName, FuncArr } from "../models/finset-cat"
import { FinSetCat } from "../models/finset-cat"

type CandidateProvider<Arr> = (arrow: Arr) => Arr[]

const inverseName = (name: unknown): string =>
  typeof name === "string" && name.length > 0 ? `${name}⁻¹` : "inverse"

export type IsoReadyFinSetCategory = FinSetCategory & {
  readonly candidatesToInvert: CandidateProvider<FuncArr>
}

export const makeIsoReadyFinSet = (
  universe: Record<FinSetName, readonly string[]>,
): IsoReadyFinSetCategory => {
  const base = FinSetCat(universe)
  const candidatesToInvert: CandidateProvider<FuncArr> = (arrow) => {
    if (!base.isInjective(arrow) || !base.isSurjective(arrow)) return []

    const domain = base.carrier(arrow.dom)
    const preimage: Record<string, string> = {}
    for (const element of domain) {
      const image = arrow.map(element)
      const previous = preimage[image]
      if (previous !== undefined && previous !== element) return []
      preimage[image] = element
    }

    const codomain = base.carrier(arrow.cod)
    if (codomain.some((value) => preimage[value] === undefined)) return []

    const candidate: FuncArr = {
      name: inverseName(arrow.name),
      dom: arrow.cod,
      cod: arrow.dom,
      map: (value: string) => {
        const mapped = preimage[value]
        if (mapped === undefined) {
          throw new Error(`IsoReadyFinSet: missing preimage for ${value}`)
        }
        return mapped
      },
    }

    return [candidate]
  }

  return { ...base, candidatesToInvert } satisfies IsoReadyFinSetCategory
}
