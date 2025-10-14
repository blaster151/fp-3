import type { Lens, Store } from "../../allTS";
import * as AllTS from "../../allTS";
import type { RunnableExample } from "./types";

const {
  StoreComonad,
  storeFromArray,
  collectStore,
  focusStoreWithLens,
  extendThroughLens,
  movingAvg3,
  movingAvgOnField,
} = AllTS;

type TelemetrySeries = {
  readonly name: string;
  readonly series: ReadonlyArray<number>;
  readonly metadata: { readonly units: string; readonly scale: number };
};

type TimeSeriesStore = Store<number, TelemetrySeries>;

function formatSeries(series: ReadonlyArray<number>): string {
  return series.map((value) => value.toFixed(2)).join(", ");
}

export const storeLensFocusedSmoothing: RunnableExample = {
  id: "030b",
  title: "Store–lens focused smoothing",
  outlineReference: 30,
  summary:
    "Blend Store comonad extensions with lenses, derive moving-average telemetry, and compare helper-driven smoothing against manual reconstruction.",
  async run() {
    const telemetry: ReadonlyArray<TelemetrySeries> = [
      {
        name: "temperature",
        series: [20, 22, 25, 30, 28, 24, 21],
        metadata: { units: "°C", scale: 1 },
      },
      {
        name: "humidity",
        series: [60, 65, 70, 75, 72, 68, 63],
        metadata: { units: "%", scale: 1 },
      },
      {
        name: "pressure",
        series: [1013, 1015, 1018, 1020, 1017, 1014, 1012],
        metadata: { units: "hPa", scale: 1 },
      },
    ];

    const telemetryStore: TimeSeriesStore = storeFromArray(telemetry, 0);
    const storeC = StoreComonad<number>();

    const seriesLens: Lens<TelemetrySeries, ReadonlyArray<number>> = {
      get: (entry) => entry.series,
      set: (series) => (entry) => ({ ...entry, series }),
    };

    const movingAverageStore: TimeSeriesStore = storeC.extend<TelemetrySeries, TelemetrySeries>((cursor: TimeSeriesStore) => {
      const entry = cursor.peek(cursor.pos);
      if (!entry) {
        throw new Error("Expected telemetry entry");
      }
      const seriesStore = storeFromArray(entry.series, 0);
      const smoothedSeriesStore = movingAvg3(seriesStore);
      const smoothedSeries = collectStore<number>(entry.series.length)(smoothedSeriesStore);
      return { ...entry, series: smoothedSeries };
    })(telemetryStore);

    const smoothedTelemetry = collectStore<TelemetrySeries>(telemetry.length)(movingAverageStore);

    const focusedStore = focusStoreWithLens<number, TelemetrySeries, ReadonlyArray<number>>(seriesLens)(telemetryStore);

    const lensSmoothedStore = extendThroughLens<number, TelemetrySeries, ReadonlyArray<number>>(seriesLens)(
      (focused: Store<number, ReadonlyArray<number>>) => {
        const series = focused.peek(focused.pos);
        if (!series) {
          throw new Error("Expected focused series");
        }
        const seriesStore = storeFromArray(series, 0);
        const smoothed = movingAvg3(seriesStore);
        return collectStore<number>(series.length)(smoothed);
      },
    )(telemetryStore);

    const lensSmoothedTelemetry = collectStore<TelemetrySeries>(telemetry.length)(lensSmoothedStore);

    const seriesValueLens = (index: number): Lens<TelemetrySeries, number> => ({
      get: (entry) => entry.series[index] ?? entry.series[entry.series.length - 1] ?? 0,
      set: (value) => (entry) => ({
        ...entry,
        series: entry.series.map((current, idx) => (idx === index ? value : current)),
      }),
    });

    let helperStore: TimeSeriesStore = telemetryStore;
    const firstSeries = telemetry[0]?.series ?? [];
    for (let index = 0; index < firstSeries.length; index += 1) {
      helperStore = movingAvgOnField(seriesValueLens(index))(helperStore);
    }
    const helperTelemetry = collectStore<TelemetrySeries>(telemetry.length)(helperStore);

    const manualTelemetry: ReadonlyArray<TelemetrySeries> = telemetry.map((entry) => ({
      ...entry,
      series: entry.series.map((value, index, collection) => {
        const prev = collection[index - 1] ?? value;
        const next = collection[index + 1] ?? value;
        return (prev + value + next) / 3;
      }),
    }));

    const logs: string[] = [];
    logs.push("== Original telemetry ==");
    telemetry.forEach((entry) => {
      logs.push(`${entry.name}: [${formatSeries(entry.series)}] ${entry.metadata.units}`);
    });

    logs.push("\n== Store comonad moving average ==");
    smoothedTelemetry.forEach((entry) => {
      logs.push(`${entry.name}: [${formatSeries(entry.series)}]`);
    });

    logs.push("\n== Lens-preserving smoothing ==");
    lensSmoothedTelemetry.forEach((entry) => {
      logs.push(`${entry.name}: [${formatSeries(entry.series)}] (metadata ${JSON.stringify(entry.metadata)})`);
    });

    const mismatches = lensSmoothedTelemetry.some((entry, idx) => {
      const manual = manualTelemetry[idx]!;
      return entry.series.some((value, seriesIdx) => Math.abs(value - manual.series[seriesIdx]!) > 1e-6);
    });

    logs.push("\n== Helper-driven smoothing ==");
    helperTelemetry.forEach((entry) => {
      logs.push(`${entry.name}: [${formatSeries(entry.series)}]`);
    });

    logs.push("\n== Manual comparison ==");
    logs.push(`Lens smoothing matches manual reconstruction → ${mismatches ? "no" : "yes"}`);
    logs.push(`Focused first series preview → [${formatSeries(focusedStore.peek(0) ?? [])}]`);

    return { logs };
  },
};
