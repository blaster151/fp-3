import type { FunctorValue } from "../../typeclasses"
import type { Monoid } from "../../stdlib/monoid"
import { ReaderMonadLike, ReaderTaskMonadLike } from "../typeclasses/monad-like"
import type { MonadK1Like } from "../typeclasses/monad-like"

export interface MonadWriterT<F, W> {
  readonly of: <A>(a: A) => FunctorValue<F, Writer<W, A>>
  readonly map: <A, B>(f: (a: A) => B) => (fwa: FunctorValue<F, Writer<W, A>>) => FunctorValue<F, Writer<W, B>>
  readonly chain: <A, B>(f: (a: A) => FunctorValue<F, Writer<W, B>>) => (fwa: FunctorValue<F, Writer<W, A>>) => FunctorValue<F, Writer<W, B>>
  readonly tell: (w: W) => FunctorValue<F, Writer<W, void>>
  readonly listen: <A>(fwa: FunctorValue<F, Writer<W, A>>) => FunctorValue<F, Writer<W, readonly [A, W]>>
  readonly pass: <A>(fwa: FunctorValue<F, Writer<W, readonly [A, (w: W) => W]>>) => FunctorValue<F, Writer<W, A>>
}

export type Writer<W, A> = readonly [A, W]

export const Writer = {
  of:
    <W>(M: Monoid<W>) =>
    <A>(a: A): Writer<W, A> =>
      [a, M.empty] as const,

  map:
    <W, A, B>(f: (a: A) => B) =>
    (wa: Writer<W, A>): Writer<W, B> =>
      [f(wa[0]), wa[1]] as const,

  chain:
    <W>(M: Monoid<W>) =>
    <A, B>(f: (a: A) => Writer<W, B>) =>
    (wa: Writer<W, A>): Writer<W, B> => {
      const [a, w1] = wa
      const [b, w2] = f(a)
      return [b, M.concat(w1, w2)] as const
    },

  tell:
    <W>(w: W): Writer<W, void> =>
      [undefined, w] as const,

  listen:
    <W, A>(wa: Writer<W, A>): Writer<W, readonly [A, W]> =>
      [[wa[0], wa[1]] as const, wa[1]] as const,

  pass:
    <W, A>(wfw: Writer<W, readonly [A, (w: W) => W]>): Writer<W, A> => {
      const [[a, tweak], w] = wfw
      return [a, tweak(w)] as const
    },
}

export const WriterT = <W>(M: Monoid<W>) => <F>(F: MonadK1Like<F>): MonadWriterT<F, W> => ({
  of:
    <A>(a: A) =>
      F.of<Writer<W, A>>([a, M.empty] as const),

  map:
    <A, B>(f: (a: A) => B) =>
    (fwa: FunctorValue<F, Writer<W, A>>) =>
      F.chain<Writer<W, A>, Writer<W, B>>(([a, w]: Writer<W, A>) => F.of([f(a), w] as const))(fwa),

  chain:
    <A, B>(f: (a: A) => FunctorValue<F, Writer<W, B>>) =>
    (fwa: FunctorValue<F, Writer<W, A>>) =>
      F.chain<Writer<W, A>, Writer<W, B>>(([a, w1]: Writer<W, A>) =>
        F.chain<Writer<W, B>, Writer<W, B>>(([b, w2]: Writer<W, B>) =>
          F.of([b, M.concat(w1, w2)] as const)
        )(f(a))
      )(fwa),

  tell:
    (w: W) =>
      F.of([undefined, w] as const),

  listen:
    <A>(fwa: FunctorValue<F, Writer<W, A>>) =>
      F.chain<Writer<W, A>, Writer<W, readonly [A, W]>>(
        ([a, w]: Writer<W, A>) => F.of([[a, w] as const, w] as const)
      )(fwa),

  pass:
    <A>(fwa: FunctorValue<F, Writer<W, readonly [A, (w: W) => W]>>) =>
      F.chain<Writer<W, readonly [A, (w: W) => W]>, Writer<W, A>>(
        ([[a, tweak], w]: Writer<W, readonly [A, (w: W) => W]>) =>
          F.of([a, tweak(w)] as const)
      )(fwa),
})

export const WriterInReader = <W>(M: Monoid<W>) => WriterT<W>(M)(ReaderMonadLike)
export const WriterInReaderTask = <W>(M: Monoid<W>) => WriterT<W>(M)(ReaderTaskMonadLike)
