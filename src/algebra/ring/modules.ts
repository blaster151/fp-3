import type { DeepReadonly } from "../../../stdlib/deep-freeze"
import type { Ring } from "./structures"

type Equality<A> = (left: A, right: A) => boolean

export interface Module<R, M> {
  readonly ring: Ring<R>
  readonly zero: M
  readonly add: (left: M, right: M) => M
  readonly neg: (value: M) => M
  readonly scalar: (scalar: R, value: M) => M
  readonly eq?: Equality<M>
  readonly name?: string
}

export interface ModuleHomomorphism<R, Domain, Codomain> {
  readonly source: Module<R, Domain>
  readonly target: Module<R, Codomain>
  readonly map: (value: Domain) => Codomain
  readonly label?: string
}

export type ModuleViolation<R, M> =
  | { readonly kind: "zero"; readonly value: M }
  | { readonly kind: "inverse"; readonly value: M }
  | { readonly kind: "addAssociative"; readonly triple: readonly [M, M, M] }
  | { readonly kind: "addCommutative"; readonly pair: readonly [M, M] }
  | { readonly kind: "leftDistributive"; readonly scalar: R; readonly pair: readonly [M, M] }
  | { readonly kind: "rightDistributive"; readonly scalars: readonly [R, R]; readonly value: M }
  | { readonly kind: "scalarAssociative"; readonly scalars: readonly [R, R]; readonly value: M }
  | { readonly kind: "scalarOne"; readonly value: M }
  | { readonly kind: "scalarZero"; readonly value: M }

export interface ModuleCheckOptions<R, M> {
  readonly scalarSamples?: ReadonlyArray<R>
  readonly vectorSamples?: ReadonlyArray<M>
}

export type ModuleHomomorphismViolation<R, Domain, Codomain> =
  | { readonly kind: "addition"; readonly pair: DeepReadonly<[Domain, Domain]> }
  | { readonly kind: "scalar"; readonly scalar: R; readonly value: Domain }

export interface ModuleHomomorphismCheck<R, Domain, Codomain> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<ModuleHomomorphismViolation<R, Domain, Codomain>>
  readonly details: string
  readonly metadata: {
    readonly vectorSamplesTested: number
    readonly scalarSamplesTested: number
    readonly additivePairsChecked: number
    readonly scalarPairsChecked: number
  }
}

export interface ModuleHomomorphismCheckOptions<R, Domain> {
  readonly vectorSamples?: ReadonlyArray<Domain>
  readonly scalarSamples?: ReadonlyArray<R>
}

export interface ModuleCheckResult<R, M> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<ModuleViolation<R, M>>
  readonly details: string
  readonly metadata: {
    readonly scalarSamples: number
    readonly vectorSamples: number
  }
}

const withEquality = <A>(eq?: Equality<A>): Equality<A> => eq ?? ((left, right) => Object.is(left, right))

