import { RunnableExample } from "./types";

declare function require(id: string): any;

type CSRig<R> = {
  readonly zero: R;
  readonly one: R;
  add(a: R, b: R): R;
  mul(a: R, b: R): R;
  eq(a: R, b: R): boolean;
};

type Dist<R, X> = { readonly R: CSRig<R>; readonly w: Map<X, R> };

type SOSDModule = {
  readonly expectation: (eps?: number) => (dist: Dist<number, number>) => number;
  readonly symmetricSpread: (R: CSRig<number>, amount: number) => (value: number) => Dist<number, number>;
  readonly push: <A, B>(R: CSRig<number>, dist: Dist<number, A>, k: (a: A) => Dist<number, B>) => Dist<number, B>;
  readonly testSOSDDetailed: (
    R: CSRig<number>,
    p: Dist<number, number>,
    q: Dist<number, number>,
    e: (dist: Dist<number, number>) => number,
    dilation: (a: number) => Dist<number, number>,
    samples: ReadonlyArray<number>,
    direction?: "qFromP" | "pFromQ",
  ) => { readonly validDilation: boolean; readonly transformationCorrect: boolean; readonly sosdHolds: boolean; readonly details: string };
  readonly testDilationDetailed: (
    R: CSRig<number>,
    dilation: (a: number) => Dist<number, number>,
    e: (dist: Dist<number, number>) => number,
    samples: ReadonlyArray<number>,
  ) => { readonly isDilation: boolean; readonly details: string };
};

type GarblingModule = {
  readonly testInformativenessDetailed: <Θ, X, Y>(
    R: CSRig<number>,
    thetaVals: ReadonlyArray<Θ>,
    f: (theta: Θ) => Dist<number, X>,
    g: (theta: Θ) => Dist<number, Y>,
    candidates: ReadonlyArray<(x: X) => Y>,
  ) => { readonly moreInformative: boolean; readonly witness?: (x: X) => Y; readonly details: string };
  readonly generateAllFunctions: <X, Y>(domain: ReadonlyArray<X>, codomain: ReadonlyArray<Y>) => Array<(x: X) => Y>;
  readonly jointFromGarbling: <Θ, X, Y>(
    R: CSRig<number>,
    f: (theta: Θ) => Dist<number, X>,
    c: (x: X) => Y,
  ) => (theta: Θ) => Dist<number, [X, Y]>;
};

type BSSModule = {
  readonly analyzeBSS: <Θ extends string | number, X extends string | number, Y extends string | number>(
    m: Dist<number, Θ>,
    f: (theta: Θ) => Dist<number, X>,
    g: (theta: Θ) => Dist<number, Y>,
    xVals: ReadonlyArray<X>,
    yVals: ReadonlyArray<Y>,
  ) => {
    readonly standardMeasures: {
      readonly fHat: Dist<number, Dist<number, Θ>>;
      readonly gHat: Dist<number, Dist<number, Θ>>;
    };
    readonly bssResult: {
      readonly fMoreInformative: boolean;
      readonly gMoreInformative: boolean;
      readonly equivalent: boolean;
      readonly dilationFound: boolean;
      readonly details: string;
    };
    readonly dilationAnalysis: {
      readonly fHatSupport: number;
      readonly gHatSupport: number;
      readonly searchSpace: string;
    };
  };
};

type SemiringModule = {
  readonly Prob: CSRig<number>;
};

const sosd = require("../../sosd") as SOSDModule;
const garbling = require("../../garbling") as GarblingModule;
const bss = require("../../bss") as BSSModule;
const semiringUtils = require("../../semiring-utils") as SemiringModule;

const { expectation, symmetricSpread, push, testSOSDDetailed, testDilationDetailed } = sosd;
const { testInformativenessDetailed, generateAllFunctions, jointFromGarbling } = garbling;
const { analyzeBSS } = bss;
const { Prob } = semiringUtils;

type Transcript = ReadonlyArray<string>;

const describeBoolean = (value: boolean): string => (value ? "yes" : "no");

const describeDistribution = <X>(dist: Dist<number, X>): string => {
  const entries = Array.from(dist.w.entries());
  if (entries.length === 0) return "(empty)";
  return entries
    .map(([value, weight]) => `${String(value)}↦${weight.toFixed(2)}`)
    .join(", ");
};

function dilationSection(): Transcript {
  const revenue: Dist<number, number> = {
    R: Prob,
    w: new Map<number, number>([
      [12, 0.5],
      [18, 0.5],
    ]),
  };
  const spread = symmetricSpread(Prob, 6);
  const diversified = push(Prob, revenue, spread);
  const evaluation = expectation();
  const samplePoints = [12, 18];

  const dilationReport = testDilationDetailed(Prob, spread, evaluation, samplePoints);
  const sosdReport = testSOSDDetailed(Prob, revenue, diversified, evaluation, spread, samplePoints);

  return [
    "== SOSD via mean-preserving dilation witnesses ==",
    `Dilation law satisfied: ${describeBoolean(dilationReport.isDilation)} (${dilationReport.details})`,
    `Transformation matches target distribution: ${describeBoolean(sosdReport.transformationCorrect)}`,
    `SOSD verdict (q from p): ${describeBoolean(sosdReport.sosdHolds)} (${sosdReport.details})`,
    `Original revenue: ${describeDistribution(revenue)}`,
    `Diversified pushforward: ${describeDistribution(diversified)}`,
  ];
}

