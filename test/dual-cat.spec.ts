import { describe, expect, it } from "vitest";
import { Dual, isInvolutive } from "../dual-cat";
import type { SimpleCat } from "../simple-cat";

type Obj = 0 | 1;
type Arr = { readonly s: Obj; readonly t: Obj };

const Thin2: SimpleCat<Obj, Arr> = {
  id: (x) => ({ s: x, t: x }),
  compose: (g, f) => ({ s: f.s, t: g.t }),
  src: (arrow) => arrow.s,
  dst: (arrow) => arrow.t,
};

describe("dual category", () => {
  const Op = Dual(Thin2);
  const arrow: Arr = { s: 0, t: 1 };
  const objects: ReadonlyArray<Obj> = [0, 1];

  it("reverses sources and targets", () => {
    expect(Op.src(arrow)).toBe(1);
    expect(Op.dst(arrow)).toBe(0);
  });

  it("is involutive on samples", () => {
    expect(isInvolutive<Obj, Arr>(Thin2, [arrow], objects)).toBe(true);
  });
});
