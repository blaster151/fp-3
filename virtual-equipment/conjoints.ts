import {
  defaultObjectEquality,
  identityProarrow,
  type EquipmentCartesian2Cell,
  type EquipmentProarrow,
  type RepresentabilityWitness,
  type VirtualEquipment,
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

const describeTightLabel = <Obj, Arr>(
  tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
): string =>
  String((tight as unknown as { label?: string }).label ?? "<anonymous tight 1-cell>");

export interface ConjointRestrictionData<Obj, Arr> {
  readonly domain: Obj;
  readonly codomain: Obj;
  readonly tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>;
}

export const constructConjointFromRestrictions = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: ConjointRestrictionData<Obj, Arr>,
): ConjointAttempt<Obj, Arr, Payload, Evidence> => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const label = describeTightLabel(data.tight);

  const identity = identityProarrow(equipment, data.domain);
  const restriction = equipment.restrictions.right(identity, data.tight);

  if (!restriction) {
    return {
      available: false,
      details: `Right restriction B(1,f) for ${label} at domain ${String(
        data.domain,
      )} was unavailable.`,
    };
  }

  const { restricted, cartesian, representability } = restriction;

  if (!equality(restricted.from, data.domain)) {
    return {
      available: false,
      details: `Right restriction B(1,f) for ${label} started at ${String(
        restricted.from,
      )} instead of expected domain ${String(data.domain)}.`,
    };
  }

  if (!equality(restricted.to, data.codomain)) {
    return {
      available: false,
      details: `Right restriction B(1,f) for ${label} produced codomain ${String(
        restricted.to,
      )} instead of ${String(data.codomain)}.`,
    };
  }

  return {
    available: true,
    proarrow: restricted,
    cartesian,
    ...(representability !== undefined && { representability }),
    details: `Conjoint for ${label} computed via B(1,f) on the identity loose arrow at ${String(
      data.domain,
    )}.`,
  };
};

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
  const attempts: string[] = [];
  const label = describeTightLabel(tight);

  for (const domain of equipment.objects) {
    const codomain = tight.onObj(domain);
    const attempt = constructConjointFromRestrictions(equipment, {
      tight,
      domain,
      codomain,
    });

    if (attempt.available) {
      return attempt;
    }

    attempts.push(
      `Failed to construct conjoint for ${label} at domain ${String(domain)} → ${String(
        codomain,
      )}: ${attempt.details}`,
    );
  }

  if (attempts.length === 0) {
    return {
      available: false,
      details: `No objects were registered in the equipment, so the conjoint for ${label} could not be attempted.`,
    };
  }

  return {
    available: false,
    details: attempts.join(" "),
  };
};
