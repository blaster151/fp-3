import type { Ring } from "./structures"
import type { RingIdeal } from "./ideals"

export interface QuotientElement<A> {
  readonly representative: A
}

export interface QuotientConstruction<A> {
  readonly base: Ring<A>
  readonly ideal: RingIdeal<A>
  readonly reduce: (value: A) => A
  readonly name?: string
}

export interface QuotientRing<A> {
  readonly base: Ring<A>
  readonly ideal: RingIdeal<A>
  readonly ring: Ring<QuotientElement<A>>
  readonly project: (value: A) => QuotientElement<A>
  readonly representative: (value: QuotientElement<A>) => A
  readonly name?: string
}

const makeCoset = <A>(reduce: (value: A) => A, value: A): QuotientElement<A> => ({
  representative: reduce(value),
})

export const buildQuotientRing = <A>(construction: QuotientConstruction<A>): QuotientRing<A> => {
  const { base, ideal, reduce } = construction
  const cosetEq = (left: QuotientElement<A>, right: QuotientElement<A>): boolean =>
    ideal.contains(base.sub(left.representative, right.representative))

  const lift = (value: QuotientElement<A>): A => value.representative

  const ring: Ring<QuotientElement<A>> = {
    zero: makeCoset(reduce, base.zero),
    one: makeCoset(reduce, base.one),
    add: (left, right) => makeCoset(reduce, base.add(lift(left), lift(right))),
    mul: (left, right) => makeCoset(reduce, base.mul(lift(left), lift(right))),
    neg: (value) => makeCoset(reduce, base.neg(lift(value))),
    sub: (left, right) => makeCoset(reduce, base.sub(lift(left), lift(right))),
    eq: (left, right) => cosetEq(left, right),
  }

  return {
    base,
    ideal,
    ring,
    project: (value: A) => makeCoset(reduce, value),
    representative: lift,
    name: construction.name,
  }
}

export interface QuotientCheckOptions<A> {
  readonly samples?: ReadonlyArray<A>
}

export interface QuotientCheckResult<A> {
  readonly holds: boolean
  readonly details: string
  readonly violations: ReadonlyArray<{ readonly kind: string; readonly witness: readonly [A, A?] }>
  readonly metadata: {
    readonly samples: number
    readonly idempotenceChecks: number
    readonly cosetComparisons: number
  }
}

const toViolation = <A>(kind: string, witness: readonly [A, A?]): { readonly kind: string; readonly witness: readonly [A, A?] } => ({
  kind,
  witness,
})

export const checkQuotientRing = <A>(quotient: QuotientRing<A>, options: QuotientCheckOptions<A> = {}): QuotientCheckResult<A> => {
  const samples = options.samples ?? []
  const eq = quotient.ring.eq ?? ((left: QuotientElement<A>, right: QuotientElement<A>) => Object.is(left, right))
  const baseEq = quotient.base.eq ?? ((left: A, right: A) => Object.is(left, right))
  const violations: Array<{ readonly kind: string; readonly witness: readonly [A, A?] }> = []

  const project = quotient.project

  let idempotenceChecks = 0
  let cosetComparisons = 0

  for (const value of samples) {
    const projected = project(value)
    const canonical = quotient.representative(projected)
    const secondPass = quotient.representative(project(canonical))
    idempotenceChecks += 1
    if (!baseEq(secondPass, canonical)) {
      violations.push(toViolation("reductionIdempotence", [value]))
    }

    const projectedNeg = quotient.ring.neg(projected)
    const baseNeg = project(quotient.base.neg(value))
    if (!eq(projectedNeg, baseNeg)) {
      violations.push(toViolation("negation", [value]))
    }

    const projectedZero = quotient.ring.sub(projected, projected)
    if (!eq(projectedZero, quotient.ring.zero)) {
      violations.push(toViolation("zero", [value]))
    }
  }

  for (const left of samples) {
    for (const right of samples) {
      const leftProjected = project(left)
      const rightProjected = project(right)

      if (quotient.ideal.contains(quotient.base.sub(left, right))) {
        cosetComparisons += 1
        if (!eq(leftProjected, rightProjected)) {
          violations.push(toViolation("cosetEquality", [left, right]))
        }
      }

      const projectedSum = quotient.ring.add(leftProjected, rightProjected)
      const baseSum = project(quotient.base.add(left, right))
      if (!eq(projectedSum, baseSum)) {
        violations.push(toViolation("addition", [left, right]))
      }

      const projectedProduct = quotient.ring.mul(leftProjected, rightProjected)
      const baseProduct = project(quotient.base.mul(left, right))
      if (!eq(projectedProduct, baseProduct)) {
        violations.push(toViolation("multiplication", [left, right]))
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `Quotient ring respected ${samples.length} sample representatives with ${idempotenceChecks} idempotence checks and ${cosetComparisons} coset comparisons.`
    : `${violations.length} quotient ring constraints failed after ${idempotenceChecks} idempotence checks and ${cosetComparisons} coset comparisons.`

  return {
    holds,
    details,
    violations,
    metadata: {
      samples: samples.length,
      idempotenceChecks,
      cosetComparisons,
    },
  }
}
