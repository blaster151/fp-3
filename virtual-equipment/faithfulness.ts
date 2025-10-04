import type {
  Equipment2Cell,
  EquipmentFrame,
  EquipmentRestrictionResult,
  EquipmentVerticalBoundary,
  RepresentabilityWitness,
  VirtualEquipment,
} from "./virtual-equipment";
import {
  defaultObjectEquality,
  identityProarrow,
  isIdentityVerticalBoundary,
} from "./virtual-equipment";
import type {
  Tight1Cell,
  TightCategory,
} from "./tight-primitives";
import type { RightExtensionData, RightLiftData } from "./extensions";
import type { LeftExtensionFromColimitData } from "./limits";

type ObjectEquality<Obj> = (left: Obj, right: Obj) => boolean;

type RestrictionOrientation = "left" | "right";

interface RestrictionExpectation<Obj, Arr, Payload, Evidence> {
  readonly orientation: RestrictionOrientation;
  readonly result: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>;
  readonly domain: Obj;
  readonly codomain: Obj;
}

const validateRestriction = <Obj, Arr, Payload, Evidence>(
  equality: ObjectEquality<Obj>,
  orientation: RestrictionOrientation,
  restriction: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>,
  domain: Obj,
  codomain: Obj,
  issues: string[],
): void => {
  const label = orientation === "left" ? "Left restriction" : "Right restriction";

  if (!equality(restriction.restricted.from, domain)) {
    issues.push(
      `${label} should originate at ${String(domain)} but found ${String(
        restriction.restricted.from,
      )}.`,
    );
  }

  if (!equality(restriction.restricted.to, codomain)) {
    issues.push(
      `${label} should land at ${String(codomain)} but found ${String(
        restriction.restricted.to,
      )}.`,
    );
  }

  if (restriction.cartesian.boundary.direction !== orientation) {
    issues.push(`${label} cartesian boundary should be oriented ${orientation}.`);
  }
};

const validateRepresentability = <Obj, Arr>(
  witness: RepresentabilityWitness<Obj, Arr> | undefined,
  orientation: RestrictionOrientation,
  issues: string[],
): void => {
  if (!witness) {
    issues.push(
      `Restriction should yield a representability witness oriented ${orientation} for a fully faithful tight 1-cell.`,
    );
    return;
  }

  if (witness.orientation !== orientation) {
    issues.push(
      `Representability witness should be oriented ${orientation} but found ${witness.orientation}.`,
    );
  }
};

