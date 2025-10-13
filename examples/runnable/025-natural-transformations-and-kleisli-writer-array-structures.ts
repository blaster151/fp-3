import type { RunnableExample } from "./types";
import { Option, Result } from "./structures";
import { mapOption, formatOption, formatResult } from "./functors";
import { Task, ReaderTask } from "./effects";

/**
 * Stage 025 documents the natural-transformation and Kleisli/Writer/Array drills
 * that bridge the basic sum/product examples with the advanced traversable
 * suites.  Each section mirrors the pedagogical checkpoints from the legacy
 * runnable scripts while adopting the new immutable logging style.
 */

type OptionToResult<E> = {
  readonly name: string;
  transform<A>(value: Option<A>): Result<E, A>;
};

type ResultToOption<E> = {
  readonly name: string;
  transform<A>(value: Result<E, A>): Option<A>;
};

function makeOptionToResult<E>(error: () => E): OptionToResult<E> {
  return {
    name: "Option→Result",
    transform<A>(value: Option<A>): Result<E, A> {
      return value.kind === "some" ? Result.ok(value.value) : Result.err(error());
    },
  };
}

function makeResultToOption<E>(): ResultToOption<E> {
  return {
    name: "Result→Option",
    transform<A>(value: Result<E, A>): Option<A> {
      return value.kind === "ok" ? Option.some(value.value) : Option.none<A>();
    },
  };
}

function equalResult<E, A>(left: Result<E, A>, right: Result<E, A>): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "ok" && right.kind === "ok") {
    return left.value === right.value;
  }
  if (left.kind === "err" && right.kind === "err") {
    return left.error === right.error;
  }
  return false;
}

function equalOption<A>(left: Option<A>, right: Option<A>): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "some" && right.kind === "some") {
    return left.value === right.value;
  }
  return true;
}

type NaturalityReport = {
  readonly description: string;
  readonly holds: boolean;
  readonly left: string;
  readonly right: string;
};

function checkOptionResultNaturality(
  value: Option<number>,
  mapper: (n: number) => number,
  nat: OptionToResult<string>,
): NaturalityReport {
  const transformedAfterMap = nat.transform(mapOption(value, mapper));
  const mappedAfterTransform = Result.map(nat.transform(value), mapper);
  return {
    description: `${nat.name} naturality on ${formatOption(value)}`,
    holds: equalResult(transformedAfterMap, mappedAfterTransform),
    left: formatResult(transformedAfterMap),
    right: formatResult(mappedAfterTransform),
  };
}

function checkResultOptionNaturality(
  value: Result<string, number>,
  mapper: (n: number) => number,
  nat: ResultToOption<string>,
): NaturalityReport {
  const transformedAfterMap = nat.transform(Result.map(value, mapper));
  const mappedAfterTransform = mapOption(nat.transform(value), mapper);
  return {
    description: `${nat.name} naturality on ${formatResult(value)}`,
    holds: equalOption(transformedAfterMap, mappedAfterTransform),
    left: formatOption(transformedAfterMap),
    right: formatOption(mappedAfterTransform),
  };
}

type DiagnosticsEnv = {
  readonly region: string;
  readonly correlationId: string;
};

function mapTask<A, B>(task: Task<A>, mapper: (value: A) => B): Task<B> {
  return async () => mapper(await task());
}

function mapReaderTask<R, A, B>(readerTask: ReaderTask<R, A>, mapper: (value: A) => B): ReaderTask<R, B> {
  return async (env) => mapper(await readerTask(env));
}

function bindReaderTask<R, A, B>(readerTask: ReaderTask<R, A>, mapper: (value: A) => ReaderTask<R, B>): ReaderTask<R, B> {
  return async (env) => {
    const value = await readerTask(env);
    return mapper(value)(env);
  };
}

function liftTask<R, A>(task: Task<A>): ReaderTask<R, A> {
  return async () => await task();
}

type Writer<W, A> = {
  readonly value: A;
  readonly log: ReadonlyArray<W>;
};

type WriterResult<W, E, A> = Result<E, Writer<W, A>>;

function writerOf<W, A>(value: A): Writer<W, A> {
  return { value, log: [] };
}

function writerTell<W>(message: W): Writer<W, void> {
  return { value: undefined, log: [message] };
}

function writerChain<W, A, B>(writer: Writer<W, A>, mapper: (value: A) => Writer<W, B>): Writer<W, B> {
  const next = mapper(writer.value);
  return { value: next.value, log: [...writer.log, ...next.log] };
}

function writerTOf<W, E, A>(value: A): WriterResult<W, E, A> {
  return Result.ok<Writer<W, A>>({ value, log: [] });
}

function writerTTell<W, E>(message: W): WriterResult<W, E, void> {
  return Result.ok<Writer<W, void>>({ value: undefined, log: [message] });
}

function writerTChain<W, E, A, B>(
  writer: WriterResult<W, E, A>,
  mapper: (value: A) => WriterResult<W, E, B>,
): WriterResult<W, E, B> {
  if (writer.kind === "err") {
    return writer;
  }
  const next = mapper(writer.value.value);
  if (next.kind === "err") {
    return next;
  }
  return Result.ok<Writer<W, B>>({
    value: next.value.value,
    log: [...writer.value.log, ...next.value.log],
  });
}

