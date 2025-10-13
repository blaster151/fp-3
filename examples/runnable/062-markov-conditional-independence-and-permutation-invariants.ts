import type { RunnableExample } from "./types";

declare function require(id: string): any;

type Fin<T> = { readonly elems: ReadonlyArray<T>; readonly eq: (a: T, b: T) => boolean };

type Pair<X, Y> = readonly [X, Y];

type FinMarkov<X, Y> = {
  readonly X: Fin<X>;
  readonly Y: Fin<Y>;
  readonly k: (x: X) => Map<Y, number>;
  then<Z>(that: FinMarkov<Y, Z>): FinMarkov<X, Z>;
  matrix(): number[][];
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean) => Fin<T>;
  readonly tensorObj: <X, Y>(X: Fin<X>, Y: Fin<Y>) => Fin<Pair<X, Y>>;
  readonly detK: <X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y) => FinMarkov<X, Y>;
  readonly FinMarkov: new <X, Y>(X: Fin<X>, Y: Fin<Y>, k: (x: X) => Map<Y, number>) => FinMarkov<X, Y>;
  readonly deterministic: <X, Y>(f: (x: X) => Y) => (x: X) => Map<Y, number>;
};

type MarkovComonoidWitness<X> = { readonly object: Fin<X>; readonly label?: string };

type MarkovComonoidModule = {
  readonly buildMarkovComonoidWitness: <X>(object: Fin<X>, options?: { readonly label?: string }) => MarkovComonoidWitness<X>;
};

type ConditionalWitness<A> = {
  readonly domain: MarkovComonoidWitness<A>;
  readonly outputs: ReadonlyArray<MarkovComonoidWitness<any>>;
  readonly arrow: FinMarkov<A, any>;
  readonly label?: string;
  readonly arity: number;
};

type ConditionalFailure = { readonly law: string; readonly message: string };

type ConditionalPermutationReport = {
  readonly permutation: ReadonlyArray<number>;
  readonly holds: boolean;
  readonly details: string;
};

type ConditionalReport<A> = {
  readonly holds: boolean;
  readonly equality: boolean;
  readonly failures: ReadonlyArray<ConditionalFailure>;
  readonly permutations: ReadonlyArray<ConditionalPermutationReport>;
};

type ConditionalModule = {
  readonly buildMarkovConditionalWitness: <A>(
    domain: MarkovComonoidWitness<A>,
    outputs: ReadonlyArray<MarkovComonoidWitness<any>>,
    arrow: FinMarkov<A, any>,
    options?: { readonly label?: string },
  ) => ConditionalWitness<A>;
  readonly checkConditionalIndependence: <A>(
    witness: ConditionalWitness<A>,
    options?: { readonly permutations?: ReadonlyArray<ReadonlyArray<number>> },
  ) => ConditionalReport<A>;
};

type FiniteSymmetry<XJ> = {
  readonly name: string;
  readonly kind?: "permutation" | "injection";
  readonly sigmaHat: FinMarkov<XJ, XJ>;
};

type PermutationReport<A, XJ, T> = {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<string>;
  readonly symmetryReports: ReadonlyArray<{
    readonly name: string;
    readonly priorInvariant: boolean;
    readonly statReport: { readonly holds: boolean; readonly details: string };
  }>;
};

type PermutationModule = {
  readonly checkFinitePermutationInvariance: <A, XJ, T>(
    p: FinMarkov<A, XJ>,
    s: FinMarkov<XJ, T>,
    perms: ReadonlyArray<FiniteSymmetry<XJ>>,
    options?: { readonly tolerance?: number },
  ) => PermutationReport<A, XJ, T>;
};

const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const markovComonoids = require("../../markov-comonoid-structure") as MarkovComonoidModule;
const markovConditional = require("../../markov-conditional-independence") as ConditionalModule;
const markovPermutation = require("../../markov-permutation") as PermutationModule;

const { mkFin, tensorObj, FinMarkov, detK, deterministic } = markovCategory;
const { buildMarkovComonoidWitness } = markovComonoids;
const { buildMarkovConditionalWitness, checkConditionalIndependence } = markovConditional;
const { checkFinitePermutationInvariance } = markovPermutation;

const asTranscript = (lines: ReadonlyArray<string>): ReadonlyArray<string> => lines;

const describeBoolean = (value: boolean): string => (value ? "yes" : "no");

