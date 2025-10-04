import type {
  EquipmentCartesian2Cell,
  EquipmentFrame,
  RepresentabilityWitness,
  VirtualEquipment,
} from "./virtual-equipment";
import {
  defaultObjectEquality,
  frameFromProarrow,
  identityProarrow,
  isIdentityVerticalBoundary,
} from "./virtual-equipment";
import type {
  Tight1Cell,
  TightCategory,
} from "./tight-primitives";
import {
  analyzeLeftExtensionFromWeightedColimit,
  type LeftExtensionFromColimitData,
  type WeightedCoconeData,
} from "./limits";
import { analyzeRightLift, type RightLiftData } from "./extensions";
import type { WeightedConeData } from "./limits";

interface FrameComparisonContext<Obj> {
  readonly equality: (left: Obj, right: Obj) => boolean;
  readonly issues: string[];
}

const compareFrames = <Obj, Payload>(
  context: FrameComparisonContext<Obj>,
  candidate: EquipmentFrame<Obj, Payload>,
  expected: EquipmentFrame<Obj, Payload>,
  label: string,
): void => {
  const { equality, issues } = context;
  if (!equality(candidate.leftBoundary, expected.leftBoundary)) {
    issues.push(
      `${label} left boundary ${String(candidate.leftBoundary)} should match ${String(
        expected.leftBoundary,
      )}.`,
    );
  }
  if (!equality(candidate.rightBoundary, expected.rightBoundary)) {
    issues.push(
      `${label} right boundary ${String(candidate.rightBoundary)} should match ${String(
        expected.rightBoundary,
      )}.`,
    );
  }
  if (candidate.arrows.length !== expected.arrows.length) {
    issues.push(
      `${label} should list ${expected.arrows.length} arrows to mirror the expected composite shape.`,
    );
    return;
  }
  for (let index = 0; index < expected.arrows.length; index += 1) {
    const candidateArrow = candidate.arrows[index];
    const expectedArrow = expected.arrows[index];
    if (!equality(candidateArrow.from, expectedArrow.from)) {
      issues.push(
        `${label} arrow ${index} should start at ${String(expectedArrow.from)} but found ${String(
          candidateArrow.from,
        )}.`,
      );
    }
    if (!equality(candidateArrow.to, expectedArrow.to)) {
      issues.push(
        `${label} arrow ${index} should end at ${String(expectedArrow.to)} but found ${String(
          candidateArrow.to,
        )}.`,
      );
    }
  }
};

const compareRepresentability = <Obj, Arr>(
  witness: RepresentabilityWitness<Obj, Arr> | undefined,
  orientation: "left" | "right",
  issues: string[],
): void => {
  if (!witness) {
    issues.push(`Expected a ${orientation}-oriented representability witness.`);
    return;
  }
  if (witness.orientation !== orientation) {
    issues.push(
      `Representability witness should be ${orientation}-oriented but found ${witness.orientation}.`,
    );
  }
};

export interface DensityViaIdentityRestrictionsData<Obj, Arr> {
  readonly object: Obj;
  readonly tight: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
}

export interface DensityAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const analyzeDensityViaIdentityRestrictions = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: DensityViaIdentityRestrictionsData<Obj, Arr>,
): DensityAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const identity = identityProarrow(equipment, data.object);

  const leftRestriction = equipment.restrictions.left(data.tight, identity);
  if (!leftRestriction) {
    issues.push(
      "Left restriction B(f,1) of the identity loose arrow should exist for a dense tight 1-cell.",
    );
  } else {
    if (leftRestriction.cartesian.boundary.direction !== "left") {
      issues.push("Left restriction cartesian boundary should be oriented to the left.");
    }
    if (leftRestriction.cartesian.boundaries.left.tight !== data.tight) {
      issues.push("Left restriction should reuse the supplied tight 1-cell as its boundary witness.");
    }
    if (
      !isIdentityVerticalBoundary(
        equipment,
        identity.to,
        leftRestriction.cartesian.boundaries.right,
      )
    ) {
      issues.push("Left restriction right boundary should be the identity on the codomain object.");
    }
    compareRepresentability(leftRestriction.representability, "left", issues);
  }

  const rightRestriction = equipment.restrictions.right(identity, data.tight);
  if (!rightRestriction) {
    issues.push(
      "Right restriction B(1,f) of the identity loose arrow should exist for a dense tight 1-cell.",
    );
  } else {
    if (rightRestriction.cartesian.boundary.direction !== "right") {
      issues.push("Right restriction cartesian boundary should be oriented to the right.");
    }
    if (rightRestriction.cartesian.boundaries.right.tight !== data.tight) {
      issues.push("Right restriction should reuse the supplied tight 1-cell as its boundary witness.");
    }
    if (
      !isIdentityVerticalBoundary(
        equipment,
        identity.from,
        rightRestriction.cartesian.boundaries.left,
      )
    ) {
      issues.push("Right restriction left boundary should be the identity on the domain object.");
    }
    compareRepresentability(rightRestriction.representability, "right", issues);
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Identity loose arrow admits both B(f,1) and B(1,f) restrictions with representability witnesses, matching Definition 3.19."
        : `Density issues: ${issues.join("; ")}`,
  };
};

