import type {
  Equipment2Cell,
  EquipmentProarrow,
  EquipmentVerticalBoundary,
  ObjectEquality,
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

const ensureBoundary = <Obj, Arr>(
  equality: ObjectEquality<Obj>,
  actual: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
  issues: string[],
): void => {
  if (!verticalBoundariesEqual(equality, actual, expected)) {
    issues.push(`${label} must reuse the expected tight boundary.`);
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
  if (!arrow) {
    issues.push(`${label} arrow is missing after length check.`);
    return;
  }
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
      "Corepresentability witness must arise from a right restriction B(1,j) so the corepresentability criterion holds (dual form).",
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

export interface RelativeEnrichedComonadWitness<Obj, Arr, Payload, Evidence> {
  readonly comonad: RelativeComonadData<Obj, Arr, Payload, Evidence>;
  readonly cohomObject: EquipmentVerticalBoundary<Obj, Arr>;
  readonly cotensorComparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly counitComparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly coextensionComparison: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeEnrichedComonadReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeEnrichedComonadWitness<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeEnrichedComonad = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeEnrichedComonadWitness<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedComonadReport<Obj, Arr, Payload, Evidence> => {
  const { comonad, cohomObject, cotensorComparison, counitComparison, coextensionComparison } = witness;
  const equality = comonad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(cohomObject.from, comonad.carrier.from)) {
    issues.push("Enriched cohom object must originate at the relative comonad carrier object.");
  }
  if (!equality(cohomObject.to, comonad.root.to)) {
    issues.push("Enriched cohom object must land at the relative comonad root object.");
  }

  ensureBoundary(
    equality,
    cotensorComparison.boundaries.left,
    comonad.carrier,
    "Cotensor comparison left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    cotensorComparison.boundaries.right,
    cohomObject,
    "Cotensor comparison right boundary",
    issues,
  );

  ensureBoundary(
    equality,
    counitComparison.boundaries.left,
    comonad.carrier,
    "Enriched counit left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    counitComparison.boundaries.right,
    comonad.root,
    "Enriched counit right boundary",
    issues,
  );

  ensureBoundary(
    equality,
    coextensionComparison.boundaries.left,
    comonad.carrier,
    "Enriched coextension left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    coextensionComparison.boundaries.right,
    comonad.root,
    "Enriched coextension right boundary",
    issues,
  );

  if (counitComparison !== comonad.counit) {
    issues.push("Enriched counit comparison must reuse the relative comonad counit witness.");
  }

  if (coextensionComparison !== comonad.coextension) {
    issues.push("Enriched coextension comparison must reuse the relative comonad coextension witness.");
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? witness.details ??
        "Relative comonad enrichment reuses the counit and coextension witnesses (dual formulation)."
      : `Relative enriched comonad issues: ${issues.join("; ")}`,
    witness,
  };
};

export const describeRelativeEnrichedComonadWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  comonad: RelativeComonadData<Obj, Arr, Payload, Evidence>,
): RelativeEnrichedComonadWitness<Obj, Arr, Payload, Evidence> => ({
  comonad,
  cohomObject: comonad.carrier,
  cotensorComparison: comonad.coextension,
  counitComparison: comonad.counit,
  coextensionComparison: comonad.coextension,
  details:
    "Enriched relative comonad witness defaults to carrier, counit, and coextension comparisons required by the enrichment criterion.",
});

export interface RelativeComonadCoopAlgebraDiagrams<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly coassociativity: {
    readonly viaCoextension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
    readonly viaComonad: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  };
  readonly counit: {
    readonly viaCoextension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
    readonly viaCounit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  };
}

export interface RelativeComonadCoopAlgebraWitness<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly enriched: RelativeEnrichedComonadWitness<Obj, Arr, Payload, Evidence>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly coextension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly diagrams: RelativeComonadCoopAlgebraDiagrams<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeComonadCoopAlgebraReport<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeComonadCoopAlgebraWitness<Obj, Arr, Payload, Evidence>;
  readonly enrichment: RelativeEnrichedComonadReport<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeComonadCoopAlgebra = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  witness: RelativeComonadCoopAlgebraWitness<Obj, Arr, Payload, Evidence>,
): RelativeComonadCoopAlgebraReport<Obj, Arr, Payload, Evidence> => {
  const { enriched, carrier, coextension, diagrams } = witness;
  const enrichment = analyzeRelativeEnrichedComonad(enriched);
  const equality =
    enriched.comonad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues = [...enrichment.issues];

  ensureBoundary(
    equality,
    carrier,
    enriched.comonad.carrier,
    "Coop-algebra carrier boundary",
    issues,
  );

  ensureBoundary(
    equality,
    coextension.boundaries.left,
    enriched.comonad.carrier,
    "Coop-algebra coextension left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    coextension.boundaries.right,
    enriched.comonad.root,
    "Coop-algebra coextension right boundary",
    issues,
  );

  if (coextension !== enriched.coextensionComparison) {
    issues.push(
      "Coop-algebra coextension must reuse the enriched coextension comparison witness.",
    );
  }

  const { coassociativity, counit } = diagrams;

  ensureBoundary(
    equality,
    coassociativity.viaCoextension.boundaries.left,
    enriched.comonad.carrier,
    "Coop-algebra coassociativity left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    coassociativity.viaCoextension.boundaries.right,
    enriched.comonad.root,
    "Coop-algebra coassociativity right boundary",
    issues,
  );

  if (coassociativity.viaComonad !== enriched.coextensionComparison) {
    issues.push(
      "Coop-algebra coassociativity comparison must reuse the enriched coextension witness.",
    );
  }
  if (coassociativity.viaCoextension !== coassociativity.viaComonad) {
    issues.push("Coop-algebra coassociativity diagram must commute.");
  }

  ensureBoundary(
    equality,
    counit.viaCoextension.boundaries.left,
    enriched.comonad.carrier,
    "Coop-algebra counit left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    counit.viaCoextension.boundaries.right,
    enriched.comonad.root,
    "Coop-algebra counit right boundary",
    issues,
  );

  if (counit.viaCounit !== enriched.counitComparison) {
    issues.push(
      "Coop-algebra counit comparison must reuse the enriched counit witness.",
    );
  }
  if (counit.viaCoextension !== counit.viaCounit) {
    issues.push("Coop-algebra counit diagram must commute.");
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues: holds ? [] : issues,
    details: holds
      ? witness.details ??
        "Relative comonad coopalgebra reuses the enriched coextension and counit witnesses (dual formulation)."
      : `Relative enriched coopalgebra issues: ${issues.join("; ")}`,
    witness,
    enrichment,
  };
};

