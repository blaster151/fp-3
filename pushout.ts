import type { FiniteCategory } from "./finite-cat";

/**
 * Data witnessing a pushout square for f:X→A and h:X→Z.
 *
 * Historically the toolkit exposed the fields as { apex, fromDomain, fromAnchor }:
 *  - `apex` is the codomain Q of the two injections,
 *  - `fromDomain` is the arrow A→Q induced from the codomain of f,
 *  - `fromAnchor` is the arrow Z→Q induced from the codomain of h.
 *
 * During the refactor that introduced the finite pushout fixtures we temporarily
 * renamed these to the more pushout-diagram flavoured { Q, iA, iZ }.  That made it
 * harder to compare the coslice reindexing code with its pullback counterpart,
 * so we now surface both views simultaneously for clarity and backwards
 * compatibility.
 */
export interface PushoutData<Obj, Arr> {
  readonly apex: Obj;
  readonly fromDomain: Arr;
  readonly fromAnchor: Arr;
  readonly Q: Obj;
  readonly iA: Arr;
  readonly iZ: Arr;
}

export interface PushoutCoconeFactorResult<Arr> {
  readonly factored: boolean;
  readonly mediator?: Arr;
  readonly reason?: string;
}

export interface PushoutCertification<Obj, Arr> {
  readonly valid: boolean;
  readonly reason?: string;
  readonly coconesChecked: ReadonlyArray<PushoutData<Obj, Arr>>;
}

export interface PushoutCalc<Obj, Arr> {
  pushout(f: Arr, h: Arr): PushoutData<Obj, Arr>;
  factorCocone(target: PushoutData<Obj, Arr>, cocone: PushoutData<Obj, Arr>): PushoutCoconeFactorResult<Arr>;
  certify(f: Arr, h: Arr, candidate: PushoutData<Obj, Arr>): PushoutCertification<Obj, Arr>;
  coinduce(
    j: Arr,
    pushoutOfDst: PushoutData<Obj, Arr>,
    pushoutOfSrc: PushoutData<Obj, Arr>,
  ): Arr;
}

export const factorPushoutCocone = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  target: PushoutData<Obj, Arr>,
  cocone: PushoutData<Obj, Arr>,
): PushoutCoconeFactorResult<Arr> => {
  if (base.dst(target.fromDomain) !== target.apex) {
    return {
      factored: false,
      reason: "factorPushoutCocone: target domain leg must land in its apex.",
    };
  }
  if (base.dst(target.fromAnchor) !== target.apex) {
    return {
      factored: false,
      reason: "factorPushoutCocone: target anchor leg must land in its apex.",
    };
  }
  if (base.dst(cocone.fromDomain) !== cocone.apex) {
    return {
      factored: false,
      reason: "factorPushoutCocone: cocone domain leg must land in its apex.",
    };
  }
  if (base.dst(cocone.fromAnchor) !== cocone.apex) {
    return {
      factored: false,
      reason: "factorPushoutCocone: cocone anchor leg must land in its apex.",
    };
  }

  if (base.src(target.fromDomain) !== base.src(cocone.fromDomain)) {
    return {
      factored: false,
      reason: "factorPushoutCocone: domain legs must share their source object.",
    };
  }
  if (base.src(target.fromAnchor) !== base.src(cocone.fromAnchor)) {
    return {
      factored: false,
      reason: "factorPushoutCocone: anchor legs must share their source object.",
    };
  }

  let mediator: Arr | undefined;
  for (const arrow of base.arrows) {
    if (base.src(arrow) !== target.apex || base.dst(arrow) !== cocone.apex) continue;
    const viaDomain = base.compose(arrow, target.fromDomain);
    if (!base.eq(viaDomain, cocone.fromDomain)) continue;
    const viaAnchor = base.compose(arrow, target.fromAnchor);
    if (!base.eq(viaAnchor, cocone.fromAnchor)) continue;
    if (mediator && !base.eq(mediator, arrow)) {
      return {
        factored: false,
        reason: "factorPushoutCocone: multiple mediating arrows satisfy the pushout conditions.",
      };
    }
    mediator = mediator ?? arrow;
  }

  if (mediator === undefined) {
    return {
      factored: false,
      reason: "factorPushoutCocone: no mediating arrow satisfies the pushout conditions.",
    };
  }

  return { factored: true, mediator };
};

