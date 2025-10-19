import type {
  Equipment2Cell,
  EquipmentFrame,
  EquipmentProarrow,
  EquipmentRestrictionResult,
  EquipmentVerticalBoundary,
  VirtualEquipment,
} from "./virtual-equipment";
import {
  defaultObjectEquality,
  frameFromProarrow,
  isIdentityVerticalBoundary,
} from "./virtual-equipment";
import type {
  Tight1Cell,
  TightCategory,
} from "./tight-primitives";
import type { RightExtensionData } from "./extensions";

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
    if (!candidateArrow || !expectedArrow) {
      issues.push(`${label} arrow ${index} is missing in candidate or expected chain.`);
      continue;
    }
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

const compareVerticalBoundary = <Obj, Arr>(
  context: FrameComparisonContext<Obj>,
  boundary: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
): void => {
  const { equality, issues } = context;
  if (!equality(boundary.from, expected.from) || !equality(boundary.to, expected.to)) {
    issues.push(
      `${label} should run from ${String(expected.from)} to ${String(expected.to)} but found ${String(
        boundary.from,
      )} → ${String(boundary.to)}.`,
    );
  }
  if (boundary.tight !== expected.tight) {
    issues.push(`${label} should reuse the expected tight 1-cell witness.`);
  }
};

const ensureLastArrowMatches = <Obj, Payload>(
  context: FrameComparisonContext<Obj>,
  frame: EquipmentFrame<Obj, Payload>,
  expected: EquipmentProarrow<Obj, Payload>,
  label: string,
): void => {
  const { equality, issues } = context;
  if (frame.arrows.length === 0) {
    issues.push(`${label} should at least contain the apex loose arrow.`);
    return;
  }
  const lastArrow = frame.arrows[frame.arrows.length - 1];
  if (!lastArrow) {
    issues.push(`${label} frame chain is unexpectedly empty.`);
  } else if (!equality(lastArrow.from, expected.from) || !equality(lastArrow.to, expected.to)) {
    issues.push(
      `${label} terminal arrow should match the apex ${String(expected.from)} → ${String(expected.to)}.`,
    );
  }
};

export interface WeightedConeData<Obj, Arr, Payload, Evidence> {
  readonly weight: EquipmentFrame<Obj, Payload>;
  readonly diagram: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly apex: EquipmentProarrow<Obj, Payload>;
  readonly cone: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface WeightedConeAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const analyzeWeightedCone = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: WeightedConeData<Obj, Arr, Payload, Evidence>,
): WeightedConeAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];
  const context: FrameComparisonContext<Obj> = { equality, issues };

  compareFrames(context, data.cone.source, data.weight, "Weighted cone source frame");

  if (!equality(data.cone.target.leftBoundary, data.apex.from)) {
    issues.push(
      `Weighted cone target should begin at the apex domain ${String(data.apex.from)} but found ${String(
        data.cone.target.leftBoundary,
      )}.`,
    );
  }
  if (!equality(data.cone.target.rightBoundary, data.apex.to)) {
    issues.push(
      `Weighted cone target should end at the apex codomain ${String(data.apex.to)} but found ${String(
        data.cone.target.rightBoundary,
      )}.`,
    );
  }
  ensureLastArrowMatches(context, data.cone.target, data.apex, "Weighted cone target");

  if (data.cone.boundaries.left.tight !== data.diagram) {
    issues.push("Weighted cone left vertical boundary should reuse the supplied tight diagram.");
  }
  if (!equality(data.cone.boundaries.left.from, data.weight.leftBoundary)) {
    issues.push(
      `Weighted cone left boundary should originate at ${String(
        data.weight.leftBoundary,
      )} reflecting the weight domain.`,
    );
  }
  if (!equality(data.cone.boundaries.left.to, data.apex.from)) {
    issues.push(
      `Weighted cone left boundary should land at the apex domain ${String(data.apex.from)} but found ${String(
        data.cone.boundaries.left.to,
      )}.`,
    );
  }

  if (
    !isIdentityVerticalBoundary(equipment, data.apex.to, data.cone.boundaries.right)
  ) {
    issues.push(
      "Weighted cone right vertical boundary should be the identity on the apex codomain, mirroring Definition 3.9.",
    );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Weighted cone framing matches Definition 3.9: the weight supplies the source and the apex codomain boundary is identity."
        : `Weighted cone framing issues: ${issues.join("; ")}`,
  };
};

