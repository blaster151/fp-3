import { Err, Ok, getOrElseR, isErr, isOk, mapErr, mapR } from "../../result"
import type { Result } from "../../result"
import type { FunctorValue } from "../../typeclasses"
import type { Reader } from "../../endo-2category"
import type { ReaderTask, Task } from "../../task"
import type { Monoid } from "../../stdlib/monoid"
import { ArrayMonoid, ReaderMonadLike, ReaderTaskMonadLike, TaskMonadLike } from "../typeclasses/monad-like"
import type { MonadK1Like } from "../typeclasses/monad-like"
import { WriterInReader, WriterInReaderTask, type Writer } from "../writer/writer"

export const EitherT = <F>(F: MonadK1Like<F>) => ({
  right:  <A>(a: A) => F.of<Result<never, A>>(Ok(a)),
  left:   <E>(e: E) => F.of<Result<E, never>>(Err(e)),
  of:     <A>(a: A) => F.of<Result<never, A>>(Ok(a)),

  liftF:
    <A>(fa: FunctorValue<F, A>) =>
      F.chain<A, Result<never, A>>((a: A) => F.of(Ok(a)))(fa),

  map:
    <E, A, B>(f: (a: A) => B) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<E, B>>((ra) => F.of(mapR<E, A, B>(f)(ra)))(fea),

  mapLeft:
    <E, F2, A>(f: (e: E) => F2) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<F2, A>>((ra) => F.of(mapErr<E, F2, A>(f)(ra)))(fea),

  bimap:
    <E, F2, A, B>(l: (e: E) => F2, r: (a: A) => B) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<F2, B>>((ra) =>
        F.of(
          isOk(ra) ? Ok(r(ra.value)) : Err<F2>(l(ra.error))
        )
      )(fea),

  ap:
    <E, A, B>(ff: FunctorValue<F, Result<E, (a: A) => B>>) =>
    (fa: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, (a: A) => B>, Result<E, B>>((rf) =>
        isOk(rf)
          ? F.chain<Result<E, A>, Result<E, B>>((ra) =>
              F.of(
                isOk(ra)
                  ? Ok(rf.value(ra.value))
                  : Err<E>(ra.error)
              )
            )(fa)
          : F.of(rf)
      )(ff),

  chain:
    <E, A, E2, B>(f: (a: A) => FunctorValue<F, Result<E2, B>>) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<E | E2, B>>((ra) =>
        isOk(ra) ? f(ra.value) : F.of<Result<E | E2, B>>(Err<E | E2>(ra.error))
      )(fea),

  orElse:
    <E, A, E2>(f: (e: E) => FunctorValue<F, Result<E2, A>>) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<E | E2, A>>((ra) =>
        isErr(ra) ? f(ra.error) : F.of<Result<E | E2, A>>(ra)
      )(fea),

  getOrElse:
    <E, A>(onErr: (e: E) => A) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, A>((ra) => F.of(getOrElseR<E, A>(onErr)(ra)))(fea),

  fold:
    <E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
    (fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, B>((ra) =>
        F.of(isOk(ra) ? onOk(ra.value) : onErr(ra.error))
      )(fea),

  swap:
    <E, A>(fea: FunctorValue<F, Result<E, A>>) =>
      F.chain<Result<E, A>, Result<A, E>>((ra) =>
        F.of(isOk(ra) ? Err<A>(ra.value) : Ok(ra.error))
      )(fea),
})

export type TaskEither<E, A> = Task<Result<E, A>>
export const TaskEither = EitherT(TaskMonadLike)

export type ReaderEither<R, E, A> = Reader<R, Result<E, A>>
export const ReaderEither = EitherT(ReaderMonadLike)

export type ReaderTaskEither<R, E, A> = ReaderTask<R, Result<E, A>>
export const ReaderTaskEither = EitherT(ReaderTaskMonadLike)

export const RTE = ReaderTaskEither
export const TE = TaskEither
export const RE = ReaderEither

export const apFirstRTE =
  <R, E, A, B>(rteB: ReaderTaskEither<R, E, B>) =>
  (rteA: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, A> =>
    async (r: R) => {
      const ra = await rteA(r)
      if (isErr(ra)) return Err<E>(ra.error)
      const rb = await rteB(r)
      if (isErr(rb)) return Err<E>(rb.error)
      return Ok(ra.value)
    }

export const apSecondRTE =
  <R, E, A, B>(rteB: ReaderTaskEither<R, E, B>) =>
  (rteA: ReaderTaskEither<R, E, A>): ReaderTaskEither<R, E, B> =>
    async (r: R) => {
      const ra = await rteA(r)
      if (isErr(ra)) return Err<E>(ra.error)
      const rb = await rteB(r)
      if (isErr(rb)) return Err<E>(rb.error)
      return Ok(rb.value)
    }

export const zipWithRTE =
  <R, E, A, B, C>(f: (a: A, b: B) => C) =>
  (rteA: ReaderTaskEither<R, E, A>) =>
  (rteB: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, C> =>
    async (r: R) => {
      const ra = await rteA(r)
      if (isErr(ra)) return Err<E>(ra.error)
      const rb = await rteB(r)
      if (isErr(rb)) return Err<E>(rb.error)
      return Ok(f(ra.value, rb.value))
    }

export const zipRTE =
  <R, E, A, B>(rteA: ReaderTaskEither<R, E, A>) =>
  (rteB: ReaderTaskEither<R, E, B>): ReaderTaskEither<R, E, readonly [A, B]> =>
    zipWithRTE<R, E, A, B, readonly [A, B]>((a, b) => [a, b] as const)(rteA)(rteB)

type Merge<A, B> = { readonly [K in keyof A | keyof B]: K extends keyof B
  ? B[K]
  : K extends keyof A
    ? A[K]
    : never }

export type DoRTEBuilder<R, T, E> = {
  readonly bind: <K extends string, E2, A>(
    k: K,
    rtea: ReaderTaskEither<R, E2, A>
  ) => DoRTEBuilder<R, Merge<T, { readonly [P in K]: A }>, E | E2>
  readonly let: <K extends string, A>(
    k: K,
    f: (t: T) => A
  ) => DoRTEBuilder<R, Merge<T, { readonly [P in K]: A }>, E>
  readonly apS: <K extends string, E2, A>(
    k: K,
    rtea: ReaderTaskEither<R, E2, A>
  ) => DoRTEBuilder<R, Merge<T, { readonly [P in K]: A }>, E | E2>
  readonly apFirst: <E2, A>(rtea: ReaderTaskEither<R, E2, A>) => DoRTEBuilder<R, T, E | E2>
  readonly apSecond: <E2, A>(rtea: ReaderTaskEither<R, E2, A>) => DoRTEBuilder<R, A, E | E2>
  readonly tap: <E2>(f: (t: T) => ReaderTaskEither<R, E2, unknown>) => DoRTEBuilder<R, T, E | E2>
  readonly map: <B>(f: (t: T) => B) => ReaderTaskEither<R, E, B>
  readonly done: ReaderTaskEither<R, E, T>
}

const mergeField = <Base, K extends string, A>(
  base: Base,
  key: K,
  value: A
): Merge<Base, { readonly [P in K]: A }> =>
  ({ ...(base as Record<string, unknown>), [key]: value }) as Merge<
    Base,
    { readonly [P in K]: A }
  >

export const DoRTE = <R>() => {
  const make = <T, E>(rte: ReaderTaskEither<R, E, T>): DoRTEBuilder<R, T, E> => ({
    bind: <K extends string, E2, A>(k: K, rtea: ReaderTaskEither<R, E2, A>) =>
      make(async (r): Promise<Result<E | E2, Merge<T, { readonly [P in K]: A }>>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const next = await rtea(r)
        if (isErr(next)) return Err<E | E2>(next.error)
        return Ok(mergeField(current.value, k, next.value))
      }),

    apS: <K extends string, E2, A>(k: K, rtea: ReaderTaskEither<R, E2, A>) =>
      make(async (r): Promise<Result<E | E2, Merge<T, { readonly [P in K]: A }>>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const next = await rtea(r)
        if (isErr(next)) return Err<E | E2>(next.error)
        return Ok(mergeField(current.value, k, next.value))
      }),

    let: <K extends string, A>(k: K, f: (t: T) => A) =>
      make(async (r): Promise<Result<E, Merge<T, { readonly [P in K]: A }>>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E>(current.error)
        return Ok(mergeField(current.value, k, f(current.value)))
      }),

    apFirst: <E2, A>(rtea: ReaderTaskEither<R, E2, A>) =>
      make(async (r): Promise<Result<E | E2, T>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const next = await rtea(r)
        if (isErr(next)) return Err<E | E2>(next.error)
        return Ok(current.value)
      }),

    apSecond: <E2, A>(rtea: ReaderTaskEither<R, E2, A>) =>
      make(async (r): Promise<Result<E | E2, A>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const next = await rtea(r)
        if (isErr(next)) return Err<E | E2>(next.error)
        return Ok(next.value)
      }),

    tap: <E2>(f: (t: T) => ReaderTaskEither<R, E2, unknown>) =>
      make(async (r): Promise<Result<E | E2, T>> => {
        const current = await rte(r)
        if (isErr(current)) return Err<E | E2>(current.error)
        const effect = await f(current.value)(r)
        if (isErr(effect)) return Err<E | E2>(effect.error)
        return Ok(current.value)
      }),

    map: (f) =>
      async (r: R) => {
        const current = await rte(r)
        if (isErr(current)) return Err<E>(current.error)
        return Ok(f(current.value))
      },

    done: rte,
  })

  return make(async (_r: R) => Ok({} as const))
}

