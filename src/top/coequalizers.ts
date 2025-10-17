import { compose, makeContinuousMap, type ContinuousMap } from "./ContinuousMap";
import type { Top } from "./Topology";
import { mapsEqual } from "./Embeddings";
import { quotientByRelation } from "./Quotient";
import { makeMediator, makeUniversalPropertyReport, type UniversalPropertyReport } from "./limits";

type Eq<X> = (a: X, b: X) => boolean;

type TopCoequalizerWitness<X, Y> = {
  readonly obj: Top<ReadonlyArray<Y>>;
  readonly coequalize: ContinuousMap<Y, ReadonlyArray<Y>>;
};

type TopCoequalizerComparison<Y> = {
  readonly forward: ContinuousMap<ReadonlyArray<Y>, ReadonlyArray<Y>>;
  readonly backward: ContinuousMap<ReadonlyArray<Y>, ReadonlyArray<Y>>;
};

export interface CoequalizerMediatorMetadata {
  readonly respectsClasses: boolean;
}

export interface CoequalizerFactorizationResult<X, Y, Z>
  extends UniversalPropertyReport<
    never,
    ContinuousMap<ReadonlyArray<Y>, Z>,
    never,
    CoequalizerMediatorMetadata
  > {
  readonly mediator?: ContinuousMap<ReadonlyArray<Y>, Z>;
}

function formatPoint<X>(space: Top<X>, value: X): string {
  const { show } = space;
  if (show !== undefined) {
    return show(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function assertParallelPair<X, Y>(f: ContinuousMap<X, Y>, g: ContinuousMap<X, Y>): void {
  if (f.source !== g.source || f.target !== g.target) {
    throw new Error("topCoequalizer: expected a parallel pair with matching domain and codomain topologies.");
  }
  if (f.eqSource !== g.eqSource || f.eqTarget !== g.eqTarget) {
    throw new Error("topCoequalizer: expected a parallel pair with consistent equality witnesses.");
  }
}

function buildRelation<X, Y>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Y>,
): { relation: Eq<Y>; classes: ReadonlyArray<ReadonlyArray<Y>> } {
  const carrier = f.target.carrier;
  const eqY = f.eqTarget;
  const parent: number[] = carrier.map((_, index) => index);
  const find = (index: number): number => {
    let current = index;
    // Path compression with explicit bounds checks to satisfy the type checker.
    while (parent[current] !== current) {
      const next = parent[current];
      if (next === undefined) {
        break;
      }
      const jump = parent[next];
      parent[current] = jump === undefined ? next : jump;
      current = next;
    }
    return current;
  };
  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent[rootB] = rootA;
    }
  };
  const locate = (value: Y): number => {
    const index = carrier.findIndex((candidate) => eqY(candidate, value));
    if (index === -1) {
      const valueLabel = formatPoint(f.target, value);
      throw new Error(`topCoequalizer: map lands outside the codomain at ${valueLabel}`);
    }
    return index;
  };
  for (const point of carrier) {
    locate(point);
  }
  for (const point of f.source.carrier) {
    const imageF = f.map(point);
    const imageG = g.map(point);
    const idxF = locate(imageF);
    const idxG = locate(imageG);
    union(idxF, idxG);
  }
  const classesByRoot = new Map<number, Y[]>();
  for (let index = 0; index < carrier.length; index += 1) {
    const root = find(index);
    const bucket = classesByRoot.get(root);
    const value = carrier[index];
    if (value === undefined) {
      continue;
    }
    if (bucket === undefined) {
      classesByRoot.set(root, [value]);
    } else if (!bucket.some((candidate) => eqY(candidate, value))) {
      bucket.push(value);
    }
  }
  const classes = Array.from(classesByRoot.values()).map((members) => members as ReadonlyArray<Y>);
  const relation: Eq<Y> = (a, b) => find(locate(a)) === find(locate(b));
  return { relation, classes };
}

