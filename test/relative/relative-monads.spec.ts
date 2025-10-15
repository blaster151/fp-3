import { describe, expect, it } from "vitest";

import { TwoObjectCategory, type TwoArrow, type TwoObject } from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  identityProarrow,
  identityVerticalBoundary,
  type LooseMonoidData,
} from "../../virtual-equipment";
import {
  analyzeRelativeMonadFraming,
  analyzeRelativeMonadIdentityReduction,
  analyzeRelativeMonadRepresentability,
  analyzeRelativeMonadResolution,
  analyzeRelativeMonadSkewMonoidBridge,
  analyzeRelativeEnrichedEilenbergMooreAlgebra,
  analyzeRelativeEnrichedKleisliInclusion,
  analyzeRelativeEnrichedMonad,
  analyzeRelativeEnrichedVCatMonad,
  analyzeRelativeEnrichedYoneda,
  analyzeRelativeEnrichedYonedaDistributor,
  analyzeRelativeSetEnrichedMonad,
  describeTrivialRelativeMonad,
  fromMonad,
  relativeMonadFromAdjunction,
  relativeMonadFromEquipment,
  toMonadIfIdentity,
  describeRelativeEnrichedMonadWitness,
  describeRelativeEnrichedEilenbergMooreAlgebraWitness,
  describeRelativeEnrichedKleisliInclusionWitness,
  describeRelativeEnrichedVCatMonadWitness,
  describeRelativeEnrichedYonedaWitness,
  describeRelativeEnrichedYonedaDistributorWitness,
  describeRelativeSetEnrichedMonadWitness,
  type RelativeMonadData,
  type RelativeMonadSkewMonoidBridgeInput,
  type RelativeEnrichedEilenbergMooreAlgebraWitness,
  type RelativeEnrichedKleisliInclusionWitness,
  type RelativeEnrichedMonadWitness,
  type RelativeEnrichedVCatMonadWitness,
  type RelativeEnrichedYonedaWitness,
  type RelativeSetEnrichedMonadWitness,
} from "../../relative/relative-monads";
import { describeTrivialRelativeAdjunction } from "../../relative/relative-adjunctions";
import {
  RelativeMonadOracles,
  enumerateRelativeMonadOracles,
} from "../../relative/relative-oracles";
import { RelativeMonadLawRegistry } from "../../relative/relative-laws";
import { checkRelativeMonadLaws } from "../../algebra-oracles";
import { CatMonad, composeFun, idFun } from "../../allTS";

const makeTrivialData = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const trivial = describeTrivialRelativeMonad(equipment, "•");
  return { equipment, trivial };
};

const obtainRepresentabilityWitness = () => {
  const { equipment, trivial } = makeTrivialData();
  const restriction = equipment.restrictions.left(
    trivial.root.tight,
    trivial.looseCell,
  );
  if (restriction?.representability === undefined) {
    throw new Error(
      "Expected the identity loose arrow to produce a representability witness.",
    );
  }
  return { equipment, trivial, witness: restriction.representability } as const;
};

const successAnalysis = (details: string) => ({
  holds: true as const,
  issues: [] as ReadonlyArray<string>,
  details,
});

type RelativeParams = ReturnType<typeof makeTrivialData>["trivial"] extends RelativeMonadData<
  infer Obj,
  infer Arr,
  infer Payload,
  infer Evidence
>
  ? [Obj, Arr, Payload, Evidence]
  : never;

const makeSkewMonoidBridgeInput = (): RelativeMonadSkewMonoidBridgeInput<
  RelativeParams[0],
  RelativeParams[1],
  RelativeParams[2],
  RelativeParams[3]
