/** Inclusion map i: S -> X for S ⊆ X (carrier-only; topology handled via subspace). */
export function inclusion<X>(
  eqX: (a: X, b: X) => boolean,
  S: ReadonlyArray<X>,
  Xs: ReadonlyArray<X>,
): (s: X) => X {
  for (const s of S) {
    if (!Xs.some((x) => eqX(s, x))) {
      throw new Error("inclusion: S not subset of X");
    }
  }
  return (s) => s;
}

/** Pointwise equality on maps over a finite carrier. */
export function mapsEqual<A, B>(
  eqB: (b: B, c: B) => boolean,
  Z: ReadonlyArray<A>,
  f: (a: A) => B,
  g: (a: A) => B,
): boolean {
  return Z.every((z) => eqB(f(z), g(z)));
}
