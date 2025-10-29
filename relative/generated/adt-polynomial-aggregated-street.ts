import { buildTrivialAggregatedStreetArtifacts } from "../adt-polynomial-street-trivial";

const artifacts = buildTrivialAggregatedStreetArtifacts();

export const aggregatedStreetRollup = artifacts.aggregated;

export type AggregatedStreetRollup = typeof aggregatedStreetRollup;

export type AggregatedStreetRollupVerdict = "ready" | "pending" | "blocked";

type AnalyzerKey = "yoneda" | "yonedaDistributor" | "eilenbergMoore" | "kleisli" | "vcat";

type AnalyzerReport =
  | ({ readonly pending?: boolean; readonly holds?: boolean } & Record<string, unknown>)
  | undefined;

type AnalyzerReports =
  | (Readonly<Record<AnalyzerKey, AnalyzerReport>> & { readonly [key: string]: AnalyzerReport })
  | undefined;

type AggregatedStreetPayloadArtifacts = {
  readonly pending?: boolean;
  readonly holds?: boolean;
  readonly extensions?: ReadonlyArray<unknown>;
  readonly kleisli?: ReadonlyArray<unknown>;
};

type AggregatedStreetArtifacts = {
  readonly streetRollups?: AggregatedStreetPayloadArtifacts;
  readonly reports?: AnalyzerReports;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readAggregatedStreetArtifacts = (
  aggregated: AggregatedStreetRollup,
): AggregatedStreetArtifacts | undefined => {
  const candidate = (aggregated as { readonly artifacts?: unknown }).artifacts;
  if (!isRecord(candidate)) {
    return undefined;
  }
  const streetRollups = (candidate as { readonly streetRollups?: unknown }).streetRollups;
  if (streetRollups != null && !isRecord(streetRollups)) {
    return undefined;
  }
  return candidate as AggregatedStreetArtifacts;
};

const ANALYZER_ORDER: ReadonlyArray<readonly [string, AnalyzerKey]> = [
  ["Yoneda", "yoneda"],
  ["Yoneda distributor", "yonedaDistributor"],
  ["Eilenberg–Moore", "eilenbergMoore"],
  ["Kleisli inclusion", "kleisli"],
  ["V-Cat", "vcat"],
];

const deriveVerdict = (
  aggregated: Pick<AggregatedStreetRollup, "pending" | "holds">,
): AggregatedStreetRollupVerdict =>
  aggregated.pending ? "pending" : aggregated.holds ? "ready" : "blocked";

const describeSummaryFrom = (aggregated: { readonly details?: string }): string =>
  aggregated.details ?? "Aggregated Street roll-up summary unavailable.";

const listIssuesFrom = (aggregated: { readonly issues?: ReadonlyArray<string> }) =>
  aggregated.issues ?? [];

const formatAnalyzerStatus = (label: string, report: AnalyzerReport): string => {
  if (!report) {
    return `✘ ${label} (missing report metadata)`;
  }
  const pending = report.pending ? "yes" : "no";
  const status = report.holds ? "✔" : report.pending ? "⧗" : "✘";
  return `${status} ${label} (pending: ${pending})`;
};

const describePayloadFrom = (
  aggregated: AggregatedStreetRollup,
):
  | {
      readonly pending: boolean;
      readonly holds: boolean;
      readonly extensions: number;
      readonly kleisli: number;
    }
  | undefined => {
  const payload = readAggregatedStreetArtifacts(aggregated)?.streetRollups;
  if (!payload) {
    return undefined;
  }
  return {
    pending: Boolean(payload.pending),
    holds: Boolean(payload.holds),
    extensions: Array.isArray(payload.extensions) ? payload.extensions.length : 0,
    kleisli: Array.isArray(payload.kleisli) ? payload.kleisli.length : 0,
  };
};

export const aggregatedStreetRollupVerdict: AggregatedStreetRollupVerdict = deriveVerdict(
  aggregatedStreetRollup,
);

export function describeAggregatedStreetRollupSummary(): string {
  return describeSummaryFrom(aggregatedStreetRollup);
}

export function listAggregatedStreetRollupIssues(): ReadonlyArray<string> {
  return listIssuesFrom(aggregatedStreetRollup);
}

export function summarizeAggregatedStreetRollupAnalyzers(): ReadonlyArray<string> {
  const reports = readAggregatedStreetArtifacts(aggregatedStreetRollup)?.reports;
  if (!reports) {
    return [];
  }
  return ANALYZER_ORDER.map(([label, key]) => formatAnalyzerStatus(label, reports[key]));
}

export function describeAggregatedStreetRollupPayload():
  | {
      readonly pending: boolean;
      readonly holds: boolean;
      readonly extensions: number;
      readonly kleisli: number;
    }
  | undefined {
  return describePayloadFrom(aggregatedStreetRollup);
}

export function assertAggregatedStreetRollupReady(): void {
  const summary = describeAggregatedStreetRollupSummary();
  if (!aggregatedStreetRollup.holds) {
    throw new Error(`Aggregated Street roll-up blocked: ${summary}`);
  }
  if (aggregatedStreetRollup.pending) {
    throw new Error(`Aggregated Street roll-up pending: ${summary}`);
  }
}

const selectAggregatedStreetAdaptersInternal = <T>(
  aggregated: AggregatedStreetRollup,
  options: {
    readonly onReady: (aggregated: AggregatedStreetRollup) => T;
    readonly onPending?: (aggregated: AggregatedStreetRollup) => T;
    readonly onBlocked?: (aggregated: AggregatedStreetRollup) => T;
  },
): T => {
  const verdict = deriveVerdict(aggregated);
  if (verdict === "ready") {
    return options.onReady(aggregated);
  }
  if (verdict === "pending" && options.onPending) {
    return options.onPending(aggregated);
  }
  if (verdict === "blocked" && options.onBlocked) {
    return options.onBlocked(aggregated);
  }
  const summary = describeSummaryFrom(aggregated);
  throw new Error(`Aggregated Street roll-up ${verdict} without handler: ${summary}`);
};

export function selectAggregatedStreetAdaptersFrom<T>(
  aggregated: AggregatedStreetRollup,
  options: {
    readonly onReady: (aggregated: AggregatedStreetRollup) => T;
    readonly onPending?: (aggregated: AggregatedStreetRollup) => T;
    readonly onBlocked?: (aggregated: AggregatedStreetRollup) => T;
  },
): T {
  return selectAggregatedStreetAdaptersInternal(aggregated, options);
}

export function selectAggregatedStreetAdapters<T>(
  options: Parameters<typeof selectAggregatedStreetAdaptersFrom<T>>[1],
): T {
  return selectAggregatedStreetAdaptersInternal(aggregatedStreetRollup, options);
}

export const recordedAggregatedStreetArtifacts = artifacts;

export type RecordedAggregatedStreetArtifacts = typeof artifacts;

