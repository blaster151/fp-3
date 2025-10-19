import type {
  Equipment2Cell,
  VirtualEquipment,
} from "./virtual-equipment";
import {
  defaultObjectEquality,
  defaultTight1CellEquality,
  horizontalComposeCells,
  verticalComposeCells,
} from "./virtual-equipment";

export interface StreetCompositeEvaluation<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly composite?: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

const finalizeCompositeEvaluation = <Obj, Arr, Payload, Evidence>(
  label: string,
  issues: ReadonlyArray<string>,
  composite: Equipment2Cell<Obj, Arr, Payload, Evidence> | undefined,
  successDetails: string,
  missingDetails: string,
): StreetCompositeEvaluation<Obj, Arr, Payload, Evidence> => {
  if (issues.length > 0) {
    return {
      holds: false,
      issues,
      details: `${label} issues: ${issues.join("; ")}`,
    };
  }

  if (!composite) {
    return {
      holds: false,
      issues,
      details: `${label} ${missingDetails}`,
    };
  }

  return {
    holds: true,
    issues,
    details: successDetails,
    composite,
  };
};

export const composeVerticalChain = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  chain: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>,
  label: string,
): StreetCompositeEvaluation<Obj, Arr, Payload, Evidence> => {
  if (chain.length === 0) {
    return {
      holds: false,
      issues: [`${label} requires at least one 2-cell.`],
      details: `${label} chain was empty; Street pasting could not be evaluated.`,
    };
  }

  const [head, ...tail] = chain;
  if (head === undefined) {
    return {
      holds: false,
      issues: [`${label} could not determine an initial 2-cell for pasting.`],
      details: `${label} initial 2-cell was undefined; Street pasting aborted.`,
    };
  }

  let composite: Equipment2Cell<Obj, Arr, Payload, Evidence> = head;
  const issues: string[] = [];

  for (const [index, cell] of tail.entries()) {
    const stepLabel = `${label} vertical step #${index + 1}`;
    const next = verticalComposeCells(equipment, cell, composite);
    if (next === undefined) {
      issues.push(
        `${stepLabel} could not be formed; intermediate boundaries did not align for Street pasting.`,
      );
      break;
    }
    composite = next;
  }

  return finalizeCompositeEvaluation(
    label,
    issues,
    issues.length === 0 ? composite : undefined,
    `${label} vertical composite evaluated successfully.`,
    "vertical composite was unavailable; Street pasting could not be evaluated.",
  );
};

export const composeHorizontalChain = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  chain: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>,
  label: string,
): StreetCompositeEvaluation<Obj, Arr, Payload, Evidence> => {
  if (chain.length === 0) {
    return {
      holds: false,
      issues: [`${label} requires at least one 2-cell.`],
      details: `${label} slice was empty; Street pasting could not be evaluated.`,
    };
  }

  const [head, ...tail] = chain;
  if (head === undefined) {
    return {
      holds: false,
      issues: [`${label} could not determine an initial 2-cell for pasting.`],
      details: `${label} initial 2-cell was undefined; Street pasting aborted.`,
    };
  }

  let composite: Equipment2Cell<Obj, Arr, Payload, Evidence> = head;
  const issues: string[] = [];

  for (const [index, cell] of tail.entries()) {
    const stepLabel = `${label} horizontal step #${index + 1}`;
    const next = horizontalComposeCells(equipment, cell, composite);
    if (next === undefined) {
      issues.push(
        `${stepLabel} could not be formed; intermediate frames did not align for Street pasting.`,
      );
      break;
    }
    composite = next;
  }

  return finalizeCompositeEvaluation(
    label,
    issues,
    issues.length === 0 ? composite : undefined,
    `${label} horizontal composite evaluated successfully.`,
    "horizontal composite was unavailable; Street pasting could not be evaluated.",
  );
};

const evaluatePastingSide = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  pasting: ReadonlyArray<ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>>,
  label: string,
): {
  readonly evaluation: StreetCompositeEvaluation<Obj, Arr, Payload, Evidence>;
  readonly composites: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>;
} => {
  const horizontalEvaluations = pasting.map((row, index) =>
    composeHorizontalChain(
      equipment,
      row,
      `${label} horizontal slice #${index + 1}`,
    ),
  );

  const composites = horizontalEvaluations
    .map((result) => result.composite)
    .filter((candidate): candidate is Equipment2Cell<Obj, Arr, Payload, Evidence> => candidate !== undefined);

  const issues = horizontalEvaluations.flatMap((result) => result.issues);

  if (composites.length !== pasting.length) {
    return {
      evaluation: finalizeCompositeEvaluation(
        label,
        issues,
        undefined,
        `${label} pasting evaluated successfully.`,
        "pasting composite was unavailable; Street pasting could not be evaluated.",
      ),
      composites,
    };
  }

  const vertical = composeVerticalChain(
    equipment,
    composites,
    label,
  );

  const combinedIssues = [...issues, ...vertical.issues];
  return {
    evaluation: finalizeCompositeEvaluation(
      label,
      combinedIssues,
      combinedIssues.length === 0 ? vertical.composite : undefined,
      `${label} pasting evaluated successfully.`,
      "pasting composite was unavailable; Street pasting could not be evaluated.",
    ),
    composites,
  };
};

