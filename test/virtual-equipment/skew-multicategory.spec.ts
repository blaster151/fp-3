import { describe, expect, test } from "vitest";
import {
  analyzeLooseSkewComposition,
  describeIdentityLooseMultimorphism,
} from "../../virtual-equipment";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import { TwoObjectCategory } from "../../two-object-cat";

const makeEquipment = () => virtualizeFiniteCategory(TwoObjectCategory);

describe("loose skew multicategory analyzers", () => {
  test("identity substitution respects skew-multicategory framing", () => {
    const equipment = makeEquipment();
    const identityDot = describeIdentityLooseMultimorphism(equipment, "•");
    const report = analyzeLooseSkewComposition(equipment, identityDot, [identityDot]);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  test("mismatched substitution surfaces framing diagnostics", () => {
    const equipment = makeEquipment();
    const identityDot = describeIdentityLooseMultimorphism(equipment, "•");
    const identityStar = describeIdentityLooseMultimorphism(equipment, "★");

    const report = analyzeLooseSkewComposition(equipment, identityDot, [identityStar]);
    expect(report.holds).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.issues.some((issue: string) => issue.includes("share endpoints"))).toBe(true);
  });
});
