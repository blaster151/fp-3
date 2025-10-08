import { describe, expect, it } from "vitest";

import {
  analyzeLambdaKleisliSplitting,
  analyzeUntypedLambdaRelativeMonad,
  describeBrokenUntypedLambdaRelativeMonadWitness,
  describeUntypedLambdaRelativeMonadWitness,
} from "../../relative/mnne-lambda-monads";

describe("mnne lambda relative monads", () => {
  it("accepts the canonical untyped lambda witness", () => {
    const witness = describeUntypedLambdaRelativeMonadWitness();
    const report = analyzeUntypedLambdaRelativeMonad(witness);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.contexts.length).toBeGreaterThan(0);
    expect(report.substitutions.length).toBeGreaterThan(0);
  });

  it("rejects a witness with a broken extension operator", () => {
    const witness = describeBrokenUntypedLambdaRelativeMonadWitness();
    const report = analyzeUntypedLambdaRelativeMonad(witness);

    expect(report.holds).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it("summarises the Kleisli splitting diagnostics", () => {
    const witness = describeUntypedLambdaRelativeMonadWitness();
    const report = analyzeLambdaKleisliSplitting(witness);

    expect(report.holds).toBe(true);
    expect(report.details).toContain("Kleisli identities");
  });

  it("propagates Kleisli failures from the base analyzer", () => {
    const witness = describeBrokenUntypedLambdaRelativeMonadWitness();
    const report = analyzeLambdaKleisliSplitting(witness);

    expect(report.holds).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
  });
});

