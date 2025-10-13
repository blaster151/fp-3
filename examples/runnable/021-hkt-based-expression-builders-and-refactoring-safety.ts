import { Result } from "./structures";
import type { RunnableExample } from "./types";

/**
 * Stage 021 rebuilds the tagless-final (higher-kinded) expression builders that
 * power the arithmetic walkthroughs in the legacy catalogue.  Expressions are
 * represented as polymorphic functions that accept an algebra describing how
 * to interpret literals, variables, addition, and multiplication.  The same
 * recipe can then be interpreted as a pretty printer, an evaluator, or an
 * analysis pass simply by supplying a different algebra.
 *
 * The refactor portion introduces a `negate` operation.  By extending the
 * algebra interface, TypeScript forces every interpreter to account for the new
 * constructor, providing automatic exhaustiveness checks.
 */

// ---------------------------------------------------------------------------
// Expression encodings
// ---------------------------------------------------------------------------

type Environment = Readonly<Record<string, number>>;

type ExpressionRecipe = <Repr>(algebra: ExpressionAlgebra<Repr>) => Repr;

type ExpressionAlgebra<Repr> = {
  readonly literal: (value: number) => Repr;
  readonly variable: (name: string) => Repr;
  readonly add: (left: Repr, right: Repr) => Repr;
  readonly multiply: (left: Repr, right: Repr) => Repr;
};

type ExtendedExpressionRecipe = <Repr>(algebra: ExtendedExpressionAlgebra<Repr>) => Repr;

type ExtendedExpressionAlgebra<Repr> = ExpressionAlgebra<Repr> & {
  readonly negate: (value: Repr) => Repr;
};

// ---------------------------------------------------------------------------
// Example programs
// ---------------------------------------------------------------------------

const baselineExpression: ExpressionRecipe = (alg) =>
  alg.add(
    alg.multiply(alg.variable("x"), alg.variable("x")),
    alg.add(alg.multiply(alg.literal(3), alg.variable("x")), alg.literal(5)),
  );

const refactoredExpression: ExtendedExpressionRecipe = (alg) =>
  alg.add(
    alg.multiply(alg.variable("x"), alg.variable("x")),
    alg.add(alg.negate(alg.multiply(alg.literal(3), alg.variable("x"))), alg.literal(5)),
  );

// ---------------------------------------------------------------------------
// Interpreters
// ---------------------------------------------------------------------------

type Evaluation = (env: Environment) => Result<string, number>;

type ExpressionAnalysis = {
  readonly variables: ReadonlyArray<string>;
  readonly operations: number;
  readonly negations: number;
};

const baseEvaluationAlgebra: ExpressionAlgebra<Evaluation> = {
  literal: (value) => () => Result.ok(value),
  variable: (name) => (env) => {
    const value = env[name];
    if (value === undefined) {
      return Result.err(`Unbound variable '${name}'.`);
    }
    return Result.ok(value);
  },
  add: (left, right) => (env) =>
    Result.chain(left(env), (lhs) => Result.map(right(env), (rhs) => lhs + rhs)),
  multiply: (left, right) => (env) =>
    Result.chain(left(env), (lhs) => Result.map(right(env), (rhs) => lhs * rhs)),
};

const extendedEvaluationAlgebra: ExtendedExpressionAlgebra<Evaluation> = {
  ...baseEvaluationAlgebra,
  negate: (value) => (env) => Result.map(value(env), (evaluated) => -evaluated),
};

const basePrettyAlgebra: ExpressionAlgebra<string> = {
  literal: (value) => value.toString(),
  variable: (name) => name,
  add: (left, right) => `( ${left} + ${right} )`,
  multiply: (left, right) => `( ${left} * ${right} )`,
};

const extendedPrettyAlgebra: ExtendedExpressionAlgebra<string> = {
  ...basePrettyAlgebra,
  negate: (value) => `-( ${value} )`,
};

