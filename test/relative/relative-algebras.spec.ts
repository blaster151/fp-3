import { describe, expect, it } from "vitest";

import {
  TwoObjectCategory,
  type TwoObject,
  type TwoArrow,
} from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  type Tight,
  type TightCategory,
  type TightCellEvidence,
} from "../../virtual-equipment";
import {
  analyzeRelativeAlgebraFraming,
  analyzeRelativeAlgebraMorphismCompatibility,
  analyzeRelativeAlgebraCanonicalAction,
  analyzeRelativeEilenbergMooreUniversalProperty,
  analyzeRelativeKleisliUniversalProperty,
  analyzeRelativeOpalgebraFraming,
  analyzeRelativeOpalgebraMorphismCompatibility,
  analyzeRelativeOpalgebraCarrierTriangle,
  analyzeRelativeOpalgebraExtensionRectangle,
  analyzeRelativeOpalgebraCanonicalAction,
  analyzeRelativeOpalgebraExtraordinaryTransformation,
  analyzeRelativeOpalgebraRightAction,
  analyzeRelativeOpalgebraRightActionFromMonoid,
  analyzeRelativeOpalgebraRepresentableActionBridge,
  analyzeRelativeStreetActionCoherence,
  analyzeRelativeStreetActionData,
  analyzeRelativeStreetActionHomomorphism,
  analyzeRelativeStreetActionHomCategory,
  analyzeRelativeStreetCanonicalAction,
  analyzeRelativeStreetLooseAdjunctionAction,
  analyzeRelativeStreetLooseAdjunctionRightAction,
  analyzeRelativeStreetRepresentableRestriction,
  analyzeRelativeAlgebraStreetActionBridge,
  analyzeRelativeAlgebraStreetActionEquivalence,
  analyzeRelativeAlgebraResolutionFromAlgebraObject,
  analyzeRelativeStreetRepresentabilityUpgrade,
  analyzeRelativeAlgebraIdentityRootEquivalence,
  analyzeRelativeAlgebraGradedMorphisms,
  analyzeRelativeStreetRepresentableSubmulticategory,
  analyzeRelativeOpalgebraStreetActionEquivalence,
  analyzeRelativeAlgebraIndexedFamily,
  analyzeRelativeAlgebraRestrictionFunctor,
  analyzeRelativePartialRightAdjointFunctor,
  analyzeRelativeOpalgebraResolution,
  analyzeRelativePartialLeftAdjointSection,
  describeIdentityRelativeAlgebraMorphism,
  describeIdentityRelativeOpalgebraMorphism,
  describeTrivialRelativeEilenbergMoore,
  describeTrivialRelativeKleisli,
  describeRelativeOpalgebraDiagrams,
  describeRelativeAlgebraCanonicalAction,
  describeRelativeOpalgebraCanonicalAction,
  describeRelativeOpalgebraExtraordinaryTransformation,
  describeRelativeStreetAction,
  describeRelativeOpalgebraRightAction,
  describeRelativeStreetActionHomomorphism,
  describeRelativeStreetActionCategory,
  describeRelativeStreetCanonicalAction,
  describeRelativeStreetLooseAdjunctionAction,
  describeRelativeStreetLooseAdjunctionRightAction,
  describeRelativeStreetRepresentableRestriction,
  describeRelativeAlgebraStreetActionEquivalence,
  describeRelativeStreetRepresentabilityUpgrade,
  describeRelativeAlgebraIdentityRootWitness,
  describeRelativeAlgebraGradedMorphism,
  describeRelativeStreetRepresentableSubmulticategory,
  describeRelativeOpalgebraStreetActionEquivalence,
  describeRelativeAlgebraIndexedFamilyWitness,
  describeRelativeAlgebraRestrictionFunctorWitness,
  describeRelativeAlgebraResolutionWitness,
  describeRelativeOpalgebraResolutionWitness,
  describeRelativePartialLeftAdjointWitness,
  type RelativePartialRightAdjointWitness,
  type RelativeOpalgebraResolutionWitness,
  type RelativePartialLeftAdjointWitness,
  type RelativeEilenbergMoorePresentation,
} from "../../relative/relative-algebras";
import { describeTrivialRelativeMonad } from "../../relative/relative-monads";
import {
  enumerateRelativeAlgebraOracles,
  RelativeAlgebraOracles,
} from "../../relative/relative-algebra-oracles";

type RelativeObjects = TwoObject;
type RelativeArrows = TwoArrow;
type TightPayload = Tight<
  TightCategory<RelativeObjects, RelativeArrows>,
  TightCategory<RelativeObjects, RelativeArrows>
>;
type RelativeEvidence = TightCellEvidence<RelativeObjects, RelativeArrows>;
type RelativePartialRightAdjoint = RelativePartialRightAdjointWitness<
  RelativeObjects,
  RelativeArrows,
  TightPayload,
  RelativeEvidence
>;
type RelativeOpalgebraResolution = RelativeOpalgebraResolutionWitness<
  RelativeObjects,
  RelativeArrows,
  TightPayload,
  RelativeEvidence
>;
type RelativePartialLeftAdjoint = RelativePartialLeftAdjointWitness<
  RelativeObjects,
  RelativeArrows,
  TightPayload,
  RelativeEvidence
>;
type RelativeEilenbergMoore = RelativeEilenbergMoorePresentation<
  RelativeObjects,
  RelativeArrows,
  TightPayload,
  RelativeEvidence
>;

const makeTrivialPresentations = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const monad = describeTrivialRelativeMonad(equipment, "•");
  const kleisli = describeTrivialRelativeKleisli(monad);
  const em = describeTrivialRelativeEilenbergMoore(monad);
  const algebraPresentation = { monad, algebra: em.algebra } as const;
  const opalgebraPresentation = { monad, opalgebra: kleisli.opalgebra } as const;
  const opalgebraDiagrams = describeRelativeOpalgebraDiagrams(opalgebraPresentation);
  return {
    monad,
    kleisli,
    em,
    algebraPresentation,
    opalgebraPresentation,
    opalgebraDiagrams,
    algebraMorphism: describeIdentityRelativeAlgebraMorphism(algebraPresentation),
    opalgebraMorphism: describeIdentityRelativeOpalgebraMorphism(opalgebraPresentation),
  } as const;
};

