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
import type { RelativeMonadData } from "../../relative/relative-monads";
import {
  categoryOfResolutions,
  checkRelativeAdjunctionPrecomposition,
  checkResolutionCategoryLaws,
  checkResolutionOfRelativeMonad,
  checkLooseMonadIsomorphism,
  checkIdentityUnitForRelativeAdjunction,
  identifyLooseMonadFromResolution,
  looseAdjunctionFromResolution,
  looseMonadFromResolution,
  postcomposeLooseAdjunctionAlongFullyFaithful,
  precomposeLooseAdjunction,
  pasteLooseAdjunctionAlongResolution,
  composeLooseAdjunctionResolutely,
  propagateFullyFaithfulPostcompositionAcrossResolutionMorphism,
  propagateLeftAdjointTransportAcrossResolutionMorphism,
  propagateResoluteCompositeAcrossResolutionMorphism,
  type ResolutionCategory,
  type ResolutionData,
  type ResolutionMorphism,
  type ResolutionMorphismMetadata,
  transportLooseAdjunctionAlongLeftAdjoint,
} from "../../relative/resolutions";

const makeTrivialResolution = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const relativeMonad = describeTrivialRelativeMonad(equipment, "•");
  type MonadShape = typeof relativeMonad;
  type MonadObj = MonadShape extends RelativeMonadData<infer Obj, infer Arr, infer Payload, infer Evidence>
    ? Obj
    : never;
  type MonadArr = MonadShape extends RelativeMonadData<infer Obj, infer Arr, infer Payload, infer Evidence>
    ? Arr
    : never;
  type MonadPayload = MonadShape extends RelativeMonadData<infer Obj, infer Arr, infer Payload, infer Evidence>
    ? Payload
    : never;
  type MonadEvidence = MonadShape extends RelativeMonadData<
    infer Obj,
    infer Arr,
    infer Payload,
    infer Evidence
  >
    ? Evidence
    : never;
  const apexLoose = identityProarrow(equipment, "•");
  const apexFrame = frameFromProarrow(apexLoose);
  const monadFrame = frameFromProarrow(relativeMonad.looseCell);
  const forwardBoundaries: EquipmentCellBoundaries<MonadObj, MonadArr> = {
    left: relativeMonad.root,
    right: relativeMonad.carrier,
  };
  const forward: Equipment2Cell<MonadObj, MonadArr, MonadPayload, MonadEvidence> = {
    source: apexFrame,
    target: monadFrame,
    boundaries: forwardBoundaries,
    evidence: equipment.cells.identity(apexFrame, forwardBoundaries),
  };

  const resolution: ResolutionData<MonadObj, MonadArr, MonadPayload, MonadEvidence> = {
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

type TrivialResolutionShape = ReturnType<typeof makeTrivialResolution>;
type TrivialRelativeMonad = TrivialResolutionShape["relativeMonad"];
type TrivialInvariants = TrivialRelativeMonad extends RelativeMonadData<
  infer Obj,
  infer Arr,
  infer Payload,
  infer Evidence
>
  ? { Obj: Obj; Arr: Arr; Payload: Payload; Evidence: Evidence }
  : never;
type TrivialResolutionObj = TrivialInvariants["Obj"];
type TrivialResolutionArr = TrivialInvariants["Arr"];
type TrivialResolutionPayload = TrivialInvariants["Payload"];
type TrivialResolutionEvidence = TrivialInvariants["Evidence"];
type TrivialResolutionObject = ResolutionData<
  TrivialResolutionObj,
  TrivialResolutionArr,
  TrivialResolutionPayload,
  TrivialResolutionEvidence
>;
type TrivialResolutionHom = ResolutionMorphism<
  TrivialResolutionObj,
  TrivialResolutionArr,
  TrivialResolutionPayload,
  TrivialResolutionEvidence
>;
type TrivialResolutionHomMetadata = ResolutionMorphismMetadata<
  TrivialResolutionObj,
  TrivialResolutionArr,
  TrivialResolutionPayload,
  TrivialResolutionEvidence
>;

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
      TrivialResolutionObj,
      TrivialResolutionPayload
    > =
      identityProarrow(equipment, "★");
    const broken = {
      ...resolution,
      apexLoose: wrongApex,
    } satisfies TrivialResolutionObject;
    const report = checkResolutionOfRelativeMonad(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Resolution apex loose morphism must originate at the root domain A.",
    );
  });
});

