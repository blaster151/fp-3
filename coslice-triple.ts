import type { FiniteCategory } from "./finite-cat";
import type { CosliceArrow, CosliceObject } from "./slice-cat";
import { explainCoSliceMismatch } from "./diagnostics";

export interface CosliceTripleObject<Obj, Arr> extends CosliceObject<Obj, Arr> {}

export interface CosliceTripleArrow<Obj, Arr> {
  readonly src: CosliceTripleObject<Obj, Arr>;
  readonly dst: CosliceTripleObject<Obj, Arr>;
  readonly mediating: Arr;
  readonly witnessSource: Arr;
  readonly witnessTarget: Arr;
}

export function makeCosliceTripleArrow<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  src: CosliceTripleObject<Obj, Arr>,
  dst: CosliceTripleObject<Obj, Arr>,
  mediating: Arr,
): CosliceTripleArrow<Obj, Arr> {
  const composite = base.compose(mediating, src.arrowFromAnchor);
  if (!base.eq(composite, dst.arrowFromAnchor)) {
    throw new Error(
      explainCoSliceMismatch(base, mediating, src.arrowFromAnchor, dst.arrowFromAnchor),
    );
  }
  return {
    src,
    dst,
    mediating,
    witnessSource: src.arrowFromAnchor,
    witnessTarget: dst.arrowFromAnchor,
  };
}

export function idCosliceTripleArrow<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  object: CosliceTripleObject<Obj, Arr>,
): CosliceTripleArrow<Obj, Arr> {
  return {
    src: object,
    dst: object,
    mediating: base.id(object.codomain),
    witnessSource: object.arrowFromAnchor,
    witnessTarget: object.arrowFromAnchor,
  };
}

export function composeCosliceTripleArrows<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  g: CosliceTripleArrow<Obj, Arr>,
  f: CosliceTripleArrow<Obj, Arr>,
): CosliceTripleArrow<Obj, Arr> {
  if (f.dst !== g.src) {
    throw new Error("composeCosliceTripleArrows: domain/codomain mismatch");
  }
  const mediating = base.compose(g.mediating, f.mediating);
  const composite = base.compose(mediating, f.witnessSource);
  if (!base.eq(composite, g.witnessTarget)) {
    throw new Error(
      explainCoSliceMismatch(base, mediating, f.witnessSource, g.witnessTarget),
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

export function cosliceArrowToTriple<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  arrow: CosliceArrow<Obj, Arr>,
): CosliceTripleArrow<Obj, Arr> {
  return makeCosliceTripleArrow(base, arrow.src, arrow.dst, arrow.mediating);
}

export function cosliceTripleToArrow<Obj, Arr>(
  triple: CosliceTripleArrow<Obj, Arr>,
): CosliceArrow<Obj, Arr> {
  return { src: triple.src, dst: triple.dst, mediating: triple.mediating };
}
