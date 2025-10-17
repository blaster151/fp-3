import { describe, expect, it } from "vitest";
import {
  boundary,
  closedSets,
  closure,
  connectedComponents,
  continuous,
  discrete,
  indiscrete,
  interior,
  isCompact,
  isConnected,
  isHausdorff,
  isNormal,
  isRegular,
  isT0,
  isT1,
  isTotallyDisconnected,
  isTopology,
  product,
  specializationOrder,
} from "../src/top/Topology";

const eqNum = (a: number, b: number) => a === b;

describe("Finite topology basics", () => {
  const X = [0, 1];
  const sierpinski = {
    carrier: [0, 1],
    opens: [[], [1], [0, 1]],
  } as const;
  const excludedPoint = {
    carrier: [0, 1, 2],
    opens: [[], [0], [0, 1], [0, 2], [0, 1, 2]],
  } as const;

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
    expect(closedSets(eqNum, sierpinski)).toEqual([[0, 1], [0], []]);
    expect(specializationOrder(eqNum, sierpinski)).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
    ]);
  });

  it("classifies separation axioms across finite fixtures", () => {
    const discreteSpace = discrete([0, 1, 2]);
    const indiscreteSpace = indiscrete([0, 1, 2]);

    expect(isT0(eqNum, discreteSpace)).toBe(true);
    expect(isT1(eqNum, discreteSpace)).toBe(true);
    expect(isRegular(eqNum, discreteSpace)).toBe(true);
    expect(isNormal(eqNum, discreteSpace)).toBe(true);

    expect(isT0(eqNum, sierpinski)).toBe(true);
    expect(isT1(eqNum, sierpinski)).toBe(false);
    expect(isRegular(eqNum, sierpinski)).toBe(false);
    expect(isNormal(eqNum, sierpinski)).toBe(true);

    expect(isT0(eqNum, indiscreteSpace)).toBe(false);
    expect(isT1(eqNum, indiscreteSpace)).toBe(false);
    expect(isRegular(eqNum, indiscreteSpace)).toBe(false);
    expect(isNormal(eqNum, indiscreteSpace)).toBe(true);

    expect(isT0(eqNum, excludedPoint)).toBe(true);
    expect(isT1(eqNum, excludedPoint)).toBe(false);
    expect(isRegular(eqNum, excludedPoint)).toBe(false);
    expect(isNormal(eqNum, excludedPoint)).toBe(false);
  });

  it("extracts connected components and total disconnectedness", () => {
    const discreteSpace = discrete([0, 1, 2]);
    const indiscreteSpace = indiscrete([0, 1, 2]);

    expect(connectedComponents(eqNum, discreteSpace)).toEqual([[0], [1], [2]]);
    expect(isTotallyDisconnected(eqNum, discreteSpace)).toBe(true);

    expect(connectedComponents(eqNum, indiscreteSpace)).toEqual([[0, 1, 2]]);
    expect(isTotallyDisconnected(eqNum, indiscreteSpace)).toBe(false);

    expect(connectedComponents(eqNum, sierpinski)).toEqual([[0, 1]]);
    expect(isTotallyDisconnected(eqNum, sierpinski)).toBe(false);
  });
});
