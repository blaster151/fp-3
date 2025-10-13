import type { RunnableExample } from "./types";
import { Result } from "./structures";

/**
 * Stage 011 extends the arithmetic language with negation and N-ary operators
 * while preserving existing behaviour.  A legacy binary tree is upgraded to the
 * richer syntax, normalized so that sums and products flatten automatically, and
 * then evaluated in environments that demonstrate scoped let-bindings and
 * division safety.
 */

type LegacyExpr =
  | { readonly kind: "lit"; readonly value: number }
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "add"; readonly left: LegacyExpr; readonly right: LegacyExpr }
  | { readonly kind: "mul"; readonly left: LegacyExpr; readonly right: LegacyExpr }
  | { readonly kind: "div"; readonly numerator: LegacyExpr; readonly denominator: LegacyExpr }
  | { readonly kind: "let"; readonly name: string; readonly bound: LegacyExpr; readonly body: LegacyExpr };

type LegacyAlgebra<A> = {
  readonly lit: (value: number) => A;
  readonly variable: (name: string) => A;
  readonly add: (left: A, right: A) => A;
  readonly mul: (left: A, right: A) => A;
  readonly div: (numerator: A, denominator: A) => A;
  readonly let: (name: string, bound: A, body: A) => A;
};

type Expr =
  | { readonly kind: "lit"; readonly value: number }
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "neg"; readonly expression: Expr }
  | { readonly kind: "sum"; readonly terms: ReadonlyArray<Expr> }
  | { readonly kind: "product"; readonly factors: ReadonlyArray<Expr> }
  | { readonly kind: "div"; readonly numerator: Expr; readonly denominator: Expr }
  | { readonly kind: "let"; readonly name: string; readonly bound: Expr; readonly body: Expr };

type ExprAlgebra<A> = {
  readonly lit: (value: number) => A;
  readonly variable: (name: string) => A;
  readonly neg: (expression: A) => A;
  readonly sum: (terms: ReadonlyArray<A>) => A;
  readonly product: (factors: ReadonlyArray<A>) => A;
  readonly div: (numerator: A, denominator: A) => A;
  readonly let: (name: string, bound: A, body: A) => A;
};

type Environment = Readonly<Record<string, number>>;

type Evaluator = (env: Environment) => Result<string, number>;

function legacyLit(value: number): LegacyExpr {
  return { kind: "lit", value };
}

function legacyVar(name: string): LegacyExpr {
  return { kind: "var", name };
}

function legacyAdd(left: LegacyExpr, right: LegacyExpr): LegacyExpr {
  return { kind: "add", left, right };
}

function legacyMul(left: LegacyExpr, right: LegacyExpr): LegacyExpr {
  return { kind: "mul", left, right };
}

function legacyDiv(numerator: LegacyExpr, denominator: LegacyExpr): LegacyExpr {
  return { kind: "div", numerator, denominator };
}

function legacyLet(name: string, bound: LegacyExpr, body: LegacyExpr): LegacyExpr {
  return { kind: "let", name, bound, body };
}

function lit(value: number): Expr {
  return { kind: "lit", value };
}

function variable(name: string): Expr {
  return { kind: "var", name };
}

function neg(expression: Expr): Expr {
  return { kind: "neg", expression };
}

function sum(terms: ReadonlyArray<Expr>): Expr {
  return { kind: "sum", terms };
}

function product(factors: ReadonlyArray<Expr>): Expr {
  return { kind: "product", factors };
}

function divide(numerator: Expr, denominator: Expr): Expr {
  return { kind: "div", numerator, denominator };
}

function lett(name: string, bound: Expr, body: Expr): Expr {
  return { kind: "let", name, bound, body };
}

