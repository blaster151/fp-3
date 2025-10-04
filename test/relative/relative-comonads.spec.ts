import { describe, expect, it } from "vitest";

import { TwoObjectCategory } from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  identityVerticalBoundary,
  type RepresentabilityWitness,
} from "../../virtual-equipment";
import {
  analyzeRelativeComonadCorepresentability,
  analyzeRelativeComonadFraming,
  analyzeRelativeComonadIdentityReduction,
  describeTrivialRelativeComonad,
  type RelativeComonadData,
} from "../../relative/relative-comonads";
import { RelativeComonadOracles } from "../../relative/relative-comonad-oracles";

const makeTrivialComonad = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const trivial = describeTrivialRelativeComonad(equipment, "•");
  return { equipment, trivial };
};

type RelativeParams = ReturnType<typeof makeTrivialComonad>["trivial"] extends RelativeComonadData<
  infer Obj,
  infer Arr,
  infer Payload,
  infer Evidence
>
  ? [Obj, Arr, Payload, Evidence]
  : never;

const obtainRightRepresentabilityWitness = (): RepresentabilityWitness<
  RelativeParams[0],
  RelativeParams[1]
> => {
  const { equipment, trivial } = makeTrivialComonad();
  const restriction = equipment.restrictions.right(
    trivial.looseCell,
    trivial.root.tight,
  );
  if (!restriction || !restriction.representability) {
    throw new Error("Expected identity restriction to produce a witness.");
  }
  return restriction.representability;
};

describe("Relative comonad analyzers", () => {
  it("accept the trivial relative comonad", () => {
    const { trivial } = makeTrivialComonad();
    const report = analyzeRelativeComonadFraming(trivial);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flag mismatched counit boundaries", () => {
    const { equipment, trivial } = makeTrivialComonad();
    const broken: RelativeComonadData<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...trivial,
      counit: {
        ...trivial.counit,
        boundaries: {
          ...trivial.counit.boundaries,
          right: identityVerticalBoundary(
            equipment,
            "○",
            "Incorrect right boundary for testing",
          ),
        },
      },
    };
    const report = analyzeRelativeComonadFraming(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).not.toHaveLength(0);
  });

  it("produce corepresentability diagnostics", () => {
    const { trivial } = makeTrivialComonad();
    const witness = obtainRightRepresentabilityWitness();
    const report = analyzeRelativeComonadCorepresentability(trivial, witness);
    expect(report.holds).toBe(true);
    expect(report.representability).toBe(witness);
  });

  it("reduce to ordinary comonads along the identity root", () => {
    const { equipment, trivial } = makeTrivialComonad();
    const report = analyzeRelativeComonadIdentityReduction(equipment, trivial);
    expect(report.holds).toBe(true);
  });
});

describe("Relative comonad oracles", () => {
  it("report framing success for the trivial comonad", () => {
    const { trivial } = makeTrivialComonad();
    const framing = RelativeComonadOracles.counitFraming(trivial);
    expect(framing.holds).toBe(true);
    expect(framing.pending).toBe(false);
  });

  it("report corepresentability success when supplied with a witness", () => {
    const { trivial } = makeTrivialComonad();
    const witness = obtainRightRepresentabilityWitness();
    const report = analyzeRelativeComonadCorepresentability(trivial, witness);
    const oracle = RelativeComonadOracles.corepresentability(trivial, report);
    expect(oracle.holds).toBe(true);
    expect(oracle.pending).toBe(false);
  });
});
