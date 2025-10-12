import { RunnableExample } from "./types";

declare function require(id: string): any;

type Fin<T> = { readonly elems: ReadonlyArray<T>; readonly eq: (a: T, b: T) => boolean };

type FinMarkov<X, Y> = {
  readonly X: Fin<X>;
  readonly Y: Fin<Y>;
  readonly k: (x: X) => Map<Y, number>;
  then<Z>(that: FinMarkov<Y, Z>): FinMarkov<X, Z>;
};

type CSRig<R> = {
  readonly zero: R;
  readonly one: R;
  add(a: R, b: R): R;
  mul(a: R, b: R): R;
  eq(a: R, b: R): boolean;
};

type Dist<R, X> = { readonly R: CSRig<R>; readonly w: Map<X, R> };

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean) => Fin<T>;
  readonly detK: <X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y) => FinMarkov<X, Y>;
  readonly FinMarkov: new <X, Y>(X: Fin<X>, Y: Fin<Y>, k: (x: X) => Map<Y, number>) => FinMarkov<X, Y>;
};

type MarkovAlmostSureWitness<A, X, Y> = {
  readonly prior: FinMarkov<A, X>;
  readonly left: FinMarkov<X, Y>;
  readonly right: FinMarkov<X, Y>;
  readonly label?: string;
};

type MarkovAlmostSureModule = {
  readonly buildMarkovAlmostSureWitness: <A, X, Y>(
    prior: FinMarkov<A, X>,
    left: FinMarkov<X, Y>,
    right: FinMarkov<X, Y>,
    options?: { readonly label?: string },
  ) => MarkovAlmostSureWitness<A, X, Y>;
  readonly checkAlmostSureEquality: <A, X, Y>(
    witness: MarkovAlmostSureWitness<A, X, Y>,
    options?: { readonly tolerance?: number },
  ) => {
    readonly holds: boolean;
    readonly support: ReadonlyArray<{
      readonly value: X;
      readonly totalMass: number;
      readonly contributions: ReadonlyArray<{ readonly input: A; readonly weight: number }>;
    }>;
    readonly failures: ReadonlyArray<{
      readonly supportPoint: X;
      readonly sources: ReadonlyArray<A>;
      readonly differences: ReadonlyArray<{ readonly value: Y; readonly left: number; readonly right: number }>;
    }>;
    readonly leftComposite: FinMarkov<A, Y>;
    readonly rightComposite: FinMarkov<A, Y>;
    readonly composite?: FinMarkov<A, Y>;
    readonly equalComposite: boolean;
    readonly details: string;
  };
};

type ASEqualityModule = {
  readonly testSamplingCancellationDetailed: <R, A, X>(
    R: CSRig<R>,
    Avals: ReadonlyArray<A>,
    fsharp: (a: A) => Dist<R, X>,
    gsharp: (a: A) => Dist<R, X>,
    samp: (d: Dist<R, X>) => X,
    nullMask?: (x: X) => boolean,
  ) => {
    readonly samplingEqual: boolean;
    readonly distributionsEqual: boolean;
    readonly cancellationHolds: boolean;
    readonly details: string;
  };
  readonly samplingCancellation: <R, A, X>(
    R: CSRig<R>,
    Avals: ReadonlyArray<A>,
    fsharp: (a: A) => Dist<R, X>,
    gsharp: (a: A) => Dist<R, X>,
    samp: (d: Dist<R, X>) => X,
    nullMask?: (x: X) => boolean,
  ) => boolean;
  readonly createNullMask: <X>(values: ReadonlyArray<X>) => (x: X) => boolean;
};

type SemiringModule = {
  readonly Prob: CSRig<number>;
};

const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const markovAlmostSure = require("../../markov-almost-sure") as MarkovAlmostSureModule;
const asEquality = require("../../as-equality") as ASEqualityModule;
const semiringUtils = require("../../semiring-utils") as SemiringModule;

const { mkFin, FinMarkov } = markovCategory;
const { buildMarkovAlmostSureWitness, checkAlmostSureEquality } = markovAlmostSure;
const { testSamplingCancellationDetailed, samplingCancellation, createNullMask } = asEquality;
const { Prob } = semiringUtils;

type Scenario = "baseline" | "stress";
type Channel = "stable" | "noisy" | "offline";
type Observation = "ok" | "alert" | "offline";