function foldLegacy<A>(expr: LegacyExpr, algebra: LegacyAlgebra<A>): A {
  switch (expr.kind) {
    case "lit":
      return algebra.lit(expr.value);
    case "var":
      return algebra.variable(expr.name);
    case "add":
      return algebra.add(foldLegacy(expr.left, algebra), foldLegacy(expr.right, algebra));
    case "mul":
      return algebra.mul(foldLegacy(expr.left, algebra), foldLegacy(expr.right, algebra));
    case "div":
      return algebra.div(foldLegacy(expr.numerator, algebra), foldLegacy(expr.denominator, algebra));
    case "let":
      return algebra.let(expr.name, foldLegacy(expr.bound, algebra), foldLegacy(expr.body, algebra));
    default: {
      const _exhaustive: never = expr;
      return _exhaustive;
    }
  }
}

function foldExpr<A>(expr: Expr, algebra: ExprAlgebra<A>): A {
  switch (expr.kind) {
    case "lit":
      return algebra.lit(expr.value);
    case "var":
      return algebra.variable(expr.name);
    case "neg":
      return algebra.neg(foldExpr(expr.expression, algebra));
    case "sum":
      return algebra.sum(expr.terms.map((term) => foldExpr(term, algebra)));
    case "product":
      return algebra.product(expr.factors.map((factor) => foldExpr(factor, algebra)));
    case "div":
      return algebra.div(foldExpr(expr.numerator, algebra), foldExpr(expr.denominator, algebra));
    case "let":
      return algebra.let(expr.name, foldExpr(expr.bound, algebra), foldExpr(expr.body, algebra));
    default: {
      const _exhaustive: never = expr;
      return _exhaustive;
    }
  }
}

function upgradeLegacy(expr: LegacyExpr): Expr {
  const algebra: LegacyAlgebra<Expr> = {
    lit,
    variable,
    add: (left, right) => sum([left, right]),
    mul: (left, right) => product([left, right]),
    div: divide,
    let: (name, bound, body) => lett(name, bound, body),
  };
  return foldLegacy(expr, algebra);
}

function normalize(expr: Expr): Expr {
  const normalization: ExprAlgebra<Expr> = {
    lit,
    variable,
    neg: (expression) => {
      if (expression.kind === "lit") {
        return lit(-expression.value);
      }
      return neg(expression);
    },
    sum: (terms) => normalizeSum(terms),
    product: (factors) => normalizeProduct(factors),
    div: divide,
    let: (name, bound, body) => lett(name, bound, body),
  };
  return foldExpr(expr, normalization);
}

function normalizeSum(terms: ReadonlyArray<Expr>): Expr {
  const flattened = flattenExpressions("sum", terms);
  const filtered = flattened.filter((term) => !(term.kind === "lit" && term.value === 0));
  if (filtered.length === 0) {
    return lit(0);
  }
  if (filtered.length === 1) {
    return filtered[0]!;
  }
  return sum(filtered);
}

function normalizeProduct(factors: ReadonlyArray<Expr>): Expr {
  const flattened = flattenExpressions("product", factors);
  if (flattened.some((factor) => factor.kind === "lit" && factor.value === 0)) {
    return lit(0);
  }
  const filtered = flattened.filter((factor) => !(factor.kind === "lit" && factor.value === 1));
  if (filtered.length === 0) {
    return lit(1);
  }
  if (filtered.length === 1) {
    return filtered[0]!;
  }
  return product(filtered);
}

function flattenExpressions(kind: "sum" | "product", parts: ReadonlyArray<Expr>): ReadonlyArray<Expr> {
  return parts.reduce<Expr[]>((acc, current) => {
    if (kind === "sum" && current.kind === "sum") {
      return acc.concat(current.terms);
    }
    if (kind === "product" && current.kind === "product") {
      return acc.concat(current.factors);
    }
    return acc.concat(current);
  }, []);
}

