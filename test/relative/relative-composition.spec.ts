import { describe, expect, it } from "vitest";

import { TwoObjectCategory } from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  identityVerticalBoundary,
  identityProarrow,
  frameFromProarrow,
} from "../../virtual-equipment";
import {
  describeTrivialRelativeAdjunction,
  type RelativeAdjunctionData,
} from "../../relative/relative-adjunctions";
import {
  describeTrivialRelativeMonad,
  type RelativeMonadData,
} from "../../relative/relative-monads";
import {
  RelativeCompositionOracles,
  enumerateRelativeCompositionOracles,
} from "../../relative/relative-oracles";
import {
  analyzeRelativeAdjunctionComposition,
  analyzeRelativeMonadComposition,
  relativeMonadFromLooseMonoid,
  relativeMonadToLooseMonoid,
} from "../../relative/relative-composition";

const makeTrivialAdjunction = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const adjunction = describeTrivialRelativeAdjunction(equipment, "•");
  return { equipment, adjunction };
};

const makeTrivialMonads = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const left = describeTrivialRelativeMonad(equipment, "•");
  const right = describeTrivialRelativeMonad(equipment, "•");
  return { equipment, left, right };
};

describe("Relative adjunction composition analyzer", () => {
  it("accepts composable trivial adjunctions", () => {
    const { adjunction } = makeTrivialAdjunction();
    const report = analyzeRelativeAdjunctionComposition({
      first: adjunction,
      second: adjunction,
    });
    expect(report.holds).toBe(true);
  });

  it("detects mismatched roots", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const altered: RelativeAdjunctionData<string, string, unknown, unknown> = {
      ...adjunction,
      root: identityVerticalBoundary(
        equipment,
        "○",
        "Mismatched root for composition failure test",
      ),
    };
    const report = analyzeRelativeAdjunctionComposition({
      first: adjunction,
      second: altered,
    });
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "First adjunction's right leg must match the second adjunction's root j.",
    );
  });
});

describe("Relative monad composition analyzer", () => {
  it("accepts trivial relative monads", () => {
    const { left, right } = makeTrivialMonads();
    const report = analyzeRelativeMonadComposition({ first: left, second: right });
    expect(report.holds).toBe(true);
  });

  it("rejects incompatible carriers", () => {
    const { equipment, left, right } = makeTrivialMonads();
    const altered: RelativeMonadData<string, string, unknown, unknown> = {
      ...right,
      root: identityVerticalBoundary(
        equipment,
        "○",
        "Mismatched root for composition failure test",
      ),
    };
    const report = analyzeRelativeMonadComposition({ first: left, second: altered });
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Carrier of the first relative monad must coincide with the root of the second to compose extensions.",
    );
  });
});

describe("Relative monad ↔ loose monoid bridge", () => {
  it("converts the trivial relative monad to a loose monoid and back", () => {
    const { equipment, left } = makeTrivialMonads();
    const loose = relativeMonadToLooseMonoid(left);
    const bridge = relativeMonadFromLooseMonoid(equipment, left.root, left.carrier, loose);
    expect(bridge.holds).toBe(true);
    expect(bridge.data.extension).toBe(loose.multiplication);
  });

  it("detects malformed loose monoid data", () => {
    const { equipment, left } = makeTrivialMonads();
    const loose = relativeMonadToLooseMonoid(left);
    const malformed = {
      ...loose,
      multiplication: {
        ...loose.multiplication,
        target: frameFromProarrow(
          identityProarrow(equipment, "○"),
        ),
      },
    };
    const bridge = relativeMonadFromLooseMonoid(
      equipment,
      left.root,
      left.carrier,
      malformed,
    );
    expect(bridge.holds).toBe(false);
  });
});

describe("Relative composition oracles", () => {
  it("summarise adjunction and monad composition", () => {
    const { adjunction } = makeTrivialAdjunction();
    const { left, right, equipment } = makeTrivialMonads();
    const loose = relativeMonadToLooseMonoid(left);
    const oracles = enumerateRelativeCompositionOracles({
      adjunctions: { first: adjunction, second: adjunction },
      monads: { first: left, second: right },
      looseMonoid: {
        equipment,
        root: left.root,
        carrier: left.carrier,
        data: loose,
      },
    });
    expect(oracles).toHaveLength(3);
    oracles.forEach((oracle) => {
      expect(oracle.holds).toBe(true);
      expect(oracle.pending).toBe(false);
    });
  });
});
