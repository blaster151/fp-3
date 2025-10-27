import type { MatchingFamilySample, MatchingFamilySection, MatchingFamilyOverlap, Presheaf } from "./presheaves"
import type { GrothendieckTopology } from "./grothendieck-topologies"
import type { CoveringFamily } from "./sites"

type Equality<A> = (left: A, right: A) => boolean

const withEquality = <A>(eq?: Equality<A>): Equality<A> => eq ?? ((left, right) => Object.is(left, right))

export interface Sheaf<Obj, Arr, Section> extends Presheaf<Obj, Arr, Section> {
  readonly glue: (
    covering: CoveringFamily<Obj, Arr>,
    assignments: ReadonlyArray<MatchingFamilySection<Arr, Section>>,
  ) => { readonly exists: boolean; readonly section?: Section; readonly details?: string }
}

export interface SheafCheckOptions {
  readonly witnessLimit?: number
}

export type SheafViolation<Obj, Arr, Section> =
  | {
      readonly kind: "assignmentMismatch"
      readonly covering: CoveringFamily<Obj, Arr>
      readonly index: number
      readonly arrow: Arr
    }
  | {
      readonly kind: "overlapMismatch"
      readonly covering: CoveringFamily<Obj, Arr>
      readonly leftIndex: number
      readonly rightIndex: number
      readonly leftRestriction: Arr
      readonly rightRestriction: Arr
      readonly leftSection: Section
      readonly rightSection: Section
    }
  | {
      readonly kind: "gluingFailed"
      readonly covering: CoveringFamily<Obj, Arr>
      readonly details?: string
    }
  | {
      readonly kind: "restrictionMismatch"
      readonly covering: CoveringFamily<Obj, Arr>
      readonly index: number
      readonly arrow: Arr
    }

export interface SheafWitness<Obj, Arr, Section> {
  readonly sample: MatchingFamilySample<Obj, Arr, Section>
  readonly violation: SheafViolation<Obj, Arr, Section>
}

export interface SheafCheckMetadata {
  readonly samplesTested: number
  readonly overlapChecks: number
  readonly gluingChecks: number
  readonly restrictionChecks: number
  readonly witnessLimit: number
  readonly witnessesRecorded: number
}

export interface SheafCheckResult<Obj, Arr, Section> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<SheafViolation<Obj, Arr, Section>>
  readonly witnesses: ReadonlyArray<SheafWitness<Obj, Arr, Section>>
  readonly details: string
  readonly metadata: SheafCheckMetadata
}

export type MatchingFamilySectionEnumerator<Obj, Section> = (
  object: Obj,
) => ReadonlyArray<Section>

export interface MatchingFamilyGenerationOptions<Obj, Arr> {
  readonly objects?: ReadonlyArray<Obj>
  readonly coverings?: ReadonlyArray<CoveringFamily<Obj, Arr>>
  readonly sectionSampleLimit?: number
  readonly combinationLimit?: number
}

interface RefinementCandidate<Arr> {
  readonly index: number
  readonly restriction: Arr
  readonly composite: Arr
}

const collectRefinementCandidates = <Obj, Arr>(
  covering: CoveringFamily<Obj, Arr>,
  topology: GrothendieckTopology<Obj, Arr>,
): RefinementCandidate<Arr>[] => {
  const candidates: RefinementCandidate<Arr>[] = []
  const category = topology.site.category
  const arrowEq = withEquality(topology.site.arrowEq)

  covering.arrows.forEach((arrow, index) => {
    const domain = category.src(arrow)
    for (const refinement of topology.coverings(domain)) {
      for (const restriction of refinement.arrows) {
        const composite = category.compose(arrow, restriction)
        const duplicate = candidates.some(
          (candidate) =>
            candidate.index === index &&
            arrowEq(candidate.restriction, restriction) &&
            arrowEq(candidate.composite, composite),
        )
        if (!duplicate) {
          candidates.push({ index, restriction, composite })
        }
      }
    }
  })

  return candidates
}

