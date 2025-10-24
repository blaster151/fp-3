import { describe, expect, it } from "vitest";

import { identityFunctorWithWitness } from "../functor";
import { collapseFunctorToPoint } from "../functor-collapse";
import { isConservativeFunctor } from "../functor-conservative";
import { TwoObjectCategory, nonIdentity } from "../two-object-cat";

describe("functor conservativity diagnostics", () => {
  it("confirms the identity functor is conservative", () => {
    const functor = identityFunctorWithWitness(TwoObjectCategory, {
      arrows: TwoObjectCategory.arrows,
      objects: TwoObjectCategory.objects,
    });
    const report = isConservativeFunctor(functor);
    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.details.join(" ")).toMatch(/Surveyed/);
  });

  it("detects collapse functors that fail to reflect isomorphisms", () => {
    const functor = collapseFunctorToPoint(TwoObjectCategory);
    const report = isConservativeFunctor(functor);
    expect(report.holds).toBe(false);
    expect(report.failures).not.toHaveLength(0);
    const [failure] = report.failures;
    expect(failure.reason).toMatch(/invertible/);
    expect(failure.arrow).toBe(nonIdentity);
  });
});

