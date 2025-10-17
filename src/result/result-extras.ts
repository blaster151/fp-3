import { Err, Ok, isErr, isOk } from "../../result"
import type { Result } from "../../result"

/** Additional Result combinators extracted from allTS.ts. */
export const foldR =
  <E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
  (ra: Result<E, A>): B =>
    isOk(ra) ? onOk(ra.value) : onErr(ra.error)

export const swapR = <E, A>(ra: Result<E, A>): Result<A, E> =>
  isOk(ra) ? Err(ra.value) : Ok(ra.error)

export const tapOkR =
  <E, A>(f: (a: A) => void) =>
  (ra: Result<E, A>): Result<E, A> => (isOk(ra) && f(ra.value), ra)

export const tapErrR =
  <E, A>(f: (e: E) => void) =>
  (ra: Result<E, A>): Result<E, A> => (isErr(ra) && f(ra.error), ra)
