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
  matrix(): number[][];
  pretty?(digits?: number): string;
};

type DeterminismLemmaWitness<A, X, T> = {
  readonly prior: FinMarkov<A, X>;
  readonly stat: FinMarkov<X, T>;
  readonly label?: string;
};

type DeterminismLemmaReport<A, X, T> = {
  readonly holds: boolean;
  readonly witness: DeterminismLemmaWitness<A, X, T>;
  readonly composite: FinMarkov<A, T>;
  readonly deterministic: boolean;
  readonly ciVerified: boolean;
  readonly independence: MarkovConditionalReport<A>;
  readonly details: string;
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
  readonly composite: FinMarkov<A, T>;
  readonly deterministic: boolean;
  readonly ciFamilyVerified: boolean;
  readonly failures: ReadonlyArray<{ readonly F: string; readonly reason: string }>;
  readonly globalIndependence?: MarkovConditionalReport<A>;
  readonly marginalChecks: ReadonlyArray<{ readonly F: string; readonly report: MarkovConditionalReport<A> }>;
  readonly details: string;
};

type HewittSavageReport<A, XJ, T> = KolmogorovZeroOneReport<A, XJ, T> & {
  readonly permutationInvariant: boolean;
  readonly permutationFailures: ReadonlyArray<string>;
  readonly permutationReport?: {
    readonly symmetryReports: ReadonlyArray<{
      readonly name: string;
      readonly kind: string;
      readonly priorInvariant: boolean;
      readonly statReport: { readonly holds: boolean; readonly details: string };
    }>;
  };
};

