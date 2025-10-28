import type { Option } from "../option"
import { None, Some, isNone, isSome } from "../option"
import type { Lens, Prism } from "../src/optics/lens-prism"
import type { Optional } from "../src/optics/optional-traversal"
import {
  makeOptionalWitnessBundle,
  makePrismWitnessBundle,
  readOptionalWitness,
  readPrismWitness,
  type OpticMissReason,
  type OptionalFocusWitness,
  type OptionalUpdateWitness,
  type PrismBuildWitness,
  type PrismWitness,
} from "../src/optics/witness"

export type Equality<A> = (left: A, right: A) => boolean

const defaultEquality: Equality<unknown> = (left, right) => Object.is(left, right)

const describe = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch (error) {
    return String(value)
  }
}

const describeMissReason = (reason: OpticMissReason): string => {
  switch (reason.tag) {
    case "absent":
      return reason.message ?? "focus absent"
    case "filtered": {
      const context = reason.context == null ? "" : ` (context: ${describe(reason.context)})`
      return `${reason.message}${context}`
    }
    case "errored":
      return reason.message ?? `threw ${describe(reason.error)}`
  }
}

const focusWitnessToOption = <S, A>(witness: OptionalFocusWitness<S, A>): Option<A> =>
  witness.tag === "hit" ? Some(witness.focus) : None

const ensureOptionalWitness = <S, A>(opt: Optional<S, A>) =>
  readOptionalWitness(opt) ?? makeOptionalWitnessBundle(opt.getOption, (next, source) => opt.set(next)(source))

const ensurePrismWitness = <S, A>(pr: Prism<S, A>) =>
  readPrismWitness(pr) ?? makePrismWitnessBundle(pr.getOption, pr.reverseGet)

const equalsOption = <A>(eq: Equality<A>) => (left: Option<A>, right: Option<A>): boolean => {
  if (isSome(left) && isSome(right)) {
    return eq(left.value, right.value)
  }
  return isNone(left) && isNone(right)
}

export interface LensLawConfig<S, A> {
  readonly lens: Lens<S, A>
  readonly structure: S
  readonly first: A
  readonly second: A
  readonly equalsStructure?: Equality<S>
  readonly equalsFocus?: Equality<A>
}

export interface LensLawWitness<S, A> {
  readonly original: S
  readonly focus: A
  readonly restored: S
  readonly firstSet: S
  readonly secondSet: S
  readonly doubleSet: S
  readonly focusAfterFirstSet: A
}

export interface LensLawReport<S, A> {
  readonly holds: boolean
  readonly getSet: boolean
  readonly setGet: boolean
  readonly setSet: boolean
  readonly witness: LensLawWitness<S, A>
  readonly failures: readonly string[]
}

export const checkLensLaws = <S, A>(config: LensLawConfig<S, A>): LensLawReport<S, A> => {
  const eqS = (config.equalsStructure ?? defaultEquality) as Equality<S>
  const eqA = (config.equalsFocus ?? defaultEquality) as Equality<A>
  const { lens, structure, first, second } = config

  const focus = lens.get(structure)
  const restored = lens.set(focus)(structure)
  const firstSet = lens.set(first)(structure)
  const secondSet = lens.set(second)(structure)
  const doubleSet = lens.set(second)(firstSet)
  const focusAfterFirstSet = lens.get(firstSet)

  const getSet = eqS(restored, structure)
  const setGet = eqA(focusAfterFirstSet, first)
  const setSet = eqS(doubleSet, secondSet)

  const failures: string[] = []
  if (!getSet) {
    failures.push(
      `get-set violated: set(get(s))(s) produced ${describe(restored)} instead of ${describe(structure)}`,
    )
  }
  if (!setGet) {
    failures.push(
      `set-get violated: get(set(a)(s)) produced ${describe(focusAfterFirstSet)} instead of ${describe(first)}`,
    )
  }
  if (!setSet) {
    failures.push(
      `set-set violated: set(b)(set(a)(s)) produced ${describe(doubleSet)} instead of ${describe(secondSet)}`,
    )
  }

  return {
    holds: getSet && setGet && setSet,
    getSet,
    setGet,
    setSet,
    witness: {
      original: structure,
      focus,
      restored,
      firstSet,
      secondSet,
      doubleSet,
      focusAfterFirstSet,
    },
    failures,
  }
}

export interface OptionalLawConfig<S, A> {
  readonly optional: Optional<S, A>
  readonly structure: S
  readonly first: A
  readonly second: A
  readonly equalsStructure?: Equality<S>
  readonly equalsFocus?: Equality<A>
}

