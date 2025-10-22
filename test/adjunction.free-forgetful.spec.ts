import { describe, expect, test } from "vitest";
import { freeForgetfulAdjunctionWithWitness } from "../functor-actions";
import { SetCat } from "../set-cat";
import { MonCat } from "../mon-cat";
import type { Monoid } from "../monoid-cat";

const makeBooleanMonoid = (): Monoid<boolean> => ({
  e: true,
  op: (left: boolean, right: boolean) => left && right,
  elements: [true, false],
});

describe("free ⊣ forgetful adjunction between Set and Mon", () => {
  test("adjunction packages free and forgetful functors with triangle witnesses", () => {
    const toolkit = freeForgetfulAdjunctionWithWitness();

    expect(toolkit.free.functor.report.holds).toBe(true);
    expect(toolkit.forgetful.functor.report.holds).toBe(true);
    expect(toolkit.adjunction.report.holds).toBe(true);
    expect(toolkit.adjunction.report.leftTriangle.holds).toBe(true);
    expect(toolkit.adjunction.report.rightTriangle.holds).toBe(true);
    expect(toolkit.adjunction.unit.report.holds).toBe(true);
    expect(toolkit.adjunction.counit.report.holds).toBe(true);
  });

  test("unit embeds elements as singleton lists and counit folds via multiplication", () => {
    const toolkit = freeForgetfulAdjunctionWithWitness();
    const base = SetCat.obj([0, 1] as const);

    const unitComponent = toolkit.adjunction.unit.transformation.component(base);
    expect(unitComponent.map(0)).toEqual([0]);
    expect(unitComponent.map(1)).toEqual([1]);

    const booleanMonoid = makeBooleanMonoid();
    const counitComponent = toolkit.adjunction.counit.transformation.component(
      booleanMonoid as Monoid<unknown>,
    );
    expect(counitComponent.map([true, true, true])).toBe(true);
    expect(counitComponent.map([true, false, true])).toBe(false);
  });

  test("list monad derived from the adjunction satisfies Kleisli diagnostics", () => {
    const toolkit = freeForgetfulAdjunctionWithWitness();
    const listMonad = toolkit.listMonad;

    expect(listMonad.report.holds).toBe(true);

    const numbers = SetCat.obj([0, 1] as const);
    const booleans = SetCat.obj([false, true] as const);
    const strings = SetCat.obj(["T", "F"] as const);
    const listToolkit = toolkit.free.listToolkit;

    const listB = listToolkit.listObject(booleans);
    const listC = listToolkit.listObject(strings);

    const f = SetCat.hom(
      numbers,
      listB,
      (value: number) => (value === 0 ? ([false] as const) : ([true, false] as const)),
    );
    const g = SetCat.hom(
      booleans,
      listC,
      (flag: boolean) => (flag ? (["T"] as const) : (["F", "F"] as const)),
    );

    const composite = listMonad.kleisliCompose(f, g);
    expect(composite.dom).toBe(numbers);
    expect(composite.cod).toBe(listC);
    expect(composite.map(0)).toEqual(["F", "F"]);
    expect(composite.map(1)).toEqual(["T", "F", "F"]);
  });

  test("forgetful functor returns the carrier supplied by the free construction", () => {
    const toolkit = freeForgetfulAdjunctionWithWitness();
    const base = SetCat.obj(["a", "b"] as const);
    const freeObject = toolkit.free.objectWitness(base);

    const image = toolkit.forgetful.functor.functor.F0(freeObject.monoid as Monoid<unknown>);
    expect(image).toBe(freeObject.carrier as Set<unknown>);
  });
});

