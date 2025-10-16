import { describe, expect, it } from "vitest";
import {
  boundary,
  closedSets,
  closure,
  continuous,
  discrete,
  indiscrete,
  interior,
  isCompact,
  isConnected,
  isHausdorff,
  isTopology,
  product,
  specializationOrder,
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

  it("computes closures, interiors, boundaries, and connectedness", () => {
    const TX = discrete([0, 1, 2]);
    const subset = [0, 2];
    expect(closure(eqNum, TX, subset)).toEqual(subset);
    expect(interior(eqNum, TX, subset)).toEqual(subset);
    expect(boundary(eqNum, TX, subset)).toEqual([]);
    expect(isConnected(eqNum, TX)).toBe(false);

    const TI = indiscrete([0, 1, 2]);
    expect(closure(eqNum, TI, subset)).toEqual(TI.carrier);
    expect(interior(eqNum, TI, subset)).toEqual([]);
    expect(boundary(eqNum, TI, subset)).toEqual(TI.carrier);
    expect(isConnected(eqNum, TI)).toBe(true);
  });

  it("derives closed sets and specialization order on a Sierpiński space", () => {
    const sierpinski = {
      carrier: [0, 1],
      opens: [[], [1], [0, 1]],
    } as const;

    expect(closedSets(eqNum, sierpinski)).toEqual([[0, 1], [0], []]);
    expect(specializationOrder(eqNum, sierpinski)).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
    ]);
  });
});
