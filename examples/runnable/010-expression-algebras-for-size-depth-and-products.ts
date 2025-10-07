import { RunnableExample } from "./types";

/**
 * Stage 010 demonstrates how catamorphisms over an expression functor allow us
 * to compute different structural metrics—node count, depth, and evaluated
 * value—and how product algebras reuse a single traversal to collect all of
 * them simultaneously.
 */

type Expr =
  | { readonly kind: "lit"; readonly value: number }
  | { readonly kind: "neg"; readonly expression: Expr }
  | { readonly kind: "add"; readonly left: Expr; readonly right: Expr }
  | { readonly kind: "mul"; readonly left: Expr; readonly right: Expr };

type ExprAlgebra<A> = {
  readonly lit: (value: number) => A;
  readonly neg: (expression: A) => A;
  readonly add: (left: A, right: A) => A;
  readonly mul: (left: A, right: A) => A;
};

type Pair<A, B> = { readonly left: A; readonly right: B };

type Metrics = { readonly size: number; readonly depth: number; readonly value: number };

function lit(value: number): Expr {
  return { kind: "lit", value };
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

function foldExpr<A>(expr: Expr, algebra: ExprAlgebra<A>): A {
  switch (expr.kind) {
    case "lit":
      return algebra.lit(expr.value);
    case "neg":
      return algebra.neg(foldExpr(expr.expression, algebra));
    case "add":
      return algebra.add(foldExpr(expr.left, algebra), foldExpr(expr.right, algebra));
    case "mul":
      return algebra.mul(foldExpr(expr.left, algebra), foldExpr(expr.right, algebra));
    default: {
      const _exhaustive: never = expr;
      return _exhaustive;
    }
  }
}

const sizeAlgebra: ExprAlgebra<number> = {
  lit: () => 1,
  neg: (expression) => expression + 1,
  add: (left, right) => left + right + 1,
  mul: (left, right) => left + right + 1,
};

const depthAlgebra: ExprAlgebra<number> = {
  lit: () => 1,
  neg: (expression) => expression + 1,
  add: (left, right) => Math.max(left, right) + 1,
  mul: (left, right) => Math.max(left, right) + 1,
};

const evaluationAlgebra: ExprAlgebra<number> = {
  lit: (value) => value,
  neg: (expression) => -expression,
  add: (left, right) => left + right,
  mul: (left, right) => left * right,
};

function productAlgebra<A, B>(left: ExprAlgebra<A>, right: ExprAlgebra<B>): ExprAlgebra<Pair<A, B>> {
  return {
    lit: (value) => ({ left: left.lit(value), right: right.lit(value) }),
    neg: (expression) => ({
      left: left.neg(expression.left),
      right: right.neg(expression.right),
    }),
    add: (a, b) => ({
      left: left.add(a.left, b.left),
      right: right.add(a.right, b.right),
    }),
    mul: (a, b) => ({
      left: left.mul(a.left, b.left),
      right: right.mul(a.right, b.right),
    }),
  };
}

function projectMetrics(pair: Pair<number, Pair<number, number>>): Metrics {
  return {
    size: pair.left,
    depth: pair.right.left,
    value: pair.right.right,
  };
}

function render(expr: Expr): string {
  switch (expr.kind) {
    case "lit":
      return expr.value.toString();
    case "neg":
      return `-( ${render(expr.expression)} )`;
    case "add":
      return `( ${render(expr.left)} + ${render(expr.right)} )`;
    case "mul":
      return `( ${render(expr.left)} * ${render(expr.right)} )`;
    default: {
      const _exhaustive: never = expr;
      return _exhaustive;
    }
  }
}

export const expressionAlgebras: RunnableExample = {
  id: "010",
  title: "Expression algebras for size, depth, and products",
  outlineReference: 10,
  summary: "Compute expression size, depth, and evaluated value via catamorphisms and reuse a single traversal with product algebras.",
  async run() {
    const expr = mul(
      add(lit(7), neg(lit(4))),
      add(lit(2), mul(lit(3), lit(5))),
    );

    const size = foldExpr(expr, sizeAlgebra);
    const depth = foldExpr(expr, depthAlgebra);
    const value = foldExpr(expr, evaluationAlgebra);

    const combined = foldExpr(expr, productAlgebra(sizeAlgebra, productAlgebra(depthAlgebra, evaluationAlgebra)));
    const metrics = projectMetrics(combined);

    const logs = [
      "== Expression under analysis ==",
      `Expression: ${render(expr)}`,
      "== Individual catamorphisms ==",
      `Size: ${size}`,
      `Depth: ${depth}`,
      `Evaluated value: ${value}`,
      "== Product algebra ==",
      `Combined metrics: size=${metrics.size}, depth=${metrics.depth}, value=${metrics.value}`,
      metrics.size === size && metrics.depth === depth && metrics.value === value
        ? "✔ Product algebra agrees with individual traversals"
        : "✘ Product algebra disagrees with individual traversals",
    ];

    return { logs };
  },
};
