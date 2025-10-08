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
  FullyFaithfulAnalysis,
  FullyFaithfulInput,
  FullyFaithfulLeftExtensionAnalysis,
  FullyFaithfulLeftExtensionInput,
  PointwiseLeftExtensionLiftInput,
  PointwiseLeftExtensionLiftAnalysis,
} from "../virtual-equipment/faithfulness";
import {
  analyzeFullyFaithfulLeftExtension,
  analyzeFullyFaithfulTight1Cell,
  analyzePointwiseLeftExtensionLiftCorrespondence,
} from "../virtual-equipment/faithfulness";
import type {
  RelativeMonadData,
  RelativeMonadFramingReport,
  RelativeMonadResolutionReport,
} from "./relative-monads";
import { analyzeRelativeMonadFraming, analyzeRelativeMonadResolution } from "./relative-monads";
import type {
  RelativeAlgebraFramingReport,
  RelativeAlgebraMorphismPresentation,
  RelativeAlgebraPresentation,
  RelativeCanonicalActionReport,
  RelativeMorphismCompatibilityReport,
  RelativeOpalgebraFramingReport,
  RelativeOpalgebraMorphismPresentation,
  RelativeOpalgebraPresentation,
} from "./relative-algebras";
import {
  analyzeRelativeAlgebraCanonicalAction,
  analyzeRelativeAlgebraFraming,
  analyzeRelativeAlgebraMorphismCompatibility,
  analyzeRelativeOpalgebraFraming,
  analyzeRelativeOpalgebraMorphismCompatibility,
} from "./relative-algebras";
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