export function makeFinitePushoutCalc<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): PushoutCalc<Obj, Arr> {
  const enumerateCocones = (f: Arr, h: Arr): PushoutData<Obj, Arr>[] => {
    const cocones: PushoutData<Obj, Arr>[] = [];
    const domainTarget = base.dst(f);
    const anchorTarget = base.dst(h);

    const pushCocone = (candidate: PushoutData<Obj, Arr>): void => {
      const exists = cocones.some(
        (existing) =>
          existing.apex === candidate.apex &&
          base.eq(existing.fromDomain, candidate.fromDomain) &&
          base.eq(existing.fromAnchor, candidate.fromAnchor),
      );
      if (!exists) cocones.push(candidate);
    };

    for (const apex of base.objects) {
      for (const fromDomain of base.arrows) {
        if (base.src(fromDomain) !== domainTarget || base.dst(fromDomain) !== apex) continue;
        for (const fromAnchor of base.arrows) {
          if (base.src(fromAnchor) !== anchorTarget || base.dst(fromAnchor) !== apex) continue;
          const left = base.compose(fromDomain, f);
          const right = base.compose(fromAnchor, h);
          if (base.eq(left, right)) {
            pushCocone({ apex, fromDomain, fromAnchor, Q: apex, iA: fromDomain, iZ: fromAnchor });
          }
        }
      }
    }

    return cocones;
  };

  const certifyInternal = (
    f: Arr,
    h: Arr,
    candidate: PushoutData<Obj, Arr>,
    cocones: PushoutData<Obj, Arr>[],
  ): PushoutCertification<Obj, Arr> => {
    if (base.dst(candidate.fromDomain) !== candidate.apex) {
      return {
        valid: false,
        reason: "Pushout certification: domain leg must land in the candidate apex.",
        coconesChecked: cocones,
      };
    }
    if (base.dst(candidate.fromAnchor) !== candidate.apex) {
      return {
        valid: false,
        reason: "Pushout certification: anchor leg must land in the candidate apex.",
        coconesChecked: cocones,
      };
    }

    const domainTarget = base.dst(f);
    const anchorTarget = base.dst(h);
    if (base.src(candidate.fromDomain) !== domainTarget) {
      return {
        valid: false,
        reason: "Pushout certification: domain leg must originate at the codomain of f.",
        coconesChecked: cocones,
      };
    }
    if (base.src(candidate.fromAnchor) !== anchorTarget) {
      return {
        valid: false,
        reason: "Pushout certification: anchor leg must originate at the codomain of h.",
        coconesChecked: cocones,
      };
    }

    const viaDomain = base.compose(candidate.fromDomain, f);
    const viaAnchor = base.compose(candidate.fromAnchor, h);
    if (!base.eq(viaDomain, viaAnchor)) {
      return {
        valid: false,
        reason: "Pushout certification: candidate square does not commute.",
        coconesChecked: cocones,
      };
    }

    for (const cocone of cocones) {
      const factored = factorPushoutCocone(base, candidate, cocone);
      if (!factored.factored) {
        return {
          valid: false,
          reason: factored.reason ?? "Pushout certification: universal mediators are missing.",
          coconesChecked: cocones,
        };
      }
    }

    return { valid: true, coconesChecked: cocones };
  };

  const pushout = (f: Arr, h: Arr): PushoutData<Obj, Arr> => {
    const cocones = enumerateCocones(f, h);
    const domainIdentity = base.id(base.dst(f));
    const anchorIdentity = base.id(base.dst(h));
    let fallback: PushoutData<Obj, Arr> | undefined;

    for (const candidate of cocones) {
      const certification = certifyInternal(f, h, candidate, cocones);
      if (!certification.valid) continue;
      if (base.eq(candidate.fromDomain, domainIdentity)) return candidate;
      if (base.eq(candidate.fromAnchor, anchorIdentity)) return candidate;
      if (!fallback) fallback = candidate;
    }

    if (fallback) return fallback;
    const failureReason = cocones.length
      ? "makeFinitePushoutCalc: found commuting squares but none satisfied the universal property."
      : "makeFinitePushoutCalc: no commuting cocones found for the supplied arrows.";
    throw new Error(failureReason);
  };

  const factorCocone = (
    target: PushoutData<Obj, Arr>,
    cocone: PushoutData<Obj, Arr>,
  ): PushoutCoconeFactorResult<Arr> => factorPushoutCocone(base, target, cocone);

  const certify = (f: Arr, h: Arr, candidate: PushoutData<Obj, Arr>): PushoutCertification<Obj, Arr> => {
    const cocones = enumerateCocones(f, h);
    return certifyInternal(f, h, candidate, cocones);
  };

  const coinduce = (
    j: Arr,
    pushoutOfDst: PushoutData<Obj, Arr>,
    pushoutOfSrc: PushoutData<Obj, Arr>,
  ): Arr => {
    const mediators: Arr[] = [];
    for (const candidate of base.arrows) {
      if (base.src(candidate) !== pushoutOfSrc.apex || base.dst(candidate) !== pushoutOfDst.apex) continue;
      const leftDomain = base.compose(candidate, pushoutOfSrc.fromDomain);
      const rightDomain = base.compose(pushoutOfDst.fromDomain, j);
      if (!base.eq(leftDomain, rightDomain)) continue;
      const leftAnchor = base.compose(candidate, pushoutOfSrc.fromAnchor);
      if (!base.eq(leftAnchor, pushoutOfDst.fromAnchor)) continue;
      mediators.push(candidate);
    }
    if (mediators.length === 0) {
      throw new Error("makeFinitePushoutCalc: no mediating arrow satisfies the pushout conditions.");
    }
    if (mediators.length > 1) {
      throw new Error(
        "makeFinitePushoutCalc: multiple mediating arrows satisfy the pushout conditions.",
      );
    }
    return mediators[0]!;
  };

  return { pushout, factorCocone, certify, coinduce };
}

/** @deprecated use {@link PushoutCalc} */
export type PushoutCalculator<Obj, Arr> = PushoutCalc<Obj, Arr>;
/** @deprecated use {@link PushoutData} */
export type LegacyPushoutData<Obj, Arr> = PushoutData<Obj, Arr>;
/** @deprecated use {@link makeFinitePushoutCalc} */
export const makeFinitePushoutCalculator = makeFinitePushoutCalc;
