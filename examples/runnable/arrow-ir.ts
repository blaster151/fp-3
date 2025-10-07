export type ArrowPlan<A, B> =
  | { readonly kind: "id"; readonly label: string }
  | { readonly kind: "arr"; readonly map: (value: A) => B; readonly label: string }
  | {
      readonly kind: "compose";
      readonly first: ArrowPlan<A, unknown>;
      readonly second: ArrowPlan<unknown, B>;
      readonly label: string;
    }
  | { readonly kind: "first"; readonly inner: ArrowPlan<unknown, unknown>; readonly label: string }
  | { readonly kind: "second"; readonly inner: ArrowPlan<unknown, unknown>; readonly label: string }
  | {
      readonly kind: "parallel";
      readonly left: ArrowPlan<unknown, unknown>;
      readonly right: ArrowPlan<unknown, unknown>;
      readonly label: string;
    }
  | {
      readonly kind: "fanout";
      readonly left: ArrowPlan<A, unknown>;
      readonly right: ArrowPlan<A, unknown>;
      readonly label: string;
    };

export function idArrow<A>(label = "id"): ArrowPlan<A, A> {
  return { kind: "id", label };
}

export function arr<A, B>(mapper: (value: A) => B, label = "λ"): ArrowPlan<A, B> {
  return { kind: "arr", map: mapper, label } as ArrowPlan<A, B>;
}

export function compose<A, B, C>(
  second: ArrowPlan<B, C>,
  first: ArrowPlan<A, B>,
  label = "compose",
): ArrowPlan<A, C> {
  return { kind: "compose", first, second, label } as ArrowPlan<A, C>;
}

export function first<A, B, C>(inner: ArrowPlan<A, B>, label = "first"): ArrowPlan<readonly [A, C], readonly [B, C]> {
  return { kind: "first", inner, label } as ArrowPlan<readonly [A, C], readonly [B, C]>;
}

export function second<A, B, C>(inner: ArrowPlan<B, C>, label = "second"): ArrowPlan<readonly [A, B], readonly [A, C]> {
  return { kind: "second", inner, label } as ArrowPlan<readonly [A, B], readonly [A, C]>;
}

export function parallel<A, B, C, D>(
  left: ArrowPlan<A, B>,
  right: ArrowPlan<C, D>,
  label = "parallel",
): ArrowPlan<readonly [A, C], readonly [B, D]> {
  return { kind: "parallel", left, right, label } as ArrowPlan<readonly [A, C], readonly [B, D]>;
}

export function fanout<A, B, C>(
  left: ArrowPlan<A, B>,
  right: ArrowPlan<A, C>,
  label = "fanout",
): ArrowPlan<A, readonly [B, C]> {
  return { kind: "fanout", left, right, label } as ArrowPlan<A, readonly [B, C]>;
}

export function denote<A, B>(plan: ArrowPlan<A, B>): (input: A) => B {
  switch (plan.kind) {
    case "id":
      return ((input: A) => input) as unknown as (input: A) => B;
    case "arr":
      return plan.map;
    case "compose": {
      const firstFn = denote(plan.first as ArrowPlan<A, unknown>);
      const secondFn = denote(plan.second as ArrowPlan<unknown, B>);
      return (input) => secondFn(firstFn(input));
    }
    case "first": {
      const inner = denote(plan.inner as ArrowPlan<unknown, unknown>);
      const fn = ([value, rest]: readonly [unknown, unknown]) => [inner(value), rest];
      return fn as unknown as (input: A) => B;
    }
    case "second": {
      const inner = denote(plan.inner as ArrowPlan<unknown, unknown>);
      const fn = ([rest, value]: readonly [unknown, unknown]) => [rest, inner(value)];
      return fn as unknown as (input: A) => B;
    }
    case "parallel": {
      const leftFn = denote(plan.left as ArrowPlan<unknown, unknown>);
      const rightFn = denote(plan.right as ArrowPlan<unknown, unknown>);
      const fn = ([leftValue, rightValue]: readonly [unknown, unknown]) => [
        leftFn(leftValue),
        rightFn(rightValue),
      ];
      return fn as unknown as (input: A) => B;
    }
    case "fanout": {
      const leftFn = denote(plan.left as ArrowPlan<A, unknown>);
      const rightFn = denote(plan.right as ArrowPlan<A, unknown>);
      const fn = (input: A) => [leftFn(input), rightFn(input)];
      return fn as unknown as (input: A) => B;
    }
    default: {
      const _exhaustive: never = plan;
      return _exhaustive;
    }
  }
}

export function describeNode(plan: ArrowPlan<unknown, unknown>): string {
  switch (plan.kind) {
    case "id":
      return plan.label;
    case "arr":
      return plan.label;
    case "compose":
      return plan.label;
    case "first":
      return `${plan.label}(${describeNode(plan.inner as ArrowPlan<unknown, unknown>)})`;
    case "second":
      return `${plan.label}(${describeNode(plan.inner as ArrowPlan<unknown, unknown>)})`;
    case "parallel":
      return `${plan.label}(${describeNode(plan.left as ArrowPlan<unknown, unknown>)}, ${describeNode(
        plan.right as ArrowPlan<unknown, unknown>,
      )})`;
    case "fanout":
      return `${plan.label}(${describeNode(plan.left as ArrowPlan<unknown, unknown>)}, ${describeNode(
        plan.right as ArrowPlan<unknown, unknown>,
      )})`;
    default: {
      const _exhaustive: never = plan;
      return _exhaustive;
    }
  }
}
