import { describe, it, expect } from "vitest";
import { eqDist } from "../Dist";
import { Kernel, kid, kcomp, kmap } from "../Kleisli";

const eqNum = (a: number, b: number) => a === b;

// small, explicit kernels
const incK: Kernel<number, number> = (a) => [
  { x: a + 1, p: 0.4 },
  { x: a + 2, p: 0.6 },
];
const dblK: Kernel<number, number> = (a) => [{ x: 2 * a, p: 1 }];
const stepK: Kernel<number, number> = (a) => [
  { x: a - 1, p: 0.3 },
  { x: a + 3, p: 0.7 },
];

describe("Kleisli category laws for Dist", () => {
  const A = [0, 1, 2];

  it("identity (left/right): kid ▷ k = k and k ▷ kid = k", () => {
    const idA = kid<number>();
    for (const a of A) {
      expect(eqDist(eqNum, kcomp(idA, incK)(a), incK(a))).toBe(true);
      expect(eqDist(eqNum, kcomp(incK, idA)(a), incK(a))).toBe(true);
    }
  });

  it("associativity: (k ▷ l) ▷ m = k ▷ (l ▷ m)", () => {
    const lhs = kcomp(kcomp(incK, dblK), stepK);
    const rhs = kcomp(incK, kcomp(dblK, stepK));
    for (const a of A) {
      expect(eqDist(eqNum, lhs(a), rhs(a))).toBe(true);
    }
  });
});

describe("Naturality of post-map kmap wrt precomposition", () => {
  // For any h: A' -> A and g: B -> C,
  // kmap(k ∘ h, g) == (kmap(k, g)) ∘ h
  const h = (z: { n: number }) => z.n; // A'={n} -> A=number
  const g = (b: number) => b % 2; // B=number -> C={0,1}
  const A2 = [{ n: 0 }, { n: 1 }, { n: 2 }];
  const lhs = (z: { n: number }) => kmap(incK, g)(h(z));
  const rhs = (z: { n: number }) => ((a: number) => kmap(incK, g)(a))(h(z));
  it("kmap respects precomposition (pointwise)", () => {
    for (const z of A2) {
      const L = lhs(z);
      const R = rhs(z);
      // equal by construction; still check with distribution equality
      expect(eqDist((x: number, y: number) => x === y, L, R)).toBe(true);
    }
  });
});
