import type { FiniteCategory } from "./finite-cat";
import type { PullbackCalculator } from "./pullback";
import type { SliceObject, SliceArrow } from "./slice-cat";

export interface ReindexingFunctor<Obj, Arr> {
  readonly F0: (object: SliceObject<Obj, Arr>) => SliceObject<Obj, Arr>;
  readonly F1: (arrow: SliceArrow<Obj, Arr>) => SliceArrow<Obj, Arr>;
}

export function makeReindexingFunctor<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  calculator: PullbackCalculator<Obj, Arr>,
  h: Arr,
  sourceAnchor: Obj,
  targetAnchor: Obj
): ReindexingFunctor<Obj, Arr> {
  if (base.src(h) !== sourceAnchor || base.dst(h) !== targetAnchor) {
    throw new Error("makeReindexingFunctor: expected h to map sourceAnchor to targetAnchor.");
  }

  const F0 = (object: SliceObject<Obj, Arr>): SliceObject<Obj, Arr> => {
    if (base.dst(object.arrowToAnchor) !== targetAnchor) {
      throw new Error("makeReindexingFunctor: slice object does not land in the expected anchor.");
    }
    const data = calculator.pullback(object.arrowToAnchor, h);
    return { domain: data.apex, arrowToAnchor: data.toAnchor };
  };

  const F1 = (arrow: SliceArrow<Obj, Arr>): SliceArrow<Obj, Arr> => {
    const srcData = calculator.pullback(arrow.src.arrowToAnchor, h);
    const dstData = calculator.pullback(arrow.dst.arrowToAnchor, h);
    const mediating = calculator.induce(arrow.mediating, srcData, dstData);
    return {
      src: { domain: srcData.apex, arrowToAnchor: srcData.toAnchor },
      dst: { domain: dstData.apex, arrowToAnchor: dstData.toAnchor },
      mediating,
    };
  };

  return { F0, F1 };
}
