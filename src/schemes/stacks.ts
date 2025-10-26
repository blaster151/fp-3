import type { SimpleCat } from "../../simple-cat"
import type { CoveringFamily } from "../sheaves/sites"

type Equality<A> = (left: A, right: A) => boolean

const withEquality = <A>(eq?: Equality<A>): Equality<A> => eq ?? ((left, right) => Object.is(left, right))

export interface FiberedCategory<BaseObj, BaseArr, Obj, Arr> {
  readonly base: SimpleCat<BaseObj, BaseArr>
  readonly fiber: {
    readonly src: (arrow: Arr) => Obj
    readonly dst: (arrow: Arr) => Obj
    readonly id: (object: Obj) => Arr
    readonly compose: (g: Arr, f: Arr) => Arr | undefined
    readonly objectEq?: Equality<Obj>
    readonly arrowEq?: Equality<Arr>
  }
  readonly baseOfObject: (object: Obj) => BaseObj
  readonly pullback: (
    baseArrow: BaseArr,
    target: Obj,
  ) => {
    readonly exists: boolean
    readonly object?: Obj
    readonly lift?: Arr
    readonly details?: string
  }
  readonly label?: string
}

export interface CartesianComparison<Obj, Arr> {
  readonly from: Obj
  readonly arrow: Arr
  readonly factorization: Arr
  readonly alternatives?: ReadonlyArray<Arr>
  readonly label?: string
}

export interface FiberedCategorySample<BaseObj, BaseArr, Obj, Arr> {
  readonly baseArrow: BaseArr
  readonly target: Obj
  readonly comparisons?: ReadonlyArray<CartesianComparison<Obj, Arr>>
  readonly label?: string
}

export interface FiberedCategoryWitness<BaseObj, Obj, Arr> {
  readonly sampleIndex: number
  readonly violation: FiberedCategoryViolation<BaseObj, Obj, Arr>
}

export type FiberedCategoryViolation<BaseObj, Obj, Arr> =
  | {
      readonly kind: "targetBaseMismatch"
      readonly sampleIndex: number
      readonly expected: BaseObj
      readonly actual: BaseObj
    }
  | {
      readonly kind: "pullbackFailed"
      readonly sampleIndex: number
      readonly details?: string
    }
  | {
      readonly kind: "liftTargetMismatch"
      readonly sampleIndex: number
    }
  | {
      readonly kind: "liftSourceMismatch"
      readonly sampleIndex: number
    }
  | {
      readonly kind: "liftBaseMismatch"
      readonly sampleIndex: number
      readonly expected: BaseObj
      readonly actual: BaseObj
    }
  | {
      readonly kind: "comparisonSourceMismatch"
      readonly sampleIndex: number
      readonly comparisonIndex: number
    }
  | {
      readonly kind: "comparisonTargetMismatch"
      readonly sampleIndex: number
      readonly comparisonIndex: number
    }
  | {
      readonly kind: "comparisonFactorizationMismatch"
      readonly sampleIndex: number
      readonly comparisonIndex: number
    }
  | {
      readonly kind: "comparisonCompositionMismatch"
      readonly sampleIndex: number
      readonly comparisonIndex: number
    }
  | {
      readonly kind: "comparisonUniquenessFailure"
      readonly sampleIndex: number
      readonly comparisonIndex: number
    }

export interface FiberedCategoryCheckOptions<BaseObj, Obj, Arr> {
  readonly baseObjectEq?: Equality<BaseObj>
  readonly fiberObjectEq?: Equality<Obj>
  readonly fiberArrowEq?: Equality<Arr>
  readonly witnessLimit?: number
}

export interface FiberedCategoryCheckMetadata {
  readonly samplesTested: number
  readonly comparisonsChecked: number
  readonly witnessesRecorded: number
  readonly witnessLimit: number
}

export interface FiberedCategoryCheckResult<BaseObj, BaseArr, Obj, Arr> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<FiberedCategoryViolation<BaseObj, Obj, Arr>>
  readonly witnesses: ReadonlyArray<FiberedCategoryWitness<BaseObj, Obj, Arr>>
  readonly details: string
  readonly metadata: FiberedCategoryCheckMetadata
}

const recordWitness = <BaseObj, Obj, Arr>(
  witnesses: FiberedCategoryWitness<BaseObj, Obj, Arr>[],
  witnessLimit: number,
  witness: FiberedCategoryWitness<BaseObj, Obj, Arr>,
): void => {
  if (witnesses.length < witnessLimit) {
    witnesses.push(witness)
  }
}

