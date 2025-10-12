export type Option<T> = { readonly kind: "some"; readonly value: T } | { readonly kind: "none" };

export const Option = {
  some<T>(value: T): Option<T> {
    return { kind: "some", value };
  },
  none<T>(): Option<T> {
    return { kind: "none" };
  },
};

export type Result<E, A> =
  | { readonly kind: "ok"; readonly value: A }
  | { readonly kind: "err"; readonly error: E };

export const Result = {
  ok<E, A>(value: A): Result<E, A> {
    return { kind: "ok", value };
  },
  err<E, A>(error: E): Result<E, A> {
    return { kind: "err", error };
  },
  map<E, A, B>(result: Result<E, A>, mapper: (value: A) => B): Result<E, B> {
    if (result.kind === "ok") {
      return Result.ok(mapper(result.value));
    }
    return result;
  },
  chain<E, A, B>(result: Result<E, A>, mapper: (value: A) => Result<E, B>): Result<E, B> {
    if (result.kind === "ok") {
      return mapper(result.value);
    }
    return result;
  },
};

export type Validation<E, A> =
  | { readonly kind: "valid"; readonly value: A }
  | { readonly kind: "invalid"; readonly errors: ReadonlyArray<E> };

export const Validation = {
  valid<E, A>(value: A): Validation<E, A> {
    return { kind: "valid", value };
  },
  invalid<E, A>(errors: ReadonlyArray<E>): Validation<E, A> {
    return { kind: "invalid", errors };
  },
  concat<E>(left: Validation<E, unknown>, right: Validation<E, unknown>): Validation<E, unknown> {
    if (left.kind === "invalid" && right.kind === "invalid") {
      return Validation.invalid([...left.errors, ...right.errors]);
    }

    if (left.kind === "invalid") {
      return left;
    }

    if (right.kind === "invalid") {
      return right;
    }

    return Validation.valid(undefined);
  },
};

export type TaskResult<E, A> = Promise<Result<E, A>>;

export function resultDo<E, A>(
  program: () => Generator<Result<E, unknown>, Result<E, A>, unknown>,
): Result<E, A> {
  const iterator = program();
  let state = iterator.next();

  while (!state.done) {
    const yielded = state.value;
    if (yielded.kind === "err") {
      return yielded;
    }
    state = iterator.next(yielded.value);
  }

  return state.value;
}

export async function taskResultDo<E, A>(
  program: () => AsyncGenerator<Result<E, unknown> | TaskResult<E, unknown>, Result<E, A>, unknown>,
): Promise<Result<E, A>> {
  const iterator = program();
  let state = await iterator.next();

  while (!state.done) {
    const yielded = await resolveResult(state.value);
    if (yielded.kind === "err") {
      return yielded;
    }
    state = await iterator.next(yielded.value);
  }

  return state.value;
}

async function resolveResult<E>(
  value: Result<E, unknown> | TaskResult<E, unknown>,
): Promise<Result<E, unknown>> {
  if (value instanceof Promise) {
    return await value;
  }
  return value;
}