> => {
  const { trivial } = makeTrivialData();
  const { witness } = obtainRepresentabilityWitness();

  const monoid: LooseMonoidData<
    RelativeParams[0],
    RelativeParams[1],
    RelativeParams[2],
    RelativeParams[3]
  > = {
    object: trivial.looseCell.from,
    looseCell: trivial.looseCell,
    multiplication: trivial.extension,
    unit: trivial.unit,
  };

  return {
    relative: trivial,
    monoid,
    monoidShape: successAnalysis(
      "Identity loose monoid uses the relative monad's unit/extension data.",
    ),
    representability: analyzeRelativeMonadRepresentability(trivial, witness),
    leftExtensions: {
      existence: successAnalysis("Identity left extension exists by definition."),
      preservation: successAnalysis(
        "Identity extension functor preserves its own left extensions.",
      ),
      absolute: successAnalysis(
        "Identity left extension is j-absolute with trivial comparison cells.",
      ),
      density: successAnalysis("Identity tight 1-cell is dense via identity restrictions."),
      rightUnit: successAnalysis(
        "Right unit for the identity companion is invertible on the nose.",
      ),
    },
  };
};

const makeIdentityCatMonad = (): CatMonad<typeof TwoObjectCategory> => {
  const identityEndofunctor = {
    source: TwoObjectCategory,
    target: TwoObjectCategory,
    onObj: (object: TwoObject) => object,
    onMor: (arrow: TwoArrow) => arrow,
  };

  return {
    category: TwoObjectCategory,
    endofunctor: identityEndofunctor,
    unit: {
      source: idFun(TwoObjectCategory),
      target: identityEndofunctor,
      component: (object: TwoObject) => TwoObjectCategory.id(object),
    },
    mult: {
      source: composeFun(identityEndofunctor, identityEndofunctor),
      target: identityEndofunctor,
      component: (object: TwoObject) => TwoObjectCategory.id(object),
    },
  };
};

describe("Relative monad framing analyzer", () => {
  it("accepts the trivial j-relative monad", () => {
    const { trivial } = makeTrivialData();
    const report = analyzeRelativeMonadFraming(trivial);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched boundaries", () => {
    const { equipment, trivial } = makeTrivialData();
    const broken = {
      ...trivial,
      unit: {
        ...trivial.unit,
        boundaries: {
          ...trivial.unit.boundaries,
          right: identityVerticalBoundary(
            equipment,
            "★",
            "Intentionally wrong carrier boundary for testing.",
          ),
        },
      },
    };
    const report = analyzeRelativeMonadFraming(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Unit right boundary must equal the designated tight boundary.",
    );
  });
});

describe("relativeMonadFromEquipment", () => {
  it("constructs the trivial relative monad when restrictions succeed", () => {
    const { trivial } = makeTrivialData();
    const report = relativeMonadFromEquipment(trivial);
    expect(report.holds).toBe(true);
    expect(report.monad).toBe(trivial);
    expect(report.representability?.orientation).toBe("left");
    expect(report.leftRestriction).toBeDefined();
    expect(report.rightRestriction).toBeDefined();
    expect(report.looseMonoid.object).toBe(trivial.root.from);
    expect(report.looseMonoidReport.holds).toBe(true);
    expect(report.skewComposition?.holds).toBe(true);
  });

  it("flags missing restriction data", () => {
    const { trivial } = makeTrivialData();
    const sabotagedEquipment = {
      ...trivial.equipment,
      restrictions: {
        ...trivial.equipment.restrictions,
        left: (
          ..._args: Parameters<typeof trivial.equipment.restrictions.left>
        ) => undefined,
      },
    } as typeof trivial.equipment;

    const report = relativeMonadFromEquipment({
      ...trivial,
      equipment: sabotagedEquipment,
    });

    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Left restriction B(j,1) failed: equipment could not restrict the loose arrow along the root.",
    );
  });

  it("threads optional equipment analyzers when witnesses are supplied", () => {
    const { trivial } = makeTrivialData();
    const report = relativeMonadFromEquipment(trivial, {
      rightExtension: {
        loose: trivial.looseCell,
        along: trivial.root.tight,
        extension: trivial.looseCell,
        counit: trivial.unit,
      },
      rightLift: {
        loose: trivial.looseCell,
        along: trivial.root.tight,
        lift: trivial.looseCell,
        unit: trivial.unit,
      },
      density: {
        object: trivial.root.from,
        tight: trivial.root.tight,
      },
      fullyFaithful: {
        tight: trivial.root.tight,
        domain: trivial.root.from,
        codomain: trivial.root.to,
      },
    });

    expect(report.rightExtension?.holds).toBe(true);
    expect(report.rightLift?.holds).toBe(true);
    expect(report.density?.holds).toBe(true);
    expect(report.fullyFaithful?.holds).toBe(true);
  });
});

