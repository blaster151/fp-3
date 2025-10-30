import type { NonEmptyArray } from "../../allTS";
import type { RunnableExample } from "./types";
import type {
  LazyLambdaKleisliSplittingReport,
  LazyLambdaRelativeMonadReport,
  LazyLambdaRelativeMonadWitness,
  LambdaContextConfiguration,
  LambdaContextSummary,
  LambdaRelativeMonadWitness,
  LambdaSubstitutionConfiguration,
  LambdaSubstitutionSummary,
} from "../../relative/mnne-lambda-monads";

declare function require(id: string): any;

type LambdaModule = {
  readonly describeCountableLambdaRelativeMonadWitness: () => LazyLambdaRelativeMonadWitness;
  readonly analyzeLazyLambdaRelativeMonad: (
    witness: LazyLambdaRelativeMonadWitness,
  ) => LazyLambdaRelativeMonadReport;
  readonly analyzeLazyLambdaKleisliSplitting: (
    witness: LazyLambdaRelativeMonadWitness,
  ) => LazyLambdaKleisliSplittingReport;
  readonly analyzeLambdaKleisliSplitting: (witness: LambdaRelativeMonadWitness) => {
    readonly holds: boolean;
    readonly issues: ReadonlyArray<string>;
    readonly details: string;
  };
};

type RelativeMonadOracleModule = {
  readonly RelativeMonadOracles: {
    readonly lazyLambdaRelativeMonad: (witness: LazyLambdaRelativeMonadWitness) => {
      readonly holds: boolean;
      readonly pending: boolean;
      readonly details: string;
      readonly issues?: ReadonlyArray<string>;
    };
    readonly lambdaKleisliSplitting: (witness: LambdaRelativeMonadWitness) => {
      readonly holds: boolean;
      readonly pending: boolean;
      readonly details: string;
      readonly issues?: ReadonlyArray<string>;
    };
  };
};

const {
  describeCountableLambdaRelativeMonadWitness,
  analyzeLazyLambdaRelativeMonad,
  analyzeLazyLambdaKleisliSplitting,
  analyzeLambdaKleisliSplitting,
} = require("../../relative/mnne-lambda-monads") as LambdaModule;

const { RelativeMonadOracles } = require("../../relative/relative-oracles") as RelativeMonadOracleModule;

const describeContext = (summary: LambdaContextSummary): string =>
  `Γ_${summary.size} (max depth ${summary.maxDepth}) has ${summary.termCount} terms`;

const describeSubstitution = (summary: LambdaSubstitutionSummary): string =>
  `${summary.source} → ${summary.target} (depth ≤ ${summary.maxDepth}): ${summary.substitutionCount} substitutions`;

const describeContextSlice = (
  slice: LazyLambdaRelativeMonadReport["approximation"]["contextSlice"],
): string => {
  const values = slice.values
    .map((config) => `${config.size}|≤${config.maxTermDepth}`)
    .join(", ") || "∅";
  const suffix = slice.truncated ? ` (truncated after ${slice.consumed}; limit ${slice.limit})` : "";
  return `Context slice: { ${values} }${suffix}`;
};

const describeSubstitutionSlice = (
  slice: LazyLambdaRelativeMonadReport["approximation"]["substitutionSlice"],
): string => {
  const values = slice.values
    .map((config) => `${config.source}→${config.target}|≤${config.maxTermDepth}`)
    .join(", ") || "∅";
  const suffix = slice.truncated ? ` (truncated after ${slice.consumed}; limit ${slice.limit})` : "";
  return `Substitution slice: { ${values} }${suffix}`;
};

function runLazyLambdaDemo(): readonly string[] {
  const lazyWitness = describeCountableLambdaRelativeMonadWitness();
  const report = analyzeLazyLambdaRelativeMonad(lazyWitness);
  const kleisliReport = analyzeLazyLambdaKleisliSplitting(lazyWitness);
  const contextConfigs: NonEmptyArray<LambdaContextConfiguration> =
    report.approximation.contextSlice.values.length > 0
      ? (report.approximation.contextSlice.values as NonEmptyArray<LambdaContextConfiguration>)
      : ([{ size: 0, maxTermDepth: 0 }] as NonEmptyArray<LambdaContextConfiguration>);

  const substitutionConfigs: NonEmptyArray<LambdaSubstitutionConfiguration> =
    report.approximation.substitutionSlice.values.length > 0
      ? (report.approximation.substitutionSlice
          .values as NonEmptyArray<LambdaSubstitutionConfiguration>)
      : ([{ source: 0, target: 0, maxTermDepth: 0 }] as NonEmptyArray<LambdaSubstitutionConfiguration>);

  const strictWitness: LambdaRelativeMonadWitness = {
    contexts: contextConfigs,
    substitutions: substitutionConfigs,
  };
  const strictKleisli = analyzeLambdaKleisliSplitting(strictWitness);

  const oracle = RelativeMonadOracles.lazyLambdaRelativeMonad(lazyWitness);
  const kleisliOracle = RelativeMonadOracles.lambdaKleisliSplitting(strictWitness);

  const lines: string[] = [];
  lines.push("== Example 10 lazy λ-term relative monad (symbolic contexts) ==");
  lines.push(`Lazy relative monad holds? ${report.holds}`);
  lines.push(report.details);
  lines.push(`Lazy Kleisli splitting holds? ${kleisliReport.holds}`);
  lines.push(kleisliReport.details);

  if (report.contexts.length > 0) {
    lines.push("", "Context catalogue", ...report.contexts.slice(0, 6).map(describeContext));
  }
  if (report.substitutions.length > 0) {
    lines.push(
      "",
      "Substitution catalogue",
      ...report.substitutions.slice(0, 6).map(describeSubstitution),
    );
  }

  lines.push("", describeContextSlice(report.approximation.contextSlice));
  lines.push(describeSubstitutionSlice(report.approximation.substitutionSlice));

  if (report.issues.length > 0) {
    lines.push("", "Relative monad issues:", ...report.issues.map((issue) => `  • ${issue}`));
  }
  if (kleisliReport.issues.length > 0) {
    lines.push("", "Kleisli splitting issues:", ...kleisliReport.issues.map((issue) => `  • ${issue}`));
  }

  lines.push(
    "",
    `Strict Kleisli verification holds? ${strictKleisli.holds}`,
    strictKleisli.details,
  );
  if (strictKleisli.issues.length > 0) {
    lines.push(...strictKleisli.issues.map((issue) => `  • ${issue}`));
  }

  lines.push(
    "",
    `Lazy oracle agrees? ${oracle.holds && !oracle.pending}`,
    `Oracle details: ${oracle.details}`,
  );
  if (oracle.issues && oracle.issues.length > 0) {
    lines.push(...oracle.issues.map((issue) => `  • ${issue}`));
  }

  lines.push(
    "",
    `Kleisli oracle agrees? ${kleisliOracle.holds && !kleisliOracle.pending}`,
    `Kleisli oracle details: ${kleisliOracle.details}`,
  );
  if (kleisliOracle.issues && kleisliOracle.issues.length > 0) {
    lines.push(...kleisliOracle.issues.map((issue) => `  • ${issue}`));
  }

  return lines;
}

export const stage102LazyLambdaRelativeMonad: RunnableExample = {
  id: "102",
  title: "Lazy λ-term relative monad approximations",
  outlineReference: 102,
  summary:
    "Materialise countable λ-contexts via symbolic enumeration, contrast lazy and strict Kleisli diagnostics, and surface the approximation slices recorded by the oracle.",
  async run() {
    return { logs: runLazyLambdaDemo() };
  },
};

