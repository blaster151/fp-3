import type { RunnableExample } from "./types";
import type {
  PowersetApproximationDiagnostics,
  PowersetArrowSample,
  PowersetLawComparison,
  PowersetRelativeMonadReport,
  PowersetRelativeMonadWitness,
  PowersetSubsetSlice,
} from "../../relative/mnne-powerset-monads";

declare function require(id: string): any;

type PowersetModule = {
  readonly describeCofinitePowersetWitness: () => PowersetRelativeMonadWitness<number>;
  readonly analyzePowersetRelativeMonad: <Element>(
    witness: PowersetRelativeMonadWitness<Element>,
  ) => PowersetRelativeMonadReport<Element>;
};

type RelativeMonadOracleModule = {
  readonly RelativeMonadOracles: {
    readonly powersetRelativeMonad: <Element>(
      witness: PowersetRelativeMonadWitness<Element>,
    ) => {
      readonly holds: boolean;
      readonly pending: boolean;
      readonly details: string;
      readonly issues?: ReadonlyArray<string>;
    };
  };
};

const { describeCofinitePowersetWitness, analyzePowersetRelativeMonad } = require(
  "../../relative/mnne-powerset-monads",
) as PowersetModule;

const { RelativeMonadOracles } = require("../../relative/relative-oracles") as RelativeMonadOracleModule;

const formatValues = <Element>(values: ReadonlyArray<Element>): string =>
  values.map((value) => `${value}`).join(", ") || "∅";

const describeSlice = <Element>(
  label: string,
  slice: { readonly values: ReadonlyArray<Element>; readonly truncated: boolean; readonly consumed: number; readonly limit: number },
): string => {
  const preview = formatValues(slice.values);
  const suffix = slice.truncated
    ? ` (truncated after ${slice.consumed} values; limit ${slice.limit})`
    : "";
  return `${label}: { ${preview} }${suffix}`;
};

const renderArrowSamples = <Element>(samples: ReadonlyArray<PowersetArrowSample<Element>>): readonly string[] =>
  samples.slice(0, 4).map((sample) =>
    describeSlice(
      `${sample.arrow}(${sample.elementKey})`,
      sample.slice,
    ),
  );

const renderComparisons = <Element>(comparisons: ReadonlyArray<PowersetLawComparison<Element>>): readonly string[] => {
  const groups: Record<string, { readonly kind: string; readonly entries: PowersetLawComparison<Element>[] }> = {};
  for (const comparison of comparisons) {
    const kind = comparison.kind;
    if (!groups[kind]) {
      groups[kind] = { kind, entries: [] };
    }
    groups[kind]!.entries.push(comparison);
  }
  return Object.values(groups).flatMap(({ kind, entries }) => {
    const successes = entries.filter((entry) => entry.equal);
    const failures = entries.filter((entry) => !entry.equal);
    const lines: string[] = [];
    lines.push(`• ${kind}: ${successes.length} ✓ / ${entries.length} total`);
    if (failures.length > 0) {
      failures.slice(0, 2).forEach((failure) => {
        const left = formatValues(failure.leftSlice.values);
        const right = formatValues(failure.rightSlice.values);
        lines.push(
          `    ${failure.context} — red { ${left} } vs green { ${right} }`,
        );
      });
    }
    return lines;
  });
};

const renderApproximation = (approximation: PowersetApproximationDiagnostics): readonly string[] => {
  const lines = [
    `Enumeration limits — base ≤ ${approximation.baseLimit}, subset ≤ ${approximation.subsetLimit}`,
    `  Base truncated? ${approximation.baseTruncated}`,
  ];
  if (approximation.truncatedSubsets.length > 0) {
    lines.push(
      "  Truncated subsets:",
      ...approximation.truncatedSubsets.map(
        (subset) =>
          `    ${subset.label}: consumed ${subset.consumed} of limit ${subset.limit}`,
      ),
    );
  }
  if (approximation.truncatedArrows.length > 0) {
    lines.push(
      "  Truncated arrow images:",
      ...approximation.truncatedArrows
        .slice(0, 4)
        .map(
          (entry) =>
            `    ${entry.arrow}(${entry.elementKey}): consumed ${entry.consumed} of limit ${entry.limit}`,
        ),
    );
  }
  if (approximation.truncatedComparisons.length > 0) {
    lines.push(
      "  Truncated comparisons:",
      ...approximation.truncatedComparisons.map(
        (entry) =>
          `    ${entry.kind} on ${entry.context}: red truncated? ${entry.leftTruncated}, green truncated? ${entry.rightTruncated}`,
      ),
    );
  }
  return lines;
};

const renderSubsetSlices = <Element>(
  slices: ReadonlyArray<PowersetSubsetSlice<Element>>,
): readonly string[] =>
  slices.map((subset) =>
    describeSlice(
      `Subset ${subset.label}`,
      subset.slice,
    ),
  );

function runPowersetRelativeMonadDemo(): readonly string[] {
  const witness = describeCofinitePowersetWitness();
  const report = analyzePowersetRelativeMonad(witness);
  const oracle = RelativeMonadOracles.powersetRelativeMonad(witness);

  const lines: string[] = [];
  lines.push("== Example 8 powerset relative monad (cofinite ℕ) ==");
  lines.push(`Law report holds? ${report.holds}`);
  lines.push(report.details);
  lines.push(describeSlice("Base", report.baseSlice));
  lines.push(...renderSubsetSlices(report.subsetSlices));
  lines.push("", "Arrow images (first few)", ...renderArrowSamples(report.arrowSamples));
  lines.push("", "Comparison summary", ...renderComparisons(report.comparisons));

  if (report.issues.length > 0) {
    lines.push("", "Detected issues:", ...report.issues.map((issue) => `  • ${issue}`));
  }

  lines.push("", ...renderApproximation(report.approximation));
  lines.push(
    "",
    `Oracle surface agrees? ${oracle.holds && !oracle.pending}`,
    `Oracle details: ${oracle.details}`,
  );
  if (oracle.issues && oracle.issues.length > 0) {
    lines.push(...oracle.issues.map((issue) => `  • ${issue}`));
  }

  return lines;
}

export const stage084MnnePowersetRelativeMonad: RunnableExample = {
  id: "084",
  title: "MNNE powerset relative monad diagnostics",
  outlineReference: 84,
  summary:
    "Replay Example 8’s powerset relative monad on cofinite subsets, enumerate sampled images, and summarise the Street-style unit/associativity comparisons.",
  async run() {
    return { logs: runPowersetRelativeMonadDemo() };
  },
};
