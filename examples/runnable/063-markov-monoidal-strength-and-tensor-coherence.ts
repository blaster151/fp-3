import type { RunnableExample } from "./types";

declare function require(id: string): any;

type CSRig<R> = {
  readonly zero: R;
  readonly one: R;
  add(a: R, b: R): R;
  mul(a: R, b: R): R;
  eq(a: R, b: R): boolean;
  readonly isZero?: (value: R) => boolean;
};

type Dist<R, X> = { readonly R: CSRig<R>; readonly w: Map<X, R> };

type MonoidalTestData<R, X, Y, Z> = {
  readonly pairs: ReadonlyArray<readonly [X, Y]>;
  readonly x: X;
  readonly dy: Dist<R, Y>;
  readonly h: (y: Y) => Z;
  readonly dx: Dist<R, X>;
  readonly sampX: (d: Dist<R, X>) => X;
  readonly sampY: (d: Dist<R, Y>) => Y;
  readonly sampPair: (d: Dist<R, [X, Y]>) => [X, Y];
};

type MonoidalLawReport = {
  readonly diracMonoidal: boolean;
  readonly strengthNaturality: boolean;
  readonly samplingMonoidal: boolean;
  readonly overall: boolean;
};

type MarkovMonoidalModule = {
  readonly independentProduct: <R, X, Y>(R: CSRig<R>, dx: Dist<R, X>, dy: Dist<R, Y>) => Dist<R, [X, Y]>;
  readonly push: <R, Z, W>(R: CSRig<R>, dz: Dist<R, Z>, h: (z: Z) => W) => Dist<R, W>;
  readonly pushPairSecond: <R, X, Y, Z>(
    R: CSRig<R>,
    dxy: Dist<R, [X, Y]>,
    h: (y: Y) => Z,
  ) => Dist<R, [X, Z]>;
  readonly checkDiracMonoidal: <R, X, Y>(R: CSRig<R>, testPairs: readonly [X, Y][]) => boolean;
  readonly checkStrengthNaturality: <R, X, Y, Z>(
    R: CSRig<R>,
    x: X,
    dy: Dist<R, Y>,
    h: (y: Y) => Z,
  ) => boolean;
  readonly checkSamplingMonoidal: <R, X, Y>(
    R: CSRig<R>,
    dx: Dist<R, X>,
    dy: Dist<R, Y>,
    sampX: (d: Dist<R, X>) => X,
    sampY: (d: Dist<R, Y>) => Y,
    sampPair: (d: Dist<R, [X, Y]>) => [X, Y],
  ) => boolean;
  readonly checkAllMonoidalLaws: <R, X, Y, Z>(
    R: CSRig<R>,
    testData: MonoidalTestData<R, X, Y, Z>,
  ) => MonoidalLawReport;
  readonly generateMonoidalTestData: <R>(R: CSRig<R>) => MonoidalTestData<R, string, number, string>;
  readonly equalDist: <R, X>(R: CSRig<R>, a: Dist<R, X>, b: Dist<R, X>) => boolean;
};

type SemiringModule = {
  readonly Prob: CSRig<number>;
  readonly LogProb: CSRig<number>;
  readonly BoolRig: CSRig<boolean>;
};

const semiringUtils = require("../../semiring-utils") as SemiringModule;
const markovMonoidal = require("../../markov-monoidal") as MarkovMonoidalModule;

const { Prob, LogProb, BoolRig } = semiringUtils;
const {
  independentProduct,
  push,
  pushPairSecond,
  checkDiracMonoidal,
  checkStrengthNaturality,
  checkSamplingMonoidal,
  checkAllMonoidalLaws,
  generateMonoidalTestData,
  equalDist,
} = markovMonoidal;

const describeBoolean = (value: boolean): string => (value ? "pass" : "fail");

const formatWeight = <R>(R: CSRig<R>, weight: R): string => {
  if (typeof weight === "number") return weight.toFixed(2);
  if (typeof weight === "boolean") return weight ? "⊤" : "⊥";
  if (R.eq(weight, R.one)) return "1";
  if (R.eq(weight, R.zero)) return "0";
  return String(weight);
};

