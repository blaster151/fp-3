import { describe, expect, it } from "vitest";

import {
  buildDayPairingData,
  checkChuMorphism,
  chuSpaceFromDayPairing,
  composeChuMorphisms,
  constructChuMorphism,
  dualChuSpace,
  identityChuMorphism,
  makeChuSpace,
  sweedlerDualFromDual,
  sweedlerDualFromPrimal,
} from "../chu-space";
import type { ChuAdjointnessFailure, DayPairingContribution } from "../chu-space";
import { analyzeDayChuPairing } from "../oracles/chu-spaces";
import { dayTensor } from "../day-convolution";
import { SetCat } from "../set-cat";
import { contravariantRepresentableFunctorWithWitness, covariantRepresentableFunctorWithWitness } from "../functor-representable";
import { makeTwoObjectPromonoidalKernel } from "../promonoidal-structure";
import { TwoObjectCategory, type TwoArrow, type TwoObject } from "../two-object-cat";

const buildBoolean = () => SetCat.obj([false, true], { tag: "Ω" });

const makeBooleanDayPairingInput = () => {
  const kernel = makeTwoObjectPromonoidalKernel();
  const left = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const right = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
  const convolution = dayTensor(kernel, left.functor, right.functor);
  const dualizing = buildBoolean();

  return {
    kernel,
    left: left.functor,
    right: right.functor,
    convolution,
    dualizing,
    pairing: (_object: TwoObject, carrier: ReturnType<typeof convolution.functor.functor.F0>) =>
      SetCat.hom(carrier, dualizing, (cls) => cls.witness.kernelLeft === cls.witness.kernelRight),
    aggregate: (
      contributions: ReadonlyArray<
        DayPairingContribution<TwoObject, TwoArrow, unknown, unknown, boolean>
      >,
    ) => contributions.some((entry) => entry.evaluation),
    tags: { primal: "DayPairingPrimal", dual: "DayPairingDual" },
  } as const;
};

