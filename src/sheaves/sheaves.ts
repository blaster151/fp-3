import type { MatchingFamilySample, MatchingFamilySection, Presheaf } from "./presheaves"
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
