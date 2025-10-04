import { describe, expect, it } from "vitest";

import { TwoObjectCategory } from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  identityVerticalBoundary,
  type LooseMonoidData,
} from "../../virtual-equipment";
import {
  analyzeRelativeMonadFraming,
  analyzeRelativeMonadIdentityReduction,
  analyzeRelativeMonadRepresentability,
  analyzeRelativeMonadResolution,
  analyzeRelativeMonadSkewMonoidBridge,
  describeTrivialRelativeMonad,
  type RelativeMonadData,
  type RelativeMonadSkewMonoidBridgeInput,
} from "../../relative/relative-monads";
import { describeTrivialRelativeAdjunction } from "../../relative/relative-adjunctions";
import {
  RelativeMonadOracles,
  enumerateRelativeMonadOracles,
} from "../../relative/relative-oracles";
import { RelativeMonadLawRegistry } from "../../relative/relative-laws";

const makeTrivialData = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const trivial = describeTrivialRelativeMonad(equipment, "•");
  return { equipment, trivial };
};

const obtainRepresentabilityWitness = () => {
  const { equipment, trivial } = makeTrivialData();
  const restriction = equipment.restrictions.left(
    trivial.root.tight,
    trivial.looseCell,
  );
  if (restriction?.representability === undefined) {
    throw new Error(
      "Expected the identity loose arrow to produce a representability witness.",
    );
  }
  return { equipment, trivial, witness: restriction.representability } as const;
};

const successAnalysis = (details: string) => ({
  holds: true as const,
  issues: [] as ReadonlyArray<string>,
  details,
});

type RelativeParams = ReturnType<typeof makeTrivialData>["trivial"] extends RelativeMonadData<
  infer Obj,
  infer Arr,
  infer Payload,
  infer Evidence
>
  ? [Obj, Arr, Payload, Evidence]
  : never;

const makeSkewMonoidBridgeInput = (): RelativeMonadSkewMonoidBridgeInput<
  RelativeParams[0],
  RelativeParams[1],
  RelativeParams[2],
  RelativeParams[3]
> => {
  const { trivial } = makeTrivialData();
  const { witness } = obtainRepresentabilityWitness();

  const monoid: LooseMonoidData<
    RelativeParams[0],
    RelativeParams[1],
    RelativeParams[2],
    RelativeParams[3]
  > = {
    object: trivial.looseCell.from,
    looseCell: trivial.looseCell,
    multiplication: trivial.extension,
    unit: trivial.unit,
  };

  return {
    relative: trivial,
    monoid,
    monoidShape: successAnalysis(
      "Identity loose monoid uses the relative monad's unit/extension data.",
    ),
    representability: analyzeRelativeMonadRepresentability(trivial, witness),
    leftExtensions: {
      existence: successAnalysis("Identity left extension exists by definition."),
      preservation: successAnalysis(
        "Identity extension functor preserves its own left extensions.",
      ),
      absolute: successAnalysis(
        "Identity left extension is j-absolute with trivial comparison cells.",
      ),
      density: successAnalysis("Identity tight 1-cell is dense via identity restrictions."),
      rightUnit: successAnalysis(
        "Right unit for the identity companion is invertible on the nose.",
      ),
    },
  };
};

describe("Relative monad framing analyzer", () => {
  it("accepts the trivial j-relative monad", () => {
    const { trivial } = makeTrivialData();
    const report = analyzeRelativeMonadFraming(trivial);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched boundaries", () => {
    const { equipment, trivial } = makeTrivialData();
    const broken = {
      ...trivial,
      unit: {
        ...trivial.unit,
        boundaries: {
          ...trivial.unit.boundaries,
          right: identityVerticalBoundary(
            equipment,
            "★",
            "Intentionally wrong carrier boundary for testing.",
          ),
        },
      },
    };
    const report = analyzeRelativeMonadFraming(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Unit right boundary must equal the designated tight boundary.",
    );
  });
});

describe("Relative monad identity reduction", () => {
  it("confirms identity-root data collapses to an ordinary monad", () => {
    const { trivial } = makeTrivialData();
    const report = analyzeRelativeMonadIdentityReduction(trivial);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags non-identity roots", () => {
    const { equipment, trivial } = makeTrivialData();
    const alteredRoot = identityVerticalBoundary(
      equipment,
      "★",
      "Mismatched identity boundary to force a failure.",
    );
    const report = analyzeRelativeMonadIdentityReduction({
      ...trivial,
      root: alteredRoot,
    });
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Root j and carrier t must coincide to model an ordinary monad.",
    );
  });
});

