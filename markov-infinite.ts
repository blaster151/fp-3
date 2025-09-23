import type { CSRig } from "./semiring-utils";
import type { Dist } from "./dist";
import { bind, dirac, map } from "./dist";
import type { FinMarkov } from "./markov-category";
import type { MarkovComonoidWitness } from "./markov-comonoid-structure";
import type { MarkovConditionalWitness } from "./markov-conditional-independence";
import type { DeterminismLemmaWitness } from "./markov-deterministic-structure";

export type KernelR<R, A, B> = (a: A) => Dist<R, B>;
export type FiniteSubset<J> = ReadonlyArray<J>;
export type CylinderSection<J, X> = ReadonlyMap<J, X>;
export type ProjectiveLimitSection<J, X> = (index: J) => X;
export type Terminal = {};

const terminalValue: Terminal = {};

const defaultIsZero = <R>(R: CSRig<R>) => R.isZero ?? ((a: R) => R.eq(a, R.zero));

export interface DoubleIndex<K, J> {
  readonly outer: K;
  readonly inner: J;
}

export const createDoubleIndexFactory = <K, J>() => {
  const cache = new Map<K, Map<J, DoubleIndex<K, J>>>();
  return (outer: K, inner: J): DoubleIndex<K, J> => {
    let innerCache = cache.get(outer);
    if (!innerCache) {
      innerCache = new Map<J, DoubleIndex<K, J>>();
      cache.set(outer, innerCache);
    }
    let entry = innerCache.get(inner);
    if (!entry) {
      entry = { outer, inner } as const;
      innerCache.set(inner, entry);
    }
    return entry;
  };
};

export type TensorSide = "left" | "right";
export type LeftIndex<J> = DoubleIndex<"left", J>;
export type RightIndex<J> = DoubleIndex<"right", J>;
export type TensorIndex<JL, JR> = LeftIndex<JL> | RightIndex<JR>;
export type TensorCarrier<CL, CR> = readonly [CL, CR];

export interface KolmogorovWitness<J> {
  readonly check: (finite: FiniteSubset<J>, larger: FiniteSubset<J>) => boolean;
  readonly explanation?: string;
}

export type CountabilityKind = "finite" | "countablyInfinite";

export interface CountabilityWitness<J> {
  readonly kind: CountabilityKind;
  readonly enumerate: () => Iterable<J>;
  readonly sample: ReadonlyArray<J>;
  readonly reason?: string;
  readonly size?: number;
}

export type MeasurabilityKind = "unknown" | "measurable" | "standardBorel";

export interface CoordinateMeasurability<J> {
  readonly index: J;
  readonly sigmaAlgebra?: string;
  readonly witness?: unknown;
  readonly standardBorel?: boolean;
}

export interface MeasurabilityWitness<J> {
  readonly kind: MeasurabilityKind;
  readonly coordinates?: ReadonlyArray<CoordinateMeasurability<J>>;
  readonly reason?: string;
}

export interface PositivityWitness<J> {
  readonly kind: "positive";
  readonly indices?: ReadonlyArray<J>;
  readonly reason?: string;
}

export interface ProjectiveFamily<R, J, X, Carrier = ProjectiveLimitSection<J, X>> {
  readonly semiring: CSRig<R>;
  readonly index: Iterable<J>;
  readonly coordinate: (index: J) => Dist<R, X>;
  readonly marginal: (finite: FiniteSubset<J>) => Dist<R, CylinderSection<J, X>>;
  readonly project: (carrier: Carrier, finite: FiniteSubset<J>) => CylinderSection<J, X>;
  readonly extend?: (finite: FiniteSubset<J>, section: CylinderSection<J, X>) => Carrier;
  readonly update?: (carrier: Carrier, section: CylinderSection<J, X>) => Carrier;
  readonly kolmogorov?: KolmogorovWitness<J>;
  readonly countability?: CountabilityWitness<J>;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly positivity?: PositivityWitness<J>;
}

export const enumerateDoubleIndex = <K, J>(
  outer: Iterable<K>,
  inner: (outer: K) => Iterable<J>,
  toIndex: (outer: K, inner: J) => DoubleIndex<K, J>
): Iterable<DoubleIndex<K, J>> => ({
  [Symbol.iterator]: function* () {
    for (const outerIndex of outer) {
      for (const innerIndex of inner(outerIndex)) {
        yield toIndex(outerIndex, innerIndex);
      }
    }
  },
});

export const flattenNestedSection = <K, J, X>(
  nested: ProjectiveLimitSection<K, ProjectiveLimitSection<J, X>>
): ProjectiveLimitSection<DoubleIndex<K, J>, X> =>
  (index) => nested(index.outer)(index.inner);

export const nestSection = <K, J, X>(
  flattened: ProjectiveLimitSection<DoubleIndex<K, J>, X>
): ProjectiveLimitSection<K, ProjectiveLimitSection<J, X>> =>
  (outer) => (inner) => flattened({ outer, inner });

export type NestedCylinderSection<K, J, X> = ReadonlyMap<K, CylinderSection<J, X>>;

export const flattenNestedCylinder = <K, J, X>(
  nested: NestedCylinderSection<K, J, X>,
  toIndex: (outer: K, inner: J) => DoubleIndex<K, J>
): CylinderSection<DoubleIndex<K, J>, X> => {
  const result = new Map<DoubleIndex<K, J>, X>();
  nested.forEach((innerSection, outerIndex) => {
    innerSection.forEach((value, innerIndex) => {
      result.set(toIndex(outerIndex, innerIndex), value);
    });
  });
  return result;
};

export const nestCylinder = <K, J, X>(
  flattened: CylinderSection<DoubleIndex<K, J>, X>
): NestedCylinderSection<K, J, X> => {
  const result = new Map<K, Map<J, X>>();
  flattened.forEach((value, index) => {
    let inner = result.get(index.outer);
    if (!inner) {
      inner = new Map<J, X>();
      result.set(index.outer, inner);
    }
    inner.set(index.inner, value);
  });
  const normalized = new Map<K, CylinderSection<J, X>>();
  result.forEach((section, outerIndex) => {
    normalized.set(outerIndex, new Map(section));
  });
  return normalized;
};