const framesCoincide = <Obj, Payload>(
  equality: ObjectEquality<Obj>,
  candidate: EquipmentFrame<Obj, Payload>,
  expected: EquipmentFrame<Obj, Payload>,
  label: string,
  issues: string[],
): void => {
  if (!equality(candidate.leftBoundary, expected.leftBoundary)) {
    issues.push(
      `${label} should start at ${String(expected.leftBoundary)} but found ${String(
        candidate.leftBoundary,
      )}.`,
    );
  }
  if (!equality(candidate.rightBoundary, expected.rightBoundary)) {
    issues.push(
      `${label} should end at ${String(expected.rightBoundary)} but found ${String(
        candidate.rightBoundary,
      )}.`,
    );
  }
  if (candidate.arrows.length !== expected.arrows.length) {
    issues.push(
      `${label} should list ${expected.arrows.length} loose arrows but found ${candidate.arrows.length}.`,
    );
    return;
  }
  for (let index = 0; index < expected.arrows.length; index += 1) {
    const expectedArrow = expected.arrows[index];
    const candidateArrow = candidate.arrows[index];
    if (!equality(candidateArrow.from, expectedArrow.from)) {
      issues.push(
        `${label} arrow ${index} should begin at ${String(expectedArrow.from)} but found ${String(
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

export interface FullyFaithfulInput<Obj, Arr> {
  readonly tight: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly domain: Obj;
  readonly codomain: Obj;
}

export interface FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness?: {
    readonly left: RestrictionExpectation<Obj, Arr, Payload, Evidence>;
    readonly right: RestrictionExpectation<Obj, Arr, Payload, Evidence>;
  };
}

export const analyzeFullyFaithfulTight1Cell = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: FullyFaithfulInput<Obj, Arr>,
): FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence> => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const identityCodomain = identityProarrow(equipment, data.codomain);
  const identityDomain = identityProarrow(equipment, data.domain);

  const leftRestriction = equipment.restrictions.left(data.tight, identityCodomain);
  if (!leftRestriction) {
    issues.push(
      "Fully faithful tight 1-cells should admit the left restriction B(f,1) of the identity loose arrow (Definition 3.27).",
    );
  }

  const rightRestriction = equipment.restrictions.right(identityDomain, data.tight);
  if (!rightRestriction) {
    issues.push(
      "Fully faithful tight 1-cells should admit the right restriction B(1,f) of the identity loose arrow (Definition 3.27).",
    );
  }

  if (leftRestriction) {
    validateRestriction(equality, "left", leftRestriction, data.domain, data.codomain, issues);
    validateRepresentability(leftRestriction.representability, "left", issues);
    const rightBoundary = leftRestriction.cartesian.boundaries.right;
    if (!isIdentityVerticalBoundary(equipment, data.codomain, rightBoundary)) {
      issues.push(
        "Left restriction should keep the codomain boundary an identity vertical cell on the codomain object.",
      );
    }
  }

  if (rightRestriction) {
    validateRestriction(equality, "right", rightRestriction, data.domain, data.codomain, issues);
    validateRepresentability(rightRestriction.representability, "right", issues);
    const leftBoundary = rightRestriction.cartesian.boundaries.left;
    if (!isIdentityVerticalBoundary(equipment, data.domain, leftBoundary)) {
      issues.push(
        "Right restriction should keep the domain boundary an identity vertical cell on the domain object.",
      );
    }
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Identity restrictions exhibit the companion and conjoint required for a fully faithful tight 1-cell (Definition 3.27)."
        : `Fully faithful analysis issues: ${issues.join("; ")}`,
    witness:
      issues.length === 0 && leftRestriction && rightRestriction
        ? {
            left: {
              orientation: "left",
              result: leftRestriction,
              domain: data.domain,
              codomain: data.codomain,
            },
            right: {
              orientation: "right",
              result: rightRestriction,
              domain: data.domain,
              codomain: data.codomain,
            },
          }
        : undefined,
  };
};

export interface PointwiseLeftExtensionLiftInput<Obj, Arr, Payload, Evidence> {
  readonly extension: LeftExtensionFromColimitData<Obj, Arr, Payload, Evidence>;
  readonly lift: RightLiftData<Obj, Arr, Payload, Evidence>;
}

export interface PointwiseLeftExtensionLiftAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const analyzePointwiseLeftExtensionLiftCorrespondence = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  input: PointwiseLeftExtensionLiftInput<Obj, Arr, Payload, Evidence>,
): PointwiseLeftExtensionLiftAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const { extension } = input.extension;
  const lift = input.lift;

  if (!equality(extension.loose.from, lift.loose.from)) {
    issues.push(
      `Pointwise left extension loose arrow should match the loose arrow used for the lift; expected ${String(
        extension.loose.from,
      )} but found ${String(lift.loose.from)}.`,
    );
  }

  if (!equality(extension.loose.to, lift.loose.to)) {
    issues.push(
      `Pointwise left extension loose codomain should match the lift codomain; expected ${String(
        extension.loose.to,
      )} but found ${String(lift.loose.to)}.`,
    );
  }

  if (extension.along !== lift.along) {
    issues.push("Pointwise left extension and lift should use the same tight 1-cell j (Proposition 3.26).");
  }

  framesCoincide(
    equality,
    lift.unit.target,
    extension.counit.source,
    "Left lift unit target",
    issues,
  );

  framesCoincide(
    equality,
    lift.unit.source,
    extension.counit.target,
    "Left lift unit source",
    issues,
  );

  const leftBoundaryMatches = equality(
    lift.unit.boundaries.left.from,
    extension.counit.boundaries.left.from,
  );
  if (!leftBoundaryMatches) {
    issues.push("Left lift unit left boundary should agree with the left extension counit's boundary (Proposition 3.26)." );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Left lift unit and left extension counit share framing data, reflecting Proposition 3.26."
        : `Pointwise left extension/left lift issues: ${issues.join("; ")}`,
  };
};

const boundariesCoincide = <Obj, Arr>(
  equality: ObjectEquality<Obj>,
  candidate: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
): boolean =>
  equality(candidate.from, expected.from) && equality(candidate.to, expected.to);

export interface FullyFaithfulLeftExtensionInput<Obj, Arr, Payload, Evidence> {
  readonly fullyFaithful: FullyFaithfulInput<Obj, Arr>;
  readonly extension: RightExtensionData<Obj, Arr, Payload, Evidence>;
  readonly inverse: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface FullyFaithfulLeftExtensionAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const analyzeFullyFaithfulLeftExtension = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  input: FullyFaithfulLeftExtensionInput<Obj, Arr, Payload, Evidence>,
): FullyFaithfulLeftExtensionAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const fullyFaithful = analyzeFullyFaithfulTight1Cell(equipment, input.fullyFaithful);
  if (!fullyFaithful.holds) {
    issues.push(
      "Fully faithful witness failed the restriction checks; Lemma 3.29 requires fully faithful boundaries before proving invertibility.",
    );
    issues.push(...fullyFaithful.issues);
  }

  const { extension, inverse } = input;

  if (extension.along !== input.fullyFaithful.tight) {
    issues.push("Left extension should be computed along the fully faithful tight 1-cell j (Lemma 3.29)." );
  }

  if (!equality(extension.loose.from, input.fullyFaithful.domain)) {
    issues.push(
      `Left extension loose domain should equal the fully faithful domain ${String(
        input.fullyFaithful.domain,
      )}; found ${String(extension.loose.from)} instead.`,
    );
  }

  if (!equality(extension.loose.to, input.fullyFaithful.codomain)) {
    issues.push(
      `Left extension loose codomain should equal the fully faithful codomain ${String(
        input.fullyFaithful.codomain,
      )}; found ${String(extension.loose.to)} instead.`,
    );
  }

  framesCoincide(
    equality,
    inverse.source,
    extension.counit.target,
    "Proposed inverse source",
    issues,
  );

  framesCoincide(
    equality,
    inverse.target,
    extension.counit.source,
    "Proposed inverse target",
    issues,
  );

  if (
    !boundariesCoincide(
      equality,
      inverse.boundaries.left,
      extension.counit.boundaries.left,
    ) ||
    !boundariesCoincide(
      equality,
      inverse.boundaries.right,
      extension.counit.boundaries.right,
    )
  ) {
    issues.push(
      "Inverse 2-cell should share the same vertical boundaries as the extension counit to witness an isomorphism (Lemma 3.29).",
    );
  }

  const composeDown = equipment.cells.verticalCompose(inverse, extension.counit);
  if (!composeDown) {
    issues.push(
      "Vertical composite of the counit followed by its proposed inverse should exist, mirroring the identity composite in Lemma 3.29.",
    );
  }

  const composeUp = equipment.cells.verticalCompose(extension.counit, inverse);
  if (!composeUp) {
    issues.push(
      "Vertical composite of the inverse followed by the counit should exist, mirroring the dual identity composite in Lemma 3.29.",
    );
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Left extension counit is invertible with the supplied inverse, matching Lemma 3.29's conclusion for fully faithful j."
        : `Fully faithful left extension issues: ${issues.join("; ")}`,
  };
};
