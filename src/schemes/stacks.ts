import type { SimpleCat } from "../../simple-cat"
import type { FiniteGroupoid } from "../../stdlib/category"
import type { EtaleDescentSample } from "../sheaves/grothendieck-topologies"
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
        ...(lift.details === undefined ? {} : { details: lift.details }),
      }
      violations.push(violation)
      recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
      return
    }

    const liftObject = lift.object
    const liftArrow = lift.lift
    if (!liftObject || !liftArrow) {
      return
    }

    const liftSource = fibered.fiber.src(liftArrow)
    const liftTarget = fibered.fiber.dst(liftArrow)

    if (!objectEq(liftTarget, sample.target)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "liftTargetMismatch",
        sampleIndex,
      }
      violations.push(violation)
      recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
    }

    if (!objectEq(liftSource, liftObject)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "liftSourceMismatch",
        sampleIndex,
      }
      violations.push(violation)
      recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
    }

    const expectedSourceBase = fibered.base.src(sample.baseArrow)
    const actualSourceBase = fibered.baseOfObject(liftObject)
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
      if (!objectEq(factorizationSource, comparison.from) || !objectEq(factorizationTarget, liftObject)) {
      const violation: FiberedCategoryViolation<BaseObj, Obj, Arr> = {
        kind: "comparisonFactorizationMismatch",
        sampleIndex,
        comparisonIndex,
      }
        violations.push(violation)
        recordWitness(witnesses, witnessLimit, { sampleIndex, violation })
        return
      }

      const composed = fibered.fiber.compose(liftArrow, comparison.factorization)
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
        ...(leftRestriction.details === undefined ? {} : { details: leftRestriction.details }),
      })
      return
    }

    const rightRestriction = datum.fibered.pullback(transition.toRight, right)
    if (!rightRestriction.exists || !rightRestriction.object || !rightRestriction.lift) {
      record({
        kind: "transitionRestrictionFailure",
        transitionIndex: index,
        side: "right",
        ...(rightRestriction.details === undefined ? {} : { details: rightRestriction.details }),
      })
      return
    }

    const leftObject = leftRestriction.object
    const rightObject = rightRestriction.object
    if (!leftObject || !rightObject) {
      return
    }

    const transitionSource = datum.fibered.fiber.src(transition.transition)
    if (!objectEq(transitionSource, leftObject)) {
      record({ kind: "transitionSourceMismatch", transitionIndex: index })
      return
    }

    const transitionTarget = datum.fibered.fiber.dst(transition.transition)
    if (!objectEq(transitionTarget, rightObject)) {
      record({ kind: "transitionTargetMismatch", transitionIndex: index })
      return
    }

    if (transition.inverse) {
      const inverseSource = datum.fibered.fiber.src(transition.inverse)
      const inverseTarget = datum.fibered.fiber.dst(transition.inverse)
      if (!objectEq(inverseSource, rightObject) || !objectEq(inverseTarget, leftObject)) {
        record({ kind: "transitionInverseFailure", transitionIndex: index, direction: "forward" })
      } else {
        const forwardRoundTrip = datum.fibered.fiber.compose(transition.inverse, transition.transition)
        const backwardRoundTrip = datum.fibered.fiber.compose(transition.transition, transition.inverse)
        const leftId = datum.fibered.fiber.id(leftObject)
        const rightId = datum.fibered.fiber.id(rightObject)
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
      record({
        kind: "glueFailure",
        ...(result.details === undefined ? {} : { details: result.details }),
      })
    } else {
      const gluedObject = result.object
      result.arrows?.forEach(glueArrow => {
        const targetLocal = datum.localObjects[glueArrow.index]
        if (!targetLocal) {
          record({ kind: "localObjectMissing", index: glueArrow.index })
          return
        }
        const source = datum.fibered.fiber.src(glueArrow.arrow)
        const target = datum.fibered.fiber.dst(glueArrow.arrow)
        if (!objectEq(source, targetLocal) || !objectEq(target, gluedObject)) {
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

export interface EtaleFiberedSampleSpec<BaseObj, BaseArr, Obj, Arr> {
  readonly pullbackIndex: number
  readonly target: Obj
  readonly comparisons?: ReadonlyArray<CartesianComparison<Obj, Arr>>
  readonly label?: string
  readonly liftIndex?: number
}

export const buildFiberedSamplesFromEtaleDescent = <BaseObj, BaseArr, Obj, Arr>(
  sample: EtaleDescentSample<BaseObj, BaseArr>,
  specifications: ReadonlyArray<EtaleFiberedSampleSpec<BaseObj, BaseArr, Obj, Arr>>,
): FiberedCategorySample<BaseObj, BaseArr, Obj, Arr>[] => {
  const results: FiberedCategorySample<BaseObj, BaseArr, Obj, Arr>[] = []

  specifications.forEach(spec => {
    const pullback = sample.pullbackSamples[spec.pullbackIndex]
    if (!pullback) {
      throw new Error(`Missing ?tale pullback sample at index ${spec.pullbackIndex}`)
    }

    if (spec.liftIndex !== undefined) {
      const lift = pullback.lifts[spec.liftIndex]
      if (!lift) {
        throw new Error(
          `Missing ?tale pullback lift at index ${spec.liftIndex} for pullback sample ${spec.pullbackIndex}`,
        )
      }
      void lift
    }

    const label = spec.label ?? pullback.label ?? sample.label ?? sample.covering.label

    results.push({
      baseArrow: pullback.arrow,
      target: spec.target,
      comparisons: spec.comparisons ?? [],
      ...(label === undefined ? {} : { label }),
    })
  })

  return results
}

export interface FiberedCategoryMorphism<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly source: FiberedCategory<BaseObj, BaseArr, SrcObj, SrcArr>
  readonly target: FiberedCategory<BaseObj, BaseArr, TgtObj, TgtArr>
  readonly onObjects: (object: SrcObj) => TgtObj
  readonly onArrows: (arrow: SrcArr) => TgtArr | undefined
  readonly label?: string
}

export interface FiberedMorphismCheckSamples<BaseObj, BaseArr, Obj, Arr> {
  readonly objects?: ReadonlyArray<Obj>
  readonly arrows?: ReadonlyArray<Arr>
  readonly identities?: ReadonlyArray<Obj>
  readonly compositions?: ReadonlyArray<{
    readonly first: Arr
    readonly second: Arr
    readonly composite: Arr
  }>
  readonly cartesianLifts?: ReadonlyArray<{
    readonly baseArrow: BaseArr
    readonly target: Obj
  }>
}

export type FiberedMorphismViolation<BaseObj, Obj, Arr> =
  | {
      readonly kind: "objectBaseMismatch"
      readonly objectIndex: number
      readonly expected: BaseObj
      readonly actual: BaseObj
    }
  | {
      readonly kind: "arrowMappingMissing"
      readonly arrowIndex: number
    }
  | {
      readonly kind: "arrowSourceMismatch"
      readonly arrowIndex: number
    }
  | {
      readonly kind: "arrowTargetMismatch"
      readonly arrowIndex: number
    }
  | {
      readonly kind: "identityMismatch"
      readonly objectIndex: number
    }
  | {
      readonly kind: "compositionMismatch"
      readonly compositionIndex: number
    }
  | {
      readonly kind: "cartesianSourceFailure"
      readonly cartesianIndex: number
    }
  | {
      readonly kind: "cartesianTargetFailure"
      readonly cartesianIndex: number
    }
  | {
      readonly kind: "cartesianObjectMismatch"
      readonly cartesianIndex: number
    }
  | {
      readonly kind: "cartesianArrowMismatch"
      readonly cartesianIndex: number
    }

export interface FiberedMorphismWitness<BaseObj, Obj, Arr> {
  readonly violation: FiberedMorphismViolation<BaseObj, Obj, Arr>
}

export interface FiberedMorphismCheckOptions<BaseObj, TgtObj, TgtArr> {
  readonly baseObjectEq?: Equality<BaseObj>
  readonly targetObjectEq?: Equality<TgtObj>
  readonly targetArrowEq?: Equality<TgtArr>
  readonly witnessLimit?: number
}

export interface FiberedMorphismCheckMetadata {
  readonly objectsChecked: number
  readonly arrowsChecked: number
  readonly identitiesChecked: number
  readonly compositionsChecked: number
  readonly cartesianChecked: number
  readonly witnessesRecorded: number
  readonly witnessLimit: number
}

export interface FiberedMorphismCheckResult<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<FiberedMorphismViolation<BaseObj, SrcObj, SrcArr>>
  readonly witnesses: ReadonlyArray<FiberedMorphismWitness<BaseObj, SrcObj, SrcArr>>
  readonly details: string
  readonly metadata: FiberedMorphismCheckMetadata
}

export const checkFiberedMorphism = <BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr>(
  morphism: FiberedCategoryMorphism<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr>,
  samples: FiberedMorphismCheckSamples<BaseObj, BaseArr, SrcObj, SrcArr> = {},
  options: FiberedMorphismCheckOptions<BaseObj, TgtObj, TgtArr> = {},
): FiberedMorphismCheckResult<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr> => {
  const baseEq = withEquality(options.baseObjectEq)
  const objectEq = withEquality(options.targetObjectEq ?? morphism.target.fiber.objectEq)
  const arrowEq = withEquality(options.targetArrowEq ?? morphism.target.fiber.arrowEq)
  const witnessLimit = options.witnessLimit ?? 3

  const violations: FiberedMorphismViolation<BaseObj, SrcObj, SrcArr>[] = []
  const witnesses: FiberedMorphismWitness<BaseObj, SrcObj, SrcArr>[] = []

  const record = (violation: FiberedMorphismViolation<BaseObj, SrcObj, SrcArr>): void => {
    violations.push(violation)
    if (witnesses.length < witnessLimit) {
      witnesses.push({ violation })
    }
  }

  samples.objects?.forEach((object, index) => {
    const expectedBase = morphism.source.baseOfObject(object)
    const image = morphism.onObjects(object)
    const actualBase = morphism.target.baseOfObject(image)
    if (!baseEq(expectedBase, actualBase)) {
      record({ kind: "objectBaseMismatch", objectIndex: index, expected: expectedBase, actual: actualBase })
    }
  })

  samples.arrows?.forEach((arrow, index) => {
    const mapped = morphism.onArrows(arrow)
    if (!mapped) {
      record({ kind: "arrowMappingMissing", arrowIndex: index })
      return
    }

    const sourceObject = morphism.source.fiber.src(arrow)
    const targetObject = morphism.source.fiber.dst(arrow)
    const mappedSource = morphism.onObjects(sourceObject)
    const mappedTarget = morphism.onObjects(targetObject)

    const actualSource = morphism.target.fiber.src(mapped)
    const actualTarget = morphism.target.fiber.dst(mapped)

    if (!objectEq(actualSource, mappedSource)) {
      record({ kind: "arrowSourceMismatch", arrowIndex: index })
    }

    if (!objectEq(actualTarget, mappedTarget)) {
      record({ kind: "arrowTargetMismatch", arrowIndex: index })
    }
  })

  samples.identities?.forEach((object, index) => {
    const identity = morphism.source.fiber.id(object)
    const mappedIdentity = morphism.onArrows(identity)
    if (!mappedIdentity) {
      record({ kind: "identityMismatch", objectIndex: index })
      return
    }

    const expectedIdentity = morphism.target.fiber.id(morphism.onObjects(object))
    if (!arrowEq(mappedIdentity, expectedIdentity)) {
      record({ kind: "identityMismatch", objectIndex: index })
    }
  })

  samples.compositions?.forEach((composition, index) => {
    const mappedFirst = morphism.onArrows(composition.first)
    const mappedSecond = morphism.onArrows(composition.second)
    const mappedComposite = morphism.onArrows(composition.composite)

    if (!mappedFirst || !mappedSecond || !mappedComposite) {
      record({ kind: "compositionMismatch", compositionIndex: index })
      return
    }

    const targetComposed = morphism.target.fiber.compose(mappedSecond, mappedFirst)
    if (!targetComposed || !arrowEq(targetComposed, mappedComposite)) {
      record({ kind: "compositionMismatch", compositionIndex: index })
    }
  })

  samples.cartesianLifts?.forEach((cartesian, index) => {
    const sourceLift = morphism.source.pullback(cartesian.baseArrow, cartesian.target)
    if (!sourceLift.exists || !sourceLift.object || !sourceLift.lift) {
      record({ kind: "cartesianSourceFailure", cartesianIndex: index })
      return
    }

    const imageTarget = morphism.onObjects(cartesian.target)
    const targetLift = morphism.target.pullback(cartesian.baseArrow, imageTarget)
    if (!targetLift.exists || !targetLift.object || !targetLift.lift) {
      record({ kind: "cartesianTargetFailure", cartesianIndex: index })
      return
    }

    const mappedObject = morphism.onObjects(sourceLift.object)
    if (!objectEq(mappedObject, targetLift.object)) {
      record({ kind: "cartesianObjectMismatch", cartesianIndex: index })
    }

    const mappedLift = morphism.onArrows(sourceLift.lift)
    if (!mappedLift || !arrowEq(mappedLift, targetLift.lift)) {
      record({ kind: "cartesianArrowMismatch", cartesianIndex: index })
    }
  })

  const holds = violations.length === 0
  const details = holds
    ? morphism.label
      ? `Fibered morphism ${morphism.label} respected all sampled functoriality checks.`
      : "Fibered morphism respected all sampled functoriality checks."
    : `Fibered morphism${morphism.label ? ` ${morphism.label}` : ""} exhibits ${violations.length} violation(s).`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      objectsChecked: samples.objects?.length ?? 0,
      arrowsChecked: samples.arrows?.length ?? 0,
      identitiesChecked: samples.identities?.length ?? 0,
      compositionsChecked: samples.compositions?.length ?? 0,
      cartesianChecked: samples.cartesianLifts?.length ?? 0,
      witnessesRecorded: witnesses.length,
      witnessLimit,
    },
  }
}

export interface FiberedTwoMorphism<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly left: FiberedCategoryMorphism<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr>
  readonly right: FiberedCategoryMorphism<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr>
  readonly component: (object: SrcObj) => TgtArr | undefined
  readonly label?: string
}

