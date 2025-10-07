import { Option, Result } from "./structures";

export type SumValue<L, R> =
  | { readonly kind: "left"; readonly value: L }
  | { readonly kind: "right"; readonly value: R };

export type ProductValue<L, R> = {
  readonly left: L;
  readonly right: R;
};

export function sumLeft<L, R>(value: L): SumValue<L, R> {
  return { kind: "left", value };
}

export function sumRight<L, R>(value: R): SumValue<L, R> {
  return { kind: "right", value };
}

export function matchSum<L, R, B>(
  value: SumValue<L, R>,
  onLeft: (left: L) => B,
  onRight: (right: R) => B,
): B {
  return value.kind === "left" ? onLeft(value.value) : onRight(value.value);
}

export function makeProduct<L, R>(left: L, right: R): ProductValue<L, R> {
  return { left, right };
}

export function mapOption<A, B>(option: Option<A>, mapper: (value: A) => B): Option<B> {
  if (option.kind === "some") {
    return Option.some(mapper(option.value));
  }
  return Option.none<B>();
}

export function mapSum<L, R, L2, R2>(
  value: SumValue<L, R>,
  mapLeft: (left: L) => L2,
  mapRight: (right: R) => R2,
): SumValue<L2, R2> {
  if (value.kind === "left") {
    return sumLeft<L2, R2>(mapLeft(value.value));
  }
  return sumRight<L2, R2>(mapRight(value.value));
}

export function mapProduct<L, R, L2, R2>(
  value: ProductValue<L, R>,
  mapLeft: (left: L) => L2,
  mapRight: (right: R) => R2,
): ProductValue<L2, R2> {
  return makeProduct(mapLeft(value.left), mapRight(value.right));
}

export function formatOption<T>(option: Option<T>): string {
  return option.kind === "some" ? `Some(${String(option.value)})` : "None";
}

export function formatResult<E, A>(result: Result<E, A>): string {
  return result.kind === "ok" ? `Ok(${String(result.value)})` : `Err(${String(result.error)})`;
}

export function formatSum<L, R>(value: SumValue<L, R>, describeLeft: (left: L) => string, describeRight: (right: R) => string): string {
  return value.kind === "left"
    ? `Left(${describeLeft(value.value)})`
    : `Right(${describeRight(value.value)})`;
}

export function formatProduct<L, R>(
  value: ProductValue<L, R>,
  describeLeft: (left: L) => string,
  describeRight: (right: R) => string,
): string {
  return `Product(left: ${describeLeft(value.left)}, right: ${describeRight(value.right)})`;
}

type EnvPayload<E, A> = readonly [E, A];

export function pushOptionEnvironment<E, A>(
  value: Option<EnvPayload<E, A>>,
  fallbackEnv: E,
): readonly [E, Option<A>] {
  if (value.kind === "some") {
    const [env, payload] = value.value;
    return [env, Option.some(payload)];
  }
  return [fallbackEnv, Option.none<A>()];
}

export function pushResultEnvironment<E, Err, A>(
  value: Result<Err, EnvPayload<E, A>>,
  fallbackEnv: E,
): readonly [E, Result<Err, A>] {
  if (value.kind === "ok") {
    const [env, payload] = value.value;
    return [env, Result.ok<Err, A>(payload)];
  }
  return [fallbackEnv, value];
}

export function pushSumEnvironment<E, Err, A>(
  value: SumValue<Option<EnvPayload<E, A>>, Result<Err, EnvPayload<E, A>>>,
  fallbackEnv: E,
): readonly [E, SumValue<Option<A>, Result<Err, A>>] {
  if (value.kind === "left") {
    const [env, optionValue] = pushOptionEnvironment(value.value, fallbackEnv);
    return [env, sumLeft<Option<A>, Result<Err, A>>(optionValue)];
  }
  const [env, resultValue] = pushResultEnvironment(value.value, fallbackEnv);
  return [env, sumRight<Option<A>, Result<Err, A>>(resultValue)];
}

export function pushProductEnvironment<E, Err, A>(
  value: ProductValue<Option<EnvPayload<E, A>>, Result<Err, EnvPayload<E, A>>>,
  fallbackEnv: E,
): readonly [E, ProductValue<Option<A>, Result<Err, A>>] {
  const [leftEnv, leftValue] = pushOptionEnvironment(value.left, fallbackEnv);
  const [rightEnv, rightValue] = pushResultEnvironment(value.right, fallbackEnv);
  const env = value.right.kind === "ok" ? rightEnv : leftEnv;
  return [env, makeProduct(leftValue, rightValue)];
}
