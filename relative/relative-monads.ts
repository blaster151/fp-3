import type {
  AbsoluteColimitAnalysis,
  DensityAnalysis,
  Equipment2Cell,
  EquipmentRestrictionResult,
  EquipmentProarrow,
  EquipmentVerticalBoundary,
  FullyFaithfulLeftExtensionAnalysis,
  LooseMonoidData,
  LooseMonoidShapeReport,
  ObjectEquality,
  RepresentabilityWitness,
  TightCellEvidence,
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
  virtualizeCategory,
} from "../virtual-equipment";
import type {
  RelativeAdjunctionData,
  RelativeAdjunctionFramingReport,
} from "./relative-adjunctions";
import { analyzeRelativeAdjunctionHomIsomorphism } from "./relative-adjunctions";
import type { RelativeMonad } from "./relative-monad";
import type { CatMonad } from "../allTS";
import { MorOf, ObjOf } from "../allTS";
import { analyzeLooseMonoidShape } from "../virtual-equipment/loose-structures";
import {
  analyzeLooseSkewComposition,
  type LooseSkewCompositionAnalysis,
  type LooseSkewMultimorphism,
} from "../virtual-equipment/skew-multicategory";
import {
  analyzeRightExtension,
  analyzeRightLift,
  type RightExtensionAnalysis,
  type RightExtensionData,
  type RightLiftAnalysis,
  type RightLiftData,
} from "../virtual-equipment/extensions";
import {
  analyzeLeftExtensionFromWeightedColimit,
  analyzeWeightedCocone,
  analyzeWeightedColimitRestriction,
  analyzeWeightedCone,
  analyzeWeightedLimitRestriction,
  type LeftExtensionFromColimitAnalysis,
  type LeftExtensionFromColimitData,
  type WeightedCoconeAnalysis,
  type WeightedCoconeData,
  type WeightedColimitRestrictionAnalysis,
  type WeightedColimitRestrictionData,
  type WeightedConeAnalysis,
  type WeightedConeData,
  type WeightedLimitRestrictionAnalysis,
  type WeightedLimitRestrictionData,
} from "../virtual-equipment/limits";
import {
  analyzeDensityViaIdentityRestrictions,
  type DensityViaIdentityRestrictionsData,
} from "../virtual-equipment/absoluteness";
import {
  analyzeFullyFaithfulTight1Cell,
  analyzePointwiseLeftExtensionLiftCorrespondence,
  type FullyFaithfulAnalysis,
  type FullyFaithfulInput,
  type PointwiseLeftExtensionLiftAnalysis,
  type PointwiseLeftExtensionLiftInput,
} from "../virtual-equipment/faithfulness";

export type RelativeMonadData<
  Obj,
  Arr,
  Payload,
  Evidence,
> = RelativeMonad<Obj, Arr, Payload, Evidence>;

export interface RelativeMonadConstructionResult<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly monad?: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly framing: RelativeMonadFramingReport;
  readonly leftRestriction?: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>;
  readonly rightRestriction?: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>;
  readonly representability?: RepresentabilityWitness<Obj, Arr>;
  readonly looseMonoid: LooseMonoidData<Obj, Arr, Payload, Evidence>;
  readonly looseMonoidReport: LooseMonoidShapeReport;
  readonly skewComposition?: LooseSkewCompositionAnalysis;
  readonly rightExtension?: RightExtensionAnalysis;
  readonly rightLift?: RightLiftAnalysis;
  readonly weightedCone?: WeightedConeAnalysis;
  readonly weightedCocone?: WeightedCoconeAnalysis;
  readonly weightedColimitRestriction?: WeightedColimitRestrictionAnalysis;
  readonly weightedLimitRestriction?: WeightedLimitRestrictionAnalysis;
  readonly leftExtensionFromColimit?: LeftExtensionFromColimitAnalysis;
  readonly density?: DensityAnalysis;
  readonly pointwiseLift?: PointwiseLeftExtensionLiftAnalysis;
  readonly fullyFaithful?: FullyFaithfulAnalysis<Obj, Arr, Payload, Evidence>;
}