export interface FiberedTwoMorphismSamples<Obj, Arr> {
  readonly objects: ReadonlyArray<Obj>
  readonly arrows?: ReadonlyArray<Arr>
}

export type FiberedTwoMorphismViolation<Obj> =
  | {
      readonly kind: "componentMissing"
      readonly objectIndex: number
    }
  | {
      readonly kind: "componentSourceMismatch"
      readonly objectIndex: number
    }
  | {
      readonly kind: "componentTargetMismatch"
      readonly objectIndex: number
    }
  | {
      readonly kind: "naturalityMismatch"
      readonly arrowIndex: number
    }

export interface FiberedTwoMorphismWitness<Obj, Arr> {
  readonly objectIndex: number
  readonly object: Obj
  readonly component: Arr
}

export interface FiberedTwoMorphismCheckOptions<TgtObj, TgtArr> {
  readonly targetObjectEq?: Equality<TgtObj>
  readonly targetArrowEq?: Equality<TgtArr>
  readonly witnessLimit?: number
}

export interface FiberedTwoMorphismCheckMetadata {
  readonly objectsChecked: number
  readonly arrowsChecked: number
  readonly witnessesRecorded: number
  readonly witnessLimit: number
}

export interface FiberedTwoMorphismCheckResult<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<FiberedTwoMorphismViolation<SrcObj>>
  readonly witnesses: ReadonlyArray<FiberedTwoMorphismWitness<SrcObj, TgtArr>>
  readonly details: string
  readonly metadata: FiberedTwoMorphismCheckMetadata
}

