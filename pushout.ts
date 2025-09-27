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

export interface PushoutCalc<Obj, Arr> {
  pushout(f: Arr, h: Arr): PushoutData<Obj, Arr>;
  coinduce(
    j: Arr,
    pushoutOfDst: PushoutData<Obj, Arr>,
    pushoutOfSrc: PushoutData<Obj, Arr>,
  ): Arr;
}

export function makeFinitePushoutCalc<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): PushoutCalc<Obj, Arr> {
  const pushout = (f: Arr, h: Arr): PushoutData<Obj, Arr> => {
    let fallback: PushoutData<Obj, Arr> | undefined;
    const domainIdentity = base.id(base.dst(f));
    const anchorIdentity = base.id(base.dst(h));

    for (const apex of base.objects) {
      for (const fromDomain of base.arrows) {
        if (base.src(fromDomain) !== base.dst(f) || base.dst(fromDomain) !== apex) continue;
        for (const fromAnchor of base.arrows) {
          if (base.src(fromAnchor) !== base.dst(h) || base.dst(fromAnchor) !== apex) continue;
          const left = base.compose(fromDomain, f);
          const right = base.compose(fromAnchor, h);
          if (!base.eq(left, right)) continue;
          const candidate = {
            apex,
            fromDomain,
            fromAnchor,
            Q: apex,
            iA: fromDomain,
            iZ: fromAnchor,
          } as const;
          if (base.eq(fromDomain, domainIdentity)) return candidate;
          if (base.eq(fromAnchor, anchorIdentity)) return candidate;
          if (!fallback) fallback = candidate;
        }
      }
    }

    if (fallback) return fallback;
    throw new Error("makeFinitePushoutCalc: no pushout found for the supplied arrows.");
  };

  const coinduce = (
    j: Arr,
    pushoutOfDst: PushoutData<Obj, Arr>,
    pushoutOfSrc: PushoutData<Obj, Arr>,
  ): Arr => {
    for (const candidate of base.arrows) {
      if (base.src(candidate) !== pushoutOfSrc.apex || base.dst(candidate) !== pushoutOfDst.apex) continue;
      const leftDomain = base.compose(candidate, pushoutOfSrc.fromDomain);
      const rightDomain = base.compose(pushoutOfDst.fromDomain, j);
      if (!base.eq(leftDomain, rightDomain)) continue;
      const leftAnchor = base.compose(candidate, pushoutOfSrc.fromAnchor);
      if (!base.eq(leftAnchor, pushoutOfDst.fromAnchor)) continue;
      return candidate;
    }
    throw new Error("makeFinitePushoutCalc: no mediating arrow satisfies the pushout conditions.");
  };

  return { pushout, coinduce };
}

/** @deprecated use {@link PushoutCalc} */
export type PushoutCalculator<Obj, Arr> = PushoutCalc<Obj, Arr>;
/** @deprecated use {@link PushoutData} */
export type LegacyPushoutData<Obj, Arr> = PushoutData<Obj, Arr>;
/** @deprecated use {@link makeFinitePushoutCalc} */
export const makeFinitePushoutCalculator = makeFinitePushoutCalc;
