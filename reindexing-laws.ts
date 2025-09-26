import type { FiniteCategory } from "./finite-cat";
import type { PullbackCalculator } from "./pullback";
import { makeReindexingFunctor } from "./reindexing";
import { makeSlice, type SliceArrow, type SliceObject } from "./slice-cat";

export interface SliceSamples<Obj, Arr> {
  readonly objects: ReadonlyArray<SliceObject<Obj, Arr>>;
  readonly arrows: ReadonlyArray<SliceArrow<Obj, Arr>>;
}

export function checkReindexIdentityLaw<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  calculator: PullbackCalculator<Obj, Arr>,
  anchor: Obj,
  samples: SliceSamples<Obj, Arr>
): boolean {
  const functor = makeReindexingFunctor(base, calculator, base.id(anchor), anchor, anchor);
  return (
    samples.objects.every((object) => {
      const mapped = functor.F0(object);
      return object.domain === mapped.domain && base.eq(object.arrowToAnchor, mapped.arrowToAnchor);
    }) &&
    samples.arrows.every((arrow) => {
      const mapped = functor.F1(arrow);
      return (
        arrow.src.domain === mapped.src.domain &&
        arrow.dst.domain === mapped.dst.domain &&
        base.eq(arrow.src.arrowToAnchor, mapped.src.arrowToAnchor) &&
        base.eq(arrow.dst.arrowToAnchor, mapped.dst.arrowToAnchor) &&
        base.eq(arrow.mediating, mapped.mediating)
      );
    })
  );
}

export function checkReindexCompositionLaw<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  calculator: PullbackCalculator<Obj, Arr>,
  sourceAnchor: Obj,
  middleAnchor: Obj,
  targetAnchor: Obj,
  h: Arr,
  k: Arr,
  samples: SliceSamples<Obj, Arr>
): boolean {
  if (base.src(h) !== sourceAnchor || base.dst(h) !== middleAnchor) {
    throw new Error("checkReindexCompositionLaw: h must map sourceAnchor to middleAnchor.");
  }
  if (base.src(k) !== middleAnchor || base.dst(k) !== targetAnchor) {
    throw new Error("checkReindexCompositionLaw: k must map middleAnchor to targetAnchor.");
  }

  const hk = base.compose(k, h);
  const hkFunctor = makeReindexingFunctor(base, calculator, hk, sourceAnchor, targetAnchor);
  const kFunctor = makeReindexingFunctor(base, calculator, k, middleAnchor, targetAnchor);
  const hFunctor = makeReindexingFunctor(base, calculator, h, sourceAnchor, middleAnchor);

  return (
    samples.objects.every((object) => {
      const left = hkFunctor.F0(object);
      const right = hFunctor.F0(kFunctor.F0(object));
      return (
        left.domain === right.domain &&
        base.eq(left.arrowToAnchor, right.arrowToAnchor)
      );
    }) &&
    samples.arrows.every((arrow) => {
      const left = hkFunctor.F1(arrow);
      const right = hFunctor.F1(kFunctor.F1(arrow));
      return (
        left.src.domain === right.src.domain &&
        left.dst.domain === right.dst.domain &&
        base.eq(left.src.arrowToAnchor, right.src.arrowToAnchor) &&
        base.eq(left.dst.arrowToAnchor, right.dst.arrowToAnchor) &&
        base.eq(left.mediating, right.mediating)
      );
    })
  );
}

export function sampleSlice<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  anchor: Obj
): SliceSamples<Obj, Arr> {
  const slice = makeSlice(base, anchor);
  return { objects: slice.objects, arrows: slice.arrows };
}