export const checkFiberedTwoMorphism = <BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr>(
  datum: FiberedTwoMorphism<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr>,
  samples: FiberedTwoMorphismSamples<SrcObj, SrcArr>,
  options: FiberedTwoMorphismCheckOptions<TgtObj, TgtArr> = {},
): FiberedTwoMorphismCheckResult<BaseObj, BaseArr, SrcObj, SrcArr, TgtObj, TgtArr> => {
  const objectEq = withEquality(options.targetObjectEq ?? datum.left.target.fiber.objectEq)
  const arrowEq = withEquality(options.targetArrowEq ?? datum.left.target.fiber.arrowEq)
  const witnessLimit = options.witnessLimit ?? 5

  const violations: FiberedTwoMorphismViolation<SrcObj>[] = []
  const witnesses: FiberedTwoMorphismWitness<SrcObj, TgtArr>[] = []

  const recordViolation = (violation: FiberedTwoMorphismViolation<SrcObj>): void => {
    violations.push(violation)
  }

  samples.objects.forEach((object, index) => {
    const component = datum.component(object)
    if (!component) {
      recordViolation({ kind: "componentMissing", objectIndex: index })
      return
    }

    const leftImage = datum.left.onObjects(object)
    const rightImage = datum.right.onObjects(object)

    const source = datum.left.target.fiber.src(component)
    const target = datum.left.target.fiber.dst(component)

    let valid = true

    if (!objectEq(source, leftImage)) {
      recordViolation({ kind: "componentSourceMismatch", objectIndex: index })
      valid = false
    }

    if (!objectEq(target, rightImage)) {
      recordViolation({ kind: "componentTargetMismatch", objectIndex: index })
      valid = false
    }

    if (valid && witnesses.length < witnessLimit) {
      witnesses.push({ objectIndex: index, object, component })
    }
  })

  samples.arrows?.forEach((arrow, index) => {
    const leftArrow = datum.left.onArrows(arrow)
    const rightArrow = datum.right.onArrows(arrow)
    if (!leftArrow || !rightArrow) {
      recordViolation({ kind: "naturalityMismatch", arrowIndex: index })
      return
    }

    const sourceObject = datum.left.source.fiber.src(arrow)
    const targetObject = datum.left.source.fiber.dst(arrow)

    const sourceComponent = datum.component(sourceObject)
    const targetComponent = datum.component(targetObject)

    if (!sourceComponent || !targetComponent) {
      recordViolation({ kind: "naturalityMismatch", arrowIndex: index })
      return
    }

    const leftComposite = datum.left.target.fiber.compose(targetComponent, leftArrow)
    const rightComposite = datum.left.target.fiber.compose(rightArrow, sourceComponent)

    if (!leftComposite || !rightComposite || !arrowEq(leftComposite, rightComposite)) {
      recordViolation({ kind: "naturalityMismatch", arrowIndex: index })
    }
  })

  const holds = violations.length === 0
  const details = holds
    ? datum.label
      ? `Fibered 2-morphism ${datum.label} satisfied all sampled naturality checks.`
      : "Fibered 2-morphism satisfied all sampled naturality checks."
    : `Fibered 2-morphism${datum.label ? ` ${datum.label}` : ""} exhibits ${violations.length} violation(s).`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      objectsChecked: samples.objects.length,
      arrowsChecked: samples.arrows?.length ?? 0,
      witnessesRecorded: witnesses.length,
      witnessLimit,
    },
  }
}

