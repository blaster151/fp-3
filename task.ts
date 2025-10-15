import { Err, Ok, getOrElseR, isErr, isOk, mapErr, mapR } from "./result"
import type { Err as ErrT, Result } from "./result"
import type { Reader } from "./endo-2category"

type Lazy<T> = () => T

type ObjectLike = Record<string, unknown>

type UnwrapTR<T> = T extends TaskResult<infer _E, infer A> ? A : never

type TR_Yield<E, A> = Generator<TaskResult<E, A>, A, A>
type RTR_Yield<R, E, A> = Generator<ReaderTaskResult<R, E, unknown>, A, unknown>

// =======================
// Async: Task & TaskResult
// =======================
export type Task<A> = () => Promise<A>

export const Task = {
  of: <A>(a: A): Task<A> => () => Promise.resolve(a),
  delay: (ms: number) => <A>(a: A): Task<A> => () => new Promise(res => setTimeout(() => res(a), ms)),
  map: <A, B>(f: (a: A) => B) => (ta: Task<A>): Task<B> => () => ta().then(f),
  chain: <A, B>(f: (a: A) => Task<B>) => (ta: Task<A>): Task<B> => () => ta().then(a => f(a)()),
  ap: <A, B>(tfab: Task<(a: A) => B>) => (ta: Task<A>): Task<B> => () =>
    Promise.all([tfab(), ta()]).then(([fab, a]) => fab(a)),
  tryCatch: <A>(thunk: Lazy<Promise<A>>): Task<A> => () => thunk(),
}

export const fromPromise = <A>(thunk: Lazy<Promise<A>>): Task<A> => () => thunk()
export const sequenceT = <A>(ts: ReadonlyArray<Task<A>>): Task<ReadonlyArray<A>> => () =>
  Promise.all(ts.map((t) => t()))
export const traverseT = <A, B>(as: ReadonlyArray<A>, f: (a: A) => Task<B>): Task<ReadonlyArray<B>> =>
  sequenceT(as.map(f))

// Result in Task (right-biased)
export type TaskResult<E, A> = Task<Result<E, A>>

export const TaskResult = {
  of: <E = never, A = never>(a: A): TaskResult<E, A> => Task.of(Ok(a)),
  fromResult: <E, A>(r: Result<E, A>): TaskResult<E, A> => Task.of(r),
  map: <E, A, B>(f: (a: A) => B) => (tra: TaskResult<E, A>): TaskResult<E, B> => () =>
    tra().then(mapR<E, A, B>(f)),
  mapErr: <E, F, A>(f: (e: E) => F) => (tra: TaskResult<E, A>): TaskResult<F, A> => () =>
    tra().then(mapErr<E, F, A>(f)),
  chain: <E, A, F, B>(f: (a: A) => TaskResult<F, B>) =>
    (tra: TaskResult<E, A>): TaskResult<E | F, B> =>
      () =>
        tra().then((r): Promise<Result<E | F, B>> =>
          isOk(r) ? f(r.value)() : Promise.resolve(r as ErrT<E>)
        ),
  getOrElse: <E, A>(onErr: (e: E) => A) => (tra: TaskResult<E, A>): Task<A> => () =>
    tra().then(getOrElseR<E, A>(onErr)),
  tryCatch: <A>(
    thunk: Lazy<Promise<A>>,
    onThrow: (u: unknown) => Error = (u) => (u instanceof Error ? u : new Error(String(u)))
  ): TaskResult<Error, A> =>
    async () => {
      try {
        const value = await thunk()
        return Ok(value)
      } catch (u) {
        return Err(onThrow(u))
      }
    },
}

// Applicative helpers for TaskResult
export const apTR =
  <E, A, B>(tfab: TaskResult<E, (a: A) => B>) =>
  (tfa: TaskResult<E, A>): TaskResult<E, B> =>
    async () => {
      const [rfab, rfa] = await Promise.all([tfab(), tfa()])
      if (isOk(rfab) && isOk(rfa)) {
        return Ok(rfab.value(rfa.value))
      }
      if (isErr(rfab)) return rfab
      return rfa as ErrT<E>
    }

// liftA2: combine two independent TRs in parallel via a curried function
export const liftA2TR =
  <E, A, B, C>(f: (a: A) => (b: B) => C) =>
  (ta: TaskResult<E, A>) =>
  (tb: TaskResult<E, B>): TaskResult<E, C> =>
    apTR<E, B, C>(TaskResult.map<E, A, (b: B) => C>(f)(ta))(tb)

// zipWith: non-curried convenience
export const zipWithTR =
  <E, A, B, C>(f: (a: A, b: B) => C) =>
  (ta: TaskResult<E, A>) =>
  (tb: TaskResult<E, B>): TaskResult<E, C> =>
    liftA2TR<E, A, B, C>((a) => (b) => f(a, b))(ta)(tb)

