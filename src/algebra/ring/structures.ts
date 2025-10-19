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