export interface WeightedCoconeData<Obj, Arr, Payload, Evidence> {
  readonly weight: EquipmentFrame<Obj, Payload>;
  readonly diagram: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly apex: EquipmentProarrow<Obj, Payload>;
  readonly cocone: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export type WeightedCoconeAnalysis = WeightedConeAnalysis;

export const analyzeWeightedCocone = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: WeightedCoconeData<Obj, Arr, Payload, Evidence>,
): WeightedCoconeAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];
  const context: FrameComparisonContext<Obj> = { equality, issues };

  compareFrames(context, data.cocone.source, data.weight, "Weighted cocone source frame");

  if (!equality(data.cocone.target.leftBoundary, data.apex.from)) {
    issues.push(
      `Weighted cocone target should begin at the apex domain ${String(data.apex.from)} but found ${String(
        data.cocone.target.leftBoundary,
      )}.`,
    );
  }
  if (!equality(data.cocone.target.rightBoundary, data.apex.to)) {
    issues.push(
      `Weighted cocone target should end at the apex codomain ${String(data.apex.to)} but found ${String(
        data.cocone.target.rightBoundary,
      )}.`,
    );
  }
  ensureLastArrowMatches(context, data.cocone.target, data.apex, "Weighted cocone target");

  if (
    !isIdentityVerticalBoundary(equipment, data.apex.from, data.cocone.boundaries.left)
  ) {
    issues.push(
      "Weighted cocone left vertical boundary should be the identity on the apex domain, dual to the cone case in Definition 3.9.",
    );
  }
  if (data.cocone.boundaries.right.tight !== data.diagram) {
    issues.push("Weighted cocone right vertical boundary should reuse the supplied tight diagram.");
  }
  if (!equality(data.cocone.boundaries.right.from, data.weight.rightBoundary)) {
    issues.push(
      `Weighted cocone right boundary should originate at ${String(
        data.weight.rightBoundary,
      )} reflecting the weight codomain.`,
    );
  }
  if (!equality(data.cocone.boundaries.right.to, data.apex.to)) {
    issues.push(
      `Weighted cocone right boundary should land at the apex codomain ${String(data.apex.to)} but found ${String(
        data.cocone.boundaries.right.to,
      )}.`,
    );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Weighted cocone framing matches Definition 3.9 dual: the weight supplies the source and the apex domain boundary is identity."
        : `Weighted cocone framing issues: ${issues.join("; ")}`,
  };
};

export interface WeightedColimitRestrictionData<Obj, Arr, Payload, Evidence> {
  readonly cocone: WeightedCoconeData<Obj, Arr, Payload, Evidence>;
  readonly restriction: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>;
}

export type WeightedColimitRestrictionAnalysis = WeightedConeAnalysis;

export const analyzeWeightedColimitRestriction = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: WeightedColimitRestrictionData<Obj, Arr, Payload, Evidence>,
): WeightedColimitRestrictionAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];
  const context: FrameComparisonContext<Obj> = { equality, issues };

  compareFrames(
    context,
    data.restriction.cartesian.target,
    frameFromProarrow(data.cocone.apex),
    "Weighted colimit restriction cartesian target",
  );

  compareVerticalBoundary(
    context,
    data.restriction.cartesian.boundaries.left,
    data.cocone.cocone.boundaries.left,
    "Weighted colimit restriction left boundary",
  );

  compareVerticalBoundary(
    context,
    data.restriction.cartesian.boundaries.right,
    data.cocone.cocone.boundaries.right,
    "Weighted colimit restriction right boundary",
  );

  const direction = data.restriction.cartesian.boundary.direction;
  const expectedVertical =
    direction === "left"
      ? data.cocone.cocone.boundaries.left
      : data.cocone.cocone.boundaries.right;

  compareVerticalBoundary(
    context,
    data.restriction.cartesian.boundary.vertical,
    expectedVertical,
    "Weighted colimit cartesian boundary",
  );

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Restriction cartesian cell reuses the weighted cocone boundaries, mirroring Lemma 3.13."
        : `Weighted colimit restriction issues: ${issues.join("; ")}`,
  };
};

