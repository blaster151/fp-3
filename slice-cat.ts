import type { FiniteCategory } from "./finite-cat";
import { pushUnique } from "./finite-cat";

export interface SliceObject<Obj, Arr> {
  readonly domain: Obj;
  readonly arrowToAnchor: Arr;
}

export interface SliceArrow<Obj, Arr> {
  readonly src: SliceObject<Obj, Arr>;
  readonly dst: SliceObject<Obj, Arr>;
  readonly mediating: Arr;
}

export interface CosliceObject<Obj, Arr> {
  readonly codomain: Obj;
  readonly arrowFromAnchor: Arr;
}

export interface CosliceArrow<Obj, Arr> {
  readonly src: CosliceObject<Obj, Arr>;
  readonly dst: CosliceObject<Obj, Arr>;
  readonly mediating: Arr;
}

export interface SlicePostcomposeFunctor<Obj, Arr> {
  readonly F0: (object: SliceObject<Obj, Arr>) => SliceObject<Obj, Arr>;
  readonly F1: (arrow: SliceArrow<Obj, Arr>) => SliceArrow<Obj, Arr>;
}

function sliceEq<Obj, Arr>(baseEq: (x: Arr, y: Arr) => boolean) {
  return (a: SliceArrow<Obj, Arr>, b: SliceArrow<Obj, Arr>) =>
    baseEq(a.mediating, b.mediating) &&
    baseEq(a.src.arrowToAnchor, b.src.arrowToAnchor) &&
    baseEq(a.dst.arrowToAnchor, b.dst.arrowToAnchor);
}

function cosliceEq<Obj, Arr>(baseEq: (x: Arr, y: Arr) => boolean) {
  return (a: CosliceArrow<Obj, Arr>, b: CosliceArrow<Obj, Arr>) =>
    baseEq(a.mediating, b.mediating) &&
    baseEq(a.src.arrowFromAnchor, b.src.arrowFromAnchor) &&
    baseEq(a.dst.arrowFromAnchor, b.dst.arrowFromAnchor);
}

export function makeSlice<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  anchor: Obj
): FiniteCategory<SliceObject<Obj, Arr>, SliceArrow<Obj, Arr>> {
  const objects = base.arrows
    .filter((arrow) => base.dst(arrow) === anchor)
    .map((arrow) => ({ domain: base.src(arrow), arrowToAnchor: arrow }));

  const eq = sliceEq<Obj, Arr>(base.eq);
  const arrows: SliceArrow<Obj, Arr>[] = [];

  const id = (object: SliceObject<Obj, Arr>): SliceArrow<Obj, Arr> => ({
    src: object,
    dst: object,
    mediating: base.id(object.domain),
  });

  for (const object of objects) {
    pushUnique(arrows, id(object), eq);
  }

  for (const src of objects) {
    for (const dst of objects) {
      for (const mediating of base.arrows) {
        if (base.src(mediating) !== src.domain || base.dst(mediating) !== dst.domain) continue;
        const composed = base.compose(dst.arrowToAnchor, mediating);
        if (base.eq(composed, src.arrowToAnchor)) {
          pushUnique(arrows, { src, dst, mediating }, eq);
        }
      }
    }
  }

  const compose = (
    g: SliceArrow<Obj, Arr>,
    f: SliceArrow<Obj, Arr>
  ): SliceArrow<Obj, Arr> => {
    if (f.dst !== g.src) {
      throw new Error("makeSlice: domain/codomain mismatch");
    }
    const mediating = base.compose(g.mediating, f.mediating);
    return { src: f.src, dst: g.dst, mediating };
  };

  const src = (arrow: SliceArrow<Obj, Arr>) => arrow.src;
  const dst = (arrow: SliceArrow<Obj, Arr>) => arrow.dst;

  return {
    objects,
    arrows,
    id,
    compose,
    src,
    dst,
    eq,
  };
}

export function makeCoslice<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  anchor: Obj
): FiniteCategory<CosliceObject<Obj, Arr>, CosliceArrow<Obj, Arr>> {
  const objects = base.arrows
    .filter((arrow) => base.src(arrow) === anchor)
    .map((arrow) => ({ codomain: base.dst(arrow), arrowFromAnchor: arrow }));

  const eq = cosliceEq<Obj, Arr>(base.eq);
  const arrows: CosliceArrow<Obj, Arr>[] = [];

  const id = (object: CosliceObject<Obj, Arr>): CosliceArrow<Obj, Arr> => ({
    src: object,
    dst: object,
    mediating: base.id(object.codomain),
  });

  for (const object of objects) {
    pushUnique(arrows, id(object), eq);
  }

  for (const srcObj of objects) {
    for (const dstObj of objects) {
      for (const mediating of base.arrows) {
        if (base.src(mediating) !== srcObj.codomain || base.dst(mediating) !== dstObj.codomain) continue;
        const composed = base.compose(mediating, srcObj.arrowFromAnchor);
        if (base.eq(composed, dstObj.arrowFromAnchor)) {
          pushUnique(arrows, { src: srcObj, dst: dstObj, mediating }, eq);
        }
      }
    }
  }

  const compose = (
    g: CosliceArrow<Obj, Arr>,
    f: CosliceArrow<Obj, Arr>
  ): CosliceArrow<Obj, Arr> => {
    if (f.dst !== g.src) {
      throw new Error("makeCoslice: domain/codomain mismatch");
    }
    const mediating = base.compose(g.mediating, f.mediating);
    return { src: f.src, dst: g.dst, mediating };
  };

  const src = (arrow: CosliceArrow<Obj, Arr>) => arrow.src;
  const dst = (arrow: CosliceArrow<Obj, Arr>) => arrow.dst;

  return {
    objects,
    arrows,
    id,
    compose,
    src,
    dst,
    eq,
  };
}

export function makePostcomposeOnSlice<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  mediating: Arr,
  sourceAnchor: Obj,
  targetAnchor: Obj,
): SlicePostcomposeFunctor<Obj, Arr> {
  if (base.src(mediating) !== sourceAnchor || base.dst(mediating) !== targetAnchor) {
    throw new Error("makePostcomposeOnSlice: expected mediating arrow to match the supplied anchors.");
  }

  const F0 = (object: SliceObject<Obj, Arr>): SliceObject<Obj, Arr> => {
    if (base.dst(object.arrowToAnchor) !== sourceAnchor) {
      throw new Error("makePostcomposeOnSlice: slice object does not land in the expected source anchor.");
    }
    return {
      domain: object.domain,
      arrowToAnchor: base.compose(mediating, object.arrowToAnchor),
    };
  };

  const F1 = (arrow: SliceArrow<Obj, Arr>): SliceArrow<Obj, Arr> => ({
    src: F0(arrow.src),
    dst: F0(arrow.dst),
    mediating: arrow.mediating,
  });

  return { F0, F1 };
}
