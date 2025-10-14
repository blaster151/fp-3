import { describe, expect, it } from "vitest";
import { Contra, isContravariant } from "../contravariant";
import type { SimpleCat } from "../simple-cat";

type Obj = 0 | 1;
type Arr = { readonly s: Obj; readonly t: Obj };

const Thin2: SimpleCat<Obj, Arr> = {
  id: (x: Obj) => ({ s: x, t: x }),
  compose: (g: Arr, f: Arr) => ({ s: f.s, t: g.t }),
  src: (arrow: Arr) => arrow.s,
  dst: (arrow: Arr) => arrow.t,
};

type Point = "•";
type SetArrow = (value: number) => number;
const SetLike: SimpleCat<Point, SetArrow> = {
  id: (_object: Point) => (value: number) => value,
  compose: (g: SetArrow, f: SetArrow) => (value: number) => g(f(value)),
  src: (_arrow: SetArrow) => "•",
  dst: (_arrow: SetArrow) => "•",
};

describe("contravariant functor", () => {
  const F = Contra(
    Thin2,
    SetLike,
    (_object: Obj): Point => "•",
    (_arrow: Arr): SetArrow => (value: number) => value + 1,
  );

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
