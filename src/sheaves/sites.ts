import type { SimpleCat } from "../../simple-cat"
import type { PrimeSpectrum, PrimeSpectrumPoint } from "../schemes/prime-spectrum"

type Equality<A> = (left: A, right: A) => boolean

const withEquality = <A>(eq?: Equality<A>): Equality<A> => eq ?? ((left, right) => Object.is(left, right))

const dedupe = <A>(values: ReadonlyArray<A>, eq: Equality<A>): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

export interface CoveringFamily<Obj, Arr> {
  readonly site: Site<Obj, Arr>
  readonly target: Obj
  readonly arrows: ReadonlyArray<Arr>
  readonly label?: string
}

export interface Site<Obj, Arr> {
  readonly category: SimpleCat<Obj, Arr>
  readonly coverings: (object: Obj) => ReadonlyArray<CoveringFamily<Obj, Arr>>
  readonly objectEq?: Equality<Obj>
  readonly arrowEq?: Equality<Arr>
  readonly label?: string
}

export type CoveringViolation<Obj, Arr> =
  | { readonly kind: "empty" }
  | { readonly kind: "targetMismatch"; readonly arrow: Arr; readonly arrowTarget: Obj; readonly target: Obj }
  | { readonly kind: "duplicateArrow"; readonly arrow: Arr }

export interface CoveringWitness<Arr> {
  readonly arrow: Arr
}

export interface CoveringCheckOptions<Obj, Arr> {
  readonly enforceNonEmpty?: boolean
  readonly witnessLimit?: number
  readonly arrowSamples?: ReadonlyArray<Arr>
}

export interface CoveringCheckMetadata {
  readonly enforceNonEmpty: boolean
  readonly arrowCandidates: number
  readonly distinctArrows: number
  readonly witnessLimit: number
  readonly witnessesRecorded: number
}

export interface CoveringCheckResult<Obj, Arr> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<CoveringViolation<Obj, Arr>>
  readonly witnesses: ReadonlyArray<CoveringWitness<Arr>>
  readonly details: string
  readonly metadata: CoveringCheckMetadata
}

export interface ZariskiOpen<A> {
  readonly id: string
  readonly label?: string
  readonly points: ReadonlyArray<PrimeSpectrumPoint<A>>
  readonly generators: ReadonlyArray<A>
}

export interface ZariskiInclusion<A> {
  readonly id: string
  readonly from: ZariskiOpen<A>
  readonly to: ZariskiOpen<A>
  readonly label?: string
}

export interface ZariskiSite<A> extends Site<ZariskiOpen<A>, ZariskiInclusion<A>> {
  readonly opens: ReadonlyArray<ZariskiOpen<A>>
  readonly inclusions: ReadonlyArray<ZariskiInclusion<A>>
}

