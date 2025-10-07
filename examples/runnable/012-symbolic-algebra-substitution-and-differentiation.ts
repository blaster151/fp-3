import { RunnableExample } from "./types";

/**
 * Stage 012 rebuilds the symbolic-algebra helpers used by the original
 * runnable catalogue.  The language supports literals, variables, sums,
 * products, powers, negation, and scoped let-bindings.  The example highlights
 * three reusable utilities:
 *
 * 1. `simplify` normalises expressions so algebraic rewrites have a predictable
 *    shape and redundant neutral elements disappear.
 * 2. `substitute` performs capture-avoiding substitution, renaming binders on
 *    demand so freshly inlined terms cannot be accidentally captured.
 * 3. `differentiate` derives symbolic derivatives and demonstrates the rewrite
 *    by evaluating both the original expression and its derivative.
 */

type Expr =
  | { readonly kind: "lit"; readonly value: number }
  | { readonly kind: "var"; readonly name: string }
  | { readonly kind: "neg"; readonly expression: Expr }
  | { readonly kind: "sum"; readonly terms: ReadonlyArray<Expr> }
  | { readonly kind: "product"; readonly factors: ReadonlyArray<Expr> }
  | { readonly kind: "pow"; readonly base: Expr; readonly exponent: number }
  | { readonly kind: "let"; readonly name: string; readonly bound: Expr; readonly body: Expr };

type Environment = Readonly<Record<string, number>>;

type Algebra<A> = {
  readonly literal: (value: number) => A;
  readonly variable: (name: string) => A;
  readonly negation: (expression: A) => A;
  readonly sum: (terms: ReadonlyArray<A>) => A;
  readonly product: (factors: ReadonlyArray<A>) => A;
  readonly power: (base: A, exponent: number) => A;
  readonly scoped: (name: string, bound: A, body: A) => A;
};

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

function pow(base: Expr, exponent: number): Expr {
  return { kind: "pow", base, exponent };
}

function lett(name: string, bound: Expr, body: Expr): Expr {
  return { kind: "let", name, bound, body };
}

function fold<A>(expression: Expr, algebra: Algebra<A>): A {
  switch (expression.kind) {
    case "lit":
      return algebra.literal(expression.value);
    case "var":
      return algebra.variable(expression.name);
    case "neg":
      return algebra.negation(fold(expression.expression, algebra));
    case "sum":
      return algebra.sum(expression.terms.map((term) => fold(term, algebra)));
    case "product":
      return algebra.product(expression.factors.map((factor) => fold(factor, algebra)));
    case "pow":
      return algebra.power(fold(expression.base, algebra), expression.exponent);
    case "let":
      return algebra.scoped(
        expression.name,
        fold(expression.bound, algebra),
        fold(expression.body, algebra),
      );
    default: {
      const exhaustive: never = expression;
      return exhaustive;
    }
  }
}

function simplify(expression: Expr): Expr {
  const algebra: Algebra<Expr> = {
    literal: lit,
    variable,
    negation: (expr) => {
      if (expr.kind === "lit") {
        return lit(-expr.value);
      }
      if (expr.kind === "neg") {
        return expr.expression;
      }
      return neg(expr);
    },
    sum: (terms) => simplifySum(terms),
    product: (factors) => simplifyProduct(factors),
    power: (base, exponent) => simplifyPower(base, exponent),
    scoped: (name, bound, body) => lett(name, bound, body),
  };
  return fold(expression, algebra);
}

function simplifySum(terms: ReadonlyArray<Expr>): Expr {
  const flattened = terms.flatMap((term) => {
    const simplified = simplify(term);
    return simplified.kind === "sum" ? simplified.terms : [simplified];
  });
  const [nonConstants, constant] = flattened.reduce<readonly [ReadonlyArray<Expr>, number]>((acc, term) => {
    const [accTerms, accConstant] = acc;
    if (term.kind === "lit") {
      return [accTerms, accConstant + term.value];
    }
    return [[...accTerms, term], accConstant];
  }, [[], 0]);
  const finalTerms = constant === 0 ? nonConstants : [...nonConstants, lit(constant)];
  if (finalTerms.length === 0) {
    return lit(0);
  }
  if (finalTerms.length === 1) {
    return finalTerms[0]!;
  }
  return sum(finalTerms);
}