const computeOverlaps = <Obj, Arr>(
  covering: CoveringFamily<Obj, Arr>,
  topology: GrothendieckTopology<Obj, Arr>,
): MatchingFamilyOverlap<Arr>[] => {
  const overlaps: MatchingFamilyOverlap<Arr>[] = []
  const arrowEq = withEquality(topology.site.arrowEq)
  const objectEq = withEquality(topology.site.objectEq)
  const category = topology.site.category

  const candidates = collectRefinementCandidates(covering, topology)

  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    const left = candidates[leftIndex]
    if (!left) {
      continue
    }
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
      const right = candidates[rightIndex]
      if (!right || left.index === right.index) {
        continue
      }
      if (!arrowEq(left.composite, right.composite)) {
        continue
      }

      const ordered =
        left.index < right.index
          ? {
              leftIndex: left.index,
              rightIndex: right.index,
              leftRestriction: left.restriction,
              rightRestriction: right.restriction,
            }
          : {
              leftIndex: right.index,
              rightIndex: left.index,
              leftRestriction: right.restriction,
              rightRestriction: left.restriction,
            }

      const exists = overlaps.some(
        (overlap) =>
          overlap.leftIndex === ordered.leftIndex &&
          overlap.rightIndex === ordered.rightIndex &&
          arrowEq(overlap.leftRestriction, ordered.leftRestriction) &&
          arrowEq(overlap.rightRestriction, ordered.rightRestriction),
      )
      if (!exists) {
        overlaps.push(ordered)
      }
    }
  }

  if (overlaps.length === 0) {
    for (let left = 0; left < covering.arrows.length; left += 1) {
      const leftArrow = covering.arrows[left]
      if (!leftArrow) {
        continue
      }
      const leftDomain = category.src(leftArrow)
      for (let right = left + 1; right < covering.arrows.length; right += 1) {
        const rightArrow = covering.arrows[right]
        if (!rightArrow) {
          continue
        }
        const rightDomain = category.src(rightArrow)
        if (!objectEq(leftDomain, rightDomain)) {
          continue
        }
        const restriction = category.id(leftDomain)
        const exists = overlaps.some(
          (overlap) =>
            overlap.leftIndex === left &&
            overlap.rightIndex === right &&
            arrowEq(overlap.leftRestriction, restriction) &&
            arrowEq(overlap.rightRestriction, restriction),
        )
        if (!exists) {
          overlaps.push({
            leftIndex: left,
            rightIndex: right,
            leftRestriction: restriction,
            rightRestriction: restriction,
          })
        }
      }
    }
  }

  return overlaps
}

const buildMatchingFamiliesFromTopology = <Obj, Arr, Section>(
  topology: GrothendieckTopology<Obj, Arr>,
  enumerateSections: MatchingFamilySectionEnumerator<Obj, Section>,
  options: MatchingFamilyGenerationOptions<Obj, Arr> = {},
): MatchingFamilySample<Obj, Arr, Section>[] => {
  const sectionLimit = options.sectionSampleLimit ?? 3
  const combinationLimit = options.combinationLimit ?? 8
  const category = topology.site.category

  const coverings =
    options.coverings ??
    (options.objects ?? []).flatMap((object) => topology.coverings(object))

  const samples: MatchingFamilySample<Obj, Arr, Section>[] = []

  for (const covering of coverings) {
    if (!covering || covering.arrows.length === 0) {
      continue
    }

    const sectionChoices = covering.arrows.map((arrow) => {
      const domain = category.src(arrow)
      const sections = enumerateSections(domain)
      return sections.slice(0, sectionLimit)
    })

    if (sectionChoices.some((choices) => choices.length === 0)) {
      continue
    }

    const overlaps = computeOverlaps(covering, topology)
    const assignmentBuffer: Array<MatchingFamilySection<Arr, Section> | undefined> = new Array(
      covering.arrows.length,
    )
    const coveringSamples: MatchingFamilySample<Obj, Arr, Section>[] = []

    const buildAssignments = (index: number) => {
      if (coveringSamples.length >= combinationLimit) {
        return
      }
      if (index === covering.arrows.length) {
        coveringSamples.push({
          covering,
          assignments: assignmentBuffer.map((assignment, assignmentIndex) => {
            if (!assignment) {
              return { arrow: covering.arrows[assignmentIndex]!, section: sectionChoices[assignmentIndex]![0]! }
            }
            return { ...assignment }
          }),
          overlaps,
        })
        return
      }

      const arrow = covering.arrows[index]
      const choices = sectionChoices[index]
      if (!arrow || !choices || choices.length === 0) {
        return
      }
      for (const section of choices) {
        assignmentBuffer[index] = { arrow, section }
        buildAssignments(index + 1)
        if (coveringSamples.length >= combinationLimit) {
          break
        }
      }
    }

    buildAssignments(0)
    samples.push(...coveringSamples)
  }

  return samples
}

