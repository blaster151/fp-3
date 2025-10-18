import { describe, expect, test } from "vitest";
import {
  composeHorizontalChain,
  evaluateStreetComparison,
  identityCell,
  identityProarrow,
  virtualizeCategory,
} from "../../virtual-equipment";
import { TwoObjectCategory } from "../../two-object-cat";

describe("virtual equipment Street calculus comparisons", () => {
  const equipment = virtualizeCategory(TwoObjectCategory, {
    objects: TwoObjectCategory.objects,
  });

  const idDot = identityProarrow(equipment, "•");
  const idStar = identityProarrow(equipment, "★");
  const idCellDot = identityCell(equipment, idDot);
  const idCellStar = identityCell(equipment, idStar);

  test("chains with matching composites report success", () => {
    const comparison = evaluateStreetComparison(
      equipment,
      [idCellDot],
      [idCellDot],
      "identity chain",
    );
    expect(comparison.holds).toBe(true);
    expect(comparison.issues).toHaveLength(0);
    expect(comparison.red).toBeDefined();
    expect(comparison.green).toBeDefined();
  });

  test("horizontal chain highlights mismatched boundaries", () => {
    const evaluation = composeHorizontalChain(
      equipment,
      [idCellDot, idCellStar],
      "boundary check",
    );
    expect(evaluation.holds).toBe(false);
    expect(
      evaluation.issues.some((issue: string) =>
        issue.includes("boundary check horizontal step #1"),
      ),
    ).toBe(true);
    expect(evaluation.details).toContain("boundary check issues");
  });

  test("Street comparison reports unequal composites", () => {
    const alteredTarget = {
      ...idCellDot.target,
      leftBoundary: "★" as const,
    };
    const mismatchedGreen = {
      ...idCellDot,
      target: alteredTarget,
    } as typeof idCellDot;

    const comparison = evaluateStreetComparison(
      equipment,
      [idCellDot],
      [mismatchedGreen],
      "comparison mismatch",
    );

    expect(comparison.holds).toBe(false);
    expect(
      comparison.issues.some((issue: string) =>
        issue.includes("target frame left boundary mismatch"),
      ),
    ).toBe(true);
    expect(comparison.red).toBeDefined();
    expect(comparison.green).toBeDefined();
  });
});