export interface RelativeMonadEquipmentWitnesses<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly looseMonoid?: LooseMonoidData<Obj, Arr, Payload, Evidence>;
  readonly skewSubstitutions?: ReadonlyArray<
    LooseSkewMultimorphism<Obj, Arr, Payload, Evidence>
  >;
  readonly rightExtension?: RightExtensionData<Obj, Arr, Payload, Evidence>;
  readonly rightLift?: RightLiftData<Obj, Arr, Payload, Evidence>;
  readonly weightedCone?: WeightedConeData<Obj, Arr, Payload, Evidence>;
  readonly weightedCocone?: WeightedCoconeData<Obj, Arr, Payload, Evidence>;
  readonly leftExtensionFromColimit?: LeftExtensionFromColimitData<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
  readonly density?: DensityViaIdentityRestrictionsData<Obj, Arr>;
  readonly fullyFaithful?: FullyFaithfulInput<Obj, Arr>;
  readonly pointwiseLift?: PointwiseLeftExtensionLiftInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
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

export interface RelativeMonadFiberMonad<Obj, Arr, Payload, Evidence> {
  readonly baseObject: Obj;
  readonly looseArrow: EquipmentProarrow<Obj, Payload>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly extension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly root: EquipmentVerticalBoundary<Obj, Arr>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
}

export interface RelativeMonadFiberEmbeddingReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly representability: RelativeMonadRepresentabilityReport<Obj, Arr>;
  readonly fiberMonad?: RelativeMonadFiberMonad<Obj, Arr, Payload, Evidence>;
}

export const embedRelativeMonadIntoFiber = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RepresentabilityWitness<Obj, Arr>,
): RelativeMonadFiberEmbeddingReport<Obj, Arr, Payload, Evidence> => {
  const representability = analyzeRelativeMonadRepresentability(data, witness);
  const issues = [...representability.issues];

  const holds = representability.holds;
  const pending = true;
  const details = holds
    ? "Relative monad embeds into the Street fiber X[j] via E(j,-); fully faithful comparison witnesses remain pending."
    : `Relative monad cannot embed into X[j]: ${issues.join("; ")}`;

  return {
    holds,
    pending,
    issues,
    details,
    representability,
    fiberMonad: holds
      ? {
          baseObject: data.root.from,
          looseArrow: data.looseCell,
          unit: data.unit,
          extension: data.extension,
          root: data.root,
          carrier: data.carrier,
        }
      : undefined,
  };
};

export interface RelativeMonadIdentityReductionReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface RelativeMonadResolutionLooseMonadReport<Obj, Payload> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly induced?: EquipmentProarrow<Obj, Payload>;
}

export interface RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly monadFraming: RelativeMonadFramingReport;
  readonly homIsomorphism: RelativeAdjunctionFramingReport;
  readonly looseMonad: RelativeMonadResolutionLooseMonadReport<Obj, Payload>;
}

export interface RelativeMonadResolutionData<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly adjunction: RelativeAdjunctionData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeMonadUnitCompatibilityWitness<Obj, Arr, Payload, Evidence> {
  readonly unitArrow?: EquipmentProarrow<Obj, Payload>;
  readonly extensionComposite?: EquipmentProarrow<Obj, Payload>;
  readonly extensionSourceArrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>;
}

export interface RelativeMonadExtensionAssociativityWitness<Obj, Arr, Payload, Evidence> {
  readonly extensionComposite?: EquipmentProarrow<Obj, Payload>;
  readonly extensionSourceArrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>>;
}

export interface RelativeMonadRootIdentityWitness<Obj, Arr, Payload, Evidence> {
  readonly restriction?: EquipmentRestrictionResult<Obj, Arr, Payload, Evidence>;
  readonly unitSourceArrow?: EquipmentProarrow<Obj, Payload>;
}

export interface RelativeMonadLawComponentReport<Witness> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: Witness;
}

export interface RelativeMonadLawAnalysis<Obj, Arr, Payload, Evidence> {
  readonly framing: RelativeMonadFramingReport;
  readonly unitCompatibility: RelativeMonadLawComponentReport<
    RelativeMonadUnitCompatibilityWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly extensionAssociativity: RelativeMonadLawComponentReport<
    RelativeMonadExtensionAssociativityWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly rootIdentity: RelativeMonadLawComponentReport<
    RelativeMonadRootIdentityWitness<Obj, Arr, Payload, Evidence>
  >;
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
}

