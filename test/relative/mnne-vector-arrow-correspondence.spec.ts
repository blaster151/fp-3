import { describe, expect, it } from "vitest";

import {
  analyzeFiniteVectorArrowCorrespondence,
  describeBooleanVectorArrowCorrespondenceWitness,
  describeBrokenBooleanVectorArrowCorrespondenceWitness,
  type FiniteVectorArrowCorrespondenceWitness,
} from "../../relative/mnne-vector-monads";

describe("Finite vector arrow/relative monad correspondence", () => {
  it("confirms the Boolean witness matches the canonical extension", () => {
    const witness = describeBooleanVectorArrowCorrespondenceWitness([0, 1, 2]);
    const report = analyzeFiniteVectorArrowCorrespondence(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.actionComparisons).toBeGreaterThan(0);
  });

  it("detects a mismatched arrow action", () => {
    const witness = describeBrokenBooleanVectorArrowCorrespondenceWitness([1, 2]);
    const report = analyzeFiniteVectorArrowCorrespondence(witness);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Arrow action mismatch"))).toBe(true);
  });

  it("flags an incorrect composition witness", () => {
    const canonical = describeBooleanVectorArrowCorrespondenceWitness([1, 2]);
    const faulty: FiniteVectorArrowCorrespondenceWitness<boolean> = {
      ...canonical,
      composeArrows: (_semiring, _domain, _middle, _codomain, left) => left,
    };

    const report = analyzeFiniteVectorArrowCorrespondence(faulty);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Arrow composition mismatch"))).toBe(true);
  });
});