export const describeRelativeComonadCoopAlgebraWitness = <
  Obj,
  Arr,
  Payload,
  Evidence,
>(
  enriched: RelativeEnrichedComonadWitness<Obj, Arr, Payload, Evidence>,
): RelativeComonadCoopAlgebraWitness<Obj, Arr, Payload, Evidence> => ({
  enriched,
  carrier: enriched.comonad.carrier,
  coextension: enriched.coextensionComparison,
  diagrams: {
    coassociativity: {
      viaCoextension: enriched.coextensionComparison,
      viaComonad: enriched.coextensionComparison,
    },
    counit: {
      viaCoextension: enriched.coextensionComparison,
      viaCounit: enriched.counitComparison,
    },
  },
  details:
    "Relative comonad coopalgebra witness defaults to carrier, coextension, and counit comparisons reused from the enrichment data.",
});

export interface RelativeComoduleDiagrams<Obj, Arr, Payload, Evidence> {
  readonly coassociativity: {
    readonly viaCoaction: Equipment2Cell<Obj, Arr, Payload, Evidence>;
    readonly viaComonad: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  };
  readonly counit: {
    readonly viaCoaction: Equipment2Cell<Obj, Arr, Payload, Evidence>;
    readonly viaCounit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  };
}

export interface RelativeComoduleWitness<Obj, Arr, Payload, Evidence> {
  readonly comonad: RelativeComonadData<Obj, Arr, Payload, Evidence>;
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly coaction: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly diagrams: RelativeComoduleDiagrams<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeComoduleReport<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly witness: RelativeComoduleWitness<Obj, Arr, Payload, Evidence>;
}

