import type {
  Equipment2Cell,
  EquipmentProarrow,
  EquipmentWeakComposition,
  VirtualEquipment,
} from "./virtual-equipment";
import {
  defaultObjectEquality,
  horizontalComposeProarrows,
  identityProarrow,
  whiskerLeftCell,
  whiskerRightCell,
} from "./virtual-equipment";
import {
  evaluateStreetComparison,
  type StreetComparisonEvaluation,
} from "./street-calculus";

type MaybeCell<Obj, Arr, Payload, Evidence> =
  | Equipment2Cell<Obj, Arr, Payload, Evidence>
  | undefined;

type MaybeProarrow<Obj, Payload> = EquipmentProarrow<Obj, Payload> | undefined;

const whiskerRightChain = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  proarrow: EquipmentProarrow<Obj, Payload>,
): MaybeCell<Obj, Arr, Payload, Evidence> =>
  whiskerRightCell(equipment, cell, proarrow);

const whiskerLeftChain = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  proarrow: EquipmentProarrow<Obj, Payload>,
  cell: Equipment2Cell<Obj, Arr, Payload, Evidence>,
): MaybeCell<Obj, Arr, Payload, Evidence> =>
  whiskerLeftCell(equipment, proarrow, cell);

export interface Bicategory<Obj, Arr, Payload, Evidence> {
  readonly equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>;
  readonly compose1: (
    g: EquipmentProarrow<Obj, Payload>,
    f: EquipmentProarrow<Obj, Payload>,
  ) => MaybeProarrow<Obj, Payload>;
  readonly identity1: (object: Obj) => EquipmentProarrow<Obj, Payload>;
  readonly associator: (
    h: EquipmentProarrow<Obj, Payload>,
    g: EquipmentProarrow<Obj, Payload>,
    f: EquipmentProarrow<Obj, Payload>,
  ) => MaybeCell<Obj, Arr, Payload, Evidence>;
  readonly associatorInverse?: (
    h: EquipmentProarrow<Obj, Payload>,
    g: EquipmentProarrow<Obj, Payload>,
    f: EquipmentProarrow<Obj, Payload>,
  ) => MaybeCell<Obj, Arr, Payload, Evidence>;
  readonly leftUnitor: (
    f: EquipmentProarrow<Obj, Payload>,
  ) => MaybeCell<Obj, Arr, Payload, Evidence>;
  readonly leftUnitorInverse?: (
    f: EquipmentProarrow<Obj, Payload>,
  ) => MaybeCell<Obj, Arr, Payload, Evidence>;
  readonly rightUnitor: (
    f: EquipmentProarrow<Obj, Payload>,
  ) => MaybeCell<Obj, Arr, Payload, Evidence>;
  readonly rightUnitorInverse?: (
    f: EquipmentProarrow<Obj, Payload>,
  ) => MaybeCell<Obj, Arr, Payload, Evidence>;
}

export interface BicategoryConstructionIssues {
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

export interface BicategoryConstructionResult<Obj, Arr, Payload, Evidence>
  extends BicategoryConstructionIssues {
  readonly bicategory?: Bicategory<Obj, Arr, Payload, Evidence>;
}

const summarizeConstruction = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  weak?: EquipmentWeakComposition<Obj, Arr, Payload, Evidence>,
): BicategoryConstructionResult<Obj, Arr, Payload, Evidence> => {
  if (!weak) {
    return {
      details:
        "Virtual equipment did not provide weak composition data; associator/unitors unavailable.",
      issues: [
        "Equipment is missing weakComposition.associator.",
        "Equipment is missing weakComposition.leftUnitor.",
        "Equipment is missing weakComposition.rightUnitor.",
      ],
    };
  }
  const missing: string[] = [];
  if (!weak.associator) {
    missing.push("Equipment is missing weakComposition.associator.");
  }
  if (!weak.leftUnitor) {
    missing.push("Equipment is missing weakComposition.leftUnitor.");
  }
  if (!weak.rightUnitor) {
    missing.push("Equipment is missing weakComposition.rightUnitor.");
  }
  if (missing.length > 0) {
    return {
      issues: missing,
      details: `Virtual equipment weak composition was incomplete: ${missing.join(", ")}`,
    };
  }
  const equalsObjects = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const compose1 = (
    g: EquipmentProarrow<Obj, Payload>,
    f: EquipmentProarrow<Obj, Payload>,
  ): MaybeProarrow<Obj, Payload> =>
    equalsObjects(f.to, g.from)
      ? horizontalComposeProarrows(equipment, g, f)
      : undefined;
  return {
    bicategory: {
      equipment,
      compose1,
      identity1: (object) => identityProarrow(equipment, object),
      associator: weak.associator,
      ...(weak.associatorInverse === undefined ? {} : { associatorInverse: weak.associatorInverse }),
      leftUnitor: weak.leftUnitor,
      ...(weak.leftUnitorInverse === undefined ? {} : { leftUnitorInverse: weak.leftUnitorInverse }),
      rightUnitor: weak.rightUnitor,
      ...(weak.rightUnitorInverse === undefined ? {} : { rightUnitorInverse: weak.rightUnitorInverse }),
    },
    issues: [],
    details: "Equipment exposes associator and unitors for bicategorical reasoning.",
  };
};

