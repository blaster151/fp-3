import { id } from "../../core"
import { Err, Ok, isErr, isOk } from "../../result"
import type { ReaderTask, ReaderTaskResult } from "../../task"
import { swapR } from "../result/result-extras"

/** ReaderTaskResult helpers extracted from allTS.ts. */
export const mapBothRTR =
  <R, E, F, A, B>(l: (e: E) => F, mapRight: (a: A) => B) =>
  (rtr: ReaderTaskResult<R, E, A>): ReaderTaskResult<R, F, B> =>
    async (env: R) => {
      const ra = await rtr(env)
      return isOk(ra) ? Ok(mapRight(ra.value)) : Err(l(ra.error))
    }

export const leftMapRTR = <R, E, F, A>(l: (e: E) => F) => mapBothRTR<R, E, F, A, A>(l, id)
export const rightMapRTR = <R, E, A, B>(r: (a: A) => B) => mapBothRTR<R, E, E, A, B>(id, r)

export const foldRTR =
  <R, E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
  (rtr: ReaderTaskResult<R, E, A>): ReaderTask<R, B> =>
    async (r: R) => {
      const ra = await rtr(r)
      return isOk(ra) ? onOk(ra.value) : onErr(ra.error)
    }

export const swapRTR =
  <R, E, A>(rtr: ReaderTaskResult<R, E, A>): ReaderTaskResult<R, A, E> =>
    async (r: R) => swapR(await rtr(r))

export const tapOkRTR =
  <R, E, A>(f: (a: A) => void) =>
  (rtr: ReaderTaskResult<R, E, A>): ReaderTaskResult<R, E, A> =>
    async (r: R) => {
      const ra = await rtr(r)
      if (isOk(ra)) {
        try {
          f(ra.value)
        } catch {}
      }
      return ra
    }

export const tapErrRTR =
  <R, E, A>(f: (e: E) => void) =>
  (rtr: ReaderTaskResult<R, E, A>): ReaderTaskResult<R, E, A> =>
    async (r: R) => {
      const ra = await rtr(r)
      if (isErr(ra)) {
        try {
          f(ra.error)
        } catch {}
      }
      return ra
    }
