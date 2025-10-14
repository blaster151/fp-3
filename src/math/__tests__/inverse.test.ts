import { describe, expect, it } from "vitest";
import { hasInverse } from "../Inverse";

describe("general inverse checks", () => {
  it("detects two-sided inverses on numbers", () => {
    const f = (n: number) => n + 1;
    const g = (n: number) => n - 1;
    expect(hasInverse(f, g, [0, 1, 2], [1, 2, 3])).toBe(true);
  });

  it("fails when either direction breaks", () => {
    const f = (n: number) => n + 1;
    const g = (n: number) => n + 1;
    expect(hasInverse(f, g, [0, 1, 2], [1, 2, 3])).toBe(false);
  });

  it("supports structural equality via options", () => {
    type Pair = { readonly a: number; readonly b: number };
    const f = (p: Pair): Pair => ({ a: p.a + 1, b: p.b });
    const g = (p: Pair): Pair => ({ a: p.a - 1, b: p.b });
    const eqPair = (x: Pair, y: Pair) => x.a === y.a && x.b === y.b;
    const elems: Pair[] = [
      { a: 0, b: 2 },
      { a: 1, b: 2 },
    ];
    expect(
      hasInverse(f, g, elems, elems.map(f), { eqA: eqPair, eqB: eqPair }),
    ).toBe(true);
  });
});