export const checkFiberedCategory = <BaseObj, BaseArr, Obj, Arr>(
  fibered: FiberedCategory<BaseObj, BaseArr, Obj, Arr>,
  samples: ReadonlyArray<FiberedCategorySample<BaseObj, BaseArr, Obj, Arr>>,
  options: FiberedCategoryCheckOptions<BaseObj, Obj, Arr> = {},
): FiberedCategoryCheckResult<BaseObj, BaseArr, Obj, Arr> => {
  const baseEq = withEquality(options.baseObjectEq)
  const objectEq = withEquality(options.fiberObjectEq ?? fibered.fiber.objectEq)
  const arrowEq = withEquality(options.fiberArrowEq ?? fibered.fiber.arrowEq)
  const witnessLimit = options.witnessLimit ?? 3

  const violations: FiberedCategoryViolation<BaseObj, Obj, Arr>[] = []
  const witnesses: FiberedCategoryWitness<BaseObj, Obj, Arr>[] = []

  let comparisonsChecked = 0

  samples.forEach((sample, sampleIndex) => {
    const expectedBase = fibered.base.dst(sample.baseArrow)
    const actualBase = fibered.baseOfObject(sample.target)
    if (!baseEq(expectedBase, actualBase)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "targetBaseMismatch",
        sampleIndex,
        expected: expectedBase,
        actual: actualBase,
      }
      violations.push(violation)
      recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
      return
    }

    const lift = fibered.pullback(sample.baseArrow, sample.target)
    if (!lift.exists || !lift.object || !lift.lift) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "pullbackFailed",
        sampleIndex,
        details: lift.details,
      }
      violations.push(violation)
      recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
      return
    }

    const liftSource = fibered.fiber.src(lift.lift)
    const liftTarget = fibered.fiber.dst(lift.lift)

    if (!objectEq(liftTarget, sample.target)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "liftTargetMismatch",
        sampleIndex,
      }
      violations.push(violation)
      recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
    }

    if (!objectEq(liftSource, lift.object)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "liftSourceMismatch",
        sampleIndex,
      }
      violations.push(violation)
      recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
    }

    const expectedSourceBase = fibered.base.src(sample.baseArrow)
    const actualSourceBase = fibered.baseOfObject(lift.object)
    if (!baseEq(expectedSourceBase, actualSourceBase)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "liftBaseMismatch",
        sampleIndex,
        expected: expectedSourceBase,
        actual: actualSourceBase,
      }
      violations.push(violation)
      recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
    }

    sample.comparisons?.forEach((comparison, comparisonIndex) => {
      comparisonsChecked += 1
      const comparisonSource = fibered.fiber.src(comparison.arrow)
      if (!objectEq(comparisonSource, comparison.from)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "comparisonSourceMismatch",
        sampleIndex,
        comparisonIndex,
      }
        violations.push(violation)
        recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
        return
      }

      const comparisonTarget = fibered.fiber.dst(comparison.arrow)
      if (!objectEq(comparisonTarget, sample.target)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "comparisonTargetMismatch",
        sampleIndex,
        comparisonIndex,
      }
        violations.push(violation)
        recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
        return
      }

      const factorizationSource = fibered.fiber.src(comparison.factorization)
      const factorizationTarget = fibered.fiber.dst(comparison.factorization)
      if (!objectEq(factorizationSource, comparison.from) || !objectEq(factorizationTarget, lift.object)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "comparisonFactorizationMismatch",
        sampleIndex,
        comparisonIndex,
      }
        violations.push(violation)
        recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
        return
      }

      const composed = fibered.fiber.compose(lift.lift, comparison.factorization)
      if (!composed || !arrowEq(composed, comparison.arrow)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "comparisonCompositionMismatch",
        sampleIndex,
        comparisonIndex,
      }
        violations.push(violation)
        recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
        return
      }

      comparison.alternatives?.forEach(alternative => {
        if (!arrowEq(alternative, comparison.factorization)) {
          const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
            kind: "comparisonUniquenessFailure",
            sampleIndex,
            comparisonIndex,
          }
          violations.push(violation)
          recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
        }
      })
    })
  })

  const holds = violations.length === 0
  const details = holds
    ? fibered.label
      ? `Fibered category ${fibered.label} satisfies all sampled cartesian lift checks.`
      : "Fibered category satisfies all sampled cartesian lift checks."
    : `Fibered category${fibered.label ? ` ${fibered.label}` : ""} exhibits ${violations.length} violation(s).`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      samplesTested: samples.length,
      comparisonsChecked,
      witnessesRecorded: witnesses.length,
      witnessLimit,
    },
  }
}

export interface DescentTransition<BaseObj, BaseArr, Obj, Arr> {
  readonly overlap: BaseObj
  readonly toLeft: BaseArr
  readonly toRight: BaseArr
  readonly leftIndex: number
  readonly rightIndex: number
  readonly transition: Arr
  readonly inverse?: Arr
  readonly label?: string
}