export const buildMatchingFamily = <Obj, Arr, Section>(
  topology: GrothendieckTopology<Obj, Arr>,
  enumerateSections: MatchingFamilySectionEnumerator<Obj, Section>,
  options: MatchingFamilyGenerationOptions<Obj, Arr> = {},
): ReadonlyArray<MatchingFamilySample<Obj, Arr, Section>> =>
  buildMatchingFamiliesFromTopology(topology, enumerateSections, options)

export const buildZariskiMatchingFamily = <Obj, Arr, Section>(
  topology: GrothendieckTopology<Obj, Arr>,
  enumerateSections: MatchingFamilySectionEnumerator<Obj, Section>,
  options: MatchingFamilyGenerationOptions<Obj, Arr> = {},
): ReadonlyArray<MatchingFamilySample<Obj, Arr, Section>> =>
  buildMatchingFamily(topology, enumerateSections, options)

export const buildEtaleMatchingFamily = <Obj, Arr, Section>(
  topology: GrothendieckTopology<Obj, Arr>,
  enumerateSections: MatchingFamilySectionEnumerator<Obj, Section>,
  options: MatchingFamilyGenerationOptions<Obj, Arr> = {},
): ReadonlyArray<MatchingFamilySample<Obj, Arr, Section>> =>
  buildMatchingFamily(topology, enumerateSections, options)

export const checkSheafGluing = <Obj, Arr, Section>(
  sheaf: Sheaf<Obj, Arr, Section>,
  samples: ReadonlyArray<MatchingFamilySample<Obj, Arr, Section>>,
  options: SheafCheckOptions = {},
): SheafCheckResult<Obj, Arr, Section> => {
  const witnessLimit = options.witnessLimit ?? 2
  const sectionEq = withEquality(sheaf.sectionEq)
  const arrowEq = withEquality(sheaf.site.arrowEq)

  const violations: SheafViolation<Obj, Arr, Section>[] = []
  const witnesses: SheafWitness<Obj, Arr, Section>[] = []

  let overlapChecks = 0
  let gluingChecks = 0
  let restrictionChecks = 0

  for (const sample of samples) {
    const covering = sample.covering
    const assignments = sample.assignments
    const violationBaseline = violations.length

    for (const [index, arrow] of covering.arrows.entries()) {
      const assignment = assignments[index]
      if (!assignment || !arrowEq(assignment.arrow, arrow)) {
        const violation: SheafViolation<Obj, Arr, Section> = {
          kind: "assignmentMismatch",
          covering,
          index,
          arrow,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ sample, violation })
        }
      }
    }

    for (const overlap of sample.overlaps) {
      overlapChecks += 1
      const leftAssignment = assignments[overlap.leftIndex]
      const rightAssignment = assignments[overlap.rightIndex]
      if (!leftAssignment || !rightAssignment) {
        continue
      }
      const leftSection = sheaf.restrict(overlap.leftRestriction, leftAssignment.section)
      const rightSection = sheaf.restrict(overlap.rightRestriction, rightAssignment.section)
      if (!sectionEq(leftSection, rightSection)) {
        const violation: SheafViolation<Obj, Arr, Section> = {
          kind: "overlapMismatch",
          covering,
          leftIndex: overlap.leftIndex,
          rightIndex: overlap.rightIndex,
          leftRestriction: overlap.leftRestriction,
          rightRestriction: overlap.rightRestriction,
          leftSection,
          rightSection,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ sample, violation })
        }
      }
    }

    if (violations.length > violationBaseline) {
      continue
    }

    gluingChecks += 1
    const gluing = sheaf.glue(covering, assignments)
    if (!gluing.exists || !gluing.section) {
      const violation: SheafViolation<Obj, Arr, Section> = {
        kind: "gluingFailed",
        covering,
        ...(gluing.details === undefined ? {} : { details: gluing.details }),
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ sample, violation })
      }
      continue
    }

    for (const [index, arrow] of covering.arrows.entries()) {
      restrictionChecks += 1
      const assignment = assignments[index]
      if (!assignment) {
        continue
      }
      const restricted = sheaf.restrict(arrow, gluing.section)
      if (!sectionEq(restricted, assignment.section)) {
        const violation: SheafViolation<Obj, Arr, Section> = {
          kind: "restrictionMismatch",
          covering,
          index,
          arrow,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ sample, violation })
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? sheaf.label
      ? `Sheaf ${sheaf.label} satisfied all provided gluing samples.`
      : "Sheaf satisfied all provided gluing samples."
    : `Sheaf${sheaf.label ? ` ${sheaf.label}` : ""} failed ${violations.length} gluing check(s).`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      samplesTested: samples.length,
      overlapChecks,
      gluingChecks,
      restrictionChecks,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}
