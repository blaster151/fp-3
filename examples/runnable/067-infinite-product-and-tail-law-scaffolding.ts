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

type CylinderSection<J, X> = ReadonlyMap<J, X>;
type FiniteSubset<J> = ReadonlyArray<J>;
type ProjectiveLimitSection<J, X> = (index: J) => X;

type CountabilityWitness<J> = {
  readonly kind: string;
  readonly size?: number;
  readonly reason?: string;
  readonly sample?: ReadonlyArray<J>;
};

type CoordinateWitness<J> = {
  readonly index: J;
  readonly sigmaAlgebra: string;
  readonly standardBorel: boolean;
};

type MeasurabilityWitness<J> = {
  readonly kind: string;
  readonly coordinates?: ReadonlyArray<CoordinateWitness<J>>;
  readonly reason?: string;
};

type ProjectiveFamily<R, J, X, Carrier = ProjectiveLimitSection<J, X>> = {
  readonly semiring: CSRig<R>;
  readonly index: Iterable<J>;
  readonly countability?: CountabilityWitness<J>;
  readonly measurability?: MeasurabilityWitness<J>;
};

type DeterministicKolmogorovProductWitness<R, J, X, Carrier> = unknown;

type InfObj<R, J, X, Carrier = ProjectiveLimitSection<J, X>> = {
  readonly family: ProjectiveFamily<R, J, X, Carrier>;
  readonly deterministicWitness?: () => DeterministicKolmogorovProductWitness<R, J, X, Carrier>;
  readonly positivity?: { readonly kind: string; readonly indices?: ReadonlyArray<J> };
};

type MarkovInfiniteModule = {
  readonly independentIndexedProduct: <J, X>(
    R: CSRig<number>,
    index: ReadonlyArray<J>,
    coordinate: () => Dist<number, X>,
    options?: { readonly measurability?: MeasurabilityWitness<J>; readonly countability?: CountabilityWitness<J> },
  ) => ProjectiveFamily<number, J, X>;
  readonly independentInfObj: <J, X>(
    R: CSRig<number>,
    index: ReadonlyArray<J>,
    coordinate: () => Dist<number, X>,
    options?: { readonly measurability?: MeasurabilityWitness<J>; readonly countability?: CountabilityWitness<J> },
  ) => InfObj<number, J, X>;
};

type KolmogorovConsistencyResult<J> = {
  readonly ok: boolean;
  readonly failures: ReadonlyArray<{ readonly finite: FiniteSubset<J>; readonly larger: FiniteSubset<J> }>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
};

type TailInvarianceResult<J, Carrier> = {
  readonly ok: boolean;
  readonly counterexamples: ReadonlyArray<{ readonly original: Carrier; readonly modified: Carrier }>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
};

type KolmogorovExtensionResult<R, J, X, Carrier> =
  | {
      readonly ok: true;
      readonly baseSubset: FiniteSubset<J>;
      readonly measure: Dist<R, Carrier>;
      readonly reductions: ReadonlyArray<{ readonly ok: boolean; readonly subset: FiniteSubset<J> }>;
      readonly countable: boolean;
      readonly witness?: CountabilityWitness<J>;
      readonly measurable: boolean;
      readonly measurability?: MeasurabilityWitness<J>;
      readonly standardBorel: boolean;
    }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly countable: boolean;
      readonly witness?: CountabilityWitness<J>;
      readonly measurable: boolean;
      readonly measurability?: MeasurabilityWitness<J>;
      readonly standardBorel: boolean;
    };

type MarkovInfiniteOraclesModule = {
  readonly runKolmogorovConsistency: <J, X, Carrier>(
    family: ProjectiveFamily<number, J, X, Carrier>,
    tests: ReadonlyArray<{ readonly finite: FiniteSubset<J>; readonly larger: FiniteSubset<J> }>,
  ) => KolmogorovConsistencyResult<J>;
  readonly checkTailEventInvariance: <J, X, Carrier>(
    obj: InfObj<number, J, X, Carrier>,
    tailEvent: (carrier: Carrier) => Dist<number, boolean>,
    samples: ReadonlyArray<Carrier>,
    patches: ReadonlyArray<CylinderSection<J, X>>,
  ) => TailInvarianceResult<J, Carrier>;
  readonly checkKolmogorovExtensionUniversalProperty: <J, X, Carrier>(
    obj: InfObj<number, J, X, Carrier>,
    subsets: ReadonlyArray<FiniteSubset<J>>,
  ) => KolmogorovExtensionResult<number, J, X, Carrier>;
};

type DistModule = {
  readonly dirac: <R, X>(R: CSRig<R>) => (value: X) => Dist<R, X>;
};

type SemiringModule = {
  readonly Prob: CSRig<number>;
};

const markovInfinite = require("../../markov-infinite") as MarkovInfiniteModule;
const markovInfiniteOracles = require("../../markov-infinite-oracles") as MarkovInfiniteOraclesModule;
const distModule = require("../../dist") as DistModule;
const semiringUtils = require("../../semiring-utils") as SemiringModule;

const { independentIndexedProduct, independentInfObj } = markovInfinite;
const { runKolmogorovConsistency, checkTailEventInvariance, checkKolmogorovExtensionUniversalProperty } =
  markovInfiniteOracles;
const { dirac } = distModule;
const { Prob } = semiringUtils;