export const relativeMonadFromEquipment = <Obj, Arr, Payload, Evidence>(
  scaffold: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witnesses: RelativeMonadEquipmentWitnesses<Obj, Arr, Payload, Evidence> = {},
): RelativeMonadConstructionResult<Obj, Arr, Payload, Evidence> => {
  const framing = analyzeRelativeMonadFraming(scaffold);
  const issues = [...framing.issues];
  const equality = scaffold.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  const looseMonoid: LooseMonoidData<Obj, Arr, Payload, Evidence> =
    witnesses.looseMonoid ?? {
      object: scaffold.root.from,
      looseCell: scaffold.looseCell,
      multiplication: scaffold.extension,
      unit: scaffold.unit,
    };
  const looseMonoidReport = analyzeLooseMonoidShape(scaffold.equipment, looseMonoid);

  const skewInners =
    witnesses.skewSubstitutions ??
    scaffold.extension.source.arrows.map((arrow, index) => {
      const frame = frameFromProarrow(arrow);
      const left = identityVerticalBoundary(
        scaffold.equipment,
        arrow.from,
        `Identity left boundary for extension source arrow ${index}.`,
      );
      const right = identityVerticalBoundary(
        scaffold.equipment,
        arrow.to,
        `Identity right boundary for extension source arrow ${index}.`,
      );
      return {
        label: `extension.source[${index}]`,
        cell: {
          source: frame,
          target: frame,
          boundaries: { left, right },
          evidence: scaffold.equipment.cells.identity(frame, { left, right }),
        },
      } as LooseSkewMultimorphism<Obj, Arr, Payload, Evidence>;
    });

  const skewComposition = analyzeLooseSkewComposition(
    scaffold.equipment,
    {
      cell: scaffold.extension,
      label: "relative monad extension",
    },
    skewInners,
  );

  const collectReportIssues = (
    label: string,
    report: { holds: boolean; details: string; issues: ReadonlyArray<string> } | undefined,
  ) => {
    if (!report || report.holds) {
      return;
    }
    issues.push(`${label} failed: ${report.details}`);
    report.issues.forEach((issue) => issues.push(`${label}: ${issue}`));
  };

  collectReportIssues("Loose monoid framing", looseMonoidReport);
  collectReportIssues("Skew multicategory substitution", skewComposition);

  const leftRestriction = scaffold.equipment.restrictions.left(
    scaffold.root.tight,
    scaffold.looseCell,
  );

  let representability: RepresentabilityWitness<Obj, Arr> | undefined;

  if (leftRestriction === undefined) {
    issues.push(
      "Left restriction B(j,1) failed: equipment could not restrict the loose arrow along the root.",
    );
  } else {
    const { restricted, representability: witness, details } = leftRestriction;
    if (
      !equality(restricted.from, scaffold.looseCell.from) ||
      !equality(restricted.to, scaffold.looseCell.to)
    ) {
      issues.push("Left restriction B(j,1) must return a loose arrow matching E(j,t).");
    }
    if (restricted !== scaffold.looseCell) {
      issues.push(
        "Left restriction B(j,1) should recover the supplied loose arrow; use the restricted arrow when wiring future analyzers.",
      );
    }
    if (witness === undefined) {
      issues.push(
        `Left restriction along j currently lacks representability; loose adjunction analyzers will only certify a map. Details: ${details}`,
      );
    } else {
      representability = witness;
      if (witness.orientation !== "left") {
        issues.push("Representability witness must arise from a left restriction B(j,1).");
      }
      if (!equality(witness.object, scaffold.root.from)) {
        issues.push("Representability witness object must match dom(j).");
      }
      if (witness.tight !== scaffold.root.tight) {
        issues.push("Representability witness must reuse the root tight 1-cell.");
      }
    }
  }

  const rightRestriction = scaffold.equipment.restrictions.right(
    scaffold.looseCell,
    scaffold.carrier.tight,
  );

  if (rightRestriction === undefined) {
    issues.push(
      "Right restriction B(1,t) failed: equipment could not align the loose arrow with the carrier boundary.",
    );
  } else {
    const { restricted, representability: witness, details } = rightRestriction;
    if (
      !equality(restricted.from, scaffold.looseCell.from) ||
      !equality(restricted.to, scaffold.looseCell.to)
    ) {
      issues.push("Right restriction B(1,t) must return a loose arrow matching E(j,t).");
    }
    if (restricted !== scaffold.looseCell) {
      issues.push(
        "Right restriction B(1,t) should coincide with the supplied loose arrow so future Street actions reuse the same data.",
      );
    }
    if (witness === undefined) {
      issues.push(
        `Right restriction along t currently lacks representability; record companion/conjoint witnesses so adjunction scaffolding can proceed. Details: ${details}`,
      );
    } else if (witness.orientation !== "right") {
      issues.push("Right restriction representability must be oriented as B(1,t).");
    }
  }

  const rightExtensionReport = witnesses.rightExtension
    ? analyzeRightExtension(scaffold.equipment, witnesses.rightExtension)
    : undefined;
  const rightLiftReport = witnesses.rightLift
    ? analyzeRightLift(scaffold.equipment, witnesses.rightLift)
    : undefined;
  const weightedConeReport = witnesses.weightedCone
    ? analyzeWeightedCone(scaffold.equipment, witnesses.weightedCone)
    : undefined;
  const weightedCoconeReport = witnesses.weightedCocone
    ? analyzeWeightedCocone(scaffold.equipment, witnesses.weightedCocone)
    : undefined;
  const leftExtensionFromColimitReport = witnesses.leftExtensionFromColimit
    ? analyzeLeftExtensionFromWeightedColimit(
        scaffold.equipment,
        witnesses.leftExtensionFromColimit,
      )
    : undefined;
  const densityReport = witnesses.density
    ? analyzeDensityViaIdentityRestrictions(scaffold.equipment, witnesses.density)
    : undefined;
  const fullyFaithfulReport = witnesses.fullyFaithful
    ? analyzeFullyFaithfulTight1Cell(scaffold.equipment, witnesses.fullyFaithful)
    : undefined;
  const pointwiseLiftReport = witnesses.pointwiseLift
    ? analyzePointwiseLeftExtensionLiftCorrespondence(
        scaffold.equipment,
        witnesses.pointwiseLift,
      )
    : undefined;

  collectReportIssues("Right extension", rightExtensionReport);
  collectReportIssues("Right lift", rightLiftReport);
  collectReportIssues("Weighted cone", weightedConeReport);
  collectReportIssues("Weighted cocone", weightedCoconeReport);
  collectReportIssues(
    "Left extension from weighted colimit",
    leftExtensionFromColimitReport,
  );
  collectReportIssues("Density via identity restrictions", densityReport);
  collectReportIssues("Fully faithful tight 1-cell", fullyFaithfulReport);
  collectReportIssues("Pointwise left extension lift", pointwiseLiftReport);

  const weightedColimitRestrictionReport =
    weightedCoconeReport && leftRestriction
      ? analyzeWeightedColimitRestriction(scaffold.equipment, {
          cocone: witnesses.weightedCocone!,
          restriction: leftRestriction,
        })
      : undefined;
  collectReportIssues("Weighted colimit restriction", weightedColimitRestrictionReport);

  const weightedLimitRestrictionReport =
    weightedConeReport && rightRestriction
      ? analyzeWeightedLimitRestriction(scaffold.equipment, {
          cone: witnesses.weightedCone!,
          restriction: rightRestriction,
        })
      : undefined;
  collectReportIssues("Weighted limit restriction", weightedLimitRestrictionReport);

  const holds = issues.length === 0;

  return {
    holds,
    issues,
    details: holds
      ? "Constructed relative monad from equipment: framing and restriction checks succeeded."
      : `Relative monad construction issues: ${issues.join("; ")}`,
    ...(holds && { monad: scaffold, representability }),
    framing,
    ...(leftRestriction !== undefined && { leftRestriction }),
    ...(rightRestriction !== undefined && { rightRestriction }),
    ...(!holds && representability !== undefined && { representability }),
    looseMonoid,
    looseMonoidReport,
    skewComposition,
    rightExtension: rightExtensionReport,
    rightLift: rightLiftReport,
    weightedCone: weightedConeReport,
    weightedCocone: weightedCoconeReport,
    weightedColimitRestriction: weightedColimitRestrictionReport,
    weightedLimitRestriction: weightedLimitRestrictionReport,
    leftExtensionFromColimit: leftExtensionFromColimitReport,
    density: densityReport,
    pointwiseLift: pointwiseLiftReport,
    fullyFaithful: fullyFaithfulReport,
  };
};

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
  if (!arrow) {
    issues.push(`${label} arrow is missing after length check.`);
    return;
  }
  if (!equality(arrow.from, looseCell.from) || !equality(arrow.to, looseCell.to)) {
    issues.push(`${label} arrow must share the loose cell's endpoints.`);
  }
};

