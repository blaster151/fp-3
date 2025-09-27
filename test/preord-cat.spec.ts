import { describe, expect, it } from "vitest";

import { PreordCat, isMonotone } from "../preord-cat";
import type { Preorder } from "../preorder-cat";

const naturalOrder: Preorder<number> = {
  elems: [0, 1, 2, 3],
  le: (a, b) => a <= b,
};

const sameOrder: Preorder<number> = {
  elems: [0, 1, 2, 3],
  le: (a, b) => a <= b,
};

const evenOrder: Preorder<number> = {
  elems: [0, 2, 4, 6],
  le: (a, b) => a <= b,
};

describe("PreordCat (preorders and monotone maps)", () => {
  it("accepts monotone maps and composes them", () => {
    const inclusion = PreordCat.hom(naturalOrder, sameOrder, (n) => n);
    expect(isMonotone(inclusion)).toBe(true);

    const id = PreordCat.id(sameOrder);
    const composed = PreordCat.compose(id, inclusion);
    expect(composed.map(3)).toBe(3);
    expect(isMonotone(composed)).toBe(true);
  });

  it("handles worked examples such as doubling on the natural numbers", () => {
    const double = PreordCat.hom(naturalOrder, evenOrder, (n) => n * 2);
    expect(double.map(3)).toBe(6);
    expect(isMonotone(double)).toBe(true);

    const projection = PreordCat.hom(evenOrder, sameOrder, (n) => n / 2);
    const roundTrip = PreordCat.compose(projection, double);
    expect(roundTrip.map(2)).toBe(2);
    expect(isMonotone(roundTrip)).toBe(true);
  });

  it("rejects non-monotone maps", () => {
    expect(() =>
      PreordCat.hom(naturalOrder, sameOrder, (n) => 3 - n),
    ).toThrow(/monotone/);
  });
});