type Transcript = ReadonlyArray<string>;

const formatProbability = (value: number): string => value.toFixed(2);

const describeDistribution = <Y>(dist: Map<Y, number>): string => {
  const entries = Array.from(dist.entries());
  if (entries.length === 0) return "(empty)";
  return entries
    .map(([value, weight]) => `${String(value)}↦${formatProbability(weight)}`)
    .join(", ");
};

const describeBoolean = (value: boolean): string => (value ? "yes" : "no");

function almostSureEqualitySection(): Transcript {
  const Scenarios = mkFin<Scenario>(["baseline", "stress"], (a, b) => a === b);
  const Channels = mkFin<Channel>(["stable", "noisy", "offline"], (a, b) => a === b);
  const Observations = mkFin<Observation>(["ok", "alert", "offline"], (a, b) => a === b);

  const prior = new FinMarkov<Scenario, Channel>(Scenarios, Channels, (scenario) =>
    scenario === "baseline"
      ? new Map<Channel, number>([
          ["stable", 0.8],
          ["noisy", 0.2],
        ])
      : new Map<Channel, number>([
          ["stable", 0.55],
          ["noisy", 0.45],
        ]),
  );

  const calibrated = new FinMarkov<Channel, Observation>(Channels, Observations, (channel) => {
    switch (channel) {
      case "stable":
        return new Map<Observation, number>([["ok", 1]]);
      case "noisy":
        return new Map<Observation, number>([
          ["ok", 0.25],
          ["alert", 0.75],
        ]);
      case "offline":
        return new Map<Observation, number>([["offline", 1]]);
    }
  });

  const mislabelled = new FinMarkov<Channel, Observation>(Channels, Observations, (channel) => {
    if (channel === "offline") {
      return new Map<Observation, number>([["alert", 1]]);
    }
    return calibrated.k(channel);
  });

  const witness = buildMarkovAlmostSureWitness(prior, calibrated, mislabelled, {
    label: "sensor alignment",
  });
  const report = checkAlmostSureEquality(witness);

  const supportLines = report.support.map((record) => {
    const sources = record.contributions
      .map((entry) => `${String(entry.input)}↦${formatProbability(entry.weight)}`)
      .join(", ");
    return `  ${String(record.value)} • mass=${formatProbability(record.totalMass)} via { ${sources} }`;
  });

  const compositeLines = Scenarios.elems.map((scenario) => {
    const left = report.leftComposite.k(scenario);
    const right = report.rightComposite.k(scenario);
    return `  ${scenario}: left=${describeDistribution(left)} | right=${describeDistribution(right)}`;
  });

  return [
    "== Almost-sure equality under offline-masked prior ==",
    `Witness label: ${report.details}`,
    `Holds: ${describeBoolean(report.holds)} (composite equality=${describeBoolean(report.equalComposite)})`,
    "Support summary:",
    ...supportLines,
    "Composite distributions:",
    ...compositeLines,
  ];
}

function almostSureFailureSection(): Transcript {
  const Scenarios = mkFin<Scenario>(["baseline", "stress"], (a, b) => a === b);
  const Channels = mkFin<Channel>(["stable", "noisy", "offline"], (a, b) => a === b);
  const Observations = mkFin<Observation>(["ok", "alert", "offline"], (a, b) => a === b);

  const prior = new FinMarkov<Scenario, Channel>(Scenarios, Channels, (scenario) =>
    scenario === "baseline"
      ? new Map<Channel, number>([
          ["stable", 0.7],
          ["noisy", 0.25],
          ["offline", 0.05],
        ])
      : new Map<Channel, number>([
          ["stable", 0.4],
          ["noisy", 0.4],
          ["offline", 0.2],
        ]),
  );

  const calibrated = new FinMarkov<Channel, Observation>(Channels, Observations, (channel) => {
    switch (channel) {
      case "stable":
        return new Map<Observation, number>([["ok", 1]]);
      case "noisy":
        return new Map<Observation, number>([
          ["ok", 0.2],
          ["alert", 0.8],
        ]);
      case "offline":
        return new Map<Observation, number>([["offline", 1]]);
    }
  });

  const drifted = new FinMarkov<Channel, Observation>(Channels, Observations, (channel) => {
    if (channel === "noisy") {
      return new Map<Observation, number>([
        ["ok", 0.6],
        ["alert", 0.4],
      ]);
    }
    return calibrated.k(channel);
  });

  const witness = buildMarkovAlmostSureWitness(prior, calibrated, drifted, {
    label: "calibration drift",
  });
  const report = checkAlmostSureEquality(witness);

  const failureLines = report.failures.flatMap((failure, index) => {
    const sources = failure.sources.map((source) => String(source)).join(", ");
    const differences = failure.differences
      .map((difference) =>
        `${String(difference.value)}: left=${formatProbability(difference.left)} vs right=${formatProbability(
          difference.right,
        )}`,
      )
      .join("; ");
    return [
      `  ✗ Failure ${index + 1} at ${String(failure.supportPoint)} from { ${sources} }`,
      `    Differences: ${differences}`,
    ];
  });

  return [
    "== Detected almost-sure equality failure when noisy channel shifts ==",
    `Holds: ${describeBoolean(report.holds)} (composite equality=${describeBoolean(report.equalComposite)})`,
    "Failures:",
    ...failureLines,
  ];
}