export const isCountableIndex = <R, J, X, Carrier>(
  family: ProjectiveFamily<R, J, X, Carrier>
): family is ProjectiveFamily<R, J, X, Carrier> & { countability: CountabilityWitness<J> } =>
  family.countability !== undefined &&
  (family.countability.kind === "finite" || family.countability.kind === "countablyInfinite");

export const hasMeasurabilityWitness = <R, J, X, Carrier>(
  family: ProjectiveFamily<R, J, X, Carrier>
): family is ProjectiveFamily<R, J, X, Carrier> & { measurability: MeasurabilityWitness<J> } =>
  family.measurability !== undefined;

export const isStandardBorelFamily = <R, J, X, Carrier>(
  family: ProjectiveFamily<R, J, X, Carrier>
): boolean => family.measurability?.kind === "standardBorel";

const restrictCountabilityWitness = <J>(
  subset: ReadonlySet<J>,
  witness: CountabilityWitness<J>
): CountabilityWitness<J> => ({
  kind: witness.kind,
  enumerate: () => ({
    [Symbol.iterator]: function* () {
      for (const value of witness.enumerate()) {
        if (subset.has(value)) yield value;
      }
    },
  }),
  sample: witness.sample.filter((value) => subset.has(value)),
  reason: witness.reason,
});

const restrictMeasurabilityWitness = <J>(
  subset: ReadonlySet<J>,
  witness: MeasurabilityWitness<J>
): MeasurabilityWitness<J> => {
  if (!witness.coordinates) return witness;
  return {
    kind: witness.kind,
    coordinates: witness.coordinates.filter((coordinate) => subset.has(coordinate.index)),
    reason: witness.reason,
  };
};

const restrictPositivityWitness = <J>(
  subset: ReadonlySet<J>,
  witness: PositivityWitness<J>
): PositivityWitness<J> => {
  if (!witness.indices) return witness;
  return {
    kind: "positive",
    reason: witness.reason,
    indices: witness.indices.filter((index) => subset.has(index)),
  };
};

export const restrictProjectiveFamily = <R, J, X, Carrier>(
  family: ProjectiveFamily<R, J, X, Carrier>,
  subset: Iterable<J>
): ProjectiveFamily<R, J, X, Carrier> => {
  const allowed = new Set(subset as Iterable<J>);
  const restrictedIndex: Iterable<J> = {
    [Symbol.iterator]: function* () {
      for (const index of family.index) {
        if (allowed.has(index)) yield index;
      }
    },
  };

  const ensureSubset = (finite: FiniteSubset<J>) => {
    for (const index of finite) {
      if (!allowed.has(index)) {
        throw new Error(`Index ${String(index)} is not contained in the restricted family.`);
      }
    }
  };

  const countability =
    family.countability !== undefined ? restrictCountabilityWitness(allowed, family.countability) : undefined;
  const measurability =
    family.measurability !== undefined ? restrictMeasurabilityWitness(allowed, family.measurability) : undefined;
  const positivity =
    family.positivity !== undefined ? restrictPositivityWitness(allowed, family.positivity) : undefined;

  return {
    semiring: family.semiring,
    index: restrictedIndex,
    coordinate: (index: J) => {
      if (!allowed.has(index)) {
        throw new Error(`Coordinate ${String(index)} is outside the restricted subset.`);
      }
      return family.coordinate(index);
    },
    marginal: (finite) => {
      ensureSubset(finite);
      return family.marginal(finite);
    },
    project: (carrier, finite) => {
      ensureSubset(finite);
      return family.project(carrier, finite);
    },
    extend:
      family.extend === undefined
        ? undefined
        : (finite, section) => {
            ensureSubset(finite);
            return family.extend?.(finite, section);
          },
    update:
      family.update === undefined
        ? undefined
        : (carrier, section) => {
            const filtered = new Map<J, X>();
            section.forEach((value, index) => {
              if (allowed.has(index)) filtered.set(index, value);
            });
            return family.update?.(carrier, filtered as CylinderSection<J, X>);
          },
    kolmogorov: family.kolmogorov,
    countability,
    measurability,
    positivity,
  };
};

export const restrictInfObj = <R, J, X, Carrier>(
  obj: InfObj<R, J, X, Carrier>,
  subset: Iterable<J>
): InfObj<R, J, X, Carrier> => createInfObj(restrictProjectiveFamily(obj.family, subset));

export interface InfObj<R, J, X, Carrier = ProjectiveLimitSection<J, X>> {
  readonly family: ProjectiveFamily<R, J, X, Carrier>;
  readonly copy: KernelR<R, Carrier, readonly [Carrier, Carrier]>;
  readonly discard: KernelR<R, Carrier, Terminal>;
  readonly projectKernel: (finite: FiniteSubset<J>) => KernelR<R, Carrier, CylinderSection<J, X>>;
  readonly projectArray: (finite: FiniteSubset<J>) => KernelR<R, Carrier, ReadonlyArray<X>>;
  readonly liftKernel: <Y>(finite: FiniteSubset<J>, kernel: KernelR<R, CylinderSection<J, X>, Y>) => KernelR<R, Carrier, Y>;
  readonly deterministicProjection: (index: J) => (carrier: Carrier) => X;
  readonly positivity?: PositivityWitness<J>;
  readonly deterministicWitness?: () => DeterministicKolmogorovProductWitness<R, J, X, Carrier>;
}

const isSubset = <J>(finite: FiniteSubset<J>, larger: FiniteSubset<J>): boolean => {
  const set = new Set(larger);
  for (const j of finite) if (!set.has(j)) return false;
  return true;
};

const isMapValue = (value: unknown): value is Map<unknown, unknown> => value instanceof Map;

const mapsEqual = (a: Map<unknown, unknown>, b: Map<unknown, unknown>): boolean => {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (!b.has(key)) return false;
    if (b.get(key) !== value) return false;
  }
  return true;
};

const keysEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (isMapValue(a) && isMapValue(b)) return mapsEqual(a, b);
  return false;
};

const getWeight = <R, X>(dist: Dist<R, X>, key: X): R | undefined => {
  const direct = dist.w.get(key);
  if (direct !== undefined) return direct;
  for (const [candidate, weight] of dist.w) {
    if (keysEqual(candidate, key)) return weight;
  }
  return undefined;
};

