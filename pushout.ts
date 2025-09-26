import type { FiniteCategory } from "./finite-cat";

export interface PushoutData<Obj, Arr> {
  readonly apex: Obj;
  readonly fromDomain: Arr;
  readonly fromAnchor: Arr;
}

export interface PushoutCalculator<Obj, Arr> {
  pushout(f: Arr, h: Arr): PushoutData<Obj, Arr>;
  coinduce(
    j: Arr,
    pushoutOfDst: PushoutData<Obj, Arr>,
    pushoutOfSrc: PushoutData<Obj, Arr>,
  ): Arr;
}

export function makeFinitePushoutCalculator<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): PushoutCalculator<Obj, Arr> {
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
          const candidate = { apex, fromDomain, fromAnchor } as const;
          if (base.eq(fromDomain, domainIdentity)) return candidate;
          if (base.eq(fromAnchor, anchorIdentity)) return candidate;
          if (!fallback) fallback = candidate;
        }
      }
    }

    if (fallback) return fallback;
    throw new Error("makeFinitePushoutCalculator: no pushout found for the supplied arrows.");
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
    throw new Error("makeFinitePushoutCalculator: no mediating arrow satisfies the pushout conditions.");
  };

  return { pushout, coinduce };
}
