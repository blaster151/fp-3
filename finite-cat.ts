import type { SimpleCat } from "./simple-cat";

/** A small (finite) category with explicit object and arrow listings. */
export interface FiniteCategory<Obj, Arr> extends SimpleCat<Obj, Arr> {
  readonly objects: ReadonlyArray<Obj>;
  readonly arrows: ReadonlyArray<Arr>;
  readonly eq: (x: Arr, y: Arr) => boolean;
}

/** Utility to deduplicate using a supplied equality predicate. */
export function pushUnique<A>(xs: A[], value: A, eq: (a: A, b: A) => boolean): void {
  if (!xs.some((x) => eq(x, value))) xs.push(value);
}