describe("relativeMonadFromAdjunction", () => {
  it("recovers the trivial relative monad from the identity adjunction", () => {
    const { equipment } = makeTrivialData();
    const adjunction = describeTrivialRelativeAdjunction(equipment, "•");
    const report = relativeMonadFromAdjunction(adjunction);
    expect(report.holds).toBe(true);
    expect(report.monad?.equipment).toBe(equipment);
    expect(report.adjunctionHomIsomorphism?.holds).toBe(true);
    expect(report.resolution?.holds).toBe(true);
  });

  it("records extraction issues when the hom-isomorphism lacks the expected loose arrow", () => {
    const { equipment } = makeTrivialData();
    const adjunction = describeTrivialRelativeAdjunction(equipment, "•");
    const broken = {
      ...adjunction,
      homIsomorphism: {
        ...adjunction.homIsomorphism,
        forward: {
          ...adjunction.homIsomorphism.forward,
          target: {
            ...adjunction.homIsomorphism.forward.target,
            arrows: [],
          },
        },
      },
    } as typeof adjunction;
    const report = relativeMonadFromAdjunction(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Hom-isomorphism target does not expose any loose arrows; defaulted to the identity on dom(j).",
    );
  });
});

describe("Relative enriched monad analyzer", () => {
  it("accepts the canonical enriched witness", () => {
    const { trivial } = makeTrivialData();
    const witness = describeRelativeEnrichedMonadWitness(trivial);
    const report = analyzeRelativeEnrichedMonad(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched enriched units", () => {
    const { trivial } = makeTrivialData();
    const witness: RelativeEnrichedMonadWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...describeRelativeEnrichedMonadWitness(trivial),
      unitComparison: trivial.extension,
    };
    const report = analyzeRelativeEnrichedMonad(witness);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Enriched unit comparison must reuse the relative monad unit witness.",
    );
  });
});

describe("Relative enriched Yoneda analyzer", () => {
  it("accepts the default Yoneda witness", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const witness = describeRelativeEnrichedYonedaWitness(enriched);
    const report = analyzeRelativeEnrichedYoneda(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched Yoneda compositions", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeEnrichedYonedaWitness(enriched);
    const broken: RelativeEnrichedYonedaWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      action: {
        ...baseWitness.action,
        composition: { ...baseWitness.action.functorAction },
      },
    };
    const report = analyzeRelativeEnrichedYoneda(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Yoneda composition witness must coincide with the recorded functor action.",
    );
  });
});