function summarizeFailures(failures: ReadonlyArray<ConditionalFailure>): string {
  if (failures.length === 0) return "no failures";
  return failures.map((failure) => `${failure.law}: ${failure.message}`).join("; ");
}

function independentFactorisationSection(): readonly string[] {
  type Context = "baseline" | "calibrated";
  type Sensor = "stable" | "unstable";
  type Bias = "low" | "high";

  const Contexts = mkFin<Context>(["baseline", "calibrated"], (a, b) => a === b);
  const Sensors = mkFin<Sensor>(["stable", "unstable"], (a, b) => a === b);
  const Biases = mkFin<Bias>(["low", "high"], (a, b) => a === b);

  const contextWitness = buildMarkovComonoidWitness(Contexts, { label: "Context" });
  const sensorWitness = buildMarkovComonoidWitness(Sensors, { label: "Sensor" });
  const biasWitness = buildMarkovComonoidWitness(Biases, { label: "Bias" });

  const sensorChannel = detK(Contexts, Sensors, (context) =>
    context === "baseline" ? "stable" : "unstable",
  );

  const biasChannel = new FinMarkov<Context, Bias>(
    Contexts,
    Biases,
    (context) =>
      context === "baseline"
        ? new Map<Bias, number>([
            ["low", 0.65],
            ["high", 0.35],
          ])
        : new Map<Bias, number>([
            ["low", 0.25],
            ["high", 0.75],
          ]),
  );

  const product = tensorObj(Sensors, Biases);
  const joint = new FinMarkov<Context, Pair<Sensor, Bias>>(
    Contexts,
    product,
    (context) => {
      const dist = new Map<Pair<Sensor, Bias>, number>();
      const sensorDist = sensorChannel.k(context);
      const biasDist = biasChannel.k(context);
      for (const [sensor, ps] of sensorDist) {
        for (const [bias, pb] of biasDist) {
          const weight = ps * pb;
          if (weight === 0) continue;
          const key: Pair<Sensor, Bias> = [sensor, bias];
          dist.set(key, (dist.get(key) ?? 0) + weight);
        }
      }
      return dist;
    },
  );

  const witness = buildMarkovConditionalWitness(
    contextWitness,
    [sensorWitness, biasWitness],
    joint,
    { label: "independent diagnostics" },
  );

  const report = checkConditionalIndependence(witness, { permutations: [[1, 0]] });

  const permutationLines = report.permutations.map((permutation, index) =>
    `  σ${index + 1}=[${permutation.permutation.join(", ")}]: ${
      permutation.holds ? "preserved" : "violated"
    } (${permutation.details})`,
  );

  return asTranscript([
    "== Conditional independence for factorised sensor/bias outputs ==",
    `Holds: ${describeBoolean(report.holds)} (matrix equality=${describeBoolean(report.equality)})`,
    `Failures: ${summarizeFailures(report.failures)}`,
    "Permutation diagnostics:",
    ...permutationLines,
  ]);
}

function correlatedViolationSection(): readonly string[] {
  type Context = "baseline" | "calibrated";
  type Sensor = "stable" | "unstable";
  type Bias = "low" | "high";

  const Contexts = mkFin<Context>(["baseline", "calibrated"], (a, b) => a === b);
  const Sensors = mkFin<Sensor>(["stable", "unstable"], (a, b) => a === b);
  const Biases = mkFin<Bias>(["low", "high"], (a, b) => a === b);

  const contextWitness = buildMarkovComonoidWitness(Contexts, { label: "Context" });
  const sensorWitness = buildMarkovComonoidWitness(Sensors, { label: "Sensor" });
  const biasWitness = buildMarkovComonoidWitness(Biases, { label: "Bias" });

  const correlated = new FinMarkov<Context, Pair<Sensor, Bias>>(
    Contexts,
    tensorObj(Sensors, Biases),
    (context) =>
      context === "baseline"
        ? new Map<Pair<Sensor, Bias>, number>([
            [["stable", "low"] as const, 0.6],
            [["unstable", "high"] as const, 0.4],
          ])
        : new Map<Pair<Sensor, Bias>, number>([
            [["stable", "low"] as const, 0.2],
            [["unstable", "high"] as const, 0.8],
          ]),
  );

  const witness = buildMarkovConditionalWitness(
    contextWitness,
    [sensorWitness, biasWitness],
    correlated,
    { label: "correlated sensors" },
  );

  const report = checkConditionalIndependence(witness, { permutations: [[1, 0]] });
  const firstFailure = report.failures[0]?.message ?? "no failure recorded";

  return asTranscript([
    "== Correlated outputs violating conditional independence ==",
    `Holds: ${describeBoolean(report.holds)} (matrix equality=${describeBoolean(report.equality)})`,
    `Recorded failures: ${summarizeFailures(report.failures)}`,
    `Permutation summary: ${report.permutations[0]?.details ?? "no permutation evaluated"}`,
    `First diagnostic: ${firstFailure}`,
  ]);
}

