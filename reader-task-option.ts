import { None, Some, getOrElseO, isSome, mapO } from "./option"
import type { Option } from "./option"
import { Err, Ok, isOk } from "./result"
import type { Reader } from "./endo-2category"
import { Task } from "./task"
import type { ReaderTask, Task as TaskT, TaskResult } from "./task"

export type TaskOption<A> = TaskT<Option<A>>
export type ReaderTaskOption<R, A> = ReaderTask<R, Option<A>>

type Lazy<T> = () => T

type RTO_Yield<R, A> = Generator<ReaderTaskOption<R, A>, A, A>

export const TaskOption = {
  of: <A>(a: A): TaskOption<A> => Task.of(Some(a)),
  none: (): TaskOption<never> => Task.of(None),
  fromOption: <A>(oa: Option<A>): TaskOption<A> => Task.of(oa),
  fromNullable: <A>(a: A | null | undefined): TaskOption<NonNullable<A>> =>
    Task.of(a == null ? None : Some(a as NonNullable<A>)),

  map: <A, B>(f: (a: A) => B) => (ta: TaskOption<A>): TaskOption<B> =>
    () => ta().then(mapO(f)),

  chain: <A, B>(f: (a: A) => TaskOption<B>) => (ta: TaskOption<A>): TaskOption<B> =>
    async () => {
      const oa = await ta()
      return isSome(oa) ? f(oa.value)() : None
    },

  ap: <A, B>(tfab: TaskOption<(a: A) => B>) => (ta: TaskOption<A>): TaskOption<B> =>
    async () => {
      const [ofab, oa] = await Promise.all([tfab(), ta()])
      return isSome(ofab) && isSome(oa) ? Some(ofab.value(oa.value)) : None
    },

  getOrElse: <A>(onNone: Lazy<A>) => (ta: TaskOption<A>): TaskT<A> =>
    () => ta().then(getOrElseO(onNone)),

  orElse: <A>(that: Lazy<TaskOption<A>>) => (ta: TaskOption<A>): TaskOption<A> =>
    async () => {
      const oa = await ta()
      return isSome(oa) ? oa : await that()()
    },

  fromResultOk: <E, A>(tra: TaskResult<E, A>): TaskOption<A> =>
    () => tra().then((r) => (isOk(r) ? Some(r.value) : None)),
  toResult: <E, A>(onNone: Lazy<E>) => (ta: TaskOption<A>): TaskResult<E, A> =>
    () => ta().then((oa) => (isSome(oa) ? Ok(oa.value) : Err(onNone()))),
}

export const ReaderTaskOption = {
  of: <R, A>(a: A): ReaderTaskOption<R, A> => async () => Some(a),
  none: <R>(): ReaderTaskOption<R, never> => async () => None,

  fromReader: <R, A>(ra: Reader<R, A>): ReaderTaskOption<R, A> =>
    async (r) => Some(ra(r)),

  fromTaskOption: <R, A>(ta: TaskOption<A>): ReaderTaskOption<R, A> =>
    async () => ta(),

  ask: <R>(): ReaderTaskOption<R, R> => async (r) => Some(r),

  map: <A, B>(f: (a: A) => B) => <R>(rto: ReaderTaskOption<R, A>): ReaderTaskOption<R, B> =>
    async (r) => mapO(f)(await rto(r)),

  chain: <A, B, R>(f: (a: A) => ReaderTaskOption<R, B>) =>
    (rto: ReaderTaskOption<R, A>): ReaderTaskOption<R, B> =>
    async (r) => {
      const oa = await rto(r)
      return isSome(oa) ? f(oa.value)(r) : None
    },

  getOrElse: <A>(onNone: Lazy<A>) =>
    <R>(rto: ReaderTaskOption<R, A>): ReaderTask<R, A> =>
    async (r) => getOrElseO(onNone)(await rto(r)),

  local: <R, Q>(f: (q: Q) => R) =>
    <A>(rto: ReaderTaskOption<R, A>): ReaderTaskOption<Q, A> =>
    async (q) => rto(f(q)),
}

export type DoRTOBuilder<R, T extends Record<string, unknown>> = {
  bind: <K extends string, A>(
    k: K,
    rto: ReaderTaskOption<R, A>
  ) => DoRTOBuilder<R, T & { readonly [P in K]: A }>

  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoRTOBuilder<R, T & { readonly [P in K]: A }>

  map: <B>(f: (t: T) => B) => ReaderTaskOption<R, B>
  done: () => ReaderTaskOption<R, T>
}

const extendRecord = <S extends Record<string, unknown>, K extends string, A>(
  source: S,
  key: K,
  value: A
): S & { readonly [P in K]: A } =>
  ({
    ...source,
    [key]: value,
  } as S & { readonly [P in K]: A })

export const DoRTO = <R = unknown>() => {
  const start: ReaderTaskOption<R, {}> = async () => Some({})
  const make = <T extends Record<string, unknown>>(
    acc: ReaderTaskOption<R, T>
  ): DoRTOBuilder<R, T> => ({
    bind: <K extends string, A>(k: K, rto: ReaderTaskOption<R, A>) =>
      make<T & { readonly [P in K]: A }>(async (r) => {
        const ot = await acc(r)
        if (!isSome(ot)) return None
        const oa = await rto(r)
        return isSome(oa)
          ? Some(extendRecord(ot.value, k, oa.value))
          : None
      }),

    let: <K extends string, A>(k: K, a: A) =>
      make<T & { readonly [P in K]: A }>(async (r) => {
        const ot = await acc(r)
        return isSome(ot)
          ? Some(extendRecord(ot.value, k, a))
          : None
      }),

    map: <B>(f: (t: T) => B): ReaderTaskOption<R, B> =>
      async (r) => mapO<T, B>(f)(await acc(r)),

    done: () => acc,
  })
  return make(start)
}

export const RTO_ =
  <R, A>(ma: ReaderTaskOption<R, A>): RTO_Yield<R, A> =>
  (function* () { return (yield ma) as A })()

export const genRTO =
  <R>() =>
  <A>(f: () => Generator<ReaderTaskOption<R, unknown>, A, unknown>): ReaderTaskOption<R, A> =>
  async (r: R) => {
    const it = f()
    const step = async (input?: unknown): Promise<Option<A>> => {
      const n = it.next(input)
      if (n.done) return Some(n.value as A)
      const oa = await n.value(r)
      return isSome(oa) ? step(oa.value) : None
    }
    return step()
  }
