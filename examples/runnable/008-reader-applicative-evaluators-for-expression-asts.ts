import type { RunnableExample } from "./types";
import { Result } from "./structures";

/**
 * Stage 008 revisits expression evaluation using Reader applicatives.  The
 * first evaluator produces numbers directly from an environment while the
 * second nests `Result` to surface division-by-zero failures without abandoning
 * the Reader machinery.
 */

type Expr =
  | { readonly kind: "lit"; readonly value: number }
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "neg"; readonly expression: Expr }
  | { readonly kind: "add"; readonly left: Expr; readonly right: Expr }
  | { readonly kind: "mul"; readonly left: Expr; readonly right: Expr }
  | { readonly kind: "div"; readonly numerator: Expr; readonly denominator: Expr }
  | { readonly kind: "pow"; readonly base: Expr; readonly exponent: Expr }
  | { readonly kind: "addN"; readonly expressions: ReadonlyArray<Expr> }
  | { readonly kind: "let"; readonly name: string; readonly bound: Expr; readonly body: Expr };

type ExprEnv = Readonly<Record<string, number>>;

type Reader<A> = (env: ExprEnv) => A;

type ReaderResult<A> = Reader<Result<string, A>>;

function readerOf<A>(value: A): Reader<A> {
  return () => value;
}

function readerMap<A, B>(reader: Reader<A>, mapper: (value: A) => B): Reader<B> {
  return (env) => mapper(reader(env));
}

function readerMap2<A, B, C>(left: Reader<A>, right: Reader<B>, mapper: (a: A, b: B) => C): Reader<C> {
  return (env) => mapper(left(env), right(env));
}

function readerLocal<A>(reader: Reader<A>, modifier: (env: ExprEnv) => ExprEnv): Reader<A> {
  return (env) => reader(modifier(env));
}

function resultMap2<A, B, C>(
  left: ReaderResult<A>,
  right: ReaderResult<B>,
  mapper: (a: A, b: B) => C,
): ReaderResult<C> {
  return (env) => {
    const evaluatedLeft = left(env);
    if (evaluatedLeft.kind === "err") {
      return evaluatedLeft;
    }
    const evaluatedRight = right(env);
    if (evaluatedRight.kind === "err") {
      return evaluatedRight;
    }
    return Result.ok(mapper(evaluatedLeft.value, evaluatedRight.value));
  };
}

function evalExprReader(expr: Expr): Reader<number> {
  switch (expr.kind) {
    case "lit":
      return readerOf(expr.value);
    case "var":
      return (env) => env[expr.name] ?? 0;
    case "neg":
      return readerMap(evalExprReader(expr.expression), (value) => -value);
    case "add":
      return readerMap2(evalExprReader(expr.left), evalExprReader(expr.right), (a, b) => a + b);
    case "mul":
      return readerMap2(evalExprReader(expr.left), evalExprReader(expr.right), (a, b) => a * b);
    case "div":
      return readerMap2(evalExprReader(expr.numerator), evalExprReader(expr.denominator), (a, b) => a / b);
    case "pow":
      return readerMap2(evalExprReader(expr.base), evalExprReader(expr.exponent), (base, exponent) =>
        Math.pow(base, exponent),
      );
    case "addN":
      return expr.expressions.reduce<Reader<number>>(
        (acc, current) => readerMap2(acc, evalExprReader(current), (a, b) => a + b),
        readerOf(0),
      );
    case "let":
      return readerLocal(evalExprReader(expr.body), (env) => ({
        ...env,
        [expr.name]: evalExprReader(expr.bound)(env),
      }));
  }
}

function evalExprReaderResult(expr: Expr): ReaderResult<number> {
  switch (expr.kind) {
    case "lit":
      return () => Result.ok(expr.value);
    case "var":
      return (env) => {
        const value = env[expr.name];
        if (value === undefined) {
          return Result.err(`Variable '${expr.name}' not found.`);
        }
        return Result.ok(value);
      };
    case "neg":
      return (env) => Result.map(evalExprReaderResult(expr.expression)(env), (value) => -value);
    case "add":
      return resultMap2(evalExprReaderResult(expr.left), evalExprReaderResult(expr.right), (a, b) => a + b);
    case "mul":
      return resultMap2(evalExprReaderResult(expr.left), evalExprReaderResult(expr.right), (a, b) => a * b);
    case "div":
      return (env) => {
        const numerator = evalExprReaderResult(expr.numerator)(env);
        if (numerator.kind === "err") {
          return numerator;
        }
        const denominator = evalExprReaderResult(expr.denominator)(env);
        if (denominator.kind === "err") {
          return denominator;
        }
        if (denominator.value === 0) {
          return Result.err("Division by zero detected.");
        }
        return Result.ok(numerator.value / denominator.value);
      };
    case "pow":
      return resultMap2(
        evalExprReaderResult(expr.base),
        evalExprReaderResult(expr.exponent),
        (base, exponent) => Math.pow(base, exponent),
      );
    case "addN":
      return expr.expressions.reduce<ReaderResult<number>>(
        (acc, current) =>
          resultMap2(acc, evalExprReaderResult(current), (a, b) => a + b),
        () => Result.ok(0),
      );
    case "let":
      return (env) => {
        const bound = evalExprReaderResult(expr.bound)(env);
        if (bound.kind === "err") {
          return bound;
        }
        const extendedEnv: ExprEnv = { ...env, [expr.name]: bound.value };
        return evalExprReaderResult(expr.body)(extendedEnv);
      };
  }
}

function lit(value: number): Expr {
  return { kind: "lit", value };
}

function vvar(name: string): Expr {
  return { kind: "var", name };
}

function neg(expression: Expr): Expr {
  return { kind: "neg", expression };
}

function add(left: Expr, right: Expr): Expr {
  return { kind: "add", left, right };
}

function mul(left: Expr, right: Expr): Expr {
  return { kind: "mul", left, right };
}

function div(numerator: Expr, denominator: Expr): Expr {
  return { kind: "div", numerator, denominator };
}

function pow(base: Expr, exponent: Expr): Expr {
  return { kind: "pow", base, exponent };
}

function addN(expressions: ReadonlyArray<Expr>): Expr {
  return { kind: "addN", expressions };
}

function lett(name: string, bound: Expr, body: Expr): Expr {
  return { kind: "let", name, bound, body };
}

export const readerApplicativeEvaluators: RunnableExample = {
  id: "008",
  title: "Reader applicative evaluators for expression ASTs",
  outlineReference: 8,
  summary:
    "Evaluate arithmetic expressions via Reader applicatives, then lift the same evaluator into Reader<Result> to report failures.",
  async run() {
    const program = lett(
      "x",
      lit(10),
      addN([
        vvar("x"),
        pow(lit(2), lit(3)),
        neg(lit(4)),
      ]),
    );

    const evaluate = evalExprReader(program);
    const emptyEnvResult = evaluate({});
    const shadowedEnvResult = evaluate({ x: 1 });

    const failingProgram = div(lit(1), add(vvar("d"), neg(vvar("d"))));
    const failingResult = evalExprReaderResult(failingProgram)({ d: 3 });

    const logs = [
      "== Reader applicative evaluation ==",
      `Program evaluated with empty environment: ${emptyEnvResult}`,
      `Program evaluated with pre-bound x=1: ${shadowedEnvResult} (let binding shadows)`,
      "== Reader<Result> evaluation ==",
      failingResult.kind === "ok"
        ? `Unexpected success: ${failingResult.value}`
        : `Failure propagated through Reader<Result>: ${failingResult.error}`,
    ];

    return { logs };
  },
};