describe("Relative enriched Eilenberg–Moore algebra analyzer", () => {
  it("accepts the canonical enriched Eilenberg–Moore witness", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const witness = describeRelativeEnrichedEilenbergMooreAlgebraWitness(enriched);
    const report = analyzeRelativeEnrichedEilenbergMooreAlgebra(witness);
    expect(report.holds).toBe(true);
    expect(report.pending).toBe(false);
    expect(report.issues).toHaveLength(0);
    expect(report.witness.diagrams.associativity.comparison?.holds).toBe(true);
    expect(report.witness.diagrams.unit.comparison?.holds).toBe(true);
  });

  it("flags mismatched extension operators", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeEnrichedEilenbergMooreAlgebraWitness(enriched);
    const broken: RelativeEnrichedEilenbergMooreAlgebraWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      extension: enriched.unitComparison,
      diagrams: {
        associativity: { ...baseWitness.diagrams.associativity },
        unit: { ...baseWitness.diagrams.unit },
      },
    };
    const report = analyzeRelativeEnrichedEilenbergMooreAlgebra(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Eilenberg–Moore extension operator must reuse the enriched extension comparison witness.",
    );
  });

  it("detects non-commuting multiplication composites", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeEnrichedEilenbergMooreAlgebraWitness(enriched);
    const broken: RelativeEnrichedEilenbergMooreAlgebraWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      diagrams: {
        associativity: {
          ...baseWitness.diagrams.associativity,
          redPasting: [[enriched.unitComparison]],
        },
        unit: { ...baseWitness.diagrams.unit },
      },
    };
    const report = analyzeRelativeEnrichedEilenbergMooreAlgebra(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Eilenberg–Moore associativity diagram must commute.",
    );
  });

  it("marks the enriched report pending when Street pastings are incomplete", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeEnrichedEilenbergMooreAlgebraWitness(enriched);
    const broken: RelativeEnrichedEilenbergMooreAlgebraWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      diagrams: {
        associativity: {
          ...baseWitness.diagrams.associativity,
          redPasting: [],
        },
        unit: { ...baseWitness.diagrams.unit },
      },
    };
    const report = analyzeRelativeEnrichedEilenbergMooreAlgebra(broken);
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Eilenberg–Moore associativity Street pastings could not be constructed from the supplied witnesses.",
    );
  });
});

describe("Relative enriched Kleisli inclusion analyzer", () => {
  it("accepts the canonical inclusion witness", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const witness = describeRelativeEnrichedKleisliInclusionWitness(enriched);
    const report = analyzeRelativeEnrichedKleisliInclusion(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags identity transformation mismatches", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeEnrichedKleisliInclusionWitness(enriched);
    const broken: RelativeEnrichedKleisliInclusionWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      opalgebra: {
        ...baseWitness.opalgebra,
        identityTransformation: enriched.extensionComparison,
      },
    };
    const report = analyzeRelativeEnrichedKleisliInclusion(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Kleisli inclusion identity-on-objects transformation must reuse the enriched unit comparison witness.",
    );
  });

  it("detects composition comparison drift", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeEnrichedKleisliInclusionWitness(enriched);
    const broken: RelativeEnrichedKleisliInclusionWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      compositionPreservation: {
        ...baseWitness.compositionPreservation,
        comparison: enriched.unitComparison,
      },
    };
    const report = analyzeRelativeEnrichedKleisliInclusion(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Kleisli inclusion composition preservation comparison must reuse the recorded reference 2-cell.",
    );
  });
});

describe("Relative enriched Yoneda distributor analyzer", () => {
  it("accepts the canonical distributor witness", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const yoneda = describeRelativeEnrichedYonedaWitness(enriched);
    const witness = describeRelativeEnrichedYonedaDistributorWitness(yoneda);
    const report = analyzeRelativeEnrichedYonedaDistributor(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.rightLift.holds).toBe(true);
  });

  it("detects divergent PZ(p,q) composites", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const yoneda = describeRelativeEnrichedYonedaWitness(enriched);
    const baseWitness = describeRelativeEnrichedYonedaDistributorWitness(yoneda);
    const broken = {
      ...baseWitness,
      redComposite: { ...baseWitness.redComposite },
    };
    const report = analyzeRelativeEnrichedYonedaDistributor(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Yoneda distributor red composite must coincide with the supplied PZ(p,q) factorisation.",
    );
  });

  it("flags mismatched right lift witnesses", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const yoneda = describeRelativeEnrichedYonedaWitness(enriched);
    const baseWitness = describeRelativeEnrichedYonedaDistributorWitness(yoneda);
    const broken = {
      ...baseWitness,
      rightLift: {
        ...baseWitness.rightLift,
        lift: baseWitness.rightLift.loose,
      },
    };
    const report = analyzeRelativeEnrichedYonedaDistributor(broken);
    expect(report.holds).toBe(false);
    expect(report.rightLift.holds).toBe(false);
    expect(report.issues).toContain(
      "Yoneda distributor right lift must land in the relative monad loose arrow witnessing Y : Z → PZ.",
    );
  });
});

