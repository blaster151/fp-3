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

const describeTightLabel = <Obj, Arr>(
  tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
): string =>
  String((tight as unknown as { label?: string }).label ?? "<anonymous tight 1-cell>");

export interface CompanionRestrictionData<Obj, Arr> {
  readonly domain: Obj;
  readonly codomain: Obj;
  readonly tight: Tight1Cell<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>;
}

export const constructCompanionFromRestrictions = <Obj, Arr, Payload, Evidence>(
  equipment: VirtualEquipment<Obj, Arr, Payload, Evidence>,
  data: CompanionRestrictionData<Obj, Arr>,
): CompanionAttempt<Obj, Arr, Payload, Evidence> => {
  const equality = equipment.equalsObjects ?? defaultObjectEquality<Obj>;
  const label = describeTightLabel(data.tight);

  const identity = identityProarrow(equipment, data.codomain);
  const restriction = equipment.restrictions.left(data.tight, identity);

  if (!restriction) {
    return {
      available: false,
      details: `Left restriction B(f,1) for ${label} at codomain ${String(
        data.codomain,
      )} was unavailable.`,
    };
  }

  const { restricted, cartesian, representability } = restriction;

  if (!equality(restricted.from, data.domain)) {
    return {
      available: false,
      details: `Left restriction B(f,1) for ${label} landed at domain ${String(
        restricted.from,
      )} instead of the expected ${String(data.domain)}.`,
    };
  }

  if (!equality(restricted.to, data.codomain)) {
    return {
      available: false,
      details: `Left restriction B(f,1) for ${label} reached codomain ${String(
        restricted.to,
      )} instead of ${String(data.codomain)}.`,
    };
  }

  return {
    available: true,
    proarrow: restricted,
    cartesian,
    ...(representability !== undefined && { representability }),
    details: `Companion for ${label} computed via B(f,1) on the identity loose arrow at ${String(
      data.codomain,
    )}.`,
  };
};

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
  const attempts: string[] = [];
  const label = describeTightLabel(tight);

  for (const domain of equipment.objects) {
    const codomain = tight.onObj(domain);
    const attempt = constructCompanionFromRestrictions(equipment, {
      tight,
      domain,
      codomain,
    });

    if (attempt.available) {
      return attempt;
    }

    attempts.push(
      `Failed to construct companion for ${label} at domain ${String(domain)} → ${String(
        codomain,
      )}: ${attempt.details}`,
    );
  }

  if (attempts.length === 0) {
    return {
      available: false,
      details: `No objects were registered in the equipment, so the companion for ${label} could not be attempted.`,
    };
  }

  return {
    available: false,
    details: attempts.join(" "),
  };
};
