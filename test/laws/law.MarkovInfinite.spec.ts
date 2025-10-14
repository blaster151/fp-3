import { describe, it, expect } from "vitest";
import { Prob } from "../../semiring-utils";
import { bind, dirac } from "../../dist";
import {
  independentIndexedProduct,
  independentInfObj,
  independentDoubleIndexedProduct,
  createInfObj,
  restrictProjectiveFamily,
  restrictInfObj,
  flattenNestedCylinder,
  equalDist,
  pushforwardCylinderArray,
  checkKolmogorovConsistency,
  deterministicBooleanValue,
  tensorKolmogorovProducts,
  asDeterministicKernel,
  buildDeterministicKolmogorovProductWitness,
  kolmogorovExtensionMeasure,
  type MeasurabilityWitness,
  type CountabilityWitness,
  type CylinderSection,
  type FiniteSubset,
  type DoubleIndex,
  type TensorIndex,
  type TensorCarrier,
  type KernelR,
} from "../../markov-infinite";
import {
  checkTailEventInvariance,
  checkTailSigmaIndependence,
  kolmogorovZeroOneWitness,
  hewittSavageZeroOneWitness,
  checkKolmogorovZeroOneLaw,
  checkHewittSavageZeroOneLaw,
  checkFiniteProductReduction,
  checkCopyDiscardCompatibility,
  checkKolmogorovProduct,
  checkKolmogorovExtensionUniversalProperty,
  checkDeterministicProductUniversalProperty,
  analyzeFinStochInfiniteTensor,
} from "../../markov-infinite-oracles";
import type { Dist } from "../../dist";
import type { ProjectiveLimitSection } from "../../markov-infinite";
import { mkFin, detK, fromMatrix, tensorObj, pair, FinMarkov } from "../../markov-category";
import type { Fin } from "../../markov-category";
import { buildMarkovComonoidWitness } from "../../markov-comonoid-structure";
import { buildMarkovDeterministicWitness } from "../../markov-deterministic-structure";
import { buildMarkovConditionalWitness } from "../../markov-conditional-independence";

const bernoulli = (p: number): Dist<number, number> => ({
  R: Prob,
  w: new Map<number, number>([
    [1, p],
    [0, 1 - p],
  ]),
});

const makeMeasure = <T>(pairs: Array<[T, number]>): Dist<number, T> => ({ R: Prob, w: new Map(pairs) });

const discreteWitness = (indices: Iterable<number>): MeasurabilityWitness<number> => {
  const enumerated = Array.from(indices);
  return {
    kind: "standardBorel",
    coordinates: enumerated.map((index) => ({
      index,
      sigmaAlgebra: "discrete",
      standardBorel: true,
    })),
    reason: "Finite discrete spaces carry the discrete Borel sigma-algebra.",
  };
};

const expectSingleEntry = <K, V>(map: ReadonlyMap<K, V>, context: string): readonly [K, V] => {
  const iterator = map.entries();
  const first = iterator.next();
  if (first.done || first.value === undefined) {
    throw new Error(`Expected ${context} to contain at least one entry.`);
  }
  const second = iterator.next();
  if (!second.done) {
    throw new Error(`Expected ${context} to contain exactly one entry.`);
  }
  return first.value;
};

const expectSingleValue = <V>(map: ReadonlyMap<unknown, V>, context: string): V =>
  expectSingleEntry(map, context)[1];

const stringFin = (letters: ReadonlyArray<string>): Fin<unknown> =>
  mkFin<unknown>(
    letters,
    (a, b) => typeof a === "string" && typeof b === "string" && a === b,
    (value) => String(value),
  );

const booleanDelta = dirac<number, boolean>(Prob);

const buildZeroOneFixtures = () => {
  const indices = [0, 1, 2];
  const obj = independentInfObj(Prob, indices, () => bernoulli(0.5), {
    measurability: discreteWitness(indices),
  });
  const productWitness = obj.deterministicWitness?.() ?? buildDeterministicKolmogorovProductWitness(obj);

  const constantZero: ProjectiveLimitSection<number, number> = () => 0;
  const constantOne: ProjectiveLimitSection<number, number> = () => 1;

  const sectionEquals = (
    left: ProjectiveLimitSection<number, number>,
    right: ProjectiveLimitSection<number, number>,
  ): boolean => indices.every((index) => left(index) === right(index));

  const carrierFin = mkFin<ProjectiveLimitSection<number, number>>(
    [constantZero, constantOne],
    sectionEquals,
  );
  const carrierWitness = buildMarkovComonoidWitness(carrierFin, { label: "Kolmogorov sections" });

  const domainFin = mkFin<"zero" | "one">(["zero", "one"], (a, b) => a === b);
  const domainWitness = buildMarkovComonoidWitness(domainFin, { label: "support" });

  const boolFin = mkFin([0, 1], (a, b) => a === b);
  const boolWitness = buildMarkovComonoidWitness(boolFin, { label: "boolean" });

  const toSection = (state: "zero" | "one") => (state === "zero" ? constantZero : constantOne);
  const p = detK(domainFin, carrierFin, toSection);

  const fixtures = {
    indices,
    obj,
    productWitness,
    constantZero,
    constantOne,
    domainFin,
    carrierFin,
    boolFin,
    domainWitness,
    carrierWitness,
    boolWitness,
    p,
  };
  return fixtures;
};

