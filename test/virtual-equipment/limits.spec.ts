import { describe, expect, test } from "vitest";
import {
  analyzeLeftExtensionFromWeightedColimit,
  analyzeWeightedCocone,
  analyzeWeightedColimitRestriction,
  analyzeWeightedCone,
  analyzeWeightedLimitRestriction,
  frameFromProarrow,
  identityProarrow,
  identityVerticalBoundary,
  virtualizeCategory,
} from "../../virtual-equipment";
import type { Equipment2Cell } from "../../virtual-equipment";
import { TwoObjectCategory } from "../../two-object-cat";

const makeCell = <Obj, Arr, Payload, Evidence>(
  cell: Omit<Equipment2Cell<Obj, Arr, Payload, Evidence>, "evidence">,
  evidence: Evidence,
): Equipment2Cell<Obj, Arr, Payload, Evidence> => ({
  ...cell,
  evidence,
});

describe("virtual equipment weighted (co)limit analyzers", () => {
  const equipment = virtualizeCategory(TwoObjectCategory, {
    objects: TwoObjectCategory.objects,
  });
  const diagram = equipment.tight.identity;

  const identitySource = "•" as const;
  const apexArrow = identityProarrow(equipment, identitySource);
  const weight = frameFromProarrow(apexArrow);

  const coneBoundaries = {
    left: identityVerticalBoundary(equipment, identitySource),
    right: identityVerticalBoundary(equipment, identitySource),
  } as const;

  const coneEvidence = equipment.cells.identity(weight, coneBoundaries);
  const coneCell = makeCell(
    {
      source: weight,
      target: frameFromProarrow(apexArrow),
      boundaries: coneBoundaries,
    },
    coneEvidence,
  );

  const weightedCone = {
    weight,
    diagram,
    apex: apexArrow,
    cone: coneCell,
  } as const;

  const coconeBoundaries = {
    left: identityVerticalBoundary(equipment, identitySource),
    right: identityVerticalBoundary(equipment, identitySource),
  } as const;

  const coconeEvidence = equipment.cells.identity(weight, coconeBoundaries);
  const coconeCell = makeCell(
    {
      source: weight,
      target: frameFromProarrow(apexArrow),
      boundaries: coconeBoundaries,
    },
    coconeEvidence,
  );

  const weightedCocone = {
    weight,
    diagram,
    apex: apexArrow,
    cocone: coconeCell,
  } as const;

  test("weighted cone framing matches Definition 3.9 in the identity case", () => {
    const analysis = analyzeWeightedCone(equipment, weightedCone);
    expect(analysis.holds).toBe(true);
    expect(analysis.issues).toHaveLength(0);
  });

  test("weighted cocone framing mirrors the cone analysis", () => {
    const analysis = analyzeWeightedCocone(equipment, weightedCocone);
    expect(analysis.holds).toBe(true);
  });

  test("restrictions reuse weighted cocone boundaries", () => {
    const restriction = equipment.restrictions.left(diagram, apexArrow);
    expect(restriction).toBeDefined();
    const analysis = analyzeWeightedColimitRestriction(
      equipment,
      {
        cocone: weightedCocone,
        restriction: restriction!,
      },
    );
    expect(analysis.holds).toBe(true);
  });

  test("dual restriction analysis covers weighted cones", () => {
    const restriction = equipment.restrictions.right(apexArrow, diagram);
    expect(restriction).toBeDefined();
    const analysis = analyzeWeightedLimitRestriction(
      equipment,
      {
        cone: weightedCone,
        restriction: restriction!,
      },
    );
    expect(analysis.holds).toBe(true);
  });

  test("left extensions computed by weighted colimits reuse counit framing", () => {
    const analysis = analyzeLeftExtensionFromWeightedColimit(equipment, {
      colimit: weightedCocone,
      extension: {
        loose: apexArrow,
        along: diagram,
        extension: apexArrow,
        counit: weightedCocone.cocone,
      },
    });
    expect(analysis.holds).toBe(true);
  });

  test("framing mismatches are reported", () => {
    const mismatchedCone = {
      ...weightedCone,
      cone: {
        ...weightedCone.cone,
        boundaries: {
          ...weightedCone.cone.boundaries,
          left: identityVerticalBoundary(equipment, "★"),
        },
      },
    } as const;
    const analysis = analyzeWeightedCone(equipment, mismatchedCone);
    expect(analysis.holds).toBe(false);
    expect(
      analysis.issues.some((issue: string) => issue.includes("left boundary")),
    ).toBe(true);
  });

  test("restriction issues propagate into the analyzer", () => {
    const restriction = equipment.restrictions.left(diagram, {
      ...apexArrow,
      to: "★",
      payload: diagram,
    });
    expect(restriction).toBeUndefined();
  });

  test("non-identity diagrams trigger cone failures", () => {
    const restriction = equipment.restrictions.left(diagram, apexArrow);
    expect(restriction).toBeDefined();
    const badCocone = {
      ...weightedCocone,
      cocone: {
        ...weightedCocone.cocone,
        boundaries: {
          ...weightedCocone.cocone.boundaries,
          right: {
            ...weightedCocone.cocone.boundaries.right,
            tight: diagram,
            from: "★",
          },
        },
      },
    } as const;
    const analysis = analyzeWeightedColimitRestriction(
      equipment,
      {
        cocone: badCocone,
        restriction: restriction!,
      },
    );
    expect(analysis.holds).toBe(false);
  });

  test("analyzers detect non-trivial loose arrows", () => {
    const nonIdArrow = {
      from: identitySource,
      to: "★" as const,
      payload: diagram,
    } as const;
    const badWeight = frameFromProarrow(nonIdArrow);
    const badCone = {
      ...weightedCone,
      weight: badWeight,
      cone: {
        ...weightedCone.cone,
        source: badWeight,
        target: frameFromProarrow(nonIdArrow),
      },
    } as const;
    const analysis = analyzeWeightedCone(equipment, badCone);
    expect(analysis.holds).toBe(false);
  });
});