function describeClass<Y>(space: Top<Y>, cls: ReadonlyArray<Y>): string {
  const { show } = space;
  const showPoint =
    show ??
    ((value: Y) => {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    });
  return `{ ${cls.map((point) => showPoint(point)).join(", ") || "∅"} }`;
}

export function topCoequalizer<X, Y>(f: ContinuousMap<X, Y>, g: ContinuousMap<X, Y>): TopCoequalizerWitness<X, Y> {
  assertParallelPair(f, g);
  const { relation, classes } = buildRelation(f, g);
  const showClass = (cls: ReadonlyArray<Y>) => describeClass(f.target, cls);
  const { topology, projection } = quotientByRelation({
    source: f.target,
    eqSource: f.eqTarget,
    relation,
    showClass,
  });
  const composedF = compose(projection, f);
  const composedG = compose(projection, g);
  if (!mapsEqual(projection.eqTarget, f.source.carrier, composedF.map, composedG.map)) {
    throw new Error("topCoequalizer: induced coequalizer map does not coequalize the parallel pair.");
  }
  return { obj: topology, coequalize: projection };
}

function assertCoequalizerShape<X, Y>(
  coequalize: ContinuousMap<Y, ReadonlyArray<Y>>,
  target: ContinuousMap<X, Y>,
): void {
  if (coequalize.source !== target.target) {
    throw new Error("topFactorThroughCoequalizer: coequalizer source must match the parallel pair codomain.");
  }
  if (coequalize.eqSource !== target.eqTarget) {
    throw new Error("topFactorThroughCoequalizer: coequalizer equality witness must match the codomain witness.");
  }
}

function assertCoconeShape<X, Y, Z>(
  f: ContinuousMap<X, Y>,
  cocone: ContinuousMap<Y, Z>,
): void {
  if (cocone.source !== f.target) {
    throw new Error("topFactorThroughCoequalizer: cocone source must match the parallel pair codomain.");
  }
  if (cocone.eqSource !== f.eqTarget) {
    throw new Error("topFactorThroughCoequalizer: cocone equality witness must match the codomain witness.");
  }
}

function ensureCoequalizing<X, Y, Z>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Y>,
  cocone: ContinuousMap<Y, Z>,
): void {
  const viaF = compose(cocone, f);
  const viaG = compose(cocone, g);
  if (!mapsEqual(cocone.eqTarget, f.source.carrier, viaF.map, viaG.map)) {
    throw new Error("topFactorThroughCoequalizer: cocone does not coequalize the supplied parallel pair.");
  }
}

