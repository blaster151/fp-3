import type { ReaderTask, ReaderTaskResult, Task, TaskResult } from "../../task"
import { isErr } from "../../result"

export const bracketT =
  <A, B>(acquire: Task<A>, use: (a: A) => Task<B>, release: (a: A) => Task<void>): Task<B> =>
  async () => {
    const a = await acquire()
    try {
      return await use(a)()
    } finally {
      try {
        await release(a)()
      } catch {
        /* swallow release errors */
      }
    }
  }

export const bracketTR =
  <E, A, B>(acq: TaskResult<E, A>, use: (a: A) => TaskResult<E, B>, rel: (a: A) => TaskResult<E, void>): TaskResult<E, B> =>
  async () => {
    const ra = await acq()
    if (isErr(ra)) return ra
    const a = ra.value
    const rb = await use(a)()
    const rr = await rel(a)()
    if (isErr(rb)) return rb
    if (isErr(rr)) return rr
    return rb
  }

export const bracketRT =
  <R, A, B>(
    acq: ReaderTask<R, A>,
    use: (a: A) => ReaderTask<R, B>,
    rel: (a: A) => ReaderTask<R, void>
  ): ReaderTask<R, B> =>
  async (r: R) => {
    const a = await acq(r)
    try {
      return await use(a)(r)
    } finally {
      try {
        await rel(a)(r)
      } catch {
        /* swallow */
      }
    }
  }

export const bracketRTR =
  <R, E, A, B>(
    acq: ReaderTaskResult<R, E, A>,
    use: (a: A) => ReaderTaskResult<R, E, B>,
    rel: (a: A) => ReaderTaskResult<R, E, void>
  ): ReaderTaskResult<R, E, B> =>
  async (r: R) => {
    const ra = await acq(r)
    if (isErr(ra)) return ra
    const a = ra.value
    const rb = await use(a)(r)
    const rr = await rel(a)(r)
    if (isErr(rb)) return rb
    if (isErr(rr)) return rr
    return rb
  }

export const retry =
  (retries: number, delayMs: number, factor = 1.5) =>
  <A>(ta: Task<A>): Task<A> =>
  async () => {
    let attempt = 0
    let wait = delayMs
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await ta()
      } catch (err) {
        attempt += 1
        if (attempt > retries) throw err
        await new Promise((res) => setTimeout(res, wait))
        wait = Math.round(wait * factor)
      }
    }
  }

export const withTimeout =
  (ms: number) =>
  <A>(ta: Task<A>): Task<A> =>
  async () =>
    await Promise.race([
      ta(),
      new Promise<A>((_, rej) => setTimeout(() => rej(new Error(`Timeout ${ms}ms`)), ms))
    ])

export const allLimited =
  (limit: number) =>
  <A>(tasks: ReadonlyArray<Task<A>>): Task<ReadonlyArray<A>> =>
  async () => {
    const results: A[] = []
    let index = 0
    const workerCount = Math.max(1, limit)
    const workers = Array.from({ length: workerCount }, async () => {
      while (index < tasks.length) {
        const current = index++
        results[current] = await tasks[current]!()
      }
    })
    await Promise.all(workers)
    return results
  }
