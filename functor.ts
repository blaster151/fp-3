import type { SimpleCat } from "./simple-cat";

export interface Functor<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly F0: (object: SrcObj) => TgtObj;
  readonly F1: (arrow: SrcArr) => TgtArr;
}

export const preservesIdentity = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  objects: ReadonlyArray<SrcObj>,
): boolean =>
  objects.every((object) => {
    const mapped = F.F1(C.id(object));
    return Object.is(D.src(mapped), F.F0(object)) && Object.is(D.dst(mapped), F.F0(object));
  });

export const preservesComposition = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  arrows: ReadonlyArray<{ f: SrcArr; g: SrcArr }>,
): boolean =>
  arrows.every(({ f, g }) => {
    if (!Object.is(C.dst(f), C.src(g))) {
      return true;
    }
    const left = F.F1(C.compose(g, f));
    const right = D.compose(F.F1(g), F.F1(f));
    return Object.is(D.src(left), D.src(right)) && Object.is(D.dst(left), D.dst(right));
  });
