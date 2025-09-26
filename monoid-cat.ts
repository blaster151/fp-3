// monoid-cat.ts — one-object categories arising from monoids
// -----------------------------------------------------------------------------
// A monoid (M, op, e) gives rise to a category with a single object ★ whose
// endomorphisms are precisely the elements of M. Composition corresponds to the
// monoid multiplication and the identity arrow is the monoid unit.

export interface Monoid<M> {
  readonly e: M;
  readonly op: (a: M, b: M) => M;
  readonly elements?: ReadonlyArray<M>;
}

export type OneObject = { readonly _tag: "★" };
const STAR: OneObject = { _tag: "★" };

export interface MonoidArrow<M> {
  readonly dom: OneObject;
  readonly cod: OneObject;
  readonly elt: M;
}

export interface MonoidCategory<M> {
  readonly obj: () => OneObject;
  readonly id: () => MonoidArrow<M>;
  readonly hom: (m: M) => MonoidArrow<M>;
  readonly compose: (g: MonoidArrow<M>, f: MonoidArrow<M>) => MonoidArrow<M>;
}

export function MonoidCat<M>(monoid: Monoid<M>): MonoidCategory<M> {
  const obj = () => STAR;
  const id = (): MonoidArrow<M> => ({ dom: STAR, cod: STAR, elt: monoid.e });
  const hom = (m: M): MonoidArrow<M> => ({ dom: STAR, cod: STAR, elt: m });
  const compose = (g: MonoidArrow<M>, f: MonoidArrow<M>): MonoidArrow<M> => ({
    dom: STAR,
    cod: STAR,
    elt: monoid.op(g.elt, f.elt),
  });

  return { obj, id, hom, compose };
}

