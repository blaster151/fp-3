import type { FiniteCategory } from "./finite-cat";

export interface PullbackData<Obj, Arr> {
  readonly apex: Obj;
  readonly toDomain: Arr;
  readonly toAnchor: Arr;
}

export interface PullbackCalculator<Obj, Arr> {
  pullback(f: Arr, h: Arr): PullbackData<Obj, Arr>;
  induce(j: Arr, pullbackOfF: PullbackData<Obj, Arr>, pullbackOfG: PullbackData<Obj, Arr>): Arr;
}

export function makeFinitePullbackCalculator<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>
): PullbackCalculator<Obj, Arr> {
  const pullback = (f: Arr, h: Arr): PullbackData<Obj, Arr> => {
    let fallback: PullbackData<Obj, Arr> | undefined;
    const anchorIdentity = base.id(base.src(h));
    for (const apex of base.objects) {
      for (const toDomain of base.arrows) {
        if (base.src(toDomain) !== apex || base.dst(toDomain) !== base.src(f)) continue;
        for (const toAnchor of base.arrows) {
          if (base.src(toAnchor) !== apex || base.dst(toAnchor) !== base.src(h)) continue;
          const left = base.compose(f, toDomain);
          const right = base.compose(h, toAnchor);
          if (base.eq(left, right)) {
            const candidate = { apex, toDomain, toAnchor } as const;
            const identity = base.id(base.src(f));
            if (base.eq(toDomain, identity)) {
              return candidate;
            }
            if (base.eq(toAnchor, anchorIdentity)) {
              return candidate;
            }
            if (!fallback) fallback = candidate;
          }
        }
      }
    }
    if (fallback) return fallback;
    throw new Error("No pullback found for the supplied arrows.");
  };

  const induce = (
    j: Arr,
    pullbackOfF: PullbackData<Obj, Arr>,
    pullbackOfG: PullbackData<Obj, Arr>
  ): Arr => {
    for (const candidate of base.arrows) {
      if (base.src(candidate) !== pullbackOfF.apex || base.dst(candidate) !== pullbackOfG.apex) continue;
      const leftDomain = base.compose(pullbackOfG.toDomain, candidate);
      const rightDomain = base.compose(j, pullbackOfF.toDomain);
      if (!base.eq(leftDomain, rightDomain)) continue;
      const leftAnchor = base.compose(pullbackOfG.toAnchor, candidate);
      if (!base.eq(leftAnchor, pullbackOfF.toAnchor)) continue;
      return candidate;
    }
    throw new Error("No mediating arrow satisfies the pullback conditions.");
  };

  return { pullback, induce };
}
