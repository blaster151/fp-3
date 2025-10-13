import type { RunnableExample } from "./types";
import { Option, Result } from "./structures";
import type { Reader } from "./effects";

function composeIdentityWithOption<A, B>(option: Option<A>, mapper: (value: A) => B): Option<B> {
  if (option.kind === "none") {
    return Option.none();
  }
  const mapped = mapper(option.value);
  return Option.some(mapped);
}

function postcomposeReaderMap<Env, A, B>(option: Option<A>, mapper: (value: A) => B): Reader<Env, Option<B>> {
  return () => composeIdentityWithOption(option, mapper);
}

function readerUnit<Env, A>(value: A): Reader<Env, A> {
  return () => value;
}

function readerMultiplication<Env, A>(nested: Reader<Env, Reader<Env, A>>): Reader<Env, A> {
  return (environment) => nested(environment)(environment);
}

function attachEnvironmentToOption<Env, A>(environment: Env, option: Option<A>): Option<readonly [Env, A]> {
  if (option.kind === "none") {
    return Option.none();
  }
  return Option.some([environment, option.value] as const);
}

function attachEnvironmentToResult<Env, E, A>(environment: Env, result: Result<E, A>): Result<E, readonly [Env, A]> {
  if (result.kind === "err") {
    return result;
  }
  return Result.ok([environment, result.value] as const);
}

function dropEnvironment<Env, A>(pair: readonly [Env, A]): A {
  return pair[1];
}

export const twoFunctorAndOplaxStrengthDemonstrations: RunnableExample = {
  id: "032",
  title: "2-functor and oplax strength demonstrations",
  outlineReference: 32,
  summary:
    "Composition of endofunctors, post-composition lax 2-functors, and environment-strengthened oplax 2-functors with explicit η and μ checks.",
  async run() {
    const baseOption = Option.some(21);
    const composed = composeIdentityWithOption(baseOption, (value) => value * 2);

    const readerFunctor = postcomposeReaderMap(baseOption, (value) => value + 3);
    const readerEnvironment = { label: "demo" };
    const readerOutcome = readerFunctor(readerEnvironment);

    const unitOutcome = readerUnit<{ label: string }, Option<number>>(Option.some(7))(readerEnvironment);

    const nestedReader: Reader<{ readonly label: string }, Reader<{ readonly label: string }, Option<number>>> = (env1) =>
      (env2) => Option.some(env1.label.length + env2.label.length);
    const flattened = readerMultiplication(nestedReader)(readerEnvironment);

    const optionStrength = attachEnvironmentToOption("context", Option.some("payload"));
    const noneStrength = attachEnvironmentToOption("context", Option.none<string>());
    const resultStrength = attachEnvironmentToResult("context", Result.ok(42));
    const resultFailure = attachEnvironmentToResult("context", Result.err("error"));
    const dropped = dropEnvironment(["ctx", 99] as const);

    const formatOption = <T>(option: Option<T>): string =>
      option.kind === "some" ? `some(${JSON.stringify(option.value)})` : "none";

    const formatResult = <E, A>(result: Result<E, A>): string =>
      result.kind === "ok" ? `ok(${JSON.stringify(result.value)})` : `err(${JSON.stringify(result.error)})`;

    const compositionSection = [
      "== Endofunctor composition ==",
      `Option mapped through identity → ${formatOption(composed)}`,
    ];

    const readerSection = [
      "== Post-composition Reader 2-functor ==",
      `Reader map outcome → ${formatOption(readerOutcome)}`,
      `Reader unit η outcome → ${formatOption(unitOutcome)}`,
      `Reader multiplication μ outcome → ${formatOption(flattened)}`,
    ];

    const oplaxSection = [
      "== Environment oplax strength ==",
      `Option strength applied → ${formatOption(optionStrength)}`,
      `Option strength on none → ${formatOption(noneStrength)}`,
      `Result strength applied → ${formatResult(resultStrength)}`,
      `Result strength on error → ${formatResult(resultFailure)}`,
      `Oplax counit drops environment → ${dropped}`,
    ];

    return {
      logs: [...compositionSection, ...readerSection, ...oplaxSection],
    };
  },
};
