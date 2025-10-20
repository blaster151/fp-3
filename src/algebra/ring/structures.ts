import type { DeepReadonly } from "../../../stdlib/deep-freeze"

export type Equality<A> = (left: A, right: A) => boolean

export interface Semiring<A> {
  readonly zero: A
  readonly one: A
  readonly add: (left: A, right: A) => A
  readonly mul: (left: A, right: A) => A
  readonly eq?: Equality<A>
}

export interface Ring<A> extends Semiring<A> {
  readonly neg: (value: A) => A
  readonly sub: (left: A, right: A) => A
}

export type SemiringViolation<A> =
  | { readonly kind: "addIdentity"; readonly value: A; readonly side: "left" | "right" }
  | { readonly kind: "mulIdentity"; readonly value: A; readonly side: "left" | "right" }
  | { readonly kind: "addAssociative"; readonly triple: readonly [A, A, A] }
  | { readonly kind: "mulAssociative"; readonly triple: readonly [A, A, A] }
  | { readonly kind: "leftDistributive"; readonly triple: readonly [A, A, A] }
  | { readonly kind: "rightDistributive"; readonly triple: readonly [A, A, A] }

export interface SemiringCheckOptions<A> {
  readonly samples?: ReadonlyArray<A>
}

export interface SemiringCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<SemiringViolation<A>>
  readonly details: string
  readonly metadata: {
    readonly sampleCount: number
    readonly additiveIdentityChecks: number
    readonly multiplicativeIdentityChecks: number
    readonly additiveAssociativityChecks: number
    readonly multiplicativeAssociativityChecks: number
    readonly leftDistributiveChecks: number
    readonly rightDistributiveChecks: number
  }
}

export type RingViolation<A> =
  | { readonly kind: "addIdentity"; readonly value: A; readonly side: "left" | "right" }
  | { readonly kind: "addInverse"; readonly value: A }
  | { readonly kind: "addAssociative"; readonly triple: readonly [A, A, A] }
  | { readonly kind: "addCommutative"; readonly pair: readonly [A, A] }
  | { readonly kind: "mulIdentity"; readonly value: A; readonly side: "left" | "right" }
  | { readonly kind: "mulAssociative"; readonly triple: readonly [A, A, A] }
  | { readonly kind: "zeroAnnihilation"; readonly value: A; readonly side: "left" | "right" }
  | { readonly kind: "leftDistributive"; readonly triple: readonly [A, A, A] }
  | { readonly kind: "rightDistributive"; readonly triple: readonly [A, A, A] }
  | { readonly kind: "subConsistent"; readonly pair: readonly [A, A] }

export interface RingCheckOptions<A> {
  readonly samples?: ReadonlyArray<A>
}

export interface RingCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<RingViolation<A>>
  readonly details: string
  readonly metadata: {
    readonly sampleCount: number
    readonly additivePairsChecked: number
    readonly additiveTriplesChecked: number
    readonly multiplicativeTriplesChecked: number
    readonly leftDistributiveTriplesChecked: number
    readonly rightDistributiveTriplesChecked: number
    readonly subConsistencyChecks: number
    readonly zeroAnnihilationChecks: number
  }
}

export interface RingHomomorphism<Domain, Codomain> {
  readonly source: Ring<Domain>
  readonly target: Ring<Codomain>
  readonly map: (value: Domain) => Codomain
  readonly label?: string
}

export type RingHomomorphismViolation<Domain, Codomain> =
  | { readonly kind: "zero" }
  | { readonly kind: "one" }
  | { readonly kind: "addition"; readonly pair: DeepReadonly<[Domain, Domain]> }
  | { readonly kind: "multiplication"; readonly pair: DeepReadonly<[Domain, Domain]> }
  | { readonly kind: "negation"; readonly value: Domain }

export interface RingHomomorphismCheck<Domain, Codomain> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<RingHomomorphismViolation<Domain, Codomain>>
  readonly details: string
  readonly metadata: {
    readonly samplesTested: number
    readonly additivePairsChecked: number
    readonly multiplicativePairsChecked: number
  }
}

export interface RingHomomorphismCheckOptions<Domain> {
  readonly samples?: ReadonlyArray<Domain>
  readonly includeNegation?: boolean
}

const withEquality = <A>(eq?: Equality<A>): Equality<A> =>
  eq ?? ((left, right) => Object.is(left, right))

