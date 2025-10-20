import { describe, expect, test } from "vitest";
import { composeFun } from "../../allTS";
import type { Functor } from "../../functor";
import type {
  Equipment2Cell,
  EquipmentProarrow,
  EquipmentTightLayer,
  Tight,
  TightCategory,
  TightCellEvidence,
  VirtualEquipment,
  FunctorCheckSamples,
} from "../../virtual-equipment";
import {
  analyzeLooseMonoidShape,
  analyzeRightExtension,
  analyzeRightExtensionLiftCompatibility,
  analyzeRightLift,
  analyzeLooseAdjunction,
  canonicalTightCategories,
  companionViaIdentityRestrictions,
  defaultTightLayer,
  demoteFunctor,
  finiteCategoryHasExplicitEndpoints,
  frameFromSequence,
  frameFromProarrow,
  horizontalComposeCells,
  horizontalComposeManyProarrows,
  horizontalComposeProarrows,
  identityCell,
  identityProarrow,
  identityVerticalBoundary,
  juxtaposeIdentityProarrows,
  promoteFunctor,
  sliceAndCosliceConstructors,
  conjointViaIdentityRestrictions,
  verticalComposeCells,
  virtualiseTightCategory,
  whiskerLeftCell,
  whiskerRightCell,
} from "../../virtual-equipment";
import { TwoObjectCategory, nonIdentity } from "../../two-object-cat";
import type { TwoArrow, TwoObject } from "../../two-object-cat";

type CanonicalEntry = (typeof canonicalTightCategories)[number];

type TwoObjects = TwoObject;
type TwoArrows = TwoArrow;
type TwoCategory = TightCategory<TwoObjects, TwoArrows>;
type TightPayload = Tight<TwoCategory, TwoCategory>;
type TightEvidence = TightCellEvidence<TwoObjects, TwoArrows>;
type TwoEquipment = VirtualEquipment<TwoObjects, TwoArrows, TightPayload, TightEvidence>;
type TwoProarrow = EquipmentProarrow<TwoObjects, TightPayload>;
type TwoTightLayer = EquipmentTightLayer<TwoObjects, TwoArrows>;

const equalsTwoObject = (left: TwoObject, right: TwoObject): boolean => left === right;

const composeTight: TwoTightLayer["compose"] = (g, f) => composeFun(g, f);

