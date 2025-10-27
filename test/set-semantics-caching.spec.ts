import { describe, expect, it } from "vitest";

import {
  SetCat,
  instantiateMaterializedCarrier,
  type SetCarrierSemantics,
} from "../set-cat";

describe("SetCat carrier caching", () => {
  it("reuses product data for repeated calls", () => {
    const left = SetCat.obj(["a", "b"] as const);
    const right = SetCat.obj([0, 1] as const);

    const first = SetCat.product(left, right);
    const second = SetCat.product(left, right);

    expect(second.object).toBe(first.object);
    expect(second.projections.fst).toBe(first.projections.fst);
    expect(second.projections.snd).toBe(first.projections.snd);
    expect(second.lookup?.("a", 0)).toBe(first.lookup?.("a", 0));
  });

  it("reuses coproduct data for repeated calls", () => {
    const left = SetCat.obj(["x", "y"] as const);
    const right = SetCat.obj([true, false] as const);

    const first = SetCat.coproduct(left, right);
    const second = SetCat.coproduct(left, right);

    expect(second.object).toBe(first.object);
    expect(second.injections.inl).toBe(first.injections.inl);
    expect(second.injections.inr).toBe(first.injections.inr);

    const injected = first.injections.inr.map(true);
    expect(second.object.has(injected)).toBe(true);
  });

  it("reuses exponential data for repeated calls", () => {
    const base = SetCat.obj([0, 1] as const);
    const codomain = SetCat.obj(["L", "R"] as const);

    const first = SetCat.exponential(base, codomain);
    const second = SetCat.exponential(base, codomain);

    expect(second.object).toBe(first.object);
    expect(second.evaluation).toBe(first.evaluation);
    expect(second.evaluationProduct.object).toBe(first.evaluationProduct.object);
    expect(second.evaluationProduct.projections.fst).toBe(
      first.evaluationProduct.projections.fst,
    );
    expect(second.evaluationProduct.projections.snd).toBe(
      first.evaluationProduct.projections.snd,
    );

    const assignment = (value: 0 | 1): "L" | "R" => (value === 0 ? "L" : "R");
    const firstArrow = first.register(assignment);
    const secondArrow = second.register(assignment);
    expect(secondArrow).toBe(firstArrow);
  });

  it("skips the product cache when custom instantiation is supplied", () => {
    const left = SetCat.obj(["⋆"] as const);
    const right = SetCat.obj([0] as const);
    let instantiateCount = 0;
    const instantiate = <T>(semantics: SetCarrierSemantics<T>): Set<T> => {
      instantiateCount += 1;
      return instantiateMaterializedCarrier(semantics);
    };

    const first = SetCat.product(left, right, { instantiate });
    const second = SetCat.product(left, right, { instantiate });

    expect(instantiateCount).toBe(2);
    expect(second.object).not.toBe(first.object);
  });

  it("skips the coproduct cache when custom instantiation is supplied", () => {
    const left = SetCat.obj([0] as const);
    const right = SetCat.obj([1] as const);
    let instantiateCount = 0;
    const instantiate = <T>(semantics: SetCarrierSemantics<T>): Set<T> => {
      instantiateCount += 1;
      return instantiateMaterializedCarrier(semantics);
    };

    const first = SetCat.coproduct(left, right, { instantiate });
    const second = SetCat.coproduct(left, right, { instantiate });

    expect(instantiateCount).toBe(2);
    expect(second.object).not.toBe(first.object);
  });

  it("skips the exponential cache when custom instantiation is supplied", () => {
    const base = SetCat.obj([0] as const);
    const codomain = SetCat.obj(["x", "y"] as const);
    let instantiateCount = 0;
    const instantiate = <T>(semantics: SetCarrierSemantics<T>): Set<T> => {
      instantiateCount += 1;
      return instantiateMaterializedCarrier(semantics);
    };

    const first = SetCat.exponential(base, codomain, { instantiate });
    const second = SetCat.exponential(base, codomain, { instantiate });

    expect(instantiateCount).toBe(2);
    expect(second.object).not.toBe(first.object);
  });
});