export const bicategoryFromEquipment = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
): BicategoryConstructionResult<Obj, Arr, Payload, Evidence> =>
  summarizeConstruction(equipment, equipment.weakComposition);

export interface BicategoryPentagonData<Obj, Payload> {
  readonly f: EquipmentProarrow<Obj, Payload>;
  readonly g: EquipmentProarrow<Obj, Payload>;
  readonly h: EquipmentProarrow<Obj, Payload>;
  readonly k: EquipmentProarrow<Obj, Payload>;
}

export interface BicategoryTriangleData<Obj, Payload> {
  readonly f: EquipmentProarrow<Obj, Payload>;
  readonly g: EquipmentProarrow<Obj, Payload>;
}

const collectIssue = (
  issues: string[],
  condition: unknown,
  message: string,
): void => {
  if (!condition) {
    issues.push(message);
  }
};

const requireCell = <Obj, Arr, Payload, Evidence>(
  issues: string[],
  cell: MaybeCell<Obj, Arr, Payload, Evidence>,
  label: string,
): cell is Equipment2Cell<Obj, Arr, Payload, Evidence> => {
  collectIssue(issues, cell !== undefined, `${label} was unavailable.`);
  return cell !== undefined;
};

const requireProarrow = <Obj, Payload>(
  issues: string[],
  arrow: MaybeProarrow<Obj, Payload>,
  label: string,
): arrow is EquipmentProarrow<Obj, Payload> => {
  collectIssue(issues, arrow !== undefined, `${label} composite could not be formed.`);
  return arrow !== undefined;
};

const buildPentagonChains = <Obj, Arr, Payload, Evidence>(
  bicategory: Bicategory<Obj, Arr, Payload, Evidence>,
  data: BicategoryPentagonData<Obj, Payload>,
):
  | {
      readonly left: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>;
      readonly right: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>;
      readonly issues: ReadonlyArray<string>;
    }
  | undefined => {
  const issues: string[] = [];
  const { equipment } = bicategory;
  const gf = horizontalComposeProarrows(equipment, data.g, data.f);
  const hg = horizontalComposeProarrows(equipment, data.h, data.g);
  const kh = horizontalComposeProarrows(equipment, data.k, data.h);
  const kh_g = kh && horizontalComposeProarrows(equipment, kh, data.g);
  const leftStart =
    kh_g && horizontalComposeProarrows(equipment, kh_g, data.f);
  const k_hg =
    hg && horizontalComposeProarrows(equipment, data.k, hg);
  const rightStart =
    k_hg && horizontalComposeProarrows(equipment, k_hg, data.f);
  const gfValid = requireProarrow(issues, gf, "g ∘ f");
  const hgValid = requireProarrow(issues, hg, "h ∘ g");
  const khValid = requireProarrow(issues, kh, "k ∘ h");
  const khgValid = requireProarrow(issues, kh_g, "(k ∘ h) ∘ g");
  const leftValid = requireProarrow(issues, leftStart, "((k ∘ h) ∘ g) ∘ f");
  const rightStartValid = requireProarrow(issues, rightStart, "(k ∘ (h ∘ g)) ∘ f");
  if (
    !gfValid ||
    !hgValid ||
    !khValid ||
    !khgValid ||
    !leftValid ||
    !rightStartValid
  ) {
    return { left: [], right: [], issues };
  }
  const associator1 = bicategory.associator(kh!, data.g, data.f);
  const associator2 = bicategory.associator(data.k, data.h, gf!);
  const associator3 = bicategory.associator(data.k, hg!, data.f);
  const associator4 = bicategory.associator(data.k, data.h, data.g);
  const associator5 = bicategory.associator(data.h, data.g, data.f);
  const leftCells: Equipment2Cell<Obj, Arr, Payload, Evidence>[] = [];
  if (requireCell(issues, associator1, "α_{k∘h,g,f}")) {
    leftCells.push(associator1);
  }
  if (requireCell(issues, associator2, "α_{k,h,g∘f}")) {
    leftCells.push(associator2);
  }
  const rightCells: Equipment2Cell<Obj, Arr, Payload, Evidence>[] = [];
  if (requireCell(issues, associator4, "α_{k,h,g}")) {
    const whiskered = whiskerRightChain(equipment, associator4, data.f);
    if (requireCell(issues, whiskered, "(α_{k,h,g} ⋆ id_f)")) {
      rightCells.push(whiskered);
    }
  }
  if (requireCell(issues, associator3, "α_{k,h∘g,f}")) {
    rightCells.push(associator3);
  }
  if (requireCell(issues, associator5, "α_{h,g,f}")) {
    const whiskered = whiskerLeftChain(equipment, data.k, associator5);
    if (requireCell(issues, whiskered, "(id_k ⋆ α_{h,g,f})")) {
      rightCells.push(whiskered);
    }
  }
  return { left: leftCells, right: rightCells, issues };
};

