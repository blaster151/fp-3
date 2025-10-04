import type {
  Equipment2Cell,
  EquipmentProarrow,
  EquipmentVerticalBoundary,
  VirtualEquipment,
} from "../virtual-equipment";
import {
  defaultObjectEquality,
  frameFromProarrow,
  identityProarrow,
  identityVerticalBoundary,
  verticalBoundariesEqual,
} from "../virtual-equipment";
import type {
  PointwiseLeftLiftData,
  PointwiseLeftLiftAnalysis,
} from "../virtual-equipment/absoluteness";
import { analyzePointwiseLeftLift } from "../virtual-equipment/absoluteness";
import type {
  FullyFaithfulLeftExtensionAnalysis,
  FullyFaithfulLeftExtensionInput,
  PointwiseLeftExtensionLiftInput,
  PointwiseLeftExtensionLiftAnalysis,
} from "../virtual-equipment/faithfulness";
import {
  analyzeFullyFaithfulLeftExtension,
  analyzePointwiseLeftExtensionLiftCorrespondence,
} from "../virtual-equipment/faithfulness";
import type { LeftExtensionFromColimitData, LeftExtensionFromColimitAnalysis } from "../virtual-equipment/limits";
import { analyzeLeftExtensionFromWeightedColimit } from "../virtual-equipment/limits";

