import type { Top } from "./Topology";

type Eq<X> = (a: X, b: X) => boolean;

type InitialLeg<X, Y> = {
  readonly target: Top<Y>;
  readonly map: (x: X) => Y;
  readonly eqTarget: Eq<Y>;
};

type FinalLeg<X, Y> = {
  readonly source: Top<X>;
  readonly map: (x: X) => Y;
  readonly eqSource: Eq<X>;
};

function dedupeElements<X>(eq: Eq<X>, items: ReadonlyArray<X>): X[] {
  const result: X[] = [];
  for (const item of items) {
    if (!result.some((existing) => eq(existing, item))) {
      result.push(item);
    }
  }
  return result;
}

function sanitizeSubset<X>(eq: Eq<X>, carrier: ReadonlyArray<X>, subset: ReadonlyArray<X>): X[] {
  return dedupeElements(eq, subset.filter((candidate) => carrier.some((x) => eq(x, candidate))));
}

function eqSet<X>(eq: Eq<X>, A: ReadonlyArray<X>, B: ReadonlyArray<X>): boolean {
  return (
    A.length === B.length &&
    A.every((a) => B.some((b) => eq(a, b))) &&
    B.every((b) => A.some((a) => eq(a, b)))
  );
}

function addUnique<X>(
  eq: Eq<X>,
  carrier: ReadonlyArray<X>,
  sets: X[][],
  candidate: ReadonlyArray<X>,
): boolean {
  const sanitized = sanitizeSubset(eq, carrier, candidate);
  if (sets.some((existing) => eqSet(eq, existing, sanitized))) {
    return false;
  }
  sets.push(sanitized);
  return true;
}

function intersection<X>(eq: Eq<X>, A: ReadonlyArray<X>, B: ReadonlyArray<X>): X[] {
  return A.filter((a) => B.some((b) => eq(a, b)));
}

function union<X>(eq: Eq<X>, A: ReadonlyArray<X>, B: ReadonlyArray<X>): X[] {
  return dedupeElements(eq, [...A, ...B]);
}

export function topologyFromBase<X>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  base: ReadonlyArray<ReadonlyArray<X>>,
): Top<X> {
  const normalizedCarrier = dedupeElements(eqX, carrier);
  const opens: X[][] = [];
  addUnique(eqX, normalizedCarrier, opens, []);
  addUnique(eqX, normalizedCarrier, opens, normalizedCarrier);
  for (const B of base) {
    addUnique(eqX, normalizedCarrier, opens, B);
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const U of opens.slice()) {
      for (const V of opens.slice()) {
        const unionSet = union(eqX, U, V);
        const interSet = intersection(eqX, U, V);
        const before = opens.length;
        if (addUnique(eqX, normalizedCarrier, opens, unionSet)) {
          changed = true;
        }
        if (addUnique(eqX, normalizedCarrier, opens, interSet)) {
          changed = true;
        }
        if (opens.length > before && changed) {
          // Continue closure after new sets were added.
          // eslint-disable-next-line no-continue
          continue;
        }
      }
    }
  }
  return { carrier: normalizedCarrier, opens };
}

export function topologyFromSubbase<X>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  subbase: ReadonlyArray<ReadonlyArray<X>>,
): Top<X> {
  const normalizedCarrier = dedupeElements(eqX, carrier);
  const sanitizedSubbase = subbase.map((S) => sanitizeSubset(eqX, normalizedCarrier, S));
  const base: X[][] = [];
  addUnique(eqX, normalizedCarrier, base, normalizedCarrier);
  const explore = (start: number, current: ReadonlyArray<X>) => {
    for (let index = start; index < sanitizedSubbase.length; index += 1) {
      const candidate = sanitizedSubbase[index];
      if (candidate === undefined) {
        continue;
      }
      const next = intersection(eqX, current, candidate);
      addUnique(eqX, normalizedCarrier, base, next);
      explore(index + 1, next);
    }
  };
  explore(0, normalizedCarrier);
  return topologyFromBase(eqX, normalizedCarrier, base);
}

function preimage<X, Y>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  map: (x: X) => Y,
  open: ReadonlyArray<Y>,
  eqY: Eq<Y>,
): X[] {
  return sanitizeSubset(eqX, carrier, carrier.filter((x) => open.some((y) => eqY(map(x), y))));
}

export function initialTopology<X>(
  eqX: Eq<X>,
  carrier: ReadonlyArray<X>,
  legs: ReadonlyArray<InitialLeg<X, any>>,
): Top<X> {
  const normalizedCarrier = dedupeElements(eqX, carrier);
  const subbase: X[][] = [];
  for (const leg of legs) {
    for (const open of leg.target.opens) {
      const pre = preimage(eqX, normalizedCarrier, leg.map, open, leg.eqTarget);
      addUnique(eqX, normalizedCarrier, subbase, pre);
    }
  }
  return topologyFromSubbase(eqX, normalizedCarrier, subbase);
}

function enumerateSubsets<X>(items: ReadonlyArray<X>): X[][] {
  const subsets: X[][] = [[]];
  for (const item of items) {
    const additions = subsets.map((subset) => [...subset, item]);
    subsets.push(...additions);
  }
  return subsets;
}

export function finalTopology<Y>(
  eqY: Eq<Y>,
  carrier: ReadonlyArray<Y>,
  legs: ReadonlyArray<FinalLeg<any, Y>>,
): Top<Y> {
  const normalizedCarrier = dedupeElements(eqY, carrier);
  const opens: Y[][] = [];
  for (const candidate of enumerateSubsets(normalizedCarrier)) {
    const sanitizedCandidate = sanitizeSubset(eqY, normalizedCarrier, candidate);
    const valid = legs.every((leg) => {
      const pre = leg.source.carrier.filter((x) => sanitizedCandidate.some((y) => eqY(leg.map(x), y)));
      return leg.source.opens.some((open) => eqSet(leg.eqSource, open, pre));
    });
    if (valid) {
      addUnique(eqY, normalizedCarrier, opens, sanitizedCandidate);
    }
  }
  addUnique(eqY, normalizedCarrier, opens, []);
  addUnique(eqY, normalizedCarrier, opens, normalizedCarrier);
  return { carrier: normalizedCarrier, opens };
}

export type { Eq as EqTop, InitialLeg, FinalLeg };
