import type { ArrowFamilies } from "../../../stdlib/arrow-families"
import type { Category } from "../../../stdlib/category"
import type { Ring, RingHomomorphism } from "./structures"

export type AnyRing = Ring<unknown>
export type AnyRingHom = RingHomomorphism<unknown, unknown>

type Equality<A> = (left: A, right: A) => boolean

const withEquality = <A>(ring: Ring<A>): Equality<A> => ring.eq ?? ((left, right) => Object.is(left, right))

const composeHom = <A, B, C>(
  g: RingHomomorphism<B, C>,
  f: RingHomomorphism<A, B>,
): RingHomomorphism<A, C> => {
  if (f.target !== g.source) {
    throw new Error(
      `RingCategory: attempted to compose homomorphisms with mismatched codomain and domain (${f.label ?? "f"} then ${g.label ?? "g"}).`,
    )
  }
  const composedLabel =
    f.label && g.label ? `${g.label} ∘ ${f.label}` : g.label ?? f.label

  return {
    source: f.source,
    target: g.target,
    map: (value: A) => g.map(f.map(value)),
    ...(composedLabel === undefined ? {} : { label: composedLabel }),
  }
}

interface CachedIdentity {
  readonly hom: AnyRingHom
  readonly eq: Equality<unknown>
}

const buildIdentityFactory = () => {
  const cache = new WeakMap<AnyRing, CachedIdentity>()
  let cachedCount = 0

  const identity = <A>(ring: Ring<A>): RingHomomorphism<A, A> => {
    const cached = cache.get(ring as AnyRing)
    if (cached) {
      return cached.hom as RingHomomorphism<A, A>
    }
    const idHom: RingHomomorphism<A, A> = {
      source: ring,
      target: ring,
      map: (value: A) => value,
      label: "id",
    }
    cache.set(ring as AnyRing, { hom: idHom as AnyRingHom, eq: withEquality(ring) as Equality<unknown> })
    cachedCount += 1
    return idHom
  }

  const isIdentity = (hom: AnyRingHom): boolean => {
    const cached = cache.get(hom.source as AnyRing)
    if (cached && cached.hom === hom) {
      return true
    }
    if (hom.source !== hom.target) {
      return false
    }
    const ring = hom.source as Ring<unknown>
    const eq = cached?.eq ?? withEquality(ring)
    const samples: unknown[] = [ring.zero, ring.one]
    for (const sample of samples) {
      if (!eq(hom.map(sample), sample)) {
        return false
      }
    }
    return true
  }

  const size = (): number => cachedCount

  return { identity, isIdentity, size }
}

export interface RingCategory
  extends Category<AnyRing, AnyRingHom>,
    ArrowFamilies.HasDomCod<AnyRing, AnyRingHom> {
  readonly id: <A>(ring: Ring<A>) => RingHomomorphism<A, A>
  readonly compose: <A, B, C>(
    g: RingHomomorphism<B, C>,
    f: RingHomomorphism<A, B>,
  ) => RingHomomorphism<A, C>
  readonly dom: (hom: AnyRingHom) => AnyRing
  readonly cod: (hom: AnyRingHom) => AnyRing
  readonly eq: (left: AnyRingHom, right: AnyRingHom) => boolean
  readonly equalMor: (left: AnyRingHom, right: AnyRingHom) => boolean
  readonly isId: (hom: AnyRingHom) => boolean
  readonly cacheSize: () => number
}

const createRingCategory = (): RingCategory => {
  const { identity, isIdentity, size } = buildIdentityFactory()

  const eqHom = (left: AnyRingHom, right: AnyRingHom): boolean =>
    left === right ||
    (left.source === right.source &&
      left.target === right.target &&
      (() => {
        const source = left.source as AnyRing
        const target = left.target as AnyRing
        const sourceSamples: unknown[] = [source.zero, source.one]
        const targetEq = withEquality(target)
        for (const sample of sourceSamples) {
          if (!targetEq(left.map(sample), right.map(sample))) {
            return false
          }
        }
        return true
      })())

  return {
    id: identity,
    compose: composeHom,
    dom: (hom) => hom.source as AnyRing,
    cod: (hom) => hom.target as AnyRing,
    eq: eqHom,
    equalMor: eqHom,
    isId: isIdentity,
    cacheSize: size,
  }
}

export const RingCategory: RingCategory = createRingCategory()

export const makeRingHomomorphism = <A, B>(
  source: Ring<A>,
  target: Ring<B>,
  map: (value: A) => B,
  label?: string,
): RingHomomorphism<A, B> => ({
  source,
  target,
  map,
  ...(label === undefined ? {} : { label }),
})

const dedupe = <A>(values: ReadonlyArray<A>, eq: Equality<A>): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