function argmaxObservation(dist: Dist<number, Observation>): Observation {
  let best: { value: Observation; weight: number } | undefined;
  dist.w.forEach((weight, value) => {
    if (!best || weight > best.weight) {
      best = { value, weight };
    }
  });
  if (!best) {
    throw new Error("Distribution has no support");
  }
  return best.value;
}

function samplingCancellationSection(): Transcript {
  const inputs: ReadonlyArray<"baseline" | "stress"> = ["baseline", "stress"];

  const fsharp = (input: "baseline" | "stress"): Dist<number, Observation> =>
    input === "baseline"
      ? {
          R: Prob,
          w: new Map<Observation, number>([
            ["ok", 0.92],
            ["alert", 0.03],
            ["offline", 0.05],
          ]),
        }
      : {
          R: Prob,
          w: new Map<Observation, number>([
            ["ok", 0.35],
            ["alert", 0.55],
            ["offline", 0.10],
          ]),
        };

  const gsharp = (input: "baseline" | "stress"): Dist<number, Observation> =>
    input === "baseline"
      ? {
          R: Prob,
          w: new Map<Observation, number>([
            ["ok", 0.92],
            ["alert", 0.08],
          ]),
        }
      : {
          R: Prob,
          w: new Map<Observation, number>([
            ["ok", 0.35],
            ["alert", 0.55],
            ["offline", 0.10],
          ]),
        };

  const mask = createNullMask<Observation>(["offline"]);

  const rawReport = testSamplingCancellationDetailed(Prob, inputs, fsharp, gsharp, argmaxObservation);
  const maskedReport = testSamplingCancellationDetailed(Prob, inputs, fsharp, gsharp, argmaxObservation, mask);
  const maskedCancellation = samplingCancellation(Prob, inputs, fsharp, gsharp, argmaxObservation, mask);

  const describeReport = (label: string, report: ReturnType<typeof testSamplingCancellationDetailed>): string =>
    `${label}: sampling=${describeBoolean(report.samplingEqual)}, distributions=${describeBoolean(
      report.distributionsEqual,
    )}, cancellation=${describeBoolean(report.cancellationHolds)} (${report.details})`;

  const baselineLeft = describeDistribution(fsharp("baseline").w);
  const baselineRight = describeDistribution(gsharp("baseline").w);

  return [
    "== Sampling cancellation with and without null-mask for offline alarm ==",
    describeReport("Without null mask", rawReport),
    describeReport("Null mask on offline", maskedReport),
    `Cancellation oracle verdict with mask: ${describeBoolean(maskedCancellation)}`,
    `Baseline distributions: f#=${baselineLeft} vs g#=${baselineRight}`,
  ];
}

export const stage065AlmostSureEqualityAndSamplingCancellation: RunnableExample = {
  id: "065",
  title: "Almost-sure equality and sampling cancellation",
  outlineReference: 65,
  summary:
    "Construct witnesses for p-almost-sure equality, compare sample-based equality, and bridge cancellation oracles across deterministic and stochastic morphisms.",
  async run() {
    const sections: ReadonlyArray<Transcript> = [
      almostSureEqualitySection(),
      [""],
      almostSureFailureSection(),
      [""],
      samplingCancellationSection(),
    ];

    const logs = sections.flatMap((section, index) =>
      index === sections.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
