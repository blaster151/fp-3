import type { CountabilityWitness } from "../markov-infinite";

const DEFAULT_ENUMERATION_BOUND = 32;
const DEFAULT_KAN_DEPTH_LIMIT = 4;
const DEFAULT_KAN_BREADTH_LIMIT = 128;

const freezeArray = <T>(values: readonly T[]): ReadonlyArray<T> =>
  Object.freeze([...values]) as ReadonlyArray<T>;

export interface LazyReplayableIterable<T> {
  readonly description?: string;
  readonly countability?: CountabilityWitness<T>;
  readonly enumerate: () => Iterable<T>;
  readonly replay: (limit?: number) => ReadonlyArray<T>;
  readonly snapshot: () => ReadonlyArray<T>;
}

export interface LazySliceOptions {
  readonly limit?: number;
  readonly defaultLimit?: number;
}

export interface LazySliceResult<T> {
  readonly values: ReadonlyArray<T>;
  readonly truncated: boolean;
  readonly limit: number;
  readonly consumed: number;
}

export interface LazyIndexedFamily<I, Element> {
  readonly description?: string;
  readonly indices: LazyReplayableIterable<I>;
  readonly fibre: (index: I) => LazyReplayableIterable<Element>;
}

export interface ReplayableIterableOptions<T> {
  readonly description?: string;
  readonly countability?: CountabilityWitness<T>;
  readonly sample?: ReadonlyArray<T>;
}

export const createReplayableIterable = <T>(
  enumerate: () => Iterable<T>,
  options: ReplayableIterableOptions<T> = {},
): LazyReplayableIterable<T> => {
  const cache: T[] = options.sample ? [...options.sample] : [];

  const snapshot = () => freezeArray(cache);

  const optionalDescription =
    options.description !== undefined ? { description: options.description } : {};
  const optionalCountability =
    options.countability !== undefined ? { countability: options.countability } : {};

  return {
    ...optionalDescription,
    ...optionalCountability,
    enumerate: () => ({
      [Symbol.iterator](): Iterator<T> {
        const iterator = enumerate()[Symbol.iterator]();
        let consumedFromIterator = 0;
        let index = 0;
        return {
          next(): IteratorResult<T> {
            if (index < cache.length) {
              const value = cache[index]!;
              index += 1;
              return { value, done: false };
            }

            while (consumedFromIterator < cache.length) {
              const skip = iterator.next();
              consumedFromIterator += 1;
              if (skip.done) {
                return { value: undefined, done: true } as IteratorResult<T>;
              }
            }

            const next = iterator.next();
            if (next.done) {
              return { value: undefined, done: true } as IteratorResult<T>;
            }

            const value = next.value;
            cache.push(value);
            consumedFromIterator += 1;
            index += 1;
            return { value, done: false };
          },
        };
      },
    }),
    replay: (limit?: number) => {
      if (limit === undefined) {
        return snapshot();
      }
      if (limit <= 0) {
        return Object.freeze([]) as ReadonlyArray<T>;
      }
      return freezeArray(cache.slice(0, Math.min(cache.length, limit)));
    },
    snapshot,
  };
};

export const createReplayableIterableFromArray = <T>(
  values: ReadonlyArray<T>,
  options: Omit<ReplayableIterableOptions<T>, "countability" | "sample"> = {},
): LazyReplayableIterable<T> => {
  const frozen = freezeArray(values);
  const countability: CountabilityWitness<T> = {
    kind: "finite",
    enumerate: () => frozen,
    sample: frozen,
    size: frozen.length,
    ...(options.description !== undefined ? { reason: options.description } : {}),
  };
  return createReplayableIterable(() => frozen, {
    ...(options.description !== undefined ? { description: options.description } : {}),
    countability,
    sample: frozen,
  });
};

