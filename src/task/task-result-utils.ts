import { id } from "../../core"
import { Err, Ok, isErr, isOk } from "../../result"
import type { Task, TaskResult } from "../../task"
import { swapR } from "../result/result-extras"

/** Async Result helpers extracted from allTS.ts. */
export const mapBothTR =
  <E, F, A, B>(l: (e: E) => F, r: (a: A) => B) =>
  (tra: TaskResult<E, A>): TaskResult<F, B> =>
    async () => {
      const ra = await tra()
      return isOk(ra) ? Ok(r(ra.value)) : Err(l(ra.error))
    }

export const leftMapTR = <E, F, A>(l: (e: E) => F) => mapBothTR<E, F, A, A>(l, id)
export const rightMapTR = <E, A, B>(r: (a: A) => B) => mapBothTR<E, E, A, B>(id, r)

export const foldTR =
  <E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
  (tra: TaskResult<E, A>): Task<B> =>
    async () => {
      const ra = await tra()
      return isOk(ra) ? onOk(ra.value) : onErr(ra.error)
    }

export const swapTR =
  <E, A>(tra: TaskResult<E, A>): TaskResult<A, E> =>
    async () => swapR(await tra())

export const tapOkTR =
  <E, A>(f: (a: A) => void) =>
  (tra: TaskResult<E, A>): TaskResult<E, A> =>
    async () => {
      const ra = await tra()
      if (isOk(ra)) {
        try {
          f(ra.value)
        } catch {}
      }
      return ra
    }

export const tapErrTR =
  <E, A>(f: (e: E) => void) =>
  (tra: TaskResult<E, A>): TaskResult<E, A> =>
    async () => {
      const ra = await tra()
      if (isErr(ra)) {
        try {
          f(ra.error)
        } catch {}
      }
      return ra
    }
