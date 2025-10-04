import { describe, expect, it } from "vitest";

import { TwoObjectCategory } from "../../two-object-cat";
import type { VirtualEquipment } from "../../virtual-equipment";
import {
  frameFromProarrow,
  identityProarrow,
  identityVerticalBoundary,
} from "../../virtual-equipment";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  analyzeRelativeAdjunctionFraming,
  analyzeRelativeAdjunctionHomIsomorphism,
  analyzeRelativeAdjunctionUnitCounit,
  analyzeRelativeAdjunctionPointwiseLeftLift,
  analyzeRelativeAdjunctionRightExtension,
  analyzeRelativeAdjunctionColimitPreservation,
  analyzeRelativeAdjunctionPrecomposition,
  describeTrivialRelativeAdjunction,
  describeTrivialRelativeAdjunctionUnitCounit,
  analyzeRelativeAdjunctionLeftMorphism,
  analyzeRelativeAdjunctionRightMorphism,
  analyzeRelativeAdjunctionStrictMorphism,
  describeIdentityRelativeAdjunctionLeftMorphism,
  describeIdentityRelativeAdjunctionRightMorphism,
  describeIdentityRelativeAdjunctionStrictMorphism,
  type RelativeAdjunctionData,
  type RelativeAdjunctionLeftLiftInput,
  type RelativeAdjunctionRightExtensionInput,
  type RelativeAdjunctionColimitPreservationInput,
  type RelativeAdjunctionUnitCounitPresentation,
  type RelativeAdjunctionLeftMorphismData,
  type RelativeAdjunctionRightMorphismData,
  type RelativeAdjunctionStrictMorphismData,
} from "../../relative/relative-adjunctions";
import {
  enumerateRelativeAdjunctionOracles,
  RelativeAdjunctionOracles,
  type RelativeAdjunctionOracleInputs,
} from "../../relative/relative-adjunction-oracles";
import { describeTrivialRelativeMonad } from "../../relative/relative-monads";

const makeTrivialAdjunction = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const adjunction = describeTrivialRelativeAdjunction(equipment, "•");
  return { equipment, adjunction } as const;
};

const buildIdentityLeftLiftInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionLeftLiftInput<Obj, Arr, Payload, Evidence> => {
  const loose = identityProarrow(equipment, object);
  const frame = frameFromProarrow(loose);
  const leftBoundary = identityVerticalBoundary(
    equipment,
    object,
    "Pointwise left lift unit left boundary (identity).",
  );
  const rightBoundary = identityVerticalBoundary(
    equipment,
    object,
    "Pointwise left lift unit right boundary (identity).",
  );
  const unitEvidence = equipment.cells.identity(frame, { left: leftBoundary, right: rightBoundary });
  return {
    lift: {
      loose,
      along: adjunction.root.tight,
      lift: loose,
      unit: {
        source: frame,
        target: frame,
        boundaries: { left: leftBoundary, right: rightBoundary },
        evidence: unitEvidence,
      },
    },
  };
};

const buildIdentityRightExtensionInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  leftLift: RelativeAdjunctionLeftLiftInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRightExtensionInput<Obj, Arr, Payload, Evidence> => {
  const loose = leftLift.lift.loose;
  const frame = frameFromProarrow(loose);
  const leftBoundary = identityVerticalBoundary(
    equipment,
    object,
    "Left extension counit left boundary (identity).",
  );
  const rightBoundary = identityVerticalBoundary(
    equipment,
    object,
    "Left extension counit right boundary (identity).",
  );
  const counitEvidence = equipment.cells.identity(frame, { left: leftBoundary, right: rightBoundary });
  const counit = {
    source: frame,
    target: frame,
    boundaries: { left: leftBoundary, right: rightBoundary },
    evidence: counitEvidence,
  } as const;
  const diagram = adjunction.root.tight;
  return {
    extension: {
      colimit: {
        weight: frame,
        diagram,
        apex: loose,
        cocone: counit,
      },
      extension: {
        loose,
        along: adjunction.root.tight,
        extension: loose,
        counit,
      },
    },
    fullyFaithful: {
      fullyFaithful: {
        tight: adjunction.root.tight,
        domain: object,
        codomain: object,
      },
      extension: {
        loose,
        along: adjunction.root.tight,
        extension: loose,
        counit,
      },
      inverse: counit,
    },
    pointwise: {
      extension: {
        colimit: {
          weight: frame,
          diagram,
          apex: loose,
          cocone: counit,
        },
        extension: {
          loose,
          along: adjunction.root.tight,
          extension: loose,
          counit,
        },
      },
      lift: leftLift.lift,
    },
  };
};

const buildIdentityColimitPreservationInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  rightExtension: RelativeAdjunctionRightExtensionInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionColimitPreservationInput<Obj, Arr, Payload, Evidence> => {
  const loose = rightExtension.extension.extension.loose;
  const frame = frameFromProarrow(loose);
  const leftBoundary = identityVerticalBoundary(
    equipment,
    object,
    "Colimit preservation counit left boundary (identity).",
  );
  const rightBoundary = identityVerticalBoundary(
    equipment,
    object,
    "Colimit preservation counit right boundary (identity).",
  );
  const counitEvidence = equipment.cells.identity(frame, { left: leftBoundary, right: rightBoundary });
  const counit = {
    source: frame,
    target: frame,
    boundaries: { left: leftBoundary, right: rightBoundary },
    evidence: counitEvidence,
  } as const;
  const rootColimit = rightExtension.extension;
  const leftColimit = {
    colimit: {
      weight: frame,
      diagram: adjunction.left.tight,
      apex: loose,
      cocone: counit,
    },
    extension: {
      loose,
      along: adjunction.left.tight,
      extension: loose,
      counit,
    },
  };
  return {
    root: rootColimit,
    left: leftColimit,
  };
};

type RelativeParams = ReturnType<typeof makeTrivialAdjunction>["adjunction"] extends RelativeAdjunctionData<
  infer Obj,
  infer Arr,
  infer Payload,
  infer Evidence
>
  ? [Obj, Arr, Payload, Evidence]
  : never;

type UnitCounitParams = RelativeAdjunctionUnitCounitPresentation<
  RelativeParams[0],
  RelativeParams[1],
  RelativeParams[2],
  RelativeParams[3]
>;

describe("Relative adjunction framing analyzer", () => {
  it("accepts the trivial identity adjunction", () => {
    const { adjunction } = makeTrivialAdjunction();
    const report = analyzeRelativeAdjunctionFraming(adjunction);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched left/right boundaries", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const broken = {
      ...adjunction,
      homIsomorphism: {
        ...adjunction.homIsomorphism,
        forward: {
          ...adjunction.homIsomorphism.forward,
          boundaries: {
            ...adjunction.homIsomorphism.forward.boundaries,
            right: identityVerticalBoundary(
              equipment,
              "★",
              "Deliberately incorrect companion boundary for testing.",
            ),
          },
        },
      },
    };
    const report = analyzeRelativeAdjunctionFraming(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Forward hom isomorphism right boundary must coincide with the designated tight boundary.",
    );
  });
});

describe("Relative adjunction hom-isomorphism analyzer", () => {
  it("accepts the identity witnesses", () => {
    const { adjunction } = makeTrivialAdjunction();
    const report = analyzeRelativeAdjunctionHomIsomorphism(adjunction);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags inconsistent frame boundaries", () => {
    const { adjunction } = makeTrivialAdjunction();
    const broken = {
      ...adjunction,
      homIsomorphism: {
        ...adjunction.homIsomorphism,
        forward: {
          ...adjunction.homIsomorphism.forward,
          source: {
            ...adjunction.homIsomorphism.forward.source,
            rightBoundary: "★" as RelativeParams[0],
          },
        },
      },
    };
    const report = analyzeRelativeAdjunctionHomIsomorphism(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Forward hom isomorphism source frame should end at the codomain shared by r and j.",
    );
  });
});

describe("Relative adjunction unit/counit analyzer", () => {
  it("accepts the identity presentation", () => {
    const { adjunction } = makeTrivialAdjunction();
    const presentation = describeTrivialRelativeAdjunctionUnitCounit(adjunction) as UnitCounitParams;
    const report = analyzeRelativeAdjunctionUnitCounit(adjunction, presentation);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched unit boundary data", () => {
    const { adjunction } = makeTrivialAdjunction();
    const presentation = describeTrivialRelativeAdjunctionUnitCounit(adjunction);
    const broken = {
      ...presentation,
      unit: {
        ...presentation.unit,
        boundaries: {
          ...presentation.unit.boundaries,
          right: adjunction.left,
        },
      },
    } as UnitCounitParams;
    const report = analyzeRelativeAdjunctionUnitCounit(adjunction, broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain("Unit 2-cell must reuse the right leg r as its right boundary.");
  });
});

describe("Relative adjunction pointwise left lift analyzer", () => {
  it("accepts the identity lift", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const leftLift = buildIdentityLeftLiftInput(equipment, "•", adjunction) as RelativeAdjunctionLeftLiftInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const report = analyzeRelativeAdjunctionPointwiseLeftLift(adjunction, leftLift);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched lift codomain", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const leftLift = buildIdentityLeftLiftInput(equipment, "•", adjunction);
    const broken = {
      ...leftLift,
      lift: {
        ...leftLift.lift,
        lift: {
          ...leftLift.lift.lift,
          to: "★" as RelativeParams[0],
        },
      },
    } as RelativeAdjunctionLeftLiftInput<RelativeParams[0], RelativeParams[1], RelativeParams[2], RelativeParams[3]>;
    const report = analyzeRelativeAdjunctionPointwiseLeftLift(adjunction, broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Computed lift arrow should land at the right leg codomain",
    );
  });
});

