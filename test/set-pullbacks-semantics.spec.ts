import { describe, expect, it } from "vitest";

import { SetCat } from "../set-cat";
import { SetPullbacks, type AnySetHom } from "../set-pullbacks";

describe("SetPullbacks semantics integration", () => {
  it("recognises equalising pairs via registered codomain equality", () => {
    const codElements = [
      Object.freeze({ value: "shared" }),
      Object.freeze({ value: "unique" }),
    ] as const;
    const cod = SetCat.obj(codElements, {
      semantics: SetCat.createMaterializedSemantics(codElements, {
        equals: (left, right) => left.value === right.value,
        tag: "SetPullbacksSemantics.cod",
      }),
    });

    const domainElements = ["a", "b"] as const;
    const domain = SetCat.obj(domainElements);
    const anchorElements = ["alpha", "beta"] as const;
    const anchor = SetCat.obj(anchorElements);

    const f = SetCat.hom(domain, cod, (value) =>
      value === "a" ? { value: "shared" } : { value: "unique" },
    );
    const h = SetCat.hom(anchor, cod, (value) =>
      value === "alpha" ? { value: "shared" } : { value: "unique" },
    );

    const pullback = SetPullbacks.pullback(
      f as unknown as AnySetHom,
      h as unknown as AnySetHom,
    );

    const tuples = Array.from(pullback.apex.values()) as Array<readonly [string, string]>;
    expect(tuples).toHaveLength(2);

    const pairStrings = tuples.map((pair) => `${pair[0]}:${pair[1]}`);
    expect(pairStrings).toContain("a:alpha");
    expect(pairStrings).toContain("b:beta");
  });
});