export type RingCategoryViolation =
  | {
      readonly kind: "identity"
      readonly ring: AnyRing
      readonly value: unknown
      readonly image: unknown
    }
  | {
      readonly kind: "unit"
      readonly direction: "left" | "right"
      readonly morphism: AnyRingHom
      readonly value: unknown
      readonly expected: unknown
      readonly actual: unknown
    }
  | {
      readonly kind: "associativity"
      readonly chain: readonly [AnyRingHom, AnyRingHom, AnyRingHom]
      readonly value: unknown
      readonly leftImage: unknown
      readonly rightImage: unknown
    }
  | { readonly kind: "identityRecognition"; readonly ring: AnyRing; readonly message: string }

export interface RingCategoryCheckOptions {
  readonly morphisms?: ReadonlyArray<AnyRingHom>
  readonly ringSamples?: ReadonlyArray<{ readonly ring: AnyRing; readonly samples?: ReadonlyArray<unknown> }>
}

export interface RingCategoryCheckResult {
  readonly holds: boolean
  readonly violations: ReadonlyArray<RingCategoryViolation>
  readonly details: string
  readonly metadata: {
    readonly ringsTested: number
    readonly morphismsTested: number
    readonly identityChecks: number
    readonly unitChecks: number
    readonly associativityChains: number
    readonly sampleEvaluations: number
  }
}

const registerSamples = (
  samples: Map<AnyRing, unknown[]>,
  ring: AnyRing,
  additional?: ReadonlyArray<unknown>,
): void => {
  const eq = withEquality(ring)
  const baseline = [ring.zero, ring.one]
  const current = samples.get(ring) ?? []
  const enriched = dedupe([...current, ...baseline, ...(additional ?? [])], eq)
  samples.set(ring, enriched)
}

const sampleValues = (samples: Map<AnyRing, unknown[]>, ring: AnyRing): ReadonlyArray<unknown> =>
  samples.get(ring) ?? [ring.zero, ring.one]

export const checkRingCategory = (options: RingCategoryCheckOptions = {}): RingCategoryCheckResult => {
  const morphisms = options.morphisms ?? []
  const ringSamples = new Map<AnyRing, unknown[]>()

  for (const entry of options.ringSamples ?? []) {
    registerSamples(ringSamples, entry.ring, entry.samples)
  }

  for (const morphism of morphisms) {
    registerSamples(ringSamples, morphism.source)
    registerSamples(ringSamples, morphism.target)
  }

  const violations: RingCategoryViolation[] = []
  let identityChecks = 0
  let unitChecks = 0
  let associativityChains = 0
  let sampleEvaluations = 0

  for (const [ring] of ringSamples) {
    const id = RingCategory.id(ring)
    if (!RingCategory.isId(id)) {
      violations.push({ kind: "identityRecognition", ring, message: "Expected identity morphism to be recognized." })
    }
    const eq = withEquality(ring)
    for (const value of sampleValues(ringSamples, ring)) {
      identityChecks += 1
      sampleEvaluations += 1
      const image = id.map(value)
      if (!eq(image, value)) {
        violations.push({ kind: "identity", ring, value, image })
      }
    }
  }

  for (const morphism of morphisms) {
    const sourceSamples = sampleValues(ringSamples, morphism.source)
    const targetEq = withEquality(morphism.target)
    const leftUnit = RingCategory.compose(morphism, RingCategory.id(morphism.source))
    const rightUnit = RingCategory.compose(RingCategory.id(morphism.target), morphism)

    for (const value of sourceSamples) {
      unitChecks += 2
      sampleEvaluations += 2

      const leftImage = leftUnit.map(value)
      const rightImage = rightUnit.map(value)
      const expected = morphism.map(value)

      if (!targetEq(leftImage, expected)) {
        violations.push({ kind: "unit", direction: "right", morphism, value, expected, actual: leftImage })
      }
      if (!targetEq(rightImage, expected)) {
        violations.push({ kind: "unit", direction: "left", morphism, value, expected, actual: rightImage })
      }
    }
  }

  for (const f of morphisms) {
    for (const g of morphisms) {
      if (f.target !== g.source) {
        continue
      }
      for (const h of morphisms) {
        if (g.target !== h.source) {
          continue
        }
        associativityChains += 1
        const leftAssoc = RingCategory.compose(h, RingCategory.compose(g, f))
        const rightAssoc = RingCategory.compose(RingCategory.compose(h, g), f)
        const eq = withEquality(h.target)
        for (const value of sampleValues(ringSamples, f.source)) {
          sampleEvaluations += 1
          const leftImage = leftAssoc.map(value)
          const rightImage = rightAssoc.map(value)
          if (!eq(leftImage, rightImage)) {
            violations.push({ kind: "associativity", chain: [f, g, h], value, leftImage, rightImage })
            break
          }
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `RingCategory laws validated on ${morphisms.length} morphisms with ${identityChecks} identity checks and ${associativityChains} associativity chains.`
    : `${violations.length} RingCategory law checks failed across ${morphisms.length} morphisms.`

  return {
    holds,
    violations,
    details,
    metadata: {
      ringsTested: ringSamples.size,
      morphismsTested: morphisms.length,
      identityChecks,
      unitChecks,
      associativityChains,
      sampleEvaluations,
    },
  }
}
