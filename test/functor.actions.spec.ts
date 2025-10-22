import { describe, expect, test } from "vitest";
import { listEndofunctorWithWitness, monoidHomAsFunctorWithWitness, monotoneMapAsFunctorWithWitness, groupActionAsFunctorWithWitness } from "../functor-actions";
import { SetCat, type SetHom } from "../set-cat";
import type { Monoid } from "../monoid-cat";
import type { MonoidHom } from "../mon-cat";
import type { Preorder } from "../preorder-cat";
import type { PreordHom } from "../preord-cat";
import type { Group } from "../kinds/group-automorphism";

describe("functor constructors for algebraic and order-theoretic data", () => {
  test("list endofunctor packages witness and familiar combinators", () => {
    const toolkit = listEndofunctorWithWitness();

    expect(toolkit.functor.report.holds).toBe(true);

    const base = SetCat.obj([0, 1, 2]);
    const listSet = toolkit.listObject(base);

    expect(listSet.has([0, 1, 2])).toBe(true);
    expect(listSet.has([3])).toBe(false);

    const increment = SetCat.hom(base, base, (value: number) => (value + 1) % 3);
    const lifted = toolkit.functor.functor.F1(increment as unknown as SetHom<unknown, unknown>);
    const mapped = lifted.map([0, 2]);
    expect(mapped).toEqual([1, 0]);

    expect(toolkit.unit("x")).toEqual(["x"]);
    expect(toolkit.concat(["a"], ["b", "c"])).toEqual(["a", "b", "c"]);
    expect(toolkit.mapList((n: number) => n * 2)([1, 2, 3])).toEqual([2, 4, 6]);
  });

  test("monoid homomorphism lifts to a functor with preservation diagnostics", () => {
    const andMonoid: Monoid<boolean> = {
      e: true,
      op: (a, b) => a && b,
      elements: [true, false],
    };
    const orMonoid: Monoid<boolean> = {
      e: false,
      op: (a, b) => a || b,
      elements: [false, true],
    };
    const negationHom: MonoidHom<boolean, boolean> = {
      dom: andMonoid,
      cod: orMonoid,
      map: (value) => !value,
    };

    const witness = monoidHomAsFunctorWithWitness(negationHom);
    expect(witness.analysis.holds).toBe(true);
    expect(witness.analysis.multiplicationFailures).toHaveLength(0);
    expect(witness.functor.report.holds).toBe(true);

    const brokenHom: MonoidHom<boolean, boolean> = {
      dom: andMonoid,
      cod: orMonoid,
      map: (value) => value,
    };
    const brokenWitness = monoidHomAsFunctorWithWitness(brokenHom);
    expect(brokenWitness.analysis.holds).toBe(false);
    expect(brokenWitness.functor.report.holds).toBe(false);
  });

  test("monotone maps become functors between thin categories", () => {
    const domain: Preorder<number> = {
      elems: [0, 1, 2],
      le: (a, b) => a <= b,
    };
    const codomain: Preorder<number> = {
      elems: [0, 1, 2],
      le: (a, b) => a <= b,
    };
    const hom: PreordHom<number, number> = {
      dom: domain,
      cod: codomain,
      map: (value) => value,
    };

    const witness = monotoneMapAsFunctorWithWitness(hom);
    expect(witness.analysis.holds).toBe(true);
    expect(witness.analysis.violations).toHaveLength(0);
    expect(witness.functor.report.holds).toBe(true);

    const decreasing: PreordHom<number, number> = {
      dom: domain,
      cod: codomain,
      map: (value) => 2 - value,
    };
    expect(() => monotoneMapAsFunctorWithWitness(decreasing)).toThrow(/not monotone/);
  });

  test("group actions produce Set-valued functors with law diagnostics", () => {
    const group: Group<number> & { readonly elements: ReadonlyArray<number> } = {
      elements: [0, 1],
      identity: 0,
      combine: (a, b) => (a + b) % 2,
      inverse: (value) => value,
      eq: (a, b) => a === b,
    };

    const carrier = SetCat.obj(["L", "R"] as const);
    const action = groupActionAsFunctorWithWitness(
      {
        group,
        carrier,
        act: (element, point) =>
          element === 0 ? point : point === "L" ? "R" : "L",
      },
      { groupElements: group.elements, points: ["L", "R"] },
    );

    expect(action.analysis.holds).toBe(true);
    expect(action.functor.report.holds).toBe(true);

    const faulty = groupActionAsFunctorWithWitness(
      {
        group,
        carrier,
        act: (element, point) =>
          element === 0 ? (point === "L" ? "R" : "L") : point,
      },
      { groupElements: group.elements, points: ["L", "R"] },
    );

    expect(faulty.analysis.holds).toBe(false);
    expect(faulty.functor.report.holds).toBe(false);
  });
});