describe("Relative monad resolution analyzer", () => {
  it("recognises the trivial resolution", () => {
    const { equipment, trivial } = makeTrivialData();
    const adjunction = describeTrivialRelativeAdjunction(equipment, "•");
    const report = analyzeRelativeMonadResolution({ monad: trivial, adjunction });
    expect(report.holds).toBe(true);
    expect(report.looseMonad.holds).toBe(true);
    expect(report.looseMonad.induced).toBe(trivial.looseCell);
    expect(report.issues).toHaveLength(0);
  });

  it("detects mismatched carriers", () => {
    const { equipment, trivial } = makeTrivialData();
    const adjunction = describeTrivialRelativeAdjunction(equipment, "•");
    const mismatched = {
      ...trivial,
      carrier: identityVerticalBoundary(
        equipment,
        "★",
        "Mismatched carrier to violate the resolution conditions.",
      ),
    } as typeof trivial;
    const report = analyzeRelativeMonadResolution({ monad: mismatched, adjunction });
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative monad carrier should match the right leg r.",
    );
  });
});

describe("Relative monad representability", () => {
  it("accepts representability obtained from left restriction", () => {
    const { trivial, witness } = obtainRepresentabilityWitness();
    const report = analyzeRelativeMonadRepresentability(trivial, witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched orientation", () => {
    const { trivial, witness } = obtainRepresentabilityWitness();
    const brokenWitness = { ...witness, orientation: "right" as const };
    const report = analyzeRelativeMonadRepresentability(trivial, brokenWitness);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Representability witness must arise from a left restriction B(j,1) to align with Theorem 4.16.",
    );
  });
});

describe("Relative monad oracles", () => {
  it("report the framing oracle result", () => {
    const { trivial } = makeTrivialData();
    const oracle = RelativeMonadOracles.framing(trivial);
    expect(oracle.pending).toBe(false);
    expect(oracle.holds).toBe(true);
    expect(oracle.issues).toHaveLength(0);
  });

  it("summarises the identity reduction oracle", () => {
    const { trivial } = makeTrivialData();
    const oracle = RelativeMonadOracles.identityReduction(trivial);
    expect(oracle.pending).toBe(false);
    expect(oracle.holds).toBe(true);
    expect(oracle.issues).toHaveLength(0);
  });

  it("marks associativity as pending", () => {
    const oracle = RelativeMonadOracles.associativityPasting();
    expect(oracle.pending).toBe(true);
    expect(oracle.holds).toBe(false);
  });

  it("summarises representable loose monoid witnesses", () => {
    const { trivial, witness } = obtainRepresentabilityWitness();
    const oracle = RelativeMonadOracles.representableLooseMonoid(trivial, witness);
    expect(oracle.pending).toBe(false);
    expect(oracle.holds).toBe(true);
    expect(oracle.issues).toHaveLength(0);
  });

  it("aggregates the skew-monoid bridge when supplied", () => {
    const input = makeSkewMonoidBridgeInput();
    const oracle = RelativeMonadOracles.skewMonoidBridge(input);
    expect(oracle.pending).toBe(false);
    expect(oracle.holds).toBe(true);
    expect(oracle.issues).toHaveLength(0);
  });
});

describe("Relative monad skew-monoid bridge analyzer", () => {
  it("confirms the Theorem 4.29 conditions for the identity example", () => {
    const input = makeSkewMonoidBridgeInput();
    const report = analyzeRelativeMonadSkewMonoidBridge(input);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags missing density witnesses", () => {
    const input = makeSkewMonoidBridgeInput();
    const broken = {
      ...input,
      leftExtensions: {
        ...input.leftExtensions,
        density: {
          holds: false,
          issues: ["Density witness not provided"],
          details: "Unable to exhibit density for the supplied tight cell.",
        },
      },
    };
    const report = analyzeRelativeMonadSkewMonoidBridge(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContainEqual(
      expect.stringContaining("Density witness failed"),
    );
  });

  it("surfaces the bridge oracle via enumeration", () => {
    const input = makeSkewMonoidBridgeInput();
    const results = enumerateRelativeMonadOracles(input.relative, {
      skewMonoidBridgeInput: input,
    });
    expect(
      results.some(
        (result) =>
          result.registryPath ===
          RelativeMonadLawRegistry.skewMonoidBridge.registryPath,
      ),
    ).toBe(true);
  });
});