describe("Relative algebra framing analyzer", () => {
  it("accepts the trivial algebra action", () => {
    const { em } = makeTrivialPresentations();
    const report = analyzeRelativeAlgebraFraming(em);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched root boundary", () => {
    const { em, monad } = makeTrivialPresentations();
    const broken = {
      ...em,
      algebra: {
        ...em.algebra,
        action: {
          ...em.algebra.action,
          boundaries: {
            ...em.algebra.action.boundaries,
            left: monad.carrier,
          },
        },
      },
    };
    const report = analyzeRelativeAlgebraFraming(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative algebra action left boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Relative algebra morphism analyzer", () => {
  it("records structural alignment and pending Street data", () => {
    const { algebraMorphism } = makeTrivialPresentations();
    const report = analyzeRelativeAlgebraMorphismCompatibility(algebraMorphism);
    expect(report.issues).toHaveLength(0);
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
  });

  it("flags mismatched carrier boundary", () => {
    const { algebraMorphism, monad } = makeTrivialPresentations();
    const broken = {
      ...algebraMorphism,
      morphism: {
        ...algebraMorphism.morphism,
        boundaries: {
          ...algebraMorphism.morphism.boundaries,
          right: monad.root,
        },
      },
    };
    const report = analyzeRelativeAlgebraMorphismCompatibility(broken);
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative algebra morphism right boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Relative Kleisli universal property analyzer", () => {
  it("accepts the trivial opalgebra", () => {
    const { kleisli } = makeTrivialPresentations();
    const report = analyzeRelativeKleisliUniversalProperty(kleisli);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags incorrect left boundary", () => {
    const { kleisli, monad } = makeTrivialPresentations();
    const broken = {
      ...kleisli,
      opalgebra: {
        ...kleisli.opalgebra,
        action: {
          ...kleisli.opalgebra.action,
          boundaries: {
            ...kleisli.opalgebra.action.boundaries,
            left: monad.carrier,
          },
        },
      },
    };
    const report = analyzeRelativeKleisliUniversalProperty(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative opalgebra action left boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Relative opalgebra framing analyzer", () => {
  it("accepts the trivial opalgebra action", () => {
    const { kleisli } = makeTrivialPresentations();
    const report = analyzeRelativeOpalgebraFraming(kleisli);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("detects mismatched monad carrier boundary", () => {
    const { kleisli, monad } = makeTrivialPresentations();
    const broken = {
      ...kleisli,
      opalgebra: {
        ...kleisli.opalgebra,
        action: {
          ...kleisli.opalgebra.action,
          boundaries: {
            ...kleisli.opalgebra.action.boundaries,
            right: monad.root,
          },
        },
      },
    };
    const report = analyzeRelativeOpalgebraFraming(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative opalgebra action right boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Relative opalgebra morphism analyzer", () => {
  it("reports structural alignment and pending Street witnesses", () => {
    const { opalgebraMorphism } = makeTrivialPresentations();
    const report = analyzeRelativeOpalgebraMorphismCompatibility(opalgebraMorphism);
    expect(report.issues).toHaveLength(0);
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
  });

  it("detects mismatched carrier boundary", () => {
    const { opalgebraMorphism, monad } = makeTrivialPresentations();
    const broken = {
      ...opalgebraMorphism,
      morphism: {
        ...opalgebraMorphism.morphism,
        boundaries: {
          ...opalgebraMorphism.morphism.boundaries,
          left: monad.root,
        },
      },
    };
    const report = analyzeRelativeOpalgebraMorphismCompatibility(broken);
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative opalgebra morphism left boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Relative algebra resolution analyzer", () => {
  it("threads the Section 5 resolution diagnostics", () => {
    const { monad, em } = makeTrivialPresentations();
    const witness = describeRelativeAlgebraResolutionWitness(monad, em);
    const report = analyzeRelativeAlgebraResolutionFromAlgebraObject(witness);
    expect(report.issues).toHaveLength(0);
    expect(report.resolutionReport.holds).toBe(true);
    expect(report.mediatingTightCellReport.issues).toHaveLength(0);
    expect(report.pending).toBe(true);
  });

  it("flags comparison monads that alter unit or extension witnesses", () => {
    const { monad, em } = makeTrivialPresentations();
    const baseWitness = describeRelativeAlgebraResolutionWitness(monad, em);
    const report = analyzeRelativeAlgebraResolutionFromAlgebraObject({
      ...baseWitness,
      comparisonMonad: {
        ...baseWitness.comparisonMonad,
        unit: { ...baseWitness.comparisonMonad.unit },
        extension: { ...baseWitness.comparisonMonad.extension },
      },
    });
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Comparison monad must reuse the relative monad unit witness.",
    );
    expect(report.issues).toContain(
      "Comparison monad must reuse the relative monad extension witness.",
    );
  });
});

describe("Street action data analyzer", () => {
  it("records structural alignment", () => {
    const { monad } = makeTrivialPresentations();
    const streetAction = describeRelativeStreetAction(monad);
    const report = analyzeRelativeStreetActionData(monad, streetAction);
    expect(report.pending).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched action boundary", () => {
    const { monad } = makeTrivialPresentations();
    const streetAction = describeRelativeStreetAction(monad);
    const broken = {
      ...streetAction,
      action: {
        ...streetAction.action,
        boundaries: {
          ...streetAction.action.boundaries,
          right: monad.root,
        },
      },
    };
    const report = analyzeRelativeStreetActionData(monad, broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Street action 2-cell right boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Street action coherence analyzer", () => {
  it("tracks coherence witnesses for the trivial action", () => {
    const { monad } = makeTrivialPresentations();
    const streetAction = describeRelativeStreetAction(monad);
    const report = analyzeRelativeStreetActionCoherence(monad, streetAction);
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.comparisons?.identity.holds).toBe(true);
    expect(report.witness.coherence.identity.comparison?.holds).toBe(true);
  });

  it("flags mismatched identity boundary", () => {
    const { monad } = makeTrivialPresentations();
    const streetAction = describeRelativeStreetAction(monad);
    const broken = {
      ...streetAction,
      identity: {
        ...streetAction.identity,
        boundaries: {
          ...streetAction.identity.boundaries,
          left: monad.carrier,
        },
      },
      coherence: {
        ...streetAction.coherence,
        identity: {
          ...streetAction.coherence.identity,
          redPasting: [[
            {
              ...streetAction.identity,
              boundaries: {
                ...streetAction.identity.boundaries,
                left: monad.carrier,
              },
            },
          ]] as const,
          greenPasting: [[
            {
              ...streetAction.identity,
              boundaries: {
                ...streetAction.identity.boundaries,
                left: monad.carrier,
              },
            },
          ]] as const,
        },
      },
    };
    const report = analyzeRelativeStreetActionCoherence(monad, broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Street action identity left boundary must reuse the specified tight boundary.",
    );
  });

  it("detects disagreeing Street action coherence composites", () => {
    const { monad } = makeTrivialPresentations();
    const streetAction = describeRelativeStreetAction(monad);
    const identityGreen =
      streetAction.coherence.identity.greenPasting[0]?.[0];
    if (!identityGreen) {
      throw new Error("Street action identity pasting must be available for the trivial witness.");
    }
    const mismatchedGreen = {
      ...identityGreen,
      target: {
        ...identityGreen.target,
        arrows: [] as typeof identityGreen.target.arrows,
      },
    };
    const disagreement = {
      ...streetAction,
      coherence: {
        ...streetAction.coherence,
        identity: {
          ...streetAction.coherence.identity,
          greenPasting: [[mismatchedGreen]] as const,
        },
      },
    };
    const report = analyzeRelativeStreetActionCoherence(monad, disagreement);
    expect(report.holds).toBe(false);
    expect(report.pending).toBe(false);
    expect(
      report.comparisons?.identity.issues.some((issue) =>
        issue.includes("Street action identity target frame arrow count mismatch"),
      ),
    ).toBe(true);
  });
});

describe("Street action homomorphism analyzer", () => {
  it("accepts the identity homomorphism", () => {
    const { monad } = makeTrivialPresentations();
    const action = describeRelativeStreetAction(monad);
    const witness = describeRelativeStreetActionHomomorphism(monad, action);
    const report = analyzeRelativeStreetActionHomomorphism(monad, witness);
    expect(report.holds).toBe(true);
    expect(report.pending).toBe(false);
    expect(report.issues).toHaveLength(0);
    expect(report.comparison?.holds).toBe(true);
  });

  it("detects mismatched comparison boundary", () => {
    const { monad } = makeTrivialPresentations();
    const action = describeRelativeStreetAction(monad);
    const witness = describeRelativeStreetActionHomomorphism(monad, action);
    const broken = {
      ...witness,
      morphism: {
        ...witness.morphism,
        boundaries: {
          ...witness.morphism.boundaries,
          right: monad.root,
        },
      },
    };
    const report = analyzeRelativeStreetActionHomomorphism(monad, broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Street action homomorphism right boundary must reuse the specified tight boundary.",
    );
    expect(report.holds).toBe(false);
  });

  it("detects unequal Street composites", () => {
    const { monad } = makeTrivialPresentations();
    const action = describeRelativeStreetAction(monad);
    const witness = describeRelativeStreetActionHomomorphism(monad, action);
    const mismatchedGreen = {
      ...witness.greenComposite,
      target: {
        ...witness.greenComposite.target,
        arrows: [] as typeof witness.greenComposite.target.arrows,
      },
    };
    const disagreement = {
      ...witness,
      greenComposite: mismatchedGreen,
    };
    const report = analyzeRelativeStreetActionHomomorphism(monad, disagreement);
    expect(report.holds).toBe(false);
    expect(report.pending).toBe(false);
    expect(
      report.issues.some((issue) =>
        issue.includes(
          "Street action homomorphism green composite must coincide with the recorded street action homomorphism green composite witness.",
        ),
      ),
    ).toBe(true);
  });
});

describe("Street action hom-category analyzer", () => {
  it("accepts default identity and composition", () => {
    const { monad } = makeTrivialPresentations();
    const action = describeRelativeStreetAction(monad);
    const witness = describeRelativeStreetActionCategory(monad, action);
    const report = analyzeRelativeStreetActionHomCategory(monad, witness);
    expect(report.holds).toBe(true);
    expect(report.pending).toBe(false);
    expect(report.issues).toHaveLength(0);
    expect(report.comparisons?.identity.holds).toBe(true);
    expect(report.comparisons?.composition.holds).toBe(true);
  });

  it("flags incorrect identity boundary", () => {
    const { monad } = makeTrivialPresentations();
    const action = describeRelativeStreetAction(monad);
    const witness = describeRelativeStreetActionCategory(monad, action);
    const broken = {
      ...witness,
      identity: {
        ...witness.identity,
        boundaries: {
          ...witness.identity.boundaries,
          left: monad.carrier,
        },
      },
    };
    const report = analyzeRelativeStreetActionHomCategory(monad, broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Street action hom-category identity left boundary must reuse the specified tight boundary.",
    );
    expect(report.holds).toBe(false);
  });

  it("detects non-matching identity composite", () => {
    const { monad } = makeTrivialPresentations();
    const action = describeRelativeStreetAction(monad);
    const witness = describeRelativeStreetActionCategory(monad, action);
    const mismatchedIdentity = {
      ...witness.identity,
      target: {
        ...witness.identity.target,
        arrows: [] as typeof witness.identity.target.arrows,
      },
    };
    const disagreement = {
      ...witness,
      identity: mismatchedIdentity,
    };
    const report = analyzeRelativeStreetActionHomCategory(monad, disagreement);
    expect(report.holds).toBe(false);
    expect(report.pending).toBe(false);
    expect(
      report.issues.some((issue) =>
        issue.includes(
          "Street action hom-category identity green composite must coincide with the recorded street action hom-category identity witness.",
        ),
      ),
    ).toBe(true);
  });
});

describe("Opalgebra Street action analyzers", () => {
  it("records the trivial opalgebra Street action", () => {
    const { opalgebraPresentation } = makeTrivialPresentations();
    const witness = describeRelativeOpalgebraRightAction(opalgebraPresentation);
    const report = analyzeRelativeOpalgebraRightAction(
      opalgebraPresentation,
      witness,
    );
    expect(report.pending).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched opalgebra action reuse", () => {
    const { opalgebraPresentation } = makeTrivialPresentations();
    const witness = describeRelativeOpalgebraRightAction(opalgebraPresentation);
    const broken = {
      ...witness,
      action: { ...witness.action },
    };
    const report = analyzeRelativeOpalgebraRightAction(
      opalgebraPresentation,
      broken,
    );
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Street action 2-cell must reuse the recorded relative opalgebra action.",
    );
  });
});

describe("Monoid-induced Street action analyzer", () => {
  it("records the canonical action", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetAction(monad);
    const report = analyzeRelativeOpalgebraRightActionFromMonoid(
      monad,
      witness,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags non-extension action", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetAction(monad);
    const broken = {
      ...witness,
      action: { ...witness.action },
    };
    const report = analyzeRelativeOpalgebraRightActionFromMonoid(monad, broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Monoid-induced Street action must reuse the relative monad extension 2-cell.",
    );
  });
});

describe("Canonical Street action analyzer", () => {
  it("records the canonical action", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetCanonicalAction(monad);
    const report = analyzeRelativeStreetCanonicalAction(monad, witness);
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags non-extension action reuse", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetCanonicalAction(monad);
    const broken = {
      ...witness,
      action: { ...witness.action },
    };
    const report = analyzeRelativeStreetCanonicalAction(monad, broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Canonical Street action must reuse the relative monad extension 2-cell.",
    );
  });
});

describe("Loose adjunction Street action analyzers", () => {
  it("records the loose adjunction action", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetLooseAdjunctionAction(
      monad,
      describeRelativeStreetAction(monad),
    );
    const report = analyzeRelativeStreetLooseAdjunctionAction(monad, witness);
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.actionReport.holds).toBe(true);
    expect(report.actionReport.pending).toBe(false);
  });

  it("detects incorrect unit boundary", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetLooseAdjunctionAction(
      monad,
      describeRelativeStreetAction(monad),
    );
    const broken = {
      ...witness,
      unit: {
        ...witness.unit,
        boundaries: {
          ...witness.unit.boundaries,
          right: monad.root,
        },
      },
    };
    const report = analyzeRelativeStreetLooseAdjunctionAction(monad, broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Loose adjunction unit right boundary must reuse the specified tight boundary.",
    );
  });

  it("records the loose adjunction right action", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetLooseAdjunctionRightAction(
      monad,
      describeRelativeStreetAction(monad),
    );
    const report = analyzeRelativeStreetLooseAdjunctionRightAction(
      monad,
      witness,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.actionReport.holds).toBe(true);
    expect(report.actionReport.pending).toBe(false);
  });

  it("flags loose adjunction right-action mismatches", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetLooseAdjunctionRightAction(
      monad,
      describeRelativeStreetAction(monad),
    );
    const broken = {
      ...witness,
      streetAction: {
        ...witness.streetAction,
        action: { ...witness.streetAction.action },
      },
    };
    const report = analyzeRelativeStreetLooseAdjunctionRightAction(
      monad,
      broken,
    );
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Loose adjunction Street right action must reuse the relative monad extension 2-cell.",
    );
  });
});

describe("Representable Street restriction analyzer", () => {
  it("records the default representable carrier", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetRepresentableRestriction(
      monad,
      describeRelativeStreetAction(monad),
    );
    const report = analyzeRelativeStreetRepresentableRestriction(monad, witness);
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.actionReport.holds).toBe(true);
    expect(report.actionReport.pending).toBe(false);
  });

  it("flags missing representable carrier", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetRepresentableRestriction(
      monad,
      describeRelativeStreetAction(monad),
    );
    const broken = {
      ...witness,
      representableCarriers: [],
    };
    const report = analyzeRelativeStreetRepresentableRestriction(monad, broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Representable Street restriction must mark the Street action carrier as representable.",
    );
  });
});

describe("Representable Street bridge analyzer", () => {
  it("confirms the trivial opalgebra induces a representable Street action", () => {
    const { opalgebraPresentation } = makeTrivialPresentations();
    const streetAction = describeRelativeOpalgebraRightAction(opalgebraPresentation);
    const restriction = describeRelativeStreetRepresentableRestriction(
      opalgebraPresentation.monad,
      streetAction,
    );
    const report = analyzeRelativeOpalgebraRepresentableActionBridge(
      opalgebraPresentation,
      restriction,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.comparison?.holds).toBe(true);
  });
});

describe("Relative algebra Street action bridge analyzer", () => {
  it("records the Street action induced by an algebra", () => {
    const { algebraPresentation } = makeTrivialPresentations();
    const streetAction = describeRelativeStreetAction(algebraPresentation.monad);
    const report = analyzeRelativeAlgebraStreetActionBridge(
      algebraPresentation,
      streetAction,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.actionReport.holds).toBe(true);
    expect(report.actionReport.pending).toBe(false);
  });

  it("flags mismatched Street action carrier", () => {
    const { algebraPresentation, monad } = makeTrivialPresentations();
    const streetAction = describeRelativeStreetAction(monad);
    const broken = {
      ...streetAction,
      carrier: monad.root,
    };
    const report = analyzeRelativeAlgebraStreetActionBridge(
      algebraPresentation,
      broken,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative algebra Street action carrier must reuse the specified tight boundary.",
    );
  });
});

describe("Relative algebra/Street action equivalence analyzer", () => {
  it("records mutually inverse identity witnesses", () => {
    const { algebraPresentation, monad } = makeTrivialPresentations();
    const streetAction = describeRelativeStreetAction(monad);
    const witness = describeRelativeAlgebraStreetActionEquivalence(
      algebraPresentation,
      streetAction,
    );
    const report = analyzeRelativeAlgebraStreetActionEquivalence(
      algebraPresentation,
      witness,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.bridge.pending).toBe(false);
    expect(report.recovery.pending).toBe(false);
    expect(report.bridge.actionReport.holds).toBe(true);
    expect(report.bridge.actionReport.pending).toBe(false);
    expect(report.recovery.actionReport.holds).toBe(true);
    expect(report.recovery.actionReport.pending).toBe(false);
  });

  it("detects Street action mismatches", () => {
    const { algebraPresentation, monad } = makeTrivialPresentations();
    const streetAction = describeRelativeStreetAction(monad);
    const witness = describeRelativeAlgebraStreetActionEquivalence(
      algebraPresentation,
      streetAction,
    );
    const broken = {
      ...witness,
      streetAction: {
        ...witness.streetAction,
        action: monad.unit,
      },
    };
    const report = analyzeRelativeAlgebraStreetActionEquivalence(
      algebraPresentation,
      broken,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative algebra Street action must reuse the algebra multiplication 2-cell.",
    );
  });
});

describe("Street representability upgrade analyzer", () => {
  it("records the canonical restriction data", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetRepresentabilityUpgrade(monad);
    const report = analyzeRelativeStreetRepresentabilityUpgrade(monad, witness);
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.actionReport.holds).toBe(true);
    expect(report.actionReport.pending).toBe(false);
    expect(report.representabilityReport.actionReport.holds).toBe(true);
    expect(report.representabilityReport.actionReport.pending).toBe(false);
  });

  it("flags mismatched Street action references", () => {
    const { monad } = makeTrivialPresentations();
    const witness = describeRelativeStreetRepresentabilityUpgrade(monad);
    const broken = {
      ...witness,
      representability: {
        ...witness.representability,
        streetAction: {
          ...witness.representability.streetAction,
          action: monad.unit,
        },
      },
    };
    const report = analyzeRelativeStreetRepresentabilityUpgrade(monad, broken);
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Street representability upgrade must reuse the recorded Street action witness.",
    );
  });
});

describe("Identity-root algebra equivalence analyzer", () => {
  it("records the trivial identity witness", () => {
    const { algebraPresentation } = makeTrivialPresentations();
    const witness = describeRelativeAlgebraIdentityRootWitness(algebraPresentation);
    const report = analyzeRelativeAlgebraIdentityRootEquivalence(
      algebraPresentation,
      witness,
    );
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched ordinary algebra carrier", () => {
    const { algebraPresentation, monad } = makeTrivialPresentations();
    const witness = describeRelativeAlgebraIdentityRootWitness(algebraPresentation);
    const broken = {
      ...witness,
      ordinaryCarrier: monad.carrier,
    };
    const report = analyzeRelativeAlgebraIdentityRootEquivalence(
      algebraPresentation,
      broken,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Ordinary algebra carrier boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Relative opalgebra diagram analyzers", () => {
  it("record witness data for the carrier triangle", () => {
    const { opalgebraPresentation, opalgebraDiagrams } = makeTrivialPresentations();
    const report = analyzeRelativeOpalgebraCarrierTriangle(
      opalgebraPresentation,
      opalgebraDiagrams.carrierTriangle,
    );
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
    expect(report.issues).toHaveLength(0);
    expect(report.witness).toBe(opalgebraDiagrams.carrierTriangle);
  });

  it("flags incorrect carrier triangle codomain", () => {
    const { opalgebraPresentation, opalgebraDiagrams, monad } = makeTrivialPresentations();
    const brokenWitness = {
      ...opalgebraDiagrams.carrierTriangle,
      codomain: monad.root,
    };
    const report = analyzeRelativeOpalgebraCarrierTriangle(
      opalgebraPresentation,
      brokenWitness,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative opalgebra carrier triangle codomain must match the opalgebra action target boundary.",
    );
  });

  it("records witness data for the extension rectangle", () => {
    const { opalgebraPresentation, opalgebraDiagrams } = makeTrivialPresentations();
    const report = analyzeRelativeOpalgebraExtensionRectangle(
      opalgebraPresentation,
      opalgebraDiagrams.extensionRectangle,
    );
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
    expect(report.issues).toHaveLength(0);
    expect(report.witness).toBe(opalgebraDiagrams.extensionRectangle);
  });

  it("detects incorrect extension reference", () => {
    const { opalgebraPresentation, opalgebraDiagrams, monad } = makeTrivialPresentations();
    const brokenWitness = {
      ...opalgebraDiagrams.extensionRectangle,
      extension: monad.unit,
    };
    const report = analyzeRelativeOpalgebraExtensionRectangle(
      opalgebraPresentation,
      brokenWitness,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative opalgebra extension rectangle must reuse the relative monad extension 2-cell.",
    );
  });
});

describe("Relative canonical algebra analyzer", () => {
  it("records the canonical relative algebra action", () => {
    const { monad } = makeTrivialPresentations();
    const canonical = describeRelativeAlgebraCanonicalAction(monad);
    const report = analyzeRelativeAlgebraCanonicalAction(canonical);
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
    expect(report.issues).toHaveLength(0);
  });

  it("flags incorrect canonical algebra action", () => {
    const { monad } = makeTrivialPresentations();
    const canonical = describeRelativeAlgebraCanonicalAction(monad);
    const broken = {
      ...canonical,
      algebra: {
        ...canonical.algebra,
        action: monad.unit,
      },
    };
    const report = analyzeRelativeAlgebraCanonicalAction(broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Relative canonical algebra action must reuse the monad extension 2-cell.",
    );
  });
});

describe("Relative canonical opalgebra analyzer", () => {
  it("records the canonical relative opalgebra action", () => {
    const { monad } = makeTrivialPresentations();
    const canonical = describeRelativeOpalgebraCanonicalAction(monad);
    const report = analyzeRelativeOpalgebraCanonicalAction(canonical);
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
    expect(report.issues).toHaveLength(0);
  });

  it("flags incorrect canonical opalgebra action", () => {
    const { monad } = makeTrivialPresentations();
    const canonical = describeRelativeOpalgebraCanonicalAction(monad);
    const broken = {
      ...canonical,
      opalgebra: {
        ...canonical.opalgebra,
        action: monad.extension,
      },
    };
    const report = analyzeRelativeOpalgebraCanonicalAction(broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Relative canonical opalgebra action must reuse the monad unit 2-cell.",
    );
  });
});

describe("Relative opalgebra extraordinary transformation analyzer", () => {
  it("records the loose monad witnesses", () => {
    const { opalgebraPresentation } = makeTrivialPresentations();
    const witness = describeRelativeOpalgebraExtraordinaryTransformation(
      opalgebraPresentation,
    );
    const report = analyzeRelativeOpalgebraExtraordinaryTransformation(
      opalgebraPresentation,
      witness,
    );
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
    expect(report.issues).toHaveLength(0);
    expect(report.looseMonoidReport.holds).toBe(true);
    expect(report.witness).toBe(witness);
  });

  it("detects mismatched action boundaries", () => {
    const { opalgebraPresentation } = makeTrivialPresentations();
    const witness = describeRelativeOpalgebraExtraordinaryTransformation(
      opalgebraPresentation,
    );
    const broken = {
      ...witness,
      action: {
        ...witness.action,
        boundaries: {
          ...witness.action.boundaries,
          left: opalgebraPresentation.monad.carrier,
        },
      },
    };
    const report = analyzeRelativeOpalgebraExtraordinaryTransformation(
      opalgebraPresentation,
      broken,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Extraordinary transformation action left boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Relative Eilenberg–Moore universal property analyzer", () => {
  it("accepts the trivial algebra", () => {
    const { em } = makeTrivialPresentations();
    const report = analyzeRelativeEilenbergMooreUniversalProperty(em);
    expect(report.holds).toBe(true);
    expect(report.pending).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.restrictionReport?.issues).toHaveLength(0);
    expect(report.mediatingTightCellReport?.issues).toHaveLength(0);
    expect(report.sectionReport?.issues).toHaveLength(0);
    expect(report.gradedExtensionReport?.issues).toHaveLength(0);
    expect(report.witness).toBe(em.universalWitness);
  });

  it("flags incorrect right boundary", () => {
    const { em, monad } = makeTrivialPresentations();
    const broken = {
      ...em,
      algebra: {
        ...em.algebra,
        action: {
          ...em.algebra.action,
          boundaries: {
            ...em.algebra.action.boundaries,
            right: monad.root,
          },
        },
      },
    };
    const report = analyzeRelativeEilenbergMooreUniversalProperty(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative algebra action right boundary must reuse the specified tight boundary.",
    );
  });

  it("detects a section that targets the wrong algebra", () => {
    const { em, kleisli } = makeTrivialPresentations();
    const broken = {
      ...em,
      universalWitness: {
        ...em.universalWitness!,
        mediatingTightCell: {
          ...em.universalWitness!.mediatingTightCell,
          target: kleisli, // wrong presentation
        },
      },
    } as unknown as RelativeEilenbergMoore;
    const report = analyzeRelativeEilenbergMooreUniversalProperty(broken);
    expect(report.holds).toBe(false);
    expect(report.mediatingTightCellReport?.issues).toContain(
      "Mediating tight cell target must coincide with the recorded algebra presentation.",
    );
    expect(report.issues).toContain(
      "Relative Eilenberg–Moore section witness must target the recorded algebra presentation.",
    );
  });

  it("rejects a section that fails to reuse the comparison left leg", () => {
    const { em } = makeTrivialPresentations();
    const broken = {
      ...em,
      universalWitness: {
        ...em.universalWitness!,
        section: {
          ...em.universalWitness!.section,
          objectSection: em.universalWitness!.section.adjunction.right,
        },
      },
    };
    const report = analyzeRelativeEilenbergMooreUniversalProperty(broken);
    expect(report.holds).toBe(false);
    expect(report.sectionReport?.issues).toContain(
      "Right-adjoint section must reproduce the adjunction's left leg on objects.",
    );
    expect(report.issues).toContain(
      "Relative Eilenberg–Moore right-adjoint section must reuse the presentation's comparison left leg.",
    );
  });

  it("flags mismatched graded factorisation composites", () => {
    const { em } = makeTrivialPresentations();
    const broken = {
      ...em,
      universalWitness: {
        ...em.universalWitness!,
        gradedExtension: {
          ...em.universalWitness!.gradedExtension,
          greenComposite: em.monad.unit,
        },
      },
    };
    const report = analyzeRelativeEilenbergMooreUniversalProperty(broken);
    expect(report.holds).toBe(false);
    expect(report.gradedExtensionReport?.issues).toContain(
      "Graded extension green composite left boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Partial right adjoint functor analyzer", () => {
  it("accepts the trivial partial right adjoint", () => {
    const { em, monad } = makeTrivialPresentations();
    const witness: RelativePartialRightAdjoint = {
      presentation: em,
      section: em.universalWitness!.section,
      comparison: {
        tight: monad.root.tight,
        domain: monad.root.from,
        codomain: monad.carrier.to,
      },
      fixedObjects: [monad.root],
    };
    const report = analyzeRelativePartialRightAdjointFunctor(witness);
    expect(report.holds).toBe(true);
    expect(report.pending).toBe(false);
    expect(report.issues).toHaveLength(0);
    expect(report.sectionReport.issues).toHaveLength(0);
  });

  it("flags partial right adjoints that move j-objects", () => {
    const { em, monad } = makeTrivialPresentations();
    const witness: RelativePartialRightAdjoint = {
      presentation: em,
      section: em.universalWitness!.section,
      comparison: {
        tight: monad.root.tight,
        domain: monad.root.from,
        codomain: monad.carrier.to,
      },
      fixedObjects: [monad.carrier],
    };
    const report = analyzeRelativePartialRightAdjointFunctor(witness);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Partial right adjoint should fix each j-object; witness 0 deviates from the relative monad root.",
    );
  });
});

describe("Relative opalgebra resolution analyzer", () => {
  it("threads the canonical Lemma 6.47 witness", () => {
    const { opalgebraPresentation } = makeTrivialPresentations();
    const witness = describeRelativeOpalgebraResolutionWitness(
      opalgebraPresentation,
    );
    const report = analyzeRelativeOpalgebraResolution(witness);
    expect(report.pending).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.kappaReport.holds).toBe(true);
  });

  it("flags κ_t identities that break the triangles", () => {
    const { opalgebraPresentation } = makeTrivialPresentations();
    const base = describeRelativeOpalgebraResolutionWitness(opalgebraPresentation);
    const broken: RelativeOpalgebraResolution = {
      ...base,
      kappaWitness: {
        ...base.kappaWitness,
        rightIdentity: base.kappaWitness.leftIdentity,
      },
    };
    const report = analyzeRelativeOpalgebraResolution(broken);
    expect(report.kappaReport.issues).toContain(
      "κ_t right triangle composite must coincide with the supplied identity witness.",
    );
  });
});

describe("Partial left adjoint section analyzer", () => {
  it("records the canonical section as pending", () => {
    const { opalgebraPresentation } = makeTrivialPresentations();
    const witness = describeRelativePartialLeftAdjointWitness(
      opalgebraPresentation,
    );
    const report = analyzeRelativePartialLeftAdjointSection(witness);
    expect(report.pending).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.resolutionReport.pending).toBe(true);
  });

  it("detects a non-identity transpose", () => {
    const { opalgebraPresentation } = makeTrivialPresentations();
    const witness = describeRelativePartialLeftAdjointWitness(
      opalgebraPresentation,
    );
    const broken: RelativePartialLeftAdjoint = {
      ...witness,
      transposeIdentity: witness.opalgebraResolution.kappaWitness.rightIdentity,
    };
    const report = analyzeRelativePartialLeftAdjointSection(broken);
    expect(report.issues).toContain(
      "Partial left adjoint transpose must match the supplied identity on j-objects from Theorem 6.49.",
    );
  });
});

describe("Relative algebra graded morphism analyzer", () => {
  it("records the identity graded morphism as pending", () => {
    const { algebraMorphism } = makeTrivialPresentations();
    const witness = describeRelativeAlgebraGradedMorphism(algebraMorphism);
    const report = analyzeRelativeAlgebraGradedMorphisms(algebraMorphism, witness);
    expect(report.pending).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("detects mismatched graded composite boundaries", () => {
    const { algebraMorphism, monad } = makeTrivialPresentations();
    const witness = {
      ...describeRelativeAlgebraGradedMorphism(algebraMorphism),
      redComposite: {
        ...algebraMorphism.morphism,
        boundaries: {
          ...algebraMorphism.morphism.boundaries,
          left: monad.root,
        },
      },
    };
    const report = analyzeRelativeAlgebraGradedMorphisms(algebraMorphism, witness);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Graded morphism red composite left boundary must reuse the supplied algebra morphism presentation.",
    );
  });
});

describe("Representable Street sub-multicategory analyzer", () => {
  it("accepts the canonical representable witness", () => {
    const { kleisli } = makeTrivialPresentations();
    const restriction = describeRelativeStreetRepresentableRestriction(kleisli.monad);
    const witness = describeRelativeStreetRepresentableSubmulticategory(
      kleisli.monad,
      restriction,
    );
    const report = analyzeRelativeStreetRepresentableSubmulticategory(
      kleisli.monad,
      witness,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.restrictionReport.actionReport.holds).toBe(true);
    expect(report.restrictionReport.actionReport.pending).toBe(false);
  });

  it("flags representable cells with mismatched boundaries", () => {
    const { kleisli, monad } = makeTrivialPresentations();
    const restriction = describeRelativeStreetRepresentableRestriction(monad);
    const witness = {
      ...describeRelativeStreetRepresentableSubmulticategory(monad, restriction),
      representableCells: [
        {
          ...restriction.streetAction.action,
          boundaries: {
            ...restriction.streetAction.action.boundaries,
            right: monad.root,
          },
        },
      ],
    };
    const report = analyzeRelativeStreetRepresentableSubmulticategory(
      kleisli.monad,
      witness,
    );
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Representable Street cell #1 right boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Representable Street/opalgebra equivalence analyzer", () => {
  it("records the canonical witnesses as successful", () => {
    const { kleisli } = makeTrivialPresentations();
    const witness = describeRelativeOpalgebraStreetActionEquivalence(kleisli);
    const report = analyzeRelativeOpalgebraStreetActionEquivalence(
      kleisli,
      witness,
    );
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.bridge.actionReport.holds).toBe(true);
    expect(report.bridge.actionReport.pending).toBe(false);
  });

  it("detects carrier mismatches", () => {
    const { kleisli, monad } = makeTrivialPresentations();
    const witness = {
      ...describeRelativeOpalgebraStreetActionEquivalence(kleisli),
      recoveredOpalgebra: {
        ...kleisli.opalgebra,
        carrier: monad.root,
      },
    };
    const report = analyzeRelativeOpalgebraStreetActionEquivalence(
      kleisli,
      witness,
    );
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Recovered opalgebra carrier must reuse the recorded algebra carrier.",
    );
  });
});

describe("Restriction functor analyzer", () => {
  it("records the canonical restriction data as pending", () => {
    const { em } = makeTrivialPresentations();
    const witness = describeRelativeAlgebraRestrictionFunctorWitness(em);
    const report = analyzeRelativeAlgebraRestrictionFunctor(em, witness);
    expect(report.pending).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("detects carrier mismatches", () => {
    const { em, monad } = makeTrivialPresentations();
    const baseWitness = describeRelativeAlgebraRestrictionFunctorWitness(em);
    const broken = {
      ...baseWitness,
      streetAction: {
        ...baseWitness.streetAction,
        carrier: monad.root,
      },
    };
    const report = analyzeRelativeAlgebraRestrictionFunctor(em, broken);
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Restriction functor Street action carrier must reuse the recorded relative algebra carrier.",
    );
  });
});

describe("Indexed family analyzer", () => {
  it("accepts the trivial indexed family", () => {
    const { em } = makeTrivialPresentations();
    const witness = describeRelativeAlgebraIndexedFamilyWitness(em.monad, em);
    const report = analyzeRelativeAlgebraIndexedFamily(witness);
    expect(report.pending).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags missing fibre presentations", () => {
    const { monad } = makeTrivialPresentations();
    const report = analyzeRelativeAlgebraIndexedFamily({
      monad,
      fibres: [],
      restrictionMorphisms: [],
    });
    expect(report.pending).toBe(false);
    expect(report.issues).toContain(
      "Indexed family witness must include at least one fibre presentation.",
    );
  });
});

describe("Relative algebra oracles", () => {
  it("summarises Kleisli and Eilenberg–Moore reports", () => {
    const { kleisli, em, algebraMorphism, opalgebraMorphism, opalgebraDiagrams } =
      makeTrivialPresentations();
    const framingOracle = RelativeAlgebraOracles.algebraFraming(em);
    expect(framingOracle.pending).toBe(false);
    expect(framingOracle.holds).toBe(true);
    const morphismOracle = RelativeAlgebraOracles.algebraMorphismCompatibility(algebraMorphism);
    expect(morphismOracle.pending).toBe(true);
    expect(morphismOracle.holds).toBe(false);
    const opalgebraOracle = RelativeAlgebraOracles.opalgebraFraming(kleisli);
    expect(opalgebraOracle.pending).toBe(false);
    expect(opalgebraOracle.holds).toBe(true);
    const opalgebraMorphismOracle = RelativeAlgebraOracles.opalgebraMorphismCompatibility(
      opalgebraMorphism,
    );
    expect(opalgebraMorphismOracle.pending).toBe(true);
    expect(opalgebraMorphismOracle.holds).toBe(false);
    const triangleOracle = RelativeAlgebraOracles.opalgebraCarrierTriangle(
      kleisli,
      opalgebraDiagrams.carrierTriangle,
    );
    expect(triangleOracle.pending).toBe(true);
    expect(triangleOracle.witness).toBe(opalgebraDiagrams.carrierTriangle);
    const rectangleOracle = RelativeAlgebraOracles.opalgebraExtensionRectangle(
      kleisli,
      opalgebraDiagrams.extensionRectangle,
    );
    expect(rectangleOracle.pending).toBe(true);
    expect(rectangleOracle.witness).toBe(opalgebraDiagrams.extensionRectangle);
    const kleisliOracle = RelativeAlgebraOracles.kleisliUniversalProperty(kleisli);
    expect(kleisliOracle.pending).toBe(false);
    expect(kleisliOracle.holds).toBe(true);
    const emOracle = RelativeAlgebraOracles.eilenbergMooreUniversalProperty(em);
    expect(emOracle.pending).toBe(false);
    expect(emOracle.holds).toBe(true);
  });

  it("enumerates the oracle catalogue", () => {
    const { kleisli, em } = makeTrivialPresentations();
    const results = enumerateRelativeAlgebraOracles(kleisli, em);
    expect(results.length).toBeGreaterThan(30);

    const algebraFraming = results.find(
      (result) => result.registryPath === "relativeMonad.algebra.framing",
    );
    expect(algebraFraming?.pending).toBe(false);
    expect(algebraFraming?.holds).toBe(true);

    const algebraMorphism = results.find(
      (result) =>
        result.registryPath ===
        "relativeMonad.algebra.morphismCompatibility",
    );
    expect(algebraMorphism?.pending).toBe(true);

    const opalgebraFraming = results.find(
      (result) => result.registryPath === "relativeMonad.opalgebra.framing",
    );
    expect(opalgebraFraming?.pending).toBe(false);

    const gradedAlternate = results.find(
      (result) =>
        result.registryPath ===
        "relativeMonad.algebra.gradedMorphismsAlternate",
    );
    expect(gradedAlternate?.pending).toBe(true);

    const opalgebraCanonical = results.find(
      (result) => result.registryPath === "relativeMonad.opalgebra.canonicalAction",
    );
    expect(opalgebraCanonical?.pending).toBe(true);
    expect(opalgebraCanonical?.issues).toHaveLength(0);

    const algebraCanonical = results.find(
      (result) => result.registryPath === "relativeMonad.algebra.canonicalAction",
    );
    expect(algebraCanonical?.pending).toBe(true);
    expect(algebraCanonical?.issues).toHaveLength(0);

    const algebraBridge = results.find(
      (result) =>
        result.registryPath === "relativeMonad.actions.relativeAlgebraBridge",
    );
    expect(algebraBridge?.pending).toBe(true);
    expect(algebraBridge?.issues).toHaveLength(0);

    const algebraEquivalence = results.find(
      (result) =>
        result.registryPath === "relativeMonad.actions.algebraActionIsomorphism",
    );
    expect(algebraEquivalence?.pending).toBe(true);
    expect(algebraEquivalence?.issues).toHaveLength(0);

    const representabilityUpgrade = results.find(
      (result) =>
        result.registryPath === "relativeMonad.actions.representabilityUpgrade",
    );
    expect(representabilityUpgrade?.pending).toBe(true);
    expect(representabilityUpgrade?.issues).toHaveLength(0);

    const representableAction = results.find(
      (result) =>
        result.registryPath ===
        "relativeMonad.actions.representableActionIsomorphism",
    );
    expect(representableAction?.pending).toBe(true);
    expect(representableAction?.issues).toHaveLength(0);

    const identityRoot = results.find(
      (result) =>
        result.registryPath === "relativeMonad.algebra.identityRootEquivalence",
    );
    expect(identityRoot?.pending).toBe(true);
    expect(identityRoot?.issues).toHaveLength(0);

    const restrictionFunctor = results.find(
      (result) =>
        result.registryPath === "relativeMonad.algebra.restrictionFunctor",
    );
    expect(restrictionFunctor?.pending).toBe(true);
    expect(restrictionFunctor?.issues).toHaveLength(0);

    const mediatingCell = results.find(
      (result) =>
        result.registryPath ===
        "relativeMonad.algebra.mediatingTightCell",
    );
    expect(mediatingCell?.pending).toBe(true);

    const extraordinary = results.find(
      (result) =>
        result.registryPath ===
        "relativeMonad.opalgebra.extraordinaryTransformations",
    );
    expect(extraordinary?.pending).toBe(true);
    expect((extraordinary?.analysis as { holds: boolean })?.holds).toBe(true);
  });
});
