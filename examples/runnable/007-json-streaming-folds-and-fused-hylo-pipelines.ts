import { RunnableExample } from "./types";
import { Result } from "./structures";

/**
 * Stage 007 highlights two complementary techniques for processing JSON-like
 * data incrementally.  The first uses a streaming fold over newline-delimited
 * JSON events while the second fuses parsing and aggregation with a
 * hylo-morphism so that no intermediate array of parsed objects is allocated.
 */

type Event =
  | { readonly kind: "view"; readonly user: string }
  | { readonly kind: "purchase"; readonly user: string; readonly value: number };

type Summary = {
  readonly processed: number;
  readonly views: number;
  readonly purchases: number;
  readonly revenue: number;
  readonly errors: ReadonlyArray<string>;
};

type HyloSeed = { readonly lines: ReadonlyArray<string>; readonly index: number };

type HyloStep<T> = { readonly value: T; readonly nextSeed: HyloSeed } | undefined;

type SummaryResult = Result<string, Event>;

const initialSummary: Summary = {
  processed: 0,
  views: 0,
  purchases: 0,
  revenue: 0,
  errors: [],
};

function parseEvent(line: string): SummaryResult {
  try {
    const parsed = JSON.parse(line) as Partial<Event>;
    if (parsed.kind === "view" && typeof parsed.user === "string") {
      return Result.ok({ kind: "view", user: parsed.user });
    }
    if (
      parsed.kind === "purchase" &&
      typeof parsed.user === "string" &&
      typeof parsed.value === "number"
    ) {
      return Result.ok({ kind: "purchase", user: parsed.user, value: parsed.value });
    }
    return Result.err(`Unsupported event shape: ${line}`);
  } catch (error) {
    return Result.err(`Malformed JSON: ${(error as Error).message}`);
  }
}

function updateSummary(summary: Summary, result: SummaryResult): Summary {
  if (result.kind === "err") {
    return {
      ...summary,
      processed: summary.processed + 1,
      errors: [...summary.errors, result.error],
    };
  }

  if (result.value.kind === "view") {
    return {
      ...summary,
      processed: summary.processed + 1,
      views: summary.views + 1,
    };
  }

  return {
    ...summary,
    processed: summary.processed + 1,
    purchases: summary.purchases + 1,
    revenue: summary.revenue + result.value.value,
  };
}

function hylo<T>(seed: HyloSeed, unfold: (current: HyloSeed) => HyloStep<T>, fold: (acc: Summary, value: T) => Summary, acc: Summary): Summary {
  const step = unfold(seed);
  if (!step) {
    return acc;
  }
  const nextAcc = fold(acc, step.value);
  return hylo(step.nextSeed, unfold, fold, nextAcc);
}

function unfoldLine(seed: HyloSeed): HyloStep<SummaryResult> {
  if (seed.index >= seed.lines.length) {
    return undefined;
  }
  const value = parseEvent(seed.lines[seed.index]!);
  return {
    value,
    nextSeed: { lines: seed.lines, index: seed.index + 1 },
  };
}

function formatSummary(summary: Summary): string {
  return `processed=${summary.processed}, views=${summary.views}, purchases=${summary.purchases}, revenue=${summary.revenue.toFixed(
    2,
  )}`;
}

export const jsonStreamingFoldsAndHylo: RunnableExample = {
  id: "007",
  title: "JSON streaming folds and fused hylo pipelines",
  outlineReference: 7,
  summary:
    "Stream newline-delimited JSON events, aggregate purchase metrics, and replicate the result with a fused hylo-morphism.",
  async run() {
    const ndjson = [
      '{"kind":"view","user":"ada"}',
      '{"kind":"purchase","user":"ada","value":125.5}',
      '{"kind":"view","user":"grace"}',
      '{"kind":"purchase","user":"grace","value":89.2}',
      "not-json at all",
      '{"kind":"purchase","user":"ada","value":210.0}',
    ] as const;

    const streamingSummary = ndjson
      .map(parseEvent)
      .reduce((acc, event) => updateSummary(acc, event), initialSummary);

    const hyloSummary = hylo(
      { lines: ndjson, index: 0 },
      unfoldLine,
      updateSummary,
      initialSummary,
    );

    const logs = [
      "== Streaming fold over NDJSON ==",
      `Events processed: ${ndjson.length}`,
      `Aggregated summary: ${formatSummary(streamingSummary)}`,
      streamingSummary.errors.length > 0
        ? `Errors: ${streamingSummary.errors.join(" | ")}`
        : "Errors: none",
      "== Fused hylo pipeline ==",
      `Aggregated summary: ${formatSummary(hyloSummary)}`,
      hyloSummary.errors.length > 0 ? `Errors: ${hyloSummary.errors.join(" | ")}` : "Errors: none",
      "== Consistency check ==",
      streamingSummary.processed === hyloSummary.processed &&
      streamingSummary.views === hyloSummary.views &&
      streamingSummary.purchases === hyloSummary.purchases &&
      streamingSummary.revenue === hyloSummary.revenue
        ? "✔ Streaming fold matches hylo pipeline"
        : "✘ Summaries diverged",
    ];

    return { logs };
  },
};
