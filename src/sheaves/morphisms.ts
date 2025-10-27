import type {
  MatchingFamilySample,
  MatchingFamilySection,
  Presheaf,
  PresheafCheckOptions,
  PresheafCheckResult,
  PresheafViolation,
} from "./presheaves"
import {
  buildPresheafSamplingPlan,
  checkPresheaf,
} from "./presheaves"
import type {
  Sheaf,
  SheafCheckOptions,
  SheafCheckResult,
  SheafViolation,
} from "./sheaves"
import { checkSheafGluing } from "./sheaves"
import type { CoveringFamily } from "./sites"

type Equality<A> = (left: A, right: A) => boolean

const withEquality = <A>(eq?: Equality<A>): Equality<A> => eq ?? ((left, right) => Object.is(left, right))

export interface PresheafMorphism<Obj, Arr, SourceSection, TargetSection> {
  readonly source: Presheaf<Obj, Arr, SourceSection>
  readonly target: Presheaf<Obj, Arr, TargetSection>
  readonly map: (object: Obj, section: SourceSection) => TargetSection
  readonly label?: string
}

export interface PresheafMorphismCheckOptions<Obj, Arr> extends PresheafCheckOptions<Obj, Arr> {}

export type PresheafMorphismViolation<Obj, Arr, SourceSection, TargetSection> =
  | {
      readonly kind: "sourcePresheafViolation"
      readonly violation: PresheafViolation<Obj, Arr, SourceSection>
    }
  | {
      readonly kind: "targetPresheafViolation"
      readonly violation: PresheafViolation<Obj, Arr, TargetSection>
    }
  | {
      readonly kind: "siteMismatch"
      readonly sourceLabel?: string
      readonly targetLabel?: string
    }
  | {
      readonly kind: "naturality"
      readonly arrow: Arr
      readonly sourceSection: SourceSection
      readonly restrictedSource: SourceSection
      readonly mappedThenRestrict: TargetSection
      readonly restrictThenMap: TargetSection
    }

export interface PresheafMorphismWitness<Obj, Arr, SourceSection, TargetSection> {
  readonly violation: PresheafMorphismViolation<Obj, Arr, SourceSection, TargetSection>
}

