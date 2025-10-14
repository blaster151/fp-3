import type { Top } from "./Topology";

type Eq<X> = (a: X, b: X) => boolean;

function eqArr<X>(eq: Eq<X>, A: ReadonlyArray<X>, B: ReadonlyArray<X>): boolean {
  return (
    A.length === B.length &&
    A.every((a) => B.some((b) => eq(a, b))) &&
    B.every((b) => A.some((a) => eq(a, b)))
  );
}

function intersection<X>(eq: Eq<X>, U: ReadonlyArray<X>, V: ReadonlyArray<X>): X[] {
  return U.filter((u) => V.some((v) => eq(u, v)));
}

/**
 * Subspace topology: given T on X and S ⊆ X, opens are {U ∩ S | U open in X}.
 */
export function subspace<X>(eqX: Eq<X>, T: Top<X>, S: ReadonlyArray<X>): Top<X> {
  const carrier = [...S];
  const opens: X[][] = [];
  for (const U of T.opens) {
    const UiS = intersection(eqX, U, S);
    if (!opens.some((W) => eqArr(eqX, W, UiS))) {
      opens.push(UiS);
    }
  }
  return { carrier, opens };
}