const formatDistribution = <R, X>(dist: Dist<R, X>): string => {
  const { R, w } = dist;
  const entries = Array.from(w.entries()).map(
    ([value, weight]) => `${String(value)}↦${formatWeight(R, weight)}`,
  );
  return entries.length > 0 ? entries.join(", ") : "(empty)";
};

function probabilityMonoidalSection(): readonly string[] {
  const data = generateMonoidalTestData(Prob);
  const report = checkAllMonoidalLaws(Prob, data);

  const product = independentProduct(Prob, data.dx, data.dy);
  const pushed = pushPairSecond(Prob, product, data.h);
  const pushedAlt = push(Prob, data.dy, data.h);
  const sigmaAligned = independentProduct(Prob, data.dx, pushedAlt);

  return [
    "== Probabilistic monoidal structure checks ==",
    `Dirac monoidal: ${describeBoolean(report.diracMonoidal)}`,
    `Strength naturality: ${describeBoolean(report.strengthNaturality)}`,
    `Sampling coherence: ${describeBoolean(report.samplingMonoidal)}`,
    `Overall verdict: ${describeBoolean(report.overall)}`,
    `Independent product dx ⊗ dy: ${formatDistribution(product)}`,
    `σ-based push (id×h) ∘ σ: ${formatDistribution(pushed)}`,
    `σ ∘ (id×Ph) with reconstructed marginal: ${formatDistribution(sigmaAligned)}`,
  ];
}

function booleanMonoidalSection(): readonly string[] {
  const data = generateMonoidalTestData(BoolRig);
  const report = checkAllMonoidalLaws(BoolRig, data);

  const mutablePairs = data.pairs.map(([x, y]) => [x, y] as [string, number]);
  const diracPairs = checkDiracMonoidal(BoolRig, mutablePairs);
  const sampleCoherence = checkSamplingMonoidal(
    BoolRig,
    data.dx,
    data.dy,
    data.sampX,
    data.sampY,
    data.sampPair,
  );

  return [
    "== Boolean rig monoidal sanity checks ==",
    `Dirac monoidal (manual probe): ${describeBoolean(diracPairs)}`,
    `Strength naturality (from batch report): ${describeBoolean(report.strengthNaturality)}`,
    `Sampling coherence (manual probe): ${describeBoolean(sampleCoherence)}`,
    `Aggregate verdict: ${describeBoolean(report.overall)}`,
  ];
}

function logSpaceNaturalitySection(): readonly string[] {
  const data = generateMonoidalTestData(LogProb);
  const report = checkAllMonoidalLaws(LogProb, data);

  const { dx, dy, h } = data;
  const left = pushPairSecond(LogProb, independentProduct(LogProb, dx, dy), h);
  const right = independentProduct(LogProb, dx, push(LogProb, dy, h));
  const agrees = equalDist(LogProb, left, right);

  return [
    "== Log-probability naturality witness ==",
    `Batch verdict: ${describeBoolean(report.overall)} (dirac=${describeBoolean(report.diracMonoidal)}, strength=${describeBoolean(report.strengthNaturality)}, sampling=${describeBoolean(report.samplingMonoidal)})`,
    `Left composite σ ∘ (id×Ph): ${formatDistribution(left)}`,
    `Right composite P(id×h) ∘ σ: ${formatDistribution(right)}`,
    `Distributions agree: ${describeBoolean(agrees)}`,
  ];
}

export const stage063MarkovMonoidalStrengthAndTensorCoherence: RunnableExample = {
  id: "063",
  title: "Markov monoidal strength and tensor coherence",
  outlineReference: 63,
  summary:
    "Confirm Dirac monoidality, strength naturality, and sampling compatibility for independent products across probability, boolean, and log-probability rigs.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      probabilityMonoidalSection(),
      [""],
      booleanMonoidalSection(),
      [""],
      logSpaceNaturalitySection(),
    ];

    const logs = sections.flatMap((section, index) =>
      index === sections.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