export interface RelativeAdjunctionHomIsomorphism<Obj, Arr, Payload, Evidence> {
  readonly forward: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly backward: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAdjunctionData<Obj, Arr, Payload, Evidence> {
  readonly equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>;
  readonly root: EquipmentVerticalBoundary<Obj, Arr>;
  readonly left: EquipmentVerticalBoundary<Obj, Arr>;
  readonly right: EquipmentVerticalBoundary<Obj, Arr>;
  readonly homIsomorphism: RelativeAdjunctionHomIsomorphism<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionFramingReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeAdjunctionUnitCounitPresentation<Obj, Arr, Payload, Evidence> {
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly counit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionUnitCounitReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeAdjunctionLeftMorphismData<Obj, Arr, Payload, Evidence> {
  readonly source: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly target: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly comparison: EquipmentVerticalBoundary<Obj, Arr>;
  readonly transformation: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionLeftMorphismReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeAdjunctionRightMorphismData<Obj, Arr, Payload, Evidence> {
  readonly source: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly target: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly comparison: EquipmentVerticalBoundary<Obj, Arr>;
  readonly transformation: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionRightMorphismReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeAdjunctionStrictMorphismData<Obj, Arr, Payload, Evidence> {
  readonly left: RelativeAdjunctionLeftMorphismData<Obj, Arr, Payload, Evidence>;
  readonly right: RelativeAdjunctionRightMorphismData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionStrictMorphismReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly left: RelativeAdjunctionLeftMorphismReport;
  readonly right: RelativeAdjunctionRightMorphismReport;
}

export interface RelativeAdjunctionPrecompositionInput<Obj, Arr, Payload, Evidence> {
  readonly adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly precomposition: EquipmentVerticalBoundary<Obj, Arr>;
}

export interface RelativeAdjunctionPrecompositionReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly root?: EquipmentVerticalBoundary<Obj, Arr>;
  readonly left?: EquipmentVerticalBoundary<Obj, Arr>;
  readonly right?: EquipmentVerticalBoundary<Obj, Arr>;
}

const boundariesMatch = <Obj, Arr>(
  equality: (left: Obj, right: Obj) => boolean,
  actual: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
  issues: string[],
): void => {
  if (!verticalBoundariesEqual(equality, actual, expected)) {
    issues.push(`${label} must coincide with the designated tight boundary.`);
  }
};

const checkFrameBoundaries = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  frame: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>; readonly leftBoundary: Obj; readonly rightBoundary: Obj },
  left: Obj,
  right: Obj,
  label: string,
  issues: string[],
): void => {
  if (!equality(frame.leftBoundary, left)) {
    issues.push(`${label} should start at the domain shared by j and ℓ.`);
  }
  if (!equality(frame.rightBoundary, right)) {
    issues.push(`${label} should end at the codomain shared by r and j.`);
  }
  if (frame.arrows.length === 0) {
    issues.push(`${label} should describe at least one loose arrow in the frame.`);
  }
};

export const analyzeRelativeAdjunctionFraming = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionFramingReport => {
  const { equipment, root, left, right, homIsomorphism } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(root.from, left.from)) {
    issues.push("Root j and left ℓ must share their domain object A.");
  }
  if (!equality(root.from, right.from)) {
    issues.push("Root j and right r must agree on their domain when compared through ℓ.");
  }
  if (!equality(left.to, right.from)) {
    issues.push("Left ℓ’s codomain must feed the right r’s domain so ℓ ⊣ r factors through C.");
  }
  if (!equality(root.to, right.to)) {
    issues.push("Root j and right r must land in the same codomain E.");
  }

  boundariesMatch(
    equality,
    homIsomorphism.forward.boundaries.left,
    left,
    "Forward hom isomorphism left boundary",
    issues,
  );
  boundariesMatch(
    equality,
    homIsomorphism.forward.boundaries.right,
    right,
    "Forward hom isomorphism right boundary",
    issues,
  );
  boundariesMatch(
    equality,
    homIsomorphism.backward.boundaries.left,
    left,
    "Backward hom isomorphism left boundary",
    issues,
  );
  boundariesMatch(
    equality,
    homIsomorphism.backward.boundaries.right,
    right,
    "Backward hom isomorphism right boundary",
    issues,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Relative adjunction root/left/right data share boundaries compatible with Definition 5.1."
      : `Relative adjunction framing issues: ${issues.join("; ")}`,
  };
};

export const analyzeRelativeAdjunctionHomIsomorphism = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionFramingReport => {
  const { equipment, left, right, homIsomorphism } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  checkFrameBoundaries(
    equality,
    homIsomorphism.forward.source,
    left.from,
    right.to,
    "Forward hom isomorphism source frame",
    issues,
  );
  checkFrameBoundaries(
    equality,
    homIsomorphism.forward.target,
    left.from,
    right.to,
    "Forward hom isomorphism target frame",
    issues,
  );
  checkFrameBoundaries(
    equality,
    homIsomorphism.backward.source,
    left.from,
    right.to,
    "Backward hom isomorphism source frame",
    issues,
  );
  checkFrameBoundaries(
    equality,
    homIsomorphism.backward.target,
    left.from,
    right.to,
    "Backward hom isomorphism target frame",
    issues,
  );

  if (
    !verticalBoundariesEqual(
      equality,
      homIsomorphism.forward.boundaries.left,
      homIsomorphism.backward.boundaries.left,
    )
  ) {
    issues.push("Forward and backward isomorphism cells must share the same left boundary ℓ.");
  }
  if (
    !verticalBoundariesEqual(
      equality,
      homIsomorphism.forward.boundaries.right,
      homIsomorphism.backward.boundaries.right,
    )
  ) {
    issues.push("Forward and backward isomorphism cells must share the same right boundary r.");
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Hom-set isomorphism witnesses share frames and boundaries consistent with Definition 5.1."
      : `Relative adjunction hom-isomorphism issues: ${issues.join("; ")}`,
  };
};

const ensureFrameAlignment = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  frame: { readonly leftBoundary: Obj; readonly rightBoundary: Obj; readonly arrows: ReadonlyArray<unknown> },
  expectedLeft: Obj,
  expectedRight: Obj,
  label: string,
  issues: string[],
) => {
  if (!equality(frame.leftBoundary, expectedLeft)) {
    issues.push(`${label} should start at the designated domain object.`);
  }
  if (!equality(frame.rightBoundary, expectedRight)) {
    issues.push(`${label} should end at the designated codomain object.`);
  }
  if (frame.arrows.length === 0) {
    issues.push(`${label} should describe at least one loose arrow in its frame.`);
  }
};

