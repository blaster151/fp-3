import type { Reader } from "../../endo-2category"
import type { Task } from "../../task"
import type { Err as ErrT, Result } from "../../result"
import { Ok, isErr, isOk, mapR } from "../../result"
import { retry, withTimeout } from "../task/async-control"

export type StateReaderTask<R, S, A> = (r: R) => (s: S) => Promise<readonly [A, S]>

export const SRT = {
  of:
    <A>(a: A) =>
    <S>() =>
    <R>(): StateReaderTask<R, S, A> =>
    (_r: R) =>
    async (s: S) => [a, s] as const,

  fromTask:
    <A>(ta: Task<A>) =>
    <S>() =>
    <R>(): StateReaderTask<R, S, A> =>
    (_r: R) =>
    async (s: S) => [await ta(), s] as const,

  fromReader:
    <R, A>(ra: Reader<R, A>) =>
    <S>(): StateReaderTask<R, S, A> =>
    (r: R) =>
    async (s: S) => [ra(r), s] as const,

  liftValue:
    <A>(a: A) =>
    <S>() =>
    <R>(): StateReaderTask<R, S, A> =>
      SRT.of<A>(a)<S>()<R>(),

  map:
    <A, B>(f: (a: A) => B) =>
    <S>() =>
    <R>(srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, B> =>
    (r: R) =>
    async (s0: S) => {
      const [a, s1] = await srt(r)(s0)
      return [f(a), s1] as const
    },

  chain:
    <A, B, S, R>(f: (a: A) => StateReaderTask<R, S, B>) =>
    (srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, B> =>
    (r: R) =>
    async (s0: S) => {
      const [a, s1] = await srt(r)(s0)
      return await f(a)(r)(s1)
    },

  ap:
    <S, R, A, B>(srtFab: StateReaderTask<R, S, (a: A) => B>) =>
    (srtA: StateReaderTask<R, S, A>): StateReaderTask<R, S, B> =>
    (r: R) =>
    async (s0: S) => {
      const [fab, s1] = await srtFab(r)(s0)
      const [a, s2] = await srtA(r)(s1)
      return [fab(a), s2] as const
    },

  local:
    <R, Q>(f: (q: Q) => R) =>
    <S, A>(srt: StateReaderTask<R, S, A>): StateReaderTask<Q, S, A> =>
    (q: Q) =>
    (s: S) =>
      srt(f(q))(s),

  get:
    <S>() =>
    <R>(): StateReaderTask<R, S, S> =>
    (_r: R) =>
    async (s: S) => [s, s] as const,

  put:
    <S>(s1: S) =>
    <R>(): StateReaderTask<R, S, void> =>
    (_r: R) =>
    async (_s: S) => [undefined, s1] as const,

  modify:
    <S>(g: (s: S) => S) =>
    <R>(): StateReaderTask<R, S, void> =>
    (_r: R) =>
    async (s: S) => [undefined, g(s)] as const,
}

export const runSRT = <R, S, A>(srt: StateReaderTask<R, S, A>, r: R, s: S) => srt(r)(s)
export const evalSRT = async <R, S, A>(srt: StateReaderTask<R, S, A>, r: R, s: S) =>
  (await srt(r)(s))[0]
export const execSRT = async <R, S, A>(srt: StateReaderTask<R, S, A>, r: R, s: S) =>
  (await srt(r)(s))[1]

export type SRTResult<R, S, E, A> = StateReaderTask<R, S, Result<E, A>>

export const mapSRTResult =
  <E, A, B>(f: (a: A) => B) =>
  <R, S>(srt: SRTResult<R, S, E, A>): SRTResult<R, S, E, B> =>
  (r: R) =>
  async (s: S) => {
    const [res, s1] = await srt(r)(s)
    return [mapR<E, A, B>(f)(res), s1] as const
  }

export const chainSRTResult =
  <R, S, E, A, F, B>(f: (a: A) => SRTResult<R, S, F, B>) =>
  (srt: SRTResult<R, S, E, A>): SRTResult<R, S, E | F, B> =>
  (r: R) =>
  async (s0: S) => {
    const [res, s1] = await srt(r)(s0)
    return isOk(res) ? f(res.value)(r)(s1) : [res as ErrT<E | F>, s1] as const
  }

const wrapSRT =
  <R, S, A>(wrap: (ta: Task<readonly [A, S]>) => Task<readonly [A, S]>) =>
  (srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, A> =>
  (r: R) =>
  (s: S) =>
    wrap(() => srt(r)(s))()

export const srtWithTimeout =
  (ms: number) =>
  <R, S, A>(srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, A> =>
    wrapSRT<R, S, A>(withTimeout(ms))(srt)

export const srtRetry =
  (retries: number, delayMs: number, factor = 1.5) =>
  <R, S, A>(srt: StateReaderTask<R, S, A>): StateReaderTask<R, S, A> =>
    wrapSRT<R, S, A>(retry(retries, delayMs, factor))(srt)

export const sequenceSRT =
  <R, S, A>(steps: ReadonlyArray<StateReaderTask<R, S, A>>): StateReaderTask<R, S, ReadonlyArray<A>> =>
  (r: R) =>
  async (s0: S) => {
    const out: A[] = []
    let s = s0
    for (const step of steps) {
      const [a, s1] = await step(r)(s)
      out.push(a)
      s = s1
    }
    return [out, s] as const
  }

export const traverseSRT =
  <R, S, A, B>(items: ReadonlyArray<A>, f: (a: A, index: number) => StateReaderTask<R, S, B>): StateReaderTask<R, S, ReadonlyArray<B>> =>
  (r: R) =>
  async (s0: S) => {
    const out: B[] = []
    let s = s0
    for (let i = 0; i < items.length; i++) {
      const [b, s1] = await f(items[i]!, i)(r)(s)
      out.push(b)
      s = s1
    }
    return [out, s] as const
  }

export const sequenceSRTResult =
  <R, S, E, A>(steps: ReadonlyArray<SRTResult<R, S, E, A>>): SRTResult<R, S, E, ReadonlyArray<A>> =>
  (r: R) =>
  async (s0: S) => {
    const out: A[] = []
    let s = s0
    for (const step of steps) {
      const [res, s1] = await step(r)(s)
      if (isErr(res)) return [res, s1] as const
      out.push((res as Ok<A>).value)
      s = s1
    }
    return [Ok(out), s] as const
  }

export const traverseSRTResult =
  <R, S, E, A, B>(items: ReadonlyArray<A>, f: (a: A, i: number) => SRTResult<R, S, E, B>): SRTResult<R, S, E, ReadonlyArray<B>> =>
  (r: R) =>
  async (s0: S) => {
    const out: B[] = []
    let s = s0
    for (let i = 0; i < items.length; i++) {
      const [res, s1] = await f(items[i]!, i)(r)(s)
      if (isErr(res)) return [res, s1] as const
      out.push((res as Ok<B>).value)
      s = s1
    }
    return [Ok(out), s] as const
  }
