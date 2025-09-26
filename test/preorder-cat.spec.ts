import { describe, it, expect } from "vitest";
import { PreorderCat } from "../preorder-cat";

describe("Preorder → thin category", () => {
  const elems = [0, 1, 2];
  const le = (a: number, b: number) => a <= b;
  const C = PreorderCat({ elems, le });

  it("exposes the underlying carrier", () => {
    expect(C.obj()).toEqual(elems);
  });

  it("creates arrows iff the relation holds", () => {
    expect(C.hom(0, 2)).not.toBeNull();
    expect(C.hom(2, 0)).toBeNull();
  });

  it("composes via transitivity", () => {
    const f = C.hom(0, 1);
    const g = C.hom(1, 2);
    if (!f || !g) throw new Error("hom should exist in preorder test");
    const gof = C.compose(g, f);
    expect(gof.src).toBe(0);
    expect(gof.dst).toBe(2);
  });
});
