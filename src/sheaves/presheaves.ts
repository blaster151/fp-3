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

export interface Presheaf<Obj, Arr, Section> {
  readonly site: Site<Obj, Arr>
  readonly sections: (object: Obj) => ReadonlyArray<Section>
  readonly restrict: (arrow: Arr, section: Section) => Section
  readonly sectionEq?: Equality<Section>
  readonly label?: string
}

export interface PresheafCheckOptions<Obj, Arr> {
  readonly objectSamples?: ReadonlyArray<Obj>
  readonly arrowSamples?: ReadonlyArray<Arr>
  readonly sectionSampleLimit?: number
  readonly witnessLimit?: number
}

export type PresheafViolation<Obj, Arr, Section> =
  | {
      readonly kind: "identity"
      readonly object: Obj
      readonly section: Section
      readonly restricted: Section
    }
  | {
      readonly kind: "restrictionNotClosed"
      readonly arrow: Arr
      readonly section: Section
      readonly restricted: Section
    }
  | {
      readonly kind: "composition"
      readonly first: Arr
      readonly second: Arr
      readonly section: Section
      readonly sequential: Section
      readonly direct: Section
    }

export interface PresheafWitness<Obj, Arr, Section> {
  readonly violation: PresheafViolation<Obj, Arr, Section>
}

export interface PresheafCheckMetadata {
  readonly objectSampleCandidates: number
  readonly distinctObjectSamples: number
  readonly arrowSampleCandidates: number
  readonly distinctArrowSamples: number
  readonly sectionSampleLimit: number
  readonly restrictionChecks: number
  readonly identityChecks: number
  readonly compositionChecks: number
  readonly witnessesRecorded: number
  readonly witnessLimit: number
}

export interface PresheafCheckResult<Obj, Arr, Section> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<PresheafViolation<Obj, Arr, Section>>
  readonly witnesses: ReadonlyArray<PresheafWitness<Obj, Arr, Section>>
  readonly details: string
  readonly metadata: PresheafCheckMetadata
}

const collectCoveringArrows = <Obj, Arr>(
  site: Site<Obj, Arr>,
  objects: ReadonlyArray<Obj>,
): Arr[] => {
  const arrowEq = withEquality(site.arrowEq)
  const result: Arr[] = []
  for (const object of objects) {
    for (const covering of site.coverings(object)) {
      for (const arrow of covering.arrows) {
        if (!result.some(existing => arrowEq(existing, arrow))) {
          result.push(arrow)
        }
      }
    }
  }
  return result
}

const sampleSections = <Obj, Arr, Section>(
  presheaf: Presheaf<Obj, Arr, Section>,
  object: Obj,
  limit: number,
): Section[] => {
  const eq = withEquality(presheaf.sectionEq)
  const candidates = presheaf.sections(object).slice(0, limit)
  return dedupe(candidates, eq)
}

export interface PresheafSamplingPlan<Obj, Arr, Section> {
  readonly objects: ReadonlyArray<Obj>
  readonly arrows: ReadonlyArray<Arr>
  readonly objectSampleCandidates: number
  readonly arrowSampleCandidates: number
  readonly sectionSampleLimit: number
  readonly sampleSections: (object: Obj) => ReadonlyArray<Section>
}

export const buildPresheafSamplingPlan = <Obj, Arr, Section>(
  presheaf: Presheaf<Obj, Arr, Section>,
  options: PresheafCheckOptions<Obj, Arr> = {},
): PresheafSamplingPlan<Obj, Arr, Section> => {
  const objectSampleCandidates = options.objectSamples ?? []
  const objectEq = withEquality(presheaf.site.objectEq)
  const objects = dedupe(objectSampleCandidates, objectEq)
  const sectionSampleLimit = options.sectionSampleLimit ?? 5

  const coverageArrows = collectCoveringArrows(presheaf.site, objects)
  const arrowSampleCandidates = options.arrowSamples ?? coverageArrows
  const arrowEq = withEquality(presheaf.site.arrowEq)
  const arrows = dedupe(arrowSampleCandidates, arrowEq)

  return {
    objects,
    arrows,
    objectSampleCandidates: objectSampleCandidates.length,
    arrowSampleCandidates: arrowSampleCandidates.length,
    sectionSampleLimit,
    sampleSections: (object: Obj) => sampleSections(presheaf, object, sectionSampleLimit),
  }
}

