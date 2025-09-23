import { describe, expect, it } from "vitest";

import { mkFin } from "../../markov-category";
import { buildSetMultDeterminismWitness, checkSetMultDeterminism } from "../../markov-deterministic-structure";
import {
  checkSetMultComonoid,
  checkSetMultDeterministic,
  checkSetMultInfiniteProduct,
} from "../../setmult-oracles";
import {
  DeterministicSetMultWitness,
  SetMultIndexedFamily,
  createSetMultInfObj,
  createSetMultObj,
  deterministicToSetMulti,
  kernelToSetMulti,
  projectSetMult,
  setMultObjFromFin,
  setMultiToKernel,
} from "../../setmult-category";

describe("SetMult semicartesian structure", () => {
  const boolObj = createSetMultObj<boolean>({
    eq: (a, b) => a === b,
    show: (value) => (value ? "⊤" : "⊥"),
    samples: [false, true],
    label: "Bool",
  });

  it("verifies copy/discard laws on boolean samples", () => {
    const report = checkSetMultComonoid(boolObj, boolObj.samples ?? []);
    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
  });
});

describe("SetMult determinism", () => {
  const boolFin = mkFin([false, true], (a, b) => a === b, (value) => (value ? "⊤" : "⊥"));
  const numberFin = mkFin([0, 1], (a, b) => a === b);
  const boolObj = setMultObjFromFin(boolFin, "Bool");
  const numberObj = setMultObjFromFin(numberFin, "Two");

  const deterministicWitness: DeterministicSetMultWitness<boolean, number> = {
    domain: boolObj,
    codomain: numberObj,
    morphism: deterministicToSetMulti(boolObj, numberObj, (value) => (value ? 1 : 0)),
    label: "indicator",
  };

  it("confirms singleton fibres are deterministic", () => {
    const summary = checkSetMultDeterministic(deterministicWitness, boolFin.elems);
    expect(summary.holds).toBe(true);
    expect(summary.report.base?.(true)).toBe(1);
  });

  it("detects multi-valued fibres", () => {
    const multiValued: DeterministicSetMultWitness<boolean, number> = {
      domain: boolObj,
      codomain: numberObj,
      morphism: (value) => (value ? new Set([0, 1]) : new Set([0])),
      label: "partial",
    };
    const summary = checkSetMultDeterministic(multiValued, boolFin.elems);
    expect(summary.holds).toBe(false);
    expect(summary.report.counterexample).toBeDefined();
  });

  it("aligns with finite Markov kernels", () => {
    const witness = buildSetMultDeterminismWitness(boolFin, numberFin, deterministicWitness.morphism);
    const report = checkSetMultDeterminism(witness);
    expect(report.holds).toBe(true);
    const kernel = setMultiToKernel(boolFin, numberFin, witness.setWitness);
    const support = kernelToSetMulti(numberFin, kernel);
    for (const input of boolFin.elems) {
      expect(support(input)).toEqual(deterministicWitness.morphism(input));
    }
  });
});

describe("SetMult infinite products", () => {
  const boolFin = mkFin([false, true], (a, b) => a === b);
  const boolObj = setMultObjFromFin(boolFin, "Bool");

  it("projects tuples consistently", () => {
    const family = {
      index: ["x", "y"] as const,
      coordinate: () => boolObj,
      countability: { kind: "finite", enumerate: () => ["x", "y"] as const, sample: ["x", "y"], size: 2 },
    } satisfies SetMultIndexedFamily<"x" | "y", boolean>;

    const report = checkSetMultInfiniteProduct(family, (index) => index === "x", [
      { subset: ["x"] },
      { subset: ["y"] },
      { subset: ["x", "y"] },
    ]);

    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.countability?.kind).toBe("finite");
  });

  it("detects mismatched projections", () => {
    const family = {
      index: ["x", "y"] as const,
      coordinate: () => boolObj,
    } satisfies SetMultIndexedFamily<"x" | "y", boolean>;

    const report = checkSetMultInfiniteProduct(
      family,
      (index) => index === "x",
      [
        { subset: ["x"], expected: new Map([["x", false]]) },
        { subset: ["y"], expected: new Map([["y", true]]) },
      ],
    );

    expect(report.holds).toBe(false);
    expect(report.failures.length).toBeGreaterThan(0);
  });

  it("exposes deterministic finite projections from the product carrier", () => {
    const family = {
      index: ["x", "y"] as const,
      coordinate: () => boolObj,
    } satisfies SetMultIndexedFamily<"x" | "y", boolean>;

    const product = createSetMultInfObj(family);
    const tuple = product.carrier((index) => (index === "x" ? true : false));
    const projection = projectSetMult(product, ["x"]);
    const fibre = Array.from(projection(tuple));

    expect(fibre).toHaveLength(1);
    const section = fibre[0];
    expect(section.get("x")).toBe(true);
    expect(product.sectionObj(["x"]).eq(section, new Map([["x", true]]))).toBe(true);
  });
});
