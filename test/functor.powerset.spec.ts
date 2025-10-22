import { describe, expect, it } from "vitest";

import { powersetFunctorWithWitness } from "../functor-powerset";
import { SetCat, type AnySet, type SetHom, type SetObj } from "../set-cat";

describe("powerset functor toolkit", () => {
  const toolkit = powersetFunctorWithWitness();
  const { functor, inverseImage, inverseImageOpposite, directOppositeComparison, singletonEmbedding } =
    toolkit;

  it("confirms direct-image functor laws", () => {
    expect(functor.report.holds).toBe(true);
    expect(functor.report.preservesIdentities).toBe(true);
    expect(functor.report.preservesComposition).toBe(true);
    expect(functor.report.respectsSourcesAndTargets).toBe(true);
  });

  it("confirms inverse-image contravariant functor laws", () => {
    expect(inverseImage.report.holds).toBe(true);
    expect(inverseImage.report.preservesIdentities).toBe(true);
    expect(inverseImage.report.preservesReversedComposition).toBe(true);
    expect(inverseImage.report.respectsReversedEndpoints).toBe(true);
  });

  it("matches the opposite functor against the contravariant witness", () => {
    expect(inverseImageOpposite.report.holds).toBe(true);
    expect(directOppositeComparison.report.holds).toBe(true);
    expect(directOppositeComparison.report.satisfiesNaturality).toBe(true);
  });

  it("materialises singleton embeddings as a natural transformation", () => {
    expect(singletonEmbedding.report.holds).toBe(true);

    const numbers = SetCat.obj([0, 1, 2]);
    const component = singletonEmbedding.transformation.component(numbers as SetObj<unknown>);
    const singleton = component.map(1);

    const power = toolkit.objectOf(numbers);
    expect(power.has(singleton as AnySet<number>)).toBe(true);
    expect(singleton instanceof Set).toBe(true);
    expect(Array.from(singleton as Set<number>).sort((a, b) => a - b)).toEqual([1]);
  });

  it("computes direct images of subsets", () => {
    const numbers = SetCat.obj([0, 1, 2, 3]);
    const booleans = SetCat.obj([false, true]);
    const parity = SetCat.hom(numbers, booleans, (value: number) => value % 2 === 0);

    const evens = new Set<number>([0, 2]);
    const image = toolkit.directImageOf(parity as SetHom<number, boolean>, evens as AnySet<number>);

    expect(Array.from(image).sort()).toEqual([false, true]);

    const power = toolkit.objectOf(booleans);
    expect(power.has(image as AnySet<boolean>)).toBe(true);
  });

  it("computes inverse images of subsets", () => {
    const numbers = SetCat.obj([0, 1, 2, 3]);
    const booleans = SetCat.obj([false, true]);
    const parity = SetCat.hom(numbers, booleans, (value: number) => value % 2 === 0);

    const truthy = new Set<boolean>([true]);
    const preimage = toolkit.inverseImageOf(parity as SetHom<number, boolean>, truthy as AnySet<boolean>);

    expect(Array.from(preimage).sort((a, b) => a - b)).toEqual([0, 2]);

    const power = toolkit.objectOf(numbers);
    expect(power.has(preimage as AnySet<number>)).toBe(true);
  });

  it("treats freshly created subsets as powerset members", () => {
    const letters = SetCat.obj(["a", "b", "c"]);
    const power = toolkit.objectOf(letters);

    expect(power.has(new Set<string>(["a", "c"]) as AnySet<string>)).toBe(true);
    expect(power.has(new Set<string>(["d"]) as AnySet<string>)).toBe(false);
  });
});
