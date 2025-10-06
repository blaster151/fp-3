import { describe, expect, it } from "vitest";

import { TwoObjectCategory } from "../../two-object-cat";
import type { VirtualEquipment } from "../../virtual-equipment";
import type { FullyFaithfulInput } from "../../virtual-equipment/faithfulness";
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
  analyzeRelativeAdjunctionPasting,
  analyzeRelativeAdjunctionFullyFaithfulPostcomposition,
  analyzeRelativeAdjunctionInducedMonadsCoincide,
  analyzeRelativeAdjunctionResolutePair,
  analyzeRelativeAdjunctionResoluteLeftMorphism,
  analyzeRelativeAdjunctionOrdinaryLeftAdjointComposition,
  analyzeRelativeAdjunctionRelativeMonadModule,
  analyzeRelativeAdjunctionRelativeMonadPasting,
  analyzeRelativeAdjunctionRelativeMonadPastingFullyFaithful,
  analyzeRelativeAdjunctionRelativeMonadPastingAdjunction,
  analyzeRelativeAdjunctionRelativeMonadComposite,
  analyzeRelativeAdjunctionRelativeMonadLiteratureRecoveries,
  analyzeRelativeAdjunctionRelativeMonadLeftOpalgebra,
  analyzeRelativeAdjunctionRelativeMonadRightAlgebra,
  analyzeRelativeAdjunctionRelativeMonadResolutionFunctor,
  analyzeRelativeAdjunctionRelativeMonadOpalgebraTransport,
  analyzeRelativeAdjunctionRelativeMonadAlgebraTransport,
  analyzeRelativeAdjunctionRelativeMonadTransportEquivalence,
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
  type RelativeAdjunctionPastingInput,
  type RelativeAdjunctionFullyFaithfulPostcompositionInput,
  type RelativeAdjunctionInducedMonadsInput,
  type RelativeAdjunctionResoluteInput,
  type RelativeAdjunctionResoluteLeftMorphismInput,
  type RelativeAdjunctionRelativeMonadModuleInput,
  type RelativeAdjunctionRelativeMonadPastingWitness,
  type RelativeAdjunctionRelativeMonadPastingFullyFaithfulInput,
  type RelativeAdjunctionRelativeMonadPastingAdjunctionInput,
  type RelativeAdjunctionRelativeMonadCompositeInput,
  type RelativeAdjunctionRelativeMonadLiteratureWitness,
  type RelativeAdjunctionRelativeMonadLeftOpalgebraInput,
  type RelativeAdjunctionRelativeMonadRightAlgebraInput,
  type RelativeAdjunctionRelativeMonadResolutionFunctorInput,
  type RelativeAdjunctionRelativeMonadOpalgebraTransportInput,
  type RelativeAdjunctionRelativeMonadAlgebraTransportInput,
  type RelativeAdjunctionRelativeMonadTransportEquivalenceInput,
} from "../../relative/relative-adjunctions";
import {
  describeIdentityRelativeAlgebraMorphism,
  describeIdentityRelativeOpalgebraMorphism,
} from "../../relative/relative-algebras";
import {
  enumerateRelativeAdjunctionOracles,
  RelativeAdjunctionOracles,
  type RelativeAdjunctionOracleInputs,
} from "../../relative/relative-adjunction-oracles";
import { describeTrivialRelativeMonad } from "../../relative/relative-monads";
import type { RelativeMonadData } from "../../relative/relative-monads";

const makeTrivialAdjunction = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const adjunction = describeTrivialRelativeAdjunction(equipment, "•");
  return { equipment, adjunction } as const;
};

const buildTrivialPastingInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
): RelativeAdjunctionPastingInput<Obj, Arr, Payload, Evidence> => {
  const outer = describeTrivialRelativeAdjunction(equipment, object);
  const inner = describeTrivialRelativeAdjunction(equipment, object);
  const result = describeTrivialRelativeAdjunction(equipment, object);
  const loose = identityProarrow(equipment, object);
  const frame = frameFromProarrow(loose);
  const boundaries = { left: outer.left, right: result.left } as const;
  const evidence = equipment.cells.identity(frame, boundaries);
  return {
    outer,
    inner,
    result,
    leftMorphism: {
      source: outer,
      target: result,
      comparison: identityVerticalBoundary(
        equipment,
        object,
        "Identity comparison between pasted adjunction apices.",
      ),
      transformation: {
        source: frame,
        target: frame,
        boundaries,
        evidence,
      },
    },
  };
};

