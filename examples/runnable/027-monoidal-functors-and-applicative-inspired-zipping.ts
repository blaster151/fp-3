import type { RunnableExample } from "./types";
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
  map<A, B>(value: Option<A>, mapper: (value: A) => B): Option<B> {
    if (value.kind === "some") {
      return Option.some(mapper(value.value));
    }
    return value;
  },
};

export function resultMonoidal<E>(): MonoidalResult<E> {
  return {
    unit: Result.ok(undefined),
    tensor<A, B>(left: Result<E, A>, right: Result<E, B>): Result<E, readonly [A, B]> {
      if (left.kind === "err") {
        return left;
      }
      if (right.kind === "err") {
        return right;
      }
      return Result.ok([left.value, right.value] as const);
    },
    map<A, B>(value: Result<E, A>, mapper: (value: A) => B): Result<E, B> {
      if (value.kind === "ok") {
        return Result.ok(mapper(value.value));
      }
      return value;
    },
  };
}

export function readerMonoidal<R>(): MonoidalReader<R> {
  return {
    unit: () => undefined,
    tensor<A, B>(left: Reader<R, A>, right: Reader<R, B>): Reader<R, readonly [A, B]> {
      return (environment) => [left(environment), right(environment)] as const;
    },
    map<A, B>(value: Reader<R, A>, mapper: (value: A) => B): Reader<R, B> {
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
    map<A, B>(value: ReaderTask<R, A>, mapper: (value: A) => B): ReaderTask<R, B> {
      return async (environment) => mapper(await value(environment));
    },
  };
}

export function readerTaskResultMonoidal<R, E>(): MonoidalReaderTaskResult<R, E> {
  return {
    unit: async () => Result.ok(undefined),
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
    map<A, B>(value: ReaderTaskResult<R, E, A>, mapper: (value: A) => B): ReaderTaskResult<R, E, B> {
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

export function validationMonoidal<E>(
  combineErrors: (left: ReadonlyArray<E>, right: ReadonlyArray<E>) => ReadonlyArray<E>,
): MonoidalValidation<E> {
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
    map<A, B>(value: Validation<E, A>, mapper: (value: A) => B): Validation<E, B> {
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

function formatOption<T>(option: Option<T>): string {
  return option.kind === "some" ? `Some(${String(option.value)})` : "None";
}

function formatResult<E, A>(result: Result<E, A>): string {
  return result.kind === "ok" ? `Ok(${String(result.value)})` : `Err(${String(result.error)})`;
}

function formatValidation<E, A>(validation: Validation<E, A>): string {
  return validation.kind === "valid"
    ? `Valid(${String(validation.value)})`
    : `Invalid([${validation.errors.join(",")}])`;
}

const optionPairMonoidal = optionMonoidal;
const stringResultMonoidal = resultMonoidal<string>();
const numberReaderMonoidal = readerMonoidal<number>();
const readerTaskMonoidalInstance = readerTaskMonoidal<{ readonly region: string }>();
const readerTaskResultMonoidalInstance = readerTaskResultMonoidal<{ readonly feature: string }, string>();
const validationMonoidalInstance = validationMonoidal<string>((left, right) => [...left, ...right]);

export const monoidalFunctorsAndApplicativeInspiredZipping: RunnableExample = {
  id: "027",
  title: "Monoidal functors and applicative-inspired zipping",
  outlineReference: 27,
  summary:
    "Zipping Option, Result, Reader, ReaderTask, ReaderTaskEither, and Validation payloads with monoidal units and zipWith-style helpers.",
  async run() {
    const optionSection = (() => {
      const someNumber = Option.some(5);
      const someLabel = Option.some("alpha");
      const noneValue = Option.none<string>();

      const zipped = optionPairMonoidal.tensor(someNumber, someLabel);
      const zippedWithNone = optionPairMonoidal.tensor(someNumber, noneValue);
      const combined = zipWithOption(someNumber, someLabel, (n, label) => `${label}:${n * 2}`);

      return [
        "== Option monoidal functor ==",
        `Tensor(Some(5), Some('alpha')) → ${formatOption(zipped)}`,
        `Tensor(Some(5), None) → ${formatOption(zippedWithNone)}`,
        `zipWith(Some(5), Some('alpha')) doubling number → ${formatOption(combined)}`,
      ];
    })();

    const resultSection = (() => {
      const okCount = Result.ok(12);
      const okLabel = Result.ok("records");
      const errValue = Result.err("unreachable service");

      const zipped = stringResultMonoidal.tensor(okCount, okLabel);
      const zippedError = stringResultMonoidal.tensor(okCount, errValue);
      const zipWithValue = zipWithResult(okCount, okLabel, (count, label) => `${count} ${label}`);

      return [
        "== Result monoidal functor (short-circuiting) ==",
        `Tensor(Ok(12), Ok('records')) → ${formatResult(zipped)}`,
        `Tensor(Ok(12), Err('unreachable service')) → ${formatResult(zippedError)}`,
        `zipWith combine → ${formatResult(zipWithValue)}`,
      ];
    })();

    const readerSection = (() => {
      const increment: Reader<number, number> = (seed) => seed + 1;
      const toLabel: Reader<number, string> = (seed) => `seed-${seed}`;

      const tensorReader = numberReaderMonoidal.tensor(increment, toLabel);
      const zipWithReader = numberReaderMonoidal.map(tensorReader, ([value, label]) => `${label}:${value}`);

      return [
        "== Reader monoidal functor ==",
        `Tensor applied to 7 → ${JSON.stringify(tensorReader(7))}`,
        `Mapped tensor applied to 7 → ${zipWithReader(7)}`,
      ];
    })();

    const readerTaskSection = async () => {
      const fetchRegion: ReaderTask<{ readonly region: string }, string> = async (env) => `region-${env.region}`;
      const fetchLatency: ReaderTask<{ readonly region: string }, number> = async (env) =>
        env.region === "eu" ? 120 : 80;

      const tensorTask = readerTaskMonoidalInstance.tensor(fetchRegion, fetchLatency);
      const mappedTask = readerTaskMonoidalInstance.map(tensorTask, ([region, latency]) => `${region} (${latency}ms)`);

      const euResult = await tensorTask({ region: "eu" });
      const usSummary = await mappedTask({ region: "us" });

      return [
        "== ReaderTask monoidal functor ==",
        `Tensor applied to {region: 'eu'} → ${JSON.stringify(euResult)}`,
        `Mapped tensor applied to {region: 'us'} → ${usSummary}`,
      ];
    };

    const readerTaskEitherSection = async () => {
      const fetchFeatureFlag: ReaderTaskResult<{ readonly feature: string }, string, boolean> = async (env) =>
        env.feature === "beta" ? Result.ok(true) : Result.err(`Missing flag for ${env.feature}`);
      const fetchQuota: ReaderTaskResult<{ readonly feature: string }, string, number> = async (env) =>
        env.feature === "beta" ? Result.ok(25) : Result.ok(10);

      const tensor = readerTaskResultMonoidalInstance.tensor(fetchFeatureFlag, fetchQuota);
      const mapped = readerTaskResultMonoidalInstance.map(tensor, ([enabled, quota]) =>
        enabled ? `enabled:${quota}` : `disabled:${quota}`,
      );

      const betaResult = await tensor({ feature: "beta" });
      const betaSummary = await mapped({ feature: "beta" });
      const prodResult = await tensor({ feature: "prod" });

      return [
        "== ReaderTaskEither monoidal functor ==",
        `Tensor applied to {feature: 'beta'} → ${formatResult(betaResult)}`,
        `Mapped tensor applied to {feature: 'beta'} → ${formatResult(betaSummary)}`,
        `Tensor applied to {feature: 'prod'} → ${formatResult(prodResult)}`,
      ];
    };

    const validationSection = (() => {
      const validName = Validation.valid<string, string>("service-A");
      const validPort = Validation.valid<string, number>(8080);
      const invalidName = Validation.invalid<string, string>(["name missing"]);
      const invalidPort = Validation.invalid<string, number>(["port invalid"]);

      const success = validationMonoidalInstance.tensor(validName, validPort);
      const aggregatedErrors = validationMonoidalInstance.tensor(invalidName, invalidPort);
      const mixed = validationMonoidalInstance.tensor(validName, invalidPort);
      const mapped = zipWithValidation(validName, validPort, (name, port) => `${name}:${port}`, (left, right) => [...left, ...right]);

      return [
        "== Validation monoidal functor (error accumulation) ==",
        `Tensor(Valid('service-A'), Valid(8080)) → ${formatValidation(success)}`,
        `Tensor(Invalid(name missing), Invalid(port invalid)) → ${formatValidation(aggregatedErrors)}`,
        `Tensor(Valid('service-A'), Invalid(port invalid)) → ${formatValidation(mixed)}`,
        `zipWith combine → ${formatValidation(mapped)}`,
      ];
    })();

    const [readerTaskLogs, readerTaskEitherLogs] = await Promise.all([
      readerTaskSection(),
      readerTaskEitherSection(),
    ]);

    return {
      logs: [
        ...optionSection,
        ...resultSection,
        ...readerSection,
        ...readerTaskLogs,
        ...readerTaskEitherLogs,
        ...validationSection,
      ],
    };
  },
};
