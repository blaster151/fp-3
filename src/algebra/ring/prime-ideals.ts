import type { RingIdeal } from "./ideals"
import type { Ring } from "./structures"

export interface PrimeIdealCheckOptions<A> {
  readonly ringSamples?: ReadonlyArray<A>
  readonly requireProper?: boolean
  readonly witnessLimit?: number
}

export type PrimeIdealViolation<A> =
  | {
      readonly kind: "unit"
      readonly unit: A
    }
  | {
      readonly kind: "absorbsProduct"
      readonly factors: readonly [A, A]
      readonly product: A
    }

export interface PrimeIdealWitness<A> {
  readonly product: A
  readonly factors: readonly [A, A]
}

export interface PrimeIdealCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<PrimeIdealViolation<A>>
  readonly witnesses: ReadonlyArray<PrimeIdealWitness<A>>
  readonly details: string
  readonly metadata: {
    readonly ringSampleCandidates: number
    readonly distinctRingSamples: number
    readonly pairChecks: number
    readonly requireProper: boolean
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

const defaultEquality = <A>(ring: Ring<A>): ((left: A, right: A) => boolean) =>
  ring.eq ?? ((left, right) => Object.is(left, right))

const uniqueWith = <A>(values: ReadonlyArray<A>, eq: (left: A, right: A) => boolean): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

const buildPairs = <A>(samples: ReadonlyArray<A>): ReadonlyArray<readonly [A, A]> => {
  const result: Array<readonly [A, A]> = []
  for (const left of samples) {
    for (const right of samples) {
      result.push([left, right])
    }
  }
  return result
}

export const checkPrimeIdeal = <A>(
  ideal: RingIdeal<A>,
  options: PrimeIdealCheckOptions<A> = {},
): PrimeIdealCheckResult<A> => {
  const ring = ideal.ring
  const eq = defaultEquality(ring)
  const sampleCandidates = options.ringSamples ?? []
  const samples = uniqueWith(sampleCandidates, eq)
  const requireProper = options.requireProper ?? true
  const witnessLimit = options.witnessLimit ?? 1

  const violations: PrimeIdealViolation<A>[] = []
  const witnesses: PrimeIdealWitness<A>[] = []

  if (requireProper && ideal.contains(ring.one)) {
    violations.push({ kind: "unit", unit: ring.one })
  }

  let pairChecks = 0
  for (const [left, right] of buildPairs(samples)) {
    pairChecks += 1
    const product = ring.mul(left, right)
    if (!ideal.contains(product)) {
      continue
    }
    if (ideal.contains(left) || ideal.contains(right)) {
      continue
    }

    const violation: PrimeIdealViolation<A> = {
      kind: "absorbsProduct",
      factors: [left, right],
      product,
    }
    violations.push(violation)

    if (witnesses.length < witnessLimit) {
      witnesses.push({ product, factors: [left, right] })
    }
  }

  const holds = violations.length === 0
  const describeViolation = (violation: PrimeIdealViolation<A>): string =>
    violation.kind === "unit"
      ? "ideal contains the multiplicative identity"
      : "product ab in ideal while a and b are outside"
  const details = holds
    ? `Prime ideal verified on ${samples.length} distinct ring samples.`
    : `Prime ideal violations: ${violations.map(describeViolation).join("; ")}.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      ringSampleCandidates: sampleCandidates.length,
      distinctRingSamples: samples.length,
      pairChecks,
      requireProper,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}