const singleArrowFromFrame = <Obj, Payload>(
  frame: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>> },
): EquipmentProarrow<Obj, Payload> | undefined =>
  frame.arrows.length === 1 ? frame.arrows[0] : undefined;

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

const composeExtensionSource = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  frame: { readonly arrows: ReadonlyArray<EquipmentProarrow<Obj, Payload>> },
  issues: string[],
) => {
  if (frame.arrows.length === 0) {
    issues.push("Extension source must contain at least one loose arrow to compose with the unit action.");
    return undefined;
  }
  const composite = equipment.proarrows.horizontalComposeMany(frame.arrows);
  if (composite === undefined) {
    issues.push("Extension source arrows must be horizontally composable inside the equipment.");
  }
  return composite;
};

export const analyzeRelativeMonadUnitCompatibility = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLawComponentReport<
  RelativeMonadUnitCompatibilityWitness<Obj, Arr, Payload, Evidence>
> => {
  const { equipment, looseCell, extension, unit, root } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const unitArrow = singleArrowFromFrame(unit.target);
  if (!unitArrow) {
    issues.push("Unit target should provide the loose arrow used for Kleisli identities.");
  } else {
    if (!equality(unitArrow.from, looseCell.from)) {
      issues.push("Unit target arrow should start at dom(j) so extend(unit) composes.");
    }
    if (!equality(unitArrow.to, looseCell.to)) {
      issues.push("Unit target arrow should land at cod(t) for the extension composite.");
    }
  }

  const composite = composeExtensionSource(equipment, extension.source, issues);
  const firstArrow = extension.source.arrows[0];
  const lastArrow = extension.source.arrows[extension.source.arrows.length - 1];

  if (firstArrow && !equality(firstArrow.from, looseCell.from)) {
    issues.push("Extension source should begin at dom(j) so the unit comparison is defined.");
  }
  if (lastArrow && !equality(lastArrow.to, looseCell.to)) {
    issues.push("Extension source should end at cod(t) to reuse the loose arrow boundaries.");
  }

  if (composite && !equality(composite.from, root.from)) {
    issues.push("Composite of extension source arrows should start at dom(j).");
  }
  if (composite && !equality(composite.to, looseCell.to)) {
    issues.push("Composite of extension source arrows should land at cod(t).");
  }

  const holds = issues.length === 0;
  const details = holds
    ? "Structural prerequisites for extend(unit) hold; Street-level equality remains pending."
    : `Relative monad unit compatibility issues: ${issues.join("; ")}`;

  return {
    holds,
    pending: true,
    issues,
    details,
    witness: {
      unitArrow,
      extensionComposite: composite,
      extensionSourceArrows: [...extension.source.arrows],
    },
  };
};