const collectKeys = <X>(a: Dist<any, X>, b: Dist<any, X>): X[] => {
  const keys: X[] = [];
  a.w.forEach((_v, k) => {
    keys.push(k);
  });
  b.w.forEach((_v, k) => {
    if (!keys.some(existing => keysEqual(existing, k))) keys.push(k);
  });
  return keys;
};

export const equalDist = <R, X>(R: CSRig<R>, a: Dist<R, X>, b: Dist<R, X>): boolean => {
  const keys = collectKeys(a, b);
  for (const key of keys) {
    const va = getWeight(a, key) ?? R.zero;
    const vb = getWeight(b, key) ?? R.zero;
    if (!R.eq(va, vb)) return false;
  }
  return true;
};

const extendCylinder = <J, X>(section: CylinderSection<J, X>, index: J, value: X): CylinderSection<J, X> => {
  const next = new Map<J, X>(section);
  next.set(index, value);
  return next;
};

const restrictCylinder = <J, X>(section: CylinderSection<J, X>, subset: FiniteSubset<J>): CylinderSection<J, X> => {
  const next = new Map<J, X>();
  for (const j of subset) {
    if (!section.has(j)) continue;
    const value = section.get(j);
    if (value !== undefined || section.has(j)) {
      next.set(j, value as X);
    }
  }
  return next;
};

export function cylinderToArray<J, X>(subset: FiniteSubset<J>, section: CylinderSection<J, X>): ReadonlyArray<X> {
  return subset.map((index) => {
    if (!section.has(index)) {
      throw new Error(`Cylinder section is missing value for index ${String(index)}`);
    }
    return section.get(index) as X;
  });
}

export function pushforwardCylinderArray<R, J, X>(
  subset: FiniteSubset<J>,
  dist: Dist<R, CylinderSection<J, X>>
): Dist<R, ReadonlyArray<X>> {
  return map(dist, (section) => cylinderToArray(subset, section));
}

const pushforwardCylinder = <R, J, X>(
  R: CSRig<R>,
  dist: Dist<R, CylinderSection<J, X>>,
  subset: FiniteSubset<J>
): Dist<R, CylinderSection<J, X>> => {
  type Entry = { section: Map<J, X>; weight: R };
  const entries: Entry[] = [];
  dist.w.forEach((weight, section) => {
    const restricted = restrictCylinder(section, subset);
    const existing = entries.find((candidate) => mapsEqual(candidate.section, restricted));
    if (existing) {
      existing.weight = R.add(existing.weight, weight);
    } else {
      entries.push({ section: restricted, weight });
    }
  });
  const out: Dist<R, CylinderSection<J, X>> = { R: dist.R, w: new Map() };
  for (const entry of entries) out.w.set(entry.section as CylinderSection<J, X>, entry.weight);
  return out;
};

const patchSection = <J, X>(section: ProjectiveLimitSection<J, X>, patch: CylinderSection<J, X>): ProjectiveLimitSection<J, X> => {
  const cache = new Map<J, X>(patch);
  return (index: J) => (cache.has(index) ? (cache.get(index) as X) : section(index));
};

const expectDeterministicValue = <R, X>(dist: Dist<R, X>, reason: string): X => {
  const entries = Array.from(dist.w.entries());
  if (entries.length !== 1) {
    throw new Error(`${reason}: distribution is not deterministic`);
  }
  const [[value, weight]] = entries as Array<[X, R]>;
  if (!dist.R.eq(weight, dist.R.one)) {
    throw new Error(`${reason}: deterministic distribution must have unit weight`);
  }
  return value;
};

export function createInfObj<R, J, X, Carrier = ProjectiveLimitSection<J, X>>(
  family: ProjectiveFamily<R, J, X, Carrier>
): InfObj<R, J, X, Carrier> {
  const { semiring: Rsemiring } = family;
  const delta = dirac(Rsemiring);

  const projectKernel = (finite: FiniteSubset<J>): KernelR<R, Carrier, CylinderSection<J, X>> =>
    (carrier) => delta(family.project(carrier, finite));

  const liftKernel = <Y>(
    finite: FiniteSubset<J>,
    kernel: KernelR<R, CylinderSection<J, X>, Y>
  ): KernelR<R, Carrier, Y> => (carrier) =>
    bind(projectKernel(finite)(carrier), kernel);

  const projectArray = (finite: FiniteSubset<J>): KernelR<R, Carrier, ReadonlyArray<X>> =>
    (carrier) => pushforwardCylinderArray(finite, projectKernel(finite)(carrier));

  const deterministicProjection = (index: J) => {
    const subset: FiniteSubset<J> = [index];
    const kernel = projectKernel(subset);
    return (carrier: Carrier): X => {
      const section = expectDeterministicValue(
        kernel(carrier),
        `Projection onto index ${String(index)}`
      ) as CylinderSection<J, X>;
      if (!section.has(index)) {
        throw new Error(`Projection section is missing value for index ${String(index)}`);
      }
      return section.get(index) as X;
    };
  };

  let self: InfObj<R, J, X, Carrier>;
  let cached: DeterministicKolmogorovProductWitness<R, J, X, Carrier> | undefined;

  const deterministicWitness =
    family.positivity !== undefined
      ? () => {
          if (!cached) {
            cached = buildDeterministicKolmogorovProductWitness(self);
          }
          return cached;
        }
      : undefined;

  self = {
    family,
    copy: (carrier) => delta([carrier, carrier] as const),
    discard: () => delta(terminalValue),
    projectKernel,
    projectArray,
    liftKernel,
    deterministicProjection,
    positivity: family.positivity,
    deterministicWitness,
  };
  return self;
}

export const asDeterministicKernel = <R, A, B>(R: CSRig<R>, base: (input: A) => B): KernelR<R, A, B> => {
  const delta = dirac(R);
  return (input: A) => delta(base(input));
};

const COUNTABILITY_SAMPLE_LIMIT = 1024;

