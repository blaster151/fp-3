import { isTopology, type Top } from "./Topology";

type Eq<X> = (a: X, b: X) => boolean;

export type InitialMap<X, Y> = {
  readonly target: Top<Y>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
};

export type FinalMap<W, Y> = {
  readonly source: Top<W>;
  readonly eqSource: Eq<W>;
  readonly map: (w: W) => Y;
};

function canonicalize<X>(eqX: Eq<X>, values: ReadonlyArray<X>): X[] {
  const result: X[] = [];
  for (const value of values) {
    if (!result.some((existing) => eqX(existing, value))) {
      result.push(value);
    }
  }
  return result;
}

function eqArray<X>(eqX: Eq<X>, A: ReadonlyArray<X>, B: ReadonlyArray<X>): boolean {
  if (A.length !== B.length) {
    return false;
  }
  return (
    A.every((a) => B.some((b) => eqX(a, b))) &&
    B.every((b) => A.some((a) => eqX(a, b)))
  );
}

function normalizeSubset<X>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  subset: ReadonlyArray<X>,
): X[] {
  const normalized: X[] = [];
  for (const element of carrier) {
    if (subset.some((candidate) => eqX(candidate, element))) {
      normalized.push(element);
    }
  }
  return canonicalize(eqX, normalized);
}

function pushUnique<X>(
  eqSet: (A: ReadonlyArray<X>, B: ReadonlyArray<X>) => boolean,
  collection: Array<ReadonlyArray<X>>,
  candidate: ReadonlyArray<X>,
): boolean {
  if (!collection.some((existing) => eqSet(existing, candidate))) {
    collection.push(candidate);
    return true;
  }
  return false;
}

function saturateBase<X>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  seeds: ReadonlyArray<ReadonlyArray<X>>,
): ReadonlyArray<ReadonlyArray<X>> {
  const eqSet = (A: ReadonlyArray<X>, B: ReadonlyArray<X>) => eqArray(eqX, A, B);
  const opens: Array<ReadonlyArray<X>> = [];
  pushUnique(eqSet, opens, []);
  pushUnique(eqSet, opens, carrier);
  for (const seed of seeds) {
    const normalized = normalizeSubset(eqX, carrier, seed);
    pushUnique(eqSet, opens, normalized);
  }
  for (let changed = true; changed;) {
    changed = false;
    const current = [...opens];
    for (const U of current) {
      for (const V of current) {
        const union = normalizeSubset(eqX, carrier, [...U, ...V]);
        const intersection = normalizeSubset(
          eqX,
          carrier,
          U.filter((x) => V.some((y) => eqX(x, y))),
        );
        if (pushUnique(eqSet, opens, union)) {
          changed = true;
        }
        if (pushUnique(eqSet, opens, intersection)) {
          changed = true;
        }
      }
    }
  }
  return opens;
}

function finiteIntersections<X>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  subbase: ReadonlyArray<ReadonlyArray<X>>,
): ReadonlyArray<ReadonlyArray<X>> {
  const eqSet = (A: ReadonlyArray<X>, B: ReadonlyArray<X>) => eqArray(eqX, A, B);
  const intersections: Array<ReadonlyArray<X>> = [];
  pushUnique(eqSet, intersections, carrier);
  for (const seed of subbase) {
    const normalized = normalizeSubset(eqX, carrier, seed);
    const snapshot = [...intersections];
    pushUnique(eqSet, intersections, normalized);
    for (const existing of snapshot) {
      const meet = normalizeSubset(
        eqX,
        carrier,
        existing.filter((x) => normalized.some((y) => eqX(x, y))),
      );
      pushUnique(eqSet, intersections, meet);
    }
  }
  return intersections;
}

function allSubsets<X>(carrier: ReadonlyArray<X>): ReadonlyArray<ReadonlyArray<X>> {
  const subsets: Array<ReadonlyArray<X>> = [];
  const n = carrier.length;
  for (let mask = 0; mask < 1 << n; mask += 1) {
    const subset: X[] = [];
    for (let index = 0; index < n; index += 1) {
      if (mask & (1 << index)) {
        const value = carrier[index];
        if (value !== undefined) {
          subset.push(value);
        }
      }
    }
    subsets.push(subset);
  }
  return subsets;
}

export function topologyFromBase<X>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  base: ReadonlyArray<ReadonlyArray<X>>,
): Top<X> {
  const canonicalCarrier = canonicalize(eqX, carrier);
  const opens = saturateBase(
    eqX,
    canonicalCarrier,
    base.map((subset) => normalizeSubset(eqX, canonicalCarrier, subset)),
  );
  const topology: Top<X> = { carrier: canonicalCarrier, opens };
  if (!isTopology(eqX, topology)) {
    throw new Error("Base does not generate a topology on the given carrier");
  }
  return topology;
}

export function topologyFromSubbase<X>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  subbase: ReadonlyArray<ReadonlyArray<X>>,
): Top<X> {
  const canonicalCarrier = canonicalize(eqX, carrier);
  const normalizedSubbase = subbase.map((subset) => normalizeSubset(eqX, canonicalCarrier, subset));
  const base = finiteIntersections(eqX, canonicalCarrier, normalizedSubbase);
  return topologyFromBase(eqX, canonicalCarrier, base);
}

export function initialTopology<X>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  maps: ReadonlyArray<InitialMap<X, unknown>>,
): Top<X> {
  const canonicalCarrier = canonicalize(eqX, carrier);
  const base: Array<ReadonlyArray<X>> = [];
  for (const { target, eqTarget, map } of maps) {
    for (const open of target.opens) {
      const preimage = canonicalCarrier.filter((x) =>
        open.some((y) => eqTarget(map(x), y)),
      );
      base.push(preimage);
    }
  }
  return topologyFromBase(eqX, canonicalCarrier, base);
}

export function finalTopology<Y>(
  eqY: Eq<Y>,
  carrier: ReadonlyArray<Y>,
  maps: ReadonlyArray<FinalMap<unknown, Y>>,
): Top<Y> {
  const canonicalCarrier = canonicalize(eqY, carrier);
  const eqSet = (A: ReadonlyArray<Y>, B: ReadonlyArray<Y>) => eqArray(eqY, A, B);
  const candidates = allSubsets(canonicalCarrier).map((subset) =>
    normalizeSubset(eqY, canonicalCarrier, subset),
  );
  const opens = candidates.filter((candidate) =>
    maps.every(({ source, eqSource, map }) => {
      const preimage = source.carrier.filter((x) =>
        candidate.some((y) => eqY(map(x), y)),
      );
      return source.opens.some((open) => eqArray(eqSource, open, preimage));
    }),
  );
  const uniqueOpens: Array<ReadonlyArray<Y>> = [];
  for (const candidate of opens) {
    pushUnique(eqSet, uniqueOpens, candidate);
  }
  const topology: Top<Y> = { carrier: canonicalCarrier, opens: uniqueOpens };
  if (!isTopology(eqY, topology)) {
    throw new Error("Final topology construction failed the topology axioms");
  }
  return topology;
}
