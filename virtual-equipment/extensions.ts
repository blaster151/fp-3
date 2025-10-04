import type {
  Equipment2Cell,
  EquipmentFrame,
  EquipmentProarrow,
  EquipmentVerticalBoundary,
  VirtualEquipment,
} from "./virtual-equipment";
import {
  defaultObjectEquality,
  frameFromProarrow,
} from "./virtual-equipment";
import type { Tight1Cell, TightCategory } from "./tight-primitives";

const framesCoincide = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  candidate: EquipmentFrame<Obj, Payload>,
  expected: EquipmentFrame<Obj, Payload>,
  issues: string[],
  label: string,
): void => {
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
      `${label} should contain ${expected.arrows.length} arrows to mirror the expected composite shape.`,
    );
    return;
  }
  for (let index = 0; index < expected.arrows.length; index += 1) {
    const expectedArrow = expected.arrows[index];
    const candidateArrow = candidate.arrows[index];
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

const boundaryMatchesObject = <Obj, Arr, Payload, Evidence>(
  equality: (left: Obj, right: Obj) => boolean,
  boundary: EquipmentVerticalBoundary<Obj, Arr>,
  object: Obj,
  label: string,
  issues: string[],
): void => {
  if (!equality(boundary.from, object) || !equality(boundary.to, object)) {
    issues.push(
      `${label} should be the identity vertical boundary on ${String(object)}; found ${String(
        boundary.from,
      )} → ${String(boundary.to)} instead.`,
    );
  }
};

export interface RightExtensionData<Obj, Arr, Payload, Evidence> {
  readonly loose: EquipmentProarrow<Obj, Payload>;
  readonly along: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly extension: EquipmentProarrow<Obj, Payload>;
  readonly counit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RightExtensionAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const analyzeRightExtension = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: RightExtensionData<Obj, Arr, Payload, Evidence>,
): RightExtensionAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const expectedExtensionDomain = data.along.onObj(
    data.loose.from as unknown as Parameters<typeof data.along.onObj>[0],
  ) as Obj;

  if (!equality(expectedExtensionDomain, data.extension.from)) {
    issues.push(
      `Right extension should originate at ${String(
        expectedExtensionDomain,
      )} obtained by applying the tight leg to ${String(data.loose.from)}.`,
    );
  }

  if (!equality(data.loose.to, data.extension.to)) {
    issues.push(
      `Right extension codomain ${String(data.extension.to)} should equal the loose arrow codomain ${String(
        data.loose.to,
      )}.`,
    );
  }

  const expectedSource = frameFromProarrow(data.loose);
  framesCoincide(equality, data.counit.source, expectedSource, issues, "Right extension counit source");

  if (data.counit.target.arrows.length === 0) {
    issues.push("Right extension counit target should contain at least the extension arrow.");
  } else {
    const lastArrow = data.counit.target.arrows[data.counit.target.arrows.length - 1];
    if (!equality(lastArrow.from, data.extension.from)) {
      issues.push(
        `Right extension composite should reach ${String(data.extension.from)} before the extension arrow but found ${String(
          lastArrow.from,
        )}.`,
      );
    }
    if (!equality(lastArrow.to, data.extension.to)) {
      issues.push(
        `Right extension arrow should land at ${String(data.extension.to)} but found ${String(lastArrow.to)}.`,
      );
    }
  }

  boundaryMatchesObject(
    equality,
    data.counit.boundaries.left,
    data.loose.from,
    "Right extension left vertical boundary",
    issues,
  );
  boundaryMatchesObject(
    equality,
    data.counit.boundaries.right,
    data.loose.to,
    "Right extension right vertical boundary",
    issues,
  );

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Right extension counit passes the framing checks implied by Definition 3.2."
        : `Right extension framing issues: ${issues.join("; ")}`,
  };
};