function garblingSection(): Transcript {
  type Theta = "calm" | "storm";
  type Raw = "sun" | "cloud" | "rain";
  type Coarse = "ok" | "alert";

  const thetaVals: ReadonlyArray<Theta> = ["calm", "storm"];
  const rawOutcomes: ReadonlyArray<Raw> = ["sun", "cloud", "rain"];
  const coarseOutcomes: ReadonlyArray<Coarse> = ["ok", "alert"];

  const fineSensor = (theta: Theta): Dist<number, Raw> =>
    theta === "calm"
      ? {
          R: Prob,
          w: new Map<Raw, number>([
            ["sun", 0.7],
            ["cloud", 0.25],
            ["rain", 0.05],
          ]),
        }
      : {
          R: Prob,
          w: new Map<Raw, number>([
            ["sun", 0.1],
            ["cloud", 0.4],
            ["rain", 0.5],
          ]),
        };

  const coarseMap = (outcome: Raw): Coarse => (outcome === "rain" ? "alert" : outcome === "cloud" ? "alert" : "ok");
  const coarseSensor = (theta: Theta): Dist<number, Coarse> => ({
    R: Prob,
    w: new Map<Coarse, number>([
      ["ok", fineSensor(theta).w.get("sun") ?? 0],
      [
        "alert",
        (fineSensor(theta).w.get("cloud") ?? 0) + (fineSensor(theta).w.get("rain") ?? 0),
      ],
    ]),
  });

  const candidates = generateAllFunctions(rawOutcomes, coarseOutcomes);
  const informativeness = testInformativenessDetailed(Prob, thetaVals, fineSensor, coarseSensor, candidates);
  const witness = informativeness.witness ?? coarseMap;
  const joint = jointFromGarbling(Prob, fineSensor, witness);

  const jointLines = thetaVals.map((theta) => `  ${theta}: ${describeDistribution(joint(theta))}`);

  return [
    "== Garbling witness and joint construction for coarse sensor ==",
    `Garbling witness found: ${describeBoolean(informativeness.moreInformative)} (${informativeness.details})`,
    `Witness mapping sun→${witness("sun")}, cloud→${witness("cloud")}, rain→${witness("rain")}`,
    "Joint distribution samples (Θ ↦ X×Y):",
    ...jointLines,
  ];
}

function bssSection(): Transcript {
  type Theta = "calm" | "storm";
  type Raw = "sun" | "cloud" | "rain";
  type Coarse = "ok" | "alert";

  const thetaVals: ReadonlyArray<Theta> = ["calm", "storm"];
  const prior: Dist<number, Theta> = {
    R: Prob,
    w: new Map<Theta, number>([
      ["calm", 0.55],
      ["storm", 0.45],
    ]),
  };

  const fineSensor = (theta: Theta): Dist<number, Raw> =>
    theta === "calm"
      ? {
          R: Prob,
          w: new Map<Raw, number>([
            ["sun", 0.7],
            ["cloud", 0.25],
            ["rain", 0.05],
          ]),
        }
      : {
          R: Prob,
          w: new Map<Raw, number>([
            ["sun", 0.1],
            ["cloud", 0.4],
            ["rain", 0.5],
          ]),
        };

  const coarseMap = (outcome: Raw): Coarse => (outcome === "rain" ? "alert" : outcome === "cloud" ? "alert" : "ok");
  const coarseSensor = (theta: Theta): Dist<number, Coarse> => ({
    R: Prob,
    w: new Map<Coarse, number>([
      ["ok", fineSensor(theta).w.get("sun") ?? 0],
      [
        "alert",
        (fineSensor(theta).w.get("cloud") ?? 0) + (fineSensor(theta).w.get("rain") ?? 0),
      ],
    ]),
  });

  const analysis = analyzeBSS(prior, fineSensor, coarseSensor, ["sun", "cloud", "rain"], ["ok", "alert"]);

  return [
    "== Blackwell–Sherman–Stein diagnostics for fine vs coarse sensors ==",
    `BSS verdict: ${analysis.bssResult.details}`,
    `f ⪰ g: ${describeBoolean(analysis.bssResult.fMoreInformative)}, g ⪰ f: ${describeBoolean(
      analysis.bssResult.gMoreInformative,
    )}`,
    `Dilations considered: ${analysis.dilationAnalysis.searchSpace}`,
    `Support sizes: |f̂|=${analysis.dilationAnalysis.fHatSupport}, |ĝ|=${analysis.dilationAnalysis.gHatSupport}`,
  ];
}

export const stage066DominanceGarblingAndBSSEquivalenceChecks: RunnableExample = {
  id: "066",
  title: "Dominance, garbling, and BSS equivalence checks",
  outlineReference: 66,
  summary:
    "Verify second-order dominance via dilations, recover garbling witnesses, and compare experiments through Blackwell–Sherman–Stein diagnostics.",
  async run() {
    const sections: ReadonlyArray<Transcript> = [
      dilationSection(),
      [""],
      garblingSection(),
      [""],
      bssSection(),
    ];

    const logs = sections.flatMap((section, index) =>
      index === sections.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
