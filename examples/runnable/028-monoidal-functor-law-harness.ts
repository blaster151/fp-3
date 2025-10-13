import type { RunnableExample } from "./types";
import { Option, Result } from "./structures";
import type { Reader, ReaderTask, ReaderTaskResult } from "./effects";

type MonoidalOption = {
  readonly unit: Option<void>;
  tensor<A, B>(left: Option<A>, right: Option<B>): Option<readonly [A, B]>;
  map<A, B>(value: Option<A>, mapper: (value: A) => B): Option<B>;
};

type MonoidalResult<E> = {
  readonly unit: Result<E, void>;
  tensor<A, B>(left: Result<E, A>, right: Result<E, B>): Result<E, readonly [A, B]>;
  map<A, B>(value: Result<E, A>, mapper: (value: A) => B): Result<E, B>;
};

type MonoidalReader<R> = {
  readonly unit: Reader<R, void>;
  tensor<A, B>(left: Reader<R, A>, right: Reader<R, B>): Reader<R, readonly [A, B]>;
  map<A, B>(value: Reader<R, A>, mapper: (value: A) => B): Reader<R, B>;
};

type MonoidalReaderTask<R> = {
  readonly unit: ReaderTask<R, void>;
  tensor<A, B>(left: ReaderTask<R, A>, right: ReaderTask<R, B>): ReaderTask<R, readonly [A, B]>;
  map<A, B>(value: ReaderTask<R, A>, mapper: (value: A) => B): ReaderTask<R, B>;
};

type MonoidalReaderTaskResult<R, E> = {
  readonly unit: ReaderTaskResult<R, E, void>;
  tensor<A, B>(
    left: ReaderTaskResult<R, E, A>,
    right: ReaderTaskResult<R, E, B>,
  ): ReaderTaskResult<R, E, readonly [A, B]>;
  map<A, B>(
    value: ReaderTaskResult<R, E, A>,
    mapper: (value: A) => B,
  ): ReaderTaskResult<R, E, B>;
};