const inferCountabilityWitness = <J>(index: Iterable<J>): CountabilityWitness<J> => {
  const iterator = index[Symbol.iterator]();
  const selfIterable = iterator === index;
  const samples: J[] = [];
  const seen = new Set<unknown>();
  for (let i = 0; i < COUNTABILITY_SAMPLE_LIMIT; i += 1) {
    const next = iterator.next();
    if (next.done) {
      const snapshot = samples.slice();
      return {
        kind: "finite",
        enumerate: () => snapshot,
        sample: snapshot,
        size: snapshot.length,
        reason: `Iterable terminated after ${snapshot.length} elements`,
      };
    }
    if (seen.has(next.value)) {
      throw new Error(`Index iterable repeats element ${String(next.value)}`);
    }
    seen.add(next.value as unknown);
    samples.push(next.value);
  }
  if (selfIterable) {
    throw new Error(
      "Index iterable must return a fresh iterator from Symbol.iterator(); provide a replayable enumeration for countably infinite families"
    );
  }

  const snapshot = samples.slice();
  return {
    kind: "countablyInfinite",
    enumerate: () => index,
    sample: snapshot,
    reason: `Observed at least ${COUNTABILITY_SAMPLE_LIMIT} distinct indices; treating iterable as a countable enumeration`,
  };
};

const ensureIterable = <T>(iterable: Iterable<T> | undefined): iterable is Iterable<T> =>
  iterable !== undefined && typeof iterable[Symbol.iterator] === "function";

const validateCountabilityWitness = <J>(witness: CountabilityWitness<J>): CountabilityWitness<J> => {
  const enumeration = witness.enumerate();
  if (!ensureIterable(enumeration)) {
    throw new Error("Countability witness must supply an iterable enumeration");
  }

  const iterator = enumeration[Symbol.iterator]();
  if (iterator === enumeration) {
    throw new Error(
      "Countability witness must return a replayable iterable from enumerate(); wrap generators in an array or similar container"
    );
  }

  const seen = new Set<unknown>();
  let steps = 0;
  while (steps < COUNTABILITY_SAMPLE_LIMIT) {
    const next = iterator.next();
    if (next.done) break;
    if (seen.has(next.value)) {
      throw new Error(`Countability witness repeats element ${String(next.value)}`);
    }
    seen.add(next.value as unknown);
    steps += 1;
    if (witness.kind === "countablyInfinite" && steps >= COUNTABILITY_SAMPLE_LIMIT) {
      break;
    }
  }

  if (witness.kind === "finite") {
    const replay = witness.enumerate();
    if (!ensureIterable(replay)) {
      throw new Error("Countability witness must replay enumeration as an iterable");
    }
    const replaySet = new Set<unknown>();
    let total = 0;
    for (const value of replay) {
      if (replaySet.has(value)) {
        throw new Error(`Countability witness repeats element ${String(value)} on replay`);
      }
      replaySet.add(value as unknown);
      total += 1;
    }
    if (witness.size !== undefined && witness.size !== total) {
      throw new Error(
        `Countability witness size ${witness.size} disagrees with enumerate() length ${total}`
      );
    }
  }

  const sampleSet = new Set<unknown>();
  for (const value of witness.sample) {
    if (sampleSet.has(value)) {
      throw new Error(`Countability witness sample repeats element ${String(value)}`);
    }
    sampleSet.add(value as unknown);
  }

  return witness;
};

export interface IndependentIndexedProductOptions<J> {
  readonly measurability?: MeasurabilityWitness<J>;
  readonly countability?: CountabilityWitness<J>;
  readonly positivity?: PositivityWitness<J>;
}

export function independentIndexedProduct<R, J, X>(
  R: CSRig<R>,
  index: Iterable<J>,
  coordinate: (idx: J) => Dist<R, X>,
  options: IndependentIndexedProductOptions<J> = {}
): ProjectiveFamily<R, J, X> {
  const isZero = defaultIsZero(R);
  const countability =
    options.countability !== undefined
      ? validateCountabilityWitness(options.countability)
      : inferCountabilityWitness(index);
  const { measurability, positivity } = options;

  const marginal = (finite: FiniteSubset<J>): Dist<R, CylinderSection<J, X>> => {
    type Entry = { section: Map<J, X>; weight: R };
    let acc: Entry[] = [{ section: new Map<J, X>(), weight: R.one }];

    for (const j of finite) {
      const next: Entry[] = [];
      const dj = coordinate(j);
      for (const entry of acc) {
        dj.w.forEach((prob, value) => {
          const weight = R.mul(entry.weight, prob);
          if (isZero(weight)) return;
          const section = new Map(entry.section);
          section.set(j, value);
          const existing = next.find((candidate) => mapsEqual(candidate.section, section));
          if (existing) {
            existing.weight = R.add(existing.weight, weight);
          } else {
            next.push({ section, weight });
          }
        });
      }
      acc = next;
    }

    const dist: Dist<R, CylinderSection<J, X>> = { R, w: new Map() };
    for (const entry of acc) {
      dist.w.set(entry.section as CylinderSection<J, X>, entry.weight);
    }
    return dist;
  };

  const project = (section: ProjectiveLimitSection<J, X>, finite: FiniteSubset<J>) => {
    const out = new Map<J, X>();
    for (const j of finite) out.set(j, section(j));
    return out;
  };

  const update = (section: ProjectiveLimitSection<J, X>, patch: CylinderSection<J, X>) => patchSection(section, patch);

  const defaultCache = new Map<J, X>();
  const defaultValue = (index: J): X => {
    const cached = defaultCache.get(index);
    if (cached !== undefined) return cached;
    const dist = coordinate(index);
    for (const value of dist.w.keys()) {
      defaultCache.set(index, value);
      return value;
    }
    throw new Error("Coordinate distribution must have at least one support value");
  };

  const extend = (finite: FiniteSubset<J>, section: CylinderSection<J, X>) => {
    const lookup = new Map(section);
    for (const index of finite) {
      if (!lookup.has(index)) {
        throw new Error(`Cylinder section missing value for index ${String(index)}`);
      }
    }
    return (index: J) => (lookup.has(index) ? (lookup.get(index) as X) : defaultValue(index));
  };

  const witness: KolmogorovWitness<J> = {
    check: (finite, larger) => {
      if (!isSubset(finite, larger)) return false;
      const small = marginal(finite);
      const restricted = pushforwardCylinder(R, marginal(larger), finite);
      return equalDist(R, small, restricted);
    },
    explanation: "Independent family Kolmogorov consistency",
  };

  return {
    semiring: R,
    index,
    coordinate,
    marginal,
    project,
    update,
    extend,
    kolmogorov: witness,
    countability,
    measurability,
    positivity,
  };
}

