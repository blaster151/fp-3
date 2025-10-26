import { checkRingHomomorphism } from "../algebra/ring/structures"
import type { Ring, RingHomomorphism } from "../algebra/ring/structures"
import type { CoveringFamily, Site } from "./sites"

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

export interface GrothendieckTopology<Obj, Arr> {
  readonly site: Site<Obj, Arr>
  readonly coverings: (object: Obj) => ReadonlyArray<CoveringFamily<Obj, Arr>>
  readonly label?: string
}

export interface IdentitySample<Obj> {
  readonly object: Obj
  readonly label?: string
}

export interface PullbackLift<Arr> {
  readonly original: Arr
  readonly lift: Arr
}

export interface PullbackSample<Obj, Arr> {
  readonly arrow: Arr
  readonly covering: CoveringFamily<Obj, Arr>
  readonly pullback: CoveringFamily<Obj, Arr>
  readonly lifts: ReadonlyArray<PullbackLift<Arr>>
  readonly label?: string
}

export interface RefinementComposite<Arr> {
  readonly refined: Arr
  readonly composite: Arr
}

export interface RefinementSample<Obj, Arr> {
  readonly original: Arr
  readonly covering: CoveringFamily<Obj, Arr>
  readonly composites: ReadonlyArray<RefinementComposite<Arr>>
}

export interface TransitivitySample<Obj, Arr> {
  readonly covering: CoveringFamily<Obj, Arr>
  readonly refinements: ReadonlyArray<RefinementSample<Obj, Arr>>
  readonly composite: CoveringFamily<Obj, Arr>
  readonly label?: string
}

export type GrothendieckTopologyViolation<Obj, Arr> =
  | { readonly kind: "identityMissing"; readonly sample: IdentitySample<Obj> }
  | { readonly kind: "pullbackTargetMismatch"; readonly sample: PullbackSample<Obj, Arr>; readonly expected: Obj; readonly actual: Obj }
  | { readonly kind: "pullbackLiftMissing"; readonly sample: PullbackSample<Obj, Arr>; readonly original: Arr }
  | { readonly kind: "pullbackCompositionMismatch";
      readonly sample: PullbackSample<Obj, Arr>;
      readonly original: Arr;
      readonly lift: Arr;
      readonly composite: Arr }
  | { readonly kind: "transitivityTargetMismatch"; readonly sample: TransitivitySample<Obj, Arr>; readonly expected: Obj; readonly actual: Obj }
  | { readonly kind: "transitivityOriginalMissing"; readonly sample: TransitivitySample<Obj, Arr>; readonly original: Arr }
  | { readonly kind: "transitivityRefinementTargetMismatch";
      readonly sample: TransitivitySample<Obj, Arr>;
      readonly original: Arr;
      readonly expected: Obj;
      readonly actual: Obj }
  | { readonly kind: "transitivityRefinementMissing";
      readonly sample: TransitivitySample<Obj, Arr>;
      readonly original: Arr;
      readonly refined: Arr }
  | { readonly kind: "transitivityCompositeMissing";
      readonly sample: TransitivitySample<Obj, Arr>;
      readonly original: Arr;
      readonly refined: Arr;
      readonly composite: Arr }
  | { readonly kind: "transitivityCompositionMismatch";
      readonly sample: TransitivitySample<Obj, Arr>;
      readonly original: Arr;
      readonly refined: Arr;
      readonly composite: Arr }

export interface GrothendieckTopologyWitness<Arr> {
  readonly relation: string
  readonly arrow: Arr
  readonly auxiliary?: Arr
}

export interface GrothendieckTopologyCheckOptions<Obj, Arr> {
  readonly identitySamples?: ReadonlyArray<IdentitySample<Obj>>
  readonly pullbackSamples?: ReadonlyArray<PullbackSample<Obj, Arr>>
  readonly transitivitySamples?: ReadonlyArray<TransitivitySample<Obj, Arr>>
  readonly witnessLimit?: number
}

export interface GrothendieckTopologyCheckMetadata {
  readonly identitiesTested: number
  readonly pullbackSamples: number
  readonly pullbackComparisons: number
  readonly transitivitySamples: number
  readonly transitivityComparisons: number
  readonly witnessLimit: number
  readonly witnessesRecorded: number
}

