import { RunnableExample } from "./types";
import { Option, Result } from "./structures";
import {
  SumValue,
  ProductValue,
  sumLeft,
  sumRight,
  matchSum,
  makeProduct,
  mapOption,
  mapSum,
  mapProduct,
  formatOption,
  formatResult,
  formatSum,
  formatProduct,
  pushSumEnvironment,
  pushProductEnvironment,
} from "./functors";

/**
 * Stage 024 rebuilds the Sum ⊕ and Product ⊗ endofunctor drills.  The example
 * demonstrates mapping, case analysis, and strength calculations for Option and
 * Result combinations so later natural-transformation suites can assume this
 * intuition.
 */

type OptionResultSum<A> = SumValue<Option<A>, Result<string, A>>;

type OptionResultProduct<A> = ProductValue<Option<A>, Result<string, A>>;

type EnvPayload = readonly [string, number];

function describeSum(value: OptionResultSum<number>): string {
  return formatSum(value, (option) => formatOption(option), (result) => formatResult(result));
}

function describeProduct(value: OptionResultProduct<number>): string {
  return formatProduct(value, (option) => formatOption(option), (result) => formatResult(result));
}

function mapSumNumbers(value: OptionResultSum<number>, mapper: (n: number) => number): OptionResultSum<number> {
  return mapSum(
    value,
    (option) => mapOption(option, mapper),
    (result) => Result.map(result, mapper),
  );
}

function mapProductNumbers(
  value: OptionResultProduct<number>,
  mapper: (n: number) => number,
): OptionResultProduct<number> {
  return mapProduct(
    value,
    (option) => mapOption(option, mapper),
    (result) => Result.map(result, mapper),
  );
}

function analyseSum(value: OptionResultSum<number>): string {
  return matchSum(
    value,
    (option) =>
      option.kind === "some" ? `Option branch contains ${option.value}` : "Option branch has no payload",
    (result) =>
      result.kind === "ok"
        ? `Result branch contains ${result.value}`
        : `Result branch failed with ${result.error}`,
  );
}

function summariseProduct(value: OptionResultProduct<number>): string {
  const left = value.left.kind === "some" ? value.left.value : 0;
  const right = value.right.kind === "ok" ? value.right.value : 0;
  return `Left ${left} + Right ${right} = ${left + right}`;
}

export const sumProductEndofunctorDrills: RunnableExample = {
  id: "024",
  title: "Sum/Product endofunctor drills",
  outlineReference: 24,
  summary:
    "Mapping, case analysis, and strength calculations for Option ⊕ Result and Option ⊗ Result endofunctors to solidify binary constructor intuition before natural transformations.",
  async run() {
    const sumLeftValue: OptionResultSum<number> = sumLeft(Option.some(42));
    const sumRightValue: OptionResultSum<number> = sumRight(Result.ok<string, number>(24));
    const sumErrorValue: OptionResultSum<number> = sumRight(Result.err<string, number>("network unavailable"));

    const mappedLeft = mapSumNumbers(sumLeftValue, (n) => n * 2);
    const mappedRight = mapSumNumbers(sumRightValue, (n) => n + 10);

    const sumLogs = [
      "== Sum endofunctor: Option ⊕ Result<string, _> ==",
      `Original left: ${describeSum(sumLeftValue)}`,
      `Original right: ${describeSum(sumRightValue)}`,
      `Mapped left (×2): ${describeSum(mappedLeft)}`,
      `Mapped right (+10): ${describeSum(mappedRight)}`,
      `Case analysis (left): ${analyseSum(sumLeftValue)}`,
      `Case analysis (right): ${analyseSum(sumRightValue)}`,
      `Case analysis (error): ${analyseSum(sumErrorValue)}`,
    ];

    const productValue: OptionResultProduct<number> = makeProduct(Option.some(10), Result.ok<string, number>(20));
    const productWithNone: OptionResultProduct<number> = makeProduct(Option.none<number>(), Result.ok<string, number>(30));
    const productWithError: OptionResultProduct<number> = makeProduct(
      Option.some(5),
      Result.err<string, number>("calculation overflow"),
    );

    const mappedProduct = mapProductNumbers(productValue, (n) => n * 3);

    const productLogs = [
      "== Product endofunctor: Option ⊗ Result<string, _> ==",
      `Original product: ${describeProduct(productValue)}`,
      `Product with None: ${describeProduct(productWithNone)}`,
      `Product with error: ${describeProduct(productWithError)}`,
      `Mapped product (×3): ${describeProduct(mappedProduct)}`,
      `Summarised product totals: ${summariseProduct(productValue)}`,
      `Summarised product with None: ${summariseProduct(productWithNone)}`,
    ];

    const sumEnvLeft: SumValue<Option<EnvPayload>, Result<string, EnvPayload>> = sumLeft(
      Option.some<EnvPayload>(["services", 100] as const),
    );
    const sumEnvRight: SumValue<Option<EnvPayload>, Result<string, EnvPayload>> = sumRight(
      Result.ok<string, EnvPayload>(["analytics", 200] as const),
    );
    const sumEnvError: SumValue<Option<EnvPayload>, Result<string, EnvPayload>> = sumRight(
      Result.err<string, EnvPayload>("missing context"),
    );

    const [envLeft, strengthenedLeft] = pushSumEnvironment(sumEnvLeft, "fallback");
    const [envRight, strengthenedRight] = pushSumEnvironment(sumEnvRight, "fallback");
    const [envError, strengthenedError] = pushSumEnvironment(sumEnvError, "fallback");

    const productEnvValue: ProductValue<Option<EnvPayload>, Result<string, EnvPayload>> = makeProduct(
      Option.some<EnvPayload>(["shared", 50] as const),
      Result.ok<string, EnvPayload>(["shared", 75] as const),
    );
    const productEnvError: ProductValue<Option<EnvPayload>, Result<string, EnvPayload>> = makeProduct(
      Option.none<EnvPayload>(),
      Result.err<string, EnvPayload>("untracked"),
    );

    const [productEnv, strengthenedProduct] = pushProductEnvironment(productEnvValue, "fallback");
    const [productErrorEnv, strengthenedProductError] = pushProductEnvironment(productEnvError, "fallback");

    const strengthLogs = [
      "== Strength through Sum and Product ==",
      `Sum strength (left branch): env=${envLeft}, value=${describeSum(strengthenedLeft)}`,
      `Sum strength (right branch): env=${envRight}, value=${describeSum(strengthenedRight)}`,
      `Sum strength (error branch): env=${envError}, value=${describeSum(strengthenedError)}`,
      `Product strength (shared env): env=${productEnv}, value=${describeProduct(strengthenedProduct)}`,
      `Product strength (fallback env): env=${productErrorEnv}, value=${describeProduct(strengthenedProductError)}`,
    ];

    return { logs: [...sumLogs, ...productLogs, ...strengthLogs] };
  },
};
