import type {
  Equipment2Cell,
  VirtualEquipment,
} from "./virtual-equipment";
import { horizontalComposeCells, verticalComposeCells } from "./virtual-equipment";

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

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? `${label} vertical composite evaluated successfully.`
      : `${label} vertical composite failed: ${issues.join("; ")}`,
    ...(holds && { composite }),
  };
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

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? `${label} horizontal composite evaluated successfully.`
      : `${label} horizontal composite failed: ${issues.join("; ")}`,
    ...(holds && { composite }),
  };
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
      evaluation: {
        holds: false,
        issues,
        details:
          issues.length === 0
            ? `${label} horizontal composites were unavailable; Street pasting could not be evaluated.`
            : `${label} horizontal composites failed: ${issues.join("; ")}`,
      },
      composites,
    };
  }

  const vertical = composeVerticalChain(
    equipment,
    composites,
    label,
  );

  return {
    evaluation: {
      holds: vertical.holds && issues.length === 0,
      issues: [...issues, ...vertical.issues],
      details:
        vertical.holds && issues.length === 0
          ? `${label} pasting evaluated successfully.`
          : `${label} pasting issues: ${[...issues, ...vertical.issues].join("; ")}`,
      ...(vertical.composite && { composite: vertical.composite }),
    },
    composites,
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
  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? `${label} red/green pastings evaluated successfully.`
      : `${label} comparison issues: ${issues.join("; ")}`,
    ...(red.evaluation.composite && { red: red.evaluation.composite }),
    ...(green.evaluation.composite && { green: green.evaluation.composite }),
  };
};