const compareFrames = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  label: string,
  frameLabel: string,
  red: Equipment2Cell<Obj, Arr, Payload, Evidence>["source"],
  green: Equipment2Cell<Obj, Arr, Payload, Evidence>["source"],
): string[] => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const differences: string[] = [];

  if (!equality(red.leftBoundary, green.leftBoundary)) {
    differences.push(
      `${label} ${frameLabel} frame left boundary mismatch: red=${String(
        red.leftBoundary,
      )}, green=${String(green.leftBoundary)}.`,
    );
  }

  if (!equality(red.rightBoundary, green.rightBoundary)) {
    differences.push(
      `${label} ${frameLabel} frame right boundary mismatch: red=${String(
        red.rightBoundary,
      )}, green=${String(green.rightBoundary)}.`,
    );
  }

  if (red.arrows.length !== green.arrows.length) {
    differences.push(
      `${label} ${frameLabel} frame arrow count mismatch: red=${red.arrows.length}, green=${green.arrows.length}.`,
    );
    return differences;
  }

  red.arrows.forEach((arrow, index) => {
    const counterpart = green.arrows[index];
    if (!counterpart) {
      differences.push(
        `${label} ${frameLabel} frame is missing the arrow at position ${index}.`,
      );
      return;
    }
    if (!equality(arrow.from, counterpart.from)) {
      differences.push(
        `${label} ${frameLabel} frame arrow #${index + 1} domain mismatch: red=${String(
          arrow.from,
        )}, green=${String(counterpart.from)}.`,
      );
    }
    if (!equality(arrow.to, counterpart.to)) {
      differences.push(
        `${label} ${frameLabel} frame arrow #${index + 1} codomain mismatch: red=${String(
          arrow.to,
        )}, green=${String(counterpart.to)}.`,
      );
    }
  });

  return differences;
};

const compareVerticalBoundaries = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  label: string,
  side: "left" | "right",
  red: Equipment2Cell<Obj, Arr, Payload, Evidence>["boundaries"]["left"],
  green: Equipment2Cell<Obj, Arr, Payload, Evidence>["boundaries"]["left"],
): string[] => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const equalsTight = equipment.tight.equals1Cell ?? defaultTight1CellEquality<Obj, Arr>;
  const differences: string[] = [];

  if (!equality(red.from, green.from)) {
    differences.push(
      `${label} ${side} boundary source mismatch: red=${String(red.from)}, green=${String(green.from)}.`,
    );
  }

  if (!equality(red.to, green.to)) {
    differences.push(
      `${label} ${side} boundary target mismatch: red=${String(red.to)}, green=${String(green.to)}.`,
    );
  }

  if (!equalsTight(red.tight, green.tight)) {
    differences.push(`${label} ${side} boundary tight witnesses differ.`);
  }

  return differences;
};

const compareStreetComposites = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  label: string,
  red: Equipment2Cell<Obj, Arr, Payload, Evidence>,
  green: Equipment2Cell<Obj, Arr, Payload, Evidence>,
): { readonly holds: boolean; readonly issues: ReadonlyArray<string> } => {
  const issues = [
    ...compareFrames(equipment, label, "source", red.source, green.source),
    ...compareFrames(equipment, label, "target", red.target, green.target),
    ...compareVerticalBoundaries(equipment, label, "left", red.boundaries.left, green.boundaries.left),
    ...compareVerticalBoundaries(
      equipment,
      label,
      "right",
      red.boundaries.right,
      green.boundaries.right,
    ),
  ];

  return {
    holds: issues.length === 0,
    issues,
  };
};

export interface StreetComparisonEvaluation<
  Obj,
  Arr,
  Payload,
  Evidence,
> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly red?: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly green?: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

export const evaluateStreetComparison = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  redChain: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>,
  greenChain: ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>,
  label: string,
): StreetComparisonEvaluation<Obj, Arr, Payload, Evidence> =>
  evaluateStreetPastingComparison(
    equipment,
    redChain.map((cell) => [cell]),
    greenChain.map((cell) => [cell]),
    label,
  );

export const evaluateStreetPastingComparison = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  redPasting: ReadonlyArray<ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>>,
  greenPasting: ReadonlyArray<ReadonlyArray<Equipment2Cell<Obj, Arr, Payload, Evidence>>>,
  label: string,
): StreetComparisonEvaluation<Obj, Arr, Payload, Evidence> => {
  const red = evaluatePastingSide(
    equipment,
    redPasting,
    `${label} (red)`,
  );
  const green = evaluatePastingSide(
    equipment,
    greenPasting,
    `${label} (green)`,
  );
  const issues = [...red.evaluation.issues, ...green.evaluation.issues];
  const redComposite = red.evaluation.composite;
  const greenComposite = green.evaluation.composite;

  if (!redComposite) {
    issues.push(`${label} (red) composite was unavailable.`);
  }

  if (!greenComposite) {
    issues.push(`${label} (green) composite was unavailable.`);
  }

  if (redComposite && greenComposite) {
    const comparison = compareStreetComposites(
      equipment,
      label,
      redComposite,
      greenComposite,
    );
    issues.push(...comparison.issues);
  }

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? `${label} red/green pastings coincide.`
      : `${label} comparison issues: ${issues.join("; ")}`,
    ...(redComposite && { red: redComposite }),
    ...(greenComposite && { green: greenComposite }),
  };
};