export interface IndependentDoubleIndexedProductOptions<K, J> {
  readonly countability?: CountabilityWitness<DoubleIndex<K, J>>;
  readonly measurability?: MeasurabilityWitness<DoubleIndex<K, J>>;
  readonly positivity?: PositivityWitness<DoubleIndex<K, J>>;
}

export interface DoubleIndexedIndependentProductResult<R, K, J, X> {
  readonly family: ProjectiveFamily<R, DoubleIndex<K, J>, X>;
  readonly infObj: InfObj<R, DoubleIndex<K, J>, X>;
  readonly toIndex: (outer: K, inner: J) => DoubleIndex<K, J>;
  readonly innerFamilies: ReadonlyMap<K, ProjectiveFamily<R, J, X>>;
}

export function independentDoubleIndexedProduct<R, K, J, X>(
  R: CSRig<R>,
  outerIndex: Iterable<K>,
  innerIndex: (outer: K) => Iterable<J>,
  coordinate: (outer: K, inner: J) => Dist<R, X>,
  options: IndependentDoubleIndexedProductOptions<K, J> = {}
): DoubleIndexedIndependentProductResult<R, K, J, X> {
  const outerList = Array.from(outerIndex);
  const innerLookup = new Map<K, ReadonlyArray<J>>();
  for (const outerKey of outerList) {
    if (!innerLookup.has(outerKey)) {
      innerLookup.set(outerKey, Array.from(innerIndex(outerKey)));
    }
  }
  const toIndex = createDoubleIndexFactory<K, J>();
  const index = enumerateDoubleIndex(
    outerList,
    (outerKey) => innerLookup.get(outerKey) ?? [],
    toIndex
  );
  const family = independentIndexedProduct(
    R,
    index,
    ({ outer, inner }) => coordinate(outer, inner),
    options
  );

  const innerFamilies = new Map<K, ProjectiveFamily<R, J, X>>();
  for (const outerKey of outerList) {
    const innerList = innerLookup.get(outerKey) ?? [];
    innerFamilies.set(
      outerKey,
      independentIndexedProduct(R, innerList, (innerValue) => coordinate(outerKey, innerValue))
    );
  }

  return { family, infObj: createInfObj(family), toIndex, innerFamilies };
}

export function independentInfObj<R, J, X>(
  R: CSRig<R>,
  index: Iterable<J>,
  coordinate: (idx: J) => Dist<R, X>,
  options: IndependentIndexedProductOptions<J> = {}
): InfObj<R, J, X> {
  const family = independentIndexedProduct(R, index, coordinate, options);
  return createInfObj(family);
}

export interface TensorKolmogorovProductResult<R, JL, XL, CL, JR, XR, CR> {
  readonly family: ProjectiveFamily<R, TensorIndex<JL, JR>, XL | XR, TensorCarrier<CL, CR>>;
  readonly infObj: InfObj<R, TensorIndex<JL, JR>, XL | XR, TensorCarrier<CL, CR>>;
  readonly toLeft: (index: JL) => LeftIndex<JL>;
  readonly toRight: (index: JR) => RightIndex<JR>;
}