export interface RelativeAdjunctionSectionWitness<Obj, Arr, Payload, Evidence> {
  readonly adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly objectSection: EquipmentVerticalBoundary<Obj, Arr>;
  readonly arrowSection: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly homBijection: RelativeAdjunctionHomIsomorphism<Obj, Arr, Payload, Evidence>;
  readonly comparisonComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly comparisonIdentity: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly sectionComposite: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly sectionIdentity: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAdjunctionSectionReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeAdjunctionSectionWitness<Obj, Arr, Payload, Evidence>;
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

export interface RelativeAdjunctionPastingInput<Obj, Arr, Payload, Evidence> {
  readonly outer: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly inner: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly result: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly leftMorphism: RelativeAdjunctionLeftMorphismData<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAdjunctionPastingReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly composedLeft?: EquipmentVerticalBoundary<Obj, Arr>;
  readonly leftMorphism: RelativeAdjunctionLeftMorphismReport;
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

export const analyzeRelativeAdjunctionSection = <Obj, Arr, Payload, Evidence>(
  witness: RelativeAdjunctionSectionWitness<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionSectionReport<Obj, Arr, Payload, Evidence> => {
  const {
    adjunction,
    objectSection,
    arrowSection,
    homBijection,
    comparisonComposite,
    comparisonIdentity,
    sectionComposite,
    sectionIdentity,
  } = witness;
  const { equipment, left, right, homIsomorphism } = adjunction;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!verticalBoundariesEqual(equality, objectSection, left)) {
    issues.push("Right-adjoint section must reproduce the adjunction's left leg on objects.");
  }

  boundariesMatch(
    equality,
    arrowSection.boundaries.left,
    left,
    "Right-adjoint section arrow action left boundary",
    issues,
  );
  boundariesMatch(
    equality,
    arrowSection.boundaries.right,
    objectSection,
    "Right-adjoint section arrow action right boundary",
    issues,
  );

  ensureFrameAlignment(
    equality,
    arrowSection.source,
    left.from,
    left.to,
    "Right-adjoint section arrow action source frame",
    issues,
  );
  ensureFrameAlignment(
    equality,
    arrowSection.target,
    left.from,
    left.to,
    "Right-adjoint section arrow action target frame",
    issues,
  );

  const comparisonIdentityBoundaries = { left, right: left } as const;
  const sectionIdentityBoundaries = { left: right, right } as const;

  ensureFrameAlignment(
    equality,
    comparisonComposite.source,
    left.from,
    left.to,
    "Comparison composite source frame",
    issues,
  );
  ensureFrameAlignment(
    equality,
    comparisonComposite.target,
    left.from,
    left.to,
    "Comparison composite target frame",
    issues,
  );
  boundariesMatch(
    equality,
    comparisonComposite.boundaries.left,
    left,
    "Comparison composite left boundary",
    issues,
  );
  boundariesMatch(
    equality,
    comparisonComposite.boundaries.right,
    objectSection,
    "Comparison composite right boundary",
    issues,
  );

  ensureFrameAlignment(
    equality,
    comparisonIdentity.source,
    left.from,
    left.to,
    "Comparison identity source frame",
    issues,
  );
  ensureFrameAlignment(
    equality,
    comparisonIdentity.target,
    left.from,
    left.to,
    "Comparison identity target frame",
    issues,
  );
  boundariesMatch(
    equality,
    comparisonIdentity.boundaries.left,
    comparisonIdentityBoundaries.left,
    "Comparison identity left boundary",
    issues,
  );
  boundariesMatch(
    equality,
    comparisonIdentity.boundaries.right,
    comparisonIdentityBoundaries.right,
    "Comparison identity right boundary",
    issues,
  );

  ensureFrameAlignment(
    equality,
    sectionComposite.source,
    right.from,
    right.to,
    "Section composite source frame",
    issues,
  );
  ensureFrameAlignment(
    equality,
    sectionComposite.target,
    right.from,
    right.to,
    "Section composite target frame",
    issues,
  );
  boundariesMatch(
    equality,
    sectionComposite.boundaries.left,
    right,
    "Section composite left boundary",
    issues,
  );
  boundariesMatch(
    equality,
    sectionComposite.boundaries.right,
    right,
    "Section composite right boundary",
    issues,
  );

  ensureFrameAlignment(
    equality,
    sectionIdentity.source,
    right.from,
    right.to,
    "Section identity source frame",
    issues,
  );
  ensureFrameAlignment(
    equality,
    sectionIdentity.target,
    right.from,
    right.to,
    "Section identity target frame",
    issues,
  );
  boundariesMatch(
    equality,
    sectionIdentity.boundaries.left,
    sectionIdentityBoundaries.left,
    "Section identity left boundary",
    issues,
  );
  boundariesMatch(
    equality,
    sectionIdentity.boundaries.right,
    sectionIdentityBoundaries.right,
    "Section identity right boundary",
    issues,
  );

  if (homBijection !== homIsomorphism) {
    issues.push(
      "Right-adjoint section must reuse the adjunction's hom-set isomorphism witnesses from Lemma 5.1.",
    );
  } else {
    boundariesMatch(
      equality,
      homBijection.forward.boundaries.left,
      left,
      "Right-adjoint section forward hom boundary",
      issues,
    );
    boundariesMatch(
      equality,
      homBijection.forward.boundaries.right,
      right,
      "Right-adjoint section forward hom codomain",
      issues,
    );
    boundariesMatch(
      equality,
      homBijection.backward.boundaries.left,
      left,
      "Right-adjoint section backward hom boundary",
      issues,
    );
    boundariesMatch(
      equality,
      homBijection.backward.boundaries.right,
      right,
      "Right-adjoint section backward hom codomain",
      issues,
    );
  }

  const comparisonEvidence = equipment.cells.verticalCompose(
    homIsomorphism.forward,
    arrowSection,
  );
  if (!comparisonEvidence) {
    issues.push(
      "Composite ℓ ∘ σ should exist as a vertical composition witnessing Lemma 6.38's retract equation.",
    );
  } else {
    if (comparisonComposite.evidence !== comparisonEvidence) {
      issues.push(
        "Recorded ℓ ∘ σ composite must reuse the evidence returned by the equipment's vertical composition.",
      );
    }
    if (comparisonIdentity.evidence !== comparisonEvidence) {
      issues.push(
        "Composite ℓ ∘ σ should coincide with the supplied identity 2-cell on Alg(T).",
      );
    }
  }

  const sectionEvidenceCandidate = equipment.cells.verticalCompose(
    homIsomorphism.backward,
    arrowSection,
  );
  const sectionEvidence =
    sectionEvidenceCandidate ?? equipment.cells.verticalCompose(arrowSection, homIsomorphism.forward);
  if (!sectionEvidence) {
    issues.push(
      "Composite σ ∘ ℓ should exist as a vertical composition witnessing Lemma 6.38's section equation.",
    );
  } else {
    if (sectionComposite.evidence !== sectionEvidence) {
      issues.push(
        "Recorded σ ∘ ℓ composite must reuse the evidence returned by the equipment's vertical composition.",
      );
    }
    if (sectionIdentity.evidence !== sectionEvidence) {
      issues.push(
        "Composite σ ∘ ℓ should coincide with the supplied identity 2-cell on the j-objects.",
      );
    }
  }

  const holds = issues.length === 0;
  return {
    holds,
    pending: false,
    issues,
    details: holds
      ? "Right-adjoint section witnesses both triangle identities from Lemma 6.38."
      : `Right-adjoint section issues: ${issues.join("; ")}`,
    witness,
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
    ...(fullyFaithfulAnalysis !== undefined && { fullyFaithful: fullyFaithfulAnalysis }),
    ...(pointwiseAnalysis !== undefined && { pointwise: pointwiseAnalysis }),
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

export const analyzeRelativeAdjunctionPasting = <Obj, Arr, Payload, Evidence>(
  input: RelativeAdjunctionPastingInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionPastingReport<Obj, Arr, Payload, Evidence> => {
  const { outer, inner, result, leftMorphism } = input;
  const issues: string[] = [];

  if (outer.equipment !== inner.equipment) {
    issues.push("Outer and inner relative adjunctions must inhabit the same virtual equipment to paste.");
  }
  if (outer.equipment !== result.equipment) {
    issues.push("Pasted relative adjunction should reuse the outer equipment instance.");
  }

  const equipment = outer.equipment;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  const composedLeft = composeBoundary(
    equipment,
    inner.left,
    outer.left,
    "Composite left leg ℓ₂ ∘ ℓ₁ produced by relative adjunction pasting.",
  );

  if (!verticalBoundariesEqual(equality, outer.right, inner.root)) {
    issues.push("Inner relative adjunction should reuse the outer right leg as its root for Proposition 5.30.");
  }

  if (!equality(outer.left.to, inner.left.from)) {
    issues.push("Outer left leg codomain must match the inner left leg domain to form the pasted composite.");
  }

  if (!verticalBoundariesEqual(equality, result.root, outer.root)) {
    issues.push("Pasted relative adjunction should retain the outer root j when forming the left morphism.");
  }

  if (!verticalBoundariesEqual(equality, result.left, composedLeft)) {
    issues.push("Pasted left leg should equal the composite ℓ₂ ∘ ℓ₁ from Proposition 5.30.");
  }

  if (!verticalBoundariesEqual(equality, result.right, inner.right)) {
    issues.push("Pasted right leg must coincide with the inner right adjoint r₂.");
  }

  if (leftMorphism.source !== outer) {
    issues.push("Induced left morphism should reference the outer adjunction as its source.");
  }

  if (leftMorphism.target !== result) {
    issues.push("Induced left morphism should target the pasted relative adjunction.");
  }

  const leftReport = analyzeRelativeAdjunctionLeftMorphism(leftMorphism);
  issues.push(...leftReport.issues);

  const holds = issues.length === 0;
  const details = holds
    ? "Nested relative adjunctions paste to produce a left morphism as in Proposition 5.30."
    : `Relative adjunction pasting issues: ${issues.join("; ")}`;

  return {
    holds,
    issues,
    details,
    composedLeft,
    leftMorphism: leftReport,
  };
};

export interface RelativeAdjunctionFullyFaithfulPostcompositionInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly base: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly postcompose: EquipmentVerticalBoundary<Obj, Arr>;
  readonly result: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionFullyFaithfulPostcompositionReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly expectedRoot: EquipmentVerticalBoundary<Obj, Arr>;
  readonly expectedRight: EquipmentVerticalBoundary<Obj, Arr>;
  readonly fullyFaithful: FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeAdjunctionFullyFaithfulPostcomposition = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionFullyFaithfulPostcompositionInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionFullyFaithfulPostcompositionReport<Obj, Arr, Payload, Evidence> => {
  const { base, postcompose, result } = input;
  const issues: string[] = [];

  if (base.equipment !== result.equipment) {
    issues.push("Base and postcomposed adjunctions must share the same virtual equipment instance.");
  }

  const equipment = base.equipment;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (!equality(postcompose.from, base.root.to)) {
    issues.push("Fully faithful postcomposition must start at the codomain of the base root j.");
  }

  if (!equality(postcompose.from, base.right.to)) {
    issues.push("Fully faithful postcomposition must also start at the codomain of the base right leg r.");
  }

  const fullyFaithful = analyzeFullyFaithfulTight1Cell(equipment, {
    tight: postcompose.tight,
    domain: postcompose.from,
    codomain: postcompose.to,
  });

  const expectedRoot = composeBoundary(
    equipment,
    postcompose,
    base.root,
    "Postcomposed root u ∘ j from Example 5.31.",
  );
  const expectedRight = composeBoundary(
    equipment,
    postcompose,
    base.right,
    "Postcomposed right leg u ∘ r from Example 5.31.",
  );

  if (!verticalBoundariesEqual(equality, result.root, expectedRoot)) {
    issues.push("Postcomposed relative adjunction root should equal u ∘ j.");
  }

  if (!verticalBoundariesEqual(equality, result.right, expectedRight)) {
    issues.push("Postcomposed relative adjunction right leg should equal u ∘ r.");
  }

  if (!verticalBoundariesEqual(equality, result.left, base.left)) {
    issues.push("Fully faithful postcomposition should leave the left leg ℓ unchanged.");
  }

  const holds =
    issues.length === 0 && fullyFaithful.holds;

  const combinedIssues = holds
    ? []
    : [...issues, ...(!fullyFaithful.holds ? fullyFaithful.issues : [])];

  const details = holds
    ? "Fully faithful tight 1-cell postcomposes the right leg and root, yielding the Example 5.31 relative adjunction."
    : `Fully faithful postcomposition issues: ${combinedIssues.join("; ")}`;

  return {
    holds,
    issues: combinedIssues,
    details,
    expectedRoot,
    expectedRight,
    fullyFaithful,
  };
};

export interface RelativeAdjunctionInducedMonadsInput<Obj, Arr, Payload, Evidence> {
  readonly left: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly right: RelativeMonadData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionInducedMonadsCoincideReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeAdjunctionResoluteInput<Obj, Arr, Payload, Evidence> {
  readonly postcomposition: RelativeAdjunctionFullyFaithfulPostcompositionInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly inducedMonads: RelativeAdjunctionInducedMonadsInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeAdjunctionResoluteReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly postcomposition: RelativeAdjunctionFullyFaithfulPostcompositionReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly monads: RelativeAdjunctionInducedMonadsCoincideReport;
}

export interface RelativeAdjunctionResoluteLeftMorphismInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly resolute: RelativeAdjunctionResoluteInput<Obj, Arr, Payload, Evidence>;
  readonly precomposition: RelativeAdjunctionPrecompositionInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly pasting: RelativeAdjunctionPastingInput<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionResoluteLeftMorphismReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly resolute: RelativeAdjunctionResoluteReport<Obj, Arr, Payload, Evidence>;
  readonly precomposition: RelativeAdjunctionPrecompositionReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly pasting: RelativeAdjunctionPastingReport<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionOrdinaryLeftAdjointCompositionReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly leftMorphism: RelativeAdjunctionResoluteLeftMorphismReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

const framesEqual = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  actual: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>; readonly leftBoundary: Obj; readonly rightBoundary: Obj },
  expected: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>; readonly leftBoundary: Obj; readonly rightBoundary: Obj },
  label: string,
  issues: string[],
): void => {
  if (!equality(actual.leftBoundary, expected.leftBoundary)) {
    issues.push(`${label} should start at the same boundary object.`);
  }
  if (!equality(actual.rightBoundary, expected.rightBoundary)) {
    issues.push(`${label} should end at the same boundary object.`);
  }
  if (actual.arrows.length !== expected.arrows.length) {
    issues.push(`${label} should list ${expected.arrows.length} loose arrows but found ${actual.arrows.length}.`);
    return;
  }
  for (let index = 0; index < expected.arrows.length; index += 1) {
    const expectedArrow = expected.arrows[index];
    const actualArrow = actual.arrows[index];
    if (!actualArrow || !expectedArrow) {
      issues.push(`${label} is missing arrow data at index ${index}.`);
      continue;
    }
    if (!equality(actualArrow.from, expectedArrow.from) || !equality(actualArrow.to, expectedArrow.to)) {
      issues.push(`${label} arrow ${index} should share the endpoints of the comparison arrow.`);
    }
  }
};

const boundariesEqual = <Obj, Arr>(
  equality: (left: Obj, right: Obj) => boolean,
  actual: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
  issues: string[],
): void => {
  if (!verticalBoundariesEqual(equality, actual, expected)) {
    issues.push(`${label} must coincide for the induced monads to agree.`);
  }
};

export const analyzeRelativeAdjunctionInducedMonadsCoincide = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionInducedMonadsInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionInducedMonadsCoincideReport => {
  const { left, right } = input;
  const issues: string[] = [];

  if (left.equipment !== right.equipment) {
    issues.push("Relative monads must share the same virtual equipment to be compared.");
  }

  const equipment = left.equipment;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  boundariesEqual(equality, left.root, right.root, "Relative monad roots", issues);
  boundariesEqual(equality, left.carrier, right.carrier, "Relative monad carriers", issues);

  if (left.looseCell !== right.looseCell) {
    issues.push("Relative monad loose arrow E(j,t) should coincide between the two resolutions.");
  }

  framesEqual(equality, left.extension.source, right.extension.source, "Extension source frame", issues);
  framesEqual(equality, left.extension.target, right.extension.target, "Extension target frame", issues);
  boundariesEqual(equality, left.extension.boundaries.left, right.extension.boundaries.left, "Extension left boundary", issues);
  boundariesEqual(equality, left.extension.boundaries.right, right.extension.boundaries.right, "Extension right boundary", issues);

  framesEqual(equality, left.unit.source, right.unit.source, "Unit source frame", issues);
  framesEqual(equality, left.unit.target, right.unit.target, "Unit target frame", issues);
  boundariesEqual(equality, left.unit.boundaries.left, right.unit.boundaries.left, "Unit left boundary", issues);
  boundariesEqual(equality, left.unit.boundaries.right, right.unit.boundaries.right, "Unit right boundary", issues);

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Relative monads share root, carrier, loose arrow, and unit/extension data, recovering Corollary 5.32."
      : `Relative monad comparison issues: ${issues.join("; ")}`,
  };
};

export const analyzeRelativeAdjunctionResolutePair = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionResoluteInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionResoluteReport<Obj, Arr, Payload, Evidence> => {
  const { postcomposition, inducedMonads } = input;
  const postcompositionReport = analyzeRelativeAdjunctionFullyFaithfulPostcomposition(
    postcomposition,
  );
  const monadReport = analyzeRelativeAdjunctionInducedMonadsCoincide(inducedMonads);

  const issues: string[] = [];

  const base = postcomposition.base;
  const result = postcomposition.result;
  const leftMonad = inducedMonads.left;
  const rightMonad = inducedMonads.right;

  if (leftMonad.equipment !== base.equipment) {
    issues.push(
      "Resolute pair expects the j-relative monad to be computed inside the base adjunction's equipment.",
    );
  }

  if (rightMonad.equipment !== result.equipment) {
    issues.push(
      "Resolute pair expects the j'-relative monad to share the postcomposed adjunction's equipment.",
    );
  }

  if (base.equipment !== result.equipment) {
    issues.push("Resolute pair requires the base and postcomposed adjunctions to share equipment.");
  }

  const equipment = base.equipment;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (!verticalBoundariesEqual(equality, leftMonad.root, base.root)) {
    issues.push("Base relative monad root should coincide with the base adjunction root j.");
  }

  if (!verticalBoundariesEqual(equality, rightMonad.root, result.root)) {
    issues.push("Postcomposed relative monad root should coincide with the result adjunction root j′.");
  }

  if (!verticalBoundariesEqual(equality, leftMonad.carrier, base.right)) {
    issues.push("Base relative monad carrier should reuse the base right leg r.");
  }

  if (!verticalBoundariesEqual(equality, rightMonad.carrier, result.right)) {
    issues.push("Postcomposed relative monad carrier should reuse the result right leg r′.");
  }

  const combinedIssues = [
    ...issues,
    ...(postcompositionReport.holds ? [] : postcompositionReport.issues),
    ...(monadReport.holds ? [] : monadReport.issues),
  ];

  const holds = combinedIssues.length === 0;
  const details = holds
    ? "Fully faithful postcomposition and coincident monads certify a resolute pair as in Remark 5.33."
    : `Resolute pair issues: ${combinedIssues.join("; ")}`;

  return {
    holds,
    issues: combinedIssues,
    details,
    postcomposition: postcompositionReport,
    monads: monadReport,
  };
};

export const analyzeRelativeAdjunctionResoluteLeftMorphism = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionResoluteLeftMorphismInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionResoluteLeftMorphismReport<Obj, Arr, Payload, Evidence> => {
  const { resolute, precomposition, pasting } = input;

  const resoluteReport = analyzeRelativeAdjunctionResolutePair(resolute);
  const precompositionReport = analyzeRelativeAdjunctionPrecomposition(precomposition);
  const pastingReport = analyzeRelativeAdjunctionPasting(pasting);

  const issues: string[] = [];

  if (resolute.postcomposition.base !== pasting.outer) {
    issues.push("Resolute left morphism expects the pasted outer adjunction to equal the base adjunction.");
  }

  if (resolute.postcomposition.result !== pasting.result) {
    issues.push(
      "Resolute left morphism expects the pasted result adjunction to equal the fully faithful postcomposition.",
    );
  }

  if (precomposition.adjunction !== resolute.postcomposition.base) {
    issues.push("Resolute left morphism precomposition should operate on the base adjunction.");
  }

  const combinedIssues = [
    ...issues,
    ...(resoluteReport.holds ? [] : resoluteReport.issues),
    ...(precompositionReport.holds ? [] : precompositionReport.issues),
    ...(pastingReport.holds ? [] : pastingReport.issues),
  ];

  const holds = combinedIssues.length === 0;
  const details = holds
    ? "Resolute pair data, tight precomposition, and Proposition 5.30 pasting assemble the Corollary 5.34 left morphism."
    : `Resolute left morphism issues: ${combinedIssues.join("; ")}`;

  return {
    holds,
    issues: combinedIssues,
    details,
    resolute: resoluteReport,
    precomposition: precompositionReport,
    pasting: pastingReport,
  };
};

export const analyzeRelativeAdjunctionOrdinaryLeftAdjointComposition = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionResoluteLeftMorphismInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionOrdinaryLeftAdjointCompositionReport<Obj, Arr, Payload, Evidence> => {
  const leftMorphism = analyzeRelativeAdjunctionResoluteLeftMorphism(input);
  const holds = leftMorphism.holds;
  const details = holds
    ? "Identity-root resolute data composes ordinary left adjoints through Corollary 5.34, matching Example 5.35."
    : leftMorphism.details;
  return {
    holds,
    issues: leftMorphism.issues,
    details,
    leftMorphism,
  };
};

export interface RelativeAdjunctionRelativeMonadModuleWitness<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly action: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAdjunctionRelativeMonadModuleInput<Obj, Arr, Payload, Evidence> {
  readonly leftMorphism: RelativeAdjunctionResoluteLeftMorphismInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly module: RelativeAdjunctionRelativeMonadModuleWitness<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionRelativeMonadModuleReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly leftMorphism: RelativeAdjunctionResoluteLeftMorphismReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly resolution: RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeAdjunctionRelativeMonadModule = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionRelativeMonadModuleInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadModuleReport<Obj, Arr, Payload, Evidence> => {
  const { leftMorphism, module } = input;
  const moduleIssues: string[] = [];

  const leftMorphismReport = analyzeRelativeAdjunctionResoluteLeftMorphism(leftMorphism);
  const baseAdjunction = leftMorphism.resolute.postcomposition.base;
  const equipment = baseAdjunction.equipment;

  if (module.monad.equipment !== equipment) {
    moduleIssues.push("Module monad should live in the same equipment as the base adjunction.");
  }

  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (module.monad !== leftMorphism.resolute.inducedMonads.left) {
    moduleIssues.push("Module monad should coincide with the j-relative monad from the resolute pair.");
  }

  if (!verticalBoundariesEqual(equality, module.carrier, baseAdjunction.left)) {
    moduleIssues.push("Module carrier should reuse the left leg of the base relative adjunction.");
  }

  const transformation = leftMorphism.pasting.leftMorphism.transformation;

  if (!verticalBoundariesEqual(equality, module.action.boundaries.left, transformation.boundaries.left)) {
    moduleIssues.push("Module action should share the left boundary with the resolute left morphism.");
  }

  if (!verticalBoundariesEqual(equality, module.action.boundaries.right, transformation.boundaries.right)) {
    moduleIssues.push("Module action should share the right boundary with the resolute left morphism target.");
  }

  ensureLeftMorphismFrames(module.action, moduleIssues);

  const resolution = analyzeRelativeMonadResolution({ monad: module.monad, adjunction: baseAdjunction });

  const combinedIssues = [
    ...moduleIssues,
    ...(leftMorphismReport.holds ? [] : leftMorphismReport.issues),
    ...(resolution.holds ? [] : resolution.issues),
  ];

  const holds = moduleIssues.length === 0 && leftMorphismReport.holds && resolution.holds;

  return {
    holds,
    issues: holds ? [] : combinedIssues,
    details: holds
      ? "Resolute left morphism action realises the Proposition 5.36 module over the base j-relative monad."
      : `Relative monad module issues: ${combinedIssues.join("; ")}`,
    leftMorphism: leftMorphismReport,
    resolution,
  };
};

export interface RelativeAdjunctionRelativeMonadPastingComparison<Obj, Arr, Payload, Evidence> {
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly extension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAdjunctionRelativeMonadPastingWitness<Obj, Arr, Payload, Evidence> {
  readonly source: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly sourceAdjunction?: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly leftAdjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly result: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly comparison: RelativeAdjunctionRelativeMonadPastingComparison<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionRelativeMonadPastingReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly sourceFraming: RelativeMonadFramingReport;
  readonly resultFraming: RelativeMonadFramingReport;
  readonly sourceResolution?: RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence>;
  readonly resultResolution: RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence>;
}

const ensureNonEmptyFrame = <Obj, Arr, Payload, Evidence>(
  cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  label: string,
  issues: string[],
): void => {
  if (cell.source.arrows.length === 0) {
    issues.push(`${label} source frame should describe at least one loose arrow.`);
  }
  if (cell.target.arrows.length === 0) {
    issues.push(`${label} target frame should describe at least one loose arrow.`);
  }
};

export const analyzeRelativeAdjunctionRelativeMonadPasting = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeAdjunctionRelativeMonadPastingWitness<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadPastingReport<Obj, Arr, Payload, Evidence> => {
  const { source, sourceAdjunction, leftAdjunction, result, comparison } = witness;
  const issues: string[] = [];

  if (source.equipment !== leftAdjunction.equipment) {
    issues.push("Source relative monad and left adjunction must share the same equipment.");
  }

  if (leftAdjunction.equipment !== result.equipment) {
    issues.push("Pasted relative monad should live in the same equipment as the left adjunction.");
  }

  const equipment = leftAdjunction.equipment;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (!verticalBoundariesEqual(equality, comparison.unit.boundaries.left, result.root)) {
    issues.push("Pasted unit should reuse the result monad root as its left boundary.");
  }

  if (!verticalBoundariesEqual(equality, comparison.unit.boundaries.right, source.root)) {
    issues.push("Pasted unit should compare against the source monad root as its right boundary.");
  }

  if (!verticalBoundariesEqual(equality, comparison.extension.boundaries.left, result.carrier)) {
    issues.push("Pasted extension should reuse the result monad carrier as its left boundary.");
  }

  if (!verticalBoundariesEqual(equality, comparison.extension.boundaries.right, source.carrier)) {
    issues.push("Pasted extension should compare against the source monad carrier as its right boundary.");
  }

  ensureNonEmptyFrame(comparison.unit, "Pasted unit", issues);
  ensureNonEmptyFrame(comparison.extension, "Pasted extension", issues);

  const sourceFraming = analyzeRelativeMonadFraming(source);
  const resultFraming = analyzeRelativeMonadFraming(result);
  const resultResolution = analyzeRelativeMonadResolution({ monad: result, adjunction: leftAdjunction });
  const sourceResolution = sourceAdjunction
    ? analyzeRelativeMonadResolution({ monad: source, adjunction: sourceAdjunction })
    : undefined;

  const combinedIssues = [
    ...issues,
    ...(sourceFraming.holds ? [] : sourceFraming.issues),
    ...(resultFraming.holds ? [] : resultFraming.issues),
    ...(resultResolution.holds ? [] : resultResolution.issues),
    ...(sourceResolution && !sourceResolution.holds ? sourceResolution.issues : []),
  ];

  const holds =
    issues.length === 0 &&
    sourceFraming.holds &&
    resultFraming.holds &&
    resultResolution.holds &&
    (sourceResolution ? sourceResolution.holds : true);

  return {
    holds,
    issues: holds ? [] : combinedIssues,
    details: holds
      ? "Left relative adjunction pasting recovers the j'-relative monad and comparison data described in Proposition 5.37."
      : `Relative monad pasting issues: ${combinedIssues.join("; ")}`,
    sourceFraming,
    resultFraming,
    sourceResolution,
    resultResolution,
  };
};

export interface RelativeAdjunctionRelativeMonadPastingFullyFaithfulInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly pasting: RelativeAdjunctionRelativeMonadPastingWitness<Obj, Arr, Payload, Evidence>;
  readonly fullyFaithful?: FullyFaithfulInput<Obj, Arr>;
}

export interface RelativeAdjunctionRelativeMonadPastingFullyFaithfulReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly pasting: RelativeAdjunctionRelativeMonadPastingReport<Obj, Arr, Payload, Evidence>;
  readonly fullyFaithful?: FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeAdjunctionRelativeMonadPastingFullyFaithful = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionRelativeMonadPastingFullyFaithfulInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadPastingFullyFaithfulReport<Obj, Arr, Payload, Evidence> => {
  const pasting = analyzeRelativeAdjunctionRelativeMonadPasting(input.pasting);
  const equipment = input.pasting.leftAdjunction.equipment;
  let fullyFaithful: FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence> | undefined;
  const issues = pasting.holds ? [] : [...pasting.issues];

  if (input.fullyFaithful) {
    fullyFaithful = analyzeFullyFaithfulTight1Cell(equipment, input.fullyFaithful);
    if (!fullyFaithful.holds) {
      issues.push(...fullyFaithful.issues);
    }
  }

  const holds = pasting.holds && (!fullyFaithful || fullyFaithful.holds);

  return {
    holds,
    issues: holds ? [] : issues,
    details: holds
      ? "Fully faithful right adjoint upgrades Proposition 5.37 to the Example 5.38 functorial comparison."
      : `Relative monad fully faithful pasting issues: ${issues.join("; ")}`,
    pasting,
    fullyFaithful,
  };
};

export interface RelativeAdjunctionRelativeMonadPastingAdjunctionInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly first: RelativeAdjunctionRelativeMonadPastingWitness<Obj, Arr, Payload, Evidence>;
  readonly second: RelativeAdjunctionRelativeMonadPastingWitness<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionRelativeMonadPastingAdjunctionReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly first: RelativeAdjunctionRelativeMonadPastingReport<Obj, Arr, Payload, Evidence>;
  readonly second: RelativeAdjunctionRelativeMonadPastingReport<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeAdjunctionRelativeMonadPastingAdjunction = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionRelativeMonadPastingAdjunctionInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadPastingAdjunctionReport<Obj, Arr, Payload, Evidence> => {
  const first = analyzeRelativeAdjunctionRelativeMonadPasting(input.first);
  const second = analyzeRelativeAdjunctionRelativeMonadPasting(input.second);
  const issues: string[] = [];

  const { result } = input.first;
  const { source } = input.second;

  if (result.equipment !== source.equipment) {
    issues.push("Composed pastings should share the intermediate relative monad equipment.");
  } else {
    const equality = result.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
    if (!verticalBoundariesEqual(equality, result.root, source.root)) {
      issues.push("Intermediate relative monad roots should coincide when composing Example 5.39 pastings.");
    }
    if (!verticalBoundariesEqual(equality, result.carrier, source.carrier)) {
      issues.push("Intermediate relative monad carriers should coincide when composing Example 5.39 pastings.");
    }
  }

  const combinedIssues = [
    ...issues,
    ...(first.holds ? [] : first.issues),
    ...(second.holds ? [] : second.issues),
  ];

  const holds = issues.length === 0 && first.holds && second.holds;

  return {
    holds,
    issues: holds ? [] : combinedIssues,
    details: holds
      ? "Sequential Proposition 5.37 pastings recover the Example 5.39 adjunction transport."
      : `Relative monad adjunction pasting issues: ${combinedIssues.join("; ")}`,
    first,
    second,
  };
};

export interface RelativeAdjunctionRelativeMonadCompositeInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly module: RelativeAdjunctionRelativeMonadModuleInput<Obj, Arr, Payload, Evidence>;
  readonly pasting: RelativeAdjunctionRelativeMonadPastingWitness<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionRelativeMonadCompositeReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly module: RelativeAdjunctionRelativeMonadModuleReport<Obj, Arr, Payload, Evidence>;
  readonly pasting: RelativeAdjunctionRelativeMonadPastingReport<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeAdjunctionRelativeMonadComposite = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionRelativeMonadCompositeInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadCompositeReport<Obj, Arr, Payload, Evidence> => {
  const moduleReport = analyzeRelativeAdjunctionRelativeMonadModule(input.module);
  const pastingReport = analyzeRelativeAdjunctionRelativeMonadPasting(input.pasting);
  const issues: string[] = [];

  const moduleMonad = input.module.module.monad;
  const pastingSource = input.pasting.source;

  if (moduleMonad !== pastingSource) {
    issues.push("Corollary 5.40 expects the pasted data to act on the module's source j-relative monad.");
  }

  const moduleTargetAdjunction = input.module.leftMorphism.resolute.postcomposition.result;
  if (moduleTargetAdjunction !== input.pasting.leftAdjunction) {
    issues.push("Pasted left adjunction should coincide with the resolute target from Proposition 5.36.");
  }

  const targetMonad = input.module.leftMorphism.resolute.inducedMonads.right;
  if (targetMonad !== input.pasting.result) {
    issues.push("Module-induced j' monad should match the pasted relative monad output.");
  }

  const combinedIssues = [
    ...issues,
    ...(moduleReport.holds ? [] : moduleReport.issues),
    ...(pastingReport.holds ? [] : pastingReport.issues),
  ];

  const holds = issues.length === 0 && moduleReport.holds && pastingReport.holds;

  return {
    holds,
    issues: holds ? [] : combinedIssues,
    details: holds
      ? "Module action and pasting coincide, yielding the Corollary 5.40 functor through the root."
      : `Relative monad composite issues: ${combinedIssues.join("; ")}`,
    module: moduleReport,
    pasting: pastingReport,
  };
};

export interface RelativeAdjunctionRelativeMonadLiteratureWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly composite: RelativeAdjunctionRelativeMonadCompositeInput<Obj, Arr, Payload, Evidence>;
  readonly hutson?: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly acu?: RelativeMonadData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionRelativeMonadLiteratureReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly composite: RelativeAdjunctionRelativeMonadCompositeReport<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeAdjunctionRelativeMonadLiteratureRecoveries = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  input: RelativeAdjunctionRelativeMonadLiteratureWitness<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadLiteratureReport<Obj, Arr, Payload, Evidence> => {
  const composite = analyzeRelativeAdjunctionRelativeMonadComposite(input.composite);
  const issues = composite.holds ? [] : [...composite.issues];

  const resultMonad = input.composite.pasting.result;
  const equality = resultMonad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (input.hutson) {
    if (input.hutson.equipment !== resultMonad.equipment) {
      issues.push("Hutson recovery should be expressed in the pasted monad's equipment.");
    } else {
      if (!verticalBoundariesEqual(equality, input.hutson.root, resultMonad.root)) {
        issues.push("Hutson recovery should share the pasted monad root when the postcomposition is the identity.");
      }
      if (!verticalBoundariesEqual(equality, input.hutson.carrier, resultMonad.carrier)) {
        issues.push("Hutson recovery should reuse the pasted monad carrier when the postcomposition is the identity.");
      }
    }
  }

  if (input.acu) {
    if (input.acu.equipment !== resultMonad.equipment) {
      issues.push("Altenkirch–Chapman–Uustalu recovery should be expressed in the pasted monad's equipment.");
    } else {
      if (!verticalBoundariesEqual(equality, input.acu.root, resultMonad.root)) {
        issues.push("Altenkirch–Chapman–Uustalu recovery should match the pasted root when j = j'.");
      }
      if (!verticalBoundariesEqual(equality, input.acu.carrier, resultMonad.carrier)) {
        issues.push("Altenkirch–Chapman–Uustalu recovery should match the pasted carrier when j = j'.");
      }
    }
  }

  const holds = composite.holds && issues.length === 0;

  return {
    holds,
    issues: holds ? [] : issues,
    details: holds
      ? "Literature recoveries confirm Corollary 5.40 reproduces Hutson and Altenkirch–Chapman–Uustalu constructions (Example 5.41)."
      : `Relative monad literature recovery issues: ${issues.join("; ")}`,
    composite,
  };
};

export interface RelativeAdjunctionRelativeMonadLeftOpalgebraInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly presentation: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAdjunctionRelativeMonadLeftOpalgebraReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly framing: RelativeOpalgebraFramingReport;
  readonly resolution: RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeAdjunctionRelativeMonadLeftOpalgebra = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  input: RelativeAdjunctionRelativeMonadLeftOpalgebraInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadLeftOpalgebraReport<Obj, Arr, Payload, Evidence> => {
  const { presentation, details } = input;
  const equipment = adjunction.equipment;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (presentation.monad.equipment !== equipment) {
    issues.push("Relative adjunction left opalgebra should live in the adjunction's equipment.");
  }

  if (!verticalBoundariesEqual(equality, presentation.monad.root, adjunction.root)) {
    issues.push("Relative adjunction left opalgebra must reuse the adjunction root as its monad root.");
  }

  if (!verticalBoundariesEqual(equality, presentation.opalgebra.carrier, adjunction.left)) {
    issues.push("Left opalgebra carrier should coincide with the relative adjunction left leg.");
  }

  const framing = analyzeRelativeOpalgebraFraming(presentation);
  const resolution = analyzeRelativeMonadResolution({ monad: presentation.monad, adjunction });

  const combinedIssues = [
    ...issues,
    ...(framing.holds ? [] : framing.issues),
    ...(resolution.holds ? [] : resolution.issues),
  ];

  const pending =
    combinedIssues.length === 0 &&
    framing.holds &&
    resolution.holds;

  return {
    holds: false,
    pending,
    issues: combinedIssues,
    details:
      combinedIssues.length === 0
        ? details ??
          "Left relative adjoint recorded as a T-opalgebra; Proposition 6.25 Street comparisons remain pending."
        : `Relative adjunction left opalgebra issues: ${combinedIssues.join("; ")}`,
    framing,
    resolution,
  };
};

export interface RelativeAdjunctionRelativeMonadRightAlgebraInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly presentation: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAdjunctionRelativeMonadRightAlgebraReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly framing: RelativeAlgebraFramingReport;
  readonly canonical: RelativeCanonicalActionReport;
  readonly resolution: RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeAdjunctionRelativeMonadRightAlgebra = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  input: RelativeAdjunctionRelativeMonadRightAlgebraInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadRightAlgebraReport<Obj, Arr, Payload, Evidence> => {
  const { presentation, details } = input;
  const equipment = adjunction.equipment;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (presentation.monad.equipment !== equipment) {
    issues.push("Relative adjunction right algebra should live in the adjunction's equipment.");
  }

  if (!verticalBoundariesEqual(equality, presentation.monad.root, adjunction.root)) {
    issues.push("Relative adjunction right algebra must reuse the adjunction root as its monad root.");
  }

  if (!verticalBoundariesEqual(equality, presentation.algebra.carrier, adjunction.right)) {
    issues.push("Right algebra carrier should coincide with the relative adjunction right leg.");
  }

  const framing = analyzeRelativeAlgebraFraming(presentation);
  const canonical = analyzeRelativeAlgebraCanonicalAction(presentation);
  const resolution = analyzeRelativeMonadResolution({ monad: presentation.monad, adjunction });

  const combinedIssues = [
    ...issues,
    ...(framing.holds ? [] : framing.issues),
    ...(resolution.holds ? [] : resolution.issues),
    ...(canonical.pending ? [] : canonical.issues),
  ];

  const pending =
    combinedIssues.length === 0 &&
    framing.holds &&
    resolution.holds &&
    canonical.pending;

  return {
    holds: false,
    pending,
    issues: combinedIssues,
    details:
      combinedIssues.length === 0
        ? details ??
          "Right relative adjoint recorded as a T-algebra; Proposition 6.25 Street comparisons remain pending."
        : `Relative adjunction right algebra issues: ${combinedIssues.join("; ")}`,
    framing,
    canonical,
    resolution,
  };
};

export interface RelativeAdjunctionRelativeMonadResolutionFunctorInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly left: RelativeAdjunctionRelativeMonadLeftOpalgebraInput<Obj, Arr, Payload, Evidence>;
  readonly right: RelativeAdjunctionRelativeMonadRightAlgebraInput<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAdjunctionRelativeMonadResolutionFunctorReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly left: RelativeAdjunctionRelativeMonadLeftOpalgebraReport<Obj, Arr, Payload, Evidence>;
  readonly right: RelativeAdjunctionRelativeMonadRightAlgebraReport<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeAdjunctionRelativeMonadResolutionFunctor = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  input: RelativeAdjunctionRelativeMonadResolutionFunctorInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionRelativeMonadResolutionFunctorReport<Obj, Arr, Payload, Evidence> => {
  const left = analyzeRelativeAdjunctionRelativeMonadLeftOpalgebra(adjunction, input.left);
  const right = analyzeRelativeAdjunctionRelativeMonadRightAlgebra(adjunction, input.right);

  const combinedIssues = [...left.issues, ...right.issues];
  const pending =
    combinedIssues.length === 0 &&
    left.pending &&
    right.pending;

  return {
    holds: false,
    pending,
    issues: combinedIssues,
    details:
      combinedIssues.length === 0
        ? input.details ??
          "Canonical (op)algebra functors into Res(T)_C recorded; Proposition 6.26 comparisons remain pending."
        : `Relative adjunction resolution functor issues: ${combinedIssues.join("; ")}`,
    left,
    right,
  };
};

export interface RelativeAdjunctionRelativeMonadTransportNaturality<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly tNaturality: RelativeOpalgebraMorphismPresentation<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly TNaturality: RelativeAlgebraMorphismPresentation<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeAdjunctionRelativeMonadOpalgebraTransportInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly pasting: RelativeAdjunctionRelativeMonadPastingWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly source: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly target: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly naturality?: RelativeAdjunctionRelativeMonadTransportNaturality<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeAdjunctionRelativeMonadOpalgebraTransportReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly pasting: RelativeAdjunctionRelativeMonadPastingReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly sourceFraming: RelativeOpalgebraFramingReport;
  readonly targetFraming: RelativeAlgebraFramingReport;
  readonly naturality?: {
    readonly t: RelativeMorphismCompatibilityReport;
    readonly T: RelativeMorphismCompatibilityReport;
  };
}

export const analyzeRelativeAdjunctionRelativeMonadOpalgebraTransport = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  input: RelativeAdjunctionRelativeMonadOpalgebraTransportInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeAdjunctionRelativeMonadOpalgebraTransportReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const { pasting, source, target, naturality, details } = input;
  const issues: string[] = [];

