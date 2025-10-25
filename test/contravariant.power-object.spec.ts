import { describe, expect, it } from "vitest";

import {
  FinSet,
  FinSetElementaryToposWitness,
  type FinSetMor,
  type FinSetObj,
} from "../allTS";
import { powerObjectInverseImageContravariantWithWitness } from "../contravariant";

describe("power object contravariant functor", () => {
  it("pulls back membership along finite-set arrows", () => {
    const toolkit = powerObjectInverseImageContravariantWithWitness(
      FinSetElementaryToposWitness,
      {
        metadata: [
          "FinSet power object inverse image contravariant functor witnesses pullback of subsets.",
        ],
      },
    );

    expect(toolkit.functor.report.holds).toBe(true);

    const numbers: FinSetObj = { elements: [0, 1, 2] };
    const booleans: FinSetObj = { elements: [false, true] };
    const parity: FinSetMor = { from: numbers, to: booleans, map: [0, 1, 0] };

    const inverseImage = toolkit.functor.functor.F1(parity);

    const powerBooleans = toolkit.objectOf(booleans);
    const powerNumbers = toolkit.objectOf(numbers);
    const membershipBooleans = toolkit.membershipOf(booleans);
    const membershipNumbers = toolkit.membershipOf(numbers);

    const product = FinSet.binaryProduct(powerBooleans, numbers);

    const leftPair = membershipNumbers.product.pair(
      product.obj,
      FinSet.compose(inverseImage, product.proj1),
      product.proj2,
    );
    const leftEvaluation = FinSet.compose(membershipNumbers.evaluation, leftPair);

    const rightPair = membershipBooleans.product.pair(
      product.obj,
      product.proj1,
      FinSet.compose(parity, product.proj2),
    );
    const rightEvaluation = FinSet.compose(membershipBooleans.evaluation, rightPair);

    expect(FinSet.equalMor).toBeDefined();
    expect(FinSet.equalMor!(leftEvaluation, rightEvaluation)).toBe(true);
    expect(inverseImage.from).toBe(powerBooleans);
    expect(inverseImage.to).toBe(powerNumbers);
  });
});