export const checkCoveringFamily = <Obj, Arr>(
  covering: CoveringFamily<Obj, Arr>,
  options: CoveringCheckOptions<Obj, Arr> = {},
): CoveringCheckResult<Obj, Arr> => {
  const arrowCandidates = options.arrowSamples ?? covering.arrows
  const target = covering.target

  const arrowEq = withEquality(covering.site.arrowEq)
  const objectEq = withEquality(covering.site.objectEq)

  const arrows = dedupe(arrowCandidates, arrowEq)
  const witnessLimit = options.witnessLimit ?? 3
  const witnesses: CoveringWitness<Arr>[] = []
  const violations: CoveringViolation<Obj, Arr>[] = []

  if (options.enforceNonEmpty ?? true) {
    if (arrows.length === 0) {
      violations.push({ kind: "empty" })
    }
  }

  const seen: Arr[] = []
  for (const arrow of arrows) {
    const arrowTarget = covering.site.category.dst(arrow)
    if (!objectEq(arrowTarget, target)) {
      violations.push({ kind: "targetMismatch", arrow, arrowTarget, target })
      if (witnesses.length < witnessLimit) {
        witnesses.push({ arrow })
      }
    }

    if (seen.some(existing => arrowEq(existing, arrow))) {
      violations.push({ kind: "duplicateArrow", arrow })
    } else {
      seen.push(arrow)
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? covering.label
      ? `Covering family ${covering.label} validates all sampled arrows.`
      : "Covering family validates all sampled arrows."
    : `Covering family${covering.label ? ` ${covering.label}` : ""} exhibits ${violations.length} violation(s).`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      enforceNonEmpty: options.enforceNonEmpty ?? true,
      arrowCandidates: arrowCandidates.length,
      distinctArrows: arrows.length,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

const haveSamePoints = <A>(
  left: ReadonlyArray<PrimeSpectrumPoint<A>>,
  right: ReadonlyArray<PrimeSpectrumPoint<A>>,
): boolean => {
  if (left.length !== right.length) {
    return false
  }
  const rightSet = new Set(right)
  return left.every(point => rightSet.has(point))
}

const pointsSubset = <A>(
  subset: ReadonlyArray<PrimeSpectrumPoint<A>>,
  superset: ReadonlyArray<PrimeSpectrumPoint<A>>,
): boolean => {
  if (subset.length > superset.length) {
    return false
  }
  const supersetSet = new Set(superset)
  return subset.every(point => supersetSet.has(point))
}

const pushUnique = <A>(values: A[], value: A, eq: Equality<A>): void => {
  if (!values.some(existing => eq(existing, value))) {
    values.push(value)
  }
}

interface MutableZariskiOpen<A> {
  readonly key: string
  id: string
  label?: string
  points: PrimeSpectrumPoint<A>[]
  generators: A[]
}

const buildPointKey = <A>(
  points: ReadonlyArray<PrimeSpectrumPoint<A>>,
  indices: ReadonlyMap<PrimeSpectrumPoint<A>, number>,
): string => {
  if (points.length === 0) {
    return "∅"
  }
  const ordered = points
    .map(point => indices.get(point) ?? -1)
    .sort((left, right) => left - right)
  return ordered.join(",")
}

const gatherElementSamples = <A>(spectrum: PrimeSpectrum<A>): A[] => {
  const eq = withEquality(spectrum.ring.eq)
  const samples: A[] = []
  pushUnique(samples, spectrum.ring.zero, eq)
  pushUnique(samples, spectrum.ring.one, eq)
  spectrum.points.forEach(point => point.samples?.forEach(sample => pushUnique(samples, sample, eq)))
  return samples
}

export const buildZariskiSiteFromSpectrum = <A>(spectrum: PrimeSpectrum<A>): ZariskiSite<A> => {
  const eq = withEquality(spectrum.ring.eq)
  const pointIndices = new Map<PrimeSpectrumPoint<A>, number>()
  spectrum.points.forEach((point, index) => pointIndices.set(point, index))

  const mutableOpens: MutableZariskiOpen<A>[] = []
  const openByKey = new Map<string, MutableZariskiOpen<A>>()
  const specKey = "Spec"
  const emptyKey = "∅"

  const specOpen: MutableZariskiOpen<A> = {
    key: specKey,
    id: "Spec",
    label: spectrum.label ? `Spec(${spectrum.label})` : "Spec",
    points: [...spectrum.points],
    generators: [],
  }
  mutableOpens.push(specOpen)
  openByKey.set(specKey, specOpen)

  const ensureOpen = (
    points: PrimeSpectrumPoint<A>[],
    generator?: A,
  ): MutableZariskiOpen<A> => {
    let key = buildPointKey(points, pointIndices)
    if (haveSamePoints(points, specOpen.points)) {
      key = specKey
    } else if (points.length === 0) {
      key = emptyKey
    }

    let open = openByKey.get(key)
    if (!open) {
      const label =
        key === specKey
          ? specOpen.label
          : key === emptyKey
          ? "∅"
          : undefined
      open = {
        key,
        id: key === specKey ? specOpen.id : key === emptyKey ? "∅" : `D${mutableOpens.length}`,
        ...(label === undefined ? {} : { label }),
        points: [...points],
        generators: [],
      }
      openByKey.set(key, open)
      mutableOpens.push(open)
    }

    if (generator !== undefined && !open.generators.some(existing => eq(existing, generator))) {
      open.generators.push(generator)
    }

    return open
  }

  ensureOpen([...spectrum.points])

  const elementSamples = gatherElementSamples(spectrum)
  elementSamples.forEach(element => {
    const points = spectrum.points.filter(point => !point.ideal.contains(element))
    ensureOpen(points, element)
  })

  if (!openByKey.has(emptyKey)) {
    const emptyOpen: MutableZariskiOpen<A> = {
      key: emptyKey,
      id: "∅",
      label: "∅",
      points: [],
      generators: [],
    }
    openByKey.set(emptyKey, emptyOpen)
    mutableOpens.push(emptyOpen)
  }

  const openById = new Map<string, ZariskiOpen<A>>()
  const opens: ZariskiOpen<A>[] = mutableOpens.map(open => {
    const frozen: ZariskiOpen<A> = {
      id: open.id,
      ...(open.label === undefined ? {} : { label: open.label }),
      points: [...open.points],
      generators: [...open.generators],
    }
    openById.set(open.id, frozen)
    return frozen
  })

  const inclusions: ZariskiInclusion<A>[] = []
  const arrowByKey = new Map<string, ZariskiInclusion<A>>()
  const inboundByTarget = new Map<string, ZariskiInclusion<A>[]>()

  opens.forEach(to => {
    opens.forEach(from => {
      if (from === to) {
        return
      }
      if (!pointsSubset(from.points, to.points)) {
        return
      }
      const key = `${from.id}->${to.id}`
      if (arrowByKey.has(key)) {
        return
      }
      const label = `${from.label ?? from.id} ⊆ ${to.label ?? to.id}`
      const arrow: ZariskiInclusion<A> = {
        id: `incl:${key}`,
        from,
        to,
        label,
      }
      arrowByKey.set(key, arrow)
      inclusions.push(arrow)
      const inbound = inboundByTarget.get(to.id)
      if (inbound) {
        inbound.push(arrow)
      } else {
        inboundByTarget.set(to.id, [arrow])
      }
    })
  })

  const objectEq = (left: ZariskiOpen<A>, right: ZariskiOpen<A>): boolean => left.id === right.id

  const category: SimpleCat<ZariskiOpen<A>, ZariskiInclusion<A>> = {
    id: (object) => {
      const canonical = openById.get(object.id) ?? object
      return {
        id: `id:${canonical.id}`,
        from: canonical,
        to: canonical,
        label: `id_${canonical.label ?? canonical.id}`,
      }
    },
    compose: (g, f) => {
      if (!objectEq(f.to, g.from)) {
        const composedLabel = g.label && f.label ? `${g.label} ∘ ${f.label}` : undefined
        return {
          id: `${f.id};${g.id}`,
          from: f.from,
          to: g.to,
          ...(composedLabel === undefined ? {} : { label: composedLabel }),
        }
      }
      const key = `${f.from.id}->${g.to.id}`
      const existing = arrowByKey.get(key)
      if (existing) {
        return existing
      }
      const label = `${f.from.label ?? f.from.id} ⊆ ${g.to.label ?? g.to.id}`
      const arrow: ZariskiInclusion<A> = {
        id: `incl:${key}`,
        from: f.from,
        to: g.to,
        label,
      }
      arrowByKey.set(key, arrow)
      inclusions.push(arrow)
      const inbound = inboundByTarget.get(g.to.id)
      if (inbound) {
        inbound.push(arrow)
      } else {
        inboundByTarget.set(g.to.id, [arrow])
      }
      return arrow
    },
    src: (arrow) => arrow.from,
    dst: (arrow) => arrow.to,
  }

  const site: ZariskiSite<A> = {
    category,
    coverings: (object) => {
      const canonical = openById.get(object.id)
      if (!canonical) {
        return []
      }
      const label = canonical.label ?? canonical.id
      const identityCover: CoveringFamily<ZariskiOpen<A>, ZariskiInclusion<A>> = {
        site,
        target: canonical,
        arrows: [category.id(canonical)],
        label: `${label} identity covering`,
      }
      const inbound = inboundByTarget.get(canonical.id) ?? []
      if (inbound.length === 0) {
        return [identityCover]
      }
      return [
        identityCover,
        {
          site,
          target: canonical,
          arrows: [...inbound],
          label: `${label} canonical covering`,
        },
      ]
    },
    objectEq,
    arrowEq: (left, right) => left.id === right.id,
    label: spectrum.label ? `Zariski site of ${spectrum.label}` : "Zariski site",
    opens,
    inclusions,
  }

  return site
}
