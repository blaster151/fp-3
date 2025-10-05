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
  identityVerticalBoundary,
} from "./virtual-equipment";

export interface LooseSkewMultimorphism<Obj, Arr, Payload, Evidence> {
  readonly cell: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly label?: string;
}

export interface LooseSkewCompositionAnalysis {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

const proarrowMatches = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  expected: EquipmentProarrow<Obj, Payload>,
  actual: EquipmentProarrow<Obj, Payload>,
): boolean =>
  equality(expected.from, actual.from) && equality(expected.to, actual.to);

const frameHasSingleArrowMatching = <Obj, Arr, Payload, Evidence>(
  equality: (left: Obj, right: Obj) => boolean,
  frame: EquipmentFrame<Obj, Payload>,
  arrow: EquipmentProarrow<Obj, Payload>,
  issues: string[],
  label: string,
): void => {
  if (frame.arrows.length !== 1) {
    issues.push(`${label} should be a singleton frame matching the loose arrow being substituted.`);
    return;
  }
  const [candidate] = frame.arrows;
  if (!candidate) {
    issues.push(`${label} unexpectedly has no arrows.`);
  } else if (!proarrowMatches(equality, arrow, candidate)) {
    issues.push(`${label} must share endpoints with the substituted loose arrow.`);
  }
};

const boundaryAlignsWithArrow = <Obj, Arr>(
  equality: (left: Obj, right: Obj) => boolean,
  boundary: EquipmentVerticalBoundary<Obj, Arr>,
  arrow: EquipmentProarrow<Obj, unknown>,
  orientation: "left" | "right",
  issues: string[],
): void => {
  const expected = orientation === "left" ? arrow.from : arrow.to;
  if (!equality(boundary.from, expected) || !equality(boundary.to, expected)) {
    issues.push(
      `${orientation === "left" ? "Left" : "Right"} boundary must restrict to the identity on the loose arrow's ${
        orientation === "left" ? "domain" : "codomain"
      }.`,
    );
  }
};

export const analyzeLooseSkewComposition = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  outer: LooseSkewMultimorphism<Obj, Arr, Payload, Evidence>,
  inners: ReadonlyArray<LooseSkewMultimorphism<Obj, Arr, Payload, Evidence>>,
): LooseSkewCompositionAnalysis => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const { cell: outerCell } = outer;
  if (outerCell.source.arrows.length !== inners.length) {
    issues.push("Outer multimorphism must provide a substitution slot for each inner multimorphism.");
  }

  outerCell.source.arrows.forEach((arrow, index) => {
    const inner = inners[index];
    if (!inner) {
      return;
    }
    const innerCell = inner.cell;

    frameHasSingleArrowMatching(
      equality,
      innerCell.target,
      arrow,
      issues,
      `Target frame of inner multimorphism ${index}`,
    );

    frameHasSingleArrowMatching(
      equality,
      innerCell.source,
      arrow,
      issues,
      `Source frame of inner multimorphism ${index}`,
    );

    boundaryAlignsWithArrow(equality, innerCell.boundaries.left, arrow, "left", issues);
    boundaryAlignsWithArrow(equality, innerCell.boundaries.right, arrow, "right", issues);
  });

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details:
      holds
        ? "Loose skew-multicategory substitution aligns each inner multimorphism with its outer slot."
        : `Loose skew-multicategory substitution issues: ${issues.join("; ")}`,
  };
};

export const describeIdentityLooseMultimorphism = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
): LooseSkewMultimorphism<Obj, Arr, Payload, Evidence> => {
  const loose = identityProarrow(equipment, object);
  const frame = frameFromProarrow(loose);
  const boundary = identityVerticalBoundary(
    equipment,
    object,
    "Identity multimorphism boundary induced by the object.",
  );
  return {
    cell: {
      source: frame,
      target: frame,
      boundaries: { left: boundary, right: boundary },
      evidence: equipment.cells.identity(frame, { left: boundary, right: boundary }),
    },
    label: `id_${String(object)}`,
  };
};