describe("Relative adjunction left extension analyzer", () => {
  it("accepts the identity extension", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const leftLift = buildIdentityLeftLiftInput(equipment, "•", adjunction);
    const extension = buildIdentityRightExtensionInput(equipment, "•", adjunction, leftLift) as RelativeAdjunctionRightExtensionInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const report = analyzeRelativeAdjunctionRightExtension(adjunction, extension);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags wrong extension codomain", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const leftLift = buildIdentityLeftLiftInput(equipment, "•", adjunction);
    const extension = buildIdentityRightExtensionInput(equipment, "•", adjunction, leftLift);
    const broken = {
      ...extension,
      extension: {
        ...extension.extension,
        extension: {
          ...extension.extension.extension,
          to: "★" as RelativeParams[0],
        },
      },
    } as RelativeAdjunctionRightExtensionInput<RelativeParams[0], RelativeParams[1], RelativeParams[2], RelativeParams[3]>;
    const report = analyzeRelativeAdjunctionRightExtension(adjunction, broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Resulting extension arrow should land at r’s codomain",
    );
  });
});

describe("Relative adjunction colimit preservation analyzer", () => {
  it("accepts the shared identity colimit", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const leftLift = buildIdentityLeftLiftInput(equipment, "•", adjunction);
    const extension = buildIdentityRightExtensionInput(equipment, "•", adjunction, leftLift);
    const colimit = buildIdentityColimitPreservationInput(equipment, "•", adjunction, extension) as RelativeAdjunctionColimitPreservationInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const report = analyzeRelativeAdjunctionColimitPreservation(adjunction, colimit);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags mismatched weight boundaries", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const leftLift = buildIdentityLeftLiftInput(equipment, "•", adjunction);
    const extension = buildIdentityRightExtensionInput(equipment, "•", adjunction, leftLift);
    const colimit = buildIdentityColimitPreservationInput(equipment, "•", adjunction, extension);
    const broken = {
      ...colimit,
      left: {
        ...colimit.left,
        colimit: {
          ...colimit.left.colimit,
          weight: {
            ...colimit.left.colimit.weight,
            rightBoundary: "★" as RelativeParams[0],
          },
        },
      },
    } as RelativeAdjunctionColimitPreservationInput<RelativeParams[0], RelativeParams[1], RelativeParams[2], RelativeParams[3]>;
    const report = analyzeRelativeAdjunctionColimitPreservation(adjunction, broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain("Shared weighted colimit should end at");
  });
});

describe("Relative adjunction precomposition analyzer", () => {
  it("accepts identity precomposition", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const identity = identityVerticalBoundary(
      equipment,
      "•",
      "Identity tight cell supplying Proposition 5.29 precomposition.",
    );
    const report = analyzeRelativeAdjunctionPrecomposition({
      adjunction,
      precomposition: identity,
    });
    expect(report.holds).toBe(true);
    expect(report.root?.from).toBe(identity.from);
    expect(report.left?.from).toBe(identity.from);
  });

  it("detects mismatched domains", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const mismatch = identityVerticalBoundary(
      equipment,
      "○",
      "Domain-mismatched precomposition to force a failure.",
    );
    const report = analyzeRelativeAdjunctionPrecomposition({
      adjunction,
      precomposition: mismatch,
    });
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Precomposition tight cell must target the adjunction root domain A.",
    );
  });
});

