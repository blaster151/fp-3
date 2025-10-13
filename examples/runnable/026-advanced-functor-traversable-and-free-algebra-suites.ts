import type { RunnableExample } from "./types";
import { Option, Result } from "./structures";
import {
  SumValue,
  ProductValue,
  sumLeft,
  sumRight,
  makeProduct,
  mapOption,
  mapSum,
  mapProduct,
  formatOption,
  formatResult,
  formatSum,
  formatProduct,
} from "./functors";
import { Task } from "./effects";

/**
 * Stage 026 rebuilds the advanced functor catalogue: natural transformations on
 * sums/products, traversable Promise/Task distribution, free endofunctor term
 * evaluation, Option→Result hoisting, and Promise post-composition lax 2-functor
 * scaffolding.
 */

type OptionSum<A> = SumValue<Option<A>, ResultOptionProduct<A>>;

type ResultOptionProduct<A> = ProductValue<Result<string, A>, Option<A>>;

type HoistedSum<A> = SumValue<Result<string, A>, ResultOptionProduct<A>>;

function describeOptionSum(value: OptionSum<number>): string {
  return formatSum(
    value,
    (option) => formatOption(option),
    (product) => describeResultOptionProduct(product),
  );
}

function describeResultOptionProduct(value: ResultOptionProduct<number>): string {
  return formatProduct(
    value,
    (result) => formatResult(result),
    (option) => formatOption(option),
  );
}

function describeHoistedSum(value: HoistedSum<number>): string {
  return formatSum(
    value,
    (result) => formatResult(result),
    (product) => describeResultOptionProduct(product),
  );
}

function mapResultOptionProduct(
  value: ResultOptionProduct<number>,
  mapper: (n: number) => number,
): ResultOptionProduct<number> {
  return mapProduct(
    value,
    (result) => Result.map(result, mapper),
    (option) => mapOption(option, mapper),
  );
}

function identitySumNat(value: OptionSum<number>): OptionSum<number> {
  return value;
}

function leftIncrementNat(value: OptionSum<number>): OptionSum<number> {
  return mapSum(
    value,
    (option) => mapOption(option, (n) => n + 1),
    (product) => product,
  );
}

function productIdentityNat(value: ResultOptionProduct<number>): ResultOptionProduct<number> {
  return value;
}

async function distributePromises(values: ReadonlyArray<Promise<number>>): Promise<readonly number[]> {
  return Promise.all(values);
}

async function distributeTasks(values: ReadonlyArray<Task<string>>): Promise<readonly string[]> {
  const resolved = await Promise.all(values.map((task) => task()));
  return resolved;
}

type FunctorTerm =
  | { readonly kind: "option" }
  | { readonly kind: "result" }
  | { readonly kind: "sum"; readonly left: FunctorTerm; readonly right: FunctorTerm }
  | { readonly kind: "product"; readonly left: FunctorTerm; readonly right: FunctorTerm };

const optionTerm: FunctorTerm = { kind: "option" };
const resultTerm: FunctorTerm = { kind: "result" };
const complexTerm: FunctorTerm = {
  kind: "sum",
  left: optionTerm,
  right: { kind: "product", left: resultTerm, right: optionTerm },
};

function mapTermValue(term: FunctorTerm, value: unknown, mapper: (n: number) => number): unknown {
  switch (term.kind) {
    case "option":
      return mapOption(value as Option<number>, mapper);
    case "result":
      return Result.map(value as Result<string, number>, mapper);
    case "sum": {
      const sumValue = value as SumValue<unknown, unknown>;
      return mapSum(
        sumValue,
        (left) => mapTermValue(term.left, left, mapper),
        (right) => mapTermValue(term.right, right, mapper),
      );
    }
    case "product": {
      const productValue = value as ProductValue<unknown, unknown>;
      return mapProduct(
        productValue,
        (left) => mapTermValue(term.left, left, mapper),
        (right) => mapTermValue(term.right, right, mapper),
      );
    }
    default:
      return value;
  }
}

function optionToResult<A>(option: Option<A>, onNone: () => string): Result<string, A> {
  return option.kind === "some" ? Result.ok(option.value) : Result.err(onNone());
}

async function promisePostcomposeArray<A, B>(
  values: ReadonlyArray<A>,
  mapper: (value: A) => Promise<B>,
): Promise<ReadonlyArray<B>> {
  const mapped = await Promise.all(values.map(mapper));
  return mapped;
}

