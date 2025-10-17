import { product, type Top, continuous } from "./Topology";
import { pair, proj1, proj2 } from "./ProductUP";
import {
  finalTopology,
  initialTopology,
  type FinalMap,
  type InitialMap,
} from "./InitialFinal";

type Eq<X> = (a: X, b: X) => boolean;

export type ProductPoint<X, Y> = { readonly x: X; readonly y: Y };

export type ContinuityWitness<X, Y> = {
  readonly holds: true;
  readonly verify: () => boolean;
};

export type ContinuousMap<X, Y> = {
  readonly source: Top<X>;
  readonly target: Top<Y>;
  readonly eqSource: Eq<X>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
  readonly witness: ContinuityWitness<X, Y>;
};

type InitialTopologyRequest<X> = {
  readonly kind: "initial";
  readonly carrier: ReadonlyArray<X>;
  readonly maps?: ReadonlyArray<InitialMap<X, unknown>>;
};

type FinalTopologyRequest<Y> = {
  readonly kind: "final";
  readonly carrier: ReadonlyArray<Y>;
  readonly maps?: ReadonlyArray<FinalMap<unknown, Y>>;
};

type ResolvedContinuousMapData<X, Y> = {
  readonly source: Top<X>;
  readonly target: Top<Y>;
  readonly eqSource: Eq<X>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
};

type ContinuousMapInput<X, Y> = {
  readonly source: Top<X> | InitialTopologyRequest<X>;
  readonly target: Top<Y> | FinalTopologyRequest<Y>;
  readonly eqSource: Eq<X>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
};

function isInitialRequest<X>(
  value: Top<X> | InitialTopologyRequest<X>,
): value is InitialTopologyRequest<X> {
  return (value as InitialTopologyRequest<X>).kind === "initial";
}

function isFinalRequest<Y>(
  value: Top<Y> | FinalTopologyRequest<Y>,
): value is FinalTopologyRequest<Y> {
  return (value as FinalTopologyRequest<Y>).kind === "final";
}

function resolveInitialMaps<X, Y>(
  data: ContinuousMapInput<X, Y>,
  request: InitialTopologyRequest<X>,
): ReadonlyArray<InitialMap<X, unknown>> {
  const maps: Array<InitialMap<X, unknown>> = [...(request.maps ?? [])];
  if (!isFinalRequest(data.target)) {
    maps.push({ target: data.target, eqTarget: data.eqTarget, map: data.map });
  }
  if (maps.length === 0) {
    throw new Error(
      "initial topology request requires explicit maps when the codomain topology is inferred",
    );
  }
  return maps;
}

function resolveFinalMaps<X, Y>(
  data: ContinuousMapInput<X, Y>,
  request: FinalTopologyRequest<Y>,
  resolvedSource: Top<X>,
): ReadonlyArray<FinalMap<unknown, Y>> {
  const maps: Array<FinalMap<unknown, Y>> = [...(request.maps ?? [])];
  maps.push({ source: resolvedSource, eqSource: data.eqSource, map: data.map });
  return maps;
}

export function certifyContinuity<X, Y>({
  source,
  target,
  eqSource,
  eqTarget,
  map,
}: ResolvedContinuousMapData<X, Y>): ContinuityWitness<X, Y> {
  const holds = continuous(eqSource, source, target, map, eqTarget);
  if (!holds) {
    throw new Error("map is not continuous");
  }
  return {
    holds: true,
    verify: () => continuous(eqSource, source, target, map, eqTarget),
  };
}

export function makeContinuousMap<X, Y>(data: ContinuousMapInput<X, Y>): ContinuousMap<X, Y> {
  const sourceTopology = isInitialRequest(data.source)
    ? initialTopology(data.eqSource, data.source.carrier, resolveInitialMaps(data, data.source))
    : data.source;
  const targetTopology = isFinalRequest(data.target)
    ? finalTopology(
        data.eqTarget,
        data.target.carrier,
        resolveFinalMaps(data, data.target, sourceTopology),
      )
    : data.target;
  const resolved: ResolvedContinuousMapData<X, Y> = {
    source: sourceTopology,
    target: targetTopology,
    eqSource: data.eqSource,
    eqTarget: data.eqTarget,
    map: data.map,
  };
  return {
    ...resolved,
    witness: certifyContinuity(resolved),
  };
}

