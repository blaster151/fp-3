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
  readonly tolerance: number;
  readonly globalIndependence?: MarkovConditionalReport<A>;
  readonly marginalChecks: ReadonlyArray<{ readonly F: string; readonly report: MarkovConditionalReport<A> }>;
  readonly details: string;
};

type MarkovConditionalReport<A> = {
  readonly holds: boolean;
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

type BorelKolmogorovOptions<Ω, XJ, T> = {
  readonly label?: string;
  readonly omegaSupport: ReadonlyArray<readonly [Ω, number]>;
  readonly productSpace: Fin<XJ>;
  readonly tailSpace?: Fin<T>;
};

type BorelHewittSavageOptions<Ω, XJ, T> = BorelKolmogorovOptions<Ω, XJ, T>;

type BorelPermutation<XJ> = {
  readonly name: string;
  readonly sigmaHat: (xj: XJ) => XJ;
  readonly kind?: "permutation" | "injection";
};

type BorelModule = {
  readonly buildBorelKolmogorovWitness: <Ω, Coord, XJ, XF, T>(
    omega: () => Ω,
    coords: ReadonlyArray<(omega: Ω) => Coord>,
    product: (values: ReadonlyArray<Coord>) => XJ,
    finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
    tail: (xj: XJ) => T,
    options: BorelKolmogorovOptions<Ω, XJ, T>,
  ) => KolmogorovZeroOneWitness<unknown, XJ, T>;
  readonly checkBorelKolmogorovZeroOne: <XJ, T>(
    witness: KolmogorovZeroOneWitness<unknown, XJ, T>,
    options?: { readonly tolerance?: number },
  ) => KolmogorovZeroOneReport<unknown, XJ, T>;
  readonly buildBorelHewittSavageWitness: <Ω, Coord, XJ, XF, T>(
    omega: () => Ω,
    coords: ReadonlyArray<(omega: Ω) => Coord>,
    product: (values: ReadonlyArray<Coord>) => XJ,
    finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
    permutations: ReadonlyArray<BorelPermutation<XJ>>,
    statistic: (xj: XJ) => T,
    options: BorelHewittSavageOptions<Ω, XJ, T>,
  ) => KolmogorovZeroOneWitness<unknown, XJ, T>;
  readonly checkBorelHewittSavageZeroOne: <XJ, T>(
    witness: KolmogorovZeroOneWitness<unknown, XJ, T>,
    options?: { readonly tolerance?: number },
  ) => HewittSavageReport<unknown, XJ, T>;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>, eq?: (a: T, b: T) => boolean, show?: (value: T) => string) => Fin<T>;
  readonly detK: <X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y) => FinMarkov<X, Y>;
};

const borel = require("../../borelstoch-examples") as BorelModule;
const markovCategory = require("../../markov-category") as MarkovCategoryModule;

const { buildBorelKolmogorovWitness, checkBorelKolmogorovZeroOne, buildBorelHewittSavageWitness, checkBorelHewittSavageZeroOne } =
  borel;
const { mkFin, detK } = markovCategory;

type Coin = "H" | "T";
type Triple = readonly [Coin, Coin, Coin];
type Tail = 0 | 1;

type Transcript = ReadonlyArray<string>;

type Scenario = {
  readonly label: string;
  readonly omegaSupport: ReadonlyArray<readonly [Triple, number]>;
  readonly permutations: ReadonlyArray<BorelPermutation<Triple>>;
  readonly tail: (triple: Triple) => Tail;
};

const describeBoolean = (value: boolean): string => (value ? "yes" : "no");

const describeValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(describeValue).join(", ")}]`;
  }
  if (value && typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0) {
    return "•";
  }
  return String(value);
};

const describeDistribution = <Y>(dist: Map<Y, number>): string => {
  const entries = Array.from(dist.entries());
  if (entries.length === 0) return "(empty)";
  return entries
    .map(([value, weight]) => `${describeValue(value)}↦${weight.toFixed(3)}`)
    .join(", ");
};

function makeCoinSpaces(): {
  readonly coin: Fin<Coin>;
  readonly triple: Fin<Triple>;
  readonly finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<Triple, Coin>>;
  readonly coords: ReadonlyArray<(omega: Triple) => Coin>;
  readonly product: (values: ReadonlyArray<Coin>) => Triple;
} {
  const coin = mkFin<Coin>(["H", "T"], (a, b) => a === b, (value) => value);

  const triples: Triple[] = [];
  for (const a of coin.elems) {
    for (const b of coin.elems) {
      for (const c of coin.elems) {
        triples.push([a, b, c] as const);
      }
    }
  }
  const triple = mkFin<Triple>(
    triples,
    (left, right) => left[0] === right[0] && left[1] === right[1] && left[2] === right[2],
    ([a, b, c]) => `(${a}, ${b}, ${c})`,
  );

  const coords: ReadonlyArray<(omega: Triple) => Coin> = [
    (omega) => omega[0],
    (omega) => omega[1],
    (omega) => omega[2],
  ];

  const product = (values: ReadonlyArray<Coin>): Triple => [values[0], values[1], values[2]] as Triple;

  const finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<Triple, Coin>> = [
    { F: "X₀", piF: detK(triple, coin, ([x]) => x) },
    { F: "X₁", piF: detK(triple, coin, ([, y]) => y) },
    { F: "X₂", piF: detK(triple, coin, ([,, z]) => z) },
  ];

  return { coin, triple, finiteMarginals, coords, product };
}

function independentSupport(triple: Fin<Triple>): ReadonlyArray<readonly [Triple, number]> {
  const head = 0.6;
  const tail = 0.4;
  return triple.elems.map((point) => {
    const heads = point.reduce((acc, coin) => acc + (coin === "H" ? 1 : 0), 0);
    const weight = Math.pow(head, heads) * Math.pow(tail, 3 - heads);
    return [point, weight] as const;
  });
}

function correlatedSupport(triple: Fin<Triple>): ReadonlyArray<readonly [Triple, number]> {
  return [
    [["H", "H", "H"], 0.4],
    [["H", "H", "T"], 0.2],
    [["T", "H", "T"], 0.2],
    [["T", "T", "T"], 0.2],
  ] as const;
}

function canonicalTail(triple: Triple): Tail {
  const heads = triple.reduce((acc, coin) => acc + (coin === "H" ? 1 : 0), 0);
  return heads >= 2 ? 1 : 0;
}

function asymTail(triple: Triple): Tail {
  return triple[0] === "H" ? 1 : 0;
}

function permutationGenerators(): ReadonlyArray<BorelPermutation<Triple>> {
  return [
    {
      name: "swap(0,1)",
      sigmaHat: ([a, b, c]) => [b, a, c] as Triple,
      kind: "permutation",
    },
    {
      name: "cycle", // (0 1 2)
      sigmaHat: ([a, b, c]) => [c, a, b] as Triple,
      kind: "permutation",
    },
  ];
}

function summarizeKolmogorov(report: KolmogorovZeroOneReport<unknown, Triple, Tail>): Transcript {
  const domain = report.witness.prior.X.elems;
  const marginalLines = report.marginalChecks.map((entry) =>
    `  ${entry.F}: ${describeBoolean(entry.report.holds)} (${entry.report.details})`,
  );
  const globalLine = report.globalIndependence
    ? `Global independence: ${describeBoolean(report.globalIndependence.holds)} (${report.globalIndependence.details})`
    : "Global independence: (not evaluated)";
  const failureSummary =
    report.failures.length === 0
      ? "none"
      : report.failures.map((failure) => `${failure.F}: ${failure.reason}`).join("; ");
  const compositeLines = domain.map((input) => {
    const distribution = report.composite.k(input as unknown);
    return `  ${describeValue(input)} ↦ ${describeDistribution(distribution)}`;
  });

  return [
    `Kolmogorov verdict: ${describeBoolean(report.holds)} — ${report.details}`,
    `Deterministic composite: ${describeBoolean(report.deterministic)}`,
    `CI family verified: ${describeBoolean(report.ciFamilyVerified)}`,
    globalLine,
    "Finite marginal checks:",
    ...marginalLines,
    `Failures: ${failureSummary}`,
    "Composite distribution:",
    ...compositeLines,
  ];
}

function summarizePermutation(report: HewittSavageReport<unknown, Triple, Tail>): Transcript {
  const symmetryLines = report.permutationReport?.symmetryReports.map((entry) =>
    `  ${entry.name} [${entry.kind}]: prior=${describeBoolean(entry.priorInvariant)}, statistic=${describeBoolean(
      entry.statReport.holds,
    )} (${entry.statReport.details})`,
  ) ?? ["  (none)"];
  const failureSummary =
    report.permutationFailures.length === 0 ? "none" : report.permutationFailures.join("; ");

  return [
    `Hewitt–Savage verdict: ${describeBoolean(report.holds)} — ${report.details}`,
    `Permutation invariant: ${describeBoolean(report.permutationInvariant)}`,
    "Symmetry diagnostics:",
    ...symmetryLines,
    `Permutation failures: ${failureSummary}`,
  ];
}

function buildKolmogorovTranscript(label: string, scenario: Scenario, spaces: ReturnType<typeof makeCoinSpaces>): Transcript {
  const witness = buildBorelKolmogorovWitness(
    () => spaces.triple.elems[0]!,
    spaces.coords,
    spaces.product,
    spaces.finiteMarginals,
    scenario.tail,
    {
      label,
      omegaSupport: scenario.omegaSupport,
      productSpace: spaces.triple,
    },
  );
  const report = checkBorelKolmogorovZeroOne(witness);
  const root = witness.prior.X.elems[0]!;
  const prior = witness.prior.k(root);

  return [
    `== ${label}: Kolmogorov adapter ==`,
    `Normalized ω-support → X_J: ${describeDistribution(prior)}`,
    ...summarizeKolmogorov(report),
  ];
}

function buildHewittSavageTranscript(
  label: string,
  scenario: Scenario,
  spaces: ReturnType<typeof makeCoinSpaces>,
): Transcript {
  const witness = buildBorelHewittSavageWitness(
    () => spaces.triple.elems[0]!,
    spaces.coords,
    spaces.product,
    spaces.finiteMarginals,
    scenario.permutations,
    scenario.tail,
    {
      label,
      omegaSupport: scenario.omegaSupport,
      productSpace: spaces.triple,
    },
  );
  const report = checkBorelHewittSavageZeroOne(witness);
  const root = witness.prior.X.elems[0]!;
  const prior = witness.prior.k(root);

  return [
    `== ${label}: Hewitt–Savage adapter ==`,
    `Normalized ω-support → X_J: ${describeDistribution(prior)}`,
    ...summarizeKolmogorov(report),
    ...summarizePermutation(report),
  ];
}

const spaces = makeCoinSpaces();

const symmetricScenario: Scenario = {
  label: "Symmetric tail event",
  omegaSupport: independentSupport(spaces.triple),
  permutations: permutationGenerators(),
  tail: canonicalTail,
};

const asymmetricSupportScenario: Scenario = {
  label: "Asymmetric ω-support",
  omegaSupport: correlatedSupport(spaces.triple),
  permutations: permutationGenerators(),
  tail: canonicalTail,
};

const asymmetricTailScenario: Scenario = {
  label: "Tail depends on first coordinate",
  omegaSupport: independentSupport(spaces.triple),
  permutations: permutationGenerators(),
  tail: asymTail,
};

export const stage068BorelStochasticZeroOneAdapters: RunnableExample = {
  id: "068",
  title: "Borel–Stochastic zero-one adapters",
  outlineReference: 68,
  summary:
    "Convert measure-theoretic samplers and indicator predicates into Kolmogorov and Hewitt–Savage witnesses by canonicalizing product supports and finite symmetry actions over explicit Fin carriers",
  async run() {
    const logs: string[] = [
      ...buildKolmogorovTranscript(symmetricScenario.label, symmetricScenario, spaces),
      "",
      ...buildHewittSavageTranscript(symmetricScenario.label, symmetricScenario, spaces),
      "",
      ...buildKolmogorovTranscript(asymmetricSupportScenario.label, asymmetricSupportScenario, spaces),
      "",
      ...buildHewittSavageTranscript(asymmetricTailScenario.label, asymmetricTailScenario, spaces),
    ];
    return { logs };
  },
};
