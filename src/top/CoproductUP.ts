import type { Top, CoproductPoint } from "./Topology";
import { coproduct } from "./Topology";

type Eq<X> = (a: X, b: X) => boolean;

type Sum<X, Y> = CoproductPoint<X, Y>;

type ContinuousChecker = <A, B>(
  eqA: Eq<A>,
  TA: Top<A>,
  TB: Top<B>,
  h: (a: A) => B,
  eqB?: Eq<B>,
) => boolean;

function eqSum<X, Y>(eqX: Eq<X>, eqY: Eq<Y>, a: Sum<X, Y>, b: Sum<X, Y>): boolean {
  if (a.tag !== b.tag) {
    return false;
  }
  return a.tag === "inl" ? eqX(a.value, (b as typeof a).value) : eqY(a.value, (b as typeof a).value);
}

function inl<X>(value: X): Sum<X, never> {
  return { tag: "inl", value };
}

function inr<Y>(value: Y): Sum<never, Y> {
  return { tag: "inr", value };
}

export type CheckCoproductUPResult<X, Y, Z> = {
  readonly cInl: boolean;
  readonly cInr: boolean;
  readonly cCopair: boolean;
  readonly uniqueHolds: boolean;
  readonly coproductTopology: Top<Sum<X, Y>>;
};

/**
 * Finite universal property checker for topological coproducts (disjoint unions).
 */
export function checkCoproductUP<X, Y, Z>(
  eqX: Eq<X>,
  eqY: Eq<Y>,
  eqZ: Eq<Z>,
  TX: Top<X>,
  TY: Top<Y>,
  TZ: Top<Z>,
  f: (x: X) => Z,
  g: (y: Y) => Z,
  continuous: ContinuousChecker,
): CheckCoproductUPResult<X, Y, Z> {
  const coproductTopology = coproduct(eqX, eqY, TX, TY);
  const eq = (a: Sum<X, Y>, b: Sum<X, Y>) => eqSum(eqX, eqY, a, b);
  const injL = (x: X): Sum<X, Y> => inl<X>(x) as Sum<X, Y>;
  const injR = (y: Y): Sum<X, Y> => inr<Y>(y) as Sum<X, Y>;
  const copaired = (pt: Sum<X, Y>): Z => (pt.tag === "inl" ? f(pt.value) : g(pt.value));

  const cInl = continuous(eqX, TX, coproductTopology, injL, eq);
  const cInr = continuous(eqY, TY, coproductTopology, injR, eq);
  const cCopair = continuous(eq, coproductTopology, TZ, copaired, eqZ);

  const leftTriangles = TX.carrier.every((x) => eqZ(copaired(injL(x)), f(x)));
  const rightTriangles = TY.carrier.every((y) => eqZ(copaired(injR(y)), g(y)));

  return {
    cInl,
    cInr,
    cCopair,
    uniqueHolds: leftTriangles && rightTriangles,
    coproductTopology,
  };
}