export interface GrothendieckTopologyCheckResult<Obj, Arr> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<GrothendieckTopologyViolation<Obj, Arr>>
  readonly witnesses: ReadonlyArray<GrothendieckTopologyWitness<Arr>>
  readonly details: string
  readonly metadata: GrothendieckTopologyCheckMetadata
}

export const checkGrothendieckTopology = <Obj, Arr>(
  topology: GrothendieckTopology<Obj, Arr>,
  options: GrothendieckTopologyCheckOptions<Obj, Arr> = {},
): GrothendieckTopologyCheckResult<Obj, Arr> => {
  const site = topology.site
  const arrowEq = withEquality(site.arrowEq)
  const objectEq = withEquality(site.objectEq)
  const identitySamples = options.identitySamples ?? []
  const pullbackSamples = options.pullbackSamples ?? []
  const transitivitySamples = options.transitivitySamples ?? []
  const witnessLimit = options.witnessLimit ?? 8

  const violations: GrothendieckTopologyViolation<Obj, Arr>[] = []
  const witnesses: GrothendieckTopologyWitness<Arr>[] = []

  let pullbackComparisons = 0
  let transitivityComparisons = 0

  for (const sample of identitySamples) {
    const identity = site.category.id(sample.object)
    const coverings = topology.coverings(sample.object)
    const hasIdentity = coverings.some(covering => covering.arrows.some(arrow => arrowEq(arrow, identity)))
    if (!hasIdentity) {
      violations.push({ kind: "identityMissing", sample })
    } else if (witnesses.length < witnessLimit) {
      witnesses.push({ relation: "identity", arrow: identity })
    }
  }

  for (const sample of pullbackSamples) {
    const expectedTarget = site.category.src(sample.arrow)
    if (!objectEq(sample.pullback.target, expectedTarget)) {
      violations.push({ kind: "pullbackTargetMismatch", sample, expected: expectedTarget, actual: sample.pullback.target })
      continue
    }

    for (const lift of sample.lifts) {
      pullbackComparisons += 1
      const liftPresent = sample.pullback.arrows.some(candidate => arrowEq(candidate, lift.lift))
      if (!liftPresent) {
        violations.push({ kind: "pullbackLiftMissing", sample, original: lift.original })
        continue
      }

      const composite = site.category.compose(sample.arrow, lift.lift)
      if (!arrowEq(composite, lift.original)) {
        violations.push({ kind: "pullbackCompositionMismatch", sample, original: lift.original, lift: lift.lift, composite })
      } else if (witnesses.length < witnessLimit) {
        witnesses.push({ relation: "pullback", arrow: lift.original, auxiliary: lift.lift })
      }
    }
  }

  for (const sample of transitivitySamples) {
    if (!objectEq(sample.composite.target, sample.covering.target)) {
      violations.push({
        kind: "transitivityTargetMismatch",
        sample,
        expected: sample.covering.target,
        actual: sample.composite.target,
      })
      continue
    }

    for (const refinement of sample.refinements) {
      const originalPresent = sample.covering.arrows.some(arrow => arrowEq(arrow, refinement.original))
      if (!originalPresent) {
        violations.push({ kind: "transitivityOriginalMissing", sample, original: refinement.original })
        continue
      }

      const expectedDomain = site.category.src(refinement.original)
      if (!objectEq(refinement.covering.target, expectedDomain)) {
        violations.push({
          kind: "transitivityRefinementTargetMismatch",
          sample,
          original: refinement.original,
          expected: expectedDomain,
          actual: refinement.covering.target,
        })
        continue
      }

      for (const composition of refinement.composites) {
        transitivityComparisons += 1

        const refinedPresent = refinement.covering.arrows.some(arrow => arrowEq(arrow, composition.refined))
        if (!refinedPresent) {
          violations.push({ kind: "transitivityRefinementMissing", sample, original: refinement.original, refined: composition.refined })
          continue
        }

        const compositePresent = sample.composite.arrows.some(arrow => arrowEq(arrow, composition.composite))
        if (!compositePresent) {
          violations.push({
            kind: "transitivityCompositeMissing",
            sample,
            original: refinement.original,
            refined: composition.refined,
            composite: composition.composite,
          })
          continue
        }

        const compositeArrow = site.category.compose(refinement.original, composition.refined)
        if (!arrowEq(compositeArrow, composition.composite)) {
          violations.push({
            kind: "transitivityCompositionMismatch",
            sample,
            original: refinement.original,
            refined: composition.refined,
            composite: composition.composite,
          })
        } else if (witnesses.length < witnessLimit) {
          witnesses.push({ relation: "transitivity", arrow: composition.composite, auxiliary: composition.refined })
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? topology.label
      ? `Grothendieck topology ${topology.label} satisfies sampled axioms.`
      : "Grothendieck topology satisfies sampled axioms."
    : `${violations.length} Grothendieck topology violation(s) detected.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      identitiesTested: identitySamples.length,
      pullbackSamples: pullbackSamples.length,
      pullbackComparisons,
      transitivitySamples: transitivitySamples.length,
      transitivityComparisons,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

export interface PrincipalOpenCover<A> {
  readonly ring: Ring<A>
  readonly generators: ReadonlyArray<A>
  readonly label?: string
}

export interface PrincipalOpenWitness<A> {
  readonly coefficients: ReadonlyArray<A>
}

export type PrincipalOpenViolation<A> =
  | { readonly kind: "emptyGenerators" }
  | { readonly kind: "unitIdealNotWitnessed"; readonly attempts: number }

export interface PrincipalOpenCoverOptions<A> {
  readonly coefficientSamples?: ReadonlyArray<A>
  readonly witnessLimit?: number
}

export interface PrincipalOpenCoverResult<A> {
  readonly holds: boolean
  readonly witnesses: ReadonlyArray<PrincipalOpenWitness<A>>
  readonly violations: ReadonlyArray<PrincipalOpenViolation<A>>
  readonly details: string
  readonly metadata: {
    readonly generatorCount: number
    readonly coefficientSamples: number
    readonly combinationsTested: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

const enumerateCoefficientTuples = <A>(
  generators: ReadonlyArray<A>,
  coefficients: ReadonlyArray<A>,
  limit: number,
): A[][] => {
  const tuples: A[][] = []
  const tuple: A[] = new Array(generators.length)

  const helper = (index: number) => {
    if (tuples.length >= limit) {
      return
    }
    if (index === generators.length) {
      tuples.push([...tuple])
      return
    }
    for (const coefficient of coefficients) {
      tuple[index] = coefficient
      helper(index + 1)
      if (tuples.length >= limit) {
        break
      }
    }
  }

  helper(0)
  return tuples
}

export const checkZariskiPrincipalOpenCover = <A>(
  cover: PrincipalOpenCover<A>,
  options: PrincipalOpenCoverOptions<A> = {},
): PrincipalOpenCoverResult<A> => {
  const eq = withEquality(cover.ring.eq)
  const generators = dedupe(cover.generators, eq)
  const witnessLimit = options.witnessLimit ?? 4
  const coefficientBase = options.coefficientSamples ?? []
  const coefficientPool = dedupe([cover.ring.zero, cover.ring.one, ...coefficientBase], eq)

  if (generators.length === 0) {
    return {
      holds: false,
      witnesses: [],
      violations: [{ kind: "emptyGenerators" }],
      details: "Zariski cover requires at least one generator.",
      metadata: {
        generatorCount: 0,
        coefficientSamples: coefficientPool.length,
        combinationsTested: 0,
        witnessLimit,
        witnessesRecorded: 0,
      },
    }
  }

  const limit = Math.min(4096, Math.pow(coefficientPool.length, generators.length))
  const tuples = enumerateCoefficientTuples(generators, coefficientPool, limit)
  const witnesses: PrincipalOpenWitness<A>[] = []

  let combinationsTested = 0
  for (const coefficients of tuples) {
    combinationsTested += 1
    let sum = cover.ring.zero
    for (let index = 0; index < generators.length; index += 1) {
      const term = cover.ring.mul(coefficients[index], generators[index])
      sum = cover.ring.add(sum, term)
    }
    if (eq(sum, cover.ring.one)) {
      if (witnesses.length < witnessLimit) {
        witnesses.push({ coefficients: [...coefficients] })
      }
      return {
        holds: true,
        witnesses,
        violations: [],
        details: cover.label
          ? `Principal open cover ${cover.label} generates the unit ideal.`
          : "Principal open cover generates the unit ideal.",
        metadata: {
          generatorCount: generators.length,
          coefficientSamples: coefficientPool.length,
          combinationsTested,
          witnessLimit,
          witnessesRecorded: witnesses.length,
        },
      }
    }
  }

  return {
    holds: false,
    witnesses,
    violations: [{ kind: "unitIdealNotWitnessed", attempts: combinationsTested }],
    details: cover.label
      ? `Unable to witness unit ideal for principal open cover ${cover.label}.`
      : "Unable to witness unit ideal for principal open cover.",
    metadata: {
      generatorCount: generators.length,
      coefficientSamples: coefficientPool.length,
      combinationsTested,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

export interface EtaleMap<Domain, Codomain> {
  readonly hom: RingHomomorphism<Domain, Codomain>
  readonly section?: (value: Codomain) => Domain
  readonly label?: string
}

export interface EtaleCover<Domain, Codomain> {
  readonly base: Ring<Domain>
  readonly maps: ReadonlyArray<EtaleMap<Domain, Codomain>>
  readonly label?: string
}

export type EtaleCoverViolation<Domain, Codomain> =
  | { readonly kind: "emptyCover" }
  | { readonly kind: "sourceMismatch"; readonly label?: string }
  | { readonly kind: "homomorphismViolation"; readonly label?: string; readonly details: string }
  | { readonly kind: "sectionMismatch"; readonly label?: string; readonly sample: Codomain; readonly mapped: Codomain }

export interface EtaleCoverWitness<Codomain> {
  readonly label?: string
  readonly sample: Codomain
}

export interface EtaleCoverOptions<Domain, Codomain> {
  readonly domainSamples?: ReadonlyArray<Domain>
  readonly sectionSamples?: ReadonlyArray<Codomain>
  readonly includeNegation?: boolean
  readonly witnessLimit?: number
}

export interface EtaleCoverResult<Domain, Codomain> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<EtaleCoverViolation<Domain, Codomain>>
  readonly witnesses: ReadonlyArray<EtaleCoverWitness<Codomain>>
  readonly details: string
  readonly metadata: {
    readonly mapCount: number
    readonly homomorphismsChecked: number
    readonly sectionSamples: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

export const checkEtaleCover = <Domain, Codomain>(
  cover: EtaleCover<Domain, Codomain>,
  options: EtaleCoverOptions<Domain, Codomain> = {},
): EtaleCoverResult<Domain, Codomain> => {
  const witnessLimit = options.witnessLimit ?? 6
  const domainSamples = options.domainSamples ?? []
  const sectionSamples = options.sectionSamples ?? []

  if (cover.maps.length === 0) {
    return {
      holds: false,
      violations: [{ kind: "emptyCover" }],
      witnesses: [],
      details: "Étale cover requires at least one morphism.",
      metadata: {
        mapCount: 0,
        homomorphismsChecked: 0,
        sectionSamples: sectionSamples.length,
        witnessLimit,
        witnessesRecorded: 0,
      },
    }
  }

  const violations: EtaleCoverViolation<Domain, Codomain>[] = []
  const witnesses: EtaleCoverWitness<Codomain>[] = []

  let homomorphismsChecked = 0

  for (const map of cover.maps) {
    if (map.hom.source !== cover.base) {
      violations.push({ kind: "sourceMismatch", label: map.label })
      continue
    }

    const evaluation = checkRingHomomorphism(map.hom, {
      samples: domainSamples,
      includeNegation: options.includeNegation,
    })
    homomorphismsChecked += 1

    if (!evaluation.holds) {
      violations.push({ kind: "homomorphismViolation", label: map.label, details: evaluation.details })
      continue
    }

    if (map.section) {
      const codomainEq = withEquality(map.hom.target.eq)
      for (const sample of sectionSamples) {
        const lifted = map.section(sample)
        const mapped = map.hom.map(lifted)
        if (!codomainEq(mapped, sample)) {
          violations.push({ kind: "sectionMismatch", label: map.label, sample, mapped })
        } else if (witnesses.length < witnessLimit) {
          witnesses.push({ label: map.label, sample })
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? cover.label
      ? `Étale cover ${cover.label} satisfies sampled checks.`
      : "Étale cover satisfies sampled checks."
    : `${violations.length} étale cover violation(s) detected.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      mapCount: cover.maps.length,
      homomorphismsChecked,
      sectionSamples: sectionSamples.length,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}
