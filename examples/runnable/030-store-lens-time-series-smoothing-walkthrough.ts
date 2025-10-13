import type { RunnableExample } from "./types";
import type { Lens, Store } from "./store";
import {
  collectStore,
  collectStoreFromPositions,
  extendStoreWithLens,
  focusValueStore,
  makeLens,
  storeExtend,
  storeFromArray,
} from "./store";

export const storeLensTimeSeriesSmoothingWalkthrough: RunnableExample = {
  id: "030",
  title: "Store–lens time-series smoothing walkthrough",
  outlineReference: 30,
  summary:
    "Build Stores over nested telemetry records, focus them with lenses to apply moving averages, compare lens-powered smoothing against manual reconstruction, and preserve metadata structure.",
  async run() {
    type TelemetrySeries = {
      readonly name: string;
      readonly series: ReadonlyArray<number>;
      readonly metadata: { readonly units: string; readonly scale: number };
    };

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

    const telemetryStore: Store<number, TelemetrySeries> = storeFromArray(telemetry, 0);

    const seriesLens: Lens<TelemetrySeries, ReadonlyArray<number>> = makeLens(
      (entry) => entry.series,
      (series, entry) => ({ ...entry, series }),
    );

    const metadataLens: Lens<TelemetrySeries, { readonly units: string; readonly scale: number }> = makeLens(
      (entry) => entry.metadata,
      (metadata, entry) => ({ ...entry, metadata }),
    );

    const movingAverage = (series: ReadonlyArray<number>): ReadonlyArray<number> => {
      const seriesStore = storeFromArray<number>(series, 0);
      const averaged = storeExtend(seriesStore, (cursor) => {
        const here = cursor.peek(cursor.pos);
        const prev = cursor.peek(cursor.pos - 1);
        const next = cursor.peek(cursor.pos + 1);
        return (prev + here + next) / 3;
      });
      return collectStore<number>(series.length)(averaged);
    };

    const smoothingWithLens = extendStoreWithLens<number, TelemetrySeries, ReadonlyArray<number>>(seriesLens, (focused) => {
      const series = focused.peek(focused.pos);
      return movingAverage(series);
    });

    const smoothedStore = smoothingWithLens(telemetryStore);
    const smoothedTelemetry = collectStore<TelemetrySeries>(telemetry.length)(smoothedStore);

    const manualTelemetry = telemetry.map((entry) => ({
      ...entry,
      series: entry.series.map((value, index, collection) => {
        const prev = collection[index - 1] ?? value;
        const next = collection[index + 1] ?? value;
        return (prev + value + next) / 3;
      }),
    }));

    const focusedSeriesStore = focusValueStore(seriesLens, telemetryStore);
    const focusedMetadataStore = focusValueStore(metadataLens, telemetryStore);

    const round = (value: number): string => value.toFixed(2);
    const formatSeries = (series: ReadonlyArray<number>): string => series.map(round).join(", ");

    const originalSection = [
      "== Source telemetry ==",
      ...telemetry.map(
        (entry) => `${entry.name}: [${formatSeries(entry.series)}] ${entry.metadata.units}`,
      ),
    ];

    const metadataSummary = collectStoreFromPositions<number, TelemetrySeries["metadata"]>([0, 1, 2])(
      focusedMetadataStore,
    );

    const smoothedSection = [
      "== Store smoothing via lenses ==",
      ...smoothedTelemetry.map((entry) => `${entry.name}: [${formatSeries(entry.series)}]`),
      `Metadata preserved after smoothing → ${metadataSummary
        .map((metadata) => `${metadata.units}@${metadata.scale}`)
        .join(", ")}`,
    ];

    const comparisonSection = (() => {
      const mismatches = smoothedTelemetry.some((entry, index) => {
        const manual = manualTelemetry[index]!;
        return entry.series.some((value, seriesIndex) => {
          const diff = Math.abs(value - manual.series[seriesIndex]!);
          return diff > 1e-6;
        });
      });
      const focusPreview = focusedSeriesStore.peek(0);
      return [
        "== Manual comparison ==",
        `Lens-based smoothing matches manual reconstruction → ${mismatches ? "no" : "yes"}`,
        `Focused preview (temperature series) → [${formatSeries(focusPreview)}]`,
      ];
    })();

    const singleValueLens: Lens<TelemetrySeries, number> = makeLens(
      (entry) => entry.series[3] ?? entry.series[entry.series.length - 1]!,
      (value, entry) => ({
        ...entry,
        series: entry.series.map((current, index) => (index === 3 ? value : current)),
      }),
    );

    const targetedSmoothing = extendStoreWithLens<number, TelemetrySeries, number>(singleValueLens, (focused, cursor) => {
      const series = focusValueStore(seriesLens, cursor).peek(cursor.pos);
      const window = [series[2] ?? series[series.length - 1]!, focused.peek(focused.pos), series[4] ?? series[0]!];
      return window.reduce((total, value) => total + value, 0) / window.length;
    })(telemetryStore);

    const targetedSeries = collectStore<TelemetrySeries>(telemetry.length)(targetedSmoothing);

    const targetedTemperature = targetedSeries[0];

    const targetedSection = [
      "== Targeted lens updates ==",
      `Recomputed fourth temperature reading → ${round(targetedTemperature?.series[3] ?? NaN)}`,
      `Original metadata remains intact → ${JSON.stringify(targetedTemperature?.metadata)}`,
    ];

    return {
      logs: [...originalSection, ...smoothedSection, ...comparisonSection, ...targetedSection],
    };
  },
};
