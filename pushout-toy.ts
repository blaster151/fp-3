import type { FiniteCategory } from "./finite-cat";
import type { PushoutCalc, PushoutData, PushoutCertification } from "./pushout";
import { factorPushoutCocone } from "./pushout";

export function makeToyPushouts<Obj, Arr>(base: FiniteCategory<Obj, Arr>): PushoutCalc<Obj, Arr> {
  const pushout = (f: Arr, h: Arr): PushoutData<Obj, Arr> => {
    if (base.src(f) !== base.src(h)) {
      throw new Error("makeToyPushouts: pushout legs must share a domain.");
    }

    for (const apex of base.objects) {
      for (const fromDomain of base.arrows) {
        if (base.src(fromDomain) !== base.dst(f) || base.dst(fromDomain) !== apex) continue;
        for (const fromAnchor of base.arrows) {
          if (base.src(fromAnchor) !== base.dst(h) || base.dst(fromAnchor) !== apex) continue;
          const left = base.compose(fromDomain, f);
          const right = base.compose(fromAnchor, h);
          if (base.eq(left, right)) {
            return {
              apex,
              fromDomain,
              fromAnchor,
              Q: apex,
              iA: fromDomain,
              iZ: fromAnchor,
            };
          }
        }
      }
    }

    throw new Error("makeToyPushouts: no pushout found for the supplied legs.");
  };

  const factorCocone = (
    target: PushoutData<Obj, Arr>,
    cocone: PushoutData<Obj, Arr>,
  ) => factorPushoutCocone(base, target, cocone);

  const enumerateCocones = (f: Arr, h: Arr): PushoutData<Obj, Arr>[] => {
    const cocones: PushoutData<Obj, Arr>[] = [];
    for (const apex of base.objects) {
      for (const fromDomain of base.arrows) {
        if (base.src(fromDomain) !== base.dst(f) || base.dst(fromDomain) !== apex) continue;
        for (const fromAnchor of base.arrows) {
          if (base.src(fromAnchor) !== base.dst(h) || base.dst(fromAnchor) !== apex) continue;
          const left = base.compose(fromDomain, f);
          const right = base.compose(fromAnchor, h);
          if (!base.eq(left, right)) continue;
          cocones.push({ apex, fromDomain, fromAnchor, Q: apex, iA: fromDomain, iZ: fromAnchor });
        }
      }
    }
    return cocones;
  };

  const certify = (f: Arr, h: Arr, candidate: PushoutData<Obj, Arr>): PushoutCertification<Obj, Arr> => {
    const cocones = enumerateCocones(f, h);
    for (const cocone of cocones) {
      const factor = factorCocone(candidate, cocone);
      if (!factor.factored) {
        return {
          valid: false,
          ...(factor.reason ? { reason: factor.reason } : {}),
          coconesChecked: cocones,
        };
      }
    }
    return { valid: true, coconesChecked: cocones };
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
    throw new Error("makeToyPushouts: no coinduced map witnesses the universal property.");
  };

  return { pushout, factorCocone, certify, coinduce };
}
