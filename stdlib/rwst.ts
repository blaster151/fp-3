import type { Monoid } from "./monoid"
import type { Reader } from "../endo-2category"
import type { Task } from "../task"

// =======================
// RWST — Reader • Writer • State • Task
// =======================
//
// Type: (r) => (s) => Promise<[A, S, W]>
//  R: environment (deps)
//  S: threaded state
//  W: accumulated log (Monoid)

export type RWST<R, W, S, A> = (r: R) => (s: S) => Promise<readonly [A, S, W]>

export const RWST = {
  of:
    <A>(a: A) =>
    <W>(M: Monoid<W>) =>
    <S>() =>
    <R>(): RWST<R, W, S, A> =>
    (_r) => async (s) => [a, s, M.empty] as const,

  fromTask:
    <A>(ta: Task<A>) =>
    <W>(M: Monoid<W>) =>
    <S>() =>
    <R>(): RWST<R, W, S, A> =>
    (_r) => async (s) => [await ta(), s, M.empty] as const,

  fromReader:
    <R, A>(ra: Reader<R, A>) =>
    <W>(M: Monoid<W>) =>
    <S>(): RWST<R, W, S, A> =>
    (r) => async (s) => [ra(r), s, M.empty] as const,

  tell:
    <W>(w: W) =>
    <S>() =>
    <R>(): RWST<R, W, S, void> =>
    (_r) => async (s) => [undefined, s, w] as const,

  listen:
    <A, W, S, R>(m: RWST<R, W, S, A>): RWST<R, W, S, readonly [A, W]> =>
    (r) => async (s0) => {
      const [a, s1, w] = await m(r)(s0)
      return [[a, w] as const, s1, w] as const
    },

  censor:
    <W>(f: (w: W) => W) =>
    <S, A, R>(m: RWST<R, W, S, A>): RWST<R, W, S, A> =>
    (r) => async (s0) => {
      const [a, s1, w] = await m(r)(s0)
      return [a, s1, f(w)] as const
    },

  map:
    <A, B>(f: (a: A) => B) =>
    <W>(M: Monoid<W>) =>
    <S, R>(m: RWST<R, W, S, A>): RWST<R, W, S, B> =>
    (r) => async (s0) => {
      void M
      const [a, s1, w] = await m(r)(s0)
      return [f(a), s1, w] as const
    },

  chain:
    <A, B, W>(f: (a: A) => RWST<unknown, W, unknown, B>, M: Monoid<W>) =>
    <S, R>(m: RWST<R, W, S, A>): RWST<R, W, S, B> =>
    (r) => async (s0) => {
      const [a, s1, w1] = await m(r)(s0)
      const [b, s2, w2] = await (f(a) as RWST<R, W, S, B>)(r)(s1)
      return [b, s2, M.concat(w1, w2)] as const
    },

  // State ops
  get:
    <W>(M: Monoid<W>) =>
    <S>() =>
    <R>(): RWST<R, W, S, S> =>
    (_r) => async (s) => [s, s, M.empty] as const,

  put:
    <W>(M: Monoid<W>) =>
    <S>(s1: S) =>
    <R>(): RWST<R, W, S, void> =>
    (_r) => async (_s) => [undefined, s1, M.empty] as const,

  modify:
    <W>(M: Monoid<W>) =>
    <S>(g: (s: S) => S) =>
    <R>(): RWST<R, W, S, void> =>
    (_r) => async (s) => [undefined, g(s), M.empty] as const,

  local:
    <R, Q>(f: (q: Q) => R) =>
    <W, S, A>(m: RWST<R, W, S, A>): RWST<Q, W, S, A> =>
    (q) => (s) => m(f(q))(s),
}

export const runRWST = <R, W, S, A>(m: RWST<R, W, S, A>, r: R, s: S) => m(r)(s)
export const evalRWST = async <R, W, S, A>(m: RWST<R, W, S, A>, r: R, s: S) => (await m(r)(s))[0]
export const execRWST = async <R, W, S, A>(m: RWST<R, W, S, A>, r: R, s: S) => {
  const [, s1] = await m(r)(s)
  return s1
}
export const logRWST  = async <R, W, S, A>(m: RWST<R, W, S, A>, r: R, s: S) => {
  const [, , w] = await m(r)(s)
  return w
}

type RWST_Yield<R, W, S, A> = Generator<RWST<R, W, S, A>, A, A>
export const RWST_ =
  <R, W, S, A>(m: RWST<R, W, S, A>): RWST_Yield<R, W, S, A> =>
  (function* () { return (yield m) as A })()

export const genRWST =
  <W>(M: Monoid<W>) =>
  <R, S>() =>
  <A>(f: () => Generator<RWST<R, W, S, unknown>, A, unknown>): RWST<R, W, S, A> =>
  (r: R) =>
  async (s0: S) => {
    const it = f()
    let s = s0
    let wAcc = M.empty
    let last: unknown = undefined
    while (true) {
      const n = it.next(last)
      if (n.done) return [n.value as A, s, wAcc] as const
      const [a, s1, w] = await n.value(r)(s)
      last = a
      s = s1
      wAcc = M.concat(wAcc, w)
    }
  }

export type DoRWSTBuilder<R, W, S, T extends Record<string, unknown>> = {
  bind: <K extends string, A>(
    k: K,
    m: RWST<R, W, S, A>
  ) => DoRWSTBuilder<R, W, S, T & { readonly [P in K]: A }>

  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoRWSTBuilder<R, W, S, T & { readonly [P in K]: A }>

  map:  <B>(f: (t: T) => B) => RWST<R, W, S, B>
  done: () => RWST<R, W, S, T>
}

export const DoRWST =
  <W>(M: Monoid<W>) =>
  <R, S>() => {
    const start: RWST<R, W, S, {}> = (_r) => async (s) => [{}, s, M.empty] as const
    const make = <T extends Record<string, unknown>>(
      acc: RWST<R, W, S, T>
    ): DoRWSTBuilder<R, W, S, T> => ({
      bind: <K extends string, A>(k: K, m: RWST<R, W, S, A>) =>
        make<T & { readonly [P in K]: A }>((r) => async (s0) => {
          const [obj, s1, w1] = await acc(r)(s0)
          const [a,   s2, w2] = await m(r)(s1)
          const next = { ...obj, [k]: a } as T & { readonly [P in K]: A }
          return [next, s2, M.concat(w1, w2)] as const
        }),

      let: <K extends string, A>(k: K, a: A) =>
        make<T & { readonly [P in K]: A }>((r) => async (s0) => {
          const [obj, s1, w1] = await acc(r)(s0)
          const next = { ...obj, [k]: a } as T & { readonly [P in K]: A }
          return [next, s1, w1] as const
        }),

      map: <B>(f: (t: T) => B): RWST<R, W, S, B> =>
        (r) => async (s0) => {
          const [t, s1, w] = await acc(r)(s0)
          return [f(t), s1, w] as const
        },

      done: () => acc,
    })
    return make(start)
  }
