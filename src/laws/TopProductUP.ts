import type { Law, Lawful } from "./Witness";
import { continuous, discrete } from "../top/Topology";
import { checkProductUP } from "../top/ProductUP";

const eqNum = (a: number, b: number) => a === b;

export function lawfulTopProductUP(): Lawful<number, { readonly tag: string }> {
  const tag = "Top/ProductUP";
  const X = [0, 1];
  const Y = [10, 20, 30];
  const Z = [42, 99];
  const TX = discrete(X);
  const TY = discrete(Y);
  const TZ = discrete(Z);
  const f = (z: number) => (z === 42 ? 0 : 1);
  const g = (_: number) => 20;

  const laws: Law<number>[] = [
    {
      name: "projections and pairing satisfy the universal property",
      check: () => {
        const result = checkProductUP(eqNum, eqNum, eqNum, TZ, TX, TY, f, g, continuous);
        return result.holds;
      },
    },
  ];

  return { tag, eq: eqNum, struct: { tag }, laws };
}