describe("Resolution loose adjunction helpers", () => {
  it("derives a loose adjunction with propagated metadata", () => {
    const { resolution } = makeTrivialResolution();

    const result = looseAdjunctionFromResolution(resolution);

    expect(result.analysis.holds).toBe(true);
    expect(result.metadata.precompositions?.length).toBe(1);
    expect(result.details).toContain("Proposition 5.29 witness(es)");
  });

  it("records Proposition 5.29 data when precomposing the loose adjunction", () => {
    const { resolution } = makeTrivialResolution();

    const result = precomposeLooseAdjunction({
      resolution,
      tightCell: resolution.inclusion,
      details: "Test precomposition witness.",
    });

    expect(result.precompositionWitness.tightCell).toBe(resolution.inclusion);
    expect(result.metadata.precompositions?.length).toBe(2);
    expect(result.details).toContain("Proposition 5.29 witness(es)");
  });

  it("records Proposition 5.30 data when pasting adjunction triangles", () => {
    const { resolution, forward } = makeTrivialResolution();

    const result = pasteLooseAdjunctionAlongResolution({
      resolution,
      inner: forward,
      outer: forward,
      details: "Test pasting witness.",
    });

    expect(result.pastingWitness.inner).toBe(forward);
    expect(result.metadata.pastings?.length).toBe(2);
    expect(result.details).toContain("Proposition 5.30 pasting witness(es)");
  });

  it("records Example 5.31 data when postcomposing with a fully faithful right leg", () => {
    const { resolution } = makeTrivialResolution();

    const result = postcomposeLooseAdjunctionAlongFullyFaithful({
      resolution,
      rightLeg: resolution.relativeMonad.root,
      inducedAdjunctionSummary: "Test fully faithful witness.",
      identityCollapseSummary: "Test identity collapse witness.",
    });

    expect(result.fullyFaithfulWitness.rightLeg).toBe(resolution.relativeMonad.root);
    expect(result.metadata.fullyFaithfulPostcompositions?.length).toBe(2);
    expect(result.details).toContain("Example 5.31 fully faithful witness(es)");
  });

  it("records Remark 5.33 data when a resolute pair is supplied", () => {
    const { resolution } = makeTrivialResolution();

    const result = composeLooseAdjunctionResolutely({
      resolution,
      leftLeg: resolution.inclusion,
      rightAdjoint: resolution.relativeMonad.root,
      details: "Test resolute witness.",
    });

    expect(result.resoluteWitness.leftLeg).toBe(resolution.inclusion);
    expect(result.metadata.resoluteComposites?.length).toBe(2);
    expect(result.details).toContain("Remark 5.33 resolute composite witness(es)");
  });

  it("records Proposition 5.37 data when transporting along a left adjoint", () => {
    const { resolution } = makeTrivialResolution();

    const result = transportLooseAdjunctionAlongLeftAdjoint({
      resolution,
      leftAdjoint: resolution.inclusion,
      details: "Test transport witness.",
    });

    expect(result.transportWitness.leftAdjoint).toBe(resolution.inclusion);
    expect(result.metadata.leftAdjointTransports?.length).toBe(2);
    expect(result.details).toContain("Proposition 5.37 transport witness(es)");
    expect(result.details).toContain("(ℓ'!, r')");
  });

  it("derives the loose monad induced by the resolution", () => {
    const { resolution } = makeTrivialResolution();

    const report = looseMonadFromResolution(resolution);

    expect(report.holds).toBe(true);
    expect(report.induced).toBe(resolution.relativeMonad.looseCell);
    expect(report.details).toContain("Proposition 5.37 transport witness(es)");
    expect(report.details).toContain("(ℓ'!, r')");
  });

  it("confirms the loose monad isomorphism with coherent witnesses", () => {
    const { resolution } = makeTrivialResolution();

    const report = checkLooseMonadIsomorphism(resolution);

    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.details).toContain("naturally isomorphic");
    expect(report.coherence.precompositions).toBeGreaterThan(0);
    expect(report.coherence.leftAdjointTransports).toBeGreaterThan(0);
    expect(report.transportComparisons.length).toBeGreaterThan(0);
    expect(report.transportComparisons[0]?.summary).toContain("(ℓ'!, r')");
  });

  it("identifies the loose monad via Corollary 5.28", () => {
    const { resolution } = makeTrivialResolution();

    const report = identifyLooseMonadFromResolution(resolution);

    expect(report.holds).toBe(true);
    expect(report.details).toContain("Corollary 5.28");
    expect(report.comparison).toBe(resolution.comparison);
    expect(report.transportComparisons.length).toBeGreaterThan(0);
    expect(report.transportComparisons[0]?.summary).toContain("(ℓ'!, r')");
  });

  it("detects mismatched precomposition comparisons", () => {
    const { resolution, forward } = makeTrivialResolution();

    const brokenComparison: typeof forward = {
      ...forward,
      boundaries: {
        ...forward.boundaries,
        right: resolution.relativeMonad.root,
      },
    };

      const brokenResolution: TrivialResolutionObject =
        resolution.metadata === undefined
          ? resolution
          : {
              ...resolution,
              metadata: {
                ...resolution.metadata,
                precompositions: [
                  {
                    tightCell: resolution.inclusion,
                    comparison: brokenComparison,
                    details: "Broken witness",
                  },
                ],
              },
            };

    const report = checkLooseMonadIsomorphism(brokenResolution);

    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Precomposition comparison 0 must land in the relative monad carrier boundary.",
    );
  });
});