export function identity<X>(eqX: Eq<X>, TX: Top<X>): ContinuousMap<X, X> {
  return makeContinuousMap({
    source: TX,
    target: TX,
    eqSource: eqX,
    eqTarget: eqX,
    map: (x) => x,
  });
}

export function compose<X, Y, Z>(
  g: ContinuousMap<Y, Z>,
  f: ContinuousMap<X, Y>,
): ContinuousMap<X, Z> {
  if (f.target !== g.source) {
    throw new Error("compose: target/source topology mismatch");
  }
  if (f.eqTarget !== g.eqSource) {
    throw new Error("compose: equality witness mismatch");
  }
  return makeContinuousMap({
    source: f.source,
    target: g.target,
    eqSource: f.eqSource,
    eqTarget: g.eqTarget,
    map: (x) => g.map(f.map(x)),
  });
}

function eqPair<X, Y>(eqX: Eq<X>, eqY: Eq<Y>, a: ProductPoint<X, Y>, b: ProductPoint<X, Y>): boolean {
  return eqX(a.x, b.x) && eqY(a.y, b.y);
}

export function productTopology<X, Y>(
  eqX: Eq<X>,
  eqY: Eq<Y>,
  TX: Top<X>,
  TY: Top<Y>,
): { readonly topology: Top<ProductPoint<X, Y>>; readonly eq: Eq<ProductPoint<X, Y>> } {
  const topology = product(eqX, eqY, TX, TY);
  return {
    topology,
    eq: (a, b) => eqPair(eqX, eqY, a, b),
  };
}

export type ProductStructure<X, Y> = {
  readonly topology: Top<ProductPoint<X, Y>>;
  readonly eq: Eq<ProductPoint<X, Y>>;
  readonly proj1: ContinuousMap<ProductPoint<X, Y>, X>;
  readonly proj2: ContinuousMap<ProductPoint<X, Y>, Y>;
};

export function productStructure<X, Y>(
  eqX: Eq<X>,
  eqY: Eq<Y>,
  TX: Top<X>,
  TY: Top<Y>,
): ProductStructure<X, Y> {
  const { topology, eq } = productTopology(eqX, eqY, TX, TY);
  return {
    topology,
    eq,
    proj1: makeContinuousMap({
      source: topology,
      target: TX,
      eqSource: eq,
      eqTarget: eqX,
      map: proj1,
    }),
    proj2: makeContinuousMap({
      source: topology,
      target: TY,
      eqSource: eq,
      eqTarget: eqY,
      map: proj2,
    }),
  };
}

export function projection1<X, Y>(structure: ProductStructure<X, Y>): ContinuousMap<ProductPoint<X, Y>, X> {
  return structure.proj1;
}

export function projection2<X, Y>(structure: ProductStructure<X, Y>): ContinuousMap<ProductPoint<X, Y>, Y> {
  return structure.proj2;
}

export function pairing<Z, X, Y>(
  f: ContinuousMap<Z, X>,
  g: ContinuousMap<Z, Y>,
  productInfo?: { readonly topology: Top<ProductPoint<X, Y>>; readonly eq: Eq<ProductPoint<X, Y>> },
): ContinuousMap<Z, ProductPoint<X, Y>> {
  if (f.source !== g.source) {
    throw new Error("pairing: domain topology mismatch");
  }
  if (f.eqSource !== g.eqSource) {
    throw new Error("pairing: domain equality mismatch");
  }
  const { topology, eq } =
    productInfo ?? productTopology(f.eqTarget, g.eqTarget, f.target, g.target);
  return makeContinuousMap({
    source: f.source,
    target: topology,
    eqSource: f.eqSource,
    eqTarget: eq,
    map: pair(f.map, g.map),
  });
}
