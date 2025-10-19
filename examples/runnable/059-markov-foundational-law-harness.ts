import type { RunnableExample } from "./types";
import type { MarkovOracleRegistry } from "../../markov-oracles";

declare function require(id: string): any;

type CSRig<R> = {
  readonly zero: R;
  readonly one: R;
  add(a: R, b: R): R;
  mul(a: R, b: R): R;
  eq(a: R, b: R): boolean;
  readonly isZero?: (value: R) => boolean;
  readonly toString?: (value: R) => string;
};

type Dist<R, X> = { readonly R: CSRig<R>; readonly w: Map<X, R> };

type EntiretyModule = {
  readonly checkEntiretyDetailed: <R, A, X, Y>(
    R: CSRig<R>,
    domain: readonly A[],
    f: (a: A) => X,
    g: (a: A) => Y,
  ) => {
    readonly isEntire: boolean;
    readonly pullbackPassed: boolean;
    readonly lawSatisfied: boolean;
    readonly details: string;
  };
};

type PullbackFaithfulnessModule = {
  readonly checkSplitMono: <R, X>(R: CSRig<R>, samples: ReadonlyArray<Dist<R, X>>) => boolean;
  readonly checkDeltaMonicityVaried: <R, A, X>(
    R: CSRig<R>,
    domain: readonly A[],
    cases: ReadonlyArray<{
      readonly name: string;
      readonly u: (a: A) => X;
      readonly v: (a: A) => X;
      readonly shouldBeEqual: boolean;
    }>,
  ) => ReadonlyArray<{ readonly name: string; readonly passed: boolean }>;
};

type PullbackSquareModule = {
  readonly checkPullbackSquareRobust: <R, A, X, Y>(
    R: CSRig<R>,
    domain: readonly A[],
    f: (a: A) => X,
    g: (a: A) => Y,
  ) => { readonly passed: boolean; readonly details: string };
};

type SemiringModule = {
  readonly Prob: CSRig<number>;
  readonly LogProb: CSRig<number>;
  readonly BoolRig: CSRig<boolean>;
  readonly directSum: <R>(R: CSRig<R>) => CSRig<readonly [R, R]>;
};

type MarkovOracleModule = {
  readonly createMarkovOracleRegistry: () => MarkovOracleRegistry;
};

const semiringUtils = require("../../semiring-utils") as SemiringModule;
const entirety = require("../../entirety-check") as EntiretyModule;
const faithfulness = require("../../pullback-check") as PullbackFaithfulnessModule;
const pullbackSquare = require("../../pullback-square") as PullbackSquareModule;
const markovOracles = require("../../markov-oracles") as MarkovOracleModule;
const markovOracleRegistry = markovOracles.createMarkovOracleRegistry();
const {
  MarkovOracleMetadata,
  listMarkovOracles,
  verifyOracleIntegration,
} = markovOracleRegistry;

const { Prob, LogProb, BoolRig, directSum } = semiringUtils;

const mkDist = <R, X>(R: CSRig<R>, entries: ReadonlyArray<readonly [X, R]>): Dist<R, X> => ({
  R,
  w: new Map(entries),
});

const describeBoolean = (value: boolean): string => (value ? "pass" : "fail");

function summarizeEntiretyLaw(): readonly string[] {
  const domain = ["source", "calibration"] as const;
  const f = (label: (typeof domain)[number]) => (label === "source" ? "upstream" : "diagnostics");
  const g = (label: (typeof domain)[number]) => (label === "source" ? "alpha" : "beta");

  const specs: ReadonlyArray<{ readonly name: string; readonly R: CSRig<any> }> = [
    { name: "Prob", R: Prob },
    { name: "LogProb", R: LogProb },
    { name: "Bool", R: BoolRig },
    { name: "Prob ⊕ Prob", R: directSum(Prob) },
  ];

  const lines = specs.map(({ name, R }) => {
    const report = entirety.checkEntiretyDetailed(R, domain, f, g);
    const status = report.lawSatisfied ? "law satisfied" : "law violated";
    const pullback = report.pullbackPassed ? "unique pullback" : "failed pullback";
    return `• ${name}: ${status} (${pullback}; ${report.details})`;
  });

  return ["== Entirety law across representative semirings ==", ...lines];
}

