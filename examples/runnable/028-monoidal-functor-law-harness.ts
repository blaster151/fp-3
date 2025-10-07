import { RunnableExample } from "./types";
import { Option, Result } from "./structures";
import { Reader, ReaderTask, ReaderTaskResult } from "./effects";
import {
  optionMonoidal,
  resultMonoidal,
  readerMonoidal,
  readerTaskMonoidal,
  readerTaskResultMonoidal,
} from "./monoidal";

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

const resultOkNumber = Result.ok<string, number>(7);
const resultErrNumber = Result.err<string, number>("failure");
const resultOkLabel = Result.ok<string, string>("value");
const resultErrLabel = Result.err<string, string>("missing");
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
        equalResult(
          monoidal.map(monoidal.tensor(resultOkNumber, resultOkLabel), ([count, label]) => [
            `count:${count}`,
            label.toUpperCase(),
          ] as const),
          monoidal.tensor(
            monoidal.map(resultOkNumber, (count) => `count:${count}`),
            monoidal.map(resultOkLabel, (label) => label.toUpperCase()),
          ),
        ),
    },
    {
      description: "Result error short-circuit",
      check: () =>
        equalResult(
          monoidal.tensor(resultErrNumber, resultOkLabel),
          Result.err<string, readonly [number, string]>("failure"),
        ),
    },
  ];

  return evaluateChecks(checks);
}

function readerLawChecks(): Promise<readonly string[]> {
  const monoidal = readerMonoidal<number>();

  const readerA: Reader<number, number> = (n) => n + 2;
  const readerB: Reader<number, string> = (n) => `env-${n}`;
  const readerC: Reader<number, boolean> = (n) => n % 2 === 0;

  const checks: LawCheck[] = [
    {
      description: "Reader functor identity",
      check: () => readerSamples.every((env) => monoidal.map(readerA, (x) => x)(env) === readerA(env)),
    },
    {
      description: "Reader functor composition",
      check: () => {
        const double = (x: number) => x * 2;
        const increment = (x: number) => x + 1;
        return readerSamples.every((env) =>
          monoidal.map(readerA, (value) => double(increment(value)))(env) ===
            monoidal.map(monoidal.map(readerA, increment), double)(env),
        );
      },
    },
    {
      description: "Reader left unit",
      check: () =>
        readerSamples.every((env) =>
          monoidal.map(monoidal.tensor(monoidal.unit, readerA), ([, value]) => value)(env) === readerA(env),
        ),
    },
    {
      description: "Reader right unit",
      check: () =>
        readerSamples.every((env) =>
          monoidal.map(monoidal.tensor(readerA, monoidal.unit), ([value]) => value)(env) === readerA(env),
        ),
    },
    {
      description: "Reader associativity",
      check: () =>
        readerSamples.every((env) => {
          const leftAssoc = monoidal.tensor(monoidal.tensor(readerA, readerA), readerB);
          const rightAssoc = monoidal.tensor(readerA, monoidal.tensor(readerA, readerB));
          const flattenLeft = monoidal.map(leftAssoc, ([[a, b], c]) => [a, b, c] as const);
          const flattenRight = monoidal.map(rightAssoc, ([a, [b, c]]) => [a, b, c] as const);
          return JSON.stringify(flattenLeft(env)) === JSON.stringify(flattenRight(env));
        }),
    },
    {
      description: "Reader naturality",
      check: () =>
        readerSamples.every((env) =>
          JSON.stringify(
            monoidal.map(monoidal.tensor(readerA, readerB), ([value, label]) => ({ doubled: value * 2, label }))(env),
          ) ===
            JSON.stringify(
              monoidal.tensor(
                monoidal.map(readerA, (value) => value * 2),
                monoidal.map(readerB, (label) => label),
              )(env),
            ),
        ),
    },
    {
      description: "Reader boolean tensor",
      check: () =>
        readerSamples.every((env) => {
          const tensor = monoidal.tensor(readerA, readerC);
          const [value, flag] = tensor(env);
          return value === readerA(env) && flag === readerC(env);
        }),
    },
  ];

  return evaluateChecks(checks);
}

