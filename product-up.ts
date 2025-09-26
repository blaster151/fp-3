import type { Functor } from "./functor";
import type { SimpleCat } from "./simple-cat";
import {
  Pairing,
  Pi1,
  Pi2,
  type ArrPair,
  type ObjPair,
} from "./product-cat";

export interface ProductUPEquality<CObj, DObj, CArr, DArr> {
  readonly eqCObj?: (left: CObj, right: CObj) => boolean;
  readonly eqCArr?: (left: CArr, right: CArr) => boolean;
  readonly eqDObj?: (left: DObj, right: DObj) => boolean;
  readonly eqDArr?: (left: DArr, right: DArr) => boolean;
  readonly eqPairObj?: (
    left: ObjPair<CObj, DObj>,
    right: ObjPair<CObj, DObj>,
  ) => boolean;
  readonly eqPairArr?: (
    left: ArrPair<CObj, DObj, CArr, DArr>,
    right: ArrPair<CObj, DObj, CArr, DArr>,
  ) => boolean;
}

export const composeFunctors = <A0, A1, B0, B1, C0, C1>(
  G: Functor<B0, B1, C0, C1>,
  F: Functor<A0, A1, B0, B1>,
): Functor<A0, A1, C0, C1> => ({
  F0: (object) => G.F0(F.F0(object)),
  F1: (arrow) => G.F1(F.F1(arrow)),
});

export const functorsAgree = <A0, A1, B0, B1>(
  F: Functor<A0, A1, B0, B1>,
  G: Functor<A0, A1, B0, B1>,
  objects: ReadonlyArray<A0>,
  arrows: ReadonlyArray<A1>,
  eqObj: (x: B0, y: B0) => boolean = Object.is,
  eqArr: (x: B1, y: B1) => boolean = Object.is,
): boolean => {
  const sameObjects = objects.every((object) => eqObj(F.F0(object), G.F0(object)));
  const sameArrows = arrows.every((arrow) => eqArr(F.F1(arrow), G.F1(arrow)));
  return sameObjects && sameArrows;
};

export const checkProductUP = <XO, XA, CObj, DObj, CArr, DArr>(
  C: SimpleCat<CObj, CArr>,
  D: SimpleCat<DObj, DArr>,
  F: Functor<XO, XA, CObj, CArr>,
  G: Functor<XO, XA, DObj, DArr>,
  H: Functor<XO, XA, ObjPair<CObj, DObj>, ArrPair<CObj, DObj, CArr, DArr>>,
  objects: ReadonlyArray<XO>,
  arrows: ReadonlyArray<XA>,
  options: ProductUPEquality<CObj, DObj, CArr, DArr> = {},
): boolean => {
  const eqCObj = options.eqCObj ?? Object.is;
  const eqCArr = options.eqCArr ?? Object.is;
  const eqDObj = options.eqDObj ?? Object.is;
  const eqDArr = options.eqDArr ?? Object.is;
  const eqPairObj =
    options.eqPairObj ??
    ((left, right) => eqCObj(left[0], right[0]) && eqDObj(left[1], right[1]));
  const eqPairArr =
    options.eqPairArr ??
    ((left, right) =>
      eqPairObj(left.src, right.src) &&
      eqPairObj(left.dst, right.dst) &&
      eqCArr(left.cf, right.cf) &&
      eqDArr(left.dg, right.dg));

  const pi1 = Pi1(C, D);
  const pi2 = Pi2(C, D);
  const lhs1 = composeFunctors(pi1, H);
  const lhs2 = composeFunctors(pi2, H);
  const paired = Pairing(F, G, C, D);
  const cond1 = functorsAgree(lhs1, F, objects, arrows, eqCObj, eqCArr);
  const cond2 = functorsAgree(lhs2, G, objects, arrows, eqDObj, eqDArr);
  const cond3 = functorsAgree(H, paired, objects, arrows, eqPairObj, eqPairArr);
  return cond1 && cond2 && cond3;
};