export const checkModule = <R, M>(module: Module<R, M>, options: ModuleCheckOptions<R, M> = {}): ModuleCheckResult<R, M> => {
  const ring = module.ring
  const scalarSamples = options.scalarSamples ?? []
  const vectorSamples = options.vectorSamples ?? []
  const eq = withEquality(module.eq)
  const violations: ModuleViolation<R, M>[] = []

  for (const value of vectorSamples) {
    if (!eq(module.add(value, module.zero), value) || !eq(module.add(module.zero, value), value)) {
      violations.push({ kind: "zero", value })
    }

    if (!eq(module.add(value, module.neg(value)), module.zero)) {
      violations.push({ kind: "inverse", value })
    }

    if (!eq(module.scalar(ring.one, value), value)) {
      violations.push({ kind: "scalarOne", value })
    }

    if (!eq(module.scalar(ring.zero, value), module.zero)) {
      violations.push({ kind: "scalarZero", value })
    }
  }

  for (const left of vectorSamples) {
    for (const right of vectorSamples) {
      if (!eq(module.add(left, right), module.add(right, left))) {
        violations.push({ kind: "addCommutative", pair: [left, right] })
      }

      for (const tail of vectorSamples) {
        const leftAssociative = module.add(module.add(left, right), tail)
        const rightAssociative = module.add(left, module.add(right, tail))
        if (!eq(leftAssociative, rightAssociative)) {
          violations.push({ kind: "addAssociative", triple: [left, right, tail] })
        }
      }
    }
  }

  for (const scalar of scalarSamples) {
    for (const left of vectorSamples) {
      for (const right of vectorSamples) {
        const leftSide = module.scalar(scalar, module.add(left, right))
        const rightSide = module.add(module.scalar(scalar, left), module.scalar(scalar, right))
        if (!eq(leftSide, rightSide)) {
          violations.push({ kind: "leftDistributive", scalar, pair: [left, right] })
        }
      }
    }
  }

  for (const leftScalar of scalarSamples) {
    for (const rightScalar of scalarSamples) {
      for (const value of vectorSamples) {
        const rightDistributive = module.scalar(ring.add(leftScalar, rightScalar), value)
        const rhs = module.add(module.scalar(leftScalar, value), module.scalar(rightScalar, value))
        if (!eq(rightDistributive, rhs)) {
          violations.push({ kind: "rightDistributive", scalars: [leftScalar, rightScalar], value })
        }

        const assoc = module.scalar(leftScalar, module.scalar(rightScalar, value))
        const assocRhs = module.scalar(ring.mul(leftScalar, rightScalar), value)
        if (!eq(assoc, assocRhs)) {
          violations.push({ kind: "scalarAssociative", scalars: [leftScalar, rightScalar], value })
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `Module laws validated on ${scalarSamples.length} scalars and ${vectorSamples.length} vectors.`
    : `${violations.length} module constraints failed.`

  return {
    holds,
    violations,
    details,
    metadata: {
      scalarSamples: scalarSamples.length,
      vectorSamples: vectorSamples.length,
    },
  }
}

export const checkModuleHomomorphism = <R, Domain, Codomain>(
  hom: ModuleHomomorphism<R, Domain, Codomain>,
  options: ModuleHomomorphismCheckOptions<R, Domain> = {},
): ModuleHomomorphismCheck<R, Domain, Codomain> => {
  const vectorSamples = options.vectorSamples ?? []
  const scalarSamples = options.scalarSamples ?? []
  const eq = withEquality(hom.target.eq)
  const violations: ModuleHomomorphismViolation<R, Domain, Codomain>[] = []

  let additivePairsChecked = 0
  for (const left of vectorSamples) {
    for (const right of vectorSamples) {
      additivePairsChecked++
      const mappedLeft = hom.map(left)
      const mappedRight = hom.map(right)
      const additionPreserved = eq(
        hom.map(hom.source.add(left, right)),
        hom.target.add(mappedLeft, mappedRight),
      )

      if (!additionPreserved) {
        violations.push({ kind: "addition", pair: [left, right] })
      }
    }
  }

  let scalarPairsChecked = 0
  for (const scalar of scalarSamples) {
    for (const value of vectorSamples) {
      scalarPairsChecked++
      const mappedScalar = hom.map(hom.source.scalar(scalar, value))
      const scalarMapped = hom.target.scalar(scalar, hom.map(value))
      const scalarPreserved = eq(mappedScalar, scalarMapped)

      if (!scalarPreserved) {
        violations.push({ kind: "scalar", scalar, value })
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? `Module homomorphism preserved ${vectorSamples.length} vectors across ${scalarSamples.length} scalars.`
    : `${violations.length} module homomorphism constraints failed.`

  return {
    holds,
    violations,
    details,
    metadata: {
      vectorSamplesTested: vectorSamples.length,
      scalarSamplesTested: scalarSamples.length,
      additivePairsChecked,
      scalarPairsChecked,
    },
  }
}