export interface OptionalLawWitness<S, A> {
  readonly original: S
  readonly originalFocus: Option<A>
  readonly originalFocusWitness: OptionalFocusWitness<S, A>
  readonly restored: S
  readonly restoredUpdate?: OptionalUpdateWitness<S, A>
  readonly firstSet: S
  readonly firstUpdate: OptionalUpdateWitness<S, A>
  readonly firstFocus: Option<A>
  readonly firstFocusWitness: OptionalFocusWitness<S, A>
  readonly secondSet: S
  readonly secondUpdate: OptionalUpdateWitness<S, A>
  readonly secondFocus: Option<A>
  readonly secondFocusWitness: OptionalFocusWitness<S, A>
  readonly doubleSet: S
  readonly doubleUpdate: OptionalUpdateWitness<S, A>
}

export interface OptionalLawComponent {
  readonly holds: boolean
  readonly skipped: boolean
}

export interface OptionalLawReport<S, A> {
  readonly holds: boolean
  readonly getSet: OptionalLawComponent
  readonly setGet: OptionalLawComponent
  readonly setSet: OptionalLawComponent
  readonly witness: OptionalLawWitness<S, A>
  readonly failures: readonly string[]
}

export const checkOptionalLaws = <S, A>(config: OptionalLawConfig<S, A>): OptionalLawReport<S, A> => {
  const eqS = (config.equalsStructure ?? defaultEquality) as Equality<S>
  const eqA = (config.equalsFocus ?? defaultEquality) as Equality<A>
  const { optional, structure, first, second } = config

  const bundle = ensureOptionalWitness(optional)
  const originalFocusWitness = bundle.focus(structure)
  const originalFocus = focusWitnessToOption(originalFocusWitness)

  const restoredUpdate =
    originalFocusWitness.tag === "hit"
      ? bundle.update(structure, originalFocusWitness.focus)
      : undefined
  const restored =
    restoredUpdate != null
      ? restoredUpdate.tag === "updated"
        ? restoredUpdate.after
        : restoredUpdate.before
      : structure

  const firstUpdate = bundle.update(structure, first)
  const firstSet = firstUpdate.tag === "updated" ? firstUpdate.after : firstUpdate.before
  const firstFocusWitness = bundle.focus(firstSet)
  const firstFocus = focusWitnessToOption(firstFocusWitness)

  const secondUpdate = bundle.update(structure, second)
  const secondSet = secondUpdate.tag === "updated" ? secondUpdate.after : secondUpdate.before
  const secondFocusWitness = bundle.focus(secondSet)
  const secondFocus = focusWitnessToOption(secondFocusWitness)

  const doubleUpdate = bundle.update(firstSet, second)
  const doubleSet = doubleUpdate.tag === "updated" ? doubleUpdate.after : doubleUpdate.before

  const optionEq = equalsOption(eqA)

  const getSetHolds = originalFocusWitness.tag === "hit" ? eqS(restored, structure) : true
  const getSetSkipped = originalFocusWitness.tag !== "hit"

  const expectedFirst = Some(first)
  const setGetHolds = optionEq(firstFocus, expectedFirst)

  const setSetHolds = eqS(doubleSet, secondSet)

  const failures: string[] = []
  if (!getSetHolds) {
    const skipContext =
      restoredUpdate && restoredUpdate.tag === "skipped"
        ? ` (update skipped: ${describeMissReason(restoredUpdate.reason)})`
        : ""
    failures.push(
      `get-set violated: set(existing)(s) produced ${describe(restored)} instead of ${describe(structure)}${skipContext}`,
    )
  }
  if (!setGetHolds) {
    const updateContext =
      firstUpdate.tag === "skipped"
        ? ` (update skipped: ${describeMissReason(firstUpdate.reason)})`
        : ""
    failures.push(
      `set-get violated: get(set(a)(s)) produced ${describe(firstFocus)} instead of Some(${describe(first)})${updateContext}`,
    )
  }
  if (!setSetHolds) {
    const doubleContext =
      doubleUpdate.tag === "skipped"
        ? ` (double update skipped: ${describeMissReason(doubleUpdate.reason)})`
        : secondUpdate.tag === "skipped"
          ? ` (second update skipped: ${describeMissReason(secondUpdate.reason)})`
          : ""
    failures.push(
      `set-set violated: set(b)(set(a)(s)) produced ${describe(doubleSet)} instead of ${describe(secondSet)}${doubleContext}`,
    )
  }

  const holds = getSetHolds && setGetHolds && setSetHolds

  return {
    holds,
    getSet: { holds: getSetHolds, skipped: getSetSkipped },
    setGet: { holds: setGetHolds, skipped: false },
    setSet: { holds: setSetHolds, skipped: false },
    witness: {
      original: structure,
      originalFocus,
      originalFocusWitness,
      restored,
      restoredUpdate,
      firstSet,
      firstUpdate,
      firstFocus,
      firstFocusWitness,
      secondSet,
      secondUpdate,
      secondFocus,
      secondFocusWitness,
      doubleSet,
      doubleUpdate,
    },
    failures,
  }
}

