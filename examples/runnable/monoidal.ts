import { mapOption } from "./functors";
import { Option, Result, Validation } from "./structures";
import { Reader, ReaderTask, ReaderTaskResult } from "./effects";

export type MonoidalOption = {
  readonly unit: Option<void>;
  tensor<A, B>(left: Option<A>, right: Option<B>): Option<readonly [A, B]>;
  map<A, B>(value: Option<A>, mapper: (value: A) => B): Option<B>;
};

export type MonoidalResult<E> = {
  readonly unit: Result<E, void>;
  tensor<A, B>(left: Result<E, A>, right: Result<E, B>): Result<E, readonly [A, B]>;
  map<A, B>(value: Result<E, A>, mapper: (value: A) => B): Result<E, B>;
};

export type MonoidalReader<R> = {
  readonly unit: Reader<R, void>;
  tensor<A, B>(left: Reader<R, A>, right: Reader<R, B>): Reader<R, readonly [A, B]>;
  map<A, B>(value: Reader<R, A>, mapper: (value: A) => B): Reader<R, B>;
};

export type MonoidalReaderTask<R> = {
  readonly unit: ReaderTask<R, void>;
  tensor<A, B>(left: ReaderTask<R, A>, right: ReaderTask<R, B>): ReaderTask<R, readonly [A, B]>;
  map<A, B>(value: ReaderTask<R, A>, mapper: (value: A) => B): ReaderTask<R, B>;
};

export type MonoidalReaderTaskResult<R, E> = {
  readonly unit: ReaderTaskResult<R, E, void>;
  tensor<A, B>(
    left: ReaderTaskResult<R, E, A>,
    right: ReaderTaskResult<R, E, B>,
  ): ReaderTaskResult<R, E, readonly [A, B]>;
  map<A, B>(value: ReaderTaskResult<R, E, A>, mapper: (value: A) => B): ReaderTaskResult<R, E, B>;
};

export type MonoidalValidation<E> = {
  readonly unit: Validation<E, void>;
  tensor<A, B>(left: Validation<E, A>, right: Validation<E, B>): Validation<E, readonly [A, B]>;
  map<A, B>(value: Validation<E, A>, mapper: (value: A) => B): Validation<E, B>;
};

export const optionMonoidal: MonoidalOption = {
  unit: Option.some<void>(undefined),
  tensor<A, B>(left: Option<A>, right: Option<B>): Option<readonly [A, B]> {
    if (left.kind === "some" && right.kind === "some") {
      return Option.some([left.value, right.value] as const);
    }
    return Option.none();
  },
  map: mapOption,
};

export function resultMonoidal<E>(): MonoidalResult<E> {
  return {
    unit: Result.ok<E, void>(undefined),
    tensor<A, B>(left: Result<E, A>, right: Result<E, B>): Result<E, readonly [A, B]> {
      if (left.kind === "err") {
        return left;
      }
      if (right.kind === "err") {
        return right;
      }
      return Result.ok([left.value, right.value] as const);
    },
    map: Result.map,
  };
}

export function readerMonoidal<R>(): MonoidalReader<R> {
  return {
    unit: () => undefined,
    tensor<A, B>(left: Reader<R, A>, right: Reader<R, B>): Reader<R, readonly [A, B]> {
      return (environment) => [left(environment), right(environment)] as const;
    },
    map<A, B>(value: Reader<R, A>, mapper: (input: A) => B): Reader<R, B> {
      return (environment) => mapper(value(environment));
    },
  };
}

export function readerTaskMonoidal<R>(): MonoidalReaderTask<R> {
  return {
    unit: async () => undefined,
    tensor<A, B>(left: ReaderTask<R, A>, right: ReaderTask<R, B>): ReaderTask<R, readonly [A, B]> {
      return async (environment) => {
        const [a, b] = await Promise.all([left(environment), right(environment)]);
        return [a, b] as const;
      };
    },
    map<A, B>(value: ReaderTask<R, A>, mapper: (input: A) => B): ReaderTask<R, B> {
      return async (environment) => mapper(await value(environment));
    },
  };
}

export function readerTaskResultMonoidal<R, E>(): MonoidalReaderTaskResult<R, E> {
  return {
    unit: async () => Result.ok<E, void>(undefined),
    tensor<A, B>(
      left: ReaderTaskResult<R, E, A>,
      right: ReaderTaskResult<R, E, B>,
    ): ReaderTaskResult<R, E, readonly [A, B]> {
      return async (environment) => {
        const [leftResult, rightResult] = await Promise.all([
          left(environment),
          right(environment),
        ]);
        if (leftResult.kind === "err") {
          return leftResult;
        }
        if (rightResult.kind === "err") {
          return rightResult;
        }
        return Result.ok([leftResult.value, rightResult.value] as const);
      };
    },
    map<A, B>(value: ReaderTaskResult<R, E, A>, mapper: (input: A) => B): ReaderTaskResult<R, E, B> {
      return async (environment) => {
        const resolved = await value(environment);
        if (resolved.kind === "err") {
          return resolved;
        }
        return Result.ok(mapper(resolved.value));
      };
    },
  };
}

export function validationMonoidal<E>(combineErrors: (left: ReadonlyArray<E>, right: ReadonlyArray<E>) => ReadonlyArray<E>): MonoidalValidation<E> {
  return {
    unit: Validation.valid<E, void>(undefined),
    tensor<A, B>(left: Validation<E, A>, right: Validation<E, B>): Validation<E, readonly [A, B]> {
      if (left.kind === "valid" && right.kind === "valid") {
        return Validation.valid([left.value, right.value] as const);
      }
      if (left.kind === "invalid" && right.kind === "invalid") {
        return Validation.invalid(combineErrors(left.errors, right.errors));
      }
      if (left.kind === "invalid") {
        return Validation.invalid(left.errors);
      }
      if (right.kind === "invalid") {
        return Validation.invalid(right.errors);
      }
      return Validation.valid([left.value, right.value] as const);
    },
    map<A, B>(value: Validation<E, A>, mapper: (input: A) => B): Validation<E, B> {
      if (value.kind === "valid") {
        return Validation.valid(mapper(value.value));
      }
      return value;
    },
  };
}

export function zipWithOption<A, B, C>(
  left: Option<A>,
  right: Option<B>,
  combine: (a: A, b: B) => C,
): Option<C> {
  return optionMonoidal.map(optionMonoidal.tensor(left, right), ([a, b]) => combine(a, b));
}

export function zipWithResult<E, A, B, C>(
  left: Result<E, A>,
  right: Result<E, B>,
  combine: (a: A, b: B) => C,
): Result<E, C> {
  const monoidal = resultMonoidal<E>();
  return monoidal.map(monoidal.tensor(left, right), ([a, b]) => combine(a, b));
}

export function zipWithValidation<E, A, B, C>(
  left: Validation<E, A>,
  right: Validation<E, B>,
  combine: (a: A, b: B) => C,
  combineErrors: (leftErrors: ReadonlyArray<E>, rightErrors: ReadonlyArray<E>) => ReadonlyArray<E>,
): Validation<E, C> {
  const monoidal = validationMonoidal(combineErrors);
  return monoidal.map(monoidal.tensor(left, right), ([a, b]) => combine(a, b));
}
