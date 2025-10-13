import type { RunnableExample } from "./types";
import { Result } from "./structures";
import { Reader, ReaderTask, ReaderTaskResult, Task } from "./effects";
import { arr, compose, denote, fanout, first, parallel, second } from "./arrow-ir";

/**
 * Stage 019 revives the Arrow IR playground alongside Kleisli ArrowApply helpers
 * for several effect stacks.  The IR section demonstrates composition, product
 * structure, and fanout, while the Kleisli section highlights how Reader, Task,
 * ReaderTask, and ReaderTaskResult arrows use `applyTo`, `mapK`, and related
 * helpers to stay expressive.
 */

type ReaderArr<R, A, B> = (input: A) => Reader<R, B>;

type TaskArr<A, B> = (input: A) => Task<B>;

type ReaderTaskArr<R, A, B> = (input: A) => ReaderTask<R, B>;

type ReaderTaskResultArr<R, E, A, B> = (input: A) => ReaderTaskResult<R, E, B>;

function makeKleisliArrowReader<R>() {
  const arrR = <A, B>(fn: (value: A) => B): ReaderArr<R, A, B> => (input) => () => fn(input);

  const then = <A, B, C>(secondArr: ReaderArr<R, B, C>) =>
    (firstArr: ReaderArr<R, A, B>): ReaderArr<R, A, C> =>
      (input) => (environment) => secondArr(firstArr(input)(environment))(environment);

  const fanoutReader = <A, B, C>(
    leftArr: ReaderArr<R, A, B>,
    rightArr: ReaderArr<R, A, C>,
  ): ReaderArr<R, A, readonly [B, C]> =>
    (input) => (environment) => [leftArr(input)(environment), rightArr(input)(environment)];

  const mapK = <A, B, C>(mapper: (value: B) => C) =>
    (arrow: ReaderArr<R, A, B>): ReaderArr<R, A, C> =>
      (input) => (environment) => mapper(arrow(input)(environment));

  const liftK2 = <A, B, C, D>(join: (left: B, right: C) => D) =>
    (leftArr: ReaderArr<R, A, B>, rightArr: ReaderArr<R, A, C>): ReaderArr<R, A, D> =>
      (input) => (environment) =>
        join(leftArr(input)(environment), rightArr(input)(environment));

  const app = <A, B>(): ReaderArr<R, readonly [A, ReaderArr<R, A, B>], B> =>
    ([value, arrow]) => (environment) => arrow(value)(environment);

  const applyTo = <A, B>(arrow: ReaderArr<R, A, B>) => (value: A): Reader<R, B> => app<A, B>()([value, arrow]);

  return { arr: arrR, then, mapK, liftK2, applyTo, fanout: fanoutReader };
}

function makeKleisliArrowTask() {
  const arrT = <A, B>(fn: (value: A) => B): TaskArr<A, B> => (input) => async () => fn(input);

  const then = <A, B, C>(secondArr: TaskArr<B, C>) =>
    (firstArr: TaskArr<A, B>): TaskArr<A, C> =>
      (input) => async () => secondArr(await firstArr(input)())();

  const app = <A, B>(): TaskArr<readonly [A, TaskArr<A, B>], B> =>
    ([value, arrow]) => async () => arrow(value)();

  const applyTo = <A, B>(arrow: TaskArr<A, B>) => (value: A): Task<B> => app<A, B>()([value, arrow]);

  return { arr: arrT, then, applyTo };
}

function makeKleisliArrowReaderTask<R>() {
  const arrRT = <A, B>(fn: (value: A) => B): ReaderTaskArr<R, A, B> =>
    (input) => async () => fn(input);

  const then = <A, B, C>(secondArr: ReaderTaskArr<R, B, C>) =>
    (firstArr: ReaderTaskArr<R, A, B>): ReaderTaskArr<R, A, C> =>
      (input) => async (environment) => secondArr(await firstArr(input)(environment))(environment);

  const app = <A, B>(): ReaderTaskArr<R, readonly [A, ReaderTaskArr<R, A, B>], B> =>
    ([value, arrow]) => async (environment) => arrow(value)(environment);

  const applyTo = <A, B>(arrow: ReaderTaskArr<R, A, B>) =>
    (value: A): ReaderTask<R, B> => app<A, B>()([value, arrow]);

  return { arr: arrRT, then, applyTo };
}

function makeKleisliArrowReaderTaskResult<R, E>() {
  const arrRTR = <A, B>(fn: (value: A) => B): ReaderTaskResultArr<R, E, A, B> =>
    (input) => async () => Result.ok(fn(input));

  const then = <A, B, C>(secondArr: ReaderTaskResultArr<R, E, B, C>) =>
    (firstArr: ReaderTaskResultArr<R, E, A, B>): ReaderTaskResultArr<R, E, A, C> =>
      (input) => async (environment) => {
        const head = await firstArr(input)(environment);
        if (head.kind === "err") {
          return head;
        }
        return secondArr(head.value)(environment);
      };

  const app = <A, B>(): ReaderTaskResultArr<R, E, readonly [A, ReaderTaskResultArr<R, E, A, B>], B> =>
    ([value, arrow]) => async (environment) => arrow(value)(environment);

  const applyTo = <A, B>(arrow: ReaderTaskResultArr<R, E, A, B>) =>
    (value: A): ReaderTaskResult<R, E, B> => app<A, B>()([value, arrow]);

  return { arr: arrRTR, then, applyTo };
}

