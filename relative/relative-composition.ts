import type { EquipmentVerticalBoundary, VirtualEquipment } from "../virtual-equipment";
import {
  defaultObjectEquality,
  verticalBoundariesEqual,
} from "../virtual-equipment";
import type { LooseMonoidData, LooseMonoidShapeReport } from "../virtual-equipment/loose-structures";
import { analyzeLooseMonoidShape } from "../virtual-equipment/loose-structures";
import type { RelativeAdjunctionData } from "./relative-adjunctions";
import type { RelativeMonadData } from "./relative-monads";
import { analyzeRelativeMonadFraming } from "./relative-monads";

export interface RelativeAdjunctionCompositionInput<Obj, Arr, Payload, Evidence> {
  readonly first: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
  readonly second: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeAdjunctionCompositionReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

const composeTightBoundary = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  upper: EquipmentVerticalBoundary<Obj, Arr>,
  lower: EquipmentVerticalBoundary<Obj, Arr>,
): EquipmentVerticalBoundary<Obj, Arr> => ({
  from: lower.from,
  to: upper.to,
  tight: equipment.tight.compose(upper.tight, lower.tight),
  details: "Composite tight 1-cell induced by consecutive relative adjunction boundaries.",
});

export const analyzeRelativeAdjunctionComposition = <Obj, Arr, Payload, Evidence>(
  input: RelativeAdjunctionCompositionInput<Obj, Arr, Payload, Evidence>,
): RelativeAdjunctionCompositionReport => {
  const { first, second } = input;
  if (first.equipment !== second.equipment) {
    return {
      holds: false,
      issues: ["Relative adjunctions must inhabit the same virtual equipment to compose."],
      details: "Relative adjunctions reference distinct equipment instances.",
    };
  }
  const equipment = first.equipment;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!verticalBoundariesEqual(equality, first.right, second.root)) {
    issues.push("First adjunction's right leg must match the second adjunction's root j.");
  }

  if (!equality(first.left.to, second.left.from)) {
    issues.push("Intermediate category C should agree between ℓ₁ : A → C and ℓ₂ : C → D to compose left legs.");
  }

  if (!equality(first.right.to, second.right.from)) {
    issues.push("Right leg codomain of the first adjunction must supply the domain for the second right leg.");
  }

  if (issues.length > 0) {
    return {
      holds: false,
      issues,
      details: `Relative adjunction composition issues: ${issues.join("; ")}`,
    };
  }

  const compositeLeft = composeTightBoundary(equipment, second.left, first.left);
  const compositeRight = composeTightBoundary(equipment, second.right, first.right);
  const details =
    `Relative adjunctions compose with left leg ${compositeLeft.details ?? "composition"}` +
    ` and right leg ${compositeRight.details ?? "composition"}.`;

  return {
    holds: true,
    issues: [],
    details,
  };
};

export interface RelativeMonadCompositionInput<Obj, Arr, Payload, Evidence> {
  readonly first: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly second: RelativeMonadData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeMonadCompositionReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export const analyzeRelativeMonadComposition = <Obj, Arr, Payload, Evidence>(
  input: RelativeMonadCompositionInput<Obj, Arr, Payload, Evidence>,
): RelativeMonadCompositionReport => {
  const { first, second } = input;
  if (first.equipment !== second.equipment) {
    return {
      holds: false,
      issues: ["Relative monads must inhabit the same equipment to compose."],
      details: "Relative monads reference distinct equipment instances.",
    };
  }
  const equipment = first.equipment;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!verticalBoundariesEqual(equality, first.carrier, second.root)) {
    issues.push("Carrier of the first relative monad must coincide with the root of the second to compose extensions.");
  }

  if (!equality(first.looseCell.to, second.looseCell.from)) {
    issues.push("Loose arrows must align so the composite extension is defined.");
  }

  if (issues.length > 0) {
    return {
      holds: false,
      issues,
      details: `Relative monad composition issues: ${issues.join("; ")}`,
    };
  }

  const firstFraming = analyzeRelativeMonadFraming(first);
  const secondFraming = analyzeRelativeMonadFraming(second);
  const holds = firstFraming.holds && secondFraming.holds;

  return {
    holds,
    issues: holds ? [] : [...firstFraming.issues, ...secondFraming.issues],
    details: holds
      ? "Relative monads exhibit compatible framing data to admit composition."
      : `Relative monads must satisfy framing conditions before composing: ${[
          ...firstFraming.issues,
          ...secondFraming.issues,
        ].join("; ")}`,
  };
};

export interface RelativeMonadLooseMonoidBridgeReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly looseMonoidReport: LooseMonoidShapeReport;
}

export const relativeMonadFromLooseMonoid = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  root: EquipmentVerticalBoundary<Obj, Arr>,
  carrier: EquipmentVerticalBoundary<Obj, Arr>,
  looseMonoid: LooseMonoidData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLooseMonoidBridgeReport & { readonly data: RelativeMonadData<Obj, Arr, Payload, Evidence> } => {
  const looseMonoidReport = analyzeLooseMonoidShape(equipment, looseMonoid);
  const data: RelativeMonadData<Obj, Arr, Payload, Evidence> = {
    equipment,
    root,
    carrier,
    looseCell: looseMonoid.looseCell,
    extension: looseMonoid.multiplication,
    unit: looseMonoid.unit,
  };
  const framing = analyzeRelativeMonadFraming(data);
  const holds = looseMonoidReport.holds && framing.holds;
  const issues = [...looseMonoidReport.issues, ...framing.issues];
  return {
    holds,
    issues,
    details: holds
      ? "Loose monoid realises a relative monad via the representation theorem."
      : `Loose monoid to relative monad conversion issues: ${issues.join("; ")}`,
    looseMonoidReport,
    data,
  };
};

export const relativeMonadToLooseMonoid = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): LooseMonoidData<Obj, Arr, Payload, Evidence> => ({
  object: data.root.from,
  looseCell: data.looseCell,
  multiplication: data.extension,
  unit: data.unit,
});