describe("Chu spaces", () => {
  it("constructs a Chu space from an evaluation table", () => {
    const dualizing = buildBoolean();
    const primal = SetCat.obj(["x", "y"], { tag: "X" });
    const dual = SetCat.obj(["α", "β"], { tag: "A" });

    const space = makeChuSpace({
      dualizing,
      primal,
      dual,
      evaluate: (value, covalue) => (value === "x" ? covalue === "α" : covalue === "β"),
    });

    expect(space.evaluate("x", "α")).toBe(true);
    expect(space.evaluate("x", "β")).toBe(false);
    expect(space.evaluate("y", "α")).toBe(false);
    expect(space.evaluate("y", "β")).toBe(true);

    expect(space.pairing.dom).toBe(space.product.object);
    expect(space.pairing.cod).toBe(dualizing);
  });

  it("checks Chu morphisms via the adjointness condition", () => {
    const dualizing = buildBoolean();

    const domain = makeChuSpace({
      dualizing,
      primal: SetCat.obj(["x", "y"], { tag: "X" }),
      dual: SetCat.obj(["α", "β"], { tag: "A" }),
      evaluate: (value, covalue) => (value === "x" ? covalue === "α" : covalue === "β"),
    });

    const codomain = makeChuSpace({
      dualizing,
      primal: SetCat.obj(["u", "v"], { tag: "Y" }),
      dual: SetCat.obj(["ρ", "σ"], { tag: "B" }),
      evaluate: (value, covalue) => (value === "u" ? covalue === "ρ" : covalue === "σ"),
    });

    const forward = SetCat.hom(domain.primal, codomain.primal, (value) =>
      value === "x" ? "u" : "v",
    );
    const backward = SetCat.hom(codomain.dual, domain.dual, (covalue) =>
      covalue === "ρ" ? "α" : "β",
    );

    const constructed = constructChuMorphism(domain, codomain, forward, backward);

    expect(constructed.diagnostics.holds).toBe(true);
    expect(constructed.diagnostics.truncated).toBe(false);
    expect(constructed.diagnostics.checkedPairs).toBe(4);
    expect(constructed.diagnostics.failures).toHaveLength(0);

    const identity = identityChuMorphism(domain);
    expect(identity.diagnostics.holds).toBe(true);
    expect(identity.diagnostics.checkedPairs).toBe(4);

    const composed = composeChuMorphisms(domain, codomain, codomain, constructed.morphism, identity.morphism);
    expect(composed.diagnostics.holds).toBe(true);
    expect(composed.diagnostics.checkedPairs).toBe(4);
  });

  it("records failures when Chu adjointness breaks", () => {
    const dualizing = buildBoolean();

    const domain = makeChuSpace({
      dualizing,
      primal: SetCat.obj(["x", "y"], { tag: "X" }),
      dual: SetCat.obj(["α", "β"], { tag: "A" }),
      evaluate: (value, covalue) => (value === "x" ? covalue === "α" : covalue === "β"),
    });

    const codomain = makeChuSpace({
      dualizing,
      primal: SetCat.obj(["u", "v"], { tag: "Y" }),
      dual: SetCat.obj(["ρ", "σ"], { tag: "B" }),
      evaluate: (value, covalue) => (value === "u" ? covalue === "ρ" : covalue === "σ"),
    });

    const forward = SetCat.hom(domain.primal, codomain.primal, (value) =>
      value === "x" ? "u" : "v",
    );
    const backward = SetCat.hom(codomain.dual, domain.dual, () => "α");

    const diagnostics = checkChuMorphism(domain, codomain, { forward, backward });
    expect(diagnostics.holds).toBe(false);
    expect(diagnostics.failures.length).toBeGreaterThan(0);
    const sampleFailure: ChuAdjointnessFailure<string, string, boolean> = diagnostics.failures[0]!;
    expect(typeof sampleFailure.forwardValue).toBe("boolean");
    expect(typeof sampleFailure.backwardValue).toBe("boolean");
  });

  it("truncates enumeration once the hard cap is exceeded", () => {
    const dualizing = buildBoolean();
    const elements = Array.from({ length: 70 }, (_, index) => index);

    const space = makeChuSpace({
      dualizing,
      primal: SetCat.obj(elements, { tag: "LargeX" }),
      dual: SetCat.obj(elements, { tag: "LargeA" }),
      evaluate: (value, covalue) => value === covalue,
    });

    const identity = identityChuMorphism(space);

    expect(identity.diagnostics.holds).toBe(true);
    expect(identity.diagnostics.truncated).toBe(true);
    expect(identity.diagnostics.checkedPairs).toBeLessThanOrEqual(4096);
  });

  it("derives Chu spaces from Day pairings and exposes dual utilities", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const left = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
    const right = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");

    const convolution = dayTensor(kernel, left.functor, right.functor);
    const dualizing = buildBoolean();

    const space = chuSpaceFromDayPairing({
      kernel,
      left: left.functor,
      right: right.functor,
      convolution,
      dualizing,
      pairing: (
        _object: TwoObject,
        carrier: ReturnType<typeof convolution.functor.functor.F0>,
      ) => SetCat.hom(carrier, dualizing, (cls) => cls.witness.kernelLeft === cls.witness.kernelRight),
      aggregate: (contributions) => contributions.some((entry) => entry.evaluation),
      tags: { primal: "DayPrimal", dual: "DayDual" },
    });

    const primalElements = Array.from(space.primal);
    const dualElements = Array.from(space.dual);
    expect(primalElements.length).toBeGreaterThan(0);
    expect(dualElements.length).toBeGreaterThan(0);

    const samplePrimal = primalElements[0]!;
    const sampleDual = dualElements[0]!;
    const value = space.evaluate(samplePrimal, sampleDual);
    expect(typeof value).toBe("boolean");

    const dual = dualChuSpace(space);
    expect(dual.evaluate(sampleDual, samplePrimal)).toBe(value);

    const fromPrimal = sweedlerDualFromPrimal(space);
    const functional = fromPrimal.map(samplePrimal);
    expect(functional(sampleDual)).toBe(value);

    const fromDual = sweedlerDualFromDual(space);
    const dualFunctional = fromDual.map(sampleDual);
    expect(dualFunctional(samplePrimal)).toBe(value);
  });

  it("exposes Day pairing data for aggregation helpers", () => {
    const input = makeBooleanDayPairingInput();
    const data = buildDayPairingData(input);

    const primalElements = Array.from(data.primalCarrier);
    const dualElements = Array.from(data.dualCarrier);

    expect(primalElements.length).toBeGreaterThan(0);
    expect(dualElements.length).toBeGreaterThan(0);

    const contributions = data.collect(primalElements[0]!, dualElements[0]!);
    const aggregated = data.aggregate(contributions);

    expect(typeof aggregated).toBe("boolean");
    expect(data.space.evaluate(primalElements[0]!, dualElements[0]!)).toBe(aggregated);
  });

  it("analyzes Day Chu pairings with oracle diagnostics", () => {
    const input = makeBooleanDayPairingInput();
    const analysis = analyzeDayChuPairing(input);

    expect(analysis.holds).toBe(true);
    expect(analysis.truncated).toBe(false);
    expect(analysis.failures).toHaveLength(0);
    expect(analysis.samples.length).toBeGreaterThan(0);

    const sample = analysis.samples[0]!;
    expect(analysis.space.evaluate(sample.primal, sample.dual)).toBe(sample.value);
    expect(sample.contributions.length).toBeGreaterThan(0);
  });

  it("flags Day Chu pairing outputs outside the dualizing object", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const left = contravariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
    const right = covariantRepresentableFunctorWithWitness(TwoObjectCategory, "★");
    const convolution = dayTensor(kernel, left.functor, right.functor);
    const dualizing = SetCat.obj(["valid"], { tag: "Dual" });

    const analysis = analyzeDayChuPairing({
      kernel,
      left: left.functor,
      right: right.functor,
      convolution,
      dualizing,
      pairing: (
        _object: TwoObject,
        carrier: ReturnType<typeof convolution.functor.functor.F0>,
      ) => SetCat.hom(carrier, dualizing, () => "valid"),
      aggregate: () => "invalid",
    });

    expect(analysis.holds).toBe(false);
    expect(analysis.failures.length).toBeGreaterThan(0);
  });
});