export function tensorKolmogorovProducts<R, JL, XL, CL, JR, XR, CR>(
  left: InfObj<R, JL, XL, CL>,
  right: InfObj<R, JR, XR, CR>
): TensorKolmogorovProductResult<R, JL, XL, CL, JR, XR, CR> {
  const R = left.family.semiring;
  if (right.family.semiring !== R) {
    throw new Error("Tensor factors must share the same semiring.");
  }

  const leftIndices = Array.from(left.family.index);
  const rightIndices = Array.from(right.family.index);
  const factory = createDoubleIndexFactory<TensorSide, JL | JR>();
  const toLeft = (index: JL): LeftIndex<JL> => factory("left", index) as LeftIndex<JL>;
  const toRight = (index: JR): RightIndex<JR> => factory("right", index) as RightIndex<JR>;

  const isLeftIndex = (index: TensorIndex<JL, JR>): index is LeftIndex<JL> => index.outer === "left";

  const index: Iterable<TensorIndex<JL, JR>> = enumerateDoubleIndex<TensorSide, JL | JR>(
    ["left", "right"],
    (side) => (side === "left" ? (leftIndices as Iterable<JL | JR>) : (rightIndices as Iterable<JL | JR>)),
    factory
  ) as Iterable<TensorIndex<JL, JR>>;

  const isZero = defaultIsZero(R);

  const splitSubset = (finite: FiniteSubset<TensorIndex<JL, JR>>) => {
    const leftSubset: JL[] = [];
    const rightSubset: JR[] = [];
    finite.forEach((index) => {
      if (isLeftIndex(index)) {
        leftSubset.push(index.inner);
      } else {
        rightSubset.push((index as RightIndex<JR>).inner);
      }
    });
    return { leftSubset, rightSubset };
  };

  const splitSection = (
    section: CylinderSection<TensorIndex<JL, JR>, XL | XR>
  ): { left: CylinderSection<JL, XL>; right: CylinderSection<JR, XR> } => {
    const leftSection = new Map<JL, XL>();
    const rightSection = new Map<JR, XR>();
    section.forEach((value, index) => {
      if (isLeftIndex(index)) {
        leftSection.set(index.inner, value as XL);
      } else {
        rightSection.set((index as RightIndex<JR>).inner, value as XR);
      }
    });
    return {
      left: leftSection as CylinderSection<JL, XL>,
      right: rightSection as CylinderSection<JR, XR>,
    };
  };

  const combineMarginals = (
    leftSubset: FiniteSubset<JL>,
    rightSubset: FiniteSubset<JR>
  ): Dist<R, CylinderSection<TensorIndex<JL, JR>, XL | XR>> => {
    const leftMarginal = left.family.marginal(leftSubset);
    const rightMarginal = right.family.marginal(rightSubset);
    const entries: Array<{ section: CylinderSection<TensorIndex<JL, JR>, XL | XR>; weight: R }> = [];

    leftMarginal.w.forEach((leftWeight, leftSection) => {
      rightMarginal.w.forEach((rightWeight, rightSection) => {
        const weight = R.mul(leftWeight, rightWeight);
        if (isZero(weight)) return;
        const combined = new Map<TensorIndex<JL, JR>, XL | XR>();
        leftSection.forEach((value, index) => {
          combined.set(toLeft(index), value as XL);
        });
        rightSection.forEach((value, index) => {
          combined.set(toRight(index), value as XR);
        });
        const existing = entries.find((candidate) => mapsEqual(candidate.section, combined));
        if (existing) {
          existing.weight = R.add(existing.weight, weight);
        } else {
          entries.push({ section: combined as CylinderSection<TensorIndex<JL, JR>, XL | XR>, weight });
        }
      });
    });

    const dist: Dist<R, CylinderSection<TensorIndex<JL, JR>, XL | XR>> = { R, w: new Map() };
    if (entries.length === 0) {
      dist.w.set(new Map(), R.one);
      return dist;
    }
    for (const entry of entries) {
      dist.w.set(entry.section, entry.weight);
    }
    return dist;
  };

  const marginal = (
    finite: FiniteSubset<TensorIndex<JL, JR>>
  ): Dist<R, CylinderSection<TensorIndex<JL, JR>, XL | XR>> => {
    const { leftSubset, rightSubset } = splitSubset(finite);
    return combineMarginals(leftSubset, rightSubset);
  };

  const project = (
    carrier: TensorCarrier<CL, CR>,
    finite: FiniteSubset<TensorIndex<JL, JR>>
  ): CylinderSection<TensorIndex<JL, JR>, XL | XR> => {
    const { leftSubset, rightSubset } = splitSubset(finite);
    const [leftCarrier, rightCarrier] = carrier;
    const section = new Map<TensorIndex<JL, JR>, XL | XR>();
    const leftSection = left.family.project(leftCarrier, leftSubset);
    leftSection.forEach((value, index) => {
      section.set(toLeft(index), value as XL);
    });
    const rightSection = right.family.project(rightCarrier, rightSubset);
    rightSection.forEach((value, index) => {
      section.set(toRight(index), value as XR);
    });
    return section;
  };

  const extend =
    left.family.extend && right.family.extend
      ? (
          finite: FiniteSubset<TensorIndex<JL, JR>>,
          section: CylinderSection<TensorIndex<JL, JR>, XL | XR>
        ): TensorCarrier<CL, CR> => {
          const { leftSubset, rightSubset } = splitSubset(finite);
          const { left: leftSection, right: rightSection } = splitSection(section);
          const leftCarrier = left.family.extend!(leftSubset, leftSection);
          const rightCarrier = right.family.extend!(rightSubset, rightSection);
          return [leftCarrier, rightCarrier] as const;
        }
      : undefined;

  const update =
    left.family.update && right.family.update
      ? (
          carrier: TensorCarrier<CL, CR>,
          section: CylinderSection<TensorIndex<JL, JR>, XL | XR>
        ): TensorCarrier<CL, CR> => {
          const { left: leftSection, right: rightSection } = splitSection(section);
          const nextLeft = left.family.update!(carrier[0], leftSection);
          const nextRight = right.family.update!(carrier[1], rightSection);
          return [nextLeft, nextRight] as const;
        }
      : undefined;

  const kolmogorov =
    left.family.kolmogorov && right.family.kolmogorov
      ? {
          explanation: [left.family.kolmogorov.explanation, right.family.kolmogorov.explanation]
            .filter(Boolean)
            .join("; ") || undefined,
          check: (finite: FiniteSubset<TensorIndex<JL, JR>>, larger: FiniteSubset<TensorIndex<JL, JR>>) => {
            const { leftSubset: leftFinite, rightSubset: rightFinite } = splitSubset(finite);
            const { leftSubset: leftLarger, rightSubset: rightLarger } = splitSubset(larger);
            const leftOk = left.family.kolmogorov!.check(leftFinite, leftLarger);
            const rightOk = right.family.kolmogorov!.check(rightFinite, rightLarger);
            return leftOk && rightOk;
          },
        }
      : undefined;

  const combineCountability = () => {
    const leftWitness = left.family.countability;
    const rightWitness = right.family.countability;
    if (!leftWitness && !rightWitness) return undefined;
    const kind: CountabilityKind =
      leftWitness?.kind === "countablyInfinite" || rightWitness?.kind === "countablyInfinite"
        ? "countablyInfinite"
        : "finite";
    const enumerate = () => ({
      [Symbol.iterator]: function* () {
        if (leftWitness) {
          for (const index of leftWitness.enumerate()) yield toLeft(index);
        } else {
          for (const index of leftIndices) yield toLeft(index);
        }
        if (rightWitness) {
          for (const index of rightWitness.enumerate()) yield toRight(index);
        } else {
          for (const index of rightIndices) yield toRight(index);
        }
      },
    });
    const sample: Array<TensorIndex<JL, JR>> = [];
    leftWitness?.sample.forEach((index) => sample.push(toLeft(index)));
    rightWitness?.sample.forEach((index) => sample.push(toRight(index)));
    const reasonParts: string[] = [];
    if (leftWitness?.reason) reasonParts.push(`left: ${leftWitness.reason}`);
    if (rightWitness?.reason) reasonParts.push(`right: ${rightWitness.reason}`);
    const size =
      leftWitness?.size !== undefined && rightWitness?.size !== undefined
        ? (leftWitness.size ?? 0) + (rightWitness.size ?? 0)
        : leftWitness?.size ?? rightWitness?.size;
    return {
      kind,
      enumerate,
      sample,
      reason: reasonParts.length > 0 ? reasonParts.join("; ") : undefined,
      size,
    } as CountabilityWitness<TensorIndex<JL, JR>>;
  };

  const combineMeasurability = () => {
    const leftWitness = left.family.measurability;
    const rightWitness = right.family.measurability;
    if (!leftWitness && !rightWitness) return undefined;
    const coordinates: Array<CoordinateMeasurability<TensorIndex<JL, JR>>> = [];
    leftWitness?.coordinates?.forEach((coordinate) => {
      coordinates.push({
        index: toLeft(coordinate.index),
        sigmaAlgebra: coordinate.sigmaAlgebra,
        witness: coordinate.witness,
        standardBorel: coordinate.standardBorel,
      });
    });
    rightWitness?.coordinates?.forEach((coordinate) => {
      coordinates.push({
        index: toRight(coordinate.index),
        sigmaAlgebra: coordinate.sigmaAlgebra,
        witness: coordinate.witness,
        standardBorel: coordinate.standardBorel,
      });
    });
    const kind: MeasurabilityKind = (() => {
      if (leftWitness?.kind === "standardBorel" && rightWitness?.kind === "standardBorel") return "standardBorel";
      if (leftWitness?.kind === "measurable" && rightWitness?.kind === "measurable") return "measurable";
      return leftWitness?.kind ?? rightWitness?.kind ?? "unknown";
    })();
    const reasonParts: string[] = [];
    if (leftWitness?.reason) reasonParts.push(`left: ${leftWitness.reason}`);
    if (rightWitness?.reason) reasonParts.push(`right: ${rightWitness.reason}`);
    return {
      kind,
      coordinates: coordinates.length > 0 ? coordinates : undefined,
      reason: reasonParts.length > 0 ? reasonParts.join("; ") : undefined,
    } as MeasurabilityWitness<TensorIndex<JL, JR>>;
  };

  const leftPositivity = left.positivity ?? left.family.positivity;
  const rightPositivity = right.positivity ?? right.family.positivity;
  const positivity =
    leftPositivity?.kind === "positive" && rightPositivity?.kind === "positive"
      ? (() => {
          const seen = new Set<TensorIndex<JL, JR>>();
          const indices: TensorIndex<JL, JR>[] = [];
          const add = (index: TensorIndex<JL, JR>) => {
            if (!seen.has(index)) {
              seen.add(index);
              indices.push(index);
            }
          };
          leftPositivity.indices?.forEach((index) => add(toLeft(index)));
          rightPositivity.indices?.forEach((index) => add(toRight(index)));
          return {
            kind: "positive" as const,
            indices: indices.length > 0 ? indices : undefined,
            reason: [leftPositivity.reason, rightPositivity.reason].filter(Boolean).join("; ") || undefined,
          } as PositivityWitness<TensorIndex<JL, JR>>;
        })()
      : undefined;

  const family: ProjectiveFamily<R, TensorIndex<JL, JR>, XL | XR, TensorCarrier<CL, CR>> = {
    semiring: R,
    index,
    coordinate: (index) =>
      (isLeftIndex(index)
        ? (left.family.coordinate(index.inner) as Dist<R, XL | XR>)
        : (right.family.coordinate((index as RightIndex<JR>).inner) as Dist<R, XL | XR>)),
    marginal,
    project,
    extend,
    update,
    kolmogorov,
    countability: combineCountability(),
    measurability: combineMeasurability(),
    positivity,
  };

  const infObj = createInfObj(family);
  return { family, infObj, toLeft, toRight };
}

