import type { Option } from "../option"
import { None, Some } from "../option"
import type { Result } from "../result"
import { Err, Ok } from "../result"

export type PartialFn<A, B> = {
  isDefinedAt: (a: A) => boolean
  apply: (a: A) => B
}

export const pf = <A, B>(
  isDefinedAt: (a: A) => boolean,
  apply: (a: A) => B
): PartialFn<A, B> => ({
  isDefinedAt,
  apply
})

export const liftOptionPF =
  <A, B>(p: PartialFn<A, B>) =>
  (a: A): Option<B> =>
    p.isDefinedAt(a) ? Some(p.apply(a)) : None

export const liftResultPF =
  <A, E, B>(onUndefined: (a: A) => E) =>
  (p: PartialFn<A, B>) =>
  (a: A): Result<E, B> =>
    p.isDefinedAt(a) ? Ok(p.apply(a)) : Err(onUndefined(a))

export const orElsePF =
  <A, B>(p: PartialFn<A, B>, q: PartialFn<A, B>): PartialFn<A, B> =>
    pf(
      (a) => p.isDefinedAt(a) || q.isDefinedAt(a),
      (a) => (p.isDefinedAt(a) ? p.apply(a) : q.apply(a))
    )

export const composePF =
  <A, B, C>(g: PartialFn<B, C>, f: PartialFn<A, B>): PartialFn<A, C> =>
    pf(
      (a) => f.isDefinedAt(a) && g.isDefinedAt(f.apply(a)),
      (a) => g.apply(f.apply(a))
    )

export const restrictPF =
  <A, B>(p: PartialFn<A, B>, pred: (a: A) => boolean): PartialFn<A, B> =>
    pf((a) => pred(a) && p.isDefinedAt(a), p.apply)

export const optionFromPartial =
  <A, B>(f: (a: A) => B | null | undefined) =>
  (a: A): Option<B> => {
    try {
      const b = f(a)
      return b == null ? None : Some(b)
    } catch {
      return None
    }
  }

export const resultFromPartial =
  <A, E, B>(f: (a: A) => B | null | undefined, onFail: (a: A, u?: unknown) => E) =>
  (a: A): Result<E, B> => {
    try {
      const b = f(a)
      return b == null ? Err(onFail(a)) : Ok(b)
    } catch (u) {
      return Err(onFail(a, u))
    }
  }
