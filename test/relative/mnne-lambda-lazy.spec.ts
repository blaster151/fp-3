import { describe, expect, it } from "vitest";

import {
  analyzeLazyLambdaKleisliSplitting,
  analyzeLazyLambdaRelativeMonad,
  describeBrokenUntypedLambdaRelativeMonadWitness,
  describeCountableLambdaRelativeMonadWitness,
  type LambdaContextConfiguration,
  type LazyLambdaRelativeMonadWitness,
} from "../../relative/mnne-lambda-monads";
import { createReplayableIterableFromArray } from "../../relative/mnne-infinite-support";

describe("lazy lambda relative monad analyzer", () => {
  it("materialises countable contexts and substitutions", () => {
    const witness = describeCountableLambdaRelativeMonadWitness();

    const report = analyzeLazyLambdaRelativeMonad(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.approximation.contextSlice.values.length).toBeGreaterThan(0);
    expect(report.approximation.substitutionSlice.values.length).toBeGreaterThan(0);
  });

  it("detects when enumeration limits are too small", () => {
    const emptyContexts = createReplayableIterableFromArray<LambdaContextConfiguration>(
      [],
      { description: "empty" },
    );
    const witness: LazyLambdaRelativeMonadWitness = {
      ...describeCountableLambdaRelativeMonadWitness(),
      contexts: emptyContexts,
    };

    const report = analyzeLazyLambdaRelativeMonad(witness);

    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("No contexts"))).toBe(true);
  });

  it("propagates failures from the strict analyzer", () => {
    const base = describeCountableLambdaRelativeMonadWitness();
    const broken: LazyLambdaRelativeMonadWitness = {
      ...base,
      customExtend: describeBrokenUntypedLambdaRelativeMonadWitness().customExtend,
    };

    const report = analyzeLazyLambdaRelativeMonad(broken);

    expect(report.holds).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it("summarises Kleisli diagnostics for the lazy witness", () => {
    const witness = describeCountableLambdaRelativeMonadWitness();

    const report = analyzeLazyLambdaKleisliSplitting(witness);

    expect(report.holds).toBe(true);
    expect(report.approximation.contextSlice.values.length).toBeGreaterThan(0);
  });

  it("reports Kleisli failures discovered after materialisation", () => {
    const base = describeCountableLambdaRelativeMonadWitness();
    const broken: LazyLambdaRelativeMonadWitness = {
      ...base,
      customExtend: describeBrokenUntypedLambdaRelativeMonadWitness().customExtend,
    };

    const report = analyzeLazyLambdaKleisliSplitting(broken);

    expect(report.holds).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
  });
});
