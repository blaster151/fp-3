// preorder-cat.ts — thin categories arising from preorders
// -----------------------------------------------------------------------------
// A preorder (P, ≤) can be viewed as a category whose objects are the elements
// of P and where there is at most one morphism between each ordered pair of objects. A
// morphism x → y exists exactly when x ≤ y. Identities correspond to
// reflexivity and composition to transitivity of the preorder relation.

export interface Preorder<X> {
  readonly elems: ReadonlyArray<X>;
  readonly le: (x: X, y: X) => boolean;
}

export interface PreorderHom<X> {
  readonly src: X;
  readonly dst: X;
}

export interface PreorderCategory<X> {
  readonly obj: () => ReadonlyArray<X>;
  readonly id: (x: X) => PreorderHom<X>;
  readonly hom: (x: X, y: X) => PreorderHom<X> | null;
  readonly compose: (g: PreorderHom<X>, f: PreorderHom<X>) => PreorderHom<X>;
}

export function PreorderCat<X>(P: Preorder<X>): PreorderCategory<X> {
  const obj = () => P.elems;
  const id = (x: X): PreorderHom<X> => ({ src: x, dst: x });
  const hom = (x: X, y: X): PreorderHom<X> | null =>
    P.le(x, y) ? { src: x, dst: y } : null;
  const compose = (g: PreorderHom<X>, f: PreorderHom<X>): PreorderHom<X> => {
    if (f.dst !== g.src) {
      throw new Error("PreorderCat.compose: domain/codomain mismatch");
    }
    if (!P.le(f.src, g.dst)) {
      throw new Error("PreorderCat.compose: relation not witnessed as transitive");
    }
    return { src: f.src, dst: g.dst };
  };

  return { obj, id, hom, compose };
}