type Transcript = ReadonlyArray<string>;

const describeBoolean = (value: boolean): string => (value ? "yes" : "no");

const bernoulli = (p: number): Dist<number, number> => ({
  R: Prob,
  w: new Map<number, number>([
    [1, p],
    [0, 1 - p],
  ]),
});

const discreteWitness = (indices: ReadonlyArray<number>): MeasurabilityWitness<number> => ({
  kind: "standardBorel",
  coordinates: indices.map((index) => ({ index, sigmaAlgebra: "discrete", standardBorel: true })),
  reason: "Finite product of discrete Borel spaces",
});

const finiteCountability = (indices: ReadonlyArray<number>): CountabilityWitness<number> => ({
  kind: "finite",
  size: indices.length,
  sample: indices,
  reason: "Explicit enumeration of finite index set",
});

function consistencySection(): Transcript {
  const indices = [0, 1, 2];
  const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
    measurability: discreteWitness(indices),
    countability: finiteCountability(indices),
  });

  const tests: ReadonlyArray<{ finite: FiniteSubset<number>; larger: FiniteSubset<number> }> = [
    { finite: [0], larger: [0, 1] },
    { finite: [1, 2], larger: [0, 1, 2] },
  ];

  const report = runKolmogorovConsistency(family, tests);
  const failureLines = report.failures.map(
    (failure) => `  ✗ mismatch restricting ${failure.larger.join(", ")} to ${failure.finite.join(", ")}`,
  );

  return [
    "== Kolmogorov consistency across finite cylinders ==",
    `Witnessed consistency: ${describeBoolean(report.ok)} (countable=${describeBoolean(report.countable)}, measurable=${describeBoolean(
      report.measurable,
    )}, standard Borel=${describeBoolean(report.standardBorel)})`,
    failureLines.length > 0 ? "Failures:" : "No marginal mismatches detected",
    ...failureLines,
  ];
}

function tailInvarianceSection(): Transcript {
  const indices = [0, 1, 2, 3, 4, 5];
  const obj = independentInfObj(Prob, indices, () => bernoulli(0.5), {
    measurability: discreteWitness(indices),
  });

  const deltaBool = dirac<number, boolean>(Prob);
  const constantZero: ProjectiveLimitSection<number, number> = () => 0;
  const trailingOne: ProjectiveLimitSection<number, number> = (i) => (i >= 4 ? 1 : 0);

  const tailEvent = (section: ProjectiveLimitSection<number, number>) => deltaBool(section(5) === 0);
  const patches: ReadonlyArray<CylinderSection<number, number>> = [
    new Map<number, number>([[0, 1]]),
    new Map<number, number>([[5, 1]]),
  ];

  const report = checkTailEventInvariance(obj, tailEvent, [constantZero, trailingOne], patches);

  const counterexamples = report.counterexamples.map((example, index) => {
    const original = indices.map((i) => example.original(i)).join("");
    const modified = indices.map((i) => example.modified(i)).join("");
    return `  ✗ Counterexample ${index + 1}: ${original} → ${modified}`;
  });

  return [
    "== Tail-event invariance under finite patches ==",
    `Invariant tail event: ${describeBoolean(report.ok)} (countable=${describeBoolean(report.countable)}, measurable=${describeBoolean(
      report.measurable,
    )})`,
    counterexamples.length > 0 ? "Counterexamples:" : "All sampled sections preserved the tail predicate",
    ...counterexamples,
  ];
}

function extensionSection(): Transcript {
  const indices = [0, 1, 2, 3];
  const obj = independentInfObj(Prob, indices, () => bernoulli(0.5), {
    measurability: discreteWitness(indices),
    countability: finiteCountability(indices),
  });

  const subsets: ReadonlyArray<FiniteSubset<number>> = [[0], [1], [0, 1], [0, 1, 2]];
  const result = checkKolmogorovExtensionUniversalProperty(obj, subsets);

  if (!result.ok) {
    return [
      "== Kolmogorov extension universal property ==",
      `Extension failed: ${result.reason}`,
      `Countable index: ${describeBoolean(result.countable)}, measurable=${describeBoolean(result.measurable)}`,
    ];
  }

  const reductionLines = result.reductions.map((reduction) =>
    `  ${reduction.subset.join(", ")} → consistent: ${describeBoolean(reduction.ok)}`,
  );

  return [
    "== Kolmogorov extension universal property ==",
    `Extension constructed on base subset {${result.baseSubset.join(", ")}}`,
    `Countable index: ${describeBoolean(result.countable)}, measurable=${describeBoolean(result.measurable)}, standard Borel=${describeBoolean(
      result.standardBorel,
    )}`,
    "Finite marginal reductions:",
    ...reductionLines,
  ];
}

export const stage067InfiniteProductAndTailLawScaffolding: RunnableExample = {
  id: "067",
  title: "Infinite product and tail-law scaffolding",
  outlineReference: 67,
  summary:
    "Assemble Kolmogorov-consistent cylinders, probe tail invariance, and check extension universal properties for finite Markov tensor products.",
  async run() {
    const sections: ReadonlyArray<Transcript> = [
      consistencySection(),
      [""],
      tailInvarianceSection(),
      [""],
      extensionSection(),
    ];

    const logs = sections.flatMap((section, index) =>
      index === sections.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
