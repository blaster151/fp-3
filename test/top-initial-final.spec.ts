import { describe, expect, it } from "vitest";
import {
  initialTopology,
  finalTopology,
  topologyFromBase,
  topologyFromSubbase,
} from "../src/top/InitialFinal";
import { discrete, isTopology, type Top } from "../src/top/Topology";

const eqNum = (a: number, b: number) => a === b;

function eqSet(A: ReadonlyArray<number>, B: ReadonlyArray<number>): boolean {
  return (
    A.length === B.length &&
    A.every((a) => B.includes(a)) &&
    B.every((b) => A.includes(b))
  );
}

describe("Topology builders", () => {
  it("generates the discrete topology from singleton base", () => {
    const carrier = [0, 1, 2];
    const base = carrier.map((x) => [x]);
    const generated = topologyFromBase(eqNum, carrier, base);
    expect(isTopology(eqNum, generated)).toBe(true);
    const discreteTopo = discrete(carrier);
    expect(generated.opens).toHaveLength(discreteTopo.opens.length);
    for (const open of discreteTopo.opens) {
      expect(generated.opens.some((candidate) => eqSet(candidate, open))).toBe(true);
    }
  });

  it("builds a topology from a subbase", () => {
    const carrier = [0, 1, 2];
    const subbase = [
      [0, 1],
      [1, 2],
    ];
    const generated = topologyFromSubbase(eqNum, carrier, subbase);
    expect(isTopology(eqNum, generated)).toBe(true);
    const expected = [
      [],
      [0, 1],
      [1, 2],
      [1],
      [0, 1, 2],
    ];
    expect(generated.opens).toHaveLength(expected.length);
    for (const open of expected) {
      expect(generated.opens.some((candidate) => eqSet(candidate, open))).toBe(true);
    }
  });

  it("computes initial topologies via pullbacks", () => {
    const carrier = [0, 1, 2];
    const target = discrete([0, 1]);
    const map = (x: number) => (x === 0 ? 0 : 1);
    const initial = initialTopology(eqNum, carrier, [
      { target, map, eqTarget: eqNum },
    ]);
    expect(isTopology(eqNum, initial)).toBe(true);
    const expected = [
      [],
      [0],
      [1, 2],
      [0, 1, 2],
    ];
    expect(initial.opens).toHaveLength(expected.length);
    for (const open of expected) {
      expect(initial.opens.some((candidate) => eqSet(candidate, open))).toBe(true);
    }
  });

  it("computes final topologies via pushforwards", () => {
    const sierpinski: Top<0 | 1> = {
      carrier: [0, 1],
      opens: [[], [1], [0, 1]],
    };
    const map = (x: 0 | 1) => x;
    const final = finalTopology(eqNum, sierpinski.carrier, [
      { source: sierpinski, map, eqSource: eqNum },
    ]);
    expect(isTopology(eqNum, final)).toBe(true);
    expect(final.opens).toHaveLength(sierpinski.opens.length);
    for (const open of sierpinski.opens) {
      expect(final.opens.some((candidate) => eqSet(candidate, open))).toBe(true);
    }
  });
});