function summarizeFaithfulness(): readonly string[] {
  const weather = ["sunny", "rainy"] as const;
  const sunnyFirst = mkDist(Prob, [
    ["sunny", 0.7],
    ["rainy", 0.3],
  ]);
  const rainyFirst = mkDist(Prob, [
    ["sunny", 0.2],
    ["rainy", 0.8],
  ]);

  const splitMono = faithfulness.checkSplitMono(Prob, [sunnyFirst, rainyFirst]);

  const deltaCases = faithfulness.checkDeltaMonicityVaried(Prob, weather, [
    {
      name: "identity vs identity",
      u: (state) => state,
      v: (state) => state,
      shouldBeEqual: true,
    },
    {
      name: "identity vs flip",
      u: (state) => state,
      v: (state) => (state === "sunny" ? "rainy" : "sunny"),
      shouldBeEqual: false,
    },
  ]);

  const deltaLines = deltaCases.map(
    ({ name, passed }) => `  - ${name}: ${describeBoolean(passed)}`,
  );

  return [
    "== Faithfulness diagnostics (split mono and δ-monic) ==",
    `• Δ ∘ ∇ = id checks: ${describeBoolean(splitMono)}`,
    "• δ-monic sanity cases:",
    ...deltaLines,
  ];
}

function summarizePullbackSquare(): readonly string[] {
  const experiments = ["probe-A", "probe-B"] as const;
  const measurement = (label: (typeof experiments)[number]) =>
    label === "probe-A" ? "stable" : "unstable";
  const outcome = (label: (typeof experiments)[number]) =>
    label === "probe-A" ? "pass" : "fail";

  const report = pullbackSquare.checkPullbackSquareRobust(Prob, experiments, measurement, outcome);

  return [
    "== Pullback-square uniqueness (δ⟨f,g⟩) ==",
    `• Robust pullback check: ${describeBoolean(report.passed)} (${report.details})`,
  ];
}

function summarizeRegistry(): readonly string[] {
  const oracleList = listMarkovOracles();
  const perDomain = new Map<string, number>();
  for (const oracle of oracleList) {
    perDomain.set(oracle.domain, (perDomain.get(oracle.domain) ?? 0) + 1);
  }

  const domainLines = Array.from(perDomain.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, count]) => `  - ${domain}: ${count} oracle${count === 1 ? "" : "s"}`);

  const integration = verifyOracleIntegration();
  const metadata = MarkovOracleMetadata;

  return [
    "== Markov oracle registry overview ==",
    `• Registered oracles: ${oracleList.length} total across ${metadata.domains.length} documented domains`,
    ...domainLines,
    `• Coverage snapshot: laws ${metadata.coverage.laws} | tests ${metadata.coverage.tests}`,
    `• Integration audit: ${integration.details} (registered=${integration.registered ? "yes" : "no"}, documented=${integration.documented ? "yes" : "no"})`,
    `• Registry version ${metadata.version} – updated ${metadata.lastUpdated}`,
  ];
}

export const stage059MarkovFoundationalLawHarness: RunnableExample = {
  id: "059",
  title: "Markov foundational law harness",
  outlineReference: 59,
  summary:
    "Evaluate entirety, faithfulness, pullback-square uniqueness, and oracle registry metadata to certify the Markov foundation tier.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      summarizeEntiretyLaw(),
      [""],
      summarizeFaithfulness(),
      [""],
      summarizePullbackSquare(),
      [""],
      summarizeRegistry(),
    ];

    const logs = sections.flatMap((section, index) =>
      index === sections.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
