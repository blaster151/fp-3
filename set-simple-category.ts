import { SetCat, type SetHom, type SetObj } from "./set-cat";
import type { SimpleCat } from "./simple-cat";

export const setSimpleCategory: SimpleCat<SetObj<unknown>, SetHom<unknown, unknown>> & {
  readonly eq: (
    left: SetHom<unknown, unknown>,
    right: SetHom<unknown, unknown>,
  ) => boolean;
} = {
  id: (object) => SetCat.id(object) as SetHom<unknown, unknown>,
  compose: (g, f) => SetCat.compose(g, f) as SetHom<unknown, unknown>,
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
  eq: (left, right) => {
    if (!Object.is(left.dom, right.dom) || !Object.is(left.cod, right.cod)) {
      return false;
    }
    for (const value of left.dom) {
      if (!Object.is(left.map(value), right.map(value))) {
        return false;
      }
    }
    return true;
  },
};