function describeResult(result: Result<string, number>): string {
  return result.kind === "ok" ? `✔ ${result.value}` : `✘ ${result.error}`;
}

export const arrowIrCoreAndArrowApplyExtensions: RunnableExample = {
  id: "019",
  title: "Arrow IR core and ArrowApply extensions",
  outlineReference: 19,
  summary:
    "Showcases Arrow IR composition/fanout alongside Reader, Task, ReaderTask, and ReaderTaskResult ArrowApply helpers and derived combinators.",
  async run() {
    const increment = arr((value: number) => value + 1, "inc");
    const double = arr((value: number) => value * 2, "dbl");
    const toStringPlan = arr((value: number) => `value=${value}`, "toString");

    const incThenDouble = compose(double, increment, "dbl ∘ inc");
    const fanoutPlan = fanout(increment, double, "fanout(inc,dbl)");
    const labelledParallel = parallel(increment, arr<string, string>((text) => text.toUpperCase(), "upper"), "parallel");
    const firstIncrement = first(increment, "first inc");
    const secondDouble = second(double, "second dbl");

    const arrowIrLogs = [
      "== Arrow IR core ==",
      `incThenDouble(4) = ${denote(incThenDouble)(4)}`,
      `fanout(5) = ${JSON.stringify(denote(fanoutPlan)(5))}`,
      `parallel([3, "ok"]) = ${JSON.stringify(denote(labelledParallel)([3, "ok"]))}`,
      `first([3, "tag"]) = ${JSON.stringify(denote(firstIncrement)([3, "tag"]))}`,
      `second(["tag", 3]) = ${JSON.stringify(denote(secondDouble)(["tag", 3]))}`,
      `stringify(dbl ∘ inc)(6) = ${denote(compose(toStringPlan, incThenDouble, "show"))(6)}`,
    ];

    const readerFactory = makeKleisliArrowReader<{ offset: number }>();
    const addOffset: ReaderArr<{ offset: number }, number, number> = (value) => (environment) =>
      value + environment.offset;
    const readerMapped = readerFactory.mapK<number, number, string>((value: number) => `offset result=${value}`)(addOffset);
    const readerLifted = readerFactory.liftK2<number, number, number, number>(
      (left: number, right: number) => left * right,
    )(addOffset, readerFactory.arr((value: number) => value + 2));
    const readerApplied = readerFactory.applyTo(addOffset)(10)({ offset: 5 });
    const readerMappedOut = readerMapped(7)({ offset: 3 });
    const readerLiftedOut = readerLifted(4)({ offset: 2 });

    const readerLogs = [
      "== Reader ArrowApply ==",
      `applyTo(addOffset)(10) with offset=5 -> ${readerApplied}`,
      `mapK(offset result)(7) with offset=3 -> ${readerMappedOut}`,
      `liftK2(addOffset, increment)(4) with offset=2 -> ${readerLiftedOut}`,
    ];

    const taskFactory = makeKleisliArrowTask();
    const delayDouble: TaskArr<number, number> = (value) => async () => value * 2;
    const taskApplied = await taskFactory.applyTo(delayDouble)(21)();
    const taskLogs = [
      "== Task ArrowApply ==",
      `delayDouble(21) -> ${taskApplied}`,
    ];

    const readerTaskFactory = makeKleisliArrowReaderTask<{ increment: number }>();
    const addIncrement: ReaderTaskArr<{ increment: number }, number, number> = (value) =>
      async (environment) => value + environment.increment;
    const readerTaskApplied = await readerTaskFactory.applyTo(addIncrement)(40)({ increment: 2 });
    const readerTaskLogs = [
      "== ReaderTask ArrowApply ==",
      `addIncrement(40) with increment=2 -> ${readerTaskApplied}`,
    ];

    const readerTaskResultFactory = makeKleisliArrowReaderTaskResult<{}, string>();
    const parseNumber: ReaderTaskResultArr<{}, string, string, number> = (text) => async () => {
      const parsed = Number(text);
      return Number.isNaN(parsed) ? Result.err("NaN") : Result.ok(parsed);
    };
    const reciprocal: ReaderTaskResultArr<{}, string, number, number> = (value) => async () =>
      value === 0 ? Result.err("division by zero") : Result.ok(1 / value);

    const parsedSix = await readerTaskResultFactory.applyTo(parseNumber)("6")({});
    const parsedNaN = await readerTaskResultFactory.applyTo(parseNumber)("not-a-number")({});
    const parseThenReciprocal = readerTaskResultFactory.then<string, number, number>(reciprocal)(parseNumber);
    const reciprocalZero = await parseThenReciprocal("0")({});

    const readerTaskResultLogs = [
      "== ReaderTaskResult ArrowApply ==",
      `parseNumber("6") -> ${describeResult(parsedSix)}`,
      `parseNumber("not-a-number") -> ${describeResult(parsedNaN)}`,
      `parseNumber("0") ▷ reciprocal -> ${describeResult(reciprocalZero)}`,
    ];

    return {
      logs: [...arrowIrLogs, ...readerLogs, ...taskLogs, ...readerTaskLogs, ...readerTaskResultLogs],
    };
  },
};
