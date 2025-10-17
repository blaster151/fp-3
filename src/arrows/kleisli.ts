import { Reader } from "../../endo-2category"
import { Ok, isErr } from "../../result"
import type { Reader as ReaderType } from "../../endo-2category"
import type { ReaderTask, ReaderTaskResult, Task } from "../../task"

export type NoInfer<T> = [T][T extends unknown ? 0 : never]

export type ArrRTR<R, E, A, B> = (a: A) => ReaderTaskResult<R, E, B>
export type ArrReader<R, A, B> = (a: A) => ReaderType<R, B>
export type ArrTask<A, B> = (a: A) => Task<B>
export type ArrReaderTask<R, A, B> = (a: A) => ReaderTask<R, B>

export const makeKleisliArrowReader = <R>() => {
  type M<B> = Reader<R, B>
  type Arr<A, B> = ArrReader<R, A, B>

  const arr =
    <A, B>(f: (a: A) => B): Arr<A, B> =>
    (a) => Reader.of<R, B>(f(a))

  const then =
    <A, B, C>(g: Arr<B, C>) =>
    (f: Arr<A, B>): Arr<A, C> =>
    (a) => (r: R) => g(f(a)(r))(r)

  const first =
    <A, B, C>(f: Arr<A, B>): Arr<readonly [A, C], readonly [B, C]> =>
    ([a, c]) => (r: R) => [f(a)(r), c] as const

  const second =
    <A, B, C>(f: Arr<B, C>): Arr<readonly [A, B], readonly [A, C]> =>
    ([a, b]) => (r: R) => [a, f(b)(r)] as const

  const split =
    <A, B, C, D>(f: Arr<A, B>, g: Arr<C, D>): Arr<readonly [A, C], readonly [B, D]> =>
    ([a, c]) => (r: R) => [f(a)(r), g(c)(r)] as const

  const fanout =
    <A, B, C>(f: Arr<A, B>, g: Arr<A, C>): Arr<A, readonly [B, C]> =>
    (a) => (r: R) => [f(a)(r), g(a)(r)] as const

  const app =
    <A, B>(): Arr<readonly [A, Arr<A, B>], B> =>
    ([a, f]) =>
    (r: R) =>
      f(a)(r)

  const applyTo =
    <A, B>(f: Arr<A, B>) =>
    (a: A): M<B> =>
      app<A, B>()([a, f])

  const idA = <A>(): Arr<A, A> => (a) => (_: R) => a

  const mapK =
    <A, B, C>(f: (b: B) => C) =>
    (ab: Arr<A, B>): Arr<A, C> =>
      then<A, B, C>(arr(f))(ab)

  const apK =
    <A, B, C>(ff: Arr<A, Arr<B, C>>) =>
    (fa: Arr<A, B>): Arr<A, C> =>
      then<A, readonly [B, Arr<B, C>], C>(app<B, C>())(fanout(fa, ff))

  const liftK2 =
    <A, B, C, D>(h: (b: B, c: C) => D) =>
    (fb: Arr<A, B>, fc: Arr<A, C>): Arr<A, D> =>
      then<A, readonly [B, C], D>(arr(([b, c]: readonly [B, C]) => h(b, c)))(fanout(fb, fc))

  const bindK_HO =
    <A, B>(f: Arr<A, Arr<A, B>>): Arr<A, B> =>
      then<A, readonly [A, Arr<A, B>], B>(app<A, B>())(fanout(idA<A>(), f))

  return { arr, then, first, second, split, fanout, app, applyTo, idA, mapK, apK, liftK2, bindK_HO }
}