function simplifyProduct(factors: ReadonlyArray<Expr>): Expr {
  const flattened = factors.flatMap((factor) => {
    const simplified = simplify(factor);
    return simplified.kind === "product" ? simplified.factors : [simplified];
  });
  if (flattened.some((factor) => factor.kind === "lit" && factor.value === 0)) {
    return lit(0);
  }
  const [nonConstants, constant] = flattened.reduce<readonly [ReadonlyArray<Expr>, number]>((acc, factor) => {
    const [accFactors, accConstant] = acc;
    if (factor.kind === "lit") {
      return [accFactors, accConstant * factor.value];
    }
    return [[...accFactors, factor], accConstant];
  }, [[], 1]);
  const filteredFactors = constant === 1 ? nonConstants : [...nonConstants, lit(constant)];
  if (filteredFactors.length === 0) {
    return lit(constant);
  }
  if (filteredFactors.length === 1) {
    return filteredFactors[0]!;
  }
  return product(filteredFactors);
}

function simplifyPower(base: Expr, exponent: number): Expr {
  const simplifiedBase = simplify(base);
  if (exponent === 0) {
    return lit(1);
  }
  if (exponent === 1) {
    return simplifiedBase;
  }
  if (simplifiedBase.kind === "lit") {
    return lit(Math.pow(simplifiedBase.value, exponent));
  }
  return pow(simplifiedBase, exponent);
}

function freeVars(expression: Expr): ReadonlySet<string> {
  return fold(expression, {
    literal: () => new Set<string>(),
    variable: (name) => new Set<string>([name]),
    negation: (expr) => expr,
    sum: (terms) => new Set<string>(terms.flatMap((set) => [...set])),
    product: (factors) => new Set<string>(factors.flatMap((set) => [...set])),
    power: (base) => base,
    scoped: (name, bound, body) => {
      const union = new Set<string>([...bound, ...body]);
      union.delete(name);
      return union;
    },
  });
}

function freshName(preferred: string, avoid: ReadonlySet<string>): string {
  if (!avoid.has(preferred)) {
    return preferred;
  }
  let index = 1;
  while (avoid.has(`${preferred}_${index}`)) {
    index += 1;
  }
  return `${preferred}_${index}`;
}

function renameInBody(expression: Expr, from: string, to: string): Expr {
  switch (expression.kind) {
    case "lit":
      return expression;
    case "var":
      return expression.name === from ? variable(to) : expression;
    case "neg":
      return neg(renameInBody(expression.expression, from, to));
    case "sum":
      return sum(expression.terms.map((term) => renameInBody(term, from, to)));
    case "product":
      return product(expression.factors.map((factor) => renameInBody(factor, from, to)));
    case "pow":
      return pow(renameInBody(expression.base, from, to), expression.exponent);
    case "let": {
      const renamedBound = renameInBody(expression.bound, from, to);
      if (expression.name === from) {
        return lett(expression.name, renamedBound, expression.body);
      }
      return lett(expression.name, renamedBound, renameInBody(expression.body, from, to));
    }
    default: {
      const exhaustive: never = expression;
      return exhaustive;
    }
  }
}

function substitute(target: string, replacement: Expr, expression: Expr): Expr {
  switch (expression.kind) {
    case "lit":
      return expression;
    case "var":
      return expression.name === target ? replacement : expression;
    case "neg":
      return neg(substitute(target, replacement, expression.expression));
    case "sum":
      return sum(expression.terms.map((term) => substitute(target, replacement, term)));
    case "product":
      return product(expression.factors.map((factor) => substitute(target, replacement, factor)));
    case "pow":
      return pow(substitute(target, replacement, expression.base), expression.exponent);
    case "let": {
      const rewrittenBound = substitute(target, replacement, expression.bound);
      if (expression.name === target) {
        return lett(expression.name, rewrittenBound, expression.body);
      }
      const freeInReplacement = freeVars(replacement);
      if (freeInReplacement.has(expression.name)) {
        const avoid = new Set<string>([
          ...freeInReplacement,
          ...freeVars(expression.body),
        ]);
        const fresh = freshName(expression.name, avoid);
        const renamedBody = renameInBody(expression.body, expression.name, fresh);
        return lett(fresh, rewrittenBound, substitute(target, replacement, renamedBody));
      }
      return lett(expression.name, rewrittenBound, substitute(target, replacement, expression.body));
    }
    default: {
      const exhaustive: never = expression;
      return exhaustive;
    }
  }
}

