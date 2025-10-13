// 🔮 BEGIN_MATH: SetMultCategory
// 📝 Brief: Multi-valued maps between sets viewed as a semicartesian category.
// 🏗️ Domain: Category theory / Set-based multivalued morphisms
// 🔗 Integration: Bridges to existing Markov/deterministic tooling and infinite-product builders.
// 📋 Plan:
//   1. Model Set-based objects together with equality/pretty-print hooks.
//   2. Implement multi-valued morphisms with identity, composition, tensor, and copy/discard structure.
//   3. Provide adapters to/from deterministic maps and finite stochastic kernels.

import type { Eq, Fin, Kernel, Pair, Show } from "./markov-category";
import { byRefEq, defaultShow, deterministic } from "./markov-category";
import type { CountabilityWitness } from "./markov-infinite";

export interface SetMultObj<T> {
  readonly eq: Eq<T>;
  readonly show: Show<T>;
  readonly label?: string;
  readonly samples?: ReadonlyArray<T>;
}

export const createSetMultObj = <T>(options: {
  readonly eq?: Eq<T>;
  readonly show?: Show<T>;
  readonly label?: string;
  readonly samples?: ReadonlyArray<T>;
} = {}): SetMultObj<T> => {
  const metadata =
    options.label === undefined && options.samples === undefined
      ? undefined
      : {
          ...(options.label !== undefined ? { label: options.label } : {}),
          ...(options.samples !== undefined ? { samples: options.samples } : {}),
        };

  return {
    eq: options.eq ?? byRefEq<T>(),
    show: options.show ?? defaultShow,
    ...(metadata ?? {}),
  };
};

export const setMultObjFromFin = <T>(fin: Fin<T>, label?: string): SetMultObj<T> => {
  const { elems } = fin as { elems?: ReadonlyArray<T> };
  const metadata =
    label === undefined && elems === undefined
      ? undefined
      : {
          ...(label !== undefined ? { label } : {}),
          ...(elems !== undefined ? { samples: elems } : {}),
        };

  return createSetMultObj({
    eq: fin.eq,
    show: fin.show ?? defaultShow,
    ...(metadata ?? {}),
  });
};

export type SetMulti<A, B> = (a: A) => ReadonlySet<B>;

const normalizeFibre = <T>(values: Iterable<T>, eq: Eq<T>, show: Show<T>): ReadonlySet<T> => {
  const unique: T[] = [];
  for (const value of values) {
    if (!unique.some((candidate) => eq(candidate, value))) {
      unique.push(value);
    }
  }
  unique.sort((a, b) => show(a).localeCompare(show(b)));
  return new Set(unique);
};

export const singletonFibre = <T>(value: T, eq: Eq<T>, show: Show<T>): ReadonlySet<T> =>
  normalizeFibre([value], eq, show);

export const fromTable = <A, B>(
  domain: ReadonlyArray<A>,
  build: (value: A) => Iterable<B>,
  codomain: SetMultObj<B>,
): SetMulti<A, B> => {
  const fibres = new Map<A, ReadonlySet<B>>();
  for (const value of domain) {
    const fibre = normalizeFibre(build(value), codomain.eq, codomain.show);
    if (fibre.size === 0) {
      throw new Error("SetMulti fibres must be non-empty");
    }
    fibres.set(value, fibre);
  }
  return (input: A) => {
    const existing = fibres.get(input);
    if (!existing) throw new Error("Input outside of SetMulti table");
    return existing;
  };
};

export const composeSetMulti = <A, B, C>(
  codomain: SetMultObj<C>,
  f: SetMulti<A, B>,
  g: SetMulti<B, C>,
): SetMulti<A, C> => {
  const { eq, show } = codomain;
  return (input: A) => {
    const combined: C[] = [];
    for (const intermediate of f(input)) {
      const fibre = g(intermediate);
      if (fibre.size === 0) {
        throw new Error("SetMulti composition encountered an empty fibre");
      }
      for (const value of fibre) {
        if (!combined.some((candidate) => eq(candidate, value))) {
          combined.push(value);
        }
      }
    }
    if (combined.length === 0) {
      throw new Error("SetMulti composition produced an empty fibre");
    }
    combined.sort((a, b) => show(a).localeCompare(show(b)));
    return new Set(combined);
  };
};

