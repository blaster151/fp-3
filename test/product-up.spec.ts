import { describe, expect, it } from "vitest";
import type { Functor } from "../functor";
import type { SimpleCat } from "../simple-cat";
import { Pairing, ProductCat } from "../product-cat";
import { checkProductUP } from "../product-up";

type ThinArrow = { readonly s: 0 | 1; readonly t: 0 | 1 };

const Thin2: SimpleCat<0 | 1, ThinArrow> = {
  id: (object) => ({ s: object, t: object }),
  compose: (g, f) => ({ s: f.s, t: g.t }),
  src: (arrow) => arrow.s,
  dst: (arrow) => arrow.t,
};

const OneObject: SimpleCat<"•", (value: number) => number> = {
  id: () => (value) => value,
  compose: (g, f) => (value) => g(f(value)),
  src: () => "•",
  dst: () => "•",
};

describe("Product universal property", () => {
  it("verifies π₁∘H = F, π₂∘H = G, and H = ⟨F,G⟩ on samples", () => {
    ProductCat(OneObject, Thin2);

    const F: Functor<0 | 1, ThinArrow, "•", (value: number) => number> = {
      F0: () => "•",
      F1: (arrow) => (value) => value + (arrow.t - arrow.s),
    };

    const G: Functor<0 | 1, ThinArrow, 0 | 1, ThinArrow> = {
      F0: (object) => object,
      F1: (arrow) => arrow,
    };

    const H = Pairing(F, G, OneObject, Thin2);
    const objectSamples: ReadonlyArray<0 | 1> = [0, 1];
    const arrowSamples: ReadonlyArray<ThinArrow> = [
      { s: 0, t: 0 },
      { s: 0, t: 1 },
      { s: 1, t: 1 },
    ];

    const eqNumberFn = (left: (value: number) => number, right: (value: number) => number) =>
      [-2, -1, 0, 1, 2].every((sample) => left(sample) === right(sample));
    const eqThinArrow = (left: ThinArrow, right: ThinArrow) => left.s === right.s && left.t === right.t;

    expect(
      checkProductUP(OneObject, Thin2, F, G, H, objectSamples, arrowSamples, {
        eqCArr: eqNumberFn,
        eqDArr: eqThinArrow,
      }),
    ).toBe(true);
  });
});
