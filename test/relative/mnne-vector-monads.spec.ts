import { describe, expect, it } from "vitest";

import {
  analyzeFiniteVectorRelativeMonad,
  analyzeFiniteVectorKleisliSplitting,
  analyzeFiniteVectorLeftKanExtension,
  canonicalBasisVector,
  canonicalExtendVector,
  describeBooleanVectorLeftKanExtensionWitness,
  describeBooleanVectorRelativeMonadWitness,
  type FiniteVectorRelativeMonadWitness,
  type FiniteVectorLeftKanExtensionWitness,
} from "../../relative/mnne-vector-monads";

describe("Finite vector relative monad Example 1", () => {
  it("verifies the Boolean semiring witness satisfies the relative monad laws", () => {
    const witness = describeBooleanVectorRelativeMonadWitness([0, 1, 2]);
    const report = analyzeFiniteVectorRelativeMonad(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.spaceSummary).toContainEqual({ dimension: 2, vectorCount: 4, arrowCount: 16 });
    expect(report.enumeration.indexSlice.truncated).toBe(false);
    expect(report.enumeration.indices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          index: 2,
          slice: expect.objectContaining({ truncated: false }),
        }),
      ]),
    );
  });

  it("detects a broken unit component", () => {
    const base = describeBooleanVectorRelativeMonadWitness([1, 2]);
    const faultyUnitWitness: FiniteVectorRelativeMonadWitness<boolean> = {
      ...base,
      customUnit: (semiring, dimension, index) =>
        index === 0
          ? Object.freeze(Array.from({ length: dimension }, () => semiring.zero))
          : canonicalBasisVector(semiring, dimension, index),
    };

    const report = analyzeFiniteVectorRelativeMonad(faultyUnitWitness);
    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Unit law failed"))).toBe(true);
  });

  it("flags an extension that forgets coefficients", () => {
    const base = describeBooleanVectorRelativeMonadWitness([1, 2]);
    const faultyExtendWitness: FiniteVectorRelativeMonadWitness<boolean> = {
      ...base,
      customExtend: (semiring, domain, codomain, arrow, vector) => {
        const canonical = canonicalExtendVector(semiring, domain, codomain, arrow, vector);
        return Object.freeze(Array.from({ length: canonical.length }, () => semiring.zero));
      },
    };

    const report = analyzeFiniteVectorRelativeMonad(faultyExtendWitness);
    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Extension compatibility failed"))).toBe(true);
  });

  it("confirms the Kleisli splitting for the Boolean witness", () => {
    const witness = describeBooleanVectorRelativeMonadWitness([0, 1, 2]);
    const report = analyzeFiniteVectorKleisliSplitting(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.identitySummaries.every((entry) => entry.valid)).toBe(true);
    expect(report.associativityChecks).toBeGreaterThan(0);
  });

  it("flags a Kleisli composition that ignores the second arrow", () => {
    const base = describeBooleanVectorRelativeMonadWitness([1, 2]);
    const faulty: FiniteVectorRelativeMonadWitness<boolean> = {
      ...base,
      customExtend: (semiring, domain, codomain, arrow, vector) => {
        if (codomain === domain) {
          return canonicalExtendVector(semiring, domain, codomain, arrow, vector);
        }
        // Project onto the first coordinate only, breaking associativity.
        const canonical = canonicalExtendVector(semiring, domain, codomain, arrow, vector);
        return Object.freeze(
          canonical.map((_, index) => (index === 0 ? canonical[index]! : semiring.zero)),
        );
      },
    };

    const report = analyzeFiniteVectorKleisliSplitting(faulty);
    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Associativity failed"))).toBe(true);
  });

  it("confirms the Boolean witness realises the left Kan extension for small sets", () => {
    const witness = describeBooleanVectorLeftKanExtensionWitness([0, 1, 2], 2);
    const report = analyzeFiniteVectorLeftKanExtension(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetSize: 2, vectorCount: 4 }),
      ]),
    );
  });

  it("detects when the dimension limit is too small for the Kan extension", () => {
    const witness: FiniteVectorLeftKanExtensionWitness<boolean> = {
      semiring: describeBooleanVectorLeftKanExtensionWitness().semiring,
      targetSizes: [2],
      dimensionLimit: 1,
    };

    const report = analyzeFiniteVectorLeftKanExtension(witness);
    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Left Kan extension failed to reach vector"))).toBe(true);
  });
});