const optionMonoidal: MonoidalOption = {
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

function resultMonoidal<E>(): MonoidalResult<E> {
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

function readerMonoidal<R>(): MonoidalReader<R> {
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

function readerTaskMonoidal<R>(): MonoidalReaderTask<R> {
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

function readerTaskResultMonoidal<R, E>(): MonoidalReaderTaskResult<R, E> {
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

type LawCheck = {
  readonly description: string;
  readonly check: () => boolean | Promise<boolean>;
};

function formatCheck(description: string, passed: boolean): string {
  return `${passed ? "✔" : "✘"} ${description}`;
}

function equalOption<A>(left: Option<A>, right: Option<A>): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "some" && right.kind === "some") {
    return JSON.stringify(left.value) === JSON.stringify(right.value);
  }
  return true;
}

function equalResult<E, A>(left: Result<E, A>, right: Result<E, A>): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "ok" && right.kind === "ok") {
    return JSON.stringify(left.value) === JSON.stringify(right.value);
  }
  if (left.kind === "err" && right.kind === "err") {
    return JSON.stringify(left.error) === JSON.stringify(right.error);
  }
  return false;
}

function evaluateChecks(checks: ReadonlyArray<LawCheck>): Promise<readonly string[]> {
  return Promise.all(
    checks.map(async ({ description, check }) => {
      try {
        const passed = await check();
        return formatCheck(description, passed);
      } catch (error) {
        return formatCheck(`${description} (threw ${String(error)})`, false);
      }
    }),
  );
}

const optionSomeNumber = Option.some(3);
const optionAnotherNumber = Option.some(4);
const optionNoneNumber = Option.none<number>();
const optionSomeLabel = Option.some("beta");
const optionNoneLabel = Option.none<string>();
const optionNumberSamples = [optionSomeNumber, optionNoneNumber] as const;
const optionLabelSamples = [optionSomeLabel, optionNoneLabel] as const;

const resultOkNumber = Result.ok(7);
const resultErrNumber = Result.err("failure");
const resultOkLabel = Result.ok("value");
const resultErrLabel = Result.err("missing");
const resultNumberSamples = [resultOkNumber, resultErrNumber] as const;
const resultLabelSamples = [resultOkLabel, resultErrLabel] as const;

const readerSamples = [0, 5, 10];
const readerTaskSamples = [1, 4, 9];
const readerTaskResultSamples = [2, -1, 6];

function optionLawChecks(): Promise<readonly string[]> {
  const monoidal = optionMonoidal;

  const checks: LawCheck[] = [
    {
      description: "Option functor identity",
      check: () => optionNumberSamples.every((sample) => equalOption(monoidal.map(sample, (x) => x), sample)),
    },
    {
      description: "Option functor composition",
      check: () => {
        const double = (x: number) => x * 2;
        const increment = (x: number) => x + 1;
        return optionNumberSamples.every((sample) =>
          equalOption(
            monoidal.map(sample, (value) => double(increment(value))),
            monoidal.map(monoidal.map(sample, increment), double),
          ),
        );
      },
    },
    {
      description: "Option left unit",
      check: () =>
        optionNumberSamples.every((sample) =>
          equalOption(
            monoidal.map(monoidal.tensor(monoidal.unit, sample), ([, value]) => value),
            sample,
          ),
        ),
    },
    {
      description: "Option right unit",
      check: () =>
        optionNumberSamples.every((sample) =>
          equalOption(
            monoidal.map(monoidal.tensor(sample, monoidal.unit), ([value]) => value),
            sample,
          ),
        ),
    },
    {
      description: "Option associativity",
      check: () => {
        const makeTriple = (left: Option<number>, middle: Option<number>, right: Option<string>) => {
          const leftAssoc = monoidal.tensor(monoidal.tensor(left, middle), right);
          const rightAssoc = monoidal.tensor(left, monoidal.tensor(middle, right));
          const flattenLeft = monoidal.map(leftAssoc, ([[a, b], c]) => [a, b, c] as const);
          const flattenRight = monoidal.map(rightAssoc, ([a, [b, c]]) => [a, b, c] as const);
          return equalOption(flattenLeft, flattenRight);
        };
        return (
          makeTriple(optionSomeNumber, optionAnotherNumber, optionSomeLabel) &&
          makeTriple(optionNoneNumber, optionSomeNumber, optionSomeLabel)
        );
      },
    },
    {
      description: "Option naturality",
      check: () =>
        optionNumberSamples.every((first) =>
          optionLabelSamples.every((second) =>
            equalOption(
              monoidal.map(monoidal.tensor(first, second), ([n, label]) => [n + 1, label.toUpperCase()] as const),
              monoidal.tensor(
                monoidal.map(first, (n) => n + 1),
                monoidal.map(second, (label) => label.toUpperCase()),
              ),
            ),
          ),
        ),
    },
  ];

  return evaluateChecks(checks);
}

function resultLawChecks(): Promise<readonly string[]> {
  const monoidal = resultMonoidal<string>();

  const checks: LawCheck[] = [
    {
      description: "Result functor identity",
      check: () => resultNumberSamples.every((sample) => equalResult(monoidal.map(sample, (x) => x), sample)),
    },
    {
      description: "Result functor composition",
      check: () => {
        const square = (x: number) => x * x;
        const negate = (x: number) => -x;
        return resultNumberSamples.every((sample) =>
          equalResult(
            monoidal.map(sample, (value) => square(negate(value))),
            monoidal.map(monoidal.map(sample, negate), square),
          ),
        );
      },
    },
    {
      description: "Result left unit",
      check: () =>
        resultNumberSamples.every((sample) =>
          equalResult(
            monoidal.map(monoidal.tensor(monoidal.unit, sample), ([, value]) => value),
            sample,
          ),
        ),
    },
    {
      description: "Result right unit",
      check: () =>
        resultNumberSamples.every((sample) =>
          equalResult(
            monoidal.map(monoidal.tensor(sample, monoidal.unit), ([value]) => value),
            sample,
          ),
        ),
    },
    {
      description: "Result associativity",
      check: () => {
        const leftAssoc = monoidal.tensor(monoidal.tensor(resultOkNumber, resultOkNumber), resultOkLabel);
        const rightAssoc = monoidal.tensor(resultOkNumber, monoidal.tensor(resultOkNumber, resultOkLabel));
        const flattenLeft = monoidal.map(leftAssoc, ([[a, b], c]) => [a, b, c] as const);
        const flattenRight = monoidal.map(rightAssoc, ([a, [b, c]]) => [a, b, c] as const);
        return equalResult(flattenLeft, flattenRight);
      },
    },
    {
      description: "Result naturality",
      check: () =>
        resultNumberSamples.every((first) =>
          resultLabelSamples.every((second) =>
            equalResult(
              monoidal.map(monoidal.tensor(first, second), ([n, label]) => [n + 1, label.toUpperCase()] as const),
              monoidal.tensor(
                monoidal.map(first, (n) => n + 1),
                monoidal.map(second, (label) => label.toUpperCase()),
              ),
            ),
          ),
        ),
    },
  ];

  return evaluateChecks(checks);
}

function readerLawChecks(): readonly string[] {
  const monoidal = readerMonoidal<number>();

  const checks: ReadonlyArray<{ description: string; check: () => boolean }> = [
    {
      description: "Reader left unit",
      check: () =>
        readerSamples.every((sample) => {
          const tensor = monoidal.tensor(monoidal.unit, (env: number) => env + sample);
          const mapped = monoidal.map(tensor, ([, value]) => value);
          return mapped(sample) === sample * 2;
        }),
    },
    {
      description: "Reader right unit",
      check: () =>
        readerSamples.every((sample) => {
          const tensor = monoidal.tensor((env: number) => env + sample, monoidal.unit);
          const mapped = monoidal.map(tensor, ([value]) => value);
          return mapped(sample) === sample * 2;
        }),
    },
    {
      description: "Reader associativity",
      check: () => {
        const readerA: Reader<number, number> = (env) => env + 1;
        const readerB: Reader<number, number> = (env) => env * 2;
        const readerC: Reader<number, string> = (env) => `env-${env}`;
        return readerSamples.every((env) => {
          const leftAssoc = monoidal.tensor(monoidal.tensor(readerA, readerB), readerC);
          const rightAssoc = monoidal.tensor(readerA, monoidal.tensor(readerB, readerC));
          const flattenLeft = monoidal.map(leftAssoc, ([[a, b], c]) => [a, b, c] as const);
          const flattenRight = monoidal.map(rightAssoc, ([a, [b, c]]) => [a, b, c] as const);
          return JSON.stringify(flattenLeft(env)) === JSON.stringify(flattenRight(env));
        });
      },
    },
  ];

  return checks.map(({ description, check }) => formatCheck(description, check()));
}

function readerTaskLawChecks(): Promise<readonly string[]> {
  const monoidal = readerTaskMonoidal<number>();

  const checks: LawCheck[] = [
    {
      description: "ReaderTask left unit",
      check: async () => {
        const tensor = monoidal.tensor(monoidal.unit, async (env: number) => env * 2);
        const mapped = monoidal.map(tensor, ([, value]) => value);
        const results = await Promise.all(readerTaskSamples.map((env) => mapped(env)));
        return results.every((value, index) => value === readerTaskSamples[index]! * 2);
      },
    },
    {
      description: "ReaderTask right unit",
      check: async () => {
        const tensor = monoidal.tensor(async (env: number) => env + 1, monoidal.unit);
        const mapped = monoidal.map(tensor, ([value]) => value);
        const results = await Promise.all(readerTaskSamples.map((env) => mapped(env)));
        return results.every((value, index) => value === readerTaskSamples[index]! + 1);
      },
    },
    {
      description: "ReaderTask associativity",
      check: async () => {
        const taskA: ReaderTask<number, number> = async (env) => env + 1;
        const taskB: ReaderTask<number, number> = async (env) => env * 2;
        const taskC: ReaderTask<number, string> = async (env) => `env-${env}`;
        const comparison = await Promise.all(
          readerTaskSamples.map(async (env) => {
            const leftAssoc = monoidal.tensor(monoidal.tensor(taskA, taskB), taskC);
            const rightAssoc = monoidal.tensor(taskA, monoidal.tensor(taskB, taskC));
            const flattenLeft = monoidal.map(leftAssoc, ([[a, b], c]) => [a, b, c] as const);
            const flattenRight = monoidal.map(rightAssoc, ([a, [b, c]]) => [a, b, c] as const);
            return JSON.stringify(await flattenLeft(env)) === JSON.stringify(await flattenRight(env));
          }),
        );
        return comparison.every(Boolean);
      },
    },
  ];

  return evaluateChecks(checks);
}

function readerTaskResultLawChecks(): Promise<readonly string[]> {
  const monoidal = readerTaskResultMonoidal<number, string>();

  const checks: LawCheck[] = [
    {
      description: "ReaderTaskResult left unit",
      check: async () => {
        const tensor = monoidal.tensor(monoidal.unit, async (env: number) => Result.ok(env * 2));
        const mapped = monoidal.map(tensor, ([, value]) => value);
        const results = await Promise.all(
          readerTaskResultSamples.map(async (env) => (await mapped(env)).kind === "ok"),
        );
        return results.every(Boolean);
      },
    },
    {
      description: "ReaderTaskResult right unit",
      check: async () => {
        const tensor = monoidal.tensor(async (env: number) => Result.ok(env + 1), monoidal.unit);
        const mapped = monoidal.map(tensor, ([value]) => value);
        const results = await Promise.all(
          readerTaskResultSamples.map(async (env) => (await mapped(env)).kind === "ok"),
        );
        return results.every(Boolean);
      },
    },
    {
      description: "ReaderTaskResult associativity",
      check: async () => {
        const rtrA: ReaderTaskResult<number, string, number> = async (env) => Result.ok(env + 1);
        const rtrB: ReaderTaskResult<number, string, number> = async (env) => Result.ok(env * 2);
        const rtrC: ReaderTaskResult<number, string, string> = async (env) => Result.ok(`env-${env}`);
        const comparison = await Promise.all(
          readerTaskResultSamples.map(async (env) => {
            const leftAssoc = monoidal.tensor(monoidal.tensor(rtrA, rtrB), rtrC);
            const rightAssoc = monoidal.tensor(rtrA, monoidal.tensor(rtrB, rtrC));
            const flattenLeft = monoidal.map(leftAssoc, ([[a, b], c]) => [a, b, c] as const);
            const flattenRight = monoidal.map(rightAssoc, ([a, [b, c]]) => [a, b, c] as const);
            const leftValue = await flattenLeft(env);
            const rightValue = await flattenRight(env);
            if (leftValue.kind === "err") {
              return rightValue.kind === "err" && leftValue.error === rightValue.error;
            }
            if (rightValue.kind === "err") {
              return false;
            }
            return JSON.stringify(leftValue.value) === JSON.stringify(rightValue.value);
          }),
        );
        return comparison.every(Boolean);
      },
    },
  ];

  return evaluateChecks(checks);
}

export const monoidalFunctorLawHarness: RunnableExample = {
  id: "028",
  title: "Monoidal functor law harness",
  outlineReference: 28,
  summary:
    "Property-based verification of functor identity/composition and lax monoidal unit, associativity, and naturality across Option, Result<string>, Reader<number>, ReaderTask<number>, and ReaderTaskEither<number, string>.",
  async run() {
    const [optionLogs, resultLogs, readerTaskLogs, readerTaskResultLogs] = await Promise.all([
      optionLawChecks(),
      resultLawChecks(),
      readerTaskLawChecks(),
      readerTaskResultLawChecks(),
    ]);

    const readerLogs = readerLawChecks();

    return {
      logs: [
        "== Option monoidal laws ==",
        ...optionLogs,
        "\n== Result monoidal laws ==",
        ...resultLogs,
        "\n== Reader monoidal laws ==",
        ...readerLogs,
        "\n== ReaderTask monoidal laws ==",
        ...readerTaskLogs,
        "\n== ReaderTaskResult monoidal laws ==",
        ...readerTaskResultLogs,
      ],
    };
  },
};