export const makeKleisliArrowTask = () => {
  type Arr<A, B> = ArrTask<A, B>

  const arr =
    <A, B>(f: (a: A) => B): Arr<A, B> =>
    (a) => () => Promise.resolve(f(a))

  const then =
    <A, B, C>(g: Arr<B, C>) =>
    (f: Arr<A, B>): Arr<A, C> =>
    (a) => async () => g(await f(a)())()

  const first =
    <A, B, C>(f: Arr<A, B>): Arr<readonly [A, C], readonly [B, C]> =>
    ([a, c]) => async () => [await f(a)(), c] as const

  const second =
    <A, B, C>(f: Arr<B, C>): Arr<readonly [A, B], readonly [A, C]> =>
    ([a, b]) => async () => [a, await f(b)()] as const

  const split =
    <A, B, C, D>(f: Arr<A, B>, g: Arr<C, D>): Arr<readonly [A, C], readonly [B, D]> =>
    ([a, c]) => async () => [await f(a)(), await g(c)()] as const

  const fanout =
    <A, B, C>(f: Arr<A, B>, g: Arr<A, C>): Arr<A, readonly [B, C]> =>
    (a) => async () => [await f(a)(), await g(a)()] as const

  const app =
    <A, B>(): Arr<readonly [A, Arr<A, B>], B> =>
    ([a, f]) =>
    async () =>
      f(a)()

  const applyTo =
    <A, B>(f: Arr<A, B>) =>
    (a: A): Task<B> =>
      app<A, B>()([a, f])

  const idA = <A>(): Arr<A, A> => (a) => async () => a

  const mapK =
    <A, B, C>(f: (b: B) => C) =>
    (ab: Arr<A, B>): Arr<A, C> =>
      then<A, B, C>(arr(f))(ab)

  const apK =
    <A, B, C>(ff: Arr<A, Arr<B, C>>) =>
    (fa: Arr<A, B>): Arr<A, C> =>
      then<A, readonly [B, Arr<B, C>], C>(app<B, C>())(fanout(fa, ff))

  const liftK2 =
    <A, B, C, D>(h: (b: B, c: C) => D) =>
    (fb: Arr<A, B>, fc: Arr<A, C>): Arr<A, D> =>
      then<A, readonly [B, C], D>(arr(([b, c]: readonly [B, C]) => h(b, c)))(fanout(fb, fc))

  const bindK_HO =
    <A, B>(f: Arr<A, Arr<A, B>>): Arr<A, B> =>
      then<A, readonly [A, Arr<A, B>], B>(app<A, B>())(fanout(idA<A>(), f))

  return { arr, then, first, second, split, fanout, app, applyTo, idA, mapK, apK, liftK2, bindK_HO }
}

export const makeKleisliArrowReaderTask = <R>() => {
  type Arr<A, B> = ArrReaderTask<R, A, B>

  const arr =
    <A, B>(f: (a: A) => B): Arr<A, B> =>
    (a) => async (_: R) => f(a)

  const then =
    <A, B, C>(g: Arr<B, C>) =>
    (f: Arr<A, B>): Arr<A, C> =>
    (a) => async (r: R) => g(await f(a)(r))(r)

  const first =
    <A, B, C>(f: Arr<A, B>): Arr<readonly [A, C], readonly [B, C]> =>
    ([a, c]) => async (r: R) => [await f(a)(r), c] as const

  const second =
    <A, B, C>(f: Arr<B, C>): Arr<readonly [A, B], readonly [A, C]> =>
    ([a, b]) => async (r: R) => [a, await f(b)(r)] as const

  const split =
    <A, B, C, D>(f: Arr<A, B>, g: Arr<C, D>): Arr<readonly [A, C], readonly [B, D]> =>
    ([a, c]) => async (r: R) => [await f(a)(r), await g(c)(r)] as const

  const fanout =
    <A, B, C>(f: Arr<A, B>, g: Arr<A, C>): Arr<A, readonly [B, C]> =>
    (a) => async (r: R) => [await f(a)(r), await g(a)(r)] as const

  const app =
    <A, B>(): Arr<readonly [A, Arr<A, B>], B> =>
    ([a, f]) =>
    async (r: R) =>
      f(a)(r)

  const applyTo =
    <A, B>(f: Arr<A, B>) =>
    (a: A): ReaderTask<R, B> =>
      app<A, B>()([a, f])

  const idA = <A>(): Arr<A, A> => (a) => async (_: R) => a

  const mapK =
    <A, B, C>(f: (b: B) => C) =>
    (ab: Arr<A, B>): Arr<A, C> =>
      then<A, B, C>(arr(f))(ab)

  const apK =
    <A, B, C>(ff: Arr<A, Arr<B, C>>) =>
    (fa: Arr<A, B>): Arr<A, C> =>
      then<A, readonly [B, Arr<B, C>], C>(app<B, C>())(fanout(fa, ff))

  const liftK2 =
    <A, B, C, D>(h: (b: B, c: C) => D) =>
    (fb: Arr<A, B>, fc: Arr<A, C>): Arr<A, D> =>
      then<A, readonly [B, C], D>(arr(([b, c]: readonly [B, C]) => h(b, c)))(fanout(fb, fc))

  const bindK_HO =
    <A, B>(f: Arr<A, Arr<A, B>>): Arr<A, B> =>
      then<A, readonly [A, Arr<A, B>], B>(app<A, B>())(fanout(idA<A>(), f))

  return { arr, then, first, second, split, fanout, app, applyTo, idA, mapK, apK, liftK2, bindK_HO }
}

