import type { FinSetCategory, FinSetName, FuncArr } from "../models/finset-cat"
import { FinSetCat } from "../models/finset-cat"
import type { FinPosCategory, FinPosObj, MonoMap } from "../models/finpos-cat"
import { FinPosCat, FinPos } from "../models/finpos-cat"
import type { FinGrpCategory, FinGrpObj, Hom } from "../models/fingroup-cat"
import { FinGrpCat, FinGrp } from "../models/fingroup-cat"

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

export type IsoReadyFinPosCategory = FinPosCategory & {
  readonly candidatesToInvert: CandidateProvider<MonoMap>
}

export const makeIsoReadyFinPos = (
  objects: readonly FinPosObj[],
): IsoReadyFinPosCategory => {
  const base = FinPosCat(objects)
  const candidatesToInvert: CandidateProvider<MonoMap> = (arrow) => {
    const dom = base.lookup(arrow.dom)
    const cod = base.lookup(arrow.cod)

    if (!FinPos.isMonotone(dom, cod, arrow)) return []
    if (!FinPos.injective(dom, cod, arrow) || !FinPos.surjective(dom, cod, arrow)) return []

    const inverseTable: Record<string, string> = {}
    for (const element of dom.elems) {
      const image = arrow.map(element)
      const previous = inverseTable[image]
      if (previous !== undefined && previous !== element) return []
      inverseTable[image] = element
    }

    if (cod.elems.some((value) => inverseTable[value] === undefined)) return []

    const candidate: MonoMap = {
      name: inverseName(arrow.name),
      dom: arrow.cod,
      cod: arrow.dom,
      map: (value: string) => {
        const mapped = inverseTable[value]
        if (mapped === undefined) {
          throw new Error(`IsoReadyFinPos: missing preimage for ${value}`)
        }
        return mapped
      },
    }

    if (!FinPos.isMonotone(cod, dom, candidate)) return []

    return [candidate]
  }

  return { ...base, candidatesToInvert } satisfies IsoReadyFinPosCategory
}

export type IsoReadyFinGrpCategory = FinGrpCategory & {
  readonly candidatesToInvert: CandidateProvider<Hom>
}

export const makeIsoReadyFinGrp = (
  objects: readonly FinGrpObj[],
): IsoReadyFinGrpCategory => {
  const base = FinGrpCat(objects)
  const candidatesToInvert: CandidateProvider<Hom> = (arrow) => {
    const dom = base.lookup(arrow.dom)
    const cod = base.lookup(arrow.cod)

    if (!base.isHom(arrow)) return []
    if (!base.isInjective(arrow) || !base.isSurjective(arrow)) return []

    const inverseTable: Record<string, string> = {}
    for (const element of dom.elems) {
      const image = arrow.map(element)
      const previous = inverseTable[image]
      if (previous !== undefined && previous !== element) return []
      inverseTable[image] = element
    }

    if (cod.elems.some((value) => inverseTable[value] === undefined)) return []

    const candidate: Hom = {
      name: inverseName(arrow.name),
      dom: arrow.cod,
      cod: arrow.dom,
      map: (value: string) => {
        const mapped = inverseTable[value]
        if (mapped === undefined) {
          throw new Error(`IsoReadyFinGrp: missing preimage for ${value}`)
        }
        return mapped
      },
    }

    if (!FinGrp.isHom(cod, dom, candidate)) return []

    return [candidate]
  }

  return { ...base, candidatesToInvert } satisfies IsoReadyFinGrpCategory
}

export { FinPos, FinGrp }