  if (pasting.leftAdjunction !== adjunction) {
    issues.push(
      "Relative adjunction transport should use the supplied left adjunction in the Proposition 5.37 pasting witness.",
    );
  }

  if (source.monad !== pasting.source) {
    issues.push("Source opalgebra must be expressed for the pasted witness's source relative monad.");
  }

  if (target.monad !== pasting.result) {
    issues.push(
      "Transported algebra must target the relative monad produced by the Proposition 5.37 pasting witness.",
    );
  }

  if (source.monad.equipment !== adjunction.equipment) {
    issues.push("Source opalgebra should live in the adjunction's equipment.");
  }

  if (target.monad.equipment !== adjunction.equipment) {
    issues.push("Transported algebra should live in the adjunction's equipment.");
  }

  if (!naturality) {
    issues.push("Proposition 6.27 transport requires naturality witnesses in t and T.");
  }

  const pastingReport = analyzeRelativeAdjunctionRelativeMonadPasting(pasting);
  const sourceFraming = analyzeRelativeOpalgebraFraming(source);
  const targetFraming = analyzeRelativeAlgebraFraming(target);

  let tReport: RelativeMorphismCompatibilityReport | undefined;
  let TReport: RelativeMorphismCompatibilityReport | undefined;

  if (naturality) {
    tReport = analyzeRelativeOpalgebraMorphismCompatibility(
      naturality.tNaturality,
    );
    TReport = analyzeRelativeAlgebraMorphismCompatibility(
      naturality.TNaturality,
    );
  }

