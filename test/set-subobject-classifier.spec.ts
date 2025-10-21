import { describe, expect, it } from "vitest";

import { SetCat } from "../set-cat";
import type { SetHom, SetObj } from "../set-cat";
import { SetLaws } from "../set-laws";
import {
  ensureSubsetMonomorphism,
  setCharacteristicOfSubset,
  setSubsetFromCharacteristic,
  SetSubobjectClassifier,
  SetPowerObject,
  SetPullbacks,
} from "../set-subobject-classifier";
import { CategoryLimits } from "../stdlib/category-limits";
import { equalSetHom } from "../set-pullbacks";

const toSortedArray = (values: ReadonlySet<number>): ReadonlyArray<number> =>
  [...values].sort((left, right) => left - right);

describe("set subobject classifier", () => {
  it("round-trips subset inclusions through Ω", () => {
    const ambient = SetCat.obj([0, 1, 2] as const);
    const ambientElements = Array.from(ambient);
    const evidence = SetLaws.powerSetEvidence(ambient);

    for (const subsetData of evidence.subsets) {
      const { subset, inclusion, characteristic } = subsetData;

      expect(inclusion.dom).toBe(subset);
      expect(inclusion.cod).toBe(evidence.ambient);

      // Guard sanity: canonical inclusions must pass validation.
      expect(() => ensureSubsetMonomorphism(inclusion)).not.toThrow();

      const observedVector = ambientElements.map((element) => characteristic.map(element));
      const expectedVector = ambientElements.map((element) => subset.has(element));
      expect(observedVector).toEqual(expectedVector);

      const { subset: recoveredSubset, inclusion: recoveredInclusion } = setSubsetFromCharacteristic(characteristic);

      expect(recoveredInclusion.dom).toBe(recoveredSubset);
      expect(recoveredInclusion.cod).toBe(ambient);
      expect(toSortedArray(recoveredSubset)).toEqual(toSortedArray(subset));

      for (const element of ambient) {
        expect(recoveredSubset.has(element)).toBe(subset.has(element));
      }

      for (const element of recoveredSubset) {
        expect(recoveredInclusion.map(element)).toBe(element);
      }

      const reround = setCharacteristicOfSubset(recoveredInclusion);
      for (const element of ambient) {
        expect(reround.map(element)).toBe(characteristic.map(element));
      }
    }
  });

  it("exposes Set power objects via characteristic maps", () => {
    const ambient = SetCat.obj([0, 1, 2] as const);
    const powerWitness = SetCat.powerObject(ambient);
    const ambientElements = Array.from(ambient);
    const evidence = SetLaws.powerSetEvidence(ambient);

    const expectedVectors = new Set(
      evidence.subsets.map(({ characteristic }) =>
        JSON.stringify(ambientElements.map((element) => characteristic.map(element))),
      ),
    );

    const actualVectors = new Set(
      Array.from(powerWitness.powerObj).map((characteristic) =>
        JSON.stringify(ambientElements.map((element) => characteristic.map(element))),
      ),
    );

    expect(actualVectors).toEqual(expectedVectors);

    for (const characteristic of powerWitness.powerObj) {
      for (const element of ambient) {
        const pair = powerWitness.membershipProduct.lookup
          ? powerWitness.membershipProduct.lookup(characteristic, element)
          : ([characteristic, element] as const);
        expect(powerWitness.membership.map(pair)).toBe(characteristic.map(element));
      }
    }
  });

  it("reuses CategoryLimits helpers for truth arrows and negation", () => {
    const computedFalse = CategoryLimits.subobjectClassifierFalseArrow(SetSubobjectClassifier);
    expect(computedFalse.dom).toBe(SetSubobjectClassifier.terminalObj);
    expect(computedFalse.cod).toBe(SetSubobjectClassifier.truthValues);
    for (const point of SetSubobjectClassifier.terminalObj) {
      expect(computedFalse.map(point)).toBe(false);
    }

    const computedNegation = CategoryLimits.subobjectClassifierNegation(SetSubobjectClassifier);
    for (const value of SetSubobjectClassifier.truthValues) {
      expect(computedNegation.map(value)).toBe(!value);
    }
  });

  it("classifies subsets via the CategoryLimits power object", () => {
    const ambient = SetCat.obj([0, 1, 2] as const);
    const terminalData = SetCat.terminal();
    const terminalObj = terminalData.object;
    const terminalPoint = (() => {
      for (const point of terminalObj) {
        return point;
      }
      throw new Error("Set terminal object must contain exactly one element.");
    })();

    const productData = SetCat.product(ambient, terminalObj);
    const productWitness = {
      obj: productData.object,
      projections: [productData.projections.fst, productData.projections.snd],
      pair: (_domain: SetObj<unknown>, leftLeg: SetHom<unknown, unknown>, rightLeg: SetHom<unknown, unknown>) =>
        SetCat.hom(
          leftLeg.dom as SetObj<unknown>,
          productData.object,
          (value) => {
            const leftValue = leftLeg.map(value);
            const rightValue = rightLeg.map(value);
            const pair = productData.lookup
              ? productData.lookup(leftValue as unknown as never, rightValue as unknown as never)
              : ([leftValue, rightValue] as const);
            return pair as unknown;
          },
        ) as SetHom<unknown, unknown>,
    } as unknown as CategoryLimits.BinaryProductWithPairWitness<SetObj<unknown>, SetHom<unknown, unknown>>;

    const power = SetPowerObject(terminalObj as SetObj<unknown>);

    const evidence = SetLaws.powerSetEvidence(ambient);

    for (const subsetData of evidence.subsets) {
      const { subset } = subsetData;

      const relationPairs = Array.from(subset).map((element) =>
        productData.lookup ? productData.lookup(element, terminalPoint) : ([element, terminalPoint] as const),
      );
      const relationDomain = SetCat.obj(relationPairs);
      const relation = SetCat.hom(relationDomain, productData.object, (pair) => pair);

      const classification = power.classify({
        ambient,
        relation: relation as unknown as SetHom<unknown, unknown>,
        product: productWitness,
        pullbacks: SetPullbacks,
      });

      const mediator = classification.mediator as SetHom<unknown, SetHom<unknown, boolean>>;
      const characteristic = classification.characteristic as SetHom<unknown, boolean>;

      for (const element of ambient) {
        const pair = productData.lookup
          ? productData.lookup(element, terminalPoint)
          : ([element, terminalPoint] as const);
        expect(characteristic.map(pair)).toBe(subset.has(element));

        const truthFunction = mediator.map(element) as SetHom<unknown, boolean>;
        expect(truthFunction.dom).toBe(terminalObj);
        for (const point of terminalObj) {
          expect(truthFunction.map(point)).toBe(subset.has(element));
        }
      }

      const { forward, backward } = classification.relationIso;
      const backwardForward = SetSubobjectClassifier.compose(
        backward as SetHom<unknown, unknown>,
        forward as SetHom<unknown, unknown>,
      );
      const forwardBackward = SetSubobjectClassifier.compose(
        forward as SetHom<unknown, unknown>,
        backward as SetHom<unknown, unknown>,
      );

      expect(backwardForward.dom).toBe(relationDomain);
      expect(backwardForward.cod).toBe(relationDomain);
      expect(forwardBackward.dom).toBe(classification.pullback.apex);
      expect(forwardBackward.cod).toBe(classification.pullback.apex);

      for (const pair of relationDomain) {
        expect(backwardForward.map(pair)).toBe(pair);
      }

      for (const pair of classification.pullback.apex) {
        expect(forwardBackward.map(pair)).toBe(pair);
      }
    }
  });

  it("builds classifier isomorphisms via CategoryLimits helpers", () => {
    const iso = CategoryLimits.buildSubobjectClassifierIso(
      SetSubobjectClassifier,
      SetSubobjectClassifier,
      { equalMor: equalSetHom },
    );

    const identity = SetSubobjectClassifier.id(SetSubobjectClassifier.truthValues);
    const forwardBackward = SetSubobjectClassifier.compose(iso.forward, iso.backward);
    const backwardForward = SetSubobjectClassifier.compose(iso.backward, iso.forward);

    expect(equalSetHom(forwardBackward, identity)).toBe(true);
    expect(equalSetHom(backwardForward, identity)).toBe(true);
  });
});

