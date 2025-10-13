import type { RunnableExample } from "./types";

declare function require(id: string): any;

type Kernel<X, Y> = (x: X) => Map<Y, number>;

type Monoid<G> = {
  readonly empty: G;
  readonly concat: (a: G, b: G) => G;
  readonly equals?: (a: G, b: G) => boolean;
};

type GradedKernel<G, X, Y> = (x: X) => { readonly dist: Map<Y, number>; readonly grade: G };

type GradedModule = {
  readonly gDeterministic: <G, X, Y>(M: Monoid<G>, f: (x: X) => Y, g: G) => GradedKernel<G, X, Y>;
  readonly gCompose: <G, X, Y, Z>(
    M: Monoid<G>,
    f: GradedKernel<G, X, Y>,
    g: GradedKernel<G, Y, Z>,
  ) => GradedKernel<G, X, Z>;
  readonly gradeMap: <G, X, Y>(M: Monoid<G>, k: Kernel<X, Y>, g: G) => GradedKernel<G, X, Y>;
  readonly ungrade: <G, X, Y>(gk: GradedKernel<G, X, Y>) => Kernel<X, Y>;
  readonly NatAddMonoid: Monoid<number>;
  readonly MaxTropical: Monoid<number>;
  readonly countedOracle: <X, Y>(k: Kernel<X, Y>) => GradedKernel<number, X, Y>;
  readonly runGraded: <X, Y, Z>(
    k1: GradedKernel<number, X, Y>,
    k2: GradedKernel<number, Y, Z>,
  ) => { readonly kernel: Kernel<X, Z>; readonly totalCost: (x: X) => number };
};

const markovGraded = require("../../markov-graded") as GradedModule;

const { gDeterministic, gCompose, gradeMap, NatAddMonoid, MaxTropical, countedOracle, runGraded } = markovGraded;

const formatDistribution = <Y>(dist: Map<Y, number>): string => {
  const entries = Array.from(dist.entries()).map(
    ([value, weight]) => `${String(value)}↦${weight.toFixed(2)}`,
  );
  return entries.length > 0 ? entries.join(", ") : "(empty)";
};

function additiveGradesSection(): readonly string[] {
  type Request = "alpha" | "beta";
  type Validation = "valid" | "reject";
  type Route = "fast-lane" | "manual" | "escalate";
  type Resolution = "approve" | "deny";

  const validate = gDeterministic(
    NatAddMonoid,
    (request: Request) => (request === "alpha" ? "valid" : "reject"),
    1,
  );

  const routeKernel: Kernel<Validation, Route> = (validation) => {
    if (validation === "reject") {
      return new Map<Route, number>([["manual", 1]]);
    }
    return new Map<Route, number>([
      ["fast-lane", 0.6],
      ["manual", 0.25],
      ["escalate", 0.15],
    ]);
  };
  const route = gradeMap(NatAddMonoid, routeKernel, 2);

  const resolveKernel: Kernel<Route, Resolution> = (route) => {
    switch (route) {
      case "fast-lane":
        return new Map<Resolution, number>([
          ["approve", 0.9],
          ["deny", 0.1],
        ]);
      case "manual":
        return new Map<Resolution, number>([
          ["approve", 0.55],
          ["deny", 0.45],
        ]);
      case "escalate":
        return new Map<Resolution, number>([
          ["approve", 0.35],
          ["deny", 0.65],
        ]);
    }
    throw new Error(`Unhandled route ${route as string}`);
  };
  const resolve = gradeMap(NatAddMonoid, resolveKernel, 3);

  const pipeline = gCompose(
    NatAddMonoid,
    gCompose(NatAddMonoid, validate, route),
    resolve,
  );

  const samples: ReadonlyArray<Request> = ["alpha", "beta"];
  const summaries = samples.map((request) => {
    const { dist, grade } = pipeline(request);
    return `• ${request}: grade=${grade} distribution={${formatDistribution(dist)}}`;
  });

  return [
    "== Additive grading across validation → routing → resolution ==",
    ...summaries,
  ];
}

function tropicalGradesSection(): readonly string[] {
  type Stage = "parse" | "classify" | "review";
  type Verdict = "green" | "yellow" | "red";

  const parse = gDeterministic(MaxTropical, (_: Stage): Stage => "classify", 2);

  const classifyKernel: Kernel<Stage, Stage> = (stage) => {
    if (stage === "parse") return new Map([["classify", 1]]);
    if (stage === "classify") {
      return new Map<Stage, number>([
        ["review", 0.4],
        ["classify", 0.6],
      ]);
    }
    return new Map([["review", 1]]);
  };
  const classify = gradeMap(MaxTropical, classifyKernel, 4);

  const verdictKernel: Kernel<Stage, Verdict> = (stage) => {
    if (stage === "classify") {
      return new Map<Verdict, number>([
        ["green", 0.7],
        ["yellow", 0.3],
      ]);
    }
    return new Map<Verdict, number>([
      ["yellow", 0.5],
      ["red", 0.5],
    ]);
  };
  const verdict = gradeMap(MaxTropical, verdictKernel, 6);

  const tropicalPipeline = gCompose(
    MaxTropical,
    gCompose(MaxTropical, parse, classify),
    verdict,
  );

  const states: ReadonlyArray<Stage> = ["parse", "classify", "review"];
  const summaries = states.map((stage) => {
    const { dist, grade } = tropicalPipeline(stage);
    return `• start=${stage}: max-grade=${grade} distribution={${formatDistribution(dist)}}`;
  });

  return [
    "== Tropical (max) grades tracking latency bottlenecks ==",
    ...summaries,
  ];
}

function countedOracleSection(): readonly string[] {
  type Snapshot = "raw" | "normalized" | "scored";
  type Decision = "accept" | "reject";

  const normalizeKernel: Kernel<Snapshot, Snapshot> = (snapshot) => {
    if (snapshot === "raw") {
      return new Map<Snapshot, number>([
        ["normalized", 0.9],
        ["raw", 0.1],
      ]);
    }
    return new Map<Snapshot, number>([[snapshot, 1]]);
  };
  const scoreKernel: Kernel<Snapshot, Decision> = (snapshot) => {
    return snapshot === "normalized"
      ? new Map<Decision, number>([
          ["accept", 0.8],
          ["reject", 0.2],
        ])
      : new Map<Decision, number>([
          ["accept", 0.4],
          ["reject", 0.6],
        ]);
  };

  const countedNormalize = countedOracle(normalizeKernel);
  const countedScore = countedOracle(scoreKernel);
  const { kernel: ungradedPipeline, totalCost } = runGraded(countedNormalize, countedScore);

  const snapshots: ReadonlyArray<Snapshot> = ["raw", "normalized", "scored"];
  const summaries = snapshots.map((snapshot) => {
    const dist = ungradedPipeline(snapshot);
    const grade = totalCost(snapshot);
    return `• ${snapshot}: total steps=${grade} distribution={${formatDistribution(dist)}}`;
  });

  return [
    "== Counted oracle composition (operation counting) ==",
    ...summaries,
  ];
}

export const stage064GradedMarkovKernelsAndCostAccounting: RunnableExample = {
  id: "064",
  title: "Graded Markov kernels and cost accounting",
  outlineReference: 64,
  summary:
    "Track monoidal grades alongside stochastic kernels to accumulate costs or latency evidence using additive and tropical monoids.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      additiveGradesSection(),
      [""],
      tropicalGradesSection(),
      [""],
      countedOracleSection(),
    ];

    const logs = sections.flatMap((section, index) =>
      index === sections.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