export function topFactorThroughCoequalizer<X, Y, Z>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Y>,
  coequalize: ContinuousMap<Y, ReadonlyArray<Y>>,
  cocone: ContinuousMap<Y, Z>,
): CoequalizerFactorizationResult<X, Y, Z> {
  try {
    assertParallelPair(f, g);
    assertCoequalizerShape(coequalize, f);
    assertCoconeShape(f, cocone);
    ensureCoequalizing(f, g, cocone);
    const eqZ = cocone.eqTarget;
    const mediatorMap = (cls: ReadonlyArray<Y>): Z => {
      const representative = cls[0];
      if (representative === undefined) {
        throw new Error("topFactorThroughCoequalizer: empty equivalence class encountered.");
      }
      const image = cocone.map(representative);
      for (const member of cls) {
        const memberImage = cocone.map(member);
        if (!eqZ(image, memberImage)) {
          const clsLabel = describeClass(coequalize.source, cls);
          throw new Error(
            `topFactorThroughCoequalizer: cocone is not constant on ${clsLabel}.`,
          );
        }
      }
      return image;
    };
    const mediator = makeContinuousMap({
      source: coequalize.target,
      target: cocone.target,
      eqSource: coequalize.eqTarget,
      eqTarget: cocone.eqTarget,
      map: mediatorMap,
    });
    const recomposed = compose(mediator, coequalize);
    if (!mapsEqual(cocone.eqTarget, coequalize.source.carrier, recomposed.map, cocone.map)) {
      throw new Error("topFactorThroughCoequalizer: constructed mediator does not reproduce the cocone.");
    }
    const mediatorEntry = {
      mediator: makeMediator<
        ContinuousMap<ReadonlyArray<Y>, Z>,
        CoequalizerMediatorMetadata
      >("coequalizer mediator", mediator, { respectsClasses: true }),
      holds: true,
      metadata: { respectsClasses: true },
    };
    const report = makeUniversalPropertyReport<
      never,
      ContinuousMap<ReadonlyArray<Y>, Z>,
      never,
      CoequalizerMediatorMetadata
    >({
      mediators: [mediatorEntry],
    });
    return { ...report, mediator } satisfies CoequalizerFactorizationResult<X, Y, Z>;
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    const mediatorEntry = {
      mediator: makeMediator<
        ContinuousMap<ReadonlyArray<Y>, Z>,
        CoequalizerMediatorMetadata
      >("coequalizer mediator", undefined, { respectsClasses: false }),
      holds: false,
      failure,
      metadata: { respectsClasses: false },
    };
    const report = makeUniversalPropertyReport<
      never,
      ContinuousMap<ReadonlyArray<Y>, Z>,
      never,
      CoequalizerMediatorMetadata
    >({
      mediators: [mediatorEntry],
    });
    return { ...report, mediator: undefined } satisfies CoequalizerFactorizationResult<X, Y, Z>;
  }
}

export function topCoequalizerComparison<X, Y>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Y>,
  first: ContinuousMap<Y, ReadonlyArray<Y>>,
  second: ContinuousMap<Y, ReadonlyArray<Y>>,
): TopCoequalizerComparison<Y> {
  const forwardReport = topFactorThroughCoequalizer(f, g, first, second);
  if (!forwardReport.mediator) {
    throw new Error(
      `topCoequalizerComparison: unable to construct forward mediator (${forwardReport.failures.join(
        "; ",
      )}).`,
    );
  }
  const backwardReport = topFactorThroughCoequalizer(f, g, second, first);
  if (!backwardReport.mediator) {
    throw new Error(
      `topCoequalizerComparison: unable to construct backward mediator (${backwardReport.failures.join(
        "; ",
      )}).`,
    );
  }
  const forward = forwardReport.mediator;
  const backward = backwardReport.mediator;
  const composedForward = compose(forward, first);
  if (!mapsEqual(second.eqTarget, f.target.carrier, composedForward.map, second.map)) {
    throw new Error("topCoequalizerComparison: forward mediator does not reproduce the second coequalizer.");
  }
  const composedBackward = compose(backward, second);
  if (!mapsEqual(first.eqTarget, f.target.carrier, composedBackward.map, first.map)) {
    throw new Error("topCoequalizerComparison: backward mediator does not reproduce the first coequalizer.");
  }
  const roundTripFirst = compose(backward, forward);
  const idFirst = (cls: ReadonlyArray<Y>) => cls;
  if (!mapsEqual(first.eqTarget, first.target.carrier, roundTripFirst.map, idFirst)) {
    throw new Error("topCoequalizerComparison: backward ∘ forward is not the identity on the first coequalizer.");
  }
  const roundTripSecond = compose(forward, backward);
  const idSecond = (cls: ReadonlyArray<Y>) => cls;
  if (!mapsEqual(second.eqTarget, second.target.carrier, roundTripSecond.map, idSecond)) {
    throw new Error("topCoequalizerComparison: forward ∘ backward is not the identity on the second coequalizer.");
  }
  return { forward, backward };
}

export type {
  CoequalizerFactorizationResult,
  CoequalizerMediatorMetadata,
  TopCoequalizerComparison,
  TopCoequalizerWitness,
};
