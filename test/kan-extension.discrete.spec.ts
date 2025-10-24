import { describe, expect, it } from "vitest";

import {
  buildDiscreteLeftKanExtension,
  buildDiscreteRightKanExtension,
  induceNaturalTransformationFromLeftKan,
  induceNaturalTransformationToRightKan,
} from "../kan-extension";
import { identityNaturalTransformation } from "../natural-transformation";

describe("Discrete Kan extension builders", () => {
  const sourceObjects = [0, 1, 2, 3] as const;
  const targetObjects = [0, 1] as const;
  const reindex = (object: number) => object % 2;
  const family = (object: number) => [String.fromCharCode(65 + object)];

  const input = {
    sourceObjects: Array.from(sourceObjects),
    targetObjects: Array.from(targetObjects),
    reindex,
    family,
  };

  it("constructs the discrete left Kan extension with unit diagnostics", () => {
    const left = buildDiscreteLeftKanExtension(input);

    const lan0 = Array.from(left.extension.functor.F0(0)).map((element) => [
      element.source,
      element.value,
    ]);
    const lan1 = Array.from(left.extension.functor.F0(1)).map((element) => [
      element.source,
      element.value,
    ]);

    expect(lan0).toEqual([
      [0, "A"],
      [2, "C"],
    ]);
    expect(lan1).toEqual([
      [1, "B"],
      [3, "D"],
    ]);

    const unit0 = left.unit.transformation.component(0);
    const unit1 = left.unit.transformation.component(1);

    const lan0Object = Array.from(left.extension.functor.F0(0));
    const lan1Object = Array.from(left.extension.functor.F0(1));

    expect(unit0.map("A")).toEqual(lan0Object[0]);
    expect(unit1.map("B")).toEqual(lan1Object[0]);

    expect(left.unit.report.holds).toBe(true);
    expect(left.analysis.holds).toBe(true);
    expect(left.analysis.fibers.every((fiber) => fiber.bijectionVerified)).toBe(true);
  });

  it("constructs the discrete right Kan extension with counit diagnostics", () => {
    const right = buildDiscreteRightKanExtension(input);

    const ran0 = Array.from(right.extension.functor.F0(0)).map((bundle) =>
      bundle.components.map((component) => [component.source, component.value]),
    );
    const ran1 = Array.from(right.extension.functor.F0(1)).map((bundle) =>
      bundle.components.map((component) => [component.source, component.value]),
    );

    expect(ran0).toEqual([
      [
        [0, "A"],
        [2, "C"],
      ],
    ]);
    expect(ran1).toEqual([
      [
        [1, "B"],
        [3, "D"],
      ],
    ]);

    const counit0 = right.counit.transformation.component(0);
    const ran0Element = right.extension.functor.F0(0).values().next().value;
    expect(counit0.map(ran0Element)).toBe("A");

    expect(right.counit.report.holds).toBe(true);
    expect(right.analysis.holds).toBe(true);
    expect(right.analysis.fibers.every((fiber) => fiber.bijectionVerified)).toBe(true);
  });

  it("recovers the universal arrow for left Kan extensions via functor-category tooling", () => {
    const left = buildDiscreteLeftKanExtension(input);
    const induction = induceNaturalTransformationFromLeftKan(left, left.extension, left.unit);

    expect(induction.holds).toBe(true);
    expect(induction.mediating.report.holds).toBe(true);

    const identity = identityNaturalTransformation(left.extension);
    for (const object of left.extension.witness.objectGenerators) {
      const mediated = induction.mediating.transformation.component(object);
      const expected = identity.transformation.component(object);
      for (const element of left.extension.functor.F0(object)) {
        expect(mediated.map(element)).toBe(expected.map(element));
      }
    }
  });

  it("recovers the couniversal arrow for right Kan extensions via functor-category tooling", () => {
    const right = buildDiscreteRightKanExtension(input);
    const induction = induceNaturalTransformationToRightKan(right, right.extension, right.counit);

    expect(induction.holds).toBe(true);
    expect(induction.mediating.report.holds).toBe(true);

    const identity = identityNaturalTransformation(right.extension);
    for (const object of right.extension.witness.objectGenerators) {
      const mediated = induction.mediating.transformation.component(object);
      const expected = identity.transformation.component(object);
      for (const element of right.extension.functor.F0(object)) {
        expect(mediated.map(element)).toBe(expected.map(element));
      }
    }
  });
});
