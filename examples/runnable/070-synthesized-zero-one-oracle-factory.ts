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

type ZeroOneSynthesisInput<A, XJ, T, XF = unknown> = {
  readonly prior: FinMarkov<A, XJ>;
  readonly statistic: FinMarkov<XJ, T>;
  readonly finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>;
  readonly symmetries?: ReadonlyArray<FiniteSymmetry<XJ>>;
  readonly label?: string;
};

type ZeroOneSynthesisWitness<A, XJ, XF, T> = {
  readonly kolmogorov: KolmogorovZeroOneWitness<A, XJ, T>;
  readonly symmetries?: ReadonlyArray<FiniteSymmetry<XJ>>;
  readonly label?: string;
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

type ZeroOneSynthesisReport<A, XJ, T> = {
  readonly holds: boolean;
  readonly kolmogorov: KolmogorovZeroOneReport<A, XJ, T>;
  readonly symmetryReport?: {
    readonly holds: boolean;
    readonly failures: ReadonlyArray<string>;
    readonly symmetryReports: ReadonlyArray<{
      readonly name: string;
      readonly kind: string;
      readonly priorInvariant: boolean;
      readonly statReport: { readonly holds: boolean; readonly details: string };
    }>;
  };
};

type FiniteSymmetry<XJ> = {
  readonly name: string;
  readonly sigmaHat: FinMarkov<XJ, XJ>;
  readonly kind?: "permutation" | "injection";
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean, show?: (value: T) => string) => Fin<T>;
  readonly detK: <X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y) => FinMarkov<X, Y>;
  readonly tensorObj: <X, Y>(X: Fin<X>, Y: Fin<Y>) => Fin<readonly [X, Y]>;
  readonly FinMarkov: new <X, Y>(X: Fin<X>, Y: Fin<Y>, k: (x: X) => Map<Y, number>) => FinMarkov<X, Y>;
};

type ZeroOneFactoryModule = {
  readonly makeZeroOneOracle: <A, XJ, T, XF = unknown>(input: ZeroOneSynthesisInput<A, XJ, T, XF>) => {
    readonly witness: ZeroOneSynthesisWitness<A, XJ, XF, T>;
    readonly check: (options?: { readonly tolerance?: number }) => ZeroOneSynthesisReport<A, XJ, T>;
  };
};

type FiniteSymmetryReportModule = unknown;

const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const zeroOneFactory = require("../../markov-zero-one-factory") as ZeroOneFactoryModule;
require("../../markov-permutation") as FiniteSymmetryReportModule;

const { mkFin, detK, tensorObj, FinMarkov } = markovCategory;
const { makeZeroOneOracle } = zeroOneFactory;

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

const swapPermutation: FiniteSymmetry<Pair> = {
  name: "swap",
  sigmaHat: detK(spaces.pair, spaces.pair, ([x, y]) => [y, x] as Pair),
};

const diagonalInjection: FiniteSymmetry<Pair> = {
  name: "diagonal",
  kind: "injection",
  sigmaHat: detK(spaces.pair, spaces.pair, ([x]) => [x, x] as Pair),
};

function runOracle(
  label: string,
  input: ZeroOneSynthesisInput<Label, Pair, Bit, Bit>,
): Transcript {
  const { witness, check } = makeZeroOneOracle(input);
  const report = check();
  const kolmogorov = report.kolmogorov;
  const symmetryReport = report.symmetryReport;
  const composite = kolmogorov.witness.prior.then(kolmogorov.witness.stat);
  const domainElement = kolmogorov.witness.prior.X.elems[0]!;
  const compositeDistribution = composite.k(domainElement);

  const symmetryLines = symmetryReport?.symmetryReports.map((entry) =>
    `    ${entry.name} [${entry.kind}]: prior=${describeBoolean(entry.priorInvariant)} statistic=${describeBoolean(
      entry.statReport.holds,
    )}`,
  ) ?? [];

  return [
    `== ${label} ==`,
    `Kolmogorov verdict: ${describeBoolean(kolmogorov.holds)} — ${kolmogorov.details}`,
    `  Deterministic composite=${describeBoolean(kolmogorov.deterministic)}; CI family=${describeBoolean(
      kolmogorov.ciFamilyVerified,
    )}`,
    `  Composite distribution=${describeDistribution(compositeDistribution)}`,
    `Symmetry report available: ${symmetryReport ? describeBoolean(symmetryReport.holds) : "no"}`,
    ...(symmetryReport ? symmetryLines : []),
    symmetryReport && symmetryReport.failures.length > 0
      ? `  Symmetry failures=${symmetryReport.failures.join("; ")}`
      : "  Symmetry failures=none",
  ];
}

const symmetricOracleInput: ZeroOneSynthesisInput<Label, Pair, Bit, Bit> = {
  label: "Symmetric parity oracle",
  prior: alignedPrior(),
  statistic: parityStatistic(),
  finiteMarginals: spaces.finiteMarginals,
  symmetries: [swapPermutation, diagonalInjection],
};

const asymmetricOracleInput: ZeroOneSynthesisInput<Label, Pair, Bit, Bit> = {
  label: "Asymmetric oracle",
  prior: detK(spaces.domain, spaces.pair, (label) =>
    label === "aligned" ? ([0, 1] as Pair) : ([1, 0] as Pair),
  ),
  statistic: parityStatistic(),
  finiteMarginals: spaces.finiteMarginals,
  symmetries: [swapPermutation],
};

const independenceOnlyInput: ZeroOneSynthesisInput<Label, Pair, Bit, Bit> = {
  label: "Kolmogorov without symmetries",
  prior: alignedPrior(),
  statistic: firstCoordinateStatistic(),
  finiteMarginals: spaces.finiteMarginals,
};

export const stage070SynthesizedZeroOneOracleFactory: RunnableExample = {
  id: "070",
  title: "Synthesized zero-one oracle factory",
  outlineReference: 70,
  summary:
    "Automated assembly of zero-one law oracles from reusable components, verifying the synthesized report",
  async run() {
    const logs: string[] = [
      ...runOracle(symmetricOracleInput.label ?? "Symmetric parity oracle", symmetricOracleInput),
      "",
      ...runOracle(asymmetricOracleInput.label ?? "Asymmetric oracle", asymmetricOracleInput),
      "",
      ...runOracle(independenceOnlyInput.label ?? "Kolmogorov without symmetries", independenceOnlyInput),
    ];
    return { logs };
  },
};