export const analyzeBicategoryPentagon = <Obj, Arr, Payload, Evidence>(
  bicategory: Bicategory<Obj, Arr, Payload, Evidence>,
  data: BicategoryPentagonData<Obj, Payload>,
): StreetComparisonEvaluation<Obj, Arr, Payload, Evidence> => {
  const chains = buildPentagonChains(bicategory, data);
  if (!chains) {
    return {
      holds: false,
      issues: ["Unable to build pentagon chains."],
      details: "Pentagon chains were unavailable.",
    };
  }
  const issues = [...chains.issues];
  if (chains.left.length === 0 || chains.right.length === 0) {
    return {
      holds: false,
      issues,
      details: issues.join(" ") || "Pentagon chains were empty.",
    };
  }
  return evaluateStreetComparison(
    bicategory.equipment,
    chains.left,
    chains.right,
    "Bicategory pentagon",
  );
};

const buildTriangleChains = <Obj, Arr, Payload, Evidence>(
  bicategory: Bicategory<Obj, Arr, Payload, Evidence>,
  data: BicategoryTriangleData<Obj, Payload>,
):
  | {
      readonly left: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>;
      readonly right: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>;
      readonly issues: ReadonlyArray<string>;
    }
  | undefined => {
  const issues: string[] = [];
  const { equipment } = bicategory;
  const idMiddle = identityProarrow(equipment, data.f.to);
  const gId = horizontalComposeProarrows(equipment, data.g, idMiddle);
  const start = gId && horizontalComposeProarrows(equipment, gId, data.f);
  const startValid = requireProarrow(issues, start, "(g ∘ 1) ∘ f");
  if (!startValid) {
    return { left: [], right: [], issues };
  }
  const leftAssociator = bicategory.associator(data.g, idMiddle, data.f);
  const leftUnitor = bicategory.leftUnitor(data.f);
  const rightUnitor = bicategory.rightUnitor(data.g);
  const leftCells: Equipment2Cell<Obj, Arr, Payload, Evidence>[] = [];
  if (requireCell(issues, leftAssociator, "α_{g,1,f}")) {
    leftCells.push(leftAssociator);
  }
  if (requireCell(issues, leftUnitor, "λ_f")) {
    const whiskered = whiskerLeftChain(equipment, data.g, leftUnitor);
    if (requireCell(issues, whiskered, "(id_g ⋆ λ_f)")) {
      leftCells.push(whiskered);
    }
  }
  const rightCells: Equipment2Cell<Obj, Arr, Payload, Evidence>[] = [];
  if (requireCell(issues, rightUnitor, "ρ_g")) {
    const whiskered = whiskerRightChain(equipment, rightUnitor, data.f);
    if (requireCell(issues, whiskered, "(ρ_g ⋆ id_f)")) {
      rightCells.push(whiskered);
    }
  }
  return { left: leftCells, right: rightCells, issues };
};

export const analyzeBicategoryTriangle = <Obj, Arr, Payload, Evidence>(
  bicategory: Bicategory<Obj, Arr, Payload, Evidence>,
  data: BicategoryTriangleData<Obj, Payload>,
): StreetComparisonEvaluation<Obj, Arr, Payload, Evidence> => {
  const chains = buildTriangleChains(bicategory, data);
  if (!chains) {
    return {
      holds: false,
      issues: ["Unable to build triangle chains."],
      details: "Triangle chains were unavailable.",
    };
  }
  const issues = [...chains.issues];
  if (chains.left.length === 0 || chains.right.length === 0) {
    return {
      holds: false,
      issues,
      details: issues.join(" ") || "Triangle chains were empty.",
    };
  }
  return evaluateStreetComparison(
    bicategory.equipment,
    chains.left,
    chains.right,
    "Bicategory triangle",
  );
};
