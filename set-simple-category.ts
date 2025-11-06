import { SetCat, type SetHom, type SetObj } from "./set-cat";
import type { SimpleCat } from "./simple-cat";

export const makeSetSimpleCategory = <A>(): SimpleCat<SetObj<A>, SetHom<A, A>> & {
  readonly eq: (left: SetHom<A, A>, right: SetHom<A, A>) => boolean;
} => {
  const eq = (left: SetHom<A, A>, right: SetHom<A, A>): boolean => {
    if (!Object.is(left.dom, right.dom) || !Object.is(left.cod, right.cod)) {
      return false;
    }
    for (const value of left.dom) {
      if (!Object.is(left.map(value), right.map(value))) {
        return false;
      }
    }
    return true;
  };

  return {
    id: (object) => SetCat.id(object),
    compose: (g, f) => SetCat.compose(g, f),
    src: (arrow) => arrow.dom,
    dst: (arrow) => arrow.cod,
    eq,
  };
};

export const setSimpleCategory = makeSetSimpleCategory<unknown>();
