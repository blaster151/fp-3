import { RunnableExample } from "./types";
import { canonicalKey } from "./json-canonical";

type Signal = "visits" | "orders";

type StreamingEvent = {
  readonly tick: number;
  readonly region: string;
  readonly signal: Signal;
  readonly count: number;
  readonly latencyMs: number;
};

type GroupMetrics = {
  readonly canonicalRegion: string;
  readonly representative: string;
  readonly eventCount: number;
  readonly totalUnits: number;
  readonly totalsBySignal: { readonly visits: number; readonly orders: number };
  readonly totalLatency: number;
  readonly minLatency: number;
  readonly maxLatency: number;
};

type HighLatencyRecord = {
  readonly canonicalRegion: string;
  readonly representative: string;
  readonly signal: Signal;
  readonly latencyMs: number;
};

type StreamingState = {
  readonly groups: Map<string, GroupMetrics>;
  readonly highLatency: readonly HighLatencyRecord[];
};

const events: readonly StreamingEvent[] = [
  { tick: 1, region: "North", signal: "visits", count: 120, latencyMs: 420 },
  { tick: 2, region: "north", signal: "orders", count: 4, latencyMs: 810 },
  { tick: 3, region: "West", signal: "visits", count: 90, latencyMs: 510 },
  { tick: 4, region: "south", signal: "visits", count: 70, latencyMs: 330 },
  { tick: 5, region: "WEST", signal: "orders", count: 3, latencyMs: 940 },
  { tick: 6, region: "North", signal: "visits", count: 110, latencyMs: 480 },
  { tick: 7, region: "South", signal: "orders", count: 2, latencyMs: 560 },
  { tick: 8, region: "north", signal: "orders", count: 1, latencyMs: 390 },
  { tick: 9, region: "west", signal: "visits", count: 95, latencyMs: 350 },
  { tick: 10, region: "SOUTH", signal: "visits", count: 60, latencyMs: 780 },
] as const;

const lowercase = (value: string): string => value.trim().toLowerCase();

function canonicalRegion(value: string): { readonly key: string; readonly representative: string } {
  const representative = lowercase(value);
  return { key: canonicalKey(representative), representative };
}

const initialState: StreamingState = {
  groups: new Map(),
  highLatency: [],
};

function ingestEvent(state: StreamingState, event: StreamingEvent): StreamingState {
  const { key, representative } = canonicalRegion(event.region);
  const groups = new Map(state.groups);
  const previous = groups.get(key);

  const totalsBySignal = previous
    ? previous.totalsBySignal
    : { visits: 0, orders: 0 };

  const nextTotals: { readonly visits: number; readonly orders: number } =
    event.signal === "visits"
      ? { visits: totalsBySignal.visits + event.count, orders: totalsBySignal.orders }
      : { visits: totalsBySignal.visits, orders: totalsBySignal.orders + event.count };

  const nextMetrics: GroupMetrics = previous
    ? {
        canonicalRegion: previous.canonicalRegion,
        representative: previous.representative,
        eventCount: previous.eventCount + 1,
        totalUnits: previous.totalUnits + event.count,
        totalsBySignal: nextTotals,
        totalLatency: previous.totalLatency + event.latencyMs,
        minLatency: Math.min(previous.minLatency, event.latencyMs),
        maxLatency: Math.max(previous.maxLatency, event.latencyMs),
      }
    : {
        canonicalRegion: key,
        representative,
        eventCount: 1,
        totalUnits: event.count,
        totalsBySignal: nextTotals,
        totalLatency: event.latencyMs,
        minLatency: event.latencyMs,
        maxLatency: event.latencyMs,
      };

  groups.set(key, nextMetrics);

  const isHighLatency = event.latencyMs >= 750;
  const highLatency = isHighLatency
    ? [...state.highLatency, { canonicalRegion: key, representative, signal: event.signal, latencyMs: event.latencyMs }]
    : state.highLatency;

  return { groups, highLatency };
}

function summarizeMetrics(metrics: GroupMetrics): string {
  const averageLatency = metrics.totalLatency / metrics.eventCount;
  return [
    `${metrics.representative}`,
    `events=${metrics.eventCount}`,
    `units=${metrics.totalUnits}`,
    `visits=${metrics.totalsBySignal.visits}`,
    `orders=${metrics.totalsBySignal.orders}`,
    `latency[min=${metrics.minLatency}ms, max=${metrics.maxLatency}ms, avg=${averageLatency.toFixed(1)}ms]`,
  ].join(", ");
}

function describeHighLatency(records: readonly HighLatencyRecord[]): string[] {
  if (records.length === 0) {
    return ["(none)"];
  }
  return records.map(
    (record) =>
      `${record.representative} ${record.signal} latency=${record.latencyMs}ms (key=${record.canonicalRegion})`,
  );
}

export const streamingAnalyticsOverCanonicalGroups: RunnableExample = {
  id: "016",
  title: "Streaming analytics over canonical groups",
  outlineReference: 16,
  summary:
    "Online reducers compute canonical minima/maxima, signal-specific totals, and latency alerts per region without materializing the full stream.",
  async run() {
    let state = initialState;
    let logs: readonly string[] = ["== Streaming ingestion over canonical regions =="];

    events.forEach((event) => {
      state = ingestEvent(state, event);
      const { key } = canonicalRegion(event.region);
      const metrics = state.groups.get(key);
      if (!metrics) {
        return;
      }
      logs = [
        ...logs,
        `tick ${event.tick}: ${lowercase(event.region)} ${event.signal} count=${event.count} latency=${event.latencyMs}ms`,
        `  ↳ ${summarizeMetrics(metrics)}`,
      ];
    });

    const finalSummaries = Array.from(state.groups.values()).sort((left, right) =>
      left.canonicalRegion.localeCompare(right.canonicalRegion),
    );

    logs = [
      ...logs,
      "== Final canonical summaries ==",
      ...finalSummaries.map((metrics) => summarizeMetrics(metrics)),
      "== High latency events (filtered stream) ==",
      ...describeHighLatency(state.highLatency),
    ];

    return { logs };
  },
};