export const analyzeRelativeAdjunctionUnitCounit = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  presentation: RelativeAdjunctionUnitCounitPresentation<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionUnitCounitReport => {
  const { equipment, root, left, right } = data;
  const { unit, counit } = presentation;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!verticalBoundariesEqual(equality, unit.boundaries.left, root)) {
    issues.push("Unit 2-cell must reuse the root j as its left boundary.");
  }
  if (!verticalBoundariesEqual(equality, unit.boundaries.right, right)) {
    issues.push("Unit 2-cell must reuse the right leg r as its right boundary.");
  }
  if (!verticalBoundariesEqual(equality, counit.boundaries.left, left)) {
    issues.push("Counit 2-cell must reuse the left leg ℓ as its left boundary.");
  }
  if (!verticalBoundariesEqual(equality, counit.boundaries.right, left)) {
    issues.push("Counit 2-cell should target the same tight boundary as ℓ on the right, reflecting Lemma 5.5.");
  }

  ensureFrameAlignment(
    equality,
    unit.source,
    root.from,
    right.to,
    "Unit source frame",
    issues,
  );
  ensureFrameAlignment(
    equality,
    unit.target,
    root.from,
    right.to,
    "Unit target frame",
    issues,
  );
  ensureFrameAlignment(
    equality,
    counit.source,
    left.from,
    left.to,
    "Counit source frame",
    issues,
  );
  ensureFrameAlignment(
    equality,
    counit.target,
    left.from,
    left.to,
    "Counit target frame",
    issues,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Unit and counit reuse the designated boundaries and frames from Lemma 5.5."
      : `Relative adjunction unit/counit issues: ${issues.join("; ")}`,
  };
};

export interface RelativeAdjunctionLeftLiftInput<Obj, Arr, Payload, Evidence> {
  readonly lift: PointwiseLeftLiftData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionLeftLiftReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly lift: PointwiseLeftLiftAnalysis;
}

export const analyzeRelativeAdjunctionPointwiseLeftLift = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  input: RelativeAdjunctionLeftLiftInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionLeftLiftReport => {
  const { equipment, root, left, right } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const liftAnalysis = analyzePointwiseLeftLift(equipment, input.lift);
  if (!liftAnalysis.holds) {
    issues.push(
      `Pointwise left lift prerequisites (Proposition 5.8) failed: ${liftAnalysis.issues.join("; ") || liftAnalysis.details}`,
    );
  }

  if (input.lift.along !== root.tight) {
    issues.push("Pointwise left lift should be computed along the root j to recover the right leg (Proposition 5.8).");
  }

  const { loose, lift } = input.lift.lift;

  if (!equality(loose.from, left.from)) {
    issues.push(
      `Lift loose arrow should start at the root/left domain ${String(left.from)} but found ${String(loose.from)} instead.`,
    );
  }
  if (!equality(loose.to, left.to)) {
    issues.push(
      `Lift loose arrow should land at the left codomain ${String(left.to)} so that ℓ participates in the lift framing.`,
    );
  }

  if (!equality(lift.from, right.from)) {
    issues.push(
      `Computed lift arrow should originate at the right leg domain ${String(right.from)}; found ${String(lift.from)}.`,
    );
  }
  if (!equality(lift.to, right.to)) {
    issues.push(
      `Computed lift arrow should land at the right leg codomain ${String(right.to)}; found ${String(lift.to)}.`,
    );
  }

  if (!equality(left.to, right.from)) {
    issues.push(
      "Relative adjunction framing requires ℓ’s codomain to match r’s domain; this should already hold by construction.",
    );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Pointwise left lift exhibits the right leg r via Proposition 5.8, matching the relative adjunction framing."
        : `Relative adjunction left-lift issues: ${issues.join("; ")}`,
    lift: liftAnalysis,
  };
};

export interface RelativeAdjunctionRightExtensionInput<Obj, Arr, Payload, Evidence> {
  readonly extension: LeftExtensionFromColimitData<Obj, Arr, Payload, Evidence>;
  readonly fullyFaithful?: FullyFaithfulLeftExtensionInput<Obj, Arr, Payload, Evidence>;
  readonly pointwise?: PointwiseLeftExtensionLiftInput<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionRightExtensionReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly extension: LeftExtensionFromColimitAnalysis;
  readonly fullyFaithful?: FullyFaithfulLeftExtensionAnalysis;
  readonly pointwise?: PointwiseLeftExtensionLiftAnalysis;
}

