import type { FiniteCategory } from "./finite-cat";
import type { SliceArrow, SliceObject } from "./slice-cat";
import { explainSliceMismatch } from "./diagnostics";

export interface SliceTripleObject<Obj, Arr> extends SliceObject<Obj, Arr> {}

export interface SliceTripleArrow<Obj, Arr> {
  readonly src: SliceTripleObject<Obj, Arr>;
  readonly dst: SliceTripleObject<Obj, Arr>;
  readonly mediating: Arr;
  readonly witnessSource: Arr;
  readonly witnessTarget: Arr;
}

export function makeSliceTripleArrow<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  src: SliceTripleObject<Obj, Arr>,
  dst: SliceTripleObject<Obj, Arr>,
  mediating: Arr,
): SliceTripleArrow<Obj, Arr> {
  const composite = base.compose(dst.arrowToAnchor, mediating);
  if (!base.eq(composite, src.arrowToAnchor)) {
    throw new Error(
      explainSliceMismatch(base, mediating, src.arrowToAnchor, dst.arrowToAnchor),
    );
  }
  return {
    src,
    dst,
    mediating,
    witnessSource: src.arrowToAnchor,
    witnessTarget: dst.arrowToAnchor,
  };
}

export function idSliceTripleArrow<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  object: SliceTripleObject<Obj, Arr>,
): SliceTripleArrow<Obj, Arr> {
  return {
    src: object,
    dst: object,
    mediating: base.id(object.domain),
    witnessSource: object.arrowToAnchor,
    witnessTarget: object.arrowToAnchor,
  };
}

export function composeSliceTripleArrows<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  g: SliceTripleArrow<Obj, Arr>,
  f: SliceTripleArrow<Obj, Arr>,
): SliceTripleArrow<Obj, Arr> {
  if (f.dst !== g.src) {
    throw new Error("composeSliceTripleArrows: domain/codomain mismatch");
  }
  const mediating = base.compose(g.mediating, f.mediating);
  const composite = base.compose(g.witnessTarget, mediating);
  if (!base.eq(composite, f.witnessSource)) {
    throw new Error(
      explainSliceMismatch(base, mediating, f.witnessSource, g.witnessTarget),
    );
  }
  return {
    src: f.src,
    dst: g.dst,
    mediating,
    witnessSource: f.witnessSource,
    witnessTarget: g.witnessTarget,
  };
}

export function sliceArrowToTriple<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  arrow: SliceArrow<Obj, Arr>,
): SliceTripleArrow<Obj, Arr> {
  return makeSliceTripleArrow(base, arrow.src, arrow.dst, arrow.mediating);
}

export function sliceTripleToArrow<Obj, Arr>(
  triple: SliceTripleArrow<Obj, Arr>,
): SliceArrow<Obj, Arr> {
  return { src: triple.src, dst: triple.dst, mediating: triple.mediating };
}
