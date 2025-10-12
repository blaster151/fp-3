import { describe, expect, test } from "vitest";
import { composeFun } from "../../allTS";
import type { Functor } from "../../functor";
import type {
  Equipment2Cell,
  EquipmentProarrow,
  TightCellEvidence,
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
      },
    );

    expect(report.holds).toBe(true);
    expect(catFunctor.onObj("•")).toBe("•");
    expect(catFunctor.onMor(nonIdentity)).toBe(nonIdentity);

    const roundTripped = demoteFunctor(catFunctor);
    expect(roundTripped.F0("★")).toBe("★");
    expect(roundTripped.F1(nonIdentity)).toBe(nonIdentity);
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
    const samples = {
      objects: TwoObjectCategory.objects,
      composablePairs: [
        { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
        { f: nonIdentity, g: TwoObjectCategory.id("•") },
      ],
    } as const;

    const { functor: idFunctor } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      {
        F0: (obj: TwoObject) => obj,
        F1: (arrow: TwoArrow) => arrow,
      },
      samples,
    );

    const constantStar: Functor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
      F0: () => "★",
      F1: () => TwoObjectCategory.id("★"),
    };
    const { functor: constStarFunctor } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      constantStar,
      samples,
    );

    const constantDot: Functor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
      F0: () => "•",
      F1: () => TwoObjectCategory.id("•"),
    };
    const { functor: constDotFunctor } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      constantDot,
      samples,
    );

    const tightLayer = defaultTightLayer(
      TwoObjectCategory,
      idFunctor,
      (g: TwoArrow, f: TwoArrow) => composeFun(g, f),
    );
    const equipment = virtualiseTightCategory(
      tightLayer,
      TwoObjectCategory.objects,
      (left: TwoObject, right: TwoObject) => left === right,
    );

    const idDot = identityProarrow(equipment, "•");
    const idStar = identityProarrow(equipment, "★");
    const constStarPro: EquipmentProarrow<TwoObject, typeof constStarFunctor> = {
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
    expect(identityRestriction).toBeDefined();
    expect(identityRestriction?.cartesian.cartesian).toBe(true);
    expect(identityRestriction?.cartesian.boundary.direction).toBe("left");
    expect(identityRestriction?.cartesian.boundary.vertical.from).toBe("•");
    expect(identityRestriction?.cartesian.boundary.vertical.to).toBe("•");
    expect(identityRestriction?.cartesian.boundary.details).toContain("restriction");
    expect(identityRestriction?.cartesian.evidence.kind).toBe("cartesian");
    expect(identityRestriction?.cartesian.evidence.boundary.from).toBe("•");
    expect(identityRestriction?.representability?.orientation).toBe("left");
    expect(identityRestriction?.representability?.object).toBe("•");

    const leftRestrictionConstStar = equipment.restrictions.left(
      constStarFunctor,
      idStar,
    );
    expect(leftRestrictionConstStar).toBeDefined();
    expect(leftRestrictionConstStar?.restricted.from).toBe("•");
    expect(leftRestrictionConstStar?.restricted.to).toBe("★");
    expect(
      leftRestrictionConstStar?.cartesian.boundary.vertical.details,
    ).toContain("tight 1-cell");
    expect(leftRestrictionConstStar?.representability?.orientation).toBe("left");

    const leftRestrictionConstDot = equipment.restrictions.left(
      constDotFunctor,
      idDot,
    );
    expect(leftRestrictionConstDot).toBeDefined();
    expect(leftRestrictionConstDot?.restricted.from).toBe("•");
    expect(leftRestrictionConstDot?.restricted.to).toBe("•");
    expect(leftRestrictionConstDot?.representability?.orientation).toBe("left");

    const failedRestriction = equipment.restrictions.left(
      constStarFunctor,
      idDot,
    );
    expect(failedRestriction).toBeUndefined();

    const identityConjointRestriction = equipment.restrictions.right(
      idStar,
      tightLayer.identity,
    );
    expect(identityConjointRestriction).toBeDefined();
    expect(identityConjointRestriction?.cartesian.boundary.direction).toBe("right");
    expect(identityConjointRestriction?.cartesian.boundary.vertical.from).toBe("★");
    expect(identityConjointRestriction?.cartesian.evidence.kind).toBe("cartesian");
    expect(identityConjointRestriction?.cartesian.evidence.boundary.from).toBe("★");
    expect(identityConjointRestriction?.representability?.orientation).toBe("right");

    const rightRestrictionConstStar = equipment.restrictions.right(
      idDot,
      constStarFunctor,
    );
    expect(rightRestrictionConstStar).toBeDefined();
    expect(rightRestrictionConstStar?.restricted.to).toBe("★");
    expect(rightRestrictionConstStar?.cartesian.boundary.vertical.to).toBe("★");
    expect(rightRestrictionConstStar?.representability?.orientation).toBe("right");

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

    const identityJuxtaposition = juxtaposeIdentityProarrows(equipment, ["•", "★"]);
    expect(identityJuxtaposition).toHaveLength(2);
    expect(identityJuxtaposition[0].from).toBe("•");
    expect(identityJuxtaposition[1].to).toBe("★");

    const frame = frameFromSequence(identityJuxtaposition, "•", "★");
    expect(frame.leftBoundary).toBe("•");
    expect(frame.rightBoundary).toBe("★");
  });

  test("loose monoid analyzer enforces Definition 2.16 framing", () => {
    const samples = {
      objects: TwoObjectCategory.objects,
      composablePairs: [
        { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
      ],
    } as const;

    const { functor: idFunctor } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      {
        F0: (object: TwoObject) => object,
        F1: (arrow: TwoArrow) => arrow,
      },
      samples,
    );

    const tightLayer = defaultTightLayer(
      TwoObjectCategory,
      idFunctor,
      (g: TwoArrow, f: TwoArrow) => composeFun(g, f),
    );

    const equipment = virtualiseTightCategory(
      tightLayer,
      TwoObjectCategory.objects,
      (left: TwoObject, right: TwoObject) => left === right,
    );

    const looseCell = identityProarrow(equipment, "•");
    const identityBoundary: TightCellEvidence<TwoObject, TwoArrow> = {
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
    } satisfies Equipment2Cell<TwoObject, TwoArrow, typeof looseCell.payload, TightCellEvidence<TwoObject, TwoArrow>>;

    const unitSource = identityProarrow(equipment, "•");
    const unit = {
      source: frameFromProarrow(unitSource),
      target: frameFromProarrow(looseCell),
      boundaries: {
        left: identityVerticalBoundary(equipment, "•"),
        right: identityVerticalBoundary(equipment, "•"),
      },
      evidence: identityBoundary,
    } satisfies Equipment2Cell<TwoObject, TwoArrow, typeof looseCell.payload, TightCellEvidence<TwoObject, TwoArrow>>;

    const analysis = analyzeLooseMonoidShape(equipment, {
      object: "•",
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

    const failingAnalysis = analyzeLooseMonoidShape(equipment, {
      object: "•",
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
    const samples = {
      objects: TwoObjectCategory.objects,
      composablePairs: [
        { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
      ],
    } as const;

    const { functor: idFunctor } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      {
        F0: (object: TwoObject) => object,
        F1: (arrow: TwoArrow) => arrow,
      },
      samples,
    );

    const tightLayer = defaultTightLayer(
      TwoObjectCategory,
      idFunctor,
      (g: TwoArrow, f: TwoArrow) => composeFun(g, f),
    );

    const equipment = virtualiseTightCategory(
      tightLayer,
      TwoObjectCategory.objects,
      (left: TwoObject, right: TwoObject) => left === right,
    );

    const left = identityProarrow(equipment, "•");
    const right = identityProarrow(equipment, "•");
    const identityBoundary: TightCellEvidence<TwoObject, TwoArrow> = {
      kind: "tight",
      cell: equipment.tight.identity2(equipment.tight.identity),
    };

    const unitBoundaries = {
      left: identityVerticalBoundary(equipment, "•"),
      right: identityVerticalBoundary(equipment, "•"),
    } as const;

    const unit: Equipment2Cell<TwoObject, TwoArrow, typeof left.payload, TightCellEvidence<TwoObject, TwoArrow>> = {
      source: frameFromProarrow(identityProarrow(equipment, "•")),
      target: frameFromSequence([right, left], "•", "•"),
      boundaries: unitBoundaries,
      evidence: identityBoundary,
    };

    const counit: Equipment2Cell<TwoObject, TwoArrow, typeof left.payload, TightCellEvidence<TwoObject, TwoArrow>> = {
      source: frameFromSequence([left, right], "•", "•"),
      target: frameFromProarrow(identityProarrow(equipment, "•")),
      boundaries: unitBoundaries,
      evidence: identityBoundary,
    };

    const rightRestriction = equipment.restrictions.right(
      identityProarrow(equipment, "•"),
      tightLayer.identity,
    );

    const analysis = analyzeLooseAdjunction(equipment, {
      left,
      right,
      unit,
      counit,
      rightRepresentability: rightRestriction?.representability,
    });

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
    const samples = {
      objects: TwoObjectCategory.objects,
      composablePairs: [
        { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
      ],
    } as const;

    const { functor: idFunctor } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      {
        F0: (object: TwoObject) => object,
        F1: (arrow: TwoArrow) => arrow,
      },
      samples,
    );

    const tightLayer = defaultTightLayer(
      TwoObjectCategory,
      idFunctor,
      (g: TwoArrow, f: TwoArrow) => composeFun(g, f),
    );

    const equipment = virtualiseTightCategory(
      tightLayer,
      TwoObjectCategory.objects,
      (left: TwoObject, right: TwoObject) => left === right,
    );

    const loose = identityProarrow(equipment, "•");
    const tightIdentity = tightLayer.identity;
    const identityBoundary: TightCellEvidence<TwoObject, TwoArrow> = {
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
    } satisfies Equipment2Cell<
      TwoObject,
      TwoArrow,
      typeof loose.payload,
      TightCellEvidence<TwoObject, TwoArrow>
    >;

    const unit = {
      source: compositeFrame,
      target: frameFromProarrow(loose),
      boundaries: identityBoundaries,
      evidence: identityBoundary,
    } satisfies Equipment2Cell<
      TwoObject,
      TwoArrow,
      typeof loose.payload,
      TightCellEvidence<TwoObject, TwoArrow>
    >;

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