export const makeKleisliArrowRTR = <R, E>() => {
  type Arr<A, B> = ArrRTR<R, E, A, B>

  const arr =
    <A, B>(f: (a: A) => B): Arr<A, B> =>
    (a) => async (_: R) => Ok(f(a))

  function then<A, B, C>(g: Arr<B, C>): (f: Arr<A, B>) => Arr<A, C>
  function then<A, B, C>(g: Arr<B, C>, f: Arr<A, B>): Arr<A, C>
  function then<A, B, C>(g: Arr<B, C>, f?: Arr<A, B>): Arr<A, C> | ((f: Arr<A, B>) => Arr<A, C>) {
    const chain = (fInner: Arr<A, B>): Arr<A, C> =>
      (a: A) => async (r: R) => {
        const rb = await fInner(a)(r)
        return isErr(rb) ? rb : g(rb.value)(r)
      }

    return f === undefined ? chain : chain(f)
  }

  const first =
    <A, B, C>(f: Arr<A, B>): Arr<readonly [A, C], readonly [B, C]> =>
    ([a, c]) => async (r: R) => {
      const rb = await f(a)(r)
      return isErr(rb) ? rb : Ok([rb.value, c] as const)
    }

  const second =
    <A, B, C>(f: Arr<B, C>): Arr<readonly [A, B], readonly [A, C]> =>
    ([a, b]) => async (r: R) => {
      const rc = await f(b)(r)
      return isErr(rc) ? rc : Ok([a, rc.value] as const)
    }

  const split =
    <A, B, C, D>(f: Arr<A, B>, g: Arr<C, D>): Arr<readonly [A, C], readonly [B, D]> =>
    ([a, c]) => async (r: R) => {
      const rb = await f(a)(r); if (isErr(rb)) return rb
      const rd = await g(c)(r); if (isErr(rd)) return rd
      return Ok([rb.value, rd.value] as const)
    }

  const fanout =
    <A, B, C>(f: Arr<A, B>, g: Arr<A, C>): Arr<A, readonly [B, C]> =>
    (a) => async (r: R) => {
      const rb = await f(a)(r); if (isErr(rb)) return rb
      const rc = await g(a)(r); if (isErr(rc)) return rc
      return Ok([rb.value, rc.value] as const)
    }

  const app =
    <A, B>(): Arr<readonly [A, Arr<A, B>], B> =>
    ([a, f]) =>
    async (r: R) =>
      f(a)(r)

  const applyTo =
    <A, B>(f: Arr<A, B>) =>
    (a: A): ReaderTaskResult<R, E, B> =>
      app<A, B>()([a, f])

  const idA = <A>(): Arr<A, A> => (a) => async (_: R) => Ok(a)

  const mapK =
    <A, B, C>(f: (b: B) => C) =>
    (ab: Arr<A, B>): Arr<A, C> =>
      then<A, B, C>(arr(f))(ab)

  const apK =
    <A, B, C>(ff: Arr<A, Arr<B, C>>) =>
    (fa: Arr<A, B>): Arr<A, C> =>
      then<A, readonly [B, Arr<B, C>], C>(app<B, C>())(fanout(fa, ff))

  const liftK2 =
    <A, B, C, D>(h: (b: B, c: C) => D) =>
    (fb: Arr<A, B>, fc: Arr<A, C>): Arr<A, D> =>
      then<A, readonly [B, C], D>(arr(([b, c]: readonly [B, C]) => h(b, c)))(fanout(fb, fc))

  const bindK_HO =
    <A, B>(f: Arr<A, Arr<A, B>>): Arr<A, B> =>
      then<A, readonly [A, Arr<A, B>], B>(app<A, B>())(fanout(idA<A>(), f))

  const bindK =
    <A, B>(k: (a: NoInfer<A>) => ReaderTaskResult<R, E, B>) =>
    <X>(f: (x: X) => ReaderTaskResult<R, E, A>) =>
    (x: X): ReaderTaskResult<R, E, B> =>
    async (r: R) => {
      const ra = await f(x)(r)
      return isErr(ra) ? ra : k(ra.value)(r)
    }

  return { arr, then, first, second, split, fanout, app, applyTo, idA, mapK, apK, liftK2, bindK_HO, bindK }
}