export const analyzeRelativeAdjunctionRightExtension = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  input: RelativeAdjunctionRightExtensionInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRightExtensionReport => {
  const { equipment, root, left, right } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const extensionAnalysis = analyzeLeftExtensionFromWeightedColimit(equipment, input.extension);
  if (!extensionAnalysis.holds) {
    issues.push(
      `Left extension framing (Proposition 5.10) failed to verify: ${extensionAnalysis.issues.join("; ") || extensionAnalysis.details}`,
    );
  }

  let fullyFaithfulAnalysis: FullyFaithfulLeftExtensionAnalysis | undefined;
  if (input.fullyFaithful) {
    fullyFaithfulAnalysis = analyzeFullyFaithfulLeftExtension(equipment, input.fullyFaithful);
    if (!fullyFaithfulAnalysis.holds) {
      issues.push(
        `Fully faithful hypothesis for the root j (Proposition 5.10) failed: ${
          fullyFaithfulAnalysis.issues.join("; ") || fullyFaithfulAnalysis.details
        }`,
      );
    }
  }

  let pointwiseAnalysis: PointwiseLeftExtensionLiftAnalysis | undefined;
  if (input.pointwise) {
    pointwiseAnalysis = analyzePointwiseLeftExtensionLiftCorrespondence(equipment, input.pointwise);
    if (!pointwiseAnalysis.holds) {
      issues.push(
        `Pointwise left extension/left lift compatibility (Proposition 3.26) failed: ${
          pointwiseAnalysis.issues.join("; ") || pointwiseAnalysis.details
        }`,
      );
    }
  }

  const witness = input.extension.extension;

  if (witness.along !== root.tight) {
    issues.push("Left extension should be taken along the root j to recover the right adjoint (Proposition 5.10).");
  }

  if (!equality(witness.loose.from, left.from)) {
    issues.push(
      `Left extension loose arrow should start at ℓ’s domain ${String(left.from)}; found ${String(witness.loose.from)}.`,
    );
  }

  if (!equality(witness.loose.to, root.to)) {
    issues.push(
      `Left extension loose arrow should land at j’s codomain ${String(root.to)}; found ${String(witness.loose.to)}.`,
    );
  }

  if (!equality(witness.extension.from, right.from)) {
    issues.push(
      `Resulting extension arrow should originate at r’s domain ${String(right.from)}; found ${String(
        witness.extension.from,
      )}.`,
    );
  }

  if (!equality(witness.extension.to, right.to)) {
    issues.push(
      `Resulting extension arrow should land at r’s codomain ${String(right.to)}; found ${String(witness.extension.to)}.`,
    );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Left extension along a fully faithful root recovers the right relative adjoint as in Proposition 5.10."
        : `Relative adjunction left-extension issues: ${issues.join("; ")}`,
    extension: extensionAnalysis,
    fullyFaithful: fullyFaithfulAnalysis,
    pointwise: pointwiseAnalysis,
  };
};

export interface RelativeAdjunctionColimitPreservationInput<Obj, Arr, Payload, Evidence> {
  readonly root: LeftExtensionFromColimitData<Obj, Arr, Payload, Evidence>;
  readonly left: LeftExtensionFromColimitData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionColimitPreservationReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly root: LeftExtensionFromColimitAnalysis;
  readonly left: LeftExtensionFromColimitAnalysis;
}

const framesShareBoundaries = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  expected: { readonly leftBoundary: Obj; readonly rightBoundary: Obj; readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>> },
  candidate: { readonly leftBoundary: Obj; readonly rightBoundary: Obj; readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>> },
  label: string,
  issues: string[],
): void => {
  if (!equality(expected.leftBoundary, candidate.leftBoundary)) {
    issues.push(
      `${label} should start at ${String(expected.leftBoundary)} but found ${String(candidate.leftBoundary)}.`,
    );
  }
  if (!equality(expected.rightBoundary, candidate.rightBoundary)) {
    issues.push(
      `${label} should end at ${String(expected.rightBoundary)} but found ${String(candidate.rightBoundary)}.`,
    );
  }
  if (expected.arrows.length !== candidate.arrows.length) {
    issues.push(
      `${label} should contain ${expected.arrows.length} arrows to mirror the shared weight; found ${candidate.arrows.length}.`,
    );
  }
};

