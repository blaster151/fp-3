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
  identityProarrow,
  isIdentityVerticalBoundary,
} from "./virtual-equipment";

export interface LooseMonoidData<Obj, Arr, Payload, Evidence> {
  readonly object: Obj;
  readonly looseCell: EquipmentProarrow<Obj, Payload>;
  readonly multiplication: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export type LooseMonadData<Obj, Arr, Payload, Evidence> = LooseMonoidData<
  Obj,
  Arr,
  Payload,
  Evidence
>;

export interface LooseMonoidShapeReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

const frameMatchesLooseCell = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  looseCell: EquipmentProarrow<Obj, Payload>,
  frame: EquipmentFrame<Obj, Payload>,
  label: string,
  issues: string[],
): void => {
  if (frame.arrows.length !== 1) {
    issues.push(
      `${label} should consist of exactly one loose arrow matching the chosen loose cell.`,
    );
    return;
  }
  const [arrow] = frame.arrows;
  if (!arrow) {
    issues.push(`${label} frame unexpectedly has no arrows.`);
  } else if (!equality(arrow.from, looseCell.from) || !equality(arrow.to, looseCell.to)) {
    issues.push(`${label} arrow endpoints must match the loose cell's object.`);
  }
};

const boundariesMatchIdentity = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
  boundary: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
  issues: string[],
): void => {
  if (!isIdentityVerticalBoundary(equipment, object, boundary)) {
    issues.push(`${label} must be witnessed by the identity tight 1-cell on the loose object's boundary.`);
  }
};

const checkMultiplicationFrame = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  looseCell: EquipmentProarrow<Obj, Payload>,
  multiplication: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  issues: string[],
): void => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  if (multiplication.source.arrows.length !== 2) {
    issues.push("Loose monad multiplication must start from a composable pair of the loose arrow.");
  } else {
    const [first, second] = multiplication.source.arrows;
    if (!first || !second) {
      issues.push("Loose monad multiplication source should have exactly two arrows.");
    } else {
      if (!equality(first.from, looseCell.from)) {
        issues.push("The first loose arrow in the multiplication source must start at the loose object's domain.");
      }
      if (!equality(first.to, second.from)) {
        issues.push("Loose monad multiplication source arrows must be composable.");
      }
      if (!equality(second.to, looseCell.to)) {
        issues.push("The second loose arrow in the multiplication source must end at the loose object's codomain.");
      }
    }
  }

  if (!equality(multiplication.source.leftBoundary, looseCell.from)) {
    issues.push("Multiplication source left boundary must equal the loose object's domain.");
  }
  if (!equality(multiplication.source.rightBoundary, looseCell.to)) {
    issues.push("Multiplication source right boundary must equal the loose object's codomain.");
  }

  frameMatchesLooseCell(
    equality,
    looseCell,
    multiplication.target,
    "Multiplication target",
    issues,
  );

  boundariesMatchIdentity(
    equipment,
    looseCell.from,
    multiplication.boundaries.left,
    "Multiplication left boundary",
    issues,
  );
  boundariesMatchIdentity(
    equipment,
    looseCell.to,
    multiplication.boundaries.right,
    "Multiplication right boundary",
    issues,
  );
};

const checkUnitFrame = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  looseCell: EquipmentProarrow<Obj, Payload>,
  unit: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  issues: string[],
): void => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const identityFrame = frameFromProarrow(identityProarrow(equipment, looseCell.from));

  if (unit.source.arrows.length !== identityFrame.arrows.length) {
    issues.push("Loose monad unit must originate from the identity loose arrow on the object.");
  }
  if (!equality(unit.source.leftBoundary, identityFrame.leftBoundary)) {
    issues.push("Unit source left boundary must equal the loose object's domain.");
  }
  if (!equality(unit.source.rightBoundary, identityFrame.rightBoundary)) {
    issues.push("Unit source right boundary must equal the loose object's codomain.");
  }

  frameMatchesLooseCell(equality, looseCell, unit.target, "Unit target", issues);

  boundariesMatchIdentity(
    equipment,
    looseCell.from,
    unit.boundaries.left,
    "Unit left boundary",
    issues,
  );
  boundariesMatchIdentity(
    equipment,
    looseCell.to,
    unit.boundaries.right,
    "Unit right boundary",
    issues,
  );
};

export const analyzeLooseMonoidShape = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  candidate: LooseMonoidData<Obj, Arr, Payload, Evidence>,
): LooseMonoidShapeReport => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(candidate.looseCell.from, candidate.object)) {
    issues.push("Loose cell must start at the chosen loose object.");
  }
  if (!equality(candidate.looseCell.to, candidate.object)) {
    issues.push("Loose cell must end at the chosen loose object.");
  }

  checkMultiplicationFrame(equipment, candidate.looseCell, candidate.multiplication, issues);
  checkUnitFrame(equipment, candidate.looseCell, candidate.unit, issues);

  return {
    holds: issues.length === 0,
    issues,
    details:
      issues.length === 0
        ? "Loose monoid satisfies the expected unit and multiplication framing constraints."
        : `Loose monoid framing issues: ${issues.join("; ")}`,
  };
};

export const analyzeLooseMonadShape = analyzeLooseMonoidShape;
