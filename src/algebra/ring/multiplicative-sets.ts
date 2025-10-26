import type { Ring } from "./structures"

export interface MultiplicativeSet<A> {
  readonly ring: Ring<A>
  readonly contains: (value: A) => boolean
  readonly label?: string
}

export interface MultiplicativeSetCheckOptions<A> {
  readonly ringSamples?: ReadonlyArray<A>
  readonly requireOne?: boolean
  readonly forbidZero?: boolean
  readonly witnessLimit?: number
}

export type MultiplicativeSetViolation<A> =
  | { readonly kind: "missingOne" }
  | { readonly kind: "containsZero" }
  | {
      readonly kind: "notClosed"
      readonly factors: readonly [A, A]
      readonly product: A
    }

export interface MultiplicativeSetWitness<A> {
  readonly factors: readonly [A, A]
  readonly product: A
}

export interface MultiplicativeSetCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<MultiplicativeSetViolation<A>>
  readonly witnesses: ReadonlyArray<MultiplicativeSetWitness<A>>
  readonly details: string
  readonly metadata: {
    readonly ringSampleCandidates: number
    readonly distinctRingSamples: number
    readonly pairChecks: number
    readonly requireOne: boolean
    readonly forbidZero: boolean
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

const withEquality = <A>(ring: Ring<A>): ((left: A, right: A) => boolean) =>
  ring.eq ?? ((left, right) => Object.is(left, right))

const dedupeSamples = <A>(
  samples: ReadonlyArray<A>,
  eq: (left: A, right: A) => boolean,
): A[] => {
  const result: A[] = []
  for (const sample of samples) {
    if (!result.some(existing => eq(existing, sample))) {
      result.push(sample)
    }
  }
  return result
}

const buildPairs = <A>(values: ReadonlyArray<A>): ReadonlyArray<readonly [A, A]> => {
  const result: Array<readonly [A, A]> = []
  for (const left of values) {
    for (const right of values) {
      result.push([left, right])
    }
  }
  return result
}

export const checkMultiplicativeSet = <A>(
  set: MultiplicativeSet<A>,
  options: MultiplicativeSetCheckOptions<A> = {},
): MultiplicativeSetCheckResult<A> => {
  const { ring } = set
  const eq = withEquality(ring)
  const sampleCandidates = options.ringSamples ?? []
  const samples = dedupeSamples(sampleCandidates, eq)
  const requireOne = options.requireOne ?? true
  const forbidZero = options.forbidZero ?? true
  const witnessLimit = options.witnessLimit ?? 1

  const violations: MultiplicativeSetViolation<A>[] = []
  const witnesses: MultiplicativeSetWitness<A>[] = []

  if (requireOne && !set.contains(ring.one)) {
    violations.push({ kind: "missingOne" })
  }

  if (forbidZero && set.contains(ring.zero)) {
    violations.push({ kind: "containsZero" })
  }

  let pairChecks = 0
  for (const [left, right] of buildPairs(samples)) {
    pairChecks += 1
    if (!set.contains(left) || !set.contains(right)) {
      continue
    }

    const product = ring.mul(left, right)
    if (set.contains(product)) {
      continue
    }

    const violation: MultiplicativeSetViolation<A> = {
      kind: "notClosed",
      factors: [left, right],
      product,
    }
    violations.push(violation)

    if (witnesses.length < witnessLimit) {
      witnesses.push({ factors: [left, right], product })
    }
  }

  const holds = violations.length === 0
  const label = set.label ?? "multiplicative set"
  const describeViolation = (violation: MultiplicativeSetViolation<A>): string => {
    switch (violation.kind) {
      case "missingOne":
        return "unit 1 is not included"
      case "containsZero":
        return "zero is unexpectedly included"
      default:
        return "closure failure a·b ∉ S for sampled a,b ∈ S"
    }
  }

  const details = holds
    ? `${label} verified on ${samples.length} distinct ring samples.`
    : `${label} violations: ${violations.map(describeViolation).join("; ")}.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      ringSampleCandidates: sampleCandidates.length,
      distinctRingSamples: samples.length,
      pairChecks,
      requireOne,
      forbidZero,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}