export const analyzeRelativeAdjunctionColimitPreservation = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  input: RelativeAdjunctionColimitPreservationInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionColimitPreservationReport => {
  const { equipment, root, left } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const rootAnalysis = analyzeLeftExtensionFromWeightedColimit(equipment, input.root);
  const leftAnalysis = analyzeLeftExtensionFromWeightedColimit(equipment, input.left);

  if (input.root.extension.along !== root.tight) {
    issues.push("Root preservation data should exhibit a left extension along j (Proposition 5.11).");
  }

  if (input.left.extension.along !== left.tight) {
    issues.push("Left preservation data should exhibit a left extension along ℓ (Proposition 5.11).");
  }

  framesShareBoundaries(
    equality,
    input.root.colimit.weight,
    input.left.colimit.weight,
    "Shared weighted colimit",
    issues,
  );

  if (!rootAnalysis.holds) {
    issues.push(
      `Root j does not preserve the chosen colimit; Proposition 5.11 only applies when j preserves the weight. Details: ${
        rootAnalysis.issues.join("; ") || rootAnalysis.details
      }`,
    );
  }

  if (rootAnalysis.holds && !leftAnalysis.holds) {
    issues.push(
      `Despite j preserving the colimit, ℓ failed the preservation check: ${
        leftAnalysis.issues.join("; ") || leftAnalysis.details
      }`,
    );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Left relative adjoint preserves the colimit shared with the root, in line with Proposition 5.11."
        : `Relative adjunction colimit preservation issues: ${issues.join("; ")}`,
    root: rootAnalysis,
    left: leftAnalysis,
  };
};

const assertSharedEquipment = <Obj, Arr, Payload, Evidence>(
  source: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  target: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  issues: string[],
): VirtualEquipment<Obj, Arr, Payload, Evidence> => {
  if (source.equipment !== target.equipment) {
    issues.push("Source and target relative adjunctions must live in the same virtual equipment.");
  }
  return source.equipment;
};

const ensureLeftMorphismFrames = <Obj, Arr, Payload, Evidence>(
  cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  issues: string[],
): void => {
  if (cell.source.arrows.length === 0) {
    issues.push("Left morphism 2-cell source frame should describe at least one loose arrow.");
  }
  if (cell.target.arrows.length === 0) {
    issues.push("Left morphism 2-cell target frame should describe at least one loose arrow.");
  }
};

export const analyzeRelativeAdjunctionLeftMorphism = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionLeftMorphismData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionLeftMorphismReport => {
  const { source, target, comparison, transformation } = data;
  const issues: string[] = [];

  const equipment = assertSharedEquipment(source, target, issues);
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (!verticalBoundariesEqual(equality, source.root, target.root)) {
    issues.push("Left morphisms require both relative adjunctions to share the same root j.");
  }

  if (!equality(comparison.from, source.left.to)) {
    issues.push("Comparison tight cell must start at the codomain of the source left leg.");
  }
  if (!equality(comparison.to, target.left.to)) {
    issues.push("Comparison tight cell must land in the codomain of the target left leg.");
  }

  if (!verticalBoundariesEqual(equality, transformation.boundaries.left, source.left)) {
    issues.push("Left morphism 2-cell should reuse the source left leg as its left boundary.");
  }
  if (!verticalBoundariesEqual(equality, transformation.boundaries.right, target.left)) {
    issues.push("Left morphism 2-cell should reuse the target left leg as its right boundary.");
  }

  ensureLeftMorphismFrames(transformation, issues);

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Left morphism witnesses share the expected root, left-leg boundaries, and frame endpoints from Definition 5.14."
      : `Relative adjunction left-morphism issues: ${issues.join("; ")}`,
  };
};

const ensureRightMorphismFrames = <Obj, Arr, Payload, Evidence>(
  cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  issues: string[],
): void => {
  if (cell.source.arrows.length === 0) {
    issues.push("Right morphism 2-cell source frame should describe at least one loose arrow.");
  }
  if (cell.target.arrows.length === 0) {
    issues.push("Right morphism 2-cell target frame should describe at least one loose arrow.");
  }
};