export const idSetMulti = <T>(obj: SetMultObj<T>): SetMulti<T, T> =>
  (value) => singletonFibre(value, obj.eq, obj.show);

export const pairEq = <A, B>(left: Eq<A>, right: Eq<B>): Eq<Pair<A, B>> =>
  (a, b) => left(a[0], b[0]) && right(a[1], b[1]);

export const pairShow = <A, B>(left: Show<A>, right: Show<B>): Show<Pair<A, B>> =>
  ([a, b]) => `(${left(a)}, ${right(b)})`;

export const tensorSetMultObj = <A, B>(
  left: SetMultObj<A>,
  right: SetMultObj<B>,
): SetMultObj<Pair<A, B>> => ({
  eq: pairEq(left.eq, right.eq),
  show: pairShow(left.show, right.show),
  ...(left.label !== undefined && right.label !== undefined
    ? { label: `${left.label} ⊗ ${right.label}` }
    : {}),
});

const cartesianProduct = <A, B>(
  left: Iterable<A>,
  right: Iterable<B>,
  eq: Eq<Pair<A, B>>,
  show: Show<Pair<A, B>>,
): ReadonlySet<Pair<A, B>> => {
  const pairs: Array<Pair<A, B>> = [];
  for (const a of left) {
    for (const b of right) {
      const pair: Pair<A, B> = [a, b];
      if (!pairs.some((candidate) => eq(candidate, pair))) {
        pairs.push(pair);
      }
    }
  }
  pairs.sort((x, y) => show(x).localeCompare(show(y)));
  return new Set(pairs);
};

export const tensorSetMulti = <A, B, C, D>(
  codomain: SetMultObj<Pair<C, D>>,
  f: SetMulti<A, C>,
  g: SetMulti<B, D>,
): SetMulti<Pair<A, B>, Pair<C, D>> => ([a, b]) => {
  const fibre = cartesianProduct(f(a), g(b), codomain.eq, codomain.show);
  if (fibre.size === 0) {
    throw new Error("Tensor of SetMulti morphisms produced an empty fibre");
  }
  return fibre;
};

export type SetMultUnit = { readonly kind: "unit" };
export const setMultUnit: SetMultUnit = { kind: "unit" };

export const setMultUnitObj: SetMultObj<SetMultUnit> = createSetMultObj({
  eq: (a, b) => a.kind === b.kind,
  show: () => "⋆",
  label: "⋆",
  samples: [setMultUnit],
});

export const copySetMulti = <T>(obj: SetMultObj<T>): SetMulti<T, Pair<T, T>> =>
  (value) => singletonFibre([value, value], pairEq(obj.eq, obj.eq), pairShow(obj.show, obj.show));

export const discardSetMulti = <T>(): SetMulti<T, SetMultUnit> =>
  () => singletonFibre(setMultUnit, setMultUnitObj.eq, setMultUnitObj.show);

export interface DeterministicSetMultWitness<A, B> {
  readonly domain: SetMultObj<A>;
  readonly codomain: SetMultObj<B>;
  readonly morphism: SetMulti<A, B>;
  readonly label?: string;
}

export interface DeterministicSetMultResult<A, B> {
  readonly deterministic: boolean;
  readonly holds: boolean;
  readonly witness: DeterministicSetMultWitness<A, B>;
  readonly base?: (a: A) => B;
  readonly counterexample?: { readonly input: A; readonly fibre: ReadonlySet<B> };
  readonly details: string;
}

export interface DeterministicSetMultOptions<A> {
  readonly samples?: Iterable<A>;
}