describe("Corollary 5.32 identity-unit criterion", () => {
  it("certifies the trivial resolution's identity unit", () => {
    const { resolution } = makeTrivialResolution();

    const report = checkIdentityUnitForRelativeAdjunction({
      equipment: resolution.equipment,
      left: resolution.inclusion,
      right: resolution.relativeMonad.carrier,
      unit: resolution.relativeMonad.unit,
      details: "Trivial identity-unit witness propagates Corollary 5.32.",
    });

    expect(report.holds).toBe(true);
    expect(report.monadsCoincide).toBe(true);
    expect(report.details).toContain("Corollary 5.32");
  });

  it("flags mismatched unit boundaries", () => {
    const { resolution } = makeTrivialResolution();

    const brokenUnit = {
      ...resolution.relativeMonad.unit,
      boundaries: {
        ...resolution.relativeMonad.unit.boundaries,
        right: resolution.relativeMonad.root,
      },
    };

    const report = checkIdentityUnitForRelativeAdjunction({
      equipment: resolution.equipment,
      left: resolution.inclusion,
      right: resolution.relativeMonad.carrier,
      unit: brokenUnit,
    });

    expect(report.holds).toBe(false);
    expect(report.monadsCoincide).toBe(false);
    expect(report.issues).toContain(
      "Unit 2-cell must use the supplied right leg as its right boundary for Corollary 5.32.",
    );
  });
});

