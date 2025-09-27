import type { FinSetName, FuncArr } from "../models/finset-cat"
import { isSurjective } from "../models/finset-cat"

export interface NonEpiWitness {
  readonly missingElement: string
  readonly codomain: { readonly name: FinSetName; readonly elems: readonly string[] }
  readonly g: FuncArr
  readonly h: FuncArr
}

const requireCarrier = (
  universe: Record<FinSetName, readonly string[]>,
  name: FinSetName,
): readonly string[] => {
  const carrier = universe[name]
  if (!carrier) {
    throw new Error(`FinSet non-epi witness: unknown carrier ${name}`)
  }
  return carrier
}

const imageOf = (
  universe: Record<FinSetName, readonly string[]>,
  arrow: FuncArr,
): Set<string> => {
  const elems = requireCarrier(universe, arrow.dom)
  const hits = new Set<string>()
  for (const element of elems) {
    hits.add(arrow.map(element))
  }
  return hits
}

const makeWitnessCodomainName = (arrow: FuncArr): FinSetName => `${arrow.cod}__epiWitness_${arrow.name}`

export function nonEpiWitnessInSet(
  universe: Record<FinSetName, readonly string[]>,
  arrow: FuncArr,
): NonEpiWitness | null {
  if (isSurjective(universe, arrow)) return null

  const codomainCarrier = requireCarrier(universe, arrow.cod)
  const image = imageOf(universe, arrow)
  const missing = codomainCarrier.find((element) => !image.has(element))
  if (!missing) return null

  const witnessCodomainName = makeWitnessCodomainName(arrow)
  const witnessCodomain = { name: witnessCodomainName, elems: ["0", "1"] as const }

  const g: FuncArr = {
    name: `const_${arrow.name}`,
    dom: arrow.cod,
    cod: witnessCodomainName,
    map: () => "0",
  }

  const h: FuncArr = {
    name: `mask_${arrow.name}`,
    dom: arrow.cod,
    cod: witnessCodomainName,
    map: (d) => (image.has(d) ? "0" : "1"),
  }

  return {
    missingElement: missing,
    codomain: witnessCodomain,
    g,
    h,
  }
}