function readerTaskLawChecks(): Promise<readonly string[]> {
  const monoidal = readerTaskMonoidal<number>();

  const asyncDouble: ReaderTask<number, number> = async (env) => env * 2;
  const asyncLabel: ReaderTask<number, string> = async (env) => `async-${env}`;

  const checks: LawCheck[] = [
    {
      description: "ReaderTask functor identity",
      check: () =>
        Promise.all(
          readerTaskSamples.map(async (env) => {
            const left = await monoidal.map(asyncDouble, (x) => x)(env);
            const right = await asyncDouble(env);
            return left === right;
          }),
        ).then((results) => results.every(Boolean)),
    },
    {
      description: "ReaderTask functor composition",
      check: () => {
        const double = (x: number) => x * 2;
        const addOne = (x: number) => x + 1;
        return Promise.all(
          readerTaskSamples.map(async (env) => {
            const left = await monoidal.map(asyncDouble, (value) => double(addOne(value)))(env);
            const right = await monoidal.map(monoidal.map(asyncDouble, addOne), double)(env);
            return left === right;
          }),
        ).then((results) => results.every(Boolean));
      },
    },
    {
      description: "ReaderTask unit tensors",
      check: () =>
        Promise.all(
          readerTaskSamples.map(async (env) => {
            const left = await monoidal.map(monoidal.tensor(monoidal.unit, asyncDouble), ([, value]) => value)(env);
            const right = await monoidal.map(monoidal.tensor(asyncDouble, monoidal.unit), ([value]) => value)(env);
            return left === (await asyncDouble(env)) && right === (await asyncDouble(env));
          }),
        ).then((results) => results.every(Boolean)),
    },
    {
      description: "ReaderTask associativity",
      check: () =>
        Promise.all(
          readerTaskSamples.map(async (env) => {
            const leftAssoc = monoidal.tensor(monoidal.tensor(asyncDouble, asyncDouble), asyncLabel);
            const rightAssoc = monoidal.tensor(asyncDouble, monoidal.tensor(asyncDouble, asyncLabel));
            const flattenLeft = monoidal.map(leftAssoc, ([[a, b], c]) => [a, b, c] as const);
            const flattenRight = monoidal.map(rightAssoc, ([a, [b, c]]) => [a, b, c] as const);
            return JSON.stringify(await flattenLeft(env)) === JSON.stringify(await flattenRight(env));
          }),
        ).then((results) => results.every(Boolean)),
    },
    {
      description: "ReaderTask naturality",
      check: () =>
        Promise.all(
          readerTaskSamples.map(async (env) => {
            const left = await monoidal.map(monoidal.tensor(asyncDouble, asyncLabel), ([value, label]) => ({
              doubled: value * 2,
              label,
            }))(env);
            const right = await monoidal.tensor(
              monoidal.map(asyncDouble, (value) => value * 2),
              monoidal.map(asyncLabel, (label) => label),
            )(env);
            return JSON.stringify(left) === JSON.stringify(right);
          }),
        ).then((results) => results.every(Boolean)),
    },
  ];

  return evaluateChecks(checks);
}

