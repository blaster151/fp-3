import { describe, expect, it } from "vitest";

import { mkFin } from "../../markov-category";
import { buildSetMultDeterminismWitness, checkSetMultDeterminism } from "../../markov-deterministic-structure";
import {
  canonicalSetMultSemicartesianCone,
  checkSetMultComonoid,
  checkSetMultDeterministic,
  checkSetMultInfiniteProduct,
  checkSetMultSemicartesianProductCone,
  checkSetMultSemicartesianUniversalProperty,
  type SetMultSemicartesianCone,
  type SetMultSemicartesianRestriction,
} from "../../setmult-oracles";
import {
  createSetMultInfObj,
  createSetMultObj,
  deterministicToSetMulti,
  kernelToSetMulti,
  projectSetMult,
  setMultObjFromFin,
  setMultObjFromSet,
  setMultiToKernel,
  type SetMultProduct,
  type SetMultTuple,
} from "../../setmult-category";
import type { DeterministicSetMultWitness, SetMultIndexedFamily } from "../../setmult-category";
import { SetCat } from "../../set-cat";

describe("SetMult semicartesian structure", () => {
  const boolObj = createSetMultObj<boolean>({
    eq: (a, b) => a === b,
    show: (value) => (value ? "⊤" : "⊥"),
    samples: [false, true],
    label: "Bool",
  });

  it("verifies copy/discard laws on boolean samples", () => {
    const report = checkSetMultComonoid(boolObj);
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
    const summary = checkSetMultDeterministic(deterministicWitness);
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
    const summary = checkSetMultDeterministic(multiValued);
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

  it("builds deterministic witnesses from SetCat carriers", () => {
    const boolCarrier = SetCat.obj([false, true]);
    const numberCarrier = SetCat.obj([0, 1]);
    const boolObjFromSet = setMultObjFromSet(boolCarrier, { label: "Bool" });
    const numberObjFromSet = setMultObjFromSet(numberCarrier, { label: "Two" });
    const morphism = deterministicToSetMulti(
      boolObjFromSet,
      numberObjFromSet,
      (value) => (value ? 1 : 0),
    );
    const witness = buildSetMultDeterminismWitness(boolCarrier, numberCarrier, morphism, {
      label: "SetCat indicator",
    });
    const report = checkSetMultDeterminism(witness);
    expect(report.holds).toBe(true);
    expect(report.deterministic.base?.(true)).toBe(1);
    expect(report.deterministic.base?.(false)).toBe(0);
    expect(witness.setWitness.domain.samples).toEqual([false, true]);
  });
});

describe("SetMult infinite products", () => {
  const boolFin = mkFin([false, true], (a, b) => a === b);
  const boolObj = setMultObjFromFin(boolFin, "Bool");

  it("projects tuples consistently", () => {
    const family = {
      index: ["x", "y"] as const,
      coordinate: () => boolObj,
      countability: { kind: "finite", enumerate: () => ["x", "y"] as const, sample: ["x", "y"] as const, size: 2 },
    } satisfies SetMultIndexedFamily<"x" | "y", boolean>;

    const report = checkSetMultInfiniteProduct(family, (index) => index === "x", [
      { subset: ["x"] as const },
      { subset: ["y"] as const },
      { subset: ["x", "y"] as const },
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
        { subset: ["x"] as const, expected: new Map<"x", boolean>([["x", false]]) },
        { subset: ["y"] as const, expected: new Map<"y", boolean>([["y", true]]) },
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

    const product: SetMultProduct<"x" | "y", boolean> = createSetMultInfObj(family);
    const tuple = product.carrier((index) => (index === "x" ? true : false));
    const projection = projectSetMult(product, ["x"] as const);
    const fibre = Array.from(projection(tuple));

    expect(fibre).toHaveLength(1);
    const section = fibre[0];
    if (section === undefined) {
      throw new Error("Expected projection fibre to contain a section");
    }
    expect(section.get("x")).toBe(true);
    const oneCoordinate: SetMultTuple<"x" | "y", boolean> = new Map<"x", boolean>([["x", true]]);
    expect(product.sectionObj(["x"] as const).eq(section, oneCoordinate)).toBe(true);
  });
});

describe("Set-backed semicartesian infinite products", () => {
  const boolObj = createSetMultObj<boolean>({
    eq: (a, b) => a === b,
    show: (value) => (value ? "⊤" : "⊥"),
    samples: [false, true],
    label: "Bool",
  });

  const family = {
    index: ["x", "y"] as const,
    coordinate: () => boolObj,
  } satisfies SetMultIndexedFamily<"x" | "y", boolean>;

  const buildProduct = () => createSetMultInfObj(family);

  const restrictions: ReadonlyArray<SetMultSemicartesianRestriction<"x" | "y">> = [
    { larger: ["x", "y"] as const, smaller: ["x"] as const },
    { larger: ["x", "y"] as const, smaller: ["y"] as const },
  ];

  const subsets: ReadonlyArray<ReadonlyArray<"x" | "y">> = [
    ["x"] as const,
    ["y"] as const,
    ["x", "y"] as const,
  ];

  it("confirms witness projections satisfy restriction compatibility", () => {
    const product = buildProduct();
    const result = checkSetMultSemicartesianProductCone(product, restrictions);
    expect(result.holds).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("flags restriction rewrites that break compatibility", () => {
    const product = buildProduct();
    const witness = product.semicartesianWitness;
    const inconsistentWitness: typeof witness = {
      ...witness,
      diagram: {
        ...witness.diagram,
        restriction: (larger, smaller) => {
          const base = witness.diagram.restriction(larger, smaller);
          const target = base.cod;
          return SetCat.hom(base.dom, target, (tuple) => {
            const restricted = new Map(base.map(tuple));
            const first = smaller[0];
            if (first !== undefined) {
              restricted.set(first, false);
            }
            if (!target.has(restricted)) {
              target.add(restricted);
            }
            return restricted;
          });
        },
      },
    };

    const tamperedProduct: SetMultProduct<"x" | "y", boolean> = {
      ...product,
      semicartesianWitness: inconsistentWitness,
    };

    const result = checkSetMultSemicartesianProductCone(tamperedProduct, restrictions);
    expect(result.holds).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0]?.reason).toContain("failed compatibility");
  });

  it("produces mediators that satisfy the universal property tests", () => {
    const product = buildProduct();
    const canonicalCone = canonicalSetMultSemicartesianCone(product, { label: "identity cone" });

    const universal = checkSetMultSemicartesianUniversalProperty(product, [canonicalCone], subsets);
    expect(universal.holds).toBe(true);
    expect(universal.failures).toHaveLength(0);
    expect(universal.mediators).toHaveLength(1);
  });

  it("detects cones whose mediators cannot satisfy all legs", () => {
    const product = buildProduct();
    const witness = product.semicartesianWitness;
    const clampCone: SetMultSemicartesianCone<"x" | "y", boolean> = {
      apex: witness.object,
      label: "clamp y",
      leg: (subset) => {
        const key = subset.join(",");
        if (key === "x") {
          return witness.projection(["x"] as const);
        }
        if (key === "y") {
          const base = witness.projection(["y"] as const);
          const codomain = base.cod;
          return SetCat.hom(base.dom, codomain, (tuple) => {
            const image = new Map(base.map(tuple));
            image.set("y", true);
            if (!codomain.has(image)) {
              codomain.add(image);
            }
            return image;
          });
        }
        if (key === "x,y") {
          return witness.projection(["x", "y"] as const);
        }
        return witness.projection(subset);
      },
    };

    const universal = checkSetMultSemicartesianUniversalProperty(product, [clampCone], subsets);
    expect(universal.holds).toBe(false);
    expect(universal.failures.length).toBeGreaterThan(0);
    expect(
      universal.failures.some((failure) =>
        failure.reason.includes("Mediator failed to reproduce leg"),
      ),
    ).toBe(true);
  });
});