export type WriterReaderTaskEither<W, R, E, A> =
  ReaderTask<R, Writer<W, Result<E, A>>>

export const WRTE = <W>(M: Monoid<W>) => {
  type _WRTE<R, E, A> = WriterReaderTaskEither<W, R, E, A>

  const liftRTE =
    <R, E, A>(rte: ReaderTaskEither<R, E, A>): _WRTE<R, E, A> =>
      async (r: R) => {
        const ra = await rte(r)
        return [ra, M.empty] as const
      }

  const stripLog =
    <R, E, A>(m: _WRTE<R, E, A>): ReaderTaskEither<R, E, A> =>
      async (r: R) => {
        const [ra] = await m(r)
        return ra
      }

  const right =
    <R = unknown, E = never, A = never>(a: A): _WRTE<R, E, A> =>
      async (_: R) => [Ok(a) as Result<E, A>, M.empty] as const

  const left =
    <R = unknown, E = never>(e: E): _WRTE<R, E, never> =>
      async (_: R) => [Err(e), M.empty] as const

  const of =
    <R = unknown, A = never>(a: A): _WRTE<R, never, A> => right<R, never, A>(a)

  const map =
    <R, E, A, B>(f: (a: A) => B) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, E, B> =>
      async (r: R) => {
        const [ra, w] = await ma(r)
        return [mapR<E, A, B>(f)(ra), w] as const
      }

  const mapLeft =
    <R, E, F2, A>(f: (e: E) => F2) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, F2, A> =>
      async (r: R) => {
        const [ra, w] = await ma(r)
        return [mapErr<E, F2, A>(f)(ra), w] as const
      }

  const bimap =
    <R, E, F2, A, B>(l: (e: E) => F2, r: (a: A) => B) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, F2, B> =>
      async (env: R) => {
        const [ra, w] = await ma(env)
        return [mapErr<E, F2, B>(l)(mapR<E, A, B>(r)(ra)), w] as const
      }

  const ap =
    <R, E, A, B>(mf: _WRTE<R, E, (a: A) => B>) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, E, B> =>
      async (r: R) => {
        const [rf, wf] = await mf(r)
        if (isErr(rf)) return [rf, wf] as const
        const [ra, wa] = await ma(r)
        return [mapR<E, A, B>((a) => rf.value(a))(ra), M.concat(wf, wa)] as const
      }

  const chain =
    <R, E, A, F2, B>(f: (a: A) => _WRTE<R, F2, B>) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, E | F2, B> =>
      async (r: R) => {
        const [ra, w1] = await ma(r)
        if (isErr(ra)) return [Err<E | F2>(ra.error), w1] as const
        const [rb, w2] = await f(ra.value)(r)
        return [mapErr<F2, E | F2, B>((e) => e)(rb), M.concat(w1, w2)] as const
      }

  const orElse =
    <R, E, A, F2>(f: (e: E) => _WRTE<R, F2, A>) =>
    (ma: _WRTE<R, E, A>): _WRTE<R, E | F2, A> =>
      async (r: R) => {
        const [ra, w1] = await ma(r)
        if (isOk(ra)) return [mapErr<E, E | F2, A>((e) => e)(ra), w1] as const
        const [rb, w2] = await f(ra.error)(r)
        return [mapErr<F2, E | F2, A>((e) => e)(rb), M.concat(w1, w2)] as const
      }

  const tell =
    <R = unknown>(w: W): _WRTE<R, never, void> =>
      async (_: R) => [Ok<void>(undefined), w] as const

  const listen =
    <R, E, A>(ma: _WRTE<R, E, A>): _WRTE<R, E, readonly [A, W]> =>
      async (r: R) => {
        const [ra, w] = await ma(r)
        return [mapR<E, A, readonly [A, W]>((a) => [a, w] as const)(ra), w] as const
      }

  const pass =
    <R, E, A>(ma: _WRTE<R, E, readonly [A, (w: W) => W]>): _WRTE<R, E, A> =>
      async (r: R) => {
        const [ra, w] = await ma(r)
        if (isErr(ra)) return [Err<E>(ra.error), w] as const
        const [a, tweak] = ra.value
        return [Ok(a) as Result<E, A>, tweak(w)] as const
      }

  const apFirst =
    <R, E, A, B>(mb: WriterReaderTaskEither<W, R, E, B>) =>
    (ma: WriterReaderTaskEither<W, R, E, A>): WriterReaderTaskEither<W, R, E, A> =>
      chain<R, E, A, E, A>((a) => map<R, E, B, A>(() => a)(mb))(ma)

  const apSecond =
    <R, E, A, B>(mb: WriterReaderTaskEither<W, R, E, B>) =>
    (ma: WriterReaderTaskEither<W, R, E, A>): WriterReaderTaskEither<W, R, E, B> =>
      chain<R, E, A, E, B>(() => mb)(ma)

  const zipWith =
    <R, E, A, B, C>(f: (a: A, b: B) => C) =>
    (ma: WriterReaderTaskEither<W, R, E, A>) =>
    (mb: WriterReaderTaskEither<W, R, E, B>): WriterReaderTaskEither<W, R, E, C> =>
      chain<R, E, A, E, C>((a) => map<R, E, B, C>((b) => f(a, b))(mb))(ma)

  const zip =
    <R, E, A, B>(ma: WriterReaderTaskEither<W, R, E, A>) =>
    (mb: WriterReaderTaskEither<W, R, E, B>): WriterReaderTaskEither<W, R, E, readonly [A, B]> =>
      zipWith<R, E, A, B, readonly [A, B]>((a, b) => [a, b] as const)(ma)(mb)

  return {
    right,
    left,
    of,
    map,
    mapLeft,
    bimap,
    ap,
    chain,
    orElse,
    tell,
    listen,
    pass,
    apFirst,
    apSecond,
    zipWith,
    zip,
    liftRTE,
    stripLog,
    getOrElse:
      <R, E, A>(onErr: (e: E) => A) =>
      (ma: _WRTE<R, E, A>): ReaderTask<R, Writer<W, A>> =>
        async (r: R) => {
          const [ra, w] = await ma(r)
          return [getOrElseR<E, A>(onErr)(ra), w] as const
        },

    fold:
      <R, E, A, B>(onErr: (e: E) => B, onOk: (a: A) => B) =>
      (ma: _WRTE<R, E, A>): ReaderTask<R, Writer<W, B>> =>
        async (r: R) => {
          const [ra, w] = await ma(r)
          return [isOk(ra) ? onOk(ra.value) : onErr((ra as Err<E>).error), w] as const
        },
  }
}

export const LogArray = ArrayMonoid<string>()
export const MW_R = WriterInReader(LogArray)
export const MW_RT = WriterInReaderTask(LogArray)
