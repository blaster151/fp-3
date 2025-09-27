import { describe, expect, it } from "vitest";
import { makeCoslice } from "../slice-cat";
import { makeCoslicePrecomposition } from "../coslice-precompose";
import { makeCosliceReindexingFunctor } from "../coslice-reindexing";
import { makeFinitePushoutCalculator } from "../pushout";
import { PushoutCategory, getArrow } from "./pushout-fixture";

describe("coslice precomposition and pushout reindexing", () => {
  const cosliceOverZ = makeCoslice(PushoutCategory, "Z");
  const cosliceOverX = makeCoslice(PushoutCategory, "X");
  const h = getArrow("h");
  const pushouts = makeFinitePushoutCalculator(PushoutCategory);

  it("precomposes coslice objects and arrows along h", () => {
    const functor = makeCoslicePrecomposition(PushoutCategory, h, "X", "Z");
    const object = cosliceOverZ.objects.find((candidate) => candidate.codomain === "Qf");
    expect(object).toBeDefined();
    const image = functor.F0(object!);
    expect(image.codomain).toBe("Qf");
    expect(image.arrowFromAnchor.name).toBe("liftF");

    const arrow = cosliceOverZ.arrows.find((candidate) => candidate.mediating.name === "u");
    expect(arrow).toBeDefined();
    const mapped = functor.F1(arrow!);
    expect(mapped.mediating.name).toBe("u");
    expect(mapped.src.arrowFromAnchor.name).toBe("liftF");
    expect(mapped.dst.arrowFromAnchor.name).toBe("liftG");
  });

  it("reindexes coslice data along pushouts", () => {
    const functor = makeCosliceReindexingFunctor(PushoutCategory, pushouts, h, "X", "Z");
    const object = cosliceOverX.objects.find((candidate) => candidate.arrowFromAnchor.name === "f");
    expect(object).toBeDefined();
    const image = functor.F0(object!);
    expect(image.codomain).toBe("Qf");
    expect(image.arrowFromAnchor.name).toBe("qZf");

    const arrow = cosliceOverX.arrows.find((candidate) => candidate.mediating.name === "j");
    expect(arrow).toBeDefined();
    const mapped = functor.F1(arrow!);
    expect(mapped.mediating.name).toBe("u");
    expect(mapped.src.arrowFromAnchor.name).toBe("qZf");
    expect(mapped.dst.arrowFromAnchor.name).toBe("qZg");
  });

  it("searches for pushouts using the finite calculator", () => {
    const f = getArrow("f");
    const data = pushouts.pushout(f, h);
    expect(data.apex).toBe("Qf");
    expect(data.Q).toBe(data.apex);
    expect(data.fromDomain.name).toBe("qAf");
    expect(data.iA.name).toBe("qAf");
    expect(data.fromAnchor.name).toBe("qZf");
    expect(data.iZ.name).toBe("qZf");

    const g = getArrow("g");
    const dst = pushouts.pushout(g, h);
    expect(dst.apex).toBe("Qg");
    expect(dst.Q).toBe(dst.apex);
    expect(dst.fromDomain.name).toBe("qBg");
    expect(dst.iA.name).toBe("qBg");
    expect(dst.fromAnchor.name).toBe("qZg");
    expect(dst.iZ.name).toBe("qZg");

    const mediating = pushouts.coinduce(getArrow("j"), dst, data);
    expect(mediating.name).toBe("u");
  });
});
