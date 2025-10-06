import { describe, expect, it } from "vitest";

import { TwoObjectCategory, type TwoArrow, type TwoObject } from "../../two-object-cat";
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
  fromMonad,
  relativeMonadFromEquipment,
  toMonadIfIdentity,
  type RelativeMonadData,
  type RelativeMonadSkewMonoidBridgeInput,
} from "../../relative/relative-monads";
import { describeTrivialRelativeAdjunction } from "../../relative/relative-adjunctions";
import {
  RelativeMonadOracles,
  enumerateRelativeMonadOracles,
} from "../../relative/relative-oracles";
import { RelativeMonadLawRegistry } from "../../relative/relative-laws";
import { checkRelativeMonadLaws } from "../../algebra-oracles";
import { CatMonad, composeFun, idFun } from "../../allTS";

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

const makeIdentityCatMonad = (): CatMonad<typeof TwoObjectCategory> => {
  const identityEndofunctor = {
    source: TwoObjectCategory,
    target: TwoObjectCategory,
    onObj: (object: TwoObject) => object,
    onMor: (arrow: TwoArrow) => arrow,
  };

  return {
    category: TwoObjectCategory,
    endofunctor: identityEndofunctor,
    unit: {
      source: idFun(TwoObjectCategory),
      target: identityEndofunctor,
      component: (object: TwoObject) => TwoObjectCategory.id(object),
    },
    mult: {
      source: composeFun(identityEndofunctor, identityEndofunctor),
      target: identityEndofunctor,
      component: (object: TwoObject) => TwoObjectCategory.id(object),
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

describe("relativeMonadFromEquipment", () => {
  it("constructs the trivial relative monad when restrictions succeed", () => {
    const { trivial } = makeTrivialData();
    const report = relativeMonadFromEquipment(trivial);
    expect(report.holds).toBe(true);
    expect(report.monad).toBe(trivial);
    expect(report.representability?.orientation).toBe("left");
    expect(report.leftRestriction).toBeDefined();
    expect(report.rightRestriction).toBeDefined();
    expect(report.looseMonoid.object).toBe(trivial.root.from);
    expect(report.looseMonoidReport.holds).toBe(true);
    expect(report.skewComposition?.holds).toBe(true);
  });

  it("flags missing restriction data", () => {
    const { trivial } = makeTrivialData();
    const sabotagedEquipment = {
      ...trivial.equipment,
      restrictions: {
        ...trivial.equipment.restrictions,
        left: (
          ..._args: Parameters<typeof trivial.equipment.restrictions.left>
        ) => undefined,
      },
    } as typeof trivial.equipment;

    const report = relativeMonadFromEquipment({
      ...trivial,
      equipment: sabotagedEquipment,
    });

    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Left restriction B(j,1) failed: equipment could not restrict the loose arrow along the root.",
    );
  });

  it("threads optional equipment analyzers when witnesses are supplied", () => {
    const { trivial } = makeTrivialData();
    const report = relativeMonadFromEquipment(trivial, {
      rightExtension: {
        loose: trivial.looseCell,
        along: trivial.root.tight,
        extension: trivial.looseCell,
        counit: trivial.unit,
      },
      rightLift: {
        loose: trivial.looseCell,
        along: trivial.root.tight,
        lift: trivial.looseCell,
        unit: trivial.unit,
      },
      density: {
        object: trivial.root.from,
        tight: trivial.root.tight,
      },
      fullyFaithful: {
        tight: trivial.root.tight,
        domain: trivial.root.from,
        codomain: trivial.root.to,
      },
    });

    expect(report.rightExtension?.holds).toBe(true);
    expect(report.rightLift?.holds).toBe(true);
    expect(report.density?.holds).toBe(true);
    expect(report.fullyFaithful?.holds).toBe(true);
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

describe("Identity-root adapters", () => {
  it("embeds and collapses an ordinary identity monad", () => {
    const monad = makeIdentityCatMonad();
    const relative = fromMonad(monad, {
      rootObject: "•",
      objects: TwoObjectCategory.objects,
    });

    expect(relative.root.from).toBe("•");
    expect(relative.carrier.tight).toBe(monad.endofunctor);

    const reduction = analyzeRelativeMonadIdentityReduction(relative);
    expect(reduction.holds).toBe(true);

    const collapse = toMonadIfIdentity(relative);
    expect(collapse.holds).toBe(true);
    expect(collapse.monad?.endofunctor).toBe(monad.endofunctor);
    expect(collapse.monad?.unit).toBe(monad.unit);
    expect(collapse.monad?.mult).toBe(monad.mult);
  });

  it("reports non-tight unit evidence when collapse fails", () => {
    const monad = makeIdentityCatMonad();
    const relative = fromMonad(monad, {
      rootObject: "•",
      objects: TwoObjectCategory.objects,
    });

    const collapse = toMonadIfIdentity({
      ...relative,
      unit: {
        ...relative.unit,
        evidence: {
          kind: "cartesian" as const,
          direction: "left" as const,
          tight: relative.equipment.tight.identity,
          details: "Simulated cartesian evidence to block the collapse.",
          boundary: relative.unit.boundaries.left,
        },
      },
    });

    expect(collapse.holds).toBe(false);
    expect(collapse.issues).toContain(
      "Relative monad unit evidence must be a tight 2-cell to recover the classical monad unit.",
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

describe("checkRelativeMonadLaws", () => {
  it("reports pending Street equalities while passing structural checks", () => {
    const { trivial } = makeTrivialData();
    const report = checkRelativeMonadLaws(trivial);
    expect(report.pending).toBe(true);
    expect(report.holds).toBe(false);
    expect(report.analysis.framing.holds).toBe(true);
    expect(report.analysis.unitCompatibility.holds).toBe(true);
    expect(report.analysis.extensionAssociativity.holds).toBe(true);
    expect(report.analysis.rootIdentity.holds).toBe(true);
    expect(report.analysis.unitCompatibility.witness.unitArrow).toBeDefined();
    expect(
      report.analysis.extensionAssociativity.witness.extensionSourceArrows.length,
    ).toBeGreaterThan(0);
    expect(report.analysis.rootIdentity.witness.restriction).toBeDefined();
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
