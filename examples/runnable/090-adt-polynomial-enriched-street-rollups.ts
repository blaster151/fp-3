import type { RunnableExample } from "./types";
import {
  buildTrivialAggregatedStreetArtifacts,
} from "../../relative/adt-polynomial-street-trivial";
import {
  aggregatedStreetRollup,
  aggregatedStreetRollupVerdict,
  describeAggregatedStreetRollupPayload,
  describeAggregatedStreetRollupSummary,
  listAggregatedStreetRollupIssues,
  recordedAggregatedStreetArtifacts,
  selectAggregatedStreetAdapters,
  summarizeAggregatedStreetRollupAnalyzers,
} from "../../relative/generated/adt-polynomial-aggregated-street";

const describeGuardOutcome = (verdict: string): string =>
  verdict === "ready"
    ? "Adapters can be emitted immediately."
    : verdict === "pending"
      ? "Hold emission behind a pending guard."
      : "Adapters are blocked until Street roll-ups hold.";

export const stage090AdtPolynomialEnrichedStreetRollups: RunnableExample = {
  id: "090",
  title: "Aggregated enriched Street roll-up analysis",
  outlineReference: 90,
  summary:
    "Aggregate Street roll-ups for a list ADT and run all enriched analyzers with the shared diagnostics payload.",
  async run() {
    const guardNarrative = selectAggregatedStreetAdapters({
      onReady: () => "Aggregated Street roll-ups hold — emit enriched adapters.",
      onPending: () => "Aggregated Street roll-ups pending — emit adapters behind guards.",
      onBlocked: () => "Aggregated Street roll-ups blocked — investigate before emitting adapters.",
    });

    const recordedSummary = describeAggregatedStreetRollupSummary();
    const recordedIssues = listAggregatedStreetRollupIssues();
    const recordedAnalyzerSummaries = summarizeAggregatedStreetRollupAnalyzers();
    const recordedPayload = describeAggregatedStreetRollupPayload();

    const {
      streetInput,
      bundle,
      analysis,
      aggregated: runtimeAggregated,
    } = buildTrivialAggregatedStreetArtifacts();

    const runtimeAnalyzerSummaries = (
      [
        { label: "Yoneda", report: analysis.reports.yoneda },
        { label: "Yoneda distributor", report: analysis.reports.yonedaDistributor },
        { label: "Eilenberg–Moore", report: analysis.reports.eilenbergMoore },
        { label: "Kleisli inclusion", report: analysis.reports.kleisli },
        { label: "V-Cat", report: analysis.reports.vcat },
      ] as const
    ).map(({ label, report }) =>
      `${report.holds ? "✔" : report.pending ? "⧗" : "✘"} ${label} (pending: ${
        report.pending ? "yes" : "no"
      })`,
    );

    const runtimePendingSummary = runtimeAggregated.pending
      ? "⧗ Some enriched analyzers are pending on Street roll-ups."
      : runtimeAggregated.holds
        ? "✔ All enriched analyzers discharged the supplied Street roll-ups."
        : "✘ Aggregated Street roll-up analysis reported issues.";

    const recordedPayloadLines = recordedPayload
      ? [
          `Pending: ${recordedPayload.pending ? "yes" : "no"}`,
          `Holds: ${recordedPayload.holds ? "yes" : "no"}`,
          `Extensions recorded: ${recordedPayload.extensions}`,
          `Kleisli recorded: ${recordedPayload.kleisli}`,
        ]
      : ["No Street roll-up payload recorded in generated module."];

    const logs = [
      "== Generated aggregated Street module ==",
      `Summary: ${recordedSummary}`,
      `Recorded verdict: ${aggregatedStreetRollupVerdict}`,
      `Guard decision: ${guardNarrative} (${describeGuardOutcome(aggregatedStreetRollupVerdict)})`,
      ...(recordedIssues.length > 0
        ? ["Issues:", ...recordedIssues.map((issue) => `   - ${issue}`)]
        : ["Issues: none recorded in generated module."]),
      "== Analyzer statuses (recorded) ==",
      ...(recordedAnalyzerSummaries.length > 0
        ? recordedAnalyzerSummaries
        : ["No analyzer reports were captured."]),
      "== Recorded Street roll-up payload ==",
      ...recordedPayloadLines,
      "== Runtime Street harness recomputation ==",
      runtimeAggregated.details,
      runtimePendingSummary,
      "== Analyzer statuses (runtime recomputation) ==",
      ...runtimeAnalyzerSummaries,
      "== Captured Street roll-up artifacts ==",
      `Extension scenarios: ${streetInput.extensions?.length ?? 0}`,
      `Extension roll-ups: ${bundle.rollup.extensions.length}`,
      `Kleisli scenarios: ${streetInput.kleisli?.length ?? 0}`,
      `Kleisli roll-ups: ${bundle.rollup.kleisli.length}`,
    ];

    return {
      logs,
      metadata: {
        generatedVerdict: aggregatedStreetRollupVerdict,
        guardNarrative,
        recordedIssues,
        recordedAnalyzerCount: recordedAnalyzerSummaries.length,
        recordedPayload,
        runtimePending: analysis.pending,
        runtimeIssues: analysis.issues,
        streetRollupPending: analysis.streetRollups?.pending ?? false,
        recordedArtifacts: recordedAggregatedStreetArtifacts,
        recomputedVerdict: describeGuardOutcome(
          runtimeAggregated.pending
            ? "pending"
            : runtimeAggregated.holds
              ? "ready"
              : "blocked",
        ),
        recordedRollup: aggregatedStreetRollup,
      },
    } as const;
  },
};
