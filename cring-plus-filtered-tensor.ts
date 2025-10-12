// 🔮 BEGIN_MATH: CRingPlusFilteredTensorColimit
// 📝 Brief: Model infinite tensor products in CRing_⊕ as filtered colimits of finite tensor products.
// 🏗️ Domain: Algebra / symmetric monoidal categories
// 🔗 Integration: Supplies executable colimit witnesses for Example 3.4 and exposes additive/multiplicative structure.
// 📋 Plan:
//   1. Represent elementary tensors with finite support and normalize formal sums canonically.
//   2. Implement addition, negation, and multiplication on formal sums using CRing_⊕ ring data.
//   3. Provide filtered-diagram helpers (inclusions, restrictions, support) with compatibility oracles.

import type { CRingPlusObject } from "./cring-plus";

export type FiniteSubset<J> = ReadonlyArray<J>;

export interface TensorComponent<J, A> {
  readonly index: J;
  readonly object: CRingPlusObject<A>;
}

export interface TensorFamily<J, A> {
  readonly components: ReadonlyArray<TensorComponent<J, A>>;
  readonly eqIndex: (a: J, b: J) => boolean;
  readonly describeIndex?: (index: J) => string;
}

interface NormalEntry<J, A> {
  readonly index: J;
  readonly key: string;
  readonly value: A;
}

interface NormalTerm<J, A> {
  readonly coefficient: bigint;
  readonly entries: ReadonlyArray<NormalEntry<J, A>>;
}

export interface TensorElement<J, A> {
  readonly terms: ReadonlyArray<NormalTerm<J, A>>;
}

const keyOf = <J, A>(family: TensorFamily<J, A>, index: J): string =>
  family.describeIndex?.(index) ?? String(index);

const getComponent = <J, A>(family: TensorFamily<J, A>, index: J): TensorComponent<J, A> => {
  const component = family.components.find(({ index: candidate }) => family.eqIndex(candidate, index));
  if (!component) {
    throw new Error(`Missing tensor component for index ${String(index)}`);
  }
  return component;
};

const describeValue = <J, A>(family: TensorFamily<J, A>, index: J, value: A): string => {
  const component = getComponent(family, index);
  return component.object.format?.(value) ?? String(value);
};

const requireRingEq = <A>(object: CRingPlusObject<A>): ((left: A, right: A) => boolean) => {
  const { eq } = object.ring;
  if (!eq) {
    throw new Error(`Tensor families require ring equality on ${object.name}`);
  }
  return eq;
};

const normalizeEntries = <J, A>(
  family: TensorFamily<J, A>,
  entries: ReadonlyArray<{ index: J; value: A }>,
): ReadonlyArray<NormalEntry<J, A>> => {
  const combined = new Map<string, { index: J; value: A }>();

  for (const entry of entries) {
    const key = keyOf(family, entry.index);
    const { object } = getComponent(family, entry.index);
    const eq = requireRingEq(object);
    const current = combined.get(key);
    const nextValue = current
      ? object.ring.mul(current.value, entry.value)
      : entry.value;

    if (eq(nextValue, object.ring.one)) {
      combined.delete(key);
    } else {
      combined.set(key, { index: entry.index, value: nextValue });
    }
  }

  const normalized: NormalEntry<J, A>[] = [];
  combined.forEach(({ index, value }, key) => {
    normalized.push({ index, key, value });
  });
  normalized.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return normalized;
};

const mergeTerms = <J, A>(
  family: TensorFamily<J, A>,
  terms: ReadonlyArray<NormalTerm<J, A>>,
): ReadonlyArray<NormalTerm<J, A>> => {
  const byKey = new Map<string, NormalTerm<J, A>>();

  for (const term of terms) {
    if (term.coefficient === 0n) continue;
    const descriptor = term.entries
      .map((entry) => `${entry.key}:${describeValue(family, entry.index, entry.value)}`)
      .join("|");
    const existing = byKey.get(descriptor);
    if (existing) {
      const coeff = existing.coefficient + term.coefficient;
      if (coeff === 0n) {
        byKey.delete(descriptor);
      } else {
        byKey.set(descriptor, { coefficient: coeff, entries: existing.entries });
      }
    } else {
      byKey.set(descriptor, term);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const aKey = a.entries.map((entry) => entry.key).join("|");
    const bKey = b.entries.map((entry) => entry.key).join("|");
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return Number(a.coefficient - b.coefficient);
  });
};

