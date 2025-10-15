import { Reader, runReader } from "./endo-2category"
import type { Reader as ReaderType } from "./endo-2category"
import { ReaderTask } from "./task"
import type { ReaderTask as ReaderTaskType, Task } from "./task"

// =======================
// Reader monad pack
// =======================
//
// Shape: Reader<R, A> = (r: R) => A
// Goal: ergonomic `of / map / chain / ap` with R pinned once.

export const ReaderM = <R>() => ({
  // pure
  of: <A>(a: A): ReaderType<R, A> =>
    Reader.of<R, A>(a),

  // functor
  map: <A, B>(f: (a: A) => B) =>
    (ra: ReaderType<R, A>): ReaderType<R, B> =>
      Reader.map<A, B>(f)(ra),

  // monad
  chain: <A, B>(f: (a: A) => ReaderType<R, B>) =>
    (ra: ReaderType<R, A>): ReaderType<R, B> =>
      Reader.chain<A, B, R>(f)(ra),

  // applicative
  ap: <A, B>(rfab: ReaderType<R, (a: A) => B>) =>
    (rfa: ReaderType<R, A>): ReaderType<R, B> =>
      Reader.ap<R, A, B>(rfab)(rfa),

  // environment goodies
  ask: (): ReaderType<R, R> => Reader.ask<R>(),
  asks: <A>(f: (r: R) => A): ReaderType<R, A> => Reader.asks<R, A>(f),
  local: <Q>(f: (q: Q) => R) =>
    <A>(rq: ReaderType<R, A>): ReaderType<Q, A> =>
      Reader.local<R, Q>(f)(rq),

  // tiny runner
  run: <A>(ra: ReaderType<R, A>, r: R): A => runReader(ra, r),
})

/**
 * Kleisli for Reader
 * ------------------
 * Reader<R, A> = (r: R) => A
 * A Kleisli arrow here is A -> Reader<R, B>.
 * Composition (>=>):
 *   (f >=> g)(a): Reader<R, C> =
 *     r => {
 *       const b = f(a)(r)
 *       return g(b)(r)
 *     }
 * This is exactly what `Reader.chain` does; `composeK_Reader` just
 * gives you the nicer A -> Reader<R,_> composition style.
 */

/** Kleisli composition for Reader */
export const composeK_Reader =
  <R, A, B, C>(f: (a: A) => ReaderType<R, B>, g: (b: B) => ReaderType<R, C>) =>
  (a: A): ReaderType<R, C> =>
  (r: R) =>
    g(f(a)(r))(r)

// =======================
// ReaderTask monad pack
// =======================
//
// Shape: ReaderTask<R, A> = (r: R) => Promise<A>
// Goal: ergonomic `of / map / chain / ap`, plus fromTask/fromReader.

export const ReaderTaskM = <R>() => ({
  // pure
  of:  <A>(a: A): ReaderTaskType<R, A> =>
    ReaderTask.of<R, A>(a),

  // interop
  fromTask:  <A>(ta: Task<A>): ReaderTaskType<R, A> =>
    async (_: R) => ta(),
  fromReader:<A>(ra: ReaderType<R, A>): ReaderTaskType<R, A> =>
    async (r) => ra(r),

  // functor
  map: <A, B>(f: (a: A) => B) =>
    (rta: ReaderTaskType<R, A>): ReaderTaskType<R, B> =>
    async (r) => f(await rta(r)),

  // monad
  chain: <A, B>(f: (a: A) => ReaderTaskType<R, B>) =>
    (rta: ReaderTaskType<R, A>): ReaderTaskType<R, B> =>
    async (r) => {
      const a = await rta(r)
      return f(a)(r)
    },

  // applicative (parallel over env)
  ap: <A, B>(rtfab: ReaderTaskType<R, (a: A) => B>) =>
    (rta: ReaderTaskType<R, A>): ReaderTaskType<R, B> =>
    async (r) => {
      const [fab, a] = await Promise.all([rtfab(r), rta(r)])
      return fab(a)
    },

  // environment goodies
  ask:  (): ReaderTaskType<R, R> => ReaderTask.ask<R>(),
  asks: <A>(f: (r: R) => A): ReaderTaskType<R, A> => ReaderTask.asks<R, A>(f),
  local: <Q>(f: (q: Q) => R) =>
    <A>(rtq: ReaderTaskType<R, A>): ReaderTaskType<Q, A> =>
      ReaderTask.local<R, Q>(f)(rtq),

  // tiny runner
  run:  <A>(rta: ReaderTaskType<R, A>, r: R) => rta(r),
})

/**
 * Kleisli for ReaderTask
 * ----------------------
 * ReaderTask<R, A> = (r: R) => Promise<A>
 * A Kleisli arrow is A -> ReaderTask<R, B>.
 * Composition (>=>):
 *   (f >=> g)(a): ReaderTask<R, C> =
 *     async r => {
 *       const b = await f(a)(r)
 *       return g(b)(r)
 *     }
 * Matches `ReaderTask.chain`. Because both sides share the same `r`,
 * this composes DI + async in one step, with no manual Promise or env
 * plumbing in user code.
 */

/** Kleisli composition for ReaderTask */
export const composeK_ReaderTask =
  <R, A, B, C>(f: (a: A) => ReaderTaskType<R, B>, g: (b: B) => ReaderTaskType<R, C>) =>
  (a: A): ReaderTaskType<R, C> =>
  async (r: R) => {
    const b = await f(a)(r)
    return g(b)(r)
  }



// =======================
// Do-notation: Reader
// =======================
//
// Build records step-by-step while threading the same environment R.
// No async here; everything is (r: R) => A.

export type DoReaderBuilder<R, T extends Record<string, unknown>> = {
  bind: <K extends string, A>(
    k: K,
    ra: ReaderType<R, A>
  ) => DoReaderBuilder<R, T & { readonly [P in K]: A }>

  let: <K extends string, A>(
    k: K,
    a: A
  ) => DoReaderBuilder<R, T & { readonly [P in K]: A }>

  map:  <B>(f: (t: T) => B) => ReaderType<R, B>
  done: () => ReaderType<R, T>
}

export const DoReader = <R>() => {
  const start: ReaderType<R, {}> = Reader.of<R, {}>({})
  const make = <T extends Record<string, unknown>>(acc: ReaderType<R, T>): DoReaderBuilder<R, T> => ({
    bind: <K extends string, A>(k: K, ra: ReaderType<R, A>) =>
      make<T & { readonly [P in K]: A }>((r) => {
        const base = acc(r)
        return { ...base, [k]: ra(r) } as T & { readonly [P in K]: A }
      }),

    let: <K extends string, A>(k: K, a: A) =>
      make<T & { readonly [P in K]: A }>((r) => {
        const base = acc(r)
        return { ...base, [k]: a } as T & { readonly [P in K]: A }
      }),

    map:  <B>(f: (t: T) => B): ReaderType<R, B> =>
      (r) => f(acc(r)),

    done: () => acc,
  })
  return make(start)
}
