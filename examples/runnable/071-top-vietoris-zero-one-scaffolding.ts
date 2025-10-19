import type { RunnableExample } from "./types";
import type { MarkovOracleRegistry } from "../../markov-oracles";

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

type ClosedSubset<Point> = {
  readonly label: string;
  readonly members: ReadonlyArray<Point>;
  contains(point: Point): boolean;
};

type TopSpace<Point> = {
  readonly label: string;
  readonly points: Fin<Point>;
  readonly closedSubsets: ReadonlyArray<ClosedSubset<Point>>;
};

type KolmogorovProductSpace<Point> = TopSpace<Point> & {
  readonly factors: ReadonlyArray<TopSpace<any>>;
  readonly finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<Point>>;
};

type ProductPriorInput<A, XJ> = {
  readonly domain: Fin<A>;
  readonly product: KolmogorovProductSpace<XJ>;
  readonly support: ReadonlyArray<readonly [XJ, number]>;
  readonly label?: string;
};

type DeterministicStatisticInput<XJ, T> = {
  readonly source: TopSpace<XJ>;
  readonly target: Fin<T>;
  readonly statistic: (xj: XJ) => T;
  readonly label?: string;
};

type ConstantFunctionWitness<XJ, Y> = {
  readonly product: TopSpace<XJ>;
  readonly target: TopSpace<Y>;
  readonly map: (xj: XJ) => Y;
  readonly finiteSubsets: ReadonlyArray<ReadonlyArray<number>>;
  readonly label?: string;
};

type ConstantFunctionReport<XJ, Y> = {
  readonly holds: boolean;
  readonly independence: boolean;
  readonly constant: boolean;
  readonly constantValue?: Y;
  readonly details: string;
};

type SpaceStructureCache = <Point>(space: TopSpace<Point>) => unknown;

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
  readonly buildTopVietorisConstantFunctionWitness: <XJ, Y>(
    mkInput: () => {
      readonly product: TopSpace<XJ>;
      readonly target: TopSpace<Y>;
      readonly map: (xj: XJ) => Y;
      readonly label?: string;
    },
  ) => ConstantFunctionWitness<XJ, Y>;
  readonly checkTopVietorisConstantFunction: <XJ, Y>(
    witness: ConstantFunctionWitness<XJ, Y>,
    options?: { readonly spaceStructure?: SpaceStructureCache },
  ) => ConstantFunctionReport<XJ, Y>;
  readonly makeDiscreteTopSpace: <Point>(label: string, points: Fin<Point>) => TopSpace<Point>;
  readonly makeKolmogorovProductSpace: <Spaces extends ReadonlyArray<TopSpace<any>>>(
    spaces: Spaces,
    options?: { readonly label?: string },
  ) => KolmogorovProductSpace<any>;
  readonly makeProductPrior: <A, XJ>(mkInput: () => ProductPriorInput<A, XJ>) => FinMarkov<A, XJ>;
  readonly makeDeterministicStatistic: <XJ, T = 0 | 1>(mkInput: () => DeterministicStatisticInput<XJ, T>) => FinMarkov<XJ, T>;
  readonly createSpaceStructureCache: () => SpaceStructureCache;
  readonly installTopVietorisAdapters: (registry: MarkovOracleRegistry) => void;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean, show?: (value: T) => string) => Fin<T>;
};

type MarkovOraclesModule = {
  readonly createMarkovOracleRegistry: () => MarkovOracleRegistry;
};

type FiniteSymmetryModule = unknown;

const topVietoris = require("../../top-vietoris-examples") as TopVietorisModule;
const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const markovOraclesModule = require("../../markov-oracles") as MarkovOraclesModule;
require("../../markov-permutation") as FiniteSymmetryModule;

const {
  buildTopVietorisKolmogorovWitness,
  checkTopVietorisKolmogorov,
  buildTopVietorisHewittSavageWitness,
  checkTopVietorisHewittSavage,
  buildTopVietorisConstantFunctionWitness,
  checkTopVietorisConstantFunction,
  makeDiscreteTopSpace,
  makeKolmogorovProductSpace,
  makeProductPrior,
  makeDeterministicStatistic,
  createSpaceStructureCache,
  installTopVietorisAdapters,
} = topVietoris;
const markovOracleRegistry = markovOraclesModule.createMarkovOracleRegistry();
installTopVietorisAdapters(markovOracleRegistry);
const { MarkovOracles } = markovOracleRegistry;
const { mkFin } = markovCategory;

type Bit = 0 | 1;
type Pair = readonly [Bit, Bit];

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

