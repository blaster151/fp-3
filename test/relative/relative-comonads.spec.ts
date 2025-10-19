import { describe, expect, it } from "vitest";

import { TwoObjectCategory } from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  identityVerticalBoundary,
  type RepresentabilityWitness,
} from "../../virtual-equipment";
import {
  analyzeRelativeComonadCorepresentability,
  analyzeRelativeComonadFraming,
  analyzeRelativeComonadIdentityReduction,
  analyzeRelativeComonadCoopAlgebra,
  analyzeRelativeEnrichedComonad,
  analyzeRelativeComodule,
  describeRelativeComonadCoopAlgebraWitness,
  describeRelativeEnrichedComonadWitness,
  describeTrivialRelativeComonad,
  describeTrivialRelativeComoduleWitness,
  type RelativeComonadData,
} from "../../relative/relative-comonads";
import { RelativeComonadOracles } from "../../relative/relative-comonad-oracles";

const makeTrivialComonad = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const trivial = describeTrivialRelativeComonad(equipment, "•");
  return { equipment, trivial };
};

type RelativeParams = ReturnType<typeof makeTrivialComonad>["trivial"] extends RelativeComonadData<
  infer Obj,
  infer Arr,
  infer Payload,
  infer Evidence
>
  ? [Obj, Arr, Payload, Evidence]
  : never;

const obtainRightRepresentabilityWitness = (): RepresentabilityWitness<
  RelativeParams[0],
  RelativeParams[1]
> => {
  const { equipment, trivial } = makeTrivialComonad();
  const restriction = equipment.restrictions.right(
    trivial.looseCell,
    trivial.root.tight,
  );
  if (!restriction || !restriction.representability) {
    throw new Error("Expected identity restriction to produce a witness.");
  }
  return restriction.representability;
};

describe("Relative comonad analyzers", () => {
  it("accept the trivial relative comonad", () => {
    const { trivial } = makeTrivialComonad();
    const report = analyzeRelativeComonadFraming(trivial);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flag mismatched counit boundaries", () => {
    const { equipment, trivial } = makeTrivialComonad();
    const broken: RelativeComonadData<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...trivial,
      counit: {
        ...trivial.counit,
        boundaries: {
          ...trivial.counit.boundaries,
          right: identityVerticalBoundary(
            equipment,
            "★",
            "Incorrect right boundary for testing",
          ),
        },
      },
    };
    const report = analyzeRelativeComonadFraming(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).not.toHaveLength(0);
  });

  it("produce corepresentability diagnostics", () => {
    const { trivial } = makeTrivialComonad();
    const witness = obtainRightRepresentabilityWitness();
    const report = analyzeRelativeComonadCorepresentability(trivial, witness);
    expect(report.holds).toBe(true);
    expect(report.representability).toBe(witness);
  });

  it("reduce to ordinary comonads along the identity root", () => {
    const { equipment, trivial } = makeTrivialComonad();
    const report = analyzeRelativeComonadIdentityReduction(equipment, trivial);
    expect(report.holds).toBe(true);
  });

  it("certifies the trivial relative comodule", () => {
    const { trivial } = makeTrivialComonad();
    const witness = describeTrivialRelativeComoduleWitness(trivial);
    const report = analyzeRelativeComodule(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("detects a comodule boundary mismatch", () => {
    const { equipment, trivial } = makeTrivialComonad();
    const witness = describeTrivialRelativeComoduleWitness(trivial);
    const broken = {
      ...witness,
      coaction: {
        ...witness.coaction,
        boundaries: {
          ...witness.coaction.boundaries,
          right: identityVerticalBoundary(
            equipment,
            "★",
            "Comodule test boundary mismatch",
          ),
        },
      },
    };
    const report = analyzeRelativeComodule(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain("Comodule coaction right boundary must reuse the expected tight boundary.");
  });

  it("confirms the canonical enriched structure", () => {
    const { trivial } = makeTrivialComonad();
    const witness = describeRelativeEnrichedComonadWitness(trivial);
    const report = analyzeRelativeEnrichedComonad(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("detects an enriched counit mismatch", () => {
    const { trivial } = makeTrivialComonad();
    const witness = describeRelativeEnrichedComonadWitness(trivial);
    const broken = {
      ...witness,
      counitComparison: trivial.coextension,
    };
    const report = analyzeRelativeEnrichedComonad(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Enriched counit comparison must reuse the relative comonad counit witness.",
    );
  });

  it("certifies the default coopalgebra witness", () => {
    const { trivial } = makeTrivialComonad();
    const enriched = describeRelativeEnrichedComonadWitness(trivial);
    const witness = describeRelativeComonadCoopAlgebraWitness(enriched);
    const report = analyzeRelativeComonadCoopAlgebra(witness);
    expect(report.holds).toBe(true);
    expect(report.enrichment.holds).toBe(true);
  });

  it("flags a broken coopalgebra coassociativity diagram", () => {
    const { trivial } = makeTrivialComonad();
    const enriched = describeRelativeEnrichedComonadWitness(trivial);
    const witness = describeRelativeComonadCoopAlgebraWitness(enriched);
    const broken = {
      ...witness,
      diagrams: {
        ...witness.diagrams,
        coassociativity: {
          ...witness.diagrams.coassociativity,
          viaCoextension: trivial.counit,
        },
      },
    };
    const report = analyzeRelativeComonadCoopAlgebra(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain("Coop-algebra coassociativity diagram must commute.");
  });
});

describe("Relative comonad oracles", () => {
  it("report framing success for the trivial comonad", () => {
    const { trivial } = makeTrivialComonad();
    const framing = RelativeComonadOracles.counitFraming(trivial);
    expect(framing.holds).toBe(true);
    expect(framing.pending).toBe(false);
  });

  it("report corepresentability success when supplied with a witness", () => {
    const { trivial } = makeTrivialComonad();
    const witness = obtainRightRepresentabilityWitness();
    const report = analyzeRelativeComonadCorepresentability(trivial, witness);
    const oracle = RelativeComonadOracles.corepresentability(trivial, report);
    expect(oracle.holds).toBe(true);
    expect(oracle.pending).toBe(false);
  });

  it("publish the enriched structure oracle", () => {
    const { trivial } = makeTrivialComonad();
    const witness = describeRelativeEnrichedComonadWitness(trivial);
    const oracle = RelativeComonadOracles.enrichment(witness);
    expect(oracle.holds).toBe(true);
    expect(oracle.pending).toBe(false);
  });

  it("publish the coopalgebra oracle", () => {
    const { trivial } = makeTrivialComonad();
    const enriched = describeRelativeEnrichedComonadWitness(trivial);
    const witness = describeRelativeComonadCoopAlgebraWitness(enriched);
    const oracle = RelativeComonadOracles.coopAlgebra(witness);
    expect(oracle.holds).toBe(true);
    expect(oracle.pending).toBe(false);
  });
});
