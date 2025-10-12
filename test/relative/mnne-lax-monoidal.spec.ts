import { describe, expect, it } from "vitest";

import {
  analyzeMnneLaxMonoidalStructure,
  analyzeMnneLaxMonoid,
  describeBrokenTwoObjectLaxMonoidalWitness,
  describeBrokenTwoObjectLaxMonoidWitness,
  describeTwoObjectLaxMonoidalWitness,
  describeTwoObjectLaxMonoidWitness,
} from "../../relative/mnne-lax-monoidal";

describe("MNNE Example 3 lax monoidal diagnostics", () => {
  it("confirms the two-object witness satisfies the lax monoidal laws", () => {
    const witness = describeTwoObjectLaxMonoidalWitness();
    const report = analyzeMnneLaxMonoidalStructure(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.functorCount).toBeGreaterThanOrEqual(3);
    expect(report.tripleCount).toBeGreaterThan(0);
  });

  it("flags a broken left unitor component", () => {
    const witness = describeBrokenTwoObjectLaxMonoidalWitness();
    const report = analyzeMnneLaxMonoidalStructure(witness);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Left unitor"))).toBe(true);
  });

  it("confirms the two-object lax monoid witness satisfies the monoid laws", () => {
    const witness = describeTwoObjectLaxMonoidWitness();
    const report = analyzeMnneLaxMonoid(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("detects a broken lax monoid multiplication", () => {
    const witness = describeBrokenTwoObjectLaxMonoidWitness();
    const report = analyzeMnneLaxMonoid(witness);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Left unit law"))).toBe(true);
  });
});
