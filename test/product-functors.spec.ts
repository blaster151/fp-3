import { describe, expect, it } from "vitest";
import { Pi1, Pi2, Pairing, ProductCat } from "../product-cat";
import type { Functor } from "../functor";
import type { SimpleCat } from "../simple-cat";

type Point = "•";
type SetArrow = (value: number) => number;
const SetLike: SimpleCat<Point, SetArrow> = {
  id: () => (value) => value,
  compose: (g, f) => (value) => g(f(value)),
  src: () => "•",
  dst: () => "•",
};

type Obj = 0 | 1;
type ThinArrow = { readonly s: Obj; readonly t: Obj };
const Thin2: SimpleCat<Obj, ThinArrow> = {
  id: (x) => ({ s: x, t: x }),
  compose: (g, f) => ({ s: f.s, t: g.t }),
  src: (arrow) => arrow.s,
  dst: (arrow) => arrow.t,
};

type ArrowX = { readonly s: Obj; readonly t: Obj };

const toSet: Functor<Obj, ArrowX, Point, SetArrow> = {
  F0: () => "•",
  F1: () => (value: number) => value,
};

const toThin2: Functor<Obj, ArrowX, Obj, ThinArrow> = {
  F0: (x) => x,
  F1: (arrow) => ({ s: arrow.s, t: arrow.t }),
};

describe("product functors", () => {
  const projections = ProductCat(SetLike, Thin2);
  const pi1 = Pi1(SetLike, Thin2);
  const pi2 = Pi2(SetLike, Thin2);
  const paired = Pairing(toSet, toThin2, SetLike, Thin2);

  it("π1 and π2 recover components", () => {
    const arrow = {
      src: ["•", 0] as const,
      dst: ["•", 1] as const,
      cf: (n: number) => n + 1,
      dg: { s: 0 as Obj, t: 1 as Obj },
    };
    expect(pi1.F0(["•", 1])).toBe("•");
    expect(pi2.F0(["•", 1])).toBe(1);
    expect(pi1.F1(arrow)(3)).toBe(4);
    expect(pi2.F1(arrow)).toEqual({ s: 0, t: 1 });
  });

  it("pairing lands in the product category", () => {
    const arrow: ArrowX = { s: 0, t: 1 };
    const mapped = paired.F1(arrow);
    expect(projections.src(mapped)).toEqual(["•", 0]);
    expect(projections.dst(mapped)).toEqual(["•", 1]);
  });
});
