import { None, Some, isSome } from "../../option"
import type { Option } from "../../option"
import { Ok, isOk } from "../../result"
import type { Result } from "../../result"
import { Reader } from "../../endo-2category"
import type { Reader as ReaderT } from "../../endo-2category"
import { ReaderTask, Task } from "../../task"
import type { ReaderTask as ReaderTaskT } from "../../task"
import type { FunctorValue } from "../../typeclasses"
import type { Monoid } from "../../stdlib/monoid"

/** Minimal monad interface for Kleisli/category helpers. */
export type MonadK1Like<F> = {
  readonly of: <A>(a: A) => FunctorValue<F, A>
  readonly chain: <A, B>(f: (a: A) => FunctorValue<F, B>) => (fa: FunctorValue<F, A>) => FunctorValue<F, B>
}

/** Kleisli composition for a unary monad. */
export const Kleisli = <M>(M: MonadK1Like<M>) => ({
  id:
    <A>() =>
    (a: A) =>
      M.of<A>(a),

  compose:
    <A, B, C>(f: (b: B) => FunctorValue<M, C>, g: (a: A) => FunctorValue<M, B>) =>
    (a: A) =>
      M.chain<B, C>(f)(g(a)),
})

const OptionMonadLike: MonadK1Like<'Option'> = {
  of: Some,
  chain: <A, B>(f: (a: A) => Option<B>) => (oa: Option<A>): Option<B> =>
    (isSome(oa) ? f(oa.value) : None),
}

const ResultMonadLike: MonadK1Like<'Result'> = {
  of: <A>(a: A): Result<unknown, A> => Ok(a),
  chain: <A, B>(f: (a: A) => Result<unknown, B>) => (ra: Result<unknown, A>): Result<unknown, B> =>
    (isOk(ra) ? f(ra.value) : ra),
}

export const TaskMonadLike: MonadK1Like<'Task'> = {
  of: Task.of,
  chain: Task.chain,
}

export const ReaderMonadLike: MonadK1Like<'Reader'> = {
  of: <A>(a: A) => Reader.of<unknown, A>(a) as unknown as FunctorValue<'Reader', A>,
  chain: <A, B>(f: (a: A) => FunctorValue<'Reader', B>) =>
    (ra: FunctorValue<'Reader', A>): FunctorValue<'Reader', B> =>
      Reader.chain<A, B, unknown>(f as (a: A) => ReaderT<unknown, B>)(ra as ReaderT<unknown, A>) as unknown as FunctorValue<'Reader', B>,
}

export const ReaderTaskMonadLike: MonadK1Like<'ReaderTask'> = {
  of: <A>(a: A) => ReaderTask.of<unknown, A>(a) as unknown as FunctorValue<'ReaderTask', A>,
  chain: <A, B>(f: (a: A) => FunctorValue<'ReaderTask', B>) =>
    (ra: FunctorValue<'ReaderTask', A>): FunctorValue<'ReaderTask', B> =>
      ReaderTask.chain<A, B, unknown>(f as (a: A) => ReaderTaskT<unknown, B>)(ra as ReaderTaskT<unknown, A>) as unknown as FunctorValue<'ReaderTask', B>,
}

export const K_Option = Kleisli<'Option'>(OptionMonadLike)
export const K_Result = Kleisli<'Result'>(ResultMonadLike)
export const K_Task = Kleisli<'Task'>(TaskMonadLike)
export const K_Reader = Kleisli<'Reader'>(ReaderMonadLike)
export const K_ReaderTask = Kleisli<'ReaderTask'>(ReaderTaskMonadLike)

export const StringMonoid: Monoid<string> = { empty: "", concat: (a, b) => a + b }
export const ArrayMonoid = <A>(): Monoid<ReadonlyArray<A>> => ({ empty: [], concat: (x, y) => [...x, ...y] })
