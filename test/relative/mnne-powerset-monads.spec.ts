import { describe, expect, it } from "vitest";

import {
  analyzePowersetRelativeMonad,
  describeCofinitePowersetWitness,
  type PowersetArrow,
} from "../../relative/mnne-powerset-monads";
import {
  createReplayableIterable,
  createReplayableIterableFromArray,
  type LazyReplayableIterable,
} from "../../relative/mnne-infinite-support";

const extractSingleton = <Element>(
  iterable: LazyReplayableIterable<Element>,
): Element | undefined => {
  const iterator = iterable.enumerate()[Symbol.iterator]();
  const first = iterator.next();
  return first.done ? undefined : first.value;
};

describe("powerset relative monad analyzer", () => {
  it("accepts the cofinite Example 8 witness", () => {
    const witness = describeCofinitePowersetWitness();

    const report = analyzePowersetRelativeMonad(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.baseSlice.values.length).toBeGreaterThan(0);
    expect(report.comparisons.every((comparison) => comparison.equal)).toBe(true);
    expect(report.approximation.baseLimit).toBe(12);
    expect(report.approximation.subsetLimit).toBe(12);
    expect(report.approximation.baseTruncated).toBe(true);
    expect(
      report.approximation.truncatedSubsets.map((subset) => subset.label),
    ).toEqual(expect.arrayContaining(["cofinite≥2", "even", "odd"]));
    expect(report.approximation.truncatedArrows.length).toBeGreaterThan(0);
  });

  it("detects a broken unit witness", () => {
    const witness = describeCofinitePowersetWitness();
    const broken: typeof witness = {
      ...witness,
      unit: () => createReplayableIterableFromArray([], { description: "∅" }),
    };

    const report = analyzePowersetRelativeMonad(broken);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Unit law"))).toBe(true);
    expect(
      report.comparisons.some(
        (comparison) => comparison.kind === "unit" && comparison.equal === false,
      ),
    ).toBe(true);
  });

  it("flags associative failures introduced by a custom extend", () => {
    const witness = describeCofinitePowersetWitness();

    const truncateExtend = <Element>(
      arrow: PowersetArrow<Element>,
      subset: LazyReplayableIterable<Element>,
    ): LazyReplayableIterable<Element> =>
      createReplayableIterable(() => ({
        [Symbol.iterator]: function* () {
          for (const element of subset.enumerate()) {
            const image = extractSingleton(arrow.map(element));
            if (image !== undefined) {
              yield image;
            }
          }
        },
      }), { description: `μ_trunc(${arrow.label})` });

    const broken: typeof witness = {
      ...witness,
      extend: truncateExtend,
    };

    const report = analyzePowersetRelativeMonad(broken);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("Associativity"))).toBe(true);
    expect(
      report.comparisons.some(
        (comparison) =>
          comparison.kind === "associativity" && comparison.equal === false,
      ),
    ).toBe(true);
  });
});
