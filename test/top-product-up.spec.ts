import { describe, expect, it } from "vitest";
import { continuous, discrete } from "../src/top/Topology";
import { checkProductUP, pair, proj1, proj2 } from "../src/top/ProductUP";
import { subspace } from "../src/top/Subspace";

const eqNum = (a: number, b: number) => a === b;
const eqPair = (
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number },
) => a.x === b.x && a.y === b.y;

describe("Product universal property on finite spaces", () => {
  const X = [0, 1];
  const Y = [10, 20, 30];
  const Z = [42, 99];
  const TX = discrete(X);
  const TY = discrete(Y);
  const TZ = discrete(Z);

  const f = (z: number) => (z === 42 ? 0 : 1);
  const g = (_: number) => 20;

  it("projections and pairing satisfy the universal property", () => {
    const result = checkProductUP(eqNum, eqNum, eqNum, TZ, TX, TY, f, g, continuous);

    expect(result.cProj1).toBe(true);
    expect(result.cProj2).toBe(true);
    expect(result.cPair).toBe(true);
    expect(result.uniqueHolds).toBe(true);

    const projected = result.productTopology.carrier.map((pt) => ({
      x: proj1(pt),
      y: proj2(pt),
    }));
    expect(
      projected.every((pt, index) => {
        const target = result.productTopology.carrier[index];
        return target !== undefined && eqPair(pt, target);
      }),
    ).toBe(true);

    const paired = TZ.carrier.map(pair(f, g));
    expect(paired.every((pt) => pt.y === 20)).toBe(true);
  });

  it("subspace topology inherits opens from the ambient space", () => {
    const subset = [0];
    const sub = subspace(eqNum, TX, subset);
    expect(sub.carrier).toEqual(subset);
    expect(sub.opens.some((U) => U.length === 0)).toBe(true);
    expect(sub.opens.some((U) => U.length === 1 && U[0] === 0)).toBe(true);
  });
});
