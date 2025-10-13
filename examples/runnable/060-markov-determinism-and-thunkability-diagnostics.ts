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

type DeterminismRecognizerModule = {
  readonly isDeterministic: <R, A, B>(
    R: CSRig<R>,
    f: (a: A) => Dist<R, B>,
    sampleAs: readonly A[],
  ) => { readonly det: boolean; readonly base?: (a: A) => B };
};

type ThunkabilityModule = {
  readonly checkThunkabilityRobust: <R, A, B>(
    R: CSRig<R>,
    f: (a: A) => Dist<R, B>,
    domain: readonly A[],
  ) => { readonly thunkable: boolean; readonly base?: (a: A) => B; readonly details: string };
};

type Fin<T> = { readonly elems: ReadonlyArray<T>; readonly eq: (a: T, b: T) => boolean };
type Pair<X, Y> = readonly [X, Y];

type FinMarkov<X, Y> = {
  readonly X: Fin<X>;
  readonly Y: Fin<Y>;
  readonly k: (x: X) => Map<Y, number>;
  then<Z>(that: FinMarkov<Y, Z>): FinMarkov<X, Z>;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean) => Fin<T>;
  readonly tensorObj: <X, Y>(X: Fin<X>, Y: Fin<Y>) => Fin<Pair<X, Y>>;
  readonly detK: <X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y) => FinMarkov<X, Y>;
};

type DeterminismLemmaModule = {
  readonly buildDeterminismLemmaWitness: <A, X, T>(
    p: FinMarkov<A, X>,
    s: FinMarkov<X, T>,
    options?: { readonly label?: string },
  ) => DeterminismLemmaWitness<A, X, T>;
  readonly checkDeterminismLemma: <A, X, T>(
    witness: DeterminismLemmaWitness<A, X, T>,
  ) => DeterminismLemmaReport;
};

type DeterminismLemmaWitness<A, X, T> = {
  readonly prior: FinMarkov<A, X>;
  readonly stat: FinMarkov<X, T>;
  readonly label?: string;
};

type DeterminismLemmaReport = {
  readonly holds: boolean;
  readonly deterministic: boolean;
  readonly ciVerified: boolean;
  readonly details: string;
};

type SemiringModule = { readonly Prob: CSRig<number> };

const semiringUtils = require("../../semiring-utils") as SemiringModule;
const markovLaws = require("../../markov-laws") as DeterminismRecognizerModule;
const markovThunkable = require("../../markov-thunkable") as ThunkabilityModule;
const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const markovLemma = require("../../markov-determinism-lemma") as DeterminismLemmaModule;

const { Prob } = semiringUtils;
const { mkFin, tensorObj, detK } = markovCategory;

const dirac = <X>(value: X): Dist<number, X> => ({ R: Prob, w: new Map([[value, Prob.one]]) });

const asTranscript = (lines: ReadonlyArray<string>): ReadonlyArray<string> => lines;

function describeBase<A, B>(domain: readonly A[], base: (a: A) => B): string {
  return domain
    .map((a) => `${String(a)} ↦ ${String(base(a))}`)
    .join(", ");
}

function deterministicKernelsSection(): readonly string[] {
  type Channel = "calibrated" | "uncalibrated";
  type Verdict = "ok" | "inspect";
  const channels: ReadonlyArray<Channel> = ["calibrated", "uncalibrated"];

  const deterministicKernel = (channel: Channel): Dist<number, Verdict> => {
    const verdict: Verdict = channel === "calibrated" ? "ok" : "inspect";
    return dirac(verdict);
  };

  const noisyKernel = (channel: Channel): Dist<number, Verdict> => {
    const weights: ReadonlyArray<readonly [Verdict, number]> =
      channel === "calibrated"
        ? [
            ["ok", 0.82],
            ["inspect", 0.18],
          ]
        : [
            ["ok", 0.42],
            ["inspect", 0.58],
          ];
    return { R: Prob, w: new Map(weights) };
  };

  const deterministicReport = markovLaws.isDeterministic(Prob, deterministicKernel, channels);
  const noisyReport = markovLaws.isDeterministic(Prob, noisyKernel, channels);

  const deterministicLine = deterministicReport.det
    ? `• Dirac kernel: deterministic with base { ${describeBase(channels, deterministicReport.base!)} }`
    : "• Dirac kernel: failed to certify determinism";

  const noisyLine = noisyReport.det
    ? `• Noisy kernel: unexpectedly deterministic with base { ${describeBase(channels, noisyReport.base!)} }`
    : "• Noisy kernel: correctly flagged as non-deterministic (multiple outcomes present)";

  return asTranscript([
    "== Dirac recognition and base extraction ==",
    deterministicLine,
    noisyLine,
  ]);
}

