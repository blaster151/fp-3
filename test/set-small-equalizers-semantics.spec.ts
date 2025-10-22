import { describe, expect, it } from "vitest";

import { SetCat, type SetHom } from "../set-cat";
import {
  SetSmallEqualizers,
  equalSetHom,
  factorThroughSetEqualizer,
} from "../set-small-limits";
import { IndexedFamilies } from "../stdlib/indexed-families";

const toAnySetHom = <A, B>(hom: SetHom<A, B>): SetHom<unknown, unknown> =>
  hom as unknown as SetHom<unknown, unknown>;

describe("SetSmallEqualizers semantics integration", () => {
  it("retains equalizer data under semantics-driven equality", () => {
    const domainElements = [Object.freeze({ id: 0 }), Object.freeze({ id: 1 })] as const;
    const domainSemantics = SetCat.createMaterializedSemantics(domainElements, {
      equals: (left, right) => left.id === right.id,
      tag: "SetSmallEqualizersSemantics.domain",
    });
    const domain = SetCat.obj(domainElements, { semantics: domainSemantics });

    const codElements = [
      Object.freeze({ value: 0 }),
      Object.freeze({ value: 2 }),
      Object.freeze({ value: 3 }),
    ] as const;
    const codSemantics = SetCat.createMaterializedSemantics(codElements, {
      equals: (left, right) => left.value === right.value,
      tag: "SetSmallEqualizersSemantics.cod",
    });
    const cod = SetCat.obj(codElements, { semantics: codSemantics });

    const left = SetCat.hom(domain, cod, (value) =>
      value.id === 0 ? { value: 0 } : { value: 2 },
    );
    const right = SetCat.hom(domain, cod, (value) =>
      value.id === 0 ? { value: 0 } : { value: 3 },
    );

    const index = IndexedFamilies.finiteIndex(["left", "right"] as const);
    const parallel = (key: (typeof index.carrier)[number]) => toAnySetHom(key === "left" ? left : right);

    const equalizer = SetSmallEqualizers.smallEqualizer(index, parallel);

    const equalizerObj = equalizer.obj as typeof domain;
    expect(equalizerObj.size).toBe(1);
    const [element] = equalizerObj;
    expect(element?.id).toBe(0);

    const inclusion = equalizer.equalize("left") as SetHom<unknown, unknown>;
    expect(equalSetHom(inclusion, inclusion)).toBe(true);

    const fork = SetCat.hom(domain, domain, (value) => ({ id: value.id }));
    const factor = factorThroughSetEqualizer({
      left: toAnySetHom(left),
      right: toAnySetHom(right),
      inclusion,
      fork: toAnySetHom(fork),
    });

    expect(factor.factored).toBe(true);
    expect(factor.mediator).toBeDefined();
  });
});

