import { describe, expect, test } from "vitest";
import {
  freeMonoidFunctorWithWitness,
  listEndofunctorWithWitness,
} from "../functor-actions";
import { SetCat, type SetHom } from "../set-cat";

describe("free monoid functor from Set to Mon", () => {
  test("packages list monoid structure and universal property hooks", () => {
    const listToolkit = listEndofunctorWithWitness();
    const toolkit = freeMonoidFunctorWithWitness({ listToolkit });

    expect(toolkit.functor.report.holds).toBe(true);

    const base = SetCat.obj(["a", "b"] as const);
    const objectWitness = toolkit.objectWitness(base);

    expect(objectWitness.monoid.e).toEqual([]);
    expect(objectWitness.monoid.op(["a"], ["b", "b"])).toEqual(["a", "b", "b"]);
    expect(objectWitness.unit.map("a")).toEqual(["a"]);
    expect(objectWitness.multiplication([["a"], ["b", "b"]])).toEqual([
      "a",
      "b",
      "b",
    ]);

    const identity = SetCat.id(base);
    const lifted = toolkit.functor.functor.F1(identity as SetHom<unknown, unknown>);
    expect(lifted.map(["a", "b"])).toEqual(["a", "b"]);
  });

  test("arrow analysis highlights preservation of empty list and concatenation", () => {
    const toolkit = freeMonoidFunctorWithWitness();
    const base = SetCat.obj([0, 1] as const);
    const arrow = SetCat.hom(base, base, (value: number) => (value + 1) % 2);

    const analysis = toolkit.analyzeArrow(arrow);
    expect(analysis.holds).toBe(true);
    expect(analysis.preservesEmpty).toBe(true);
    expect(analysis.concatenationFailures).toHaveLength(0);
    expect(analysis.details[0]).toMatch(/preserved the empty list/i);
  });

  test("metadata records the free construction guidance", () => {
    const toolkit = freeMonoidFunctorWithWitness();
    expect(toolkit.functor.metadata).toBeDefined();
    expect(toolkit.functor.metadata).toEqual(
      expect.arrayContaining([expect.stringContaining("free monoid functor")]),
    );
  });
});