function formatPermutationReport<A, XJ, T>(label: string, report: PermutationReport<A, XJ, T>): readonly string[] {
  const failureSummary = report.failures.length === 0 ? "none" : report.failures.join("; ");
  const symmetryLines = report.symmetryReports.map((entry) =>
    `  ${entry.name}: prior=${describeBoolean(entry.priorInvariant)} stat=${describeBoolean(entry.statReport.holds)} (${entry.statReport.details})`,
  );

  return [
    `${label}: overall=${describeBoolean(report.holds)} failures=${failureSummary}`,
    ...symmetryLines,
  ];
}

function permutationInvarianceSection(): readonly string[] {
  type Axis = 0 | 1;
  type PairAxis = Pair<Axis, Axis>;
  type Verdict = "match" | "mismatch";
  type Anchor = "baseline";

  const AnchorFin = mkFin<Anchor>(["baseline"], (a, b) => a === b);
  const AxisFin = mkFin<Axis>([0, 1], (a, b) => a === b);
  const PairFin = tensorObj(AxisFin, AxisFin);
  const VerdictFin = mkFin<Verdict>(["match", "mismatch"], (a, b) => a === b);

  const uniformJoint = new FinMarkov(AnchorFin, PairFin, () =>
    new Map<PairAxis, number>([
      [[0, 0] as const, 0.25],
      [[0, 1] as const, 0.25],
      [[1, 0] as const, 0.25],
      [[1, 1] as const, 0.25],
    ]),
  );

  const skewedJoint = new FinMarkov(AnchorFin, PairFin, () =>
    new Map<PairAxis, number>([
      [[0, 0] as const, 0.6],
      [[0, 1] as const, 0.2],
      [[1, 0] as const, 0.15],
      [[1, 1] as const, 0.05],
    ]),
  );

  const symmetricStatistic = detK(PairFin, VerdictFin, ([sensor, bias]) =>
    sensor === bias ? "match" : "mismatch",
  );

  const biasedStatistic = detK(PairFin, VerdictFin, ([sensor]) => (sensor === 1 ? "match" : "mismatch"));

  const swap = new FinMarkov(
    PairFin,
    PairFin,
    deterministic<PairAxis, PairAxis>(([sensor, bias]) => [bias, sensor]),
  );

  const permutations: ReadonlyArray<FiniteSymmetry<PairAxis>> = [
    { name: "swap", kind: "permutation", sigmaHat: swap },
  ];

  const uniformReport = checkFinitePermutationInvariance(uniformJoint, symmetricStatistic, permutations);
  const skewedReport = checkFinitePermutationInvariance(skewedJoint, symmetricStatistic, permutations);
  const biasedStatisticReport = checkFinitePermutationInvariance(uniformJoint, biasedStatistic, permutations);

  return asTranscript([
    "== Permutation invariance across symmetric and skewed priors ==",
    ...formatPermutationReport("Uniform prior + symmetric statistic", uniformReport),
    ...formatPermutationReport("Skewed prior + symmetric statistic", skewedReport),
    ...formatPermutationReport("Uniform prior + biased statistic", biasedStatisticReport),
  ]);
}

export const stage062MarkovConditionalIndependenceAndPermutationInvariants: RunnableExample = {
  id: "062",
  title: "Markov conditional independence and permutation invariants",
  outlineReference: 62,
  summary:
    "Reconstruct conditional factorizations, detect correlated outputs, and exercise permutation-invariance diagnostics for symmetric and skewed kernels.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      independentFactorisationSection(),
      [""],
      correlatedViolationSection(),
      [""],
      permutationInvarianceSection(),
    ];

    const logs = sections.flatMap((section, index) =>
      index === sections.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