export interface AbsoluteColimitWitnessData<Obj, Arr, Payload, Evidence> {
  readonly j: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly f: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly colimit: WeightedCoconeData<Obj, Arr, Payload, Evidence>;
  readonly comparison: EquipmentCartesian2Cell<Obj, Arr, Payload, Evidence>;
}

export interface AbsoluteColimitAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const analyzeAbsoluteColimitWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: AbsoluteColimitWitnessData<Obj, Arr, Payload, Evidence>,
): AbsoluteColimitAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];
  const context: FrameComparisonContext<Obj> = { equality, issues };

  if (!data.comparison.cartesian) {
    issues.push("Absolute colimit comparison cell should be cartesian (left-opcartesian).");
  }
  if (data.comparison.boundary.direction !== "left") {
    issues.push("Absolute colimit comparison boundary should be oriented to the left.");
  }
  if (data.comparison.boundaries.left.tight !== data.colimit.diagram) {
    issues.push(
      "Absolute colimit comparison should reuse the diagram tight 1-cell on its left boundary.",
    );
  }
  if (data.comparison.boundaries.right.tight !== data.f) {
    issues.push("Absolute colimit comparison should land in the supplied tight 1-cell f.");
  }
  if (data.comparison.boundary.vertical.tight !== data.j) {
    issues.push("Absolute colimit cartesian boundary should witness the tight 1-cell j.");
  }

  compareFrames(
    context,
    data.comparison.source,
    data.colimit.cocone.source,
    "Absolute colimit comparison source",
  );
  compareFrames(
    context,
    data.comparison.target,
    data.colimit.cocone.target,
    "Absolute colimit comparison target",
  );

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Left-opcartesian comparison reuses the weighted cocone boundaries, satisfying Definition 3.21."
        : `Absolute colimit issues: ${issues.join("; ")}`,
  };
};

export interface AbsoluteColimitPreservationData<Obj, Arr, Payload, Evidence> {
  readonly absolute: AbsoluteColimitWitnessData<Obj, Arr, Payload, Evidence>;
  readonly extension: LeftExtensionFromColimitData<Obj, Arr, Payload, Evidence>;
}

export const analyzeLeftExtensionPreservesAbsolute = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: AbsoluteColimitPreservationData<Obj, Arr, Payload, Evidence>,
): AbsoluteColimitAnalysis => {
  const issues: string[] = [];

  const absolute = analyzeAbsoluteColimitWitness(equipment, data.absolute);
  if (!absolute.holds) {
    issues.push(...absolute.issues);
  }

  const extension = analyzeLeftExtensionFromWeightedColimit(equipment, data.extension);
  if (!extension.holds) {
    issues.push(...extension.issues);
  }

  if (data.extension.colimit !== data.absolute.colimit) {
    issues.push(
      "Left extension preservation should analyse the same weighted cocone that witnesses j-absolute colimits.",
    );
  }

  if (
    data.extension.extension.counit.boundaries.left.tight !==
    data.absolute.colimit.diagram
  ) {
    issues.push(
      "Left extension counit should factor through the diagram that appears in the absolute colimit witness.",
    );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Weighted left extension reuses the absolute colimit data, reflecting Lemma 3.22 and Lemma 3.23."
        : `Left extension preservation issues: ${issues.join("; ")}`,
  };
};

export interface PointwiseLeftLiftData<Obj, Arr, Payload, Evidence> {
  readonly lift: RightLiftData<Obj, Arr, Payload, Evidence>;
  readonly along: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly cone?: WeightedConeData<Obj, Arr, Payload, Evidence>;
}

export interface PointwiseLeftLiftAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const analyzePointwiseLeftLift = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: PointwiseLeftLiftData<Obj, Arr, Payload, Evidence>,
): PointwiseLeftLiftAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (data.lift.along !== data.along) {
    issues.push("Pointwise left lift should be computed along the supplied tight 1-cell j.");
  }

  const liftAnalysis = analyzeRightLift(equipment, data.lift);
  if (!liftAnalysis.holds) {
    issues.push(
      `Underlying right lift must satisfy Definition 3.2 framing before claiming pointwise behaviour: ${liftAnalysis.issues.join(
        "; ",
      )}`,
    );
  }

  if (data.cone) {
    const expectedTarget = frameFromProarrow(data.lift.lift);
    compareFrames(
      { equality, issues },
      data.cone.cone.target,
      expectedTarget,
      "Pointwise left lift comparison target",
    );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Right lift framing aligns with the designated tight 1-cell, providing the pointwise left lift promised by Definition 3.24."
        : `Pointwise left lift issues: ${issues.join("; ")}`,
  };
};
