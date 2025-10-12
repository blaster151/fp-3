import { describe, expect, it } from "vitest";

import {
  analyzeMnneWellBehavedInclusion,
  describeBrokenWellBehavedWitness,
  describeIdentityWellBehavedWitness,
} from "../../relative/mnne-well-behaved";

describe("MNNE Definition 4.1 well-behaved inclusion diagnostics", () => {
  it("confirms the identity inclusion is fully faithful", () => {
    const witness = describeIdentityWellBehavedWitness();
    const report = analyzeMnneWellBehavedInclusion(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.checkedPairs).toBeGreaterThan(0);
  });

  it("detects when the inclusion fails to be injective on hom-sets", () => {
    const witness = describeBrokenWellBehavedWitness();
    const report = analyzeMnneWellBehavedInclusion(witness);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("not injective"))).toBe(true);
  });
});
