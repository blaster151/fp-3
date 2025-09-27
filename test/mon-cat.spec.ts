import { describe, expect, it } from "vitest";

import { MonCat, isMonoidHom } from "../mon-cat";
import type { Monoid } from "../monoid-cat";

const BoolAnd: Monoid<boolean> = {
  e: true,
  op: (a, b) => a && b,
  elements: [true, false],
};

const BoolOr: Monoid<boolean> = {
  e: false,
  op: (a, b) => a || b,
  elements: [false, true],
};

describe("MonCat (monoids and homomorphisms)", () => {
  it("validates identities and composition", () => {
    const id = MonCat.id(BoolAnd);
    expect(isMonoidHom(id)).toBe(true);

    const negation = MonCat.hom(BoolAnd, BoolOr, (x) => !x);
    expect(isMonoidHom(negation)).toBe(true);

    const back = MonCat.hom(BoolOr, BoolAnd, (x) => !x);
    const composed = MonCat.compose(back, negation);
    expect(composed.map(true)).toBe(true);
    expect(isMonoidHom(composed)).toBe(true);
  });

  it("rejects maps that fail to preserve structure", () => {
    expect(() => MonCat.hom(BoolAnd, BoolOr, () => true)).toThrow(/preserve/);
  });
});