export interface PresheafMorphismCheckResult<Obj, Arr, SourceSection, TargetSection> {
  readonly holds: boolean
  readonly source: PresheafCheckResult<Obj, Arr, SourceSection>
  readonly target: PresheafCheckResult<Obj, Arr, TargetSection>
  readonly violations: ReadonlyArray<PresheafMorphismViolation<Obj, Arr, SourceSection, TargetSection>>
  readonly witnesses: ReadonlyArray<PresheafMorphismWitness<Obj, Arr, SourceSection, TargetSection>>
  readonly details: string
  readonly metadata: {
    readonly naturalityChecks: number
    readonly naturalityFailures: number
    readonly sampleObjects: number
    readonly sampleArrows: number
    readonly sectionSampleLimit: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

export const checkPresheafMorphism = <Obj, Arr, SourceSection, TargetSection>(
  morphism: PresheafMorphism<Obj, Arr, SourceSection, TargetSection>,
  options: PresheafMorphismCheckOptions<Obj, Arr> = {},
): PresheafMorphismCheckResult<Obj, Arr, SourceSection, TargetSection> => {
  const witnessLimit = options.witnessLimit ?? 3

  const sourceResult = checkPresheaf(morphism.source, options)
  const targetResult = checkPresheaf(morphism.target, options)

  const plan = buildPresheafSamplingPlan(morphism.source, options)
  const violations: PresheafMorphismViolation<Obj, Arr, SourceSection, TargetSection>[] = []
  sourceResult.violations.forEach((violation) => {
    violations.push({ kind: "sourcePresheafViolation", violation })
  })
  targetResult.violations.forEach((violation) => {
    violations.push({ kind: "targetPresheafViolation", violation })
  })
  const witnesses: PresheafMorphismWitness<Obj, Arr, SourceSection, TargetSection>[] = []

  const sameSite = morphism.source.site === morphism.target.site
  if (!sameSite) {
    const siteViolation: PresheafMorphismViolation<Obj, Arr, SourceSection, TargetSection> = {
      kind: "siteMismatch",
      ...(morphism.source.site.label ? { sourceLabel: morphism.source.site.label } : {}),
      ...(morphism.target.site.label ? { targetLabel: morphism.target.site.label } : {}),
    }
    violations.push(siteViolation)
  }

  let naturalityChecks = 0
  let naturalityFailures = 0

  if (sameSite) {
    const category = morphism.source.site.category
    const targetSectionEq = withEquality(morphism.target.sectionEq)

    for (const arrow of plan.arrows) {
      const codomain = category.dst(arrow)
      const domain = category.src(arrow)
      const sections = plan.sampleSections(codomain)
      for (const section of sections) {
        naturalityChecks += 1
        const mapped = morphism.map(codomain, section)
        const restrictedSource = morphism.source.restrict(arrow, section)
        const restrictThenMap = morphism.map(domain, restrictedSource)
        const mappedThenRestrict = morphism.target.restrict(arrow, mapped)
        if (!targetSectionEq(mappedThenRestrict, restrictThenMap)) {
          naturalityFailures += 1
          const violation: PresheafMorphismViolation<Obj, Arr, SourceSection, TargetSection> = {
            kind: "naturality",
            arrow,
            sourceSection: section,
            restrictedSource,
            mappedThenRestrict,
            restrictThenMap,
          }
          violations.push(violation)
          if (witnesses.length < witnessLimit) {
            witnesses.push({ violation })
          }
        }
      }
    }
  }

  const holds =
    sameSite &&
    naturalityFailures === 0 &&
    sourceResult.holds &&
    targetResult.holds &&
    violations.every((violation) => violation.kind !== "siteMismatch")

  const details = holds
    ? morphism.label
      ? `Presheaf morphism ${morphism.label} satisfied sampled naturality checks.`
      : "Presheaf morphism satisfied sampled naturality checks."
    : `Presheaf morphism${morphism.label ? ` ${morphism.label}` : ""} failed ${
        violations.length
      } sampled condition(s).`

  return {
    holds,
    source: sourceResult,
    target: targetResult,
    violations,
    witnesses,
    details,
    metadata: {
      naturalityChecks,
      naturalityFailures,
      sampleObjects: plan.objects.length,
      sampleArrows: plan.arrows.length,
      sectionSampleLimit: plan.sectionSampleLimit,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

export interface SheafMorphism<Obj, Arr, SourceSection, TargetSection>
  extends PresheafMorphism<Obj, Arr, SourceSection, TargetSection> {
  readonly source: Sheaf<Obj, Arr, SourceSection>
  readonly target: Sheaf<Obj, Arr, TargetSection>
}

export interface SheafMorphismCheckOptions<Obj, Arr> extends PresheafMorphismCheckOptions<Obj, Arr> {
  readonly sheaf?: SheafCheckOptions
}

export type SheafMorphismViolation<Obj, Arr, SourceSection, TargetSection> =
  | {
      readonly kind: "presheaf"
      readonly violation: PresheafMorphismViolation<Obj, Arr, SourceSection, TargetSection>
    }
  | {
      readonly kind: "sourceSheaf"
      readonly violation: SheafViolation<Obj, Arr, SourceSection>
    }
  | {
      readonly kind: "targetSheaf"
      readonly violation: SheafViolation<Obj, Arr, TargetSection>
    }
  | {
      readonly kind: "mappedGluingFailed"
      readonly index: number
      readonly covering: CoveringFamily<Obj, Arr>
      readonly mappedAssignments: ReadonlyArray<MatchingFamilySection<Arr, TargetSection>>
      readonly details?: string
    }
  | {
      readonly kind: "gluingIncompatible"
      readonly index: number
      readonly covering: CoveringFamily<Obj, Arr>
      readonly mappedAssignments: ReadonlyArray<MatchingFamilySection<Arr, TargetSection>>
      readonly mappedSourceGlue: TargetSection
      readonly targetGlue: TargetSection
    }

export interface SheafMorphismWitness<Obj, Arr, SourceSection, TargetSection> {
  readonly violation: SheafMorphismViolation<Obj, Arr, SourceSection, TargetSection>
  readonly mappedAssignments?: ReadonlyArray<MatchingFamilySection<Arr, TargetSection>>
  readonly sourceGlue?: SourceSection
  readonly targetGlue?: TargetSection
}

export interface SheafMorphismCheckResult<Obj, Arr, SourceSection, TargetSection> {
  readonly holds: boolean
  readonly presheaf: PresheafMorphismCheckResult<Obj, Arr, SourceSection, TargetSection>
  readonly sourceSheaf: SheafCheckResult<Obj, Arr, SourceSection>
  readonly targetSheaf: SheafCheckResult<Obj, Arr, TargetSection>
  readonly mappedSamples: ReadonlyArray<MatchingFamilySample<Obj, Arr, TargetSection>>
  readonly violations: ReadonlyArray<SheafMorphismViolation<Obj, Arr, SourceSection, TargetSection>>
  readonly witnesses: ReadonlyArray<SheafMorphismWitness<Obj, Arr, SourceSection, TargetSection>>
  readonly details: string
  readonly metadata: {
    readonly samplesTested: number
    readonly compatibilityChecks: number
    readonly compatibilityFailures: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

export const checkSheafMorphism = <Obj, Arr, SourceSection, TargetSection>(
  morphism: SheafMorphism<Obj, Arr, SourceSection, TargetSection>,
  samples: ReadonlyArray<MatchingFamilySample<Obj, Arr, SourceSection>>,
  options: SheafMorphismCheckOptions<Obj, Arr> = {},
): SheafMorphismCheckResult<Obj, Arr, SourceSection, TargetSection> => {
  const witnessLimit = options.witnessLimit ?? 3
  const sheafOptions = options.sheaf ?? {}

  const presheafResult = checkPresheafMorphism(morphism, options)
  const sourceSheafResult = checkSheafGluing(morphism.source, samples, sheafOptions)

  const mappedSamples: MatchingFamilySample<Obj, Arr, TargetSection>[] = []
  const violations: SheafMorphismViolation<Obj, Arr, SourceSection, TargetSection>[] = []
  presheafResult.violations.forEach((violation) => {
    violations.push({ kind: "presheaf", violation })
  })
  sourceSheafResult.violations.forEach((violation) => {
    violations.push({ kind: "sourceSheaf", violation })
  })
  const witnesses: SheafMorphismWitness<Obj, Arr, SourceSection, TargetSection>[] = []

  const sameSite = morphism.source.site === morphism.target.site
  const targetSectionEq = withEquality(morphism.target.sectionEq)
  const category = morphism.source.site.category

  for (const sample of samples) {
    const mappedAssignments = sample.assignments.map((assignment) => {
      const domain = category.src(assignment.arrow)
      return {
        arrow: assignment.arrow,
        section: morphism.map(domain, assignment.section),
      }
    })
    mappedSamples.push({
      covering: sample.covering,
      overlaps: sample.overlaps,
      assignments: mappedAssignments,
    })
  }

  const targetSheafResult = checkSheafGluing(morphism.target, mappedSamples, sheafOptions)
  targetSheafResult.violations.forEach((violation) => {
    violations.push({ kind: "targetSheaf", violation })
  })

  let compatibilityChecks = 0
  let compatibilityFailures = 0

  if (sameSite) {
    samples.forEach((sample, index) => {
      const sourceGlue = morphism.source.glue(sample.covering, sample.assignments)
      if (!sourceGlue.exists || !sourceGlue.section) {
        return
      }
      compatibilityChecks += 1
      const mappedAssignments = mappedSamples[index]!.assignments
      const targetGlue = morphism.target.glue(sample.covering, mappedAssignments)
      if (!targetGlue.exists || !targetGlue.section) {
        compatibilityFailures += 1
        const violation: SheafMorphismViolation<Obj, Arr, SourceSection, TargetSection> = {
          kind: "mappedGluingFailed",
          index,
          covering: sample.covering,
          mappedAssignments,
          ...(targetGlue.details ? { details: targetGlue.details } : {}),
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({
            violation,
            mappedAssignments,
            sourceGlue: sourceGlue.section,
          })
        }
        return
      }

      const mappedSourceGlue = morphism.map(sample.covering.target, sourceGlue.section)
      if (!targetSectionEq(mappedSourceGlue, targetGlue.section)) {
        compatibilityFailures += 1
        const violation: SheafMorphismViolation<Obj, Arr, SourceSection, TargetSection> = {
          kind: "gluingIncompatible",
          index,
          covering: sample.covering,
          mappedAssignments,
          mappedSourceGlue,
          targetGlue: targetGlue.section,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({
            violation,
            mappedAssignments,
            sourceGlue: sourceGlue.section,
            targetGlue: targetGlue.section,
          })
        }
      }
    })
  }

  const holds =
    presheafResult.holds &&
    sourceSheafResult.holds &&
    targetSheafResult.holds &&
    compatibilityFailures === 0

  const details = holds
    ? morphism.label
      ? `Sheaf morphism ${morphism.label} satisfied sampled gluing compatibility checks.`
      : "Sheaf morphism satisfied sampled gluing compatibility checks."
    : `Sheaf morphism${morphism.label ? ` ${morphism.label}` : ""} failed ${
        violations.length
      } sampled condition(s).`

  return {
    holds,
    presheaf: presheafResult,
    sourceSheaf: sourceSheafResult,
    targetSheaf: targetSheafResult,
    mappedSamples,
    violations,
    witnesses,
    details,
    metadata: {
      samplesTested: samples.length,
      compatibilityChecks,
      compatibilityFailures,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}
