import type { Law, Lawful } from "./Witness";
import { continuous, discrete, indiscrete, product } from "../top/Topology";
import { subspace } from "../top/Subspace";
import { inclusion, mapsEqual } from "../top/Embeddings";
import { pair, proj1, proj2 } from "../top/ProductUP";
import { sierpinski } from "../top/Spaces";

const eqNum = (a: number, b: number) => a === b;

type Pair<X, Y> = { readonly x: X; readonly y: Y };

function eqPair<X, Y>(
  eqX: (a: X, b: X) => boolean,
  eqY: (a: Y, b: Y) => boolean,
  a: Pair<X, Y>,
  b: Pair<X, Y>,
): boolean {
  return eqX(a.x, b.x) && eqY(a.y, b.y);
}

export function lawfulTopContinuity(): Lawful<unknown, { tag: "Top/Continuity" }> {
  const tag = "Top/Continuity";

  const X = [0, 1, 2];
  const TXd = discrete(X);
  const TXi = indiscrete(X);
  const TSp = sierpinski();

  const laws: Law<unknown>[] = [
    {
      name: "subspace inclusion is continuous",
      check: (_context: unknown) => {
        const S = [0, 2];
        const TS = subspace(eqNum, TXd, S);
        const i = inclusion(eqNum, S, TXd.carrier);
        return continuous(eqNum, TS, TXd, i, eqNum);
      },
    },
    {
      name: "continuity closed under composition",
      check: (_context: unknown) => {
        const f = (s: number) => (s === 1 ? 0 : 1);
        const g = (_: number) => 2;
        const composed = (s: number) => g(f(s));
        const c1 = continuous(eqNum, TSp, TXi, f, eqNum);
        const c2 = continuous(eqNum, TXi, TXi, g, eqNum);
        const cComp = continuous(eqNum, TSp, TXi, composed, eqNum);
        return c1 && c2 && cComp;
      },
    },
    {
      name: "product projections continuous; pairing satisfies equations (discrete example)",
      check: (_context: unknown) => {
        const Xs = [0, 1];
        const Ys = [10, 20, 30];
        const Zs = [42, 99];
        const TX = discrete(Xs);
        const TY = discrete(Ys);
        const TZ = discrete(Zs);
        const eqProd = (a: Pair<number, number>, b: Pair<number, number>) =>
          eqPair(eqNum, eqNum, a, b);
        const f = (z: number) => (z === 42 ? 0 : 1);
        const g = (_: number) => 20;
        const prodTopology = product(eqNum, eqNum, TX, TY);
        const pairing = pair(f, g);
        const comparePairing = (z: number): Pair<number, number> => ({ x: f(z), y: g(z) });
        const contProj1 = continuous(eqProd, prodTopology, TX, proj1, eqNum);
        const contProj2 = continuous(eqProd, prodTopology, TY, proj2, eqNum);
        const contPair = continuous(eqNum, TZ, prodTopology, pairing, eqProd);
        const eqs =
          mapsEqual(eqNum, TZ.carrier, (z) => proj1(pairing(z)), f) &&
          mapsEqual(eqNum, TZ.carrier, (z) => proj2(pairing(z)), g);
        const pairMatches = mapsEqual(eqProd, TZ.carrier, pairing, comparePairing);
        return contProj1 && contProj2 && contPair && eqs && pairMatches;
      },
    },
  ];

  return { tag, eq: (a: unknown, b: unknown) => a === b, struct: { tag }, laws };
}