export interface DescentCocycle<Obj, Arr> {
  readonly first: Arr
  readonly second: Arr
  readonly expected: Arr
  readonly label?: string
}

export interface DescentGlueArrow<Arr> {
  readonly index: number
  readonly arrow: Arr
}

export interface DescentGlueResult<Obj, Arr> {
  readonly exists: boolean
  readonly object?: Obj
  readonly arrows?: ReadonlyArray<DescentGlueArrow<Arr>>
  readonly details?: string
}

export interface DescentDatum<BaseObj, BaseArr, Obj, Arr> {
  readonly fibered: FiberedCategory<BaseObj, BaseArr, Obj, Arr>
  readonly covering: CoveringFamily<BaseObj, BaseArr>
  readonly localObjects: ReadonlyArray<Obj>
  readonly transitions: ReadonlyArray<DescentTransition<BaseObj, BaseArr, Obj, Arr>>
  readonly cocycles?: ReadonlyArray<DescentCocycle<Obj, Arr>>
  readonly glue?: () => DescentGlueResult<Obj, Arr>
  readonly label?: string
}

export type DescentViolation<BaseObj, Obj, Arr> =
  | {
      readonly kind: "localObjectMissing"
      readonly index: number
    }
  | {
      readonly kind: "localBaseMismatch"
      readonly index: number
      readonly expected: BaseObj
      readonly actual: BaseObj
    }
  | {
      readonly kind: "transitionRestrictionFailure"
      readonly transitionIndex: number
      readonly side: "left" | "right"
      readonly details?: string
    }
  | {
      readonly kind: "transitionSourceMismatch"
      readonly transitionIndex: number
    }
  | {
      readonly kind: "transitionTargetMismatch"
      readonly transitionIndex: number
    }
  | {
      readonly kind: "transitionInverseFailure"
      readonly transitionIndex: number
      readonly direction: "forward" | "backward"
    }
  | {
      readonly kind: "transitionOverlapMismatch"
      readonly transitionIndex: number
      readonly side: "left" | "right"
      readonly expected: BaseObj
      readonly actual: BaseObj
    }
  | {
      readonly kind: "cocycleMismatch"
      readonly cocycleIndex: number
    }
  | {
      readonly kind: "glueFailure"
      readonly details?: string
    }

export interface DescentWitness<BaseObj, Obj, Arr> {
  readonly violation: DescentViolation<BaseObj, Obj, Arr>
}

export interface DescentCheckOptions<BaseObj, Obj, Arr> {
  readonly baseObjectEq?: Equality<BaseObj>
  readonly fiberObjectEq?: Equality<Obj>
  readonly fiberArrowEq?: Equality<Arr>
  readonly witnessLimit?: number
}

export interface DescentCheckMetadata {
  readonly localObjectsChecked: number
  readonly transitionsChecked: number
  readonly cocyclesChecked: number
  readonly witnessesRecorded: number
  readonly witnessLimit: number
}

export interface DescentCheckResult<BaseObj, BaseArr, Obj, Arr> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<DescentViolation<BaseObj, Obj, Arr>>
  readonly witnesses: ReadonlyArray<DescentWitness<BaseObj, Obj, Arr>>
  readonly details: string
  readonly metadata: DescentCheckMetadata
}

