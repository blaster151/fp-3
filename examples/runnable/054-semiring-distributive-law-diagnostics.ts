import { RunnableExample } from "./types";

declare function require(id: string): any;

type Dist<T> = Map<T, number>;

type Fin<T> = {
  readonly elems: ReadonlyArray<T>;
  readonly eq: (a: T, b: T) => boolean;
};

type DistLikeMonadSpec = {
  of<T>(value: T): Dist<T>;
  map<A, B>(dist: Dist<A>, f: (value: A) => B): Dist<B>;
  bind<A, B>(dist: Dist<A>, k: (value: A) => Dist<B>): Dist<B>;
  product<A, B>(left: Dist<A>, right: Dist<B>): Dist<readonly [A, B]>;
  isAffine1: boolean;
};

type SemiringUtilsModule = {
  readonly Prob: unknown;
  readonly LogProb: unknown;
  readonly MaxPlus: unknown;
  readonly Bool: unknown;
  readonly fromPairsR: (rig: unknown, pairs: ReadonlyArray<[string, number]>) => Dist<string>;
};

type SemiringDistModule = {
  readonly DRMonad: (rig: unknown) => DistLikeMonadSpec;
};

type MarkovLawsModule = {
  readonly checkFubini: (spec: DistLikeMonadSpec, da: Dist<string>, db: Dist<string>) => boolean;
};

type PullbackCheckModule = {
  readonly pullbackSquareHolds: (rig: unknown, fin: Fin<string>) => boolean;
  readonly checkPullbackRandom: (rig: unknown, fin: Fin<string>, samples: number) => boolean;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean) => Fin<T>;
};

const semiringUtils = require("../../semiring-utils") as SemiringUtilsModule;
const semiringDist = require("../../semiring-dist") as SemiringDistModule;
const markovLaws = require("../../markov-laws") as MarkovLawsModule;
const pullback = require("../../pullback-check") as PullbackCheckModule;
const markovCategory = require("../../markov-category") as MarkovCategoryModule;

const { Prob, LogProb, MaxPlus, Bool, fromPairsR } = semiringUtils;
const { DRMonad } = semiringDist;
const { checkFubini } = markovLaws;
const { pullbackSquareHolds, checkPullbackRandom } = pullback;
const { mkFin } = markovCategory;

const Theta = mkFin(["t1", "t2", "t3"], (a, b) => a === b);

const leftPairs: ReadonlyArray<[string, number]> = [
  ["t1", 0.3],
  ["t2", 1.1],
  ["t3", 0.7],
];

const rightPairs: ReadonlyArray<[string, number]> = [
  ["t1", 2.0],
  ["t2", 0.2],
  ["t3", 0.5],
];

type DiagnosticRow = {
  readonly rig: string;
  readonly fubini: boolean;
  readonly pullback: boolean;
};

function evaluateRig(label: string, rig: unknown): DiagnosticRow {
  const spec = DRMonad(rig);
  const da = fromPairsR(rig, leftPairs);
  const db = fromPairsR(rig, rightPairs);
  const fubini = checkFubini(spec, da, db);
  const pullbackOk = pullbackSquareHolds(rig, Theta) && checkPullbackRandom(rig, Theta, 64);
  return { rig: label, fubini, pullback: pullbackOk };
}

function formatRow(row: DiagnosticRow): string {
  const fubiniBadge = row.fubini ? "✅" : "❌";
  const pullbackBadge = row.pullback ? "✅" : "❌";
  return `${row.rig.padEnd(18, " ")} Fubini ${fubiniBadge}  Pullback ${pullbackBadge}`;
}

export const stage054SemiringDistributiveLawDiagnostics: RunnableExample = {
  id: "054",
  title: "Semiring distributive-law diagnostics",
  outlineReference: 54,
  summary:
    "Stress test Fubini/product coherence and pullback preservation across probability, log-probability, max-plus, and Boolean DR monads.",
  async run() {
    const diagnostics: ReadonlyArray<DiagnosticRow> = [
      evaluateRig("Probabilities", Prob),
      evaluateRig("Log probabilities", LogProb),
      evaluateRig("Max-plus", MaxPlus),
      evaluateRig("Booleans", Bool),
    ];

    const heading = ["== Semiring distributive-law diagnostics =="];
    const rows = diagnostics.map(formatRow);
    const aggregate = diagnostics.every((row) => row.fubini && row.pullback)
      ? "All distributive-law checks passed."
      : "Some distributive-law checks failed.";

    return { logs: [...heading, ...rows, "", aggregate] };
  },
};
