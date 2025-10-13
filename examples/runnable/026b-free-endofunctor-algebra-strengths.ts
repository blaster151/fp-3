import type {
  EndoDict,
  EndoTerm,
  EndofunctorK1,
  NatDict,
  StrengthDict,
  StrengthEnv,
} from "../../allTS";
import type { RunnableExample } from "./types";

const {
  Some,
  None,
  Ok,
  Err,
  mapO,
  ResultK1,
  idNatK1,
  SumEndo,
  ProdEndo,
  inL,
  inR,
  sumNat,
  sumNatL,
  prod,
  prodNat,
  prodNatL,
  TraversableArrayK1,
  distributePromiseK1,
  distributeTaskK1,
  SumT,
  ProdT,
  ConstT,
  PairT,
  IdT,
  BaseT,
  evalEndo,
  hoistEndo,
  makePostcomposePromise2,
  strengthEnvOption,
  strengthEnvResult,
  strengthEnvFromPair,
  strengthEnvFromConst,
  deriveStrengthEnv,
} = require("../../allTS") as typeof import("../../allTS");

type BaseFunctors = "Option" | "ResultString";

type EnvTag = string;

type EnvPayload<A> = readonly [EnvTag, A];

type Task<A> = () => Promise<A>;

const OptionEndo: EndofunctorK1<'Option'> = { map: mapO };
const ResultEndo = ResultK1<string>();

const baseDict: EndoDict<BaseFunctors> = {
  Option: OptionEndo,
  ResultString: ResultEndo,
};

const strengthDict: StrengthDict<BaseFunctors, EnvTag> = {
  Option: strengthEnvOption<EnvTag>(),
  ResultString: strengthEnvResult<EnvTag, string>("fallback-env"),
};

const complexTerm: EndoTerm<BaseFunctors> = SumT(
  BaseT<BaseFunctors>("Option"),
  ProdT(
    BaseT<BaseFunctors>("ResultString"),
    BaseT<BaseFunctors>("Option"),
  ),
);

const megaTerm: EndoTerm<BaseFunctors> = ProdT(
  SumT(
    BaseT<BaseFunctors>("Option"),
    ConstT<BaseFunctors>("const-default"),
  ),
  ProdT(
    IdT,
    PairT<BaseFunctors>("pair-tag"),
  ),
);

function describeOption(value: unknown): string {
  if (value && typeof value === "object" && "_tag" in value) {
    const tagged = value as { readonly _tag: string; readonly value?: unknown };
    return tagged._tag === "Some"
      ? `Some(${JSON.stringify(tagged.value)})`
      : "None";
  }
  return String(value);
}

function describeResult(value: unknown): string {
  if (value && typeof value === "object" && "_tag" in value) {
    const tagged = value as { readonly _tag: string; readonly value?: unknown; readonly error?: unknown };
    return tagged._tag === "Ok"
      ? `Ok(${JSON.stringify(tagged.value)})`
      : `Err(${JSON.stringify(tagged.error)})`;
  }
  return String(value);
}

