import { describe, expect, it } from "vitest";

import {
  buildCoreflectiveSubcategoryWitness,
  buildReflectiveSubcategoryWitness,
} from "../reflective-subcategory";
import {
  constructFunctorWithWitness,
  type FunctorWithWitness,
} from "../functor";
import type { SimpleCat } from "../simple-cat";

interface Arrow<Obj extends string> {
  readonly id: string;
  readonly src: Obj;
  readonly dst: Obj;
}

type AmbientObj = "A" | "B";

type AmbientArrow = Arrow<AmbientObj>;

type SubBObj = "B";
type SubBArrow = AmbientArrow;

type SubAObj = "A";
type SubAArrow = AmbientArrow;

const IdA: AmbientArrow = { id: "idA", src: "A", dst: "A" };
const IdB: AmbientArrow = { id: "idB", src: "B", dst: "B" };
const AToB: AmbientArrow = { id: "aToB", src: "A", dst: "B" };

const ambientComposeTable: Record<string, Record<string, AmbientArrow>> = {
  idA: { idA: IdA, aToB: AToB },
  idB: { idB: IdB },
  aToB: { idB: AToB },
};

const makeAmbientCategory = (): SimpleCat<AmbientObj, AmbientArrow> & {
  readonly eq: (left: AmbientArrow, right: AmbientArrow) => boolean;
} => ({
  id: (object) => (object === "A" ? IdA : IdB),
  compose: (g, f) => {
    if (f.dst !== g.src) {
      throw new Error(`Arrows ${f.id} and ${g.id} are not composable.`);
    }
    const row = ambientComposeTable[f.id];
    const result = row?.[g.id];
    if (!result) {
      throw new Error(`Unexpected composite ${g.id} ∘ ${f.id}`);
    }
    return result;
  },
  src: () => "B",
  dst: () => "B",
  eq: (left, right) => left.id === right.id,
});

const makeSubcategoryB = (): SimpleCat<SubBObj, SubBArrow> & {
  readonly eq: (left: SubBArrow, right: SubBArrow) => boolean;
} => ({
  id: (_object) => IdB,
  compose: (_g, _f) => IdB,
  src: () => "B",
  dst: () => "B",
  eq: (left, right) => left.id === right.id,
});

const makeSubcategoryA = (): SimpleCat<SubAObj, SubAArrow> & {
  readonly eq: (left: SubAArrow, right: SubAArrow) => boolean;
} => ({
  id: (_object) => IdA,
  compose: (_g, _f) => IdA,
  src: () => "A",
  dst: () => "A",
  eq: (left, right) => left.id === right.id,
});

const reflectiveInclusion = (
  subcategory: SimpleCat<SubBObj, SubBArrow> & {
    readonly eq: (left: SubBArrow, right: SubBArrow) => boolean;
  },
  ambient: ReturnType<typeof makeAmbientCategory>,
): FunctorWithWitness<SubBObj, SubBArrow, AmbientObj, AmbientArrow> =>
  constructFunctorWithWitness(
    subcategory,
    ambient,
    {
      F0: (object) => object,
      F1: (arrow) => (arrow.id === "idB" ? IdB : arrow),
    },
    {
      objects: ["B"],
      arrows: [IdB],
    },
    ["Reflective inclusion J: Sub_B → Ambient."],
  );

const reflectiveReflector = (
  ambient: ReturnType<typeof makeAmbientCategory>,
  subcategory: ReturnType<typeof makeSubcategoryB>,
): FunctorWithWitness<AmbientObj, AmbientArrow, SubBObj, SubBArrow> =>
  constructFunctorWithWitness(
    ambient,
    subcategory,
    {
      F0: (object) => (object === "A" ? "B" : "B"),
      F1: (_arrow) => IdB,
    },
    {
      objects: ["A", "B"],
      arrows: [IdA, IdB, AToB],
    },
    ["Reflector L folding Ambient onto Sub_B."],
  );

const coreflectiveInclusion = (
  subcategory: ReturnType<typeof makeSubcategoryA>,
  ambient: ReturnType<typeof makeAmbientCategory>,
): FunctorWithWitness<SubAObj, SubAArrow, AmbientObj, AmbientArrow> =>
  constructFunctorWithWitness(
    subcategory,
    ambient,
    {
      F0: (object) => object,
      F1: (arrow) => (arrow.id === "idA" ? IdA : arrow),
    },
    {
      objects: ["A"],
      arrows: [IdA],
    },
    ["Coreflective inclusion J: Sub_A → Ambient."],
  );

