import type { FiniteCategory } from "./finite-cat";
import type { CosliceArrow, CosliceObject } from "./slice-cat";
import type { PushoutCalculator } from "./pushout";

export interface CosliceReindexingFunctor<Obj, Arr> {
  readonly F0: (object: CosliceObject<Obj, Arr>) => CosliceObject<Obj, Arr>;
  readonly F1: (arrow: CosliceArrow<Obj, Arr>) => CosliceArrow<Obj, Arr>;
}

export function makeCosliceReindexingFunctor<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  calculator: PushoutCalculator<Obj, Arr>,
  h: Arr,
  sourceAnchor: Obj,
  targetAnchor: Obj,
): CosliceReindexingFunctor<Obj, Arr> {
  if (base.src(h) !== sourceAnchor || base.dst(h) !== targetAnchor) {
    throw new Error("makeCosliceReindexingFunctor: expected h to map the source anchor to the target anchor.");
  }

  const F0 = (object: CosliceObject<Obj, Arr>): CosliceObject<Obj, Arr> => {
    if (base.src(object.arrowFromAnchor) !== sourceAnchor) {
      throw new Error("makeCosliceReindexingFunctor: coslice object does not originate from the expected anchor.");
    }
    const data = calculator.pushout(object.arrowFromAnchor, h);
    return { codomain: data.apex, arrowFromAnchor: data.fromAnchor };
  };

  const F1 = (arrow: CosliceArrow<Obj, Arr>): CosliceArrow<Obj, Arr> => {
    const srcData = calculator.pushout(arrow.src.arrowFromAnchor, h);
    const dstData = calculator.pushout(arrow.dst.arrowFromAnchor, h);
    const mediating = calculator.coinduce(arrow.mediating, dstData, srcData);
    return {
      src: { codomain: srcData.apex, arrowFromAnchor: srcData.fromAnchor },
      dst: { codomain: dstData.apex, arrowFromAnchor: dstData.fromAnchor },
      mediating,
    };
  };

  return { F0, F1 };
}