const normalizeElement = <J, A>(
  family: TensorFamily<J, A>,
  terms: ReadonlyArray<{ coefficient: bigint; entries: ReadonlyArray<{ index: J; value: A }> }>,
): TensorElement<J, A> => {
  const normalizedTerms = terms.map((term) => ({
    coefficient: term.coefficient,
    entries: normalizeEntries(family, term.entries),
  }));
  return { terms: mergeTerms(family, normalizedTerms) };
};

export const zeroTensor = <J, A>(family: TensorFamily<J, A>): TensorElement<J, A> =>
  normalizeElement(family, []);

export const unitTensor = <J, A>(family: TensorFamily<J, A>): TensorElement<J, A> =>
  normalizeElement(family, [{ coefficient: 1n, entries: [] }]);

export const elementaryTensor = <J, A>(
  family: TensorFamily<J, A>,
  entries: ReadonlyArray<{ index: J; value: A }>,
  coefficient: bigint = 1n,
): TensorElement<J, A> => normalizeElement(family, [{ coefficient, entries }]);

export const addTensors = <J, A>(
  family: TensorFamily<J, A>,
  left: TensorElement<J, A>,
  right: TensorElement<J, A>,
): TensorElement<J, A> =>
  normalizeElement(
    family,
    [...left.terms, ...right.terms].map((term) => ({
      coefficient: term.coefficient,
      entries: term.entries.map(({ index, value }) => ({ index, value })),
    })),
  );

export const negateTensor = <J, A>(
  family: TensorFamily<J, A>,
  tensor: TensorElement<J, A>,
): TensorElement<J, A> =>
  normalizeElement(
    family,
    tensor.terms.map((term) => ({
      coefficient: -term.coefficient,
      entries: term.entries.map(({ index, value }) => ({ index, value })),
    })),
  );

const multiplyEntries = <J, A>(
  family: TensorFamily<J, A>,
  left: ReadonlyArray<NormalEntry<J, A>>,
  right: ReadonlyArray<NormalEntry<J, A>>,
): ReadonlyArray<NormalEntry<J, A>> => {
  const combined = new Map<string, { index: J; value: A }>();

  for (const entry of left) {
    combined.set(entry.key, { index: entry.index, value: entry.value });
  }

  for (const entry of right) {
    const existing = combined.get(entry.key);
    const { object } = getComponent(family, entry.index);
    const eq = requireRingEq(object);
    const nextValue = existing
      ? object.ring.mul(existing.value, entry.value)
      : entry.value;

    if (eq(nextValue, object.ring.one)) {
      combined.delete(entry.key);
    } else {
      combined.set(entry.key, { index: entry.index, value: nextValue });
    }
  }

  const normalized: NormalEntry<J, A>[] = [];
  combined.forEach(({ index, value }, key) => {
    normalized.push({ index, key, value });
  });
  normalized.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return normalized;
};

export const multiplyTensors = <J, A>(
  family: TensorFamily<J, A>,
  left: TensorElement<J, A>,
  right: TensorElement<J, A>,
): TensorElement<J, A> => {
  const terms: Array<{ coefficient: bigint; entries: ReadonlyArray<{ index: J; value: A }> }> = [];
  for (const lTerm of left.terms) {
    for (const rTerm of right.terms) {
      const coefficient = lTerm.coefficient * rTerm.coefficient;
      const entries = multiplyEntries(family, lTerm.entries, rTerm.entries).map(({ index, value }) => ({ index, value }));
      terms.push({ coefficient, entries });
    }
  }
  return normalizeElement(family, terms);
};

export const tensorSupport = <J, A>(family: TensorFamily<J, A>, tensor: TensorElement<J, A>): FiniteSubset<J> => {
  const indices = new Map<string, J>();
  for (const term of tensor.terms) {
    for (const entry of term.entries) {
      indices.set(entry.key, entry.index);
    }
  }
  return Array.from(indices.values());
};

export const restrictTensor = <J, A>(
  family: TensorFamily<J, A>,
  tensor: TensorElement<J, A>,
  subset: FiniteSubset<J>,
): TensorElement<J, A> => {
  const allowed = new Set(subset.map((index) => keyOf(family, index)));
  const terms: Array<{ coefficient: bigint; entries: ReadonlyArray<{ index: J; value: A }> }> = [];
  for (const term of tensor.terms) {
    const entries = term.entries
      .filter((entry) => allowed.has(entry.key))
      .map(({ index, value }) => ({ index, value }));
    terms.push({ coefficient: term.coefficient, entries });
  }
  return normalizeElement(family, terms);
};

export interface FilteredInclusion<J, A> {
  readonly smaller: FiniteSubset<J>;
  readonly larger: FiniteSubset<J>;
  readonly samples: ReadonlyArray<TensorElement<J, A>>;
}

