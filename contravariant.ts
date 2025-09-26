import type { SimpleCat } from "./simple-cat";
import type { Functor } from "./functor";

export const Contra = <CO, CA, DO, DA>(
  _C: SimpleCat<CO, CA>,
  _D: SimpleCat<DO, DA>,
  F0: (object: CO) => DO,
  F1op: (arrow: CA) => DA,
): Functor<CO, CA, DO, DA> => {
  return {
    F0,
    F1: F1op,
  };
};

export const isContravariant = <CO, CA, DO, DA>(
  C: SimpleCat<CO, CA>,
  D: SimpleCat<DO, DA>,
  F: Functor<CO, CA, DO, DA>,
  sampleObjects: ReadonlyArray<CO>,
  sampleArrows: ReadonlyArray<CA>,
): boolean => {
  const idsPreserved = sampleObjects.every((object) => {
    const mapped = F.F1(C.id(object));
    return Object.is(D.src(mapped), F.F0(object)) && Object.is(D.dst(mapped), F.F0(object));
  });

  if (!idsPreserved) {
    return false;
  }

  return sampleArrows.every((f) =>
    sampleArrows.every((g) => {
      if (!Object.is(C.dst(f), C.src(g))) {
        return true;
      }
      const lhs = F.F1(C.compose(g, f));
      const rhs = D.compose(F.F1(f), F.F1(g));
      return Object.is(D.src(lhs), D.src(rhs)) && Object.is(D.dst(lhs), D.dst(rhs));
    }),
  );
};