export const checkPresheaf = <Obj, Arr, Section>(
  presheaf: Presheaf<Obj, Arr, Section>,
  options: PresheafCheckOptions<Obj, Arr> = {},
): PresheafCheckResult<Obj, Arr, Section> => {
  const plan = buildPresheafSamplingPlan(presheaf, options)
  const objects = plan.objects
  const arrows = plan.arrows
  const sectionSampleLimit = plan.sectionSampleLimit
  const witnessLimit = options.witnessLimit ?? 3

  const objectEq = withEquality(presheaf.site.objectEq)
  const violations: PresheafViolation<Obj, Arr, Section>[] = []
  const witnesses: PresheafWitness<Obj, Arr, Section>[] = []

  const category = presheaf.site.category
  const sectionEq = withEquality(presheaf.sectionEq)

  let restrictionChecks = 0
  for (const arrow of arrows) {
    const target = category.dst(arrow)
    const domain = category.src(arrow)
    const targetSections = plan.sampleSections(target)
    const domainSections = plan.sampleSections(domain)

    for (const section of targetSections) {
      restrictionChecks += 1
      const restricted = presheaf.restrict(arrow, section)
      if (!domainSections.some(existing => sectionEq(existing, restricted))) {
        const violation: PresheafViolation<Obj, Arr, Section> = {
          kind: "restrictionNotClosed",
          arrow,
          section,
          restricted,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ violation })
        }
      }
    }
  }

  let identityChecks = 0
  for (const object of objects) {
    const id = category.id(object)
    const sections = plan.sampleSections(object)
    for (const section of sections) {
      identityChecks += 1
      const restricted = presheaf.restrict(id, section)
      if (!sectionEq(section, restricted)) {
        const violation: PresheafViolation<Obj, Arr, Section> = {
          kind: "identity",
          object,
          section,
          restricted,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ violation })
        }
      }
    }
  }

  let compositionChecks = 0
  for (const first of arrows) {
    for (const second of arrows) {
      const intermediate = category.dst(first)
      const secondSource = category.src(second)
      if (!objectEq(intermediate, secondSource)) {
        continue
      }
      const composite = category.compose(second, first)
      const target = category.dst(second)
      const targetSections = plan.sampleSections(target)
      for (const section of targetSections) {
        compositionChecks += 1
        const sequential = presheaf.restrict(first, presheaf.restrict(second, section))
        const direct = presheaf.restrict(composite, section)
        if (!sectionEq(sequential, direct)) {
          const violation: PresheafViolation<Obj, Arr, Section> = {
            kind: "composition",
            first,
            second,
            section,
            sequential,
            direct,
          }
          violations.push(violation)
          if (witnesses.length < witnessLimit) {
            witnesses.push({ violation })
          }
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? presheaf.label
      ? `Presheaf ${presheaf.label} satisfies identity, restriction, and composition checks.`
      : "Presheaf satisfies identity, restriction, and composition checks."
    : `Presheaf${presheaf.label ? ` ${presheaf.label}` : ""} violates ${violations.length} sampled condition(s).`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      objectSampleCandidates: plan.objectSampleCandidates,
      distinctObjectSamples: objects.length,
      arrowSampleCandidates: plan.arrowSampleCandidates,
      distinctArrowSamples: arrows.length,
      sectionSampleLimit,
      restrictionChecks,
      identityChecks,
      compositionChecks,
      witnessesRecorded: witnesses.length,
      witnessLimit,
    },
  }
}

export interface MatchingFamilySection<Arr, Section> {
  readonly arrow: Arr
  readonly section: Section
}

export interface MatchingFamilyOverlap<Arr> {
  readonly leftIndex: number
  readonly rightIndex: number
  readonly leftRestriction: Arr
  readonly rightRestriction: Arr
}

export interface MatchingFamilySample<Obj, Arr, Section> {
  readonly covering: CoveringFamily<Obj, Arr>
  readonly assignments: ReadonlyArray<MatchingFamilySection<Arr, Section>>
  readonly overlaps: ReadonlyArray<MatchingFamilyOverlap<Arr>>
}