export interface InclusionFailure<J, A> {
  readonly smaller: FiniteSubset<J>;
  readonly larger: FiniteSubset<J>;
  readonly sample: TensorElement<J, A>;
  readonly reason: string;
}

const equalTensors = <J, A>(
  family: TensorFamily<J, A>,
  left: TensorElement<J, A>,
  right: TensorElement<J, A>,
): boolean => {
  if (left.terms.length !== right.terms.length) return false;
  for (const [index, a] of left.terms.entries()) {
    const b = right.terms[index];
    if (!b) return false;
    if (a.coefficient !== b.coefficient) return false;
    if (a.entries.length !== b.entries.length) return false;
    for (const [entryIndex, ae] of a.entries.entries()) {
      const be = b.entries[entryIndex];
      if (!be) return false;
      if (ae.key !== be.key) return false;
      const { object } = getComponent(family, ae.index);
      const eq = requireRingEq(object);
      if (!eq(ae.value, be.value)) return false;
    }
  }
  return true;
};

export interface FilteredColimitWitness<J, A> {
  readonly family: TensorFamily<J, A>;
  readonly include: (
    smaller: FiniteSubset<J>,
    larger: FiniteSubset<J>,
    element: TensorElement<J, A>,
  ) => TensorElement<J, A>;
  readonly restrict: (
    element: TensorElement<J, A>,
    subset: FiniteSubset<J>,
  ) => TensorElement<J, A>;
  readonly support: (element: TensorElement<J, A>) => FiniteSubset<J>;
}

export const defaultFilteredWitness = <J, A>(family: TensorFamily<J, A>): FilteredColimitWitness<J, A> => ({
  family,
  include: (_smaller, _larger, element) => element,
  restrict: (element, subset) => restrictTensor(family, element, subset),
  support: (element) => tensorSupport(family, element),
});

export interface FilteredCompatibilityResult<J, A> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<InclusionFailure<J, A>>;
  readonly details: string;
}

export const checkFilteredCompatibility = <J, A>(
  witness: FilteredColimitWitness<J, A>,
  inclusions: ReadonlyArray<FilteredInclusion<J, A>>,
): FilteredCompatibilityResult<J, A> => {
  const failures: InclusionFailure<J, A>[] = [];
  const { family } = witness;

  for (const inclusion of inclusions) {
    const { smaller, larger, samples } = inclusion;
    const largerSet = new Set(larger.map((index) => keyOf(family, index)));
    const smallerSet = new Set(smaller.map((index) => keyOf(family, index)));

    for (const index of smallerSet) {
      if (!largerSet.has(index)) {
        failures.push({ smaller, larger, sample: zeroTensor(family), reason: "Smaller subset not contained in larger." });
        break;
      }
    }

    for (const sample of samples) {
      const support = witness.support(sample);
      const supportKeys = new Set(support.map((index) => keyOf(family, index)));
      for (const index of supportKeys) {
        if (!smallerSet.has(index)) {
          failures.push({ smaller, larger, sample, reason: "Sample support exceeds smaller subset." });
          break;
        }
      }

      const included = witness.include(smaller, larger, sample);
      const restricted = witness.restrict(included, smaller);
      if (!equalTensors(family, restricted, sample)) {
        failures.push({ smaller, larger, sample, reason: "Restriction after inclusion differs from original." });
      }
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? `All ${inclusions.length} filtered compatibility checks succeeded.`
    : `${failures.length} filtered compatibility violation${failures.length === 1 ? "" : "s"}.`;

  return { holds, failures, details };
};

export interface ColimitCoverageFailure<J, A> {
  readonly sample: TensorElement<J, A>;
  readonly support: FiniteSubset<J>;
  readonly recovered: TensorElement<J, A>;
}

export interface ColimitCoverageResult<J, A> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<ColimitCoverageFailure<J, A>>;
  readonly details: string;
}

export const checkColimitCoverage = <J, A>(
  witness: FilteredColimitWitness<J, A>,
  samples: ReadonlyArray<TensorElement<J, A>>,
): ColimitCoverageResult<J, A> => {
  const failures: ColimitCoverageFailure<J, A>[] = [];

  for (const sample of samples) {
    const support = witness.support(sample);
    const recovered = witness.include(support, support, witness.restrict(sample, support));
    if (!equalTensors(witness.family, recovered, sample)) {
      failures.push({ sample, support, recovered });
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? `All ${samples.length} samples recovered from their finite supports.`
    : `${failures.length} sample${failures.length === 1 ? "" : "s"} failed finite-support recovery.`;

  return { holds, failures, details };
};

// ✅ END_MATH: CRingPlusFilteredTensorColimit
