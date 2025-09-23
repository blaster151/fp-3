import { describe, expect, it } from "vitest";

import {
  buildCRingPlusCausalityScenario,
  checkCRingPlusCausalityCounterexample,
  composeHom,
  equalHom,
  polynomialMonomial,
  polynomialFormat,
} from "../../cring-plus";

import type { Polynomial } from "../../cring-plus";

const formatPoly = (poly: Polynomial) => polynomialFormat(poly);

describe("CRing_⊕ causality counterexample", () => {
  it("counterexample oracle reports equality after observation and inequality before", () => {
    const analysis = checkCRingPlusCausalityCounterexample();
    expect(analysis.holds).toBe(true);
    expect(analysis.equalAfterObservation).toBe(true);
    expect(analysis.equalBeforeObservation).toBe(false);
    expect(analysis.witness).toBeDefined();
    expect(analysis.details).toContain("premise but violate");
  });

  it("morphisms preserve additive/unit structure", () => {
    const analysis = checkCRingPlusCausalityCounterexample();
    expect(analysis.homChecks.observe.holds).toBe(true);
    expect(analysis.homChecks.future.holds).toBe(true);
    expect(analysis.homChecks.pastCanonical.holds).toBe(true);
    expect(analysis.homChecks.pastIdentity.holds).toBe(true);
  });

  it("witness highlights difference on the t monomial", () => {
    const scenario = buildCRingPlusCausalityScenario();
    const futureAfterCanonical = composeHom(scenario.future, scenario.pastCanonical);
    const futureAfterIdentity = composeHom(scenario.future, scenario.pastIdentity);
    const observedCanonical = composeHom(scenario.observe, futureAfterCanonical);
    const observedIdentity = composeHom(scenario.observe, futureAfterIdentity);

    const monomialT = polynomialMonomial(1);
    const shiftedCanonical = futureAfterCanonical.map(monomialT);
    const shiftedIdentity = futureAfterIdentity.map(monomialT);

    expect(equalHom(observedCanonical, observedIdentity)).toBe(true);
    expect(equalHom(futureAfterCanonical, futureAfterIdentity)).toBe(false);
    expect(formatPoly(shiftedCanonical)).toBe("1");
    expect(formatPoly(shiftedIdentity)).toBe("1 + 1·t");
    expect(formatPoly(monomialT)).toBe("1·t");
  });
});