export const analyzeRelativeAdjunctionRightMorphism = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionRightMorphismData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRightMorphismReport => {
  const { source, target, comparison, transformation } = data;
  const issues: string[] = [];

  const equipment = assertSharedEquipment(source, target, issues);
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (!verticalBoundariesEqual(equality, source.root, target.root)) {
    issues.push("Right morphisms require both relative adjunctions to share the same root j.");
  }

  if (!equality(comparison.from, source.right.from)) {
    issues.push("Comparison tight cell must start at the domain of the source right leg.");
  }
  if (!equality(comparison.to, target.right.from)) {
    issues.push("Comparison tight cell must land in the domain of the target right leg.");
  }

  if (!verticalBoundariesEqual(equality, transformation.boundaries.left, target.right)) {
    issues.push("Right morphism 2-cell should reuse the target right leg as its left boundary.");
  }
  if (!verticalBoundariesEqual(equality, transformation.boundaries.right, source.right)) {
    issues.push("Right morphism 2-cell should reuse the source right leg as its right boundary.");
  }

  ensureRightMorphismFrames(transformation, issues);

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Right morphism witnesses reuse the shared root and right-leg boundaries expected by Definition 5.18."
      : `Relative adjunction right-morphism issues: ${issues.join("; ")}`,
  };
};

export const analyzeRelativeAdjunctionStrictMorphism = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionStrictMorphismData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionStrictMorphismReport => {
  const issues: string[] = [];
  const leftReport = analyzeRelativeAdjunctionLeftMorphism(data.left);
  const rightReport = analyzeRelativeAdjunctionRightMorphism(data.right);

  const equality =
    data.left.source.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (!verticalBoundariesEqual(equality, data.left.comparison, data.right.comparison)) {
    issues.push("Strict morphisms require the left and right comparisons to coincide as the same tight 1-cell.");
  }

  if (data.left.source !== data.right.source || data.left.target !== data.right.target) {
    issues.push("Strict morphisms must be built from the same pair of relative adjunctions on the left and right sides.");
  }

  issues.push(...leftReport.issues, ...rightReport.issues);

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Strict morphism simultaneously satisfies the Definition 5.14 and 5.18 framing constraints."
      : `Relative adjunction strict-morphism issues: ${issues.join("; ")}`,
    left: leftReport,
    right: rightReport,
  };
};

const composeBoundary = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  upper: EquipmentVerticalBoundary<Obj, Arr>,
  lower: EquipmentVerticalBoundary<Obj, Arr>,
  details: string,
): EquipmentVerticalBoundary<Obj, Arr> => ({
  from: lower.from,
  to: upper.to,
  tight: equipment.tight.compose(upper.tight, lower.tight),
  details,
});

export const analyzeRelativeAdjunctionPrecomposition = <Obj, Arr, Payload, Evidence>(
  input: RelativeAdjunctionPrecompositionInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionPrecompositionReport<Obj, Arr, Payload, Evidence> => {
  const { adjunction, precomposition } = input;
  const { equipment, root, left, right } = adjunction;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(precomposition.to, root.from)) {
    issues.push("Precomposition tight cell must target the adjunction root domain A.");
  }

  if (!equality(precomposition.to, left.from)) {
    issues.push("Precomposition tight cell must also target the left leg domain A.");
  }

  if (issues.length > 0) {
    return {
      holds: false,
      issues,
      details: `Relative adjunction precomposition issues: ${issues.join("; ")}`,
    };
  }

  const composedRoot = composeBoundary(
    equipment,
    root,
    precomposition,
    "Precomposed root j ∘ u supplied by Proposition 5.29.",
  );
  const composedLeft = composeBoundary(
    equipment,
    left,
    precomposition,
    "Precomposed left leg ℓ ∘ u supplied by Proposition 5.29.",
  );

  return {
    holds: true,
    issues: [],
    details:
      "Tight precomposition transports the relative adjunction along u, aligning with Proposition 5.29.",
    root: composedRoot,
    left: composedLeft,
    right,
  };
};