export const freeEndofunctorAlgebraStrengths: RunnableExample = {
  id: "026b",
  title: "Free endofunctor algebra strengths",
  outlineReference: 26,
  summary:
    "Exercise Sum/Product natural transformations, Promise/Task distributive traversals, free algebra evaluation, hoisting Option→Result terms, and derived environment strengths for composite functors.",
  async run() {
    const logs: string[] = [];

    const optionId = idNatK1<'Option'>();
    const resultId = idNatK1<['Result', 'string']>();

    const sumIdentity = sumNat(optionId, resultId);
    const sumLeftOnly = sumNatL<'Option', 'Option', ['Result', 'string']>(optionId);

    const sumLeftValue = inL<'Option', ['Prod', ['Result', 'string'], 'Option'], number>(Some(42));
    const sumRightValue = inR<'Option', ['Prod', ['Result', 'string'], 'Option'], number>(
      prod<['Result', 'string'], 'Option', number>(Ok(24), Some(12)),
    );

    const transformedLeft = sumIdentity.app<number>(sumLeftValue);
    const transformedRight = sumIdentity.app<number>(sumRightValue);
    const leftIncremented = sumLeftOnly.app<number>(sumLeftValue);

    const prodIdentity = prodNat(optionId, resultId);
    const prodLeft = prodNatL<'Option', ['Result', 'string'], 'Option'>(optionId);

    const productValue = prod<'Option', ['Result', 'string'], number>(Some(10), Ok(20));
    const productIdentity = prodIdentity.app<number>(productValue);
    const productMapped = prodLeft.app<number>(productValue);

    logs.push("== Sum/Product natural transformations ==");
    logs.push(`Sum identity (left branch) → ${describeOption((transformedLeft as any).left)}`);
    logs.push(`Sum identity (right branch) → ${describeResult((transformedRight as any).right.left)}`);
    logs.push(`Sum left-only increment → ${describeOption((leftIncremented as any).left)}`);
    logs.push(`Product identity → ${JSON.stringify(productIdentity)}`);
    logs.push(`Product left-map (Option×2) → ${JSON.stringify(productMapped)}`);

    const promiseArray: ReadonlyArray<Promise<number>> = [
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3),
    ];
    const taskArray: ReadonlyArray<Task<string>> = [
      () => Promise.resolve("alpha"),
      () => Promise.resolve("beta"),
      () => Promise.resolve("gamma"),
    ];

    const promiseDistributor = distributePromiseK1(TraversableArrayK1);
    const taskDistributor = distributeTaskK1(TraversableArrayK1);

    const distributedPromise = await promiseDistributor.app<number>(promiseArray);
    const distributedTask = await taskDistributor.app<string>(taskArray);

    logs.push("\n== Traversable Promise/Task distribution ==");
    logs.push(`Promise distribution → [${distributedPromise.join(", ")}]`);
    logs.push(`Task distribution → [${distributedTask.join(", ")}]`);

    const complexFunctor = evalEndo(baseDict)(complexTerm);
    const mappedLeft = complexFunctor.map((value: number) => value * 2)(sumLeftValue);
    const mappedRight = complexFunctor.map((value: number) => value + 5)(sumRightValue);

    logs.push("\n== Free endofunctor term evaluation ==");
    logs.push(`Mapped Sum left branch ×2 → ${JSON.stringify(mappedLeft)}`);
    logs.push(`Mapped Sum right branch +5 → ${JSON.stringify(mappedRight)}`);

    const optionToResultNat = {
      app: <A>(oa: unknown) => {
        const option = oa as { readonly _tag: string; readonly value?: A };
        return option && option._tag === "Some"
          ? Ok(option.value as A)
          : Err("Option hoisted to error");
      },
    };

    const natMapping: NatDict<BaseFunctors, 'ResultString'> = (name) => {
      if (name === "Option") {
        return { to: "ResultString", nat: optionToResultNat } as const;
      }
      return { to: "ResultString", nat: idNatK1<['Result', 'string']>() } as const;
    };

    const targetDict: EndoDict<'ResultString'> = { ResultString: ResultEndo };
    const hoisted = hoistEndo(baseDict, targetDict)(natMapping)(BaseT<BaseFunctors>("Option"));

    const hoistedSome = hoisted.nat.app<number>(Some(99));
    const hoistedNone = hoisted.nat.app<number>(None);

    logs.push("\n== Hoisting Option → ResultString ==");
    logs.push(`Hoisted Some(99) → ${describeResult(hoistedSome)}`);
    logs.push(`Hoisted None → ${describeResult(hoistedNone)}`);

    logs.push("\n== Mega term structure ==");
    logs.push(`Mega term JSON summary → ${JSON.stringify(megaTerm)}`);

    const derivedStrength = deriveStrengthEnv(baseDict, strengthDict)(complexTerm) as StrengthEnv<unknown, EnvTag>;

    const envLeft = inL<'Option', ['Prod', ['Result', 'string'], 'Option'], EnvPayload<number>>(
      Some<EnvPayload<number>>(["left-env", 7] as const),
    );
    const envRight = inR<'Option', ['Prod', ['Result', 'string'], 'Option'], EnvPayload<number>>(
      prod<['Result', 'string'], 'Option', EnvPayload<number>>(
        Ok<EnvPayload<number>>(["result-env", 11] as const),
        Some<EnvPayload<number>>(["option-env", 5] as const),
      ),
    );

    const [envTagLeft, strippedLeft] = derivedStrength.st<EnvPayload<number>>(envLeft as unknown as any);
    const [envTagRight, strippedRight] = derivedStrength.st<EnvPayload<number>>(envRight as unknown as any);

    logs.push("\n== Derived strength (environment threading) ==");
    logs.push(`Captured environment from Sum left → ${String(envTagLeft)}, payload → ${JSON.stringify(strippedLeft)}`);
    logs.push(`Captured environment from Sum right → ${String(envTagRight)}, payload → ${JSON.stringify(strippedRight)}`);

    const pairStrength = strengthEnvFromPair<EnvTag>()<string>();
    const constStrength = strengthEnvFromConst<EnvTag, string>("const-env");
    const pairInput = ["pair-tag", ["pair-env", "payload"] as const] as const;
    const constInput = "const-payload";
    const pairResult = pairStrength.st<string>(pairInput as unknown as any);
    const constResult = constStrength.st<string>(constInput as unknown as any);

    logs.push("\n== Pair/Const strength utilities ==");
    logs.push(`Pair strength extracts env=${JSON.stringify(pairResult[0])}`);
    logs.push(`Const strength extracts env=${JSON.stringify(constResult[0])}`);

    const travRegistry = <F>(F: EndofunctorK1<F>) => (F === TraversableArrayK1 ? TraversableArrayK1 : null);
    const promiseLax2 = makePostcomposePromise2(travRegistry);
    const promiseArrayEndo = promiseLax2.on1(TraversableArrayK1);
    const eta = promiseLax2.eta();
    const promiseEtaResult = await eta.app<string>("unit-value");

    logs.push("\n== Promise lax 2-functor ==");
    logs.push(`Promise∘Array endofunctor map field → ${typeof promiseArrayEndo.map}`);
    logs.push(`Promise η (unit) → ${await promiseEtaResult}`);

    return { logs };
  },
};