  const combinedIssues = [
    ...issues,
    ...(pastingReport.holds ? [] : pastingReport.issues),
    ...(sourceFraming.holds ? [] : sourceFraming.issues),
    ...(targetFraming.holds ? [] : targetFraming.issues),
    ...(tReport?.issues ?? []),
    ...(TReport?.issues ?? []),
  ];

  const pending =
    combinedIssues.length === 0 &&
    pastingReport.holds &&
    sourceFraming.holds &&
    targetFraming.holds &&
    !!tReport?.pending &&
    !!TReport?.pending;

  return {
    holds: false,
    pending,
    issues: combinedIssues,
    details:
      combinedIssues.length === 0
        ? details ??
          naturality?.details ??
          "T-opalgebra transported across the relative adjunction; Proposition 6.27 comparisons remain pending."
        : `Relative adjunction opalgebra transport issues: ${combinedIssues.join("; ")}`,
    pasting: pastingReport,
    sourceFraming,
    targetFraming,
    naturality:
      tReport && TReport
        ? {
            t: tReport,
            T: TReport,
          }
        : undefined,
  };
};

export interface RelativeAdjunctionRelativeMonadAlgebraTransportInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly pasting: RelativeAdjunctionRelativeMonadPastingWitness<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly source: RelativeAlgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly target: RelativeOpalgebraPresentation<Obj, Arr, Payload, Evidence>;
  readonly naturality?: RelativeAdjunctionRelativeMonadTransportNaturality<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeAdjunctionRelativeMonadAlgebraTransportReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly pasting: RelativeAdjunctionRelativeMonadPastingReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly sourceFraming: RelativeAlgebraFramingReport;
  readonly targetFraming: RelativeOpalgebraFramingReport;
  readonly naturality?: {
    readonly t: RelativeMorphismCompatibilityReport;
    readonly T: RelativeMorphismCompatibilityReport;
  };
}

