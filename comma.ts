import type { FiniteCategory } from "./finite-cat";

export interface Functor<OD, AD, OC, AC> {
  readonly F0: (object: OD) => OC;
  readonly F1: (arrow: AD) => AC;
}

export interface CommaObject<OD, OE, AC> {
  readonly left: OD;
  readonly right: OE;
  readonly mediator: AC;
}

export interface CommaArrow<OD, AD, OE, AE, AC> {
  readonly src: CommaObject<OD, OE, AC>;
  readonly dst: CommaObject<OD, OE, AC>;
  readonly left: AD;
  readonly right: AE;
}

export function makeComma<OD, AD, OE, AE, OC, AC>(
  leftCategory: FiniteCategory<OD, AD>,
  rightCategory: FiniteCategory<OE, AE>,
  ambient: FiniteCategory<OC, AC>,
  F: Functor<OD, AD, OC, AC>,
  G: Functor<OE, AE, OC, AC>,
  enumerateObjectsLeft: () => readonly OD[] = () => leftCategory.objects,
  enumerateObjectsRight: () => readonly OE[] = () => rightCategory.objects,
  enumerateArrowsLeft: () => readonly AD[] = () => leftCategory.arrows,
  enumerateArrowsRight: () => readonly AE[] = () => rightCategory.arrows,
  equalsInAmbient: (x: AC, y: AC) => boolean = ambient.eq,
): FiniteCategory<CommaObject<OD, OE, AC>, CommaArrow<OD, AD, OE, AE, AC>> {
  const objects: CommaObject<OD, OE, AC>[] = [];
  const arrows: CommaArrow<OD, AD, OE, AE, AC>[] = [];

  for (const left of enumerateObjectsLeft()) {
    for (const right of enumerateObjectsRight()) {
      for (const mediator of ambient.arrows) {
        if (ambient.src(mediator) !== F.F0(left) || ambient.dst(mediator) !== G.F0(right)) continue;
        objects.push({ left, right, mediator });
      }
    }
  }

  for (const src of objects) {
    for (const dst of objects) {
      for (const leftArrow of enumerateArrowsLeft()) {
        if (leftCategory.src(leftArrow) !== src.left || leftCategory.dst(leftArrow) !== dst.left) continue;
        for (const rightArrow of enumerateArrowsRight()) {
          if (rightCategory.src(rightArrow) !== src.right || rightCategory.dst(rightArrow) !== dst.right) continue;
          const leftComposite = ambient.compose(G.F1(rightArrow), src.mediator);
          const rightComposite = ambient.compose(dst.mediator, F.F1(leftArrow));
          if (!equalsInAmbient(leftComposite, rightComposite)) continue;
          arrows.push({ src, dst, left: leftArrow, right: rightArrow });
        }
      }
    }
  }

  const id = (object: CommaObject<OD, OE, AC>): CommaArrow<OD, AD, OE, AE, AC> => ({
    src: object,
    dst: object,
    left: leftCategory.id(object.left),
    right: rightCategory.id(object.right),
  });

  const compose = (
    g: CommaArrow<OD, AD, OE, AE, AC>,
    f: CommaArrow<OD, AD, OE, AE, AC>,
  ): CommaArrow<OD, AD, OE, AE, AC> => {
    if (f.dst !== g.src) {
      throw new Error("makeComma: attempted to compose non-adjacent arrows");
    }
    return {
      src: f.src,
      dst: g.dst,
      left: leftCategory.compose(g.left, f.left),
      right: rightCategory.compose(g.right, f.right),
    };
  };

  const eq = (
    a: CommaArrow<OD, AD, OE, AE, AC>,
    b: CommaArrow<OD, AD, OE, AE, AC>,
  ) =>
    a.src === b.src &&
    a.dst === b.dst &&
    leftCategory.eq(a.left, b.left) &&
    rightCategory.eq(a.right, b.right);

  return {
    objects,
    arrows,
    id,
    compose,
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq,
  };
}