const buildIdentityResoluteInputs = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
) => {
  const resolute: RelativeAdjunctionResoluteInput<Obj, Arr, Payload, Evidence> = {
    postcomposition: {
      base: adjunction,
      postcompose: identityVerticalBoundary(
        equipment,
        adjunction.root.to,
        "Identity fully faithful postcomposition witness.",
      ),
      result: adjunction,
    },
    inducedMonads: { left: monad, right: monad },
  };
  const leftMorphism = describeIdentityRelativeAdjunctionLeftMorphism(adjunction);
  const pasting: RelativeAdjunctionPastingInput<Obj, Arr, Payload, Evidence> = {
    outer: adjunction,
    inner: adjunction,
    result: adjunction,
    leftMorphism,
  };
  const precomposition = {
    adjunction,
    precomposition: identityVerticalBoundary(
      equipment,
      adjunction.root.from,
      "Identity precomposition witness for the resolute pair.",
    ),
  } as const;
  const leftMorphismInput: RelativeAdjunctionResoluteLeftMorphismInput<
    Obj,
    Arr,
    Payload,
    Evidence
  > = {
    resolute,
    precomposition,
    pasting,
  };
  return { resolute, pasting, precomposition, leftMorphismInput } as const;
};

const buildIdentityRelativeMonadModuleInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  resolute: RelativeAdjunctionResoluteLeftMorphismInput<Obj, Arr, Payload, Evidence>,
) => ({
  leftMorphism: resolute,
  module: {
    monad,
    carrier: adjunction.left,
    action: resolute.pasting.leftMorphism.transformation,
  },
});

const buildLeftOpalgebraInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadLeftOpalgebraInput<Obj, Arr, Payload, Evidence> => ({
  presentation: {
    monad,
    opalgebra: {
      carrier: adjunction.left,
      action: monad.unit,
      details: "Trivial left opalgebra action supplied by the relative monad unit.",
    },
  },
  details: "Left leg inherits the trivial T-opalgebra structure.",
});

const buildRightAlgebraInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadRightAlgebraInput<Obj, Arr, Payload, Evidence> => ({
  presentation: {
    monad,
    algebra: {
      carrier: adjunction.right,
      action: monad.extension,
      details: "Trivial right algebra action supplied by the relative monad extension.",
    },
  },
  details: "Right leg inherits the trivial T-algebra structure.",
});

const buildResolutionFunctorInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadResolutionFunctorInput<Obj, Arr, Payload, Evidence> => ({
  left: buildLeftOpalgebraInput(adjunction, monad),
  right: buildRightAlgebraInput(adjunction, monad),
  details: "Canonical (op)algebra functors recorded for the trivial adjunction.",
});

const buildIdentityRelativeMonadPastingWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadPastingWitness<Obj, Arr, Payload, Evidence> => {
  const unitLoose = identityProarrow(equipment, monad.root.from);
  const unitFrame = frameFromProarrow(unitLoose);
  const unitBoundaries = { left: monad.root, right: monad.root } as const;
  const unitEvidence = equipment.cells.identity(unitFrame, unitBoundaries);
  const unit = {
    source: unitFrame,
    target: unitFrame,
    boundaries: unitBoundaries,
    evidence: unitEvidence,
  } as const;

  const extensionLoose = identityProarrow(equipment, monad.carrier.from);
  const extensionFrame = frameFromProarrow(extensionLoose);
  const extensionBoundaries = { left: monad.carrier, right: monad.carrier } as const;
  const extensionEvidence = equipment.cells.identity(extensionFrame, extensionBoundaries);
  const extension = {
    source: extensionFrame,
    target: extensionFrame,
    boundaries: extensionBoundaries,
    evidence: extensionEvidence,
  } as const;

  return {
    source: monad,
    sourceAdjunction: adjunction,
    leftAdjunction: adjunction,
    result: monad,
    comparison: { unit, extension },
  };
};

const buildOpalgebraTransportInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadOpalgebraTransportInput<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const pasting = buildIdentityRelativeMonadPastingWitness(
    equipment,
    adjunction,
    monad,
  );
  const sourceInput = buildLeftOpalgebraInput(adjunction, monad);
  const targetInput = buildRightAlgebraInput(adjunction, monad);
  return {
    pasting,
    source: sourceInput.presentation,
    target: targetInput.presentation,
    naturality: {
      tNaturality: describeIdentityRelativeOpalgebraMorphism(
        sourceInput.presentation,
      ),
      TNaturality: describeIdentityRelativeAlgebraMorphism(
        targetInput.presentation,
      ),
      details: "Identity naturality witnesses supplied by the canonical actions.",
    },
    details: "Identity transport of the canonical opalgebra across the trivial pasting.",
  };
};

const buildAlgebraTransportInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadAlgebraTransportInput<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const pasting = buildIdentityRelativeMonadPastingWitness(
    equipment,
    adjunction,
    monad,
  );
  const sourceInput = buildRightAlgebraInput(adjunction, monad);
  const targetInput = buildLeftOpalgebraInput(adjunction, monad);
  return {
    pasting,
    source: sourceInput.presentation,
    target: targetInput.presentation,
    naturality: {
      tNaturality: describeIdentityRelativeOpalgebraMorphism(
        targetInput.presentation,
      ),
      TNaturality: describeIdentityRelativeAlgebraMorphism(
        sourceInput.presentation,
      ),
      details:
        "Identity naturality witnesses reused from the canonical algebra and opalgebra actions.",
    },
    details: "Identity transport of the canonical algebra across the trivial pasting.",
  };
};

const buildTransportEquivalenceInput = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadTransportEquivalenceInput<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const opalgebra = buildOpalgebraTransportInput(equipment, adjunction, monad);
  const algebra = buildAlgebraTransportInput(equipment, adjunction, monad);
  const leftInput = buildLeftOpalgebraInput(adjunction, monad);
  const rightInput = buildRightAlgebraInput(adjunction, monad);
  return {
    opalgebra,
    algebra,
    unitComparison: describeIdentityRelativeAlgebraMorphism(
      rightInput.presentation,
    ),
    counitComparison: describeIdentityRelativeOpalgebraMorphism(
      leftInput.presentation,
    ),
    details:
      "Identity transport equivalence witnesses record Remark 6.28 for the trivial adjunction.",
  };
};

const buildIdentityFullyFaithfulWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): FullyFaithfulInput<Obj, Arr> => ({
  tight: adjunction.right.tight,
  domain: adjunction.right.from,
  codomain: adjunction.right.to,
});

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

