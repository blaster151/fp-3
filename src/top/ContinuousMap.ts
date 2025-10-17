import {
  coproduct,
  type CoproductPoint,
  product,
  type Top,
  continuous,
} from "./Topology";
import {
  finalTopology,
  initialTopology,
  type FinalLeg,
  type InitialLeg,
} from "./InitialFinal";
import { pair, proj1, proj2 } from "./ProductUP";

type Eq<X> = (a: X, b: X) => boolean;

export type ProductPoint<X, Y> = { readonly x: X; readonly y: Y };

export type SumPoint<X, Y> = CoproductPoint<X, Y>;

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

type InitialTopologyRequest<X, Y> = {
  readonly carrier: ReadonlyArray<X>;
  readonly extraLegs?: ReadonlyArray<InitialLeg<X, any>>;
  readonly includeMapLeg?: boolean;
};

type FinalTopologyRequest<Y> = {
  readonly carrier: ReadonlyArray<Y>;
  readonly extraLegs?: ReadonlyArray<FinalLeg<any, Y>>;
  readonly includeMapLeg?: boolean;
};

type ResolvedContinuousMapData<X, Y> = {
  readonly source: Top<X>;
  readonly target: Top<Y>;
  readonly eqSource: Eq<X>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
};

type ContinuousMapData<X, Y> = {
  readonly source?: Top<X>;
  readonly target?: Top<Y>;
  readonly eqSource: Eq<X>;
  readonly eqTarget: Eq<Y>;
  readonly map: (x: X) => Y;
  readonly initialSource?: InitialTopologyRequest<X, Y>;
  readonly finalTarget?: FinalTopologyRequest<Y>;
};

function resolveInitialTopology<X, Y>(
  data: ContinuousMapData<X, Y>,
  target: Top<Y>,
): Top<X> {
  const request = data.initialSource;
  if (!request) {
    throw new Error("makeContinuousMap: source topology missing and no initial topology request provided");
  }
  const legs: InitialLeg<X, any>[] = [
    ...(request.extraLegs ?? []),
  ];
  if (request.includeMapLeg ?? true) {
    legs.push({ target, map: data.map, eqTarget: data.eqTarget });
  }
  return initialTopology(data.eqSource, request.carrier, legs);
}

function resolveFinalTopology<X, Y>(
  data: ContinuousMapData<X, Y>,
  source: Top<X>,
): Top<Y> {
  const request = data.finalTarget;
  if (!request) {
    throw new Error("makeContinuousMap: target topology missing and no final topology request provided");
  }
  const legs: FinalLeg<any, Y>[] = [
    ...(request.extraLegs ?? []),
  ];
  if (request.includeMapLeg ?? true) {
    legs.push({ source, map: data.map, eqSource: data.eqSource });
  }
  return finalTopology(data.eqTarget, request.carrier, legs);
}

function resolveTopologies<X, Y>(data: ContinuousMapData<X, Y>): ResolvedContinuousMapData<X, Y> {
  let target = data.target;
  let source = data.source;
  if (!target && !data.finalTarget) {
    throw new Error("makeContinuousMap: target topology required when no final topology request is provided");
  }
  if (!source) {
    if (!target) {
      throw new Error("makeContinuousMap: cannot compute initial topology without target");
    }
    source = resolveInitialTopology(data, target);
  }
  if (!target) {
    target = resolveFinalTopology(data, source);
  }
  return {
    source,
    target,
    eqSource: data.eqSource,
    eqTarget: data.eqTarget,
    map: data.map,
  };
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

export function makeContinuousMap<X, Y>(data: ContinuousMapData<X, Y>): ContinuousMap<X, Y> {
  const resolved = resolveTopologies(data);
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

function eqSum<X, Y>(eqX: Eq<X>, eqY: Eq<Y>, a: SumPoint<X, Y>, b: SumPoint<X, Y>): boolean {
  if (a.tag !== b.tag) {
    return false;
  }
  return a.tag === "inl" ? eqX(a.value, (b as typeof a).value) : eqY(a.value, (b as typeof a).value);
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

export type CoproductStructure<X, Y> = {
  readonly topology: Top<SumPoint<X, Y>>;
  readonly eq: Eq<SumPoint<X, Y>>;
  readonly inl: ContinuousMap<X, SumPoint<X, Y>>;
  readonly inr: ContinuousMap<Y, SumPoint<X, Y>>;
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

export function coproductTopology<X, Y>(
  eqX: Eq<X>,
  eqY: Eq<Y>,
  TX: Top<X>,
  TY: Top<Y>,
): { readonly topology: Top<SumPoint<X, Y>>; readonly eq: Eq<SumPoint<X, Y>> } {
  const topology = coproduct(eqX, eqY, TX, TY);
  return {
    topology,
    eq: (a, b) => eqSum(eqX, eqY, a, b),
  };
}

export function coproductStructure<X, Y>(
  eqX: Eq<X>,
  eqY: Eq<Y>,
  TX: Top<X>,
  TY: Top<Y>,
): CoproductStructure<X, Y> {
  const { topology, eq } = coproductTopology(eqX, eqY, TX, TY);
  return {
    topology,
    eq,
    inl: makeContinuousMap({
      source: TX,
      target: topology,
      eqSource: eqX,
      eqTarget: eq,
      map: (x) => ({ tag: "inl" as const, value: x }),
    }),
    inr: makeContinuousMap({
      source: TY,
      target: topology,
      eqSource: eqY,
      eqTarget: eq,
      map: (y) => ({ tag: "inr" as const, value: y }),
    }),
  };
}

export function injectionLeft<X, Y>(structure: CoproductStructure<X, Y>): ContinuousMap<X, SumPoint<X, Y>> {
  return structure.inl;
}

export function injectionRight<X, Y>(structure: CoproductStructure<X, Y>): ContinuousMap<Y, SumPoint<X, Y>> {
  return structure.inr;
}

export function copair<X, Y, Z>(
  f: ContinuousMap<X, Z>,
  g: ContinuousMap<Y, Z>,
  coproductInfo?: { readonly topology: Top<SumPoint<X, Y>>; readonly eq: Eq<SumPoint<X, Y>> },
): ContinuousMap<SumPoint<X, Y>, Z> {
  if (f.target !== g.target) {
    throw new Error("copair: codomain topology mismatch");
  }
  if (f.eqTarget !== g.eqTarget) {
    throw new Error("copair: codomain equality mismatch");
  }
  const { topology, eq } =
    coproductInfo ?? coproductTopology(f.eqSource, g.eqSource, f.source, g.source);
  return makeContinuousMap({
    source: topology,
    target: f.target,
    eqSource: eq,
    eqTarget: f.eqTarget,
    map: (pt) => (pt.tag === "inl" ? f.map(pt.value) : g.map(pt.value)),
  });
}