describe("Relative set-enriched monad analyzer", () => {
  it("accepts the Example 8.14 correspondences", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const witness = describeRelativeSetEnrichedMonadWitness(enriched);
    const report = analyzeRelativeSetEnrichedMonad(witness);
    expect(report.holds).toBe(true);
    expect(report.correspondences.every((entry) => entry.holds)).toBe(true);
  });

  it("flags a correspondence that does not reuse the loose arrow", () => {
    const { equipment, trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeSetEnrichedMonadWitness(enriched);
    const [firstCorrespondence, ...rest] = baseWitness.correspondences;
    if (!firstCorrespondence) {
      throw new Error("Expected at least one set-enriched correspondence witness.");
    }
    const brokenCorrespondence = {
      ...firstCorrespondence,
      looseArrow: identityProarrow(equipment, trivial.root.from),
    };
    const witness: RelativeSetEnrichedMonadWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      correspondences: [brokenCorrespondence, ...rest],
    };
    const report = analyzeRelativeSetEnrichedMonad(witness);
    expect(report.holds).toBe(false);
    expect(report.correspondences[0]?.holds).toBe(false);
  });

  it("rejects a fully faithful witness with mismatched domain", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeSetEnrichedMonadWitness(enriched);
    const witness: RelativeSetEnrichedMonadWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      fullyFaithful: {
        tight: baseWitness.fullyFaithful.tight,
        domain: trivial.carrier.from,
        codomain: baseWitness.fullyFaithful.codomain,
      },
    };
    const report = analyzeRelativeSetEnrichedMonad(witness);
    expect(report.holds).toBe(false);
    expect(report.fullyFaithful.holds).toBe(false);
  });
});

describe("Relative enriched V-Cat monad analyzer", () => {
  it("accepts the canonical Theorem 8.12 witness", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const witness = describeRelativeEnrichedVCatMonadWitness(enriched);
    const report = analyzeRelativeEnrichedVCatMonad(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched unit triangle evidence", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeEnrichedVCatMonadWitness(enriched);
    const broken: RelativeEnrichedVCatMonadWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      unitTriangle: {
        ...baseWitness.unitTriangle,
        redComposite: enriched.extensionComparison,
      },
    };
    const report = analyzeRelativeEnrichedVCatMonad(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Theorem 8.12 unit triangle red composite must match the recorded comparison evidence.",
    );
  });

  it("detects functorial identity mismatches", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeEnrichedVCatMonadWitness(enriched);
    const broken: RelativeEnrichedVCatMonadWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      functoriality: {
        ...baseWitness.functoriality,
        identity: {
          ...baseWitness.functoriality.identity,
          redComposite: enriched.extensionComparison,
        },
      },
    };
    const report = analyzeRelativeEnrichedVCatMonad(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Theorem 8.12 identity preservation red composite must match the recorded comparison evidence.",
    );
  });

  it("flags τ naturality discrepancies", () => {
    const { trivial } = makeTrivialData();
    const enriched = describeRelativeEnrichedMonadWitness(trivial);
    const baseWitness = describeRelativeEnrichedVCatMonadWitness(enriched);
    const broken: RelativeEnrichedVCatMonadWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...baseWitness,
      tauNaturality: {
        ...baseWitness.tauNaturality,
        greenComposite: enriched.extensionComparison,
      },
    };
    const report = analyzeRelativeEnrichedVCatMonad(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Theorem 8.12 τ V-naturality green composite must match the recorded comparison evidence.",
    );
  });
});