type MarkovConditionalReport<A> = {
  readonly holds: boolean;
  readonly details: string;
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

type DeterminismLemmaModule = {
  readonly buildDeterminismLemmaWitness: <A, X, T>(
    prior: FinMarkov<A, X>,
    stat: FinMarkov<X, T>,
    options?: { readonly label?: string },
  ) => DeterminismLemmaWitness<A, X, T>;
  readonly checkDeterminismLemma: <A, X, T>(
    witness: DeterminismLemmaWitness<A, X, T>,
    options?: { readonly tolerance?: number },
  ) => DeterminismLemmaReport<A, X, T>;
};

type MarkovZeroOneModule = {
  readonly buildKolmogorovZeroOneWitness: <A, XJ, XF, T>(
    prior: FinMarkov<A, XJ>,
    stat: FinMarkov<XJ, T>,
    finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
    options?: { readonly label?: string },
  ) => KolmogorovZeroOneWitness<A, XJ, T>;
  readonly checkKolmogorovZeroOne: <A, XJ, T>(
    witness: KolmogorovZeroOneWitness<A, XJ, T>,
    options?: { readonly tolerance?: number },
  ) => KolmogorovZeroOneReport<A, XJ, T>;
  readonly buildHewittSavageWitness: <A, XJ, XF, T>(
    prior: FinMarkov<A, XJ>,
    stat: FinMarkov<XJ, T>,
    finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
    permutations: ReadonlyArray<FiniteSymmetry<XJ>>,
    options?: { readonly label?: string },
  ) => KolmogorovZeroOneWitness<A, XJ, T>;
  readonly checkHewittSavageZeroOne: <A, XJ, T>(
    witness: KolmogorovZeroOneWitness<A, XJ, T>,
    options?: { readonly tolerance?: number },
  ) => HewittSavageReport<A, XJ, T>;
};

type MarkovPermutationModule = {
  readonly FiniteSymmetryKind: unknown;
};

const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const determinismLemma = require("../../markov-determinism-lemma") as DeterminismLemmaModule;
const markovZeroOne = require("../../markov-zero-one") as MarkovZeroOneModule;
require("../../markov-permutation") as MarkovPermutationModule;

const { mkFin, detK, tensorObj, FinMarkov } = markovCategory;
const { buildDeterminismLemmaWitness, checkDeterminismLemma } = determinismLemma;
const { buildKolmogorovZeroOneWitness, checkKolmogorovZeroOne, buildHewittSavageWitness, checkHewittSavageZeroOne } =
  markovZeroOne;

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

function correlatedPrior(): FinMarkov<Label, Pair> {
  return new FinMarkov(spaces.domain, spaces.pair, (label) => {
    if (label === "aligned") {
      return new Map<Pair, number>([
        [[0, 0], 0.5],
        [[0, 1], 0.5],
      ]);
    }
    return new Map<Pair, number>([
      [[1, 0], 0.5],
      [[1, 1], 0.5],
    ]);
  });
}

function parityStatistic(): FinMarkov<Pair, Bit> {
  return detK(spaces.pair, spaces.bit, ([x, y]) => ((x ^ y) as Bit));
}

function firstCoordinateStatistic(): FinMarkov<Pair, Bit> {
  return detK(spaces.pair, spaces.bit, ([x]) => x);
}

function noisyStatistic(): FinMarkov<Pair, Bit> {
  return new FinMarkov(spaces.pair, spaces.bit, ([x, y]) => {
    if (x === y) {
      return new Map<Bit, number>([[x, 0.6], [((1 - x) as Bit), 0.4]]);
    }
    return new Map<Bit, number>([
      [0, 0.5],
      [1, 0.5],
    ]);
  });
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

function determinismLemmaSection(): Transcript {
  const deterministicWitness = buildDeterminismLemmaWitness(alignedPrior(), firstCoordinateStatistic(), {
    label: "deterministic",
  });
  const deterministicReport = checkDeterminismLemma(deterministicWitness);

  const noisyWitness = buildDeterminismLemmaWitness(alignedPrior(), noisyStatistic(), {
    label: "noisy",
  });
  const noisyReport = checkDeterminismLemma(noisyWitness);

  return [
    "== Determinism lemma diagnostics ==",
    `Deterministic case: holds=${describeBoolean(deterministicReport.holds)} — ${deterministicReport.details}`,
    `  CI verified=${describeBoolean(deterministicReport.ciVerified)}; composite distribution=${describeDistribution(
      deterministicReport.composite.k("aligned"),
    )}`,
    `Noisy case: holds=${describeBoolean(noisyReport.holds)} — ${noisyReport.details}`,
    `  CI verified=${describeBoolean(noisyReport.ciVerified)}; composite distribution=${describeDistribution(
      noisyReport.composite.k("aligned"),
    )}`,
  ];
}

function kolmogorovSection(): Transcript {
  const witness = buildKolmogorovZeroOneWitness(alignedPrior(), firstCoordinateStatistic(), spaces.finiteMarginals, {
    label: "aligned first",
  });
  const report = checkKolmogorovZeroOne(witness);

  const correlatedWitness = buildKolmogorovZeroOneWitness(correlatedPrior(), parityStatistic(), spaces.finiteMarginals, {
    label: "correlated parity",
  });
  const correlatedReport = checkKolmogorovZeroOne(correlatedWitness);

  const marginalLines = report.marginalChecks.map((entry) =>
    `    ${entry.F}: ${describeBoolean(entry.report.holds)} (${entry.report.details})`,
  );
  const correlatedMarginals = correlatedReport.marginalChecks.map((entry) =>
    `    ${entry.F}: ${describeBoolean(entry.report.holds)} (${entry.report.details})`,
  );

  return [
    "== Kolmogorov zero-one theorem ==",
    `Aligned prior: holds=${describeBoolean(report.holds)} — ${report.details}`,
    `  Deterministic composite=${describeBoolean(report.deterministic)}; CI family=${describeBoolean(
      report.ciFamilyVerified,
    )}`,
    ...marginalLines,
    `Correlated prior: holds=${describeBoolean(correlatedReport.holds)} — ${correlatedReport.details}`,
    `  Deterministic composite=${describeBoolean(correlatedReport.deterministic)}; CI family=${describeBoolean(
      correlatedReport.ciFamilyVerified,
    )}`,
    ...correlatedMarginals,
  ];
}

function hewittSavageSection(): Transcript {
  const symmetricWitness = buildHewittSavageWitness(
    alignedPrior(),
    parityStatistic(),
    spaces.finiteMarginals,
    [swapPermutation, diagonalInjection],
    { label: "symmetric parity" },
  );
  const symmetricReport = checkHewittSavageZeroOne(symmetricWitness);

  const asymmetricWitness = buildHewittSavageWitness(
    detK(spaces.domain, spaces.pair, (label) =>
      label === "aligned" ? ([0, 1] as Pair) : ([1, 0] as Pair),
    ),
    parityStatistic(),
    spaces.finiteMarginals,
    [swapPermutation],
    { label: "asymmetric" },
  );
  const asymmetricReport = checkHewittSavageZeroOne(asymmetricWitness);

  const symmetryLines = symmetricReport.permutationReport?.symmetryReports.map((entry) =>
    `    ${entry.name} [${entry.kind}]: prior=${describeBoolean(entry.priorInvariant)} statistic=${describeBoolean(
      entry.statReport.holds,
    )}`,
  ) ?? ["    (none)"];

  return [
    "== Hewitt–Savage zero-one theorem ==",
    `Symmetric scenario: holds=${describeBoolean(symmetricReport.holds)} — ${symmetricReport.details}`,
    `  Permutation invariant=${describeBoolean(symmetricReport.permutationInvariant)}`,
    ...symmetryLines,
    `Asymmetric scenario: holds=${describeBoolean(asymmetricReport.holds)} — ${asymmetricReport.details}`,
    `  Permutation invariant=${describeBoolean(asymmetricReport.permutationInvariant)}; failures=${
      asymmetricReport.permutationFailures.length === 0
        ? "none"
        : asymmetricReport.permutationFailures.join("; ")
    }`,
  ];
}

export const stage069MarkovCategoryZeroOneTheorems: RunnableExample = {
  id: "069",
  title: "Markov category zero-one theorems",
  outlineReference: 69,
  summary:
    "Determinism lemma witnesses, Kolmogorov/Hewitt–Savage zero-one oracles, and symmetry-aware oracle synthesis over finite Markov categories",
  async run() {
    const logs: string[] = [
      ...determinismLemmaSection(),
      "",
      ...kolmogorovSection(),
      "",
      ...hewittSavageSection(),
    ];
    return { logs };
  },
};
