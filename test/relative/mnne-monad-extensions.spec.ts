import { describe, expect, it } from "vitest";

import {
  analyzeMnneRelativeMonadLanExtension,
  describeBrokenLanExtensionWitness,
  describeIdentityLanExtensionWitness,
} from "../../relative/mnne-monad-extensions";

describe("MNNE Section 4.3 Lan extensions", () => {
  it("confirms the identity witness extends to an ordinary monad", () => {
    const witness = describeIdentityLanExtensionWitness();
    const report = analyzeMnneRelativeMonadLanExtension(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.checkedObjects).toBeGreaterThan(0);
    expect(report.extensionChecks).toBeGreaterThan(0);
  });

  it("detects a broken comparison component", () => {
    const witness = describeBrokenLanExtensionWitness();
    const report = analyzeMnneRelativeMonadLanExtension(witness);

    expect(report.holds).toBe(false);
    expect(
      report.issues.some((issue) =>
        issue.includes("Comparison components") || issue.includes("forward component"),
      ),
    ).toBe(true);
  });
});