describe("Relative monad identity reduction", () => {
  it("confirms identity-root data collapses to an ordinary monad", () => {
    const { trivial } = makeTrivialData();
    const report = analyzeRelativeMonadIdentityReduction(trivial);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags non-identity roots", () => {
    const { equipment, trivial } = makeTrivialData();
    const alteredRoot = identityVerticalBoundary(
      equipment,
      "★",
      "Mismatched identity boundary to force a failure.",
    );
    const report = analyzeRelativeMonadIdentityReduction({
      ...trivial,
      root: alteredRoot,
    });
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Root j and carrier t must coincide to model an ordinary monad.",
    );
  });
});

describe("Identity-root adapters", () => {
  it("embeds and collapses an ordinary identity monad", () => {
    const monad = makeIdentityCatMonad();
    const relative = fromMonad(monad, {
      rootObject: "•",
      objects: TwoObjectCategory.objects,
    });

    expect(relative.root.from).toBe("•");
    expect(relative.carrier.tight).toBe(monad.endofunctor);

    const reduction = analyzeRelativeMonadIdentityReduction(relative);
    expect(reduction.holds).toBe(true);

    const collapse = toMonadIfIdentity(relative);
    expect(collapse.holds).toBe(true);
    expect(collapse.monad?.endofunctor).toBe(monad.endofunctor);
    expect(collapse.monad?.unit).toBe(monad.unit);
    expect(collapse.monad?.mult).toBe(monad.mult);
  });

  it("reports non-tight unit evidence when collapse fails", () => {
    const monad = makeIdentityCatMonad();
    const relative = fromMonad(monad, {
      rootObject: "•",
      objects: TwoObjectCategory.objects,
    });

    const collapse = toMonadIfIdentity({
      ...relative,
      unit: {
        ...relative.unit,
        evidence: {
          kind: "cartesian" as const,
          direction: "left" as const,
          tight: relative.equipment.tight.identity,
          details: "Simulated cartesian evidence to block the collapse.",
          boundary: relative.unit.boundaries.left,
        },
      },
    });

    expect(collapse.holds).toBe(false);
    expect(collapse.issues).toContain(
      "Relative monad unit evidence must be a tight 2-cell to recover the classical monad unit.",
    );
  });
});

describe("Relative monad resolution analyzer", () => {
  it("recognises the trivial resolution", () => {
    const { equipment, trivial } = makeTrivialData();
    const adjunction = describeTrivialRelativeAdjunction(equipment, "•");
    const report = analyzeRelativeMonadResolution({ monad: trivial, adjunction });
    expect(report.holds).toBe(true);
    expect(report.looseMonad.holds).toBe(true);
    expect(report.looseMonad.induced).toBe(trivial.looseCell);
    expect(report.issues).toHaveLength(0);
  });

  it("detects mismatched carriers", () => {
    const { equipment, trivial } = makeTrivialData();
    const adjunction = describeTrivialRelativeAdjunction(equipment, "•");
    const mismatched = {
      ...trivial,
      carrier: identityVerticalBoundary(
        equipment,
        "★",
        "Mismatched carrier to violate the resolution conditions.",
      ),
    } as typeof trivial;
    const report = analyzeRelativeMonadResolution({ monad: mismatched, adjunction });
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative monad carrier should match the right leg r.",
    );
  });
});

describe("checkRelativeMonadLaws", () => {
  it("confirms Street composites for the trivial relative monad", () => {
    const { trivial } = makeTrivialData();
    const report = checkRelativeMonadLaws(trivial);
    expect(report.pending).toBe(false);
    expect(report.holds).toBe(true);
    expect(report.analysis.framing.holds).toBe(true);
    expect(report.analysis.unitCompatibility.holds).toBe(true);
    expect(report.analysis.unitCompatibility.pending).toBe(false);
    expect(report.analysis.extensionAssociativity.holds).toBe(true);
    expect(report.analysis.extensionAssociativity.pending).toBe(false);
    expect(report.analysis.rootIdentity.holds).toBe(true);
    expect(report.analysis.unitCompatibility.witness.unitArrow).toBeDefined();
    expect(report.analysis.unitCompatibility.witness.comparison?.red).toBeDefined();
    expect(report.analysis.unitCompatibility.witness.comparison?.green).toBeDefined();
    expect(
      report.analysis.extensionAssociativity.witness.extensionSourceArrows.length,
    ).toBeGreaterThan(0);
    expect(report.analysis.rootIdentity.witness.restriction).toBeDefined();
  });
});

