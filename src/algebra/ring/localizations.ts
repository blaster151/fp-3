import type { PrimeSpectrumPoint } from "../../schemes/prime-spectrum"
import type { MultiplicativeSet } from "./multiplicative-sets"
import type { Ring, RingHomomorphism, RingHomomorphismCheck } from "./structures"
import { checkRingHomomorphism } from "./structures"

export interface LocalizationFraction<A> {
  readonly numerator: A
  readonly denominator: A
}

export interface LocalizationRingData<A> {
  readonly base: Ring<A>
  readonly multiplicativeSet: MultiplicativeSet<A>
}

export interface FractionEqualityWitness<A> {
  readonly multiplier: A
  readonly cleared: A
}

export interface LocalizationRingWitness<A> {
  readonly relation: string
  readonly left: LocalizationFraction<A>
  readonly right: LocalizationFraction<A>
  readonly multiplier: A
}

export interface LocalizationUniversalProperty<A> {
  readonly localizedRing: Ring<LocalizationFraction<A>>
  readonly unit: RingHomomorphism<A, LocalizationFraction<A>>
  readonly counit: RingHomomorphism<LocalizationFraction<A>, LocalizationFraction<A>>
  readonly unitCheck: RingHomomorphismCheck<A, LocalizationFraction<A>>
  readonly counitCheck: RingHomomorphismCheck<LocalizationFraction<A>, LocalizationFraction<A>>
}

export type LocalizationRingViolation<A> =
  | { readonly kind: "baseMismatch" }
  | { readonly kind: "denominatorOutsideSet"; readonly denominator: A }
  | { readonly kind: "additionIdentity"; readonly value: LocalizationFraction<A> }
  | { readonly kind: "multiplicationIdentity"; readonly value: LocalizationFraction<A> }
  | { readonly kind: "additiveInverse"; readonly value: LocalizationFraction<A> }
  | { readonly kind: "additionCommutative"; readonly left: LocalizationFraction<A>; readonly right: LocalizationFraction<A> }
  | { readonly kind: "multiplicationCommutative"; readonly left: LocalizationFraction<A>; readonly right: LocalizationFraction<A> }
  | { readonly kind: "additiveClosure"; readonly left: LocalizationFraction<A>; readonly right: LocalizationFraction<A>; readonly denominator: A }
  | { readonly kind: "multiplicativeClosure"; readonly left: LocalizationFraction<A>; readonly right: LocalizationFraction<A>; readonly denominator: A }
  | { readonly kind: "distributive"; readonly scalar: LocalizationFraction<A>; readonly left: LocalizationFraction<A>; readonly right: LocalizationFraction<A> }

export interface LocalizationRingCheckOptions<A> {
  readonly numeratorSamples?: ReadonlyArray<A>
  readonly denominatorSamples?: ReadonlyArray<A>
  readonly multiplierSamples?: ReadonlyArray<A>
  readonly fractionSamples?: ReadonlyArray<LocalizationFraction<A>>
  readonly witnessLimit?: number
}

export interface LocalizationRingCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<LocalizationRingViolation<A>>
  readonly witnesses: ReadonlyArray<LocalizationRingWitness<A>>
  readonly details: string
  readonly universalProperty: LocalizationUniversalProperty<A>
  readonly metadata: {
    readonly numeratorSamples: number
    readonly denominatorSamples: number
    readonly fractionSamples: number
    readonly multiplierSamples: number
    readonly equalityChecks: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
    readonly unitSamplesTested: number
    readonly counitSamplesTested: number
  }
}

const dedupe = <A>(values: ReadonlyArray<A>, eq: (left: A, right: A) => boolean): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

const fraction = <A>(numerator: A, denominator: A): LocalizationFraction<A> => ({ numerator, denominator })

const addFractions = <A>(ring: Ring<A>, left: LocalizationFraction<A>, right: LocalizationFraction<A>): LocalizationFraction<A> => {
  const leftScaled = ring.mul(left.numerator, right.denominator)
  const rightScaled = ring.mul(right.numerator, left.denominator)
  const numerator = ring.add(leftScaled, rightScaled)
  const denominator = ring.mul(left.denominator, right.denominator)
  return fraction(numerator, denominator)
}

const multiplyFractions = <A>(ring: Ring<A>, left: LocalizationFraction<A>, right: LocalizationFraction<A>): LocalizationFraction<A> => {
  const numerator = ring.mul(left.numerator, right.numerator)
  const denominator = ring.mul(left.denominator, right.denominator)
  return fraction(numerator, denominator)
}

const negateFraction = <A>(ring: Ring<A>, value: LocalizationFraction<A>): LocalizationFraction<A> =>
  fraction(ring.neg(value.numerator), value.denominator)