export interface KolmogorovTest<J> {
  readonly finite: FiniteSubset<J>;
  readonly larger: FiniteSubset<J>;
}

export interface KolmogorovConsistencySummary<J> {
  readonly ok: boolean;
  readonly failures: KolmogorovTest<J>[];
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export function checkKolmogorovConsistency<R, J, X, Carrier>(
  family: ProjectiveFamily<R, J, X, Carrier>,
  tests: ReadonlyArray<KolmogorovTest<J>>
): KolmogorovConsistencySummary<J> {
  const failures: KolmogorovTest<J>[] = [];
  const R = family.semiring;

  for (const test of tests) {
    const { finite, larger } = test;
    if (!isSubset(finite, larger)) {
      failures.push(test);
      continue;
    }

    if (family.kolmogorov) {
      if (!family.kolmogorov.check(finite, larger)) failures.push(test);
      continue;
    }

    const small = family.marginal(finite);
    const restricted = pushforwardCylinder(R, family.marginal(larger), finite);
    if (!equalDist(R, small, restricted)) failures.push(test);
  }

  return {
    ok: failures.length === 0,
    failures,
    countable: isCountableIndex(family),
    witness: family.countability,
    measurable: hasMeasurabilityWitness(family),
    measurability: family.measurability,
    standardBorel: isStandardBorelFamily(family),
  };
}

export function applyPatch<R, J, X, Carrier>(
  family: ProjectiveFamily<R, J, X, Carrier>,
  carrier: Carrier,
  patch: CylinderSection<J, X>
): Carrier {
  if (!family.update) {
    throw new Error("Projective family does not expose finite-update adapter");
  }
  return family.update(carrier, patch);
}

const collectUnion = <J>(subsets: ReadonlyArray<FiniteSubset<J>>): FiniteSubset<J> => {
  const keys: J[] = [];
  const seen = new Set<unknown>();
  for (const subset of subsets) {
    for (const index of subset) {
      if (!seen.has(index)) {
        seen.add(index);
        keys.push(index);
      }
    }
  }
  return keys;
};

export type KolmogorovExtensionOutcome<R, J, X, Carrier> =
  | { ok: true; baseSubset: FiniteSubset<J>; measure: Dist<R, Carrier> }
  | { ok: false; reason: string };

export function kolmogorovExtensionMeasure<R, J, X, Carrier>(
  family: ProjectiveFamily<R, J, X, Carrier>,
  subsets: ReadonlyArray<FiniteSubset<J>>
): KolmogorovExtensionOutcome<R, J, X, Carrier> {
  if (!family.extend) {
    return { ok: false, reason: "Projective family does not supply an extension builder" };
  }

  const baseSubset = subsets.length === 0 ? [] : collectUnion(subsets);
  const marginal = family.marginal(baseSubset);
  const measure = map(marginal, (section) => family.extend!(baseSubset, section));
  return { ok: true, baseSubset, measure };
}

export interface DeterministicKolmogorovProjection<R, J, X, Carrier> {
  readonly index: J;
  readonly base: (carrier: Carrier) => X;
  readonly kernel: KernelR<R, Carrier, X>;
}

export interface DeterministicProductComponentInput<A, J, X> {
  readonly index: J;
  readonly arrow: FinMarkov<A, X>;
  readonly witness: MarkovComonoidWitness<X>;
  readonly base?: (input: A) => X;
  readonly label?: string;
}

export interface DeterministicMediatorCandidate<R, A, Carrier> {
  readonly base: (input: A) => Carrier;
  readonly kernel?: KernelR<R, A, Carrier>;
  readonly label?: string;
}

export interface DeterministicComponent<A, J, X> {
  readonly index: J;
  readonly base: (input: A) => X;
}

export interface DeterministicKolmogorovFactorizationFailure<J> {
  readonly index?: J;
  readonly reason: string;
}

export interface DeterministicKolmogorovFactorization<R, A, J, X, Carrier> {
  readonly ok: boolean;
  readonly subset: FiniteSubset<J>;
  readonly base?: (input: A) => Carrier;
  readonly kernel?: KernelR<R, A, Carrier>;
  readonly details: string;
  readonly failures: ReadonlyArray<DeterministicKolmogorovFactorizationFailure<J>>;
}

export interface DeterministicKolmogorovProductWitness<R, J, X, Carrier> {
  readonly infObj: InfObj<R, J, X, Carrier>;
  readonly indices: Iterable<J>;
  readonly projection: (index: J) => DeterministicKolmogorovProjection<R, J, X, Carrier>;
  readonly factor: <A>(
    components: ReadonlyArray<DeterministicComponent<A, J, X>>
  ) => DeterministicKolmogorovFactorization<R, A, J, X, Carrier>;
  readonly restrict: (subset: Iterable<J>) => DeterministicKolmogorovProductWitness<R, J, X, Carrier>;
}

const describeIndices = <J>(subset: FiniteSubset<J>): string =>
  subset.length === 0 ? "∅" : subset.map((index) => String(index)).join(", ");

export function buildDeterministicKolmogorovProductWitness<R, J, X, Carrier>(
  infObj: InfObj<R, J, X, Carrier>
): DeterministicKolmogorovProductWitness<R, J, X, Carrier> {
  const { family } = infObj;
  const cache = new Map<J, DeterministicKolmogorovProjection<R, J, X, Carrier>>();

  const projection = (index: J): DeterministicKolmogorovProjection<R, J, X, Carrier> => {
    let entry = cache.get(index);
    if (!entry) {
      const base = infObj.deterministicProjection(index);
      entry = {
        index,
        base,
        kernel: asDeterministicKernel(family.semiring, base),
      };
      cache.set(index, entry);
    }
    return entry;
  };

  const factor = <A>(
    components: ReadonlyArray<DeterministicComponent<A, J, X>>
  ): DeterministicKolmogorovFactorization<R, A, J, X, Carrier> => {
    const subsetList: J[] = [];
    const failures: DeterministicKolmogorovFactorizationFailure<J>[] = [];
    const seen = new Set<unknown>();

    for (const component of components) {
      if (seen.has(component.index as unknown)) {
        failures.push({
          index: component.index,
          reason: `Duplicate component for index ${String(component.index)}`,
        });
      } else {
        seen.add(component.index as unknown);
        subsetList.push(component.index);
      }
    }

    const subset = subsetList.slice() as FiniteSubset<J>;

    if (failures.length > 0) {
      return {
        ok: false,
        subset,
        details: `${failures.length} duplicate index${failures.length === 1 ? "" : "es"} prevented deterministic factorization.`,
        failures,
      };
    }

    const extend = family.extend;
    if (!extend) {
      const reason = "Projective family does not supply an extension builder";
      return {
        ok: false,
        subset,
        details: reason,
        failures: [{ reason }],
      };
    }

    if (subset.length === 0) {
      let constant: Carrier;
      try {
        constant = extend([], new Map() as CylinderSection<J, X>);
      } catch (error) {
        const reason = `Extension failed for the empty subset: ${(error as Error).message}`;
        return {
          ok: false,
          subset,
          details: reason,
          failures: [{ reason }],
        };
      }

      const base = () => constant;
      return {
        ok: true,
        subset,
        base,
        kernel: asDeterministicKernel(family.semiring, base),
        details: "Empty index tuple yields the terminal deterministic mediator.",
        failures,
      };
    }

    const subsetDescription = describeIndices(subset);

    const base = (input: A): Carrier => {
      const section = new Map<J, X>();
      for (const component of components) {
        section.set(component.index, component.base(input));
      }
      try {
        return extend(subset, section as CylinderSection<J, X>);
      } catch (error) {
        throw new Error(
          `Kolmogorov extension failed for subset {${subsetDescription}}: ${(error as Error).message}`
        );
      }
    };

    return {
      ok: true,
      subset,
      base,
      kernel: asDeterministicKernel(family.semiring, base),
      details: `Constructed deterministic mediator over indices {${subsetDescription}}.`,
      failures,
    };
  };

  return {
    infObj,
    indices: family.index,
    projection,
    factor,
    restrict: (subset) => buildDeterministicKolmogorovProductWitness(restrictInfObj(infObj, subset)),
  };
}

export function deterministicBooleanValue<R>(R: CSRig<R>, dist: Dist<R, boolean>): boolean {
  const isZero = defaultIsZero(R);
  let outcome: boolean | null = null;
  dist.w.forEach((weight, key) => {
    if (isZero(weight)) return;
    if (outcome === null) {
      outcome = key;
    } else if (outcome !== key) {
      throw new Error("Distribution is not deterministic over booleans");
    }
  });
  return outcome ?? false;
}

export interface KolmogorovZeroOneLawWitness<R, A, J, X, Carrier, XDet = unknown, Tail = unknown> {
  readonly product: DeterministicKolmogorovProductWitness<R, J, X, Carrier>;
  readonly domain: MarkovComonoidWitness<A>;
  readonly measure: Dist<R, Carrier>;
  readonly tailEvent: KernelR<R, Carrier, boolean>;
  readonly determinismLemma?: DeterminismLemmaWitness<A, XDet, Tail>;
  readonly independence?: MarkovConditionalWitness<A>;
  readonly tailConditional?: MarkovConditionalWitness<A>;
  readonly components?: ReadonlyArray<DeterministicProductComponentInput<A, J, X>>;
  readonly mediator?: DeterministicMediatorCandidate<R, A, Carrier>;
}

export interface HewittSavageZeroOneLawWitness<R, A, J, X, Carrier, XDet = unknown, Tail = unknown>
  extends KolmogorovZeroOneLawWitness<R, A, J, X, Carrier, XDet, Tail> {
  readonly permutations: ReadonlyArray<(carrier: Carrier) => Carrier>;
}