const baseAnalysisAlgebra: ExpressionAlgebra<ExpressionAnalysis> = {
  literal: () => ({ variables: [], operations: 0, negations: 0 }),
  variable: (name) => ({ variables: [name], operations: 0, negations: 0 }),
  add: (left, right) => combineBinary(left, right, 1, 0),
  multiply: (left, right) => combineBinary(left, right, 1, 0),
};

const extendedAnalysisAlgebra: ExtendedExpressionAlgebra<ExpressionAnalysis> = {
  ...baseAnalysisAlgebra,
  negate: (value) => ({
    variables: value.variables,
    operations: value.operations + 1,
    negations: value.negations + 1,
  }),
};

function combineBinary(
  left: ExpressionAnalysis,
  right: ExpressionAnalysis,
  operationIncrement: number,
  negationIncrement: number,
): ExpressionAnalysis {
  return {
    variables: unique([...left.variables, ...right.variables]),
    operations: left.operations + right.operations + operationIncrement,
    negations: left.negations + right.negations + negationIncrement,
  };
}

function unique(values: ReadonlyArray<string>): ReadonlyArray<string> {
  return Array.from(new Set(values)).sort();
}

// ---------------------------------------------------------------------------
// Refactor helpers
// ---------------------------------------------------------------------------

function lowerExtendedExpression(expression: ExtendedExpressionRecipe): ExpressionRecipe {
  return (algebra) =>
    expression({
      ...algebra,
      negate: (value) => algebra.multiply(algebra.literal(-1), value),
    });
}

function describeAnalysis(analysis: ExpressionAnalysis): string {
  const vars = analysis.variables.length === 0 ? "∅" : analysis.variables.join(", ");
  return `variables=[${vars}], operations=${analysis.operations}, negations=${analysis.negations}`;
}

function formatResult(result: Result<string, number>): string {
  return result.kind === "ok" ? `✔ ${result.value}` : `✘ ${result.error}`;
}

// ---------------------------------------------------------------------------
// Runnable wiring
// ---------------------------------------------------------------------------

export const hktExpressionBuildersAndRefactorSafety: RunnableExample = {
  id: "021",
  title: "HKT-based expression builders and refactoring safety",
  outlineReference: 21,
  summary:
    "Tagless-final expression encodings interpreted as pretty printers, evaluators, and analysis passes with a negate refactor checkpoint.",
  async run() {
    const environment: Environment = { x: 3 };

    const baselinePretty = baselineExpression(basePrettyAlgebra);
    const baselineEvaluation = baselineExpression(baseEvaluationAlgebra)(environment);
    const baselineAnalysis = baselineExpression(baseAnalysisAlgebra);

    const refactoredPretty = refactoredExpression(extendedPrettyAlgebra);
    const refactoredEvaluation = refactoredExpression(extendedEvaluationAlgebra)(environment);
    const refactoredAnalysis = refactoredExpression(extendedAnalysisAlgebra);

    const lowered = lowerExtendedExpression(refactoredExpression);
    const loweredPretty = lowered(basePrettyAlgebra);
    const loweredEvaluation = lowered(baseEvaluationAlgebra)(environment);

    const logs = [
      "== Baseline tagless-final program ==",
      `Pretty: ${baselinePretty}`,
      `Evaluation at x=3: ${formatResult(baselineEvaluation)}`,
      `Static analysis: ${describeAnalysis(baselineAnalysis)}`,
      "== Refactor with negate operation ==",
      `Pretty: ${refactoredPretty}`,
      `Evaluation at x=3: ${formatResult(refactoredEvaluation)}`,
      `Static analysis: ${describeAnalysis(refactoredAnalysis)}`,
      "== Lowered extended program (negate via multiplication by -1) ==",
      `Pretty: ${loweredPretty}`,
      `Evaluation at x=3: ${formatResult(loweredEvaluation)}`,
      "Refactor check: interpreters must now provide a negate handler (compile-time exhaustive handling).",
    ];

    return { logs };
  },
};
