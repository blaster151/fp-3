import { product, type Top, continuous } from "./Topology";
import { pair, proj1, proj2 } from "./ProductUP";

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

type ContinuousMapData<X, Y> = {
  readonly source: Top<X>;
  readonly target: Top<Y>;
  readonly eqSource: Eq<X>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
};

export function certifyContinuity<X, Y>({
  source,
  target,
  eqSource,
  eqTarget,
  map,
}: ContinuousMapData<X, Y>): ContinuityWitness<X, Y> {
  const holds = continuous(eqSource, source, target, map, eqTarget);
  if (!holds) {
    throw new Error("map is not continuous");
  }
  return {
    holds: true,
    verify: () => continuous(eqSource, source, target, map, eqTarget),
  };
}

export function makeContinuousMap<X, Y>(data: ContinuousMapData<X, Y>): ContinuousMap<X, Y> {
  return {
    ...data,
    witness: certifyContinuity(data),
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
