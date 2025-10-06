import {
  defaultObjectEquality,
  type Equipment2Cell,
  type EquipmentProarrow,
  type EquipmentVerticalBoundary,
  type VirtualEquipment,
} from "../virtual-equipment/virtual-equipment";

/**
 * Minimal data required to present a j-relative monad inside the virtual
 * equipment layer.  The generics allow downstream code to thread the precise
 * tight 1-cells used for the root and carrier while reusing the same
 * structural fields across analyzers.
 */
export interface RelativeMonad<
  Obj,
  Arr,
  Payload,
  Evidence,
  Root extends EquipmentVerticalBoundary<Obj, Arr> = EquipmentVerticalBoundary<Obj, Arr>,
  Carrier extends EquipmentVerticalBoundary<Obj, Arr> = EquipmentVerticalBoundary<Obj, Arr>,
> {
  readonly equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>;
  readonly root: Root;
  readonly carrier: Carrier;
  readonly looseCell: EquipmentProarrow<Obj, Payload>;
  readonly extension: Equipment2Cell<Obj, Arr, Payload, Evidence>;
  readonly unit: Equipment2Cell<Obj, Arr, Payload, Evidence>;
}

/**
 * Alias that mirrors the {@code CatMonad<C>} style naming from the classical
 * code paths.  The parameters indicate that the monad lives over the objects
 * and arrows supplied by the surrounding virtual equipment.
 */
export type RelativeMonadOn<Obj, Arr, Payload, Evidence> = RelativeMonad<
  Obj,
  Arr,
  Payload,
  Evidence
>;

/**
 * Result returned by the current placeholder helpers for the relative monad
 * extension and Kleisli actions.  The helpers focus on plumbing boundary
 * checks while the concrete Street-style composites remain future work.
 */
export interface RelativeMonadActionResult<Obj, Arr, Payload, Evidence> {
  readonly holds: boolean;
  readonly pending: boolean;
  readonly details: string;
  readonly monad: RelativeMonad<Obj, Arr, Payload, Evidence>;
  readonly morphism: EquipmentProarrow<Obj, Payload>;
  readonly expectedSource: Obj;
  readonly expectedTarget: Obj;
  readonly issues: ReadonlyArray<string>;
  readonly result?: EquipmentProarrow<Obj, Payload>;
}

/**
 * Shape of a morphism j a → t b used when requesting an extension application
 * from a relative monad.  Concrete analyzers will eventually insist that the
 * domains and codomains line up with the supplied monad data.
 */
export interface RelativeMonadActionInput<Obj, Payload> {
  readonly from: Obj;
  readonly to: Obj;
  readonly arrow: EquipmentProarrow<Obj, Payload>;
}

const actionPendingDetails =
  "Relative monad action helpers validate boundary alignment and record the supplied morphism; Street-style composites remain pending until the 2-cell calculus lands.";

/**
 * Placeholder for the relative extension operator.  The helper advertises the
 * intended API and records the monad/morphism pair so analyzers can thread the
 * same data into future witnesses even before the 2-cell calculus lands.
 */
export const relativeExtend = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonad<Obj, Arr, Payload, Evidence>,
  morphism: RelativeMonadActionInput<Obj, Payload>,
): RelativeMonadActionResult<Obj, Arr, Payload, Evidence> => {
  const equality = monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(morphism.from, monad.root.from)) {
    issues.push("Relative extend expects the supplied arrow to start at dom(j).");
  }
  if (!equality(morphism.to, monad.carrier.to)) {
    issues.push("Relative extend expects the supplied arrow to land at cod(t).");
  }

  const holds = issues.length === 0;
  const details = holds
    ? actionPendingDetails
    : `${actionPendingDetails} Pending issues: ${issues.join("; ")}`;

  return {
    holds,
    pending: true,
    details,
    monad,
    morphism: morphism.arrow,
    expectedSource: monad.carrier.from,
    expectedTarget: monad.carrier.to,
    issues,
  };
};

/**
 * Placeholder for the relative Kleisli composition helper.  Matching the
 * extension helper keeps the ergonomics close to the classical monad API while
 * signalling that the concrete Street composite is still future work.
 */
export const relativeKleisli = <Obj, Arr, Payload, Evidence>(
  monad: RelativeMonad<Obj, Arr, Payload, Evidence>,
  morphism: RelativeMonadActionInput<Obj, Payload>,
): RelativeMonadActionResult<Obj, Arr, Payload, Evidence> => {
  const equality = monad.equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const issues: string[] = [];

  if (!equality(morphism.from, monad.carrier.from)) {
    issues.push("Relative Kleisli expects the supplied arrow to start at dom(t).");
  }
  if (!equality(morphism.to, monad.carrier.to)) {
    issues.push("Relative Kleisli expects the supplied arrow to land at cod(t).");
  }

  const holds = issues.length === 0;
  const details = holds
    ? actionPendingDetails
    : `${actionPendingDetails} Pending issues: ${issues.join("; ")}`;

  return {
    holds,
    pending: true,
    details,
    monad,
    morphism: morphism.arrow,
    expectedSource: monad.carrier.from,
    expectedTarget: monad.carrier.to,
    issues,
  };
};

