import { Result } from "./structures";

export type Reader<R, A> = (environment: R) => A;

export type Task<A> = () => Promise<A>;

export type ReaderTask<R, A> = (environment: R) => Promise<A>;

export type ReaderTaskResult<R, E, A> = (environment: R) => Promise<Result<E, A>>;

type ReaderArrowBase<R, Input, Output> = (input: Input) => Reader<R, Output>;

type TaskArrowBase<Input, Output> = (input: Input) => Task<Output>;

type ReaderTaskArrowBase<R, Input, Output> = (input: Input) => ReaderTask<R, Output>;

type ReaderTaskResultArrowBase<R, E, Input, Output> = (
  input: Input,
) => ReaderTaskResult<R, E, Output>;

export type ReaderArrow<R, Input, Output> = ReaderArrowBase<R, Input, Output>;

export type TaskArrow<Input, Output> = TaskArrowBase<Input, Output>;

export type ReaderTaskArrow<R, Input, Output> = ReaderTaskArrowBase<R, Input, Output>;

export type ReaderTaskResultArrow<R, E, Input, Output> = ReaderTaskResultArrowBase<
  R,
  E,
  Input,
  Output
>;

export function composeReaderArrows<R, A, B, C>(
  second: ReaderArrow<R, B, C>,
  first: ReaderArrow<R, A, B>,
): ReaderArrow<R, A, C> {
  return (input) => (environment) => second(first(input)(environment))(environment);
}

export function runReaderArrow<R, A, B>(
  arrow: ReaderArrow<R, A, B>,
  input: A,
  environment: R,
): B {
  return arrow(input)(environment);
}

export function composeTaskArrows<A, B, C>(
  second: TaskArrow<B, C>,
  first: TaskArrow<A, B>,
): TaskArrow<A, C> {
  return (input) => async () => second(await first(input)())();
}

export async function runTaskArrow<A, B>(arrow: TaskArrow<A, B>, input: A): Promise<B> {
  return arrow(input)();
}

export function composeReaderTaskArrows<R, A, B, C>(
  second: ReaderTaskArrow<R, B, C>,
  first: ReaderTaskArrow<R, A, B>,
): ReaderTaskArrow<R, A, C> {
  return (input) => async (environment) => second(await first(input)(environment))(environment);
}

export async function runReaderTaskArrow<R, A, B>(
  arrow: ReaderTaskArrow<R, A, B>,
  input: A,
  environment: R,
): Promise<B> {
  return arrow(input)(environment);
}

export function composeReaderTaskResultArrows<R, E, A, B, C>(
  second: ReaderTaskResultArrow<R, E, B, C>,
  first: ReaderTaskResultArrow<R, E, A, B>,
): ReaderTaskResultArrow<R, E, A, C> {
  return (input) => async (environment) => {
    const firstResult = await first(input)(environment);
    if (firstResult.kind === "err") {
      return firstResult;
    }
    return second(firstResult.value)(environment);
  };
}

export async function runReaderTaskResultArrow<R, E, A, B>(
  arrow: ReaderTaskResultArrow<R, E, A, B>,
  input: A,
  environment: R,
): Promise<Result<E, B>> {
  return arrow(input)(environment);
}

export function mapResult<E, A, B>(
  result: Result<E, A>,
  mapper: (value: A) => B,
): Result<E, B> {
  if (result.kind === "err") {
    return result;
  }
  return Result.ok(mapper(result.value));
}

export function bindResult<E, A, B>(
  result: Result<E, A>,
  mapper: (value: A) => Result<E, B>,
): Result<E, B> {
  if (result.kind === "err") {
    return result;
  }
  return mapper(result.value);
}