const dedupe = <T>(items: ReadonlyArray<T>, eq: Equality<T>): T[] => {
  const result: T[] = []
  items.forEach(item => {
    if (!result.some(existing => eq(existing, item))) {
      result.push(item)
    }
  })
  return result
}

interface StackGroupoidArrowEntry<Arr> {
  readonly arrow: Arr
  inverse?: Arr
}

const registerArrow = <Arr>(
  entries: StackGroupoidArrowEntry<Arr>[],
  arrow: Arr,
  eq: Equality<Arr>,
): StackGroupoidArrowEntry<Arr> => {
  const existing = entries.find(entry => eq(entry.arrow, arrow))
  if (existing) {
    return existing
  }
  const entry: StackGroupoidArrowEntry<Arr> = { arrow }
  entries.push(entry)
  return entry
}

export interface StackPresentationRequest<BaseObj, BaseArr, Obj, Arr> {
  readonly descent: DescentDatum<BaseObj, BaseArr, Obj, Arr>
  readonly additionalFiberedSamples?: ReadonlyArray<FiberedCategorySample<BaseObj, BaseArr, Obj, Arr>>
  readonly etaleSamples?: {
    readonly sample: EtaleDescentSample<BaseObj, BaseArr>
    readonly specifications: ReadonlyArray<EtaleFiberedSampleSpec<BaseObj, BaseArr, Obj, Arr>>
  }
  readonly label?: string
}

