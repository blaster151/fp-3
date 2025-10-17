import { finalTopology } from "./InitialFinal";
import { makeContinuousMap, type ContinuousMap } from "./ContinuousMap";
import type { Top } from "./Topology";

type Eq<X> = (a: X, b: X) => boolean;

type QuotientMap<X, Y> = {
  readonly source: Top<X>;
  readonly eqSource: Eq<X>;
  readonly carrier: ReadonlyArray<Y>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
  readonly showTarget?: (y: Y) => string;
};

type EquivalenceRelation<X> = (a: X, b: X) => boolean;

type QuotientByRelationSpec<X> = {
  readonly source: Top<X>;
  readonly eqSource: Eq<X>;
  readonly relation: EquivalenceRelation<X>;
  readonly showClass?: (cls: ReadonlyArray<X>) => string;
};

type QuotientByRelationResult<X> = {
  readonly topology: Top<ReadonlyArray<X>>;
  readonly projection: ContinuousMap<X, ReadonlyArray<X>>;
  readonly eqClass: Eq<ReadonlyArray<X>>;
};

function dedupe<X>(eq: Eq<X>, items: ReadonlyArray<X>): X[] {
  const result: X[] = [];
  for (const item of items) {
    if (!result.some((existing) => eq(existing, item))) {
      result.push(item);
    }
  }
  return result;
}

function eqSet<X>(eq: Eq<X>, A: ReadonlyArray<X>, B: ReadonlyArray<X>): boolean {
  return (
    A.length === B.length &&
    A.every((a) => B.some((b) => eq(a, b))) &&
    B.every((b) => A.some((a) => eq(a, b)))
  );
}

function ensureImageLandsInCarrier<X, Y>(
  eqTarget: Eq<Y>,
  carrier: ReadonlyArray<Y>,
  source: Top<X>,
  map: (x: X) => Y,
): void {
  for (const point of source.carrier) {
    const image = map(point);
    const hits = carrier.some((candidate) => eqTarget(candidate, image));
    if (!hits) {
      throw new Error("quotientTopology: map lands outside the supplied quotient carrier");
    }
  }
}

function ensureSurjective<X, Y>(
  eqTarget: Eq<Y>,
  carrier: ReadonlyArray<Y>,
  source: Top<X>,
  map: (x: X) => Y,
): void {
  for (const q of carrier) {
    const hit = source.carrier.some((x) => eqTarget(map(x), q));
    if (!hit) {
      throw new Error("quotientTopology: map must be surjective onto the quotient carrier");
    }
  }
}

function extendShow<X>(topology: Top<X>, show?: (x: X) => string): Top<X> {
  if (!show) {
    return topology;
  }
  return {
    ...topology,
    show,
  };
}

export type QuotientWitness<X, Y> = {
  readonly topology: Top<Y>;
  readonly projection: ContinuousMap<X, Y>;
};

export function quotientTopology<X, Y>(spec: QuotientMap<X, Y>): QuotientWitness<X, Y> {
  const canonicalCarrier = dedupe(spec.eqTarget, spec.carrier);
  const selectImage = (value: Y): Y => {
    const representative = canonicalCarrier.find((candidate) => spec.eqTarget(candidate, value));
    if (representative === undefined) {
      throw new Error("quotientTopology: map produced an element outside the quotient carrier");
    }
    return representative;
  };

  const canonicalMap = (x: X) => selectImage(spec.map(x));

  ensureImageLandsInCarrier(spec.eqTarget, canonicalCarrier, spec.source, canonicalMap);
  ensureSurjective(spec.eqTarget, canonicalCarrier, spec.source, canonicalMap);

  const baseTopology = finalTopology(spec.eqTarget, canonicalCarrier, [
    { source: spec.source, map: canonicalMap, eqSource: spec.eqSource },
  ]);
  const topology = extendShow(baseTopology, spec.showTarget);
  const projection = makeContinuousMap({
    source: spec.source,
    target: topology,
    eqSource: spec.eqSource,
    eqTarget: spec.eqTarget,
    map: canonicalMap,
  });

  return { topology, projection };
}

function assertEquivalenceRelation<X>(spec: QuotientByRelationSpec<X>): void {
  const { source, eqSource, relation } = spec;
  for (const x of source.carrier) {
    if (!relation(x, x)) {
      throw new Error("quotientByRelation: relation must be reflexive");
    }
  }
  for (const x of source.carrier) {
    for (const y of source.carrier) {
      if (relation(x, y) && !relation(y, x)) {
        throw new Error("quotientByRelation: relation must be symmetric");
      }
    }
  }
  for (const x of source.carrier) {
    for (const y of source.carrier) {
      for (const z of source.carrier) {
        if (relation(x, y) && relation(y, z) && !relation(x, z)) {
          throw new Error("quotientByRelation: relation must be transitive");
        }
      }
    }
  }
  for (const x of source.carrier) {
    for (const y of source.carrier) {
      if (eqSource(x, y) && !relation(x, y)) {
        throw new Error("quotientByRelation: relation must respect the ambient equality");
      }
    }
  }
}

function computeClassClosure<X>(
  eq: Eq<X>,
  carrier: ReadonlyArray<X>,
  relation: EquivalenceRelation<X>,
  seed: X,
): X[] {
  const visited: X[] = [];
  const queue: X[] = [seed];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }
    if (visited.some((item) => eq(item, current))) {
      continue;
    }
    visited.push(current);
    for (const candidate of carrier) {
      if (relation(current, candidate) && !visited.some((item) => eq(item, candidate))) {
        queue.push(candidate);
      }
    }
  }
  return visited;
}

function partitionIntoClasses<X>(
  eq: Eq<X>,
  carrier: ReadonlyArray<X>,
  relation: EquivalenceRelation<X>,
): ReadonlyArray<ReadonlyArray<X>> {
  const classes: Array<ReadonlyArray<X>> = [];
  const covered: X[] = [];
  for (const point of carrier) {
    if (covered.some((item) => eq(item, point))) {
      continue;
    }
    const closure = computeClassClosure(eq, carrier, relation, point);
    classes.push(closure);
    covered.push(...closure);
  }
  return classes;
}

function defaultShowClass<X>(source: Top<X>): (cls: ReadonlyArray<X>) => string {
  const pointShow =
    source.show ??
    ((value: X) => {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    });
  return (cls) => `{ ${cls.map((item) => pointShow(item)).join(", ") || "∅"} }`;
}

export function quotientByRelation<X>(spec: QuotientByRelationSpec<X>): QuotientByRelationResult<X> {
  assertEquivalenceRelation(spec);
  const classes = partitionIntoClasses(spec.eqSource, spec.source.carrier, spec.relation);
  const eqClass: Eq<ReadonlyArray<X>> = (A, B) => eqSet(spec.eqSource, A, B);
  const locateClass = (point: X): ReadonlyArray<X> => {
    const match = classes.find((cls) => cls.some((member) => spec.relation(point, member)));
    if (match === undefined) {
      throw new Error("quotientByRelation: unable to locate equivalence class for point");
    }
    return match;
  };
  const showClass = spec.showClass ?? defaultShowClass(spec.source);
  const { topology, projection } = quotientTopology({
    source: spec.source,
    eqSource: spec.eqSource,
    carrier: classes,
    eqTarget: eqClass,
    map: locateClass,
    showTarget: showClass,
  });
  return { topology, projection, eqClass };
}

export type { Eq as EqQuotient, QuotientMap, QuotientByRelationSpec, QuotientByRelationResult };