export const checkStackDescent = <BaseObj, BaseArr, Obj, Arr>(
  datum: DescentDatum<BaseObj, BaseArr, Obj, Arr>,
  options: DescentCheckOptions<BaseObj, Obj, Arr> = {},
): DescentCheckResult<BaseObj, BaseArr, Obj, Arr> => {
  const baseEq = withEquality(options.baseObjectEq)
  const objectEq = withEquality(options.fiberObjectEq ?? datum.fibered.fiber.objectEq)
  const arrowEq = withEquality(options.fiberArrowEq ?? datum.fibered.fiber.arrowEq)
  const witnessLimit = options.witnessLimit ?? 3

  const violations: DescentViolation<BaseObj, Obj, Arr>[] = []
  const witnesses: DescentWitness<BaseObj, Obj, Arr>[] = []

  const record = (violation: DescentViolation<BaseObj, Obj, Arr>): void => {
    violations.push(violation)
    if (witnesses.length < witnessLimit) {
      witnesses.push({ violation })
    }
  }

  datum.covering.arrows.forEach((arrow, index) => {
    const local = datum.localObjects[index]
    if (!local) {
      record({ kind: "localObjectMissing", index })
      return
    }
    const expectedBase = datum.fibered.base.src(arrow)
    const actualBase = datum.fibered.baseOfObject(local)
    if (!baseEq(expectedBase, actualBase)) {
      record({ kind: "localBaseMismatch", index, expected: expectedBase, actual: actualBase })
    }
  })

  let transitionsChecked = 0
  datum.transitions.forEach((transition, index) => {
    transitionsChecked += 1
    const left = datum.localObjects[transition.leftIndex]
    const right = datum.localObjects[transition.rightIndex]
    if (!left) {
      record({ kind: "localObjectMissing", index: transition.leftIndex })
      return
    }
    if (!right) {
      record({ kind: "localObjectMissing", index: transition.rightIndex })
      return
    }

    const leftOverlap = datum.fibered.base.src(transition.toLeft)
    if (!baseEq(leftOverlap, transition.overlap)) {
      record({
        kind: "transitionOverlapMismatch",
        transitionIndex: index,
        side: "left",
        expected: transition.overlap,
        actual: leftOverlap,
      })
      return
    }

    const rightOverlap = datum.fibered.base.src(transition.toRight)
    if (!baseEq(rightOverlap, transition.overlap)) {
      record({
        kind: "transitionOverlapMismatch",
        transitionIndex: index,
        side: "right",
        expected: transition.overlap,
        actual: rightOverlap,
      })
      return
    }

    const leftRestriction = datum.fibered.pullback(transition.toLeft, left)
    if (!leftRestriction.exists || !leftRestriction.object || !leftRestriction.lift) {
      record({
        kind: "transitionRestrictionFailure",
        transitionIndex: index,
        side: "left",
        details: leftRestriction.details,
      })
      return
    }

    const rightRestriction = datum.fibered.pullback(transition.toRight, right)
    if (!rightRestriction.exists || !rightRestriction.object || !rightRestriction.lift) {
      record({
        kind: "transitionRestrictionFailure",
        transitionIndex: index,
        side: "right",
        details: rightRestriction.details,
      })
      return
    }

    const transitionSource = datum.fibered.fiber.src(transition.transition)
    if (!objectEq(transitionSource, leftRestriction.object)) {
      record({ kind: "transitionSourceMismatch", transitionIndex: index })
      return
    }

    const transitionTarget = datum.fibered.fiber.dst(transition.transition)
    if (!objectEq(transitionTarget, rightRestriction.object)) {
      record({ kind: "transitionTargetMismatch", transitionIndex: index })
      return
    }

    if (transition.inverse) {
      const inverseSource = datum.fibered.fiber.src(transition.inverse)
      const inverseTarget = datum.fibered.fiber.dst(transition.inverse)
      if (!objectEq(inverseSource, rightRestriction.object) || !objectEq(inverseTarget, leftRestriction.object)) {
        record({ kind: "transitionInverseFailure", transitionIndex: index, direction: "forward" })
      } else {
        const forwardRoundTrip = datum.fibered.fiber.compose(transition.inverse, transition.transition)
        const backwardRoundTrip = datum.fibered.fiber.compose(transition.transition, transition.inverse)
        const leftId = datum.fibered.fiber.id(leftRestriction.object)
        const rightId = datum.fibered.fiber.id(rightRestriction.object)
        if (!forwardRoundTrip || !arrowEq(forwardRoundTrip, rightId)) {
          record({ kind: "transitionInverseFailure", transitionIndex: index, direction: "forward" })
        }
        if (!backwardRoundTrip || !arrowEq(backwardRoundTrip, leftId)) {
          record({ kind: "transitionInverseFailure", transitionIndex: index, direction: "backward" })
        }
      }
    }
  })

  let cocyclesChecked = 0
  datum.cocycles?.forEach((cocycle, index) => {
    cocyclesChecked += 1
    const composed = datum.fibered.fiber.compose(cocycle.second, cocycle.first)
    if (!composed || !arrowEq(composed, cocycle.expected)) {
      record({ kind: "cocycleMismatch", cocycleIndex: index })
    }
  })

  if (datum.glue) {
    const result = datum.glue()
    if (!result.exists || !result.object) {
      record({ kind: "glueFailure", details: result.details })
    } else {
      result.arrows?.forEach(glueArrow => {
        const targetLocal = datum.localObjects[glueArrow.index]
        if (!targetLocal) {
          record({ kind: "localObjectMissing", index: glueArrow.index })
          return
        }
        const source = datum.fibered.fiber.src(glueArrow.arrow)
        const target = datum.fibered.fiber.dst(glueArrow.arrow)
        if (!objectEq(source, targetLocal) || !objectEq(target, result.object)) {
          record({ kind: "glueFailure", details: "Glue arrow domain/codomain mismatch." })
        }
      })
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? datum.label
      ? `Descent datum ${datum.label} satisfies all sampled transition and glue checks.`
      : "Descent datum satisfies all sampled transition and glue checks."
    : `Descent datum${datum.label ? ` ${datum.label}` : ""} exhibits ${violations.length} violation(s).`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      localObjectsChecked: datum.covering.arrows.length,
      transitionsChecked,
      cocyclesChecked,
      witnessesRecorded: witnesses.length,
      witnessLimit,
    },
  }
}

