import type { Ring } from "./structures"

export interface RingIdeal<A> {
  readonly ring: Ring<A>
  readonly contains: (value: A) => boolean
  readonly name?: string
}

export type IdealViolation<A> =
  | { readonly kind: "zero" }
  | { readonly kind: "membership"; readonly value: A }
  | { readonly kind: "additive"; readonly pair: readonly [A, A] }
  | { readonly kind: "negation"; readonly value: A }
  | { readonly kind: "leftAbsorption"; readonly pair: readonly [A, A] }
  | { readonly kind: "rightAbsorption"; readonly pair: readonly [A, A] }

export interface IdealCheckOptions<A> {
  readonly ringSamples?: ReadonlyArray<A>
  readonly candidateIdealSamples?: ReadonlyArray<A>
  readonly requireMembership?: boolean
}

export interface IdealCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<IdealViolation<A>>
  readonly details: string
  readonly metadata: {
    readonly checkedIdealElements: number
    readonly checkedRingElements: number
  }
}

const uniqueWith = <A>(values: ReadonlyArray<A>, eq: (left: A, right: A) => boolean): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

export const checkIdeal = <A>(ideal: RingIdeal<A>, options: IdealCheckOptions<A> = {}): IdealCheckResult<A> => {
  const eq = ideal.ring.eq ?? ((left: A, right: A) => Object.is(left, right))
  const ringSamples = options.ringSamples ?? []
  const candidateIdealSamples = options.candidateIdealSamples ?? ringSamples.filter(ideal.contains)
  const idealSamples = uniqueWith(candidateIdealSamples, eq)
  const violations: IdealViolation<A>[] = []

  if (!ideal.contains(ideal.ring.zero)) {
    violations.push({ kind: "zero" })
  }

  if (options.requireMembership === true) {
    for (const value of candidateIdealSamples) {
      if (!ideal.contains(value)) {
        violations.push({ kind: "membership", value })
      }
    }
  }

  for (const left of idealSamples) {
    const negated = ideal.ring.neg(left)
    if (!ideal.contains(negated)) {
      violations.push({ kind: "negation", value: left })
    }
  }

  for (const left of idealSamples) {
    for (const right of idealSamples) {
      const sum = ideal.ring.add(left, right)
      if (!ideal.contains(sum)) {
        violations.push({ kind: "additive", pair: [left, right] })
      }
    }
  }

  for (const r of ringSamples) {
    for (const a of idealSamples) {
      const leftProduct = ideal.ring.mul(r, a)
      if (!ideal.contains(leftProduct)) {
        violations.push({ kind: "leftAbsorption", pair: [r, a] })
      }

      const rightProduct = ideal.ring.mul(a, r)
      if (!ideal.contains(rightProduct)) {
        violations.push({ kind: "rightAbsorption", pair: [a, r] })
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `Ideal closed over ${idealSamples.length} generators and ${ringSamples.length} ring samples.`
    : `${violations.length} ideal closure checks failed.`

  return {
    holds,
    violations,
    details,
    metadata: {
      checkedIdealElements: idealSamples.length,
      checkedRingElements: ringSamples.length,
    },
  }
}
