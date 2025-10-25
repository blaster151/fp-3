import { describe, expect, test } from "vitest";

import {
  forgetfulCoequalizerCounterexample,
  forgetfulCoproductCounterexample,
} from "../forgetful-counterexamples";
import { MonCat } from "../mon-cat";
import type { Monoid } from "../monoid-cat";

const booleanOrMonoid: Monoid<boolean> = {
  e: false,
  op: (left: boolean, right: boolean) => left || right,
};

describe("forgetful functor counterexamples", () => {
  test("coequalizer collapses additional elements before forgetting", () => {
    const counterexample = forgetfulCoequalizerCounterexample();
    const { left, right } = counterexample.parallel;
    const { map, witnessPairs, conflictingInputs } = counterexample.forgetfulFailure;

    for (const sample of witnessPairs) {
      const leftImage = left.map(sample);
      const rightImage = right.map(sample);
      expect(map(leftImage)).toBe(map(rightImage));
    }

    const equalizingHom = MonCat.hom(counterexample.target, booleanOrMonoid, (value: number) => value > 0);
    const { mediator, generatorImage } = counterexample.coequalizer.factor(
      booleanOrMonoid,
      equalizingHom,
    );

    expect(generatorImage).toBe(true);
    expect(mediator.map("zero")).toBe(false);
    expect(mediator.map("positive")).toBe(true);

    const [first, second] = conflictingInputs;
    const collapsedFirst = counterexample.coequalizer.coequalize.map(first);
    const collapsedSecond = counterexample.coequalizer.coequalize.map(second);
    expect(collapsedFirst).toBe("positive");
    expect(collapsedSecond).toBe("positive");
    expect(map(first)).not.toBe(map(second));

    const options = counterexample.forgetfulFailure.codomain;
    const factoringExists = options.some((zeroValue) =>
      options.some((positiveValue) => {
        const candidate = (value: "zero" | "positive") =>
          value === "zero" ? zeroValue : positiveValue;
        return (
          candidate(collapsedFirst) === map(first) &&
          candidate(collapsedSecond) === map(second)
        );
      }),
    );

    expect(factoringExists).toBe(false);
  });

  test("coproduct free product forgetful image admits multiple Set mediators", () => {
    const counterexample = forgetfulCoproductCounterexample();
    const { factor } = counterexample.coproduct;
    const { extensions, leftMap, rightMap, disagreement } = counterexample.forgetfulFailure;

    const booleanAndMonoid: Monoid<boolean> = {
      e: true,
      op: (left: boolean, right: boolean) => left && right,
    };

    const leftHom = MonCat.hom(counterexample.left, booleanAndMonoid, (count: number) => count === 0);
    const rightHom = MonCat.hom(counterexample.right, booleanAndMonoid, (count: number) => count % 2 === 0);

    const { mediator, images } = factor(booleanAndMonoid, leftHom, rightHom);

    expect(images.a).toBe(true);
    expect(images.b).toBe(true);
    expect(mediator.map("ab" as const)).toBe(true);

    const unaryWords = ["", "a", "aa", "b", "bb"];
    for (const extension of extensions) {
      for (const word of unaryWords) {
        if (/^a*$/.test(word)) {
          expect(extension(word)).toBe(leftMap(word.length));
        }
        if (/^b*$/.test(word)) {
          expect(extension(word)).toBe(rightMap(word.length));
        }
      }
    }

    const [firstExtension, secondExtension] = extensions;
    if (!firstExtension || !secondExtension) {
      throw new Error("expected at least two coproduct extensions");
    }
    expect(firstExtension(disagreement)).not.toBe(secondExtension(disagreement));
  });
});