// product: pair two TRs
export const productTR =
  <E, A, B>(ta: TaskResult<E, A>) =>
  (tb: TaskResult<E, B>): TaskResult<E, readonly [A, B]> =>
    zipWithTR<E, A, B, readonly [A, B]>((a, b) => [a, b] as const)(ta)(tb)

export const sequenceTR = <E, A>(ts: ReadonlyArray<TaskResult<E, A>>): TaskResult<E, ReadonlyArray<A>> => async () => {
  const rs = await Promise.all(ts.map((t) => t()))
  const firstErr = rs.find(isErr)
  if (firstErr) return firstErr
  const values: A[] = []
  for (const r of rs) {
    if (isOk(r)) {
      values.push(r.value)
    } else {
      return r
    }
  }
  return Ok(values)
}

export const traverseTR = <E, A, B>(as: ReadonlyArray<A>, f: (a: A) => TaskResult<E, B>): TaskResult<E, ReadonlyArray<B>> =>
  sequenceTR(as.map(f))

// ========== Arrays ==========

// Parallel: start all tasks at once, wait for all; return the first Err if one occurs.
export const sequenceArrayTRPar = <E, A>(
  ts: ReadonlyArray<TaskResult<E, A>>
): TaskResult<E, ReadonlyArray<A>> => async () => {
  const rs = await Promise.all(ts.map((t) => t()))
  const firstErr = rs.find((r): r is ErrT<E> => isErr(r))
  if (firstErr) return firstErr
  const values: A[] = []
  for (const r of rs) {
    if (isOk(r)) {
      values.push(r.value)
    } else {
      return r
    }
  }
  return Ok(values)
}

export const traverseArrayTRPar = <E, A, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => TaskResult<E, B>
): TaskResult<E, ReadonlyArray<B>> =>
  sequenceArrayTRPar(as.map(f))

// Sequential: run tasks left→right; short-circuit on first Err.
export const sequenceArrayTRSeq = <E, A>(
  ts: ReadonlyArray<TaskResult<E, A>>
): TaskResult<E, ReadonlyArray<A>> => async () => {
  const out: A[] = []
  for (const t of ts) {
    const r = await t()
    if (isErr(r)) return r
    out.push(r.value)
  }
  return Ok(out)
}

export const traverseArrayTRSeq = <E, A, B>(
  as: ReadonlyArray<A>,
  f: (a: A, i: number) => TaskResult<E, B>
): TaskResult<E, ReadonlyArray<B>> => async () => {
  const out: B[] = []
  for (let i = 0; i < as.length; i++) {
    const r = await f(as[i]!, i)()
    if (isErr(r)) return r
    out.push(r.value)
  }
  return Ok(out)
}

// ========== Structs (objects) ==========

// Parallel over object of TaskResults → TaskResult of object
export const sequenceStructTRPar = <
  E,
  S extends Record<string, TaskResult<E, unknown>>
>(s: S): TaskResult<E, { readonly [K in keyof S]: UnwrapTR<S[K]> }> => async () => {
  const ks = Object.keys(s) as Array<keyof S>
  const rs = await Promise.all(ks.map((k) => s[k]!()))
  const firstErr = rs.find((r): r is ErrT<E> => isErr(r))
  if (firstErr) return firstErr
  const out = {} as { [K in keyof S]: UnwrapTR<S[K]> }
  for (let i = 0; i < ks.length; i++) {
    const k = ks[i]!
    const r = rs[i]!
    if (!isOk(r)) return r
    out[k] = r.value as UnwrapTR<S[typeof k]>
  }
  return Ok(out as { readonly [K in keyof S]: UnwrapTR<S[K]> })
}

// Sequential over object (deterministic order by key array you pass in)
export const sequenceStructTRSeq = <
  E,
  S extends Record<string, TaskResult<E, unknown>>
>(s: S, order?: ReadonlyArray<keyof S>): TaskResult<E, { readonly [K in keyof S]: UnwrapTR<S[K]> }> => async () => {
  const ks = order ?? (Object.keys(s) as Array<keyof S>)
  const out = {} as { [K in keyof S]: UnwrapTR<S[K]> }
  for (const k of ks) {
    const r = await s[k]!()
    if (isErr(r)) return r
    out[k] = r.value as UnwrapTR<S[typeof k]>
  }
  return Ok(out as { readonly [K in keyof S]: UnwrapTR<S[K]> })
}

// ===========================
// Do-notation for TaskResult
// ===========================

export type DoTaskResultBuilder<E, T extends ObjectLike> = {
  bind: <K extends string, A>(
    k: K,
    tra: TaskResult<E, A>
  ) => DoTaskResultBuilder<E, T & { readonly [P in K]: A }>

  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoTaskResultBuilder<E, T & { readonly [P in K]: A }>

  map: <B>(f: (t: T) => B) => TaskResult<E, B>
  done: () => TaskResult<E, T>
}

