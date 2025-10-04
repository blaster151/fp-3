import type {
  Equipment2Cell,
  EquipmentVerticalBoundary,
} from "../virtual-equipment";
import {
  defaultObjectEquality,
  identityVerticalBoundary,
  verticalBoundariesEqual,
} from "../virtual-equipment";
import type { RelativeMonadData } from "./relative-monads";

export interface RelativeOpalgebraData<Obj, Arr, Payload, Evidence> {
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly action: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeAlgebraData<Obj, Arr, Payload, Evidence> {
  readonly carrier: EquipmentVerticalBoundary<Obj, Arr>;
  readonly action: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly details?: string;
}

export interface RelativeKleisliPresentation<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly opalgebra: RelativeOpalgebraData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeEilenbergMoorePresentation<Obj, Arr, Payload, Evidence> {
  readonly monad: RelativeMonadData<Obj, Arr, Payload, Evidence>;
  readonly algebra: RelativeAlgebraData<Obj, Arr, Payload, Evidence>;
}

export interface RelativeUniversalPropertyReport {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
}

const ensureBoundary = <Obj, Arr>(
  equality: (left: Obj, right: Obj) => boolean,
  actual: EquipmentVerticalBoundary<Obj, Arr>,
  expected: EquipmentVerticalBoundary<Obj, Arr>,
  label: string,
  issues: string[],
): void => {
  if (!verticalBoundariesEqual(equality, actual, expected)) {
    issues.push(`${label} must reuse the specified tight boundary.`);
  }
};

export const analyzeRelativeKleisliUniversalProperty = <Obj, Arr, Payload, Evidence>(
  presentation: RelativeKleisliPresentation<Obj, Arr, Payload, Evidence>,
): RelativeUniversalPropertyReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    presentation.opalgebra.action.boundaries.left,
    presentation.monad.root,
    "Relative opalgebra action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.opalgebra.action.boundaries.right,
    presentation.opalgebra.carrier,
    "Relative opalgebra action right boundary",
    issues,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Relative Kleisli presentation reuses the root and opalgebra carrier boundaries."
      : `Relative Kleisli presentation issues: ${issues.join("; ")}`,
  };
};

export const analyzeRelativeEilenbergMooreUniversalProperty = <Obj, Arr, Payload, Evidence>(
  presentation: RelativeEilenbergMoorePresentation<Obj, Arr, Payload, Evidence>,
): RelativeUniversalPropertyReport => {
  const equality =
    presentation.monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  ensureBoundary(
    equality,
    presentation.algebra.action.boundaries.left,
    presentation.algebra.carrier,
    "Relative algebra action left boundary",
    issues,
  );
  ensureBoundary(
    equality,
    presentation.algebra.action.boundaries.right,
    presentation.monad.carrier,
    "Relative algebra action right boundary",
    issues,
  );

  const holds = issues.length === 0;
  return {
    holds,
    issues,
    details: holds
      ? "Relative Eilenberg–Moore presentation reuses the algebra carrier and monad carrier boundaries."
      : `Relative Eilenberg–Moore presentation issues: ${issues.join("; ")}`,
  };
};

export const describeTrivialRelativeKleisli = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeKleisliPresentation<Obj, Arr, Payload, Evidence> => {
  const carrier = identityVerticalBoundary(
    monad.equipment,
    monad.carrier.to,
    "Trivial relative Kleisli carrier chosen as the identity boundary on cod(t).",
  );
  return {
    monad,
    opalgebra: {
      carrier,
      action: monad.unit,
      details: "Trivial relative opalgebra uses the monad unit as its action.",
    },
  };
};

export const describeTrivialRelativeEilenbergMoore = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonadData<Obj, Arr, Payload, Evidence>,
): RelativeEilenbergMoorePresentation<Obj, Arr, Payload, Evidence> => ({
  monad,
  algebra: {
    carrier: monad.carrier,
    action: monad.extension,
    details:
      "Trivial relative algebra uses the monad extension as its multiplication.",
  },
});