describe("Relative adjunction pasting analyzer", () => {
  it("accepts nested identity data", () => {
    const { equipment } = makeTrivialAdjunction();
    const input = buildTrivialPastingInput(equipment, "•");
    const report = analyzeRelativeAdjunctionPasting(input);
    expect(report.holds).toBe(true);
    expect(report.leftMorphism.holds).toBe(true);
    expect(report.composedLeft).toBeDefined();
  });

  it("detects mismatched pasted left legs", () => {
    const { equipment } = makeTrivialAdjunction();
    const input = buildTrivialPastingInput(
      equipment,
      "•" as RelativeParams[0],
    );
    const brokenResult = {
      ...input.result,
      left: identityVerticalBoundary(
        equipment,
        "★" as RelativeParams[0],
        "Intentionally wrong pasted left leg for testing.",
      ),
    } as RelativeAdjunctionData<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const report = analyzeRelativeAdjunctionPasting({
      ...input,
      result: brokenResult,
    });
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Pasted left leg should equal the composite ℓ₂ ∘ ℓ₁ from Proposition 5.30.",
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

  it("defaults the pasting oracle to pending when nested data is missing", () => {
    const result = RelativeAdjunctionOracles.pasting();
    expect(result.pending).toBe(true);
    expect(result.holds).toBe(false);
  });

  it("reports on nested identity pasting when supplied", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const input = buildTrivialPastingInput(
      equipment,
      "•" as RelativeParams[0],
    );
    const result = RelativeAdjunctionOracles.pasting(input);
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

  describe("fully faithful postcomposition analyzer", () => {
    it("accepts the identity postcomposition", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const postcompose = identityVerticalBoundary(
        equipment,
        "•" as RelativeParams[0],
        "Identity postcomposition for testing purposes.",
      );
      const input: RelativeAdjunctionFullyFaithfulPostcompositionInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      > = {
        base: adjunction,
        postcompose,
        result: adjunction,
      };
      const report = analyzeRelativeAdjunctionFullyFaithfulPostcomposition(input);
      expect(report.holds).toBe(true);
      expect(report.issues).toHaveLength(0);
      expect(report.fullyFaithful.holds).toBe(true);
    });

    it("detects mismatched postcomposition boundaries", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const postcompose = identityVerticalBoundary(
        equipment,
        "•" as RelativeParams[0],
        "Identity postcomposition for mismatch testing.",
      );
      const mismatchedResult = {
        ...adjunction,
        root: identityVerticalBoundary(
          equipment,
          "★" as RelativeParams[0],
          "Mismatched postcomposition codomain for testing.",
        ),
      } as RelativeAdjunctionData<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const input: RelativeAdjunctionFullyFaithfulPostcompositionInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      > = {
        base: adjunction,
        postcompose,
        result: mismatchedResult,
      };
      const report = analyzeRelativeAdjunctionFullyFaithfulPostcomposition(input);
      expect(report.holds).toBe(false);
      expect(report.issues).toEqual(
        expect.arrayContaining([
          "Postcomposed relative adjunction root should equal u ∘ j.",
        ]),
      );
    });
  });

  it("defaults the fully faithful postcomposition oracle to pending when absent", () => {
    const result = RelativeAdjunctionOracles.fullyFaithfulPostcomposition();
    expect(result.pending).toBe(true);
    expect(result.holds).toBe(false);
  });

  it("confirms fully faithful postcomposition through the oracle", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const postcompose = identityVerticalBoundary(
      equipment,
      "•" as RelativeParams[0],
      "Oracle identity postcomposition witness.",
    );
    const input: RelativeAdjunctionFullyFaithfulPostcompositionInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      base: adjunction,
      postcompose,
      result: adjunction,
    };
    const result = RelativeAdjunctionOracles.fullyFaithfulPostcomposition(input);
    expect(result.pending).toBe(false);
    expect(result.holds).toBe(true);
  });

  it("defaults the induced-monad coincidence oracle to pending when absent", () => {
    const result = RelativeAdjunctionOracles.inducedMonadsCoincide();
    expect(result.pending).toBe(true);
    expect(result.holds).toBe(false);
  });

  it("confirms induced monad coincidence for identical data", () => {
    const { equipment } = makeTrivialAdjunction();
    const monad = describeTrivialRelativeMonad(equipment, "•" as RelativeParams[0]);
    const input: RelativeAdjunctionInducedMonadsInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      left: monad,
      right: monad,
    };
    const report = analyzeRelativeAdjunctionInducedMonadsCoincide(input);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    const oracleResult = RelativeAdjunctionOracles.inducedMonadsCoincide(input);
    expect(oracleResult.pending).toBe(false);
    expect(oracleResult.holds).toBe(true);
  });

  it("detects induced monad mismatches", () => {
    const { equipment } = makeTrivialAdjunction();
    const monad = describeTrivialRelativeMonad(equipment, "•" as RelativeParams[0]);
    const mismatchedCarrier = identityVerticalBoundary(
      equipment,
      "★" as RelativeParams[0],
      "Mismatched carrier for induced monad testing.",
    );
    const mismatched: RelativeMonadData<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      ...monad,
      carrier: mismatchedCarrier,
    };
    const input: RelativeAdjunctionInducedMonadsInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    > = {
      left: monad,
      right: mismatched,
    };
    const report = analyzeRelativeAdjunctionInducedMonadsCoincide(input);
    expect(report.holds).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        "Relative monad carriers must coincide for the induced monads to agree.",
      ]),
    );
  });

  it("analyzes resolute pairs with identity witnesses", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const monad = describeTrivialRelativeMonad(equipment, "•");
    const { resolute } = buildIdentityResoluteInputs(equipment, adjunction, monad);
    const report = analyzeRelativeAdjunctionResolutePair(resolute);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.details).toContain("resolute pair");
  });

  it("detects equipment mismatches in resolute pairs", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const monad = describeTrivialRelativeMonad(equipment, "•");
    const { resolute } = buildIdentityResoluteInputs(equipment, adjunction, monad);
    const mismatchedEquipment = virtualizeFiniteCategory(TwoObjectCategory);
    const mismatchedMonad = describeTrivialRelativeMonad(mismatchedEquipment, "•");
    const report = analyzeRelativeAdjunctionResolutePair({
      postcomposition: resolute.postcomposition,
      inducedMonads: { left: resolute.inducedMonads.left, right: mismatchedMonad },
    });
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Resolute pair expects the j'-relative monad to share the postcomposed adjunction's equipment.",
    );
  });

  it("assembles resolute left morphisms from identity data", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const monad = describeTrivialRelativeMonad(equipment, "•");
    const { leftMorphismInput } = buildIdentityResoluteInputs(equipment, adjunction, monad);
    const report = analyzeRelativeAdjunctionResoluteLeftMorphism(leftMorphismInput);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
    expect(report.details).toContain("left morphism");
  });

  it("surfaces pasting misalignment in resolute left morphisms", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const monad = describeTrivialRelativeMonad(equipment, "•");
    const { leftMorphismInput } = buildIdentityResoluteInputs(equipment, adjunction, monad);
    const mismatchedAdjunction = describeTrivialRelativeAdjunction(equipment, "•");
    const broken = {
      ...leftMorphismInput,
      pasting: {
        ...leftMorphismInput.pasting,
        result: mismatchedAdjunction,
      },
    };
    const report = analyzeRelativeAdjunctionResoluteLeftMorphism(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Resolute left morphism expects the pasted result adjunction to equal the fully faithful postcomposition.",
    );
  });

  it("wraps ordinary left adjoint composition without altering issues", () => {
    const { equipment, adjunction } = makeTrivialAdjunction();
    const monad = describeTrivialRelativeMonad(equipment, "•");
    const { leftMorphismInput } = buildIdentityResoluteInputs(equipment, adjunction, monad);
    const report = analyzeRelativeAdjunctionOrdinaryLeftAdjointComposition(leftMorphismInput);
    expect(report.holds).toBe(true);
    expect(report.leftMorphism.holds).toBe(true);
    expect(report.issues).toBe(report.leftMorphism.issues);
  });

  describe("Relative adjunction relative monad module analyzer", () => {
    it("confirms the Proposition 5.36 module for the identity adjunction", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const resoluteInputs = buildIdentityResoluteInputs(equipment, adjunction, monad);
      const moduleInput = buildIdentityRelativeMonadModuleInput(
        adjunction,
        monad,
        resoluteInputs.leftMorphismInput,
      ) as RelativeAdjunctionRelativeMonadModuleInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadModule(moduleInput);
      expect(report.holds).toBe(true);
      expect(report.issues).toHaveLength(0);
    });
  });

  describe("Relative adjunction canonical left opalgebra analyzer", () => {
    it("records the trivial left opalgebra structure", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const input = buildLeftOpalgebraInput(adjunction, monad) as RelativeAdjunctionRelativeMonadLeftOpalgebraInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadLeftOpalgebra(adjunction, input);
      expect(report.pending).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("flags mismatched left opalgebra carrier", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const input = buildLeftOpalgebraInput(adjunction, monad) as RelativeAdjunctionRelativeMonadLeftOpalgebraInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const broken = {
        ...input,
        presentation: {
          ...input.presentation,
          opalgebra: {
            ...input.presentation.opalgebra,
            carrier: monad.root,
          },
        },
      } as RelativeAdjunctionRelativeMonadLeftOpalgebraInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadLeftOpalgebra(adjunction, broken);
      expect(report.pending).toBe(false);
      expect(report.issues).toContain(
        "Left opalgebra carrier should coincide with the relative adjunction left leg.",
      );
    });
  });

  describe("Relative adjunction canonical right algebra analyzer", () => {
    it("records the trivial right algebra structure", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const input = buildRightAlgebraInput(adjunction, monad) as RelativeAdjunctionRelativeMonadRightAlgebraInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadRightAlgebra(adjunction, input);
      expect(report.pending).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("flags mismatched right algebra carrier", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const input = buildRightAlgebraInput(adjunction, monad) as RelativeAdjunctionRelativeMonadRightAlgebraInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const broken = {
        ...input,
        presentation: {
          ...input.presentation,
          algebra: {
            ...input.presentation.algebra,
            carrier: monad.root,
          },
        },
      } as RelativeAdjunctionRelativeMonadRightAlgebraInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadRightAlgebra(adjunction, broken);
      expect(report.pending).toBe(false);
      expect(report.issues).toContain(
        "Right algebra carrier should coincide with the relative adjunction right leg.",
      );
    });
  });

  describe("Relative adjunction resolution functor analyzer", () => {
    it("records the canonical functor data", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const input = buildResolutionFunctorInput(adjunction, monad) as RelativeAdjunctionRelativeMonadResolutionFunctorInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadResolutionFunctor(adjunction, input);
      expect(report.pending).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("propagates structural issues from the component analyzers", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const input = buildResolutionFunctorInput(adjunction, monad) as RelativeAdjunctionRelativeMonadResolutionFunctorInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const broken = {
        ...input,
        left: {
          ...input.left,
          presentation: {
            ...input.left.presentation,
            opalgebra: {
              ...input.left.presentation.opalgebra,
              carrier: monad.root,
            },
          },
        },
      } as RelativeAdjunctionRelativeMonadResolutionFunctorInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadResolutionFunctor(adjunction, broken);
      expect(report.pending).toBe(false);
      expect(report.issues).toContain(
        "Left opalgebra carrier should coincide with the relative adjunction left leg.",
      );
    });
  });

  describe("Relative adjunction relative monad pasting analyzers", () => {
    it("recognises the identity pasting witnesses", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const witness = buildIdentityRelativeMonadPastingWitness(equipment, adjunction, monad) as RelativeAdjunctionRelativeMonadPastingWitness<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadPasting(witness);
      expect(report.holds).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("accepts the identity fully faithful witness", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const witness = buildIdentityRelativeMonadPastingWitness(equipment, adjunction, monad);
      const fullyFaithful = buildIdentityFullyFaithfulWitness(adjunction);
      const input = {
        pasting: witness,
        fullyFaithful,
      } as RelativeAdjunctionRelativeMonadPastingFullyFaithfulInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadPastingFullyFaithful(input);
      expect(report.holds).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("confirms Example 5.39 for identity data", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const witness = buildIdentityRelativeMonadPastingWitness(equipment, adjunction, monad);
      const input = {
        first: witness,
        second: witness,
      } as RelativeAdjunctionRelativeMonadPastingAdjunctionInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadPastingAdjunction(input);
      expect(report.holds).toBe(true);
      expect(report.issues).toHaveLength(0);
    });
  });

  describe("Relative adjunction module/pasting composites", () => {
    it("verifies the Corollary 5.40 composite in the identity case", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const resoluteInputs = buildIdentityResoluteInputs(equipment, adjunction, monad);
      const moduleInput = buildIdentityRelativeMonadModuleInput(
        adjunction,
        monad,
        resoluteInputs.leftMorphismInput,
      );
      const pastingWitness = buildIdentityRelativeMonadPastingWitness(equipment, adjunction, monad);
      const input = {
        module: moduleInput,
        pasting: pastingWitness,
      } as RelativeAdjunctionRelativeMonadCompositeInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadComposite(input);
      expect(report.holds).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("accepts the Example 5.41 literature recoveries", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const resoluteInputs = buildIdentityResoluteInputs(equipment, adjunction, monad);
      const moduleInput = buildIdentityRelativeMonadModuleInput(
        adjunction,
        monad,
        resoluteInputs.leftMorphismInput,
      );
      const pastingWitness = buildIdentityRelativeMonadPastingWitness(equipment, adjunction, monad);
      const compositeInput = {
        module: moduleInput,
        pasting: pastingWitness,
      } as RelativeAdjunctionRelativeMonadCompositeInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const literatureInput = {
        composite: compositeInput,
        hutson: monad,
        acu: monad,
      } as RelativeAdjunctionRelativeMonadLiteratureWitness<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadLiteratureRecoveries(literatureInput);
      expect(report.holds).toBe(true);
      expect(report.issues).toHaveLength(0);
    });
  });

  describe("Relative adjunction transports", () => {
    it("records Proposition 6.27 opalgebra transport for identity data", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const input = buildOpalgebraTransportInput(
        equipment,
        adjunction,
        monad,
      ) as RelativeAdjunctionRelativeMonadOpalgebraTransportInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadOpalgebraTransport(
        adjunction,
        input,
      );
      expect(report.holds).toBe(false);
      expect(report.pending).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("records Proposition 6.27 algebra transport for identity data", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const input = buildAlgebraTransportInput(
        equipment,
        adjunction,
        monad,
      ) as RelativeAdjunctionRelativeMonadAlgebraTransportInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadAlgebraTransport(
        adjunction,
        input,
      );
      expect(report.holds).toBe(false);
      expect(report.pending).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it("records Remark 6.28 transport equivalence for identity data", () => {
      const { equipment, adjunction } = makeTrivialAdjunction();
      const monad = describeTrivialRelativeMonad(equipment, "•");
      const input = buildTransportEquivalenceInput(
        equipment,
        adjunction,
        monad,
      ) as RelativeAdjunctionRelativeMonadTransportEquivalenceInput<
        RelativeParams[0],
        RelativeParams[1],
        RelativeParams[2],
        RelativeParams[3]
      >;
      const report = analyzeRelativeAdjunctionRelativeMonadTransportEquivalence(
        adjunction,
        input,
      );
      expect(report.holds).toBe(false);
      expect(report.pending).toBe(true);
      expect(report.issues).toHaveLength(0);
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
    const resoluteInputs = buildIdentityResoluteInputs(equipment, adjunction, monad);
    const moduleInput = buildIdentityRelativeMonadModuleInput(
      adjunction,
      monad,
      resoluteInputs.leftMorphismInput,
    ) as RelativeAdjunctionRelativeMonadModuleInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const pastingWitness = buildIdentityRelativeMonadPastingWitness(equipment, adjunction, monad) as RelativeAdjunctionRelativeMonadPastingWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const fullyFaithfulWitness = buildIdentityFullyFaithfulWitness(adjunction);
    const pastingFullyFaithfulInput = {
      pasting: pastingWitness,
      fullyFaithful: fullyFaithfulWitness,
    } as RelativeAdjunctionRelativeMonadPastingFullyFaithfulInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const pastingAdjunctionInput = {
      first: pastingWitness,
      second: pastingWitness,
    } as RelativeAdjunctionRelativeMonadPastingAdjunctionInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const compositeInput = {
      module: moduleInput,
      pasting: pastingWitness,
    } as RelativeAdjunctionRelativeMonadCompositeInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const literatureInput = {
      composite: compositeInput,
      hutson: monad,
      acu: monad,
    } as RelativeAdjunctionRelativeMonadLiteratureWitness<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const opalgebraTransport = buildOpalgebraTransportInput(
      equipment,
      adjunction,
      monad,
    ) as RelativeAdjunctionRelativeMonadOpalgebraTransportInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const algebraTransport = buildAlgebraTransportInput(
      equipment,
      adjunction,
      monad,
    ) as RelativeAdjunctionRelativeMonadAlgebraTransportInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
    const transportEquivalence = buildTransportEquivalenceInput(
      equipment,
      adjunction,
      monad,
    ) as RelativeAdjunctionRelativeMonadTransportEquivalenceInput<
      RelativeParams[0],
      RelativeParams[1],
      RelativeParams[2],
      RelativeParams[3]
    >;
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
      precomposition: resoluteInputs.precomposition.precomposition,
      pasting: resoluteInputs.pasting,
      fullyFaithfulPostcomposition: resoluteInputs.resolute.postcomposition,
      inducedMonads: resoluteInputs.resolute.inducedMonads,
      resolutePair: resoluteInputs.resolute,
      resoluteLeftMorphism: resoluteInputs.leftMorphismInput,
      ordinaryLeftAdjointComposition: resoluteInputs.leftMorphismInput,
      relativeMonadModule: moduleInput,
      relativeMonadLeftOpalgebra: buildLeftOpalgebraInput(adjunction, monad),
      relativeMonadRightAlgebra: buildRightAlgebraInput(adjunction, monad),
      relativeMonadResolutionFunctor: buildResolutionFunctorInput(adjunction, monad),
      relativeMonadPasting: pastingWitness,
      relativeMonadAdjunctionOpalgebraTransport: opalgebraTransport,
      relativeMonadAdjunctionAlgebraTransport: algebraTransport,
      relativeMonadAdjunctionTransportEquivalence: transportEquivalence,
      relativeMonadPastingFullyFaithful: pastingFullyFaithfulInput,
      relativeMonadPastingAdjunction: pastingAdjunctionInput,
      relativeMonadCompositeThroughRoot: compositeInput,
      relativeMonadLiteratureRecoveries: literatureInput,
    };
    const results = enumerateRelativeAdjunctionOracles(adjunction, withPresentation);
    expect(results).toHaveLength(26);
    const byPath = Object.fromEntries(results.map((result) => [result.registryPath, result]));
    const assertActive = (path: string) => {
      const entry = byPath[path];
      expect(entry, `Missing oracle result for ${path}`).toBeDefined();
      expect(entry.pending).toBe(false);
      expect(entry.holds).toBe(true);
    };
    const assertPending = (path: string) => {
      const entry = byPath[path];
      expect(entry, `Missing oracle result for ${path}`).toBeDefined();
      expect(entry?.pending).toBe(true);
      expect(entry?.issues?.length ?? 0).toBe(0);
    };

    assertActive("relativeAdjunction.framing");
    assertActive("relativeAdjunction.homIsomorphism");
    assertActive("relativeAdjunction.pasting.leftMorphism");
    assertActive("relativeAdjunction.postcomposition.fullyFaithful");
    assertActive("relativeAdjunction.inducedMonads.coincide");
    assertActive("relativeAdjunction.resolute");
    assertActive("relativeAdjunction.resolute.leftMorphism");
    assertActive("relativeAdjunction.resolute.identityRoot");
    assertActive("relativeAdjunction.relativeMonad.module");
    assertActive("relativeAdjunction.relativeMonad.leftOpalgebra");
    assertActive("relativeAdjunction.relativeMonad.rightAlgebra");
    assertActive("relativeAdjunction.relativeMonad.resolutionFunctor");
    assertActive("relativeAdjunction.relativeMonad.pasting");
    assertActive("relativeAdjunction.relativeMonad.pastingFullyFaithful");
    assertActive("relativeAdjunction.relativeMonad.pastingAdjunction");
    assertActive("relativeAdjunction.relativeMonad.compositeThroughRoot");
    assertActive("relativeAdjunction.relativeMonad.literatureRecoveries");
    assertPending("relativeAdjunction.relativeMonad.opalgebraTransport");
    assertPending("relativeAdjunction.relativeMonad.algebraTransport");
    assertPending("relativeAdjunction.relativeMonad.transportEquivalence");
  });
});
