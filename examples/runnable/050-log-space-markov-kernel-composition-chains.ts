import { RunnableExample } from "./types";

declare function require(id: string): any;

type Fin<T> = { readonly elems: ReadonlyArray<T> };
type Kernel<X, Y> = (x: X) => Map<Y, number>;

type LogProbChainsModule = {
  readonly composeLogK: <X, Y, Z>(f: Kernel<X, Y>, g: Kernel<Y, Z>) => Kernel<X, Z>;
  readonly nStepLog: <X>(
    fin: Fin<X>,
    step: Kernel<X, X>,
    steps: number,
    initialLog: ReadonlyArray<[X, number]>,
  ) => Map<X, number>;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>) => Fin<T>;
};

type SemiringDistModule = {
  readonly LogProb: unknown;
  readonly normalizeR: <T>(rig: unknown, dist: Map<T, number>) => Map<T, number>;
};

const logProbChains = require("../../logprob-chains") as LogProbChainsModule;
const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const semiringDist = require("../../semiring-dist") as SemiringDistModule;

const { composeLogK, nStepLog } = logProbChains;
const { mkFin } = markovCategory;
const { LogProb, normalizeR } = semiringDist;

type WeatherState = "sunny" | "cloudy" | "storm";

type DistributionFormatter<S> = (dist: Map<S, number>) => readonly string[];

type HorizonSummary<S> = { readonly steps: number; readonly distribution: Map<S, number> };

type KernelDescriptor<S> = readonly string[];

type KernelSummary<S> = (name: string, kernel: Kernel<S, S>) => KernelDescriptor<S>;

const Weather = mkFin<WeatherState>(["sunny", "cloudy", "storm"]);

function normalizeLogRow<S extends string>(row: Record<S, number>): Map<S, number> {
  const base = new Map<S, number>();
  (Object.keys(row) as S[]).forEach((key) => {
    const probability = row[key];
    const logValue = probability <= 0 ? -Infinity : Math.log(probability);
    base.set(key, logValue);
  });
  return normalizeR(LogProb, base);
}

const morningKernel: Kernel<WeatherState, WeatherState> = (state) => {
  switch (state) {
    case "sunny":
      return normalizeLogRow({ sunny: 0.82, cloudy: 0.15, storm: 0.03 });
    case "cloudy":
      return normalizeLogRow({ sunny: 0.32, cloudy: 0.5, storm: 0.18 });
    case "storm":
      return normalizeLogRow({ sunny: 0.1, cloudy: 0.24, storm: 0.66 });
    default:
      return normalizeLogRow({ sunny: 1, cloudy: 0, storm: 0 });
  }
};

const eveningKernel: Kernel<WeatherState, WeatherState> = (state) => {
  switch (state) {
    case "sunny":
      return normalizeLogRow({ sunny: 0.76, cloudy: 0.19, storm: 0.05 });
    case "cloudy":
      return normalizeLogRow({ sunny: 0.28, cloudy: 0.48, storm: 0.24 });
    case "storm":
      return normalizeLogRow({ sunny: 0.12, cloudy: 0.28, storm: 0.6 });
    default:
      return normalizeLogRow({ sunny: 1, cloudy: 0, storm: 0 });
  }
};

const dailyKernel = composeLogK(morningKernel, eveningKernel);

const formatLogDistribution: DistributionFormatter<WeatherState> = (dist) =>
  Weather.elems.map((state) => {
    const logWeight = dist.get(state) ?? -Infinity;
    const logDisplay = logWeight === -Infinity ? "-∞" : logWeight.toFixed(3);
    const probability = logWeight === -Infinity ? 0 : Math.exp(logWeight);
    const probDisplay = probability.toFixed(3);
    return `    ${state.padEnd(6, " ")} log=${logDisplay} prob=${probDisplay}`;
  });

const describeKernel: KernelSummary<WeatherState> = (name, kernel) => {
  const sections = Weather.elems.map((state) => {
    const rows = formatLogDistribution(kernel(state));
    return [`  ${state} ▷`, ...rows];
  });

  const flattened = sections.flatMap((section, index, array) =>
    index === array.length - 1 ? section : [...section, ""],
  );

  return [`== ${name} ==`, ...flattened];
};

function summarizeHorizon(steps: number, distribution: Map<WeatherState, number>): readonly string[] {
  const rows = formatLogDistribution(distribution);
  const mass = Array.from(distribution.values()).reduce((sum, logWeight) => sum + Math.exp(logWeight), 0);
  return [
    `${steps.toString().padStart(2, "0")}-step forecast (log domain normalised)`,
    ...rows,
    `    Mass check Σp ≈ ${mass.toFixed(3)}`,
  ];
}

function describeForecasts(): readonly string[] {
  const initialLog: ReadonlyArray<[WeatherState, number]> = [
    ["sunny", Math.log(0.9)],
    ["cloudy", Math.log(0.09)],
    ["storm", Math.log(0.01)],
  ];

  const horizons: ReadonlyArray<HorizonSummary<WeatherState>> = [1, 3, 7, 14].map((steps) => ({
    steps,
    distribution: nStepLog(Weather, dailyKernel, steps, initialLog),
  }));

  const sections = horizons.map((horizon) => summarizeHorizon(horizon.steps, horizon.distribution));
  const flattened = sections.flatMap((section, index, array) =>
    index === array.length - 1 ? section : [...section, ""],
  );

  return ["== n-step forecasts via nStepLog ==", ...flattened];
}

function describeLogSpaceStability(): readonly string[] {
  const longHorizon = 48;
  const initialLog: ReadonlyArray<[WeatherState, number]> = [
    ["sunny", Math.log(0.9)],
    ["cloudy", Math.log(0.09)],
    ["storm", Math.log(0.01)],
  ];
  const distribution = nStepLog(Weather, dailyKernel, longHorizon, initialLog);
  const rows = formatLogDistribution(distribution);
  const smallestLog = Math.min(...Array.from(distribution.values()));
  const minDisplay = smallestLog === -Infinity ? "-∞" : smallestLog.toFixed(3);
  return [
    "== Long-horizon stability check ==",
    `48-step forecast retains normalised support (smallest log weight ${minDisplay})`,
    ...rows,
  ];
}

export const stage050LogSpaceMarkovKernelCompositionChains: RunnableExample = {
  id: "050",
  title: "Log-space Markov kernel composition chains",
  outlineReference: 50,
  summary:
    "Compose morning and evening weather kernels via log-sum-exp, then iterate the fused daily kernel with numerically stable n-step forecasts.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      describeKernel("Morning half-day kernel", morningKernel),
      describeKernel("Evening half-day kernel", eveningKernel),
      describeKernel("Composed daily kernel", dailyKernel),
      describeForecasts(),
      describeLogSpaceStability(),
    ];

    const logs = sections.flatMap((section, index, array) =>
      index === array.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