export const analyzeRelativeMonadExtensionAssociativity = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLawComponentReport<
  RelativeMonadExtensionAssociativityWitness<Obj, Arr, Payload, Evidence>
> => {
  const { equipment, extension, looseCell } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (extension.source.arrows.length < 2) {
    issues.push("Extension source should exhibit at least two composable loose arrows to witness associativity.");
  }

  const composite = composeExtensionSource(equipment, extension.source, issues);

  if (composite && !equality(composite.from, looseCell.from)) {
    issues.push("Composite of extension source arrows should start at dom(j) for associativity pastings.");
  }
  if (composite && !equality(composite.to, looseCell.to)) {
    issues.push("Composite of extension source arrows should end at cod(t) to compare both pastings.");
  }

  const holds = issues.length === 0;
  const details = holds
    ? "Extension source arrows compose; associativity equality awaits Street pasting witnesses."
    : `Relative monad associativity prerequisites failed: ${issues.join("; ")}`;

  return {
    holds,
    pending: true,
    issues,
    details,
    witness: {
      extensionComposite: composite,
      extensionSourceArrows: [...extension.source.arrows],
    },
  };
};

export const analyzeRelativeMonadRootIdentity = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLawComponentReport<
  RelativeMonadRootIdentityWitness<Obj, Arr, Payload, Evidence>