function sequenceOptionArray<A>(values: ReadonlyArray<Option<A>>): Option<ReadonlyArray<A>> {
  const collected: A[] = [];
  for (const option of values) {
    if (option.kind === "none") {
      return Option.none<ReadonlyArray<A>>();
    }
    collected.push(option.value);
  }
  return Option.some<ReadonlyArray<A>>([...collected]);
}

function formatWriter<W, A>(writer: Writer<W, A>): string {
  const log = writer.log.join(" | ");
  return `Value: ${String(writer.value)}, Log: [${log}]`;
}

export const naturalTransformationsAndKleisliWriterArrayStructures: RunnableExample = {
  id: "025",
  title: "Natural transformations and Kleisli/Writer/Array structures",
  outlineReference: 25,
  summary:
    "Option↔Result natural transformations, Task→ReaderTask lifting, Kleisli composition, Writer/WriterT logging, and Array monad traversals.",
  async run() {
    const optionToResult = makeOptionToResult(() => "missing payload");
    const resultToOption = makeResultToOption<string>();

    const optionNaturality = [
      checkOptionResultNaturality(Option.some(7), (n) => n * 3, optionToResult),
      checkOptionResultNaturality(Option.none<number>(), (n) => n + 1, optionToResult),
    ];

    const resultNaturality = [
      checkResultOptionNaturality(Result.ok(9), (n) => n - 2, resultToOption),
      checkResultOptionNaturality(Result.err("failure"), (n) => n + 5, resultToOption),
    ];

    const naturalityLogs = [
      "== Option ↔ Result natural transformations ==",
      ...optionNaturality.map(
        (report) =>
          `${report.description}: holds=${report.holds} (transform∘map=${report.left}, map∘transform=${report.right})`,
      ),
      ...resultNaturality.map(
        (report) =>
          `${report.description}: holds=${report.holds} (transform∘map=${report.left}, map∘transform=${report.right})`,
      ),
    ];

    const fetchDiagnostics: Task<number> = async () => 21;
    const lift = liftTask<DiagnosticsEnv, number>(fetchDiagnostics);
    const liftedNaturalityTask = liftTask<DiagnosticsEnv, number>(mapTask(fetchDiagnostics, (n) => n * 2));
    const naturalityReaderTask = mapReaderTask(lift, (n) => n * 2);

    const env: DiagnosticsEnv = { region: "us-east-1", correlationId: "abc-123" };
    const [liftedViaMap, mapViaLift] = await Promise.all([
      liftedNaturalityTask(env),
      naturalityReaderTask(env),
    ]);

    const kleisliPipeline = bindReaderTask(lift, (value) => async (environment) =>
      `${environment.region}:${environment.correlationId} processed ${value}`,
    );
    const kleisliResult = await kleisliPipeline(env);

    const readerTaskLogs = [
      "== Task→ReaderTask lifting and Kleisli composition ==",
      `Naturality check (lift∘map vs map∘lift): ${liftedViaMap} vs ${mapViaLift}`,
      `Kleisli composition result: ${kleisliResult}`,
    ];

    const writerProgram = writerChain(writerTell<string>("Initialised inventory"), () =>
      writerChain(writerOf<string, number>(3), (count) =>
        writerChain(writerTell<string>(`Counted ${count} base items`), () =>
          writerChain(writerOf<string, number>(count + 2), (extended) =>
            writerChain(writerTell<string>(`Promoted total to ${extended}`), () =>
              writerOf<string, number>(extended),
            ),
          ),
        ),
      ),
    );

    const parseReading = (input: string): WriterResult<string, string, number> => {
      const trimmed = input.trim();
      if (trimmed.length === 0) {
        return Result.err("empty reading");
      }
      const value = Number(trimmed);
      if (!Number.isFinite(value)) {
        return Result.err(`invalid reading '${trimmed}'`);
      }
      return Result.ok<Writer<string, number>>({ value, log: [`Parsed '${trimmed}'`] });
    };

    const writerTPipeline = writerTChain(
      writerTTell<string, string>("Normalising sensor reading"),
      () =>
        writerTChain(parseReading("42"), (reading) =>
          writerTChain(writerTTell<string, string>(`Validated reading ${reading}`), () =>
            writerTOf<string, string, number>(reading + 8),
          ),
        ),
    );

    const writerLogs = [
      "== Writer and WriterT logging ==",
      `Writer log: ${formatWriter(writerProgram)}`,
      writerTPipeline.kind === "ok"
        ? `WriterT success: ${formatWriter(writerTPipeline.value)}`
        : `WriterT error: ${writerTPipeline.error}`,
    ];

    const sensorSequence = sequenceOptionArray([Option.some("alpha"), Option.some("beta"), Option.some("gamma")]);
    const sensorFailure = sequenceOptionArray([Option.some("alpha"), Option.none<string>(), Option.some("gamma")]);

    const arrayLogs = [
      "== Array monad traversals ==",
      `Sequence success: ${formatOption(sensorSequence)}`,
      `Sequence failure: ${formatOption(sensorFailure)}`,
    ];

    return { logs: [...naturalityLogs, ...readerTaskLogs, ...writerLogs, ...arrayLogs] };
  },
};
