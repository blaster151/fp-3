import type {
  AbsoluteColimitAnalysis,
  DensityAnalysis,
  Equipment2Cell,
  EquipmentProarrow,
  EquipmentVerticalBoundary,
  FullyFaithfulLeftExtensionAnalysis,
  LeftExtensionFromColimitAnalysis,
  LooseMonoidData,
  LooseMonoidShapeReport,
  PointwiseLeftExtensionLiftAnalysis,
  RepresentabilityWitness,
  VirtualEquipment,
} from "../virtual-equipment";
// TODO(relative-adjunctions): integrate with `RelativeAdjunctionData` once
// Definition 5.1 mate calculus is executable so `analyzeRelativeMonadFraming`
// can consume adjunction-derived data directly.
import {
  defaultObjectEquality,
  frameFromProarrow,
  identityProarrow,
  identityVerticalBoundary,
  isIdentityVerticalBoundary,
  verticalBoundariesEqual,
} from "../virtual-equipment";

export interface RelativeMonadData<Obj, Arr, Payload, Evidence> {
  readonly equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>;
  readonly root: EquipmentVerticalBoundary<Obj, Arr>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly looseCell: EquipmentProarrow<Obj, Payload>;
  readonly extension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export interface RelativeMonadFramingReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeMonadRepresentabilityReport<Obj, Arr> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly framing: RelativeMonadFramingReport;
  readonly representability: RepresentabilityWitness<Obj, Arr>;
}

export interface RelativeMonadIdentityReductionReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

const frameMatchesLooseCell = <Obj, Payload>(
  equality: (left: Obj, right: Obj) => boolean,
  frame: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>> },
  looseCell: EquipmentProarrow<Obj, Payload>,
  label: string,
  issues: string[],
): void => {
  if (frame.arrows.length !== 1) {
    issues.push(`${label} should consist of exactly one loose arrow matching E(j,t).`);
    return;
  }
  const [arrow] = frame.arrows;
  if (!equality(arrow.from, looseCell.from) || !equality(arrow.to, looseCell.to)) {
    issues.push(`${label} arrow must share the loose cell's endpoints.`);
  }
};

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

export const analyzeRelativeMonadFraming = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadFramingReport => {
  const { equipment, root, carrier, looseCell, extension, unit } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(root.from, carrier.from) || !equality(root.to, carrier.to)) {
    issues.push("Root j and carrier t must share domain and codomain.");
  }
  if (!equality(looseCell.from, root.from) || !equality(looseCell.to, carrier.to)) {
    issues.push("Underlying loose cell E(j,t) must run from dom(j) to cod(t).");
  }

  frameMatchesLooseCell(
    equality,
    extension.target,
    looseCell,
    "Extension target",
    issues,
  );
  frameMatchesLooseCell(equality, unit.target, looseCell, "Unit target", issues);

  if (!equality(extension.source.leftBoundary, root.from)) {
    issues.push("Extension source left boundary must equal dom(j).");
  }
  if (!equality(extension.source.rightBoundary, carrier.to)) {
    issues.push("Extension source right boundary must equal cod(t).");
  }
  if (!equality(unit.source.leftBoundary, root.from)) {
    issues.push("Unit source left boundary must equal dom(j).");
  }
  if (!equality(unit.source.rightBoundary, root.to)) {
    issues.push("Unit source right boundary must equal cod(j) = cod(t).");
  }

  boundariesMatch(equality, extension.boundaries.left, root, "Extension left boundary", issues);
  boundariesMatch(equality, extension.boundaries.right, carrier, "Extension right boundary", issues);
  boundariesMatch(equality, unit.boundaries.left, root, "Unit left boundary", issues);
  boundariesMatch(equality, unit.boundaries.right, carrier, "Unit right boundary", issues);

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details:
      holds
        ? "Relative monad unit and extension 2-cells have compatible framing with the chosen root and carrier."
        : `Relative monad framing issues: ${issues.join("; ")}`,
  };
};