export const describeIdentityRelativeAdjunctionLeftMorphism = <Obj, Arr, Payload, Evidence>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionLeftMorphismData<Obj, Arr, Payload, Evidence> => {
  const { equipment, left } = adjunction;
  const comparison = identityVerticalBoundary(
    equipment,
    left.to,
    "Identity left morphism comparison on the apex of ℓ.",
  );
  const loose = identityProarrow(equipment, left.from);
  const frame = frameFromProarrow(loose);
  const boundaries = { left, right: left } as const;
  const evidence = equipment.cells.identity(frame, boundaries);
  return {
    source: adjunction,
    target: adjunction,
    comparison,
    transformation: {
      source: frame,
      target: frame,
      boundaries,
      evidence,
    },
  };
};

export const describeIdentityRelativeAdjunctionRightMorphism = <Obj, Arr, Payload, Evidence>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRightMorphismData<Obj, Arr, Payload, Evidence> => {
  const { equipment, right } = adjunction;
  const comparison = identityVerticalBoundary(
    equipment,
    right.from,
    "Identity right morphism comparison on the domain of r.",
  );
  const loose = identityProarrow(equipment, right.from);
  const frame = frameFromProarrow(loose);
  const boundaries = { left: right, right: right } as const;
  const evidence = equipment.cells.identity(frame, boundaries);
  return {
    source: adjunction,
    target: adjunction,
    comparison,
    transformation: {
      source: frame,
      target: frame,
      boundaries,
      evidence,
    },
  };
};

export const describeIdentityRelativeAdjunctionStrictMorphism = <Obj, Arr, Payload, Evidence>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionStrictMorphismData<Obj, Arr, Payload, Evidence> => ({
  left: describeIdentityRelativeAdjunctionLeftMorphism(adjunction),
  right: describeIdentityRelativeAdjunctionRightMorphism(adjunction),
});

export const describeTrivialRelativeAdjunctionUnitCounit = <Obj, Arr, Payload, Evidence>(
  data: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionUnitCounitPresentation<Obj, Arr, Payload, Evidence> => {
  const { equipment, root, left, right } = data;
  const baseObject = root.from;
  const unitProarrow = identityProarrow(equipment, baseObject);
  const unitFrame = frameFromProarrow(unitProarrow);
  const unitBoundaries = { left: root, right } as const;
  const unitEvidence = equipment.cells.identity(unitFrame, unitBoundaries);
  const counitProarrow = unitProarrow;
  const counitFrame = unitFrame;
  const counitBoundaries = { left, right: left } as const;
  const counitEvidence = equipment.cells.identity(counitFrame, counitBoundaries);
  return {
    unit: {
      source: unitFrame,
      target: unitFrame,
      boundaries: unitBoundaries,
      evidence: unitEvidence,
    },
    counit: {
      source: counitFrame,
      target: counitFrame,
      boundaries: counitBoundaries,
      evidence: counitEvidence,
    },
  };
};

export const describeTrivialRelativeAdjunction = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
): RelativeAdjunctionData<Obj, Arr, Payload, Evidence> => {
  const root = identityVerticalBoundary(
    equipment,
    object,
    "Trivial relative adjunction root chosen as the identity tight 1-cell.",
  );
  const left = identityVerticalBoundary(
    equipment,
    object,
    "Trivial relative adjunction left leg equals the identity tight 1-cell.",
  );
  const right = identityVerticalBoundary(
    equipment,
    object,
    "Trivial relative adjunction right leg equals the identity tight 1-cell.",
  );
  const loose = identityProarrow(equipment, object);
  const frame = frameFromProarrow(loose);
  const boundaries = { left, right } as const;
  const evidence = equipment.cells.identity(frame, boundaries);
  const forward: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: frame,
    target: frame,
    boundaries,
    evidence,
  };
  const backward: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: frame,
    target: frame,
    boundaries,
    evidence,
  };

  return {
    equipment,
    root,
    left,
    right,
    homIsomorphism: {
      forward,
      backward,
      details: "Identity hom-set isomorphism witnesses for the trivial relative adjunction.",
    },
  };
};
