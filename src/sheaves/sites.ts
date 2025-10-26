import type { SimpleCat } from "../../simple-cat"

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
