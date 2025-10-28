import type { Option } from "../../option"
import { isSome } from "../../option"

/**
 * Enumerates the standard failure channels exposed by the richer optional/prism witnesses.
 *
 *  - `absent` captures the traditional "focus missing" situation.
 *  - `filtered` captures predicate guards that rejected the value (future passes can
 *    attach structured context via the `context` field).
 *  - `errored` captures unexpected exceptions thrown while projecting or embedding.
 */
export type OpticMissReason =
  | {
      readonly tag: "absent"
      readonly message?: string
    }
  | {
      readonly tag: "filtered"
      readonly message: string
      readonly context?: unknown
    }
  | {
      readonly tag: "errored"
      readonly error: unknown
      readonly message?: string
    }

/**
 * Witness describing the result of calling `getOption` on an optional optic.
 */
export type OptionalFocusWitness<S, A> = OptionalFocusHit<S, A> | OptionalFocusMiss<S>

export type OptionalFocusHit<S, A> = {
  readonly tag: "hit"
  readonly source: S
  readonly focus: A
}

export type OptionalFocusMiss<S> = {
  readonly tag: "miss"
  readonly source: S
  readonly reason: OpticMissReason
}

/**
 * Witness describing the outcome of an attempted optional update.
 *
 * Future passes will populate this from the profunctor adapters so callers can
 * observe both successful writes and skipped updates with concrete evidence.
 */
export type OptionalUpdateWitness<S, A> =
  | {
      readonly tag: "updated"
      readonly before: S
      readonly after: S
      readonly previous: A
      readonly next: A
    }
  | {
      readonly tag: "skipped"
      readonly before: S
      readonly reason: OpticMissReason
      readonly miss?: OptionalFocusMiss<S>
    }

/**
 * Witness emitted by a prism match attempt. Mirrors the optional focus witness but
 * keeps the naming aligned with the prism vocabulary (match vs. reject).
 */
export type PrismWitness<S, A> = PrismMatchWitness<S, A> | PrismRejectWitness<S>

export type PrismMatchWitness<S, A> = {
  readonly tag: "match"
  readonly source: S
  readonly focus: A
}

export type PrismRejectWitness<S> = {
  readonly tag: "reject"
  readonly source: S
  readonly reason: OpticMissReason
}

/**
 * Witness emitted by `reverseGet`. Stays simple for now but gives us a consistent
 * hook for future provenance metadata (e.g. canonical constructors).
 */
export type PrismBuildWitness<S, A> = {
  readonly tag: "build"
  readonly value: A
  readonly result: S
}

/**
 * Aggregated witness surface for a full optional optic. Exposing this as an explicit
 * structure keeps the existing `getOption`/`set` APIs untouched while letting future
 * passes thread witness builders through the same record without breaking callers.
 */
export type OptionalWitnessBundle<S, A> = {
  readonly focus: (s: S) => OptionalFocusWitness<S, A>
  readonly update: (source: S, next: A) => OptionalUpdateWitness<S, A>
}

/**
 * Aggregated witness surface for a prism optic. The `embed` witness mirrors the
 * optional update witness even though prisms always succeed when embedding —
 * the bundle still captures the resulting structure for diagnostics.
 */
export type PrismWitnessBundle<S, A> = {
  readonly match: (s: S) => PrismWitness<S, A>
  readonly embed: (a: A) => PrismBuildWitness<S, A>
}

/**
 * Optional optics frequently expose higher level pattern combinators (like
 * `optionalProp` or `optionalIndex`) that currently only return the core optic.
 * By publishing this helper signature we can, in later passes, augment those
 * constructors with witness-aware variants without splitting the call sites.
 */
export type OptionalConstructor<S, A> = {
  readonly optic: {
    readonly getOption: (s: S) => Option<A>
    readonly set: (a: A) => (s: S) => S
  }
  readonly witnesses: OptionalWitnessBundle<S, A>
}

/**
 * Prism constructors follow the same pattern as the optional constructors.
 */
