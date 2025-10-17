import type { Top } from "./Topology";
import { product } from "./Topology";
import { coneLeg, makeMediator, makeUniversalPropertyReport } from "./limits";
import type {
  LegCheckResult,
  MediatorCheckResult,
  UniversalPropertyReport,
} from "./limits";

type Eq<X> = (a: X, b: X) => boolean;

type Pair<X, Y> = { readonly x: X; readonly y: Y };

export function proj1<X, Y>(p: Pair<X, Y>): X {
  return p.x;
}

export function proj2<X, Y>(p: Pair<X, Y>): Y {
  return p.y;
}

export function pair<Z, X, Y>(f: (z: Z) => X, g: (z: Z) => Y): (z: Z) => Pair<X, Y> {
  return (z) => ({ x: f(z), y: g(z) });
}

function eqPair<X, Y>(eqX: Eq<X>, eqY: Eq<Y>, a: Pair<X, Y>, b: Pair<X, Y>): boolean {
  return eqX(a.x, b.x) && eqY(a.y, b.y);
}

export interface ProductLegMetadata {
  readonly continuous: boolean;
}

export interface ProductMediatorMetadata {
  readonly continuous: boolean;
  readonly triangles: boolean;
}

export interface CheckProductUPResult<Z, X, Y>
  extends UniversalPropertyReport<
    (pair: Pair<X, Y>) => unknown,
    (z: Z) => Pair<X, Y>,
    ProductLegMetadata,
    ProductMediatorMetadata
  > {
  readonly cProj1: boolean;
  readonly cProj2: boolean;
  readonly cPair: boolean;
  readonly uniqueHolds: boolean;
  readonly productTopology: Top<Pair<X, Y>>;
}

/**
 * Finite universal property checker for topological products.
 */
export function checkProductUP<Z, X, Y>(
  eqZ: Eq<Z>,
  eqX: Eq<X>,
  eqY: Eq<Y>,
  TZ: Top<Z>,
  TX: Top<X>,
  TY: Top<Y>,
  f: (z: Z) => X,
  g: (z: Z) => Y,
  continuous: <A, B>(
    eqA: Eq<A>,
    TA: Top<A>,
    TB: Top<B>,
    h: (a: A) => B,
    eqB?: Eq<B>,
  ) => boolean,
): CheckProductUPResult<Z, X, Y> {
  const productTopology = product(eqX, eqY, TX, TY);
  const eqProd = (a: Pair<X, Y>, b: Pair<X, Y>) => eqPair(eqX, eqY, a, b);
  const p = pair(f, g);

  const pi1 = proj1 as (pair: Pair<X, Y>) => X;
  const pi2 = proj2 as (pair: Pair<X, Y>) => Y;

  const cProj1 = continuous(eqProd, productTopology, TX, pi1, eqX);
  const cProj2 = continuous(eqProd, productTopology, TY, pi2, eqY);
  const cPair = continuous(eqZ, TZ, productTopology, p, eqProd);

  const uniqueHolds = TZ.carrier.every((z) => {
    const paired = p(z);
    return eqX(proj1(paired), f(z)) && eqY(proj2(paired), g(z));
  });

  const legProj1: LegCheckResult<
    (pair: Pair<X, Y>) => unknown,
    ProductLegMetadata
  > = {
    leg: coneLeg<(pair: Pair<X, Y>) => X, ProductLegMetadata>("π₁", pi1, {
      continuous: cProj1,
    }),
    holds: cProj1,
    ...(cProj1 ? {} : { failure: "Projection π₁ is not continuous." }),
    metadata: { continuous: cProj1 },
  };

  const legProj2: LegCheckResult<
    (pair: Pair<X, Y>) => unknown,
    ProductLegMetadata
  > = {
    leg: coneLeg<(pair: Pair<X, Y>) => Y, ProductLegMetadata>("π₂", pi2, {
      continuous: cProj2,
    }),
    holds: cProj2,
    ...(cProj2 ? {} : { failure: "Projection π₂ is not continuous." }),
    metadata: { continuous: cProj2 },
  };

  const legs: ReadonlyArray<
    LegCheckResult<(pair: Pair<X, Y>) => unknown, ProductLegMetadata>
  > = [legProj1, legProj2];

  const mediatorFailure = !cPair
    ? "Pairing map is not continuous."
    : !uniqueHolds
    ? "Pairing map does not reproduce the supplied legs."
    : undefined;

  const mediatorEntry: MediatorCheckResult<
    (z: Z) => Pair<X, Y>,
    ProductMediatorMetadata
  > = {
    mediator: makeMediator<(z: Z) => Pair<X, Y>, ProductMediatorMetadata>(
      "pairing",
      p,
      {
        continuous: cPair,
        triangles: uniqueHolds,
      },
    ),
    holds: cPair && uniqueHolds,
    ...(mediatorFailure !== undefined && { failure: mediatorFailure }),
    metadata: { continuous: cPair, triangles: uniqueHolds },
  };

  const report = makeUniversalPropertyReport<
    (pair: Pair<X, Y>) => unknown,
    (z: Z) => Pair<X, Y>,
    ProductLegMetadata,
    ProductMediatorMetadata
  >({
    legs,
    mediators: [mediatorEntry],
  });

  return {
    ...report,
    cProj1,
    cProj2,
    cPair,
    uniqueHolds,
    productTopology,
  } satisfies CheckProductUPResult<Z, X, Y>;
}