function differentiate(expression: Expr, variableName: string): Expr {
  switch (expression.kind) {
    case "lit":
      return lit(0);
    case "var":
      return lit(expression.name === variableName ? 1 : 0);
    case "neg":
      return simplify(neg(differentiate(expression.expression, variableName)));
    case "sum": {
      const derivatives = expression.terms.map((term) => differentiate(term, variableName));
      return simplify(sum(derivatives));
    }
    case "product": {
      const derivativeTerms = expression.factors.map((factor, index) => {
        const derivativeFactor = differentiate(factor, variableName);
        if (isZero(derivativeFactor)) {
          return lit(0);
        }
        const others = expression.factors
          .map((candidate, candidateIndex) => (candidateIndex === index ? derivativeFactor : candidate));
        return product(others);
      });
      return simplify(sum(derivativeTerms));
    }
    case "pow": {
      const baseDerivative = differentiate(expression.base, variableName);
      if (isZero(baseDerivative) || expression.exponent === 0) {
        return lit(0);
      }
      const coefficient = lit(expression.exponent);
      const reduced = pow(expression.base, expression.exponent - 1);
      return simplify(product([coefficient, reduced, baseDerivative]));
    }
    case "let": {
      const inlined = substitute(expression.name, expression.bound, expression.body);
      return differentiate(inlined, variableName);
    }
    default: {
      const exhaustive: never = expression;
      return exhaustive;
    }
  }
}

function evaluate(expression: Expr, environment: Environment): number {
  switch (expression.kind) {
    case "lit":
      return expression.value;
    case "var": {
      const value = environment[expression.name];
      if (value === undefined) {
        throw new Error(`Unbound variable '${expression.name}'.`);
      }
      return value;
    }
    case "neg":
      return -evaluate(expression.expression, environment);
    case "sum":
      return expression.terms.reduce((acc, term) => acc + evaluate(term, environment), 0);
    case "product":
      return expression.factors.reduce((acc, factor) => acc * evaluate(factor, environment), 1);
    case "pow":
      return Math.pow(evaluate(expression.base, environment), expression.exponent);
    case "let": {
      const value = evaluate(expression.bound, environment);
      const extended: Environment = { ...environment, [expression.name]: value };
      return evaluate(expression.body, extended);
    }
    default: {
      const exhaustive: never = expression;
      return exhaustive;
    }
  }
}

function isZero(expression: Expr): boolean {
  return expression.kind === "lit" && expression.value === 0;
}

function render(expression: Expr): string {
  switch (expression.kind) {
    case "lit":
      return expression.value.toString();
    case "var":
      return expression.name;
    case "neg":
      return `-( ${render(expression.expression)} )`;
    case "sum":
      return expression.terms.map(render).join(" + ");
    case "product":
      return expression.factors.map(render).join(" × ");
    case "pow":
      return `${render(expression.base)}^${expression.exponent}`;
    case "let":
      return `let ${expression.name} = ${render(expression.bound)} in ${render(expression.body)}`;
    default: {
      const exhaustive: never = expression;
      return exhaustive;
    }
  }
}

export const symbolicAlgebraSubstitutionAndDifferentiation: RunnableExample = {
  id: "012",
  title: "Symbolic algebra, substitution, and differentiation",
  outlineReference: 12,
  summary:
    "Simplification, capture-avoiding substitution, and symbolic derivatives over an arithmetic language with scoped lets.",
  async run() {
    const unsimplified = sum([
      lit(0),
      product([lit(1), variable("x")]),
      sum([variable("x"), lit(3)]),
      neg(neg(variable("x"))),
    ]);
    const simplified = simplify(unsimplified);

    const substitutionSource = lett(
      "y",
      sum([pow(variable("x"), 2), lit(1)]),
      product([variable("y"), variable("x")]),
    );
    const replacement = sum([variable("y"), lit(2)]);
    const substituted = simplify(substitute("x", replacement, substitutionSource));

    const differentiatedSource = lett(
      "y",
      sum([pow(variable("x"), 2), lit(1)]),
      product([variable("y"), variable("y")]),
    );
    const derivative = simplify(differentiate(differentiatedSource, "x"));
    const evaluationPoint: Environment = { x: 2 };
    const valueAtPoint = evaluate(differentiatedSource, evaluationPoint);
    const derivativeAtPoint = evaluate(derivative, evaluationPoint);

    const logs = [
      "== Simplification keeps rewrites canonical ==",
      `Original expression: ${render(unsimplified)}`,
      `Simplified form: ${render(simplified)}`,
      "== Capture-avoiding substitution ==",
      `Source expression: ${render(substitutionSource)}`,
      `Replacement for x: ${render(replacement)}`,
      `Result after substitution: ${render(substituted)}`,
      "== Symbolic differentiation ==",
      `Original let-bound square: ${render(differentiatedSource)}`,
      `Derivative with respect to x: ${render(derivative)}`,
      `Evaluate at x = 2 → original body equals ${(valueAtPoint).toString()}`,
      `Evaluate derivative at x = 2 → ${(derivativeAtPoint).toString()}`,
    ];

    return { logs };
  },
};