export interface RightLiftData<Obj, Arr, Payload, Evidence> {
  readonly loose: EquipmentProarrow<Obj, Payload>;
  readonly along: Tight1Cell<
    TightCategory<Obj, Arr>,
    TightCategory<Obj, Arr>
  >;
  readonly lift: EquipmentProarrow<Obj, Payload>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RightLiftAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const analyzeRightLift = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: RightLiftData<Obj, Arr, Payload, Evidence>,
): RightLiftAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const expectedLiftDomain = data.along.onObj(
    data.loose.from as unknown as Parameters<typeof data.along.onObj>[0],
  ) as Obj;

  if (!equality(expectedLiftDomain, data.lift.from)) {
    issues.push(
      `Right lift should originate at ${String(
        expectedLiftDomain,
      )} obtained by applying the tight leg to ${String(data.loose.from)}.`,
    );
  }

  if (!equality(data.loose.to, data.lift.to)) {
    issues.push(
      `Right lift codomain ${String(data.lift.to)} should equal the loose arrow codomain ${String(
        data.loose.to,
      )}.`,
    );
  }

  const expectedTarget = frameFromProarrow(data.loose);
  framesCoincide(equality, data.unit.target, expectedTarget, issues, "Right lift unit target");

  if (data.unit.source.arrows.length === 0) {
    issues.push("Right lift unit source should contain the lift arrow.");
  } else {
    const lastArrow = data.unit.source.arrows[data.unit.source.arrows.length - 1];
    if (!equality(lastArrow.from, data.lift.from)) {
      issues.push(
        `Right lift composite should enter ${String(data.lift.from)} before the lift arrow but found ${String(
          lastArrow.from,
        )}.`,
      );
    }
    if (!equality(lastArrow.to, data.lift.to)) {
      issues.push(
        `Right lift arrow should land at ${String(data.lift.to)} but found ${String(lastArrow.to)}.`,
      );
    }
  }

  boundaryMatchesObject(
    equality,
    data.unit.boundaries.left,
    data.loose.from,
    "Right lift left vertical boundary",
    issues,
  );
  boundaryMatchesObject(
    equality,
    data.unit.boundaries.right,
    data.loose.to,
    "Right lift right vertical boundary",
    issues,
  );

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Right lift unit passes the framing checks implied by Definition 3.2."
        : `Right lift framing issues: ${issues.join("; ")}`,
  };
};

export interface RightExtensionLiftCompatibilityAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RightExtensionLiftCompatibilityInput<Obj, Arr, Payload, Evidence> {
  readonly extension: RightExtensionData<Obj, Arr, Payload, Evidence>;
  readonly lift: RightLiftData<Obj, Arr, Payload, Evidence>;
}

export const analyzeRightExtensionLiftCompatibility = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  input: RightExtensionLiftCompatibilityInput<Obj, Arr, Payload, Evidence>,
): RightExtensionLiftCompatibilityAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(input.extension.extension.from, input.lift.lift.from)) {
    issues.push(
      `Right extension domain ${String(
        input.extension.extension.from,
      )} should match the right lift domain ${String(input.lift.lift.from)} (Lemma 3.4).`,
    );
  }

  if (!equality(input.extension.extension.to, input.lift.lift.to)) {
    issues.push(
      `Right extension codomain ${String(
        input.extension.extension.to,
      )} should match the right lift codomain ${String(input.lift.lift.to)} (Lemma 3.4).`,
    );
  }

  const extensionTarget = input.extension.counit.target;
  const liftSource = input.lift.unit.source;
  if (extensionTarget.arrows.length > 0 && liftSource.arrows.length > 0) {
    const extComposite = extensionTarget.arrows.slice(0, -1);
    const liftComposite = liftSource.arrows.slice(0, -1);
    if (extComposite.length !== liftComposite.length) {
      issues.push(
        "The composites compared in Lemma 3.4 should share the same loose length before their terminal arrows.",
      );
    } else {
      for (let index = 0; index < extComposite.length; index += 1) {
        const extArrow = extComposite[index];
        const liftArrow = liftComposite[index];
        if (!equality(extArrow.from, liftArrow.from) || !equality(extArrow.to, liftArrow.to)) {
          issues.push(
            `Composite arrow ${index} differs between the right extension and right lift framing; expected identical endpoints per Lemma 3.4.`,
          );
          break;
        }
      }
    }
  }

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Right extension and right lift share matching domains, codomains, and composites, echoing Lemma 3.4."
        : `Right extension/right lift compatibility issues: ${issues.join("; ")}`,
  };
};