function evaluate(expr: Expr, env: Environment): Result<string, number> {
  const algebra: ExprAlgebra<Evaluator> = {
    lit: (value) => () => Result.ok(value),
    variable: (name) => (environment) => {
      const value = environment[name];
      if (value === undefined) {
        return Result.err(`Variable '${name}' is not bound.`);
      }
      return Result.ok(value);
    },
    neg: (expression) => (environment) => Result.map(expression(environment), (value) => -value),
    sum: (terms) => (environment) => reduceEvaluators(terms, environment, 0, (acc, value) => acc + value),
    product: (factors) => (environment) => reduceEvaluators(factors, environment, 1, (acc, value) => acc * value),
    div: (numerator, denominator) => (environment) => {
      return Result.chain(numerator(environment), (numValue) =>
        Result.chain(denominator(environment), (denValue) => {
          if (denValue === 0) {
            return Result.err("Division by zero detected while evaluating expression.");
          }
          return Result.ok(numValue / denValue);
        }),
      );
    },
    let: (name, bound, body) => (environment) =>
      Result.chain(bound(environment), (boundValue) => {
        const extendedEnv: Environment = { ...environment, [name]: boundValue };
        return body(extendedEnv);
      }),
  };

  return foldExpr(expr, algebra)(env);
}

function reduceEvaluators(
  evaluators: ReadonlyArray<Evaluator>,
  environment: Environment,
  initial: number,
  combine: (acc: number, value: number) => number,
): Result<string, number> {
  return evaluators.reduce<Result<string, number>>(
    (accResult, evaluator) =>
      Result.chain(accResult, (accValue) => Result.map(evaluator(environment), (value) => combine(accValue, value))),
    Result.ok(initial),
  );
}

function render(expr: Expr): string {
  switch (expr.kind) {
    case "lit":
      return expr.value.toString();
    case "var":
      return expr.name;
    case "neg":
      return `-( ${render(expr.expression)} )`;
    case "sum": {
      const inner = expr.terms.map(render);
      return inner.length === 1 ? inner[0]! : `( ${inner.join(" + ")} )`;
    }
    case "product": {
      const inner = expr.factors.map(render);
      return inner.length === 1 ? inner[0]! : `( ${inner.join(" * ")} )`;
    }
    case "div":
      return `( ${render(expr.numerator)} / ${render(expr.denominator)} )`;
    case "let":
      return `(let ${expr.name} = ${render(expr.bound)} in ${render(expr.body)})`;
    default: {
      const _exhaustive: never = expr;
      return _exhaustive;
    }
  }
}

function formatResult(result: Result<string, number>): string {
  return result.kind === "ok" ? `✔ ${result.value}` : `✘ ${result.error}`;
}

export const safeAstEvolution: RunnableExample = {
  id: "011",
  title: "Safe AST evolution with negation and N-ary operators",
  outlineReference: 11,
  summary:
    "Upgrade binary expressions into N-ary sums/products, normalize the structure, and evaluate with scoped lets and safe division.",
  async run() {
    const legacyExpression = legacyLet(
      "income",
      legacyDiv(legacyLit(36), legacyLit(3)),
      legacyAdd(
        legacyVar("income"),
        legacyMul(legacyVar("income"), legacyAdd(legacyLit(1), legacyLit(2))),
      ),
    );

    const upgraded = upgradeLegacy(legacyExpression);
    const normalized = normalize(upgraded);

    const extended = normalize(
      sum([
        normalized,
        neg(variable("adjustment")),
        product([lit(2), variable("bonus")]),
      ]),
    );

    const env = { adjustment: 4, bonus: 1.5 } satisfies Environment;

    const baseline = evaluate(normalized, env);
    const extendedResult = evaluate(extended, env);

    const fragile = normalize(
      divide(lit(10), sum([variable("delta"), neg(variable("delta"))])),
    );
    const fragileResult = evaluate(fragile, { delta: 5 });

    const logs = [
      "== Legacy upgrade ==",
      `Legacy expression upgraded: ${render(upgraded)}`,
      `Normalized structure: ${render(normalized)}`,
      "== Extended constructors ==",
      `Extended expression: ${render(extended)}`,
      `Normalized evaluation → ${formatResult(baseline)}`,
      `Extended evaluation → ${formatResult(extendedResult)}`,
      "== Division safeguards ==",
      `Zero-denominator detection → ${formatResult(fragileResult)}`,
      "== Exhaustiveness guarantees ==",
      "Every algebra used here implements all constructors; adding another node would trigger a compile-time exhaustiveness error.",
    ];

    return { logs };
  },
};