const defaultSamples: FunctorCheckSamples<TwoObjects, TwoArrows> = {
  objects: TwoObjectCategory.objects,
  composablePairs: [
    { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
    { f: nonIdentity, g: TwoObjectCategory.id("★") },
  ],
  arrows: TwoObjectCategory.arrows,
};

const promoteIdentityFunctor = (
  samples: FunctorCheckSamples<TwoObjects, TwoArrows> = defaultSamples,
): TightPayload =>
  promoteFunctor(
    TwoObjectCategory,
    TwoObjectCategory,
    {
      F0: (object: TwoObject) => object,
      F1: (arrow: TwoArrow) => arrow,
    },
    samples,
  ).functor;

const buildTwoObjectEquipment = (
  samples: FunctorCheckSamples<TwoObjects, TwoArrows> = defaultSamples,
): { equipment: TwoEquipment; tightLayer: TwoTightLayer } => {
  const identityFunctor = promoteIdentityFunctor(samples);
  const tightLayer = defaultTightLayer(
    TwoObjectCategory,
    identityFunctor,
    composeTight,
  );
  const equipment = virtualiseTightCategory(
    tightLayer,
    TwoObjectCategory.objects,
    equalsTwoObject,
  );
  return { equipment, tightLayer } as const;
};

describe("virtual equipment tight primitive catalogue", () => {
  test("functors can be promoted and demoted without losing data", () => {
    const identityFunctor: Functor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
      F0: (obj: TwoObject) => obj,
      F1: (arrow: TwoArrow) => arrow,
    };

    const { functor: catFunctor, report } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      identityFunctor,
      {
        objects: TwoObjectCategory.objects,
        composablePairs: [
          { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
          { f: nonIdentity, g: TwoObjectCategory.id("★") },
        ],
        arrows: TwoObjectCategory.arrows,
      },
    );

    expect(report.holds).toBe(true);
    expect(report.respectsSourcesAndTargets).toBe(true);
    expect(report.details).toHaveLength(0);
    expect(report.ignoredCompositionPairs).toHaveLength(0);
    expect(catFunctor.onObj("•")).toBe("•");
    expect(catFunctor.onMor(nonIdentity)).toBe(nonIdentity);

    const roundTripped = demoteFunctor(catFunctor);
    expect(roundTripped.F0("★")).toBe("★");
    expect(roundTripped.F1(nonIdentity)).toBe(nonIdentity);
  });

  test("functor law report captures identity and composition failures", () => {
    const brokenFunctor: Functor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
      F0: (obj: TwoObject) => obj,
      F1: () => nonIdentity,
    };

    const { report } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      brokenFunctor,
      defaultSamples,
    );

    expect(report.holds).toBe(false);
    expect(report.preservesIdentities).toBe(false);
    expect(report.identityFailures.length).toBeGreaterThan(0);
    expect(report.preservesComposition).toBe(false);
    expect(report.compositionFailures.length).toBeGreaterThan(0);
    expect(report.ignoredCompositionPairs.length).toBe(0);
    expect(report.respectsSourcesAndTargets).toBe(false);
    expect(report.endpointFailures.length).toBeGreaterThan(0);
    expect(report.details.some((detail) => detail.includes("Functor failed"))).toBe(true);
  });

  test("functor law report records non-composable sample pairs", () => {
    const identityFunctor: Functor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
      F0: (obj: TwoObject) => obj,
      F1: (arrow: TwoArrow) => arrow,
    };

    const samples: FunctorCheckSamples<TwoObject, TwoArrow> = {
      objects: TwoObjectCategory.objects,
      composablePairs: [
        { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("★") },
        { f: TwoObjectCategory.id("★"), g: TwoObjectCategory.id("•") },
      ],
    };

    const { report } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      identityFunctor,
      samples,
    );

    expect(report.preservesComposition).toBe(true);
    expect(report.ignoredCompositionPairs.length).toBe(2);
    expect(report.details.some((detail) => detail.includes("non-composable"))).toBe(true);
  });

  test("endpoint diagnostics derive arrow samples when omitted", () => {
    const endpointBroken: Functor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
      F0: (object: TwoObject) => object,
      F1: (arrow: TwoArrow) => (arrow.name === "f" ? TwoObjectCategory.id("•") : arrow),
    };

    const samples: FunctorCheckSamples<TwoObject, TwoArrow> = {
      objects: TwoObjectCategory.objects,
      composablePairs: [{ f: TwoObjectCategory.id("•"), g: nonIdentity }],
    };

    const { report } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      endpointBroken,
      samples,
    );

    expect(report.preservesIdentities).toBe(true);
    expect(report.preservesComposition).toBe(true);
    expect(report.respectsSourcesAndTargets).toBe(false);
    expect(report.endpointFailures.length).toBeGreaterThan(0);
  });

  test("catalogued categories expose explicit endpoints", () => {
    expect(
      canonicalTightCategories.some(
        (entry: CanonicalEntry) => entry.name === "TwoObjectCategory",
      ),
    ).toBe(true);
    for (const entry of canonicalTightCategories) {
      expect(finiteCategoryHasExplicitEndpoints(entry.category)).toBe(true);
    }
  });

  test("slice constructors remain accessible through the catalogue", () => {
    const { makeSlice, makeCoslice } = sliceAndCosliceConstructors;
    const slice = makeSlice(TwoObjectCategory, "★");
    const coslice = makeCoslice(TwoObjectCategory, "•");

    expect(slice.objects.length).toBeGreaterThan(0);
    expect(coslice.objects.length).toBeGreaterThan(0);
    expect(finiteCategoryHasExplicitEndpoints(slice)).toBe(true);
    expect(finiteCategoryHasExplicitEndpoints(coslice)).toBe(true);
  });

  test("virtualised categories expose proarrow and 2-cell calculus", () => {
    const { equipment, tightLayer } = buildTwoObjectEquipment();

    const constantStar: Functor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
      F0: () => "★" as const,
      F1: () => TwoObjectCategory.id("★"),
    };
    const constStarFunctor: TightPayload = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      constantStar,
      defaultSamples,
    ).functor;

    const constantDot: Functor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
      F0: () => "•" as const,
      F1: () => TwoObjectCategory.id("•"),
    };
    const constDotFunctor: TightPayload = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      constantDot,
      defaultSamples,
    ).functor;

    const idDot = identityProarrow(equipment, "•");
    const idStar = identityProarrow(equipment, "★");
    const constStarPro: TwoProarrow = {
      from: "•",
      to: "★",
      payload: constStarFunctor,
    };

    const composed = horizontalComposeProarrows(equipment, constStarPro, idDot);
    expect(composed).toBeDefined();
    expect(composed?.from).toBe("•");
    expect(composed?.to).toBe("★");
    expect(composed?.payload.onObj("•")).toBe("★");

    const composedMany = horizontalComposeManyProarrows(equipment, [idDot, constStarPro]);
    expect(composedMany).toBeDefined();
    expect(composedMany?.from).toBe("•");
    expect(composedMany?.to).toBe("★");

    const mismatchedCompose = horizontalComposeProarrows(equipment, constStarPro, idStar);
    expect(mismatchedCompose).toBeUndefined();

    const constStarCell = identityCell(equipment, constStarPro);
    const idCellDot = identityCell(equipment, idDot);
    const idCellStar = identityCell(equipment, idStar);

    expect(constStarCell.source.leftBoundary).toBe("•");
    expect(constStarCell.source.rightBoundary).toBe("★");
    expect(constStarCell.target.leftBoundary).toBe("•");
    expect(constStarCell.target.rightBoundary).toBe("★");
    expect(constStarCell.boundaries.left.from).toBe("•");
    expect(constStarCell.boundaries.left.to).toBe("•");
    expect(constStarCell.boundaries.right.from).toBe("★");
    expect(constStarCell.boundaries.right.to).toBe("★");

    const identityRestriction = equipment.restrictions.left(
      tightLayer.identity,
      idDot,
    );
    if (!identityRestriction) {
      throw new Error("Expected left restriction to exist for the identity tight cell.");
    }
    const { cartesian: identityCartesian, representability: identityRepresentability } = identityRestriction;
    expect(identityCartesian.cartesian).toBe(true);
    expect(identityCartesian.boundary.direction).toBe("left");
    expect(identityCartesian.boundary.vertical.from).toBe("•");
    expect(identityCartesian.boundary.vertical.to).toBe("•");
    expect(identityCartesian.boundary.details).toContain("restriction");
    const identityEvidence = identityCartesian.evidence;
    expect(identityEvidence.kind).toBe("cartesian");
    if (identityEvidence.kind === "cartesian") {
      expect(identityEvidence.boundary.from).toBe("•");
    }
    expect(identityRepresentability?.orientation).toBe("left");
    expect(identityRepresentability?.object).toBe("•");

    const leftRestrictionConstStar = equipment.restrictions.left(
      constStarFunctor,
      idStar,
    );
    if (!leftRestrictionConstStar) {
      throw new Error("Expected left restriction for the constant-star functor to exist.");
    }
    expect(leftRestrictionConstStar.restricted.from).toBe("•");
    expect(leftRestrictionConstStar.restricted.to).toBe("★");
    expect(leftRestrictionConstStar.cartesian.boundary.vertical.details).toContain(
      "tight 1-cell",
    );
    expect(leftRestrictionConstStar.representability?.orientation).toBe("left");

    const leftRestrictionConstDot = equipment.restrictions.left(
      constDotFunctor,
      idDot,
    );
    if (!leftRestrictionConstDot) {
      throw new Error("Expected left restriction for the constant-dot functor to exist.");
    }
    expect(leftRestrictionConstDot.restricted.from).toBe("•");
    expect(leftRestrictionConstDot.restricted.to).toBe("•");
    expect(leftRestrictionConstDot.representability?.orientation).toBe("left");

    const failedRestriction = equipment.restrictions.left(
      constStarFunctor,
      idDot,
    );
    expect(failedRestriction).toBeUndefined();

    const identityConjointRestriction = equipment.restrictions.right(
      idStar,
      tightLayer.identity,
    );
    if (!identityConjointRestriction) {
      throw new Error("Expected right restriction to exist for the identity tight cell.");
    }
    expect(identityConjointRestriction.cartesian.boundary.direction).toBe("right");
    expect(identityConjointRestriction.cartesian.boundary.vertical.from).toBe("★");
    const identityConjointEvidence = identityConjointRestriction.cartesian.evidence;
    expect(identityConjointEvidence.kind).toBe("cartesian");
    if (identityConjointEvidence.kind === "cartesian") {
      expect(identityConjointEvidence.boundary.from).toBe("★");
    }
    expect(identityConjointRestriction.representability?.orientation).toBe("right");

    const rightRestrictionConstStar = equipment.restrictions.right(
      idDot,
      constStarFunctor,
    );
    if (!rightRestrictionConstStar) {
      throw new Error("Expected right restriction for the constant-star functor to exist.");
    }
    expect(rightRestrictionConstStar.restricted.to).toBe("★");
    expect(rightRestrictionConstStar.cartesian.boundary.vertical.to).toBe("★");
    expect(rightRestrictionConstStar.representability?.orientation).toBe("right");

    const companionAttempt = companionViaIdentityRestrictions(
      equipment,
      tightLayer.identity,
    );
    expect(companionAttempt.available).toBe(true);
    expect(companionAttempt.cartesian?.boundary.direction).toBe("left");
    expect(companionAttempt.cartesian?.boundaries.left.from).toBe("•");
    expect(companionAttempt.representability?.orientation).toBe("left");

    const failedCompanion = companionViaIdentityRestrictions(
      equipment,
      constStarFunctor,
    );
    expect(failedCompanion.available).toBe(false);

    const conjointAttempt = conjointViaIdentityRestrictions(
      equipment,
      tightLayer.identity,
    );
    expect(conjointAttempt.available).toBe(true);
    expect(conjointAttempt.cartesian?.boundary.direction).toBe("right");
    expect(conjointAttempt.cartesian?.boundaries.right.from).toBe("★");
    expect(conjointAttempt.representability?.orientation).toBe("right");

    const failedConjoint = conjointViaIdentityRestrictions(
      equipment,
      constStarFunctor,
    );
    expect(failedConjoint.available).toBe(false);

    const vertical = verticalComposeCells(equipment, idCellDot, idCellDot);
    expect(vertical).toBeDefined();
    expect(vertical?.source.leftBoundary).toBe("•");
    expect(vertical?.target.rightBoundary).toBe("•");
    expect(vertical?.boundaries.left.from).toBe("•");
    expect(vertical?.boundaries.left.to).toBe("•");
    expect(vertical?.boundaries.right.from).toBe("•");
    expect(vertical?.boundaries.right.to).toBe("•");

    const verticalMismatch = verticalComposeCells(equipment, constStarCell, idCellStar);
    expect(verticalMismatch).toBeUndefined();

    const horizontal = horizontalComposeCells(equipment, constStarCell, idCellDot);
    expect(horizontal).toBeDefined();
    expect(horizontal?.source.leftBoundary).toBe("•");
    expect(horizontal?.target.rightBoundary).toBe("★");
    expect(horizontal?.boundaries.left.from).toBe("•");
    expect(horizontal?.boundaries.right.to).toBe("★");

    const horizontalMismatch = horizontalComposeCells(equipment, constStarCell, idCellStar);
    expect(horizontalMismatch).toBeUndefined();

    const leftWhisker = whiskerLeftCell(equipment, idDot, constStarCell);
    expect(leftWhisker).toBeDefined();
    expect(leftWhisker?.source.leftBoundary).toBe("•");
    expect(leftWhisker?.target.rightBoundary).toBe("★");
    expect(leftWhisker?.boundaries.left.from).toBe("•");
    expect(leftWhisker?.boundaries.right.to).toBe("★");

    const rightWhisker = whiskerRightCell(equipment, idCellDot, constStarPro);
    expect(rightWhisker).toBeDefined();
    expect(rightWhisker?.source.leftBoundary).toBe("•");
    expect(rightWhisker?.target.rightBoundary).toBe("★");
    expect(rightWhisker?.boundaries.left.from).toBe("•");
    expect(rightWhisker?.boundaries.right.to).toBe("★");

    const whiskerGuard = whiskerLeftCell(equipment, idStar, constStarCell);
    expect(whiskerGuard).toBeUndefined();

    const identityJuxtaposition = juxtaposeIdentityProarrows(
      equipment,
      ["•", "★"] as const,
    );
    expect(identityJuxtaposition).toHaveLength(2);
    const [firstIdentity, secondIdentity] = identityJuxtaposition;
    if (!firstIdentity || !secondIdentity) {
      throw new Error("Expected identity proarrows for both objects.");
    }
    expect(firstIdentity.from).toBe("•");
    expect(secondIdentity.to).toBe("★");

    const frame = frameFromSequence(identityJuxtaposition, "•", "★");
    expect(frame.leftBoundary).toBe("•");
    expect(frame.rightBoundary).toBe("★");
  });

  test("loose monoid analyzer enforces Definition 2.16 framing", () => {
    const samples: FunctorCheckSamples<TwoObjects, TwoArrows> = {
      objects: TwoObjectCategory.objects,
      composablePairs: [
        { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
      ],
    };

    const { equipment } = buildTwoObjectEquipment(samples);

    const looseCell = identityProarrow(equipment, "•");
    const identityBoundary: TightEvidence = {
      kind: "tight",
      cell: equipment.tight.identity2(equipment.tight.identity),
    };

    const multiplication = {
      source: frameFromSequence([looseCell, looseCell], "•", "•"),
      target: frameFromProarrow(looseCell),
      boundaries: {
        left: identityVerticalBoundary(equipment, "•"),
        right: identityVerticalBoundary(equipment, "•"),
      },
      evidence: identityBoundary,
    } satisfies Equipment2Cell<TwoObjects, TwoArrows, TightPayload, TightEvidence>;

    const unitSource = identityProarrow(equipment, "•");
    const unit = {
      source: frameFromProarrow(unitSource),
      target: frameFromProarrow(looseCell),
      boundaries: {
        left: identityVerticalBoundary(equipment, "•"),
        right: identityVerticalBoundary(equipment, "•"),
      },
      evidence: identityBoundary,
    } satisfies Equipment2Cell<TwoObjects, TwoArrows, TightPayload, TightEvidence>;

    const rootObject: TwoObject = "•";

    const analysis = analyzeLooseMonoidShape<
      TwoObjects,
      TwoArrows,
      TightPayload,
      TightEvidence
    >(equipment, {
      object: rootObject,
      looseCell,
      multiplication,
      unit,
    });

    expect(analysis.holds).toBe(true);
    expect(analysis.details).toContain("Loose monoid satisfies");

    const failingUnit = {
      ...unit,
      boundaries: {
        ...unit.boundaries,
        right: identityVerticalBoundary(equipment, "★"),
      },
    };

    const failingAnalysis = analyzeLooseMonoidShape<
      TwoObjects,
      TwoArrows,
      TightPayload,
      TightEvidence
    >(equipment, {
      object: rootObject,
      looseCell,
      multiplication,
      unit: failingUnit,
    });

    expect(failingAnalysis.holds).toBe(false);
    expect(
      failingAnalysis.issues.some((issue: string) =>
        issue.includes("Unit right boundary"),
      ),
    ).toBe(true);
  });

  test("representable right loose adjoint certifies the left loose map", () => {
    const samples: FunctorCheckSamples<TwoObjects, TwoArrows> = {
      objects: TwoObjectCategory.objects,
      composablePairs: [
        { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
      ],
    };

    const { equipment, tightLayer } = buildTwoObjectEquipment(samples);

    const left = identityProarrow(equipment, "•");
    const right = identityProarrow(equipment, "•");
    const identityBoundary: TightEvidence = {
      kind: "tight",
      cell: equipment.tight.identity2(equipment.tight.identity),
    };

    const unitBoundaries = {
      left: identityVerticalBoundary(equipment, "•"),
      right: identityVerticalBoundary(equipment, "•"),
    } as const;

    const unit: Equipment2Cell<TwoObjects, TwoArrows, TightPayload, TightEvidence> = {
      source: frameFromProarrow(identityProarrow(equipment, "•")),
      target: frameFromSequence([right, left], "•", "•"),
      boundaries: unitBoundaries,
      evidence: identityBoundary,
    };

    const counit: Equipment2Cell<TwoObjects, TwoArrows, TightPayload, TightEvidence> = {
      source: frameFromSequence([left, right], "•", "•"),
      target: frameFromProarrow(identityProarrow(equipment, "•")),
      boundaries: unitBoundaries,
      evidence: identityBoundary,
    };

    const rightRestriction = equipment.restrictions.right(
      identityProarrow(equipment, "•"),
      tightLayer.identity,
    );
    if (!rightRestriction) {
      throw new Error("Expected right restriction to exist for the identity tight cell.");
    }

    const analysisInput = {
      left,
      right,
      unit,
      counit,
      ...(rightRestriction.representability
        ? { rightRepresentability: rightRestriction.representability }
        : {}),
    } as const;

    const analysis = analyzeLooseAdjunction(equipment, analysisInput);

    expect(analysis.holds).toBe(true);
    expect(analysis.leftIsMap).toBe(true);
    expect(analysis.details).toContain("representable");

    const withoutWitness = analyzeLooseAdjunction(equipment, {
      left,
      right,
      unit,
      counit,
    });

    expect(withoutWitness.leftIsMap).toBe(false);
    expect(withoutWitness.details).toContain("no representability witness");
  });

  test("right extension and right lift analyzers validate identity cases", () => {
    const samples: FunctorCheckSamples<TwoObjects, TwoArrows> = {
      objects: TwoObjectCategory.objects,
      composablePairs: [
        { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
      ],
    };

    const { equipment, tightLayer } = buildTwoObjectEquipment(samples);

    const loose = identityProarrow(equipment, "•");
    const tightIdentity = tightLayer.identity;
    const identityBoundary: TightEvidence = {
      kind: "tight",
      cell: equipment.tight.identity2(equipment.tight.identity),
    };

    const identityLoose = identityProarrow(equipment, "•");
    const compositeFrame = frameFromSequence([identityLoose, loose], "•", "•");
    const identityBoundaries = {
      left: identityVerticalBoundary(equipment, "•"),
      right: identityVerticalBoundary(equipment, "•"),
    } as const;

    const counit = {
      source: frameFromProarrow(loose),
      target: compositeFrame,
      boundaries: identityBoundaries,
      evidence: identityBoundary,
    } satisfies Equipment2Cell<TwoObjects, TwoArrows, TightPayload, TightEvidence>;

    const unit = {
      source: compositeFrame,
      target: frameFromProarrow(loose),
      boundaries: identityBoundaries,
      evidence: identityBoundary,
    } satisfies Equipment2Cell<TwoObjects, TwoArrows, TightPayload, TightEvidence>;

    const extensionData = {
      loose,
      along: tightIdentity,
      extension: loose,
      counit,
    } as const;
    const extensionAnalysis = analyzeRightExtension(equipment, extensionData);
    expect(extensionAnalysis.holds).toBe(true);
    expect(extensionAnalysis.details).toContain("Right extension");

    const liftData = {
      loose,
      along: tightIdentity,
      lift: loose,
      unit,
    } as const;
    const liftAnalysis = analyzeRightLift(equipment, liftData);
    expect(liftAnalysis.holds).toBe(true);
    expect(liftAnalysis.details).toContain("Right lift");

    const compatibility = analyzeRightExtensionLiftCompatibility(equipment, {
      extension: extensionData,
      lift: liftData,
    });
    expect(compatibility.holds).toBe(true);
  });
});