> => {
  const { equipment, root, looseCell, unit } = data;
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  const restriction = equipment.restrictions.left(root.tight, looseCell);
  if (restriction === undefined) {
    issues.push("Left restriction B(j,1) should exist so the unit preserves identities along the root.");
  }

  const unitSourceArrow = singleArrowFromFrame(unit.source);
  if (!unitSourceArrow) {
    issues.push("Unit source should consist of the identity loose arrow on dom(j).");
  } else {
    if (!equality(unitSourceArrow.from, root.from)) {
      issues.push("Unit source arrow should start at dom(j).");
    }
    if (!equality(unitSourceArrow.to, root.from)) {
      issues.push("Unit source arrow should end at dom(j) to represent the identity along the root.");
    }
  }

  const holds = issues.length === 0;
  const details = holds
    ? "Restriction and unit framing preserve the root identity; comparison with Street calculus remains pending."
    : `Relative monad root-identity issues: ${issues.join("; ")}`;

  return {
    holds,
    pending: true,
    issues,
    details,
    witness: {
      restriction,
      unitSourceArrow,
    },
  };
};

export const analyzeRelativeMonadLaws = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadLawAnalysis<Obj, Arr, Payload, Evidence> => ({
  monad: data,
  framing: analyzeRelativeMonadFraming(data),
  unitCompatibility: analyzeRelativeMonadUnitCompatibility(data),
  extensionAssociativity: analyzeRelativeMonadExtensionAssociativity(data),
  rootIdentity: analyzeRelativeMonadRootIdentity(data),
});

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

export interface RelativeMonadIdentityRootOptions<C> {
  readonly rootObject: ObjOf<C>;
  readonly objects?: ReadonlyArray<ObjOf<C>>;
  readonly equalsObjects?: ObjectEquality<ObjOf<C>>;
  readonly details?: {
    readonly root?: string;
    readonly carrier?: string;
  };
}

export const fromMonad = <C>(
  monad: CatMonad<C>,
  options: RelativeMonadIdentityRootOptions<C>,
): RelativeMonadData<
  ObjOf<C>,
  MorOf<C>,
  CatMonad<C>["endofunctor"],
  TightCellEvidence<ObjOf<C>, MorOf<C>>
> => {
  type Obj = ObjOf<C>;
  type Arr = MorOf<C>;
  type Endofunctor = CatMonad<C>["endofunctor"];

  const equality = options.equalsObjects ?? defaultObjectEquality<Obj>;
  const knownObjects = options.objects ?? [];
  const rootObject = options.rootObject;
  const ensuredRoot = knownObjects.some((object) => equality(object, rootObject))
    ? knownObjects
    : [rootObject, ...knownObjects];
  const carrierTarget = monad.endofunctor.onObj(rootObject);
  const objects = ensuredRoot.some((object) => equality(object, carrierTarget))
    ? ensuredRoot
    : [...ensuredRoot, carrierTarget];

  const equipment = virtualizeCategory(monad.category, {
    objects,
    ...(options.equalsObjects !== undefined && { equalsObjects: options.equalsObjects }),
  });

  const root = identityVerticalBoundary(
    equipment,
    rootObject,
    options.details?.root ??
      "Identity root induced by embedding a classical monad into the relative layer.",
  );

  const carrier: EquipmentVerticalBoundary<Obj, Arr> = {
    from: rootObject,
    to: carrierTarget,
    tight: monad.endofunctor,
    details:
      options.details?.carrier ??
      "Carrier boundary arises from the monad endofunctor applied to the chosen root object.",
  };

  const looseCell: EquipmentProarrow<Obj, Endofunctor> = {
    from: rootObject,
    to: carrierTarget,
    payload: monad.endofunctor,
  };

  const framed = frameFromProarrow(looseCell);
  const boundaries = { left: root, right: carrier } as const;

  const unit: Equipment2Cell<Obj, Arr, Endofunctor, TightCellEvidence<Obj, Arr>> = {
    source: framed,
    target: framed,
    boundaries,
    evidence: { kind: "tight", cell: monad.unit },
  };

  const extension: Equipment2Cell<Obj, Arr, Endofunctor, TightCellEvidence<Obj, Arr>> = {
    source: framed,
    target: framed,
    boundaries,
    evidence: { kind: "tight", cell: monad.mult },
  };

  return {
    equipment,
    root,
    carrier,
    looseCell,
    extension,
    unit,
  };
};