export const isDeterministicSetMulti = <A, B>(
  witness: DeterministicSetMultWitness<A, B>,
  options: DeterministicSetMultOptions<A> = {},
): DeterministicSetMultResult<A, B> => {
  const { domain, morphism } = witness;
  const samples = options.samples ?? domain.samples ?? [];
  for (const sample of samples) {
    const fibre = morphism(sample);
    if (fibre.size !== 1) {
      return {
        deterministic: false,
        holds: false,
        witness,
        counterexample: { input: sample, fibre },
        details: `Fibre over ${domain.show(sample)} has size ${fibre.size}`,
      };
    }
  }
  const base = (input: A): B => {
    const fibre = morphism(input);
    if (fibre.size !== 1) {
      throw new Error("SetMulti is not deterministic on the provided input");
    }
    const iterator = fibre.values().next();
    if (iterator.done) throw new Error("Deterministic fibre unexpectedly empty");
    return iterator.value;
  };
  return { deterministic: true, holds: true, witness, base, details: "All sampled fibres are singleton" };
};

export const deterministicToSetMulti = <A, B>(
  domain: SetMultObj<A>,
  codomain: SetMultObj<B>,
  fn: (a: A) => B,
): SetMulti<A, B> => (input) => singletonFibre(fn(input), codomain.eq, codomain.show);

export const setMultiToDeterministic = <A, B>(
  witness: DeterministicSetMultWitness<A, B>,
  options: DeterministicSetMultOptions<A> = {},
): ((a: A) => B) | undefined => {
  const result = isDeterministicSetMulti(witness, options);
  return result.deterministic ? result.base : undefined;
};

export const kernelToSetMulti = <A, B>(
  codomain: Fin<B>,
  kernel: Kernel<A, B>,
): SetMulti<A, B> => (input) => {
  const dist = kernel(input);
  const support = normalizeFibre(distKeys(dist), codomain.eq, codomain.show ?? defaultShow);
  if (support.size === 0) {
    throw new Error("Kernel has empty support for SetMulti conversion");
  }
  return support;
};

const distKeys = <B>(dist: Map<B, unknown>): Iterable<B> => {
  const keys: B[] = [];
  dist.forEach((_, value) => keys.push(value));
  return keys;
};

export const setMultiToKernel = <A, B>(
  domain: Fin<A>,
  codomain: Fin<B>,
  witness: DeterministicSetMultWitness<A, B>,
): Kernel<A, B> => {
  const base = setMultiToDeterministic(witness, { samples: domain.elems });
  if (!base) {
    throw new Error("Cannot convert non-deterministic SetMulti to kernel");
  }
  return deterministic(base);
};

export interface SetMultIndexedFamily<J, X> {
  readonly index: Iterable<J>;
  readonly coordinate: (index: J) => SetMultObj<X>;
  readonly countability?: CountabilityWitness<J>;
}

export type SetMultTuple<J, X> = ReadonlyMap<J, X>;

export interface SetMultProduct<J, X> {
  readonly index: Iterable<J>;
  readonly coordinate: (index: J) => SetMultObj<X>;
  readonly carrier: (assignment: (index: J) => X) => SetMultTuple<J, X>;
  readonly project: (tuple: SetMultTuple<J, X>, finite: ReadonlyArray<J>) => SetMultTuple<J, X>;
  readonly object: SetMultObj<SetMultTuple<J, X>>;
  readonly sectionObj: (subset: ReadonlyArray<J>) => SetMultObj<SetMultTuple<J, X>>;
  readonly countability?: CountabilityWitness<J>;
}

const describeIndex = (index: unknown): string => String(index);

const showTuple = <J, X>(
  family: Pick<SetMultIndexedFamily<J, X>, "coordinate">,
  indices: Iterable<J>,
) => (tuple: SetMultTuple<J, X>): string => {
  const entries: Array<string> = [];
  for (const index of indices) {
    const coordinate = family.coordinate(index);
    const value = tuple.get(index);
    if (value === undefined) {
      entries.push(`${describeIndex(index)}:⟂`);
    } else {
      entries.push(`${describeIndex(index)}:${coordinate.show(value)}`);
    }
  }
  return `{${entries.join(", ")}}`;
};