describe("Resolution morphism functoriality", () => {
  it("propagates fully faithful postcomposition witnesses across morphisms", () => {
    const { resolution } = makeTrivialResolution();
    const witness = resolution.metadata?.fullyFaithfulPostcompositions?.[0];
    expect(witness).toBeDefined();

    const baseMorphism: TrivialResolutionHom = {
      source: resolution,
      target: resolution,
      tight: resolution.inclusion,
      loose: resolution.apexLoose,
      comparison: resolution.comparison,
      metadata: {
        precompositions: [],
        pastings: [],
        fullyFaithfulPostcompositions: [],
        resoluteComposites: [],
        leftAdjointTransports: [],
        details: "Base morphism metadata.",
      },
    };

    const propagation = propagateFullyFaithfulPostcompositionAcrossResolutionMorphism({
      morphism: baseMorphism,
      witness: witness!,
    });

    expect(baseMorphism.metadata?.fullyFaithfulPostcompositions).toHaveLength(0);
    const ffMetadata = propagation.metadata;
    expect((ffMetadata?.fullyFaithfulPostcompositions ?? []).length).toBe(1);
    expect(ffMetadata?.fullyFaithfulPostcompositions?.[0]).toBe(witness);
    expect(ffMetadata?.details ?? "").toContain("Base morphism metadata.");
    expect(ffMetadata?.details ?? "").toContain("Example 5.31");
    expect(propagation.details).toContain("fully faithful postcomposition witness");

    const category = categoryOfResolutions({
      objects: [resolution],
      morphisms: [propagation.morphism],
      identity: (_object: TrivialResolutionObject) => propagation.morphism,
      compose: (_g: TrivialResolutionHom, _f: TrivialResolutionHom) => propagation.morphism,
    });

    expect(category.metadata.fullyFaithfulPostcompositions).toContain(witness);
  });

  it("threads resolute composite witnesses across morphisms", () => {
    const { resolution } = makeTrivialResolution();
    const witness = resolution.metadata?.resoluteComposites?.[0];
    expect(witness).toBeDefined();

    const baseMorphism: TrivialResolutionHom = {
      source: resolution,
      target: resolution,
      tight: resolution.inclusion,
      loose: resolution.apexLoose,
      comparison: resolution.comparison,
      metadata: {
        precompositions: [],
        pastings: [],
        fullyFaithfulPostcompositions: [],
        resoluteComposites: [],
        leftAdjointTransports: [],
        details: "Base morphism metadata.",
      },
    };

    const customNarrative = "Resolute witness propagated across the morphism.";
    const propagation = propagateResoluteCompositeAcrossResolutionMorphism({
      morphism: baseMorphism,
      witness: witness!,
      details: customNarrative,
    });

    expect(baseMorphism.metadata?.resoluteComposites).toHaveLength(0);
    const resoluteMetadata = propagation.metadata;
    expect((resoluteMetadata?.resoluteComposites ?? []).length).toBe(1);
    expect(resoluteMetadata?.resoluteComposites?.[0]).toBe(witness);
    expect(resoluteMetadata?.details ?? "").toContain("Base morphism metadata.");
    expect(resoluteMetadata?.details ?? "").toContain(customNarrative);
    expect(propagation.details).toContain("Remark 5.33");

    const category = categoryOfResolutions({
      objects: [resolution],
      morphisms: [propagation.morphism],
      identity: (_object: TrivialResolutionObject) => propagation.morphism,
      compose: (_g: TrivialResolutionHom, _f: TrivialResolutionHom) => propagation.morphism,
    });

    expect(category.metadata.resoluteComposites).toContain(witness);
  });

  it("propagates Proposition 5.37 transport witnesses and the (ℓ'!, r') monad morphism", () => {
    const { resolution } = makeTrivialResolution();
    const witness = resolution.metadata?.leftAdjointTransports?.[0];
    expect(witness).toBeDefined();

    const baseMorphism: TrivialResolutionHom = {
      source: resolution,
      target: resolution,
      tight: resolution.inclusion,
      loose: resolution.apexLoose,
      comparison: resolution.comparison,
      metadata: {
        precompositions: [],
        pastings: [],
        fullyFaithfulPostcompositions: [],
        resoluteComposites: [],
        leftAdjointTransports: [],
        details: "Base morphism metadata.",
      },
    };

    const propagation = propagateLeftAdjointTransportAcrossResolutionMorphism({
      morphism: baseMorphism,
      witness: witness!,
    });

    expect(baseMorphism.metadata?.leftAdjointTransports).toHaveLength(0);
    const transportMetadata = propagation.metadata;
    expect((transportMetadata?.leftAdjointTransports ?? []).length).toBe(1);
    expect(transportMetadata?.leftAdjointTransports?.[0]).toBe(witness);
    expect(transportMetadata?.details ?? "").toContain("Base morphism metadata.");
    expect(transportMetadata?.details ?? "").toContain("(ℓ'!, r')");
    expect(propagation.details).toContain("Proposition 5.37");

    const category = categoryOfResolutions({
      objects: [resolution],
      morphisms: [propagation.morphism],
      identity: (_object: TrivialResolutionObject) => propagation.morphism,
      compose: (_g: TrivialResolutionHom, _f: TrivialResolutionHom) => propagation.morphism,
    });

    expect(category.metadata.leftAdjointTransports).toContain(witness);
  });
});

describe("Resolution category scaffolding", () => {
  it("builds a singleton category whose identity laws hold", () => {
    const { resolution, forward } = makeTrivialResolution();
    const identityMetadata: TrivialResolutionHomMetadata | undefined =
      resolution.metadata === undefined ? undefined : { ...resolution.metadata };

    const identityMorphism: TrivialResolutionHom = {
      source: resolution,
      target: resolution,
      tight: resolution.inclusion,
      loose: resolution.apexLoose,
      comparison: resolution.comparison,
      ...(identityMetadata !== undefined && { metadata: identityMetadata }),
    };

    const category: ResolutionCategory<
      TrivialResolutionObj,
      TrivialResolutionArr,
      TrivialResolutionPayload,
      TrivialResolutionEvidence
    > = categoryOfResolutions({
      objects: [resolution],
      morphisms: [identityMorphism],
      identity: (_object: TrivialResolutionObject) => identityMorphism,
      compose: (_g: TrivialResolutionHom, _f: TrivialResolutionHom) => identityMorphism,
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