export interface WeightedLimitRestrictionData<Obj, Arr, Payload, Evidence> {
  readonly cone: WeightedConeData<Obj, Arr, Payload, Evidence>;
  readonly restriction: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>;
}

export type WeightedLimitRestrictionAnalysis = WeightedConeAnalysis;

export const analyzeWeightedLimitRestriction = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: WeightedLimitRestrictionData<Obj, Arr, Payload, Evidence>,
): WeightedLimitRestrictionAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];
  const context: FrameComparisonContext<Obj> = { equality, issues };

  compareFrames(
    context,
    data.restriction.cartesian.target,
    frameFromProarrow(data.cone.apex),
    "Weighted limit restriction cartesian target",
  );

  compareVerticalBoundary(
    context,
    data.restriction.cartesian.boundaries.left,
    data.cone.cone.boundaries.left,
    "Weighted limit restriction left boundary",
  );

  compareVerticalBoundary(
    context,
    data.restriction.cartesian.boundaries.right,
    data.cone.cone.boundaries.right,
    "Weighted limit restriction right boundary",
  );

  const direction = data.restriction.cartesian.boundary.direction;
  const expectedVertical =
    direction === "left"
      ? data.cone.cone.boundaries.left
      : data.cone.cone.boundaries.right;

  compareVerticalBoundary(
    context,
    data.restriction.cartesian.boundary.vertical,
    expectedVertical,
    "Weighted limit cartesian boundary",
  );

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Restriction cartesian cell reuses the weighted cone boundaries, mirroring Lemma 3.13 (dual)."
        : `Weighted limit restriction issues: ${issues.join("; ")}`,
  };
};

export interface LeftExtensionFromColimitData<Obj, Arr, Payload, Evidence> {
  readonly colimit: WeightedCoconeData<Obj, Arr, Payload, Evidence>;
  readonly extension: RightExtensionData<Obj, Arr, Payload, Evidence>;
}

export type LeftExtensionFromColimitAnalysis = WeightedConeAnalysis;

export const analyzeLeftExtensionFromWeightedColimit = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: LeftExtensionFromColimitData<Obj, Arr, Payload, Evidence>,
): LeftExtensionFromColimitAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];
  const context: FrameComparisonContext<Obj> = { equality, issues };

  if (!equality(data.extension.loose.from, data.colimit.weight.leftBoundary)) {
    issues.push(
      `Left extension loose arrow should originate at ${String(
        data.colimit.weight.leftBoundary,
      )} mirroring the weight domain.`,
    );
  }
  if (!equality(data.extension.loose.to, data.colimit.weight.rightBoundary)) {
    issues.push(
      `Left extension loose arrow should land at ${String(
        data.colimit.weight.rightBoundary,
      )} mirroring the weight codomain.`,
    );
  }

  compareFrames(
    context,
    data.extension.counit.source,
    data.colimit.weight,
    "Left extension counit source",
  );

  compareFrames(
    context,
    data.extension.counit.target,
    data.colimit.cocone.target,
    "Left extension counit target",
  );

  if (data.extension.counit.boundaries.left.tight !== data.colimit.diagram) {
    issues.push(
      "Left extension counit should reuse the diagram tight 1-cell from the weighted cocone, as in Lemma 3.14.",
    );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Left extension inherits its counit framing from the weighted colimit, aligning with Lemma 3.14."
        : `Left extension framing issues: ${issues.join("; ")}`,
  };
};