export const describeTrivialRelativeMonad = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  object: Obj,
): RelativeMonadData<Obj, Arr, Payload, Evidence> => {
  const root = identityVerticalBoundary(
    equipment,
    object,
    "Trivial relative monad root chosen as the identity tight 1-cell.",
  );
  const carrier = identityVerticalBoundary(
    equipment,
    object,
    "Trivial relative monad carrier equals the identity tight 1-cell.",
  );
  const looseCell = identityProarrow(equipment, object);
  const framed = frameFromProarrow(looseCell);
  const boundaries = {
    left: root,
    right: carrier,
  };
  const identityEvidence = equipment.cells.identity(framed, boundaries);
  const extension: Equipment2Cell<Obj, Arr, Payload, Evidence> = {
    source: framed,
    target: framed,
    boundaries,
    evidence: identityEvidence,
  };
  return {
    equipment,
    root,
    carrier,
    looseCell,
    extension,
    unit: extension,
  };
};

export const analyzeRelativeMonadRepresentability = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RepresentabilityWitness<Obj, Arr>,
): RelativeMonadRepresentabilityReport<Obj, Arr> => {
  const framing = analyzeRelativeMonadFraming(data);
  const issues = [...framing.issues];

  const equality = data.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (witness.orientation !== "left") {
    issues.push(
      "Representability witness must arise from a left restriction B(j,1) to align with Theorem 4.16.",
    );
  }

  if (!equality(witness.object, data.root.from)) {
    issues.push("Representability witness object must match the domain of the root j.");
  }

  if (witness.tight !== data.root.tight) {
    issues.push("Representability witness must reuse the root tight 1-cell when restricting the identity.");
  }

  if (!equality(data.looseCell.from, data.root.from)) {
    issues.push("Relative monad loose arrow should start at the domain certified by the representability witness.");
  }

  const holds = issues.length === 0;
  const details = holds
    ? "Relative monad admits a representable loose presentation via the left restriction of the identity along j."
    : `Relative monad representability issues: ${issues.join("; ")}. Framing details: ${framing.details}`;

  return {
    holds,
    issues,
    details,
    framing,
    representability: witness,
  };
};

export const analyzeRelativeMonadIdentityReduction = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadIdentityReductionReport => {
  const { equipment, root, carrier, looseCell, extension, unit } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!verticalBoundariesEqual(equality, root, carrier)) {
    issues.push("Root j and carrier t must coincide to model an ordinary monad.");
  }

  if (!isIdentityVerticalBoundary(equipment, root.from, root)) {
    issues.push("Root j should be the identity tight 1-cell to recover a classical monad.");
  }

  if (!isIdentityVerticalBoundary(equipment, carrier.from, carrier)) {
    issues.push("Carrier t should equal the identity tight 1-cell when j = id.");
  }

  if (!equality(looseCell.from, root.from) || !equality(looseCell.to, root.to)) {
    issues.push("Underlying loose cell must be an endoarrow on the shared object.");
  }

  boundariesMatch(
    equality,
    extension.boundaries.left,
    root,
    "Extension left boundary",
    issues,
  );
  boundariesMatch(
    equality,
    extension.boundaries.right,
    carrier,
    "Extension right boundary",
    issues,
  );
  boundariesMatch(equality, unit.boundaries.left, root, "Unit left boundary", issues);
  boundariesMatch(equality, unit.boundaries.right, carrier, "Unit right boundary", issues);

  frameMatchesLooseCell(
    equality,
    extension.target,
    looseCell,
    "Extension target",
    issues,
  );
  frameMatchesLooseCell(equality, unit.target, looseCell, "Unit target", issues);

  const holds = issues.length === 0;
  const details = holds
    ? "Relative monad data over the identity root collapses to an ordinary monad as in Corollary 4.20."
    : `Identity-root reduction issues: ${issues.join("; ")}`;

  return { holds, issues, details };
};