export const analyzeRelativeAdjunctionRelativeMonadAlgebraTransport = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  input: RelativeAdjunctionRelativeMonadAlgebraTransportInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeAdjunctionRelativeMonadAlgebraTransportReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const { pasting, source, target, naturality, details } = input;
  const issues: string[] = [];

  if (pasting.leftAdjunction !== adjunction) {
    issues.push(
      "Relative adjunction algebra transport should reference the supplied adjunction in the pasting witness.",
    );
  }

  if (source.monad !== pasting.source) {
    issues.push("Source algebra must arise from the pasted witness's source relative monad.");
  }

  if (target.monad !== pasting.result) {
    issues.push(
      "Transported opalgebra must live over the relative monad produced by the Proposition 5.37 pasting witness.",
    );
  }

  if (source.monad.equipment !== adjunction.equipment) {
    issues.push("Source algebra should live in the adjunction's equipment.");
  }

  if (target.monad.equipment !== adjunction.equipment) {
    issues.push("Transported opalgebra should live in the adjunction's equipment.");
  }

  if (!naturality) {
    issues.push("Proposition 6.27 dual transport requires naturality witnesses in t and T.");
  }

  const pastingReport = analyzeRelativeAdjunctionRelativeMonadPasting(pasting);
  const sourceFraming = analyzeRelativeAlgebraFraming(source);
  const targetFraming = analyzeRelativeOpalgebraFraming(target);

  let tReport: RelativeMorphismCompatibilityReport | undefined;
  let TReport: RelativeMorphismCompatibilityReport | undefined;

  if (naturality) {
    tReport = analyzeRelativeOpalgebraMorphismCompatibility(
      naturality.tNaturality,
    );
    TReport = analyzeRelativeAlgebraMorphismCompatibility(
      naturality.TNaturality,
    );
  }

  const combinedIssues = [
    ...issues,
    ...(pastingReport.holds ? [] : pastingReport.issues),
    ...(sourceFraming.holds ? [] : sourceFraming.issues),
    ...(targetFraming.holds ? [] : targetFraming.issues),
    ...(tReport?.issues ?? []),
    ...(TReport?.issues ?? []),
  ];

  const pending =
    combinedIssues.length === 0 &&
    pastingReport.holds &&
    sourceFraming.holds &&
    targetFraming.holds &&
    !!tReport?.pending &&
    !!TReport?.pending;

  return {
    holds: false,
    pending,
    issues: combinedIssues,
    details:
      combinedIssues.length === 0
        ? details ??
          naturality?.details ??
          "T-algebra transported across the relative adjunction; Proposition 6.27 dual comparisons remain pending."
        : `Relative adjunction algebra transport issues: ${combinedIssues.join("; ")}`,
    pasting: pastingReport,
    sourceFraming,
    targetFraming,
    naturality:
      tReport && TReport
        ? {
            t: tReport,
            T: TReport,
          }
        : undefined,
  };
};

