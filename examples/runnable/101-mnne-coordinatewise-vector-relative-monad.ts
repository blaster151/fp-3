import type { RunnableExample } from "./types";
import type {
  CoordinatewiseVectorArrowSlice,
  CoordinatewiseVectorComparison,
  CoordinatewiseVectorEntry,
  CoordinatewiseVectorRelativeMonadReport,
  CoordinatewiseVectorRelativeMonadWitness,
  CoordinatewiseVectorUnitSlice,
} from "../../relative/mnne-vector-monads";

declare function require(id: string): any;

type VectorModule = {
  readonly describeCoordinatewiseBooleanVectorWitness: () => CoordinatewiseVectorRelativeMonadWitness<number, boolean>;
  readonly analyzeCoordinatewiseVectorRelativeMonad: <Coordinate, R>(
    witness: CoordinatewiseVectorRelativeMonadWitness<Coordinate, R>,
  ) => CoordinatewiseVectorRelativeMonadReport<Coordinate, R>;
};

type RelativeMonadOracleModule = {
  readonly RelativeMonadOracles: {
    readonly coordinatewiseVectorRelativeMonad: <Coordinate, R>(
      witness: CoordinatewiseVectorRelativeMonadWitness<Coordinate, R>,
    ) => {
      readonly holds: boolean;
      readonly pending: boolean;
      readonly details: string;
      readonly issues?: ReadonlyArray<string>;
    };
  };
};

const { describeCoordinatewiseBooleanVectorWitness, analyzeCoordinatewiseVectorRelativeMonad } = require(
  "../../relative/mnne-vector-monads",
) as VectorModule;

const { RelativeMonadOracles } = require("../../relative/relative-oracles") as RelativeMonadOracleModule;

const describeEntry = <Coordinate, R>(entry: CoordinatewiseVectorEntry<Coordinate, R>): string =>
  `${entry.coordinate} ↦ ${entry.value}`;

const describeSlice = <Coordinate, R>(
  label: string,
  slice: CoordinatewiseVectorUnitSlice<Coordinate, R>["slice"],
): string => {
  const preview = slice.values.map((entry) => describeEntry(entry)).join(", ") || "∅";
  const suffix = slice.truncated ? ` (truncated after ${slice.consumed} values; limit ${slice.limit})` : "";
  return `${label}: { ${preview} }${suffix}`;
};

const describeArrowSlice = <Coordinate, R>(slice: CoordinatewiseVectorArrowSlice<Coordinate, R>): string => {
  const prefix = slice.arrowDescription ? `${slice.arrow} — ${slice.arrowDescription}` : slice.arrow;
  return describeSlice(`${prefix}(${slice.coordinate})`, slice.slice);
};

const summariseComparisons = <Coordinate, R>(
  comparisons: ReadonlyArray<CoordinatewiseVectorComparison<Coordinate, R>>,
): readonly string[] => {
  if (comparisons.length === 0) {
    return ["No comparison samples were collected."];
  }

  const grouped: Record<string, CoordinatewiseVectorComparison<Coordinate, R>[]> = {};
  for (const comparison of comparisons) {
    if (!grouped[comparison.kind]) {
      grouped[comparison.kind] = [];
    }
    grouped[comparison.kind]!.push(comparison);
  }

  return Object.entries(grouped).map(([kind, entries]) => {
    const successes = entries.filter((entry) => entry.equal).length;
    const failures = entries.length - successes;
    return `• ${kind}: ${successes} ✓ / ${failures} ✗ (total ${entries.length})`;
  });
};

const summariseApproximation = (
  report: CoordinatewiseVectorRelativeMonadReport<number, boolean>,
): readonly string[] => {
  const { approximation } = report;
  const lines = [
    `Enumeration limits — coordinates ≤ ${approximation.coordinateLimit}, entries ≤ ${approximation.entryLimit}, arrows ≤ ${approximation.arrowLimit}, compositions ≤ ${approximation.compositionLimit}`,
    `Coordinate slice: consumed ${approximation.coordinateSlice.consumed} (truncated? ${approximation.coordinateSlice.truncated})`,
  ];

  if (approximation.truncatedUnits.length > 0) {
    lines.push(
      "Truncated unit vectors:",
      ...approximation.truncatedUnits.map(
        (entry) => `  • ${entry.coordinate}: consumed ${entry.consumed} of limit ${entry.limit}`,
      ),
    );
  }

  if (approximation.truncatedArrows.length > 0) {
    lines.push(
      "Truncated arrow columns:",
      ...approximation.truncatedArrows
        .slice(0, 4)
        .map(
          (entry) =>
            `  • ${entry.arrow}(${entry.coordinate}): consumed ${entry.consumed} of limit ${entry.limit}`,
        ),
    );
  }

  if (approximation.truncatedComparisons.length > 0) {
    lines.push(
      "Truncated comparisons:",
      ...approximation.truncatedComparisons.map(
        (comparison) =>
          `  • ${comparison.kind} on ${comparison.context}: left truncated? ${comparison.leftTruncated}, right truncated? ${comparison.rightTruncated}`,
      ),
    );
  }

  return lines;
};

function runCoordinatewiseVectorDemo(): readonly string[] {
  const witness = describeCoordinatewiseBooleanVectorWitness();
  const report = analyzeCoordinatewiseVectorRelativeMonad(witness);
  const oracle = RelativeMonadOracles.coordinatewiseVectorRelativeMonad(witness);

  const lines: string[] = [];
  lines.push("== Example 9 coordinatewise vector relative monad (Boolean ℕ) ==");
  lines.push(`Law report holds? ${report.holds}`);
  lines.push(report.details);
  lines.push(
    `Coordinate sample: ${report.coordinateSlice.values.join(", ") || "∅"} (truncated? ${report.coordinateSlice.truncated}, limit ${report.coordinateSlice.limit})`,
  );

  const unitSummaries = report.unitSlices.slice(0, 4).map((unit) =>
    describeSlice(`η(${unit.coordinate})`, unit.slice),
  );
  if (unitSummaries.length > 0) {
    lines.push("", "Unit vector slices", ...unitSummaries);
  }

  const arrowSummaries = report.arrowSlices.slice(0, 4).map((arrow) => describeArrowSlice(arrow));
  if (arrowSummaries.length > 0) {
    lines.push("", "Arrow column slices", ...arrowSummaries);
  }

  lines.push("", "Comparison roll-up", ...summariseComparisons(report.comparisons));

  if (report.issues.length > 0) {
    lines.push("", "Detected issues:", ...report.issues.map((issue) => `  • ${issue}`));
  }

  lines.push("", "Approximation diagnostics", ...summariseApproximation(report));
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

export const stage101CoordinatewiseVectorRelativeMonad: RunnableExample = {
  id: "101",
  title: "Coordinatewise vector relative monad heuristics",
  outlineReference: 101,
  summary:
    "Replay Example 9’s coordinatewise Vec relative monad, enumerate lazy tail columns, and surface truncation diagnostics from the approximation guards.",
  async run() {
    return { logs: runCoordinatewiseVectorDemo() };
  },
};