export interface StackPresentation<BaseObj, BaseArr, Obj, Arr> {
  readonly groupoid: FiniteGroupoid<Obj, Arr>
  readonly fiberedSamples: ReadonlyArray<FiberedCategorySample<BaseObj, BaseArr, Obj, Arr>>
  readonly fiberedCheck: FiberedCategoryCheckResult<BaseObj, BaseArr, Obj, Arr>
  readonly descentCheck: DescentCheckResult<BaseObj, BaseArr, Obj, Arr>
  readonly details: string
}

const buildStackGroupoid = <BaseObj, BaseArr, Obj, Arr>(
  datum: DescentDatum<BaseObj, BaseArr, Obj, Arr>,
): FiniteGroupoid<Obj, Arr> => {
  const objectEq = withEquality(datum.fibered.fiber.objectEq)
  const arrowEq = withEquality(datum.fibered.fiber.arrowEq)

  const objects: Obj[] = []
  const addObject = (object: Obj): void => {
    if (!objects.some(existing => objectEq(existing, object))) {
      objects.push(object)
    }
  }

  datum.localObjects.forEach(addObject)

  const arrowEntries: StackGroupoidArrowEntry<Arr>[] = []
  const addArrow = (arrow: Arr): StackGroupoidArrowEntry<Arr> => {
    const entry = registerArrow(arrowEntries, arrow, arrowEq)
    addObject(datum.fibered.fiber.src(arrow))
    addObject(datum.fibered.fiber.dst(arrow))
    return entry
  }

  objects.forEach(object => {
    const identity = datum.fibered.fiber.id(object)
    const entry = addArrow(identity)
    entry.inverse = identity
  })

  datum.transitions.forEach(transition => {
    const entry = addArrow(transition.transition)
    if (transition.inverse) {
      const inverseEntry = addArrow(transition.inverse)
      entry.inverse = transition.inverse
      inverseEntry.inverse = transition.transition
    }
  })

  datum.cocycles?.forEach(cocycle => {
    const firstEntry = addArrow(cocycle.first)
    const secondEntry = addArrow(cocycle.second)
    addArrow(cocycle.expected)
    const sourceIdentity = datum.fibered.fiber.id(datum.fibered.fiber.src(cocycle.first))
    const targetIdentity = datum.fibered.fiber.id(datum.fibered.fiber.dst(cocycle.first))
    const expectedIsSourceIdentity = arrowEq(cocycle.expected, sourceIdentity)
    const expectedIsTargetIdentity = arrowEq(cocycle.expected, targetIdentity)
    if (expectedIsSourceIdentity) {
      firstEntry.inverse = cocycle.second
      secondEntry.inverse = cocycle.first
    } else if (expectedIsTargetIdentity) {
      firstEntry.inverse = cocycle.second
      secondEntry.inverse = cocycle.first
    }
  })

  const hom = (from: Obj, to: Obj): Arr[] =>
    arrowEntries
      .filter(entry =>
        objectEq(datum.fibered.fiber.src(entry.arrow), from) &&
        objectEq(datum.fibered.fiber.dst(entry.arrow), to),
      )
      .map(entry => entry.arrow)

  const findEntry = (arrow: Arr): StackGroupoidArrowEntry<Arr> | undefined =>
    arrowEntries.find(entry => arrowEq(entry.arrow, arrow))

  const ensureIdentityEntry = (object: Obj): StackGroupoidArrowEntry<Arr> => {
    const identity = datum.fibered.fiber.id(object)
    const entry = findEntry(identity)
    if (entry) {
      entry.inverse = identity
      return entry
    }
    const newEntry = addArrow(identity)
    newEntry.inverse = identity
    return newEntry
  }

  const inv = (arrow: Arr): Arr => {
    const entry = findEntry(arrow)
    if (entry?.inverse) {
      return entry.inverse
    }

    const source = datum.fibered.fiber.src(arrow)
    const target = datum.fibered.fiber.dst(arrow)
    ensureIdentityEntry(source)
    ensureIdentityEntry(target)
    const identitySource = datum.fibered.fiber.id(source)
    const identityTarget = datum.fibered.fiber.id(target)

    const candidate = arrowEntries.find(candidateEntry => {
      const candidateArrow = candidateEntry.arrow
      if (!objectEq(datum.fibered.fiber.src(candidateArrow), target)) {
        return false
      }
      if (!objectEq(datum.fibered.fiber.dst(candidateArrow), source)) {
        return false
      }
      const forward = datum.fibered.fiber.compose(arrow, candidateArrow)
      const backward = datum.fibered.fiber.compose(candidateArrow, arrow)
      return (
        !!forward &&
        !!backward &&
        arrowEq(forward, identityTarget) &&
        arrowEq(backward, identitySource)
      )
    })

    if (candidate) {
      if (entry) {
        entry.inverse = candidate.arrow
      }
      if (!candidate.inverse) {
        candidate.inverse = arrow
      }
      return candidate.arrow
    }

    if (entry && arrowEq(entry.arrow, identitySource)) {
      entry.inverse = entry.arrow
      return entry.arrow
    }

    return identitySource
  }

  const uniqueObjects = dedupe(objects, objectEq)

  return {
    objects: uniqueObjects,
    hom,
    id: (object: Obj) => {
      const identity = datum.fibered.fiber.id(object)
      addArrow(identity)
      return identity
    },
    compose: (g: Arr, f: Arr) => {
      const composed = datum.fibered.fiber.compose(g, f)
      if (!composed) {
        throw new Error("Stack groupoid composition undefined for provided arrows.")
      }
      addArrow(composed)
      return composed
    },
    inv,
    dom: (arrow: Arr) => datum.fibered.fiber.src(arrow),
    cod: (arrow: Arr) => datum.fibered.fiber.dst(arrow),
    ...(datum.fibered.fiber.arrowEq ? { eq: datum.fibered.fiber.arrowEq } : {}),
    isId: (arrow: Arr) => {
      const source = datum.fibered.fiber.src(arrow)
      return arrowEq(arrow, datum.fibered.fiber.id(source))
    },
    ...(datum.fibered.fiber.arrowEq ? { equalMor: datum.fibered.fiber.arrowEq } : {}),
  }
}

