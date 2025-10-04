import { describe, expect, test } from "vitest";
import { composeFun } from "../../allTS";
import {
  analyzeLooseSkewComposition,
  defaultTightLayer,
  describeIdentityLooseMultimorphism,
  virtualiseTightCategory,
} from "../../virtual-equipment";
import { TwoObjectCategory } from "../../two-object-cat";
import type { TwoArrow, TwoObject } from "../../two-object-cat";

const equalsTwoObject = (left: TwoObject, right: TwoObject): boolean => left === right;

const makeEquipment = () =>
  virtualiseTightCategory(
    defaultTightLayer(TwoObjectCategory, TwoObjectCategory.id, composeFun),
    TwoObjectCategory.objects,
    equalsTwoObject,
  );

describe("loose skew multicategory analyzers", () => {
  test("identity substitution respects skew-multicategory framing", () => {
    const equipment = makeEquipment();
    const identityDot = describeIdentityLooseMultimorphism<TwoObject, TwoArrow, unknown, unknown>(
      equipment,
      "•",
    );
    const report = analyzeLooseSkewComposition(equipment, identityDot, [identityDot]);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  test("mismatched substitution surfaces framing diagnostics", () => {
    const equipment = makeEquipment();
    const identityDot = describeIdentityLooseMultimorphism<TwoObject, TwoArrow, unknown, unknown>(
      equipment,
      "•",
    );
    const identityStar = describeIdentityLooseMultimorphism<TwoObject, TwoArrow, unknown, unknown>(
      equipment,
      "★",
    );

    const report = analyzeLooseSkewComposition(equipment, identityDot, [identityStar]);
    expect(report.holds).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.issues.some((issue: string) => issue.includes("share endpoints"))).toBe(true);
  });
});
