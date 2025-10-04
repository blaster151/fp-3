import { describe, expect, test } from "vitest";
import {
  analyzeAbsoluteColimitWitness,
  analyzeDensityViaIdentityRestrictions,
  analyzeLeftExtensionPreservesAbsolute,
  analyzePointwiseLeftLift,
  frameFromProarrow,
  identityProarrow,
  identityVerticalBoundary,
  virtualizeCategory,
} from "../../virtual-equipment";
import type {
  Equipment2Cell,
  EquipmentCartesian2Cell,
  TightCellEvidence,
} from "../../virtual-equipment";
import type { TwoArrow, TwoObject } from "../../two-object-cat";
import { TwoObjectCategory } from "../../two-object-cat";
import type {
  LeftExtensionFromColimitData,
  WeightedCoconeData,
  WeightedConeData,
} from "../../virtual-equipment/limits";
import type { RightLiftData } from "../../virtual-equipment/extensions";

const makeCell = <Obj, Arr, Payload, Evidence>(
  cell: Omit<Equipment2Cell<Obj, Arr, Payload, Evidence>, "evidence">,
  evidence: Evidence,
): Equipment2Cell<Obj, Arr, Payload, Evidence> => ({
  ...cell,
  evidence,
});

describe("virtual equipment density and absoluteness analyzers", () => {
  const equipment = virtualizeCategory(TwoObjectCategory, {
    objects: TwoObjectCategory.objects,
  });
  const diagram = equipment.tight.identity;
  const identitySource: TwoObject = "•";

  const identityArrow = identityProarrow(equipment, identitySource);
  const weight = frameFromProarrow(identityArrow);

  const boundaries = {
    left: identityVerticalBoundary(equipment, identitySource),
    right: identityVerticalBoundary(equipment, identitySource),
  } as const;

  const evidence = equipment.cells.identity(weight, boundaries);
  const coconeCell = makeCell(
    {
      source: weight,
      target: frameFromProarrow(identityArrow),
      boundaries,
    },
    evidence,
  );

  const weightedCocone: WeightedCoconeData<
    TwoObject,
    TwoArrow,
    typeof identityArrow.payload,
    TightCellEvidence<TwoObject, TwoArrow>
  > = {
    weight,
    diagram,
    apex: identityArrow,
    cocone: coconeCell,
  };

  const comparison: EquipmentCartesian2Cell<
    TwoObject,
    TwoArrow,
    typeof identityArrow.payload,
    TightCellEvidence<TwoObject, TwoArrow>
  > = {
    source: weightedCocone.cocone.source,
    target: weightedCocone.cocone.target,
    boundaries: weightedCocone.cocone.boundaries,
    evidence: weightedCocone.cocone.evidence,
    cartesian: true,
    boundary: {
      direction: "left",
      vertical: weightedCocone.cocone.boundaries.left,
      details: "Identity example of a left-opcartesian comparison cell.",
    },
  };

  const extensionCounit = makeCell(
    {
      source: weight,
      target: frameFromProarrow(identityArrow),
      boundaries,
    },
    evidence,
  );

  const extensionData: LeftExtensionFromColimitData<
    TwoObject,
    TwoArrow,
    typeof identityArrow.payload,
    TightCellEvidence<TwoObject, TwoArrow>
  > = {
    colimit: weightedCocone,
    extension: {
      loose: identityArrow,
      along: diagram,
      extension: identityArrow,
      counit: extensionCounit,
    },
  };

  const loose = identityArrow;

  const compositeFrame = frameFromProarrow(loose);
  const identityBoundaries = {
    left: identityVerticalBoundary(equipment, identitySource),
    right: identityVerticalBoundary(equipment, identitySource),
  } as const;

  const unitEvidence = equipment.cells.identity(compositeFrame, identityBoundaries);

  const liftUnit = makeCell(
    {
      source: compositeFrame,
      target: frameFromProarrow(loose),
      boundaries: identityBoundaries,
    },
    unitEvidence,
  );

  const liftData: RightLiftData<
    TwoObject,
    TwoArrow,
    typeof identityArrow.payload,
    TightCellEvidence<TwoObject, TwoArrow>
  > = {
    loose,
    along: diagram,
    lift: loose,
    unit: liftUnit,
  };

  const weightedCone: WeightedConeData<
    TwoObject,
    TwoArrow,
    typeof identityArrow.payload,
    TightCellEvidence<TwoObject, TwoArrow>
  > = {
    weight,
    diagram,
    apex: loose,
    cone: makeCell(
      {
        source: weight,
        target: frameFromProarrow(loose),
        boundaries,
      },
      evidence,
    ),
  };

  test("density via identity restrictions recognises representability", () => {
    const analysis = analyzeDensityViaIdentityRestrictions(equipment, {
      object: identitySource,
      tight: diagram,
    });
    expect(analysis.holds).toBe(true);
    expect(analysis.issues).toHaveLength(0);
  });

  test("absolute colimit witness aligns with the weighted cocone", () => {
    const analysis = analyzeAbsoluteColimitWitness(equipment, {
      j: diagram,
      f: diagram,
      colimit: weightedCocone,
      comparison,
    });
    expect(analysis.holds).toBe(true);
  });

  test("left extensions preserve absolute colimits in the identity case", () => {
    const analysis = analyzeLeftExtensionPreservesAbsolute(equipment, {
      absolute: {
        j: diagram,
        f: diagram,
        colimit: weightedCocone,
        comparison,
      },
      extension: extensionData,
    });
    expect(analysis.holds).toBe(true);
  });

  test("pointwise left lift falls back on the right lift framing", () => {
    const analysis = analyzePointwiseLeftLift(equipment, {
      lift: liftData,
      along: diagram,
      cone: weightedCone,
    });
    expect(analysis.holds).toBe(true);
  });

  test("comparison mismatches surface absolute colimit issues", () => {
    const badComparison = {
      ...comparison,
      boundaries: {
        ...comparison.boundaries,
        right: identityVerticalBoundary(equipment, "★"),
      },
    };
    const analysis = analyzeAbsoluteColimitWitness(equipment, {
      j: diagram,
      f: diagram,
      colimit: weightedCocone,
      comparison: badComparison,
    });
    expect(analysis.holds).toBe(false);
    expect(
      analysis.issues.some((issue: string) => issue.includes("right boundary")),
    ).toBe(true);
  });

  test("pointwise left lift detects mismatched tight cells", () => {
    const analysis = analyzePointwiseLeftLift(equipment, {
      lift: liftData,
      along: equipment.tight.identity,
      cone: weightedCone,
    });
    expect(analysis.holds).toBe(true);

    const mismatched = analyzePointwiseLeftLift(equipment, {
      lift: liftData,
      along: equipment.tight.identity,
      cone: {
        ...weightedCone,
        cone: {
          ...weightedCone.cone,
          target: frameFromProarrow(identityProarrow(equipment, "★")),
        },
      },
    });
    expect(mismatched.holds).toBe(false);
  });
});