export const checkSemiring = <A>(
  semiring: Semiring<A>,
  options: SemiringCheckOptions<A> = {},
): SemiringCheckResult<A> => {
  const samples = options.samples ?? []
  const eq = withEquality(semiring.eq)
  const violations: SemiringViolation<A>[] = []

  let additiveIdentityChecks = 0
  let multiplicativeIdentityChecks = 0
  for (const value of samples) {
    const addRight = semiring.add(value, semiring.zero)
    additiveIdentityChecks++
    if (!eq(addRight, value)) {
      violations.push({ kind: "addIdentity", value, side: "right" })
    }

    const addLeft = semiring.add(semiring.zero, value)
    additiveIdentityChecks++
    if (!eq(addLeft, value)) {
      violations.push({ kind: "addIdentity", value, side: "left" })
    }

    const mulRight = semiring.mul(value, semiring.one)
    multiplicativeIdentityChecks++
    if (!eq(mulRight, value)) {
      violations.push({ kind: "mulIdentity", value, side: "right" })
    }

    const mulLeft = semiring.mul(semiring.one, value)
    multiplicativeIdentityChecks++
    if (!eq(mulLeft, value)) {
      violations.push({ kind: "mulIdentity", value, side: "left" })
    }
  }

  let additiveAssociativityChecks = 0
  let multiplicativeAssociativityChecks = 0
  let leftDistributiveChecks = 0
  let rightDistributiveChecks = 0
  for (const a of samples) {
    for (const b of samples) {
      for (const c of samples) {
        additiveAssociativityChecks++
        const addLeftAssoc = semiring.add(semiring.add(a, b), c)
        const addRightAssoc = semiring.add(a, semiring.add(b, c))
        if (!eq(addLeftAssoc, addRightAssoc)) {
          violations.push({ kind: "addAssociative", triple: [a, b, c] })
        }

        multiplicativeAssociativityChecks++
        const mulLeftAssoc = semiring.mul(semiring.mul(a, b), c)
        const mulRightAssoc = semiring.mul(a, semiring.mul(b, c))
        if (!eq(mulLeftAssoc, mulRightAssoc)) {
          violations.push({ kind: "mulAssociative", triple: [a, b, c] })
        }

        leftDistributiveChecks++
        const leftDistributiveLeft = semiring.mul(a, semiring.add(b, c))
        const leftDistributiveRight = semiring.add(
          semiring.mul(a, b),
          semiring.mul(a, c),
        )
        if (!eq(leftDistributiveLeft, leftDistributiveRight)) {
          violations.push({ kind: "leftDistributive", triple: [a, b, c] })
        }

        rightDistributiveChecks++
        const rightDistributiveLeft = semiring.mul(semiring.add(a, b), c)
        const rightDistributiveRight = semiring.add(
          semiring.mul(a, c),
          semiring.mul(b, c),
        )
        if (!eq(rightDistributiveLeft, rightDistributiveRight)) {
          violations.push({ kind: "rightDistributive", triple: [a, b, c] })
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `Semiring laws validated on ${samples.length} elements.`
    : `${violations.length} semiring constraints failed.`

  return {
    holds,
    violations,
    details,
    metadata: {
      sampleCount: samples.length,
      additiveIdentityChecks,
      multiplicativeIdentityChecks,
      additiveAssociativityChecks,
      multiplicativeAssociativityChecks,
      leftDistributiveChecks,
      rightDistributiveChecks,
    },
  }
}

export const checkRing = <A>(ring: Ring<A>, options: RingCheckOptions<A> = {}): RingCheckResult<A> => {
  const samples = options.samples ?? []
  const eq = withEquality(ring.eq)
  const violations: RingViolation<A>[] = []

  let zeroAnnihilationChecks = 0
  for (const value of samples) {
    const rightIdentity = ring.add(value, ring.zero)
    if (!eq(rightIdentity, value)) {
      violations.push({ kind: "addIdentity", value, side: "right" })
    }

    const leftIdentity = ring.add(ring.zero, value)
    if (!eq(leftIdentity, value)) {
      violations.push({ kind: "addIdentity", value, side: "left" })
    }

    const hasInverse = ring.add(value, ring.neg(value))
    if (!eq(hasInverse, ring.zero)) {
      violations.push({ kind: "addInverse", value })
    }

    const rightMulIdentity = ring.mul(value, ring.one)
    if (!eq(rightMulIdentity, value)) {
      violations.push({ kind: "mulIdentity", value, side: "right" })
    }

    const leftMulIdentity = ring.mul(ring.one, value)
    if (!eq(leftMulIdentity, value)) {
      violations.push({ kind: "mulIdentity", value, side: "left" })
    }

    const rightZero = ring.mul(value, ring.zero)
    zeroAnnihilationChecks++
    if (!eq(rightZero, ring.zero)) {
      violations.push({ kind: "zeroAnnihilation", value, side: "right" })
    }

    const leftZero = ring.mul(ring.zero, value)
    zeroAnnihilationChecks++
    if (!eq(leftZero, ring.zero)) {
      violations.push({ kind: "zeroAnnihilation", value, side: "left" })
    }
  }

  let additivePairsChecked = 0
  let subConsistencyChecks = 0
  for (const left of samples) {
    for (const right of samples) {
      const sumLeftRight = ring.add(left, right)
      const sumRightLeft = ring.add(right, left)
      additivePairsChecked++
      if (!eq(sumLeftRight, sumRightLeft)) {
        violations.push({ kind: "addCommutative", pair: [left, right] })
      }

      const difference = ring.sub(left, right)
      const reconstructed = ring.add(left, ring.neg(right))
      subConsistencyChecks++
      if (!eq(difference, reconstructed)) {
        violations.push({ kind: "subConsistent", pair: [left, right] })
      }
    }
  }

  let additiveTriplesChecked = 0
  for (const a of samples) {
    for (const b of samples) {
      for (const c of samples) {
        additiveTriplesChecked++
        const leftAssociative = ring.add(ring.add(a, b), c)
        const rightAssociative = ring.add(a, ring.add(b, c))
        if (!eq(leftAssociative, rightAssociative)) {
          violations.push({ kind: "addAssociative", triple: [a, b, c] })
        }
      }
    }
  }

  let multiplicativeTriplesChecked = 0
  for (const a of samples) {
    for (const b of samples) {
      for (const c of samples) {
        multiplicativeTriplesChecked++
        const leftAssociative = ring.mul(ring.mul(a, b), c)
        const rightAssociative = ring.mul(a, ring.mul(b, c))
        if (!eq(leftAssociative, rightAssociative)) {
          violations.push({ kind: "mulAssociative", triple: [a, b, c] })
        }
      }
    }
  }

  let leftDistributiveTriplesChecked = 0
  let rightDistributiveTriplesChecked = 0
  for (const a of samples) {
    for (const b of samples) {
      for (const c of samples) {
        leftDistributiveTriplesChecked++
        const leftSide = ring.mul(a, ring.add(b, c))
        const rightSide = ring.add(ring.mul(a, b), ring.mul(a, c))
        if (!eq(leftSide, rightSide)) {
          violations.push({ kind: "leftDistributive", triple: [a, b, c] })
        }

        rightDistributiveTriplesChecked++
        const rightMul = ring.mul(ring.add(a, b), c)
        const rightMulExpanded = ring.add(ring.mul(a, c), ring.mul(b, c))
        if (!eq(rightMul, rightMulExpanded)) {
          violations.push({ kind: "rightDistributive", triple: [a, b, c] })
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `Ring laws validated on ${samples.length} elements.`
    : `${violations.length} ring constraints failed.`

  return {
    holds,
    violations,
    details,
    metadata: {
      sampleCount: samples.length,
      additivePairsChecked,
      additiveTriplesChecked,
      multiplicativeTriplesChecked,
      leftDistributiveTriplesChecked,
      rightDistributiveTriplesChecked,
      subConsistencyChecks,
      zeroAnnihilationChecks,
    },
  }
}

export const checkRingHomomorphism = <Domain, Codomain>(
  hom: RingHomomorphism<Domain, Codomain>,
  options: RingHomomorphismCheckOptions<Domain> = {},
): RingHomomorphismCheck<Domain, Codomain> => {
  const samples = options.samples ?? []
  const eq = withEquality(hom.target.eq)
  const violations: RingHomomorphismViolation<Domain, Codomain>[] = []

  if (!eq(hom.map(hom.source.zero), hom.target.zero)) {
    violations.push({ kind: "zero" })
  }

  if (!eq(hom.map(hom.source.one), hom.target.one)) {
    violations.push({ kind: "one" })
  }

  let additivePairsChecked = 0
  let multiplicativePairsChecked = 0
  for (const left of samples) {
    for (const right of samples) {
      const mappedLeft = hom.map(left)
      const mappedRight = hom.map(right)

      const additionPreserved = eq(
        hom.map(hom.source.add(left, right)),
        hom.target.add(mappedLeft, mappedRight),
      )
      additivePairsChecked++
      if (!additionPreserved) {
        violations.push({ kind: "addition", pair: [left, right] })
      }

      const multiplicationPreserved = eq(
        hom.map(hom.source.mul(left, right)),
        hom.target.mul(mappedLeft, mappedRight),
      )
      multiplicativePairsChecked++
      if (!multiplicationPreserved) {
        violations.push({ kind: "multiplication", pair: [left, right] })
      }
    }
  }

  if (options.includeNegation !== false) {
    for (const value of samples) {
      const negationPreserved = eq(
        hom.map(hom.source.neg(value)),
        hom.target.neg(hom.map(value)),
      )
      if (!negationPreserved) {
        violations.push({ kind: "negation", value })
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `Ring homomorphism preserved ${samples.length} samples.`
    : `${violations.length} homomorphism constraints failed.`

  return {
    holds,
    violations,
    details,
    metadata: {
      samplesTested: samples.length,
      additivePairsChecked,
      multiplicativePairsChecked,
    },
  }
}
