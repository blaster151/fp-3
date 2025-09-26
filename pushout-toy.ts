import type { FiniteCategory } from "./finite-cat";
import type { PushoutCalculator } from "./pushout";
import { makeFinitePushoutCalculator } from "./pushout";

export function makeToyPushouts<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): PushoutCalculator<Obj, Arr> {
  return makeFinitePushoutCalculator(base);
}