export const synthesizeStackPresentation = <BaseObj, BaseArr, Obj, Arr>(
  request: StackPresentationRequest<BaseObj, BaseArr, Obj, Arr>,
): StackPresentation<BaseObj, BaseArr, Obj, Arr> => {
  const { descent } = request

  const fiberedSamplesFromEtale = request.etaleSamples
    ? buildFiberedSamplesFromEtaleDescent(request.etaleSamples.sample, request.etaleSamples.specifications)
    : []

  const suppliedSamples = request.additionalFiberedSamples ?? []
  const mergedSamples = [...suppliedSamples, ...fiberedSamplesFromEtale]

  const fiberedCheck = checkFiberedCategory(descent.fibered, mergedSamples)
  const descentCheck = checkStackDescent(descent)
  const groupoid = buildStackGroupoid(descent)

  const label = request.label ?? descent.label
  const detailParts = [
    label
      ? `Stack presentation ${label} synthesized groupoid with ${groupoid.objects.length} object(s).`
      : `Stack presentation synthesized groupoid with ${groupoid.objects.length} object(s).`,
    mergedSamples.length > 0
      ? `Verified ${mergedSamples.length} fibered sample(s).`
      : "No fibered samples supplied for verification.",
    descentCheck.details,
    fiberedCheck.details,
  ]

  return {
    groupoid,
    fiberedSamples: mergedSamples,
    fiberedCheck,
    descentCheck,
    details: detailParts.join(" "),
  }
}

