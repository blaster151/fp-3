import { describe, expect, test } from "vitest";
import {
  analyzeFullyFaithfulLeftExtension,
  analyzeFullyFaithfulTight1Cell,
  analyzePointwiseLeftExtensionLiftCorrespondence,
  frameFromProarrow,
  identityProarrow,
  identityVerticalBoundary,
  virtualizeCategory,
} from "../../virtual-equipment";
import type {
  Equipment2Cell,
  TightCellEvidence,
} from "../../virtual-equipment";
import type { RightExtensionData, RightLiftData } from "../../virtual-equipment/extensions";
import type { LeftExtensionFromColimitData } from "../../virtual-equipment/limits";
import type { TwoArrow, TwoObject } from "../../two-object-cat";
import { TwoObjectCategory } from "../../two-object-cat";

const makeCell = <Obj, Arr, Payload, Evidence>(
  cell: Omit<Equipment2Cell<Obj, Arr, Payload, Evidence>, "evidence">,
  evidence: Evidence,
): Equipment2Cell<Obj, Arr, Payload, Evidence> => ({
  ...cell,
  evidence,
});

describe("virtual equipment faithfulness analyzers", () => {
  const equipment = virtualizeCategory(TwoObjectCategory, {
    objects: TwoObjectCategory.objects,
  });
  const identityTight = equipment.tight.identity;
  const object: TwoObject = "•";
  const other: TwoObject = "★";

  test("analyzeFullyFaithfulTight1Cell succeeds for the identity functor", () => {
    const analysis = analyzeFullyFaithfulTight1Cell(equipment, {
      tight: identityTight,
      domain: object,
      codomain: object,
    });

    expect(analysis.holds).toBe(true);
    expect(analysis.issues).toHaveLength(0);
  });

  test("analyzeFullyFaithfulTight1Cell reports domain/codomain mismatches", () => {
    const analysis = analyzeFullyFaithfulTight1Cell(equipment, {
      tight: identityTight,
      domain: other,
      codomain: object,
    });

    expect(analysis.holds).toBe(false);
    expect(analysis.issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Left restriction should originate"),
      ]),
    );
  });

  test("pointwise left extension and lift correspondence matches framing", () => {
    const loose = identityProarrow(equipment, object);
    const weight = frameFromProarrow(loose);
    const boundaries = {
      left: identityVerticalBoundary(equipment, object),
      right: identityVerticalBoundary(equipment, object),
    } as const;
    const evidence = equipment.cells.identity(weight, boundaries);

    const coconeCell = makeCell(
      {
        source: weight,
        target: frameFromProarrow(loose),
        boundaries,
      },
      evidence,
    );

    const weighted: LeftExtensionFromColimitData<
      TwoObject,
      TwoArrow,
      typeof loose.payload,
      TightCellEvidence<TwoObject, TwoArrow>
    > = {
      colimit: {
        weight,
        diagram: identityTight,
        apex: loose,
        cocone: coconeCell,
      },
      extension: {
        loose,
        along: identityTight,
        extension: loose,
        counit: coconeCell,
      },
    };

    const liftUnit = makeCell(
      {
        source: frameFromProarrow(loose),
        target: frameFromProarrow(loose),
        boundaries,
      },
      equipment.cells.identity(frameFromProarrow(loose), boundaries),
    );

    const lift: RightLiftData<
      TwoObject,
      TwoArrow,
      typeof loose.payload,
      TightCellEvidence<TwoObject, TwoArrow>
    > = {
      loose,
      along: identityTight,
      lift: loose,
      unit: liftUnit,
    };

    const analysis = analyzePointwiseLeftExtensionLiftCorrespondence(equipment, {
      extension: weighted,
      lift,
    });

    expect(analysis.holds).toBe(true);
    expect(analysis.issues).toHaveLength(0);
  });

  test("pointwise left extension detects mismatched lift boundaries", () => {
    const loose = identityProarrow(equipment, object);
    const weight = frameFromProarrow(loose);
    const boundaries = {
      left: identityVerticalBoundary(equipment, object),
      right: identityVerticalBoundary(equipment, object),
    } as const;
    const evidence = equipment.cells.identity(weight, boundaries);

    const coconeCell = makeCell(
      {
        source: weight,
        target: frameFromProarrow(loose),
        boundaries,
      },
      evidence,
    );

    const extension: LeftExtensionFromColimitData<
      TwoObject,
      TwoArrow,
      typeof loose.payload,
      TightCellEvidence<TwoObject, TwoArrow>
    > = {
      colimit: {
        weight,
        diagram: identityTight,
        apex: loose,
        cocone: coconeCell,
      },
      extension: {
        loose,
        along: identityTight,
        extension: loose,
        counit: coconeCell,
      },
    };

    const mismatchedBoundaries = {
      left: { ...boundaries.left, from: other },
      right: boundaries.right,
    } as const;
    const badUnit = makeCell(
      {
        source: frameFromProarrow(loose),
        target: frameFromProarrow(loose),
        boundaries: mismatchedBoundaries,
      },
      equipment.cells.identity(frameFromProarrow(loose), mismatchedBoundaries),
    );

    const lift: RightLiftData<
      TwoObject,
      TwoArrow,
      typeof loose.payload,
      TightCellEvidence<TwoObject, TwoArrow>
    > = {
      loose,
      along: identityTight,
      lift: loose,
      unit: badUnit,
    };

    const analysis = analyzePointwiseLeftExtensionLiftCorrespondence(equipment, {
      extension,
      lift,
    });

    expect(analysis.holds).toBe(false);
    expect(analysis.issues.some(issue => issue.includes("Left lift unit left boundary"))).toBe(true);
  });

  test("fully faithful left extension accepts identity inverse", () => {
    const loose = identityProarrow(equipment, object);
    const weight = frameFromProarrow(loose);
    const boundaries = {
      left: identityVerticalBoundary(equipment, object),
      right: identityVerticalBoundary(equipment, object),
    } as const;
    const evidence = equipment.cells.identity(weight, boundaries);

    const counit = makeCell(
      {
        source: weight,
        target: frameFromProarrow(loose),
        boundaries,
      },
      evidence,
    );

    const extension: RightExtensionData<
      TwoObject,
      TwoArrow,
      typeof loose.payload,
      TightCellEvidence<TwoObject, TwoArrow>
    > = {
      loose,
      along: identityTight,
      extension: loose,
      counit,
    };

    const analysis = analyzeFullyFaithfulLeftExtension(equipment, {
      fullyFaithful: {
        tight: identityTight,
        domain: object,
        codomain: object,
      },
      extension,
      inverse: counit,
    });

    expect(analysis.holds).toBe(true);
    expect(analysis.issues).toHaveLength(0);
  });

  test("fully faithful left extension flags incompatible inverse boundaries", () => {
    const loose = identityProarrow(equipment, object);
    const weight = frameFromProarrow(loose);
    const boundaries = {
      left: identityVerticalBoundary(equipment, object),
      right: identityVerticalBoundary(equipment, object),
    } as const;
    const evidence = equipment.cells.identity(weight, boundaries);

    const counit = makeCell(
      {
        source: weight,
        target: frameFromProarrow(loose),
        boundaries,
      },
      evidence,
    );

    const extension: RightExtensionData<
      TwoObject,
      TwoArrow,
      typeof loose.payload,
      TightCellEvidence<TwoObject, TwoArrow>
    > = {
      loose,
      along: identityTight,
      extension: loose,
      counit,
    };

    const badInverse = makeCell(
      {
        source: counit.target,
        target: counit.source,
        boundaries: {
          left: { ...counit.boundaries.left, from: other },
          right: counit.boundaries.right,
        },
      },
      counit.evidence,
    );

    const analysis = analyzeFullyFaithfulLeftExtension(equipment, {
      fullyFaithful: {
        tight: identityTight,
        domain: object,
        codomain: object,
      },
      extension,
      inverse: badInverse,
    });

    expect(analysis.holds).toBe(false);
    expect(analysis.issues.some(issue => issue.includes("Inverse 2-cell should share"))).toBe(true);
  });
});
