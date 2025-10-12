import { RunnableExample } from "./types";

declare function require(id: string): any;

type Fin<T> = {
  readonly elems: ReadonlyArray<T>;
  readonly eq: (a: T, b: T) => boolean;
  readonly show?: (value: T) => string;
};

type FinMarkov<X, Y> = {
  readonly X: Fin<X>;
  readonly Y: Fin<Y>;
  readonly k: (x: X) => Map<Y, number>;
  then<Z>(that: FinMarkov<Y, Z>): FinMarkov<X, Z>;
};

type KolmogorovFiniteMarginal<XJ, XF = unknown> = {
  readonly F: string;
  readonly piF: FinMarkov<XJ, XF>;
};

type KolmogorovZeroOneWitness<A, XJ, T> = {
  readonly prior: FinMarkov<A, XJ>;
  readonly stat: FinMarkov<XJ, T>;
  readonly finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ>>;
  readonly label?: string;
};

type KolmogorovZeroOneReport<A, XJ, T> = {
  readonly holds: boolean;
  readonly witness: KolmogorovZeroOneWitness<A, XJ, T>;
  readonly deterministic: boolean;
  readonly ciFamilyVerified: boolean;
  readonly details: string;
};

type TopVietorisModule = {
  readonly buildTopVietorisKolmogorovWitness: <A, XJ, XF, T = 0 | 1>(
    prior: FinMarkov<A, XJ>,
    stat: FinMarkov<XJ, T>,
    finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
    label?: string,
  ) => KolmogorovZeroOneWitness<A, XJ, T>;
  readonly checkTopVietorisKolmogorov: <A, XJ, T = 0 | 1>(
    witness: KolmogorovZeroOneWitness<A, XJ, T>,
    opts?: { readonly tolerance?: number },
  ) => KolmogorovZeroOneReport<A, XJ, T>;
  readonly buildTopVietorisHewittSavageWitness: () => never;
  readonly checkTopVietorisHewittSavage: () => never;
  readonly makeProductPrior: <A, XJ>(mkXJ: () => XJ) => FinMarkov<A, XJ>;
  readonly makeDeterministicStatistic: <XJ, T = 0 | 1>(stat: (xj: XJ) => T) => FinMarkov<XJ, T>;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean, show?: (value: T) => string) => Fin<T>;
  readonly detK: <X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y) => FinMarkov<X, Y>;
  readonly tensorObj: <X, Y>(X: Fin<X>, Y: Fin<Y>) => Fin<readonly [X, Y]>;
  readonly FinMarkov: new <X, Y>(X: Fin<X>, Y: Fin<Y>, k: (x: X) => Map<Y, number>) => FinMarkov<X, Y>;
};

type MarkovOraclesModule = {
  readonly MarkovOracles: {
    readonly top: { readonly vietoris: { readonly status: string } };
  };
};

type FiniteSymmetryModule = unknown;

const topVietoris = require("../../top-vietoris-examples") as TopVietorisModule;
const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const markovOraclesModule = require("../../markov-oracles") as MarkovOraclesModule;
require("../../markov-permutation") as FiniteSymmetryModule;

const { buildTopVietorisKolmogorovWitness, checkTopVietorisKolmogorov, buildTopVietorisHewittSavageWitness, checkTopVietorisHewittSavage, makeProductPrior, makeDeterministicStatistic } =
  topVietoris;
const { MarkovOracles } = markovOraclesModule;
const { mkFin, detK, tensorObj, FinMarkov } = markovCategory;

type Bit = 0 | 1;
type Pair = readonly [Bit, Bit];
type Label = "aligned" | "mirror";

type Transcript = ReadonlyArray<string>;

const describeBoolean = (value: boolean): string => (value ? "yes" : "no");

const describeDistribution = <Y>(dist: Map<Y, number>): string => {
  const entries = Array.from(dist.entries());
  if (entries.length === 0) return "(empty)";
  return entries
    .map(([value, weight]) => `${describeValue(value)}↦${weight.toFixed(3)}`)
    .join(", ");
};

const describeValue = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(describeValue).join(", ")}]`;
  return String(value);
};

function makeSpaces(): {
  readonly domain: Fin<Label>;
  readonly bit: Fin<Bit>;
  readonly pair: Fin<Pair>;
  readonly finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<Pair, Bit>>;
} {
  const domain = mkFin<Label>(["aligned", "mirror"], (a, b) => a === b, (value) => value);
  const bit = mkFin<Bit>([0, 1], (a, b) => a === b, (value) => value.toString());
  const pair = tensorObj(bit, bit);

  const finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<Pair, Bit>> = [
    { F: "first", piF: detK(pair, bit, ([x]) => x) },
    { F: "second", piF: detK(pair, bit, ([, y]) => y) },
  ];

  return { domain, bit, pair, finiteMarginals };
}

const spaces = makeSpaces();

function alignedPrior(): FinMarkov<Label, Pair> {
  return detK(spaces.domain, spaces.pair, (label) =>
    label === "aligned" ? ([0, 0] as Pair) : ([1, 1] as Pair),
  );
}

function parityStatistic(): FinMarkov<Pair, Bit> {
  return detK(spaces.pair, spaces.bit, ([x, y]) => ((x ^ y) as Bit));
}

function firstCoordinateStatistic(): FinMarkov<Pair, Bit> {
  return detK(spaces.pair, spaces.bit, ([x]) => x);
}

function kolmogorovSection(): Transcript {
  const witness = buildTopVietorisKolmogorovWitness(
    alignedPrior(),
    firstCoordinateStatistic(),
    spaces.finiteMarginals,
    "Top/Vietoris aligned",
  );
  const report = checkTopVietorisKolmogorov(witness);
  const composite = witness.prior.then(witness.stat);
  const domainElement = witness.prior.X.elems[0]!;
  const distribution = composite.k(domainElement);

  return [
    "== Top/Vietoris Kolmogorov witness ==",
    `Status hint: ${MarkovOracles.top.vietoris.status}`,
    `Holds=${describeBoolean(report.holds)} — ${report.details}`,
    `Deterministic composite=${describeBoolean(report.deterministic)}; CI family=${describeBoolean(
      report.ciFamilyVerified,
    )}`,
    `Composite distribution=${describeDistribution(distribution)}`,
  ];
}

function captureError(label: string, action: () => void): Transcript {
  try {
    action();
    return [`${label}: unexpectedly succeeded`];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [`${label}: ${message}`];
  }
}

function hewittSavageSection(): Transcript {
  return [
    "== Hewitt–Savage scaffolding ==",
    ...captureError("buildTopVietorisHewittSavageWitness", () => buildTopVietorisHewittSavageWitness()),
    ...captureError("checkTopVietorisHewittSavage", () => checkTopVietorisHewittSavage()),
  ];
}

function factorySection(): Transcript {
  return [
    "== Adapter factory placeholders ==",
    ...captureError("makeProductPrior", () => makeProductPrior(() => [0, 0] as Pair)),
    ...captureError("makeDeterministicStatistic", () => makeDeterministicStatistic((pair: Pair) => pair[0])),
  ];
}

export const stage071TopVietorisZeroOneScaffolding: RunnableExample = {
  id: "071",
  title: "Top/Vietoris zero-one scaffolding",
  outlineReference: 71,
  summary:
    "Kolmogorov witness adapters for the Vietoris Kleisli category, explicit Hewitt–Savage failure markers, and TODO factories for product priors and statistics in non-causal settings",
  async run() {
    const logs: string[] = [
      ...kolmogorovSection(),
      "",
      ...hewittSavageSection(),
      "",
      ...factorySection(),
    ];
    return { logs };
  },
};