const eqTuple = <J, X>(
  family: Pick<SetMultIndexedFamily<J, X>, "coordinate">,
  indices: Iterable<J>,
) => (left: SetMultTuple<J, X>, right: SetMultTuple<J, X>): boolean => {
  for (const index of indices) {
    const coordinate = family.coordinate(index);
    const leftValue = left.get(index);
    const rightValue = right.get(index);
    if (leftValue === undefined || rightValue === undefined) {
      return false;
    }
    if (!coordinate.eq(leftValue, rightValue)) {
      return false;
    }
  }
  return true;
};

const tupleEntries = <J, X>(tuple: SetMultTuple<J, X>): Array<J> => Array.from(tuple.keys());

export const createSetMultProductObj = <J, X>(
  family: SetMultIndexedFamily<J, X>,
  options: { readonly label?: string } = {},
): SetMultObj<SetMultTuple<J, X>> =>
  createSetMultObj({
    eq: (left, right) => {
      if (left.size !== right.size) return false;
      for (const [index, value] of left) {
        const coordinate = family.coordinate(index);
        const other = right.get(index);
        if (other === undefined || !coordinate.eq(value, other)) {
          return false;
        }
      }
      return true;
    },
    show: (tuple) => {
      const entries = tupleEntries(tuple).map((index) => {
        const coordinate = family.coordinate(index);
        const value = tuple.get(index);
        return `${describeIndex(index)}:${value === undefined ? "⟂" : coordinate.show(value)}`;
      });
      entries.sort();
      return `{${entries.join(", ")}}`;
    },
    ...(options.label !== undefined ? { label: options.label } : {}),
  });

export const createSetMultSectionObj = <J, X>(
  family: Pick<SetMultIndexedFamily<J, X>, "coordinate">,
  subset: ReadonlyArray<J>,
  options: { readonly label?: string } = {},
): SetMultObj<SetMultTuple<J, X>> =>
  createSetMultObj({
    eq: eqTuple(family, subset),
    show: showTuple(family, subset),
    ...(options.label !== undefined ? { label: options.label } : {}),
  });

export const createSetMultInfObj = <J, X>(
  family: SetMultIndexedFamily<J, X>,
): SetMultProduct<J, X> => {
  const project = (tuple: ReadonlyMap<J, X>, finite: ReadonlyArray<J>): ReadonlyMap<J, X> => {
    const section = new Map<J, X>();
    for (const index of finite) {
      const value = tuple.get(index);
      if (value === undefined) {
        throw new Error(`Tuple missing coordinate ${String(index)}`);
      }
      section.set(index, value);
    }
    return section;
  };

  const carrier = (assignment: (index: J) => X): ReadonlyMap<J, X> => {
    const tuple = new Map<J, X>();
    for (const index of family.index) {
      tuple.set(index, assignment(index));
    }
    return tuple;
  };

  const object = createSetMultProductObj(family);

  const sectionObj = (subset: ReadonlyArray<J>) => createSetMultSectionObj(family, subset);

  return {
    index: family.index,
    coordinate: family.coordinate,
    carrier,
    project,
    object,
    sectionObj,
    ...(family.countability !== undefined ? { countability: family.countability } : {}),
  };
};

export const projectSetMult = <J, X>(
  product: SetMultProduct<J, X>,
  subset: ReadonlyArray<J>,
): SetMulti<SetMultTuple<J, X>, SetMultTuple<J, X>> => {
  const codomain = product.sectionObj(subset);
  return (tuple) => {
    const section = product.project(tuple, subset);
    return singletonFibre(section, codomain.eq, codomain.show);
  };
};

export const setMultSupport = <A, B>(
  codomain: SetMultObj<B>,
  morphism: SetMulti<A, B>,
  inputs: Iterable<A>,
): Map<A, ReadonlySet<B>> => {
  const support = new Map<A, ReadonlySet<B>>();
  for (const input of inputs) {
    support.set(input, normalizeFibre(morphism(input), codomain.eq, codomain.show));
  }
  return support;
};

// 🔮 END_MATH