describe("Relative adjunction oracles", () => {
  it("summarises framing and hom-isomorphism results", () => {
    const { adjunction } = makeTrivialAdjunction();
    const framing = RelativeAdjunctionOracles.framing(adjunction);
    expect(framing.pending).toBe(false);
    expect(framing.holds).toBe(true);
    const homIso = RelativeAdjunctionOracles.homIsomorphism(adjunction);
    expect(homIso.pending).toBe(false);
    expect(homIso.holds).toBe(true);
  });

  it("defaults the precomposition oracle to pending when absent", () => {
    const { adjunction } = makeTrivialAdjunction();
    const result = RelativeAdjunctionOracles.precomposition(adjunction);
    expect(result.pending).toBe(true);
    expect(result.holds).toBe(false);
  });

  it("confirms identity precomposition when supplied", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const precomposition = identityVerticalBoundary(
      equipment,
      "•",
      "Identity tight cell supplied to the precomposition oracle.",
    );
    const result = RelativeAdjunctionOracles.precomposition(adjunction, precomposition);
    expect(result.pending).toBe(false);
    expect(result.holds).toBe(true);
  });

  it("defaults the unit/counit oracle to pending when absent", () => {
    const { adjunction } = makeTrivialAdjunction();
    const result = RelativeAdjunctionOracles.unitCounitPresentation(adjunction);
    expect(result.pending).toBe(true);
    expect(result.holds).toBe(false);
  });

  it("defaults the resolution oracle to pending when no monad is supplied", () => {
    const { adjunction } = makeTrivialAdjunction();
    const result = RelativeAdjunctionOracles.resolution(adjunction);
    expect(result.pending).toBe(true);
    expect(result.holds).toBe(false);
  });

  it("confirms resolutions when provided with a matching monad", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const monad = describeTrivialRelativeMonad(equipment, "•");
    const result = RelativeAdjunctionOracles.resolution(adjunction, monad);
    expect(result.pending).toBe(false);
    expect(result.holds).toBe(true);
  });

  describe("relative adjunction morphism analyzers", () => {
    it("validates the identity left morphism", () => {
      const { adjunction } = makeTrivialAdjunction();
      const morphism = describeIdentityRelativeAdjunctionLeftMorphism(adjunction);
      const report = analyzeRelativeAdjunctionLeftMorphism(morphism);
      expect(report.holds).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("detects mismatched apexes for left morphisms", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const morphism = describeIdentityRelativeAdjunctionLeftMorphism(adjunction);
      const mismatchedComparison = identityVerticalBoundary(
        equipment,
        "★" as RelativeParams[0],
        "Mismatched apex for testing purposes.",
      );
      const report = analyzeRelativeAdjunctionLeftMorphism({
        ...morphism,
        comparison: mismatchedComparison,
      } as RelativeAdjunctionLeftMorphismData<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >);
      expect(report.holds).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Comparison tight cell must start"),
        ]),
      );
    });

    it("validates the identity right morphism", () => {
      const { adjunction } = makeTrivialAdjunction();
      const morphism = describeIdentityRelativeAdjunctionRightMorphism(adjunction);
      const report = analyzeRelativeAdjunctionRightMorphism(morphism);
      expect(report.holds).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("detects mismatched domains for right morphisms", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const morphism = describeIdentityRelativeAdjunctionRightMorphism(adjunction);
      const mismatchedComparison = identityVerticalBoundary(
        equipment,
        "★" as RelativeParams[0],
        "Mismatched right-domain for testing purposes.",
      );
      const report = analyzeRelativeAdjunctionRightMorphism({
        ...morphism,
        comparison: mismatchedComparison,
      } as RelativeAdjunctionRightMorphismData<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >);
      expect(report.holds).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Comparison tight cell must start"),
        ]),
      );
    });

    it("packages identity strict morphisms as simultaneous left/right data", () => {
      const { adjunction } = makeTrivialAdjunction();
      const morphism = describeIdentityRelativeAdjunctionStrictMorphism(adjunction);
      const report = analyzeRelativeAdjunctionStrictMorphism(morphism);
      expect(report.holds).toBe(true);
      expect(report.left.holds).toBe(true);
      expect(report.right.holds).toBe(true);
    });
  });

  it("enumerates the oracle catalogue", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const presentation = describeTrivialRelativeAdjunctionUnitCounit(adjunction) as UnitCounitParams;
    const leftLift = buildIdentityLeftLiftInput(equipment, "•", adjunction);
    const extension = buildIdentityRightExtensionInput(equipment, "•", adjunction, leftLift);
    const colimit = buildIdentityColimitPreservationInput(equipment, "•", adjunction, extension);
    const leftMorphism = describeIdentityRelativeAdjunctionLeftMorphism(adjunction);
    const rightMorphism = describeIdentityRelativeAdjunctionRightMorphism(adjunction);
    const strictMorphism = describeIdentityRelativeAdjunctionStrictMorphism(adjunction);
    const monad = describeTrivialRelativeMonad(equipment, "•");
    const withPresentation: RelativeAdjunctionOracleInputs<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      unitCounit: presentation,
      leftLift,
      rightExtension: extension,
      colimitPreservation: colimit,
      leftMorphism,
      rightMorphism,
      strictMorphism,
      resolution: { monad },
      precomposition: identityVerticalBoundary(
        equipment,
        "•",
        "Identity tight cell supplied to enumerate the precomposition oracle.",
      ),
    };
    const results = enumerateRelativeAdjunctionOracles(adjunction, withPresentation);
    expect(results).toHaveLength(11);
    expect(results[2].pending).toBe(false);
    expect(results[2].holds).toBe(true);
    expect(results[3].pending).toBe(false);
    expect(results[4].pending).toBe(false);
    expect(results[5].pending).toBe(false);
    expect(results[6].pending).toBe(false);
    expect(results[6].holds).toBe(true);
    expect(results[7].pending).toBe(false);
    expect(results[8].pending).toBe(false);
    expect(results[9].pending).toBe(false);
    expect(results[10].pending).toBe(false);
  });
});
