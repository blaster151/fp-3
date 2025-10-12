import type {
  EquipmentCartesian2Cell,
  EquipmentProarrow,
  RepresentabilityWitness,
  VirtualEquipment,
} from "./virtual-equipment";
import type { Tight1Cell, TightCategory } from "./tight-primitives";

/**
 * Result returned by companion builders.  `available` reports whether a
 * companion exists; `details` captures diagnostic information so future oracle
 * integrations can explain failures.
 */
export interface CompanionAttempt<Obj, Arr, Payload, Evidence> {
  readonly available: boolean;
  readonly proarrow?: EquipmentProarrow<Obj, Payload>;
  readonly cartesian?: EquipmentCartesian2Cell<Obj, Arr, Payload, Evidence>;
  readonly representability?: RepresentabilityWitness<Obj, Arr>;
  readonly details: string;
}

/**
 * Companion builders receive the ambient equipment and the tight 1-cell whose
 * companion is sought.  They either return a proarrow or describe why the
 * companion is unavailable.
 */
export type CompanionBuilder<
  Obj,
  Arr,
  Payload,
  Evidence,
> = (
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
) => CompanionAttempt<Obj, Arr, Payload, Evidence>;

/**
 * Placeholder helper used until concrete companion constructors land.  Builders
 * produced by this function always report `available: false` but still describe
 * the requested tight cell for traceability.
 */
export const pendingCompanion = <Obj, Arr, Payload, Evidence>(
  label: string,
): CompanionBuilder<Obj, Arr, Payload, Evidence> => (_equipment, tight) => ({
  available: false,
  details: `Companion for ${label} is pending implementation. Tight 1-cell tag: ${String(
    (tight as unknown as { label?: string }).label ?? "<anonymous tight 1-cell>",
  )}.`,
});

export const companionViaIdentityRestrictions = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
): CompanionAttempt<Obj, Arr, Payload, Evidence> => {
  const attempts: CompanionAttempt<Obj, Arr, Payload, Evidence>[] = [];
  for (const object of equipment.objects) {
    const identity = equipment.proarrows.identity(object);
    const restriction = equipment.restrictions.left(tight, identity);
    if (restriction) {
      return {
        available: true,
        proarrow: restriction.restricted,
        cartesian: restriction.cartesian,
        ...(restriction.representability !== undefined && { representability: restriction.representability }),
        details: restriction.details,
      };
    }
    attempts.push({
      available: false,
      details: `Restriction along ${String(
        (tight as unknown as { label?: string }).label ?? "<anonymous tight 1-cell>",
      )} failed at object ${String(object)}.`,
    });
  }

  if (attempts.length === 0) {
    return {
      available: false,
      details: "No objects were registered in the equipment, so no restriction attempts were possible.",
    };
  }

  return {
    available: false,
    details: attempts.map((attempt) => attempt.details).join(" "),
  };
};
