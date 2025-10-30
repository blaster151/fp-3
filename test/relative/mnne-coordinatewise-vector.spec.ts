import { describe, expect, it } from "vitest";

import {
  analyzeCoordinatewiseVectorRelativeMonad,
  describeCoordinatewiseBooleanVectorWitness,
  type CoordinatewiseVectorRelativeMonadWitness,
} from "../../relative/mnne-vector-monads";
import { createReplayableIterableFromArray } from "../../relative/mnne-infinite-support";

describe("coordinatewise vector relative monad analyzer", () => {
  it("accepts the Boolean semiring witness on ℕ", () => {
    const witness = describeCoordinatewiseBooleanVectorWitness();

    const report = analyzeCoordinatewiseVectorRelativeMonad(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.coordinateSlice.values.length).toBeGreaterThan(0);
    expect(report.unitSlices.length).toBeGreaterThan(0);
    expect(report.approximation.truncatedComparisons.length).toBeGreaterThan(0);
  });

  it("detects a broken unit witness", () => {
    const witness = describeCoordinatewiseBooleanVectorWitness();
    const broken: CoordinatewiseVectorRelativeMonadWitness<number, boolean> = {
      ...witness,
      unit: (coordinate) =>
        createReplayableIterableFromArray([], {
          description: `brokenη(${coordinate})`,
        }),
    };

    const report = analyzeCoordinatewiseVectorRelativeMonad(broken);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Unit law"))).toBe(true);
  });

  it("flags an arrow that forgets a coordinate in composition", () => {
    const witness = describeCoordinatewiseBooleanVectorWitness();
    const broken: CoordinatewiseVectorRelativeMonadWitness<number, boolean> = {
      ...witness,
      arrows: witness.arrows.map((arrow) =>
        arrow.label === "duplicate"
          ? {
              ...arrow,
              column: (coordinate) =>
                createReplayableIterableFromArray(
                  [
                    {
                      coordinate: coordinate + 1,
                      value: true,
                    },
                  ],
                  { description: `{${coordinate + 1}}` },
                ),
            }
          : arrow,
      ),
    };

    const report = analyzeCoordinatewiseVectorRelativeMonad(broken);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Associativity failed"))).toBe(true);
  });
});
