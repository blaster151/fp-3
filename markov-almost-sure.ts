// 🔮 BEGIN_MATH: MarkovAlmostSureEquality
// 📝 Brief: Recognize p-almost-sure equality between Markov kernels.
// 🏗️ Domain: Finite Markov categories with explicit copy/discard structure.
// 🔗 Integration: Extends FinMarkov tooling with witnesses, support tracking, and executable oracles.
// 📋 Plan:
//   1. Bundle the morphisms (p, f, g) into a reusable witness with label metadata.
//   2. Analyze the support of p to identify which X-values matter for almost-sure comparison.
//   3. Compare f and g on that support, report counterexamples, and expose the shared composite when they agree.

import type { Eq, Kernel } from "./markov-category";
import { FinMarkov, MarkovCategory } from "./markov-category";

const DEFAULT_TOLERANCE = 1e-9;

function pushUnique<T>(list: T[], value: T, eq: Eq<T>): void {
  if (!list.some((item) => eq(item, value))) {
    list.push(value);
  }
}

interface SupportContribution<A> {
  readonly input: A;
  readonly weight: number;
}

export interface SupportRecord<A, X> {
  readonly value: X;
  readonly totalMass: number;
  readonly contributions: ReadonlyArray<SupportContribution<A>>;
}

export interface DistributionDifference<Y> {
  readonly value: Y;
  readonly left: number;
  readonly right: number;
}

export interface AlmostSureFailure<A, X, Y> {
  readonly supportPoint: X;
  readonly sources: ReadonlyArray<A>;
  readonly differences: ReadonlyArray<DistributionDifference<Y>>;
}

export interface MarkovAlmostSureWitness<A, X, Y> {
  readonly prior: FinMarkov<A, X>;
  readonly left: FinMarkov<X, Y>;
  readonly right: FinMarkov<X, Y>;
  readonly label?: string;
}

export interface MarkovAlmostSureReport<A, X, Y> {
  readonly holds: boolean;
  readonly witness: MarkovAlmostSureWitness<A, X, Y>;
  readonly tolerance: number;
  readonly support: ReadonlyArray<SupportRecord<A, X>>;
  readonly failures: ReadonlyArray<AlmostSureFailure<A, X, Y>>;
  readonly leftComposite: FinMarkov<A, Y>;
  readonly rightComposite: FinMarkov<A, Y>;
  readonly composite?: FinMarkov<A, Y>;
  readonly equalComposite: boolean;
  readonly details: string;
}

export interface MarkovAlmostSureWitnessOptions {
  readonly label?: string;
}

export interface MarkovAlmostSureCheckOptions {
  readonly tolerance?: number;
}

export function buildMarkovAlmostSureWitness<A, X, Y>(
  prior: FinMarkov<A, X>,
  left: FinMarkov<X, Y>,
  right: FinMarkov<X, Y>,
  options: MarkovAlmostSureWitnessOptions = {},
): MarkovAlmostSureWitness<A, X, Y> {
  if (prior.Y !== left.X || prior.Y !== right.X) {
    throw new Error("Almost-sure witness requires prior codomain to match left/right domains.");
  }
  if (left.Y !== right.Y) {
    throw new Error("Almost-sure witness requires left/right codomains to agree.");
  }
  return {
    prior,
    left,
    right,
    ...(options.label !== undefined ? { label: options.label } : {}),
  };
}

function findSupportRecord<A, X>(records: Array<{ value: X; totalMass: number; contributions: SupportContribution<A>[] }>, value: X, eq: Eq<X>) {
  for (const record of records) {
    if (eq(record.value, value)) return record;
  }
  return undefined;
}

function collectSupport<A, X>(prior: FinMarkov<A, X>, tolerance: number): SupportRecord<A, X>[] {
  const records: Array<{ value: X; totalMass: number; contributions: SupportContribution<A>[] }> = [];
  const { X: domain, Y: codomain } = prior;
  for (const a of domain.elems) {
    const dist = prior.k(a);
    for (const [x, weight] of dist) {
      if (weight <= tolerance) continue;
      let record = findSupportRecord(records, x, codomain.eq);
      if (!record) {
        record = { value: x, totalMass: 0, contributions: [] };
        records.push(record);
      }
      record.totalMass += weight;
      const contrib = record.contributions.find((entry) => domain.eq(entry.input, a));
      if (contrib) {
        contrib.weight += weight;
      } else {
        record.contributions.push({ input: a, weight });
      }
    }
  }
  return records.map((record) => ({
    value: record.value,
    totalMass: record.totalMass,
    contributions: record.contributions,
  }));
}

function diffDistributions<X, Y>(
  left: Kernel<X, Y>,
  right: Kernel<X, Y>,
  point: X,
  tolerance: number,
): DistributionDifference<Y>[] {
  const dl = left(point);
  const dr = right(point);
  const values = new Set<Y>([...dl.keys(), ...dr.keys()]);
  const diffs: DistributionDifference<Y>[] = [];
  for (const y of values) {
    const lv = dl.get(y) ?? 0;
    const rv = dr.get(y) ?? 0;
    if (Math.abs(lv - rv) > tolerance) {
      diffs.push({ value: y, left: lv, right: rv });
    }
  }
  return diffs;
}

export function checkAlmostSureEquality<A, X, Y>(
  witness: MarkovAlmostSureWitness<A, X, Y>,
  options: MarkovAlmostSureCheckOptions = {},
): MarkovAlmostSureReport<A, X, Y> {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const support = collectSupport(witness.prior, tolerance);

  const failures: AlmostSureFailure<A, X, Y>[] = [];
  for (const record of support) {
    const differences = diffDistributions(witness.left.k, witness.right.k, record.value, tolerance);
    if (differences.length > 0) {
      const sources: A[] = [];
      for (const contribution of record.contributions) {
        pushUnique(sources, contribution.input, witness.prior.X.eq);
      }
      failures.push({ supportPoint: record.value, sources, differences });
    }
  }

  const leftComposite = witness.prior.then(witness.left);
  const rightComposite = witness.prior.then(witness.right);
  const equalComposite = MarkovCategory.equalMor(leftComposite, rightComposite);

  const holds = failures.length === 0;
  const composite = holds ? leftComposite : undefined;
  const descriptor = witness.label ?? "p-a.s. equality";
  const details = holds
    ? `Morphisms are ${descriptor} with shared composite on ${support.length} support point${support.length === 1 ? "" : "s"}.`
    : `${failures.length} support point${failures.length === 1 ? "" : "s"} break almost-sure equality.`;

  return {
    holds,
    witness,
    tolerance,
    support,
    failures,
    leftComposite,
    rightComposite,
    composite,
    equalComposite,
    details,
  };
}

export function pAlmostSureEqual<A, X, Y>(
  witness: MarkovAlmostSureWitness<A, X, Y>,
  options: MarkovAlmostSureCheckOptions = {},
): boolean {
  return checkAlmostSureEquality(witness, options).holds;
}

// ✅ END_MATH: MarkovAlmostSureEquality
// 🔮 Oracles: checkAlmostSureEquality, pAlmostSureEqual
// 🧪 Tests: law.MarkovAlmostSureEquality.spec.ts
// 📊 Coverage: Finite Markov kernels, extendable via projective witnesses for inverse limits