describe("Markov infinite products", () => {
  it("constructs projective families with Kolmogorov consistency", () => {
    const indices = Array.from({ length: 4 }, (_, i) => i);
    const explicitCountability: CountabilityWitness<number> = {
      kind: "finite",
      enumerate: () => indices,
      sample: indices,
      size: indices.length,
      reason: "Explicit enumeration of a finite index set",
    };
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
      countability: explicitCountability,
    });
    const result = checkKolmogorovConsistency(family, [
      { finite: [0], larger: [0, 1] },
      { finite: [1, 2], larger: [0, 1, 2] },
    ]);
    expect(result.ok).toBe(true);
    expect(result.failures.length).toBe(0);
    expect(result.countable).toBe(true);
    expect(result.witness?.kind).toBeDefined();
    expect(result.witness).toBe(explicitCountability);
    expect(result.measurable).toBe(true);
    expect(result.standardBorel).toBe(true);
    expect(result.measurability?.kind).toBe("standardBorel");
  });

  it("falls back to inferred countability metadata when no witness is provided", () => {
    const indices = Array.from({ length: 3 }, (_, i) => i);
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5));
    expect(family.countability.kind).toBe("finite");
    expect(family.countability.reason).toContain("Iterable terminated");
    const obj = createInfObj(family);
    expect(obj.family.countability).toBe(family.countability);
  });

  it("rejects malformed countability witnesses", () => {
    const indices = [0, 1, 2];
    const duplicateEnumeration = [0, 1, 1];
    const badWitness: CountabilityWitness<number> = {
      kind: "finite",
      enumerate: () => duplicateEnumeration,
      sample: indices,
      reason: "Deliberately repeats elements",
    };

    expect(() =>
      independentIndexedProduct(Prob, indices, () => bernoulli(0.5), { countability: badWitness })
    ).toThrow(/repeats element/);
  });

  it("recovers finite tensor marginals when the index is finite", () => {
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const obj = createInfObj(family);

    const makeSection = (assignment: ReadonlyMap<number, number>) =>
      ((index: number) => assignment.get(index) ?? 0) as ProjectiveLimitSection<number, number>;

    const assignments = [
      new Map<number, number>([]),
      new Map<number, number>([[0, 1]]),
      new Map<number, number>([[1, 1]]),
      new Map<number, number>([[0, 1], [1, 1]]),
    ];

    const measure = makeMeasure(assignments.map((assignment) => [makeSection(assignment), 0.25]));

    const reduction = checkFiniteProductReduction(obj, measure, indices);
    expect(reduction.ok).toBe(true);
    expect(reduction.expected.w.size).toBe(reduction.actual.w.size);
    expect(obj.family.measurability?.kind).toBe("standardBorel");
  });

  it("extends consistent finite families into global measures", () => {
    const indices = [0, 1, 2];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const obj = createInfObj(family);

    const result = checkKolmogorovExtensionUniversalProperty(obj, [[0], [0, 1]]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.countable).toBe(true);
      expect(result.witness?.kind).toBeDefined();
      expect(result.baseSubset).toEqual([0, 1]);
      result.reductions.forEach((reduction) => expect(reduction.ok).toBe(true));
      expect(result.measurable).toBe(true);
      expect(result.standardBorel).toBe(true);
    }
  });

  it("reports when extension data is missing", () => {
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5));
    const familyWithoutExtend = { ...family, extend: undefined };
    const obj = createInfObj(familyWithoutExtend);
    const result = checkKolmogorovExtensionUniversalProperty(obj, [[0]]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("extension builder");
      expect(result.countable).toBe(true);
      expect(result.witness?.kind).toBeDefined();
      expect(result.measurable).toBe(false);
      expect(result.standardBorel).toBe(false);
      expect(result.measurability).toBeUndefined();
    }
  });

  it("aligns projections with copy/discard composition", () => {
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const obj = createInfObj(family);

    const sections: ProjectiveLimitSection<number, number>[] = [
      (i) => (i === 0 ? 0 : 1),
      (i) => (i === 1 ? 0 : 1),
    ];

    const compatibility = checkCopyDiscardCompatibility(obj, [[0], [1], indices], sections);
    expect(compatibility.ok).toBe(true);
    expect(compatibility.failures).toHaveLength(0);
    expect(compatibility.countable).toBe(true);
    expect(compatibility.witness?.kind).toBeDefined();
    expect(compatibility.measurable).toBe(true);
    expect(compatibility.standardBorel).toBe(true);
  });

  it("certifies Kolmogorov products via deterministic finite projections", () => {
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const obj = createInfObj(family);

    const samples: ProjectiveLimitSection<number, number>[] = [
      (i) => (i === 0 ? 0 : 1),
      (i) => (i === 0 ? 1 : 0),
    ];

    const result = checkKolmogorovProduct(obj, [[0], [1], indices], samples);
    expect(result.ok).toBe(true);
    expect(result.deterministic).toBe(true);
    expect(result.copyDiscard.ok).toBe(true);
    expect(result.determinismFailures).toHaveLength(0);
    expect(result.countable).toBe(true);
    expect(result.standardBorel).toBe(true);
  });

  it("detects non-deterministic marginals during Kolmogorov checks", () => {
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const base = createInfObj(family);

    const projectKernel = (subset: ReadonlyArray<number>) => {
      const baseKernel = base.projectKernel(subset);
      return (section: ProjectiveLimitSection<number, number>) => {
        const deterministic = baseKernel(section);
        if (subset.length === 0) {
          return deterministic;
        }
        const entries = Array.from(deterministic.w.entries());
        if (entries.length === 0) {
          return deterministic;
        }
        const firstEntry = entries[0];
        if (!firstEntry) {
          return deterministic;
        }
        const [originalSection] = firstEntry;
        const primary = new Map(originalSection) as CylinderSection<number, number>;
        const toggled = new Map(primary) as CylinderSection<number, number>;
        const [maybeToggleIndex] = subset;
        if (maybeToggleIndex === undefined) {
          return deterministic;
        }
        const toggleIndex = maybeToggleIndex;
        const current = primary.has(toggleIndex) ? primary.get(toggleIndex)! : 0;
        toggled.set(toggleIndex, current === 0 ? 1 : 0);
        const dist: Dist<number, CylinderSection<number, number>> = { R: Prob, w: new Map() };
        dist.w.set(primary, 0.5);
        dist.w.set(toggled, 0.5);
        return dist;
      };
    };

    const nondeterministic: typeof base = {
      family: base.family,
      copy: base.copy,
      discard: base.discard,
      projectKernel,
      projectArray: (subset) => (carrier) => pushforwardCylinderArray(subset, projectKernel(subset)(carrier)),
      liftKernel: (subset, kernel) => (carrier) => bind(projectKernel(subset)(carrier), kernel),
      deterministicProjection: base.deterministicProjection,
    };

    const samples: ProjectiveLimitSection<number, number>[] = [
      (i) => (i === 0 ? 0 : 1),
      (i) => (i === 1 ? 0 : 1),
    ];

    const result = checkKolmogorovProduct(nondeterministic, [[0], [1], indices], samples);
    expect(result.ok).toBe(false);
    expect(result.deterministic).toBe(false);
    expect(result.copyDiscard.ok).toBe(true);
    expect(result.determinismFailures.length).toBeGreaterThan(0);
  });

  it("enforces singleton determinism automatically when positivity metadata is present", () => {
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
      positivity: { kind: "positive", indices },
    });
    const obj = createInfObj(family);

    const samples: ProjectiveLimitSection<number, number>[] = [
      (i) => (i === 0 ? 0 : 1),
      (i) => (i === 1 ? 0 : 1),
    ];

    const result = checkKolmogorovProduct(obj, [indices], samples);
    expect(result.ok).toBe(true);
    expect(result.deterministic).toBe(true);
    expect(result.determinismFailures).toHaveLength(0);
  });

  it("reports singleton failures via positivity-aware Kolmogorov checks", () => {
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
      positivity: { kind: "positive", indices },
    });
    const base = createInfObj(family);

    const projectKernel = (subset: ReadonlyArray<number>) => {
      const baseKernel = base.projectKernel(subset);
      return (section: ProjectiveLimitSection<number, number>) => {
        const deterministic = baseKernel(section);
        if (subset.length === 0) {
          return deterministic;
        }
        const entries = Array.from(deterministic.w.entries());
        if (entries.length === 0) {
          return deterministic;
        }
        const firstEntry = entries[0];
        if (!firstEntry) {
          return deterministic;
        }
        const [originalSection] = firstEntry;
        const primary = new Map(originalSection) as CylinderSection<number, number>;
        const toggled = new Map(primary) as CylinderSection<number, number>;
        const [maybeToggleIndex] = subset;
        if (maybeToggleIndex === undefined) {
          return deterministic;
        }
        const toggleIndex = maybeToggleIndex;
        const current = primary.get(toggleIndex) ?? 0;
        toggled.set(toggleIndex, current === 0 ? 1 : 0);
        const dist: Dist<number, CylinderSection<number, number>> = { R: Prob, w: new Map() };
        dist.w.set(primary, 0.5);
        dist.w.set(toggled, 0.5);
        return dist;
      };
    };

    const nondeterministic: typeof base = {
      family: base.family,
      copy: base.copy,
      discard: base.discard,
      projectKernel,
      projectArray: (subset) => (carrier) => pushforwardCylinderArray(subset, projectKernel(subset)(carrier)),
      liftKernel: (subset, kernel) => (carrier) => bind(projectKernel(subset)(carrier), kernel),
      positivity: base.positivity,
      deterministicProjection: base.deterministicProjection,
    };

    const samples: ProjectiveLimitSection<number, number>[] = [
      (i) => (i === 0 ? 0 : 1),
      (i) => (i === 1 ? 0 : 1),
    ];

    const result = checkKolmogorovProduct(nondeterministic, [indices], samples);
    expect(result.ok).toBe(false);
    expect(result.deterministic).toBe(false);
    expect(result.determinismFailures.some((failure) => failure.subset.length === 1)).toBe(true);
  });

  it("provides copy/discard and kernel lifting", () => {
    const indices = Array.from({ length: 3 }, (_, i) => i);
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const obj = createInfObj(family);
    const delta = dirac(Prob);

    const constantZero: ProjectiveLimitSection<number, number> = () => 0;
    const copy = obj.copy(constantZero);
    expect(copy.w.size).toBe(1);
    const [pair, weight] = expectSingleEntry(copy.w, "copy kernel");
    expect(weight).toBeCloseTo(1);
    expect(pair[0](0)).toBe(0);
    expect(pair[1](1)).toBe(0);

    const discarded = obj.discard(constantZero);
    expect(discarded.w.size).toBe(1);
    const discardWeight = expectSingleValue(discarded.w, "discard kernel");
    expect(discardWeight).toBeCloseTo(1);

    const projection = obj.projectKernel([0, 1])(constantZero);
    const [section, p] = expectSingleEntry(projection.w, "projection kernel");
    expect(p).toBeCloseTo(1);
    expect(section.get(0)).toBe(0);
    expect(section.get(1)).toBe(0);

    const parityKernel: KernelR<number, ReadonlyMap<number, number>, boolean> = (s) =>
      booleanDelta(((s.get(0) ?? 0) + (s.get(1) ?? 0)) % 2 === 0);
    const lifted = obj.liftKernel([0, 1], parityKernel)(constantZero);
    expect(deterministicBooleanValue(Prob, lifted)).toBe(true);
  });

  it("exposes deterministic projections and assembles deterministic mediators", () => {
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const obj = createInfObj(family);
    const sample: ProjectiveLimitSection<number, number> = (index) => (index === 0 ? 1 : 0);

    const singleton = obj.deterministicProjection(0);
    expect(singleton(sample)).toBe(1);

    const delta = asDeterministicKernel(Prob, singleton)(sample);
    const [value, weight] = expectSingleEntry(delta.w, "deterministic projection");
    expect(weight).toBeCloseTo(1);
    expect(value).toBe(1);

    const witness = buildDeterministicKolmogorovProductWitness(obj);
    const cached = witness.projection(1);
    expect(cached.base(sample)).toBe(0);
    const [componentValue, componentWeight] = expectSingleEntry(
      cached.kernel(sample).w,
      "cached kernel",
    );
    expect(componentWeight).toBeCloseTo(1);
    expect(componentValue).toBe(0);

    const mediator = witness.factor<number>([
      { index: 0, base: (input) => input },
      { index: 1, base: (input) => (input === 0 ? 1 : 0) },
    ]);

    expect(mediator.ok).toBe(true);
    if (!mediator.ok || !mediator.base || !mediator.kernel) {
      throw new Error("Expected deterministic mediator");
    }

    const mediatorBase = mediator.base;
    const mediatorKernel = mediator.kernel;

    const output0 = mediatorBase(0);
    const output1 = mediatorBase(1);
    expect(output0(0)).toBe(0);
    expect(output0(1)).toBe(1);
    expect(output1(0)).toBe(1);
    expect(output1(1)).toBe(0);

    const [section, sectionWeight] = expectSingleEntry(
      mediatorKernel(0).w,
      "mediator kernel",
    );
    expect(sectionWeight).toBeCloseTo(1);
    expect(section(0)).toBe(0);
    expect(section(1)).toBe(1);

    const duplicate = witness.factor<number>([
      { index: 0, base: (input) => input },
      { index: 0, base: (input) => input },
    ]);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.failures[0]?.index).toBe(0);

    const familyWithoutExtend = { ...family, extend: undefined as typeof family.extend };
    const witnessWithoutExtend = buildDeterministicKolmogorovProductWitness(createInfObj(familyWithoutExtend));
    const failure = witnessWithoutExtend.factor<number>([{ index: 0, base: (input) => input }]);
    expect(failure.ok).toBe(false);
    expect(failure.details).toContain("extension builder");
  });

  it("certifies deterministic mediators for Kolmogorov products", () => {
    type Input = "L" | "R";
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
      positivity: { kind: "positive", indices },
    });
    const obj = createInfObj(family);
    const witness = obj.deterministicWitness?.() ?? buildDeterministicKolmogorovProductWitness(obj);

    const domainFin = mkFin<Input>(["L", "R"], (a, b) => a === b);
    const domainWitness = buildMarkovComonoidWitness(domainFin, { label: "inputs" });
    const bitFin = mkFin([0, 1], (a, b) => a === b);
    const bitWitness = buildMarkovComonoidWitness(bitFin, { label: "bit" });

    const bit0 = (input: Input) => (input === "L" ? 0 : 1);
    const bit1 = (input: Input) => (input === "L" ? 1 : 0);

    const components = [
      {
        index: 0,
        arrow: detK(domainFin, bitFin, bit0),
        witness: bitWitness,
        base: bit0,
        label: "first",
      },
      {
        index: 1,
        arrow: detK(domainFin, bitFin, bit1),
        witness: bitWitness,
        base: bit1,
        label: "second",
      },
    ];

    const mediator = witness.factor<Input>(components.map(({ index, base }) => ({ index, base })));
    expect(mediator.ok).toBe(true);
    if (!mediator.ok || !mediator.base) {
      throw new Error("Expected deterministic mediator");
    }

    const result = checkDeterministicProductUniversalProperty(
      witness,
      { base: mediator.base, label: "swap" },
      indices,
      {
        domain: domainWitness,
        components,
        samples: domainWitness.object.elems,
      }
    );

    expect(result.ok).toBe(true);
    expect(result.mediatorAgreement).toBe(true);
    expect(result.components.every((entry) => entry.ok)).toBe(true);
    expect(result.positive).toBe(true);
  });

  it("reports failures for non-deterministic component arrows", () => {
    type Input = "L" | "R";
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
      positivity: { kind: "positive", indices },
    });
    const obj = createInfObj(family);
    const witness = obj.deterministicWitness?.() ?? buildDeterministicKolmogorovProductWitness(obj);

    const domainFin = mkFin<Input>(["L", "R"], (a, b) => a === b);
    const domainWitness = buildMarkovComonoidWitness(domainFin, { label: "inputs" });
    const bitFin = mkFin([0, 1], (a, b) => a === b);
    const bitWitness = buildMarkovComonoidWitness(bitFin, { label: "bit" });

    const bit0 = (input: Input) => (input === "L" ? 0 : 1);
    const bit1 = (input: Input) => (input === "L" ? 1 : 0);
    const noisy = fromMatrix(domainFin, bitFin, [
      [0.5, 0.5],
      [0, 1],
    ]);

    const components = [
      { index: 0, arrow: noisy, witness: bitWitness, base: bit0, label: "noisy" },
      { index: 1, arrow: detK(domainFin, bitFin, bit1), witness: bitWitness, base: bit1, label: "second" },
    ];

    const extend = family.extend!;
    const candidateBase = (input: Input) =>
      extend(
        indices,
        new Map<number, number>([
          [0, bit0(input)],
          [1, bit1(input)],
        ])
      );

    const result = checkDeterministicProductUniversalProperty(
      witness,
      { base: candidateBase, label: "placeholder" },
      indices,
      {
        domain: domainWitness,
        components,
        samples: domainWitness.object.elems,
      }
    );

    expect(result.ok).toBe(false);
    expect(result.components.find((entry) => entry.index === 0)?.ok).toBe(false);
    expect(result.factorization.ok).toBe(false);
    expect(result.factorization.failures.some((failure) => failure.index === 0)).toBe(true);
  });

  it("detects mediator mismatches and uniqueness conflicts", () => {
    type Input = "L" | "R";
    const indices = [0, 1];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
      positivity: { kind: "positive", indices },
    });
    const obj = createInfObj(family);
    const witness = obj.deterministicWitness?.() ?? buildDeterministicKolmogorovProductWitness(obj);

    const domainFin = mkFin<Input>(["L", "R"], (a, b) => a === b);
    const domainWitness = buildMarkovComonoidWitness(domainFin, { label: "inputs" });
    const bitFin = mkFin([0, 1], (a, b) => a === b);
    const bitWitness = buildMarkovComonoidWitness(bitFin, { label: "bit" });

    const bit0 = (input: Input) => (input === "L" ? 0 : 1);
    const bit1 = (input: Input) => (input === "L" ? 1 : 0);

    const components = [
      { index: 0, arrow: detK(domainFin, bitFin, bit0), witness: bitWitness, base: bit0, label: "first" },
      { index: 1, arrow: detK(domainFin, bitFin, bit1), witness: bitWitness, base: bit1, label: "second" },
    ];

    const mediator = witness.factor<Input>(components.map(({ index, base }) => ({ index, base })));
    expect(mediator.ok).toBe(true);
    if (!mediator.ok || !mediator.base) {
      throw new Error("Expected deterministic mediator");
    }

    const extend = family.extend!;
    const mismatchingBase = (input: Input) =>
      extend(
        indices,
        new Map<number, number>([
          [0, bit0(input)],
          [1, 0],
        ])
      );

    const result = checkDeterministicProductUniversalProperty(
      witness,
      { base: mismatchingBase, label: "mismatch" },
      indices,
      {
        domain: domainWitness,
        components,
        samples: domainWitness.object.elems,
        alternate: { base: mediator.base, label: "reference" },
      }
    );

    expect(result.ok).toBe(false);
    expect(result.mediatorAgreement).toBe(false);
    expect(result.mismatches.length).toBeGreaterThan(0);
    expect(result.uniqueness?.ok).toBe(false);
    expect(result.uniqueness?.mismatches.length).toBeGreaterThan(0);
  });

  it("supports partitions and tensor Kolmogorov products", () => {
    type Input = "L" | "R";
    const indices = [0, 1, 2];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
      positivity: { kind: "positive", indices },
    });
    const obj = createInfObj(family);
    const witness = obj.deterministicWitness?.() ?? buildDeterministicKolmogorovProductWitness(obj);

    const domainFin = mkFin<Input>(["L", "R"], (a, b) => a === b);
    const domainWitness = buildMarkovComonoidWitness(domainFin, { label: "inputs" });
    const bitFin = mkFin([0, 1], (a, b) => a === b);
    const bitWitness = buildMarkovComonoidWitness(bitFin, { label: "bit" });

    const bit0 = (input: Input) => (input === "L" ? 0 : 1);
    const bit1 = (input: Input) => (input === "L" ? 1 : 0);
    const bit2 = (input: Input) => (input === "L" ? 1 : 1);

    const components = [
      { index: 0, arrow: detK(domainFin, bitFin, bit0), witness: bitWitness, base: bit0, label: "first" },
      { index: 1, arrow: detK(domainFin, bitFin, bit1), witness: bitWitness, base: bit1, label: "second" },
      { index: 2, arrow: detK(domainFin, bitFin, bit2), witness: bitWitness, base: bit2, label: "third" },
    ];

    const mediator = witness.factor<Input>(components.map(({ index, base }) => ({ index, base })));
    expect(mediator.ok).toBe(true);
    if (!mediator.ok || !mediator.base) {
      throw new Error("Expected deterministic mediator");
    }

    const partitionResult = checkDeterministicProductUniversalProperty(
      witness,
      { base: mediator.base, label: "partition mediator" },
      indices,
      {
        domain: domainWitness,
        components,
        samples: domainWitness.object.elems,
        partitions: [[0, 1], [2]],
      }
    );

    expect(partitionResult.ok).toBe(true);
    expect(partitionResult.partitions?.every((report) => report.ok)).toBe(true);

    const left = independentInfObj(
      Prob,
      [0],
      () => bernoulli(0.5),
      { measurability: discreteWitness([0]), positivity: { kind: "positive", indices: [0] } }
    );
    const right = independentInfObj(
      Prob,
      [0, 1],
      () => bernoulli(0.5),
      { measurability: discreteWitness([0, 1]), positivity: { kind: "positive", indices: [0, 1] } }
    );
    const tensor = tensorKolmogorovProducts(left, right);
    const tensorWitness = tensor.infObj.deterministicWitness?.() ?? buildDeterministicKolmogorovProductWitness(tensor.infObj);

    const tensorIndices = [tensor.toLeft(0), tensor.toRight(0), tensor.toRight(1)] as const;

    const leftBit = (input: Input) => (input === "L" ? 0 : 1);
    const rightBit0 = (input: Input) => (input === "L" ? 1 : 0);
    const rightBit1 = (input: Input) => (input === "L" ? 0 : 1);

    const tensorComponents = [
      { index: tensor.toLeft(0), arrow: detK(domainFin, bitFin, leftBit), witness: bitWitness, base: leftBit, label: "left" },
      { index: tensor.toRight(0), arrow: detK(domainFin, bitFin, rightBit0), witness: bitWitness, base: rightBit0, label: "right0" },
      { index: tensor.toRight(1), arrow: detK(domainFin, bitFin, rightBit1), witness: bitWitness, base: rightBit1, label: "right1" },
    ];

    const leftWitness = left.deterministicWitness?.() ?? buildDeterministicKolmogorovProductWitness(left);
    const rightWitness = right.deterministicWitness?.() ?? buildDeterministicKolmogorovProductWitness(right);

    const leftMediator = leftWitness.factor<Input>([
      { index: 0, base: leftBit },
    ]);
    const rightMediator = rightWitness.factor<Input>([
      { index: 0, base: rightBit0 },
      { index: 1, base: rightBit1 },
    ]);

    if (!leftMediator.ok || !leftMediator.base || !rightMediator.ok || !rightMediator.base) {
      throw new Error("Expected component mediators for tensor factors");
    }

    const leftBase = leftMediator.base;
    const rightBase = rightMediator.base;
    type LeftCarrier = ReturnType<typeof leftBase>;
    type RightCarrier = ReturnType<typeof rightBase>;

    const tensorCandidateBase = (input: Input): TensorCarrier<LeftCarrier, RightCarrier> => [
      leftBase(input),
      rightBase(input),
    ];

    const tensorResult = checkDeterministicProductUniversalProperty(
      tensorWitness,
      { base: tensorCandidateBase, label: "tensor mediator" },
      tensorIndices,
      {
        domain: domainWitness,
        components: tensorComponents,
        samples: domainWitness.object.elems,
        partitions: [[tensor.toLeft(0)], [tensor.toRight(0), tensor.toRight(1)]],
      }
    );

    expect(tensorResult.ok).toBe(true);
    expect(tensorResult.mediatorAgreement).toBe(true);
    expect(tensorResult.components.every((entry) => entry.ok)).toBe(true);
  });

  it("restricts projective families to subsets", () => {
    const indices = [0, 1, 2, 3];
    const family = independentIndexedProduct(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const subset = [0, 2];
    const restricted = restrictProjectiveFamily(family, subset);

    expect(Array.from(restricted.index)).toEqual(subset);
    expect(restricted.countability?.sample).toEqual([0, 2]);
    expect(restricted.measurability?.coordinates?.length).toBe(2);

    const originalMarginal = family.marginal(subset);
    const restrictedMarginal = restricted.marginal(subset);
    expect(equalDist(Prob, originalMarginal, restrictedMarginal)).toBe(true);

    const restrictedObj = restrictInfObj(createInfObj(family), subset);
    const sample: ProjectiveLimitSection<number, number> = (index) => (subset.includes(index) ? 1 : 0);
    const projection = restrictedObj.projectKernel(subset)(sample);
    const [section] = expectSingleEntry(projection.w, "restricted projection");
    expect(section.get(0)).toBe(1);
    expect(section.get(2)).toBe(1);
  });

  it("reconstructs double-indexed independent products", () => {
    type Outer = "A" | "B";
    type Inner = 0 | 1;

    const outer: Outer[] = ["A", "B"];
    const inner = (index: Outer): ReadonlyArray<Inner> => (index === "A" ? [0, 1] : [0, 1]);
    const coordinate = (index: Outer, sub: Inner) =>
      index === "A" ? bernoulli(sub === 0 ? 0.2 : 0.8) : bernoulli(sub === 0 ? 0.6 : 0.4);

    const result = independentDoubleIndexedProduct(Prob, outer, inner, coordinate);
    const { family, toIndex, innerFamilies } = result;

    const subset: Array<DoubleIndex<Outer, Inner>> = [toIndex("A", 0), toIndex("B", 1)];
    const direct = family.marginal(subset);

    const combine = () => {
      type Entry = { section: Map<DoubleIndex<Outer, Inner>, number>; weight: number };
      let acc: Entry[] = [{ section: new Map(), weight: 1 }];

      for (const outerKey of outer) {
        const marginal = innerFamilies.get(outerKey)!.marginal(
          subset.filter((entry) => entry.outer === outerKey).map((entry) => entry.inner)
        );
        const next: Entry[] = [];
        marginal.w.forEach((weight, section) => {
          for (const entry of acc) {
            const combined = new Map(entry.section);
            section.forEach((value, innerIndex) => {
              combined.set(toIndex(outerKey, innerIndex), value);
            });
            next.push({ section: combined, weight: entry.weight * weight });
          }
        });
        acc = next;
      }

      const expected: Dist<number, CylinderSection<DoubleIndex<Outer, Inner>, number>> = { R: Prob, w: new Map() };
      for (const entry of acc) {
        expected.w.set(new Map(entry.section), entry.weight);
      }
      return expected;
    };

    const expected = combine();
    expect(equalDist(Prob, direct, expected)).toBe(true);

    const nested = new Map<Outer, CylinderSection<Inner, number>>([
      ["A", new Map<Inner, number>([[0, 1]])],
      ["B", new Map<Inner, number>([[1, 0]])],
    ]);
    const flattened = flattenNestedCylinder(nested, toIndex);
    expect(flattened.get(toIndex("A", 0))).toBe(1);
    expect(flattened.get(toIndex("B", 1))).toBe(0);
  });

  it("tensors Kolmogorov products via double-index flattening", () => {
    const leftIndices = [0, 1];
    const rightIndices = [0, 1];

    const leftObj = createInfObj(
      independentIndexedProduct(Prob, leftIndices, () => bernoulli(0.5), {
        measurability: discreteWitness(leftIndices),
        positivity: { kind: "positive", indices: leftIndices },
      }),
    );
    const rightObj = createInfObj(
      independentIndexedProduct(Prob, rightIndices, () => bernoulli(0.25), {
        measurability: discreteWitness(rightIndices),
        positivity: { kind: "positive", indices: rightIndices },
      }),
    );

    const tensor = tensorKolmogorovProducts(leftObj, rightObj);
    const leftIndex0 = tensor.toLeft(0);
    const rightIndex0 = tensor.toRight(0);

    const subsets: Array<ReadonlyArray<TensorIndex<number, number>>> = [
      [leftIndex0],
      [rightIndex0],
      [leftIndex0, rightIndex0],
    ];

    const samples: Array<TensorCarrier<ProjectiveLimitSection<number, number>, ProjectiveLimitSection<number, number>>> = [
      [
        (i) => (i === 0 ? 0 : 1),
        (i) => (i === 0 ? 1 : 0),
      ],
      [
        (i) => (i === 0 ? 1 : 0),
        (i) => (i === 0 ? 0 : 1),
      ],
    ];

    const result = checkKolmogorovProduct(tensor.infObj, subsets, samples);
    expect(result.ok).toBe(true);
    expect(result.deterministic).toBe(true);
    expect(result.copyDiscard.ok).toBe(true);
    expect(tensor.family.countability?.kind).toBe("finite");
    expect(tensor.family.measurability?.kind).toBe("standardBorel");
    expect(tensor.infObj.positivity?.kind ?? tensor.family.positivity?.kind).toBe("positive");
  });

  it("detects tail invariance violations", () => {
    const indices = Array.from({ length: 6 }, (_, i) => i);
    const obj = independentInfObj(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const delta = dirac(Prob);

    const constantZero: ProjectiveLimitSection<number, number> = () => 0;
    const singleOne: ProjectiveLimitSection<number, number> = (i) => (i === 0 ? 1 : 0);

    const tailEvent: KernelR<number, ProjectiveLimitSection<number, number>, boolean> = (section) =>
      booleanDelta(section(5) === 0);

    const patches = [new Map<number, number>([[0, 1]]), new Map<number, number>([[5, 1]])];
    const invariance = checkTailEventInvariance(obj, tailEvent, [constantZero, singleOne], patches);
    expect(invariance.ok).toBe(false);
    expect(invariance.counterexamples.length).toBeGreaterThan(0);
    expect(invariance.countable).toBe(true);
    expect(invariance.witness?.kind).toBeDefined();
    expect(invariance.measurable).toBe(true);
    expect(invariance.standardBorel).toBe(true);
  });

  it("produces Kolmogorov zero-one witnesses", () => {
    const indices = Array.from({ length: 4 }, (_, i) => i);
    const obj = independentInfObj(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const delta = dirac(Prob);

    const constantZero: ProjectiveLimitSection<number, number> = () => 0;
    const measure = makeMeasure([[constantZero, 1]]);

    const tailEvent: KernelR<number, ProjectiveLimitSection<number, number>, boolean> = (section) =>
      booleanDelta(section(3) === 0);
    const witness = kolmogorovZeroOneWitness(obj, measure, tailEvent);
    expect(witness.ok).toBe(true);
    expect(witness.probability).toBeCloseTo(1);
    expect(witness.countable).toBe(true);
    expect(witness.witness?.kind).toBeDefined();
    expect(witness.measurable).toBe(true);
    expect(witness.standardBorel).toBe(true);
  });

  it("certifies independence between tail events and finite marginals", () => {
    const indices = Array.from({ length: 5 }, (_, i) => i);
    const obj = independentInfObj(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const extension = kolmogorovExtensionMeasure(obj.family, [[0], [1], [2], [3], [4]]);
    if (!extension.ok) {
      throw new Error(`Kolmogorov extension failed: ${extension.reason}`);
    }

    const delta = dirac(Prob);
    const tailEvent: KernelR<number, ProjectiveLimitSection<number, number>, boolean> = (section) =>
      booleanDelta(section(4) === 0);
    const subsets: Array<FiniteSubset<number>> = [[0], [0, 1], [2, 3]];

    const report = checkTailSigmaIndependence(obj, extension.measure, tailEvent, subsets);
    expect(report.ok).toBe(true);
    expect(report.countable).toBe(true);
    expect(report.measurable).toBe(true);
    expect(report.standardBorel).toBe(true);
    report.subsets.forEach((subsetReport) => {
      expect(subsetReport.errors.length).toBe(0);
      subsetReport.sections.forEach((section) => expect(section.ok).toBe(true));
    });
  });

  it("detects dependence when the event matches a finite marginal", () => {
    const indices = Array.from({ length: 5 }, (_, i) => i);
    const obj = independentInfObj(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const extension = kolmogorovExtensionMeasure(obj.family, [[0], [1], [2]]);
    if (!extension.ok) {
      throw new Error(`Kolmogorov extension failed: ${extension.reason}`);
    }

    const delta = dirac(Prob);
    const headEvent: KernelR<number, ProjectiveLimitSection<number, number>, boolean> = (section) =>
      booleanDelta(section(0) === 0);
    const result = checkTailSigmaIndependence(obj, extension.measure, headEvent, [[0]]);
    expect(result.ok).toBe(false);
    expect(result.subsets[0]?.errors.length).toBe(0);
    const failing = result.subsets[0]?.sections.some((entry) => !entry.ok) ?? false;
    expect(failing).toBe(true);
  });

  it("verifies the abstract Kolmogorov zero-one law via witnesses", () => {
    const fixtures = buildZeroOneFixtures();

    const tailArrow = detK(fixtures.carrierFin, fixtures.boolFin, () => 1);
    const deterministicWitness = buildMarkovDeterministicWitness(fixtures.carrierWitness, fixtures.boolWitness, tailArrow, {
      label: "constant tail statistic",
    });

    const jointKernel = pair(fixtures.p.k, fixtures.p.then(tailArrow).k);
    const joint = new FinMarkov(
      fixtures.domainFin,
      tensorObj(fixtures.carrierFin, fixtures.boolFin),
      jointKernel,
    );
    const conditional = buildMarkovConditionalWitness(
      fixtures.domainWitness,
      [fixtures.carrierWitness, fixtures.boolWitness],
      joint,
      { label: "joint with constant tail" },
    );

    const lemma = {
      conditional,
      p: fixtures.p,
      deterministic: deterministicWitness,
      xIndex: 0,
      tIndex: 1,
      label: "constant tail lemma",
    };

    const measure = makeMeasure([
      [fixtures.constantZero, 0.5],
      [fixtures.constantOne, 0.5],
    ]);

    const tailEvent = asDeterministicKernel(Prob, () => true);

    const zeroOneWitness = {
      product: fixtures.productWitness,
      domain: fixtures.domainWitness,
      measure,
      tailEvent,
      determinismLemma: lemma,
      tailConditional: conditional,
    };

    const result = checkKolmogorovZeroOneLaw(zeroOneWitness, {
      subsets: [[0], [1, 2]],
      lemma: { tolerance: 1e-9 },
    });

    expect(result.ok).toBe(true);
    expect(result.zeroOne.ok).toBe(true);
    expect(result.tail.ok).toBe(true);
    expect(result.determinism?.holds).toBe(true);
    expect(result.tailConditional?.holds).toBe(true);
  });

  it("detects failures in the abstract Kolmogorov zero-one law hypotheses", () => {
    const fixtures = buildZeroOneFixtures();

    const tailArrow = detK(fixtures.carrierFin, fixtures.boolFin, (section) => (section(0) === 0 ? 1 : 0));
    const deterministicWitness = buildMarkovDeterministicWitness(fixtures.carrierWitness, fixtures.boolWitness, tailArrow, {
      label: "first coordinate statistic",
    });

    const jointKernel = pair(fixtures.p.k, fixtures.p.then(tailArrow).k);
    const joint = new FinMarkov(
      fixtures.domainFin,
      tensorObj(fixtures.carrierFin, fixtures.boolFin),
      jointKernel,
    );
    const conditional = buildMarkovConditionalWitness(
      fixtures.domainWitness,
      [fixtures.carrierWitness, fixtures.boolWitness],
      joint,
      { label: "joint with correlated tail" },
    );

    const lemma = {
      conditional,
      p: fixtures.p,
      deterministic: deterministicWitness,
      xIndex: 0,
      tIndex: 1,
      label: "correlated tail lemma",
    };

    const measure = makeMeasure([
      [fixtures.constantZero, 0.5],
      [fixtures.constantOne, 0.5],
    ]);

    const tailEvent = asDeterministicKernel(Prob, (section: ProjectiveLimitSection<number, number>) => section(0) === 0);

    const zeroOneWitness = {
      product: fixtures.productWitness,
      domain: fixtures.domainWitness,
      measure,
      tailEvent,
      determinismLemma: lemma,
      tailConditional: conditional,
    };

    const result = checkKolmogorovZeroOneLaw(zeroOneWitness, {
      subsets: [[0]],
      lemma: { tolerance: 1e-9 },
    });

    expect(result.ok).toBe(false);
    expect(result.zeroOne.ok).toBe(false);
    expect(result.tail.ok).toBe(false);
  });

  it("combines Kolmogorov and Hewitt–Savage zero-one diagnostics", () => {
    const fixtures = buildZeroOneFixtures();

    const tailArrow = detK(fixtures.carrierFin, fixtures.boolFin, () => 1);
    const deterministicWitness = buildMarkovDeterministicWitness(fixtures.carrierWitness, fixtures.boolWitness, tailArrow, {
      label: "constant tail statistic",
    });

    const jointKernel = pair(fixtures.p.k, fixtures.p.then(tailArrow).k);
    const joint = new FinMarkov(
      fixtures.domainFin,
      tensorObj(fixtures.carrierFin, fixtures.boolFin),
      jointKernel,
    );
    const conditional = buildMarkovConditionalWitness(
      fixtures.domainWitness,
      [fixtures.carrierWitness, fixtures.boolWitness],
      joint,
      { label: "joint with constant tail" },
    );

    const lemma = {
      conditional,
      p: fixtures.p,
      deterministic: deterministicWitness,
      xIndex: 0,
      tIndex: 1,
      label: "constant tail lemma",
    };

    const measure = makeMeasure([
      [fixtures.constantZero, 0.5],
      [fixtures.constantOne, 0.5],
    ]);

    const tailEvent = asDeterministicKernel(Prob, () => true);

    const swap01 = (section: ProjectiveLimitSection<number, number>) => section;

    const hewittWitness = {
      product: fixtures.productWitness,
      domain: fixtures.domainWitness,
      measure,
      tailEvent,
      determinismLemma: lemma,
      tailConditional: conditional,
      permutations: [swap01],
    };

    const result = checkHewittSavageZeroOneLaw(hewittWitness, {
      subsets: [[0], [1, 2]],
      lemma: { tolerance: 1e-9 },
    });

    expect(result.ok).toBe(true);
    expect(result.exchangeability.ok).toBe(true);
    expect(result.zeroOne.ok).toBe(true);
    expect(result.determinism?.holds).toBe(true);
  });

  it("flags zero-one failures", () => {
    const indices = Array.from({ length: 4 }, (_, i) => i);
    const obj = independentInfObj(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const delta = dirac(Prob);

    const constantZero: ProjectiveLimitSection<number, number> = () => 0;
    const constantOne: ProjectiveLimitSection<number, number> = () => 1;
    const measure = makeMeasure([
      [constantZero, 0.5],
      [constantOne, 0.5],
    ]);

    const headEvent: KernelR<number, ProjectiveLimitSection<number, number>, boolean> = (section) =>
      booleanDelta(section(0) === 0);
    const witness = kolmogorovZeroOneWitness(obj, measure, headEvent);
    expect(witness.ok).toBe(false);
    expect(witness.countable).toBe(true);
    expect(witness.measurable).toBe(true);
    expect(witness.standardBorel).toBe(true);
  });

  it("checks Hewitt–Savage zero-one witness and exchangeability", () => {
    const indices = Array.from({ length: 4 }, (_, i) => i);
    const obj = independentInfObj(Prob, indices, () => bernoulli(0.5), {
      measurability: discreteWitness(indices),
    });
    const delta = dirac(Prob);

    const constantZero: ProjectiveLimitSection<number, number> = () => 0;
    const constantOne: ProjectiveLimitSection<number, number> = () => 1;
    const measure = makeMeasure([
      [constantZero, 0.5],
      [constantOne, 0.5],
    ]);

    const swap01 = (section: ProjectiveLimitSection<number, number>) => {
      if (section === constantZero || section === constantOne) {
        return section;
      }
      return (index: number) => (index === 0 ? section(1) : index === 1 ? section(0) : section(index));
    };

    const tailEvent: KernelR<number, ProjectiveLimitSection<number, number>, boolean> = () => booleanDelta(true);
    const witness = hewittSavageZeroOneWitness(obj, measure, tailEvent, [swap01]);
    expect(witness.ok).toBe(true);
    expect(witness.exchangeable).toBe(true);
    expect(witness.invariant).toBe(true);
    expect(witness.probability).toBeCloseTo(1);
    expect(witness.countable).toBe(true);
    expect(witness.witness?.kind).toBeDefined();
    expect(witness.measurable).toBe(true);
    expect(witness.standardBorel).toBe(true);
  });

  it("spots the Example 3.7 obstruction for FinStoch families", () => {
    const infiniteIndices: Iterable<number> = {
      [Symbol.iterator]: function* () {
        let i = 0;
        while (true) {
          yield i;
          i += 1;
        }
      },
    };

    const analysis = analyzeFinStochInfiniteTensor(
      infiniteIndices,
      (index) => (index % 2 === 0 ? stringFin(["a", "b"]) : stringFin(["a"])),
      { sampleLimit: 64, threshold: 16 }
    );

    expect(analysis.status).toBe("likelyObstructed");
    expect(analysis.truncated).toBe(true);
    expect(analysis.emptyFactors.length).toBe(0);
    expect(analysis.multiValuedCount).toBeGreaterThanOrEqual(16);

    const finiteIndices = [0, 1, 2];
    const finiteAnalysis = analyzeFinStochInfiniteTensor(
      finiteIndices,
      (index) => (index === 0 ? stringFin(["a", "b"]) : stringFin(["a"])),
    );

    expect(finiteAnalysis.status).toBe("ok");
    expect(finiteAnalysis.exhausted).toBe(true);
    expect(finiteAnalysis.truncated).toBe(false);

    const emptyAnalysis = analyzeFinStochInfiniteTensor(
      [0, 1],
      (index) => (index === 0 ? stringFin([]) : stringFin(["a"])),
    );

    expect(emptyAnalysis.status).toBe("obstructed");
    expect(emptyAnalysis.emptyFactors.length).toBeGreaterThan(0);
  });
});