export interface RelativeAdjunctionRelativeMonadTransportEquivalenceInput<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly opalgebra: RelativeAdjunctionRelativeMonadOpalgebraTransportInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly algebra: RelativeAdjunctionRelativeMonadAlgebraTransportInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly unitComparison?: RelativeAlgebraMorphismPresentation<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly counitComparison?: RelativeOpalgebraMorphismPresentation<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly details?: string;
}

export interface RelativeAdjunctionRelativeMonadTransportEquivalenceReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly opalgebra: RelativeAdjunctionRelativeMonadOpalgebraTransportReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly algebra: RelativeAdjunctionRelativeMonadAlgebraTransportReport<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly unitComparison?: RelativeMorphismCompatibilityReport;
  readonly counitComparison?: RelativeMorphismCompatibilityReport;
}

export const analyzeRelativeAdjunctionRelativeMonadTransportEquivalence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
  input: RelativeAdjunctionRelativeMonadTransportEquivalenceInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >,
): RelativeAdjunctionRelativeMonadTransportEquivalenceReport<
  Obj,
  Arr,
  Payload,
  Evidence
> => {
  const { opalgebra, algebra, unitComparison, counitComparison, details } = input;

  const opalgebraReport = analyzeRelativeAdjunctionRelativeMonadOpalgebraTransport(
    adjunction,
    opalgebra,
  );
  const algebraReport = analyzeRelativeAdjunctionRelativeMonadAlgebraTransport(
    adjunction,
    algebra,
  );

  let unitReport: RelativeMorphismCompatibilityReport | undefined;
  let counitReport: RelativeMorphismCompatibilityReport | undefined;
  const issues: string[] = [];

  if (!unitComparison) {
    issues.push("Transport equivalence should include a unit comparison between transported algebras.");
  } else {
    unitReport = analyzeRelativeAlgebraMorphismCompatibility(unitComparison);
  }

  if (!counitComparison) {
    issues.push("Transport equivalence should include a counit comparison between transported opalgebras.");
  } else {
    counitReport = analyzeRelativeOpalgebraMorphismCompatibility(counitComparison);
  }

  const combinedIssues = [
    ...issues,
    ...opalgebraReport.issues,
    ...algebraReport.issues,
    ...(unitReport?.issues ?? []),
    ...(counitReport?.issues ?? []),
  ];

  const pending =
    combinedIssues.length === 0 &&
    opalgebraReport.pending &&
    algebraReport.pending &&
    !!unitReport?.pending &&
    !!counitReport?.pending;

  return {
    holds: false,
    pending,
    issues: combinedIssues,
    details:
      combinedIssues.length === 0
        ? details ??
          "Relative adjunction transports recorded as a prospective equivalence; Remark 6.28 witnesses remain pending."
        : `Relative adjunction transport equivalence issues: ${combinedIssues.join("; ")}`,
    opalgebra: opalgebraReport,
    algebra: algebraReport,
    unitComparison: unitReport,
    counitComparison: counitReport,
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

export const describeRelativeAdjunctionSectionWitness = <Obj, Arr, Payload, Evidence>(
  adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionSectionWitness<Obj, Arr, Payload, Evidence> => {
  const { equipment, left, right, homIsomorphism } = adjunction;
  const comparisonBoundaries = { left, right: left } as const;
  const sectionBoundaries = { left: right, right } as const;
  const comparisonEvidence = equipment.cells.identity(
    homIsomorphism.forward.source,
    comparisonBoundaries,
  );
  const sectionEvidence = equipment.cells.identity(
    homIsomorphism.forward.target,
    sectionBoundaries,
  );

  return {
    adjunction,
    objectSection: left,
    arrowSection: homIsomorphism.forward,
    homBijection: homIsomorphism,
    comparisonComposite: {
      source: homIsomorphism.forward.source,
      target: homIsomorphism.forward.target,
      boundaries: comparisonBoundaries,
      evidence: comparisonEvidence,
    },
    comparisonIdentity: {
      source: homIsomorphism.forward.source,
      target: homIsomorphism.forward.target,
      boundaries: comparisonBoundaries,
      evidence: comparisonEvidence,
    },
    sectionComposite: {
      source: homIsomorphism.forward.target,
      target: homIsomorphism.forward.target,
      boundaries: sectionBoundaries,
      evidence: sectionEvidence,
    },
    sectionIdentity: {
      source: homIsomorphism.forward.target,
      target: homIsomorphism.forward.target,
      boundaries: sectionBoundaries,
      evidence: sectionEvidence,
    },
    details:
      "Right-adjoint section witness defaults to the adjunction's left leg and hom-set bijection.",
  };
};