describe("Relative monad representability", () => {
  it("accepts representability obtained from left restriction", () => {
    const { trivial, witness } = obtainRepresentabilityWitness();
    const report = analyzeRelativeMonadRepresentability(trivial, witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched orientation", () => {
    const { trivial, witness } = obtainRepresentabilityWitness();
    const brokenWitness = { ...witness, orientation: "right" as const };
    const report = analyzeRelativeMonadRepresentability(trivial, brokenWitness);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Representability witness must arise from a left restriction B(j,1) to align with Theorem 4.16.",
    );
  });
});

describe("Relative monad oracles", () => {
  it("report the framing oracle result", () => {
    const { trivial } = makeTrivialData();
    const oracle = RelativeMonadOracles.framing(trivial);
    expect(oracle.pending).toBe(false);
    expect(oracle.holds).toBe(true);
    expect(oracle.issues).toHaveLength(0);
  });

  it("summarises the identity reduction oracle", () => {
    const { trivial } = makeTrivialData();
    const oracle = RelativeMonadOracles.identityReduction(trivial);
    expect(oracle.pending).toBe(false);
    expect(oracle.holds).toBe(true);
    expect(oracle.issues).toHaveLength(0);
  });

  it("marks associativity as pending", () => {
    const oracle = RelativeMonadOracles.associativityPasting();
    expect(oracle.pending).toBe(true);
    expect(oracle.holds).toBe(false);
  });

  it("summarises representable loose monoid witnesses", () => {
    const { trivial, witness } = obtainRepresentabilityWitness();
    const oracle = RelativeMonadOracles.representableLooseMonoid(trivial, witness);
    expect(oracle.pending).toBe(false);
    expect(oracle.holds).toBe(true);
    expect(oracle.issues).toHaveLength(0);
  });

  it("aggregates the skew-monoid bridge when supplied", () => {
    const input = makeSkewMonoidBridgeInput();
    const oracle = RelativeMonadOracles.skewMonoidBridge(input);
    expect(oracle.pending).toBe(false);
    expect(oracle.holds).toBe(true);
    expect(oracle.issues).toHaveLength(0);
  });
});

describe("Relative monad skew-monoid bridge analyzer", () => {
  it("confirms the Theorem 4.29 conditions for the identity example", () => {
    const input = makeSkewMonoidBridgeInput();
    const report = analyzeRelativeMonadSkewMonoidBridge(input);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags missing density witnesses", () => {
    const input = makeSkewMonoidBridgeInput();
    const broken = {
      ...input,
      leftExtensions: {
        ...input.leftExtensions,
        density: {
          holds: false,
          issues: ["Density witness not provided"],
          details: "Unable to exhibit density for the supplied tight cell.",
        },
      },
    };
    const report = analyzeRelativeMonadSkewMonoidBridge(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContainEqual(
      expect.stringContaining("Density witness failed"),
    );
  });

  it("surfaces the bridge oracle via enumeration", () => {
    const input = makeSkewMonoidBridgeInput();
    const results = enumerateRelativeMonadOracles(input.relative, {
      skewMonoidBridgeInput: input,
    });
    expect(
      results.some(
        (result) =>
          result.registryPath ===
          RelativeMonadLawRegistry.skewMonoidBridge.registryPath,
      ),
    ).toBe(true);
  });

  it("includes the set-enriched oracle in the default enumeration", () => {
    const { trivial } = makeTrivialData();
    const results = enumerateRelativeMonadOracles(trivial);
    expect(
      results.some(
        (result) =>
          result.registryPath ===
          RelativeMonadLawRegistry.setEnrichedCompatibility.registryPath,
      ),
    ).toBe(true);
  });
});