export const DoTR = <E = never>() => {
  const start: TaskResult<E, {}> = TaskResult.of<E, {}>({})
  const make = <T extends ObjectLike>(acc: TaskResult<E, T>): DoTaskResultBuilder<E, T> => ({
    bind: <K extends string, A>(k: K, tra: TaskResult<E, A>) =>
      make(async () => {
        const rObj = await acc()
        if (isErr(rObj)) return rObj
        const rVal = await tra()
        if (isErr(rVal)) return rVal
        const merged = {
          ...rObj.value,
          [k]: rVal.value,
        } as T & { readonly [P in K]: A }
        return Ok(merged)
      }),
    let: <K extends string, A>(k: K, a: A) =>
      make(async () => {
        const rObj = await acc()
        if (isErr(rObj)) return rObj
        const merged = {
          ...rObj.value,
          [k]: a,
        } as T & { readonly [P in K]: A }
        return Ok(merged)
      }),
    map: (f) => async () => {
      const rObj = await acc()
      return isErr(rObj) ? rObj : Ok(f(rObj.value))
    },
    done: () => acc,
  })
  return make(start)
}

// =======================
// ReaderTask
// =======================
export type ReaderTask<R, A> = (r: R) => Promise<A>

export const ReaderTask = {
  of:
    <R, A>(a: A): ReaderTask<R, A> =>
    async (_: R) =>
      a,

  fromTask:
    <A>(ta: Task<A>): ReaderTask<unknown, A> =>
    async () =>
      ta(),

  fromReader:
    <R, A>(ra: Reader<R, A>): ReaderTask<R, A> =>
    async (r) =>
      ra(r),

  ask: <R>(): ReaderTask<R, R> => async (r) => r,

  asks:
    <R, A>(f: (r: R) => A): ReaderTask<R, A> =>
    async (r) =>
      f(r),

  map:
    <A, B>(f: (a: A) => B) =>
    <R>(rta: ReaderTask<R, A>): ReaderTask<R, B> =>
    async (r) =>
      f(await rta(r)),

  chain:
    <A, B, R>(f: (a: A) => ReaderTask<R, B>) =>
    (rta: ReaderTask<R, A>): ReaderTask<R, B> =>
    async (r) => {
      const a = await rta(r)
      return f(a)(r)
    },

  ap:
    <R, A, B>(rtfab: ReaderTask<R, (a: A) => B>) =>
    (rta: ReaderTask<R, A>): ReaderTask<R, B> =>
    async (r) => {
      const [fab, a] = await Promise.all([rtfab(r), rta(r)])
      return fab(a)
    },

  local:
    <R, Q>(f: (q: Q) => R) =>
    <A>(rtq: ReaderTask<R, A>): ReaderTask<Q, A> =>
    async (q) =>
      rtq(f(q)),
}

export const fromTaskResult =
  <R, E, A>(tra: TaskResult<E, A>): ReaderTask<R, Result<E, A>> =>
  async () =>
    tra()

export const ReaderTaskResult = {
  map:
    <R, E, A, B>(f: (a: A) => B) =>
    (rtra: ReaderTask<R, Result<E, A>>): ReaderTask<R, Result<E, B>> =>
    async (r: R) =>
      mapR<E, A, B>(f)(await rtra(r)),

  chain:
    <R, E, A, F, B>(f: (a: A) => ReaderTask<R, Result<F, B>>) =>
    (rtra: ReaderTask<R, Result<E, A>>): ReaderTask<R, Result<E | F, B>> =>
    async (r: R) => {
      const ra = await rtra(r)
      return isOk(ra) ? f(ra.value)(r) : (ra as ErrT<E>)
    },
}

export const RTR_ =
  <R, E, A>(ma: ReaderTaskResult<R, E, A>) =>
  (function* () { return (yield ma) as A })()

export const genRTR =
  <R, E>() =>
  <A>(f: () => RTR_Yield<R, E, A>): ReaderTaskResult<R, E, A> =>
  async (r: R) => {
    const it = f()
    let last: unknown = undefined
    while (true) {
      const n = it.next(last)
      if (n.done) return Ok(n.value as A)
      const rr = await n.value(r)
      if (isErr(rr)) return rr
      last = rr.value
    }
  }

// =======================
// Gen (generator) for TaskResult
// =======================

export const TR_ =
  <E, A>(ma: TaskResult<E, A>): TR_Yield<E, A> =>
  (function* () { return (yield ma) as A })()

export const genTR =
  <E>() =>
  <A>(f: () => Generator<TaskResult<E, unknown>, A, unknown>): TaskResult<E, A> =>
  async () => {
    const it = f()
    let last: unknown = undefined
    while (true) {
      const n = it.next(last)
      if (n.done) return Ok(n.value as A)
      const r = await n.value()
      if (isErr(r)) return r
      last = r.value
    }
  }

export type ReaderTaskResult<R, E, A> = ReaderTask<R, Result<E, A>>
