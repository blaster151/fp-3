import { describe, expect, test } from "vitest";

import {
  contravariantRepresentableFunctorWithWitness,
  covariantRepresentableFunctorWithWitness,
  createRepresentableHomSetRegistry,
  yonedaEmbeddingWithWitness,
  yonedaLemmaWitness,
} from "../functor-representable";
import { constructFunctorWithWitness } from "../functor";
import { SetCat, type SetHom } from "../set-cat";
import { setSimpleCategory } from "../set-simple-category";
import { makeToyCategory, arrows as toyArrows } from "./kinds/toy-category";

describe("representable functors and Yoneda machinery", () => {
  const toy = makeToyCategory();
  const registry = createRepresentableHomSetRegistry(toy);

  const samples = {
    objects: toy.objects,
    arrows: toy.arrows,
    composablePairs: toy.arrows
      .flatMap((g) =>
        toy.arrows
          .filter((f) => Object.is(toy.dst(f), toy.src(g)))
          .map((f) => ({ f, g })),
      ),
  };

  test("covariant representable functor preserves identities and composition", () => {
    const covariant = covariantRepresentableFunctorWithWitness(toy, "A", { registry, samples });
    expect(covariant.functor.report.holds).toBe(true);
    expect(covariant.functor.report.preservesIdentities).toBe(true);
    expect(covariant.functor.report.preservesComposition).toBe(true);

    const idA = registry.canonicalize("A", "A", toy.id("A"));
    const mapped = covariant.functor.functor.F1(toyArrows.f).map(idA);
    const expected = registry.canonicalize("A", "B", toy.compose(toyArrows.f, idA));
    expect(mapped).toBe(expected);
  });

  test("contravariant representable functor reverses composition", () => {
    const contravariant = contravariantRepresentableFunctorWithWitness(toy, "B", {
      registry,
      samples,
    });
    expect(contravariant.functor.report.holds).toBe(true);
    expect(contravariant.functor.report.preservesIdentities).toBe(true);
    expect(contravariant.functor.report.preservesReversedComposition).toBe(true);

    const idB = registry.canonicalize("B", "B", toy.id("B"));
    const mapped = contravariant.functor.functor.F1(toyArrows.f).map(idB);
    const expected = registry.canonicalize("A", "B", toy.compose(idB, toyArrows.f));
    expect(mapped).toBe(expected);
  });

  test("Yoneda embedding turns morphisms into natural transformations", () => {
    const { embedding } = yonedaEmbeddingWithWitness(toy, { registry, samples });
    expect(embedding.report.holds).toBe(true);

    const natural = embedding.functor.F1(toyArrows.f);
    expect(natural.report.holds).toBe(true);

    const idA = registry.canonicalize("A", "A", toy.id("A"));
    const component = natural.transformation.component("A");
    const mapped = component.map(idA);
    const expected = registry.canonicalize("A", "B", toy.compose(toyArrows.f, idA));
    expect(mapped).toBe(expected);
  });

  test("Yoneda lemma conversions round-trip on sampled elements", () => {
    const carrierA = SetCat.obj(["a0", "a1"] as const);
    const carrierB = SetCat.obj(["b0", "b1"] as const);

    const idASet = SetCat.id(carrierA);
    const idBSet = SetCat.id(carrierB);
    const fSet = SetCat.hom(carrierA, carrierB, (value: "a0" | "a1") =>
      value === "a0" ? "b0" : "b1",
    );
    const gSet = SetCat.hom(carrierB, carrierA, (value: "b0" | "b1") =>
      value === "b0" ? "a0" : "a1",
    );

    const functor = constructFunctorWithWitness(toy, setSimpleCategory, {
      F0: (object: "A" | "B") => (object === "A" ? carrierA : carrierB),
      F1: (arrow) => {
        const hom: SetHom<unknown, unknown> = (() => {
          switch (arrow.name) {
            case "id_A":
              return idASet as SetHom<unknown, unknown>;
            case "id_B":
              return idBSet as SetHom<unknown, unknown>;
            case "f":
              return fSet as SetHom<unknown, unknown>;
            case "g":
              return gSet as SetHom<unknown, unknown>;
            default:
              throw new Error(`Unexpected arrow ${arrow.name}`);
          }
        })();
        return hom;
      },
    }, samples);

    const yoneda = yonedaLemmaWitness(toy, "A", functor, {
      registry,
      samples,
      elementSamples: ["a0", "a1"],
    });

    expect(yoneda.report.holds).toBe(true);
    expect(yoneda.report.elementRoundTrips.every((entry) => entry.equal)).toBe(true);
    expect(yoneda.report.transformationRoundTrips.every((entry) => entry.equal)).toBe(true);
  });
});
