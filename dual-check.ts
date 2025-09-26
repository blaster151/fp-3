import { Dual } from "./dual-cat";
import type { SimpleCat } from "./simple-cat";

export const dualizeProperty = <Obj, Arr>(
  property: (category: SimpleCat<Obj, Arr>) => boolean,
): ((category: SimpleCat<Obj, Arr>) => boolean) => {
  return (category) => property(Dual(category));
};
