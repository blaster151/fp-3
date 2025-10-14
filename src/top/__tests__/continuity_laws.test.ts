import { describe, it, expect } from "vitest";
import { continuous, discrete, indiscrete } from "../Topology";
import { subspace } from "../Subspace";
import { inclusion } from "../Embeddings";
import { sierpinski } from "../Spaces";

const eqNum = (a: number, b: number) => a === b;

describe("Continuity beyond discrete spaces", () => {
  it("subspace inclusion is continuous (discrete example)", () => {
    const X = [0, 1, 2];
    const TX = discrete(X);
    const S = [0, 2];
    const TS = subspace(eqNum, TX, S);
    const i = inclusion(eqNum, S, X);
    expect(continuous(eqNum, TS, TX, i, eqNum)).toBe(true);
  });

  it("composition of continuous maps is continuous (Sierpinski -> indiscrete)", () => {
    const TSp = sierpinski();
    const TXi = indiscrete([0, 1, 2]);
    const f = (s: number) => (s === 1 ? 0 : 1);
    const g = (_: number) => 2;
    const comp = (s: number) => g(f(s));

    expect(continuous(eqNum, TSp, TXi, f, eqNum)).toBe(true);
    expect(continuous(eqNum, TXi, TXi, g, eqNum)).toBe(true);
    expect(continuous(eqNum, TSp, TXi, comp, eqNum)).toBe(true);
  });
});
