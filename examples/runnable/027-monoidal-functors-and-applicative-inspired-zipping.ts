import type { RunnableExample } from "./types";
import { Option, Result, Validation } from "./structures";
import { Reader, ReaderTask, ReaderTaskResult } from "./effects";
import {
  optionMonoidal,
  resultMonoidal,
  readerMonoidal,
  readerTaskMonoidal,
  readerTaskResultMonoidal,
  validationMonoidal,
  zipWithOption,
  zipWithResult,
  zipWithValidation,
} from "./monoidal";

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
      const okCount = Result.ok<string, number>(12);
      const okLabel = Result.ok<string, string>("records");
      const errValue = Result.err<string, string>("unreachable service");

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