function promiseEta<A>(value: A): Promise<A> {
  return Promise.resolve(value);
}

export const advancedFunctorTraversableAndFreeAlgebraSuites: RunnableExample = {
  id: "026",
  title: "Advanced functor, traversable, and free-algebra suites",
  outlineReference: 26,
  summary:
    "Execute Sum/Product natural transformations, distribute Promise/Task traversals, evaluate composite free endofunctor terms, hoist Option→Result transformations, and assemble Promise post-composition lax 2-functors.",
  async run() {
    const sumLeftValue: OptionSum<number> = sumLeft(Option.some(100));
    const sumRightValue: OptionSum<number> = sumRight(
      makeProduct(Result.ok(50), Option.some(25)),
    );

    const identityLeft = identitySumNat(sumLeftValue);
    const leftIncremented = leftIncrementNat(sumLeftValue);
    const identityRight = identitySumNat(sumRightValue);

    const productValue: ResultOptionProduct<number> = makeProduct(
      Result.ok(40),
      Option.some(60),
    );
    const productIdentity = productIdentityNat(productValue);
    const productMapped = mapResultOptionProduct(productValue, (n) => n + 5);

    const naturalTransformationLogs = [
      "== Sum/Product natural transformations ==",
      `Identity on left sum branch: ${describeOptionSum(identityLeft)}`,
      `Left-branch increment: ${describeOptionSum(leftIncremented)}`,
      `Identity on right sum branch: ${describeOptionSum(identityRight)}`,
      `Product identity: ${describeResultOptionProduct(productIdentity)}`,
      `Product mapped (+5): ${describeResultOptionProduct(productMapped)}`,
    ];

    const promiseArray = [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)];
    const taskArray: ReadonlyArray<Task<string>> = [
      () => Promise.resolve("alpha"),
      () => Promise.resolve("beta"),
      () => Promise.resolve("gamma"),
    ];

    const [promiseDistribution, taskDistribution] = await Promise.all([
      distributePromises(promiseArray),
      distributeTasks(taskArray),
    ]);

    const distributionLogs = [
      "== Promise/Task traversable distribution ==",
      `Promise distribution result: [${promiseDistribution.join(", ")}]`,
      `Task distribution result: [${taskDistribution.join(", ")}]`,
    ];

    const complexLeft = sumLeft<Option<number>, ResultOptionProduct<number>>(Option.some(32));
    const complexRight = sumRight<Option<number>, ResultOptionProduct<number>>(
      makeProduct(Result.ok(12), Option.some(8)),
    );

    const mappedComplexLeft = mapTermValue(complexTerm, complexLeft, (n) => n * 2) as OptionSum<number>;
    const mappedComplexRight = mapTermValue(complexTerm, complexRight, (n) => n + 3) as OptionSum<number>;

    const freeAlgebraLogs = [
      "== Free endofunctor term evaluation ==",
      `Complex term mapped (left branch ×2): ${describeOptionSum(mappedComplexLeft)}`,
      `Complex term mapped (right branch +3): ${describeOptionSum(mappedComplexRight)}`,
    ];

    const hoistedSum: HoistedSum<number> = mapSum(
      sumLeftValue,
      (option) => optionToResult(option, () => "Option branch empty"),
      (product) => product,
    );
    const hoistedNone: HoistedSum<number> = mapSum(
      sumLeft<Option<number>, ResultOptionProduct<number>>(Option.none<number>()),
      (option) => optionToResult(option, () => "no value"),
      (product) => product,
    );

    const hoistingLogs = [
      "== Option→Result hoisting ==",
      `Hoisted Some branch: ${describeHoistedSum(hoistedSum)}`,
      `Hoisted None branch: ${describeHoistedSum(hoistedNone)}`,
    ];

    const promisePostcompose = await promisePostcomposeArray([1, 2, 3], async (value) => value * value);
    const etaResult = await promiseEta("unit witness");

    const promiseFunctorLogs = [
      "== Promise post-composition lax 2-functor ==",
      `Promise∘Array mapped squares: [${promisePostcompose.join(", ")}]`,
      `Promise η (unit) result: ${etaResult}`,
    ];

    return {
      logs: [...naturalTransformationLogs, ...distributionLogs, ...freeAlgebraLogs, ...hoistingLogs, ...promiseFunctorLogs],
    };
  },
};
