import { describe, expect, test } from "vitest";
import {
  constructCompanionFromRestrictions,
  constructConjointFromRestrictions,
  makeCosliceEquipment,
  makeRelEquipment,
  makeSliceEquipment,
} from "../../virtual-equipment";
import { TwoObjectCategory } from "../../two-object-cat";

const expectDefined = <T>(value: T | undefined | null, message: string): T => {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
  return value;
};

describe("restriction-based companion constructors", () => {
  test("recover identity companions in the Rel equipment", () => {
    const relEquipment = makeRelEquipment([
      [0, 1],
      ["a"],
    ]);
    const relDomain = expectDefined(
      relEquipment.objects[0],
      "Expected the Rel equipment to expose at least one carrier.",
    );

    const attempt = constructCompanionFromRestrictions(relEquipment, {
      tight: relEquipment.tight.identity,
      domain: relDomain,
      codomain: relDomain,
    });

    expect(attempt.available).toBe(true);
    expect(attempt.cartesian?.boundary.direction).toBe("left");
    expect(attempt.representability?.orientation).toBe("left");
    expect(attempt.details).toContain("B(f,1)");
  });

  test("recover identity companions in slice and coslice equipments", () => {
    const sliceEquipment = makeSliceEquipment(TwoObjectCategory, "•");
    const sliceDomain = expectDefined(
      sliceEquipment.objects[0],
      "Slice equipment should supply at least one object.",
    );
    const sliceCompanion = constructCompanionFromRestrictions(sliceEquipment, {
      tight: sliceEquipment.tight.identity,
      domain: sliceDomain,
      codomain: sliceDomain,
    });

    expect(sliceCompanion.available).toBe(true);
    expect(sliceCompanion.cartesian?.boundary.direction).toBe("left");
    expect(sliceCompanion.representability?.orientation).toBe("left");

    const cosliceEquipment = makeCosliceEquipment(TwoObjectCategory, "★");
    const cosliceDomain = expectDefined(
      cosliceEquipment.objects[0],
      "Coslice equipment should supply at least one object.",
    );
    const cosliceCompanion = constructCompanionFromRestrictions(cosliceEquipment, {
      tight: cosliceEquipment.tight.identity,
      domain: cosliceDomain,
      codomain: cosliceDomain,
    });

    expect(cosliceCompanion.available).toBe(true);
    expect(cosliceCompanion.cartesian?.boundary.direction).toBe("left");
    expect(cosliceCompanion.representability?.orientation).toBe("left");
  });

  test("surface detailed diagnostics when domain and codomain disagree", () => {
    const relEquipment = makeRelEquipment([
      [0],
      [1, 2],
    ]);
    const domain = expectDefined(
      relEquipment.objects[0],
      "Expected domain witness in Rel equipment.",
    );
    const codomain = expectDefined(
      relEquipment.objects[1],
      "Expected codomain witness in Rel equipment.",
    );

    const mismatched = constructCompanionFromRestrictions(relEquipment, {
      tight: relEquipment.tight.identity,
      domain,
      codomain,
    });

    expect(mismatched.available).toBe(false);
    expect(mismatched.details).toContain("expected");
    expect(mismatched.details).toContain("B(f,1)");
  });
});

describe("restriction-based conjoint constructors", () => {
  test("recover identity conjoints in the Rel equipment", () => {
    const relEquipment = makeRelEquipment([
      [0],
      [1, 2],
    ]);
    const relDomain = expectDefined(
      relEquipment.objects[0],
      "Expected the Rel equipment to expose at least one carrier.",
    );

    const attempt = constructConjointFromRestrictions(relEquipment, {
      tight: relEquipment.tight.identity,
      domain: relDomain,
      codomain: relDomain,
    });

    expect(attempt.available).toBe(true);
    expect(attempt.cartesian?.boundary.direction).toBe("right");
    expect(attempt.representability?.orientation).toBe("right");
    expect(attempt.details).toContain("B(1,f)");
  });

  test("recover identity conjoints in slice and coslice equipments", () => {
    const sliceEquipment = makeSliceEquipment(TwoObjectCategory, "•");
    const sliceDomain = expectDefined(
      sliceEquipment.objects[0],
      "Slice equipment should supply at least one object.",
    );
    const sliceConjoint = constructConjointFromRestrictions(sliceEquipment, {
      tight: sliceEquipment.tight.identity,
      domain: sliceDomain,
      codomain: sliceDomain,
    });

    expect(sliceConjoint.available).toBe(true);
    expect(sliceConjoint.cartesian?.boundary.direction).toBe("right");
    expect(sliceConjoint.representability?.orientation).toBe("right");

    const cosliceEquipment = makeCosliceEquipment(TwoObjectCategory, "★");
    const cosliceDomain = expectDefined(
      cosliceEquipment.objects[0],
      "Coslice equipment should supply at least one object.",
    );
    const cosliceConjoint = constructConjointFromRestrictions(cosliceEquipment, {
      tight: cosliceEquipment.tight.identity,
      domain: cosliceDomain,
      codomain: cosliceDomain,
    });

    expect(cosliceConjoint.available).toBe(true);
    expect(cosliceConjoint.cartesian?.boundary.direction).toBe("right");
    expect(cosliceConjoint.representability?.orientation).toBe("right");
  });

  test("surface detailed diagnostics when codomain mismatches", () => {
    const relEquipment = makeRelEquipment([
      ["a"],
      ["b"],
    ]);
    const domain = expectDefined(
      relEquipment.objects[0],
      "Expected domain witness in Rel equipment.",
    );
    const codomain = expectDefined(
      relEquipment.objects[1],
      "Expected codomain witness in Rel equipment.",
    );

    const mismatched = constructConjointFromRestrictions(relEquipment, {
      tight: relEquipment.tight.identity,
      domain,
      codomain,
    });

    expect(mismatched.available).toBe(false);
    expect(mismatched.details).toContain("expected domain");
    expect(mismatched.details).toContain("B(1,f)");
  });
});