export interface RelativeMonadIdentityCollapseResult<C> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly monad?: CatMonad<C>;
}

export const toMonadIfIdentity = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeMonadIdentityCollapseResult<typeof data.equipment.tight.category> => {
  const reduction = analyzeRelativeMonadIdentityReduction(data);
  if (!reduction.holds) {
    return {
      holds: false,
      issues: reduction.issues,
      details: reduction.details,
    };
  }

  const issues: string[] = [];
  const unitEvidence = data.unit.evidence;
  if (unitEvidence.kind !== "tight") {
    issues.push(
      "Relative monad unit evidence must be a tight 2-cell to recover the classical monad unit.",
    );
  }
  const extensionEvidence = data.extension.evidence;
  if (extensionEvidence.kind !== "tight") {
    issues.push(
      "Relative monad extension evidence must be a tight 2-cell to recover the classical monad multiplication.",
    );
  }

  if (issues.length > 0) {
    return {
      holds: false,
      issues,
      details: `Relative monad cannot collapse to an ordinary monad: ${issues.join("; ")}`,
    };
  }

  const monad: CatMonad<typeof data.equipment.tight.category> = {
    category: data.equipment.tight.category,
    endofunctor: data.carrier.tight,
    unit: unitEvidence.cell,
    mult: extensionEvidence.cell,
  };

  return {
    holds: true,
    issues: [],
    details: `${reduction.details} Recovered the classical monad data from the identity-root presentation.`,
    monad,
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

export const analyzeRelativeMonadResolution = <Obj, Arr, Payload, Evidence>(
  data: RelativeMonadResolutionData<Obj, Arr, Payload, Evidence>,
): RelativeMonadResolutionReport<Obj, Arr, Payload, Evidence> => {
  const { monad, adjunction } = data;
  const issues: string[] = [];

  if (monad.equipment !== adjunction.equipment) {
    issues.push("Relative adjunction and monad must share the same virtual equipment.");
  }

  const equality = adjunction.equipment.equalsObjects ?? defaultObjectEquality<Obj>;

  if (!verticalBoundariesEqual(equality, monad.root, adjunction.root)) {
    issues.push("Relative adjunction root j must match the monad root.");
  }

  if (!verticalBoundariesEqual(equality, monad.carrier, adjunction.right)) {
    issues.push("Relative monad carrier should match the right leg r.");
  }

  if (!equality(monad.looseCell.from, adjunction.root.from)) {
    issues.push("Loose arrow E(j,r) should originate at the domain of j.");
  }

  if (!equality(monad.looseCell.to, adjunction.right.to)) {
    issues.push("Loose arrow E(j,r) should land at the codomain of r.");
  }

  const monadFraming = analyzeRelativeMonadFraming(monad);
  const homIsomorphism = analyzeRelativeAdjunctionHomIsomorphism(adjunction);

  const looseIssues: string[] = [];
  const forwardTarget = adjunction.homIsomorphism.forward.target;

  if (!equality(forwardTarget.leftBoundary, monad.looseCell.from)) {
    looseIssues.push("Hom-isomorphism target should start at dom(j) to expose E(j,r).");
  }

  if (!equality(forwardTarget.rightBoundary, monad.looseCell.to)) {
    looseIssues.push("Hom-isomorphism target should end at cod(r) to expose E(j,r).");
  }

  const matchingArrows = forwardTarget.arrows.filter(
    (arrow) => equality(arrow.from, monad.looseCell.from) && equality(arrow.to, monad.looseCell.to),
  );

  let induced: EquipmentProarrow<Obj, Payload> | undefined;

  if (matchingArrows.length === 0) {
    looseIssues.push("Hom-isomorphism target should contain a loose arrow matching E(j,r).");
  } else {
    if (matchingArrows.length > 1) {
      looseIssues.push("Hom-isomorphism target should identify a unique loose arrow matching E(j,r).");
    }
    [induced] = matchingArrows;
    if (induced && induced !== monad.looseCell) {
      looseIssues.push("Loose monad arrow C(ℓ,r) must coincide with the supplied E(j,r) witness.");
    }
  }

  const looseHolds = looseIssues.length === 0;
  const looseMonad: RelativeMonadResolutionLooseMonadReport<Obj, Payload> = {
    holds: looseHolds,
    issues: looseIssues,
    details: looseHolds
      ? "Hom-isomorphism target realises the loose arrow E(j,r) as promised by Lemma 5.27 and Corollary 5.28."
      : `Loose monad comparison issues: ${looseIssues.join("; ")}`,
    ...(induced !== undefined && { induced }),
  };

  const combinedIssues = [
    ...issues,
    ...monadFraming.issues,
    ...homIsomorphism.issues,
    ...looseMonad.issues,
  ];

  const holds =
    issues.length === 0 && monadFraming.holds && homIsomorphism.holds && looseMonad.holds;

  return {
    holds,
    issues: holds ? [] : combinedIssues,
    details: holds
      ? "Relative adjunction resolves the monad: root, carrier, and loose arrow agree with Theorem 5.24."
      : `Relative adjunction resolution issues: ${combinedIssues.join("; ")}`,
    monadFraming,
    homIsomorphism,
    looseMonad,
  };
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

export interface RelativeMonadRepresentableRecoveryOptions<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly skewMonoidBridgeInput?: RelativeMonadSkewMonoidBridgeInput<
    Obj,
    Arr,
    Payload,
    Evidence
  >;
}

export interface RelativeMonadRepresentableRecoveryReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly embedding: RelativeMonadFiberEmbeddingReport<Obj, Arr, Payload, Evidence>;
  readonly skewMonoid?: RelativeMonadSkewMonoidBridgeReport;
}

export const analyzeRelativeMonadRepresentableRecovery = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  data: RelativeMonadData<Obj, Arr, Payload, Evidence>,
  witness: RepresentabilityWitness<Obj, Arr>,
  options: RelativeMonadRepresentableRecoveryOptions<Obj, Arr, Payload, Evidence> = {},
): RelativeMonadRepresentableRecoveryReport<Obj, Arr, Payload, Evidence> => {
  const embedding = embedRelativeMonadIntoFiber(data, witness);
  const issues = [...embedding.issues];

  let skewMonoid: RelativeMonadSkewMonoidBridgeReport | undefined;
  if (options.skewMonoidBridgeInput) {
    skewMonoid = analyzeRelativeMonadSkewMonoidBridge(options.skewMonoidBridgeInput);
    if (!skewMonoid.holds) {
      issues.push(`Skew-monoid comparison failed: ${skewMonoid.details}`);
      issues.push(...skewMonoid.issues);
    }
  }

  const holds = embedding.holds && (!skewMonoid || skewMonoid.holds);
  const pending = true;

  const details = holds
    ? options.skewMonoidBridgeInput
      ? "Representable root aligns with Levy and Altenkirch–Chapman–Uustalu presentations; explicit equivalence witnesses remain pending."
      : "Representable root prerequisites satisfied; provide skew-monoid bridge data to compare with Levy/ACU constructions."
    : `Representable recovery issues: ${issues.join("; ")}`;

  return { holds, pending, issues, details, embedding, skewMonoid };
};