export const analyzeRelativeComodule = <Obj, Arr, Payload, Evidence>(
  witness: RelativeComoduleWitness<Obj, Arr, Payload, Evidence>,
): RelativeComoduleReport<Obj, Arr, Payload, Evidence> => {
  const { comonad, carrier, coaction, diagrams } = witness;
  const equality = comonad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    carrier,
    comonad.carrier,
    "Comodule carrier boundary",
    issues,
  );

  ensureBoundary(
    equality,
    coaction.boundaries.left,
    carrier,
    "Comodule coaction left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    coaction.boundaries.right,
    comonad.root,
    "Comodule coaction right boundary",
    issues,
  );

  const { coassociativity, counit } = diagrams;

  ensureBoundary(
    equality,
    coassociativity.viaCoaction.boundaries.left,
    carrier,
    "Comodule coassociativity via coaction left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    coassociativity.viaCoaction.boundaries.right,
    comonad.root,
    "Comodule coassociativity via coaction right boundary",
    issues,
  );
  ensureBoundary(
    equality,
    coassociativity.viaComonad.boundaries.left,
    carrier,
    "Comodule coassociativity via comonad left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    coassociativity.viaComonad.boundaries.right,
    comonad.root,
    "Comodule coassociativity via comonad right boundary",
    issues,
  );

  if (coassociativity.viaComonad !== comonad.coextension) {
    issues.push(
      "Comodule coassociativity comparison must reuse the relative comonad coextension witness.",
    );
  }
  if (coassociativity.viaCoaction !== coassociativity.viaComonad) {
    issues.push("Comodule coassociativity diagram must commute.");
  }

  ensureBoundary(
    equality,
    counit.viaCoaction.boundaries.left,
    carrier,
    "Comodule counit via coaction left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    counit.viaCoaction.boundaries.right,
    comonad.root,
    "Comodule counit via coaction right boundary",
    issues,
  );
  ensureBoundary(
    equality,
    counit.viaCounit.boundaries.left,
    carrier,
    "Comodule counit via counit left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    counit.viaCounit.boundaries.right,
    comonad.root,
    "Comodule counit via counit right boundary",
    issues,
  );

  if (counit.viaCounit !== comonad.counit) {
    issues.push("Comodule counit comparison must reuse the relative comonad counit witness.");
  }
  if (counit.viaCoaction !== counit.viaCounit) {
    issues.push("Comodule counit diagram must commute.");
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues: holds ? [] : issues,
    details: holds
      ? witness.details ??
        "Relative comodule coaction reuses the comonad coextension and counit witnesses."
      : `Relative comodule issues: ${issues.join("; ")}`,
    witness,
  };
};

export const describeTrivialRelativeComoduleWitness = <Obj, Arr, Payload, Evidence>(
  comonad: RelativeComonadData<Obj, Arr, Payload, Evidence>,
): RelativeComoduleWitness<Obj, Arr, Payload, Evidence> => ({
  comonad,
  carrier: comonad.carrier,
  coaction: comonad.counit,
  diagrams: {
    coassociativity: {
      viaCoaction: comonad.coextension,
      viaComonad: comonad.coextension,
    },
    counit: {
      viaCoaction: comonad.counit,
      viaCounit: comonad.counit,
    },
  },
  details: "Trivial relative comodule induced by the identity-root relative comonad.",
});
