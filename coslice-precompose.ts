import type { FiniteCategory } from "./finite-cat";
import type { CosliceArrow, CosliceObject } from "./slice-cat";

export interface CoslicePrecomposition<Obj, Arr> {
  readonly F0: (object: CosliceObject<Obj, Arr>) => CosliceObject<Obj, Arr>;
  readonly F1: (arrow: CosliceArrow<Obj, Arr>) => CosliceArrow<Obj, Arr>;
}

export function makeCoslicePrecomposition<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  h: Arr,
  sourceAnchor: Obj,
  targetAnchor: Obj,
): CoslicePrecomposition<Obj, Arr> {
  if (base.src(h) !== sourceAnchor || base.dst(h) !== targetAnchor) {
    throw new Error("makeCoslicePrecomposition: expected h to map the source anchor to the target anchor.");
  }

  const F0 = (object: CosliceObject<Obj, Arr>): CosliceObject<Obj, Arr> => {
    if (base.src(object.arrowFromAnchor) !== targetAnchor) {
      throw new Error("makeCoslicePrecomposition: coslice object does not originate from the expected anchor.");
    }
    return {
      codomain: object.codomain,
      arrowFromAnchor: base.compose(object.arrowFromAnchor, h),
    };
  };

  const F1 = (arrow: CosliceArrow<Obj, Arr>): CosliceArrow<Obj, Arr> => ({
    src: F0(arrow.src),
    dst: F0(arrow.dst),
    mediating: arrow.mediating,
  });

  return { F0, F1 };
}