const tryEqualityWitness = <A>(
  ring: Ring<A>,
  multiplicativeSet: MultiplicativeSet<A>,
  multipliers: ReadonlyArray<A>,
  left: LocalizationFraction<A>,
  right: LocalizationFraction<A>,
  eq: (left: A, right: A) => boolean,
): FractionEqualityWitness<A> | undefined => {
  const crossLeft = ring.mul(left.numerator, right.denominator)
  const crossRight = ring.mul(right.numerator, left.denominator)
  const difference = ring.sub(crossLeft, crossRight)

  for (const multiplier of multipliers) {
    if (!multiplicativeSet.contains(multiplier)) {
      continue
    }
    const cleared = ring.mul(multiplier, difference)
    if (eq(cleared, ring.zero)) {
      return { multiplier, cleared }
    }
  }

  return undefined
}

const buildFractionSamples = <A>(
  ring: Ring<A>,
  numerators: ReadonlyArray<A>,
  denominators: ReadonlyArray<A>,
  baseFractions: ReadonlyArray<LocalizationFraction<A>>,
): LocalizationFraction<A>[] => {
  const samples: LocalizationFraction<A>[] = []
  samples.push(...baseFractions)
  for (const numerator of numerators) {
    samples.push(fraction(numerator, ring.one))
    for (const denominator of denominators) {
      samples.push(fraction(numerator, denominator))
    }
  }
  return samples
}