export interface PrismLawConfig<S, A> {
  readonly prism: Prism<S, A>
  readonly matchSample: S
  readonly reviewSample: A
  readonly missSample?: S
  readonly equalsStructure?: Equality<S>
  readonly equalsFocus?: Equality<A>
}

export interface PrismLawWitness<S, A> {
  readonly matchWitness: PrismWitness<S, A>
  readonly matchPreview: Option<A>
  readonly reconstructedFromMatch?: S
  readonly reviewWitness: PrismBuildWitness<S, A>
  readonly reviewPreview: Option<A>
  readonly reviewPreviewWitness: PrismWitness<S, A>
  readonly missPreview: Option<A>
  readonly missWitness?: PrismWitness<S, A>
  readonly reviewed: S
}

export interface PrismLawComponent {
  readonly holds: boolean
  readonly skipped: boolean
}

export interface PrismLawReport<S, A> {
  readonly holds: boolean
  readonly previewReview: PrismLawComponent
  readonly reviewPreview: PrismLawComponent
  readonly witness: PrismLawWitness<S, A>
  readonly failures: readonly string[]
}

export const checkPrismLaws = <S, A>(config: PrismLawConfig<S, A>): PrismLawReport<S, A> => {
  const eqS = (config.equalsStructure ?? defaultEquality) as Equality<S>
  const eqA = (config.equalsFocus ?? defaultEquality) as Equality<A>
  const { prism, matchSample, reviewSample, missSample } = config

  const bundle = ensurePrismWitness(prism)
  const matchWitness = bundle.match(matchSample)
  const matchPreview = matchWitness.tag === "match" ? Some(matchWitness.focus) : None
  const reconstructedFromMatch =
    matchWitness.tag === "match" ? prism.reverseGet(matchWitness.focus) : undefined

  const reviewWitness = bundle.embed(reviewSample)
  const reviewed = reviewWitness.result
  const reviewPreviewWitness = bundle.match(reviewed)
  const reviewPreview =
    reviewPreviewWitness.tag === "match" ? Some(reviewPreviewWitness.focus) : None

  const missWitness = missSample == null ? undefined : bundle.match(missSample)
  const missPreview = missWitness == null ? None : missWitness.tag === "match" ? Some(missWitness.focus) : None

  const optionEq = equalsOption(eqA)

  const previewReviewHolds = optionEq(reviewPreview, Some(reviewSample))
  const reviewPreviewSkipped = matchWitness.tag !== "match"
  const reviewPreviewHolds = reviewPreviewSkipped ? true : eqS(reconstructedFromMatch!, matchSample)

  const failures: string[] = []
  if (!previewReviewHolds) {
    const rejectContext =
      reviewPreviewWitness.tag === "reject"
        ? ` (reject reason: ${describeMissReason(reviewPreviewWitness.reason)})`
        : ""
    failures.push(
      `preview-review violated: getOption(reverseGet(a)) produced ${describe(reviewPreview)} instead of Some(${describe(
        reviewSample,
      )})${rejectContext}`,
    )
  }
  if (!reviewPreviewHolds) {
    const skipContext =
      matchWitness.tag === "reject"
        ? ` (original preview rejected: ${describeMissReason(matchWitness.reason)})`
        : ""
    failures.push(
      `review-preview violated: reverseGet(getOption(s)) produced ${describe(
        reconstructedFromMatch,
      )} instead of ${describe(matchSample)}${skipContext}`,
    )
  }

  return {
    holds: previewReviewHolds && reviewPreviewHolds,
    previewReview: { holds: previewReviewHolds, skipped: false },
    reviewPreview: { holds: reviewPreviewHolds, skipped: reviewPreviewSkipped },
    witness: {
      matchWitness,
      matchPreview,
      reconstructedFromMatch,
      reviewWitness,
      reviewPreview,
      reviewPreviewWitness,
      missPreview,
      missWitness,
      reviewed,
    },
    failures,
  }
}
