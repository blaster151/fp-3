import { RunnableExample } from "./types";

declare function require(id: string): any;

type Rig<R> = {
  readonly zero: R;
  readonly one: R;
  readonly add: (a: R, b: R) => R;
  readonly mul: (a: R, b: R) => R;
  readonly eq: (a: R, b: R) => boolean;
  readonly toString?: (value: R) => string;
  readonly enumerate?: () => ReadonlyArray<R>;
};

type Pair<R> = readonly [R, R];

type RigEntry<R> = {
  readonly label: string;
  readonly rig: Rig<R>;
  readonly sampleA: R;
  readonly sampleB: R;
  readonly description: string;
  readonly zeroDivisorWitness?: string;
};

type Ghost = 0 | 1 | 2;

type SemiringModule = {
  readonly Prob: Rig<number>;
  readonly BoolRig: Rig<boolean>;
  readonly LogProb: Rig<number>;
  readonly MaxPlus: Rig<number>;
  readonly MinPlus: Rig<number>;
  readonly GhostRig: Rig<Ghost> & { enumerate: () => ReadonlyArray<Ghost> };
  readonly directSum: <R>(rig: Rig<R>) => Rig<Pair<R>>;
  readonly isEntire: <R>(rig: Rig<R>, probes?: number) => boolean;
};

const semiringModule = require("../../semiring-utils") as SemiringModule;

const { Prob, BoolRig, LogProb, MaxPlus, MinPlus, GhostRig, directSum, isEntire } = semiringModule;

function formatValue<R>(rig: Rig<R>, value: R): string {
  if (rig.toString) {
    return rig.toString(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}

function describeRig<R>(entry: RigEntry<R>): readonly string[] {
  const { rig, label, sampleA, sampleB, description, zeroDivisorWitness } = entry;
  const sum = rig.add(sampleA, sampleB);
  const product = rig.mul(sampleA, sampleB);
  const equality = rig.eq(sampleA, sampleA);
  const entire = isEntire(rig as Rig<unknown>);
  const carrier = rig.enumerate?.().map((value) => formatValue(rig, value));

  return [
    `== ${label} ==`,
    description,
    `Sample elements: a=${formatValue(rig, sampleA)}, b=${formatValue(rig, sampleB)}`,
    `Addition a⊕b → ${formatValue(rig, sum)}`,
    `Multiplication a⊗b → ${formatValue(rig, product)}`,
    `Equality witness eq(a,a) → ${equality ? "true" : "false"}`,
    `Entire rig? → ${entire ? "yes" : "no"}`,
    carrier ? `Enumerated carrier → ${carrier.join(", ")}` : "Enumerated carrier → (infinite/implicit)",
    ...(zeroDivisorWitness ? [zeroDivisorWitness] : []),
  ];
}

function buildEntries(): ReadonlyArray<RigEntry<any>> {
  const directSumProb = directSum(Prob) as Rig<Pair<number>>;
  const directSumWitness: Pair<number> = [1, 0];
  const directSumPartner: Pair<number> = [0, 1];
  const zeroProduct = directSumProb.mul(directSumWitness, directSumPartner);

  return [
    {
      label: "Probability rig (ℝ≥0, +, ×)",
      rig: Prob,
      sampleA: 0.4,
      sampleB: 0.35,
      description: "Canonical semiring for probabilistic weights with floating equality tolerance.",
    },
    {
      label: "Boolean rig (∨, ∧)",
      rig: BoolRig,
      sampleA: true,
      sampleB: false,
      description: "Logical rig modelling predicates; addition is disjunction and multiplication is conjunction.",
    },
    {
      label: "Log-probability rig (ℝ ∪ {−∞}, log-sum-exp)",
      rig: LogProb,
      sampleA: Math.log(0.2),
      sampleB: Math.log(0.5),
      description: "Log-domain rig stabilising numerical computations for probability products and sums.",
    },
    {
      label: "Max-plus rig (tropical)",
      rig: MaxPlus,
      sampleA: 4,
      sampleB: 2,
      description: "Tropical semiring where addition is max and multiplication is standard addition.",
    },
    {
      label: "Min-plus rig",
      rig: MinPlus,
      sampleA: 6,
      sampleB: 3,
      description: "Dual tropical rig with min as addition and ordinary addition as multiplication.",
    },
    {
      label: "Ghost rig Rε = {0, ε, 1}",
      rig: GhostRig,
      sampleA: GhostRig.enumerate()[1]!,
      sampleB: GhostRig.enumerate()[2]!,
      description: "Three-point rig capturing 0, an infinitesimal ε, and 1 with idempotent addition.",
    },
    {
      label: "Direct sum ℝ⊕ℝ",
      rig: directSumProb,
      sampleA: [0.7, 0.1],
      sampleB: [0.3, 0.6],
      description: "Product rig used for counterexamples; addition and multiplication act componentwise.",
      zeroDivisorWitness: `Zero divisor witness: ${formatValue(directSumProb, directSumWitness)} ⊗ ${formatValue(
        directSumProb,
        directSumPartner,
      )} = ${formatValue(directSumProb, zeroProduct)}`,
    },
  ];
}

export const stage048SemiringRigRegistryAndEntireCheckHarness: RunnableExample = {
  id: "048",
  title: "Semiring rig registry and entire-check harness",
  outlineReference: 48,
  summary:
    "Summarise canonical probability, Boolean, tropical, log-domain, ghost, and direct-sum rigs with entire checks and carrier diagnostics for semiring-aware algorithms.",
  async run() {
    const logs = buildEntries().flatMap((entry, index, array) => {
      const lines = describeRig(entry);
      return index === array.length - 1 ? lines : [...lines, ""];
    });

    return { logs };
  },
};
