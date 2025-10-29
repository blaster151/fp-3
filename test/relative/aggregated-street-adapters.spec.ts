import { describe, expect, it } from "vitest";
import {
  selectAggregatedStreetAdaptersFrom,
  type AggregatedStreetRollup,
} from "../../relative/generated/adt-polynomial-aggregated-street";

const makeAggregatedStreetRollup = (
  overrides: Partial<AggregatedStreetRollup>,
): AggregatedStreetRollup =>
  ({
    holds: true,
    pending: false,
    details: "Aggregated Street roll-ups are ready.",
    issues: [],
    registryPath: "relative/polynomial/street/rollup",
    artifacts: {},
    ...overrides,
  } as AggregatedStreetRollup);

describe("selectAggregatedStreetAdaptersFrom", () => {
  it("invokes the ready handler when Street roll-ups hold", () => {
    const aggregated = makeAggregatedStreetRollup({ holds: true, pending: false });
    const result = selectAggregatedStreetAdaptersFrom(aggregated, {
      onReady: (entry) => entry.details,
    });
    expect(result).toBe("Aggregated Street roll-ups are ready.");
  });

  it("invokes the pending handler when Street roll-ups are pending", () => {
    const aggregated = makeAggregatedStreetRollup({ pending: true });
    const result = selectAggregatedStreetAdaptersFrom(aggregated, {
      onReady: () => "ready", // fallback to satisfy signature
      onPending: (entry) => `pending: ${entry.details}`,
    });
    expect(result).toBe("pending: Aggregated Street roll-ups are ready.");
  });

  it("invokes the blocked handler when Street roll-ups fail", () => {
    const aggregated = makeAggregatedStreetRollup({ holds: false, pending: false });
    const result = selectAggregatedStreetAdaptersFrom(aggregated, {
      onReady: () => "ready", // fallback to satisfy signature
      onBlocked: (entry) => `blocked: ${entry.details}`,
    });
    expect(result).toBe("blocked: Aggregated Street roll-ups are ready.");
  });

  it("throws when the verdict lacks a corresponding handler", () => {
    const aggregated = makeAggregatedStreetRollup({ pending: true });
    expect(() =>
      selectAggregatedStreetAdaptersFrom(aggregated, {
        onReady: () => "ready",
      }),
    ).toThrow(/pending/);
  });
});
