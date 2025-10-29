import type { Equality, Ring } from "./structures"

export interface RingIdeal<A> {
  readonly ring: Ring<A>
  readonly contains: (value: A) => boolean
  readonly name?: string
  readonly sampleElements?: ReadonlyArray<A>
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

const withEquality = <A>(ring: Ring<A>, override?: Equality<A>): Equality<A> =>
  override ?? ring.eq ?? ((left: A, right: A) => Object.is(left, right))

const mergeIdealSamples = <A>(
  eq: Equality<A>,
  ...families: ReadonlyArray<ReadonlyArray<A> | undefined>
): A[] => {
  const merged: A[] = []
  for (const family of families) {
    if (!family) {
      continue
    }
    for (const value of family) {
      if (!merged.some(existing => eq(existing, value))) {
        merged.push(value)
      }
    }
  }
  return merged
}

export const checkIdeal = <A>(ideal: RingIdeal<A>, options: IdealCheckOptions<A> = {}): IdealCheckResult<A> => {
  const eq = withEquality(ideal.ring)
  const ringSamples = options.ringSamples ?? []
  const candidateIdealSamples = options.candidateIdealSamples ?? []
  const mergedSamples = mergeIdealSamples(
    eq,
    ideal.sampleElements,
    candidateIdealSamples,
    ringSamples.filter(ideal.contains),
  )
  const idealSamples = uniqueWith(mergedSamples, eq)
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

export interface IdealCombinationOptions<A> {
  readonly samples?: ReadonlyArray<ReadonlyArray<A>>
  readonly eq?: Equality<A>
  readonly name?: string
}

const ensureSamples = <A>(
  ring: Ring<A>,
  ideals: ReadonlyArray<RingIdeal<A>>,
  eq: Equality<A>,
  options: IdealCombinationOptions<A>,
): ReadonlyArray<ReadonlyArray<A>> => {
  const zero = ring.zero
  return ideals.map((ideal, index) => {
    const provided = options.samples?.[index] ?? ideal.sampleElements ?? []
    const enriched = [zero, ...provided, ...provided.map(candidate => ring.neg(candidate))]
    const filtered = enriched.filter(candidate => ideal.contains(candidate))
    return uniqueWith(filtered, eq)
  })
}

export const sumIdeals = <A>(
  ring: Ring<A>,
  ideals: ReadonlyArray<RingIdeal<A>>,
  options: IdealCombinationOptions<A> = {},
): RingIdeal<A> => {
  if (ideals.length === 0) {
    throw new Error("sumIdeals: expected at least one ideal")
  }

  const eq = options.eq ?? withEquality(ring)
  const sampleFamilies = ensureSamples(ring, ideals, eq, options)

  const contains = (value: A): boolean => {
    if (ideals.some(ideal => ideal.contains(value))) {
      return true
    }

    const search = (index: number, accumulated: A): boolean => {
      if (index === ideals.length) {
        return eq(accumulated, value)
      }

      const family = sampleFamilies[index] ?? []
      for (const candidate of family) {
        const next = ring.add(accumulated, candidate)
        if (search(index + 1, next)) {
          return true
        }
      }
      return false
    }

    return search(0, ring.zero)
  }

  const name = options.name ?? `(${ideals.map(ideal => ideal.name ?? "?").join(" + ")})`
  const sampleElements = sampleFamilies.flat()
  return {
    ring,
    contains,
    name,
    ...(sampleElements.length > 0 ? { sampleElements } : {}),
  }
}

const combinationExists = <A>(
  ring: Ring<A>,
  generators: ReadonlyArray<A>,
  target: A,
  eq: Equality<A>,
  limit: number,
): boolean => {
  if (eq(target, ring.zero)) {
    return true
  }

  if (generators.length === 0 || limit <= 0) {
    return false
  }

  const filtered = generators.filter(generator => !eq(generator, ring.zero))
  if (filtered.length === 0) {
    return false
  }

  const explore = (depth: number, accumulated: A): boolean => {
    if (eq(accumulated, target)) {
      return true
    }
    if (depth >= limit) {
      return false
    }

    for (const generator of filtered) {
      const next = ring.add(accumulated, generator)
      if (explore(depth + 1, next)) {
        return true
      }
    }

    return false
  }

  return explore(0, ring.zero)
}

export interface IdealProductOptions<A> extends IdealCombinationOptions<A> {
  readonly summandLimit?: number
}

export const productIdeals = <A>(
  ring: Ring<A>,
  ideals: ReadonlyArray<RingIdeal<A>>,
  options: IdealProductOptions<A> = {},
): RingIdeal<A> => {
  if (ideals.length === 0) {
    throw new Error("productIdeals: expected at least one ideal")
  }

  const eq = options.eq ?? withEquality(ring)
  const sampleFamilies = ensureSamples(ring, ideals, eq, options)

  const generators: A[] = []
  const accumulate = (index: number, current: A): void => {
    if (index === ideals.length) {
      generators.push(current)
      return
    }

    for (const candidate of sampleFamilies[index] ?? []) {
      const next = index === 0 ? candidate : ring.mul(current, candidate)
      accumulate(index + 1, next)
    }
  }

  accumulate(0, ring.one)

  const signedGenerators = generators.flatMap(generator => [generator, ring.neg(generator)])
  const distinctGenerators = uniqueWith(signedGenerators, eq)
  const limit = options.summandLimit ?? Math.max(ideals.length, 4)

  const contains = (value: A): boolean => {
    if (ideals.some(ideal => ideal.contains(value))) {
      return true
    }
    return combinationExists(ring, distinctGenerators, value, eq, limit)
  }

  const name = options.name ?? `(${ideals.map(ideal => ideal.name ?? "?").join(" ⋅ ")})`
  return {
    ring,
    contains,
    name,
    ...(distinctGenerators.length > 0 ? { sampleElements: distinctGenerators } : {}),
  }
}

export const intersectIdeals = <A>(
  ring: Ring<A>,
  ideals: ReadonlyArray<RingIdeal<A>>,
  options: IdealCombinationOptions<A> = {},
): RingIdeal<A> => {
  if (ideals.length === 0) {
    throw new Error("intersectIdeals: expected at least one ideal")
  }

  const eq = options.eq ?? withEquality(ring)
  const name = options.name ?? `(${ideals.map(ideal => ideal.name ?? "?").join(" ∩ ")})`
  const sampleElements = ensureSamples(ring, ideals, eq, options).flat()
  const contains = (value: A): boolean => ideals.every(ideal => ideal.contains(value))
  return {
    ring,
    contains,
    name,
    ...(sampleElements.length > 0 ? { sampleElements } : {}),
  }
}

export interface RadicalIdealOptions<A> {
  readonly maxPower?: number
  readonly eq?: Equality<A>
  readonly name?: string
}

export const radicalIdeal = <A>(ideal: RingIdeal<A>, options: RadicalIdealOptions<A> = {}): RingIdeal<A> => {
  const maxPower = options.maxPower ?? 6
  const eq = options.eq ?? withEquality(ideal.ring)

  const contains = (value: A): boolean => {
    if (ideal.contains(value)) {
      return true
    }

    let power = value
    for (let exponent = 1; exponent <= maxPower; exponent += 1) {
      if (ideal.contains(power)) {
        return true
      }
      power = ideal.ring.mul(power, value)
      if (eq(power, ideal.ring.zero)) {
        return ideal.contains(power)
      }
    }
    return false
  }

  const name = options.name ?? `rad(${ideal.name ?? "I"})`
  return {
    ring: ideal.ring,
    contains,
    name,
    ...(ideal.sampleElements ? { sampleElements: ideal.sampleElements } : {}),
  }
}