export interface RelativeMonadSkewMonoidBridgeInput<Obj, Arr, Payload, Evidence> {
  readonly relative: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly monoid: LooseMonoidData<Obj, Arr, Payload, Evidence>;
  readonly monoidShape: LooseMonoidShapeReport;
  readonly representability: RelativeMonadRepresentabilityReport<Obj, Arr>;
  readonly leftExtensions: {
    readonly existence: LeftExtensionFromColimitAnalysis;
    readonly preservation: PointwiseLeftExtensionLiftAnalysis;
    readonly absolute: AbsoluteColimitAnalysis;
    readonly density: DensityAnalysis;
    readonly rightUnit: FullyFaithfulLeftExtensionAnalysis;
  };
}

export interface RelativeMonadSkewMonoidBridgeReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

const collectDependencyIssues = (
  label: string,
  holds: boolean,
  details: string,
  issues: ReadonlyArray<string>,
  accumulator: string[],
): void => {
  if (holds) {
    return;
  }
  accumulator.push(`${label} failed: ${details}`);
  issues.forEach((issue) => accumulator.push(`${label}: ${issue}`));
};

export const analyzeRelativeMonadSkewMonoidBridge = <Obj, Arr, Payload, Evidence>(
  input: RelativeMonadSkewMonoidBridgeInput<Obj, Arr, Payload, Evidence>,
): RelativeMonadSkewMonoidBridgeReport => {
  const { relative, monoid, monoidShape, representability, leftExtensions } = input;
  const { equipment } = relative;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(relative.looseCell.from, monoid.looseCell.from)) {
    issues.push("Loose monoid object should share the relative monad's source endpoint.");
  }
  if (!equality(relative.looseCell.to, monoid.looseCell.to)) {
    issues.push("Loose monoid object should share the relative monad's target endpoint.");
  }

  if (monoid.multiplication !== relative.extension) {
    issues.push("Loose monoid multiplication must reuse the relative monad's extension 2-cell.");
  }
  if (monoid.unit !== relative.unit) {
    issues.push("Loose monoid unit must reuse the relative monad's unit 2-cell.");
  }

  collectDependencyIssues(
    "Representability",
    representability.holds,
    representability.details,
    representability.issues,
    issues,
  );

  collectDependencyIssues(
    "Loose monoid framing",
    monoidShape.holds,
    monoidShape.details,
    monoidShape.issues,
    issues,
  );

  collectDependencyIssues(
    "Left extension existence",
    leftExtensions.existence.holds,
    leftExtensions.existence.details,
    leftExtensions.existence.issues,
    issues,
  );
  collectDependencyIssues(
    "Left extension preservation",
    leftExtensions.preservation.holds,
    leftExtensions.preservation.details,
    leftExtensions.preservation.issues,
    issues,
  );
  collectDependencyIssues(
    "j-absolute comparison",
    leftExtensions.absolute.holds,
    leftExtensions.absolute.details,
    leftExtensions.absolute.issues,
    issues,
  );
  collectDependencyIssues(
    "Density witness",
    leftExtensions.density.holds,
    leftExtensions.density.details,
    leftExtensions.density.issues,
    issues,
  );
  collectDependencyIssues(
    "Right unit invertibility",
    leftExtensions.rightUnit.holds,
    leftExtensions.rightUnit.details,
    leftExtensions.rightUnit.issues,
    issues,
  );

  const holds = issues.length === 0;
  const successNarrative = [
    representability.details,
    monoidShape.details,
    leftExtensions.existence.details,
    leftExtensions.preservation.details,
    leftExtensions.absolute.details,
    leftExtensions.density.details,
    leftExtensions.rightUnit.details,
  ];

  const details = holds
    ? `Relative monad data satisfies Theorem 4.29: ${successNarrative.join(" | ")}`
    : `Relative monad skew-monoid issues: ${issues.join("; ")}`;

  return { holds, issues, details };
};