export type PrismConstructor<S, A> = {
  readonly optic: {
    readonly getOption: (s: S) => Option<A>
    readonly reverseGet: (a: A) => S
  }
  readonly witnesses: PrismWitnessBundle<S, A>
}

export const OPTIONAL_WITNESS: unique symbol = Symbol.for("fp-3.optics.optionalWitness")

export const PRISM_WITNESS: unique symbol = Symbol.for("fp-3.optics.prismWitness")

export type OptionalWitnessCarrier<S, A> = {
  readonly [OPTIONAL_WITNESS]?: OptionalWitnessBundle<S, A>
}

export type PrismWitnessCarrier<S, A> = {
  readonly [PRISM_WITNESS]?: PrismWitnessBundle<S, A>
}

export const attachOptionalWitness = <S, A, T extends object & OptionalWitnessCarrier<S, A>>(
  target: T,
  bundle: OptionalWitnessBundle<S, A>,
): T => {
  if (target[OPTIONAL_WITNESS] !== bundle) {
    Object.defineProperty(target, OPTIONAL_WITNESS, {
      value: bundle,
      enumerable: false,
      configurable: true,
    })
  }
  return target
}

export const attachPrismWitness = <S, A, T extends object & PrismWitnessCarrier<S, A>>(
  target: T,
  bundle: PrismWitnessBundle<S, A>,
): T => {
  if (target[PRISM_WITNESS] !== bundle) {
    Object.defineProperty(target, PRISM_WITNESS, {
      value: bundle,
      enumerable: false,
      configurable: true,
    })
  }
  return target
}

export const readOptionalWitness = <S, A>(
  carrier: OptionalWitnessCarrier<S, A>,
): OptionalWitnessBundle<S, A> | undefined => carrier[OPTIONAL_WITNESS]

export const readPrismWitness = <S, A>(
  carrier: PrismWitnessCarrier<S, A>,
): PrismWitnessBundle<S, A> | undefined => carrier[PRISM_WITNESS]

export const optionalMiss = <S>(source: S, reason: OpticMissReason): OptionalFocusMiss<S> => ({
  tag: "miss",
  source,
  reason,
})

export const makeOptionalWitnessBundle = <S, A>(
  getOption: (s: S) => Option<A>,
  setValue: (a: A, s: S) => S,
): OptionalWitnessBundle<S, A> => {
  const focus = (source: S): OptionalFocusWitness<S, A> => {
    try {
      const option = getOption(source)
      if (isSome(option)) {
        return { tag: "hit", source, focus: option.value }
      }
      return optionalMiss(source, { tag: "absent" })
    } catch (error) {
      return optionalMiss(source, { tag: "errored", error })
    }
  }

  return {
    focus,
    update: (before, next) => {
      const current = focus(before)
      if (current.tag === "miss") {
        return {
          tag: "skipped",
          before,
          reason: current.reason,
          miss: current,
        }
      }

      try {
        const after = setValue(next, before)
        return {
          tag: "updated",
          before,
          after,
          previous: current.focus,
          next,
        }
      } catch (error) {
        const reason: OpticMissReason = { tag: "errored", error }
        return {
          tag: "skipped",
          before,
          reason,
          miss: optionalMiss(before, reason),
        }
      }
    },
  }
}

export const makePrismWitnessBundle = <S, A>(
  getOption: (s: S) => Option<A>,
  reverseGet: (a: A) => S,
): PrismWitnessBundle<S, A> => {
  const match = (source: S): PrismWitness<S, A> => {
    try {
      const option = getOption(source)
      if (isSome(option)) {
        return { tag: "match", source, focus: option.value }
      }
      return { tag: "reject", source, reason: { tag: "absent" } }
    } catch (error) {
      return { tag: "reject", source, reason: { tag: "errored", error } }
    }
  }

  return {
    match,
    embed: (value) => ({
      tag: "build",
      value,
      result: reverseGet(value),
    }),
  }
}
