import { describe, expect, it } from "vitest";
import {
  continuous,
  discrete,
  indiscrete,
  isCompact,
  isHausdorff,
  isTopology,
  product,
} from "../src/top/Topology";

const eqNum = (a: number, b: number) => a === b;

describe("Finite topology basics", () => {
  const X = [0, 1];

  it("discrete and indiscrete spaces satisfy the topology axioms", () => {
    expect(isTopology(eqNum, discrete(X))).toBe(true);
    expect(isTopology(eqNum, indiscrete(X))).toBe(true);
  });

  it("product of discrete spaces is discrete", () => {
    const TX = discrete([0, 1]);
    const TY = discrete([10, 20, 30]);
    const T = product(eqNum, eqNum, TX, TY);
    expect(isTopology(eqNum, TX)).toBe(true);
    expect(isTopology(eqNum, TY)).toBe(true);
    expect(isTopology((a, b) => a.x === b.x && a.y === b.y, T)).toBe(true);
    expect(T.opens.length).toBe(1 << (TX.carrier.length * TY.carrier.length));
  });

  it("finite spaces are compact and discrete ones are Hausdorff", () => {
    const TX = discrete([0, 1, 2]);
    expect(isCompact(TX)).toBe(true);
    expect(isHausdorff(eqNum, TX)).toBe(true);
    const TI = indiscrete([0, 1, 2]);
    expect(isHausdorff(eqNum, TI)).toBe(false);
  });

  it("identity map is continuous", () => {
    const TX = discrete([0, 1]);
    const id = (x: number) => x;
    expect(continuous(eqNum, TX, TX, id, eqNum)).toBe(true);
  });
});