const coreflector = (
  ambient: ReturnType<typeof makeAmbientCategory>,
  subcategory: ReturnType<typeof makeSubcategoryA>,
): FunctorWithWitness<AmbientObj, AmbientArrow, SubAObj, SubAArrow> =>
  constructFunctorWithWitness(
    ambient,
    subcategory,
    {
      F0: () => "A",
      F1: (_arrow) => IdA,
    },
    {
      objects: ["A", "B"],
      arrows: [IdA, IdB, AToB],
    },
    ["Coreflector R collapsing Ambient onto Sub_A."],
  );

describe("Reflective and coreflective subcategory witnesses", () => {
  it("packages a reflective adjunction with component diagnostics", () => {
    const ambient = makeAmbientCategory();
    const subB = makeSubcategoryB();
    const inclusion = reflectiveInclusion(subB, ambient);
    const reflector = reflectiveReflector(ambient, subB);

    const witness = buildReflectiveSubcategoryWitness<AmbientObj, AmbientArrow, SubBObj, SubBArrow>(
      inclusion,
      reflector,
      (object) => (object === "A" ? AToB : IdB),
      () => IdB,
      {
        unitSamples: { objects: ["A", "B"], arrows: [IdA, IdB, AToB] },
        counitSamples: { objects: ["B"], arrows: [IdB] },
        adjunctionSamples: { sourceObjects: ["A", "B"], targetObjects: ["B"] },
        metadata: ["Reflective Sub_B ⊂ Ambient"],
      },
    );

    expect(witness.report.holds).toBe(true);
    expect(witness.adjunction.report.holds).toBe(true);
    expect(witness.report.unitComponents.holds).toBe(true);
    expect(witness.report.counitComponents.holds).toBe(true);
    expect(witness.report.details).toContain("Reflective Sub_B ⊂ Ambient");
  });

  it("flags a reflective unit with the wrong target", () => {
    const ambient = makeAmbientCategory();
    const subB = makeSubcategoryB();
    const inclusion = reflectiveInclusion(subB, ambient);
    const reflector = reflectiveReflector(ambient, subB);

    const witness = buildReflectiveSubcategoryWitness<AmbientObj, AmbientArrow, SubBObj, SubBArrow>(
      inclusion,
      reflector,
      () => IdB,
      () => IdB,
      {
        unitSamples: { objects: ["A"] },
      },
    );

    expect(witness.report.holds).toBe(false);
    expect(witness.report.unitComponents.holds).toBe(false);
    expect(witness.report.unitComponents.failures[0]?.reason).toContain("Reflective unit");
  });

  it("packages a coreflective adjunction with diagnostics", () => {
    const ambient = makeAmbientCategory();
    const subA = makeSubcategoryA();
    const inclusion = coreflectiveInclusion(subA, ambient);
    const core = coreflector(ambient, subA);

    const witness = buildCoreflectiveSubcategoryWitness<AmbientObj, AmbientArrow, SubAObj, SubAArrow>(
      inclusion,
      core,
      () => IdA,
      (object) => (object === "B" ? AToB : IdA),
      {
        unitSamples: { objects: ["A"], arrows: [IdA] },
        counitSamples: { objects: ["A", "B"], arrows: [IdA, IdB, AToB] },
        adjunctionSamples: { sourceObjects: ["A"], targetObjects: ["A", "B"] },
        metadata: ["Coreflective Sub_A ⊂ Ambient"],
      },
    );

    expect(witness.report.holds).toBe(true);
    expect(witness.adjunction.report.holds).toBe(true);
    expect(witness.report.unitComponents.holds).toBe(true);
    expect(witness.report.counitComponents.holds).toBe(true);
    expect(witness.report.details).toContain("Coreflective Sub_A ⊂ Ambient");
  });

  it("detects a coreflective counit with mismatched endpoints", () => {
    const ambient = makeAmbientCategory();
    const subA = makeSubcategoryA();
    const inclusion = coreflectiveInclusion(subA, ambient);
    const core = coreflector(ambient, subA);

    const witness = buildCoreflectiveSubcategoryWitness<AmbientObj, AmbientArrow, SubAObj, SubAArrow>(
      inclusion,
      core,
      () => IdA,
      () => IdA,
      {
        counitSamples: { objects: ["B"] },
      },
    );

    expect(witness.report.holds).toBe(false);
    expect(witness.report.counitComponents.holds).toBe(false);
    expect(
      witness.report.counitComponents.failures[0]?.reason,
    ).toContain("Coreflective counit");
  });
});