function readerTaskResultLawChecks(): Promise<readonly string[]> {
  const monoidal = readerTaskResultMonoidal<number, string>();

  const success: ReaderTaskResult<number, string, number> = async (env) =>
    env >= 0 ? Result.ok(env + 1) : Result.err("negative");
  const provideLabel: ReaderTaskResult<number, string, string> = async (env) =>
    env >= 0 ? Result.ok(`env-${env}`) : Result.err("negative");

  const checks: LawCheck[] = [
    {
      description: "ReaderTaskEither functor identity",
      check: () =>
        Promise.all(
          readerTaskResultSamples.map(async (env) =>
            equalResult(await monoidal.map(success, (x) => x)(env), await success(env)),
          ),
        ).then((results) => results.every(Boolean)),
    },
    {
      description: "ReaderTaskEither functor composition",
      check: () => {
        const double = (x: number) => x * 2;
        const decrement = (x: number) => x - 1;
        return Promise.all(
          readerTaskResultSamples.map(async (env) =>
            equalResult(
              await monoidal.map(success, (value) => double(decrement(value)))(env),
              await monoidal.map(monoidal.map(success, decrement), double)(env),
            ),
          ),
        ).then((results) => results.every(Boolean));
      },
    },
    {
      description: "ReaderTaskEither unit tensors",
      check: () =>
        Promise.all(
          readerTaskResultSamples.map(async (env) => {
            const left = await monoidal.map(monoidal.tensor(monoidal.unit, success), ([, value]) => value)(env);
            const right = await monoidal.map(monoidal.tensor(success, monoidal.unit), ([value]) => value)(env);
            return equalResult(left, await success(env)) && equalResult(right, await success(env));
          }),
        ).then((results) => results.every(Boolean)),
    },
    {
      description: "ReaderTaskEither associativity",
      check: () =>
        Promise.all(
          readerTaskResultSamples.map(async (env) => {
            const leftAssoc = monoidal.tensor(monoidal.tensor(success, success), provideLabel);
            const rightAssoc = monoidal.tensor(success, monoidal.tensor(success, provideLabel));
            const flattenLeft = monoidal.map(leftAssoc, ([[a, b], c]) => [a, b, c] as const);
            const flattenRight = monoidal.map(rightAssoc, ([a, [b, c]]) => [a, b, c] as const);
            return equalResult(await flattenLeft(env), await flattenRight(env));
          }),
        ).then((results) => results.every(Boolean)),
    },
    {
      description: "ReaderTaskEither naturality",
      check: () =>
        Promise.all(
          readerTaskResultSamples.map(async (env) => {
            const left = await monoidal.map(monoidal.tensor(success, provideLabel), ([value, label]) =>
              [value, label] as const,
            )(env);
            const right = await monoidal.tensor(
              monoidal.map(success, (value) => value),
              monoidal.map(provideLabel, (label) => label),
            )(env);
            return equalResult(left, right);
          }),
        ).then((results) => results.every(Boolean)),
    },
    {
      description: "ReaderTaskEither error short-circuit",
      check: () =>
        Promise.all(
          readerTaskResultSamples.map(async (env) =>
            env < 0
              ? equalResult(await monoidal.tensor(success, provideLabel)(env), Result.err("negative"))
              : true,
          ),
        ).then((results) => results.every(Boolean)),
    },
  ];

  return evaluateChecks(checks);
}

export const monoidalFunctorLawHarness: RunnableExample = {
  id: "028",
  title: "Monoidal functor law harness",
  outlineReference: 28,
  summary:
    "Deterministically verifies functor identity/composition and lax monoidal unit, associativity, naturality, and short-circuit behaviour for Option, Result, Reader, ReaderTask, and ReaderTaskEither.",
  async run() {
    const [optionLogs, resultLogs, readerLogs, readerTaskLogs, readerTaskResultLogs] = await Promise.all([
      optionLawChecks(),
      resultLawChecks(),
      readerLawChecks(),
      readerTaskLawChecks(),
      readerTaskResultLawChecks(),
    ]);

    return {
      logs: [
        "== Option monoidal functor laws ==",
        ...optionLogs,
        "== Result monoidal functor laws ==",
        ...resultLogs,
        "== Reader monoidal functor laws ==",
        ...readerLogs,
        "== ReaderTask monoidal functor laws ==",
        ...readerTaskLogs,
        "== ReaderTaskEither monoidal functor laws ==",
        ...readerTaskResultLogs,
      ],
    };
  },
};