function makeEnvironment(): {
  readonly unit: Fin<{}>;
  readonly bit: Fin<Bit>;
  readonly bitSpace: TopSpace<Bit>;
  readonly pairSpace: KolmogorovProductSpace<Pair>;
  readonly aligned: Pair;
  readonly mirrored: Pair;
  readonly prior: FinMarkov<{}, Pair>;
  readonly statistic: FinMarkov<Pair, Bit>;
} {
  const unit = mkFin([{}], (a, b) => Object.is(a, b), () => "•");
  const bit = mkFin<Bit>([0, 1], (a, b) => a === b, (value) => value.toString());
  const bitSpace = makeDiscreteTopSpace("bit", bit);
  const pairSpace = makeKolmogorovProductSpace([bitSpace, bitSpace], { label: "bit²" }) as KolmogorovProductSpace<Pair>;

  const aligned = pairSpace.points.elems.find((point) => point[0] === 0 && point[1] === 0);
  const mirrored = pairSpace.points.elems.find((point) => point[0] === 1 && point[1] === 1);
  if (!aligned || !mirrored) throw new Error("Kolmogorov product is missing canonical aligned/mirrored points");

  const prior = makeProductPrior(() => ({
    domain: unit,
    product: pairSpace,
    support: [
      [aligned, 0.5],
      [mirrored, 0.5],
    ],
    label: "balanced pair prior",
  }));

  const statistic = makeDeterministicStatistic(() => ({
    source: pairSpace,
    target: bit,
    statistic: (pair) => pair[0],
    label: "first coordinate",
  }));

  return { unit, bit, bitSpace, pairSpace, aligned, mirrored, prior, statistic };
}

const environment = makeEnvironment();
const spaceStructure = createSpaceStructureCache();

function kolmogorovSection(): Transcript {
  const witness = buildTopVietorisKolmogorovWitness(
    environment.prior,
    environment.statistic,
    environment.pairSpace.finiteMarginals,
    "Top/Vietoris balanced pair",
  );
  const report = checkTopVietorisKolmogorov(witness);
  const composite = environment.prior.then(environment.statistic);
  const domainElement = environment.prior.X.elems[0]!;
  const distribution = composite.k(domainElement);

  return [
    "== Top/Vietoris Kolmogorov witness ==",
    `Status hint: ${MarkovOracles.top.vietoris.status}`,
    `Holds=${describeBoolean(report.holds)} — ${report.details}`,
    `Deterministic composite=${describeBoolean(report.deterministic)}; CI family=${describeBoolean(report.ciFamilyVerified)}`,
    `Composite distribution=${describeDistribution(distribution)}`,
  ];
}

function productSection(): Transcript {
  const factors = environment.pairSpace.factors.map((space) => space.label).join(" × ");
  const marginals = environment.pairSpace.finiteMarginals.map((entry) => entry.F).join(", ");
  return [
    "== Encoded Kolmogorov product ==",
    `Factors=${factors}`,
    `Cylinder marginals=${marginals}`,
    `Closed subsets tracked=${environment.pairSpace.closedSubsets.length}`,
  ];
}

function hewittSavageSection(): Transcript {
  const captureError = (label: string, action: () => void): string => {
    try {
      action();
      return `${label}: unexpectedly succeeded`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `${label}: ${message}`;
    }
  };

  return [
    "== Hewitt–Savage limitation ==",
    captureError("buildTopVietorisHewittSavageWitness", () => buildTopVietorisHewittSavageWitness()),
    captureError("checkTopVietorisHewittSavage", () => checkTopVietorisHewittSavage()),
  ];
}

function factorySection(): Transcript {
  const domainElement = environment.prior.X.elems[0]!;
  const priorDistribution = environment.prior.k(domainElement);
  const alignedImage = environment.statistic.k(environment.aligned);
  const mirroredImage = environment.statistic.k(environment.mirrored);
  return [
    "== Adapter factory outputs ==",
    `Prior distribution=${describeDistribution(priorDistribution)}`,
    `Statistic(aligned)=${describeDistribution(alignedImage)}`,
    `Statistic(mirrored)=${describeDistribution(mirroredImage)}`,
  ];
}

function constantFunctionSection(): Transcript {
  const constantWitness = buildTopVietorisConstantFunctionWitness<Pair, Bit>(() => ({
    product: environment.pairSpace,
    target: environment.bitSpace,
    map: () => 1,
    label: "tail constant map",
  }));
  const dependentWitness = buildTopVietorisConstantFunctionWitness<Pair, Bit>(() => ({
    product: environment.pairSpace,
    target: environment.bitSpace,
    map: (pair) => pair[0],
    label: "finite dependent map",
  }));

  const constantReport = checkTopVietorisConstantFunction(constantWitness, { spaceStructure });
  const dependentReport = checkTopVietorisConstantFunction(dependentWitness, { spaceStructure });

  return [
    "== Constant-function law ==",
    `Constant witness holds=${describeBoolean(constantReport.holds)}; value=${constantReport.constantValue}`,
    `Dependent witness holds=${describeBoolean(dependentReport.holds)}; independence=${describeBoolean(dependentReport.independence)}`,
    `Dependent details=${dependentReport.details}`,
  ];
}

export const stage071TopVietorisZeroOneScaffolding: RunnableExample = {
  id: "071",
  title: "Top/Vietoris zero-one scaffolding",
  outlineReference: 71,
  summary:
    "Kolmogorov witness adapters for the Vietoris Kleisli category with concrete priors/statistics and explicit Hewitt–Savage limitations",
  async run() {
    const logs: string[] = [
      ...productSection(),
      "",
      ...kolmogorovSection(),
      "",
      ...constantFunctionSection(),
      "",
      ...hewittSavageSection(),
      "",
      ...factorySection(),
    ];
    return { logs };
  },
};
