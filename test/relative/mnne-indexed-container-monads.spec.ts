import { describe, expect, it } from "vitest";

import {
  analyzeIndexedContainerRelativeMonad,
  describeIndexedContainerExample4Witness,
} from "../../relative/mnne-indexed-container-monads";

describe("MNNE Example 4 indexed container relative monad", () => {
  it("verifies the canonical witness", () => {
    const witness = describeIndexedContainerExample4Witness();
    const report = analyzeIndexedContainerRelativeMonad(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.summaries.length).toBeGreaterThan(0);
  });

  it("detects an inconsistent extractor", () => {
    const witness = describeIndexedContainerExample4Witness();
    const tampered = {
      ...witness,
      extractValue: () => "not-present",
    };
    const report = analyzeIndexedContainerRelativeMonad(tampered);
    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("not available"))).toBe(true);
  });
});

