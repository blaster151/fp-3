import { describe, expect, it } from "vitest";

import type { FiniteCategory } from "../finite-cat";
import { identityFunctorWithWitness } from "../functor";
import {
  preservesPullbacksImpliesMonomorphisms,
  preservesPushoutsImpliesEpimorphisms,
  type PullbackPreservationEvidence,
  type PushoutPreservationEvidence,
} from "../functor-preservation-implications";
import { TwoObjectCategory, nonIdentity } from "../two-object-cat";
import type { CategoryPropertyCheck } from "../functor-property-types";

const enumerateArrows = <Obj, Arr>(category: FiniteCategory<Obj, Arr>) =>
  category.arrows;

const checkMonomorphism = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): CategoryPropertyCheck<undefined> => {
  const domain = category.src(arrow);
  for (const left of enumerateArrows(category)) {
    if (!Object.is(category.dst(left), domain)) continue;
    for (const right of enumerateArrows(category)) {
      if (!Object.is(category.dst(right), domain)) continue;
      const leftComposite = category.compose(arrow, left);
      const rightComposite = category.compose(arrow, right);
      if (category.eq(leftComposite, rightComposite) && !category.eq(left, right)) {
        return {
          holds: false,
          details: `Witnesses ${String(left)} and ${String(right)} disagree after composing with ${String(arrow)}.`,
        };
      }
    }
  }
  return { holds: true, details: `${String(arrow)} is left-cancellative.` };
};

const checkEpimorphism = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): CategoryPropertyCheck<undefined> => {
  const codomain = category.dst(arrow);
  for (const left of enumerateArrows(category)) {
    if (!Object.is(category.src(left), codomain)) continue;
    for (const right of enumerateArrows(category)) {
      if (!Object.is(category.src(right), codomain)) continue;
      const leftComposite = category.compose(left, arrow);
      const rightComposite = category.compose(right, arrow);
      if (category.eq(leftComposite, rightComposite) && !category.eq(left, right)) {
        return {
          holds: false,
          details: `Witnesses ${String(left)} and ${String(right)} disagree before composing with ${String(arrow)}.`,
        };
      }
    }
  }
  return { holds: true, details: `${String(arrow)} is right-cancellative.` };
};

describe("preservation implications from pullbacks and pushouts", () => {
  it("derives monomorphism preservation with supporting pullback evidence", () => {
    const functor = identityFunctorWithWitness(TwoObjectCategory, {
      objects: TwoObjectCategory.objects,
      arrows: TwoObjectCategory.arrows,
    });
    const evidence: PullbackPreservationEvidence<typeof TwoObjectCategory.objects[number], typeof nonIdentity> = {
      spans: [
        { left: TwoObjectCategory.id("•"), right: nonIdentity, label: "pullback of f along id" },
      ],
      details: ["Identity functor trivially preserves every pullback."],
      source: TwoObjectCategory,
    };
    const analysis = preservesPullbacksImpliesMonomorphisms({
      functor,
      sourceEvaluate: (category, arrow) =>
        checkMonomorphism(category as FiniteCategory<typeof TwoObjectCategory.objects[number], typeof nonIdentity>, arrow),
      targetEvaluate: (category, arrow) =>
        checkMonomorphism(category as FiniteCategory<typeof TwoObjectCategory.objects[number], typeof nonIdentity>, arrow),
      evidence,
    });
    expect(analysis.holds).toBe(true);
    expect(analysis.details.join(" ")).toMatch(/pullback preservation/);
  });

  it("warns when pullback preservation evidence is missing", () => {
    const functor = identityFunctorWithWitness(TwoObjectCategory);
    const analysis = preservesPullbacksImpliesMonomorphisms({
      functor,
      sourceEvaluate: (category, arrow) =>
        checkMonomorphism(category as FiniteCategory<typeof TwoObjectCategory.objects[number], typeof nonIdentity>, arrow),
      targetEvaluate: (category, arrow) =>
        checkMonomorphism(category as FiniteCategory<typeof TwoObjectCategory.objects[number], typeof nonIdentity>, arrow),
    });
    expect(analysis.details.join(" ")).toMatch(/advisory/);
  });

  it("derives epimorphism preservation from pushout evidence", () => {
    const functor = identityFunctorWithWitness(TwoObjectCategory, {
      objects: TwoObjectCategory.objects,
      arrows: TwoObjectCategory.arrows,
    });
    const evidence: PushoutPreservationEvidence<typeof TwoObjectCategory.objects[number], typeof nonIdentity> = {
      cospans: [
        { left: nonIdentity, right: TwoObjectCategory.id("★"), label: "pushout of f along id" },
      ],
      details: ["Identity functor trivially preserves every pushout."],
      source: TwoObjectCategory,
    };
    const analysis = preservesPushoutsImpliesEpimorphisms({
      functor,
      sourceEvaluate: (category, arrow) =>
        checkEpimorphism(category as FiniteCategory<typeof TwoObjectCategory.objects[number], typeof nonIdentity>, arrow),
      targetEvaluate: (category, arrow) =>
        checkEpimorphism(category as FiniteCategory<typeof TwoObjectCategory.objects[number], typeof nonIdentity>, arrow),
      evidence,
    });
    expect(analysis.holds).toBe(true);
    expect(analysis.details.join(" ")).toMatch(/pushout preservation/);
  });
});

