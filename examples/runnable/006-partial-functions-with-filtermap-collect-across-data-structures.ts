import type { RunnableExample } from "./types";
import { Option } from "./structures";

/**
 * Stage 006 rebuilds the partial-function helpers that `filterMap` and
 * `collect` across arrays, maps, and sets.  The helpers treat an `Option` as a
 * partial function: `some` means the transformation is defined for the current
 * input while `none` means the value should be discarded.
 */

type PartialFunction<A, B> = (value: A) => Option<B>;

function filterMapArray<A, B>(values: ReadonlyArray<A>, fn: PartialFunction<A, B>): ReadonlyArray<B> {
  return values.reduce<ReadonlyArray<B>>((acc, value) => {
    const candidate = fn(value);
    if (candidate.kind === "some") {
      return [...acc, candidate.value];
    }
    return acc;
  }, []);
}

function collectArray<A, B>(values: ReadonlyArray<A>, fn: PartialFunction<A, B>): ReadonlyArray<B> {
  return filterMapArray(values, fn);
}

function collectMapValues<K, V, B>(source: ReadonlyMap<K, V>, fn: PartialFunction<V, B>): ReadonlyMap<K, B> {
  const entries = Array.from(source.entries()).reduce<ReadonlyArray<readonly [K, B]>>((acc, [key, value]) => {
    const candidate = fn(value);
    if (candidate.kind === "some") {
      return [...acc, [key, candidate.value] as const];
    }
    return acc;
  }, []);
  return new Map(entries);
}

function collectSet<A, B>(source: ReadonlySet<A>, fn: PartialFunction<A, B>): ReadonlySet<B> {
  const elements = Array.from(source.values()).reduce<ReadonlyArray<B>>((acc, value) => {
    const candidate = fn(value);
    if (candidate.kind === "some") {
      return [...acc, candidate.value];
    }
    return acc;
  }, []);
  return new Set(elements);
}

function intLike(value: string): boolean {
  return /^-?\d+$/.test(value);
}

function parseInteger(value: string): Option<number> {
  if (intLike(value)) {
    return Option.some(Number(value));
  }
  return Option.none();
}

export const partialFunctionsAcrossCollections: RunnableExample = {
  id: "006",
  title: "Partial functions with filterMap/collect across data structures",
  outlineReference: 6,
  summary:
    "Rebuild partial-function helpers that transform arrays, maps, and sets by discarding inputs where the predicate is undefined.",
  async run() {
    const rawStrings = ["10", "x", "-3", "7.5", "0"] as const;
    const arrayFilter = filterMapArray(rawStrings, parseInteger);
    const arrayCollect = collectArray(rawStrings, parseInteger);

    const agesRaw = new Map<string, string>([
      ["alice", "19"],
      ["bob", "oops"],
      ["carol", "42"],
    ]);
    const ages = collectMapValues(agesRaw, parseInteger);

    const rawSet = new Set(["1", "2", "two", "3"]);
    const integers = collectSet(rawSet, parseInteger);

    const formatMap = (map: ReadonlyMap<string, number>) =>
      Array.from(map.entries())
        .map(([key, value]) => `${key}→${value}`)
        .join(", ");

    const formatSet = (set: ReadonlySet<number>) => Array.from(set.values()).join(", ");

    const logs = [
      "== Arrays with partial functions ==",
      `Input strings: ${JSON.stringify(rawStrings)}`,
      `filterMap keeps integers: ${JSON.stringify(arrayFilter)}`,
      `collect via partial function: ${JSON.stringify(arrayCollect)}`,
      "== Maps with value collection ==",
      `Original entries: ${JSON.stringify(Array.from(agesRaw.entries()))}`,
      `Collected entries: ${formatMap(ages)}`,
      "== Sets with partial collection ==",
      `Original set: ${JSON.stringify(Array.from(rawSet.values()))}`,
      `Collected integers: ${formatSet(integers)}`,
    ];

    return { logs };
  },
};
