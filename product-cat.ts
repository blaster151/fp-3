import type { SimpleCat } from "./simple-cat";
import type { Functor } from "./functor";

export type ObjPair<CObj, DObj> = readonly [CObj, DObj];

export interface ArrPair<CObj, DObj, CArr, DArr> {
  readonly src: ObjPair<CObj, DObj>;
  readonly dst: ObjPair<CObj, DObj>;
  readonly cf: CArr;
  readonly dg: DArr;
}

export const ProductCat = <CObj, DObj, CArr, DArr>(
  C: SimpleCat<CObj, CArr>,
  D: SimpleCat<DObj, DArr>,
): SimpleCat<ObjPair<CObj, DObj>, ArrPair<CObj, DObj, CArr, DArr>> => ({
  id: ([c, d]) => ({
    src: [c, d],
    dst: [c, d],
    cf: C.id(c),
    dg: D.id(d),
  }),
  compose: (g, f) => {
    const [c0, d0] = f.src;
    const [c1, d1] = f.dst;
    const [c2, d2] = g.src;
    const [c3, d3] = g.dst;
    if (!Object.is(c1, c2) || !Object.is(d1, d2)) {
      throw new Error("ProductCat: domain/codomain mismatch");
    }
    return {
      src: [c0, d0] as const,
      dst: [c3, d3] as const,
      cf: C.compose(g.cf, f.cf),
      dg: D.compose(g.dg, f.dg),
    };
  },
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
});

export const Pi1 = <CObj, DObj, CArr, DArr>(
  C: SimpleCat<CObj, CArr>,
  _D: SimpleCat<DObj, DArr>,
): Functor<ObjPair<CObj, DObj>, ArrPair<CObj, DObj, CArr, DArr>, CObj, CArr> => ({
  F0: (pair) => pair[0],
  F1: (arrow) => arrow.cf,
});

export const Pi2 = <CObj, DObj, CArr, DArr>(
  _C: SimpleCat<CObj, CArr>,
  D: SimpleCat<DObj, DArr>,
): Functor<ObjPair<CObj, DObj>, ArrPair<CObj, DObj, CArr, DArr>, DObj, DArr> => ({
  F0: (pair) => pair[1],
  F1: (arrow) => arrow.dg,
});

export const Pairing = <XO, XA, CObj, DObj, CArr, DArr>(
  F: Functor<XO, XA, CObj, CArr>,
  G: Functor<XO, XA, DObj, DArr>,
  C: SimpleCat<CObj, CArr>,
  D: SimpleCat<DObj, DArr>,
): Functor<XO, XA, ObjPair<CObj, DObj>, ArrPair<CObj, DObj, CArr, DArr>> => ({
  F0: (object) => [F.F0(object), G.F0(object)] as const,
  F1: (arrow) => {
    const cf = F.F1(arrow);
    const dg = G.F1(arrow);
    return {
      src: [C.src(cf), D.src(dg)] as const,
      dst: [C.dst(cf), D.dst(dg)] as const,
      cf,
      dg,
    };
  },
});
