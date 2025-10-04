import type {
  Equipment2Cell,
  EquipmentProarrow,
  EquipmentVerticalBoundary,
  RepresentabilityWitness,
  VirtualEquipment,
} from "../virtual-equipment";
import {
  defaultObjectEquality,
  frameFromProarrow,
  identityProarrow,
  identityVerticalBoundary,
  isIdentityVerticalBoundary,
  verticalBoundariesEqual,
} from "../virtual-equipment";

export interface RelativeComonadData<Obj, Arr, Payload, Evidence> {
  readonly equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>;
  readonly root: EquipmentVerticalBoundary<Obj, Arr>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly looseCell: EquipmentProarrow<Obj, Payload>;
  readonly coextension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly counit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RelativeComonadFramingReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeComonadCorepresentabilityReport<Obj, Arr> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly framing: RelativeComonadFramingReport;
  readonly representability: RepresentabilityWitness<Obj, Arr>;
}

export interface RelativeComonadIdentityReductionReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

const boundariesMatch = <Obj, Arr>(
  equality: (left: Obj, right: Obj) => boolean,
  actual: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
  issues: string[],
): void => {
  if (!verticalBoundariesEqual(equality, actual, expected)) {
    issues.push(`${label} must equal the designated tight boundary.`);
  }
};

const frameMatchesLooseCell = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  frame: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>> },
  looseCell: EquipmentProarrow<Obj, Payload>,
  label: string,
  issues: string[],
): void => {
  if (frame.arrows.length !== 1) {
    issues.push(`${label} should consist of exactly one loose arrow matching C(j,t).`);
    return;
  }
  const [arrow] = frame.arrows;
  if (!equality(arrow.from, looseCell.from) || !equality(arrow.to, looseCell.to)) {
    issues.push(`${label} arrow must share the loose cell's endpoints.`);
  }
};

export const analyzeRelativeComonadFraming = <Obj, Arr, Payload, Evidence>(
  data: RelativeComonadData<Obj, Arr, Payload, Evidence>,
): RelativeComonadFramingReport => {
  const { equipment, root, carrier, looseCell, coextension, counit } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(root.from, carrier.from) || !equality(root.to, carrier.to)) {
    issues.push("Root j and carrier t must share domain and codomain.");
  }
  if (!equality(looseCell.from, carrier.from) || !equality(looseCell.to, root.to)) {
    issues.push("Underlying loose cell C(t,j) must run from dom(t) to cod(j).");
  }

  frameMatchesLooseCell(
    equality,
    coextension.target,
    looseCell,
    "Coextension target",
    issues,
  );
  frameMatchesLooseCell(equality, counit.target, looseCell, "Counit target", issues);

  if (!equality(coextension.source.leftBoundary, carrier.from)) {
    issues.push("Coextension source left boundary must equal dom(t).");
  }
  if (!equality(coextension.source.rightBoundary, root.to)) {
    issues.push("Coextension source right boundary must equal cod(j).");
  }
  if (!equality(counit.source.leftBoundary, carrier.from)) {
    issues.push("Counit source left boundary must equal dom(t).");
  }
  if (!equality(counit.source.rightBoundary, carrier.to)) {
    issues.push("Counit source right boundary must equal cod(t) = cod(j).");
  }

  boundariesMatch(equality, coextension.boundaries.left, carrier, "Coextension left boundary", issues);
  boundariesMatch(equality, coextension.boundaries.right, root, "Coextension right boundary", issues);
  boundariesMatch(equality, counit.boundaries.left, carrier, "Counit left boundary", issues);
  boundariesMatch(equality, counit.boundaries.right, root, "Counit right boundary", issues);

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Relative comonad counit and coextension 2-cells have compatible framing with the chosen root and carrier."
      : `Relative comonad framing issues: ${issues.join("; ")}`,
  };
};

export const describeTrivialRelativeComonad = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
): RelativeComonadData<Obj, Arr, Payload, Evidence> => {
  const root = identityVerticalBoundary(
    equipment,
    object,
    "Trivial relative comonad root chosen as the identity tight 1-cell.",
  );
  const carrier = identityVerticalBoundary(
    equipment,
    object,
    "Trivial relative comonad carrier equals the identity tight 1-cell.",
  );
  const looseCell = identityProarrow(equipment, object);
  const frame = frameFromProarrow(looseCell);
  const boundaries = { left: carrier, right: root } as const;
  const evidence = equipment.cells.identity(frame, boundaries);
  const counit: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: frame,
    target: frame,
    boundaries,
    evidence,
  };
  return {
    equipment,
    root,
    carrier,
    looseCell,
    coextension: counit,
    counit,
  };
};

export const analyzeRelativeComonadCorepresentability = <Obj, Arr, Payload, Evidence>(
  data: RelativeComonadData<Obj, Arr, Payload, Evidence>,
  witness: RepresentabilityWitness<Obj, Arr>,
): RelativeComonadCorepresentabilityReport<Obj, Arr> => {
  const framing = analyzeRelativeComonadFraming(data);
  const issues = [...framing.issues];
  const equality = data.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (witness.orientation !== "right") {
    issues.push(
      "Corepresentability witness must arise from a right restriction B(1,j) to align with the dual of Theorem 4.16.",
    );
  }

  if (!equality(witness.object, data.root.to)) {
    issues.push("Corepresentability witness object must match the codomain of the root j.");
  }

  if (witness.tight !== data.root.tight) {
    issues.push("Corepresentability witness must reuse the root tight 1-cell when restricting the identity.");
  }

  if (!equality(data.looseCell.to, data.root.to)) {
    issues.push("Relative comonad loose arrow should end at the codomain certified by the corepresentability witness.");
  }

  const holds = issues.length === 0 && framing.holds;
  return {
    holds,
    issues,
    details: holds
      ? "Relative comonad is corepresentable by a right restriction witness."
      : `Relative comonad corepresentability issues: ${issues.join("; ")}`,
    framing,
    representability: witness,
  };
};

export const analyzeRelativeComonadIdentityReduction = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: RelativeComonadData<Obj, Arr, Payload, Evidence>,
): RelativeComonadIdentityReductionReport => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!isIdentityVerticalBoundary(equipment, data.root.from, data.root)) {
    issues.push("Root must be the identity tight 1-cell to recover an ordinary comonad.");
  }
  if (!isIdentityVerticalBoundary(equipment, data.carrier.from, data.carrier)) {
    issues.push("Carrier must be the identity tight 1-cell when reducing to a classical comonad.");
  }

  if (!equality(data.looseCell.from, data.root.from) || !equality(data.looseCell.to, data.root.to)) {
    issues.push("Underlying loose arrow must be an endoproarrow on the identity object.");
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Relative comonad collapses to an ordinary comonad along the identity root."
      : `Relative comonad identity reduction issues: ${issues.join("; ")}`,
  };
};
