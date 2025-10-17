import { describe, expect, it } from "vitest";
import { discrete, indiscrete, product, type Top } from "../src/top/Topology";
import {
  finalTopology,
  initialTopology,
  topologyFromBase,
  topologyFromSubbase,
} from "../src/top/InitialFinal";

const eqNum = (a: number, b: number) => a === b;
const eqPair = <X, Y>(eqX: (a: X, b: X) => boolean, eqY: (a: Y, b: Y) => boolean) =>
  (a: { readonly x: X; readonly y: Y }, b: { readonly x: X; readonly y: Y }) =>
    eqX(a.x, b.x) && eqY(a.y, b.y);
const eqStr = (a: string, b: string) => a === b;

function sameTopology<X>(eqX: (a: X, b: X) => boolean, T: Top<X>, U: Top<X>): boolean {
  const eqSet = (A: ReadonlyArray<X>, B: ReadonlyArray<X>) =>
    A.length === B.length &&
    A.every((a) => B.some((b) => eqX(a, b))) &&
    B.every((b) => A.some((a) => eqX(a, b)));
  const carriersMatch = eqSet(T.carrier, U.carrier);
  const opensMatch =
    T.opens.length === U.opens.length &&
    T.opens.every((open) => U.opens.some((candidate) => eqSet(open, candidate))) &&
    U.opens.every((candidate) => T.opens.some((open) => eqSet(candidate, open)));
  return carriersMatch && opensMatch;
}

describe("Initial and final topology helpers", () => {
  it("recovers the product topology from initial projections", () => {
    const TX = discrete([0, 1]);
    const TY = discrete([10, 20]);
    const expected = product(eqNum, eqNum, TX, TY);
    const initial = initialTopology(
      eqPair(eqNum, eqNum),
      expected.carrier,
      [
        { target: TX, eqTarget: eqNum, map: (p: { readonly x: number; readonly y: number }) => p.x },
        { target: TY, eqTarget: eqNum, map: (p: { readonly x: number; readonly y: number }) => p.y },
      ],
    );
    expect(sameTopology(eqPair(eqNum, eqNum), expected, initial)).toBe(true);
  });

  it("constructs the final topology for a quotient map", () => {
    const sierpinski: Top<number> = {
      carrier: [0, 1],
      opens: [[], [0], [0, 1]],
    };
    const quotientCarrier = ["open", "closed"] as const;
    const quotient = (value: number) => (value === 0 ? "open" : "closed");
    const final = finalTopology(eqStr, quotientCarrier, [
      { source: sierpinski, eqSource: eqNum, map: quotient },
    ]);
    const expected: Top<string> = {
      carrier: ["open", "closed"],
      opens: [[], ["open"], ["open", "closed"]],
    };
    expect(sameTopology(eqStr, final, expected)).toBe(true);
  });

  it("subbases generate the expected topologies", () => {
    const indiscreteFromSubbase = topologyFromSubbase(eqStr, ["a", "b"], [["a", "b"]]);
    expect(sameTopology(eqStr, indiscrete(["a", "b"]), indiscreteFromSubbase)).toBe(true);

    const discreteBase = topologyFromBase(eqNum, [0, 1], [[0], [1]]);
    expect(sameTopology(eqNum, discrete([0, 1]), discreteBase)).toBe(true);

    const sierpinskiSubbase = topologyFromSubbase(eqStr, ["s", "t"], [["s", "t"], ["s"]]);
    const expected: Top<string> = {
      carrier: ["s", "t"],
      opens: [[], ["s"], ["s", "t"]],
    };
    expect(sameTopology(eqStr, expected, sierpinskiSubbase)).toBe(true);
  });
});