export const createReplayableIterableFromWitness = <T>(
  witness: CountabilityWitness<T>,
  options: Omit<ReplayableIterableOptions<T>, "countability" | "sample"> = {},
): LazyReplayableIterable<T> =>
  createReplayableIterable(() => witness.enumerate(), {
    ...(options.description !== undefined ? { description: options.description } : {}),
    countability: witness,
    sample: witness.sample,
  });

const inferSliceLimit = <T>(
  iterable: LazyReplayableIterable<T>,
  options?: LazySliceOptions,
): number => {
  if (options?.limit !== undefined) {
    return options.limit;
  }
  const { countability } = iterable;
  if (countability?.kind === "finite" && countability.size !== undefined) {
    return countability.size;
  }
  return options?.defaultLimit ?? DEFAULT_ENUMERATION_BOUND;
};

export const sliceLazyIterable = <T>(
  iterable: LazyReplayableIterable<T>,
  options?: LazySliceOptions,
): LazySliceResult<T> => {
  const effectiveLimit = inferSliceLimit(iterable, options);
  const iterator = iterable.enumerate()[Symbol.iterator]();
  const collected: T[] = [];
  let consumed = 0;
  let reachedLimit = false;
  while (true) {
    const next = iterator.next();
    if (next.done) {
      break;
    }
    collected.push(next.value);
    consumed += 1;
    if (consumed >= effectiveLimit) {
      reachedLimit = true;
      break;
    }
  }
  const countability = iterable.countability;
  const finiteBound =
    countability?.kind === "finite" && countability.size !== undefined
      ? countability.size
      : undefined;
  const truncated = reachedLimit
    ? finiteBound !== undefined
      ? finiteBound > effectiveLimit
      : true
    : false;
  return {
    values: freezeArray(collected),
    truncated,
    limit: effectiveLimit,
    consumed,
  };
};

export interface IndexedFamilySlice<I, Element> {
  readonly index: I;
  readonly elements: ReadonlyArray<Element>;
  readonly slice: LazySliceResult<Element>;
}

export interface MaterializeIndexedFamilyOptions {
  readonly indexLimit?: number;
  readonly elementLimit?: number;
}

export interface MaterializeIndexedFamilyResult<I, Element> {
  readonly indices: ReadonlyArray<IndexedFamilySlice<I, Element>>;
  readonly indexSlice: LazySliceResult<I>;
}

export const createFiniteIndexedFamily = <I, Element>(options: {
  readonly description?: string;
  readonly indices: ReadonlyArray<I>;
  readonly fibre: (index: I) => ReadonlyArray<Element>;
}): LazyIndexedFamily<I, Element> => {
  const frozenIndices = freezeArray(options.indices);
  const optionalDescription =
    options.description !== undefined ? { description: options.description } : {};
  const indexOptions =
    options.description !== undefined
      ? { description: `${options.description} indices` }
      : undefined;
  return {
    ...optionalDescription,
    indices: indexOptions
      ? createReplayableIterableFromArray(frozenIndices, indexOptions)
      : createReplayableIterableFromArray(frozenIndices),
    fibre: (index) => {
      const fibreOptions =
        options.description !== undefined
          ? { description: `${options.description} fibre(${String(index)})` }
          : undefined;
      return fibreOptions
        ? createReplayableIterableFromArray(options.fibre(index), fibreOptions)
        : createReplayableIterableFromArray(options.fibre(index));
    },
  };
};

export const materializeIndexedFamily = <I, Element>(
  family: LazyIndexedFamily<I, Element>,
  options: MaterializeIndexedFamilyOptions = {},
): MaterializeIndexedFamilyResult<I, Element> => {
  const indexSliceOptions =
    options.indexLimit !== undefined ? { limit: options.indexLimit } : undefined;
  const indexSlice = sliceLazyIterable(family.indices, indexSliceOptions);
  const indices: IndexedFamilySlice<I, Element>[] = [];
  for (const index of indexSlice.values) {
    const elementSliceOptions =
      options.elementLimit !== undefined ? { limit: options.elementLimit } : undefined;
    const slice = sliceLazyIterable(family.fibre(index), elementSliceOptions);
    indices.push({
      index,
      elements: slice.values,
      slice,
    });
  }
  return {
    indices: freezeArray(indices),
    indexSlice,
  };
};

