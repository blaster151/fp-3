import type {
  EquipmentCartesian2Cell,
  EquipmentProarrow,
  RepresentabilityWitness,
  VirtualEquipment,
} from "./virtual-equipment";
import type { Tight1Cell, TightCategory } from "./tight-primitives";

/**
 * Result signature mirroring {@link CompanionAttempt} but for conjoints.  The
 * symmetry keeps downstream APIs uniform.
 */
export interface ConjointAttempt<Obj, Arr, Payload, Evidence> {
  readonly available: boolean;
  readonly proarrow?: EquipmentProarrow<Obj, Payload>;
  readonly cartesian?: EquipmentCartesian2Cell<Obj, Arr, Payload, Evidence>;
  readonly representability?: RepresentabilityWitness<Obj, Arr>;
  readonly details: string;
}

export type ConjointBuilder<
  Obj,
  Arr,
  Payload,
  Evidence,
> = (
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
) => ConjointAttempt<Obj, Arr, Payload, Evidence>;

export const pendingConjoint = <Obj, Arr, Payload, Evidence>(
  label: string,
): ConjointBuilder<Obj, Arr, Payload, Evidence> => (_equipment, tight) => ({
  available: false,
  details: `Conjoint for ${label} is pending implementation. Tight 1-cell tag: ${String(
    (tight as unknown as { label?: string }).label ?? "<anonymous tight 1-cell>",
  )}.`,
});

export const conjointViaIdentityRestrictions = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
): ConjointAttempt<Obj, Arr, Payload, Evidence> => {
  const attempts: ConjointAttempt<Obj, Arr, Payload, Evidence>[] = [];
  for (const object of equipment.objects) {
    const identity = equipment.proarrows.identity(object);
    const restriction = equipment.restrictions.right(identity, tight);
    if (restriction) {
      return {
        available: true,
        proarrow: restriction.restricted,
        cartesian: restriction.cartesian,
        representability: restriction.representability,
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
