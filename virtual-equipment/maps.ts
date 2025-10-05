import type {
  Equipment2Cell,
  EquipmentFrame,
  EquipmentProarrow,
  RepresentabilityWitness,
  VirtualEquipment,
} from "./virtual-equipment";
import {
  defaultObjectEquality,
  frameFromSequence,
} from "./virtual-equipment";

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
      `${label} should contain ${expected.arrows.length} arrows to mirror the loose composite shape.`,
    );
    return;
  }
  for (let index = 0; index < expected.arrows.length; index += 1) {
    const expectedArrow = expected.arrows[index];
    const candidateArrow = candidate.arrows[index];
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

export interface LooseAdjunctionData<Obj, Arr, Payload, Evidence> {
  readonly left: EquipmentProarrow<Obj, Payload>;
  readonly right: EquipmentProarrow<Obj, Payload>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly counit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly rightRepresentability?: RepresentabilityWitness<Obj, Arr>;
}

export interface LooseAdjunctionAnalysis<Obj, Arr> {
  readonly holds: boolean;
  readonly leftIsMap: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly rightRepresentability?: RepresentabilityWitness<Obj, Arr>;
  readonly details: string;
}

export const analyzeLooseAdjunction = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: LooseAdjunctionData<Obj, Arr, Payload, Evidence>,
): LooseAdjunctionAnalysis<Obj, Arr> => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const expectedUnitTarget = frameFromSequence(
    [data.right, data.left],
    data.left.from,
    data.right.to,
  );
  framesCoincide(
    equality,
    data.unit.target,
    expectedUnitTarget,
    issues,
    "Unit target",
  );

  const expectedCounitSource = frameFromSequence(
    [data.left, data.right],
    data.left.from,
    data.right.to,
  );
  framesCoincide(
    equality,
    data.counit.source,
    expectedCounitSource,
    issues,
    "Counit source",
  );

  if (!equality(data.unit.source.leftBoundary, data.left.from)) {
    issues.push("Unit source should begin at the domain of the left loose adjoint.");
  }
  if (!equality(data.unit.source.rightBoundary, data.left.from)) {
    issues.push("Unit source right boundary should equal the domain of the left loose adjoint.");
  }
  if (!equality(data.counit.target.leftBoundary, data.right.to)) {
    issues.push("Counit target left boundary should equal the codomain of the right loose adjoint.");
  }
  if (!equality(data.counit.target.rightBoundary, data.right.to)) {
    issues.push("Counit target right boundary should equal the codomain of the right loose adjoint.");
  }

  const representability = data.rightRepresentability;
  const leftIsMap = representability !== undefined;

  return {
    holds: issues.length === 0,
    leftIsMap,
    issues,
    ...(representability !== undefined && { rightRepresentability: representability }),
    details:
      issues.length === 0
        ? representability
          ? "Loose adjunction aligns with Definition 2.21: representable right leg certifies the left loose map."
          : "Loose adjunction passes framing checks, but no representability witness was supplied for the right leg."
        : `Loose adjunction framing issues: ${issues.join("; ")}`,
  };
};
