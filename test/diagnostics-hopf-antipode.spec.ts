import { describe, expect, it } from "vitest"
import { describeHopfAntipodePropertySamplingFailure, summarizeHopfAntipodePropertySampling } from "../diagnostics"
import type {
  HopfAntipodePropertySampleFailure,
  HopfAntipodePropertySamplingReport,
} from "../operations/coalgebra/coalgebra-interfaces"

describe("Hopf antipode property sampling diagnostics", () => {
  const failure: HopfAntipodePropertySampleFailure<string> = {
    sample: "x",
    sampleDescription: "x",
    left: {
      actual: "S(x)",
      expected: "x",
      actualDescription: "S(x)",
      expectedDescription: "x",
    },
  }

  it("describes individual property sampling failures", () => {
    const description = describeHopfAntipodePropertySamplingFailure(failure)
    expect(description).toBe("Sample x failed. Left mismatch: actual = S(x), expected = x")
  })

  it("summarizes aggregated sampling reports", () => {
    const report: HopfAntipodePropertySamplingReport<string> = {
      holds: false,
      samples: ["x", "y"],
      samplesTested: 2,
      successCount: 1,
      failureCount: 1,
      leftFailureCount: 1,
      rightFailureCount: 0,
      failures: [failure],
      metadata: ["basis elements"],
    }

    const summary = summarizeHopfAntipodePropertySampling(report)
    expect(summary).toBe(
      [
        "Hopf antipode property sampling: 1 of 2 samples failed (left failures: 1, right failures: 0).",
        "Successful samples: 1.",
        "Metadata: basis elements",
        "- Sample x failed. Left mismatch: actual = S(x), expected = x",
      ].join("\n"),
    )
  })
})