export interface SymbolicArrow<I, Element> {
  readonly source: I;
  readonly target: I;
  readonly map: (element: Element) => Iterable<Element>;
  readonly description?: string;
}

export interface KanExtensionSeed<I, Element> {
  readonly index: I;
  readonly element: Element;
}

export interface KanExtensionOptions<I, Element> {
  readonly depthLimit?: number;
  readonly breadthLimit?: number;
  readonly serializeIndex?: (index: I) => string;
  readonly serializeElement?: (element: Element) => string;
  readonly indexLimit?: number;
}

export interface KanExtensionFrontier<I, Element> {
  readonly index: I;
  readonly element: Element;
  readonly depth: number;
}

export interface KanExtensionApproximation<I, Element> {
  readonly explored: ReadonlyArray<KanExtensionFrontier<I, Element>>;
  readonly truncated: boolean;
  readonly depthLimit: number;
  readonly breadthLimit: number;
  readonly indexSlice: LazySliceResult<I>;
}

export const approximateKanExtension = <I, Element>(
  family: LazyIndexedFamily<I, Element>,
  seeds: ReadonlyArray<KanExtensionSeed<I, Element>>,
  arrows: ReadonlyArray<SymbolicArrow<I, Element>>,
  options: KanExtensionOptions<I, Element> = {},
): KanExtensionApproximation<I, Element> => {
  const depthLimit = options.depthLimit ?? DEFAULT_KAN_DEPTH_LIMIT;
  const breadthLimit = options.breadthLimit ?? DEFAULT_KAN_BREADTH_LIMIT;
  const serializeIndex = options.serializeIndex ?? ((index: I) => `${index}`);
  const serializeElement =
    options.serializeElement ?? ((element: Element) => JSON.stringify(element));

  const indexSliceOptions: LazySliceOptions = {
    defaultLimit: breadthLimit,
    ...(options.indexLimit !== undefined ? { limit: options.indexLimit } : {}),
  };
  const indexSlice = sliceLazyIterable(family.indices, indexSliceOptions);
  const allowedIndices = new Set(
    indexSlice.values.map((index) => serializeIndex(index)),
  );

  const queue: Array<KanExtensionFrontier<I, Element>> = seeds.map((seed) => ({
    index: seed.index,
    element: seed.element,
    depth: 0,
  }));
  const explored: KanExtensionFrontier<I, Element>[] = [];
  const seen = new Set<string>();
  let truncated = false;

  const enqueue = (frontier: KanExtensionFrontier<I, Element>) => {
    if (explored.length + queue.length >= breadthLimit) {
      truncated = true;
      return;
    }
    queue.push(frontier);
  };

  while (queue.length > 0) {
    const current = queue.shift()!;
    const indexKey = serializeIndex(current.index);
    if (allowedIndices.size > 0 && !allowedIndices.has(indexKey)) {
      continue;
    }
    const key = `${indexKey}::${serializeElement(current.element)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    explored.push(current);
    if (explored.length >= breadthLimit) {
      truncated = queue.length > 0;
      break;
    }
    if (current.depth >= depthLimit) {
      continue;
    }
    for (const arrow of arrows) {
      if (serializeIndex(arrow.source) !== indexKey) {
        continue;
      }
      for (const mapped of arrow.map(current.element)) {
        enqueue({
          index: arrow.target,
          element: mapped,
          depth: current.depth + 1,
        });
        if (truncated) {
          break;
        }
      }
      if (truncated) {
        break;
      }
    }
    if (truncated) {
      break;
    }
  }

  return {
    explored: freezeArray(explored),
    truncated,
    depthLimit,
    breadthLimit,
    indexSlice,
  };
};

