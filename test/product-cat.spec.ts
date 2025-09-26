import { describe, expect, it } from "vitest";
import { ProductCat } from "../product-cat";
import type { SimpleCat } from "../simple-cat";

type Point = "•";
type SetArrow = (value: number) => number;

const SetLike: SimpleCat<Point, SetArrow> = {
  id: () => (value) => value,
  compose: (g, f) => (value) => g(f(value)),
  src: () => "•",
  dst: () => "•",
};

type TwoObj = 0 | 1;
type ThinArrow = { readonly s: TwoObj; readonly t: TwoObj };

const Thin2: SimpleCat<TwoObj, ThinArrow> = {
  id: (x) => ({ s: x, t: x }),
  compose: (g, f) => ({ s: f.s, t: g.t }),
  src: (arrow) => arrow.s,
  dst: (arrow) => arrow.t,
};

describe("ProductCat", () => {
  const CxD = ProductCat(SetLike, Thin2);
  const f = {
    src: ["•", 0] as const,
    dst: ["•", 1] as const,
    cf: (n: number) => n + 1,
    dg: { s: 0 as TwoObj, t: 1 as TwoObj },
  };
  const g = {
    src: ["•", 1] as const,
    dst: ["•", 1] as const,
    cf: (n: number) => n * 2,
    dg: { s: 1 as TwoObj, t: 1 as TwoObj },
  };

  it("builds identity pairs componentwise", () => {
    const id = CxD.id(["•", 0]);
    expect(id.cf(4)).toBe(4);
    expect(id.dg).toEqual({ s: 0, t: 0 });
  });

  it("composes componentwise", () => {
    const gof = CxD.compose(g, f);
    expect(gof.cf(3)).toBe(8);
    expect(gof.dg).toEqual({ s: 0, t: 1 });
  });
});