function thunkabilitySection(): readonly string[] {
  type Channel = "calibrated" | "uncalibrated";
  type Verdict = "ok" | "inspect";
  const channels: ReadonlyArray<Channel> = ["calibrated", "uncalibrated"];

  const deterministicKernel = (channel: Channel): Dist<number, Verdict> =>
    dirac(channel === "calibrated" ? "ok" : "inspect");

  const noisyKernel = (channel: Channel): Dist<number, Verdict> => {
    const weights: ReadonlyArray<readonly [Verdict, number]> =
      channel === "calibrated"
        ? [
            ["ok", 0.82],
            ["inspect", 0.18],
          ]
        : [
            ["ok", 0.42],
            ["inspect", 0.58],
          ];
    return { R: Prob, w: new Map(weights) };
  };

  const deterministicThunk = markovThunkable.checkThunkabilityRobust(Prob, deterministicKernel, channels);
  const noisyThunk = markovThunkable.checkThunkabilityRobust(Prob, noisyKernel, channels);

  const deterministicLine = deterministicThunk.thunkable
    ? `• Dirac kernel thunkable across ${channels.length} probes (${deterministicThunk.details})`
    : "• Dirac kernel failed thunkability probes";

  const noisyLine = noisyThunk.thunkable
    ? "• Noisy kernel unexpectedly thunkable"
    : `• Noisy kernel rejected as non-thunkable (${noisyThunk.details})`;

  return asTranscript([
    "== Thunkability ⇔ determinism diagnostics ==",
    deterministicLine,
    noisyLine,
  ]);
}

function determinismLemmaSection(): readonly string[] {
  type Context = "baseline" | "calibrated";
  type Bit = 0 | 1;
  type Reading = Pair<Bit, Bit>;

  const Contexts = mkFin<Context>(["baseline", "calibrated"], (a, b) => a === b);
  const BitFin = mkFin<Bit>([0, 1], (a, b) => a === b);
  const PairFin = tensorObj(BitFin, BitFin);

  const prior = detK(Contexts, PairFin, (context) =>
    context === "baseline" ? ([0, 0] as Reading) : ([1, 1] as Reading),
  );
  const stat = detK(PairFin, BitFin, ([bit]) => bit);

  const witness = markovLemma.buildDeterminismLemmaWitness(prior, stat, {
    label: "paired-sensor",
  });
  const report = markovLemma.checkDeterminismLemma(witness);

  return asTranscript([
    "== Determinism lemma witness diagnostics ==",
    `• Holds: ${report.holds ? "yes" : "no"}`,
    `• Composite deterministic: ${report.deterministic ? "yes" : "no"}`,
    `• Conditional independence verified: ${report.ciVerified ? "yes" : "no"}`,
    `• Details: ${report.details}`,
  ]);
}

export const stage060MarkovDeterminismAndThunkabilityDiagnostics: RunnableExample = {
  id: "060",
  title: "Markov determinism and thunkability diagnostics",
  outlineReference: 60,
  summary:
    "Extract Dirac bases, certify thunkability across generated probes, and exercise the determinism lemma witnesses connecting sampling to deterministic pushforwards.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      deterministicKernelsSection(),
      [""],
      thunkabilitySection(),
      [""],
      determinismLemmaSection(),
    ];

    const logs = sections.flatMap((section, index) =>
      index === sections.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
