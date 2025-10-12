import { describe, expect, it } from "vitest";

import { TwoObjectCategory } from "../../two-object-cat";
import {
  identityProarrow,
  frameFromProarrow,
  virtualizeFiniteCategory,
} from "../../virtual-equipment";
import type {
  Equipment2Cell,
  EquipmentCellBoundaries,
  EquipmentProarrow,
} from "../../virtual-equipment";
import {
  analyzeRelativeMonadFraming,
  describeTrivialRelativeMonad,
} from "../../relative/relative-monads";
import {
  categoryOfResolutions,
  checkRelativeAdjunctionPrecomposition,
  checkResolutionCategoryLaws,
  checkResolutionOfRelativeMonad,
  type ResolutionCategory,
  type ResolutionData,
  type ResolutionMorphism,
} from "../../relative/resolutions";

const makeTrivialResolution = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const relativeMonad = describeTrivialRelativeMonad(equipment, "•");
  const apexLoose = identityProarrow(equipment, "•");
  const apexFrame = frameFromProarrow(apexLoose);
  const monadFrame = frameFromProarrow(relativeMonad.looseCell);
  const forwardBoundaries: EquipmentCellBoundaries<typeof relativeMonad.root.from, typeof relativeMonad.root.tight> = {
    left: relativeMonad.root,
    right: relativeMonad.carrier,
  };
  const forward: Equipment2Cell<
    typeof relativeMonad.root.from,
    typeof relativeMonad.root.tight,
    typeof apexLoose.payload,
    typeof relativeMonad.extension.evidence
  > = {
    source: apexFrame,
    target: monadFrame,
    boundaries: forwardBoundaries,
    evidence: equipment.cells.identity(apexFrame, forwardBoundaries),
  };

  const resolution: ResolutionData<
    typeof relativeMonad.root.from,
    typeof relativeMonad.root.tight,
    typeof apexLoose.payload,
    typeof relativeMonad.extension.evidence
  > = {
    equipment,
    relativeMonad,
    inclusion: relativeMonad.root,
    apexLoose,
    comparison: {
      forward,
      backward: forward,
      details: "Identity comparison exhibits the trivial resolution.",
    },
    metadata: {
      precompositions: [
        {
          tightCell: relativeMonad.root,
          comparison: forward,
          details: "Identity precomposition realises Proposition 5.29 in the trivial case.",
        },
      ],
      pastings: [
        {
          inner: forward,
          outer: forward,
          details: "Identity triangles witness Proposition 5.30's pasting condition.",
        },
      ],
      fullyFaithfulPostcompositions: [
        {
          rightLeg: relativeMonad.root,
          inducedAdjunctionSummary:
            "Identity right leg stays fully faithful so Example 5.31 applies immediately.",
          identityCollapseSummary: "Corollary 5.32 collapses the adjunction back to the original data.",
        },
      ],
      resoluteComposites: [
        {
          leftLeg: relativeMonad.root,
          rightAdjoint: relativeMonad.root,
          details: "Identity adjunction is resolute, matching Remark 5.33 and Corollary 5.34.",
        },
      ],
      leftAdjointTransports: [
        {
          leftAdjoint: relativeMonad.root,
          transportedMonad: relativeMonad,
          monadMorphism: forward,
          details:
            "Proposition 5.37 transport along the identity left adjoint keeps the relative monad fixed.",
        },
      ],
    },
  };

  return { equipment, relativeMonad, resolution, forward };
};

describe("Resolution oracle", () => {
  it("accepts the identity resolution of the trivial relative monad", () => {
    const { resolution, relativeMonad } = makeTrivialResolution();
    const monadReport = analyzeRelativeMonadFraming(relativeMonad);
    expect(monadReport.holds).toBe(true);

    const report = checkResolutionOfRelativeMonad(resolution);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched apex data", () => {
    const { resolution, equipment } = makeTrivialResolution();
    const wrongApex: EquipmentProarrow<
      typeof resolution.apexLoose.from,
      typeof resolution.apexLoose.payload
    > =
      identityProarrow(equipment, "★");
    const broken = {
      ...resolution,
      apexLoose: wrongApex,
    } satisfies ResolutionData<
      typeof resolution.inclusion.from,
      typeof resolution.inclusion.tight,
      typeof wrongApex.payload,
      typeof resolution.comparison.forward.evidence
    >;
    const report = checkResolutionOfRelativeMonad(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Resolution apex loose morphism must originate at the root domain A.",
    );
  });
});

describe("Resolution category scaffolding", () => {
  it("builds a singleton category whose identity laws hold", () => {
    const { resolution, forward } = makeTrivialResolution();
    const identityMorphism: ResolutionMorphism<
      typeof resolution.inclusion.from,
      typeof resolution.inclusion.tight,
      typeof resolution.apexLoose.payload,
      typeof forward.evidence
    > = {
      source: resolution,
      target: resolution,
      tight: resolution.inclusion,
      loose: resolution.apexLoose,
      comparison: resolution.comparison,
      metadata: resolution.metadata,
    };

    const category: ResolutionCategory<
      typeof resolution.inclusion.from,
      typeof resolution.inclusion.tight,
      typeof resolution.apexLoose.payload,
      typeof forward.evidence
    > = categoryOfResolutions({
      objects: [resolution],
      morphisms: [identityMorphism],
      identity: () => identityMorphism,
      compose: () => identityMorphism,
      equalMor: (left, right) => left === right,
    });

    const lawReport = checkResolutionCategoryLaws(category);
    expect(lawReport.holds).toBe(true);
    expect(lawReport.issues).toHaveLength(0);

    const precompositionReport = checkRelativeAdjunctionPrecomposition(category.metadata);
    expect(precompositionReport.holds).toBe(true);
    expect(precompositionReport.precomposition.count).toBe(1);
    expect(precompositionReport.pasting.count).toBe(1);
    expect(precompositionReport.fullyFaithfulPostcomposition.count).toBe(1);
    expect(precompositionReport.resoluteComposition.count).toBe(1);
    expect(precompositionReport.leftAdjointTransport.count).toBe(1);
  });
});
