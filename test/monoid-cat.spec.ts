import { describe, expect, it } from "vitest";
import { MonoidCat } from "../monoid-cat";

describe("Monoid as a one-object category", () => {
  const additiveMonoid = {
    e: 0,
    op: (a: number, b: number) => a + b,
  };
  const C = MonoidCat(additiveMonoid);

  it("returns a single object", () => {
    expect(C.obj()).toEqual({ _tag: "★" });
  });

  it("uses the monoid identity as the identity arrow", () => {
    expect(C.id().elt).toBe(0);
  });

  it("composes arrows via the monoid operation", () => {
    const f = C.hom(2);
    const g = C.hom(3);
    const composite = C.compose(g, f);
    expect(composite.elt).toBe(5);
  });
});

