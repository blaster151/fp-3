import { describe, expect, it } from "vitest";
import { Contra, isContravariant } from "../contravariant";
import type { SimpleCat } from "../simple-cat";

type Obj = 0 | 1;
type Arr = { readonly s: Obj; readonly t: Obj };

const Thin2: SimpleCat<Obj, Arr> = {
  id: (x) => ({ s: x, t: x }),
  compose: (g, f) => ({ s: f.s, t: g.t }),
  src: (arrow) => arrow.s,
  dst: (arrow) => arrow.t,
};

type Point = "•";
type SetArrow = (value: number) => number;
const SetLike: SimpleCat<Point, SetArrow> = {
  id: () => (value) => value,
  compose: (g, f) => (value) => g(f(value)),
  src: () => "•",
  dst: () => "•",
};

describe("contravariant functor", () => {
  const F = Contra(Thin2, SetLike, () => "•", () => (value: number) => value + 1);

  it("passes the contravariance sanity check", () => {
    const arrows: Arr[] = [
      { s: 0, t: 0 },
      { s: 0, t: 1 },
      { s: 1, t: 1 },
    ];
    const ok = isContravariant(Thin2, SetLike, F, [0, 1], arrows);
    expect(ok).toBe(true);
  });
});
