import type { Law, Lawful } from "./Witness";
import { eqDist } from "../prob/Dist";
import { kid, kcomp, kmap } from "../prob/Kleisli";
import type { Kernel } from "../prob/Kleisli";

const eqNum = (a: number, b: number) => a === b;

export function lawfulKleisliCategory(): Lawful<number, { kid: typeof kid; kcomp: typeof kcomp; kmap: typeof kmap }> {
  const tag = "Prob/Kleisli/Category";
  const A = [0, 1, 2];

  const incK: Kernel<number, number> = (a) => [
    { x: a + 1, p: 0.4 },
    { x: a + 2, p: 0.6 },
  ];
  const dblK: Kernel<number, number> = (a) => [{ x: 2 * a, p: 1 }];
  const stepK: Kernel<number, number> = (a) => [
    { x: a - 1, p: 0.3 },
    { x: a + 3, p: 0.7 },
  ];

  const laws: Law<number>[] = [
    {
      name: "identity (left/right)",
      check: () => {
        const idA = kid<number>();
        return A.every(
          (a) =>
            eqDist(eqNum, kcomp(idA, incK)(a), incK(a)) &&
            eqDist(eqNum, kcomp(incK, idA)(a), incK(a))
        );
      },
    },
    {
      name: "associativity",
      check: () => {
        const lhs = kcomp(kcomp(incK, dblK), stepK);
        const rhs = kcomp(incK, kcomp(dblK, stepK));
        return A.every((a) => eqDist(eqNum, lhs(a), rhs(a)));
      },
    },
    {
      name: "naturality of kmap along precomposition",
      check: () => {
        const g = (b: number) => b % 2;
        const h = (z: { n: number }) => z.n;
        const Z = [{ n: 0 }, { n: 1 }, { n: 2 }];
        const lhs = (z: { n: number }) => kmap(incK, g)(h(z));
        const rhs = (z: { n: number }) => ((a: number) => kmap(incK, g)(a))(h(z));
        return Z.every((z) => eqDist((x: number, y: number) => x === y, lhs(z), rhs(z)));
      },
    },
  ];

  return { tag, eq: eqNum, struct: { kid, kcomp, kmap }, laws };
}