export const checkLocalizationRing = <A>(
  data: LocalizationRingData<A>,
  options: LocalizationRingCheckOptions<A> = {},
): LocalizationRingCheckResult<A> => {
  const { base, multiplicativeSet } = data
  const baseEq = base.eq ?? ((left: A, right: A) => Object.is(left, right))
  const witnessLimit = options.witnessLimit ?? 8

  const numeratorSamples = dedupe(options.numeratorSamples ?? [], baseEq)
  const denominatorSamples = dedupe(options.denominatorSamples ?? [], baseEq)
  const baseFractions = options.fractionSamples ?? []
  const multiplierPool = [base.one, ...denominatorSamples, ...(options.multiplierSamples ?? [])]
  const multiplierSamples = dedupe(multiplierPool, baseEq)

  const witnesses: LocalizationRingWitness<A>[] = []
  const violations: LocalizationRingViolation<A>[] = []

  if (multiplicativeSet.ring !== base) {
    violations.push({ kind: "baseMismatch" })
  }

  const zero = fraction(base.zero, base.one)
  const one = fraction(base.one, base.one)

  const fractions = buildFractionSamples(base, numeratorSamples, denominatorSamples, baseFractions)
  fractions.push(zero, one)
  const fractionSamples = dedupe(fractions, (left, right) =>
    baseEq(left.numerator, right.numerator) && baseEq(left.denominator, right.denominator),
  )

  for (const denominator of denominatorSamples) {
    if (!multiplicativeSet.contains(denominator)) {
      violations.push({ kind: "denominatorOutsideSet", denominator })
    }
  }

  for (const sample of fractionSamples) {
    if (!multiplicativeSet.contains(sample.denominator)) {
      violations.push({ kind: "denominatorOutsideSet", denominator: sample.denominator })
    }
  }

  let equalityChecks = 0
  const recordWitness = (
    relation: string,
    left: LocalizationFraction<A>,
    right: LocalizationFraction<A>,
    witness: FractionEqualityWitness<A>,
  ) => {
    if (witnesses.length < witnessLimit) {
      witnesses.push({ relation, left, right, multiplier: witness.multiplier })
    }
  }

  const requireEquality = (
    relation: string,
    left: LocalizationFraction<A>,
    right: LocalizationFraction<A>,
  ): boolean => {
    equalityChecks += 1
    const witness = tryEqualityWitness(base, multiplicativeSet, multiplierSamples, left, right, baseEq)
    if (witness === undefined) {
      return false
    }
    recordWitness(relation, left, right, witness)
    return true
  }

  for (const value of fractionSamples) {
    const sumRight = addFractions(base, value, zero)
    if (!requireEquality("addIdentityRight", sumRight, value)) {
      violations.push({ kind: "additionIdentity", value })
    }
    const sumLeft = addFractions(base, zero, value)
    if (!requireEquality("addIdentityLeft", sumLeft, value)) {
      violations.push({ kind: "additionIdentity", value })
    }

    const negated = negateFraction(base, value)
    const additiveCancellation = addFractions(base, value, negated)
    if (!requireEquality("addInverse", additiveCancellation, zero)) {
      violations.push({ kind: "additiveInverse", value })
    }

    const productRight = multiplyFractions(base, value, one)
    if (!requireEquality("mulIdentityRight", productRight, value)) {
      violations.push({ kind: "multiplicationIdentity", value })
    }
    const productLeft = multiplyFractions(base, one, value)
    if (!requireEquality("mulIdentityLeft", productLeft, value)) {
      violations.push({ kind: "multiplicationIdentity", value })
    }
  }

  for (const left of fractionSamples) {
    for (const right of fractionSamples) {
      const sum = addFractions(base, left, right)
      if (!multiplicativeSet.contains(sum.denominator)) {
        violations.push({ kind: "additiveClosure", left, right, denominator: sum.denominator })
      }
      const reverse = addFractions(base, right, left)
      if (!requireEquality("addCommutative", sum, reverse)) {
        violations.push({ kind: "additionCommutative", left, right })
      }

      const product = multiplyFractions(base, left, right)
      if (!multiplicativeSet.contains(product.denominator)) {
        violations.push({ kind: "multiplicativeClosure", left, right, denominator: product.denominator })
      }
      const flip = multiplyFractions(base, right, left)
      if (!requireEquality("mulCommutative", product, flip)) {
        violations.push({ kind: "multiplicationCommutative", left, right })
      }
    }
  }

  for (const scalar of fractionSamples) {
    for (const left of fractionSamples) {
      for (const right of fractionSamples) {
        const sum = addFractions(base, left, right)
        const leftSide = multiplyFractions(base, scalar, sum)
        const rightSide = addFractions(
          base,
          multiplyFractions(base, scalar, left),
          multiplyFractions(base, scalar, right),
        )
        if (!requireEquality("distributive", leftSide, rightSide)) {
          violations.push({ kind: "distributive", scalar, left, right })
        }
      }
    }
  }

  const fractionEq = (
    left: LocalizationFraction<A>,
    right: LocalizationFraction<A>,
  ): boolean =>
    tryEqualityWitness(base, multiplicativeSet, multiplierSamples, left, right, baseEq) !== undefined

  const localizedRing: Ring<LocalizationFraction<A>> = {
    zero,
    one,
    add: (left, right) => addFractions(base, left, right),
    mul: (left, right) => multiplyFractions(base, left, right),
    neg: (value) => negateFraction(base, value),
    sub: (left, right) => addFractions(base, left, negateFraction(base, right)),
    eq: fractionEq,
  }

  const unit: RingHomomorphism<A, LocalizationFraction<A>> = {
    source: base,
    target: localizedRing,
    map: (value: A) => fraction(value, base.one),
    label: "η",
  }

  const counit: RingHomomorphism<LocalizationFraction<A>, LocalizationFraction<A>> = {
    source: localizedRing,
    target: localizedRing,
    map: (value) => value,
    label: "id",
  }

  const unitCheck = checkRingHomomorphism(unit, { samples: numeratorSamples })
  const counitCheck = checkRingHomomorphism(counit, { samples: fractionSamples })

  const universalProperty: LocalizationUniversalProperty<A> = {
    localizedRing,
    unit,
    counit,
    unitCheck,
    counitCheck,
  }

  const holds = violations.length === 0
  const details = holds
    ? `Localization ring laws verified on ${fractionSamples.length} fraction samples with canonical homomorphisms.`
    : `${violations.length} localization ring checks failed.`

  return {
    holds,
    violations,
    witnesses,
    details,
    universalProperty,
    metadata: {
      numeratorSamples: numeratorSamples.length,
      denominatorSamples: denominatorSamples.length,
      fractionSamples: fractionSamples.length,
      multiplierSamples: multiplierSamples.length,
      equalityChecks,
      witnessLimit,
      witnessesRecorded: witnesses.length,
      unitSamplesTested: unitCheck.metadata.samplesTested,
      counitSamplesTested: counitCheck.metadata.samplesTested,
    },
  }
}

export type PrimeLocalizationData<A> =
  | {
      readonly kind: "success"
      readonly data: LocalizationRingData<A>
    }
  | {
      readonly kind: "multiplicativeSetRingMismatch"
      readonly point: PrimeSpectrumPoint<A>
      readonly multiplicativeSet: MultiplicativeSet<A>
    }

export const buildPrimeLocalizationData = <A>(
  point: PrimeSpectrumPoint<A>,
  multiplicativeSet: MultiplicativeSet<A>,
): PrimeLocalizationData<A> => {
  const base = point.ideal.ring
  if (multiplicativeSet.ring !== base) {
    return { kind: "multiplicativeSetRingMismatch", point, multiplicativeSet }
  }
  return {
    kind: "success",
    data: {
      base,
      multiplicativeSet,
    },
  }
}
